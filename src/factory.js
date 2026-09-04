/* The refinery deck: a Factorio-flavoured grid aboard the ship.
   Hoppers pull raw ore out of the bin, belts carry it, machines turn it into
   goods worth multiples of the raw price, depots bank the result. It ticks in
   real time whenever the game does, so it earns while you are down a hole. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const D = PD.data;
  const F = PD.font;
  const A = PD.audio;

  const COLS = 12, ROWS = 6, CELL = 26;
  const BELT_TIME = 0.5;
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];      // right, down, left, up
  const ARROW = ['>', 'V', '<', '^'];

  const state = { tool: 'belt', hover: -1, acc: 0, produced: 0, msgT: 0 };

  function ensure(save) {
    if (!save.factory) save.factory = { cells: new Array(COLS * ROWS).fill(null), produced: 0 };
    if (!save.goods) save.goods = {};
    // runtime item state lives beside the saved layout
    if (!save.factory.rt) save.factory.rt = new Array(COLS * ROWS).fill(null).map(() => ({ item: null, prog: 0, buf: [], work: 0 }));
    return save.factory;
  }

  const idx = (cx, cy) => cy * COLS + cx;
  const inb = (cx, cy) => cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS;

  /* --------------------------------------------------------------- recipes */
  function isMetal(mat) { return D.METALS.indexOf(D.MAT[mat].key) >= 0; }
  function isGem(mat) { return D.GEMS.indexOf(D.MAT[mat].key) >= 0; }
  function isJunk(mat) { return D.JUNK.indexOf(D.MAT[mat].key) >= 0; }

  /* Can this machine take the item? Items are numbers (raw) or good keys. */
  function accepts(cell, item) {
    const kind = D.MACHINES[cell.t].kind;
    if (kind === 'smelt') return typeof item === 'number' && isMetal(item);
    if (kind === 'crush') return typeof item === 'number' && isJunk(item);
    if (kind === 'cut') return typeof item === 'number' && isGem(item);
    if (kind === 'alloy') return typeof item === 'string' && item.indexOf('ingot:') === 0;
    return false;
  }

  function produce(cell, rt) {
    const kind = D.MACHINES[cell.t].kind;
    if (kind === 'smelt') return D.goodOf('ingot', rt.buf.shift()).key;
    if (kind === 'crush') return D.goodOf('conc', rt.buf.shift()).key;
    if (kind === 'cut') return D.goodOf('cut', rt.buf.shift()).key;
    if (kind === 'alloy') {
      const a = +rt.buf.shift().split(':')[1], b = +rt.buf.shift().split(':')[1];
      return D.goodOf('alloy', a, b).key;
    }
    return null;
  }

  /* An alloy forge needs two different ingots waiting. */
  function ready(cell, rt) {
    const kind = D.MACHINES[cell.t].kind;
    if (kind === 'alloy') return rt.buf.length >= 2 && rt.buf[0] !== rt.buf[1];
    return rt.buf.length >= 1;
  }

  /* -------------------------------------------------------------------- sim */
  function tryPush(f, save, from, item) {
    const cell = f.cells[from];
    const cx = from % COLS, cy = (from / COLS) | 0;
    const [dx, dy] = DIRS[cell.d || 0];
    const nx = cx + dx, ny = cy + dy;
    if (!inb(nx, ny)) return false;
    const to = idx(nx, ny);
    const tc = f.cells[to];
    if (!tc) return false;
    const trt = f.rt[to];
    if (tc.t === 'belt') {
      if (trt.item !== null) return false;
      trt.item = item; trt.prog = 0;
      return true;
    }
    if (tc.t === 'depot') {
      const key = typeof item === 'number' ? 'raw:' + item : item;
      save.goods[key] = (save.goods[key] || 0) + 1;
      f.produced = (f.produced || 0) + 1;
      state.produced++;
      return true;
    }
    if (tc.t === 'hopper') return false;
    if (accepts(tc, item) && trt.buf.length < 3) { trt.buf.push(item); return true; }
    return false;
  }

  function step(f, save, dt) {
    // machines first, then belts from the far end so items flow without gaps
    for (let i = 0; i < f.cells.length; i++) {
      const c = f.cells[i]; if (!c) continue;
      const rt = f.rt[i];
      const def = D.MACHINES[c.t];
      if (c.t === 'hopper') {
        rt.work += dt;
        if (rt.work >= 1.2 && c.filter !== undefined && (save.vault[c.filter] || 0) > 0) {
          if (tryPush(f, save, i, c.filter)) {
            save.vault[c.filter]--;
            if (save.vault[c.filter] <= 0) delete save.vault[c.filter];
            rt.work = 0;
          }
        }
      } else if (def.kind) {
        if (rt.item === null && ready(c, rt)) {
          rt.work += dt;
          if (rt.work >= def.time) { rt.item = produce(c, rt); rt.work = 0; }
        }
        if (rt.item !== null && tryPush(f, save, i, rt.item)) rt.item = null;
      }
    }
    const order = [];
    for (let i = 0; i < f.cells.length; i++) if (f.cells[i] && f.cells[i].t === 'belt' && f.rt[i].item !== null) order.push(i);
    // belts whose target is free move first: two passes is enough for short lines
    for (let pass = 0; pass < 2; pass++) {
      for (const i of order) {
        const rt = f.rt[i];
        if (rt.item === null) continue;
        rt.prog = Math.min(BELT_TIME, rt.prog + (pass === 0 ? dt : 0));
        if (rt.prog >= BELT_TIME && tryPush(f, save, i, rt.item)) { rt.item = null; rt.prog = 0; }
      }
    }
  }

  function tick(dt, g) {
    const f = ensure(g.save);
    state.acc += dt;
    while (state.acc >= 0.1) { step(f, g.save, 0.1); state.acc -= 0.1; }
    state.msgT = Math.max(0, state.msgT - dt);
  }

  /* --------------------------------------------------------------- editing */
  function place(g, cx, cy, tool) {
    const f = ensure(g.save);
    const i = idx(cx, cy);
    const cur = f.cells[i];
    if (tool === 'erase') {
      if (!cur) return;
      g.save.credits += Math.round(D.MACHINES[cur.t].cost * 0.5);
      f.cells[i] = null; f.rt[i] = { item: null, prog: 0, buf: [], work: 0 };
      A.sfx.click();
      return;
    }
    if (cur && cur.t === tool) {
      if (tool === 'belt') { cur.d = ((cur.d || 0) + 1) % 4; A.sfx.click(); return; }
      if (tool === 'hopper') { cycleFilter(g, cur); return; }
      if (D.MACHINES[tool].kind) { cur.d = ((cur.d || 0) + 1) % 4; A.sfx.click(); return; }
      return;
    }
    const cost = D.MACHINES[tool].cost;
    if (g.save.credits < cost) { A.sfx.deny(); PD.term.say('NEED $' + U.fmt(cost) + ' FOR ' + D.MACHINES[tool].name.toUpperCase(), '#ff5a4d'); return; }
    if (cur) g.save.credits += Math.round(D.MACHINES[cur.t].cost * 0.5);
    g.save.credits -= cost;
    f.cells[i] = { t: tool, d: 0 };
    f.rt[i] = { item: null, prog: 0, buf: [], work: 0 };
    if (tool === 'hopper') cycleFilter(g, f.cells[i], true);
    A.sfx.buy();
  }

  /* Hopper filter cycles through whatever is actually in the bin. */
  function cycleFilter(g, cell, silent) {
    const mats = Object.keys(g.save.vault).map(Number).filter(m => (g.save.vault[m] || 0) > 0).sort((a, b) => a - b);
    if (!mats.length) { cell.filter = undefined; if (!silent) PD.term.say('BIN IS EMPTY -- NOTHING TO FEED', '#ff5a4d'); return; }
    const i = mats.indexOf(cell.filter);
    cell.filter = mats[(i + 1) % mats.length];
    if (!silent) A.sfx.click();
  }

  /* ---------------------------------------------------------------- drawing */
  function itemColor(item) {
    if (typeof item === 'number') return D.MAT[item].c;
    const gd = D.goodFromKey(item);
    return gd ? gd.c : ['#fff', '#aaa', '#555'];
  }

  function drawItem(ctx, item, x, y) {
    const c = itemColor(item);
    const refined = typeof item === 'string';
    ctx.fillStyle = c[1]; ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = c[0]; ctx.fillRect(x - 3, y - 3, 6, 2);
    if (refined) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
  }

  function app(ctx, g, th, t) {
    const R = PD.term.rect;
    const f = ensure(g.save);
    const gx = R.IX, gy = R.IY + 12;

    F.draw(ctx, 'REFINERY DECK  //  BIN -> BELTS -> MACHINES -> DEPOT', gx, R.IY, th.mid, { shadow: false });

    // grid
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(gx - 1, gy - 1, COLS * CELL + 2, ROWS * CELL + 2);
    for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) {
      const x = gx + cx * CELL, y = gy + cy * CELL;
      ctx.fillStyle = (cx + cy) % 2 ? '#16110e' : '#1a1410';
      ctx.fillRect(x, y, CELL, CELL);
      ctx.fillStyle = th.lo; ctx.fillRect(x, y, CELL, 1); ctx.fillRect(x, y, 1, CELL);
    }

    const m = PD.input.mouse;
    const hx = Math.floor((m.x - gx) / CELL), hy = Math.floor((m.y - gy) / CELL);
    const hovering = m.inside && inb(hx, hy) && m.x >= gx && m.y >= gy;
    state.hover = hovering ? idx(hx, hy) : -1;

    // cells
    for (let i = 0; i < f.cells.length; i++) {
      const c = f.cells[i]; if (!c) continue;
      const cx = i % COLS, cy = (i / COLS) | 0;
      const x = gx + cx * CELL, y = gy + cy * CELL;
      const def = D.MACHINES[c.t];
      const rt = f.rt[i];
      if (c.t === 'belt') {
        ctx.fillStyle = '#2a2a36'; ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
        // moving chevrons
        const [dx, dy] = DIRS[c.d || 0];
        for (let k = 0; k < 3; k++) {
          const ph = ((t * 2 + k / 3) % 1);
          const px = x + CELL / 2 + dx * (ph - 0.5) * (CELL - 10), py = y + CELL / 2 + dy * (ph - 0.5) * (CELL - 10);
          ctx.fillStyle = th.mid; ctx.globalAlpha = 0.7;
          ctx.fillRect(px - 1, py - 1, 3, 3);
        }
        ctx.globalAlpha = 1;
        if (rt.item !== null) {
          const p2 = rt.prog / BELT_TIME;
          drawItem(ctx, rt.item, x + CELL / 2 + dx * (p2 - 0.5) * (CELL - 8), y + CELL / 2 + dy * (p2 - 0.5) * (CELL - 8));
        }
      } else {
        ctx.fillStyle = def.col; ctx.globalAlpha = 0.28; ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4); ctx.globalAlpha = 1;
        ctx.strokeStyle = def.col; ctx.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5);
        F.draw(ctx, def.name.slice(0, 3).toUpperCase(), x + CELL / 2, y + 5, def.col, { center: true, shadow: false });
        if (c.t === 'hopper') {
          if (c.filter !== undefined) drawItem(ctx, c.filter, x + CELL / 2, y + 16);
          else F.draw(ctx, '?', x + CELL / 2, y + 14, '#ff5a4d', { center: true, shadow: false });
        } else if (c.t === 'depot') {
          ctx.fillStyle = th.hi; ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 4 + i);
          ctx.fillRect(x + 8, y + 15, CELL - 16, 4); ctx.globalAlpha = 1;
        } else {
          // progress + buffer dots
          const frac = ready(c, rt) || rt.item !== null ? Math.min(1, rt.work / def.time) : 0;
          ctx.fillStyle = '#000'; ctx.fillRect(x + 5, y + 19, CELL - 10, 3);
          ctx.fillStyle = def.col; ctx.fillRect(x + 5, y + 19, Math.round((CELL - 10) * frac), 3);
          for (let k = 0; k < rt.buf.length; k++) drawItem(ctx, rt.buf[k], x + 7 + k * 6, y + 14);
          if (rt.item !== null) drawItem(ctx, rt.item, x + CELL - 6, y + 14);
        }
        if (c.t !== 'depot' && c.t !== 'belt') {
          // output direction nub
          const [dx, dy] = DIRS[c.d || 0];
          ctx.fillStyle = def.col;
          ctx.fillRect(x + CELL / 2 + dx * (CELL / 2 - 3) - 1, y + CELL / 2 + dy * (CELL / 2 - 3) - 1, 3, 3);
        }
      }
    }

    // hover + click
    if (hovering) {
      const x = gx + hx * CELL, y = gy + hy * CELL;
      ctx.strokeStyle = state.tool === 'erase' ? '#ff5a4d' : '#ffffff';
      ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      const cur = f.cells[idx(hx, hy)];
      if (cur) PD.term.state.tip = D.MACHINES[cur.t].name.toUpperCase() + ' -- ' + D.MACHINES[cur.t].blurb.toUpperCase();
      if (m.leftPressed) place(g, hx, hy, state.tool);
      if (m.rightPressed) place(g, hx, hy, 'erase');
    }

    // palette
    const px = gx + COLS * CELL + 10, tools = Object.keys(D.MACHINES).concat(['erase']);
    for (let k = 0; k < tools.length; k++) {
      const tname = tools[k];
      const y = gy + k * 19;
      const def = D.MACHINES[tname];
      const on = state.tool === tname;
      const r = PD.term.row(ctx, px, y, R.IX + R.IW - px, 18, th, { active: on });
      ctx.fillStyle = def ? def.col : '#ff5a4d'; ctx.fillRect(px + 3, y + 5, 8, 8);
      F.draw(ctx, def ? def.name : 'Eraser', px + 15, y + 2, on ? '#ffffff' : th.hi, { shadow: false });
      F.draw(ctx, def ? '$' + U.fmt(def.cost) : 'REFUND 50%', px + 15, y + 10, th.mid, { shadow: false });
      if (r.clicked) { state.tool = tname; A.sfx.click(); }
      if (r.hover && def) PD.term.state.tip = def.blurb.toUpperCase();
    }

    // stats strip
    const sy = gy + ROWS * CELL + 6;
    const machines = f.cells.filter(c => c && c.t !== 'belt').length;
    let goodsVal = 0, goodsN = 0;
    for (const k in g.save.goods) {
      const n = g.save.goods[k];
      const gd = k.indexOf('raw:') === 0 ? { cr: D.MAT[+k.slice(4)].cr } : D.goodFromKey(k);
      goodsVal += (gd ? gd.cr : 0) * n; goodsN += n;
    }
    F.draw(ctx, 'MACHINES ' + machines + '   PRODUCED ' + U.fmt(f.produced || 0) + '   GOODS IN VAULT ' + U.fmt(goodsN) +
      '  ($' + U.fmt(Math.round(goodsVal * g.valueMult())) + ')', gx, sy, th.mid, { shadow: false });
    F.draw(ctx, 'LEFT CLICK PLACE / ROTATE   RIGHT CLICK ERASE   HOPPER CLICK = NEXT ORE', gx, sy + 10, th.lo, { shadow: false });
  }

  PD.factory = { ensure, tick, app, place, COLS, ROWS, state };
})(window.PD);
