/* Inside the Rustmaw. Instead of a shop popup you walk the deck and use the
   machines: market console, fabricator, drone bay, wardrobe, nav chart --
   with a crew that has opinions about what you are doing. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const A = PD.audio;
  const FX = PD.fx;
  const AI = PD.artint;
  const D = PD.data;

  const VW = 480, VH = 270;
  const ROOM_W = 840, ROOM_H = 270;
  const FLOOR = ROOM_H - 22;

  let bg = null;

  /* Everything you can walk up to. `app` opens a terminal; `act` runs code. */
  const STATIONS = [
    { id: 'airlock', x: 52,  spr: 'airlock',    label: 'AIRLOCK',        act: 'launch', glyph: 'speed' },
    { id: 'market',  x: 160, spr: 'console',    label: 'CARGO EXCHANGE', app: 'market', glyph: 'sell' },
    { id: 'fab',     x: 300, spr: 'fabricator', label: 'FABRICATOR',     app: 'skills', glyph: 'hex' },
    { id: 'bay',     x: 440, spr: 'dronebay',   label: 'DRONE BAY',      app: 'bay', glyph: 'drone' },
    { id: 'refinery', x: 580, spr: 'refinery',  label: 'REFINERY DECK',  app: 'refinery', glyph: 'machine' },
    { id: 'vanity',  x: 690, spr: 'wardrobe',   label: 'IDENTITY POD',   app: 'vanity', glyph: 'crew' },
    { id: 'nav',     x: 786, spr: 'navchart',   label: 'NAV COMPUTER',   app: 'nav', glyph: 'planet' }
  ];

  const CREW = [
    { id: 'zaz',   x: 118, spr: 'zaz',   label: 'ZAZ',   glyph: 'clock' },
    { id: 'nix',   x: 216, spr: 'nix',   label: 'NIX',   glyph: 'eye' },
    { id: 'bolt',  x: 356, spr: 'bolt',  label: 'BOLT',  glyph: 'build' },
    { id: 'gloop', x: 502, spr: 'gloop', label: 'GLOOP', glyph: 'star' }
  ];

  const DECOR = [
    { x: 100, spr: 'crate', f: 0 }, { x: 396, spr: 'crate', f: 1 },
    { x: 740, spr: 'plant', f: 0 }, { x: 640, spr: 'crate', f: 0 }, { x: 88, spr: 'plant', f: 0 },
    { x: 250, spr: 'poster', f: 0, y: 124 }, { x: 470, spr: 'poster', f: 1, y: 122 }, { x: 830, spr: 'poster', f: 0, y: 126 },
    { x: 160, spr: 'lights', f: 0, y: 108 }, { x: 420, spr: 'lights', f: 0, y: 108 }, { x: 690, spr: 'lights', f: 0, y: 108 }
  ];
  const PET = { x: 600, dir: 1, t: 0 };

  /* Crew barks. They rotate, and they are all enabling you. */
  const LINES = {
    nix: [
      'Balance updated. I rounded in our favour again.',
      'Three worlds filed complaints. I filed them in the reactor.',
      'The wire keeps you close to the pod. Longer reels are on the lattice.',
      'You look tired. Statistically, greed is a stimulant.'
    ],
    bolt: [
      'Rocks in, machines out. That is the whole religion, boss.',
      'Feed the hoppers and the refinery runs itself. Ingots sell triple.',
      'Every node you build on the lattice, I weld another seam. You are welcome.',
      'Want to dig deeper? Buy wire. Simple as that.'
    ],
    zaz: [
      'One lot at a time, darling. Quality cannot be rushed. Well. It can, for a fee.',
      'Your regolith is... regolith. Your diamond, however, has my full attention.',
      'The house takes twelve percent. Hire a broker and it takes less.',
      'Appraised lots are ready to sell. Unappraised ones are just heavy.'
    ],
    gloop: [
      'GLOOP chirps and headbutts the glass affectionately.',
      'GLOOP is eating a rock you were going to sell. GLOOP is unrepentant.',
      'GLOOP blinks all four eyes at slightly different times.'
    ]
  };
  const barkIdx = { nix: 0, bolt: 0, gloop: 0, zaz: 0 };

  const P = {
    x: 100, y: FLOOR, vx: 0, vy: 0, face: 1, walk: 0, near: null, hop: 0,
    target: null, autoUse: null
  };

  function enter(g, atStation) {
    if (!bg) bg = AI.room(ROOM_W, ROOM_H).toCanvas();
    const st = STATIONS.find(s => s.id === atStation);
    P.x = st ? st.x + 30 : 96;
    P.y = FLOOR; P.vx = 0; P.vy = 0; P.face = 1;
    g.intCam = U.clamp(P.x - VW / 2, 0, ROOM_W - VW);
  }

  /* Nearest interactable, compared as a fraction of each one's own reach so a
     crew member standing beside a console cannot steal its prompt. */
  function nearest() {
    let best = null, score = 1;
    const test = (o, reach) => {
      const f = Math.abs(o.x - P.x) / reach;
      if (f < score) { score = f; best = o; }
    };
    for (const s of STATIONS) test(s, 30);
    for (const c of CREW) test(c, 20);
    return best;
  }

  function talk(who) {
    const lines = LINES[who];
    if (!lines) return;
    PD.dialog.push(who, lines[barkIdx[who] % lines.length]);
    barkIdx[who]++;
  }

  function update(dt, g) {
    const IN = PD.input;
    const use = IN.hit('KeyE') || IN.hit('space');
    const esc = IN.hit('esc');

    // One owner of the input per frame, resolved top down. Without this a
    // single E press both opens a terminal and closes it again.
    if (PD.term.app) {
      if (esc) PD.term.close();
    } else if (PD.dialog.active()) {
      PD.dialog.update(dt);
      if (use || IN.mouse.leftPressed) PD.dialog.advance();
    } else {
      let ix = 0;
      if (IN.down('left')) ix -= 1;
      if (IN.down('right')) ix += 1;
      // tap anywhere on the deck: walk there; tap a machine: walk there and use it
      if (IN.mouse.leftPressed && IN.mouse.y > 20) {
        const wx = IN.mouse.x + g.intCam;
        let hitSt = null;
        for (const st of STATIONS.concat(CREW)) if (Math.abs(st.x - wx) < 34) hitSt = st;
        P.target = hitSt ? hitSt.x + (hitSt.x > P.x ? -18 : 18) : wx;
        P.autoUse = hitSt;
        A.sfx.click();
      }
      if (ix) { P.target = null; P.autoUse = null; }
      if (P.target !== null) {
        const d = P.target - P.x;
        if (Math.abs(d) > 4) ix = Math.sign(d);
        else {
          P.target = null;
          if (P.autoUse) {
            const st = P.autoUse; P.autoUse = null;
            if (st.app) PD.term.open(st.app);
            else if (st.act === 'launch') { g.undock(); return; }
            else talk(st.id);
          }
        }
      }
      if (ix) P.face = ix;
      P.vx = U.damp(P.vx, ix * 78, 0.3, dt);
      P.x = U.clamp(P.x + P.vx * dt, 28, ROOM_W - 28);
      P.walk += Math.abs(P.vx) * dt * 0.09;

      // a little hover-hop, since our alien does not really walk
      if (IN.hit('up') && P.y >= FLOOR) {
        P.vy = -120;
        A.sfx.tone(600, { type: 'triangle', dur: 0.08, vol: 0.06 });
      }
      P.vy += 400 * dt;
      P.y = Math.min(FLOOR, P.y + P.vy * dt);
      if (P.y >= FLOOR) { P.y = FLOOR; P.vy = 0; }

      P.near = nearest();

      if (use && P.near) {
        if (P.near.app) PD.term.open(P.near.app);
        else if (P.near.act === 'launch') { g.undock(); return; }
        else talk(P.near.id);
      } else if (esc) {
        g.undock();
        return;
      }
    }

    g.intCam = U.damp(g.intCam, U.clamp(P.x - VW / 2, 0, ROOM_W - VW), 0.16, dt);
  }

  function drawSpr(ctx, sp, frame, x, y) {
    ctx.drawImage(sp.frames[frame % sp.frames.length], (x - sp.ox) | 0, (y - sp.oy) | 0);
  }

  function draw(ctx, g, t) {
    const cam = Math.round(g.intCam);
    ctx.drawImage(bg, -cam, 0);

    for (const d of DECOR) {
      const f = d.spr === 'lights' ? Math.floor(t * 2) % 2 : d.f;
      drawSpr(ctx, AI.S[d.spr], f, d.x - cam, d.y !== undefined ? d.y : FLOOR + 2);
    }
    // Sprout the space-cat pads up and down the deck
    PET.t += 1 / 60;
    PET.x += PET.dir * 12 / 60;
    if (PET.x > 760 || PET.x < 560) PET.dir *= -1;
    ctx.save(); ctx.translate((PET.x - cam) | 0, FLOOR + 2); if (PET.dir < 0) ctx.scale(-1, 1);
    const ps = AI.S.sprout; ctx.drawImage(ps.frames[Math.floor(PET.t * 6) % 2], -ps.ox, -ps.oy); ctx.restore();

    const blink = Math.sin(t * 2.4) > 0 ? 1 : 0;
    for (const s of STATIONS) {
      const sp = AI.S[s.spr];
      const lit = s.app ? blink : (Math.sin(t * 3) > 0.4 ? 1 : 0);
      drawSpr(ctx, sp, Math.min(lit, sp.frames.length - 1), s.x - cam, FLOOR + 2);
    }

    // crew, bobbing on their own clocks
    for (const c of CREW) {
      const sp = AI.S[c.spr];
      const f = Math.floor(t * (c.id === 'nix' ? 4 : 2.4) + c.x) % sp.frames.length;
      drawSpr(ctx, sp, f, c.x - cam, FLOOR + 2);
      if (c.id === 'nix') {
        // holo flicker glow
        const gx = c.x - cam, gy = FLOOR - 22;
        const gr = ctx.createRadialGradient(gx, gy, 2, gx, gy, 30);
        gr.addColorStop(0, 'rgba(126,249,255,' + (0.22 + 0.08 * Math.sin(t * 9)).toFixed(2) + ')');
        gr.addColorStop(1, 'rgba(126,249,255,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(gx - 30, gy - 30, 60, 60);
      }
    }

    // the player, hovering along on suit thrusters
    const skin = PD.art.skinFor(g.save.cos);
    const walking = Math.abs(P.vx) > 10;
    const inAir = P.y < FLOOR - 1;
    const set = inAir ? skin.alienFly : (walking ? skin.alienWalk : skin.alien);
    const frame = inAir ? Math.floor(t * 8) % 2 : (walking ? Math.floor(P.walk * 1.2) % 4 : (Math.sin(t * 0.9) > 0.95 ? 2 : Math.floor(t * 1.5) % 2));
    ctx.save();
    ctx.translate((P.x - cam) | 0, P.y | 0);
    if (P.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(set.frames[frame], -set.ox, -set.oy - 10);
    ctx.restore();
    if (walking && U.chance(0.15)) FX.dust(P.x - P.face * 4, P.y - 1, 1, '#5a4d80', 10);

    // interaction prompt: a hand and the machine's glyph
    if (P.near && !PD.term.app && !PD.dialog.active()) {
      const x = P.near.x - cam;
      const y = FLOOR - (P.near.spr === 'gloop' ? 44 : 70) + Math.sin(t * 5) * 2;
      const w = F.width(P.near.label, 1) + 34;
      ctx.fillStyle = 'rgba(8,4,18,0.88)'; ctx.fillRect(x - w / 2, y, w, 16);
      ctx.strokeStyle = '#7ef9ff'; ctx.strokeRect(x - w / 2 + 0.5, y + 0.5, w - 1, 15);
      PD.glyph.draw(ctx, P.near.glyph || 'crew', x - w / 2 + 3, y + 1, '#ffffff', '#7ef9ff');
      F.draw(ctx, 'E', x - w / 2 + 19, y + 5, '#ffd34d', { shadow: false });
      F.draw(ctx, P.near.label, x - w / 2 + 28, y + 5, '#ffffff', { shadow: false });
    }
    // walk target marker
    if (P.target !== null) PD.glyph.hex(ctx, P.target - cam, FLOOR + 6, 4 + Math.sin(t * 8), null, '#ffd34d', 1);
  }

  /* Slim diegetic status strip -- the deck's own readout, not a game HUD. */
  function drawStatus(ctx, g, t) {
    ctx.fillStyle = 'rgba(8,4,18,0.85)';
    ctx.fillRect(0, 0, VW, 18);
    ctx.fillStyle = '#39ffa6';
    ctx.fillRect(0, 18, VW, 1);
    F.draw(ctx, 'THE RUSTMAW  -  DECK A', 6, 6, '#39ffa6', { shadow: false });
    F.draw(ctx, '$' + U.fmt(g.save.credits), 200, 3, '#ffd34d', { shadow: false, scale: 2 });
    const bin = Object.keys(g.save.vault).reduce((n, k) => n + g.save.vault[k], 0);
    const ok = Object.keys(g.save.appr).reduce((n, k) => n + g.save.appr[k], 0);
    F.draw(ctx, 'WAIT ' + bin + '   READY ' + ok, 292, 6, '#7ef9ff', { shadow: false });
    const mat = g.appraising();
    if (mat !== null) {
      const f = g.apprFrac();
      ctx.fillStyle = '#2a1c4a'; ctx.fillRect(292, 14, 96, 3);
      ctx.fillStyle = '#ffb03d'; ctx.fillRect(292, 14, Math.round(96 * f), 3);
    }
    F.draw(ctx, 'GALAXY ' + g.save.dominion.toFixed(1) + '%', VW - 6, 6, '#ff8ad8', { right: true, shadow: false });
    // objective line under the strip
    const o = g.objective && g.objective();
    if (o && !PD.term.app) {
      const text = o.t.toUpperCase();
      const w = F.width(text, 1) + o.g.length * 16 + 20;
      ctx.fillStyle = 'rgba(8,4,18,0.75)'; ctx.fillRect(VW / 2 - w / 2, 22, w, 16);
      let gx = VW / 2 - w / 2 + 4;
      for (const gname of o.g) { PD.glyph.draw(ctx, gname, gx, 23, '#ffffff', '#ffd34d'); gx += 16; }
      F.draw(ctx, text, gx + 4, 27, '#f2e9ff', { shadow: false });
    }
  }

  PD.interior = { enter, update, draw, drawStatus, talk, STATIONS, CREW, P, ROOM_W, FLOOR };
})(window.PD);
