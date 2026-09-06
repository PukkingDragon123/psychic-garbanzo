/* Foliage and ground clutter, as pixel art. Every plant and pebble is built
   with hard-edged pixel primitives at 2x density, baked into four sway
   frames, and drawn at logical size -- so a hillside of it costs one
   drawImage per plant and none of it is ever a smooth curve. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const pix = PD.pix;
  const INK = '#140f26';

  const PAL = {
    grass:    { a: '#1d5a33', b: '#2f9350', c: '#63d67e' },
    fern:     { a: '#17482c', b: '#2b8351', c: '#5ac47f' },
    frond:    { a: '#1b5142', b: '#2d9077', c: '#5fd0ac' },
    moss:     { a: '#1f4a2e', b: '#367a45', c: '#69b96a' },
    shroom:   { a: '#4a1f5e', b: '#c44fa8', c: '#ffb6f0', glow: '#ff8ad8' },
    tendril:  { a: '#3a1f5e', b: '#6b3fa8', c: '#b98af0', glow: '#a06bff' },
    vine:     { a: '#1d4a3a', b: '#2f7a56', c: '#63c48a' },
    root:     { a: '#3a2417', b: '#6b452a', c: '#a8734a' },
    bone:     { a: '#6d6a58', b: '#c6c0a4', c: '#f2ecd2' },
    coral:    { a: '#5e1f3a', b: '#c4426f', c: '#ff8ab0' },
    crystal:  { a: '#1f3a6e', b: '#4f8ad6', c: '#b6e2ff', glow: '#7ec8ff' },
    icespike: { a: '#2a5a75', b: '#69b6d6', c: '#d6f4ff' },
    ember:    { a: '#6e2410', b: '#d4541c', c: '#ffb84d', glow: '#ff7a2a' },
    pebble:   { a: '#3a3450', b: '#6b6480', c: '#9c94b4' },
    boulder:  { a: '#3a3450', b: '#5c5574', c: '#8e86a8' }
  };
  function pal(kind) { return PAL[kind] || PAL.grass; }

  /* Builders draw in HD pixels. (x, y) is the base point, s the plant size in
     HD pixels, sw the sway offset applied to the upper parts. */
  const K = {
    grass(p, x, y, s, r, sw, P) {
      const n = 3 + (r % 3);
      for (let i = 0; i < n; i++) {
        const o = Math.round((i - (n - 1) / 2) * s * 0.26);
        const h = Math.round(s * (0.6 + U.hash2(r * 9 + i, 3) * 0.6));
        for (let k = 0; k < h; k++) {
          const f = k / h;
          const bx = x + o + Math.round(sw * f * f + (i % 2 ? 1 : -1) * f * 1.5);
          p.rect(bx, y - k, k < h * 0.4 ? 2 : 1, 1, i % 2 ? P.b : P.a);
        }
        p.set(x + o + Math.round(sw), y - h, P.c);
      }
    },
    fern(p, x, y, s, r, sw, P) {
      const h = Math.round(s * 1.3);
      for (let k = 0; k < h; k++) {
        const f = k / h;
        const bx = x + Math.round(sw * f * f);
        p.rect(bx, y - k, 2, 1, P.a);
        if (k % 4 === 2 && k > 3) {
          const L = Math.round(s * 0.45 * (1.1 - f));
          for (let d = 1; d <= L; d++) { p.set(bx - d, y - k - (d >> 1), P.b); p.set(bx + 1 + d, y - k - (d >> 1), P.b); }
          p.set(bx - L, y - k - (L >> 1) - 1, P.c); p.set(bx + 1 + L, y - k - (L >> 1) - 1, P.c);
        }
      }
      p.rect(x + Math.round(sw) - 1, y - h - 1, 4, 2, P.c);
    },
    frond(p, x, y, s, r, sw, P) {
      for (let i = 0; i < 3; i++) {
        const d = i - 1;
        const h = Math.round(s * (0.9 + U.hash2(r * 31 + i, 9) * 0.4));
        for (let k = 0; k < h; k++) {
          const f = k / h;
          const bx = x + Math.round(d * s * 0.9 * Math.sin(f * 1.6) + sw * f);
          const w = Math.max(1, Math.round(3 * (1 - f) + 1));
          p.rect(bx - (w >> 1), y - Math.round(k * 0.8), w, 1, i % 2 ? P.b : P.a);
        }
      }
      p.rect(x - 1, y - Math.round(s * 0.5), 3, Math.round(s * 0.5), P.c);
    },
    moss(p, x, y, s, r, sw, P) {
      for (let i = 0; i < 5; i++) {
        const o = Math.round((i - 2) * s * 0.28);
        const h = Math.round(s * (0.2 + U.hash2(r + i * 13, 21) * 0.32));
        p.ellipse(x + o, y - h * 0.4, s * 0.24, h, i % 2 ? P.b : P.a);
      }
      p.ellipse(x - s * 0.1, y - s * 0.3, s * 0.18, s * 0.14, P.c);
    },
    shroom(p, x, y, s, r, sw, P) {
      const h = Math.round(s * (0.8 + U.hash2(r, 5) * 0.5));
      for (let k = 0; k < h; k++) p.rect(x - 1 + Math.round(sw * (k / h) * (k / h)), y - k, 3, 1, P.a);
      const tx = x + Math.round(sw), ty = y - h;
      const cw = Math.round(s * (0.55 + U.hash2(r, 11) * 0.3));
      p.ellipse(tx, ty - 1, cw, cw * 0.62, P.b);
      p.rect(tx - cw, ty, cw * 2 + 1, 1, P.a);
      for (let i = 0; i < 3; i++) p.disc(tx - cw * 0.5 + i * cw * 0.5, ty - cw * 0.5 + (i % 2), 1.3, P.c);
    },
    tendril(p, x, y, s, r, sw, P) {
      const h = Math.round(s * 1.6);
      for (let k = 0; k < h; k++) {
        const f = k / h;
        p.rect(x + Math.round(Math.sin(f * 6 + r) * s * 0.18 + sw * f), y - k, 2, 1, P.b);
      }
      p.disc(x + Math.round(Math.sin(6 + r) * s * 0.18 + sw), y - h, 2.4, P.c);
    },
    vine(p, x, y, s, r, sw, P) {
      const h = Math.round(s * 1.5);
      for (let k = 0; k < h; k++) {
        const f = k / h;
        const bx = x + Math.round(Math.sin(f * 5 + r) * s * 0.2 + sw * f);
        p.rect(bx, y - k, 2, 1, P.a);
        if (k % 5 === 3) { p.rect(bx + (k % 2 ? 2 : -3), y - k - 1, 3, 2, k % 2 ? P.b : P.c); }
      }
    },
    root(p, x, y, s, r, sw, P) {
      const h = Math.round(s * 1.2);
      for (let k = 0; k < h; k++) {
        const f = k / h;
        p.rect(x - 1 + Math.round(sw * f * 0.6), y - k, 3 - (f > 0.6 ? 1 : 0), 1, P.b);
        if (k === (h >> 1)) { for (let d = 1; d < s * 0.5; d++) { p.set(x - d, y - k - d, P.a); p.set(x + 2 + d, y - k - (d >> 1), P.a); } }
      }
    },
    bone(p, x, y, s, r, sw, P) {
      const h = Math.round(s * 1.1);
      for (let i = 0; i < 3; i++) {
        const d = (i - 1) * Math.round(s * 0.45);
        for (let k = 0; k < h - Math.abs(i - 1) * 3; k++) {
          const f = k / h;
          p.rect(x + d + Math.round(d * f * 0.6 + sw * f * 0.3), y - k, 2, 1, i === 1 ? P.c : P.b);
        }
      }
      p.ellipse(x + 1, y - 1, s * 0.36, s * 0.16, P.a);
    },
    coral(p, x, y, s, r, sw, P) {
      const h = Math.round(s * 1.1);
      for (let i = -2; i <= 2; i++) {
        const len = h - Math.abs(i) * 3;
        for (let k = 0; k < len; k++) {
          const f = k / len;
          p.rect(x + Math.round(i * s * 0.5 * f * f + sw * f), y - k, 2, 1, i === 0 ? P.c : P.b);
        }
        p.disc(x + Math.round(i * s * 0.5 + sw), y - len, 1.6, P.c);
      }
    },
    crystal(p, x, y, s, r, sw, P) {
      for (let i = 0; i < 3; i++) {
        const o = Math.round((i - 1) * s * 0.34);
        const h = Math.round(s * (0.5 + U.hash2(r * 7 + i, 17) * 0.9));
        const w = Math.round(s * 0.18) + 1;
        p.spike(x + o - w, y - h, w * 2 + 1, h, -1, i === 1 ? P.b : P.a);
        p.rect(x + o, y - h + 2, 1, Math.max(1, h - 5), P.c);
      }
    },
    icespike(p, x, y, s, r, sw, P) { K.crystal(p, x, y, s, r, 0, P); },
    ember(p, x, y, s, r, sw, P) {
      for (let i = 0; i < 2; i++) {
        const o = Math.round((i - 0.5) * s * 0.4);
        const h = Math.round(s * (0.6 + U.hash2(r + i * 5, 23) * 0.5));
        p.spike(x + o - Math.round(s * 0.22), y - h, Math.round(s * 0.44) + 1, h, -1, i ? P.b : P.a);
        p.spike(x + o - Math.round(s * 0.1) + Math.round(sw), y - h + 3, Math.round(s * 0.2) + 1, h - 5, -1, P.c);
      }
    },
    /* ground clutter: small stones and a fat boulder, never animated */
    pebble(p, x, y, s, r, sw, P) {
      const n = 2 + (r % 3);
      for (let i = 0; i < n; i++) {
        const o = Math.round((i - (n - 1) / 2) * s * 0.5);
        const rr = s * (0.16 + U.hash2(r + i * 3, 29) * 0.18);
        p.ellipse(x + o, y - rr * 0.6, rr * 1.2, rr, i % 2 ? P.b : P.a);
        p.set(x + o - 1, y - Math.round(rr * 1.2), P.c);
      }
    },
    boulder(p, x, y, s, r, sw, P) {
      const rr = s * 0.55;
      p.ellipse(x, y - rr * 0.7, rr * 1.15, rr * 0.85, P.b);
      p.shade(P.b, P.a, 0, 1);
      p.ellipse(x - rr * 0.3, y - rr * 1.1, rr * 0.45, rr * 0.22, P.c);
      p.rect(x + Math.round(rr * 0.3), y - Math.round(rr * 0.6), 2, 1, P.a);
      p.set(x - Math.round(rr * 0.5), y - Math.round(rr * 0.4), P.a);
    }
  };
  const STILL = { pebble: 1, boulder: 1, crystal: 1, icespike: 1, bone: 1, moss: 1 };

  /* ------------------------------------------------------------ sprite cache */
  const cache = new Map();
  const PHASES = 4;
  const HD = 2;

  function sprite(kind, bucket, variant, phase, dir) {
    const key = kind + '|' + bucket + '|' + variant + '|' + phase + '|' + dir;
    let cv = cache.get(key);
    if (cv) return cv;
    const s = (5 + bucket * 2.2) * HD;                       // size in HD pixels
    const w = Math.ceil(s * 3.2), h = Math.ceil(s * 2.6);
    const p = pix(w, h);
    const P = pal(kind);
    const fn = K[kind] || K.grass;
    const seed = variant * 7 + 3;
    const sw = STILL[kind] ? 0 : Math.round(Math.sin((phase / PHASES) * Math.PI * 2 + seed) * s * 0.14);
    fn(p, w >> 1, h - 2, s, seed, sw, P);
    p.outline(INK);
    cv = p.toCanvas();
    if (dir < 0) {
      // hanging: flip the baked sprite
      const f = document.createElement('canvas');
      f.width = cv.width; f.height = cv.height;
      const c = f.getContext('2d');
      c.translate(0, f.height); c.scale(1, -1);
      c.drawImage(cv, 0, 0);
      cv = f;
    }
    if (P.glow) {
      // bake a soft glow behind the glowing kinds
      const g = document.createElement('canvas');
      g.width = cv.width + 8; g.height = cv.height + 8;
      const c = g.getContext('2d');
      c.shadowColor = P.glow; c.shadowBlur = 6;
      c.drawImage(cv, 4, 4);
      c.shadowBlur = 0;
      c.drawImage(cv, 4, 4);
      cv = g;
    }
    cache.set(key, cv);
    return cv;
  }

  /* Draw one plant. dir 1 grows up from the floor, -1 hangs from a ceiling. */
  function draw(ctx, kind, x, y, s, seed, time, dir) {
    const bucket = U.clamp(Math.round((s - 5) / 2.2), 0, 4);
    const variant = seed % 5;
    const phase = ((Math.floor(time * 2.4 + seed * 0.7) % PHASES) + PHASES) % PHASES;
    const cv = sprite(kind, bucket, variant, phase, dir < 0 ? -1 : 1);
    const w = cv.width / HD, h = cv.height / HD;
    if (dir < 0) ctx.drawImage(cv, (x - w / 2) | 0, (y - 1) | 0, w, h);
    else ctx.drawImage(cv, (x - w / 2) | 0, (y - h + 1) | 0, w, h);
  }

  PD.flora = { draw, sprite, PAL, kinds: Object.keys(K) };
})(window.PD);
