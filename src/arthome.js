/* Art for your moon: the buildings you put up, the ruins that were already
   here, and the little critters that live between them. Everything is drawn
   procedurally at three tiers, so a building visibly grows as you pour money
   into it. */
(function (PD) {
  'use strict';
  const pix = PD.pix;
  const U = PD.util;
  const C = PD.art.C;

  const P = {
    steel: '#9aa3c4', steelD: '#5e6688', steelDD: '#39405e',
    rock: '#6b6480', rockD: '#4a4460', rockL: '#8e86a8',
    gold: '#ffd34d', goldD: '#c99a1e',
    glow: '#7ef9ff', glowD: '#2f8fae',
    lime: '#8affa0', rose: '#ff8ad8', amber: '#ffb03d', red: '#ff5a4d',
    ink: '#140f26', bone: '#e8dfc4', boneD: '#a89b78'
  };

  const S = {};

  /* Trim the empty margin off a sprite so it stands exactly on the ground and
     its sign sits exactly on top of it, whatever the builder drew. */
  function crop(p) {
    let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) {
        if (!p.d[y * p.w + x]) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return p;
    const out = new PD.Pix(x1 - x0 + 1, y1 - y0 + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) out.set(x - x0, y - y0, p.d[y * p.w + x]);
    }
    return out;
  }

  function reg(name, builders, ox, oy) {
    const frames = builders.map(b => crop(b).toCanvas());
    S[name] = { frames, w: frames[0].width, h: frames[0].height, ox: ox === undefined ? frames[0].width / 2 : ox, oy: oy === undefined ? frames[0].height : oy };
  }

  /* ------------------------------------------------------------- buildings */
  function foundation(w) {
    const p = pix(w, 22);
    p.round(0, 10, w, 9, 3, P.rockD);
    p.rect(2, 10, w - 4, 2, P.rock);
    for (let i = 4; i < w - 4; i += 8) { p.rect(i, 13, 4, 2, P.rockL); }
    // corner pegs
    p.rect(1, 4, 3, 8, P.steelDD); p.rect(w - 4, 4, 3, 8, P.steelDD);
    p.disc(2, 4, 1.6, P.amber); p.disc(w - 3, 4, 1.6, P.amber);
    p.outline(P.ink);
    return p;
  }

  function pad(t) {
    const w = 60, p = pix(w, 26);
    p.ellipse(w / 2, 20, 28, 6, P.steelDD);
    p.ellipse(w / 2, 18, 26, 5.4, P.steel);
    p.ellipse(w / 2, 17, 18, 3.6, P.steelD);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + (t ? 0.5 : 0);
      p.disc(w / 2 + Math.cos(a) * 22, 18 + Math.sin(a) * 4.4, 1.8, i % 2 ? P.amber : P.glow);
    }
    p.rect(w / 2 - 8, 12, 16, 2, P.gold);
    p.rect(w / 2 - 1, 6, 2, 8, P.steelD);
    p.disc(w / 2, 5, 2.4, t ? P.lime : P.glowD);
    p.outline(P.ink);
    return p;
  }

  /* Every building is a chunky little cartoon tower. Tier 0 is what you get
     for one level, tier 2 is what a rich alien owns. */

  function lights(p, x, y, w, h, on) {
    for (let j = 0; j < h; j += 5) {
      for (let i = 0; i < w; i += 5) p.rect(x + i, y + j, 3, 3, on ? '#ffe9a8' : '#2a2440');
    }
  }

  /* Trade mast: a shop with a dish tower, bunting and a giant coin. */
  function market(tier) {
    const w = 62 + tier * 12, h = 74 + tier * 18;
    const p = pix(w, h);
    const base = h - 1, cx = w / 2;
    // shop body
    p.round(4, base - 34, w - 8, 34, 5, '#4a6b8a');
    p.shade('#4a6b8a', '#31485e', 0, 1);
    p.round(2, base - 40, w - 4, 9, 4, '#ff8ab0');            // awning
    for (let i = 0; i < w - 8; i += 8) p.rect(3 + i, base - 34, 4, 4, '#ffd6e4');
    lights(p, 10, base - 26, w - 24, 10, 1);
    p.round(cx - 8, base - 16, 16, 16, 3, '#2a2440');          // doorway
    p.round(cx - 6, base - 14, 12, 14, 2, '#ffb03d');
    // dish tower
    p.rect(cx - 2, 16, 4, base - 40, P.steel);
    for (let i = 0; i <= tier + 1; i++) {
      const dy = 20 + i * 12, side = i % 2 ? 1 : -1;
      p.ellipse(cx + side * 11, dy, 9, 5, P.steelD);
      p.ellipse(cx + side * 11, dy - 1, 6.5, 3.4, P.glow);
      p.rect(cx + (side > 0 ? 2 : -8), dy - 1, 7, 2, P.steelDD);
    }
    // coin sign on top
    p.disc(cx, 9, 8, P.gold);
    p.disc(cx, 9, 5.5, P.goldD);
    p.rect(cx - 2, 6, 4, 7, P.gold);
    // bunting from the tower to the roof
    for (let i = 0; i < 7; i++) {
      const bx = 4 + i * ((w - 10) / 6);
      p.rect(bx, base - 46 + Math.abs(i - 3), 4, 6, [P.rose, P.amber, P.lime, P.glow, P.gold, P.rose, P.lime][i]);
    }
    // crates of goods
    p.round(4, base - 10, 12, 10, 2, '#8a5a3a');
    p.rect(6, base - 7, 8, 2, P.gold);
    p.outline(P.ink);
    return p;
  }

  /* Drill works: a proper derrick with a shed, chimney and spoil heap. */
  function works(tier) {
    const w = 66 + tier * 12, h = 80 + tier * 20;
    const p = pix(w, h);
    const base = h - 1, cx = w / 2 - 4;
    // shed
    p.round(2, base - 28, w - 8, 28, 4, '#6b4a3a');
    p.shade('#6b4a3a', '#472f24', 0, 1);
    p.round(0, base - 34, w - 4, 8, 3, '#c4553a');            // roof
    lights(p, 8, base - 22, 22, 6, 1);
    p.round(w - 26, base - 20, 16, 20, 3, '#2a2440');
    p.round(w - 24, base - 18, 12, 18, 2, '#ffb03d');
    // derrick
    const top = 12;
    p.line(cx - 16, base - 34, cx - 4, top, P.steel);
    p.line(cx + 16, base - 34, cx + 4, top, P.steel);
    for (let y = top + 6; y < base - 34; y += 9) {
      const f = (y - top) / (base - 34 - top);
      const hw = 4 + f * 12;
      p.line(cx - hw, y, cx + hw, y + 5, P.steelDD);
      p.line(cx + hw, y, cx - hw, y + 5, P.steelDD);
      p.line(cx - hw, y, cx + hw, y, P.steelD);
    }
    p.round(cx - 7, top - 8, 14, 10, 3, P.steelD);
    p.disc(cx, top - 3, 3, P.amber);
    // the bit, hanging in the frame
    p.round(cx - 4, base - 52, 8, 14, 3, P.gold);
    p.spike(cx - 6, base - 39, 12, 9, 1, P.amber);
    // chimney with smoke
    p.round(4, base - 52, 10, 20, 3, P.steelDD);
    p.rect(5, base - 50, 3, 16, P.steel);
    for (let i = 0; i <= tier + 1; i++) p.disc(9 + i * 2, base - 56 - i * 7, 3 + i * 1.4, '#7d7396');
    // spoil heap
    p.ellipse(w - 12, base - 3, 12, 5, '#5a4a6b');
    p.ellipse(w - 15, base - 6, 6, 3, '#6b5a7d');
    p.outline(P.ink);
    return p;
  }

  /* Air still: fat glass tanks bubbling away on a rack. */
  function still(tier) {
    const w = 58 + tier * 14, h = 72 + tier * 16;
    const p = pix(w, h);
    const base = h - 1;
    p.round(2, base - 16, w - 4, 16, 4, '#3f5e6b');
    p.shade('#3f5e6b', '#2a3f49', 0, 1);
    p.rect(6, base - 13, w - 12, 3, P.steelD);
    for (let i = 0; i <= tier + 1; i++) {
      const tx = 6 + i * ((w - 14) / (tier + 2)), th = 36 + i * 6;
      const tw = 14;
      p.round(tx, base - 16 - th, tw, th, 7, P.steelD);
      p.round(tx + 2, base - 14 - th, tw - 4, th - 5, 5, '#39c8ff');
      p.rect(tx + 3, base - 12 - th, 3, th - 10, '#d6fbff');
      p.round(tx + 2, base - 22 - th, tw - 4, 8, 3, P.steel);
      p.disc(tx + tw / 2, base - 26 - th, 3.4, P.gold);
      // bubbles rising inside
      p.disc(tx + 7, base - 26 - th * 0.3, 1.6, '#ffffff');
      p.disc(tx + 5, base - 34 - th * 0.5, 1.2, '#ffffff');
      p.disc(tx + 9, base - 42 - th * 0.6, 1, '#ffffff');
    }
    // pipe run along the front
    p.rect(4, base - 8, w - 8, 4, P.steelDD);
    for (let i = 6; i < w - 8; i += 10) p.disc(i, base - 6, 2, P.glow);
    p.outline(P.ink);
    return p;
  }

  /* Cargo silo: a fat drum with a chute and a hopper on legs. */
  function silo(tier) {
    const w = 54 + tier * 12, h = 76 + tier * 18;
    const p = pix(w, h);
    const base = h - 1, cx = w / 2;
    p.round(4, base - 10, w - 8, 10, 3, P.steelDD);
    const sh = 44 + tier * 14;
    p.round(6, base - 10 - sh, w - 12, sh, 9, '#b6b0c8');
    p.shade('#b6b0c8', '#7d7396', 0, 1);
    for (let y = base - 10 - sh + 10; y < base - 14; y += 10) p.rect(8, y, w - 16, 3, '#8e86a8');
    p.round(8, base - 16 - sh, w - 16, 10, 4, P.amber);        // lid
    p.disc(cx, base - 20 - sh, 4, P.gold);
    // window showing the ore inside
    p.round(cx - 7, base - 30, 14, 16, 3, '#2a2440');
    for (let i = 0; i < 3 + tier; i++) p.disc(cx - 4 + (i % 3) * 4, base - 18 - (i > 2 ? 4 : 0), 2, i % 2 ? P.gold : '#ff8ab0');
    // chute
    p.round(w - 16, base - 44, 14, 12, 3, P.steelDD);
    p.rect(w - 12, base - 32, 7, 8, P.steel);
    p.round(w - 14, base - 24, 11, 6, 2, P.gold);
    p.outline(P.ink);
    return p;
  }

  /* Gun shack: a lean-to full of guns, with a shot-up target outside. */
  function armoury(tier) {
    const w = 66 + tier * 12, h = 62 + tier * 12;
    const p = pix(w, h);
    const base = h - 1;
    p.round(2, base - 30, w - 20, 30, 4, '#5e4a7d');
    p.shade('#5e4a7d', '#3f3054', 0, 1);
    for (let i = 0; i < w - 18; i++) p.rect(2 + i, base - 36 - Math.floor(i * 0.14), 1, 7, P.red);
    lights(p, 8, base - 24, 12, 6, 1);
    // gun rack
    for (let i = 0; i <= Math.min(tier + 2, 5); i++) {
      const gx = 8 + i * 9;
      p.rect(gx, base - 18, 3, 12, P.steelDD);
      p.round(gx - 2, base - 21, 8, 5, 2, i % 2 ? P.glow : P.amber);
      p.rect(gx + 5, base - 20, 3, 2, P.steel);
    }
    // powder barrels
    p.round(4, base - 10, 11, 10, 3, '#8a5a3a');
    p.rect(5, base - 7, 9, 2, P.gold);
    // target on a post
    p.rect(w - 12, base - 40, 4, 40, '#8a5a3a');
    p.disc(w - 10, base - 44, 10, '#f2e9ff');
    p.disc(w - 10, base - 44, 7, P.red);
    p.disc(w - 10, base - 44, 3.5, '#f2e9ff');
    p.disc(w - 10, base - 44, 1.5, P.red);
    p.set(w - 13, base - 47, P.ink); p.set(w - 8, base - 42, P.ink);
    p.outline(P.ink);
    return p;
  }

  /* Winch tower: a tall lattice with a spool and a hook on a cable. */
  function hangar(tier) {
    const w = 54 + tier * 10, h = 86 + tier * 20;
    const p = pix(w, h);
    const base = h - 1, cx = w / 2;
    p.round(2, base - 14, w - 4, 14, 4, '#3f3054');
    p.rect(6, base - 11, w - 12, 3, P.steel);
    const top = 14;
    p.line(6, base - 14, cx - 5, top, P.steel);
    p.line(w - 6, base - 14, cx + 5, top, P.steel);
    for (let y = top + 8; y < base - 16; y += 11) {
      const f = (y - top) / (base - 16 - top);
      const hw = 5 + f * (w / 2 - 8);
      p.line(cx - hw, y, cx + hw, y + 6, P.steelDD);
      p.line(cx + hw, y, cx - hw, y + 6, P.steelDD);
      p.line(cx - hw, y, cx + hw, y, P.steelD);
    }
    // spool head
    p.round(cx - 11, top - 10, 22, 14, 4, P.steelD);
    p.disc(cx, top - 3, 6, P.gold);
    p.disc(cx, top - 3, 2.5, P.goldD);
    for (let i = 0; i <= tier; i++) p.rect(cx - 9, top + 5 + i * 4, 18, 2, P.glow);
    // cable and hook swinging off the side
    p.line(cx + 10, top - 3, cx + 16, top + 22, '#d6cfe8');
    p.round(cx + 13, top + 22, 7, 6, 2, P.steel);
    // spare coil at the foot
    p.disc(8, base - 18, 5, P.steelD);
    p.disc(8, base - 18, 2, P.steelDD);
    p.outline(P.ink);
    return p;
  }

  /* Ruin altar: precursor stone, a floating shard and a ring of motes. */
  function relic(tier) {
    const w = 60 + tier * 10, h = 74 + tier * 16;
    const p = pix(w, h);
    const base = h - 1, cx = w / 2;
    p.round(4, base - 16, w - 8, 16, 4, P.bone);
    p.rect(8, base - 13, w - 16, 4, P.boneD);
    p.round(12, base - 30, w - 24, 15, 4, P.boneD);
    for (let i = 0; i < 4; i++) p.rect(16 + i * 8, base - 26, 4, 8, P.rose);
    // standing stones
    p.round(2, base - 34, 10, 22, 3, P.bone);
    p.round(w - 12, base - 30, 10, 18, 3, P.bone);
    // floating shard
    const sy = base - 50 - tier * 8;
    p.spike(cx - 8, sy, 16, 22, 1, P.rose);
    p.spike(cx - 4, sy + 5, 8, 14, 1, '#ffd6f4');
    p.disc(cx, sy + 20, 3, '#ffffff');
    for (let i = 0; i <= tier + 2; i++) {
      const a = i / (tier + 3) * Math.PI * 2;
      p.disc(cx + Math.cos(a) * 16, sy + 12 + Math.sin(a) * 8, 1.8, i % 2 ? P.glow : P.rose);
    }
    p.outline(P.ink);
    return p;
  }

  /* -------------------------------------------------------------- scenery */
  function ruin(kind) {
    const p = pix(38, 40);
    if (kind === 0) {                       // broken arch
      p.round(2, 12, 8, 28, 2, P.bone);
      p.round(28, 16, 8, 24, 2, P.bone);
      for (let i = 0; i < 20; i++) {
        const a = Math.PI + i / 19 * Math.PI;
        p.disc(19 + Math.cos(a) * 15, 16 + Math.sin(a) * 9, 3, i < 12 ? P.bone : P.boneD);
      }
      p.rect(4, 20, 3, 16, P.boneD);
    } else if (kind === 1) {                // toppled pillar
      p.round(0, 30, 34, 9, 4, P.bone);
      p.rect(4, 32, 26, 2, P.boneD);
      p.round(6, 20, 9, 12, 3, P.boneD);
      p.disc(24, 26, 4, P.bone);
    } else {                                 // obelisk with glyphs
      p.round(12, 4, 13, 36, 3, P.bone);
      p.rect(14, 8, 9, 2, P.rose);
      p.rect(14, 14, 9, 2, P.rose);
      p.rect(16, 20, 5, 2, P.glow);
      p.round(10, 34, 18, 6, 2, P.boneD);
    }
    p.outline(P.ink);
    return p;
  }

  /* A round hopping moon critter, because an empty moon is a sad moon. */
  function critter(f, col) {
    const p = pix(16, 14);
    const y = f ? 1 : 2;
    p.ellipse(8, y + 7, 6, 5, col);
    p.shade(col, P.ink, 0, 1);
    p.ellipse(8, y + 4, 4, 2, '#ffffff');
    p.disc(6, y + 6, 1.6, C.eye); p.disc(10, y + 6, 1.6, C.eye);
    p.set(6, y + 5, '#ffffff'); p.set(10, y + 5, '#ffffff');
    p.rect(4, y + 11, 3, 2, P.ink);
    p.rect(9, y + 11, 3, 2, P.ink);
    p.line(8, y + 1, 8 + (f ? 2 : -2), y - 2, P.ink);
    p.disc(8 + (f ? 2 : -2), y - 3, 1.4, P.amber);
    p.outline(P.ink);
    return p;
  }

  function flag(f) {
    const p = pix(14, 26);
    p.rect(2, 0, 2, 26, P.steelD);
    for (let i = 0; i < 8; i++) p.rect(4 + i, 3 + (f ? Math.floor(Math.sin(i * 0.8) * 1.4) : Math.floor(Math.cos(i * 0.8) * 1.4)), 1, 8, i < 4 ? P.rose : P.amber);
    p.outline(P.ink);
    return p;
  }

  /* The moon disc used for skies and chart thumbnails. */
  function buildMoon(size, tint, seed) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const r = size / 2 - 1, cx = size / 2, cy = size / 2;
    const rnd = U.mulberry32(seed || 7);
    function shade(col, f) {
      const n = parseInt(col.slice(1), 16);
      const R = U.clamp(((n >> 16) & 255) * f, 0, 255) | 0;
      const G = U.clamp(((n >> 8) & 255) * f, 0, 255) | 0;
      const B = U.clamp((n & 255) * f, 0, 255) | 0;
      return 'rgb(' + R + ',' + G + ',' + B + ')';
    }
    c.fillStyle = shade(tint, 0.75);
    c.beginPath(); c.arc(cx, cy, r, 0, U.TAU); c.fill();
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, U.TAU); c.clip();
    for (let i = 0; i < 6; i++) {
      const a = rnd() * U.TAU, d = rnd() * r * 0.7;
      c.fillStyle = shade(tint, 0.5 + rnd() * 0.12);
      c.beginPath(); c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (0.16 + rnd() * 0.24), 0, U.TAU); c.fill();
    }
    const craters = [];
    for (let i = 0; i < 46; i++) {
      const a = rnd() * U.TAU, d = Math.sqrt(rnd()) * r * 0.94;
      craters.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: (0.5 + rnd() * rnd() * 5.5) * (size / 90) });
    }
    craters.sort((p1, p2) => p2.r - p1.r);
    for (const k of craters) {
      c.fillStyle = shade(tint, 0.98);
      c.beginPath(); c.arc(k.x, k.y - k.r * 0.16, k.r, 0, U.TAU); c.fill();
      c.fillStyle = shade(tint, 0.42);
      c.beginPath(); c.arc(k.x, k.y + k.r * 0.2, k.r * 0.78, 0, U.TAU); c.fill();
      c.fillStyle = shade(tint, 0.62);
      c.beginPath(); c.arc(k.x, k.y + k.r * 0.05, k.r * 0.5, 0, U.TAU); c.fill();
    }
    for (let i = 0; i < size * 3; i++) {
      c.fillStyle = shade(tint, rnd() > 0.5 ? 1.12 : 0.7);
      c.globalAlpha = 0.3;
      c.fillRect((rnd() * size) | 0, (rnd() * size) | 0, 1, 1);
    }
    c.globalAlpha = 1;
    const term = c.createLinearGradient(0, size, size * 0.85, 0);
    term.addColorStop(0, 'rgba(4,2,12,0.94)');
    term.addColorStop(0.45, 'rgba(4,2,12,0.55)');
    term.addColorStop(0.8, 'rgba(4,2,12,0)');
    c.fillStyle = term;
    c.fillRect(0, 0, size, size);
    c.strokeStyle = shade(tint, 1.5);
    c.lineWidth = Math.max(1, size / 90);
    c.beginPath(); c.arc(cx, cy, r - 0.5, -1.5, 0.7); c.stroke();
    c.restore();
    return cv;
  }

  /* Build every tier up front: there are only a couple of dozen sprites. */
  const BUILDERS = { market, works, still, silo, armoury, hangar, relic };
  for (const id in BUILDERS) for (let t = 0; t < 3; t++) reg(id + t, [BUILDERS[id](t)]);
  reg('pad', [pad(0), pad(1)]);
  for (let i = 0; i < 3; i++) reg('ruin' + i, [ruin(i)]);
  reg('plot', [foundation(48)]);
  reg('critter', [critter(0, '#8affa0'), critter(1, '#8affa0')]);
  reg('critter2', [critter(0, '#ff8ad8'), critter(1, '#ff8ad8')]);
  reg('flag', [flag(0), flag(1)], 3);

  PD.arthome = { S, P, buildMoon };
})(window.PD);
