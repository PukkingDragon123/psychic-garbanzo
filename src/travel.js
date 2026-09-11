/* THE CROSSING.
   Picking a world on the chart used to teleport you there between two frames.
   Now you have to actually fly it, and it takes as long as it takes: a launch
   off the moon, a long run through a rock field that is genuinely trying to
   hit you, a burn-in, and a landing you have to set down yourself.

   Everything in here is one screen wide and hand-steered. The pod sits on the
   left, the field comes at you from the right, and the only thing you do is
   not be where a rock is. Three upgrades make that easier -- a WARP COIL that
   shortens the trip and sharpens the turn, a DEFLECTOR that eats rocks before
   they reach the paint, and a NAV COMPUTER that calls them out early -- so the
   twentieth crossing is nothing like the first. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const FX = PD.fx;
  const D = PD.data;

  const VW = 480, VH = 270;
  const LANE = { x0: 34, x1: 286, y0: 34, y1: VH - 40 };

  const S = {
    phase: 'launch', t: 0, index: 0, body: null,
    dur: 14, dist: 0, rocks: [], stars: [], dust: [],
    px: 90, py: VH / 2, vx: 0, vy: 0, tilt: 0,
    hits: 0, shield: 0, shieldMax: 0, shieldT: 0, invuln: 0,
    shake: 0, spawn: 0, warpK: 1, handling: 1, navLead: 0,
    planet: null, legs: 0, land: 0, touched: 0, saidT: 0, said: '',
    flashT: 0, flashCol: '#ffffff'
  };

  /* ------------------------------------------------------------------ setup */
  function rockShape(r) {
    const n = U.randInt(6, 9), pts = [];
    for (let i = 0; i < n; i++) {
      const a = i * U.TAU / n + U.rand(-0.18, 0.18);
      const rr = r * U.rand(0.7, 1.26);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    return pts;
  }

  function enter(g, index) {
    const b = D.BODIES[index];
    const upg = g.save.upg;
    const lv = id => (upg[id] || 0) + (g.brain ? 0 : 0);
    const warp = lv('warp'), defl = lv('deflector'), nav = lv('navcom');

    S.phase = 'launch'; S.t = 0; S.index = index; S.body = b;
    /* Far worlds are long trips. Every level of coil takes six per cent off,
       so a maxed one turns a forty-second haul into a twenty-two. */
    S.dur = Math.max(7, (11 + index * 2.8) * (1 - warp * 0.06));
    S.dist = 0;
    S.rocks.length = 0; S.dust.length = 0;
    S.px = 74; S.py = VH / 2; S.vx = 0; S.vy = 0; S.tilt = 0;
    S.hits = 0; S.invuln = 0; S.shake = 0; S.spawn = 0.9;
    S.shieldMax = defl; S.shield = defl; S.shieldT = 0;
    S.handling = 1 + warp * 0.09;
    S.navLead = nav * 0.28;
    S.fieldK = 1 - nav * 0.05;                    // the box also thins the field
    S.legs = 0; S.land = 0; S.touched = 0; S.flashT = 0;
    S.planet = PD.arthome.buildPlanet(320, b.tint, 100 + index * 17, planetKind(b.type));
    S.stars = [];
    for (let i = 0; i < 150; i++) {
      S.stars.push({ x: U.rand(0, VW), y: U.rand(0, VH), z: U.rand(0.25, 1), s: U.chance(0.12) ? 2 : 1 });
    }
    say('DEPARTING. NOBODY WAVED.');
    A.sfx.warp();
    g.state = 'travel';
  }

  function planetKind(type) {
    if (type === 'ice') return 'ice';
    if (type === 'volcanic') return 'volcanic';
    if (type === 'gem' || type === 'titan') return 'gem';
    if (type === 'metal') return 'metal';
    if (type === 'core') return 'core';
    if (type === 'terra') return 'terra';
    return 'moon';
  }

  function say(line) { S.said = line; S.saidT = 2.6; }

  /* ----------------------------------------------------------------- update */
  function update(dt, g) {
    S.t += dt;
    S.shake = Math.max(0, S.shake - dt * 3.2);
    S.invuln = Math.max(0, S.invuln - dt);
    S.saidT = Math.max(0, S.saidT - dt);
    S.flashT = Math.max(0, S.flashT - dt * 3.4);

    const IN = PD.input;
    if (IN.hit('Escape') && S.phase !== 'land') { g.openChart(); return; }

    for (const st of S.stars) {
      st.x -= (40 + st.z * 380) * dt * speedK();
      if (st.x < 0) { st.x += VW; st.y = U.rand(0, VH); }
    }
    for (let i = S.dust.length - 1; i >= 0; i--) {
      const d = S.dust[i];
      d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
      d.vx *= 1 - dt * 1.4; d.vy *= 1 - dt * 1.4;
      if (d.life <= 0) S.dust.splice(i, 1);
    }

    if (S.phase === 'launch') { launch(dt); return; }
    if (S.phase === 'cruise') { cruise(dt, g); return; }
    if (S.phase === 'approach') { approach(dt, g); return; }
    land(dt, g);
  }

  function speedK() {
    if (S.phase === 'launch') return U.clamp(S.t / 1.8, 0, 1);
    if (S.phase === 'approach') return 1 - U.smoothstep(0, 2.4, S.t) * 0.7;
    if (S.phase === 'land') return 0.06;
    return 1;
  }

  function launch(dt) {
    // he climbs out of the bottom of the frame on a column of fire
    const f = U.clamp(S.t / 1.8, 0, 1);
    S.py = U.lerp(VH + 40, VH / 2, U.smoothstep(0, 1, f));
    S.px = 74;
    if (U.chance(0.9)) {
      S.dust.push({ x: S.px - 8, y: S.py + 10, vx: U.rand(-40, -160), vy: U.rand(-24, 46),
        life: U.rand(0.3, 0.8), col: U.chance(0.4) ? '#ffd27a' : '#ff8a3d', r: U.rand(1, 3) });
    }
    if (S.t > 1.8) { S.phase = 'cruise'; S.t = 0; say('WATCH THE ROCKS.'); }
  }

  /* The dodging. Steering is a thrust, not a teleport, so the pod has weight
     and the coil is worth buying; rocks are spawned on a curve that gets
     meaner as the trip goes on, and the nav box both warns you early and
     thins the field. */
  function steer(dt) {
    const IN = PD.input;
    const m = IN.mouse;
    const acc = 620 * S.handling;
    let ax = 0, ay = 0;
    if (IN.keys.left) ax -= 1;
    if (IN.keys.right) ax += 1;
    if (IN.keys.up) ay -= 1;
    if (IN.keys.down) ay += 1;
    // holding the pointer flies straight at it, which is the whole control
    // scheme on a mouse and the one everyone tries first
    if (!ax && !ay && m.inside && m.left) {
      const dx = m.x - S.px, dy = m.y - S.py;
      const d = Math.max(1, Math.hypot(dx, dy));
      if (d > 3) { ax = dx / d; ay = dy / d; }
    }
    S.vx += ax * acc * dt; S.vy += ay * acc * dt;
    S.vx *= 1 - Math.min(0.6, dt * 5.2); S.vy *= 1 - Math.min(0.6, dt * 5.2);
    S.px = U.clamp(S.px + S.vx * dt, LANE.x0, LANE.x1);
    S.py = U.clamp(S.py + S.vy * dt, LANE.y0, LANE.y1);
    if (S.px <= LANE.x0 || S.px >= LANE.x1) S.vx *= 0.3;
    if (S.py <= LANE.y0 || S.py >= LANE.y1) S.vy *= 0.3;
    S.tilt = U.damp(S.tilt, U.clamp(S.vy / 260, -1, 1), 0.3, dt);
    if (U.chance(0.6)) {
      S.dust.push({ x: S.px - 11, y: S.py + 2, vx: U.rand(-120, -230), vy: U.rand(-12, 12),
        life: U.rand(0.12, 0.3), col: U.chance(0.5) ? '#7ef9ff' : '#ffd27a', r: 1 });
    }
  }

  function spawnRock() {
    const hard = U.clamp(S.t / S.dur, 0, 1);
    const r = U.rand(4, 7 + hard * 9);
    const y = U.rand(LANE.y0 - 8, LANE.y1 + 8);
    // the nav box sees them earlier, so they are spawned further out when you
    // own one -- the warning is real lead time, not a cosmetic arrow
    const lead = S.navLead * 110;
    S.rocks.push({
      x: VW + 24 + lead, y, r, pts: rockShape(r),
      vx: -(96 + hard * 78 + U.rand(0, 60)), vy: U.rand(-22, 22),
      a: U.rand(0, U.TAU), va: U.rand(-2.6, 2.6),
      ice: U.chance(0.22)
    });
  }

  function hitPod(g) {
    if (S.invuln > 0) return;
    if (S.shield > 0) {
      S.shield--; S.shieldT = 0;
      S.invuln = 0.5; S.shake = 0.6;
      S.flashT = 0.8; S.flashCol = '#7ef9ff';
      A.sfx.tone(880, { type: 'square', to: 300, dur: 0.14, vol: 0.11 });
      for (let i = 0; i < 14; i++) {
        S.dust.push({ x: S.px, y: S.py, vx: U.rand(-160, 160), vy: U.rand(-160, 160),
          life: U.rand(0.2, 0.5), col: '#7ef9ff', r: U.rand(1, 2) });
      }
      return;
    }
    S.hits++;
    S.invuln = 1.2; S.shake = 1;
    S.flashT = 1; S.flashCol = '#ff5a4d';
    S.vx -= 90; S.vy += U.rand(-140, 140);
    A.sfx.hurt();
    PD.touch.buzz(26);
    for (let i = 0; i < 22; i++) {
      S.dust.push({ x: S.px, y: S.py, vx: U.rand(-220, 120), vy: U.rand(-180, 180),
        life: U.rand(0.3, 0.8), col: U.chance(0.5) ? '#ff8a3d' : '#c9bce8', r: U.rand(1, 3) });
    }
    say(U.pick(['OW.', 'THAT WAS THE PAINT.', 'IT IS FINE. IT IS FINE.', 'WHO PUT THAT THERE.']));
  }

  function cruise(dt, g) {
    steer(dt);
    S.dist = U.clamp(S.t / S.dur, 0, 1);

    // the field thickens as you get further out, and the nav box thins it
    const hard = S.dist;
    S.spawn -= dt;
    if (S.spawn <= 0) {
      spawnRock();
      S.spawn = (0.62 - hard * 0.34) / S.fieldK * U.rand(0.6, 1.4);
    }

    if (S.shieldMax > 0 && S.shield < S.shieldMax) {
      S.shieldT += dt;
      const need = Math.max(6, 16 - S.shieldMax);
      if (S.shieldT >= need) { S.shieldT = 0; S.shield++; A.sfx.tone(520, { type: 'triangle', to: 900, dur: 0.16, vol: 0.08 }); }
    }

    for (let i = S.rocks.length - 1; i >= 0; i--) {
      const k = S.rocks[i];
      k.x += k.vx * dt; k.y += k.vy * dt; k.a += k.va * dt;
      if (k.y < LANE.y0 - 20 || k.y > LANE.y1 + 20) k.vy = -k.vy;
      if (k.x < -30) { S.rocks.splice(i, 1); continue; }
      // the pod is a squat ellipse, so the hit box is too
      const dx = (k.x - S.px) / (k.r + 16), dy = (k.y - S.py) / (k.r + 10);
      if (dx * dx + dy * dy < 1) {
        hitPod(g);
        k.vx = Math.abs(k.vx) * 0.5; k.vy += U.rand(-90, 90);
        S.rocks.splice(i, 1);
      }
    }

    if (S.t >= S.dur) { S.phase = 'approach'; S.t = 0; say('THAT IS THE ONE. BRACE.'); A.sfx.tone(220, { type: 'sawtooth', to: 90, dur: 0.7, vol: 0.1 }); }
  }

  function approach(dt, g) {
    steer(dt);
    // nothing new arrives; whatever is still out there streams past
    for (let i = S.rocks.length - 1; i >= 0; i--) {
      const k = S.rocks[i];
      k.x += k.vx * dt * 1.3; k.y += k.vy * dt; k.a += k.va * dt;
      if (k.x < -30) S.rocks.splice(i, 1);
    }
    // slide him back to the middle for the descent
    S.px = U.damp(S.px, 200, 0.5, dt);
    S.py = U.damp(S.py, 92, 0.5, dt);
    if (S.t > 2.4) { S.phase = 'land'; S.t = 0; say('LANDING. PROBABLY.'); }
  }

  /* The set-down. Retro-burn, legs out, dust, thump -- and only then does the
     dive actually begin. */
  function land(dt, g) {
    const t = S.t;
    for (let i = S.rocks.length - 1; i >= 0; i--) {
      const k = S.rocks[i];
      k.x += k.vx * dt * 0.5; k.y += k.vy * dt * 0.5; k.a += k.va * dt * 0.5;
      if (k.x < -30) S.rocks.splice(i, 1);
    }
    S.legs = U.clamp((t - 1.1) / 0.7, 0, 1);
    const groundY = VH - 46;
    if (t < 2.9) {
      S.py = U.lerp(92, groundY, U.smoothstep(0, 2.9, t));
      S.px = U.damp(S.px, 200, 0.4, dt);
      if (U.chance(0.85)) {
        S.dust.push({ x: S.px + U.rand(-6, 6), y: S.py + 10, vx: U.rand(-30, 30), vy: U.rand(40, 150),
          life: U.rand(0.2, 0.5), col: U.chance(0.5) ? '#ffd27a' : '#ff8a3d', r: U.rand(1, 3) });
      }
      // the surface answers back: dust kicked up off the rock below him
      if (t > 1.9 && U.chance(0.8)) {
        S.dust.push({ x: S.px + U.rand(-26, 26), y: groundY + 10, vx: U.rand(-130, 130), vy: U.rand(-60, -10),
          life: U.rand(0.4, 1), col: S.body.tint, r: U.rand(1, 3) });
      }
    } else if (!S.touched) {
      S.touched = 1; S.shake = 1.2;
      A.sfx.dock ? A.sfx.dock() : A.sfx.tone(120, { type: 'square', dur: 0.3, vol: 0.14 });
      FX.flash(0.3, '#ffe0a0');
      for (let i = 0; i < 40; i++) {
        S.dust.push({ x: S.px + U.rand(-14, 14), y: groundY + 10, vx: U.rand(-230, 230), vy: U.rand(-110, 10),
          life: U.rand(0.5, 1.3), col: U.chance(0.4) ? '#fff3c0' : S.body.tint, r: U.rand(1, 4) });
      }
      say('TOUCHDOWN. NOBODY DIED.');
    }
    if (t > 4.2) arrive(g);
  }

  /* What the crossing was worth. Rocks you ate come off the hull you start the
     dive with, and a clean run pays. */
  function arrive(g) {
    const dmg = S.hits;
    g.travelResult = { hits: dmg, clean: dmg === 0 };
    g.dive(S.index);
    const p = g.player;
    if (dmg > 0) {
      p.hull = Math.max(p.stat('hull') * 0.25, p.hull - dmg * p.stat('hull') * 0.12);
      FX.text(p.x, p.y - 30, '-' + dmg + ' HULL', '#ff5a4d', 1);
    } else {
      const bonus = Math.round(400 + S.index * 340);
      g.save.credits += bonus; g.save.totalEarned += bonus;
      FX.text(p.x, p.y - 30, 'CLEAN RUN +$' + U.fmt(bonus), '#8affa0', 2);
      A.sfx.fanfare && A.sfx.fanfare();
    }
  }

  /* ------------------------------------------------------------------- draw */
  /* The pod, drawn at a bit over half size so the lane has room to dodge in,
     with the burn and the landing legs hung off the sprite's own edges rather
     than off guessed numbers. */
  const POD_K = 0.6;
  function pod(ctx, g, x, y, tilt, thrust) {
    const spr = PD.art.skinFor(g.save.cos).pod;
    const t = PD.game.time;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(tilt * 0.3);
    ctx.scale(POD_K, POD_K);
    const back = -spr.ox + 3, bottom = spr.oy - 4;
    if (S.phase === 'land' && !S.touched) {
      // the retro-burn fires DOWNWARD on the way in, not backwards
      const L = 14 + thrust * 26 + Math.sin(t * 40) * 5;
      X.poly(ctx, [[-14, bottom], [0, bottom + L], [14, bottom]], '#ff8a3d');
      X.poly(ctx, [[-7, bottom], [0, bottom + L * 0.6], [7, bottom]], '#fff3c0');
    } else if (thrust > 0.02) {
      const L = 16 + thrust * 30 + Math.sin(t * 40) * 5;
      X.poly(ctx, [[back, -9], [back - L, 0], [back, 9]], '#ff8a3d');
      X.poly(ctx, [[back, -5], [back - L * 0.55, 0], [back, 5]], '#fff3c0');
    }
    if (S.legs > 0.02) {
      const L = 6 + S.legs * 18;
      for (const dx of [-22, 0, 22]) {
        X.line(ctx, dx, bottom - 2, dx * 1.3, bottom + L, '#1a2030', 5);
        X.line(ctx, dx, bottom - 2, dx * 1.3, bottom + L, '#9aa6b8', 3);
        X.rect(ctx, dx * 1.3 - 8, bottom + L, 17, 5, '#3a4456');
        X.rect(ctx, dx * 1.3 - 7, bottom + L, 15, 2, '#c8d6ea');
      }
    }
    ctx.drawImage(spr.frames[Math.floor(t * 8) % 2], -spr.ox, -spr.oy);
    ctx.restore();
  }

  function hud(ctx, g) {
    const b = S.body;
    // the run bar: where you set off, where you are, where you are going
    const x0 = 96, x1 = VW - 24, y = 16;
    X.plate(ctx, 86, 7, VW - 104, 18, 'rgba(10,6,26,0.8)', '#3c2f66', '#0a0618', 3);
    X.rect(ctx, x0, y, x1 - x0, 1, '#3c2f66');
    for (let i = 0; i <= 10; i++) X.rect(ctx, x0 + (x1 - x0) * i / 10, y - 2, 1, 5, '#4a3a78');
    const f = S.phase === 'launch' ? 0 : (S.phase === 'cruise' ? S.dist : 1);
    PD.glyph.draw(ctx, 'home', x0 - 8, y - 7, '#8a7ab0', '#4a3a78');
    PD.glyph.draw(ctx, 'planet', x1 - 5, y - 7, b.tint, '#4a3a78');
    const mx = Math.round(x0 + (x1 - x0) * f);
    X.rect(ctx, x0, y, mx - x0, 1, '#7ef9ff');
    X.poly(ctx, [[mx - 4, y - 4], [mx + 4, y], [mx - 4, y + 4]], '#7ef9ff');

    F.draw(ctx, b.name.toUpperCase(), 10, 8, '#ffd34d', { shadow: '#0b0718' });
    F.draw(ctx, b.kind.toUpperCase(), 10, 17, '#8a7ab0', { shadow: '#0b0718' });

    // hull pips and shield pips, both read at a glance and neither is a number
    const hp = Math.max(0, 5 - S.hits);
    for (let i = 0; i < 5; i++) {
      X.plate(ctx, 10 + i * 9, 28, 7, 8, i < hp ? '#ff5a4d' : '#2a1c33', i < hp ? '#ffb0a8' : null, '#140c22', 2);
    }
    for (let i = 0; i < S.shieldMax; i++) {
      const on = i < S.shield;
      PD.glyph.hex(ctx, 14 + i * 10, 46, 4, on ? '#7ef9ff' : '#1e2a44', on ? '#eafcff' : '#2a3a58', 1);
    }
    if (S.saidT > 0) {
      ctx.globalAlpha = Math.min(1, S.saidT * 1.6);
      F.draw(ctx, S.said, VW / 2, VH - 16, '#ffe9a8', { center: true, shadow: '#0b0718' });
      ctx.globalAlpha = 1;
    }
    if (S.phase === 'cruise') {
      const left = Math.max(0, S.dur - S.t);
      F.draw(ctx, 'ETA ' + left.toFixed(1) + 's', VW - 10, 30, '#8a7ab0', { right: true, shadow: '#0b0718' });
    }
  }

  function draw(ctx, g, time) {
    const b = S.body || D.BODIES[0];
    // deep space, tinted by where you are headed
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, b.sky || '#0b0720');
    grd.addColorStop(1, '#04030d');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    PD.galaxy.ensure(400 + S.index * 31);

    const sh = S.shake > 0 ? S.shake * S.shake * 4 : 0;
    ctx.save();
    if (sh) ctx.translate(Math.round(U.rand(-sh, sh)), Math.round(U.rand(-sh, sh)));

    // stars, streaked by how fast you are going
    const sk = speedK();
    for (const st of S.stars) {
      const len = 1 + st.z * 16 * sk;
      ctx.globalAlpha = 0.3 + st.z * 0.6;
      ctx.fillStyle = st.z > 0.8 ? '#ffffff' : (st.z > 0.5 ? '#c9d8ff' : '#7a6aa8');
      ctx.fillRect(st.x | 0, st.y | 0, Math.max(st.s, len | 0), st.s);
    }
    ctx.globalAlpha = 1;

    drawPlanet(ctx, g);

    // the rocks
    for (const k of S.rocks) {
      const co = Math.cos(k.a), si = Math.sin(k.a);
      const at = (p, grow) => [k.x + (p[0] * co - p[1] * si) * grow, k.y + (p[0] * si + p[1] * co) * grow];
      X.poly(ctx, k.pts.map(p => at(p, 1.3)), '#140c22');
      X.poly(ctx, k.pts.map(p => at(p, 1)), k.ice ? '#79c4de' : '#8a6a4f');
      X.poly(ctx, k.pts.slice(0, 3).map(p => at(p, 0.6)), k.ice ? '#d4eef7' : '#b08a6a');
    }

    for (const d of S.dust) {
      ctx.globalAlpha = Math.min(1, d.life * 2.4);
      X.rect(ctx, d.x, d.y, d.r, d.r, d.col);
    }
    ctx.globalAlpha = 1;

    if (S.phase === 'land') {
      const f = U.clamp(S.t / 1.4, 0, 1);
      drawGround(ctx, VH - 36 + (1 - f) * 60, S.body.tint, S.index + 3, S.px);
    } else if (S.phase === 'launch') {
      // the moon he is leaving, dropping away underneath him
      drawGround(ctx, VH - 24 + S.t * 150, '#8e86a8', 11, null);
    }

    const thrust = S.phase === 'launch' ? 1 : (S.phase === 'land' && !S.touched ? 0.8 : 0.35);
    if (!(S.invuln > 0 && Math.floor(time * 22) % 2)) {
      pod(ctx, g, S.px, S.py, S.phase === 'land' ? 0 : S.tilt, thrust);
    }
    if (S.shield > 0 && S.phase !== 'land') {
      const pu = 1 + Math.sin(time * 6) * 0.05;
      PD.glyph.hex(ctx, S.px, S.py, 17 * pu, null, 'rgba(126,249,255,' + (0.3 + S.shield / Math.max(1, S.shieldMax) * 0.4).toFixed(2) + ')', 1);
    }
    ctx.restore();

    // rocks still off the right edge get called out, if you paid for that
    if (S.navLead > 0 && (S.phase === 'cruise' || S.phase === 'approach')) {
      for (const k of S.rocks) {
        if (k.x < VW - 4) continue;
        const y = U.clamp(k.y, 8, VH - 8);
        const blink = Math.sin(time * 16) > -0.3;
        if (!blink) continue;
        X.poly(ctx, [[VW - 3, y], [VW - 11, y - 5], [VW - 11, y + 5]], '#ffd34d');
      }
    }

    if (S.flashT > 0) {
      ctx.fillStyle = S.flashCol === '#ff5a4d'
        ? 'rgba(255,90,77,' + (S.flashT * 0.4).toFixed(2) + ')'
        : 'rgba(126,249,255,' + (S.flashT * 0.32).toFixed(2) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }

    hud(ctx, g);
    PD.touch.draw(ctx, touchMode(), g);
  }

  /* The destination, growing out of a dot on the horizon. One canvas, scaled:
     the planet is already blocky, so a nearest-neighbour squeeze of it still
     reads as pixels. */
  function drawPlanet(ctx, g) {
    if (!S.planet) return;
    let size, cx, cy;
    if (S.phase === 'launch') { size = 14; cx = VW - 40; cy = 60; }
    else if (S.phase === 'cruise') { size = 14 + S.dist * 26; cx = VW - 40; cy = 60; }
    else if (S.phase === 'approach') {
      const f = U.smoothstep(0, 2.4, S.t);
      size = U.lerp(40, 420, f * f);
      cx = U.lerp(VW - 40, 200, f); cy = U.lerp(60, VH + 120, f);
    } else {
      size = 420; cx = 200; cy = VH + 120;
      // once the horizon is in, the round world is just a pale plate behind it
      ctx.globalAlpha = U.clamp(1 - S.t / 1.2, 0, 1);
    }
    const s = Math.round(size);
    ctx.drawImage(S.planet, 0, 0, S.planet.width, S.planet.height,
      Math.round(cx - s / 2), Math.round(cy - s / 2), s, s);
    ctx.globalAlpha = 1;
  }

  /* Ground, close up: a jagged horizon in the body's own colour with a flat
     pad cleared where the pod is coming down. Hard edges only -- it is the
     same rock you are about to drill. Used for the moon you leave as well as
     the world you arrive at, so both ends of the trip have somewhere solid. */
  function drawGround(ctx, baseY, tint, seed, padX) {
    const dark = shade(tint, 0.46), mid = shade(tint, 0.72);
    const lit = shade(tint, 1.05), hi = shade(tint, 1.4);
    for (let x = 0; x < VW; x += 3) {
      const h = Math.round(Math.sin(x * 0.031 + seed) * 5 + Math.sin(x * 0.0113 + seed * 2) * 9
        + Math.sin(x * 0.09) * 1.5);
      const flat = padX !== null && Math.abs(x - padX) < 38 ? 0 : h;
      const y = Math.round(baseY + flat);
      if (y > VH) continue;
      X.rect(ctx, x, y + 4, 3, VH - y, dark);
      X.rect(ctx, x, y + 1, 3, 4, mid);
      X.rect(ctx, x, y, 3, 1, lit);
      // speckle, so it is regolith and not a painted slab
      for (let k = 0; k < 3; k++) {
        const hv = U.hash2(x, Math.round(seed) + k * 17);
        if (hv > 0.72) X.rect(ctx, x + (k % 3), y + 7 + (hv * 46 | 0), 1, 1, k ? shade(tint, 0.3) : hi);
      }
      if (U.hash2(x, Math.round(seed) + 3) > 0.9) X.rect(ctx, x, y + 3, 3, 3, shade(tint, 0.3));
    }
    if (padX !== null) {
      // the pad he is aiming at, marked out in lights that run inwards
      const t = PD.game.time;
      for (let i = -3; i <= 3; i++) {
        const on = (Math.floor(t * 7) + i + 8) % 4 === 0;
        X.plate(ctx, padX + i * 11 - 2, baseY - 5, 5, 4, on ? '#ffd34d' : '#6a5a2a', on ? '#fff3c0' : null, '#241a08', 1);
      }
      X.rect(ctx, padX - 38, baseY - 1, 76, 1, 'rgba(255,211,77,0.5)');
    }
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = U.clamp(((n >> 16) & 255) * f, 0, 255) | 0;
    const g2 = U.clamp(((n >> 8) & 255) * f, 0, 255) | 0;
    const b2 = U.clamp((n & 255) * f, 0, 255) | 0;
    return 'rgb(' + r + ',' + g2 + ',' + b2 + ')';
  }

  function touchMode() { return S.phase === 'cruise' || S.phase === 'approach' ? 'travel' : 'ui'; }

  PD.travel = { enter, update, draw, touchMode, S };
})(window.PD);
