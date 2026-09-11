/* HUD, shop, star map and all the overlay screens. Everything is drawn into
   the low-res canvas with immediate-mode widgets. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const D = PD.data;
  const F = PD.font;
  const A = PD.audio;
  const X = PD.pxd;

  const VW = 480, VH = 270;

  const COL = {
    ink: '#120a24', panel: '#1d1338', panelHi: '#2c1e52',
    line: '#5b3f96', lineHi: '#a67df0',
    text: '#f2e9ff', dim: '#9c8ec4', gold: '#ffd34d',
    o2: '#58e8ff', hull: '#ff5a4d', cargo: '#ffb03d',
    good: '#8affa0', bad: '#ff6b8a', core: '#ff8a3d'
  };

  /* ------------------------------------------------------------- primitives */
  function panel(ctx, x, y, w, h, title) {
    ctx.fillStyle = 'rgba(6,3,14,0.55)';
    ctx.fillRect(x + 3, y + 3, w, h);
    ctx.fillStyle = COL.panel;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COL.panelHi;
    ctx.fillRect(x, y, w, 2);
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // corner rivets
    ctx.fillStyle = COL.lineHi;
    ctx.fillRect(x + 2, y + 2, 2, 2); ctx.fillRect(x + w - 4, y + 2, 2, 2);
    ctx.fillRect(x + 2, y + h - 4, 2, 2); ctx.fillRect(x + w - 4, y + h - 4, 2, 2);
    if (title) {
      const tw = F.width(title, 1) + 10;
      ctx.fillStyle = COL.line;
      ctx.fillRect(x + 8, y - 5, tw, 11);
      ctx.fillStyle = COL.panelHi;
      ctx.fillRect(x + 8, y - 5, tw, 2);
      F.draw(ctx, title, x + 13, y - 2, COL.text);
    }
  }

  function bar(ctx, x, y, w, h, frac, color, opts) {
    opts = opts || {};
    frac = U.clamp(frac, 0, 1);
    ctx.fillStyle = '#0d0720';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#2a1c4a';
    ctx.fillRect(x, y, w, h);
    const fw = Math.round(w * frac);
    if (fw > 0) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, fw, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x, y, fw, 1);
    }
    if (opts.ghost !== undefined && opts.ghost > frac) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      const gw = Math.round(w * U.clamp(opts.ghost, 0, 1));
      ctx.fillRect(x + fw, y, gw - fw, h);
    }
    // notch ticks
    ctx.fillStyle = 'rgba(10,6,22,0.5)';
    for (let i = 1; i < 4; i++) ctx.fillRect(x + Math.round(w * i / 4), y, 1, h);
    if (opts.label) F.draw(ctx, opts.label, x + 2, y + (h - 7) / 2 | 0, opts.labelColor || '#ffffff', { scale: 1 });
    if (opts.right) F.draw(ctx, opts.right, x + w - 2, y + (h - 7) / 2 | 0, opts.labelColor || '#ffffff', { right: true });
  }

  let hoverId = null, lastHover = null;

  function button(ctx, x, y, w, h, label, opts) {
    opts = opts || {};
    const m = PD.input.mouse;
    const enabled = opts.enabled !== false;
    const hot = enabled && m.inside && m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
    if (hot) hoverId = (opts.id || label);

    const base = !enabled ? '#241a3c' : (hot ? COL.lineHi : (opts.accent || COL.line));
    ctx.fillStyle = 'rgba(6,3,14,0.5)';
    ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = hot ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, w, 1);
    ctx.strokeStyle = enabled ? '#0d0720' : '#1a1030';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    F.draw(ctx, label, x + w / 2, y + (h - 7) / 2 | 0, enabled ? '#ffffff' : '#6a5d90', { center: true, scale: opts.scale || 1 });

    const clicked = hot && m.leftPressed;
    if (clicked) A.sfx.click();
    return clicked;
  }

  function icon(ctx, name, x, y, scale) {
    const cv = PD.art.ICON[name];
    if (!cv) return;
    const s = scale || 1;
    ctx.drawImage(cv, 0, 0, cv.width, cv.height, x | 0, y | 0, cv.width * s, cv.height * s);
  }

  function endFrame() {
    if (hoverId && hoverId !== lastHover) A.tone(1500, { type: 'square', dur: 0.02, vol: 0.03 });
    lastHover = hoverId;
    hoverId = null;
  }

  /* -------------------------------------------------------------------- HUD */
  const Gd = () => PD.glyph;

  /* The old toast / hint / objective boxes are gone. Anything worth saying is
     said in the world: a floating number, a sign, a light. */



  /* ----------------------------------------------------------- vitals pod
     Three readouts, no clutter: a glass air tank that empties, hull as a row
     of hex chips that shatter, and the hold as a filling tube. */
  /* Hard-edged: scanline fill, run-drawn outline. A stroked hexagon leaves
     anti-aliased pixels down every diagonal and the health chips are the most
     looked-at thing on the screen. */
  function hexChip(ctx, x, y, r, fill, edge) {
    X.hex(ctx, x, y, r, fill, edge, 1);
  }

  function vitals(ctx, g) {
    const p = g.player;
    const maxO2 = p.stat('oxygen'), maxHull = p.stat('hull'), cap = p.capacity();
    const o2f = U.clamp(p.o2 / maxO2, 0, 1);
    const t = g.time;
    const PW = 172, PH = 62;

    // a square of cardboard, taped to the inside of the helmet
    X.rect(ctx, 0, 0, PW, PH - 8, 'rgba(44,30,18,0.86)');
    X.rect(ctx, 0, PH - 8, PW - 8, 8, 'rgba(44,30,18,0.86)');
    X.rect(ctx, PW - 8, PH - 8, 4, 4, 'rgba(44,30,18,0.86)');
    X.rect(ctx, PW, 0, 1, PH - 8, '#6b4a2e');
    X.rect(ctx, 0, PH, PW - 8, 1, '#6b4a2e');
    X.rect(ctx, PW - 8, PH - 4, 4, 1, '#6b4a2e');
    X.rect(ctx, PW - 4, PH - 8, 1, 4, '#6b4a2e');
    X.rect(ctx, PW - 8, PH - 4, 1, 4, '#6b4a2e');
    X.rect(ctx, PW - 4, PH - 8, 4, 1, '#6b4a2e');
    // the grain of the cardboard, and the fibres coming off the cut edge
    for (let gy = 2; gy < PH - 10; gy += 3) {
      if (U.hash2(gy, 5) > 0.55) X.rect(ctx, 2, gy, PW - 6, 1, 'rgba(88,60,34,0.35)');
    }
    for (let gx = 4; gx < PW - 10; gx += 2) {
      if (U.hash2(gx, 9) > 0.7) X.rect(ctx, gx, PH - 9, 2, 1 + ((U.hash2(gx, 11) * 3) | 0), 'rgba(120,84,48,0.5)');
    }
    // masking tape, applied by someone with three fingers
    X.rect(ctx, PW - 22, -3, 22, 9, 'rgba(226,208,132,0.8)');
    X.rect(ctx, PW - 22, -3, 22, 1, 'rgba(246,232,168,0.8)');
    for (let i = 0; i < 4; i++) X.rect(ctx, PW - 20 + i * 6, -3, 2, 9, 'rgba(206,188,112,0.5)');
    X.rect(ctx, -4, 30, 8, 16, 'rgba(226,208,132,0.8)');
    X.rect(ctx, -4, 30, 8, 1, 'rgba(246,232,168,0.8)');

    // --- air: a glass tank that empties
    const tx = 5, ty = 4, tw = 14, th = 44;
    const low = o2f < 0.25;
    ctx.fillStyle = '#0d0720'; ctx.fillRect(tx - 1, ty - 1, tw + 2, th + 2);
    ctx.fillStyle = '#161033'; ctx.fillRect(tx, ty, tw, th);
    const fh = Math.round(th * o2f);
    ctx.fillStyle = low ? (Math.sin(t * 14) > 0 ? '#ff6b8a' : '#58e8ff') : '#58e8ff';
    ctx.fillRect(tx, ty + th - fh, tw, fh);
    if (fh > 2) {
      ctx.fillStyle = '#d6fbff';
      ctx.fillRect(tx, ty + th - fh + Math.sin(t * 4) * 1.2, tw, 1);
      for (let i = 0; i < 3; i++) {
        const by = ty + th - ((t * 14 + i * 17) % Math.max(4, fh));
        if (by > ty + th - fh) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(tx + 3 + i * 4, by, 1, 1); }
      }
    }
    ctx.strokeStyle = '#7ef9ff'; ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(tx + 2, ty + 2, 3, th - 4);
    for (let i = 1; i < 4; i++) { ctx.fillStyle = '#0d0720'; ctx.fillRect(tx, ty + (th / 4) * i, 4, 1); }
    F.draw(ctx, 'AIR', tx + tw / 2, ty + th + 4, low ? '#ff6b8a' : '#e2d084', { center: true, shadow: '#2c1c10' });

    const CX = 26;                                  // right-hand column
    F.draw(ctx, String(Math.ceil(p.o2)), CX, 4, low ? '#ff6b8a' : '#7ef9ff', { scale: 2, shadow: false });
    F.draw(ctx, 'BREATHS', CX + 42, 10, '#a8845e', { shadow: false });

    // --- hull: hex chips that shatter
    const cf = U.clamp(p.hull / maxHull, 0, 1);
    F.draw(ctx, 'ME', CX, 24, '#e2d084', { shadow: false });
    for (let i = 0; i < 6; i++) {
      const x = CX + 34 + i * 15, y = 27;
      const f = U.clamp(cf * 6 - i, 0, 1);
      hexChip(ctx, x, y, 6.5, '#2c1c10', '#6b4a2e');
      if (f > 0) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x - 7, y + 7 - 14 * f, 14, 14 * f); ctx.clip();
        hexChip(ctx, x, y, 6.5, f < 0.35 ? '#ff8a3d' : '#ff5a4d', null);
        ctx.restore();
        hexChip(ctx, x, y, 6.5, null, '#ffb0a0');
      } else {
        X.line(ctx, x - 4, y - 3, x + 3, y + 4, '#6b4a2e', 1);
      }
    }

    // --- hold: a filling tube
    const hx = CX + 28, hy = 42, hw = 66, hh = 9;
    const load = U.clamp(p.cargoKg / cap, 0, 1);
    F.draw(ctx, 'SACK', CX, 43, '#e2d084', { shadow: false });
    ctx.fillStyle = '#1a1108'; ctx.fillRect(hx - 1, hy - 1, hw + 2, hh + 2);
    ctx.fillStyle = '#33240f'; ctx.fillRect(hx, hy, hw, hh);
    const segs = 10, sw = hw / segs;
    for (let i = 0; i < segs; i++) {
      const f = U.clamp(load * segs - i, 0, 1);
      if (f <= 0) continue;
      ctx.fillStyle = p.cargoFull() ? (Math.sin(t * 12) > 0 ? '#ff6b8a' : '#ffb03d') : '#ffb03d';
      ctx.fillRect(hx + i * sw + 1, hy + 1, Math.max(1, (sw - 2) * f), hh - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(hx + i * sw + 1, hy + 1, Math.max(1, (sw - 2) * f), 1);
    }
    F.draw(ctx, Math.round(p.cargoKg) + '/' + Math.round(cap), hx + hw + 4, hy + 2, p.cargoFull() ? '#ff6b8a' : '#ffb03d', { shadow: false });

    // --- manifest: top three ores, then the load's worth
    const entries = Object.keys(p.cargo).sort((a, b) => D.MAT[b].cr - D.MAT[a].cr).slice(0, 3);
    let my = PH + 6;
    for (const k of entries) {
      const m = D.MAT[k];
      X.rect(ctx, 0, my - 2, 106, 13, 'rgba(44,30,18,0.72)');
      PD.art.oreChip(ctx, +k, 2, my - 3, 14);
      F.draw(ctx, m.name.toUpperCase().slice(0, 10), 18, my + 1, COL.text, { shadow: false });
      F.draw(ctx, String(p.cargo[k]), 102, my + 1, COL.gold, { right: true, shadow: false });
      my += 13;
    }
    if (p.cargoValue() > 0) {
      X.rect(ctx, 0, my - 1, 106, 16, 'rgba(44,30,18,0.72)');
      Gd().draw(ctx, 'coin', 3, my, COL.gold, '#b8860b');
      F.draw(ctx, U.fmt(p.cargoValue()), 19, my + 1, COL.gold, { scale: 2, shadow: false });
    }

    // top right: credits + galaxy
    X.rect(ctx, VW - 130, 0, 130, 26, 'rgba(44,30,18,0.86)');
    X.rect(ctx, VW - 122, 26, 122, 8, 'rgba(44,30,18,0.86)');
    X.rect(ctx, VW - 126, 26, 4, 4, 'rgba(44,30,18,0.86)');
    X.rect(ctx, VW - 130, 0, 1, 26, '#6b4a2e');
    X.rect(ctx, VW - 122, 30, 122, 1, '#6b4a2e');
    X.rect(ctx, VW - 130, -3, 18, 8, 'rgba(226,208,132,0.8)');
    F.draw(ctx, '$' + U.fmt(g.save.credits), VW - 8, 4, COL.gold, { right: true, scale: 2 });
    F.draw(ctx, 'GALAXY ATE ' + g.save.dominion.toFixed(1) + '%', VW - 8, 22, '#d8b48a', { right: true });
    // and what the brain in the jar is owed, ticking up as you break rock
    X.rect(ctx, VW - 78, 34, 78, 13, 'rgba(20,42,32,0.86)');
    X.rect(ctx, VW - 78, 34, 78, 1, '#2fbf7a');
    X.rect(ctx, VW - 78, 46, 78, 1, '#0e3a2c');
    Gd().draw(ctx, 'star', VW - 76, 34, '#4cff9a', '#1e9e5c');
    F.draw(ctx, U.fmt(g.save.thots) + ' THOTS', VW - 6, 37, '#8affd0', { right: true, shadow: false });
  }
  const meters = vitals;



  function hud(ctx, g) {
    const p = g.player;
    meters(ctx, g);

    // world + depth
    F.draw(ctx, g.world.body.name, 6, VH - 26, COL.text);
    Gd().draw(ctx, 'depth', 6, VH - 16, COL.dim, '#2a1c4a');
    F.draw(ctx, g.world.depthMeters(p.y) + 'M', 22, VH - 16, COL.text, { scale: 2 });

    // one compact action strip: weapon, dash, scan, wire
    const wg = { pistol: 'gun', scatter: 'scatter', lance: 'lance' }[p.weapon];
    const sy = VH - 86;
    ctx.fillStyle = 'rgba(44,30,18,0.78)';
    ctx.fillRect(0, sy - 4, 150, 16);
    X.rect(ctx, 0, sy + 12, 150, 1, '#6b4a2e');
    Gd().draw(ctx, wg, 4, sy - 2, '#ffffff', '#7ef9ff');
    if (p.weapons().length > 1) F.draw(ctx, 'Q', 20, sy + 1, COL.dim, { shadow: false });
    const pip = (x, glyph, frac, col) => {
      Gd().draw(ctx, glyph, x, sy - 2, frac >= 1 ? col : COL.dim, '#2a1c4a');
      ctx.fillStyle = '#2a1c4a'; ctx.fillRect(x, sy + 10, 12, 2);
      ctx.fillStyle = frac >= 1 ? col : '#9c8ec4'; ctx.fillRect(x, sy + 10, Math.round(12 * U.clamp(frac, 0, 1)), 2);
    };
    pip(34, 'dash', 1 - p.dashCool / Math.max(0.1, p.stat('dash')), COL.gold);
    pip(52, 'scan', 1 - p.scanCool / 4, COL.good);
    // the wire is the one that matters, so it gets a real bar
    const tf = U.clamp(p.tetherFrac || 0, 0, 1);
    const tcol = tf > 0.9 ? '#ff5a4d' : (tf > 0.7 ? COL.gold : COL.o2);
    Gd().draw(ctx, 'belt', 74, sy - 2, tcol, '#2a1c4a');
    bar(ctx, 90, sy + 1, 54, 7, tf, tcol, {});

    // core integrity
    if (g.world.coreHp < g.world.coreMax) {
      const cw = 128, cx = 214;
      F.draw(ctx, 'PLANET GUTS', 150, 40, COL.core);
      bar(ctx, cx, 38, cw, 9, g.world.coreHp / g.world.coreMax, COL.core, { right: Math.ceil(g.world.coreHp / g.world.coreMax * 100) + '%' });
    }
    if (p.recall > 0.1) {
      Gd().draw(ctx, 'hole', VW / 2 - 48, VH - 40, COL.o2, '#2b9fc4');
      bar(ctx, VW / 2 - 30, VH - 36, 60, 6, p.recall / 1.4, COL.o2, {});
    }
    if (g.combo.n >= 3) {
      F.draw(ctx, 'x' + g.combo.mult.toFixed(1), VW / 2, 34, '#ff8ad8', { center: true, scale: 2 });
      Gd().stat(ctx, 'skull', g.combo.n, VW / 2 - 16, 52, '#ff8ad8', '#8a2a56', COL.text);
      bar(ctx, VW / 2 - 30, 68, 60, 3, g.combo.t / 2.6, '#ff8ad8', {});
    }

    minimap(ctx, g);

    // crossing into a new band: just its name, fading, no box
    if (g.banner) {
      const a = U.clamp(Math.min(g.banner.t * 2, (3.2 - g.banner.t) * 2), 0, 1);
      ctx.globalAlpha = a;
      F.draw(ctx, g.banner.text, VW / 2, 96, COL.gold, { center: true, scale: 2 });
      ctx.globalAlpha = 1;
    }

  }

  /* At home: a plank he nailed up with the only three numbers he cares about,
     written on it in chalk. No visor, no readout, no spaceship. */
  function homeBar(ctx, g) {
    const ore = g.vaultTotal();
    const val = g.vaultValue();
    const H = 22;
    // the plank, with a nail at each end
    X.rect(ctx, 0, 0, VW, H, '#6b4a2e');
    X.rect(ctx, 0, 0, VW, 3, '#8a6440');
    X.rect(ctx, 0, H - 3, VW, 3, '#4a3020');
    X.rect(ctx, 0, H, VW, 1, '#241708');
    for (let x = 8; x < VW; x += 46) X.rect(ctx, x, 6, 12, 2, '#5a3d24');
    for (const nx of [8, VW - 12]) { X.rect(ctx, nx, 8, 4, 4, '#c9bce8'); X.rect(ctx, nx, 8, 4, 1, '#f2e9ff'); }

    Gd().draw(ctx, 'coin', 22, 4, COL.gold, '#b8860b');
    F.draw(ctx, '$' + U.fmt(g.save.credits), 40, 3, '#ffe9a8', { scale: 2, shadow: '#3a2410' });

    const best = Object.keys(g.save.vault).sort((a, b) => D.MAT[b].cr - D.MAT[a].cr)[0];
    if (best) PD.art.oreChip(ctx, +best, 168, 3, 16); else Gd().draw(ctx, 'ore', 170, 4, '#8a6440', '#4a3020');
    F.draw(ctx, ore + ' ROCKS' + (val > 0 ? '  (~$' + U.fmt(val) + ')' : ''), 188, 7, ore ? '#ffd7a0' : '#a8845e', { shadow: '#3a2410' });

    if (g.save.artifacts > 0) {
      Gd().draw(ctx, 'star', 316, 4, COL.gold, '#b8860b');
      F.draw(ctx, g.save.artifacts + ' OLD THING' + (g.save.artifacts === 1 ? '' : 'S'), 332, 7, '#ffe9a8', { shadow: '#3a2410' });
    }
    F.draw(ctx, 'GALAXY ATE: ' + g.save.dominion.toFixed(1) + '%', VW - 8, 7, '#d8b48a', { right: true, shadow: '#3a2410' });
  }

  /* ---------------------------------------------------------------- minimap
     Fog of war: only what the lamp has touched is drawn. Scanner pings paint
     ore you have not reached yet. */
  let mmCv = null, mmCtx = null, mmDirty = 0;
  function minimap(ctx, g) {
    const w = g.world;
    const MW = 92, MH = 92;
    // the touch keys own the right edge, so the map slides over for them
    const x0 = VW - MW - (PD.touch && PD.touch.enabled ? 56 : 8), y0 = 58;
    const sc = Math.min(MW / w.w, MH / w.h);
    const ox = x0 + (MW - w.w * sc) / 2, oy = y0 + (MH - w.h * sc) / 2;

    if (!mmCv) { mmCv = document.createElement('canvas'); mmCtx = mmCv.getContext('2d'); }
    if (mmCv.width !== w.w || mmCv.height !== w.h) { mmCv.width = w.w; mmCv.height = w.h; mmDirty = 0; }
    // rebuild the fog texture a few times a second, not every frame
    mmDirty -= 1;
    if (mmDirty <= 0) {
      mmDirty = 8;
      const img = mmCtx.createImageData(w.w, w.h);
      for (let i = 0; i < w.cells.length; i++) {
        if (!w.seen[i]) continue;
        const m = w.cells[i];
        const k = i * 4;
        if (!m) { if (w.inside[i]) { img.data[k] = 24; img.data[k + 1] = 18; img.data[k + 2] = 40; img.data[k + 3] = 255; } continue; }
        const c = D.MAT[m].c[1];
        img.data[k] = parseInt(c.slice(1, 3), 16); img.data[k + 1] = parseInt(c.slice(3, 5), 16); img.data[k + 2] = parseInt(c.slice(5, 7), 16);
        img.data[k + 3] = 255;
      }
      mmCtx.putImageData(img, 0, 0);
    }

    // the map is a scrap of paper he tapes to the inside of the glass
    ctx.fillStyle = 'rgba(44,30,18,0.86)';
    ctx.fillRect(x0 - 4, y0 - 4, MW + 8, MH + 8);
    ctx.strokeStyle = '#6b4a2e'; ctx.strokeRect(x0 - 3.5, y0 - 3.5, MW + 7, MH + 7);
    X.rect(ctx, x0 - 8, y0 - 7, 18, 7, 'rgba(226,208,132,0.8)');
    X.rect(ctx, x0 + MW - 10, y0 + MH, 18, 7, 'rgba(226,208,132,0.8)');
    // the caption clears the strip of tape at the bottom corner; at y0+MH+6 the
    // tape sat straight across the middle of the word
    F.draw(ctx, 'WHERE I DUG', x0 + MW / 2, y0 + MH + 10, '#a8845e', { center: true, shadow: false });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mmCv, 0, 0, w.w, w.h, ox, oy, w.w * sc, w.h * sc);

    // scanner pings
    for (const pg of g.pings) {
      ctx.globalAlpha = U.clamp(pg.life / 3, 0, 1) * (0.6 + 0.4 * Math.sin(g.time * 6 + pg.cx));
      ctx.fillStyle = D.MAT[pg.mat].c[0];
      ctx.fillRect(ox + pg.cx * sc - 1, oy + pg.cy * sc - 1, Math.max(2, sc * 2), Math.max(2, sc * 2));
    }
    ctx.globalAlpha = 1;
    // core, ship, you
    if (w.coreHp > 0) { ctx.fillStyle = '#ff8a3d'; ctx.fillRect(ox + w.cx * sc - 1, oy + w.cy * sc - 1, 3, 3); }
    ctx.fillStyle = '#7ef9ff'; ctx.fillRect(ox + g.ship.x / 10 * sc - 2, oy + g.ship.y / 10 * sc - 1, 4, 2);
    const px = ox + g.player.x / 10 * sc, py = oy + g.player.y / 10 * sc;
    ctx.fillStyle = Math.sin(g.time * 10) > 0 ? '#ffffff' : '#ff5fa8';
    ctx.fillRect(px - 1, py - 1, 3, 3);
    PD.glyph.draw(ctx, 'scan', x0 + MW / 2 - 7, y0 + MH + 3, COL.dim, COL.line);
  }

  /* ------------------------------------------------------------------- shop */
  const TABS = ['UPGRADES', 'STAR MAP', 'OPTIONS'];

  function shop(ctx, g) {
    ctx.fillStyle = 'rgba(8,4,18,0.72)';
    ctx.fillRect(0, 0, VW, VH);

    panel(ctx, 12, 16, VW - 24, VH - 32, 'THE RUSTMAW  -  DOCKED');

    F.draw(ctx, '$' + U.fmt(g.save.credits), VW - 24, 23, COL.gold, { right: true, scale: 2 });

    // tabs
    for (let i = 0; i < TABS.length; i++) {
      const tx = 22 + i * 84;
      if (button(ctx, tx, 22, 80, 13, TABS[i], { accent: g.shopTab === i ? COL.lineHi : '#2a1c4a', id: 'tab' + i })) {
        g.shopTab = i;
      }
    }

    if (g.shopTab === 0) shopUpgrades(ctx, g);
    else if (g.shopTab === 1) starMap(ctx, g);
    else options(ctx, g);

    if (button(ctx, VW / 2 - 52, VH - 30, 104, 15, 'LAUNCH  [E]', { accent: '#2f7a4a' })) g.undock();
  }

  function shopUpgrades(ctx, g) {
    const list = D.UPGRADES;
    for (let i = 0; i < list.length; i++) {
      const u = list[i];
      const col = i % 3, row = (i / 3) | 0;
      const x = 22 + col * 146, y = 44 + row * 45;
      const lvl = g.save.upg[u.id] || 0;
      const maxed = lvl >= u.max;
      const cost = D.upgradeCost(u, lvl);
      const afford = g.save.credits >= cost;

      const m = PD.input.mouse;
      const hot = m.inside && m.x >= x && m.x < x + 138 && m.y >= y && m.y < y + 41;

      ctx.fillStyle = hot ? '#2c1e52' : '#241844';
      ctx.fillRect(x, y, 138, 41);
      ctx.strokeStyle = maxed ? COL.gold : (hot ? COL.lineHi : COL.line);
      ctx.strokeRect(x + 0.5, y + 0.5, 137, 40);

      icon(ctx, u.icon, x + 3, y + 3);
      F.draw(ctx, u.name, x + 22, y + 4, maxed ? COL.gold : COL.text);
      F.draw(ctx, u.show(lvl), x + 4, y + 16, COL.dim);

      // level pips
      const pips = Math.min(u.max, 12);
      const step = u.max > 12 ? u.max / 12 : 1;
      for (let k = 0; k < pips; k++) {
        const on = lvl >= Math.ceil((k + 1) * step);
        ctx.fillStyle = on ? (maxed ? COL.gold : COL.lineHi) : '#3a2a5e';
        ctx.fillRect(x + 4 + k * 5, y + 30, 4, 4);
      }
      F.draw(ctx, 'LV' + lvl, x + 134, y + 4, maxed ? COL.gold : COL.dim, { right: true });

      if (maxed) {
        F.draw(ctx, 'MAXED', x + 108, y + 26, COL.gold, { center: true });
      } else if (button(ctx, x + 82, y + 22, 52, 15, '$' + U.fmt(cost), { enabled: afford, accent: afford ? '#3f6ea8' : undefined, id: 'buy' + u.id })) {
        g.buy(u.id);
      }
      if (hot) g.shopTip = u.blurb;
    }
    if (g.shopTip) F.draw(ctx, g.shopTip, VW / 2, VH - 44, COL.dim, { center: true });
  }

  function starMap(ctx, g) {
    F.draw(ctx, 'SELECT A WORLD TO RUIN', VW / 2, 44, COL.text, { center: true });
    const rows = D.BODIES.length;
    const top = 56, rh = 16;
    for (let i = 0; i < rows; i++) {
      const b = D.BODIES[i];
      const y = top + i * rh;
      const unlocked = i <= g.save.unlocked;
      const done = g.save.destroyed[i];
      const here = i === g.bodyIndex;

      const m = PD.input.mouse;
      const hot = unlocked && m.inside && m.x >= 22 && m.x < VW - 22 && m.y >= y && m.y < y + rh - 2;
      ctx.fillStyle = here ? '#33235e' : (hot ? '#2c1e52' : '#221740');
      ctx.fillRect(22, y, VW - 44, rh - 2);
      ctx.strokeStyle = here ? COL.lineHi : '#3a2a5e';
      ctx.strokeRect(22.5, y + 0.5, VW - 45, rh - 3);

      // little planet dot
      X.oct(ctx, 32, y + 7, 4, unlocked ? b.tint : '#3a3050', null, 1);
      if (done) { ctx.fillStyle = '#0d0720'; ctx.fillRect(29, y + 6, 6, 2); }

      const label = unlocked ? b.name : '?????? ??????';
      F.draw(ctx, label, 42, y + 4, unlocked ? (done ? COL.dim : COL.text) : '#4d4070');
      F.draw(ctx, unlocked ? b.kind : 'LOCKED', 178, y + 4, COL.dim);
      F.draw(ctx, unlocked ? 'GRAV ' + b.gravity : '', 250, y + 4, COL.dim);
      F.draw(ctx, done ? 'DESTROYED' : (unlocked ? 'BOUNTY $' + U.fmt(b.reward) : ''), 310, y + 4,
        done ? COL.good : COL.gold);

      if (unlocked && !here && button(ctx, VW - 74, y + 1, 48, rh - 4, 'FLY', { id: 'fly' + i })) {
        g.travelTo(i);
      }
      if (here) F.draw(ctx, 'HERE', VW - 50, y + 4, COL.lineHi, { center: true });
    }
    const nxt = g.save.unlocked + 1;
    if (nxt < D.BODIES.length) {
      F.draw(ctx, 'CRACK THIS WORLD OPEN TO UNLOCK THE NEXT', VW / 2, VH - 44, COL.dim, { center: true });
    } else {
      F.draw(ctx, 'THE WHOLE MAP IS YOURS TO GRIND', VW / 2, VH - 44, COL.gold, { center: true });
    }
  }

  function options(ctx, g) {
    const x = VW / 2 - 90;
    F.draw(ctx, 'CONTROLS', x, 48, COL.gold);
    const lines = [
      'WASD / ARROWS   THRUSTERS',
      'MOUSE           AIM',
      'LEFT MOUSE      DRILL',
      'RIGHT / SPACE   PLASMA PISTOL',
      'E               DOCK / LAUNCH',
      'HOLD R          TRACTOR BEAM HOME',
      'ESC             PAUSE'
    ];
    for (let i = 0; i < lines.length; i++) F.draw(ctx, lines[i], x, 60 + i * 10, COL.text);

    if (button(ctx, x, 140, 84, 14, 'SOUND ' + (A.state.sfx ? 'ON' : 'OFF'))) { A.toggleSfx(!A.state.sfx); }
    if (button(ctx, x + 96, 140, 84, 14, 'MUSIC ' + (A.state.music ? 'ON' : 'OFF'))) { A.toggleMusic(!A.state.music); }
    if (button(ctx, x, 160, 84, 14, 'SAVE NOW')) { g.saveGame(); g.toast('PROGRESS SAVED', COL.good); }
    if (button(ctx, x + 96, 160, 84, 14, 'WIPE SAVE', { accent: '#8a2f4a' })) { g.wipeSave(); }
    F.draw(ctx, 'TOTAL MINED ' + U.fmt(g.save.totalMined) + ' TILES', x, 186, COL.dim);
    F.draw(ctx, 'TOTAL EARNED $' + U.fmt(g.save.totalEarned), x, 196, COL.dim);
    F.draw(ctx, 'WORLDS DESTROYED ' + g.save.destroyed.filter(Boolean).length, x, 206, COL.dim);
  }

  /* ------------------------------------------------------------- sell splash */
  function sellSplash(ctx, g) {
    const s = g.sellReport;
    if (!s) return;
    const h = 30 + s.lines.length * 10;
    const w = 150;
    const x = VW / 2 - w / 2, y = 60;
    ctx.globalAlpha = U.clamp(s.life, 0, 1);
    panel(ctx, x, y, w, h, 'CARGO SOLD');
    let ly = y + 10;
    for (const l of s.lines) {
      F.draw(ctx, l.name + ' X' + l.n, x + 8, ly, COL.text);
      F.draw(ctx, '$' + U.fmt(l.cr), x + w - 8, ly, COL.gold, { right: true });
      ly += 10;
    }
    ctx.fillStyle = COL.line;
    ctx.fillRect(x + 6, ly + 1, w - 12, 1);
    F.draw(ctx, 'TOTAL', x + 8, ly + 5, COL.good);
    F.draw(ctx, '$' + U.fmt(s.total), x + w - 8, ly + 5, COL.good, { right: true });
    ctx.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ title */
  /* THE TRASH. Somebody else's rubbish, tumbling slowly across the menu. Each
     bit keeps its own spin and drift and wraps round when it leaves, so the
     screen is never still and never repeats the same arrangement twice. */
  let junk = null;
  function junkInit() {
    const cv = PD.art.buildJunk();
    junk = [];
    for (let i = 0; i < 13; i++) {
      const near = U.chance(0.22);
      junk.push({
        cv: U.pick(cv), x: U.rand(-40, VW + 40), y: U.rand(-20, VH + 20),
        vx: U.rand(-12, 12) * (near ? 1.6 : 1), vy: U.rand(-6, 6),
        a: U.rand(0, U.TAU), va: U.rand(-0.45, 0.45),
        k: near ? 2 : 1, dim: near ? U.rand(0.2, 0.34) : U.rand(0.45, 1)
      });
    }
  }
  function junkDraw(ctx, dt) {
    if (!junk) junkInit();
    for (const j of junk) {
      j.x += j.vx * dt; j.y += j.vy * dt; j.a += j.va * dt;
      const m = 40;
      if (j.x < -m) j.x = VW + m; if (j.x > VW + m) j.x = -m;
      if (j.y < -m) j.y = VH + m; if (j.y > VH + m) j.y = -m;
      ctx.save();
      ctx.globalAlpha = j.dim;
      ctx.translate(j.x | 0, j.y | 0);
      ctx.rotate(j.a);
      ctx.drawImage(j.cv, -j.cv.width * j.k / 2 | 0, -j.cv.height * j.k / 2 | 0,
        j.cv.width * j.k, j.cv.height * j.k);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* A floating slab: the panel with a hard shadow cast well below it, so it
     reads as hanging in front of the galaxy rather than painted on it. */
  function floater(ctx, x, y, w, h, face, edge, lift) {
    lift = lift === undefined ? 4 : lift;
    X.plate(ctx, x + 2, y + lift, w, h, 'rgba(4,2,12,0.5)', null, null, 3);
    X.plate(ctx, x, y, w, h, face, edge, '#0a0618', 3);
  }

  /* ------------------------------------------------------- the title cinema
     The menu is not a picture, it is a loop. He drills a world until it comes
     apart, the world goes up in one hard white frame, and then he tumbles off
     across the galaxy on real physics until a new world drifts in and he does
     it again. It runs for ever and never quite the same way twice. */
  const SHOW_TINTS = ['#4f7d6a', '#7a5a8a', '#8a6a4a', '#4a6a9a', '#8a4a4a', '#5a8a5a'];
  let show = null;

  function showWorld(next) {
    const i = next === undefined ? (U.randInt(0, SHOW_TINTS.length - 1)) : next;
    show.tint = SHOW_TINTS[i];
    show.seed = 7 + i * 13 + U.randInt(0, 40);
    show.planet = PD.arthome.buildPlanet(80, show.tint, show.seed, 'volcanic');
  }

  function showInit() {
    show = {
      mode: 'drill', t: 0, chunks: [], sparks: [], flash: 0, ring: -1,
      shake: 0, fade: 0, rig: PD.rig.make(),
      al: { x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0 }
    };
    showWorld(0);
  }

  const SHOW_X = 372, SHOW_Y = 166;                  // where the doomed world sits

  /* The moment it goes. One white frame, a stepped shockwave, a starburst of
     hard spikes, forty-odd chunks of the crust and a shower of embers -- and
     he takes the whole of it in the chest. */
  function showBlow() {
    show.mode = 'float'; show.t = 0;
    show.flash = 1; show.ring = 0; show.shake = 1;
    show.chunks.length = 0; show.sparks.length = 0;
    for (let i = 0; i < 54; i++) {
      const a = U.rand(0, U.TAU), sp = U.rand(42, 265);
      const r = U.rand(1.6, 4.6), n = U.randInt(5, 7), pts = [];
      // an irregular hard-edged lump, not a disc: this game has no circles
      for (let j = 0; j < n; j++) {
        const ang = j * U.TAU / n + U.rand(-0.2, 0.2), rr = r * U.rand(0.68, 1.25);
        pts.push([Math.cos(ang) * rr, Math.sin(ang) * rr]);
      }
      show.chunks.push({
        x: SHOW_X, y: SHOW_Y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        pts, r, a: U.rand(0, U.TAU), va: U.rand(-3, 3),
        hot: U.chance(0.28), life: U.rand(5, 9)
      });
    }
    for (let i = 0; i < 90; i++) {
      const a = U.rand(0, U.TAU), sp = U.rand(60, 320);
      show.sparks.push({ x: SHOW_X, y: SHOW_Y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: U.rand(0.5, 1.6) });
    }
    // he is directly above it, so he goes up and away, spinning hard -- and
    // always off to the right, where there is nothing for him to land on top of
    show.al.x = SHOW_X - 22; show.al.y = SHOW_Y - 42;
    show.al.vx = U.rand(26, 74); show.al.vy = U.rand(-86, -40);
    show.al.a = 0; show.al.va = U.rand(1.8, 3.6) * (U.chance(0.5) ? -1 : 1);
    PD.audio.sfx.boom && PD.audio.sfx.boom();
  }

  function showStep(dt) {
    show.t += dt;
    // the fade only ever rises at the tail of a tumble; everywhere else it
    // falls, which is what opens the new world back up
    if (!(show.mode === 'float' && show.t > 7.2)) show.fade = Math.max(0, show.fade - dt * 2.6);
    show.flash = Math.max(0, show.flash - dt * 3.4);
    show.shake = Math.max(0, show.shake - dt * 3.6);
    if (show.ring >= 0) { show.ring += dt * 380; if (show.ring > 150) show.ring = -1; }

    for (let i = show.chunks.length - 1; i >= 0; i--) {
      const c = show.chunks[i];
      c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt;
      c.vx *= 1 - dt * 0.22; c.vy *= 1 - dt * 0.22;
      c.life -= dt;
      if (c.life <= 0) show.chunks.splice(i, 1);
    }
    for (let i = show.sparks.length - 1; i >= 0; i--) {
      const s2 = show.sparks[i];
      s2.x += s2.vx * dt; s2.y += s2.vy * dt;
      s2.vx *= 1 - dt * 1.9; s2.vy *= 1 - dt * 1.9;
      s2.life -= dt;
      if (s2.life <= 0) show.sparks.splice(i, 1);
    }

    if (show.mode === 'drill') {
      if (show.t > 3.6) showBlow();
      return;
    }

    /* Floating. No gravity out here, so he keeps whatever he was given and
       only loses a little to nothing at all; the walls of the screen are the
       only thing that ever changes his mind. */
    const a2 = show.al;
    a2.x += a2.vx * dt; a2.y += a2.vy * dt; a2.a += a2.va * dt;
    a2.va *= 1 - dt * 0.12;
    if (a2.x < 28 && a2.vx < 0) { a2.vx = -a2.vx * 0.86; a2.va = -a2.va * 0.9; }
    if (a2.x > VW - 28 && a2.vx > 0) { a2.vx = -a2.vx * 0.86; a2.va = -a2.va * 0.9; }
    if (a2.y < 28 && a2.vy < 0) { a2.vy = -a2.vy * 0.86; a2.va = -a2.va * 0.9; }
    if (a2.y > VH - 24 && a2.vy > 0) { a2.vy = -a2.vy * 0.86; a2.va = -a2.va * 0.9; }
    PD.rig.step(show.rig, { dt, vx: a2.vx, vy: a2.vy, ground: 0, drilling: false });

    // the last of the tumble dips to black, and a new world is there
    if (show.t > 7.2) {
      show.fade = Math.min(1, show.fade + dt * 2.6);
      if (show.fade >= 1) {
        showWorld(); show.mode = 'drill'; show.t = 0;
        show.chunks.length = 0; show.sparks.length = 0;
      }
    }
  }

  function showDraw(ctx, t) {
    // everything in the diorama shakes for a third of a second after the bang
    const sh = show.shake > 0 ? show.shake * show.shake * 5 : 0;
    ctx.save();
    if (sh) ctx.translate(Math.round(U.rand(-sh, sh)), Math.round(U.rand(-sh, sh)));

    if (show.mode === 'drill') {
      const px = SHOW_X, py = SHOW_Y;
      ctx.drawImage(show.planet, px - show.planet.width / 2 | 0, py - show.planet.height / 2 | 0);
      // the fissures widen and brighten the closer it is to going
      const near = U.clamp(show.t / 3.6, 0, 1);
      const glow = (0.55 + 0.45 * Math.sin(t * (4 + near * 12))) * (0.5 + near * 0.5);
      const cracks = [
        [[-4, -39], [-2, -24], [-10, -13], [-4, 4]],
        [[-2, -24], [11, -19], [17, -4]],
        [[-10, -13], [-24, -9], [-33, -15]]
      ];
      const walk = (col, w) => {
        for (const ln of cracks) for (let i = 1; i < ln.length; i++)
          X.line(ctx, px + ln[i - 1][0], py + ln[i - 1][1], px + ln[i][0], py + ln[i][1], col, w);
      };
      walk('rgba(120,18,4,' + (glow * 0.9).toFixed(2) + ')', 2 + Math.round(near * 2));
      walk('rgba(255,190,80,' + glow.toFixed(2) + ')', 1 + Math.round(near));
      X.glowBands(ctx, px - 4, py - 39, 16 + near * 14, '#ffe0a0', 4, glow * 0.8);

      for (let i = 0; i < 12; i++) {
        const a = -1.9 + (i * 0.18) + Math.sin(t * 3 + i) * 0.12;
        const d = 7 + ((i * 7 + Math.floor(t * 34)) % 20);
        ctx.fillStyle = i % 3 ? '#ffd34d' : '#fff6c8';
        ctx.fillRect(px - 4 + Math.cos(a) * d | 0, py - 41 + Math.sin(a) * d | 0, 2, 2);
      }

      const bob = Math.sin(t * 2.2) * 3 + Math.sin(t * 26) * near * 1.6;
      const al = PD.art.sprites.alien, dr = PD.art.sprites.drill;
      const K = 1.3, feet = al.h - al.oy;
      const ax = px - 24, ay = py - 35 - feet * K + bob;
      ctx.save();
      ctx.translate(ax + 9, ay + 3); ctx.rotate(0.85);
      ctx.drawImage(dr.frames[Math.floor(t * 12) % dr.frames.length], 0, 0,
        dr.frames[0].width, dr.frames[0].height, -dr.ox * K, -dr.oy * K, dr.w * K, dr.h * K);
      ctx.restore();
      ctx.drawImage(al.frames[Math.floor(t * 7) % 4], 0, 0, al.frames[0].width, al.frames[0].height,
        Math.round(ax - al.ox * K), Math.round(ay - al.oy * K), Math.round(al.w * K), Math.round(al.h * K));
    }

    /* THE IMPACT. A fireball of stacked octagons, one stepped shockwave and a
       short starburst of hard spikes -- all of it over in half a second,
       which is what makes it hit rather than drift. */
    if (show.ring >= 0) {
      const f = 1 - show.ring / 150;
      if (f > 0.45) {
        const fb = (f - 0.45) / 0.55;
        const R = 16 + (1 - fb) * 28;
        X.blob(ctx, SHOW_X, SHOW_Y, R * 1.2, R * 1.2, 'rgba(90,28,10,' + (fb * 0.3).toFixed(2) + ')');
        X.blob(ctx, SHOW_X, SHOW_Y, R, R, 'rgba(255,120,40,' + (fb * 0.85).toFixed(2) + ')');
        X.blob(ctx, SHOW_X, SHOW_Y, R * 0.62, R * 0.62, 'rgba(255,206,110,' + fb.toFixed(2) + ')');
        X.blob(ctx, SHOW_X, SHOW_Y, R * 0.3, R * 0.3, 'rgba(255,252,236,' + fb.toFixed(2) + ')');
      }
      X.ring(ctx, SHOW_X, SHOW_Y, show.ring, 'rgba(255,240,200,' + (f * f * 0.95).toFixed(2) + ')', Math.max(1, Math.round(f * 4)));
      X.ring(ctx, SHOW_X, SHOW_Y, show.ring * 0.66, 'rgba(255,150,60,' + (f * f * 0.7).toFixed(2) + ')', Math.max(1, Math.round(f * 3)));
      if (f > 0.55) {
        const k = (f - 0.55) / 0.45;                 // 1 at the bang, 0 by 0.25s
        const len = 34 + (1 - k) * 120;
        for (let i = 0; i < 8; i++) {
          const a = i * (U.TAU / 8) + 0.39;
          const nx = Math.cos(a), ny = Math.sin(a), tx = -ny, ty = nx;
          const w = 11 * k;
          X.poly(ctx, [
            [SHOW_X + nx * len, SHOW_Y + ny * len],
            [SHOW_X + tx * w, SHOW_Y + ty * w],
            [SHOW_X - tx * w, SHOW_Y - ty * w]
          ], 'rgba(255,248,220,' + (k * 0.9).toFixed(2) + ')');
        }
      }
    }

    for (const c of show.chunks) {
      ctx.globalAlpha = Math.min(1, c.life / 2);
      const co = Math.cos(c.a), si = Math.sin(c.a);
      const at = (p, g) => [c.x + (p[0] * co - p[1] * si) * g, c.y + (p[0] * si + p[1] * co) * g];
      X.poly(ctx, c.pts.map(p => at(p, 1.4)), '#140c22');
      X.poly(ctx, c.pts.map(p => at(p, 1)), c.hot ? '#e8631f' : show.tint);
      X.poly(ctx, c.pts.slice(0, 3).map(p => at(p, 0.62)), c.hot ? '#ffd27a' : '#ffffff22');
      ctx.globalAlpha = 1;
    }
    for (const s2 of show.sparks) {
      ctx.globalAlpha = Math.min(1, s2.life);
      ctx.fillStyle = s2.life > 0.9 ? '#fff6c8' : '#ffb04d';
      ctx.fillRect(s2.x | 0, s2.y | 0, 2, 2);
      ctx.globalAlpha = 1;
    }

    if (show.mode === 'float') {
      const a2 = show.al, skin = PD.art.skinFor({});
      PD.rig.draw(ctx, show.rig, {
        x: a2.x, y: a2.y, flip: a2.vx < 0, spr: skin.alienCore,
        frame: PD.rig.FACE.shock, drilling: false, grip: null, aim: 0,
        ground: 0, vx: a2.vx, vy: a2.vy, squash: 1, ragdoll: 1, ang: a2.a
      }, skin.P, PD.art.BIZ);
    }
    ctx.restore();

    if (show.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (show.flash * show.flash).toFixed(3) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }
    if (show.fade > 0) {
      ctx.fillStyle = 'rgba(4,2,12,' + show.fade.toFixed(2) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }
  }

  /* ------------------------------------------------------------- the wordmark
     Alien, and loud about it: acid green and gold over a magenta/cyan split,
     a breathing glow behind, and a line of nonsense runes top and bottom that
     shimmer one after another like something is reading them out. */
  function runes(ctx, cx, y, t) {
    const N = 15, gap = 15;
    for (let i = 0; i < N; i++) {
      const x = Math.round(cx - (N - 1) * gap / 2 + i * gap);
      const h = U.hash2(i * 7 + 1, 3);
      ctx.globalAlpha = 0.3 + 0.7 * Math.max(0, Math.sin(t * 2.2 - i * 0.5));
      const col = i % 3 === 0 ? '#8dff5a' : (i % 3 === 1 ? '#33e6ff' : '#ff4d9e');
      X.rect(ctx, x, y, 2, 9, col);
      if (h > 0.28) X.rect(ctx, x - 4, y + 2, 9, 2, col);
      if (h > 0.55) X.rect(ctx, x - 4, y + 7, 6, 2, col);
      if (h > 0.76) X.rect(ctx, x + 4, y - 3, 2, 5, col);
      if (h > 0.9) X.rect(ctx, x - 4, y - 3, 2, 4, col);
    }
    ctx.globalAlpha = 1;
  }

  function wordmark(ctx, cx, y, t) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.5);
    X.glowBands(ctx, cx, y + 26, 132, '#3fd98a', 6, 0.1 + pulse * 0.07);
    runes(ctx, cx, y - 15, t);
    const drift = Math.round(Math.sin(t * 2.1) * 1.5) + 2;
    F.draw(ctx, 'PLANET', cx - drift, y, '#ff2f8a', { center: true, scale: 5 });
    F.draw(ctx, 'PLANET', cx + drift, y, '#22e0ff', { center: true, scale: 5 });
    F.draw(ctx, 'PLANET', cx, y, '#b6ff4d', { center: true, scale: 5, shadow: '#14461f' });
    F.draw(ctx, 'DESTROYER', cx - drift, y + 40, '#22e0ff', { center: true, scale: 4 });
    F.draw(ctx, 'DESTROYER', cx + drift, y + 40, '#ff2f8a', { center: true, scale: 4 });
    F.draw(ctx, 'DESTROYER', cx, y + 40, '#ffd34d', { center: true, scale: 4, shadow: '#5c0f2c' });
    runes(ctx, cx, y + 70, t);
  }

  /* The menu. Everything on it hangs in front of the galaxy on its own bob at
     its own rate, so nothing is nailed to the screen. */
  function title(ctx, g, t, dt) {
    dt = dt === undefined ? 1 / 60 : Math.min(0.05, dt);
    if (!show) showInit();
    PD.galaxy.spiral(ctx, t, 7);
    junkDraw(ctx, dt);
    showStep(dt);
    showDraw(ctx, t);

    const cx = 158;
    const bobA = Math.sin(t * 0.9) * 3;
    const bobB = Math.sin(t * 1.24 + 1.1) * 2.5;
    const bobC = Math.sin(t * 0.72 + 2.4) * 2;

    wordmark(ctx, cx, 46 + bobA, t);

    const m = PD.input.mouse;
    const py = 168 + bobB;
    const hot = m.inside && Math.abs(m.x - cx) < 74 && Math.abs(m.y - py) < 16;
    floater(ctx, cx - 74, py - 16, 148, 32, hot ? '#2f8f6a' : '#1f6b4c', hot ? '#8dff5a' : '#4fd99a', 5);
    ctx.save(); ctx.translate(cx - 52, py); ctx.rotate(-Math.PI / 2);
    PD.glyph.draw(ctx, 'play', -7, -7, '#ffffff', '#8dff5a'); ctx.restore();
    F.draw(ctx, g.save.totalEarned > 0 ? 'CONTINUE' : 'START', cx + 8, py - 7, '#ffffff', { center: true, scale: 2 });
    const start = hot && m.leftPressed;
    if (start) PD.audio.sfx.click();

    let wipe = false;
    if (g.save.totalEarned > 0) {
      const sy = 200 + bobC;
      floater(ctx, cx - 92, sy - 5, 184, 32, 'rgba(14,8,34,0.78)', '#33e6ff', 4);
      F.draw(ctx, '$' + U.fmt(g.save.credits) + '   GALAXY ' + g.save.dominion.toFixed(1) + '%', cx, sy, COL.gold, { center: true });
      wipe = button(ctx, cx - 40, sy + 12, 80, 12, 'NEW GAME', { accent: '#8a2f4a' });
    }
    return { start, wipe };
  }

  /* ------------------------------------------------------------------ pause */
  function pause(ctx, g) {
    ctx.fillStyle = 'rgba(8,4,18,0.7)';
    ctx.fillRect(0, 0, VW, VH);
    const m = PD.input.mouse;
    const keys = [
      { g: 'play', x: VW / 2 - 78, col: '#2f7a4a', id: 'resume' },
      { g: A.state.sfx ? 'check' : 'cross', x: VW / 2 - 26, col: '#3f6ea8', id: 'sfx' },
      { g: 'star', x: VW / 2 + 26, col: A.state.music ? '#6b3fb5' : '#2a1c4a', id: 'music' },
      { g: 'home', x: VW / 2 + 78, col: '#8a2f4a', id: 'ship' }
    ];
    const r = { resume: false, ship: false };
    for (const k of keys) {
      const hot = m.inside && U.dist(m.x, m.y, k.x, VH / 2) < 20;
      PD.glyph.hex(ctx, k.x, VH / 2, 20 + (hot ? 2 : 0), k.col, hot ? '#ffffff' : COL.lineHi, 1.5);
      if (k.g === 'play') { ctx.save(); ctx.translate(k.x + 2, VH / 2); ctx.rotate(-Math.PI / 2); PD.glyph.draw(ctx, 'play', -7, -7, '#ffffff', k.col); ctx.restore(); }
      else PD.glyph.draw(ctx, k.g, k.x - 7, VH / 2 - 7, '#ffffff', k.col);
      if (hot && m.leftPressed) {
        A.sfx.click();
        if (k.id === 'resume') r.resume = true;
        if (k.id === 'sfx') A.toggleSfx(!A.state.sfx);
        if (k.id === 'music') A.toggleMusic(!A.state.music);
        if (k.id === 'ship') r.ship = true;
      }
    }
    return r;
  }

  /* -------------------------------------------------------- destroyed banner */
  function victory(ctx, g) {
    const v = g.victory;
    if (!v) return null;
    const t = v.t;
    const slide = U.smoothstep(0, 0.5, t);
    const y = U.lerp(-60, 40, slide);

    ctx.fillStyle = 'rgba(8,4,18,' + (0.8 * slide).toFixed(2) + ')';
    ctx.fillRect(0, 0, VW, VH);

    F.draw(ctx, 'WORLD', VW / 2, y, '#ffd34d', { center: true, scale: 4, shadow: '#7a2a10' });
    F.draw(ctx, 'DESTROYED', VW / 2, y + 34, '#ff5a4d', { center: true, scale: 5, shadow: '#3a0c30' });

    if (t > 0.7) {
      const a = U.clamp((t - 0.7) / 0.4, 0, 1);
      ctx.globalAlpha = a;
      panel(ctx, VW / 2 - 100, 122, 200, 78);
      PD.glyph.stat(ctx, 'star', U.fmt(v.reward), VW / 2 - 40, 130, COL.gold, '#b8860b', COL.gold);
      PD.glyph.stat(ctx, 'galaxy', '+' + v.dominion.toFixed(1) + '%', VW / 2 - 40, 146, COL.good, '#3fb85a', COL.good);
      PD.glyph.stat(ctx, 'coin', '+' + v.bonus + '%', VW / 2 - 40, 162, COL.lineHi, '#3a2a5e', COL.lineHi);
      if (v.unlocked) { PD.glyph.draw(ctx, 'planet', VW / 2 - 16, 178, COL.gold, '#b8860b'); PD.glyph.draw(ctx, 'check', VW / 2 + 2, 178, COL.good, '#3fb85a'); }
      ctx.globalAlpha = 1;
      if (t > 1.0) {
        return { ok: button(ctx, VW / 2 - 20, 206, 40, 18, '', { accent: '#2f7a4a' }) && true, _g: PD.glyph.draw(ctx, 'home', VW / 2 - 7, 208, '#ffffff', '#8affa0') };
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------- ending */
  function ending(ctx, g, t) {
    ctx.fillStyle = 'rgba(8,4,18,0.82)';
    ctx.fillRect(0, 0, VW, VH);
    F.draw(ctx, 'GALAXY', VW / 2, 40, '#ffd34d', { center: true, scale: 5, shadow: '#7a2a10' });
    F.draw(ctx, 'CONQUERED', VW / 2, 80, '#8affa0', { center: true, scale: 5, shadow: '#0d4a20' });
    F.draw(ctx, 'EVERY WORLD ON THE MAP IS RUBBLE.', VW / 2, 124, COL.text, { center: true });
    F.draw(ctx, 'YOU ARE OBSCENELY, HORRIBLY RICH.', VW / 2, 138, COL.text, { center: true });
    F.draw(ctx, 'TOTAL EARNED $' + U.fmt(g.save.totalEarned), VW / 2, 158, COL.gold, { center: true, scale: 2 });
    F.draw(ctx, 'THE SANDBOX STAYS OPEN - WORLDS REGROW.', VW / 2, 184, COL.dim, { center: true });
    return button(ctx, VW / 2 - 60, 204, 120, 16, 'KEEP DRILLING', { accent: '#2f7a4a' });
  }

  PD.ui = {
    VW, VH, COL, panel, bar, button, icon, hud, homeBar, shop, title, pause, victory,
    showState: () => show, showBlow,
    sellSplash, ending, endFrame
  };
})(window.PD);
