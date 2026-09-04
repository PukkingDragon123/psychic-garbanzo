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
    this.drilling = false;
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
  }

  Player.prototype.stat = function (id) {
    const u = D.UPG[id];
    return u.value(this.g.save.upg[id] || 0);
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
    A.sfx.hurt();
    if (this.hull <= 0) { this.hull = 0; g.onPlayerDown(); }
  };

  Player.prototype.heal = function (n) { this.hull = Math.min(this.stat('hull'), this.hull + n); };

  /* ------------------------------------------------------------------ update */
  Player.prototype.update = function (dt, g) {
    const IN = PD.input;
    const w = g.world;
    const frozen = g.cinematic;

    this.blink -= dt;
    if (this.blink < -0.2) this.blink = U.rand(2, 6);
    this.gunCool = Math.max(0, this.gunCool - dt);
    this.gunFlash = Math.max(0, this.gunFlash - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.squish = U.damp(this.squish, 0, 0.2, dt);

    // aim always follows the cursor
    const dxm = IN.mouse.wx - this.x, dym = IN.mouse.wy - this.y;
    if (dxm * dxm + dym * dym > 9) this.aim = Math.atan2(dym, dxm);

    let ix = 0, iy = 0;
    if (!frozen) {
      if (IN.down('left')) ix -= 1;
      if (IN.down('right')) ix += 1;
      if (IN.down('up')) iy -= 1;
      if (IN.down('down')) iy += 1;
    }
    if (ix) this.facing = ix;
    else if (Math.abs(dxm) > 6) this.facing = Math.sign(dxm);

    const load = this.loadFactor();
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

    const drag = this.onGround(w) ? 0.82 : 0.94;
    this.vx *= Math.pow(drag, dt * 60);
    this.vy *= Math.pow(0.955, dt * 60);
    const maxSp = 150 - load * 40;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > maxSp) { this.vx *= maxSp / sp; this.vy *= maxSp / sp; }

    this.thrusting.x = ix; this.thrusting.y = iy;
    if (!frozen) A.thrust((Math.abs(ix) + Math.abs(iy)) > 0 ? 0.7 : 0);

    const before = { x: this.x, y: this.y };
    const hit = PD.ent.moveBody(this, w, dt);
    if (hit.ground && before.y < this.y) this.squish = Math.min(1, Math.abs(this.vy) / 200 + this.squish);

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
      this.drilling = false;
      A.drill(false);
      return;
    }

    const bite = this.findBite(w);
    this.drilling = !!bite;
    if (!bite) { A.drill(false); return; }

    const power = this.stat('drill') * dt;
    const hardness = U.clamp(D.MAT[bite.mat].hp / 255, 0, 1);
    this.drillPitch = 1 - hardness;
    A.drill(true, this.drillPitch);

    const broke = w.damage(bite.cx, bite.cy, power);
    if (broke) g.onTileBroken(bite.cx, bite.cy, broke, true);

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
  Player.prototype.doGun = function (dt, g) {
    const IN = PD.input;
    const want = (IN.mouse.right || IN.down('space')) && !g.uiBlocking;
    if (!want || this.gunCool > 0) return;
    this.gunCool = this.stat('trigger');
    this.gunFlash = 0.09;
    const dmg = this.stat('pistol');
    const a = this.aim + U.rand(-0.035, 0.035);
    const ox = Math.cos(a) * 12, oy = Math.sin(a) * 12;
    g.bullets.push(new Bullet(this.x + ox, this.y + oy, Math.cos(a) * 330, Math.sin(a) * 330, dmg, true));
    this.vx -= Math.cos(a) * 28;
    this.vy -= Math.sin(a) * 28;
    FX.burst(this.x + ox, this.y + oy, 4, ['#7ef9ff', '#ffffff'], 70, true);
    FX.shake(1.1);
    A.sfx.shoot();
  };

  /* --------------------------------------------------------------------- air */
  Player.prototype.doAir = function (dt, g) {
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
    const spr = skin.alien;
    const drill = skin.drill;
    const gun = PD.art.sprites.gun;
    const px = this.x - cam.x, py = this.y - cam.y;
    const flip = Math.cos(this.aim) < 0;

    if (this.invuln > 0 && Math.sin(this.invuln * 40) < -0.2) return;

    // pistol on the far side, drill on the aiming side
    ctx.save();
    ctx.translate(px | 0, py | 0);
    ctx.rotate(this.aim + (flip ? Math.PI : 0));
    ctx.scale(1, flip ? -1 : 1);
    const g = gun.frames[this.gunCool < this.stat('trigger') * 0.4 ? 0 : 1];
    ctx.drawImage(g, -2, -10);
    ctx.restore();

    ctx.save();
    ctx.translate(px | 0, py | 0);
    ctx.rotate(this.aim);
    if (this.drilling) ctx.translate(U.rand(-1, 1), U.rand(-1, 1));
    const df = drill.frames[Math.floor(this.drillSpin) % drill.frames.length];
    ctx.drawImage(df, -drill.ox, -drill.oy);
    ctx.restore();

    const frame = this.blink < 0 ? 2 : (this.squish > 0.25 ? 1 : 0);
    PD.ent.drawSprite(ctx, spr, frame, px, py - 1, flip, this.hurtT > 0.15);

    if (this.gunFlash > 0) {
      const a = this.aim;
      ctx.fillStyle = '#eafcff';
      ctx.globalAlpha = this.gunFlash / 0.09;
      const fx = px + Math.cos(a) * 15, fy = py + Math.sin(a) * 15;
      ctx.fillRect(fx - 3, fy - 3, 6, 6);
      ctx.globalAlpha = 1;
    }

    if (this.recall > 0.1) {
      ctx.strokeStyle = '#7ef9ff';
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px | 0, py | 0, 8 + (1 - this.recall / 1.4) * 20, 0, U.TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  PD.Player = Player;
})(window.PD);
