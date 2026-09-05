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
    { id: 'nix',   x: 216, spr: 'nix',   label: 'NIX' },
    { id: 'bolt',  x: 356, spr: 'bolt',  label: 'BOLT' },
    { id: 'gloop', x: 502, spr: 'gloop', label: 'GLOOP' }
  ];

  const DECOR = [
    { x: 108, spr: 'crate', f: 0 }, { x: 128, spr: 'crate', f: 1 },
    { x: 396, spr: 'crate', f: 1 }, { x: 740, spr: 'plant', f: 0 }, { x: 640, spr: 'crate', f: 0 },
    { x: 88, spr: 'plant', f: 0 }
  ];

  /* Crew barks. They rotate, and they are all enabling you. */
  const LINES = {
    nix: [
      ['coin', 'arrowU', 'galaxy'],
      ['planet', 'arrowR', 'coin', 'coin'],
      ['skull', 'check', 'star'],
      ['eye', 'arrowR', 'planet', 'bang']
    ],
    bolt: [
      ['ore', 'arrowR', 'machine', 'arrowR', 'coin'],
      ['hex', 'arrowR', 'drill', 'up'],
      ['belt', 'machine', 'belt', 'sell']
    ],
    gloop: [
      ['ore', 'arrowR', 'crew', 'quest'],
      ['eye', 'eye', 'eye', 'eye'],
      ['star', 'arrowR', 'crew']
    ]
  };
  const barkIdx = { nix: 0, bolt: 0, gloop: 0 };

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

    for (const d of DECOR) drawSpr(ctx, AI.S[d.spr], d.f, d.x - cam, FLOOR + 2);

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
    const al = skin.alien;
    const bob = Math.sin(P.walk * 2 + t * 3) * 1.6 + (P.y < FLOOR ? -1 : 0);
    ctx.save();
    ctx.translate((P.x - cam) | 0, (P.y + bob) | 0);
    if (P.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(al.frames[Math.sin(t * 0.9) > 0.95 ? 2 : 0], -al.ox, -al.oy - 6);
    ctx.restore();
    if (Math.abs(P.vx) > 12 && U.chance(0.5)) {
      FX.trail(P.x + cam * 0 - P.face * 6, P.y - 4, '#ffd34d', 1.4);
    }
    // thruster wash on the deck
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffb03d';
    ctx.fillRect((P.x - cam - 4) | 0, (P.y - 3) | 0, 8, 3);
    ctx.globalAlpha = 1;

    // interaction prompt: a hand and the machine's glyph
    if (P.near && !PD.term.app && !PD.dialog.active()) {
      const x = P.near.x - cam;
      const y = FLOOR - (P.near.spr === 'gloop' ? 44 : 70) + Math.sin(t * 5) * 2;
      PD.glyph.hex(ctx, x, y + 8, 14, 'rgba(8,4,18,0.85)', '#7ef9ff', 1);
      PD.glyph.draw(ctx, P.near.glyph || 'crew', x - 7, y + 1, '#ffffff', '#7ef9ff');
      PD.glyph.draw(ctx, 'hand', x + 8, y - 8, '#ffd34d', '#ff9b3d');
    }
    // walk target marker
    if (P.target !== null) PD.glyph.hex(ctx, P.target - cam, FLOOR + 6, 4 + Math.sin(t * 8), null, '#ffd34d', 1);
  }

  /* Slim diegetic status strip -- the deck's own readout, not a game HUD. */
  function drawStatus(ctx, g, t) {
    ctx.fillStyle = 'rgba(8,4,18,0.8)';
    ctx.fillRect(0, 0, VW, 16);
    ctx.fillStyle = '#39ffa6';
    ctx.fillRect(0, 16, VW, 1);
    const Gd = PD.glyph;
    let x = 6;
    x += Gd.stat(ctx, 'coin', U.fmt(g.save.credits), x, 1, '#ffd34d', '#b8860b') + 12;
    const bin = Object.keys(g.save.vault).reduce((n, k) => n + g.save.vault[k], 0);
    const ok = Object.keys(g.save.appr).reduce((n, k) => n + g.save.appr[k], 0);
    x += Gd.stat(ctx, 'clock', bin, x, 1, '#ffb03d', '#c07a20') + 12;
    x += Gd.stat(ctx, 'sell', ok, x, 1, '#39ffa6', '#1e9e68') + 12;
    x += Gd.stat(ctx, 'drone', g.save.upg.drones || 0, x, 1, '#c8ff5a', '#7cbb26') + 12;
    Gd.stat(ctx, 'galaxy', g.save.dominion.toFixed(1) + '%', VW - 78, 1, '#ff8ad8', '#b0459a');
    // appraisal in progress
    const mat = g.appraising();
    if (mat !== null) {
      const f = g.apprFrac();
      ctx.fillStyle = D.MAT[mat].c[1]; ctx.fillRect(VW / 2 - 30, 4, 8, 8);
      ctx.fillStyle = '#2a1c4a'; ctx.fillRect(VW / 2 - 18, 6, 50, 4);
      ctx.fillStyle = '#ffb03d'; ctx.fillRect(VW / 2 - 18, 6, Math.round(50 * f), 4);
    }
  }

  PD.interior = { enter, update, draw, drawStatus, talk, STATIONS, CREW, P, ROOM_W, FLOOR };
})(window.PD);
