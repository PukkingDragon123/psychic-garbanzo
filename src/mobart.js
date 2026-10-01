/* MOBART: everything that lives inside the planets.

   These used to be cartoons with googly eyes. They are creatures now: real
   anatomy, lit per pixel off five-tone ramps with the paint kit's shading
   brushes, mottled hides, wet speculars, small mean eyes that glow, teeth
   that look like teeth. Pulp space-opera monsters, painted like a field
   guide. Four frames each, so they breathe, scuttle, pulse and bite.

   Every sprite faces right, is anchored on the middle of its body (which is
   where its hit box is centred), and replaces the old sprite of the same
   name in PD.art.sprites, so nothing that draws them has to change.

   INFO holds each species' field-guide entry: the name you are told when
   you first meet one, what kind of thing it is, how dangerous, and a line
   about it. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const PT = PD.paint;
  const HD = 2;
  const INK = 0x120a14;
  const mix = PT.mix, mul = PT.mul;
  const TAU = Math.PI * 2;

  /* --------------------------------------------------------------- helpers */
  // five tones from a base: shadows fall cool and dark, lights go warm
  function ramp(base, dk, lt) {
    dk = dk === undefined ? 0x140a1c : dk; lt = lt === undefined ? 0xfff2d8 : lt;
    return [mix(base, dk, 0.74), mix(base, dk, 0.44), base, mix(base, lt, 0.3), mix(base, lt, 0.62)];
  }
  // break up a flat hide: low-frequency blotches and fine grain
  function mottle(B, amt, sc, seed, x0, y0, x1, y1) {
    x0 = x0 || 0; y0 = y0 || 0; x1 = x1 || B.w; y1 = y1 || B.h;
    const d = B.d;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * B.w + x) * 4;
      if (d[i + 3] < 128) continue;
      const n = U.fbm(x / sc + seed * 3.1, y / sc + seed * 1.7, 3) - 0.5;
      const gr = (U.hash2(x + seed, y) - 0.5) * 0.18;
      const f = 1 + n * amt + gr * amt * 0.6;
      d[i] = U.clamp(d[i] * f, 0, 255); d[i + 1] = U.clamp(d[i + 1] * f, 0, 255); d[i + 2] = U.clamp(d[i + 2] * f, 0, 255);
    }
  }
  // paint only where something is already painted
  function onto(B, x, y, c, a) { if (B.alpha(x, y) >= 128) B.set(x, y, c, a); }
  function speckle(B, x0, y0, x1, y1, c, dens, seed, a) {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (U.hash2(x * 7 + seed, y * 13) < dens) onto(B, x, y, c, a);
  }
  // a small, mean, glowing eye: dark socket, lit iris, slit, glint
  function glowEye(B, x, y, r, col, slit) {
    B.ellipse(x, y, r + 1.2, r + 0.8, 0x08040a);
    B.disc(x, y, r, mul(col, 0.5));
    B.disc(x - r * 0.15, y - r * 0.1, r * 0.72, col);
    B.disc(x - r * 0.3, y - r * 0.3, r * 0.35, mix(col, 0xffffff, 0.6));
    if (slit) B.rect(x - 0.5, y - r * 0.8, 1, r * 1.6, 0x08040a);
    B.set(x - r * 0.45, y - r * 0.5, 0xffffff);
  }
  // a halo of light, painted into the sprite itself
  function halo(B, x, y, r, c, a) {
    for (let k = 4; k >= 1; k--) B.disc(x, y, r * k / 4, c, (a || 0.25) * (1 - k / 5));
  }
  function fang(B, x, y, len, dx, c, w) {
    w = w || 1.2;
    B.poly([[x - w, y], [x + w, y], [x + dx, y + len]], c || 0xe8dcc0);
    B.line(x - w * 0.4, y, x + dx * 0.7, y + len * 0.7, 0xffffff, 1, 0.5);
  }
  // a limb through a list of joints, thick at the root
  function limb(B, pts, r0, r1, P, o) {
    const n = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[i + 1], ra = r0 + (r1 - r0) * (i / n), rb = r0 + (r1 - r0) * ((i + 1) / n);
      B.tube(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, b[0], b[1], ra, rb, P, Object.assign({ spec: false }, o || {}));
      if (i < n - 1) B.orb(b[0], b[1], rb * 1.1, rb * 1.1, P, { spec: false, alpha: o && o.alpha });
    }
  }
  function claw(B, x, y, ang, len, c) {
    const pts = [];
    for (let k = 0; k <= 6; k++) { const q = k / 6, a = ang + q * 0.9; pts.push([x + Math.cos(a) * len * q, y + Math.sin(a) * len * q]); }
    for (let k = 0; k < 6; k++) B.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], c || 0xe8dcc0, k < 3 ? 2 : 1);
  }
  const wave = (f, k) => Math.sin(f / 4 * TAU + (k || 0));

  /* ----------------------------------------------------------- palettes */
  const BONE = ramp(0xd8c8a0), CHITIN = ramp(0x5a2a1e), IVORY = [0x8a7a5a, 0xb8a888, 0xe0d4b8, 0xf2ead8, 0xffffff];
  const GLOW_AMBER = 0xffb23a, GLOW_RED = 0xff3a2a, GLOW_GREEN = 0x9aff4a, GLOW_CYAN = 0x6af6ff;

  /* each painter: (B, f) with B sized W x H at double detail, f = 0..3 */
  const P = {
    /* STONE MAGGOT -- grub */
    grub: { w: 34, h: 20, ox: 17, oy: 11, paint(B, f) {
      const BODY = ramp(0xb89a74), PLATE = ramp(0x7a5638);
      for (let i = 0; i < 7; i++) {
        const x = 8 + i * 6.8, y = 24 + wave(f, -i * 0.9) * 1.6, rx = 4.8 + Math.min(i, 5) * 0.95, ry = rx * 0.86;
        // the legs under each ring, stepping in a wave
        const st = wave(f, -i * 1.3);
        B.line(x - 1, y + ry * 0.6, x - 2 + st * 1.5, y + ry + 3, 0x3a2614, 1);
        B.line(x + 1.5, y + ry * 0.6, x + 2 - st * 1.5, y + ry + 3, 0x2a1a0c, 1);
        B.orb(x, y, rx, ry, BODY, { spec: false });
        B.orb(x + 0.5, y - ry * 0.32, rx * 0.92, ry * 0.62, PLATE, { spec: false, clip: (px, py) => py < y - ry * 0.05 });
        B.line(x - rx * 0.9, y - ry * 0.6, x - rx * 0.9, y + ry * 0.5, mul(BODY[1], 0.8), 1, 0.7);
        B.set(x - rx * 0.3, y - ry * 0.75, 0xfff0d8, 0.8);
        // bristles
        if (i % 2) B.line(x, y - ry - 0.5, x - 1, y - ry - 3, 0x3a2614, 1, 0.8);
      }
      // the head capsule: hard, glossy, dark
      const hx = 56, hy = 23 + wave(f, -6.3) * 1.2;
      B.orb(hx, hy, 7.5, 6.8, CHITIN);
      B.line(hx - 2, hy - 6, hx + 2, hy + 4, CHITIN[0], 1, 0.6);
      // mandibles: two curved hooks that open and close
      const op = [3, 1.5, 0, 1.5][f];
      B.tube(hx + 5, hy - 3, hx + 10, hy - 4 - op, hx + 11, hy - op * 0.4, 1.8, 0.7, ramp(0x3a1a0e), { spec: false });
      B.tube(hx + 5, hy + 3, hx + 10, hy + 4 + op, hx + 11, hy + op * 0.4, 1.8, 0.7, ramp(0x3a1a0e), { spec: false });
      for (const [ex, ey] of [[hx + 2, hy - 4], [hx + 4, hy - 3], [hx + 1, hy - 2]]) { B.disc(ex, ey, 1.1, 0x100608); B.set(ex, ey, GLOW_AMBER); }
      B.set(hx + 9, hy + 2, 0xc8ff9a, 0.8); B.set(hx + 9, hy + 3, 0xc8ff9a, 0.6);
      mottle(B, 0.35, 5, 1);
    } },

    /* VOID MEDUSA -- jelly */
    jelly: { w: 30, h: 40, ox: 15, oy: 14, paint(B, f) {
      const p = [0, 1.4, 2.6, 1.4][f];
      const BELL = ramp(0x5a3aa8, 0x0a0420, 0xe8d8ff);
      // long stinging filaments, behind everything
      for (let i = 0; i < 9; i++) {
        let x = 10 + i * 5, y = 36 - p * 0.4;
        for (let k = 0; k < 40; k++) {
          x += Math.sin(k * 0.22 + f * 1.3 + i * 1.7) * 0.55;
          B.set(x, y + k, i % 2 ? 0x6a58c8 : 0x8a7ae8, 0.75 - k * 0.012);
          if (k % 9 === 4) B.set(x, y + k, GLOW_CYAN, 0.9);
        }
      }
      // the frilled oral arms
      for (const [x0, sw] of [[24, -1], [30, 1], [36, -1]]) {
        const ox = Math.sin(f * 1.6 + x0) * 2 * sw;
        B.tube(x0, 36, x0 + ox - 3 * sw, 50, x0 + ox, 64, 3.2, 1.2, ramp(0xd86aa8, 0x2a0a2a, 0xffe0f0), { alpha: 0.82, spec: false });
        for (let k = 0; k < 10; k++) B.set(x0 + ox + Math.sin(k * 1.4) * 2.6, 40 + k * 2.4, 0xffb8e0, 0.6);
      }
      // the bell, see-through
      const by = 25 - p * 0.3, rx = 22 - p, ry = 16 + p * 0.5;
      B.orb(30, by, rx, ry, BELL, { alpha: 0.86, clip: (px, py) => py < by + ry * 0.52 });
      // scalloped margin with lights in it
      for (let k = 0; k < 12; k++) {
        const x = 30 - rx * 0.92 + k * (rx * 1.84 / 11), y = by + ry * 0.5 + Math.sin(k * 1.9) * 0.6;
        B.disc(x, y, 1.6, BELL[1], 0.9); B.set(x, y + 1, GLOW_CYAN);
      }
      // radial canals and the four glowing gonads
      for (let k = 0; k < 7; k++) { const a = Math.PI * (0.12 + k * 0.127); B.line(30, by - ry * 0.4, 30 - Math.cos(a) * rx * 0.9, by + ry * 0.45, 0xc8b8ff, 1, 0.3); }
      for (let k = 0; k < 4; k++) {
        const gx = 30 + (k - 1.5) * 7.5, gy = by + 1 + Math.abs(k - 1.5) * 1.5;
        halo(B, gx, gy, 4.5, 0xff8ac8, 0.35);
        for (let a = 0; a < 14; a++) { const t = Math.PI * (a / 13); B.set(gx + Math.cos(t) * 2.8, gy - Math.sin(t) * 2.2, 0xffb0e0); }
      }
      B.ellipse(22, by - ry * 0.55, 5, 2.4, 0xffffff, 0.45);
    } },

    /* BILE LAMPREY -- spitter */
    spit: { w: 30, h: 30, ox: 15, oy: 15, paint(B, f) {
      const DIRT = ramp(0x6a4a34), FLESH = ramp(0xa07a7a, 0x1e0a14, 0xffe4d8);
      const sw = wave(f) * 2.4;
      // the burrow it lives in
      B.orb(28, 54, 25, 7, DIRT, { spec: false });
      for (const [x, y, r] of [[8, 54, 3], [48, 55, 3.5], [16, 57, 2], [42, 52, 2.2]]) B.orb(x, y, r, r * 0.8, ramp(0x6a6470), { spec: false });
      B.ellipse(28, 52, 10, 3.6, 0x0a0604);
      // the body, ringed, rising out of the hole
      B.tube(28, 53, 18 + sw, 36, 32 + sw, 19, 7, 5.4, FLESH, { spec: false });
      for (let k = 0; k < 9; k++) {
        const q = k / 9, u = 1 - q, x = u * u * 28 + 2 * u * q * (18 + sw) + q * q * (32 + sw), y = u * u * 53 + 2 * u * q * 36 + q * q * 19;
        for (let dx = -7; dx <= 7; dx++) onto(B, x + dx, y + dx * 0.15, FLESH[1], 0.55);
      }
      speckle(B, 10, 14, 50, 52, 0xffe8e0, 0.04, 3, 0.6);
      // the head, and its round, ringed maw
      const hx = 36 + sw, hy = 15, op = [5, 4.2, 3.4, 4.2][f];
      B.orb(hx, hy, 8.5, 8, FLESH, { spec: false });
      for (let k = 0; k < 4; k++) B.disc(hx - 4 + k * 1.6, hy - 5 + k * 0.4, 0.8, 0x2a0a12);
      B.ellipse(hx + 4, hy + 1, op, op * 1.3, 0x4a0a14);
      B.ellipse(hx + 4.5, hy + 1, op * 0.55, op * 0.75, 0x14040a);
      for (const [r, n] of [[op * 0.95, 10], [op * 0.6, 7]]) for (let k = 0; k < n; k++) {
        const a = k / n * TAU, x = hx + 4 + Math.cos(a) * r, y = hy + 1 + Math.sin(a) * r * 1.3;
        B.poly([[x, y], [x + Math.cos(a + 0.5) * 0.8, y + Math.sin(a + 0.5)], [x - Math.cos(a) * 1.6, y - Math.sin(a) * 2]], 0xe8e0a8);
      }
      // bile, dripping and glowing
      halo(B, hx + 5, hy + op * 1.3 + 2, 4, GLOW_GREEN, 0.3);
      B.line(hx + 5, hy + op * 1.2, hx + 5, hy + op * 1.2 + 3 + f, GLOW_GREEN, 1);
      B.disc(hx + 5, hy + op * 1.2 + 4 + f, 1.2, 0xc8ff7a);
      B.ellipse(hx - 3, hy - 5, 2.5, 1.4, 0xffffff, 0.5);
    } },

    /* NEXAR STALKER -- gnasher */
    gnasher: { w: 40, h: 26, ox: 20, oy: 14, paint(B, f) {
      const HIDE = ramp(0xc07838, 0x200a06, 0xffe0b0), DARK = ramp(0x7a4220, 0x140604), BELLY = ramp(0xe0c090);
      const ph = f / 4 * TAU;
      const leg = (hx, hy, a, P) => {
        const kx = hx + Math.sin(a) * 4, ky = hy + 9, px = hx + Math.sin(a) * 7 + 2, py = 50 - Math.max(0, Math.cos(a)) * 3;
        limb(B, [[hx, hy], [kx, ky], [px, py]], 3.6, 1.8, P);
        claw(B, px, py, 0.3, 3, 0xe8dcc0);
      };
      // tail, far legs
      B.tube(16, 26, 4, 18 + Math.sin(ph) * 3, 2, 30 + Math.sin(ph) * 2, 3.4, 1, DARK, { spec: false });
      leg(26, 32, ph + Math.PI, DARK); leg(56, 32, ph, DARK);
      // the body: haunch, barrel, shoulder
      B.orb(24, 27, 11, 10, HIDE, { spec: false });
      B.orb(40, 28, 20, 9.5, HIDE, { spec: false });
      B.orb(54, 25, 11, 10.5, HIDE, { spec: false });
      B.orb(40, 33, 15, 4.5, BELLY, { spec: false, clip: (x, y) => y > 31 });
      // tiger bands
      for (let k = 0; k < 7; k++) {
        const x0 = 18 + k * 6.5;
        for (let j = 0; j < 12; j++) { onto(B, x0 + j * 0.35, 18 + j, DARK[1]); onto(B, x0 + 1 + j * 0.35, 18 + j, DARK[1]); }
      }
      // the spines down its back
      for (let k = 0; k < 8; k++) {
        const x = 20 + k * 5, y = 18 - Math.sin(k / 7 * Math.PI) * 3 + (k === 0 ? 2 : 0), h = 5 + Math.sin(k / 7 * Math.PI) * 3;
        B.poly([[x - 1.8, y + 1], [x + 1.8, y + 1], [x + 1, y - h]], BONE[2]); B.line(x - 1, y, x + 0.5, y - h + 1, BONE[4], 1, 0.6);
      }
      leg(28, 33, ph, HIDE); leg(58, 32, ph + Math.PI, HIDE);
      // the head: low, long, its jaw splits open to the throat
      const jo = [1, 3, 5, 3][f];
      B.orb(66, 22, 9, 7.5, HIDE, { spec: false });
      B.orb(73, 24, 7, 4.8, HIDE, { spec: false });
      B.poly([[62, 28], [78, 26 + jo * 0.3], [79, 29 + jo], [64, 32]], DARK[1]);
      B.poly([[66, 26.5], [78, 26 + jo * 0.3], [78, 28 + jo * 0.8], [66, 29]], 0x3a0a0e);
      for (let k = 0; k < 5; k++) { fang(B, 68 + k * 2.2, 26.4, 1.8, 0.2, 0xf0e8d0, 0.7); fang(B, 68 + k * 2.2, 28.6 + jo * 0.7, -1.6, 0.2, 0xf0e8d0, 0.7); }
      for (const [ex, ey] of [[66, 18.5], [69, 19], [64, 20.5], [67.5, 21]]) glowEye(B, ex, ey, 1.1, GLOW_RED);
      B.tube(62, 17, 56, 12, 50, 13, 1.8, 0.6, BONE, { spec: false });
      mottle(B, 0.3, 4, 4);
    } },

    /* RUST TICK -- mite */
    mite: { w: 20, h: 16, ox: 10, oy: 8, paint(B, f) {
      const SHELL = ramp(0x8a2a1a, 0x14040a, 0xffc0a0);
      for (let k = 0; k < 4; k++) for (const sd of [-1, 1]) {
        const st = (k + f + (sd > 0 ? 1 : 0)) % 2 ? 1.2 : -1.2;
        const bx = 18 + sd * (2 + k * 2), kx = bx + sd * (4 + k * 1.5), ky = 12 + k;
        B.line(bx, 20, kx + st, ky, sd > 0 ? 0x2a120c : 0x1a0a08, 1);
        B.line(kx + st, ky, kx + sd * 2 + st, 29, sd > 0 ? 0x2a120c : 0x1a0a08, 1);
        B.set(kx + st, ky, 0x5a2a1a);
      }
      B.orb(18, 17, 11, 8.5, SHELL);
      B.orb(16, 13, 6, 3.5, ramp(0x3a1a12), { spec: false });
      speckle(B, 7, 9, 29, 26, 0x2a0a08, 0.06, 5);
      for (let k = 0; k < 3; k++) B.line(11 + k * 5, 18, 12 + k * 5, 24, SHELL[1], 1, 0.6);
      B.orb(30, 18, 4, 3.4, ramp(0x2a120c), { spec: false });
      B.tube(32, 19, 35, 19, 36, 22 + (f % 2), 1, 0.5, ramp(0x2a120c), { spec: false });
      B.set(31, 16, GLOW_RED); B.set(29, 16, GLOW_RED, 0.7);
    } },

    /* BULWARK ISOPOD -- shellback */
    shellback: { w: 46, h: 30, ox: 23, oy: 16, paint(B, f) {
      const STEEL = ramp(0x5e6a82, 0x0c0a1a, 0xe8f0ff), UNDER = ramp(0x3a3040);
      for (let k = 0; k < 7; k++) {
        const x = 16 + k * 9, st = (k + f) % 2 ? 2 : -2;
        B.line(x, 44, x + st, 52, 0x1a1420, 2); B.line(x + st, 52, x + st + 2, 54, 0x1a1420, 1);
      }
      B.orb(46, 42, 36, 5, UNDER, { spec: false });
      // the tergites, tail to head, each lapping over the last
      for (let k = 0; k < 8; k++) {
        const x = 14 + k * 8.2, ry = 13 + Math.sin(k / 7 * Math.PI) * 4, y = 34 - Math.sin(k / 7 * Math.PI) * 2 + wave(f, k * 0.5) * 0.4;
        B.orb(x, y, 7.4, ry, STEEL, { spec: false, clip: (px, py) => py < 44 });
        B.line(x + 6.5, y - ry * 0.8, x + 6.5, y + ry * 0.6, STEEL[0], 1);
        B.line(x - 5, y - ry * 0.85, x + 3, y - ry * 0.98, STEEL[4], 1, 0.8);
        if (k > 1 && k < 7) { B.poly([[x - 1.5, y - ry + 1], [x + 1.5, y - ry + 1], [x + 0.4, y - ry - 3.5]], BONE[2]); }
      }
      speckle(B, 4, 14, 84, 44, 0x1a1828, 0.05, 9, 0.7);
      speckle(B, 4, 14, 84, 44, 0xc8d4ec, 0.03, 11, 0.6);
      // tail forks and the head shield with its feelers
      B.poly([[8, 36], [0, 30], [4, 38], [0, 44], [8, 40]], STEEL[1]);
      B.orb(80, 35, 10, 10.5, ramp(0x4a5468), { spec: true });
      B.tube(86, 29, 90, 20, 92 - wave(f) * 2, 10, 1.3, 0.6, STEEL, { spec: false });
      B.tube(86, 32, 92, 28, 92, 20 + wave(f, 1) * 2, 1.1, 0.5, STEEL, { spec: false });
      B.disc(84, 33, 1.6, 0x08060c); B.set(83.5, 32.5, 0xffffff);
      mottle(B, 0.22, 6, 7);
    } },

    /* MAGMA EXOGORTH -- wyrm */
    wyrm: { w: 54, h: 30, ox: 27, oy: 15, paint(B, f) {
      const ROCK = ramp(0x4a3c3a, 0x0a0608, 0xd8c0b0), LAVA = [0x7a1a08, 0xc83a10, 0xff6a1a, 0xffa84a, 0xfff0a0];
      const segs = 9;
      for (let i = 0; i < segs; i++) {
        const x = 8 + i * 9.5, y = 32 + wave(f, -i * 0.8) * 4, r = 6 + i * 0.85;
        B.orb(x - 1.5, y, r + 1.4, r + 1.2, LAVA, { spec: false, bounce: 0 });
        B.orb(x + 1, y - 0.5, r, r * 0.95, ROCK, { spec: false });
        // a glowing crack across each plate
        for (let k = 0; k < r * 1.2; k++) onto(B, x - r * 0.4 + k * 0.6, y - r * 0.5 + Math.sin(k + i) * 1.2 + k * 0.4, LAVA[3]);
        B.poly([[x - 1.5, y - r + 0.5], [x + 1.5, y - r + 0.5], [x + 0.5, y - r - 3]], ROCK[3]);
      }
      // the head, and the round furnace of a mouth
      const hy = 30 + wave(f, -8.5) * 3, op = [8, 9, 10, 9][f];
      B.orb(92, hy, 14, 13, ROCK);
      for (let k = 0; k < 3; k++) B.poly([[86 + k * 4, hy - 12], [89 + k * 4, hy - 12], [87 + k * 4, hy - 18 + k]], ROCK[3]);
      halo(B, 101, hy, op + 3, 0xff6a1a, 0.4);
      B.ellipse(101, hy, op * 0.62, op, LAVA[1]);
      B.ellipse(102, hy, op * 0.38, op * 0.62, LAVA[3]);
      B.ellipse(102.5, hy, op * 0.18, op * 0.3, LAVA[4]);
      for (const [r, n] of [[op * 0.98, 12], [op * 0.66, 9]]) for (let k = 0; k < n; k++) {
        const a = k / n * TAU, x = 101 + Math.cos(a) * r * 0.62, y = hy + Math.sin(a) * r;
        B.poly([[x - 0.8, y], [x + 0.8, y], [x - Math.cos(a) * 2.4 * 0.62, y - Math.sin(a) * 2.4]], 0x1a1012);
      }
      for (let k = 0; k < 8; k++) B.set(20 + U.hash2(k, f) * 80, 6 + U.hash2(k, f + 9) * 14, k % 2 ? LAVA[3] : LAVA[4], 0.8);
      mottle(B, 0.3, 4, 3);
    } },

    /* ABYSS ANGLER -- lurker */
    lurker: { w: 44, h: 38, ox: 22, oy: 18, paint(B, f) {
      const SKIN = ramp(0x3e3440, 0x08040c, 0xc8b8c8), FIN = ramp(0x5a4458, 0x0a0410);
      const jo = [2, 4, 6, 4][f], bob = wave(f) * 1.5;
      // tail and fins, see-through
      B.poly([[14, 36], [0, 22], [4, 38], [0, 54], [14, 42]], FIN[1], 0.9);
      for (let k = 0; k < 5; k++) B.line(13, 38, 1, 24 + k * 7, FIN[3], 1, 0.5);
      B.poly([[30, 18], [44, 6], [56, 16]], FIN[1], 0.85);
      // the body: a sack of a fish
      B.orb(40, 38, 28, 22, SKIN, { spec: false });
      speckle(B, 12, 16, 70, 60, 0x8a7a8a, 0.05, 2, 0.7);
      for (let k = 0; k < 8; k++) B.disc(22 + k * 5.5, 44 + Math.sin(k) * 1.5, 0.9, GLOW_CYAN);
      // pectoral fan
      for (let k = 0; k < 6; k++) B.line(36, 44, 26 + k * 2, 58 + Math.abs(k - 2.5), FIN[3], 1, 0.7);
      // the mouth: a huge underbite of needles
      B.poly([[54, 30], [84, 24], [87, 34 + jo], [80, 50 + jo], [56, 50]], 0x16060c);
      B.poly([[56, 48], [80, 48 + jo], [88, 36 + jo], [86, 52 + jo], [58, 56]], SKIN[1]);
      for (let k = 0; k < 7; k++) fang(B, 60 + k * 3.8, 28 - k * 0.6, 7 + (k % 3) * 3, 0.6, 0xdce8f0, 0.9);
      for (let k = 0; k < 7; k++) fang(B, 61 + k * 3.6, 49 + jo * 0.8 - k * 0.3, -(6 + (k % 2) * 4), -0.4, 0xdce8f0, 0.9);
      // the small, milky, unblinking eye
      B.disc(62, 24, 3.4, 0x08040a); B.disc(62, 24, 2.6, 0x7a9ab0); B.disc(62.5, 24.3, 1.3, 0x08040a); B.set(61, 23, 0xffffff);
      // and the lure, swinging on its rod
      B.tube(52, 16, 64, 0 + bob, 76, 6 + bob, 1.1, 0.6, SKIN, { spec: false });
      halo(B, 77, 8 + bob, 7, 0xbffcff, 0.45);
      B.orb(77, 8 + bob, 3, 3, [0x3ab8c8, 0x7ae8f0, 0xbffcff, 0xe8ffff, 0xffffff]);
      mottle(B, 0.3, 5, 6);
    } },

    /* THE CORE BEHEMOTH -- warden (boss) */
    warden: { w: 64, h: 58, ox: 32, oy: 30, paint(B, f) {
      const HIDE = ramp(0x6e5c52, 0x0e0608, 0xf0dcc8), FAR = ramp(0x4a3c36, 0x0a0406), BELLY = ramp(0xa8906e), CLAW = IVORY;
      const br = [0, 1, 2, 1][f];
      // far arm and leg, in shadow
      limb(B, [[66, 50], [76, 76], [74, 100]], 9, 6.5, FAR);
      for (let k = 0; k < 3; k++) claw(B, 70 + k * 4, 102, 0.9, 9, CLAW[1]);
      limb(B, [[52, 84], [48, 110]], 10, 8, FAR);
      // the hulk of it
      B.orb(60, 62 - br * 0.5, 36, 30 + br, HIDE, { spec: false });
      B.orb(46, 40 - br * 0.5, 22, 16, HIDE, { spec: false });
      B.orb(74, 72, 17, 20, BELLY, { spec: false, clip: (x, y) => y > 52 });
      for (let k = 0; k < 6; k++) for (let x = 60; x < 90; x++) onto(B, x, 58 + k * 5 + Math.sin(x * 0.3) * 0.8, BELLY[1], 0.5);
      // bony ridge down the hump
      for (let k = 0; k < 7; k++) { const a = Math.PI * (0.95 + k * 0.08), x = 50 + Math.cos(a) * 30, y = 52 + Math.sin(a) * 28; B.poly([[x - 2.5, y + 1], [x + 2.5, y + 1], [x - 1, y - 7]], BONE[2]); }
      // the core it guards, grown into its chest
      const gl = [0.45, 0.6, 0.75, 0.6][f];
      halo(B, 70, 64, 14, 0xff7a2a, gl);
      B.poly([[64, 64], [70, 54], [76, 63], [71, 74]], 0xff8a2a);
      B.poly([[66, 63], [70, 56], [72, 64], [70, 70]], 0xffd27a);
      B.poly([[69, 60], [70, 57], [71, 61]], 0xffffff);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; B.line(70 + Math.cos(a) * 7, 64 + Math.sin(a) * 9, 70 + Math.cos(a) * 13, 64 + Math.sin(a) * 15, 0xff6a1a, 1, 0.7); }
      limb(B, [[44, 86], [42, 110]], 11, 9, HIDE);
      for (let k = 0; k < 3; k++) claw(B, 36 + k * 5, 110, 0.2, 6, CLAW[1]);
      // the near arm: enormous, knuckles nearly on the floor
      limb(B, [[84, 44], [104, 70], [104, 96]], 11, 8, HIDE);
      B.orb(105, 99, 9, 7, HIDE, { spec: false });
      for (let k = 0; k < 4; k++) claw(B, 98 + k * 4.5, 103, 0.6 + k * 0.1, 12, CLAW[2]);
      // the small, low, mean head
      const jo = [1, 2.5, 4, 2.5][f];
      B.orb(92, 36, 14, 12, HIDE, { spec: false });
      B.orb(94, 31, 12, 4, FAR, { spec: false, clip: (x, y) => y < 32 });
      B.poly([[84, 42], [106, 40], [108, 46 + jo], [86, 50 + jo]], HIDE[1]);
      B.poly([[88, 41], [105, 39.5], [104, 42 + jo], [89, 43 + jo]], 0x2a0a0c);
      for (let k = 0; k < 5; k++) fang(B, 90 + k * 3.2, 43 + jo, -2.2, 0, 0xe8dcc0, 0.8);
      fang(B, 90, 46 + jo, -9, -1, IVORY[2], 1.8); fang(B, 103, 45 + jo, -10, 1, IVORY[2], 1.8);
      glowEye(B, 92, 33, 1.6, 0xffd23a); glowEye(B, 99, 33.5, 1.4, 0xffd23a);
      speckle(B, 20, 20, 120, 110, 0x2a1a14, 0.04, 4, 0.8);
      speckle(B, 20, 20, 120, 110, 0xc8b098, 0.025, 8, 0.6);
      mottle(B, 0.32, 6, 8);
    } },

    /* SLAG SCUTTLER -- crab */
    crab: { w: 38, h: 28, ox: 19, oy: 15, paint(B, f) {
      const SLAG = ramp(0x7a4e3a, 0x10060a, 0xffd8b8), FAR = ramp(0x4a3028, 0x0a0406);
      // four walking legs a side, splayed wide, knees high
      for (let k = 0; k < 4; k++) for (const s of [-1, 1]) {
        const st = (k + f + (s > 0 ? 1 : 0)) % 2 ? 1.6 : 0;
        const bx = 38 + s * (10 + k * 2.5), kx = 38 + s * (20 + k * 4), ky = 22 + k * 1.5 - st, fx = 38 + s * (24 + k * 3.6), fy = 52 - st;
        limb(B, [[bx, 36], [kx, ky], [fx, fy]], 2.3, 1, k % 2 ? FAR : SLAG);
        B.disc(kx, ky, 0.9, 0xff7a2a, 0.7);
      }
      // the shell: wide, crusted, cracked, still hot in the seams
      B.orb(38, 34, 21, 11, SLAG, { spec: false });
      B.orb(38, 31, 16, 6, SLAG, { spec: false, clip: (x, y) => y < 32 });
      for (let k = 0; k < 14; k++) onto(B, 25 + k * 1.9, 30 + Math.sin(k * 1.3) * 2.5, 0xff8a3a, 0.9);
      for (let k = 0; k < 8; k++) onto(B, 33 + k * 1.4, 36 + Math.sin(k) * 1.5, 0xffb06a, 0.8);
      for (let k = 0; k < 9; k++) B.poly([[19 + k * 4.6, 28 + Math.abs(k - 4) * 0.8], [21 + k * 4.6, 28 + Math.abs(k - 4) * 0.8], [20 + k * 4.6, 25.5 + Math.abs(k - 4) * 0.8]], SLAG[1]);
      speckle(B, 16, 20, 60, 46, 0x2a1810, 0.08, 1);
      // eyes on stalks, mouthparts under them
      for (const [x, d] of [[35, -1], [41, 1]]) { B.tube(x, 26, x + d, 20, x + d * 1.5, 15 + wave(f, d) * 0.6, 1.1, 0.8, SLAG, { spec: false }); B.orb(x + d * 1.5, 14 + wave(f, d) * 0.6, 1.8, 1.8, ramp(0x101014)); }
      for (let k = 0; k < 4; k++) B.line(35 + k * 2, 38, 35 + k * 2 + (f % 2), 41, 0x3a1a10, 1);
      // claws, raised: the big one opens and shuts
      const op = [0, 1.5, 3, 1.5][f];
      limb(B, [[52, 30], [58, 22], [61, 15]], 3, 2.6, SLAG);
      B.orb(63, 12, 6.5, 5, SLAG);
      B.poly([[64, 8], [72, 2 - op], [70, 9]], SLAG[2]); B.poly([[66, 15], [74, 11 + op], [69, 11]], SLAG[1]);
      limb(B, [[24, 30], [18, 22], [16, 17]], 2.2, 1.8, FAR);
      B.orb(15, 15, 4, 3, FAR, { spec: false });
      B.poly([[13, 12], [9, 8 - op * 0.5], [12, 14]], FAR[2]);
      mottle(B, 0.4, 3, 5);
    } },

    /* SPORE HUSK -- bloomer */
    bloomer: { w: 30, h: 42, ox: 15, oy: 24, paint(B, f) {
      const STALK = ramp(0xc8bc9c, 0x1a120a), CAP = ramp(0x8a3a4a, 0x14040c, 0xffd0c0);
      // root-feet, groping at the floor
      for (let k = 0; k < 5; k++) {
        const ex = 14 + k * 8 + wave(f, k) * 1.5;
        B.tube(30, 70, (30 + ex) / 2, 76 - (k % 2) * 2, ex, 83, 2.4, 0.8, ramp(0x8a7a5a), { spec: false });
      }
      // the stalk, fibrous, with sacs that glow
      B.tube(30, 72, 31 + wave(f) * 1.2, 52, 30, 34, 7.5, 6, STALK, { spec: false });
      for (let y = 36; y < 72; y += 2) for (const dx of [-4, -1, 3]) onto(B, 30 + dx + Math.sin(y * 0.3) * 0.5, y, STALK[1], 0.5);
      for (const [x, y] of [[26, 58], [34, 50], [27, 64]]) { halo(B, x, y, 4, GLOW_GREEN, 0.3); B.orb(x, y, 2, 2.3, [0x4a8a1a, 0x7ac82a, 0xa8ff4a, 0xd8ff9a, 0xffffff]); }
      // a vertical slit of a mouth, with teeth
      const op = [0.6, 1.2, 1.8, 1.2][f];
      B.ellipse(31, 45, op, 4.5, 0x2a0a0c);
      for (let k = 0; k < 4; k++) { B.set(31 - op, 42 + k * 2, 0xe8dcc0); B.set(31 + op, 43 + k * 2, 0xe8dcc0); }
      // the ragged ring and the cap
      for (let k = 0; k < 12; k++) B.poly([[23 + k * 1.3, 38], [24 + k * 1.3, 38], [23.5 + k * 1.3, 41 + (k % 3)]], STALK[3]);
      B.orb(30, 28, 23, 14, CAP, { spec: false, clip: (x, y) => y < 34 });
      for (let k = 0; k < 18; k++) B.line(30, 34, 8 + k * 2.6, 34, CAP[0], 1, 0.4);
      for (let k = 0; k < 18; k++) { const a = k * 2.4, r = 6 + (k % 5) * 3.5; B.disc(30 + Math.cos(a) * r, 24 + Math.sin(a) * r * 0.45, 1.1 + (k % 3) * 0.4, 0xe8d4c0); }
      // the veil hanging off the rim
      for (let k = 0; k < 9; k++) { const x = 11 + k * 4.6; B.line(x, 34, x + Math.sin(f + k) * 0.8, 38 + (k % 3) * 2, 0xe8dcc0, 1, 0.55); }
      // spores, drifting up
      for (let k = 0; k < 6; k++) { const q = ((f / 4) + k / 6) % 1; B.disc(16 + k * 5.5 + Math.sin(k * 3 + q * 6) * 2, 12 - q * 10, 0.9, GLOW_GREEN, 0.9 - q * 0.6); }
      mottle(B, 0.25, 4, 12);
    } },

    /* CLAIM-JUMPER DROID -- driller */
    driller: { w: 42, h: 30, ox: 21, oy: 15, paint(B, f) {
      const PAINT = ramp(0xc8962a, 0x1a0e04, 0xfff0c0), STEEL = ramp(0x6a6e78, 0x0a0a10, 0xf0f4ff), TREAD = ramp(0x2a2a30);
      // treads
      B.round(6, 42, 60, 16, 7, TREAD[1]);
      B.round(7, 43, 58, 14, 6, TREAD[0]);
      for (let k = 0; k < 13; k++) { const x = 8 + ((k * 5 + f * 1.25) % 60); B.rect(x, 42, 2, 2, TREAD[3]); B.rect(x, 56, 2, 2, TREAD[2]); }
      for (let k = 0; k < 5; k++) { B.orb(14 + k * 11, 50, 4.5, 4.5, STEEL, { spec: false }); B.disc(14 + k * 11, 50, 1.4, STEEL[0]); }
      // the hull: chipped yellow paint over rust
      B.round(10, 18, 50, 25, 3, PAINT[1]);
      B.round(10, 18, 49, 23, 3, PAINT[2]);
      B.rect(12, 19, 46, 2, PAINT[3]);
      for (let k = 0; k < 7; k++) for (let j = 0; j < 10; j++) onto(B, 46 + k * 2 + j * 0.6, 26 + j, k % 2 ? 0x1a1410 : 0xffd04a);
      for (const [x, y] of [[13, 22], [56, 22], [13, 39], [56, 39], [34, 22]]) { B.disc(x, y, 1, STEEL[1]); B.set(x - 0.5, y - 0.5, STEEL[4]); }
      // rust and grime
      for (let k = 0; k < 160; k++) { const x = 10 + U.hash2(k, 3) * 50, y = 18 + U.hash2(k, 4) * 25; if (U.fbm(x * 0.1, y * 0.1, 2) > 0.58) onto(B, x, y, U.hash2(k, 5) > 0.5 ? 0x8a4a1a : 0x5a2e10, 0.8); }
      for (let x = 10; x < 60; x++) for (let y = 36; y < 43; y++) onto(B, x, y, 0x2a1a0a, (y - 36) / 14);
      // the sensor head with one red eye
      B.orb(26, 14, 10, 7, STEEL, { clip: (x, y) => y < 19 });
      B.round(20, 10, 14, 4, 2, 0x0a0a0e);
      halo(B, 30, 12, 5, GLOW_RED, f % 2 ? 0.5 : 0.35);
      B.disc(30, 12, 1.8, GLOW_RED); B.set(29.5, 11.5, 0xffffff);
      B.line(20, 8, 16, 0, STEEL[1], 1); B.disc(16, 0.5, 1, f % 2 ? GLOW_RED : 0x4a1a1a);
      // exhaust stack, smoking
      B.rect(14, 6, 4, 12, STEEL[1]); B.rect(14, 6, 1, 12, STEEL[3]);
      for (let k = 0; k < 3; k++) B.disc(16 - k * 2 - f * 0.5, 3 - k * 2.5, 2 + k, 0x6a6460, 0.5 - k * 0.12);
      // the drill: a spiral cone, turning
      B.orb(62, 30, 5, 8, STEEL, { spec: false });
      for (let x = 0; x < 22; x++) {
        const hh = 8 * (1 - x / 22);
        for (let y = -hh; y <= hh; y++) {
          const band = ((x * 0.9 + y * 0.6 + f * 2) % 4 + 4) % 4;
          const lt = 0.5 - y / (hh * 2.4 + 0.1);
          B.set(66 + x, 30 + y, band < 1.2 ? STEEL[0] : PT.mix(STEEL[1], STEEL[4], U.clamp(lt, 0, 1)));
        }
      }
      for (let k = 0; k < 4; k++) B.set(88 + U.hash2(k, f) * 3, 26 + U.hash2(k, f + 3) * 8, 0xa88a6a);
    } },

    /* VEIL BAT -- hangman */
    hangman: { w: 32, h: 46, ox: 16, oy: 26, paint(B, f) {
      const LEATHER = ramp(0x4e3438, 0x0a0408, 0xe8c8c0), WING = ramp(0x6a2a32, 0x12040a, 0xffb0a8);
      const op = [0, 0.35, 0.7, 0.35][f];
      // the rock it hangs from, and its feet gripping it
      B.orb(32, 4, 12, 5, ramp(0x5a5262), { spec: false });
      for (const s of [-1, 1]) { B.line(32 + s * 3, 6, 32 + s * 2, 18, LEATHER[1], 2); claw(B, 32 + s * 3, 7, s > 0 ? -1.4 : -2.2, 3, IVORY[1]); }
      // wings: wrapped at rest, opening when it notices you
      for (const s of [-1, 1]) {
        const tip = [32 + s * (10 + op * 18), 30 + op * 4], mid = [32 + s * (14 + op * 14), 54 - op * 6];
        B.poly([[32 + s * 3, 18], tip, mid, [32 + s * (8 + op * 6), 72], [32, 70]], WING[1], 0.92);
        B.poly([[32 + s * 3, 18], tip, [32 + s * (6 + op * 8), 50]], WING[2], 0.92);
        B.line(32 + s * 3, 18, tip[0], tip[1], LEATHER[0], 1); B.line(tip[0], tip[1], mid[0], mid[1], LEATHER[0], 1);
        B.line(32 + s * 3, 18, mid[0], mid[1], LEATHER[0], 1, 0.7);
        for (let k = 0; k < 4; k++) B.set(tip[0] - s * k, tip[1] + 6 + k * 4, WING[3], 0.6);
      }
      // body, upside down, furred
      B.orb(32, 44, 9, 15, LEATHER, { spec: false });
      speckle(B, 22, 28, 42, 60, LEATHER[3], 0.12, 2, 0.6);
      // head at the bottom: big ears, hot eyes, needle teeth
      B.orb(32, 64, 8, 7, LEATHER, { spec: false });
      for (const s of [-1, 1]) B.poly([[32 + s * 3, 68], [32 + s * 9, 82], [32 + s * 7, 66]], LEATHER[1]);
      glowEye(B, 29, 62, 1.6, 0xff3a3a); glowEye(B, 35, 62, 1.6, 0xff3a3a);
      B.ellipse(32, 68, 3, 1.6, 0x1a0408);
      for (let k = 0; k < 4; k++) fang(B, 30 + k * 1.4, 67.5, 2.4, 0, 0xf0e8d8, 0.5);
      mottle(B, 0.25, 4, 3);
    } },

    /* ORE MIMIC -- mimic. Frames 0-1 at rest (a rock), 2-3 awake */
    mimic: { w: 30, h: 26, ox: 15, oy: 14, paint(B, f) {
      const ROCK = ramp(0x6a5e56, 0x0a0608, 0xe8dccc), GOLD = [0x6a4a0a, 0xb07a16, 0xf0b82a, 0xffe07a, 0xfffad8];
      const awake = f >= 2, op = awake ? (f === 2 ? 6 : 9) : 0;
      const breath = f === 1 ? 0.6 : 0;
      if (awake) {
        // the inside of it: wet, red, full of stone teeth, and a tongue
        B.ellipse(30, 34, 22, 7 + op * 0.4, 0x3a0a10);
        B.ellipse(30, 35, 16, 4 + op * 0.3, 0x1a0408);
        B.tube(26, 36, 38, 30 + op * 0.3, 50, 36 - op * 0.2, 3, 1.6, ramp(0xa83a6a, 0x1a0410), { spec: true });
      }
      // the lower jaw (or just the bottom of a rock)
      B.orb(30, 38, 24, 9, ROCK, { spec: false, clip: (x, y) => y > 33 });
      // the top half, lifted when it opens
      B.orb(30, 30 - op - breath, 24, 14 + breath, ROCK, { spec: false, clip: (x, y) => y < 34 - op });
      if (awake) {
        for (let k = 0; k < 8; k++) { fang(B, 12 + k * 5, 34 - op, 3.5 + (k % 2) * 2, 0.5, ROCK[3], 1.6); fang(B, 14 + k * 5, 34, -3 - (k % 2), 0, ROCK[3], 1.4); }
        // the eye, opened in the stone
        B.ellipse(36, 22 - op, 5, 3.4, 0x0a0406);
        B.ellipse(36, 22 - op, 4.2, 2.8, 0xf0c82a);
        B.ellipse(36.5, 22 - op, 1, 2.6, 0x0a0406);
        B.set(34.5, 21 - op, 0xffffff);
      } else B.line(8, 34, 52, 34, ROCK[1], 1, 0.6);
      // the gold that makes you want to dig it
      for (const [x, y, r] of [[18, 24, 4], [30, 20, 5], [42, 27, 3.5], [24, 36, 3], [38, 37, 2.6]]) {
        const yy = y < 34 ? y - op - breath : y;
        B.orb(x, yy, r, r * 0.85, GOLD);
      }
      mottle(B, 0.35, 3, 2);
    } },

    /* SEEKER PROBE -- drone */
    drone: { w: 30, h: 30, ox: 15, oy: 12, paint(B, f) {
      const GUN = ramp(0x3a3e4a, 0x06060a, 0xe0e8ff);
      // dangling manipulator arms, swaying
      for (let k = 0; k < 5; k++) {
        const x0 = 20 + k * 5, sw = wave(f, k * 1.1) * 2.5, len = 22 + (k % 2) * 8;
        B.tube(x0, 30, x0 + sw * 0.5, 30 + len * 0.5, x0 + sw, 30 + len, 1.2, 0.7, GUN, { spec: false });
        B.set(x0 + sw, 30 + len * 0.5, GUN[4]);
        B.line(x0 + sw - 1.5, 30 + len, x0 + sw - 2, 32 + len, GUN[3], 1); B.line(x0 + sw + 1.5, 30 + len, x0 + sw + 2, 32 + len, GUN[3], 1);
      }
      // thruster glow under the body
      halo(B, 30, 34, 8, 0x5ab8ff, 0.45);
      // the sphere: panels, vents, scratches
      B.orb(30, 22, 14, 13, GUN);
      for (let k = 0; k < 3; k++) { const a = -0.6 + k * 0.6; for (let t = -12; t <= 12; t++) onto(B, 30 + t, 22 + Math.sin(a) * t * 0.4 + (k - 1) * 6, GUN[0], 0.6); }
      for (let k = 0; k < 5; k++) B.rect(17 + k * 2, 26, 1, 4, GUN[0]);
      speckle(B, 16, 9, 44, 36, 0x9aa0b0, 0.03, 7, 0.7);
      // the eyes: one big lens and a cluster of small ones, red
      halo(B, 39, 21, 6, GLOW_RED, 0.4);
      B.disc(39, 21, 3.6, 0x0a0406); B.disc(39, 21, 2.6, 0xc81a14); B.disc(39.3, 21.3, 1.4, 0xff7a5a); B.set(38, 20, 0xffffff);
      for (const [x, y] of [[36, 15], [41, 16], [42, 26], [36, 27]]) { B.disc(x, y, 1.2, 0x0a0406); B.set(x, y, f % 2 ? 0xff5a3a : 0xc82a1a); }
      // antennae
      B.line(24, 10, 20, 0, GUN[2], 1); B.line(30, 9, 31, -2, GUN[2], 1);
      B.set(20, 0, f % 2 ? 0xff3a2a : 0x6a1a1a);
    } },

    /* SPLITTER OOZE -- blob */
    blob: { w: 32, h: 26, ox: 16, oy: 14, paint(B, f) {
      const OOZE = ramp(0x4aa848, 0x061a0a, 0xe8ffd0);
      const sq = [0, 1, 2, 1][f];
      B.orb(32, 45, 28, 5.5, OOZE, { alpha: 0.8, spec: false });
      B.orb(32, 31 + sq * 0.8, 24 + sq, 16 - sq * 0.8, OOZE, { alpha: 0.78 });
      // what it has eaten, hanging inside it
      const iy = 31 + sq * 0.8;
      B.disc(24, iy, 4.5, 0xe8dcc0, 0.65); B.disc(22.5, iy - 0.5, 1.2, 0x1a2a10, 0.8); B.disc(25.5, iy - 0.5, 1.2, 0x1a2a10, 0.8); B.rect(23, iy + 2, 3, 1, 0x1a2a10, 0.6);
      for (let k = 0; k < 4; k++) B.line(34 + k * 2.5, iy - 4, 35 + k * 2.5, iy + 4, 0xe8dcc0, 1, 0.5);
      B.orb(42, iy + 4, 3, 2.5, ramp(0x6a6470), { spec: false, alpha: 0.6 });
      halo(B, 32, iy + 1, 6, 0xc8ff4a, 0.3);
      B.disc(32, iy + 1, 2.4 + sq * 0.3, 0x2a5a10, 0.7);
      for (let k = 0; k < 6; k++) { const q = ((f / 4) + k / 6) % 1; B.disc(18 + k * 5, iy + 8 - q * 14, 1 + (k % 2) * 0.6, 0xe8ffd0, 0.6); }
      // drips off the front
      for (const x of [16, 44]) B.tube(x, iy + 10, x, iy + 14, x + 0.5, iy + 17 + sq, 1.6, 1, OOZE, { spec: false, alpha: 0.8 });
      B.ellipse(22, iy - 9, 6, 2.4, 0xffffff, 0.55); B.disc(40, iy - 7, 1.4, 0xffffff, 0.6);
    } }
  };

  /* The field guide. Keyed by sprite name. */
  const INFO = {
    grub: { name: 'STONE MAGGOT', cls: 'BURROWING LARVA', threat: 1, lore: 'CHEWS THROUGH GRANITE. CHEWS THROUGH YOU FASTER.' },
    jelly: { name: 'VOID MEDUSA', cls: 'DRIFTING CNIDARIAN', threat: 1, lore: 'FLOATS IN THE CAVE AIR. ITS STING STOPS THE HEART.' },
    spit: { name: 'BILE LAMPREY', cls: 'AMBUSH WORM', threat: 2, lore: 'WAITS IN ITS HOLE AND SPITS STOMACH ACID AT LIGHT.' },
    gnasher: { name: 'NEXAR STALKER', cls: 'PACK PREDATOR', threat: 3, lore: 'FOUR EYES, A JAW THAT SPLITS TO THE THROAT. IT CHARGES.' },
    mite: { name: 'RUST TICK', cls: 'SWARMING PARASITE', threat: 1, lore: 'COMES IN HUNDREDS. DRINKS IRON. AND BLOOD.' },
    shellback: { name: 'BULWARK ISOPOD', cls: 'ARMOURED GRAZER', threat: 3, lore: 'PLATED LIKE A TANK. SHOOT THE SOFT BITS.' },
    wyrm: { name: 'MAGMA EXOGORTH', cls: 'LITHOVORE GIANT', threat: 4, lore: 'SWIMS THROUGH MOLTEN ROCK. ITS MOUTH IS A FURNACE.' },
    lurker: { name: 'ABYSS ANGLER', cls: 'DEEP PREDATOR', threat: 3, lore: 'IF YOU SEE A LITTLE LIGHT IN THE DARK, DO NOT GO TO IT.' },
    warden: { name: 'THE CORE BEHEMOTH', cls: 'APEX GUARDIAN', threat: 5, lore: 'IT GREW AROUND THE PLANET\'S HEART. IT WANTS IT BACK.' },
    crab: { name: 'SLAG SCUTTLER', cls: 'THERMAL CRUSTACEAN', threat: 2, lore: 'ITS SHELL IS COOLED LAVA. THE INSIDE IS NOT COOLED.' },
    bloomer: { name: 'SPORE HUSK', cls: 'WALKING FUNGUS', threat: 2, lore: 'WHAT IS LEFT OF A MINER, AFTER THE MUSHROOMS.' },
    driller: { name: 'CLAIM-JUMPER DROID', cls: 'ROGUE MINING UNIT', threat: 3, lore: 'STILL FOLLOWING ITS LAST ORDER: NOBODY ELSE DIGS HERE.' },
    hangman: { name: 'VEIL BAT', cls: 'CEILING HUNTER', threat: 2, lore: 'HANGS WRAPPED IN ITS WINGS. OPENS THEM WHEN IT IS HUNGRY.' },
    mimic: { name: 'ORE MIMIC', cls: 'LURE ORGANISM', threat: 2, lore: 'LOOKS EXACTLY LIKE GOLD. THAT IS THE POINT.' },
    drone: { name: 'SEEKER PROBE', cls: 'HUNTER DROID', threat: 2, lore: 'SOMEBODY SENT IT TO FIND SOMEBODY. IT FOUND YOU.' },
    blob: { name: 'SPLITTER OOZE', cls: 'ACID SLIME', threat: 2, lore: 'KILL IT AND YOU HAVE SIX SMALLER PROBLEMS.' }
  };

  function build(name) {
    const d = P[name];
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const B = PT.buf(d.w * HD, d.h * HD);
      d.paint(B, f);
      B.rim(0xfff0dc, -1, -1, 0.25);
      B.outline(INK);
      B.outline(0x05030a);
      frames.push(B.toCanvas());
    }
    PD.art.sprites[name] = { frames, w: d.w, h: d.h, hd: HD, ox: d.ox, oy: d.oy };
  }
  for (const name in P) build(name);

  PD.mobart = { P, INFO, build };
})(window.PD);
