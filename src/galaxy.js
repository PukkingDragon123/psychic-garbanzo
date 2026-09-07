/* Deep-space backdrop: a spiral arm of stars and dust, coloured nebulae, a sun
   with a flare, ringed planets and moons, shooting stars. Everything heavy is
   pre-rendered once into layer canvases and scrolled with parallax. */
(function (PD) {
  'use strict';
  const U = PD.util;

  const VW = 480, VH = 270;
  let layers = null;

  function shade(hex, f, alpha) {
    const n = parseInt(hex.slice(1), 16);
    const r = U.clamp(((n >> 16) & 255) * f, 0, 255) | 0, g = U.clamp(((n >> 8) & 255) * f, 0, 255) | 0, b = U.clamp((n & 255) * f, 0, 255) | 0;
    return alpha === undefined ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* An integer scanline disc: every edge is a hard pixel step. */
  function pxDisc(c, cx, cy, r, col) {
    if (col) c.fillStyle = col;
    const r2 = r;
    for (let y = Math.ceil(cy - r); y <= Math.floor(cy + r); y++) {
      const dy = Math.abs(y - cy + 0.5) / r2;
      if (dy > 1) continue;
      const w = r2 * Math.min(1, 1.42 - dy);
      const x0 = Math.round(cx - w), x1 = Math.round(cx + w);
      if (x1 > x0) c.fillRect(x0, y, x1 - x0, 1);
    }
  }

  /* The galactic band: thousands of tiny stars concentrated along a tilted
     sine, with dust lanes drawn dark through them. */
  function buildBand(seed) {
    const W = 960, H = 540;
    const cv = canvas(W, H), c = cv.getContext('2d');
    const rnd = U.mulberry32(seed);
    const grd = c.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, 'rgba(40,20,80,0)');
    grd.addColorStop(0.5, 'rgba(70,40,120,0.35)');
    grd.addColorStop(1, 'rgba(30,15,60,0)');
    c.fillStyle = grd;
    c.save(); c.translate(W / 2, H / 2); c.rotate(-0.42); c.fillRect(-W, -90, W * 2, 180); c.restore();
    for (let i = 0; i < 5200; i++) {
      const t = rnd();
      const along = (rnd() - 0.5) * W * 1.6;
      const spread = (rnd() + rnd() + rnd() - 1.5) * 70;
      const x = W / 2 + along * Math.cos(-0.42) - spread * Math.sin(-0.42);
      const y = H / 2 + along * Math.sin(-0.42) + spread * Math.cos(-0.42);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const big = t > 0.985;
      c.fillStyle = t > 0.93 ? '#ffe2b8' : (t > 0.86 ? '#b8d8ff' : '#ffffff');
      c.globalAlpha = big ? 0.9 : 0.25 + rnd() * 0.45;
      c.fillRect(x | 0, y | 0, big ? 2 : 1, big ? 2 : 1);
    }
    // dust lanes
    c.globalAlpha = 1;
    for (let i = 0; i < 14; i++) {
      const along = (rnd() - 0.5) * W * 1.2, spread = (rnd() - 0.5) * 60;
      const x = W / 2 + along * Math.cos(-0.42) - spread * Math.sin(-0.42);
      const y = H / 2 + along * Math.sin(-0.42) + spread * Math.cos(-0.42);
      const rr = 40 + rnd() * 60;
      c.save(); c.translate(x, y); c.rotate(-0.42); c.scale(2.6, 0.7); c.translate(-x, -y);
      for (let k = 5; k >= 1; k--) {                    // stepped dust bands
        c.globalAlpha = 0.16;
        pxDisc(c, x, y, rr * k / 5, 'rgb(6,3,14)');
      }
      c.globalAlpha = 1;
      c.restore();
    }
    return cv;
  }

  function buildNebulae(seed) {
    const W = 480, H = 270;
    const cv = canvas(W, H), c = cv.getContext('2d');
    const rnd = U.mulberry32(seed + 7);
    const cols = ['#5a2a8a', '#2a4a8a', '#8a2a5a', '#2a7a6a', '#7a3a2a'];
    for (let i = 0; i < 9; i++) {
      const x = rnd() * W, y = rnd() * H, r = 50 + rnd() * 110;
      const col = cols[i % cols.length];
      c.save(); c.translate(x, y); c.rotate(rnd() * 3); c.scale(1 + rnd(), 0.6 + rnd() * 0.5); c.translate(-x, -y);
      for (let k = 6; k >= 1; k--) pxDisc(c, x, y, r * k / 6, shade(col, 0.7 + k * 0.06, 0.05));
      c.restore();
    }
    // speckle so it reads as pixel art, not a soft blur
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = 'rgba(255,255,255,' + (0.03 + rnd() * 0.08).toFixed(3) + ')';
      c.fillRect((rnd() * W) | 0, (rnd() * H) | 0, 1, 1);
    }
    return cv;
  }

  /* A far planet: banded disc, optional rings, a moon, terminator shading. */
  /* Planets and suns are rasterised at a low resolution with an integer
     scanline disc -- every edge is a hard pixel step -- then blown up with
     nearest-neighbour, so a world in the sky reads as pixel art and never as
     a smooth vector circle. */
  const PXK = 4;                                   // blow-up factor

  /* One elliptical ring, as pixels. `back` draws the far half only. */
  function pxRingBand(c, cx, cy, r, squash, col, thick, back) {
    c.fillStyle = col;
    for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) {
      const dx = (x - cx) / r;
      const k = 1 - dx * dx;
      if (k < 0) continue;
      const dy = Math.sqrt(k) * r * squash;
      if (back) c.fillRect(x, Math.round(cy - dy), 1, thick);
      else c.fillRect(x, Math.round(cy + dy), 1, thick);
    }
  }

  function buildPlanet(size, tint, seed, rings) {
    const S = Math.max(12, Math.round(size / PXK));
    const pad = rings ? Math.round(S * 0.55) : Math.round(S * 0.18);
    const W = S + pad * 2;
    const src = canvas(W, W), c = src.getContext('2d');
    const rnd = U.mulberry32(seed);
    const cx = W / 2, cy = W / 2, r = S / 2;

    // continents, as blobs on the sphere's surface in latitude/longitude
    const spots = [];
    for (let i = 0; i < 7; i++) spots.push({ x: (rnd() - 0.5) * 1.7, y: (rnd() - 0.5) * 1.7, r: 0.16 + rnd() * 0.26, k: 1.2 + rnd() * 0.35 });
    const bands = [];
    for (let i = 0; i < 12; i++) bands.push(0.75 + rnd() * 0.5);

    if (rings) for (let k = 0; k < 3; k++) pxRingBand(c, cx, cy, r * (1.45 + k * 0.26), 0.3, shade(tint, 1.0 - k * 0.16), 2, true);

    // shade the sphere per pixel, quantised into steps
    for (let y = 0; y < W; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (x - cx + 0.5) / r, dy = (y - cy + 0.5) / r;
        const ax = Math.abs(dx), ay = Math.abs(dy);
        if (ax > 1 || ay > 1 || ax + ay > 1.42) continue;   // an octagon, not a disc
        const d2 = Math.min(0.999, dx * dx + dy * dy);
        const nz = Math.sqrt(1 - d2);
        let lam = -dx * 0.55 - dy * 0.5 + nz * 0.62;          // light from the upper left
        lam = U.clamp(lam, 0, 1);
        lam = Math.round(lam * 5) / 5;                          // five hard bands
        let f = 0.34 + lam * 1.05;
        f *= bands[Math.min(bands.length - 1, Math.floor((dy + 1) / 2 * bands.length))];
        for (const sp of spots) {
          if (Math.abs(dx - sp.x) < sp.r && Math.abs(dy - sp.y) < sp.r * 0.7) { f *= sp.k; break; }
        }
        c.fillStyle = shade(tint, U.clamp(f, 0.12, 1.9));
        c.fillRect(x, y, 1, 1);
      }
    }
    // lit limb, a single stepped pixel line on the sunward side
    c.fillStyle = shade(tint, 1.75);
    // the lit limb, traced along the octagon's own upper-left facets
    const cc2 = r * 0.42;
    const lim = [[-r + cc2, -r], [r - cc2, -r], [-r, -r + cc2], [-r, r - cc2], [-r + cc2, r]];
    for (let i = 0; i < lim.length - 1; i += 1) {
      const a3 = lim[i], b3 = lim[i + 1];
      const n = Math.max(2, Math.round(Math.hypot(b3[0] - a3[0], b3[1] - a3[1])));
      for (let k = 0; k <= n; k++) {
        const f = k / n;
        c.fillRect(Math.round(cx + a3[0] + (b3[0] - a3[0]) * f), Math.round(cy + a3[1] + (b3[1] - a3[1]) * f), 1, 1);
      }
    }
    if (rings) for (let k = 0; k < 3; k++) pxRingBand(c, cx, cy, r * (1.45 + k * 0.26), 0.3, shade(tint, 1.4 - k * 0.16), 2, false);
    // a moon, shaded the same way
    const mr = Math.max(1, r * 0.15);
    pxDisc(c, cx + r * 1.3, cy - r * 0.85, mr, shade(tint, 0.55));
    pxDisc(c, cx + r * 1.3 - mr * 0.3, cy - r * 0.85 - mr * 0.3, mr * 0.6, shade(tint, 0.85));

    const cv = canvas(W * PXK, W * PXK);
    const cc = cv.getContext('2d');
    cc.imageSmoothingEnabled = false;
    cc.drawImage(src, 0, 0, W, W, 0, 0, W * PXK, W * PXK);
    return cv;
  }

  /* A pixel sun: quantised corona rings and four tapering spikes. */
  function buildSun(size, col) {
    const R = Math.max(4, Math.round(size / PXK));
    const S = R * 8;
    const src = canvas(S, S), c = src.getContext('2d');
    const cx = S / 2, cy = S / 2;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // octagonal falloff: |x|+|y| clipped, so even the corona is faceted
        const ax2 = Math.abs(x - cx + 0.5) / R, ay2 = Math.abs(y - cy + 0.5) / R;
        const d = Math.max(Math.max(ax2, ay2), (ax2 + ay2) / 1.42);
        if (d > 3.4) continue;
        let a, f;
        if (d <= 0.55) { a = 1; f = 1.7; }
        else if (d <= 0.85) { a = 1; f = 1.35; }
        else if (d <= 1.05) { a = 1; f = 1.05; }
        else { a = U.clamp(0.42 - (d - 1.05) * 0.16, 0, 0.42); f = 1.1; }
        if (a <= 0.02) continue;
        c.globalAlpha = Math.round(a * 6) / 6;
        c.fillStyle = d <= 0.55 ? '#fff8e0' : shade(col, f);
        c.fillRect(x, y, 1, 1);
      }
    }
    c.globalAlpha = 1;
    // spikes: tapering pixel bars on the four axes
    for (let i = 0; i < 4; i++) {
      const len = R * 3.2;
      for (let d = R; d < len; d++) {
        const th = Math.max(1, Math.round((1 - d / len) * R * 0.5));
        c.globalAlpha = Math.round((1 - d / len) * 5) / 5 * 0.7;
        c.fillStyle = shade(col, 1.3);
        if (i === 0) c.fillRect(cx + d, cy - th / 2, 1, th);
        else if (i === 1) c.fillRect(cx - d, cy - th / 2, 1, th);
        else if (i === 2) c.fillRect(cx - th / 2, cy + d, th, 1);
        else c.fillRect(cx - th / 2, cy - d, th, 1);
      }
    }
    c.globalAlpha = 1;
    const cv = canvas(S * PXK, S * PXK);
    const cc = cv.getContext('2d');
    cc.imageSmoothingEnabled = false;
    cc.drawImage(src, 0, 0, S, S, 0, 0, S * PXK, S * PXK);
    return cv;
  }

  function ensure(seed) {
    if (layers && layers.seed === seed) return layers;
    const rnd = U.mulberry32(seed + 99);
    layers = {
      seed,
      band: buildBand(seed),
      nebulae: buildNebulae(seed),
      sun: { cv: buildSun(20 + rnd() * 14, U.pick(['#ffd27a', '#ffb07a', '#b8e0ff'])), x: 0.12 + rnd() * 0.5, y: 0.08 + rnd() * 0.25, p: 0.02 },
      planets: [],
      stars: [],
      shooters: []
    };
    const tints = ['#8a5a9a', '#5a8a9a', '#9a7a4a', '#4a7a5a', '#9a4a4a', '#6a6a9a'];
    for (let i = 0; i < 4; i++) {
      const size = 22 + rnd() * 50;
      layers.planets.push({ cv: buildPlanet(size, tints[(i + Math.floor(seed)) % tints.length], seed * 3 + i, i % 2 === 0),
        x: rnd() * 1.3, y: rnd() * 0.9, p: 0.03 + i * 0.015 });
    }
    for (let l = 0; l < 3; l++) {
      const arr = [];
      for (let i = 0; i < 110 - l * 25; i++) arr.push({ x: rnd() * 1.5, y: rnd() * 1.5, s: l === 2 && rnd() > 0.7 ? 2 : 1, tw: rnd() * 6.28, c: rnd() > 0.88 ? '#ffd9a0' : (rnd() > 0.72 ? '#a9d8ff' : '#ffffff') });
      layers.stars.push(arr);
    }
    return layers;
  }

  /* Draw the whole sky. `cam` in world px; `skyTint` is the world's own hue. */
  function draw(ctx, cam, time, seed, skyTint, opts) {
    opts = opts || {};
    const L = ensure(seed);
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, skyTint || '#0b0720');
    g.addColorStop(1, '#04030d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

    // galactic band, slow parallax, tiled horizontally
    const bx = -((cam.x * 0.012) % 960), by = -60 - (cam.y * 0.008) % 40;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(L.band, bx, by, 960, 540);
    ctx.drawImage(L.band, bx + 960, by, 960, 540);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(L.nebulae, -((cam.x * 0.02) % VW) - 2, -((cam.y * 0.015) % 60) - 2, VW + 4, VH + 64);
    ctx.globalAlpha = 1;

    for (let l = 0; l < L.stars.length; l++) {
      const par = 0.03 + l * 0.05;
      for (const st of L.stars[l]) {
        const x = ((st.x * VW * 1.5 - cam.x * par) % (VW * 1.5) + VW * 1.5) % (VW * 1.5);
        const y = ((st.y * VH * 1.5 - cam.y * par * 0.7) % (VH * 1.5) + VH * 1.5) % (VH * 1.5);
        if (x > VW || y > VH) continue;
        ctx.globalAlpha = (0.55 + 0.45 * Math.sin(time * 2 + st.tw)) * (0.4 + l * 0.25);
        ctx.fillStyle = st.c;
        ctx.fillRect(x | 0, y | 0, st.s, st.s);
      }
    }
    ctx.globalAlpha = 1;

    const sun = L.sun;
    ctx.drawImage(sun.cv, (sun.x * VW - cam.x * sun.p - sun.cv.width / 2) | 0, (sun.y * VH - cam.y * sun.p * 0.7 - sun.cv.height / 2) | 0);

    for (const pl of L.planets) {
      const x = ((pl.x * VW * 1.3 - cam.x * pl.p) % (VW * 1.3) + VW * 1.3) % (VW * 1.3) - pl.cv.width / 2;
      const y = pl.y * VH - cam.y * pl.p * 0.6 - pl.cv.height / 2;
      ctx.drawImage(pl.cv, x | 0, y | 0);
    }

    // shooting stars, occasionally
    if (Math.random() < 0.004 && L.shooters.length < 2) L.shooters.push({ x: Math.random() * VW, y: Math.random() * VH * 0.5, vx: 260 + Math.random() * 200, vy: 90 + Math.random() * 80, life: 0.6 });
    for (let i = L.shooters.length - 1; i >= 0; i--) {
      const s = L.shooters[i];
      s.life -= 1 / 60; s.x += s.vx / 60; s.y += s.vy / 60;
      if (s.life <= 0) { L.shooters.splice(i, 1); continue; }
      PD.pxd.line(ctx, s.x, s.y, s.x - s.vx * 0.06, s.y - s.vy * 0.06, 'rgba(255,255,255,' + (s.life).toFixed(2) + ')', 1);
    }
  }

  PD.galaxy = { draw, ensure, buildPlanet, buildSun };
})(window.PD);
