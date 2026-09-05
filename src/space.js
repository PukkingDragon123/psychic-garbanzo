/* The scooter field. Where you start: an open reach of space littered with
   drifting ore and small rocks. Ride the scooter, hoover up what floats, shoot
   what does not, and when the hold is heavy open a time hole home. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const D = PD.data;
  const FX = PD.fx;
  const A = PD.audio;
  const G = PD.glyph;

  const VW = 480, VH = 270;
  const FIELD_W = 2400, FIELD_H = 1400;

  const S = {
    chunks: [], rocks: [], mites: [],
    cam: { x: 0, y: 0 },
    hole: null,                       // { x, y, t, open }
    tapTarget: null,
    scoot: { x: 0, y: 0, vx: 0, vy: 0, ang: 0, thrust: 0 },
    t: 0, seed: 1
  };

  function chunkFor(body) {
    // chunks carry the surface ores of whichever world you are orbiting
    const strata = D.STRATA[body.type] || D.STRATA.rock;
    const table = strata[0].ores.concat(strata[1] ? strata[1].ores : []);
    return D.M[U.weighted(table)];
  }

  function enter(g) {
    const body = g.world.body;
    S.seed = 400 + g.bodyIndex * 31;
    const rnd = U.mulberry32(S.seed + Math.floor(g.time));
    S.chunks.length = 0; S.rocks.length = 0; S.mites.length = 0;
    S.hole = null; S.tapTarget = null;
    S.scoot.x = FIELD_W / 2; S.scoot.y = FIELD_H / 2; S.scoot.vx = S.scoot.vy = 0;
    for (let i = 0; i < 70; i++) {
      S.chunks.push({ x: rnd() * FIELD_W, y: rnd() * FIELD_H, vx: (rnd() - 0.5) * 12, vy: (rnd() - 0.5) * 12,
        mat: chunkFor(body), rot: rnd() * 6.28, spin: (rnd() - 0.5) * 2 });
    }
    for (let i = 0; i < 26; i++) {
      const r = 8 + rnd() * 14;
      S.rocks.push({ x: rnd() * FIELD_W, y: rnd() * FIELD_H, vx: (rnd() - 0.5) * 6, vy: (rnd() - 0.5) * 6,
        r, hp: r * 3, rot: rnd() * 6.28, spin: (rnd() - 0.5) * 0.6, seed: rnd() * 1000, mat: chunkFor(body) });
    }
    for (let i = 0; i < 6 + g.bodyIndex * 2; i++) S.mites.push({ x: rnd() * FIELD_W, y: rnd() * FIELD_H, vx: 0, vy: 0, hp: 6, t: rnd() * 6 });
    S.cam.x = S.scoot.x - VW / 2; S.cam.y = S.scoot.y - VH / 2;
    g.player.x = S.scoot.x; g.player.y = S.scoot.y;
  }

  /* Player thrust: keys, or steer toward the held touch/tap point. */
  function update(dt, g) {
    const IN = PD.input;
    const p = g.player;
    const sc = S.scoot;
    S.t += dt;

    let ix = 0, iy = 0;
    if (IN.down('left')) ix -= 1; if (IN.down('right')) ix += 1;
    if (IN.down('up')) iy -= 1; if (IN.down('down')) iy += 1;
    if (IN.mouse.left && !g.uiBlocking) {
      // hold anywhere: fly toward the pointer
      const dx = IN.mouse.wx - sc.x, dy = IN.mouse.wy - sc.y;
      const d = Math.hypot(dx, dy);
      if (d > 14) { ix = dx / d; iy = dy / d; }
    }
    const thrust = p.stat('thruster') * 1.35 * (1 - p.loadFactor() * 0.4);
    sc.vx += ix * thrust * dt; sc.vy += iy * thrust * dt;
    sc.thrust = Math.hypot(ix, iy);
    if (sc.thrust > 0.1) sc.ang = U.lerp(sc.ang, Math.atan2(iy, ix), 0.2);
    sc.vx *= Math.pow(0.985, dt * 60); sc.vy *= Math.pow(0.985, dt * 60);
    const sp = Math.hypot(sc.vx, sc.vy), maxSp = 210 - p.loadFactor() * 60;
    if (sp > maxSp) { sc.vx *= maxSp / sp; sc.vy *= maxSp / sp; }
    sc.x = U.clamp(sc.x + sc.vx * dt, 20, FIELD_W - 20);
    sc.y = U.clamp(sc.y + sc.vy * dt, 20, FIELD_H - 20);
    p.x = sc.x; p.y = sc.y; p.vx = sc.vx; p.vy = sc.vy;
    p.aim = sc.ang;
    A.thrust(sc.thrust > 0.1 ? 0.6 : 0);
    if (sc.thrust > 0.1 && U.chance(dt * 40)) {
      FX.spawn({ x: sc.x - Math.cos(sc.ang) * 12, y: sc.y - Math.sin(sc.ang) * 12 + 4, vx: -Math.cos(sc.ang) * 90 + U.rand(-15, 15), vy: -Math.sin(sc.ang) * 90 + U.rand(-15, 15),
        life: U.rand(0.2, 0.5), size: U.rand(1.5, 3), color: U.pick(['#ffd34d', '#ff9b3d', '#fff3c0']), grav: 0, drag: 0.9, glow: 1 });
    }

    // air still matters out here
    p.o2 -= (0.35 + p.loadFactor() * 0.3) * dt;
    if (p.o2 <= 0) { p.o2 = 0; p.hull -= 5 * dt; if (p.hull <= 0) { p.hull = 0; g.onPlayerDown(); return; } }

    // shooting: space to fire toward the aim
    if ((IN.mouse.right || IN.down('space')) && p.gunCool <= 0 && !g.uiBlocking) {
      p.gunCool = 0.28;
      g.bullets.push(new PD.ent.Bullet(sc.x + Math.cos(sc.ang) * 12, sc.y + Math.sin(sc.ang) * 12, Math.cos(sc.ang) * 340, Math.sin(sc.ang) * 340, p.stat('pistol'), true));
      A.sfx.shoot();
    }
    p.gunCool = Math.max(0, p.gunCool - dt);
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      const b = g.bullets[i];
      b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
      let hit = false;
      for (const r of S.rocks) {
        if (r.dead || U.dist(b.x, b.y, r.x, r.y) > r.r) continue;
        r.hp -= b.dmg; hit = true;
        FX.sparks(b.x, b.y, Math.atan2(b.vy, b.vx), D.MAT[r.mat], 4);
        A.sfx.hitMob();
        if (r.hp <= 0) breakRock(r, g);
        break;
      }
      for (const m of S.mites) {
        if (m.dead || hit || U.dist(b.x, b.y, m.x, m.y) > 6) continue;
        m.hp -= b.dmg; hit = true;
        if (m.hp <= 0) { m.dead = true; g.save.credits += 9; FX.burst(m.x, m.y, 8, ['#c8ff5a', '#fff'], 90); A.sfx.killMob(); }
      }
      if (hit || b.life <= 0) g.bullets.splice(i, 1);
    }

    // drifting things
    const pull = p.stat('magnet') + 14;
    for (let i = S.chunks.length - 1; i >= 0; i--) {
      const c = S.chunks[i];
      c.rot += c.spin * dt;
      const d = U.dist(c.x, c.y, sc.x, sc.y);
      if (d < pull && !p.cargoFull()) {
        const a = Math.atan2(sc.y - c.y, sc.x - c.x);
        c.vx = U.damp(c.vx, Math.cos(a) * 220, 0.2, dt); c.vy = U.damp(c.vy, Math.sin(a) * 220, 0.2, dt);
      }
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (d < 10 && g.collect(c.mat, c.x, c.y)) { S.chunks.splice(i, 1); PD.touch.buzz(6); }
    }
    for (const r of S.rocks) { if (r.dead) continue; r.rot += r.spin * dt; r.x += r.vx * dt; r.y += r.vy * dt;
      if (U.dist(r.x, r.y, sc.x, sc.y) < r.r + 6) { sc.vx -= (r.x - sc.x) * 3; sc.vy -= (r.y - sc.y) * 3; p.hurt(4, g, Math.sign(sc.x - r.x)); } }
    for (const m of S.mites) {
      if (m.dead) continue;
      m.t += dt;
      const d = U.dist(m.x, m.y, sc.x, sc.y);
      const chase = d < 220;
      const tx = chase ? sc.x + Math.cos(m.t * 2) * 30 : m.x + Math.cos(m.t) * 20;
      const ty = chase ? sc.y + Math.sin(m.t * 2.6) * 24 : m.y + Math.sin(m.t * 0.7) * 20;
      m.vx = U.damp(m.vx, U.clamp((tx - m.x) * 3, -120, 120), 0.1, dt); m.vy = U.damp(m.vy, U.clamp((ty - m.y) * 3, -120, 120), 0.1, dt);
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (d < 9) p.hurt(4, g, Math.sign(sc.x - m.x));
    }
    // the field slowly replenishes
    if (S.chunks.length < 40 && U.chance(dt * 0.6)) {
      S.chunks.push({ x: sc.x + U.rand(-VW, VW) * 1.4, y: sc.y + U.rand(-VH, VH) * 1.4, vx: U.rand(-8, 8), vy: U.rand(-8, 8), mat: chunkFor(g.world.body), rot: 0, spin: U.rand(-1, 1) });
    }

    // time hole: E / tap the hole key; opens beside you, fly in
    if (IN.hit('KeyE') && !S.hole) openHole(g);
    if (S.hole) {
      S.hole.t += dt;
      S.hole.open = Math.min(1, S.hole.t / 1.2);
      if (S.hole.open >= 1 && U.dist(sc.x, sc.y, S.hole.x, S.hole.y) < 22) { g.throughHole(); return; }
      if (U.chance(dt * 30)) {
        const a = U.rand(0, U.TAU), r = 26 * S.hole.open;
        FX.spawn({ x: S.hole.x + Math.cos(a) * r, y: S.hole.y + Math.sin(a) * r, vx: -Math.cos(a) * 40, vy: -Math.sin(a) * 40, life: 0.5, size: 1.5, color: U.pick(['#7ef9ff', '#d8bcff', '#ffffff']), grav: 0, drag: 0.9, glow: 1 });
      }
    }

    S.cam.x = U.damp(S.cam.x, U.clamp(sc.x - VW / 2 + sc.vx * 0.25, 0, FIELD_W - VW), 0.12, dt);
    S.cam.y = U.damp(S.cam.y, U.clamp(sc.y - VH / 2 + sc.vy * 0.25, 0, FIELD_H - VH), 0.12, dt);
    FX.update(dt, null);
  }

  function openHole(g) {
    const sc = S.scoot;
    S.hole = { x: sc.x + Math.cos(sc.ang + Math.PI) * 70, y: sc.y + Math.sin(sc.ang + Math.PI) * 70, t: 0, open: 0 };
    A.sfx.warp();
    FX.ring(S.hole.x, S.hole.y, 2, 60, 0.9, '#7ef9ff', 2);
    FX.shake(3);
  }

  function breakRock(r, g) {
    r.dead = true;
    A.sfx.boom(0.5); FX.shake(3);
    FX.burst(r.x, r.y, 20, D.MAT[r.mat].c, 120);
    const n = 3 + Math.round(r.r / 5);
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, U.TAU);
      S.chunks.push({ x: r.x, y: r.y, vx: Math.cos(a) * U.rand(30, 90), vy: Math.sin(a) * U.rand(30, 90), mat: U.chance(0.3) ? D.M.stone : r.mat, rot: 0, spin: U.rand(-3, 3) });
    }
    if (U.chance(0.15)) S.chunks.push({ x: r.x, y: r.y, vx: 0, vy: 0, mat: D.M.gold, rot: 0, spin: 1 });
  }

  /* ----------------------------------------------------------------- drawing */
  function drawRock(ctx, r, cam) {
    const x = r.x - cam.x, y = r.y - cam.y;
    ctx.save(); ctx.translate(x | 0, y | 0); ctx.rotate(Math.round(r.rot / (Math.PI / 8)) * (Math.PI / 8));
    ctx.fillStyle = '#4e4658';
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * U.TAU, rr = r.r * (0.78 + U.hash2(r.seed + i, 3) * 0.4);
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#6a6278'; ctx.fillRect(-r.r * 0.4, -r.r * 0.5, r.r * 0.5, r.r * 0.3);
    const mc = D.MAT[r.mat].c;
    ctx.fillStyle = mc[0]; ctx.fillRect(r.r * 0.1, r.r * 0.1, 3, 3); ctx.fillRect(-r.r * 0.5, r.r * 0.2, 2, 2);
    ctx.restore();
  }

  function draw(ctx, g, t) {
    const cam = { x: Math.round(S.cam.x), y: Math.round(S.cam.y) };
    PD.galaxy.draw(ctx, cam, t, S.seed, g.world.body.sky);
    // the world you are orbiting, huge and slow at the bottom
    const moon = g.world.moon && g.world.moon.cv;
    if (moon) {
      const mx = VW * 0.65 - cam.x * 0.05, my = VH * 0.75 - cam.y * 0.05;
      ctx.drawImage(moon, 0, 0, moon.width, moon.height, mx | 0, my | 0, moon.width * 2.2, moon.height * 2.2);
    }

    for (const r of S.rocks) if (!r.dead) drawRock(ctx, r, cam);
    for (const c of S.chunks) {
      const spr = PD.art.gemFor(c.mat);
      PD.ent.drawSprite(ctx, spr, 0, c.x - cam.x, c.y - cam.y + Math.sin(t * 2 + c.rot) * 1.5, false, false);
    }
    FX.drawWorld(ctx, cam);
    for (const m of S.mites) if (!m.dead) PD.ent.drawSprite(ctx, PD.art.sprites.mite, Math.floor(t * 8) % 2, m.x - cam.x, m.y - cam.y, m.vx < 0, false);
    for (const b of g.bullets) b.draw(ctx, cam);

    if (S.hole) {
      const hx = S.hole.x - cam.x, hy = S.hole.y - cam.y, o = S.hole.open;
      const rr = 24 * o;
      const grd = ctx.createRadialGradient(hx, hy, 1, hx, hy, rr + 10);
      grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(0.4, 'rgba(126,249,255,0.7)'); grd.addColorStop(1, 'rgba(120,80,220,0)');
      ctx.fillStyle = grd; ctx.fillRect(hx - rr - 10, hy - rr - 10, rr * 2 + 20, rr * 2 + 20);
      for (let k = 0; k < 3; k++) {
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(t * (1.5 + k) * (k % 2 ? -1 : 1));
        G.hex(ctx, 0, 0, rr * (1 - k * 0.22), null, k ? '#d8bcff' : '#ffffff', 1.5);
        ctx.restore();
      }
    }

    // the scooter: alien riding a hover-bike, drawn along its heading
    const sc = S.scoot;
    const skin = PD.art.skinFor(g.save.cos);
    const bike = PD.art.sprites.scooter;
    const flip = Math.cos(sc.ang) < 0;
    const bob = Math.sin(t * 5) * 1.2;
    ctx.save();
    ctx.translate((sc.x - cam.x) | 0, (sc.y - cam.y + bob) | 0);
    ctx.rotate(flip ? Math.PI - sc.ang : sc.ang);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(bike.frames[Math.floor(t * 10) % 2], -bike.ox, -bike.oy);
    ctx.restore();
    PD.ent.drawSprite(ctx, skin.alien, 0, sc.x - cam.x, sc.y - cam.y + bob - 9, flip, g.player.hurtT > 0.15);

    // where a held touch is steering to
    if (PD.input.mouse.left && !g.uiBlocking) {
      const mx = PD.input.mouse.wx - cam.x, my = PD.input.mouse.wy - cam.y;
      G.hex(ctx, mx, my, 6 + Math.sin(t * 8) * 1.5, null, '#ffd34d', 1);
    }
  }

  PD.space = { enter, update, draw, openHole, S, FIELD_W, FIELD_H };
})(window.PD);
