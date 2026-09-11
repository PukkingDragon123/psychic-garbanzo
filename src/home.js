/* HOME.

   Two places. OUTSIDE is a small round moon -- a ball a couple of hundred
   pixels across, floating whole in the middle of the screen with stars either
   side of it, your rock house on top and your dumb UFO parked alongside. You
   walk over the curve of it and the horizon falls away at both ends.

   INSIDE is one very small room: the stolen computer, and a brain in a jar of
   acid that knows everything and will sell you some of it. Nothing else except
   the mess. No bed. Walk to the door and press E to go through, either way.

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
  /* THE MOON. Its centre is a long way below the bottom of the screen, so what
     you get is the top of it -- but you are standing much closer to it than a
     toy globe: the curve is gentle, the limb runs off the bottom corners of
     the screen, and the surface is LUMPY rather than a clean arc. It is a
     chipped rock, not a ball. Outside is exactly one screen wide and never
     scrolls -- the moon is an object you look at, not a corridor. */
  const MOON = { cx: 240, cy: 960, r: 820 };
  const OUT_W = 480, IN_W = 232;
  const WALK = 150;                  // how far round the curve he can get
  const FLOOR = 216;                 // the room floor, inside
  const CEIL = 124;                  // the underside of the rock roof, inside
  const GRAV = 300;                  // low: everything here is bouncy

  const S = { scene: 'out', t: 0, ratSeen: 0, sleep: 0, swing: 0 };
  let g0 = null;                     // the running game, for view() between frames

  function roomW() { return S.scene === 'out' ? OUT_W : IN_W; }
  /* A room narrower than the screen sits in the middle of it. */
  function camWant() {
    const w = roomW();
    if (w <= VW) return (w - VW) / 2;
    return U.clamp(P.x - VW / 2, 0, w - VW);
  }
  function bounds() {
    return S.scene === 'out' ? [MOON.cx - WALK, MOON.cx + WALK] : [20, IN_W - 20];
  }

  /* Flat indoors. Outside it is the top of a big circle plus a stack of
     wobbles, rasterised to whole pixels so the ground he stands on is exactly
     the ground you can see. The wobbles are what stop it being a ball: ridges,
     a dip and a shoulder, all deterministic. */
  function lumpAt(x) {
    return Math.sin(x * 0.0131 + 0.4) * 6
      + Math.sin(x * 0.0327 + 1.7) * 3.5
      + Math.sin(x * 0.0713 + 2.9) * 2;
  }
  function groundY(x) {
    if (S.scene === 'in') return FLOOR;
    const dx = x - MOON.cx;
    if (Math.abs(dx) >= MOON.r) return 1e4;
    return Math.round(MOON.cy - Math.sqrt(MOON.r * MOON.r - dx * dx) - lumpAt(x));
  }
  /* The slope under his feet, for dust and for standing on a hill. */
  function slopeAt(x) {
    return (groundY(x + 3) - groundY(x - 3)) / 6;
  }

  const P = {
    x: 240, y: FLOOR, vx: 0, vy: 0, face: 1, walk: 0,
    near: null, target: null, autoUse: null, lock: 0,
    roll: 0, rollA: 0, land: 0, air: 0, hop: 0
  };
  const UI = { mode: null, msg: '', msgT: 0 };

  /* ------------------------------------------------------------------ spots */
  const OUT_SPOTS = [
    { id: 'door', x: 172, r: 38, name: 'THE ROCK HOUSE', sub: 'GO INSIDE' },
    { id: 'ufo', x: 320, r: 42, name: 'YOUR DUMB UFO', sub: 'GO AND HIT A PLANET' }
  ];
  const IN_SPOTS = [
    { id: 'pc', x: 40, r: 32, name: 'THE COMPUTER', sub: 'ABAY IS ON IT' },
    { id: 'brain', x: 146, r: 34, name: 'THE BRAIN IN THE JAR', sub: 'IT KNOWS THINGS. BUY SOME' },
    { id: 'exit', x: 212, r: 22, name: 'THE DOOR', sub: 'GO OUTSIDE' }
  ];
  const RAT_SPOT = { id: 'rat', x: 76, r: 26, name: 'A VERY FAT RAT', sub: 'GIVE HIM THE CHEESE' };
  const SPOTS = OUT_SPOTS;                    // game.js docks you next to the UFO

  /* --------------------------------------------------------------- scenery */
  const OUT_ROCKS = [];
  for (let i = 0; i < 22; i++) OUT_ROCKS.push({ x: MOON.cx + (U.hash2(i, 3) * 2 - 1) * 244, k: (U.hash2(i, 9) * 3) | 0 });
  const CRATERS = [];
  for (let i = 0; i < 14; i++) CRATERS.push({ x: MOON.cx + (U.hash2(i, 21) * 2 - 1) * 240, r: 5 + U.hash2(i, 33) * 15 });
  const RUINS = [{ x: 56, k: 2 }, { x: 428, k: 1 }];
  const MOTES = [];
  for (let i = 0; i < 26; i++) MOTES.push({ x: U.hash2(i, 61), y: 60 + U.hash2(i, 67) * 150, r: U.hash2(i, 71), sp: 2 + U.hash2(i, 73) * 7 });

  /* Inside: the mess, and where each piece of it lies. */
  const IN_PROPS = [
    { s: 'fridge', x: 100 },
    { s: 'junk0', x: 8 },
    { s: 'junk1', x: 72 },
    { s: 'junk2', x: 226 },
    { s: 'litter0', x: 26 },
    { s: 'litter1', x: 60 },
    { s: 'litter2', x: 134 },
    { s: 'litter3', x: 104 },
    { s: 'litter0', x: 190 },
    { s: 'litter2', x: 84 },
    { s: 'tape', x: 76, lift: 13 }
  ];
  const POSTERS = [{ k: 0, x: 22, y: 148 }, { k: 1, x: 64, y: 144 }, { k: 2, x: 196, y: 152 }];
  const DRIPS = [{ x: 130, t: 0 }, { x: 34, t: 1.7 }];

  /* ---------------------------------------------------------------- the rat */
  const rat = { x: RAT_SPOT.x, y: FLOOR, vx: 0, t: 0, face: -1, hop: 0, chew: 0 };

  let star = null;

  function enter(g, atX) {
    g0 = g;
    S.scene = 'out';
    place(g, atX === undefined ? OUT_SPOTS[1].x : atX);
    if (!star) {
      star = [];
      for (let i = 0; i < 220; i++) star.push({ x: U.hash2(i, 11), y: U.hash2(i, 17), b: U.hash2(i, 23) });
    }
  }

  function place(g, atX) {
    const bd = bounds();
    P.x = U.clamp(atX, bd[0], bd[1]);
    P.y = groundY(P.x); P.vx = 0; P.vy = 0;
    P.target = null; P.autoUse = null; P.roll = 0; P.hop = 0;
    P.lock = 0.28;
    UI.mode = null;
    g.intCam = camWant();
    rat.x = g.save.pet ? P.x - 30 : RAT_SPOT.x;
    rat.y = groundY(rat.x);
  }

  function goIn(g) {
    S.scene = 'in';
    place(g, IN_SPOTS[2].x - 26);
    A.sfx.tone(150, { type: 'square', to: 90, dur: 0.2, vol: 0.08 });
    if (!g.save.pet && !S.ratSeen) {
      S.ratSeen = 1;
      say('THERE IS A VERY FAT RAT EATING YOUR CHEESE.');
      A.sfx.tone(1600, { type: 'square', to: 700, dur: 0.18, vol: 0.07 });
    }
  }
  function goOut(g) {
    S.scene = 'out';
    place(g, OUT_SPOTS[0].x + 34);
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
    if (FX.wipeActive()) return;
    // where on the screen the iris should close on: the thing he pressed E at
    const at = toScreen(s.x - Math.round(g.intCam), groundY(s.x) - 20);
    const fx2 = U.clamp(at.x, 0, VW), fy2 = U.clamp(at.y, 0, VH);
    if (s.id === 'door') { goIn(g); return; }
    if (s.id === 'exit') { goOut(g); return; }
    if (s.id === 'ufo') { A.sfx.dock(); g.openChart(); return; }
    if (s.id === 'pc') {
      P.lock = 1;
      g.wipeTo(fx2, fy2, '#1b2430', () => { g.state = 'desk'; PD.desk.enter(g); });
      return;
    }
    if (s.id === 'brain') {
      P.lock = 1;
      g.wipeTo(fx2, fy2, '#12503a', () => { PD.mind.open(g); });
      return;
    }
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

  function leaveDesk(g) {
    g.state = 'home';
    S.scene = 'in';
    P.lock = 0.32;
    P.x = IN_SPOTS[0].x + 26; P.y = groundY(P.x); P.vx = 0; P.vy = 0; P.face = -1;
    g.intCam = camWant();
  }

  /* ---------------------------------------------------------------- update */
  function update(dt, g) {
    const IN = PD.input;
    g0 = g;
    S.t += dt;
    if (FX.wipeActive()) { view(dt); return; }
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

    if (P.lock <= 0 && m.leftPressed) {
      const wx = fromScreenX(m.x) + g.intCam;
      let hit = null;
      for (const s of spots(g)) if (Math.abs(s.x - wx) < s.r) hit = s;
      const bd0 = bounds();
      P.target = hit ? hit.x : U.clamp(wx, bd0[0], bd0[1]);
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
    const bd = bounds();
    P.x = U.clamp(P.x + P.vx * dt, bd[0], bd[1]);
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
    const roof = S.scene === 'in' ? CEIL + 14 : -600;
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
        if (P.rig) PD.rig.land(P.rig, U.clamp(P.vy / 260, 0.4, 1));
        FX.puff(P.x, P.y, 4, '#b8aed0', U.clamp(P.vy / 240, 0.6, 1.3));
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

    g.intCam = U.damp(g.intCam, camWant(), 0.16, dt);
    view(dt);                        // the zoom window follows him
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
    const want = P.x - P.face * 26;
    const d = want - rat.x;
    if (Math.abs(d) > 14) {
      rat.vx = U.damp(rat.vx, U.clamp(d * 2.6, -120, 120), 0.14, dt);
      rat.face = Math.sign(rat.vx) || rat.face;
    } else rat.vx = U.damp(rat.vx, 0, 0.3, dt);
    const rbd = bounds();
    rat.x = U.clamp(rat.x + rat.vx * dt, rbd[0] - 16, rbd[1] + 16);
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
      const sx = s.x * VW;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.b * 30);
      ctx.fillStyle = s.b > 0.86 ? '#ffe9a8' : '#ffffff';
      ctx.globalAlpha = 0.22 + s.b * 0.6 * tw;
      ctx.fillRect(sx | 0, (s.y * VH) | 0, 1, 1);
    }
    ctx.globalAlpha = 1;
    // the dead Celestial your moon was chipped off, adrift out to one side
    const sk = AH.S.skull;
    ctx.globalAlpha = 0.6;
    ctx.drawImage(sk.frames[0], 6, 12 + Math.round(Math.sin(t * 0.4) * 2), Math.round(sk.w * 0.85), Math.round(sk.h * 0.85));
    ctx.globalAlpha = 1;
    // the world you are about to ruin
    const icon = g.navIcon(g.save.bodyIndex || 0);
    const px = 404, py = 52 + Math.sin(t * 0.5) * 3;
    ctx.drawImage(icon, Math.round(px - icon.width * 0.8), Math.round(py - icon.height * 0.8), Math.round(icon.width * 1.6), Math.round(icon.height * 1.6));
    void cam;
  }

  /* THE BALL. Drawn as a stack of two-pixel columns hung off the curve, so
     the silhouette IS the circle and the crust bands follow it round. Nothing
     smooth anywhere: every column is a whole number of pixels tall. */
  function drawBall(ctx, t, cam) {
    const BAND = ['#9a92b4', '#8e86a8', '#7a7290', '#6b6480', '#5a5470', '#4a4460', '#3a3450', '#2e2842', '#241f36', '#1b172a'];
    const DEPTH = [0, 3, 9, 17, 27, 40, 56, 76, 100, 130];
    // an ordered 2x2 dither, not noise: the terminator wants a clean checker
    const DITH = [[0.25, 0.75], [0.75, 0.25]];
    const x0 = Math.ceil(MOON.cx - MOON.r), x1 = Math.floor(MOON.cx + MOON.r);
    for (let sx = x0 - (x0 % 2); sx <= x1; sx += 2) {
      const wx = sx + cam + 1;
      const y = groundY(wx);
      if (y > VH) continue;
      /* The star is off to the left, so the crust is pale on that limb and
         nearly black on the other. The step between shades is DITHERED by a
         stable per-column hash, which is how you get a curved, shaded ball
         out of nothing but flat runs of colour. */
      const nx = (wx - MOON.cx) / MOON.r;
      const lv = U.clamp(1.55 - nx * 1.15 - Math.abs(nx) * 0.5, 0, 2.2);
      const frac = lv % 1;
      const base = 1 - Math.floor(lv);
      // the dither is per band as well as per column, so the terminator breaks
      // up into a checker instead of banding the ball into vertical stripes
      const dcol = DITH[(sx >> 1) & 1];
      const offAt = (k) => U.clamp(base - (frac > dcol[k & 1] ? 1 : 0), -1, BAND.length - 1);
      // the strata thicken with depth, so the whole visible body of the ball
      // is layered rather than one flat mass under a thin crust
      for (let i = 0; i < BAND.length; i++) {
        const y0 = y + DEPTH[i];
        const h = i === BAND.length - 1 ? VH - y0 : DEPTH[i + 1] - DEPTH[i];
        if (h <= 0) continue;
        X.rect(ctx, sx, y0, 2, h, BAND[U.clamp(i + offAt(i), 0, BAND.length - 1)]);
      }
      const off = offAt(0);
      X.rect(ctx, sx, y, 2, 2, BAND[U.clamp(off, 0, 3)]);
      // grit and boulders half-buried in the crust, stable frame to frame
      if (U.hash2(sx, 7) > 0.8) X.rect(ctx, sx, y + 5 + ((U.hash2(sx, 9) * 26) | 0), 2, 2, BAND[U.clamp(1 + off, 0, 9)]);
      if (U.hash2(sx, 29) > 0.94) {
        const by = y + 12 + ((U.hash2(sx, 31) * 40) | 0);
        X.rect(ctx, sx - 2, by, 6, 4, BAND[U.clamp(2 + off, 0, 9)]);
        X.rect(ctx, sx - 2, by, 6, 1, BAND[U.clamp(off, 0, 9)]);
      }
    }
    // craters, sunk into the curve
    for (const c of CRATERS) {
      const x = c.x - cam;
      const gy = groundY(c.x);
      if (gy > VH) continue;
      X.blob(ctx, x, gy + c.r * 0.3, c.r, c.r * 0.32, '#453e5e');
      X.blob(ctx, x, gy + c.r * 0.08, c.r * 0.9, c.r * 0.16, '#8e86a8');
    }
    for (const r of RUINS) { const gy = groundY(r.x); if (gy < VH) AH.blit(ctx, AH.S['ruin' + r.k], 0, r.x - cam, gy + 2); }
    for (const r of OUT_ROCKS) { const gy = groundY(r.x); if (gy < VH) AH.blit(ctx, AH.S['rock' + r.k], 0, r.x - cam, gy + 2); }
    // a rim of dust sitting on the skyline, thickest out at the ends where the
    // ground is falling away from you
    ctx.globalAlpha = 0.3;
    for (let sx = x0; sx <= x1; sx += 4) {
      const gy = groundY(sx + cam);
      if (gy > VH) continue;
      const edge = Math.abs(sx - MOON.cx) / 240;
      if (U.hash2(sx, 3) > 0.55 - edge * 0.4) X.rect(ctx, sx, gy - 2 - ((U.hash2(sx, 5) * 3) | 0), 2, 2, '#6b6480');
    }
    ctx.globalAlpha = 1;
    void t;
  }

  function drawOutside(ctx, g, t, cam) {
    drawSpace(ctx, g, t, cam);
    drawBall(ctx, t, cam);

    // the house, standing on the curve with light in the window
    const hx = OUT_SPOTS[0].x - cam;
    const gy = groundY(OUT_SPOTS[0].x);
    X.blob(ctx, hx, gy + 2, 46, 4, '#241f36');
    AH.blit(ctx, AH.S.house, 1, hx, gy + 3);
    F.draw(ctx, 'MY HOUSE', hx - 1, gy - 82, '#ffe9a8', { center: true });
    // smoke out of the chimney, in fat stepped puffs
    for (let i = 0; i < 6; i++) {
      const f = ((t * 0.3 + i / 6) % 1);
      ctx.globalAlpha = (1 - f) * 0.45;
      X.blob(ctx, hx + 27 + Math.sin(f * 5 + i) * 7, gy - 70 - f * 44, 3 + f * 9, 2 + f * 8, '#6b6480');
    }
    ctx.globalAlpha = 1;

    // the UFO, up on its bricks, bobbing because nothing here sits still
    const ux = OUT_SPOTS[1].x - cam;
    const uy = groundY(OUT_SPOTS[1].x);
    X.blob(ctx, ux, uy + 1, 40, 4, '#241f36');
    AH.blit(ctx, AH.S.saucer, Math.floor(t * 3) % 2, ux, uy + 2 + Math.sin(t * 1.6) * 1);
    const fx = OUT_SPOTS[1].x + 54;
    AH.blit(ctx, AH.S.flag, Math.floor(t * 4) % 2, fx - cam, groundY(fx) + 2);
    const svx = OUT_SPOTS[0].x - 66;
    AH.blit(ctx, AH.S.survey, 0, svx - cam, groundY(svx) + 2);
  }

  function rockEdge(ctx, x0, x1, y, dir, col, colD, amp) {
    for (let x = x0; x < x1; x += 4) {
      const h = 3 + Math.round(U.hash2(x, dir) * amp);
      X.rect(ctx, x, dir > 0 ? y : y - h, 4, h, col);
      X.rect(ctx, x, dir > 0 ? y + h - 1 : y - h, 4, 1, colD);
    }
  }

  function drawInside(ctx, g, t, cam) {
    /* The room is a hole knocked in a moon. Solid rock fills the screen and
       the room is clipped out of the middle of it, which is what makes it read
       as SMALL: you can see the walls end. */
    X.rect(ctx, 0, 0, VW, VH, '#0c0916');
    const wall = AH.S.wall;
    ctx.globalAlpha = 0.32;
    for (let y = -wall.h; y < VH + wall.h; y += wall.h) {
      for (let x = -20; x < VW + wall.w; x += wall.w) AH.blit(ctx, wall, 0, x, y);
    }
    ctx.globalAlpha = 1;
    for (let x = 0; x < VW; x += 3) {
      if (U.hash2(x, 3) > 0.7) X.rect(ctx, x, 0, 3, VH, 'rgba(4,2,10,0.35)');
    }

    /* The room is only 92 pixels tall and 232 across. Clipping to exactly that
       is what sells it: rock above, rock either side, and a little lit box in
       the middle of a dead moon. */
    const rx0 = -cam, rw = IN_W, ry0 = CEIL - 26;
    ctx.save();
    ctx.beginPath(); ctx.rect(rx0, ry0, rw, VH - ry0); ctx.clip();

    X.rect(ctx, rx0, ry0, rw, VH - ry0, '#15111f');
    for (let y = CEIL; y < FLOOR + 4; y += wall.h) {
      for (let x = -cam - 40; x < VW + wall.w; x += wall.w) AH.blit(ctx, wall, 0, x, y);
    }
    // a crack he has been meaning to look at
    let kx = 40 - cam, ky = CEIL + 6;
    for (let i = 0; i < 20; i++) {
      const w = 3 - (i % 3);
      X.rect(ctx, kx, ky, w, 4, '#241f36');
      X.rect(ctx, kx + w, ky, 1, 4, '#5f5680');
      kx += Math.round(U.hash2(i, 5) * 5) - 2; ky += 4;
    }
    // the warm pool the monitor throws over that end of the room
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.055;
      X.dither(ctx, IN_SPOTS[0].x - cam - 54 + i * 7, CEIL + 4 + i * 5, 108 - i * 14, FLOOR - CEIL - i * 10, '#ffd39a', i % 2);
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
      const x = 14 + i * 30 - cam; if (x < -20 || x > VW + 20) continue;
      X.rect(ctx, x, CEIL - 19, 6, 10, '#39405e');
      X.rect(ctx, x, CEIL - 19, 6, 1, '#9aa3c4');
    }
    const hang = [
      { x: 22, k: 0, L: 26 }, { x: 74, k: 1, L: 34 }, { x: 116, k: 2, L: 28 },
      { x: 160, k: 0, L: 38 }, { x: 214, k: 1, L: 24 }
    ];
    for (const h of hang) {
      const x = h.x - cam; if (x < -26 || x > VW + 26) continue;
      // they swing on their own, and much harder when you jump into them
      const kick = S.swing * (1 - Math.min(1, Math.abs(h.x - P.x) / 50)) * 7;
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
      const wx = 4 + i * 17 + U.hash2(i, 41) * 9, x = wx - cam;
      if (x < -14 || x > VW + 14) continue;
      if (U.hash2(i, 55) > 0.72) continue;              // gaps, so it is not a comb
      const h = 6 + U.hash2(i, 5) * 30, w0 = 4 + U.hash2(i, 17) * 6;
      for (let j = 0; j < h; j++) {
        const w = Math.max(1, Math.round(w0 * (1 - j / h)));
        X.rect(ctx, x - w / 2, CEIL + 8 + j, w, 1, j > h - 4 ? '#0e0b16' : (j < 3 ? '#332e4a' : '#1e1930'));
      }
    }
    // one bare bulb, flickering because he wired it
    const bx = 88 - cam, flick = U.hash2((t * 8) | 0, 3) > 0.06;
    X.rect(ctx, bx, CEIL - 9, 1, 30, '#191320');
    X.rect(ctx, bx - 4, CEIL + 20, 9, 4, '#8e86a8');
    X.rect(ctx, bx - 3, CEIL + 24, 7, 8, flick ? '#ffe9a8' : '#6b6450');
    if (flick) {
      X.rect(ctx, bx - 2, CEIL + 25, 3, 3, '#ffffff');
      for (let i = 3; i >= 0; i--) {
        ctx.globalAlpha = 0.05;
        const w = 26 + i * 22;
        X.dither(ctx, bx - w / 2, CEIL + 30, w, FLOOR - CEIL - 30 - i * 3, '#ffe9a8', i % 2);
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
    const rx = 96 - cam;
    X.rect(ctx, rx - 42, FLOOR + 1, 84, 8, '#7a3f4a');
    X.rect(ctx, rx - 42, FLOOR + 1, 84, 2, '#9c5460');
    for (let i = 0; i < 8; i++) X.rect(ctx, rx - 38 + i * 10, FLOOR + 4, 6, 3, i % 2 ? '#5e2f38' : '#8a4854');

    // posters, taped crooked
    for (const p of POSTERS) {
      const x = p.x - cam; if (x < -30 || x > VW + 30) continue;
      AH.blit(ctx, AH.S['poster' + p.k], 0, x, p.y);
      X.rect(ctx, x - 8, p.y - 2, 16, 4, '#e8e05a');
    }
    // a tally of every world he has taken apart, scratched into the rock
    const tx = 96 - cam, kills = g.save.destroyed.filter(Boolean).length;
    {
      F.draw(ctx, 'WORLDS I ATE', tx, 138, '#8e86a8', { shadow: false });
      for (let i = 0; i < kills; i++) {
        const gx = tx + (i % 10) * 7, gy = 150 + ((i / 10) | 0) * 11;
        X.rect(ctx, gx, gy, 2, 8, '#c9bce8');
        if (i % 5 === 4) X.rect(ctx, gx - 26, gy + 3, 30, 2, '#c9bce8');
      }
      if (!kills) F.draw(ctx, 'NONE YET', tx, 150, '#5f5680', { shadow: false });
    }
    // hooks with tools on them, and a shelf of rocks he is proud of
    const hx = 22 - cam;
    {
      X.rect(ctx, hx - 12, 146, 54, 2, '#4a4260');
      for (let i = 0; i < 3; i++) {
        X.rect(ctx, hx - 6 + i * 19, 148, 2, 5, '#8e86a8');
        X.rect(ctx, hx - 10 + i * 19, 153, 10, 13, ['#8e86a8', '#c46a3a', '#5ad0e8'][i]);
        X.rect(ctx, hx - 10 + i * 19, 153, 10, 2, '#c9bce8');
      }
    }
    const shx = 174 - cam;
    {
      X.rect(ctx, shx - 26, 176, 52, 3, '#7a5a3a');
      X.rect(ctx, shx - 26, 176, 52, 1, '#9c7a52');
      X.rect(ctx, shx - 24, 179, 3, 4, '#5a4028'); X.rect(ctx, shx + 21, 179, 3, 4, '#5a4028');
      const shiny = [D.M.gold, D.M.emerald, D.M.iron];
      for (let i = 0; i < 3; i++) PD.art.oreChip(ctx, shiny[i], shx - 22 + i * 16, 165, 11);
    }

    // the door out, a rough arch with rubber strips
    const dx = IN_SPOTS[2].x - cam;
    X.rect(ctx, dx - 20, CEIL + 12, 40, FLOOR - CEIL - 12, '#120e1c');
    for (let i = 0; i < 7; i++) {
      const cx2 = dx - 18 + i * 5, sw = Math.sin(t * 1.2 + i * 0.6) * 1.5;
      const len = 40 + (i % 3) * 8;
      for (let j = 0; j < len; j += 2) X.rect(ctx, cx2 + sw * (j / len), CEIL + 16 + j, 4, 2, j % 4 ? '#3f3856' : '#4a4260');
      X.rect(ctx, cx2, CEIL + 16, 4, 2, '#8e86a8');
    }
    rockEdge(ctx, (dx - 24) | 0, (dx + 24) | 0, CEIL + 12, 1, '#4a4260', '#241f36', 8);
    X.rect(ctx, dx - 13, CEIL - 2, 26, 12, '#7a5a3a');
    X.rect(ctx, dx - 13, CEIL - 2, 26, 2, '#9c7a52');
    F.draw(ctx, 'OWT', dx, CEIL + 1, '#ffe9a8', { center: true });

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

    // THE BRAIN IN THE JAR. The only clean thing in the house, and the only
    // thing in it that knows anything. It stands in front of the mess.
    const jx = IN_SPOTS[1].x - cam;
    const jf = Math.floor(t * 2.4) % 3;
    for (let i = 3; i >= 0; i--) {
      ctx.globalAlpha = 0.05 + i * 0.01;
      const w = 40 + i * 24;
      X.dither(ctx, jx - w / 2, CEIL + 6, w, FLOOR - CEIL - 6, '#4cff9a', i % 2);
    }
    ctx.globalAlpha = 1;
    X.blob(ctx, jx, FLOOR + 2, 30, 4, '#1a2a20');
    AH.blit(ctx, AH.S.brainjar, jf, jx, FLOOR + 2);
    if (U.chance(0.04)) FX.spawn({ x: jx + cam + U.rand(-14, 14), y: FLOOR - 88, vx: U.rand(-6, 6), vy: U.rand(-16, -5), life: 1.1, size: 2, color: '#8affd0', grav: -0.06, drag: 0.96, glow: 1 });

    // the cheese, until he takes it
    if (!g.save.pet) {
      const cx3 = RAT_SPOT.x + 16 - cam;
      AH.blit(ctx, AH.S.cheese, 0, cx3, FLOOR + 1);
    }
    // drips off the roof
    for (const d of DRIPS) {
      const x = d.x - cam; if (x < -4 || x > VW + 4) continue;
      const f = d.t / 3.4;
      if (f < 0.7) X.rect(ctx, x, CEIL + 20 + f / 0.7 * (FLOOR - CEIL - 26), 1, 3, '#8affa0');
      else if (f < 0.78) X.rect(ctx, x - 3, FLOOR - 3, 7, 1, '#8affa0');
    }
    ctx.restore();

    // the rock the room was knocked out of, closing in on all four sides
    const rx1 = rx0 + rw;
    rockEdge(ctx, (rx0 - 8) | 0, (rx1 + 8) | 0, ry0, 1, '#3a3450', '#241f36', 9);
    for (let y = ry0; y < VH; y += 4) {
      const w = 3 + Math.round(U.hash2(y, 13) * 5);
      X.rect(ctx, rx0 - 1, y, w, 4, '#241f36');
      X.rect(ctx, rx0 + w - 2, y, 1, 4, '#4a4260');
      const w2 = 3 + Math.round(U.hash2(y, 27) * 5);
      X.rect(ctx, rx1 - w2 + 1, y, w2, 4, '#241f36');
      X.rect(ctx, rx1 - w2 + 1, y, 1, 4, '#4a4260');
    }
    ctx.globalAlpha = 0.5;
    X.rect(ctx, rx0 - 6, ry0, 6, VH - ry0, '#0c0916');
    X.rect(ctx, rx1, ry0, 6, VH - ry0, '#0c0916');
    ctx.globalAlpha = 1;
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
    // How high the sign floats, in SCREEN pixels -- the thing it names is
    // twice its old size now, so the clearance is measured after the zoom
    // rather than scaled up with it.
    const LIFTS = { ufo: 78, door: 114, brain: 93, pc: 78, exit: 69, rat: 44 };
    const lift = LIFTS[s.id] || 100;
    const sp = toScreen(s.x - cam, groundY(s.x));
    const x = U.clamp(Math.round(sp.x), 60, VW - 60);
    const y = U.clamp(Math.round(sp.y - lift + Math.sin(t * 5) * 2), 24, VH - 70);
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

  /* ---------------------------------------------------------------- the view
     Home is ZOOMED: the scene is painted at its usual size and then a window
     of it, ZW by ZH, is blown up to fill the screen.

     The window used to be 240x135 at exactly 2x, which was too close -- you
     could not see the house and the saucer at the same time. It is 320x180
     now, which is a 1.5x blow-up of the logical frame; that would normally
     smear pixels, except the frame itself is already drawn at HD=2, so a home
     pixel lands on exactly THREE device pixels. Crisp, and a third more of
     the moon in shot. */
  const ZW = 320, ZH = 180, ZK = VW / ZW;
  const VIEW = { x: 120, y: 100 };

  function view(dt) {
    const cam = g0 ? g0.intCam : 0;
    const px = P.x - cam, gy = groundY(P.x);
    let tx, ty;
    if (S.scene === 'in') {
      // the room is narrower than the window: park it, centred, and hold still
      tx = (IN_W - VW) / -2 + (IN_W - ZW) / 2;
      ty = CEIL - 24;
    } else {
      tx = U.clamp(px - ZW / 2, 0, VW - ZW);
      // the ground sits low in the window so there is sky above him, and the
      // window rises with him when he leaves the floor
      const head = P.air > 0.1 ? P.y - 34 : P.y;
      ty = U.clamp(Math.min(gy, head) - 112, 0, VH - ZH);
    }
    if (dt === undefined) return VIEW;
    VIEW.x = U.damp(VIEW.x, tx, 0.22, dt);
    VIEW.y = U.damp(VIEW.y, ty, 0.18, dt);
    return VIEW;
  }
  /* Screen pixels back into scene pixels, for taps and for the prompt sign. */
  function toScreen(x, y) { return { x: (x - Math.round(VIEW.x)) * ZK, y: (y - Math.round(VIEW.y)) * ZK }; }
  function fromScreenX(sx) { return Math.round(VIEW.x) + sx / ZK; }

  /* Everything in the world. Painted into the zoom buffer, never straight to
     the screen. */
  function drawScene(ctx, g, t) {
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
  }

  /* Signs, speech and the sleep fade, drawn on the screen at screen size so
     the zoom does not turn the lettering into billboards. */
  function drawOverlay(ctx, g, t) {
    if (S.sleep <= 0) prompt(ctx, g, t, Math.round(g.intCam));

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

  /* Kept for anything that still wants the whole thing in one call. */
  function draw(ctx, g, t) { drawScene(ctx, g, t); drawOverlay(ctx, g, t); }

  function drawPlayer(ctx, g, cam, t) {
    const skin = PD.art.skinFor(g.save.cos);
    const gy = groundY(P.x);
    const air = P.y < gy - 1;
    const walking = Math.abs(P.vx) > 8;
    const x = (P.x - cam) | 0;
    /* The rig's soles sit thirteen logical pixels below the anchor it is
       handed, and P.y is the ground. Anchoring at P.y + 2 therefore buried him
       fifteen pixels into the regolith -- which the old compact shoes mostly
       hid and the tentacles did not. */
    const y = (P.y - 13) | 0;
    if (P.roll > 0) {
      ctx.save();
      ctx.translate(x, (P.y + 2 | 0) - 14);
      ctx.rotate(P.rollA);
      const s = skin.alienRoll;
      ctx.drawImage(s.frames[0], -s.ox, -s.oy + 14, s.w, s.h);
      ctx.restore();
      if (U.chance(0.5)) FX.dust(P.x - P.face * 6, P.y, 1, '#8e86a8', 8);
      return;
    }
    // the live rig: his legs plant and swing off his own speed, so walking
    // across the moon is a real cycle rather than four pictures
    if (!P.rig) P.rig = PD.rig.make();
    const r = P.rig;
    PD.rig.step(r, { dt: g.dt, vx: P.vx, vy: P.vy, ground: !air, drilling: false });
    // he says something short and stupid whenever he starts doing a thing
    if (r.fresh) {
      const SAYS = { wave: 'HI', shrug: '?', flex: 'HUP', point: '!', scratch: 'HMM', sniff: 'SNF', stretch: 'AAA' };
      FX.text(P.x, P.y - 48, SAYS[r.fresh] || '?', '#ffe9a8', 0);
      A.sfx.tone(r.fresh === 'shrug' ? 300 : 620, { type: 'square', to: r.fresh === 'shrug' ? 220 : 820, dur: 0.09, vol: 0.035 });
      r.fresh = null;
    }
    const frame = PD.rig.faceOf(r, t, Math.sin(t * 1.3) > 0.94);
    // BOUNCY: a deep squash on landing, a stretch on the way up, and a little
    // extra wobble the whole time so nothing in this game is ever rigid.
    const wob = walking ? Math.sin(P.walk * 2.2) * 0.05 : Math.sin(t * 3.4) * 0.022;
    const sq = P.land > 0 ? 1 + P.land * 1.5 : (air ? (P.vy < -60 ? 0.84 : (P.vy > 90 ? 1.1 : 1)) : 1 + wob);
    PD.rig.draw(ctx, r, {
      x, y, flip: P.face < 0, spr: skin.alienCore, frame,
      drilling: false, twoHand: false, grip: null, aim: P.face < 0 ? Math.PI : 0,
      ground: !air, vx: P.vx, vy: P.vy, squash: sq
    }, skin.P, PD.art.BIZ);
    if (walking && !air && U.chance(0.2)) FX.dust(P.x - P.face * 5, P.y, 1, '#8e86a8', 10);
  }

  PD.home = { enter, update, draw, drawScene, drawOverlay, view, toScreen, fromScreenX, closeScene, touchMode, leaveDesk, say, P, UI, S, groundY, ZW, ZH, ZK, ROOM_W: OUT_W, SPOTS };
})(window.PD);
