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

  /* ------------------------------------------------------------- THE DOCKS
     A landing apron with a gantry crane and fuel. The pod parks on it. */
  function docks(t) {
    const w = 170 + t * 30, h = 120 + t * 30;
    const p = pix(w, h);
    const base = h - 1;
    // apron
    p.round(0, base - 18, w, 18, 6, P.steelDD);
    p.round(4, base - 16, w - 8, 8, 3, P.steel);
    for (let i = 10; i < w - 10; i += 16) p.rect(i, base - 13, 8, 3, P.amber);
    for (let i = 0; i < 6; i++) lamp(p, 12 + i * ((w - 24) / 5), base - 6, i % 2 ? P.glow : P.amber);
    // gantry crane, right
    const gx = w - 40;
    pipeV(p, gx, base - 90 - t * 10, 74 + t * 10);
    pipeV(p, gx + 22, base - 90 - t * 10, 74 + t * 10);
    for (let y = base - 84 - t * 10; y < base - 24; y += 14) { girder(p, gx + 3, y, gx + 22, y + 8); girder(p, gx + 22, y, gx + 3, y + 8); }
    pipeH(p, gx - 60 - t * 12, base - 92 - t * 10, 88 + t * 12);
    p.round(gx - 52 - t * 12, base - 100 - t * 10, 26, 12, 3, P.amber);        // trolley
    p.line(gx - 40 - t * 12, base - 88 - t * 10, gx - 40 - t * 12, base - 56, '#d6cfe8');
    p.round(gx - 46 - t * 12, base - 58, 12, 8, 3, P.steel);                   // hook block
    p.disc(gx - 40 - t * 12, base - 48, 4, P.gold);
    // fuel tanks, left
    for (let i = 0; i <= t; i++) {
      const tx = 6 + i * 26;
      p.round(tx, base - 60, 22, 42, 8, '#ff8a3d');
      p.shade('#ff8a3d', '#c25c14', 0, 1);
      p.rect(tx + 4, base - 50, 14, 4, '#ffd6b0');
      p.round(tx + 6, base - 66, 10, 8, 3, P.steelDD);
      p.rect(tx + 2, base - 34, 18, 3, P.steelDD);
    }
    pipeH(p, 8, base - 24, 40 + t * 26);
    // control shack + tower at tier 2
    if (t >= 1) {
      const sx = w / 2 - 20;
      p.round(sx, base - 50, 44, 32, 4, P.navy);
      p.shade(P.navy, P.navyD, 0, 1);
      windows(p, sx + 6, base - 42, 3, 1, 1, 12);
      p.round(sx - 2, base - 56, 48, 8, 3, P.steelD);
      lamp(p, sx + 22, base - 60, P.red);
    }
    if (t >= 2) {
      const tx = w / 2 + 30;
      pipeV(p, tx, base - 118, 62);
      p.round(tx - 14, base - 128, 32, 18, 5, P.navyL);
      windows(p, tx - 9, base - 124, 2, 1, 1, 12);
      p.disc(tx + 2, base - 134, 4, P.glow);
    }
    p.outline(P.ink);
    return p;
  }

  /* ---------------------------------------------------------------- TERMINAL
     A kiosk with a market board, a dish, and a bench for waiting. */
  function terminal(t) {
    const w = 130 + t * 24, h = 130 + t * 26;
    const p = pix(w, h);
    const base = h - 1, cx = w / 2;
    // kiosk
    p.round(cx - 40, base - 60, 80, 60, 6, P.navy);
    p.shade(P.navy, P.navyD, 0, 1);
    p.round(cx - 44, base - 68, 88, 12, 5, P.rose);                // awning
    for (let i = 0; i < 88; i += 12) p.rect(cx - 44 + i, base - 58, 6, 4, '#ffd6e4');
    // the board: a bar chart that reads as a market
    p.round(cx - 34, base - 52, 68, 30, 3, '#07231b');
    for (let i = 0; i < 7; i++) {
      const bh = 6 + Math.floor(U.hash2(i, t + 3) * 18);
      p.rect(cx - 30 + i * 9, base - 26 - bh, 6, bh, i % 3 === 0 ? P.red : P.lime);
    }
    p.rect(cx - 32, base - 27, 64, 1, P.glowD);
    // counter window and a coin slot
    p.round(cx - 12, base - 18, 24, 18, 3, '#2a2440');
    p.round(cx - 10, base - 16, 20, 14, 2, P.warm);
    p.rect(cx + 18, base - 14, 12, 3, P.gold);
    // mast with dishes and a blinking top
    const mx = cx + 30;
    pipeV(p, mx, 24, base - 68 - 24);
    for (let i = 0; i <= t; i++) {
      const dy = 34 + i * 22, side = i % 2 ? 1 : -1;
      p.ellipse(mx + 2 + side * 14, dy, 12, 7, P.steelD);
      p.ellipse(mx + 2 + side * 14, dy - 2, 8, 4.4, P.glow);
      p.rect(mx + (side > 0 ? 4 : -10), dy - 1, 10, 2, P.steelDD);
    }
    p.disc(mx + 2, 18, 8, P.gold); p.disc(mx + 2, 18, 5, P.goldD); p.rect(mx, 10, 4, 10, P.gold);
    lamp(p, mx + 2, 6, P.red);
    // bench + bunting
    p.round(cx - 62, base - 14, 22, 5, 2, '#8a5a3a'); p.rect(cx - 60, base - 9, 3, 9, '#5a3a24'); p.rect(cx - 45, base - 9, 3, 9, '#5a3a24');
    for (let i = 0; i < 6; i++) p.rect(cx - 40 + i * 14, base - 76 + Math.abs(i - 3), 5, 7, [P.rose, P.amber, P.lime, P.glow, P.gold, P.rose][i]);
    if (t >= 2) {                                                     // billboard
      p.round(cx - 74, base - 118, 60, 40, 4, P.steelD);
      p.round(cx - 70, base - 114, 52, 32, 3, '#0f2a2e');
      p.rect(cx - 64, base - 106, 40, 4, P.lime); p.rect(cx - 64, base - 98, 28, 4, P.gold); p.rect(cx - 64, base - 90, 34, 4, P.rose);
      pipeV(p, cx - 48, base - 78, 78);
    }
    p.outline(P.ink);
    return p;
  }

  /* -------------------------------------------------------------- FABRICATOR
     A factory box with a printer arm, a furnace door and a conveyor. */
  function fab(t) {
    const w = 150 + t * 28, h = 120 + t * 26;
    const p = pix(w, h);
    const base = h - 1;
    p.round(4, base - 70, w - 8, 70, 6, '#6b4a3a');
    p.shade('#6b4a3a', '#472f24', 0, 1);
    for (let i = 0; i < w - 8; i++) p.rect(4 + i, base - 80 - Math.floor(i * 0.06), 1, 12, '#c4553a');   // sloping roof
    p.rect(4, base - 70, w - 8, 4, '#8a3a2a');
    windows(p, 14, base - 60, 3 + t, 1, 1, 14);
    // furnace door
    p.round(w - 52, base - 40, 34, 34, 4, P.steelDD);
    p.round(w - 48, base - 36, 26, 26, 3, '#ff7a2a');
    p.round(w - 44, base - 32, 18, 14, 3, '#ffd27a');
    p.rect(w - 48, base - 22, 26, 2, P.steelDD); p.rect(w - 48, base - 16, 26, 2, P.steelDD);
    // printer arm over the bed
    const ax = 30;
    p.round(ax, base - 30, 60, 8, 3, P.steel);                     // bed
    pipeV(p, ax + 4, base - 66, 40); pipeV(p, ax + 52, base - 66, 40);
    pipeH(p, ax, base - 70, 60);
    p.round(ax + 18 + t * 6, base - 68, 16, 12, 3, P.amber);        // head
    p.rect(ax + 24 + t * 6, base - 56, 4, 10, P.glow);
    p.round(ax + 14, base - 46, 32, 14, 3, '#d6cfe8');              // the thing being printed
    p.rect(ax + 14, base - 40, 32, 1, P.glow);
    // conveyor out the side
    p.round(-2, base - 26, 40, 8, 3, P.steelDD);
    for (let i = 0; i < 40; i += 6) p.rect(i, base - 24, 3, 4, P.steel);
    p.round(6, base - 36, 12, 10, 2, '#8a5a3a');
    // chimneys
    for (let i = 0; i <= t; i++) {
      const cx = 70 + i * 26;
      p.round(cx, base - 108, 14, 30, 4, P.steelDD);
      p.rect(cx + 3, base - 104, 4, 22, P.steel);
      p.disc(cx + 7, base - 114 - (i % 2) * 6, 6, '#7d7396'); p.disc(cx + 13, base - 122 - (i % 2) * 6, 8, '#6b6480');
    }
    lamp(p, 12, base - 84, P.lime);
    p.outline(P.ink);
    return p;
  }

  /* ---------------------------------------------------------------- THE MIND
     A brain in a tank of acid, wired to a bank of computers. */
  function brainShape(p, cx, cy, r, col, colD, colL) {
    p.ellipse(cx, cy, r, r * 0.78, col);
    p.ellipse(cx - r * 0.5, cy - r * 0.25, r * 0.5, r * 0.5, col);
    p.ellipse(cx + r * 0.5, cy - r * 0.25, r * 0.5, r * 0.5, col);
    p.ellipse(cx, cy - r * 0.45, r * 0.55, r * 0.4, col);
    p.shade(col, colD, 0, 1);
    // folds
    for (let i = 0; i < 6; i++) {
      const a = -0.3 + i * 0.5;
      p.line(cx + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.2, cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.55, colD);
    }
    p.rect(cx - 1, cy - r * 0.8, 2, r * 1.4, colD);
    p.ellipse(cx - r * 0.35, cy - r * 0.55, r * 0.22, r * 0.12, colL);
    // stem
    p.round(cx - 4, cy + r * 0.6, 8, r * 0.5, 3, colD);
  }
  function mind(t) {
    const w = 150 + t * 30, h = 130 + t * 30;
    const p = pix(w, h);
    const base = h - 1;
    const tw = 70 + t * 14, th = 80 + t * 18, tx = 8, ty = base - 20 - th;
    // plinth
    p.round(0, base - 20, tw + 16, 20, 5, P.steelDD);
    p.rect(4, base - 17, tw + 8, 4, P.steel);
    for (let i = 0; i < 5; i++) lamp(p, 10 + i * ((tw - 4) / 4), base - 8, i % 2 ? P.lime : P.acid);
    // tank
    p.round(tx, ty, tw, th, 10, C.glass);
    p.round(tx + 4, ty + 8, tw - 8, th - 12, 8, P.acidD);
    p.round(tx + 4, ty + 14, tw - 8, th - 18, 8, P.acid);
    p.rect(tx + 6, ty + 14, tw - 12, 2, '#c8ffe0');                     // surface
    for (let i = 0; i < 6 + t * 2; i++) {                               // bubbles
      p.disc(tx + 8 + U.hash2(i, 5) * (tw - 16), ty + 20 + U.hash2(i, 9) * (th - 30), 1.4 + U.hash2(i, 3) * 1.6, '#e8fff2');
    }
    brainShape(p, tx + tw / 2, ty + th * 0.5, tw * 0.34, P.brain, P.brainD, P.brainL);
    p.rect(tx + 2, ty, 3, th, C.glassL);                                 // glass shine
    p.round(tx - 2, ty - 6, tw + 4, 10, 4, P.steelD);                     // lid
    pipeV(p, tx + tw / 2 - 2, ty - 24, 20); p.round(tx + tw / 2 - 8, ty - 30, 16, 8, 3, P.steelDD);
    // computer bank
    const bx = tx + tw + 8, bw = w - bx - 2;
    p.round(bx, base - 20 - (60 + t * 16), bw, 60 + t * 16, 4, P.navyD);
    p.round(bx + 3, base - 20 - (60 + t * 16) + 3, bw - 6, 20, 2, '#0f2a2e');
    for (let i = 0; i < 4; i++) p.rect(bx + 6, base - 20 - (60 + t * 16) + 7 + i * 4, 8 + Math.floor(U.hash2(i, t) * (bw - 20)), 2, i % 2 ? P.acid : P.glow);
    for (let j = 0; j < 3 + t; j++) for (let i = 0; i < 3; i++) p.rect(bx + 6 + i * 8, base - 44 + j * 7 - t * 16, 4, 3, U.hash2(i, j + t) > 0.5 ? P.lime : P.red);
    pipeH(p, tx + tw - 2, ty + th * 0.4, 12); pipeH(p, tx + tw - 2, ty + th * 0.7, 12);
    p.round(bx + 4, base - 26, bw - 8, 6, 2, P.steelDD);
    p.outline(P.ink);
    return p;
  }

  /* -------------------------------------------------------------- OBSERVATORY
     A dome on a stone base with a telescope poking out of the slit. */
  function obs(t) {
    const w = 130 + t * 24, h = 130 + t * 26;
    const p = pix(w, h);
    const base = h - 1, cx = w / 2;
    p.round(cx - 40, base - 50, 80, 50, 6, P.bone);
    p.shade(P.bone, P.boneD, 0, 1);
    for (let y = base - 44; y < base - 6; y += 10) p.rect(cx - 38, y, 76, 1, P.boneD);
    p.round(cx - 12, base - 24, 24, 24, 3, '#2a2440');
    p.round(cx - 10, base - 22, 20, 22, 2, P.warm);
    // dome
    const dr = 42 + t * 6;
    p.disc(cx, base - 50, dr, P.navyL);
    p.rect(0, base - 50, w, 60, null);
    p.shade(P.navyL, P.navy, 0, 1);
    for (let i = 1; i < 4; i++) p.line(cx - dr + i * dr * 0.5, base - 50, cx - dr + i * dr * 0.5, base - 50 - Math.sqrt(dr * dr - Math.pow(i * dr * 0.5 - dr, 2)), P.navy);
    p.rect(cx + 6, base - 50 - dr, 14, dr - 6, '#0b0720');           // the slit
    // telescope
    for (let k = 0; k < 40 + t * 8; k++) p.rect(cx + 10 + k * 0.7, base - 70 - k, 8, 4, k % 8 < 4 ? P.steel : P.steelD);
    p.round(cx + 34 + t * 5, base - 116 - t * 8, 14, 10, 3, P.glow);
    // radar array at tier 2
    if (t >= 2) {
      for (let i = 0; i < 3; i++) {
        const rx = 12 + i * 22;
        pipeV(p, rx, base - 70, 22);
        p.ellipse(rx + 2, base - 76, 10, 6, P.steelD); p.ellipse(rx + 2, base - 78, 7, 4, P.glow);
      }
    }
    lamp(p, cx, base - 52 - dr, P.red);
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
  function brainBig() {
    const p = pix(220, 170);
    brainShape(p, 110, 90, 78, P.brain, P.brainD, P.brainL);
    p.outline(P.ink);
    return p;
  }

  /* ------------------------------------------------------------- buildMoon */
  /* The moon disc, rasterised with integer scanlines at a low resolution and
     blown up: hard pixel steps all the way round, never a smooth circle. */
  function pxDisc(c, cx, cy, r, col) {
    c.fillStyle = col;
    const r2 = r * r;
    for (let y = Math.ceil(cy - r); y <= Math.floor(cy + r); y++) {
      const dy = y - cy + 0.5;
      const w = Math.sqrt(Math.max(0, r2 - dy * dy));
      const x0 = Math.round(cx - w), x1 = Math.round(cx + w);
      if (x1 > x0) c.fillRect(x0, y, x1 - x0, 1);
    }
  }
  function buildMoon(size, tint, seed) {
    const K = 2;
    const S = Math.max(10, Math.round(size / K));
    const src = document.createElement('canvas');
    src.width = src.height = S;
    const c = src.getContext('2d');
    const r = S / 2 - 0.5, cx = S / 2, cy = S / 2;
    const rnd = U.mulberry32(seed || 7);
    function shade(col, f) {
      const n = parseInt(col.slice(1), 16);
      const R = U.clamp(((n >> 16) & 255) * f, 0, 255) | 0, G = U.clamp(((n >> 8) & 255) * f, 0, 255) | 0, B = U.clamp((n & 255) * f, 0, 255) | 0;
      return 'rgb(' + R + ',' + G + ',' + B + ')';
    }
    pxDisc(c, cx, cy, r, shade(tint, 0.78));
    c.save();
    c.beginPath(); c.rect(0, 0, S, S); c.clip();
    for (let i = 0; i < 5; i++) {                       // maria
      const a = rnd() * U.TAU, d = rnd() * r * 0.65;
      pxDisc(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (0.14 + rnd() * 0.22), shade(tint, 0.55 + rnd() * 0.1));
    }
    for (let i = 0; i < 22; i++) {                      // craters, rim then floor
      const a = rnd() * U.TAU, d = Math.sqrt(rnd()) * r * 0.9;
      const kx = cx + Math.cos(a) * d, ky = cy + Math.sin(a) * d, kr = Math.max(1, (0.4 + rnd() * rnd() * 2.4) * (S / 24));
      pxDisc(c, kx, ky - kr * 0.2, kr, shade(tint, 1.05));
      pxDisc(c, kx, ky + kr * 0.25, kr * 0.7, shade(tint, 0.45));
    }
    for (let i = 0; i < S * 2; i++) {                   // dust
      c.fillStyle = shade(tint, rnd() > 0.5 ? 1.15 : 0.7);
      c.fillRect((rnd() * S) | 0, (rnd() * S) | 0, 1, 1);
    }
    for (let x = 0; x < S; x++) {                       // stepped terminator
      const f = x / S;
      if (f > 0.45) continue;
      c.fillStyle = 'rgba(4,2,12,' + (0.9 - f * 1.8).toFixed(2) + ')';
      c.fillRect(x, 0, 1, S);
    }
    c.restore();
    c.fillStyle = shade(tint, 1.55);                    // lit limb
    for (let i = 0; i < 34; i++) {
      const a = -1.5 + i * 0.065;
      c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
    const cv = document.createElement('canvas');
    cv.width = cv.height = S * K;
    const cc = cv.getContext('2d');
    cc.imageSmoothingEnabled = false;
    cc.drawImage(src, 0, 0, S, S, 0, 0, S * K, S * K);
    return cv;
  }

  /* -------------------------------------------------------------- register */
  const BUILDERS = { docks, terminal, fab, mind, obs };
  for (const id in BUILDERS) for (let t = 0; t < 3; t++) reg(id + t, [BUILDERS[id](t)]);
  reg('survey', [survey()]);
  for (let i = 0; i < 3; i++) reg('ruin' + i, [ruin(i)]);
  for (let i = 0; i < 3; i++) reg('rock' + i, [rock(i)]);
  reg('critter', [critter(0, '#8affa0', '#3fb85a'), critter(1, '#8affa0', '#3fb85a')]);
  reg('critter2', [critter(0, '#ff8ad8', '#b0459a'), critter(1, '#ff8ad8', '#b0459a')]);
  reg('flag', [flag(0), flag(1)], 3);
  reg('phone', [phone(false), phone(true)], 9, 14);
  reg('brain', [brainBig()], 55, 42);
  for (const who of ['rikkit', 'twig', 'bluefin', 'curator', 'nova']) reg('bust_' + who, [bust(who, 0), bust(who, 1), bust(who, 2)], 24, 48);
  reg('mitten', [mitten()], 24, 0);
  reg('toolBig', [toolBig(0), toolBig(1)], 0, 60);
  reg('holoPad', [holoPad(0), holoPad(1), holoPad(2)], 30, 20);
  reg('skull', [celestialHead()]);
  reg('tape', [tapeDeck(0), tapeDeck(1)]);

  PD.arthome = { S, P, buildMoon, blit, HD, mitten, reg };
})(window.PD);
