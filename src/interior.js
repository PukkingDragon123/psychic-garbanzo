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

  const VW = 480, VH = 270;
  const ROOM_W = 840, ROOM_H = 270;
  const FLOOR = ROOM_H - 22;

  let bg = null;

  /* Everything you can walk up to. `app` opens a terminal; `act` runs code. */
  const STATIONS = [
    { id: 'airlock', x: 52,  spr: 'airlock',    label: 'AIRLOCK',        act: 'launch' },
    { id: 'market',  x: 160, spr: 'console',    label: 'CARGO EXCHANGE', app: 'market' },
    { id: 'fab',     x: 300, spr: 'fabricator', label: 'FABRICATOR',     app: 'fab' },
    { id: 'bay',     x: 440, spr: 'dronebay',   label: 'DRONE BAY',      app: 'bay' },
    { id: 'refinery', x: 580, spr: 'refinery',  label: 'REFINERY DECK',  app: 'refinery' },
    { id: 'vanity',  x: 690, spr: 'wardrobe',   label: 'IDENTITY POD',   app: 'vanity' },
    { id: 'nav',     x: 786, spr: 'navchart',   label: 'NAV COMPUTER',   app: 'nav' }
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
      'Balance updated. I have taken the liberty of rounding in our favour.',
      'Three civilisations have filed complaints. I filed them in the reactor.',
      'You look tired. Statistically, greed is a stimulant.',
      'That world had a name once. Now it has a market price.',
      'I calculate a 94% chance you enjoy this. The other 6% is modesty.'
    ],
    bolt: [
      'Bring me ore, not excuses. The bin does not fill itself.',
      'I welded that seam twice. Do not make me do it a third time.',
      'Every module you fabricate, I bleed a little coolant. You are welcome.',
      'Rocks in. Machines out. That is the whole religion.',
      'Feed the hoppers and the refinery runs itself. Ingots sell for triple. Alloys? Do not ask, just build it.'
    ],
    gloop: [
      'GLOOP chirps and headbutts the glass affectionately.',
      'GLOOP is eating a rock you were going to sell. GLOOP is unrepentant.',
      'GLOOP blinks all four eyes at slightly different times.'
    ]
  };
  const barkIdx = { nix: 0, bolt: 0, gloop: 0 };

  const P = {
    x: 100, y: FLOOR, vx: 0, vy: 0, face: 1, walk: 0, near: null, hop: 0
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

    // interaction prompt
    if (P.near && !PD.term.app && !PD.dialog.active()) {
      const x = P.near.x - cam;
      const y = FLOOR - (P.near.spr === 'gloop' ? 40 : 66) + Math.sin(t * 5) * 2;
      const w = F.width(P.near.label, 1) + 22;
      ctx.fillStyle = 'rgba(8,4,18,0.85)';
      ctx.fillRect(x - w / 2, y, w, 13);
      ctx.strokeStyle = '#7ef9ff';
      ctx.strokeRect(x - w / 2 + 0.5, y + 0.5, w - 1, 12);
      F.draw(ctx, 'E', x - w / 2 + 4, y + 3, '#ffd34d', { shadow: false });
      F.draw(ctx, P.near.label, x - w / 2 + 16, y + 3, '#ffffff', { shadow: false });
    }
  }

  /* Slim diegetic status strip -- the deck's own readout, not a game HUD. */
  function drawStatus(ctx, g, t) {
    ctx.fillStyle = 'rgba(8,4,18,0.8)';
    ctx.fillRect(0, 0, VW, 14);
    ctx.fillStyle = '#39ffa6';
    ctx.fillRect(0, 14, VW, 1);
    F.draw(ctx, 'RUSTMAW // DECK A', 6, 4, '#39ffa6', { shadow: false });
    F.draw(ctx, 'CR ' + U.fmt(g.save.credits), 148, 4, '#ffd34d', { shadow: false });
    const bin = Object.keys(g.save.vault).reduce((n, k) => n + g.save.vault[k], 0);
    F.draw(ctx, 'BIN ' + U.fmt(bin), 226, 4, '#7ef9ff', { shadow: false });
    F.draw(ctx, 'DRONES ' + (g.save.upg.drones || 0), 296, 4, '#c8ff5a', { shadow: false });
    F.draw(ctx, 'GALAXY ' + g.save.dominion.toFixed(1) + '%', VW - 6, 4, '#ff8ad8', { right: true, shadow: false });
  }

  PD.interior = { enter, update, draw, drawStatus, talk, STATIONS, CREW, P, ROOM_W, FLOOR };
})(window.PD);
