/* The game's icon language. Every glyph is drawn procedurally at 12x12 and
   cached per colour, so the HUD, terminals and tutorial can speak without
   words: a bar plus a glyph plus a number is a sentence. */
(function (PD) {
  'use strict';
  const pix = PD.pix;
  const U = PD.util;

  const INK = '#1a1030';
  const builders = {};
  const cache = {};

  function def(name, fn) { builders[name] = fn; }

  /* Each builder draws in a single "paint" colour c, plus optional accent a. */
  def('coin', (p, c, a) => { p.disc(6, 6, 5, c); p.disc(6, 6, 3.2, a); p.rect(5, 3, 2, 6, c); p.rect(4, 4, 4, 1, c); p.rect(4, 7, 4, 1, c); });
  def('ore', (p, c, a) => { p.round(1, 4, 10, 7, 3, c); p.round(3, 1, 6, 5, 2, c); p.rect(3, 3, 3, 1, a); p.rect(2, 6, 2, 2, a); p.rect(7, 7, 2, 1, a); p.set(5, 2, '#ffffff'); });
  def('drill', (p, c, a) => { p.round(0, 4, 5, 4, 1, a); for (let x = 5; x < 12; x++) { const h = Math.max(0, 2.5 - (x - 5) * 0.4); for (let y = -h; y <= h; y++) p.set(x, Math.round(6 + y), (x + Math.round(y)) % 2 ? c : a); } });
  def('gun', (p, c, a) => { p.round(0, 4, 8, 4, 1, a); p.rect(2, 8, 2, 3, a); p.rect(8, 5, 4, 2, c); });
  def('scatter', (p, c, a) => { p.round(0, 4, 7, 4, 1, a); p.rect(2, 8, 2, 3, a); p.rect(7, 3, 5, 2, c); p.rect(7, 7, 5, 2, c); });
  def('lance', (p, c, a) => { p.round(0, 4, 6, 4, 1, a); p.rect(2, 8, 2, 3, a); p.rect(6, 5, 6, 2, c); p.rect(10, 3, 2, 6, c); });
  def('dash', (p, c, a) => { p.spike(8, 2, 8, 8, 1, c); p.rect(0, 4, 4, 1, a); p.rect(0, 6, 5, 1, a); p.rect(0, 8, 3, 1, a); });
  def('scan', (p, c, a) => { for (let t = 0; t < 6.3; t += 0.35) p.set(6 + Math.cos(t) * 5, 6 + Math.sin(t) * 5, a); p.disc(6, 6, 2, c); p.line(6, 6, 10, 2, c); });
  def('o2', (p, c, a) => { p.round(3, 2, 6, 10, 2, c); p.rect(4, 0, 4, 2, a); p.rect(5, 4, 2, 5, a); });
  def('hull', (p, c, a) => { p.round(2, 1, 8, 7, 2, c); p.spike(6, 6, 8, 5, 1, c); p.rect(5, 3, 2, 3, a); });
  def('cargo', (p, c, a) => { p.round(1, 3, 10, 8, 1, c); p.rect(1, 5, 10, 1, a); p.rect(5, 3, 2, 8, a); });
  def('weight', (p, c, a) => { p.spike(6, 4, 10, 7, 1, c); p.rect(2, 10, 8, 1, c); p.rect(5, 1, 2, 3, a); p.set(5, 1, c); p.set(6, 1, c); });
  def('planet', (p, c, a) => { p.disc(6, 6, 4.5, c); p.disc(4.5, 4.5, 1.5, a); p.disc(7.5, 7, 1, a); p.rect(0, 6, 12, 1, a); });
  def('hole', (p, c, a) => { p.disc(6, 6, 5.5, c); p.disc(6, 6, 3.6, a); p.disc(6, 6, 2, INK); p.set(9, 3, a); p.set(3, 9, a); });
  def('hand', (p, c, a) => { p.rect(5, 0, 3, 7, c); p.round(2, 5, 9, 7, 2, c); p.rect(1, 6, 2, 3, c); p.rect(9, 6, 2, 3, c); p.rect(6, 1, 1, 4, a); p.rect(4, 8, 5, 1, a); });
  def('arrowR', (p, c) => { p.rect(0, 5, 7, 2, c); p.spike(8, 2, 8, 4, 1, c); p.spike(8, 6, 8, 4, -1, c); p.rect(7, 4, 2, 4, c); });
  def('arrowD', (p, c) => { p.rect(5, 0, 2, 7, c); for (let i = 0; i < 4; i++) p.rect(2 + i, 6 + i, 8 - i * 2, 1, c); });
  def('arrowU', (p, c) => { p.rect(5, 5, 2, 7, c); for (let i = 0; i < 4; i++) p.rect(2 + i, 5 - i, 8 - i * 2, 1, c); });
  def('lock', (p, c, a) => { p.round(2, 5, 8, 7, 1, c); p.rect(3, 2, 6, 4, a); p.rect(4, 3, 4, 3, INK); p.rect(3, 2, 6, 1, a); p.rect(5, 7, 2, 3, INK); });
  def('check', (p, c) => { p.line(1, 6, 4, 10, c); p.line(2, 6, 5, 10, c); p.line(4, 10, 11, 2, c); p.line(5, 10, 11, 3, c); });
  def('cross', (p, c) => { p.line(1, 1, 10, 10, c); p.line(2, 1, 11, 10, c); p.line(10, 1, 1, 10, c); p.line(11, 1, 2, 10, c); });
  def('clock', (p, c, a) => { p.disc(6, 6, 5.5, c); p.disc(6, 6, 4.3, INK); p.rect(5, 2, 2, 5, a); p.rect(6, 6, 3, 2, a); });
  def('star', (p, c, a) => { p.spike(6, 0, 5, 6, 1, c); p.spike(6, 6, 5, 6, -1, c); p.rect(0, 5, 12, 2, c); p.disc(6, 6, 1.5, a); });
  def('skull', (p, c, a) => { p.round(2, 1, 8, 7, 3, c); p.rect(3, 3, 2, 2, INK); p.rect(7, 3, 2, 2, INK); p.rect(4, 7, 4, 2, c); p.rect(4, 8, 1, 2, c); p.rect(6, 8, 1, 2, c); p.set(5, 6, INK); p.set(6, 6, INK); });
  def('machine', (p, c, a) => { p.round(1, 4, 10, 7, 1, c); p.rect(2, 1, 3, 3, a); p.rect(7, 2, 2, 2, a); p.rect(3, 6, 6, 2, INK); p.rect(3, 6, 3, 2, a); });
  def('belt', (p, c, a) => { p.rect(0, 4, 12, 4, c); p.rect(1, 5, 2, 2, a); p.rect(5, 5, 2, 2, a); p.rect(9, 5, 2, 2, a); });
  def('crew', (p, c, a) => { p.disc(6, 3.5, 3, c); p.round(1, 7, 10, 5, 2, c); p.set(5, 3, INK); p.set(7, 3, INK); p.rect(3, 9, 6, 1, a); });
  def('home', (p, c, a) => { p.spike(6, 0, 12, 6, 1, c); p.rect(2, 6, 8, 6, c); p.rect(5, 8, 2, 4, INK); p.rect(3, 7, 2, 2, a); });
  def('bang', (p, c) => { p.rect(5, 0, 2, 7, c); p.rect(5, 9, 2, 2, c); });
  def('quest', (p, c) => { p.round(3, 0, 6, 5, 2, c); p.rect(4, 1, 4, 2, INK); p.rect(3, 1, 1, 2, INK); p.rect(6, 5, 2, 3, c); p.rect(6, 10, 2, 2, c); });
  def('play', (p, c) => { p.spike(6, 1, 10, 10, 1, c); }); // pointing down; rotated in draw
  def('rock', (p, c, a) => { p.round(1, 3, 10, 8, 3, c); p.round(3, 1, 6, 4, 2, c); p.set(4, 5, a); p.set(7, 6, a); p.set(5, 8, a); });
  def('depth', (p, c, a) => { p.rect(2, 0, 8, 2, c); p.rect(5, 2, 2, 7, c); p.spike(6, 8, 8, 4, 1, c); p.rect(0, 10, 12, 2, a); });
  def('speed', (p, c, a) => { for (let k = 0; k < 3; k++) { const x0 = k * 3; p.line(x0, 2, x0 + 3, 6, c); p.line(x0, 10, x0 + 3, 6, c); p.line(x0 + 1, 2, x0 + 4, 6, k === 2 ? c : a); p.line(x0 + 1, 10, x0 + 4, 6, k === 2 ? c : a); } });
  def('galaxy', (p, c, a) => { for (let t = 0; t < 9; t += 0.25) { const r = t * 0.6; p.set(6 + Math.cos(t) * r, 6 + Math.sin(t) * r, c); } p.disc(6, 6, 1.5, a); });
  def('sell', (p, c, a) => { p.spike(2, 1, 4, 5, 1, c); p.rect(0, 5, 12, 6, c); p.rect(4, 0, 8, 6, c); p.disc(9, 3, 1.4, INK); p.rect(2, 7, 7, 1, a); p.rect(2, 9, 5, 1, a); });
  def('build', (p, c, a) => { p.rect(1, 8, 6, 3, c); p.rect(5, 1, 6, 5, c); p.rect(5, 6, 2, 3, c); p.rect(8, 2, 2, 2, a); });
  def('up', (p, c, a) => { p.spike(6, 0, 12, 6, 1, c); p.rect(3, 6, 6, 2, c); p.rect(3, 9, 6, 2, a); });
  def('eye', (p, c, a) => { p.ellipse(6, 6, 6, 3.5, c); p.disc(6, 6, 2.2, INK); p.disc(6, 6, 1.2, a); });
  def('drone', (p, c, a) => { p.round(3, 4, 6, 5, 2, c); p.rect(0, 3, 4, 1, a); p.rect(8, 3, 4, 1, a); p.disc(6, 6.5, 1.2, a); });
  def('hex', (p, c) => { for (let y = 0; y < 12; y++) { const w = y < 3 ? 2 + y * 1.7 : (y > 8 ? 2 + (11 - y) * 1.7 : 6); for (let x = -w; x <= w; x++) p.set(6 + x, y, c); } });

  function build(name, c, a) {
    const key = name + '|' + c + '|' + a;
    if (cache[key]) return cache[key];
    const p = pix(14, 14);
    const inner = pix(12, 12);
    (builders[name] || builders.quest)(inner, c, a || c);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const v = inner.get(x, y); if (v) p.set(x + 1, y + 1, v); }
    p.outline(INK);
    const cv = p.toCanvas();
    cache[key] = cv;
    return cv;
  }

  /* Draw a glyph with its top-left at x,y (14px box) at integer scale. */
  function draw(ctx, name, x, y, c, a, scale) {
    const cv = build(name, c || '#f2e9ff', a || '#9c8ec4');
    const s = scale || 1;
    ctx.drawImage(cv, 0, 0, 14, 14, x | 0, y | 0, 14 * s, 14 * s);
  }

  /* A glyph + a number, the game's basic HUD sentence. Returns the width. */
  function stat(ctx, name, value, x, y, c, a, numCol) {
    draw(ctx, name, x, y, c, a);
    PD.font.draw(ctx, value, x + 17, y + 4, numCol || '#f2e9ff');
    return 17 + PD.font.width(String(value), 1);
  }

  /* Hexagon outline/fill helpers -- the UI's only shape besides the rectangle. */
  function hexPath(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI / 6 + i * Math.PI / 3;
      const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  /* Hard-edged: scanline fill and an outline of integer runs, never a stroke.
     A stroked hexagon leaves anti-aliased pixels down every diagonal, which is
     what made the touch pad look blurry next to the rest of the game. */
  function hex(ctx, x, y, r, fill, stroke, lw) {
    PD.pxd.hex(ctx, x, y, r, fill, stroke, lw);
  }
  /* Six-segment progress ring drawn as hex edges. */
  function hexProgress(ctx, x, y, r, frac, col) {
    const segs = Math.round(U.clamp(frac, 0, 1) * 6);
    for (let i = 0; i < segs; i++) {
      const a0 = -Math.PI / 2 + i * Math.PI / 3, a1 = a0 + Math.PI / 3;
      PD.pxd.line(ctx, x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, 2);
    }
  }

  PD.glyph = { draw, stat, hex, hexPath, hexProgress, names: Object.keys(builders), build };
})(window.PD);
