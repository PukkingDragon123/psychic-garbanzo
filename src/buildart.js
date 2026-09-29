/* EVERYTHING YOU CAN BUILD.
   A hundred-odd things, in six kinds:

     INDUSTRY   things that make you money while you are not looking:
                auto miners that dig your own moon, factories that sell the
                vault for you, polishers that make every rock worth more,
                and the old base buildings that make you better at digging
     HOME       the house itself (porch, tin extension, glass pod, tower) and
                the bed (boxes, mattress, real bed, waterbed, king)
     FURNITURE  for the cave: a telly, an arcade cabinet, a fish tank...
     FUN        a roller coaster you can ride, a pool, floaties for the pool,
                a trampoline, a cannon, a ferris wheel, a bouncy castle
     NATURE     mountains, a volcano, lakes, trees, crystals, a geyser
     DECOR      statues, lamps, flags, a fountain, a big neon RICH

   Each entry is painted once, at double resolution, with its feet at the
   bottom middle, and most of them have a `live` part drawn every frame on
   top: blades turning, smoke, water, lights that come on at night. They
   are all bought on ABAY and placed with the build menu (build.js). */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const PT = PD.paint;
  const HD = 2;

  const INK = 0x160f24;
  const R = PT.ramp;
  const METAL = [0x8a94a8, 0xc0c8d8, 0x545c70], DARKM = [0x4a5064, 0x6a7288, 0x2a2e3c];
  const CARD = [0xc8a068, 0xe2c08a, 0x96703f];
  const WOOD = [0x8a5a34, 0xb07a4a, 0x5a3a20];
  const LEAF = [0x4aa84a, 0x8ad86a, 0x2a6a34];

  /* ---------------------------------------------------------- helpers */
  function rivets(B, x, y, w, h, c) { for (let i = 3; i < w - 2; i += 6) { B.rect(x + i, y + 2, 1, 1, c); B.rect(x + i, y + h - 3, 1, 1, c); } }
  function panel(B, x, y, w, h, C) { B.block(x, y, w, h, C, 4, Math.min(6, w * 0.15)); rivets(B, x, y, w, h, PT.mix(C[0], 0xffffff, 0.5)); }
  function windows(B, x, y, cols, rows, sw, sh, gap, lit) {
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const wx = x + i * (sw + gap), wy = y + j * (sh + gap);
      B.rect(wx, wy, sw, sh, lit ? 0xffd070 : 0x2a3a5a);
      B.rect(wx, wy, sw, 1, lit ? 0xfff0c0 : 0x5a7aa8);
    }
  }
  function trunk(B, cx, gy, h, w, C) {
    B.rect(cx - w / 2, gy - h, w, h, C[0]); B.rect(cx - w / 2, gy - h, 2, h, C[1]); B.rect(cx + w / 2 - 2, gy - h, 2, h, C[2]);
    for (let i = 6; i < h; i += 7) B.rect(cx - w / 2 + 2, gy - i, w - 4, 1, C[2]);
  }
  function puff(B, cx, cy, r, C) { B.ball(cx, cy, r, r * 0.86, C); }
  function waterBox(B, x0, x1, gy, depth, col) {
    B.round(x0, gy - 4, x1 - x0, depth + 4, 6, PT.mul(col, 0.6));
    B.round(x0 + 2, gy - 3, x1 - x0 - 4, depth + 1, 5, col);
    B.rect(x0 + 4, gy - 3, x1 - x0 - 8, 2, PT.mix(col, 0xffffff, 0.5));
  }
  function statue(B, cx, gy, body, C) {
    B.block(cx - 18, gy - 14, 36, 14, [0xb8b0c8, 0xe0d8f0, 0x7a7290], 4, 4);
    body(B, cx, gy - 14, C);
  }
  function floatie(B, cx, gy, kind) {
    if (kind === 'shark') {
      B.ellipse(cx, gy - 8, 22, 9, 0x5a7ab0); B.ellipse(cx, gy - 10, 20, 7, 0x8ab0e8); B.ellipse(cx - 4, gy - 11, 10, 3, 0xc8e0ff);
      B.poly([[cx - 2, gy - 16], [cx + 8, gy - 16], [cx + 2, gy - 32]], 0x6a8ac8);
      B.poly([[cx + 18, gy - 10], [cx + 28, gy - 20], [cx + 26, gy - 4]], 0x6a8ac8);
      B.disc(cx - 14, gy - 12, 2, 0x101018); B.rect(cx - 18, gy - 7, 8, 1, 0xffffff);
      for (let i = 0; i < 4; i++) B.poly([[cx - 18 + i * 2, gy - 7], [cx - 17 + i * 2, gy - 7], [cx - 17.5 + i * 2, gy - 5]], 0xffffff);
    } else if (kind === 'duck') {
      B.ellipse(cx, gy - 8, 18, 8, 0xe8b820); B.ellipse(cx, gy - 10, 16, 6, 0xffd34d);
      B.ball(cx + 12, gy - 20, 8, 8, [0xffd34d, 0xfff0a0, 0xc89a1e]);
      B.poly([[cx + 18, gy - 20], [cx + 26, gy - 18], [cx + 18, gy - 16]], 0xff8a2a);
      B.disc(cx + 13, gy - 22, 1.4, 0x101018);
    } else if (kind === 'donut') {
      B.ellipse(cx, gy - 8, 20, 9, 0xe87aa8); B.ellipse(cx, gy - 10, 18, 7, 0xff9ac8); B.ellipse(cx, gy - 9, 7, 3, null);
      for (let i = 0; i < 8; i++) B.rect(cx - 14 + i * 4, gy - 13 + (i % 2), 2, 1, [0xffffff, 0x7ef9ff, 0xffd34d][i % 3]);
    } else {
      B.ellipse(cx, gy - 8, 16, 8, 0xe85a8a); B.ellipse(cx, gy - 10, 14, 6, 0xff8ab0);
      B.line(cx + 10, gy - 12, cx + 14, gy - 34, 0xff8ab0, 3);
      B.ball(cx + 16, gy - 36, 5, 4, [0xff8ab0, 0xffc0d8, 0xc85a8a]);
      B.poly([[cx + 20, gy - 36], [cx + 26, gy - 32], [cx + 20, gy - 33]], 0x3a2a3a);
    }
  }
  /* A mountain painted a pixel at a time: a jagged skyline, a ridge that
     splits the lit face from the shadowed one, rock facets and strata off
     noise, cracks, a snow line that drips, boulders round the foot.
     opts: pal (five rock colours dark to light), snow, crater, seed. */
  function rockMass(B, cx, gy, w, h, o) {
    o = o || {};
    const P = o.pal || [0x2e2648, 0x463c68, 0x625688, 0x8276aa, 0xa89ed0];
    const SN = [0x6a7ab0, 0x9aaad8, 0xd0dcf4, 0xf6f8ff];
    const sd = o.seed || 1, hw = w / 2;
    const top = new Float32Array(Math.ceil(w) + 2);
    for (let i = 0; i <= w; i++) {
      const u = (i - hw) / hw, a = Math.abs(u);
      let t = Math.pow(Math.max(0, 1 - a), 1.05) * h;
      // a shoulder off to one side, so it is not a triangle
      t = Math.max(t, Math.max(0, 1 - Math.abs(u - 0.42) / 0.4) * h * 0.62, Math.max(0, 1 - Math.abs(u + 0.5) / 0.34) * h * 0.4);
      t += (U.fbm(i * 0.05 + sd * 9, sd, 3) - 0.5) * h * 0.22 * (1 - a * a);
      t += (U.hash2(i >> 2, sd) - 0.5) * 3 * (1 - a);
      if (o.crater && a < 0.13) t = Math.min(t, h * 0.9 - (0.13 - a) * h * 0.5);
      if (o.crater) t = Math.min(t, h * 0.92);
      top[i] = Math.max(0, t);
    }
    const ridge = y => cx + (U.fbm(y * 0.02, sd * 3, 2) - 0.5) * w * 0.2 + (gy - y) * 0.02;
    for (let i = 0; i <= w; i++) {
      const x = Math.round(cx - hw + i), t0 = gy - top[i];
      for (let y = Math.floor(t0); y <= gy; y++) {
        const dy = (gy - y) / h;
        let v = x < ridge(y) ? 0.66 : 0.34;
        v += (U.fbm(x * 0.045 + y * 0.03, y * 0.06 + sd, 3) - 0.5) * 0.7;
        v += (U.noise2(sd, y * 0.12) - 0.5) * 0.16;
        v += dy * 0.15 - (y - t0 < 2 ? -0.25 : 0);
        v -= Math.max(0, 1 - (gy - y) / 14) * 0.3;
        const crack = Math.abs(U.fbm(x * 0.07, y * 0.018 + sd, 2) - 0.5) < 0.007;
        const snowLine = gy - h * 0.66 + (U.fbm(x * 0.09, sd * 5, 2) - 0.5) * h * 0.2 + (Math.sin(x * 0.7) > 0.6 ? 4 : 0);
        let pal = P;
        if (o.snow && y < snowLine) pal = SN;
        const f = U.clamp(v, 0, 0.999) * pal.length;
        let k = Math.floor(f);
        if (f - k > PT.bayer(x, y) * 0.9 + 0.05) k = Math.min(pal.length - 1, k + 1);
        B.set(x, y, crack && pal === P ? PT.mul(P[0], 0.8) : pal[U.clamp(k, 0, pal.length - 1)]);
      }
    }
    // boulders and pebbles round the foot
    for (let k = 0; k < 5 + w / 40; k++) {
      const bx = cx - hw * 0.9 + U.hash2(k, sd + 7) * w * 0.9, r = 3 + U.hash2(k, sd + 8) * 6;
      B.ball(bx, gy - r * 0.6, r, r * 0.75, [P[2], P[4], P[0]], true);
    }
  }
  function mountain(B, cx, gy, w, h, snow, col) {
    rockMass(B, cx, gy, w, h, { snow, pal: col, seed: Math.round(w + h) });
  }
  function crystal(B, x, gy, h, col) {
    B.poly([[x - 5, gy], [x + 5, gy], [x + 3, gy - h], [x - 1, gy - h - 4], [x - 4, gy - h]], col);
    B.line(x - 2, gy - 2, x - 1, gy - h, PT.mix(col, 0xffffff, 0.6), 1);
  }

  /* ---------------------------------------------------------- the list
     w: footprint in pixels. h: how tall the painting is. fx: what it does.
     where: 'out' on the moon, 'in' in the cave, 'up' an upgrade. */
  const L = [];
  function add(o) { L.push(o); }

  // =========================================================== INDUSTRY
  const MINER_ORE = [[1, 2], [2, 3], [4, 5, 6], [7, 8, 9]];
  [['AUTO MINER', 0x6a8ad8, 2400], ['BIG AUTO MINER', 0x3aa86a, 18000], ['DEEP CORE MINER', 0xd8883a, 90000], ['QUANTUM DRILL RIG', 0xa86ae8, 420000]].forEach(([nm, col, pr], i) => {
    add({ id: 'miner' + (i + 1), name: nm, cat: 'INDUSTRY', price: pr, w: 40 + i * 6, h: 60 + i * 10,
      desc: 'DIGS YOUR OWN MOON. ORE GOES STRAIGHT IN THE VAULT.', fx: { ore: MINER_ORE[i], every: 22 - i * 3 },
      paint(B, cx, gy) {
        const H = (60 + i * 10) * HD, C = R(col);
        B.rect(cx - 30 - i * 6, gy - 10, 60 + i * 12, 10, 0x3a3e4e);
        for (const s of [-1, 1]) B.line(cx + s * (22 + i * 4), gy - 10, cx + s * 6, gy - H + 20, METAL[2], 4);
        B.line(cx - 22 - i * 4, gy - 40, cx + 22 + i * 4, gy - 40, METAL[2], 3);
        panel(B, cx - 14, gy - H + 4, 28, 30, C);
        B.rect(cx - 8, gy - H + 12, 16, 8, 0x0a1a2a); B.rect(cx - 6, gy - H + 14, 4, 4, 0x7dff9a);
        B.block(cx + 18, gy - 34, 22 + i * 3, 24, DARKM, 4, 3);
        B.rect(cx - 4, gy - H + 34, 8, H - 50, METAL[0]); B.rect(cx - 4, gy - H + 34, 2, H - 50, METAL[1]);
      },
      live(ctx, t, o) {
        const hh = 60 + i * 10, bob = Math.abs(Math.sin(t * 6 + o.x)) * 3;
        // the bit, turning, going in and out of the ground
        for (let k = 0; k < 4; k++) X.rect(ctx, -4, -14 + bob + k * 3 - ((t * 20) % 3), 8, 1, k % 2 ? '#ffd34d' : '#8a6a1a');
        X.poly(ctx, [[-5, -8 + bob], [5, -8 + bob], [0, 2 + bob]], '#c8ccd8');
        if (Math.sin(t * 6 + o.x) > 0.8) for (let k = 0; k < 3; k++) X.rect(ctx, -6 + k * 5, -2 - Math.random() * 6, 1, 1, '#ffd34d');
        X.blob(ctx, 0, -hh + 8, 2, 2, Math.sin(t * 4) > 0 ? '#7dff9a' : '#2a5a3a');
      } });
  });
  [['ORE FACTORY', 0xc8583a, 30000, 1], ['MEGA ORE FACTORY', 0x8a3ac8, 160000, 2]].forEach(([nm, col, pr, lv]) => {
    add({ id: 'factory' + lv, name: nm, cat: 'INDUSTRY', price: pr, w: 70 + lv * 10, h: 64 + lv * 8,
      desc: 'SELLS ORE OUT OF YOUR VAULT FOR YOU, A BIT OVER THE ODDS.', fx: { sell: 1, every: 18 - lv * 6, markup: 0.04 * lv },
      paint(B, cx, gy) {
        const w = (70 + lv * 10) * HD, h = (44 + lv * 6) * HD, C = R(col);
        panel(B, cx - w / 2, gy - h, w * 0.66, h, C);
        B.block(cx + w * 0.16, gy - h * 0.7, w * 0.34, h * 0.7, R(PT.mul(col, 0.8)), 6, 4);
        for (let k = 0; k < 3; k++) B.poly([[cx - w / 2 + k * 30, gy - h], [cx - w / 2 + 30 + k * 30, gy - h], [cx - w / 2 + 30 + k * 30, gy - h - 18]], PT.mul(col, 1.15));
        B.rect(cx - w / 2 + 70, gy - h - 60, 14, 60, DARKM[0]); B.rect(cx - w / 2 + 68, gy - h - 64, 18, 6, DARKM[1]);
        windows(B, cx - w / 2 + 10, gy - h + 20, 3 + lv, 1, 14, 12, 8, true);
        B.rect(cx - w / 2 - 10, gy - 16, w + 20, 6, 0x2a2e3c); B.rect(cx - w / 2 - 10, gy - 16, w + 20, 2, 0x5a6070);
        B.rect(cx + w * 0.2, gy - 40, 30, 40, 0x1a1a24);
      },
      live(ctx, t, o, n) {
        const w = 70 + lv * 10, h = 44 + lv * 6;
        for (let i = 0; i < 5; i++) {
          const f = ((t * 0.4 + i / 5) % 1);
          ctx.globalAlpha = (1 - f) * 0.5;
          X.blob(ctx, -w / 2 + 38 + Math.sin(f * 4 + i) * 4, -h - 32 - f * 40, 3 + f * 8, 2 + f * 6, '#b8b0c8');
        }
        ctx.globalAlpha = 1;
        for (let k = 0; k < 4; k++) { const bx = -w / 2 - 6 + ((t * 18 + k * 22) % (w + 12)); X.rect(ctx, bx, -12, 6, 4, '#c8a068'); }
        if (n > 0.3) { ctx.globalAlpha = n * 0.4; PT.glow(ctx, -w / 2 + 30, -h + 14, 30, '#ffd070', 0.5); ctx.globalAlpha = 1; }
      } });
  });
  [['ORE POLISHER', 0x3ab0c8, 12000, 0.06], ['GEM TUMBLER', 0xd8a83a, 60000, 0.10], ['LASER POLISHER', 0xe8408a, 240000, 0.16]].forEach(([nm, col, pr, v], i) => {
    add({ id: 'polish' + (i + 1), name: nm, cat: 'INDUSTRY', price: pr, w: 40 + i * 4, h: 40 + i * 6,
      desc: 'EVERY ROCK YOU SELL SELLS FOR MORE.', fx: { value: v },
      paint(B, cx, gy) {
        const C = R(col);
        B.block(cx - 34, gy - 20, 68, 20, DARKM, 4, 4);
        if (i === 2) { panel(B, cx - 22, gy - 70, 44, 50, C); B.disc(cx, gy - 50, 10, 0x1a1a24); B.disc(cx, gy - 50, 7, 0xff4a8a); }
        else { B.ball(cx, gy - 44, 26, 22, C); B.ellipse(cx, gy - 44, 12, 10, 0x1a1a24); for (let k = 0; k < 6; k++) B.rect(cx - 22 + k * 8, gy - 64, 2, 40, PT.mul(col, 0.8)); }
      },
      live(ctx, t, o) {
        if (i === 2) {
          const a = Math.sin(t * 3) * 0.6;
          ctx.globalAlpha = 0.7; X.line(ctx, 0, -25, Math.sin(a) * 30, -2, '#ff4a8a', 2); ctx.globalAlpha = 1;
          PT.glow(ctx, Math.sin(a) * 30, -2, 8, '#ff9ac8', 0.8);
        } else {
          for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.1; X.blob(ctx, Math.cos(a) * 5, -22 + Math.sin(a) * 4, 1.8, 1.8, ['#7ef9ff', '#ffd34d', '#ff7ac4'][k]); }
        }
      } });
  });
  // the five old base buildings, bonuses and all
  add({ id: 'refinery', name: 'REFINERY', cat: 'INDUSTRY', price: 16000, w: 56, h: 60, desc: 'ORE GOES IN DIRTY. EVERY SALE PAYS 12% MORE.', fx: { bonus: 'refinery', v: 0.12 },
    paint(B, cx, gy) {
      for (let k = 0; k < 3; k++) { B.round(cx - 46 + k * 30, gy - 80 + k * 10, 26, 80 - k * 10, 10, METAL[0]); B.rect(cx - 42 + k * 30, gy - 76 + k * 10, 4, 70 - k * 10, METAL[1]); }
      B.line(cx - 32, gy - 60, cx + 30, gy - 44, 0xd8a83a, 4);
    },
    live(ctx, t) { X.blob(ctx, 16, -48 - Math.abs(Math.sin(t * 5)) * 2, 2, 3, '#ff9a3a'); PT.glow(ctx, 16, -48, 8, '#ffb040', 0.5); } });
  add({ id: 'airfarm', name: 'AIR FARM', cat: 'INDUSTRY', price: 8000, w: 52, h: 46, desc: 'GREEN THINGS IN A DOME. +30 AIR ON EVERY DIVE.', fx: { bonus: 'airfarm', v: 30 },
    paint(B, cx, gy) {
      B.rect(cx - 46, gy - 10, 92, 10, DARKM[0]);
      B.ellipse(cx, gy - 10, 44, 40, 0x3a6a8a); B.ellipse(cx, gy - 12, 41, 37, 0x9ae0ff, 0.45);
      for (let k = 0; k < 7; k++) puff(B, cx - 30 + k * 10, gy - 20 - (k % 3) * 8, 7, LEAF);
      B.ellipse(cx - 18, gy - 34, 10, 6, 0xffffff, 0.5);
    } });
  add({ id: 'dronebay', name: 'DRONE BAY', cat: 'INDUSTRY', price: 24000, w: 60, h: 44, desc: 'THEY PICK UP WHAT YOU DROP. +26 PICKUP REACH.', fx: { bonus: 'dronebay', v: 26 },
    paint(B, cx, gy) { panel(B, cx - 56, gy - 60, 112, 60, METAL); B.round(cx - 34, gy - 44, 68, 44, 20, 0x1a1a24); for (let k = 0; k < 4; k++) B.rect(cx - 50 + k * 30, gy - 58, 14, 4, 0xffc44d); },
    live(ctx, t, o) {
      for (let k = 0; k < 2; k++) { const a = t * 1.4 + k * 3; const x = Math.cos(a) * 30, y = -52 + Math.sin(a * 2) * 8;
        X.plate(ctx, x - 4, y - 2, 8, 4, '#c8ccd8', null, null, 1); X.rect(ctx, x - 6, y - 4, 4, 1, '#8a92a8'); X.rect(ctx, x + 2, y - 4, 4, 1, '#8a92a8'); X.blob(ctx, x, y + 3, 1, 1, '#7dff9a'); }
    } });
  add({ id: 'mast', name: 'RADAR MAST', cat: 'INDUSTRY', price: 13000, w: 30, h: 90, desc: 'IT SEES THROUGH ROCK. +30% SCAN RANGE.', fx: { bonus: 'mast', v: 0.3 },
    paint(B, cx, gy) { for (const s of [-1, 1]) B.line(cx + s * 22, gy, cx + s * 4, gy - 160, METAL[2], 3); for (let k = 1; k < 6; k++) B.line(cx - 22 + k * 3.6, gy - k * 28, cx + 22 - k * 3.6, gy - k * 28, METAL[0], 2); },
    live(ctx, t) {
      const s = Math.cos(t * 1.5);
      X.poly(ctx, [[-14 * s, -84], [14 * s, -84], [10 * s, -96], [-10 * s, -96]], '#c8ccd8');
      X.blob(ctx, 0, -92, 2, 2, Math.sin(t * 5) > 0 ? '#ff5a4d' : '#5a2020');
    } });
  add({ id: 'reactor', name: 'REACTOR', cat: 'INDUSTRY', price: 30000, w: 54, h: 56, desc: 'IT HUMS. THE RAT WILL NOT GO NEAR IT. +12% DRILL.', fx: { bonus: 'reactor', v: 0.12 },
    paint(B, cx, gy) { B.round(cx - 40, gy - 90, 80, 90, 24, 0xd8dce8); B.round(cx - 34, gy - 84, 68, 78, 20, 0xb8bccc); B.rect(cx - 40, gy - 30, 80, 6, 0xffc44d); B.disc(cx, gy - 54, 14, 0x1a1a24); },
    live(ctx, t) { const p = 0.5 + 0.5 * Math.sin(t * 4); X.blob(ctx, 0, -27, 5 + p, 5 + p, '#7dff9a'); PT.glow(ctx, 0, -27, 20, '#7dff9a', 0.4 + p * 0.3); } });
  add({ id: 'solar', name: 'SOLAR PANELS', cat: 'INDUSTRY', price: 5000, w: 50, h: 26, desc: 'FREE MONEY WHEN THE SUN IS ON THEM. $6 EVERY 10 SECONDS.', fx: { cash: 6, every: 10, sunny: 1 },
    paint(B, cx, gy) { for (let k = 0; k < 2; k++) { B.line(cx - 24 + k * 48, gy, cx - 24 + k * 48, gy - 20, METAL[2], 2); B.poly([[cx - 46 + k * 48, gy - 18], [cx - 2 + k * 48, gy - 18], [cx + 2 + k * 48, gy - 44], [cx - 42 + k * 48, gy - 44]], 0x1a3a8a); for (let j = 0; j < 4; j++) B.line(cx - 44 + k * 48 + j * 11, gy - 18, cx - 40 + k * 48 + j * 11, gy - 44, 0x5a7ad8, 1); } } ,
    live(ctx, t, o, n) { if (n < 0.5) { const q = (t * 0.6 + o.x) % 3; if (q < 0.3) X.rect(ctx, -20 + q * 60, -18, 2, 2, '#ffffff'); } } });
  add({ id: 'windmill', name: 'SPACE WINDMILL', cat: 'INDUSTRY', price: 9000, w: 30, h: 90, desc: 'THERE IS NO WIND. IT TURNS ANYWAY. $8 EVERY 10 SECONDS.', fx: { cash: 8, every: 10 },
    paint(B, cx, gy) { B.poly([[cx - 10, gy], [cx + 10, gy], [cx + 5, gy - 140], [cx - 5, gy - 140]], 0xe8e8f4); B.rect(cx - 10, gy - 4, 20, 4, METAL[2]); },
    live(ctx, t) { const a = t * 1.8; for (let k = 0; k < 3; k++) { const b = a + k * U.TAU / 3; X.line(ctx, 0, -70, Math.cos(b) * 30, -70 + Math.sin(b) * 30, '#f4f4ff', 3); } X.blob(ctx, 0, -70, 3, 3, '#c8ccd8'); } });
  add({ id: 'silo', name: 'ORE SILO', cat: 'INDUSTRY', price: 7000, w: 30, h: 60, desc: 'ORE KEEPS BETTER IN A SILO. +3% ON EVERY SALE.', fx: { value: 0.03 },
    paint(B, cx, gy) { B.round(cx - 22, gy - 110, 44, 110, 8, 0xc8c0a8); B.rect(cx - 18, gy - 106, 6, 100, 0xe8e0c8); B.ellipse(cx, gy - 110, 22, 10, 0xa89878); for (let k = 0; k < 5; k++) B.rect(cx - 22, gy - 96 + k * 20, 44, 2, 0x8a7a5a); } });
  add({ id: 'bankvault', name: 'PIGGY BANK VAULT', cat: 'INDUSTRY', price: 50000, w: 50, h: 56, desc: 'PAYS INTEREST ON WHAT YOU HAVE. 1% EVERY FIVE MINUTES, UP TO $5K.', fx: { interest: 0.01, every: 300, cap: 5000 },
    paint(B, cx, gy) { B.ball(cx, gy - 44, 44, 38, [0xff9ac8, 0xffd0e8, 0xc85a8a], true); B.ellipse(cx + 40, gy - 48, 8, 10, 0xe87aa8); B.disc(cx + 42, gy - 48, 2, 0x8a2a5a); B.rect(cx - 10, gy - 84, 20, 4, 0x3a1a2a); for (const s of [-1, 1]) B.rect(cx + s * 22 - 5, gy - 10, 10, 10, 0xe87aa8); B.disc(cx + 18, gy - 58, 3, 0x1a1024); },
    live(ctx, t) { if (Math.sin(t * 2) > 0.7) { X.blob(ctx, 0, -46 - ((t * 20) % 10), 3, 3, '#ffd34d'); } } });
  add({ id: 'printer', name: 'MONEY PRINTER', cat: 'INDUSTRY', price: 140000, w: 40, h: 44, desc: 'EXTREMELY ILLEGAL. $40 EVERY 10 SECONDS. MR CHUM APPROVES.', fx: { cash: 40, every: 10 },
    paint(B, cx, gy) { panel(B, cx - 34, gy - 70, 68, 70, [0x3a8a4a, 0x6ac87a, 0x1a5a2a]); B.rect(cx - 26, gy - 60, 52, 8, 0x0a1a0a); B.rect(cx - 24, gy - 58, 30, 4, 0x7dff9a); B.rect(cx - 20, gy - 28, 40, 4, 0x1a1a1a); },
    live(ctx, t) { const f = (t * 1.2) % 1; X.rect(ctx, -9, -14 + f * 10, 18, 7, '#6ac86a'); X.rect(ctx, -2, -12 + f * 10, 4, 3, '#3a8a3a'); } });
  add({ id: 'dish', name: 'SATELLITE DISH', cat: 'INDUSTRY', price: 20000, w: 36, h: 50, desc: 'PICKS UP ABAY FASTER. +4% ON EVERY SALE.', fx: { value: 0.04 },
    paint(B, cx, gy) { B.rect(cx - 4, gy - 50, 8, 50, METAL[2]); B.ellipse(cx - 6, gy - 66, 30, 22, 0xd8dce8); B.ellipse(cx - 2, gy - 66, 22, 16, 0xa8b0c0); B.line(cx - 4, gy - 66, cx + 20, gy - 84, METAL[0], 2); },
    live(ctx, t) { X.blob(ctx, 10, -42, 2, 2, Math.sin(t * 6) > 0 ? '#7ef9ff' : '#1a4a5a'); } });

  // =========================================================== HOME: upgrades
  ['A PORCH', 'A TIN EXTENSION', 'A GLASS POD', 'A TOWER'].forEach((nm, i) => add({ id: 'house' + (i + 1), name: 'HOUSE: ' + nm, cat: 'HOME', where: 'up', up: 'house', tier: i + 1,
    price: [6000, 30000, 150000, 900000][i], w: 0, h: 0, desc: ['A PORCH AND A LANTERN. STILL A CAVE.', 'SOMEBODY BOLTED A SHED ON. IT HAS A CHIMNEY.', 'A GLASS BUBBLE ON THE ROOF WITH A VIEW.', 'YOU ARE RICH NOW. THE HOUSE SHOULD SAY SO.'][i] }));
  ['A MATTRESS', 'A REAL BED', 'A WATERBED', 'A KING BED'].forEach((nm, i) => add({ id: 'bed' + (i + 1), name: 'BED: ' + nm, cat: 'HOME', where: 'up', up: 'bed', tier: i + 1,
    price: [800, 4000, 20000, 120000][i], w: 0, h: 0, desc: ['NO MORE BOXES. SLEEP LIKE A PERSON.', 'WOOD. SHEETS. A PILLOW THAT IS NOT CARDBOARD.', 'IT SLOSHES. YOU WILL GET USED TO IT.', 'GOLD POSTS. TWO PILLOWS. ONE ALIEN.'][i] }));

  // =========================================================== FURNITURE (the cave)
  function inItem(id, name, price, w, h, desc, paint, live) { add({ id, name, cat: 'FURNITURE', where: 'in', price, w, h, desc, paint, live }); }
  inItem('tv', 'OLD TELLY', 900, 30, 34, 'SHOWS THE RACING. ONLY THE RACING.', (B, cx, gy) => { B.block(cx - 26, gy - 20, 52, 20, WOOD, 4); B.round(cx - 22, gy - 64, 44, 44, 5, 0x5a5a6a); B.round(cx - 18, gy - 60, 30, 32, 4, 0x1a2a3a); B.disc(cx + 17, gy - 52, 3, 0xc8c8d8); B.line(cx - 6, gy - 64, cx - 16, gy - 78, 0x8a8a9a, 1); B.line(cx + 2, gy - 64, cx + 10, gy - 80, 0x8a8a9a, 1); },
    (ctx, t) => { X.rect(ctx, -8, -29, 14, 14, ['#3a8ad8', '#7ad84a', '#d8a83a'][Math.floor(t * 1.5) % 3]); X.rect(ctx, -8 + ((t * 20) % 14), -22, 2, 2, '#ffffff'); PT.glow(ctx, -1, -22, 20, '#6ab0ff', 0.25); });
  inItem('arcade', 'ARCADE CABINET', 3500, 24, 50, 'ONE GAME. IT IS YOURS. YOU ARE STILL BAD AT IT.', (B, cx, gy) => { B.poly([[cx - 20, gy], [cx + 20, gy], [cx + 20, gy - 70], [cx + 14, gy - 100], [cx - 20, gy - 100]], 0x6a3ac8); B.rect(cx - 16, gy - 90, 28, 26, 0x0a0a14); B.rect(cx - 20, gy - 62, 40, 10, 0x3a1a8a); B.disc(cx - 8, gy - 57, 3, 0xff4a4a); B.disc(cx + 4, gy - 57, 2, 0xffd34d); B.rect(cx - 20, gy - 100, 34, 6, 0xffd34d); },
    (ctx, t) => { const x = Math.sin(t * 3) * 6; X.rect(ctx, -6 + x, -38, 3, 3, '#7dff9a'); X.rect(ctx, -2 - x, -42, 2, 2, '#ff5a8a'); PT.glow(ctx, -1, -39, 16, '#a86aff', 0.3); });
  inItem('beanbag', 'BEAN BAG', 600, 26, 18, 'YOU SIT IN IT AND IT EATS YOU. LOVELY.', (B, cx, gy) => { B.ball(cx, gy - 14, 26, 16, [0xe8583a, 0xff8a6a, 0xa83a2a], true); B.ellipse(cx - 4, gy - 22, 12, 5, 0xc8482a); });
  inItem('lavalamp', 'LAVA LAMP', 700, 12, 30, 'THE BLOBS GO UP. THE BLOBS COME DOWN.', (B, cx, gy) => { B.poly([[cx - 8, gy], [cx + 8, gy], [cx + 5, gy - 10], [cx - 5, gy - 10]], 0xc8a040); B.poly([[cx - 6, gy - 10], [cx + 6, gy - 10], [cx + 9, gy - 44], [cx - 9, gy - 44]], 0x3a1a5a); B.poly([[cx - 6, gy - 44], [cx + 6, gy - 44], [cx + 3, gy - 54], [cx - 3, gy - 54]], 0xc8a040); },
    (ctx, t) => { for (let k = 0; k < 3; k++) { const y = -8 - ((t * (4 + k) + k * 7) % 16); X.blob(ctx, Math.sin(t + k) * 1.5, y, 2.2, 2.6, '#ff6a3a'); } PT.glow(ctx, 0, -14, 18, '#ff6a3a', 0.3); });
  inItem('aquarium', 'FISH TANK', 2600, 40, 34, 'THREE FISH. YOU HAVE NAMED ALL OF THEM DAVE.', (B, cx, gy) => { B.block(cx - 36, gy - 14, 72, 14, WOOD, 4); B.rect(cx - 34, gy - 60, 68, 46, 0x1a4a7a); B.rect(cx - 34, gy - 60, 68, 3, 0x5a6a7a); B.rect(cx - 30, gy - 22, 60, 6, 0xc8a060); for (let k = 0; k < 3; k++) B.rect(cx - 22 + k * 18, gy - 34, 2, 12, 0x3a8a4a); },
    (ctx, t) => { for (let k = 0; k < 3; k++) { const x = -12 + ((t * (6 + k * 2) + k * 9) % 28), y = -22 + k * 5; X.blob(ctx, x, y, 2.4, 1.6, ['#ffb03d', '#ff5a8a', '#7ef9ff'][k]); } X.rect(ctx, -14 + ((t * 5) % 4), -16 - ((t * 9) % 12), 1, 1, '#ffffff'); PT.glow(ctx, 0, -20, 22, '#4ab0ff', 0.2); });
  inItem('bookshelf', 'BOOKSHELF', 1200, 30, 50, 'NINE BOOKS ABOUT ROCKS. ONE ABOUT SHARKS. HE WROTE IT.', (B, cx, gy) => { B.block(cx - 26, gy - 100, 52, 100, WOOD, 4, 4); for (let j = 0; j < 3; j++) { B.rect(cx - 22, gy - 92 + j * 30, 44, 26, 0x2a1a10); for (let k = 0; k < 6; k++) B.rect(cx - 20 + k * 7, gy - 88 + j * 30 + (k % 2) * 2, 5, 22 - (k % 2) * 2, [0xc83a3a, 0x3a6ac8, 0xd8a83a, 0x3aa86a][(k + j) % 4]); } });
  inItem('rug', 'FLUFFY RUG', 500, 50, 4, 'FLUFFY. THE RAT HAS ALREADY CLAIMED IT.', (B, cx, gy) => { B.ellipse(cx, gy - 3, 50, 5, 0xe87aa8); B.ellipse(cx, gy - 3, 40, 3, 0xff9ac8); for (let k = 0; k < 12; k++) B.rect(cx - 48 + k * 8, gy - 1, 2, 3, 0xffc0d8); });
  inItem('teddy', 'GIANT TEDDY', 1400, 26, 36, 'BIGGER THAN YOU. HUGS BACK IF YOU ASK NICELY.', (B, cx, gy) => { B.ball(cx, gy - 24, 22, 22, [0xc8905a, 0xe8b07a, 0x8a5a34]); B.ball(cx, gy - 58, 16, 15, [0xc8905a, 0xe8b07a, 0x8a5a34]); for (const s of [-1, 1]) { B.disc(cx + s * 12, gy - 70, 6, 0xc8905a); B.disc(cx + s * 12, gy - 70, 3, 0xe8a0a0); B.disc(cx + s * 6, gy - 60, 2, 0x1a1024); } B.ellipse(cx, gy - 52, 6, 4, 0xe8c8a8); B.disc(cx, gy - 54, 2, 0x3a1a1a); B.rect(cx - 10, gy - 44, 20, 4, 0xd83a4a); });
  inItem('toybot', 'TOY ROBOT', 1800, 16, 24, 'WINDS UP. WALKS INTO THE WALL. WINDS UP.', (B, cx, gy) => { panel(B, cx - 12, gy - 30, 24, 22, METAL); B.rect(cx - 10, gy - 8, 6, 8, METAL[2]); B.rect(cx + 4, gy - 8, 6, 8, METAL[2]); panel(B, cx - 9, gy - 46, 18, 14, METAL); B.rect(cx - 6, gy - 42, 4, 3, 0xff4a4a); B.rect(cx + 2, gy - 42, 4, 3, 0xff4a4a); B.line(cx, gy - 46, cx, gy - 52, METAL[2], 1); },
    (ctx, t) => { X.blob(ctx, 0, -26, 1.5, 1.5, Math.sin(t * 6) > 0 ? '#ffd34d' : '#5a4a1a'); X.rect(ctx, 6, -16 + Math.sin(t * 8) * 2, 3, 1, '#c8ccd8'); });
  inItem('rubberduck', 'RUBBER DUCK (HUGE)', 900, 22, 24, 'IT SQUEAKS. NOBODY KNOWS HOW. IT HAS NO SQUEAKER.', (B, cx, gy) => { B.ball(cx, gy - 14, 20, 13, [0xffd34d, 0xfff0a0, 0xc89a1e], true); B.ball(cx + 10, gy - 34, 11, 11, [0xffd34d, 0xfff0a0, 0xc89a1e], true); B.poly([[cx + 18, gy - 34], [cx + 30, gy - 32], [cx + 18, gy - 28]], 0xff8a2a); B.disc(cx + 12, gy - 38, 2, 0x1a1024); });
  inItem('disco', 'DISCO BALL', 2200, 20, 40, 'EVERY NIGHT IS A PARTY IF YOU ARE BRAVE.', (B, cx, gy) => { B.rect(cx - 1, gy - 80, 2, 50, 0x8a8a9a); B.rect(cx - 16, gy - 4, 32, 4, 0x3a3a4a); B.rect(cx - 1, gy - 30, 2, 26, 0x3a3a4a); },
    (ctx, t) => { const y = -40; X.blob(ctx, 0, y, 7, 7, '#c8ccd8'); for (let k = 0; k < 6; k++) { const a = t * 2 + k; X.rect(ctx, Math.cos(a) * 5 - 1, y + Math.sin(a * 1.3) * 5 - 1, 2, 2, '#ffffff'); }
      for (let k = 0; k < 5; k++) { const a = t * 1.3 + k * 1.3; ctx.globalAlpha = 0.25; X.blob(ctx, Math.cos(a) * 60, -10 + Math.sin(a * 0.7) * 20, 3, 3, ['#ff5a8a', '#7ef9ff', '#ffd34d', '#8aff9a', '#b08aff'][k]); } ctx.globalAlpha = 1; });
  inItem('gamingpc', 'GAMING PC', 6000, 30, 40, 'RGB. ALL OF IT RGB. IT RUNS THE CALCULATOR AT 900 FPS.', (B, cx, gy) => { B.block(cx - 28, gy - 12, 56, 12, WOOD, 3); B.round(cx - 24, gy - 60, 30, 46, 3, 0x1a1a24); B.rect(cx - 20, gy - 56, 22, 38, 0x2a2a3a); B.round(cx + 8, gy - 48, 20, 16, 2, 0x1a1a24); B.rect(cx + 10, gy - 46, 16, 11, 0x0a2a4a); },
    (ctx, t) => { const c = ['#ff5a8a', '#7ef9ff', '#ffd34d', '#8aff9a', '#b08aff'][Math.floor(t * 3) % 5]; X.rect(ctx, -9, -27, 2, 18, c); X.rect(ctx, -3, -27, 2, 18, c); X.rect(ctx, 6, -23, 7, 5, '#3a8ad8'); PT.glow(ctx, -5, -18, 16, c, 0.35); });
  inItem('hammock', 'HAMMOCK', 1100, 44, 30, 'STRUNG BETWEEN TWO ROCKS. SWINGS WHEN YOU BREATHE.', (B, cx, gy) => { for (const s of [-1, 1]) B.line(cx + s * 40, gy, cx + s * 40, gy - 50, WOOD[0], 4); },
    (ctx, t) => { const sw = Math.sin(t * 1.2) * 2; X.curve(ctx, -20, -24, sw, -8, 20, -24, '#e8583a', 3, 12); X.line(ctx, -20, -24, -20, -25, '#8a5a34', 1); });
  inItem('piano', 'TOY PIANO', 1600, 30, 26, 'EIGHT KEYS. PLAYS ONE SONG. BADLY.', (B, cx, gy) => { B.block(cx - 28, gy - 30, 56, 30, [0xd83a4a, 0xff6a7a, 0x8a1a2a], 5, 4); B.rect(cx - 24, gy - 26, 48, 10, 0xffffff); for (let k = 0; k < 8; k++) B.rect(cx - 22 + k * 6, gy - 26, 1, 10, 0x3a3a4a); for (let k = 0; k < 5; k++) B.rect(cx - 20 + k * 9, gy - 26, 3, 6, 0x1a1a24); } );
  inItem('plantpot', 'HOUSE PLANT', 400, 16, 30, 'IT IS ALIVE. THAT MAKES TWO OF YOU.', (B, cx, gy) => { B.poly([[cx - 10, gy], [cx + 10, gy], [cx + 12, gy - 18], [cx - 12, gy - 18]], 0xc86a3a); for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.4; B.ellipse(cx + Math.cos(a) * 12, gy - 30 + Math.sin(a) * 14, 5, 8, k % 2 ? LEAF[0] : LEAF[1]); } } ,
    (ctx, t) => {});
  inItem('minifridge', 'MINI FRIDGE', 1300, 18, 26, 'COLD. FULL OF CHEESE. BRENDA KNOWS.', (B, cx, gy) => { B.round(cx - 16, gy - 50, 32, 50, 4, 0xe8e8f0); B.rect(cx - 16, gy - 30, 32, 2, 0xa8a8b8); B.rect(cx + 8, gy - 44, 3, 10, 0x8a8a9a); B.rect(cx - 10, gy - 44, 8, 6, 0xffd34d); } );
  inItem('trophies', 'TROPHY SHELF', 3000, 30, 30, 'EVERY PLANET YOU BROKE, IN LITTLE GOLD CUPS.', (B, cx, gy) => { B.block(cx - 28, gy - 12, 56, 12, WOOD, 3); for (let k = 0; k < 3; k++) { const x = cx - 18 + k * 18; B.rect(x - 4, gy - 16, 8, 4, 0xc8901e); B.rect(x - 1, gy - 26, 2, 10, 0xffd34d); B.ellipse(x, gy - 30, 7, 6, 0xffd34d); B.ellipse(x - 2, gy - 32, 2, 2, 0xfff0a0); } },
    (ctx, t) => { if (Math.sin(t * 2) > 0.8) X.rect(ctx, -9 + ((t * 7) % 18), -16, 1, 1, '#ffffff'); });
  inItem('neonin', 'NEON SIGN: HOME', 1500, 30, 20, 'IT SAYS HOME. IN CASE YOU FORGET.', (B, cx, gy) => { B.rect(cx - 2, gy - 20, 4, 20, 0x3a3a4a); B.round(cx - 30, gy - 44, 60, 24, 4, 0x1a1024); },
    (ctx, t) => { const on = Math.sin(t * 13) > -0.8; F.draw(ctx, 'HOME', 0, -20, on ? '#ff7ac4' : '#4a1a3a', { center: true, shadow: false }); if (on) PT.glow(ctx, 0, -16, 24, '#ff7ac4', 0.35); });
  inItem('fireplace', 'FIREPLACE', 4200, 40, 40, 'IN A CAVE. ON A MOON. WITH NO AIR. IT WORKS. DO NOT ASK.', (B, cx, gy) => { B.block(cx - 38, gy - 80, 76, 80, [0x8a5a4a, 0xb07a6a, 0x5a3a2a], 8, 4); B.rect(cx - 24, gy - 44, 48, 44, 0x1a0a0a); B.rect(cx - 42, gy - 82, 84, 6, 0x6a4a3a); } ,
    (ctx, t) => { for (let k = 0; k < 4; k++) { const h = 6 + Math.abs(Math.sin(t * 7 + k)) * 6; X.poly(ctx, [[-8 + k * 5, -1], [-4 + k * 5, -1], [-6 + k * 5, -1 - h]], k % 2 ? '#ffb040' : '#ff6a2a'); } PT.glow(ctx, 0, -8, 30, '#ff8a3a', 0.4); });

  // =========================================================== FUN
  add({ id: 'coaster', name: 'ROLLER COASTER', cat: 'FUN', price: 220000, w: 190, h: 110, ride: 'coaster', fun: 5,
    desc: 'A REAL ONE, WITH A LOOP. PRESS E TO RIDE IT. HOLD UP TO GO FASTER.',
    paint(B, cx, gy) {
      // the station: a little roofed platform at the start
      B.block(cx - 190, gy - 24, 50, 24, WOOD, 5, 3);
      B.poly([[cx - 196, gy - 44], [cx - 134, gy - 44], [cx - 144, gy - 56], [cx - 186, gy - 56]], 0xd83a4a);
      B.rect(cx - 188, gy - 44, 4, 20, WOOD[2]); B.rect(cx - 146, gy - 44, 4, 20, WOOD[2]);
    } });
  add({ id: 'pool', name: 'SWIMMING POOL', cat: 'FUN', price: 26000, w: 90, h: 14, water: 0x38a8e8, depth: 14, fun: 2,
    desc: 'DUG INTO THE MOON. JUMP IN. PUT FLOATIES IN IT.',
    paint(B, cx, gy) { B.rect(cx - 94, gy - 6, 188, 8, 0xe8e8f0); for (let k = 0; k < 16; k++) B.rect(cx - 92 + k * 12, gy - 6, 1, 8, 0xa8b0c0); waterBox(B, cx - 88, cx + 88, gy + 2, 26, 0x38a8e8); B.rect(cx + 70, gy - 30, 3, 28, METAL[1]); B.rect(cx + 80, gy - 30, 3, 28, METAL[1]); for (let k = 0; k < 3; k++) B.rect(cx + 70, gy - 24 + k * 8, 13, 2, METAL[1]); } });
  add({ id: 'hottub', name: 'HOT TUB', cat: 'FUN', price: 14000, w: 50, h: 18, water: 0x5ac8e8, depth: 10, fun: 2, desc: 'WARM. BUBBLY. FULL OF SPACE DUST. YOU WILL LOVE IT.',
    paint(B, cx, gy) { B.block(cx - 50, gy - 30, 100, 30, WOOD, 6, 4); waterBox(B, cx - 42, cx + 42, gy - 22, 14, 0x5ac8e8); },
    live(ctx, t) { for (let k = 0; k < 6; k++) { const q = (t * 0.8 + k / 6) % 1; ctx.globalAlpha = 1 - q; X.blob(ctx, -18 + k * 7, -12 - q * 18, 1.5 + q * 3, 1.5 + q * 2, '#ffffff'); } ctx.globalAlpha = 1; } });
  [['floatshark', 'SHARK FLOATIE', 'shark', 3000, 'HE WOULD BE FLATTERED. HE WOULD ALSO BE FURIOUS.'], ['floatduck', 'DUCK FLOATIE', 'duck', 1800, 'QUACK, IN SPACE.'],
   ['floatdonut', 'DONUT FLOATIE', 'donut', 1600, 'NOT EDIBLE. BRENDA HAS CHECKED.'], ['floatflamingo', 'FLAMINGO FLOATIE', 'flamingo', 2200, 'STANDS ON ONE LEG. FLOATS ON NO LEGS.']].forEach(([id, nm, k, pr, d]) => add({
    id, name: nm, cat: 'FUN', price: pr, w: 30, h: 36, floatie: 1, fun: 1, desc: d + ' GOES IN WATER.',
    paint(B, cx, gy) { floatie(B, cx, gy, k); } }));
  add({ id: 'trampoline', name: 'TRAMPOLINE', cat: 'FUN', price: 5000, w: 44, h: 16, bounce: 1, fun: 1, desc: 'JUMP ON IT. GO VERY HIGH. LOW GRAVITY HELPS.',
    paint(B, cx, gy) { for (let k = 0; k < 4; k++) B.line(cx - 40 + k * 26, gy, cx - 36 + k * 24, gy - 16, METAL[2], 3); B.ellipse(cx, gy - 18, 44, 6, 0x3a3a4a); B.ellipse(cx, gy - 18, 38, 4, 0x1a1a24); B.ellipse(cx, gy - 18, 44, 6, 0x3a6ad8, 0.4); } });
  add({ id: 'cannon', name: 'HUMAN CANNON', cat: 'FUN', price: 16000, w: 40, h: 40, ride: 'cannon', fun: 2, desc: 'CLIMB IN. PRESS E. SEE YOU ON THE OTHER SIDE OF THE MOON.',
    paint(B, cx, gy) { B.block(cx - 30, gy - 16, 60, 16, WOOD, 4); B.disc(cx - 14, gy - 10, 10, 0x5a3a20); B.disc(cx + 14, gy - 10, 10, 0x5a3a20); B.disc(cx - 14, gy - 10, 4, 0x8a5a34); B.disc(cx + 14, gy - 10, 4, 0x8a5a34); } ,
    live(ctx, t) { ctx.save(); ctx.translate(0, -14); ctx.rotate(-0.8); X.plate(ctx, -4, -30, 12, 30, '#3a3a4a', '#6a6a7a', '#1a1a24', 3); X.rect(ctx, -4, -30, 12, 3, '#d83a4a'); ctx.restore(); } });
  add({ id: 'slide', name: 'GIANT SLIDE', cat: 'FUN', price: 9000, w: 70, h: 70, ride: 'slide', fun: 2, desc: 'UP THE LADDER. DOWN THE SLIDE. SCREAM IF YOU LIKE.',
    paint(B, cx, gy) { B.rect(cx - 60, gy - 130, 4, 130, METAL[0]); B.rect(cx - 44, gy - 130, 4, 130, METAL[0]); for (let k = 0; k < 10; k++) B.rect(cx - 60, gy - 12 - k * 12, 20, 2, METAL[1]); B.rect(cx - 64, gy - 134, 28, 6, 0xffd34d);
      for (let k = 0; k < 40; k++) { const q = k / 40; const x = cx - 40 + q * 100, y = gy - 130 + Math.pow(q, 1.6) * 124; B.rect(x, y, 5, 8, 0x3ab0e8); B.rect(x, y, 5, 2, 0x8ae0ff); } } });
  add({ id: 'swing', name: 'SWING SET', cat: 'FUN', price: 3000, w: 50, h: 50, fun: 1, desc: 'IT SWINGS ON ITS OWN. THAT IS NORMAL. PROBABLY.',
    paint(B, cx, gy) { for (const s of [-1, 1]) { B.line(cx + s * 44, gy, cx + s * 30, gy - 96, 0xd83a4a, 4); B.line(cx + s * 16, gy, cx + s * 30, gy - 96, 0xd83a4a, 4); } B.rect(cx - 34, gy - 98, 68, 5, 0xd83a4a); },
    live(ctx, t) { for (const s of [-1, 1]) { const a = Math.sin(t * 1.6 + s) * 0.5; const x = s * 8 + Math.sin(a) * 30, y = -48 + Math.cos(a) * 30 + 12; X.line(ctx, s * 8, -48, x, y, '#8a8a9a', 1); X.rect(ctx, x - 5, y, 10, 2, '#8a5a34'); } } });
  add({ id: 'ferris', name: 'FERRIS WHEEL', cat: 'FUN', price: 120000, w: 90, h: 120, ride: 'ferris', fun: 4, desc: 'ROUND AND ROUND AND UP. PRESS E TO RIDE. THE VIEW IS YOUR MOON.',
    paint(B, cx, gy) { for (const s of [-1, 1]) B.line(cx + s * 50, gy, cx, gy - 140, METAL[2], 5); B.block(cx - 30, gy - 16, 60, 16, WOOD, 4); },
    live(ctx, t, o) {
      const cy = -70, rr = 48, a0 = o.spin !== undefined ? o.spin : t * 0.3;
      X.ring(ctx, 0, cy, rr, '#c8ccd8', 2);
      for (let k = 0; k < 8; k++) { const a = a0 + k * U.TAU / 8; X.line(ctx, 0, cy, Math.cos(a) * rr, cy + Math.sin(a) * rr, '#8a92a8', 1); }
      for (let k = 0; k < 8; k++) { const a = a0 + k * U.TAU / 8; const x = Math.cos(a) * rr, y = cy + Math.sin(a) * rr; X.plate(ctx, x - 6, y, 12, 9, ['#ff5a8a', '#7ef9ff', '#ffd34d', '#8aff9a'][k % 4], null, '#1a1a24', 2); X.rect(ctx, x - 4, y + 2, 8, 3, '#1a2a3a'); }
      X.blob(ctx, 0, cy, 5, 5, '#ffd34d');
    } });
  add({ id: 'carousel', name: 'CAROUSEL', cat: 'FUN', price: 60000, w: 70, h: 70, fun: 3, desc: 'LITTLE HORSES. WELL -- LITTLE SHARKS. HE INSISTED.',
    paint(B, cx, gy) { B.ellipse(cx, gy - 6, 66, 8, 0xd8a83a); B.rect(cx - 3, gy - 120, 6, 114, 0xffd34d); B.poly([[cx - 70, gy - 100], [cx + 70, gy - 100], [cx, gy - 140]], 0xd83a4a); for (let k = 0; k < 8; k++) B.poly([[cx - 70 + k * 17.5, gy - 100], [cx - 61 + k * 17.5, gy - 100], [cx - 65 + k * 17.5, gy - 92]], k % 2 ? 0xffffff : 0xd83a4a); },
    live(ctx, t) { for (let k = 0; k < 4; k++) { const a = t * 0.8 + k * U.TAU / 4; const x = Math.cos(a) * 28, dz = Math.sin(a); if (dz < 0) continue; const y = -24 + Math.sin(t * 3 + k) * 4; X.line(ctx, x, -50, x, y, '#ffd34d', 1); X.blob(ctx, x, y, 7 * (0.7 + dz * 0.3), 4, '#7aa8e8'); X.poly(ctx, [[x - 1, y - 3], [x + 3, y - 3], [x + 1, y - 9]], '#5a88c8'); } } });
  add({ id: 'bouncy', name: 'BOUNCY CASTLE', cat: 'FUN', price: 12000, w: 70, h: 50, bounce: 1, fun: 2, desc: 'WOBBLES. BOUNCES. SMELLS OF FEET.',
    paint(B, cx, gy) { B.round(cx - 66, gy - 40, 132, 40, 10, 0xff6a9a); B.rect(cx - 60, gy - 36, 120, 4, 0xff9ac0); for (let k = 0; k < 4; k++) { B.round(cx - 66 + k * 38, gy - 90, 26, 54, 8, [0xffd34d, 0x6ac8ff, 0x8aff9a, 0xb08aff][k]); B.ball(cx - 53 + k * 38, gy - 94, 12, 10, R([0xffd34d, 0x6ac8ff, 0x8aff9a, 0xb08aff][k])); } B.round(cx - 20, gy - 32, 40, 32, 16, 0x1a1024); } });
  add({ id: 'seesaw', name: 'SEESAW', cat: 'FUN', price: 2000, w: 56, h: 24, fun: 1, desc: 'NEEDS TWO. YOU HAVE BRENDA. SHE WEIGHS MORE.',
    paint(B, cx, gy) { B.poly([[cx - 10, gy], [cx + 10, gy], [cx, gy - 18]], 0xd83a4a); },
    live(ctx, t) { const a = Math.sin(t * 1.4) * 0.25; ctx.save(); ctx.translate(0, -9); ctx.rotate(a); X.plate(ctx, -28, -2, 56, 4, '#3ab0e8', '#8ae0ff', '#1a5a8a', 1); ctx.restore(); } });
  add({ id: 'telescope', name: 'TELESCOPE', cat: 'FUN', price: 7000, w: 26, h: 44, fun: 1, desc: 'LOOK AT PLANETS. PICK WHICH ONE TO RUIN NEXT.',
    paint(B, cx, gy) { for (const s of [-1, 0, 1]) B.line(cx, gy - 40, cx + s * 20, gy, WOOD[0], 3); B.round(cx - 30, gy - 70, 44, 14, 6, 0x3a5aa8); B.round(cx - 34, gy - 72, 12, 18, 4, 0xd8a83a); } });
  add({ id: 'bbq', name: 'BARBECUE', cat: 'FUN', price: 2500, w: 30, h: 30, fun: 1, desc: 'GRILLS SPACE SAUSAGES. DO NOT ASK WHAT THEY ARE MADE OF.',
    paint(B, cx, gy) { for (const s of [-1, 1]) B.line(cx + s * 12, gy, cx + s * 6, gy - 28, 0x3a3a4a, 2); B.ellipse(cx, gy - 34, 22, 12, 0x2a2a34); B.rect(cx - 22, gy - 38, 44, 2, 0x8a8a9a); },
    live(ctx, t) { for (let k = 0; k < 4; k++) X.rect(ctx, -8 + k * 5, -20, 4, 2, '#c85a2a'); for (let k = 0; k < 3; k++) { const q = (t * 0.5 + k / 3) % 1; ctx.globalAlpha = (1 - q) * 0.5; X.blob(ctx, -4 + k * 4 + Math.sin(t + k) * 3, -24 - q * 26, 2 + q * 5, 2 + q * 4, '#c8c0d0'); } ctx.globalAlpha = 1; } });
  add({ id: 'sandpit', name: 'MOON SANDPIT', cat: 'FUN', price: 1200, w: 50, h: 14, fun: 1, desc: 'IT IS JUST THE MOON, BUT IN A BOX. PEOPLE LOVE IT.',
    paint(B, cx, gy) { B.block(cx - 48, gy - 14, 96, 14, WOOD, 3); B.ellipse(cx, gy - 12, 44, 5, 0xe8d8a8); B.ball(cx + 18, gy - 16, 8, 6, [0xd83a4a, 0xff6a7a, 0x8a1a2a]); B.rect(cx - 20, gy - 24, 2, 10, 0x3a6ad8); } });
  add({ id: 'racetrack', name: 'GO-KART TRACK', cat: 'FUN', price: 80000, w: 120, h: 30, fun: 3, desc: 'A LITTLE TRACK WITH LITTLE KARTS. THE KARTS DRIVE THEMSELVES.',
    paint(B, cx, gy) { B.ellipse(cx, gy - 10, 118, 14, 0x3a3a44); B.ellipse(cx, gy - 10, 96, 7, 0x6aa84a); for (let k = 0; k < 20; k++) B.rect(cx - 118 + k * 12, gy - 3, 6, 3, k % 2 ? 0xffffff : 0xd83a4a); },
    live(ctx, t) { for (let k = 0; k < 3; k++) { const a = t * (1.2 + k * 0.2) + k * 2; const x = Math.cos(a) * 52, y = -5 + Math.sin(a) * 5; X.plate(ctx, x - 5, y - 4, 10, 5, ['#ff5a4d', '#3a8ad8', '#ffd34d'][k], null, null, 1); X.blob(ctx, x, y - 5, 2, 2, '#ffe0c0'); } } });

  // =========================================================== NATURE
  add({ id: 'mtn1', name: 'SMALL MOUNTAIN', cat: 'NATURE', price: 4000, w: 70, h: 44, desc: 'A HILL WITH AMBITION.', paint(B, cx, gy) { mountain(B, cx, gy, 140, 86, false); } });
  add({ id: 'mtn2', name: 'BIG MOUNTAIN', cat: 'NATURE', price: 15000, w: 110, h: 80, desc: 'YOU MADE A MOUNTAIN. ON A MOON. OUT OF MOON.', paint(B, cx, gy) { mountain(B, cx, gy, 220, 158, false); } });
  add({ id: 'mtn3', name: 'SNOWY PEAK', cat: 'NATURE', price: 28000, w: 110, h: 90, desc: 'THERE IS SNOW ON TOP. NOBODY KNOWS WHERE IT CAME FROM.', paint(B, cx, gy) { mountain(B, cx, gy, 220, 178, true, [0x6a7aa8, 0x9aaad8, 0x3a4a78]); } });
  add({ id: 'volcano', name: 'VOLCANO', cat: 'NATURE', price: 60000, w: 110, h: 80, desc: 'A SMALL ONE. IT ONLY ERUPTS WHEN IT IS EXCITED.',
    paint(B, cx, gy) {
      rockMass(B, cx, gy, 220, 150, { crater: 1, seed: 31, pal: [0x1e1418, 0x33222a, 0x4c3434, 0x6a4a44, 0x8a6454] });
      // lava in the crater and three rivers of it running down
      B.ellipse(cx, gy - 136, 16, 4, 0xc83a1a); B.ellipse(cx, gy - 137, 12, 2.5, 0xffb03a);
      for (let k = 0; k < 3; k++) {
        let x = cx - 8 + k * 8;
        for (let y = gy - 136; y < gy - 30 - k * 14; y++) {
          x += Math.sin(y * 0.09 + k * 2) * 0.5 + (k - 1) * 0.35;
          const wd = 2.2 + Math.sin(y * 0.2 + k) * 0.8;
          for (let i = -wd; i <= wd; i++) B.set(Math.round(x + i), y, Math.abs(i) < 1 ? 0xffe070 : (Math.abs(i) < wd - 0.8 ? 0xff8a2a : 0xc83a1a));
        }
      }
      // glowing cracks
      for (let k = 0; k < 12; k++) { const x = cx - 60 + U.hash2(k, 3) * 120, y = gy - 16 - U.hash2(k, 4) * 80; B.line(x, y, x + 4 - U.hash2(k, 5) * 8, y + 6, 0xff6a2a, 1, 0.8); }
    },
    live(ctx, t) {
      PT.glow(ctx, 0, -68, 30, '#ff6a2a', 0.5 + Math.sin(t * 3) * 0.1);
      for (let k = 0; k < 6; k++) { const q = (t * 0.25 + k / 6) % 1; ctx.globalAlpha = (1 - q) * 0.55; X.blob(ctx, Math.sin(t + k) * 6 + q * 14, -72 - q * 56, 4 + q * 12, 3 + q * 9, q < 0.2 ? '#8a4a3a' : '#5a4a5a'); }
      ctx.globalAlpha = 1;
      // spits a spark now and then
      const q = (t * 0.6) % 1;
      if (Math.sin(t * 0.6 * Math.PI) > 0.2) for (let k = 0; k < 3; k++) X.rect(ctx, (k - 1) * 8 * q, -68 - Math.sin(q * Math.PI) * 30 + k * 2, 1, 1, '#ffd34d');
    } });
  add({ id: 'pond', name: 'POND', cat: 'NATURE', price: 6000, w: 60, h: 8, water: 0x3a8ad8, depth: 10, desc: 'A LITTLE POND. PUT A DUCK IN IT.',
    paint(B, cx, gy) { B.ellipse(cx, gy, 62, 10, 0x6a5a88); waterBox(B, cx - 56, cx + 56, gy + 1, 16, 0x3a8ad8); for (let k = 0; k < 3; k++) B.ellipse(cx - 30 + k * 26, gy - 1, 5, 2, 0x4aa84a); } });
  add({ id: 'lake', name: 'BIG LAKE', cat: 'NATURE', price: 30000, w: 130, h: 8, water: 0x2a7ac8, depth: 16, desc: 'A PROPER LAKE. ROOM FOR EVERY FLOATIE YOU OWN.',
    paint(B, cx, gy) { B.ellipse(cx, gy, 132, 12, 0x6a5a88); waterBox(B, cx - 126, cx + 126, gy + 1, 28, 0x2a7ac8); } });
  add({ id: 'lavalake', name: 'LAVA LAKE', cat: 'NATURE', price: 45000, w: 90, h: 8, water: 0xff6a2a, lava: 1, depth: 12, desc: 'DO NOT SWIM IN IT. FLOATIES WILL NOT HELP.',
    paint(B, cx, gy) { B.ellipse(cx, gy, 92, 10, 0x3a2020); waterBox(B, cx - 86, cx + 86, gy + 1, 20, 0xff6a2a); },
    live(ctx, t) { PT.glow(ctx, 0, 0, 50, '#ff6a2a', 0.35); for (let k = 0; k < 3; k++) { const q = (t * 0.7 + k * 0.3) % 1; X.blob(ctx, -30 + k * 30, 1 - q * 3, 2 * (1 - q) + 1, 1.5, '#ffd34d'); } } });
  const TREES = [
    ['tree1', 'PINE TREE', 1200, (B, cx, gy) => { trunk(B, cx, gy, 24, 8, WOOD); for (let k = 0; k < 4; k++) B.poly([[cx - 28 + k * 5, gy - 18 - k * 20], [cx + 28 - k * 5, gy - 18 - k * 20], [cx, gy - 58 - k * 20]], k % 2 ? 0x2a7a4a : 0x3a9a5a); }],
    ['tree2', 'PALM TREE', 1600, (B, cx, gy) => { for (let k = 0; k < 20; k++) B.rect(cx - 4 + Math.sin(k * 0.2) * 6, gy - k * 5, 8, 5, k % 2 ? 0x8a6a3a : 0xa8884a); for (let k = 0; k < 6; k++) { const a = -Math.PI + k * 0.6; B.line(cx + 6, gy - 100, cx + 6 + Math.cos(a) * 40, gy - 100 + Math.sin(a) * 18 + 18, LEAF[k % 2], 5); } B.ball(cx + 4, gy - 96, 5, 5, [0x6a4a2a, 0x8a6a3a, 0x3a2a1a]); }],
    ['tree3', 'CHERRY BLOSSOM', 3000, (B, cx, gy) => { trunk(B, cx, gy, 40, 8, [0x5a3a3a, 0x7a5a5a, 0x3a2020]); B.line(cx, gy - 36, cx - 20, gy - 56, 0x5a3a3a, 4); B.line(cx, gy - 36, cx + 22, gy - 60, 0x5a3a3a, 4); for (let k = 0; k < 9; k++) puff(B, cx - 34 + (k % 5) * 17, gy - 60 - Math.floor(k / 5) * 18 - (k % 2) * 6, 14, [0xffb0d0, 0xffe0ee, 0xd87aa0]); }],
    ['tree4', 'CRYSTAL TREE', 9000, (B, cx, gy) => { trunk(B, cx, gy, 36, 6, [0x6a6a9a, 0x9a9ac8, 0x3a3a6a]); for (let k = 0; k < 7; k++) crystal(B, cx - 30 + k * 10, gy - 34 - (k % 3) * 14, 26 + (k % 2) * 14, [0x7ef9ff, 0xa87cff, 0xff7ac4][k % 3]); }],
    ['tree5', 'GIANT MUSHROOM', 2600, (B, cx, gy) => { B.round(cx - 8, gy - 60, 16, 60, 6, 0xf0e8d8); B.ellipse(cx, gy - 62, 40, 22, 0xd83a4a); B.ellipse(cx, gy - 54, 40, 8, 0xf0e8d8); for (let k = 0; k < 6; k++) B.disc(cx - 26 + k * 10, gy - 70 - (k % 2) * 6, 4, 0xffffff); }],
    ['tree6', 'ALIEN CACTUS', 1800, (B, cx, gy) => { B.round(cx - 10, gy - 80, 20, 80, 10, 0x3aa86a); B.round(cx - 30, gy - 56, 12, 30, 6, 0x3aa86a); B.rect(cx - 22, gy - 34, 14, 8, 0x3aa86a); B.round(cx + 18, gy - 64, 12, 30, 6, 0x3aa86a); B.rect(cx + 8, gy - 42, 14, 8, 0x3aa86a); for (let k = 0; k < 8; k++) B.rect(cx - 6 + (k % 3) * 5, gy - 74 + k * 9, 1, 3, 0xe8ffe8); B.disc(cx, gy - 84, 5, 0xff7ac4); }]
  ];
  for (const [id, nm, pr, paint] of TREES) add({ id, name: nm, cat: 'NATURE', price: pr, w: 36, h: 70, desc: 'A TREE, ON A MOON. SWAYS WHEN NOTHING IS BLOWING.', paint, sway: 1 });
  add({ id: 'flowers', name: 'FLOWER BED', cat: 'NATURE', price: 800, w: 40, h: 16, desc: 'PRETTY. THEY TURN TO FOLLOW YOU. THAT IS NEW.',
    paint(B, cx, gy) { B.ellipse(cx, gy - 2, 40, 5, 0x5a3a2a); for (let k = 0; k < 10; k++) { const x = cx - 34 + k * 7.5; B.line(x, gy - 2, x, gy - 14 - (k % 3) * 4, LEAF[2], 1); B.disc(x, gy - 16 - (k % 3) * 4, 3, [0xff5a8a, 0xffd34d, 0xffffff, 0xb08aff, 0xff8a4a][k % 5]); B.disc(x, gy - 16 - (k % 3) * 4, 1, 0xffd34d); } } });
  add({ id: 'crystals', name: 'CRYSTAL CLUSTER', cat: 'NATURE', price: 5000, w: 34, h: 34, desc: 'THEY GLOW AT NIGHT. THEY HUM IF YOU LISTEN.',
    paint(B, cx, gy) { for (let k = 0; k < 6; k++) crystal(B, cx - 22 + k * 9, gy, 24 + (k % 3) * 18, [0x7ef9ff, 0xa87cff, 0xff7ac4][k % 3]); },
    live(ctx, t, o, n) { ctx.globalAlpha = 0.25 + n * 0.5; PT.glow(ctx, 0, -18, 30, '#a87cff', 0.5); ctx.globalAlpha = 1; } });
  add({ id: 'boulder', name: 'BIG BOULDER', cat: 'NATURE', price: 1000, w: 40, h: 30, desc: 'A ROCK. A BIG ONE. YOU PAID FOR THIS.', paint(B, cx, gy) { B.ball(cx, gy - 26, 40, 28, [0x8a82a8, 0xb8b0d4, 0x5a5278]); B.ball(cx + 22, gy - 12, 16, 12, [0x8a82a8, 0xb8b0d4, 0x5a5278]); } });
  add({ id: 'geyser', name: 'GEYSER', cat: 'NATURE', price: 11000, w: 30, h: 16, bounce: 2, desc: 'GOES OFF EVERY FEW SECONDS. STAND ON IT FOR A LIFT.',
    paint(B, cx, gy) { B.ellipse(cx, gy - 4, 30, 8, 0x6a5a88); B.ellipse(cx, gy - 6, 12, 4, 0x1a1024); },
    live(ctx, t, o) { const q = ((t + o.x * 0.01) % 4) / 4; if (q < 0.3) { const h = Math.sin(q / 0.3 * Math.PI) * 70; ctx.globalAlpha = 0.8; X.poly(ctx, [[-5, -2], [5, -2], [3, -2 - h], [-3, -2 - h]], '#bfe8ff'); for (let k = 0; k < 6; k++) X.blob(ctx, Math.sin(k * 2 + t * 5) * 8, -h + k * 4, 3, 3, '#ffffff'); ctx.globalAlpha = 1; } else if (Math.random() < 0.05) X.rect(ctx, -1, -8, 2, 2, '#ffffff'); } });
  add({ id: 'waterfall', name: 'WATERFALL ROCK', cat: 'NATURE', price: 20000, w: 60, h: 70, desc: 'A ROCK WITH A WATERFALL COMING OUT OF IT. PLUMBING UNKNOWN.',
    paint(B, cx, gy) { mountain(B, cx, gy, 120, 136, false); B.rect(cx - 8, gy - 110, 16, 110, 0x3a8ad8); B.ellipse(cx, gy - 2, 30, 5, 0x3a8ad8); },
    live(ctx, t) { for (let k = 0; k < 8; k++) { const q = ((t * 1.4 + k / 8) % 1); X.rect(ctx, -3 + (k % 3) * 2, -55 + q * 52, 1, 5, '#bfe8ff'); } for (let k = 0; k < 4; k++) X.blob(ctx, -10 + k * 7, -2 - Math.abs(Math.sin(t * 5 + k)) * 3, 2, 2, '#ffffff'); } });
  add({ id: 'hedge', name: 'HEDGE', cat: 'NATURE', price: 700, w: 40, h: 20, desc: 'TRIMMED INTO THE SHAPE OF A SLIGHTLY SMALLER HEDGE.', paint(B, cx, gy) { B.round(cx - 38, gy - 34, 76, 34, 12, LEAF[2]); for (let k = 0; k < 7; k++) puff(B, cx - 30 + k * 10, gy - 28 + (k % 2) * 4, 9, LEAF); } });
  add({ id: 'sunflowers', name: 'SUNFLOWERS', cat: 'NATURE', price: 1500, w: 34, h: 50, desc: 'THEY FACE THE SUN. THE SUN GOES ROUND. THEY ARE VERY TIRED.',
    paint(B, cx, gy) { for (let k = 0; k < 3; k++) { const x = cx - 20 + k * 20, h = 70 + k * 12; B.line(x, gy, x, gy - h, 0x3a8a3a, 3); B.ellipse(x + 6, gy - h * 0.5, 7, 3, LEAF[0]); for (let j = 0; j < 10; j++) { const a = j * U.TAU / 10; B.ellipse(x + Math.cos(a) * 9, gy - h + Math.sin(a) * 9, 5, 5, 0xffd34d); } B.disc(x, gy - h, 7, 0x6a3a1a); } } });

  // =========================================================== DECOR
  add({ id: 'statuechum', name: 'STATUE OF MR CHUM', cat: 'DECOR', price: 25000, w: 40, h: 60, desc: 'HE SENT IT HIMSELF. HE WILL CHECK IT IS UP.',
    paint(B, cx, gy) { statue(B, cx, gy, (b, x, y) => { b.ball(x, y - 50, 26, 32, [0xa8b0c8, 0xd8e0f0, 0x6a7290]); b.poly([[x - 6, y - 80], [x + 8, y - 80], [x + 2, y - 104]], 0xa8b0c8); b.rect(x - 16, y - 44, 32, 4, 0xffffff); b.disc(x - 10, y - 60, 3, 0x3a3a5a); b.disc(x + 10, y - 60, 3, 0x3a3a5a); }); } });
  add({ id: 'statueyou', name: 'STATUE OF YOU', cat: 'DECOR', price: 40000, w: 36, h: 60, desc: 'IN GOLD. BIGGER THAN YOU. BETTER LOOKING THAN YOU.',
    paint(B, cx, gy) { statue(B, cx, gy, (b, x, y) => { const G = [0xffd34d, 0xfff0a0, 0xb8901e]; b.round(x - 12, y - 50, 24, 50, 8, G[0]); b.ball(x, y - 66, 20, 18, G, true); b.line(x - 6, y - 82, x - 12, y - 100, G[2], 2); b.line(x + 6, y - 82, x + 12, y - 100, G[2], 2); b.disc(x - 12, y - 100, 3, G[0]); b.disc(x + 12, y - 100, 3, G[0]); b.disc(x - 7, y - 68, 4, G[2]); b.disc(x + 7, y - 68, 4, G[2]); b.line(x + 12, y - 40, x + 24, y - 70, G[0], 5); }); },
    live(ctx, t) { if (Math.sin(t * 2.3) > 0.85) X.rect(ctx, -8 + ((t * 13) % 16), -40 - ((t * 7) % 20), 1, 1, '#ffffff'); } });
  add({ id: 'statueduck', name: 'GOLDEN DUCK', cat: 'DECOR', price: 18000, w: 34, h: 50, desc: 'A DUCK. MADE OF GOLD. DOES NOTHING. PERFECT.',
    paint(B, cx, gy) { statue(B, cx, gy, (b, x, y) => { const G = [0xffd34d, 0xfff0a0, 0xb8901e]; b.ball(x, y - 20, 24, 18, G, true); b.ball(x + 12, y - 48, 14, 14, G, true); b.poly([[x + 22, y - 48], [x + 36, y - 46], [x + 22, y - 42]], 0xffa84d); b.disc(x + 14, y - 52, 2, 0x6a4a1a); }); } });
  add({ id: 'lamp', name: 'STREET LAMP', cat: 'DECOR', price: 600, w: 14, h: 60, lights: 1, desc: 'LIGHTS UP AT NIGHT. THE MOON HAS A LOT OF NIGHT.',
    paint(B, cx, gy) { B.rect(cx - 3, gy - 110, 6, 110, 0x2a2e3c); B.rect(cx - 3, gy - 110, 2, 110, 0x5a6070); B.rect(cx - 3, gy - 112, 24, 4, 0x2a2e3c); B.rect(cx + 14, gy - 108, 10, 6, 0x3a3e4c); B.rect(cx - 8, gy - 6, 16, 6, 0x2a2e3c); },
    live(ctx, t, o, n) { X.rect(ctx, 8, -51, 4, 2, n > 0.25 ? '#fff0c0' : '#6a6a5a'); if (n > 0.25) { ctx.globalAlpha = n; X.poly(ctx, [[7, -50], [13, -50], [26, 0], [-6, 0]], 'rgba(255,230,160,0.12)'); PT.glow(ctx, 10, -50, 20, '#ffe0a0', 0.6); ctx.globalAlpha = 1; } } });
  add({ id: 'torch', name: 'TIKI TORCH', cat: 'DECOR', price: 400, w: 10, h: 36, lights: 1, desc: 'FIRE ON A STICK. VERY ISLAND. VERY MOON.',
    paint(B, cx, gy) { B.rect(cx - 2, gy - 60, 4, 60, 0x8a5a34); B.rect(cx - 5, gy - 70, 10, 12, 0x5a3a20); },
    live(ctx, t) { const h = 5 + Math.abs(Math.sin(t * 8)) * 3; X.poly(ctx, [[-3, -35], [3, -35], [0, -35 - h]], '#ffb040'); X.poly(ctx, [[-1.5, -35], [1.5, -35], [0, -35 - h * 0.6]], '#fff0a0'); PT.glow(ctx, 0, -38, 18, '#ffa040', 0.45); } });
  [['flagpirate', 'PIRATE FLAG', 0x1a1a24, 900], ['flagrich', 'FLAG OF RICH', 0xffd34d, 1500], ['flagmoon', 'MOON FLAG', 0x7a5aa8, 700]].forEach(([id, nm, col, pr]) => add({
    id, name: nm, cat: 'DECOR', price: pr, w: 14, h: 70, desc: 'PLANTED. CLAIMED. YOURS.',
    paint(B, cx, gy) { B.rect(cx - 2, gy - 136, 4, 136, 0xc8ccd8); B.disc(cx, gy - 138, 3, 0xffd34d); },
    live(ctx, t) { const pts = []; for (let k = 0; k <= 6; k++) pts.push([1 + k * 4, -66 + Math.sin(t * 4 + k * 0.8) * 2]); for (let k = 6; k >= 0; k--) pts.push([1 + k * 4, -52 + Math.sin(t * 4 + k * 0.8) * 2]); X.poly(ctx, pts, PT.css(col));
      if (id === 'flagpirate') { X.blob(ctx, 13, -59 + Math.sin(t * 4 + 3) * 2, 3, 3, '#ffffff'); } else if (id === 'flagrich') F.draw(ctx, '$', 13, -62 + Math.sin(t * 4 + 3) * 2, '#3a2a0a', { center: true, shadow: false }); else X.blob(ctx, 13, -59 + Math.sin(t * 4 + 3) * 2, 3, 3, '#ffe9a8'); } }));
  add({ id: 'fence', name: 'PICKET FENCE', cat: 'DECOR', price: 300, w: 40, h: 18, desc: 'KEEPS NOTHING IN. KEEPS NOTHING OUT. LOOKS NICE.',
    paint(B, cx, gy) { B.rect(cx - 40, gy - 24, 80, 3, 0xf0e8d8); B.rect(cx - 40, gy - 12, 80, 3, 0xf0e8d8); for (let k = 0; k < 8; k++) { B.rect(cx - 38 + k * 10, gy - 32, 6, 32, 0xffffff); B.poly([[cx - 38 + k * 10, gy - 32], [cx - 32 + k * 10, gy - 32], [cx - 35 + k * 10, gy - 36]], 0xffffff); } } });
  add({ id: 'fountain', name: 'FOUNTAIN', cat: 'DECOR', price: 22000, w: 50, h: 44, desc: 'WATER GOES UP. WATER COMES DOWN. A WISH IS A DOLLAR.',
    paint(B, cx, gy) { B.ellipse(cx, gy - 10, 48, 12, 0xc8c0d8); B.ellipse(cx, gy - 12, 42, 8, 0x3a8ad8); B.rect(cx - 5, gy - 52, 10, 42, 0xc8c0d8); B.ellipse(cx, gy - 54, 20, 6, 0xc8c0d8); },
    live(ctx, t) { for (let k = 0; k < 10; k++) { const q = ((t * 0.9 + k / 10) % 1); const a = (k % 2 ? 1 : -1) * (0.4 + (k % 5) * 0.1); X.rect(ctx, Math.sin(a) * q * 24, -28 - Math.sin(q * Math.PI) * 18 + q * 22, 1, 2, '#bfe8ff'); } } });
  add({ id: 'signpost', name: 'SIGNPOST', cat: 'DECOR', price: 500, w: 20, h: 44, desc: 'POINTS AT EVERYTHING. HOME. THAT WAY. ALSO HOME.',
    paint(B, cx, gy) { B.rect(cx - 2, gy - 88, 4, 88, WOOD[0]); for (let k = 0; k < 3; k++) { const s = k % 2 ? -1 : 1; B.poly([[cx, gy - 84 + k * 20], [cx + s * 32, gy - 84 + k * 20], [cx + s * 38, gy - 78 + k * 20], [cx + s * 32, gy - 72 + k * 20], [cx, gy - 72 + k * 20]], [0xd8a83a, 0x3a8ad8, 0xd83a4a][k]); } } });
  add({ id: 'gnome', name: 'GARDEN GNOME', cat: 'DECOR', price: 800, w: 16, h: 26, desc: 'HE MOVES AT NIGHT. YOU HAVE NEVER SEEN IT. HE HAS.',
    paint(B, cx, gy) { B.round(cx - 10, gy - 22, 20, 22, 6, 0x3a6ad8); B.ball(cx, gy - 30, 9, 9, [0xf0c8a8, 0xffe8d0, 0xc89a78]); B.ellipse(cx, gy - 24, 8, 6, 0xffffff); B.poly([[cx - 10, gy - 34], [cx + 10, gy - 34], [cx + 2, gy - 58]], 0xd83a4a); B.disc(cx - 3, gy - 32, 1, 0x1a1024); B.disc(cx + 3, gy - 32, 1, 0x1a1024); } });
  add({ id: 'arch', name: 'STONE ARCH', cat: 'DECOR', price: 6000, w: 60, h: 60, desc: 'WALK UNDER IT. FEEL IMPORTANT.',
    paint(B, cx, gy) { B.round(cx - 56, gy - 110, 24, 110, 6, 0x9a92b8); B.round(cx + 32, gy - 110, 24, 110, 6, 0x9a92b8); B.round(cx - 60, gy - 124, 120, 24, 10, 0xb8b0d4); B.texture(cx - 60, gy - 124, 120, 124, [0x8a82a8, 0x9a92b8, 0xa8a0c8], 10, 2, (x, y) => B.alpha(x, y) > 0); } });
  add({ id: 'neonrich', name: 'BIG NEON: RICH', cat: 'DECOR', price: 100000, w: 60, h: 50, lights: 1, desc: 'FORTY FEET OF PINK NEON THAT SAYS RICH. FOR THE NEIGHBOURS.',
    paint(B, cx, gy) { for (const s of [-1, 1]) B.rect(cx + s * 40 - 2, gy - 70, 4, 70, 0x3a3e4c); B.round(cx - 58, gy - 100, 116, 34, 6, 0x1a1024); },
    live(ctx, t) { const on = Math.sin(t * 11) > -0.85; F.draw(ctx, 'RICH', 0, -48, on ? '#ff7ac4' : '#4a1a3a', { center: true, scale: 2, shadow: false }); if (on) PT.glow(ctx, 0, -42, 40, '#ff7ac4', 0.45); } });
  add({ id: 'oldrocket', name: 'OLD ROCKET', cat: 'DECOR', price: 30000, w: 30, h: 90, desc: 'IT DOES NOT FLY. IT DID ONCE. IT WILL NOT TALK ABOUT IT.',
    paint(B, cx, gy) { B.round(cx - 14, gy - 160, 28, 140, 12, 0xe8e8f0); B.rect(cx - 10, gy - 156, 5, 130, 0xffffff); B.poly([[cx - 14, gy - 150], [cx + 14, gy - 150], [cx, gy - 178]], 0xd83a4a); for (const s of [-1, 1]) B.poly([[cx + s * 14, gy - 50], [cx + s * 30, gy - 10], [cx + s * 14, gy - 24]], 0xd83a4a); B.disc(cx, gy - 110, 7, 0x3a6ad8); B.disc(cx - 2, gy - 112, 2, 0xc8e0ff); B.rect(cx - 10, gy - 22, 20, 22, 0x5a5a6a); } });
  add({ id: 'spareufo', name: 'SPARE UFO', cat: 'DECOR', price: 12000, w: 50, h: 30, desc: 'IN CASE YOU BREAK THE OTHER ONE. YOU WILL.',
    paint(B, cx, gy) { B.ellipse(cx, gy - 18, 48, 12, 0x8a92a8); B.ellipse(cx, gy - 22, 44, 8, 0xc0c8d8); B.ellipse(cx, gy - 30, 20, 14, 0x7ec8ff, 0.8); for (let k = 0; k < 6; k++) B.disc(cx - 36 + k * 14.5, gy - 16, 2, 0xffd34d); for (const s of [-1, 1]) B.line(cx + s * 20, gy - 10, cx + s * 30, gy, METAL[2], 2); } });
  add({ id: 'bench', name: 'PARK BENCH', cat: 'DECOR', price: 500, w: 36, h: 18, desc: 'SIT. LOOK AT YOUR MOON. FEEL RICH.',
    paint(B, cx, gy) { B.rect(cx - 34, gy - 18, 68, 5, WOOD[1]); B.rect(cx - 34, gy - 30, 68, 5, WOOD[1]); for (const s of [-1, 1]) B.rect(cx + s * 28 - 2, gy - 30, 4, 30, 0x2a2e3c); } });
  add({ id: 'mailbox', name: 'FANCY MAILBOX', cat: 'DECOR', price: 400, w: 14, h: 30, desc: 'NOBODY WRITES. MR CHUM EMAILS.',
    paint(B, cx, gy) { B.rect(cx - 2, gy - 36, 4, 36, WOOD[0]); B.round(cx - 12, gy - 56, 24, 20, 8, 0x3a6ad8); B.rect(cx + 10, gy - 60, 3, 10, 0xd83a4a); } });
  add({ id: 'totem', name: 'ALIEN TOTEM', cat: 'DECOR', price: 5000, w: 20, h: 70, desc: 'THREE FACES. ALL OF THEM YOURS. ALL OF THEM SMUG.',
    paint(B, cx, gy) { for (let k = 0; k < 3; k++) { const y = gy - k * 44; B.block(cx - 18, y - 44, 36, 44, [[0x7fd88a, 0xc4ffce, 0x3a8a4a], [0x7ab8ff, 0xc8e4ff, 0x3a6aa8], [0xffb05a, 0xffe0b0, 0xc8702a]][k], 4); B.disc(cx - 7, y - 30, 4, 0x1a1024); B.disc(cx + 7, y - 30, 4, 0x1a1024); B.rect(cx - 8, y - 16, 16, 3, 0x1a1024); } } });
  add({ id: 'gravestone', name: 'TOMB OF PLANETS', cat: 'DECOR', price: 8000, w: 30, h: 30, desc: 'HERE LIE THE PLANETS YOU DESTROYED. RIP. MOSTLY.',
    paint(B, cx, gy) { B.round(cx - 22, gy - 56, 44, 56, 18, 0x8a82a8); B.rect(cx - 22, gy - 40, 44, 40, 0x8a82a8); B.rect(cx - 12, gy - 42, 24, 3, 0x4a4468); B.rect(cx - 2, gy - 50, 4, 16, 0x4a4468); } });
  add({ id: 'jukebox', name: 'SPACE JUKEBOX', cat: 'DECOR', price: 7000, w: 26, h: 44, lights: 1, desc: 'PLAYS ONE SONG. YOU LIKE THE SONG.',
    paint(B, cx, gy) { B.round(cx - 22, gy - 86, 44, 86, 20, 0xc83a8a); B.round(cx - 16, gy - 76, 32, 40, 14, 0x1a1024); B.rect(cx - 16, gy - 30, 32, 20, 0xd8a83a); },
    live(ctx, t) { const c = ['#ff5a8a', '#7ef9ff', '#ffd34d'][Math.floor(t * 4) % 3]; X.rect(ctx, -6, -34, 12, 12, c); PT.glow(ctx, 0, -28, 18, c, 0.35); if (Math.sin(t * 3) > 0) X.rect(ctx, 12, -48 - ((t * 20) % 10), 2, 3, '#ffd34d'); } });

  const BY = {};
  for (const b of L) BY[b.id] = b;
  const CATS = ['INDUSTRY', 'FUN', 'NATURE', 'DECOR', 'HOME', 'FURNITURE'];

  /* Painted once, on first use. */
  const ARTC = {};
  function art(id) {
    if (ARTC[id]) return ARTC[id];
    const b = BY[id];
    if (!b || !b.paint) return null;
    const W = (b.w + 40) * HD, H = (b.h + 50) * HD;
    const B = PT.buf(W, H), cx = W / 2, gy = H - 10 * HD;
    b.paint(B, cx, gy);
    B.rim(0xffffff, 0, -1, 0.35);
    B.outline(INK);
    const cv = B.toCanvas();
    cv.ox = W / 2 / HD; cv.oy = (H - 10 * HD) / HD;
    return (ARTC[id] = cv);
  }

  PD.buildart = { LIST: L, BY, CATS, art };
})(window.PD);
