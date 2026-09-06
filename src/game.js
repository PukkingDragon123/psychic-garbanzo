/* Planet Destroyer -- main game module. Owns the loop, the camera, the ship,
   progression and the world-cracking finale. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const D = PD.data;
  const FX = PD.fx;
  const A = PD.audio;
  const F = PD.font;
  const UI = PD.ui;
  const TILE = PD.world.TILE;

  const VW = UI.VW, VH = UI.VH;
  const SAVE_KEY = 'planet-destroyer-save-v1';

  const g = {
    state: 'title',
    time: 0,
    save: null,
    world: null,
    player: null,
    mobs: [], bullets: [], pickups: [], boulders: [],
    cam: { x: 0, y: 0 },
    bodyIndex: 0,
    ship: { x: 0, y: 0, w: 66, h: 38 },
    toasts: [],
    hint: '', hintT: 0, hintKey: '',
    shopTab: 0, shopTip: '',
    cinematic: false,
    destruction: null,
    victory: null,
    sellReport: null,
    droneAcc: 0,
    fps: 60,
    crates: [],
    combo: { n: 0, t: 0, mult: 1 },
    pings: [],                 // scanner hits for the minimap
    banner: null,              // stratum name card
    lastStratum: -2,
    ambT: 0
  };
  PD.game = g;

  /* ------------------------------------------------------------------- saves */
  function blankSave() {
    const upg = {};
    for (const u of D.UPGRADES) upg[u.id] = 0;
    return {
      credits: 0, upg, unlocked: 0, destroyed: [], dominion: 0, bonus: 0,
      totalMined: 0, totalEarned: 0, bodyIndex: 0, seen: {},
      vault: {},                                  // ore waiting on the moon
      cos: { suit: 'rose', skin: 'green', glass: 'sky', drill: 'steel', trim: 'stock' },
      build: startBuildings(),                    // building id -> level
      parts: {},                                  // fabricated parts in store
      installed: {},                              // parts fitted to the pod
      neur: {},                                   // neurons the Mind has grown
      artifacts: 0,                               // relics hauled home
      seenIntro: 1
    };
  }

  function startBuildings() {
    const b = {};
    for (const bd of D.BUILDINGS) b[bd.id] = bd.start || 0;
    return b;
  }

  function loadGame() {
    let s = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) s = JSON.parse(raw);
    } catch (e) { s = null; }
    const base = blankSave();
    if (s && typeof s === 'object') {
      base.credits = +s.credits || 0;
      base.unlocked = U.clamp(+s.unlocked || 0, 0, D.BODIES.length - 1);
      base.destroyed = Array.isArray(s.destroyed) ? s.destroyed : [];
      base.dominion = +s.dominion || 0;
      base.bonus = +s.bonus || 0;
      base.totalMined = +s.totalMined || 0;
      base.totalEarned = +s.totalEarned || 0;
      base.bodyIndex = U.clamp(+s.bodyIndex || 0, 0, D.BODIES.length - 1);
      base.seen = s.seen || {};
      base.seenIntro = s.seenIntro ? 1 : 0;
      if (s.vault) for (const k in s.vault) { const n = +s.vault[k]; if (n > 0 && D.MAT[k]) base.vault[k] = n; }
      if (s.owned) base.owned = s.owned;
      if (s.cos) for (const k in base.cos) if (s.cos[k]) base.cos[k] = s.cos[k];
      if (s.build) for (const b of D.BUILDINGS) if (s.build[b.id] !== undefined) base.build[b.id] = U.clamp(+s.build[b.id] || 0, 0, b.max);
      if (s.parts) for (const k in s.parts) if (D.RECIPE[k] && +s.parts[k] > 0) base.parts[k] = +s.parts[k];
      if (s.installed) for (const k in s.installed) if (D.RECIPE[k] && +s.installed[k] > 0) base.installed[k] = +s.installed[k];
      if (s.neur) for (const k in s.neur) if (D.UPG[k]) base.neur[k] = U.clamp(+s.neur[k] || 0, 0, D.UPG[k].max);
      base.artifacts = +s.artifacts || 0;
    }
    g.save = base;
    recompute();
  }

  /* Every stat is what the Mind has grown plus what is bolted to the pod. */
  function recompute() {
    const sv = g.save;
    for (const u of D.UPGRADES) sv.upg[u.id] = U.clamp(sv.neur[u.id] || 0, 0, u.max);
    for (const id in sv.installed) {
      const r = D.RECIPE[id];
      if (!r) continue;
      for (const k in r.gives) if (D.UPG[k]) sv.upg[k] = U.clamp(sv.upg[k] + r.gives[k] * sv.installed[id], 0, D.UPG[k].max);
    }
    // the terminal's own level is the broker
    sv.upg.crew = U.clamp(Math.max(0, (sv.build.terminal || 0) - 1), 0, D.UPG.crew.max);
    if (g.player) { g.player.o2 = Math.min(g.player.o2, g.player.stat('oxygen')); }
  }
  g.recompute = recompute;
  const applyBuildings = recompute;

  function saveGame() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(Object.assign({}, g.save))); } catch (e) { /* private mode */ }
  }
  function wipeSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    g.save = blankSave();
    recompute();
    g.printing = null;
    startBody(0, true);
    dock(true);
  }
  g.saveGame = saveGame;
  g.wipeSave = wipeSave;

  g.valueMult = function () { return 1 + g.save.bonus / 100 + g.save.dominion * 0.004; };
  g.droneIncome = function () {
    const n = g.save.upg.drones || 0;
    if (!n) return 0;
    return n * 2.4 * D.UPG.droneyield.value(g.save.upg.droneyield || 0) * (1 + g.save.dominion / 100);
  };

  g.buildLevel = function (id) { return g.save.build[id] || 0; };
  g.zoneOpen = function (zi) { return zi < Math.max(1, g.buildLevel('obs')); };
  g.slots = function () { return g.buildLevel('docks') * 2; };
  g.installedCount = function () { let n = 0; for (const k in g.save.installed) n += g.save.installed[k]; return n; };

  /* The multi-tool: pay for the blueprint, and the printer takes it from there. */
  g.startBuild = function (id) {
    const b = D.BUILD[id];
    if (!b || g.buildLevel(id) > 0 || g.printing) return false;
    const cost = D.buildCost(b, 0);
    if (g.save.credits < cost) { A.sfx.deny(); return false; }
    g.save.credits -= cost;
    g.printing = { id, t: 0, dur: 3.2 };
    A.sfx.tone(200, { type: 'sawtooth', to: 600, dur: 0.5, vol: 0.08 });
    saveGame();
    return true;
  };
  g.finishBuild = function (id) {
    g.save.build[id] = Math.max(1, g.save.build[id] || 0);
    recompute();
    A.sfx.buy(); A.sfx.fanfare && A.sfx.fanfare();
    const b = D.BUILD[id];
    const hx = b.x, hy = PD.home.groundY(b.x) - 40;
    FX.ring(hx, hy, 6, 50, 0.8, '#58e8ff', 2);
    for (let i = 0; i < 30; i++) FX.spawn({ x: hx + U.rand(-30, 30), y: hy + U.rand(-20, 20), vx: U.rand(-50, 50), vy: U.rand(-90, -10), life: 0.9, size: 2, color: i % 2 ? '#58e8ff' : '#ffffff', grav: 80, drag: 1, glow: 1 });
    FX.text(hx, hy - 20, b.name + ' ONLINE', '#58e8ff', 2);
    saveGame();
  };
  g.upgradeBuilding = function (id) {
    const b = D.BUILD[id];
    const lvl = g.buildLevel(id);
    if (!b || lvl <= 0 || lvl >= b.max) { A.sfx.deny(); return false; }
    const cost = D.buildCost(b, lvl);
    if (g.save.credits < cost) { A.sfx.deny(); return false; }
    g.save.credits -= cost;
    g.save.build[id] = lvl + 1;
    recompute();
    A.sfx.buy();
    A.sfx.tone(320, { type: 'square', to: 880, dur: 0.24, vol: 0.1 });
    const hx = b.x, hy = PD.home.groundY(b.x) - 30;
    FX.ring(hx, hy, 6, 34, 0.7, '#ffd34d', 2);
    for (let i = 0; i < 22; i++) FX.spawn({ x: hx + U.rand(-16, 16), y: hy + U.rand(-10, 10), vx: U.rand(-40, 40), vy: U.rand(-70, -10), life: 0.8, size: 2, color: i % 2 ? '#ffd34d' : '#8affa0', grav: 90, drag: 1, glow: 1 });
    FX.text(hx, hy - 14, b.name + ' LV' + (lvl + 1), '#ffd34d', 2);
    saveGame();
    return true;
  };

  /* Fabricator: ore in, a part out. */
  g.craft = function (rid) {
    const r = D.RECIPE[rid];
    if (!r || r.tier > g.buildLevel('fab')) { A.sfx.deny(); return false; }
    for (const k in r.mats) if ((g.save.vault[D.M[k]] || 0) < r.mats[k]) { A.sfx.deny(); return false; }
    for (const k in r.mats) { g.save.vault[D.M[k]] -= r.mats[k]; if (g.save.vault[D.M[k]] <= 0) delete g.save.vault[D.M[k]]; }
    g.save.parts[rid] = (g.save.parts[rid] || 0) + 1;
    A.sfx.buy();
    A.sfx.tone(140, { type: 'sawtooth', to: 70, dur: 0.3, vol: 0.1 });
    const b = D.BUILD.fab;
    FX.text(b.x, PD.home.groundY(b.x) - 60, r.name + ' MADE', '#ffb03d', 2);
    saveGame();
    return true;
  };
  /* Docks: fit a part to the pod. */
  g.install = function (rid) {
    if ((g.save.parts[rid] || 0) <= 0 || g.installedCount() >= g.slots()) { A.sfx.deny(); return false; }
    g.save.parts[rid]--;
    if (g.save.parts[rid] <= 0) delete g.save.parts[rid];
    g.save.installed[rid] = (g.save.installed[rid] || 0) + 1;
    recompute();
    if (g.player) { g.player.o2 = g.player.stat('oxygen'); g.player.hull = g.player.stat('hull'); }
    A.sfx.buy();
    const b = D.BUILD.docks;
    FX.text(b.x, PD.home.groundY(b.x) - 60, D.RECIPE[rid].name + ' FITTED', '#58e8ff', 2);
    saveGame();
    return true;
  };

  /* No toasts, no objective bar, no hint strip: anything the game wants to say
     is said in the world -- a floating number, a sign on a building, a light
     that changes colour. These stay as no-ops so callers read cleanly. */
  function toast() {}
  function hint() {}
  g.hint = hint;
  g.objective = function () { return null; };

  /* -------------------------------------------------------------- world setup */
  function startBody(index, freshPlayer) {
    g.bodyIndex = index;
    g.save.bodyIndex = index;
    const body = D.BODIES[index];
    g.world = new PD.world.World(body, index);
    g.mobs.length = 0; g.bullets.length = 0; g.pickups.length = 0; g.boulders.length = 0; g.crates.length = 0;
    g.pings.length = 0; g.banner = null; g.lastStratum = -2;
    g.combo = { n: 0, t: 0, mult: 1 };
    FX.reset();
    g.destruction = null;
    g.victory = null;
    g.cinematic = false;

    g.ship.x = g.world.cx * TILE;
    g.ship.y = Math.max(30, g.world.bodyTopPx - 70);

    if (!g.player || freshPlayer) g.player = new PD.Player(g);
    g.player.clearCargo();
    g.player.reset(g.ship.x, g.ship.y + 34);
    g.player.docked = false;

    spawnMobs();
    g.cam.x = g.player.x - VW / 2;
    g.cam.y = g.player.y - VH / 2;
    if (!g.save.seen[index]) {
      g.save.seen[index] = 1;
      toast(['planet'], UI.COL.gold);
    }
    hint('dive', ['hand', 'arrowD', 'drill']);
  }

  function spawnMobs() {
    const w = g.world;
    const body = w.body;
    const cap = Math.min(90, 14 + g.bodyIndex * 7);
    const scale = 1 + g.bodyIndex * 0.14;
    let tries = 0;
    while (g.mobs.length < cap && tries < 9000) {
      tries++;
      const cx = U.randInt(2, w.w - 3), cy = U.randInt(PD.world.SKY, w.h - 3);
      const i = w.idx(cx, cy);
      if (w.at(cx, cy) || !w.inside[i]) continue;
      if (U.dist(cx * TILE, cy * TILE, w.coreCenter.x, w.coreCenter.y) < w.chamberR + TILE) continue;
      if (!U.chance(body.enemyRate * 0.5)) continue;
      const L0 = w.strata[w.stratum[i]];
      const depth = w.stratum[i] / Math.max(1, w.strata.length - 1);
      let type = U.weighted(body.mobs);
      const x = cx * TILE + TILE / 2, y = cy * TILE + TILE / 2;
      // biome flavour: wyrms haunt the hot bands, shellbacks the deep ones, mites the caves
      if (L0.lava && U.chance(0.35)) type = 'wyrm';
      else if (depth > 0.5 && U.chance(0.2)) type = 'shellback';
      else if (U.chance(0.22)) {
        for (let k = 0; k < 4 + (g.bodyIndex >> 1); k++) g.mobs.push(new PD.ent.Mob('mite', x + U.rand(-10, 10), y + U.rand(-10, 10), scale));
        continue;
      }
      g.mobs.push(new PD.ent.Mob(type, x, y, scale));
    }
    // points of interest get guards and loot
    for (const poi of w.pois) {
      if (poi.kind !== 'ruin') continue;
      const fx = (poi.x0 + 1) * TILE + 5, fy = (poi.y0 + poi.h - 1) * TILE + 4;
      const loot = [];
      const gems = w.strata.flatMap(L0 => L0.ores).map(o => D.M[o[0]]).filter(m => D.MAT[m].shine);
      for (let k = 0; k < 4 + g.bodyIndex; k++) loot.push(U.pick(gems.length ? gems : [D.M.gold]));
      g.crates.push(new PD.ent.Crate(fx + 8, fy, loot));
      if (poi.w > 9) g.crates.push(new PD.ent.Crate((poi.x0 + poi.w - 2) * TILE + 5, fy, loot.slice(0, 3)));
      g.mobs.push(new PD.ent.Mob(g.bodyIndex >= 4 ? 'lurker' : 'gnasher', (poi.x0 + (poi.w >> 1)) * TILE, (poi.y0 + 1) * TILE + 6, scale * 1.2));
    }
    if (g.bodyIndex >= 1) {
      const c = w.coreCenter;
      g.mobs.push(new PD.ent.Mob('guardian', c.x + w.chamberR * 0.5, c.y - w.chamberR * 0.3, 0.5 + g.bodyIndex * 0.32));
    }
  }

  g.travelTo = function (index) {
    if (index > g.save.unlocked) return;
    startBody(index, false);
    g.dive(index);
    toast(['hole', 'arrowR', 'planet'], UI.COL.o2);
  };

  /* --------------------------------------------------------------- economy */
  g.buy = function (id) {
    const u = D.UPG[id];
    const lvl = g.save.upg[id] || 0;
    if (lvl >= u.max) return;
    const cost = D.upgradeCost(u, lvl);
    if (g.save.credits < cost) { A.sfx.deny(); return; }
    g.save.credits -= cost;
    g.save.upg[id] = lvl + 1;
    A.sfx.buy();
    FX.flash(0.16, '#ffd34d');
    if (id === 'oxygen') g.player.o2 = g.player.stat('oxygen');
    if (id === 'hull') g.player.hull = g.player.stat('hull');
    toast(u.name.toUpperCase() + ' LV' + (lvl + 1), UI.COL.good);
    saveGame();
  };

  /* --------------------------------------------------------------- the vault
     Docking no longer auto-sells: ore lands in the ship's bin, and you choose
     between cashing it out at the market or burning it in the fabricator. */
  function stow() {
    const p = g.player;
    let n = 0;
    for (const k in p.cargo) {
      g.save.vault[k] = (g.save.vault[k] || 0) + p.cargo[k];
      n += p.cargo[k];
    }
    p.clearCargo();
    return n;
  }

    /* The market moves. Every material carries a demand multiplier that drifts,
     so a load you sat on can be worth a fifth more -- or less. */
  g.demand = {};
  g.demandTrend = {};
  function demandTick(dt) {
    for (const m of D.MAT) {
      if (!m.id) continue;
      if (g.demand[m.id] === undefined) {
        g.demand[m.id] = 0.9 + U.hash2(m.id * 13, 7) * 0.34;
        g.demandTrend[m.id] = (U.hash2(m.id, 21) - 0.5) * 0.05;
      }
      let v = g.demand[m.id] + g.demandTrend[m.id] * dt;
      if (v > 1.28) { v = 1.28; g.demandTrend[m.id] = -Math.abs(g.demandTrend[m.id]); }
      if (v < 0.78) { v = 0.78; g.demandTrend[m.id] = Math.abs(g.demandTrend[m.id]); }
      if (U.chance(dt * 0.08)) g.demandTrend[m.id] = (U.hash2(m.id + (g.time * 100 | 0), 3) - 0.5) * 0.06;
      g.demand[m.id] = v;
    }
  }
  g.demandFor = function (mat) { return g.demand[mat] === undefined ? 1 : g.demand[mat]; };
  g.saleMult = function () {
    return g.valueMult() * D.UPG.crew.value(g.save.upg.crew || 0) * D.UPG.refine.value(g.save.upg.refine || 0) * D.UPG.greed.value(g.save.upg.greed || 0);
  };
  g.priceOf = function (mat) { return Math.max(1, Math.round(D.MAT[mat].cr * g.saleMult() * g.demandFor(mat))); };
  g.vaultCount = function (mat) { return g.save.vault[mat] || 0; };
  g.vaultTotal = function () {
    let n = 0;
    for (const k in g.save.vault) n += g.save.vault[k];
    return n;
  };
  g.vaultValue = function () {
    let v = 0;
    for (const k in g.save.vault) v += g.priceOf(+k) * g.save.vault[k];
    return v;
  };

  /* The trade mast: everything you hauled home goes at once. */
  g.sellAll = function () {
    const total = g.vaultValue();
    if (!total) { A.sfx.deny(); return; }
    let lots = 0;
    for (const k in g.save.vault) lots += g.save.vault[k];
    g.save.vault = {};
    g.save.credits += total;
    g.save.totalEarned += total;
    A.sfx.sell();
    for (let i = 0; i < 8; i++) setTimeout(() => A.sfx.coin(i), i * 55);
    const bx = D.BUILD.terminal.x, by = PD.home.groundY(D.BUILD.terminal.x) - 60;
    FX.ring(bx, by, 8, 40, 0.8, '#ffd34d', 2);
    for (let i = 0; i < Math.min(60, 12 + lots * 2); i++) {
      FX.spawn({ x: bx + U.rand(-14, 14), y: by + U.rand(-8, 8), vx: U.rand(-60, 60), vy: U.rand(-110, -30),
        life: 1.1, size: 2, color: i % 3 ? '#ffd34d' : '#fff3c0', grav: 150, drag: 1, glow: 1 });
    }
    FX.text(bx, by - 16, '+$' + U.fmt(total), '#ffd34d', 2);
    saveGame();
  };

  g.scan = function (x, y, r) {
    const w = g.world;
    const c0 = Math.max(0, Math.floor((x - r) / TILE)), c1 = Math.min(w.w - 1, Math.ceil((x + r) / TILE));
    const r0 = Math.max(0, Math.floor((y - r) / TILE)), r1 = Math.min(w.h - 1, Math.ceil((y + r) / TILE));
    let found = 0;
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const m = w.cells[cy * w.w + cx];
      if (!m || D.MAT[m].cr < 60) continue;
      if (U.dist2(cx * TILE + 5, cy * TILE + 5, x, y) > r * r) continue;
      g.pings.push({ cx, cy, mat: m, life: 9 });
      found++;
    }
    FX.ring(x, y, 4, r, 0.8, '#8affa0', 2);
    FX.ring(x, y, 4, r * 0.6, 0.6, '#8affa0', 1);
    A.sfx.tone(600, { type: 'sine', to: 1400, dur: 0.5, vol: 0.12 });
    A.sfx.tone(1400, { type: 'sine', to: 700, dur: 0.4, vol: 0.06, delay: 0.3 });
    toast(['scan', 'arrowR', 'ore'], found ? '#8affa0' : UI.COL.dim, String(found));
  };

  /* Tiny rendered thumbnails of each world for the nav computer. */
  const navIcons = {};
  g.navIcon = function (i) {
    if (!navIcons[i]) navIcons[i] = PD.arthome.buildMoon(22, D.BODIES[i].tint, 1000 + i * 977);
    return navIcons[i];
  };



  g.collect = function (mat, x, y) {
    if (mat === D.M.relic || mat === D.M.fossil || mat === D.M.aether) { g.save.artifacts = (g.save.artifacts || 0) + 1; FX.text(x, y - 12, 'ARTIFACT', '#ffd34d', 2); }
    const p = g.player;
    if (!p.addOre(mat)) {
      hint('full', ['cargo', 'bang', 'arrowR', 'hole']);
      return false;
    }
    const m = D.MAT[mat];
    const val = Math.round(m.cr * g.valueMult());
    if (m.cr >= 60) FX.text(x, y - 6, '+$' + U.fmt(val), m.c[0], 0);
    FX.burst(x, y, m.shine ? 7 : 3, [m.c[0], '#ffffff'], 60, !!m.shine);
    A.sfx.ore(m.cr);
    return true;
  };

  g.onTileBroken = function (cx, cy, mat, byDrill) {
    const w = g.world;
    const x = cx * TILE + TILE / 2, y = cy * TILE + TILE / 2;
    if (mat < 0) {
      // magma quenched into basalt
      FX.burst(x, y, 10, ['#ff7a2a', '#ffd27a', '#5a4a4a'], 80, true);
      FX.smoke(x, y - 4, 5, '#6a5a5a');
      A.sfx.noise({ from: 3000, to: 300, dur: 0.3, vol: 0.18 });
      return;
    }
    const m = D.MAT[mat];

    if (mat === D.M.core) { beginDestruction(); return; }
    if (m.cr >= 300) PD.touch.buzz(12);

    g.save.totalMined++;
    g.chain = g.chain || { n: 0, t: 0 };
    g.chain.n++; g.chain.t = 1.3;
    FX.dust(x, y, m.shine ? 9 : 6, m.c[2], 55);
    FX.burst(x, y, 3 + Math.min(6, g.chain.n >> 2), m.c, 70 + Math.min(60, g.chain.n * 4));
    A.sfx.break_(U.clamp(m.hp / 255, 0, 1));
    A.sfx.tone(440 + Math.min(20, g.chain.n) * 28, { type: 'triangle', dur: 0.05, vol: 0.05 });
    FX.shake(1.2 + Math.min(1.5, g.chain.n * 0.05));
    if (g.chain.n % 10 === 0) { FX.text(x, y - 14, 'x' + g.chain.n + ' CHAIN', '#ffd34d', 2); FX.hitStop(0.03); A.sfx.coin(g.chain.n / 10 | 0); }
    if (m.cr >= 300) { FX.hitStop(0.04); FX.ring(x, y, 4, 22, 0.4, m.c[0], 2); }

    if (g.pickups.length < 160) g.pickups.push(new PD.ent.Pickup(x, y, mat));
    else g.collect(mat, x, y);

    // cave-ins: loosened rock above comes down
    if (byDrill && g.boulders.length < 14) {
      for (let i = -1; i <= 1; i++) {
        const bx = cx + i, by = cy - 1;
        if (!w.unsupported(bx, by)) continue;
        if (!U.chance(0.22)) continue;
        const bmat = w.at(bx, by);
        const cv = w.grabChunk(bx, by, 1);
        w.clear(bx, by);
        g.boulders.push(new PD.ent.Boulder(bx * TILE + TILE / 2, by * TILE + TILE / 2, bmat, cv));
        A.sfx.tone(220, { type: 'triangle', to: 120, dur: 0.14, vol: 0.08 });
      }
    }
  };

  g.onMobKilled = function (m) {
    // chain kills for a bounty multiplier
    g.combo.n++;
    g.combo.t = 2.6;
    g.combo.mult = 1 + Math.min(4, Math.floor(g.combo.n / 3)) * 0.5;
    if (g.combo.n % 3 === 0) { FX.text(m.x, m.y - 22, 'x' + g.combo.mult.toFixed(1) + ' COMBO', '#ff8ad8', 1); A.sfx.tone(900 + g.combo.n * 40, { type: 'square', dur: 0.1, vol: 0.1 }); }
    if (m.type === 'mite') A.sfx.tone(2000, { type: 'square', to: 600, dur: 0.06, vol: 0.06 });
    PD.touch.buzz(m.def.kind === 'boss' ? 80 : 18);
    const bounty = Math.round(m.def.cr * (1 + g.bodyIndex * 0.25) * g.valueMult() * g.combo.mult);
    g.save.credits += bounty;
    g.save.totalEarned += bounty;
    FX.text(m.x, m.y - 8, '+$' + U.fmt(bounty), '#ffd34d', 1);
    FX.burst(m.x, m.y, m.def.kind === 'boss' ? 60 : 18, ['#ffffff', '#c8ff8a', '#8f6ad8', '#ffd34d'], m.def.kind === 'boss' ? 260 : 150);
    FX.ring(m.x, m.y, 4, m.def.kind === 'boss' ? 90 : 34, 0.5, '#ffffff', 2);
    FX.shake(m.def.kind === 'boss' ? 9 : 3.4);
    FX.hitStop(m.def.kind === 'boss' ? 0.12 : 0.04);
    A.sfx.killMob();
    if (m.def.kind === 'boss') { A.sfx.boom(1.2); toast(['skull', 'check'], UI.COL.good); }
    // guts of the beast are worth something
    const drops = m.def.kind === 'boss' ? 7 : (U.chance(0.45) ? 1 : 0);
    for (let i = 0; i < drops; i++) {
      const pool = g.world.body.ores;
      g.pickups.push(new PD.ent.Pickup(m.x, m.y, U.weighted(pool)));
    }
    if (m.type !== 'mite' && U.chance(m.def.kind === 'boss' ? 1 : 0.3)) g.pickups.push(new PD.ent.Pickup(m.x, m.y, D.M.bio));
  };

  g.onPlayerDown = function () {
    if (g.player.dead) return;
    g.player.dead = true;
    const p = g.player;
    // scatter a third of the hold into the dark
    let lose = p.cargoKg * 0.34;
    const keys = U.shuffle(Object.keys(p.cargo));
    for (const k of keys) {
      while (lose > 0 && p.cargo[k] > 0) {
        p.cargo[k]--; p.cargoKg -= D.MAT[k].kg; lose -= D.MAT[k].kg;
        if (p.cargo[k] <= 0) { delete p.cargo[k]; break; }
      }
    }
    p.cargoKg = Math.max(0, p.cargoKg);
    FX.flash(0.8, '#ff5a4d');
    FX.shake(12);
    FX.burst(p.x, p.y, 40, ['#ff5a4d', '#ffffff', '#ffd34d'], 200);
    A.sfx.boom(0.8);
    toast(['hull', 'cross', 'arrowR', 'home'], UI.COL.bad);
    toast(['cargo', 'arrowD'], UI.COL.bad, '-33%');
    setTimeout(() => {
      dock(true);
      g.player.dead = false;
      g.player.hull = g.player.stat('hull') * 0.6;
    }, 700);
  };

  g.emergencyRecall = function () {
    const p = g.player;
    let lose = p.cargoKg * 0.1;
    for (const k of U.shuffle(Object.keys(p.cargo))) {
      while (lose > 0 && p.cargo[k] > 0) {
        p.cargo[k]--; p.cargoKg -= D.MAT[k].kg; lose -= D.MAT[k].kg;
        if (p.cargo[k] <= 0) { delete p.cargo[k]; break; }
      }
    }
    A.sfx.warp();
    FX.flash(0.6, '#7ef9ff');
    FX.ring(p.x, p.y, 2, 70, 0.6, '#7ef9ff', 3);
    toast(['hole', 'cargo', 'arrowD'], UI.COL.o2, '-10%');
    dock(true);
  };

  /* -------------------------------------------------------------- docking */
  function dock(teleport) {
    const p = g.player;
    if (teleport && g.ship) { p.x = g.ship.x; p.y = g.ship.y + 34; p.vx = p.vy = 0; }
    p.docked = true;
    p.o2 = p.stat('oxygen');
    p.hull = p.stat('hull');
    p.invuln = 1;
    const n = stow();
    g.state = 'home';
    PD.home.enter(g, D.BUILD.docks.x + 30);
    A.sfx.dock();
    A.drill(false); A.thrust(0);
    if (n > 0) {
      // the haul lands on the pad as a little shower of ore
      const bx = D.BUILD.docks.x, by = PD.home.groundY(D.BUILD.docks.x) - 40;
      for (let i = 0; i < Math.min(40, n * 2); i++) {
        FX.spawn({ x: bx + U.rand(-12, 12), y: by, vx: U.rand(-40, 40), vy: U.rand(-90, -20),
          life: 0.9, size: 2, color: i % 2 ? '#ffb03d' : '#c9bce8', grav: 160, drag: 1 });
      }
      FX.text(bx, by - 12, '+' + n + ' ORE', '#ffb03d', 2);
    }
    saveGame();
  }

  /* The launch pad opens the chart: pick a sector, pick a world, drop. */
  g.undock = function () {
    g.player.docked = false;
    g.openChart();
  };

  g.openChart = function () {
    g.state = 'starmap';
    g.hintT = 0; g.hintKey = '';
    PD.starmap.enter(g);
    A.sfx.tone(520, { type: 'triangle', dur: 0.2, vol: 0.12 });
    A.sfx.tone(300, { type: 'square', to: 700, dur: 0.25, vol: 0.08 });
    saveGame();
  };

  g.dock = dock;

  /* Nav computer: drop on to the chosen world for a dive. */
  g.dive = function (index) {
    if (index > g.save.unlocked) return;
    if (index !== g.bodyIndex || !g.world) startBody(index, false);
    else { g.player.reset(g.ship.x, g.ship.y + 34); g.player.clearCargo(); }
    g.state = 'play';
    g.player.docked = false;
    A.sfx.warp();
    FX.flash(0.8, '#a9d8ff');
    saveGame();
  };

  /* --------------------------------------------------- the money shot
     Core at zero: fissures spread, then the whole body comes apart. */
  function beginDestruction() {
    if (g.destruction) return;
    g.destruction = { phase: 'crack', t: 0, r: 0, crackSfx: 0, blastR: 0, chunkAcc: 0 };
    g.cinematic = true;
    g.player.invuln = 99;
    A.sfx.rumble();
    A.setIntensity(1);
    FX.flash(0.45, '#fff3c0');
    FX.hitStop(0.16);
    toast(['star', 'bang'], UI.COL.core);
  }

  function updateDestruction(dt) {
    const d = g.destruction;
    const w = g.world;
    const c = w.coreCenter;
    d.t += dt;

    if (d.phase === 'crack') {
      const dur = 1.7;
      d.r = U.lerp(0, w.radius * TILE * 1.05, U.smoothstep(0, dur, d.t));
      // paint heat outward from the core
      const rc = Math.ceil(d.r / TILE);
      const cx0 = Math.floor(w.cx), cy0 = Math.floor(w.cy);
      for (let i = 0; i < 90; i++) {
        const a = U.rand(0, U.TAU), rr = Math.sqrt(U.rand()) * rc;
        const tx = Math.round(cx0 + Math.cos(a) * rr), ty = Math.round(cy0 + Math.sin(a) * rr);
        if (!w.inBounds(tx, ty) || !w.at(tx, ty)) continue;
        w.heat[w.idx(tx, ty)] = Math.min(1, w.heat[w.idx(tx, ty)] + 0.5);
        w.heatDirty = true;
      }
      d.crackSfx -= dt;
      if (d.crackSfx <= 0) {
        d.crackSfx = 0.16;
        A.sfx.crack(U.rand(0, 3));
        const a = U.rand(0, U.TAU);
        FX.ring(c.x + Math.cos(a) * d.r * 0.7, c.y + Math.sin(a) * d.r * 0.7, 2, 26, 0.4, '#ffd9a0', 2);
      }
      FX.shake(3 + d.t * 5);
      pushPlayerAway(dt, 120);
      if (d.t >= dur) { d.phase = 'blast'; d.t = 0; startBlast(); }
    } else if (d.phase === 'blast') {
      const dur = 2.4;
      const target = w.radius * TILE * 1.18;
      const prev = d.blastR;
      d.blastR = target * (1 - Math.pow(1 - U.clamp(d.t / dur, 0, 1), 1.8));
      // eat an annulus of rock per frame and throw chunks out of it
      const removed = ringRemove(prev, d.blastR);
      d.chunkAcc += removed.length;
      pushPlayerAway(dt, 900);
      FX.shake(9);
      if (d.t >= dur) { d.phase = 'settle'; d.t = 0; }
    } else {
      pushPlayerAway(dt, 90);
      FX.shake(Math.max(0, 5 - d.t * 3));
      if (d.t > 1.6) finishDestruction();
    }
  }

  function startBlast() {
    const w = g.world, c = w.coreCenter;
    A.sfx.boom(1.6);
    A.sfx.rumble();
    FX.flash(0.62, '#ffe0b0');
    FX.hitStop(0.1);
    FX.ring(c.x, c.y, 6, w.radius * TILE * 1.3, 1.1, '#fff3c0', 4);
    FX.ring(c.x, c.y, 6, w.radius * TILE * 0.9, 0.8, '#ff8a3d', 3);
    FX.burst(c.x, c.y, 140, ['#fff3c0', '#ffd34d', '#ff8a3d', '#ff5a4d'], 420, true);
    for (const i of w.coreCells) { w.cells[i] = 0; }
  }

  function ringRemove(r0, r1) {
    const w = g.world, c = w.coreCenter;
    const out = [];
    const c0 = Math.max(0, Math.floor((c.x - r1) / TILE)), c1 = Math.min(w.w - 1, Math.ceil((c.x + r1) / TILE));
    const q0 = Math.max(0, Math.floor((c.y - r1) / TILE)), q1 = Math.min(w.h - 1, Math.ceil((c.y + r1) / TILE));
    let chunkBudget = 3;
    for (let cy = q0; cy <= q1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const m = w.at(cx, cy);
        if (!m) continue;
        const tx = cx * TILE + TILE / 2, ty = cy * TILE + TILE / 2;
        const dd = U.dist(c.x, c.y, tx, ty);
        if (dd < r0 || dd > r1) continue;
        // fling a few real rock chunks, vaporise the rest into particles
        if (chunkBudget > 0 && U.chance(0.045) && FX.counts.chunks < 70) {
          const cv = w.grabChunk(cx - 1, cy - 1, 3);
          if (cv) {
            chunkBudget--;
            const a = Math.atan2(ty - c.y, tx - c.x);
            const sp = U.rand(120, 320);
            FX.chunk(tx, ty, Math.cos(a) * sp, Math.sin(a) * sp - 60, cv, U.rand(2, 4));
          }
        }
        w.cells[w.idx(cx, cy)] = 0;
        w.heat[w.idx(cx, cy)] = 0;
        out.push(m);
        if (U.chance(0.16)) {
          const a = Math.atan2(ty - c.y, tx - c.x);
          const sp = U.rand(60, 260);
          FX.spawn({
            x: tx, y: ty, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: U.rand(0.4, 1.3), size: U.rand(1.5, 3.5),
            color: U.pick(D.MAT[m].c), grav: 0.25, drag: 0.95, glow: U.chance(0.25) ? 1 : 0
          });
        }
      }
    }
    return out;
  }

  function pushPlayerAway(dt, force) {
    const p = g.player, c = g.world.coreCenter;
    const a = Math.atan2(p.y - c.y, p.x - c.x);
    p.vx += Math.cos(a) * force * dt;
    p.vy += Math.sin(a) * force * dt;
  }

  function finishDestruction() {
    const i = g.bodyIndex;
    const b = D.BODIES[i];
    const first = !g.save.destroyed[i];
    const reward = Math.round(b.reward * (first ? 1 : 0.3) * g.valueMult());
    g.save.credits += reward;
    g.save.totalEarned += reward;

    let unlockedName = null;
    if (first) {
      g.save.destroyed[i] = 1;
      g.save.dominion = Math.min(100, g.save.dominion + b.dominion);
      g.save.bonus += 5;
      if (i === g.save.unlocked && i + 1 < D.BODIES.length) {
        g.save.unlocked = i + 1;
        unlockedName = D.BODIES[i + 1].name;
      }
    }
    g.victory = {
      t: 0, name: b.name, reward, dominion: first ? b.dominion : 0,
      bonus: first ? 5 : 0, unlocked: unlockedName
    };
    g.destruction = null;
    g.state = 'victory';
    A.sfx.fanfare();
    A.setIntensity(0.2);
    saveGame();
  }

  /* ------------------------------------------------------------------ update */
  function update(dt) {
    g.time += dt;
    A.schedule();

    for (let i = g.toasts.length - 1; i >= 0; i--) {
      g.toasts[i].life -= dt;
      if (g.toasts[i].life <= 0) g.toasts.splice(i, 1);
    }
    g.hintT -= dt;
    if (g.sellReport) { g.sellReport.life -= dt; if (g.sellReport.life <= 0) g.sellReport = null; }

    // idle drones keep paying while you fly
    const inc = g.droneIncome();
    if (inc > 0) {
      g.droneAcc += inc * dt;
      if (g.droneAcc >= 1) {
        const add = Math.floor(g.droneAcc);
        g.droneAcc -= add;
        g.save.credits += add;
        g.save.totalEarned += add;
      }
    }

    g.uiBlocking = g.state !== 'play';
    handleStateKeys();

    // Zaz keeps working in every state where time passes
    if (g.state !== 'title' && g.state !== 'pause') demandTick(dt);


    if (g.state === 'starmap') {
      PD.starmap.update(dt, g);
      FX.update(dt, null);
      return;
    }

    if (g.state === 'home') {
      PD.home.update(dt, g);
      FX.update(dt, null);
      return;
    }
    if (g.state === 'mind') {
      PD.mind.update(dt, g);
      return;
    }

    g.combo.t -= dt;
    if (g.chain && g.chain.t > 0) { g.chain.t -= dt; if (g.chain.t <= 0) g.chain.n = 0; }
    if (g.combo.t <= 0 && g.combo.n) { g.combo.n = 0; g.combo.mult = 1; }
    for (let i = g.pings.length - 1; i >= 0; i--) { g.pings[i].life -= dt; if (g.pings[i].life <= 0) g.pings.splice(i, 1); }
    if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }

    if (g.state === 'title' || g.state === 'ending') return;

    if (g.state === 'victory') {
      g.victory.t += dt;
      FX.update(dt, g.world);
      updateCamera(dt, true);
      return;
    }

    if (g.state === 'pause') return;

    if (g.destruction) updateDestruction(dt);

    const p = g.player;
    p.update(dt, g);

    if (g.state === 'play' && !g.cinematic && nearShip()) hint('dock', ['hand', 'arrowR', 'hole', 'home']);

    for (let i = g.mobs.length - 1; i >= 0; i--) {
      const m = g.mobs[i];
      if (m.dead) { g.mobs.splice(i, 1); continue; }
      if (Math.abs(m.x - p.x) < VW * 1.4 && Math.abs(m.y - p.y) < VH * 1.4) m.update(dt, g);
    }
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      const b = g.bullets[i];
      b.update(dt, g);
      if (b.dead) g.bullets.splice(i, 1);
    }
    for (let i = g.pickups.length - 1; i >= 0; i--) {
      const k = g.pickups[i];
      k.update(dt, g);
      if (k.dead) g.pickups.splice(i, 1);
    }
    for (let i = g.boulders.length - 1; i >= 0; i--) {
      const b = g.boulders[i];
      b.update(dt, g);
      if (b.dead) g.boulders.splice(i, 1);
    }
    for (let i = g.crates.length - 1; i >= 0; i--) {
      const c = g.crates[i];
      if (Math.abs(c.x - p.x) < VW && Math.abs(c.y - p.y) < VH) c.update(dt, g);
      if (c.dead) g.crates.splice(i, 1);
    }

    // stratum banners as you cross into a new band
    const si = g.world.stratumAt(p.x, p.y);
    if (si !== g.lastStratum && g.state === 'play') {
      if (si >= 0 && g.lastStratum !== -2) {
        g.banner = { text: g.world.strata[si].name, t: 3.2 };
        A.sfx.tone(220, { type: 'triangle', to: 440, dur: 0.5, vol: 0.1 });
      }
      g.lastStratum = si;
    }
    ambience(dt);

    // heat decays back to rock colour once the fissures stop spreading
    if (!g.destruction && g.world.heatDirty) {
      const w = g.world;
      let any = false;
      for (let i = 0; i < w.heat.length; i++) {
        if (w.heat[i] > 0) { w.heat[i] = Math.max(0, w.heat[i] - dt * 0.5); any = true; }
      }
      w.heatDirty = any;
    }

    FX.update(dt, g.world);
    updatePod(dt);
    updateCamera(dt, false);

    // contextual nudges
    if (g.state === 'play' && !g.cinematic) {
      if (g.world.coreHp < g.world.coreMax && g.world.coreHp > 0) hint('core', ['drill', 'arrowR', 'star', 'bang']);
      else if (p.o2 < p.stat('oxygen') * 0.2) hint('air', ['o2', 'bang', 'arrowR', 'hole']);
    }

    // music swells the deeper you go
    const depthF = U.clamp(g.world.depthMeters(p.y) / Math.max(20, g.world.maxDepthMeters()), 0, 1);
    A.setIntensity(g.destruction ? 1 : depthF);
  }

  function closeVictory() {
    g.cinematic = false;
    g.victory = null;
    if (g.save.destroyed.filter(Boolean).length >= D.BODIES.length) g.state = 'ending';
    else dock(true);
  }

  function nearShip() {
    const p = g.player, s = g.ship;
    return Math.abs(p.x - s.x) < s.w / 2 && p.y > s.y - 14 && p.y < s.y + 50;
  }

  /* Escape and E mean different things per state; resolved once per frame so a
     single keypress cannot both dock and undock you. */
  function handleStateKeys() {
    const IN = PD.input;
    const e = IN.hit('KeyE'), esc = IN.hit('esc');
    if (!e && !esc) return;
    switch (g.state) {
      case 'play':
        if (g.cinematic) break;
        if (e && nearShip()) dock(false);
        else if (esc) { g.pausedFrom = 'play'; g.state = 'pause'; A.drill(false); A.thrust(0); }
        break;
      case 'home':
      case 'mind':
        break;                                   // these scenes handle their own keys
      case 'starmap':
        break;
      case 'pause':
        if (esc) g.state = g.pausedFrom || 'play';
        break;
      case 'victory':
        if ((e || esc) && g.victory && g.victory.t > 1.0) closeVictory();
        break;
    }
  }

  /* Drifting motes, embers, snow or spores depending on the band you are in. */
  function ambience(dt) {
    const w = g.world, p = g.player;
    const si = w.stratumAt(p.x, p.y);
    g.ambT += dt;
    if (si < 0) {
      if (U.chance(dt * 4)) FX.spawn({ x: g.cam.x + U.rand(0, VW), y: g.cam.y + U.rand(0, VH), vx: U.rand(-4, 4), vy: U.rand(-4, 4), life: 2, size: 1, color: '#9fb4ff', grav: 0, drag: 1, glow: 1 });
      return;
    }
    const L0 = w.strata[si];
    const spawn = (n, fn) => { for (let k = 0; k < n; k++) if (U.chance(dt * 6)) fn(g.cam.x + U.rand(-20, VW + 20), g.cam.y + U.rand(-20, VH + 20)); };
    if (L0.embers) spawn(3, (x, y) => FX.spawn({ x, y, vx: U.rand(-8, 8), vy: U.rand(-40, -14), life: U.rand(1, 2.4), size: U.rand(1, 2), color: U.pick(['#ff9b3d', '#ffd27a', '#ff5a2a']), grav: -0.15, drag: 0.99, glow: 1 }));
    if (L0.snow) spawn(3, (x, y) => FX.spawn({ x, y, vx: U.rand(-10, 10), vy: U.rand(10, 26), life: U.rand(2, 4), size: U.rand(1, 1.8), color: '#e8fbff', grav: 0.02, drag: 1 }));
    if (L0.spores) spawn(3, (x, y) => FX.spawn({ x, y, vx: U.rand(-6, 6), vy: U.rand(-8, 6), life: U.rand(2, 4), size: U.rand(1, 2), color: U.pick(['#8affc8', '#5fffb0']), grav: -0.02, drag: 1, glow: 1 }));
    if (L0.sparkle) spawn(2, (x, y) => FX.spawn({ x, y, vx: 0, vy: U.rand(-3, 3), life: U.rand(0.4, 1), size: 1, color: '#ffffff', grav: 0, drag: 1, glow: 1 }));
    if (!L0.embers && !L0.snow && !L0.spores) spawn(1, (x, y) => FX.spawn({ x, y, vx: U.rand(-4, 4), vy: U.rand(-3, 3), life: U.rand(2, 4), size: 1, color: '#a09080', grav: 0, drag: 1 }));
  }

  function updateCamera(dt, slow) {
    const p = g.player;
    const m = PD.input.mouse;
    // lead the camera a little toward where the player is looking
    const leadX = U.clamp((m.x - VW / 2) * 0.18, -40, 40);
    const leadY = U.clamp((m.y - VH / 2) * 0.14, -26, 26);
    let tx = p.x - VW / 2 + leadX;
    let ty = p.y - VH / 2 + leadY;
    tx = U.clamp(tx, 0, Math.max(0, g.world.pxW - VW));
    ty = U.clamp(ty, -40, Math.max(0, g.world.pxH - VH));
    g.cam.x = U.damp(g.cam.x, tx, slow ? 0.06 : 0.16, dt);
    g.cam.y = U.damp(g.cam.y, ty, slow ? 0.06 : 0.16, dt);
  }

  /* ------------------------------------------------------------------- render */
  const HD = 2;
  let cv, ctx, screen, sctx, lightCv, lctx, scale = 2, offX = 0, offY = 0;

  function setupCanvas() {
    screen = document.getElementById('screen');
    sctx = screen.getContext('2d');
    // The frame is drawn in 480x270 units on to a 960x540 canvas: everything
    // old renders exactly as before (a unit is a 2x2 block), while sprites
    // authored at 2x density draw at full detail. HD is opt-in per sprite.
    cv = document.createElement('canvas');
    cv.width = VW * HD; cv.height = VH * HD;
    ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    lightCv = document.createElement('canvas');
    lightCv.width = VW; lightCv.height = VH;
    lctx = lightCv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    screen.width = w; screen.height = h;
    sctx.imageSmoothingEnabled = false;
    const fit = Math.min(w / VW, h / VH);
    // Integer scaling keeps desktop pixel-perfect; phones would waste half the
    // screen on letterbox, so below 2x we fill instead.
    scale = fit >= 2 ? Math.floor(fit) : Math.max(0.5, fit);
    offX = Math.floor((w - VW * scale) / 2);
    offY = Math.floor((h - VH * scale) / 2);
    g.scale = scale; g.offX = offX; g.offY = offY;
  }

  function updatePod(dt) {
    const s = g.ship, p = g.player;
    if (g.state !== 'play') return;
    // the pod tracks you along the sky but never dips into the rock
    const tx = U.clamp(p.x, 60, g.world.pxW - 60);
    s.x = U.damp(s.x, tx, 0.04, dt);
    s.y = Math.max(30, g.world.bodyTopPx - 70) + Math.sin(g.time * 1.3) * 3;
  }

  /* Your pod hangs above the dig site with the wire running down to you.
     Fly up to it and press E to go home. */
  function drawShip(ctx, cam) {
    const s = g.ship, p = g.player;
    const t = g.time;
    const x = s.x - cam.x, y = s.y - cam.y;
    const near = Math.abs(p.x - s.x) < s.w / 2 && p.y > s.y - 14 && p.y < s.y + 50;

    // the wire: a sagging line from the pod's belly to the player's pack
    if (!p.docked) {
      const L = p.stat('tether');
      const frac = U.clamp(p.tetherFrac || 0, 0, 1);
      const px = p.x - cam.x - (Math.cos(p.aim) < 0 ? -6 : 6), py = p.y - cam.y - 2;
      const sag = (1 - frac) * 40;
      const wireCol = frac > 0.9 ? (Math.sin(t * 20) > 0 ? '#ff5a4d' : '#ffd34d') : '#c9c9dc';
      PD.pxd.curve(ctx, x, y + 13, (x + px) / 2, Math.max(y, py) + sag + 1, px, py + 1, 'rgba(0,0,0,0.4)', 1, 16);
      PD.pxd.curve(ctx, x, y + 12, (x + px) / 2, Math.max(y, py) + sag, px, py, wireCol, 1, 16);
      // reel gauge on the pod
      PD.pxd.plate(ctx, x - 17, y - 25, 34, 6, '#0d0720', '#3a2c5e', '#000000', 2);
      PD.pxd.rect(ctx, x - 16, y - 24, Math.round(32 * frac), 4, frac > 0.9 ? '#ff5a4d' : '#7ef9ff');
    }

    const pod = PD.art.skinFor(g.save.cos).pod;
    const bob = Math.sin(t * 2) * 1.5;
    const flip = p.x < s.x - 10;
    ctx.save(); ctx.translate(x | 0, (y + bob) | 0); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(pod.frames[Math.floor(t * 8) % 2], -pod.ox, -pod.oy);
    ctx.restore();
    for (let i = 0; i < 2; i++) {                    // idle thruster puff
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 12 + i);
      ctx.fillStyle = i ? '#ff9b3d' : '#ffe08a';
      ctx.fillRect((x + (flip ? 20 : -24) - i * 3) | 0, (y + bob + 1) | 0, 4, 3);
    }
    ctx.globalAlpha = 1;
    if (g.state === 'play' && near) {
      PD.glyph.draw(ctx, 'home', x - 7, y - 42 + Math.sin(t * 5) * 2, '#ffd34d', '#ff9b3d');
      F.draw(ctx, 'E', x, y - 30, '#ffd34d', { center: true });
    }
  }

  function drawLighting(cam) {
    const p = g.player;
    const w = g.world;
    const surface = w.bodyTopPx;
    // a pebble goes pitch black within a few tiles; a superplanet takes longer
    const ramp = U.clamp(w.radius * 0.42, 5, 24) * TILE;
    const dark = U.smoothstep(surface - 24, surface + ramp, p.y) * 0.94;
    if (dark < 0.02) return;

    lctx.clearRect(0, 0, VW, VH);
    // darkness takes the colour of the band you are in: rust red in the magma
    // sea, deep blue in the ice, black-green in the glowcap hollows
    const si = w.stratumAt(p.x, p.y);
    const tint = si >= 0 ? w.strata[si].tint : '#03010a';
    const tr = parseInt(tint.slice(1, 3), 16) >> 2, tg = parseInt(tint.slice(3, 5), 16) >> 2, tb = parseInt(tint.slice(5, 7), 16) >> 2;
    lctx.fillStyle = 'rgba(' + tr + ',' + tg + ',' + tb + ',' + dark.toFixed(3) + ')';
    lctx.fillRect(0, 0, VW, VH);

    lctx.globalCompositeOperation = 'destination-out';

    // glowing tiles (magma, crystal, glowcaps, uranium, relics) light their surroundings
    const gl = w.glows || [];
    for (let k = 0; k < gl.length; k += 4) {
      const gx = gl[k], gy = gl[k + 1], gr = gl[k + 2];
      PD.pxd.glowBands(lctx, gx, gy, gr, '#000000', 3, 0.5);
    }
    const lamp = p.stat('lamp');
    const px = p.x - cam.x, py = p.y - cam.y;

    // headlamp: broad halo plus a cone along the aim
    PD.pxd.glowBands(lctx, px, py, lamp, '#000000', 5, 1);

    const cx = px + Math.cos(p.aim) * lamp * 0.75, cy = py + Math.sin(p.aim) * lamp * 0.75;
    PD.pxd.glowBands(lctx, cx, cy, lamp * 0.8, '#000000', 4, 0.85);

    // the core is its own furnace
    if (w.coreHp > 0) {
      const kx = w.coreCenter.x - cam.x, ky = w.coreCenter.y - cam.y;
      PD.pxd.glowBands(lctx, kx, ky, w.chamberR * 1.5, '#000000', 5, 1);
    }

    if (p.drilling) {
      const tip = p.drillTip();
      const tx = tip.x - cam.x, ty = tip.y - cam.y;
      PD.pxd.glowBands(lctx, tx, ty, 30, '#000000', 3, 0.8);
    }

    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightCv, 0, 0);
  }

  function render() {
    const sh = FX.shakeOffset();
    const cam = { x: Math.round(g.cam.x + sh.x), y: Math.round(g.cam.y + sh.y) };

    ctx.setTransform(HD, 0, 0, HD, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VW, VH);

    if (g.state === 'starmap') {
      PD.starmap.draw(ctx, g, g.time);
      FX.drawOverlay(ctx, VW, VH);
      UI.endFrame();
      blit();
      return;
    }

    if (g.state === 'mind') {
      PD.mind.draw(ctx, g, g.time);
      UI.endFrame();
      blit();
      return;
    }

    if (g.state === 'home') {
      PD.home.draw(ctx, g, g.time);
      FX.drawWorld(ctx, { x: Math.round(g.intCam), y: 0 });
      FX.drawFloaters(ctx, { x: Math.round(g.intCam), y: 0 }, (c, str, x, y, col, size) =>
        F.draw(c, str, x, y, col, { center: true, scale: size >= 2 ? 2 : 1 }));
      if (!PD.home.UI.mode) UI.homeBar(ctx, g);
      PD.touch.draw(ctx, PD.home.touchMode(), g);
      UI.endFrame();
      blit();
      return;
    }

    if (g.state === 'title') {
      // slow drifting starfield behind the logo
      // the title has its own hero art, so the backdrop moon stays out of it
      g.world.drawSky(ctx, { x: g.time * 6, y: 20 }, VW, VH, g.time, true);
      const r = UI.title(ctx, g, g.time);
      if (r.start) {
        A.resume(); A.music(true);
        startBody(g.save.bodyIndex || 0, false);
        dock(true);
      }
      if (r.wipe) wipeSave();
      PD.touch.draw(ctx, 'ui');
      blit();
      return;
    }

    PD.galaxy.draw(ctx, cam, g.time, 400 + g.bodyIndex * 31, g.world.body.sky);
    g.world.drawSky(ctx, cam, VW, VH, g.time, false, true);
    g.world.draw(ctx, cam, VW, VH, g.time);
    g.world.drawFlora(ctx, cam, VW, VH, g.time);
    drawShip(ctx, cam);

    for (const k of g.pickups) k.draw(ctx, cam, g.time);
    for (const c of g.crates) c.draw(ctx, cam, g.time);
    for (const b of g.boulders) b.draw(ctx, cam);
    for (const m of g.mobs) m.draw(ctx, cam);
    FX.drawWorld(ctx, cam);
    for (const b of g.bullets) b.draw(ctx, cam);
    if (!g.player.docked) g.player.draw(ctx, cam, g.time);

    drawLighting(cam);
    FX.drawOverlay(ctx, VW, VH);
    FX.drawFloaters(ctx, cam, (c, s, x, y, col, size, center) =>
      F.draw(c, s, x, y, col, { center: true, scale: size >= 2 ? 2 : 1 }));

    // low-air vignette
    const airF = g.player.o2 / g.player.stat('oxygen');
    if (airF < 0.3) {
      const a = (1 - airF / 0.3) * 0.45 * (0.7 + 0.3 * Math.sin(g.time * 7));
      // dithered bands closing in from the edges, no soft vignette
      for (let i = 0; i < 5; i++) {
        const inset = i * 9;
        ctx.globalAlpha = a * (1 - i / 5);
        PD.pxd.dither(ctx, inset, inset, VW - inset * 2, 9, '#8a0a1e', i % 2);
        PD.pxd.dither(ctx, inset, VH - inset - 9, VW - inset * 2, 9, '#8a0a1e', i % 2);
        PD.pxd.dither(ctx, inset, inset, 9, VH - inset * 2, '#8a0a1e', i % 2);
        PD.pxd.dither(ctx, VW - inset - 9, inset, 9, VH - inset * 2, '#8a0a1e', i % 2);
      }
      ctx.globalAlpha = 1;
    }

    if (g.state !== 'victory' && g.state !== 'ending') UI.hud(ctx, g);
    UI.sellSplash(ctx, g);

    if (g.state === 'pause') {
      const r = UI.pause(ctx, g);
      if (r.resume) g.state = g.pausedFrom || 'play';
      if (r.ship) { g.state = 'play'; g.emergencyRecall(); }
    } else if (g.state === 'victory') {
      const r = UI.victory(ctx, g);
      if (r && r.ok) closeVictory();
    } else if (g.state === 'ending') {
      if (UI.ending(ctx, g, g.time)) dock(true);
    }

    PD.touch.draw(ctx, g.state === 'play' ? 'play' : 'ui', g);
    UI.endFrame();
    blit();
  }

  function blit() {
    sctx.fillStyle = '#05030f';
    sctx.fillRect(0, 0, screen.width, screen.height);
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(cv, 0, 0, VW * HD, VH * HD, offX, offY, Math.round(VW * scale), Math.round(VH * scale));
  }

  /* --------------------------------------------------------------------- loop */
  let last = 0, loopErrors = 0;
  function frame(ts) {
    // Always re-queue: one bad frame must never kill the whole game loop.
    requestAnimationFrame(frame);
    try { step(ts); } catch (e) {
      if (loopErrors++ < 5) console.error('frame error', e);
    }
  }

  function step(ts) {
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.1) dt = 0.1;
    g.dt = dt;
    g.fps = U.lerp(g.fps, 1 / Math.max(0.0001, dt), 0.05);

    // convert pointer position into canvas and world space
    const m = PD.input.mouse;
    m.x = U.clamp((m.sx - offX) / scale, 0, VW);
    m.y = U.clamp((m.sy - offY) / scale, 0, VH);
    m.wx = m.x + g.cam.x;
    m.wy = m.y + g.cam.y;

    FX.tickFreeze(dt);
    PD.touch.apply(g.state === 'play' ? 'play' : (g.state === 'home' ? PD.home.touchMode() : 'ui'));

    if (FX.freeze > 0) {
      // hit-stop: the world holds still but particles keep creeping
      FX.update(dt * 0.15, g.world);
      A.schedule();
    } else {
      update(dt);
    }
    render();
    PD.touch.clearEdges();
    PD.input.endFrame();
  }

  function boot() {
    PD.world.buildAtlas();
    setupCanvas();
    PD.input.attach(screen);
    PD.touch.attach(screen, (cssX, cssY) => ({
      x: U.clamp((cssX - offX) / scale, 0, VW),
      y: U.clamp((cssY - offY) / scale, 0, VH)
    }));
    PD.input.onFirstInteraction(() => { A.resume(); A.music(true); });
    loadGame();
    // the title screen needs a world for its starfield
    startBody(g.save.bodyIndex || 0, true);
    g.state = 'title';
    window.addEventListener('beforeunload', saveGame);
    setInterval(() => { if (g.state === 'play' || g.state === 'shop') saveGame(); }, 20000);
    requestAnimationFrame(frame);
  }

  PD.boot = boot;
})(window.PD);
