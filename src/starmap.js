/* The chart. Two views: the galaxy (four sectors, each one past the first
   locked behind a drive you buy outright) and a solar system (the worlds in
   one sector, orbiting their star, ready to be dropped on to). */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const D = PD.data;
  const A = PD.audio;
  const G = PD.galaxy;
  const VW = 480, VH = 270;

  const S = {
    view: 'galaxy',       // 'galaxy' | 'system'
    zone: 0,              // zone being looked at in system view
    selZone: 0,
    selBody: 0,
    t: 0,
    zoom: 0,              // 0..1 transition into the system view
    msg: '', msgT: 0
  };

  const suns = {};
  const planets = {};
  function sun(zi) {
    if (!suns[zi]) suns[zi] = G.buildSun(16, D.ZONES[zi].star);
    return suns[zi];
  }
  function planetArt(i, size) {
    const k = i + ':' + size;
    if (!planets[k]) planets[k] = G.buildPlanet(size, D.BODIES[i].tint, 1000 + i * 977, i % 3 === 2);
    return planets[k];
  }

  function zoneOpen(g, zi) { return zi === 0 || (g.save.drives || 0) >= zi; }
  function bodyOpen(g, i) { return i <= g.save.unlocked && zoneOpen(g, D.zoneOf(i)); }

  function enter(g) {
    S.view = 'galaxy';
    S.t = 0; S.zoom = 0;
    S.selZone = D.zoneOf(Math.min(g.save.unlocked, D.BODIES.length - 1));
    S.selBody = Math.min(g.save.unlocked, D.BODIES.length - 1);
    A.sfx.click();
  }

  function say(m) { S.msg = m; S.msgT = 2.6; }

  function openZone(g, zi) {
    if (!zoneOpen(g, zi)) {
      const z = D.ZONES[zi];
      if (!zoneOpen(g, zi - 1)) { say('BUY THE ' + D.ZONES[zi - 1].drive.name + ' FIRST.'); A.sfx.deny(); return; }
      if (g.save.credits < z.drive.cost) { say('NEED $' + U.fmt(z.drive.cost) + ' FOR THE ' + z.drive.name + '.'); A.sfx.deny(); return; }
      g.save.credits -= z.drive.cost;
      g.save.drives = zi;
      A.sfx.buy();
      PD.fx.flash(0.5, z.star);
      say(z.drive.name + ' INSTALLED. ' + z.name + ' IS OPEN.');
      g.save.tut = g.save.tut || {};
      return;
    }
    S.view = 'system';
    S.zone = zi;
    S.zoom = 0;
    const list = D.ZONES[zi].bodies;
    S.selBody = list.indexOf(g.save.unlocked) >= 0 ? g.save.unlocked : list[0];
    A.sfx.click();
  }

  /* ---------------------------------------------------------------- update */
  function update(dt, g) {
    const IN = PD.input;
    S.t += dt;
    S.msgT = Math.max(0, S.msgT - dt);
    S.zoom = Math.min(1, S.zoom + dt * 3.4);
    const click = IN.mouse.leftPressed;
    const mx = IN.mouse.x, my = IN.mouse.y;

    if (IN.hit('esc')) {
      if (S.view === 'system') { S.view = 'galaxy'; S.zoom = 0; A.sfx.click(); }
      else g.dock(true);
      return;
    }

    if (S.view === 'galaxy') {
      if (IN.hit('left')) S.selZone = U.clamp(S.selZone - 1, 0, D.ZONES.length - 1);
      if (IN.hit('right')) S.selZone = U.clamp(S.selZone + 1, 0, D.ZONES.length - 1);
      for (let i = 0; i < D.ZONES.length; i++) {
        const z = D.ZONES[i];
        if (Math.abs(mx - z.x) < 30 && Math.abs(my - z.y) < 30) {
          S.selZone = i;
          if (click) openZone(g, i);
        }
      }
      if (IN.hit('KeyE') || IN.hit('space')) openZone(g, S.selZone);
      // the whole bottom panel is a button on touch
      if (click && my > VH - 44) openZone(g, S.selZone);
      return;
    }

    // ---- system view
    const list = D.ZONES[S.zone].bodies;
    const at = list.indexOf(S.selBody);
    if (IN.hit('left')) S.selBody = list[U.clamp(at - 1, 0, list.length - 1)];
    if (IN.hit('right')) S.selBody = list[U.clamp(at + 1, 0, list.length - 1)];
    for (let k = 0; k < list.length; k++) {
      const p = bodyPos(k, list.length);
      if (Math.hypot(mx - p.x, my - p.y) < 26) {
        S.selBody = list[k];
        if (click) drop(g, list[k]);
      }
    }
    if (IN.hit('KeyE') || IN.hit('space')) drop(g, S.selBody);
    if (click && my > VH - 40 && mx > VW - 130) drop(g, S.selBody);
  }

  function drop(g, i) {
    if (i > g.save.unlocked) { say('DESTROY ' + D.BODIES[g.save.unlocked].name.toUpperCase() + ' FIRST.'); A.sfx.deny(); return; }
    if (!zoneOpen(g, D.zoneOf(i))) { A.sfx.deny(); return; }
    A.sfx.warp();
    g.dive(i);
  }

  function bodyPos(k, n) {
    const spread = Math.min(120, 330 / Math.max(1, n));
    const x = 150 + k * spread;
    const y = 132 + Math.sin(k * 1.1 + 0.6) * 26;
    return { x, y };
  }

  /* ------------------------------------------------------------------ draw */
  function ring(ctx, x, y, r, col, alpha, dash) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    if (dash) ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function panel(ctx, x, y, w, h, col) {
    ctx.fillStyle = 'rgba(6,4,18,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 10, 1); ctx.fillRect(x, y, 1, 10);
    ctx.fillRect(x + w - 10, y + h - 1, 10, 1); ctx.fillRect(x + w - 1, y + h - 10, 1, 10);
  }

  function draw(ctx, g, t) {
    G.draw(ctx, { x: S.view === 'galaxy' ? 0 : 600, y: 0 }, t, 7, '#05030f');
    ctx.fillStyle = 'rgba(4,2,12,0.68)';
    ctx.fillRect(0, 0, VW, VH);

    if (S.view === 'galaxy') drawGalaxy(ctx, g, t);
    else drawSystem(ctx, g, t);

    // header
    ctx.fillStyle = 'rgba(6,4,18,0.9)';
    ctx.fillRect(0, 0, VW, 16);
    ctx.fillStyle = '#7ef9ff'; ctx.fillRect(0, 16, VW, 1);
    PD.glyph.draw(ctx, 'planet', 3, 2, '#ffffff', '#7ef9ff');
    F.draw(ctx, S.view === 'galaxy' ? 'GALAXY CHART' : D.ZONES[S.zone].name, 20, 5, '#7ef9ff', { shadow: false });
    F.draw(ctx, S.view === 'galaxy' ? 'ESC  BACK TO THE SHIP' : 'ESC  BACK TO THE CHART', 150, 5, '#5a4d80', { shadow: false });
    F.draw(ctx, '$' + U.fmt(g.save.credits), VW - 6, 4, '#ffd34d', { right: true, shadow: false });

    if (S.msgT > 0) {
      const w = F.width(S.msg, 1) + 16;
      ctx.globalAlpha = Math.min(1, S.msgT);
      panel(ctx, VW / 2 - w / 2, 22, w, 16, '#ffb03d');
      F.draw(ctx, S.msg, VW / 2, 27, '#ffd34d', { center: true, shadow: false });
      ctx.globalAlpha = 1;
    }
    PD.touch.draw(ctx, 'ui');
  }

  function drawGalaxy(ctx, g, t) {
    // travel lanes
    for (let i = 1; i < D.ZONES.length; i++) {
      const a = D.ZONES[i - 1], b = D.ZONES[i];
      const open = zoneOpen(g, i);
      ctx.save();
      ctx.globalAlpha = open ? 0.55 : 0.25;
      ctx.strokeStyle = open ? '#7ef9ff' : '#5a4d80';
      ctx.lineWidth = 1;
      if (!open) ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 30, b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }

    for (let i = 0; i < D.ZONES.length; i++) {
      const z = D.ZONES[i];
      const open = zoneOpen(g, i);
      const sel = S.selZone === i;
      ctx.save();
      if (!open) ctx.globalAlpha = 0.45;
      const sp = sun(i);
      const pulse = 1 + Math.sin(t * 2 + i) * 0.04;
      ctx.drawImage(sp, z.x - sp.width / 2 * pulse, z.y - sp.height / 2 * pulse, sp.width * pulse, sp.height * pulse);
      // its worlds as little beads on an orbit
      ring(ctx, z.x, z.y, 26, z.star, 0.35, !open);
      for (let k = 0; k < z.bodies.length; k++) {
        const a = t * (0.3 + k * 0.12) + k * 2.1;
        const px = z.x + Math.cos(a) * 26, py = z.y + Math.sin(a) * 26 * 0.34;
        const bi = z.bodies[k];
        ctx.fillStyle = g.save.destroyed[bi] ? '#5a4d80' : D.BODIES[bi].tint;
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      if (!open) {
        PD.glyph.draw(ctx, 'lock', z.x - 6, z.y - 8, '#ffffff', '#5a4d80');
        F.draw(ctx, '$' + U.fmt(z.drive.cost), z.x, z.y + 42, g.save.credits >= z.drive.cost ? '#ffd34d' : '#ff6b8a', { center: true });
      }
      F.draw(ctx, z.name, z.x, z.y + 32, open ? '#f2e9ff' : '#9c8ec4', { center: true, shadow: true });
      if (sel) {
        const w = F.width(z.name, 1) + 14;
        ctx.strokeStyle = '#ffd34d';
        ctx.setLineDash([2, 3]);
        ctx.strokeRect(z.x - w / 2 + 0.5, z.y - 34.5, w, 70);
        ctx.setLineDash([]);
      }
    }

    // selection panel
    const z = D.ZONES[S.selZone];
    const open = zoneOpen(g, S.selZone);
    panel(ctx, 8, VH - 44, VW - 16, 38, open ? '#7ef9ff' : '#ff8a3d');
    F.draw(ctx, z.name, 16, VH - 38, z.star, { shadow: false });
    F.draw(ctx, z.sub, 16, VH - 28, '#9c8ec4', { shadow: false });
    let done = 0;
    for (const b of z.bodies) if (g.save.destroyed[b]) done++;
    F.draw(ctx, 'WORLDS ' + done + '/' + z.bodies.length, 16, VH - 18, '#f2e9ff', { shadow: false });
    if (open) {
      F.draw(ctx, 'E  ENTER SECTOR', VW - 16, VH - 26, '#39ffa6', { right: true, shadow: false });
    } else {
      F.draw(ctx, z.drive.name, VW - 16, VH - 38, '#ff8a3d', { right: true, shadow: false });
      F.draw(ctx, z.drive.blurb, VW - 16, VH - 28, '#9c8ec4', { right: true, shadow: false });
      const afford = g.save.credits >= z.drive.cost;
      F.draw(ctx, 'E  BUY DRIVE  $' + U.fmt(z.drive.cost), VW - 16, VH - 18, afford ? '#ffd34d' : '#ff6b8a', { right: true, shadow: false });
    }
  }

  function drawSystem(ctx, g, t) {
    const z = D.ZONES[S.zone];
    const list = z.bodies;
    const zo = U.clamp(S.zoom, 0, 1);
    ctx.save();
    ctx.globalAlpha = zo;

    // the star, hard left, with orbit arcs sweeping out of it
    const sp = sun(S.zone);
    ctx.drawImage(sp, 34 - sp.width / 2, 132 - sp.height / 2);
    for (let k = 0; k < list.length; k++) {
      const p = bodyPos(k, list.length);
      ctx.save();
      ctx.globalAlpha = zo * 0.3;
      ctx.strokeStyle = z.star;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.ellipse(34, 132, p.x - 34, (p.x - 34) * 0.42, 0, -0.7, 0.7);
      ctx.stroke();
      ctx.restore();
    }

    for (let k = 0; k < list.length; k++) {
      const i = list[k];
      const p = bodyPos(k, list.length);
      const size = 22 + Math.min(3, k) * 5;
      const art = planetArt(i, size);
      const open = bodyOpen(g, i);
      const sel = S.selBody === i;
      const bob = Math.sin(t * 1.2 + k) * 2;
      ctx.save();
      if (!open) ctx.globalAlpha = zo * 0.4;
      ctx.drawImage(art, p.x - art.width / 2, p.y + bob - art.height / 2);
      ctx.restore();
      if (g.save.destroyed[i]) {
        ctx.strokeStyle = '#ff6b8a'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - 12, p.y + bob - 12); ctx.lineTo(p.x + 12, p.y + bob + 12);
        ctx.moveTo(p.x + 12, p.y + bob - 12); ctx.lineTo(p.x - 12, p.y + bob + 12);
        ctx.stroke();
      } else if (!open) {
        PD.glyph.draw(ctx, 'lock', p.x - 6, p.y + bob - 6, '#ffffff', '#5a4d80');
      }
      F.draw(ctx, D.BODIES[i].name.toUpperCase(), p.x, p.y + bob + size * 0.7 + 6, sel ? '#ffd34d' : '#9c8ec4', { center: true });
      if (sel) {
        const r = size * 0.62 + 6 + Math.sin(t * 4) * 1.5;
        ctx.strokeStyle = '#ffd34d';
        ctx.lineWidth = 1;
        for (let a = 0; a < 4; a++) {
          const ang = t * 0.6 + a * Math.PI / 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y + bob, r, ang, ang + 0.5);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // dossier
    const b = D.BODIES[S.selBody];
    const open = bodyOpen(g, S.selBody);
    panel(ctx, 8, VH - 72, VW - 16, 66, open ? '#7ef9ff' : '#5a4d80');
    F.draw(ctx, b.name.toUpperCase(), 16, VH - 66, '#f2e9ff', { shadow: false, scale: 2 });
    F.draw(ctx, b.kind.toUpperCase(), VW - 16, VH - 64, '#7ef9ff', { right: true, shadow: false });
    F.draw(ctx, b.blurb, 16, VH - 48, '#9c8ec4', { shadow: false });
    F.draw(ctx, 'DEPTH ' + b.radius * 10 + 'M', 16, VH - 36, '#7ef9ff', { shadow: false });
    F.draw(ctx, 'GRAV ' + b.gravity, 106, VH - 36, '#7ef9ff', { shadow: false });
    F.draw(ctx, 'CORE ' + U.fmt(b.coreHp), 166, VH - 36, '#ff6b8a', { shadow: false });
    F.draw(ctx, 'BOUNTY $' + U.fmt(b.reward), 246, VH - 36, '#ffd34d', { shadow: false });
    let ox = 16;
    F.draw(ctx, 'ORE', ox, VH - 22, '#9c8ec4', { shadow: false });
    ox += 24;
    for (const pair of b.ores.slice(0, 8)) {
      const m = D.MAT[pair[0]];
      ctx.fillStyle = m.c[1]; ctx.fillRect(ox, VH - 23, 8, 8);
      ctx.fillStyle = m.c[0]; ctx.fillRect(ox, VH - 23, 8, 2);
      ctx.fillStyle = '#0a0616'; ctx.fillRect(ox, VH - 15, 8, 1);
      ox += 11;
    }
    if (g.save.destroyed[S.selBody]) F.draw(ctx, 'ALREADY DESTROYED', ox + 10, VH - 22, '#ff6b8a', { shadow: false });
    if (open) {
      const bw = 110, bx = VW - bw - 12, by = VH - 30;
      ctx.fillStyle = Math.sin(t * 4) > 0 ? '#39ffa6' : '#2ad48a';
      ctx.fillRect(bx, by, bw, 20);
      ctx.strokeStyle = '#d6ffe9'; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 19);
      F.draw(ctx, 'E    DROP', bx + bw / 2, by + 7, '#05170e', { center: true, shadow: false });
    } else {
      F.draw(ctx, S.selBody > g.save.unlocked ? 'LOCKED - FINISH THE LAST WORLD' : 'NEEDS A DRIVE', VW - 14, VH - 22, '#ff6b8a', { right: true, shadow: false });
    }
  }

  PD.starmap = { enter, update, draw, S };
})(window.PD);
