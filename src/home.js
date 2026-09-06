/* HOME: one room hacked out of a dead moon.

   There is no station, no crew, no terminal. There is a rock house with a
   stolen human computer on a plank, a bed of moss, a fridge with nothing in
   it, and a doorway through which you can see your dumb UFO sitting on two
   bricks. Walk left and right, jump absurdly high, tuck into a roll. Stand at
   the desk and press E to sit down at it; stand at the saucer and press E to
   go and hit a planet. That is the whole building. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const A = PD.audio;
  const FX = PD.fx;
  const D = PD.data;
  const AH = PD.arthome;
  const X = PD.pxd;

  const VW = 480, VH = 270;
  const ROOM_W = 700;
  const FLOOR = 214;                 // the floor of the room
  const CEIL = 84;                   // the underside of the rock roof
  const DOOR_X = 430;                // where the room stops and the moon starts
  const GRAV = 330;

  /* Flat indoors, lumpy once you are out on the regolith. */
  function groundY(x) {
    if (x < DOOR_X) return FLOOR;
    const f = U.clamp((x - DOOR_X) / 60, 0, 1);
    const bump = Math.sin(x * 0.021) * 5 + Math.sin(x * 0.047 + 1.3) * 3;
    return FLOOR + f * bump;
  }

  const P = {
    x: 240, y: FLOOR, vx: 0, vy: 0, face: 1, walk: 0,
    near: null, target: null, autoUse: null, lock: 0,
    roll: 0, rollA: 0, land: 0, air: 0
  };
  const UI = { mode: null, msg: '', msgT: 0 };

  /* The two things in the world you can actually press E on. */
  const SPOTS = [
    { id: 'desk', x: 236, r: 44, name: 'THE COMPUTER', sub: 'ABAY IS ON IT' },
    { id: 'ufo', x: 566, r: 56, name: 'YOUR DUMB UFO', sub: 'GO AND HIT A PLANET' }
  ];

  /* Furniture. He arranged it himself and it shows. */
  const PROPS = [
    { s: 'bed', x: 56 },
    { s: 'fridge', x: 128 },
    { s: 'junk0', x: 178 },
    { s: 'junk1', x: 330 },
    { s: 'junk2', x: 392 },
    { s: 'tape', x: 300, lift: 16 }
  ];
  const POSTERS = [{ k: 0, x: 92, y: 108 }, { k: 1, x: 276, y: 100 }, { k: 2, x: 400, y: 112 }];
  const OUT_ROCKS = [];
  for (let i = 0; i < 12; i++) OUT_ROCKS.push({ x: DOOR_X + 20 + U.hash2(i, 3) * (ROOM_W - DOOR_X - 40), k: (U.hash2(i, 9) * 3) | 0 });
  const CRATERS = [];
  for (let i = 0; i < 7; i++) CRATERS.push({ x: DOOR_X + 30 + U.hash2(i, 21) * (ROOM_W - DOOR_X - 60), r: 8 + U.hash2(i, 33) * 16 });
  const MOTES = [];
  for (let i = 0; i < 30; i++) MOTES.push({ x: U.hash2(i, 61) * ROOM_W, y: 60 + U.hash2(i, 67) * 150, r: U.hash2(i, 71), sp: 2 + U.hash2(i, 73) * 7 });
  const DRIPS = [{ x: 84, t: 0 }, { x: 206, t: 1.4 }, { x: 348, t: 2.6 }];
  const critters = [
    { x: 150, dir: 1, t: 0, spr: 'critter', speed: 13 },
    { x: 340, dir: -1, t: 0.7, spr: 'critter2', speed: 9 }
  ];
  let star = null;

  function enter(g, atX) {
    P.x = atX === undefined ? 300 : U.clamp(atX, 24, ROOM_W - 24);
    P.y = groundY(P.x); P.vx = 0; P.vy = 0;
    P.target = null; P.autoUse = null; P.roll = 0;
    P.lock = 0.25;
    UI.mode = null;
    g.intCam = U.clamp(P.x - VW / 2, 0, ROOM_W - VW);
    if (!star) {
      star = [];
      for (let i = 0; i < 130; i++) star.push({ x: U.hash2(i, 11) * ROOM_W, y: U.hash2(i, 17) * 200, b: U.hash2(i, 23) });
    }
  }

  function say(m) { UI.msg = m; UI.msgT = 2.6; }

  function nearest() {
    let best = null, bd = 1e9;
    for (const s of SPOTS) {
      const d = Math.abs(s.x - P.x);
      if (d < s.r && d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function use(g, s) {
    if (!s) return;
    if (s.id === 'desk') {
      g.state = 'desk';
      PD.desk.enter(g);
      A.sfx.tone(160, { type: 'square', to: 320, dur: 0.12, vol: 0.07 });
      return;
    }
    if (s.id === 'ufo') { A.sfx.dock(); g.openChart(); }
  }

  /* Coming back out of the first-person desk. */
  function leaveDesk(g) {
    g.state = 'home';
    P.lock = 0.3;
    P.x = SPOTS[0].x + 26; P.y = groundY(P.x); P.vx = 0; P.vy = 0; P.face = -1;
    g.intCam = U.clamp(P.x - VW / 2, 0, ROOM_W - VW);
  }

  /* ---------------------------------------------------------------- update */
  function update(dt, g) {
    const IN = PD.input;
    P.lock = Math.max(0, P.lock - dt);
    UI.msgT = Math.max(0, UI.msgT - dt);

    for (const c of critters) {
      c.t += dt; c.x += c.dir * c.speed * dt;
      if (c.x > DOOR_X - 30 || c.x < 30) c.dir *= -1;
      if (U.chance(dt * 0.4)) c.dir *= -1;
    }
    for (const d of DRIPS) { d.t += dt; if (d.t > 3.4) { d.t = 0; A.sfx.tone(1400, { type: 'sine', to: 800, dur: 0.1, vol: 0.02 }); } }

    const use_ = P.lock <= 0 && (IN.hit('KeyE') || IN.hit('space'));
    const m = IN.mouse;

    let ix = 0;
    if (IN.down('left')) ix -= 1;
    if (IN.down('right')) ix += 1;

    // click or tap anywhere: walk there, and use whatever is standing there
    if (P.lock <= 0 && m.leftPressed && m.y > 24) {
      const wx = m.x + g.intCam;
      let hit = null;
      for (const s of SPOTS) if (Math.abs(s.x - wx) < s.r) hit = s;
      P.target = hit ? hit.x : U.clamp(wx, 24, ROOM_W - 24);
      P.autoUse = hit;
      A.sfx.click();
    }
    if (ix) { P.target = null; P.autoUse = null; }
    if (P.target !== null) {
      const d = P.target - P.x;
      if (Math.abs(d) > 5) ix = Math.sign(d);
      else { P.target = null; if (P.autoUse) { const s = P.autoUse; P.autoUse = null; use(g, s); return; } }
    }

    const gy = groundY(P.x);
    const grounded = P.y >= gy - 0.5;

    if (P.roll <= 0 && grounded && (IN.hit('shift') || (IN.hit('down') && Math.abs(P.vx) > 20))) {
      P.roll = 0.55; P.rollA = 0;
      if (ix) P.face = ix;
      P.vx = P.face * 190;
      A.sfx.tone(300, { type: 'triangle', to: 120, dur: 0.25, vol: 0.09 });
      FX.dust(P.x, P.y, 4, '#8e86a8', 14);
    }
    if (P.roll > 0) {
      P.roll -= dt;
      P.rollA += P.face * dt * 14;
      P.vx = U.damp(P.vx, P.face * 150, 0.5, dt);
    } else {
      if (ix) P.face = ix;
      P.vx = U.damp(P.vx, ix * 96, 0.26, dt);
    }
    P.x = U.clamp(P.x + P.vx * dt, 24, ROOM_W - 24);
    P.walk += Math.abs(P.vx) * dt * 0.1;

    if (IN.hit('up') && grounded && P.roll <= 0) {
      P.vy = -196;
      A.sfx.tone(520, { type: 'triangle', to: 900, dur: 0.14, vol: 0.07 });
      FX.dust(P.x, P.y, 3, '#c9bce8', 10);
    }
    const floaty = IN.down('up') && P.vy < 0 ? 0.6 : 1;
    P.vy += GRAV * floaty * dt;
    P.y += P.vy * dt;
    // you will bang your head on your own roof, and you deserve it
    const roof = P.x < DOOR_X - 14 ? CEIL + 34 : -400;
    if (P.y < roof) { P.y = roof; if (P.vy < 0) { P.vy = 40; FX.dust(P.x, roof - 6, 3, '#6b6480', 10); A.sfx.tone(110, { type: 'square', to: 60, dur: 0.1, vol: 0.06 }); } }
    if (P.y >= gy) {
      if (P.vy > 60) { P.land = 0.22; FX.dust(P.x, gy, 5, '#8e86a8', 16); A.sfx.tone(140, { type: 'triangle', to: 80, dur: 0.1, vol: 0.06 }); }
      P.y = gy; P.vy = 0; P.air = 0;
    } else P.air += dt;
    P.land = Math.max(0, P.land - dt);

    const was = P.near;
    P.near = nearest();
    if (P.near && P.near !== was) A.sfx.tone(900, { type: 'square', dur: 0.03, vol: 0.03 });
    if (use_) use(g, P.near);

    g.intCam = U.damp(g.intCam, U.clamp(P.x - VW / 2, 0, ROOM_W - VW), 0.15, dt);
  }

  function closeScene() { UI.mode = null; P.lock = 0.2; A.sfx.click(); }
  function touchMode() { return 'home'; }

  /* ------------------------------------------------------------------ draw */
  function drawSpace(ctx, g, t, cam) {
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#090620'); sky.addColorStop(0.6, '#150d31'); sky.addColorStop(1, '#2a1541');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
    // one dithered nebula smear, shaped, never a soft glow
    const nx = 560 - cam * 0.2;
    ctx.save();
    for (let i = 4; i >= 1; i--) {
      ctx.globalAlpha = 0.05 + (4 - i) * 0.012;
      ctx.beginPath(); X.octPath(ctx, nx + (i % 2 ? 8 : -8), 70 + i * 3, i * 24); ctx.clip();
      X.dither(ctx, nx - 120, 0, 240, 160, '#ff8ad8', i % 2);
      ctx.restore(); ctx.save();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    for (const s of star) {
      const sx = s.x - cam * 0.3;
      if (sx < -4 || sx > VW + 4) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.b * 30);
      ctx.fillStyle = s.b > 0.86 ? '#ffe9a8' : '#ffffff';
      ctx.globalAlpha = 0.22 + s.b * 0.6 * tw;
      ctx.fillRect(sx | 0, s.y | 0, 1, 1);
    }
    ctx.globalAlpha = 1;
    // the dead Celestial your moon is made of, out on the far horizon
    const sk = AH.S.skull;
    const skx = Math.round(760 - cam * 0.45);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(sk.frames[0], skx - Math.round(sk.w * 0.9), FLOOR + 6 - Math.round(sk.h * 1.8), Math.round(sk.w * 1.8), Math.round(sk.h * 1.8));
    ctx.globalAlpha = 1;
    // the world you are about to ruin, hanging over the pad
    const icon = g.navIcon(g.save.bodyIndex || 0);
    const px = 620 - cam * 0.42, py = 62 + Math.sin(t * 0.4) * 2;
    if (px > -60 && px < VW + 60) ctx.drawImage(icon, Math.round(px - icon.width * 0.9), Math.round(py - icon.height * 0.9), Math.round(icon.width * 1.8), Math.round(icon.height * 1.8));
  }

  function drawOutside(ctx, t, cam) {
    const BAND = ['#6b6480', '#5f5875', '#544d6b', '#494360', '#3d3854', '#332e4a', '#2e2842'];
    for (let sx = Math.max(0, DOOR_X - cam); sx <= VW; sx += 2) {
      const wx = sx + cam;
      if (wx < DOOR_X - 4) continue;
      const y = Math.round(groundY(wx) / 2) * 2;
      for (let i = 0; i < BAND.length; i++) {
        const y0 = y + (i === 0 ? 0 : 4 + (i - 1) * 9);
        const h = i === 0 ? 4 : (i === BAND.length - 1 ? VH - y0 : 9);
        if (h > 0) X.rect(ctx, sx, y0, 2, h, BAND[i]);
      }
      X.rect(ctx, sx, y, 2, 2, '#a89ac4');
    }
    for (const c of CRATERS) {
      const x = c.x - cam; if (x < -50 || x > VW + 50) continue;
      X.blob(ctx, x, groundY(c.x) + c.r * 0.28, c.r, c.r * 0.3, '#453e5e');
      X.blob(ctx, x, groundY(c.x) + c.r * 0.1, c.r * 0.94, c.r * 0.16, '#8e86a8');
    }
    for (const r of OUT_ROCKS) {
      const x = r.x - cam; if (x < -24 || x > VW + 24) continue;
      AH.blit(ctx, AH.S['rock' + r.k], 0, x, groundY(r.x) + 2);
    }
  }

  /* Rough rock, drawn as stacked lumps rather than a straight edge. */
  function rockEdge(ctx, x0, x1, y, dir, col, colD, amp) {
    for (let x = x0; x < x1; x += 4) {
      const h = 3 + Math.round(U.hash2(x, dir) * amp);
      X.rect(ctx, x, dir > 0 ? y : y - h, 4, h, col);
      X.rect(ctx, x, dir > 0 ? y + h - 1 : y - h, 4, 1, colD);
    }
  }

  function drawHouse(ctx, g, t, cam) {
    const L = -cam, R = DOOR_X - cam;
    if (R < -20) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(Math.max(0, L), 0, Math.min(VW, R) - Math.max(0, L), VH); ctx.clip();

    // back wall, tiled
    const wall = AH.S.wall;
    for (let y = CEIL; y < FLOOR + 4; y += wall.h) {
      for (let x = -cam - 40; x < R + wall.w; x += wall.w) AH.blit(ctx, wall, 0, x, y);
    }
    // a big crack he has been meaning to look at
    ctx.save();
    let kx = 60 - cam, ky = CEIL + 6;
    for (let i = 0; i < 22; i++) {
      const w = 3 - (i % 3);
      X.rect(ctx, kx, ky, w, 4, '#241f36');
      X.rect(ctx, kx + w, ky, 1, 4, '#5f5680');
      kx += Math.round(U.hash2(i, 5) * 5) - 2; ky += 4;
    }
    ctx.restore();

    // the warm pool of light the computer throws over that end of the room
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.055;
      X.dither(ctx, SPOTS[0].x - cam - 80 + i * 9, CEIL + 4 + i * 7, 160 - i * 18, FLOOR - CEIL - i * 14, '#ffd39a', i % 2);
    }
    ctx.globalAlpha = 1;

    // roof: the same rock, in shadow, hanging over you the whole time
    X.rect(ctx, Math.max(0, L), 0, VW, CEIL + 4, '#15111f');
    ctx.globalAlpha = 0.24;
    for (let y = CEIL + 4 - wall.h; y > -wall.h; y -= wall.h) {
      for (let x = -cam - 40; x < R + wall.w; x += wall.w) AH.blit(ctx, wall, 0, x, y);
    }
    ctx.globalAlpha = 1;
    // a heavy uneven lip, then teeth of rock coming down out of it
    for (let x = Math.max(0, L) | 0; x < Math.min(VW, R); x += 3) {
      const h = 4 + Math.round(U.hash2(x + cam, 11) * 9);
      X.rect(ctx, x, CEIL - 2, 3, h + 2, '#15111f');
      X.rect(ctx, x, CEIL + h - 1, 3, 1, '#332e4a');
    }
    for (let i = 0; i < 22; i++) {
      const wx = 10 + i * 21, x = wx - cam;
      if (x < -14 || x > R) continue;
      const h = 8 + U.hash2(i, 5) * 26, w0 = 4 + U.hash2(i, 17) * 5;
      for (let j = 0; j < h; j++) {
        const w = Math.max(1, Math.round(w0 * (1 - j / h)));
        X.rect(ctx, x - w / 2, CEIL + 8 + j, w, 1, j > h - 4 ? '#0e0b16' : (j < 3 ? '#332e4a' : '#1e1930'));
        if (j < 4) X.rect(ctx, x - w / 2, CEIL + 8 + j, 1, 1, '#4a4260');
      }
    }
    // a pipe running the length of the roof, going nowhere
    X.rect(ctx, Math.max(0, L), CEIL - 8, VW, 5, '#5e6688');
    X.rect(ctx, Math.max(0, L), CEIL - 8, VW, 1, '#9aa3c4');
    X.rect(ctx, Math.max(0, L), CEIL - 4, VW, 1, '#39405e');
    for (let i = 0; i < 8; i++) {
      const x = 40 + i * 60 - cam; if (x < -10 || x > R) continue;
      X.rect(ctx, x, CEIL - 10, 6, 9, '#39405e');
      X.rect(ctx, x, CEIL - 10, 6, 1, '#9aa3c4');
    }
    // fairy lights he strung up one solstice and never took down
    for (let seg = 0; seg < 5; seg++) {
      const ax = 20 + seg * 90 - cam, bx2 = ax + 90;
      if (bx2 < -20 || ax > R + 20) continue;
      X.curve(ctx, ax, CEIL + 2, (ax + bx2) / 2, CEIL + 26, bx2, CEIL + 2, '#191320', 1, 12);
      for (let k = 1; k < 6; k++) {
        const f = k / 6, lx = ax + 90 * f, ly = CEIL + 2 + Math.sin(Math.PI * f) * 22;
        const col = ['#ffd34d', '#ff8ad8', '#8affa0', '#7ef9ff'][(seg + k) % 4];
        const on = 0.5 + 0.5 * Math.sin(t * 3 + seg + k);
        X.rect(ctx, lx - 1, ly - 1, 4, 5, '#191320');
        ctx.globalAlpha = 0.4 + 0.6 * on;
        X.rect(ctx, lx, ly, 2, 3, col);
        ctx.globalAlpha = 0.12 * on;
        X.dither(ctx, lx - 6, ly - 6, 14, 14, col, k % 2);
        ctx.globalAlpha = 1;
      }
    }
    // one bare bulb on a wire, flickering because he wired it
    const bx = 122 - cam, flick = U.hash2((t * 8) | 0, 3) > 0.06;
    X.rect(ctx, bx, CEIL, 1, 22, '#191320');
    X.rect(ctx, bx - 4, CEIL + 22, 9, 4, '#8e86a8');
    X.rect(ctx, bx - 3, CEIL + 26, 7, 8, flick ? '#ffe9a8' : '#6b6450');
    if (flick) X.rect(ctx, bx - 2, CEIL + 27, 3, 3, '#ffffff');
    if (flick) {
      for (let i = 3; i >= 0; i--) {
        ctx.globalAlpha = 0.05;
        const w = 30 + i * 26;
        X.dither(ctx, bx - w / 2, CEIL + 30, w, FLOOR - CEIL - 30 - i * 4, '#ffe9a8', i % 2);
      }
      ctx.globalAlpha = 1;
    }

    // floor slab, then dark below it
    const fl = AH.S.floor;
    for (let x = -cam - 40; x < R + fl.w; x += fl.w) AH.blit(ctx, fl, 0, x, FLOOR);
    X.rect(ctx, Math.max(0, L), FLOOR + 13, VW, VH - FLOOR, '#241f36');
    for (let x = -(cam % 24) - 24; x < VW + 24; x += 24) {
      X.rect(ctx, x, FLOOR + 14, 22, 14, '#2a2440');
      X.rect(ctx, x, FLOOR + 14, 22, 1, '#3a3450');
      X.rect(ctx, x + 12, FLOOR + 30, 22, 14, '#262034');
      X.rect(ctx, x + 12, FLOOR + 30, 22, 1, '#332e4a');
    }
    // a rug of stitched hides, worn through in the middle
    const rx = 300 - cam;
    if (rx > -80 && rx < R + 80) {
      X.rect(ctx, rx - 62, FLOOR + 1, 124, 8, '#7a3f4a');
      X.rect(ctx, rx - 62, FLOOR + 1, 124, 2, '#9c5460');
      for (let i = 0; i < 12; i++) X.rect(ctx, rx - 58 + i * 10, FLOOR + 4, 6, 3, i % 2 ? '#5e2f38' : '#8a4854');
      for (let i = 0; i < 20; i++) X.rect(ctx, rx - 62 + i * 6, FLOOR + 9, 2, 3, '#5e2f38');
    }

    // posters, taped crooked
    for (const p of POSTERS) {
      const x = p.x - cam; if (x < -30 || x > R + 30) continue;
      AH.blit(ctx, AH.S['poster' + p.k], 0, x, p.y);
      X.rect(ctx, x - 8, p.y - 2, 16, 4, '#e8e05a');
    }
    // a wall shelf with three rocks he is proud of
    const shx = 344 - cam;
    if (shx > -40 && shx < R + 40) {
      X.rect(ctx, shx - 28, 148, 56, 3, '#7a5a3a');
      X.rect(ctx, shx - 28, 148, 56, 1, '#9c7a52');
      X.rect(ctx, shx - 26, 151, 3, 4, '#5a4028'); X.rect(ctx, shx + 23, 151, 3, 4, '#5a4028');
      const shiny = [D.M.gold, D.M.emerald, D.M.iron];
      for (let i = 0; i < 3; i++) PD.art.oreChip(ctx, shiny[i], shx - 24 + i * 17, 137, 11);
    }
    // a tally of every world he has taken apart, scratched into the rock
    const tx = 166 - cam, kills = g.save.destroyed.filter(Boolean).length;
    if (tx > -60 && tx < R + 60) {
      F.draw(ctx, 'WORLDS I ATE', tx, 160, '#8e86a8', { shadow: false });
      for (let i = 0; i < Math.max(kills, 1); i++) {
        const gx = tx + (i % 10) * 7, gy = 172 + ((i / 10) | 0) * 12;
        if (i < kills) { X.rect(ctx, gx, gy, 2, 9, '#c9bce8'); if (i % 5 === 4) X.rect(ctx, gx - 26, gy + 3, 30, 2, '#c9bce8'); }
      }
      if (!kills) F.draw(ctx, 'NONE YET', tx, 172, '#5f5680', { shadow: false });
    }
    // hooks with tools on them
    const hx = 226 - cam;
    if (hx > -40 && hx < R + 40) {
      X.rect(ctx, hx - 40, 116, 62, 2, '#4a4260');
      for (let i = 0; i < 3; i++) {
        X.rect(ctx, hx - 34 + i * 21, 118, 2, 6, '#8e86a8');
        X.rect(ctx, hx - 38 + i * 21, 124, 11, 15, ['#8e86a8', '#c46a3a', '#5ad0e8'][i]);
        X.rect(ctx, hx - 38 + i * 21, 124, 11, 2, '#c9bce8');
        X.rect(ctx, hx - 36 + i * 21, 128, 7, 2, '#3a3450');
      }
    }
    ctx.restore();
  }

  function drawProps(ctx, g, t, cam) {
    for (const p of PROPS) {
      const x = p.x - cam; if (x < -50 || x > VW + 50) continue;
      const s = AH.S[p.s];
      if (!s) continue;
      if (p.s === 'tape') {
        X.rect(ctx, x - 16, FLOOR - 16, 32, 16, '#5a4a3a');
        X.rect(ctx, x - 16, FLOOR - 16, 32, 2, '#7a6a52');
        AH.blit(ctx, s, Math.floor(t * 4) % 2, x, FLOOR - 16);
        // he has one human tape and he has worn it out
        const note = D.MIX[Math.floor(t * 0.25) % D.MIX.length].slice(0, 16);
        F.draw(ctx, note, x, FLOOR - 44 + Math.sin(t * 2) * 2, '#ff8ad8', { center: true });
        for (let i = 0; i < 3; i++) {
          const a = (t * 1.3 + i * 0.7) % 1;
          ctx.globalAlpha = 1 - a;
          F.draw(ctx, i % 2 ? '.' : 'O', x + 12 + Math.sin(a * 6 + i) * 6, FLOOR - 24 - a * 30, '#8affa0', { center: true });
        }
        ctx.globalAlpha = 1;
        continue;
      }
      AH.blit(ctx, s, 0, x, FLOOR + 1 - (p.lift || 0));
    }
    // the desk, its screen lit
    const dx = SPOTS[0].x - cam;
    AH.blit(ctx, AH.S.desk, 1, dx, FLOOR + 1);
    // a chair: a crate, obviously
    X.rect(ctx, dx + 34, FLOOR - 18, 20, 18, '#6b4530');
    X.rect(ctx, dx + 34, FLOOR - 18, 20, 2, '#8a5a3a');
    X.rect(ctx, dx + 36, FLOOR - 12, 16, 2, '#4a3020');
    // the screen throws light on the floor in stepped bands
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.07;
      X.dither(ctx, dx - 30 + i * 6, FLOOR - 8 + i * 2, 60 - i * 12, 8, '#8affa0', i % 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawDoor(ctx, t, cam) {
    const x = DOOR_X - cam;
    if (x < -60 || x > VW + 60) return;
    // a rough arch of rock hacked out with a drill
    X.rect(ctx, x - 12, 0, 14, CEIL + 26, '#3a3450');
    rockEdge(ctx, (x - 12) | 0, (x + 2) | 0, CEIL + 26, 1, '#4a4260', '#241f36', 10);
    for (let y = CEIL + 26; y < FLOOR + 14; y += 5) {
      const w = 4 + Math.round(U.hash2(y, 7) * 5);
      X.rect(ctx, x - 12, y, 12 + w, 5, U.hash2(y, 3) > 0.5 ? '#4a4260' : '#3f3856');
      X.rect(ctx, x - 12 + 12 + w - 1, y, 1, 5, '#241f36');
    }
    // a curtain of rubber strips, hung so the moon does not get in
    for (let i = 0; i < 6; i++) {
      const cx = x - 12 + i * 4, sw = Math.sin(t * 1.2 + i * 0.6) * 1.5;
      const len = 46 + (i % 3) * 8;
      for (let j = 0; j < len; j += 2) X.rect(ctx, cx + sw * (j / len), CEIL + 14 + j, 3, 2, j % 4 ? '#3f3856' : '#4a4260');
      X.rect(ctx, cx, CEIL + 14, 3, 2, '#8e86a8');
    }
    // painted sign, hand done, wrong, hung on the inside wall
    X.rect(ctx, x - 66, CEIL + 20, 48, 15, '#7a5a3a');
    X.rect(ctx, x - 66, CEIL + 20, 48, 2, '#9c7a52');
    X.rect(ctx, x - 66, CEIL + 33, 48, 2, '#4a3020');
    X.rect(ctx, x - 44, CEIL + 14, 2, 6, '#4a4260');
    F.draw(ctx, 'OWTSIDE', x - 42, CEIL + 24, '#ffe9a8', { center: true });
  }

  function drawUfo(ctx, g, t, cam) {
    const x = SPOTS[1].x - cam;
    if (x < -100 || x > VW + 100) return;
    const gy = groundY(SPOTS[1].x);
    // scorch under it, in hard steps
    X.blob(ctx, x, gy + 1, 46, 5, '#241f36');
    X.blob(ctx, x, gy, 38, 3, '#1a1526');
    AH.blit(ctx, AH.S.saucer, Math.floor(t * 3) % 2, x, gy + 2);
    // a ramp of two planks, and a bucket
    X.rect(ctx, x - 46, gy - 6, 26, 3, '#7a5a3a');
    X.rect(ctx, x - 46, gy - 3, 26, 3, '#5a4028');
    X.rect(ctx, x + 40, gy - 8, 10, 8, '#8e86a8');
    X.rect(ctx, x + 40, gy - 8, 10, 2, '#b0a8c8');
    // a flag he planted to claim a moon nobody wanted
    const fx = x + 78;
    AH.blit(ctx, AH.S.flag, Math.floor(t * 4) % 2, fx, groundY(SPOTS[1].x + 78) + 2);
  }

  /* A wooden sign that pops up when you are close enough to press E. */
  function prompt(ctx, g, t, cam) {
    const s = P.near;
    if (!s) return;
    const x = Math.round(s.x - cam);
    const y = Math.round(groundY(s.x) - (s.id === 'ufo' ? 74 : 60) + Math.sin(t * 4) * 2);
    const w = Math.max(F.width(s.name, 1), F.width(s.sub, 1)) + 18;
    X.rect(ctx, x - w / 2 + 2, y + 2, w, 26, 'rgba(6,3,14,0.5)');
    X.rect(ctx, x - w / 2, y, w, 26, '#7a5a3a');
    X.rect(ctx, x - w / 2, y, w, 2, '#9c7a52');
    X.rect(ctx, x - w / 2, y + 24, w, 2, '#4a3020');
    F.draw(ctx, s.name, x, y + 4, '#ffe9a8', { center: true });
    F.draw(ctx, s.sub, x, y + 14, '#c9a06a', { center: true });
    // the key, on a nail
    X.rect(ctx, x - 6, y - 13, 12, 12, '#e8dfc4');
    X.rect(ctx, x - 6, y - 13, 12, 1, '#ffffff');
    X.rect(ctx, x - 6, y - 2, 12, 1, '#a89b78');
    F.draw(ctx, 'E', x, y - 10, '#241f16', { center: true, shadow: false });
    X.rect(ctx, x, y - 1, 1, 3, '#4a3020');
  }

  function draw(ctx, g, t) {
    const cam = Math.round(g.intCam);
    drawSpace(ctx, g, t, cam);
    drawOutside(ctx, t, cam);
    drawHouse(ctx, g, t, cam);
    drawProps(ctx, g, t, cam);
    drawDoor(ctx, t, cam);
    drawUfo(ctx, g, t, cam);

    // dust in the light
    for (const m of MOTES) {
      const x = ((m.x + t * m.sp) % ROOM_W) - cam; if (x < -4 || x > VW + 4) continue;
      ctx.fillStyle = '#c9bce8'; ctx.globalAlpha = 0.12 + 0.22 * Math.sin(t * 2 + m.x);
      ctx.fillRect(x | 0, (m.y + Math.sin(t * 0.7 + m.x * 0.1) * 4) | 0, m.r > 0.7 ? 2 : 1, m.r > 0.7 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    // drips off the roof
    for (const d of DRIPS) {
      const x = d.x - cam; if (x < -4 || x > VW + 4) continue;
      const f = d.t / 3.4;
      if (f < 0.7) X.rect(ctx, x, CEIL + 20 + f / 0.7 * (FLOOR - CEIL - 26), 1, 3, '#8affa0');
      else if (f < 0.78) X.rect(ctx, x - 3, FLOOR - 3, 7, 1, '#8affa0');
    }
    for (const c of critters) {
      const x = c.x - cam; if (x < -20 || x > VW + 20) continue;
      const hop = Math.abs(Math.sin(c.t * 5)) * 5;
      AH.blit(ctx, AH.S[c.spr], Math.floor(c.t * 6) % 2, x, groundY(c.x) + 2 - hop, c.dir < 0);
    }

    drawPlayer(ctx, g, cam, t);
    prompt(ctx, g, t, cam);

    // a foreground lip of rock so the room has depth
    for (let x = -8; x < VW + 8; x += 6) {
      const h = 6 + Math.round(U.hash2(x + cam * 0.2, 11) * 8);
      X.rect(ctx, x, VH - h, 6, h, '#1a1526');
      X.rect(ctx, x, VH - h, 6, 1, '#241f36');
    }

    if (UI.msgT > 0) {
      ctx.globalAlpha = Math.min(1, UI.msgT);
      F.draw(ctx, UI.msg, VW / 2, VH - 34, '#ffe9a8', { center: true });
      ctx.globalAlpha = 1;
    }
  }

  function drawPlayer(ctx, g, cam, t) {
    const skin = PD.art.skinFor(g.save.cos);
    const gy = groundY(P.x);
    const air = P.y < gy - 1;
    const walking = Math.abs(P.vx) > 8;
    const x = (P.x - cam) | 0, y = (P.y + 2) | 0;
    if (P.roll > 0) {
      ctx.save();
      ctx.translate(x, y - 12);
      ctx.rotate(P.rollA);
      const s = skin.alienRoll;
      ctx.drawImage(s.frames[0], -s.ox, -s.oy + 12, s.w, s.h);
      ctx.restore();
      if (U.chance(0.5)) FX.dust(P.x - P.face * 6, P.y, 1, '#8e86a8', 8);
      return;
    }
    const set = air ? skin.alienFly : (walking ? skin.alienWalk : skin.alien);
    const frame = air ? Math.floor(t * 8) % 2 : (walking ? Math.floor(P.walk * 1.1) % 4 : (Math.sin(t * 1.3) > 0.9 ? 2 : (Math.sin(t * 2.2) > 0.6 ? 1 : 0)));
    const sq = P.land > 0 ? 1 + P.land * 1.2 : (air && P.vy < -60 ? 0.9 : 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(P.face < 0 ? -sq : sq, 1 / sq);
    ctx.drawImage(set.frames[frame], -set.ox, -set.oy, set.w, set.h);
    ctx.restore();
    if (walking && !air && U.chance(0.2)) FX.dust(P.x - P.face * 5, P.y, 1, '#8e86a8', 10);
  }

  PD.home = { enter, update, draw, closeScene, touchMode, leaveDesk, say, P, UI, groundY, ROOM_W, SPOTS };
})(window.PD);
