/* THE CROSSING. Flying from the moon to a planet, and home again.

   It is a lane runner now. Three lanes, and you only ever go UP or DOWN
   between them: the saucer does the flying, you do the dodging. Things come
   at you down the lanes --

     ROCKS          hit them and it hurts. A LAZER BEAM burns them away
     ROCK WALLS     too big to dodge round in one lane; the LAZER cuts them
     SUN FLARES     a lane on fire. A HEAT SHIELD lets you fly straight through
     ICE COMETS     an ICE PLOUGH smashes them; without one, go round
     SPACE TRAINS   a long line of ABAY containers. Change lanes
     MINES          they blink. They drift between lanes. Do not touch
     LASER GATES    Nova Corps beams that switch on and off: time it
     THE WHALE      a space whale, two lanes wide. It is not in a hurry

   and coins in lines between them, which a COIN MAGNET pulls in. The saucer
   upgrades are bought on ABAY: they are shown bolted on to the saucer, and
   some planets will not let you near until you have the one they need.

   On the way to a HOSTILE planet the lanes go quiet, the alarm goes, and a
   swarm comes in from the right in formation, peeling off to dive at you:
   a SPACE FIGHT. Your gun fires by itself; you only dodge, up and down.

   Keeps the old API: enter(g, index), enterReturn(g, ore), update, draw,
   touchMode, S. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const FX = PD.fx;
  const D = PD.data;
  const PT = PD.paint;

  const VW = 480, VH = 270, HD = 2;
  const LANES = [90, 144, 198];
  const PX = 104;
  const INK = 0x160f24;
  const MOON_TINT = '#8e86a8';

  /* What each planet asks of you before it will let you come near. */
  const NEEDS = { 2: ['ice', 'ICE PLOUGH', 'GLACIUS IS WRAPPED IN ICE COMETS'], 3: ['laser', 'LAZER BEAM', 'THE FORGE BELT IS SOLID ROCK WALLS'], 7: ['heat', 'HEAT SHIELD', 'CINDER IS INSIDE A SOLAR STORM'] };
  function need(g, index) {
    const n = NEEDS[index];
    if (!n) return null;
    return g.shipLvl(n[0]) > 0 ? null : n;
  }
  function hostile(index) { return index >= 2; }

  const S = {
    phase: 'launch', t: 0, index: 0, body: null, dir: 'out', ore: 0,
    dur: 20, dist: 0, travelled: 0, speed: 170,
    lane: 1, py: LANES[1], pvy: 0, tilt: 0, squash: 0, prevUp: 0, prevDown: 0, holdT: 0,
    obs: [], coins: [], parts: [], shots: [], foes: [], ebul: [], warn: [],
    hp: 3, hpMax: 3, bubble: 0, bubbleT: 0, invuln: 0, shake: 0, flash: 0, flashCol: '#ffffff',
    turbo: 0, turboCd: 0, cash: 0, combo: 0, comboT: 0, hits: 0, kills: 0,
    nextChunk: 0, fought: 0, fight: null, said: '', saidT: 0, banner: null, bannerT: 0,
    beam: null, heat: 0, bars: 0, zoom: 1, planet: null, moon: null, nebula: null, stars: [], gained: 0,
    wreck: 0, slow: 1
  };

  /* ============================================================== PAINTING */
  const ART = {};
  function once(key, fn) { return ART[key] || (ART[key] = fn()); }
  function finish(B) { B.rim(0xffffff, -1, -1, 0.35); B.outline(INK); return B.toCanvas(); }

  function paintRock(d, seed, pal) {
    const N = Math.round(d * HD) + 6, B = PT.buf(N, N), c = N / 2, r = d * HD / 2;
    const P = pal || [0x2a2238, 0x433858, 0x5e5278, 0x7c70a0, 0xa498c8];
    const craters = [];
    for (let k = 0; k < 3 + (d > 26 ? 2 : 0); k++) craters.push([c + (U.hash2(k, seed) - 0.5) * r * 1.1, c + (U.hash2(k, seed + 1) - 0.5) * r * 1.1, 2 + U.hash2(k, seed + 2) * r * 0.28]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x - c, dy = y - c, a = Math.atan2(dy, dx);
      const rr = r * (0.8 + 0.22 * U.fbm(Math.cos(a) * 1.6 + seed, Math.sin(a) * 1.6 + seed * 0.3, 2));
      const dd = Math.hypot(dx, dy);
      if (dd > rr) continue;
      let v = 0.5 + (-dx * 0.6 - dy * 0.8) / r * 0.34 + (U.fbm(x * 0.14, y * 0.14 + seed, 3) - 0.5) * 0.55 - Math.pow(dd / rr, 4) * 0.25;
      for (const [cx, cy, cr] of craters) {
        const q = Math.hypot(x - cx, y - cy) / cr;
        if (q < 1) v += q < 0.75 ? -0.28 + ((x - cx) + (y - cy)) / cr * 0.2 : 0.18;
      }
      const f = U.clamp(v, 0, 0.999) * P.length;
      let k = Math.floor(f);
      if (f - k > PT.bayer(x, y) * 0.9 + 0.05) k = Math.min(P.length - 1, k + 1);
      B.set(x, y, P[U.clamp(k, 0, P.length - 1)]);
    }
    return finish(B);
  }
  function paintWall() {
    const w = 32 * HD, h = 48 * HD, B = PT.buf(w + 4, h + 4);
    B.texture(2, 2, w, h, [0x241c30, 0x32283f, 0x40344f, 0x4e4060], 7, 3);
    for (let y = 2; y < h + 2; y += 18) { B.rect(2, y, w, 3, 0x6a6e84); B.rect(2, y, w, 1, 0x9aa0b8); }
    for (let x = 0; x < w; x += 10) { B.poly([[2 + x, 2], [8 + x, 2], [2 + x + 12, 14], [2 + x + 6, 14]], 0xffc83a); B.poly([[2 + x, h - 10], [8 + x, h - 10], [2 + x + 12, h + 2], [2 + x + 6, h + 2]], 0xffc83a); }
    B.rect(2, 14, w, 2, INK); B.rect(2, h - 12, w, 2, INK);
    // the mark that says a laser will do it
    const cx = w / 2 + 2, cy = h / 2 + 2;
    for (let a = 0; a < U.TAU; a += 0.04) B.rect(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, 2, 2, 0xff3a4a);
    B.rect(cx - 20, cy - 1, 40, 2, 0xff3a4a); B.rect(cx - 1, cy - 20, 2, 40, 0xff3a4a); B.disc(cx, cy, 4, 0xff7a8a);
    return finish(B);
  }
  function paintIce() {
    const w = 38 * HD, h = 34 * HD, B = PT.buf(w, h), cx = w / 2, cy = h / 2 + 4;
    const shards = [[0, -30, 12], [-18, -14, 10], [16, -18, 11], [-26, 8, 9], [22, 6, 10], [0, 6, 16]];
    for (const [dx, dy, r] of shards) {
      const x = cx + dx, y = cy + dy;
      B.poly([[x, y - r * 1.6], [x + r, y - r * 0.2], [x + r * 0.6, y + r], [x - r * 0.6, y + r], [x - r, y - r * 0.2]], 0x6ab8e8);
      B.poly([[x, y - r * 1.6], [x - r, y - r * 0.2], [x - r * 0.6, y + r], [x - r * 0.1, y + r * 0.2]], 0xb8e8ff);
      B.poly([[x, y - r * 1.6], [x + r, y - r * 0.2], [x + r * 0.2, y + r * 0.1]], 0x3a88c8);
      B.line(x - r * 0.3, y - r * 1.1, x - r * 0.5, y + r * 0.4, 0xffffff, 2, 0.8);
    }
    return finish(B);
  }
  function paintMine() {
    const N = 26 * HD, B = PT.buf(N, N), c = N / 2;
    for (let k = 0; k < 8; k++) { const a = k / 8 * U.TAU; B.poly([[c + Math.cos(a - 0.22) * 14, c + Math.sin(a - 0.22) * 14], [c + Math.cos(a + 0.22) * 14, c + Math.sin(a + 0.22) * 14], [c + Math.cos(a) * 24, c + Math.sin(a) * 24]], 0x8a8ea8); }
    B.ball(c, c, 16, 16, [0x5a2a3a, 0x9a4a5a, 0x2a1020], true);
    B.rect(c - 16, c - 1, 32, 3, 0x2a1020);
    return finish(B);
  }
  function paintCar(col, engine) {
    const w = (engine ? 52 : 46) * HD, h = 30 * HD, B = PT.buf(w + 4, h + 4);
    const C = PT.ramp(col);
    if (engine) {
      B.round(2, 4, w, h - 4, 14, C[0]); B.round(2, 4, w, 14, 12, C[1]);
      B.round(8, 14, 24, 18, 6, 0x1a2a3a); B.round(10, 16, 20, 8, 4, 0x7ec8ff);
      B.rect(w - 30, h - 12, 26, 8, 0x3a3e4e); B.disc(12, h - 8, 5, 0xfff0a0);
    } else {
      B.block(2, 2, w, h, C, 8, 6);
      for (let x = 10; x < w - 6; x += 10) B.rect(2 + x, 10, 2, h - 14, C[2]);
      B.rect(2, h - 4, w, 4, 0x2a2e3c);
    }
    return finish(B);
  }
  function paintWhale() {
    const w = 150 * HD, h = 76 * HD, B = PT.buf(w, h), cx = w * 0.45, cy = h * 0.5;
    B.poly([[w - 30, cy - 10], [w - 4, cy - 50], [w - 18, cy], [w - 4, cy + 44], [w - 30, cy + 10]], 0x4a4a8a);
    B.ball(cx, cy, w * 0.42, h * 0.38, [0x5a5aa8, 0x8a8ad8, 0x2a2a6a]);
    B.ellipse(cx - 10, cy + h * 0.2, w * 0.34, h * 0.14, 0xc8c8f0);
    for (let k = 0; k < 7; k++) B.line(cx - w * 0.3 + k * 26, cy + h * 0.14, cx - w * 0.28 + k * 26, cy + h * 0.3, 0x9a9ad8, 2);
    B.poly([[cx + 10, cy + 20], [cx + 60, cy + 70], [cx + 40, cy + 18]], 0x4a4a8a);
    B.disc(cx - w * 0.3, cy - 8, 7, 0xffffff); B.disc(cx - w * 0.31, cy - 8, 4, INK); B.disc(cx - w * 0.315, cy - 10, 1.5, 0xffffff);
    for (let k = 0; k < 14; k++) B.disc(cx - 40 + U.hash2(k, 3) * 160, cy - 40 + U.hash2(k, 4) * 30, 2 + U.hash2(k, 5) * 4, 0x7a7ac8);
    return finish(B);
  }
  // the swarm: each has two frames, wings up and wings down
  function paintFoe(kind, f) {
    const W = 40 * HD, H = 34 * HD, B = PT.buf(W, H), c = W / 2, m = H / 2;
    if (kind === 'bee') {
      const wy = f ? -14 : -4;
      for (const s of [-1, 1]) B.ellipse(c + s * 6 + 4, m + wy, 10, 7, 0xd8f0ff, 0.75);
      B.ball(c + 4, m, 20, 13, [0xffc83a, 0xfff0a0, 0xb8801a]);
      for (let k = 0; k < 3; k++) B.rect(c - 2 + k * 9, m - 12, 4, 25, 0x2a1a0a);
      B.ball(c - 16, m - 2, 10, 10, [0x3a3a4a, 0x6a6a7a, 0x1a1a2a]);
      B.disc(c - 20, m - 5, 4, 0xff3a4a); B.disc(c - 21, m - 6, 1.5, 0xffffff);
      B.poly([[c + 22, m - 3], [c + 34, m], [c + 22, m + 3]], 0x2a1a0a);
      B.line(c - 20, m - 11, c - 26, m - 20, 0x2a1a0a, 2);
    } else if (kind === 'moth') {
      const sp = f ? 0.7 : 1;
      for (const s of [-1, 1]) {
        B.poly([[c + 2, m], [c + 10, m + s * 30 * sp], [c + 26, m + s * 22 * sp], [c + 16, m + s * 4]], 0xc83aa8);
        B.poly([[c + 4, m], [c + 12, m + s * 22 * sp], [c + 22, m + s * 16 * sp], [c + 14, m + s * 3]], 0xff7ad8);
        B.disc(c + 14, m + s * 14 * sp, 3, 0xffd34d);
      }
      B.ball(c, m, 14, 8, [0x5a2a8a, 0x9a5ac8, 0x2a1050]);
      B.ball(c - 12, m, 8, 8, [0x5a2a8a, 0x9a5ac8, 0x2a1050]);
      B.disc(c - 15, m - 3, 3, 0x8affa0); B.disc(c - 15, m + 3, 3, 0x8affa0);
      B.line(c - 16, m - 6, c - 26, m - 16, 0x9a5ac8, 1); B.line(c - 16, m + 6, c - 26, m + 16, 0x9a5ac8, 1);
    } else if (kind === 'boss') {
      B.ball(c + 6, m, 30, 24, [0x2a9a6a, 0x6ad8a8, 0x1a4a3a], true);
      B.poly([[c + 6, m - 24], [c + 32, m - 30], [c + 26, m - 6]], 0x3a6ad8); B.poly([[c + 6, m + 24], [c + 32, m + 30], [c + 26, m + 6]], 0x3a6ad8);
      B.rect(c - 4, m - 2, 36, 4, 0x1a4a3a);
      B.ball(c - 20, m, 14, 14, [0x3a6ad8, 0x7aaaff, 0x1a2a6a]);
      B.disc(c - 26, m - 6, 4, 0xffd34d); B.disc(c - 26, m + 6, 4, 0xffd34d); B.disc(c - 27, m - 7, 1.5, 0xffffff); B.disc(c - 27, m + 5, 1.5, 0xffffff);
      const mj = f ? 4 : 0;
      B.poly([[c - 30, m - 6], [c - 40, m - 10 - mj], [c - 34, m - 2]], 0xd8dce8); B.poly([[c - 30, m + 6], [c - 40, m + 10 + mj], [c - 34, m + 2]], 0xd8dce8);
    } else if (kind === 'shark') {
      B.poly([[c - 34, m], [c - 12, m - 12], [c + 24, m - 8], [c + 34, m - 2], [c + 34, m + 4], [c + 24, m + 10], [c - 12, m + 12]], 0x7a8aa8);
      B.poly([[c - 34, m], [c - 12, m - 12], [c + 24, m - 8], [c + 34, m - 2]], 0xa8b8d8);
      B.poly([[c - 2, m - 10], [c + 12, m - 10], [c + 4, m - 28]], 0x5a6a88);
      B.poly([[c + 26, m], [c + 38, m - 12 - (f ? 4 : 0)], [c + 34, m], [c + 38, m + 12 + (f ? 4 : 0)]], 0x5a6a88);
      B.rect(c - 10, m + 2, 30, 3, 0xe5394a);
      B.disc(c - 22, m - 3, 2.5, INK);
      for (let k = 0; k < 4; k++) B.poly([[c - 30 + k * 4, m + 4], [c - 27 + k * 4, m + 4], [c - 28.5 + k * 4, m + 8]], 0xffffff);
    }
    return finish(B);
  }
  function art(kind, v) {
    if (kind === 'rock') return once('rock' + v, () => paintRock([28, 22, 36][v % 3], 7 + v * 13));
    if (kind === 'wall') return once('wall', paintWall);
    if (kind === 'ice') return once('ice', paintIce);
    if (kind === 'mine') return once('mine', paintMine);
    if (kind === 'car') return once('car' + v, () => paintCar([0xe5394a, 0x2f6fe0, 0xf5b82a, 0x1f9a4a][v % 4], false));
    if (kind === 'engine') return once('engine', () => paintCar(0x8a92a8, true));
    if (kind === 'whale') return once('whale', paintWhale);
    return once(kind + v, () => paintFoe(kind, v));
  }
  function nebula(tint) {
    return once('neb' + tint, () => {
      const W = VW * 2, H = VH * 2, B = PT.buf(W, H), t0 = PT.hex(tint);
      const base = [0x06040e, 0x0c0820];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = U.fbm(x * 0.006, y * 0.009 + PT.hex(tint) % 97, 4), m = U.fbm(x * 0.02 + 40, y * 0.02, 2);
        let c = PT.mix(base[0], base[1], y / H);
        if (n > 0.5) c = PT.mix(c, PT.mul(t0, 0.55), Math.min(1, (n - 0.5) * 2.4));
        if (n > 0.62 && m > 0.55) c = PT.mix(c, PT.mix(t0, 0xffffff, 0.3), (m - 0.55) * 1.4);
        B.set(x, y, c);
      }
      for (let k = 0; k < 500; k++) B.rect(U.hash2(k, 71) * W, U.hash2(k, 72) * H, 1, 1, 0xffffff, 0.2 + U.hash2(k, 73) * 0.6);
      return B.toCanvas();
    });
  }

  /* ================================================================ ENTER */
  function common(g, index) {
    S.t = 0; S.index = index; S.body = D.BODIES[index];
    S.dist = 0; S.rt = 0; S.travelled = 0; S.speed = 170;
    S.lane = 1; S.py = LANES[1]; S.pvy = 0; S.tilt = 0; S.squash = 0;
    S.obs.length = 0; S.coins.length = 0; S.parts.length = 0; S.shots.length = 0; S.foes.length = 0; S.ebul.length = 0; S.warn.length = 0;
    S.hpMax = 3 + g.shipLvl('armour'); S.hp = S.hpMax;
    S.bubble = g.shipLvl('bubble') > 0 ? 1 : 0; S.bubbleT = 0;
    S.invuln = 0; S.shake = 0; S.flash = 0; S.turbo = 0; S.turboCd = 0;
    S.cash = 0; S.combo = 0; S.comboT = 0; S.hits = 0; S.kills = 0; S.gained = 0;
    S.nextChunk = 1.6; S.fought = 0; S.flashed = 0; S.dest = null; S.fight = null; S.beam = null; S.heat = 0; S.bars = 1; S.wreck = 0; S.slow = 1;
    S.banner = null; S.bannerT = 0;
    S.stars = [];
    for (let i = 0; i < 160; i++) S.stars.push({ x: U.rand(0, VW), y: U.rand(0, VH), z: U.rand(0.15, 1) });
    if (!S.moon) S.moon = PD.arthome.buildPlanet(320, MOON_TINT, 4, 'moon');
    S.planet = PD.arthome.buildPlanet(320, S.body.tint, 100 + index * 17, planetKind(S.body.type));
    S.lv = { laser: g.shipLvl('laser'), heat: g.shipLvl('heat'), ice: g.shipLvl('ice'), magnet: g.shipLvl('magnet'), turbo: g.shipLvl('turbo'), radar: Math.max(g.shipLvl('radar'), Math.min(2, g.save.upg.navcom || 0)), armour: g.shipLvl('armour'), bubble: g.shipLvl('bubble') };
    A.sfx.warp();
    g.state = 'travel';
  }
  function enter(g, index) {
    const n = need(g, index);
    if (n) {
      // not allowed: say why, and send them back to the chart
      A.sfx.deny();
      g.openChart();
      if (PD.starmap && PD.starmap.say) PD.starmap.say('NEEDS A ' + n[1] + '. ' + n[2] + '. BUY ONE ON ABAY.');
      return;
    }
    common(g, index);
    S.dir = 'out'; S.phase = 'launch'; S.ore = 0;
    PD.chum.call(g, 'travel');
    const warp = g.save.upg.warp || 0;
    S.dur = Math.max(16, (20 + index * 3.2) * (1 - Math.min(0.3, warp * 0.05)));
    banner('DESTINATION', S.body.name.toUpperCase(), S.body.tint);
    say('HOLD ON TO SOMETHING.');
  }
  function enterReturn(g, ore) {
    common(g, g.bodyIndex || 0);
    S.dir = 'home'; S.phase = 'launch'; S.ore = ore || 0;
    S.dur = Math.max(12, 13 + S.index * 1.6);
    banner('GOING HOME', S.ore > 0 ? S.ore + ' ROCKS IN THE HOLD' : 'EMPTY HANDED', '#8affa0');
    say(S.ore > 0 ? 'DO NOT DROP ANY.' : 'NOTHING IN THE HOLD. GOING HOME ANYWAY.');
  }
  function planetKind(type) {
    if (type === 'ice') return 'ice';
    if (type === 'volcanic') return 'volcanic';
    if (type === 'gem' || type === 'titan') return 'gem';
    if (type === 'metal') return 'metal';
    if (type === 'core') return 'core';
    if (type === 'terra') return 'terra';
    return 'moon';
  }
  function say(line) { S.said = line; S.saidT = 3; }
  function banner(a, b, col) { S.banner = [a, b, col || '#ffd34d']; S.bannerT = 3.2; }
  function track() { return S.fight && S.fight.on ? 'boss' : 'dig'; }

  /* =============================================================== UPDATE */
  function update(dt, g) {
    dt *= S.slow;
    S.t += dt;
    S.shake = Math.max(0, S.shake - dt * 3);
    S.flash = Math.max(0, S.flash - dt * 3);
    S.invuln = Math.max(0, S.invuln - dt);
    S.saidT = Math.max(0, S.saidT - dt);
    S.bannerT = Math.max(0, S.bannerT - dt);
    S.comboT = Math.max(0, S.comboT - dt); if (S.comboT <= 0) S.combo = 0;
    S.squash = U.damp(S.squash, 0, 0.2, dt);
    S.slow = U.damp(S.slow, 1, 0.05, dt);
    const IN = PD.input;
    if (IN.hit('esc') && S.phase === 'run' && S.dir === 'out' && !(S.fight && S.fight.on)) { g.openChart(); return; }
    // bars in for cutscene bits, out for play
    const cine = S.phase === 'launch' || S.phase === 'approach' || S.phase === 'land' || S.phase === 'alert' || S.phase === 'wreck';
    S.bars = U.damp(S.bars, cine ? 1 : 0, 0.12, dt);

    const spd = S.speed * (S.turbo > 0 ? 2 : 1) * (S.phase === 'run' ? 1 : S.phase === 'fight' ? 0.35 : 0.6);
    for (const st of S.stars) { st.x -= spd * st.z * dt * 1.4; if (st.x < 0) { st.x += VW; st.y = U.rand(0, VH); } }
    for (let i = S.parts.length - 1; i >= 0; i--) {
      const p = S.parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 1.5; p.life -= dt;
      if (p.life <= 0) S.parts.splice(i, 1);
    }

    if (S.phase === 'launch') launch(dt, g);
    else if (S.phase === 'run') run(dt, g, spd);
    else if (S.phase === 'alert') alert(dt, g, spd);
    else if (S.phase === 'fight') fight(dt, g);
    else if (S.phase === 'wreck') wreckStep(dt, g);
    else if (S.phase === 'approach') approach(dt, g);
    else if (S.phase === 'land') land(dt, g);
  }

  /* The lift off: the moon drops away under you. */
  function launch(dt, g) {
    S.py = U.damp(S.py, LANES[1], 0.1, dt);
    if (S.t < 2.2) { for (let k = 0; k < 2; k++) S.parts.push({ x: PX + U.rand(-8, 8), y: S.py + 12, vx: U.rand(-60, 20), vy: U.rand(40, 120), life: U.rand(0.3, 0.7), col: U.chance(0.5) ? '#ffd27a' : '#ff8a3d', r: U.rand(1, 3) }); }
    if (S.t > 2.4) { S.phase = 'run'; S.t = 0; say(S.dir === 'out' ? 'UP AND DOWN TO DODGE. THAT IS ALL.' : 'THE QUIET WAY HOME. MOSTLY.'); }
  }

  /* Steering: up and down between three lanes, snappy, with a hold to repeat. */
  function steer(dt) {
    const IN = PD.input, m = IN.mouse;
    const up = IN.down('up'), dn = IN.down('down');
    let dir = 0;
    if (up && !S.prevUp) dir = -1;
    if (dn && !S.prevDown) dir = 1;
    if (up || dn) { S.holdT += dt; if (S.holdT > 0.3) { S.holdT = 0.18; dir = up ? -1 : 1; } } else S.holdT = 0;
    S.prevUp = up; S.prevDown = dn;
    // a tap on the top or bottom half of the screen does the same
    if (m.leftPressed && m.inside) dir = m.y < S.py ? -1 : 1;
    if (dir) {
      const nl = U.clamp(S.lane + dir, 0, 2);
      if (nl !== S.lane) {
        S.lane = nl; S.squash = 1; S.tilt = dir * 0.35;
        A.sfx.tone(dir < 0 ? 500 : 380, { type: 'sine', to: dir < 0 ? 820 : 240, dur: 0.08, vol: 0.05 });
        for (let k = 0; k < 5; k++) S.parts.push({ x: PX - 10, y: S.py, vx: U.rand(-120, -40), vy: -dir * U.rand(20, 70), life: 0.3, col: '#c8f0ff', r: 1 });
      } else { S.squash = 0.5; }
    }
    const ty = LANES[S.lane];
    S.pvy = (ty - S.py) * 14;
    S.py += S.pvy * dt;
    S.tilt = U.damp(S.tilt, U.clamp(S.pvy / 600, -0.4, 0.4), 0.25, dt);
    // turbo
    if (S.lv.turbo > 0 && S.turboCd <= 0 && (IN.hit('right') || IN.hit('space'))) {
      S.turbo = 1 + S.lv.turbo; S.turboCd = 9;
      A.sfx.tone(200, { type: 'sawtooth', to: 900, dur: 0.4, vol: 0.08 });
      S.shake = 0.4; say('TURBO!');
    }
    S.turbo = Math.max(0, S.turbo - dt);
    S.turboCd = Math.max(0, S.turboCd - dt);
  }
  function laneOf(y) { let best = 0; for (let i = 1; i < 3; i++) if (Math.abs(LANES[i] - y) < Math.abs(LANES[best] - y)) best = i; return best; }

  /* ---------------------------------------------------------- the lanes */
  function run(dt, g, spd) {
    steer(dt);
    S.travelled += spd * dt;
    S.rt += dt;
    S.dist = U.clamp(S.rt / S.dur, 0, 1);
    // the bubble grows back
    if (S.lv.bubble > 0 && !S.bubble) { S.bubbleT += dt; if (S.bubbleT >= [12, 8, 5][S.lv.bubble - 1]) { S.bubble = 1; S.bubbleT = 0; A.sfx.tone(520, { type: 'triangle', to: 1040, dur: 0.2, vol: 0.07 }); say('BUBBLE IS BACK.'); } }
    // chunks of trouble, one every so often
    S.nextChunk -= dt * (S.turbo > 0 ? 2 : 1);
    const quietEnd = S.dist > 0.9;
    if (S.nextChunk <= 0 && !quietEnd) { chunk(g); S.nextChunk = U.lerp(1.9, 1.05, S.dist) * (S.dir === 'home' ? 1.35 : 1) * (1 - Math.min(0.25, S.index * 0.03)); }
    // the fight: half way to a hostile world
    if (S.dir === 'out' && hostile(S.index) && !S.fought && S.dist > 0.45) { S.fought = 1; S.phase = 'alert'; S.t2 = 0; A.sfx.alarm && A.sfx.alarm(); banner('WARNING', 'HOSTILE SPACE', '#ff5a4d'); return; }
    moveThings(dt, g, spd);
    if (S.rt >= S.dur && !S.obs.length) { S.phase = 'approach'; S.t = 0; say(S.dir === 'out' ? 'THERE IT IS.' : 'HOME. THE MOON. YOUR MOON.'); }
    if (S.rt >= S.dur + 6) { S.obs.length = 0; }
  }

  // one pattern of trouble across the three lanes
  function chunk(g) {
    const x = VW + 40, hard = S.dist + S.index * 0.08;
    const pool = ['rock1', 'rock2', 'coins', 'train', 'mine'];
    if (hard > 0.2) pool.push('gate', 'rock2', 'wall');
    if (hard > 0.35) pool.push('flare', 'ice', 'mines');
    if (hard > 0.5 && U.chance(0.25)) pool.push('whale');
    if (U.chance(0.12)) pool.push('power');
    // the planet's own weather
    if (S.dir === 'out') {
      if (S.index === 2) pool.push('ice', 'ice', 'icewall');
      if (S.index === 3) pool.push('wall', 'wall', 'wallrow');
      if (S.index === 7) pool.push('flare', 'flare', 'flarerow');
      if (S.index === 4) pool.push('coins', 'coins');
    }
    const kind = U.pick(pool);
    const free = U.randInt(0, 2);
    const others = [0, 1, 2].filter(l => l !== free);
    const add = (o) => { o.x = o.x || x; o.hitT = 0; S.obs.push(o); if (S.lv.radar > 0) S.warn.push({ lane: o.lane, t: 0.6 + S.lv.radar * 0.5, kind: o.kind }); };
    switch (kind) {
      case 'rock1': add({ kind: 'rock', lane: U.randInt(0, 2), v: U.randInt(0, 2), hp: 0.35, r: 13, spin: U.rand(-2, 2) }); coinLine(free, x, 5); break;
      case 'rock2': for (const l of others) add({ kind: 'rock', lane: l, v: U.randInt(0, 2), hp: 0.35, r: 13, spin: U.rand(-2, 2), x: x + U.rand(0, 40) }); coinLine(free, x, 6); break;
      case 'wall': { const n = S.lv.laser ? U.randInt(1, 2) : 1; for (let i = 0; i < n; i++) add({ kind: 'wall', lane: others[i], hp: 1.4, r: 16 }); coinLine(free, x, 6); break; }
      case 'wallrow': if (S.lv.laser) { for (let l = 0; l < 3; l++) add({ kind: 'wall', lane: l, hp: 1.4, r: 16 }); say('WALL! LAZER IT!'); } else add({ kind: 'wall', lane: others[0], hp: 1.4, r: 16 }); break;
      case 'ice': add({ kind: 'ice', lane: others[0], r: 16, spin: 0 }); if (U.chance(0.5)) add({ kind: 'ice', lane: others[1], r: 16, x: x + 60 }); coinLine(free, x, 4); break;
      case 'icewall': if (S.lv.ice) { for (let l = 0; l < 3; l++) add({ kind: 'ice', lane: l, r: 16 }); say('ICE! PLOUGH THROUGH!'); } else add({ kind: 'ice', lane: others[0], r: 16 }); break;
      case 'flare': add({ kind: 'flare', lane: others[0], r: 30, w: 70, warmT: 1 }); if (U.chance(0.4)) add({ kind: 'flare', lane: others[1], r: 30, w: 70, warmT: 1, x: x + 30 }); break;
      case 'flarerow': if (S.lv.heat) { for (let l = 0; l < 3; l++) add({ kind: 'flare', lane: l, r: 30, w: 90, warmT: 1 }); say('FLARE! FLY THROUGH IT!'); } else add({ kind: 'flare', lane: others[0], r: 30, w: 70, warmT: 1 }); break;
      case 'train': { const l = U.randInt(0, 2), n = U.randInt(3, 5 + Math.floor(hard * 3)); add({ kind: 'train', lane: l, n, r: 20, len: 52 + n * 48 }); coinLine((l + 1 + U.randInt(0, 1)) % 3, x + 30, 9); break; }
      case 'mine': add({ kind: 'mine', lane: U.randInt(0, 2), hp: 0.25, r: 11, drift: 0 }); coinLine(free, x + 40, 4); break;
      case 'mines': for (let i = 0; i < 3; i++) add({ kind: 'mine', lane: U.randInt(0, 2), hp: 0.25, r: 11, drift: U.chance(0.5) ? U.rand(0.6, 1.2) : 0, ph: U.rand(0, 6), x: x + i * 60 }); break;
      case 'gate': add({ kind: 'gate', lane: U.randInt(0, 2), r: 8, period: 1.4, ph: U.rand(0, 1.4) }); coinLine(free, x, 5); break;
      case 'whale': { const l = U.randInt(0, 1); add({ kind: 'whale', lane: l, lanes: [l, l + 1], r: 50, x: x + 60 }); say('A SPACE WHALE. DO NOT WAKE IT.'); coinLine(l === 0 ? 2 : 0, x + 30, 10); break; }
      case 'coins': { let l = U.randInt(0, 2); for (let i = 0; i < 12; i++) { if (i % 4 === 3) l = U.clamp(l + U.pick([-1, 1]), 0, 2); S.coins.push({ x: x + i * 20, y: LANES[l], lane: l, t: i * 0.2 }); } break; }
      case 'power': add({ kind: 'power', lane: U.randInt(0, 2), r: 10, what: U.pick(S.hp < S.hpMax ? ['fix', 'fix', 'x2'] : ['x2', 'fix']) }); break;
    }
  }
  function coinLine(lane, x, n) { for (let i = 0; i < n; i++) S.coins.push({ x: x + i * 20, y: LANES[lane], lane, t: i * 0.2 }); }

  function moveThings(dt, g, spd) {
    const podLane = laneOf(S.py);
    // the laser: at the first thing in your lane that a laser can hurt
    S.beam = null;
    if (S.lv.laser > 0) {
      const lanes = S.lv.laser >= 3 ? [podLane - 1, podLane, podLane + 1] : [podLane];
      for (const L of lanes) {
        if (L < 0 || L > 2) continue;
        let best = null;
        for (const o of S.obs) if ((o.lane === L) && o.hp !== undefined && o.x > PX + 8 && o.x < PX + 300 && (!best || o.x < best.x)) best = o;
        if (best) {
          best.hp -= dt * [0, 1.4, 2.2, 3.2][S.lv.laser];
          best.hitT = 0.1;
          if (L === podLane || !S.beam) S.beam = { x: best.x - best.r, y: LANES[L], main: L === podLane };
          if (U.chance(0.6)) S.parts.push({ x: best.x - best.r, y: LANES[L] + U.rand(-4, 4), vx: U.rand(-60, 60), vy: U.rand(-80, 80), life: 0.25, col: U.chance(0.5) ? '#ffd34d' : '#ff5a4d', r: 1 });
          if (best.hp <= 0) { blowUp(best, g); best.dead = 1; }
        }
      }
      S.obs = S.obs.filter(o => !o.dead);
    }
    for (let i = S.warn.length - 1; i >= 0; i--) { S.warn[i].t -= dt; if (S.warn[i].t <= 0) S.warn.splice(i, 1); }
    for (let i = S.obs.length - 1; i >= 0; i--) {
      const o = S.obs[i];
      const v = o.kind === 'whale' ? spd * 0.55 : o.kind === 'train' ? spd * 1.25 : spd;
      o.x -= v * dt;
      o.hitT = Math.max(0, (o.hitT || 0) - dt);
      if (o.kind === 'mine' && o.drift) { o.ph += dt * o.drift * 2; o.y = LANES[o.lane] + Math.sin(o.ph) * 30; }
      const tail = o.kind === 'train' ? o.len : o.kind === 'flare' ? o.w : o.r * 2;
      if (o.x + tail < -40) { S.obs.splice(i, 1); continue; }
      // hitting it
      if (S.invuln > 0 || S.phase !== 'run') continue;
      const oy = o.y !== undefined ? o.y : LANES[o.lane];
      const lanes = o.lanes || [o.lane];
      let inLane = false;
      for (const L of lanes) if (Math.abs(S.py - LANES[L]) < 20) inLane = true;
      if (o.kind === 'mine' && o.drift) inLane = Math.abs(S.py - oy) < 18;
      if (!inLane) continue;
      const x0 = o.x - o.r, x1 = o.x + (o.kind === 'train' ? o.len - o.r : o.kind === 'flare' ? o.w : o.r);
      if (PX + 12 < x0 || PX - 12 > x1) continue;
      touch(o, g, i);
    }
    // coins
    const mag = [0, 44, 80, 400][S.lv.magnet];
    for (let i = S.coins.length - 1; i >= 0; i--) {
      const c = S.coins[i];
      c.t += dt;
      c.x -= spd * dt;
      if (mag && Math.abs(c.x - PX) < mag + 40 && Math.abs(c.y - S.py) < mag + 10 && c.x > PX - 20) { c.x += (PX - c.x) * Math.min(1, dt * 7); c.y += (S.py - c.y) * Math.min(1, dt * 7); c.pull = 1; }
      if (c.x < -10) { S.coins.splice(i, 1); continue; }
      if (Math.abs(c.x - PX) < 12 && Math.abs(c.y - S.py) < 14) { S.coins.splice(i, 1); grabCoin(g, c); }
    }
  }
  function grabCoin(g, c) {
    S.combo++; S.comboT = 1.2;
    const v = Math.round((4 + S.index * 3) * (S.turbo > 0 ? 2 : 1) * (S.x2 > S.t ? 2 : 1));
    S.cash += v;
    A.sfx.tone(880 + Math.min(12, S.combo) * 60, { type: 'square', dur: 0.04, vol: 0.035 });
    for (let k = 0; k < 3; k++) S.parts.push({ x: c.x, y: c.y, vx: U.rand(-40, 40), vy: U.rand(-60, 10), life: 0.35, col: '#ffe070', r: 1 });
  }
  function blowUp(o, g) {
    const oy = o.y !== undefined ? o.y : LANES[o.lane];
    A.sfx.boom && A.sfx.boom(o.kind === 'wall' ? 2 : 1);
    S.shake = Math.max(S.shake, o.kind === 'wall' ? 0.5 : 0.25);
    const col = o.kind === 'wall' ? ['#5a4a70', '#ffc83a', '#8a7aa8'] : o.kind === 'mine' ? ['#ff5a4d', '#ffd34d', '#5a2a3a'] : o.kind === 'ice' ? ['#c8f0ff', '#6ab8e8', '#ffffff'] : ['#7c70a0', '#a498c8', '#433858'];
    for (let k = 0; k < 18; k++) S.parts.push({ x: o.x, y: oy, vx: U.rand(-160, 100), vy: U.rand(-140, 140), life: U.rand(0.3, 0.8), col: U.pick(col), r: U.rand(1, 3) });
    const v = o.kind === 'wall' ? 30 : 8;
    S.cash += v; S.kills++;
    S.pops = S.pops || []; S.pops.push({ x: o.x, y: oy - 10, s: '+$' + v, t: 0.8 });
  }
  function touch(o, g, i) {
    const k = o.kind;
    if (k === 'power') {
      S.obs.splice(i, 1);
      if (o.what === 'fix') { S.hp = Math.min(S.hpMax, S.hp + 1); say('REPAIRED. WITH TAPE.'); }
      else { S.x2 = S.t + 8; say('DOUBLE COINS!'); }
      A.sfx.tone(660, { type: 'triangle', to: 1320, dur: 0.2, vol: 0.08 });
      return;
    }
    if (k === 'flare' && S.lv.heat > 0) { S.heat = 1; if (U.chance(0.3)) S.parts.push({ x: PX, y: S.py, vx: U.rand(-100, -20), vy: U.rand(-40, 40), life: 0.3, col: '#ffb03a', r: 2 }); return; }
    if (k === 'ice' && S.lv.ice > 0) { blowUp(o, g); S.obs.splice(i, 1); A.sfx.crack && A.sfx.crack(1); return; }
    if (k === 'gate' && !gateOn(o)) return;
    if (S.turbo > 0 && (k === 'rock' || k === 'mine' || k === 'ice')) { blowUp(o, g); S.obs.splice(i, 1); return; }
    hurt(g, k);
    if (k === 'rock' || k === 'mine' || k === 'ice' || k === 'wall') { blowUp(o, g); S.obs.splice(i, 1); }
  }
  function gateOn(o) { return ((S.t + o.ph) % o.period) < o.period * 0.55; }
  function hurt(g, why) {
    if (S.invuln > 0) return;
    if (S.bubble) {
      S.bubble = 0; S.bubbleT = 0; S.invuln = 0.8; S.shake = 0.5; S.flash = 0.6; S.flashCol = '#7ef9ff';
      A.sfx.tone(900, { type: 'square', to: 300, dur: 0.15, vol: 0.1 });
      for (let k = 0; k < 16; k++) { const a = k / 16 * U.TAU; S.parts.push({ x: PX + Math.cos(a) * 18, y: S.py + Math.sin(a) * 14, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.4, col: '#7ef9ff', r: 1 }); }
      say('POP. THE BUBBLE TOOK IT.');
      return;
    }
    S.hp--; S.hits++;
    S.invuln = 1.3; S.shake = 1; S.flash = 1; S.flashCol = '#ff5a4d';
    S.squash = 1; S.combo = 0;
    A.sfx.hurt(); PD.touch.buzz && PD.touch.buzz(30);
    for (let k = 0; k < 6; k++) { const a = k / 6 * U.TAU; S.parts.push({ x: PX + Math.cos(a) * 14, y: S.py + Math.sin(a) * 10, vx: Math.cos(a) * 60 - 40, vy: Math.sin(a) * 60, life: 0.6, col: '#ffe86a', r: 2, star: 1 }); }
    for (let k = 0; k < 16; k++) S.parts.push({ x: PX, y: S.py, vx: U.rand(-200, 80), vy: U.rand(-150, 150), life: U.rand(0.3, 0.7), col: U.chance(0.5) ? '#ff8a3d' : '#c9bce8', r: U.rand(1, 3) });
    const lines = { flare: ['HOT HOT HOT.', 'A HEAT SHIELD WOULD HAVE HELPED.'], ice: ['BRAIN FREEZE.', 'AN ICE PLOUGH WOULD HAVE HELPED.'], wall: ['WALL.', 'A LAZER WOULD HAVE HELPED.'], train: ['HIT BY A TRAIN. IN SPACE.'], gate: ['ZAPPED BY THE COPS.'], whale: ['SORRY WHALE.'], shot: ['THEY SHOT THE PAINT.'] };
    say(U.pick(lines[why] || ['OW.', 'THAT WAS THE PAINT.', 'WHO PUT THAT THERE.']));
    if (S.hp <= 0) { S.phase = 'wreck'; S.t2 = 0; S.slow = 0.25; S.wreck = 1; banner('SAUCER WRECKED', S.dir === 'out' ? 'CRASH LANDING' : 'LIMPING HOME', '#ff5a4d'); A.sfx.boom && A.sfx.boom(3); }
  }
  function wreckStep(dt, g) {
    S.t2 += dt;
    S.tilt += dt * 6;
    S.py += Math.sin(S.t2 * 3) * dt * 20;
    if (U.chance(0.7)) S.parts.push({ x: PX, y: S.py, vx: U.rand(-160, -40), vy: U.rand(-60, 60), life: U.rand(0.4, 0.9), col: U.pick(['#ff8a3d', '#ffd34d', '#4a4458']), r: U.rand(1, 4) });
    for (const o of S.obs) o.x -= 90 * dt;
    if (S.t2 > 1.4) { S.obs.length = 0; S.coins.length = 0; S.phase = 'approach'; S.t = 0; S.tilt = 0; }
  }

  /* ---------------------------------------------------------- the fight
     Galaga, turned on its side: they come in along curves, settle into a
     grid on the right that breathes, and then take turns diving at you. */
  function alert(dt, g, spd) {
    S.t2 += dt;
    steer(dt);
    moveThings(dt, g, spd);
    if (S.t2 > 2.6) {
      S.phase = 'fight'; S.t2 = 0;
      S.obs.length = 0;
      S.fight = { on: 1, wave: 0, waves: S.index >= 5 ? 3 : 2, t: 0, fireT: 0, diveT: 2, done: 0, timeout: 60 };
      spawnWave();
    }
  }
  const PATHS = [
    // from top right, loop down then up into place
    t => [VW + 20 - t * 260, -20 + Math.sin(t * 3.2) * 110 + t * 60],
    t => [VW + 20 - t * 260, VH + 20 - Math.sin(t * 3.2) * 110 - t * 60],
    t => [VW + 30 - t * 300 + Math.sin(t * 6) * 30, VH / 2 + Math.cos(t * 6) * 70]
  ];
  function spawnWave() {
    const F2 = S.fight, w = F2.wave;
    const rows = 4, cols = 4 + Math.min(2, S.index >> 1);
    const kinds = ['bee', 'moth', 'shark', 'boss'];
    let n = 0;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const kind = c === cols - 1 ? (r === 1 || r === 2 ? 'boss' : 'moth') : c >= cols - 2 ? 'moth' : (S.index >= 4 && (r + c) % 3 === 0 ? 'shark' : 'bee');
      const hp = { bee: 1, moth: 2, shark: 2, boss: 4 }[kind] + (w >= 2 ? 1 : 0);
      S.foes.push({ kind, hp, max: hp, slot: [300 + c * 26, 62 + r * 44 + (c % 2) * 6], x: VW + 60, y: -40, t: -n * 0.12 - (c % 2) * 0.4, path: n % 3, st: 'enter', f: 0, fire: U.rand(1, 4), hitT: 0, dv: null });
      n++;
    }
    banner('WAVE ' + (w + 1), w === F2.waves - 1 ? 'THE BIG ONES' : 'HERE THEY COME', '#ff7ac4');
  }
  function fight(dt, g) {
    const F2 = S.fight, IN = PD.input;
    F2.t += dt; S.t2 += dt;
    // free up and down: hold to move
    const up = IN.down('up'), dn = IN.down('down');
    const m = IN.mouse;
    let want = 0;
    if (up) want -= 1; if (dn) want += 1;
    if (m.left && m.inside) want = U.clamp((m.y - S.py) / 20, -1, 1);
    S.pvy = U.damp(S.pvy, want * 220, 0.3, dt);
    S.py = U.clamp(S.py + S.pvy * dt, LANES[0] - 34, LANES[2] + 34);
    S.tilt = U.damp(S.tilt, U.clamp(S.pvy / 700, -0.35, 0.35), 0.25, dt);
    if (S.lv.bubble > 0 && !S.bubble) { S.bubbleT += dt; if (S.bubbleT >= [12, 8, 5][S.lv.bubble - 1]) { S.bubble = 1; S.bubbleT = 0; } }
    // your gun: a pea shooter, or the lazer if you bought it
    const lv = S.lv.laser;
    F2.fireT -= dt;
    if (F2.fireT <= 0) {
      F2.fireT = [0.34, 0.22, 0.17, 0.13][lv];
      const spread = lv >= 3 ? [-0.18, 0, 0.18] : lv >= 2 ? [-0.001, 0.001] : [0];
      spread.forEach((a, i) => S.shots.push({ x: PX + 16, y: S.py + (lv === 2 ? (i ? 4 : -4) : 0), vx: Math.cos(a) * (lv ? 520 : 400), vy: Math.sin(a) * 520, dmg: lv ? 1.3 : 1, laser: lv > 0 }));
      A.sfx.tone(lv ? 1400 : 1000, { type: 'square', to: lv ? 700 : 500, dur: 0.04, vol: 0.025 });
    }
    for (let i = S.shots.length - 1; i >= 0; i--) {
      const s = S.shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.x > VW + 10 || s.y < 0 || s.y > VH) { S.shots.splice(i, 1); continue; }
      for (const e of S.foes) {
        if (e.hp <= 0 || e.st === 'enter' && e.t < 0) continue;
        const r = e.kind === 'boss' ? 16 : 11;
        if (Math.abs(s.x - e.x) < r && Math.abs(s.y - e.y) < r) {
          e.hp -= s.dmg; e.hitT = 0.12; S.shots.splice(i, 1);
          if (e.hp <= 0) killFoe(e, g);
          else A.sfx.tone(300, { type: 'square', dur: 0.03, vol: 0.03 });
          break;
        }
      }
    }
    // the formation breathes
    const br = Math.sin(F2.t * 1.6) * 6, sway = Math.sin(F2.t * 0.9) * 10;
    F2.diveT -= dt;
    const alive = S.foes.filter(e => e.hp > 0);
    if (F2.diveT <= 0 && alive.length) {
      F2.diveT = U.rand(0.9, 2.2) * (1 - Math.min(0.4, S.index * 0.04));
      const idle = alive.filter(e => e.st === 'form');
      for (let k = 0; k < Math.min(idle.length, S.index >= 5 ? 2 : 1); k++) {
        const e = U.pick(idle);
        if (e.st !== 'form') continue;
        e.st = 'dive'; e.dt = 0; e.dv = { x0: e.x, y0: e.y, ty: S.py, side: e.y < VH / 2 ? 1 : -1 };
        A.sfx.tone(700, { type: 'sine', to: 300, dur: 0.3, vol: 0.04 });
      }
    }
    for (const e of S.foes) {
      if (e.hp <= 0) continue;
      e.f += dt * (e.kind === 'boss' ? 4 : 9);
      e.hitT = Math.max(0, e.hitT - dt);
      const sx = e.slot[0] + sway + (e.slot[0] - 380) * br * 0.01, sy = e.slot[1] + (e.slot[1] - 144) * br * 0.012;
      if (e.st === 'enter') {
        e.t += dt;
        if (e.t < 0) continue;
        const q = Math.min(1, e.t / 1.3);
        const p = PATHS[e.path](q);
        e.x = U.lerp(p[0], sx, U.smoothstep(0.55, 1, q)); e.y = U.lerp(p[1], sy, U.smoothstep(0.55, 1, q));
        if (q >= 1) e.st = 'form';
      } else if (e.st === 'form') {
        e.x = U.damp(e.x, sx, 0.2, dt); e.y = U.damp(e.y, sy, 0.2, dt);
      } else if (e.st === 'dive') {
        e.dt += dt;
        const d = e.dv, q = e.dt / 2.2;
        // a swoop: out and round, across at your height, then away to the left
        e.x = d.x0 - q * (d.x0 + 60) + Math.sin(q * Math.PI) * 30;
        e.y = d.y0 + (d.ty - d.y0) * U.smoothstep(0, 0.5, q) + Math.sin(q * Math.PI * 2) * 40 * d.side;
        if (q > 1) { e.st = 'enter'; e.t = 0; e.path = U.randInt(0, 2); }
      }
      // they shoot back
      e.fire -= dt;
      if (e.fire <= 0 && e.st !== 'enter' && e.x < VW - 10) {
        e.fire = U.rand(1.6, 3.6) * (1 - Math.min(0.5, S.index * 0.05));
        const aim = e.kind === 'shark' || e.kind === 'boss';
        const a = aim ? Math.atan2(S.py - e.y, PX - e.x) : Math.PI;
        S.ebul.push({ x: e.x - 8, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, big: e.kind === 'boss' });
      }
      // ramming
      if (S.invuln <= 0 && Math.abs(e.x - PX) < 16 && Math.abs(e.y - S.py) < 14) { hurt(g, 'shot'); e.hp -= 2; if (e.hp <= 0) killFoe(e, g); }
    }
    for (let i = S.ebul.length - 1; i >= 0; i--) {
      const b = S.ebul[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -10 || b.y < -10 || b.y > VH + 10) { S.ebul.splice(i, 1); continue; }
      if (Math.abs(b.x - PX) < 12 && Math.abs(b.y - S.py) < 10) { S.ebul.splice(i, 1); hurt(g, 'shot'); }
    }
    if (S.phase !== 'fight') return;
    // coins they drop drift towards you
    for (let i = S.coins.length - 1; i >= 0; i--) {
      const c = S.coins[i];
      c.t += dt; c.x -= 60 * dt;
      const mag = [30, 60, 100, 400][S.lv.magnet];
      if (Math.abs(c.x - PX) < mag && Math.abs(c.y - S.py) < mag) { c.x += (PX - c.x) * Math.min(1, dt * 6); c.y += (S.py - c.y) * Math.min(1, dt * 6); }
      if (c.x < -10) { S.coins.splice(i, 1); continue; }
      if (Math.abs(c.x - PX) < 12 && Math.abs(c.y - S.py) < 14) { S.coins.splice(i, 1); grabCoin(g, c); }
    }
    if (!alive.length || F2.t > F2.timeout) {
      F2.wave++;
      if (F2.wave < F2.waves && F2.t <= F2.timeout) { S.foes.length = 0; spawnWave(); return; }
      // cleared
      const bonus = Math.round(300 + S.index * 250) * (alive.length ? 0 : 1);
      S.cash += bonus;
      S.foes.length = 0; S.ebul.length = 0; S.shots.length = 0;
      F2.on = 0;
      S.phase = 'run';
      banner(alive.length ? 'THEY GAVE UP' : 'SPACE CLEARED', bonus ? '+$' + U.fmt(bonus) : 'KEEP GOING', '#8affa0');
      A.sfx.fanfare && A.sfx.fanfare();
      S.lane = laneOf(S.py);
    }
  }
  function killFoe(e, g) {
    e.hp = 0; S.kills++;
    A.sfx.killMob ? A.sfx.killMob() : A.sfx.boom(1);
    S.shake = Math.max(S.shake, e.kind === 'boss' ? 0.5 : 0.2);
    const cols = { bee: ['#ffc83a', '#2a1a0a', '#fff0a0'], moth: ['#ff7ad8', '#c83aa8', '#8affa0'], boss: ['#6ad8a8', '#3a6ad8', '#ffd34d'], shark: ['#a8b8d8', '#e5394a', '#ffffff'] }[e.kind];
    for (let k = 0; k < (e.kind === 'boss' ? 30 : 14); k++) S.parts.push({ x: e.x, y: e.y, vx: U.rand(-150, 150), vy: U.rand(-150, 150), life: U.rand(0.3, 0.8), col: U.pick(cols), r: U.rand(1, 3) });
    for (let k = 0; k < (e.kind === 'boss' ? 5 : 2); k++) S.coins.push({ x: e.x + U.rand(-8, 8), y: e.y + U.rand(-8, 8), lane: 1, t: 0 });
    S.pops = S.pops || []; S.pops.push({ x: e.x, y: e.y - 12, s: e.kind === 'boss' ? 'BOOM' : U.pick(['POP', 'ZAP', 'BYE']), t: 0.7 });
  }

  /* ------------------------------------------------------ arriving */
  function approach(dt, g) {
    S.py = U.damp(S.py, LANES[1], 0.1, dt);
    for (const o of S.obs) o.x -= 200 * dt;
    if (S.t > 2.6) { S.phase = 'land'; S.t = 0; say(S.wreck ? 'THIS IS GOING TO HURT.' : 'LANDING. PROBABLY.'); }
  }
  function land(dt, g) {
    if (U.chance(0.8)) S.parts.push({ x: PX + U.rand(-6, 6), y: S.py + 12, vx: U.rand(-40, 40), vy: U.rand(40, 140), life: U.rand(0.2, 0.5), col: U.chance(0.5) ? '#ffd27a' : '#ff8a3d', r: U.rand(1, 3) });
    if (S.t > 2.0 && !S.flashed) { S.flashed = 1; FX.flash && FX.flash(0.5, '#ffffff'); A.sfx.dock(); }
    if (S.t > 2.2) arrive(g);
  }
  function arrive(g) {
    // the coins you caught
    if (S.cash > 0) { g.save.credits += S.cash; g.save.totalEarned += S.cash; S.gained = S.cash; }
    if (S.dir === 'home') {
      let lost = 0;
      if (S.hits > 0) lost = dropFromVault(g, S.hits * 2);
      g.travelResult = { dir: 'home', hits: S.hits, lost, gained: S.gained };
      g.arriveHome(Math.max(0, S.ore - lost));
      return;
    }
    const dmg = S.hits;
    g.travelResult = { dir: 'out', hits: dmg, clean: dmg === 0, gained: S.gained };
    g.dive(S.index);
    const p = g.player;
    if (S.wreck) {
      p.hull = Math.max(1, p.stat('hull') * 0.25);
      FX.text(p.x, p.y - 30, 'CRASH LANDED', '#ff5a4d', 1);
    } else if (dmg > 0) {
      p.hull = Math.max(p.stat('hull') * 0.25, p.hull - dmg * p.stat('hull') * 0.1);
      FX.text(p.x, p.y - 30, '-' + dmg + ' HULL', '#ff5a4d', 1);
    } else {
      const bonus = Math.round(400 + S.index * 340);
      g.save.credits += bonus; g.save.totalEarned += bonus;
      FX.text(p.x, p.y - 30, 'CLEAN RUN +$' + U.fmt(bonus), '#8affa0', 2);
    }
    if (S.cash > 0) FX.text(p.x, p.y - 44, 'SPACE COINS +$' + U.fmt(S.cash), '#ffd34d', 1);
  }
  function dropFromVault(g, n) {
    const v = g.save.vault || {};
    const ids = Object.keys(v).map(Number).filter(k => v[k] > 0).sort((a, b) => (D.MAT[a] ? D.MAT[a].cr : 0) - (D.MAT[b] ? D.MAT[b].cr : 0));
    let lost = 0;
    for (const id of ids) {
      while (v[id] > 0 && lost < n) { v[id]--; lost++; }
      if (v[id] <= 0) delete v[id];
      if (lost >= n) break;
    }
    return lost;
  }

  /* ================================================================= DRAW */
  function draw(ctx, g, time) {
    const t = time;
    const sh = S.shake;
    ctx.save();
    if (sh > 0) ctx.translate(Math.round(U.rand(-3, 3) * sh), Math.round(U.rand(-3, 3) * sh));
    // the sky
    const neb = nebula(S.dir === 'out' ? S.body.tint : MOON_TINT);
    // the nebula, and its mirror image after it, so the join never shows
    const off = (S.travelled * 0.05) % (VW * 2);
    for (let k = 0; k < 3; k++) {
      const x = k * VW - off;
      if (x > VW || x < -VW) continue;
      if (k % 2) { ctx.save(); ctx.translate(x + VW, 0); ctx.scale(-1, 1); ctx.drawImage(neb, 0, 0, VW, VH); ctx.restore(); }
      else ctx.drawImage(neb, x, 0, VW, VH);
    }
    for (const st of S.stars) {
      const c = st.z > 0.7 ? '#ffffff' : st.z > 0.4 ? '#c8c0e8' : '#6a6290';
      if (S.turbo > 0 && st.z > 0.5) { ctx.globalAlpha = 0.6; X.rect(ctx, st.x, st.y, 10 * st.z, 1, c); ctx.globalAlpha = 1; }
      else X.rect(ctx, st.x, st.y, st.z > 0.85 ? 2 : 1, 1, c);
    }
    drawWorlds(ctx, g, t);
    // lane guides, faint
    if (S.phase === 'run' || S.phase === 'alert') {
      for (let i = 0; i < 4; i++) {
        const y = i === 0 ? LANES[0] - 27 : i === 3 ? LANES[2] + 27 : (LANES[i - 1] + LANES[i]) / 2;
        ctx.globalAlpha = 0.12;
        for (let x = -((S.travelled * 1) % 16); x < VW; x += 16) X.rect(ctx, x, y, 8, 1, '#7ef9ff');
        ctx.globalAlpha = 1;
      }
    }
    // coins
    for (const c of S.coins) drawCoin(ctx, c.x, c.y, t + c.t);
    // obstacles
    for (const o of S.obs) drawObs(ctx, o, t);
    // the swarm
    for (const e of S.foes) if (e.hp > 0 && !(e.st === 'enter' && e.t < 0)) drawFoe(ctx, e, t);
    for (const s of S.shots) {
      if (s.laser) { X.rect(ctx, s.x - 8, s.y - 1, 10, 2, '#ff5a6a'); X.rect(ctx, s.x - 6, s.y, 8, 1, '#ffffff'); }
      else { X.rect(ctx, s.x - 3, s.y - 1, 4, 3, '#8affa0'); }
    }
    for (const b of S.ebul) { X.blob(ctx, b.x, b.y, b.big ? 4 : 2.5, b.big ? 4 : 2.5, '#ff7ad8'); X.rect(ctx, b.x - 1, b.y - 1, 2, 2, '#ffffff'); }
    // the laser beam
    if (S.beam && S.phase === 'run') {
      const b = S.beam, w = [0, 2, 3, 4][S.lv.laser], fl = 0.7 + Math.sin(t * 40) * 0.3;
      ctx.globalAlpha = 0.35 * fl; X.rect(ctx, PX + 14, b.y - w - 1, b.x - PX - 14, w * 2 + 2, '#ff3a4a'); ctx.globalAlpha = 1;
      X.rect(ctx, PX + 14, b.y - w / 2, b.x - PX - 14, Math.max(1, w), '#ff7a8a');
      X.rect(ctx, PX + 14, b.y, b.x - PX - 14, 1, '#ffffff');
      PT.glow(ctx, b.x, b.y, 12, '#ff5a4d', 0.6);
    }
    // bits
    for (const p of S.parts) {
      ctx.globalAlpha = Math.min(1, p.life * 3);
      if (p.star) { X.rect(ctx, p.x - 1, p.y, 3, 1, p.col); X.rect(ctx, p.x, p.y - 1, 1, 3, p.col); }
      else X.rect(ctx, p.x, p.y, p.r, p.r, p.col);
    }
    ctx.globalAlpha = 1;
    drawPod(ctx, g, t);
    // radar warnings
    for (const w of S.warn) if (Math.sin(t * 16) > -0.3) {
      const y = LANES[w.lane];
      X.poly(ctx, [[VW - 6, y], [VW - 16, y - 7], [VW - 16, y + 7]], '#ff5a4d');
      F.draw(ctx, '!', VW - 23, y - 3, '#ffd34d', { shadow: '#000000' });
    }
    // floating numbers
    if (S.pops) for (let i = S.pops.length - 1; i >= 0; i--) {
      const p = S.pops[i]; p.t -= 1 / 60; p.y -= 0.4;
      if (p.t <= 0) { S.pops.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.t * 3); F.draw(ctx, p.s, p.x, p.y, '#ffd34d', { center: true, shadow: '#1a1030' }); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // the flash when hit
    if (S.flash > 0) { ctx.globalAlpha = S.flash * 0.3; X.rect(ctx, 0, 0, VW, VH, S.flashCol); ctx.globalAlpha = 1; }
    if (S.heat > 0) { S.heat = Math.max(0, S.heat - 0.03); ctx.globalAlpha = S.heat * 0.18; X.rect(ctx, 0, 0, VW, VH, '#ff8a2a'); ctx.globalAlpha = 1; }
    // alert: the screen goes red at the edges
    if (S.phase === 'alert' && Math.sin(t * 10) > 0) { ctx.globalAlpha = 0.18; X.rect(ctx, 0, 0, VW, VH, '#ff2a3a'); ctx.globalAlpha = 1; }
    // letterbox bars
    const bh = Math.round(S.bars * 26);
    if (bh > 0) { X.rect(ctx, 0, 0, VW, bh, '#000000'); X.rect(ctx, 0, VH - bh, VW, bh, '#000000'); }
    hud(ctx, g, t);
  }

  function drawWorlds(ctx, g, t) {
    // the moon you left, falling behind at the start
    const from = S.dir === 'out' ? S.moon : S.planet, to = S.dir === 'out' ? S.planet : S.moon;
    const lt = S.phase === 'launch' ? S.t : 2.4 + S.rt;
    if (lt < 7) {
      const k = Math.min(1, lt / 6);
      const size = 420 * (1 - k * 0.6), y = VH + 110 + k * k * 320;
      PT.glow(ctx, PX - k * 200, y, size * 0.62, S.dir === 'out' ? MOON_TINT : S.body.tint, 0.25);
      ctx.drawImage(from, PX - size / 2 - k * 200, y - size / 2, size, size);
    }
    // where you are going, growing on the right, then swinging in to meet you
    const ap = S.phase === 'approach' ? S.t / 2.6 : S.phase === 'land' ? 1 : 0;
    const q = S.dist;
    const size = Math.min(380, 40 + q * q * 110 + ap * 230), x = U.lerp(VW - 50, 330, U.smoothstep(0, 1, ap)), y = U.lerp(70, 140, U.smoothstep(0, 1, ap));
    PT.glow(ctx, x, y, size * 0.8, S.dir === 'out' ? S.body.tint : MOON_TINT, 0.18 + ap * 0.1);
    ctx.drawImage(to, x - size / 2, y - size / 2, size, size);
    S.dest = [x, y, size];
  }

  function drawCoin(ctx, x, y, t) {
    const w = Math.max(1, Math.round(Math.abs(Math.cos(t * 5)) * 7));
    X.blob(ctx, x, y, w / 2 + 0.5, 4, '#b8801a');
    X.blob(ctx, x - 0.5, y - 0.5, w / 2, 3.5, '#ffc83a');
    if (w > 3) X.rect(ctx, x - 1, y - 2, 1, 3, '#fff0a0');
    if (Math.sin(t * 3) > 0.95) { X.rect(ctx, x + 2, y - 5, 1, 3, '#ffffff'); X.rect(ctx, x + 1, y - 4, 3, 1, '#ffffff'); }
  }

  function spr(ctx, cv, x, y, a, sc) {
    const w = cv.width / HD * (sc || 1), h = cv.height / HD * (sc || 1);
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (a) ctx.rotate(a);
    ctx.drawImage(cv, -w / 2, -h / 2, w, h); ctx.restore();
  }
  function drawObs(ctx, o, t) {
    const y = o.y !== undefined ? o.y : LANES[o.lane];
    const hitFlash = o.hitT > 0 && Math.sin(t * 60) > 0;
    if (o.kind === 'rock') spr(ctx, art('rock', o.v), o.x, y, t * o.spin, 1);
    else if (o.kind === 'wall') { spr(ctx, art('wall'), o.x, y); }
    else if (o.kind === 'ice') { for (let k = 0; k < 4; k++) { ctx.globalAlpha = 0.4 - k * 0.08; X.rect(ctx, o.x + 16 + k * 8, y - 2 + Math.sin(t * 5 + k) * 3, 6, 2, '#c8f0ff'); } ctx.globalAlpha = 1; spr(ctx, art('ice'), o.x, y); }
    else if (o.kind === 'mine') { spr(ctx, art('mine'), o.x, y, t * 1.5); const on = Math.sin(t * 8) > 0; X.rect(ctx, o.x - 1, y - 1, 3, 3, on ? '#ff3a4a' : '#5a1a1a'); if (on) PT.glow(ctx, o.x, y, 10, '#ff3a4a', 0.5); }
    else if (o.kind === 'train') {
      spr(ctx, art('engine'), o.x + 4, y);
      PT.glow(ctx, o.x - 22, y + 6, 18, '#fff0a0', 0.4);
      for (let k = 0; k < o.n; k++) {
        const cx = o.x + 52 + k * 48;
        X.rect(ctx, cx - 26, y - 1, 6, 3, '#2a2e3c');
        spr(ctx, art('car', k), cx, y);
        F.draw(ctx, ['ABAY', 'CHUM', 'ZORB', 'BOX'][k % 4], cx, y - 3, '#ffffff', { center: true, shadow: '#1a1030' });
      }
    } else if (o.kind === 'flare') {
      // a lane of sun: columns of fire rolling along it
      const w = o.w;
      for (let k = 0; k < 10; k++) {
        const fx = o.x + (k / 10) * w, h = 18 + Math.sin(t * 9 + k * 1.7) * 6;
        ctx.globalAlpha = 0.5; X.blob(ctx, fx, y, 9, h, '#ff5a1a');
        ctx.globalAlpha = 0.8; X.blob(ctx, fx, y, 6, h * 0.7, '#ffa83a');
        ctx.globalAlpha = 1; X.blob(ctx, fx, y, 3, h * 0.4, '#fff0a0');
      }
      PT.glow(ctx, o.x + w / 2, y, w * 0.7, '#ff8a2a', 0.35);
    } else if (o.kind === 'gate') {
      const on = gateOn(o);
      X.rect(ctx, o.x - 4, y - 26, 8, 8, '#4a5064'); X.rect(ctx, o.x - 4, y + 18, 8, 8, '#4a5064');
      X.rect(ctx, o.x - 3, y - 25, 6, 2, '#ffd34d'); X.rect(ctx, o.x - 3, y + 23, 6, 2, '#ffd34d');
      if (on) { X.rect(ctx, o.x - 2, y - 18, 4, 36, '#ff3a4a'); X.rect(ctx, o.x - 1, y - 18, 2, 36, '#ffffff'); PT.glow(ctx, o.x, y, 16, '#ff3a4a', 0.5); }
      else { const warn = ((S.t + o.ph) % o.period) > o.period * 0.85; if (warn && Math.sin(t * 30) > 0) X.rect(ctx, o.x - 1, y - 18, 2, 36, '#ff9aa8'); }
    } else if (o.kind === 'whale') {
      spr(ctx, art('whale'), o.x + 20, (LANES[o.lanes[0]] + LANES[o.lanes[1]]) / 2 + Math.sin(t * 1.2) * 3);
    } else if (o.kind === 'power') {
      const b = Math.sin(t * 4) * 2;
      X.blob(ctx, o.x, y + b, 9, 9, o.what === 'fix' ? '#1f9a4a' : '#c8902a'); X.blob(ctx, o.x - 1, y - 1 + b, 7, 7, o.what === 'fix' ? '#5ad88a' : '#ffd34d');
      F.draw(ctx, o.what === 'fix' ? '+' : 'X2', o.x, y - 3 + b, '#ffffff', { center: true, shadow: false });
      PT.glow(ctx, o.x, y, 14, '#ffffff', 0.25);
    }
    if (hitFlash && o.kind !== 'flare') { ctx.globalAlpha = 0.4; X.blob(ctx, o.x, y, o.r, o.r, '#ffffff'); ctx.globalAlpha = 1; }
    if (o.hp !== undefined && o.kind === 'wall' && o.hitT > 0) { const f = U.clamp(o.hp / 1.4, 0, 1); X.rect(ctx, o.x - 12, y - 30, 24, 2, '#2a1a1a'); X.rect(ctx, o.x - 12, y - 30, Math.round(24 * f), 2, '#ff5a4d'); }
  }

  function drawFoe(ctx, e, t) {
    const cv = art(e.kind, Math.floor(e.f) % 2);
    const a = e.st === 'dive' ? Math.sin(e.dt * 4) * 0.4 : e.st === 'enter' ? Math.sin(e.t * 6) * 0.3 : 0;
    const sc = e.kind === 'boss' ? 1 : 0.8;
    spr(ctx, cv, e.x, e.y, a, sc);
    if (e.hitT > 0) { ctx.globalAlpha = 0.6; X.blob(ctx, e.x, e.y, 10 * sc, 8 * sc, '#ffffff'); ctx.globalAlpha = 1; }
    if (e.kind === 'boss' && e.hp < e.max) { X.rect(ctx, e.x - 10, e.y - 18, 20, 2, '#2a1a1a'); X.rect(ctx, e.x - 10, e.y - 18, Math.round(20 * e.hp / e.max), 2, '#8affa0'); }
  }

  /* The saucer, with every upgrade you bought bolted on to it. */
  function drawPod(ctx, g, t) {
    const skin = PD.art.skinFor(g.save.cos).pod;
    const blink = S.invuln > 0 && Math.sin(t * 40) > 0;
    const sq = 1 + S.squash * 0.18;
    let y = S.py + Math.sin(t * 3) * 1.5, x = S.phase === 'launch' ? PX - 40 + Math.min(1, S.t / 2) * 40 : PX, sc = 1;
    if (S.phase === 'land' && S.dest) {
      const q = U.smoothstep(0, 2.2, S.t);
      x = U.lerp(PX, S.dest[0] - S.dest[2] * 0.1, q); y = U.lerp(S.py, S.dest[1] - S.dest[2] * 0.05, q) + Math.sin(q * Math.PI) * -20;
      sc = 1 - q * 0.8;
    }
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(S.tilt);
    ctx.scale(sc / sq, sc * sq);
    // the flame out the back
    const fl = S.turbo > 0 ? 18 : 8;
    const fk = fl + Math.random() * 4;
    X.poly(ctx, [[-14, -3], [-14, 3], [-14 - fk, 0]], S.turbo > 0 ? '#7ef9ff' : '#ff8a3d');
    X.poly(ctx, [[-14, -1.5], [-14, 1.5], [-14 - fk * 0.6, 0]], '#fff0c0');
    if (!blink) {
      const k = 0.62;
      const fr = skin.frames[Math.floor(t * 8) % skin.frames.length];
      ctx.drawImage(fr, -skin.ox * k, -skin.oy * k, skin.w * k, skin.h * k);
    }
    // the upgrades, where you can see them
    if (S.lv.laser) { X.rect(ctx, 8, 2, 10, 3, '#6a7088'); X.rect(ctx, 16, 2, 3, 3, '#ff3a4a'); if (S.lv.laser >= 2) { X.rect(ctx, 8, -6, 9, 2, '#6a7088'); X.rect(ctx, 15, -6, 2, 2, '#ff3a4a'); } }
    if (S.lv.ice) { X.poly(ctx, [[14, -6], [22, -2], [22, 8], [14, 10]], '#8ad8ff'); X.poly(ctx, [[15, -4], [20, -1], [20, 6], [15, 8]], '#c8f0ff'); }
    if (S.lv.armour) for (let i = 0; i < Math.min(3, S.lv.armour); i++) X.rect(ctx, -10 + i * 7, 6, 6, 3, '#8a90a8');
    if (S.lv.heat) { X.poly(ctx, [[10, -9], [16, -4], [16, 4], [10, 9]], '#d8581a'); X.rect(ctx, 14, -3, 2, 6, '#ffb03a'); if (S.heat > 0) { ctx.globalAlpha = S.heat * 0.5; X.blob(ctx, 4, 0, 20, 13, '#ff8a2a'); ctx.globalAlpha = 1; } }
    if (S.lv.magnet) { X.rect(ctx, -2, -14, 2, 4, '#e5394a'); X.rect(ctx, 2, -14, 2, 4, '#e5394a'); X.rect(ctx, -2, -15, 6, 1, '#d8dce8'); }
    if (S.lv.radar) { X.rect(ctx, -6, -13, 1, 4, '#8a90a8'); X.blob(ctx, -5.5, -14, 2, 1, Math.sin(t * 6) > 0 ? '#7dff9a' : '#2a5a3a'); }
    ctx.restore();
    if (S.bubble && S.phase !== 'land') {
      ctx.globalAlpha = 0.12 + Math.sin(t * 4) * 0.04; X.blob(ctx, x, y, 23, 17, '#7ef9ff');
      ctx.globalAlpha = 0.55;
      for (let a = 0; a < U.TAU; a += 0.08) X.rect(ctx, x + Math.cos(a) * 23, y + Math.sin(a) * 17, 1, 1, '#aef8ff');
      ctx.globalAlpha = 0.8; X.rect(ctx, x - 12, y - 13, 5, 2, '#ffffff'); ctx.globalAlpha = 1;
    }
  }

  function hud(ctx, g, t) {
    // the trip: moon to planet, with you on it
    const x0 = 120, x1 = 360, y = 8;
    if (S.phase !== 'launch' || S.t > 1) {
      X.rect(ctx, x0, y + 3, x1 - x0, 2, '#2a2448');
      X.rect(ctx, x0, y + 3, Math.round((x1 - x0) * S.dist), 2, '#7ef9ff');
      X.blob(ctx, x0 - 6, y + 4, 5, 5, S.dir === 'out' ? MOON_TINT : S.body.tint);
      X.blob(ctx, x1 + 6, y + 4, 5, 5, S.dir === 'out' ? S.body.tint : MOON_TINT);
      if (S.dir === 'out' && hostile(S.index)) { const fx = x0 + (x1 - x0) * 0.45; X.rect(ctx, fx - 1, y, 3, 8, S.fought ? '#5a4a6a' : '#ff5a4d'); }
      const px = x0 + (x1 - x0) * S.dist;
      X.blob(ctx, px, y + 4, 4, 3, '#ffd34d'); X.rect(ctx, px - 1, y + 1, 2, 2, '#c8f0ff');
    }
    // hull pips
    for (let i = 0; i < S.hpMax; i++) {
      const hx = 10 + i * 11, hy = VH - 16;
      X.blob(ctx, hx + 4, hy + 4, 5, 3.5, i < S.hp ? '#ff5a6a' : '#3a2438');
      if (i < S.hp) X.rect(ctx, hx + 2, hy + 2, 2, 1, '#ffc0c8');
    }
    if (S.lv.bubble) { X.blob(ctx, 14 + S.hpMax * 11, VH - 12, 5, 5, S.bubble ? '#7ef9ff' : '#1a3a48'); if (!S.bubble) { const f = S.bubbleT / [12, 8, 5][S.lv.bubble - 1]; X.rect(ctx, 9 + S.hpMax * 11, VH - 5, Math.round(10 * f), 1, '#7ef9ff'); } }
    // coins
    F.draw(ctx, '$' + U.fmt(S.cash), VW - 10, VH - 14, '#ffd34d', { right: true, shadow: '#1a1030' });
    if (S.combo > 3) F.draw(ctx, 'X' + S.combo, VW - 10, VH - 24, '#ffffff', { right: true, shadow: '#1a1030' });
    if (S.lv.turbo) {
      const ready = S.turboCd <= 0;
      X.rect(ctx, VW - 70, VH - 5, 60, 2, '#2a2448');
      X.rect(ctx, VW - 70, VH - 5, Math.round(60 * (ready ? 1 : 1 - S.turboCd / 9)), 2, ready ? '#7ef9ff' : '#3a6a88');
      if (ready && S.phase === 'run') F.draw(ctx, 'RIGHT: TURBO', VW - 72, VH - 14, '#7ef9ff', { right: true, shadow: '#1a1030' });
    }
    // the big words
    if (S.bannerT > 0 && S.banner) {
      const k = Math.min(1, (3.2 - S.bannerT) * 4) * Math.min(1, S.bannerT * 2);
      const w = Math.round(260 * k);
      ctx.globalAlpha = 0.8 * k; X.rect(ctx, 240 - w / 2, 96, w, 40, '#0a0614'); ctx.globalAlpha = 1;
      X.rect(ctx, 240 - w / 2, 96, w, 1, S.banner[2]); X.rect(ctx, 240 - w / 2, 135, w, 1, S.banner[2]);
      if (k > 0.6) {
        F.draw(ctx, S.banner[0], 240, 101, S.banner[2], { center: true, shadow: false });
        F.draw(ctx, S.banner[1], 240, 113, '#ffffff', { center: true, scale: 2, shadow: '#1a1030' });
      }
    }
    if (S.saidT > 0 && S.said) {
      ctx.globalAlpha = Math.min(1, S.saidT * 2);
      F.draw(ctx, S.said, 240, VH - 36, '#ffe9a8', { center: true, shadow: '#1a1030' });
      ctx.globalAlpha = 1;
    }
    if (S.phase === 'run' && S.t < 5 && S.dir === 'out') F.draw(ctx, 'UP / DOWN  (OR TAP ABOVE / BELOW)', 240, VH - 24, '#8a84b0', { center: true, shadow: '#1a1030' });
    if (S.phase === 'fight' && S.fight && S.fight.t < 4) F.draw(ctx, 'HOLD UP / DOWN TO DODGE. YOUR GUN FIRES BY ITSELF.', 240, VH - 24, '#ff9ad8', { center: true, shadow: '#1a1030' });
  }

  function touchMode() { return S.phase === 'run' || S.phase === 'fight' || S.phase === 'alert' ? 'travel' : 'ui'; }

  PD.travel = { enter, enterReturn, update, draw, touchMode, S, track, need, NEEDS, LANES };
})(window.PD);
