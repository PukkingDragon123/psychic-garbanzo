/* Mobs, bullets, loose ore and falling boulders. Each entity exposes
   update(dt, g) / draw(ctx, cam, t) where `g` is the running game. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const D = PD.data;
  const FX = PD.fx;
  const TILE = PD.world.TILE;

  /* Cache a solid-white copy of each sprite frame for hit flashes. */
  const whiteCache = new Map();
  function flashOf(cv) {
    if (whiteCache.has(cv)) return whiteCache.get(cv);
    const c = document.createElement('canvas');
    c.width = cv.width; c.height = cv.height;
    const x = c.getContext('2d');
    x.drawImage(cv, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    whiteCache.set(cv, c);
    return c;
  }

  function drawSprite(ctx, spr, frame, x, y, flip, tint) {
    const cv = spr.frames[frame % spr.frames.length];
    const src = tint ? flashOf(cv) : cv;
    ctx.save();
    ctx.translate(x | 0, y | 0);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(src, -spr.ox | 0, -spr.oy | 0);
    ctx.restore();
  }

  /* Axis-separated tile collision. Returns which sides were blocked. */
  function moveBody(e, world, dt) {
    const hit = { x: 0, y: 0, ground: false, ceil: false };

    // Already buried (cave-in, teleport, spawned inside rock)? Move freely so
    // the body can work its way out instead of vibrating in place forever.
    if (world.rectSolid(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
      // a slow ooze, deliberately too weak to use as a shortcut through rock
      const sp = Math.hypot(e.vx, e.vy);
      const k = sp > 45 ? 45 / sp : 1;
      e.x += e.vx * k * 0.35 * dt;
      e.y += e.vy * k * 0.35 * dt;
      e.x = U.clamp(e.x, 4, world.pxW - 4);
      e.y = U.clamp(e.y, 4, world.pxH - 4);
      hit.stuck = true;
      return hit;
    }

    let nx = e.x + e.vx * dt;
    if (world.rectSolid(nx - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
      hit.x = Math.sign(e.vx) || 1;
      e.vx = 0;
    } else e.x = nx;

    let ny = e.y + e.vy * dt;
    if (world.rectSolid(e.x - e.w / 2, ny - e.h / 2, e.w, e.h)) {
      if (e.vy > 0) { hit.ground = true; } else { hit.ceil = true; }
      hit.y = Math.sign(e.vy) || 1;
      e.vy = 0;
    } else e.y = ny;

    e.x = U.clamp(e.x, 4, world.pxW - 4);
    e.y = U.clamp(e.y, 4, world.pxH - 4);
    return hit;
  }

  function lineClear(world, x0, y0, x1, y1) {
    const d = U.dist(x0, y0, x1, y1);
    const steps = Math.ceil(d / (TILE * 0.6));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (world.solidAt(U.lerp(x0, x1, t), U.lerp(y0, y1, t))) return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------- bullet */
  function Bullet(x, y, vx, vy, dmg, friendly, color) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dmg = dmg; this.friendly = friendly;
    this.color = color || (friendly ? '#7ef9ff' : '#ff8ab0');
    this.life = 1.5; this.dead = false;
    this.w = 3; this.h = 3;
  }
  Bullet.prototype.update = function (dt, g) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const steps = 3;
    for (let s = 0; s < steps; s++) {
      this.x += this.vx * dt / steps;
      this.y += this.vy * dt / steps;
      if (g.world.solidAt(this.x, this.y)) {
        // friendly fire chips the rock a little -- satisfying, not a mining tool
        if (this.friendly) {
          const cx = Math.floor(this.x / TILE), cy = Math.floor(this.y / TILE);
          const mat = g.world.damage(cx, cy, this.dmg * 0.5);
          if (mat) g.onTileBroken(cx, cy, mat, false);
        }
        FX.sparks(this.x, this.y, Math.atan2(this.vy, this.vx), D.MAT[2], 3);
        this.dead = true;
        return;
      }
      if (this.friendly) {
        for (const m of g.mobs) {
          if (m.dead) continue;
          if (Math.abs(this.x - m.x) < m.w / 2 + 2 && Math.abs(this.y - m.y) < m.h / 2 + 2) {
            m.hurtBy(this.dmg, g, Math.sign(this.vx));
            this.dead = true;
            return;
          }
        }
      } else {
        const p = g.player;
        if (!p.dead && Math.abs(this.x - p.x) < p.w / 2 + 2 && Math.abs(this.y - p.y) < p.h / 2 + 2) {
          p.hurt(this.dmg, g);
          this.dead = true;
          return;
        }
      }
    }
    if (U.chance(dt * 40)) FX.trail(this.x, this.y, this.color, 1.4);
  };
  Bullet.prototype.draw = function (ctx, cam) {
    const x = this.x - cam.x | 0, y = this.y - cam.y | 0;
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x - 2, y - 2, 5, 5);
    ctx.globalAlpha = 1;
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, 1, 1);
  };

  /* --------------------------------------------------------------------- mob */
  const SPRITE_FOR = {
    crawler: 'grub', floater: 'jelly', spitter: 'spit',
    gnasher: 'gnasher', lurker: 'lurker', guardian: 'warden'
  };

  function Mob(type, x, y, scale) {
    const def = D.ENEMY[type];
    this.type = type;
    this.def = def;
    this.spr = PD.art.sprites[SPRITE_FOR[type]];
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.w = def.w; this.h = def.h;
    this.maxHp = Math.round(def.hp * (scale || 1));
    this.hp = this.maxHp;
    this.dmg = def.dmg * (0.7 + (scale || 1) * 0.3);
    this.facing = U.chance(0.5) ? -1 : 1;
    this.hurtT = 0;
    this.cool = U.rand(0.4, 2.2);
    this.dead = false;
    this.anim = U.rand(0, 4);
    this.state = 'idle';
    this.stateT = 0;
    this.touchCool = 0;
    this.bob = U.rand(0, U.TAU);
  }

  Mob.prototype.hurtBy = function (dmg, g, dir) {
    this.hp -= dmg;
    this.hurtT = 0.14;
    this.vx += (dir || 0) * 60;
    FX.text(this.x, this.y - this.h / 2 - 4, String(Math.round(dmg)), '#fff3a0', 0);
    FX.burst(this.x, this.y, 5, ['#ffffff', '#ffd0e0', this.def.kind === 'boss' ? '#ffb060' : '#c8ff8a'], 90);
    FX.shake(1.6);
    if (this.hp <= 0) {
      this.dead = true;
      g.onMobKilled(this);
    } else {
      PD.audio.sfx.hitMob();
    }
  };

  Mob.prototype.shoot = function (g, spread) {
    const p = g.player;
    const a = Math.atan2(p.y - this.y, p.x - this.x) + (spread || 0);
    const sp = 105;
    g.bullets.push(new Bullet(this.x + Math.cos(a) * 8, this.y + Math.sin(a) * 8,
      Math.cos(a) * sp, Math.sin(a) * sp, this.dmg, false, '#b6ff8a'));
    PD.audio.sfx.tone(320, { type: 'sawtooth', to: 140, dur: 0.14, vol: 0.09 });
  };

  Mob.prototype.update = function (dt, g) {
    const p = g.player;
    const w = g.world;
    this.anim += dt * 6;
    this.stateT += dt;
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.cool -= dt;
    this.touchCool = Math.max(0, this.touchCool - dt);
    const toP = U.dist(this.x, this.y, p.x, p.y);
    const kind = this.def.kind;
    const sees = toP < 190 && !p.dead && lineClear(w, this.x, this.y, p.x, p.y);

    if (kind === 'crawl' || kind === 'charge') {
      this.vy += w.gravityAt(this.y) * 2.4 * dt;
      if (kind === 'charge' && sees && this.state !== 'dash' && this.cool <= 0) {
        this.state = 'dash'; this.stateT = 0; this.cool = U.rand(1.6, 2.6);
        this.facing = Math.sign(p.x - this.x) || 1;
        this.vy = -70;
        PD.audio.sfx.tone(180, { type: 'square', to: 420, dur: 0.18, vol: 0.1 });
      }
      if (this.state === 'dash') {
        this.vx = this.facing * this.def.speed * 3.4;
        if (this.stateT > 0.55) this.state = 'idle';
      } else if (sees) {
        this.facing = Math.sign(p.x - this.x) || this.facing;
        this.vx = this.facing * this.def.speed;
        if (p.y < this.y - 12 && U.chance(dt * 1.4)) this.vy = -110;
      } else {
        this.vx = this.facing * this.def.speed * 0.45;
      }
      const hit = moveBody(this, w, dt);
      if (hit.x) this.facing = -this.facing;
      if (hit.ground) this.vy = 0;
      // shuffle up small ledges
      if (hit.x && !w.rectSolid(this.x - this.w / 2, this.y - this.h / 2 - TILE, this.w, this.h)) this.vy = -95;
    } else if (kind === 'float') {
      const targetX = sees ? p.x : this.x + Math.cos(this.bob + this.anim * 0.3) * 40;
      const targetY = sees ? p.y : this.y + Math.sin(this.bob + this.anim * 0.4) * 30;
      this.vx = U.damp(this.vx, Math.sign(targetX - this.x) * this.def.speed * (sees ? 2.2 : 1), 0.05, dt);
      this.vy = U.damp(this.vy, Math.sign(targetY - this.y) * this.def.speed * (sees ? 2.2 : 1), 0.05, dt);
      const hit = moveBody(this, w, dt);
      if (hit.x) this.vx *= -1;
      if (hit.y) this.vy *= -1;
      if (U.chance(dt * 5)) FX.trail(this.x, this.y + this.h / 2, '#8f6ad8', 1.6);
    } else if (kind === 'spit') {
      this.vy += w.gravityAt(this.y) * 1.6 * dt;
      if (sees) {
        this.facing = Math.sign(p.x - this.x) || this.facing;
        this.vx = U.damp(this.vx, Math.sign(p.x - this.x) * this.def.speed * 0.6, 0.04, dt);
        if (this.cool <= 0) {
          this.shoot(g, 0);
          if (this.type === 'lurker') { this.shoot(g, 0.28); this.shoot(g, -0.28); }
          this.cool = this.type === 'lurker' ? 1.5 : 2.1;
        }
      } else this.vx *= 0.9;
      moveBody(this, w, dt);
    } else if (kind === 'boss') {
      // hovers around the core chamber and punishes anyone who gets close
      const c = w.coreCenter;
      const orbit = this.stateT * 0.7 + this.bob;
      const tx = c.x + Math.cos(orbit) * (w.chamberR * 0.6);
      const ty = c.y + Math.sin(orbit) * (w.chamberR * 0.45);
      const goX = sees && toP < 150 ? p.x : tx;
      const goY = sees && toP < 150 ? p.y : ty;
      this.vx = U.damp(this.vx, U.clamp((goX - this.x) * 2.2, -90, 90), 0.06, dt);
      this.vy = U.damp(this.vy, U.clamp((goY - this.y) * 2.2, -90, 90), 0.06, dt);
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.facing = this.vx < 0 ? -1 : 1;
      if (this.cool <= 0 && sees) {
        for (let i = -2; i <= 2; i++) this.shoot(g, i * 0.24);
        this.cool = 2.2;
        FX.shake(3);
      }
    }

    // contact damage
    if (!p.dead && this.touchCool <= 0 &&
        Math.abs(this.x - p.x) < (this.w + p.w) / 2 && Math.abs(this.y - p.y) < (this.h + p.h) / 2) {
      p.hurt(this.dmg, g, Math.sign(p.x - this.x));
      this.touchCool = 0.7;
      this.vx = -Math.sign(p.x - this.x) * 90;
    }
  };

  Mob.prototype.draw = function (ctx, cam) {
    const frame = Math.floor(this.anim) % this.spr.frames.length;
    drawSprite(ctx, this.spr, frame, this.x - cam.x, this.y - cam.y, this.facing < 0, this.hurtT > 0);
    if (this.hp < this.maxHp && !this.dead) {
      const w = Math.max(10, this.w);
      const x = (this.x - cam.x - w / 2) | 0, y = (this.y - cam.y - this.h / 2 - 6) | 0;
      ctx.fillStyle = 'rgba(10,6,20,0.7)';
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = this.def.kind === 'boss' ? '#ff9b3d' : '#ff5a4d';
      ctx.fillRect(x, y, Math.max(1, (w * this.hp / this.maxHp) | 0), 3);
    }
  };

  /* ------------------------------------------------------------------ pickup */
  function Pickup(x, y, mat, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx === undefined ? U.rand(-30, 30) : vx;
    this.vy = vy === undefined ? U.rand(-70, -20) : vy;
    this.mat = mat;
    this.spr = PD.art.gemFor(mat);
    this.life = 26;
    this.dead = false;
    this.bob = U.rand(0, U.TAU);
    this.w = 6; this.h = 6;
    this.rest = 0;
  }
  Pickup.prototype.update = function (dt, g) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const p = g.player;
    const d = U.dist(this.x, this.y, p.x, p.y);
    const pull = p.stat('magnet');

    if (d < pull && !p.cargoFull()) {
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      const force = 900 * (1 - d / pull) + 160;
      this.vx = U.damp(this.vx, Math.cos(a) * force, 0.22, dt);
      this.vy = U.damp(this.vy, Math.sin(a) * force, 0.22, dt);
      this.rest = 0;
      if (U.chance(dt * 10)) FX.trail(this.x, this.y, D.MAT[this.mat].c[0], 1.3);
    } else {
      this.vy += g.world.gravityAt(this.y) * 1.1 * dt;
      this.vx *= Math.pow(0.96, dt * 60);
    }

    if (d < 9) {
      if (g.collect(this.mat, this.x, this.y)) { this.dead = true; return; }
    }

    const hit = moveBody(this, g.world, dt);
    if (hit.ground) { this.vx *= 0.6; this.rest += dt; }
    if (hit.x) this.vx *= -0.4;
  };
  Pickup.prototype.draw = function (ctx, cam, t) {
    const y = this.y - cam.y + Math.sin(t * 3 + this.bob) * 1.4;
    if (this.life < 4) {
      ctx.globalAlpha = (Math.sin(this.life * 14) > 0) ? 0.35 : 1;
    }
    drawSprite(ctx, this.spr, 0, this.x - cam.x, y, false, false);
    ctx.globalAlpha = 1;
  };

  /* ----------------------------------------------------------------- boulder
     A dislodged block that falls and hurts. Cheap, readable cave-ins. */
  function Boulder(x, y, mat, cv) {
    this.x = x; this.y = y;
    this.vx = U.rand(-14, 14); this.vy = 10;
    this.mat = mat;
    this.cv = cv;
    this.w = cv ? cv.width * 0.7 : 8;
    this.h = cv ? cv.height * 0.7 : 8;
    this.rot = 0; this.spin = U.rand(-2, 2);
    this.dead = false;
    this.hitCool = 0;
    this.age = 0;
  }
  Boulder.prototype.update = function (dt, g) {
    this.age += dt;
    this.vy += Math.max(60, g.world.gravityAt(this.y)) * 2.2 * dt;
    this.rot += this.spin * dt;
    const p = g.player;
    if (this.vy > 60 && Math.abs(this.x - p.x) < (this.w + p.w) / 2 && Math.abs(this.y - p.y) < (this.h + p.h) / 2) {
      p.hurt(6 + this.vy * 0.05, g, Math.sign(p.x - this.x));
      this.smash(g);
      return;
    }
    for (const m of g.mobs) {
      if (m.dead) continue;
      if (this.vy > 100 && Math.abs(this.x - m.x) < (this.w + m.w) / 2 && Math.abs(this.y - m.y) < (this.h + m.h) / 2) {
        m.hurtBy(this.vy * 0.12, g, 0);
        this.smash(g);
        return;
      }
    }
    const hit = moveBody(this, g.world, dt);
    if (hit.ground || this.age > 7) this.smash(g);
    else if (hit.x) this.vx *= -0.3;
  };
  Boulder.prototype.smash = function (g) {
    this.dead = true;
    const m = D.MAT[this.mat];
    FX.dust(this.x, this.y, 8, m.c[2], 60);
    FX.shake(2);
    PD.audio.sfx.break_(0.4);
    if (U.chance(0.7)) g.pickups.push(new Pickup(this.x, this.y, this.mat));
  };
  Boulder.prototype.draw = function (ctx, cam) {
    if (!this.cv) return;
    ctx.save();
    ctx.translate(this.x - cam.x | 0, this.y - cam.y | 0);
    ctx.rotate(Math.round(this.rot / (Math.PI / 8)) * (Math.PI / 8));
    ctx.drawImage(this.cv, -this.cv.width / 2 | 0, -this.cv.height / 2 | 0);
    ctx.restore();
  };

  PD.ent = { Mob, Bullet, Pickup, Boulder, moveBody, lineClear, drawSprite, flashOf };
})(window.PD);
