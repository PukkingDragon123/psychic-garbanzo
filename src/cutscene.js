/* Cold open. Establishes the ship, the crew, and the fact that you are the
   villain of this story. Skippable, and only shown on a fresh save. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const A = PD.audio;
  const AI = PD.artint;

  const VW = 480, VH = 270;

  let t = 0, beat = 0, done = true, moon = null, stars = null, letter = 0, shipX = -120, card = null;

  /* Cards carry glyph sentences; lines are glyph strips from the crew. */
  const BEATS = [
    { dur: 3.8, card: ['THE OUTER DARK', 'SOMEWHERE EXPENSIVE'], glyphs: ['galaxy', 'planet', 'planet'] },
    { dur: 0, say: ['nix', 'Good morning. Your balance is zero credits. Your debt is not zero credits.'] },
    { dur: 0, say: ['you', 'Then we take the money out of the rocks. Every rock. All of them.'] },
    { dur: 0, say: ['bolt', 'Pod is fuelled. Hold the stick to fly, grab the floating ore, then open a time hole home.'] },
    { dur: 0, say: ['zaz', 'Bring it to me. I appraise, you profit, the house takes a modest slice.'] },
    { dur: 3.2, card: ['OBJECTIVE', 'GET RICH.  BREAK WORLDS.  OWN THE GALAXY.'], glyphs: ['coin', 'arrowR', 'galaxy'] }
  ];

  function start() {
    t = 0; beat = 0; done = false; letter = 0; shipX = -120; card = null;
    moon = AI.buildMoon(190, '#9aa8c4', 991);
    const rnd = U.mulberry32(4242);
    stars = [];
    for (let i = 0; i < 150; i++) {
      stars.push({ x: rnd() * VW, y: rnd() * VH, s: rnd() > 0.85 ? 2 : 1, p: 0.2 + rnd() * 0.8, tw: rnd() * 6.28 });
    }
    PD.dialog.clear();
    enterBeat();
    A.music(true);
    A.setIntensity(0.15);
  }

  function enterBeat() {
    const b = BEATS[beat];
    if (!b) { finish(); return; }
    card = b.card || null;
    if (b.say) PD.dialog.push(b.say[0], b.say[1]);
  }

  function finish() { done = true; PD.dialog.clear(); }

  function update(dt, g) {
    if (done) return;
    t += dt;
    letter = Math.min(1, letter + dt * 2.5);
    shipX = U.damp(shipX, 190, 0.5, dt);

    const IN = PD.input;
    if (IN.hit('esc')) { finish(); return; }

    const b = BEATS[beat];
    if (!b) { finish(); return; }

    if (b.say) {
      PD.dialog.update(dt);
      if (IN.hit('KeyE') || IN.hit('space') || IN.hit('enter') || IN.mouse.leftPressed) {
        if (!PD.dialog.advance() || !PD.dialog.active()) { beat++; t = 0; enterBeat(); }
      }
      if (!PD.dialog.active()) { beat++; t = 0; enterBeat(); }
    } else {
      if (t > b.dur || IN.hit('KeyE') || IN.hit('space') || IN.hit('enter') || IN.mouse.leftPressed) {
        beat++; t = 0; enterBeat();
      }
    }
  }

  function draw(ctx, g, time) {
    // deep space
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, '#0d0a24');
    grd.addColorStop(1, '#04030e');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, VW, VH);

    for (const s of stars) {
      ctx.globalAlpha = s.p * (0.5 + 0.5 * Math.sin(time * 2 + s.tw));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(((s.x - time * s.p * 4) % VW + VW) % VW | 0, s.y | 0, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // the moon we are about to ruin
    ctx.drawImage(moon, VW - 150, 40 + Math.sin(time * 0.3) * 3 | 0);

    // the barge, drifting in
    const ship = PD.art.skinFor(g.save.cos).ship;
    const sy = 150 + Math.sin(time * 0.9) * 4;
    ctx.drawImage(ship.frames[Math.sin(time * 3) > 0 ? 1 : 0], (shipX - ship.ox) | 0, (sy - ship.oy) | 0);
    const pod = PD.art.skinFor(g.save.cos).pod;
    ctx.drawImage(pod.frames[Math.floor(time * 8) % 2], (shipX + 70 - pod.ox) | 0, (sy + 30 + Math.sin(time * 2) * 3 - pod.oy) | 0);
    // engine plume
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time * 12 + i);
      ctx.fillStyle = i ? '#ff9b3d' : '#ffe08a';
      ctx.fillRect(shipX - 46 - i * 7 | 0, sy - 6 + i | 0, 8, 5 - i);
    }
    ctx.globalAlpha = 1;

    // letterbox
    const bar = Math.round(22 * letter);
    ctx.fillStyle = '#050310';
    ctx.fillRect(0, 0, VW, bar);
    ctx.fillRect(0, VH - bar, VW, bar);

    if (card) {
      const a = U.clamp(Math.min(t * 1.6, (BEATS[beat].dur - t) * 1.6), 0, 1);
      ctx.globalAlpha = a;
      const gl = BEATS[beat].glyphs || [];
      for (let i = 0; i < gl.length; i++) {
        const x = VW / 2 - gl.length * 17 + i * 34 + 17;
        PD.glyph.hex(ctx, x, 78, 15, 'rgba(8,4,18,0.7)', '#ffd34d', 1);
        PD.glyph.draw(ctx, gl[i], x - 7, 71, '#ffffff', '#ffd34d');
      }
      F.draw(ctx, card[0], VW / 2, 104, '#ffd34d', { center: true, scale: 3, shadow: '#7a2a10' });
      F.draw(ctx, card[1], VW / 2, 134, '#f2e9ff', { center: true, shadow: false });
      ctx.globalAlpha = 1;
    }

    PD.dialog.draw(ctx, g, time, PD.art.skinFor(g.save.cos).alien);

    F.draw(ctx, 'ESC  SKIP', VW - 6, VH - bar - 12, 'rgba(240,235,255,0.5)', { right: true, shadow: false });
  }

  PD.cutscene = { start, update, draw, get done() { return done; } };
})(window.PD);
