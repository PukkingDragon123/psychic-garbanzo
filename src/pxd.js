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

  /* A HARD-EDGED convex polygon. Canvas path fills are anti-aliased, which on
     a 45-degree edge leaves a row of half-lit pixels and makes the whole UI
     look soft. This scanline-fills instead: one whole-pixel run per row, so
     every shape in the game has a hard edge whatever angle it is cut at. */
  function poly(ctx, pts, col) {
    let y0 = 1e9, y1 = -1e9;
    for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    y0 = Math.floor(y0); y1 = Math.ceil(y1);
    ctx.fillStyle = col;
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      let lo = 1e9, hi = -1e9;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          const x = a[0] + (b[0] - a[0]) * (yc - a[1]) / (b[1] - a[1]);
          if (x < lo) lo = x;
          if (x > hi) hi = x;
        }
      }
      if (hi < lo) continue;
      const xa = Math.round(lo), xb = Math.round(hi);
      if (xb > xa) ctx.fillRect(xa, y, xb - xa, 1);
    }
  }

  /* Its outline, walked as integer runs rather than stroked. */
  function polyEdge(ctx, pts, col, w) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      line(ctx, a[0], a[1], b[0], b[1], col, w || 1);
    }
  }

  function octPts(x, y, r) {
    x = Math.round(x); y = Math.round(y); r = Math.max(2, Math.round(r));
    const c = Math.max(1, Math.round(r * 0.42));
    return [[x - r + c, y - r], [x + r - c, y - r], [x + r, y - r + c], [x + r, y + r - c],
      [x + r - c, y + r], [x - r + c, y + r], [x - r, y + r - c], [x - r, y - r + c]];
  }

  function hexPts(x, y, r) {
    x = Math.round(x); y = Math.round(y); r = Math.max(2, Math.round(r));
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 30);
      out.push([Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r)]);
    }
    return out;
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
    const pts = octPts(x, y, r);
    if (fill) poly(ctx, pts, fill);
    if (edge) polyEdge(ctx, pts, edge, lw);
  }

  /* A hexagon, the UI's other shape, drawn the same hard way. */
  function hex(ctx, x, y, r, fill, edge, lw) {
    const pts = hexPts(x, y, r);
    if (fill) poly(ctx, pts, fill);
    if (edge) polyEdge(ctx, pts, edge, lw);
  }

  /* A blob of solid pixels: a REAL disc, scanline-filled one whole row at a
     time. It used to be an octagon, on a rule that nothing in the game could
     be round; the rule cost every planet its roundness, so it is gone. Round
     but never smooth is the point -- each row is a run of whole pixels. */
  function blob(ctx, x, y, rx, ry, col) {
    x = Math.round(x); y = Math.round(y);
    rx = Math.max(1, Math.round(rx)); ry = Math.max(1, Math.round(ry));
    ctx.fillStyle = col;
    for (let j = -ry; j <= ry; j++) {
      const k = 1 - (j / (ry + 0.5)) * (j / (ry + 0.5));
      if (k <= 0) continue;
      const w = Math.round(rx * Math.sqrt(k));
      if (w <= 0) continue;
      ctx.fillRect(x - w, y + j, w * 2 + 1, 1);
    }
  }

  /* The same shape as an outline: a circle of whole pixels, for shockwaves.
     The old one walked an octagon and at any size over about forty pixels it
     read as a wireframe box rather than a blast. */
  function disc(ctx, x, y, r, col) { blob(ctx, x, y, r, r, col); }

  /* A ring of whole pixels: the difference between two discs, row by row. A
     real circle, and still never a smooth one. */
  function ring(ctx, x, y, r, col, thick) {
    x = Math.round(x); y = Math.round(y); r = Math.max(1, Math.round(r));
    thick = Math.max(1, Math.round(thick || 1));
    const ri = Math.max(0, r - thick);
    ctx.fillStyle = col;
    for (let j = -r; j <= r; j++) {
      const ko = 1 - (j / (r + 0.5)) * (j / (r + 0.5));
      if (ko <= 0) continue;
      const wo = Math.round(r * Math.sqrt(ko));
      const ki = ri > 0 ? 1 - (j / (ri + 0.5)) * (j / (ri + 0.5)) : -1;
      if (ki <= 0) { ctx.fillRect(x - wo, y + j, wo * 2 + 1, 1); continue; }
      const wi = Math.round(ri * Math.sqrt(ki));
      ctx.fillRect(x - wo, y + j, wo - wi, 1);
      ctx.fillRect(x + wi + 1, y + j, wo - wi, 1);
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

  /* A LIMB: a tapered tube of stamped blocks between two joints, with a dark
     rim and a lit side. Everything lands on whole units, so an arm can swing
     and stretch to any angle and still read as pixels rather than a smear.
     Coordinates are in whatever space the caller has scaled to -- the player
     draws limbs in sprite units so they match the density of his baked body. */
  function limb(ctx, x0, y0, x1, y1, w0, w1, col, light, dark) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.max(1, Math.hypot(dx, dy));
    const n = Math.max(1, Math.ceil(len));
    // perpendicular, for the highlight running down the lit side
    const px = -dy / len, py = dx / len;
    const pass = (grow, col2, ox, oy) => {
      if (!col2) return;
      ctx.fillStyle = col2;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const w = Math.round(w0 + (w1 - w0) * t) + grow;
        if (w <= 0) continue;
        const cx2 = Math.round(x0 + dx * t + ox), cy2 = Math.round(y0 + dy * t + oy);
        ctx.fillRect(cx2 - (w >> 1), cy2 - (w >> 1), w, w);
      }
    };
    pass(2, dark, 0, 0);
    pass(0, col, 0, 0);
    pass(-3, light, Math.round(px * 1.2), Math.round(py * 1.2));
  }

  /* A knuckle or knee: a small solid octagon that hides the seam between two
     limb segments. */
  function knob(ctx, x, y, r, col, light) {
    blob(ctx, x, y, r, r, col);
    if (light) blob(ctx, x - Math.max(1, r * 0.3), y - Math.max(1, r * 0.3), Math.max(1, r * 0.45), Math.max(1, r * 0.45), light);
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

  /* A dotted OCTAGON outline, for orbits. Eight straight runs, no ellipse. */
  function orbit(ctx, x, y, rx, ry, col, gap, alpha) {
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    gap = gap || 4;
    const cx2 = rx * 0.42, cy2 = ry * 0.42;
    const pts = [
      [-rx + cx2, -ry], [rx - cx2, -ry], [rx, -ry + cy2], [rx, ry - cy2],
      [rx - cx2, ry], [-rx + cx2, ry], [-rx, ry - cy2], [-rx, -ry + cy2]
    ];
    let k = 0;
    for (let i = 0; i < 8; i++) {
      const a = pts[i], b = pts[(i + 1) % 8];
      const steps = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
      for (let s2 = 0; s2 < steps; s2++, k++) {
        if (k % gap > 1) continue;
        const f = s2 / steps;
        ctx.fillRect(Math.round(x + a[0] + (b[0] - a[0]) * f), Math.round(y + a[1] + (b[1] - a[1]) * f), 1, 1);
      }
    }
    ctx.restore();
  }

  /* Banded radial falloff: concentric DISCS, stepped, instead of a soft
     gradient. Hard rings of light, which is what a glow looks like when it is
     made of pixels. */
  function glowBands(ctx, x, y, r, col, steps, peak) {
    steps = steps || 6;
    for (let i = steps; i >= 1; i--) {
      const f = i / steps;
      ctx.globalAlpha = (peak === undefined ? 0.5 : peak) * Math.pow(1 - f, 1.4);
      blob(ctx, x, y, r * f, r * f, col);
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

  PD.pxd = { rect, plate, frame, oct, octPath, octPts, hex, hexPts, poly, polyEdge, blob, disc, ring, line, limb, knob, curve, orbit, glowBands, scanlines, dither };
})(window.PD);
