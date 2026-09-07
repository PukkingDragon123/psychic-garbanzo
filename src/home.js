/* HOME.

   Two places. OUTSIDE is an empty moon with your rock house standing on it and
   your dumb UFO parked alongside. INSIDE is one room with a dumb bed and the
   stolen computer, and nothing else except the mess. Walk to the door and
   press E to go through, either way.

   The first time you go in there is a very fat rat eating your cheese. Give it
   the cheese and it is yours forever. */
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
  const OUT_W = 860, IN_W = 470;
  const FLOOR = 214;                 // the moon surface / the room floor
  const CEIL = 56;                   // the underside of the rock roof, inside
  const GRAV = 300;                  // low: everything here is bouncy

  const S = { scene: 'out', t: 0, ratSeen: 0, sleep: 0, swing: 0 };

  function roomW() { return S.scene === 'out' ? OUT_W : IN_W; }

  /* Flat indoors; lumpy regolith outside. */
  function groundY(x) {
    if (S.scene === 'in') return FLOOR;
    return FLOOR + Math.sin(x * 0.019) * 5 + Math.sin(x * 0.043 + 1.3) * 3;
  }

  const P = {
    x: 240, y: FLOOR, vx: 0, vy: 0, face: 1, walk: 0,
    near: null, target: null, autoUse: null, lock: 0,
    roll: 0, rollA: 0, land: 0, air: 0, hop: 0
  };
  const UI = { mode: null, msg: '', msgT: 0 };

  /* ------------------------------------------------------------------ spots */
  const OUT_SPOTS = [
    { id: 'door', x: 300, r: 50, name: 'THE ROCK HOUSE', sub: 'GO INSIDE' },
    { id: 'ufo', x: 640, r: 58, name: 'YOUR DUMB UFO', sub: 'GO AND HIT A PLANET' }
  ];
  const IN_SPOTS = [
    { id: 'pc', x: 132, r: 46, name: 'THE COMPUTER', sub: 'ABAY IS ON IT' },
    { id: 'bed', x: 286, r: 38, name: 'YOUR DUMB BED', sub: 'IT IS MOSS. HAVE A LIE DOWN' },
    { id: 'exit', x: 424, r: 44, name: 'THE DOOR', sub: 'GO OUTSIDE' }
  ];
  const RAT_SPOT = { id: 'rat', x: 208, r: 46, name: 'A VERY FAT RAT', sub: 'GIVE HIM THE CHEESE' };
  const SPOTS = OUT_SPOTS;                    // game.js docks you next to the UFO

  /* --------------------------------------------------------------- scenery */
  const OUT_ROCKS = [];
  for (let i = 0; i < 20; i++) OUT_ROCKS.push({ x: 20 + U.hash2(i, 3) * (OUT_W - 40), k: (U.hash2(i, 9) * 3) | 0 });
  const CRATERS = [];
  for (let i = 0; i < 12; i++) CRATERS.push({ x: 30 + U.hash2(i, 21) * (OUT_W - 60), r: 8 + U.hash2(i, 33) * 20 });
  const RUINS = [{ x: 70, k: 2 }, { x: 780, k: 1 }];
  const MOTES = [];
  for (let i = 0; i < 26; i++) MOTES.push({ x: U.hash2(i, 61), y: 60 + U.hash2(i, 67) * 150, r: U.hash2(i, 71), sp: 2 + U.hash2(i, 73) * 7 });

  /* Inside: the mess, and where each piece of it lies. */
  const IN_PROPS = [
    { s: 'bed', x: 286 },
    { s: 'fridge', x: 350 },
    { s: 'junk0', x: 60 },
    { s: 'junk1', x: 196 },
    { s: 'junk2', x: 388 },
    { s: 'litter0', x: 100 },
    { s: 'litter1', x: 246 },
    { s: 'litter2', x: 330 },
    { s: 'litter3', x: 168 },
    { s: 'litter0', x: 408 },
    { s: 'tape', x: 240, lift: 14 }
  ];
  const POSTERS = [{ k: 0, x: 84, y: 96 }, { k: 1, x: 250, y: 84 }, { k: 2, x: 398, y: 104 }];
  const DRIPS = [{ x: 330, t: 0 }, { x: 118, t: 1.7 }];

  /* ---------------------------------------------------------------- the rat */
  const rat = { x: 214, y: FLOOR, vx: 0, t: 0, face: -1, hop: 0, chew: 0 };

  let star = null;

  function enter(g, atX) {
    S.scene = 'out';
    place(g, atX === undefined ? 400 : atX);
    if (!star) {
      star = [];
      for (let i = 0; i < 150; i++) star.push({ x: U.hash2(i, 11), y: U.hash2(i, 17) * 190, b: U.hash2(i, 23) });
    }
  }

  function place(g, atX) {
    P.x = U.clamp(atX, 26, roomW() - 26);
    P.y = groundY(P.x); P.vx = 0; P.vy = 0;
    P.target = null; P.autoUse = null; P.roll = 0; P.hop = 0;
    P.lock = 0.28;
    UI.mode = null;
    g.intCam = U.clamp(P.x - VW / 2, 0, roomW() - VW);
    rat.x = g.save.pet ? P.x - 40 : RAT_SPOT.x;
    rat.y = groundY(rat.x);
  }

  function goIn(g) {
    S.scene = 'in';
    place(g, IN_SPOTS[2].x - 40);
    A.sfx.tone(150, { type: 'square', to: 90, dur: 0.2, vol: 0.08 });
    if (!g.save.pet && !S.ratSeen) {
      S.ratSeen = 1;
      say('THERE IS A VERY FAT RAT EATING YOUR CHEESE.');
      A.sfx.tone(1600, { type: 'square', to: 700, dur: 0.18, vol: 0.07 });
    }
  }
  function goOut(g) {
    S.scene = 'out';
    place(g, OUT_SPOTS[0].x + 10);
    A.sfx.tone(220, { type: 'square', to: 420, dur: 0.2, vol: 0.08 });
  }

  function say(m) { UI.msg = m; UI.msgT = 3.2; }

  function spots(g) {
    if (S.scene === 'out') return OUT_SPOTS;
    return g.save.pet ? IN_SPOTS : IN_SPOTS.concat([RAT_SPOT]);
  }

  function nearest(g) {
    let best = null, bd = 1e9;
    for (const s of spots(g)) {
      const d = Math.abs(s.x - P.x);
      if (d < s.r && d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function use(g, s) {
    if (!s) return;
    if (s.id === 'door') { goIn(g); return; }
    if (s.id === 'exit') { goOut(g); return; }
    if (s.id === 'ufo') { A.sfx.dock(); g.openChart(); return; }
    if (s.id === 'pc') {
      g.state = 'desk';
      PD.desk.enter(g);
      A.sfx.tone(160, { type: 'square', to: 320, dur: 0.12, vol: 0.07 });
      return;
    }
    if (s.id === 'bed') { sleep(g); return; }
    if (s.id === 'rat') { feedRat(g); return; }
  }

  /* Hand the cheese over. He is yours now; there is no undoing this. */
  function feedRat(g) {
    g.save.pet = 1;
    g.saveGame();
    rat.hop = 1;
    say('HE IS YOURS NOW. HE IS CALLED BRENDA.');
    A.sfx.fanfare && A.sfx.fanfare();
    FX.text(rat.x, rat.y - 40, 'BRENDA', '#ff9ecb', 2);
    for (let i = 0; i < 26; i++) {
      FX.spawn({ x: rat.x + U.rand(-16, 16), y: rat.y - 16, vx: U.rand(-50, 50), vy: U.rand(-110, -30),
        life: 1.1, size: 2, color: i % 2 ? '#ff9ecb' : '#ffd34d', grav: 130, drag: 1, glow: 1 });
    }
    FX.ring(rat.x, rat.y - 14, 4, 38, 0.7, '#ff9ecb', 2);
  }

  /* A lie down. Nothing heals, but the ore market moves while you are out. */
  function sleep(g) {
    if (S.sleep > 0) return;
    S.sleep = 2.2;
    A.sfx.tone(200, { type: 'triangle', to: 120, dur: 0.6, vol: 0.08 });
    if (g.player) { g.player.hull = g.player.stat('hull'); g.player.o2 = g.player.stat('oxygen'); }
  }

  function leaveDesk(g) {
    g.state = 'home';
    S.scene = 'in';
    P.lock = 0.32;
    P.x = IN_SPOTS[0].x + 34; P.y = groundY(P.x); P.vx = 0; P.vy = 0; P.face = -1;
    g.intCam = U.clamp(P.x - VW / 2, 0, roomW() - VW);
  }

  /* ---------------------------------------------------------------- update */
  function update(dt, g) {
    const IN = PD.input;
    S.t += dt;
    P.lock = Math.max(0, P.lock - dt);
    UI.msgT = Math.max(0, UI.msgT - dt);

    if (S.sleep > 0) {
      S.sleep -= dt;
      for (let k = 0; k < 6; k++) g.demandFor(k);        // the market keeps moving
      if (S.sleep <= 0) { say('YOU SLEPT. THE PRICES MOVED. THEY ALWAYS DO.'); A.sfx.tone(700, { type: 'triangle', to: 1100, dur: 0.2, vol: 0.07 }); }
      return;
    }

    for (const d of DRIPS) { d.t += dt; if (d.t > 3.4) { d.t = 0; A.sfx.tone(1400, { type: 'sine', to: 800, dur: 0.1, vol: 0.02 }); } }
    updateRat(dt, g);

    const use_ = P.lock <= 0 && (IN.hit('KeyE') || IN.hit('space'));
    const m = IN.mouse;

    let ix = 0;
    if (IN.down('left')) ix -= 1;
    if (IN.down('right')) ix += 1;

    if (P.lock <= 0 && m.leftPressed && m.y > 26) {
      const wx = m.x + g.intCam;
      let hit = null;
      for (const s of spots(g)) if (Math.abs(s.x - wx) < s.r) hit = s;
      P.target = hit ? hit.x : U.clamp(wx, 26, roomW() - 26);
      P.autoUse = hit;
      A.sfx.click();
    }
    if (ix) { P.target = null; P.autoUse = null; }
    if (P.target !== null) {
      const d = P.target - P.x;
      if (Math.abs(d) > 6) ix = Math.sign(d);
      else { P.target = null; if (P.autoUse) { const s = P.autoUse; P.autoUse = null; use(g, s); return; } }
    }

    const gy = groundY(P.x);
    const grounded = P.y >= gy - 0.5;

    if (P.roll <= 0 && grounded && (IN.hit('shift') || (IN.hit('down') && Math.abs(P.vx) > 20))) {
      P.roll = 0.55; P.rollA = 0;
      if (ix) P.face = ix;
      P.vx = P.face * 210;
      A.sfx.tone(300, { type: 'triangle', to: 120, dur: 0.25, vol: 0.09 });
      FX.dust(P.x, P.y, 5, '#8e86a8', 16);
    }
    if (P.roll > 0) {
      P.roll -= dt;
      P.rollA += P.face * dt * 15;
      P.vx = U.damp(P.vx, P.face * 170, 0.5, dt);
    } else {
      if (ix) P.face = ix;
      P.vx = U.damp(P.vx, ix * 104, 0.3, dt);
    }
    P.x = U.clamp(P.x + P.vx * dt, 26, roomW() - 26);
    P.walk += Math.abs(P.vx) * dt * 0.1;

    if (IN.hit('up') && grounded && P.roll <= 0) {
      P.vy = -212;
      A.sfx.tone(520, { type: 'triangle', to: 980, dur: 0.14, vol: 0.07 });
      FX.dust(P.x, P.y, 4, '#c9bce8', 12);
    }
    const floaty = IN.down('up') && P.vy < 0 ? 0.55 : 1;
    P.vy += GRAV * floaty * dt;
    P.y += P.vy * dt;

    // the ceiling is out of reach, but the junk hanging off the beam is not
    const roof = S.scene === 'in' ? 134 : -600;
    if (P.y < roof) {
      P.y = roof;
      if (P.vy < 0) {
        P.vy = 70; S.swing = 1;
        FX.dust(P.x, roof - 6, 4, '#6b6480', 12);
        A.sfx.tone(180, { type: 'square', to: 90, dur: 0.12, vol: 0.07 });
      }
    }
    S.swing = Math.max(0, S.swing - dt * 1.4);

    if (P.y >= gy) {
      if (P.vy > 60) {
        // EVERYTHING BOUNCES. He lands, squashes flat, and pops back up.
        P.land = 0.26;
        if (P.vy > 150 && P.hop < 2) { P.vy = -P.vy * 0.34; P.hop++; }
        else { P.vy = 0; P.hop = 0; }
        FX.dust(P.x, gy, 6, '#8e86a8', 18);
        A.sfx.tone(150, { type: 'triangle', to: 90, dur: 0.1, vol: 0.06 });
      } else { P.vy = 0; P.hop = 0; }
      P.y = gy; P.air = 0;
    } else P.air += dt;
    P.land = Math.max(0, P.land - dt * 3.4);

    const was = P.near;
    P.near = nearest(g);
    if (P.near && P.near !== was) A.sfx.tone(900, { type: 'square', dur: 0.03, vol: 0.03 });
    if (use_) use(g, P.near);

    g.intCam = U.damp(g.intCam, U.clamp(P.x - VW / 2, 0, roomW() - VW), 0.16, dt);
  }

  /* Before he is yours he stands over the cheese. After, he never shuts up
     about following you and he bounces the whole way. */
  function updateRat(dt, g) {
    rat.t += dt;
    rat.chew = Math.max(0, rat.chew - dt);
    if (!g.save.pet) {
      rat.x = RAT_SPOT.x;
      rat.y = groundY(rat.x);
      rat.face = P.x > rat.x ? 1 : -1;
      if (U.chance(dt * 1.4)) { rat.chew = 0.3; A.sfx.tone(240, { type: 'square', dur: 0.03, vol: 0.02 }); }
      return;
    }
    const want = P.x - P.face * 34;
    const d = want - rat.x;
    if (Math.abs(d) > 14) {
      rat.vx = U.damp(rat.vx, U.clamp(d * 2.6, -120, 120), 0.14, dt);
      rat.face = Math.sign(rat.vx) || rat.face;
    } else rat.vx = U.damp(rat.vx, 0, 0.3, dt);
    rat.x = U.clamp(rat.x + rat.vx * dt, 20, roomW() - 20);
    // he is far too fat to walk, so he bounces
    rat.hop = Math.abs(rat.vx) > 12 ? (rat.hop + dt * 9) : U.damp(rat.hop, 0, 0.2, dt);
    rat.y = groundY(rat.x);
  }

  function closeScene() { UI.mode = null; P.lock = 0.2; A.sfx.click(); }
  function touchMode() { return 'home'; }

  /* ------------------------------------------------------------------ draw */
  function drawSpace(ctx, g, t, cam) {
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#090620'); sky.addColorStop(0.6, '#150d31'); sky.addColorStop(1, '#2a1541');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
    const nx = 620 - cam * 0.2;
    ctx.save();
    for (let i = 4; i >= 1; i--) {
      ctx.globalAlpha = 0.05 + (4 - i) * 0.012;
      ctx.beginPath(); X.octPath(ctx, nx + (i % 2 ? 8 : -8), 66 + i * 3, i * 24); ctx.clip();
      X.dither(ctx, nx - 120, 0, 240, 160, '#ff8ad8', i % 2);
      ctx.restore(); ctx.save();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    for (const s of star) {
      const sx = s.x * OUT_W - cam * 0.3;
      if (sx < -4 || sx > VW + 4) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.b * 30);
      ctx.fillStyle = s.b > 0.86 ? '#ffe9a8' : '#ffffff';
      ctx.globalAlpha = 0.22 + s.b * 0.6 * tw;
      ctx.fillRect(sx | 0, s.y | 0, 1, 1);
    }
    ctx.globalAlpha = 1;
    // the dead Celestial your moon is made of, out on the horizon
    const sk = AH.S.skull;
    const skx = Math.round(150 - cam * 0.4);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(sk.frames[0], skx - Math.round(sk.w * 0.8), FLOOR + 8 - Math.round(sk.h * 1.6), Math.round(sk.w * 1.6), Math.round(sk.h * 1.6));
    ctx.globalAlpha = 1;
    // the world you are about to ruin
    const icon = g.navIcon(g.save.bodyIndex || 0);
    const px = 700 - cam * 0.42, py = 60 + Math.sin(t * 0.5) * 3;
    if (px > -70 && px < VW + 70) ctx.drawImage(icon, Math.round(px - icon.width * 0.9), Math.round(py - icon.height * 0.9), Math.round(icon.width * 1.8), Math.round(icon.height * 1.8));
  }

  function drawRegolith(ctx, t, cam) {
    const BAND = ['#6b6480', '#5f5875', '#544d6b', '#494360', '#3d3854', '#332e4a', '#2e2842'];
    for (let sx = 0; sx <= VW; sx += 2) {
      const wx = sx + cam;
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
    for (const r of RUINS) { const x = r.x - cam; if (x < -60 || x > VW + 60) continue; AH.blit(ctx, AH.S['ruin' + r.k], 0, x, groundY(r.x) + 2); }
    for (const r of OUT_ROCKS) {
      const x = r.x - cam; if (x < -24 || x > VW + 24) continue;
      AH.blit(ctx, AH.S['rock' + r.k], 0, x, groundY(r.x) + 2);
    }
  }

  function drawOutside(ctx, g, t, cam) {
    drawSpace(ctx, g, t, cam);
    drawRegolith(ctx, t, cam);

    // the house, standing on the regolith with light in the window
    const hx = OUT_SPOTS[0].x - cam;
    if (hx > -180 && hx < VW + 180) {
      const gy = groundY(OUT_SPOTS[0].x);
      X.blob(ctx, hx, gy + 2, 84, 6, '#241f36');
      AH.blit(ctx, AH.S.house, 1, hx, gy + 3);
      F.draw(ctx, 'MY HOUSE', hx - 1, gy - 52, '#ffe9a8', { center: true });
      // smoke out of the chimney, in fat stepped puffs
      for (let i = 0; i < 6; i++) {
        const f = ((t * 0.3 + i / 6) % 1);
        ctx.globalAlpha = (1 - f) * 0.45;
        X.blob(ctx, hx + 46 + Math.sin(f * 5 + i) * 8, gy - 98 - f * 56, 4 + f * 12, 3 + f * 10, '#6b6480');
      }
      ctx.globalAlpha = 1;
    }

    // the UFO, up on its bricks, bobbing because nothing here sits still
    const ux = OUT_SPOTS[1].x - cam;
    if (ux > -110 && ux < VW + 110) {
      const gy = groundY(OUT_SPOTS[1].x);
      X.blob(ctx, ux, gy + 1, 48, 5, '#241f36');
      AH.blit(ctx, AH.S.saucer, Math.floor(t * 3) % 2, ux, gy + 2 + Math.sin(t * 1.6) * 1);
      AH.blit(ctx, AH.S.flag, Math.floor(t * 4) % 2, ux + 86, groundY(OUT_SPOTS[1].x + 86) + 2);
    }
  }

  function rockEdge(ctx, x0, x1, y, dir, col, colD, amp) {
    for (let x = x0; x < x1; x += 4) {
      const h = 3 + Math.round(U.hash2(x, dir) * amp);
      X.rect(ctx, x, dir > 0 ? y : y - h, 4, h, col);
      X.rect(ctx, x, dir > 0 ? y + h - 1 : y - h, 4, 1, colD);
    }
  }

  function drawInside(ctx, g, t, cam) {
    X.rect(ctx, 0, 0, VW, VH, '#15111f');
    const wall = AH.S.wall;
    for (let y = CEIL; y < FLOOR + 4; y += wall.h) {
      for (let x = -cam - 40; x < VW + wall.w; x += wall.w) AH.blit(ctx, wall, 0, x, y);
    }
    // a crack he has been meaning to look at
    let kx = 70 - cam, ky = CEIL + 6;
    for (let i = 0; i < 20; i++) {
      const w = 3 - (i % 3);
      X.rect(ctx, kx, ky, w, 4, '#241f36');
      X.rect(ctx, kx + w, ky, 1, 4, '#5f5680');
      kx += Math.round(U.hash2(i, 5) * 5) - 2; ky += 4;
    }
    // the warm pool the monitor throws over that end of the room
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.055;
      X.dither(ctx, IN_SPOTS[0].x - cam - 80 + i * 9, CEIL + 4 + i * 7, 160 - i * 18, FLOOR - CEIL - i * 14, '#ffd39a', i % 2);
    }
    ctx.globalAlpha = 1;

    // the roof: the same rock in shadow, a heavy lintel course, and all the
    // things he has hung off it and forgotten about
    X.rect(ctx, 0, 0, VW, CEIL + 4, '#1b1628');
    ctx.globalAlpha = 0.55;
    for (let y = CEIL + 4 - wall.h; y > -wall.h; y -= wall.h) {
      for (let x = -cam - 40; x < VW + wall.w; x += wall.w) AH.blit(ctx, wall, 0, x, y);
    }
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.4; X.rect(ctx, 0, 0, VW, CEIL, '#0e0b16'); ctx.globalAlpha = 1;
    // a beam bolted across, with junk hanging off it
    X.rect(ctx, 0, CEIL - 16, VW, 7, '#5e6688');
    X.rect(ctx, 0, CEIL - 16, VW, 1, '#9aa3c4');
    X.rect(ctx, 0, CEIL - 10, VW, 1, '#39405e');
    for (let i = 0; i < 10; i++) {
      const x = 30 + i * 58 - cam; if (x < -20 || x > VW + 20) continue;
      X.rect(ctx, x, CEIL - 19, 6, 10, '#39405e');
      X.rect(ctx, x, CEIL - 19, 6, 1, '#9aa3c4');
    }
    const hang = [
      { x: 66, k: 0, L: 62 }, { x: 168, k: 1, L: 74 }, { x: 262, k: 2, L: 68 },
      { x: 336, k: 0, L: 80 }, { x: 404, k: 1, L: 58 }
    ];
    for (const h of hang) {
      const x = h.x - cam; if (x < -26 || x > VW + 26) continue;
      // they swing on their own, and much harder when you jump into them
      const kick = S.swing * (1 - Math.min(1, Math.abs(h.x - P.x) / 80)) * 7;
      const sw = Math.sin(t * 1.1 + h.x) * 2 + Math.sin(t * 11 + h.x) * kick;
      const yb = CEIL - 9 + h.L;
      for (let j = 0; j < h.L; j += 3) X.rect(ctx, x + sw * (j / h.L), CEIL - 9 + j, 2, 3, j % 6 ? '#241f36' : '#3a3450');
      if (h.k === 0) {                               // a coil of cable
        for (let j = 0; j < 4; j++) X.rect(ctx, x - 8 + sw, yb + j * 4, 17, 3, j % 2 ? '#3a3450' : '#4a4260');
      } else if (h.k === 1) {                        // a bundle of dried something
        for (let j = 0; j < 6; j++) X.rect(ctx, x - 6 + j * 2 + sw, yb, 2, 16 - Math.abs(j - 3) * 3, '#5a7a3a');
        X.rect(ctx, x - 7 + sw, yb - 1, 15, 3, '#8a5a3a');
      } else {                                       // a lamp that does not work
        X.rect(ctx, x - 6 + sw, yb, 13, 5, '#8e86a8');
        X.rect(ctx, x - 5 + sw, yb + 5, 11, 9, '#4a4260');
        X.rect(ctx, x - 3 + sw, yb + 7, 7, 3, '#2a2440');
      }
    }
    for (let x = 0; x < VW; x += 3) {
      const h = 4 + Math.round(U.hash2(x + cam, 11) * 9);
      X.rect(ctx, x, CEIL - 2, 3, h + 2, '#15111f');
      X.rect(ctx, x, CEIL + h - 1, 3, 1, '#332e4a');
    }
    for (let i = 0; i < 14; i++) {
      const wx = 6 + i * 34 + U.hash2(i, 41) * 18, x = wx - cam;
      if (x < -14 || x > VW + 14) continue;
      if (U.hash2(i, 55) > 0.72) continue;              // gaps, so it is not a comb
      const h = 6 + U.hash2(i, 5) * 30, w0 = 4 + U.hash2(i, 17) * 6;
      for (let j = 0; j < h; j++) {
        const w = Math.max(1, Math.round(w0 * (1 - j / h)));
        X.rect(ctx, x - w / 2, CEIL + 8 + j, w, 1, j > h - 4 ? '#0e0b16' : (j < 3 ? '#332e4a' : '#1e1930'));
      }
    }
    // one bare bulb, flickering because he wired it
    const bx = 210 - cam, flick = U.hash2((t * 8) | 0, 3) > 0.06;
    X.rect(ctx, bx, CEIL - 9, 1, 70, '#191320');
    X.rect(ctx, bx - 4, CEIL + 60, 9, 4, '#8e86a8');
    X.rect(ctx, bx - 3, CEIL + 64, 7, 8, flick ? '#ffe9a8' : '#6b6450');
    if (flick) {
      X.rect(ctx, bx - 2, CEIL + 65, 3, 3, '#ffffff');
      for (let i = 3; i >= 0; i--) {
        ctx.globalAlpha = 0.05;
        const w = 30 + i * 26;
        X.dither(ctx, bx - w / 2, CEIL + 68, w, FLOOR - CEIL - 68 - i * 4, '#ffe9a8', i % 2);
      }
      ctx.globalAlpha = 1;
    }

    // floor, then a plinth of cut stone under it
    const fl = AH.S.floor;
    for (let x = -cam - 40; x < VW + fl.w; x += fl.w) AH.blit(ctx, fl, 0, x, FLOOR);
    X.rect(ctx, 0, FLOOR + 13, VW, VH - FLOOR, '#241f36');
    for (let x = -(cam % 24) - 24; x < VW + 24; x += 24) {
      X.rect(ctx, x, FLOOR + 14, 22, 14, '#2a2440');
      X.rect(ctx, x, FLOOR + 14, 22, 1, '#3a3450');
      X.rect(ctx, x + 12, FLOOR + 30, 22, 14, '#262034');
      X.rect(ctx, x + 12, FLOOR + 30, 22, 1, '#332e4a');
    }
    // a rug, worn through
    const rx = 200 - cam;
    X.rect(ctx, rx - 62, FLOOR + 1, 124, 8, '#7a3f4a');
    X.rect(ctx, rx - 62, FLOOR + 1, 124, 2, '#9c5460');
    for (let i = 0; i < 12; i++) X.rect(ctx, rx - 58 + i * 10, FLOOR + 4, 6, 3, i % 2 ? '#5e2f38' : '#8a4854');

    // posters, taped crooked
    for (const p of POSTERS) {
      const x = p.x - cam; if (x < -30 || x > VW + 30) continue;
      AH.blit(ctx, AH.S['poster' + p.k], 0, x, p.y);
      X.rect(ctx, x - 8, p.y - 2, 16, 4, '#e8e05a');
    }
    // a tally of every world he has taken apart, scratched into the rock
    const tx = 300 - cam, kills = g.save.destroyed.filter(Boolean).length;
    if (tx > -60 && tx < VW + 60) {
      F.draw(ctx, 'WORLDS I ATE', tx, 152, '#8e86a8', { shadow: false });
      for (let i = 0; i < kills; i++) {
        const gx = tx + (i % 10) * 7, gy = 164 + ((i / 10) | 0) * 12;
        X.rect(ctx, gx, gy, 2, 9, '#c9bce8');
        if (i % 5 === 4) X.rect(ctx, gx - 26, gy + 3, 30, 2, '#c9bce8');
      }
      if (!kills) F.draw(ctx, 'NONE YET', tx, 164, '#5f5680', { shadow: false });
    }
    // hooks with tools on them, and a shelf of rocks he is proud of
    const hx = 150 - cam;
    if (hx > -40 && hx < VW + 40) {
      X.rect(ctx, hx - 40, 140, 62, 2, '#4a4260');
      for (let i = 0; i < 3; i++) {
        X.rect(ctx, hx - 34 + i * 21, 142, 2, 6, '#8e86a8');
        X.rect(ctx, hx - 38 + i * 21, 148, 11, 15, ['#8e86a8', '#c46a3a', '#5ad0e8'][i]);
        X.rect(ctx, hx - 38 + i * 21, 148, 11, 2, '#c9bce8');
      }
    }
    const shx = 366 - cam;
    if (shx > -40 && shx < VW + 40) {
      X.rect(ctx, shx - 28, 166, 56, 3, '#7a5a3a');
      X.rect(ctx, shx - 28, 166, 56, 1, '#9c7a52');
      X.rect(ctx, shx - 26, 169, 3, 4, '#5a4028'); X.rect(ctx, shx + 23, 169, 3, 4, '#5a4028');
      const shiny = [D.M.gold, D.M.emerald, D.M.iron];
      for (let i = 0; i < 3; i++) PD.art.oreChip(ctx, shiny[i], shx - 24 + i * 17, 155, 11);
    }

    // the door out, a rough arch with rubber strips
    const dx = IN_SPOTS[2].x - cam;
    X.rect(ctx, dx - 26, CEIL + 10, 52, FLOOR - CEIL - 10, '#120e1c');
    for (let i = 0; i < 8; i++) {
      const cx2 = dx - 24 + i * 6, sw = Math.sin(t * 1.2 + i * 0.6) * 1.5;
      const len = 46 + (i % 3) * 10;
      for (let j = 0; j < len; j += 2) X.rect(ctx, cx2 + sw * (j / len), CEIL + 14 + j, 4, 2, j % 4 ? '#3f3856' : '#4a4260');
      X.rect(ctx, cx2, CEIL + 14, 4, 2, '#8e86a8');
    }
    rockEdge(ctx, (dx - 30) | 0, (dx + 30) | 0, CEIL + 10, 1, '#4a4260', '#241f36', 8);
    X.rect(ctx, dx - 40, CEIL + 20, 30, 14, '#7a5a3a');
    X.rect(ctx, dx - 40, CEIL + 20, 30, 2, '#9c7a52');
    F.draw(ctx, 'OWT', dx - 25, CEIL + 24, '#ffe9a8', { center: true });

    // the mess
    for (const p of IN_PROPS) {
      const x = p.x - cam; if (x < -50 || x > VW + 50) continue;
      const s = AH.S[p.s];
      if (!s) continue;
      if (p.s === 'tape') {
        X.rect(ctx, x - 16, FLOOR - 14, 32, 14, '#5a4a3a');
        X.rect(ctx, x - 16, FLOOR - 14, 32, 2, '#7a6a52');
        AH.blit(ctx, s, Math.floor(t * 4) % 2, x, FLOOR - 14);
        // a scrolling marquee: the window is 16 characters, the song is not,
        // so the title crawls through it instead of being chopped in half
        const song = D.MIX[Math.floor(t * 0.09) % D.MIX.length] + '   *   ';
        const off = Math.floor(t * 5) % song.length;
        const note = (song + song).substr(off, 16);
        F.draw(ctx, note, x, FLOOR - 44 + Math.sin(t * 2) * 2, '#ff8ad8', { center: true });
        continue;
      }
      AH.blit(ctx, s, 0, x, FLOOR + 1 - (p.lift || 0));
    }
    // the desk, its screen lit, and a crate for a chair
    const px2 = IN_SPOTS[0].x - cam;
    AH.blit(ctx, AH.S.desk, 1, px2, FLOOR + 1);
    X.rect(ctx, px2 + 34, FLOOR - 18, 20, 18, '#6b4530');
    X.rect(ctx, px2 + 34, FLOOR - 18, 20, 2, '#8a5a3a');
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.07;
      X.dither(ctx, px2 - 30 + i * 6, FLOOR - 8 + i * 2, 60 - i * 12, 8, '#8affa0', i % 2);
    }
    ctx.globalAlpha = 1;

    // the cheese, until he takes it
    if (!g.save.pet) {
      const cx3 = RAT_SPOT.x + 34 - cam;
      AH.blit(ctx, AH.S.cheese, 0, cx3, FLOOR + 1);
    }
    // drips off the roof
    for (const d of DRIPS) {
      const x = d.x - cam; if (x < -4 || x > VW + 4) continue;
      const f = d.t / 3.4;
      if (f < 0.7) X.rect(ctx, x, CEIL + 20 + f / 0.7 * (FLOOR - CEIL - 26), 1, 3, '#8affa0');
      else if (f < 0.78) X.rect(ctx, x - 3, FLOOR - 3, 7, 1, '#8affa0');
    }
  }

  /* He is enormous, he bounces, and he squashes when he lands. */
  function drawRat(ctx, g, cam, t) {
    if (!g.save.pet && S.scene !== 'in') return;
    const x = Math.round(rat.x - cam);
    if (x < -40 || x > VW + 40) return;
    const spr = g.save.pet ? AH.S.ratFed : AH.S.rat;
    const bounce = g.save.pet ? Math.abs(Math.sin(rat.hop)) * 9 : 0;
    const sq = 1 + Math.cos(rat.hop * 2) * 0.14 * (bounce > 0.5 ? 1 : 0);
    const f = rat.chew > 0 ? 1 : (Math.sin(t * 3) > 0 ? 0 : 1);
    ctx.save();
    ctx.translate(x, Math.round(rat.y + 2 - bounce));
    ctx.scale((rat.face < 0 ? -1 : 1) / sq, sq);
    ctx.drawImage(spr.frames[f], -spr.ox, -spr.oy, spr.w, spr.h);
    ctx.restore();
    if (g.save.pet && U.chance(0.02)) FX.text(rat.x, rat.y - 34, U.pick(['SQUEAK', 'BRENDA', 'MORE CHEESE']), '#ff9ecb', 0);
  }

  /* A wooden sign that pops up when you are close enough to press E. */
  function prompt(ctx, g, t, cam) {
    const s = P.near;
    if (!s) return;
    const x = Math.round(s.x - cam);
    const lift = s.id === 'ufo' ? 74 : (s.id === 'door' ? 130 : 60);
    const y = Math.round(groundY(s.x) - lift + Math.sin(t * 5) * 2);
    const w = Math.max(F.width(s.name, 1), F.width(s.sub, 1)) + 18;
    X.rect(ctx, x - w / 2 + 2, y + 2, w, 26, 'rgba(6,3,14,0.5)');
    X.rect(ctx, x - w / 2, y, w, 26, '#7a5a3a');
    X.rect(ctx, x - w / 2, y, w, 2, '#9c7a52');
    X.rect(ctx, x - w / 2, y + 24, w, 2, '#4a3020');
    F.draw(ctx, s.name, x, y + 4, '#ffe9a8', { center: true });
    F.draw(ctx, s.sub, x, y + 14, '#c9a06a', { center: true });
    const kb = Math.round(Math.abs(Math.sin(t * 5)) * 2);
    X.rect(ctx, x - 6, y - 13 - kb, 12, 12, '#e8dfc4');
    X.rect(ctx, x - 6, y - 13 - kb, 12, 1, '#ffffff');
    X.rect(ctx, x - 6, y - 2 - kb, 12, 1, '#a89b78');
    F.draw(ctx, 'E', x, y - 10 - kb, '#241f16', { center: true, shadow: false });
  }

  function draw(ctx, g, t) {
    const cam = Math.round(g.intCam);
    if (S.scene === 'out') drawOutside(ctx, g, t, cam);
    else drawInside(ctx, g, t, cam);

    for (const m of MOTES) {
      const x = ((m.x * roomW() + t * m.sp) % roomW()) - cam; if (x < -4 || x > VW + 4) continue;
      ctx.fillStyle = '#c9bce8'; ctx.globalAlpha = 0.12 + 0.22 * Math.sin(t * 2 + m.x * 40);
      ctx.fillRect(x | 0, (m.y + Math.sin(t * 0.7 + m.x * 8) * 4) | 0, m.r > 0.7 ? 2 : 1, m.r > 0.7 ? 2 : 1);
    }
    ctx.globalAlpha = 1;

    drawRat(ctx, g, cam, t);
    drawPlayer(ctx, g, cam, t);
    if (S.sleep <= 0) prompt(ctx, g, t, cam);

    // a foreground lip of rock so the scene has depth
    for (let x = -8; x < VW + 8; x += 6) {
      const h = 6 + Math.round(U.hash2(x + cam * 0.2, 11) * 8);
      X.rect(ctx, x, VH - h, 6, h, '#1a1526');
      X.rect(ctx, x, VH - h, 6, 1, '#241f36');
    }

    if (S.sleep > 0) {
      ctx.globalAlpha = Math.min(0.86, (2.2 - Math.abs(S.sleep - 1.1) * 2) * 0.9);
      X.rect(ctx, 0, 0, VW, VH, '#0b0818');
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const f = ((S.t * 0.7 + i / 3) % 1);
        F.draw(ctx, 'Z', VW / 2 + 18 + f * 26, VH / 2 - 10 - f * 34, '#c9bce8', { center: true, scale: 1 + (i === 0 ? 1 : 0) });
      }
    }

    if (UI.msgT > 0) {
      const w = F.width(UI.msg, 1) + 16;
      ctx.globalAlpha = Math.min(1, UI.msgT);
      X.rect(ctx, VW / 2 - w / 2, VH - 42, w, 15, '#7a5a3a');
      X.rect(ctx, VW / 2 - w / 2, VH - 42, w, 2, '#9c7a52');
      F.draw(ctx, UI.msg, VW / 2, VH - 38, '#ffe9a8', { center: true });
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
      ctx.translate(x, y - 14);
      ctx.rotate(P.rollA);
      const s = skin.alienRoll;
      ctx.drawImage(s.frames[0], -s.ox, -s.oy + 14, s.w, s.h);
      ctx.restore();
      if (U.chance(0.5)) FX.dust(P.x - P.face * 6, P.y, 1, '#8e86a8', 8);
      return;
    }
    const set = air ? skin.alienFly : (walking ? skin.alienWalk : skin.alien);
    const frame = air ? Math.floor(t * 8) % 2 : (walking ? Math.floor(P.walk * 1.1) % 4 : (Math.sin(t * 1.3) > 0.94 ? 4 : Math.floor(t * 7) % 4));
    // BOUNCY: a deep squash on landing, a stretch on the way up, and a little
    // extra wobble the whole time so nothing in this game is ever rigid.
    const wob = walking ? Math.sin(P.walk * 2.2) * 0.05 : Math.sin(t * 3.4) * 0.022;
    const sq = P.land > 0 ? 1 + P.land * 1.5 : (air ? (P.vy < -60 ? 0.84 : (P.vy > 90 ? 1.1 : 1)) : 1 + wob);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(P.face < 0 ? -sq : sq, 1 / sq);
    ctx.drawImage(set.frames[frame], -set.ox, -set.oy, set.w, set.h);
    ctx.restore();
    if (walking && !air && U.chance(0.2)) FX.dust(P.x - P.face * 5, P.y, 1, '#8e86a8', 10);
  }

  PD.home = { enter, update, draw, closeScene, touchMode, leaveDesk, say, P, UI, S, groundY, ROOM_W: OUT_W, SPOTS };
})(window.PD);
