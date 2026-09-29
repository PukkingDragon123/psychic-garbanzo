/* BUILDING THINGS ON YOUR MOON.
   Press B (or the hologram button in the corner) and the view pulls right
   back so you can see a third of the planet at once, and a hologram rises
   out of a projector at the bottom of the screen: a ring of cards turning
   in the air, one for everything you own, each with a little spinning
   picture of it. Pick one and it follows your cursor round the surface as a
   ghost -- green where it fits, red where it does not -- and a big button
   says CONFIRM. Press it and the thing pops out of the ground.

   Everything is bought on ABAY first; the menu shows you what you have and
   what the next thing costs. Some of it earns (miners, factories, a money
   printer, a piggy bank that pays interest), some of it makes you better at
   digging, some of it is fun: you can ride the roller coaster and the
   ferris wheel, fire yourself out of the cannon, swim in the pool, bounce
   on the trampoline. And once there is something fun on the moon, tourists
   start turning up in little saucers to use it, and they pay for tickets. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const FX = PD.fx;
  const PT = PD.paint;
  const BA = PD.buildart;
  const VW = 480, VH = 270, HD = 2;

  const M = { on: 0, scene: 'out', mode: 'menu', cat: 0, sel: 0, rot: 0, t: 0, cx: 0, item: null, valid: false, why: '',
    msg: '', msgT: 0, k: 0, pick: null, hold: 0 };
  let G = null;                      // the game, once we have seen it

  /* ------------------------------------------------------------ the save */
  function st(g) {
    if (!g.save.build || typeof g.save.build !== 'object') g.save.build = {};
    const b = g.save.build;
    if (!b.inv) b.inv = { miner1: 1, tree1: 2, lamp: 2, flowers: 1, bench: 1, trampoline: 1, beanbag: 1, lavalamp: 1 };
    if (!b.out) b.out = [];
    if (!b.in) b.in = [];
    if (b.house === undefined) b.house = 0;
    if (b.bed === undefined) b.bed = 0;
    if (!b.last) b.last = Date.now();
    return b;
  }
  function owned(g, id) { return st(g).inv[id] || 0; }
  function houseTier(g) { return st(g).house | 0; }
  function bedTier(g) { return st(g).bed | 0; }
  function price(id) { const b = BA.BY[id]; return b ? b.price : 0; }
  // bought on ABAY: it goes in the build inventory
  function buy(g, id) {
    const b = BA.BY[id];
    if (!b) return false;
    const s = st(g);
    if (b.where === 'up') {
      const have = b.up === 'house' ? s.house : s.bed;
      if (have >= b.tier || (s.inv[id] || 0) > 0) { A.sfx.deny(); return false; }
    }
    if (g.save.credits < b.price) { A.sfx.deny(); return false; }
    g.save.credits -= b.price;
    s.inv[id] = (s.inv[id] || 0) + 1;
    A.sfx.buy();
    g.saveGame();
    return true;
  }

  /* ------------------------------------------------------------ effects */
  function placedAll(g) { const s = st(g); return s.out.concat(s.in); }
  function bonus(g, id) {
    let v = 0;
    for (const o of placedAll(g)) { const b = BA.BY[o.id]; if (b && b.fx && b.fx.bonus === id) v += b.fx.v; }
    return v;
  }
  function valueBonus(g) {
    let v = 0;
    for (const o of placedAll(g)) { const b = BA.BY[o.id]; if (b && b.fx && b.fx.value) v += b.fx.value; }
    return v;
  }
  function funScore(g) { let f = 0; for (const o of st(g).out) { const b = BA.BY[o.id]; if (b && b.fun) f += b.fun; } return f; }

  /* Water, for swimming in and for floaties to float on. */
  function waterAt(x) {
    if (!G) return null;
    const H = PD.home.API;
    for (const o of st(G).out) {
      const b = BA.BY[o.id];
      if (!b || !b.water) continue;
      if (Math.abs(H.wdist(x, o.x)) < b.w / 2 - 2) return { o, b, depth: b.depth, lava: !!b.lava };
    }
    return null;
  }
  function waterDepth(x) { const w = waterAt(x); return w ? w.depth : 0; }

  /* ------------------------------------------------------------ production */
  let firstTick = true;
  function produce(g, o, b, fxOn) {
    const fx = b.fx, H = PD.home.API;
    const show = (txt, col) => {
      if (!fxOn || g.state !== 'home' || PD.home.S.scene !== 'out' || !H.visible(o.x)) return;
      const p = H.toBuf(o.x, H.groundY(o.x) - b.h - 6);
      FX.text(p.x, p.y, txt, col, 0);
    };
    if (fx.ore) {
      const mat = fx.ore[Math.floor(Math.random() * fx.ore.length)];
      g.save.vault[mat] = (g.save.vault[mat] || 0) + 1;
      const m = PD.data.MAT[mat];
      show('+1 ' + m.name.toUpperCase(), m.c[0]);
      return { ore: 1 };
    }
    if (fx.sell) {
      let best = -1, bv = 0;
      for (const k in g.save.vault) if (g.save.vault[k] > 0) { const v = g.priceOf(+k); if (v > bv) { bv = v; best = +k; } }
      if (best < 0) return null;
      g.save.vault[best]--;
      if (g.save.vault[best] <= 0) delete g.save.vault[best];
      const gross = Math.round(bv * (1 + fx.markup) * (1 + g.baseBonus('refinery')));
      const cut = PD.chum.takeCut(g, gross);
      g.save.credits += gross - cut; g.save.totalEarned += gross - cut;
      show('+$' + U.fmt(gross - cut), '#8affa0');
      return { cash: gross - cut };
    }
    if (fx.cash) {
      if (fx.sunny && H.nightAt(o.x) > 0.5) return null;
      g.save.credits += fx.cash; g.save.totalEarned += fx.cash;
      show('+$' + fx.cash, '#8affa0');
      return { cash: fx.cash };
    }
    if (fx.interest) {
      const v = Math.min(fx.cap, Math.round(g.save.credits * fx.interest));
      if (v <= 0) return null;
      g.save.credits += v; g.save.totalEarned += v;
      show('+$' + U.fmt(v) + ' INTEREST', '#ffd34d');
      return { cash: v };
    }
    return null;
  }
  function tick(dt, g) {
    G = g;
    const s = st(g);
    if (firstTick) {
      firstTick = false;
      // whatever the machines did while the game was shut
      const away = U.clamp((Date.now() - s.last) / 1000, 0, 7200);
      if (away > 30) {
        let ore = 0, cash = 0;
        for (const o of s.out) {
          const b = BA.BY[o.id];
          if (!b || !b.fx || !b.fx.every) continue;
          const n = Math.min(400, Math.floor(((o.acc || 0) + away) / b.fx.every));
          for (let i = 0; i < n; i++) { const r = produce(g, o, b, false); if (!r) break; ore += r.ore || 0; cash += r.cash || 0; }
        }
        if (ore || cash) M.away = { ore, cash, t: 7 };
      }
    }
    for (const o of s.out) {
      const b = BA.BY[o.id];
      if (!b || !b.fx || !b.fx.every) continue;
      o.acc = (o.acc || 0) + dt;
      if (o.acc >= b.fx.every) { o.acc -= b.fx.every; produce(g, o, b, true); }
    }
    s.last = Date.now();
  }

  /* ------------------------------------------------------------ placing */
  function fits(g, id, x) {
    const b = BA.BY[id], s = st(g), H = PD.home.API;
    if (!b) return [false, ''];
    if (M.scene === 'in') {
      if (x - b.w / 2 < 14 || x + b.w / 2 > PD.home.IN_W - 14) return [false, 'TOO CLOSE TO THE WALL'];
      for (const o of s.in) { const ob = BA.BY[o.id]; if (Math.abs(o.x - x) < (ob.w + b.w) / 2 - 2) return [false, 'SOMETHING IS IN THE WAY']; }
      return [true, ''];
    }
    const half = b.w / 2;
    if (b.floatie) {
      const w = waterAt(x);
      if (!w || w.lava) return [false, w ? 'IT WOULD MELT' : 'FLOATIES GO IN WATER'];
      if (Math.abs(H.wdist(x, w.o.x)) > w.b.w / 2 - half) return [false, 'MOVE IT FURTHER IN'];
      for (const o of s.out) { const ob = BA.BY[o.id]; if (ob.floatie && Math.abs(H.wdist(o.x, x)) < half + ob.w / 2 - 4) return [false, 'THERE IS A FLOATIE THERE']; }
      return [true, ''];
    }
    for (const r of H.RESERVED) { const c = (r[0] + r[1]) / 2, hw = (r[1] - r[0]) / 2; if (Math.abs(H.wdist(x, c)) < hw + half) return [false, 'THAT SPOT IS TAKEN']; }
    for (let i = 0; i < H.TRASH.length; i++) if (!H.cleaned(g, i) && Math.abs(H.wdist(x, H.TRASH[i].x)) < half + 14) return [false, 'CLEAR THE RUBBISH FIRST'];
    for (const o of s.out) {
      const ob = BA.BY[o.id];
      if (ob.floatie) continue;
      if (Math.abs(H.wdist(o.x, x)) < half + ob.w / 2 - 2) return [false, 'SOMETHING IS IN THE WAY'];
    }
    return [true, ''];
  }
  function place(g, id, x) {
    const s = st(g), b = BA.BY[id];
    const o = { id, x: M.scene === 'out' ? PD.home.API.wrap(x) : x, born: g.time, acc: 0 };
    (M.scene === 'out' ? s.out : s.in).push(o);
    s.inv[id]--;
    if (s.inv[id] <= 0) delete s.inv[id];
    const p = M.scene === 'out' ? PD.home.API.toBuf(o.x, PD.home.groundY(o.x)) : { x: o.x - Math.round(g.intCam), y: PD.home.FLOOR };
    const px = M.scene === 'out' ? p.x : o.x;
    FX.ring(px, p.y - 4, 4, 40, 0.6, '#7ef9ff', 2);
    for (let k = 0; k < 24; k++) FX.spawn({ x: px + U.rand(-b.w / 2, b.w / 2), y: p.y - 4, vx: U.rand(-40, 40), vy: U.rand(-120, -30), life: 0.9, size: 2, color: k % 2 ? '#7ef9ff' : '#ffffff', grav: 120, drag: 1, glow: 1 });
    A.sfx.tone(520, { type: 'square', to: 1040, dur: 0.18, vol: 0.08 });
    A.sfx.tone(780, { type: 'triangle', to: 1560, dur: 0.25, vol: 0.06 });
    g.saveGame();
  }
  function upgrade(g, b) {
    const s = st(g);
    if (b.up === 'house') s.house = b.tier; else s.bed = b.tier;
    s.inv[b.id]--; if (s.inv[b.id] <= 0) delete s.inv[b.id];
    A.sfx.fanfare && A.sfx.fanfare();
    note(b.up === 'house' ? 'THE HOUSE IS BIGGER NOW. GO AND LOOK.' : 'NEW BED. SLEEP ON IT.');
    g.saveGame();
  }
  function pickUp(g, o) {
    const s = st(g);
    const list = M.scene === 'out' ? s.out : s.in;
    const i = list.indexOf(o);
    if (i < 0) return;
    // a pool with floaties in it takes the floaties with it
    const b = BA.BY[o.id];
    if (b.water) for (let k = list.length - 1; k >= 0; k--) { const f = list[k], fb = BA.BY[f.id]; if (fb.floatie && Math.abs(PD.home.API.wdist(f.x, o.x)) < b.w / 2) { list.splice(k, 1); s.inv[f.id] = (s.inv[f.id] || 0) + 1; } }
    list.splice(list.indexOf(o), 1);
    s.inv[o.id] = (s.inv[o.id] || 0) + 1;
    A.sfx.tone(900, { type: 'square', to: 300, dur: 0.18, vol: 0.07 });
    g.saveGame();
  }
  function note(m) { M.msg = m; M.msgT = 2.6; }

  /* ------------------------------------------------------------ the menu */
  function catsFor(scene) { return scene === 'in' ? ['FURNITURE', 'HOME'] : ['INDUSTRY', 'FUN', 'NATURE', 'DECOR', 'HOME']; }
  function itemsIn(g, cat) {
    return BA.LIST.filter(b => b.cat === cat && (cat !== 'HOME' || (M.scene === 'in' ? b.up === 'bed' : b.up === 'house')))
      .sort((a, b) => (owned(g, b.id) > 0) - (owned(g, a.id) > 0) || a.price - b.price);
  }
  function open(g, scene) {
    G = g;
    M.on = 1; M.scene = scene; M.mode = 'menu'; M.t = 0; M.k = 0; M.sel = 0; M.cat = 0; M.rot = 0; M.hold = 0;
    M.cx = PD.home.P.x;
    A.sfx.tone(300, { type: 'sine', to: 900, dur: 0.4, vol: 0.07 });
    A.sfx.tone(600, { type: 'triangle', to: 1200, dur: 0.3, vol: 0.05 });
    if (!g.save.seen) g.save.seen = {};
    if (!g.save.seen.build && PD.talk) {
      g.save.seen.build = 1;
      PD.talk.start(g, { start: 'a', nodes: {
        a: { who: 'zorb', text: 'HELLO. I AM THE BUILD HOLOGRAM. I CAME FREE WITH THE MOON.', next: 'b' },
        b: { who: 'zorb', text: 'EVERYTHING YOU BUY ON ABAY TURNS UP IN HERE. PICK IT, PUT IT DOWN, PRESS CONFIRM.', choices: [
          { t: 'WHAT SHOULD I BUILD?', next: 'c' }, { t: 'GOT IT.', next: null }] },
        c: { who: 'zorb', text: 'MINERS DIG WHILE YOU ARE OUT. FACTORIES SELL FOR YOU. FUN THINGS BRING TOURISTS, AND TOURISTS PAY.', next: 'd' },
        d: { who: 'zorb', text: 'ALSO YOU CAN RIDE THE ROLLER COASTER. I WOULD. I CANNOT. I AM LIGHT.', next: null }
      } });
    }
  }
  function close() { M.on = 0; A.sfx.tone(900, { type: 'sine', to: 300, dur: 0.3, vol: 0.06 }); PD.home.P.lock = 0.25; }
  function active() { return !!M.on; }
  function focusX() { return M.cx; }

  // where the buttons are, so both the keys and the taps land on the same thing
  const BTN = {
    close: { x: 440, y: 16, w: 26, h: 22 },
    place: { x: 180, y: 236, w: 120, h: 22 },
    move: { x: 16, y: 237, w: 76, h: 20 },
    confirm: { x: 190, y: 240, w: 100, h: 24 },
    cancel: { x: 300, y: 242, w: 70, h: 20 },
    left: { x: 110, y: 240, w: 34, h: 24 }, right: { x: 148, y: 240, w: 34, h: 24 }
  };
  function hit(b, m) { return m.inside && m.x >= b.x && m.x < b.x + b.w && m.y >= b.y && m.y < b.y + b.h; }
  // the little hologram button in the corner of the screen, outside build mode
  const OPENBTN = { x: VW - 62, y: VH - 44, w: 54, h: 20 };
  function hitButton(mx, my) { return mx >= OPENBTN.x && mx < OPENBTN.x + OPENBTN.w && my >= OPENBTN.y && my < OPENBTN.y + OPENBTN.h; }

  function update(dt, g) {
    G = g;
    const IN = PD.input, m = IN.mouse;
    M.t += dt; M.k = Math.min(1, M.k + dt * 3);
    M.msgT = Math.max(0, M.msgT - dt);
    if (PD.talk && PD.talk.active()) return;
    const cats = catsFor(M.scene);
    const list = itemsIn(g, cats[M.cat]);
    M.sel = U.clamp(M.sel, 0, Math.max(0, list.length - 1));
    { const n = Math.max(1, list.length); M.n = n; let d = ((M.sel - M.rot) % n + n * 1.5) % n - n / 2; M.rot += d * (1 - Math.pow(0.2, dt * 6)); M.rot = ((M.rot % n) + n) % n; }
    const esc = IN.hit('esc') || IN.hit('KeyB');
    if (M.mode === 'menu') {
      if (esc || (m.leftPressed && hit(BTN.close, m))) { close(); return; }
      if (IN.hit('left')) { M.sel = (M.sel + list.length - 1) % Math.max(1, list.length); tick1(); }
      if (IN.hit('right')) { M.sel = (M.sel + 1) % Math.max(1, list.length); tick1(); }
      if (IN.hit('up')) { M.cat = (M.cat + cats.length - 1) % cats.length; M.sel = 0; M.rot = 0; tick1(); }
      if (IN.hit('down')) { M.cat = (M.cat + 1) % cats.length; M.sel = 0; M.rot = 0; tick1(); }
      // the tabs
      for (let i = 0; i < cats.length; i++) {
        const tw = Math.floor(416 / cats.length), tx = 20 + i * tw;
        if (m.leftPressed && m.inside && m.x > tx && m.x < tx + tw - 4 && m.y > 16 && m.y < 38) { M.cat = i; M.sel = 0; M.rot = 0; tick1(); return; }
      }
      if (m.leftPressed && hit({ x: 18, y: CY - 12, w: 18, h: 24 }, m)) { M.sel = (M.sel + list.length - 1) % Math.max(1, list.length); tick1(); return; }
      if (m.leftPressed && hit({ x: 444, y: CY - 12, w: 18, h: 24 }, m)) { M.sel = (M.sel + 1) % Math.max(1, list.length); tick1(); return; }
      // the cards: tap one to spin it to the front, tap the front one to use it
      if (m.leftPressed && m.inside && m.y > 50 && m.y < 172) {
        const c = cardAt(m.x, m.y, list.length);
        if (c >= 0) { if (c === M.sel) choose(g, list[c]); else { M.sel = c; tick1(); } return; }
      }
      if (m.leftPressed && hit(BTN.move, m)) { M.mode = 'pick'; M.cx = PD.home.P.x; tick1(); return; }
      if (IN.hit('KeyM')) { M.mode = 'pick'; M.cx = PD.home.P.x; tick1(); return; }
      if ((IN.hit('KeyE') || IN.hit('enter') || IN.hit('space') || (m.leftPressed && hit(BTN.place, m))) && list[M.sel]) choose(g, list[M.sel]);
      return;
    }
    // placing or picking: move the cursor about the moon
    let ix = 0;
    if (IN.down('left')) ix -= 1;
    if (IN.down('right')) ix += 1;
    if (m.left && m.inside && m.y < 220 && !hit(BTN.left, m) && !hit(BTN.right, m)) {
      const wx = PD.home.fromScreenX(m.x) + (M.scene === 'out' ? 0 : g.intCam);
      M.cx = M.scene === 'out' ? M.cx + PD.home.API.wdist(wx, M.cx) * 0.3 : U.damp(M.cx, wx, 0.3, dt);
    }
    if (m.left && hit(BTN.left, m)) ix = -1;
    if (m.left && hit(BTN.right, m)) ix = 1;
    M.hold = ix ? M.hold + dt : 0;
    M.cx += ix * (60 + Math.min(1.5, M.hold) * 120) * dt;
    if (M.scene === 'in') M.cx = U.clamp(M.cx, 16, PD.home.IN_W - 16);
    if (M.mode === 'place') {
      const r = fits(g, M.item, M.cx);
      M.valid = r[0]; M.why = r[1];
      if (esc || (m.leftPressed && hit(BTN.cancel, m))) { M.mode = 'menu'; tick1(); return; }
      if (IN.hit('KeyE') || IN.hit('enter') || IN.hit('space') || (m.leftPressed && hit(BTN.confirm, m))) {
        if (M.valid) {
          place(g, M.item, M.cx);
          if (owned(g, M.item) <= 0) M.mode = 'menu';
        } else { A.sfx.deny(); note(M.why); }
      }
      return;
    }
    // picking something up
    const list2 = M.scene === 'out' ? st(g).out : st(g).in;
    M.pick = null;
    let bd = 1e9;
    for (const o of list2) {
      const d = Math.abs(M.scene === 'out' ? PD.home.API.wdist(o.x, M.cx) : o.x - M.cx);
      if (d < BA.BY[o.id].w / 2 + 4 && d < bd) { bd = d; M.pick = o; }
    }
    if (esc || (m.leftPressed && hit(BTN.cancel, m))) { M.mode = 'menu'; tick1(); return; }
    if ((IN.hit('KeyE') || IN.hit('enter') || IN.hit('space') || (m.leftPressed && hit(BTN.confirm, m))) && M.pick) { pickUp(g, M.pick); note('BACK IN THE BOX.'); }
  }
  function tick1() { A.sfx.tone(1200, { type: 'square', dur: 0.03, vol: 0.03 }); }
  function choose(g, b) {
    if (!b) return;
    const n = owned(g, b.id);
    if (n <= 0) { A.sfx.deny(); note('BUY IT ON ABAY FIRST. $' + U.fmt(b.price)); return; }
    if (b.where === 'up') {
      const cur = b.up === 'house' ? houseTier(g) : bedTier(g);
      if (b.tier <= cur) { note('YOU ALREADY HAVE THAT.'); return; }
      if (b.tier > cur + 1) { A.sfx.deny(); note('DO THE ONE BEFORE IT FIRST.'); return; }
      upgrade(g, b);
      return;
    }
    M.item = b.id; M.mode = 'place';
    M.cx = M.scene === 'out' ? PD.home.P.x + PD.home.P.face * (b.w / 2 + 24) : U.clamp(PD.home.P.x + PD.home.P.face * 30, 20, PD.home.IN_W - 20);
    A.sfx.tone(700, { type: 'triangle', to: 1100, dur: 0.12, vol: 0.06 });
  }

  /* The carousel: cards on a ring, seen from a little above, the selected
     one at the front. */
  const CW = 92, CH = 104, CY = 112;
  function cardPos(i) {
    const n = M.n || 1;
    const a = (n > 6 ? ((i - M.rot) % n + n * 1.5) % n - n / 2 : i - M.rot) * 0.5;
    const x = 240 + Math.sin(U.clamp(a, -1.7, 1.7)) * 178, z = Math.cos(U.clamp(a, -1.7, 1.7));
    return { x, y: CY - (1 - z) * 14, s: 0.42 + 0.58 * Math.pow((z + 1) / 2, 1.6), z: Math.abs(a) > 1.62 ? -1 : z };
  }
  function cardAt(mx, my, n) {
    let best = -1, bz = -9;
    for (let i = 0; i < n; i++) {
      const p = cardPos(i);
      if (p.z < -0.2) continue;
      const w = CW * p.s, h = CH * p.s;
      if (mx > p.x - w / 2 && mx < p.x + w / 2 && my > p.y - h / 2 && my < p.y + h / 2 && p.z > bz) { bz = p.z; best = i; }
    }
    return best;
  }

  /* A sprite, turned into a hologram: cyan, lit from inside, with scanlines. */
  const HOLO = new WeakMap();
  function holoOf(cv) {
    let h = HOLO.get(cv);
    if (h) return h;
    h = document.createElement('canvas');
    h.width = cv.width; h.height = cv.height;
    const q = h.getContext('2d');
    q.drawImage(cv, 0, 0);
    q.globalCompositeOperation = 'source-atop';
    q.fillStyle = 'rgba(60,220,255,0.72)'; q.fillRect(0, 0, h.width, h.height);
    q.fillStyle = 'rgba(0,20,40,0.5)';
    for (let y = 0; y < h.height; y += 4) q.fillRect(0, y, h.width, 1);
    h.ox = cv.ox; h.oy = cv.oy;
    HOLO.set(cv, h);
    return h;
  }
  function previewArt(b) {
    if (b.where === 'up') return b.up === 'house' ? PD.home.API.artHouse(b.tier) : PD.home.API.artBed(b.tier);
    return BA.art(b.id);
  }
  // how big the painted part of a sprite really is, so a duck and a
  // mountain both fill their card
  const BOX = new WeakMap();
  function boxOf(cv) {
    let b = BOX.get(cv);
    if (b) return b;
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < x0) { x0 = 0; y0 = 0; x1 = cv.width - 1; y1 = cv.height - 1; }
    b = { w: (x1 - x0 + 1) / HD, h: (y1 - y0 + 1) / HD, cx: (x0 + x1 + 1) / 2 / HD, bot: (y1 + 1) / HD };
    BOX.set(cv, b);
    return b;
  }
  // draw a preview spinning like a hologram on a projector
  function spinPreview(ctx, b, x, y, size, t, full) {
    const cv = previewArt(b);
    if (!cv) return;
    const w = cv.width / HD, h = cv.height / HD, bx = boxOf(cv);
    const k = Math.min(3, size / bx.w, size * 1.1 / bx.h);
    const spin = Math.cos(t * 1.4 + b.price * 0.001);
    const sx = Math.max(0.12, Math.abs(spin));
    const flip = spin < 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale((flip ? -1 : 1) * sx * k, k);
    ctx.globalAlpha *= full ? 0.55 : 0.9;
    ctx.drawImage(holoOf(cv), -bx.cx, -bx.bot, w, h);
    if (full) { ctx.globalAlpha = 0.8; ctx.drawImage(cv, -bx.cx, -bx.bot, w, h); }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function holoPanel(ctx, x, y, w, h, t, a) {
    ctx.globalAlpha = (a === undefined ? 1 : a) * 0.18;
    X.rect(ctx, x, y, w, h, '#38e8ff');
    ctx.globalAlpha = (a === undefined ? 1 : a) * 0.9;
    X.rect(ctx, x, y, w, 1, '#aef8ff'); X.rect(ctx, x, y + h - 1, w, 1, '#38e8ff');
    // corner brackets
    for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]]) {
      X.rect(ctx, cx, cy, 6 * dx || 1, 1, '#ffffff'); X.rect(ctx, cx, cy, 1, 6 * dy || 1, '#ffffff');
    }
    ctx.globalAlpha = (a === undefined ? 1 : a) * 0.08;
    for (let yy = y + ((t * 30) % 3); yy < y + h; yy += 3) X.rect(ctx, x, yy, w, 1, '#aef8ff');
    ctx.globalAlpha = 1;
  }
  function holoText(ctx, s, x, y, col, opts) {
    const glitch = Math.random() < 0.02 ? Math.round(U.rand(-2, 2)) : 0;
    F.draw(ctx, s, x + glitch, y, col || '#aef8ff', Object.assign({ shadow: '#003a4a' }, opts || {}));
  }
  function holoButton(ctx, b, label, t, on, col) {
    const m = PD.input.mouse;
    const hot = hit(b, m);
    ctx.globalAlpha = on ? 0.9 : 0.4;
    X.plate(ctx, b.x, b.y, b.w, b.h, hot ? '#1a6a7a' : '#0c3a48', col || '#38e8ff', '#021a22', 4);
    ctx.globalAlpha = 1;
    holoText(ctx, label, b.x + b.w / 2, b.y + b.h / 2 - 3, on ? '#ffffff' : '#5a9aa8', { center: true });
  }

  function drawUI(ctx, g, t) {
    const cats = catsFor(M.scene);
    const list = itemsIn(g, cats[M.cat]);
    const e = M.k >= 1 ? 1 : 1 + 2.7 * Math.pow(M.k - 1, 3) + 1.7 * Math.pow(M.k - 1, 2);
    // the world goes dark and blue, so the hologram is the brightest thing
    ctx.globalAlpha = (M.mode === 'menu' ? 0.62 : 0.14) * M.k; X.rect(ctx, 0, 0, VW, VH, '#03121e'); ctx.globalAlpha = 1;
    if (M.mode === 'menu') {
      // a perspective grid on the floor of the hologram
      ctx.globalAlpha = 0.16 * M.k;
      for (let i = -8; i <= 8; i++) X.line(ctx, 240 + i * 12, 170, 240 + i * 40, 232, '#38e8ff');
      for (let j = 0; j < 5; j++) { const y = 172 + j * j * 3 + ((t * 8) % 3); X.rect(ctx, 60, Math.round(y), 360, 1, '#38e8ff'); }
      // the projector at the bottom and the cone of light it throws
      ctx.globalAlpha = 0.1 * M.k;
      X.poly(ctx, [[226, 270], [254, 270], [410, 64], [70, 64]], '#38e8ff');
      ctx.globalAlpha = 1;
      X.plate(ctx, 212, 262, 56, 10, '#1a2a3a', '#4a6a8a', '#0a1018', 4);
      PT.glow(ctx, 240, 262, 34, '#38e8ff', 0.5 + Math.sin(t * 5) * 0.1);
      // the tabs
      holoPanel(ctx, 14, 12, 420, 30, t, M.k);
      const tw = Math.floor(416 / cats.length);
      for (let i = 0; i < cats.length; i++) {
        const tx = 20 + i * tw, on = i === M.cat;
        if (on) { ctx.globalAlpha = 0.3 + Math.sin(t * 4) * 0.05; X.rect(ctx, tx, 16, tw - 4, 22, '#38e8ff'); ctx.globalAlpha = 1; X.rect(ctx, tx, 37, tw - 4, 1, '#ffffff'); }
        const n = itemsIn(g, cats[i]).reduce((s, b) => s + (owned(g, b.id) > 0 ? 1 : 0), 0);
        const all = itemsIn(g, cats[i]).length;
        holoText(ctx, cats[i], tx + (tw - 4) / 2, 19, on ? '#ffffff' : '#6ab8c8', { center: true });
        holoText(ctx, n + '/' + all, tx + (tw - 4) / 2, 28, on ? '#ffd34d' : '#3a7a88', { center: true });
      }
      holoButton(ctx, BTN.close, 'X', t, true, '#ff5a8a');
      // the ring of cards, back ones first
      ctx.save();
      ctx.translate(240, CY); ctx.scale(1, e); ctx.translate(-240, -CY);
      const order = list.map((b, i) => i).filter(i => cardPos(i).z > -0.5).sort((a, b) => cardPos(a).z - cardPos(b).z);
      for (const i of order) {
        const b = list[i], p = cardPos(i);
        const w = Math.round(CW * p.s), h = Math.round(CH * p.s), sel = i === M.sel;
        const have = owned(g, b.id);
        const alpha = U.clamp((p.z + 0.2) * 1.4, 0, 1) * (sel ? 1 : 0.62 + 0.3 * p.z);
        const bob = sel ? Math.sin(t * 3) * 2 : 0;
        const cx = Math.round(p.x), cy = Math.round(p.y + bob);
        // a solid back so the cards behind do not show through
        ctx.globalAlpha = alpha * 0.85; X.rect(ctx, cx - w / 2, cy - h / 2, w, h, '#062230');
        ctx.globalAlpha = alpha;
        holoPanel(ctx, cx - w / 2, cy - h / 2, w, h, t, alpha);
        if (sel) { ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.25; X.frame(ctx, cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 4, '#ffd34d'); ctx.globalAlpha = alpha; }
        // the projector pad under the picture, and the picture spinning on it
        const py = cy + h * 0.24;
        X.blob(ctx, cx, py, w * 0.34, 3 * p.s, 'rgba(56,232,255,0.55)');
        if (sel) { ctx.globalAlpha = 0.18; X.poly(ctx, [[cx - w * 0.34, py], [cx + w * 0.34, py], [cx + w * 0.22, cy - h / 2 + 12], [cx - w * 0.22, cy - h / 2 + 12]], '#38e8ff'); }
        ctx.globalAlpha = alpha;
        spinPreview(ctx, b, cx, py, 62 * p.s, t + i * 0.7, sel && have > 0);
        ctx.globalAlpha = alpha;
        const maxc = Math.max(3, Math.floor((w - 6) / 6));
        if (sel || p.s > 0.86) holoText(ctx, b.name.length > maxc ? b.name.slice(0, maxc - 1) + '.' : b.name, cx, cy - h / 2 + 4, have ? '#ffffff' : '#6ab8c8', { center: true });
        if (p.s > 0.7) holoText(ctx, have ? 'x' + have : '$' + U.fmt(b.price), cx, cy + h / 2 - 11, have ? '#8affa0' : '#ffd34d', { center: true });
        if (!have) { X.plate(ctx, cx + w / 2 - 13, cy - h / 2 + 14, 9, 8, '#3a2a0a', '#ffd34d', null, 2); X.rect(ctx, cx + w / 2 - 11, cy - h / 2 + 11, 5, 4, '#ffd34d'); }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      // where you are in the list
      if (list.length > 1) {
        const n = list.length, dw = Math.min(6, Math.floor(300 / n)), x0 = 240 - (n * dw) / 2;
        for (let i = 0; i < n; i++) X.rect(ctx, Math.round(x0 + i * dw), 171, Math.max(2, dw - 2), 2, i === M.sel ? '#ffd34d' : (owned(g, list[i].id) ? '#38e8ff' : '#1a4a5a'));
        holoButton(ctx, { x: 18, y: CY - 12, w: 18, h: 24 }, '<', t, true);
        holoButton(ctx, { x: 444, y: CY - 12, w: 18, h: 24 }, '>', t, true);
      }
      // what the front card is
      const b = list[M.sel];
      holoPanel(ctx, 14, 178, 452, 52, t, M.k);
      if (b) {
        const have = owned(g, b.id);
        holoText(ctx, b.name, 22, 183, '#ffffff', { scale: 2 });
        holoText(ctx, b.desc.length > 72 ? b.desc.slice(0, 71) + '.' : b.desc, 22, 202, '#aef8ff');
        holoText(ctx, fxLine(b), 22, 214, '#ffd34d');
        holoText(ctx, have ? 'YOU HAVE ' + have : 'ON ABAY: $' + U.fmt(b.price), 458, 186, have ? '#8affa0' : '#ff9a6a', { right: true });
        const up = b.where === 'up';
        holoButton(ctx, BTN.place, have ? (up ? 'UPGRADE (E)' : 'PLACE IT (E)') : 'BUY ON ABAY', t, have > 0, have ? '#8affa0' : '#ffd34d');
      } else holoText(ctx, 'NOTHING IN HERE YET', 240, 200, '#6ab8c8', { center: true });
      holoButton(ctx, BTN.move, 'MOVE (M)', t, true);
      holoText(ctx, 'LEFT RIGHT: PICK', 464, 238, '#3a8a9a', { right: true });
      holoText(ctx, 'UP DOWN: TAB  B: CLOSE', 464, 248, '#3a8a9a', { right: true });
    } else {
      // placing, or picking up: the controls along the bottom
      holoPanel(ctx, 14, 222, 452, 46, t, 1);
      holoButton(ctx, BTN.left, '<', t, true); holoButton(ctx, BTN.right, '>', t, true);
      if (M.mode === 'place') {
        const b = BA.BY[M.item];
        holoText(ctx, b.name, 22, 227, '#ffffff');
        holoText(ctx, M.valid ? 'FITS HERE. CONFIRM TO BUILD IT.' : M.why, 22 + F.width(b.name, 1) + 10, 227, M.valid ? '#8affa0' : '#ff8a9a');
        holoButton(ctx, BTN.confirm, 'CONFIRM', t, M.valid, M.valid ? '#8affa0' : '#ff5a8a');
        holoButton(ctx, BTN.cancel, 'CANCEL', t, true, '#ff5a8a');
        holoText(ctx, 'x' + owned(g, M.item) + ' LEFT', 460, 249, '#ffd34d', { right: true });
        holoText(ctx, 'LEFT RIGHT: MOVE', 22, 249, '#3a8a9a');
      } else {
        holoText(ctx, M.pick ? BA.BY[M.pick.id].name : 'POINT AT SOMETHING', 22, 227, '#ffffff');
        holoText(ctx, 'PICK IT UP: BACK IN THE BOX', 460, 227, '#aef8ff', { right: true });
        holoButton(ctx, BTN.confirm, 'PICK UP', t, !!M.pick, '#ffd34d');
        holoButton(ctx, BTN.cancel, 'DONE', t, true, '#38e8ff');
      }
    }
    if (M.msgT > 0) {
      const w = F.width(M.msg, 1) + 16;
      ctx.globalAlpha = Math.min(1, M.msgT * 2);
      holoPanel(ctx, 240 - w / 2, 56, w, 14, t, 1);
      holoText(ctx, M.msg, 240, 60, '#ffffff', { center: true });
      ctx.globalAlpha = 1;
    }
  }
  function fxLine(b) {
    const f = b.fx || {};
    if (f.ore) return 'DIGS 1 ORE EVERY ' + f.every + ' SECONDS';
    if (f.sell) return 'SELLS 1 ORE EVERY ' + f.every + ' SECONDS, +' + Math.round(f.markup * 100) + '%';
    if (f.cash) return '+$' + f.cash + ' EVERY ' + f.every + ' SECONDS' + (f.sunny ? ' IN SUNLIGHT' : '');
    if (f.interest) return '+1% OF YOUR MONEY EVERY 5 MINUTES';
    if (f.value) return 'ORE SELLS ' + Math.round(f.value * 100) + '% HIGHER';
    if (f.bonus) return 'BONUS WHILE DIGGING';
    if (b.ride) return 'RIDEABLE' + (b.fun ? '  -  BRINGS TOURISTS' : '');
    if (b.fun) return 'BRINGS TOURISTS. TOURISTS PAY.';
    if (b.where === 'up') return 'UPGRADE';
    return 'MAKES THE PLACE NICER';
  }

  /* The BUILD button in the corner, outside the menu. */
  function drawButton(ctx, g, t, scene) {
    if (g.tutActive && g.tutActive()) return;
    const b = OPENBTN;
    const m = PD.input.mouse, hot = hitButton(m.x, m.y) && m.inside;
    ctx.globalAlpha = 0.85;
    X.plate(ctx, b.x, b.y, b.w, b.h, hot ? '#1a6a7a' : '#0c3a48', '#38e8ff', '#021a22', 4);
    ctx.globalAlpha = 1;
    PT.glow(ctx, b.x + 10, b.y + 10, 10, '#38e8ff', 0.3 + Math.sin(t * 3) * 0.1);
    holoText(ctx, 'B BUILD', b.x + b.w / 2 + 2, b.y + 7, '#ffffff', { center: true });
    if (M.away && M.away.t > 0) {
      M.away.t -= g.dt;
      const s = 'WHILE YOU WERE AWAY: +' + M.away.ore + ' ORE, +$' + U.fmt(M.away.cash);
      const w = F.width(s, 1) + 16;
      ctx.globalAlpha = Math.min(1, M.away.t);
      holoPanel(ctx, 240 - w / 2, 30, w, 14, t, 1);
      holoText(ctx, s, 240, 34, '#ffffff', { center: true });
      ctx.globalAlpha = 1;
    }
  }

  /* ------------------------------------------------------------ drawing */
  function popScale(o, t) {
    const q = (t - (o.born || -9)) / 0.5;
    if (q >= 1 || q < 0) return [1, 1];
    const s = 1 + Math.sin(q * Math.PI) * 0.25;
    return [1 / Math.sqrt(s) * Math.min(1, q * 3), s * Math.min(1, q * 3)];
  }
  function drawOne(ctx, g, t, o, b, n, API) {
    const cv = BA.art(b.id);
    const [sx, sy] = popScale(o, g.time);
    const sway = b.sway ? Math.sin(t * 1.3 + o.x) * 0.025 : 0;
    ctx.save();
    if (sway) ctx.rotate(sway);
    ctx.scale(sx, sy);
    // a shadow at the base
    if (!b.water && !b.floatie && b.w) { ctx.globalAlpha = 0.3; X.blob(ctx, 0, 1, b.w * 0.5, 3, '#0a0614'); ctx.globalAlpha = 1; }
    if (cv) {
      ctx.drawImage(cv, -cv.ox, -cv.oy, cv.width / HD, cv.height / HD);
      if (n > 0.02 && API && API.stand) {
        ctx.globalAlpha = n;
        ctx.drawImage(nightOf(cv), -cv.ox, -cv.oy, cv.width / HD, cv.height / HD);
        ctx.globalAlpha = 1;
      }
    }
    if (b.live) b.live(ctx, t, o, n);
    if (b.water) drawWater(ctx, t, o, b);
    if (b.ride === 'coaster') drawTrack(ctx, g, t, o);
    ctx.restore();
  }
  const NIGHTC = new WeakMap();
  function nightOf(cv) {
    let n = NIGHTC.get(cv);
    if (n) return n;
    n = document.createElement('canvas'); n.width = cv.width; n.height = cv.height;
    const q = n.getContext('2d'); q.drawImage(cv, 0, 0);
    q.globalCompositeOperation = 'source-atop'; q.fillStyle = 'rgba(8,6,30,0.7)'; q.fillRect(0, 0, n.width, n.height);
    NIGHTC.set(cv, n);
    return n;
  }
  function drawWater(ctx, t, o, b) {
    const hw = b.w / 2 - 4;
    for (let k = 0; k < 5; k++) {
      const x = -hw + ((t * 12 + k * 23 + o.x) % (hw * 2));
      X.rect(ctx, x, -1 + Math.sin(t * 2 + k) * 0.5, 5, 1, b.lava ? '#ffd34d' : '#bfe8ff');
    }
  }

  function drawOut(ctx, g, t, API) {
    G = g;
    const s = st(g);
    // water first, then everything that stands, then what floats
    const list = s.out.slice().sort((a, b) => ((BA.BY[b.id].water ? 1 : 0) - (BA.BY[a.id].water ? 1 : 0)) || ((BA.BY[a.id].floatie ? 1 : 0) - (BA.BY[b.id].floatie ? 1 : 0)));
    for (const o of list) {
      const b = BA.BY[o.id];
      if (!b || !API.visible(o.x, b.w)) continue;
      const n = API.nightAt(o.x);
      let y = API.groundY(o.x);
      if (b.water) y = -Math.round(API.bump(o.x));
      if (b.floatie) y = -Math.round(API.bump(o.x)) + 3 + Math.sin(t * 1.8 + o.x) * 1.2;
      API.onMoon(ctx, o.x, y, (c) => drawOne(c, g, t, o, b, n, API));
    }
    drawVisitors(ctx, g, t, API);
  }
  function drawOutFront(ctx, g, t, API) {
    if (M.on && M.scene === 'out' && M.mode !== 'menu') drawGhost(ctx, g, t, API);
    if (RIDE.on) drawRide(ctx, g, t, API);
  }
  function drawGhost(ctx, g, t, API) {
    const H = PD.home.API;
    if (M.mode === 'place') {
      const b = BA.BY[M.item];
      const cv = BA.art(b.id);
      const y = b.floatie ? -Math.round(H.bump(M.cx)) + 3 : (b.water ? -Math.round(H.bump(M.cx)) : H.groundY(M.cx));
      H.onMoon(ctx, M.cx, y, (c) => {
        const col = M.valid ? '#8affa0' : '#ff5a8a';
        // the footprint on the ground, and a beam coming down on it
        c.globalAlpha = 0.5 + Math.sin(t * 6) * 0.2;
        X.rect(c, -b.w / 2, 0, b.w, 3, col);
        c.globalAlpha = 0.12;
        X.poly(c, [[-b.w / 2, 0], [b.w / 2, 0], [8, -140], [-8, -140]], col);
        c.globalAlpha = 1;
        if (cv) {
          const bob = Math.sin(t * 3) * 2 - 4;
          c.globalAlpha = 0.75;
          c.drawImage(holoOf(cv), -cv.ox, -cv.oy + bob, cv.width / HD, cv.height / HD);
          c.globalAlpha = 1;
        }
        const ab = Math.abs(Math.sin(t * 5)) * 3;
        X.poly(c, [[-b.w / 2 - 8 - ab, -10], [-b.w / 2 - 2 - ab, -14], [-b.w / 2 - 2 - ab, -6]], '#ffffff');
        X.poly(c, [[b.w / 2 + 8 + ab, -10], [b.w / 2 + 2 + ab, -14], [b.w / 2 + 2 + ab, -6]], '#ffffff');
      });
    } else {
      H.onMoon(ctx, M.cx, H.groundY(M.cx), (c) => {
        X.poly(c, [[-5, -30], [5, -30], [0, -22]], '#ffd34d');
        if (M.pick) { const b = BA.BY[M.pick.id]; c.globalAlpha = 0.5 + Math.sin(t * 8) * 0.3; X.rect(c, H.wdist(M.pick.x, M.cx) - b.w / 2, 0, b.w, 3, '#ffd34d'); c.globalAlpha = 1; }
      });
    }
  }

  function drawIn(ctx, g, t, cam) {
    G = g;
    for (const o of st(g).in) {
      const b = BA.BY[o.id];
      if (!b) continue;
      ctx.save();
      ctx.translate(Math.round(o.x - cam), PD.home.FLOOR + 1);
      drawOne(ctx, g, t, o, b, 0, null);
      ctx.restore();
    }
  }
  function drawInFront(ctx, g, t, cam) {
    if (!(M.on && M.scene === 'in' && M.mode !== 'menu')) return;
    ctx.save();
    ctx.translate(Math.round(M.cx - cam), PD.home.FLOOR + 1);
    if (M.mode === 'place') {
      const b = BA.BY[M.item], cv = BA.art(b.id);
      const col = M.valid ? '#8affa0' : '#ff5a8a';
      ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.2; X.rect(ctx, -b.w / 2, 0, b.w, 3, col); ctx.globalAlpha = 1;
      if (cv) { ctx.globalAlpha = 0.75; ctx.drawImage(holoOf(cv), -cv.ox, -cv.oy - 3 + Math.sin(t * 3) * 2, cv.width / HD, cv.height / HD); ctx.globalAlpha = 1; }
    } else {
      X.poly(ctx, [[-5, -40], [5, -40], [0, -32]], '#ffd34d');
      if (M.pick) { const b = BA.BY[M.pick.id]; ctx.globalAlpha = 0.6; X.rect(ctx, M.pick.x - M.cx - b.w / 2, 0, b.w, 3, '#ffd34d'); ctx.globalAlpha = 1; }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------ what you can use */
  function spots(g, scene) {
    const out = [];
    if (scene === 'in') return out;
    for (const o of st(g).out) {
      const b = BA.BY[o.id];
      if (!b || !b.ride) continue;
      const act = { coaster: 'RIDE IT', ferris: 'RIDE IT', cannon: 'GET IN', slide: 'GO DOWN IT' }[b.ride];
      out.push({ id: 'ride', o, b, x: b.ride === 'coaster' ? o.x - 80 : o.x, r: 22, name: b.name, sub: act + (b.ride === 'coaster' ? '. HOLD UP FOR SPEED' : ''), lift: b.ride === 'coaster' ? 90 : b.h + 40 });
    }
    return out;
  }
  function use(g, s) {
    if (s.id !== 'ride') return false;
    startRide(g, s.o, s.b);
    return true;
  }

  /* ============================================================ RIDES
     A ride is a path in the building's own frame, and something travels
     along it with you in it: the coaster under gravity, the wheel round a
     circle, the cannon on a parabola, the slide down a curve. */
  const RIDE = { on: 0, kind: null, o: null, b: null, s: 0, v: 0, t: 0, path: null, coins: [], got: 0, said: 0, pos: { x: 0, y: 0, a: 0 } };

  // the coaster: station, lift hill, drop, loop, a hump, and home along the ground
  const TRACK = {};
  function coasterPath() {
    if (TRACK.pts) return TRACK;
    const pts = [];
    const seg = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); };
    const bez = (a, b, c, d, n) => { for (let i = 0; i < n; i++) { const q = i / n, r = 1 - q; pts.push([r * r * r * a[0] + 3 * r * r * q * b[0] + 3 * r * q * q * c[0] + q * q * q * d[0], r * r * r * a[1] + 3 * r * r * q * b[1] + 3 * r * q * q * c[1] + q * q * q * d[1]]); } };
    seg(-86, -16, -70, -16, 6);
    bez([-70, -16], [-62, -16], [-60, -80], [-44, -84], 26);        // up the lift hill
    bez([-44, -84], [-32, -86], [-22, -16], [-4, -16], 26);         // THE DROP
    seg(-4, -16, 16, -16, 8);
    for (let i = 0; i < 40; i++) { const a = Math.PI / 2 - i / 40 * U.TAU; pts.push([16 + Math.cos(a) * 28 * 0 + Math.sin(i / 40 * U.TAU) * 28, -44 + Math.cos(i / 40 * U.TAU) * 28]); }
    seg(16, -16, 40, -16, 8);
    bez([40, -16], [52, -16], [60, -66], [72, -66], 20);            // the hump
    bez([72, -66], [86, -66], [92, -30], [94, -10], 18);
    bez([94, -10], [96, -2], [88, -4], [70, -4], 10);               // round and home along the floor
    seg(70, -4, -80, -4, 50);
    bez([-80, -4], [-92, -4], [-92, -16], [-86, -16], 8);
    // cumulative length
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    TRACK.pts = pts; TRACK.len = len; TRACK.total = len[len.length - 1];
    return TRACK;
  }
  function onPath(T, s) {
    s = ((s % T.total) + T.total) % T.total;
    let lo = 0, hi = T.len.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T.len[mid] <= s) lo = mid; else hi = mid; }
    const a = T.pts[lo], b = T.pts[Math.min(T.pts.length - 1, lo + 1)];
    const q = (s - T.len[lo]) / Math.max(0.001, T.len[hi] - T.len[lo]);
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.max(0.001, Math.hypot(dx, dy));
    return { x: a[0] + dx * q, y: a[1] + dy * q, tx: dx / d, ty: dy / d, i: lo };
  }
  function drawTrack(ctx, g, t, o) {
    const T = coasterPath();
    // supports down to the (curving) ground
    for (let i = 0; i < T.pts.length; i += 6) {
      const p = T.pts[i];
      if (p[1] > -8) continue;
      const gy = (p[0] * p[0]) / (2 * 270);
      X.rect(ctx, p[0] - 0.5, p[1], 1, gy - p[1], '#5a6070');
    }
    // two rails and the ties between them
    for (let i = 1; i < T.pts.length; i++) {
      const a = T.pts[i - 1], b = T.pts[i];
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d * 1.5, ny = dx / d * 1.5;
      X.line(ctx, a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny, '#d83a4a', 1);
      X.line(ctx, a[0] - nx, a[1] - ny, b[0] - nx, b[1] - ny, '#ff6a7a', 1);
      if (i % 3 === 0) X.line(ctx, a[0] + nx * 1.4, a[1] + ny * 1.4, a[0] - nx * 1.4, a[1] - ny * 1.4, '#5a3a3a', 1);
    }
    // the car, parked at the station when nobody is on it
    if (!(RIDE.on && RIDE.o === o)) drawCar(ctx, onPath(T, 4), t, false, G);
  }
  function drawCar(ctx, p, t, full, g) {
    const a = Math.atan2(p.ty, p.tx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a);
    X.plate(ctx, -8, -8, 16, 7, '#ffd34d', '#fff0a0', '#b8901e', 2);
    X.rect(ctx, -8, -4, 16, 1, '#d83a4a');
    X.blob(ctx, -5, -1, 2, 2, '#3a3a4a'); X.blob(ctx, 5, -1, 2, 2, '#3a3a4a');
    if (full) {
      // you, in the front seat, arms up for the drop
      const spr = PD.art.skinFor(g.save.cos).alienCore;
      const cv = spr.frames[Math.abs(p.ty) > 0.5 ? 7 : 5], k = spr.hd || 1;
      ctx.save(); ctx.translate(0, -8); ctx.scale(0.7, 0.7);
      ctx.drawImage(cv, -spr.ox, -spr.oy, cv.width / k, cv.height / k);
      ctx.restore();
      const up = Math.abs(p.ty) > 0.4;
      X.line(ctx, -3, -14, -6, up ? -24 : -18, '#7ff08a', 2); X.line(ctx, 3, -14, 6, up ? -24 : -18, '#7ff08a', 2);
    }
    ctx.restore();
  }

  function startRide(g, o, b) {
    RIDE.on = 1; RIDE.kind = b.ride; RIDE.o = o; RIDE.b = b; RIDE.t = 0; RIDE.s = 4; RIDE.v = 0; RIDE.got = 0; RIDE.said = 0; RIDE.coins = [];
    PD.home.P.lock = 0.3;
    A.sfx.tone(440, { type: 'square', to: 660, dur: 0.12, vol: 0.07 });
    if (b.ride === 'coaster') {
      const T = coasterPath();
      for (let i = 0; i < 14; i++) RIDE.coins.push({ s: 40 + i * (T.total - 90) / 14 + U.rand(-6, 6), got: 0 });
    } else if (b.ride === 'ferris') { RIDE.a0 = o.spin !== undefined ? o.spin : g.time * 0.3; }
    else if (b.ride === 'cannon') {
      A.sfx.boom ? A.sfx.boom() : A.sfx.thud();
      RIDE.vx = PD.home.P.face * 230; RIDE.vy = -330; RIDE.x = o.x; RIDE.y = -24;
      FX.flash && FX.flash(0.3, '#ffffff');
    } else if (b.ride === 'slide') { RIDE.s = 0; }
  }
  function riding() { return !!RIDE.on; }
  function rideHidesUfo() { return false; }
  // where the ride is, in moon coordinates, for the camera
  function toMoon(o, lx, ly) {
    const H = PD.home.API, y0 = H.groundY(o.x);
    const rr = PD.home.R - y0;
    const a = o.x / PD.home.R + Math.atan2(lx, rr - ly);
    const r = Math.hypot(lx, rr - ly);
    return { x: a * PD.home.R, y: PD.home.R - r };
  }
  function rideLocal() {
    const o = RIDE.o;
    if (RIDE.kind === 'coaster') { const p = onPath(coasterPath(), RIDE.s); return { x: p.x, y: p.y - 8 }; }
    if (RIDE.kind === 'ferris') { const a = RIDE.a0 + RIDE.t * 0.9; return { x: Math.cos(a) * 48, y: -70 + Math.sin(a) * 48 + 4 }; }
    if (RIDE.kind === 'slide') {
      const q = RIDE.s;
      if (q < 1) return { x: -25, y: -q * 65 };
      const f = Math.min(1, q - 1);
      return { x: -20 + f * 50, y: -65 + Math.pow(f, 1.6) * 62 };
    }
    return { x: 0, y: 0 };
  }
  function rideFocus() {
    if (RIDE.kind === 'cannon') return { x: RIDE.x, y: RIDE.y };
    const l = rideLocal();
    return toMoon(RIDE.o, l.x, l.y);
  }
  function rideUpdate(dt, g) {
    const IN = PD.input, P = PD.home.P, H = PD.home.API;
    RIDE.t += dt;
    const bail = IN.hit('esc');
    if (RIDE.kind === 'coaster') {
      const T = coasterPath();
      const p = onPath(T, RIDE.s);
      if (RIDE.s < 90) RIDE.v = Math.max(RIDE.v, 34);                  // the chain on the lift hill
      RIDE.v += 260 * p.ty * dt;                                         // gravity along the track
      if (IN.down('up')) RIDE.v += 120 * dt;
      if (IN.down('down')) RIDE.v -= 120 * dt;
      RIDE.v = U.clamp(RIDE.v, 22, 260);
      RIDE.s += RIDE.v * dt;
      for (const c of RIDE.coins) if (!c.got && Math.abs(c.s - RIDE.s) < 5) { c.got = 1; RIDE.got++; A.sfx.coin && A.sfx.coin(RIDE.got); }
      if (RIDE.v > 150 && RIDE.t - RIDE.said > 1.5) { RIDE.said = RIDE.t; const b = H.toBuf(rideFocus().x, rideFocus().y - 20); FX.text(b.x, b.y, U.pick(['WHEEE', 'AAAAA', 'YES', 'NOOO', 'WOOO']), '#ffe9a8', 1); }
      if (RIDE.s >= T.total - 6 || bail) return endRide(g, true);
      return;
    }
    if (RIDE.kind === 'ferris') {
      if (RIDE.t > U.TAU / 0.9 || bail) return endRide(g, true);
      return;
    }
    if (RIDE.kind === 'slide') {
      RIDE.s += dt * (RIDE.s < 1 ? 0.9 : 1.6);
      if (RIDE.s > 2.05 || bail) { endRide(g, false); P.x = RIDE.o.x + 34; P.vx = P.face * 180; P.vy = -60; P.face = 1; return; }
      return;
    }
    if (RIDE.kind === 'cannon') {
      RIDE.vy += 300 * dt;
      RIDE.x += RIDE.vx * dt; RIDE.y += RIDE.vy * dt;
      if (RIDE.t > 0.3 && RIDE.t - RIDE.said > 0.6) { RIDE.said = RIDE.t; const b = H.toBuf(RIDE.x, RIDE.y - 10); FX.text(b.x, b.y, 'AAAAAA', '#ffe9a8', 1); }
      if (RIDE.y >= H.groundY(RIDE.x) && RIDE.vy > 0) {
        P.x = RIDE.x; P.y = H.groundY(RIDE.x); P.vy = -120; P.vx = 0; P.land = 0.3;
        const b = H.toBuf(P.x, P.y); FX.dust(b.x, b.y, 14, '#8e86a8', 30);
        A.sfx.thud();
        RIDE.on = 0; P.lock = 0.4;
      }
    }
  }
  function endRide(g, pay) {
    const P = PD.home.P;
    if (RIDE.kind === 'coaster' && RIDE.got > 0) {
      const cash = RIDE.got * 40;
      g.save.credits += cash; g.save.totalEarned += cash;
      note('RIDE OVER: ' + RIDE.got + ' COINS, +$' + cash);
      M.msgT = 3;
    }
    if (RIDE.kind === 'coaster') { P.x = RIDE.o.x - 86; }
    else if (RIDE.kind === 'ferris') { P.x = RIDE.o.x + 10; }
    P.y = PD.home.groundY(P.x); P.vy = 0; P.vx = 0;
    RIDE.on = 0; P.lock = 0.4;
    A.sfx.tone(660, { type: 'triangle', to: 440, dur: 0.2, vol: 0.06 });
  }
  function drawRide(ctx, g, t, API) {
    const o = RIDE.o, H = PD.home.API;
    if (RIDE.kind === 'cannon') {
      H.onMoon(ctx, RIDE.x, RIDE.y, (c) => {
        const spr = PD.art.skinFor(g.save.cos).alienRoll;
        c.save(); c.rotate(RIDE.t * 12); c.drawImage(spr.frames[0], -spr.ox, -spr.oy + 8, spr.w, spr.h); c.restore();
      });
      return;
    }
    H.onMoon(ctx, o.x, H.groundY(o.x), (c) => {
      if (RIDE.kind === 'coaster') {
        const T = coasterPath();
        for (const cn of RIDE.coins) { if (cn.got) continue; const p = onPath(T, cn.s); const w = Math.abs(Math.cos(t * 6 + cn.s)) * 2.5 + 0.5; X.blob(c, p.x, p.y - 14, w, 3, '#ffd34d'); }
        drawCar(c, onPath(T, RIDE.s), t, true, g);
      } else {
        const l = rideLocal();
        const spr = PD.art.skinFor(g.save.cos).alienCore;
        const cv = spr.frames[5], k = spr.hd || 1;
        c.save(); c.translate(l.x, l.y + (RIDE.kind === 'ferris' ? 4 : 0)); c.scale(0.8, 0.8);
        c.drawImage(cv, -spr.ox, -spr.oy, cv.width / k, cv.height / k); c.restore();
      }
    });
  }
  function rideOverlay(ctx, g, t) {
    const lines = { coaster: 'HOLD UP TO GO FASTER  -  DOWN TO BRAKE  -  COINS: ' + RIDE.got + '/' + RIDE.coins.length, ferris: 'ENJOY THE VIEW. IT IS YOUR MOON.', cannon: '', slide: 'WHEEEEE' };
    const s = lines[RIDE.kind] || '';
    if (s) {
      const w = F.width(s, 1) + 16;
      holoPanel(ctx, 240 - w / 2, VH - 26, w, 14, t, 1);
      holoText(ctx, s, 240, VH - 22, '#ffffff', { center: true });
    }
    X.rect(ctx, 0, 0, VW, 8, '#000000'); X.rect(ctx, 0, VH - 6, VW, 6, '#000000');
  }

  /* ============================================================ THE WORLD
     Bouncing, swimming, and tourists. Run every frame you are on the moon. */
  const VIS = [];
  const TOUR = { next: 18, saucer: null };
  const VSAY = ['WOW', 'NICE MOON', 'FIVE STARS', 'WHEEE', 'SO FUN', 'IS THAT A SHARK', 'I LIVE HERE NOW', 'BEST MOON', 'AGAIN AGAIN', 'WORTH IT', 'MY KIDS LOVE IT', 'WHERE IS THE GIFT SHOP'];
  function world(dt, g, info) {
    G = g;
    const P = PD.home.P, H = PD.home.API;
    if (info.scene !== 'out') return;
    // water: sink in, float back up, splash on the way in
    const w = waterAt(P.x);
    const surface = -Math.round(H.bump(P.x)) + 2;
    if (w) {
      if (P.y > surface) {
        if (!P.swim) { P.swim = 1; const b = H.toBuf(P.x, surface); for (let k = 0; k < 16; k++) FX.spawn({ x: b.x + U.rand(-8, 8), y: b.y, vx: U.rand(-60, 60), vy: U.rand(-140, -40), life: 0.7, size: 2, color: w.lava ? '#ffb040' : '#bfe8ff', grav: 300, drag: 1 }); A.sfx.tone(300, { type: 'sine', to: 120, dur: 0.2, vol: 0.08 }); }
        P.vy = U.damp(P.vy, -40, 0.12, dt);
        if (w.lava && U.chance(dt * 4)) { P.vy = -300; const b = H.toBuf(P.x, P.y - 30); FX.text(b.x, b.y, 'HOT HOT HOT', '#ff8a3a', 1); }
      }
    } else P.swim = 0;
    // bouncers: land on one and it throws you back up
    for (const o of st(g).out) {
      const b = BA.BY[o.id];
      if (!b || !b.bounce) continue;
      if (Math.abs(H.wdist(P.x, o.x)) > b.w / 2) continue;
      const erupting = b.id === 'geyser' ? (((g.time + o.x * 0.01) % 4) / 4) < 0.3 : true;
      if (erupting && P.y >= H.groundY(P.x) - 1.5 && P.vy >= 0) {
        P.vy = b.id === 'geyser' ? -460 : -330; P.y -= 2; P.land = 0.3;
        A.sfx.tone(260, { type: 'triangle', to: 780, dur: 0.18, vol: 0.08 });
        o.boing = g.time;
      }
    }
    // tourists
    const fun = funScore(g);
    TOUR.next -= dt;
    if (fun > 0 && TOUR.next <= 0 && VIS.length < 8) {
      TOUR.next = U.rand(26, 55) / Math.min(3, 1 + fun * 0.1);
      TOUR.saucer = { t: 0, n: U.randInt(1, 3), dropped: 0 };
    }
    if (TOUR.saucer) {
      const s = TOUR.saucer;
      s.t += dt;
      if (s.t > 1.6 && !s.dropped) {
        s.dropped = 1;
        const L = PD.arthome.KIN.length;
        for (let i = 0; i < s.n; i++) VIS.push({ x: PD.home.PAD_X - 20 + i * 12, y: 0, k: U.randInt(0, L - 1), goal: null, stay: 0, t: 0, ph: Math.random() * 6, face: 1, visits: 0, say: null, sayT: 0, jy: 0, vy: 0 });
        A.sfx.tone(700, { type: 'triangle', to: 350, dur: 0.3, vol: 0.05 });
      }
      if (s.t > 3.4) TOUR.saucer = null;
    }
    const funs = st(g).out.filter(o => BA.BY[o.id] && BA.BY[o.id].fun);
    for (let i = VIS.length - 1; i >= 0; i--) {
      const v = VIS[i];
      v.t += dt; v.sayT = Math.max(0, v.sayT - dt);
      if (!v.goal) {
        if (v.visits >= 2 || !funs.length) v.goal = { x: PD.home.PAD_X, leave: 1 };
        else { const o = funs[Math.floor(Math.random() * funs.length)]; v.goal = { x: o.x + U.rand(-BA.BY[o.id].w / 3, BA.BY[o.id].w / 3), o }; }
      }
      const d = H.wdist(v.goal.x, v.x);
      if (Math.abs(d) > 3 && v.stay <= 0) {
        v.face = Math.sign(d); v.x += v.face * 22 * dt; v.walk = 1;
      } else {
        v.walk = 0;
        if (v.goal.leave) { VIS.splice(i, 1); continue; }
        if (v.stay <= 0) {
          v.stay = U.rand(4, 8);
          const b = BA.BY[v.goal.o.id];
          const pay = 10 + b.fun * 8;
          g.save.credits += pay; g.save.totalEarned += pay;
          if (H.visible(v.x)) { const p = H.toBuf(v.x, H.groundY(v.x) - 34); FX.text(p.x, p.y, '+$' + pay + ' TICKET', '#8affa0', 0); }
          if (Math.random() < 0.6) { v.say = VSAY[Math.floor(Math.random() * VSAY.length)]; v.sayT = 2.2; }
        }
        v.stay -= dt;
        // whatever the ride is, they are enjoying it
        if (BA.BY[v.goal.o.id].bounce && v.jy === 0) v.vy = -150;
        if (v.stay <= 0) { v.visits++; v.goal = null; }
      }
      if (v.vy || v.jy < 0) { v.vy += 400 * dt; v.jy += v.vy * dt; if (v.jy >= 0) { v.jy = 0; v.vy = 0; } }
      // they notice you
      if (Math.abs(H.wdist(P.x, v.x)) < 26 && !v.waved) { v.waved = 1; v.say = U.pick(['HI!', 'IS THIS YOUR MOON', 'LOVE THE PLACE', 'O/']); v.sayT = 1.8; v.face = Math.sign(H.wdist(P.x, v.x)) || 1; }
    }
  }
  function drawVisitors(ctx, g, t, API) {
    const H = PD.home.API;
    if (TOUR.saucer) {
      const s = TOUR.saucer;
      const y = -120 + Math.min(1, s.t / 1.4) * 100 - Math.max(0, s.t - 2) * 90;
      H.onMoon(ctx, PD.home.PAD_X, y, (c) => {
        X.blob(c, 0, 0, 22, 5, '#b8c0d0'); X.blob(c, 0, -2, 20, 3, '#e0e8f0'); X.blob(c, 0, -7, 9, 6, 'rgba(126,249,255,0.8)');
        for (let k = 0; k < 5; k++) X.rect(c, -16 + k * 8, 1, 2, 2, (Math.floor(t * 8) + k) % 2 ? '#ffd34d' : '#ff5a8a');
        if (s.t > 1.2 && s.t < 2.2) { c.globalAlpha = 0.25; X.poly(c, [[-8, 4], [8, 4], [18, 100], [-18, 100]], '#7ef9ff'); c.globalAlpha = 1; }
      });
    }
    for (const v of VIS) {
      const K = PD.arthome.KIN[v.k];
      if (!K) continue;
      const w = waterAt(v.x);
      const baseY = w ? -Math.round(H.bump(v.x)) + 4 : H.groundY(v.x);
      H.onMoon(ctx, v.x, baseY + 1, (c) => {
        const walking = v.walk;
        const fr = v.sayT > 0 ? (Math.sin(t * 12) > 0 ? 3 : 6) : (walking ? (Math.floor(t * 6 + v.ph) % 2 ? 1 : 2) : (v.stay > 0 ? [6, 10, 4][Math.floor(v.t) % 3] : 0));
        const bob = walking ? -Math.abs(Math.sin(t * 8 + v.ph)) * 2 : 0;
        const br = Math.sin(t * 2.2 + v.ph) * 0.03;
        c.globalAlpha = 0.35; X.blob(c, 0, 0, K.w * 0.35, 2, '#0a0614'); c.globalAlpha = 1;
        if (w) { c.save(); c.beginPath(); c.rect(-40, -80, 80, 80); c.clip(); }
        PD.crowd.bouncy(c, K, fr, 0, v.jy + bob + (w ? 8 : 0), v.face < 0, (1 - br) * 0.85, (1 + br) * 0.85, 0);
        if (w) c.restore();
      });
    }
  }
  function overlay(ctx, g, t) {
    const H = PD.home.API;
    for (const v of VIS) {
      if (!v.say || v.sayT <= 0 || !H.visible(v.x)) continue;
      const K = PD.arthome.KIN[v.k];
      const s = PD.home.toScreen(v.x, H.groundY(v.x) - K.h * 0.85 - 6);
      const wdt = F.width(v.say, 1) + 10;
      ctx.globalAlpha = Math.min(1, v.sayT * 3);
      X.plate(ctx, s.x - wdt / 2 - 1, s.y - 13, wdt + 2, 13, '#1a1020', null, null, 4);
      X.plate(ctx, s.x - wdt / 2, s.y - 12, wdt, 11, '#fbf6ee', '#ffffff', '#c8bca8', 4);
      F.draw(ctx, v.say, s.x, s.y - 10, '#1a1020', { center: true, shadow: false });
      ctx.globalAlpha = 1;
    }
  }

  PD.build = {
    open, close, active, update, focusX, drawUI, drawButton, hitButton,
    drawOut, drawOutFront, drawIn, drawInFront, spots, use, world, overlay, tick,
    riding, rideUpdate, rideFocus, rideOverlay, rideHidesUfo,
    houseTier, bedTier, bonus, valueBonus, waterAt, waterDepth, owned, buy, price, st, funScore, M, VIS
  };
})(window.PD);
