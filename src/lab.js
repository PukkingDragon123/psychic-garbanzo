/* THE LAB.

   Before the game there is a room with three tanks in it, and there is one of
   you in each tank. They are not saves as far as anyone in the fiction is
   concerned; they are stock. You pick one, it gets decanted, and whatever
   happens to it after that is on the ledger under its own number.

   Doubling as the save-slot picker means the menu never has to say the words
   "save slot", and wiping a file is something you do to a body in a jar. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const X = PD.pxd;
  const A = PD.audio;
  const VW = 480, VH = 270;

  const TUBE = [
    { x: 110, name: 'SPECIMEN A' },
    { x: 240, name: 'SPECIMEN B' },
    { x: 370, name: 'SPECIMEN C' }
  ];
  const TW = 62, TH = 106, TY = 74;                 // one tank
  const S = { t: 0, sel: -1, pick: -1, open: 0, wipe: -1, hum: 0, bub: [],
    hit: [0, 0, 0], hitY: [0, 0, 0], knock: 0 };

  function enter(g) {
    S.t = 0; S.sel = -1; S.pick = -1; S.open = 0; S.wipe = -1;
    for (let i = 0; i < 3; i++) RIGS[i] = PD.rig.make();
    if (!S.bub.length) {
      for (let i = 0; i < 3; i++) {
        S.bub[i] = [];
        for (let k = 0; k < 14; k++) {
          S.bub[i].push({ x: U.rand(-22, 22), y: U.rand(0, TH), r: U.rand(1, 3), sp: U.rand(8, 26) });
        }
      }
    }
    A.sfx.tone(90, { type: 'sine', to: 150, dur: 0.7, vol: 0.06 });
  }

  function update(dt, g) {
    S.t += dt;
    stepRigs(dt);
    // he only gets to be heard by whoever is standing in front of him
    const ph = (S.t * 1.5) % 1;   // tank A, hammering
    if (ph < S.knock) {
      if (S.sel === 0) {
        A.sfx.tone(64, { type: 'sine', to: 38, dur: 0.16, vol: 0.1 });
        A.noise({ from: 260, to: 80, dur: 0.1, vol: 0.05 });
      }
    }
    S.knock = ph;
    const IN = PD.input, m = IN.mouse;
    for (const set of S.bub) {
      for (const b of set) { b.y -= b.sp * dt; if (b.y < 0) { b.y = TH; b.x = U.rand(-22, 22); } }
    }
    if (S.open) { updateSettings(dt, g); return; }
    if (S.pick >= 0) return;

    S.sel = -1;
    for (let i = 0; i < TUBE.length; i++) {
      const x = TUBE[i].x;
      if (m.inside && Math.abs(m.x - x) < TW / 2 + 4 && m.y > TY - 12 && m.y < TY + TH + 30) S.sel = i;
    }
    if (IN.hit('left')) S.sel = Math.max(0, (S.sel < 0 ? 1 : S.sel) - 1);
    if (IN.hit('right')) S.sel = Math.min(2, (S.sel < 0 ? 1 : S.sel) + 1);

    // the little bin under a tank that already has something in it
    if (m.leftPressed && S.sel >= 0) {
      const x = TUBE[S.sel].x;
      if (m.y > TY + TH + 16 && m.y < TY + TH + 30 && Math.abs(m.x - x) < 26 && g.slotInfo(S.sel)) {
        if (S.wipe === S.sel) { g.wipeSlot(S.sel); S.wipe = -1; A.sfx.deny(); }
        else { S.wipe = S.sel; A.sfx.click(); }
        return;
      }
      choose(g, S.sel);
      return;
    }
    if ((IN.hit('KeyE') || IN.hit('enter') || IN.hit('space')) && S.sel >= 0) choose(g, S.sel);
    if (m.leftPressed && m.inside && m.x > VW - 82 && m.y < 22) { S.open = 1; A.sfx.click(); }
    if (IN.hit('esc')) { g.state = 'title'; A.sfx.click(); }
  }

  function choose(g, i) {
    S.pick = i;
    A.sfx.tone(320, { type: 'square', to: 900, dur: 0.3, vol: 0.09 });
    PD.fx.ring(TUBE[i].x, TY + TH / 2, 4, 70, 0.8, '#8affd0', 3);
    g.wipeTo(TUBE[i].x, TY + TH / 2, '#0a1a18', () => { g.decant(i); });
  }

  /* ------------------------------------------------------------- the settings
     Four switches and a very serious button. */
  const ROWS = [
    { id: 'sfx', name: 'NOISES', get: () => A.state.sfx, set: v => A.sfx.toggle ? A.sfx.toggle(v) : (A.state.sfx = v) },
    { id: 'music', name: 'THE GROOVE', get: () => A.state.music, set: v => A.music(v) },
    { id: 'shake', name: 'SCREEN WOBBLE', get: () => !PD.fx.noShake, set: v => { PD.fx.noShake = !v; } },
    { id: 'chum', name: 'MR CHUM IN THE CORNER', get: () => !PD.chum.muted, set: v => { PD.chum.muted = !v; } }
  ];
  function updateSettings(dt, g) {
    const IN = PD.input, m = IN.mouse;
    if (IN.hit('esc')) { S.open = 0; A.sfx.click(); return; }
    if (!m.leftPressed) return;
    for (let i = 0; i < ROWS.length; i++) {
      const y = 86 + i * 24;
      if (m.x > 128 && m.x < 352 && m.y > y && m.y < y + 18) {
        ROWS[i].set(!ROWS[i].get());
        A.sfx.click();
        return;
      }
    }
    if (m.x > 190 && m.x < 290 && m.y > 190 && m.y < 208) { S.open = 0; A.sfx.click(); }
  }

  /* ------------------------------------------------------------------- draw */
  function draw(ctx, g, t) {
    // the room: a floor, a back wall of panels, one strip light per tank
    X.rect(ctx, 0, 0, VW, VH, '#0a1420');
    for (let x = 0; x < VW; x += 30) {
      X.rect(ctx, x, 0, 28, VH - 44, ((x / 30) | 0) % 2 ? '#0d1a28' : '#0b1622');
    }
    for (let x = 0; x < VW; x += 30) X.rect(ctx, x, 40, 28, 1, '#16283c');
    X.rect(ctx, 0, VH - 44, VW, 44, '#111c2a');
    X.rect(ctx, 0, VH - 44, VW, 2, '#1d3350');
    for (let x = 0; x < VW; x += 18) X.rect(ctx, x, VH - 42, 9, 42, '#0e1824');
    // pipes along the ceiling, and the cables that feed the tanks
    X.rect(ctx, 0, 10, VW, 4, '#16283c');
    X.rect(ctx, 0, 18, VW, 2, '#16283c');
    for (const tb of TUBE) {
      X.rect(ctx, tb.x - 3, 14, 6, TY - 14, '#16283c');
      X.rect(ctx, tb.x - 1, 14, 2, TY - 14, '#1d3350');
    }

    F.draw(ctx, 'DECANTING BAY 7', 12, 8, '#4fd0b0', { shadow: '#031014' });
    F.draw(ctx, 'PICK ONE. THEY ARE ALL YOU.', 12, 20, '#2b7a6a', { shadow: false });

    for (let i = 0; i < TUBE.length; i++) drawTube(ctx, g, t, i);

    // the settings button, top right
    const m = PD.input.mouse;
    const sHot = m.inside && m.x > VW - 82 && m.y < 22;
    X.plate(ctx, VW - 78, 4, 74, 16, sHot ? '#1d4a44' : '#123029', '#2b7a6a', '#04100e', 4);
    PD.glyph.draw(ctx, 'machine', VW - 74, 3, sHot ? '#8affd0' : '#4fd0b0', '#2b7a6a');
    F.draw(ctx, 'SETTINGS', VW - 58, 8, sHot ? '#ffffff' : '#8affd0', { shadow: false });

    F.draw(ctx, 'ESC  BACK', 12, VH - 14, '#2b7a6a', { shadow: false });

    if (S.open) drawSettings(ctx, g, t);
  }

  function drawTube(ctx, g, t, i) {
    const tb = TUBE[i], x = tb.x, on = S.sel === i;
    // the jar rings when he hits it, so you feel it from out here
    const ring = S.hit[i] > 0.02 ? Math.sin(S.t * 70) * S.hit[i] * 1.6 : 0;
    if (ring) { ctx.save(); ctx.translate(Math.round(ring), 0); }
    const info = g.slotInfo(i);
    const lit = on ? 1 : 0.72;
    // the light over it
    ctx.globalAlpha = 0.1 * lit;
    X.poly(ctx, [[x - 8, 20], [x + 8, 20], [x + 40, TY + TH], [x - 40, TY + TH]], '#8affd0');
    ctx.globalAlpha = 1;

    // base and cap
    X.plate(ctx, x - TW / 2 - 6, TY + TH - 4, TW + 12, 14, '#1d3350', '#2e4e78', '#08111c', 4);
    X.plate(ctx, x - TW / 2 - 5, TY - 12, TW + 10, 13, '#1d3350', '#2e4e78', '#08111c', 4);

    // the fluid
    const fl = on ? '#1a6a58' : '#14483f';
    X.rect(ctx, x - TW / 2, TY, TW, TH, fl);
    for (let k = 0; k < TH; k += 3) {
      ctx.globalAlpha = 0.08;
      X.rect(ctx, x - TW / 2, TY + k, TW, 1, '#8affd0');
      ctx.globalAlpha = 1;
    }
    // a drift of sediment across the bottom of the glass
    ctx.globalAlpha = 0.4;
    X.rect(ctx, x - TW / 2, TY + TH - 9, TW, 9, '#0f3830');
    X.rect(ctx, x - TW / 2, TY + TH - 9, TW, 1, '#1d5a4c');
    ctx.globalAlpha = 1;
    // whoever is in it
    // there is always a body in the tank. An empty file is a body that has
    // not been out yet.
    drawSpecimen(ctx, g, x, TY + TH - 16, t, i, on);
    if (!info) F.draw(ctx, 'UNUSED', x, TY + 8, '#2b7a6a', { center: true, shadow: '#031014' });
    // bubbles
    for (const b of S.bub[i]) {
      ctx.globalAlpha = 0.5;
      X.blob(ctx, x + b.x, TY + b.y, b.r, b.r, '#8affd0');
      ctx.globalAlpha = 1;
    }
    // the glass: a bright edge and a highlight down one side
    X.rect(ctx, x - TW / 2 - 2, TY - 2, 2, TH + 4, '#3e6e9a');
    X.rect(ctx, x + TW / 2, TY - 2, 2, TH + 4, '#3e6e9a');
    ctx.globalAlpha = 0.18;
    X.rect(ctx, x - TW / 2 + 6, TY, 4, TH, '#ffffff');
    X.rect(ctx, x + TW / 2 - 14, TY, 2, TH, '#ffffff');
    ctx.globalAlpha = 1;
    if (on) { X.rect(ctx, x - TW / 2 - 2, TY - 2, TW + 4, 2, '#8affd0'); X.rect(ctx, x - TW / 2 - 2, TY + TH, TW + 4, 2, '#8affd0'); }
    // and the glass takes it: the edge lights up where the fist lands
    if (S.hit[i] > 0.02) {
      const h = S.hit[i], hy = S.hitY[i];
      ctx.globalAlpha = Math.min(1, h * 1.3);
      X.rect(ctx, x - TW / 2 - 2, hy - 7 - h * 4, 2, 14 + h * 8, '#ffffff');
      X.blob(ctx, x - TW / 2 + 1, hy, 2, 4 + h * 2, '#ffffff');
      ctx.globalAlpha = h * 0.22;
      X.blob(ctx, x - TW / 2 + 3, hy, 5 + (1 - h) * 7, 7 + (1 - h) * 7, '#d8fbff');
      ctx.globalAlpha = h * 0.7;
      for (let k = -1; k <= 1; k++) {
        X.rect(ctx, x - TW / 2, hy + k * (6 + (1 - h) * 6), 3 + h * 4, 1, '#ffffff');
      }
      ctx.globalAlpha = 1;
    }

    // the label plate
    const ly = TY + TH + 12;
    X.plate(ctx, x - 44, ly - 2, 88, 16, on ? '#1d4a44' : '#102a26', '#2b7a6a', '#04100e', 3);
    F.draw(ctx, tb.name, x, ly + 2, on ? '#ffffff' : '#4fd0b0', { center: true, shadow: false });
    if (info) {
      F.draw(ctx, '$' + U.fmt(info.credits) + '  ' + info.dominion.toFixed(0) + '%', x, ly + 18, '#4fd0b0', { center: true, shadow: '#031014' });
      F.draw(ctx, info.debt > 0 ? 'OWES $' + U.fmt(info.debt) : 'PAID UP', x, ly + 28, info.debt > 0 ? '#ff8a9a' : '#8affa0', { center: true, shadow: '#031014' });
      // and the bin
      const wipeArmed = S.wipe === i;
      X.plate(ctx, x - 26, ly + 40, 52, 13, wipeArmed ? '#6a1c2c' : '#1a2430', wipeArmed ? '#c22a4a' : '#2e4e78', '#08111c', 3);
      F.draw(ctx, wipeArmed ? 'SURE?' : 'FLUSH IT', x, ly + 43, wipeArmed ? '#ffd0d8' : '#6a7e94', { center: true, shadow: false });
    } else {
      F.draw(ctx, 'NEW', x, ly + 20, '#8affd0', { center: true, scale: 2, shadow: '#031014' });
    }
    if (ring) ctx.restore();
  }

  /* --------------------------------------------------------- what is in them
     Three tanks, three of you, and none of them are having the same night.
     One has had enough and is hammering on the glass. One has given up and is
     crying about it. One is asleep and does not know any of this is happening.
     They are the same body: what makes them read as three different people is
     entirely what they are doing with it. */
  const MOOD = ['bang', 'cry', 'sleep'];
  const RIGS = [null, null, null];
  const F_BLINK = 4, F_CROSS = 6;

  function stepRigs(dt) {
    for (let i = 0; i < 3; i++) {
      if (!RIGS[i]) RIGS[i] = PD.rig.make();
      PD.rig.step(RIGS[i], { dt: dt, vx: 0, vy: 0, ground: false, drilling: false });
    }
  }

  /* The one who wants out. A hit every third of a second, the glass flexing
     with it, and the whole jar ringing. */
  function bangPose(x, y, t, i) {
    const k = (t * 1.5 + i * 0.37) % 1;
    // he holds it against the glass, drags it back, then snaps it in again
    let fwd;
    if (k < 0.2) fwd = 1;
    else if (k < 0.75) fwd = 1 - (k - 0.2) / 0.55;
    else fwd = U.smoothstep(0, 1, (k - 0.75) / 0.25);
    const hit = k < 0.14 ? 1 - k / 0.14 : 0;
    const gx = x - 31 + (1 - fwd) * 13;
    const gy = y - 8 - (1 - fwd) * 12;
    return {
      grip: { x: gx, y: gy }, flip: true, face: F_CROSS,
      ang: -0.05 + hit * 0.06, squash: 1 + hit * 0.09,
      dx: -9 - hit * 2, dy: -2, hit: hit, gx: gx, gy: gy
    };
  }

  /* The one who has stopped trying: head down, hands up at the face, and the
     shoulders going every couple of seconds. */
  function cryPose(x, y, t, i) {
    const sob = Math.max(0, Math.sin(t * 1.1 + i)) * Math.abs(Math.sin(t * 9));
    return {
      grip: { x: x - 9, y: y - 22 - sob * 2 }, flip: true, face: F_BLINK,
      ang: 0.12 + sob * 0.04, squash: 1 - 0.06 - sob * 0.05,
      dx: 2, dy: 2 + sob, hit: 0
    };
  }

  /* The one who is asleep, hanging in the middle of it, going nowhere. */
  function sleepPose(x, y, t, i) {
    return {
      grip: null, flip: false, face: F_BLINK,
      ang: -0.92 + Math.sin(t * 0.42 + i) * 0.08,
      squash: 1 - 0.04, dx: -2 + Math.sin(t * 0.31 + i) * 4, dy: -10 + Math.sin(t * 0.55) * 3,
      hit: 0, limp: 1
    };
  }

  /* The body in the jar: the whole rig, tentacles and all, posed by mood. */
  function drawSpecimen(ctx, g, x, y, t, i, on) {
    const sk = PD.art.skinFor(g.save ? g.save.cos : null);
    if (!RIGS[i]) RIGS[i] = PD.rig.make();
    const r = RIGS[i];
    const mood = MOOD[i % MOOD.length];
    const lt = S.t;                       // the same clock the knock runs off
    const fl = Math.sin(lt * 0.9 + i * 2) * 3;
    const p = mood === 'bang' ? bangPose(x, y, lt, i)
      : (mood === 'cry' ? cryPose(x, y, lt, i) : sleepPose(x, y, lt, i));
    const bx = x + p.dx, by = y + p.dy + fl;

    // the feed: four lengths of clean hose out of the cap into his shoulder
    const cy0 = by - 30;
    ctx.globalAlpha = on ? 0.85 : 0.62;
    const HOSE = [[x + 21, TY], [x + 23, TY + 22], [x + 19, cy0 - 20], [x + 15, cy0 - 6], [x + 11, cy0]];
    for (let q = 0; q < HOSE.length - 1; q++) {
      X.limb(ctx, HOSE[q][0], HOSE[q][1], HOSE[q + 1][0], HOSE[q + 1][1],
        4 - q * 0.5, 3.5 - q * 0.5, '#2c5e58', '#68b0a0', '#0e1e20');
      if (q) X.rect(ctx, HOSE[q][0] - 3, HOSE[q][1] - 1, 6, 3, '#7fc4b0');
    }
    ctx.globalAlpha = 0.5;
    for (let q = 0; q < 5; q++) {                  // and what is going down it
      const f = ((t * 0.24 + q * 0.2) % 1) * (HOSE.length - 1);
      const j = Math.min(HOSE.length - 2, Math.floor(f)), u = f - j;
      X.rect(ctx, U.lerp(HOSE[j][0], HOSE[j + 1][0], u), U.lerp(HOSE[j][1], HOSE[j + 1][1], u),
        1, 2, u > 0.5 ? '#c4fff6' : '#4fd0b0');
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.beginPath(); ctx.rect(x - TW / 2, TY, TW, TH); ctx.clip();
    ctx.globalAlpha = on ? 0.95 : 0.72;
    PD.rig.draw(ctx, r, {
      x: bx, y: by, flip: p.flip, spr: sk.alienCore, frame: p.face,
      drilling: false, twoHand: false, grip: p.grip,
      aim: p.grip ? Math.atan2(p.grip.y - (by - 6.5), p.grip.x - (bx - 4)) : Math.PI,
      ground: false, vx: 0, vy: p.limp ? 8 : 0, ang: p.ang,
      squash: p.squash, ragdoll: !!p.limp
    }, sk.P, PD.art.BIZ);
    ctx.globalAlpha = 1;

    // what each of them leaves in the water
    if (mood === 'bang') {
      S.hit[i] = p.hit; S.hitY[i] = p.gy;
      for (let k = 0; k < 5; k++) {
        const up = ((t * 26 + k * 13) % 52);
        ctx.globalAlpha = U.clamp(1 - up / 52, 0, 1) * 0.7;
        X.blob(ctx, x - TW / 2 + 6 + k * 2 + Math.sin(t * 3 + k) * 3, p.gy - up,
          1 + (k % 2), 1 + (k % 2), '#d8fbff');
        ctx.globalAlpha = 1;
      }
    } else if (mood === 'cry') {
      // it does not go anywhere in here, which is the sad part
      for (let k = 0; k < 7; k++) {
        const f = ((t * 0.26 + k * 0.15) % 1);
        ctx.globalAlpha = (1 - f) * 0.75;
        X.blob(ctx, bx - 10 + Math.sin(t * 1.2 + k * 2) * 3 + k * 0.8,
          by - 30 + f * 32, 2, 2.4, '#d8f4ff');
        ctx.globalAlpha = 1;
      }
    } else {
      // out cold, and letting everyone know
      for (let k = 0; k < 3; k++) {
        const f = ((t * 0.22 + k * 0.34) % 1);
        ctx.globalAlpha = (1 - f) * 0.8;
        F.draw(ctx, 'Z', bx + 4 + f * 16 + Math.sin(f * 6) * 3, by - 30 - f * 34,
          '#c4fff6', { center: true, scale: f > 0.45 ? 2 : 1, shadow: '#062018' });
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();

    // the tank light lying over the whole of him
    ctx.globalAlpha = 0.2;
    X.rect(ctx, x - TW / 2, TY, TW, TH, '#1a6a58');
    ctx.globalAlpha = 1;
  }

  function drawSettings(ctx, g, t) {
    ctx.fillStyle = 'rgba(4,12,18,0.86)';
    ctx.fillRect(0, 0, VW, VH);
    X.plate(ctx, 112, 52, 256, 176, '#0e2620', '#2b7a6a', '#04100e', 6);
    X.rect(ctx, 112, 52, 256, 2, '#4fd0b0');
    F.draw(ctx, 'SETTINGS', 240, 62, '#8affd0', { center: true, scale: 2, shadow: '#031014' });
    const m = PD.input.mouse;
    for (let i = 0; i < ROWS.length; i++) {
      const y = 86 + i * 24;
      const hot = m.inside && m.x > 128 && m.x < 352 && m.y > y && m.y < y + 18;
      const on = ROWS[i].get();
      X.plate(ctx, 128, y, 224, 18, hot ? '#16443c' : '#10322c', '#2b7a6a', '#04100e', 3);
      F.draw(ctx, ROWS[i].name, 136, y + 5, hot ? '#ffffff' : '#8affd0', { shadow: false });
      X.plate(ctx, 312, y + 3, 32, 12, on ? '#2f8f6a' : '#3a2230', on ? '#8dff5a' : '#8a2f4a', '#04100e', 3);
      X.rect(ctx, on ? 332 : 314, y + 5, 10, 8, on ? '#d8ffd0' : '#c9bce8');
      F.draw(ctx, on ? 'ON' : 'OFF', on ? 316 : 324, y + 6, '#04100e', { shadow: false });
    }
    F.draw(ctx, 'THE WOBBLE IS THERE ON PURPOSE. SO IS THE SHARK.', 240, 166, '#2b7a6a', { center: true, shadow: false });
    const bHot = m.inside && m.x > 190 && m.x < 290 && m.y > 190 && m.y < 208;
    X.plate(ctx, 190, 190, 100, 18, bHot ? '#2f8f6a' : '#1d4a44', '#4fd0b0', '#04100e', 4);
    F.draw(ctx, 'DONE', 240, 195, '#ffffff', { center: true, scale: 2, shadow: '#031014' });
  }

  PD.lab = { enter, update, draw, S, TUBE };
})(window.PD);
