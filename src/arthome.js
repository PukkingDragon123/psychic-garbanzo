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
  /* Same, but WITHOUT the crop. A sprite whose poses move about inside the
     canvas cannot be cropped per frame -- the trim would re-centre each one
     and the pole would end up somewhere different every quarter second. */
  function regRaw(name, builders, ox, oy) {
    const frames = builders.map(b => b.toCanvas());
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
    const neon = lit ? '#c02038' : '#4a0a18', tube = lit ? '#ffd34d' : '#5e4410';
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
  /* ------------------------------------------------------------- a species
     The regulars in the club are generated, and they are PEOPLE: a head on a
     neck, a torso with clothes on it, two arms with hands on the ends and two
     legs with boots. A seed picks the body plan, the build, the hue, how many
     eyes there are and where, the mouth, what is growing out of the head, what
     the skin is made of and what they came out in.

     They were blobs with tentacles before. Blobs do not read at this size and
     nine of them in a room read as one thing. */
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    const q = v => ('0' + Math.round((v + m) * 255).toString(16)).slice(-2);
    return '#' + q(r) + q(g) + q(b);
  }

  const KIN = [];
  /* ================================================================ THE SPECIES
     Not everybody out here has a head, a torso and two legs.

     These seven are built by hand rather than out of the trait generator,
     because there is no set of traits that adds up to a brain floating in a
     jar. They produce the same seven frames as everybody else -- idle, two
     steps of a walk, talking, kissing, blinking and a cheer -- and they are
     pushed into the same KIN table, so they turn up in every crowd in the
     game and the room code never has to know the difference.

     Several of them are also furniture. The lava lamp, the jar, the duck and
     the television are drawn as PROPS around the casino as well, which is why
     it is worth building them properly once. */
  const SPW = 66, SPH = 104;

  /* the little shared bits every one of them needs */
  function spEye(p, x, y, r, shut, white, iris, ink) {
    if (shut) {
      p.rect(x - r, y, r * 2 + 1, 2, ink);
      p.rect(x - r - 1, y - 1, 2, 2, ink);
      p.rect(x + r, y - 1, 2, 2, ink);
      return;
    }
    p.ellipse(x, y, r, r + 1, white || '#f6f8ff');
    p.ellipse(x, y + 1, Math.max(1, r - 1), Math.max(1, r - 1), iris || '#1a1024');
    p.rect(x - r + 1, y - r, 2, 2, '#ffffff');
  }
  function spMouth(p, x, y, w, f, col) {
    if (f === 4) { p.ellipse(x, y, 3, 4, col); p.ellipse(x, y - 1, 2, 2, '#ff9ecb'); return; }
    if (f === 3 || f === 6) { p.round(x - w / 2, y - 2, w, 8, 3, col); p.rect(x - 2, y + 3, 5, 3, '#d64f7a'); return; }
    p.round(x - w / 2, y, w, 3, 1, col);
  }

  const SPECIES = [
    /* ------------------------------------------------------------ UNIT 12
       A box on treads with a visor and a needle gauge that goes further over
       the more of your money it has watched disappear. */
    { name: 'UNIT 12', acc: '#ff6a4a', say: 'IT HAS BEEN COUNTING CARDS AND IT IS STILL LOSING',
      build(f) {
        const p = pix(SPW, SPH), cx = SPW >> 1, M = '#a8b0c0', ML = '#dde4ee', MD = '#5a6274';
        const R = '#e8402a', G = '#3fb87e', INK = '#141018';
        const rock = f === 1 ? -1 : (f === 2 ? 1 : 0);
        // the tread unit it gets about on
        p.round(cx - 20, 78, 40, 22, 8, MD);
        p.round(cx - 18, 80, 36, 16, 6, '#2e3440');
        for (let i = 0; i < 6; i++) p.rect(cx - 17 + i * 6, 80, 4, 16, MD);
        p.disc(cx - 11, 88, 6, M); p.disc(cx + 11, 88, 6, M);
        p.disc(cx - 11, 88, 3, MD); p.disc(cx + 11, 88, 3, MD);
        // the body: a cabinet with a hatch and a gauge in it
        p.round(cx - 16, 40, 32, 40, 5, M);
        p.round(cx - 16, 40, 32, 5, 3, ML);
        p.round(cx - 11, 50, 22, 20, 3, '#2e3440');
        p.disc(cx, 60, 8, '#1a1f28');
        p.disc(cx, 60, 7, '#243040');
        const sweep = 0.6 + (f === 6 ? 0.9 : 0) + rock * 0.12;
        p.line(cx, 60, cx + Math.cos(Math.PI + sweep) * 6, 60 + Math.sin(Math.PI + sweep) * 6, R);
        p.disc(cx, 60, 2, ML);
        for (let i = 0; i < 5; i++) p.set(cx - 6 + i * 3, 53, i > 2 ? R : G);
        p.round(cx - 14, 72, 28, 5, 2, MD);
        // arms, on pistons, with a claw on the end
        for (const s of [-1, 1]) {
          const ay = f === 6 ? 34 : 56 + rock * s * 2;
          p.round(cx + s * 16 - 3, 46, 6, ay - 44, 2, MD);
          p.round(cx + s * 20 - 4, ay, 9, 8, 3, M);
          p.rect(cx + s * 22 - 2, ay + 6, 3, 5, MD);
          p.rect(cx + s * 17 - 2, ay + 6, 3, 5, MD);
        }
        // the head, the visor and the one antenna
        p.round(cx - 14, 12, 28, 26, 5, M);
        p.round(cx - 14, 12, 28, 4, 2, ML);
        p.round(cx - 11, 18, 22, 11, 3, '#141018');
        if (f === 5) { p.rect(cx - 9, 23, 18, 2, R); }
        else {
          p.round(cx - 9, 20, 8, 7, 2, R);
          p.round(cx + 2, 20, 8, 7, 2, R);
          p.rect(cx - 8, 21, 3, 2, '#ffb0a0');
          p.rect(cx + 3, 21, 3, 2, '#ffb0a0');
        }
        for (let i = 0; i < 4; i++) p.rect(cx - 8 + i * 5, 32, 3, 4, (f === 3 || f === 6) ? G : MD);
        p.rect(cx - 1, 2, 3, 11, MD);
        p.disc(cx, 2, 3, f === 6 ? G : R);
        p.rect(cx - 16, 8, 5, 6, MD); p.rect(cx + 12, 8, 5, 6, MD);
        p.outline(INK);
        return p;
      } },

    /* --------------------------------------------------------- THE JAR
       A brain in a preserving jar on three brass legs. It does not speak.
       Its bubbles speak, and everybody has learned to read them. */
    { name: 'THE JAR', acc: '#ff9ecb', say: 'IT BUBBLES TWICE. EVERYBODY AT THE TABLE FOLDS.',
      build(f) {
        const p = pix(SPW, SPH), cx = SPW >> 1;
        const BR = '#c2932a', BRD = '#7a5c16', GLS = '#9fd8e8', FLU = '#4a9ab0';
        const BRN = '#ff9ecb', BRND = '#c4557f', INK = '#141018';
        const bob = f === 1 ? -2 : (f === 2 ? 1 : 0);
        // three little legs, and they are not in step
        for (const s of [-1, 0, 1]) {
          const lx = cx + s * 13, ly = 80 + (s === 0 ? 4 : 0) + (f === 1 && s < 0 ? -3 : 0) + (f === 2 && s > 0 ? -3 : 0);
          p.rect(lx - 1, 70, 3, ly - 70, BRD);
          p.round(lx - 4, ly, 9, 5, 2, BR);
        }
        // the jar: glass, a rim, a clip and a lid
        p.round(cx - 18, 20 + bob, 36, 52, 10, GLS);
        p.round(cx - 15, 23 + bob, 30, 46, 8, FLU);
        p.round(cx - 15, 23 + bob, 8, 40, 4, '#7fc8dc');
        p.round(cx - 20, 14 + bob, 40, 10, 4, BR);
        p.round(cx - 20, 14 + bob, 40, 3, 2, '#ffd34d');
        p.round(cx - 12, 8 + bob, 24, 7, 3, BRD);
        p.rect(cx - 2, 3 + bob, 5, 6, BR);
        p.round(cx - 20, 66 + bob, 40, 8, 3, BR);
        // the brain, and the face it has grown on the front of it
        p.ellipse(cx, 42 + bob, 13, 12, BRN);
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9;
          p.ellipse(cx + Math.cos(a) * 8, 38 + bob + Math.sin(a) * 6, 4, 3, BRND);
        }
        p.rect(cx - 1, 30 + bob, 3, 24, BRND);
        spEye(p, cx - 5, 44 + bob, 3, f === 5, '#fff0f6', '#3a1024', INK);
        spEye(p, cx + 5, 44 + bob, 3, f === 5, '#fff0f6', '#3a1024', INK);
        spMouth(p, cx, 52 + bob, 8, f, BRND);
        // the two stalks it steers with, and what it is saying in bubbles
        for (const s of [-1, 1]) {
          p.rect(cx + s * 12 - 1, 50 + bob, 3, 12, BRND);
          p.disc(cx + s * 13, 62 + bob, 2, BRN);
        }
        const nb = f === 3 || f === 6 ? 6 : 3;
        for (let i = 0; i < nb; i++) {
          const q = (i * 0.37 + (f === 6 ? 0.4 : 0)) % 1;
          p.disc(cx - 9 + ((i * 7) % 18), 62 + bob - q * 34, 1 + (i % 3), '#dff4fa');
        }
        p.outline(INK);
        return p;
      } },

    /* ------------------------------------------------------- POTTED PETE
       A terracotta pot with a face fired into it, a fern for hair and two
       twigs for arms. Rooted, philosophically; ambulatory, technically. */
    { name: 'POTTED PETE', acc: '#6fd955', say: 'HE HAS NOT MOVED SINCE TUESDAY AND HE IS STILL AHEAD',
      build(f) {
        const p = pix(SPW, SPH), cx = SPW >> 1;
        const T = '#c4723a', TL = '#e29a5e', TD = '#8a4820', SOIL = '#3a2416';
        const G = '#4fb03a', GL = '#7fe05a', INK = '#141018';
        const lean = f === 1 ? -2 : (f === 2 ? 2 : 0);
        // the pot he is, which is also the legs he has not got
        p.round(cx - 20, 52, 40, 42, 4, T);
        p.round(cx - 20, 52, 40, 6, 3, TL);
        p.round(cx - 23, 46, 46, 10, 4, T);
        p.round(cx - 23, 46, 46, 3, 2, TL);
        p.rect(cx - 16, 58, 4, 30, TD);
        p.rect(cx + 12, 58, 4, 30, TD);
        p.round(cx - 17, 88, 34, 8, 3, TD);
        p.round(cx - 18, 49, 36, 5, 2, SOIL);
        // the two little feet underneath, which he is embarrassed about
        p.round(cx - 14 + (f === 1 ? -2 : 0), 94, 11, 6, 2, TD);
        p.round(cx + 4 + (f === 2 ? 2 : 0), 94, 11, 6, 2, TD);
        // the face, fired into the front of him
        spEye(p, cx - 8, 66, 4, f === 5, '#fff6ee', '#2a1a10', INK);
        spEye(p, cx + 8, 66, 4, f === 5, '#fff6ee', '#2a1a10', INK);
        p.rect(cx - 12, 60, 7, 2, TD); p.rect(cx + 6, 60, 7, 2, TD);
        spMouth(p, cx, 76, 12, f, TD);
        p.ellipse(cx - 14, 74, 4, 3, '#e8935e');
        p.ellipse(cx + 14, 74, 4, 3, '#e8935e');
        // the fern, which is his hair and his pride
        for (let i = 0; i < 7; i++) {
          const a = -0.4 + i * 0.44, L = 20 + (i % 3) * 7;
          const ex = cx + Math.cos(a - Math.PI / 2) * L + lean, ey = 46 + Math.sin(a - Math.PI / 2) * L;
          p.line(cx + (i - 3) * 2, 46, ex, ey, G);
          for (let k = 1; k < 5; k++) {
            const q = k / 5;
            const lx = cx + (i - 3) * 2 + (ex - (cx + (i - 3) * 2)) * q;
            const ly = 46 + (ey - 46) * q;
            p.ellipse(lx, ly, 3, 2, k % 2 ? GL : G);
          }
          p.ellipse(ex, ey, 4, 3, GL);
        }
        // and the twig arms
        for (const s of [-1, 1]) {
          const ay = f === 6 ? 34 : 70;
          p.line(cx + s * 20, 62, cx + s * 27, ay, '#7a5a2a');
          p.ellipse(cx + s * 27, ay, 3, 3, G);
          p.ellipse(cx + s * 29, ay - 3, 3, 2, GL);
        }
        p.outline(INK);
        return p;
      } },

    /* ----------------------------------------------------------- SUNNY
       Eight foot of sunflower in a bucket. Follows the light, and the light
       in here comes off the jackpot sign, so Sunny is always facing the
       machines. */
    { name: 'SUNNY', acc: '#ffd34d', say: 'SHE FACES WHICHEVER MACHINE IS PAYING. SHE IS NEVER WRONG.',
      build(f) {
        const p = pix(SPW, SPH), cx = SPW >> 1;
        const ST = '#3f9a2a', STL = '#6fd955', PET = '#ffd34d', PETD = '#d89a10';
        const SEED = '#6a4418', INK = '#141018';
        const sway = f === 1 ? -3 : (f === 2 ? 3 : 0);
        const hx = cx + sway, hy = 26;
        // the bucket, and the two feet under it
        p.round(cx - 15, 80, 30, 18, 3, '#8e96a8');
        p.round(cx - 17, 78, 34, 5, 2, '#c0c8d8');
        p.rect(cx - 13, 84, 26, 2, '#6a7284');
        p.round(cx - 13 + (f === 1 ? -2 : 0), 96, 11, 5, 2, '#5a6274');
        p.round(cx + 3 + (f === 2 ? 2 : 0), 96, 11, 5, 2, '#5a6274');
        // the stalk, bending the way she is leaning
        for (let i = 0; i < 12; i++) {
          const q = i / 11;
          p.rect(cx - 2 + sway * q, 80 - i * 5, 5, 6, ST);
          p.rect(cx - 2 + sway * q, 80 - i * 5, 2, 6, STL);
        }
        // two enormous leaves, which are also her arms
        for (const s of [-1, 1]) {
          const ay = f === 6 ? 40 : 62;
          for (let k = 0; k < 5; k++) {
            const q = k / 4;
            p.ellipse(cx + s * (8 + q * 18), ay + (f === 6 ? -q * 14 : q * 6), 6 - q * 2, 5 - q * 2, k % 2 ? STL : ST);
          }
          p.line(cx + s * 6, ay, cx + s * 26, ay + (f === 6 ? -14 : 6), ST);
        }
        // the head: two ranks of petals, then the seed face
        for (let r = 0; r < 2; r++) {
          const n = 11, R = r ? 25 : 20;
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2 + r * 0.28 + (f === 6 ? 0.1 : 0);
            p.ellipse(hx + Math.cos(a) * R, hy + Math.sin(a) * R, 6, 5, r ? PETD : PET);
            p.ellipse(hx + Math.cos(a) * (R - 2), hy + Math.sin(a) * (R - 2), 4, 4, PET);
          }
        }
        p.ellipse(hx, hy, 15, 14, SEED);
        for (let i = 0; i < 26; i++) {
          const a = i * 2.4, rr = 3 + (i % 5) * 2.2;
          p.set(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr, '#4a2c10');
        }
        spEye(p, hx - 6, hy - 1, 4, f === 5, '#fff6dc', '#2a1a08', INK);
        spEye(p, hx + 6, hy - 1, 4, f === 5, '#fff6dc', '#2a1a08', INK);
        spMouth(p, hx, hy + 8, 10, f, '#3a2208');
        p.outline(INK);
        return p;
      } },

    /* ------------------------------------------------------ THE LAVA LAMP
       Sixty years old, still warming up, and the slowest tipper in the
       building. Also screwed to half the walls in here as a light fitting. */
    { name: 'THE LAMP', acc: '#ff6a2a', say: 'IT HAS BEEN ABOUT TO SAY SOMETHING FOR TWENTY MINUTES',
      build(f) {
        const p = pix(SPW, SPH), cx = SPW >> 1;
        const BR = '#c2932a', BRD = '#7a5c16', GL = '#3a1a4a', WAX = '#ff6a2a', WAXL = '#ffb03d';
        const INK = '#141018';
        const rise = f === 1 ? 0 : (f === 2 ? 3 : (f === 6 ? 6 : 1));
        // the base and the cap
        p.round(cx - 16, 84, 32, 14, 4, BR);
        p.round(cx - 16, 84, 32, 3, 2, '#ffd34d');
        p.round(cx - 12, 96, 24, 5, 2, BRD);
        p.round(cx - 12, 4, 24, 10, 4, BR);
        p.round(cx - 12, 4, 24, 3, 2, '#ffd34d');
        // the glass: a tapered column of very hot liquid
        for (let y = 14; y < 84; y++) {
          const q = (y - 14) / 70;
          const w = 9 + q * 8;
          p.rect(cx - w, y, w * 2, 1, GL);
          p.rect(cx - w, y, 3, 1, '#5e2a70');
        }
        // the wax, which is what it is thinking
        const blobs = [[0, 70, 8], [-3, 52 - rise * 2, 6], [2, 36 - rise * 3, 5], [-2, 22 - rise, 3]];
        for (const [dx, by, r] of blobs) {
          p.ellipse(cx + dx, by, r, r + 2, WAX);
          p.ellipse(cx + dx - 1, by - 1, r - 2, r - 1, WAXL);
        }
        // the face it has condensed on the inside of the glass
        spEye(p, cx - 6, 46, 4, f === 5, '#fff0e0', '#3a1008', INK);
        spEye(p, cx + 6, 46, 4, f === 5, '#fff0e0', '#3a1008', INK);
        spMouth(p, cx, 56, 9, f, '#7a2a10');
        p.outline(INK);
        return p;
      } },

    /* -------------------------------------------------------------- DUCKY
       Enormous. Rubber. Owns four machines on the second floor and will not
       say how. */
    { name: 'DUCKY', acc: '#ffd34d', say: 'NOBODY HAS EVER SEEN DUCKY PAY FOR ANYTHING',
      build(f) {
        const p = pix(SPW, SPH), cx = SPW >> 1;
        const Y = '#ffd84a', YL = '#fff2a0', YD = '#c99a12', OR = '#ff8a1e', INK = '#141018';
        const wag = f === 1 ? -2 : (f === 2 ? 2 : 0);
        // the two orange feet
        p.round(cx - 17 + (f === 1 ? -2 : 0), 92, 16, 8, 3, OR);
        p.round(cx + 2 + (f === 2 ? 2 : 0), 92, 16, 8, 3, OR);
        // the body, which is nearly all of him
        p.ellipse(cx, 66, 24, 26, Y);
        p.ellipse(cx - 7, 56, 13, 12, YL);
        p.ellipse(cx + 20 + wag, 60, 9, 12, Y);          // the tail
        p.ellipse(cx + 22 + wag, 54, 5, 6, YL);
        // a wing each side, up on the cheer
        for (const s of [-1, 1]) {
          const ay = f === 6 ? 46 : 66;
          p.ellipse(cx + s * 20, ay, 8, f === 6 ? 13 : 10, YD);
          p.ellipse(cx + s * 19, ay - 2, 6, 7, Y);
        }
        // the head, and the bill
        p.ellipse(cx - 4, 30, 18, 17, Y);
        p.ellipse(cx - 8, 22, 11, 8, YL);
        p.round(cx - 26, 30, 18, 9, 4, OR);
        p.round(cx - 26, 33, 18, 4, 2, '#d86a0e');
        if (f === 3 || f === 6) { p.round(cx - 26, 36, 18, 6, 3, '#d86a0e'); p.rect(cx - 22, 37, 10, 3, '#a8400a'); }
        spEye(p, cx - 9, 26, 4, f === 5, '#ffffff', '#1a1008', INK);
        spEye(p, cx + 3, 26, 4, f === 5, '#ffffff', '#1a1008', INK);
        p.outline(INK);
        return p;
      } },

    /* ------------------------------------------------------------ THE SET
       A television on legs. Whatever is on it is its face, and whatever its
       face is doing is on it. */
    { name: 'THE SET', acc: '#7ef9ff', say: 'IT IS SHOWING THE RACING. IT IS ALWAYS SHOWING THE RACING.',
      build(f) {
        const p = pix(SPW, SPH), cx = SPW >> 1;
        const W = '#8a6a4a', WL = '#b08a5e', WD = '#4a3420', SCR = '#0f2a30';
        const G = '#6fe8d8', INK = '#141018';
        const tilt = f === 1 ? -1 : (f === 2 ? 1 : 0);
        // spindly legs, splayed
        for (const s of [-1, 1]) {
          p.line(cx + s * 12, 76, cx + s * 20 + (f === 1 && s < 0 ? -3 : 0) + (f === 2 && s > 0 ? 3 : 0), 98, WD);
          p.line(cx + s * 12 + s, 76, cx + s * 20 + s, 98, W);
          p.round(cx + s * 22 - 5, 96, 11, 5, 2, WD);
        }
        // the cabinet
        p.round(cx - 24, 20 + tilt, 48, 58, 5, W);
        p.round(cx - 24, 20 + tilt, 48, 5, 3, WL);
        p.round(cx - 21, 25 + tilt, 34, 40, 5, '#2a1a10');
        p.round(cx - 19, 27 + tilt, 30, 36, 5, SCR);
        // the dials and the speaker down the side
        p.disc(cx + 18, 34 + tilt, 4, WD); p.disc(cx + 18, 34 + tilt, 2, '#ffd34d');
        p.disc(cx + 18, 46 + tilt, 4, WD); p.disc(cx + 18, 46 + tilt, 2, '#ffd34d');
        for (let i = 0; i < 4; i++) p.rect(cx + 13, 54 + tilt + i * 3, 11, 2, WD);
        // the picture, which is the face
        for (let y = 28 + tilt; y < 62 + tilt; y += 3) p.rect(cx - 18, y, 28, 1, '#16343c');
        spEye(p, cx - 11, 40 + tilt, 4, f === 5, '#dffcff', '#0a2028', INK);
        spEye(p, cx - 1, 40 + tilt, 4, f === 5, '#dffcff', '#0a2028', INK);
        spMouth(p, cx - 6, 50 + tilt, 11, f, G);
        if (f === 6) { for (let i = 0; i < 5; i++) p.rect(cx - 18 + i * 6, 29 + tilt, 4, 3, '#ffd34d'); }
        // the aerial, bent
        p.line(cx - 6, 20 + tilt, cx - 18, 2, '#c0c8d8');
        p.line(cx + 4, 20 + tilt, cx + 18, 6, '#c0c8d8');
        p.disc(cx - 18, 2, 2, '#e8eef8'); p.disc(cx + 18, 6, 2, '#e8eef8');
        p.outline(INK);
        return p;
      } }
  ];

  /* =================================================================== THE CAST
     Every character in the building, designed one at a time -- and, this
     time, designed to belong together.

     The first pass at a hand-made cast had twelve good ideas drawn in twelve
     different styles: a plague doctor next to a gorilla next to a dumpling.
     Each one was fine and together they looked like a sticker sheet from
     four different shops. So they share a HAND now, the way a cartoon's cast
     does: round shaded bodies with a light from the top left, big glossy
     eyes with two highlights, pink cheeks, stubby limbs that do all the
     acting, and one fat dark outline round the lot. What makes each one THEM
     is the silhouette and the idea -- ears, a crown of leaves, a ring, a
     flame, a sheet, a hat -- not a different way of drawing.

     And they have faces now, not just a face. Twelve frames each:
       0 idle   1-2 walk   3 talk   4 wink   5 blink   6 cheer
       7 sad    8 angry    9 shock  10 laugh 11 asleep
     so the room code can make anybody cross, or delighted, or dozing on a
     bench, without knowing who they are. */
  const INKC = '#1a1024';
  const EXPR = ['idle', 'idle', 'idle', 'talk', 'kiss', 'blink', 'cheer', 'sad', 'angry', 'shock', 'laugh', 'sleep'];
  const NFRAMES = EXPR.length;
  function FR(f) {
    const e = EXPR[f] || 'idle';
    return {
      e, step: f === 1 ? 1 : (f === 2 ? -1 : 0), talk: e === 'talk', blink: e === 'blink' || e === 'sleep',
      cheer: e === 'cheer' || e === 'laugh', kiss: e === 'kiss', sad: e === 'sad', angry: e === 'angry',
      shock: e === 'shock', laugh: e === 'laugh', sleep: e === 'sleep',
      // how the whole body sits: up for a cheer or a fright, down when low or asleep
      lift: (e === 'cheer' || e === 'shock') ? -3 : ((e === 'sad' || e === 'sleep') ? 2 : (f === 1 || f === 2 ? -1 : 0))
    };
  }
  // a stick of whole pixels, thick, for twigs and handles
  function stick(p, x0, y0, x1, y1, w, c) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) {
      const q = i / n;
      p.rect(Math.round(x0 + (x1 - x0) * q - w / 2), Math.round(y0 + (y1 - y0) * q - w / 2), w, w, c);
    }
  }
  // kept for the house-built species, which still use the plain ones
  function dotEye(p, x, y, r, shut) {
    if (shut) { p.rect(x - r, y, r * 2 + 1, 2, INKC); return; }
    p.ellipse(x, y, r, r + 1, INKC);
    p.rect(x - r + 1, y - r + 1, Math.max(1, r - 1), Math.max(1, r - 1), '#ffffff');
  }
  function joyEye(p, x, y, r) {
    for (let i = 0; i <= r; i++) { p.rect(x - i, y - r + i, 2, 2, INKC); p.rect(x + i, y - r + i, 2, 2, INKC); }
  }

  /* ---- THE HAND: the handful of strokes every one of them is made of ---- */

  // A shaded ball: a dark rim low and right, the colour, a soft light top left.
  function ball(p, cx, cy, rx, ry, C, gloss) {
    p.ellipse(cx, cy, rx, ry, C[2]);
    p.ellipse(cx - rx * 0.1, cy - ry * 0.12, rx * 0.9, ry * 0.88, C[0]);
    p.ellipse(cx - rx * 0.36, cy - ry * 0.42, rx * 0.32, ry * 0.24, C[1]);
    if (gloss) p.rect(Math.round(cx - rx * 0.52), Math.round(cy - ry * 0.56), 2, 2, '#ffffff');
  }
  // a stubby limb: a hand, a foot, a wing, a paw
  function nub(p, x, y, rx, ry, C) {
    p.ellipse(x, y, rx, ry, C[2]);
    p.ellipse(x - 0.6, y - 0.7, Math.max(1, rx - 0.9), Math.max(1, ry - 0.9), C[0]);
  }
  function brow(p, x, y, r, side, dir, ink) {
    // dir 1: cross (the inner end drops); dir -1: worried (the inner end lifts)
    const ox = x + side * (r + 1), ix = x - side * (r - 1);
    const oy = y - r - (dir > 0 ? 5 : 2), iy = y - r - (dir > 0 ? 2 : 5);
    stick(p, ox, oy, ix, iy, 2, ink);
  }
  /* The eye. Big, dark, glossy, with the iris lit from below and two
     highlights, which is ninety per cent of what reads as cute. */
  function eye(p, x, y, r, q, side, o) {
    o = o || {};
    const ink = o.ink || INKC, iris = o.iris || '#6a4aa8';
    const e = q.e;
    const wink = e === 'kiss' && side > 0;
    if (e === 'blink' || e === 'sleep') {
      for (let i = -r; i <= r; i++) p.rect(x + i, y + Math.round((r * r - i * i) / (r * 2.4)), 1, 2, ink);
      return;
    }
    if (e === 'cheer' || e === 'laugh' || wink) {
      for (let i = -r; i <= r; i++) p.rect(x + i, y - Math.round((r * r - i * i) / (r * 2)) + 1, 1, 2, ink);
      if (e === 'laugh') p.ellipse(x + side * (r + 1), y + 3, 1, 1.6, '#9adfff');
      return;
    }
    if (e === 'shock') {
      p.ellipse(x, y, r + 1, r + 2, ink);
      p.ellipse(x, y, r, r + 1, '#ffffff');
      p.ellipse(x, y + 0.5, 1.4, 1.8, ink);
      return;
    }
    if (o.sclera) p.ellipse(x, y, r + 1, r + 2, '#ffffff');
    p.ellipse(x, y, r, r + 1, ink);
    p.ellipse(x, y + r * 0.5, r * 0.62, r * 0.46, iris);
    p.ellipse(x - r * 0.32, y - r * 0.42, Math.max(1, r * 0.42), Math.max(1, r * 0.46), '#ffffff');
    p.rect(Math.round(x + r * 0.34), Math.round(y + r * 0.34), 1, 1, '#ffffff');
    if (o.lid && (e === 'idle' || e === 'talk')) {
      p.rect(x - r - 1, y - r - 2, r * 2 + 3, r + 1, o.lid);
      p.rect(x - r, y - 1, r * 2 + 1, 1, ink);
    }
    if (e === 'angry') brow(p, x, y, r, side, 1, ink);
    if (e === 'sad') {
      brow(p, x, y, r, side, -1, ink);
      p.ellipse(x + side * r * 0.6, y + r + 3, 1.2, 2.2, '#8ad4ff');
    }
  }
  function eyes(p, cx, y, gap, r, q, o) { eye(p, cx - gap, y, r, q, -1, o); eye(p, cx + gap, y, r, q, 1, o); }
  // the mouth; `fc` is the face colour, used to cut the top off an open grin
  function mouth(p, x, y, q, fc, o) {
    o = o || {};
    const ink = o.ink || INKC, M = '#4a1430', T = '#ff7a9a';
    const e = q.e;
    const pts = (a) => { for (const [dx, dy] of a) p.rect(x + dx, y + dy, 2, 2, ink); };
    if (e === 'talk') { p.ellipse(x, y + 1, 3, 3, M); p.ellipse(x, y + 3, 2, 1.2, T); }
    else if (e === 'cheer' || e === 'laugh') {
      const w = e === 'laugh' ? 5 : 4, h = e === 'laugh' ? 5 : 4;
      p.ellipse(x, y, w, h, M);
      p.rect(x - w - 1, y - h - 1, w * 2 + 3, h + 1, fc);
      p.rect(x - w + 1, y, w * 2 - 1, 1, M);
      p.ellipse(x, y + h * 0.55, w * 0.55, h * 0.32, T);
    } else if (e === 'sad') pts([[-3, 2], [-2, 1], [-1, 0], [0, 0], [1, 1], [2, 2]]);
    else if (e === 'angry') {
      p.round(x - 4, y - 1, 9, 5, 1, ink);
      p.rect(x - 3, y, 7, 3, '#ffffff');
      p.rect(x - 1, y, 1, 3, ink); p.rect(x + 1, y, 1, 3, ink);
    } else if (e === 'shock') p.ellipse(x, y + 1, 2, 3, M);
    else if (e === 'kiss') pts([[0, -2], [1, 0], [0, 2]]);
    else if (e === 'sleep') { p.ellipse(x, y + 1, 1.5, 1.5, M); p.ellipse(x + 6, y - 1, 3, 3, '#bfe8ff'); p.rect(x + 5, y - 3, 1, 1, '#ffffff'); }
    else if (o.cat) pts([[-4, -1], [-3, 0], [-2, 0], [-1, -1], [0, -1], [1, 0], [2, 0], [3, -1]]);
    else pts([[-3, -1], [-2, 0], [-1, 1], [0, 1], [1, 0], [2, -1]]);
  }
  function blush(p, cx, y, gap, q, c) {
    const k = (q.cheer || q.kiss) ? 1 : 0;
    const col = q.angry ? '#ff6a6a' : (c || '#ff9ab8');
    p.ellipse(cx - gap, y, 3 + k, 1.6 + k * 0.5, col);
    p.ellipse(cx + gap, y, 3 + k, 1.6 + k * 0.5, col);
  }
  /* Where the hands go for each face: the arms do half the acting. Offsets
     from the shoulder, left then right. */
  function armPose(q) {
    const s = q.step;
    if (q.e === 'cheer') return [[-4, -10], [4, -10]];
    if (q.e === 'laugh') return [[1, 3], [-1, 3]];
    if (q.e === 'sad' || q.e === 'sleep') return [[-1, 7], [1, 7]];
    if (q.e === 'angry') return [[-6, -3], [6, -3]];
    if (q.e === 'shock') return [[-7, -8], [7, -8]];
    if (q.e === 'talk') return [[-2, 4], [5, -4]];
    if (q.e === 'kiss') return [[-2, 4], [-2, -6]];
    return [[-2 + s * 2, 4], [2 + s * 2, 4]];
  }
  function feet(p, cx, y, gap, rx, ry, q, C) {
    nub(p, cx - gap, y - (q.step > 0 ? 2 : 0), rx, ry, C);
    nub(p, cx + gap, y - (q.step < 0 ? 2 : 0), rx, ry, C);
  }

  const CAST = [
    /* ------------------------------------------------------------- MOCHI
       A round cream bunny off a garden wall: one ear up, one flopped, lids
       half down, paws on the belly. She has not moved in four days. */
    { name: 'MOCHI', race: 'PUDDLE HARE', calling: 'SITS ON THINGS', acc: '#f4a8b8', motion: 'waddle',
      say: 'I HAVE NOT MOVED IN FOUR DAYS. BEST FOUR DAYS OF MY LIFE.',
      build(f) {
        const W = 64, H = 72, p = pix(W, H), cx = 32, q = FR(f), L = q.lift;
        const C = ['#ecd9b0', '#fff6dc', '#bf9f70'], PINK = '#f6aabb', PD2 = '#d8788e';
        ball(p, cx + 19, 54 + L, 6, 6, ['#fffaf0', '#ffffff', '#d8c8a8']);          // tail
        const up = q.shock || q.cheer, droop = q.sad || q.sleep ? 5 : 0;
        p.ellipse(cx - 9, 17 + L + droop, 5, 13, C[2]); p.ellipse(cx - 10, 16 + L + droop, 4, 12, C[0]);
        p.ellipse(cx - 10, 18 + L + droop, 2, 8, PINK);
        if (up) { p.ellipse(cx + 9, 17 + L, 5, 13, C[2]); p.ellipse(cx + 8, 16 + L, 4, 12, C[0]); p.ellipse(cx + 8, 18 + L, 2, 8, PINK); }
        else { p.ellipse(cx + 17, 27 + L + droop, 12, 5, C[2]); p.ellipse(cx + 16, 26 + L + droop, 11, 4, C[0]); p.ellipse(cx + 17, 27 + L + droop, 7, 2, PINK); }
        feet(p, cx, H - 5, 10, 6, 4, q, C);
        ball(p, cx, 45 + L, 22, 22, C, true);
        p.ellipse(cx, 53 + L, 14, 11, C[1]);
        const fy = 39 + L;
        blush(p, cx, fy + 5, 12, q);
        eyes(p, cx, fy, 8, 3, q, { lid: C[0] });
        p.rect(cx - 1, fy + 3, 3, 2, PD2);
        mouth(p, cx, fy + 7, q, C[0], { cat: 1 });
        const A = armPose(q);
        nub(p, cx - 12 + A[0][0], 46 + L + A[0][1], 4, 3.5, C);
        nub(p, cx + 12 + A[1][0], 46 + L + A[1][1], 4, 3.5, C);
        p.outline(INKC);
        return p;
      } },

    /* ------------------------------------------------------------- BEANIE
       A bean. Also a dog. One floppy ear, a sprout, a :3, four legs you can
       barely see, and a fact for every occasion, most of them wrong. */
    { name: 'BEANIE', race: 'BEANHOUND', calling: 'KNOWS A FACT', acc: '#8ac848', motion: 'hop',
      say: 'DID YOU KNOW THE HOUSE ALWAYS WINS. IT IS TRUE. I LOOKED IT UP.',
      build(f) {
        const W = 64, H = 54, p = pix(W, H), cx = 32, q = FR(f), L = q.lift;
        const C = ['#aedc68', '#e4f8b0', '#6e9e34'], EAR = ['#8cc050', '#b8e080', '#5a8a2a'];
        for (let i = 0; i < 4; i++) {
          const lx = cx - 13 + i * 8.5;
          const lift = (i % 2 === 0 ? (q.step > 0 ? 2 : 0) : (q.step < 0 ? 2 : 0)) + (q.cheer && i < 2 ? 4 : 0);
          nub(p, lx, H - 5 - lift, 3.2, 3.5, C);
        }
        ball(p, cx + 22, 33 + L, 3.5, 3, C);                                           // tail
        ball(p, cx, 33 + L, 22, 15, C, true);
        stick(p, cx + 3, 19 + L, cx + 4, 12 + L, 2, '#4a8a2a');
        p.ellipse(cx + 8, 11 + L, 4.5, 2.5, '#6ac040'); p.ellipse(cx + 7, 10 + L, 2, 1, '#b8f090');
        const eu = q.shock ? -6 : (q.sad ? 3 : 0);
        p.ellipse(cx - 14, 25 + L + eu, 5, 8, EAR[2]); p.ellipse(cx - 14, 24 + L + eu, 4, 7, EAR[0]);
        const fy = 31 + L;
        blush(p, cx - 2, fy + 5, 10, q);
        eyes(p, cx - 2, fy, 6, 3, q);
        mouth(p, cx - 2, fy + 6, q, C[0], { cat: 1 });
        p.outline(INKC);
        return p;
      } },

    /* ------------------------------------------------------------- BIRCH
       A little birch trunk with a crown of leaves and twigs for arms, doing
       an extremely good impression of not being a tree. */
    { name: 'BIRCH', race: 'BARKFOLK', calling: 'GARDENER', acc: '#6cc850', motion: 'sway',
      say: 'I AM NOT A TREE. I AM A PERSON WHO IS VERY GOOD AT STANDING.',
      build(f) {
        const W = 64, H = 76, p = pix(W, H), cx = 32, q = FR(f), L = q.lift;
        const BK = ['#f2eee2', '#ffffff', '#bdb4a2'], LF = ['#6cc850', '#b8f090', '#3a8a30'];
        const RT = ['#9a6a42', '#c8905a', '#6a4428'];
        feet(p, cx, H - 5, 8, 6, 4, q, RT);
        p.round(cx - 14, 20 + L, 28, 46, 11, BK[2]);
        p.round(cx - 14, 20 + L, 26, 44, 10, BK[0]);
        p.rect(cx - 10, 28 + L, 3, 28, BK[1]);
        for (const [bx, by, bw] of [[-8, 50, 6], [3, 56, 7], [-3, 60, 5], [5, 46, 4]]) p.rect(cx + bx, by + L, bw, 2, '#4a4038');
        // the crown, three puffs and a flower
        ball(p, cx - 10, 17 + L, 10, 9, LF); ball(p, cx + 10, 17 + L, 10, 9, LF); ball(p, cx, 10 + L, 11, 10, LF, true);
        p.ellipse(cx + 8, 8 + L, 2.5, 2.5, '#ffd8e8'); p.rect(cx + 8, 8 + L, 1, 1, '#ffd34d');
        const fy = 36 + L;
        blush(p, cx, fy + 5, 10, q);
        eyes(p, cx, fy, 6, 3, q);
        mouth(p, cx, fy + 7, q, BK[0]);
        const A = armPose(q);
        for (const [s, a] of [[-1, A[0]], [1, A[1]]]) {
          const hx = cx + s * 20 + a[0] * 1.4, hy = 44 + L + a[1] * 1.4;
          stick(p, cx + s * 12, 44 + L, hx, hy, 3, RT[0]);
          ball(p, hx, hy, 4.5, 4, LF);
        }
        p.outline(INKC);
        return p;
      } },

    /* ------------------------------------------------------------- GLOOP
       A drip of mint slime with a shine on it and bubbles inside, the lookout
       -- which mostly means watching, and going wobbly when it sees things. */
    { name: 'GLOOP', race: 'GLIMMERWORM', calling: 'LOOKOUT', acc: '#7ae8d0', motion: 'ooze',
      say: 'I SAW EVERYTHING. I UNDERSTOOD ABOUT A THIRD OF IT.',
      build(f) {
        const W = 60, H = 58, p = pix(W, H), cx = 30, q = FR(f), L = q.lift;
        const C = ['#7ee8d2', '#d4fff4', '#3aae98'];
        const sq = q.step ? 2 : 0;
        ball(p, cx, 40 + L, 22 + sq, 16 - sq, C);
        p.ellipse(cx - 1, 28 + L, 13, 12, C[0]);
        p.spike(cx + 3, 10 + L + sq, 8, 12, -1, C[0]);
        for (const [bx, by, br] of [[-9, 44, 2.5], [8, 38, 1.8], [12, 47, 1.4], [-4, 50, 1.5]]) p.ellipse(cx + bx, by + L, br, br, C[1]);
        p.ellipse(cx - 10, 26 + L, 3, 5, '#ffffff'); p.rect(cx - 6, 20 + L, 2, 2, '#ffffff');
        const A = armPose(q);
        nub(p, cx - 19 + A[0][0] * 0.6, 40 + L + A[0][1] * 0.8, 4, 3.5, C);
        nub(p, cx + 19 + A[1][0] * 0.6, 40 + L + A[1][1] * 0.8, 4, 3.5, C);
        const fy = 34 + L;
        blush(p, cx, fy + 5, 12, q);
        eyes(p, cx, fy, 7, 4, q, { iris: '#2a8a7a' });
        mouth(p, cx, fy + 7, q, C[0]);
        p.outline(INKC);
        return p;
      } },

    /* ------------------------------------------------------------- KORVO
       A fat round crow in a very small top hat with a monocle on a chain.
       He collects things. Shiny things. Your things, if you put them down. */
    { name: 'KORVO', race: 'CORVID', calling: 'COLLECTOR', acc: '#ffd34d', motion: 'hop',
      say: 'THAT IS A VERY NICE BUTTON. I WILL GIVE YOU A WORSE BUTTON FOR IT.',
      build(f) {
        const W = 64, H = 70, p = pix(W, H), cx = 32, q = FR(f), L = q.lift;
        const C = ['#40446e', '#7076ac', '#24264a'], BE = ['#ffb040', '#ffe0a0', '#c87818'];
        for (let i = 0; i < 3; i++) p.ellipse(cx + 18 + i * 2, 50 + L - i * 4, 7, 2.5, C[2]);   // tail
        const fs = q.step;
        for (const s of [-1, 1]) {
          const fx = cx + s * 8, fy2 = H - 4 - ((s < 0 ? fs > 0 : fs < 0) ? 2 : 0);
          p.rect(fx - 1, fy2 - 5, 2, 5, BE[2]);
          for (const d of [-3, 0, 3]) p.rect(fx + d - 1, fy2, 3, 2, BE[0]);
        }
        ball(p, cx, 42 + L, 21, 22, C, true);
        p.ellipse(cx - 2, 51 + L, 12, 12, '#9296c8');
        for (const [tx, th] of [[-4, 7], [0, 9], [4, 6]]) p.spike(cx + tx, 21 + L - th + 2, 5, th, -1, C[0]);
        // the hat, very small, very serious
        const hl = q.shock ? -6 : 0;
        p.rect(cx - 8, 21 + L + hl, 17, 3, '#16161f'); p.rect(cx - 5, 9 + L + hl, 11, 12, '#16161f');
        p.rect(cx - 5, 17 + L + hl, 11, 2, '#c83a4a'); p.rect(cx - 4, 10 + L + hl, 2, 6, '#3a3a4a');
        const fy = 34 + L;
        eyes(p, cx, fy, 8, 3, q, { sclera: 1, iris: '#3a3a6a' });
        if (!q.blink && !q.cheer) { p.ellipse(cx + 8, fy, 6, 7, '#ffd34d'); p.ellipse(cx + 8, fy, 5, 6, '#ffffff'); eye(p, cx + 8, fy, 3, q, 1, { iris: '#3a3a6a' }); stick(p, cx + 13, fy + 5, cx + 16, fy + 16, 1, '#ffd34d'); }
        // the beak: shut, or open when there is something to say
        const open = q.talk || q.cheer || q.shock || q.angry;
        if (open) { p.spike(cx, fy + 3, 11, 4, 1, BE[0]); p.rect(cx - 3, fy + 7, 7, 2, '#4a1430'); p.spike(cx, fy + 9, 8, 3, 1, BE[2]); }
        else { p.spike(cx, fy + 3, 11, 7, 1, BE[0]); p.rect(cx - 3, fy + 4, 3, 1, BE[1]); }
        const A = armPose(q);
        nub(p, cx - 19 + A[0][0] * 0.7, 44 + L + A[0][1] * 0.8, 4.5, 8, C);
        nub(p, cx + 19 + A[1][0] * 0.7, 44 + L + A[1][1] * 0.8, 4.5, 8, C);
        p.outline(INKC);
        return p;
      } },

    /* ------------------------------------------------------------- BRUNO
       A very large, very soft bear in a black tee and sunglasses, with an
       earpiece. He is the door. The glasses come off when something happens. */
    { name: 'BRUNO', race: 'OBB', calling: 'DOORMAN', acc: '#ffd34d', motion: 'lumber',
      say: 'YOU ARE ON THE LIST. EVERYBODY IS ON THE LIST. IT IS A LONG LIST.',
      build(f) {
        const W = 84, H = 80, p = pix(W, H), cx = 42, q = FR(f), L = q.lift;
        const C = ['#b07a4e', '#dcae80', '#70482a'], MU = '#f2d4ac', TEE = ['#2c2c3c', '#4c4c64', '#16161f'];
        feet(p, cx, H - 6, 12, 8, 5, q, C);
        ball(p, cx, 56 + L, 27, 20, TEE);
        p.rect(cx - 12, 52 + L, 25, 4, '#ffd34d'); p.rect(cx - 12, 52 + L, 25, 1, '#fff0a0');
        for (const s of [-1, 1]) { ball(p, cx + s * 15, 15 + L, 6.5, 6, C); p.ellipse(cx + s * 15, 16 + L, 3.5, 3, '#e8a0a0'); }
        ball(p, cx, 28 + L, 20, 17, C, true);
        p.ellipse(cx, 36 + L, 9, 6.5, MU);
        p.ellipse(cx, 33 + L, 3, 2, '#2a1a14'); p.rect(cx - 1, 32 + L, 1, 1, '#8a6a5a');
        const fy = 26 + L;
        const shades = !(q.shock || q.sad || q.sleep || q.laugh || q.cheer);
        if (shades) {
          p.round(cx - 16, fy - 3, 14, 8, 3, '#101018'); p.round(cx + 2, fy - 3, 14, 8, 3, '#101018');
          p.rect(cx - 3, fy - 2, 6, 2, '#101018');
          p.rect(cx - 13, fy - 2, 4, 1, '#6a8aff'); p.rect(cx + 5, fy - 2, 4, 1, '#6a8aff');
          if (q.angry) { brow(p, cx - 9, fy - 1, 4, -1, 1, INKC); brow(p, cx + 9, fy - 1, 4, 1, 1, INKC); }
        } else {
          if (q.shock) { p.round(cx - 16, fy - 16, 14, 7, 3, '#101018'); p.round(cx + 2, fy - 16, 14, 7, 3, '#101018'); }
          eyes(p, cx, fy, 8, 3, q);
        }
        mouth(p, cx, 40 + L, q, MU);
        // the earpiece and its curly wire
        for (let i = 0; i < 6; i++) p.set(cx + 20 + (i % 2), 22 + L + i * 2, '#c8c8d8');
        p.rect(cx + 18, 19 + L, 3, 3, '#3a3a4a');
        const A = armPose(q);
        nub(p, cx - 27 + A[0][0] * 1.2, 52 + L + A[0][1] * 1.3, 7, 9, C);
        nub(p, cx + 27 + A[1][0] * 1.2, 52 + L + A[1][1] * 1.3, 7, 9, C);
        p.outline(INKC);
        return p;
      } },

    /* ------------------------------------------------------------- SAL
       A pink axolotl in round glasses with a clipboard: frilly gills, a
       permanent wide smile, and a stamp for everything. */
    { name: 'SAL', race: 'NEWTLING', calling: 'NOTARY', acc: '#f7b0c8', motion: 'sway',
      say: 'SIGN HERE. AND HERE. AND ON THE BACK. NO, THE OTHER BACK.',
      build(f) {
        const W = 68, H = 70, p = pix(W, H), cx = 34, q = FR(f), L = q.lift;
        const C = ['#f8b4cc', '#ffe2ee', '#d27a9a'], G = ['#e2508c', '#ff98c0', '#a82a60'];
        p.ellipse(cx + 19, 56 + L, 11, 5, C[2]); p.ellipse(cx + 18, 55 + L, 10, 4, C[0]);     // tail
        feet(p, cx, H - 5, 8, 5, 3.5, q, C);
        ball(p, cx, 52 + L, 14, 13, C);
        p.ellipse(cx, 55 + L, 8, 8, '#fff2f6');
        // gills, three a side, waving
        for (let k = 0; k < 3; k++) {
          const w = Math.sin(f * 1.3 + k) * 1.5;
          for (const s of [-1, 1]) {
            const gx = cx + s * (22 + k * 1.5), gy = 20 + k * 7 + L + w * s;
            p.ellipse(gx, gy, 5.5, 2.6, G[2]); p.ellipse(gx - s * 0.5, gy - 0.5, 4.5, 1.8, G[0]);
            p.ellipse(gx + s * 2.5, gy - 0.5, 1.8, 1, G[1]);
          }
        }
        ball(p, cx, 31 + L, 22, 15, C, true);
        const fy = 30 + L;
        blush(p, cx, fy + 6, 13, q);
        for (const s of [-1, 1]) { p.ellipse(cx + s * 9, fy, 6, 6, '#6a3a2a'); p.ellipse(cx + s * 9, fy, 5, 5, C[0]); }
        p.rect(cx - 3, fy - 1, 6, 1, '#6a3a2a');
        eyes(p, cx, fy, 9, 3, q, { iris: '#a83a6a' });
        mouth(p, cx, fy + 8, q, C[0]);
        // the clipboard
        const A = armPose(q);
        const bx = cx - 16 + (q.cheer ? -4 : 0), by = 44 + L + (q.cheer ? -14 : 0);
        p.rect(bx - 6, by - 7, 12, 15, '#8a5a3a'); p.rect(bx - 5, by - 5, 10, 12, '#ffffff');
        for (let i = 0; i < 4; i++) p.rect(bx - 4, by - 3 + i * 3, 7 - (i % 2) * 2, 1, '#9a9aaa');
        p.rect(bx - 2, by - 8, 4, 2, '#c8c8d8');
        nub(p, bx + 4, by + 2, 3.5, 3, C);
        nub(p, cx + 14 + A[1][0], 48 + L + A[1][1], 3.5, 3, C);
        p.outline(INKC);
        return p;
      } },

    /* ------------------------------------------------------------- VESPER
       A small ghost in a sheet, with a red bow tie and a lantern. The usher:
       it shows you to your seat and then it floats about near you forever. */
    { name: 'VESPER', race: 'PALE VESH', calling: 'USHER', acc: '#b0aad0', motion: 'float',
      say: 'RIGHT THIS WAY. NO, THROUGH THE WALL. OH. YOU CANNOT. SORRY.',
      build(f) {
        const W = 60, H = 70, p = pix(W, H), cx = 30, q = FR(f), L = q.lift;
        const C = ['#eeecfa', '#ffffff', '#b2acd2'];
        ball(p, cx, 28 + L, 20, 20, C, true);
        p.rect(cx - 20, 28 + L, 41, 26, C[0]);
        p.rect(cx + 14, 30 + L, 6, 24, C[2]);
        p.rect(cx - 16, 32 + L, 3, 18, C[1]);
        for (let i = 0; i < 5; i++) {
          const hx = cx - 16 + i * 8, hy = 54 + L + ((i + f) % 2 ? 2 : 0);
          p.ellipse(hx, hy, 4.5, 4, i === 4 ? C[2] : C[0]);
        }
        const fy = 28 + L;
        blush(p, cx, fy + 6, 11, q);
        eyes(p, cx, fy, 7, 3.5, q, { iris: '#4a4a8a' });
        mouth(p, cx, fy + 8, q, C[0]);
        p.ellipse(cx - 4, 42 + L, 3.5, 2.5, '#d83a4a'); p.ellipse(cx + 4, 42 + L, 3.5, 2.5, '#d83a4a');
        p.rect(cx - 1, 41 + L, 3, 3, '#a82030');
        // the lantern, swinging a little
        const A = armPose(q);
        const lx = cx + 22 + A[1][0] * 0.5, ly = 40 + L + A[1][1] * 0.6;
        stick(p, lx, ly, lx, ly + 5, 1, '#3a3a4a');
        p.round(lx - 4, ly + 5, 9, 10, 2, '#3a3a4a'); p.rect(lx - 3, ly + 7, 7, 6, '#ffd860'); p.rect(lx - 1, ly + 8, 2, 3, '#ffffff');
        nub(p, lx - 3, ly + 1, 3.5, 3, C);
        nub(p, cx - 20 + A[0][0] * 0.7, 40 + L + A[0][1] * 0.7, 3.5, 3, C);
        p.outline(INKC);
        return p;
      } },

    /* ------------------------------------------------------------- ORBIT
       A small orange planet with a ring round its middle and a moon that
       will not leave it alone. Sweeps up. Floats about doing it. */
    { name: 'ORBIT', race: 'SATELLITE', calling: 'SWEEPER', acc: '#b8a0ff', motion: 'float',
      say: 'I CONTAIN A SMALL WEATHER SYSTEM. IT IS RAINING IN THERE. SORRY.',
      build(f) {
        const W = 72, H = 64, p = pix(W, H), cx = 36, cy = 36, q = FR(f), L = q.lift;
        const C = ['#ffa060', '#ffd4a8', '#c85e3a'], RG = ['#bca4ff', '#e4d8ff', '#7a62c8'];
        const Y = cy + L;
        // the ring, behind
        p.ellipse(cx, Y, 31, 8, RG[2]); p.ellipse(cx, Y, 29, 6.5, RG[0]); p.ellipse(cx, Y, 25, 4.5, null);
        ball(p, cx, Y, 20, 20, C, true);
        for (const [dy, w] of [[-9, 1], [6, 2], [12, 1]]) {
          const hw = Math.sqrt(Math.max(0, 19 * 19 - dy * dy)) - 2;
          p.rect(Math.round(cx - hw), Y + dy, Math.round(hw * 2), w, '#e8783e');
        }
        p.ellipse(cx + 10, Y - 12, 2.5, 2, C[2]); p.ellipse(cx - 13, Y + 8, 2, 1.5, C[2]);
        // the ring again, the half in front
        for (let a = 0.08; a < Math.PI - 0.08; a += 0.04) {
          for (let r = 26; r <= 30; r++) p.set(Math.round(cx + Math.cos(a) * r), Math.round(Y + Math.sin(a) * r * 0.24), r > 28 ? RG[2] : RG[0]);
        }
        const ma = f * 0.9 + 0.6;
        ball(p, cx + Math.cos(ma) * 27, 12 + Math.sin(ma) * 5 + L, 4.5, 4.5, ['#c8c8d8', '#ffffff', '#8a8a9a']);
        const fy = Y - 2;
        blush(p, cx, fy + 5, 11, q);
        eyes(p, cx, fy, 7, 3, q, { iris: '#a8402a' });
        mouth(p, cx, fy + 7, q, C[0]);
        const A = armPose(q);
        nub(p, cx - 21 + A[0][0] * 0.6, Y + 4 + A[0][1] * 0.8, 3.5, 3.5, C);
        nub(p, cx + 21 + A[1][0] * 0.6, Y + 4 + A[1][1] * 0.8, 3.5, 3.5, C);
        p.outline(INKC);
        return p;
      } },

    /* ------------------------------------------------------------- PIP
       A little flame on two coal feet, flickering, with a face in the bright
       bit. The tout: it hops about outside and shouts about prices. */
    { name: 'PIP', race: 'EMBERLING', calling: 'TOUT', acc: '#ff8a2a', motion: 'hop',
      say: 'HOT DEALS. HOT. I AM ALSO HOT. DO NOT TOUCH ME.',
      build(f) {
        const W = 56, H = 66, p = pix(W, H), cx = 28, q = FR(f), L = q.lift;
        const O = ['#ff7e2e', '#ffb850', '#c8401a'];
        const fl = [0, 2, -2, 1, -1, 2, -1, 0, 3, 1, 2, -2][f] || 0;
        feet(p, cx, H - 5, 7, 5, 3.5, q, ['#3a2a2a', '#5a4a4a', '#1a1010']);
        p.spike(cx + fl, 6 + L, 22, 30, -1, O[0]);
        p.spike(cx - 10, 18 + L, 9, 16, -1, O[0]); p.spike(cx + 11, 20 + L, 8, 14, -1, O[0]);
        ball(p, cx, 43 + L, 17, 16, O);
        p.spike(cx + fl * 0.6, 16 + L, 13, 22, -1, '#ffd860');
        p.ellipse(cx, 45 + L, 11, 11, '#ffd860');
        p.ellipse(cx, 50 + L, 6, 5, '#fff6c8');
        const fy = 41 + L;
        blush(p, cx, fy + 5, 10, q, '#ff7a5a');
        eyes(p, cx, fy, 6, 3, q, { iris: '#a83a1a' });
        mouth(p, cx, fy + 6, q, '#ffd860');
        const A = armPose(q);
        nub(p, cx - 16 + A[0][0] * 0.6, 44 + L + A[0][1] * 0.7, 3.5, 3, O);
        nub(p, cx + 16 + A[1][0] * 0.6, 44 + L + A[1][1] * 0.7, 3.5, 3, O);
        p.outline(INKC);
        return p;
      } },

    /* ------------------------------------------------------------- BAO
       A dumpling with a pleated top, pink cheeks, and steam coming off it.
       Deals cards. Is also, technically, lunch. Does not like to discuss it. */
    { name: 'BAO', race: 'BAOZI', calling: 'DEALER', acc: '#ffb0b8', motion: 'hop',
      say: 'I AM NOT A SNACK. I AM A PROFESSIONAL. PLEASE STOP SNIFFING.',
      build(f) {
        const W = 60, H = 56, p = pix(W, H), cx = 30, q = FR(f), L = q.lift;
        const C = ['#fbf6ec', '#ffffff', '#d6c8b2'];
        for (let i = 0; i < 3; i++) {
          const sx = cx - 6 + i * 6, ph = (f + i) % 3;
          p.rect(sx + (ph === 1 ? 1 : 0), 3 + ph, 1, 3, '#e8e8f0'); p.rect(sx + (ph === 1 ? 0 : 1), 7 + ph, 1, 3, '#e8e8f0');
        }
        feet(p, cx, H - 4, 9, 4, 3, q, C);
        ball(p, cx, 36 + L, 23, 16, C, true);
        p.ellipse(cx, 21 + L, 7, 4, C[0]);
        for (const s of [-1, 1]) for (let k = 0; k < 3; k++) stick(p, cx + s * 2, 21 + L, cx + s * (7 + k * 5), 26 + L + k * 2, 1, '#cbbba2');
        p.ellipse(cx, 19 + L, 2, 1.5, '#e0d0b8');
        const fy = 35 + L;
        blush(p, cx, fy + 5, 12, q);
        eyes(p, cx, fy, 8, 3, q, { iris: '#8a5a3a' });
        mouth(p, cx, fy + 6, q, C[0], { cat: 1 });
        const A = armPose(q);
        nub(p, cx - 21 + A[0][0] * 0.6, 40 + L + A[0][1] * 0.7, 3.5, 3, C);
        nub(p, cx + 21 + A[1][0] * 0.6, 40 + L + A[1][1] * 0.7, 3.5, 3, C);
        p.outline(INKC);
        return p;
      } },

    /* ------------------------------------------------------------- WOBBLE
       A pink jellyfish, spotted, trailing ribbons, bobbing along at head
       height. The regular: it drifts in at opening and drifts out at close. */
    { name: 'WOBBLE', race: 'DRIFTER', calling: 'REGULAR', acc: '#f7a0c8', motion: 'float',
      say: 'I JUST FOLLOW THE CURRENT. THE CURRENT GOES TO THE BAR.',
      build(f) {
        const W = 60, H = 74, p = pix(W, H), cx = 30, q = FR(f), L = q.lift;
        const C = ['#f8a4ca', '#ffdcee', '#c86c9a'];
        ball(p, cx, 30 + L, 22, 18, C, true);
        p.rect(cx - 23, 38 + L, 47, 10, null);
        for (let i = 0; i < 6; i++) p.ellipse(cx - 17 + i * 7, 37 + L, 4, 2.5, i % 2 ? C[2] : C[0]);
        const wave = q.cheer || q.shock ? 2 : 1;
        for (let k = 0; k < 5; k++) {
          for (let i = 0; i < 14; i++) {
            const x = cx - 12 + k * 6 + Math.sin(f * 1.1 + i * 0.55 + k) * 2 * wave;
            const w = i < 5 ? 3 : 2;
            p.rect(Math.round(x), 38 + L + i * 2, w, 2, k % 2 ? C[2] : C[0]);
          }
        }
        for (const s of [-1, 1]) for (let i = 0; i < 9; i++) p.ellipse(cx + s * 4 + Math.sin(f + i * 0.7) * 1.5, 40 + L + i * 2.5, 2.5, 1.5, C[1]);
        for (const [sx, sy, sr] of [[-12, 20, 2.5], [10, 16, 2], [14, 26, 1.5], [-4, 14, 1.5]]) p.ellipse(cx + sx, sy + L, sr, sr, C[1]);
        const fy = 28 + L;
        blush(p, cx, fy + 5, 12, q);
        eyes(p, cx, fy, 8, 3.5, q, { iris: '#a83a7a' });
        mouth(p, cx, fy + 7, q, C[0]);
        p.outline(INKC);
        return p;
      } }
  ];


  /* What the house-built species are called and what they do, so the tag
     over their heads says the same kind of thing as everybody else's. */
  const SPECIES_ID = {
    'UNIT 12': ['SERVICE UNIT', 'MECHANIC', 'roll'], 'THE JAR': ['BRAIN IN A JAR', 'CONCIERGE', 'float'],
    'POTTED PETE': ['HOUSEPLANT', 'IN A POT', 'sway'], 'SUNNY': ['SUNFLOWER', 'NEVER LOSES', 'sway'],
    'THE LAMP': ['LAVA LAMP', 'MOOD LIGHTING', 'still'], 'DUCKY': ['RUBBER DUCK', 'CHANGE GIRL', 'waddle'],
    'THE SET': ['TELEVISION', 'SHOWS THE RACING', 'still']
  };

  function makeCast() {
    for (let i = 0; i < CAST.length; i++) {
      const c = CAST[i];
      const frames = [];
      for (let fr = 0; fr < NFRAMES; fr++) frames.push(c.build(fr));
      const W = frames[0].w, H = frames[0].h;
      const t = { key: 'cast' + i, celeb: c.name, who: c.name, race: c.race, calling: c.calling,
        say: c.say, acc: c.acc, motion: c.motion, smoke: c.smoke || 0, cast: 1 };
      regRaw(t.key, frames, W / 2 / HD, H / HD);
      t.w = W / HD; t.h = H / HD;
      KIN.push(t);
    }
  }

  function makeSpecies() {
    for (let i = 0; i < SPECIES.length; i++) {
      const sp = SPECIES[i];
      // the species were drawn with seven faces; the five new ones borrow the nearest
      const frames = [0, 1, 2, 3, 4, 5, 6, 5, 3, 3, 6, 5].map(f => sp.build(f));
      const W = frames[0].w, H = frames[0].h;
      const id = SPECIES_ID[sp.name] || ['', '', 'still'];
      const t = { key: 'sp' + i, celeb: sp.name, who: sp.name, race: id[0], calling: id[1], motion: id[2],
        say: sp.say, acc: sp.acc, species: 1 };
      regRaw(t.key, frames, W / 2 / HD, H / HD);
      t.w = W / HD; t.h = H / HD;
      KIN.push(t);
    }
  }

  function djAlien(frame) {
    const p = pix(42, 36);
    p.rect(19, 0, 3, 7, '#1d8a7e');                     // an antenna, bent
    p.disc(21, 1, 3, '#c4fff6');
    p.ellipse(21, 20, 14, 13, '#5fe8d8');
    p.ellipse(21, 13, 10, 6, '#c4fff6');
    for (const ex of [16, 26]) {
      p.ellipse(ex, 19, 4, 5, '#ffffff');
      p.ellipse(ex, 20, 2, 3, '#140f26');
      p.set(ex - 1, 17, '#ffffff');
    }
    p.rect(17, 27, 9, 2, '#1d8a7e');
    p.rect(19, 29, 5, 1, '#0f5a52');
    // the cans
    p.round(1, 10, 10, 14, 4, '#8e86a8');
    p.round(31, 10, 10, 14, 4, '#8e86a8');
    p.round(3, 12, 6, 10, 3, '#3a3348');
    p.round(33, 12, 6, 10, 3, '#3a3348');
    p.rect(2, 15, 8, 2, '#ff5fa8');
    p.rect(32, 15, 8, 2, '#ff5fa8');
    p.rect(8, 4, 26, 3, '#8e86a8');
    p.rect(4, 5, 4, 7, '#8e86a8'); p.rect(34, 5, 4, 7, '#8e86a8');
    // and the arm, down on whichever deck he is working
    p.round(frame ? 30 : 4, 26, 9, 5, 2, '#5fe8d8');
    p.round(frame ? 34 : 3, 29, 6, 4, 2, '#c4fff6');
    p.outline(P.ink);
    return p;
  }

  /* The door. Square, bored, wearing sunglasses indoors at night, and built to
     the same scale as everybody else -- at half size he looked like somebody's
     child had been left on the rope. */
  function bouncer() {
    const p = pix(64, 100);
    const SUIT = '#1d1119', SUITL = '#2e2030', SKIN = '#8a7ab0', SKD = '#5e4e82';
    const cx = 32;
    p.round(cx - 15, 74, 13, 26, 4, SUIT);              // legs
    p.round(cx + 2, 74, 13, 26, 4, SUIT);
    p.rect(cx - 15, 95, 14, 5, '#0a0408');
    p.rect(cx + 2, 95, 14, 5, '#0a0408');
    p.round(cx - 21, 40, 42, 38, 8, SUIT);              // a chest like a wardrobe
    p.round(cx - 21, 40, 42, 4, 3, SUITL);
    p.round(cx - 6, 39, 12, 22, 3, '#c9c4b4');          // shirt
    p.round(cx - 20, 40, 15, 26, 5, SUITL);             // lapels
    p.round(cx + 5, 40, 15, 26, 5, SUITL);
    p.rect(cx - 2, 43, 4, 20, '#7a1024');               // the tie
    p.rect(cx - 3, 42, 6, 4, '#c02038');
    p.round(cx - 24, 56, 48, 11, 5, SUIT);              // arms folded across it
    p.round(cx - 24, 56, 48, 3, 2, SUITL);
    p.round(cx + 8, 58, 10, 8, 3, SKIN);
    p.round(cx - 17, 59, 9, 7, 3, SKD);
    p.ellipse(cx, 22, 18, 17, SKIN);                    // the head
    p.ellipse(cx, 12, 13, 7, '#a89bd0');
    p.ellipse(cx, 33, 12, 6, SKD);                      // the jaw
    p.round(cx - 17, 15, 34, 10, 3, '#140f26');         // the shades
    p.rect(cx - 15, 17, 12, 5, '#3a3348');
    p.rect(cx + 3, 17, 12, 5, '#3a3348');
    p.rect(cx - 15, 17, 4, 2, '#6b6480');
    p.rect(cx - 3, 18, 6, 2, '#140f26');                // the bridge
    p.rect(cx - 17, 16, 3, 3, '#140f26');
    p.rect(cx + 14, 16, 3, 3, '#140f26');
    p.rect(cx - 8, 32, 16, 3, '#5e4e82');               // a flat, unimpressed mouth
    p.rect(cx - 5, 36, 10, 2, '#4a3e6a');
    p.round(cx - 12, 4, 24, 7, 3, '#4a4260');           // and a flat top of hair
    p.rect(cx - 12, 9, 24, 3, '#4a4260');
    p.rect(cx + 15, 26, 4, 8, '#3a3348');               // an earpiece, curling down
    p.rect(cx + 17, 32, 2, 8, '#3a3348');
    p.outline(P.ink);
    return p;
  }

  /* THE DANCER. Four poses on a pole, all drawn in one canvas with the pole
     always at the same column, so the act lines up with the pole the room
     draws. A hold, a lean, a leg out, and the upside-down one. Sequins, a
     feather boa, and the professional detachment of somebody working a
     Tuesday. */
  const DPX = 40, DW = 60, DH = 78;
  function dancer(f) {
    const p = pix(DW, DH);
    const S1 = '#ff5fa8', S2 = '#c22a6a', SD = '#a33a78', L = '#ffd6f0';
    const G = '#ffd34d', B = '#c9a0ff';
    const POSE = [
      { bx: 24, by: 46, up: 1, legs: 'stand' },
      { bx: 17, by: 50, up: 1, legs: 'lean' },
      { bx: 26, by: 44, up: 1, legs: 'kick' },
      { bx: 24, by: 54, up: 0, legs: 'invert' }
    ][f];
    const bx = POSE.bx, by = POSE.by;

    // a tapering tentacle from one point to another, with a bit of curve in it
    const leg = (x0, y0, x1, y1, w) => {
      for (let i = 0; i <= 16; i++) {
        const q = i / 16;
        const x = x0 + (x1 - x0) * q + Math.sin(q * 3.1) * 3;
        const y = y0 + (y1 - y0) * q;
        const ww = Math.max(2, Math.round(w - q * (w - 2)));
        p.rect(x - ww / 2, y, ww, 2, q > 0.55 ? SD : S2);
      }
    };
    if (POSE.legs === 'stand') { leg(bx - 6, by + 8, bx - 11, 74, 7); leg(bx + 2, by + 9, bx + 5, 74, 7); leg(bx + 9, by + 6, bx + 22, 70, 5); }
    if (POSE.legs === 'lean') { leg(bx - 3, by + 8, bx + 8, 74, 7); leg(bx + 5, by + 5, bx + 20, 66, 6); leg(bx - 8, by + 4, bx - 13, 58, 5); }
    if (POSE.legs === 'kick') { leg(bx - 6, by + 8, bx - 9, 74, 7); leg(bx + 8, by + 2, bx + 33, 30, 6); leg(bx + 1, by + 9, bx + 9, 72, 6); }
    // upside down: head low over the boards, legs wrapped up the pole
    if (POSE.legs === 'invert') { leg(bx - 4, by - 10, DPX - 6, 12, 7); leg(bx + 6, by - 10, DPX + 4, 8, 7); leg(bx, by - 11, DPX + 12, 22, 5); }

    // the grip: a tentacle from the body to the pole, and a hand on it
    if (POSE.up) {
      const gy = 14;
      for (let i = 0; i <= 14; i++) {
        const q = i / 14;
        p.rect(bx + 7 + (DPX - bx - 7) * q - 2, by - 6 + (gy - by + 6) * q - 1, 4, 3, S1);
      }
      p.ellipse(DPX, gy, 5, 4, L);
      p.rect(DPX - 5, gy - 1, 10, 2, S2);
    }

    // the body, and what little there is of the outfit
    p.ellipse(bx, by, 12, 12, S1);
    p.ellipse(bx, by - 6, 9, 6, L);
    p.round(bx - 11, by + 2, 22, 10, 3, G);
    p.rect(bx - 11, by + 4, 22, 1, '#fff3b0');
    for (let i = 0; i < 6; i++) p.set(bx - 9 + i * 4, by + 6 + (i % 2) * 3, '#ffffff');
    // the boa, which cost more than the outfit
    for (let i = 0; i < 8; i++) p.disc(bx - 14 + i * 4, by - 10 + Math.sin(i * 1.2) * 3, 3, i % 2 ? B : '#d8bcff');
    // the face: one eye on the pole, one on the clock
    for (const ex of [bx - 5, bx + 4]) {
      if (f === 1) { p.rect(ex - 3, by - 3, 7, 2, '#140f26'); continue; }
      p.ellipse(ex, by - 3, 3, 4, '#ffffff');
      p.ellipse(ex + (f === 2 ? 1 : 0), by - 2, 2, 2, '#140f26');
      p.set(ex - 1, by - 5, '#ffffff');
    }
    p.round(bx - 3, by + 1, 7, 2, 1, S2);
    p.outline(P.ink);
    return p;
  }

  /* ----------------------------------------------------------- THE HOUSE
     A croupier, built to the same scale as everybody else in the room -- the
     first pass came out seventeen pixels wide next to a crowd of thirty-one
     and he vanished behind his own table.

     Black waistcoat, white shirt, a red bow tie, a moustache you could hang a
     coat on, and both hands out flat over the felt at all times so that
     everybody can see there is nothing in them. There never is. The money
     still goes the same way. */
  const DLW = 64, DLH = 100;
  function dealer(f, k) {
    const p = pix(DLW, DLH);
    const SKIN = ['#8fd6a0', '#c9a0ff', '#e8a97a'][k];
    const SKD = ['#4d8f63', '#7a4aa8', '#a86c40'][k];
    const HAIR = ['#2a1c14', '#140f26', '#4a2c14'][k];
    const BLK = '#1d1119', BLKL = '#2e2030', WHT = '#f4f0ff';
    const cx = 32;

    // the legs, most of which the table has
    p.round(cx - 13, 74, 11, 26, 4, BLK);
    p.round(cx + 2, 74, 11, 26, 4, BLK);
    p.rect(cx - 13, 96, 12, 4, '#0a0408');
    p.rect(cx + 2, 96, 12, 4, '#0a0408');
    // the waistcoat over the shirt
    p.round(cx - 17, 42, 34, 36, 7, BLK);
    p.round(cx - 17, 42, 34, 4, 3, BLKL);
    p.round(cx - 7, 41, 14, 32, 4, WHT);                // the shirt front
    p.rect(cx - 1, 46, 2, 26, '#d4ccea');
    for (let i = 0; i < 4; i++) p.disc(cx, 50 + i * 6, 1, '#ffd34d');
    p.round(cx - 16, 42, 12, 26, 5, BLKL);              // lapels
    p.round(cx + 4, 42, 12, 26, 5, BLKL);
    p.round(cx + 6, 60, 7, 8, 2, '#7a1024');            // the pocket square
    p.rect(cx + 6, 60, 7, 2, '#c02038');
    // the arms, out over the felt. One of them moves; that is the deal.
    const ay = f ? 52 : 56;
    p.round(cx - 27, ay, 14, 9, 4, BLK);
    p.round(cx + 13, ay + (f ? -4 : 0), 14, 9, 4, BLK);
    p.round(cx - 31, ay + 2, 8, 7, 3, SKIN);            // and the hands
    p.round(cx + 25, ay + (f ? -2 : 2), 8, 7, 3, SKIN);
    // the head: big, the way everybody else in this room is built
    p.ellipse(cx, 24, 17, 18, SKIN);
    p.ellipse(cx, 33, 13, 8, SKD);                      // the jaw
    p.ellipse(cx, 13, 13, 7, ['#a8e6b4', '#dcc0ff', '#f6c89a'][k]);
    for (const ex of [cx - 7, cx + 7]) {                // real eyes, with a light in them
      p.ellipse(ex, 22, 5, 6, '#f6f8ff');
      p.ellipse(ex, 23, 3, 3, '#140f26');
      p.rect(ex - 2, 19, 2, 2, '#ffffff');
    }
    p.rect(cx - 12, 13, 8, 3, HAIR);                    // brows
    p.rect(cx + 4, 13, 8, 3, HAIR);
    if (k === 1) {                                      // one of them wears the visor
      p.round(cx - 16, 2, 32, 8, 3, '#1d6a4a');
      p.round(cx - 18, 9, 36, 5, 2, '#2f9a6a');
      p.rect(cx - 15, 4, 30, 2, '#3fb87e');
      p.rect(cx - 17, 10, 34, 1, '#5fd89e');
    } else {
      p.round(cx - 15, 0, 30, 8, 4, HAIR);              // and the rest have hair
      p.rect(cx - 15, 6, 30, 3, HAIR);
      p.rect(cx - 13, 2, 9, 2, SKD);
    }
    // the moustache, which is most of the face
    p.round(cx - 10, 31, 20, 5, 2, HAIR);
    p.round(cx - 14, 32, 8, 5, 2, HAIR);
    p.round(cx + 6, 32, 8, 5, 2, HAIR);
    p.rect(cx - 3, 37, 7, 2, SKD);
    // collar and the red bow tie
    p.round(cx - 9, 36, 8, 7, 2, WHT);
    p.round(cx + 1, 36, 8, 7, 2, WHT);
    p.round(cx - 10, 38, 9, 7, 3, '#c02038');
    p.round(cx + 1, 38, 9, 7, 3, '#c02038');
    p.round(cx - 3, 39, 6, 5, 2, '#7a1024');
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
  makeCast();
  makeSpecies();
  reg('dj', [djAlien(0), djAlien(1)]);
  reg('bouncer', [bouncer()]);
  for (let i = 0; i < 3; i++) reg('dealer' + i, [dealer(0, i), dealer(1, i)]);
  regRaw('dancer', [0, 1, 2, 3].map(dancer), DPX / HD, DH / HD);
  reg('flag', [flag(0), flag(1)], 3);
  reg('skull', [celestialHead()]);
  reg('tape', [tapeDeck(0), tapeDeck(1)]);

  PD.arthome = {
    S, P, KIN, CAST, SPECIES, hsl, buildMoon, buildPlanet, blit, HD, mitten, reg, regRaw };
})(window.PD);
