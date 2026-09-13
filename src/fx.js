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
    shakeAmt = 0; flashAmt = 0; freeze = 0; wipe = null;
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

  /* DEBRIS. Real chips of the rock that just came apart: they tumble, they
     bounce off the floor and the walls, they pile up for a moment and then
     crumble away. Drawn as blocks with a lit top and a dark sole so a shard
     reads as a solid lump of something rather than a dot. */
  function shards(x, y, mat, n, ang) {
    const cols = mat.c;
    // when the screen is already full of rubble, throw less of it: a heavy
    // chain of breaks should not be the thing that costs the frame
    if (parts.length > 620) n = Math.max(3, n >> 1);
    if (parts.length > 1000) n = Math.max(2, n >> 1);
    for (let i = 0; i < n; i++) {
      const a = ang === undefined ? U.rand(0, U.TAU) : ang + Math.PI + U.rand(-1.5, 1.5);
      const sp = U.rand(40, 210);
      parts.push({
        x: x + U.rand(-4, 4), y: y + U.rand(-4, 4),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - U.rand(20, 90),
        life: U.rand(0.7, 1.9), max: 1.9,
        size: U.rand(2, 4.4), color: U.pick(cols),
        lit: cols[0], dark: cols[2],
        // only some of them test the world: two collision probes per shard per
        // frame is the expensive part, and a few chips sailing through a wall
        // in a shower of thirty is not something anyone sees
        grav: 1.15, drag: 0.995, glow: 0, collide: i % 3 ? 1 : 0, bounce: U.rand(0.28, 0.55),
        kind: 'shard', spin: 0
      });
      if (parts.length > MAXP) parts.shift();
    }
  }

  /* A tile giving up: a puff of grit and a hard little shockwave. */
  function crumble(x, y, mat) {
    ring(x, y, 2, 18, 0.26, mat.c[0], 2);
    // one white square where the tile used to be, gone in three frames
    spawn({ x, y, vx: 0, vy: 0, life: 0.07, size: 11, color: '#ffffff', grav: 0, drag: 1 });
    spawn({ x, y, vx: 0, vy: 0, life: 0.14, size: 9, color: mat.c[0], grav: 0, drag: 1 });
    for (let i = 0; i < 7; i++) {
      spawn({ x, y, vx: U.rand(-38, 38), vy: U.rand(-56, -10), life: U.rand(0.4, 1.2),
        size: U.rand(3, 7), color: mat.c[2], grav: -0.05, drag: 0.9 });
    }
  }

  /* An ore vanishing into a pocket: it pops, and the pop leaves a spark trail
     pointing back the way it came. */
  function pop(x, y, col, dirx, diry) {
    ring(x, y, 1, 13, 0.3, '#ffffff', 1);
    ring(x, y, 3, 20, 0.42, col, 1);
    for (let i = 0; i < 8; i++) {
      const a = U.rand(0, U.TAU);
      spawn({ x, y, vx: Math.cos(a) * U.rand(20, 90) + (dirx || 0) * 40, vy: Math.sin(a) * U.rand(20, 90) + (diry || 0) * 40,
        life: U.rand(0.16, 0.4), size: U.rand(1, 2.4), color: i % 2 ? '#ffffff' : col, grav: 0.2, drag: 0.85, glow: 1 });
    }
  }

  /* ------------------------------------------------------- cartoon effects
     The particle system above does physics. These two do COMEDY: a puff of
     smoke with a hard outline that swells and thins, and a ring of spinning
     stars round something that has just been hit. They are drawn as their own
     kind rather than as blobs, because the whole point is the outline. */
  function puff(x, y, n, col, power) {
    // a puff costs two scanline discs to draw, so it yields to the physics
    // particles when the screen is already full of rock
    if (parts.length > MAXP * 0.5) return;
    n = n || 5; power = power || 1;
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, U.TAU), sp = U.rand(18, 62) * power;
      if (parts.length >= MAXP) parts.shift();
      parts.push({
        kind: 'puff', x: x + U.rand(-3, 3), y: y + U.rand(-3, 3),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 14,
        life: U.rand(0.45, 0.9), max: 0.9, size: U.rand(3, 6.5) * power,
        color: col || '#c9bce8', grav: -12, drag: 0.9, glow: 0, collide: 0, spin: 0
      });
    }
  }

  /* Spinning stars, the universal cartoon for OW. */
  function stars(x, y, n, col) {
    if (parts.length > MAXP * 0.7) return;
    n = n || 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU + U.rand(-0.3, 0.3), sp = U.rand(40, 96);
      if (parts.length >= MAXP) parts.shift();
      parts.push({
        kind: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        life: U.rand(0.5, 0.85), max: 0.85, size: U.rand(3, 5),
        color: col || '#ffe86a', grav: 90, drag: 0.93, glow: 0, collide: 0,
        spin: U.rand(-9, 9), rot: U.rand(0, U.TAU)
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
    floaters.push({ x, y, vy: -30, life: 1.1, max: 1.1, str, color: color || '#fff', size: size || 1, pop: 0 });
  }

  function ring(x, y, r0, r1, life, color, width) {
    rings.push({ x, y, r: r0, r0, r1, life, max: life, color, width: width || 2 });
  }

  /* A flying piece of the world, painted from the tile colours it came from. */
  function chunk(x, y, vx, vy, cv, life) {
    chunks.push({ x, y, vx, vy, rot: U.rand(0, U.TAU), spin: U.rand(-6, 6), cv, life: life || 2.4, max: life || 2.4 });
  }

  /* ------------------------------------------------------------- the WIPE
     Going into the computer or the brain does not cut -- it irises. A grid of
     chunky squares swells shut, converging on whatever you pressed E on, the
     scene changes behind them at the halfway point, and then they shrink away
     again in the opposite order. Ordered by distance from the focus, so it
     reads as being pulled INTO the thing rather than a curtain dropping. */
  let wipe = null;
  const WCOL = 24, WROW = 14;
  function beginWipe(x, y, col, onMid) {
    wipe = { x: x, y: y, t: 0, dur: 0.54, col: col || '#0b0718', mid: onMid, fired: false };
  }
  function wipeActive() { return !!wipe; }
  function wipeBusy() { return !!wipe && !wipe.fired; }
  function updateWipe(dt) {
    if (!wipe) return;
    wipe.t += dt;
    if (!wipe.fired && wipe.t >= wipe.dur * 0.5) {
      wipe.fired = true;
      flash(0.32, '#ffffff');
      if (wipe.mid) { const f = wipe.mid; wipe.mid = null; f(); }
    }
    if (wipe.t >= wipe.dur) wipe = null;
  }
  /* THE SLIME. Everything in this game is sticky, so the transition is too: a
     ceiling of gloop comes down the screen in uneven columns, hangs there,
     throws off drips and strings, and then peels back up. */
  const SLIME_N = 24;
  const SLIME = [];
  for (let i = 0; i < SLIME_N; i++) SLIME.push({ o: U.hash2(i, 5), w: 0.7 + U.hash2(i, 9) * 0.6 });
  const DRIP = [];
  for (let i = 0; i < 16; i++) DRIP.push({ x: U.hash2(i, 17), d: U.hash2(i, 21), sp: 0.6 + U.hash2(i, 29) });

  function drawWipe(ctx, w, h) {
    if (!wipe) return;
    const half = wipe.dur * 0.5;
    const closing = wipe.t < half;
    const k = closing ? wipe.t / half : 1 - (wipe.t - half) / half;
    const e = k * k * (3 - 2 * k);
    const cw = w / SLIME_N;
    const dark = wipe.col;
    const lite = shade(dark, 26);
    const glow = shade(dark, 52);

    for (let i = 0; i < SLIME_N; i++) {
      const sl = SLIME[i];
      // each column runs at its own speed and overshoots a little
      const lead = 0.14 * sl.o;
      const local = U.clamp((e - lead) / (1 - lead), 0, 1);
      if (local <= 0) continue;
      const x = Math.round(i * cw), cwi = Math.ceil(cw) + 1;
      const drop = local * (h + 26) * sl.w;
      const wob = Math.sin(wipe.t * 7 + i) * 2 * (1 - local);
      const y = Math.round(drop + wob);
      ctx.fillStyle = dark;
      ctx.fillRect(x, 0, cwi, y);
      // the bulge at the bottom of each run, and the highlight on top of it
      ctx.fillStyle = lite;
      const bw = Math.round(cw * (0.5 + 0.5 * Math.abs(Math.sin(i * 2.1))));
      ctx.fillRect(x + Math.round((cw - bw) / 2), y - 2, bw, 7);
      ctx.fillRect(x + 1, 0, 2, Math.max(0, y - 4));
      ctx.fillStyle = glow;
      ctx.fillRect(x + Math.round(cw / 2) - 1, y - 1, 3, 4);
      // a string of it hanging off, thinning as it goes
      const tl = 12 * (1 - Math.abs(local - 0.6) * 1.4);
      if (tl > 1) {
        ctx.fillStyle = dark;
        for (let q = 0; q < tl; q++) {
          ctx.fillRect(x + Math.round(cw / 2) - (q < tl * 0.6 ? 1 : 0), y + 4 + q, q < tl * 0.6 ? 3 : 1, 1);
        }
      }
    }
    // and loose drops falling ahead of the front
    ctx.fillStyle = lite;
    for (const d of DRIP) {
      const f = (e * d.sp + d.d) % 1;
      if (f > 0.92 || e < 0.08) continue;
      const dx = Math.round(d.x * w), dy = Math.round(f * (h + 20) - 10);
      ctx.fillRect(dx, dy, 3, 4);
      ctx.fillRect(dx + 1, dy - 2, 1, 2);
    }
  }
  /* Lighten a #rrggbb by n, for the highlight on the gloop. */
  function shade(hex, n) {
    const v = parseInt(hex.slice(1), 16);
    const q = c => Math.min(255, ((v >> c) & 255) + n);
    return 'rgb(' + q(16) + ',' + q(8) + ',' + q(0) + ')';
  }

  function shake(amount) { shakeAmt = Math.max(shakeAmt, amount); }
  function flash(amount, color) { flashAmt = Math.max(flashAmt, amount); if (color) flashColor = color; }
  function hitStop(t) { freeze = Math.max(freeze, t); }

  function update(dt, world) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (p.rest) continue;                       // lying on the floor: leave it there
      p.vy += p.grav * 260 * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      if (p.kind === 'shard') p.spin += (p.vx * 0.02) * dt * 60;
      if (p.kind === 'star') p.rot = (p.rot || 0) + p.spin * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (p.collide && world && world.solidAt(nx, ny)) {
        const b = p.bounce === undefined ? 0.4 : p.bounce;
        if (!world.solidAt(p.x, ny)) { p.vx = -p.vx * b; p.y = ny; }
        else if (!world.solidAt(nx, p.y)) { p.vy = -p.vy * b; p.vx *= 0.72; p.x = nx; }
        else { p.vx *= 0.3; p.vy *= 0.3; }
        // a shard that has stopped moving is lying on the floor: let it lie
        if (p.kind === 'shard' && Math.abs(p.vy) < 26 && Math.abs(p.vx) < 14) { p.vx = 0; p.vy = 0; p.grav = 0; p.rest = 1; }
        else if (!p.rest) p.life -= dt * (p.kind === 'shard' ? 0.6 : 2);
      } else { p.x = nx; p.y = ny; }
    }

    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= Math.pow(0.94, dt * 60);
      // BOUNCY: a number punches in past its own size before it settles
      f.pop = Math.min(1, (f.pop || 0) + dt * 7);
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
      if (p.kind === 'shard') {
        const w = Math.max(2, Math.round(p.size));
        const h = Math.max(1, Math.round(p.size * 0.72));
        const sx = Math.round(p.x - cam.x) - (w >> 1), sy = Math.round(p.y - cam.y) - (h >> 1);
        ctx.globalAlpha = t > 0.35 ? 1 : t / 0.35;
        ctx.fillStyle = p.color; ctx.fillRect(sx, sy, w, h);
        // a lump this small only has room for one lit edge
        if (h > 2) { ctx.fillStyle = p.lit; ctx.fillRect(sx, sy, w - 1, 1); ctx.fillStyle = p.dark; ctx.fillRect(sx, sy + h - 1, w, 1); }
        else { ctx.fillStyle = p.lit; ctx.fillRect(sx, sy, w - 1, 1); }
        continue;
      }
      if (p.kind === 'puff') {
        // a lumpy cloud that swells as it dies, with a hard rim round it
        const r = Math.max(1, p.size * (1.5 - t * 0.7));
        ctx.globalAlpha = t > 0.6 ? (1 - t) * 2.5 : t * 1.1;
        const px2 = Math.round(p.x - cam.x), py2 = Math.round(p.y - cam.y);
        PD.pxd.blob(ctx, px2, py2, r + 1, r * 0.85 + 1, '#1a1030');
        PD.pxd.blob(ctx, px2, py2, r, r * 0.85, p.color);
        continue;
      }
      if (p.kind === 'star') {
        const px2 = Math.round(p.x - cam.x), py2 = Math.round(p.y - cam.y);
        const r = Math.max(2, p.size);
        ctx.globalAlpha = t > 0.4 ? 1 : t / 0.4;
        ctx.save();
        ctx.translate(px2, py2);
        ctx.rotate(Math.round((p.rot || 0) / (Math.PI / 8)) * (Math.PI / 8));
        for (const c2 of ['#1a1030', p.color]) {
          const g2 = c2 === p.color ? 0 : 1;
          PD.pxd.rect(ctx, -1 - g2, -r - g2, 2 + g2 * 2, r * 2 + g2 * 2, c2);
          PD.pxd.rect(ctx, -r - g2, -1 - g2, r * 2 + g2 * 2, 2 + g2 * 2, c2);
        }
        ctx.restore();
        continue;
      }
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
      // overshoot then settle: 1.45x at the peak of the pop
      const pop = f.pop === undefined ? 1 : f.pop;
      const k = pop < 1 ? 0.4 + Math.sin(pop * Math.PI) * 1.05 + pop * 0.6 : 1;
      const x = Math.round(f.x - cam.x), y = Math.round(f.y - cam.y);
      if (k > 1.04) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(k, k);
        font(ctx, f.str, 0, 0, f.color, f.size, true);
        ctx.restore();
      } else font(ctx, f.str, x, y, f.color, f.size, true);
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
    reset, spawn, sparks, dust, burst, smoke, trail, text, ring, chunk, shards, crumble, pop, puff, stars,
    beginWipe, wipeActive, wipeBusy, updateWipe, drawWipe,
    shake, flash, hitStop, update, tickFreeze, shakeOffset, drawWorld, drawFloaters, drawOverlay,
    get freeze() { return freeze; },
    get counts() { return { parts: parts.length, chunks: chunks.length }; }
  };
})(window.PD);
