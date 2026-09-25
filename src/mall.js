/* THE MALL.
   The market deck used to be a row of identical lit boxes with a word over
   each one. It is a row of SHOPS now: every one has a name and a logo on the
   fascia, a glass front you can see into, a back wall with shelves on it and
   stock on the shelves, a counter, furniture, posters stuck to the inside of
   the window, a glass door with an OPEN sign, and somebody behind the till
   who looks up when you walk past.

   Each shop is painted once, at double resolution, into three layers:
     BACK  the room behind the counter -- walls, shelves, stock, lights
     MID   the counter and the furniture in front of whoever works there
     TOP   the frame, the fascia, the logo, the posters and the door
   and in between them, live, go the shopkeeper and the glass -- the glass
   carries a reflection that slides as the camera moves, which is most of
   what makes it read as glass rather than as a hole in the wall. */
(function (PD) {
  'use strict';

  const X = PD.pxd;
  const F = PD.font;
  const AH = PD.arthome;
  const HD = 2;
  const SH = 64;                       // a shopfront is this tall, logical
  const INK = '#0a0612';

  /* The shops. `id` ties one to a stall that actually sells you something;
     the rest are there because a market with four shops in it is a car park. */
  const SHOPS = [
    { key: 'noodle', deck: 1, x: 180, w: 96, sign: 'NOODLE HOLE', keeper: 'BAO', door: 1,
      brand: '#ff5a3c', dark: '#5e1a10', wall: '#3a1c14', wall2: '#52261a', glow: '#ffb070',
      posters: ['bowl', 'face'], line: 'SLURP RESPONSIBLY' },
    { key: 'air', id: 'lungs', deck: 1, x: 300, w: 104, sign: 'BREATH & CO', keeper: 'ORBIT', door: -1,
      brand: '#38e8ff', dark: '#0c3a4a', wall: '#12303c', wall2: '#1a4452', glow: '#7ef9ff',
      posters: ['lung', 'sale'], line: 'SECOND-HAND LUNGS. LIKE NEW.' },
    { key: 'grab', id: 'grip', deck: 1, x: 430, w: 104, sign: 'GRAB HOUSE', keeper: 'BRUNO', door: 1,
      brand: '#ffc44d', dark: '#5a3e0c', wall: '#2e2a1c', wall2: '#3e3824', glow: '#ffd88a',
      posters: ['magnet', 'star'], line: 'IF IT IS METAL IT IS YOURS' },
    { key: 'fence', id: 'fence', deck: 1, x: 560, w: 104, sign: 'THE FENCE', keeper: 'KORVO', door: -1,
      brand: '#b08aff', dark: '#2e1a52', wall: '#241a30', wall2: '#30243e', glow: '#c9a8ff',
      posters: ['cash', 'nocop'], line: 'WE BUY ANYTHING. WE ASK NOTHING.' },
    { key: 'hat', deck: 1, x: 700, w: 96, sign: 'HAT TRICK', keeper: 'MOCHI', door: 1,
      brand: '#ff7ac4', dark: '#5a1a40', wall: '#34182a', wall2: '#48223a', glow: '#ffb0dc',
      posters: ['hat', 'face'], line: 'A HAT FOR EVERY HEAD. MOST HEADS.' },
    { key: 'ore', deck: 1, x: 900, w: 96, sign: 'ORE & MORE', keeper: 'UNIT 12', door: -1,
      brand: '#7dffda', dark: '#0e4a3c', wall: '#122a2a', wall2: '#1a3a38', glow: '#a8fff0',
      posters: ['gem', 'planet'], line: 'CUT, POLISHED, MOSTLY LEGAL' },
    { key: 'cafe', deck: 1, x: 1000, w: 96, sign: 'BEAN THERE', keeper: 'BEANIE', door: 1,
      brand: '#e8b070', dark: '#4a2a14', wall: '#3a2818', wall2: '#523a22', glow: '#ffd8a0',
      posters: ['cup', 'bean'], line: 'COFFEE. OR SOMETHING LIKE IT.' },
    { key: 'plant', deck: 1, x: 1130, w: 96, sign: 'LEAF ME BE', keeper: 'BIRCH', door: -1,
      brand: '#7dff9a', dark: '#164a26', wall: '#1a3020', wall2: '#22402a', glow: '#b8ffc4',
      posters: ['leaf', 'sun'], line: 'THEY DO NOT BITE. MOSTLY.' },
    { key: 'stamp', id: 'papers', deck: 2, x: 430, w: 104, sign: 'STAMP IT', keeper: 'SAL', door: 1,
      brand: '#e8dcb0', dark: '#3a3424', wall: '#2c2a24', wall2: '#3a3830', glow: '#fff0c0',
      posters: ['stamp', 'queue'], line: 'PLEASE TAKE A NUMBER' }
  ];

  /* ------------------------------------------------------------- helpers
     Everything below is in PAINT pixels -- two to a screen pixel. */
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function shelf(p, x0, x1, y, c) {
    p.rect(x0, y, x1 - x0, 2, c); p.rect(x0, y + 2, x1 - x0, 1, shade(c, 0.55));
    p.rect(x0 + 2, y + 3, 1, 3, shade(c, 0.55)); p.rect(x1 - 3, y + 3, 1, 3, shade(c, 0.55));
  }
  function jar(p, x, y, c, lid) {
    p.round(x, y + 2, 8, 10, 2, 'rgba(200,240,255,0.35)');
    p.round(x + 1, y + 5, 6, 6, 2, c);
    p.rect(x + 2, y + 6, 1, 3, shade(c, 1.5));
    p.rect(x + 1, y, 6, 2, lid || '#8a8a9a');
  }
  function tank(p, x, y, h, c) {
    p.round(x, y, 8, h, 3, c);
    p.rect(x + 1, y + 3, 2, h - 6, shade(c, 1.45));
    p.rect(x + 6, y + 3, 1, h - 6, shade(c, 0.6));
    p.rect(x + 2, y - 3, 4, 3, '#8a96a8'); p.rect(x + 3, y - 5, 2, 2, '#c8d0dc');
    p.rect(x, y + h - 9, 8, 2, '#ffffff');
  }
  function lungs(p, x, y, s, c) {
    p.rect(x - 1, y - 6 * s, 2, 6 * s, '#e8c0c8');
    p.ellipse(x - 4 * s, y + 3 * s, 3.4 * s, 5 * s, c);
    p.ellipse(x + 4 * s, y + 3 * s, 3.4 * s, 5 * s, c);
    p.rect(x - 5 * s, y + 1 * s, 1, 3 * s, shade(c, 1.35));
    p.rect(x + 3 * s, y + 1 * s, 1, 3 * s, shade(c, 1.35));
  }
  function magnet(p, x, y, s) {
    p.ellipse(x, y, 6 * s, 6 * s, '#d8343a');
    p.ellipse(x, y, 3 * s, 3 * s, null);
    p.rect(x - 6 * s, y, 12 * s, 7 * s, null);
    p.rect(x - 6 * s, y, 3 * s, 5 * s, '#d8343a');
    p.rect(x + 3 * s, y, 3 * s, 5 * s, '#d8343a');
    p.rect(x - 6 * s, y + 5 * s, 3 * s, 2 * s, '#dce4ec');
    p.rect(x + 3 * s, y + 5 * s, 3 * s, 2 * s, '#dce4ec');
    p.rect(x - 5 * s, y - 3 * s, 1, 2 * s, '#ff8a8a');
  }
  function glove(p, x, y, c) {
    p.round(x, y + 4, 8, 8, 2, c);
    for (let i = 0; i < 3; i++) p.rect(x + i * 2 + 1, y, 2, 5, c);
    p.rect(x - 2, y + 6, 3, 2, c);
    p.rect(x, y + 10, 8, 2, shade(c, 0.6));
  }
  function hat(p, kind, x, y, c) {
    if (kind === 0) {                      // top hat
      p.rect(x - 6, y + 10, 13, 2, c); p.rect(x - 4, y, 9, 11, c);
      p.rect(x - 4, y + 7, 9, 2, '#ff5a8a'); p.rect(x - 3, y + 1, 1, 6, shade(c, 1.6));
    } else if (kind === 1) {               // bowler
      p.rect(x - 7, y + 9, 15, 2, c); p.ellipse(x, y + 8, 5, 6, c);
      p.rect(x - 5, y + 8, 11, 1, '#d8b060');
    } else if (kind === 2) {               // cap
      p.ellipse(x, y + 8, 6, 4, c); p.rect(x - 6, y + 8, 12, 2, c);
      p.rect(x + 3, y + 9, 7, 2, shade(c, 0.7)); p.rect(x - 1, y + 4, 2, 1, '#ffffff');
    } else if (kind === 3) {               // witch
      p.rect(x - 7, y + 10, 15, 2, c);
      p.spike(x, y - 2, 9, 12, -1, c);
      p.rect(x - 4, y + 7, 9, 2, '#ffd34d');
    } else {                               // beret
      p.ellipse(x, y + 8, 7, 3, c); p.rect(x, y + 3, 1, 3, c);
    }
  }
  function gem(p, x, y, r, c) {
    p.spike(x, y - r * 0.4, r * 2 + 1, r * 0.6, -1, shade(c, 1.3));
    p.spike(x, y, r * 2 + 1, r * 1.4, 1, c);
    p.rect(x - r, y - 1, r * 2 + 1, 1, shade(c, 1.6));
    p.rect(x - 1, y + 1, 1, r * 0.8, shade(c, 0.6));
  }
  function potPlant(p, x, y, s, leaf, pot) {
    // a pot and a spray of leaves, s is how big
    for (let i = 0; i < 5 + s; i++) {
      const a = -Math.PI / 2 + (i - (4 + s) / 2) * 0.42;
      const L = 5 + s * 2 + (i % 2) * 3;
      p.ellipse(x + Math.cos(a) * L * 0.8, y - 3 + Math.sin(a) * L, 2 + s * 0.4, 3 + s * 0.5, i % 2 ? leaf : shade(leaf, 0.75));
    }
    p.round(x - 3 - s, y - 2, 7 + s * 2, 6 + s, 1, pot);
    p.rect(x - 4 - s, y - 3, 9 + s * 2, 2, shade(pot, 1.25));
  }
  function stool(p, x, y, c) {
    p.round(x - 4, y, 9, 3, 1, c); p.rect(x - 4, y + 1, 9, 1, shade(c, 1.4));
    p.rect(x, y + 3, 1, 7, '#8a8a9a'); p.rect(x - 3, y + 10, 7, 1, '#8a8a9a');
  }
  function chair(p, x, y, c, flip) {
    p.rect(x - 3, y, 7, 2, c); p.rect(x + (flip ? 3 : -3), y - 7, 1, 7, c);
    p.rect(x - 3, y + 2, 1, 6, shade(c, 0.6)); p.rect(x + 3, y + 2, 1, 6, shade(c, 0.6));
  }
  function counter(p, x, y, w, h, top, face) {
    p.rect(x, y, w, h, face);
    p.rect(x - 2, y - 3, w + 4, 3, top);
    p.rect(x - 2, y - 3, w + 4, 1, shade(top, 1.4));
    p.rect(x, y, w, 1, shade(face, 0.55));
    for (let i = 6; i < w - 3; i += 10) p.rect(x + i, y + 3, 1, h - 5, shade(face, 0.75));
  }
  function register(p, x, y) {
    p.round(x, y - 7, 12, 7, 1, '#3a4252'); p.rect(x + 2, y - 11, 8, 4, '#6a7a8a');
    p.rect(x + 3, y - 10, 6, 2, '#7dff9a'); p.rect(x + 1, y - 5, 10, 1, '#5a6272');
  }

  /* The logo in the corner of the fascia. Each one is a thing, not a word. */
  function logo(p, key, x, y, c, d) {
    p.disc(x, y, 10, d); p.disc(x, y, 9, shade(d, 1.5)); p.disc(x, y, 8, d);
    if (key === 'noodle') {
      p.ellipse(x, y + 1, 7, 5, c); p.rect(x - 7, y - 4, 15, 5, null);
      p.rect(x - 7, y, 15, 1, '#ffffff'); p.line(x - 2, y - 7, x + 6, y + 1, '#f0dcb0');
      p.line(x, y - 8, x + 7, y, '#f0dcb0');
      p.rect(x - 4, y - 5, 1, 3, '#ffffff'); p.rect(x - 1, y - 6, 1, 3, '#ffffff');
    } else if (key === 'air') {
      lungs(p, x, y - 1, 1, c);
    } else if (key === 'grab') {
      magnet(p, x, y - 2, 0.9);
    } else if (key === 'fence') {
      p.ellipse(x, y + 2, 6, 5, c); p.rect(x - 2, y - 5, 5, 3, c); p.rect(x - 3, y - 3, 7, 1, shade(c, 0.5));
      p.rect(x, y - 1, 1, 7, d); p.rect(x - 2, y, 5, 1, d); p.rect(x - 2, y + 3, 5, 1, d);
    } else if (key === 'hat') {
      hat(p, 0, x, y - 7, c);
    } else if (key === 'ore') {
      gem(p, x, y - 1, 6, c);
    } else if (key === 'cafe') {
      p.round(x - 5, y - 2, 9, 8, 2, c); p.rect(x + 4, y, 3, 3, c); p.rect(x + 5, y + 1, 1, 1, d);
      p.rect(x - 6, y + 6, 13, 1, c);
      p.rect(x - 3, y - 7, 1, 3, '#ffffff'); p.rect(x, y - 8, 1, 4, '#ffffff');
    } else if (key === 'plant') {
      p.ellipse(x, y - 1, 4, 7, c); p.line(x, y - 7, x, y + 7, d);
      for (let i = -4; i < 5; i += 3) { p.line(x, y + i, x - 3, y + i - 2, d); p.line(x, y + i, x + 3, y + i - 2, d); }
    } else if (key === 'stamp') {
      p.round(x - 3, y - 8, 7, 6, 2, '#c84a3a'); p.rect(x - 1, y - 3, 3, 3, '#8a2a1a');
      p.rect(x - 6, y, 13, 4, c); p.rect(x - 6, y + 4, 13, 1, '#c84a3a');
    }
  }

  /* The posters taped to the inside of the glass. 18 by 24 paint pixels. */
  function poster(p, kind, x, y, s) {
    const W = 18, H = 24;
    const bg = { bowl: '#ffe0b0', face: s.brand, lung: '#e8f8ff', sale: '#ffd34d', magnet: '#2a2a3a',
      star: '#ff5a8a', cash: '#9aff9a', nocop: '#f0f0f0', hat: '#2a1a3a', gem: '#0e2a3a', planet: '#1a1040',
      cup: '#f0e0c8', bean: '#6a9a1e', leaf: '#e0ffe0', sun: '#ffe890', stamp: '#f0ead0', queue: '#ffffff' }[kind] || '#ffffff';
    p.rect(x - 1, y - 1, W + 2, H + 2, INK);
    p.rect(x, y, W, H, bg);
    p.rect(x, y, W, 1, 'rgba(255,255,255,0.5)');
    const cx = x + W / 2, cy = y + 10;
    const line = (yy, w, c) => p.rect(cx - w / 2, yy, w, 1, c);
    if (kind === 'bowl') {
      p.ellipse(cx, cy + 2, 7, 5, '#c83a2a'); p.rect(x + 2, cy - 3, W - 4, 5, bg);
      p.rect(x + 2, cy + 1, W - 4, 1, '#f0dcb0'); p.line(cx - 3, cy - 6, cx + 5, cy + 1, '#8a5a2a');
      for (let i = -2; i <= 2; i += 2) p.rect(cx + i, cy - 7, 1, 3, '#c8a888');
      line(y + H - 6, 12, '#c83a2a'); line(y + H - 3, 8, '#c83a2a');
    } else if (kind === 'face') {
      p.disc(cx, cy, 6, '#ffffff'); p.rect(cx - 3, cy - 2, 2, 2, INK); p.rect(cx + 2, cy - 2, 2, 2, INK);
      p.line(cx - 3, cy + 2, cx, cy + 4, INK); p.line(cx, cy + 4, cx + 3, cy + 2, INK);
      p.rect(cx - 5, cy + 1, 2, 1, '#ff9ab8'); p.rect(cx + 4, cy + 1, 2, 1, '#ff9ab8');
      line(y + H - 5, 12, '#ffffff'); line(y + H - 3, 8, shade(s.brand, 0.5));
    } else if (kind === 'lung') {
      lungs(p, cx, cy, 1, '#ff8aa8'); line(y + H - 6, 12, '#38a8d8'); line(y + H - 3, 9, '#38a8d8');
    } else if (kind === 'sale') {
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        p.line(cx, cy, cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, '#ff5a3c');
      }
      p.disc(cx, cy, 5, '#ff5a3c');
      p.disc(cx - 2, cy - 2, 1, '#ffffff'); p.disc(cx + 2, cy + 2, 1, '#ffffff'); p.line(cx + 3, cy - 3, cx - 3, cy + 3, '#ffffff');
      line(y + H - 4, 12, '#5a2a0a');
    } else if (kind === 'magnet') {
      magnet(p, cx, cy - 1, 0.8);
      for (let i = 0; i < 3; i++) p.rect(cx - 6 + i * 5, cy + 7, 2, 2, '#c8d0dc');
      line(y + H - 4, 12, '#ffc44d');
    } else if (kind === 'star') {
      p.spike(cx, cy - 7, 15, 9, -1, '#ffd34d'); p.spike(cx, cy - 2, 15, 9, 1, '#ffd34d');
      p.rect(cx - 2, cy - 2, 1, 2, INK); p.rect(cx + 2, cy - 2, 1, 2, INK);
      line(y + H - 5, 12, '#ffffff'); line(y + H - 3, 10, '#ffffff');
    } else if (kind === 'cash') {
      p.rect(cx - 7, cy - 4, 14, 9, '#3a8a3a'); p.rect(cx - 6, cy - 3, 12, 7, '#6ac86a');
      p.disc(cx, cy + 1, 2, '#3a8a3a'); line(y + H - 6, 12, '#1a5a1a'); line(y + H - 3, 8, '#1a5a1a');
    } else if (kind === 'nocop') {
      p.disc(cx, cy, 7, '#d8343a'); p.disc(cx, cy, 5, '#f0f0f0');
      p.rect(cx - 2, cy - 3, 5, 3, '#2a3a8a'); p.rect(cx - 1, cy, 3, 3, '#e8b88a');
      p.line(cx - 4, cy - 4, cx + 4, cy + 4, '#d8343a'); p.line(cx - 4, cy - 3, cx + 3, cy + 4, '#d8343a');
      line(y + H - 4, 12, '#d8343a');
    } else if (kind === 'hat') {
      hat(p, 0, cx, cy - 6, '#ff7ac4'); line(y + H - 6, 12, '#ffb0dc'); line(y + H - 3, 8, '#ffb0dc');
    } else if (kind === 'gem') {
      gem(p, cx, cy, 6, '#7dffda');
      p.rect(cx - 7, cy - 6, 1, 1, '#ffffff'); p.rect(cx + 6, cy + 4, 1, 1, '#ffffff');
      line(y + H - 4, 12, '#7dffda');
    } else if (kind === 'planet') {
      p.disc(cx, cy, 6, '#ff9a4a'); p.rect(cx - 6, cy - 1, 13, 2, '#c85a2a');
      p.line(cx - 9, cy + 3, cx + 9, cy - 2, '#ffe0a0');
      for (let i = 0; i < 5; i++) p.rect(x + 2 + i * 3, y + 2 + (i * 7) % 5, 1, 1, '#ffffff');
      line(y + H - 4, 12, '#ffffff');
    } else if (kind === 'cup') {
      p.round(cx - 5, cy - 3, 9, 9, 2, '#ffffff'); p.rect(cx - 4, cy - 2, 7, 2, '#6a3a1a');
      p.rect(cx + 4, cy, 3, 3, '#ffffff'); p.rect(cx - 2, cy - 8, 1, 4, '#c8a888'); p.rect(cx + 1, cy - 9, 1, 4, '#c8a888');
      line(y + H - 5, 12, '#6a3a1a'); line(y + H - 3, 8, '#6a3a1a');
    } else if (kind === 'bean') {
      p.ellipse(cx, cy, 5, 7, '#9ad84a'); p.rect(cx - 2, cy - 1, 1, 1, INK); p.rect(cx + 2, cy - 1, 1, 1, INK);
      p.line(cx - 1, cy + 2, cx, cy + 3, INK); p.line(cx, cy + 3, cx + 1, cy + 2, INK);
      line(y + H - 4, 12, '#ffffff');
    } else if (kind === 'leaf') {
      p.ellipse(cx, cy, 4, 8, '#3aa84a'); p.line(cx, cy - 7, cx, cy + 8, '#1a5a24');
      line(y + H - 4, 12, '#3aa84a');
    } else if (kind === 'sun') {
      p.disc(cx, cy, 5, '#ff9a2a');
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; p.rect(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 1, 1, '#ff9a2a'); }
      line(y + H - 4, 12, '#c86a1a');
    } else if (kind === 'stamp') {
      p.rect(cx - 6, cy - 6, 12, 12, '#ffffff'); p.disc(cx, cy, 5, '#c84a3a'); p.disc(cx, cy, 3, '#ffffff');
      p.rect(cx - 1, cy - 1, 3, 3, '#c84a3a'); line(y + H - 5, 12, '#3a3424'); line(y + H - 3, 10, '#3a3424');
    } else if (kind === 'queue') {
      p.rect(x + 2, y + 2, W - 4, 11, '#d8343a');
      p.rect(cx - 4, y + 4, 2, 7, '#ffffff'); p.rect(cx + 1, y + 4, 3, 2, '#ffffff'); p.rect(cx + 2, y + 6, 2, 2, '#ffffff'); p.rect(cx + 1, y + 9, 3, 2, '#ffffff');
      line(y + H - 8, 12, '#3a3a3a'); line(y + H - 5, 10, '#3a3a3a'); line(y + H - 3, 12, '#3a3a3a');
    }
  }

  /* ---------------------------------------------------------- interiors
     The room: `B` is behind the shopkeeper, `M` is in front of them. The
     counter's centre, in paint pixels, comes back so the keeper can be
     stood behind it. */
  function interior(B, M, s, W2, H2, L, R) {
    const top = 30, floor = H2 - 18;
    const k = s.key;
    // the back wall, a wainscot, a picture rail and a ceiling with lights in it
    B.rect(L, top, R - L, H2 - top, s.wall);
    B.rect(L, floor - 22, R - L, 22, s.wall2);
    B.rect(L, floor - 23, R - L, 1, shade(s.wall2, 1.4));
    B.rect(L, top, R - L, 4, shade(s.wall, 0.6));
    for (let x = L + 10; x < R - 6; x += 26) {
      B.rect(x, top + 4, 10, 2, s.glow);
      B.rect(x + 1, top + 6, 8, 1, 'rgba(255,255,255,0.18)');
    }
    // the floor, checked, running back
    for (let x = L; x < R; x += 6) {
      for (let y = floor; y < H2; y += 3) B.rect(x + ((y / 3) % 2 ? 3 : 0), y, 3, 3, (((x / 6) + (y / 3)) % 2) ? shade(s.wall2, 0.7) : shade(s.wall2, 1.2));
    }
    B.rect(L, floor, R - L, 1, shade(s.wall, 0.45));
    let cx = (L + R) / 2;                  // where the counter goes

    if (k === 'noodle') {
      // the menu board, three pictures and prices, over the pass
      B.rect(L + 8, top + 12, R - L - 16, 16, '#1a0e0a');
      for (let i = 0; i < 4; i++) {
        const mx = L + 12 + i * ((R - L - 24) / 4);
        B.ellipse(mx + 5, top + 19, 4, 3, ['#ff8a4a', '#ffd34d', '#8aff9a', '#ff5a8a'][i]);
        B.rect(mx + 1, top + 17, 9, 2, '#1a0e0a');
        B.rect(mx + 1, top + 24, 8, 1, '#f0dcb0');
      }
      // a shelf of jars and the big stock pot on the range
      shelf(B, L + 4, L + 40, top + 40, '#8a5a3a');
      for (let i = 0; i < 4; i++) jar(B, L + 6 + i * 9, top + 28, ['#ff8a4a', '#c8a040', '#8aff9a', '#ff5a3c'][i]);
      B.round(R - 34, floor - 20, 22, 18, 3, '#6a7280'); B.rect(R - 36, floor - 22, 26, 3, '#9aa2b0');
      B.rect(R - 32, floor - 17, 18, 2, '#c8ced8');
      // hanging lanterns
      for (const lx of [L + 52, L + 84]) { B.rect(lx, top + 4, 1, 6, '#2a1a10'); B.ellipse(lx, top + 14, 5, 6, '#ff5a3c'); B.rect(lx - 5, top + 13, 11, 1, '#c83a2a'); }
      cx = L + 58;
      counter(M, L + 30, floor - 16, 58, 18, '#c8905a', '#6a3a1e');
      for (let i = 0; i < 3; i++) { M.ellipse(L + 40 + i * 18, floor - 20, 5, 3, '#ffffff'); M.rect(L + 36 + i * 18, floor - 23, 9, 3, null); M.rect(L + 36 + i * 18, floor - 21, 9, 1, '#f0dcb0'); }
      for (const sx of [L + 40, L + 62, L + 82]) stool(M, sx, floor - 6, '#ff5a3c');
    } else if (k === 'air') {
      // a rack of tanks along the back, in every colour a tank comes in
      shelf(B, L + 6, R - 6, floor - 3, '#4a6a7a');
      for (let i = 0; i < 6; i++) tank(B, L + 30 + i * 12, floor - 30, 27, ['#38e8ff', '#ff8a4a', '#7dff9a', '#ffd34d', '#38e8ff', '#ff5a8a'][i]);
      // lungs, in jars, on a shelf, which is the part you think about later
      shelf(B, L + 30, R - 8, top + 24, '#4a6a7a');
      for (let i = 0; i < 5; i++) {
        B.round(L + 32 + i * 14, top + 10, 11, 14, 3, 'rgba(200,240,255,0.3)');
        lungs(B, L + 37 + i * 14, top + 15, 0.7, i % 2 ? '#ff8aa8' : '#e87a98');
        B.rect(L + 32 + i * 14, top + 8, 11, 2, '#8a9aaa');
      }
      // a diving helmet on a stand by the door
      B.disc(L + 14, floor - 24, 8, '#c8a040'); B.disc(L + 14, floor - 24, 5, '#1a3a4a'); B.rect(L + 12, floor - 26, 2, 2, '#ffffff');
      B.rect(L + 13, floor - 16, 2, 14, '#4a5a6a');
      cx = R - 36;
      // the glass counter with bubbles in it
      counter(M, R - 64, floor - 16, 54, 18, '#8adcf0', '#123a4a');
      M.rect(R - 62, floor - 14, 50, 11, 'rgba(120,220,255,0.35)');
      for (let i = 0; i < 9; i++) M.disc(R - 58 + i * 5.5, floor - 11 + (i * 5) % 7, 1 + (i % 2), '#c4f8ff');
    } else if (k === 'grab') {
      // a pegboard, gloves and magnets hung on it
      B.rect(L + 36, top + 8, R - L - 44, 34, '#6a5a3a');
      for (let x = L + 38; x < R - 10; x += 4) for (let y = top + 10; y < top + 40; y += 4) B.set(x, y, '#4a3e28');
      for (let i = 0; i < 4; i++) glove(B, L + 42 + i * 13, top + 12, ['#ffc44d', '#ff8a4a', '#7ef9ff', '#c8c8d8'][i]);
      for (let i = 0; i < 3; i++) magnet(B, L + 48 + i * 16, top + 34, 0.6);
      // a claw machine, because of course
      B.rect(L + 4, top + 14, 28, floor - top - 12, '#c83a5a');
      B.rect(L + 7, top + 18, 22, 22, '#1a1028'); B.rect(L + 7, top + 18, 22, 22, 'rgba(160,220,255,0.18)');
      B.rect(L + 17, top + 18, 1, 8, '#c8c8d8'); B.rect(L + 14, top + 26, 7, 2, '#c8c8d8'); B.rect(L + 14, top + 28, 1, 3, '#c8c8d8'); B.rect(L + 20, top + 28, 1, 3, '#c8c8d8');
      for (let i = 0; i < 5; i++) B.disc(L + 10 + i * 4, top + 37 - (i % 2) * 2, 2, ['#ffd34d', '#7dff9a', '#ff8ad8', '#7ef9ff', '#ff8a4a'][i]);
      B.rect(L + 9, top + 44, 18, 6, '#8a2a3a'); B.disc(L + 14, top + 46, 2, '#ffd34d'); B.rect(L + 21, top + 44, 2, 5, '#1a1a1a');
      B.rect(L + 4, top + 12, 28, 3, '#ffd34d');
      cx = R - 34;
      counter(M, R - 62, floor - 16, 54, 18, '#c8a060', '#3e3424');
      register(M, R - 26, floor - 19);
      M.rect(R - 56, floor - 22, 12, 3, '#8a8a9a'); M.rect(R - 54, floor - 24, 8, 2, '#c8c8d8');
    } else if (k === 'fence') {
      // everything anybody ever sold them, on two shelves that are losing
      shelf(B, L + 6, R - 6, top + 22, '#5a4a6a'); shelf(B, L + 6, R - 6, top + 44, '#5a4a6a');
      // top shelf: a TV, a trophy, a clock, a vase
      B.round(L + 10, top + 8, 16, 14, 2, '#3a3a4a'); B.rect(L + 12, top + 10, 12, 9, '#4a8aa8'); B.rect(L + 13, top + 11, 4, 2, '#8ad8f8');
      B.rect(L + 32, top + 18, 8, 4, '#c8a040'); B.rect(L + 34, top + 10, 4, 8, '#ffd34d'); B.ellipse(L + 36, top + 9, 5, 3, '#ffd34d');
      B.disc(L + 52, top + 14, 6, '#e8dcc0'); B.disc(L + 52, top + 14, 5, '#fff8e8'); B.line(L + 52, top + 14, L + 52, top + 10, INK); B.line(L + 52, top + 14, L + 55, top + 14, INK);
      B.ellipse(L + 68, top + 15, 5, 7, '#4a8aff'); B.rect(L + 66, top + 7, 4, 3, '#4a8aff');
      B.round(L + 78, top + 12, 12, 10, 1, '#8a6a4a');
      // bottom shelf: a guitar leaning, a lamp, boxes, a boot
      B.ellipse(L + 16, top + 38, 6, 6, '#c86a2a'); B.disc(L + 16, top + 38, 2, INK); B.rect(L + 15, top + 22, 2, 14, '#6a3a1a');
      B.rect(L + 30, top + 34, 10, 10, '#8a6a4a'); B.rect(L + 42, top + 30, 12, 14, '#6a5a3a'); B.rect(L + 30, top + 38, 10, 1, '#5a4a3a');
      B.spike(L + 66, top + 28, 12, 8, -1, '#ffd34d'); B.rect(L + 65, top + 36, 2, 8, '#8a8a9a');
      B.round(L + 76, top + 36, 12, 8, 2, '#3a2a1a'); B.rect(L + 76, top + 30, 6, 8, '#3a2a1a');
      // a framed painting of somebody's grandmother
      B.rect(R - 22, top + 4, 14, 15, '#c8a040'); B.rect(R - 20, top + 6, 10, 11, '#3a5a4a'); B.disc(R - 15, top + 10, 2, '#e8c8a8'); B.rect(R - 17, top + 13, 5, 4, '#6a3a5a');
      cx = L + 48;
      counter(M, L + 20, floor - 16, 58, 18, '#8a6ac8', '#2e1a52');
      register(M, L + 24, floor - 19);
      // the safe, open a crack
      M.round(R - 30, floor - 22, 22, 22, 2, '#4a4a5a'); M.round(R - 28, floor - 20, 18, 18, 2, '#5a5a6a');
      M.disc(R - 19, floor - 11, 4, '#8a8a9a'); M.disc(R - 19, floor - 11, 1, INK);
      M.rect(R - 11, floor - 18, 2, 14, '#ffd34d');
    } else if (k === 'hat') {
      shelf(B, L + 6, R - 6, top + 22, '#6a3a5a'); shelf(B, L + 6, R - 6, top + 42, '#6a3a5a');
      for (let i = 0; i < 6; i++) hat(B, i % 5, L + 14 + i * 14, top + 10, ['#2a2a3a', '#6a3a2a', '#ff5a8a', '#3a1a5a', '#c83a3a', '#2a6a8a'][i]);
      for (let i = 0; i < 5; i++) hat(B, (i + 2) % 5, L + 18 + i * 16, top + 30, ['#ffd34d', '#2a2a3a', '#7dff9a', '#ff8a4a', '#8a6ac8'][i]);
      // a long mirror
      B.rect(R - 16, top + 50, 10, floor - top - 52, '#c8a060'); B.rect(R - 15, top + 51, 8, floor - top - 54, '#a8d8e8'); B.line(R - 14, top + 54, R - 9, top + 60, '#ffffff');
      cx = L + 40;
      counter(M, L + 18, floor - 14, 44, 16, '#c86aa8', '#48223a');
      // two heads on stands, each wearing something ambitious
      for (const [hx, kind, c] of [[L + 74, 0, '#1a1a2a'], [L + 90, 3, '#6a3aa8']]) {
        M.rect(hx - 1, floor - 14, 3, 14, '#8a8a9a'); M.rect(hx - 4, floor - 1, 9, 1, '#8a8a9a');
        M.ellipse(hx, floor - 19, 5, 6, '#e8dcd0'); hat(M, kind, hx, floor - 34, c);
      }
    } else if (k === 'ore') {
      // lit niches in the wall, one stone in each
      for (let i = 0; i < 4; i++) {
        const nx = L + 12 + i * 20;
        B.rect(nx, top + 12, 14, 16, shade(s.wall, 0.6)); B.rect(nx, top + 12, 14, 2, s.glow);
        gem(B, nx + 7, top + 22, 4, ['#7dffda', '#ff5a8a', '#ffd34d', '#8a8aff'][i]);
      }
      shelf(B, L + 6, R - 6, top + 36, '#3a6a64');
      for (let i = 0; i < 6; i++) B.round(L + 10 + i * 14, top + 30, 9, 6, 2, ['#7a6a5a', '#8a7a6a', '#6a5a4a'][i % 3]);
      cx = L + 30;
      counter(M, L + 8, floor - 14, 44, 16, '#7dd8c0', '#0e3a30');
      // the glass cases, rings on cushions
      M.rect(L + 58, floor - 24, 36, 22, '#1a3a38'); M.rect(L + 58, floor - 24, 36, 12, 'rgba(160,255,240,0.3)');
      M.rect(L + 58, floor - 25, 36, 1, '#c8fff0');
      for (let i = 0; i < 4; i++) { M.rect(L + 61 + i * 8, floor - 17, 6, 4, '#6a1a3a'); M.disc(L + 64 + i * 8, floor - 19, 2, ['#ffd34d', '#c8c8d8', '#ffd34d', '#c8c8d8'][i]); M.set(L + 64 + i * 8, floor - 21, ['#7dffda', '#ff5a8a', '#8a8aff', '#ffffff'][i]); }
    } else if (k === 'cafe') {
      // the chalkboard menu and the machine that hisses
      B.rect(L + 8, top + 10, 36, 22, '#2a3a2a'); B.rect(L + 7, top + 9, 38, 1, '#8a6a4a');
      for (let i = 0; i < 4; i++) { B.rect(L + 11, top + 14 + i * 4, 18 - (i % 2) * 5, 1, '#e8e8d8'); B.rect(L + 36, top + 14 + i * 4, 5, 1, '#ffd34d'); }
      B.round(R - 40, top + 24, 26, 22, 2, '#c8ced8'); B.rect(R - 38, top + 28, 22, 6, '#3a3a4a'); B.disc(R - 32, top + 31, 2, '#ff5a3c'); B.disc(R - 24, top + 31, 2, '#7dff9a');
      B.rect(R - 34, top + 40, 2, 4, '#3a3a4a'); B.rect(R - 22, top + 40, 2, 4, '#3a3a4a');
      shelf(B, L + 50, R - 44, top + 22, '#8a6a4a');
      for (let i = 0; i < 4; i++) { B.round(L + 52 + i * 6, top + 16, 5, 6, 1, ['#ffffff', '#ff8a4a', '#7ef9ff', '#ffd34d'][i]); }
      // bean sacks slumped by the wall
      B.round(L + 6, floor - 14, 14, 14, 4, '#a88a5a'); B.round(L + 16, floor - 11, 12, 11, 4, '#8a6a3a'); B.rect(L + 9, floor - 9, 6, 1, '#5a3a1a');
      cx = R - 30;
      counter(M, R - 54, floor - 16, 46, 18, '#c8905a', '#523a22');
      M.rect(R - 50, floor - 26, 20, 10, 'rgba(255,240,220,0.35)'); M.rect(R - 50, floor - 27, 20, 1, '#fff0d8');
      for (let i = 0; i < 3; i++) M.ellipse(R - 46 + i * 6, floor - 19, 2.5, 2, ['#e8a050', '#ff8ad8', '#c86a2a'][i]);
      // one little table and two chairs
      M.rect(L + 32, floor - 12, 16, 2, '#e8dcc0'); M.rect(L + 39, floor - 10, 2, 9, '#8a8a9a');
      M.round(L + 37, floor - 17, 5, 5, 1, '#ffffff');
      chair(M, L + 26, floor - 8, '#6a3a1a', 0); chair(M, L + 54, floor - 8, '#6a3a1a', 1);
    } else if (k === 'plant') {
      shelf(B, L + 6, R - 6, top + 22, '#5a4a3a'); shelf(B, L + 6, R - 6, top + 42, '#5a4a3a');
      for (let i = 0; i < 6; i++) potPlant(B, L + 14 + i * 14, top + 20, i % 2, ['#3aa84a', '#6ad85a', '#2a8a5a'][i % 3], ['#c86a3a', '#e8dcc0', '#4a8aa8'][i % 3]);
      for (let i = 0; i < 5; i++) potPlant(B, L + 20 + i * 16, top + 40, (i + 1) % 2, ['#6ad85a', '#3aa84a', '#8ad84a'][i % 3], ['#e8dcc0', '#c86a3a', '#8a6ac8'][i % 3]);
      // a trailing one hanging from the ceiling
      B.rect(L + 50, top + 4, 1, 4, '#3a2a1a'); B.round(L + 46, top + 8, 9, 5, 1, '#c86a3a');
      for (let i = 0; i < 8; i++) B.ellipse(L + 44 + (i % 3) * 5, top + 14 + i * 2, 2, 2, '#3aa84a');
      cx = R - 30;
      counter(M, R - 52, floor - 14, 44, 16, '#8ac870', '#22402a');
      register(M, R - 28, floor - 17);
      potPlant(M, L + 16, floor - 2, 3, '#3aa84a', '#c86a3a');
      potPlant(M, L + 38, floor - 2, 2, '#6ad85a', '#e8dcc0');
    } else if (k === 'stamp') {
      // filing cabinets, a clock, a sign that says what number they are on
      for (let i = 0; i < 2; i++) {
        const fx = L + 8 + i * 18;
        B.rect(fx, top + 14, 16, floor - top - 14, '#6a6a5a');
        for (let j = 0; j < 4; j++) { B.rect(fx + 1, top + 16 + j * 12, 14, 10, '#7a7a6a'); B.rect(fx + 6, top + 20 + j * 12, 4, 1, '#c8c8b8'); }
      }
      B.disc(R - 20, top + 16, 7, '#3a3424'); B.disc(R - 20, top + 16, 6, '#fff8e8'); B.line(R - 20, top + 16, R - 20, top + 11, INK); B.line(R - 20, top + 16, R - 16, top + 18, INK);
      B.rect(L + 52, top + 10, 22, 12, '#1a1a1a'); B.rect(L + 55, top + 13, 3, 6, '#ff5a3c'); B.rect(L + 60, top + 13, 3, 6, '#ff5a3c'); B.rect(L + 65, top + 13, 3, 6, '#ff5a3c');
      cx = L + 62;
      counter(M, L + 40, floor - 16, 48, 18, '#d8ccb0', '#3a3424');
      for (let i = 0; i < 3; i++) M.rect(L + 44 + i * 2, floor - 22 - i * 2, 12, 2, i % 2 ? '#e8e8e0' : '#ffffff');
      M.round(L + 74, floor - 26, 6, 6, 2, '#c84a3a'); M.rect(L + 73, floor - 21, 8, 2, '#3a3424');
      // the queue rope, with nobody in it, which is somehow worse
      for (const px of [R - 22, R - 8]) { M.rect(px, floor - 12, 2, 12, '#c8a040'); M.disc(px + 1, floor - 13, 2, '#ffd34d'); }
      for (let i = 0; i < 12; i++) M.set(R - 20 + i, floor - 11 + Math.round(Math.sin(i / 11 * Math.PI) * 3), '#c83a3a');
    }
    return cx;
  }

  /* ------------------------------------------------------------ build */
  function build(s) {
    const W2 = s.w * HD, H2 = SH * HD;
    const B = PD.pix(W2, H2), M = PD.pix(W2, H2), T = PD.pix(W2, H2);
    const L = 10, R = W2 - 10;
    const cx = interior(B, M, s, W2, H2, L, R);

    // the frame: pilasters either side, a steel lintel, a kickplate
    const steel = '#232a3a', steelL = '#4a5670', steelD = '#10141e';
    T.rect(0, 0, W2, 30, steel);
    T.rect(0, 0, 8, H2, steel); T.rect(W2 - 8, 0, 8, H2, steel);
    T.rect(1, 0, 1, H2, steelL); T.rect(W2 - 2, 0, 1, H2, steelD);
    T.rect(7, 30, 1, H2 - 30, steelD); T.rect(W2 - 8, 30, 1, H2 - 30, steelL);
    // the fascia: a brand-coloured panel with a lit edge
    T.rect(8, 3, W2 - 16, 22, s.dark);
    T.rect(8, 3, W2 - 16, 1, s.brand); T.rect(8, 24, W2 - 16, 1, shade(s.brand, 0.6));
    T.rect(8, 25, W2 - 16, 3, steelD);
    for (let x = 12; x < W2 - 12; x += 8) T.set(x, 26, steelL);
    logo(T, s.key, 22, 14, s.brand, s.dark);
    // the door, a glass one in a thick frame, and the window's mullions
    const dw = 30, dx = s.door > 0 ? R - dw : L;
    T.rect(dx - 2, 30, 2, H2 - 30, steelD); T.rect(dx + dw, 30, 2, H2 - 30, steelD);
    T.rect(dx, 30, dw, 2, steelD);
    T.rect(dx + (s.door > 0 ? 3 : dw - 5), 64, 2, 16, '#c8d0dc');       // the handle
    T.rect(dx, H2 - 4, dw, 4, steelD);
    // the kickplate under the window
    const wx0 = s.door > 0 ? L : L + dw + 2, wx1 = s.door > 0 ? R - dw - 2 : R;
    T.rect(wx0, H2 - 10, wx1 - wx0, 10, steel);
    T.rect(wx0, H2 - 10, wx1 - wx0, 1, steelL);
    for (let x = wx0 + 4; x < wx1 - 4; x += 12) T.rect(x, H2 - 6, 6, 2, s.dark);
    // a vertical mullion splitting the big window in two
    const mid = Math.round((wx0 + wx1) / 2);
    T.rect(mid - 1, 30, 2, H2 - 40, steelD);
    // the posters, stuck on the inside of the glass
    const pk = s.posters;
    poster(T, pk[0], wx0 + 6, 46, s);
    if (pk[1]) poster(T, pk[1], mid + 6 + ((s.x / 10) % 3) * 4, 52, s);
    // the tagline strip stuck along the bottom of the window
    T.rect(wx0 + 2, H2 - 15, wx1 - wx0 - 4, 4, 'rgba(255,255,255,0.10)');
    return {
      B: B.toCanvas(), M: M.toCanvas(), T: T.toCanvas(),
      keepX: cx / HD - s.w / 2, door: { x: dx / HD - s.w / 2, w: dw / HD },
      win: { x0: wx0 / HD - s.w / 2, x1: wx1 / HD - s.w / 2 }
    };
  }

  const cache = {};
  function art(s) { return cache[s.key] || (cache[s.key] = build(s)); }

  function kin(nm) {
    for (const k of AH.KIN) if (k.who === nm || k.celeb === nm) return k;
    return AH.KIN[0];
  }

  /* ------------------------------------------------------------- draw
     x is the shop's centre on screen, y the floor it stands on. `near` is
     how close the player is (0 far .. 1 at the door); `owned` greys the
     logo's neon to a steady green so a one-off reads as done. */
  function draw(ctx, s, x, y, t, cam, px, owned, dim) {
    const A = art(s);
    const L = Math.round(x - s.w / 2), top = y - SH;
    const near = Math.max(0, 1 - Math.abs(px - x) / 60);
    const base = dim ? 0.55 : 1;
    ctx.globalAlpha = base;

    // light from inside, spilling out across the deck
    if (!dim) {
      ctx.globalAlpha = 0.16 + near * 0.08;
      X.blob(ctx, x, y + 2, s.w * 0.55, 5, s.glow);
      ctx.globalAlpha = base;
    }
    ctx.drawImage(A.B, L, top, s.w, SH);

    // the shopkeeper, clipped to the inside of the shop
    const K = kin(s.keeper);
    const kx = x + A.keepX;
    const winTop = top + 16, floor = y - 9;
    const footY = Math.min(floor, winTop + 2 + K.h);
    let fr = 0;
    const cyc = (t * 0.7 + s.x * 0.013) % 5;
    if (near > 0.35) fr = (Math.sin(t * 9) > 0 && cyc < 2.2) ? 3 : 0;
    else if (cyc > 4.7) fr = 5;
    if (owned && s.id && Math.sin(t * 1.3 + s.x) > 0.93) fr = 6;
    const bob = Math.sin(t * 1.8 + s.x) * 0.7;
    ctx.save();
    ctx.beginPath(); ctx.rect(L + 5, winTop, s.w - 10, SH - 20); ctx.clip();
    AH.blit(ctx, AH.S[K.key], fr, kx, footY + bob, px > x);
    ctx.restore();
    ctx.globalAlpha = base;
    ctx.drawImage(A.M, L, top, s.w, SH);

    // THE GLASS. A faint tint, and two bright bands of reflection that slide
    // the opposite way to the camera, so walking past a window looks like it.
    ctx.save();
    ctx.beginPath(); ctx.rect(L + 5, top + 15, s.w - 10, SH - 17); ctx.clip();
    ctx.globalAlpha = base * 0.09;
    ctx.fillStyle = '#9adfff'; ctx.fillRect(L + 5, top + 15, s.w - 10, SH - 17);
    const sl = ((x * 0.6 + cam * 0.35) % 140 + 140) % 140 - 40;
    ctx.globalAlpha = base * 0.10;
    X.poly(ctx, [[L + sl, top + SH], [L + sl + 10, top + SH], [L + sl + 34, top + 15], [L + sl + 24, top + 15]], '#ffffff');
    ctx.globalAlpha = base * 0.06;
    X.poly(ctx, [[L + sl + 16, top + SH], [L + sl + 19, top + SH], [L + sl + 43, top + 15], [L + sl + 40, top + 15]], '#ffffff');
    ctx.restore();
    ctx.globalAlpha = base;
    ctx.drawImage(A.T, L, top, s.w, SH);

    // the name, lit, on the fascia, and the logo's neon breathing
    const flick = owned ? 1 : ((Math.floor(t * 5 + s.x) % 43) === 0 ? 0.35 : 1);
    const nameX = L + 17 + (s.w - 21) / 2;
    if (!dim) {
      ctx.globalAlpha = 0.14 * flick;
      X.blob(ctx, nameX, top + 7, s.w * 0.42, 6, s.brand);
      X.blob(ctx, L + 11, top + 7, 8, 8, s.brand);
      ctx.globalAlpha = base;
    }
    F.draw(ctx, s.sign, nameX, top + 4, flick > 0.5 ? shade(s.brand, 1.25) : shade(s.brand, 0.6),
      { center: true, shadow: shade(s.dark, 0.5) });
    // the OPEN sign hung in the door, or, if you own what they sell, YOURS
    const dx = x + A.door.x + A.door.w / 2;
    const open = owned ? 'MINE' : 'OPEN';
    const on = owned || (Math.floor(t * 1.6 + s.x) % 9) !== 0;
    X.rect(ctx, dx - 9, top + 22, 18, 7, '#0a0612');
    X.rect(ctx, dx - 8, top + 23, 16, 5, on ? (owned ? '#1a4a2a' : '#4a0e1e') : '#1a0a10');
    X.rect(ctx, dx - 0.5, top + 17, 1, 5, '#6a6a7a');
    // four letters won't fit in 16 pixels of 5x7 font; the sign is a row of
    // lit bars instead, which is what an OPEN sign looks like from outside
    const lc = on ? (owned ? '#7dff9a' : '#ff5a7a') : '#3a1a22';
    for (let i = 0; i < 4; i++) X.rect(ctx, dx - 7 + i * 4, top + 24, 3, 3, lc);
    if (on && !dim) { ctx.globalAlpha = 0.18; X.blob(ctx, dx, top + 25, 11, 5, lc); ctx.globalAlpha = base; }
    ctx.globalAlpha = 1;
    return open;
  }

  /* ---------------------------------------------------------- dressing
     What goes between the shops: planters with palms in them, benches, and a
     bin. Painted once. */
  const DRESS = {};
  function dressArt(kind) {
    if (DRESS[kind]) return DRESS[kind];
    let p;
    if (kind === 'palm') {
      p = PD.pix(40, 88);
      // the trunk, ringed, leaning a little
      for (let y = 30; y < 74; y++) {
        const xx = 19 + Math.round(Math.sin(y / 18) * 2);
        p.rect(xx, y, 5, 1, y % 5 === 0 ? '#6a4a2a' : '#8a6a3a');
        p.set(xx + 4, y, '#5a3a1a');
      }
      // fronds, a fan of them
      const fr = [[-1.0, 18], [-0.55, 20], [-0.1, 16], [0.35, 20], [0.8, 18], [-1.4, 14], [1.2, 14]];
      for (const [a, L] of fr) {
        for (let i = 0; i < L; i++) {
          const tt = i / L;
          const fx = 21 + Math.sin(a) * i * 1.1, fy = 30 - Math.cos(a) * i * 0.9 + tt * tt * 10;
          p.rect(Math.round(fx), Math.round(fy), 2, 1, '#2a7a3a');
          if (i % 2 === 0 && i > 2) {
            p.line(Math.round(fx), Math.round(fy), Math.round(fx - 3), Math.round(fy + 4), '#3aa84a');
            p.line(Math.round(fx), Math.round(fy), Math.round(fx + 3), Math.round(fy + 4), '#48c05a');
          }
        }
      }
      p.disc(21, 30, 3, '#5a3a1a'); p.disc(19, 31, 2, '#7a5a2a');
      // the planter, a steel box with a lit strip
      p.round(8, 72, 26, 16, 2, '#2e3648'); p.rect(8, 72, 26, 2, '#5a6680'); p.rect(10, 80, 22, 1, '#7ef9ff');
      p.rect(10, 74, 22, 3, '#3a2a1a');
      p.outline(INK);
    } else if (kind === 'bench') {
      p = PD.pix(48, 20);
      p.rect(2, 6, 44, 3, '#c8905a'); p.rect(2, 6, 44, 1, '#e8b07a');
      p.rect(2, 0, 44, 3, '#c8905a'); p.rect(2, 0, 44, 1, '#e8b07a');
      for (const lx of [6, 40]) { p.rect(lx, 3, 2, 17, '#3a4252'); }
      p.rect(4, 9, 40, 1, '#8a5a3a');
      p.outline(INK);
    } else if (kind === 'bin') {
      p = PD.pix(16, 24);
      p.round(1, 4, 14, 20, 2, '#3a5a4a'); p.rect(0, 2, 16, 3, '#5a8a6a'); p.rect(4, 10, 8, 6, '#2a4a3a');
      p.rect(5, 11, 6, 1, '#7dff9a'); p.rect(3, 0, 3, 3, '#e8dcc0'); p.rect(9, 0, 4, 2, '#c83a3a');
      p.outline(INK);
    }
    return (DRESS[kind] = p.toCanvas());
  }
  function dress(ctx, kind, x, y, dim) {
    const cv = dressArt(kind);
    ctx.globalAlpha = dim ? 0.55 : 1;
    ctx.drawImage(cv, Math.round(x - cv.width / 4), Math.round(y - cv.height / 2), cv.width / 2, cv.height / 2);
    ctx.globalAlpha = 1;
  }

  /* THE ESCALATOR. It goes up to the terrace. It does not work. It has
     never worked. There is a cone at the bottom. */
  function escalator(ctx, x, y, y2, t, dim) {
    const base = dim ? 0.55 : 1;
    ctx.globalAlpha = base;
    const run = 64, rise = y - y2;
    // the truss, a steel slab running up at an angle
    X.poly(ctx, [[x - 4, y], [x + 16, y], [x + 16 + run, y2], [x - 4 + run, y2]], '#2a3244');
    X.poly(ctx, [[x - 4, y], [x + 2, y], [x + 2 + run, y2], [x - 4 + run, y2]], '#1a2030');
    // steps: the treads, not moving
    for (let i = 0; i < 16; i++) {
      const f = i / 16;
      const sx = x + 2 + f * run, sy = y - f * rise;
      X.rect(ctx, sx, sy - 3, 10, 1, '#8a96a8');
      X.rect(ctx, sx, sy - 2, 10, 2, '#4a5468');
    }
    // the glass balustrade, and the black handrail on top of it
    ctx.globalAlpha = base * 0.16;
    X.poly(ctx, [[x + 12, y - 2], [x + 16, y - 2], [x + 16 + run, y2 - 2], [x + 12 + run, y2 - 2],
      [x + 12 + run, y2 - 18], [x + 12, y - 18]], '#9adfff');
    ctx.globalAlpha = base;
    X.line(ctx, x + 12, y - 18, x + 12 + run, y2 - 18, '#101018');
    X.line(ctx, x + 12, y - 17, x + 12 + run, y2 - 17, '#2a2a3a');
    X.rect(ctx, x + 8, y - 20, 6, 20, '#3a4458');
    X.rect(ctx, x + 8, y - 20, 6, 2, '#6a7890');
    // the cone, and the sign, and the tape
    X.poly(ctx, [[x - 2, y], [x + 8, y], [x + 3, y - 12]], '#ff7a1a');
    X.rect(ctx, x, y - 6, 6, 2, '#ffffff');
    X.rect(ctx, x - 3, y - 1, 12, 1, '#c85a0a');
    X.rect(ctx, x + 18, y - 32, 30, 14, '#0a0612');
    X.rect(ctx, x + 19, y - 31, 28, 12, '#ffd34d');
    for (let i = 0; i < 7; i++) X.poly(ctx, [[x + 19 + i * 4, y - 20], [x + 21 + i * 4, y - 20], [x + 22 + i * 4, y - 22], [x + 20 + i * 4, y - 22]], '#1a1a1a');
    X.rect(ctx, x + 22, y - 36, 1, 4, '#6a6a7a'); X.rect(ctx, x + 43, y - 36, 1, 4, '#6a6a7a');
    ctx.globalAlpha = 1;
    F.draw(ctx, 'NOPE', x + 33, y - 30, dim ? '#6a5a1a' : '#1a1a1a', { center: true, shadow: false });
    ctx.globalAlpha = 1;
  }

  PD.mall = { SHOPS, SH, draw, dress, escalator, art, kin };
})(window.PD);
