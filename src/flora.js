/* Foliage. Everything here is drawn with real curves -- stems that bend,
   caps that bulge, fans that branch -- so the terrain surface stops reading
   as a grid of squares. Each plant is deterministic from its cell hash and
   sways on its own clock. */
(function (PD) {
  'use strict';
  const U = PD.util;

  /* Palettes keyed by plant kind. a = shadow, b = body, c = highlight. */
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
    ember:    { a: '#6e2410', b: '#d4541c', c: '#ffb84d', glow: '#ff7a2a' }
  };

  function pal(kind) { return PAL[kind] || PAL.grass; }

  /* Stroke a bending stem and return its tip, so caps and leaves can sit on it. */
  function stem(ctx, x, y, h, bend, w, col) {
    const tx = x + bend, ty = y - h;
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + bend * 0.2, y - h * 0.6, tx, ty);
    ctx.stroke();
    return [tx, ty];
  }

  function blob(ctx, x, y, rx, ry, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const K = {
    /* tufts of curved blades */
    grass(ctx, x, y, s, r, sway, P) {
      const n = 3 + ((r * 4) | 0);
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * (s * 0.22);
        const h = s * (0.55 + U.hash2(r * 90 + i, 3) * 0.7);
        stem(ctx, x + o, y, h, sway * (1 + i * 0.3) + o * 0.2, 1.4, i % 2 ? P.b : P.a);
      }
      stem(ctx, x, y, s * 0.9, sway * 1.4, 1, P.c);
    },
    /* a stem with leaflets stepping down both sides */
    fern(ctx, x, y, s, r, sway, P) {
      const h = s * 1.25;
      const [tx, ty] = stem(ctx, x, y, h, sway * 1.2, 1.6, P.a);
      ctx.strokeStyle = P.b; ctx.lineWidth = 1.4;
      for (let i = 1; i <= 4; i++) {
        const f = i / 5;
        const px = x + (tx - x) * f * f, py = y - h * f;
        const L = s * 0.42 * (1.1 - f);
        for (const d of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.quadraticCurveTo(px + d * L, py - L * 0.1, px + d * L * 0.9, py - L * 0.7);
          ctx.stroke();
        }
      }
      blob(ctx, tx, ty, 1.4, 1.4, P.c);
    },
    /* broad drooping leaf blades */
    frond(ctx, x, y, s, r, sway, P) {
      for (let i = 0; i < 3; i++) {
        const d = i === 1 ? 0 : (i === 0 ? -1 : 1);
        const h = s * (0.9 + U.hash2(r * 31 + i, 9) * 0.5);
        ctx.fillStyle = i % 2 ? P.b : P.a;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + d * s * 0.7 + sway, y - h * 0.9, x + d * s * 1.1 + sway * 1.6, y - h * 0.35);
        ctx.quadraticCurveTo(x + d * s * 0.45, y - h * 0.5, x, y);
        ctx.fill();
      }
      ctx.fillStyle = P.c;
      ctx.fillRect(x - 1, y - s * 0.5, 2, s * 0.5);
    },
    /* fuzzy cushions clinging to the rock */
    moss(ctx, x, y, s, r, sway, P) {
      for (let i = 0; i < 5; i++) {
        const o = (i - 2) * s * 0.26;
        const h = s * (0.18 + U.hash2(r + i * 13, 21) * 0.3);
        blob(ctx, x + o, y - h * 0.4, s * 0.22, h, i % 2 ? P.b : P.a);
      }
      blob(ctx, x - s * 0.1, y - s * 0.28, s * 0.16, s * 0.13, P.c);
    },
    /* bent stalk, fat glowing cap, spots */
    shroom(ctx, x, y, s, r, sway, P) {
      const h = s * (0.8 + U.hash2(r, 5) * 0.6);
      const [tx, ty] = stem(ctx, x, y, h, sway * 0.8, 2.2, P.a);
      const cw = s * (0.55 + U.hash2(r, 11) * 0.3);
      ctx.fillStyle = P.b;
      ctx.beginPath();
      ctx.moveTo(tx - cw, ty + 1);
      ctx.quadraticCurveTo(tx, ty - cw * 1.5, tx + cw, ty + 1);
      ctx.quadraticCurveTo(tx, ty + cw * 0.5, tx - cw, ty + 1);
      ctx.fill();
      ctx.fillStyle = P.c;
      for (let i = 0; i < 3; i++) {
        const a = -2.6 + i * 0.75;
        blob(ctx, tx + Math.cos(a) * cw * 0.5, ty - cw * 0.45 + Math.sin(a) * 2, 1.2, 1, P.c);
      }
    },
    /* hanging rope of light */
    tendril(ctx, x, y, s, r, sway, P, dir) {
      const h = s * 1.6 * dir;
      ctx.strokeStyle = P.b; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + sway * 2, y - h * 0.4, x - sway * 2, y - h * 0.75, x + sway * 3, y - h);
      ctx.stroke();
      blob(ctx, x + sway * 3, y - h, 2, 2.4, P.c);
    },
    vine(ctx, x, y, s, r, sway, P, dir) {
      const h = s * 1.5 * dir;
      ctx.strokeStyle = P.a; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + sway * 2, y - h * 0.45, x - sway, y - h * 0.7, x + sway * 2, y - h);
      ctx.stroke();
      for (let i = 1; i <= 3; i++) {
        const f = i / 4;
        blob(ctx, x + sway * f * 2 + (i % 2 ? 2 : -2), y - h * f, 2.2, 1.5, i % 2 ? P.b : P.c);
      }
    },
    /* woody forks reaching out of the ceiling */
    root(ctx, x, y, s, r, sway, P, dir) {
      const h = s * 1.2 * dir;
      ctx.strokeStyle = P.b; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + sway, y - h * 0.6, x + sway * 1.4 - 2, y - h);
      ctx.stroke();
      ctx.lineWidth = 1.4; ctx.strokeStyle = P.a;
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + sway * 0.4, y - h * 0.45);
        ctx.quadraticCurveTo(x + d * s * 0.5, y - h * 0.6, x + d * s * 0.7, y - h * 0.95);
        ctx.stroke();
      }
    },
    /* old ribs poking out of the strata */
    bone(ctx, x, y, s, r, sway, P, dir) {
      const h = s * 1.1 * dir;
      ctx.strokeStyle = P.b; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const d = (i - 1) * 0.5;
        ctx.beginPath();
        ctx.moveTo(x + d * s * 0.4, y);
        ctx.quadraticCurveTo(x + d * s + sway, y - h * 0.7, x + d * s * 0.6 + sway, y - h);
        ctx.stroke();
      }
      blob(ctx, x, y - h * 0.05, s * 0.35, s * 0.16, P.a);
    },
    /* branching fan */
    coral(ctx, x, y, s, r, sway, P, dir) {
      ctx.strokeStyle = P.b; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const h = s * 1.1 * dir;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + i * s * 0.22, y - h * 0.5, x + i * s * 0.5 + sway, y - h * (0.7 + Math.abs(i) * -0.1));
        ctx.stroke();
      }
      ctx.strokeStyle = P.c; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x, y - h * 0.6, x + sway, y - h * 0.95);
      ctx.stroke();
    },
    /* angular shard cluster */
    crystal(ctx, x, y, s, r, sway, P, dir) {
      for (let i = 0; i < 3; i++) {
        const o = (i - 1) * s * 0.3;
        const h = s * (0.5 + U.hash2(r * 7 + i, 17) * 0.9) * dir;
        const w = s * 0.16 + i * 0.4;
        ctx.fillStyle = i === 1 ? P.b : P.a;
        ctx.beginPath();
        ctx.moveTo(x + o - w, y);
        ctx.lineTo(x + o + w, y);
        ctx.lineTo(x + o + w * 0.4 + o * 0.2, y - h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = P.c;
      ctx.fillRect(x - 0.5, y - s * 0.7 * dir, 1, s * 0.5 * dir);
    },
    icespike(ctx, x, y, s, r, sway, P, dir) {
      K.crystal(ctx, x, y, s, r, sway * 0.2, P, dir);
    },
    /* licking flames */
    ember(ctx, x, y, s, r, sway, P, dir) {
      for (let i = 0; i < 2; i++) {
        const o = (i - 0.5) * s * 0.35;
        const h = s * (0.6 + U.hash2(r + i * 5, 23) * 0.6) * dir;
        ctx.fillStyle = i ? P.b : P.a;
        ctx.beginPath();
        ctx.moveTo(x + o - s * 0.2, y);
        ctx.quadraticCurveTo(x + o - s * 0.25 + sway, y - h * 0.6, x + o + sway * 2, y - h);
        ctx.quadraticCurveTo(x + o + s * 0.3 + sway, y - h * 0.55, x + o + s * 0.2, y);
        ctx.fill();
      }
      ctx.fillStyle = P.c;
      blob(ctx, x + sway, y - s * 0.35 * dir, 1.4, s * 0.22, P.c);
    }
  };

  /* Plants are expensive to path out every frame, so each one is baked into a
     small cached canvas with its sway frozen at four phases. Drawing a whole
     hillside of foliage then costs one drawImage per plant. */
  const cache = new Map();
  const PHASES = 4;

  function sprite(kind, sizeBucket, variant, phase, dir) {
    const key = kind + '|' + sizeBucket + '|' + variant + '|' + phase + '|' + dir;
    let cv = cache.get(key);
    if (cv) return cv;
    const s = 5 + sizeBucket * 2.2;
    const w = Math.ceil(s * 3), h = Math.ceil(s * 2.6);
    cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    const P = pal(kind);
    const fn = K[kind] || K.grass;
    const seed = variant * 7 + 3;
    const sway = Math.sin((phase / PHASES) * Math.PI * 2 + seed) * s * 0.16;
    c.save();
    if (dir < 0) { c.translate(0, h); c.scale(1, -1); }
    if (P.glow) { c.shadowColor = P.glow; c.shadowBlur = 5; }
    fn(c, w / 2, h - 1, s, seed, sway, P, 1);
    c.restore();
    cache.set(key, cv);
    return cv;
  }

  /* Draw one plant. dir 1 grows up from the floor, -1 hangs from a ceiling. */
  function draw(ctx, kind, x, y, s, seed, time, dir) {
    const bucket = U.clamp(Math.round((s - 5) / 2.2), 0, 4);
    const variant = seed % 5;
    const phase = ((Math.floor(time * 2.4 + seed * 0.7) % PHASES) + PHASES) % PHASES;
    const cv = sprite(kind, bucket, variant, phase, dir < 0 ? -1 : 1);
    if (dir < 0) ctx.drawImage(cv, (x - cv.width / 2) | 0, y | 0);
    else ctx.drawImage(cv, (x - cv.width / 2) | 0, (y - cv.height + 1) | 0);
  }

  PD.flora = { draw, sprite, PAL, kinds: Object.keys(K) };
})(window.PD);
