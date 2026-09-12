/* Art for your moon, at 2x density: the five buildings across three tiers,
   the ruins that were already here, the critters, the handheld tool, and the
   brain for the Mind screen. Everything is hard-edged pixel art built from
   primitives, then outlined. */
(function (PD) {
  'use strict';
  const pix = PD.pix;
  const U = PD.util;
  const C = PD.art.C;
  const HD = 2;

  const P = {
    steel: '#9aa3c4', steelD: '#5e6688', steelDD: '#39405e',
    rock: '#6b6480', rockD: '#4a4460', rockL: '#8e86a8',
    gold: '#ffd34d', goldD: '#c99a1e',
    glow: '#7ef9ff', glowD: '#2f8fae', holo: '#58e8ff',
    lime: '#8affa0', rose: '#ff8ad8', amber: '#ffb03d', red: '#ff5a4d',
    ink: '#140f26', bone: '#e8dfc4', boneD: '#a89b78',
    navy: '#2b3a66', navyL: '#40568f', navyD: '#1b2547',
    acid: '#4cff9a', acidD: '#1e9e5c', brain: '#ff9ecb', brainD: '#d64f8a', brainL: '#ffd6e8',
    warm: '#ffe9a8'
  };

  const S = {};
  function crop(p) {
    let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      if (!p.d[y * p.w + x]) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) return p;
    const out = new PD.Pix(x1 - x0 + 1, y1 - y0 + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.set(x - x0, y - y0, p.d[y * p.w + x]);
    return out;
  }
  /* Register at HD: ox/oy are logical, defaulting to bottom-centre. */
  function reg(name, builders, ox, oy) {
    const frames = builders.map(b => crop(b).toCanvas());
    const w = frames[0].width / HD, h = frames[0].height / HD;
    S[name] = { frames, w, h, hd: HD, ox: ox === undefined ? w / 2 : ox, oy: oy === undefined ? h : oy };
  }
  function blit(ctx, s, frame, x, y, flip) {
    const cv = s.frames[frame % s.frames.length];
    ctx.save();
    ctx.translate(x | 0, y | 0);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(cv, -s.ox | 0, -s.oy | 0, cv.width / (s.hd || 1), cv.height / (s.hd || 1));
    ctx.restore();
  }

  /* Draw a whole sprite smaller without touching one hand-placed coordinate:
     every call is forwarded with its numbers multiplied through. Shapes stay
     solid -- nothing is resampled and no rows are dropped, which is what would
     happen if the finished sprite were scaled down instead. */
  function scalePix(raw, k) {
    const S1 = (v) => Math.round(v * k);
    const SW = (v) => Math.max(1, Math.round(v * k));
    return {
      set: (x, y, c) => raw.set(S1(x), S1(y), c),
      rect: (x, y, w, h, c) => raw.rect(S1(x), S1(y), SW(w), SW(h), c),
      round: (x, y, w, h, r, c) => raw.round(S1(x), S1(y), SW(w), SW(h), Math.max(1, r * k), c),
      line: (a, b, c2, d, e) => raw.line(S1(a), S1(b), S1(c2), S1(d), e),
      spike: (x, y, w, h, d, c) => raw.spike(S1(x), S1(y), SW(w), SW(h), d, c),
      disc: (x, y, r, c) => raw.disc(S1(x), S1(y), Math.max(1, r * k), c),
      ellipse: (x, y, rx, ry, c) => raw.ellipse(S1(x), S1(y), Math.max(1, rx * k), Math.max(1, ry * k), c),
      shade: (a, b, dx, dy) => raw.shade(a, b, dx, dy),
      outline: (c) => raw.outline(c)
    };
  }

  /* ---------------------------------------------------------------- helpers */
  function windows(p, x, y, cols, rows, on, gap) {
    gap = gap || 10;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      p.rect(x + i * gap, y + j * gap, 6, 7, on ? P.warm : '#2a2440');
      if (on) p.rect(x + i * gap, y + j * gap, 6, 2, '#fff7d8');
    }
  }
  function lamp(p, x, y, col) { p.disc(x, y, 3, col); p.set(x - 1, y - 1, '#ffffff'); }
  function pipeH(p, x, y, w) { p.rect(x, y, w, 4, P.steelD); p.rect(x, y, w, 1, P.steel); p.rect(x, y + 3, w, 1, P.steelDD); }
  function pipeV(p, x, y, h) { p.rect(x, y, 4, h, P.steelD); p.rect(x, y, 1, h, P.steel); p.rect(x + 3, y, 1, h, P.steelDD); }
  function girder(p, x0, y0, x1, y1) { p.line(x0, y0, x1, y1, P.steel); p.line(x0 + 1, y0, x1 + 1, y1, P.steelDD); }

  /* ------------------------------------------------------- the rock house
     One room hacked out of moon rock. A desk with a stolen human computer, a
     bed of moss, a fridge full of nothing, a door out to the saucer. */
  function houseWall(w, h) {
    const p = pix(w, h);
    // rough rock, lumpy courses
    p.rect(0, 0, w, h, '#4a4260');
    for (let y = 0; y < h; y += 14) {
      for (let x = (y % 28 ? 0 : 9); x < w; x += 26) {
        const ww = 22 + ((x + y) % 3) * 3;
        p.round(x, y, ww, 12, 3, (x + y) % 7 < 3 ? '#544b6e' : '#463e5c');
        p.rect(x + 1, y + 1, ww - 2, 2, '#5f5680');
        p.rect(x + 1, y + 10, ww - 2, 1, '#332e4a');
      }
    }
    // damp patches and scratches
    for (let i = 0; i < 40; i++) {
      const x = (U.hash2(i, 3) * w) | 0, y = (U.hash2(i, 9) * h) | 0;
      p.rect(x, y, 2 + (i % 3), 1, '#3a3450');
    }
    return p;
  }
  function floorSlab(w) {
    const p = pix(w, 26);
    p.rect(0, 0, w, 26, '#3a3450');
    p.rect(0, 0, w, 3, '#6b6480');
    for (let x = 0; x < w; x += 18) { p.rect(x, 3, 1, 23, '#2e2842'); p.rect(x + 3, 6, 8, 1, '#463e5c'); }
    return p;
  }
  /* The desk: a slab on crates, with the human computer on top. */
  function deskProp(on) {
    const p = pix(120, 78);
    p.round(0, 30, 120, 10, 3, '#7a5a3a');                 // desktop
    p.rect(2, 32, 116, 3, '#9c7a52');
    p.round(6, 40, 20, 38, 3, '#5a4a3a');                  // crate legs
    p.round(94, 40, 20, 38, 3, '#5a4a3a');
    for (let i = 0; i < 3; i++) { p.rect(8, 46 + i * 10, 16, 2, '#3f3226'); p.rect(96, 46 + i * 10, 16, 2, '#3f3226'); }
    // the tower, on its side, wires everywhere
    p.round(76, 8, 30, 24, 2, '#c9c4b4');
    p.rect(78, 10, 26, 3, '#a8a294');
    p.disc(96, 26, 3, on ? '#8affa0' : '#5a5a4a');
    p.rect(80, 18, 12, 2, '#8a8478'); p.rect(80, 22, 8, 2, '#8a8478');
    // monitor: a fat beige CRT
    p.round(16, 0, 56, 34, 4, '#d6d0bc');
    p.shade('#d6d0bc', '#a8a294', 0, 1);
    p.round(20, 4, 48, 24, 2, on ? '#1a3a52' : '#20201c');
    if (on) {
      p.rect(22, 6, 44, 2, '#39ffa6');
      for (let i = 0; i < 4; i++) p.rect(24, 12 + i * 4, 10 + i * 7, 2, i % 2 ? '#58e8ff' : '#8affa0');
    }
    p.round(34, 30, 20, 6, 2, '#c4bea8');                   // stand
    p.round(28, 34, 32, 4, 2, '#b0aa96');
    // keyboard and mouse
    p.round(20, 38, 44, 10, 2, '#c9c4b4');
    for (let j = 0; j < 2; j++) for (let i = 0; i < 10; i++) p.rect(23 + i * 4, 40 + j * 4, 3, 3, '#8a8478');
    p.round(70, 40, 10, 8, 3, '#c9c4b4');
    p.rect(73, 41, 4, 3, '#8a8478');
    // clutter: mug, a bone, sticky notes
    p.round(4, 22, 10, 9, 3, '#5ad0e8'); p.rect(13, 24, 4, 4, '#5ad0e8');
    p.rect(6, 20, 6, 2, '#8affa0');
    p.rect(64, 26, 10, 4, '#e8dfc4');
    p.rect(2, 12, 8, 8, '#ffe98a'); p.rect(3, 14, 6, 1, '#c9a04d'); p.rect(3, 16, 5, 1, '#c9a04d');
    p.outline(P.ink);
    return p;
  }
  /* The parked UFO is the same saucer that flies: see art.js. */

  /* Junk that lives in the room. */
  function fridge(f) {
    const p = pix(46, 78);
    p.round(0, 0, 46, 78, 4, '#c9c4b4');
    p.shade('#c9c4b4', '#8a8478', 0, 1);
    p.rect(2, 30, 42, 2, '#8a8478');
    p.round(36, 12, 6, 14, 2, '#8a8478'); p.round(36, 40, 6, 14, 2, '#8a8478');
    p.rect(6, 6, 14, 10, '#ffe98a'); p.rect(8, 9, 10, 1, '#c9a04d'); p.rect(8, 12, 7, 1, '#c9a04d');
    p.rect(8, 40, 10, 12, '#ff8ab0'); p.rect(22, 46, 12, 8, '#8affa0');
    p.disc(12, 60, 4, '#58e8ff');
    p.outline(P.ink);
    return p;
  }
  function mossBed() {
    const p = pix(76, 34);
    p.round(0, 12, 76, 22, 6, '#3f5a2c');
    p.round(4, 8, 68, 12, 6, '#5a7a3a');
    for (let i = 0; i < 14; i++) p.disc(6 + i * 5, 10 + (i % 3), 3, i % 2 ? '#6b8a4a' : '#4a6a32');
    p.round(52, 2, 22, 12, 5, '#c9c4b4');                 // a folded sack for a pillow
    p.outline(P.ink);
    return p;
  }
  function junkPile(k) {
    const p = pix(58, 40);
    if (k === 0) {
      p.round(2, 18, 28, 20, 3, '#6b4530'); p.rect(4, 22, 24, 2, '#8a5a3a');
      p.round(24, 10, 22, 26, 3, '#5a4a3a'); p.rect(26, 14, 18, 2, '#7a6a52');
      p.disc(46, 30, 8, '#8e86a8');
    } else if (k === 1) {
      p.round(0, 24, 56, 14, 4, '#4a4260');
      for (let i = 0; i < 5; i++) p.round(4 + i * 11, 12 + (i % 3) * 4, 10, 14, 3, i % 2 ? '#8e86a8' : '#6b6480');
      p.rect(20, 6, 3, 12, P.steelD); p.ellipse(22, 5, 8, 4, P.steelD);
    } else {
      p.round(6, 20, 44, 18, 5, '#c9c4b4');               // a dead human television
      p.round(10, 24, 30, 12, 2, '#20201c');
      p.rect(12, 26, 26, 1, '#4a4a3a');
      p.rect(42, 22, 3, 10, '#8a8478');
      p.rect(20, 12, 2, 10, P.steelD); p.rect(30, 8, 2, 14, P.steelD);
    }
    p.outline(P.ink);
    return p;
  }
  /* A poster of a human thing he does not understand. */
  function poster(k) {
    const p = pix(34, 44);
    p.round(0, 0, 34, 44, 2, '#e8dfc4');
    p.rect(2, 2, 30, 30, k === 0 ? '#3a5a8a' : (k === 1 ? '#5a3a6a' : '#8a5a3a'));
    if (k === 0) { p.disc(17, 16, 9, '#ffe98a'); p.rect(8, 24, 18, 3, '#2a4a6a'); }
    else if (k === 1) { p.round(10, 8, 14, 18, 6, '#e8dfc4'); p.rect(13, 14, 3, 4, '#2a2440'); p.rect(19, 14, 3, 4, '#2a2440'); }
    else { for (let i = 0; i < 4; i++) p.rect(5 + i * 7, 8 + (i % 2) * 6, 5, 16, '#c9c4b4'); }
    p.rect(4, 35, 26, 2, '#8a8478'); p.rect(4, 39, 16, 2, '#8a8478');
    p.outline(P.ink);
    return p;
  }

  /* ------------------------------------------------------- the rock house
     Seen from outside on an empty moon: a heap of quarried slabs with a hole
     knocked in the front for a door, a crooked chimney, one lit window, and
     every bit of junk he could not be bothered to carry inside stacked
     against the walls. */
  function houseOut(lit) {
    const p = pix(300, 210);
    const R1 = '#6b6480', R2 = '#5a5474', R3 = '#4a4460', R4 = '#3a3450', RL = '#8e86a8';
    const base = 208;
    // the body: courses of big rough slabs, narrowing as they go up
    for (let row = 0; row < 11; row++) {
      const y = base - 18 - row * 16;
      const inset = row < 7 ? row * 4 : 28 + (row - 7) * 12;
      const x0 = 26 + inset, x1 = 274 - inset;
      for (let x = x0; x < x1; x += 30) {
        const w = Math.min(28, x1 - x);
        const h = 15 + ((x + row) % 3);
        const c = [R1, R2, R3][(x / 30 + row) % 3 | 0];
        p.round(x, y, w, h, 3, c);
        p.rect(x + 1, y + 1, w - 2, 2, RL);
        p.rect(x + 1, y + h - 2, w - 2, 1, R4);
      }
    }
    // a lumpy roof cap
    p.round(120, base - 200, 60, 22, 8, R2);
    p.round(128, base - 206, 44, 14, 6, R1);
    p.rect(132, base - 204, 36, 3, RL);
    // the doorway: a knocked-through hole with a heavy lintel
    p.round(120, base - 76, 60, 76, 6, '#120e1c');
    p.rect(118, base - 82, 64, 8, R4);
    p.rect(118, base - 82, 64, 3, RL);
    for (let i = 0; i < 5; i++) p.rect(120 + i * 13, base - 79, 10, 5, R2);
    // rubber door strips
    for (let i = 0; i < 7; i++) {
      const cx2 = 124 + i * 8, len = 40 + (i % 3) * 10;
      p.rect(cx2, base - 74, 6, len, i % 2 ? '#3f3856' : '#4a4260');
      p.rect(cx2, base - 74, 6, 2, '#8e86a8');
    }
    // warm light spilling out of the door
    if (lit) { p.rect(120, base - 22, 60, 22, '#3a3020'); p.rect(126, base - 12, 48, 12, '#4a3a22'); }
    // one window, lit, with a bent frame
    p.round(56, base - 112, 40, 34, 4, '#241f36');
    p.round(60, base - 108, 32, 26, 3, lit ? '#ffe9a8' : '#2a2440');
    if (lit) { p.rect(62, base - 106, 28, 4, '#fff7d8'); p.rect(62, base - 92, 12, 10, '#e0c96a'); }
    p.rect(54, base - 96, 44, 3, R4);
    p.rect(74, base - 112, 3, 34, R4);
    // a crooked chimney with a dish taped to it
    p.round(196, base - 168, 26, 44, 4, R2);
    p.round(200, base - 176, 20, 12, 4, R3);
    p.rect(202, base - 174, 16, 3, R4);
    p.rect(214, base - 176, 3, 26, P.steelD);
    p.round(206, base - 190, 22, 8, 4, '#8e86a8');
    p.round(210, base - 189, 14, 5, 2, '#c9c4b4');
    p.rect(210, base - 182, 12, 3, '#ffe98a');
    // cables strung down the front and taped on
    girder(p, 214, base - 150, 186, base - 100);
    p.rect(184, base - 104, 10, 4, '#ffe98a');
    // junk stacked against the walls: crates, a barrel, a dead television
    p.round(10, base - 34, 32, 34, 3, '#6b4530');
    p.rect(12, base - 30, 28, 3, '#8a5a3a'); p.rect(12, base - 18, 28, 3, '#8a5a3a');
    p.round(4, base - 62, 26, 28, 3, '#5a4a3a');
    p.rect(6, base - 58, 22, 2, '#7a6a52');
    p.round(46, base - 26, 26, 26, 3, '#4a4260');
    p.round(50, base - 22, 18, 14, 2, '#20201c');
    p.rect(52, base - 20, 14, 2, '#4a4a3a');
    p.rect(56, base - 34, 2, 10, P.steelD); p.rect(64, base - 38, 2, 14, P.steelD);
    p.round(232, base - 30, 30, 30, 4, '#8a5a3a');
    p.rect(234, base - 26, 26, 3, '#6b4530');
    p.rect(234, base - 14, 26, 3, '#6b4530');
    p.round(266, base - 20, 22, 20, 3, '#4a4260');
    // a hand-painted sign nailed over the door
    p.round(112, base - 104, 76, 20, 3, '#7a5a3a');
    p.rect(114, base - 102, 72, 3, '#9c7a52');
    p.rect(114, base - 88, 72, 2, '#4a3020');
    p.rect(146, base - 84, 3, 4, '#4a4260');
    p.outline(P.ink);
    return p;
  }

  /* ---------------------------------------------------------- the moon rat
     Enormously fat, permanently chewing, and the only other living thing for
     four hundred million kilometres. */
  /* Three quarters of the size he used to be: he was as big as the alien,
     which made him a co-star rather than a pet. */
  const RAT_K = 0.72;
  function moonRat(f, fed) {
    const sheet = pix(58, 40);
    const p = scalePix(sheet, RAT_K);
    const FUR = '#9c94b4', FURD = '#6b6480', FURL = '#c9bce8', PINK = '#ff9ecb';
    const squash = f === 1 ? 1 : 0;
    // the tail, thick as an arm
    p.line(8, 38 - squash, 2, 30, PINK); p.line(9, 39 - squash, 3, 31, PINK);
    p.line(2, 30, 6, 22, PINK); p.line(3, 31, 7, 23, PINK);
    // the body: a great faceted lump
    p.ellipse(36, 30 + squash, 26, 16 - squash, FUR);
    p.shade(FUR, FURD, 0, 1);
    p.ellipse(34, 22 + squash, 18, 7, FURL);
    // a belly that reaches the floor
    p.ellipse(36, 40, 22, 7, FURD);
    // stubby legs, mostly decorative
    p.round(18, 42, 9, 6, 2, PINK); p.round(48, 42, 9, 6, 2, PINK);
    // the head, wedged straight on to the body
    p.ellipse(56, 26 + squash, 15, 13, FUR);
    p.shade(FUR, FURD, 0, 1);
    p.round(46, 14 + squash, 14, 13, 5, PINK);           // ears
    p.round(58, 12 + squash, 14, 13, 5, PINK);
    p.round(49, 17 + squash, 8, 7, 3, '#e8b0d0');
    p.round(61, 15 + squash, 8, 7, 3, '#e8b0d0');
    // a snout, two buck teeth and a very small brain behind it
    p.round(62, 26 + squash, 10, 10, 4, FURL);
    p.round(68, 30 + squash, 4, 4, 2, PINK);             // nose
    p.rect(64, 34 + squash, 3, 5, '#ffffff');            // teeth
    p.rect(68, 34 + squash, 3, 5, '#ffffff');
    if (fed) {                                           // content, eyes shut
      p.rect(52, 26 + squash, 7, 2, C.ink);
      p.rect(63, 24 + squash, 6, 2, C.ink);
    } else {
      p.round(51, 23 + squash, 8, 9, 3, '#ffffff');
      p.round(53, 25 + squash, 5, 6, 2, C.eye);
      p.set(54, 26 + squash, '#ffffff');
      p.round(63, 22 + squash, 6, 7, 2, '#ffffff');
      p.round(64, 24 + squash, 4, 4, 2, C.eye);
    }
    // whiskers
    p.line(60, 33 + squash, 70, 30 + squash, FURD);
    p.line(60, 35 + squash, 71, 36 + squash, FURD);
    p.line(60, 34 + squash, 69, 40 + squash, FURD);
    sheet.outline(P.ink);
    return sheet;
  }

  /* A wedge of something yellow he found in the pod. It is not cheese. */
  function cheese(bitten) {
    const p = pix(40, 30);
    p.round(2, 8, 36, 20, 4, '#ffd34d');
    p.round(4, 6, 32, 8, 3, '#ffe98a');
    p.shade('#ffd34d', '#c99a1e', 0, 1);
    p.round(8, 14, 7, 7, 3, '#c99a1e');
    p.round(22, 18, 6, 6, 2, '#c99a1e');
    p.round(28, 11, 5, 5, 2, '#c99a1e');
    p.round(15, 22, 4, 4, 2, '#c99a1e');
    if (bitten) { p.round(26, 4, 14, 14, 6, null); p.round(24, 6, 16, 12, 5, '#8a6a2a'); }
    p.outline(P.ink);
    return p;
  }

  /* Mess. He does not tidy, and there is nobody to tell him to. */
  function litter(k) {
    const p = pix(40, 26);
    if (k === 0) {                                        // a heap of empty cans
      for (let i = 0; i < 5; i++) {
        const x = 2 + (i % 3) * 12, y = 14 - ((i / 3) | 0) * 9;
        p.round(x, y, 9, 12, 2, i % 2 ? '#8e86a8' : '#c46a3a');
        p.rect(x + 1, y + 1, 7, 2, '#c9bce8');
        p.rect(x + 2, y + 6, 5, 1, '#5a5474');
      }
    } else if (k === 1) {                                 // a stack of dirty plates
      for (let i = 0; i < 4; i++) {
        p.round(4 + i, 20 - i * 4, 30 - i * 2, 5, 2, i % 2 ? '#c9c4b4' : '#e8dfc4');
        p.rect(6 + i, 21 - i * 4, 26 - i * 2, 1, '#a89b78');
      }
      p.round(24, 2, 8, 8, 3, '#8affa0');                 // something living on top
    } else if (k === 2) {                                 // a bucket under a drip
      p.round(8, 8, 24, 18, 3, '#8e86a8');
      p.round(10, 10, 20, 6, 2, '#3f5a2c');
      p.rect(8, 12, 24, 2, '#c9bce8');
      p.round(4, 4, 4, 10, 2, '#5a5474');
    } else {                                              // a sock, and a boot
      p.round(2, 12, 20, 12, 4, '#c4553a');
      p.round(2, 8, 9, 8, 3, '#c4553a');
      p.round(24, 14, 14, 10, 3, '#3a3348');
      p.rect(24, 22, 16, 3, '#241f2e');
    }
    p.outline(P.ink);
    return p;
  }

  /* --------------------------------------------------------------- scenery */
  function survey() {
    const p = pix(60, 40);
    p.rect(28, 6, 4, 34, '#8a5a3a');
    p.round(22, 4, 16, 10, 3, P.holo);
    p.rect(26, 7, 8, 4, '#0b0720');
    for (let i = 0; i < 5; i++) { p.rect(4 + i * 12, 34 + (i % 2) * 2, 6, 2, i % 2 ? P.rose : P.amber); p.rect(4 + i * 12, 26, 1, 10, P.steelDD); }
    p.outline(P.ink);
    return p;
  }
  function ruin(kind) {
    const p = pix(84, 84);
    if (kind === 0) {
      p.round(4, 26, 16, 58, 4, P.bone); p.round(60, 34, 16, 50, 4, P.bone);
      for (let i = 0; i < 26; i++) { const a = Math.PI + i / 25 * Math.PI; p.disc(40 + Math.cos(a) * 32, 34 + Math.sin(a) * 20, 6, i < 15 ? P.bone : P.boneD); }
      p.rect(8, 40, 6, 36, P.boneD); p.rect(64, 48, 6, 30, P.boneD);
      p.rect(10, 30, 4, 4, P.rose);
    } else if (kind === 1) {
      p.round(0, 62, 72, 20, 8, P.bone); p.rect(8, 66, 56, 3, P.boneD); p.rect(8, 74, 56, 2, P.boneD);
      p.round(12, 40, 20, 26, 6, P.boneD); p.disc(52, 52, 9, P.bone); p.rect(48, 50, 8, 2, P.rose);
    } else {
      p.round(26, 4, 28, 78, 6, P.bone); p.shade(P.bone, P.boneD, 0, 1);
      p.rect(30, 12, 20, 4, P.rose); p.rect(30, 24, 20, 4, P.rose); p.rect(34, 36, 12, 4, P.glow); p.rect(30, 48, 20, 4, P.rose);
      p.round(20, 72, 40, 12, 4, P.boneD);
    }
    p.outline(P.ink);
    return p;
  }
  function critter(f, col, colD) {
    const p = pix(32, 30);
    const y = f ? 2 : 4;
    p.ellipse(16, y + 15, 12, 10, col);
    p.shade(col, colD, 0, 1);
    p.ellipse(16, y + 9, 8, 4, '#ffffff');
    p.ellipse(12, y + 13, 3, 3.6, C.eye); p.ellipse(20, y + 13, 3, 3.6, C.eye);
    p.disc(13, y + 12, 1.2, '#ffffff'); p.disc(21, y + 12, 1.2, '#ffffff');
    p.rect(14, y + 18, 4, 1, colD);
    p.round(7, y + 23, 7, 5, 2, P.ink); p.round(18, y + 23, 7, 5, 2, P.ink);
    p.line(16, y + 4, 16 + (f ? 4 : -4), y - 3, P.ink);
    p.disc(16 + (f ? 4 : -4), y - 4, 3, P.amber);
    p.ellipse(8, y + 16, 2, 1.4, '#ff8ab0'); p.ellipse(24, y + 16, 2, 1.4, '#ff8ab0');
    p.outline(P.ink);
    return p;
  }
  function flag(f) {
    const p = pix(28, 52);
    p.rect(4, 0, 4, 52, P.steelD);
    for (let i = 0; i < 16; i++) p.rect(8 + i, 6 + Math.floor(Math.sin(i * 0.5 + (f ? 1.5 : 0)) * 2.4), 1, 16, i < 8 ? P.rose : P.amber);
    p.outline(P.ink);
    return p;
  }
  function rock(k) {
    const p = pix(40, 26);
    const r = 8 + k * 4;
    p.ellipse(20, 16, r, r * 0.7, P.rock);
    p.shade(P.rock, P.rockD, 0, 1);
    p.ellipse(16, 10, r * 0.5, r * 0.25, P.rockL);
    p.set(24, 14, P.rockD); p.set(12, 18, P.rockD);
    p.outline(P.ink);
    return p;
  }

  /* ------------------------------------------------------------- portraits
     The people who buy your rocks, as pixel busts. Three frames each: mouth
     shut, mouth open, blinking. */
  function bust(who, f) {
    const p = pix(96, 96);
    const talk = f === 1, blink = f === 2;
    const SK = {
      rikkit:  ['#b07a4a', '#7a4f2c', '#e0b483'],     // a small furious engineer
      twig:    ['#6b8a4a', '#3f5a2c', '#9ac47a'],     // bark and moss
      bluefin: ['#5aa8ff', '#2b5fa8', '#a8d8ff'],     // blue, finned, whistling
      curator: ['#e8e0f0', '#a89ac4', '#ffffff'],     // pale, delighted, wealthy
      nova:    ['#8fb6ff', '#4d6fb8', '#d6e6ff']      // helmeted law
    }[who] || ['#b07a4a', '#7a4f2c', '#e0b483'];
    const CLOTH = { rikkit: '#c4553a', twig: '#4a3a24', bluefin: '#8a2a2a', curator: '#f2f0ff', nova: '#1b2547' }[who] || '#2b3a66';

    p.round(8, 70, 80, 30, 10, CLOTH);
    p.rect(12, 74, 72, 3, who === 'curator' ? '#c9a0ff' : '#ffffff');
    p.round(38, 66, 20, 12, 4, SK[0]);
    p.shade(SK[0], SK[1], 0, 1);
    p.round(20, 14, 56, 56, 16, SK[0]);
    p.shade(SK[0], SK[1], 0, 1);
    p.round(26, 20, 40, 12, 6, SK[2]);

    if (blink) { p.rect(28, 42, 14, 3, C.ink); p.rect(54, 42, 14, 3, C.ink); }
    else {
      p.round(28, 36, 14, 16, 5, '#ffffff');
      p.round(54, 36, 14, 16, 5, '#ffffff');
      p.round(32, 40, 8, 9, 3, C.eye); p.round(58, 40, 8, 9, 3, C.eye);
      p.rect(33, 41, 3, 3, '#ffffff'); p.rect(59, 41, 3, 3, '#ffffff');
    }
    p.rect(27, 31, 16, 3, SK[1]); p.rect(53, 30, 16, 3, SK[1]);
    if (talk) { p.round(38, 56, 20, 10, 4, C.ink); p.rect(41, 58, 14, 3, '#ff8ab0'); }
    else { p.rect(38, 58, 20, 3, C.ink); p.set(37, 57, C.ink); p.set(58, 57, C.ink); }
    p.ellipse(24, 52, 6, 4, '#ff8ab0'); p.ellipse(72, 52, 6, 4, '#ff8ab0');

    if (who === 'rikkit') {
      // round ears, a snout, a stripe down the muzzle, goggles pushed up
      p.round(6, 12, 24, 24, 10, SK[1]); p.round(66, 12, 24, 24, 10, SK[1]);
      p.round(11, 17, 14, 14, 6, '#e8b48a'); p.round(71, 17, 14, 14, 6, '#e8b48a');
      p.round(34, 50, 28, 18, 8, SK[2]);
      p.round(42, 58, 12, 8, 4, C.ink);
      if (talk) { p.round(40, 62, 16, 8, 4, C.ink); p.rect(43, 64, 10, 3, '#ff8ab0'); }
      p.rect(46, 20, 4, 30, SK[2]);
      p.round(18, 22, 60, 10, 4, '#3a3450'); p.round(24, 24, 18, 6, 3, '#58e8ff'); p.round(54, 24, 18, 6, 3, '#58e8ff');
    } else if (who === 'twig') {
      // bark plates, moss, two twigs sprouting, glowing sap eyes
      for (let i = 0; i < 6; i++) p.rect(24 + i * 9, 20, 3, 48, SK[1]);
      p.round(10, 4, 16, 20, 6, SK[1]); p.round(70, 2, 16, 22, 6, SK[1]);
      p.round(12, 0, 8, 10, 3, '#8affa0'); p.round(74, 0, 8, 10, 3, '#8affa0');
      p.round(30, 6, 36, 12, 5, '#5a7a3a');
      p.ellipse(34, 30, 8, 5, '#8affa0'); p.ellipse(64, 26, 6, 4, '#8affa0');
      if (!blink) { p.round(32, 40, 8, 9, 3, '#ffd34d'); p.round(58, 40, 8, 9, 3, '#ffd34d'); }
    } else if (who === 'bluefin') {
      // the red fin, the arrow, the Ravager flame badge
      p.round(40, 0, 16, 22, 6, '#ff5a4d');
      p.round(34, 8, 28, 12, 5, '#c02f2f');
      p.rect(30, 20, 36, 4, '#8a2a2a');
      p.rect(4, 60, 40, 3, P.steel); p.spike(40, 56, 10, 10, -1, P.steel);
      for (let i = 0; i < 3; i++) p.rect(6 + i * 3, 56, 2, 10, '#ff5a4d');
      p.round(66, 70, 18, 14, 5, '#ffd34d'); p.spike(70, 72, 10, 10, -1, '#ff5a4d');
    } else if (who === 'curator') {
      // white coat, high collar, a very pleased little smile, an orb in hand
      p.round(2, 62, 30, 34, 8, '#f2f0ff'); p.round(64, 62, 30, 34, 8, '#f2f0ff');
      p.round(30, 0, 36, 20, 8, '#e8e0f0');
      for (let i = 0; i < 8; i++) p.rect(28 + i * 5, 4, 2, 16, '#c9bce8');
      p.round(70, 76, 20, 20, 8, '#c9a0ff'); p.round(74, 80, 12, 12, 5, '#7d4fd6');
      p.set(78, 82, '#ffffff');
      p.rect(38, 58, 20, 2, C.ink);
    } else {
      // Nova helmet: a gold visor and a starburst crest
      p.round(16, 10, 64, 34, 12, '#1b2547');
      p.round(22, 24, 52, 14, 5, '#ffd34d');
      p.rect(24, 26, 48, 3, '#fff3c0');
      p.round(40, 0, 16, 14, 5, '#ffd34d');
      for (let i = 0; i < 4; i++) p.rect(46 + (i % 2 ? 6 : -8), 2 + i * 3, 6, 2, '#ffd34d');
      p.round(30, 66, 36, 10, 3, '#0f1a30');
    }
    p.outline(P.ink);
    return p;
  }

  /* Your own mitten, resting on a counter. Mirrored for the other side. */
  function mitten(P2) {
    const p = pix(96, 72);
    const skin = P2 ? P2.skin : '#7ff08a', skinD = P2 ? P2.skinD : '#43ba5f';
    p.round(6, 26, 84, 46, 16, '#2b3a66');                     // sleeve
    p.shade('#2b3a66', '#1b2547', 0, 1);
    p.round(10, 22, 76, 10, 4, '#f6f3ff');                     // cuff
    p.round(14, 4, 68, 34, 14, skin);                          // mitten
    p.shade(skin, skinD, 0, 1);
    p.round(20, 8, 40, 10, 5, '#c4ffce');
    p.round(2, 14, 20, 20, 8, skin);                           // thumb
    p.shade(skin, skinD, 0, 1);
    p.rect(30, 30, 34, 2, skinD);
    p.disc(20, 28, 4, P.gold); p.set(19, 27, '#ffffff');       // cufflink
    p.outline(P.ink);
    return p;
  }

  /* The handheld multi-purpose tool, for the corner of the screen. */
  function phone(on) {
    const p = pix(36, 56);
    p.round(2, 2, 32, 52, 6, P.navyD);
    p.round(4, 4, 28, 48, 5, P.navy);
    p.round(6, 8, 24, 34, 3, on ? '#062a33' : '#0b1220');
    if (on) {
      p.rect(9, 12, 18, 3, P.holo); p.rect(9, 18, 12, 2, P.glowD); p.rect(9, 23, 16, 2, P.glowD);
      p.round(9, 28, 18, 10, 2, P.glowD); p.rect(12, 31, 12, 4, P.holo);
    }
    p.disc(18, 47, 3.5, P.steel); p.rect(14, 5, 8, 1, P.steel);
    p.rect(34, 14, 2, 8, P.steelD);
    p.outline(P.ink);
    return p;
  }

  /* The tool as you hold it up: angled body, emitter horn, thumb on the dial. */
  function toolBig(f) {
    const p = pix(150, 120);
    p.round(10, 22, 92, 92, 14, P.navyD);
    p.round(16, 28, 80, 80, 12, P.navy);
    p.round(22, 34, 68, 52, 8, '#07222b');                       // screen
    for (let i = 0; i < 5; i++) p.rect(26, 38 + i * 9, 20 + i * 8, 4, i % 2 ? P.holo : P.glowD);
    p.round(24, 92, 26, 12, 4, P.steelDD); p.round(28, 95, 18, 6, 3, f ? P.lime : P.steelD);
    p.round(58, 90, 32, 16, 6, P.steelDD);                        // dial
    p.disc(74, 98, 6, f ? P.amber : P.steelD);
    p.rect(72, 92, 4, 6, P.gold);
    // emitter horn on the top corner
    p.round(88, 8, 34, 26, 6, P.steelD);
    p.round(94, 12, 22, 16, 4, f ? P.holo : P.glowD);
    p.rect(100, 2, 10, 10, P.steelDD);
    p.disc(105, 6, 3, f ? '#ffffff' : P.glowD);
    // grip ridges down the left
    for (let i = 0; i < 6; i++) p.rect(6, 34 + i * 12, 8, 6, P.steelDD);
    p.outline(P.ink);
    return p;
  }

  /* A hexagonal projector pad the hologram stands on. */
  function holoPad(f) {
    const p = pix(120, 40);
    for (let i = 0; i < 3; i++) {
      const w = 100 - i * 14, x = 60 - w / 2, y = 10 + i * 8;
      p.round(x, y, w, 10, 4, i === f % 3 ? P.holo : P.glowD);
      p.round(x + 6, y + 2, w - 12, 5, 2, '#04141c');
    }
    p.outline(P.ink);
    return p;
  }

  /* The skull you live in: a colossal dead Celestial head half sunk in the
     regolith, jaw open, lights strung through the eye socket. */
  function celestialHead() {
    const p = pix(320, 190);
    const B = '#3a3158', BD = '#2a2342', BL = '#4d4270';
    p.round(20, 30, 280, 150, 40, B);
    p.shade(B, BD, 0, 1);
    p.round(40, 40, 180, 40, 20, BL);                     // brow ridge
    p.round(60, 92, 62, 46, 16, '#150f24');               // eye sockets
    p.round(178, 88, 62, 46, 16, '#150f24');
    p.round(74, 104, 30, 24, 10, '#2a1c3a');
    p.round(192, 100, 30, 24, 10, '#2a1c3a');
    p.disc(92, 116, 7, '#58e8ff'); p.disc(210, 112, 7, '#ff8ad8');   // somebody lives in there
    p.round(140, 128, 34, 30, 10, '#150f24');             // nose cavity
    p.round(60, 158, 190, 26, 8, BD);                     // teeth
    for (let i = 0; i < 9; i++) p.round(66 + i * 21, 156, 15, 22, 4, '#4a4262');
    p.round(246, 60, 54, 70, 18, BL);                     // cheek plate
    for (let i = 0; i < 5; i++) p.rect(252, 70 + i * 12, 42, 4, BD);
    p.round(10, 60, 34, 60, 12, BL);
    p.outline('#191430');
    return p;
  }

  /* The pod's tape deck, for the docks. */
  function tapeDeck(f) {
    const p = pix(64, 40);
    p.round(0, 0, 64, 40, 6, '#2b3a66');
    p.shade('#2b3a66', '#1b2547', 0, 1);
    p.round(6, 6, 52, 20, 4, '#c9a06a');
    p.round(10, 10, 44, 12, 3, '#8a5a3a');
    p.disc(22, 16, 5, '#2a1c3a'); p.disc(42, 16, 5, '#2a1c3a');
    p.disc(22, 16, 2, f ? '#ffd34d' : '#6b4a3a'); p.disc(42, 16, 2, f ? '#ffd34d' : '#6b4a3a');
    p.rect(12, 14, 8, 1, '#3a2417'); p.rect(44, 18, 8, 1, '#3a2417');
    for (let i = 0; i < 5; i++) p.rect(8 + i * 11, 30, 8, 5, i === (f ? 1 : 3) ? '#8affa0' : '#39405e');
    p.outline(P.ink);
    return p;
  }

  /* The big brain for the Mind screen, drawn large. */
  /* A brain. Lumpy, folded, faceted -- built out of overlapping bevelled
     blocks rather than curves, with a crease down the middle and a stem. */
  function brainLobes(p, cx, cy, r, c, cd, cl) {
    const lump = (x, y, w, h) => {
      p.round(x, y, w, h, Math.min(w, h) / 3 | 0, c);
      p.rect(x + 2, y + 1, w - 4, 2, cl);
      p.rect(x + 2, y + h - 2, w - 4, 1, cd);
    };
    lump(cx - r, cy - r * 0.72, r * 2, r * 1.5);
    lump(cx - r * 0.86, cy - r, r * 0.92, r * 0.78);
    lump(cx - r * 0.04, cy - r * 1.02, r * 0.9, r * 0.8);
    lump(cx - r * 0.72, cy + r * 0.34, r * 0.8, r * 0.62);
    lump(cx - r * 0.02, cy + r * 0.38, r * 0.78, r * 0.6);
    // the crease, and the folds either side of it
    p.rect(cx - 2, cy - r * 0.98, 4, r * 1.9, cd);
    for (let i = 0; i < 5; i++) {
      const yy = cy - r * 0.7 + i * r * 0.34;
      p.rect(cx - r * 0.92, yy, r * 0.8, 2, cd);
      p.rect(cx + r * 0.12, yy + 3, r * 0.8, 2, cd);
      p.rect(cx - r * 0.9, yy + 2, r * 0.7, 1, cl);
      p.rect(cx + r * 0.14, yy + 5, r * 0.7, 1, cl);
    }
    // the stem, dangling out of the bottom
    p.round(cx - 5, cy + r * 0.92, 10, r * 0.5, 3, cd);
    p.rect(cx - 3, cy + r * 0.96, 4, r * 0.4, c);
  }

  /* THE BRAIN IN THE JAR. It knows everything, it is in a bucket of acid, and
     it is wired to a keyboard he cannot use. This is the skill tree.
     Built like a piece of salvage: a heavy base, two posts, metal straps
     across the glass and a bolted lid, so it reads as a tank and not as a
     green rectangle. */
  function brainJar(f) {
    const p = pix(112, 150);
    const base = 148;
    const GL = '#cdeeff', GLD = '#4d7ea0';
    const glassTop = 30, glassBot = base - 26;
    // the plinth, on stubby feet
    p.round(2, base - 24, 108, 20, 3, P.steelD);
    p.rect(4, base - 22, 104, 3, P.steel);
    p.rect(4, base - 8, 104, 4, P.steelDD);
    p.rect(8, base - 4, 14, 4, P.steelDD);
    p.rect(90, base - 4, 14, 4, P.steelDD);
    // the acid, dark at the bottom where the sludge has settled
    p.rect(20, glassTop, 72, glassBot - glassTop, P.acidD);
    p.rect(23, glassTop + 3, 66, glassBot - glassTop - 6, P.acid);
    p.rect(23, glassBot - 14, 66, 11, '#12503a');
    p.rect(23, glassTop + 3 + (f % 2), 66, 3, '#a8ffd0');
    brainLobes(p, 56, 66 + (f === 1 ? -2 : 0), 24, P.brain, P.brainD, P.brainL);
    // bubbles, rising in whole-pixel steps
    for (let i = 0; i < 8; i++) {
      const bx = 26 + ((i * 27) % 58);
      const by = glassBot - 16 - ((i * 19 + f * 15) % (glassBot - glassTop - 24));
      p.round(bx, by, 4, 4, 1, '#d8fff0');
      p.set(bx + 1, by + 1, '#ffffff');
    }
    // the glass itself: a bright column down one side, a dull one down the other
    p.rect(24, glassTop + 6, 3, glassBot - glassTop - 20, GL);
    p.rect(85, glassTop + 12, 2, glassBot - glassTop - 30, '#7ec0e0');
    // two posts, front and back, holding the whole thing together
    p.round(6, 26, 15, glassBot - 20, 3, P.steelD);
    p.rect(9, 30, 4, glassBot - 30, P.steel);
    p.round(91, 26, 15, glassBot - 20, 3, P.steelD);
    p.rect(94, 30, 4, glassBot - 30, P.steelDD);
    // metal straps across the glass -- the thing that makes it read as a tank
    for (const sy of [glassTop + 4, glassBot - 18]) {
      p.rect(14, sy, 84, 7, P.steelD);
      p.rect(14, sy, 84, 2, P.steel);
      p.rect(14, sy + 6, 84, 1, P.steelDD);
      p.rect(18, sy + 2, 4, 3, P.steelDD);
      p.rect(90, sy + 2, 4, 3, P.steelDD);
    }
    // the lid: bolted down, with a hose taped into it
    p.round(2, 12, 108, 18, 4, P.steelD);
    p.rect(4, 14, 104, 3, P.steel);
    p.rect(4, 27, 104, 2, P.steelDD);
    for (let i = 0; i < 6; i++) { p.rect(10 + i * 18, 18, 6, 6, P.steelDD); p.rect(10 + i * 18, 18, 6, 2, P.steel); }
    p.round(44, 2, 22, 12, 3, P.steelDD);
    p.rect(48, 4, 6, 8, P.steel);
    girder(p, 66, 6, 104, 0);
    // a dial that has never moved and a label nobody can read
    p.round(6, glassBot - 14, 16, 16, 5, P.steelDD);
    p.round(9, glassBot - 11, 10, 10, 3, P.warm);
    p.line(14, glassBot - 6, 17, glassBot - 10, P.ink);
    p.round(28, glassBot - 12, 44, 12, 3, P.warm);
    p.rect(31, glassBot - 9, 38, 2, '#8a7a52');
    p.rect(31, glassBot - 5, 26, 2, '#8a7a52');
    // a stolen keyboard on a bracket, at brain height
    p.round(74, glassBot - 12, 34, 9, 2, '#ded7bf');
    p.rect(76, glassBot - 10, 30, 2, '#f4efdc');
    for (let i = 0; i < 6; i++) p.rect(78 + i * 5, glassBot - 7, 3, 3, '#9d9682');
    p.outline(P.ink);
    return p;
  }

  /* A SMALL rock hut. The moon it stands on is only a couple of hundred
     pixels across now, so the house had to come down with it. */
  function houseSmall(lit) {
    const p = pix(190, 150);
    const R1 = '#6b6480', R2 = '#5a5474', R3 = '#4a4460', R4 = '#3a3450', RL = '#8e86a8';
    const base = 148;
    for (let row = 0; row < 7; row++) {
      const y = base - 16 - row * 16;
      const inset = row < 4 ? row * 5 : 20 + (row - 4) * 14;
      const x0 = 18 + inset, x1 = 172 - inset;
      for (let x = x0; x < x1; x += 26) {
        const w = Math.min(24, x1 - x);
        if (w < 6) continue;
        const h = 15 + ((x + row) % 3);
        const c = [R1, R2, R3][(x / 26 + row) % 3 | 0];
        p.round(x, y, w, h, 3, c);
        p.rect(x + 1, y + 1, w - 2, 2, RL);
        p.rect(x + 1, y + h - 2, w - 2, 1, R4);
      }
    }
    // a lumpy cap and a crooked chimney with a dish taped on
    p.round(74, base - 132, 44, 18, 7, R2);
    p.round(82, base - 137, 30, 12, 5, R1);
    p.rect(86, base - 135, 22, 3, RL);
    p.round(126, base - 116, 20, 34, 4, R2);
    p.round(129, base - 123, 16, 11, 4, R3);
    p.rect(138, base - 128, 3, 16, P.steelD);
    p.round(132, base - 136, 18, 7, 3, '#8e86a8');
    p.rect(135, base - 130, 10, 3, '#ffe98a');
    // the doorway, with rubber strips
    p.round(78, base - 58, 44, 58, 5, '#120e1c');
    p.rect(76, base - 63, 48, 7, R4);
    p.rect(76, base - 63, 48, 3, RL);
    for (let i = 0; i < 6; i++) {
      const cx2 = 80 + i * 7, len = 30 + (i % 3) * 8;
      p.rect(cx2, base - 56, 5, len, i % 2 ? '#3f3856' : '#4a4260');
      p.rect(cx2, base - 56, 5, 2, '#8e86a8');
    }
    if (lit) { p.rect(78, base - 18, 44, 18, '#3a3020'); p.rect(84, base - 10, 32, 10, '#4a3a22'); }
    // one window, and the sign over the door
    p.round(34, base - 84, 30, 26, 4, '#241f36');
    p.round(37, base - 81, 24, 20, 3, lit ? '#ffe9a8' : '#2a2440');
    if (lit) { p.rect(39, base - 79, 20, 3, '#fff7d8'); p.rect(39, base - 69, 9, 7, '#e0c96a'); }
    p.rect(33, base - 72, 32, 3, R4);
    p.round(72, base - 79, 56, 16, 3, '#7a5a3a');
    p.rect(74, base - 77, 52, 3, '#9c7a52');
    p.rect(74, base - 67, 52, 2, '#4a3020');
    // junk piled against it
    p.round(6, base - 26, 24, 26, 3, '#6b4530');
    p.rect(8, base - 22, 20, 3, '#8a5a3a');
    p.round(150, base - 22, 24, 22, 3, '#8a5a3a');
    p.rect(152, base - 18, 20, 3, '#6b4530');
    p.round(168, base - 15, 18, 15, 3, '#4a4260');
    p.outline(P.ink);
    return p;
  }

  /* ------------------------------------------------------------- buildMoon */
  /* The moon disc, rasterised with integer scanlines at a low resolution and
     blown up: hard pixel steps all the way round, never a smooth circle. */
  function pxDisc(c, cx, cy, r, col) {
    c.fillStyle = col;
    const r2 = r;
    for (let y = Math.ceil(cy - r); y <= Math.floor(cy + r); y++) {
      const dy = Math.abs(y - cy + 0.5) / r2;
      if (dy > 1) continue;
      const w = r2 * Math.sqrt(Math.max(0, 1 - dy * dy));
      const x0 = Math.round(cx - w), x1 = Math.round(cx + w);
      if (x1 > x0) c.fillRect(x0, y, x1 - x0, 1);
    }
  }
  /* A WORLD. Rasterised at half size and blown up, so every feature is a hard
     block of pixels, and painted differently depending on what kind of place
     it is: a cratered rock, an ice ball with caps, a living world with
     continents and weather, a furnace cracked open, a cut gemstone, a plated
     machine-moon. All of it deterministic from the seed. */
  function buildPlanet(size, tint, seed, type) {
    const K = 2;
    const S = Math.max(10, Math.round(size / K));
    const src = document.createElement('canvas');
    src.width = src.height = S;
    const c = src.getContext('2d');
    const r = S / 2 - 0.5, cx = S / 2, cy = S / 2;
    const rnd = U.mulberry32(seed || 7);
    const px = (v) => Math.max(1, Math.round(v));
    function shade(col, f) {
      const n = parseInt(col.slice(1), 16);
      const R = U.clamp(((n >> 16) & 255) * f, 0, 255) | 0, G = U.clamp(((n >> 8) & 255) * f, 0, 255) | 0, B = U.clamp((n & 255) * f, 0, 255) | 0;
      return 'rgb(' + R + ',' + G + ',' + B + ')';
    }
    /* Every feature is clipped to the disc, so nothing spills off the limb. */
    const inside = (x, y, k) => U.dist(x, y, cx, cy) < r * (k === undefined ? 0.98 : k);

    pxDisc(c, cx, cy, r, shade(tint, 0.78));
    c.save();
    c.beginPath(); c.rect(0, 0, S, S); c.clip();

    /* ---- the ground itself, per kind ---- */
    const craters = (n, big) => {
      for (let i = 0; i < n; i++) {
        const a = rnd() * U.TAU, d = Math.sqrt(rnd()) * r * 0.88;
        const kx = cx + Math.cos(a) * d, ky = cy + Math.sin(a) * d;
        const kr = Math.max(1, (0.4 + rnd() * rnd() * (big ? 3 : 2.2)) * (S / 24));
        if (!inside(kx, ky, 0.92)) continue;
        pxDisc(c, kx, ky - kr * 0.2, kr, shade(tint, 1.12));          // sunlit rim
        pxDisc(c, kx, ky + kr * 0.25, kr * 0.7, shade(tint, 0.42));   // floor
        if (kr > S / 14) {                                            // and ejecta
          for (let q = 0; q < 5; q++) {
            const ea = rnd() * U.TAU, ed = kr * (1.2 + rnd());
            const ex = kx + Math.cos(ea) * ed, ey = ky + Math.sin(ea) * ed;
            if (inside(ex, ey)) { c.fillStyle = shade(tint, 1.2); c.fillRect(ex | 0, ey | 0, 1, 1); }
          }
        }
      }
    };
    const maria = (n, f) => {
      for (let i = 0; i < n; i++) {
        const a = rnd() * U.TAU, d = rnd() * r * 0.62;
        pxDisc(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (0.14 + rnd() * 0.24), shade(tint, f + rnd() * 0.1));
      }
    };
    /* Latitude bands: whole-pixel rows, so a striped world stays striped. */
    const bands = (cols, h) => {
      for (let y = 0; y < S; y++) {
        const f = (y / S);
        const col = cols[Math.floor(f * cols.length * h) % cols.length];
        const w = Math.floor(Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))));
        if (w <= 0) continue;
        c.fillStyle = col;
        c.fillRect(Math.round(cx - w), y, w * 2, 1);
      }
    };
    const caps = (col) => {
      for (let y = 0; y < S; y++) {
        const dy = Math.abs(y - cy) / r;
        if (dy < 0.62) continue;
        const w = Math.floor(Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))));
        if (w <= 0) continue;
        const bite = Math.round(rnd() * 2);
        c.fillStyle = col;
        c.fillRect(Math.round(cx - w + bite), y, w * 2 - bite * 2, 1);
      }
    };
    const cracks = (n, col, glow) => {
      for (let i = 0; i < n; i++) {
        let a = rnd() * U.TAU, d = rnd() * r * 0.3;
        let x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        const steps = Math.round(S * (0.3 + rnd() * 0.4));
        for (let q = 0; q < steps; q++) {
          a += (rnd() - 0.5) * 0.9;
          x += Math.cos(a); y += Math.sin(a);
          if (!inside(x, y, 0.94)) break;
          c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1);
          if (glow && rnd() > 0.6) { c.fillStyle = glow; c.fillRect((x | 0) + 1, y | 0, 1, 1); }
        }
      }
    };
    /* Flat cut panels with a bright edge -- a gemstone, not a ball. */
    const facets = (n) => {
      for (let i = 0; i < n; i++) {
        const a = rnd() * U.TAU, d = rnd() * r * 0.7;
        const fx = cx + Math.cos(a) * d, fy = cy + Math.sin(a) * d;
        const w = px(r * (0.3 + rnd() * 0.5)), h = px(r * (0.25 + rnd() * 0.45));
        c.fillStyle = shade(tint, 0.8 + rnd() * 0.5);
        c.fillRect(Math.round(fx - w / 2), Math.round(fy - h / 2), w, h);
        c.fillStyle = shade(tint, 1.5);
        c.fillRect(Math.round(fx - w / 2), Math.round(fy - h / 2), w, 1);
        c.fillStyle = shade(tint, 0.45);
        c.fillRect(Math.round(fx - w / 2), Math.round(fy + h / 2 - 1), w, 1);
      }
    };
    /* Plates and rivets: somebody built this one. */
    const plating = () => {
      const step = Math.max(3, Math.round(S / 7));
      for (let y = 0; y < S; y += step) {
        for (let x = 0; x < S; x += step) {
          if (!inside(x + step / 2, y + step / 2, 0.95)) continue;
          c.fillStyle = shade(tint, 0.72 + rnd() * 0.5);
          c.fillRect(x, y, step - 1, step - 1);
          c.fillStyle = shade(tint, 1.35);
          c.fillRect(x, y, step - 1, 1);
          c.fillStyle = shade(tint, 1.5);
          c.fillRect(x + 1, y + 1, 1, 1);
        }
      }
    };
    /* Weather: streaks of cloud lying along the latitudes. */
    const clouds = (n) => {
      for (let i = 0; i < n; i++) {
        const y = Math.round(cy + (rnd() * 2 - 1) * r * 0.82);
        const w = Math.floor(Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))));
        if (w <= 2) continue;
        const x0 = Math.round(cx - w + rnd() * w), len = px(w * (0.4 + rnd() * 0.9));
        c.globalAlpha = 0.5 + rnd() * 0.35;
        c.fillStyle = '#ffffff';
        c.fillRect(x0, y, Math.min(len, Math.round(cx + w - x0)), px(S / 26));
        c.globalAlpha = 1;
      }
    };

    switch (type) {
      case 'ice':
        bands([shade(tint, 0.9), shade(tint, 1.05), shade(tint, 0.8)], 3);
        caps('#eaf6ff'); cracks(7, shade(tint, 1.5)); craters(6);
        break;
      case 'terra':
        bands([shade(tint, 0.7), shade(tint, 0.78), shade(tint, 0.72)], 2);
        maria(6, 1.25); caps('#f0f8ff'); clouds(Math.round(S / 5)); craters(3);
        break;
      case 'volcanic':
        pxDisc(c, cx, cy, r, shade(tint, 0.32));
        maria(5, 0.5); cracks(12, '#ff7a2a', '#ffd27a'); craters(7);
        for (let i = 0; i < 4; i++) {                        // calderas, glowing
          const a = rnd() * U.TAU, d = rnd() * r * 0.7;
          const hx = cx + Math.cos(a) * d, hy = cy + Math.sin(a) * d;
          if (!inside(hx, hy, 0.85)) continue;
          pxDisc(c, hx, hy, px(S / 16), '#ff7a2a');
          pxDisc(c, hx, hy, px(S / 26), '#ffe9a8');
        }
        break;
      case 'gem': case 'titan':
        facets(Math.round(S / 4)); cracks(5, shade(tint, 1.6));
        break;
      case 'metal':
        plating(); craters(5); cracks(4, shade(tint, 0.4));
        break;
      case 'core':
        bands([shade(tint, 0.6), shade(tint, 0.95), '#ff8a3d', shade(tint, 0.75)], 4);
        cracks(10, '#ffd27a', '#ff7a2a'); craters(4);
        break;
      default:
        maria(5, 0.55); craters(22, true);
    }

    // dust, everywhere
    for (let i = 0; i < S * 2; i++) {
      const dx2 = (rnd() * S) | 0, dy2 = (rnd() * S) | 0;
      if (!inside(dx2, dy2)) continue;
      c.fillStyle = shade(tint, rnd() > 0.5 ? 1.18 : 0.68);
      c.fillRect(dx2, dy2, 1, 1);
    }
    // the night side, stepped in columns
    for (let x = 0; x < S; x++) {
      const f = x / S;
      if (f > 0.45) continue;
      c.fillStyle = 'rgba(4,2,12,' + (0.9 - f * 1.8).toFixed(2) + ')';
      c.fillRect(x, 0, 1, S);
    }
    c.restore();

    /* Cut the whole thing back to a disc. Bands, clouds and lava spill to the
       corners of the square while they are being painted -- it is much easier
       to let them and then punch out everything that is not the planet than
       to clip each one. A hard-edged disc as the mask, so the limb stays
       pixels rather than a soft path edge. */
    /* The mask is built on its own canvas and composited in ONE call:
       destination-in is a whole-surface operation, so a disc drawn row by row
       would have each row erase the row before it. */
    const mk = document.createElement('canvas');
    mk.width = mk.height = S;
    pxDisc(mk.getContext('2d'), cx, cy, r + 0.5, '#ffffff');
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(mk, 0, 0);
    c.globalCompositeOperation = 'source-over';

    // the lit limb: one pixel of highlight walked round the top-right quarter
    c.fillStyle = shade(tint, 1.55);
    for (let a = -Math.PI * 0.95; a <= -Math.PI * 0.05; a += 0.05) {
      c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
    for (let a = 0.35; a <= 1.2; a += 0.05) {
      c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }

    const cv = document.createElement('canvas');
    cv.width = cv.height = S * K;
    const cc = cv.getContext('2d');
    cc.imageSmoothingEnabled = false;
    cc.drawImage(src, 0, 0, S, S, 0, 0, S * K, S * K);
    return cv;
  }

  /* A plain cratered rock: what hangs in the sky over a dig site. */
  function buildMoon(size, tint, seed) { return buildPlanet(size, tint, seed, 'moon'); }

  /* -------------------------------------------------------------- register */
  /* Somebody used this moon as a tip before you were handed the deed to it.
     Four grades of other people's rubbish, at the scale of the moon surface
     rather than the scale of the room, so they read from across the crater. */
  function moonJunk(k) {
    const p = pix(64, 46);
    if (k === 0) {                                        // a crashed satellite
      p.round(14, 24, 30, 18, 4, P.steelD);
      p.rect(16, 28, 26, 2, P.steel);
      p.rect(10, 20, 4, 18, P.steelDD);
      for (let i = 0; i < 4; i++) p.rect(44 + i * 4, 22 + i * 3, 3, 14 - i * 2, P.navyL);
      p.rect(28, 6, 3, 20, P.steelD);                     // a bent mast
      p.ellipse(30, 6, 11, 5, P.steel);
      p.ellipse(30, 7, 8, 3, P.navy);
      p.rect(2, 40, 20, 4, P.rockD);
    } else if (k === 1) {                                 // sacks, splitting
      for (let i = 0; i < 4; i++) {
        const x = 2 + i * 15, y = 18 + (i % 2) * 7;
        p.ellipse(x + 9, y + 12, 10, 11, i % 2 ? '#3a3348' : '#2e2a3e');
        p.rect(x + 6, y - 1, 6, 4, '#1c1a28');
        p.set(x + 13, y + 8, P.lime);
      }
      p.ellipse(30, 42, 22, 4, '#2a3320');                // the seepage
    } else if (k === 2) {                                 // a leaking drum
      p.round(16, 14, 26, 28, 5, '#7a5a2a');
      p.rect(16, 20, 26, 2, '#a87c3a');
      p.rect(16, 32, 26, 2, '#a87c3a');
      p.round(20, 10, 16, 6, 2, '#5a4020');
      p.rect(36, 26, 8, 3, '#4cff9a');                    // the leak
      p.ellipse(48, 42, 16, 4, '#2f7a52');
      p.ellipse(48, 41, 10, 2, P.acid);
    } else {                                              // bones and a crate
      p.round(2, 26, 26, 16, 3, '#6b4530');
      p.rect(4, 30, 22, 2, '#8a5a3a');
      p.line(4, 28, 26, 40, '#4a2e1e'); p.line(26, 28, 4, 40, '#4a2e1e');
      for (let i = 0; i < 3; i++) {
        const x = 32 + i * 9, y = 30 + (i % 2) * 5;
        p.round(x, y, 14, 4, 2, P.bone);
        p.disc(x + 1, y + 2, 3, P.bone); p.disc(x + 13, y + 2, 3, P.bone);
      }
      p.ellipse(44, 20, 8, 7, P.bone);                    // and a small skull
      p.rect(41, 19, 3, 3, P.ink); p.rect(46, 19, 3, 3, P.ink);
    }
    p.outline(P.ink);
    return p;
  }

  /* What was under the biggest heap all along. */
  function clubSign(lit) {
    const p = pix(58, 44);
    const neon = lit ? '#ff5fa8' : '#4a2340', tube = lit ? '#7ef9ff' : '#1d3a48';
    p.round(4, 22, 50, 20, 4, P.rockD);                   // a hatch in the regolith
    p.rect(6, 24, 46, 2, P.rockL);
    p.round(16, 28, 26, 14, 3, '#120a1c');
    for (let i = 0; i < 5; i++) p.rect(18 + i * 5, 30, 2, 10, lit ? '#2a1c33' : '#1a1024');
    p.rect(2, 18, 54, 3, P.steelDD);
    // the sign itself, on a little gantry
    p.rect(8, 4, 3, 16, P.steelD); p.rect(48, 4, 3, 16, P.steelD);
    p.round(6, 2, 46, 14, 3, '#1a1024');
    p.rect(6, 2, 46, 1, neon);
    for (const [x, w] of [[10, 4], [16, 4], [22, 4], [28, 4], [36, 4], [42, 4]]) p.rect(x, 5, w, 8, neon);
    p.rect(10, 5, 34, 2, tube);
    p.rect(10, 11, 34, 2, tube);
    if (lit) { p.rect(4, 0, 50, 1, '#ffd34d'); p.set(3, 8, tube); p.set(54, 8, tube); }
    p.outline(P.ink);
    return p;
  }

  /* The regulars. Body and face only -- their tentacles are drawn live so
     they can wave them about and wrap them round each other. Frame 1 is the
     face they make when somebody is kissing them. */
  const CLUB_COL = [
    { s: '#8affa0', d: '#2f7a52', l: '#d8ffe4' },
    { s: '#ff8ad8', d: '#a33a78', l: '#ffd6f0' },
    { s: '#ffb03d', d: '#a35f12', l: '#ffe1a8' },
    { s: '#7ec8ff', d: '#2f6aa3', l: '#d8f0ff' }
  ];
  function clubber(k, kiss) {
    const C = CLUB_COL[k % 4];
    const p = pix(30, 30);
    // an antenna or two, according to taste
    if (k % 2) { p.rect(9, 2, 2, 7, C.d); p.disc(10, 2, 3, C.l); p.rect(19, 4, 2, 5, C.d); p.disc(20, 4, 2, C.l); }
    else { p.rect(14, 0, 2, 8, C.d); p.ellipse(15, 1, 4, 3, C.l); }
    p.ellipse(15, 15, 13, 12, C.s);                     // one soft body
    p.ellipse(15, 9, 9, 5, C.l);
    p.ellipse(15, 23, 10, 4, C.d);
    if (kiss) {
      for (const ex of [10, 20]) { p.rect(ex - 3, 14, 7, 2, '#140f26'); p.rect(ex - 2, 13, 5, 1, '#140f26'); }
      p.ellipse(15, 22, 5, 4, '#ff5fa8');               // and a pucker you can see
      p.ellipse(15, 21, 3, 2, '#ffd6f0');
      p.rect(7, 10, 3, 1, '#ffd6f0'); p.rect(20, 10, 3, 1, '#ffd6f0');
    } else {
      for (const ex of [10, 20]) {
        p.ellipse(ex, 14, 4, 5, '#ffffff');
        p.ellipse(ex + (k % 2 ? 1 : -1), 15, 2, 3, '#140f26');
        p.set(ex - 1, 12, '#ffffff');
      }
      p.rect(12, 21, 7, 1, C.d);
    }
    p.outline(P.ink);
    return p;
  }

  /* A coat-check rail with one thing left on it, and it is magnificent. */
  function hippieSuit() {
    const p = pix(30, 38);
    p.rect(2, 2, 26, 2, P.steelD);
    p.rect(14, 4, 2, 5, P.steelDD);
    p.round(4, 8, 22, 22, 4, '#b04fd6');                // the jacket
    p.round(4, 8, 8, 12, 3, '#d67aff');                 // one enormous lapel
    p.round(18, 8, 8, 12, 3, '#d67aff');
    p.round(11, 9, 8, 9, 3, '#ffe9a8');
    p.round(2, 26, 26, 10, 3, '#8a3fb0');               // the flares
    p.rect(14, 26, 2, 10, '#5e2a7a');
    p.disc(15, 15, 2, P.gold);
    for (let i = 0; i < 5; i++) p.set(5 + i * 5, 12 + (i % 3), '#ffffff');
    p.outline(P.ink);
    return p;
  }

  reg('wall', [houseWall(240, 160)], 0, 0);
  reg('floor', [floorSlab(240)], 0, 0);
  reg('desk', [deskProp(false), deskProp(true)]);
  reg('saucer', [PD.art.buildSaucer(0, null, true), PD.art.buildSaucer(1, null, true)]);
  reg('fridge', [fridge(0)]);
  reg('bed', [mossBed()]);
  for (let i = 0; i < 3; i++) reg('junk' + i, [junkPile(i)]);
  for (let i = 0; i < 3; i++) reg('poster' + i, [poster(i)], 17, 0);
  reg('survey', [survey()]);
  for (let i = 0; i < 3; i++) reg('ruin' + i, [ruin(i)]);
  for (let i = 0; i < 3; i++) reg('rock' + i, [rock(i)]);
  reg('house', [houseSmall(false), houseSmall(true)]);
  reg('houseBig', [houseOut(false), houseOut(true)]);
  reg('brainjar', [brainJar(0), brainJar(1), brainJar(2)]);
  reg('rat', [moonRat(0, false), moonRat(1, false)]);
  reg('ratFed', [moonRat(0, true), moonRat(1, true)]);
  reg('cheese', [cheese(false), cheese(true)]);
  for (let i = 0; i < 4; i++) reg('litter' + i, [litter(i)]);
  for (let i = 0; i < 4; i++) reg('moonjunk' + i, [moonJunk(i)]);
  reg('clubsign', [clubSign(false), clubSign(true)]);
  for (let i = 0; i < 4; i++) reg('clubber' + i, [clubber(i, false), clubber(i, true)]);
  reg('hippie', [hippieSuit()], 15, 0);
  reg('flag', [flag(0), flag(1)], 3);
  reg('skull', [celestialHead()]);
  reg('tape', [tapeDeck(0), tapeDeck(1)]);

  PD.arthome = { S, P, CLUB_COL, buildMoon, buildPlanet, blit, HD, mitten, reg };
})(window.PD);
