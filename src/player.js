/* The player: one small greedy alien with a drill, a pistol and a finite
   amount of air. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const D = PD.data;
  const FX = PD.fx;
  const A = PD.audio;
  const TILE = PD.world.TILE;
  const Bullet = PD.ent.Bullet;

  function Player(g) {
    this.g = g;
    this.w = 9; this.h = 13;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.aim = 0;
    this.drillSpin = 0;
    this.drilling = false; this.drillT = 0;
    this.drillPitch = 0;
    this.gunCool = 0;
    this.gunFlash = 0;
    this.invuln = 0;
    this.hurtT = 0;
    this.blink = 0;
    this.thrusting = { x: 0, y: 0 };
    this.docked = false;
    this.dead = false;
    this.recall = 0;
    this.o2 = this.stat('oxygen');
    this.hull = this.stat('hull');
    this.cargo = {};
    this.cargoKg = 0;
    this.suffocating = 0;
    this.alarmT = 0;
    this.squish = 0;
    this.tetherT = 0;
    this.weapon = 'pistol';
    this.tetherFrac = 0; this.tetherSnap = 0; this.anim = 0;
    this.dashCool = 0; this.dashT = 0;
    this.lastTap = { key: '', t: -9 };
    this.scanCool = 0;
    this.burnCool = 0;
    this.lastStratum = -2;
  }

  /* Weapons you have actually fabricated. */
  Player.prototype.weapons = function () {
    const list = ['pistol'];
    if (this.g.save.upg.scatter > 0) list.push('scatter');
    if (this.g.save.upg.lance > 0) list.push('lance');
    return list;
  };
  Player.prototype.cycleWeapon = function (dir) {
    const list = this.weapons();
    if (list.length < 2) return;
    let i = list.indexOf(this.weapon);
    i = (i + (dir || 1) + list.length) % list.length;
    this.weapon = list[i];
    A.tone(700, { type: 'square', to: 1100, dur: 0.08, vol: 0.09 });
    FX.text(this.x, this.y - 16, this.weapon.toUpperCase(), '#7ef9ff', 0);
  };

  /* A stat is its upgrade line, plus whatever perk the Mind has grown on it. */
  Player.prototype.stat = function (id) {
    const g = this.g;
    const upg = g.save.upg;
    const u = D.UPG[id];
    let v = u.value(upg[id] || 0);
    if (id === 'oxygen') v += D.UPG.lung.value(upg.lung || 0);
    if (id === 'cargo') v += D.UPG.belly.value(upg.belly || 0);
    if (id === 'hull') v += D.UPG.ironskin.value(upg.ironskin || 0);
    // and then whatever the brain in the jar has grown on top of it
    const b = g.brain;
    if (!b) return v;
    if (id === 'drill') v *= 1 + b('dig') * 0.09;
    else if (id === 'oxygen') v += b('air') * 14;
    else if (id === 'cargo') v += b('sack') * 5;
    else if (id === 'hull') v += b('tough') * 8;
    else if (id === 'scanner') v *= 1 + b('nose') * 0.16;
    else if (id === 'tether') v *= 1 + b('deep') * 0.12;
    else if (id === 'magnet') v *= 1 + b('pockets') * 0.18;
    else if (id === 'dash' || id === 'thruster') v *= 1 + b('boots') * 0.07;
    else if (id === 'pistol' || id === 'scatter' || id === 'lance') v *= 1 + b('brawn') * 0.11;
    return v;
  };

  Player.prototype.capacity = function () { return this.stat('cargo'); };
  Player.prototype.cargoFull = function () { return this.cargoKg >= this.capacity() - 0.001; };
  Player.prototype.loadFactor = function () { return U.clamp(this.cargoKg / this.capacity(), 0, 1); };

  Player.prototype.cargoValue = function () {
    let v = 0;
    for (const k in this.cargo) v += D.MAT[k].cr * this.cargo[k];
    return Math.round(v * this.g.valueMult());
  };

  Player.prototype.reset = function (x, y) {
    this.x = x; this.y = y;
    this.vx = this.vy = 0;
    this.o2 = this.stat('oxygen');
    this.hull = this.stat('hull');
    this.dead = false;
    this.invuln = 1.2;
    this.suffocating = 0;
  };

  /* ------------------------------------------------------------------ damage */
  Player.prototype.hurt = function (dmg, g, dir) {
    if (this.invuln > 0 || this.dead) return;
    this.hull -= dmg;
    this.invuln = 0.75;
    this.hurtT = 0.3;
    this.vx += (dir || 0) * 130;
    this.vy -= 40;
    FX.shake(5);
    FX.flash(0.35, '#ff5a4d');
    FX.hitStop(0.06);
    FX.burst(this.x, this.y, 10, ['#ff8ab0', '#ffffff', '#ff5a4d'], 130);
    FX.stars(this.x, this.y - 10, 5);                 // the universal OW
    FX.puff(this.x, this.y, 3, '#ff9a7a', 0.9);
    A.sfx.hurt();
    // anything that really connects knocks him off his feet
    if (dmg >= 11) this.ragdoll(g, U.clamp(dmg / 22, 0.6, 1.8), (dir || 1) * U.rand(8, 15));
    if (this.hull <= 0) { this.hull = 0; g.onPlayerDown(); }
  };

  Player.prototype.heal = function (n) { this.hull = Math.min(this.stat('hull'), this.hull + n); };

  /* ---------------------------------------------------------------- RAGDOLL
     He goes limp and tumbles. Out here there is nothing to catch him, so he
     bounces off the walls of his own tunnel until he runs out of spin, then
     gets up looking like he has been somewhere. Set off by a solid hit, by
     slamming into rock at speed, or by pressing R because it is funny. */
  Player.prototype.ragdoll = function (g, power, spin) {
    if (this.docked || this.dead) return;
    power = U.clamp(power === undefined ? 1 : power, 0.5, 2);
    this.rag = Math.max(this.rag || 0, 0.55 + power * 0.55);
    this.ragSpin = spin !== undefined ? spin : (Math.sign(this.vx || 1) * U.rand(7, 14));
    this.drilling = false;
    A.drill(false);
    if (this.rig) { this.rig.emote = null; this.rig.emoteT = 0; }
    FX.dust(this.x, this.y, 6, '#c9bce8', 40);
    A.sfx.tone(380, { type: 'square', to: 120, dur: 0.22, vol: 0.08 });
  };

  /* ------------------------------------------------------------------ update */
  Player.prototype.update = function (dt, g) {
    const IN = PD.input;
    const w = g.world;
    const frozen = g.cinematic;

    this.blink -= dt;
    if (this.blink < -0.2) this.blink = U.rand(2, 6);
    this.dashCool = Math.max(0, this.dashCool - dt);
    this.dashT = Math.max(0, this.dashT - dt);
    this.scanCool = Math.max(0, this.scanCool - dt);
    this.burnCool = Math.max(0, this.burnCool - dt);
    if (!frozen && !g.uiBlocking) {
      if (IN.hit('KeyQ') || IN.mouse.wheel) this.cycleWeapon(IN.mouse.wheel < 0 ? -1 : 1);
      if (IN.hit('Tab')) this.scan(g);
    }
    this.gunCool = Math.max(0, this.gunCool - dt);
    this.gunFlash = Math.max(0, this.gunFlash - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.squish = U.damp(this.squish, 0, 0.2, dt);

    /* LIMP. No steering, no drill, no jets -- just gravity, drag and a spin,
       and he bounces off anything he lands on. */
    if (this.rag > 0) {
      this.rag -= dt;
      this.ragAll = (this.ragAll || 0) + dt;
      this.ragAng = (this.ragAng || 0) + this.ragSpin * dt;
      this.vy += w.gravityAt(this.y) * dt * 1.15;
      this.vx *= Math.pow(0.988, dt * 60);
      this.vy *= Math.pow(0.995, dt * 60);
      const pvx = this.vx, pvy = this.vy;
      const h2 = PD.ent.moveBody(this, w, dt);
      if (h2.x) {
        this.vx = -pvx * 0.52; this.ragSpin = -this.ragSpin * 0.7;
        if (Math.abs(pvx) > 60) { FX.dust(this.x, this.y, 4, '#8e86a8', 30); A.sfx.tone(200, { type: 'square', to: 90, dur: 0.08, vol: 0.05 }); }
      }
      if (h2.ground) {
        if (pvy > 60) { this.vy = -pvy * 0.44; FX.dust(this.x, this.y + 5, 5, '#8e86a8', 34); A.sfx.tone(160, { type: 'triangle', to: 80, dur: 0.1, vol: 0.05 }); }
        else this.vy = 0;
        this.vx *= 0.86;
        this.ragSpin *= 0.72;
      }
      if (h2.ceil && pvy < 0) this.vy = -pvy * 0.4;
      this.thrusting.x = this.thrusting.y = 0;
      A.thrust(0);
      this.drilling = false;
      A.drill(false);
      if (U.chance(dt * 8)) FX.trail(this.x + U.rand(-4, 4), this.y + U.rand(-4, 4), '#c9bce8', 1.4);
      /* Up again once the spin is out of him, looking rough about it. The
         three-second cap is the important half: buried in rock, or wedged
         somewhere he cannot land, he would otherwise tumble for ever. */
      const settled = this.onGround(w) && Math.abs(this.vy) < 40;
      if (this.rag <= 0 && (settled || h2.stuck || this.ragAll > 3)) {
        this.rag = 0; this.ragAng = 0; this.ragAll = 0;
        if (this.rig) { this.rig.woozyT = 1.4; PD.rig.land(this.rig, 0.8); }
        FX.stars(this.x, this.y - 12, 6);
        FX.puff(this.x, this.y + 4, 5, '#c9bce8', 1.1);
      } else if (this.rag <= 0) this.rag = 0.06;      // still in the air: keep tumbling
      this.doAir(dt, g);
      return;
    }

    // aim always follows the cursor
    const dxm = IN.mouse.wx - this.x, dym = IN.mouse.wy - this.y;
    if (dxm * dxm + dym * dym > 9) this.aim = Math.atan2(dym, dxm);

    let ix = 0, iy = 0;
    if (!frozen) {
      /* The phone stick is ANALOGUE: a gentle lean is a gentle thrust, which
         is the whole difference between flying this thing on a phone and
         fighting it. Keys still work and still mean full tilt. */
      const ax = PD.touch.axis ? PD.touch.axis() : null;
      if (ax && ax.on) { ix = ax.x; iy = ax.y; }
      else {
        if (IN.down('left')) ix -= 1;
        if (IN.down('right')) ix += 1;
        if (IN.down('up')) iy -= 1;
        if (IN.down('down')) iy += 1;
      }
    }
    if (ix) this.facing = Math.sign(ix);
    else if (Math.abs(dxm) > 6) this.facing = Math.sign(dxm);

    if (!frozen) {
      let wantDash = IN.hit('shift');
      for (const k of ['left', 'right', 'up', 'down']) {
        if (IN.hit(k)) {
          if (this.lastTap.key === k && g.time - this.lastTap.t < 0.26) wantDash = true;
          this.lastTap = { key: k, t: g.time };
        }
      }
      if (wantDash) this.dash(ix, iy, g);
      if (IN.hit('KeyR')) this.ragdoll(g, 1, (this.facing || 1) * U.rand(9, 15));
    }

    const load = this.loadFactor();
    // the shark notices things before you do
    if (load > 0.5) PD.chum.call(g, 'sack');
    if (this.o2 < this.stat('oxygen') * 0.3) PD.chum.call(g, 'air');
    const thrust = this.stat('thruster') * (1 - load * 0.42);
    const grav = w.gravityAt(this.y);

    this.vx += ix * thrust * dt;
    this.vy += iy * thrust * dt;
    this.vy += grav * dt * (1 + load * 0.5);

    // drilling drags you into the rock, which feels like the bit biting in
    if (this.drilling) {
      this.vx += Math.cos(this.aim) * 150 * dt;
      this.vy += Math.sin(this.aim) * 150 * dt;
    }

    // a burst ignores friction and the speed cap while it lasts
    const dashing = this.dashT > 0;
    const drag = dashing ? 0.985 : (this.onGround(w) ? 0.82 : 0.94);
    this.vx *= Math.pow(drag, dt * 60);
    this.vy *= Math.pow(dashing ? 0.985 : 0.955, dt * 60);
    const maxSp = dashing ? 400 : 150 - load * 40;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > maxSp) { this.vx *= maxSp / sp; this.vy *= maxSp / sp; }

    this.thrusting.x = ix; this.thrusting.y = iy;
    if (!frozen) A.thrust((Math.abs(ix) + Math.abs(iy)) > 0 ? 0.7 : 0);

    // the wire to the pod: past its length it hauls you back, hard
    if (!this.docked && g.ship) {
      const L = this.stat('tether');
      const dx = this.x - g.ship.x, dy = this.y - (g.ship.y + 10);
      const d = Math.hypot(dx, dy);
      this.tetherFrac = d / L;
      if (d > L) {
        const over = d - L;
        const nx = dx / d, ny = dy / d;
        this.x -= nx * over; this.y -= ny * over;
        const vAlong = this.vx * nx + this.vy * ny;
        if (vAlong > 0) { this.vx -= nx * vAlong * 1.6; this.vy -= ny * vAlong * 1.6; }
        if (this.tetherSnap <= 0) { this.tetherSnap = 0.5; A.tone(180, { type: 'triangle', to: 90, dur: 0.14, vol: 0.1 }); FX.shake(1.2); g.hint('tether', ['belt', 'bang']); }
      }
      this.tetherSnap = Math.max(0, (this.tetherSnap || 0) - dt);
    }

    const before = { x: this.x, y: this.y };
    const pvx2 = this.vx, pvy2 = this.vy;
    const hit = PD.ent.moveBody(this, w, dt);
    if (hit.ground && before.y < this.y) this.squish = Math.min(1, Math.abs(this.vy) / 200 + this.squish);
    // slamming into rock at speed while dashing puts him on the floor
    if (dashing && (hit.x || hit.ground) && Math.hypot(pvx2, pvy2) > 300) {
      this.ragdoll(g, 1.2, Math.sign(pvx2 || 1) * U.rand(10, 16));
      FX.shake(4);
    }

    if (ix || iy) {
      // jetpack exhaust
      if (U.chance(dt * 34)) {
        FX.spawn({
          x: this.x - ix * 7 + U.rand(-2, 2), y: this.y - iy * 8 + 5 + U.rand(-2, 2),
          vx: -ix * U.rand(30, 80) + this.vx * 0.3, vy: -iy * U.rand(30, 80) + this.vy * 0.3 + 20,
          life: U.rand(0.16, 0.4), size: U.rand(1.5, 3),
          color: U.pick(['#ffd34d', '#ff9b3d', '#fff3c0']), grav: -0.1, drag: 0.86, glow: 1
        });
      }
    }

    if (!frozen) {
      this.doDrill(dt, g);
      this.doGun(dt, g);
      this.doAir(dt, g);
      this.doRecall(dt, g);
    } else {
      this.drilling = false;
      A.drill(false);
      A.thrust(0);
    }
  };

  /* Burst jets: a short invulnerable lunge. Direction from the keys, or the
     aim if you are not steering. */
  Player.prototype.dash = function (ix, iy, g) {
    if (this.dashCool > 0 || this.docked) return;
    let dx = ix, dy = iy;
    if (!dx && !dy) { dx = Math.cos(this.aim); dy = Math.sin(this.aim); }
    const n = Math.hypot(dx, dy) || 1;
    this.vx = dx / n * 330;
    this.vy = dy / n * 330;
    this.dashCool = this.stat('dash');
    this.dashT = 0.26;
    this.invuln = Math.max(this.invuln, 0.3);
    A.sfx.tone(300, { type: 'sawtooth', to: 1200, dur: 0.16, vol: 0.12 });
    A.sfx.noise({ from: 900, to: 3000, dur: 0.14, vol: 0.1 });
    FX.ring(this.x, this.y, 3, 22, 0.3, '#7ef9ff', 2);
    for (let i = 0; i < 8; i++) FX.trail(this.x - dx / n * i * 3, this.y - dy / n * i * 3, '#7ef9ff', 2);
    FX.shake(1.5);
  };

  /* Sonar ping: paints nearby ore on to the minimap. */
  Player.prototype.scan = function (g) {
    if (this.scanCool > 0 || this.docked) { A.sfx.deny(); return; }
    this.scanCool = 4;
    g.scan(this.x, this.y, this.stat('scanner'));
  };

  Player.prototype.onGround = function (w) {
    return w.rectSolid(this.x - this.w / 2, this.y + this.h / 2, this.w, 2);
  };

  /* ------------------------------------------------------------------- drill */
  Player.prototype.drillTip = function () {
    const r = this.stat('reach');
    return { x: this.x + Math.cos(this.aim) * r, y: this.y + Math.sin(this.aim) * r };
  };

  /* The bit has real length, so bite the first solid tile anywhere along it.
     Without this the drill goes dead every time a tile pops and the player
     has to drift the last few pixels to the next one. */
  Player.prototype.findBite = function (w) {
    const reach = this.stat('reach') + PD.world.TILE * 1.2;
    const cos = Math.cos(this.aim), sin = Math.sin(this.aim);
    let lastCx = -1, lastCy = -1;
    for (let d = 5; d <= reach; d += 2.5) {
      const x = this.x + cos * d, y = this.y + sin * d;
      const cx = Math.floor(x / PD.world.TILE), cy = Math.floor(y / PD.world.TILE);
      if (cx === lastCx && cy === lastCy) continue;
      lastCx = cx; lastCy = cy;
      const mat = w.at(cx, cy);
      if (mat) return { cx, cy, mat, x, y, dist: d };
    }
    return null;
  };

  Player.prototype.doDrill = function (dt, g) {
    const IN = PD.input;
    const want = IN.mouse.left && !g.uiBlocking;
    this.drillSpin += dt * (want ? 26 : 4);
    const w = g.world;

    if (!want) {
      this.drilling = false; this.drillT = 0;
      A.drill(false);
      return;
    }

    const bite = this.findBite(w);
    this.drilling = !!bite;
    if (!bite) { this.drillT = 0; A.drill(false); return; }
    // the drill is heavy: it drags him to a crawl and rattles the camera
    this.drillT += dt;
    this.vx *= 1 - Math.min(1, dt * 4);
    this.vy *= 1 - Math.min(1, dt * 2.5);
    if (this.drillT > 0.05) FX.shake(0.7);

    // the spinning bit chews anything standing in it
    for (const m of g.mobs) {
      if (m.dead) continue;
      if (Math.hypot(m.x - bite.x, m.y - bite.y) < 14 + m.w / 2 && U.chance(dt * 6)) m.hurtBy(this.stat('drill') * 0.12, g, Math.sign(m.x - this.x), 'drill');
    }
    const power = this.stat('drill') * dt;
    const hardness = U.clamp(D.MAT[bite.mat].hp / 255, 0, 1);
    this.drillPitch = 1 - hardness;
    A.drill(true, this.drillPitch);

    const broke = w.damage(bite.cx, bite.cy, power);
    if (broke) {
      g.onTileBroken(bite.cx, bite.cy, broke, true);
      // the bite lands in his shoulders: the whole rig kicks back off it
      PD.rig.hit(this.rig, U.clamp(D.MAT[broke].hp / 160, 0.5, 1.4));
    }

    // The bore is always wider than the bit: a one-tile shaft is narrower
    // than the player, so a single-tile tunnel would wedge you in place.
    const px = Math.round(-Math.sin(this.aim)), py = Math.round(Math.cos(this.aim));
    const side = this.g.save.upg.reach >= 5 ? 2 : 1;
    for (let k = 1; k <= side; k++) {
      const falloff = power * (k === 1 ? 0.7 : 0.4);
      const b2 = w.damage(bite.cx + px * k, bite.cy + py * k, falloff);
      if (b2) g.onTileBroken(bite.cx + px * k, bite.cy + py * k, b2, true);
      const b3 = w.damage(bite.cx - px * k, bite.cy - py * k, falloff);
      if (b3) g.onTileBroken(bite.cx - px * k, bite.cy - py * k, b3, true);
    }

    if (U.chance(dt * 55)) FX.sparks(bite.x, bite.y, this.aim, D.MAT[bite.mat], 3);
    FX.shake(0.55);
  };

  /* --------------------------------------------------------------------- gun */
  /* One button. You aim the drill; the gun finds its own targets and fires
     itself at anything in range. Right mouse still fires manually. */
  Player.prototype.doGun = function (dt, g) {
    const IN = PD.input;
    let target = null, best = 118;
    for (const m of g.mobs) {
      if (m.dead || m.submerged) continue;
      const d = Math.hypot(m.x - this.x, m.y - this.y);
      if (d < best) { best = d; target = m; }
    }
    const manual = (IN.mouse.right || IN.down('space')) && !g.uiBlocking;
    const want = manual || (target && !g.uiBlocking && (this.drilling || this.weapon === 'pistol' || true));
    if (!want || this.gunCool > 0) return;
    const a0 = manual || !target ? this.aim : Math.atan2(target.y - this.y, target.x - this.x);
    this.gunAim = a0;
    const ox = Math.cos(a0) * 12, oy = Math.sin(a0) * 12;

    if (this.weapon === 'scatter') {
      this.gunCool = 0.72;
      this.gunFlash = 0.1;
      const dmg = this.stat('scatter');
      for (let i = 0; i < 5; i++) {
        const a = a0 + (i - 2) * 0.13 + U.rand(-0.04, 0.04);
        const sp = 300 + U.rand(-30, 30);
        g.bullets.push(new Bullet(this.x + ox, this.y + oy, Math.cos(a) * sp, Math.sin(a) * sp, dmg, true, '#ffb03d', { life: 0.34 }));
      }
      this.vx -= Math.cos(a0) * 110;
      this.vy -= Math.sin(a0) * 110;
      FX.burst(this.x + ox, this.y + oy, 9, ['#ffb03d', '#ffffff', '#ff7a2a'], 110, true);
      FX.shake(3.2);
      A.sfx.boom(0.35);
      A.sfx.shoot();
    } else if (this.weapon === 'lance') {
      this.gunCool = 1.05;
      this.gunFlash = 0.14;
      const dmg = this.stat('lance');
      g.bullets.push(new PD.ent.Beam(this.x + ox, this.y + oy, a0, 190, dmg, g));
      this.vx -= Math.cos(a0) * 60;
      this.vy -= Math.sin(a0) * 60;
      FX.shake(2.6);
      FX.hitStop(0.03);
      A.sfx.tone(1800, { type: 'sawtooth', to: 200, dur: 0.26, vol: 0.14, filter: 5000 });
      A.sfx.noise({ from: 6000, to: 400, dur: 0.2, vol: 0.1 });
    } else {
      this.gunCool = this.stat('trigger');
      this.gunFlash = 0.09;
      const dmg = this.stat('pistol');
      const a = a0 + U.rand(-0.035, 0.035);
      g.bullets.push(new Bullet(this.x + ox, this.y + oy, Math.cos(a) * 330, Math.sin(a) * 330, dmg, true));
      this.vx -= Math.cos(a) * 28;
      this.vy -= Math.sin(a) * 28;
      FX.burst(this.x + ox, this.y + oy, 4, ['#7ef9ff', '#ffffff'], 70, true);
      FX.shake(1.1);
      A.sfx.shoot();
    }
  };

  /* --------------------------------------------------------------------- air */
  Player.prototype.doAir = function (dt, g) {
    // the lamp reveals the map as you go
    g.world.reveal(this.x, this.y, this.stat('lamp') * 0.9);

    // magma burns; uranium in the hold cooks you slowly
    const hz = g.world.hazardIn(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    if (hz && !this.docked) {
      this.hull -= hz * dt;
      this.vy -= 90 * dt;
      if (this.burnCool <= 0) {
        this.burnCool = 0.4;
        FX.burst(this.x, this.y + 6, 6, ['#ff7a2a', '#ffd27a'], 60, true);
        A.sfx.tone(200, { type: 'sawtooth', to: 120, dur: 0.12, vol: 0.09 });
        FX.flash(0.15, '#ff5a2a');
        g.hint('lava', 'MAGMA! GET OUT OF IT');
      }
      if (this.hull <= 0) { this.hull = 0; g.onPlayerDown(); return; }
    }
    const uran = this.cargo[D.M.uran] || 0;
    if (uran > 0 && !this.docked) {
      this.hull -= 0.35 * uran * dt;
      if (U.chance(dt * 3)) FX.trail(this.x + U.rand(-5, 5), this.y + U.rand(-6, 6), '#a6ff3d', 1.4);
      g.hint('uran', 'URANIUM IN THE HOLD IS COOKING YOU. SELL IT FAST.');
      if (this.hull <= 0) { this.hull = 0; g.onPlayerDown(); return; }
    }

    if (this.docked) {
      this.o2 = Math.min(this.stat('oxygen'), this.o2 + 90 * dt);
      this.suffocating = 0;
      return;
    }
    const depth = U.clamp(g.world.depthMeters(this.y) / Math.max(20, g.world.maxDepthMeters()), 0, 1);
    let drain = 1.0 + depth * 0.9 + this.loadFactor() * 0.5;
    if (this.drilling) drain += 0.9;
    this.o2 -= drain * dt;

    if (this.o2 <= 0) {
      this.o2 = 0;
      this.suffocating += dt;
      this.hull -= 7 * dt;
      this.alarmT -= dt;
      if (this.alarmT <= 0) { A.sfx.alarm(); this.alarmT = 0.7; }
      FX.flash(0.06, '#3a0d1a');
      if (this.hull <= 0) { this.hull = 0; g.onPlayerDown(); }
    } else if (this.o2 < this.stat('oxygen') * 0.25) {
      this.alarmT -= dt;
      if (this.alarmT <= 0) { A.sfx.alarm(); this.alarmT = 1.4; }
    }
  };

  /* ------------------------------------------------------------------ recall
     Hold R for an emergency tractor-beam yank home; the ship charges for it. */
  Player.prototype.doRecall = function (dt, g) {
    if (PD.input.down('KeyR') && !this.docked) {
      this.recall += dt;
      if (this.recall > 0.06) {
        FX.trail(this.x + U.rand(-10, 10), this.y + U.rand(-12, 12), '#7ef9ff', 2);
      }
      if (this.recall >= 1.4) {
        this.recall = 0;
        g.emergencyRecall();
      }
    } else this.recall = Math.max(0, this.recall - dt * 2.4);
  };

  /* ------------------------------------------------------------------- cargo */
  Player.prototype.addOre = function (mat) {
    const m = D.MAT[mat];
    if (this.cargoKg + m.kg > this.capacity() + 0.0001) return false;
    this.cargo[mat] = (this.cargo[mat] || 0) + 1;
    this.cargoKg += m.kg;
    return true;
  };

  Player.prototype.clearCargo = function () { this.cargo = {}; this.cargoKg = 0; };

  /* ----------------------------------------------------------------- drawing */
  Player.prototype.draw = function (ctx, cam, t) {
    const skin = PD.art.skinFor(this.g.save.cos);
    const B = PD.art.BIZ;
    const moving = Math.hypot(this.vx, this.vy) > 20 || this.thrusting.x || this.thrusting.y;
    const drilling = this.drilling && this.drillT > 0.05;
    const ground = this.onGround(this.g.world);
    if (!this.rig) this.rig = PD.rig.make();
    const r = this.rig;
    // no idle flourishes out here: both hands are on the tool
    PD.rig.step(r, { dt: this.g.dt, vx: this.vx, vy: this.vy, ground, drilling, noEmote: true });
    if (ground && !this.wasGround && this.lastVy > 120) {
      PD.rig.land(r, U.clamp(this.lastVy / 320, 0.4, 1));
      FX.puff(this.x, this.y + 5, 4, '#c9bce8', U.clamp(this.lastVy / 260, 0.6, 1.4));
    }
    this.wasGround = ground;
    this.lastVy = this.vy;

    const drill = skin.drill;
    const gun = PD.art.sprites[this.weapon === 'pistol' ? 'gun' : this.weapon];
    const flip = Math.cos(this.aim) < 0;
    // the drill is heavy: it shakes him, kicks him back, and the camera feels it
    const kick = drilling ? 1.6 : 0;
    const jx = drilling ? Math.round(Math.sin(t * 90) * 1) : 0;
    const jy = drilling ? Math.round(Math.cos(t * 70) * 1) : 0;
    const px = this.x - cam.x - Math.cos(this.aim) * kick + jx, py = this.y - cam.y - Math.sin(this.aim) * kick * 0.5 + jy;

    // the body he is wearing this frame: bare torso, and the limbs live
    const spr = drilling ? skin.alienCoreDrill : skin.alienCore;
    this.anim += 1 / 60 * (moving ? 8 : 3);
    let frame;
    if (drilling) frame = this.hurtT > 0 ? 3 : Math.floor(t * 30) % 3;
    else frame = PD.rig.faceOf(r, t, this.blink < 0);

    // where the tool sits in his hands
    const hx = px + Math.cos(this.aim) * (drilling ? 11 : 8), hy = py + Math.sin(this.aim) * (drilling ? 11 : 8) + 1;
    // squash and stretch off the vertical: falling stretches him, landing squashes
    const airsq = ground ? 1 : U.clamp(1 + this.vy * 0.0007, 0.86, 1.13);
    const drawTool = (c) => {
      c.save();
      c.translate(hx | 0, hy | 0);
      c.rotate(this.aim);
      if (flip) c.scale(1, -1);
      if (drilling) c.translate(U.rand(-1.5, 1.5), U.rand(-1, 1));
      const df = drill.frames[Math.floor(this.drillSpin) % drill.frames.length];
      c.drawImage(df, -drill.ox, -drill.oy, drill.w, drill.h);
      c.restore();
    };
    const limp = this.rag > 0;
    if (limp) r.ragdoll = 1; else r.ragdoll = 0;
    const body = {
      x: px, y: py - 1, flip, spr, frame, drilling: drilling && !limp, twoHand: drilling && !limp,
      grip: limp ? null : { x: hx, y: hy }, aim: this.aim, ground, vx: this.vx, vy: this.vy,
      squash: limp ? 1 : airsq, tint: this.hurtT > 0.15,
      ragdoll: limp, ang: limp ? this.ragAng : 0,
      tool: limp ? null : drawTool
    };

    if (this.dashT > 0) {
      ctx.globalAlpha = 0.3;
      for (let k = 3; k >= 1; k--) {
        const gx = px - this.vx * k * 0.012, gy = py - this.vy * k * 0.012 - 1;
        PD.rig.draw(ctx, r, Object.assign({}, body, { x: gx, y: gy, tint: true }), skin.P, B);
      }
      ctx.globalAlpha = 1;
    } else if (this.invuln > 0 && Math.sin(this.invuln * 40) < -0.2) return;

    // holstered pistol on the far side when the drill is out
    if (!drilling) {
      ctx.save();
      ctx.translate(px | 0, py | 0);
      const ga = this.gunAim === undefined ? this.aim : this.gunAim;
      ctx.rotate(ga + (flip ? Math.PI : 0));
      ctx.scale(1, flip ? -1 : 1);
      const gf = gun.frames[this.gunCool > 0.05 ? 1 : 0];
      ctx.drawImage(gf, -2, -10);
      ctx.restore();
    }

    // the body, the tool in its grip and the hands over it, in one pass
    PD.rig.draw(ctx, r, body, skin.P, B);

    if (drilling) {
      // hot sparks and grit off the bit
      if (U.chance(0.45)) {
        const tx = hx + Math.cos(this.aim) * 24, ty = hy + Math.sin(this.aim) * 24;
        FX.spawn({ x: tx + cam.x, y: ty + cam.y, vx: -Math.cos(this.aim) * U.rand(30, 90) + U.rand(-40, 40), vy: -Math.sin(this.aim) * U.rand(30, 90) + U.rand(-60, 10),
          life: U.rand(0.15, 0.4), size: 1, color: U.chance(0.5) ? '#fff2b0' : '#ff9b3d', grav: 260, drag: 1 });
      }
    }

    if (this.gunFlash > 0) {
      const a = this.gunAim === undefined ? this.aim : this.gunAim;
      ctx.fillStyle = '#eafcff';
      ctx.globalAlpha = this.gunFlash / 0.09;
      const fx = px + Math.cos(a) * 15, fy = py + Math.sin(a) * 15;
      ctx.fillRect(fx - 3, fy - 3, 6, 6);
      ctx.globalAlpha = 1;
    }

    if (this.recall > 0.1) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 22);
      PD.pxd.ring(ctx, px, py, 8 + (1 - this.recall / 1.4) * 20, '#7ef9ff', 1);
      ctx.globalAlpha = 1;
    }
  };


  PD.Player = Player;
})(window.PD);
