/* A tiny pixel-pushing helper.
   Sprites are painted at their true pixel size with hard-edged primitives, then
   `outline()` traces a dark border around everything -- which is what gives the
   whole game its chunky cartoon look for free. */
(function (PD) {
  'use strict';

  function Pix(w, h) {
    this.w = w; this.h = h;
    this.d = new Array(w * h).fill(null);
  }

  Pix.prototype.idx = function (x, y) { return y * this.w + x; };

  Pix.prototype.set = function (x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.d[y * this.w + x] = c;
    return this;
  };

  Pix.prototype.get = function (x, y) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.d[y * this.w + x];
  };

  Pix.prototype.rect = function (x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  };

  Pix.prototype.ellipse = function (cx, cy, rx, ry, c) {
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  };

  Pix.prototype.disc = function (cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); };

  /* Rounded rectangle -- corners are simply clipped by a distance test. */
  Pix.prototype.round = function (x, y, w, h, r, c) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const px = i < r ? r - i - 0.5 : (i >= w - r ? i - (w - r) + 0.5 : 0);
        const py = j < r ? r - j - 0.5 : (j >= h - r ? j - (h - r) + 0.5 : 0);
        if (px * px + py * py > r * r) continue;
        this.set(x + i, y + j, c);
      }
    }
    return this;
  };

  Pix.prototype.line = function (x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return this;
  };

  /* Isoceles triangle pointing up (dir -1) or down (dir 1). */
  Pix.prototype.spike = function (x, y, w, h, dir, c) {
    for (let j = 0; j < h; j++) {
      const t = j / h;
      const half = Math.max(0, (w / 2) * (1 - t));
      const yy = dir > 0 ? y + j : y + h - 1 - j;
      for (let i = -half; i <= half; i++) this.set(x + i, yy, c);
    }
    return this;
  };

  /* Mirror the left half onto the right half -- keeps faces symmetrical. */
  Pix.prototype.mirrorX = function () {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w / 2; x++) {
        this.set(this.w - 1 - x, y, this.get(x, y));
      }
    }
    return this;
  };

  Pix.prototype.replace = function (from, to) {
    for (let i = 0; i < this.d.length; i++) if (this.d[i] === from) this.d[i] = to;
    return this;
  };

  /* Trace a border around every filled pixel. */
  Pix.prototype.outline = function (c) {
    const snap = this.d.slice();
    const at = (x, y) => (x < 0 || y < 0 || x >= this.w || y >= this.h) ? null : snap[y * this.w + x];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (at(x, y)) continue;
        if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) this.set(x, y, c);
      }
    }
    return this;
  };

  /* Darken the lower-right facing pixels of a colour to fake a light source. */
  Pix.prototype.shade = function (from, to, dx, dy) {
    const snap = this.d.slice();
    const at = (x, y) => (x < 0 || y < 0 || x >= this.w || y >= this.h) ? null : snap[y * this.w + x];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (at(x, y) !== from) continue;
        const n = at(x + dx, y + dy);
        if (n === null || n !== from) this.set(x, y, to);
      }
    }
    return this;
  };

  Pix.prototype.toCanvas = function () {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.d[y * this.w + x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  };

  PD.Pix = Pix;
  PD.pix = (w, h) => new Pix(w, h);
})(window.PD);
