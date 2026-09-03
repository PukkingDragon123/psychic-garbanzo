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
  function hud(ctx, g) {
    const p = g.player;
    const maxO2 = p.stat('oxygen'), maxHull = p.stat('hull'), cap = p.capacity();

    // meters
    const bx = 26, bw = 76;
    icon(ctx, 'tank', 6, 5);
    bar(ctx, bx, 8, bw, 7, p.o2 / maxO2, p.o2 / maxO2 < 0.25 ? (Math.sin(g.time * 12) > 0 ? '#ff6b8a' : COL.o2) : COL.o2,
      { right: Math.ceil(p.o2) + '' });
    icon(ctx, 'hull', 6, 21);
    bar(ctx, bx, 24, bw, 7, p.hull / maxHull, COL.hull, { right: Math.ceil(p.hull) + '' });
    icon(ctx, 'pod', 6, 37);
    bar(ctx, bx, 40, bw, 7, p.cargoKg / cap, p.cargoFull() ? '#ff6b8a' : COL.cargo,
      { right: U.fmtKg(p.cargoKg) });

    if (p.cargoFull()) {
      F.draw(ctx, 'HOLD FULL', bx + bw / 2, 50, Math.sin(g.time * 9) > 0 ? '#ffe37a' : '#ff6b8a', { center: true });
    }

    // cargo manifest
    const entries = Object.keys(p.cargo).sort((a, b) => D.MAT[b].cr - D.MAT[a].cr).slice(0, 6);
    let my = 58;
    for (const k of entries) {
      const m = D.MAT[k];
      ctx.fillStyle = m.c[1];
      ctx.fillRect(8, my + 1, 5, 5);
      ctx.fillStyle = m.c[0];
      ctx.fillRect(8, my + 1, 5, 2);
      F.draw(ctx, m.name.slice(0, 9) + ' ' + p.cargo[k], 17, my, COL.dim);
      my += 9;
    }
    if (p.cargoValue() > 0) F.draw(ctx, '$' + U.fmt(p.cargoValue()), 8, my + 1, COL.gold);

    // credits + income
    F.draw(ctx, '$' + U.fmt(g.save.credits), VW - 8, 8, COL.gold, { right: true, scale: 2 });
    const dps = g.droneIncome();
    if (dps > 0) F.draw(ctx, '+' + U.fmt(dps) + '/S DRONES', VW - 8, 26, COL.good, { right: true });
    F.draw(ctx, 'GALAXY ' + g.save.dominion.toFixed(1) + '%', VW - 8, 36, COL.lineHi, { right: true });

    // body + depth
    F.draw(ctx, g.world.body.name, 8, VH - 20, COL.text);
    const depth = g.world.depthMeters(p.y);
    F.draw(ctx, depth > 0 ? 'DEPTH ' + depth + 'M' : 'IN ORBIT', 8, VH - 11, COL.dim);

    // core integrity: only once the player has actually hit it
    if (g.world.coreHp < g.world.coreMax) {
      const cw = 150;
      const cx = VW / 2 - cw / 2;
      F.draw(ctx, 'CORE INTEGRITY', VW / 2, 8, COL.core, { center: true });
      bar(ctx, cx, 18, cw, 8, g.world.coreHp / g.world.coreMax, COL.core,
        { right: Math.ceil(g.world.coreHp / g.world.coreMax * 100) + '%' });
    }

    // recall charge
    if (p.recall > 0.1) {
      F.draw(ctx, 'TRACTOR BEAM', VW / 2, VH - 46, COL.o2, { center: true });
      bar(ctx, VW / 2 - 40, VH - 36, 80, 6, p.recall / 1.4, COL.o2, {});
    }

    // hints
    if (g.hintT > 0) {
      ctx.globalAlpha = U.clamp(g.hintT, 0, 1);
      F.draw(ctx, g.hint, VW / 2, VH - 30, '#ffffff', { center: true });
      ctx.globalAlpha = 1;
    }

    // toasts stack upward from the bottom so they never sit on the ship
    let ty = VH - 58;
    for (let i = g.toasts.length - 1; i >= 0; i--) {
      const t = g.toasts[i];
      ctx.globalAlpha = U.clamp(t.life, 0, 1);
      const tw = F.width(t.msg, 1) + 12;
      ctx.fillStyle = 'rgba(18,10,36,0.85)';
      ctx.fillRect(VW / 2 - tw / 2, ty - 3, tw, 13);
      ctx.strokeStyle = t.color || COL.line;
      ctx.strokeRect(VW / 2 - tw / 2 + 0.5, ty - 2.5, tw - 1, 12);
      F.draw(ctx, t.msg, VW / 2, ty, t.color || COL.text, { center: true });
      ctx.globalAlpha = 1;
      ty -= 16;
    }
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
      F.draw(ctx, 'LV' + lvl, x + 68, y + 28, COL.dim, { right: true });

      if (maxed) {
        F.draw(ctx, 'MAX', x + 134, y + 16, COL.gold, { right: true });
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
    ctx.fillStyle = '#4d6b8a';
    ctx.beginPath(); ctx.arc(px, py, r, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#3b5470';
    ctx.beginPath(); ctx.arc(px + 10, py + 12, r - 8, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#5d7f9e';
    [[-26, -18, 9], [12, -30, 6], [-8, 6, 5], [26, -6, 7]].forEach(c => {
      ctx.beginPath(); ctx.arc(px + c[0], py + c[1], c[2], 0, U.TAU); ctx.fill();
    });

    // glowing fissures, breathing in time with the drill
    const glow = 0.55 + 0.45 * Math.sin(t * 4);
    ctx.strokeStyle = 'rgba(255,150,60,' + glow.toFixed(2) + ')';
    ctx.lineWidth = 2;
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
    ctx.fillStyle = 'rgba(255,220,150,' + (glow * 0.9).toFixed(2) + ')';
    ctx.fillRect(px - 8, py - 60, 4, 4);

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

    F.draw(ctx, 'PLANET', cx, 26 + bob, '#ffd34d', { center: true, scale: 5, shadow: '#7a2a10' });
    F.draw(ctx, 'DESTROYER', cx, 66 + bob, '#ff5fa8', { center: true, scale: 4, shadow: '#3a0c30' });
    F.draw(ctx, 'A GREEDY LITTLE ALIEN', cx, 104, COL.dim, { center: true });
    F.draw(ctx, 'MINING SIMULATOR', cx, 114, COL.dim, { center: true });

    const start = button(ctx, cx - 62, 132, 124, 18, g.save.totalEarned > 0 ? 'CONTINUE' : 'START DRILLING',
      { accent: '#2f7a4a' });
    let wipe = false;
    if (g.save.totalEarned > 0) wipe = button(ctx, cx - 62, 154, 124, 13, 'NEW GAME', { accent: '#8a2f4a' });

    F.draw(ctx, 'GET RICH.  BREAK WORLDS.', 12, 190, COL.gold);
    F.draw(ctx, 'OWN THE GALAXY.', 12, 200, COL.gold);
    F.draw(ctx, 'WASD / ARROWS   THRUSTERS', 12, 218, COL.text);
    F.draw(ctx, 'LEFT MOUSE      DRILL', 12, 228, COL.text);
    F.draw(ctx, 'RIGHT / SPACE   PISTOL', 12, 238, COL.text);
    F.draw(ctx, 'E DOCK   R BEAM HOME', 12, 248, COL.text);
    F.draw(ctx, 'CLICK ONCE TO ENABLE SOUND', 12, 262, COL.dim);
    return { start, wipe };
  }

  /* ------------------------------------------------------------------ pause */
  function pause(ctx, g) {
    ctx.fillStyle = 'rgba(8,4,18,0.7)';
    ctx.fillRect(0, 0, VW, VH);
    panel(ctx, VW / 2 - 80, 80, 160, 110, 'PAUSED');
    let r = { resume: false, ship: false };
    r.resume = button(ctx, VW / 2 - 64, 96, 128, 16, 'RESUME  [ESC]');
    if (button(ctx, VW / 2 - 64, 118, 128, 14, 'SOUND ' + (A.state.sfx ? 'ON' : 'OFF'))) A.toggleSfx(!A.state.sfx);
    if (button(ctx, VW / 2 - 64, 136, 128, 14, 'MUSIC ' + (A.state.music ? 'ON' : 'OFF'))) A.toggleMusic(!A.state.music);
    if (button(ctx, VW / 2 - 64, 154, 128, 14, 'SAVE GAME')) { g.saveGame(); g.toast('PROGRESS SAVED', COL.good); }
    r.ship = button(ctx, VW / 2 - 64, 172, 128, 14, 'RECALL TO SHIP', { accent: '#3f6ea8' });
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
      F.draw(ctx, v.name, VW / 2, 128, COL.text, { center: true });
      F.draw(ctx, 'CORE BOUNTY', VW / 2 - 92, 144, COL.dim);
      F.draw(ctx, '$' + U.fmt(v.reward), VW / 2 + 92, 144, COL.gold, { right: true });
      F.draw(ctx, 'GALAXY CONTROL', VW / 2 - 92, 156, COL.dim);
      F.draw(ctx, '+' + v.dominion.toFixed(1) + '%', VW / 2 + 92, 156, COL.good, { right: true });
      F.draw(ctx, 'PERMANENT VALUE BONUS', VW / 2 - 92, 168, COL.dim);
      F.draw(ctx, '+' + v.bonus + '%', VW / 2 + 92, 168, COL.lineHi, { right: true });
      if (v.unlocked) F.draw(ctx, 'UNLOCKED: ' + v.unlocked, VW / 2, 182, COL.gold, { center: true });
      ctx.globalAlpha = 1;
      if (t > 1.0) {
        return { ok: button(ctx, VW / 2 - 66, 208, 132, 16, 'BACK TO THE SHIP  [E]', { accent: '#2f7a4a' }) };
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
    VW, VH, COL, panel, bar, button, icon, hud, shop, title, pause, victory,
    sellSplash, ending, endFrame
  };
})(window.PD);
