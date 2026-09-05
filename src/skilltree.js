/* The skill tree: a hex lattice of upgrades. Every node is one upgrade line
   with levels; a node opens once any neighbour has a level. Costs are shown
   as glyphs and numbers, never as sentences. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const D = PD.data;
  const F = PD.font;
  const A = PD.audio;
  const G = PD.glyph;

  const R = 20;                       // hex radius on screen
  const state = { sel: null, pan: 0 };

  /* axial -> pixel */
  function pos(q, r, cx, cy) {
    return { x: cx + R * 1.75 * (q + r / 2), y: cy + R * 1.52 * r };
  }
  function neighbours(n) {
    const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    return D.NODES.filter(o => dirs.some(d => o.q === n.q + d[0] && o.r === n.r + d[1]));
  }
  function available(g, n) {
    if (n.root) return true;
    return neighbours(n).some(o => (g.save.upg[o.id] || 0) > 0);
  }

  function app(ctx, g, th, t) {
    const Rc = PD.term.rect;
    const cx = Rc.IX + 152, cy = Rc.IY + 92;
    const m = PD.input.mouse;

    // lattice edges first
    ctx.lineWidth = 1;
    for (const n of D.NODES) {
      const a = pos(n.q, n.r, cx, cy);
      for (const o of neighbours(n)) {
        if (o.q < n.q || (o.q === n.q && o.r < n.r)) continue;
        const b = pos(o.q, o.r, cx, cy);
        const lit = (g.save.upg[n.id] || 0) > 0 && (g.save.upg[o.id] || 0) > 0;
        ctx.strokeStyle = lit ? th.hi : th.lo;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    let hover = null;
    for (const n of D.NODES) {
      const p = pos(n.q, n.r, cx, cy);
      const u = D.UPG[n.id];
      const lvl = g.save.upg[n.id] || 0;
      const open = available(g, n);
      const maxed = lvl >= u.max;
      const isHover = m.inside && U.dist(m.x, m.y, p.x, p.y) < R;
      if (isHover) hover = n;
      const sel = state.sel === n.id;
      const fill = maxed ? th.mid : (lvl > 0 ? th.lo : (open ? '#1a1410' : '#0c0a08'));
      G.hex(ctx, p.x, p.y, R - 1, fill, sel ? '#ffffff' : (isHover ? th.hi : (open ? th.mid : '#2a2420')), sel ? 2 : 1);
      if (lvl > 0) G.hexProgress(ctx, p.x, p.y, R - 4, lvl / u.max, th.hi);
      G.draw(ctx, n.glyph, p.x - 7, p.y - 9, open ? '#f2e9ff' : '#4a4040', open ? th.hi : '#2a2420');
      if (!open) G.draw(ctx, 'lock', p.x - 3, p.y + 1, '#8a7a6a', '#5a4a3a');
      else F.draw(ctx, String(lvl), p.x, p.y + 5, maxed ? '#ffffff' : th.hi, { center: true, shadow: false });
      if (isHover && m.leftPressed) { state.sel = n.id; A.sfx.click(); }
    }

    // detail card for the selected node: glyphs, pips, costs, one build key
    const selNode = D.NODES.find(n => n.id === state.sel) || D.NODES[0];
    const u = D.UPG[selNode.id];
    const lvl = g.save.upg[selNode.id] || 0;
    const open = available(g, selNode);
    const maxed = lvl >= u.max;
    const px = Rc.IX + 306, py = Rc.IY + 4, pw = Rc.IW - 306;
    ctx.fillStyle = th.lo; ctx.fillRect(px, py, pw, Rc.IH - 8);
    ctx.strokeStyle = th.mid; ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, Rc.IH - 9);
    G.draw(ctx, selNode.glyph, px + 6, py + 6, '#ffffff', th.hi, 2);
    F.draw(ctx, u.show(lvl), px + 40, py + 10, th.hi, { shadow: false });
    // level pips as small hexes
    for (let k = 0; k < Math.min(u.max, 14); k++) {
      const on = lvl > Math.floor(k * u.max / Math.min(u.max, 14));
      G.hex(ctx, px + 10 + k * 8, py + 40, 3, on ? th.hi : '#000', th.mid, 1);
    }
    if (maxed) {
      G.draw(ctx, 'check', px + pw / 2 - 7, py + 60, th.hi, th.hi);
    } else if (!open) {
      G.draw(ctx, 'lock', px + pw / 2 - 7, py + 60, '#ff5a4d', '#8a2a2a');
    } else {
      const cost = D.upgradeCost(u, lvl);
      const rec = D.recipe(u, lvl);
      let yy = py + 52;
      const okC = g.save.credits >= cost;
      G.stat(ctx, 'coin', U.fmt(cost), px + 8, yy, '#ffd34d', '#b8860b', okC ? th.hi : '#ff5a4d');
      yy += 16;
      let all = okC;
      for (const r of rec) {
        const have = g.save.vault[r.mat] || 0;
        const ok = have >= r.qty;
        all = all && ok;
        const mc = D.MAT[r.mat].c;
        ctx.fillStyle = mc[1]; ctx.fillRect(px + 10, yy + 3, 8, 8); ctx.fillStyle = mc[0]; ctx.fillRect(px + 10, yy + 3, 8, 3);
        F.draw(ctx, have + '/' + r.qty, px + 25, yy + 4, ok ? th.hi : '#ff5a4d', { shadow: false });
        yy += 14;
      }
      // the build key: a big hex
      const bx = px + pw / 2, by = py + Rc.IH - 34;
      const hot = m.inside && U.dist(m.x, m.y, bx, by) < 16;
      G.hex(ctx, bx, by, 16, all ? (hot ? th.hi : th.mid) : '#1a1410', all ? '#ffffff' : '#3a3030', 1.5);
      G.draw(ctx, 'build', bx - 7, by - 7, all ? '#ffffff' : '#4a4040', all ? th.lo : '#2a2420');
      if (hot && m.leftPressed && all) g.fabricate(selNode.id);
    }
    if (hover) PD.term.state.tip = D.UPG[hover.id].blurb.toUpperCase();
  }

  PD.skilltree = { app, state, available };
})(window.PD);
