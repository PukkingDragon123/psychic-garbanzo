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
    UI.mode = b.id; UI.sel = 0;
    A.sfx.tone(180, { type: 'square', to: 900, dur: 0.18, vol: 0.08 });
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

    if (UI.mode) { updatePanel(dt, g); return; }

    const use_ = P.lock <= 0 && (IN.hit('KeyE') || IN.hit('space'));
    const m = IN.mouse;

    // the phone: Tab, or tap the device in the corner
    const onPhone = m.inside && m.x > VW - 34 && m.y > VH - 52;
    if (P.lock <= 0 && (IN.hit('Tab') || IN.hit('KeyB') || (m.leftPressed && onPhone))) { UI.mode = 'phone'; UI.sel = 0; A.sfx.click(); return; }

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

  /* ----------------------------------------------------------------- panels */
  const PANEL = { x: 92, y: 36, w: 296, h: 190 };
  function rows(g) {
    if (UI.mode === 'phone') return D.BUILDINGS;
    if (UI.mode === 'fab') return D.RECIPES.filter(r => r.tier <= g.buildLevel('fab'));
    if (UI.mode === 'docks') return D.RECIPES.filter(r => (g.save.parts[r.id] || 0) > 0);
    return [];
  }
  function updatePanel(dt, g) {
    const IN = PD.input, m = IN.mouse;
    const list = rows(g);
    if (IN.hit('esc') || (m.leftPressed && (m.x < PANEL.x || m.x > PANEL.x + PANEL.w || m.y < PANEL.y || m.y > PANEL.y + PANEL.h))) {
      UI.mode = null; P.lock = 0.2; A.sfx.click(); return;
    }
    if (IN.hit('down')) UI.sel = Math.min(list.length - 1, UI.sel + 1);
    if (IN.hit('up')) UI.sel = Math.max(0, UI.sel - 1);
    // rows are 20px tall from PANEL.y + 34
    if (m.leftPressed) {
      const i = Math.floor((m.y - (PANEL.y + 34)) / 20);
      if (i >= 0 && i < list.length && m.x < PANEL.x + PANEL.w - 4) { if (UI.sel === i) act(g, list[i]); else { UI.sel = i; A.sfx.click(); } }
      if (m.y > PANEL.y + PANEL.h - 30 && m.x > PANEL.x + PANEL.w - 120 && UI.mode === 'terminal') g.sellAll();
    }
    if (IN.hit('KeyE') || IN.hit('space') || IN.hit('enter')) {
      if (UI.mode === 'terminal') g.sellAll();
      else if (list[UI.sel]) act(g, list[UI.sel]);
    }
  }
  function act(g, item) {
    if (UI.mode === 'phone') {
      const lvl = g.buildLevel(item.id);
      if (lvl <= 0) { if (g.startBuild(item.id)) { UI.mode = null; P.lock = 0.3; } else say('NOT ENOUGH CREDITS'); }
      else if (lvl >= item.max) say('ALREADY MAXED');
      else if (!g.upgradeBuilding(item.id)) say('NOT ENOUGH CREDITS');
    } else if (UI.mode === 'fab') {
      if (!g.craft(item.id)) say('MISSING ORE');
    } else if (UI.mode === 'docks') {
      if (!g.install(item.id)) say('NO FREE SLOT');
    }
  }

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

    if (UI.mode) drawPanel(ctx, g, t);
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

  /* One hologram panel for everything: phone, docks, terminal, fabricator. */
  function holoFrame(ctx, title, sub, t) {
    const { x, y, w, h } = PANEL;
    ctx.fillStyle = 'rgba(4,14,26,0.9)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(88,232,255,0.06)';
    for (let yy = y + (Math.floor(t * 30) % 4); yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 1);
    ctx.strokeStyle = '#58e8ff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = '#58e8ff';
    ctx.fillRect(x, y, 14, 2); ctx.fillRect(x, y, 2, 14); ctx.fillRect(x + w - 14, y + h - 2, 14, 2); ctx.fillRect(x + w - 2, y + h - 14, 2, 14);
    F.draw(ctx, title, x + 8, y + 6, '#eafcff', { shadow: false, scale: 2 });
    if (sub) F.draw(ctx, sub, x + w - 8, y + 10, '#58e8ff', { right: true, shadow: false });
    F.draw(ctx, 'ESC', x + w - 8, y + h - 12, '#2f8fae', { right: true, shadow: false });
  }
  function wrap(ctx, text, x, y, maxW, col, maxLines) {
    const words = text.toUpperCase().split(' ');
    let line = '', ly = y, n = 0;
    for (const w of words) {
      if (F.width(line + ' ' + w, 1) > maxW && line) {
        F.draw(ctx, line, x, ly, col, { shadow: false }); line = w; ly += 10; n++;
        if (n >= (maxLines || 2)) return;
      } else line = line ? line + ' ' + w : w;
    }
    if (line) F.draw(ctx, line, x, ly, col, { shadow: false });
  }
  function rowBox(ctx, i, hot, sel) {
    const y = PANEL.y + 34 + i * 20;
    ctx.fillStyle = sel ? 'rgba(88,232,255,0.18)' : (i % 2 ? 'rgba(88,232,255,0.04)' : 'rgba(0,0,0,0)');
    ctx.fillRect(PANEL.x + 6, y, PANEL.w - 12, 19);
    if (sel) { ctx.strokeStyle = '#58e8ff'; ctx.strokeRect(PANEL.x + 6.5, y + 0.5, PANEL.w - 13, 18); }
    return y;
  }

  function drawPanel(ctx, g, t) {
    const { x, y, w, h } = PANEL;
    const b = D.BUILD[UI.mode];
    if (b) {
      // projector beam from the building up to the panel
      const bx = b.x - g.intCam, by = groundY(b.x) - AH.S[b.id + tierOf(Math.max(1, g.buildLevel(b.id)))].h;
      ctx.fillStyle = 'rgba(88,232,255,0.12)';
      ctx.beginPath(); ctx.moveTo(bx - 6, by); ctx.lineTo(bx + 6, by); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    }
    const list = rows(g);
    if (UI.mode === 'phone') {
      holoFrame(ctx, 'MULTI-TOOL', '$' + U.fmt(g.save.credits), t);
      F.draw(ctx, 'BUILDINGS   -   PICK ONE TO PRINT OR UPGRADE', x + 8, y + 24, '#2f8fae', { shadow: false });
      list.forEach((bd, i) => {
        const ry = rowBox(ctx, i, false, UI.sel === i);
        const lvl = g.buildLevel(bd.id);
        G.draw(ctx, bd.glyph, x + 10, ry + 3, '#eafcff', '#2f8fae');
        F.draw(ctx, bd.name, x + 28, ry + 6, '#eafcff', { shadow: false });
        const cost = D.buildCost(bd, lvl);
        const right = lvl <= 0 ? 'PRINT  $' + U.fmt(cost) : (lvl >= bd.max ? 'LV ' + lvl + '  MAX' : 'LV ' + lvl + '  UP  $' + U.fmt(cost));
        F.draw(ctx, right, x + w - 12, ry + 6, lvl >= bd.max ? '#8affa0' : (g.save.credits >= cost ? '#ffd34d' : '#ff6b8a'), { right: true, shadow: false });
      });
      const sb = list[UI.sel];
      if (sb) wrap(ctx, sb.blurb, x + 8, y + h - 40, w - 16, '#58e8ff', 2);
      F.draw(ctx, 'E  CONFIRM', x + 8, y + h - 12, '#eafcff', { shadow: false });
    } else if (UI.mode === 'terminal') {
      holoFrame(ctx, 'TERMINAL', 'LV ' + g.buildLevel('terminal') + '  +' + Math.round((D.UPG.crew.value(g.save.upg.crew || 0) - 1) * 100) + '% PRICES', t);
      const keys = Object.keys(g.save.vault).filter(k => g.save.vault[k] > 0).sort((a, c) => D.MAT[c].cr - D.MAT[a].cr);
      F.draw(ctx, 'ORE', x + 10, y + 24, '#2f8fae', { shadow: false });
      F.draw(ctx, 'QTY', x + 110, y + 24, '#2f8fae', { shadow: false });
      F.draw(ctx, 'EACH', x + 138, y + 24, '#2f8fae', { shadow: false });
      if (!keys.length) F.draw(ctx, 'NOTHING TO SELL. GO DIG.', x + 10, y + 50, '#2f8fae', { shadow: false });
      keys.slice(0, 6).forEach((k, i) => {
        const ry = y + 34 + i * 16, m = D.MAT[k];
        ctx.fillStyle = m.c[1]; ctx.fillRect(x + 10, ry + 2, 8, 8); ctx.fillStyle = m.c[0]; ctx.fillRect(x + 10, ry + 2, 8, 3);
        F.draw(ctx, m.name.toUpperCase().slice(0, 13), x + 22, ry + 4, '#eafcff', { shadow: false });
        F.draw(ctx, String(g.save.vault[k]), x + 110, ry + 4, '#ffd34d', { shadow: false });
        const pct = Math.round((g.demandFor(+k) - 1) * 100);
        F.draw(ctx, U.fmt(g.priceOf(+k)), x + 138, ry + 4, '#eafcff', { shadow: false });
        F.draw(ctx, (pct >= 0 ? '+' : '') + pct + '%', x + 168, ry + 4, pct >= 0 ? '#8affa0' : '#ff6b8a', { shadow: false });
      });
      // comms feed
      ctx.fillStyle = 'rgba(88,232,255,0.25)'; ctx.fillRect(x + 196, y + 22, 1, h - 60);
      F.draw(ctx, 'COMMS', x + 204, y + 24, '#2f8fae', { shadow: false });
      UI.feed.forEach((msg, i) => {
        const fy = y + 36 + i * 40;
        F.draw(ctx, msg[0], x + 204, fy, '#ffd34d', { shadow: false });
        const words = msg[1].toUpperCase().split(' ');
        let line = '', ly = fy + 10;
        for (const wd of words) {
          if (F.width(line + ' ' + wd, 1) > 84) { F.draw(ctx, line, x + 204, ly, '#eafcff', { shadow: false }); line = wd; ly += 9; if (ly > fy + 30) break; }
          else line = line ? line + ' ' + wd : wd;
        }
        if (line && ly <= fy + 30) F.draw(ctx, line, x + 204, ly, '#eafcff', { shadow: false });
      });
      const total = g.vaultValue();
      const hot = total > 0;
      ctx.fillStyle = hot ? (Math.sin(t * 5) > 0 ? '#39ffa6' : '#2ad48a') : '#0f2a2e';
      ctx.fillRect(x + w - 120, y + h - 30, 112, 20);
      F.draw(ctx, 'E  SELL ALL  $' + U.fmt(total), x + w - 64, y + h - 23, hot ? '#05170e' : '#2f5a44', { center: true, shadow: false });
    } else if (UI.mode === 'fab') {
      holoFrame(ctx, 'FABRICATOR', 'LV ' + g.buildLevel('fab') + '  TIER ' + g.buildLevel('fab'), t);
      F.draw(ctx, 'RECIPE', x + 28, y + 24, '#2f8fae', { shadow: false });
      F.draw(ctx, 'NEEDS', x + 140, y + 24, '#2f8fae', { shadow: false });
      F.draw(ctx, 'OWNED', x + w - 12, y + 24, '#2f8fae', { right: true, shadow: false });
      list.forEach((r, i) => {
        const ry = rowBox(ctx, i, false, UI.sel === i);
        G.draw(ctx, r.glyph, x + 10, ry + 3, '#eafcff', '#2f8fae');
        F.draw(ctx, r.name, x + 28, ry + 6, '#eafcff', { shadow: false });
        let mx = x + 140, ok = true;
        for (const key in r.mats) {
          const mat = D.M[key], have = g.save.vault[mat] || 0, need = r.mats[key];
          if (have < need) ok = false;
          ctx.fillStyle = D.MAT[mat].c[1]; ctx.fillRect(mx, ry + 5, 7, 7); ctx.fillStyle = D.MAT[mat].c[0]; ctx.fillRect(mx, ry + 5, 7, 2);
          F.draw(ctx, have + '/' + need, mx + 9, ry + 6, have >= need ? '#8affa0' : '#ff6b8a', { shadow: false });
          mx += 40;
        }
        F.draw(ctx, String(g.save.parts[r.id] || 0), x + w - 12, ry + 6, '#ffd34d', { right: true, shadow: false });
        if (UI.sel === i) wrap(ctx, r.blurb, x + 8, y + h - 40, w - 16, ok ? '#58e8ff' : '#ff6b8a', 2);
      });
      F.draw(ctx, 'E  CRAFT', x + 8, y + h - 12, '#eafcff', { shadow: false });
    } else if (UI.mode === 'docks') {
      const slots = g.slots(), used = g.installedCount();
      holoFrame(ctx, 'THE DOCKS', 'LV ' + g.buildLevel('docks') + '  SLOTS ' + used + '/' + slots, t);
      // the pod's slots
      let sx = x + 10;
      const inst = [];
      for (const id in g.save.installed) for (let k = 0; k < g.save.installed[id]; k++) inst.push(id);
      for (let i = 0; i < slots; i++) {
        G.hex(ctx, sx + 8, y + 32, 8, inst[i] ? '#1e9e5c' : '#0f2a2e', '#58e8ff', 1);
        if (inst[i]) G.draw(ctx, D.RECIPE[inst[i]].glyph, sx + 2, y + 26, '#eafcff', 'rgba(0,0,0,0)');
        sx += 22;
      }
      F.draw(ctx, 'FITTED PARTS', x + w - 12, y + 30, '#2f8fae', { right: true, shadow: false });
      F.draw(ctx, 'PARTS IN STORE  -  PICK ONE TO FIT', x + 10, y + 50, '#2f8fae', { shadow: false });
      if (!list.length) F.draw(ctx, 'NOTHING BUILT YET. THE FABRICATOR MAKES PARTS.', x + 10, y + 70, '#2f8fae', { shadow: false });
      list.forEach((r, i) => {
        const ry = PANEL.y + 34 + 26 + i * 20;
        ctx.fillStyle = UI.sel === i ? 'rgba(88,232,255,0.18)' : 'rgba(0,0,0,0)'; ctx.fillRect(x + 6, ry, w - 12, 19);
        if (UI.sel === i) { ctx.strokeStyle = '#58e8ff'; ctx.strokeRect(x + 6.5, ry + 0.5, w - 13, 18); }
        G.draw(ctx, r.glyph, x + 10, ry + 3, '#eafcff', '#2f8fae');
        F.draw(ctx, r.name + '  x' + (g.save.parts[r.id] || 0), x + 28, ry + 6, '#eafcff', { shadow: false });
        F.draw(ctx, r.blurb.toUpperCase().slice(0, 26), x + w - 12, ry + 6, '#58e8ff', { right: true, shadow: false });
      });
      F.draw(ctx, 'E  FIT PART', x + 8, y + h - 12, '#eafcff', { shadow: false });
    }
  }

  PD.home = { enter, update, draw, P, UI, groundY, ROOM_W };
})(window.PD);
