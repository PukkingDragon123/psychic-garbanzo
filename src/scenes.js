/* Close-up scenes. Using a building on the moon zooms you into it, first
   person: your hands on the counter, the console filling the screen, big
   readable cards. Four scenes: the multi-tool in your hands, the terminal's
   video desk, the fabricator bench, and the docks with the pod on the lift. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const D = PD.data;
  const A = PD.audio;
  const G = PD.glyph;
  const AH = PD.arthome;
  const X = PD.pxd;
  const VW = 480, VH = 270;

  const S = { mode: null, sel: 0, t: 0, msg: '', msgT: 0, printT: 0, printId: null, fitT: 0, fitId: null, talk: 0, blink: 0, feed: [], feedT: 0 };
  const CHATTER = [
    ['ZAZ', 'Your regolith is... regolith. Send the gems, darling.'],
    ['BROKER K', 'Iron is up. Do not ask why. Sell now.'],
    ['THE SYNDICATE', 'We noticed a planet is missing. Nice work.'],
    ['ZAZ', 'Quality cannot be rushed. It can be bribed.'],
    ['MUM', 'Are you eating? Are you destroying enough worlds?'],
    ['BROKER K', 'Voidstone buyers are circling. Hold or fold.'],
    ['THE SYNDICATE', 'Bounty on your head went up. Congratulations.'],
    ['ZAZ', 'A relic! Finally something worth appraising.']
  ];
  const FACES = { 'ZAZ': ['#c4a0ff', '#8455c4'], 'BROKER K': ['#ffb03d', '#c25c14'], 'THE SYNDICATE': ['#ff5a4d', '#8a2a2a'], 'MUM': ['#8affa0', '#3fb85a'] };

  function enter(mode, g) {
    S.mode = mode; S.sel = 0; S.t = 0; S.msgT = 0; S.printT = 0; S.fitT = 0;
    if (!S.feed.length) for (let i = 0; i < 3; i++) S.feed.push(CHATTER[(i * 3) % CHATTER.length]);
    if (mode === 'terminal') S.talk = 1.2;
    A.sfx.tone(180, { type: 'square', to: 900, dur: 0.18, vol: 0.08 });
  }
  function close() { S.mode = null; PD.home.closeScene(); }
  function say(m) { S.msg = m; S.msgT = 2; A.sfx.deny(); }

  function list(g) {
    if (S.mode === 'phone') return D.BUILDINGS;
    if (S.mode === 'fab') return D.RECIPES.filter(r => r.tier <= g.buildLevel('fab'));
    if (S.mode === 'docks') return D.RECIPES.filter(r => (g.save.parts[r.id] || 0) > 0);
    return [];
  }

  /* Layout: rows live in LIST, the action key in BTN. */
  const LIST = { x: 20, y: 46, w: 240, rowH: 30, rows: 6 };
  const BTN = { x: VW - 190, y: VH - 44, w: 170, h: 28 };
  const BACK = { x: VW - 56, y: 6, w: 50, h: 18 };

  function inRect(m, r) { return m.inside && m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h; }

  function act(g) {
    const items = list(g);
    if (S.mode === 'phone') {
      const b = items[S.sel]; if (!b) return;
      const lvl = g.buildLevel(b.id);
      if (lvl <= 0) { if (g.startBuild(b.id)) close(); else say('NOT ENOUGH CREDITS'); }
      else if (lvl >= b.max) say('ALREADY AT FULL SIZE');
      else if (!g.upgradeBuilding(b.id)) say('NOT ENOUGH CREDITS');
    } else if (S.mode === 'terminal') {
      if (g.vaultValue() > 0) { g.sellAll(); S.talk = 1.6; S.feed.push(['ZAZ', 'Pleasure doing business. Bring me more.']); if (S.feed.length > 3) S.feed.shift(); }
      else say('NOTHING TO SELL');
    } else if (S.mode === 'fab') {
      const r = items[S.sel]; if (!r) return;
      if (g.craft(r.id)) { S.printT = 1.4; S.printId = r.id; } else say('MISSING ORE');
    } else if (S.mode === 'docks') {
      const r = items[S.sel]; if (!r) return;
      if (g.install(r.id)) { S.fitT = 1; S.fitId = r.id; S.sel = Math.min(S.sel, Math.max(0, list(g).length - 1)); } else say('NO FREE SLOT');
    }
  }

  function update(dt, g) {
    S.t += dt;
    S.msgT = Math.max(0, S.msgT - dt);
    S.printT = Math.max(0, S.printT - dt);
    S.fitT = Math.max(0, S.fitT - dt);
    S.talk = Math.max(0, S.talk - dt);
    S.blink -= dt; if (S.blink < -0.15) S.blink = 2 + Math.random() * 3;
    S.feedT += dt;
    if (S.feedT > 8) { S.feedT = 0; S.feed.push(CHATTER[(Math.random() * CHATTER.length) | 0]); if (S.feed.length > 3) S.feed.shift(); S.talk = 1.2; }
    const IN = PD.input, m = IN.mouse;
    const items = list(g);
    if (IN.hit('esc') || (m.leftPressed && inRect(m, BACK))) { close(); return; }
    if (IN.hit('down')) S.sel = Math.min(items.length - 1, S.sel + 1);
    if (IN.hit('up')) S.sel = Math.max(0, S.sel - 1);
    if (m.leftPressed) {
      if (inRect(m, BTN)) { act(g); return; }
      const i = Math.floor((m.y - LIST.y) / LIST.rowH);
      if (m.x >= LIST.x && m.x <= LIST.x + LIST.w && i >= 0 && i < Math.min(items.length, LIST.rows)) {
        if (S.sel === i) act(g); else { S.sel = i; A.sfx.click(); }
      }
    }
    if (IN.hit('KeyE') || IN.hit('enter') || IN.hit('space')) act(g);
  }

  /* ------------------------------------------------------------- widgets */
  function panel(ctx, x, y, w, h, col, fill) {
    X.rect(ctx, x, y, w, h, fill || 'rgba(6,10,26,0.86)');
    X.frame(ctx, x, y, w, h, col, col);
  }
  function button(ctx, r, label, on, t, col) {
    col = col || '#39ffa6';
    const lit = on && Math.sin(t * 5) > 0;
    X.plate(ctx, r.x, r.y, r.w, r.h, on ? (lit ? col : shade(col, 0.82)) : '#141a30',
      on ? '#ffffff' : '#2a3350', on ? shade(col, 0.5) : '#0b1020', 3);
    if (on) X.dither(ctx, r.x + 3, r.y + r.h - 4, r.w - 6, 2, shade(col, 0.6));
    F.draw(ctx, label, r.x + r.w / 2, r.y + Math.round(r.h / 2) - 7, on ? '#05170e' : '#3a4a6a', { center: true, shadow: false, scale: 2 });
  }
  function shade(hex, k) {
    k = k === undefined ? 0.8 : k;
    const n = parseInt(hex.slice(1), 16);
    return 'rgb(' + (((n >> 16) & 255) * k | 0) + ',' + (((n >> 8) & 255) * k | 0) + ',' + ((n & 255) * k | 0) + ')';
  }
  function header(ctx, title, sub, col) {
    X.rect(ctx, 0, 0, VW, 30, 'rgba(4,6,18,0.92)');
    X.rect(ctx, 0, 30, VW, 1, col);
    X.dither(ctx, 0, 27, VW, 3, shade(col, 0.35));
    if (title) F.draw(ctx, title, 12, 8, '#ffffff', { shadow: false, scale: 2 });
    if (sub) F.draw(ctx, sub, 12 + F.width(title, 2) + 14, 14, col, { shadow: false });
    X.plate(ctx, BACK.x, BACK.y, BACK.w, BACK.h, '#1a2240', col, '#0b1020', 2);
    F.draw(ctx, 'BACK', BACK.x + BACK.w / 2, BACK.y + 6, '#ffffff', { center: true, shadow: false });
  }
  function row(ctx, i, sel, col) {
    const y = LIST.y + i * LIST.rowH;
    if (sel) {
      X.plate(ctx, LIST.x, y, LIST.w, LIST.rowH - 2, 'rgba(255,255,255,0.10)', col, shade(col, 0.4), 2);
      X.rect(ctx, LIST.x, y, 3, LIST.rowH - 2, col);
    } else {
      X.rect(ctx, LIST.x, y, LIST.w, LIST.rowH - 2, i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.18)');
      X.rect(ctx, LIST.x, y + LIST.rowH - 3, LIST.w, 1, 'rgba(0,0,0,0.35)');
    }
    return y;
  }
  /* Your own mittens on the counter, as sprites. */
  function hands(ctx, t, holding) {
    const bob = Math.round(Math.sin(t * 1.4) * 1.5);
    const s = AH.S.mitten;
    const put = (x, flip) => blitScaled(ctx, s, 0, x, VH - 30 + bob, 1.1, flip);
    if (holding) { put(126, false); put(VW - 106, true); }
    else { put(58, false); put(VW - 58, true); }
  }
  function orePip(ctx, x, y, mat, size) { PD.art.oreChip(ctx, mat, x, y, size || 12); }
  function wrap(ctx, text, x, y, maxW, col, maxLines, scale) {
    scale = scale || 1;
    const words = text.toUpperCase().split(' ');
    let line = '', ly = y, n = 0;
    for (const w of words) {
      if (F.width(line + ' ' + w, scale) > maxW && line) {
        F.draw(ctx, line, x, ly, col, { shadow: false, scale }); line = w; ly += 8 * scale + 2; n++;
        if (n >= (maxLines || 2)) return;
      } else line = line ? line + ' ' + w : w;
    }
    if (line) F.draw(ctx, line, x, ly, col, { shadow: false, scale });
  }
  function blitScaled(ctx, s, frame, x, y, k, flip) {
    const cv = s.frames[frame % s.frames.length];
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(cv, Math.round(-s.ox * k), Math.round(-s.oy * k), Math.round(s.w * k), Math.round(s.h * k));
    ctx.restore();
  }
  function spriteFit(ctx, s, x, y, maxW, maxH) {
    const cv = s.frames[0];
    const k = Math.min(maxW / s.w, maxH / s.h, 1);
    ctx.drawImage(cv, Math.round(x - s.w * k / 2), Math.round(y - s.h * k), Math.round(s.w * k), Math.round(s.h * k));
  }

  /* A cyan, scanlined copy of any sprite frame: the hologram of a thing. */
  const holoCache = new Map();
  function holoOf(cv, tint) {
    const key = cv;
    let h = holoCache.get(key);
    if (h) return h;
    h = document.createElement('canvas');
    h.width = cv.width; h.height = cv.height;
    const c = h.getContext('2d');
    c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = tint || '#58e8ff';
    c.fillRect(0, 0, h.width, h.height);
    c.globalCompositeOperation = 'destination-out';
    for (let y = 0; y < h.height; y += 4) c.fillRect(0, y, h.width, 1);
    holoCache.set(key, h);
    return h;
  }

  /* --------------------------------------------------------------- scenes */
  function draw(ctx, g, t) {
    if (S.mode === 'phone') drawPhone(ctx, g, t);
    else if (S.mode === 'terminal') drawTerminal(ctx, g, t);
    else if (S.mode === 'fab') drawFab(ctx, g, t);
    else if (S.mode === 'docks') drawDocks(ctx, g, t);
    if (S.msgT > 0) {
      ctx.globalAlpha = Math.min(1, S.msgT);
      ctx.fillStyle = 'rgba(80,10,20,0.9)'; ctx.fillRect(VW / 2 - 90, VH / 2 - 12, 180, 24);
      F.draw(ctx, S.msg, VW / 2, VH / 2 - 4, '#ffffff', { center: true, shadow: false });
      ctx.globalAlpha = 1;
    }
    PD.touch.draw(ctx, 'ui');
  }

  /* The multi-tool: you hold it up in the corner, its emitter throws a cone of
     light, and the building you picked turns slowly in the air inside it. */
  function drawPhone(ctx, g, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#0b0722'); sky.addColorStop(1, '#241640');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
    for (let x = 0; x < VW; x += 2) {
      const gy = Math.round(196 + Math.sin((x + 40) * 0.02) * 6);
      X.rect(ctx, x, gy, 2, VH - gy, '#3a3450');
      X.rect(ctx, x, gy, 2, 2, '#6b6480');
    }
    for (let i = 0; i < 30; i++) X.rect(ctx, (i * 79) % VW, (i * 37) % 180, 1, 1, i % 4 ? '#ffffff' : '#ffe9a8');

    const items = D.BUILDINGS;
    const sel = items[S.sel] || items[0];
    const lvl = g.buildLevel(sel.id);
    const spr = AH.S[sel.id + (lvl <= 1 ? 0 : (lvl < 4 ? 1 : 2))];

    // the projector cone, emitter to hologram
    const ex = 172, ey = 190, hx = 254, hy = 110;
    ctx.save();
    ctx.globalAlpha = 0.10 + 0.03 * Math.sin(t * 6);
    ctx.fillStyle = '#58e8ff';
    ctx.beginPath();
    ctx.moveTo(ex, ey); ctx.lineTo(hx - 62, hy - 46); ctx.lineTo(hx + 62, hy - 46); ctx.lineTo(ex + 10, ey);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // the pad, and the building turning above it
    AH.blit(ctx, AH.S.holoPad, Math.floor(t * 6) % 3, hx, hy + 54);
    const cv = spr.frames[0];
    const k = Math.min(96 / spr.w, 92 / spr.h, 1.6);
    const w = Math.max(2, Math.round(spr.w * k * (Math.abs(Math.sin(t * 1.1)) * 0.55 + 0.45)));
    const h = Math.round(spr.h * k);
    const bob = Math.round(Math.sin(t * 1.6) * 3);
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(holoOf(cv), Math.round(hx - w / 2), Math.round(hy + 44 - h + bob), w, h);
    ctx.restore();
    X.orbit(ctx, hx, hy + 46, 46, 12, '#58e8ff', 3, 0.5);
    for (let i = 0; i < 10; i++) {
      const f = ((t * 0.4 + i / 10) % 1);
      X.rect(ctx, hx - 44 + ((i * 37) % 88), Math.round(hy + 48 - f * 96), 1, 2, i % 3 ? '#58e8ff' : '#ffffff');
    }
    F.draw(ctx, sel.name, hx, hy - 62, '#eafcff', { center: true, shadow: true, scale: 2 });
    for (let i = 0; i < sel.max; i++) X.rect(ctx, hx - sel.max * 4 + i * 8, hy - 44, 6, 4, i < lvl ? '#58e8ff' : '#123a44');
    const cost = D.buildCost(sel, lvl);
    F.draw(ctx, lvl <= 0 ? 'NOT BUILT YET' : 'LEVEL ' + lvl + ' / ' + sel.max, hx, hy - 36, '#58e8ff', { center: true, shadow: true });
    wrap(ctx, sel.blurb, hx - 96, hy + 64, 192, '#7ef9ff', 3);

    // the tool, gripped in both mittens, filling the lower left
    const wob = Math.round(Math.sin(t * 1.4) * 2);
    blitScaled(ctx, AH.S.toolBig, Math.sin(t * 4) > 0 ? 1 : 0, 12, VH + 18 + wob, 1.7);
    blitScaled(ctx, AH.S.mitten, 0, 40, VH - 52 + wob, 0.95, false);
    blitScaled(ctx, AH.S.mitten, 0, 138, VH - 34 + wob, 0.95, true);

    LIST.x = VW - 152; LIST.y = 42; LIST.w = 144; LIST.rowH = 26; LIST.rows = 5;
    items.forEach((b, i) => {
      const y = row(ctx, i, S.sel === i, '#58e8ff');
      const bl = g.buildLevel(b.id);
      const s2 = AH.S[b.id + (bl <= 1 ? 0 : (bl < 4 ? 1 : 2))];
      ctx.save();
      if (bl <= 0) ctx.globalAlpha = 0.4;
      spriteFit(ctx, s2, LIST.x + 18, y + LIST.rowH - 5, 28, 20);
      ctx.restore();
      F.draw(ctx, b.name, LIST.x + 36, y + 4, S.sel === i ? '#ffffff' : '#9fd8e8', { shadow: false });
      const c2 = D.buildCost(b, bl);
      F.draw(ctx, bl <= 0 ? 'PRINT $' + U.fmt(c2) : (bl >= b.max ? 'MAX' : 'LV' + bl + ' $' + U.fmt(c2)),
        LIST.x + 36, y + 14, bl >= b.max ? '#8affa0' : (g.save.credits >= c2 ? '#ffd34d' : '#ff6b8a'), { shadow: false });
    });
    BTN.x = VW - 152; BTN.y = VH - 44; BTN.w = 144; BTN.h = 28;
    button(ctx, BTN, lvl <= 0 ? 'PRINT' : (lvl >= sel.max ? 'MAX' : 'UPGRADE'), lvl < sel.max && g.save.credits >= cost, t, '#58e8ff');
    header(ctx, 'MULTI-TOOL', '$' + U.fmt(g.save.credits), '#58e8ff');
  }

  /* The buyers, as pixel busts: mouth shut, mouth open, blinking. */
  const BUST = { 'ZAZ': 'zaz', 'BROKER K': 'broker', 'THE SYNDICATE': 'synd', 'MUM': 'mum' };
  function face(ctx, x, y, name, t, k) {
    const s = AH.S['bust_' + (BUST[name] || 'zaz')];
    const frame = S.blink < 0 ? 2 : (S.talk > 0 && Math.sin(t * 12) > 0 ? 1 : 0);
    blitScaled(ctx, s, frame, x, y + Math.round(Math.sin(t * 2) * 1.5), k || 2.2);
  }

  function drawTerminal(ctx, g, t) {
    ctx.fillStyle = '#0a1a16'; ctx.fillRect(0, 0, VW, VH);
    // kiosk interior: warm wall panels
    ctx.fillStyle = '#12302a'; ctx.fillRect(0, 30, VW, VH - 30);
    for (let x = 0; x < VW; x += 40) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x, 30, 1, VH); }
    // the video window
    const vx = 18, vy = 42, vw = 190, vh = 120;
    panel(ctx, vx, vy, vw, vh, '#39ffa6', '#04140f');
    const last = S.feed[S.feed.length - 1] || CHATTER[0];
    ctx.save(); ctx.beginPath(); ctx.rect(vx + 2, vy + 2, vw - 4, vh - 4); ctx.clip();
    for (let i = 0; i < 8; i++) X.rect(ctx, vx, vy + i * (vh / 8), vw, vh / 8 + 1, ['#1e4260', '#1b3c58', '#183650', '#153048', '#122a40', '#102438', '#0d1e30', '#0a1828'][i]);
    face(ctx, vx + vw / 2, vy + vh + 4, last[0], t, 2.3);
    X.scanlines(ctx, vx, vy, vw, vh, 'rgba(57,255,166,0.07)', t * 30, 3);
    ctx.restore();
    X.rect(ctx, vx + 7, vy + 7, 6, 6, Math.sin(t * 6) > 0 ? '#ff5a4d' : '#8a2a2a');
    F.draw(ctx, 'LIVE  -  ' + last[0], vx + 18, vy + 6, '#39ffa6', { shadow: false });
    // speech
    panel(ctx, vx, vy + vh + 6, vw, 52, '#1e9e68', 'rgba(4,20,15,0.9)');
    wrap(ctx, last[1], vx + 8, vy + vh + 14, vw - 16, '#eafcff', 3);
    // the book
    const bx = 224, by = 42, bw = VW - 224 - 12;
    panel(ctx, bx, by, bw, 180, '#39ffa6');
    F.draw(ctx, 'THE BOOK', bx + 8, by + 6, '#39ffa6', { shadow: false });
    F.draw(ctx, 'QTY', bx + 130, by + 6, '#1e9e68', { shadow: false });
    F.draw(ctx, 'EACH', bx + 162, by + 6, '#1e9e68', { shadow: false });
    F.draw(ctx, 'TREND', bx + bw - 8, by + 6, '#1e9e68', { right: true, shadow: false });
    const keys = Object.keys(g.save.vault).filter(k => g.save.vault[k] > 0).sort((a, c) => D.MAT[c].cr - D.MAT[a].cr);
    if (!keys.length) F.draw(ctx, 'EMPTY. GO DIG SOMETHING UP.', bx + 8, by + 40, '#1e9e68', { shadow: false });
    keys.slice(0, 8).forEach((k, i) => {
      const y = by + 20 + i * 16;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0)'; ctx.fillRect(bx + 4, y - 2, bw - 8, 15);
      orePip(ctx, bx + 5, y - 3, +k, 15);
      F.draw(ctx, D.MAT[k].name.toUpperCase().slice(0, 13), bx + 24, y + 2, '#eafcff', { shadow: false });
      F.draw(ctx, String(g.save.vault[k]), bx + 130, y + 2, '#ffd34d', { shadow: false });
      F.draw(ctx, U.fmt(g.priceOf(+k)), bx + 162, y + 2, '#eafcff', { shadow: false });
      const pct = Math.round((g.demandFor(+k) - 1) * 100);
      F.draw(ctx, (pct >= 0 ? '+' : '') + pct + '%', bx + bw - 8, y + 2, pct >= 0 ? '#8affa0' : '#ff6b8a', { right: true, shadow: false });
    });
    const total = g.vaultValue();
    F.draw(ctx, 'TOTAL', bx + 8, by + 158, '#1e9e68', { shadow: false });
    F.draw(ctx, '$' + U.fmt(total), bx + bw - 8, by + 154, '#ffd34d', { right: true, shadow: false, scale: 2 });
    BTN.x = bx; BTN.y = VH - 40; BTN.w = bw; BTN.h = 26;
    button(ctx, BTN, 'SELL ALL', total > 0, t);
    header(ctx, 'TERMINAL', 'LV ' + g.buildLevel('terminal') + '   +' + Math.round((D.UPG.crew.value(g.save.upg.crew || 0) - 1) * 100) + '% PRICES', '#39ffa6');
    hands(ctx, t, false);
  }

  /* The fabricator bench: recipes left, the printer bed right. */
  function drawFab(ctx, g, t) {
    ctx.fillStyle = '#1a1210'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#2c1f18'; ctx.fillRect(0, 30, VW, VH - 30);
    for (let y = 40; y < VH; y += 26) { ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, y, VW, 2); }
    // bench top
    ctx.fillStyle = '#6b4a3a'; ctx.fillRect(0, VH - 60, VW, 60); ctx.fillStyle = '#8a5a3a'; ctx.fillRect(0, VH - 60, VW, 4);
    const items = list(g);
    LIST.x = 14; LIST.y = 44; LIST.w = 250; LIST.rowH = 30; LIST.rows = 6;
    panel(ctx, LIST.x - 4, LIST.y - 8, LIST.w + 8, LIST.rowH * 6 + 12, '#ffb03d');
    items.forEach((r, i) => {
      if (i >= 6) return;
      const y = row(ctx, i, S.sel === i, '#ffb03d');
      G.draw(ctx, r.glyph, LIST.x + 8, y + 3, '#ffffff', '#c07a20', 2);
      F.draw(ctx, r.name, LIST.x + 36, y + 4, '#fff3d0', { shadow: false });
      let mx = LIST.x + 36;
      for (const key in r.mats) {
        const mat = D.M[key], have = g.save.vault[mat] || 0, need = r.mats[key];
        orePip(ctx, mx, y + 11, mat, 14);
        F.draw(ctx, have + '/' + need, mx + 16, y + 17, have >= need ? '#8affa0' : '#ff6b8a', { shadow: false });
        mx += 44;
      }
      F.draw(ctx, 'x' + (g.save.parts[r.id] || 0), LIST.x + LIST.w - 8, y + 10, '#ffd34d', { right: true, shadow: false });
    });
    if (g.buildLevel('fab') < 4) F.draw(ctx, 'MORE RECIPES AT FABRICATOR LV ' + (g.buildLevel('fab') + 1), LIST.x, LIST.y + LIST.rowH * 6 + 8, '#8a5a3a', { shadow: false });
    // the printer bed
    const px = 284, py = 44, pw = 182, ph = 130;
    panel(ctx, px, py, pw, ph, '#ffb03d', '#0f0a08');
    ctx.fillStyle = '#39405e'; ctx.fillRect(px + 12, py + ph - 22, pw - 24, 8);
    ctx.fillStyle = '#9aa3c4'; ctx.fillRect(px + 10, py + 10, 4, ph - 32); ctx.fillRect(px + pw - 14, py + 10, 4, ph - 32); ctx.fillRect(px + 10, py + 10, pw - 20, 4);
    const sel = items[S.sel];
    if (sel) {
      const cx = px + pw / 2, cy = py + ph - 26;
      const printing = S.printT > 0 && S.printId === sel.id;
      const k = printing ? 1 - S.printT / 1.4 : 1;
      // the part, big
      ctx.save();
      ctx.beginPath(); ctx.rect(px, cy - 60 * k, pw, 60 * k + 2); ctx.clip();
      G.draw(ctx, sel.glyph, cx - 30, cy - 62, printing ? '#ffffff' : '#eafcff', '#c07a20', 5);
      ctx.restore();
      if (printing) {
        const headX = px + 20 + ((S.t * 260) % (pw - 44));
        ctx.fillStyle = '#ffb03d'; ctx.fillRect(headX, py + 14, 12, 10); ctx.fillStyle = '#58e8ff'; ctx.fillRect(headX + 4, py + 24, 4, cy - 60 * k - py - 24);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(px + 16, cy - 60 * k, pw - 32, 2);
        F.draw(ctx, Math.round(k * 100) + '%', cx, py + ph - 12, '#ffffff', { center: true, shadow: false });
      } else {
        F.draw(ctx, sel.name, cx, py + 20, '#fff3d0', { center: true, shadow: false });
        wrap(ctx, sel.blurb, px + 10, py + ph - 14, pw - 20, '#ffb03d', 1);
      }
    }
    BTN.x = px; BTN.y = VH - 44; BTN.w = pw; BTN.h = 26;
    let can = false;
    if (sel) { can = true; for (const key in sel.mats) if ((g.save.vault[D.M[key]] || 0) < sel.mats[key]) can = false; }
    button(ctx, BTN, 'CRAFT', can, t, '#ffb03d');
    header(ctx, 'FABRICATOR', 'LV ' + g.buildLevel('fab') + '   TIER ' + g.buildLevel('fab') + ' RECIPES', '#ffb03d');
    hands(ctx, t, false);
  }

  /* The docks: your pod on the lift, its slots, its numbers. */
  function drawDocks(ctx, g, t) {
    ctx.fillStyle = '#0c1020'; ctx.fillRect(0, 0, VW, VH);
    // hangar: ribs and a lit floor
    for (let x = 0; x < VW; x += 60) { ctx.fillStyle = '#161d38'; ctx.fillRect(x, 30, 8, VH); }
    ctx.fillStyle = '#1c2446'; ctx.fillRect(0, VH - 70, VW, 70);
    ctx.fillStyle = '#2b3a66'; ctx.fillRect(0, VH - 70, VW, 3);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#ffb03d' : '#39405e'; ctx.fillRect(40 + i * 52, VH - 66, 26, 3); }
    // the pod, big, on the lift
    const pod = PD.art.skinFor(g.save.cos).pod;
    const cx = 300, cy = VH - 74 + Math.sin(t * 1.4) * 2;
    ctx.fillStyle = '#39405e'; ctx.fillRect(cx - 60, VH - 70, 120, 6); ctx.fillRect(cx - 8, VH - 64, 16, 20);
    ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.scale(2, 2);
    ctx.drawImage(pod.frames[Math.floor(t * 3) % 2], -pod.ox | 0, (-pod.oy + 2) | 0, pod.w, pod.h);
    ctx.restore();
    // slots as hexes hung off the hull
    const slots = g.slots();
    const inst = [];
    for (const id in g.save.installed) for (let k = 0; k < g.save.installed[id]; k++) inst.push(id);
    for (let i = 0; i < slots; i++) {
      const a = Math.PI * 1.15 + i * (Math.PI * 0.7 / Math.max(1, slots - 1));
      const sx = cx + Math.cos(a) * 92, sy = cy - 44 + Math.sin(a) * 40;
      X.line(ctx, sx, sy, cx + Math.cos(a) * 40, cy - 40 + Math.sin(a) * 20, inst[i] ? '#58e8ff' : '#2b3a66', 1);
      const flash = S.fitT > 0 && inst[i] === S.fitId && i === inst.lastIndexOf(S.fitId);
      X.plate(ctx, sx - 12, sy - 12, 24, 24, inst[i] ? (flash ? '#ffffff' : '#123a44') : '#0c1020', inst[i] ? '#58e8ff' : '#2b3a66', '#06101c', 4);
      if (inst[i]) G.draw(ctx, D.RECIPE[inst[i]].glyph, sx - 6, sy - 6, '#eafcff', 'rgba(0,0,0,0)');
      else F.draw(ctx, String(i + 1), sx, sy - 3, '#2b3a66', { center: true, shadow: false });
    }
    // stats
    const p = g.player;
    const stats = [['AIR', Math.round(p.stat('oxygen')), '#58e8ff'], ['HULL', Math.round(p.stat('hull')), '#ff5a4d'], ['HOLD', Math.round(p.capacity()) + 'KG', '#ffb03d'],
      ['DRILL', Math.round(p.stat('drill')), '#ffd34d'], ['WIRE', Math.round((p.stat('tether') - 70) / 10) + 'M', '#8affa0']];
    panel(ctx, 14, 40, 120, 96, '#58e8ff');
    F.draw(ctx, 'THE POD', 22, 46, '#58e8ff', { shadow: false });
    stats.forEach((s, i) => { F.draw(ctx, s[0], 22, 60 + i * 14, '#9aa3c4', { shadow: false }); F.draw(ctx, String(s[1]), 126, 60 + i * 14, s[2], { right: true, shadow: false }); });
    // parts in store
    const items = list(g);
    LIST.x = 14; LIST.y = 150; LIST.w = 150; LIST.rowH = 18; LIST.rows = 4;
    panel(ctx, LIST.x - 4, LIST.y - 16, LIST.w + 8, LIST.rowH * 4 + 22, '#58e8ff');
    F.draw(ctx, 'PARTS IN STORE', LIST.x + 4, LIST.y - 10, '#58e8ff', { shadow: false });
    if (!items.length) F.draw(ctx, 'NONE. THE FABRICATOR MAKES THEM.', LIST.x + 4, LIST.y + 6, '#2b3a66', { shadow: false });
    items.slice(0, 4).forEach((r, i) => {
      const y = row(ctx, i, S.sel === i, '#58e8ff');
      G.draw(ctx, r.glyph, LIST.x + 6, y + 2, '#eafcff', '#2b3a66');
      F.draw(ctx, r.name + ' x' + (g.save.parts[r.id] || 0), LIST.x + 22, y + 4, '#eafcff', { shadow: false });
    });
    const sel = items[S.sel];
    if (sel) wrap(ctx, sel.blurb, 180, 46, 120, '#58e8ff', 2);
    BTN.x = 14; BTN.y = VH - 40; BTN.w = 160; BTN.h = 26;
    button(ctx, BTN, 'FIT PART', !!sel && g.installedCount() < slots, t, '#58e8ff');
    header(ctx, 'THE DOCKS', 'LV ' + g.buildLevel('docks') + '   SLOTS ' + g.installedCount() + '/' + slots, '#58e8ff');
    hands(ctx, t, false);
  }

  PD.scenes = { enter, close, update, draw, S };
})(window.PD);
