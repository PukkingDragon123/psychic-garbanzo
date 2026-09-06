/* HUD, shop, star map and all the overlay screens. Everything is drawn into
   the low-res canvas with immediate-mode widgets. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const D = PD.data;
  const F = PD.font;
  const A = PD.audio;

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
  function hexChip(ctx, x, y, r, fill, edge) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 30);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function vitals(ctx, g) {
    const p = g.player;
    const maxO2 = p.stat('oxygen'), maxHull = p.stat('hull'), cap = p.capacity();
    const o2f = U.clamp(p.o2 / maxO2, 0, 1);
    const t = g.time;
    const PW = 172, PH = 62;

    ctx.fillStyle = 'rgba(10,6,24,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(PW, 0); ctx.lineTo(PW, PH - 10); ctx.quadraticCurveTo(PW, PH, PW - 10, PH); ctx.lineTo(0, PH); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(166,125,240,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PW + 0.5, 0); ctx.lineTo(PW + 0.5, PH - 10); ctx.quadraticCurveTo(PW + 0.5, PH + 0.5, PW - 10, PH + 0.5); ctx.lineTo(0, PH + 0.5); ctx.stroke();

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
    F.draw(ctx, 'AIR', tx + tw / 2, ty + th + 3, low ? '#ff6b8a' : '#7ef9ff', { center: true, shadow: false });

    const CX = 26;                                  // right-hand column
    F.draw(ctx, String(Math.ceil(p.o2)), CX, 4, low ? '#ff6b8a' : '#7ef9ff', { scale: 2, shadow: false });
    F.draw(ctx, 'O2', CX + 42, 10, '#4d6f9c', { shadow: false });

    // --- hull: hex chips that shatter
    const cf = U.clamp(p.hull / maxHull, 0, 1);
    F.draw(ctx, 'HULL', CX, 24, '#9c8ec4', { shadow: false });
    for (let i = 0; i < 6; i++) {
      const x = CX + 34 + i * 15, y = 27;
      const f = U.clamp(cf * 6 - i, 0, 1);
      hexChip(ctx, x, y, 6.5, '#2a1230', '#5b3f96');
      if (f > 0) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x - 7, y + 7 - 14 * f, 14, 14 * f); ctx.clip();
        hexChip(ctx, x, y, 6.5, f < 0.35 ? '#ff8a3d' : '#ff5a4d', null);
        ctx.restore();
        hexChip(ctx, x, y, 6.5, null, '#ffb0a0');
      } else {
        ctx.strokeStyle = '#4a2a4a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 4, y - 3); ctx.lineTo(x + 3, y + 4); ctx.stroke();
      }
    }

    // --- hold: a filling tube
    const hx = CX + 28, hy = 42, hw = 66, hh = 9;
    const load = U.clamp(p.cargoKg / cap, 0, 1);
    F.draw(ctx, 'HOLD', CX, 43, '#9c8ec4', { shadow: false });
    ctx.fillStyle = '#0d0720'; ctx.fillRect(hx - 1, hy - 1, hw + 2, hh + 2);
    ctx.fillStyle = '#231640'; ctx.fillRect(hx, hy, hw, hh);
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
      ctx.fillStyle = 'rgba(8,4,18,0.5)'; ctx.fillRect(0, my - 1, 104, 10);
      ctx.fillStyle = m.c[1]; ctx.fillRect(4, my + 1, 7, 7);
      ctx.fillStyle = m.c[0]; ctx.fillRect(4, my + 1, 7, 2);
      F.draw(ctx, m.name.toUpperCase().slice(0, 10), 15, my, COL.text, { shadow: false });
      F.draw(ctx, String(p.cargo[k]), 100, my, COL.gold, { right: true, shadow: false });
      my += 11;
    }
    if (p.cargoValue() > 0) {
      ctx.fillStyle = 'rgba(8,4,18,0.5)'; ctx.fillRect(0, my - 1, 104, 16);
      Gd().draw(ctx, 'coin', 3, my, COL.gold, '#b8860b');
      F.draw(ctx, U.fmt(p.cargoValue()), 19, my + 1, COL.gold, { scale: 2, shadow: false });
    }

    // top right: credits + galaxy
    ctx.fillStyle = 'rgba(10,6,24,0.7)';
    ctx.beginPath(); ctx.moveTo(VW - 130, 0); ctx.lineTo(VW, 0); ctx.lineTo(VW, 34); ctx.lineTo(VW - 120, 34); ctx.quadraticCurveTo(VW - 130, 34, VW - 130, 24); ctx.closePath(); ctx.fill();
    F.draw(ctx, '$' + U.fmt(g.save.credits), VW - 8, 4, COL.gold, { right: true, scale: 2 });
    F.draw(ctx, 'GALAXY ' + g.save.dominion.toFixed(1) + '%', VW - 8, 22, COL.lineHi, { right: true });
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
    ctx.fillStyle = 'rgba(8,4,18,0.55)';
    ctx.fillRect(0, sy - 4, 150, 16);
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
      F.draw(ctx, 'CORE', 182, 40, COL.core);
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

  /* On the moon: what you have, and what it is worth. One line, no boxes. */
  function homeBar(ctx, g) {
    const ore = g.vaultTotal();
    const val = g.vaultValue();
    ctx.fillStyle = 'rgba(8,4,18,0.62)';
    ctx.fillRect(0, 0, VW, 20);
    ctx.fillStyle = '#5b3f96';
    ctx.fillRect(0, 20, VW, 1);
    Gd().draw(ctx, 'coin', 4, 3, COL.gold, '#b8860b');
    F.draw(ctx, '$' + U.fmt(g.save.credits), 20, 2, COL.gold, { scale: 2, shadow: false });
    Gd().draw(ctx, 'ore', 150, 3, ore ? '#ffb03d' : COL.dim, '#5b3f96');
    F.draw(ctx, ore + ' ORE' + (val > 0 ? '  $' + U.fmt(val) : ''), 166, 6, ore ? '#ffb03d' : COL.dim, { shadow: false });
    if (g.save.artifacts > 0) {
      Gd().draw(ctx, 'star', 286, 3, COL.gold, '#b8860b');
      F.draw(ctx, g.save.artifacts + ' ARTIFACT' + (g.save.artifacts === 1 ? '' : 'S'), 302, 6, COL.gold, { shadow: false });
    }
    F.draw(ctx, 'GALAXY ' + g.save.dominion.toFixed(1) + '%', VW - 6, 6, COL.lineHi, { right: true, shadow: false });
  }


  /* ---------------------------------------------------------------- minimap
     Fog of war: only what the lamp has touched is drawn. Scanner pings paint
     ore you have not reached yet. */
  let mmCv = null, mmCtx = null, mmDirty = 0;
  function minimap(ctx, g) {
    const w = g.world;
    const MW = 92, MH = 92;
    const x0 = VW - MW - 8, y0 = 58;
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

    ctx.fillStyle = 'rgba(8,4,18,0.75)';
    ctx.fillRect(x0 - 2, y0 - 2, MW + 4, MH + 4);
    ctx.strokeStyle = COL.line; ctx.strokeRect(x0 - 1.5, y0 - 1.5, MW + 3, MH + 3);
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
      ctx.fillStyle = unlocked ? b.tint : '#3a3050';
      ctx.beginPath(); ctx.arc(32, y + 7, 4, 0, U.TAU); ctx.fill();
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
  /* A little mascot diorama: our alien caught mid-crime on a cracking world. */
  function titleArt(ctx, t) {
    const px = 386, py = 246, r = 58;

    // the doomed planet
    ctx.fillStyle = '#2b1c4a';
    ctx.beginPath(); ctx.arc(px, py, r + 3, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#4f7d6a';
    ctx.beginPath(); ctx.arc(px, py, r, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#3a5f55';
    ctx.beginPath(); ctx.arc(px + 10, py + 12, r - 8, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#6a9a80';
    [[-26, -18, 9], [12, -30, 6], [-8, 6, 5], [26, -6, 7]].forEach(c => {
      ctx.beginPath(); ctx.arc(px + c[0], py + c[1], c[2], 0, U.TAU); ctx.fill();
    });

    // glowing fissures, breathing in time with the drill
    const glow = 0.7 + 0.3 * Math.sin(t * 4);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(200,50,10,' + (glow * 0.8).toFixed(2) + ')';
    const cracks = [
      [[-6, -56], [-2, -34], [-14, -18], [-4, 0]],
      [[-4, -34], [14, -26], [22, -8]],
      [[-14, -18], [-32, -12], [-44, -20]]
    ];
    for (const line of cracks) {
      ctx.beginPath();
      ctx.moveTo(px + line[0][0], py + line[0][1]);
      for (let i = 1; i < line.length; i++) ctx.lineTo(px + line[i][0], py + line[i][1]);
      ctx.stroke();
    }
    // hot inner line on top of the dark fissure
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,190,80,' + glow.toFixed(2) + ')';
    for (const line of cracks) {
      ctx.beginPath();
      ctx.moveTo(px + line[0][0], py + line[0][1]);
      for (let i = 1; i < line.length; i++) ctx.lineTo(px + line[i][0], py + line[i][1]);
      ctx.stroke();
    }
    const hg = ctx.createRadialGradient(px - 6, py - 56, 1, px - 6, py - 56, 22);
    hg.addColorStop(0, 'rgba(255,240,190,' + glow.toFixed(2) + ')');
    hg.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(px - 28, py - 78, 56, 56);

    // sparks off the bit
    for (let i = 0; i < 9; i++) {
      const a = -1.9 + (i * 0.21) + Math.sin(t * 3 + i) * 0.1;
      const d = 8 + ((i * 7 + Math.floor(t * 30)) % 22);
      ctx.fillStyle = i % 3 ? '#ffd34d' : '#fff6c8';
      ctx.fillRect(px - 6 + Math.cos(a) * d | 0, py - 58 + Math.sin(a) * d | 0, 2, 2);
    }

    // the culprit
    const bob = Math.sin(t * 2.2) * 3;
    const al = PD.art.sprites.alien, dr = PD.art.sprites.drill;
    const ax = px - 34, ay = py - 96 + bob;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(0.85);
    ctx.drawImage(dr.frames[Math.floor(t * 12) % dr.frames.length], 0, 0,
      dr.w, dr.h, -dr.ox * 2, -dr.oy * 2, dr.w * 2, dr.h * 2);
    ctx.restore();
    ctx.drawImage(al.frames[0], 0, 0, al.w, al.h,
      ax - al.ox * 2 | 0, ay - al.oy * 2 | 0, al.w * 2, al.h * 2);
  }

  function title(ctx, g, t) {
    const cx = 168;
    const bob = Math.sin(t * 1.6) * 2;
    titleArt(ctx, t);
    F.draw(ctx, 'PLANET', cx, 30 + bob, '#ffd34d', { center: true, scale: 5, shadow: '#7a2a10' });
    F.draw(ctx, 'DESTROYER', cx, 70 + bob, '#ff5fa8', { center: true, scale: 4, shadow: '#3a0c30' });
    F.draw(ctx, 'A GREEDY LITTLE ALIEN MINING GAME', cx, 106, COL.dim, { center: true });

    const m = PD.input.mouse;
    const px = cx, py = 150;
    const hot = m.inside && Math.abs(m.x - px) < 70 && Math.abs(m.y - py) < 14;
    ctx.fillStyle = hot ? '#3f9a5a' : '#2f7a4a'; ctx.fillRect(px - 70, py - 14, 140, 28);
    ctx.strokeStyle = '#8affa0'; ctx.lineWidth = 2; ctx.strokeRect(px - 69, py - 13, 138, 26);
    ctx.save(); ctx.translate(px - 50, py); ctx.rotate(-Math.PI / 2); PD.glyph.draw(ctx, 'play', -7, -7, '#ffffff', '#8affa0'); ctx.restore();
    F.draw(ctx, g.save.totalEarned > 0 ? 'CONTINUE' : 'START', px + 6, py - 7, '#ffffff', { center: true, scale: 2 });
    const start = hot && m.leftPressed;
    if (start) PD.audio.sfx.click();

    let wipe = false;
    if (g.save.totalEarned > 0) {
      wipe = button(ctx, cx - 40, 174, 80, 14, 'NEW GAME', { accent: '#8a2f4a' });
      F.draw(ctx, '$' + U.fmt(g.save.credits) + '   GALAXY ' + g.save.dominion.toFixed(1) + '%', cx, 194, COL.gold, { center: true });
    }
    const legend = [['hand', 'FLY'], ['hand', 'DRILL'], ['gun', 'SHOOT'], ['hole', 'HOME']];
    for (let i = 0; i < legend.length; i++) {
      PD.glyph.draw(ctx, legend[i][0], 14 + i * 80, 240, COL.gold, '#b8860b');
      F.draw(ctx, legend[i][1], 30 + i * 80, 244, COL.text);
    }
    F.draw(ctx, 'HOLD MOUSE / TOUCH TO FLY     E DOCK     Q SWAP     TAB SCAN', VW / 2, 258, COL.dim, { center: true });
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
    sellSplash, ending, endFrame
  };
})(window.PD);
