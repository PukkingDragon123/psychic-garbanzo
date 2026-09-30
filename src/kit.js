/* KIT: the cozy storybook UI. Cream parchment cards with a thick brown ink
   line, green ribbon headers, fat green buttons with a lip underneath, and
   inset slots like an inventory. Everything is drawn in half pixels, so the
   rims and highlights land on the screen's real 2x grid.

   Every screen that wants to look like it belongs uses these; nothing here
   knows about the game. */
(function (PD) {
  'use strict';
  const F = PD.font;
  const U = PD.util;

  const K = {
    ink: '#3a2213', brown: '#7b4b2a', brownHi: '#a9713f', brownLo: '#55311b',
    parch: '#f4e3bf', parchHi: '#fff5dc', parchLo: '#e0c595', parchDk: '#c9a877',
    text: '#4a2b17', dim: '#8e6b48', gold: '#f2b632', goldHi: '#ffe07a',
    green: '#5db43b', greenHi: '#92e05c', greenLo: '#357f25', greenDk: '#1f4d17',
    red: '#e2453b', redHi: '#ff8a72', redLo: '#9a2424',
    blue: '#3f9be0', blueHi: '#8fd3ff', blueLo: '#245f9a',
    tan: '#d9b27a', tanHi: '#f1d39c', tanLo: '#a5783f',
    slot: '#e6cf9f', slotLo: '#c7a56e'
  };
  const HUES = {
    green: [K.green, K.greenHi, K.greenLo],
    red: [K.red, K.redHi, K.redLo],
    blue: [K.blue, K.blueHi, K.blueLo],
    gold: [K.gold, K.goldHi, '#b07a16'],
    tan: [K.tan, K.tanHi, K.tanLo],
    purple: ['#9a6ad8', '#c9a4ff', '#5e3a96'],
    grey: ['#a89a88', '#cfc3b2', '#6f6353']
  };

  /* A rounded rectangle, filled, with its corners cut on the 2x grid. */
  function rr(ctx, x, y, w, h, r, col) {
    const X = Math.round(x * 2), Y = Math.round(y * 2), W = Math.round(w * 2), H = Math.round(h * 2);
    const R = Math.max(0, Math.min(Math.round(r * 2), W >> 1, H >> 1));
    ctx.fillStyle = col;
    ctx.fillRect(X / 2, (Y + R) / 2, W / 2, (H - R * 2) / 2);
    for (let i = 0; i < R; i++) {
      const ins = R - Math.round(Math.sqrt(R * R - (R - i - 0.5) * (R - i - 0.5)));
      ctx.fillRect((X + ins) / 2, (Y + i) / 2, (W - ins * 2) / 2, 0.5);
      ctx.fillRect((X + ins) / 2, (Y + H - 1 - i) / 2, (W - ins * 2) / 2, 0.5);
    }
  }
  function hash(a, b) { return U.hash2 ? U.hash2(a, b) : ((Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1 + 1) % 1; }

  /* The parchment card. opts: { title, fill, shadow, flat, seed } */
  function panel(ctx, x, y, w, h, opts) {
    opts = opts || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (opts.shadow !== false) rr(ctx, x + 1, y + 3, w, h, 5, 'rgba(24,10,2,0.42)');
    rr(ctx, x, y, w, h, 5, K.ink);
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 4, K.brown);
    rr(ctx, x + 1, y + 1, w - 2, 1.5, 1, K.brownHi);
    rr(ctx, x + 2.5, y + 2.5, w - 5, h - 5, 3, K.ink);
    const fill = opts.fill || K.parch;
    rr(ctx, x + 3, y + 3, w - 6, h - 6, 2.5, fill);
    if (!opts.flat) {
      ctx.fillStyle = K.parchHi; ctx.fillRect(x + 5, y + 3.5, w - 10, 0.5);
      ctx.fillStyle = K.parchLo; ctx.fillRect(x + 4, y + h - 5, w - 8, 1.5);
      // the grain of the paper: faint fibres and a few flecks, same every frame
      const sd = opts.seed || (x * 7 + y * 13);
      ctx.fillStyle = 'rgba(160,112,60,0.13)';
      for (let yy = y + 7; yy < y + h - 7; yy += 3) {
        const r = hash(yy, sd);
        if (r > 0.45) ctx.fillRect(x + 6 + ((r * 97) % (w * 0.5)), yy, 6 + r * w * 0.3, 0.5);
      }
      ctx.fillStyle = 'rgba(150,100,50,0.22)';
      for (let i = 0; i < (w * h) / 180; i++) {
        ctx.fillRect(x + 5 + hash(i, sd + 1) * (w - 10), y + 5 + hash(i, sd + 2) * (h - 10), 0.5, 0.5);
      }
      // brass studs in the corners
      for (const [cx, cy] of [[x + 1.5, y + 1.5], [x + w - 3.5, y + 1.5], [x + 1.5, y + h - 3.5], [x + w - 3.5, y + h - 3.5]]) {
        rr(ctx, cx, cy, 2, 2, 1, K.goldHi);
        ctx.fillStyle = '#b07a16'; ctx.fillRect(cx + 1, cy + 1, 1, 1);
      }
    }
    if (opts.title) ribbon(ctx, x + w / 2, y - 6, opts.title, { col: opts.titleCol, min: Math.min(w - 20, opts.titleW || 0) });
  }

  /* A green banner with folded tails. cx is its centre, y its top. */
  function ribbon(ctx, cx, y, text, opts) {
    opts = opts || {};
    const hue = HUES[opts.col || 'green'] || HUES.green;
    const s = opts.scale || 1;
    const tw = F.width(text, s);
    const w = Math.max(opts.min || 0, tw + 20), h = 9 + 5 * s;
    const x = Math.round(cx - w / 2); y = Math.round(y);
    // tails, tucked behind
    for (const side of [-1, 1]) {
      const tx = side < 0 ? x - 8 : x + w - 2;
      rr(ctx, tx, y + 4, 10, h - 2, 1, K.ink);
      rr(ctx, tx + 1, y + 5, 8, h - 4, 0.5, hue[2]);
      // the swallowtail notch
      ctx.fillStyle = K.ink;
      const nx = side < 0 ? tx : tx + 7;
      for (let i = 0; i < 3; i++) ctx.fillRect(side < 0 ? nx + i : nx + 2 - i, y + 4 + (h - 2) / 2 - 2 + i * 0.5, 1, 4 - i);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(side < 0 ? tx + 7 : tx + 1, y + 5, 2, h - 4);
    }
    rr(ctx, x, y, w, h, 2, K.ink);
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 1.5, hue[0]);
    rr(ctx, x + 1.5, y + 1, w - 3, 1.5, 1, hue[1]);
    ctx.fillStyle = hue[2]; ctx.fillRect(x + 2, y + h - 3, w - 4, 1.5);
    // stitching along the band
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let sx = x + 4; sx < x + w - 4; sx += 3) { ctx.fillRect(sx, y + 2.5, 1.5, 0.5); ctx.fillRect(sx, y + h - 4, 1.5, 0.5); }
    F.draw(ctx, text, cx, y + (h - 7 * s) / 2 - 0.5, opts.color || '#ffffff', { center: true, scale: s, shadow: K.greenDk && hueInk(hue) });
    return { x, y, w, h };
  }
  function hueInk(hue) { return hue === HUES.green ? K.greenDk : K.ink; }

  /* A fat button with a lip. opts: { hot, down, disabled, col, scale, color } */
  function btn(ctx, x, y, w, h, label, opts) {
    opts = opts || {};
    x = Math.round(x); y = Math.round(y);
    const hue = opts.disabled ? HUES.grey : (HUES[opts.col || 'green'] || HUES.green);
    const push = opts.down ? 1 : 0, lift = opts.hot && !opts.down ? -1 : 0;
    rr(ctx, x, y + 2, w, h, 3, 'rgba(24,10,2,0.35)');
    rr(ctx, x, y + lift + push, w, h - lift - push, 3, K.ink);
    rr(ctx, x + 1, y + 1 + lift + push, w - 2, h - 2 - lift - push, 2.5, hue[2]);
    rr(ctx, x + 1, y + 1 + lift + push, w - 2, h - 4 - lift - push, 2.5, opts.hot ? hue[1] : hue[0]);
    rr(ctx, x + 2, y + 1.5 + lift + push, w - 4, 1.5, 1, opts.hot ? '#ffffff' : hue[1]);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 2.5, y + 3 + lift + push, 1, 1);
    const s = opts.scale || 1;
    if (label) F.draw(ctx, label, x + w / 2, y + lift + push + Math.round((h - 2 - 7 * s) / 2) - 0.5, opts.color || (opts.disabled ? '#e8e0d4' : '#ffffff'),
      { center: true, scale: s, shadow: opts.disabled ? '#5a5046' : (hue === HUES.green ? K.greenDk : K.ink) });
    return { x, y, w, h };
  }

  /* An inventory slot. opts: { sel, hot, fill } */
  function slot(ctx, x, y, w, h, opts) {
    opts = opts || {};
    rr(ctx, x, y, w, h, 2.5, opts.sel ? '#b07a16' : K.brownLo);
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 2, opts.fill || (opts.hot ? '#f2ddb0' : K.slot));
    ctx.fillStyle = K.slotLo; ctx.fillRect(x + 2, y + 1, w - 4, 1.5); ctx.fillRect(x + 1, y + 2, 1, h - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x + 2, y + h - 2, w - 4, 0.5);
    if (opts.sel) { rr(ctx, x - 1, y - 1, w + 2, 1, 0.5, K.goldHi); rr(ctx, x - 1, y + h, w + 2, 1, 0.5, K.goldHi); ctx.fillStyle = K.goldHi; ctx.fillRect(x - 1, y, 1, h); ctx.fillRect(x + w, y, 1, h); }
  }

  /* A framed meter, like the red health bar. opts: { label, right, ghost, lo } */
  function bar(ctx, x, y, w, h, frac, col, opts) {
    opts = opts || {};
    frac = U.clamp(frac, 0, 1);
    x = Math.round(x); y = Math.round(y);
    rr(ctx, x - 1, y - 1, w + 2, h + 2, Math.min(3, h / 2 + 1), K.ink);
    rr(ctx, x, y, w, h, Math.min(2.5, h / 2), '#5b3a22');
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 1, y, w - 2, 1);
    const fw = Math.round(w * frac * 2) / 2;
    if (opts.ghost !== undefined && opts.ghost > frac) rr(ctx, x, y, Math.round(w * U.clamp(opts.ghost, 0, 1)), h, Math.min(2.5, h / 2), 'rgba(255,240,220,0.4)');
    if (fw > 0.5) {
      rr(ctx, x, y, fw, h, Math.min(2.5, h / 2), opts.lo || shade(col));
      rr(ctx, x, y, fw, h - Math.max(1, h * 0.3), Math.min(2.5, h / 2), col);
      if (h >= 4 && fw > 3) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 1.5, y + 1, fw - 3, 0.5); ctx.fillRect(x + 1.5, y + 1, 1, 0.5); }
    }
    if (opts.label) F.draw(ctx, opts.label, x + 3, y + Math.round((h - 7) / 2), '#ffffff', { shadow: K.ink });
    if (opts.right) F.draw(ctx, opts.right, x + w - 3, y + Math.round((h - 7) / 2), '#ffffff', { right: true, shadow: K.ink });
  }
  function shade(col) {
    const m = /^#([0-9a-f]{6})$/i.exec(col);
    if (!m) return 'rgba(0,0,0,0.35)';
    const n = parseInt(m[1], 16);
    const f = v => Math.round(v * 0.62).toString(16).padStart(2, '0');
    return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
  }

  /* The little red square with a cross in it. */
  function close(ctx, x, y, hot) {
    btn(ctx, x, y, 13, 13, '', { col: 'red', hot });
    ctx.fillStyle = '#ffffff';
    const lift = hot ? -1 : 0;
    for (let i = 0; i < 5; i++) { ctx.fillRect(x + 4 + i, y + 3.5 + i + lift, 1.5, 1); ctx.fillRect(x + 8 - i, y + 3.5 + i + lift, 1.5, 1); }
  }

  /* A keycap: the E over the thing you can use. */
  function key(ctx, x, y, label, opts) {
    opts = opts || {};
    const w = Math.max(13, F.width(label, 1) + 8);
    x = Math.round(x - w / 2); y = Math.round(y);
    rr(ctx, x, y, w, 14, 3, K.ink);
    rr(ctx, x + 1, y + 1, w - 2, 12, 2.5, '#c9b28a');
    rr(ctx, x + 1, y + 1, w - 2, 10, 2.5, opts.hot ? '#fffaf0' : '#fbf1dc');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2.5, y + 1.5, w - 5, 0.5);
    F.draw(ctx, label, x + w / 2, y + 3, K.text, { center: true, shadow: false });
    return w;
  }

  /* A little pill tag, for prices and counts. */
  function tag(ctx, x, y, text, col, opts) {
    opts = opts || {};
    const hue = HUES[col || 'gold'] || HUES.gold;
    const w = F.width(text, 1) + 8;
    if (opts.right) x -= w; else if (opts.center) x -= w / 2;
    x = Math.round(x); y = Math.round(y);
    rr(ctx, x, y, w, 11, 3, K.ink);
    rr(ctx, x + 1, y + 1, w - 2, 9, 2.5, hue[2]);
    rr(ctx, x + 1, y + 1, w - 2, 7.5, 2.5, hue[0]);
    ctx.fillStyle = hue[1]; ctx.fillRect(x + 2.5, y + 1.5, w - 5, 0.5);
    F.draw(ctx, text, x + w / 2, y + 2, '#ffffff', { center: true, shadow: K.ink });
    return w;
  }

  /* A heart, for hull. frac 0..1 fills it from the bottom. */
  function heart(ctx, x, y, frac) {
    const M = ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'];
    const px = (cx, cy, c) => { ctx.fillStyle = c; ctx.fillRect(x + cx, y + cy, 1, 1); };
    // ink rim
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (M[r][c] === '#') {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const rr2 = r + dy, cc = c + dx;
        if (rr2 < 0 || rr2 > 6 || cc < 0 || cc > 6 || M[rr2][cc] !== '#') px(c + dx, r + dy, K.ink);
      }
    }
    const lvl = 7 - Math.round(frac * 7);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (M[r][c] === '#') px(c, r, r >= lvl ? (r > 4 ? K.redLo : K.red) : '#6a4630');
    if (frac > 0.6) { px(1, 1, K.redHi); px(2, 1, '#ffffff'); }
  }

  /* A dark paper vignette behind a modal card. */
  function dim(ctx, a) {
    ctx.fillStyle = 'rgba(28,14,6,' + (a === undefined ? 0.5 : a) + ')';
    ctx.fillRect(0, 0, 480, 270);
  }

  function hit(m, x, y, w, h) { return m && m.inside !== false && m.x >= x && m.x < x + w && m.y >= y && m.y < y + h; }

  PD.kit = { K, HUES, rr, panel, ribbon, btn, slot, bar, close, key, tag, heart, dim, hit, shade };
})(window.PD);
