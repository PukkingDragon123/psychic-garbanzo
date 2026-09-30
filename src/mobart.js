/* MOBART: everything that lives inside the planets, painted again at double
   detail with the paint kit, four frames each so they crawl, pulse, snap and
   wave instead of flicking between two poses.

   Every sprite faces right, is anchored on the middle of its body (which is
   where its hit box is centred), and replaces the old sprite of the same
   name in PD.art.sprites, so nothing that draws them has to change.

   Three new ones live down there too:
     ORE MIMIC       a lump of gold ore. Until it is not.
     NOVA DRONE      a police drone that floats about and shoots
     SPLITTER SLIME  kill it and it comes apart into a handful of mites */
(function (PD) {
  'use strict';
  const U = PD.util;
  const PT = PD.paint;
  const HD = 2;
  const INK = 0x160f24;
  const R = PT.ramp;
  const EYE = 0xfff8e0, PUP = 0x1a1024;

  function eye(B, x, y, r, look, col) {
    B.disc(x, y, r + 1, INK);
    B.disc(x, y, r, col || EYE);
    B.disc(x + (look || 0.35) * r, y + 0.2 * r, r * 0.55, PUP);
    B.disc(x + (look || 0.35) * r - r * 0.35, y - r * 0.3, Math.max(1, r * 0.22), 0xffffff);
  }
  function teeth(B, x0, x1, y, down, n, col) {
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) B.poly([[x0 + i * w, y], [x0 + (i + 1) * w, y], [x0 + (i + 0.5) * w, y + down]], col || 0xffffff);
  }
  function sheen(B, x, y, rx, ry) { B.ellipse(x, y, rx, ry, 0xffffff, 0.55); }

  /* each painter: (B, f) with B sized W x H at double detail, f = 0..3 */
  const P = {
    grub: { w: 26, h: 18, ox: 13, oy: 10, paint(B, f) {
      const C = [0x7ad84a, 0xc4ff8a, 0x3a8a2a];
      for (let i = 0; i < 5; i++) {
        const x = 8 + i * 8, y = 20 + Math.sin(f / 4 * U.TAU + i * 1.1) * 1.6 - (i === 4 ? 1 : 0), r = 6 + i * 1.3;
        B.ball(x, y, r, r * 0.86, C);
        B.rect(x - r * 0.4, y - r * 0.9, r * 0.8, 2, 0x5aa83a);
        // stubby legs
        const d = (f + i) % 2;
        B.rect(x - 2, y + r * 0.7, 3, 4 - d, 0x2a5a1a);
      }
      B.ellipse(44, 22, 5, 3, 0xe8ffc8, 0.6);
      eye(B, 44, 15, 3.4, 0.4); eye(B, 38, 15, 2.8, 0.4);
      B.poly([[49, 22], [53, 20 + (f % 2) * 2], [50, 25]], 0x8a5a2a);
      B.disc(46, 23, 1.4, 0xd83a4a);
    } },
    jelly: { w: 24, h: 30, ox: 12, oy: 12, paint(B, f) {
      const pulse = [0, 1.5, 3, 1.5][f];
      for (let i = 0; i < 5; i++) {
        let x = 10 + i * 7, y = 30 - pulse * 0.5;
        for (let k = 0; k < 16; k++) { x += Math.sin(k * 0.6 + f * 1.4 + i) * 0.9; B.disc(x, y + k * 1.6, 1.8 - k * 0.07, k % 2 ? 0x9a5ae8 : 0xc88aff, 0.85); }
      }
      B.ellipse(24, 20 - pulse * 0.3, 20 - pulse, 15 + pulse * 0.6, 0x7a3ac8, 0.75);
      B.ellipse(24, 18 - pulse * 0.3, 17 - pulse, 12 + pulse * 0.5, 0xa86ae8, 0.7);
      B.ellipse(24, 23, 12, 5, 0xffb8ff, 0.35);
      B.rect(8, 28 - pulse * 0.2, 32, 2, 0x5a2a9a, 0.8);
      sheen(B, 16, 10, 5, 3);
      eye(B, 25, 19, 6, 0.3, 0xe8f8ff);
    } },
    spit: { w: 28, h: 22, ox: 14, oy: 12, paint(B, f) {
      const C = [0x8ac83a, 0xd8ff8a, 0x4a7a1a];
      B.ellipse(24, 38, 22, 5, 0x5a4a3a);
      const lean = [0, 1, 2, 1][f];
      for (let k = 0; k < 6; k++) B.ball(18 + k * 2 + lean * (k / 5), 36 - k * 5, 9 - k * 0.3, 7, C);
      for (let k = 0; k < 5; k++) B.poly([[14 + k * 3, 34 - k * 5], [10 + k * 3, 30 - k * 5], [16 + k * 3, 30 - k * 5]], 0x4a7a1a);
      // the lips, and the green glow in the throat
      const open = [2, 4, 6, 4][f];
      B.ellipse(34 + lean, 12, 9, 4 + open * 0.6, 0xd85a8a);
      B.ellipse(35 + lean, 12, 6, open * 0.6 + 0.5, 0x2a1020);
      B.ellipse(36 + lean, 12, 3, open * 0.3, 0xb6ff8a);
      eye(B, 26 + lean, 7, 3.4, 0.5); eye(B, 20 + lean, 9, 2.6, 0.5);
    } },
    gnasher: { w: 32, h: 24, ox: 16, oy: 13, paint(B, f) {
      const C = [0xd8583a, 0xff9a6a, 0x8a2a1a];
      const run = f / 4 * U.TAU;
      for (const [lx, ph] of [[16, 0], [26, 2], [36, 1], [46, 3]]) {
        const s = Math.sin(run + ph * 1.6) * 4;
        B.line(lx, 30, lx + s, 42, 0x6a1a10, 4); B.rect(lx + s - 3, 41, 7, 3, 0x3a0a08);
      }
      B.ball(30, 26, 24, 13, C);
      for (let i = 0; i < 5; i++) B.poly([[14 + i * 8, 16], [20 + i * 8, 15], [16 + i * 8, 6 - (i % 2) * 3]], 0xffd0a0);
      // the jaw: most of him
      const jaw = [0, 3, 6, 3][f];
      B.ball(50, 24, 12, 10, C);
      B.poly([[40, 30], [62, 28 + jaw], [58, 36 + jaw], [42, 36]], 0xa83a2a);
      teeth(B, 44, 62, 26, 5, 5); teeth(B, 44, 60, 30 + jaw, -4, 4);
      eye(B, 52, 16, 3.6, 0.5, 0xffe070);
      B.line(47, 11, 56, 13, INK, 2);
    } },
    lurker: { w: 38, h: 32, ox: 19, oy: 16, paint(B, f) {
      const C = [0x2a4a8a, 0x5a8ad8, 0x142448];
      const lb = [0, -2, -3, -2][f];
      B.line(46, 18, 54, 4 + lb, 0x5a7ab8, 2); B.line(54, 4 + lb, 62, 8 + lb, 0x5a7ab8, 2);
      B.disc(63, 10 + lb, 4, 0xfff0a0); B.disc(63, 10 + lb, 2.5, 0xffffff);
      B.poly([[8, 32], [0, 18 + (f % 2) * 4], [0, 46 - (f % 2) * 4]], 0x1e3a6a);
      B.ball(36, 34, 30, 22, C);
      for (let k = 0; k < 7; k++) B.disc(18 + k * 6, 44, 1.5, 0x7ef9ff, 0.8);
      B.poly([[28, 16], [36, 6], [42, 16]], 0x1e3a6a);
      const jaw = [0, 2, 4, 2][f];
      B.poly([[48, 38], [72, 34], [70, 50 + jaw], [48, 48]], 0x0e1a34);
      teeth(B, 50, 70, 36, 6, 6, 0xe8f0ff); teeth(B, 50, 68, 48 + jaw, -5, 5, 0xe8f0ff);
      eye(B, 54, 26, 4.5, 0.5, 0xffe070);
    } },
    warden: { w: 58, h: 52, ox: 29, oy: 26, paint(B, f) {
      const C = [0x6a5a7a, 0x9a8aa8, 0x3a2e48];
      const a0 = f / 4 * U.TAU;
      // rocks in orbit round him
      for (let k = 0; k < 5; k++) { const a = a0 * 0.5 + k / 5 * U.TAU, x = 58 + Math.cos(a) * 50, y = 56 + Math.sin(a) * 18; if (Math.sin(a) < 0) B.ball(x, y, 5, 4, C); }
      // shoulders, floating
      for (const s of [-1, 1]) B.ball(58 + s * 34, 50 + Math.sin(a0 + s) * 2, 14, 12, C, true);
      B.ball(58, 56, 30, 32, C);
      B.texture(28, 24, 60, 64, [0x5a4a6a, 0x6a5a7a, 0x7a6a8a], 6, 3, (x, y) => B.alpha(x, y) > 0 && Math.hypot(x - 58, y - 56) < 26);
      // glowing runes and the core in his chest
      for (let k = 0; k < 6; k++) B.line(40 + k * 7, 66, 44 + k * 7, 78, 0xff9a3a, 1, 0.8);
      B.disc(58, 62, 9, 0xff6a2a); B.disc(58, 62, 6, 0xffb03a); B.disc(58, 62, 3, 0xfff0c0);
      // the head: a slab with one eye
      B.block(40, 12, 36, 22, [0x7a6a8a, 0xa898b8, 0x4a3e58], 5, 5);
      B.rect(44, 20, 28, 6, 0x1a1024);
      const eyeX = 50 + [0, 4, 8, 4][f];
      B.rect(eyeX, 21, 8, 4, 0xff5a2a); B.rect(eyeX + 2, 22, 4, 2, 0xfff0a0);
      for (let k = 0; k < 5; k++) { const a = a0 * 0.5 + k / 5 * U.TAU, x = 58 + Math.cos(a) * 50, y = 56 + Math.sin(a) * 18; if (Math.sin(a) >= 0) B.ball(x, y, 5, 4, C); }
    } },
    mite: { w: 16, h: 14, ox: 8, oy: 7, paint(B, f) {
      for (let i = 0; i < 3; i++) { const d = (f + i) % 2 ? 2 : -1; B.line(10 + i * 5, 18, 6 + i * 5, 25 + d, 0x3a0a10, 2); B.line(12 + i * 5, 18, 16 + i * 5, 25 - d, 0x3a0a10, 2); }
      B.ball(16, 15, 10, 8, [0xd83a4a, 0xff7a8a, 0x7a1a2a], true);
      B.ball(25, 15, 5, 5, [0x8a1a2a, 0xc84a5a, 0x4a0a14]);
      eye(B, 26, 13, 2, 0.5);
      B.line(28, 11, 31, 6 - (f % 2), 0x3a0a10, 1);
    } },
    shellback: { w: 42, h: 30, ox: 21, oy: 16, paint(B, f) {
      const run = f / 4 * U.TAU;
      for (const [lx, ph] of [[20, 0], [32, 2], [44, 1], [56, 3]]) { const s = Math.sin(run + ph * 1.6) * 3; B.rect(lx + s - 3, 40, 6, 12, 0x3a3444); }
      B.ball(70, 38, 9, 8, [0x8a8a6a, 0xb8b89a, 0x5a5a3a]);
      eye(B, 73, 35, 2.6, 0.5);
      // the shell: plates with bolts
      B.ball(40, 32, 34, 22, [0x6a7088, 0xa8b0c8, 0x3a3e50], true);
      for (let k = 0; k < 4; k++) { B.line(16 + k * 16, 18, 20 + k * 16, 48, 0x3a3e50, 2); B.disc(22 + k * 16, 26, 2, 0xd8dce8); }
      B.rect(8, 44, 64, 4, 0x2a2e3c);
      for (let k = 0; k < 6; k++) B.poly([[14 + k * 10, 14], [20 + k * 10, 14], [17 + k * 10, 6]], 0xc8ccd8);
    } },
    wyrm: { w: 46, h: 28, ox: 23, oy: 14, paint(B, f) {
      const C = [0x5a2a2a, 0x8a4a3a, 0x2a1414];
      const ph = f / 4 * U.TAU;
      for (let k = 11; k >= 0; k--) {
        const x = 8 + k * 6, y = 32 + Math.sin(ph + k * 0.7) * 6, r = 6 + Math.min(k, 6) * 0.8;
        B.ball(x, y, r, r * 0.9, C);
        B.line(x - r * 0.6, y - 1, x + r * 0.4, y + 2, 0xff7a2a, 1, 0.9);
        if (k % 2) B.disc(x, y - r * 0.6, 1.5, 0xffb03a);
      }
      const hy = 32 + Math.sin(ph + 12 * 0.7) * 6;
      B.ball(80, hy - 2, 11, 9, C);
      B.poly([[76, hy - 9], [70, hy - 20], [80, hy - 10]], 0xd8b8a0); B.poly([[84, hy - 9], [86, hy - 21], [88, hy - 8]], 0xd8b8a0);
      eye(B, 84, hy - 4, 3, 0.5, 0xffd34d);
      B.poly([[86, hy + 3], [92, hy + 2], [88, hy + 6]], 0xff5a2a);
    } },
    crab: { w: 34, h: 26, ox: 17, oy: 14, paint(B, f) {
      const C = [0xc86a3a, 0xff9a6a, 0x7a3a1a];
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const d = ((f + i) % 2) * 2; B.line(34 + s * (8 + i * 6), 34, 34 + s * (14 + i * 7), 46 - d, 0x6a2a10, 2); }
      B.ball(34, 30, 20, 12, C, true);
      for (let k = 0; k < 4; k++) B.disc(24 + k * 7, 24, 1.5, 0x8a3a1a);
      // claws: the big one out front
      const snap = f % 2 ? 4 : 0;
      B.line(50, 30, 58, 22, 0xa84a2a, 4); B.ball(62, 18, 8, 6, C); B.poly([[62, 14], [72, 10 - snap], [66, 18]], 0xff9a6a); B.poly([[62, 22], [72, 24 + snap], [66, 18]], 0xc86a3a);
      B.line(18, 30, 12, 24, 0xa84a2a, 3); B.ball(10, 22, 5, 4, C);
      for (const s of [-1, 1]) { B.line(34 + s * 6, 20, 34 + s * 8, 10, 0x7a3a1a, 2); eye(B, 34 + s * 8, 9, 2.6, 0.4); }
    } },
    bloomer: { w: 28, h: 38, ox: 14, oy: 22, paint(B, f) {
      const bob = [0, 1, 2, 1][f];
      for (let k = 0; k < 4; k++) B.line(20 + k * 5, 64, 16 + k * 7, 74, 0x5a3a2a, 2);
      B.round(18, 36 + bob, 20, 30 - bob, 8, 0xe8d8c0);
      B.rect(20, 40 + bob, 4, 22, 0xfff0e0);
      eye(B, 24, 46 + bob, 2.6, 0.4); eye(B, 32, 46 + bob, 2.6, 0.4);
      B.ellipse(28, 54 + bob, 3, 1.5 + (f % 2), 0x3a1a1a);
      B.ball(28, 30 + bob, 24, 14, [0xe85a9a, 0xff9ac8, 0x8a2a5a]);
      for (const [x, y, r] of [[16, 26, 4], [30, 20, 5], [42, 28, 4], [24, 34, 3], [38, 36, 3]]) B.disc(x, y + bob, r, 0xfff0f8);
      if (f === 2) for (let k = 0; k < 5; k++) B.disc(10 + k * 9, 10 + (k % 2) * 4, 2, 0xff9ecb, 0.7);
    } },
    driller: { w: 38, h: 28, ox: 19, oy: 14, paint(B, f) {
      B.round(8, 40, 48, 12, 6, 0x2a2e3c);
      for (let k = 0; k < 6; k++) B.disc(12 + k * 8 + (f % 2) * 2, 46, 3, 0x5a5e70);
      B.block(12, 18, 40, 24, [0xe8b83a, 0xffe07a, 0x9a7a1a], 5, 4);
      B.rect(16, 24, 18, 8, 0x1a2a3a); B.rect(18, 26, 14, 3, 0x7dff9a);
      B.round(14, 8, 26, 12, 6, 0xff8a2a); B.rect(12, 16, 30, 3, 0xd86a1a);
      // the drill on the front, spinning
      for (let x = 52; x < 76; x++) {
        const h = Math.max(1, 8 * (1 - (x - 52) / 24));
        for (let y = -h; y <= h; y++) B.set(x, 30 + y, ((x + Math.round(y) * 2 + f * 3) % 6) < 3 ? 0xd8dce8 : 0x6a7088);
      }
      B.rect(48, 24, 6, 12, 0x6a7088);
    } },
    hangman: { w: 30, h: 42, ox: 15, oy: 24, paint(B, f) {
      const sw = [0, 1, 0, -1][f];
      B.line(30, 0, 30 + sw, 30, 0xd8d8e8, 1);
      for (let k = 0; k < 4; k++) for (const s of [-1, 1]) {
        const a = 0.4 + k * 0.35, curl = (f % 2) * 0.1;
        const x1 = 30 + sw + s * Math.cos(a) * 16, y1 = 44 - Math.sin(a) * 12;
        B.line(30 + sw, 44, x1, y1, 0x3a2a4a, 2); B.line(x1, y1, x1 + s * 6, y1 + 14 + curl * 20, 0x3a2a4a, 2);
      }
      B.ball(30 + sw, 46, 13, 12, [0x4a3a6a, 0x7a6a9a, 0x2a1a3a], true);
      B.ball(30 + sw, 34, 8, 7, [0x4a3a6a, 0x7a6a9a, 0x2a1a3a]);
      eye(B, 27 + sw, 46, 4, 0.2, 0xff5a6a); eye(B, 35 + sw, 46, 4, 0.2, 0xff5a6a);
      B.disc(31 + sw, 38, 1.5, 0xff5a6a);
      teeth(B, 25 + sw, 37 + sw, 54, 3, 4);
    } },
    // ---- the new ones
    mimic: { w: 28, h: 24, ox: 14, oy: 13, paint(B, f) {
      const open = f >= 2 ? (f === 2 ? 6 : 9) : 0;
      const C = [0x7a6a58, 0xa89a88, 0x4a3e30];
      B.ball(28, 30 + open * 0.3, 22, 13, C);
      for (const [x, y, r] of [[18, 26, 5], [30, 22, 6], [38, 30, 4], [24, 34, 3]]) { B.ball(x, y + open * 0.3, r, r * 0.8, [0xffc83a, 0xfff0a0, 0xb8801a], true); }
      if (open) {
        B.poly([[10, 26], [50, 26], [48, 26 - open], [12, 26 - open]], 0x2a0a10);
        B.ball(28, 22 - open, 22, 10, C);
        for (const [x, y, r] of [[20, 18, 5], [34, 16, 4]]) B.ball(x, y - open, r, r * 0.8, [0xffc83a, 0xfff0a0, 0xb8801a], true);
        teeth(B, 12, 48, 26 - open + 4, 5, 8); teeth(B, 12, 48, 28, -5, 8);
        B.ellipse(30, 26 - open / 2 + 2, 8, 2, 0xd83a5a);
        eye(B, 40, 12 - open, 3, 0.5, 0xffe070);
      }
    } },
    drone: { w: 28, h: 22, ox: 14, oy: 11, paint(B, f) {
      const spin = Math.abs(Math.cos(f / 4 * Math.PI)) * 14 + 2;
      for (const x of [12, 44]) { B.rect(x - 1, 4, 2, 6, 0x5a5e70); B.rect(x - spin / 2, 2, spin, 2, 0xc8ccd8, 0.8); }
      B.ball(28, 24, 18, 13, [0x2a3a6a, 0x5a7ab8, 0x141e3a], true);
      B.rect(10, 22, 36, 3, 0xffd34d);
      B.round(22, 14, 16, 12, 5, 0x0a1424); B.disc(30, 20, 4, f % 2 ? 0xff3a4a : 0x5a1a1a); B.disc(29, 19, 1.4, 0xffffff);
      B.rect(44, 28, 12, 4, 0x3a3e50); B.rect(54, 29, 3, 2, 0xff5a4d);
      B.disc(22, 8, 3, f % 2 ? 0xff3a4a : 0x3a6aff); B.disc(34, 8, 3, f % 2 ? 0x3a6aff : 0xff3a4a);
    } },
    blob: { w: 30, h: 24, ox: 15, oy: 14, paint(B, f) {
      const sq = [0, 2, 4, 2][f];
      B.ellipse(30, 44, 22 + sq, 3, 0x1a4a3a, 0.5);
      B.ball(30, 30 + sq * 0.8, 22 + sq, 16 - sq * 0.8, [0x3ad8a8, 0x9affe0, 0x1a7a5a], true);
      B.ellipse(30, 36 + sq, 14, 5, 0x8affd8, 0.4);
      for (const [x, y] of [[20, 34], [40, 26], [34, 38]]) B.disc(x, y + sq, 2, 0x1a7a5a, 0.6);
      eye(B, 24, 26 + sq, 3.6, 0.3); eye(B, 36, 26 + sq, 3.6, 0.3);
      B.ellipse(30, 34 + sq, 4, 2, 0x0a3a2a);
    } }
  };

  function build(name) {
    const d = P[name];
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const B = PT.buf(d.w * HD, d.h * HD);
      d.paint(B, f);
      B.rim(0xffffff, -1, -1, 0.3);
      B.outline(INK);
      // and a second, blacker ring outside it: the fat cartoon line
      B.outline(0x05030a);
      frames.push(B.toCanvas());
    }
    PD.art.sprites[name] = { frames, w: d.w, h: d.h, hd: HD, ox: d.ox, oy: d.oy };
  }
  for (const name in P) build(name);

  PD.mobart = { P, build };
})(window.PD);
