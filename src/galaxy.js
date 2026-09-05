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
      const g2 = c.createRadialGradient(x, y, 2, x, y, 40 + rnd() * 60);
      g2.addColorStop(0, 'rgba(6,3,14,0.8)');
      g2.addColorStop(1, 'rgba(6,3,14,0)');
      c.fillStyle = g2;
      c.save(); c.translate(x, y); c.rotate(-0.42); c.scale(2.6, 0.7); c.translate(-x, -y);
      c.fillRect(x - 160, y - 160, 320, 320); c.restore();
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
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, shade(col, 1, 0.22));
      g.addColorStop(0.5, shade(col, 0.8, 0.1));
      g.addColorStop(1, shade(col, 0.6, 0));
      c.fillStyle = g;
      c.save(); c.translate(x, y); c.rotate(rnd() * 3); c.scale(1 + rnd(), 0.6 + rnd() * 0.5); c.translate(-x, -y);
      c.fillRect(x - r * 2, y - r * 2, r * 4, r * 4); c.restore();
    }
    // speckle so it reads as pixel art, not a soft blur
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = 'rgba(255,255,255,' + (0.03 + rnd() * 0.08).toFixed(3) + ')';
      c.fillRect((rnd() * W) | 0, (rnd() * H) | 0, 1, 1);
    }
    return cv;
  }

  /* A far planet: banded disc, optional rings, a moon, terminator shading. */
  function buildPlanet(size, tint, seed, rings) {
    const pad = rings ? size : size * 0.3;
    const W = size + pad * 2;
    const cv = canvas(W, W), c = cv.getContext('2d');
    const rnd = U.mulberry32(seed);
    const cx = W / 2, cy = W / 2, r = size / 2;
    if (rings) {                                        // back half of the rings
      c.save(); c.translate(cx, cy); c.rotate(-0.35); c.scale(1, 0.32);
      for (let k = 0; k < 3; k++) {
        c.strokeStyle = shade(tint, 1.2 - k * 0.2, 0.55 - k * 0.12); c.lineWidth = 3 + k;
        c.beginPath(); c.arc(0, 0, r * (1.5 + k * 0.25), Math.PI, Math.PI * 2); c.stroke();
      }
      c.restore();
    }
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, U.TAU); c.clip();
    c.fillStyle = shade(tint, 0.85); c.fillRect(0, 0, W, W);
    for (let y = -r; y < r; y += 2 + rnd() * 3) {          // bands
      c.fillStyle = shade(tint, 0.6 + rnd() * 0.7, 0.5);
      c.fillRect(cx - r, cy + y, r * 2, 1 + rnd() * 3);
    }
    for (let i = 0; i < 6; i++) {                          // storms
      c.fillStyle = shade(tint, 1.3, 0.35);
      c.beginPath(); c.ellipse(cx + (rnd() - 0.5) * r * 1.4, cy + (rnd() - 0.5) * r * 1.4, 2 + rnd() * r * 0.2, 1 + rnd() * r * 0.08, 0, 0, U.TAU); c.fill();
    }
    const term = c.createLinearGradient(cx - r, 0, cx + r, 0);
    term.addColorStop(0, 'rgba(255,255,255,0.12)'); term.addColorStop(0.55, 'rgba(0,0,0,0)'); term.addColorStop(1, 'rgba(4,2,12,0.9)');
    c.fillStyle = term; c.fillRect(0, 0, W, W);
    c.restore();
    c.strokeStyle = shade(tint, 1.5, 0.6); c.lineWidth = 1;
    c.beginPath(); c.arc(cx, cy, r - 0.5, Math.PI * 0.8, Math.PI * 1.6); c.stroke();
    if (rings) {                                        // front half
      c.save(); c.translate(cx, cy); c.rotate(-0.35); c.scale(1, 0.32);
      for (let k = 0; k < 3; k++) {
        c.strokeStyle = shade(tint, 1.3 - k * 0.2, 0.7 - k * 0.15); c.lineWidth = 3 + k;
        c.beginPath(); c.arc(0, 0, r * (1.5 + k * 0.25), 0, Math.PI); c.stroke();
      }
      c.restore();
    }
    // a moon
    c.fillStyle = shade(tint, 0.5);
    c.beginPath(); c.arc(cx + r * 1.25, cy - r * 0.9, Math.max(2, r * 0.14), 0, U.TAU); c.fill();
    return cv;
  }

  function buildSun(size, col) {
    const W = size * 3;
    const cv = canvas(W, W), c = cv.getContext('2d');
    const cx = W / 2, cy = W / 2;
    const g = c.createRadialGradient(cx, cy, size * 0.3, cx, cy, W / 2);
    g.addColorStop(0, shade(col, 1.4, 0.9)); g.addColorStop(0.25, shade(col, 1, 0.45)); g.addColorStop(1, shade(col, 0.8, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, W);
    for (let i = 0; i < 8; i++) {                       // rays
      c.save(); c.translate(cx, cy); c.rotate(i * Math.PI / 4);
      const rg = c.createLinearGradient(0, 0, W / 2, 0);
      rg.addColorStop(0, shade(col, 1.3, 0.35)); rg.addColorStop(1, shade(col, 1, 0));
      c.fillStyle = rg; c.fillRect(0, -1, W / 2, 2); c.restore();
    }
    c.fillStyle = '#fff8e0';
    c.beginPath(); c.arc(cx, cy, size * 0.42, 0, U.TAU); c.fill();
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
      ctx.strokeStyle = 'rgba(255,255,255,' + (s.life).toFixed(2) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.06, s.y - s.vy * 0.06); ctx.stroke();
    }
  }

  PD.galaxy = { draw, ensure, buildPlanet, buildSun };
})(window.PD);
