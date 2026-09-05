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
    market: { hi: '#39ffa6', mid: '#1e9e68', lo: '#0d3d2a', bg: '#04140f', name: 'THE EXCHANGE', glyph: 'sell' },
    skills: { hi: '#ffb03d', mid: '#c07a20', lo: '#3d2a0d', bg: '#140f04', name: 'THE LAB', glyph: 'hex' }
  };

  const FOOT = {
    market: 'ONLY APPRAISED ORE SELLS. PRICES MOVE ON THEIR OWN.',
    skills: 'CLICK A HEX. NEIGHBOURS OF A BUILT NODE UNLOCK.'
  };

  const state = {
    app: null, t: 0, boot: 0, lines: [], scroll: 0,
    sel: 0, flash: 0, msg: '', msgT: 0, msgCol: null, cat: 0, tip: ''
  };

  const BOOT = {
    market: ['RUSTMAW OS 4.21', 'LINKING BLACK-MARKET RELAY...', 'RELAY OK  [ENCRYPTED]', 'NO QUESTIONS ASKED.'],
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
    F.draw(ctx, title, SX + 22, SY + 3, th.hi, { shadow: false });
    if (sub) F.draw(ctx, sub, SX + SW - 6, SY + 3, th.mid, { right: true, shadow: false });

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
    const Gd = PD.glyph;

    /* ---- Zaz's appraisal lane runs across the top of the screen. */
    const laneY = IY - 4, laneH = 26;
    ctx.fillStyle = '#06251a'; ctx.fillRect(IX, laneY, IW, laneH);
    ctx.strokeStyle = th.mid; ctx.strokeRect(IX + 0.5, laneY + 0.5, IW - 1, laneH - 1);
    ctx.fillStyle = th.lo;
    for (let x = 0; x < IW - 6; x += 8) ctx.fillRect(IX + 2 + ((x + Math.floor(t * 26)) % (IW - 8)), laneY + laneH - 5, 4, 2);

    const appMat = g.appraising();
    const waiting = Object.keys(g.save.vault).reduce((n, k) => n + g.save.vault[k], 0);
    const readyN = Object.keys(g.save.appr).reduce((n, k) => n + g.save.appr[k], 0);
    Gd.draw(ctx, 'clock', IX + 4, laneY + 6, '#ffffff', '#ffb03d');
    F.draw(ctx, 'APPRAISAL', IX + 20, laneY + 4, th.mid, { shadow: false });
    F.draw(ctx, waiting + ' IN QUEUE', IX + 20, laneY + 14, waiting ? '#ffb03d' : th.lo, { shadow: false });

    const scanX = IX + IW - 150;                 // the scanner arch sits here
    const nameX = IX + IW - 124;
    if (appMat !== null) {
      const m = D.MAT[appMat];
      const f = g.apprFrac();
      const lx = IX + 88 + f * (scanX - IX - 92);
      ctx.fillStyle = m.c[1]; ctx.fillRect(lx, laneY + 10, 10, 10);
      ctx.fillStyle = m.c[0]; ctx.fillRect(lx, laneY + 10, 10, 3);
      ctx.strokeStyle = th.hi; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(scanX, laneY + 22); ctx.lineTo(scanX, laneY + 5);
      ctx.lineTo(scanX + 20, laneY + 5); ctx.lineTo(scanX + 20, laneY + 22);
      ctx.stroke();
      ctx.fillStyle = 'rgba(57,255,166,' + (0.25 + 0.2 * Math.sin(t * 9)).toFixed(2) + ')';
      ctx.fillRect(scanX + 1, laneY + 6, 18, 16);
      F.draw(ctx, m.name.toUpperCase().slice(0, 14), nameX, laneY + 4, th.hi, { shadow: false });
      ctx.fillStyle = th.lo; ctx.fillRect(nameX, laneY + 15, 112, 5);
      ctx.fillStyle = '#ffb03d'; ctx.fillRect(nameX, laneY + 15, Math.round(112 * f), 5);
    } else {
      F.draw(ctx, waiting ? 'SPINNING UP...' : 'NOTHING TO VALUE', nameX, laneY + 10, th.lo, { shadow: false });
    }

    // the three multipliers that decide what a rock is worth
    const fee = Math.round(D.appraiseFee(g.save.upg.appraise || 0) * 100);
    const brk = Math.round((D.UPG.crew.value(g.save.upg.crew || 0) - 1) * 100);
    const pur = Math.round((D.UPG.refine.value(g.save.upg.refine || 0) - 1) * 100);
    F.draw(ctx, 'HOUSE FEE -' + fee + '%', IX, IY + 26, '#ff6b8a', { shadow: false });
    F.draw(ctx, 'BROKER +' + brk + '%', IX + 96, IY + 26, th.hi, { shadow: false });
    F.draw(ctx, 'PURIFIER +' + pur + '%', IX + 174, IY + 26, th.hi, { shadow: false });
    F.draw(ctx, readyN + ' LOTS READY', IX + IW, IY + 26, th.mid, { right: true, shadow: false });

    /* ---- the ore book. */
    const set = {};
    for (const k in g.save.vault) if (g.save.vault[k] > 0) set[k] = 1;
    for (const k in g.save.appr) if (g.save.appr[k] > 0) set[k] = 1;
    const keys = Object.keys(set).sort((a, b) => D.MAT[b].cr - D.MAT[a].cr);

    const hy = IY + 38;
    F.draw(ctx, 'ORE', IX, hy + 3, th.mid, { shadow: false });
    F.draw(ctx, 'QUEUE', IX + 104, hy + 3, th.mid, { shadow: false });
    F.draw(ctx, 'READY', IX + 150, hy + 3, th.mid, { shadow: false });
    F.draw(ctx, 'MARKET', IX + 196, hy + 3, th.mid, { shadow: false });
    F.draw(ctx, 'EACH', IX + 258, hy + 3, th.mid, { shadow: false });
    F.draw(ctx, 'TOTAL', IX + 300, hy + 3, th.mid, { shadow: false });
    ctx.fillStyle = th.lo; ctx.fillRect(IX, hy + 13, IW, 1);

    if (!keys.length) {
      Gd.draw(ctx, 'ore', IX + IW / 2 - 14, IY + 92, th.lo, th.lo, 2);
      F.draw(ctx, 'THE HOLD IS EMPTY. GO RUIN SOMETHING.', IX + IW / 2, IY + 122, th.lo, { center: true, shadow: false });
    }

    let total = 0;
    const maxRows = 7;
    for (let i = 0; i < Math.min(keys.length, maxRows); i++) {
      const k = keys[i], m = D.MAT[k];
      const ready = g.save.appr[k] || 0;
      const queued = g.save.vault[k] || 0;
      const unit = g.priceOf(+k);
      const val = unit * ready;
      total += val;
      const y = IY + 56 + i * 16;
      row(ctx, IX, y, IW, 15, th);
      ctx.fillStyle = m.c[1]; ctx.fillRect(IX + 3, y + 3, 9, 9);
      ctx.fillStyle = m.c[0]; ctx.fillRect(IX + 3, y + 3, 9, 3);
      ctx.fillStyle = '#0a0616'; ctx.fillRect(IX + 3, y + 11, 9, 1);
      F.draw(ctx, m.name.toUpperCase().slice(0, 13), IX + 16, y + 5, th.hi, { shadow: false });
      F.draw(ctx, queued ? String(queued) : '-', IX + 110, y + 5, queued ? '#ffb03d' : th.lo, { shadow: false });
      F.draw(ctx, ready ? String(ready) : '-', IX + 156, y + 5, ready ? th.hi : th.lo, { shadow: false });
      // demand: a little rising or falling bar with a percentage
      const dm = g.demandFor(+k);
      const up = (g.demandTrend && g.demandTrend[k] || 0) >= 0;
      const pct = Math.round((dm - 1) * 100);
      const col = pct >= 0 ? '#39ffa6' : '#ff6b8a';
      ctx.fillStyle = th.lo; ctx.fillRect(IX + 196, y + 6, 30, 5);
      ctx.fillStyle = col; ctx.fillRect(IX + 196, y + 6, Math.round(30 * U.clamp((dm - 0.78) / 0.5, 0.05, 1)), 5);
      F.draw(ctx, (pct >= 0 ? '+' : '') + pct + '%', IX + 230, y + 5, col, { shadow: false });
      Gd.draw(ctx, up ? 'arrowU' : 'arrowD', IX + 244, y + 2, col, 'rgba(0,0,0,0)');
      F.draw(ctx, U.fmt(unit), IX + 258, y + 5, th.mid, { shadow: false });
      F.draw(ctx, U.fmt(val), IX + 300, y + 5, ready ? th.hi : th.lo, { shadow: false });
      const sx = IX + IW - 62;
      if (key(ctx, sx, y, 26, 15, '1', th, { enabled: ready > 0 })) g.sellFromVault(+k, 1);
      if (key(ctx, sx + 30, y, 30, 15, 'ALL', th, { enabled: ready > 0 })) g.sellFromVault(+k, ready);
    }
    for (let i = maxRows; i < keys.length; i++) total += g.priceOf(+keys[i]) * (g.save.appr[keys[i]] || 0);

    /* ---- the till. */
    ctx.fillStyle = th.lo; ctx.fillRect(IX, IY + IH - 26, IW, 1);
    Gd.draw(ctx, 'coin', IX, IY + IH - 21, '#ffd34d', '#b8860b');
    F.draw(ctx, '$' + U.fmt(total), IX + 18, IY + IH - 22, total ? '#ffd34d' : th.lo, { shadow: false, scale: 2 });
    const bw = 96, bx = IX + IW - bw, by = IY + IH - 24;
    const hot = total > 0;
    ctx.fillStyle = hot ? (Math.sin(t * 5) > 0 ? '#39ffa6' : '#2ad48a') : '#12281f';
    ctx.fillRect(bx, by, bw, 20);
    ctx.strokeStyle = hot ? '#d6ffe9' : th.lo;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 19);
    F.draw(ctx, 'SELL EVERYTHING', bx + bw / 2, by + 7, hot ? '#05170e' : '#2c4a3c', { center: true, shadow: false });
    const mo = PD.input.mouse;
    if (hot && mo.inside && mo.leftPressed && mo.x >= bx && mo.x < bx + bw && mo.y >= by && mo.y < by + 20) g.sellAll();
  }


  /* ------------------------------------------------------------ fabricator */
  const APPS = { market: appMarket, skills: (ctx, g, th, t) => PD.skilltree.app(ctx, g, th, t) };

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
      else {
        ctx.save();
        ctx.beginPath(); ctx.rect(SX + 6, SY + SH - 14, SW - 88, 12); ctx.clip();
        F.draw(ctx, state.tip, SX + 6, SY + SH - 11, th.mid, { shadow: false });
        ctx.restore();
      }
    } else if (state.msgT > 0) {
      ctx.globalAlpha = U.clamp(state.msgT, 0, 1);
      if (Array.isArray(state.msg)) {
        let gx = SX + 6;
        for (const gname of state.msg) { PD.glyph.draw(ctx, gname, gx, SY + SH - 14, state.msgCol || th.hi, th.mid); gx += 16; }
        if (state.msgNum !== undefined) F.draw(ctx, state.msgNum, gx + 2, SY + SH - 11, state.msgCol || th.hi, { shadow: false });
      } else {
        ctx.save();
        ctx.beginPath(); ctx.rect(SX + 6, SY + SH - 14, SW - 88, 12); ctx.clip();
        F.draw(ctx, state.msg, SX + 6, SY + SH - 11, state.msgCol || th.hi, { shadow: false });
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    } else {
      // clipped so a long tip never runs under the CLOSE key
      ctx.save();
      ctx.beginPath();
      ctx.rect(SX + 6, SY + SH - 14, SW - 88, 12);
      ctx.clip();
      F.draw(ctx, FOOT[state.app] || 'LINK STABLE', SX + 6, SY + SH - 11, th.mid, { shadow: false });
      ctx.restore();
    }
    if (key(ctx, SX + SW - 74, SY + SH - 13, 70, 11, 'CLOSE  [ESC]', th)) close();

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
