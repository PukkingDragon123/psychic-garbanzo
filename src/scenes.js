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
    ctx.fillStyle = fill || 'rgba(6,10,26,0.82)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 10, 2); ctx.fillRect(x, y, 2, 10); ctx.fillRect(x + w - 10, y + h - 2, 10, 2); ctx.fillRect(x + w - 2, y + h - 10, 2, 10);
  }
  function button(ctx, r, label, on, t, col) {
    col = col || '#39ffa6';
    ctx.fillStyle = on ? (Math.sin(t * 5) > 0 ? col : shade(col)) : '#141a30';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = on ? '#ffffff' : '#2a3350'; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    F.draw(ctx, label, r.x + r.w / 2, r.y + r.h / 2 - 7, on ? '#05170e' : '#3a4a6a', { center: true, shadow: false, scale: 2 });
  }
  function shade(hex) { const n = parseInt(hex.slice(1), 16); return 'rgb(' + (((n >> 16) & 255) * 0.8 | 0) + ',' + (((n >> 8) & 255) * 0.8 | 0) + ',' + ((n & 255) * 0.8 | 0) + ')'; }
  function header(ctx, title, sub, col) {
    ctx.fillStyle = 'rgba(4,6,18,0.9)'; ctx.fillRect(0, 0, VW, 30);
    ctx.fillStyle = col; ctx.fillRect(0, 30, VW, 1);
    F.draw(ctx, title, 12, 8, '#ffffff', { shadow: false, scale: 2 });
    if (sub) F.draw(ctx, sub, 12 + F.width(title, 2) + 14, 14, col, { shadow: false });
    ctx.fillStyle = '#1a2240'; ctx.fillRect(BACK.x, BACK.y, BACK.w, BACK.h);
    ctx.strokeStyle = col; ctx.strokeRect(BACK.x + 0.5, BACK.y + 0.5, BACK.w - 1, BACK.h - 1);
    F.draw(ctx, 'BACK', BACK.x + BACK.w / 2, BACK.y + 6, '#ffffff', { center: true, shadow: false });
  }
  function row(ctx, i, sel, col) {
    const y = LIST.y + i * LIST.rowH;
    ctx.fillStyle = sel ? 'rgba(255,255,255,0.10)' : (i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.15)');
    ctx.fillRect(LIST.x, y, LIST.w, LIST.rowH - 2);
    if (sel) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(LIST.x + 0.5, y + 0.5, LIST.w - 1, LIST.rowH - 3); ctx.fillStyle = col; ctx.fillRect(LIST.x, y, 3, LIST.rowH - 2); }
    return y;
  }
  /* Your own green mittens, on the counter. */
  function hands(ctx, t, holding) {
    const P = PD.art.skinFor(PD.game.save.cos).P;
    const bob = Math.sin(t * 1.4) * 1.5;
    const draw = (x, flip) => {
      ctx.save(); ctx.translate(x, VH + 18 + bob); if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = '#2b3a66'; ctx.beginPath(); ctx.ellipse(0, 22, 34, 30, 0, 0, Math.PI * 2); ctx.fill();   // sleeve
      ctx.fillStyle = '#f6f3ff'; ctx.fillRect(-26, -4, 52, 6);                                                // cuff
      ctx.fillStyle = P.skin; ctx.beginPath(); ctx.ellipse(0, -12, 24, 18, 0, 0, Math.PI * 2); ctx.fill();   // mitten
      ctx.fillStyle = P.skinD; ctx.beginPath(); ctx.ellipse(-16, -16, 8, 10, -0.4, 0, Math.PI * 2); ctx.fill(); // thumb
      ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -12, 24, 18, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(-18, -2, 2.5, 0, Math.PI * 2); ctx.fill();           // cufflink
      ctx.restore();
    };
    if (holding) { draw(150, false); draw(330, true); }
    else { draw(40, false); draw(VW - 40, true); }
  }
  function orePip(ctx, x, y, mat) {
    const m = D.MAT[mat];
    ctx.fillStyle = m.c[1]; ctx.fillRect(x, y, 10, 10); ctx.fillStyle = m.c[0]; ctx.fillRect(x, y, 10, 3);
    ctx.fillStyle = '#0a0616'; ctx.fillRect(x, y + 9, 10, 1);
  }
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
  function spriteFit(ctx, s, x, y, maxW, maxH) {
    const cv = s.frames[0];
    const k = Math.min(maxW / s.w, maxH / s.h, 1);
    ctx.drawImage(cv, x - s.w * k / 2, y - s.h * k, s.w * k, s.h * k);
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

  /* The multi-tool, held up in front of you. */
  function drawPhone(ctx, g, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#0d0826'); sky.addColorStop(1, '#2a1846');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
    // moon horizon blurred behind the device
    ctx.fillStyle = '#3a3450'; ctx.beginPath(); ctx.moveTo(0, 200); for (let x = 0; x <= VW; x += 8) ctx.lineTo(x, 200 + Math.sin(x * 0.02) * 8); ctx.lineTo(VW, VH); ctx.lineTo(0, VH); ctx.fill();
    // the device
    const px = 100, py = 14, pw = 280, ph = 250;
    ctx.fillStyle = '#1b2547'; roundRect(ctx, px - 4, py - 4, pw + 8, ph + 8, 14); ctx.fill();
    ctx.fillStyle = '#2b3a66'; roundRect(ctx, px, py, pw, ph, 12); ctx.fill();
    ctx.fillStyle = '#9aa3c4'; ctx.fillRect(px + pw / 2 - 16, py + 5, 32, 3);
    ctx.fillStyle = '#062a33'; roundRect(ctx, px + 10, py + 14, pw - 20, ph - 30, 6); ctx.fill();
    // scanlines
    ctx.fillStyle = 'rgba(88,232,255,0.05)';
    for (let y = py + 14 + (Math.floor(t * 30) % 4); y < py + ph - 16; y += 4) ctx.fillRect(px + 10, y, pw - 20, 1);
    F.draw(ctx, 'MULTI-TOOL', px + 20, py + 22, '#eafcff', { shadow: false, scale: 2 });
    F.draw(ctx, '$' + U.fmt(g.save.credits), px + pw - 20, py + 26, '#ffd34d', { right: true, shadow: false });
    F.draw(ctx, 'TAP A BUILDING. TAP AGAIN TO PRINT OR UPGRADE.', px + 20, py + 40, '#2f8fae', { shadow: false });
    // building cards
    const items = D.BUILDINGS;
    const cardY = py + 52, cardH = 26;
    LIST.x = px + 16; LIST.y = cardY; LIST.w = pw - 32; LIST.rowH = cardH; LIST.rows = 5;
    items.forEach((b, i) => {
      const y = row(ctx, i, S.sel === i, '#58e8ff');
      const lvl = g.buildLevel(b.id);
      const s = AH.S[b.id + (lvl <= 1 ? 0 : (lvl < 4 ? 1 : 2))];
      ctx.save();
      if (lvl <= 0) ctx.globalAlpha = 0.45;
      spriteFit(ctx, s, LIST.x + 22, y + cardH - 4, 34, 24);
      ctx.restore();
      F.draw(ctx, b.name, LIST.x + 46, y + 5, '#eafcff', { shadow: false });
      for (let k = 0; k < b.max; k++) { ctx.fillStyle = k < lvl ? '#58e8ff' : '#123a44'; ctx.fillRect(LIST.x + 46 + k * 7, y + 16, 5, 3); }
      const cost = D.buildCost(b, lvl);
      const txt = lvl <= 0 ? 'PRINT $' + U.fmt(cost) : (lvl >= b.max ? 'MAX' : 'UP $' + U.fmt(cost));
      F.draw(ctx, txt, LIST.x + LIST.w - 8, y + 10, lvl >= b.max ? '#8affa0' : (g.save.credits >= cost ? '#ffd34d' : '#ff6b8a'), { right: true, shadow: false });
    });
    const sb = items[S.sel];
    if (sb) wrap(ctx, sb.blurb, px + 20, py + ph - 56, pw - 40, '#58e8ff', 2);
    const lvl = g.buildLevel(sb.id);
    const cost = D.buildCost(sb, lvl);
    BTN.x = px + 20; BTN.y = py + ph - 34; BTN.w = pw - 40; BTN.h = 20;
    button(ctx, BTN, lvl <= 0 ? 'PRINT  $' + U.fmt(cost) : (lvl >= sb.max ? 'FULL SIZE' : 'UPGRADE  $' + U.fmt(cost)), lvl < sb.max && g.save.credits >= cost, t, '#58e8ff');
    header(ctx, '', '', '#58e8ff');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    hands(ctx, t, true);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  /* The terminal: a video desk. The buyer on the left, the book on the right. */
  function face(ctx, x, y, name, t) {
    const col = FACES[name] || ['#c4a0ff', '#8455c4'];
    const talking = S.talk > 0;
    const mouth = talking ? Math.abs(Math.sin(t * 16)) * 5 + 1 : 1;
    const blink = S.blink < 0;
    // shoulders, head
    ctx.fillStyle = col[1]; ctx.beginPath(); ctx.ellipse(x, y + 58, 40, 22, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col[0]; ctx.beginPath(); ctx.ellipse(x, y + 10 + Math.sin(t * 2) * 1.5, 30, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 2; ctx.stroke();
    if (name === 'ZAZ') { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 12, y + 6, 8, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#151233';
    if (blink) { ctx.fillRect(x - 18, y + 4, 12, 2); ctx.fillRect(x + 6, y + 4, 12, 2); }
    else { ctx.beginPath(); ctx.ellipse(x - 12, y + 4, 5, 7, 0, 0, Math.PI * 2); ctx.ellipse(x + 12, y + 4, 5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x - 14, y, 3, 3); ctx.fillRect(x + 10, y, 3, 3); }
    ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.ellipse(x, y + 24, 9, mouth, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8ab0'; ctx.beginPath(); ctx.ellipse(x - 22, y + 16, 5, 3, 0, 0, Math.PI * 2); ctx.ellipse(x + 22, y + 16, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    if (name === 'THE SYNDICATE') { ctx.fillStyle = '#151233'; ctx.fillRect(x - 32, y - 2, 64, 10); }   // shades
    if (name === 'MUM') { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(x - 24, y - 22, 6, 0, Math.PI * 2); ctx.arc(x + 24, y - 22, 6, 0, Math.PI * 2); ctx.fill(); }
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
    const bg = ctx.createLinearGradient(0, vy, 0, vy + vh); bg.addColorStop(0, '#1a3a52'); bg.addColorStop(1, '#0a1a2a');
    ctx.fillStyle = bg; ctx.fillRect(vx, vy, vw, vh);
    face(ctx, vx + vw / 2, vy + 40, last[0], t);
    ctx.fillStyle = 'rgba(57,255,166,0.06)'; for (let y = vy + (Math.floor(t * 30) % 3); y < vy + vh; y += 3) ctx.fillRect(vx, y, vw, 1);
    ctx.restore();
    ctx.fillStyle = '#ff5a4d'; ctx.beginPath(); ctx.arc(vx + 10, vy + 10, 3 + Math.sin(t * 6), 0, Math.PI * 2); ctx.fill();
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
      orePip(ctx, bx + 8, y, +k);
      F.draw(ctx, D.MAT[k].name.toUpperCase().slice(0, 14), bx + 22, y + 2, '#eafcff', { shadow: false });
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
        orePip(ctx, mx, y + 15, mat);
        F.draw(ctx, have + '/' + need, mx + 12, y + 17, have >= need ? '#8affa0' : '#ff6b8a', { shadow: false });
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
    ctx.save(); ctx.translate(cx, cy); ctx.scale(2.4, 2.4);
    ctx.drawImage(pod.frames[Math.floor(t * 3) % 2], -pod.ox, -pod.oy + 2, pod.w, pod.h);
    ctx.restore();
    // slots as hexes hung off the hull
    const slots = g.slots();
    const inst = [];
    for (const id in g.save.installed) for (let k = 0; k < g.save.installed[id]; k++) inst.push(id);
    for (let i = 0; i < slots; i++) {
      const a = Math.PI * 1.15 + i * (Math.PI * 0.7 / Math.max(1, slots - 1));
      const sx = cx + Math.cos(a) * 92, sy = cy - 44 + Math.sin(a) * 40;
      ctx.strokeStyle = inst[i] ? '#58e8ff' : '#2b3a66'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx + Math.cos(a) * 40, cy - 40 + Math.sin(a) * 20); ctx.stroke();
      const flash = S.fitT > 0 && inst[i] === S.fitId && i === inst.lastIndexOf(S.fitId);
      G.hex(ctx, sx, sy, 12, inst[i] ? (flash ? '#ffffff' : '#123a44') : '#0c1020', inst[i] ? '#58e8ff' : '#2b3a66', 1);
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
