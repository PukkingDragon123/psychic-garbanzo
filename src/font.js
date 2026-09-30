/* A 5x7 bitmap font, drawn pixel by pixel and cached per colour so the HUD
   stays as crunchy as the rest of the game. */
(function (PD) {
  'use strict';

  const G = {
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    'G': ['.###.', '#...#', '#....', '#..##', '#...#', '#...#', '.###.'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'I': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    'J': ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
    'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '#####'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    '4': ['#...#', '#...#', '#...#', '#####', '....#', '....#', '....#'],
    '5': ['#####', '#....', '#....', '####.', '....#', '....#', '####.'],
    '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
    '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
    ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
    ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
    '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
    '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    '%': ['#...#', '...#.', '...#.', '..#..', '.#...', '.#...', '#...#'],
    '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
    '&': ['.##..', '#..#.', '.##..', '.#...', '#.#.#', '#..#.', '.##.#'],
    '(': ['..##.', '.#...', '#....', '#....', '#....', '.#...', '..##.'],
    ')': ['.##..', '...#.', '....#', '....#', '....#', '...#.', '.##..'],
    '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
    ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
    "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
    '<': ['....#', '...#.', '..#..', '.#...', '..#..', '...#.', '....#'],
    '>': ['#....', '.#...', '..#..', '...#.', '..#..', '.#...', '#....'],
    '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
    '#': ['.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.....', '.....'],
    '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
    '|': ['..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..']
  };

  const GW = 5, GH = 7, GAP = 1;

  /* The 5x7 table is only the skeleton. Each glyph is blown up with EPX
     (once for small text, twice for big) so diagonals and bowls come out as
     smooth hand-set curves at the screen's real 2x density, then baked with a
     one-pixel ink outline and a drop shadow like a sticker. Same metrics as
     the old font, so nothing has to move. */
  function epx(src, w, h) {
    const W = w * 2, H = h * 2, o = new Uint8Array(W * H);
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[y * w + x];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
        let p1 = P, p2 = P, p3 = P, p4 = P;
        // only ever add ink: square corners stay square, so D is not O
        if (C === A && C !== D && A !== B) p1 |= A;
        if (A === B && A !== C && B !== D) p2 |= B;
        if (D === C && D !== B && C !== A) p3 |= C;
        if (B === D && B !== A && D !== C) p4 |= D;
        const i = (y * 2) * W + x * 2;
        o[i] = p1; o[i + 1] = p2; o[i + W] = p3; o[i + W + 1] = p4;
      }
    }
    return o;
  }
  const masks = {};   // ch + d -> Uint8Array at d x density
  function maskOf(ch, d) {
    const key = ch + d;
    if (masks[key]) return masks[key];
    const rows = G[ch] || G['?'];
    let m = new Uint8Array(GW * GH), w = GW, h = GH;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) m[y * GW + x] = rows[y][x] === '#' ? 1 : 0;
    for (let k = 1; k < d; k *= 2) { m = epx(m, w, h); w *= 2; h *= 2; }
    return (masks[key] = m);
  }

  const cache = {};   // colour|shadow|d -> { char: canvas }
  function glyph(ch, color, sh, d) {
    const key = color + '|' + (sh || '') + '|' + d;
    let byColor = cache[key];
    if (!byColor) byColor = cache[key] = {};
    if (byColor[ch]) return byColor[ch];
    const m = maskOf(ch, d), w = GW * d, h = GH * d;
    const dr = sh ? Math.max(1, d / 2) : 0;
    const cv = document.createElement('canvas');
    cv.width = w + 2; cv.height = h + 2 + dr;
    const c = cv.getContext('2d');
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x];
    if (sh) {
      // ink: every pixel that touches the letter, then the same again, lower
      c.fillStyle = sh;
      for (let y = -1; y <= h; y++) {
        for (let x = -1; x <= w; x++) {
          if (on(x, y)) continue;
          if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1) ||
              on(x - 1, y - 1) || on(x + 1, y - 1) || on(x - 1, y + 1) || on(x + 1, y + 1)) {
            c.fillRect(x + 1, y + 1, 1, 1);
            c.fillRect(x + 1, y + 1 + dr, 1, 1);
          }
        }
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) c.fillRect(x + 1, y + 1 + dr, 1, 1);
    }
    c.fillStyle = color;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) c.fillRect(x + 1, y + 1, 1, 1);
    if (sh) {
      // a little shade on the lower third and a glint on top, like enamel
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(40,16,0,0.2)';
      c.fillRect(1, 1 + Math.round(h * 0.62), w, h);
      if (d >= 4) { c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(1, 1, w, Math.max(1, d / 2)); }
      c.globalCompositeOperation = 'source-over';
      // the shade must not creep onto the ink
      c.fillStyle = sh;
      for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
        if (on(x, y)) continue;
        if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1) || on(x - 1, y - 1) || on(x + 1, y - 1) || on(x - 1, y + 1) || on(x + 1, y + 1)) c.fillRect(x + 1, y + 1, 1, 1);
      }
    }
    byColor[ch] = cv;
    return cv;
  }
  // detail: glyph pixels per logical pixel of text, so it lands on whole screen pixels
  const detail = s => (s >= 2 && Math.round(s) % 2 === 0) ? 4 : 2;

  function width(str, scale) {
    scale = scale || 1;
    return str.length * (GW + GAP) * scale - GAP * scale;
  }

  /* opts: { scale, center, right, shadow, alpha } */
  function draw(ctx, str, x, y, color, opts) {
    opts = opts || {};
    const s = opts.scale || 1;
    str = String(str).toUpperCase();
    let px = Math.round(x);
    if (opts.center) px = Math.round(x - width(str, s) / 2);
    else if (opts.right) px = Math.round(x - width(str, s));
    const py = Math.round(y);
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    const d = detail(s);
    const sh = opts.shadow === false ? null : (typeof opts.shadow === 'string' ? opts.shadow : '#150c28');
    const u = s / d;                       // logical size of one glyph pixel
    let cx = px;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch !== ' ') {
        const cv = glyph(ch, color, sh, d);
        ctx.drawImage(cv, 0, 0, cv.width, cv.height, cx - u, py - u, cv.width * u, cv.height * u);
      }
      cx += (GW + GAP) * s;
    }
    if (opts.alpha !== undefined) ctx.globalAlpha = 1;
    return px;
  }

  PD.font = { draw, width, GW, GH, GAP, lineHeight: s => (GH + 3) * (s || 1) };
})(window.PD);
