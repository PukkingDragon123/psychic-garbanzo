/* THE CROSSING, both ways.
   Picking a world on the chart used to teleport you there between two frames.
   Now you fly it, and when you are done you fly home again with the hold full.

   The trip out is the sharper one: a launch off the moon, a run through a rock
   field that is genuinely trying to hit you, a burn-in and a landing. The trip
   home is the chill one -- half the rocks, a shorter haul, and mostly things to
   look at rather than dodge.

   Neither leg is a shooting gallery. Rocks drift rather than sprint, every one
   is telegraphed, and there is as much out there worth steering TOWARDS as
   away from: scrap to scoop, repair kits, Reaver skiffs that whistle past,
   Nova Watch cutters that scan you and lose interest, drifting hulks and one
   enormous animal that has no opinion about any of it.

   Three upgrades make it easier -- a WARP COIL that shortens the trip and
   sharpens the turn, a DEFLECTOR that eats rocks before they reach the paint,
   and a NAV COMPUTER that calls them out early. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const FX = PD.fx;
  const D = PD.data;

  const VW = 480, VH = 270;
  const LANE = { x0: 30, x1: 300, y0: 30, y1: VH - 34 };
  const MOON_TINT = '#8e86a8';

  const S = {
    phase: 'launch', t: 0, index: 0, body: null, dir: 'out', ore: 0,
    dur: 14, dist: 0, rocks: [], things: [], stars: [], dust: [], bits: [],
    px: 90, py: VH / 2, vx: 0, vy: 0, tilt: 0,
    hits: 0, shield: 0, shieldMax: 0, shieldT: 0, invuln: 0,
    shake: 0, spawn: 0, evt: 0, handling: 1, navLead: 0, fieldK: 1,
    planet: null, moon: null, legs: 0, touched: 0, saidT: 0, said: '',
    flashT: 0, flashCol: '#ffffff', gained: 0
  };

  /* ------------------------------------------------------------------ setup */
  function lump(r, n) {
    const pts = [];
    n = n || U.randInt(6, 9);
    for (let i = 0; i < n; i++) {
      const a = i * U.TAU / n + U.rand(-0.18, 0.18);
      const rr = r * U.rand(0.7, 1.26);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    return pts;
  }

  function common(g, index) {
    const upg = g.save.upg;
    const warp = upg.warp || 0, defl = upg.deflector || 0, nav = upg.navcom || 0;
    S.t = 0; S.index = index; S.body = D.BODIES[index];
    S.dist = 0;
    S.rocks.length = 0; S.things.length = 0; S.dust.length = 0; S.bits.length = 0;
    S.px = 74; S.py = VH / 2; S.vx = 0; S.vy = 0; S.tilt = 0;
    S.hits = 0; S.invuln = 0; S.shake = 0; S.spawn = 1.4; S.evt = U.rand(3, 6);
    S.shieldMax = defl; S.shield = defl; S.shieldT = 0;
    S.handling = 1 + warp * 0.09;
    S.navLead = nav * 0.28;
    S.legs = 0; S.touched = 0; S.flashT = 0; S.gained = 0;
    S.stars = [];
    for (let i = 0; i < 150; i++) {
      S.stars.push({ x: U.rand(0, VW), y: U.rand(0, VH), z: U.rand(0.25, 1), s: U.chance(0.12) ? 2 : 1 });
    }
    if (!S.moon) S.moon = PD.arthome.buildPlanet(320, MOON_TINT, 4, 'moon');
    S.planet = PD.arthome.buildPlanet(320, S.body.tint, 100 + index * 17, planetKind(S.body.type));
    A.sfx.warp();
    g.state = 'travel';
    return warp;
  }

  /* Out: the long leg, the full field, and the hull you arrive with matters. */
  function enter(g, index) {
    const warp = common(g, index);
    S.dir = 'out'; S.phase = 'launch'; S.ore = 0;
    PD.chum.call(g, 'travel');
    S.dur = Math.max(7, (11 + index * 2.6) * (1 - warp * 0.06));
    S.fieldK = 1 - (g.save.upg.navcom || 0) * 0.05;
    say('DEPARTING. NOBODY WAVED.');
  }

  /* Home: shorter, thinner, and nothing out there can take the hold off you --
     it can only shake a rock or two loose. You have earned a quiet ride. */
  function enterReturn(g, ore) {
    const warp = common(g, g.bodyIndex || 0);
    S.dir = 'home'; S.phase = 'launch'; S.ore = ore || 0;
    S.dur = Math.max(6, (8 + S.index * 1.5) * (1 - warp * 0.06));
    S.fieldK = (1 - (g.save.upg.navcom || 0) * 0.05) * 0.55;
    S.evt = U.rand(2, 4);
    say(S.ore > 0 ? 'HOLD IS FULL. GOING HOME.' : 'NOTHING IN THE HOLD. GOING HOME ANYWAY.');
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

  function say(line) { S.said = line; S.saidT = 3; }
  function fromTint() { return S.dir === 'out' ? MOON_TINT : S.body.tint; }
  function toTint() { return S.dir === 'out' ? S.body.tint : MOON_TINT; }
  function toName() { return S.dir === 'out' ? S.body.name : 'HOME'; }
  function toCanvasImg() { return S.dir === 'out' ? S.planet : S.moon; }

  /* ----------------------------------------------------------------- update */
  function update(dt, g) {
    S.t += dt;
    S.shake = Math.max(0, S.shake - dt * 3.2);
    S.invuln = Math.max(0, S.invuln - dt);
    S.saidT = Math.max(0, S.saidT - dt);
    S.flashT = Math.max(0, S.flashT - dt * 3.4);

    const IN = PD.input;
    if (IN.hit('Escape') && S.phase !== 'land' && S.dir === 'out') { g.openChart(); return; }

    for (const st of S.stars) {
      st.x -= (40 + st.z * 300) * dt * speedK();
      if (st.x < 0) { st.x += VW; st.y = U.rand(0, VH); }
    }
    for (let i = S.dust.length - 1; i >= 0; i--) {
      const d = S.dust[i];
      d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
      d.vx *= 1 - dt * 1.4; d.vy *= 1 - dt * 1.4;
      if (d.life <= 0) S.dust.splice(i, 1);
    }
    // pieces of his own ship, tumbling away behind him for ever
    for (let i = S.bits.length - 1; i >= 0; i--) {
      const b = S.bits[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt; b.life -= dt;
      if (b.life <= 0) S.bits.splice(i, 1);
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
    const f = U.clamp(S.t / 1.8, 0, 1);
    S.py = U.lerp(VH + 40, VH / 2, U.smoothstep(0, 1, f));
    S.px = 74;
    if (U.chance(0.9)) {
      S.dust.push({ x: S.px - 8, y: S.py + 10, vx: U.rand(-40, -160), vy: U.rand(-24, 46),
        life: U.rand(0.3, 0.8), col: U.chance(0.4) ? '#ffd27a' : '#ff8a3d', r: U.rand(1, 3) });
    }
    if (S.t > 1.8) {
      S.phase = 'cruise'; S.t = 0;
      say(S.dir === 'out' ? 'WATCH THE ROCKS.' : 'EASY DOES IT.');
    }
  }

  /* Steering is a thrust, not a teleport, so the pod has weight and the coil
     is worth buying. Pointer, keys and the phone stick all feed the same two
     numbers, so nothing is second-class. */
  function steer(dt) {
    const IN = PD.input;
    const m = IN.mouse;
    const acc = 700 * S.handling;
    let ax = 0, ay = 0;
    const axis = PD.touch.axis ? PD.touch.axis() : null;
    if (axis && axis.on) { ax = axis.x; ay = axis.y; }
    else {
      if (IN.down('left')) ax -= 1;
      if (IN.down('right')) ax += 1;
      if (IN.down('up')) ay -= 1;
      if (IN.down('down')) ay += 1;
      // holding the pointer flies straight at it -- the thing everyone tries
      if (!ax && !ay && m.inside && m.left) {
        const dx = m.x - S.px, dy = m.y - S.py;
        const d = Math.max(1, Math.hypot(dx, dy));
        if (d > 3) { ax = dx / d; ay = dy / d; }
      }
    }
    S.vx += ax * acc * dt; S.vy += ay * acc * dt;
    S.vx *= 1 - Math.min(0.6, dt * 4.6); S.vy *= 1 - Math.min(0.6, dt * 4.6);
    S.px = U.clamp(S.px + S.vx * dt, LANE.x0, LANE.x1);
    S.py = U.clamp(S.py + S.vy * dt, LANE.y0, LANE.y1);
    if (S.px <= LANE.x0 || S.px >= LANE.x1) S.vx *= 0.3;
    if (S.py <= LANE.y0 || S.py >= LANE.y1) S.vy *= 0.3;
    S.tilt = U.damp(S.tilt, U.clamp(S.vy / 260, -1, 1), 0.3, dt);
    if (U.chance(0.6)) {
      S.dust.push({ x: S.px - 11, y: S.py + 2, vx: U.rand(-120, -200), vy: U.rand(-12, 12),
        life: U.rand(0.12, 0.3), col: U.chance(0.5) ? '#7ef9ff' : '#ffd27a', r: 1 });
    }
  }

  /* Rocks drift. The big ones drift SLOWEST, so the scary-looking thing is
     always the one you have the most time to get round. */
  function spawnRock() {
    const hard = U.clamp(S.t / S.dur, 0, 1);
    const big = U.chance(0.28);
    const r = big ? U.rand(11, 19) : U.rand(4, 8);
    const y = U.rand(LANE.y0 - 6, LANE.y1 + 6);
    const lead = S.navLead * 110;
    const speed = big ? U.rand(44, 72) : (62 + hard * 44 + U.rand(0, 34));
    S.rocks.push({
      x: VW + 24 + lead, y, r, pts: lump(r),
      vx: -speed, vy: U.rand(-14, 14),
      a: U.rand(0, U.TAU), va: U.rand(-1.8, 1.8),
      ice: U.chance(0.22)
    });
  }

  /* --------------------------------------------------------------- the traffic
     Everything that is not a rock. Some of it is worth flying into. */
  const NPC_LINES = {
    skiff: ['REAVER SKIFF: NICE POD. SHAME.', 'BLUEFIN WHISTLED AT YOU.', 'REAVER SKIFF: OI.'],
    patrol: ['NOVA WATCH: SCANNING. ...CARRY ON.', 'NOVA WATCH: WE HAVE A FORM FOR THAT.', 'NOVA WATCH: DO NOT DESTROY ANY PLANETS.'],
    hulk: ['SOMEBODY ELSE GOT UNLUCKY HERE.', 'THE DISTRESS LIGHT IS STILL ON.'],
    whale: ['IT DOES NOT CARE ABOUT YOU.', 'IT HUMMED. YOU HUMMED BACK.'],
    scrap: ['FREE SCRAP. THE BEST KIND.'],
    patch: ['A REPAIR KIT. SOMEONE WAS ORGANISED.'],
    rat: ['BRENDA\'S COUSIN. HE DOES NOT WAVE BACK.', 'A RAT. IN A SHIP. WITH CHEESE.', 'HE IS DOING BETTER THAN YOU.'],
    bus: ['A TOUR BUS. THEY PHOTOGRAPHED YOU.', 'TOUR GUIDE: AND ON YOUR LEFT, NOTHING.', 'FOURTEEN TOURISTS SAW YOUR DENTS.'],
    busker: ['SOMEONE IS PLAYING MUSIC AT SPACE.', 'THE SPEAKER IS BIGGER THAN THE SHIP.', 'IT IS NOT A GOOD SONG.']
  };

  function spawnThing() {
    const pool = S.dir === 'out'
      ? ['scrap', 'scrap', 'patch', 'skiff', 'patrol', 'hulk', 'whale', 'comet', 'rat', 'bus', 'busker']
      : ['scrap', 'scrap', 'patch', 'patch', 'whale', 'hulk', 'patrol', 'rat', 'bus', 'busker', 'skiff'];
    const kind = U.pick(pool);
    const y = U.rand(LANE.y0 + 10, LANE.y1 - 10);
    const t = { kind, x: VW + 30, y, a: 0, va: 0, got: 0, said: 0, r: 10, vy: 0 };
    if (kind === 'scrap') { t.vx = -80; t.r = 8; t.pts = lump(8, 5); t.va = 1.1; }
    else if (kind === 'patch') { t.vx = -76; t.r = 8; }
    else if (kind === 'skiff') { t.vx = -290; t.r = 12; t.vy = U.rand(-16, 16); }
    else if (kind === 'patrol') { t.vx = -54; t.r = 16; }
    else if (kind === 'hulk') { t.vx = -38; t.r = 26; t.pts = lump(26, 9); t.va = 0.22; }
    else if (kind === 'whale') { t.vx = -30; t.r = 30; t.y = U.rand(60, VH - 70); }
    else if (kind === 'rat') { t.vx = -120; t.r = 12; t.vy = U.rand(-8, 8); }
    else if (kind === 'bus') { t.vx = -46; t.r = 22; }
    else if (kind === 'busker') { t.vx = -70; t.r = 12; t.notes = []; }
    else { t.vx = -58; t.r = 13; t.pts = lump(13, 8); t.va = 0.8; }   // comet
    return t;
  }

  const SOLID = { hulk: 1, comet: 1 };
  const PICKUP = { scrap: 1, patch: 1 };

  function takeThing(t, g) {
    t.got = 1;
    if (t.kind === 'scrap') {
      const v = Math.round((120 + S.index * 90) * U.rand(0.8, 1.4));
      g.save.credits += v; g.save.totalEarned += v; S.gained += v;
      say('+$' + U.fmt(v) + ' OF SOMEBODY ELSE\'S SHIP');
      A.sfx.coin();
    } else {
      if (S.hits > 0) { S.hits--; say('PATCHED. GOOD AS SOME OTHER SHIP.'); }
      else if (S.shield < S.shieldMax) { S.shield++; say('SHIELD BACK UP.'); }
      else { const v = 140; g.save.credits += v; g.save.totalEarned += v; S.gained += v; say('NOTHING BROKEN. SOLD IT.'); }
      A.sfx.buy ? A.sfx.buy() : A.sfx.coin();
    }
    for (let i = 0; i < 16; i++) {
      S.dust.push({ x: t.x, y: t.y, vx: U.rand(-90, 90), vy: U.rand(-90, 90),
        life: U.rand(0.2, 0.5), col: t.kind === 'scrap' ? '#ffd34d' : '#8affa0', r: U.rand(1, 2) });
    }
  }

  /* A hit takes a piece OFF him: a panel, a fin, the dish. It tumbles away and
     the pod is drawn with that piece missing for the rest of the trip. */
  /* Placed on the hull the sprite actually has: the rim runs from about -33
     to +33 across and +2 to +14 down, with the dome above it. A hole in empty
     space is not damage, it is a bug you can see. */
  const PARTS = [
    { x: 17, y: 7, w: 14, h: 7 }, { x: -19, y: 8, w: 13, h: 7 },
    { x: 0, y: 12, w: 15, h: 6 }, { x: 27, y: 4, w: 11, h: 6 },
    { x: -28, y: 4, w: 11, h: 6 }
  ];

  function shed(n) {
    for (let i = 0; i < n && S.hits + i - 1 < PARTS.length; i++) {
      const p = PARTS[(S.hits - 1 + i) % PARTS.length];
      S.bits.push({
        x: S.px + p.x * 0.6, y: S.py + p.y * 0.6, w: p.w * 0.6, h: p.h * 0.6,
        vx: U.rand(-170, -60), vy: U.rand(-70, 70), a: 0, va: U.rand(-5, 5), life: 4
      });
    }
  }

  function hitPod(g, soft) {
    if (S.invuln > 0) return;
    if (S.shield > 0) {
      S.shield--; S.shieldT = 0;
      S.invuln = 0.6; S.shake = 0.5;
      S.flashT = 0.8; S.flashCol = '#7ef9ff';
      A.sfx.tone(880, { type: 'square', to: 300, dur: 0.14, vol: 0.11 });
      for (let i = 0; i < 14; i++) {
        S.dust.push({ x: S.px, y: S.py, vx: U.rand(-160, 160), vy: U.rand(-160, 160),
          life: U.rand(0.2, 0.5), col: '#7ef9ff', r: U.rand(1, 2) });
      }
      return;
    }
    S.hits++;
    S.invuln = 1.4; S.shake = 1;
    S.flashT = 1; S.flashCol = '#ff5a4d';
    S.vx -= soft ? 40 : 80; S.vy += U.rand(-110, 110);
    A.sfx.hurt();
    PD.touch.buzz(26);
    shed(1);
    // cartoon first, physics second: stars round the pod and a hard puff
    for (let i = 0; i < 6; i++) {
      const a2 = (i / 6) * U.TAU;
      S.dust.push({ x: S.px + Math.cos(a2) * 14, y: S.py + Math.sin(a2) * 10,
        vx: Math.cos(a2) * 60 - 40, vy: Math.sin(a2) * 60,
        life: 0.6, col: '#ffe86a', r: 2, star: 1 });
    }
    for (let i = 0; i < 22; i++) {
      S.dust.push({ x: S.px, y: S.py, vx: U.rand(-220, 120), vy: U.rand(-180, 180),
        life: U.rand(0.3, 0.8), col: U.chance(0.5) ? '#ff8a3d' : '#c9bce8', r: U.rand(1, 3) });
    }
    say(S.dir === 'home'
      ? U.pick(['A ROCK FELL OUT OF THE HOLD.', 'THAT WAS THE GOOD ONE.', 'OW. AND ALSO OW.'])
      : U.pick(['OW.', 'THAT WAS THE PAINT.', 'IT IS FINE. IT IS FINE.', 'WHO PUT THAT THERE.']));
  }

  function cruise(dt, g) {
    steer(dt);
    S.dist = U.clamp(S.t / S.dur, 0, 1);
    const hard = S.dist;

    S.spawn -= dt;
    if (S.spawn <= 0) {
      spawnRock();
      // a gentler curve than it was: the gaps never close right up
      S.spawn = (0.95 - hard * 0.4) / S.fieldK * U.rand(0.7, 1.35);
    }
    S.evt -= dt;
    if (S.evt <= 0) { S.things.push(spawnThing()); S.evt = U.rand(4.5, 8); }

    if (S.shieldMax > 0 && S.shield < S.shieldMax) {
      S.shieldT += dt;
      const need = Math.max(6, 16 - S.shieldMax);
      if (S.shieldT >= need) { S.shieldT = 0; S.shield++; A.sfx.tone(520, { type: 'triangle', to: 900, dur: 0.16, vol: 0.08 }); }
    }

    for (let i = S.rocks.length - 1; i >= 0; i--) {
      const k = S.rocks[i];
      k.x += k.vx * dt; k.y += k.vy * dt; k.a += k.va * dt;
      if (k.y < LANE.y0 - 18 || k.y > LANE.y1 + 18) k.vy = -k.vy;
      if (k.x < -30) { S.rocks.splice(i, 1); continue; }
      const dx = (k.x - S.px) / (k.r + 16), dy = (k.y - S.py) / (k.r + 10);
      if (dx * dx + dy * dy < 1) {
        hitPod(g);
        k.vx = Math.abs(k.vx) * 0.5; k.vy += U.rand(-90, 90);
        S.rocks.splice(i, 1);
      }
    }

    for (let i = S.things.length - 1; i >= 0; i--) {
      const t = S.things[i];
      t.x += t.vx * dt; t.y += t.vy * dt; t.a += t.va * dt;
      if (t.x < -60) { S.things.splice(i, 1); continue; }
      // they talk once, as they pass the middle of the screen
      if (!t.said && t.x < VW * 0.72 && NPC_LINES[t.kind]) { t.said = 1; say(U.pick(NPC_LINES[t.kind])); }
      const dx = (t.x - S.px) / (t.r + 16), dy = (t.y - S.py) / (t.r + 10);
      const touching = dx * dx + dy * dy < 1;
      if (!touching) continue;
      if (PICKUP[t.kind] && !t.got) { takeThing(t, g); S.things.splice(i, 1); }
      else if (SOLID[t.kind]) { hitPod(g, t.kind === 'hulk'); t.vy += U.rand(-40, 40); }
    }

    if (S.t >= S.dur) {
      S.phase = 'approach'; S.t = 0;
      say(S.dir === 'out' ? 'THAT IS THE ONE. BRACE.' : 'THERE IT IS. HOME.');
      A.sfx.tone(220, { type: 'sawtooth', to: 90, dur: 0.7, vol: 0.1 });
    }
  }

  function approach(dt, g) {
    steer(dt);
    for (let i = S.rocks.length - 1; i >= 0; i--) {
      const k = S.rocks[i];
      k.x += k.vx * dt * 1.3; k.y += k.vy * dt; k.a += k.va * dt;
      if (k.x < -30) S.rocks.splice(i, 1);
    }
    for (let i = S.things.length - 1; i >= 0; i--) {
      const t = S.things[i];
      t.x += t.vx * dt * 1.3; t.a += t.va * dt;
      if (t.x < -60) S.things.splice(i, 1);
    }
    S.px = U.damp(S.px, 200, 0.5, dt);
    S.py = U.damp(S.py, 92, 0.5, dt);
    if (S.t > 2.4) { S.phase = 'land'; S.t = 0; say('LANDING. PROBABLY.'); }
  }

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
      if (t > 1.9 && U.chance(0.8)) {
        S.dust.push({ x: S.px + U.rand(-26, 26), y: groundY + 10, vx: U.rand(-130, 130), vy: U.rand(-60, -10),
          life: U.rand(0.4, 1), col: toTint(), r: U.rand(1, 3) });
      }
    } else if (!S.touched) {
      S.touched = 1; S.shake = 1.2;
      A.sfx.dock();
      FX.flash(0.3, '#ffe0a0');
      for (let i = 0; i < 40; i++) {
        S.dust.push({ x: S.px + U.rand(-14, 14), y: groundY + 10, vx: U.rand(-230, 230), vy: U.rand(-110, 10),
          life: U.rand(0.5, 1.3), col: U.chance(0.4) ? '#fff3c0' : toTint(), r: U.rand(1, 4) });
      }
      say(S.dir === 'out' ? 'TOUCHDOWN. NOBODY DIED.' : 'HOME. PUT THE KETTLE ON.');
    }
    if (t > 4.2) arrive(g);
  }

  /* What the crossing was worth. On the way out, rocks you ate come off the
     hull you start the dive with and a clean run pays. On the way home they
     only shake loose ore -- you are not going to be punished for coming back. */
  function arrive(g) {
    if (S.dir === 'home') {
      let lost = 0;
      if (S.hits > 0) lost = dropFromVault(g, S.hits);
      g.travelResult = { dir: 'home', hits: S.hits, lost, gained: S.gained };
      g.arriveHome(Math.max(0, S.ore - lost));
      return;
    }
    const dmg = S.hits;
    g.travelResult = { dir: 'out', hits: dmg, clean: dmg === 0, gained: S.gained };
    g.dive(S.index);
    const p = g.player;
    if (dmg > 0) {
      p.hull = Math.max(p.stat('hull') * 0.25, p.hull - dmg * p.stat('hull') * 0.12);
      FX.text(p.x, p.y - 30, '-' + dmg + ' HULL', '#ff5a4d', 1);
    } else {
      const bonus = Math.round(400 + S.index * 340);
      g.save.credits += bonus; g.save.totalEarned += bonus;
      FX.text(p.x, p.y - 30, 'CLEAN RUN +$' + U.fmt(bonus), '#8affa0', 2);
    }
  }

  /* Shake `n` units out of the hold, cheapest first -- he is not going to
     throw the ruby away when there is regolith on top of it. */
  function dropFromVault(g, n) {
    const v = g.save.vault || {};
    const ids = Object.keys(v).map(Number).filter(k => v[k] > 0)
      .sort((a, b) => (D.MAT[a] ? D.MAT[a].cr : 0) - (D.MAT[b] ? D.MAT[b].cr : 0));
    let lost = 0;
    for (const id of ids) {
      while (v[id] > 0 && lost < n) { v[id]--; lost++; }
      if (v[id] <= 0) delete v[id];
      if (lost >= n) break;
    }
    return lost;
  }

  /* ------------------------------------------------------------------- draw */
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
    /* The damage: every hit punched a panel off him and it stays punched. A
       torn scorched gap where it was, and a spark out of it now and then. */
    for (let i = 0; i < Math.min(S.hits, PARTS.length); i++) {
      const p = PARTS[i], L = p.x - p.w / 2, T = p.y - p.h / 2;
      X.rect(ctx, L - 1, T - 1, p.w + 2, p.h + 2, '#3a2430');       // scorch
      X.rect(ctx, L, T, p.w, p.h, '#0a0614');                       // the hole
      // torn edge: a couple of teeth left hanging off the rim
      X.rect(ctx, L + 2, T, 3, 2, '#6a5a70');
      X.rect(ctx, L + p.w - 5, T + p.h - 2, 3, 2, '#6a5a70');
      if (Math.sin(t * 9 + i * 2) > 0.8) X.rect(ctx, p.x + U.rand(-4, 4), p.y + U.rand(-2, 2), 2, 2, '#ffd34d');
    }
    // past three panels he is visibly on fire and trailing smoke
    if (S.hits >= 3) {
      for (let i = 0; i < 3; i++) {
        const f = (t * 1.4 + i * 0.33) % 1;
        ctx.globalAlpha = 0.5 * (1 - f);
        X.blob(ctx, -34 - f * 60, 6 + Math.sin(t * 3 + i) * 5, 4 + f * 9, 4 + f * 9, '#6a6478');
      }
      ctx.globalAlpha = 1;
      X.rect(ctx, 10, 4, 4, 4, Math.sin(t * 17) > 0 ? '#ff8a3d' : '#ffd34d');
    }
    ctx.restore();
  }

  function drawThing(ctx, t, time) {
    const k = t.kind;
    if (k === 'scrap') {
      X.poly(ctx, t.pts.map(p => rot(p, t, 1.4)), '#140c22');
      X.poly(ctx, t.pts.map(p => rot(p, t, 1)), '#b08a4d');
      X.rect(ctx, t.x - 5, t.y - 1, 10, 2, '#ffd34d');
      if (Math.sin(time * 6) > 0) X.rect(ctx, t.x - 1, t.y - 6, 2, 2, '#fff3c0');
      return;
    }
    if (k === 'patch') {
      X.plate(ctx, t.x - 8, t.y - 7, 16, 14, '#dfe6ea', '#ffffff', '#6e7a84', 3);
      X.rect(ctx, t.x - 5, t.y - 1, 10, 3, '#3fa85a');
      X.rect(ctx, t.x - 1, t.y - 5, 3, 10, '#3fa85a');
      return;
    }
    if (k === 'skiff') {
      // a fast mean wedge with a Reaver visible in the bubble, mohawk and all
      X.poly(ctx, [[t.x - 16, t.y - 8], [t.x + 16, t.y], [t.x - 16, t.y + 8]], '#140c22');
      X.poly(ctx, [[t.x - 14, t.y - 6], [t.x + 13, t.y], [t.x - 14, t.y + 6]], '#8a2f4a');
      X.poly(ctx, [[t.x - 14, t.y - 6], [t.x + 2, t.y - 3], [t.x - 14, t.y - 1]], '#c25070');
      X.rect(ctx, t.x - 7, t.y - 4, 9, 6, '#1d2a3a');      // the bubble
      X.rect(ctx, t.x - 5, t.y - 3, 5, 4, '#6fe0a0');      // a green pilot in it
      X.rect(ctx, t.x - 4, t.y - 6, 1, 3, '#ff5a4d');      // and his mohawk
      X.rect(ctx, t.x - 2, t.y - 7, 1, 4, '#ff5a4d');
      X.rect(ctx, t.x, t.y - 6, 1, 3, '#ff5a4d');
      X.rect(ctx, t.x - 16, t.y - 10, 4, 3, '#6a1f33');    // the fin
      for (let i = 1; i < 8; i++) X.rect(ctx, t.x + 15 + i * 5, t.y - 1, 4, 2, 'rgba(255,90,77,' + (0.55 / i).toFixed(2) + ')');
      return;
    }
    if (k === 'rat') {
      /* Brenda's cousin, who has his own ship and a wheel of cheese on a rope
         and is, by any measure, doing better than you. */
      X.poly(ctx, [[t.x - 13, t.y - 6], [t.x + 12, t.y - 2], [t.x + 12, t.y + 4], [t.x - 13, t.y + 7]], '#140c22');
      X.poly(ctx, [[t.x - 12, t.y - 5], [t.x + 10, t.y - 1], [t.x + 10, t.y + 3], [t.x - 12, t.y + 6]], '#9a6a8a');
      X.rect(ctx, t.x - 6, t.y - 9, 12, 6, '#2a1d33');     // canopy
      X.rect(ctx, t.x - 4, t.y - 8, 8, 4, '#c9bce8');
      X.rect(ctx, t.x - 3, t.y - 7, 5, 3, '#6e5a50');      // the rat
      X.rect(ctx, t.x - 4, t.y - 9, 2, 2, '#6e5a50');      // ears
      X.rect(ctx, t.x + 1, t.y - 9, 2, 2, '#6e5a50');
      X.rect(ctx, t.x + 2, t.y - 6, 1, 1, '#ffffff');      // eye
      X.line(ctx, t.x - 12, t.y + 4, t.x - 24, t.y + 9, '#b8aed0', 1);
      X.blob(ctx, t.x - 27, t.y + 10, 5, 5, '#b08a2a');    // the cheese
      X.blob(ctx, t.x - 27, t.y + 10, 4, 4, '#ffd34d');
      X.rect(ctx, t.x - 28, t.y + 9, 2, 2, '#b08a2a');
      return;
    }
    if (k === 'bus') {
      /* Fourteen tourists, every one of them photographing your dents. */
      X.plate(ctx, t.x - 26, t.y - 11, 52, 22, '#141020', null, null, 4);
      X.plate(ctx, t.x - 25, t.y - 10, 50, 20, '#e8c44d', '#fff3a8', '#8a6a1a', 4);
      X.rect(ctx, t.x - 25, t.y - 2, 50, 3, '#8a6a1a');
      for (let i = 0; i < 5; i++) {
        const wx = t.x - 21 + i * 9;
        X.rect(ctx, wx, t.y - 8, 7, 6, '#2a3a5a');
        X.rect(ctx, wx + 1, t.y - 7, 5, 4, '#7fb0e8');
        X.rect(ctx, wx + 2, t.y - 6, 3, 3, U.hash2(i, 3) > 0.5 ? '#6fe0a0' : '#e8a06f');
        // and a camera flash, one window at a time
        if ((Math.floor(time * 3) % 5) === i) X.rect(ctx, wx - 1, t.y - 9, 9, 8, 'rgba(255,255,255,0.8)');
      }
      X.rect(ctx, t.x + 24, t.y - 4, 6, 5, '#fff3c0');     // headlight
      X.rect(ctx, t.x - 30, t.y - 2, 5, 4, '#ff5a4d');     // tail light
      return;
    }
    if (k === 'busker') {
      /* One small ship, one enormous speaker, and no sense of occasion. */
      X.plate(ctx, t.x - 12, t.y - 6, 20, 13, '#141020', null, null, 3);
      X.plate(ctx, t.x - 11, t.y - 5, 18, 11, '#5a4a8a', '#8a7ac4', '#2a2050', 3);
      X.rect(ctx, t.x - 6, t.y - 3, 8, 5, '#c9bce8');
      X.plate(ctx, t.x + 6, t.y - 12, 18, 24, '#140c22', null, null, 3);
      X.plate(ctx, t.x + 7, t.y - 11, 16, 22, '#3a2a1a', '#6a5030', '#1a1008', 3);
      const pu = 3 + Math.abs(Math.sin(time * 9)) * 2;
      X.blob(ctx, t.x + 15, t.y - 4, pu + 1, pu + 1, '#1a1008');
      X.blob(ctx, t.x + 15, t.y - 4, pu, pu, '#c9a06a');
      X.blob(ctx, t.x + 15, t.y + 6, 3, 3, '#c9a06a');
      for (let i = 0; i < 3; i++) {                         // notes, escaping
        const f = ((time * 0.8 + i * 0.33) % 1);
        const nx = t.x + 24 + f * 26, ny = t.y - 4 - f * 22 + Math.sin(f * 9 + i) * 4;
        ctx.globalAlpha = 1 - f;
        X.rect(ctx, nx, ny, 2, 6, '#8dff5a');
        X.rect(ctx, nx - 2, ny + 5, 4, 3, '#8dff5a');
        ctx.globalAlpha = 1;
      }
      return;
    }
    if (k === 'patrol') {
      X.plate(ctx, t.x - 20, t.y - 8, 40, 16, '#3f6ea8', '#a9d8ff', '#1a2f52', 4);
      X.rect(ctx, t.x - 12, t.y - 4, 18, 4, '#c8e4ff');
      X.rect(ctx, t.x + 14, t.y - 2, 7, 4, '#e6f0fa');
      const blink = Math.sin(time * 7) > 0;
      X.rect(ctx, t.x - 18, t.y - 11, 5, 3, blink ? '#ff5a4d' : '#7ef9ff');
      X.rect(ctx, t.x + 13, t.y - 11, 5, 3, blink ? '#7ef9ff' : '#ff5a4d');
      // the scan: a cone that sweeps down over whatever is below it
      const sw = Math.sin(time * 1.6) * 0.5;
      ctx.globalAlpha = 0.16 + Math.abs(Math.sin(time * 3)) * 0.1;
      X.poly(ctx, [[t.x - 4, t.y + 8], [t.x + 4, t.y + 8],
        [t.x + 30 + sw * 40, t.y + 74], [t.x - 30 + sw * 40, t.y + 74]], '#a9d8ff');
      ctx.globalAlpha = 1;
      return;
    }
    if (k === 'hulk') {
      X.poly(ctx, t.pts.map(p => rot(p, t, 1.25)), '#0e0a18');
      X.poly(ctx, t.pts.map(p => rot(p, t, 1)), '#46525e');
      X.poly(ctx, t.pts.slice(0, 4).map(p => rot(p, t, 0.55)), '#5c6a82');
      X.rect(ctx, t.x - 4, t.y - 3, 9, 6, '#191320');      // a hole clean through
      X.line(ctx, t.x + 14, t.y - 8, t.x + 34, t.y - 22, '#3a4456', 3);  // snapped mast
      X.line(ctx, t.x + 14, t.y - 8, t.x + 34, t.y - 22, '#7a8594', 1);
      // the distress light nobody has come for
      if (Math.sin(time * 2.6) > 0.55) {
        X.blob(ctx, t.x + 34, t.y - 23, 5, 5, 'rgba(255,90,77,0.4)');
        X.rect(ctx, t.x + 32, t.y - 25, 4, 4, '#ff5a4d');
      }
      return;
    }
    if (k === 'whale') {
      // one enormous animal, entirely uninterested in any of this
      const w = 52, h = 20, fl = Math.sin(time * 1.3) * 5;
      X.poly(ctx, [[t.x - w, t.y], [t.x - 18, t.y - h], [t.x + 24, t.y - 9],
        [t.x + 34, t.y], [t.x + 24, t.y + 9], [t.x - 18, t.y + h]], '#0e1a2a');
      X.poly(ctx, [[t.x - w + 3, t.y], [t.x - 17, t.y - h + 3], [t.x + 22, t.y - 8],
        [t.x + 31, t.y], [t.x + 22, t.y + 8], [t.x - 17, t.y + h - 3]], '#2f5a8a');
      X.poly(ctx, [[t.x - 17, t.y - h + 5], [t.x + 18, t.y - 6], [t.x + 6, t.y + 2]], '#4d84c4');
      X.poly(ctx, [[t.x - w, t.y], [t.x - w - 16, t.y - 14 + fl], [t.x - w - 14, t.y + 12 + fl]], '#2f5a8a');
      X.rect(ctx, t.x + 22, t.y - 4, 3, 3, '#d8eeff');
      return;
    }
    // comet: a slow bright lump with a long tail, impossible to miss
    for (let i = 1; i < 14; i++) {
      ctx.globalAlpha = 0.4 / Math.sqrt(i);
      X.blob(ctx, t.x + i * 9, t.y - i * 0.6, t.r * (1 - i / 18), t.r * 0.55 * (1 - i / 18), '#7ef9ff');
    }
    ctx.globalAlpha = 1;
    X.poly(ctx, t.pts.map(p => rot(p, t, 1.3)), '#0e1a2a');
    X.poly(ctx, t.pts.map(p => rot(p, t, 1)), '#a9e6f5');
    X.poly(ctx, t.pts.slice(0, 3).map(p => rot(p, t, 0.55)), '#ffffff');
  }

  function rot(p, t, grow) {
    const co = Math.cos(t.a), si = Math.sin(t.a);
    return [t.x + (p[0] * co - p[1] * si) * grow, t.y + (p[0] * si + p[1] * co) * grow];
  }

  function hud(ctx, g) {
    const x0 = 96, x1 = VW - 24, y = 16;
    X.plate(ctx, 86, 7, VW - 104, 18, 'rgba(10,6,26,0.8)', '#3c2f66', '#0a0618', 3);
    X.rect(ctx, x0, y, x1 - x0, 1, '#3c2f66');
    for (let i = 0; i <= 10; i++) X.rect(ctx, x0 + (x1 - x0) * i / 10, y - 2, 1, 5, '#4a3a78');
    const f = S.phase === 'launch' ? 0 : (S.phase === 'cruise' ? S.dist : 1);
    PD.glyph.draw(ctx, S.dir === 'out' ? 'home' : 'planet', x0 - 8, y - 7, fromTint(), '#4a3a78');
    PD.glyph.draw(ctx, S.dir === 'out' ? 'planet' : 'home', x1 - 5, y - 7, toTint(), '#4a3a78');
    const mx = Math.round(x0 + (x1 - x0) * f);
    X.rect(ctx, x0, y, mx - x0, 1, '#7ef9ff');
    X.poly(ctx, [[mx - 4, y - 4], [mx + 4, y], [mx - 4, y + 4]], '#7ef9ff');

    F.draw(ctx, toName().toUpperCase(), 10, 8, '#ffd34d', { shadow: '#0b0718' });
    F.draw(ctx, S.dir === 'out' ? S.body.kind.toUpperCase() : 'THE ROCK HOUSE', 10, 17, '#8a7ab0', { shadow: '#0b0718' });

    const hp = Math.max(0, 5 - S.hits);
    for (let i = 0; i < 5; i++) {
      X.plate(ctx, 10 + i * 9, 28, 7, 8, i < hp ? '#ff5a4d' : '#2a1c33', i < hp ? '#ffb0a8' : null, '#140c22', 2);
    }
    for (let i = 0; i < S.shieldMax; i++) {
      const on = i < S.shield;
      PD.glyph.hex(ctx, 14 + i * 10, 46, 4, on ? '#7ef9ff' : '#1e2a44', on ? '#eafcff' : '#2a3a58', 1);
    }
    if (S.dir === 'home' && S.ore > 0) {
      PD.glyph.draw(ctx, 'ore', 8, VH - 22, '#ffb03d', '#8a5c1a');
      F.draw(ctx, 'x' + S.ore, 25, VH - 18, '#ffb03d', { shadow: '#0b0718' });
    }
    if (S.saidT > 0) {
      ctx.globalAlpha = Math.min(1, S.saidT * 1.6);
      F.draw(ctx, S.said, VW / 2, VH - 16, '#ffe9a8', { center: true, shadow: '#0b0718' });
      ctx.globalAlpha = 1;
    }
    if (S.phase === 'cruise') {
      F.draw(ctx, 'ETA ' + Math.max(0, S.dur - S.t).toFixed(1) + 's', VW - 10, 30, '#8a7ab0', { right: true, shadow: '#0b0718' });
    }
  }

  function draw(ctx, g, time) {
    const b = S.body || D.BODIES[0];
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, S.dir === 'out' ? (b.sky || '#0b0720') : '#0b0720');
    grd.addColorStop(1, '#04030d');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);

    const sh = S.shake > 0 ? S.shake * S.shake * 4 : 0;
    ctx.save();
    if (sh) ctx.translate(Math.round(U.rand(-sh, sh)), Math.round(U.rand(-sh, sh)));

    const sk = speedK();
    for (const st of S.stars) {
      const len = 1 + st.z * 14 * sk;
      ctx.globalAlpha = 0.3 + st.z * 0.6;
      ctx.fillStyle = st.z > 0.8 ? '#ffffff' : (st.z > 0.5 ? '#c9d8ff' : '#7a6aa8');
      ctx.fillRect(st.x | 0, st.y | 0, Math.max(st.s, len | 0), st.s);
    }
    ctx.globalAlpha = 1;

    drawDest(ctx);

    for (const t of S.things) drawThing(ctx, t, time);

    for (const k of S.rocks) {
      X.poly(ctx, k.pts.map(p => rot(p, k, 1.3)), '#140c22');
      X.poly(ctx, k.pts.map(p => rot(p, k, 1)), k.ice ? '#79c4de' : '#8a6a4f');
      X.poly(ctx, k.pts.slice(0, 3).map(p => rot(p, k, 0.6)), k.ice ? '#d4eef7' : '#b08a6a');
    }

    for (const bit of S.bits) {
      ctx.save();
      ctx.translate(bit.x | 0, bit.y | 0); ctx.rotate(bit.a);
      X.rect(ctx, -bit.w / 2 - 1, -bit.h / 2 - 1, bit.w + 2, bit.h + 2, '#140c22');
      X.rect(ctx, -bit.w / 2, -bit.h / 2, bit.w, bit.h, '#8fa0b8');
      ctx.restore();
    }

    for (const d of S.dust) {
      ctx.globalAlpha = Math.min(1, d.life * 2.4);
      if (d.star) {                                   // the cartoon OW
        X.rect(ctx, d.x - 1, d.y - 3, 3, 7, '#1a1030');
        X.rect(ctx, d.x - 3, d.y - 1, 7, 3, '#1a1030');
        X.rect(ctx, d.x, d.y - 3, 1, 7, d.col);
        X.rect(ctx, d.x - 3, d.y, 7, 1, d.col);
      } else X.rect(ctx, d.x, d.y, d.r, d.r, d.col);
    }
    ctx.globalAlpha = 1;

    if (S.phase === 'land') {
      const f = U.clamp(S.t / 1.4, 0, 1);
      drawGround(ctx, VH - 36 + (1 - f) * 60, toTint(), S.index + 3, S.px);
    } else if (S.phase === 'launch') {
      drawGround(ctx, VH - 24 + S.t * 150, fromTint(), S.index + 11, null);
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

    if (S.navLead > 0 && (S.phase === 'cruise' || S.phase === 'approach')) {
      const blink = Math.sin(time * 16) > -0.3;
      if (blink) for (const k of S.rocks) {
        if (k.x < VW - 4) continue;
        const y = U.clamp(k.y, 8, VH - 8);
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

  function drawDest(ctx) {
    const img = toCanvasImg();
    if (!img) return;
    let size, cx, cy;
    if (S.phase === 'launch') { size = 14; cx = VW - 40; cy = 60; }
    else if (S.phase === 'cruise') { size = 14 + S.dist * 26; cx = VW - 40; cy = 60; }
    else if (S.phase === 'approach') {
      const f = U.smoothstep(0, 2.4, S.t);
      size = U.lerp(40, 420, f * f);
      cx = U.lerp(VW - 40, 200, f); cy = U.lerp(60, VH + 120, f);
    } else {
      size = 420; cx = 200; cy = VH + 120;
      ctx.globalAlpha = U.clamp(1 - S.t / 1.2, 0, 1);
    }
    const s = Math.round(size);
    ctx.drawImage(img, 0, 0, img.width, img.height,
      Math.round(cx - s / 2), Math.round(cy - s / 2), s, s);
    ctx.globalAlpha = 1;
  }

  /* Ground, close up: a jagged horizon in the body's own colour with a flat
     pad cleared where the pod is coming down. Used for the rock he leaves as
     well as the one he arrives at, so both ends of the trip have somewhere
     solid. */
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
      for (let k = 0; k < 3; k++) {
        const hv = U.hash2(x, Math.round(seed) + k * 17);
        if (hv > 0.72) X.rect(ctx, x + (k % 3), y + 7 + (hv * 46 | 0), 1, 1, k ? shade(tint, 0.3) : hi);
      }
      if (U.hash2(x, Math.round(seed) + 3) > 0.9) X.rect(ctx, x, y + 3, 3, 3, shade(tint, 0.3));
    }
    if (padX !== null) {
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

  PD.travel = { enter, enterReturn, update, draw, touchMode, S, drawThing,
    drawPodOnly: (ctx, g) => pod(ctx, g, S.px, S.py, 0, 0.35) };
})(window.PD);
