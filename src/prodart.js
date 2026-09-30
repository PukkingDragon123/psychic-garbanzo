/* PRODART: the product shots for ABAY. Every tool and saucer part gets its
   own painted picture, done like a box-art render: fat shapes, a hard gloss,
   a coloured rim light and a dark outline, so buying a drill bit feels like
   buying something.

   And the stage they sit on: a cartoon sunburst in the colour of how rare
   the thing is, sparkles, and a shine that sweeps across the card. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const PT = PD.paint;
  const HD = 2, N = 80, C = N / 2;
  const INK = 0x160f24;
  const R = PT.ramp;
  const STEEL = [0x9aa4bc, 0xe8eeff, 0x4a5270], DARK = [0x3a3e52, 0x6a7088, 0x1a1c28];
  const ORANGE = [0xff8a2a, 0xffd08a, 0xa8481a], GOLD = [0xffc83a, 0xfff4b0, 0xb8801a];
  const RED = [0xe5394a, 0xff9aa6, 0x8a1422], BLUE = [0x3a7ae8, 0xa8ccff, 0x1a3a8a], GREEN = [0x3ac86a, 0xb0ffc8, 0x1a6a3a];
  const PINK = [0xff7ab0, 0xffd0e4, 0xb83a6a], CYAN = [0x3ad8f0, 0xc8faff, 0x1a7a9a], PURP = [0x9a5ae8, 0xe0c8ff, 0x4a1a8a];

  function cyl(B, x, y, w, h, Cc) {
    B.rect(x, y, w, h, Cc[0]);
    B.rect(x, y, w * 0.28, h, Cc[1], 0.55); B.rect(x + w * 0.08, y, w * 0.08, h, 0xffffff, 0.5);
    B.rect(x + w * 0.72, y, w * 0.28, h, Cc[2], 0.6);
  }
  function bolt(B, x, y) { B.disc(x, y, 1.8, STEEL[2]); B.disc(x - 0.4, y - 0.4, 1, STEEL[1]); }
  function gun(B, body, tip, barrels, big) {
    const L = big ? 30 : 22;
    B.round(C - 22, C - 6, 30, 14, 5, body[2]); B.round(C - 21, C - 5, 28, 12, 4, body[0]); B.rect(C - 19, C - 4, 24, 3, body[1], 0.8);
    B.poly([[C - 16, C + 6], [C - 6, C + 6], [C - 10, C + 22], [C - 19, C + 20]], DARK[0]); B.poly([[C - 16, C + 6], [C - 12, C + 6], [C - 15, C + 20], [C - 19, C + 20]], DARK[1]);
    for (let k = 0; k < barrels; k++) { const dy = (k - (barrels - 1) / 2) * 7; B.round(C + 6, C - 2 + dy, L, 5, 2, STEEL[2]); B.rect(C + 7, C - 1 + dy, L - 2, 2, STEEL[1]); B.round(C + 4 + L, C - 3 + dy, 6, 7, 2, tip[0]); B.disc(C + 7 + L, C + 0.5 + dy, 2, tip[1]); }
    B.round(C - 8, C - 12, 12, 7, 2, tip[2]); B.rect(C - 6, C - 11, 8, 4, tip[0]); B.rect(C - 5, C - 10, 2, 2, 0xffffff);
    bolt(B, C - 16, C + 1);
  }
  function rocket(B, Cc, n) {
    for (let k = 0; k < n; k++) {
      const x = C - (n - 1) * 9 + k * 18;
      B.round(x - 7, C - 18, 14, 32, 6, Cc[2]); B.round(x - 6, C - 17, 12, 30, 5, Cc[0]); B.rect(x - 5, C - 15, 3, 26, Cc[1], 0.7);
      B.poly([[x - 7, C - 14], [x + 7, C - 14], [x, C - 30]], RED[0]); B.poly([[x - 7, C - 14], [x - 1, C - 14], [x, C - 30]], RED[1]);
      B.round(x - 5, C + 12, 10, 6, 1, DARK[0]);
      B.poly([[x - 4, C + 18], [x + 4, C + 18], [x, C + 32]], 0xffd34d); B.poly([[x - 2, C + 18], [x + 2, C + 18], [x, C + 26]], 0xffffff);
    }
  }

  const P = {
    drill(B) {
      B.round(C - 30, C - 10, 24, 22, 6, ORANGE[2]); B.round(C - 29, C - 9, 22, 20, 5, ORANGE[0]); B.rect(C - 27, C - 8, 18, 5, ORANGE[1], 0.8);
      B.poly([[C - 22, C + 10], [C - 12, C + 10], [C - 14, C + 26], [C - 24, C + 24]], DARK[0]);
      B.round(C - 8, C - 7, 8, 16, 2, STEEL[2]); B.rect(C - 7, C - 6, 6, 3, STEEL[1]);
      for (let x = 0; x < 34; x++) { const h = Math.max(1, 8 * (1 - x / 34)); for (let y = -h; y <= h; y++) B.set(C + x, C + 1 + y, ((x + Math.round(y) * 2) % 8) < 4 ? STEEL[1] : STEEL[2]); }
      B.disc(C + 34, C + 1, 1.5, 0xffffff);
    },
    reach(B) {
      for (let k = 0; k < 4; k++) { const x = C - 28 + k * 13, w = 16 - k * 2; B.round(x, C - w / 2 + 2, 14, w, 2, STEEL[2]); B.rect(x + 1, C - w / 2 + 3, 12, 2, STEEL[1]); }
      for (let x = 0; x < 16; x++) { const h = Math.max(1, 5 * (1 - x / 16)); for (let y = -h; y <= h; y++) B.set(C + 24 + x, C + 2 + y, ((x + Math.round(y) * 2) % 6) < 3 ? ORANGE[1] : ORANGE[2]); }
      B.round(C - 34, C - 6, 10, 16, 3, ORANGE[0]);
    },
    oxygen(B) {
      B.round(C - 12, C - 20, 24, 44, 10, BLUE[2]); B.round(C - 11, C - 19, 22, 42, 9, BLUE[0]); B.rect(C - 8, C - 16, 5, 36, BLUE[1], 0.7);
      B.rect(C - 11, C - 4, 22, 5, 0xffffff); B.rect(C - 11, C - 4, 22, 1, 0xc8d4e8);
      B.round(C - 5, C - 28, 10, 9, 2, STEEL[2]); B.rect(C - 3, C - 27, 6, 7, STEEL[0]);
      B.disc(C + 12, C - 28, 7, STEEL[2]); B.disc(C + 12, C - 28, 5.5, 0xffffff); B.line(C + 12, C - 28, C + 15, C - 31, RED[0], 1); B.line(C + 5, C - 27, C + 1, C - 26, STEEL[2], 2);
    },
    lung(B) {
      for (const s of [-1, 1]) { B.ball(C + s * 10, C + 2, 11, 18, PINK, true); for (let k = 0; k < 4; k++) B.line(C + s * 3, C - 8 + k * 5, C + s * (8 + k * 2), C - 4 + k * 6, PINK[2], 1, 0.7); }
      B.round(C - 3, C - 26, 6, 18, 2, 0xf0d0e0); for (let k = 0; k < 4; k++) B.rect(C - 3, C - 24 + k * 4, 6, 1, PINK[2]);
      B.round(C - 16, C + 16, 32, 8, 3, 0x9a5a3a); B.rect(C - 14, C + 17, 28, 2, 0xc88a5a);
    },
    cargo(B) {
      B.ball(C, C + 6, 24, 20, [0xb8905a, 0xe8c890, 0x7a5a30]);
      B.poly([[C - 10, C - 12], [C + 10, C - 12], [C + 6, C - 22], [C - 6, C - 22]], 0x9a7040); B.rect(C - 12, C - 14, 24, 4, 0x5a3a20);
      for (let k = 0; k < 8; k++) B.rect(C - 18 + k * 4.5, C + 6, 2, 1, 0x7a5a30);
      for (const [x, y, r, c] of [[-6, -18, 5, 0x8a7aa8], [4, -20, 6, 0xffc83a], [0, -24, 4, 0x7ef9ff]]) B.ball(C + x, C + y, r, r * 0.85, R(c), true);
    },
    belly(B) {
      B.ball(C, C + 2, 24, 22, PINK, true);
      for (let k = 0; k < 5; k++) B.line(C - 16 + k * 8, C - 16, C - 18 + k * 8, C + 18, PINK[2], 1, 0.4);
      B.rect(C - 24, C + 2, 48, 6, 0x5a3a20); B.round(C - 5, C, 10, 10, 2, GOLD[0]); B.rect(C - 2, C + 2, 4, 6, 0x5a3a20);
    },
    hull(B) {
      B.poly([[C - 22, C - 20], [C + 22, C - 20], [C + 26, C + 4], [C, C + 26], [C - 26, C + 4]], STEEL[2]);
      B.poly([[C - 20, C - 18], [C + 20, C - 18], [C + 23, C + 3], [C, C + 23], [C - 23, C + 3]], STEEL[0]);
      B.poly([[C - 20, C - 18], [C - 2, C - 18], [C - 2, C + 22], [C - 23, C + 3]], STEEL[1], 0.45);
      B.line(C, C - 18, C, C + 22, STEEL[2], 2);
      for (const [x, y] of [[-16, -14], [16, -14], [-18, 2], [18, 2], [0, 18]]) bolt(B, C + x, C + y);
      B.line(C - 10, C - 6, C - 4, C + 2, STEEL[2], 1); B.line(C - 4, C + 2, C - 8, C + 8, STEEL[2], 1);
    },
    ironskin(B) {
      B.ball(C, C, 26, 22, GREEN, true);
      for (let y = -16; y < 18; y += 6) for (let x = -20; x < 22; x += 7) { const xx = C + x + ((y / 6) % 2 ? 3 : 0); if (Math.hypot(xx - C, (C + y - C) * 1.2) < 22) { B.ellipse(xx, C + y, 3, 2.2, GREEN[2]); B.ellipse(xx - 0.5, C + y - 0.5, 2.4, 1.6, GREEN[1]); } }
    },
    tether(B) {
      for (let r = 6; r < 24; r += 4) for (let a = 0; a < Math.PI * 2; a += 0.05) B.disc(C + Math.cos(a) * r, C + 4 + Math.sin(a) * r * 0.6, 2.2, (Math.floor(a * 6 + r) % 2) ? 0xe8c890 : 0xb8905a);
      B.line(C + 22, C + 4, C + 30, C - 22, 0xe8c890, 3); B.poly([[C + 26, C - 22], [C + 34, C - 22], [C + 30, C - 30]], STEEL[0]);
    },
    thruster(B) {
      B.round(C - 26, C - 12, 30, 24, 8, ORANGE[2]); B.round(C - 25, C - 11, 28, 22, 7, ORANGE[0]); B.rect(C - 22, C - 9, 20, 5, ORANGE[1], 0.8);
      B.poly([[C + 2, C - 7], [C + 26, C - 4], [C + 26, C + 4], [C + 2, C + 7]], STEEL[0]); B.rect(C + 4, C - 5, 20, 2, STEEL[1]);
      B.round(C - 20, C + 10, 10, 14, 2, DARK[0]);
      for (let k = 0; k < 5; k++) B.poly([[C + 26, C - 3 + k * 1.5], [C + 34 + k * 2, C - 6 + k * 3], [C + 34 + k * 2, C - 4 + k * 3]], 0xc8f0ff, 0.6);
      B.disc(C - 12, C, 5, DARK[0]); B.disc(C - 12, C, 3, 0xffd34d);
    },
    dash(B) { rocket(B, STEEL, 2); },
    scooter(B) {
      B.round(C - 14, C - 26, 28, 20, 6, RED[2]); B.round(C - 13, C - 25, 26, 18, 5, RED[0]); B.rect(C - 10, C - 22, 20, 4, RED[1], 0.8);
      B.rect(C - 4, C - 6, 8, 26, DARK[0]); B.rect(C - 3, C - 6, 2, 26, DARK[1]);
      B.ellipse(C, C + 22, 12, 4, STEEL[2]); for (let k = 0; k < 3; k++) B.ellipse(C + (k - 1) * 8, C + 22, 3, 6, STEEL[0]);
      B.line(C + 13, C - 20, C + 30, C - 28, DARK[0], 3); B.ball(C + 31, C - 28, 3, 3, RED);
    },
    pistol(B) { gun(B, BLUE, CYAN, 1); },
    trigger(B) { gun(B, ORANGE, [0xffd34d, 0xffffff, 0xc89a1e], 1); for (let k = 0; k < 3; k++) B.line(C - 14 + k * 3, C + 10, C - 12 + k * 3, C + 16, 0xffd34d, 1); },
    scatter(B) { gun(B, PURP, PINK, 3); },
    lance(B) { gun(B, RED, [0xff5a4d, 0xffe0a0, 0x8a1a10], 1, true); B.rect(C + 42, C - 1, 6, 3, 0xffe0a0); },
    lamp(B) {
      B.ball(C - 4, C + 6, 22, 16, [0xffd34d, 0xfff0a0, 0xc89a1e], true); B.rect(C - 26, C + 12, 44, 4, 0xc89a1e);
      B.round(C + 8, C - 6, 14, 14, 4, DARK[0]); B.disc(C + 15, C + 1, 5, 0xfff8d0); B.disc(C + 14, C, 2, 0xffffff);
      B.poly([[C + 20, C - 4], [C + 40, C - 16], [C + 40, C + 18], [C + 20, C + 6]], 0xfff8d0, 0.35);
    },
    magnet(B) {
      for (let a = 0; a <= Math.PI; a += 0.03) { B.disc(C + Math.cos(a) * 16, C - 4 + Math.sin(a) * 16, 8, RED[2]); B.disc(C + Math.cos(a) * 16 - 1, C - 5 + Math.sin(a) * 16, 6.5, RED[0]); }
      for (let a = 0.3; a < 2.8; a += 0.05) B.disc(C + Math.cos(a) * 12, C - 7 + Math.sin(a) * 12, 1.2, RED[1]);
      for (const s of [-1, 1]) { B.rect(C + s * 16 - 8, C - 22, 16, 18, RED[0]); B.rect(C + s * 16 - 8, C - 30, 16, 9, STEEL[0]); B.rect(C + s * 16 - 8, C - 30, 16, 2, STEEL[1]); }
      for (let k = 0; k < 3; k++) B.line(C - 20 + k * 20, C - 36, C - 22 + k * 20, C - 42, CYAN[1], 1);
    },
    scanner(B) {
      B.round(C - 18, C - 26, 36, 52, 6, DARK[2]); B.round(C - 17, C - 25, 34, 50, 5, DARK[0]); B.rect(C - 15, C - 23, 5, 46, DARK[1], 0.6);
      B.round(C - 13, C - 20, 26, 22, 3, 0x0a1a10);
      for (let r = 4; r < 12; r += 3) for (let a = 0; a < Math.PI * 2; a += 0.12) B.rect(C + Math.cos(a) * r, C - 9 + Math.sin(a) * r, 1, 1, 0x3aff7a, 0.6);
      B.line(C, C - 9, C + 9, C - 15, 0x8affa0, 1); B.disc(C - 5, C - 13, 1.5, 0xffd34d);
      for (let k = 0; k < 3; k++) B.round(C - 11 + k * 8, C + 8, 6, 5, 1, [RED[0], 0xffd34d, GREEN[0]][k]);
      B.rect(C + 8, C - 34, 2, 10, STEEL[2]); B.disc(C + 9, C - 35, 2.5, RED[0]);
    },
    crew(B) {
      B.round(C - 20, C - 24, 40, 48, 3, 0x1a3a6a); B.round(C - 19, C - 23, 38, 46, 3, BLUE[0]); B.rect(C - 19, C - 23, 5, 46, BLUE[2]);
      B.rect(C + 16, C - 22, 3, 44, 0xfff8e8); for (let k = 0; k < 6; k++) B.rect(C + 16, C - 20 + k * 7, 3, 1, 0xc8c0b0);
      B.rect(C - 10, C - 16, 24, 10, 0xffd34d); B.rect(C - 8, C - 13, 20, 1, 0x8a5a1a); B.rect(C - 8, C - 10, 14, 1, 0x8a5a1a);
      B.disc(C + 2, C + 8, 7, GOLD[0]); B.rect(C + 1, C + 3, 2, 10, GOLD[2]);
    },
    refine(B) {
      B.round(C - 22, C - 26, 44, 52, 5, 0x9aa0b8); B.round(C - 21, C - 25, 42, 50, 4, 0xf0f2fa); B.rect(C - 21, C - 25, 8, 50, 0xffffff, 0.6);
      B.rect(C - 21, C - 16, 42, 2, 0xb8bccc);
      for (let k = 0; k < 3; k++) B.disc(C - 12 + k * 7, C - 20, 2, [RED[0], GREEN[0], 0xffd34d][k]);
      B.disc(C, C + 6, 15, 0x6a7088); B.disc(C, C + 6, 12, 0x2a8ad8); B.disc(C, C + 6, 12, 0xc8f0ff, 0.25);
      for (const [x, y, c] of [[-4, 6, 0xffc83a], [4, 10, 0x8a7aa8], [2, 0, 0x7ef9ff]]) B.ball(C + x, C + y, 3.5, 3, R(c), true);
      B.ellipse(C - 5, C, 5, 3, 0xffffff, 0.5);
    },
    greed(B) {
      B.round(C - 16, C - 20, 32, 42, 8, 0x5a8a7a); B.round(C - 15, C - 19, 30, 40, 7, 0x8ad8b8, 0.6); B.rect(C - 18, C - 26, 36, 8, 0x6a7088); B.rect(C - 18, C - 26, 36, 2, 0xc8ccd8);
      B.ball(C, C + 4, 10, 9, GOLD, true); for (let k = 0; k < 4; k++) B.line(C - 6 + k * 4, C - 4, C - 8 + k * 5, C + 12, GOLD[2], 1, 0.7);
      B.line(C - 11, C - 14, C - 11, C + 12, 0xffffff, 2, 0.6);
    },
    drones(B) {
      B.ball(C, C + 4, 16, 12, STEEL, true); B.round(C - 10, C - 2, 20, 9, 3, 0x0a1a2a); B.disc(C - 5, C + 2, 2, 0x7dff9a); B.disc(C + 5, C + 2, 2, 0x7dff9a);
      for (const s of [-1, 1]) { B.line(C + s * 14, C - 2, C + s * 24, C - 12, STEEL[2], 2); B.ellipse(C + s * 24, C - 14, 11, 2, 0xc8ccd8, 0.8); B.disc(C + s * 24, C - 14, 2, DARK[0]); }
      B.poly([[C - 6, C + 16], [C + 6, C + 16], [C, C + 24]], 0xffd34d);
    },
    droneyield(B) {
      B.rect(C - 24, C - 28, 48, 56, 0x2a2a3a); B.rect(C - 22, C - 26, 44, 52, 0xfff8e8);
      B.rect(C - 20, C - 24, 40, 30, 0x7ab8ff); B.ellipse(C, C - 2, 20, 6, 0x5ad88a);
      B.line(C, C - 24, C, C - 12, 0x3a2a1a, 1); B.ball(C, C - 8, 6, 5, [0xc8a07a, 0xf0d0a8, 0x8a6a4a]); B.disc(C - 2, C - 9, 1, INK); B.disc(C + 2, C - 9, 1, INK);
      B.rect(C - 16, C + 10, 32, 3, 0x1a1a24); B.rect(C - 12, C + 16, 24, 3, 0x1a1a24);
    },
    warp(B) {
      B.round(C - 8, C - 28, 16, 56, 4, DARK[0]);
      for (let k = 0; k < 7; k++) { const y = C - 24 + k * 7.5; B.ellipse(C, y, 18, 4, PT.mix(0xb88a2a, 0xffd08a, k % 2 ? 0.2 : 0.8)); B.ellipse(C, y - 1, 16, 2.5, GOLD[1], 0.6); }
      B.disc(C, C - 32, 6, CYAN[0]); B.disc(C, C - 32, 3.5, 0xffffff);
    },
    deflector(B) {
      B.disc(C, C, 30, CYAN[0], 0.3); B.disc(C, C, 26, CYAN[1], 0.18); for (let a = 0; a < Math.PI * 2; a += 0.02) B.rect(C + Math.cos(a) * 30, C + Math.sin(a) * 30, 2, 2, CYAN[1], 0.8);
      B.ellipse(C - 12, C - 14, 8, 5, 0xffffff, 0.8); B.ellipse(C, C + 8, 14, 4, STEEL[2]); B.ellipse(C, C + 6, 12, 3, STEEL[0]); B.ellipse(C, C + 2, 6, 5, 0x7ec8ff, 0.9);
    },
    navcom(B) {
      B.block(C - 22, C - 16, 44, 36, [0xd8a83a, 0xffe08a, 0x8a6a1a], 6, 5);
      B.disc(C - 7, C + 4, 9, 0x2a2a34); for (let r = 2; r < 9; r += 2) for (let a = 0; a < Math.PI * 2; a += 0.3) B.rect(C - 7 + Math.cos(a) * r, C + 4 + Math.sin(a) * r, 1, 1, 0x5a5a6a);
      B.round(C + 5, C - 8, 12, 8, 2, 0x0a1a10); B.rect(C + 7, C - 6, 8, 2, 0x7dff9a);
      B.rect(C + 12, C - 34, 2, 18, STEEL[2]); B.disc(C + 13, C - 35, 3, RED[0]);
      for (let k = 0; k < 3; k++) for (let a = -0.7; a < 0.7; a += 0.1) B.rect(C + 13 + Math.cos(a) * (6 + k * 5), C - 35 + Math.sin(a) * (6 + k * 5), 1, 1, 0xffd34d);
    }
  };
  // the saucer's parts, done the same way
  const SHIP = {
    laser(B) { gun(B, [0x6a7088, 0xc8ccd8, 0x2a2e3c], RED, 1, true); for (let x = C + 40; x < N; x++) B.rect(x, C - 1, 1, 3, 0xff3a4a, 1 - (x - C - 40) / 10); },
    heat(B) {
      B.poly([[C, C - 30], [C + 26, C - 20], [C + 22, C + 12], [C, C + 30], [C - 22, C + 12], [C - 26, C - 20]], 0x8a2a0a);
      B.poly([[C, C - 27], [C + 23, C - 18], [C + 19, C + 11], [C, C + 27], [C - 19, C + 11], [C - 23, C - 18]], ORANGE[0]);
      B.poly([[C, C - 27], [C - 23, C - 18], [C - 19, C + 11], [C, C + 27]], ORANGE[1], 0.5);
      B.poly([[C - 8, C + 16], [C + 8, C + 16], [C + 6, C - 2], [C + 12, C - 14], [C + 2, C - 6], [C - 3, C - 20], [C - 10, C - 2]], 0xffd34d); B.poly([[C - 4, C + 14], [C + 4, C + 14], [C + 3, C + 2], [C, C - 6], [C - 4, C + 2]], 0xffffff);
    },
    ice(B) {
      B.poly([[C - 30, C + 22], [C + 30, C + 22], [C + 24, C - 6], [C - 24, C - 6]], CYAN[2]); B.poly([[C - 27, C + 20], [C + 27, C + 20], [C + 22, C - 4], [C - 22, C - 4]], 0xc8f4ff);
      B.poly([[C - 27, C + 20], [C - 6, C + 20], [C - 8, C - 4], [C - 22, C - 4]], 0xffffff, 0.6);
      for (let k = 0; k < 5; k++) B.poly([[C - 26 + k * 11, C + 22], [C - 18 + k * 11, C + 22], [C - 22 + k * 11, C + 32]], 0xe8faff);
      B.round(C - 8, C - 22, 16, 18, 3, DARK[0]); bolt(B, C - 4, C - 16); bolt(B, C + 4, C - 16);
    },
    armour(B) { P.hull(B); },
    bubble(B) { P.deflector(B); },
    magnet(B) { P.magnet(B); },
    turbo(B) {
      B.round(C - 20, C - 14, 36, 28, 8, DARK[2]); B.round(C - 19, C - 13, 34, 26, 7, STEEL[0]); B.rect(C - 17, C - 11, 30, 5, STEEL[1]);
      B.disc(C - 2, C, 9, DARK[0]); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; B.line(C - 2, C, C - 2 + Math.cos(a) * 8, C + Math.sin(a) * 8, STEEL[1], 2); }
      B.poly([[C + 15, C - 8], [C + 15, C + 8], [C + 38, C]], CYAN[0]); B.poly([[C + 15, C - 4], [C + 15, C + 4], [C + 30, C]], 0xffffff);
    },
    radar(B) { P.navcom(B); },
    warp(B) { P.warp(B); }
  };
  const CACHE = {};
  function art(kind, id) {
    const key = kind + ':' + id;
    if (CACHE[key] !== undefined) return CACHE[key];
    const f = kind === 'ship' ? SHIP[id] : P[id];
    if (!f) return (CACHE[key] = null);
    const B = PT.buf(N, N);
    f(B);
    B.rim(0xffffff, -1, -1, 0.45);
    B.outline(INK);
    return (CACHE[key] = B.toCanvas());
  }

  /* How rare it is, by what it costs. */
  const RARITY = [[2000, 'COMMON', '#4ac88a'], [20000, 'RARE', '#3a9aff'], [150000, 'EPIC', '#b05aff'], [Infinity, 'LEGEND', '#ffb81a']];
  function rarity(price) { for (const r of RARITY) if (price <= r[0]) return r; return RARITY[3]; }

  /* The stage: rays turning slowly behind the product, a glow, sparkles,
     and every few seconds a shine across the glass. */
  function stage(ctx, x, y, w, h, col, t, hot, seed) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const cx = x + w / 2, cy = y + h / 2;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(w, h) * 0.7);
    ctx.fillStyle = PT.css(PT.mul(PT.hex(col), 0.3)); ctx.fillRect(x, y, w, h);
    g.addColorStop(0, PT.rgba(PT.mix(PT.hex(col), 0xffffff, 0.4), 0.9)); g.addColorStop(0.5, PT.rgba(col, 0.45)); g.addColorStop(1, PT.rgba(col, 0.05));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const rays = 12, rot = t * (hot ? 0.6 : 0.2) + (seed || 0);
    ctx.globalAlpha = hot ? 0.3 : 0.18;
    for (let k = 0; k < rays; k++) {
      const a0 = rot + k / rays * Math.PI * 2, a1 = a0 + Math.PI / rays;
      X.poly(ctx, [[cx, cy], [cx + Math.cos(a0) * w, cy + Math.sin(a0) * w], [cx + Math.cos(a1) * w, cy + Math.sin(a1) * w]], '#ffffff');
    }
    ctx.globalAlpha = 1;
    for (let k = 0; k < 4; k++) {
      const q = (t * 0.7 + k * 0.27 + (seed || 0)) % 1, sx = x + 4 + U.hash2(k, Math.floor(t * 0.7 + k * 0.27 + (seed || 0))) * (w - 8), sy = y + 4 + U.hash2(k + 9, Math.floor(t * 0.7 + (seed || 0))) * (h - 8);
      const s = Math.sin(q * Math.PI);
      ctx.globalAlpha = s;
      X.rect(ctx, sx - 1, sy, 3, 1, '#ffffff'); X.rect(ctx, sx, sy - 1, 1, 3, '#ffffff');
      if (s > 0.7) { X.rect(ctx, sx - 2, sy, 1, 1, '#ffffff'); X.rect(ctx, sx + 2, sy, 1, 1, '#ffffff'); }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  // the shine that crosses the card, drawn after the product
  function shine(ctx, x, y, w, h, t, seed) {
    const q = ((t * 0.35 + (seed || 0)) % 1.8);
    if (q > 1) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const sx = x - 20 + q * (w + 40);
    ctx.globalAlpha = 0.35; X.poly(ctx, [[sx, y], [sx + 8, y], [sx - 6, y + h], [sx - 14, y + h]], '#ffffff');
    ctx.globalAlpha = 0.18; X.poly(ctx, [[sx + 11, y], [sx + 14, y], [sx, y + h], [sx - 3, y + h]], '#ffffff');
    ctx.restore(); ctx.globalAlpha = 1;
  }
  /* A cartoon burst for the moment you buy something. */
  function burst(ctx, x, y, k, word, col) {
    if (k <= 0) return;
    const s = k < 0.15 ? k / 0.15 * 1.3 : 1.3 - Math.min(0.3, (k - 0.15) * 2);
    const n = 14, r0 = 14 * s, r1 = 26 * s;
    const pts = [];
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? r0 : r1; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8]); }
    X.poly(ctx, pts.map(p => [p[0] + 2, p[1] + 2]), '#1a1024');
    X.poly(ctx, pts, col || '#ffd34d');
    X.poly(ctx, pts.map(p => [x + (p[0] - x) * 0.8, y + (p[1] - y) * 0.8]), '#ffffff');
    PD.font.draw(ctx, word, x, y - 3 * Math.max(1, Math.round(s)), '#e5394a', { center: true, scale: Math.max(1, Math.round(s)), shadow: '#1a1024' });
  }

  PD.prodart = { art, rarity, stage, shine, burst, P, SHIP };
})(window.PD);
