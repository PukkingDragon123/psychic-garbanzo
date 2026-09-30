/* THE LAPTOP. A battered ZORBBOOK on a cardboard box in the cave, running
   ZORB OS. Everything you own comes through it:

     ABAY        the shop. Buildings for the moon, things to wear, upgrades
                 for the saucer and for you, and the place you sell your ore
     CHUM BANK   what you owe Mr Chum, and the buttons that make it smaller
     STAR MAP    out to the sky and the next planet
     MAIL        people who have your address, sadly
     SETTINGS    sound, full screen, and throwing it all away

   It is drawn close up, filling the screen: the lid and its bezel, the glass,
   the keyboard deck in perspective with keys that go down when you click,
   your own two tentacles on the keys and the trackpad, the cardboard under
   it, a mug that steams and the cave wall behind with the fairy lights.

   Keeps the old desk's API (PD.desk): enter, update, draw, close, touchMode. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const A = PD.audio;
  const D = PD.data;
  const X = PD.pxd;
  const PT = PD.paint;
  const VW = 480, VH = 270, HD = 2;

  // the lid, the glass, the deck
  const LX = 32, LY = 0, LW = 416, LH = 214;       // the monitor's casing
  const SX = 54, SY = 11, SW = 372, SH = 186;      // the glass
  const TOP = 0;
  const TB = 14;                                   // the taskbar
  const DECK_Y = 214;                              // the top of the keyboard
  const BOOT = 2.4;                                // seconds of BIOS before the desktop

  const T = {
    ink: '#1e2238', dim: '#6a6e88', faint: '#a8acc0', page: '#f4f5fa', card: '#ffffff', line: '#dde0ea',
    green: '#1f9a4a', red: '#e5394a', blue: '#2f6fe0', ylw: '#f5b82a', glass: '#0e1424',
    bar: '#101626', accent: '#7ef9ff', pink: '#ff5a8a'
  };

  const S = {
    app: null, closing: 0, k: 0, from: [240, 180],
    boot: 0, cx: 240, cy: 120, fire: false, fx: 0, fy: 0, used: false,
    scroll: 0, scrollTo: 0,
    toasts: [], coins: [], keys: [], press: 0, typeT: 0, tapHand: 0,
    shop: { top: 0, sub: 0, sel: null, confirm: 0, confirmId: null },
    mail: 0, wipe: 0, t: 0, lock: 0, hoverDock: -1, bounce: {}, wall: 0,
    status: ''
  };

  /* ================================================================ PAINTED
     Everything that does not move is painted once at double detail. */
  let BACK = null, WALLS = [], KEYS = [];
  function paintBack() {
    if (BACK) return BACK;
    const B = PT.buf(VW * HD, VH * HD);
    // the cave wall: dark lumpy rock
    B.texture(0, 0, VW * HD, VH * HD, [0x1a1428, 0x241c36, 0x2e2444, 0x382c52], 38, 4);
    for (let i = 0; i < 26; i++) {
      const x = U.hash2(i, 1) * VW * HD, y = U.hash2(i, 2) * 300, r = 20 + U.hash2(i, 3) * 50;
      B.ball(x, y, r, r * 0.7, [0x2e2444, 0x3e3258, 0x1a1428]);
    }
    for (let i = 0; i < 40; i++) B.rect(U.hash2(i, 9) * VW * HD, U.hash2(i, 8) * 320, 6 + U.hash2(i, 7) * 10, 2, 0x3a5a3a, 0.5);
    // the top of the cardboard box
    const by = 200 * HD;
    B.rect(0, by, VW * HD, VH * HD - by, 0xb8905a);
    B.texture(0, by, VW * HD, VH * HD - by, [0xa88050, 0xb8905a, 0xc49c64], 14, 6);
    for (let x = 0; x < VW * HD; x += 7) B.rect(x, by, 1, VH * HD - by, 0xa8804e, 0.35);
    B.rect(0, by, VW * HD, 3, 0xd8b078);
    B.rect(0, by + 3, VW * HD, 2, 0x8a6a3a);
    // parcel tape down the middle, and a printed arrow
    B.rect(0, by + 60, VW * HD, 26, 0xd8c890, 0.75); B.rect(0, by + 60, VW * HD, 2, 0xfff0c0, 0.6);
    B.poly([[860, by + 10], [900, by + 10], [880, by - 12 + 10]], 0x6a4a28, 0.5);
    // coffee rings
    for (const [x, y] of [[120, by + 104], [790, by + 112]]) { B.ellipse(x, y, 26, 9, 0x7a5028, 0.35); B.ellipse(x, y, 22, 7, 0xb8905a); }
    BACK = B.toCanvas();
    return BACK;
  }

  /* The monitor: a fat beige CRT, gone a little yellow, with a deep bezel
     round the glass, vents, a badge, a power button and two knobs. */
  let LID = null, DECK = null;
  const BEIGE = [0xd6ccaa, 0xece4c8, 0xb0a482, 0x80765a, 0x5a5240];
  function bevelBox(B, x, y, w, h, r, C) {
    B.round(x, y, w, h, r, C[4]);
    B.round(x + 1, y + 1, w - 2, h - 2, r, C[3]);
    B.round(x + 1, y + 1, w - 4, h - 4, r, C[1]);
    B.round(x + 4, y + 4, w - 8, h - 8, r, C[0]);
  }
  function paintLid() {
    if (LID) return LID;
    const W = LW * HD, H = LH * HD, B = PT.buf(W, H);
    bevelBox(B, 0, 0, W, H, 18, BEIGE);
    // plastic speckle and a little yellowing toward the top
    for (let y = 6; y < H - 6; y++) for (let x = 6; x < W - 6; x++) {
      if (B.get(x, y) !== BEIGE[0]) continue;
      const n = U.hash2(x, y);
      if (n > 0.93) B.set(x, y, BEIGE[2], 0.35); else if (n < 0.05) B.set(x, y, 0xfff8e0, 0.4);
      if (y < 60) B.set(x, y, 0xe0c890, 0.1 * (1 - y / 60));
    }
    // the recess round the glass: stepped in twice, shadowed on top
    const gx = (SX - LX) * HD, gy = (SY - LY) * HD, gw = SW * HD, gh = SH * HD;
    B.round(gx - 18, gy - 16, gw + 36, gh + 32, 16, BEIGE[2]);
    B.round(gx - 16, gy - 14, gw + 32, gh + 30, 14, BEIGE[3]);
    B.round(gx - 14, gy - 12, gw + 28, gh + 24, 14, 0x3a3628);
    B.rect(gx - 12, gy + gh + 10, gw + 24, 2, BEIGE[1], 0.5);
    B.round(gx - 4, gy - 4, gw + 8, gh + 8, 14, 0x0a0c0a);
    // the chin: badge, vents, knobs, power
    const cy = gy + gh + 16;
    B.round(W / 2 - 70, cy + 2, 140, 16, 4, BEIGE[3]); B.round(W / 2 - 68, cy + 3, 136, 13, 3, 0x2a2e3a);
    for (let k = 0; k < 10; k++) B.rect(40 + k * 10, cy + 4, 6, 2, BEIGE[3]), B.rect(40 + k * 10, cy + 10, 6, 2, BEIGE[3]);
    for (const x of [W - 150, W - 118]) { B.disc(x, cy + 9, 7, BEIGE[4]); B.disc(x, cy + 9, 6, BEIGE[2]); B.disc(x - 1, cy + 8, 4, BEIGE[1]); B.rect(x - 1, cy + 3, 2, 5, BEIGE[4]); }
    B.round(W - 80, cy + 2, 28, 14, 3, BEIGE[4]); B.round(W - 79, cy + 3, 26, 11, 3, BEIGE[1]);
    // side vents
    for (let k = 0; k < 14; k++) { B.rect(10, 60 + k * 12, 14, 3, BEIGE[3]); B.rect(W - 24, 60 + k * 12, 14, 3, BEIGE[3]); }
    // a sticker of a shark, peeling
    B.round(20, 20, 30, 22, 4, 0xffffff); B.poly([[26, 36], [44, 36], [38, 24]], 0x5a7ab0); B.rect(26, 36, 18, 2, 0x5a7ab0);
    LID = B.toCanvas();
    return LID;
  }
  /* The keyboard: beige, chunky, in perspective, and a mouse on a mat. */
  function paintDeck() {
    if (DECK) return DECK;
    const W = VW * HD, H = (VH - DECK_Y) * HD, B = PT.buf(W, H);
    const topL = 76 * HD, topR = 392 * HD, botL = 44 * HD, botR = 424 * HD;
    const at = y => [topL + (botL - topL) * y / H, topR + (botR - topR) * y / H];
    // the mouse mat, and its shadow
    B.round(398 * HD, 14, 76 * HD, H - 18, 10, 0x2a2e5a); B.round(400 * HD, 18, 72 * HD, H - 26, 8, 0x3a4288);
    for (let k = 0; k < 5; k++) B.disc(412 * HD + k * 26, 40 + (k % 2) * 20, 3, 0xffd34d, 0.6);
    for (let y = 0; y < H; y++) {
      const [x0, x1] = at(y);
      for (let x = Math.floor(x0); x < x1; x++) B.set(x, y, y < 4 ? BEIGE[1] : (y > H - 6 ? BEIGE[3] : BEIGE[0]));
    }
    KEYS = [];
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      const y0 = 8 + r * 20, y1 = y0 + 17;
      const [a0, a1] = at(y0), [b0, b1] = at(y1);
      const n = r === 4 ? 9 : 14;
      for (let i = 0; i < n; i++) {
        let f0 = 0.04 + i / n * 0.92, f1 = f0 + 0.92 / n - 0.01;
        if (r === 4 && (i === 3 || i === 5)) continue;
        if (r === 4 && i === 4) { f0 = 0.04 + 3 / n * 0.92; f1 = 0.04 + 6 / n * 0.92 - 0.01; }
        const xa = a0 + (a1 - a0) * f0, xb = a0 + (a1 - a0) * f1, xc = b0 + (b1 - b0) * f1, xd = b0 + (b1 - b0) * f0;
        const face = r === 0 ? (i === 0 ? 0xd8584a : 0x9a9480) : (r === 4 && i === 4 ? 0xe8e0c8 : 0xf0e8d0);
        B.poly([[xa, y0], [xb, y0], [xc, y1], [xd, y1]], BEIGE[4]);
        B.poly([[xa + 1, y0], [xb - 1, y0], [xc - 1, y1 - 1], [xd + 1, y1 - 1]], PT.mul(face, 0.72));
        B.poly([[xa + 3, y0 + 1], [xb - 3, y0 + 1], [xc - 5, y1 - 6], [xd + 5, y1 - 6]], face);
        B.line(xa + 3, y0 + 1, xb - 3, y0 + 1, 0xffffff, 1, 0.6);
        if (r > 0 && r < 4 && U.hash2(i, r) > 0.3) B.rect((xa + xb) / 2 - 2, y0 + 4, 4, 3, 0x6a6250, 0.7);
        KEYS.push({ pts: [[xa, y0], [xb, y0], [xc, y1], [xd, y1]].map(p => [p[0] / HD, p[1] / HD + DECK_Y]) });
      }
    }
    // the cable to the mouse
    for (let x = topR; x < 430 * HD; x += 2) B.rect(x, 20 + Math.sin(x * 0.02) * 6, 2, 2, 0x3a3628);
    B.outline(0x14100a);
    DECK = B.toCanvas();
    return DECK;
  }

  /* The wallpapers: old ones, in few colours, ordered-dithered the way the
     machine would have had to. Teal, a starry night, and a sunset. */
  function paintWall(i) {
    if (WALLS[i]) return WALLS[i];
    const W = SW * HD, H = SH * HD, B = PT.buf(W, H);
    const pals = [[0x005a5a, 0x007878, 0x109090, 0x40b0a8], [0x080820, 0x101840, 0x283070, 0x5060a8], [0x301040, 0x702858, 0xc05050, 0xf0a060]];
    const P = pals[i % 3];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = i === 0 ? 0.45 + (U.fbm(x * 0.006, y * 0.01, 3) - 0.5) * 0.5 : i === 1 ? 0.2 + y / H * 0.3 + (U.fbm(x * 0.01, y * 0.01, 3) - 0.5) * 0.4 : 1 - y / H * 0.9;
      const f = U.clamp(v, 0, 0.999) * P.length;
      let k = Math.floor(f);
      if (f - k > PT.bayer(x >> 1, y >> 1)) k = Math.min(P.length - 1, k + 1);
      B.set(x, y, P[k]);
    }
    if (i === 1) for (let k = 0; k < 200; k++) B.rect(Math.floor(U.hash2(k, 5) * W / 2) * 2, Math.floor(U.hash2(k, 6) * H / 2) * 2, 2, 2, 0xffffff);
    if (i === 2) { B.disc(W * 0.5, H * 0.72, 60, 0xffe080); for (let y = 0; y < 60; y += 8) B.rect(W * 0.5 - 70, H * 0.72 + y - 20, 140, 3, P[1]); }
    // the ZORB logo, big and faint, in the middle
    const lx = W / 2, ly = H * 0.42;
    for (const [dx, c] of [[-26, 0xe5394a], [0, 0x2f6fe0], [26, 0xf5b82a]]) B.round(lx + dx - 10, ly - 22, 20, 44, 6, c, 0.22);
    WALLS[i] = B.toCanvas();
    return WALLS[i];
  }

  /* The dock icons, painted like real app icons: a rounded square with a
     gradient and a picture on it. */
  const ICONS = {};
  function paintIcon(id) {
    if (ICONS[id]) return ICONS[id];
    const N = 48, B = PT.buf(N, N);
    const bg = { abay: [0xffffff, 0xe8eaf4], bank: [0x1a2a5a, 0x0a1430], map: [0x2a1a5a, 0x5a2a8a], mail: [0x3a8aff, 0x1a5ad8], setup: [0x8a8ea8, 0x4a4e68], power: [0xff5a5a, 0xb82a3a], wall: [0x3ad8a8, 0x1a8a7a] }[id];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const r = 11, px = x < r ? r - x - 0.5 : (x >= N - r ? x - (N - r) + 0.5 : 0), py = y < r ? r - y - 0.5 : (y >= N - r ? y - (N - r) + 0.5 : 0);
      if (px * px + py * py > r * r) continue;
      B.set(x, y, PT.mix(bg[0], bg[1], y / N));
    }
    const c = N / 2;
    if (id === 'abay') {
      B.round(12, 18, 24, 22, 4, 0xe5394a); B.rect(12, 18, 24, 3, 0xff7a8a);
      B.line(18, 18, 18, 11, 0x9a1a2a, 2); B.line(30, 18, 30, 11, 0x9a1a2a, 2); B.line(18, 11, 30, 11, 0x9a1a2a, 2);
      B.disc(19, 29, 3, 0xffffff); B.disc(29, 29, 3, 0xffd34d);
    } else if (id === 'bank') {
      B.ball(c, c + 2, 15, 15, [0xffc83a, 0xfff0a0, 0xb8801a], true);
      B.poly([[c - 6, c + 8], [c + 7, c + 8], [c + 3, c - 1], [c - 3, c - 10]], 0x5a7ab0);
      B.line(c - 3, c - 8, c - 4, c + 6, 0x9ab8e8, 1);
    } else if (id === 'map') {
      B.ball(c, c, 12, 12, [0x5ad8a8, 0xa8ffe0, 0x1a6a5a]);
      B.ellipse(c, c, 21, 5, 0xffd34d); B.ellipse(c, c - 1, 13, 3, null);
      B.ball(c, c - 1, 12, 9, [0x5ad8a8, 0xa8ffe0, 0x1a6a5a]);
      for (let k = 0; k < 8; k++) B.rect(U.hash2(k, 4) * N, U.hash2(k, 5) * N, 1, 1, 0xffffff);
    } else if (id === 'mail') {
      B.rect(9, 14, 30, 21, 0xffffff); B.poly([[9, 14], [39, 14], [24, 27]], 0xe8ecf8); B.line(9, 14, 24, 27, 0xa8b0c8, 1); B.line(39, 14, 24, 27, 0xa8b0c8, 1);
    } else if (id === 'setup') {
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; B.disc(c + Math.cos(a) * 13, c + Math.sin(a) * 13, 4, 0xd8dce8); }
      B.disc(c, c, 13, 0xd8dce8); B.disc(c, c, 5, 0x4a4e68);
    } else if (id === 'power') {
      for (let a = -1.0; a < Math.PI * 2 - 1.1; a += 0.03) { const aa = a - Math.PI / 2 + 0.55; B.rect(c + Math.cos(aa) * 12 - 1.5, c + 2 + Math.sin(aa) * 12 - 1.5, 3, 3, 0xffffff); }
      B.rect(c - 1.5, 10, 3, 16, 0xffffff);
    } else if (id === 'wall') {
      B.ball(c + 6, c + 6, 10, 10, [0xffd34d, 0xfff0a0, 0xc8902a]); B.poly([[8, 38], [22, 20], [30, 30], [36, 24], [42, 38]], 0x1a4a4a);
    }
    B.rect(4, 2, N - 8, 1, 0xffffff, 0.35);
    const cv = B.toCanvas();
    ICONS[id] = cv;
    return cv;
  }

  /* Painted icons for the saucer upgrades. */
  const SHIPICON = {};
  function shipIcon(id) {
    if (SHIPICON[id]) return SHIPICON[id];
    const N = 64, B = PT.buf(N, N), c = N / 2;
    if (id === 'laser') {
      B.round(8, 26, 30, 14, 5, 0x6a7088); B.rect(10, 28, 26, 3, 0xa8b0c8); B.rect(38, 29, 8, 8, 0x4a5064);
      B.rect(44, 31, 18, 4, 0xff3a4a); B.rect(44, 32, 18, 2, 0xffc0c8); B.round(16, 38, 8, 12, 2, 0x4a5064);
    } else if (id === 'heat') {
      B.poly([[c, 6], [c + 22, 14], [c + 18, 40], [c, 58], [c - 18, 40], [c - 22, 14]], 0xd8581a);
      B.poly([[c, 12], [c + 16, 18], [c + 13, 38], [c, 52], [c - 13, 38], [c - 16, 18]], 0xff8a2a);
      B.poly([[c - 6, 44], [c + 6, 44], [c + 4, 30], [c + 8, 20], [c, 26], [c - 4, 16], [c - 8, 30]], 0xffd34d);
    } else if (id === 'ice') {
      B.poly([[6, 50], [58, 50], [52, 26], [12, 26]], 0x8ad8ff); B.poly([[10, 48], [54, 48], [50, 30], [14, 30]], 0xc8f0ff);
      for (let k = 0; k < 4; k++) B.poly([[14 + k * 11, 50], [22 + k * 11, 50], [18 + k * 11, 60]], 0xe8f8ff);
      B.rect(26, 12, 12, 16, 0x6a7088);
    } else if (id === 'armour') {
      B.round(10, 10, 44, 44, 6, 0x6a7088); B.round(13, 13, 38, 38, 5, 0x9aa0b8); B.rect(13, 13, 38, 4, 0xc8ccd8);
      for (const [x, y] of [[17, 17], [47, 17], [17, 47], [47, 47]]) B.disc(x, y, 2.5, 0x4a5064);
      B.line(20, 32, 44, 32, 0x6a7088, 2);
    } else if (id === 'bubble') {
      B.disc(c, c, 26, 0x5ad8ff, 0.35); B.disc(c, c, 22, 0x9af0ff, 0.2); B.ellipse(c - 10, c - 12, 7, 5, 0xffffff, 0.8);
      B.ellipse(c, c + 6, 12, 4, 0x8a92a8); B.ellipse(c, c + 3, 6, 5, 0x7ec8ff, 0.9);
    } else if (id === 'magnet') {
      for (let a = 0; a <= Math.PI; a += 0.02) { B.disc(c + Math.cos(a) * 18, 30 + Math.sin(a) * 18, 7, 0xe5394a); }
      B.rect(c - 25, 14, 14, 16, 0xe5394a); B.rect(c + 11, 14, 14, 16, 0xe5394a);
      B.rect(c - 25, 8, 14, 8, 0xd8dce8); B.rect(c + 11, 8, 14, 8, 0xd8dce8);
      B.disc(c, 10, 4, 0xffd34d);
    } else if (id === 'turbo') {
      B.poly([[4, 32], [30, 18], [30, 46]], 0xffd34d); B.poly([[14, 32], [30, 24], [30, 40]], 0xffffff);
      B.round(28, 20, 26, 24, 6, 0x6a7088); B.rect(30, 22, 22, 4, 0xa8b0c8); B.rect(52, 26, 8, 12, 0x3a3e4e);
    } else if (id === 'radar') {
      B.ellipse(c, 40, 22, 9, 0x9aa0b8); B.poly([[c - 20, 40], [c + 20, 40], [c + 4, 16]], 0xc8ccd8); B.rect(c - 2, 40, 4, 18, 0x6a7088);
      for (let r = 8; r < 30; r += 7) for (let a = -0.9; a < -0.2; a += 0.05) B.rect(c + 8 + Math.cos(a) * r, 20 + Math.sin(a) * r, 2, 2, 0x7dff9a);
    } else if (id === 'warp') {
      for (let a = 0; a < 18; a += 0.05) { const r = a * 1.5; B.disc(c + Math.cos(a) * r, c + Math.sin(a) * r, 2, PT.mix(0x7ef9ff, 0xa86ae8, a / 18)); }
    } else {
      B.ball(c, c, 20, 20, R3(0x8a92a8));
    }
    B.outline(0x160f24);
    const cv = B.toCanvas();
    SHIPICON[id] = cv;
    return cv;
  }
  function R3(c) { return PT.ramp(c); }

  /* ================================================================ WIDGETS */
  function hot(x, y, w, h) { return S.cx >= x && S.cx < x + w && S.cy >= y && S.cy < y + h; }
  function clicked(x, y, w, h) {
    if (!S.fire || S.used) return false;
    if (S.fx >= x && S.fx < x + w && S.fy >= y && S.fy < y + h) { S.used = true; return true; }
    return false;
  }
  // a rounded rectangle, pixel exact
  function rr(ctx, x, y, w, h, r, col) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.fillStyle = col;
    for (let i = 0; i < r; i++) {
      const inset = r - Math.floor(Math.sqrt(r * r - (r - i - 0.5) * (r - i - 0.5)));
      ctx.fillRect(x + inset, y + i, w - inset * 2, 1);
      ctx.fillRect(x + inset, y + h - 1 - i, w - inset * 2, 1);
    }
    ctx.fillRect(x, y + r, w, h - r * 2);
  }
  function shadow(ctx, x, y, w, h, r) {
    ctx.globalAlpha = 0.14; rr(ctx, x + 1, y + 2, w, h, r, '#000000');
    ctx.globalAlpha = 0.08; rr(ctx, x - 1, y + 1, w + 2, h + 3, r + 1, '#000000');
    ctx.globalAlpha = 1;
  }
  // a chunky old bevelled button
  function bevel(ctx, x, y, w, h, face, down) {
    x = Math.round(x); y = Math.round(y);
    X.rect(ctx, x - 1, y - 1, w + 2, h + 2, '#000000');
    X.rect(ctx, x, y, w, h, face);
    const lo = PT.css(PT.mul(PT.hex(face), 0.55)), hi = PT.css(PT.mix(PT.hex(face), 0xffffff, 0.6));
    X.rect(ctx, x, y, w, 1, down ? lo : hi); X.rect(ctx, x, y, 1, h, down ? lo : hi);
    X.rect(ctx, x, y + h - 1, w, 1, down ? hi : lo); X.rect(ctx, x + w - 1, y, 1, h, down ? hi : lo);
  }
  function button(ctx, x, y, w, h, label, o) {
    o = o || {};
    const on = o.enabled !== false;
    const over = on && hot(x, y, w, h);
    const down = over && PD.input.mouse.left;
    const col = !on ? '#b8b8b8' : (o.col || T.blue);
    bevel(ctx, x, y, w, h, over ? PT.css(PT.mix(PT.hex(col), 0xffffff, 0.12)) : col, down);
    F.draw(ctx, label, x + w / 2 + (down ? 1 : 0), y + Math.floor((h - 7) / 2) + (down ? 1 : 0), on ? (o.ink || '#ffffff') : '#7a7a7a', { center: true, shadow: false });
    return on && clicked(x, y, w, h);
  }
  function wrap(str, n) {
    const words = String(str).split(' '), out = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > n) { if (line) out.push(line); line = w; }
      else line = (line + ' ' + w).trim();
    }
    if (line) out.push(line);
    return out;
  }
  function clip(str, n) { str = String(str); return str.length <= n ? str : str.slice(0, Math.max(1, n - 1)) + '.'; }
  function stars(ctx, x, y, n) {
    for (let i = 0; i < 5; i++) {
      const c = i < n ? T.ylw : '#d8dae4';
      X.rect(ctx, x + i * 6 + 2, y, 1, 5, c); X.rect(ctx, x + i * 6, y + 2, 5, 1, c); X.rect(ctx, x + i * 6 + 1, y + 1, 3, 3, c);
    }
  }
  function toast(title, text, col) {
    S.toasts.unshift({ title, text, col: col || T.accent, t: 0 });
    if (S.toasts.length > 3) S.toasts.length = 3;
    A.sfx.tone(1320, { type: 'sine', dur: 0.08, vol: 0.05 }); A.sfx.tone(1760, { type: 'sine', dur: 0.1, vol: 0.05, delay: 0.08 });
  }
  function burst(x, y, n) {
    for (let i = 0; i < n; i++) S.coins.push({ x, y, vx: U.rand(-90, 90), vy: U.rand(-140, -40), t: 0, life: 1 + Math.random() * 0.5, r: Math.random() * 6 });
  }

  /* ================================================================== ENTER */
  function enter(g) {
    S.lock = 0.3; S.boot = 0; S.app = null; S.k = 0; S.closing = 0;
    S.scroll = S.scrollTo = 0;
    S.cx = VW / 2; S.cy = 120;
    S.toasts.length = 0; S.coins.length = 0;
    S.wipe = 0;
    S.wall = (g.save.wall || 0) % 3;
    paintBack(); paintDeck(); paintWall(S.wall);
    if (PD.chum && PD.chum.call) PD.chum.call(g, 'desk');
    A.sfx.tone(520, { type: 'sine', to: 780, dur: 0.25, vol: 0.06 });
    A.sfx.tone(1040, { type: 'sine', dur: 0.3, vol: 0.05, delay: 0.25 });
    // tell them what is new
    setTimeout(() => {
      if (g.tutActive && g.tutActive()) toast('ZORB OS', 'OPEN ABAY. SELL YOUR ROCKS.', T.ylw);
      else if ((g.save.debt || 0) > 0) toast('CHUM BANK', 'YOU OWE $' + U.fmt(g.save.debt) + '. HAVE A NICE DAY.', T.pink);
    }, 900);
  }
  function close(g) {
    if (PD.fx.wipeActive()) return;
    A.sfx.tone(780, { type: 'sine', to: 260, dur: 0.3, vol: 0.06 });
    g.wipeTo(SX + SW / 2, SY + SH / 2, '#0e1424', () => { PD.home.leaveDesk(g); }, 'bars');
  }

  function openApp(g, id, from) {
    if (id === 'power') { close(g); return; }
    if (id === 'map') {
      if (g.tutAllows && !g.tutAllows('desk', 'map')) { g.tutNope('desk'); toast('ZORB OS', 'SELL FIRST. THEN THE SKY.', T.red); return; }
      if (PD.fx.wipeActive()) return;
      A.sfx.tone(440, { type: 'triangle', to: 1200, dur: 0.4, vol: 0.06 });
      g.wipeTo(SX + SW / 2, SY + SH / 2, '#0e1424', () => { PD.home.leaveDesk(g); g.openChart(); }, 'sweep');
      return;
    }
    S.bounce[id] = 1;
    S.app = id; S.k = 0; S.closing = 0; S.from = from || [240, SY + SH - 14];
    S.scroll = S.scrollTo = 0;
    if (id === 'abay') { S.shop.sel = null; S.shop.confirm = 0; if (g.tutActive && g.tutActive()) { S.shop.top = TOPS.indexOf('SELL'); } }
    A.sfx.tone(660, { type: 'sine', to: 990, dur: 0.12, vol: 0.06 });
  }
  function closeApp() { if (!S.app) return; S.closing = 1; A.sfx.tone(700, { type: 'sine', to: 420, dur: 0.1, vol: 0.05 }); }

  /* ================================================================ LESSONS
     Mr Chum shows you how the machine works, once each, when it matters:
     what the computer is, how to sell, how to buy, what happens to what you
     bought, and (his favourite) how to pay him. */
  function lessons(g) {
    if (S.boot < BOOT + 0.4 || (PD.talk && PD.talk.active()) || S.closing) return;
    const seen = g.save.seen || (g.save.seen = {});
    const C = (text, next, face) => ({ who: 'chum', face: face || 'smug', text, next: next || null });
    const say = (key, nodes) => { seen[key] = 1; g.saveGame && g.saveGame(); PD.talk.start(g, { start: 'a', nodes }); };
    const top = TOPS[S.shop.top];
    if (!seen.pc1) return say('pc1', {
      a: C('AH. THE COMPUTER. IT IS OLDER THAN YOUR EXCUSES.', 'b'),
      b: C('CLICK ABAY. THE LITTLE SHOPPING BAG, TOP LEFT. THAT IS WHERE ROCKS BECOME MONEY.')
    });
    if (S.app === 'abay' && S.k >= 1 && !seen.pcSell && g.vaultTotal() > 0) {
      if (top === 'SELL') return say('pcSell', {
        a: C('THIS IS SELL. EVERY ROCK YOU DUG UP IS ON THE LIST, WITH WHAT IT IS WORTH TODAY.', 'b'),
        b: C('HOT MEANS THE PRICE IS UP. SELL THOSE. LOW MEANS IT IS DOWN. SELL THOSE TOO. I AM NOT FUSSY.', 'c'),
        c: C('PRESS THE BIG GREEN SELL IT ALL BUTTON. GO ON. I AM WATCHING.')
      });
      if (!seen.pcSellHint) return say('pcSellHint', { a: C('ROCKS FIRST. CLICK SELL, AT THE BOTTOM OF THE LIST ON THE LEFT.') });
    }
    if (S.app === 'abay' && S.k >= 1 && !seen.pcBuy && (g.save.totalEarned || 0) > 0 && !(g.tutActive && g.tutActive())) return say('pcBuy', {
      a: C('MONEY. LOOK AT IT. NOW SPEND A LITTLE, SO YOU CAN MAKE A LOT. FOR ME.', 'b'),
      b: C('BUILD IS THINGS FOR YOUR MOON. STYLE IS HATS. SHIP IS YOUR SAUCER. GEAR IS YOUR DRILL AND YOUR LUNGS.', 'c'),
      c: { who: 'chum', face: 'smug', text: 'QUESTIONS?', choices: [
        { t: 'WHAT SHOULD I BUY FIRST?', next: 'd' },
        { t: 'CAN I JUST PAY YOU?', next: 'e' },
        { t: 'HOW DO I BUY?', next: 'f' }
      ] },
      d: C('A BIGGER DRILL, IN GEAR. OR AN AUTO MINER IN BUILD: IT DIGS WHILE YOU SLEEP. NOT A HAT.', 'f'),
      e: C('YES. CHUM BANK. MY FAVOURITE ICON. BUT A MINER NOW MEANS MORE MONEY LATER. THINK.', 'f'),
      f: C('CLICK A CARD TO SEE IT. PRESS BUY IT NOW. ANYTHING DEAR ASKS TWICE. I DID THAT. YOU ARE WELCOME.')
    });
    if (S.lesson) {
      const k = S.lesson; S.lesson = null;
      if (k === 'build' && !seen.pcBuilt) return say('pcBuilt', {
        a: C('IT IS ON YOUR MOON NOW. IN A BOX. BOXES DO NOT MAKE MONEY.', 'b'),
        b: C('GO OUTSIDE AND PRESS B. PICK IT, WALK IT TO A GOOD SPOT, PRESS CONFIRM.')
      });
      if (k === 'cosm' && !seen.pcWore) return say('pcWore', { a: C('YOU LOOK RIDICULOUS. IT SUITS YOU. EVERYONE WILL SEE IT OUTSIDE.', null, 'happy') });
      if (k === 'ship' && !seen.pcShip) return say('pcShip', { a: C('SAUCER BITS. SOME PLANETS WILL NOT LET YOU NEAR WITHOUT THE RIGHT ONE. THE STAR MAP SAYS WHICH.') });
      if (k === 'gear' && !seen.pcGear) return say('pcGear', { a: C('BETTER GEAR. DIG FASTER. SELL FASTER. PAY ME FASTER. EVERYONE WINS. MOSTLY ME.') });
    }
    if (S.app === 'abay' && S.sawLocked && !seen.pcLock) return say('pcLock', {
      a: C('LOCKED. THE GOOD STUFF ALWAYS IS. YOU UNLOCK IT IN THE BRAIN IN THE JAR, WITH BRAIN POINTS.', 'b'),
      b: C('ONE POINT FOR EVERY $100 YOU HAND OVER. PAY ME, OR FEED THE BRAIN. I SUGGEST PAYING ME.')
    });
    if (S.app === 'bank' && S.k >= 1 && !seen.pcBank) return say('pcBank', {
      a: C('MY FAVOURITE PROGRAM. YOU PUT MONEY IN, IT COMES TO ME.', 'b'),
      b: C('PRESS PAY. ANY AMOUNT. THE BAR FILLS UP. WHEN IT IS FULL YOU ARE FREE. TO GET RICH. TRY.', 'c'),
      c: C('AND FOR EVERY $100 YOU GIVE ME, THE BRAIN GIVES YOU A POINT. I KNOW. I AM TOO GENEROUS.')
    });
  }

  /* ================================================================= UPDATE */
  function update(dt, g) {
    const IN = PD.input, m = IN.mouse;
    S.t += dt;
    S.lock = Math.max(0, S.lock - dt);
    S.boot = Math.min(BOOT + 1, S.boot + dt);
    lessons(g);
    S.press = Math.max(0, S.press - dt * 4);
    S.typeT = Math.max(0, S.typeT - dt);
    S.shop.confirm = Math.max(0, S.shop.confirm - dt);
    if (S.app && !S.closing) S.k = Math.min(1, S.k + dt * 4.5);
    if (S.closing) { S.k = Math.max(0, S.k - dt * 6); if (S.k <= 0) { S.app = null; S.closing = 0; } }
    for (const k in S.bounce) { S.bounce[k] = Math.max(0, S.bounce[k] - dt * 1.4); }
    for (let i = S.toasts.length - 1; i >= 0; i--) { S.toasts[i].t += dt; if (S.toasts[i].t > 4) S.toasts.splice(i, 1); }
    for (let i = S.keys.length - 1; i >= 0; i--) { S.keys[i].t -= dt; if (S.keys[i].t <= 0) S.keys.splice(i, 1); }
    for (let i = S.coins.length - 1; i >= 0; i--) {
      const c = S.coins[i];
      c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; c.r += dt * 10;
      if (c.t > c.life) S.coins.splice(i, 1);
    }
    // the pointer follows the mouse, a hair behind so it feels like it has weight
    const tx = U.clamp(m.x, SX + 1, SX + SW - 2), ty = U.clamp(m.y, SY + 1, SY + SH - 2);
    if (PD.touch && PD.touch.enabled) { S.cx = tx; S.cy = ty; }
    else { S.cx = U.damp(S.cx, tx, 0.55, dt); S.cy = U.damp(S.cy, ty, 0.55, dt); }
    S.fire = false; S.used = false;
    if (S.lock <= 0 && S.boot > BOOT && m.leftPressed && m.inside) {
      S.fire = true; S.fx = tx; S.fy = ty; S.cx = tx; S.cy = ty;
      S.press = 1; S.typeT = 0.15; S.tapHand ^= 1;
      if (KEYS.length) for (let k = 0; k < 2; k++) S.keys.push({ i: (Math.random() * KEYS.length) | 0, t: 0.14 });
      A.sfx.tone(1900, { type: 'square', dur: 0.015, vol: 0.035 });
    }
    if (m.wheel) S.scrollTo += m.wheel * 24;
    if (IN.hit('down')) S.scrollTo += 30;
    if (IN.hit('up')) S.scrollTo -= 30;
    S.scrollTo = Math.max(0, S.scrollTo);
    S.scroll = U.damp(S.scroll, S.scrollTo, 0.35, dt);
    if (S.lock <= 0 && IN.hit('esc')) { if (S.app) closeApp(); else close(g); }
    if (S.lock <= 0 && IN.hit('KeyQ')) close(g);
  }

  /* =================================================================== DRAW */
  function draw(ctx, g, t) {
    ctx.drawImage(paintBack(), 0, 0, VW, VH);
    drawRoomLife(ctx, g, t);
    ctx.globalAlpha = 0.4; X.blob(ctx, 240, 212, 220, 8, '#000000'); ctx.globalAlpha = 1;
    ctx.drawImage(paintLid(), LX, LY, LW, LH);
    // the badge and the power light
    F.draw(ctx, 'ZORBTRON 486', 240, SY + SH + 9, '#d8d0b0', { center: true, shadow: false });
    X.rect(ctx, LX + LW - 36, SY + SH + 12, 4, 2, S.boot < 0.3 || Math.sin(t * 9) > -0.9 ? '#3aff6a' : '#1a5a2a');
    PT.glow(ctx, LX + LW - 34, SY + SH + 13, 6, '#3aff6a', 0.35);
    // a sticky note stuck on the side of the monitor
    ctx.save(); ctx.translate(LX - 14, LY + 44); ctx.rotate(-0.14);
    X.rect(ctx, 0, 0, 26, 22, '#ffe86a'); X.rect(ctx, 0, 0, 26, 3, '#ffd83a');
    F.draw(ctx, 'OWE', 2, 5, '#6a4a1a', { shadow: false }); F.draw(ctx, 'CHUM', 2, 13, '#c83a3a', { shadow: false });
    ctx.restore();
    drawScreen(ctx, g, t);
    // the glow of the tube on everything in front of it
    PT.glow(ctx, 240, 120, 250, S.boot < BOOT ? '#7aff9a' : '#7ad8d8', 0.06);
    ctx.drawImage(paintDeck(), 0, DECK_Y, VW, VH - DECK_Y);
    for (const k of S.keys) { const K = KEYS[k.i]; if (!K) continue; ctx.globalAlpha = 0.35; X.poly(ctx, K.pts, '#5a5240'); ctx.globalAlpha = 1; }
    drawMouse(ctx, t);
    drawHands(ctx, g, t);
  }
  function mousePos() { return [436 + (S.cx - (SX + SW / 2)) * 0.06, 244 + (S.cy - (SY + SH / 2)) * 0.05]; }
  function drawMouse(ctx, t) {
    const [x, y] = mousePos(), d = S.press > 0.5 ? 1 : 0;
    ctx.globalAlpha = 0.35; X.blob(ctx, x + 2, y + 10, 10, 3, '#000000'); ctx.globalAlpha = 1;
    X.blob(ctx, x, y, 9, 12, '#14100a'); X.blob(ctx, x, y, 8, 11, '#e8e0c8'); X.blob(ctx, x - 2, y - 3, 4, 5, '#fff8e8');
    X.rect(ctx, x - 7, y - 6 + d, 14, 1, '#a89e80'); X.rect(ctx, x, y - 10, 1, 5, '#a89e80');
  }

  function drawRoomLife(ctx, g, t) {
    // fairy lights along the top of the cave, peeking over the lid
    for (let i = 0; i < 24; i++) {
      const x = 4 + i * 20, y = 6 + Math.sin(i * 0.9) * 3 + (i % 2) * 2;
      const c = ['#ff5a8a', '#ffd34d', '#7ef9ff', '#8affa0'][i % 4];
      const on = Math.sin(t * 2 + i * 1.7) > -0.4;
      if (x > LX - 2 && x < LX + LW + 2) continue;
      if (on) PT.glow(ctx, x, y + 3, 9, c, 0.35);
      X.rect(ctx, x, y, 3, 4, on ? c : '#3a3044');
    }
    // the mug, steaming
    const mx = 18, my = 222;
    X.rect(ctx, mx, my, 18, 20, '#e8e0f0'); X.rect(ctx, mx, my, 18, 3, '#ffffff'); X.rect(ctx, mx + 2, my + 1, 14, 2, '#5a3a1a');
    X.rect(ctx, mx + 18, my + 5, 4, 9, '#e8e0f0'); X.rect(ctx, mx + 19, my + 7, 2, 5, '#b8905a');
    F.draw(ctx, '#1', mx + 4, my + 9, '#e5394a', { shadow: false });
    for (let k = 0; k < 3; k++) { const q = (t * 0.4 + k / 3) % 1; ctx.globalAlpha = (1 - q) * 0.35; X.blob(ctx, mx + 9 + Math.sin(q * 6 + k) * 3, my - 4 - q * 22, 2 + q * 3, 2 + q * 2, '#ffffff'); }
    ctx.globalAlpha = 1;
    // a wedge of cheese that Brenda has had a go at
    X.poly(ctx, [[446, 244], [476, 244], [476, 232]], '#ffd34d'); X.rect(ctx, 446, 244, 30, 6, '#e8b820');
    X.rect(ctx, 458, 245, 3, 3, '#c89a1e'); X.rect(ctx, 468, 246, 2, 2, '#c89a1e');
  }

  function drawScreen(ctx, g, t) {
    ctx.save();
    ctx.beginPath(); ctx.rect(SX, SY, SW, SH); ctx.clip();
    X.rect(ctx, SX, SY, SW, SH, '#000000');
    if (S.boot < BOOT) drawBoot(ctx, t);
    else {
      ctx.drawImage(paintWall(S.wall), SX, SY, SW, SH);
      drawIcons(ctx, g, t);
      drawWidgets(ctx, g, t);
      if (S.app) drawWindow(ctx, g, t);
      drawTaskbar(ctx, g, t);
      drawToasts(ctx, g, t);
      for (const c of S.coins) {
        const w = Math.max(1, Math.round(Math.abs(Math.cos(c.r)) * 4));
        X.rect(ctx, c.x - w / 2, c.y - 2, w, 5, '#ffc83a'); X.rect(ctx, c.x - w / 2, c.y - 2, Math.max(1, w - 1), 1, '#fff0a0');
      }
      drawCursor(ctx, g, t);
    }
    drawTube(ctx, t);
    ctx.restore();
  }
  /* The tube: scanlines, a dark bloom at the edges, a glare, round corners,
     and the faint roll of the refresh. */
  function drawTube(ctx, t) {
    ctx.globalAlpha = 0.13;
    for (let y = SY; y < SY + SH; y += 2) X.rect(ctx, SX, y, SW, 1, '#000000');
    ctx.globalAlpha = 0.05;
    const roll = SY + ((t * 40) % (SH + 40)) - 20;
    X.rect(ctx, SX, roll, SW, 14, '#ffffff');
    ctx.globalAlpha = 1;
    const vg = ctx.createRadialGradient(SX + SW / 2, SY + SH / 2, SW * 0.42, SX + SW / 2, SY + SH / 2, SW * 0.6);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = vg; ctx.fillRect(SX, SY, SW, SH);
    ctx.globalAlpha = 0.07;
    X.blob(ctx, SX + 70, SY + 34, 60, 22, '#ffffff');
    ctx.globalAlpha = 1;
    const r = 9;
    for (let i = 0; i < r; i++) {
      const inset = r - Math.floor(Math.sqrt(r * r - (r - i - 0.5) * (r - i - 0.5)));
      for (const [x, y] of [[SX, SY + i], [SX + SW - inset, SY + i], [SX, SY + SH - 1 - i], [SX + SW - inset, SY + SH - 1 - i]]) X.rect(ctx, x, y, inset, 1, '#0a0c0a');
    }
  }

  /* Boot: the BIOS counts its memory, finds your rocks, then the logo. */
  const BIOS = ['ZORBTRON BIOS V4.86  (C) NOBODY', '', 'MEMORY TEST: 640K OK', 'DETECTING DRIVES... A: ROCK', 'DETECTING DEBT...... $$$$$$$', 'LOADING ZORB OS 95 ...'];
  function drawBoot(ctx, t) {
    X.rect(ctx, SX, SY, SW, SH, '#000000');
    if (S.boot < 1.7) {
      const n = Math.floor(S.boot / 0.25);
      BIOS.slice(0, n).forEach((l, i) => F.draw(ctx, l, SX + 14, SY + 14 + i * 11, i === 0 ? '#ffffff' : '#a8a8a8', { shadow: false }));
      if (Math.sin(t * 12) > 0) X.rect(ctx, SX + 14, SY + 16 + Math.min(n, BIOS.length) * 11, 6, 2, '#a8a8a8');
      return;
    }
    const q = U.clamp((S.boot - 1.7) / 0.6, 0, 1);
    X.rect(ctx, SX, SY, SW, SH, '#005a5a');
    for (const [dx, c] of [[-26, '#e5394a'], [0, '#2f6fe0'], [26, '#f5b82a']]) X.rect(ctx, SX + SW / 2 + dx - 9, SY + 50, 18, 40 * Math.min(1, q * 2), c);
    F.draw(ctx, 'ZORB OS 95', SX + SW / 2, SY + 104, '#ffffff', { center: true, scale: 2, shadow: '#003a3a' });
    X.rect(ctx, SX + SW / 2 - 50, SY + 130, 100, 8, '#000000'); bevel(ctx, SX + SW / 2 - 50, SY + 130, 100, 8, '#c0c0c0', true);
    for (let k = 0; k < Math.floor(q * 12); k++) X.rect(ctx, SX + SW / 2 - 48 + k * 8, SY + 132, 6, 4, '#000080');
  }

  const DOCK = [
    { id: 'abay', name: 'ABAY' }, { id: 'bank', name: 'CHUM BANK' }, { id: 'map', name: 'STAR MAP' },
    { id: 'mail', name: 'MAIL' }, { id: 'setup', name: 'SETUP' }, { id: 'power', name: 'SHUT DOWN' }
  ];
  function appName(id) { const d = DOCK.find(o => o.id === id); return d ? d.name : id.toUpperCase(); }

  // icons on the desktop, two columns of three
  function drawIcons(ctx, g, t) {
    for (let i = 0; i < DOCK.length; i++) {
      const d = DOCK[i];
      const x = SX + 10 + (i % 2) * 48, y = SY + 8 + Math.floor(i / 2) * 44;
      const over = !S.app && hot(x - 4, y - 2, 40, 40);
      const bn = S.bounce[d.id] ? Math.abs(Math.sin(S.bounce[d.id] * 9)) * S.bounce[d.id] * 4 : 0;
      ctx.drawImage(paintIcon(d.id), x + 4, y - bn, 24, 24);
      if (over) { ctx.globalAlpha = 0.35; X.rect(ctx, x + 4, y, 24, 24, '#000080'); ctx.globalAlpha = 1; }
      const lw = F.width(d.name, 1) + 4;
      X.rect(ctx, x + 16 - lw / 2, y + 27, lw, 9, over ? '#000080' : 'rgba(0,0,0,0)');
      F.draw(ctx, d.name, x + 16, y + 28, '#ffffff', { center: true, shadow: over ? false : '#002a2a' });
      if (d.id === 'mail') { X.rect(ctx, x + 24, y - 2, 9, 8, '#e5394a'); F.draw(ctx, String(mailbox(g).length), x + 29, y - 1, '#ffffff', { center: true, shadow: false }); }
      if (!S.app && !S.start && clicked(x - 4, y - 2, 40, 40)) openApp(g, d.id, [x + 16, y + 12]);
    }
    if (!S.app) {
      const tip = g.tutActive && g.tutActive() ? 'CLICK ABAY AND SELL YOUR ROCKS' : 'CLICK AN ICON';
      F.draw(ctx, tip, SX + SW / 2 + 40, SY + SH - TB - 12 + Math.round(Math.sin(t * 3)), '#ffffff', { center: true, shadow: '#002a2a' });
    }
  }
  // what you owe and what you are worth, as two little windows on the right
  function miniWin(ctx, x, y, w, h, title) {
    bevel(ctx, x, y, w, h, '#c0c0c0');
    X.rect(ctx, x + 2, y + 2, w - 4, 9, '#000080');
    F.draw(ctx, title, x + 4, y + 3, '#ffffff', { shadow: false });
    X.rect(ctx, x + 3, y + 13, w - 6, h - 16, '#ffffff'); X.rect(ctx, x + 3, y + 13, w - 6, 1, '#808080');
  }
  function drawWidgets(ctx, g, t) {
    const x = SX + SW - 124, y = SY + 8;
    miniWin(ctx, x, y, 116, 42, 'NET WORTH');
    F.draw(ctx, '$' + U.fmt(PD.story && PD.story.netWorth ? PD.story.netWorth(g) : g.save.credits), x + 8, y + 19, '#006a2a', { scale: 2, shadow: false });
    const debt = g.save.debt || 0;
    if (debt > 0) {
      miniWin(ctx, x, y + 48, 116, 42, 'YOU OWE MR CHUM');
      F.draw(ctx, '$' + U.fmt(debt), x + 8, y + 67, '#c01a2a', { scale: 2, shadow: false });
    }
  }
  function drawTaskbar(ctx, g, t) {
    const y = SY + SH - TB;
    X.rect(ctx, SX, y, SW, TB, '#c0c0c0'); X.rect(ctx, SX, y, SW, 1, '#ffffff');
    const sd = S.start;
    bevel(ctx, SX + 2, y + 2, 38, TB - 4, '#c0c0c0', sd);
    for (const [dx, c] of [[0, '#e5394a'], [3, '#2f6fe0'], [6, '#f5b82a']]) X.rect(ctx, SX + 5 + dx, y + 4, 2, 6, c);
    F.draw(ctx, 'ZORB', SX + 15, y + 4, '#000000', { shadow: false });
    if (clicked(SX + 2, y + 2, 38, TB - 4)) { S.start = !S.start; A.sfx.tone(1200, { type: 'square', dur: 0.02, vol: 0.03 }); }
    if (S.app) { bevel(ctx, SX + 44, y + 2, 90, TB - 4, '#c0c0c0', true); F.draw(ctx, appName(S.app), SX + 50, y + 4, '#000000', { shadow: false }); }
    // the tray
    const d = new Date(), hh = d.getHours(), mm = d.getMinutes();
    const clock = (hh % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm;
    const cash = '$' + U.fmt(g.save.credits);
    const tw = F.width(clock, 1) + F.width(cash, 1) + 16;
    bevel(ctx, SX + SW - tw - 3, y + 2, tw, TB - 4, '#c0c0c0', true);
    F.draw(ctx, cash, SX + SW - tw + 2, y + 4, '#006a2a', { shadow: false });
    F.draw(ctx, clock, SX + SW - 6, y + 4, '#000000', { right: true, shadow: false });
    // the start menu
    if (S.start) {
      const mh = DOCK.length * 12 + 6, mx = SX + 2, my = y - mh;
      bevel(ctx, mx, my, 90, mh, '#c0c0c0');
      X.rect(ctx, mx + 2, my + 2, 10, mh - 4, '#000080');
      DOCK.forEach((dd, i) => {
        const iy = my + 3 + i * 12, over = hot(mx + 13, iy, 75, 12);
        if (over) X.rect(ctx, mx + 13, iy, 75, 12, '#000080');
        F.draw(ctx, dd.name, mx + 16, iy + 2, over ? '#ffffff' : '#000000', { shadow: false });
        if (clicked(mx + 13, iy, 75, 12)) { S.start = false; openApp(g, dd.id, [mx + 40, iy]); }
      });
      if (S.fire && !S.used) S.start = false;
    }
  }
  // notices: old yellow balloons over the tray
  function drawToasts(ctx, g, t) {
    for (let i = 0; i < S.toasts.length; i++) {
      const o = S.toasts[i];
      const k = Math.min(1, o.t * 6) * (o.t > 3.6 ? Math.max(0, (4 - o.t) / 0.4) : 1);
      if (k <= 0) continue;
      const w = 156, h = 24, x = SX + SW - w - 6, y = SY + SH - TB - 8 - (i + 1) * (h + 4) + Math.round((1 - k) * 8);
      X.rect(ctx, x - 1, y - 1, w + 2, h + 2, '#000000'); X.rect(ctx, x, y, w, h, '#ffffe1');
      X.poly(ctx, [[x + w - 30, y + h], [x + w - 20, y + h], [x + w - 16, y + h + 6]], '#ffffe1');
      X.rect(ctx, x + 4, y + 4, 3, h - 8, o.col);
      F.draw(ctx, o.title, x + 10, y + 3, '#000000', { shadow: false });
      F.draw(ctx, clip(o.text, 23), x + 10, y + 13, '#404040', { shadow: false });
    }
  }
  function drawCursor(ctx, g, t) {
    const x = Math.round(S.cx), y = Math.round(S.cy);
    const pts = [[0, 0], [0, 11], [3, 8], [5, 12], [7, 11], [5, 7], [9, 7]];
    X.poly(ctx, pts.map(p => [x + p[0] - 0.5, y + p[1] - 0.5]), '#000000');
    X.poly(ctx, [[1, 2], [1, 9], [3, 7], [5, 10], [6, 9.6], [4.4, 6.2], [7, 6.2]].map(p => [x + p[0] - 0.2, y + p[1]]), '#ffffff');
  }

  /* A window, the old way: grey bevels, a blue title bar, a square X. */
  function drawWindow(ctx, g, t) {
    const wx = SX + 4, wy = SY + 3, ww = SW - 8, wh = SH - TB - 6;
    const e = S.k >= 1 ? 1 : 1 - Math.pow(1 - S.k, 3);
    if (e < 0.999) {
      // the old zoom: outlines stepping out from the icon
      const fx = S.from[0], fy = S.from[1];
      for (let k = 0; k < 3; k++) {
        const q = U.clamp(e - k * 0.15, 0, 1);
        X.frame(ctx, U.lerp(fx - 8, wx, q), U.lerp(fy - 8, wy, q), U.lerp(16, ww, q), U.lerp(16, wh, q), '#000000');
      }
      if (e < 0.7) return;
    }
    bevel(ctx, wx, wy, ww, wh, '#c0c0c0');
    for (let i = 0; i < ww - 6; i++) X.rect(ctx, wx + 3 + i, wy + 3, 1, 11, PT.css(PT.mix(0x000080, 0x1084d0, i / ww)));
    F.draw(ctx, appTitle(g), wx + 7, wy + 5, '#ffffff', { shadow: false });
    const cxb = wx + ww - 15;
    bevel(ctx, cxb, wy + 4, 11, 9, '#c0c0c0', hot(cxb, wy + 4, 11, 9) && PD.input.mouse.left);
    F.draw(ctx, 'X', cxb + 6, wy + 5, '#000000', { center: true, shadow: false });
    bevel(ctx, cxb - 13, wy + 4, 11, 9, '#c0c0c0'); X.rect(ctx, cxb - 10, wy + 10, 5, 1, '#000000');
    if (clicked(cxb, wy + 4, 11, 9)) { closeApp(); return; }
    const bx = wx + 3, by = wy + 16, bw = ww - 6, bh = wh - 19;
    X.rect(ctx, bx - 1, by - 1, bw + 2, bh + 2, '#808080');
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    if (S.app === 'abay') drawAbay(ctx, g, t, bx, by, bw, bh);
    else if (S.app === 'bank') drawBank(ctx, g, t, bx, by, bw, bh);
    else if (S.app === 'mail') drawMail(ctx, g, t, bx, by, bw, bh);
    else if (S.app === 'setup') drawSetup(ctx, g, t, bx, by, bw, bh);
    ctx.restore();
  }
  function appTitle(g) {
    if (S.app === 'abay') return 'ABAY - EVERYTHING, DELIVERED TO YOUR MOON';
    if (S.app === 'bank') return 'CHUM BANK - PRIVATE CLIENTS';
    if (S.app === 'mail') return 'MAIL - ' + mailbox(g).length + ' MESSAGES';
    if (S.app === 'setup') return 'SETTINGS';
    return '';
  }

  /* =================================================================== ABAY */
  const TOPS = ['HOT', 'BUILD', 'STYLE', 'SHIP', 'GEAR', 'SELL'];
  const TOPNAME = { HOT: 'HOT DEALS', BUILD: 'BUILDINGS', STYLE: 'WEAR IT', SHIP: 'SAUCER', GEAR: 'DIG GEAR', SELL: 'SELL ROCKS' };
  const BUILDSUB = [['INDUSTRY', 'INDUSTRY'], ['FUN', 'FUN'], ['NATURE', 'NATURE'], ['DECOR', 'DECOR'], ['HOME', 'HOME'], ['FURNITURE', 'INSIDE']];
  const STYLESUB = [['hat', 'HATS'], ['face', 'FACE'], ['back', 'BACK'], ['pet', 'PETS'], ['colour', 'COLOURS']];
  const GEARSUB = [['DIG', 'DIG'], ['BODY', 'BODY'], ['BANG', 'BANG'], ['BIZ', 'BIZ']];
  const SELLERS = ['krunk_tools_99', 'moon_mart', 'zorb_official', 'sack_dave', 'wet_ted', 'bort_electronics', 'garden_of_zorb', 'chum_enterprises'];

  function subsFor(top) { return top === 'BUILD' ? BUILDSUB : top === 'STYLE' ? STYLESUB : top === 'GEAR' ? GEARSUB : null; }

  /* Every shelf is turned into the same kind of entry, so one grid shows them. */
  function entry(g, kind, id) {
    const e = entry0(g, kind, id);
    const node = PD.unlock && PD.unlock.isLocked(g, kind, id) ? PD.unlock.nodeFor(kind, id) : null;
    if (node && !e.sold && !e.have) { e.locked = node; e.badge = 'LOCKED'; }
    return e;
  }
  function entry0(g, kind, id) {
    if (kind === 'build') {
      const b = PD.buildart.BY[id];
      const have = PD.build.owned(g, id);
      const placed = PD.build.st(g).out.concat(PD.build.st(g).in).filter(o => o.id === id).length;
      const up = b.where === 'up';
      const done = up && (b.up === 'house' ? PD.build.houseTier(g) : PD.build.bedTier(g)) >= b.tier;
      return { kind, id, name: b.name, price: b.price, desc: b.desc, fx: fxLine(b), have: have + placed, sold: done || (up && have > 0),
        badge: done ? 'BUILT' : (have + placed ? 'OWN ' + (have + placed) : null), stars: 3 + (b.price % 3), seller: SELLERS[b.price % SELLERS.length] };
    }
    if (kind === 'cosm') {
      const c = PD.cosm.BY[id];
      const own = PD.cosm.owns(g, id), on = PD.cosm.wearing(g, id);
      return { kind, id, name: c.name, price: c.price, desc: c.desc, fx: c.slot === 'pet' ? 'FOLLOWS YOU ABOUT' : c.slot === 'colour' ? 'CHANGES HOW YOU LOOK' : 'WEAR IT ON YOUR ' + (c.slot === 'hat' ? 'HEAD' : c.slot.toUpperCase()),
        have: own ? 1 : 0, sold: own, wear: own, on, badge: on ? 'WEARING' : (own ? 'OWNED' : null), stars: 4 + (c.price % 2), seller: 'moon_mart' };
    }
    if (kind === 'ship') {
      const it = D.SHIPX[id], lv = g.shipLvl(id);
      return { kind, id, name: it.name, price: g.shipPrice(id), desc: it.desc, fx: lv < it.max ? 'NEXT: ' + it.lv[lv] : 'MAXED: ' + it.lv[it.max - 1],
        have: lv, lvl: lv, max: it.max, sold: lv >= it.max, badge: lv ? 'LV ' + lv + '/' + it.max : null, stars: 5, seller: 'saucer_bits' };
    }
    const it = D.ABAYX[id], lv = g.save.upg[id] || 0, cap = g.abayMax(id);
    return { kind: 'gear', id, name: it.name, price: g.abayPrice(id), desc: it.blurb, fx: 'LEVEL ' + lv + ' OF ' + cap, have: lv, lvl: lv, max: cap,
      sold: lv >= cap, badge: lv ? 'LV ' + lv : null, stars: it.stars, seller: it.seller };
  }
  function fxLine(b) {
    const f = b.fx || {};
    if (b.where === 'up') return 'UPGRADES YOUR ' + (b.up === 'house' ? 'HOUSE' : 'BED');
    if (f.ore) return 'DIGS ORE EVERY ' + f.every + ' SECONDS';
    if (f.sell) return 'SELLS YOUR ORE FOR YOU';
    if (f.cash) return 'MAKES $' + U.fmt(f.cash) + ' EVERY ' + f.every + 'S';
    if (f.interest) return 'PAYS INTEREST ON YOUR MONEY';
    if (f.value) return 'ORE SELLS FOR ' + Math.round(f.value * 100) + '% MORE';
    if (f.bonus) return 'A BONUS FOR YOUR ' + f.bonus.toUpperCase();
    if (b.ride) return 'A RIDE. YOU CAN GET ON IT';
    if (b.fun) return 'BRINGS TOURISTS. TOURISTS PAY';
    if (b.water) return 'WATER. PUT FLOATIES IN IT';
    return 'MAKES THE PLACE NICER';
  }
  function shelf(g, top, sub) {
    const out = [];
    if (top === 'BUILD') {
      const cat = BUILDSUB[sub][0];
      for (const b of PD.buildart.LIST) if (b.cat === cat) out.push(entry(g, 'build', b.id));
    } else if (top === 'STYLE') {
      const slot = STYLESUB[sub][0];
      const list = slot === 'colour' ? PD.cosm.COLOURS : PD.cosm.LIST.filter(c => c.slot === slot);
      for (const c of list) out.push(entry(g, 'cosm', c.id));
    } else if (top === 'SHIP') {
      for (const it of D.SHIP) out.push(entry(g, 'ship', it.id));
      const seen = {};
      for (const it of D.ABAY) if ((it.cat === 'SHIP' || it.id === 'scooter') && !seen[it.id] && D.UPG[it.id] && it.id !== 'drones' && it.id !== 'droneyield') { seen[it.id] = 1; out.push(entry(g, 'gear', it.id)); }
    } else if (top === 'GEAR') {
      const cat = GEARSUB[sub][0];
      const seen = {};
      for (const it of D.ABAY) if (it.cat === cat && !seen[it.id] && D.UPG[it.id]) { seen[it.id] = 1; out.push(entry(g, 'gear', it.id)); }
      if (cat === 'DIG') for (const id of ['drones', 'droneyield']) if (D.ABAYX[id] && D.UPG[id]) out.push(entry(g, 'gear', id));
    } else if (top === 'HOT') {
      // a different handful every hour: things you do not have yet
      const hour = Math.floor(Date.now() / 3.6e6);
      const pool = [];
      const L = (k, id) => PD.unlock && PD.unlock.isLocked(g, k, id);
      for (const b of PD.buildart.LIST) if (!PD.build.owned(g, b.id) && b.where !== 'up' && !L('build', b.id)) pool.push(['build', b.id]);
      for (const c of PD.cosm.LIST) if (!PD.cosm.owns(g, c.id) && !L('cosm', c.id)) pool.push(['cosm', c.id]);
      for (const it of D.SHIP) if (g.shipLvl(it.id) < it.max && !L('ship', it.id)) pool.push(['ship', it.id]);
      const pick = [];
      for (let i = 0; i < 12 && pool.length; i++) { const k = Math.floor(U.hash2(hour, i * 7 + 3) * pool.length); pick.push(pool.splice(k, 1)[0]); }
      pick.sort((a, b) => entry(g, a[0], a[1]).price - entry(g, b[0], b[1]).price);
      for (const [k, id] of pick) out.push(entry(g, k, id));
      // the first one is on offer
      if (out[0]) { out[0].deal = 1; out[0].was = out[0].price; out[0].price = Math.round(out[0].price * 0.75); }
    }
    return out;
  }

  function drawAbay(ctx, g, t, bx, by, bw, bh) {
    const sh = S.shop;
    // the header: logo, search, money
    X.rect(ctx, bx, by, bw, 20, '#ffffff'); X.rect(ctx, bx, by + 20, bw, 1, T.line);
    const L = [['A', T.red], ['B', T.blue], ['A', T.ylw], ['Y', T.green]];
    for (let i = 0; i < 4; i++) {
      const j = hot(bx + 4, by + 2, 44, 16) ? Math.round(Math.sin(t * 12 + i) * 1.5) : 0;
      F.draw(ctx, L[i][0], bx + 6 + i * 11, by + 3 + j, L[i][1], { scale: 2, shadow: false });
    }
    const sx = bx + 54, sw = 170;
    rr(ctx, sx, by + 4, sw, 12, 6, '#eef0f6'); X.rect(ctx, sx + 5, by + 7, 4, 4, '#a8acc0'); X.rect(ctx, sx + 8, by + 10, 2, 2, '#a8acc0');
    const SEARCH = ['SHARK FLOATIE', 'HOW TO PAY OFF A SHARK', 'ROLLER COASTER CHEAP', 'HAT FOR ALIEN', 'LAZER BEAM', 'IS MR CHUM A REAL SHARK'];
    const q = SEARCH[Math.floor(t / 4) % SEARCH.length], nc = Math.min(q.length, Math.floor((t % 4) * 8));
    F.draw(ctx, q.slice(0, nc) + (Math.sin(t * 8) > 0 ? '_' : ''), sx + 14, by + 7, T.dim, { shadow: false });
    F.draw(ctx, '$' + U.fmt(g.save.credits), bx + bw - 6, by + 7, T.green, { right: true, shadow: false });

    // the side bar of departments
    const sx0 = bx, sy0 = by + 21, sideW = 62;
    X.rect(ctx, sx0, sy0, sideW, bh - 21, '#eceef5'); X.rect(ctx, sx0 + sideW, sy0, 1, bh - 21, T.line);
    for (let i = 0; i < TOPS.length; i++) {
      const y = sy0 + 4 + i * 16, on = sh.top === i, over = hot(sx0 + 2, y, sideW - 4, 14);
      if (on) rr(ctx, sx0 + 3, y, sideW - 6, 14, 3, '#ffffff');
      else if (over) rr(ctx, sx0 + 3, y, sideW - 6, 14, 3, '#f6f7fb');
      if (on) X.rect(ctx, sx0 + 3, y + 3, 2, 8, [T.red, T.blue, T.pink, T.accent, T.ylw, T.green][i]);
      F.draw(ctx, TOPS[i], sx0 + 9, y + 4, on ? T.ink : T.dim, { shadow: false });
      if (TOPS[i] === 'SELL' && g.vaultTotal() > 0) { X.blob(ctx, sx0 + sideW - 9, y + 7, 3, 3, T.green); }
      if (clicked(sx0 + 2, y, sideW - 4, 14)) {
        if (g.tutActive && g.tutActive() && TOPS[i] !== 'SELL') { g.tutNope('desk'); toast('ABAY', 'SELL YOUR ROCKS FIRST.', T.red); }
        else { sh.top = i; sh.sub = 0; sh.sel = null; S.scroll = S.scrollTo = 0; A.sfx.tone(1100, { type: 'square', dur: 0.02, vol: 0.03 }); }
      }
    }
    // the rep of the seller, which is you
    F.draw(ctx, 'YOU: 62%', sx0 + 6, by + bh - 20, T.dim, { shadow: false });
    stars(ctx, sx0 + 6, by + bh - 11, 3);

    const cx0 = bx + sideW + 1, cw = bw - sideW - 1;
    const top = TOPS[sh.top];
    if (top === 'SELL') { drawSell(ctx, g, t, cx0, sy0, cw, bh - 21); return; }

    // the sub tabs
    let gy0 = sy0 + 2;
    const subs = subsFor(top);
    if (subs) {
      let x = cx0 + 4;
      for (let i = 0; i < subs.length; i++) {
        const w = F.width(subs[i][1], 1) + 10, on = sh.sub === i;
        rr(ctx, x, gy0 + 1, w, 11, 5, on ? T.ink : (hot(x, gy0 + 1, w, 11) ? '#dfe2ec' : '#eceef5'));
        F.draw(ctx, subs[i][1], x + w / 2, gy0 + 3, on ? '#ffffff' : T.dim, { center: true, shadow: false });
        if (clicked(x, gy0 + 1, w, 11)) { sh.sub = i; sh.sel = null; S.scroll = S.scrollTo = 0; A.sfx.tone(1100, { type: 'square', dur: 0.02, vol: 0.03 }); }
        x += w + 3;
      }
      gy0 += 14;
    } else {
      F.draw(ctx, top === 'HOT' ? 'PICKED FOR YOU. YOU OWE MONEY.' : 'THE SPACE LANES NEED THESE', cx0 + 5, gy0 + 3, T.dim, { shadow: false });
      gy0 += 13;
    }
    const list = shelf(g, top, sh.sub);
    if (!sh.sel || !list.find(e => e.id === sh.sel)) sh.sel = list[0] ? list[0].id : null;

    // the grid on the left, the item on the right
    const detW = 112, gw = cw - detW - 2;
    const cols = 3, cardW = Math.floor((gw - 8) / cols) - 3, cardH = 52;
    const rows = Math.ceil(list.length / cols);
    const viewH = by + bh - gy0;
    S.scrollTo = Math.min(S.scrollTo, Math.max(0, rows * (cardH + 3) - viewH + 4));
    ctx.save();
    ctx.beginPath(); ctx.rect(cx0, gy0, gw, viewH); ctx.clip();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const x = cx0 + 5 + (i % cols) * (cardW + 3), y = gy0 + 2 + Math.floor(i / cols) * (cardH + 3) - Math.round(S.scroll);
      if (y > by + bh || y + cardH < gy0) continue;
      const sel = sh.sel === e.id, over = hot(x, y, cardW, cardH) && S.cy > gy0;
      const lift = over ? 1 : 0;
      shadow(ctx, x, y - lift, cardW, cardH, 3);
      rr(ctx, x, y - lift, cardW, cardH, 3, '#ffffff');
      if (sel) { X.frame(ctx, x - 1, y - lift - 1, cardW + 2, cardH + 2, T.blue); }
      // the photo
      rr(ctx, x + 2, y + 2 - lift, cardW - 4, 32, 2, e.kind === 'cosm' ? '#f0f2fa' : e.kind === 'build' ? '#eef4fa' : '#f4f0fa');
      picture(ctx, g, e, x + cardW / 2, y + 18 - lift, 28, t, over || sel);
      if (e.locked) { ctx.globalAlpha = 0.55; X.rect(ctx, x + 2, y + 2 - lift, cardW - 4, 32, '#20243a'); ctx.globalAlpha = 1; PD.glyph.draw(ctx, 'lock', x + cardW / 2 - 7, y + 11 - lift, '#ffd34d', '#8a6a1a'); }
      if (e.badge) { const bw2 = F.width(e.badge, 1) + 4; X.rect(ctx, x + 2, y + 2 - lift, bw2, 8, e.locked ? '#5a4a8a' : (e.on ? T.blue : T.green)); F.draw(ctx, e.badge, x + 4, y + 3 - lift, '#ffffff', { shadow: false }); }
      if (e.deal) { X.rect(ctx, x + cardW - 26, y + 2 - lift, 24, 8, T.red); F.draw(ctx, '-25%', x + cardW - 14, y + 3 - lift, '#ffffff', { center: true, shadow: false }); }
      F.draw(ctx, clip(e.name, Math.floor((cardW - 4) / 6)), x + 3, y + 36 - lift, T.ink, { shadow: false });
      const afford = g.save.credits >= e.price;
      F.draw(ctx, e.sold ? (e.kind === 'cosm' ? 'OWNED' : 'MAXED') : '$' + U.fmt(e.price), x + 3, y + 44 - lift, e.sold ? T.dim : (afford ? T.green : T.red), { shadow: false });
      if (clicked(x, y, cardW, cardH) && S.fy > gy0) { sh.sel = e.id; sh.confirm = 0; A.sfx.tone(1400, { type: 'square', dur: 0.02, vol: 0.03 }); }
    }
    ctx.restore();
    // a scroll bar
    if (rows * (cardH + 3) > viewH) {
      const total = rows * (cardH + 3), th = Math.max(12, viewH * viewH / total), ty = gy0 + (viewH - th) * (S.scroll / Math.max(1, total - viewH));
      rr(ctx, cx0 + gw - 3, ty, 3, th, 1, '#c8cad8');
    }
    // the detail panel
    const e = list.find(o => o.id === sh.sel);
    const dx = cx0 + gw + 1, dy = sy0;
    X.rect(ctx, dx, dy, detW + 1, bh - 21, '#ffffff'); X.rect(ctx, dx, dy, 1, bh - 21, T.line);
    if (!e) { F.draw(ctx, 'NOTHING HERE.', dx + detW / 2, dy + 30, T.dim, { center: true, shadow: false }); return; }
    rr(ctx, dx + 5, dy + 4, detW - 8, 46, 3, '#f0f2fa');
    picture(ctx, g, e, dx + 5 + (detW - 8) / 2, dy + 26, 42, t, true);
    let ly = dy + 53;
    const py = by + bh - 32;
    for (const l of wrap(e.name, 17).slice(0, 2)) { F.draw(ctx, l, dx + 6, ly, T.ink, { shadow: false }); ly += 9; }
    stars(ctx, dx + 6, ly, e.stars); F.draw(ctx, clip(e.seller, 7), dx + 38, ly, T.faint, { shadow: false }); ly += 9;
    const room = Math.max(0, Math.floor((py - 12 - (e.deal ? 9 : 0) - ly) / 8));
    const dl = wrap(e.desc, 17);
    for (const l of dl.slice(0, room)) { F.draw(ctx, l, dx + 6, ly, T.dim, { shadow: false }); ly += 8; }
    F.draw(ctx, clip(e.fx, 18), dx + 6, py - 10 - (e.deal ? 9 : 0), T.blue, { shadow: false });
    // the money and the button
    if (e.deal) { F.draw(ctx, '$' + U.fmt(e.was), dx + 6, py - 9, T.faint, { shadow: false }); X.rect(ctx, dx + 5, py - 6, F.width('$' + U.fmt(e.was), 1) + 2, 1, T.red); }
    if (!e.sold) F.draw(ctx, '$' + U.fmt(e.price), dx + 6, py, g.save.credits >= e.price ? T.green : T.red, { scale: 2, shadow: false });
    const btY = by + bh - 17, btW = detW - 10;
    if (e.kind === 'cosm' && e.wear) {
      if (button(ctx, dx + 5, btY, btW, 13, e.on ? 'TAKE IT OFF' : 'WEAR IT', { col: e.on ? '#8a8ea8' : T.blue })) {
        PD.cosm.wear(g, e.id); A.sfx.tone(e.on ? 500 : 900, { type: 'triangle', to: e.on ? 300 : 1300, dur: 0.12, vol: 0.06 });
      }
      return;
    }
    if (e.sold) { button(ctx, dx + 5, btY, btW, 13, e.kind === 'build' ? 'BUILT' : 'MAXED OUT', { enabled: false }); return; }
    if (e.locked) {
      S.sawLocked = 1;
      F.draw(ctx, 'NEEDS ' + e.locked.name, dx + 6, btY - 10, '#5a4a8a', { shadow: false });
      if (button(ctx, dx + 5, btY, btW, 13, 'UNLOCK IN BRAIN', { col: '#5a4a8a' })) toast('LOCKED', 'THE BRAIN IN THE JAR UNLOCKS IT. ' + e.locked.cost + ' PTS.', '#c8a8ff');
      return;
    }
    const confirming = sh.confirm > 0 && sh.confirmId === e.id;
    const afford = g.save.credits >= e.price;
    if (button(ctx, dx + 5, btY, btW, 13, !afford ? 'NOT ENOUGH $' : (confirming ? 'SURE? CLICK AGAIN' : 'BUY IT NOW'), { col: confirming ? T.green : T.ylw, ink: confirming ? '#ffffff' : '#3a2a0a', enabled: afford })) {
      if (g.tutAllows && !g.tutAllows('desk', 'buy')) { g.tutNope('desk'); toast('ABAY', 'SELL FIRST. SHOPPING IS FOR PEOPLE WITH MONEY.', T.red); return; }
      if (!confirming && e.price >= 1000) { sh.confirm = 2.5; sh.confirmId = e.id; A.sfx.tone(900, { type: 'square', dur: 0.03, vol: 0.04 }); return; }
      buyEntry(g, e, dx + detW / 2, btY);
      sh.confirm = 0;
    }
  }

  function buyEntry(g, e, x, y) {
    let ok = false;
    if (e.deal) { g.save.credits += e.was - e.price; }
    if (e.kind === 'build') ok = PD.build.buy(g, e.id);
    else if (e.kind === 'cosm') ok = PD.cosm.buy(g, e.id);
    else if (e.kind === 'ship') ok = g.shipBuy(e.id);
    else ok = g.abayBuy(e.id);
    if (!ok) { if (e.deal) g.save.credits -= e.was - e.price; A.sfx.deny(); toast('ABAY', 'THAT DID NOT WORK. NOT ENOUGH MONEY?', T.red); return; }
    burst(x, y, 16);
    A.sfx.buy && A.sfx.buy();
    A.sfx.tone(660, { type: 'triangle', to: 1320, dur: 0.2, vol: 0.07 });
    S.lastBuy = e.name; S.lesson = e.kind;
    if (e.kind === 'build') toast('ORDER DELIVERED', e.name + ' - PRESS B ON THE MOON', T.green);
    else if (e.kind === 'cosm') toast('ORDER DELIVERED', 'YOU ARE WEARING IT. LOOK.', T.green);
    else toast('INSTALLED', e.name + ' ON YOUR ' + (e.kind === 'ship' ? 'SAUCER' : 'SUIT'), T.green);
    g.saveGame && g.saveGame();
  }

  /* A picture for any entry, spinning a little when you look at it. */
  const BOXC = new WeakMap();
  function boxOf(cv) {
    let b = BOXC.get(cv);
    if (b) return b;
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < x0) { x0 = 0; y0 = 0; x1 = cv.width - 1; y1 = cv.height - 1; }
    b = { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    BOXC.set(cv, b);
    return b;
  }
  function fitDraw(ctx, cv, cx, cy, size, sx) {
    const b = boxOf(cv);
    const k = Math.min(size / b.w, size * 0.9 / b.h, 1.5);
    const w = b.w * k, h = b.h * k;
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(cy));
    ctx.scale(sx || 1, 1);
    ctx.drawImage(cv, b.x0, b.y0, b.w, b.h, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  function picture(ctx, g, e, cx, cy, size, t, live) {
    const wob = live ? 1 + Math.sin(t * 5) * 0.03 : 1;
    if (e.kind === 'build') {
      const b = PD.buildart.BY[e.id];
      const cv = b.where === 'up' ? (b.up === 'house' ? PD.home.API.artHouse(b.tier) : PD.home.API.artBed(b.tier)) : PD.buildart.art(e.id);
      if (cv) { ctx.globalAlpha = 0.18; X.blob(ctx, cx, cy + size * 0.42, size * 0.4, 2, '#000000'); ctx.globalAlpha = 1; fitDraw(ctx, cv, cx, cy, size * wob); }
    } else if (e.kind === 'cosm') {
      PD.cosm.icon(ctx, e.id, cx, cy, size * 0.9 * wob, t);
    } else if (e.kind === 'ship') {
      fitDraw(ctx, shipIcon(D.SHIPX[e.id].icon), cx, cy, size * 0.8 * wob);
    } else {
      const it = D.ABAYX[e.id];
      const col = { DIG: '#ffb03a', BODY: '#ff7a9a', BANG: '#ff5a4d', BIZ: '#8affa0', SHIP: '#7ef9ff', JUNK: '#c8a8ff' }[it.cat] || '#c8c8d8';
      X.blob(ctx, cx, cy, size * 0.38, size * 0.38, col);
      X.blob(ctx, cx - 1, cy - 1, size * 0.32, size * 0.32, PT.css(PT.mix(col, 0xffffff, 0.3)));
      const gl = GLYPH_OF[e.id] || 'machine';
      const s = Math.max(1, Math.floor(size / 16));
      PD.glyph.draw(ctx, gl, cx - 7 * s, cy - 7 * s, '#1e2238', '#5a5e78', s);
    }
  }
  const GLYPH_OF = {
    drill: 'drill', reach: 'drill', oxygen: 'o2', lung: 'o2', cargo: 'cargo', belly: 'cargo',
    hull: 'hull', ironskin: 'hull', tether: 'weight', thruster: 'dash', dash: 'dash',
    pistol: 'gun', trigger: 'gun', scatter: 'scatter', lance: 'lance', lamp: 'star',
    magnet: 'weight', scanner: 'scan', crew: 'coin', refine: 'machine', greed: 'coin', warp: 'planet',
    deflector: 'hull', navcom: 'scan', drones: 'machine', droneyield: 'star', scooter: 'dash'
  };

  /* SELL: the vault, what everything is worth, and one big green button. */
  function drawSell(ctx, g, t, x0, y0, w, h) {
    const keys = Object.keys(g.save.vault).filter(k => g.save.vault[k] > 0).sort((a, b) => D.MAT[b].cr - D.MAT[a].cr);
    F.draw(ctx, 'SELL ROCKS', x0 + 6, y0 + 4, T.ink, { scale: 2, shadow: false });
    F.draw(ctx, 'BUYERS ARE WAITING. THEY ARE ALWAYS WAITING.', x0 + 6, y0 + 20, T.dim, { shadow: false });
    if (!keys.length) {
      F.draw(ctx, 'YOUR VAULT IS EMPTY.', x0 + w / 2, y0 + 56, T.ink, { center: true, shadow: false });
      F.draw(ctx, 'FLY TO A PLANET, DIG, COME BACK.', x0 + w / 2, y0 + 68, T.dim, { center: true, shadow: false });
      return;
    }
    const ROW = 16, ly = y0 + 32, lh = h - 62;
    F.draw(ctx, 'ROCK', x0 + 24, ly, T.faint, { shadow: false });
    F.draw(ctx, 'QTY', x0 + w - 120, ly, T.faint, { right: true, shadow: false });
    F.draw(ctx, 'EACH', x0 + w - 64, ly, T.faint, { right: true, shadow: false });
    F.draw(ctx, 'TOTAL', x0 + w - 8, ly, T.faint, { right: true, shadow: false });
    ctx.save(); ctx.beginPath(); ctx.rect(x0, ly + 9, w, lh); ctx.clip();
    const maxScroll = Math.max(0, keys.length * ROW - lh);
    S.scrollTo = Math.min(S.scrollTo, maxScroll);
    for (let i = 0; i < keys.length; i++) {
      const mat = +keys[i], n = g.save.vault[mat], y = ly + 10 + i * ROW - Math.round(S.scroll);
      if (y > y0 + h || y + ROW < ly) continue;
      rr(ctx, x0 + 4, y, w - 12, ROW - 2, 3, i % 2 ? '#ffffff' : '#f7f8fc');
      PD.art.oreChip(ctx, mat, x0 + 7, y + 1, 12);
      F.draw(ctx, clip(D.MAT[mat].name.toUpperCase(), 18), x0 + 24, y + 4, T.ink, { shadow: false });
      const price = g.priceOf(mat), d = g.demandFor(mat);
      F.draw(ctx, 'X' + n, x0 + w - 120, y + 4, T.ink, { right: true, shadow: false });
      F.draw(ctx, '$' + U.fmt(price), x0 + w - 64, y + 4, T.ink, { right: true, shadow: false });
      if (d > 1.06 || d < 0.94) { const up = d > 1.06; rr(ctx, x0 + w - 104, y + 2, 22, 9, 2, up ? T.green : T.red); F.draw(ctx, up ? 'HOT' : 'LOW', x0 + w - 93, y + 3, '#ffffff', { center: true, shadow: false }); }
      F.draw(ctx, '$' + U.fmt(price * n), x0 + w - 8, y + 4, T.green, { right: true, shadow: false });
    }
    ctx.restore();
    const val = g.vaultValue(), bonus = g.baseBonus ? g.baseBonus('refinery') : 0;
    const total = Math.round(val * (1 + bonus));
    const byy = y0 + h - 24;
    X.rect(ctx, x0 + 4, byy - 4, w - 12, 1, T.line);
    F.draw(ctx, g.vaultTotal() + ' ROCKS' + (bonus ? '  +' + Math.round(bonus * 100) + '% REFINERY' : ''), x0 + 6, byy + 5, T.dim, { shadow: false });
    const pulse = g.tutActive && g.tutActive() ? Math.sin(t * 6) > 0 : false;
    if (button(ctx, x0 + w - 150, byy, 142, 18, 'SELL IT ALL  $' + U.fmt(total), { col: pulse ? '#2fbf5a' : T.green })) {
      if (!val) { A.sfx.deny(); return; }
      g.sellAll();
      burst(x0 + w - 80, byy, 40);
      toast('SOLD', 'THE LOT. $' + U.fmt(total) + '. NOBODY LOOKED AT IT.', T.green);
    }
  }

  /* ============================================================== CHUM BANK */
  function drawBank(ctx, g, t, x0, y0, w, h) {
    const debt = g.save.debt || 0, paid = g.save.paid || 0, D0 = PD.chum.DEBT0 || 1000000;
    // a navy and gold private bank
    for (let y = 0; y < h; y++) X.rect(ctx, x0, y0 + y, w, 1, PT.css(PT.mix(0x0e1630, 0x1a1030, y / h)));
    F.draw(ctx, 'CHUM', x0 + 10, y0 + 6, '#ffc83a', { scale: 2, shadow: false });
    F.draw(ctx, '& SONS PRIVATE BANK', x0 + 62, y0 + 12, '#c8a860', { shadow: false });
    X.rect(ctx, x0 + 10, y0 + 22, w - 130, 1, '#5a4a28');
    // Mr Chum himself, in the corner, watching
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + w - 112, y0 + 4, 106, h - 8); ctx.clip();
    rr(ctx, x0 + w - 112, y0 + 4, 106, h - 8, 4, '#16204a');
    PT.glow(ctx, x0 + w - 59, y0 + 50, 60, '#ffc83a', 0.12);
    PD.chum.drawChumAt(ctx, x0 + w - 59, y0 + h + 30, 1.1, S.bankTalk > 0, t);
    ctx.restore();
    S.bankTalk = Math.max(0, (S.bankTalk || 0) - 1 / 60);
    const say = S.bankSay || (debt > 0 ? 'I CAN SEE YOUR BALANCE FROM HERE.' : 'YOU ARE FREE. I HATE IT.');
    const lines = wrap(say, 16);
    const bh2 = lines.length * 9 + 6;
    rr(ctx, x0 + w - 108, y0 + 8, 98, bh2, 3, '#ffffff');
    X.poly(ctx, [[x0 + w - 70, y0 + 8 + bh2], [x0 + w - 62, y0 + 8 + bh2], [x0 + w - 66, y0 + 13 + bh2]], '#ffffff');
    lines.forEach((l, i) => F.draw(ctx, l, x0 + w - 104, y0 + 11 + i * 9, T.ink, { shadow: false }));

    const lx = x0 + 10;
    if (debt > 0) {
      F.draw(ctx, 'LOAN ACCOUNT 0000-POOL', lx, y0 + 28, '#8a90b8', { shadow: false });
      F.draw(ctx, 'YOU OWE', lx, y0 + 40, '#c8d0f0', { shadow: false });
      F.draw(ctx, '$' + U.fmt(debt), lx, y0 + 50, '#ff5a6a', { scale: 3, shadow: false });
      // the bar, with a shark swimming along it
      const f = U.clamp(paid / D0, 0, 1), bw = w - 140;
      rr(ctx, lx, y0 + 76, bw, 8, 4, '#2a2448'); rr(ctx, lx, y0 + 76, Math.max(8, bw * f), 8, 4, '#ffc83a');
      const sx = lx + bw * f, sy = y0 + 73 + Math.sin(t * 4) * 1;
      X.poly(ctx, [[sx - 2, sy], [sx + 4, sy], [sx, sy - 6]], '#6a8ac8');
      F.draw(ctx, 'PAID $' + U.fmt(paid) + '   ' + Math.round(f * 100) + '%', lx, y0 + 88, '#8a90b8', { shadow: false });
      F.draw(ctx, 'IN YOUR POCKET: $' + U.fmt(g.save.credits), lx, y0 + 100, '#8affa0', { shadow: false });
      const amts = [[10000, 'PAY $10K'], [100000, 'PAY $100K'], [1000000, 'PAY $1M'], [Infinity, 'PAY IT ALL']];
      for (let i = 0; i < amts.length; i++) {
        const [a, lab] = amts[i];
        const amt = a === Infinity ? Math.min(debt, g.save.credits) : Math.min(a, debt);
        const ok = amt > 0 && g.save.credits >= (a === Infinity ? 1 : amt);
        const bxx = lx + (i % 2) * 112, byy = y0 + 112 + Math.floor(i / 2) * 18;
        if (button(ctx, bxx, byy, 106, 14, lab, { col: i === 3 ? '#e5394a' : '#c8902a', enabled: ok })) {
          const got = PD.story.pay(g, amt);
          if (got > 0) {
            burst(bxx + 53, byy, 24);
            S.bankTalk = 2;
            S.bankSay = U.pick(['LOVELY. KEEP GOING.', 'I CAN HEAR IT. THE MONEY. IT SINGS.', 'THAT IS A START. A SMALL ONE.', 'MY POOL THANKS YOU.', 'MORE. PLEASE. NO, NOT PLEASE. MORE.']);
            toast('CHUM BANK', 'PAYMENT OF $' + U.fmt(got) + ' RECEIVED.', '#ffc83a');
          }
        }
      }
    } else {
      F.draw(ctx, 'LOAN: PAID IN FULL', lx, y0 + 30, '#8affa0', { shadow: false });
      F.draw(ctx, 'NOW: GET RICH', lx, y0 + 44, '#ffc83a', { scale: 2, shadow: false });
      const nw = PD.story.netWorth(g), goal = PD.story.RICH;
      const f = U.clamp(nw / goal, 0, 1), bw = w - 140;
      F.draw(ctx, '$' + U.fmt(nw) + ' OF $' + U.fmt(goal), lx, y0 + 64, '#c8d0f0', { shadow: false });
      rr(ctx, lx, y0 + 74, bw, 8, 4, '#2a2448'); rr(ctx, lx, y0 + 74, Math.max(8, bw * f), 8, 4, '#8affa0');
      F.draw(ctx, 'BUILD THINGS THAT MAKE MONEY.', lx, y0 + 92, '#8a90b8', { shadow: false });
      F.draw(ctx, 'BLOW UP PLANETS. SELL THE BITS.', lx, y0 + 102, '#8a90b8', { shadow: false });
    }
  }

  /* =================================================================== MAIL */
  function mailbox(g) {
    const debt = g.save.debt || 0;
    const box = [];
    if (debt > 0) box.push(['MR CHUM', 'RE: MY POOL', 'I HAVE HAD THE POOL CLEANED. THE BILL IS ON YOUR ACCOUNT. SO IS THE POOL. SO IS THE BILL FOR THE BILL. YOU OWE $' + U.fmt(debt) + '. SMILE.', '#5a7ab0']);
    else box.push(['MR CHUM', 'CONGRATULATIONS', 'YOU PAID ME BACK. I AM CONFUSED AND UPSET. I WILL FIND A WAY TO LEND YOU MORE MONEY. SOON.', '#5a7ab0']);
    if (S.lastBuy) box.push(['ABAY ORDERS', 'YOUR ORDER: ' + S.lastBuy, 'YOUR ORDER HAS BEEN DELIVERED. IT WAS THROWN AT YOUR MOON FROM ORBIT. IT IS FINE. PROBABLY.', '#e5394a']);
    box.push(['MUM', 'ARE YOU EATING', 'ARE YOU EATING. ARE YOU DESTROYING ENOUGH PLANETS. ARE YOU WEARING A HAT. ANSWER ONE. ANSWER ALL. LOVE MUM.', '#ff8ab0']);
    if (PD.build && PD.build.funScore(g) > 0) box.push(['MOON REVIEWS', 'NEW REVIEW: 5 STARS', 'LOVELY LITTLE MOON. THE SHARK FLOATIE WAS WONDERFUL. THE OWNER WAS SWEATY. WILL VISIT AGAIN.', '#8affa0']);
    box.push(['ZORB OS', 'UPDATE AVAILABLE', 'ZORB OS 11 IS HERE. IT IS THE SAME AS ZORB OS 10 BUT THE BUTTONS ARE ROUNDER. INSTALL NOW. OR LATER. OR NOW.', '#7ef9ff']);
    box.push(['NOVA CORPS', 'YOU ARE ON A LIST', 'THIS IS AN AUTOMATED MESSAGE. YOU HAVE BEEN PUT ON A LIST. IT IS NOT A GOOD LIST. HAVE A NICE DAY.', '#ffd34d']);
    box.push(['BRENDA', 'squeak', 'SQUEAK. SQUEAK SQUEAK. CHEESE. SQUEAK. (BRENDA HAS LEARNED TO TYPE. THIS IS A PROBLEM.)', '#c8b8d8']);
    return box;
  }
  function drawMail(ctx, g, t, x0, y0, w, h) {
    const box = mailbox(g);
    S.mail = U.clamp(S.mail, 0, box.length - 1);
    const lw = 130;
    X.rect(ctx, x0, y0, lw, h, '#eef0f6'); X.rect(ctx, x0 + lw, y0, 1, h, T.line);
    for (let i = 0; i < box.length; i++) {
      const y = y0 + 3 + i * 20, on = S.mail === i;
      if (on) rr(ctx, x0 + 3, y, lw - 6, 18, 3, '#ffffff');
      X.blob(ctx, x0 + 12, y + 9, 6, 6, box[i][3]);
      F.draw(ctx, box[i][0][0], x0 + 12, y + 6, '#ffffff', { center: true, shadow: false });
      F.draw(ctx, clip(box[i][0], 16), x0 + 22, y + 3, T.ink, { shadow: false });
      F.draw(ctx, clip(box[i][1], 16), x0 + 22, y + 11, T.dim, { shadow: false });
      if (clicked(x0 + 3, y, lw - 6, 18)) { S.mail = i; A.sfx.tone(1200, { type: 'square', dur: 0.02, vol: 0.03 }); }
    }
    const m = box[S.mail];
    const rx = x0 + lw + 10;
    X.blob(ctx, rx + 8, y0 + 12, 8, 8, m[3]); F.draw(ctx, m[0][0], rx + 8, y0 + 9, '#ffffff', { center: true, shadow: false });
    F.draw(ctx, m[0], rx + 22, y0 + 5, T.ink, { shadow: false });
    F.draw(ctx, 'TO: YOU', rx + 22, y0 + 14, T.faint, { shadow: false });
    F.draw(ctx, m[1].toUpperCase(), rx, y0 + 28, T.ink, { shadow: false });
    X.rect(ctx, rx, y0 + 38, w - lw - 20, 1, T.line);
    wrap(m[2], Math.floor((w - lw - 20) / 6)).forEach((l, i) => F.draw(ctx, l, rx, y0 + 44 + i * 10, T.dim, { shadow: false }));
  }

  /* =============================================================== SETTINGS */
  function drawSetup(ctx, g, t, x0, y0, w, h) {
    const lx = x0 + 12;
    F.draw(ctx, 'THIS ZORBBOOK', lx, y0 + 8, '#ffffff', { scale: 2, shadow: false });
    const lines = [
      'OWNER: YOU (FOUND IT)',
      'PLANETS DESTROYED: ' + g.save.destroyed.filter(Boolean).length + ' OF ' + D.BODIES.length,
      'TOTAL EARNED: $' + U.fmt(g.save.totalEarned || 0),
      'TITLE: ' + D.titleFor(g.save.dominion)
    ];
    lines.forEach((l, i) => F.draw(ctx, l, lx, y0 + 28 + i * 10, '#aab4d8', { shadow: false }));
    const yy = y0 + 72;
    if (button(ctx, lx, yy, 110, 14, A.state.sfx ? 'SOUND: ON' : 'SOUND: OFF', { col: '#3a5ad8' })) { A.toggleSfx(!A.state.sfx); A.toggleMusic(A.state.sfx); }
    if (button(ctx, lx + 118, yy, 110, 14, 'FULL SCREEN', { col: '#3a5ad8' })) { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* no */ } }
    if (button(ctx, lx, yy + 20, 110, 14, 'CHANGE WALLPAPER', { col: '#2a9a8a' })) { S.wall = (S.wall + 1) % 3; g.save.wall = S.wall; paintWall(S.wall); }
    if (button(ctx, lx, yy + 46, 228, 14, S.wipe > 0 ? 'REALLY? CLICK AGAIN TO WIPE' : 'THROW EVERYTHING AWAY (WIPE SAVE)', { col: '#c83a3a' })) {
      if (S.wipe > 0) { S.wipe = 0; g.wipeSave(); toast('ZORB OS', 'IT IS ALL GONE. WELL DONE.', T.red); }
      else S.wipe = 3;
    }
    S.wipe = Math.max(0, S.wipe - 1 / 60);
  }

  /* =================================================================== HANDS
     Your own two tentacles: one on the keys, one on the trackpad. */
  const HANDS = {};
  function handArt(P) {
    const key = P.skin;
    if (HANDS[key]) return HANDS[key];
    const B = PT.buf(64, 80);
    const base = PT.hex(P.skin), C = [base, PT.hex(P.skinL), PT.hex(P.skinD)];
    // a thick tentacle curling up from the bottom to a round tip
    for (let i = 0; i <= 40; i++) {
      const q = i / 40;
      const x = 32 + Math.sin(q * 2.2) * 10, y = 78 - q * 62, r = 13 - q * 6;
      B.ball(x, y, r, r * 0.9, C);
    }
    for (let i = 0; i < 6; i++) { const q = 0.2 + i * 0.13; B.disc(32 + Math.sin(q * 2.2) * 10 - 6, 78 - q * 62 + 2, 2.4 - i * 0.2, PT.mix(C[1], 0xffffff, 0.3)); }
    B.outline(0x160f24);
    return (HANDS[key] = B.toCanvas());
  }
  function drawHands(ctx, g, t) {
    const P = PD.art.skinFor(g.save.cos).P;
    const cv = handArt(P);
    // left hand over the keys, tapping when you click
    const tapL = S.typeT > 0 && S.tapHand ? 3 : 0;
    ctx.save(); ctx.translate(150, 246 + tapL + Math.sin(t * 2.4) * 0.8); ctx.rotate(0.35);
    ctx.drawImage(cv, -16, -10, 32, 40);
    ctx.restore();
    // right hand on the trackpad, moving with the pointer
    const mp = mousePos(), hx = mp[0] + 2, hy = mp[1] + 4 + (S.press > 0.5 ? 2 : 0);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.2);
    ctx.drawImage(cv, -16, -10, 32, 40);
    ctx.restore();
  }

  function touchMode() { return 'ui'; }

  PD.desk = { enter, update, draw, close, touchMode, S, SX, SY, SW, SH, shelf, toast };
})(window.PD);
