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
      pet: 0,                                     // whether the rat is yours yet
      thots: 0, thotFrac: 0, neur: {},            // what the brain in the jar has grown
      artifacts: 0,                               // relics hauled home
      debt: PD.chum.DEBT0,                        // what you owe Mr Chum
      seenIntro: 0, trash: 0, suit: 0
    };
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
      base.debt = s.debt === undefined ? 0 : Math.max(0, +s.debt || 0);
      base.trash = Math.max(0, +s.trash || 0);
      base.suit = s.suit ? 1 : 0;
      if (s.vault) for (const k in s.vault) { const n = +s.vault[k]; if (n > 0 && D.MAT[k]) base.vault[k] = n; }
      if (s.owned) base.owned = s.owned;
      if (s.cos) for (const k in base.cos) if (s.cos[k]) base.cos[k] = s.cos[k];
      // everything you own is a thing you bought on Abay, stored flat
      const flat = s.upg || s.neur;
      if (flat) { for (const u of D.UPGRADES) if (flat[u.id] !== undefined) base.upg[u.id] = U.clamp(+flat[u.id] || 0, 0, u.max); }
      base.artifacts = +s.artifacts || 0;
      base.pet = s.pet ? 1 : 0;
      base.thots = Math.max(0, +s.thots || 0);
      base.thotFrac = Math.max(0, +s.thotFrac || 0);
      if (s.neur) for (const k in s.neur) if (D.NEUR[k]) base.neur[k] = U.clamp(+s.neur[k] || 0, 0, D.NEUR[k].max);
    }
    g.save = base;
    recompute();
  }

  /* Every stat is simply the level of the thing you bought for it. */
  function recompute() {
    const sv = g.save;
    for (const u of D.UPGRADES) sv.upg[u.id] = U.clamp(sv.upg[u.id] || 0, 0, u.max);
    if (!sv.neur) sv.neur = {};
    for (const n of D.NEURONS) if (sv.neur[n.id]) sv.neur[n.id] = U.clamp(sv.neur[n.id], 0, n.max);
    if (g.player) { g.player.o2 = Math.min(g.player.o2, g.player.stat('oxygen')); }
  }
  g.recompute = recompute;

  function saveGame() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(Object.assign({}, g.save))); } catch (e) { /* private mode */ }
  }
  function wipeSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    g.save = blankSave();
    recompute();
    startBody(0, true);
    g.player.docked = true;
    PD.chum.enterIntro(g);
  }
  g.saveGame = saveGame;
  g.wipeSave = wipeSave;

  /* Change screens through the iris rather than cutting. */
  g.wipeTo = function (sx, sy, col, fn) {
    FX.beginWipe(sx, sy, col, fn);
    A.sfx.tone(180, { type: 'square', to: 900, dur: 0.16, vol: 0.07 });
    A.sfx.tone(900, { type: 'triangle', to: 300, dur: 0.2, vol: 0.05, delay: 0.26 });
  };

  g.valueMult = function () { return 1 + g.save.bonus / 100 + g.save.dominion * 0.004; };

  /* ---------------------------------------------------------------- the brain
     Neuron levels, what they are worth, and the THOTS that pay for them. */
  g.brain = function (id) { return (g.save.neur && g.save.neur[id]) || 0; };
  /* A neuron only lights up once one of the neurons it is wired to is on. */
  g.brainWired = function (n) { return !n.links.length || n.links.some(l => g.brain(l) > 0); };
  g.brainCost = function (id) { return D.neuronCost(D.NEUR[id], g.brain(id)); };
  g.brainBuy = function (id) {
    const n = D.NEUR[id];
    if (!n) return false;
    const lvl = g.brain(id);
    if (lvl >= n.max || !g.brainWired(n)) return false;
    const c = g.brainCost(id);
    if (g.save.thots < c) return false;
    g.save.thots -= c;
    g.save.neur[id] = lvl + 1;
    recompute();
    saveGame();
    return true;
  };
  /* THOTS come out of work: rock you break, and worlds you finish off. */
  g.earnThots = function (n) {
    g.save.thotFrac = (g.save.thotFrac || 0) + n;
    while (g.save.thotFrac >= 1) { g.save.thotFrac -= 1; g.save.thots++; }
  };
  g.droneIncome = function () {
    const n = g.save.upg.drones || 0;
    if (!n) return 0;
    return n * 2.4 * D.UPG.droneyield.value(g.save.upg.droneyield || 0) * (1 + g.save.dominion / 100);
  };

  /* Sectors open when you buy another WARP THINGY off bort_electronics. */
  g.zoneOpen = function (zi) { return zi < 1 + (g.save.upg.warp || 0); };

  /* ------------------------------------------------------------------ ABAY
     One shop, one button. Pay the man, the thing is instantly on your moon,
     nobody asks where it came from and neither do you. */
  g.abayCost = function (id) {
    const it = D.ABAYX[id];
    if (!it) return Infinity;
    return D.abayCost(it, g.save.upg[id] || 0);
  };
  g.abayMax = function (id) {
    const it = D.ABAYX[id];
    const u = D.UPG[id];
    return Math.min(it ? it.max : 0, u ? u.max : 0);
  };
  /* KNOW A GUY: the brain has leverage over someone at Abay. */
  g.abayPrice = function (id) {
    const it = D.ABAYX[id];
    if (!it) return 0;
    const lvl = g.save.upg[id] || 0;
    return Math.max(10, Math.round(D.abayCost(it, lvl) * (1 - g.brain('know') * 0.05)));
  };
  g.abayBuy = function (id) {
    const it = D.ABAYX[id];
    if (!it) { A.sfx.deny(); return false; }
    const lvl = g.save.upg[id] || 0;
    if (lvl >= g.abayMax(id)) { A.sfx.deny(); return false; }
    const cost = g.abayPrice(id);
    if (g.save.credits < cost) { A.sfx.deny(); return false; }
    g.save.credits -= cost;
    g.save.upg[id] = lvl + 1;
    recompute();
    if (g.player) { g.player.o2 = g.player.stat('oxygen'); g.player.hull = g.player.stat('hull'); }
    A.sfx.buy();
    A.sfx.tone(320, { type: 'square', to: 880, dur: 0.2, vol: 0.09 });
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
    PD.travel.enter(g, index);
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
    return g.valueMult() * D.UPG.crew.value(g.save.upg.crew || 0) * D.UPG.refine.value(g.save.upg.refine || 0) * D.UPG.greed.value(g.save.upg.greed || 0)
      * (1 + g.brain('haggle') * 0.07);
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
    let lots = 0;   // counted for the sound of it
    for (const k in g.save.vault) lots += g.save.vault[k];
    g.save.vault = {};
    /* He takes a fifth off the top until the book is closed. It is his money,
       he was very clear about that, and he has a hologram. */
    const cut = PD.chum.takeCut(g, total);
    const keep = total - cut;
    g.save.credits += keep;
    g.save.totalEarned += keep;
    PD.chum.call(g, 'sell');
    if (cut > 0) FX.text(240, 120, '-$' + U.fmt(cut) + ' MR CHUM', '#ff5fa8', 1);
    A.sfx.sell();
    for (let i = 0; i < 8; i++) setTimeout(() => A.sfx.coin(i), i * 55);
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
    // the chart and the sky over your house both show the real thing: an ice
    // ball has caps, a furnace world is cracked open, a gemstone is cut
    if (!navIcons[i]) navIcons[i] = PD.arthome.buildPlanet(56, D.BODIES[i].tint, 1000 + i * 977, D.BODIES[i].type);
    return navIcons[i];
  };



  g.collect = function (mat, x, y) {
    if (mat === D.M.relic || mat === D.M.fossil || mat === D.M.aether) {
      g.save.artifacts = (g.save.artifacts || 0) + 1;
      // one relic in six is the Orb, and then everyone calls at once
      if (mat === D.M.relic && U.chance(0.17)) {
        g.save.orbs = (g.save.orbs || 0) + 1;
        g.save.credits += D.ORB.worth;
        g.save.totalEarned += D.ORB.worth;
        FX.text(x, y - 22, 'THE ORB', '#c9a0ff', 2);
        FX.text(x, y - 12, '+$' + U.fmt(D.ORB.worth), '#ffd34d', 2);
        FX.ring(x, y, 6, 60, 1.1, '#c9a0ff', 2);
        FX.flash(0.5, '#c9a0ff');
        A.sfx.fanfare && A.sfx.fanfare();
        if (PD.home && PD.home.say) PD.home.say(D.ORB.lines[(Math.random() * D.ORB.lines.length) | 0]);
      } else FX.text(x, y - 12, 'ARTIFACT', '#ffd34d', 2);
    }
    const p = g.player;
    if (!p.addOre(mat)) {
      hint('full', ['cargo', 'bang', 'arrowR', 'hole']);
      return false;
    }
    const m = D.MAT[mat];
    const val = Math.round(m.cr * g.valueMult());
    if (m.cr >= 60) FX.text(x, y - 6, '+$' + U.fmt(val), m.c[0], 0);
    FX.burst(x, y, m.shine ? 7 : 3, [m.c[0], '#ffffff'], 60, !!m.shine);
    // he grabs at it, and it pops out of the world into his pocket
    const dirx = Math.sign(p.x - x) || 1;
    FX.pop(x, y, m.c[0], dirx, -0.4);
    PD.rig.grab(p.rig, x - p.x, y - p.y, Math.cos(p.aim) >= 0);
    if (m.shine) FX.ring(x, y, 2, 26, 0.5, '#ffffff', 1);
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
    // DEBRIS EVERYWHERE: the tile comes apart into chips that bounce off the
    // shaft walls and lie on the floor for a second before they crumble
    const dir = byDrill && g.player ? g.player.aim : undefined;
    FX.shards(x, y, m, m.shine ? 14 : 11, dir);
    FX.crumble(x, y, m);
    // a cartoon puff of dust over the real debris, so a tile giving way READS
    if (U.chance(0.28)) FX.puff(x, y, 1, m.c[1], 0.75);
    A.sfx.break_(U.clamp(m.hp / 255, 0, 1));
    A.sfx.tone(440 + Math.min(20, g.chain.n) * 28, { type: 'triangle', dur: 0.05, vol: 0.05 });
    FX.shake(1.2 + Math.min(1.5, g.chain.n * 0.05));
    if (g.chain.n % 10 === 0) { FX.text(x, y - 14, 'x' + g.chain.n + ' CHAIN', '#ffd34d', 2); FX.hitStop(0.03); A.sfx.coin(g.chain.n / 10 | 0); }
    if (m.cr >= 300) { FX.hitStop(0.04); FX.ring(x, y, 4, 22, 0.4, m.c[0], 2); }

    // the brain feeds on work
    g.earnThots(0.04 + (m.cr >= 300 ? 0.2 : 0));
    // GREEDY LUCK: sometimes the rock was secretly two rocks
    const twice = U.chance(g.brain('rich') * 0.06) ? 2 : 1;
    for (let q = 0; q < twice; q++) {
      if (g.pickups.length < 160) g.pickups.push(new PD.ent.Pickup(x, y, mat, U.rand(-40, 40), U.rand(-90, -20)));
      else g.collect(mat, x, y);
    }
    if (twice > 1) FX.text(x, y - 18, 'TWO!', '#8affa0', 1);

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
  /* Boarding the pod at the dig site starts the RETURN crossing. Everything
     else that calls dock -- a reset, a death, the end of a world -- is a
     teleport and goes straight home, because nobody wants to fly a rock field
     after being eaten. */
  function dock(teleport) {
    const p = g.player;
    if (teleport && g.ship) { p.x = g.ship.x; p.y = g.ship.y + 34; p.vx = p.vy = 0; }
    p.docked = true;
    p.o2 = p.stat('oxygen');
    p.hull = p.stat('hull');
    p.invuln = 1;
    const n = stow();
    if (!teleport) { A.drill(false); A.thrust(0); PD.travel.enterReturn(g, n); return; }
    arriveHome(n);
  }

  function arriveHome(n) {
    g.state = 'home';
    if (n > 0) PD.chum.call(g, 'back');
    const pad = PD.home.SPOTS[1].x;
    PD.home.enter(g, pad - 70);
    A.sfx.dock();
    A.drill(false); A.thrust(0);
    if (n > 0) {
      // the haul tumbles out of the saucer and rolls across the regolith
      const bx = pad, by = PD.home.groundY(pad) - 30;
      for (let i = 0; i < Math.min(40, n * 2); i++) {
        FX.spawn({ x: bx + U.rand(-12, 12), y: by, vx: U.rand(-40, 40), vy: U.rand(-90, -20),
          life: 0.9, size: 2, color: i % 2 ? '#ffb03d' : '#c9bce8', grav: 160, drag: 1 });
      }
      FX.text(bx, by - 12, '+' + n + ' ORE', '#ffb03d', 2);
    }
    saveGame();
  }
  g.arriveHome = arriveHome;

  /* The launch pad opens the chart: pick a sector, pick a world, drop. */
  g.undock = function () {
    g.player.docked = false;
    g.openChart();
  };

  g.openChart = function () {
    g.state = 'starmap';
    PD.chum.call(g, 'chart');
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
    PD.chum.call(g, 'dig');
    A.sfx.warp();
    FX.flash(0.8, '#a9d8ff');
    saveGame();
  };

  /* --------------------------------------------------- the money shot
     Core at zero: fissures spread, then the whole body comes apart. */
  function beginDestruction() {
    if (g.destruction) return;
    PD.chum.call(g, 'core');
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
    if (g.state !== 'intro' && g.state !== 'travel') PD.chum.update(dt, g);
    handleStateKeys();

    // Zaz keeps working in every state where time passes
    if (g.state !== 'title' && g.state !== 'pause') demandTick(dt);


    if (g.state === 'starmap') {
      PD.starmap.update(dt, g);
      FX.update(dt, null);
      return;
    }

    if (g.state === 'intro') {
      PD.chum.updateIntro(dt, g);
      FX.update(dt, null);
      return;
    }

    if (g.state === 'travel') {
      PD.chum.update(dt, g);
      PD.travel.update(dt, g);
      FX.update(dt, null);
      return;
    }

    if (g.state === 'home') {
      PD.home.update(dt, g);
      FX.update(dt, null);
      return;
    }
    if (g.state === 'desk') {
      PD.desk.update(dt, g);
      return;
    }
    if (g.state === 'mind') {
      PD.mind.update(dt, g);
      FX.update(dt, null);
      return;
    }

    g.combo.t -= dt;
    if (g.chain && g.chain.t > 0) { g.chain.t -= dt; if (g.chain.t <= 0) g.chain.n = 0; }
    if (g.combo.t <= 0 && g.combo.n) { g.combo.n = 0; g.combo.mult = 1; }
    for (let i = g.pings.length - 1; i >= 0; i--) { g.pings[i].life -= dt; if (g.pings[i].life <= 0) g.pings.splice(i, 1); }
    if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }

    if (g.state === 'title' || g.state === 'ending') return;

    if (g.state === 'victory') {
      // only reachable through beginDestruction; if something has put us here
      // without it, go home rather than throwing every frame from now on
      if (!g.victory) { g.state = 'home'; PD.home.enter(g); return; }
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
    /* These read their own keys, and IN.hit CONSUMES the edge -- reading it
       here first is why the cutscene would not advance and why dismissing the
       shark next to the pod used to dock you at the same time. */
    if (g.state === 'intro' || g.state === 'travel' || PD.chum.active()) return;
    const e = IN.hit('KeyE'), esc = IN.hit('esc');
    if (!e && !esc) return;
    switch (g.state) {
      case 'play':
        if (g.cinematic) break;
        if (e && nearShip()) dock(false);
        else if (esc) { g.pausedFrom = 'play'; g.state = 'pause'; A.drill(false); A.thrust(0); }
        break;
      case 'home':
      case 'desk':
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
  let cv, ctx, screen, sctx, lightCv, lctx, homeCv, hctx, scale = 2, offX = 0, offY = 0;

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
    // the buffer the home scene is painted into before it is blown up
    homeCv = document.createElement('canvas');
    homeCv.width = VW * HD; homeCv.height = VH * HD;
    hctx = homeCv.getContext('2d');
    hctx.imageSmoothingEnabled = false;
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

    // One thrown frame must not disfigure every frame after it. A clip left on
    // the state stack survives setTransform and clearRect, so the screen would
    // stay half-drawn forever. Unwind to a clean slate first.
    if (ctx.reset) ctx.reset();
    else for (let i = 0; i < 24; i++) ctx.restore();

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

    if (g.state === 'intro') {
      PD.chum.drawIntro(ctx, g, g.time);
      FX.drawOverlay(ctx, VW, VH);
      UI.endFrame();
      blit();
      return;
    }

    if (g.state === 'travel') {
      PD.travel.draw(ctx, g, g.time);
      FX.drawOverlay(ctx, VW, VH);
      UI.endFrame();
      blit();
      return;
    }

    if (g.state === 'desk') {
      PD.desk.draw(ctx, g, g.time);
      PD.touch.draw(ctx, 'ui', g);
      UI.endFrame();
      blit();
      return;
    }

    if (g.state === 'mind') {
      PD.mind.draw(ctx, g, g.time);
      FX.drawOverlay(ctx, VW, VH);
      PD.touch.draw(ctx, 'ui', g);
      UI.endFrame();
      blit();
      return;
    }

    if (g.state === 'home') {
      /* HOME IS ZOOMED. The scene is painted into its own buffer at the usual
         size, then a 240x135 window of it is blown up by exactly two to fill
         the frame -- an integer scale, so every pixel stays a hard square.
         Signs, speech and the touch pad go on afterwards at screen size, so
         the lettering does not turn into billboards. */
      const v = PD.home.view();
      const vx = Math.round(v.x), vy = Math.round(v.y);
      hctx.setTransform(HD, 0, 0, HD, 0, 0);
      hctx.imageSmoothingEnabled = false;
      hctx.clearRect(0, 0, VW, VH);
      PD.home.drawScene(hctx, g, g.time);
      FX.drawWorld(hctx, { x: Math.round(g.intCam), y: 0 });
      FX.drawFloaters(hctx, { x: Math.round(g.intCam), y: 0 }, (c, str, x, y, col, size) =>
        F.draw(c, str, x, y, col, { center: true, scale: size >= 2 ? 2 : 1 }));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(homeCv, vx * HD, vy * HD, PD.home.ZW * HD, PD.home.ZH * HD, 0, 0, VW * HD, VH * HD);
      ctx.setTransform(HD, 0, 0, HD, 0, 0);
      PD.home.drawOverlay(ctx, g, g.time);
      PD.touch.draw(ctx, PD.home.touchMode(), g);
      UI.endFrame();
      blit();
      return;
    }

    if (g.state === 'title') {
      // the menu has its own sky: a whole spiral galaxy, with somebody else's
      // rubbish tumbling across it and every panel hanging in front
      const r = UI.title(ctx, g, g.time, g.dt);
      if (r.start) {
        A.resume(); A.music(true);
        startBody(g.save.bodyIndex || 0, false);
        // a first-timer gets the night they lost it; everyone else goes home
        if (!g.save.seenIntro) { g.player.docked = true; PD.chum.enterIntro(g); }
        else dock(true);
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
    /* The shark goes over everything. He is drawn here rather than in each
       state's own pass because he interrupts all of them equally. */
    if (g.state !== 'intro' && PD.chum.active()) {
      ctx.setTransform(HD, 0, 0, HD, 0, 0);
      ctx.imageSmoothingEnabled = false;
      PD.chum.draw(ctx, g, g.time);
    }
    // the iris goes on last, over whatever screen is underneath it
    if (FX.wipeActive()) {
      ctx.setTransform(HD, 0, 0, HD, 0, 0);
      ctx.imageSmoothingEnabled = false;
      FX.drawWipe(ctx, VW, VH);
    }
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

    // convert pointer position into canvas space
    const m = PD.input.mouse;
    m.x = U.clamp((m.sx - offX) / scale, 0, VW);
    m.y = U.clamp((m.sy - offY) / scale, 0, VH);

    FX.tickFreeze(dt);
    FX.updateWipe(dt);
    // touch overwrites the pointer, so world space is resolved AFTER it -- get
    // this the wrong way round and a finger drag aims at the top-left corner
    // forever, which is exactly how the drill used to feel on a phone
    PD.touch.apply(g.state === 'play' ? 'play' : (g.state === 'home' ? PD.home.touchMode() : 'ui'));
    m.wx = m.x + g.cam.x;
    m.wy = m.y + g.cam.y;

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
