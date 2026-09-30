/* THE BRAIN. It used to be a brain in a jar of acid. It has since bought
   itself a body: BRAINBOT, a big sci-fi robot with the brain under a glass
   dome for a head, a reactor in its chest, claws, and two glowing eyes that
   follow whatever you are pointing at.

   Two trees, on two tabs:
     BODY     the old neuron lattice, paid for in THOTS (from hitting rocks)
     UNLOCKS  what ABAY is allowed to sell you, paid for in BRAIN POINTS:
              one point for every $100 you hand over, to Mr Chum or to the
              brain itself (the FEED buttons)

   Opened by standing next to it and pressing E. ESC closes it. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const D = PD.data;
  const A = PD.audio;
  const G = PD.glyph;
  const X = PD.pxd;
  const PT = PD.paint;

  const VW = 480, VH = 270, HD = 2;
  const CX = 318, CY = 124;                      // the neuron lattice's centre
  const RING = [0, 38, 70, 98];
  const RY = 0.66;
  const ICON = {
    dig: 'drill', air: 'o2', sack: 'cargo', tough: 'hull', nose: 'scan',
    deep: 'depth', pockets: 'hand', boots: 'speed', haggle: 'sell',
    rich: 'coin', brawn: 'gun', know: 'crew'
  };
  const HOLO = '#7ef9ff', HOLOD = '#1a6a88';

  const S = {
    backHit: 0, tab: 1,
    t: 0, sel: 'dig', usel: null, hover: null, flash: 0, pulses: [], bub: [],
    line: '', lineT: 0, shake: 0, grew: null, growT: 0, zap: 0
  };
  for (let i = 0; i < 30; i++) S.bub.push({ x: U.hash2(i, 3), y: U.hash2(i, 7), r: U.hash2(i, 11) > 0.7 ? 2 : 1, sp: 6 + U.hash2(i, 13) * 14 });

  function pos(n) {
    if (n.ring === 0) return { x: CX, y: CY };
    const a = (n.a - 90) * Math.PI / 180;
    return { x: Math.round(CX + Math.cos(a) * RING[n.ring]), y: Math.round(CY + Math.sin(a) * RING[n.ring] * RY) };
  }
  function say(m) { S.line = m; S.lineT = 3.4; }

  /* ------------------------------------------------------ the unlock tree */
  const ROW0 = 44, ROWH = 22, COL0 = 278, COLW = 54;
  function uPos(n) {
    const bi = PD.unlock.BRANCHES.findIndex(b => b.id === n.branch);
    return { x: COL0 + (n.tier - 1) * COLW, y: ROW0 + bi * ROWH };
  }

  function open(g) {
    g.state = 'mind';
    PD.chum.call(g, 'brain');
    S.t = 0; S.pulses.length = 0; S.flash = 0; S.line = ''; S.lineT = 0;
    if (!S.usel && PD.unlock) S.usel = PD.unlock.NODES[0].id;
    A.sfx.tone(120, { type: 'sine', to: 380, dur: 0.55, vol: 0.1 });
    A.sfx.tone(380, { type: 'triangle', to: 700, dur: 0.4, vol: 0.05, delay: 0.28 });
    setTimeout(() => say(S.tab === 1 ? 'I AM BRAINBOT. EVERY $100 YOU GIVE IS A POINT. SPEND THEM.' : 'THOTS IN. SMARTER YOU OUT.'), 400);
  }
  function close(g) {
    if (PD.fx.wipeActive()) return;
    g.wipeTo(240, 135, '#0a1a2a', () => { g.state = 'home'; PD.home.P.lock = 0.3; }, 'static', 0.7);
  }

  function buy(g, n) {
    const lvl = g.brain(n.id);
    if (!g.brainWired(n)) { A.sfx.deny(); S.shake = 0.3; say('NOT PLUGGED IN. WIRE IT TO A NEIGHBOUR FIRST.'); return; }
    if (lvl >= n.max) { A.sfx.deny(); say('THAT ONE IS FULL. YOUR HEAD IS SMALL.'); return; }
    const c = g.brainCost(n.id);
    if (g.save.thots < c) { A.sfx.deny(); S.shake = 0.3; say('NOT ENOUGH THOTS. GO AND HIT A ROCK.'); return; }
    if (!g.brainBuy(n.id)) { A.sfx.deny(); return; }
    if (g.player) { g.player.o2 = Math.min(g.player.o2, g.player.stat('oxygen')); g.player.hull = Math.min(g.player.hull, g.player.stat('hull')); }
    const from = n.links.length ? D.NEUR[n.links.find(l => g.brain(l) > 0) || n.links[0]] : null;
    S.pulses.push({ a: from ? pos(from) : { x: CX, y: CY + 40 }, b: pos(n), t: 0 });
    S.grew = n.id; S.growT = 1; S.zap = 0.6;
    say(U.pick(D.BRAIN_LINES));
    A.sfx.tone(200, { type: 'sine', to: 1100, dur: 0.32, vol: 0.11 });
    A.sfx.tone(1100, { type: 'triangle', to: 1700, dur: 0.22, vol: 0.07, delay: 0.22 });
  }
  function unlockNode(g, n) {
    const st = PD.unlock.canUnlock(g, n);
    if (st === 'done') { say('ALREADY UNLOCKED. GO AND BUY IT ON ABAY.'); return; }
    if (st === 'needs') { A.sfx.deny(); S.shake = 0.3; say('UNLOCK ' + PD.unlock.BY[n.needs].name + ' FIRST.'); return; }
    if (st === 'poor') { A.sfx.deny(); S.shake = 0.3; say('NEEDS ' + n.cost + ' POINTS. $' + U.fmt(n.cost * 100) + ' OF GIVING.'); return; }
    PD.unlock.unlock(g, n.id);
    const p = uPos(n), from = n.needs ? uPos(PD.unlock.BY[n.needs]) : { x: 180, y: 124 };
    S.pulses.push({ a: from, b: p, t: 0 });
    S.grew = n.id; S.growT = 1; S.zap = 0.8; S.flash = 0.6;
    say(U.pick(['UNLOCKED. ABAY HAS IT IN STOCK NOW.', 'NEW STUFF. GO AND SPEND MONEY.', 'THE WAREHOUSE DOORS OPEN. SLOWLY. LOUDLY.']));
    A.sfx.tone(300, { type: 'square', to: 1200, dur: 0.3, vol: 0.08 });
    A.sfx.fanfare && A.sfx.fanfare();
  }
  function feed(g, amt) {
    const n = PD.unlock.feed(g, amt);
    if (!n) { A.sfx.deny(); say('YOU DO NOT HAVE $' + U.fmt(amt) + '. I CHECKED.'); return; }
    S.zap = 0.5; S.flash = 0.3;
    say('+' + n + ' POINT' + (n > 1 ? 'S' : '') + '. DELICIOUS MONEY.');
    A.sfx.tone(600, { type: 'triangle', to: 1300, dur: 0.18, vol: 0.07 });
  }

  /* ---------------------------------------------------------------- update */
  const TABS = [{ x: 160, w: 100, name: 'BODY' }, { x: 264, w: 120, name: 'UNLOCKS' }];
  const FEEDS = [[100, 'FEED $100'], [1000, '$1K'], [10000, '$10K']];
  function feedBtn(i) { return { x: 160 + i * 60 + (i ? 26 : 0), y: 192, w: i ? 52 : 80, h: 12 }; }
  function inRect(m, r) { return m.inside && m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h; }

  function update(dt, g) {
    S.t += dt;
    S.lineT = Math.max(0, S.lineT - dt);
    S.flash = Math.max(0, S.flash - dt * 3);
    S.shake = Math.max(0, S.shake - dt * 3);
    S.growT = Math.max(0, S.growT - dt * 1.6);
    S.zap = Math.max(0, S.zap - dt);
    for (let i = S.pulses.length - 1; i >= 0; i--) { S.pulses[i].t += dt * 2.1; if (S.pulses[i].t > 1.4) S.pulses.splice(i, 1); }
    const IN = PD.input, m = IN.mouse;
    if (IN.hit('esc') || IN.hit('KeyQ') || S.backHit) { S.backHit = 0; close(g); return; }
    const inBack = m.inside && m.x < 96 && m.y < 26;
    // tabs
    if (IN.hit('Tab') || IN.hit('Digit1') || IN.hit('Digit2')) { S.tab = IN.hit('Digit1') ? 0 : IN.hit('Digit2') ? 1 : 1 - S.tab; A.sfx.click(); }
    for (let i = 0; i < 2; i++) if (m.leftPressed && inRect(m, { x: TABS[i].x, y: 6, w: TABS[i].w, h: 16 })) { S.tab = i; A.sfx.click(); return; }
    S.hover = null;
    if (S.tab === 0) {
      for (const n of D.NEURONS) { const p = pos(n); if (U.dist(m.x, m.y, p.x, p.y) < 12) S.hover = n.id; }
      const l = D.NEURONS;
      if (IN.hit('right')) { S.sel = l[(l.findIndex(n => n.id === S.sel) + 1) % l.length].id; A.sfx.click(); }
      if (IN.hit('left')) { S.sel = l[(l.findIndex(n => n.id === S.sel) + l.length - 1) % l.length].id; A.sfx.click(); }
      if (S.hover && m.leftPressed && !inBack) { if (S.sel === S.hover) buy(g, D.NEUR[S.hover]); else { S.sel = S.hover; A.sfx.click(); } }
      if (IN.hit('KeyE') || IN.hit('space') || IN.hit('enter')) buy(g, D.NEUR[S.sel]);
      return;
    }
    const U2 = PD.unlock;
    for (const n of U2.NODES) { const p = uPos(n); if (m.x > p.x - 23 && m.x < p.x + 23 && Math.abs(m.y - p.y) < 9) S.hover = n.id; }
    const cur = U2.BY[S.usel] || U2.NODES[0];
    const moveTo = (bd, td) => {
      const bi = U2.BRANCHES.findIndex(b => b.id === cur.branch);
      if (td) { const row = U2.NODES.filter(n => n.branch === cur.branch); const i = row.indexOf(cur) + td; if (row[i]) S.usel = row[i].id; }
      if (bd) {
        for (let k = 1; k < U2.BRANCHES.length; k++) {
          const b = U2.BRANCHES[(bi + bd * k + U2.BRANCHES.length * 2) % U2.BRANCHES.length];
          const row = U2.NODES.filter(n => n.branch === b.id);
          if (row.length) { S.usel = (row.find(n => n.tier === cur.tier) || row[row.length - 1]).id; break; }
        }
      }
      A.sfx.click();
    };
    if (IN.hit('right')) moveTo(0, 1);
    if (IN.hit('left')) moveTo(0, -1);
    if (IN.hit('down')) moveTo(1, 0);
    if (IN.hit('up')) moveTo(-1, 0);
    if (S.hover && m.leftPressed && !inBack) { if (S.usel === S.hover) unlockNode(g, U2.BY[S.hover]); else { S.usel = S.hover; A.sfx.click(); } }
    for (let i = 0; i < FEEDS.length; i++) if (m.leftPressed && inRect(m, feedBtn(i))) feed(g, FEEDS[i][0]);
    if (IN.hit('KeyF')) feed(g, 100);
    if (IN.hit('KeyE') || IN.hit('space') || IN.hit('enter')) unlockNode(g, U2.BY[S.usel]);
  }

  /* ------------------------------------------------------------ painting */
  let BG = null, BOT = null;
  const METAL = [0x7a86a8, 0xc8d4ee, 0x3e4866, 0x262c44];
  function paintBG() {
    if (BG) return BG;
    const W = VW * HD, H = VH * HD, B = PT.buf(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const q = y / H;
      let c = PT.mix(0x060a1e, 0x10183a, q);
      const n = U.fbm(x * 0.004, y * 0.006, 3);
      if (n > 0.56) c = PT.mix(c, 0x1a2a5a, (n - 0.56) * 3);
      B.set(x, y, c);
    }
    // a hex grid, faint
    for (let y = 0; y < H; y += 26) for (let x = (y / 26 % 2) * 15; x < W; x += 30) { B.rect(x, y, 10, 1, 0x1e3a6a, 0.5); B.rect(x - 4, y + 7, 1, 8, 0x1e3a6a, 0.4); }
    // circuit traces
    for (let k = 0; k < 18; k++) {
      let x = U.hash2(k, 1) * W, y = U.hash2(k, 2) * H;
      for (let s = 0; s < 6; s++) {
        const hz = s % 2 === 0, len = 20 + U.hash2(k, s + 5) * 90;
        const nx = hz ? x + (U.hash2(k, s) > 0.5 ? len : -len) : x, ny = hz ? y : y + (U.hash2(k, s + 9) > 0.5 ? len : -len);
        B.line(x, y, nx, ny, 0x16305a, 2); x = nx; y = ny;
      }
      B.disc(x, y, 3, 0x2a5a9a);
    }
    // the floor: a lit grating
    for (let y = H - 50; y < H; y++) for (let x = 0; x < W; x++) B.set(x, y, (x % 16 < 2 || y % 10 < 2) ? 0x0a1224 : PT.mix(0x1a2440, 0x0e1428, (y - H + 50) / 50));
    B.rect(0, H - 50, W, 2, 0x3a5a9a);
    BG = B.toCanvas();
    return BG;
  }
  // the robot, anchored at its feet, facing you
  function paintBot() {
    if (BOT) return BOT;
    const W = 150 * HD, H = 250 * HD, B = PT.buf(W, H), c = W / 2;
    // pedestal
    B.ellipse(c, H - 16, 120, 14, 0x0e1a34);
    B.block(c - 90, H - 60, 180, 44, [0x4a5678, 0x7a88aa, 0x262c44], 8, 10);
    for (let k = 0; k < 7; k++) B.rect(c - 80 + k * 24, H - 42, 14, 4, 0x1a2a4a);
    // legs, short and piston-y
    for (const s of [-1, 1]) { B.round(c + s * 40 - 16, H - 110, 32, 56, 8, METAL[2]); B.round(c + s * 40 - 12, H - 108, 24, 50, 6, METAL[0]); B.rect(c + s * 40 - 12, H - 100, 24, 3, METAL[3]); B.rect(c + s * 40 - 12, H - 86, 24, 3, METAL[3]); }
    // the torso
    const ty = H - 230;
    B.poly([[c - 78, ty], [c + 78, ty], [c + 62, ty + 128], [c - 62, ty + 128]], METAL[3]);
    B.poly([[c - 74, ty + 3], [c + 74, ty + 3], [c + 59, ty + 124], [c - 59, ty + 124]], METAL[0]);
    B.poly([[c - 74, ty + 3], [c - 40, ty + 3], [c - 30, ty + 124], [c - 59, ty + 124]], METAL[1], 0.45);
    B.poly([[c + 50, ty + 3], [c + 74, ty + 3], [c + 59, ty + 124], [c + 44, ty + 124]], METAL[2], 0.6);
    // the chest plate, with the reactor socket in it
    B.round(c - 44, ty + 18, 88, 72, 12, METAL[2]); B.round(c - 40, ty + 22, 80, 64, 10, 0x1a2240);
    B.disc(c, ty + 54, 24, METAL[3]); B.disc(c, ty + 54, 20, 0x0a1a2a);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; B.rect(c + Math.cos(a) * 22 - 1, ty + 54 + Math.sin(a) * 22 - 1, 3, 3, METAL[1]); }
    for (const [x, y] of [[c - 66, ty + 12], [c + 62, ty + 12], [c - 56, ty + 112], [c + 52, ty + 112]]) B.disc(x, y, 3, METAL[1]);
    B.rect(c - 30, ty + 100, 60, 4, 0xffb03a); B.rect(c - 30, ty + 108, 60, 4, 0x1a2240);
    // arms
    for (const s of [-1, 1]) {
      B.ball(c + s * 86, ty + 16, 22, 20, METAL, true);
      B.line(c + s * 90, ty + 30, c + s * 110, ty + 90, METAL[3], 20); B.line(c + s * 90, ty + 30, c + s * 110, ty + 90, METAL[0], 14);
      B.ball(c + s * 110, ty + 92, 12, 12, METAL);
      B.line(c + s * 110, ty + 96, c + s * 100, ty + 150, METAL[3], 16); B.line(c + s * 110, ty + 96, c + s * 100, ty + 150, METAL[0], 10);
      // the claw
      B.poly([[c + s * 90, ty + 150], [c + s * 112, ty + 150], [c + s * 116, ty + 176], [c + s * 104, ty + 166]], METAL[1]);
      B.poly([[c + s * 90, ty + 150], [c + s * 98, ty + 170], [c + s * 88, ty + 180], [c + s * 84, ty + 160]], METAL[0]);
    }
    // neck and the collar the dome sits in
    B.rect(c - 20, ty - 20, 40, 22, METAL[3]); for (let k = 0; k < 4; k++) B.rect(c - 18, ty - 18 + k * 5, 36, 2, METAL[0]);
    B.ellipse(c, ty - 22, 86, 18, METAL[3]); B.ellipse(c, ty - 24, 82, 14, METAL[0]); B.ellipse(c, ty - 27, 76, 8, METAL[1], 0.4);
    // the visor band with the eye sockets (the eyes are drawn live)
    B.ellipse(c, ty - 14, 58, 9, 0x05080e);
    // the brain, in the dome
    const bx = c, by = ty - 104, rx = 64, ry = 56;
    for (let y = Math.floor(by - ry); y <= by + ry; y++) for (let x = Math.floor(bx - rx); x <= bx + rx; x++) {
      const dx = (x - bx) / rx, dy = (y - by) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const n = U.fbm(x * 0.045, y * 0.045, 3);
      const ridge = Math.abs(Math.sin(x * 0.16 + n * 10 + Math.sin(y * 0.09) * 2.4));
      let v = 0.55 - dx * 0.25 - dy * 0.3 - (dx * dx + dy * dy) * 0.25;
      if (ridge < 0.24) v -= 0.4;
      else if (ridge > 0.85) v += 0.15;
      if (Math.abs(x - bx) < 2.5 && dy < 0.7) v = 0.02;
      const P = [0x6a1a44, 0xb03a70, 0xe06aa0, 0xff9ecb, 0xffd8ea];
      const f = U.clamp(v, 0, 0.999) * P.length;
      let k = Math.floor(f); if (f - k > PT.bayer(x, y)) k = Math.min(P.length - 1, k + 1);
      B.set(x, y, P[k]);
    }
    // wires from the brain down into the collar
    for (const s of [-1, 0, 1]) B.line(bx + s * 24, by + ry - 6, bx + s * 34, ty - 30, 0x2a8ab8, 3);
    // the glass dome over it
    const dx0 = c, dy0 = ty - 96, drx = 80, dry = 88;
    B.ellipse(dx0, dy0, drx, dry, 0x7ef9ff, 0.14);
    for (let a = Math.PI * 1.05; a < Math.PI * 1.9; a += 0.01) B.rect(dx0 + Math.cos(a) * (drx - 8), dy0 + Math.sin(a) * (dry - 8), 3, 3, 0xffffff, 0.5);
    for (let a = 0; a < Math.PI * 2; a += 0.005) B.rect(dx0 + Math.cos(a) * drx, dy0 + Math.sin(a) * dry, 2, 2, 0xaef8ff, 0.7);
    // the antenna
    B.rect(c - 2, dy0 - dry - 24, 4, 26, METAL[2]); B.ball(c, dy0 - dry - 28, 7, 7, [0xff5a6a, 0xffb0b8, 0x8a1a2a], true);
    B.rim(0xffffff, -1, -1, 0.25);
    B.outline(0x04060e);
    BOT = B.toCanvas();
    BOT.eyeY = (ty - 14) / HD; BOT.coreY = (ty + 54) / HD; BOT.domeY = dy0 / HD; BOT.antY = (dy0 - dry - 28) / HD;
    return BOT;
  }

  /* ------------------------------------------------------------ drawing */
  function holo(ctx, x, y, w, h, col, a) {
    ctx.globalAlpha = (a === undefined ? 1 : a) * 0.16; X.rect(ctx, x, y, w, h, col || HOLO);
    ctx.globalAlpha = (a === undefined ? 1 : a) * 0.9;
    X.rect(ctx, x, y, w, 1, col || HOLO); X.rect(ctx, x, y + h - 1, w, 1, HOLOD);
    for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]]) { X.rect(ctx, dx > 0 ? cx : cx - 4, cy, 5, 1, '#ffffff'); X.rect(ctx, cx, dy > 0 ? cy : cy - 4, 1, 5, '#ffffff'); }
    ctx.globalAlpha = 1;
  }
  function hexChip(ctx, x, y, w, h, fill, edge, glow) {
    const pts = [[x - w / 2 + 4, y - h / 2], [x + w / 2 - 4, y - h / 2], [x + w / 2, y], [x + w / 2 - 4, y + h / 2], [x - w / 2 + 4, y + h / 2], [x - w / 2, y]];
    if (glow) PT.glow(ctx, x, y, w * 0.8, edge, 0.35);
    X.poly(ctx, pts.map(p => [p[0] - 1, p[1] - 1]), edge);
    X.poly(ctx, pts.map(p => [p[0] - 1, p[1]]), fill);
  }

  function drawBot(ctx, g, t) {
    const cv = paintBot();
    const bx = 8, by = VH - 250 - 4 + Math.round(Math.sin(t * 1.5) * 1.5);
    ctx.drawImage(cv, bx, by, 150, 250);
    const c = bx + 75;
    // bubbles in the dome, a glow round the brain
    PT.glow(ctx, c, by + cv.domeY + 8, 70, '#ff7ad8', 0.18 + Math.sin(t * 2) * 0.05 + S.flash * 0.3);
    for (const b of S.bub) {
      const yy = by + cv.domeY + 38 - ((b.y * 80 + t * b.sp) % 80), xx = c - 34 + b.x * 68 + Math.sin(t * 2 + b.y * 20) * 2;
      ctx.globalAlpha = 0.5; X.rect(ctx, xx, yy, b.r, b.r, '#d8faff'); ctx.globalAlpha = 1;
    }
    // the reactor in its chest
    const pulse = 0.6 + Math.sin(t * 4) * 0.25 + S.zap;
    PT.glow(ctx, c, by + cv.coreY, 26, '#7ef9ff', 0.5 * pulse);
    X.blob(ctx, c, by + cv.coreY, 8, 8, '#2ad8ff'); X.blob(ctx, c, by + cv.coreY, 5, 5, '#c8faff');
    // the eyes: they look at whatever you are pointing at
    const m = PD.input.mouse;
    const lx = U.clamp((m.x - c) * 0.02, -4, 4), ly = U.clamp((m.y - (by + cv.eyeY)) * 0.02, -1, 1.5);
    const blink = Math.sin(t * 0.8) > 0.97;
    for (const s of [-1, 1]) {
      const ex = c + s * 16 + lx, ey = by + cv.eyeY + ly;
      PT.glow(ctx, ex, ey, 10, '#7ef9ff', 0.6);
      if (blink) X.rect(ctx, ex - 5, ey, 10, 1, '#7ef9ff');
      else { X.blob(ctx, ex, ey, 5, 3.2, '#2ad8ff'); X.blob(ctx, ex, ey, 2.5, 1.8, '#ffffff'); }
    }
    // collar lights
    for (let k = 0; k < 7; k++) { const on = Math.floor(t * 6 + k) % 7 === 0; X.rect(ctx, c - 30 + k * 10, by + cv.eyeY - 13, 3, 2, on ? '#ffd34d' : '#5a4a2a'); }
    // the antenna sparks, and zaps when something is bought
    const ay = by + cv.antY;
    PT.glow(ctx, c, ay, 10, '#ff5a6a', 0.5 + Math.sin(t * 6) * 0.3);
    if (S.zap > 0 || Math.sin(t * 1.3) > 0.98) {
      for (let k = 0; k < 3; k++) {
        let x = c, y = ay;
        const tx = c + (k - 1) * 40 + U.rand(-10, 10), ty = ay + U.rand(20, 60);
        for (let s = 0; s < 5; s++) { const nx = U.lerp(x, tx, 0.3) + U.rand(-6, 6), ny = U.lerp(y, ty, 0.3); X.line(ctx, x, y, nx, ny, '#c8faff'); x = nx; y = ny; }
      }
    }
    // what it is saying
    if (S.lineT > 0) {
      const lines = wrap(S.line, 22);
      const w = 22 * 6 + 12, h = lines.length * 9 + 8, x = 12, y = 30;
      ctx.globalAlpha = Math.min(1, S.lineT * 2);
      holo(ctx, x, y, w, h, '#ff9ad8');
      lines.forEach((l, i) => F.draw(ctx, l, x + 6, y + 4 + i * 9, '#ffd8ee', { shadow: false }));
      ctx.globalAlpha = 1;
    }
  }
  function wrap(str, n) {
    const out = []; let line = '';
    for (const w of String(str).split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }
    if (line) out.push(line);
    return out;
  }

  function nodeState(g, n) {
    const lvl = g.brain(n.id);
    if (lvl >= n.max) return 'full';
    if (!g.brainWired(n)) return 'dead';
    return g.save.thots >= g.brainCost(n.id) ? 'ready' : 'poor';
  }

  function drawBody(ctx, g, t) {
    holo(ctx, 164, 26, 308, 172, HOLO, 0.6);
    for (const n of D.NEURONS) {
      const p = pos(n);
      for (const l of n.links) {
        const q = pos(D.NEUR[l]);
        const live = g.brain(n.id) > 0 && g.brain(l) > 0;
        X.line(ctx, q.x, q.y, p.x, q.y, live ? '#7ef9ff' : '#1e4a6a', live ? 2 : 1);
        X.line(ctx, p.x, q.y, p.x, p.y, live ? '#7ef9ff' : '#1e4a6a', live ? 2 : 1);
        if (live) { const f = ((t * 0.6 + (p.x + q.x) * 0.01) % 1); const mx = f < 0.5 ? U.lerp(q.x, p.x, f * 2) : p.x, my = f < 0.5 ? q.y : U.lerp(q.y, p.y, (f - 0.5) * 2); X.rect(ctx, mx - 1, my - 1, 3, 3, '#ffffff'); }
      }
    }
    for (const p of S.pulses) { const f = U.clamp(p.t, 0, 1); X.line(ctx, p.a.x, p.a.y, U.lerp(p.a.x, p.b.x, f), U.lerp(p.a.y, p.b.y, f), '#ffffff', 3); }
    for (const n of D.NEURONS) {
      const p = pos(n), lvl = g.brain(n.id), st = nodeState(g, n), on = lvl > 0, sel = S.sel === n.id;
      const grow = S.grew === n.id ? S.growT : 0;
      const w = 28 + grow * 8, h = 18 + grow * 4;
      const edge = st === 'ready' ? '#ffd34d' : on ? '#7ef9ff' : st === 'dead' ? '#2a3a5a' : '#4a7a9a';
      hexChip(ctx, p.x, p.y, w, h, on ? '#0e4a5a' : '#0a1a2e', edge, sel || st === 'ready');
      G.draw(ctx, ICON[n.id] || 'star', p.x - 7, p.y - 7, st === 'dead' ? '#3a5a6a' : on ? '#eafff4' : '#9ad8e8', on ? '#7ef9ff' : '#4a7a9a');
      for (let i = 0; i < n.max; i++) X.rect(ctx, p.x - n.max * 1.5 + i * 3, p.y + h / 2 + 2, 2, 2, i < lvl ? '#ffd34d' : '#1e3a5a');
      if (sel) { const k = Math.round(Math.abs(Math.sin(t * 4)) * 2); X.frame(ctx, p.x - w / 2 - 3 - k, p.y - h / 2 - 3 - k, w + 6 + k * 2, h + 6 + k * 2, '#ffd34d'); }
    }
    // the chosen one
    const n = D.NEUR[S.sel], lvl = g.brain(n.id), st = nodeState(g, n), cost = g.brainCost(n.id);
    holo(ctx, 164, 206, 308, 56, HOLO);
    F.draw(ctx, n.name, 172, 212, '#ffffff', { scale: 2, shadow: false });
    F.draw(ctx, n.blurb, 172, 230, '#9ad8e8', { shadow: false });
    F.draw(ctx, 'NEXT: ' + n.show(Math.min(n.max, lvl + 1)) + '   ' + lvl + '/' + n.max, 172, 241, '#7ef9ff', { shadow: false });
    const lab = st === 'full' ? 'FULL' : st === 'dead' ? 'NOT WIRED' : (st === 'ready' ? 'E: GROW  ' : 'NEED ') + cost + ' THOTS';
    F.draw(ctx, lab, 464, 252, st === 'ready' ? '#ffd34d' : '#ff9ad8', { right: true, shadow: false });
  }

  function thumb(ctx, kind, id, x, y, s, t) {
    if (kind === 'build') {
      const b = PD.buildart.BY[id];
      const cv = b.where === 'up' ? (b.up === 'house' ? PD.home.API.artHouse(b.tier) : PD.home.API.artBed(b.tier)) : PD.buildart.art(id);
      if (!cv) return;
      const w = cv.width / HD, h = cv.height / HD, k = Math.min(s / w, s / h) * 1.3;
      ctx.drawImage(cv, x - w * k / 2, y - h * k / 2, w * k, h * k);
    } else if (kind === 'cosm') PD.cosm.icon(ctx, id, x, y, s, t);
    else { X.blob(ctx, x, y, s * 0.4, s * 0.4, '#ff5a6a'); F.draw(ctx, D.SHIPX[id].name.slice(0, 2), x, y - 3, '#ffffff', { center: true, shadow: false }); }
  }
  function itemName(kind, id) {
    if (kind === 'build') return PD.buildart.BY[id].name;
    if (kind === 'cosm') return PD.cosm.BY[id].name;
    return D.SHIPX[id].name;
  }

  function drawUnlocks(ctx, g, t) {
    const U2 = PD.unlock;
    holo(ctx, 164, 26, 308, 160, HOLO, 0.6);
    // the root, and the traces out to each branch
    const root = { x: 180, y: 110 };
    hexChip(ctx, root.x, root.y, 26, 18, '#0e4a5a', '#7ef9ff', true);
    F.draw(ctx, 'CORE', root.x, root.y - 3, '#ffffff', { center: true, shadow: false });
    U2.BRANCHES.forEach((b, i) => {
      const y = ROW0 + i * ROWH;
      X.line(ctx, root.x + 12, root.y, 198, root.y, '#1e4a6a');
      X.line(ctx, 198, root.y, 198, y, '#1e4a6a');
      X.line(ctx, 198, y, COL0 - 24, y, '#1e4a6a');
      F.draw(ctx, b.name, 202, y - 8, b.col, { shadow: false });
      const row = U2.NODES.filter(n => n.branch === b.id);
      for (let k = 1; k < row.length; k++) {
        const a = uPos(row[k - 1]), c = uPos(row[k]);
        const live = U2.has(g, row[k - 1].id) && U2.has(g, row[k].id);
        X.line(ctx, a.x + 23, a.y, c.x - 23, c.y, live ? b.col : '#1e4a6a', live ? 2 : 1);
      }
    });
    for (const p of S.pulses) { const f = U.clamp(p.t, 0, 1); X.line(ctx, p.a.x, p.a.y, U.lerp(p.a.x, p.b.x, f), U.lerp(p.a.y, p.b.y, f), '#ffffff', 3); }
    for (const n of U2.NODES) {
      const p = uPos(n), st = U2.canUnlock(g, n), sel = S.usel === n.id, grow = S.grew === n.id ? S.growT : 0;
      const edge = st === 'done' ? n.col : st === 'ready' ? '#ffd34d' : st === 'poor' ? '#4a7a9a' : '#243a5a';
      hexChip(ctx, p.x, p.y, 46 + grow * 6, 16 + grow * 3, st === 'done' ? '#123a4a' : '#0a1a2e', edge, sel || st === 'ready');
      if (st === 'done') F.draw(ctx, U2.ROMAN[n.tier], p.x, p.y - 3, '#ffffff', { center: true, shadow: false });
      else if (st === 'needs') G.draw(ctx, 'lock', p.x - 7, p.y - 7, '#3a5a7a', '#243a5a');
      else F.draw(ctx, n.cost + 'P', p.x, p.y - 3, st === 'ready' ? '#ffd34d' : '#6a9ab8', { center: true, shadow: false });
      if (sel) { const k = Math.round(Math.abs(Math.sin(t * 4)) * 2); X.frame(ctx, p.x - 26 - k, p.y - 11 - k, 52 + k * 2, 22 + k * 2, '#ffd34d'); }
    }
    // feed the brain
    for (let i = 0; i < FEEDS.length; i++) {
      const r = feedBtn(i), over = inRect(PD.input.mouse, r);
      hexChip(ctx, r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, over ? '#1a5a3a' : '#0e2a24', '#8affa0', over);
      F.draw(ctx, FEEDS[i][1], r.x + r.w / 2, r.y + 3, '#caffd8', { center: true, shadow: false });
    }
    F.draw(ctx, '$100 = 1 POINT', 468, 195, '#6a9ab8', { right: true, shadow: false });
    // the chosen node
    const n = U2.BY[S.usel] || U2.NODES[0], st = U2.canUnlock(g, n);
    holo(ctx, 164, 206, 308, 56, n.col);
    F.draw(ctx, n.name, 172, 211, '#ffffff', { scale: 2, shadow: false });
    F.draw(ctx, n.items.length + ' THINGS ON ABAY', 172, 228, n.col, { shadow: false });
    const shown = n.items.slice(0, 7);
    shown.forEach(([k, id], i) => thumb(ctx, k, id, 180 + i * 22, 248, 18, t));
    if (shown.length) F.draw(ctx, itemName(shown[0][0], shown[0][1]) + (n.items.length > 1 ? ' AND MORE' : ''), 336, 228, '#9ad8e8', { shadow: false });
    const lab = st === 'done' ? 'UNLOCKED' : st === 'needs' ? 'NEEDS ' + U2.BY[n.needs].name : (st === 'ready' ? 'E: UNLOCK  ' : 'NEED ') + n.cost + ' POINTS';
    F.draw(ctx, lab, 464, 252, st === 'ready' ? '#ffd34d' : st === 'done' ? '#8affa0' : '#ff9ad8', { right: true, shadow: false });
  }

  function draw(ctx, g, t) {
    ctx.drawImage(paintBG(), 0, 0, VW, VH);
    const sh = S.shake > 0 ? Math.round(Math.sin(t * 70) * S.shake * 8) : 0;
    ctx.save(); ctx.translate(sh, 0);
    drawBot(ctx, g, t);
    // the tabs and what you have to spend
    for (let i = 0; i < 2; i++) {
      const T = TABS[i], on = S.tab === i;
      hexChip(ctx, T.x + T.w / 2, 14, T.w, 16, on ? '#123a4a' : '#0a1424', on ? '#7ef9ff' : '#2a4a6a', on);
      F.draw(ctx, i === 0 ? 'BODY ' + U.fmt(g.save.thots) + ' THOTS' : 'UNLOCKS ' + U.fmt((g.save.sp || 0)) + ' PTS', T.x + T.w / 2, 11, on ? '#ffffff' : '#6a9ab8', { center: true, shadow: false });
    }
    F.draw(ctx, 'TAB: SWITCH', 470, 11, '#3a6a8a', { right: true, shadow: false });
    if (S.tab === 0) drawBody(ctx, g, t); else drawUnlocks(ctx, g, t);
    ctx.restore();
    // scanlines over the whole hologram
    ctx.globalAlpha = 0.07;
    for (let y = (Math.floor(t * 20) % 3); y < VH; y += 3) X.rect(ctx, 160, y, VW - 160, 1, '#7ef9ff');
    ctx.globalAlpha = 1;
    if (S.flash > 0) { ctx.globalAlpha = S.flash * 0.25; X.rect(ctx, 0, 0, VW, VH, '#7ef9ff'); ctx.globalAlpha = 1; }
    if (PD.ui.backBtn(ctx, 'THE ROOM', t)) S.backHit = 1;
  }

  // a small BRAINBOT for the corner of the cave, feet at (x, y)
  function drawMini(ctx, x, y, t) {
    const cv = paintBot(), k = 0.32, w = 150 * k, h = 250 * k, by = y - h + Math.round(Math.sin(t * 1.5));
    ctx.drawImage(cv, Math.round(x - w / 2), Math.round(by), w, h);
    PT.glow(ctx, x, by + cv.domeY * k, 22, '#ff7ad8', 0.25);
    PT.glow(ctx, x, by + cv.coreY * k, 8, '#7ef9ff', 0.5 + Math.sin(t * 4) * 0.2);
    const blink = Math.sin(t * 0.8) > 0.97;
    for (const s of [-1, 1]) X.rect(ctx, x + s * 5 - 1, by + cv.eyeY * k - (blink ? 0 : 1), 3, blink ? 1 : 2, '#aef8ff');
    X.rect(ctx, x - 1, by + cv.antY * k - 1, 2, 2, Math.sin(t * 6) > 0 ? '#ff5a6a' : '#6a1a2a');
  }

  PD.mind = { open, close, update, draw, drawMini, S };
})(window.PD);
