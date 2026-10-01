/* PAINT: the art toolkit for everything drawn at high detail.
   The older sprites are painted into an array of colour strings one pixel at
   a time, which is fine for a forty-pixel alien and hopeless for a moon six
   hundred pixels across. This paints straight into an RGBA buffer instead,
   with the handful of tools detailed pixel art is actually made of:

     shaded shapes      a base colour, a lit edge, a shadowed edge, a gloss
     textured fills     value noise quantised into a ramp, dithered at the
                        boundaries so the bands break up instead of banding
     rim light          a bright line on the edge facing the light
     outlines           a dark cartoon line round whatever has been painted
     blends             for glass, water, glows and light pools

   Coordinates are buffer pixels (two to a logical pixel), colours are either
   '#rrggbb' strings or 0xrrggbb numbers. */
(function (PD) {
  'use strict';
  const U = PD.util;

  function hex(c) {
    if (typeof c === 'number') return c;
    if (!c) return -1;
    if (c[0] === '#') {
      if (c.length === 4) return parseInt(c[1] + c[1] + c[2] + c[2] + c[3] + c[3], 16);
      return parseInt(c.slice(1, 7), 16);
    }
    return -1;
  }
  function mul(c, k) {
    c = hex(c);
    const r = U.clamp(Math.round(((c >> 16) & 255) * k), 0, 255);
    const g = U.clamp(Math.round(((c >> 8) & 255) * k), 0, 255);
    const b = U.clamp(Math.round((c & 255) * k), 0, 255);
    return (r << 16) | (g << 8) | b;
  }
  function mix(a, b, t) {
    a = hex(a); b = hex(b);
    const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
    const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
    const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
    return (r << 16) | (g << 8) | bl;
  }
  function css(c) { c = hex(c); return '#' + ((1 << 24) | c).toString(16).slice(1); }
  // a three-step ramp off one colour: base, light, dark
  function ramp(c, up, down) { return [hex(c), mix(c, 0xffffff, up || 0.35), mul(c, down || 0.62)]; }

  const DITH4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayer(x, y) { return (DITH4[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }

  function Buf(w, h) {
    this.w = w | 0; this.h = h | 0;
    this.d = new Uint8ClampedArray(this.w * this.h * 4);
  }
  const B = Buf.prototype;
  B.set = function (x, y, c, a) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, d = this.d;
    if (c === null || c === undefined) { d[i + 3] = 0; return; }
    c = hex(c);
    if (a === undefined || a >= 1) {
      d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255;
      return;
    }
    if (a <= 0) return;
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    const oa = d[i + 3] / 255;
    const na = a + oa * (1 - a);
    if (na <= 0) return;
    d[i] = (r * a + d[i] * oa * (1 - a)) / na;
    d[i + 1] = (g * a + d[i + 1] * oa * (1 - a)) / na;
    d[i + 2] = (b * a + d[i + 2] * oa * (1 - a)) / na;
    d[i + 3] = na * 255;
  };
  B.get = function (x, y) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    const i = (y * this.w + x) * 4, d = this.d;
    if (d[i + 3] < 8) return -1;
    return (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
  };
  B.alpha = function (x, y) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  };
  B.rect = function (x, y, w, h, c, a) {
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w)), y1 = Math.min(this.h, Math.round(y + h));
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) this.set(i, j, c, a);
    return this;
  };
  B.ellipse = function (cx, cy, rx, ry, c, a) {
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(x, y, c, a);
    }
    return this;
  };
  B.disc = function (cx, cy, r, c, a) { return this.ellipse(cx, cy, r, r, c, a); };
  B.round = function (x, y, w, h, r, c, a) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const px = i < r ? r - i - 0.5 : (i >= w - r ? i - (w - r) + 0.5 : 0);
      const py = j < r ? r - j - 0.5 : (j >= h - r ? j - (h - r) + 0.5 : 0);
      if (px * px + py * py > r * r) continue;
      this.set(x + i, y + j, c, a);
    }
    return this;
  };
  // scanline fill of any polygon
  B.poly = function (pts, c, a) {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const xs = [], yy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        if ((p[1] <= yy && q[1] > yy) || (q[1] <= yy && p[1] > yy)) xs.push(p[0] + (yy - p[1]) / (q[1] - p[1]) * (q[0] - p[0]));
      }
      xs.sort((m, n) => m - n);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c, a);
    }
    return this;
  };
  B.line = function (x0, y0, x1, y1, c, w, a) {
    w = w || 1;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) {
      const q = i / n;
      const x = Math.round(x0 + (x1 - x0) * q - w / 2), y = Math.round(y0 + (y1 - y0) * q - w / 2);
      this.rect(x, y, w, w, c, a);
    }
    return this;
  };
  /* A shaded ball: dark rim bottom right, the colour, a soft light top left,
     and optionally a hard gloss spot. C is [base, light, dark]. */
  B.ball = function (cx, cy, rx, ry, C, gloss) {
    C = C.length ? C : ramp(C);
    this.ellipse(cx, cy, rx, ry, C[2]);
    this.ellipse(cx - rx * 0.08, cy - ry * 0.1, rx * 0.9, ry * 0.88, C[0]);
    this.ellipse(cx - rx * 0.34, cy - ry * 0.38, rx * 0.36, ry * 0.28, C[1]);
    if (gloss) this.ellipse(cx - rx * 0.5, cy - ry * 0.52, Math.max(1, rx * 0.12), Math.max(1, ry * 0.1), 0xffffff);
    return this;
  };
  /* A box that reads as a solid: a light top face, a front, a shadowed side. */
  B.block = function (x, y, w, h, C, top, side) {
    C = C.length ? C : ramp(C);
    top = top === undefined ? Math.max(2, Math.round(h * 0.18)) : top;
    side = side || 0;
    this.rect(x, y + top, w, h - top, C[0]);
    this.rect(x, y, w, top, C[1]);
    if (side) this.rect(x + w - side, y + top, side, h - top, C[2]);
    this.rect(x, y + h - 2, w, 2, C[2]);
    return this;
  };
  /* Fill a region with a noise texture quantised into a colour ramp, dithered
     where the value falls between two steps. `inside(x, y)` masks it. */
  B.texture = function (x, y, w, h, cols, scale, seed, inside) {
    const n = cols.length;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const px = x + i, py = y + j;
      if (inside && !inside(px, py)) continue;
      const v = U.fbm(px / scale + seed * 7.3, py / scale + seed * 3.1, 3);
      const f = U.clamp(v, 0, 0.9999) * n;
      let k = Math.floor(f);
      if (f - k > bayer(px, py) * 0.9 + 0.05) k = Math.min(n - 1, k + 1);
      this.set(px, py, cols[U.clamp(k, 0, n - 1)]);
    }
    return this;
  };
  /* HAND SHADING. The three brushes the soft things are painted with: a lit
     egg, a lit tube and a lit ring. Each pixel works out which way it faces,
     lights itself from the top left, and picks a tone out of a five-step
     ramp [deepest, shadow, base, light, highlight] with an ordered dither
     between steps, then gets a bounce of reflected light on the shadow edge
     and a hard specular glint. It is how you shade by hand, done per pixel. */
  function tone(P, v, x, y) {
    const n = P.length, f = Math.max(0, Math.min(0.9999, v)) * n;
    let k = Math.floor(f);
    if (f - k > bayer(x, y) * 0.85 + 0.08) k = Math.min(n - 1, k + 1);
    return P[k];
  }
  const LX = -0.55, LY = -0.62, LZ = 0.56;          // the light, top left and in front
  function lit(nx, ny, nz, o) {
    let d = nx * LX + ny * LY + nz * LZ;
    d = 0.1 + 0.84 * Math.max(0, (d + 0.3) / 1.3);
    // the bounce: light coming back up off the floor into the shadow edge
    const rim = Math.max(0, (nx * 0.5 + ny * 0.8) - 0.55) * (o && o.bounce !== undefined ? o.bounce : 0.9);
    return Math.min(1, d * 0.92 + rim * 0.35);
  }
  B.orb = function (cx, cy, rx, ry, P, o) {
    o = o || {};
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1), y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      if (o.clip && !o.clip(x, y)) continue;
      const nz = Math.sqrt(1 - r2);
      this.set(x, y, tone(P, lit(nx, ny, nz, o), x, y), o.alpha);
    }
    if (o.spec !== false) {
      const sx = cx - rx * 0.42, sy = cy - ry * 0.48;
      this.ellipse(sx, sy, Math.max(1, rx * 0.16), Math.max(1, ry * 0.11), 0xffffff, 0.9);
      this.ellipse(sx + rx * 0.22, sy - ry * 0.02, Math.max(0.8, rx * 0.05), Math.max(0.8, ry * 0.05), 0xffffff, 0.8);
    }
    return this;
  };
  // a tube along a quadratic curve a -> c (via b), radius r0 at a to r1 at c
  B.tube = function (ax, ay, bx, by, qx, qy, r0, r1, P, o) {
    o = o || {};
    const N = Math.max(8, Math.ceil(Math.hypot(qx - ax, qy - ay) * 1.5));
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      pts.push([u * u * ax + 2 * u * t * bx + t * t * qx, u * u * ay + 2 * u * t * by + t * t * qy, r0 + (r1 - r0) * t]);
    }
    let X0 = 1e9, Y0 = 1e9, X1 = -1e9, Y1 = -1e9;
    for (const p of pts) { X0 = Math.min(X0, p[0] - p[2]); Y0 = Math.min(Y0, p[1] - p[2]); X1 = Math.max(X1, p[0] + p[2]); Y1 = Math.max(Y1, p[1] + p[2]); }
    for (let y = Math.floor(Y0) - 1; y <= Math.ceil(Y1) + 1; y++) for (let x = Math.floor(X0) - 1; x <= Math.ceil(X1) + 1; x++) {
      let best = 1e9, bi = 0;
      for (let i = 0; i < pts.length; i++) { const d = Math.hypot(x + 0.5 - pts[i][0], y + 0.5 - pts[i][1]) - pts[i][2]; if (d < best) { best = d; bi = i; } }
      if (best > 0) continue;
      const p = pts[bi], r = p[2];
      const nx = (x + 0.5 - p[0]) / r, ny = (y + 0.5 - p[1]) / r, r2 = Math.min(1, nx * nx + ny * ny);
      this.set(x, y, tone(P, lit(nx, ny, Math.sqrt(1 - r2), o), x, y), o.alpha);
    }
    if (o.spec !== false) for (let i = 2; i < pts.length - 2; i += 2) { const p = pts[i]; this.set(p[0] - p[2] * 0.45, p[1] - p[2] * 0.5, 0xffffff, 0.7); }
    return this;
  };
  // a ring lying flat, seen from a little above: ring radius R, tube radius
  // r, sq = the sine of the view angle. o.top: a ramp for the upper surface
  // (icing on a donut). Returns nothing useful; paints the visible surface.
  B.torus = function (cx, cy, R, r, sq, P, o) {
    o = o || {};
    const ca = Math.sqrt(1 - sq * sq);
    const X0 = Math.floor(cx - R - r - 1), X1 = Math.ceil(cx + R + r + 1);
    const Y0 = Math.floor(cy - (R + r) * sq - r * ca - 1), Y1 = Math.ceil(cy + (R + r) * sq + r * ca + 1);
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      const X = x + 0.5 - cx, up = cy - (y + 0.5);
      let n = null;
      for (let h = r; h >= -r; h -= 0.35) {
        const Z = (up - h * ca) / sq;
        const d = Math.hypot(X, Z), q = Math.hypot(d - R, h);
        if (q <= r) { const k = (d - R) / r / (d || 1); n = [X * k, Z * k, h / r]; break; }
      }
      if (!n) continue;
      const nzs = -n[1] * ca + n[2] * sq, nys = -(n[1] * sq + n[2] * ca);
      const L = Math.hypot(n[0], nys, nzs) || 1;
      const pal = o.top && n[2] > (o.topAt === undefined ? 0.15 : o.topAt) ? o.top : P;
      this.set(x, y, tone(pal, lit(n[0] / L, nys / L, Math.max(0, nzs / L), o), x, y));
    }
    if (o.spec !== false) {
      this.ellipse(cx - R * 0.62, cy + R * sq * 0.55 - r * ca * 0.75, Math.max(1, r * 0.34), Math.max(1, r * 0.2), 0xffffff, 0.9);
      this.ellipse(cx - R * 0.2, cy + R * sq * 0.92 - r * ca * 0.7, Math.max(1, r * 0.16), Math.max(0.8, r * 0.12), 0xffffff, 0.75);
    }
    return this;
  };
  /* The shadow side of the silhouette: painted pixels whose neighbour down
     and right is empty get darkened, so a flat colour turns into a form. */
  B.shadeEdge = function (k, depth) {
    depth = depth || 2;
    const W = this.w, H = this.h, d = this.d, hit = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (this.alpha(x, y) < 128) continue;
      for (let s = 1; s <= depth; s++) if (this.alpha(x + s, y + s) < 128) { hit.push(x, y, s); break; }
    }
    for (let i = 0; i < hit.length; i += 3) {
      const j = (hit[i + 1] * W + hit[i]) * 4, f = 1 - k * (1 - (hit[i + 2] - 1) / depth);
      d[j] *= f; d[j + 1] *= f; d[j + 2] *= f;
    }
    return this;
  };
  /* Light the edges that face the light: any painted pixel whose neighbour
     at (dx, dy) is empty gets `c`. */
  B.rim = function (c, dx, dy, a) {
    const hit = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.alpha(x, y) < 128) continue;
      if (this.alpha(x + dx, y + dy) < 128) hit.push(x, y);
    }
    for (let i = 0; i < hit.length; i += 2) this.set(hit[i], hit[i + 1], c, a);
    return this;
  };
  B.outline = function (c) {
    const hit = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.alpha(x, y) >= 128) continue;
      if (this.alpha(x - 1, y) >= 128 || this.alpha(x + 1, y) >= 128 || this.alpha(x, y - 1) >= 128 || this.alpha(x, y + 1) >= 128) hit.push(x, y);
    }
    for (let i = 0; i < hit.length; i += 2) this.set(hit[i], hit[i + 1], c);
    return this;
  };
  // darken everything painted by a vertical gradient: a soft shadow at the base
  B.grade = function (y0, y1, k) {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y++) {
      const f = 1 - (y - y0) / Math.max(1, y1 - y0) * (1 - k);
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4;
        if (!this.d[i + 3]) continue;
        this.d[i] *= f; this.d[i + 1] *= f; this.d[i + 2] *= f;
      }
    }
    return this;
  };
  B.toCanvas = function () {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const q = cv.getContext('2d');
    const id = q.createImageData(this.w, this.h);
    id.data.set(this.d);
    q.putImageData(id, 0, 0);
    return cv;
  };

  /* ------------------------------------------------------------ runtime */
  // a soft light pool, drawn with a radial gradient: for lamps, glows, windows
  function glow(ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = hex(col);
    const rgb = ((c >> 16) & 255) + ',' + ((c >> 8) & 255) + ',' + (c & 255);
    g.addColorStop(0, 'rgba(' + rgb + ',' + (a === undefined ? 0.5 : a) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function rgba(col, a) {
    const c = hex(col);
    return 'rgba(' + ((c >> 16) & 255) + ',' + ((c >> 8) & 255) + ',' + (c & 255) + ',' + a + ')';
  }
  // a sprite (canvas painted at HD) drawn at logical size, foot at (x, y)
  function sprite(ctx, cv, x, y, ox, oy, flip, sx, sy) {
    const w = cv.width / 2, h = cv.height / 2;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale((flip ? -1 : 1) * (sx || 1), sy || 1);
    ctx.drawImage(cv, -(ox === undefined ? w / 2 : ox), -(oy === undefined ? h : oy), w, h);
    ctx.restore();
  }

  /* THE CARTOON LINE. Whatever fn draws inside the box (x, y, w, h, in the
     context's own units) is drawn off to the side first, then stamped back
     with a fat ink silhouette round the outside of it, so a character made of
     a body sprite, live limbs, a hat and a cape gets ONE continuous outline,
     the way a cel is inked. Works under any transform the context has. */
  const INKC = { a: null, b: null };
  function inked(ctx, x, y, w, h, fn, col) {
    const m = ctx.getTransform();
    const sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
    // the box in device pixels, with room for the line
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f]);
    const th = Math.max(1, Math.round(sc * 0.5));
    const X0 = Math.floor(Math.min(...pts.map(p => p[0]))) - th - 1, Y0 = Math.floor(Math.min(...pts.map(p => p[1]))) - th - 1;
    const X1 = Math.ceil(Math.max(...pts.map(p => p[0]))) + th + 1, Y1 = Math.ceil(Math.max(...pts.map(p => p[1]))) + th + 1;
    const W = X1 - X0, H = Y1 - Y0;
    if (W <= 0 || H <= 0 || W > 2000 || H > 2000) { fn(ctx); return; }
    if (!INKC.a) { INKC.a = document.createElement('canvas'); INKC.b = document.createElement('canvas'); }
    const A = INKC.a, Bc = INKC.b;
    if (A.width < W || A.height < H) { A.width = Bc.width = Math.max(A.width, W); A.height = Bc.height = Math.max(A.height, H); }
    const qa = A.getContext('2d'), qb = Bc.getContext('2d');
    qa.setTransform(1, 0, 0, 1, 0, 0); qa.clearRect(0, 0, W, H);
    qa.imageSmoothingEnabled = false;
    qa.setTransform(m.a, m.b, m.c, m.d, m.e - X0, m.f - Y0);
    qa.globalAlpha = ctx.globalAlpha;
    fn(qa);
    qa.setTransform(1, 0, 0, 1, 0, 0); qa.globalAlpha = 1;
    // the silhouette, in ink
    qb.setTransform(1, 0, 0, 1, 0, 0); qb.clearRect(0, 0, W, H);
    qb.globalCompositeOperation = 'source-over';
    qb.drawImage(A, 0, 0, W, H, 0, 0, W, H);
    qb.globalCompositeOperation = 'source-in';
    qb.fillStyle = col || '#0b0612'; qb.fillRect(0, 0, W, H);
    qb.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    for (let dy = -th; dy <= th; dy++) for (let dx = -th; dx <= th; dx++) {
      if (!dx && !dy) continue;
      if (Math.abs(dx) === th && Math.abs(dy) === th && th > 1) continue;
      ctx.drawImage(Bc, 0, 0, W, H, X0 + dx, Y0 + dy, W, H);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(A, 0, 0, W, H, X0, Y0, W, H);
    ctx.restore();
  }

  PD.paint = { buf: (w, h) => new Buf(w, h), Buf, hex, mul, mix, css, ramp, bayer, glow, rgba, sprite, inked };
})(window.PD);
