/* RUSTMAW OS -- the in-fiction console.
   Every menu in the game is a screen the alien is actually standing at: a
   bezel, a phosphor tube, a boot sequence, scanlines and a cursor. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const D = PD.data;
  const F = PD.font;
  const A = PD.audio;

  const VW = 480, VH = 270;

  /* Each app gets its own phosphor colour so you know where you are. */
  const THEME = {
    market: { hi: '#39ffa6', mid: '#1e9e68', lo: '#0d3d2a', bg: '#04140f', name: 'CARGO EXCHANGE', glyph: 'sell' },
    fab:    { hi: '#ffb03d', mid: '#c07a20', lo: '#3d2a0d', bg: '#140f04', name: 'FABRICATOR', glyph: 'build' },
    skills: { hi: '#ffb03d', mid: '#c07a20', lo: '#3d2a0d', bg: '#140f04', name: 'SKILL LATTICE', glyph: 'hex' },
    bay:    { hi: '#58e8ff', mid: '#2b8fae', lo: '#0d2f3d', bg: '#041014', name: 'DRONE BAY', glyph: 'drone' },
    vanity: { hi: '#ff8ad8', mid: '#b0459a', lo: '#3d0d2f', bg: '#140418', name: 'IDENTITY SUITE', glyph: 'crew' },
    nav:    { hi: '#9ab4ff', mid: '#4f66c0', lo: '#161d3d', bg: '#060818', name: 'NAV COMPUTER', glyph: 'planet' },
    refinery: { hi: '#ffd34d', mid: '#b58a1e', lo: '#3a2c0a', bg: '#120e04', name: 'REFINERY DECK', glyph: 'machine' }
  };

  const state = {
    app: null, t: 0, boot: 0, lines: [], scroll: 0,
    sel: 0, flash: 0, msg: '', msgT: 0, msgCol: null, cat: 0, tip: ''
  };

  const BOOT = {
    market: ['RUSTMAW OS 4.21', 'LINKING BLACK-MARKET RELAY...', 'RELAY OK  [ENCRYPTED]', 'NO QUESTIONS ASKED.'],
    fab: ['RUSTMAW OS 4.21', 'FABRICATOR ARM ONLINE', 'FEEDSTOCK BIN: READING...', 'BOLT SAYS HURRY UP.'],
    bay: ['RUSTMAW OS 4.21', 'DRONE SWARM HANDSHAKE...', 'ALL UNITS NOMINAL', 'THEY NEVER SLEEP.'],
    vanity: ['RUSTMAW OS 4.21', 'IDENTITY SUITE LOADED', 'GENE VAT: WARM', 'LOOK THE PART.'],
    nav: ['RUSTMAW OS 4.21', 'STELLAR CARTOGRAPHY ONLINE', 'PLOTTING VICTIMS...', 'SELECT A TARGET.'],
    refinery: ['RUSTMAW OS 4.21', 'REFINERY GRID POWER: ON', 'BELT MOTORS SPUN UP', 'ROCK IN. MONEY OUT.'],
    skills: ['RUSTMAW OS 4.21', 'LATTICE ONLINE', 'NODES INDEXED', 'GROW.']
  };

  function open(app) {
    state.app = app;
    state.t = 0; state.boot = 0; state.scroll = 0; state.msgT = 0;
    A.sfx.tone(180, { type: 'square', to: 900, dur: 0.18, vol: 0.1 });
    A.tone(1200, { type: 'square', dur: 0.03, vol: 0.05, delay: 0.2 });
  }
  function close() {
    if (!state.app) return;
    state.app = null;
    A.sfx.tone(700, { type: 'square', to: 140, dur: 0.16, vol: 0.09 });
  }
  function say(msg, col, num) { state.msg = msg; state.msgNum = num; state.msgT = 2.6; state.msgCol = col; A.sfx.click(); }

  /* --------------------------------------------------------------- chrome */
  const SX = 14, SY = 10, SW = VW - 28, SH = VH - 20;
  const IX = SX + 12, IY = SY + 26, IW = SW - 24, IH = SH - 58;

  function chrome(ctx, th, title, sub) {
    // bezel
    ctx.fillStyle = '#171325';
    ctx.fillRect(SX - 6, SY - 6, SW + 12, SH + 12);
    ctx.fillStyle = '#241f38';
    ctx.fillRect(SX - 4, SY - 4, SW + 8, SH + 8);
    ctx.fillStyle = '#3a3358';
    ctx.fillRect(SX - 4, SY - 4, SW + 8, 2);
    for (const [bx, by] of [[SX - 2, SY - 2], [SX + SW - 2, SY - 2], [SX - 2, SY + SH - 2], [SX + SW - 2, SY + SH - 2]]) {
      ctx.fillStyle = '#6f6798'; ctx.fillRect(bx, by, 3, 3);
      ctx.fillStyle = '#171325'; ctx.fillRect(bx + 1, by + 1, 1, 1);
    }

    // tube
    ctx.fillStyle = th.bg;
    ctx.fillRect(SX, SY, SW, SH);

    // header rail
    ctx.fillStyle = th.lo;
    ctx.fillRect(SX, SY, SW, 14);
    ctx.fillStyle = th.mid;
    ctx.fillRect(SX, SY + 14, SW, 1);
    PD.glyph.draw(ctx, th.glyph || 'hex', SX + 4, SY, th.hi, th.mid);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? th.mid : th.lo; ctx.fillRect(SX + 24 + i * 5, SY + 5, 3, 4); }
    if (sub) F.draw(ctx, sub, SX + SW - 6, SY + 4, th.mid, { right: true, shadow: false });

    // footer rail
    ctx.fillStyle = th.lo;
    ctx.fillRect(SX, SY + SH - 14, SW, 14);
    ctx.fillStyle = th.mid;
    ctx.fillRect(SX, SY + SH - 15, SW, 1);
  }

  /* Phosphor bloom, scanlines and the occasional bad frame. */
  function glassOver(ctx, th, t) {
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#000000';
    for (let y = SY; y < SY + SH; y += 3) ctx.fillRect(SX, y, SW, 1);
    ctx.globalAlpha = 1;

    // rolling brightness band
    const band = (t * 42) % (SH + 60) - 30;
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = th.hi;
    ctx.fillRect(SX, SY + band, SW, 18);
    ctx.globalAlpha = 1;

    // rare glitch tear
    if (Math.sin(t * 1.7) > 0.995) {
      const gy = SY + ((t * 997) % SH | 0);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = th.mid;
      ctx.fillRect(SX, gy, SW, 2);
      ctx.globalAlpha = 1;
    }

    // corner darkening
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(SX, SY, SW, SH);
  }

  function cursor(ctx, x, y, th, t) {
    if (Math.sin(t * 8) > 0) ctx.fillStyle = th.hi, ctx.fillRect(x, y, 4, 7);
  }

  /* A selectable console row. Returns {hover, clicked}. */
  function row(ctx, x, y, w, h, th, opts) {
    opts = opts || {};
    const m = PD.input.mouse;
    const hover = m.inside && m.x >= x && m.x < x + w && m.y >= y && m.y < y + h && opts.enabled !== false;
    if (hover || opts.active) {
      ctx.fillStyle = opts.active ? th.lo : 'rgba(255,255,255,0.07)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = th.mid;
      ctx.fillRect(x, y, 1, h);
    }
    if (hover) F.draw(ctx, '>', x - 7, y + (h - 7) / 2 | 0, th.hi, { shadow: false });
    const clicked = hover && m.leftPressed;
    if (clicked) A.tone(900, { type: 'square', dur: 0.03, vol: 0.06 });
    return { hover, clicked };
  }

  /* A chunky console key/button. */
  function key(ctx, x, y, w, h, label, th, opts) {
    opts = opts || {};
    const m = PD.input.mouse;
    const on = opts.enabled !== false;
    const hover = on && m.inside && m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
    ctx.fillStyle = hover ? th.mid : (on ? th.lo : '#1a1a1a');
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = on ? (hover ? th.hi : th.mid) : '#333';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    F.draw(ctx, label, x + w / 2, y + (h - 7) / 2 | 0, on ? (hover ? '#ffffff' : th.hi) : '#555', { center: true, shadow: false });
    const clicked = hover && m.leftPressed;
    if (clicked) A.sfx.click();
    return clicked;
  }

  function bar(ctx, x, y, w, h, frac, th) {
    ctx.fillStyle = th.lo; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = th.hi; ctx.fillRect(x, y, Math.round(w * U.clamp(frac, 0, 1)), h);
  }

  /* ---------------------------------------------------------------- market */
  function appMarket(ctx, g, th, t) {
    state.view = state.view || 'raw';
    const Gd = PD.glyph;
    // two tabs: raw ore / refined goods, as glyph keys
    const tabKey = (x, glyph, id) => {
      const on = state.view === id;
      const hot = PD.input.mouse.inside && PD.input.mouse.x >= x && PD.input.mouse.x < x + 30 && PD.input.mouse.y >= IY - 4 && PD.input.mouse.y < IY + 12;
      ctx.fillStyle = on ? th.mid : (hot ? th.lo : '#000'); ctx.fillRect(x, IY - 4, 30, 16);
      ctx.strokeStyle = on ? th.hi : th.mid; ctx.strokeRect(x + 0.5, IY - 3.5, 29, 15);
      Gd.draw(ctx, glyph, x + 8, IY - 3, '#ffffff', th.hi);
      if (hot && PD.input.mouse.leftPressed) { state.view = id; A.sfx.click(); }
    };
    tabKey(IX, 'ore', 'raw'); tabKey(IX + 34, 'machine', 'goods');
    const isRaw = state.view === 'raw';

    // fee and broker shown as glyph + number
    const fee = Math.round(D.appraiseFee(g.save.upg.appraise || 0) * 100);
    Gd.stat(ctx, 'clock', '-' + fee + '%', IX + 90, IY - 3, '#ffb03d', '#c07a20', th.mid);
    Gd.stat(ctx, 'crew', '+' + Math.round((D.UPG.crew.value(g.save.upg.crew || 0) - 1) * 100) + '%', IX + 150, IY - 3, th.hi, th.mid, th.mid);

    const entry = k => {
      if (isRaw) { const m = D.MAT[k]; return { cr: m.cr, c: m.c }; }
      if (k.indexOf('raw:') === 0) { const m = D.MAT[+k.slice(4)]; return { cr: m.cr, c: m.c }; }
      const gd = D.goodFromKey(k); return gd ? { cr: gd.cr, c: gd.c } : null;
    };
    let keys;
    if (isRaw) {
      const set = {};
      for (const k in g.save.vault) if (g.save.vault[k] > 0) set[k] = 1;
      for (const k in g.save.appr) if (g.save.appr[k] > 0) set[k] = 1;
      keys = Object.keys(set).sort((a, b) => D.MAT[b].cr - D.MAT[a].cr);
    } else keys = Object.keys(g.save.goods || {}).filter(k => g.save.goods[k] > 0 && entry(k)).sort((a, b) => entry(b).cr - entry(a).cr);

    // column glyphs
    const hy = IY + 16;
    Gd.draw(ctx, isRaw ? 'ore' : 'machine', IX, hy, th.mid, th.lo);
    if (isRaw) { Gd.draw(ctx, 'clock', IX + 120, hy, th.mid, th.lo); Gd.draw(ctx, 'check', IX + 170, hy, th.mid, th.lo); }
    else Gd.draw(ctx, 'check', IX + 170, hy, th.mid, th.lo);
    Gd.draw(ctx, 'coin', IX + 226, hy, th.mid, th.lo);
    ctx.fillStyle = th.lo; ctx.fillRect(IX, hy + 16, IW, 1);

    if (!keys.length) Gd.draw(ctx, isRaw ? 'ore' : 'machine', IX + IW / 2 - 7, IY + 70, th.lo, th.lo, 2);

    let total = 0;
    const maxRows = 8;
    const appMat = g.appraising();
    for (let i = 0; i < Math.min(keys.length, maxRows); i++) {
      const k = keys[i], e = entry(k);
      const ready = isRaw ? (g.save.appr[k] || 0) : g.save.goods[k];
      const raw = isRaw ? (g.save.vault[k] || 0) : 0;
      const unit = Math.round(e.cr * (isRaw ? g.saleMult() : g.valueMult()));
      const val = unit * ready;
      total += val;
      const y = IY + 36 + i * 15;
      const r = row(ctx, IX, y, IW, 14, th);
      ctx.fillStyle = e.c[1]; ctx.fillRect(IX + 3, y + 3, 8, 8); ctx.fillStyle = e.c[0]; ctx.fillRect(IX + 3, y + 3, 8, 3);
      if (!isRaw) { ctx.fillStyle = '#ffffff'; ctx.fillRect(IX + 6, y + 6, 2, 2); }
      if (isRaw) {
        // raw count + the appraisal bar for the lot being valued
        F.draw(ctx, String(raw), IX + 120, y + 4, raw ? '#ffb03d' : th.lo, { shadow: false });
        if (+k === appMat) { ctx.fillStyle = th.lo; ctx.fillRect(IX + 138, y + 5, 26, 4); ctx.fillStyle = '#ffb03d'; ctx.fillRect(IX + 138, y + 5, Math.round(26 * g.apprFrac()), 4); }
      }
      F.draw(ctx, String(ready), IX + 170, y + 4, ready ? th.hi : th.lo, { shadow: false });
      F.draw(ctx, U.fmt(unit), IX + 226, y + 4, th.mid, { shadow: false });
      F.draw(ctx, U.fmt(val), IX + 282, y + 4, ready ? th.hi : th.lo, { shadow: false });
      // sell keys: one / all, as glyphs
      const sx = IX + IW - 66;
      if (key(ctx, sx, y, 30, 14, '', th, { enabled: ready > 0 })) (isRaw ? g.sellFromVault(+k, 1) : g.sellGood(k, 1));
      Gd.draw(ctx, 'coin', sx + 8, y, ready ? '#ffd34d' : '#3a3030', ready ? '#b8860b' : '#2a2020');
      if (key(ctx, sx + 34, y, 30, 14, '', th, { enabled: ready > 0 })) (isRaw ? g.sellFromVault(+k, ready) : g.sellGood(k, ready));
      Gd.draw(ctx, 'sell', sx + 42, y, ready ? '#ffffff' : '#3a3030', ready ? th.hi : '#2a2020');
      if (r.hover) state.tip = [isRaw ? 'ore' : 'machine', 'arrowR', 'coin'];
    }
    for (let i = maxRows; i < keys.length; i++) total += Math.round(entry(keys[i]).cr * (isRaw ? g.saleMult() : g.valueMult())) * (isRaw ? (g.save.appr[keys[i]] || 0) : g.save.goods[keys[i]]);

    ctx.fillStyle = th.lo; ctx.fillRect(IX, IY + IH - 24, IW, 1);
    Gd.stat(ctx, 'coin', U.fmt(total), IX, IY + IH - 18, '#ffd34d', '#b8860b', th.hi);
    if (key(ctx, IX + IW - 72, IY + IH - 20, 70, 16, '', th, { enabled: total > 0 })) { if (isRaw) g.sellAll(); else g.sellAllGoods(); }
    Gd.draw(ctx, 'sell', IX + IW - 62, IY + IH - 19, total ? '#ffffff' : '#3a3030', total ? th.hi : '#2a2020');
    Gd.draw(ctx, 'sell', IX + IW - 46, IY + IH - 19, total ? '#ffffff' : '#3a3030', total ? th.hi : '#2a2020');
    Gd.draw(ctx, 'sell', IX + IW - 30, IY + IH - 19, total ? '#ffffff' : '#3a3030', total ? th.hi : '#2a2020');
  }

  /* ------------------------------------------------------------ fabricator */
  function appFab(ctx, g, th, t) {
    const list = D.UPGRADES;
    const perPage = 6;
    const page = U.clamp(state.scroll, 0, Math.max(0, Math.ceil(list.length / perPage) - 1));
    state.scroll = page;

    F.draw(ctx, 'MODULE                     STATE        COST', IX, IY, th.mid, { shadow: false });
    ctx.fillStyle = th.lo; ctx.fillRect(IX, IY + 9, IW, 1);

    for (let i = 0; i < perPage; i++) {
      const idx = page * perPage + i;
      if (idx >= list.length) break;
      const u = list[idx];
      const lvl = g.save.upg[u.id] || 0;
      const maxed = lvl >= u.max;
      const cost = D.upgradeCost(u, lvl);
      const rec = maxed ? [] : D.recipe(u, lvl);
      const haveAll = rec.every(r => (g.save.vault[r.mat] || 0) >= r.qty);
      const canAfford = g.save.credits >= cost && haveAll;
      const y = IY + 14 + i * 26;

      const r = row(ctx, IX, y, IW, 25, th, { active: state.sel === idx });
      if (r.clicked) state.sel = idx;

      ctx.drawImage(PD.art.ICON[u.icon], IX + 2, y + 4);
      F.draw(ctx, u.name, IX + 20, y + 3, maxed ? th.mid : th.hi, { shadow: false });
      F.draw(ctx, u.show(lvl), IX + 20, y + 14, th.mid, { shadow: false });
      F.draw(ctx, 'LV' + lvl + '/' + u.max, IX + 150, y + 3, th.mid, { shadow: false });
      bar(ctx, IX + 150, y + 14, 40, 4, lvl / u.max, th);

      if (maxed) {
        F.draw(ctx, 'MAXED', IX + 210, y + 8, th.hi, { shadow: false });
      } else {
        // requirement chips: credits then ore
        F.draw(ctx, '$' + U.fmt(cost), IX + 206, y + 3,
          g.save.credits >= cost ? th.hi : '#ff5a4d', { shadow: false });
        let cxp = IX + 206;
        for (const req of rec) {
          const have = g.save.vault[req.mat] || 0;
          const ok = have >= req.qty;
          const m = D.MAT[req.mat];
          ctx.fillStyle = m.c[1]; ctx.fillRect(cxp, y + 15, 5, 5);
          F.draw(ctx, have + '/' + req.qty, cxp + 7, y + 14, ok ? th.hi : '#ff5a4d', { shadow: false });
          cxp += 8 + F.width(have + '/' + req.qty, 1) + 6;
        }
        if (key(ctx, IX + IW - 62, y + 5, 60, 15, 'FABRICATE', th, { enabled: canAfford })) g.fabricate(u.id);
      }
      if (r.hover) state.tip = u.blurb.toUpperCase();
    }

    const pages = Math.ceil(list.length / perPage);
    if (key(ctx, IX, IY + IH - 16, 46, 14, '< PREV', th, { enabled: page > 0 })) state.scroll--;
    if (key(ctx, IX + 50, IY + IH - 16, 46, 14, 'NEXT >', th, { enabled: page < pages - 1 })) state.scroll++;
    F.draw(ctx, 'PAGE ' + (page + 1) + '/' + pages, IX + 104, IY + IH - 13, th.mid, { shadow: false });
  }

  /* -------------------------------------------------------------- drone bay */
  function appBay(ctx, g, th, t) {
    const n = g.save.upg.drones || 0;
    const yieldLv = g.save.upg.droneyield || 0;
    F.draw(ctx, 'AUTONOMOUS SALVAGE SWARM', IX, IY, th.hi, { shadow: false });
    F.draw(ctx, 'THEY STRIP THE RUBBLE WHILE YOU FLY.', IX, IY + 11, th.mid, { shadow: false });

    // live swarm readout
    const spr = PD.art.sprites.drone;
    for (let i = 0; i < Math.min(n, 24); i++) {
      const col = i % 12, rw = (i / 12) | 0;
      const bob = Math.sin(t * 3 + i) * 2;
      ctx.drawImage(spr.frames[(Math.floor(t * 10) + i) % 2],
        IX + col * 17, IY + 26 + rw * 16 + bob | 0);
    }
    if (n === 0) F.draw(ctx, 'NO UNITS DEPLOYED.', IX, IY + 30, '#ff5a4d', { shadow: false });
    if (n > 24) F.draw(ctx, '+' + (n - 24) + ' MORE IN THE RACKS', IX, IY + 58, th.mid, { shadow: false });

    const boxY = IY + 74;
    ctx.fillStyle = th.lo; ctx.fillRect(IX, boxY, IW, 1);
    F.draw(ctx, 'UNITS', IX, boxY + 8, th.mid, { shadow: false });
    F.draw(ctx, String(n), IX + 60, boxY + 8, th.hi, { shadow: false });
    F.draw(ctx, 'YIELD', IX, boxY + 20, th.mid, { shadow: false });
    F.draw(ctx, 'X' + (1 + yieldLv * 0.55).toFixed(2), IX + 60, boxY + 20, th.hi, { shadow: false });
    F.draw(ctx, 'INCOME', IX, boxY + 32, th.mid, { shadow: false });
    F.draw(ctx, '$' + U.fmt(g.droneIncome()) + ' /SEC', IX + 60, boxY + 32, th.hi, { shadow: false });
    F.draw(ctx, '$' + U.fmt(g.droneIncome() * 60) + ' /MIN', IX + 150, boxY + 32, th.mid, { shadow: false });

    const mk = (id, label, y) => {
      const u = D.UPG[id];
      const lvl = g.save.upg[id] || 0;
      const cost = D.upgradeCost(u, lvl);
      const rec = D.recipe(u, lvl);
      const haveAll = rec.every(r => (g.save.vault[r.mat] || 0) >= r.qty);
      const ok = lvl < u.max && g.save.credits >= cost && haveAll;
      F.draw(ctx, label, IX + 200, y, th.mid, { shadow: false });
      let cxp = IX + 200;
      F.draw(ctx, '$' + U.fmt(cost), cxp, y + 10, g.save.credits >= cost ? th.hi : '#ff5a4d', { shadow: false });
      cxp += F.width('$' + U.fmt(cost), 1) + 8;
      for (const req of rec) {
        const have = g.save.vault[req.mat] || 0;
        ctx.fillStyle = D.MAT[req.mat].c[1]; ctx.fillRect(cxp, y + 11, 5, 5);
        F.draw(ctx, have + '/' + req.qty, cxp + 7, y + 10, have >= req.qty ? th.hi : '#ff5a4d', { shadow: false });
        cxp += 8 + F.width(have + '/' + req.qty, 1) + 5;
      }
      if (key(ctx, IX + IW - 62, y, 60, 15, lvl >= u.max ? 'MAXED' : 'BUILD', th, { enabled: ok })) g.fabricate(id);
    };
    mk('drones', 'ADD DRONE UNIT', boxY + 4);
    mk('droneyield', 'UPGRADE CLAWS', boxY + 30);
  }

  /* ---------------------------------------------------------------- vanity */
  function appVanity(ctx, g, th, t) {
    const cats = D.COSMETICS;
    state.cat = U.clamp(state.cat, 0, cats.length - 1);
    for (let i = 0; i < cats.length; i++) {
      if (key(ctx, IX + i * 86, IY, 82, 14, cats[i].name, th, { enabled: true })) { state.cat = i; A.sfx.click(); }
      if (state.cat === i) { ctx.fillStyle = th.hi; ctx.fillRect(IX + i * 86, IY + 14, 82, 1); }
    }
    const cat = cats[state.cat];
    F.draw(ctx, cat.blurb, IX, IY + 20, th.mid, { shadow: false });

    for (let i = 0; i < cat.options.length; i++) {
      const o = cat.options[i];
      const y = IY + 30 + i * 14;
      const owned = o.cost === 0 || (g.save.owned[cat.id] || {})[o.id];
      const worn = (g.save.cos[cat.id] || cat.options[0].id) === o.id;
      const r = row(ctx, IX, y, IW - 116, 13, th, { active: worn });
      for (let k = 0; k < 3; k++) { ctx.fillStyle = o.c[k]; ctx.fillRect(IX + 2 + k * 7, y + 3, 6, 7); }
      F.draw(ctx, o.name, IX + 26, y + 3, worn ? '#ffffff' : th.hi, { shadow: false });
      if (worn) F.draw(ctx, 'WORN', IX + 158, y + 3, th.hi, { shadow: false });
      else if (owned) F.draw(ctx, 'OWNED', IX + 158, y + 3, th.mid, { shadow: false });
      else F.draw(ctx, '$' + U.fmt(o.cost), IX + 158, y + 3, g.save.credits >= o.cost ? th.hi : '#ff5a4d', { shadow: false });
      if (r.clicked) {
        if (owned) g.equipCosmetic(cat.id, o.id);
        else g.buyCosmetic(cat.id, o.id);
      }
    }

    // live mannequin
    const skin = PD.art.skinFor(g.save.cos);
    const bx = IX + IW - 50, by = IY + 88;
    ctx.fillStyle = th.lo; ctx.fillRect(bx - 34, by - 68, 72, 104);
    ctx.strokeStyle = th.mid; ctx.strokeRect(bx - 33.5, by - 67.5, 71, 103);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = th.mid; ctx.fillRect(bx - 32, by - 66 + i * 17, 68, 1); }
    const al = skin.alien, dr = skin.drill;
    ctx.save();
    ctx.translate(bx, by + Math.sin(t * 2) * 2);
    ctx.rotate(0.5);
    ctx.drawImage(dr.frames[Math.floor(t * 10) % dr.frames.length], -dr.ox * 1.4 | 0, -dr.oy * 1.4 | 0, dr.w * 1.4, dr.h * 1.4);
    ctx.restore();
    ctx.drawImage(al.frames[0], 0, 0, al.w, al.h,
      bx - al.ox * 1.6 | 0, by + Math.sin(t * 2) * 2 - al.oy * 1.6 | 0, al.w * 1.6, al.h * 1.6);
    F.draw(ctx, 'PREVIEW', bx, by + 40, th.mid, { center: true, shadow: false });

    // the dossier: who the galaxy thinks you are now
    const dy = IY + 126;
    ctx.fillStyle = th.lo; ctx.fillRect(IX, dy, IW - 108, 1);
    F.draw(ctx, 'GALACTIC DOSSIER', IX, dy + 6, th.hi, { shadow: false });
    F.draw(ctx, 'KNOWN AS', IX, dy + 20, th.mid, { shadow: false });
    F.draw(ctx, D.titleFor(g.save.dominion), IX + 78, dy + 20, '#ffffff', { shadow: false });
    F.draw(ctx, 'BOUNTY', IX, dy + 31, th.mid, { shadow: false });
    F.draw(ctx, '$' + U.fmt(D.bountyFor(g.save)), IX + 78, dy + 31, '#ff5a4d', { shadow: false });
    F.draw(ctx, 'WORLDS ENDED', IX, dy + 42, th.mid, { shadow: false });
    F.draw(ctx, String(g.save.destroyed.filter(Boolean).length), IX + 78, dy + 42, th.hi, { shadow: false });
    F.draw(ctx, 'GALAXY HELD', IX, dy + 53, th.mid, { shadow: false });
    F.draw(ctx, g.save.dominion.toFixed(1) + '%', IX + 78, dy + 53, th.hi, { shadow: false });
    bar(ctx, IX + 120, dy + 54, 96, 5, g.save.dominion / 100, th);
  }

  /* ------------------------------------------------------------------- nav */
  function appNav(ctx, g, th, t) {
    PD.glyph.draw(ctx, 'planet', IX, IY - 3, th.mid, th.lo); PD.glyph.draw(ctx, 'weight', IX + 226, IY - 3, th.mid, th.lo); PD.glyph.draw(ctx, 'coin', IX + 254, IY - 3, th.mid, th.lo);
    ctx.fillStyle = th.lo; ctx.fillRect(IX, IY + 9, IW, 1);
    for (let i = 0; i < D.BODIES.length; i++) {
      const b = D.BODIES[i];
      const y = IY + 14 + i * 14;
      const unlocked = i <= g.save.unlocked;
      const done = g.save.destroyed[i];
      const here = i === g.bodyIndex;
      const r = row(ctx, IX, y, IW, 13, th, { active: here, enabled: unlocked });

      // a tiny live rendering of the target
      const moon = g.navIcon(i);
      if (unlocked && moon) ctx.drawImage(moon, 0, 0, moon.width, moon.height, IX + 2, y + 1, 11, 11);
      else { ctx.fillStyle = th.lo; ctx.fillRect(IX + 3, y + 3, 9, 9); }

      F.draw(ctx, unlocked ? b.name : '???', IX + 16, y + 4, unlocked ? (done ? th.mid : th.hi) : th.lo, { shadow: false });
      F.draw(ctx, unlocked ? String(b.gravity) : '--', IX + 226, y + 4, th.mid, { shadow: false });
      if (done) PD.glyph.draw(ctx, 'check', IX + 254, y - 1, th.mid, th.lo);
      else if (unlocked) F.draw(ctx, U.fmt(b.reward), IX + 254, y + 4, th.hi, { shadow: false });
      else PD.glyph.draw(ctx, 'lock', IX + 254, y - 1, th.lo, th.lo);
      if (here) PD.glyph.draw(ctx, 'home', IX + IW - 24, y - 1, '#ffffff', th.hi);
      else if (unlocked) {
        if (key(ctx, IX + IW - 40, y, 38, 13, '', th)) g.travelTo(i);
        PD.glyph.draw(ctx, 'drill', IX + IW - 28, y - 1, '#ffffff', th.hi);
      }
      if (r.hover && unlocked) { state.tip = b.blurb.toUpperCase(); state.sel = i; }
    }

    // survey panel for whichever world is selected
    const sel = D.BODIES[U.clamp(state.sel, 0, g.save.unlocked)];
    const py = IY + 14 + D.BODIES.length * 14 + 4;
    ctx.fillStyle = th.lo; ctx.fillRect(IX, py, IW, 1);
    F.draw(ctx, sel.name, IX, py + 4, th.hi, { shadow: false });
    let sx2 = IX + 150;
    sx2 += PD.glyph.stat(ctx, 'planet', sel.radius, sx2, py, th.mid, th.lo) + 10;
    sx2 += PD.glyph.stat(ctx, 'weight', sel.gravity, sx2, py, th.mid, th.lo) + 10;
    sx2 += PD.glyph.stat(ctx, 'skull', Math.round(sel.enemyRate * 100) + '%', sx2, py, th.mid, th.lo) + 10;
    PD.glyph.stat(ctx, 'star', U.fmt(sel.reward), sx2, py, '#ffd34d', '#b8860b');
    // one stacked bar for the ore signature, with a legend underneath
    const tw = sel.ores.reduce((n, o) => n + o[1], 0);
    const sorted = sel.ores.slice().sort((a, b) => b[1] - a[1]);
    let ox2 = IX;
    for (const [mid, wt] of sorted) {
      const wpx = Math.max(2, Math.round(wt / tw * IW));
      ctx.fillStyle = D.MAT[mid].c[1];
      ctx.fillRect(ox2, py + 14, wpx, 7);
      ctx.fillStyle = D.MAT[mid].c[0];
      ctx.fillRect(ox2, py + 14, wpx, 2);
      ox2 += wpx;
    }
    for (let i = 0; i < Math.min(6, sorted.length); i++) {
      const m = D.MAT[sorted[i][0]];
      const lx = IX + i * 62;
      ctx.fillStyle = m.c[1];
      ctx.fillRect(lx, py + 25, 5, 5);
      F.draw(ctx, Math.round(sorted[i][1] / tw * 100) + '%', lx + 8, py + 24, th.mid, { shadow: false });
    }
  }

  const APPS = { market: appMarket, fab: appFab, bay: appBay, vanity: appVanity, nav: appNav,
    refinery: (ctx, g, th, t) => PD.factory.app(ctx, g, th, t),
    skills: (ctx, g, th, t) => PD.skilltree.app(ctx, g, th, t) };

  /* ------------------------------------------------------------------ draw */
  function draw(ctx, g, dt) {
    if (!state.app) return;
    state.t += dt;
    state.boot = Math.min(1, state.boot + dt * 2.4);
    state.msgT = Math.max(0, state.msgT - dt);
    const th = THEME[state.app];
    const t = state.t;
    state.tip = '';

    chrome(ctx, th, th.name, '$' + U.fmt(g.save.credits));

    if (state.boot < 1) {
      // boot sequence types itself in before the app appears
      const lines = BOOT[state.app];
      const shown = Math.floor(state.boot * lines.length * 1.4);
      for (let i = 0; i < Math.min(lines.length, shown + 1); i++) {
        const full = lines[i];
        const chars = i < shown ? full.length : Math.floor((state.boot * lines.length * 1.4 - shown) * 26);
        F.draw(ctx, '> ' + full.slice(0, chars), IX, IY + i * 11, th.hi, { shadow: false });
        if (i === Math.min(lines.length - 1, shown)) cursor(ctx, IX + F.width('> ' + full.slice(0, chars), 1) + 1, IY + i * 11, th, t);
      }
    } else {
      APPS[state.app](ctx, g, th, t);
    }

    // status line + disconnect
    if (state.tip) {
      if (Array.isArray(state.tip)) { let gx = SX + 6; for (const gname of state.tip) { PD.glyph.draw(ctx, gname, gx, SY + SH - 14, th.hi, th.mid); gx += 16; } }
      else F.draw(ctx, state.tip, SX + 6, SY + SH - 11, th.mid, { shadow: false });
    } else if (state.msgT > 0) {
      ctx.globalAlpha = U.clamp(state.msgT, 0, 1);
      if (Array.isArray(state.msg)) {
        let gx = SX + 6;
        for (const gname of state.msg) { PD.glyph.draw(ctx, gname, gx, SY + SH - 14, state.msgCol || th.hi, th.mid); gx += 16; }
        if (state.msgNum !== undefined) F.draw(ctx, state.msgNum, gx + 2, SY + SH - 11, state.msgCol || th.hi, { shadow: false });
      } else F.draw(ctx, state.msg, SX + 6, SY + SH - 11, state.msgCol || th.hi, { shadow: false });
      ctx.globalAlpha = 1;
    } else {
      for (let i = 0; i < 9; i++) { ctx.fillStyle = ((Math.floor(t * 4) + i) % 5) ? th.lo : th.mid; ctx.fillRect(SX + 6 + i * 6, SY + SH - 9, 4, 4); }
    }
    if (key(ctx, SX + SW - 34, SY + SH - 13, 30, 11, '', th)) close();
    PD.glyph.draw(ctx, 'cross', SX + SW - 26, SY + SH - 15, th.hi, th.mid);

    glassOver(ctx, th, t);
  }

  PD.term = {
    open, close, draw, say, key, row, chrome, glassOver, THEME,
    rect: { SX, SY, SW, SH, IX, IY, IW, IH },
    get app() { return state.app; },
    get booting() { return state.boot < 1; },
    state
  };
})(window.PD);
