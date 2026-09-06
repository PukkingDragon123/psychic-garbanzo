/* Your moon. Side-scrolling, low gravity: run, jump very high, tuck into a
   roll. Five buildings, each one raised from a hologram blueprint by the
   multi-purpose tool in your pocket and then 3D-printed in place. Stand at a
   building and press E to use it. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const A = PD.audio;
  const FX = PD.fx;
  const D = PD.data;
  const AH = PD.arthome;
  const G = PD.glyph;

  const VW = 480, VH = 270;
  const ROOM_W = 1040;
  const HORIZON = 204;
  const GRAV = 330;

  function groundY(x) {
    return HORIZON + Math.sin(x * 0.0121) * 12 + Math.sin(x * 0.0331 + 1.7) * 5 + Math.sin(x * 0.0072 + 4.1) * 8;
  }

  const P = {
    x: 150, y: 0, vx: 0, vy: 0, face: 1, walk: 0, near: null, target: null, autoUse: null, lock: 0,
    roll: 0, rollA: 0, land: 0, air: 0
  };
  const UI = { mode: null, sel: 0, msg: '', msgT: 0, phoneT: 0, feed: [], feedT: 0 };

  const critters = [
    { x: 260, dir: 1, t: 0, spr: 'critter', speed: 15 },
    { x: 600, dir: -1, t: 0.5, spr: 'critter2', speed: 11 },
    { x: 960, dir: 1, t: 1.2, spr: 'critter', speed: 18 }
  ];
  const RUINS = [{ x: 60, k: 2 }, { x: 250, k: 0 }, { x: 420, k: 1 }, { x: 600, k: 2 }, { x: 790, k: 1 }, { x: 1000, k: 0 }];
  const FLAGS = [{ x: 96 }, { x: 410 }, { x: 780 }];
  const ROCKS = [];
  for (let i = 0; i < 26; i++) ROCKS.push({ x: 20 + U.hash2(i, 3) * (ROOM_W - 40), k: (U.hash2(i, 9) * 3) | 0 });
  const CRATERS = [];
  for (let i = 0; i < 16; i++) CRATERS.push({ x: 40 + U.hash2(i, 21) * (ROOM_W - 80), r: 10 + U.hash2(i, 33) * 22 });
  const FORE = [];
  for (let i = 0; i < 14; i++) FORE.push({ x: U.hash2(i, 41) * ROOM_W * 1.15, s: 8 + U.hash2(i, 47) * 16, y: 238 + U.hash2(i, 53) * 30 });
  const MOTES = [];
  for (let i = 0; i < 26; i++) MOTES.push({ x: U.hash2(i, 61) * ROOM_W, y: 110 + U.hash2(i, 67) * 130, r: 0.6 + U.hash2(i, 71) * 1.4, sp: 3 + U.hash2(i, 73) * 8 });
  let star = null;

  /* People who buy your rocks. They text. */
  const CHATTER = [
    ['ZAZ', 'Your regolith is... regolith. Send the gems, darling.'],
    ['BROKER K', 'Iron is up. Do not ask why. Sell now.'],
    ['THE SYNDICATE', 'We noticed a planet is missing. Nice work.'],
    ['ZAZ', 'One lot at a time. Quality cannot be rushed. It can be bribed.'],
    ['MUM', 'Are you eating? Are you destroying enough worlds?'],
    ['BROKER K', 'Voidstone buyers are circling. Hold or fold.'],
    ['THE SYNDICATE', 'Bounty on your head went up. Congratulations.'],
    ['ZAZ', 'A relic! Finally something worth appraising.']
  ];

  function enter(g, atX) {
    P.x = atX === undefined ? 150 : atX;
    P.y = groundY(P.x); P.vx = 0; P.vy = 0; P.target = null; P.autoUse = null; P.roll = 0;
    P.lock = 0.25;
    UI.mode = null;
    g.intCam = U.clamp(P.x - VW / 2, 0, ROOM_W - VW);
    if (!star) {
      star = [];
      for (let i = 0; i < 150; i++) star.push({ x: U.hash2(i, 11) * ROOM_W, y: U.hash2(i, 17) * HORIZON, b: U.hash2(i, 23) });
    }
    if (!UI.feed.length) for (let i = 0; i < 3; i++) UI.feed.push(CHATTER[(i * 3) % CHATTER.length]);
  }

  function tierOf(lvl) { return lvl <= 1 ? 0 : (lvl < 4 ? 1 : 2); }
  function say(m) { UI.msg = m; UI.msgT = 2.4; }

  function nearest(g) {
    let best = null, bd = 52;
    for (const b of D.BUILDINGS) {
      if (g.buildLevel(b.id) <= 0) continue;
      const d = Math.abs(b.x - P.x);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  function use(g, b) {
    if (!b) return;
    if (g.printing) return;
    if (b.id === 'obs') { g.openChart(); return; }
    if (b.id === 'mind') { PD.mind.open(g); return; }
    UI.mode = b.id;
    PD.scenes.enter(b.id, g);
  }

  /* ---------------------------------------------------------------- update */
  function update(dt, g) {
    const IN = PD.input;
    P.lock = Math.max(0, P.lock - dt);
    UI.msgT = Math.max(0, UI.msgT - dt);
    UI.feedT += dt;
    if (UI.feedT > 9) { UI.feedT = 0; UI.feed.push(CHATTER[(Math.random() * CHATTER.length) | 0]); if (UI.feed.length > 3) UI.feed.shift(); }
    for (const c of critters) {
      c.t += dt; c.x += c.dir * c.speed * dt;
      if (c.x > ROOM_W - 40 || c.x < 40) c.dir *= -1;
      if (U.chance(dt * 0.4)) c.dir *= -1;
    }

    // the printer runs on its own clock
    if (g.printing) {
      g.printing.t += dt;
      if (g.printing.t > 1 && U.chance(dt * 12)) A.sfx.tone(900 + Math.random() * 600, { type: 'square', dur: 0.03, vol: 0.03 });
      if (g.printing.t >= g.printing.dur) { const id = g.printing.id; g.printing = null; g.finishBuild(id); }
    }

    if (UI.mode) { PD.scenes.update(dt, g); return; }

    const use_ = P.lock <= 0 && (IN.hit('KeyE') || IN.hit('space'));
    const m = IN.mouse;

    // the phone: Tab, or tap the device in the corner
    const onPhone = m.inside && m.x > VW - 44 && m.y > VH - 60 && m.y < VH;
    if (P.lock <= 0 && (IN.hit('Tab') || IN.hit('KeyB') || (m.leftPressed && onPhone))) { UI.mode = 'phone'; PD.scenes.enter('phone', g); return; }

    let ix = 0;
    if (IN.down('left')) ix -= 1;
    if (IN.down('right')) ix += 1;

    if (P.lock <= 0 && m.leftPressed && m.y > 24 && !onPhone) {
      const wx = m.x + g.intCam;
      let hit = null;
      for (const b of D.BUILDINGS) if (g.buildLevel(b.id) > 0 && Math.abs(b.x - wx) < 44) hit = b;
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

    const gy = groundY(P.x);
    const grounded = P.y >= gy - 0.5;

    // roll: shift, or tap down while moving. Fast, low, and it commits you.
    if (P.roll <= 0 && grounded && (IN.hit('shift') || (IN.hit('down') && Math.abs(P.vx) > 20))) {
      P.roll = 0.55; P.rollA = 0;
      if (ix) P.face = ix;
      P.vx = P.face * 190;
      A.sfx.tone(300, { type: 'triangle', to: 120, dur: 0.25, vol: 0.09 });
      FX.dust(P.x, P.y, 4, '#8e86a8', 14);
    }
    if (P.roll > 0) {
      P.roll -= dt;
      P.rollA += P.face * dt * 14;
      P.vx = U.damp(P.vx, P.face * 150, 0.5, dt);
    } else {
      if (ix) P.face = ix;
      P.vx = U.damp(P.vx, ix * 96, 0.26, dt);
    }
    P.x = U.clamp(P.x + P.vx * dt, 24, ROOM_W - 24);
    P.walk += Math.abs(P.vx) * dt * 0.1;

    // jump: very high, very floaty. Hold to float a touch longer.
    if (IN.hit('up') && grounded && P.roll <= 0) {
      P.vy = -196;
      A.sfx.tone(520, { type: 'triangle', to: 900, dur: 0.14, vol: 0.07 });
      FX.dust(P.x, P.y, 3, '#c9bce8', 10);
    }
    const floaty = IN.down('up') && P.vy < 0 ? 0.6 : 1;
    P.vy += GRAV * floaty * dt;
    P.y += P.vy * dt;
    if (P.y >= gy) {
      if (P.vy > 60) { P.land = 0.22; FX.dust(P.x, gy, 5, '#8e86a8', 16); A.sfx.tone(140, { type: 'triangle', to: 80, dur: 0.1, vol: 0.06 }); }
      P.y = gy; P.vy = 0; P.air = 0;
    } else P.air += dt;
    P.land = Math.max(0, P.land - dt);

    P.near = nearest(g);
    if (use_) use(g, P.near);

    g.intCam = U.damp(g.intCam, U.clamp(P.x - VW / 2, 0, ROOM_W - VW), 0.15, dt);
  }

  function closeScene() { UI.mode = null; P.lock = 0.2; A.sfx.click(); }
  function touchMode() { return UI.mode ? 'ui' : 'home'; }

  /* ------------------------------------------------------------------ draw */
  function drawSky(ctx, g, t, cam) {
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON + 30);
    sky.addColorStop(0, '#0d0826'); sky.addColorStop(0.55, '#1e1140'); sky.addColorStop(1, '#3a1c4e');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, HORIZON + 40);
    const neb = ctx.createRadialGradient(320 - cam * 0.15, 60, 6, 320 - cam * 0.15, 60, 150);
    neb.addColorStop(0, 'rgba(255,138,216,0.22)'); neb.addColorStop(1, 'rgba(255,138,216,0)');
    ctx.fillStyle = neb; ctx.fillRect(0, 0, VW, HORIZON + 20);
    for (const s of star) {
      const sx = (((s.x - cam * 0.25) % ROOM_W) + ROOM_W) % ROOM_W;
      if (sx > VW + 4) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.b * 30);
      ctx.fillStyle = s.b > 0.85 ? '#ffe9a8' : '#ffffff';
      ctx.globalAlpha = 0.25 + s.b * 0.6 * tw;
      ctx.fillRect(sx | 0, s.y | 0, 1, 1);
    }
    ctx.globalAlpha = 1;
    const icon = g.navIcon(g.save.bodyIndex || 0);
    const px = 372 - cam * 0.3, py = 66 + Math.sin(t * 0.4) * 2;
    ctx.drawImage(icon, px - icon.width * 1.6, py - icon.height * 1.6, icon.width * 3.2, icon.height * 3.2);
    const ic2 = g.navIcon(Math.min(D.BODIES.length - 1, (g.save.bodyIndex || 0) + 1));
    ctx.globalAlpha = 0.5; ctx.drawImage(ic2, 92 - cam * 0.18, 38, 22, 22); ctx.globalAlpha = 1;
  }

  function drawGround(ctx, cam) {
    ctx.fillStyle = '#241640';
    ctx.beginPath(); ctx.moveTo(0, VH);
    for (let x = 0; x <= VW; x += 8) { const wx = x + cam * 0.45; ctx.lineTo(x, HORIZON - 16 + Math.sin(wx * 0.008) * 10 + Math.sin(wx * 0.021 + 2) * 5); }
    ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, VH);
    for (let x = 0; x <= VW; x += 4) ctx.lineTo(x, groundY(x + cam));
    ctx.lineTo(VW, VH); ctx.closePath();
    const gr = ctx.createLinearGradient(0, HORIZON - 20, 0, VH);
    gr.addColorStop(0, '#6b6480'); gr.addColorStop(0.25, '#544d6b'); gr.addColorStop(1, '#2e2842');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#a89ac4'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= VW; x += 4) { const y = groundY(x + cam); if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    for (const c of CRATERS) {
      const x = c.x - cam; if (x < -60 || x > VW + 60) continue;
      const y = groundY(c.x);
      ctx.fillStyle = '#453e5e'; ctx.beginPath(); ctx.ellipse(x, y + c.r * 0.28, c.r, c.r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8e86a8'; ctx.beginPath(); ctx.ellipse(x, y + c.r * 0.18, c.r * 0.94, c.r * 0.22, 0, Math.PI, Math.PI * 2); ctx.fill();
    }
  }

  /* A cyan hologram copy of a sprite frame, with scanlines. */
  const holoCache = new Map();
  function holoOf(cv) {
    let h = holoCache.get(cv);
    if (h) return h;
    h = document.createElement('canvas');
    h.width = cv.width; h.height = cv.height;
    const c = h.getContext('2d');
    c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = '#58e8ff'; c.fillRect(0, 0, h.width, h.height);
    c.globalCompositeOperation = 'destination-out';
    for (let y = 0; y < h.height; y += 4) c.fillRect(0, y, h.width, 1);
    holoCache.set(cv, h);
    return h;
  }

  function label(ctx, g, b, x, topY, t) {
    const lvl = g.buildLevel(b.id);
    const near = P.near === b;
    const text = b.name + (lvl > 0 ? '  ' + lvl : '');
    const w = F.width(text, 1) + 20;
    const y = topY - 18 + (near ? Math.sin(t * 4) * 1.5 : 0);
    ctx.fillStyle = '#4a4460'; ctx.fillRect(x - 1, y + 12, 2, topY - y - 10);
    ctx.fillStyle = near ? 'rgba(30,17,64,0.96)' : 'rgba(16,10,36,0.74)';
    ctx.fillRect(x - w / 2, y, w, 13);
    ctx.strokeStyle = near ? '#ffd34d' : '#443166';
    ctx.strokeRect(x - w / 2 + 0.5, y + 0.5, w - 1, 12);
    G.draw(ctx, b.glyph, x - w / 2 + 2, y, near ? '#ffffff' : '#9c8ec4', near ? '#ffd34d' : '#443166');
    F.draw(ctx, text, x + 8, y + 3, near ? '#ffffff' : '#a99bd0', { center: true, shadow: false });
    if (near) F.draw(ctx, 'E', x, y - 9, '#ffd34d', { center: true, shadow: true });
  }

  function draw(ctx, g, t) {
    const cam = Math.round(g.intCam);
    drawSky(ctx, g, t, cam);
    drawGround(ctx, cam);

    // fairy lights between built things
    ctx.save(); ctx.lineWidth = 1;
    const built = D.BUILDINGS.filter(b => g.buildLevel(b.id) > 0);
    for (let i = 1; i < built.length; i++) {
      const a = built[i - 1], b2 = built[i];
      const ax = a.x - cam, bx2 = b2.x - cam;
      if (bx2 < -40 || ax > VW + 40) continue;
      const ay = groundY(a.x) - 54, by2 = groundY(b2.x) - 54;
      ctx.strokeStyle = '#4a4460';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx2) / 2, (ay + by2) / 2 + 18, bx2, by2); ctx.stroke();
      for (let k = 1; k < 6; k++) {
        const f = k / 6, lx = ax + (bx2 - ax) * f, ly = ay + (by2 - ay) * f + Math.sin(Math.PI * f) * 18;
        ctx.fillStyle = ['#ffd34d', '#ff8ad8', '#8affa0', '#7ef9ff'][(i + k) % 4];
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 3 + i + k);
        ctx.fillRect(lx - 1, ly - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    for (const r of RUINS) { const x = r.x - cam; if (x < -50 || x > VW + 50) continue; AH.blit(ctx, AH.S['ruin' + r.k], 0, x, groundY(r.x) + 3); }
    for (const r of ROCKS) { const x = r.x - cam; if (x < -20 || x > VW + 20) continue; AH.blit(ctx, AH.S['rock' + r.k], 0, x, groundY(r.x) + 3); }
    for (const f of FLAGS) { const x = f.x - cam; if (x < -20 || x > VW + 20) continue; AH.blit(ctx, AH.S.flag, Math.floor(t * 4) % 2, x, groundY(f.x) + 2); }

    // buildings, blueprints and the printer
    for (const b of D.BUILDINGS) {
      const x = b.x - cam;
      if (x < -120 || x > VW + 120) continue;
      const gy = groundY(b.x);
      const lvl = g.buildLevel(b.id);
      const printing = g.printing && g.printing.id === b.id;
      if (lvl <= 0 && !printing) { AH.blit(ctx, AH.S.survey, 0, x, gy + 2); continue; }
      const s = AH.S[b.id + tierOf(Math.max(1, lvl))];
      const bob = b.id === 'mind' ? Math.sin(t * 1.6) * 1 : 0;
      if (printing) drawPrint(ctx, g, b, s, x, gy + 2, t);
      else {
        AH.blit(ctx, s, 0, x, gy + 2 + bob);
        if (b.id === 'docks') {
          const pod = PD.art.skinFor(g.save.cos).pod;
          PD.art.blit(ctx, pod, Math.floor(t * 3) % 2, x - 20, gy - 12 + Math.sin(t * 1.2) * 1.5);
        }
        label(ctx, g, b, x, gy - s.h + 2, t);
      }
    }

    for (const m of MOTES) {
      const x = ((m.x + t * m.sp) % ROOM_W) - cam; if (x < -4 || x > VW + 4) continue;
      ctx.fillStyle = '#c9bce8'; ctx.globalAlpha = 0.15 + 0.25 * Math.sin(t * 2 + m.x);
      ctx.fillRect(x | 0, (m.y + Math.sin(t * 0.7 + m.x * 0.1) * 4) | 0, m.r > 1.2 ? 2 : 1, m.r > 1.2 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    for (const c of critters) {
      const x = c.x - cam; if (x < -20 || x > VW + 20) continue;
      const hop = Math.abs(Math.sin(c.t * 5)) * 5;
      AH.blit(ctx, AH.S[c.spr], Math.floor(c.t * 6) % 2, x, groundY(c.x) + 2 - hop, c.dir < 0);
    }

    // you
    drawPlayer(ctx, g, cam, t);

    for (const r of FORE) {
      const x = r.x - cam * 1.15; if (x < -40 || x > VW + 40) continue;
      ctx.fillStyle = '#241a3a'; ctx.beginPath(); ctx.ellipse(x, r.y + r.s * 0.5, r.s, r.s * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#31264f'; ctx.beginPath(); ctx.ellipse(x - r.s * 0.2, r.y + r.s * 0.2, r.s * 0.7, r.s * 0.34, 0, Math.PI, Math.PI * 2); ctx.fill();
    }

    // the phone in your pocket, bottom right
    const ph = AH.S.phone;
    const on = UI.mode === 'phone';
    AH.blit(ctx, ph, on ? 1 : 0, VW - 18, VH - 6 + (on ? 0 : Math.sin(t * 2) * 1));
    F.draw(ctx, 'TAB', VW - 18, VH - 46, '#9c8ec4', { center: true, shadow: true });

    if (UI.mode) PD.scenes.draw(ctx, g, t);
    if (UI.msgT > 0) {
      ctx.globalAlpha = Math.min(1, UI.msgT);
      F.draw(ctx, UI.msg, VW / 2, VH - 30, '#ff6b8a', { center: true, scale: 1 });
      ctx.globalAlpha = 1;
    }
  }

  function drawPlayer(ctx, g, cam, t) {
    const skin = PD.art.skinFor(g.save.cos);
    const gy = groundY(P.x);
    const air = P.y < gy - 1;
    const walking = Math.abs(P.vx) > 8;
    const x = (P.x - cam) | 0, y = (P.y + 2) | 0;
    if (P.roll > 0) {
      ctx.save();
      ctx.translate(x, y - 12);
      ctx.rotate(P.rollA);
      const s = skin.alienRoll;
      ctx.drawImage(s.frames[0], -s.ox, -s.oy + 12, s.w, s.h);
      ctx.restore();
      if (U.chance(0.5)) FX.dust(P.x - P.face * 6, P.y, 1, '#8e86a8', 8);
      return;
    }
    const set = air ? skin.alienFly : (walking ? skin.alienWalk : skin.alien);
    const frame = air ? Math.floor(t * 8) % 2 : (walking ? Math.floor(P.walk * 1.1) % 4 : (Math.sin(t * 1.3) > 0.9 ? 2 : (Math.sin(t * 2.2) > 0.6 ? 1 : 0)));
    // landing squash, stretch on the way up
    const sq = P.land > 0 ? 1 + P.land * 1.2 : (air && P.vy < -60 ? 0.9 : 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(P.face < 0 ? -sq : sq, 1 / sq);
    ctx.drawImage(set.frames[frame], -set.ox, -set.oy, set.w, set.h);
    ctx.restore();
    if (walking && !air && U.chance(0.2)) FX.dust(P.x - P.face * 5, P.y, 1, '#8e86a8', 10);
    if (air && U.chance(0.4)) FX.spawn({ x: P.x - P.face * 4, y: P.y - 4, vx: -P.face * 20, vy: 40, life: 0.3, size: 1, color: '#ffb03d', grav: 0, drag: 1, glow: 1 });
  }

  /* Blueprint, then the print head builds it from the ground up. */
  function drawPrint(ctx, g, b, s, x, y, t) {
    const pr = g.printing;
    const f = pr.t / pr.dur;
    const cv = s.frames[0];
    const w = s.w, h = s.h;
    const left = x - s.ox, top = y - s.oy;
    if (pr.t < 1) {
      // hologram blueprint flickering into place
      const a = 0.35 + 0.35 * Math.abs(Math.sin(pr.t * 18)) + Math.min(0.3, pr.t * 0.3);
      ctx.globalAlpha = a;
      ctx.drawImage(holoOf(cv), left, top - (1 - pr.t) * 20, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#58e8ff'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.strokeRect(left - 3.5, top - 3.5, w + 7, h + 7);
      ctx.setLineDash([]);
      F.draw(ctx, 'BLUEPRINT', x, top - 14, '#58e8ff', { center: true });
    } else {
      const k = U.clamp((pr.t - 1) / (pr.dur - 1), 0, 1);
      const cut = top + h * (1 - k);
      // ghost above the cut, solid below it
      ctx.globalAlpha = 0.35;
      ctx.drawImage(holoOf(cv), left, top, w, h);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.beginPath(); ctx.rect(left - 2, cut, w + 4, h); ctx.clip();
      ctx.drawImage(cv, left, top, w, h);
      ctx.restore();
      // the print bar
      ctx.fillStyle = '#ffffff'; ctx.fillRect(left - 6, cut - 1, w + 12, 2);
      ctx.fillStyle = '#58e8ff'; ctx.globalAlpha = 0.6; ctx.fillRect(left - 6, cut - 4, w + 12, 8); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(left - 10, cut - 3, 4, 6); ctx.fillRect(left + w + 6, cut - 3, 4, 6);
      if (U.chance(0.8)) FX.spawn({ x: left + Math.random() * w + g.intCam, y: cut, vx: U.rand(-20, 20), vy: U.rand(-40, -5), life: 0.4, size: 1, color: '#eafcff', grav: 60, drag: 1, glow: 1 });
      F.draw(ctx, Math.round(k * 100) + '%', x, top - 14, '#ffffff', { center: true });
    }
    // projector beams from the ground pegs
    ctx.strokeStyle = 'rgba(88,232,255,0.35)';
    ctx.beginPath(); ctx.moveTo(left - 4, y + 2); ctx.lineTo(left + 6, top); ctx.moveTo(left + w + 4, y + 2); ctx.lineTo(left + w - 6, top); ctx.stroke();
  }

  PD.home = { enter, update, draw, closeScene, touchMode, P, UI, groundY, ROOM_W };
})(window.PD);
