/* THE STORY, AND WHAT YOU ARE FOR.
   You bought a UFO. You cannot drive a UFO. On your first night out you put
   it through the swimming pool of a space yacht belonging to a shark in a
   suit called Mr Chum, and the yacht was worth a million. So:

     1. PAY MR CHUM BACK. A million. He takes a cut of everything you sell,
        and he calls, and you can pay him off in lumps whenever you like --
        or tell him where to go, which he will remember.
     2. THEN GET RICH. Ten million, and a moon covered in things.

   This file owns the cold open (the crash), the drop onto the moon at the
   end of the opening night, the goal in the corner of the screen, every
   conversation with Mr Chum about money, and both endings. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const PT = PD.paint;
  const FX = PD.fx;
  const VW = 480, VH = 270, HD = 2;
  const RICH = 10000000;

  /* ============================================================ THE COLD OPEN */
  const IS = { on: 0, beat: 'crash', line: 0, lt: 0, t: 0, chars: 0, pop: 0, done: 0, cam: { x: 140, y: 130, z: 2 }, shake: 0, flash: 0, bits: [] };
  const CRASH = [
    'THIS IS YOU.',
    'YOU HAVE JUST BOUGHT A UFO. YOU CANNOT DRIVE A UFO.',
    'THIS IS A VERY EXPENSIVE SPACE YACHT.',
    'THIS IS MR CHUM. HE IS HAVING A LOVELY DAY.',
    'AND THEN YOU TURN UP.',
    'HE IS NOT HAVING A LOVELY DAY ANY MORE.'
  ];
  const SHOTS = [
    { x: 140, y: 128, z: 2.2 }, { x: 150, y: 124, z: 1.7 }, { x: 600, y: 128, z: 1.25 },
    { x: 628, y: 118, z: 2.6 }, { x: 470, y: 120, z: 1.15 }, { x: 600, y: 118, z: 2.1 }
  ];
  // the lines of the street and the office, handed to cut.js
  const STREET = [
    'TWO OF MR CHUM\'S PEOPLE PICK YOU UP OUT OF THE POOL.',
    'THE BIG ONE HAS HORNS. HE DOES NOT SAY ANYTHING ALL NIGHT.',
    'THE OTHER ONE IS GREY AND COVERED IN RED, AND HE WILL NOT SHUT UP.',
    'DRAX: I AM DRAX. I AM TAKING YOU TO THE MAN.',
    'DRAX: DO NOT STRUGGLE. NOTHING IS FUNNIER THAN WHEN YOU STRUGGLE.',
    'THE CITY GOES PAST UPSIDE DOWN. IT IS BEAUTIFUL. YOU ARE SOAKING.',
    'YOU: WHY ARE YOU GREY?',
    'DRAX: WHAT?',
    'YOU: I SAID WHY ARE YOU --'
  ];
  function officeLines() {
    return [
      'YOU COME ROUND ON A CARPET WORTH MORE THAN YOU ARE.',
      { talk: {
        start: 'a', nodes: {
          a: { who: 'chum', face: 'smug', text: 'THERE HE IS. THE MAN WHO PARKED A UFO IN MY SWIMMING POOL.', choices: [
            { t: 'IT WAS AN ACCIDENT.', next: 'acc' },
            { t: 'NICE POOL, THOUGH.', next: 'pool' },
            { t: 'WHO ARE YOU?', next: 'who' }] },
          acc: { who: 'chum', text: 'SO WAS MY LAST ACCOUNTANT. HE IS IN THE TANK. SAY HELLO TO HIM LATER.', next: 'b' },
          pool: { who: 'chum', text: 'IT WAS. NOW IT IS A UFO WITH SOME WATER ROUND IT.', next: 'b' },
          who: { who: 'chum', text: 'I AM MR CHUM. I OWN THIS CITY, THAT YACHT, THIS CARPET, AND AS OF TONIGHT, YOU.', next: 'b' },
          b: { who: 'chum', text: 'THE YACHT WAS ONE MILLION. A ROUND NUMBER. I AM FOND OF A ROUND NUMBER.', choices: [
            { t: 'I WILL PAY YOU BACK.', next: 'yes', fx: g => { g.save.chumMood = 1; } },
            { t: 'CAN I PAY IN EXPOSURE?', next: 'exp', fx: g => { g.save.chumMood = 0; } },
            { t: 'WHAT IF I JUST RUN?', next: 'run', fx: g => { g.save.chumMood = -1; } }] },
          yes: { who: 'chum', face: 'smug', text: 'YES. YOU WILL.', next: 'c' },
          exp: { who: 'chum', text: 'HA. HA. HA. NO.', next: 'c' },
          run: { who: 'drax', text: 'HELLO.', next: 'run2' },
          run2: { who: 'chum', text: 'THAT IS WHAT HAPPENS IF YOU RUN. DRAX HAPPENS.', next: 'c' },
          c: { who: 'chum', text: 'SO. I HAVE A MOON NOBODY WANTS, AND YOU HAVE A DRILL. YOU DIG, YOU SELL, I TAKE MY CUT.', next: null }
        } } },
      'MR CHUM: PUT THE WATCH ON HIM.',
      'MR CHUM: IT TELLS ME WHERE YOU ARE. IT TELLS ME WHAT YOU OWE.',
      'MR CHUM: PAY ME BACK AND YOU ARE FREE. GET RICH AND I MIGHT EVEN LIKE YOU.',
      'MR CHUM: NOW GET OFF MY CARPET.'
    ];
  }

  function startIntro(g) {
    IS.on = 1; IS.beat = 'crash'; IS.line = 0; IS.lt = 0; IS.t = 0; IS.chars = 0; IS.pop = 0; IS.done = 0; IS.bits.length = 0;
    IS.cam = { x: SHOTS[0].x, y: SHOTS[0].y, z: 2.6 };
    IS.title = 0;
    g.save.story = 1;
    g.saveGame();
    g.state = 'intro';
    A.sfx.tone(180, { type: 'square', to: 90, dur: 0.5, vol: 0.1 });
  }
  function introActive() { return !!IS.on; }

  function toStreet(g) {
    IS.on = 0;
    PD.cut.play(g, 'street', STREET, (g2) => {
      PD.cut.play(g2, 'office', officeLines(), (g3) => {
        g3.state = 'intro';
        IS.on = 1; IS.beat = 'drop'; IS.t = 0; IS.line = 0; IS.lt = 0;
      }, finishIntro);
    }, finishIntro);
  }

  function finishIntro(g) {
    if (IS.done) return;
    IS.done = 1; IS.on = 0;
    g.save.seenIntro = 1;
    g.save.debt = PD.chum.DEBT0;
    g.save.paid = 0;
    g.saveGame();
    g.wipeTo(240, 135, '#0a0614', () => {
      g.state = 'home';
      PD.home.enter(g);
      setTimeout(() => welcome(g), 900);
    });
  }

  function updateIntro(dt, g) {
    if (!IS.on) return;
    const IN = PD.input;
    IS.t += dt; IS.lt += dt;
    IS.pop = Math.min(1, IS.pop + dt * 4.5);
    IS.shake = Math.max(0, IS.shake - dt * 2.4);
    IS.flash = Math.max(0, IS.flash - dt * 2);
    if (IN.hit('esc')) { finishIntro(g); return; }
    stepBits(dt);
    if (IS.beat === 'drop') {
      if (IS.t > 5.2 || IN.hit('KeyE') || (IN.mouse.inside && IN.mouse.leftPressed && IS.t > 1)) finishIntro(g);
      return;
    }
    // the title card holds before anything is said
    IS.title += dt;
    if (IS.title < 2.2) return;
    const line = CRASH[IS.line] || '';
    if (IS.chars < line.length) IS.chars = Math.min(line.length, IS.chars + dt * 40);
    const sh = SHOTS[IS.line] || SHOTS[0];
    const k = 1 - Math.pow(1 - 0.05, dt * 60);
    IS.cam.x += (sh.x - IS.cam.x) * k; IS.cam.y += (sh.y - IS.cam.y) * k; IS.cam.z += (sh.z - IS.cam.z) * k;
    // the crash itself: once, on the fifth line
    if (IS.line === 4 && IS.lt > 1.35 && !IS.crashed) {
      IS.crashed = 1; IS.shake = 1.2; IS.flash = 1;
      A.sfx.boom ? A.sfx.boom() : A.sfx.thud();
      A.sfx.tone(120, { type: 'sawtooth', to: 40, dur: 0.6, vol: 0.12 });
      for (let i = 0; i < 90; i++) IS.bits.push({ x: 624, y: 124, vx: U.rand(-160, 160), vy: U.rand(-260, -60), life: U.rand(0.8, 2), c: U.pick(['#9adfff', '#5ab8e8', '#ffffff', '#38a8e8']), s: U.chance(0.3) ? 2 : 1 });
    }
    const m = IN.mouse;
    const poke = IN.hit('KeyE') || IN.hit('space') || IN.hit('enter') || (m.inside && m.leftPressed);
    const read = Math.max(2.6, line.length * 0.08) + (IS.line === 4 ? 1.2 : 0);
    if ((poke && IS.chars >= line.length) || IS.lt > read) {
      IS.line++; IS.lt = 0; IS.chars = 0; IS.pop = 0; A.sfx.click();
      if (IS.line >= CRASH.length) toStreet(g);
    } else if (poke) IS.chars = line.length;
  }
  function stepBits(dt) {
    for (let i = IS.bits.length - 1; i >= 0; i--) {
      const b = IS.bits[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 300 * dt; b.life -= dt;
      if (b.life <= 0) IS.bits.splice(i, 1);
    }
  }

  /* ---- the art for it ---- */
  const ART = {};
  function yacht() {
    if (ART.yacht) return ART.yacht;
    const W = 340 * HD, H = 130 * HD, B = PT.buf(W, H);
    const GOLD = [0xffc44d, 0xfff0a0, 0xb88a1e], WH = [0xf0f0f8, 0xffffff, 0xb0b0c8];
    // the hull: a long gold wedge with a white stripe and portholes
    B.poly([[20, 150], [W - 40, 150], [W - 4, 120], [W - 60, 230], [80, 230]], GOLD[0]);
    B.poly([[20, 150], [W - 40, 150], [W - 30, 160], [26, 160]], GOLD[1]);
    B.poly([[80, 230], [W - 60, 230], [W - 80, 244], [110, 244]], GOLD[2]);
    B.rect(40, 176, W - 110, 8, 0xffffff);
    for (let i = 0; i < 14; i++) { B.disc(70 + i * 38, 200, 6, 0x1a2a4a); B.disc(68 + i * 38, 198, 2, 0x9ae0ff); }
    // the deck, the cabin, the bridge
    B.rect(30, 132, W - 100, 18, WH[0]); B.rect(30, 132, W - 100, 3, WH[1]);
    B.block(60, 70, 150, 62, WH, 8, 6);
    for (let i = 0; i < 6; i++) B.rect(72 + i * 22, 86, 14, 16, 0x2a5a9a);
    B.block(90, 30, 80, 42, WH, 6, 5);
    for (let i = 0; i < 3; i++) B.rect(100 + i * 22, 42, 14, 12, 0x2a5a9a);
    B.line(150, 30, 150, 4, 0xa8a8b8, 2); B.disc(150, 4, 4, 0xff5a4d);
    // the pool, on the aft deck, tiled, with a sun lounger by it
    B.rect(400, 124, 190, 22, 0xe8e8f0);
    for (let i = 0; i < 16; i++) B.rect(402 + i * 12, 124, 1, 22, 0xb0b8c8);
    B.round(410, 126, 170, 18, 6, 0x2a8ad8); B.rect(414, 127, 162, 3, 0x9ae0ff);
    B.rect(600, 118, 30, 6, 0xd8583a); B.rect(604, 124, 2, 8, 0x8a8a9a); B.rect(624, 124, 2, 8, 0x8a8a9a);
    // a palm in a pot, a flag with a shark on it
    B.rect(250, 96, 6, 36, 0x8a6a3a);
    for (let k = 0; k < 5; k++) { const a = -Math.PI + k * 0.7; B.line(253, 96, 253 + Math.cos(a) * 30, 96 + Math.sin(a) * 12 + 12, 0x3aa84a, 4); }
    B.line(W - 70, 132, W - 70, 70, 0xc8c8d8, 2);
    B.rect(W - 68, 70, 36, 22, 0x1a2a4a);
    B.poly([[W - 60, 86], [W - 40, 86], [W - 50, 74]], 0xc8d8f0);
    // engines, at the back, glowing
    B.round(0, 180, 30, 30, 8, 0x5a6070); B.disc(4, 195, 9, 0x7ef9ff);
    B.rim(0xffffff, 0, -1, 0.4);
    B.outline(0x140f22);
    return (ART.yacht = B.toCanvas());
  }

  function drawCrash(ctx, g, t) {
    // space, deep and busy
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, '#0a0624'); grd.addColorStop(1, '#2a1246');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    const cam = IS.cam;
    const sh = IS.shake > 0 ? IS.shake * IS.shake * 6 : 0;
    ctx.save();
    if (sh) ctx.translate(U.rand(-sh, sh), U.rand(-sh, sh));
    // stars, three depths, parallax off the camera
    for (let L = 0; L < 3; L++) {
      for (let i = 0; i < 70; i++) {
        const sx = ((U.hash2(i, 3 + L) * 900 - cam.x * (0.1 + L * 0.2)) % 900 + 900) % 900 - 200;
        const sy = U.hash2(i, 7 + L) * VH;
        ctx.globalAlpha = 0.3 + L * 0.25 + Math.sin(t * 2 + i) * 0.1;
        ctx.fillStyle = L === 2 ? '#ffffff' : '#b8b0e8';
        ctx.fillRect(sx | 0, sy | 0, L === 2 ? 2 : 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    // a ringed planet in the distance and the city lights of the one below
    X.blob(ctx, 390 - cam.x * 0.06, 60, 44, 40, '#6a3a86'); X.blob(ctx, 378 - cam.x * 0.06, 48, 20, 16, '#8a52a6');
    ctx.globalAlpha = 0.5; X.blob(ctx, 390 - cam.x * 0.06, 64, 76, 6, '#c9a0ff'); ctx.globalAlpha = 1;
    // the world, through the camera
    ctx.save();
    ctx.translate(240, 140);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
    // the yacht
    const yc = yacht();
    const bob = Math.sin(t * 0.9) * 1.5;
    ctx.drawImage(yc, 450, 60 + bob, yc.width / HD, yc.height / HD);
    // the pool water, and whoever is in it
    const pool = { x: 655, y: 125 + bob };
    const L = IS.line, lt = IS.lt, crashed = IS.crashed;
    if (!crashed || L < 4) {
      // Mr Chum, on a shark floatie, in shades, with a drink
      const fy = pool.y - 4 + Math.sin(t * 1.6) * 1;
      X.blob(ctx, pool.x, fy + 2, 14, 4, '#5a7ab0'); X.blob(ctx, pool.x, fy + 1, 13, 3, '#8ab0e8');
      X.poly(ctx, [[pool.x + 2, fy - 1], [pool.x + 7, fy - 1], [pool.x + 4, fy - 9]], '#6a8ac8');
      PD.chum.drawChumAt(ctx, pool.x - 2, fy + 2, 0.34, L === 3 && Math.sin(t * 8) > 0, t);
      X.rect(ctx, pool.x - 9, fy - 17, 12, 2, '#101018');
      X.rect(ctx, pool.x + 5, fy - 12, 3, 5, 'rgba(255,200,120,0.8)'); X.rect(ctx, pool.x + 6, fy - 15, 1, 3, '#ff5a8a');
      if (L === 3) {
        // a freeze-frame card: who this is
        const k = Math.min(1, lt * 4);
        ctx.globalAlpha = k;
        X.plate(ctx, pool.x - 58, pool.y - 60, 64, 22, '#1a0612', '#c83a3a', '#07030c', 3);
        F.draw(ctx, 'MR CHUM', pool.x - 26, pool.y - 57, '#ffffff', { center: true, shadow: '#000000' });
        F.draw(ctx, 'OWNS ALL THIS', pool.x - 26, pool.y - 48, '#ff9a9a', { center: true, shadow: false });
        ctx.globalAlpha = 1;
      }
    }
    // your UFO: wobbling, looping, then straight into the pool
    const ufo = AH().S.saucer;
    let ux = null, uy = 0, ur = 0;
    if (L === 0) { ux = 140 + Math.sin(t * 1.3) * 4; uy = 128 + Math.sin(t * 2.1) * 3; ur = Math.sin(t * 1.7) * 0.2; }
    else if (L === 1) { const a = lt * 2.4; ux = 150 + Math.sin(a) * 34; uy = 124 - (1 - Math.cos(a)) * 18; ur = a; }
    else if (L === 4 && lt < 1.35) { const q = lt / 1.35; ux = 320 + q * (pool.x - 320); uy = 70 + q * q * (pool.y - 70) - Math.sin(q * Math.PI) * 10; ur = q * 1.2; }
    if (ux !== null) {
      ctx.save(); ctx.translate(ux, uy); ctx.rotate(ur);
      ctx.drawImage(ufo.frames[Math.floor(t * 6) % 2], -ufo.ox, -ufo.oy, ufo.w, ufo.h);
      X.plate(ctx, -4, -6, 8, 7, '#ffffff', null, '#a8a8b8', 1); F.draw(ctx, 'L', 0, -6, '#d8343a', { center: true, shadow: false });
      ctx.restore();
      if (L === 4) for (let k = 0; k < 6; k++) { ctx.globalAlpha = 0.3 - k * 0.04; X.blob(ctx, ux - (k + 1) * 10, uy - (k + 1) * 4, 5 - k * 0.6, 3, '#ffd34d'); } ctx.globalAlpha = 1;
    }
    if (crashed && L >= 4) {
      // the UFO, upside down in the pool; the water gone everywhere
      ctx.save(); ctx.translate(pool.x + 4, pool.y - 2); ctx.rotate(Math.PI + 0.5);
      ctx.drawImage(ufo.frames[0], -ufo.ox, -ufo.oy, ufo.w, ufo.h); ctx.restore();
      for (let k = 0; k < 3; k++) { const q = (t * 0.7 + k * 0.33) % 1; ctx.globalAlpha = 0.5 * (1 - q); X.blob(ctx, pool.x + 4 + Math.sin(t + k) * 4, pool.y - 16 - q * 30, 3 + q * 6, 2 + q * 5, '#8a8aa8'); }
      ctx.globalAlpha = 1;
      // and Mr Chum, on the deck, soaked, with a face on him
      const land = L === 4 ? Math.min(1, Math.max(0, (lt - 1.35) / 1.1)) : 1;
      const cx = pool.x + (1 - land) * 10 - land * 70, cy = pool.y - 4 - Math.sin(land * Math.PI) * 60 - (land >= 1 ? 6 : 0);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((1 - land) * 6);
      PD.chum.drawChumAt(ctx, 0, 0, 0.42, L === 5 && Math.sin(t * 9) > 0, t);
      ctx.restore();
      if (land >= 1) {
        for (let k = 0; k < 4; k++) { const q = (t * 2 + k * 0.25) % 1; X.rect(ctx, cx - 10 + k * 6, cy - 30 + q * 26, 1, 2, '#9adfff'); }
        // steam coming off his head
        if (L === 5) for (let k = 0; k < 3; k++) { const q = (t * 1.3 + k * 0.33) % 1; ctx.globalAlpha = 1 - q; X.blob(ctx, cx - 4 + k * 4, cy - 38 - q * 16, 2 + q * 3, 2 + q * 2, '#ffffff'); ctx.globalAlpha = 1; }
      }
      // alarms on the bridge
      if (Math.floor(t * 4) % 2) { PT.glow(ctx, 600, 64 + bob, 30, '#ff3a3a', 0.6); }
    }
    for (const b of IS.bits) { ctx.globalAlpha = U.clamp(b.life * 2, 0, 1); X.rect(ctx, b.x, b.y, b.s, b.s, b.c); }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.restore();
    if (IS.flash > 0) { ctx.globalAlpha = IS.flash; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
    // the title, first
    if (IS.title < 2.4) {
      const q = IS.title;
      ctx.globalAlpha = Math.min(1, q * 2) * (1 - Math.max(0, (q - 1.9) / 0.5));
      X.rect(ctx, 0, 96, VW, 64, '#000000');
      F.draw(ctx, 'PLANET DESTROYER', 240, 108, '#ffd34d', { center: true, scale: 3, shadow: '#5a2a0a' });
      F.draw(ctx, 'PART ONE: THE POOL', 240, 140, '#8a86a8', { center: true, shadow: false });
      ctx.globalAlpha = 1;
    } else {
      const line = CRASH[IS.line] || '';
      const shown = line.slice(0, Math.floor(IS.chars));
      let sc = 2, rows = PD.chum.wrap(shown, VW - 76, 2);
      if (rows.length > 2) { sc = 1; rows = PD.chum.wrap(shown, VW - 76, 1); }
      const lh = sc === 2 ? 17 : 10, dh = 16 + (rows.length - 1) * lh + 7 * sc;
      ctx.save(); ctx.translate(0, -(VH - 12 - dh) + 16);
      PD.chum.captionCard(ctx, rows, sc, IS.pop, t, IS.chars >= line.length && Math.sin(t * 4) > 0 ? 'E / TAP' : null);
      ctx.restore();
    }
    // cinema bars
    X.rect(ctx, 0, 0, VW, 12, '#000000'); X.rect(ctx, 0, VH - 12, VW, 12, '#000000');
    F.draw(ctx, 'ESC SKIP', VW - 8, VH - 10, 'rgba(178,162,216,0.9)', { right: true, shadow: false });
  }
  const AH = () => PD.arthome;

  function drawDrop(ctx, g, t) {
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, '#0b0720'); grd.addColorStop(1, '#1a0e30');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 120; i++) {
      ctx.globalAlpha = 0.3 + U.hash2(i, 11) * 0.6;
      ctx.fillStyle = '#ffffff'; ctx.fillRect((U.hash2(i, 5) * VW) | 0, (U.hash2(i, 9) * VH) | 0, 1, 1);
    }
    ctx.globalAlpha = 1;
    // your new moon, turning, getting closer
    const k = Math.min(1, IS.t / 4);
    const r = 40 + k * 90;
    X.blob(ctx, 240, 190 + (1 - k) * 60, r, r, '#8e86a8');
    X.blob(ctx, 240 - r * 0.3, 190 + (1 - k) * 60 - r * 0.3, r * 0.4, r * 0.3, '#b8b0d4');
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + t * 0.2; X.blob(ctx, 240 + Math.cos(a) * r * 0.6, 190 + (1 - k) * 60 + Math.sin(a) * r * 0.5, r * 0.08, r * 0.06, '#6b6480'); }
    // Drax's ship, dropping you off and leaving at speed
    const px = 300 - IS.t * 30, py = 60 + Math.sin(t * 2) * 3;
    X.blob(ctx, px, py, 26, 7, '#3a3a5a'); X.blob(ctx, px + 4, py - 5, 10, 5, '#7ef9ff');
    if (IS.t > 1.4) {
      const f = Math.min(1, (IS.t - 1.4) / 2);
      const ax = px - 4, ay = py + 8 + f * (150 + (1 - k) * 40);
      const al = AH().S.saucer;
      ctx.drawImage(al.frames[0], ax - al.ox * 0.5, ay - al.oy * 0.5, al.w * 0.5, al.h * 0.5);
      F.draw(ctx, 'AAAA', ax + 10, ay - 16, '#ffe9a8', { shadow: false });
    }
    const line = 'AND THAT IS HOW YOU CAME TO OWN A MOON.';
    PD.chum.captionCard(ctx, PD.chum.wrap(line.slice(0, Math.floor(IS.t * 30)), VW - 76, 2), 2, Math.min(1, IS.t * 3), t, null);
  }

  function drawIntro(ctx, g, t) {
    if (IS.beat === 'drop') drawDrop(ctx, g, t);
    else drawCrash(ctx, g, t);
  }
  function track() { return IS.beat === 'drop' ? 'chum' : 'city'; }

  /* ============================================================ THE GOAL */
  function netWorth(g) { return g.save.credits + (g.vaultValue ? g.vaultValue() : 0); }
  function drawGoal(ctx, g, t) {
    if (!g.save.seenIntro) return;
    const debt = g.save.debt || 0;
    const w = 150, x = VW - w - 8, y = 8;
    X.plate(ctx, x, y, w, 34, 'rgba(10,6,26,0.82)', '#5a4a8a', '#0a0614', 4);
    if (debt > 0) {
      F.draw(ctx, 'GOAL: PAY MR CHUM BACK', x + 6, y + 4, '#ffd34d', { shadow: false });
      F.draw(ctx, 'OWED $' + U.fmt(debt), x + 6, y + 14, '#ff8a9a', { shadow: false });
      F.draw(ctx, '$' + U.fmt(g.save.credits), x + w - 6, y + 14, '#8affa0', { right: true, shadow: false });
      const f = 1 - debt / PD.chum.DEBT0;
      X.rect(ctx, x + 6, y + 25, w - 12, 4, '#2a1c33');
      X.rect(ctx, x + 6, y + 25, Math.round((w - 12) * f), 4, '#ff5fa8');
      X.rect(ctx, x + 6, y + 25, Math.round((w - 12) * f), 1, '#ffb0d8');
    } else {
      const nw = netWorth(g);
      F.draw(ctx, g.save.won ? 'YOU ARE RICH. KEEP GOING.' : 'GOAL: GET RICH', x + 6, y + 4, '#8affa0', { shadow: false });
      F.draw(ctx, '$' + U.fmt(nw) + ' / $' + U.fmt(RICH), x + 6, y + 14, '#ffd34d', { shadow: false });
      const f = Math.min(1, nw / RICH);
      X.rect(ctx, x + 6, y + 25, w - 12, 4, '#1c2a1c');
      X.rect(ctx, x + 6, y + 25, Math.round((w - 12) * f), 4, '#7dff9a');
    }
    // PAY: a little button on the goal, for paying him from anywhere
    if (debt > 0) {
      const b = PAYBTN, m = PD.input.mouse, hot = m.inside && m.x > b.x && m.x < b.x + b.w && m.y > b.y && m.y < b.y + b.h;
      X.plate(ctx, b.x, b.y, b.w, b.h, hot ? '#6a2a4a' : '#3a1a2a', '#ff5fa8', '#0a0614', 3);
      F.draw(ctx, 'PAY', b.x + b.w / 2, b.y + 3, '#ffffff', { center: true, shadow: false });
    }
  }
  const PAYBTN = { x: VW - 158 - 32, y: 8, w: 28, h: 13 };
  // the PAY button, and P on the keyboard, open the conversation
  function checkPay(g) {
    const IN = PD.input, m = IN.mouse;
    if (!g.save.seenIntro || (g.save.debt || 0) <= 0 || (PD.talk && PD.talk.active())) return false;
    const b = PAYBTN;
    if (IN.hit('KeyP') || (m.inside && m.leftPressed && m.x > b.x && m.x < b.x + b.w && m.y > b.y && m.y < b.y + b.h)) {
      talkChum(g, 'pay');
      return true;
    }
    return false;
  }

  /* ============================================================ PAYING HIM */
  function pay(g, amount) {
    amount = Math.min(Math.floor(amount), g.save.debt || 0, g.save.credits);
    if (amount <= 0) return 0;
    const before = g.save.debt;
    g.save.credits -= amount;
    g.save.debt -= amount;
    g.save.paid = (g.save.paid || 0) + amount;
    A.sfx.sell();
    for (let i = 0; i < 6; i++) setTimeout(() => A.sfx.coin && A.sfx.coin(i), i * 60);
    const f0 = before / PD.chum.DEBT0, f1 = g.save.debt / PD.chum.DEBT0;
    for (const m of [0.75, 0.5, 0.25]) if (f0 > m && f1 <= m) g.save.chumMood = (g.save.chumMood || 0) + 1;
    g.saveGame();
    if (g.save.debt <= 0) setTimeout(() => debtFree(g), 400);
    return amount;
  }
  const LINES_OPEN = [
    'AH. MY FAVOURITE DEBTOR. HAVE YOU GOT SOMETHING FOR ME?',
    'I WAS JUST THINKING ABOUT MY POOL. AND THEN I THOUGHT ABOUT YOU.',
    'YOU ARE LOOKING WELL. SOLVENT, EVEN. ARE YOU SOLVENT?',
    'HELLO. IT IS ME. IT IS ALWAYS ME. MONEY?'
  ];
  function talkChum(g, why) {
    const debt = g.save.debt || 0;
    if (debt <= 0) {
      PD.talk.start(g, { start: 'a', nodes: {
        a: { who: 'chum', face: 'smug', text: U.pick(['YOU DO NOT OWE ME ANYTHING. IT IS VERY STRANGE. I DO NOT LIKE IT.', 'A FREE MAN. HOW DOES IT FEEL? DO NOT ANSWER, I DO NOT CARE.', 'GET RICH. THEN COME AND BUY A YACHT OFF ME. I HAVE A NEW ONE.']), next: null }
      } });
      return;
    }
    const c = g.save.credits;
    const opts = [];
    for (const amt of [10000, 50000, 250000]) if (c >= amt && debt >= amt) opts.push({ t: 'PAY $' + U.fmt(amt), next: 'paid', fx: g2 => { IS.lastPay = pay(g2, amt); } });
    if (c > 0) opts.push({ t: 'PAY EVERYTHING I HAVE ($' + U.fmt(Math.min(c, debt)) + ')', next: 'paid', fx: g2 => { IS.lastPay = pay(g2, c); } });
    opts.push({ t: c <= 0 ? 'I HAVE NOTHING.' : 'NOT TODAY.', next: 'no' });
    opts.push({ t: 'HOW ABOUT A DISCOUNT?', next: 'disc' });
    PD.talk.start(g, { start: 'a', nodes: {
      a: { who: 'chum', text: why === 'board' ? 'YOU ARE TALKING TO A BILLBOARD. I CAN STILL HEAR YOU. WHAT DO YOU WANT?' : U.pick(LINES_OPEN),
        choices: [{ t: 'HOW MUCH DO I OWE?', next: 'owe' }].concat(opts) },
      owe: { who: 'chum', text: () => 'YOU OWE ME $' + U.fmt(g.save.debt) + '. YOU HAVE PAID $' + U.fmt(g.save.paid || 0) + '. I ALSO TAKE A FIFTH OF EVERY SALE, FOR MY TROUBLE.', choices: opts.slice() },
      paid: { who: 'chum', face: 'smug', text: () => g.save.debt <= 0 ? 'THAT IS... ALL OF IT. HUH.' : U.pick(['LOVELY. $' + U.fmt(IS.lastPay || 0) + '. ONLY $' + U.fmt(g.save.debt) + ' TO GO.', 'I CAN SMELL IT. IT SMELLS OF FREEDOM. A LITTLE BIT.', 'EXCELLENT. I WILL BUY A SMALLER POOL WITH IT.']), next: null },
      no: { who: 'chum', text: U.pick(['FINE. BUT THE WATCH IS TICKING. IT DOES NOT TICK. BUT IT COULD.', 'I WILL JUST TAKE MY CUT, THEN. I ALWAYS TAKE MY CUT.', 'DRAX IS DISAPPOINTED. HE IS ALWAYS DISAPPOINTED.']), next: null },
      disc: { who: 'chum', text: 'A DISCOUNT. ON A YACHT. THAT YOU SANK. WITH A UFO.', choices: [
        { t: 'YES.', next: 'disc2' }, { t: 'NO, FORGET IT.', next: 'no' }] },
      disc2: { who: 'chum', face: 'smug', text: (g.save.chumMood || 0) >= 2 ? 'YOU KNOW WHAT? YOU HAVE BEEN GOOD. FIVE PER CENT OFF. DO NOT TELL DRAX.' : 'NO. BUT I ADMIRE THE NERVE. GET BACK TO WORK.',
        fx: g2 => { if ((g2.save.chumMood || 0) >= 2 && !g2.save.discounted) { g2.save.discounted = 1; g2.save.debt = Math.round(g2.save.debt * 0.95); A.sfx.fanfare && A.sfx.fanfare(); } }, next: null }
    } });
  }

  /* Coming home: now and then he rings to ask how it is going. */
  function onHome(g, n) {
    g.save.trips = (g.save.trips || 0) + 1;
    if ((g.save.debt || 0) > 0 && g.save.trips % 2 === 0) setTimeout(() => { if (g.state === 'home' && !PD.talk.active()) talkChum(g, 'call'); }, 1400);
    if ((g.save.debt || 0) <= 0 && !g.save.won && netWorth(g) >= RICH) setTimeout(() => richEnding(g), 1200);
  }

  function welcome(g) {
    PD.talk.start(g, { start: 'a', nodes: {
      a: { who: 'chum', text: 'THIS IS YOUR MOON. IT IS ROUND NOW. I HAD IT DONE. YOU CAN WALK ALL THE WAY ROUND IT.', next: 'b' },
      b: { who: 'chum', text: 'THE UFO IS ON THE PAD. FLY TO A PLANET. DRILL IT. SELL WHAT COMES OUT ON THE LAPTOP IN YOUR CAVE.', choices: [
        { t: 'AND THEN?', next: 'c' }, { t: 'WHAT IS IN IT FOR ME?', next: 'd' }] },
      c: { who: 'chum', text: 'AND THEN YOU PAY ME. PRESS P, OR THE PINK BUTTON, WHEN YOU HAVE MONEY. I TAKE A CUT OF SALES ANYWAY.', next: 'e' },
      d: { who: 'chum', text: 'FREEDOM. AND ONCE YOU ARE FREE, MONEY. BUY THINGS ON ABAY. BUILD THINGS. BE RICH. I WILL BE JEALOUS.', next: 'e' },
      e: { who: 'chum', face: 'smug', text: 'LATER YOU CAN BUILD THINGS ON IT. MINERS DIG WHILE YOU SLEEP. BUT FIRST: THE UFO. OFF YOU GO.', next: null }
    } });
  }

  /* ============================================================ THE ENDINGS */
  function debtFree(g) {
    A.sfx.fanfare && A.sfx.fanfare();
    celebrate(g, '#ffd34d');
    PD.talk.start(g, { start: 'a', nodes: {
      a: { who: 'chum', text: 'WELL. WELL WELL WELL. ONE MILLION. EVERY DOLLAR.', next: 'b' },
      b: { who: 'drax', text: 'HE PAID? HE ACTUALLY PAID?', next: 'c' },
      c: { who: 'chum', face: 'smug', text: 'THE WATCH IS OFF. YOU ARE FREE. I AM ALMOST PROUD. ALMOST.', choices: [
        { t: 'THANK YOU, MR CHUM.', next: 'd' }, { t: 'I WILL NEVER DRIVE AGAIN.', next: 'e' }, { t: 'SEE YOU NEVER.', next: 'f' }] },
      d: { who: 'chum', text: 'DO NOT THANK ME. GET RICH. RICH PEOPLE BUY YACHTS, AND I SELL YACHTS.', next: 'g' },
      e: { who: 'chum', text: 'YES YOU WILL. YOU WILL DRIVE STRAIGHT INTO SOMETHING OF MINE. I AM COUNTING ON IT.', next: 'g' },
      f: { who: 'chum', text: 'EVERYBODY SAYS THAT. EVERYBODY COMES BACK. THE POOL IS VERY NICE NOW.', next: 'g' },
      g: { who: 'zorb', text: 'NEW GOAL: GET RICH. TEN MILLION. EVERYTHING YOU SELL IS YOURS NOW.', next: null }
    } });
  }
  function richEnding(g) {
    g.save.won = 1; g.saveGame();
    A.sfx.fanfare && A.sfx.fanfare();
    celebrate(g, '#7dff9a');
    PD.talk.start(g, { start: 'a', nodes: {
      a: { who: 'chum', text: 'TEN MILLION. I CHECKED. TWICE. I HAD DRAX CHECK. HE CANNOT COUNT, SO I CHECKED AGAIN.', next: 'b' },
      b: { who: 'chum', face: 'smug', text: 'YOU ARE RICH. RICHER THAN MOST OF MY FRIENDS. I DO NOT HAVE FRIENDS. RICHER THAN THEM.', choices: [
        { t: 'WANT TO BUY MY MOON?', next: 'c' }, { t: 'I AM BUYING A YACHT.', next: 'd' }] },
      c: { who: 'chum', text: 'NO. IT IS COVERED IN ROLLER COASTERS. IT IS PERFECT. KEEP IT.', next: 'e' },
      d: { who: 'chum', text: 'FROM ME. YOU ARE BUYING IT FROM ME. I WILL THROW IN A POOL. PLEASE DO NOT PARK IN IT.', next: 'e' },
      e: { who: 'zorb', text: 'YOU WIN. THE MOON IS YOURS, AND SO IS EVERYTHING ON IT. KEEP PLAYING AS LONG AS YOU LIKE.', next: null }
    } });
  }
  function celebrate(g, col) {
    if (g.state !== 'home') return;
    for (let k = 0; k < 6; k++) setTimeout(() => {
      const x = U.rand(80, 400), y = U.rand(40, 120);
      FX.ring && FX.ring(x, y, 4, 60, 0.8, col, 2);
      for (let i = 0; i < 30; i++) FX.spawn({ x, y, vx: U.rand(-120, 120), vy: U.rand(-120, 60), life: 1.2, size: 2, color: U.pick([col, '#ffffff', '#ff7ac4', '#7ef9ff']), grav: 80, drag: 1, glow: 1 });
      A.sfx.tone(400 + k * 100, { type: 'triangle', to: 900 + k * 100, dur: 0.3, vol: 0.06 });
    }, k * 350);
  }

  PD.story = { startIntro, introActive, updateIntro, drawIntro, finishIntro, track, drawGoal, checkPay, talkChum, pay, onHome, welcome, netWorth, RICH, IS };
})(window.PD);
