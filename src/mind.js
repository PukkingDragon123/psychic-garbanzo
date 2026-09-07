/* THE BRAIN IN THE JAR.

   A brain in a bucket of acid, wired to a keyboard, sitting in the corner of a
   very small rock house. It knows everything. It does not want money -- money
   is for Abay. It wants THOTS, which come out of hitting rocks, and it grows
   them into you as neurons: rings of nodes around the stem, wired outward, one
   dendrite at a time.

   Opened by standing next to the jar and pressing E. ESC closes it. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const D = PD.data;
  const A = PD.audio;
  const G = PD.glyph;
  const X = PD.pxd;

  const VW = 480, VH = 270;
  const CX = 240, CY = 132;                      // the stem, on screen
  const RING = [0, 44, 82, 112];                 // how far out each ring sits
  const RY = 0.62;                               // the lattice is wider than tall

  const ICON = {
    dig: 'drill', air: 'o2', sack: 'cargo', tough: 'hull', nose: 'scan',
    deep: 'depth', pockets: 'hand', boots: 'speed', haggle: 'sell',
    rich: 'coin', brawn: 'gun', know: 'crew'
  };

  const S = {
    t: 0, sel: 'dig', hover: null, flash: 0, pulses: [], bub: [],
    line: '', lineT: 0, shake: 0, grew: null, growT: 0
  };
  for (let i = 0; i < 46; i++) {
    S.bub.push({ x: U.hash2(i, 3), y: U.hash2(i, 7), r: U.hash2(i, 11) > 0.7 ? 2 : 1, sp: 7 + U.hash2(i, 13) * 20 });
  }

  /* Node positions: an angle on a ring, snapped so the wires between them run
     at clean pixel slopes. */
  function pos(n) {
    if (n.ring === 0) return { x: CX, y: CY };
    const a = (n.a - 90) * Math.PI / 180;
    return { x: Math.round(CX + Math.cos(a) * RING[n.ring]), y: Math.round(CY + Math.sin(a) * RING[n.ring] * RY) };
  }

  function say(m) { S.line = m; S.lineT = 4.2; }

  function open(g) {
    g.state = 'mind';
    S.t = 0; S.sel = 'dig'; S.pulses.length = 0; S.flash = 0;
    say(U.pick(D.BRAIN_IDLE));
    A.sfx.tone(120, { type: 'sine', to: 380, dur: 0.55, vol: 0.1 });
    A.sfx.tone(380, { type: 'triangle', to: 700, dur: 0.4, vol: 0.05, delay: 0.28 });
  }

  function close(g) {
    g.state = 'home';
    PD.home.P.lock = 0.28;
    A.sfx.click();
  }

  function buy(g, n) {
    const lvl = g.brain(n.id);
    if (!g.brainWired(n)) { A.sfx.deny(); S.shake = 0.3; say('NOT PLUGGED IN. WIRE IT TO A NEIGHBOUR.'); return; }
    if (lvl >= n.max) { A.sfx.deny(); say('THAT ONE IS FULL. YOUR HEAD IS SMALL.'); return; }
    const c = g.brainCost(n.id);
    if (g.save.thots < c) { A.sfx.deny(); S.shake = 0.3; say('NOT ENOUGH THOTS. GO AND HIT A ROCK.'); return; }
    if (!g.brainBuy(n.id)) { A.sfx.deny(); return; }
    if (g.player) { g.player.o2 = Math.min(g.player.o2, g.player.stat('oxygen')); g.player.hull = Math.min(g.player.hull, g.player.stat('hull')); }
    // the pulse runs out from whichever neighbour is already lit
    const from = n.links.length ? D.NEUR[n.links.find(l => g.brain(l) > 0) || n.links[0]] : null;
    S.pulses.push({ a: from ? pos(from) : { x: CX, y: CY + 40 }, b: pos(n), t: 0 });
    S.grew = n.id; S.growT = 1;
    say(U.pick(D.BRAIN_LINES));
    A.sfx.tone(200, { type: 'sine', to: 1100, dur: 0.32, vol: 0.11 });
    A.sfx.tone(1100, { type: 'triangle', to: 1700, dur: 0.22, vol: 0.07, delay: 0.22 });
    PD.fx.flash(0.18, '#4cff9a');
  }

  function update(dt, g) {
    S.t += dt;
    S.lineT = Math.max(0, S.lineT - dt);
    S.flash = Math.max(0, S.flash - dt * 3);
    S.shake = Math.max(0, S.shake - dt * 3);
    S.growT = Math.max(0, S.growT - dt * 1.6);
    for (let i = S.pulses.length - 1; i >= 0; i--) { S.pulses[i].t += dt * 2.1; if (S.pulses[i].t > 1.4) S.pulses.splice(i, 1); }

    const IN = PD.input;
    if (IN.hit('esc') || IN.hit('KeyQ')) { close(g); return; }

    const m = IN.mouse;
    S.hover = null;
    for (const n of D.NEURONS) {
      const p = pos(n);
      if (U.dist(m.x, m.y, p.x, p.y) < 13) S.hover = n.id;
    }
    // the keyboard he cannot use: arrows walk the lattice, E plugs it in
    if (IN.hit('right') || IN.hit('Tab')) { const l = D.NEURONS; S.sel = l[(l.findIndex(n => n.id === S.sel) + 1) % l.length].id; A.sfx.click(); }
    if (IN.hit('left')) { const l = D.NEURONS; S.sel = l[(l.findIndex(n => n.id === S.sel) + l.length - 1) % l.length].id; A.sfx.click(); }
    if (S.hover && m.leftPressed) {
      if (S.sel === S.hover) buy(g, D.NEUR[S.hover]);
      else { S.sel = S.hover; A.sfx.click(); }
    }
    if (IN.hit('KeyE') || IN.hit('space') || IN.hit('enter')) buy(g, D.NEUR[S.sel]);
  }

  /* ------------------------------------------------------------------- draw */
  function drawJar(ctx, t) {
    // the tank, filling the screen: straight glass, acid, a bevelled rim
    X.rect(ctx, 0, 0, VW, VH, '#0b1a16');
    const L = 14, R = VW - 14, TOP = 14, BOT = VH - 14;
    X.rect(ctx, L, TOP, R - L, BOT - TOP, '#12503a');
    X.rect(ctx, L + 4, TOP + 4, R - L - 8, BOT - TOP - 8, '#1e9e5c');
    X.rect(ctx, L + 8, TOP + 8, R - L - 16, BOT - TOP - 16, '#177f4c');
    // bands of settled acid
    for (let i = 0; i < 7; i++) {
      ctx.globalAlpha = 0.12;
      X.dither(ctx, L + 8, TOP + 12 + i * 30, R - L - 16, 14, '#4cff9a', i % 2);
    }
    ctx.globalAlpha = 1;
    // bubbles, in whole-pixel steps
    for (const b of S.bub) {
      const y = BOT - 12 - ((b.y * (BOT - TOP - 30) + t * b.sp) % (BOT - TOP - 30));
      const x = L + 14 + b.x * (R - L - 28) + Math.sin(t * 2 + b.y * 30) * 3;
      ctx.globalAlpha = 0.5;
      X.rect(ctx, x, y, b.r * 2, b.r * 2, '#a8ffd0');
      ctx.globalAlpha = 1;
    }
    // glass: highlight down one side, hard rim top and bottom
    X.rect(ctx, L + 4, TOP + 12, 3, BOT - TOP - 40, '#cdeeff');
    X.rect(ctx, R - 8, TOP + 24, 2, BOT - TOP - 60, '#7ec0e0');
    X.rect(ctx, L, TOP - 8, R - L, 9, '#5e6688');
    X.rect(ctx, L, TOP - 8, R - L, 3, '#9aa3c4');
    X.rect(ctx, L, BOT, R - L, 10, '#5e6688');
    X.rect(ctx, L, BOT, R - L, 2, '#9aa3c4');
    for (let x = L + 6; x < R - 6; x += 22) { X.rect(ctx, x, TOP - 6, 8, 4, '#39405e'); X.rect(ctx, x, BOT + 3, 8, 4, '#39405e'); }
  }

  /* A BRAIN, filling most of the tank, so the neurons sit ON it rather than
     floating in the acid beside it. Built out of ridges: rows of bevelled
     bars, shorter towards the top and bottom, with a hard crease down the
     middle and a shadow under every fold. No curves, no smoothing. */
  function drawBrain(ctx, t) {
    const wob = Math.round(Math.sin(t * 1.3) * 2);
    const cx = CX, cy = CY + 6 + wob;
    const RW = 172, RH = 104;                     // half-width, half-height
    const C1 = '#d64f8a', C2 = '#ff9ecb', C3 = '#8a2a56', C4 = '#5e1638';

    /* The silhouette. The half-width is quantised to eight-pixel steps, so the
       outline comes out as a stack of facets rather than a smooth curve. */
    const halfW = (y) => {
      const f = Math.abs(y) / RH;
      let w = RW * (1 - f * f * 0.66);
      if (y < -RH * 0.6) w *= 0.9;                // flatter across the top
      if (y > RH * 0.62) w *= 0.78;               // tucked under at the base
      return Math.round(w / 8) * 8;
    };
    for (let y = -RH; y <= RH; y += 4) {
      const w = halfW(y);
      X.rect(ctx, cx - w, cy + y, w * 2, 4, C1);
      X.rect(ctx, cx - w, cy + y, 3, 4, C3);
      X.rect(ctx, cx + w - 3, cy + y, 3, 4, C4);
    }
    // a lit rim along the top of the mass
    for (let y = -RH; y < -RH * 0.2; y += 4) {
      const w = halfW(y), w2 = halfW(y + 4);
      if (w2 > w) X.rect(ctx, cx - w2, cy + y + 2, (w2 - w) + 3, 3, C2);
      if (w2 > w) X.rect(ctx, cx + w - 3, cy + y + 2, (w2 - w) + 3, 3, C2);
    }
    /* The folds: fat bevelled bars in two fans either side of the crease, each
       with a lit top and a hard shadow under it. */
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 7; i++) {
        const fy = (i / 6) * 1.72 - 0.86;
        const y = Math.round(cy + fy * (RH - 12)) - 7;
        // halfW works in offsets from the centre, not screen rows
        const room = halfW(y + 7 - cy) - 10;
        const inset = 4 + ((i * 11) % 26);
        const w = room - inset;
        if (w < 18) continue;
        const x = side < 0 ? cx - 6 - w : cx + 6;
        const h = 15;
        X.rect(ctx, x, y, w, h, C1);
        X.rect(ctx, x + 3, y, w - 6, 3, C2);               // lit top of the fold
        X.rect(ctx, x + 4, y + 3, w - 8, 2, '#ffc4de');
        X.rect(ctx, x, y + h - 3, w, 3, C3);               // shadow under it
        X.rect(ctx, side < 0 ? x : x + w - 3, y + 2, 3, h - 4, C3);
        // a nick out of the end, so no two folds end the same way
        if (i % 2) X.rect(ctx, side < 0 ? x : x + w - 6, y + 4, 6, 6, C3);
      }
    }
    // the crease
    X.rect(ctx, cx - 4, cy - RH + 6, 9, RH * 2 - 12, C4);
    X.rect(ctx, cx - 1, cy - RH + 8, 3, RH * 2 - 16, C3);
    // the stem, running down out of the bottom of the picture
    X.rect(ctx, cx - 12, cy + RH - 10, 25, 60, C3);
    X.rect(ctx, cx - 7, cy + RH - 8, 9, 58, C1);
    X.rect(ctx, cx - 18, cy + RH + 14, 37, 10, C4);
    // one eye, grown on the side of it, which is watching you
    const ex = cx + Math.round(RW * 0.56), ey = cy - RH + 30;
    const blink = Math.sin(t * 0.6) > 0.96;
    X.plate(ctx, ex - 13, ey - (blink ? 2 : 11), 26, blink ? 4 : 22, '#ffffff', '#ffffff', '#c4b0c0', 5);
    if (!blink) {
      const look = Math.round(Math.sin(t * 0.9) * 4);
      X.oct(ctx, ex + look, ey, 7, '#151233', null);
      X.rect(ctx, ex + look - 4, ey - 4, 3, 3, '#ffffff');
    }
    // and a few veins, because it is alive and it wants you to know
    for (let i = 0; i < 5; i++) {
      const vy = cy - RH + 20 + i * 42;
      X.curve(ctx, cx - RW + 10, vy, cx - RW * 0.4, vy + 14, cx - 20, vy + 4, '#b03a70', 1, 8);
      X.curve(ctx, cx + RW - 10, vy + 20, cx + RW * 0.4, vy + 30, cx + 20, vy + 22, '#b03a70', 1, 8);
    }
  }

  function nodeState(g, n) {
    const lvl = g.brain(n.id);
    if (lvl >= n.max) return 'full';
    if (!g.brainWired(n)) return 'dead';
    return g.save.thots >= g.brainCost(n.id) ? 'ready' : 'poor';
  }

  function draw(ctx, g, t) {
    drawJar(ctx, t);
    const sh = S.shake > 0 ? Math.round(Math.sin(t * 70) * S.shake * 8) : 0;
    ctx.save();
    ctx.translate(sh, 0);
    drawBrain(ctx, t);

    // the dendrites first, so the nodes sit on top of them
    for (const n of D.NEURONS) {
      const p = pos(n);
      for (const l of n.links) {
        const q = pos(D.NEUR[l]);
        const live = g.brain(n.id) > 0 && g.brain(l) > 0;
        const half = !live && (g.brain(l) > 0 || g.brain(n.id) > 0);
        X.line(ctx, q.x, q.y, p.x, p.y, live ? '#8affd0' : (half ? '#3f8f6e' : '#1d5c46'), live ? 2 : 1);
        if (live) {
          // a signal crawling along a wire that is plugged in at both ends
          const f = ((t * 0.5 + (p.x + q.x) * 0.01) % 1);
          X.rect(ctx, U.lerp(q.x, p.x, f), U.lerp(q.y, p.y, f), 3, 3, '#eafff4');
        }
      }
    }
    // the pulse from a fresh purchase
    for (const p of S.pulses) {
      const f = U.clamp(p.t, 0, 1);
      X.line(ctx, p.a.x, p.a.y, U.lerp(p.a.x, p.b.x, f), U.lerp(p.a.y, p.b.y, f), '#ffffff', 3);
      X.ring(ctx, U.lerp(p.a.x, p.b.x, f), U.lerp(p.a.y, p.b.y, f), 4 + f * 8, '#eafff4', 1);
    }

    for (const n of D.NEURONS) {
      const p = pos(n);
      const lvl = g.brain(n.id);
      const st = nodeState(g, n);
      const on = lvl > 0;
      const sel = S.sel === n.id;
      const grow = S.grew === n.id ? S.growT : 0;
      const r = 11 + (sel ? 1 : 0) + Math.round(grow * 5);
      const face = st === 'dead' ? '#243a4a' : (on ? '#186b4e' : '#1b3a44');
      const edge = st === 'ready' ? '#ffd34d' : (on ? '#8affd0' : '#5f8f9e');
      X.oct(ctx, p.x + 1, p.y + 2, r + 1, 'rgba(4,10,14,0.6)', null);
      X.oct(ctx, p.x, p.y, r, face, edge, sel ? 2 : 1);
      if (on) X.oct(ctx, p.x, p.y, r - 4, '#2fbf7a', null);
      G.draw(ctx, ICON[n.id] || 'hex', p.x - 7, p.y - 7,
        st === 'dead' ? '#4a6a7a' : (on ? '#eafff4' : '#a8d8e0'), on ? '#8affd0' : '#5f8f9e');
      // the level, as pips round the rim
      for (let i = 0; i < n.max; i++) {
        const a = -Math.PI / 2 + (i / n.max) * Math.PI * 2;
        const px = Math.round(p.x + Math.cos(a) * (r + 4)), py = Math.round(p.y + Math.sin(a) * (r + 4));
        X.rect(ctx, px - 1, py - 1, 2, 2, i < lvl ? '#ffd34d' : '#1d5c46');
      }
      if (sel) {
        const k = Math.round(Math.abs(Math.sin(t * 4)) * 2);
        X.rect(ctx, p.x - 2, p.y - r - 8 - k, 4, 4, '#ffd34d');
      }
    }
    ctx.restore();

    /* ------------------------------------------------------------ the panels */
    // THOTS, top left, on a plate bolted to the glass
    X.plate(ctx, 20, 22, 152, 26, '#241f36', '#4a4260', '#120e1c', 4);
    G.draw(ctx, 'star', 26, 28, '#4cff9a', '#1e9e5c');
    F.draw(ctx, U.fmt(g.save.thots) + ' THOTS', 46, 26, '#8affd0');
    F.draw(ctx, 'HIT ROCKS TO MAKE MORE', 46, 36, '#6fbf9e', { shadow: false });

    // the selected neuron, bottom, on the brain's own stolen keyboard
    const n = D.NEUR[S.sel];
    const lvl = g.brain(n.id);
    const st = nodeState(g, n);
    const cost = g.brainCost(n.id);
    X.plate(ctx, 8, VH - 62, VW - 16, 54, '#241f36', '#4a4260', '#120e1c', 5);
    F.draw(ctx, n.name, 18, VH - 56, '#ffe9a8');
    F.draw(ctx, n.blurb, 18, VH - 44, '#c9bce8', { shadow: false });
    F.draw(ctx, 'NOW: ' + (lvl ? n.show(lvl) : 'NOTHING') + '   NEXT: ' + n.show(lvl + 1 > n.max ? n.max : lvl + 1),
      18, VH - 30, '#8affd0', { shadow: false });
    F.draw(ctx, 'LVL ' + lvl + '/' + n.max, VW - 20, VH - 56, '#c9bce8', { right: true });
    if (st === 'full') F.draw(ctx, 'FULL', VW - 20, VH - 30, '#ffd34d', { right: true });
    else if (st === 'dead') F.draw(ctx, 'NOT WIRED UP', VW - 20, VH - 30, '#ff8ad8', { right: true });
    else {
      const can = st === 'ready';
      F.draw(ctx, cost + ' THOTS', VW - 20, VH - 42, can ? '#ffd34d' : '#8a5a5a', { right: true });
      F.draw(ctx, can ? 'PRESS E TO GROW IT' : 'CANNOT AFFORD', VW - 20, VH - 30, can ? '#8affa0' : '#8a5a5a', { right: true });
    }
    F.draw(ctx, 'ESC TO LEAVE THE BRAIN ALONE', VW / 2, VH - 16, '#5f8f7e', { center: true, shadow: false });

    // whatever it is currently saying, in a speech plate off its own eye
    if (S.lineT > 0) {
      const w = F.width(S.line, 1) + 16;
      const bx = U.clamp(CX + 96, 20, VW - w - 20), by = 24;
      ctx.globalAlpha = Math.min(1, S.lineT * 1.6);
      X.plate(ctx, bx, by, w, 18, '#3a1f36', '#6a3f5c', '#1a0e18', 4);
      F.draw(ctx, S.line, bx + 8, by + 5, '#ffb0d6', { shadow: false });
      X.rect(ctx, bx + 10, by + 18, 6, 4, '#3a1f36');
      ctx.globalAlpha = 1;
    }
  }

  PD.mind = { open, close, update, draw, S };
})(window.PD);
