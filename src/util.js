/* Planet Destroyer -- small math / helper library.
   Everything hangs off the single global PD namespace so the game can run
   straight off the filesystem (classic scripts, no module loader needed). */
window.PD = window.PD || {};

(function (PD) {
  'use strict';

  const TAU = Math.PI * 2;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function invLerp(a, b, v) { return b === a ? 0 : (v - a) / (b - a); }
  function smoothstep(a, b, v) { const t = clamp(invLerp(a, b, v), 0, 1); return t * t * (3 - 2 * t); }

  /* Frame-rate independent exponential approach: `t` is the fraction covered
     in one second. Used for camera and meter easing. */
  function damp(a, b, t, dt) { return lerp(a, b, 1 - Math.pow(1 - t, dt * 60)); }

  function rand(a, b) {
    if (a === undefined) return Math.random();
    if (b === undefined) return Math.random() * a;
    return a + Math.random() * (b - a);
  }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function chance(p) { return Math.random() < p; }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* table is [[value, weight], ...] */
  function weighted(table) {
    let total = 0;
    for (let i = 0; i < table.length; i++) total += table[i][1];
    let r = Math.random() * total;
    for (let i = 0; i < table.length; i++) {
      r -= table[i][1];
      if (r <= 0) return table[i][0];
    }
    return table[table.length - 1][0];
  }

  /* Deterministic hash noise -- keeps tile speckle stable between frames.
     Math.imul throughout: a plain float multiply here overflows 2^53 and
     silently throws away the low bits, which badly skews the distribution. */
  function hash2(x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Cheap value noise built on hash2 -- plenty for ore veins and cave blobs. */
  function noise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi);
    const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }

  function fbm(x, y, octaves) {
    let sum = 0, amp = 0.5, norm = 0;
    for (let i = 0; i < (octaves || 3); i++) {
      sum += noise2(x, y) * amp;
      norm += amp;
      amp *= 0.5; x *= 2; y *= 2;
    }
    return sum / norm;
  }

  /* Turn "I want the top f fraction of tiles" into an fbm threshold.
     fbm() is roughly normal (mean ~0.52, sd ~0.15), so we go through a small
     inverse-normal table instead of guessing cutoffs. */
  const QZ = [
    [0.00, 3.2], [0.01, 2.33], [0.02, 2.05], [0.05, 1.645], [0.10, 1.282],
    [0.15, 1.036], [0.20, 0.842], [0.25, 0.674], [0.30, 0.524], [0.40, 0.253],
    [0.50, 0], [0.60, -0.253], [0.70, -0.524], [0.80, -0.842], [0.90, -1.282],
    [1.00, -3.2]
  ];
  function probitTop(f) {
    f = clamp(f, 0, 1);
    for (let i = 1; i < QZ.length; i++) {
      if (f <= QZ[i][0]) {
        const t = (f - QZ[i - 1][0]) / (QZ[i][0] - QZ[i - 1][0]);
        return lerp(QZ[i - 1][1], QZ[i][1], t);
      }
    }
    return -3.2;
  }
  function fbmThreshold(f, mean, sd) {
    return (mean === undefined ? 0.52 : mean) + (sd === undefined ? 0.15 : sd) * probitTop(f);
  }

  function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* Shortest signed angle from a to b. */
  function angleDelta(a, b) {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }

  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  function fmt(n) {
    n = Math.floor(n);
    if (Math.abs(n) < 1000) return String(n);
    let tier = 0;
    let v = n;
    while (Math.abs(v) >= 1000 && tier < SUFFIX.length - 1) { v /= 1000; tier++; }
    const s = v < 10 ? v.toFixed(2) : (v < 100 ? v.toFixed(1) : v.toFixed(0));
    return s.replace(/\.0+$/, '') + SUFFIX[tier];
  }

  function fmtKg(kg) {
    return (kg < 10 ? kg.toFixed(1) : Math.round(kg).toString()) + 'kg';
  }

  function roman(n) {
    const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '';
    for (const [v, s] of map) { while (n >= v) { out += s; n -= v; } }
    return out || 'I';
  }

  PD.util = {
    TAU, clamp, lerp, invLerp, smoothstep, damp,
    rand, randInt, chance, pick, shuffle, weighted,
    hash2, mulberry32, noise2, fbm, probitTop, fbmThreshold,
    dist, dist2, aabb, angleDelta,
    fmt, fmtKg, roman
  };
})(window.PD);
