/* MR CHUM, and why any of this is happening.

   You did not decide to eat a galaxy. You lost a bet. The game opens on the
   night you lost it -- one slot machine, one lever, everything you had -- and
   on the gentleman who was standing behind you when the reels stopped.

   MR CHUM is a shark. Not metaphorically: a small, round, extremely pleased
   shark in a blue suit and a red tie, with a briefcase and a payment plan. He
   fits a watch to your wrist on the way out of the casino and from then on he
   is in it -- a little blue hologram that walks up and down the bottom of your
   screen talking at you out of a speech bubble.

   That gives the game the tutorial it never had. There is no manual and no
   pop-up with a tip in it: there is a shark on your wrist who calls when you
   reach something new, says three sentences about it, and hangs up. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const pix = PD.pix;

  const VW = 480, VH = 270;
  const DEBT0 = 1000000;
  const CUT = 0.2;                      // his slice of every sale, until clear

  /* ------------------------------------------------------------------- art
     He is built twice: once in his own colours for the cutscene, where he is
     standing in front of you, and once in hologram blue for the watch. Same
     shapes, two palettes, so the little blue one is recognisably him. */
  const REAL = {
    skin: '#9aa8b8', skinD: '#6d7d90', skinL: '#c4cfda', belly: '#f0f4f6',
    teeth: '#ffffff', gum: '#3a2230', eye: '#141020', ink: '#0f0a18',
    suit: '#2d6182', suitL: '#4a86ad', suitD: '#1b4058', shirt: '#ffffff',
    tie: '#e0625f', tieD: '#b0403f', gold: '#ffd34d'
  };
  const HOLO = {
    skin: '#3fb8d8', skinD: '#1d6f8c', skinL: '#9fe8ff', belly: '#d8fbff',
    teeth: '#f2ffff', gum: '#0b3a4a', eye: '#04202c', ink: '#04202c',
    suit: '#1b6f8c', suitL: '#2e9ab8', suitD: '#10495e', shirt: '#eaffff',
    tie: '#7ef9ff', tieD: '#3fb8d8', gold: '#bff2ff'
  };

  /* He is a whole little person now, not a bust: one enormous round head, a
     body like a pear, a jacket hung open either side of a white belly, stubby
     fin sleeves, and two flipper feet that take turns. Four walk steps so the
     hologram can pace about, times two mouths so he can talk while he does it.

     CCX is his middle and CBASE is where his soles land, so callers can place
     him by the ground rather than by the corner of a canvas. */
  const CW = 68, CH = 80, CCX = 34, CBASE = 77;
  const FEET = [[-9, 6], [-4, 2], [6, -9], [2, -4]];

  function buildChum(P, mouth, step) {
    const p = pix(CW, CH);
    const cx = CCX;
    const b = (step === 1 || step === 3) ? -1 : 0;   // the bob on the passing poses
    const ft = FEET[step & 3];
    // Anything wearing a jacket needs a line around it or it welds itself into
    // one blue lump, and p.outline() only traces the outside of the whole
    // sprite -- so every piece of clothing is laid down twice, ink first.
    const ink = (fn) => { fn(P.ink, 1); fn(null, 0); };

    // two pale flippers, taking turns, well clear of the belly
    for (const dx of ft) {
      const fx = cx + dx - 8;
      p.round(fx + 1, 70, 15, 9, 4, P.ink);
      p.round(fx + 2, 70, 13, 7, 3, P.skin);
      p.spike(fx + 3, 74, 5, 5, 1, P.skinD);
      p.spike(fx + 12, 74, 5, 5, 1, P.skinD);
    }
    // a tail fin behind his hip, mostly forgotten about
    p.spike(cx + 20, 54 + b, 11, 14, 1, P.skinD);

    // the dorsal fin: a good deal taller than the head it sits behind, so it
    // reads as a fin and not as an ear
    p.spike(cx + 10, 0 + b, 16, 28, -1, P.skinD);
    p.spike(cx + 11, 4 + b, 11, 21, -1, P.skin);

    // one enormous round head. Round, now -- an octagon this big just reads
    // as a cut gem with eyes on it.
    p.ellipse(cx, 33 + b, 24, 20, P.skin);
    p.ellipse(cx, 21 + b, 13, 5, P.skinL);
    // the pale muzzle across the bottom of it, riding higher on one side
    p.ellipse(cx - 2, 44 + b, 19, 9, P.belly);
    p.ellipse(cx - 7, 40 + b, 12, 7, P.belly);
    // and one soft grey snout bump where the muzzle meets the face. It used
    // to be a wedge and the wedge read as a beak.
    p.ellipse(cx + 1, 38 + b, 7, 5, P.skinD);
    p.ellipse(cx + 1, 37 + b, 5, 3, P.skin);
    // gills
    for (let i = 0; i < 3; i++) p.rect(cx + 15 + i * 3, 30 + b, 1, 7, P.skinD);

    // two small black dots, and nothing whatever behind them
    p.disc(cx - 11, 32 + b, 3.4, P.eye);
    p.disc(cx + 11, 32 + b, 3.4, P.eye);
    p.rect(cx - 13, 30 + b, 2, 2, '#ffffff');
    p.rect(cx + 9, 30 + b, 2, 2, '#ffffff');

    // the smile. Open, it has its own teeth; shut, one fang stays out.
    if (mouth) {
      p.ellipse(cx - 1, 48 + b, 11, 6, P.gum);
      for (let i = 0; i < 5; i++) p.spike(cx - 9 + i * 4.5, 43 + b, 4, 4, 1, P.teeth);
      p.ellipse(cx - 1, 51 + b, 6, 2, '#c4566f');
    } else {
      for (let i = 0; i < 2; i++) {
        p.line(cx - 15, 46 + i + b, cx - 2, 49 + i + b, P.gum);
        p.line(cx - 2, 49 + i + b, cx + 13, 46 + i + b, P.gum);
      }
      // the fang's dark shoulder sits ON the smile, so it reads as a tooth
      // coming out of the mouth rather than a smudge next to it
      p.spike(cx + 6, 43 + b, 6, 6, -1, P.gum);
      p.spike(cx + 6, 44 + b, 4, 4, -1, P.teeth);
    }

    // the body: a fat pale pear with the jacket hung either side of it, so the
    // shirt and the tie and a good deal of belly stay on show
    p.ellipse(cx, 59 + b, 18, 10, P.belly);
    p.ellipse(cx, 58 + b, 15, 7, P.shirt);
    ink((c, o) => {
      p.round(cx - 19 - o, 50 + b, 12 + o * 2, 20 + o, 5, c || P.suit);
      p.round(cx + 7 - o, 50 + b, 12 + o * 2, 20 + o, 5, c || P.suit);
    });
    p.line(cx - 7, 50 + b, cx - 13, 67 + b, P.suitL);
    p.line(cx + 7, 50 + b, cx + 13, 67 + b, P.suitL);
    p.spike(cx - 5, 49 + b, 8, 9, 1, P.suitL);
    p.spike(cx + 5, 49 + b, 8, 9, 1, P.suitL);
    // the tie
    p.rect(cx - 2, 51 + b, 5, 4, P.tie);
    p.round(cx - 2, 55 + b, 5, 9, 1, P.tie);
    p.spike(cx, 63 + b, 6, 4, 1, P.tieD);
    p.rect(cx + 8, 62 + b, 2, 2, P.suitL);
    // two stubby sleeves, each with a fin peeking out of the cuff
    ink((c, o) => {
      p.round(cx - 29 - o, 50 + b - o, 12 + o * 2, 17 + o * 2, 5, c || P.suit);
      p.round(cx + 17 - o, 50 + b - o, 12 + o * 2, 17 + o * 2, 5, c || P.suit);
    });
    for (const sx of [cx - 28, cx + 19]) {
      ink((c, o) => p.round(sx - o, 64 + b - o, 9 + o * 2, 6 + o * 2, 2, c || P.skinL));
    }
    p.outline(P.ink);
    return p.toCanvas();
  }

  let art = null;
  function ensureArt() {
    if (art) return art;
    const set = (P) => [0, 1].map(m => [0, 1, 2, 3].map(st => buildChum(P, m, st)));
    art = { real: set(REAL), holo: set(HOLO) };
    return art;
  }

  /* ------------------------------------------------------------- the lessons
     One entry per thing he has to explain. `once` ids are written into
     save.seen, so he never says the same thing twice. */
  const LESSONS = {
    welcome: ['THIS ROCK IS YOURS NOW. I PAID FOR IT.',
      'THE HOUSE HAS A COMPUTER. THE SAUCER GOES TO PLANETS.',
      'WALK WITH A AND D. PRESS E AT THINGS.'],
    chart: ['EVERY DOT IS A WORLD AND EVERY WORLD IS MONEY.',
      'START AT THE TOP AND WORK DOWN. OR DO NOT. I GET PAID EITHER WAY.'],
    travel: ['NOW YOU FLY IT. ROCKS DO NOT MOVE OUT OF YOUR WAY.',
      'HOLD THE POINTER OR USE THE STICK. EVERY DENT COMES OFF YOUR HULL.'],
    dig: ['HOLD TO DRILL. THE BIT EATS WHATEVER IT TOUCHES.',
      'AIR IS THE BLUE ONE. WHEN IT RUNS OUT, SO DO YOU.',
      'FILL THE SACK. PRESS E AT THE POD TO GO HOME.'],
    sack: ['THE SACK IS HALF FULL AND YOU ARE HALF AS FAST.',
      'HEAVY IS SLOW. SLOW IS DEAD. GO HOME.'],
    air: ['YOUR AIR IS LOW.', 'I AM NOT SENTIMENTAL BUT YOU OWE ME MONEY.'],
    back: ['THE ROCKS ARE IN THE VAULT. THEY ARE NOT MONEY YET.',
      'SIT AT THE COMPUTER. SELL THEM ON ABAY. THAT IS THE WHOLE BUSINESS.'],
    desk: ['THIS IS A HUMAN COMPUTER. YOU STOLE IT. GOOD.',
      'ABAY BUYS YOUR ROCKS AND SELLS YOU BETTER TOOLS.',
      'THE AUCTIONS ARE CHEAPER IF YOU CAN STAND THE WAITING.'],
    sell: ['THERE. THAT IS WHAT A ROCK IS WORTH.',
      'I TAKE A FIFTH UNTIL WE ARE SQUARE. READ THE PAPERWORK.'],
    abay: ['BUY A BIGGER DRILL BEFORE YOU BUY ANYTHING ELSE.',
      'EVERY SHELF IS A DIFFERENT KIND OF DEBT.'],
    auction: ['AN AUCTION IS CHEAPER THAN THE SHOP IF NOBODY ELSE WANTS IT.',
      'SOMEBODY ELSE ALWAYS WANTS IT.'],
    brain: ['THE BRAIN IS THE ONLY THING ON THIS MOON CLEVERER THAN THE RAT.',
      'FEED IT THOTS. IT GROWS YOU NEW HABITS.'],
    tip: ['YES. IT IS A TIP. THAT IS WHY IT WAS CHEAP.',
      'PRESS E AT EVERY HEAP. I AM NOT DOING IT.',
      'THERE IS SOMETHING UNDER THE LAST ONE. I CHECKED.'],
    club: ['A CLUB. ON MY MOON. UNDER MY BINS.',
      'GO IN. SPEND MONEY. TWENTY PER CENT OF IT WAS MINE ANYWAY.'],
    suit: ['THAT SUIT IS THE FIRST GOOD DECISION YOU HAVE MADE.',
      'IT WILL NOT PAY ME BACK. BUT IT LOOKS WELL.'],
    gamble: ['I CAN SEE THE WATCH. I CAN SEE WHERE THE WATCH IS.',
      'YOU ARE STANDING AT A MACHINE. THAT IS HOW WE MET.',
      'GO ON THEN. IT IS YOUR MONEY. IT IS MY MONEY.'],
    jackpot: ['THREE THE SAME. IN TWENTY YEARS I HAVE NEVER SEEN IT.',
      'PUT IT TOWARDS THE DEBT. PUT IT TOWARDS THE DEBT.'],
    core: ['THAT IS THE CORE. BREAK IT AND THE WHOLE WORLD GOES.',
      'THE BOUNTY IS ENORMOUS. DO IT AGAIN.'],
    debt75: ['A QUARTER DOWN. I HAVE STOPPED CIRCLING YOUR HOUSE.'],
    debt50: ['HALF. I TOLD MY MOTHER ABOUT YOU. SHE WAS NOT INTERESTED.'],
    debt25: ['ONE QUARTER LEFT. DO NOT GET CLEVER NOW.'],
    debt0: ['PAID. IN FULL. WE ARE SQUARE.',
      'KEEP THE WATCH. KEEP THE MOON. KEEP EATING PLANETS.',
      'I FIND I HAVE BECOME FOND OF YOU. DO NOT TELL ANYONE.']
  };

  /* `phase` is how the projection is doing: 'in' while it builds itself up
     out of the watch, 'on' while he is actually talking to you, 'out' while it
     folds itself away. A call is active through all three -- you cannot dismiss
     him halfway through arriving. */
  const S = {
    call: null, t: 0, lines: null, line: 0, chars: 0, buzz: 0, pop: 0,
    phase: 'on', beam: 1, queue: []
  };
  /* Where he is pacing. He does not stand still and talk at you; he walks the
     bottom of the screen the whole time the call is up, turning at the ends. */
  const HS = { x: 150, dir: 1, ph: 0 };

  /* Ring him through. Lessons only ever play once; `force` is for the debt
     milestones, which want to interrupt. */
  function call(g, id, force) {
    if (!LESSONS[id]) return;
    if (!force && g.save.seen && g.save.seen['chum_' + id]) return;
    if (g.save.seen) g.save.seen['chum_' + id] = 1;
    if (S.call === id) return;
    if (S.call) { S.queue.push(id); return; }
    S.call = id; S.t = 0; S.lines = LESSONS[id]; S.line = 0; S.chars = 0; S.buzz = 1.2;
    S.pop = 0; S.phase = 'in'; S.beam = 0; HS.x = VW * 0.42; HS.dir = 1; HS.ph = 0;
    A.sfx.tone(760, { type: 'square', to: 1180, dur: 0.07, vol: 0.07 });
    A.sfx.tone(760, { type: 'square', to: 1180, dur: 0.07, vol: 0.07, delay: 0.14 });
    PD.touch.buzz(18);
  }

  /* Hanging up starts the fold-away; the call really ends when it finishes. */
  function hangUp() {
    if (S.phase === 'out' || !S.call) return;
    S.phase = 'out';
    A.sfx.tone(880, { type: 'square', to: 180, dur: 0.16, vol: 0.06 });
  }
  function endCall() {
    S.call = null; S.lines = null; S.t = 0; S.phase = 'on'; S.beam = 1;
    if (S.queue.length) {
      const id = S.queue.shift();
      S.call = id; S.lines = LESSONS[id]; S.line = 0; S.chars = 0; S.t = 0;
      S.buzz = 0.6; S.pop = 0; S.phase = 'in'; S.beam = 0;
    }
  }

  function active() { return !!S.call; }

  function update(dt, g) {
    if (!S.call) return;
    S.t += dt;
    S.pop = Math.min(1, S.pop + dt * 4.5);
    S.buzz = Math.max(0, S.buzz - dt);
    // pacing: forward until the wall, then about-face
    HS.ph += dt * 6.5;
    HS.x += HS.dir * 24 * dt;
    if (HS.x > VW - 74) { HS.x = VW - 74; HS.dir = -1; }
    if (HS.x < 74) { HS.x = 74; HS.dir = 1; }

    // arriving, or leaving. Neither takes input.
    if (S.phase === 'in') {
      S.beam = Math.min(1, S.beam + dt * 2.6);
      if (S.beam >= 1) S.phase = 'on';
      return;
    }
    if (S.phase === 'out') {
      S.beam = Math.max(0, S.beam - dt * 3.4);
      if (S.beam <= 0) endCall();
      return;
    }
    const line = S.lines[S.line] || '';
    if (S.chars < line.length) S.chars = Math.min(line.length, S.chars + dt * 52);
    const IN = PD.input;
    const m = IN.mouse;
    const poke = IN.hit('KeyE') || IN.hit('Space') || IN.hit('Enter') || (m.inside && m.leftPressed);
    if (!poke) return;
    if (S.chars < line.length) { S.chars = line.length; return; }   // finish the line first
    S.line++; S.chars = 0; S.pop = 0;
    A.sfx.click();
    if (S.line >= S.lines.length) hangUp();
  }

  /* ------------------------------------------------------------- the bubble
     Nobody in this game reads a caption bar. A speech bubble says who is
     talking without a name plate, and it can bang in with a bit of cartoon on
     it: an overshoot on the way open, a ring of little impact strokes, a slow
     wobble while it sits there, and a tail that follows the speaker around.

     `ty` is where the tail's point goes -- the top of the speaker's head --
     and `cx` is where the body of the bubble wants to sit, which is not the
     same thing once he has walked off to one side. */
  function outBack(k) {
    return 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
  }

  function speech(ctx, o) {
    const sc = o.scale || 1;
    const lh = sc === 2 ? 17 : 10;
    const pad = 8;
    let tw = 0;
    for (const r of o.rows) tw = Math.max(tw, F.width(r, sc));
    if (o.foot) tw = Math.max(tw, F.width(o.foot, 1) + 20);
    const w = Math.max(54, tw + pad * 2);
    const h = pad * 2 + (o.rows.length - 1) * lh + 7 * sc + (o.foot ? 11 : 0);
    const e = o.pop >= 1 ? 1 : outBack(Math.max(0.001, o.pop));
    const dw = Math.max(12, Math.round(w * e)), dh = Math.max(10, Math.round(h * e));
    const wob = Math.round(Math.sin(o.t * 4.5));
    const bx = Math.round(U.clamp(o.cx - dw / 2, 6, VW - dw - 6));
    const by = Math.round(o.ty - 11 - dh) + wob;
    const tip = Math.round(U.clamp(o.tipX === undefined ? o.cx : o.tipX, bx + 11, bx + dw - 11));

    // ink first, face second, so the whole thing carries one fat cartoon line
    X.plate(ctx, bx - 2, by - 2, dw + 4, dh + 4, o.ink, null, null, 8);
    X.poly(ctx, [[tip - 10, by + dh - 6], [tip + 10, by + dh - 6], [tip + 2, o.ty + 3]], o.ink);
    X.plate(ctx, bx, by, dw, dh, o.fill, o.light, o.dark, 7);
    X.poly(ctx, [[tip - 7, by + dh - 8], [tip + 7, by + dh - 8], [tip + 2, o.ty - 2]], o.fill);

    // the bang: a ring of strokes thrown off while it opens
    if (o.pop < 0.8) {
      const k = 1 - o.pop / 0.8;
      const mx = bx + dw / 2, my = by + dh / 2;
      const r0 = Math.max(dw, dh) * 0.55 + 5;
      for (let i = 0; i < 8; i++) {
        const ang = i / 8 * U.TAU + 0.35;
        X.line(ctx, mx + Math.cos(ang) * r0, my + Math.sin(ang) * r0 * 0.66,
          mx + Math.cos(ang) * (r0 + 10 * k), my + Math.sin(ang) * (r0 + 10 * k) * 0.66, o.ink, 2);
      }
    }
    if (o.pop < 1) return { bx, by, dw, dh };
    o.rows.forEach((r, i) => F.draw(ctx, r, bx + dw / 2, by + pad + i * lh, o.ink,
      { center: true, scale: sc }));
    if (o.foot) F.draw(ctx, o.foot, bx + dw - 6, by + dh - 11, o.foot2 || o.dark, { right: true });
    return { bx, by, dw, dh };
  }

  /* The narrator's card: same overshoot, same fat ink line, no tail on it
     because nothing on screen is saying it. */
  function captionCard(ctx, rows, sc, pop, t, foot) {
    const lh = sc === 2 ? 17 : 10;
    const h = 16 + (rows.length - 1) * lh + 7 * sc;
    const e = pop >= 1 ? 1 : outBack(Math.max(0.001, pop));
    const dw = Math.max(24, Math.round((VW - 44) * e));
    const dh = Math.max(8, Math.round(h * e));
    const bx = Math.round((VW - dw) / 2), by = Math.round(VH - 12 - dh);
    X.plate(ctx, bx - 2, by - 2, dw + 4, dh + 4, '#1a1020', null, null, 7);
    X.plate(ctx, bx, by, dw, dh, 'rgba(10,6,22,0.94)', '#5b3f96', '#000000', 6);
    if (pop >= 1) {
      rows.forEach((r, i) => F.draw(ctx, r, VW / 2, by + 8 + i * lh, '#e8dcff',
        { center: true, scale: sc, shadow: '#000000' }));
      if (foot) F.draw(ctx, foot, bx + dw - 6, by + dh - 11, '#8a7ab0', { right: true, shadow: '#000000' });
    }
    return { bx, by, dw, dh };
  }

  /* ------------------------------------------------------------ arriving
     He does not simply appear and he does not simply stop existing. A bar of
     light goes up out of the watch, and he unrolls out of it from the soles
     up, squeezed thin and jittering, with a hot line riding the growing edge.
     Leaving runs the same thing backwards, which is why one function does
     both and only the sign of `bm` changing tells them apart. */
  function beamDraw(ctx, cv, sx, sy, flip, bm, gy, flick, t) {
    const e = bm * bm * (3 - 2 * bm);
    const h = Math.max(1, Math.round(CH * e));
    const kx = 0.22 + 0.78 * e;
    const jit = (1 - e) * 3;
    const top = sy + CH - h;

    // the column of light he is coming up, at full height from the first frame
    ctx.globalAlpha = (1 - e) * 0.5 * flick;
    X.rect(ctx, sx + CCX - 2, sy, 4, CH, '#7ef9ff');
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(Math.round(sx + CCX + U.rand(-jit, jit)), Math.round(sy + CH));
    ctx.scale(flip ? -kx : kx, 1);
    ctx.globalAlpha = (0.5 + 0.5 * e) * flick;
    ctx.drawImage(cv, 0, CH - h, CW, h, -CCX, -h, CW, h);
    ctx.restore();
    ctx.globalAlpha = 1;

    // the hot edge riding the top of however much of him there is so far
    const hw = Math.round(CW * kx * 0.5);
    X.rect(ctx, sx + CCX - hw, top, hw * 2, 1, '#eafcff');
    X.rect(ctx, sx + CCX - hw - 2, top, hw * 2 + 4, 1, 'rgba(126,249,255,0.5)');
    // and a few sparks coming off it
    for (let i = 0; i < 4; i++) {
      const q = U.hash2(i, Math.floor(t * 20));
      ctx.globalAlpha = 0.7 * (1 - e);
      X.rect(ctx, sx + CCX - hw + q * hw * 2, top - 1 - q * 6, 1, 2, '#eafcff');
      ctx.globalAlpha = 1;
    }
  }

  /* Where his feet go. The chart and the ABAY screen both keep a panel along
     the bottom edge, so on those he walks a stripe higher up. */
  function groundY(g) {
    return (g.state === 'starmap' || g.state === 'desk') ? VH - 70 : VH - 24;
  }

  function draw(ctx, g, t) {
    if (!S.call) return;
    const gy = groundY(g);
    const a = ensureArt();
    const line = S.lines[S.line] || '';
    const shown = line.slice(0, Math.floor(S.chars));
    const talking = S.chars < line.length && Math.floor(t * 11) % 2 === 0;
    const flick = 0.84 + Math.abs(Math.sin(t * 31)) * 0.1 + (U.chance(0.02) ? -0.28 : 0);

    /* The watch on your own wrist. It sits bottom RIGHT, because bottom left
       is where the book of what you owe him lives. */
    const bz = S.buzz > 0 ? Math.round(U.rand(-2, 2)) : 0;
    const wx = VW - 40 + bz, wy = gy - 10;
    X.plate(ctx, wx, wy, 22, 14, '#2a2438', '#453c5c', '#0a0614', 3);
    X.rect(ctx, wx + 4, wy + 3, 14, 8, '#0d5a78');
    X.rect(ctx, wx + 6, wy + 5, 10, 4, '#7ef9ff');

    const bk = S.phase === 'on' ? 1 : S.beam;
    ctx.globalAlpha = flick * 0.55;
    // the cone of light out of it, widening to wherever he has wandered
    X.poly(ctx, [[wx + 4, wy + 2], [wx + 18, wy + 2],
      [HS.x + 32 * bk, gy - 64 * bk], [HS.x - 32 * bk, gy - 64 * bk]], 'rgba(63,184,216,0.10)');
    // and the pool he stands in
    X.blob(ctx, HS.x, gy + 1, Math.max(4, 30 * bk), 5, 'rgba(63,184,216,0.40)');
    ctx.globalAlpha = 1;

    // him, pacing, mirrored when he turns
    const cv = a.holo[talking ? 1 : 0][Math.floor(HS.ph) % 4];
    const sx = Math.round(HS.x - CCX), sy = Math.round(gy - CBASE);
    const bm = S.phase === 'on' ? 1 : S.beam;
    if (bm >= 1) {
      ctx.save();
      ctx.globalAlpha = flick;
      if (HS.dir < 0) { ctx.translate(sx + CW, sy); ctx.scale(-1, 1); }
      else ctx.translate(sx, sy);
      ctx.drawImage(cv, 0, 0);
      // one bright band rolling up him, clipped to his own silhouette
      ctx.beginPath();
      ctx.rect(0, CH - ((t * 34) % (CH + 12)), CW, 3);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3;
      ctx.drawImage(cv, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      beamDraw(ctx, cv, sx, sy, HS.dir < 0, bm, gy, flick, t);
    }

    if (bm > 0.55) {
      ctx.globalAlpha = (bm - 0.55) / 0.45;
      F.draw(ctx, 'MR CHUM', HS.x, gy + 9, 'rgba(126,249,255,0.8)', { center: true, shadow: '#04202c' });
      ctx.globalAlpha = 1;
    }
    if (bm < 1) return;                     // no bubble while he is materialising

    /* The bubble stays put in the middle while he walks about under it --
       a caption that slides around with him is unreadable -- and only the
       tail follows him. */
    const rows = wrap(shown, 250, 1);
    const done = S.chars >= line.length;
    const more = S.line < S.lines.length - 1;
    speech(ctx, {
      cx: VW / 2, tipX: HS.x, ty: gy - 80, rows, scale: 1, pop: S.pop, t,
      fill: '#cdf6ff', light: '#ffffff', dark: '#6fc8e0', ink: '#0a3446',
      foot: done ? (more ? 'E / TAP  MORE' : 'E / TAP  BYE') : null,
      foot2: Math.abs(Math.sin(t * 4)) > 0.4 ? '#0a3446' : '#6fc8e0'
    });
  }

  /* ------------------------------------------------------------------ debt
     He takes a fifth of everything you sell until the book is closed, and he
     tells you when it crosses each quarter. */
  function takeCut(g, gross) {
    if (!g.save.debt || g.save.debt <= 0) return 0;
    const before = g.save.debt;
    const cut = Math.min(g.save.debt, Math.round(gross * CUT));
    g.save.debt -= cut;
    const f0 = before / DEBT0, f1 = g.save.debt / DEBT0;
    const cross = (a) => f0 > a && f1 <= a;
    if (g.save.debt <= 0) call(g, 'debt0', true);
    else if (cross(0.25)) call(g, 'debt25', true);
    else if (cross(0.5)) call(g, 'debt50', true);
    else if (cross(0.75)) call(g, 'debt75', true);
    return cut;
  }

  /* The little book on the HUD: how much of him is left. */
  function drawDebt(ctx, g, x, y) {
    const d = g.save.debt;
    if (d === undefined || d === null) return;
    const w = 116;
    X.plate(ctx, x, y, w, 24, 'rgba(10,6,26,0.78)', '#453c5c', '#0a0614', 3);
    if (d <= 0) {
      F.draw(ctx, 'DEBT CLEARED', x + w / 2, y + 8, '#8affa0', { center: true, shadow: '#0a0614' });
      return;
    }
    F.draw(ctx, 'OWED TO MR CHUM', x + 5, y + 3, '#8a7ab0', { shadow: false });
    F.draw(ctx, '$' + U.fmt(d), x + w - 5, y + 11, '#ff8a9a', { right: true, shadow: '#0a0614' });
    const f = 1 - d / DEBT0;
    X.rect(ctx, x + 5, y + 19, w - 10, 2, '#2a1c33');
    X.rect(ctx, x + 5, y + 19, Math.round((w - 10) * f), 2, '#ff5fa8');
  }

  /* =====================================================================
     THE NIGHT YOU LOST IT
     Four beats, each with its own picture and its own lines. Any key moves
     it on; escape walks out of the whole thing. */
  const IN_S = {
    beat: 0, t: 0, line: 0, chars: 0, pop: 0, reel: [0, 0, 0], spin: 3, chips: [], flash: 0, done: 0
  };
  const SYMS = ['coin', 'ore', 'planet', 'skull', 'star'];

  const BEATS = [
    { dur: 7.5, lines: ['ONE MACHINE. ONE LEVER. EVERYTHING YOU HAD.'] },
    { dur: 5.5, lines: ['THE MACHINE DID NOT WANT IT.', 'SOMEBODY BEHIND YOU DID.'] },
    { dur: 26, lines: [
      'MR CHUM: YOU OWE ME ONE MILLION.',
      'MR CHUM: YOU HAVE NO MONEY. NO SHIP. NO IDEAS.',
      'MR CHUM: SO I BOUGHT YOU A SHIP. AND A DRILL. AND A MOON.',
      'MR CHUM: GO AND EAT A PLANET. BRING ME MY MONEY.',
      'MR CHUM: THIS IS A WATCH. I AM IN IT NOW.',
      'MR CHUM: THAT IS THE ARRANGEMENT. NOD.'
    ] },
    { dur: 6, lines: ['AND THAT IS HOW YOU CAME TO OWN A MOON.'] }
  ];

  function enterIntro(g) {
    ensureArt();
    IN_S.beat = 0; IN_S.t = 0; IN_S.line = 0; IN_S.chars = 0; IN_S.pop = 0;
    IN_S.reel = [0, 0, 0]; IN_S.spin = 3.2; IN_S.chips.length = 0; IN_S.flash = 0;
    IN_S.done = 0;
    g.state = 'intro';
    A.sfx.tone(180, { type: 'square', to: 90, dur: 0.5, vol: 0.1 });
  }

  function nextBeat(g) {
    IN_S.beat++; IN_S.t = 0; IN_S.line = 0; IN_S.chars = 0; IN_S.pop = 0;
    if (IN_S.beat === 1) {
      IN_S.flash = 1;
      A.sfx.deny();
      for (let i = 0; i < 40; i++) {
        IN_S.chips.push({ x: 240 + U.rand(-40, 40), y: 190, vx: U.rand(-180, 180), vy: U.rand(-220, -60),
          a: U.rand(0, U.TAU), va: U.rand(-8, 8), life: U.rand(1.2, 2.6) });
      }
    }
    if (IN_S.beat >= BEATS.length) finishIntro(g);
  }

  function finishIntro(g) {
    /* Once is enough. updateIntro keeps running while the iris closes, and
       without this it re-started the wipe every frame -- so it never reached
       its own midpoint and the cutscene never ended. */
    if (IN_S.done) return;
    IN_S.done = 1;
    g.save.seenIntro = 1;
    g.save.debt = DEBT0;
    g.saveGame();
    g.wipeTo(240, 135, '#0a0614', () => {
      g.state = 'home';
      PD.home.enter(g);
      call(g, 'welcome');
      call(g, 'tip');           // queues behind it: the state of the place
    });
  }

  function updateIntro(dt, g) {
    if (IN_S.done) return;
    const IN = PD.input;
    if (IN.hit('Escape')) { finishIntro(g); return; }
    IN_S.t += dt;
    IN_S.pop = Math.min(1, IN_S.pop + dt * 4.5);
    IN_S.flash = Math.max(0, IN_S.flash - dt * 2.2);
    if (IN_S.spin > 0) {
      IN_S.spin -= dt;
      for (let i = 0; i < 3; i++) {
        if (IN_S.spin < i * 0.5) continue;
        IN_S.reel[i] = (IN_S.reel[i] + dt * (34 - i * 6)) % SYMS.length;
      }
      if (IN_S.spin <= 0) IN_S.reel = [3, 3, 3];           // three skulls
    }
    for (let i = IN_S.chips.length - 1; i >= 0; i--) {
      const c = IN_S.chips[i];
      c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 320 * dt; c.a += c.va * dt; c.life -= dt;
      if (c.life <= 0) IN_S.chips.splice(i, 1);
    }

    const b = BEATS[IN_S.beat];
    if (!b) { finishIntro(g); return; }
    const line = b.lines[IN_S.line] || '';
    if (IN_S.chars < line.length) IN_S.chars = Math.min(line.length, IN_S.chars + dt * 46);

    const m = IN.mouse;
    const poke = IN.hit('KeyE') || IN.hit('Space') || IN.hit('Enter') || (m.inside && m.leftPressed);
    if (poke) {
      if (IN_S.chars < line.length) { IN_S.chars = line.length; return; }
      IN_S.line++; IN_S.chars = 0; IN_S.pop = 0; A.sfx.click();
      if (IN_S.line >= b.lines.length) nextBeat(g);
      return;
    }
    if (IN_S.t > b.dur) nextBeat(g);
  }

  /* ---- the casino: neon, a carpet nobody has ever cleaned, one machine ---- */
  function drawCasino(ctx, g, t) {
    ctx.fillStyle = '#180c22'; ctx.fillRect(0, 0, VW, VH);
    // a wall of dead neon and one live sign
    for (let i = 0; i < 9; i++) {
      const bx = 12 + i * 54, on = Math.sin(t * 3 + i) > -0.3;
      X.rect(ctx, bx, 16, 36, 3, on ? '#ff5fa8' : '#4a1c3a');
      X.rect(ctx, bx, 24, 36, 3, on ? '#7ef9ff' : '#12384a');
    }
    F.draw(ctx, 'THE LUCKY VOID', VW / 2, 36, Math.sin(t * 7) > -0.2 ? '#ffd34d' : '#6a5a1a',
      { center: true, scale: 3, shadow: '#3a0c30' });
    // carpet
    X.rect(ctx, 0, 206, VW, VH - 206, '#4a1230');
    for (let x = 0; x < VW; x += 16) {
      X.rect(ctx, x, 206, 8, VH - 206, '#5c1a3c');
      X.rect(ctx, x + 4, 214, 6, 6, '#7a2450');
    }
    X.rect(ctx, 0, 204, VW, 3, '#2a0a1c');

    /* the machine */
    const mx = 238, my = 84;
    X.plate(ctx, mx - 62, my - 16, 124, 122, '#2a1a3a', '#4a3660', '#120a1c', 6);
    X.plate(ctx, mx - 52, my - 6, 104, 46, '#0d0718', '#3a2a52', '#000000', 4);
    for (let i = 0; i < 3; i++) {
      const rx = mx - 46 + i * 32;
      X.rect(ctx, rx, my, 28, 34, '#e8e4d0');
      X.rect(ctx, rx, my, 28, 2, '#8e8874');
      const idx = Math.floor(IN_S.reel[i]) % SYMS.length;
      const blur = IN_S.spin > i * 0.5;
      if (blur) {
        for (let k = -1; k <= 1; k++) {
          ctx.globalAlpha = k ? 0.3 : 0.8;
          PD.glyph.draw(ctx, SYMS[(idx + k + SYMS.length) % SYMS.length], rx + 7, my + 10 + k * 12, '#3a2a52', '#8a7ab0');
        }
        ctx.globalAlpha = 1;
      } else {
        PD.glyph.draw(ctx, SYMS[idx], rx + 7, my + 10, idx === 3 ? '#c22a4a' : '#3a2a52', '#8a7ab0');
      }
    }
    // the payline, and the lever he should never have pulled
    X.rect(ctx, mx - 52, my + 16, 104, 1, IN_S.spin <= 0 ? '#ff5a4d' : '#8a2f4a');
    const lever = IN_S.spin > 2.6 ? 16 : 0;
    X.line(ctx, mx + 66, my + 40 + lever, mx + 66, my + 10 + lever, '#8a7ab0', 3);
    X.blob(ctx, mx + 66, my + 8 + lever, 6, 6, '#c22a4a');
    F.draw(ctx, 'INSERT EVERYTHING', mx, my + 46, '#8a7ab0', { center: true, shadow: false });
    // the payout tray, empty
    X.plate(ctx, mx - 40, my + 62, 80, 22, '#120a1c', '#3a2a52', '#000000', 3);
    if (IN_S.beat >= 1) F.draw(ctx, 'NO', mx, my + 68, '#ff5a4d', { center: true, scale: 2, shadow: '#3a0c30' });

    // our man, at the lever, in trouble
    const al = PD.art.sprites.alien;
    const K = 1.2, bob = Math.sin(t * 2.4) * 2;
    const ax = mx + 104, ay = 206 - (al.h - al.oy) * K + bob;
    ctx.drawImage(al.frames[Math.floor(t * 6) % 4], 0, 0, al.frames[0].width, al.frames[0].height,
      Math.round(ax - al.ox * K), Math.round(ay - al.oy * K), Math.round(al.w * K), Math.round(al.h * K));

    for (const c of IN_S.chips) {
      ctx.save();
      ctx.translate(c.x | 0, c.y | 0); ctx.rotate(c.a);
      X.blob(ctx, 0, 0, 5, 5, '#0a0614');
      X.blob(ctx, 0, 0, 4, 4, '#ffd34d');
      X.blob(ctx, 0, 0, 2, 2, '#e8a02a');
      ctx.restore();
    }
  }

  /* ---- the number, and the shadow that falls across it ---- */
  function drawDebtCard(ctx, g, t) {
    drawCasino(ctx, g, t);
    ctx.fillStyle = 'rgba(6,3,14,0.88)'; ctx.fillRect(0, 0, VW, VH);
    const f = U.clamp(IN_S.t / 1.6, 0, 1);
    const n = Math.round(DEBT0 * f * f);
    /* A receipt to put the number on, so the slot machine behind it does not
       read through the zeroes. */
    X.plate(ctx, 40, 60, VW - 80, 82, 'rgba(4,2,10,0.96)', '#b02a3a', '#000000', 5);
    F.draw(ctx, 'YOU OWE', VW / 2, 74, '#8a7ab0', { center: true, scale: 2, shadow: '#0a0614' });
    F.draw(ctx, '$' + n.toLocaleString(), VW / 2, 98, f >= 1 && Math.sin(t * 8) > 0 ? '#ff5a4d' : '#ffd34d',
      { center: true, scale: 5, shadow: '#3a0c30' });
    if (f >= 1) {
      // his shadow, arriving
      const s = U.clamp((IN_S.t - 1.8) / 1.4, 0, 1);
      ctx.globalAlpha = s * 0.85;
      X.poly(ctx, [[VW / 2 - 150 * s, VH], [VW / 2 + 150 * s, VH],
        [VW / 2 + 90 * s, VH - 150 * s], [VW / 2 - 90 * s, VH - 150 * s]], '#05020c');
      if (s > 0.5) {
        // and then the shark himself, rising into the bottom of the frame
        const a = ensureArt();
        const k = (s - 0.5) * 2;
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(Math.round(VW / 2 - CCX * 1.6), Math.round(VH - 18 - CBASE * 1.6 * k));
        ctx.scale(1.6, 1.6);
        ctx.drawImage(a.real[0][0], 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---- the deal: he is in the room and he is very close ---- */
  function drawDeal(ctx, g, t) {
    ctx.fillStyle = '#0d0718'; ctx.fillRect(0, 0, VW, VH);
    // an alley behind him, one bulb
    for (let i = 0; i < 5; i++) X.rect(ctx, 20 + i * 100, 0, 60, VH, '#120a1c');
    X.blob(ctx, 86, 22, 40, 34, 'rgba(255,211,77,0.08)');
    X.rect(ctx, 82, 6, 8, 12, '#3a2a52');
    X.blob(ctx, 86, 20, 5, 5, '#ffe9a8');
    X.rect(ctx, 0, 214, VW, VH - 214, '#1a1024');
    X.rect(ctx, 0, 212, VW, 2, '#2a1c33');

    // our man, small, on the right, being talked at
    const al = PD.art.sprites.alien;
    const K = 1.1, bob = Math.sin(t * 2) * 1.5;
    const ax = 392, ay = 214 - (al.h - al.oy) * K + bob;
    ctx.drawImage(al.frames[Math.floor(t * 5) % 4], 0, 0, al.frames[0].width, al.frames[0].height,
      Math.round(ax - al.ox * K), Math.round(ay - al.oy * K), Math.round(al.w * K), Math.round(al.h * K));
    // the watch goes on at the fifth line
    if (IN_S.line >= 4) {
      X.plate(ctx, ax - 22, ay - 26, 14, 10, '#2a2438', '#453c5c', '#0a0614', 2);
      X.rect(ctx, ax - 19, ay - 24, 8, 6, Math.sin(t * 6) > 0 ? '#7ef9ff' : '#0d5a78');
    }

    // MR CHUM, in the flesh, at twice the size of you, with the case he
    // carries your future around in
    const a = ensureArt();
    const lean = Math.sin(t * 1.3) * 3;
    X.plate(ctx, 14, 176, 26, 38, '#1d1828', '#3a3150', '#0a0614', 4);
    X.rect(ctx, 14, 190, 26, 2, '#3a3150');
    X.rect(ctx, 24, 158, 6, 20, '#3a3150');
    X.rect(ctx, 19, 155, 16, 5, '#3a3150');
    X.rect(ctx, 32, 196, 5, 5, '#ffd34d');
    const talk = IN_S.chars < (BEATS[2].lines[IN_S.line] || '').length && Math.floor(t * 9) % 2 === 0;
    ctx.save();
    ctx.translate(Math.round(104 - CCX * 2 + lean), Math.round(214 - CBASE * 2));
    ctx.scale(2, 2);
    ctx.drawImage(a.real[talk ? 1 : 0][0], 0, 0);
    ctx.restore();
  }

  /* ---- and out, over the moon he now owns ---- */
  function drawDrop(ctx, g, t) {
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, '#0b0720'); grd.addColorStop(1, '#04030d');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 90; i++) {
      const x = (U.hash2(i, 5) * VW) | 0, y = (U.hash2(i, 9) * VH) | 0;
      ctx.globalAlpha = 0.3 + U.hash2(i, 11) * 0.6;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
    if (!drawDrop.moon) drawDrop.moon = PD.arthome.buildPlanet(300, '#8e86a8', 4, 'moon');
    ctx.drawImage(drawDrop.moon, 90, 120);
    // the pod, dropping something off and leaving
    const f = U.clamp(IN_S.t / 4, 0, 1);
    const spr = PD.art.skinFor(g.save.cos).pod;
    const px = U.lerp(VW + 40, 150, Math.min(1, f * 2.2));
    const py = U.lerp(60, 128, Math.min(1, f * 2.2));
    ctx.save(); ctx.translate(px | 0, py | 0); ctx.scale(0.7, 0.7);
    ctx.drawImage(spr.frames[Math.floor(t * 8) % 2], -spr.ox, -spr.oy);
    ctx.restore();
    if (f > 0.5) {
      X.line(ctx, px, py + 12, px, py + 12 + (f - 0.5) * 60, '#c9c9dc', 1);
      const al = PD.art.sprites.alien;
      ctx.drawImage(al.frames[1], 0, 0, al.frames[0].width, al.frames[0].height,
        Math.round(px - al.ox), Math.round(py + 12 + (f - 0.5) * 60 - al.oy * 0.5), al.w, al.h);
    }
  }

  /* Break a line into rows that fit, at whichever scale is asked for. */
  function wrap(str, w, scale) {
    const out = [];
    let row = '';
    for (const wd of str.split(' ')) {
      const test = row ? row + ' ' + wd : wd;
      if (F.width(test, scale) > w && row) { out.push(row); row = wd; }
      else row = test;
    }
    if (row) out.push(row);
    return out.length ? out : [''];
  }

  function drawIntro(ctx, g, t) {
    if (IN_S.beat === 0) drawCasino(ctx, g, t);
    else if (IN_S.beat === 1) drawDebtCard(ctx, g, t);
    else if (IN_S.beat === 2) drawDeal(ctx, g, t);
    else drawDrop(ctx, g, t);

    if (IN_S.flash > 0) {
      ctx.fillStyle = 'rgba(255,90,77,' + (IN_S.flash * 0.5).toFixed(2) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }

    /* What he says comes out of a bubble pointed at his head; what the film
       says comes up on a card. Both bang in with the same overshoot, so the
       whole cutscene has one bit of cartoon running through it. */
    const b = BEATS[IN_S.beat];
    if (b) {
      const full = b.lines[IN_S.line] || '';
      const chum = full.indexOf('MR CHUM:') === 0;
      const body = chum ? full.slice(9) : full;
      const shown = body.slice(0, Math.max(0, Math.floor(IN_S.chars) - (chum ? 9 : 0)));
      const CWID = chum ? 320 : VW - 76;
      let sc = 2, rows = wrap(shown, CWID, 2);
      if (rows.length > 2) { sc = 1; rows = wrap(shown, CWID, 1); }
      const done = Math.floor(IN_S.chars) >= full.length;
      const blink = Math.abs(Math.sin(t * 4)) > 0.4;
      if (chum) {
        speech(ctx, {
          cx: 276, tipX: 104, ty: 92, rows, scale: sc, pop: IN_S.pop, t,
          fill: '#f2ece0', light: '#ffffff', dark: '#ad9f88', ink: '#1a1020',
          foot: done ? 'E / TAP' : null, foot2: blink ? '#1a1020' : '#ad9f88'
        });
      } else {
        captionCard(ctx, rows, sc, IN_S.pop, t, done && blink ? 'E / TAP' : null);
      }
    }
    X.plate(ctx, VW - 62, 4, 56, 13, 'rgba(6,3,14,0.7)', null, null, 3);
    F.draw(ctx, 'ESC  SKIP', VW - 10, 7, 'rgba(178,162,216,0.9)', { right: true, shadow: '#000000' });
  }

  PD.chum = {
    enterIntro, updateIntro, drawIntro,
    call, update, draw, active, takeCut, drawDebt, DEBT0, S, IN_S, HS, LESSONS,
    artFor: ensureArt, CW, CH, CCX, CBASE
  };
})(window.PD);
