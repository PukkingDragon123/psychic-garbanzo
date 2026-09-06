/* Particles, floating numbers, shockwaves, screen shake -- the juice layer. */
(function (PD) {
  'use strict';
  const U = PD.util;

  const parts = [];
  const floaters = [];
  const rings = [];
  const chunks = [];
  let shakeAmt = 0, shakeT = 0;
  let flashAmt = 0, flashColor = '#ffffff';
  let freeze = 0;
  const MAXP = 1400;

  function reset() {
    parts.length = 0; floaters.length = 0; rings.length = 0; chunks.length = 0;
    shakeAmt = 0; flashAmt = 0; freeze = 0;
  }

  function spawn(o) {
    if (parts.length >= MAXP) parts.shift();
    parts.push({
      x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
      life: o.life || 0.5, max: o.life || 0.5,
      size: o.size || 1, color: o.color || '#fff',
      grav: o.grav === undefined ? 0.4 : o.grav,
      drag: o.drag === undefined ? 0.9 : o.drag,
      glow: o.glow || 0, collide: o.collide || 0, spin: 0
    });
  }

  /* Drill sparks: hot little chips flying away from the bit. */
  function sparks(x, y, ang, mat, n) {
    const cols = mat.c;
    for (let i = 0; i < (n || 4); i++) {
      const a = ang + Math.PI + U.rand(-0.9, 0.9);
      const sp = U.rand(30, 130);
      spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        life: U.rand(0.18, 0.5), size: U.rand(1, 2.2),
        color: U.chance(0.35) ? '#fff6c8' : U.pick(cols), grav: 1.1, drag: 0.86, glow: U.chance(0.3) ? 1 : 0
      });
    }
  }

  function dust(x, y, n, color, spread) {
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, U.TAU);
      const sp = U.rand(4, spread || 40);
      spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: U.rand(0.3, 0.9), size: U.rand(1.4, 3.4),
        color: color || '#a08c7a', grav: 0.1, drag: 0.88
      });
    }
  }

  function burst(x, y, n, colors, power, glow) {
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, U.TAU);
      const sp = U.rand(0.2, 1) * (power || 120);
      spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: U.rand(0.3, 1.0), size: U.rand(1, 3),
        color: U.pick(colors), grav: 0.3, drag: 0.9, glow: glow ? 1 : (U.chance(0.4) ? 1 : 0)
      });
    }
  }

  function smoke(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      spawn({
        x: x + U.rand(-3, 3), y: y + U.rand(-3, 3),
        vx: U.rand(-14, 14), vy: U.rand(-30, -6),
        life: U.rand(0.5, 1.3), size: U.rand(2, 5),
        color: color || '#5a5470', grav: -0.15, drag: 0.93
      });
    }
  }

  function trail(x, y, color, size) {
    spawn({ x, y, vx: U.rand(-6, 6), vy: U.rand(-6, 6), life: U.rand(0.14, 0.3), size: size || 1.6, color, grav: 0, drag: 0.86, glow: 1 });
  }

  function text(x, y, str, color, size) {
    floaters.push({ x, y, vy: -26, life: 1.1, max: 1.1, str, color: color || '#fff', size: size || 1 });
  }

  function ring(x, y, r0, r1, life, color, width) {
    rings.push({ x, y, r: r0, r0, r1, life, max: life, color, width: width || 2 });
  }

  /* A flying piece of the world, painted from the tile colours it came from. */
  function chunk(x, y, vx, vy, cv, life) {
    chunks.push({ x, y, vx, vy, rot: U.rand(0, U.TAU), spin: U.rand(-6, 6), cv, life: life || 2.4, max: life || 2.4 });
  }

  function shake(amount) { shakeAmt = Math.max(shakeAmt, amount); }
  function flash(amount, color) { flashAmt = Math.max(flashAmt, amount); if (color) flashColor = color; }
  function hitStop(t) { freeze = Math.max(freeze, t); }

  function update(dt, world) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.grav * 260 * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (p.collide && world && world.solidAt(nx, ny)) {
        if (!world.solidAt(p.x, ny)) { p.vx = -p.vx * 0.4; }
        else if (!world.solidAt(nx, p.y)) { p.vy = -p.vy * 0.4; }
        else { p.vx *= 0.3; p.vy *= 0.3; }
        p.life -= dt * 2;
      } else { p.x = nx; p.y = ny; }
    }

    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= Math.pow(0.94, dt * 60);
      if (f.life <= 0) floaters.splice(i, 1);
    }

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life -= dt;
      const t = 1 - r.life / r.max;
      r.r = U.lerp(r.r0, r.r1, 1 - Math.pow(1 - t, 2.2));
      if (r.life <= 0) rings.splice(i, 1);
    }

    for (let i = chunks.length - 1; i >= 0; i--) {
      const c = chunks[i];
      c.life -= dt;
      c.vy += 180 * dt;
      c.vx *= Math.pow(0.985, dt * 60);
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.rot += c.spin * dt;
      if (U.chance(dt * 6)) trail(c.x, c.y, '#8a7a6a', 2);
      if (c.life <= 0) chunks.splice(i, 1);
    }

    shakeT += dt * 44;
    shakeAmt = Math.max(0, shakeAmt - dt * (12 + shakeAmt * 3.2));
    flashAmt = Math.max(0, flashAmt - dt * 4.6);
  }

  /* Hit-stop is measured in wall-clock time, not scaled game time. */
  function tickFreeze(realDt) { freeze = Math.max(0, freeze - realDt); }

  function shakeOffset() {
    if (shakeAmt <= 0.05) return { x: 0, y: 0 };
    return {
      x: Math.round(Math.sin(shakeT * 1.7) * shakeAmt + Math.sin(shakeT * 3.1) * shakeAmt * 0.4),
      y: Math.round(Math.cos(shakeT * 2.3) * shakeAmt + Math.cos(shakeT * 4.7) * shakeAmt * 0.3)
    };
  }

  function drawWorld(ctx, cam) {
    // rock chunks first, they read as background debris
    for (const c of chunks) {
      const a = U.clamp(c.life / 0.5, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(Math.round(c.x - cam.x), Math.round(c.y - cam.y));
      ctx.rotate(Math.round(c.rot / (Math.PI / 8)) * (Math.PI / 8));
      ctx.drawImage(c.cv, -c.cv.width / 2 | 0, -c.cv.height / 2 | 0);
      ctx.restore();
    }

    for (const p of parts) {
      const t = p.life / p.max;
      const s = Math.max(1, Math.round(p.size * (0.4 + t * 0.7)));
      ctx.globalAlpha = t > 0.5 ? 1 : t * 2;
      if (p.glow) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - cam.x) - s, Math.round(p.y - cam.y) - s, s * 3, s * 3);
        ctx.globalAlpha *= 0.5;
      }
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), s, s);
    }
    ctx.globalAlpha = 1;

    for (const r of rings) {
      const t = r.life / r.max;
      ctx.globalAlpha = t * t;
      PD.pxd.ring(ctx, r.x - cam.x, r.y - cam.y, Math.max(1, r.r), r.color, r.width);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(ctx, cam, font) {
    for (const f of floaters) {
      const t = f.life / f.max;
      ctx.globalAlpha = t > 0.6 ? 1 : t / 0.6;
      font(ctx, f.str, Math.round(f.x - cam.x), Math.round(f.y - cam.y), f.color, f.size, true);
    }
    ctx.globalAlpha = 1;
  }

  function drawOverlay(ctx, w, h) {
    if (flashAmt > 0.01) {
      ctx.globalAlpha = U.clamp(flashAmt, 0, 1) * 0.7;
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  PD.fx = {
    reset, spawn, sparks, dust, burst, smoke, trail, text, ring, chunk,
    shake, flash, hitStop, update, tickFreeze, shakeOffset, drawWorld, drawFloaters, drawOverlay,
    get freeze() { return freeze; },
    get counts() { return { parts: parts.length, chunks: chunks.length }; }
  };
})(window.PD);
