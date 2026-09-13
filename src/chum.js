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

  /* ------------------------------------------------------------ the small one
     The pane on your wrist is one thing. The other thing the watch does is put
     a very small copy of him on the ground -- about half your height, entirely
     round, in a suit the size of a stamp.

     He does not follow you. He goes on ahead to whatever he thinks you should
     be doing, stands there, waits, beckons, and then tells you exactly what he
     thinks of how long you took. A full set of poses rather than a walk cycle
     and a shrug: walking, idling, waving you over, both fins up in disgust,
     pointing at the thing, and squashed and stretched for the bounce. */
  const MW = 28, MH = 26, MCX = 14, MBASE = 25;   // wide enough for a pointing fin
  /* Where he lives. He used to walk about in the middle of the scene and get
     in front of whatever you were trying to look at; he now stands in the
     bottom-left corner, on the book of what you owe him, and stays there. */
  const CORNER = { x: 28, y: VH - 34 };

  function buildMini(P, o) {
    o = o || {};
    const p = pix(MW, MH);
    const b = o.b || 0;                       // body bob
    const sq = o.sq || 0;                     // -1 squashed, +1 stretched
    const hy = 9 + b + (sq > 0 ? -2 : (sq < 0 ? 1 : 0));
    const hw = 10 + (sq < 0 ? 2 : (sq > 0 ? -1 : 0));
    const hh = 8 + (sq > 0 ? 1 : (sq < 0 ? -2 : 0));
    const ft = o.feet || [-2, 1];
    const look = o.look ? -1 : 1;

    for (const dx of ft) {
      p.round(MCX + dx - 4, 21 + (sq < 0 ? 1 : 0), 9, 5, 2, P.ink);
      p.round(MCX + dx - 3, 21 + (sq < 0 ? 1 : 0), 7, 3, 1, P.skin);
    }
    // the fin, still too big for him
    p.spike(MCX + 5 * look, hy - 9, 8, 10, -1, P.skinD);
    p.spike(MCX + 5 * look, hy - 7, 5, 7, -1, P.skin);
    // almost entirely head
    p.ellipse(MCX, hy, hw, hh, P.skin);
    p.ellipse(MCX, hy - 3, hw - 3, 3, P.skinL);
    p.ellipse(MCX - 1 * look, hy + 4, hw - 2, 4, P.belly);
    p.ellipse(MCX + 1 * look, hy + 2, 3, 2, P.skinD);
    // eyes: both forward, or both swivelled back over the shoulder
    const e1 = MCX - 5 * look, e2 = MCX + 5 * look;
    if (o.shut) {
      p.rect(e1 - 2, hy, 4, 1, P.eye); p.rect(e2 - 2, hy, 4, 1, P.eye);
    } else {
      p.disc(e1, hy, 2, P.eye); p.disc(e2, hy, 2, P.eye);
      p.set(e1 - 1 * look, hy - 1, '#ffffff'); p.set(e2 - 1 * look, hy - 1, '#ffffff');
    }
    if (o.brow) { p.rect(e1 - 3, hy - 4, 5, 1, P.skinD); p.rect(e2 - 2, hy - 4, 5, 1, P.skinD); }
    // the mouth, shut or mid-sentence
    if (o.mouth) {
      p.ellipse(MCX, hy + 6, 4, 2, P.gum);
      p.rect(MCX - 3, hy + 5, 7, 1, P.teeth);
    } else {
      p.rect(MCX - 5 * look, hy + 6, 9, 1, P.gum);
      p.spike(MCX + 3 * look, hy + 4, 4, 4, -1, P.gum);
      p.spike(MCX + 3 * look, hy + 5, 2, 2, -1, P.teeth);
    }
    // and a very small suit
    p.ellipse(MCX, 19 + b, 7, 5, P.belly);
    p.round(MCX - 8, 16 + b, 6, 8, 2, P.suit);
    p.round(MCX + 2, 16 + b, 6, 8, 2, P.suit);
    p.rect(MCX - 1, 17 + b, 2, 6, P.tie);
    // the fins, doing whatever they are doing
    const arms = o.arms || 'down';
    if (arms === 'up') {
      p.round(MCX - 11, 9 + b, 4, 7, 1, P.skinL);
      p.round(MCX + 7, 9 + b, 4, 7, 1, P.skinL);
    } else if (arms === 'wave') {
      p.round(MCX + 7 * look, 6 + b, 4, 8, 1, P.skinL);
      p.round(MCX - 10, 18 + b, 4, 4, 1, P.skinL);
    } else if (arms === 'point') {
      p.rect(MCX + 6 * look, 17 + b, 7 * look, 3, P.skinL);
      p.rect(MCX + 11 * look, 16 + b, 2 * look, 5, P.skinL);
      p.round(MCX - 11, 18 + b, 4, 4, 1, P.skinL);
    } else {
      p.round(MCX - 10, 18 + b, 4, 4, 1, P.skinL);
      p.round(MCX + 6, 18 + b, 4, 4, 1, P.skinL);
    }
    p.outline(P.ink);
    return p.toCanvas();
  }

  function miniSet(P) {
    const F4 = [[-4, 3], [-2, 1], [3, -4], [1, -2]];
    return {
      walk: [0, 1].map(m => F4.map((f, i) =>
        buildMini(P, { feet: f, b: (i === 1 || i === 3) ? -1 : 0, mouth: m }))),
      idle: [buildMini(P, {}), buildMini(P, { b: -1 })],
      wave: [buildMini(P, { arms: 'wave', mouth: 1 }), buildMini(P, { arms: 'wave', b: -1, mouth: 1 })],
      scold: [buildMini(P, { arms: 'up', mouth: 1, brow: 1 }),
        buildMini(P, { arms: 'up', mouth: 0, brow: 1, b: -1 })],
      point: buildMini(P, { arms: 'point', mouth: 1 }),
      look: buildMini(P, { look: 1 }),
      squash: buildMini(P, { sq: -1, feet: [-3, 2] }),
      stretch: buildMini(P, { sq: 1, feet: [-2, 1] })
    };
  }

  /* --------------------------------------------------------------- the guide
     He picks something you should be doing, walks to it, and waits. Standing
     about is what he does instead of nagging; nagging is what he does instead
     of waiting. */
  const SCOLDS = [
    'COME ON. I AM NOT A TOUR.',
    'THIS WAY. I SAID THIS WAY.',
    'YOU OWE ME A MILLION AND YOU ARE LOOKING AT A ROCK.',
    'I HAVE SEEN GLACIERS MOVE FASTER.',
    'WALK. IT IS ONE OF THE TWO THINGS YOU DO.',
    'I AM STANDING RIGHT HERE. I AM VERY BLUE.',
    'EVERY SECOND OF THIS IS COSTING ME MONEY.',
    'DO NOT MAKE ME COME BACK THERE. I CANNOT. BUT DO NOT.',
    'IS IT THE LEGS? IS THAT WHAT IT IS?'
  ];
  const NAGS = [
    'THE DEBT IS NOT GOING ANYWHERE.',
    'YOU ARE BREATHING MY AIR.',
    'STOP LOOKING AT THE SKY.',
    'I CAN SEE THE WATCH. I CAN ALWAYS SEE THE WATCH.',
    'ARE WE DOING THIS OR NOT.',
    'A MILLION. WITH AN M.',
    'I HAVE OTHER CLIENTS. THEY ARE ALL FASTER.'
  ];
  const BECKONS = ['COME ON.', 'THAT WAY. STILL.', 'ANY TIME NOW.', 'I AM WAITING.'];
  const ARRIVED = [
    'THERE. WAS THAT SO HARD.', 'GOOD. PRESS E. DO NOT MAKE ME SAY IT AGAIN.',
    'FINALLY. GET ON WITH IT.', 'YES. THAT ONE. THAT IS THE ONE.'
  ];

  const MS = {
    x: 0, y: 0, dir: 1, ph: 0, on: 0, pop: 0,
    mode: 'lead', goal: null, key: '', gi: 0, t: 0, point: 1, dist: 0,
    say: null, sayT: 0, hop: 0, z: 0, dz: 0, nag: 20
  };
  function mtalk(line, dur) { MS.say = line; MS.sayT = dur || 3; }
  function mset(mode) { MS.mode = mode; MS.t = 0; }

  function leadStep(dt, g, o) {
    const M = MS;
    if (!M.on) { M.on = 1; M.pop = 0; M.gi = 0; }
    M.pop = Math.min(1, M.pop + dt * 2);
    M.t += dt;
    M.sayT = Math.max(0, M.sayT - dt);
    if (M.sayT <= 0) M.say = null;

    // a new list of things to be doing means starting the tour again
    if (!M.goal || M.key !== o.key) {
      M.key = o.key;
      M.goal = o.goals.length ? o.goals[M.gi % o.goals.length] : null;
      mset('lead');
      if (M.goal) mtalk(M.goal.line, 3.4);
    }
    /* He does not go anywhere any more. He stands in the corner and points at
       where you ought to be, and the arrow beside him does the rest. */
    const gx = M.goal ? M.goal.x : o.px;
    M.point = Math.sign(gx - o.px) || 1;
    M.dist = Math.abs(gx - o.px);
    const there = M.dist < 48;
    M.dir = M.mode === 'lead' || M.mode === 'point' ? M.point : 1;

    if (M.mode === 'lead') {
      M.hop += dt * 7.6;
      if (there) { mset('point'); mtalk(U.pick(ARRIVED), 2.6); }
      else if (M.t > 3) mset('wait');
    } else if (M.mode === 'wait') {
      M.hop += dt * 2.2;
      if (there) { mset('point'); mtalk(U.pick(ARRIVED), 2.6); }
      else if (M.t > 9) { mset('beckon'); mtalk(U.pick(BECKONS), 2.2); }
    } else if (M.mode === 'beckon') {
      M.hop += dt * 3.4;
      if (there) { mset('point'); mtalk(U.pick(ARRIVED), 2.6); }
      else if (M.t > 3) { mset('scold'); mtalk(U.pick(SCOLDS), 3); }
    } else if (M.mode === 'scold') {
      M.hop += dt * 3.4;
      if (there) { mset('point'); mtalk(U.pick(ARRIVED), 2.6); }
      else if (M.t > 3.2) mset('wait');
    } else if (M.mode === 'point') {
      M.hop += dt * 2.2;
      if (M.t > 3) { M.gi++; M.goal = null; }
    }
    // the bounce, and what it does to his shape
    const lively = M.mode === 'lead';
    const z = Math.abs(Math.sin(M.hop)) * (lively ? 4 : 1);
    M.dz = (z - M.z) / Math.max(dt, 0.001);
    M.z = z;

    // and the occasional unprompted remark, which is now genuinely occasional
    M.nag -= dt;
    if (M.nag <= 0) {
      M.nag = U.rand(26, 46);
      if (!M.say && M.mode === 'wait') mtalk(U.pick(NAGS), 2.6);
    }
    return M;
  }

  function miniFrame(t) {
    const M = MS;
    const a = ensureArt();
    /* A bounce reads as squash at the bottom, stretch while moving fast, and
       normal at the top -- keyed off height and speed rather than one of them,
       or he spends the whole cycle stretched. */
    if (M.mode === 'lead') {
      if (M.z < 0.6 && M.dz < 0) return a.mini.squash;
      if (Math.abs(M.dz) > 22) return a.mini.stretch;
    }
    if (M.mode === 'lead') return a.mini.point;
    if (M.mode === 'beckon') return a.mini.wave[Math.floor(t * 6) % 2];
    if (M.mode === 'scold') return a.mini.scold[Math.floor(t * 8) % 2];
    if (M.mode === 'point') return a.mini.point;
    return a.mini.idle[Math.floor(t * 2) % 2];
  }

  function drawMini(ctx, x, y, t, lo, hi) {
    const M = MS;
    const a = ensureArt();
    const flick = 0.84 + Math.abs(Math.sin(t * 27)) * 0.1 + (U.chance(0.02) ? -0.22 : 0);
    const e = M.pop >= 1 ? 1 : M.pop * M.pop * (3 - 2 * M.pop);
    const by = Math.round(y - M.z);
    ctx.globalAlpha = flick * 0.34;
    X.blob(ctx, x, y + 1, Math.round((11 - M.z) * e), 3, 'rgba(63,184,216,0.6)');
    ctx.globalAlpha = 1;
    if (e < 1) {
      const h = Math.max(1, Math.round(MH * e));
      ctx.globalAlpha = flick * (0.4 + 0.6 * e);
      ctx.drawImage(a.mini.idle[0], 0, MH - h, MW, h,
        Math.round(x - MCX), Math.round(y - MBASE + (MH - h)), MW, h);
      ctx.globalAlpha = 1;
      return;
    }
    const cv = miniFrame(t);
    ctx.save();
    ctx.globalAlpha = flick;
    if (M.dir < 0) { ctx.translate(Math.round(x - MCX) + MW, by - MBASE); ctx.scale(-1, 1); }
    else ctx.translate(Math.round(x - MCX), by - MBASE);
    ctx.drawImage(cv, 0, 0);
    ctx.beginPath(); ctx.rect(0, MH - ((t * 22) % (MH + 8)), MW, 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35;
    ctx.drawImage(cv, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
    // the arrow: which way the thing he wants is, and how far off you are
    if (M.goal && M.dist > 48) {
      const ax = x + M.point * 23, k = Math.abs(Math.sin(t * 3));
      ctx.globalAlpha = flick * (0.5 + k * 0.5);
      for (let i = 0; i < 4; i++) X.rect(ctx, ax + M.point * i, y - 12 - i, 2, 1 + i * 2, '#7ef9ff');
      X.rect(ctx, ax - M.point * 5, y - 13, 6, 3, '#7ef9ff');
      ctx.globalAlpha = 1;
    }
    if (M.say) miniBubble(ctx, x + 10, by - MBASE - 4, M.say, M.sayT, lo, hi);
  }

  /* A small shark gets a small bubble. Unwrapped, one of his longer opinions
     was two hundred and forty pixels of a three hundred and twenty pixel view. */
  function miniBubble(ctx, x, y, text, life, lo, hi) {
    const rows = wrap(text, 116, 1);
    let tw = 0;
    for (const r of rows) tw = Math.max(tw, F.width(r, 1));
    const w = tw + 10, h = 4 + rows.length * 10;
    const L = lo === undefined ? 3 : lo, H = (hi === undefined ? VW - 3 : hi) - w;
    const bx = Math.round(U.clamp(x - w / 2, Math.min(L, H), Math.max(L, H)));
    const by = Math.round(y - h - 2);
    ctx.globalAlpha = U.clamp(life * 2.5, 0, 1);
    X.plate(ctx, bx - 1, by - 1, w + 2, h + 2, '#0a3446', null, null, 4);
    X.plate(ctx, bx, by, w, h, '#cdf6ff', '#ffffff', '#6fc8e0', 3);
    const tip = U.clamp(x, bx + 6, bx + w - 6);
    X.poly(ctx, [[tip - 3, by + h - 2], [tip + 3, by + h - 2], [tip, by + h + 5]], '#cdf6ff');
    rows.forEach((r, i) => F.draw(ctx, r, bx + w / 2, by + 2 + i * 10, '#0a3446', { center: true }));
    ctx.globalAlpha = 1;
  }

  let art = null;
  function ensureArt() {
    if (art) return art;
    const set = (P) => [0, 1].map(m => [0, 1, 2, 3].map(st => buildChum(P, m, st)));
    art = { real: set(REAL), holo: set(HOLO), mini: miniSet(HOLO) };
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
    checkout: ['HUMANS DO NOT LET YOU BUY A THING. THEY LET YOU APPLY.',
      'SIGN IN. PROVE YOU ARE NOT A ROBOT. THEN THE CARD. THEN THE CODE.',
      'I HAVE DONE THIS. IT TAKES LONGER THAN THE MINING.'],
    twofa: ['NOW THEY SEND EIGHT NUMBERS TO A SATELLITE.',
      'READ THEM OFF THE SCREEN. TYPE THEM IN THE OTHER SCREEN.',
      'THIS IS WHAT THEY CALL SECURITY.'],
    ordered: ['IT IS BOUGHT. IT IS ON THE MOON. IT WAS ALWAYS ON THE MOON.'],
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
    S.pop = 0; S.phase = 'in'; S.beam = 0; HS.x = CORNER.x; HS.dir = 1; HS.ph = 0;
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
    const bx = Math.round(U.clamp(o.anchorL !== undefined ? o.anchorL : o.cx - dw / 2, 6, VW - dw - 6));
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
  function beamDraw(ctx, cv, sx, sy, flip, bm, gy, flick, t, K) {
    const CW = MW * K, CH = MH * K;
    const e = bm * bm * (3 - 2 * bm);
    const h = Math.max(1, Math.round(CH * e));
    const kx = 0.22 + 0.78 * e;
    const jit = (1 - e) * 3;
    const top = sy + CH - h;

    // the column of light he is coming up, at full height from the first frame
    ctx.globalAlpha = (1 - e) * 0.5 * flick;
    X.rect(ctx, sx + CW / 2 - 2, sy, 4, CH, '#7ef9ff');
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(Math.round(sx + CW / 2 + U.rand(-jit, jit)), Math.round(sy + CH));
    ctx.scale(flip ? -kx : kx, 1);
    ctx.globalAlpha = (0.5 + 0.5 * e) * flick;
    ctx.drawImage(cv, 0, (MH * e >= MH ? 0 : MH - h / K), MW, h / K, -CW / 2, -h, CW, h);
    ctx.restore();
    ctx.globalAlpha = 1;

    // the hot edge riding the top of however much of him there is so far
    const hw = Math.round(CW * kx * 0.5);
    X.rect(ctx, sx + CW / 2 - hw, top, hw * 2, 1, '#eafcff');
    X.rect(ctx, sx + CW / 2 - hw - 2, top, hw * 2 + 4, 1, 'rgba(126,249,255,0.5)');
    // and a few sparks coming off it
    for (let i = 0; i < 4; i++) {
      const q = U.hash2(i, Math.floor(t * 20));
      ctx.globalAlpha = 0.7 * (1 - e);
      X.rect(ctx, sx + CW / 2 - hw + q * hw * 2, top - 1 - q * 6, 1, 2, '#eafcff');
      ctx.globalAlpha = 1;
    }
  }

  /* Where his feet go. The chart and the ABAY screen both keep a panel along
     the bottom edge, so on those he walks a stripe higher up. */
  /* The chart and the computer both keep a panel along the bottom edge, so in
     those two he stands a stripe higher. He stays in the same corner. */
  function groundY(g) {
    return CORNER.y - ((g.state === 'starmap' || g.state === 'desk') ? 56 : 0);
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
    const wx = VW - 40 + bz, wy = gy + 4;
    X.plate(ctx, wx, wy, 22, 14, '#2a2438', '#453c5c', '#0a0614', 3);
    X.rect(ctx, wx + 4, wy + 3, 14, 8, '#0d5a78');
    X.rect(ctx, wx + 6, wy + 5, 10, 4, '#7ef9ff');

    const bk = S.phase === 'on' ? 1 : S.beam;
    ctx.globalAlpha = flick * 0.55;
    // the cone of light out of it, widening to wherever he has wandered
    X.poly(ctx, [[wx + 4, wy + 2], [wx + 18, wy + 2],
      [HS.x + 26 * bk, gy - 50 * bk], [HS.x - 26 * bk, gy - 50 * bk]], 'rgba(63,184,216,0.10)');
    // and the pool he stands in
    X.blob(ctx, HS.x, gy + 1, Math.max(4, 22 * bk), 4, 'rgba(63,184,216,0.40)');
    ctx.globalAlpha = 1;

    /* The one on the call is the SAME small shark, drawn at exactly twice
       size. He used to be eighty pixels tall and took up a third of the
       screen; this is a hologram of a shark, not a shark. */
    const K = 2;
    const cv = a.mini.walk[talking ? 1 : 0][Math.floor(HS.ph) % 4];
    const sx = Math.round(HS.x - MCX * K), sy = Math.round(gy - MBASE * K);
    const bm = S.phase === 'on' ? 1 : S.beam;
    if (bm >= 1) {
      ctx.save();
      ctx.globalAlpha = flick;
      if (HS.dir < 0) { ctx.translate(sx + MW * K, sy); ctx.scale(-1, 1); }
      else ctx.translate(sx, sy);
      ctx.scale(K, K);
      ctx.drawImage(cv, 0, 0);
      // one bright band rolling up him, clipped to his own silhouette
      ctx.beginPath();
      ctx.rect(0, MH - ((t * 16) % (MH + 6)), MW, 2);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3;
      ctx.drawImage(cv, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      beamDraw(ctx, cv, sx, sy, HS.dir < 0, bm, gy, flick, t, K);
    }

    // no name tag any more: the bubble says who it is, and the corner is
    // small enough already without a caption under it
    if (bm < 1) return;                     // no bubble while he is materialising

    /* The bubble stays put in the middle while he walks about under it --
       a caption that slides around with him is unreadable -- and only the
       tail follows him. */
    const rows = wrap(shown, 232, 1);
    const done = S.chars >= line.length;
    const more = S.line < S.lines.length - 1;
    speech(ctx, {
      anchorL: HS.x - 12, tipX: HS.x + 4, ty: gy - MH * 2 - 2, rows, scale: 1, pop: S.pop, t,
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

  /* =====================================================================
     THE NIGHT YOU LOST IT

     Eight beats with a playable club in the middle of them. You come round on
     the carpet, you find THE UNIVERSAL at the back, you get nine stars, and
     then the game does to you what the machine was always going to do. After
     that it is out of your hands: the floor, the drag through the city, the
     fist, and the room with the throne in it. */
  const BEATS = [
    { id: 'wake', dur: 11, lines: [
      'YOU WAKE UP ON A CARPET.',
      'YOU DO NOT KNOW WHOSE CARPET.',
      'THERE IS A MACHINE AT THE BACK OF THE ROOM WITH YOUR NAME ON IT.',
      'GO AND FIND IT. THAT IS WHAT YOU CAME FOR.'
    ] },
    { id: 'universal', dur: 999, lines: [] },      // interactive: the ten stars
    { id: 'number', dur: 7, lines: ['THE MACHINE DID NOT WANT IT.', 'SOMEBODY BEHIND YOU DID.'] },
    { id: 'floor', dur: 10, lines: [
      'YOU GO DOWN ON THE CARPET.',
      'NOBODY IN THE ROOM STOPS DANCING.',
      'SOMEBODY STEPS OVER YOU TO GET TO THE BAR.'
    ] },
    { id: 'drag', dur: 22, lines: [
      'TWO OF THEM PICK YOU UP.',
      'THE BIG ONE HAS HORNS. HE DOES NOT SAY ANYTHING ALL NIGHT.',
      'THE OTHER ONE IS GREY AND COVERED IN RED, AND HE WILL NOT SHUT UP.',
      'DRAX: I AM DRAX. I AM TAKING YOU TO THE MAN.',
      'DRAX: DO NOT STRUGGLE. NOTHING IS FUNNIER THAN WHEN YOU STRUGGLE.',
      'THE CITY GOES PAST UPSIDE DOWN. IT IS BEAUTIFUL. YOU ARE BLEEDING.'
    ] },
    { id: 'fist', dur: 7, lines: [
      'YOU: WHY ARE YOU GREY?',
      'DRAX: WHAT?',
      'YOU: I SAID WHY ARE YOU --'
    ] },
    { id: 'throne', dur: 30, lines: [
      'YOU ARE LOOKING AT A CEILING. THE CEILING IS GOLD.',
      'MR CHUM: HE IS AWAKE. GET HIM UP. NOT ALL THE WAY UP.',
      'MR CHUM: YOU OWE ME ONE MILLION.',
      'MR CHUM: YOU HAVE NO MONEY. NO SHIP. NO IDEAS.',
      'MR CHUM: SO I BOUGHT YOU A SHIP. AND A DRILL. AND A MOON.',
      'MR CHUM: GO AND EAT A PLANET. BRING ME MY MONEY.',
      'MR CHUM: THIS IS A WATCH. I AM IN IT NOW.',
      'MR CHUM: THAT IS THE ARRANGEMENT. NOD.'
    ] },
    { id: 'drop', dur: 6, lines: ['AND THAT IS HOW YOU CAME TO OWN A MOON.'] }
  ];
  const B_OF = {};
  BEATS.forEach((b, i) => { B_OF[b.id] = i; });

  /* ------------------------------------------------------ THE UNIVERSAL
     Ten stars in a row. You get nine. At nine it asks you whether you want to
     go on or walk away, and it does not matter: the tenth reel is a skull
     either way, because that is what the machine is for. */
  const UNI = { n: 0, spin: 0, reel: 0, choice: 0, lost: 0, t: 0, shake: 0, flash: 0 };
  function enterGamble(g) {
    IN_S.beat = B_OF.universal; IN_S.t = 0; IN_S.line = 0; IN_S.chars = 0; IN_S.pop = 1;
    UNI.n = 0; UNI.spin = 0; UNI.reel = 0; UNI.choice = 0; UNI.lost = 0; UNI.t = 0;
    UNI.shake = 0; UNI.flash = 0;
    g.state = 'intro';
    A.sfx.tone(160, { type: 'square', to: 90, dur: 0.6, vol: 0.1 });
  }

  function updateUniversal(dt, g) {
    UNI.t += dt;
    UNI.shake = Math.max(0, UNI.shake - dt * 2);
    UNI.flash = Math.max(0, UNI.flash - dt * 1.6);
    const IN = PD.input, m = IN.mouse;
    const poke = IN.hit('KeyE') || IN.hit('Space') || IN.hit('Enter') || (m.inside && m.leftPressed);

    if (UNI.spin > 0) {
      UNI.spin -= dt;
      UNI.reel = (UNI.reel + dt * 30) % 5;
      if (UNI.spin <= 0) {
        if (UNI.n < 9) {
          UNI.n++; UNI.reel = 4;                 // another star
          A.sfx.tone(500 + UNI.n * 70, { type: 'square', to: 900 + UNI.n * 80, dur: 0.12, vol: 0.07 });
          FX.stars(240, 116, 6, '#ffd34d');
          if (UNI.n === 9) { UNI.choice = 1; A.sfx.tone(200, { type: 'sine', to: 140, dur: 0.8, vol: 0.08 }); }
        } else {
          UNI.reel = 3;                          // and the skull
          UNI.lost = 1; UNI.shake = 1; UNI.flash = 1;
          A.sfx.deny();
          A.sfx.tone(220, { type: 'square', to: 60, dur: 1.1, vol: 0.12 });
          FX.ring(240, 116, 4, 120, 1.1, '#ff5a4d', 3);
        }
      }
      return;
    }
    if (UNI.lost) {
      if (UNI.t > 2.6 && poke) nextBeat(g);
      return;
    }
    if (UNI.choice) {
      // GO ON, or WALK AWAY. There is no walking away.
      const go = m.inside && m.leftPressed && m.x > 120 && m.x < 232 && m.y > 196 && m.y < 218;
      const out = m.inside && m.leftPressed && m.x > 248 && m.x < 360 && m.y > 196 && m.y < 218;
      if (go || IN.hit('KeyE') || IN.hit('Enter')) { UNI.choice = 0; UNI.n = 9; UNI.spin = 1.4; A.sfx.click(); }
      else if (out || IN.hit('Escape')) {
        UNI.choice = 0; UNI.spin = 1.4;
        IN_S.quit = 1;
        A.sfx.click();
      }
      return;
    }
    if (poke) { UNI.spin = UNI.n < 8 ? 0.5 : 0.9; A.sfx.tone(260, { type: 'square', to: 520, dur: 0.14, vol: 0.07 }); }
  }

  function drawUniversal(ctx, g, t) {
    const sh = UNI.shake > 0 ? Math.round(Math.sin(t * 60) * UNI.shake * 5) : 0;
    ctx.save(); ctx.translate(sh, 0);
    // a black room with one machine lit in it
    ctx.fillStyle = '#0a0410'; ctx.fillRect(-8, 0, VW + 16, VH);
    for (let i = 0; i < 60; i++) {
      const x = (U.hash2(i, 3) * VW) | 0, y = (U.hash2(i, 7) * VH) | 0;
      ctx.globalAlpha = 0.1 + U.hash2(i, 11) * 0.2;
      ctx.fillStyle = i % 3 ? '#4a1c3a' : '#12384a'; ctx.fillRect(x, y, 2, 1);
    }
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.1 + Math.abs(Math.sin(t * 2)) * 0.05;
    X.poly(ctx, [[210, 0], [270, 0], [340, VH], [140, VH]], '#ffd34d');
    ctx.globalAlpha = 1;

    // the cabinet, which is enormous
    X.plate(ctx, 148, 40, 184, 176, '#2a1a3a', '#4a3660', '#120a1c', 6);
    X.plate(ctx, 158, 48, 164, 30, '#120a1c', '#3a2a52', '#000000', 4);
    const lit = Math.sin(t * 6) > -0.3;
    F.draw(ctx, 'THE UNIVERSAL', 240, 56, lit ? '#ffd34d' : '#6a5a1a', { center: true, scale: 2, shadow: '#3a0c30' });
    F.draw(ctx, 'TEN IN A ROW TAKES THE LOT', 240, 70, lit ? '#ff5fa8' : '#4a1c3a', { center: true, shadow: false });

    // the ten lamps along the top, one per star so far
    for (let i = 0; i < 10; i++) {
      const lx = 164 + i * 16;
      const on = i < UNI.n;
      X.plate(ctx, lx, 84, 13, 13, on ? '#ffd34d' : '#241636', on ? '#fff3b0' : '#3a2a52', '#120a1c', 3);
      if (on) PD.glyph.draw(ctx, 'star', lx - 1, 83, '#c98a10', '#fff3b0');
      else F.draw(ctx, String(i + 1), lx + 6, 87, '#5a4a70', { center: true, shadow: false });
    }

    // the window
    X.plate(ctx, 186, 102, 108, 44, '#0d0718', '#3a2a52', '#000000', 4);
    const SY = ['coin', 'ore', 'planet', 'skull', 'star'];
    for (let r = 0; r < 3; r++) {
      const rx = 192 + r * 34;
      X.rect(ctx, rx, 106, 30, 36, '#e8e4d0');
      X.rect(ctx, rx, 106, 30, 1, '#8e8874');
      const idx = Math.floor(UNI.reel) % 5;
      if (UNI.spin > 0) {
        for (let k = -1; k <= 1; k++) {
          ctx.globalAlpha = k ? 0.28 : 0.85;
          PD.glyph.draw(ctx, SY[(idx + k + r + 5) % 5], rx + 3, 108 + k * 15, '#3a2a52', '#8a7ab0', 2);
        }
        ctx.globalAlpha = 1;
      } else {
        const show = UNI.lost ? 'skull' : (UNI.n > 0 ? 'star' : SY[(idx + r) % 5]);
        PD.glyph.draw(ctx, show, rx + 3, 112, show === 'skull' ? '#c22a4a' : '#c98a10',
          show === 'skull' ? '#ff8a9a' : '#fff3b0', 2);
      }
    }
    X.rect(ctx, 186, 123, 108, 1, UNI.lost ? '#ff5a4d' : '#8a2f4a');

    // the lever
    const lv = UNI.spin > 0 ? 16 : 0;
    X.line(ctx, 340, 150 + lv, 340, 110 + lv, '#8a7ab0', 4);
    X.blob(ctx, 340, 106 + lv, 7, 7, '#c22a4a');
    X.blob(ctx, 338, 104 + lv, 3, 3, '#ff8a9a');

    // our man, at the lever, in the worst moment of his life
    const al = PD.art.sprites.alien;
    const K = 1.1, bob = Math.sin(t * 3) * (UNI.lost ? 0 : 2);
    const ax = 386, ay = 216 - (al.h - al.oy) * K + bob;
    ctx.drawImage(al.frames[UNI.lost ? 0 : Math.floor(t * 6) % 4], 0, 0, al.frames[0].width, al.frames[0].height,
      Math.round(ax - al.ox * K), Math.round(ay - al.oy * K), Math.round(al.w * K), Math.round(al.h * K));

    X.rect(ctx, 0, 216, VW, VH - 216, '#1a1024');
    X.rect(ctx, 0, 214, VW, 2, '#2a1c33');
    for (let x = 0; x < VW; x += 16) X.rect(ctx, x, 216, 8, VH - 216, '#231430');
    ctx.restore();

    if (UNI.flash > 0) {
      ctx.fillStyle = 'rgba(255,90,77,' + (UNI.flash * 0.5).toFixed(2) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }

    // and whatever the machine wants from you now
    if (UNI.lost) {
      captionCard(ctx, [IN_S.quit ? 'YOU WALKED AWAY. IT SPUN ANYWAY.' : 'NINE. AND THEN THIS.'],
        2, 1, t, UNI.t > 2.6 && Math.abs(Math.sin(t * 4)) > 0.4 ? 'E / TAP' : null);
    } else if (UNI.choice) {
      const m = PD.input.mouse;
      captionCard(ctx, ['NINE. ONE MORE TAKES EVERYTHING.'], 1, 1, t, null);
      for (const [bx, lab, col] of [[120, 'ONE MORE', '#f2c23a'], [248, 'WALK AWAY', '#6b6480']]) {
        const hot = m.inside && m.x > bx && m.x < bx + 112 && m.y > 196 && m.y < 218;
        X.plate(ctx, bx, 196, 112, 22, hot ? col : '#241636', col, '#120a1c', 4);
        F.draw(ctx, lab, bx + 56, 202, hot ? '#1a1024' : col, { center: true, scale: 2, shadow: '#000000' });
      }
    } else {
      captionCard(ctx, [UNI.n === 0 ? 'PULL IT.' : 'AGAIN. ' + (10 - UNI.n) + ' TO GO.'], 2, 1, t,
        Math.abs(Math.sin(t * 4)) > 0.4 ? 'E / TAP' : null);
    }
  }

  /* ---- the floor of the club, from very close to it ---- */
  function drawFloor(ctx, g, t) {
    ctx.fillStyle = '#140820'; ctx.fillRect(0, 0, VW, VH);
    // carpet, seen from about six inches up
    for (let y = 120; y < VH; y += 6) {
      const k = (y - 120) / (VH - 120);
      X.rect(ctx, 0, y, VW, 6, k > 0.5 ? '#4a1230' : '#3a0e26');
      for (let x = ((y * 7) % 18); x < VW; x += 18) X.rect(ctx, x, y + 2, 7, 3, k > 0.5 ? '#5c1a3c' : '#47122e');
    }
    X.rect(ctx, 0, 118, VW, 2, '#2a0a1c');
    // legs going past, out of focus
    for (let i = 0; i < 7; i++) {
      const lx = ((i * 83 + t * (14 + i * 5)) % (VW + 80)) - 40;
      ctx.globalAlpha = 0.55;
      X.rect(ctx, lx, 66, 9, 54, '#1d0e28');
      X.rect(ctx, lx + 13, 70, 9, 50, '#1d0e28');
      X.blob(ctx, lx + 4, 120, 8, 3, '#0d0614');
      ctx.globalAlpha = 1;
    }
    // the lights of the room, far away and not interested
    for (let i = 0; i < 9; i++) {
      const on = (Math.floor(t * 4) + i) % 3 !== 0;
      X.rect(ctx, 10 + i * 52, 28, 34, 3, on ? '#7a2450' : '#2a0e1c');
    }
    ctx.globalAlpha = 0.12;
    X.blob(ctx, 240, 50, 180, 40, '#ff5fa8');
    ctx.globalAlpha = 1;

    // you, down there
    const sk = PD.art.skinFor(g.save.cos), spr = sk.alienCore;
    const cv = spr.frames[0], k = spr.hd || 1;
    ctx.save();
    ctx.translate(200, 150 + Math.sin(t * 1.4) * 1);
    ctx.rotate(-0.5);
    ctx.drawImage(cv, -spr.ox, -spr.oy, cv.width / k, cv.height / k);
    ctx.restore();
    // and the tears, which are the only thing moving fast
    for (let i = 0; i < 5; i++) {
      const f = ((t * 1.4 + i * 0.2) % 1);
      ctx.globalAlpha = 1 - f;
      X.rect(ctx, 196 + i * 3 - f * 6, 132 + f * 26, 2, 3, '#9fe8ff');
      ctx.globalAlpha = 1;
    }
  }

  /* ---- the city, going past upside down ---- */
  const CITY = [];
  for (let i = 0; i < 120; i++) {
    CITY.push({ l: i % 3, x: U.hash2(i, 3) * 1600, w: 16 + U.hash2(i, 7) * 42, h: 40 + U.hash2(i, 11) * 130,
      hue: U.hash2(i, 13) });
  }
  function drawDrag(ctx, g, t) {
    const scroll = t * 58;
    // a sky with a fat neon smear in it
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, '#120428'); grd.addColorStop(0.55, '#2a0c3e'); grd.addColorStop(1, '#0a0418');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 0.18;
    X.blob(ctx, 300, 56, 150, 40, '#ff2f7a');
    X.blob(ctx, 120, 40, 110, 26, '#2f7aff');
    ctx.globalAlpha = 1;
    // rain
    for (let i = 0; i < 70; i++) {
      const x = ((U.hash2(i, 5) * VW + t * 40) % (VW + 20)) - 10;
      const y = ((U.hash2(i, 9) * VH + t * 420 + i * 13) % VH);
      ctx.globalAlpha = 0.18 + U.hash2(i, 17) * 0.2;
      X.rect(ctx, x, y, 1, 7, '#9fd8ff');
      ctx.globalAlpha = 1;
    }
    // three layers of tower, each slower than the one in front
    for (let L = 2; L >= 0; L--) {
      const sp = [1, 0.55, 0.28][L];
      const base = [186, 176, 168][L];
      const col = ['#150a24', '#1d1030', '#28183f'][L];
      const litc = ['#3a2050', '#4a2a66', '#5e3a80'][L];
      for (const b of CITY) {
        if (b.l !== L) continue;
        const x = ((b.x - scroll * sp) % 1600 + 1600) % 1600 - 200;
        if (x < -80 || x > VW + 20) continue;
        const h = b.h * (0.6 + L * 0.2);
        X.rect(ctx, x, base - h, b.w, h + 40, col);
        X.rect(ctx, x, base - h, b.w, 2, litc);
        // windows
        for (let wy = base - h + 6; wy < base - 4; wy += 8) {
          for (let wx = x + 3; wx < x + b.w - 3; wx += 7) {
            const on = U.hash2((wx * 3) | 0, (wy * 5) | 0) > (0.35 + L * 0.12);
            if (!on) continue;
            X.rect(ctx, wx, wy, 3, 4, b.hue > 0.6 ? '#ffd34d' : (b.hue > 0.3 ? '#7ef9ff' : '#ff5fa8'));
          }
        }
        // a sign on about one in five
        if (b.hue > 0.78) {
          const on = Math.sin(t * 5 + b.x) > -0.4;
          X.rect(ctx, x + 2, base - h - 10, b.w - 4, 8, on ? '#ff2f7a' : '#3a0e26');
          X.rect(ctx, x + 4, base - h - 8, b.w - 8, 4, on ? '#ffd6f0' : '#5a1a3a');
        }
      }
    }
    // traffic, in the gap between the layers
    for (let i = 0; i < 5; i++) {
      const x = ((i * 137 - t * (90 + i * 30)) % (VW + 120) + VW + 120) % (VW + 120) - 60;
      const y = 60 + (i % 3) * 16;
      X.rect(ctx, x, y, 18, 5, '#2a2140');
      X.rect(ctx, x + 2, y - 2, 12, 3, '#3a3060');
      X.rect(ctx, x + 17, y + 1, 4, 2, '#ff5a4d');
      X.rect(ctx, x - 3, y + 1, 4, 2, '#7ef9ff');
      ctx.globalAlpha = 0.25;
      X.blob(ctx, x - 8, y + 2, 10, 2, '#7ef9ff');
      ctx.globalAlpha = 1;
    }
    // the street
    X.rect(ctx, 0, 200, VW, VH - 200, '#0f0a1a');
    X.rect(ctx, 0, 198, VW, 3, '#1d1030');
    for (let x = ((-scroll * 1.6) % 40 + 40) % 40 - 40; x < VW; x += 40) X.rect(ctx, x, 214, 22, 3, '#2a2140');
    ctx.globalAlpha = 0.14;
    for (let i = 0; i < 6; i++) X.blob(ctx, ((i * 96 - scroll * 1.6) % 600 + 600) % 600 - 60, 208, 30, 8, '#ff2f7a');
    ctx.globalAlpha = 1;

    // and the three of them, dead centre
    const a = ensureArt();
    const bob = Math.sin(t * 5) * 2;
    drawBull(ctx, 300, 200 + bob, t);
    drawDrax(ctx, 176, 200 - bob, t);
    // you, between them, being dragged by the ankles
    const sk = PD.art.skinFor(g.save.cos), spr = sk.alienCore;
    const cv = spr.frames[0], k = spr.hd || 1;
    ctx.save();
    ctx.translate(238, 190 + bob);
    ctx.rotate(1.5);
    ctx.drawImage(cv, -spr.ox, -spr.oy, cv.width / k, cv.height / k);
    ctx.restore();
    for (let i = 0; i < 4; i++) {
      if (!U.chance(0.5)) continue;
      X.rect(ctx, 226 + U.rand(-14, 14), 198 + U.rand(-2, 4), 2, 1, '#c9bce8');
    }
  }

  /* Drax: grey, covered in red, and not remotely joking. */
  function drawDrax(ctx, x, y, t) {
    const S1 = '#8d99a6', S2 = '#5d6874', RD = '#b04a52', DK = '#252a36';
    const br = Math.sin(t * 3) * 1;
    X.blob(ctx, x, y + 1, 14, 3, '#0a0614');
    // legs
    X.rect(ctx, x - 9, y - 24, 8, 24, DK);
    X.rect(ctx, x + 2, y - 24, 8, 24, DK);
    X.rect(ctx, x - 10, y - 4, 10, 4, '#1a1d26');
    X.rect(ctx, x + 1, y - 4, 10, 4, '#1a1d26');
    // torso
    X.blob(ctx, x, y - 34, 13, 11 + br, S1);
    X.rect(ctx, x - 13, y - 28, 26, 6, S2);
    for (let i = 0; i < 7; i++) {
      X.rect(ctx, x - 10 + (i % 4) * 6, y - 42 + ((i / 4) | 0) * 7, 5, 2, RD);
      X.rect(ctx, x - 8 + (i % 3) * 7, y - 38 + (i % 2) * 6, 2, 5, RD);
    }
    // arms, one of them holding an ankle
    X.rect(ctx, x - 18, y - 40, 7, 18, S1);
    X.rect(ctx, x + 11, y - 40, 7, 14, S1);
    X.rect(ctx, x + 14, y - 28, 12, 5, S1);
    X.rect(ctx, x - 18, y - 38, 7, 3, RD);
    // head
    X.blob(ctx, x, y - 50, 8, 7, S1);
    X.rect(ctx, x - 6, y - 55, 12, 2, RD);
    X.rect(ctx, x - 5, y - 51, 3, 2, '#120f16');
    X.rect(ctx, x + 2, y - 51, 3, 2, '#120f16');
    X.rect(ctx, x - 3, y - 46, 6, 1, '#3a2028');
  }

  /* The big one. He has horns and nothing at all to say. */
  function drawBull(ctx, x, y, t) {
    const S1 = '#7a5a48', S2 = '#523a2e', H = '#e8dfc4';
    const br = Math.sin(t * 2.4 + 1) * 1;
    X.blob(ctx, x, y + 1, 17, 3, '#0a0614');
    X.rect(ctx, x - 12, y - 26, 10, 26, '#2a2438');
    X.rect(ctx, x + 3, y - 26, 10, 26, '#2a2438');
    X.blob(ctx, x, y - 40, 17, 14 + br, S1);
    X.rect(ctx, x - 17, y - 34, 34, 7, S2);
    X.rect(ctx, x - 22, y - 48, 8, 22, S1);
    X.rect(ctx, x + 14, y - 48, 8, 18, S1);
    X.rect(ctx, x - 26, y - 32, 12, 6, S1);
    X.blob(ctx, x + 1, y - 58, 10, 8, S1);
    X.blob(ctx, x - 3, y - 54, 6, 4, '#a07a60');
    X.rect(ctx, x - 4, y - 59, 3, 2, '#120f16');
    X.rect(ctx, x + 3, y - 59, 3, 2, '#120f16');
    // the horns
    for (const s of [-1, 1]) {
      X.rect(ctx, x + s * 9, y - 64, 4, 3, H);
      X.rect(ctx, x + s * 12, y - 68, 4, 5, H);
      X.rect(ctx, x + s * 14, y - 71, 3, 4, H);
    }
    X.rect(ctx, x - 2, y - 50, 5, 2, '#c9c4b4');       // the ring
  }

  /* ---- the fist ---- */
  function drawFist(ctx, g, t) {
    drawDrag(ctx, g, t);
    const k = U.clamp((IN_S.t - 3.2) / 0.7, 0, 1);
    if (IN_S.line >= 2 && k > 0) {
      // it arrives very fast and it fills the screen
      const r = 20 + k * k * 260;
      X.blob(ctx, 240, 130, r, r * 0.85, '#8d99a6');
      X.blob(ctx, 240 - r * 0.3, 130 - r * 0.3, r * 0.5, r * 0.4, '#a7b2be');
      for (let i = 0; i < 5; i++) X.rect(ctx, 240 - r + i * r * 0.4, 130 - r * 0.2, r * 0.25, r * 0.5, '#6d7885');
      if (k >= 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, VW, VH); }
    }
  }

  /* ---- and the room with the throne in it, seen from the carpet ---- */
  function drawThrone(ctx, g, t) {
    const wake = U.clamp(IN_S.t / 1.6, 0, 1);
    ctx.fillStyle = '#12060c'; ctx.fillRect(0, 0, VW, VH);
    // a gold ceiling, way up, because you are looking up at it
    for (let i = 0; i < 9; i++) {
      const w = 60 + i * 6;
      X.rect(ctx, 240 - w / 2, 4 + i * 4, w, 3, i % 2 ? '#6a5220' : '#8a6a2a');
    }
    ctx.globalAlpha = 0.14;
    X.blob(ctx, 240, 30, 190, 30, '#ffd34d');
    ctx.globalAlpha = 1;
    // pillars either side, converging because of the angle
    for (const s of [-1, 1]) {
      X.poly(ctx, [[240 + s * 70, 30], [240 + s * 96, 30], [240 + s * 250, VH], [240 + s * 150, VH]], '#2a1018');
      X.poly(ctx, [[240 + s * 70, 30], [240 + s * 78, 30], [240 + s * 170, VH], [240 + s * 150, VH]], '#3a1a24');
    }
    // the steps up to it
    for (let i = 0; i < 6; i++) {
      const w = 150 + i * 26, y = 150 + i * 14;
      X.rect(ctx, 240 - w / 2, y, w, 14, i % 2 ? '#3a1a24' : '#451f2c');
      X.rect(ctx, 240 - w / 2, y, w, 2, '#5e2c3c');
    }
    // the throne
    X.plate(ctx, 206, 84, 68, 70, '#5e2c3c', '#8a4458', '#2a1018', 5);
    for (let i = 0; i < 5; i++) X.spike(ctx, 0, 0, 0, 0, 0, '#000');
    for (let i = 0; i < 7; i++) {
      const sx = 208 + i * 10;
      X.poly(ctx, [[sx, 84], [sx + 8, 84], [sx + 4, 84 - 8 - (i % 2) * 6]], '#8a6a2a');
    }
    X.rect(ctx, 206, 130, 68, 6, '#8a6a2a');
    // and him on it, at a comfortable size for a man who owns the building
    const a = ensureArt();
    const K = 1.4;
    ctx.save();
    ctx.translate(Math.round(240 - MCX * K), Math.round(146 - MBASE * K));
    ctx.scale(K, K);
    ctx.drawImage(a.mini.walk[IN_S.chars < (BEATS[B_OF.throne].lines[IN_S.line] || '').length
      && Math.floor(t * 9) % 2 === 0 ? 1 : 0][0], 0, 0);
    ctx.restore();
    // two very large silhouettes either side of him
    for (const s of [-1, 1]) {
      ctx.globalAlpha = 0.9;
      X.blob(ctx, 240 + s * 62, 150, 16, 30, '#160a10');
      X.blob(ctx, 240 + s * 62, 116, 11, 10, '#160a10');
      ctx.globalAlpha = 1;
    }
    // the edge of your own eyelids, opening
    const lid = (1 - wake) * (VH / 2);
    if (lid > 0.5) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, VW, lid);
      ctx.fillRect(0, VH - lid, VW, lid);
    }
    // the watch, being fitted
    if (IN_S.line >= 6) {
      const bz = Math.round(U.rand(-1, 1));
      X.plate(ctx, 40 + bz, VH - 52, 26, 16, '#2a2438', '#453c5c', '#0a0614', 3);
      X.rect(ctx, 44 + bz, VH - 48, 18, 9, '#0d5a78');
      X.rect(ctx, 46 + bz, VH - 46, 14, 5, '#7ef9ff');
    }
  }

  function enterIntro(g) {
    ensureArt();
    IN_S.beat = 0; IN_S.t = 0; IN_S.line = 0; IN_S.chars = 0; IN_S.pop = 0; IN_S.quit = 0;
    IN_S.reel = [0, 0, 0]; IN_S.spin = 3.2; IN_S.chips.length = 0; IN_S.flash = 0;
    IN_S.done = 0;
    g.state = 'intro';
    A.sfx.tone(180, { type: 'square', to: 90, dur: 0.5, vol: 0.1 });
  }

  function nextBeat(g) {
    IN_S.beat++; IN_S.t = 0; IN_S.line = 0; IN_S.chars = 0; IN_S.pop = 0;
    if (IN_S.beat >= BEATS.length) { finishIntro(g); return; }
    // after the first beat you are on your feet in the club, and it is yours
    if (BEATS[IN_S.beat].id === 'universal' && !IN_S.inClub) {
      IN_S.inClub = 1;
      g.save.story = 1;
      g.saveGame();
      g.wipeTo(240, 135, '#1a1230', () => {
        g.state = 'home';
        PD.home.enter(g);
        PD.home.goClub(g, true);
      });
    }
    if (BEATS[IN_S.beat].id === 'number') { IN_S.flash = 1; A.sfx.deny(); spillChips(); }
  }

  function spillChips() {
    for (let i = 0; i < 40; i++) {
      IN_S.chips.push({ x: 240 + U.rand(-40, 40), y: 190, vx: U.rand(-180, 180), vy: U.rand(-220, -60),
        a: U.rand(0, U.TAU), va: U.rand(-8, 8), life: U.rand(1.2, 2.6) });
    }
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
    IN_S.t += dt;
    if (BEATS[IN_S.beat] && BEATS[IN_S.beat].id === 'universal') {
      IN_S.pop = 1;
      updateUniversal(dt, g);
      return;
    }
    if (IN.hit('Escape')) { finishIntro(g); return; }
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
    drawUniversal(ctx, g, t);
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
    const id = BEATS[IN_S.beat] ? BEATS[IN_S.beat].id : 'drop';
    if (id === 'wake') drawFloor(ctx, g, t);
    else if (id === 'universal') { drawUniversal(ctx, g, t); return; }
    else if (id === 'number') drawDebtCard(ctx, g, t);
    else if (id === 'floor') drawFloor(ctx, g, t);
    else if (id === 'drag') drawDrag(ctx, g, t);
    else if (id === 'fist') drawFist(ctx, g, t);
    else if (id === 'throne') drawThrone(ctx, g, t);
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
    enterIntro, updateIntro, drawIntro, enterGamble, B_OF,
    call, update, draw, active, takeCut, drawDebt, DEBT0, S, IN_S, HS, LESSONS,
    leadStep, drawMini, miniFrame, MS, MW, MH, MCX, MBASE,
    artFor: ensureArt, CW, CH, CCX, CBASE
  };
})(window.PD);
