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
    { scene: 'space', say: ['hand', 'arrowR', 'speed'],       done: g => Math.hypot(PD.space.S.scoot.vx, PD.space.S.scoot.vy) > 60 },
    { scene: 'space', say: ['speed', 'arrowR', 'ore', 'cargo'], done: g => g.player.cargoKg > 3 },
    { scene: 'space', say: ['gun', 'arrowR', 'rock'],           done: g => PD.space.S.rocks.some(r => r.dead) },
    { scene: 'space', say: ['cargo', 'arrowR', 'hole', 'home'], done: g => !!PD.space.S.hole },
    { scene: 'interior', say: ['hand', 'arrowR', 'sell', 'coin'],   done: g => g.save.totalEarned > 0 },
    { scene: 'interior', say: ['coin', 'arrowR', 'hex', 'up'],      done: g => Object.keys(g.save.upg).some(k => g.save.upg[k] > 0) },
    { scene: 'interior', say: ['planet', 'arrowR', 'drill'],        done: g => g.state === 'play' },
    { scene: 'play', say: ['hand', 'arrowD', 'drill', 'ore'],       done: g => g.save.totalMined > 8 },
    { scene: 'play', say: ['o2', 'arrowD', 'bang', 'arrowU', 'hole'], done: g => g.player.docked }
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
    const w = s.say.length * 20 + 16;
    const x = VW / 2 - w / 2, y = 8;
    const done = st.doneT > 0;
    ctx.fillStyle = 'rgba(8,4,18,0.85)';
    ctx.fillRect(x, y, w, 24);
    ctx.strokeStyle = done ? '#8affa0' : '#ffd34d';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 23);
    for (let i = 0; i < s.say.length; i++) {
      const bump = (!done && i === s.say.length - 1) ? Math.sin(st.flash * 6) * 1.5 : 0;
      G.draw(ctx, s.say[i], x + 8 + i * 20, y + 5 + bump, done ? '#8affa0' : '#ffffff', done ? '#3fb85a' : '#ffd34d');
    }
    if (done) G.draw(ctx, 'check', x + w - 14, y - 6, '#8affa0', '#3fb85a');
    // step counter as hex pips
    for (let i = 0; i < STEPS.length; i++) {
      G.hex(ctx, x + 6 + i * 6, y + 30, 2, i < g.save.tut.i ? '#8affa0' : (i === g.save.tut.i ? '#ffd34d' : '#2a1c4a'), null);
    }
  }

  PD.tutorial = { update, draw, STEPS, current, state: st };
})(window.PD);
