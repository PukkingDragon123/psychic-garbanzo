/* Pictographic tutorial: a strip of glyph sentences that advance as you do
   the thing they show. No words. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const G = PD.glyph;
  const F = PD.font;

  const VW = 480, VH = 270;

  /* Each step: which scene it belongs to, the glyph sentence, and a predicate
     that marks it done. */
  const STEPS = [
    { scene: 'interior', text: 'WALK TO THE LAB AND BUILD A NODE', say: ['hand', 'arrowR', 'hex'],
      done: g => Object.keys(g.save.upg).some(k => g.save.upg[k] > 0) },
    { scene: 'interior', text: 'TAKE THE AIRLOCK TO THE STAR CHART', say: ['hand', 'arrowR', 'planet'],
      done: g => g.state === 'starmap' },
    { scene: 'starmap', text: 'PICK A SECTOR, THEN A WORLD, THEN DROP', say: ['planet', 'arrowD', 'drill'],
      done: g => g.state === 'play' },
    { scene: 'play', text: 'HOLD LEFT MOUSE TO DRILL THE ROCK', say: ['hand', 'arrowD', 'drill', 'ore'],
      done: g => g.save.totalMined > 8 },
    { scene: 'play', text: 'THE WIRE STOPS YOU STRAYING FROM THE POD', say: ['belt', 'arrowR', 'home'],
      done: g => (g.player.tetherFrac || 0) > 0.55 },
    { scene: 'play', text: 'HOLD FULL OR AIR LOW? BOARD THE POD  (E)', say: ['cargo', 'arrowR', 'home'],
      done: g => g.player.docked },
    { scene: 'interior', text: 'ZAZ VALUES ORE. SELL IT AT THE EXCHANGE', say: ['clock', 'arrowR', 'sell', 'coin'],
      done: g => g.save.totalEarned > 0 }
  ];

  const st = { i: 0, flash: 0, doneT: 0 };

  function current(g) {
    if (!g.save.tut) g.save.tut = { i: 0 };
    return STEPS[g.save.tut.i] || null;
  }

  function update(dt, g, scene) {
    const s = current(g);
    if (!s) return;
    st.flash += dt;
    if (st.doneT > 0) {
      st.doneT -= dt;
      if (st.doneT <= 0) { g.save.tut.i++; g.saveGame(); }
      return;
    }
    if (s.scene === scene && s.done(g)) {
      st.doneT = 0.9;
      PD.audio.sfx.tone(900, { type: 'triangle', to: 1400, dur: 0.2, vol: 0.12 });
    }
  }

  function draw(ctx, g, scene) {
    const s = current(g);
    if (!s || s.scene !== scene) return;
    const w = Math.max(s.say.length * 20 + 16, F.width(s.text, 1) + 20);
    const x = VW / 2 - w / 2, y = scene === 'interior' ? 42 : (scene === 'starmap' ? 44 : 24);
    const done = st.doneT > 0;
    ctx.fillStyle = 'rgba(8,4,18,0.88)';
    ctx.fillRect(x, y, w, 40);
    ctx.strokeStyle = done ? '#8affa0' : '#ffd34d';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 39);
    for (let i = 0; i < s.say.length; i++) {
      const bump = (!done && i === s.say.length - 1) ? Math.sin(st.flash * 6) * 1.5 : 0;
      G.draw(ctx, s.say[i], VW / 2 - s.say.length * 10 + i * 20 + 3, y + 4 + bump, done ? '#8affa0' : '#ffffff', done ? '#3fb85a' : '#ffd34d');
    }
    F.draw(ctx, s.text, VW / 2, y + 24, done ? '#8affa0' : '#ffd34d', { center: true });
    if (done) G.draw(ctx, 'check', x + w - 14, y - 6, '#8affa0', '#3fb85a');
    for (let i = 0; i < STEPS.length; i++) {
      G.hex(ctx, x + 6 + i * 6, y + 46, 2, i < g.save.tut.i ? '#8affa0' : (i === g.save.tut.i ? '#ffd34d' : '#2a1c4a'), null);
    }
  }

  PD.tutorial = { update, draw, STEPS, current, state: st };
})(window.PD);
