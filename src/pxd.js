/* Pixel drawing primitives for everything the game draws at runtime.
   There is not a single smooth curve in here: discs are octagons, rings are
   stepped bands, "curves" are chains of integer segments, and every edge lands
   on a whole unit so it survives the upscale as real pixels. */
(function (PD) {
  'use strict';
  const U = PD.util;

  function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  /* A chunky plate: face, top-left light, bottom-right shadow, cut corners. */
  function plate(ctx, x, y, w, h, face, light, dark, cut) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    cut = cut === undefined ? 3 : cut;
    ctx.fillStyle = face;
    ctx.fillRect(x + cut, y, w - cut * 2, h);
    ctx.fillRect(x, y + cut, w, h - cut * 2);
    for (let i = 0; i < cut; i++) {
      ctx.fillRect(x + cut - i - 1, y + i, 1, 1); ctx.fillRect(x + w - cut + i, y + i, 1, 1);
      ctx.fillRect(x + cut - i - 1, y + h - i - 1, 1, 1); ctx.fillRect(x + w - cut + i, y + h - i - 1, 1, 1);
    }
    if (light) {
      ctx.fillStyle = light;
      ctx.fillRect(x + cut, y, w - cut * 2, 1);
      ctx.fillRect(x, y + cut, 1, h - cut * 2);
    }
    if (dark) {
      ctx.fillStyle = dark;
      ctx.fillRect(x + cut, y + h - 1, w - cut * 2, 1);
      ctx.fillRect(x + w - 1, y + cut, 1, h - cut * 2);
    }
  }

  /* A hollow frame with notched corners -- the game's window border. */
  function frame(ctx, x, y, w, h, col, accent) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.fillStyle = col;
    ctx.fillRect(x + 3, y, w - 6, 1); ctx.fillRect(x + 3, y + h - 1, w - 6, 1);
    ctx.fillRect(x, y + 3, 1, h - 6); ctx.fillRect(x + w - 1, y + 3, 1, h - 6);
    ctx.fillRect(x + 1, y + 1, 2, 1); ctx.fillRect(x + 1, y + 2, 1, 1);
    ctx.fillRect(x + w - 3, y + 1, 2, 1); ctx.fillRect(x + w - 2, y + 2, 1, 1);
    ctx.fillRect(x + 1, y + h - 2, 2, 1); ctx.fillRect(x + 1, y + h - 3, 1, 1);
    ctx.fillRect(x + w - 3, y + h - 2, 2, 1); ctx.fillRect(x + w - 2, y + h - 3, 1, 1);
    if (accent) {
      ctx.fillStyle = accent;
      ctx.fillRect(x + 3, y, 8, 1); ctx.fillRect(x, y + 3, 1, 8);
      ctx.fillRect(x + w - 11, y + h - 1, 8, 1); ctx.fillRect(x + w - 1, y + h - 11, 1, 8);
    }
  }

  /* Octagon: what a circle looks like when it is made of pixels. */
  function octPath(ctx, x, y, r) {
    x = Math.round(x); y = Math.round(y); r = Math.max(2, Math.round(r));
    const c = Math.max(1, Math.round(r * 0.42));
    ctx.beginPath();
    ctx.moveTo(x - r + c, y - r); ctx.lineTo(x + r - c, y - r);
    ctx.lineTo(x + r, y - r + c); ctx.lineTo(x + r, y + r - c);
    ctx.lineTo(x + r - c, y + r); ctx.lineTo(x - r + c, y + r);
    ctx.lineTo(x - r, y + r - c); ctx.lineTo(x - r, y - r + c);
    ctx.closePath();
  }
  function oct(ctx, x, y, r, fill, edge, lw) {
    octPath(ctx, x, y, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }

  /* A blob of solid pixels -- scanline octagon, no anti-aliasing anywhere. */
  function blob(ctx, x, y, rx, ry, col) {
    x = Math.round(x); y = Math.round(y);
    rx = Math.max(1, Math.round(rx)); ry = Math.max(1, Math.round(ry));
    ctx.fillStyle = col;
    for (let j = -ry; j <= ry; j++) {
      const f = 1 - (j * j) / ((ry + 0.4) * (ry + 0.4));
      const w = Math.round(rx * Math.sqrt(Math.max(0, f)));
      if (w <= 0) continue;
      ctx.fillRect(x - w, y + j, w * 2 + 1, 1);
    }
  }

  /* A ring that expands as stepped bands: the pixel version of a shockwave. */
  function ring(ctx, x, y, r, col, thick) {
    x = Math.round(x); y = Math.round(y); r = Math.max(1, Math.round(r));
    thick = Math.max(1, Math.round(thick || 1));
    const c = Math.max(1, Math.round(r * 0.42));
    ctx.fillStyle = col;
    // top / bottom runs
    ctx.fillRect(x - r + c, y - r, (r - c) * 2 + 1, thick);
    ctx.fillRect(x - r + c, y + r - thick + 1, (r - c) * 2 + 1, thick);
    // left / right runs
    ctx.fillRect(x - r, y - r + c, thick, (r - c) * 2 + 1);
    ctx.fillRect(x + r - thick + 1, y - r + c, thick, (r - c) * 2 + 1);
    // stepped diagonals
    for (let i = 0; i < c; i++) {
      const px = x - r + i, py = y - r + c - i;
      ctx.fillRect(px, py, thick, thick);
      ctx.fillRect(x + r - i - thick + 1, py, thick, thick);
      ctx.fillRect(px, y + r - c + i, thick, thick);
      ctx.fillRect(x + r - i - thick + 1, y + r - c + i, thick, thick);
    }
  }

  /* Integer line, drawn as a run of blocks. */
  function line(ctx, x0, y0, x1, y1, col, thick) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    thick = Math.max(1, Math.round(thick || 1));
    ctx.fillStyle = col;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, guard = 0;
    for (;;) {
      ctx.fillRect(x0, y0, thick, thick);
      if ((x0 === x1 && y0 === y1) || ++guard > 4000) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  /* A quadratic sampled into integer segments, so wires and cables step. */
  function curve(ctx, x0, y0, cx, cy, x1, y1, col, thick, steps) {
    steps = steps || 14;
    let px = x0, py = y0;
    for (let i = 1; i <= steps; i++) {
      const f = i / steps, g = 1 - f;
      const x = g * g * x0 + 2 * g * f * cx + f * f * x1;
      const y = g * g * y0 + 2 * g * f * cy + f * f * y1;
      line(ctx, px, py, x, y, col, thick);
      px = x; py = y;
    }
  }

  /* A dotted stepped ellipse outline, for orbits. */
  function orbit(ctx, x, y, rx, ry, col, gap, alpha) {
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    gap = gap || 4;
    const n = Math.max(16, Math.round((rx + ry) * 0.7));
    for (let i = 0; i < n; i++) {
      if (i % gap > 1) continue;
      const a = i / n * Math.PI * 2;
      ctx.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1);
    }
    ctx.restore();
  }

  /* Banded radial falloff: concentric octagons instead of a soft gradient. */
  function glowBands(ctx, x, y, r, col, steps, peak) {
    steps = steps || 6;
    for (let i = steps; i >= 1; i--) {
      const f = i / steps;
      ctx.globalAlpha = (peak === undefined ? 0.5 : peak) * Math.pow(1 - f, 1.4);
      octPath(ctx, x, y, r * f);
      ctx.fillStyle = col;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function scanlines(ctx, x, y, w, h, col, phase, gap) {
    gap = gap || 4;
    ctx.fillStyle = col;
    for (let yy = Math.round(y) + (Math.floor(phase || 0) % gap); yy < y + h; yy += gap) ctx.fillRect(Math.round(x), yy, Math.round(w), 1);
  }

  /* Checkerboard dither between two shades: the classic way to fake a mid-tone.
     Painting it a pixel at a time costs tens of thousands of fills a frame, so
     the checker lives in a 2x2 tile and the whole patch is one repeat fill. */
  const patStore = new WeakMap();
  function ditherPat(ctx, col, odd) {
    let byCtx = patStore.get(ctx);
    if (!byCtx) { byCtx = {}; patStore.set(ctx, byCtx); }
    const key = col + (odd ? '|1' : '|0');
    let pat = byCtx[key];
    if (!pat) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 2;
      const c = cv.getContext('2d');
      c.fillStyle = col;
      if (odd) { c.fillRect(1, 0, 1, 1); c.fillRect(0, 1, 1, 1); }
      else { c.fillRect(0, 0, 1, 1); c.fillRect(1, 1, 1, 1); }
      pat = c.createPattern(cv, 'repeat');
      byCtx[key] = pat;
    }
    return pat;
  }
  function dither(ctx, x, y, w, h, col, odd) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (w <= 0 || h <= 0) return;
    ctx.fillStyle = ditherPat(ctx, col, odd);
    ctx.fillRect(x, y, w, h);
  }

  PD.pxd = { rect, plate, frame, oct, octPath, blob, ring, line, curve, orbit, glowBands, scanlines, dither };
})(window.PD);
