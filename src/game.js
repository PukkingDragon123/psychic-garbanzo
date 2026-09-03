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
    ship: { x: 0, y: 0, w: 84, h: 52 },
    toasts: [],
    hint: '', hintT: 0, hintKey: '',
    shopTab: 0, shopTip: '',
    cinematic: false,
    destruction: null,
    victory: null,
    sellReport: null,
    droneAcc: 0,
    fps: 60
  };
  PD.game = g;

  /* ------------------------------------------------------------------- saves */
  function blankSave() {
    const upg = {};
    for (const u of D.UPGRADES) upg[u.id] = 0;
    return {
      credits: 0, upg, unlocked: 0, destroyed: [], dominion: 0, bonus: 0,
      totalMined: 0, totalEarned: 0, bodyIndex: 0, seen: {}
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
      if (s.upg) for (const k in base.upg) base.upg[k] = U.clamp(+s.upg[k] || 0, 0, D.UPG[k].max);
    }
    g.save = base;
  }

  function saveGame() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(g.save)); } catch (e) { /* private mode */ }
  }

  function wipeSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    g.save = blankSave();
    startBody(0, true);
    g.state = 'play';
    toast('SAVE WIPED. BACK TO THE PEBBLE.', UI.COL.bad);
  }

  g.saveGame = saveGame;
  g.wipeSave = wipeSave;

  g.valueMult = function () { return 1 + g.save.bonus / 100 + g.save.dominion * 0.004; };
  g.droneIncome = function () {
    const n = g.save.upg.drones || 0;
    if (!n) return 0;
    return n * 4 * D.UPG.droneyield.value(g.save.upg.droneyield || 0) * (1 + g.save.dominion / 60);
  };

  /* ------------------------------------------------------------------ toasts */
  function toast(msg, color) {
    g.toasts.push({ msg, color, life: 2.8 });
    if (g.toasts.length > 4) g.toasts.shift();
  }
  g.toast = toast;

  function hint(key, msg) {
    if (g.hintKey === key) { g.hintT = Math.max(g.hintT, 1); return; }
    g.hintKey = key;
    g.hint = msg;
    g.hintT = 5;
  }

  /* -------------------------------------------------------------- world setup */
  function startBody(index, freshPlayer) {
    g.bodyIndex = index;
    g.save.bodyIndex = index;
    const body = D.BODIES[index];
    g.world = new PD.world.World(body, index);
    g.mobs.length = 0; g.bullets.length = 0; g.pickups.length = 0; g.boulders.length = 0;
    FX.reset();
    g.destruction = null;
    g.victory = null;
    g.cinematic = false;

    g.ship.x = g.world.cx * TILE;
    g.ship.y = Math.max(30, g.world.bodyTopPx - 150);

    if (!g.player || freshPlayer) g.player = new PD.Player(g);
    g.player.clearCargo();
    g.player.reset(g.ship.x, g.ship.y + 34);
    g.player.docked = false;

    spawnMobs();
    g.cam.x = g.player.x - VW / 2;
    g.cam.y = g.player.y - VH / 2;
    if (!g.save.seen[index]) {
      g.save.seen[index] = 1;
      toast(body.name.toUpperCase(), UI.COL.gold);
      toast(body.blurb.toUpperCase(), UI.COL.text);
    }
    hint('dive', 'FLY DOWN TO THE ROCK - HOLD LEFT MOUSE TO DRILL');
  }

  function spawnMobs() {
    const w = g.world;
    const body = w.body;
    const cap = Math.min(70, 10 + g.bodyIndex * 6);
    let tries = 0;
    while (g.mobs.length < cap && tries < 6000) {
      tries++;
      const cx = U.randInt(2, w.w - 3), cy = U.randInt(PD.world.SKY, w.h - 3);
      if (w.at(cx, cy)) continue;
      // must be a real pocket, not open space outside the body
      const dx = cx - w.cx, dy = cy - w.cy;
      if (Math.sqrt(dx * dx + dy * dy) > w.radius - 2) continue;
      if (U.dist(cx * TILE, cy * TILE, w.coreCenter.x, w.coreCenter.y) < w.chamberR + TILE) continue;
      if (!U.chance(body.enemyRate * 0.5)) continue;
      const type = U.weighted(body.mobs);
      g.mobs.push(new PD.ent.Mob(type, cx * TILE + TILE / 2, cy * TILE + TILE / 2, 1 + g.bodyIndex * 0.14));
    }
    if (g.bodyIndex >= 1) {
      const c = w.coreCenter;
      g.mobs.push(new PD.ent.Mob('guardian', c.x + w.chamberR * 0.5, c.y - w.chamberR * 0.3,
        0.5 + g.bodyIndex * 0.32));
    }
  }

  g.travelTo = function (index) {
    if (index > g.save.unlocked) return;
    A.sfx.warp();
    FX.flash(0.9, '#a9d8ff');
    startBody(index, false);
    g.state = 'play';
    g.player.docked = false;
    saveGame();
    toast('ARRIVING AT ' + D.BODIES[index].name.toUpperCase(), UI.COL.o2);
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

  function sellCargo() {
    const p = g.player;
    const lines = [];
    let total = 0;
    const keys = Object.keys(p.cargo).sort((a, b) => D.MAT[b].cr * p.cargo[b] - D.MAT[a].cr * p.cargo[a]);
    for (const k of keys) {
      const m = D.MAT[k], n = p.cargo[k];
      const cr = Math.round(m.cr * n * g.valueMult());
      total += cr;
      if (lines.length < 5) lines.push({ name: m.name, n, cr });
    }
    if (keys.length > 5) lines.push({ name: 'OTHER', n: keys.length - 5, cr: 0 });
    if (total > 0) {
      g.save.credits += total;
      g.save.totalEarned += total;
      g.sellReport = { lines, total, life: 4.5 };
      A.sfx.sell();
      for (let i = 0; i < 8; i++) {
        setTimeout(() => A.sfx.coin(i), i * 55);
      }
      FX.text(g.ship.x, g.ship.y + 10, '+$' + U.fmt(total), '#ffd34d', 2);
    }
    p.clearCargo();
    return total;
  }

  g.collect = function (mat, x, y) {
    const p = g.player;
    if (!p.addOre(mat)) {
      hint('full', 'HOLD FULL - FLY UP TO THE SHIP OR HOLD R');
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
    const m = D.MAT[mat];
    const x = cx * TILE + TILE / 2, y = cy * TILE + TILE / 2;

    if (mat === D.M.core) { beginDestruction(); return; }

    g.save.totalMined++;
    FX.dust(x, y, m.shine ? 9 : 6, m.c[2], 55);
    FX.burst(x, y, 3, m.c, 70);
    A.sfx.break_(U.clamp(m.hp / 255, 0, 1));
    FX.shake(1.2);

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
    const bounty = Math.round(m.def.cr * (1 + g.bodyIndex * 0.25) * g.valueMult());
    g.save.credits += bounty;
    g.save.totalEarned += bounty;
    FX.text(m.x, m.y - 8, '+$' + U.fmt(bounty), '#ffd34d', 1);
    FX.burst(m.x, m.y, m.def.kind === 'boss' ? 60 : 18, ['#ffffff', '#c8ff8a', '#8f6ad8', '#ffd34d'], m.def.kind === 'boss' ? 260 : 150);
    FX.ring(m.x, m.y, 4, m.def.kind === 'boss' ? 90 : 34, 0.5, '#ffffff', 2);
    FX.shake(m.def.kind === 'boss' ? 9 : 3.4);
    FX.hitStop(m.def.kind === 'boss' ? 0.12 : 0.04);
    A.sfx.killMob();
    if (m.def.kind === 'boss') { A.sfx.boom(1.2); toast('CORE WARDEN DOWN', UI.COL.good); }
    // guts of the beast are worth something
    const drops = m.def.kind === 'boss' ? 7 : (U.chance(0.5) ? 1 : 0);
    for (let i = 0; i < drops; i++) {
      const pool = g.world.body.ores;
      g.pickups.push(new PD.ent.Pickup(m.x, m.y, U.weighted(pool)));
    }
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
    toast('HULL BREACH - EMERGENCY RECALL', UI.COL.bad);
    toast('LOST A THIRD OF THE HOLD', UI.COL.bad);
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
    toast('TRACTOR BEAM - 10% OF HOLD LOST IN TRANSIT', UI.COL.o2);
    dock(true);
  };

  /* -------------------------------------------------------------- docking */
  function dock(teleport) {
    const p = g.player;
    if (teleport) { p.x = g.ship.x; p.y = g.ship.y + 34; p.vx = p.vy = 0; }
    p.docked = true;
    p.o2 = p.stat('oxygen');
    p.hull = p.stat('hull');
    p.invuln = 1;
    g.state = 'shop';
    g.shopTab = 0;
    A.sfx.dock();
    A.drill(false); A.thrust(0);
    sellCargo();
    saveGame();
  }

  g.undock = function () {
    g.player.docked = false;
    g.player.y = g.ship.y + 42;
    g.player.vy = 30;
    g.state = 'play';
    g.sellReport = null;
    A.sfx.tone(520, { type: 'triangle', dur: 0.2, vol: 0.12 });
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
    toast('CORE BREACH!', UI.COL.core);
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

    if (g.state === 'play' && !g.cinematic && nearShip()) hint('dock', 'PRESS E TO DOCK AND SELL');

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
    updateCamera(dt, false);

    // contextual nudges
    if (g.state === 'play' && !g.cinematic) {
      if (g.world.coreHp < g.world.coreMax && g.world.coreHp > 0) hint('core', 'KEEP DRILLING THE CORE - BREAK THE WORLD');
      else if (p.o2 < p.stat('oxygen') * 0.2) hint('air', 'AIR LOW - GET BACK TO THE SHIP OR HOLD R');
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
        else if (esc) { g.state = 'pause'; A.drill(false); A.thrust(0); }
        break;
      case 'shop':
        if (e || esc) g.undock();
        break;
      case 'pause':
        if (esc) g.state = 'play';
        break;
      case 'victory':
        if ((e || esc) && g.victory && g.victory.t > 1.0) closeVictory();
        break;
    }
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
  let cv, ctx, screen, sctx, lightCv, lctx, scale = 2, offX = 0, offY = 0;

  function setupCanvas() {
    screen = document.getElementById('screen');
    sctx = screen.getContext('2d');
    cv = document.createElement('canvas');
    cv.width = VW; cv.height = VH;
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
    scale = fit >= 2 ? Math.floor(fit) : Math.max(0.5, Math.floor(fit * 2) / 2);
    offX = Math.floor((w - VW * scale) / 2);
    offY = Math.floor((h - VH * scale) / 2);
  }

  function drawShip(ctx, cam) {
    const s = g.ship;
    const spr = PD.art.sprites.ship;
    const blink = Math.sin(g.time * 3) > 0;
    const bob = Math.sin(g.time * 1.1) * 2;
    const x = s.x - cam.x, y = s.y - cam.y + bob;

    // tractor beam glow down to the surface
    if (g.state === 'shop' || Math.abs(g.player.x - s.x) < 60) {
      const grad = ctx.createLinearGradient(0, y + 20, 0, y + 100);
      grad.addColorStop(0, 'rgba(150,250,255,0.38)');
      grad.addColorStop(0.4, 'rgba(126,235,255,0.16)');
      grad.addColorStop(1, 'rgba(126,249,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 22); ctx.lineTo(x + 10, y + 22);
      ctx.lineTo(x + 34, y + 92); ctx.lineTo(x - 34, y + 92);
      ctx.closePath(); ctx.fill();
    }

    PD.ent.drawSprite(ctx, spr, blink ? 1 : 0, x, y, false, false);

    // owned drones buzz around the hull
    const n = Math.min(8, g.save.upg.drones || 0);
    const dspr = PD.art.sprites.drone;
    for (let i = 0; i < n; i++) {
      const a = g.time * 0.8 + i * (U.TAU / Math.max(1, n));
      const dx = x + Math.cos(a) * (52 + (i % 3) * 8);
      const dy = y + Math.sin(a * 1.3) * 16 + 6;
      PD.ent.drawSprite(ctx, dspr, (Math.floor(g.time * 12) + i) % 2, dx, dy, Math.cos(a) < 0, false);
    }

    if (g.state === 'play' && Math.abs(g.player.x - s.x) < s.w / 2 &&
        g.player.y > s.y - 10 && g.player.y < s.y + 46) {
      F.draw(ctx, 'E  DOCK', x, y - 36 + Math.sin(g.time * 5) * 2, '#ffd34d', { center: true, scale: 2 });
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
    lctx.fillStyle = 'rgba(3,1,10,' + dark.toFixed(3) + ')';
    lctx.fillRect(0, 0, VW, VH);

    lctx.globalCompositeOperation = 'destination-out';
    const lamp = p.stat('lamp');
    const px = p.x - cam.x, py = p.y - cam.y;

    // headlamp: broad halo plus a cone along the aim
    let grd = lctx.createRadialGradient(px, py, 2, px, py, lamp);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(0.45, 'rgba(0,0,0,0.75)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = grd;
    lctx.fillRect(px - lamp, py - lamp, lamp * 2, lamp * 2);

    const cx = px + Math.cos(p.aim) * lamp * 0.75, cy = py + Math.sin(p.aim) * lamp * 0.75;
    grd = lctx.createRadialGradient(cx, cy, 2, cx, cy, lamp * 0.8);
    grd.addColorStop(0, 'rgba(0,0,0,0.9)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = grd;
    lctx.fillRect(cx - lamp, cy - lamp, lamp * 2, lamp * 2);

    // the core is its own furnace
    if (w.coreHp > 0) {
      const kx = w.coreCenter.x - cam.x, ky = w.coreCenter.y - cam.y;
      const kr = w.chamberR * 1.5;
      grd = lctx.createRadialGradient(kx, ky, 2, kx, ky, kr);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = grd;
      lctx.fillRect(kx - kr, ky - kr, kr * 2, kr * 2);
    }

    if (p.drilling) {
      const tip = p.drillTip();
      const tx = tip.x - cam.x, ty = tip.y - cam.y;
      grd = lctx.createRadialGradient(tx, ty, 1, tx, ty, 30);
      grd.addColorStop(0, 'rgba(0,0,0,0.8)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = grd;
      lctx.fillRect(tx - 30, ty - 30, 60, 60);
    }

    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightCv, 0, 0);
  }

  function render() {
    const sh = FX.shakeOffset();
    const cam = { x: Math.round(g.cam.x + sh.x), y: Math.round(g.cam.y + sh.y) };

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VW, VH);

    if (g.state === 'title') {
      // slow drifting starfield behind the logo
      g.world.drawSky(ctx, { x: g.time * 6, y: 20 }, VW, VH, g.time);
      const r = UI.title(ctx, g, g.time);
      if (r.start) {
        A.resume(); A.music(true);
        startBody(g.save.bodyIndex || 0, false);
        g.state = 'play';
      }
      if (r.wipe) wipeSave();
      blit();
      return;
    }

    g.world.drawSky(ctx, cam, VW, VH, g.time);
    g.world.draw(ctx, cam, VW, VH, g.time);
    drawShip(ctx, cam);

    for (const k of g.pickups) k.draw(ctx, cam, g.time);
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
      const grd = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.32, VW / 2, VH / 2, VH * 0.78);
      grd.addColorStop(0, 'rgba(120,10,30,0)');
      grd.addColorStop(1, 'rgba(120,10,30,' + a.toFixed(3) + ')');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, VW, VH);
    }

    if (g.state !== 'victory') UI.hud(ctx, g);
    UI.sellSplash(ctx, g);

    if (g.state === 'shop') {
      g.shopTip = '';
      UI.shop(ctx, g);
    } else if (g.state === 'pause') {
      const r = UI.pause(ctx, g);
      if (r.resume) g.state = 'play';
      if (r.ship) { g.state = 'play'; g.emergencyRecall(); }
    } else if (g.state === 'victory') {
      const r = UI.victory(ctx, g);
      if (r && r.ok) closeVictory();
    } else if (g.state === 'ending') {
      if (UI.ending(ctx, g, g.time)) { g.state = 'shop'; dock(true); }
    }

    UI.endFrame();
    blit();
  }

  function blit() {
    sctx.fillStyle = '#05030f';
    sctx.fillRect(0, 0, screen.width, screen.height);
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(cv, 0, 0, VW, VH, offX, offY, Math.round(VW * scale), Math.round(VH * scale));
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
    g.fps = U.lerp(g.fps, 1 / Math.max(0.0001, dt), 0.05);

    // convert pointer position into canvas and world space
    const m = PD.input.mouse;
    m.x = U.clamp((m.sx - offX) / scale, 0, VW);
    m.y = U.clamp((m.sy - offY) / scale, 0, VH);
    m.wx = m.x + g.cam.x;
    m.wy = m.y + g.cam.y;

    FX.tickFreeze(dt);
    if (FX.freeze > 0) {
      // hit-stop: the world holds still but particles keep creeping
      FX.update(dt * 0.15, g.world);
      A.schedule();
    } else {
      update(dt);
    }
    render();
    PD.input.endFrame();
  }

  function boot() {
    PD.world.buildAtlas();
    setupCanvas();
    PD.input.attach(screen);
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
