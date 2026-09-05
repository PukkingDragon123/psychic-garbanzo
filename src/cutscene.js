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
    { dur: 3.4, card: ['galaxy', 'planet', 'planet', 'planet'] },
    { dur: 0, say: ['nix', ['coin', 'cross', 'arrowR', 'skull']] },
    { dur: 0, say: ['you', ['drill', 'planet', 'arrowR', 'coin', 'coin', 'coin']] },
    { dur: 0, say: ['bolt', ['speed', 'arrowR', 'ore', 'arrowR', 'hole', 'home']] },
    { dur: 3.0, card: ['coin', 'arrowR', 'galaxy'] }
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
      const w = card.length * 34;
      for (let i = 0; i < card.length; i++) {
        const x = VW / 2 - w / 2 + i * 34 + 17;
        PD.glyph.hex(ctx, x, 110, 15, 'rgba(8,4,18,0.7)', '#ffd34d', 1);
        PD.glyph.draw(ctx, card[i], x - 7, 103, '#ffffff', '#ffd34d');
      }
      ctx.globalAlpha = 1;
    }

    PD.dialog.draw(ctx, g, time, PD.art.skinFor(g.save.cos).alien);

    PD.glyph.draw(ctx, 'cross', VW - 20, VH - bar - 18, 'rgba(240,235,255,0.5)', 'rgba(240,235,255,0.3)');
  }

  PD.cutscene = { start, update, draw, get done() { return done; } };
})(window.PD);
