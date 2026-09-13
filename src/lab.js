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
  const S = { t: 0, sel: -1, pick: -1, open: 0, wipe: -1, hum: 0, bub: [] };

  function enter(g) {
    S.t = 0; S.sel = -1; S.pick = -1; S.open = 0; S.wipe = -1;
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
    // what has come off him over the years has settled in the bottom of it
    ctx.globalAlpha = 0.5;
    X.rect(ctx, x - TW / 2, TY + TH - 11, TW, 11, '#3a1020');
    X.rect(ctx, x - TW / 2, TY + TH - 11, TW, 1, '#5e1a30');
    ctx.globalAlpha = 0.26;
    for (let k = 0; k < 4; k++) {
      const a = t * 0.13 + k * 1.7;
      X.blob(ctx, x + Math.cos(a) * 18, TY + 30 + k * 22 + Math.sin(a * 1.7) * 10,
        13 + k * 3, 7 + k * 2, '#4a0a18');
    }
    ctx.globalAlpha = 1;
    // whoever is in it
    // there is always a body in the tank. An empty file is a body that has
    // not been out yet.
    drawSpecimen(ctx, g, x, TY + TH - 16, t, i, on);
    drawGore(ctx, x, i, t, on);
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
  }

  /* ------------------------------------------------------------- the gore
     Nothing comes out of a tank in one piece, and nothing that went wrong in
     one ever got taken out. What is left of the last few attempts is still in
     there with him, turning slowly: two arms, a hand, and the bits nobody
     bothered naming. They are HIS arms, in his colours, which is the part
     that is supposed to bother you. */
  const MEAT = '#7e1226', MEATL = '#c4304a', MEATD = '#4a0a18';
  const BONE = '#f0e4c8', BONED = '#b0a184';

  const GORE = [];
  (function buildGore() {
    for (let i = 0; i < 3; i++) {
      const set = [];
      for (let k = 0; k < 5; k++) {
        const h = (n) => U.hash2(i * 37 + k * 5, n);
        const side = k % 2 ? 1 : -1;
        set.push({
          kind: k < 2 ? 0 : (k === 2 ? 1 : 2),        // an arm, a hand, a scrap
          // they drift round the glass rather than across him, so he is never
          // buried by his own arms
          rx: 6 + h(3) * 5,
          ry: 12 + h(7) * 16,
          cx: side * (15 + h(11) * 6),
          cy: 12 + k * 17 + h(13) * 9,
          sp: 0.10 + h(17) * 0.14,
          ph: h(19) * U.TAU,
          s: (k < 2 ? 0.6 : 0.44) + h(23) * 0.22,
          spin: (h(29) - 0.5) * 0.7,
          roll: h(31) * U.TAU
        });
      }
      GORE.push(set);
    }
  })();

  /* One arm, pivoting on its stump, pointing right. The elbow and the fingers
     both keep working, very slowly, which is the bit that is not funny. */
  const GINK = '#16221f';                 // the ink everything in the fluid wears
  function severedArm(ctx, t, ph, skin, lite, dark) {
    const curl = 0.3 + Math.sin(t * 0.9 + ph) * 0.5;
    const ex = 15, ey = Math.sin(t * 0.7 + ph) * 3;
    const hx = ex + Math.cos(curl) * 13, hy = ey + Math.sin(curl) * 13;
    // tendons first, so they trail out of the back of the stump
    for (let k = -1; k <= 1; k++) {
      const wob = Math.sin(t * 2.2 + ph + k * 1.6);
      X.curve(ctx, -2, k * 1.6, -9 + wob * 2, k * 3 + wob * 3, -17 - Math.abs(wob) * 3,
        k * 4 + wob * 5, k ? MEATD : MEAT, 1, 8);
    }
    X.limb(ctx, 0, 0, ex, ey, 6, 5, skin, lite, GINK);
    X.limb(ctx, ex, ey, hx, hy, 5, 4, skin, lite, GINK);
    X.knob(ctx, ex, ey, 2.5, skin, lite);
    // the hand: a narrow palm and three long fingers half closed on nothing
    X.limb(ctx, hx, hy, hx + Math.cos(curl) * 4, hy + Math.sin(curl) * 4, 5, 4, skin, lite, GINK);
    for (let f = -1; f <= 1; f++) {
      const fa = curl + f * 0.46 + Math.sin(t * 1.7 + ph + f * 2) * 0.18;
      const kx = hx + Math.cos(fa) * 7, ky = hy + Math.sin(fa) * 7;
      X.limb(ctx, hx + Math.cos(curl) * 3, hy + Math.sin(curl) * 3, kx, ky, 3, 2, skin, lite, GINK);
      X.limb(ctx, kx, ky, kx + Math.cos(fa + 0.7) * 5, ky + Math.sin(fa + 0.7) * 5, 2, 2, skin, lite, GINK);
    }
    // the stump: torn meat, the ring of it, and the bone standing out of it
    X.blob(ctx, 0, 0, 4.5, 4.5, GINK);
    X.blob(ctx, 0, 0, 3.6, 3.6, MEAT);
    X.blob(ctx, -1, 0, 2.4, 2.4, MEATL);
    X.rect(ctx, -4, -1, 4, 2, BONE);
    X.rect(ctx, -5, -1, 1, 2, BONED);
  }

  function severedHand(ctx, t, ph, skin, lite, dark) {
    const curl = Math.sin(t * 1.1 + ph) * 0.4;
    X.curve(ctx, -2, 0, -8, Math.sin(t * 2 + ph) * 3, -14, Math.sin(t * 2 + ph) * 5, MEAT, 1, 7);
    X.limb(ctx, -1, 0, 4, 0, 6, 5, skin, lite, GINK);
    for (let f = -1; f <= 2; f++) {
      const fa = curl + f * 0.44 - 0.24;
      const kx = 4 + Math.cos(fa) * 6, ky = Math.sin(fa) * 6;
      X.limb(ctx, 3, 0, kx, ky, 3, 2, skin, lite, GINK);
      X.limb(ctx, kx, ky, kx + Math.cos(fa + 0.8) * 4, ky + Math.sin(fa + 0.8) * 4, 2, 2, skin, lite, GINK);
    }
    X.blob(ctx, -3, 0, 3, 3.2, MEAT);
    X.rect(ctx, -6, -1, 3, 2, BONE);
  }

  /* Fluid moves. A clot in it wobbles as it goes rather than sliding about
     like a sticker. */
  function drawGore(ctx, x, i, t, on) {
    const sk = PD.art.skinFor(null);
    const skin = sk.P.skin, lite = sk.P.skinL, dark = sk.P.skinD;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - TW / 2, TY, TW, TH); ctx.clip();
    ctx.globalAlpha = on ? 0.95 : 0.68;
    for (const q of GORE[i]) {
      const a = q.roll + t * q.sp;
      const px = x + q.cx + Math.cos(a) * q.rx;
      const py = TY + q.cy + Math.sin(a * 1.3 + q.ph) * q.ry * 0.5;
      // whatever has come off it hangs in the fluid behind it
      const back = Math.atan2(Math.sin(a * 1.3 + q.ph), Math.cos(a));
      for (let b = 1; b <= 3; b++) {
        ctx.globalAlpha = (on ? 0.1 : 0.06) / b;
        X.blob(ctx, px - Math.cos(back) * b * 4, py - Math.sin(back) * b * 2.5,
          1.4 + b * 1.1, 1 + b * 0.8, MEATD);
      }
      ctx.globalAlpha = on ? 0.95 : 0.68;
      ctx.save();
      ctx.translate(Math.round(px), Math.round(py));
      ctx.rotate(a * q.spin + Math.sin(t * 0.6 + q.ph) * 0.3);
      ctx.scale(q.s, q.s);
      if (q.kind === 0) severedArm(ctx, t, q.ph, skin, lite, dark);
      else if (q.kind === 1) severedHand(ctx, t, q.ph, skin, lite, dark);
      else {
        // a scrap: a knuckle of meat with a shard of bone through it
        X.blob(ctx, 0, 0, 3.4, 2.6, MEAT);
        X.blob(ctx, -1, -1, 1.8, 1.4, MEATL);
        X.rect(ctx, -3, 0, 6, 1, BONED);
        X.curve(ctx, 2, 0, 6, Math.sin(t * 2.6 + q.ph) * 3, 10,
          Math.sin(t * 2.6 + q.ph) * 5, MEATD, 1, 6);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* The thing in the jar: your own sprite, floating, eyes shut -- except when
     they are not. */
  function drawSpecimen(ctx, g, x, y, t, i, on) {
    const sk = PD.art.skinFor(g.save ? g.save.cos : null);
    const spr = sk.alienCore;
    const fl = Math.sin(t * 0.9 + i * 2) * 4;
    const cv = spr.frames[0];
    const hd = spr.hd || 1;
    // once in a while the whole thing kicks, all at once, and then stops
    const tw = (U.hash2(Math.floor(t * 0.5) + i * 13, 7) > 0.94)
      ? Math.sin(t * 41) * (1 - ((t * 0.5) % 1)) : 0;

    // the feed: four straight lengths of hose out of the cap and into his
    // chest, drawn before him so he hangs in front of it
    const cy0 = y + fl - 24;
    ctx.globalAlpha = on ? 0.85 : 0.62;
    const HOSE = [[x + 20, TY], [x + 22, TY + 24], [x + 18, cy0 - 22], [x + 14, cy0 - 6], [x + 10, cy0]];
    for (let q = 0; q < HOSE.length - 1; q++) {
      X.limb(ctx, HOSE[q][0], HOSE[q][1], HOSE[q + 1][0], HOSE[q + 1][1],
        4 - q * 0.5, 3.5 - q * 0.5, '#2c5e58', '#68b0a0', '#0e1e20');
      if (q) X.rect(ctx, HOSE[q][0] - 3, HOSE[q][1] - 1, 6, 3, '#7fc4b0');
    }
    ctx.globalAlpha = 0.55;
    for (let q = 0; q < 5; q++) {                  // and what is going back up it
      const f = ((t * 0.24 + q * 0.2) % 1) * (HOSE.length - 1);
      const j = Math.min(HOSE.length - 2, Math.floor(f)), u = f - j;
      X.rect(ctx, U.lerp(HOSE[j][0], HOSE[j + 1][0], u), U.lerp(HOSE[j][1], HOSE[j + 1][1], u),
        1, 2, u > 0.5 ? MEATL : MEATD);
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.globalAlpha = on ? 0.95 : 0.7;
    ctx.translate(Math.round(x + tw * 2), Math.round(y + fl));
    ctx.rotate(Math.sin(t * 0.5 + i) * 0.06 + tw * 0.06);
    ctx.drawImage(cv, -spr.ox, -spr.oy, cv.width / hd, cv.height / hd);
    // the shoulder one of those arms came off
    X.blob(ctx, -9, -30, 4, 3.4, MEATD);
    X.blob(ctx, -9, -30, 2.6, 2.2, MEAT);
    X.blob(ctx, -10, -30, 1.2, 1.2, BONE);
    for (let q = 0; q < 3; q++) {
      X.curve(ctx, -10, -30 + q, -15, -28 + Math.sin(t * 1.8 + q) * 3,
        -19, -24 + Math.sin(t * 1.8 + q) * 5, q & 1 ? MEAT : MEATD, 1, 7);
    }
    // and the socket the hose is screwed into
    X.blob(ctx, 10, -24, 3.4, 3, '#0e1e20');
    X.blob(ctx, 10, -24, 2.4, 2.2, MEAT);
    X.rect(ctx, 8, -25, 5, 2, '#7fc4b0');
    ctx.restore();
    // and every so often it opens an eye and finds you
    const look = U.hash2(Math.floor(t * 0.34) + i * 7, 23);
    if (look > 0.82) {
      const f = 1 - ((t * 0.34) % 1);
      ctx.globalAlpha = (on ? 1 : 0.8) * Math.min(1, f * 3);
      for (const s2 of [-1, 1]) {
        X.blob(ctx, x + s2 * 4, y + fl - 41, 2, 1.4, '#ff3a4a');
        X.blob(ctx, x + s2 * 4, y + fl - 41, 4, 3, 'rgba(255,58,74,0.18)');
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.22;
    X.rect(ctx, x - 30, y - 44, 60, 46, '#1a6a58');
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
