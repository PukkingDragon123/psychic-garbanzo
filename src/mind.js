/* THE MIND. A brain in a tank of acid, and the skill tree is its wiring:
   neurons in rings around the stem, dendrites between them, a pulse of light
   that runs down the wire when you buy one. Opened from the building on the
   moon; ESC closes it. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const D = PD.data;
  const A = PD.audio;
  const G = PD.glyph;
  const X = PD.pxd;
  const VW = 480, VH = 270;

  const CX = 176, CY = 138;                // brain centre on screen
  const RING = [0, 40, 76, 108];           // ring radii
  const S = { t: 0, sel: null, pulses: [], flash: 0, bubbles: [] };
  /* upgrade icons that have no glyph of their own borrow a neighbour's */
  const ICON = { reach: 'drill', oxygen: 'o2', thruster: 'speed', trigger: 'gun', lamp: 'eye', magnet: 'weight', scanner: 'scan',
    lung: 'o2', belly: 'cargo', ironskin: 'hull', greed: 'coin', kiln: 'machine', refine: 'machine', tether: 'belt', droneyield: 'drone' };
  function iconOf(id) { const u = D.UPG[id]; const g = ICON[id] || u.icon; return G.names.indexOf(g) >= 0 ? g : 'hex'; }

  for (let i = 0; i < 40; i++) S.bubbles.push({ x: U.hash2(i, 3), y: U.hash2(i, 7), r: 0.6 + U.hash2(i, 11) * 1.6, sp: 6 + U.hash2(i, 13) * 14 });

  function pos(n) {
    const a = (n.a - 90) * Math.PI / 180;
    return { x: CX + Math.cos(a) * RING[n.ring], y: CY + Math.sin(a) * RING[n.ring] * 0.86 };
  }
  function level(g, id) { return g.save.neur[id] || 0; }
  function ringOpen(g, n) { return n.ring <= Math.max(0, g.buildLevel('mind') - 1) + 1; }
  function wired(g, n) {
    if (n.ring === 0) return true;
    return n.links.some(l => level(g, l) > 0);
  }
  function cost(id, lvl) { return D.upgradeCost(D.UPG[id], lvl); }

  function open(g) {
    g.state = 'mind';
    S.t = 0; S.sel = 'drill'; S.pulses.length = 0;
    A.sfx.tone(160, { type: 'sine', to: 420, dur: 0.5, vol: 0.1 });
    A.sfx.tone(420, { type: 'triangle', to: 880, dur: 0.4, vol: 0.06, delay: 0.3 });
  }
  function close(g) {
    g.state = 'home';
    PD.home.P.lock = 0.25;
    A.sfx.click();
  }

  function buy(g, n) {
    const id = n.id, u = D.UPG[id], lvl = level(g, id);
    if (!ringOpen(g, n)) { A.sfx.deny(); S.flash = 0.3; return; }
    if (!wired(g, n)) { A.sfx.deny(); S.flash = 0.3; return; }
    if (lvl >= u.max) { A.sfx.deny(); return; }
    const c = cost(id, lvl);
    if (g.save.credits < c) { A.sfx.deny(); S.flash = 0.3; return; }
    g.save.credits -= c;
    g.save.neur[id] = lvl + 1;
    g.recompute();
    g.saveGame();
    // the pulse runs from the stem out to the neuron along its wire
    const from = n.links.length ? D.NEURON[n.links.find(l => level(g, l) > 0) || n.links[0]] : null;
    S.pulses.push({ from: from ? pos(from) : { x: CX, y: CY + 60 }, to: pos(n), t: 0, id });
    A.sfx.tone(220, { type: 'sine', to: 1200, dur: 0.35, vol: 0.12 });
    A.sfx.tone(1200, { type: 'triangle', to: 1800, dur: 0.25, vol: 0.08, delay: 0.25 });
    PD.fx.flash(0.25, '#8affa0');
  }

  function update(dt, g) {
    S.t += dt;
    S.flash = Math.max(0, S.flash - dt);
    for (let i = S.pulses.length - 1; i >= 0; i--) { S.pulses[i].t += dt * 1.8; if (S.pulses[i].t > 1.6) S.pulses.splice(i, 1); }
    const IN = PD.input;
    if (IN.hit('esc')) { close(g); return; }
    const m = IN.mouse;
    let hover = null;
    for (const n of D.NEURONS) {
      const p = pos(n);
      if (m.inside && U.dist(m.x, m.y, p.x, p.y) < 12) hover = n;
    }
    if (hover && m.leftPressed) {
      if (S.sel === hover.id) buy(g, hover);
      else { S.sel = hover.id; A.sfx.click(); }
    }
    if ((IN.hit('KeyE') || IN.hit('space')) && S.sel) buy(g, D.NEURON[S.sel]);
    // the panel's own build key
    if (m.leftPressed && m.x >= 336 && m.x <= 466 && m.y >= VH - 44 && m.y <= VH - 20 && S.sel) buy(g, D.NEURON[S.sel]);
    if (m.leftPressed && m.x > VW - 60 && m.y < 18) close(g);
  }

  /* ------------------------------------------------------------------ draw */
  function draw(ctx, g, t) {
    // the tank: acid, glass, bubbles
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, '#04150f'); grd.addColorStop(1, '#0a2a1c');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#123f2a';
    ctx.fillRect(0, 26 + Math.sin(t * 1.3) * 2, 330, VH);
    ctx.fillStyle = '#1e9e5c'; ctx.globalAlpha = 0.35; ctx.fillRect(0, 26 + Math.sin(t * 1.3) * 2, 330, 3); ctx.globalAlpha = 1;
    for (const b of S.bubbles) {
      const y = VH - ((b.y * VH + t * b.sp) % (VH - 30));
      const x = b.x * 320 + Math.sin(t * 2 + b.y * 10) * 3;
      X.rect(ctx, x, y, b.r > 1.4 ? 2 : 1, b.r > 1.4 ? 2 : 1, 'rgba(200,255,224,0.55)');
    }
    // the brain, breathing
    const br = PD.arthome.S.brain;
    const pulse = 1 + Math.sin(t * 1.6) * 0.012;
    ctx.save();
    ctx.translate(CX, CY - 6);
    ctx.scale(pulse, pulse);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(br.frames[0], -br.ox, -br.oy, br.w, br.h);
    ctx.restore();
    ctx.globalAlpha = 1;
    // glass wall and rim
    ctx.fillStyle = 'rgba(159,224,255,0.08)'; ctx.fillRect(0, 0, 330, VH);
    ctx.fillStyle = 'rgba(234,252,255,0.25)'; ctx.fillRect(6, 30, 3, VH - 60);
    ctx.fillStyle = '#5e6688'; ctx.fillRect(0, 0, 330, 12); ctx.fillRect(0, VH - 10, 330, 10); ctx.fillRect(328, 0, 4, VH);
    ctx.fillStyle = '#9aa3c4'; ctx.fillRect(0, 12, 330, 1);

    // dendrites
    const mindLvl = g.buildLevel('mind');
    for (const n of D.NEURONS) {
      const p = pos(n);
      for (const l of n.links) {
        const q = pos(D.NEURON[l]);
        const lit = level(g, n.id) > 0 && level(g, l) > 0;
        const half = level(g, l) > 0;
        const mx = (p.x + q.x) / 2 + Math.sin(t * 2 + n.a) * 3, my = (p.y + q.y) / 2 + Math.cos(t * 1.7 + n.a) * 3;
        X.curve(ctx, q.x, q.y, mx, my, p.x, p.y, lit ? '#8affa0' : (half ? '#3fb85a' : '#1e4a34'), lit ? 2 : 1, 10);
        if (lit) {
          // signal beads travelling along a live wire
          const f = (t * 0.6 + n.a / 360) % 1;
          const bx = (1 - f) * (1 - f) * q.x + 2 * (1 - f) * f * mx + f * f * p.x;
          const by = (1 - f) * (1 - f) * q.y + 2 * (1 - f) * f * my + f * f * p.y;
          X.rect(ctx, bx - 1, by - 1, 2, 2, '#e8fff2');
        }
      }
    }
    // neurons
    let hover = null;
    const m = PD.input.mouse;
    for (const n of D.NEURONS) {
      const p = pos(n);
      const u = D.UPG[n.id];
      const lvl = level(g, n.id);
      const open = ringOpen(g, n) && wired(g, n);
      const sel = S.sel === n.id;
      const isHover = m.inside && U.dist(m.x, m.y, p.x, p.y) < 12;
      if (isHover) hover = n;
      const r = 7 + (lvl > 0 ? 2 : 0) + (sel ? Math.sin(t * 6) * 1 : 0);
      // soma: an octagon of pixels, never a circle
      X.oct(ctx, p.x, p.y, r, lvl > 0 ? '#8affa0' : (open ? '#2f7a56' : '#163826'),
        sel ? '#ffffff' : (isHover ? '#c8ffe0' : (open ? '#63c48a' : '#1e4a34')), sel ? 2 : 1);
      if (lvl > 0) X.rect(ctx, p.x - 4, p.y - 4, 3, 3, '#e8fff2');
      G.draw(ctx, iconOf(n.id), p.x - 6, p.y - 6, lvl > 0 ? '#06210f' : (open ? '#e8fff2' : '#2f5a44'), 'rgba(0,0,0,0)');
      if (lvl > 0) F.draw(ctx, String(lvl), p.x + 7, p.y + 3, '#ffffff', { shadow: true });
      if (!ringOpen(g, n)) G.draw(ctx, 'lock', p.x - 3, p.y + 4, '#5a4d80', 'rgba(0,0,0,0)');
    }
    // pulses
    for (const pu of S.pulses) {
      const f = U.clamp(pu.t, 0, 1);
      const x = pu.from.x + (pu.to.x - pu.from.x) * f, y = pu.from.y + (pu.to.y - pu.from.y) * f;
      ctx.globalAlpha = 1 - Math.max(0, pu.t - 1) / 0.6;
      if (pu.t > 1) X.ring(ctx, x, y, 3 + (pu.t - 1) * 24, '#8affa0', 2);
      else X.oct(ctx, x, y, 3, '#ffffff', null, 1);
      ctx.globalAlpha = 1;
    }

    // the read-out panel, right: what the selected neuron is and does
    ctx.fillStyle = '#071a12'; ctx.fillRect(332, 0, VW - 332, VH);
    ctx.fillStyle = '#1e9e5c'; ctx.fillRect(332, 0, 1, VH);
    F.draw(ctx, 'THE MIND', 340, 6, '#8affa0', { shadow: false, scale: 2 });
    F.draw(ctx, 'LEVEL ' + mindLvl, 340, 22, '#3fb85a', { shadow: false });
    F.draw(ctx, 'ESC', VW - 8, 6, '#3fb85a', { right: true, shadow: false });
    const n = D.NEURON[S.sel] || D.NEURONS[0];
    const u = D.UPG[n.id];
    const lvl = level(g, n.id);
    const open = ringOpen(g, n) && wired(g, n);
    F.draw(ctx, u.name.toUpperCase(), 340, 44, '#ffffff', { shadow: false });
    F.draw(ctx, 'LEVEL ' + lvl + ' / ' + u.max, 340, 56, '#8affa0', { shadow: false });
    F.draw(ctx, u.show(lvl), 340, 70, '#ffd34d', { shadow: false });
    // wrapped blurb
    const words = u.blurb.toUpperCase().split(' ');
    let line = '', ly = 86;
    for (const w of words) {
      if (F.width(line + ' ' + w, 1) > 130) { F.draw(ctx, line, 340, ly, '#63c48a', { shadow: false }); line = w; ly += 10; }
      else line = line ? line + ' ' + w : w;
    }
    if (line) F.draw(ctx, line, 340, ly, '#63c48a', { shadow: false });
    // level pips
    for (let k = 0; k < Math.min(u.max, 14); k++) {
      ctx.fillStyle = lvl > Math.floor(k * u.max / Math.min(u.max, 14)) ? '#8affa0' : '#163826';
      ctx.fillRect(340 + k * 9, ly + 16, 6, 4);
    }
    // status
    let status, col;
    if (lvl >= u.max) { status = 'FULLY GROWN'; col = '#8affa0'; }
    else if (!ringOpen(g, n)) { status = 'RING ' + n.ring + ' NEEDS MIND LV ' + n.ring; col = '#ff6b8a'; }
    else if (!wired(g, n)) { status = 'GROW A NEIGHBOUR FIRST'; col = '#ff6b8a'; }
    else { status = 'COST $' + U.fmt(cost(n.id, lvl)); col = g.save.credits >= cost(n.id, lvl) ? '#ffd34d' : '#ff6b8a'; }
    F.draw(ctx, status, 340, ly + 30, col, { shadow: false });
    // the grow key
    const can = open && lvl < u.max && g.save.credits >= cost(n.id, lvl);
    ctx.fillStyle = can ? (Math.sin(t * 5) > 0 ? '#8affa0' : '#63c48a') : '#12281f';
    ctx.fillRect(336, VH - 44, 130, 24);
    ctx.strokeStyle = can ? '#e8fff2' : '#1e4a34'; ctx.strokeRect(336.5, VH - 43.5, 129, 23);
    F.draw(ctx, lvl ? 'E   GROW' : 'E   FIRE NEURON', 401, VH - 36, can ? '#06210f' : '#2f5a44', { center: true, shadow: false });
    F.draw(ctx, '$' + U.fmt(g.save.credits), 401, VH - 14, '#ffd34d', { center: true, shadow: false });
    if (hover && hover.id !== S.sel) {
      const hp = pos(hover);
      F.draw(ctx, D.UPG[hover.id].name.toUpperCase(), hp.x, hp.y - 18, '#ffffff', { center: true });
    }
    if (S.flash > 0) { ctx.fillStyle = 'rgba(255,90,77,' + (S.flash * 0.6).toFixed(2) + ')'; ctx.fillRect(332, 0, VW - 332, VH); }
    PD.touch.draw(ctx, 'ui');
  }

  PD.mind = { open, close, update, draw, S, pos };
})(window.PD);
