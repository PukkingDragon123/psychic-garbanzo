/* Your moon. A small dead rock you own, with ruins on it and whatever you have
   managed to build. No station, no staff, no menus: walk up to a thing and
   press E. Buildings grow as you pour money into them, which is the whole
   upgrade system. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const A = PD.audio;
  const FX = PD.fx;
  const D = PD.data;
  const AH = PD.arthome;

  const VW = 480, VH = 270;
  const ROOM_W = 1040;
  const HORIZON = 202;

  /* Rolling ground, from a few sines so it is smooth and never tiled. */
  function groundY(x) {
    return HORIZON
      + Math.sin(x * 0.0121) * 13
      + Math.sin(x * 0.0331 + 1.7) * 6
      + Math.sin(x * 0.0072 + 4.1) * 9;
  }

  const P = { x: 120, y: 0, vx: 0, face: 1, walk: 0, near: null, target: null, hop: 0, vy: 0, lock: 0 };
  const critters = [
    { x: 300, dir: 1, t: 0, spr: 'critter', speed: 15 },
    { x: 640, dir: -1, t: 0.5, spr: 'critter2', speed: 11 },
    { x: 880, dir: 1, t: 1.2, spr: 'critter', speed: 18 }
  ];
  const RUINS = [
    { x: 60, k: 2 }, { x: 190, k: 0 }, { x: 430, k: 1 }, { x: 540, k: 2 }, { x: 760, k: 1 }, { x: 990, k: 0 }
  ];
  const FLAGS = [{ x: 96 }, { x: 300 }, { x: 660 }, { x: 940 }];
  const ROCKS = [];
  for (let i = 0; i < 70; i++) ROCKS.push({ x: U.hash2(i, 3) * ROOM_W, s: 1 + U.hash2(i, 9) * 3, c: U.hash2(i, 5) });
  const CRATERS = [];
  for (let i = 0; i < 16; i++) CRATERS.push({ x: 40 + U.hash2(i, 21) * (ROOM_W - 80), r: 10 + U.hash2(i, 33) * 22 });
  const FORE = [];
  for (let i = 0; i < 14; i++) FORE.push({ x: U.hash2(i, 41) * ROOM_W * 1.15, s: 8 + U.hash2(i, 47) * 16, y: 236 + U.hash2(i, 53) * 30 });
  const MOTES = [];
  for (let i = 0; i < 26; i++) MOTES.push({ x: U.hash2(i, 61) * ROOM_W, y: 120 + U.hash2(i, 67) * 130, r: 0.6 + U.hash2(i, 71) * 1.4, sp: 3 + U.hash2(i, 73) * 8 });

  let star = null;

  function enter(g, atX) {
    P.x = atX === undefined ? 120 : atX;
    P.y = groundY(P.x);
    P.vx = 0; P.target = null; P.autoUse = null;
    // the keypress that brought you here must not also press a button here
    P.lock = 0.25;
    g.intCam = U.clamp(P.x - VW / 2, 0, ROOM_W - VW);
    if (!star) {
      star = [];
      for (let i = 0; i < 150; i++) star.push({ x: U.hash2(i, 11) * ROOM_W, y: U.hash2(i, 17) * HORIZON, b: U.hash2(i, 23) });
    }
  }

  function tierOf(lvl) { return lvl <= 0 ? 0 : (lvl < 4 ? 0 : (lvl < 8 ? 1 : 2)); }

  function nearest() {
    let best = null, bd = 46;
    for (const b of D.BUILDINGS) {
      const d = Math.abs(b.x - P.x);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  function use(g, b) {
    if (!b) return;
    if (b.act === 'chart') { g.openChart(); return; }
    if (b.act === 'sell') { g.sellAll(); return; }
    g.upgradeBuilding(b.id);
  }

  /* ---------------------------------------------------------------- update */
  function update(dt, g) {
    const IN = PD.input;
    P.lock = Math.max(0, P.lock - dt);
    const use_ = P.lock <= 0 && (IN.hit('KeyE') || IN.hit('space'));

    let ix = 0;
    if (IN.down('left')) ix -= 1;
    if (IN.down('right')) ix += 1;

    // tap anywhere to walk there; tap a building to walk over and use it
    if (P.lock <= 0 && IN.mouse.leftPressed && IN.mouse.y > 24) {
      const wx = IN.mouse.x + g.intCam;
      let hit = null;
      for (const b of D.BUILDINGS) if (Math.abs(b.x - wx) < 40) hit = b;
      P.target = hit ? hit.x : U.clamp(wx, 24, ROOM_W - 24);
      P.autoUse = hit;
      A.sfx.click();
    }
    if (ix) { P.target = null; P.autoUse = null; }
    if (P.target !== null) {
      const d = P.target - P.x;
      if (Math.abs(d) > 5) ix = Math.sign(d);
      else { P.target = null; if (P.autoUse) { const b = P.autoUse; P.autoUse = null; use(g, b); } }
    }

    if (ix) P.face = ix;
    P.vx = U.damp(P.vx, ix * 96, 0.26, dt);
    P.x = U.clamp(P.x + P.vx * dt, 24, ROOM_W - 24);
    P.walk += Math.abs(P.vx) * dt * 0.1;

    // low gravity hop
    const gy = groundY(P.x);
    if (IN.hit('up') && P.y >= gy - 0.5) { P.vy = -104; A.sfx.tone(660, { type: 'triangle', dur: 0.09, vol: 0.06 }); }
    P.vy += 240 * dt;
    P.y = Math.min(gy, P.y + P.vy * dt);
    if (P.y >= gy) { P.y = gy; P.vy = 0; }

    P.near = nearest();
    if (use_) use(g, P.near);
    if (IN.hit('esc')) { /* nothing to close: the moon is the menu */ }

    for (const c of critters) {
      c.t += dt;
      c.x += c.dir * c.speed * dt;
      if (c.x > ROOM_W - 40 || c.x < 40) c.dir *= -1;
      if (U.chance(dt * 0.4)) c.dir *= -1;
    }

    g.intCam = U.damp(g.intCam, U.clamp(P.x - VW / 2, 0, ROOM_W - VW), 0.15, dt);
  }

  /* ------------------------------------------------------------------ draw */
  function spr(ctx, s, frame, x, y) {
    ctx.drawImage(s.frames[frame % s.frames.length], (x - s.ox) | 0, (y - s.oy) | 0);
  }

  function drawSky(ctx, g, t, cam) {
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON + 30);
    sky.addColorStop(0, '#100a2c');
    sky.addColorStop(0.55, '#1e1140');
    sky.addColorStop(1, '#3a1c4e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VW, HORIZON + 40);
    // nebula smear
    const neb = ctx.createRadialGradient(320 - cam * 0.15, 60, 6, 320 - cam * 0.15, 60, 150);
    neb.addColorStop(0, 'rgba(255,138,216,0.22)');
    neb.addColorStop(1, 'rgba(255,138,216,0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, VW, HORIZON + 20);
    for (const s of star) {
      const x = s.x - cam * 0.25;
      const sx = ((x % ROOM_W) + ROOM_W) % ROOM_W;
      if (sx > VW + 4) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.b * 30);
      ctx.fillStyle = s.b > 0.85 ? '#ffe9a8' : '#ffffff';
      ctx.globalAlpha = 0.25 + s.b * 0.6 * tw;
      ctx.fillRect(sx | 0, s.y | 0, 1, 1);
    }
    ctx.globalAlpha = 1;
    // the world you are working on, hanging over the horizon
    const icon = g.navIcon(g.save.bodyIndex || 0);
    const px = 372 - cam * 0.3, py = 66 + Math.sin(t * 0.4) * 2;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(icon, px - icon.width * 1.6, py - icon.height * 1.6, icon.width * 3.2, icon.height * 3.2);
    ctx.restore();
    // a second, smaller companion
    const ic2 = g.navIcon(Math.min(D.BODIES.length - 1, (g.save.bodyIndex || 0) + 1));
    ctx.globalAlpha = 0.5;
    ctx.drawImage(ic2, 92 - cam * 0.18, 38, 22, 22);
    ctx.globalAlpha = 1;
  }

  function drawGround(ctx, cam, t) {
    // far crater rim silhouette
    ctx.fillStyle = '#241640';
    ctx.beginPath();
    ctx.moveTo(0, VH);
    for (let x = 0; x <= VW; x += 8) {
      const wx = x + cam * 0.45;
      ctx.lineTo(x, HORIZON - 16 + Math.sin(wx * 0.008) * 10 + Math.sin(wx * 0.021 + 2) * 5);
    }
    ctx.lineTo(VW, VH);
    ctx.closePath();
    ctx.fill();

    // the moon surface itself
    ctx.beginPath();
    ctx.moveTo(0, VH);
    for (let x = 0; x <= VW; x += 4) ctx.lineTo(x, groundY(x + cam));
    ctx.lineTo(VW, VH);
    ctx.closePath();
    const gr = ctx.createLinearGradient(0, HORIZON - 20, 0, VH);
    gr.addColorStop(0, '#6b6480');
    gr.addColorStop(0.25, '#544d6b');
    gr.addColorStop(1, '#2e2842');
    ctx.fillStyle = gr;
    ctx.fill();

    // lit crust line
    ctx.strokeStyle = '#a89ac4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= VW; x += 4) {
      const y = groundY(x + cam);
      if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();

    // craters scooped out of the surface
    for (const c of CRATERS) {
      const x = c.x - cam;
      if (x < -60 || x > VW + 60) continue;
      const y = groundY(c.x);
      ctx.fillStyle = '#453e5e';
      ctx.beginPath(); ctx.ellipse(x, y + c.r * 0.28, c.r, c.r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8e86a8';
      ctx.beginPath(); ctx.ellipse(x, y + c.r * 0.18, c.r * 0.94, c.r * 0.22, 0, Math.PI, Math.PI * 2); ctx.fill();
    }
    // pebbles
    for (const r of ROCKS) {
      const x = r.x - cam;
      if (x < -8 || x > VW + 8) continue;
      const y = groundY(r.x);
      ctx.fillStyle = r.c > 0.6 ? '#8e86a8' : '#4a4460';
      ctx.beginPath(); ctx.ellipse(x, y + 3 + r.c * 10, r.s, r.s * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* One sign per building: name, level pips, what it does, what it costs. */
  function sign(ctx, g, b, x, topY, t) {
    const lvl = g.buildLevel(b.id);
    const near = P.near === b;
    const maxed = b.max > 0 && lvl >= b.max;
    const cost = b.max > 0 ? D.buildCost(b, lvl) : 0;
    const afford = g.save.credits >= cost;

    if (!near) {
      // far away it is just a little name plate, so the moon stays uncluttered
      const label = b.name + (b.max > 0 && lvl > 0 ? '  ' + lvl : '');
      const w = F.width(label, 1) + 18;
      const y = topY - 16;
      ctx.fillStyle = '#4a4460';
      ctx.fillRect(x - 1, y + 12, 2, topY - y - 10);
      ctx.fillStyle = 'rgba(16,10,36,0.72)';
      ctx.fillRect(x - w / 2, y, w, 12);
      ctx.strokeStyle = '#443166';
      ctx.strokeRect(x - w / 2 + 0.5, y + 0.5, w - 1, 11);
      PD.glyph.draw(ctx, b.glyph, x - w / 2 + 2, y, '#9c8ec4', '#443166');
      F.draw(ctx, label, x + 8, y + 3, '#a99bd0', { center: true, shadow: false });
      return;
    }

    const action = b.act === 'chart' ? 'E   FLY OUT' : (b.act === 'sell' ? 'E   SELL ALL' : (maxed ? 'MAXED OUT' : 'E   BUILD  $' + U.fmt(cost)));
    const info = b.max > 0 ? b.effect(lvl) : b.blurb;
    const w = Math.max(F.width(b.name, 2), F.width(info, 1), F.width(action, 1)) + 22;
    const h = 48;
    const y = topY - h - 10 + Math.sin(t * 4) * 1.5;

    ctx.fillStyle = '#5b3f96';
    ctx.fillRect(x - 1, y + h, 2, topY - y - h + 2);
    ctx.fillStyle = 'rgba(24,14,52,0.95)';
    ctx.fillRect(x - w / 2, y, w, h);
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - w / 2 + 0.5, y + 0.5, w - 1, h - 1);
    PD.glyph.draw(ctx, b.glyph, x - w / 2 + 3, y + 3, '#ffffff', '#ffd34d');
    F.draw(ctx, b.name, x + 8, y + 3, '#ffffff', { center: true, shadow: false, scale: 2 });
    F.draw(ctx, info, x, y + 20, '#7ef9ff', { center: true, shadow: false });
    if (b.max > 0) {
      const n = Math.min(b.max, 12);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = lvl > Math.floor(i * b.max / n) ? '#ffd34d' : '#3a2c5e';
        ctx.fillRect(x - n * 2.5 + i * 5, y + 29, 4, 3);
      }
    }
    F.draw(ctx, action, x, y + h - 10, maxed ? '#8affa0' : (afford || !cost ? '#ffd34d' : '#ff6b8a'), { center: true, shadow: false });
  }

  function draw(ctx, g, t) {
    const cam = Math.round(g.intCam);
    drawSky(ctx, g, t, cam);
    drawGround(ctx, cam, t);

    // fairy lights strung between the buildings: the moon should feel lived on
    ctx.save();
    ctx.strokeStyle = '#4a4460';
    ctx.lineWidth = 1;
    for (let i = 1; i < D.BUILDINGS.length; i++) {
      const a = D.BUILDINGS[i - 1], b2 = D.BUILDINGS[i];
      const ax = a.x - cam, bx2 = b2.x - cam;
      if (bx2 < -40 || ax > VW + 40) continue;
      const ay = groundY(a.x) - 46, by2 = groundY(b2.x) - 46;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + bx2) / 2, (ay + by2) / 2 + 16, bx2, by2);
      ctx.stroke();
      for (let k = 1; k < 5; k++) {
        const f = k / 5;
        const lx = ax + (bx2 - ax) * f;
        const ly = ay + (by2 - ay) * f + Math.sin(Math.PI * f) * 16;
        ctx.fillStyle = ['#ffd34d', '#ff8ad8', '#8affa0', '#7ef9ff'][(i + k) % 4];
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 3 + i + k);
        ctx.fillRect(lx - 1, ly - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // ruins first, they sit behind everything
    for (const r of RUINS) {
      const x = r.x - cam;
      if (x < -50 || x > VW + 50) continue;
      spr(ctx, AH.S['ruin' + r.k], 0, x, groundY(r.x) + 3);
    }
    for (const f of FLAGS) {
      const x = f.x - cam;
      if (x < -20 || x > VW + 20) continue;
      spr(ctx, AH.S.flag, Math.floor(t * 4) % 2, x, groundY(f.x) + 2);
    }

    // buildings
    for (const b of D.BUILDINGS) {
      const x = b.x - cam;
      if (x < -90 || x > VW + 90) continue;
      const gy = groundY(b.x);
      const lvl = g.buildLevel(b.id);
      let topY = gy;
      if (b.id === 'pad') {
        spr(ctx, AH.S.pad, Math.floor(t * 3) % 2, x, gy + 2);
        topY = gy - 24;
      } else if (lvl <= 0) {
        spr(ctx, AH.S.plot, 0, x, gy + 2);
        topY = gy - 16;
      } else {
        const s = AH.S[b.id + tierOf(lvl)];
        const bob = b.id === 'relic' ? Math.sin(t * 1.6) * 1.5 : 0;
        spr(ctx, s, 0, x, gy + 2 + bob);
        topY = gy - s.h + 2;
      }
      sign(ctx, g, b, x, topY, t);
    }

    // the pod, parked on the pad
    const pod = PD.art.skinFor(g.save.cos).pod;
    const padY = groundY(120);
    ctx.save();
    ctx.translate((120 - cam) | 0, (padY - 22 + Math.sin(t * 1.2) * 1.5) | 0);
    ctx.drawImage(pod.frames[0], -pod.ox, -pod.oy);
    ctx.restore();

    // critters
    for (const c of critters) {
      const x = c.x - cam;
      if (x < -20 || x > VW + 20) continue;
      const hop = Math.abs(Math.sin(c.t * 5)) * 5;
      ctx.save();
      ctx.translate(x | 0, (groundY(c.x) + 2 - hop) | 0);
      if (c.dir < 0) ctx.scale(-1, 1);
      const s = AH.S[c.spr];
      ctx.drawImage(s.frames[Math.floor(c.t * 6) % 2], -s.ox, -s.oy);
      ctx.restore();
    }

    // drifting dust motes catch the light
    for (const m of MOTES) {
      const x = ((m.x + t * m.sp) % ROOM_W) - cam;
      if (x < -4 || x > VW + 4) continue;
      ctx.fillStyle = '#c9bce8';
      ctx.globalAlpha = 0.15 + 0.25 * Math.sin(t * 2 + m.x);
      ctx.fillRect(x | 0, (m.y + Math.sin(t * 0.7 + m.x * 0.1) * 4) | 0, m.r > 1.2 ? 2 : 1, m.r > 1.2 ? 2 : 1);
    }
    ctx.globalAlpha = 1;

    // you
    const skin = PD.art.skinFor(g.save.cos);
    const walking = Math.abs(P.vx) > 8;
    const air = P.y < groundY(P.x) - 1;
    const set = air ? skin.alienFly : (walking ? skin.alienWalk : skin.alien);
    const frame = air ? Math.floor(t * 8) % 2 : (walking ? Math.floor(P.walk * 1.1) % 4 : (Math.sin(t * 1.3) > 0.9 ? 1 : 0));
    ctx.save();
    ctx.translate((P.x - cam) | 0, (P.y + 2) | 0);
    if (P.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(set.frames[frame], -set.ox, -set.oy);
    ctx.restore();
    if (walking && U.chance(0.2)) FX.dust(P.x - P.face * 5, P.y, 1, '#8e86a8', 10);

    // foreground boulders, moving a touch faster than the ground
    for (const r of FORE) {
      const x = r.x - cam * 1.15;
      if (x < -40 || x > VW + 40) continue;
      ctx.fillStyle = '#241a3a';
      ctx.beginPath();
      ctx.ellipse(x, r.y + r.s * 0.5, r.s, r.s * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#31264f';
      ctx.beginPath();
      ctx.ellipse(x - r.s * 0.2, r.y + r.s * 0.2, r.s * 0.7, r.s * 0.34, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
  }

  PD.home = { enter, update, draw, P, groundY, ROOM_W };
})(window.PD);
