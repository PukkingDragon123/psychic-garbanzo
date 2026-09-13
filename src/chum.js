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
    { id: 'universal', dur: 999, lines: [] },      // interactive: the ten stars
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
    { id: 'drop', dur: 6, lines: ['AND THAT IS HOW YOU CAME TO OWN A MOON.'] }
  ];
  const B_OF = {};
  BEATS.forEach((b, i) => { B_OF[b.id] = i; });

  /* ------------------------------------------------------ THE UNIVERSAL
     A casino floor, seen from the side, with you standing on it.

     The camera opens hard on the marquee, then pulls all the way back to show
     what you have walked into: two hundred machines, a room full of people,
     and one cabinet in the middle of it that is four times your height. You
     do not press a button. You pull a lever, and the room watches.

     Ten worlds in a row takes the lot. You get nine. At nine it asks you
     whether you want to go on or walk away, and it does not matter -- the
     third reel is a skull either way, because that is what the machine is
     for. */
  const AH = PD.arthome;
  const FY = 224;                        // the floor of the hall: feet stand here
  const CBX = 250, CBW = 200;            // the cabinet, in hall coordinates
  const CBTOP = 26;
  const PIVX = 476, PIVY = 209;          // the lever, bolted to its right cheek
  const PSX = 498;                       // and you, standing at it
  const EXITX = -76;                     // the way out, lit, a long way off

  const UNI = {
    n: 0, spin: 0, spinMax: 1, reel: 0, choice: 0, lost: 0, t: 0, shake: 0, flash: 0,
    arrive: 0, lever: 0, pull: 0, hype: 0, hop: 0, rig: null, face: [0, 0, 0],
    kick: 0, glare: 0, exitHot: 0
  };
  const CAM = { x: 350, y: 52, z: 2.1 };
  const STOPF = [0.42, 0.68, 1];         // the three reels do not stop together

  /* world -> screen, so the update pass can hit-test things that live in the
     hall rather than on the glass */
  function camPt(wx, wy) {
    return { x: VW / 2 + (wx - CAM.x) * CAM.z, y: VH / 2 + (wy - CAM.y) * CAM.z };
  }

  /* ------------------------------------------------------------- the room
     Thirty-odd people, in three ranks. The back rank is small and far and
     mostly silhouette; the middle rank is the one you read faces on; the
     front rank is huge and cropped by the bottom of the frame, so you are
     standing in the crowd rather than looking at it. */
  const CROWD = [];
  (function buildCrowd() {
    const ROWS = [
      { y: 120, s: 0.46, n: 28, x0: -190, x1: 900, gap: null },      // the balcony
      { y: 200, s: 0.54, n: 21, x0: -150, x1: 870, gap: null },
      { y: 240, s: 0.90, n: 18, x0: -130, x1: 860, gap: [222, 534] },
      { y: 302, s: 1.55, n: 14, x0: -100, x1: 850, gap: [252, 604] } // right under your nose
    ];
    ROWS.forEach((R, ri) => {
      for (let i = 0; i < R.n; i++) {
        let x = R.x0 + (R.x1 - R.x0) * ((i + 0.5) / R.n) + (U.hash2(ri * 31 + i, 5) - 0.5) * 30;
        if (R.gap && x > R.gap[0] && x < R.gap[1]) {
          const mid = (R.gap[0] + R.gap[1]) / 2;
          x = x < mid ? R.gap[0] - 14 - U.hash2(i, 9) * 40 : R.gap[1] + 14 + U.hash2(i, 9) * 40;
        }
        CROWD.push({
          x0: x, x: x, y: R.y, row: ri,
          clump: (U.hash2(ri * 3 + i, 41) - 0.5) * 16,
          s: R.s * (0.9 + U.hash2(ri * 7 + i, 13) * 0.22),
          k: Math.floor(U.hash2(ri * 17 + i, 3) * 14),
          ph: U.hash2(i * 5 + ri, 19) * U.TAU,
          face: x > 350 ? -1 : 1,
          drink: U.hash2(i * 11 + ri, 27) > 0.55 ? Math.floor(U.hash2(i, 31) * 4) : -1,
          jt: 99, jd: 0.5, jh: 0, shout: 0, word: 0, drift: 0
        });
        CROWD[CROWD.length - 1].x0 += CROWD[CROWD.length - 1].clump;
        CROWD[CROWD.length - 1].x = CROWD[CROWD.length - 1].x0;
      }
    });
  })();
  const WORDS = ['GO ON', 'TEN', 'AGAIN', 'YES', 'WOO', 'ONE MORE', 'PULL IT', 'HA'];

  /* A cheer runs OUT from the machine rather than happening everywhere at
     once: everyone gets a negative head start proportional to how far away
     they are, so the jump ripples across the room. */
  function cheerWave(power, spread) {
    const taken = [];
    for (const c of CROWD) if (c.shout > 0) taken.push(c.x);
    for (const c of CROWD) {
      const d = Math.abs(c.x - 350) / 430;
      c.jt = -(d * (spread === undefined ? 0.34 : spread));
      c.jd = 0.40 + U.hash2(c.x | 0, 3) * 0.22;
      c.jh = (6 + power * 18) * (0.65 + U.hash2(c.x | 0, 7) * 0.7) * (c.row === 0 ? 0.7 : 1);
      if (c.row >= 2 && U.hash2(c.x | 0, 13) < 0.16 + power * 0.34) {
        let clear = true;
        for (const q of taken) if (Math.abs(q - c.x) < 46) { clear = false; break; }
        if (clear) {
          c.shout = 1.0 + U.hash2(c.x | 0, 11) * 0.9;
          c.word = Math.floor(U.hash2((c.x | 0) + UNI.n * 7, 17) * WORDS.length);
          taken.push(c.x);
        }
      }
    }
  }
  function updateCrowd(dt, t) {
    for (const c of CROWD) {
      c.jt += dt;
      c.shout = Math.max(0, c.shout - dt);
      if (UNI.lost) {
        // the room loses interest in you in about four seconds
        c.drift = Math.min(1, c.drift + dt * (0.16 + U.hash2(c.x | 0, 5) * 0.16));
        c.x = c.x0 + (c.x0 < 350 ? -1 : 1) * c.drift * (60 + U.hash2(c.x | 0, 9) * 90);
      } else if (UNI.hype > 0.2) {
        // the hotter it gets the less any of them stay on the ground
        const wait = c.jd + (UNI.hype > 0.6 ? 0.05 : 1.2 + U.hash2(c.x | 0, 23) * 2.4);
        if (c.jt > wait && U.chance(dt * (2 + UNI.hype * 9))) {
          c.jt = 0; c.jd = 0.36 + U.hash2(c.x | 0, 29) * 0.18;
          c.jh = (4 + UNI.hype * 15) * (c.row === 0 ? 0.6 : 1);
        }
      }
    }
  }

  /* --------------------------------------------------------- little things
     Confetti, coins and sparks, in hall coordinates so they sit inside the
     camera move with everything else. */
  const BITS = [];
  function bits(x, y, n, cols, power, kind) {
    for (let i = 0; i < n; i++) {
      const a = U.rand(-Math.PI, 0), sp = U.rand(power * 0.35, power);
      BITS.push({
        x, y, vx: Math.cos(a) * sp + U.rand(-14, 14), vy: Math.sin(a) * sp,
        life: 1.1 + Math.random() * 1.5, t: 0, spin: U.rand(-9, 9), ang: Math.random() * 6.28,
        col: cols[(Math.random() * cols.length) | 0], kind: kind || 0,
        w: 2 + ((Math.random() * 2) | 0)
      });
    }
  }
  function updateBits(dt) {
    for (let i = BITS.length - 1; i >= 0; i--) {
      const b = BITS[i];
      b.t += dt;
      b.vy += (b.kind === 2 ? 90 : 200) * dt;
      b.vx *= 1 - dt * (b.kind === 2 ? 1.4 : 0.5);
      b.x += b.vx * dt; b.y += b.vy * dt; b.ang += b.spin * dt;
      const rest = FY + 4 + (b.x % 7);
      if (b.y > rest && b.kind !== 2) { b.y = rest; b.vy *= -0.26; b.vx *= 0.55; b.spin *= 0.5; }
      if (b.t > b.life) BITS.splice(i, 1);
    }
    if (BITS.length > 220) BITS.splice(0, BITS.length - 220);
  }
  function drawBits(ctx) {
    for (const b of BITS) {
      const k = 1 - b.t / b.life;
      ctx.globalAlpha = Math.min(1, k * 2.2);
      if (b.kind === 1) {                       // a coin, turning edge-on
        const w = Math.max(1, Math.abs(Math.cos(b.ang)) * 5);
        X.blob(ctx, b.x, b.y, w, 2.5, b.col);
        X.blob(ctx, b.x - w * 0.3, b.y - 0.6, w * 0.4, 1, '#fff3b0');
      } else if (b.kind === 2) {                // smoke / dust
        ctx.globalAlpha *= 0.3;
        X.blob(ctx, b.x, b.y, 2 + b.t * 3, 1.5 + b.t * 2.4, b.col);
      } else {                                  // confetti, a flat scrap turning
        const h = Math.max(1, Math.abs(Math.sin(b.ang)) * 4);
        X.rect(ctx, b.x - b.w / 2, b.y - h / 2, b.w, h, b.col);
      }
      ctx.globalAlpha = 1;
    }
  }

  function enterGamble(g) {
    IN_S.beat = B_OF.universal; IN_S.t = 0; IN_S.line = 0; IN_S.chars = 0; IN_S.pop = 1;
    UNI.n = 0; UNI.spin = 0; UNI.reel = 0; UNI.choice = 0; UNI.lost = 0; UNI.t = 0;
    UNI.shake = 0; UNI.flash = 0; UNI.arrive = 0; UNI.lever = 0; UNI.pull = 0;
    UNI.hype = 0; UNI.hop = 0; UNI.kick = 0; UNI.glare = 0; UNI.face = [0, 2, 4];
    UNI.rig = PD.rig.make();
    CAM.x = 350; CAM.y = 46; CAM.z = 2.3;
    BITS.length = 0;
    for (const c of CROWD) { c.x = c.x0; c.drift = 0; c.jt = 99; c.shout = 0; }
    g.state = 'intro';
    A.sfx.tone(160, { type: 'square', to: 90, dur: 0.6, vol: 0.1 });
  }

  function updateUniversal(dt, g) {
    UNI.t += dt; UNI.arrive += dt;
    UNI.shake = Math.max(0, UNI.shake - dt * 2);
    UNI.flash = Math.max(0, UNI.flash - dt * 1.6);
    UNI.kick = Math.max(0, UNI.kick - dt * 3);
    UNI.glare = Math.max(0, UNI.glare - dt * 1.2);
    UNI.hop = Math.max(0, UNI.hop - dt);
    UNI.hype = U.clamp(UNI.hype - dt * (UNI.lost ? 1.4 : 0.34),
      UNI.lost ? 0 : (UNI.choice ? 1 : UNI.n / 22), 1);
    updateCrowd(dt, UNI.t);
    updateBits(dt);

    // ------------------------------------------------------------- the lever
    if (UNI.pull > 0) {
      UNI.pull -= dt;
      const k = U.clamp(1 - Math.max(0, UNI.pull) / 0.62, 0, 1);
      // down hard, held at the bottom, then springs back past the top and settles
      if (k < 0.2) UNI.lever = U.smoothstep(0, 1, k / 0.2);
      else if (k < 0.46) UNI.lever = 1;
      else {
        const b = (k - 0.46) / 0.54;
        UNI.lever = Math.max(0, Math.cos(b * 4.2) * (1 - b) * 0.85);
      }
    } else UNI.lever = Math.max(0, UNI.lever - dt * 3);

    // -------------------------------------------------------------- the rig
    if (UNI.rig) PD.rig.step(UNI.rig, { dt: dt, vx: 0, vy: 0, ground: true, drilling: false });

    // ------------------------------------------------------------ the camera
    let tx = 388, ty = 142, tz = 1.02, rate = 1.7;
    if (UNI.arrive < 1.5) { tx = 350; ty = 48; tz = 2.3; rate = 0.7; }
    else if (UNI.arrive < 4.4) { tx = 344; ty = 150; tz = 0.58; rate = 1.15; }  // the reveal
    else if (UNI.lost) { tx = 402; ty = 146; tz = 1.0; rate = 0.8; }
    else if (UNI.choice) { tx = 348; ty = 152; tz = 0.56; rate = 2.0; }
    else if (UNI.spin > 0) { tx = 352; ty = 124; tz = 1.22; rate = 2.4; }
    const e = Math.min(1, dt * rate * 1.6);
    CAM.x += (tx + Math.sin(UNI.t * 0.31) * 3 - CAM.x) * e;
    CAM.y += (ty + Math.sin(UNI.t * 0.44 + 1) * 2 - CAM.y) * e;
    CAM.z += (tz * (1 + UNI.kick * 0.05) - CAM.z) * e;

    const IN = PD.input, m = IN.mouse;
    const ready = UNI.arrive > 4.0;
    const key = IN.hit('KeyE') || IN.hit('Space') || IN.hit('Enter');
    const tap = m.inside && m.leftPressed;

    // the EXIT sign is a real thing standing in the room, not a button on the
    // glass: you get out by walking at the door
    const ep = camPt(EXITX, 150);
    const hotExit = m.inside && Math.abs(m.x - ep.x) < 34 * CAM.z + 10 && Math.abs(m.y - ep.y) < 30 * CAM.z + 10;
    UNI.exitHot = hotExit ? 1 : 0;

    if (UNI.spin > 0) {
      const was = UNI.spin;
      UNI.spin -= dt;
      UNI.reel = (UNI.reel + dt * 34) % 5;
      // each reel lands with its own thump
      for (let r = 0; r < 3; r++) {
        const at = UNI.spinMax * (1 - STOPF[r]);
        if (was > at && UNI.spin <= at) {
          UNI.shake = Math.max(UNI.shake, r === 2 ? 0.8 : 0.34);
          UNI.kick = 1;
          A.sfx.tone(180 - r * 20, { type: 'square', to: 70, dur: 0.11, vol: 0.09 });
          A.noise({ from: 900, to: 200, dur: 0.09, vol: 0.07 });
          if (r < 2 && UNI.n >= 9) { cheerWave(0.5, 0.22); UNI.hype = 1; }
          if (r === 1) {
            // two down, one to go: the room holds its breath and so does the sound
            A.sfx.tone(130, { type: 'sine', to: 190, dur: 0.9, vol: 0.07 });
            A.sfx.tone(520, { type: 'triangle', to: 700, dur: 0.9, vol: 0.03, delay: 0.1 });
          }
        }
      }
      if (UNI.spin <= 0) {
        if (UNI.n < 9) {
          UNI.n++;
          A.sfx.tone(460 + UNI.n * 62, { type: 'square', to: 880 + UNI.n * 70, dur: 0.14, vol: 0.08 });
          A.sfx.sell();
          UNI.hype = Math.min(1, 0.45 + UNI.n * 0.07);
          UNI.hop = 0.6; UNI.glare = 1;
          cheerWave(0.45 + UNI.n * 0.06);
          // the room throws whatever it is holding
          for (let i = 0; i < 4 + UNI.n; i++) {
            const c = CROWD[(Math.random() * CROWD.length) | 0];
            if (c.row < 2) continue;
            bits(c.x, c.y - 24, 1, ['#ffd34d', '#8affa0', '#ff8ad8', '#7ec8ff', '#f4f0ff'], 240, 0);
          }
          bits(350, CBTOP + 14, 16 + UNI.n * 3, ['#ffd34d', '#ff5fa8', '#5fe8d8', '#ffffff'], 200, 0);
          bits(350, 118, 8 + UNI.n, ['#ffd34d', '#ffb03d'], 170, 1);
          if (UNI.n === 9) {
            UNI.choice = 1; UNI.hype = 1;
            cheerWave(1, 0.5);
            A.sfx.tone(200, { type: 'sine', to: 140, dur: 0.9, vol: 0.09 });
          }
        } else {
          UNI.lost = 1; UNI.shake = 1; UNI.flash = 1; UNI.hype = 0;
          A.sfx.deny();
          A.sfx.tone(220, { type: 'square', to: 54, dur: 1.2, vol: 0.13 });
          A.sfx.boom(0.5);
          bits(398, 118, 26, ['#4a3a56', '#2a1c38', '#6a5a78'], 120, 2);
          for (const c of CROWD) { c.jt = 99; c.shout = 0; }
        }
      }
      return;
    }
    if (UNI.lost) {
      if (UNI.t > 3.0 && (key || tap)) nextBeat(g);
      return;
    }
    if (!ready) { if (key || tap) UNI.arrive = Math.max(UNI.arrive, 4.0); return; }
    if (UNI.choice) {
      if ((hotExit && m.leftPressed) || IN.hit('Escape')) {
        UNI.choice = 0; IN_S.quit = 1; startSpin(1.7);
        return;
      }
      if (key || tap) { UNI.choice = 0; startSpin(1.7); }
      return;
    }
    if (key || tap) startSpin(UNI.n < 8 ? 0.72 : 1.2);
  }

  function startSpin(len) {
    UNI.spin = len; UNI.spinMax = len; UNI.pull = 0.62;
    const k = Math.floor(U.hash2(UNI.n * 13 + 3, 7) * 5);
    UNI.face = [k, k, UNI.n < 9 ? k : 3];
    A.sfx.tone(300, { type: 'square', to: 120, dur: 0.18, vol: 0.08 });
    A.noise({ from: 400, to: 1800, dur: 0.5, vol: 0.05 });
    bits(PIVX + 14, PIVY - 6, 4, ['#8e86a8'], 60, 2);
  }

  /* ---------------------------------------------------------- the symbols */
  const WORLDS = [
    { c: '#c9744a', d: '#7a3d22', l: '#ffb07a', ring: 0, spot: 1 },   // a rock
    { c: '#4a8fd6', d: '#23507f', l: '#a8daff', ring: 0, spot: 2 },   // an ocean
    { c: '#d6b44a', d: '#8a6a1e', l: '#ffe9a8', ring: 1, spot: 0 },   // a ringed one
    { c: '#7a4ad6', d: '#3f2280', l: '#c9a8ff', ring: 0, spot: 3 },   // a void
    { c: '#4ad69a', d: '#1e7a58', l: '#a8ffd8', ring: 1, spot: 1 }    // a living one
  ];
  function reelWorld(ctx, x, y, r, k, t, blur) {
    const w = WORLDS[((k % 5) + 5) % 5];
    if (w.ring) {
      ctx.globalAlpha = blur ? 0.4 : 0.75;
      X.blob(ctx, x, y + Math.round(r * 0.25), Math.round(r * 1.65), Math.max(1, Math.round(r * 0.26)), w.d);
      ctx.globalAlpha = 1;
    }
    X.blob(ctx, x, y, r + 1, r + 1, '#0a0614');
    X.blob(ctx, x, y, r, r, w.c);
    X.blob(ctx, x - Math.round(r * 0.32), y - Math.round(r * 0.32), Math.round(r * 0.55), Math.round(r * 0.5), w.l);
    for (let i = 0; i < w.spot; i++) {
      const a = i * 2.1 + t * 0.4;
      X.blob(ctx, x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.4,
        Math.max(1, Math.round(r * 0.22)), Math.max(1, Math.round(r * 0.18)), w.d);
    }
    X.blob(ctx, x + Math.round(r * 0.4), y + Math.round(r * 0.4), Math.round(r * 0.5), Math.round(r * 0.45), 'rgba(10,6,20,0.35)');
    if (w.ring) {
      X.blob(ctx, x, y + Math.round(r * 0.25), Math.round(r * 1.65), Math.max(1, Math.round(r * 0.2)), w.l);
      X.blob(ctx, x, y + Math.round(r * 0.25), Math.round(r * 1.1), Math.max(1, Math.round(r * 0.14)), '#0a0614');
    }
  }
  function reelSkull(ctx, x, y, r, t) {
    X.blob(ctx, x, y, r + 2, r + 2, '#1a0a12');
    X.blob(ctx, x, y, r, r, '#2a1018');
    PD.glyph.draw(ctx, 'skull', x - 14, y - 14, '#c22a4a', '#ff8a9a', 2);
    ctx.globalAlpha = 0.35 + Math.abs(Math.sin(t * 5)) * 0.3;
    X.blob(ctx, x, y, r * 1.4, r * 1.4, 'rgba(200,40,70,0.25)');
    ctx.globalAlpha = 1;
  }

  const WARP = [];
  for (let i = 0; i < 70; i++) WARP.push({ a: U.hash2(i, 3) * U.TAU, r: U.hash2(i, 7), s: 0.4 + U.hash2(i, 11) });

  /* ------------------------------------------------------------- the hall */
  const HUES = ['#ff5fa8', '#5fe8d8', '#ffd34d', '#9a6aff', '#ff8a4d', '#6affa0'];
  const BANKS = [];
  (function buildBanks() {
    // a back row that runs the whole width, and two side banks either side of
    // the big one, so the room reads as a floor of machines
    for (let i = 0; i < 22; i++) BANKS.push({ x: -150 + i * 46, y: 198, s: 0.62, i: i });
    for (let i = 0; i < 5; i++) BANKS.push({ x: -26 + i * 54, y: 224, s: 1, i: i + 3 });
    for (let i = 0; i < 5; i++) BANKS.push({ x: 540 + i * 54, y: 224, s: 1, i: i + 7 });
  })();

  function slotBox(ctx, x, y, s, i, t) {
    // one ordinary machine: base, body, a lit screen with something turning in
    // it, a topper light and a little lever of its own
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const hue = HUES[i % HUES.length], W = 34, H = 62;
    X.plate(ctx, -W / 2 - 2, -12, W + 4, 12, '#1b0f2c', '#3a2352', '#0a0614', 2);   // the base
    X.plate(ctx, -W / 2, -H, W, H - 10, '#2a1442', hue, '#120722', 3);
    X.plate(ctx, -W / 2 + 3, -H + 22, W - 6, 20, '#0d0620', '#4a2a70', '#060310', 2);
    // the little screen
    const spin = (Math.floor(t * 2.4 + i * 1.7) % 7) < 2;
    for (let r = 0; r < 3; r++) {
      const cx = -W / 2 + 8 + r * 9;
      const k = spin ? (Math.floor(t * 22 + r * 3 + i) % 5) : ((i + r) % 5);
      ctx.globalAlpha = spin ? 0.6 : 1;
      reelWorld(ctx, cx, -H + 32, 3.4, k, t, spin ? 1 : 0);
      ctx.globalAlpha = 1;
    }
    // the topper, pulsing out of step with its neighbours
    const on = Math.sin(t * 3 + i * 1.3) > -0.2;
    X.plate(ctx, -W / 2 + 2, -H - 9, W - 4, 9, on ? '#3a2208' : '#170c22', on ? hue : '#33224a', '#0a0614', 2);
    if (on) {
      F.draw(ctx, ['LUX', 'NOVA', 'HOT', 'BIG', 'ZAP', 'GEM'][i % 6], 0, -H - 7, '#fff3b0', { center: true, shadow: false });
      ctx.globalAlpha = 0.22; X.blob(ctx, 0, -H - 5, 22, 12, hue); ctx.globalAlpha = 1;
    }
    F.draw(ctx, '888', 0, -H + 7, 'rgba(255,211,77,0.75)', { center: true, shadow: false });
    X.rect(ctx, W / 2 - 1, -H + 26, 3, 3, '#8e86a8');                                // its lever
    X.rect(ctx, W / 2 + 1, -H + 20, 2, 8, '#6a5a9c');
    X.blob(ctx, W / 2 + 2, -H + 19, 3, 3, '#c22a4a');
    ctx.globalAlpha = 0.35; X.blob(ctx, 0, -1, W * 0.6, 4, '#0a0614'); ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* The carpet, the motif stamped into it and the velvet rope across the front
     are all static, so they are drawn once into their own canvas and blitted.
     Live, they were two and a half thousand fill calls a frame. */
  let carpetCv = null;
  function buildCarpet() {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 200;
    const q = c.getContext('2d');
    q.imageSmoothingEnabled = false;
    q.translate(200, -FY);                       // so world coordinates land right
    X.rect(q, -200, FY, 1200, 200, '#3a0e26');
    for (let y = FY; y < FY + 170; y += 7) {
      const k = (y - FY) / 170;
      X.rect(q, -200, y, 1200, 7, k > 0.45 ? '#4a1230' : '#3d0f28');
      for (let x = -200 + ((y * 11) % 26); x < 1000; x += 26) {
        X.rect(q, x, y + 2, 9 + k * 4, 3, k > 0.45 ? '#5c1a3c' : '#47122e');
        X.rect(q, x + 3, y + 3, 3, 1, '#6e2148');
      }
    }
    // a motif stamped into it, growing with the perspective
    for (let row = 0; row < 5; row++) {
      const y = FY + 16 + row * 30, sc = 1 + row * 0.34;
      for (let x = -200 + ((row % 2) * 46); x < 1000; x += 92) {
        q.globalAlpha = 0.5;
        X.poly(q, [[x, y - 6 * sc], [x + 9 * sc, y], [x, y + 6 * sc], [x - 9 * sc, y]], '#5c1a3c');
        X.poly(q, [[x, y - 3 * sc], [x + 4 * sc, y], [x, y + 3 * sc], [x - 4 * sc, y]], '#7a2450');
        q.globalAlpha = 1;
      }
    }
    X.rect(q, -200, FY, 1200, 2, '#2a0a1c');
    X.rect(q, -200, FY + 2, 1200, 1, '#57163a');
    // the room's light lying on the carpet
    q.globalAlpha = 0.1;
    X.blob(q, 350, FY + 22, 200, 26, '#ff5fa8');
    q.globalAlpha = 1;
    // velvet rope: they are allowed to watch and no closer
    for (let i = -4; i <= 8; i++) {
      const px = 160 + i * 60;
      if (i < 8) {
        X.curve(q, px, FY + 30, px + 30, FY + 41, px + 60, FY + 30, '#5e0f2c', 5, 10);
        X.curve(q, px, FY + 29, px + 30, FY + 40, px + 60, FY + 29, '#a8265a', 2, 10);
      }
      X.blob(q, px, FY + 46, 7, 2.5, '#0a0614');
      X.rect(q, px - 5, FY + 43, 11, 3, '#6a5220');
      X.rect(q, px - 2, FY + 28, 4, 16, '#8a6a2a');
      X.rect(q, px - 2, FY + 28, 1, 16, '#ffd34d');
      X.blob(q, px, FY + 27, 3.5, 3.5, '#ffd34d');
      X.blob(q, px - 1, FY + 26, 1.2, 1, '#fff3b0');
    }
    return c;
  }

  function hallRoom(ctx, t) {
    // ------------------------------------------------------------ the shell
    ctx.fillStyle = '#150826'; ctx.fillRect(-200, -160, 1200, 400);
    const grd = ctx.createLinearGradient(0, -140, 0, FY);
    grd.addColorStop(0, '#0b0418'); grd.addColorStop(0.6, '#25103c'); grd.addColorStop(1, '#3a1550');
    ctx.fillStyle = grd; ctx.fillRect(-200, -160, 1200, FY + 160);
    // a ceiling of coffers, going back
    for (let i = 0; i < 26; i++) {
      const x = -180 + i * 42;
      X.rect(ctx, x, -60, 38, 6, '#2a1040');
      X.rect(ctx, x + 4, -54, 30, 3, '#3c1a58');
    }
    // neon arches on the back wall, three deep
    for (let a = 0; a < 3; a++) {
      const r = 250 + a * 62, alpha = 0.72 - a * 0.16;
      ctx.globalAlpha = alpha;
      for (let i = 0; i <= 22; i++) {
        const ang = Math.PI + i * (Math.PI / 22);
        const ax = 350 + Math.cos(ang) * r, ay = 208 + Math.sin(ang) * (r * 0.62);
        const on = (Math.floor(t * 5 - a * 2) + i) % 5 !== 0;
        X.blob(ctx, ax, ay, 3, 3, on ? HUES[(a * 2 + i) % HUES.length] : '#2a1440');
      }
      ctx.globalAlpha = 1;
    }
    // the house banner, hung off the ceiling over the big machine
    const bw = Math.sin(t * 0.8) * 1.5;
    X.rect(ctx, 300, -58, 1, 16, '#5a4a78'); X.rect(ctx, 400, -58, 1, 16, '#5a4a78');
    X.plate(ctx, 246, -44 + bw, 208, 30, '#3a0e26', '#ff5fa8', '#180510', 5);
    F.draw(ctx, 'THE GALAXY ROOM', 350, -37 + bw, '#ffd6f0', { center: true, scale: 2, shadow: '#180510' });
    F.draw(ctx, 'NO CREDIT  NO REFUNDS  NO PITY', 350, -22 + bw, '#ff8ad8', { center: true, shadow: '#180510' });
    // chandeliers
    for (let i = 0; i < 5; i++) {
      const cx = -60 + i * 200, cy = -40 + Math.sin(t * 0.7 + i) * 1.5;
      X.rect(ctx, cx, -60, 1, 22, '#5a4a78');
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * U.TAU + t * 0.25 + i;
        X.blob(ctx, cx + Math.cos(a) * 13, cy + 2 + Math.sin(a) * 5, 2.5, 2.5, '#ffe9a8');
      }
      X.blob(ctx, cx, cy + 2, 6, 4, '#fff3b0');
      ctx.globalAlpha = 0.13; X.blob(ctx, cx, cy + 8, 30, 18, '#ffd34d'); ctx.globalAlpha = 1;
    }
    // the mezzanine the cheap seats are standing on
    X.rect(ctx, -220, 120, 1240, 16, '#180a28');
    X.rect(ctx, -220, 120, 1240, 1, '#3c1a58');
    for (let i = 0; i < 31; i++) X.rect(ctx, -216 + i * 40, 136, 6, 10, '#120720');
    // a far wall of signage: the rest of the casino, out of focus
    for (let i = 0; i < 16; i++) {
      const x = -170 + i * 64, y = 24 + (i % 3) * 16;
      const on = (Math.floor(t * 3.5) + i) % 4 !== 0;
      ctx.globalAlpha = 0.42;
      X.rect(ctx, x, y, 38, 7, on ? HUES[i % HUES.length] : '#241338');
      X.rect(ctx, x + 2, y + 2, 34, 3, on ? '#ffffff' : '#160a26');
      ctx.globalAlpha = 1;
    }
    // sweeping spotlights out of the ceiling
    for (let i = 0; i < 4; i++) {
      const bx = 40 + i * 200, a = Math.sin(t * 0.5 + i * 1.9) * 0.5;
      const fx = bx + Math.sin(a) * 210, sp = 26;
      ctx.globalAlpha = 0.075;
      X.poly(ctx, [[bx - 5, -52], [bx + 5, -52], [fx + sp, FY], [fx - sp, FY]], HUES[(i * 2) % HUES.length]);
      ctx.globalAlpha = 1;
      X.blob(ctx, bx, -52, 5, 3, '#ffe9a8');
    }
    // ------------------------------------------------------------ the floor
    // baked once: it is two and a half thousand rectangles and none of them move
    if (!carpetCv) carpetCv = buildCarpet();
    ctx.drawImage(carpetCv, -200, FY);

  }

  /* The rail of the mezzanine, drawn over the people leaning on it. */
  function balconyRail(ctx) {
    for (let i = 0; i < 62; i++) X.rect(ctx, -212 + i * 20, 110, 2, 10, '#3c1a58');
    X.rect(ctx, -220, 108, 1240, 3, '#4a2270');
    X.rect(ctx, -220, 108, 1240, 1, '#8a5ac0');
    X.rect(ctx, -220, 118, 1240, 3, '#2a1040');
  }

  /* The way out. It is lit, it is real, and at nine you can walk at it. */
  function exitSign(ctx, t) {
    const hot = UNI.exitHot && UNI.choice;
    X.plate(ctx, EXITX - 34, 120, 68, 104, '#1a0c2a', '#3a2252', '#0a0614', 4);
    X.plate(ctx, EXITX - 26, 136, 52, 88, '#080410', '#2a1840', '#050208', 3);
    ctx.globalAlpha = 0.5 + Math.abs(Math.sin(t * 1.4)) * 0.2;
    X.blob(ctx, EXITX, 200, 24, 26, '#2a4a6a');                      // the street outside
    ctx.globalAlpha = 1;
    const on = hot || Math.sin(t * 2.2) > -0.6;
    X.plate(ctx, EXITX - 30, 106, 60, 16, on ? '#0f3a22' : '#0a1c14', on ? '#5fff9a' : '#1d5a38', '#040c08', 3);
    F.draw(ctx, 'EXIT', EXITX, 110, on ? '#c4ffd8' : '#2a6a46', { center: true, scale: 1, shadow: '#041008' });
    if (hot) {
      ctx.globalAlpha = 0.2; X.blob(ctx, EXITX, 170, 46, 60, '#5fff9a'); ctx.globalAlpha = 1;
      F.draw(ctx, 'WALK AWAY', EXITX, 232, '#c4ffd8', { center: true, scale: 1, shadow: '#041008' });
    }
  }

  /* ---------------------------------------------------------- the cabinet */
  function drawCabinet(ctx, g, t) {
    const CX = CBX + CBW / 2;
    const hot = UNI.n >= 9;
    // a shadow and a little dais
    ctx.globalAlpha = 0.4; X.blob(ctx, CX, FY + 6, 128, 9, '#0a0614'); ctx.globalAlpha = 1;
    X.plate(ctx, CBX - 26, FY - 12, CBW + 52, 18, '#2a1040', '#5e2a86', '#120722', 4);
    X.plate(ctx, CBX - 14, FY - 22, CBW + 28, 12, '#351550', '#7a3aae', '#170a2a', 3);
    // the body
    X.plate(ctx, CBX, CBTOP + 10, CBW, FY - CBTOP - 30, '#2a1442', '#5e2a86', '#120722', 8);
    X.plate(ctx, CBX + 8, CBTOP + 18, CBW - 16, FY - CBTOP - 46, '#1c0c2e', '#4a2270', '#0a0414', 6);
    // the crown: an arch of lamps chasing round the top
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI + i * (Math.PI / 18);
      const ax = CX + Math.cos(a) * (CBW / 2 + 10), ay = CBTOP + 58 + Math.sin(a) * 44;
      const on = (Math.floor(t * (hot ? 14 : 7)) + i) % 4 !== 0;
      X.blob(ctx, ax, ay, 4, 4, on ? '#ffd34d' : '#4a3a10');
      X.blob(ctx, ax, ay, 1.6, 1.6, on ? '#fff3b0' : '#6a5a2a');
      if (on) { ctx.globalAlpha = 0.16; X.blob(ctx, ax, ay, 9, 9, '#ffd34d'); ctx.globalAlpha = 1; }
    }
    // the marquee
    const lit = UNI.arrive < 4.4 ? true : (hot ? Math.sin(t * 14) > -0.2 : Math.sin(t * 5) > -0.35);
    X.plate(ctx, CBX + 2, CBTOP + 2, CBW - 4, 36, '#170a28', lit ? '#ffd34d' : '#5a4418', '#080312', 4);
    X.rect(ctx, CBX + 6, CBTOP + 6, CBW - 12, 1, lit ? '#3a2a08' : '#1a1008');
    F.draw(ctx, 'THE UNIVERSAL', CX, CBTOP + 9, lit ? '#ffd34d' : '#6a5a1a',
      { center: true, scale: 2, shadow: '#3a0c30' });
    F.draw(ctx, 'TEN WORLDS TAKES THE LOT', CX, CBTOP + 26, lit ? '#ff5fa8' : '#4a1c3a',
      { center: true, shadow: '#1a0614' });
    if (UNI.glare > 0) {
      ctx.globalAlpha = UNI.glare * 0.3;
      X.blob(ctx, CX, CBTOP + 20, CBW * 0.7, 30, '#ffd34d');
      ctx.globalAlpha = 1;
    }

    // ------------------------------------------------- the window, and the void
    const WX = CBX + 22, WY = 82, WW = CBW - 44, WH2 = 62;
    X.plate(ctx, WX - 6, WY - 6, WW + 12, WH2 + 12, '#3a1a58', '#6e3a9e', '#150828', 5);
    ctx.save();
    ctx.beginPath(); ctx.rect(WX, WY, WW, WH2); ctx.clip();
    ctx.fillStyle = '#0a0418'; ctx.fillRect(WX, WY, WW, WH2);
    ctx.globalAlpha = 0.2;
    X.blob(ctx, WX + 50, WY + 26, 58, 22, '#6a2ab0');
    X.blob(ctx, WX + 116, WY + 38, 46, 18, '#2a5fb0');
    ctx.globalAlpha = 1;
    for (const w of WARP) {
      const sp = UNI.spin > 0 ? 5 : 0.6;
      const f = ((w.r + t * w.s * sp * 0.2) % 1);
      const px = WX + WW / 2 + Math.cos(w.a) * f * WW * 0.72;
      const py = WY + WH2 / 2 + Math.sin(w.a) * f * WH2 * 0.72;
      const ln = UNI.spin > 0 ? 1 + f * 8 : 1;
      ctx.globalAlpha = 0.25 + f * 0.6;
      X.rect(ctx, px, py, Math.round(ln), 1, f > 0.7 ? '#ffffff' : '#a8c8ff');
      ctx.globalAlpha = 1;
    }
    // three bands, each stopping in its own time
    const prog = UNI.spin > 0 ? 1 - UNI.spin / UNI.spinMax : 1;
    for (let r = 0; r < 3; r++) {
      const rx = WX + 4 + r * ((WW - 8) / 3), rw = (WW - 8) / 3 - 3;
      const cx = rx + rw / 2, cy = WY + WH2 / 2;
      ctx.globalAlpha = 0.3; X.rect(ctx, rx, WY, rw, WH2, '#160a26'); ctx.globalAlpha = 1;
      const spinning = UNI.spin > 0 && prog < STOPF[r];
      if (spinning) {
        // six worlds smeared through the window at once, so it reads as speed
        const roll = (UNI.reel * 2.6 + r * 2.1);
        const off = (roll % 1) * 22;
        for (let k = -3; k <= 3; k++) {
          ctx.globalAlpha = 0.3 - Math.abs(k) * 0.05;
          reelWorld(ctx, cx, cy + k * 22 + off, 11, Math.floor(roll) + k, t, 1);
          ctx.globalAlpha = 1;
        }
        // horizontal streaks, and a wash over the lot
        for (let sy = WY + 2; sy < WY + WH2; sy += 4) {
          ctx.globalAlpha = 0.1 + ((sy + roll * 40) % 12 < 4 ? 0.14 : 0);
          X.rect(ctx, rx + 2, sy + ((roll * 30) % 4), rw - 4, 1, '#e8d8ff');
          ctx.globalAlpha = 1;
        }
        ctx.globalAlpha = 0.14;
        X.rect(ctx, rx, WY, rw, WH2, '#c9a8ff');
        ctx.globalAlpha = 1;
      } else {
        // a settle bounce for the first tenth of a second after it lands
        // a settle bounce for a fifth of a second after this reel lands
        const at = UNI.spinMax * (1 - STOPF[r]);
        const set = UNI.spin > 0 ? Math.max(0, 1 - (at - UNI.spin) / 0.2) : 0;
        const bY = cy + Math.sin(set * 9) * set * 7;
        if (UNI.face[r] === 3 && UNI.lost) reelSkull(ctx, cx, bY, 15, t);
        else reelWorld(ctx, cx, bY, 15, UNI.face[r], t, 0);
        if (!UNI.lost && UNI.n > 0) {
          ctx.globalAlpha = 0.2 + Math.abs(Math.sin(t * 3 + r)) * 0.16;
          X.blob(ctx, cx, bY, 24, 24, 'rgba(255,211,77,0.35)');
          ctx.globalAlpha = 1;
        }
      }
      X.rect(ctx, rx - 2, WY, 1, WH2, '#6e3a9e');
      X.rect(ctx, rx + rw + 1, WY, 1, WH2, '#6e3a9e');
      // the last reel left turning gets a frame round it that will not keep still
      if (r === 2 && spinning && prog >= STOPF[1]) {
        const pu = 0.4 + Math.abs(Math.sin(t * 9)) * 0.6;
        ctx.globalAlpha = pu;
        X.rect(ctx, rx - 2, WY, rw + 4, 2, '#ffd34d');
        X.rect(ctx, rx - 2, WY + WH2 - 2, rw + 4, 2, '#ffd34d');
        X.rect(ctx, rx - 2, WY, 2, WH2, '#ffd34d');
        X.rect(ctx, rx + rw, WY, 2, WH2, '#ffd34d');
        ctx.globalAlpha = pu * 0.16;
        X.blob(ctx, cx, cy, rw, WH2 * 0.7, '#ffd34d');
        ctx.globalAlpha = 1;
      }
    }
    // the payline
    X.rect(ctx, WX, WY + WH2 / 2, WW, 1, UNI.lost ? '#ff5a4d' : 'rgba(255,95,168,0.5)');
    // glass: a diagonal sheen over the whole window
    ctx.globalAlpha = 0.07;
    X.poly(ctx, [[WX, WY + WH2], [WX + WW * 0.4, WY], [WX + WW * 0.62, WY], [WX + WW * 0.22, WY + WH2]], '#ffffff');
    ctx.globalAlpha = 1;
    ctx.restore();

    // -------------------------------------------------- the ten world lamps
    for (let i = 0; i < 10; i++) {
      const lx = CBX + 10 + i * 18, ly = 156;
      const on = i < UNI.n;
      const fresh = on && i === UNI.n - 1 && UNI.glare > 0;
      X.plate(ctx, lx, ly, 16, 18, on ? '#3a2a08' : '#221238', on ? '#ffd34d' : '#54357a', '#0a0414', 3);
      if (on) {
        reelWorld(ctx, lx + 8, ly + 9, 5, i % 5, t, 0);
        ctx.globalAlpha = fresh ? 0.14 + UNI.glare * 0.3 : 0.12;
        X.blob(ctx, lx + 8, ly + 9, fresh ? 11 + UNI.glare * 6 : 8, fresh ? 11 + UNI.glare * 6 : 8, '#ffd34d');
        ctx.globalAlpha = 1;
      } else {
        F.draw(ctx, String(i + 1), lx + 8, ly + 6, '#4a3a66', { center: true, shadow: false });
      }
    }
    // the counter, and the coin slot, and the bit that takes everything
    X.plate(ctx, CBX + 34, 180, 60, 16, '#0d0620', '#4a2a70', '#060310', 3);
    F.draw(ctx, UNI.n + '/10', CBX + 64, 184, UNI.n >= 9 ? '#ffd34d' : '#8a7ab0', { center: true, shadow: '#1a0614' });
    X.plate(ctx, CBX + 104, 180, 62, 16, '#0d0620', '#4a2a70', '#060310', 3);
    F.draw(ctx, UNI.lost ? 'NOTHING' : (IN_S.quit ? 'TOO LATE' : 'ALL OF IT'), CBX + 135, 184,
      UNI.lost ? '#ff5a4d' : '#ff5fa8', { center: true, shadow: '#1a0614' });
    // a ledge to lean on, and the coin tray
    X.plate(ctx, CBX - 6, 198, CBW + 12, 10, '#351550', '#7a3aae', '#170a2a', 3);
    X.rect(ctx, CBX + 74, 208, 52, 6, '#0a0614');

    // the mount the lever turns in; the lever itself goes on last, over you
    X.plate(ctx, PIVX - 7, PIVY - 7, 14, 16, '#2a1442', '#6e3a9e', '#120722', 3);
    X.blob(ctx, PIVX, PIVY, 3.5, 3.5, '#12081e');
  }

  function leverBall() {
    const ang = -1.1 + UNI.lever * 1.42;
    return { x: PIVX + Math.cos(ang) * 18, y: PIVY + Math.sin(ang) * 18 };
  }
  /* Drawn under your hand, not over it: shaft, chrome, and a ball you can just
     about get a tentacle round. */
  function drawLever(ctx) {
    const b = leverBall();
    X.limb(ctx, PIVX, PIVY, b.x, b.y, 4, 3, '#4a3f70', '#a89ad0', '#1c1430');
    X.blob(ctx, b.x, b.y, 5.5, 5.5, '#5e0c22');
    X.blob(ctx, b.x, b.y, 4, 4, '#c22a4a');
    X.blob(ctx, b.x - 1.3, b.y - 1.4, 1.6, 1.4, '#ff8a9a');
    if (UNI.pull > 0) {
      ctx.globalAlpha = 0.26;
      X.blob(ctx, b.x, b.y, 9, 9, '#ff5fa8');
      ctx.globalAlpha = 1;
    }
  }

  /* --------------------------------------------------------------- you
     The full rig, one hand on the lever the whole time, which means the arm
     genuinely rides the lever down and springs back with it. */
  function drawGambler(ctx, g, t) {
    const sk = PD.art.skinFor(g.save ? g.save.cos : null);
    if (!UNI.rig) UNI.rig = PD.rig.make();
    const r = UNI.rig;
    const lb = leverBall(), bx = lb.x, by = lb.y;
    const hop = UNI.hop > 0 ? Math.sin(Math.PI * (1 - UNI.hop / 0.6)) : 0;
    const sag = UNI.lost ? Math.min(1, UNI.t / 1.1) : 0;
    const y = FY - 13 - hop * 9 + UNI.lever * 2 + sag * 11;
    const shx = PSX - 4, shy = y - 6.5;
    ctx.globalAlpha = 0.42 - hop * 0.18;
    X.blob(ctx, PSX, FY + 1, 12 - hop * 3, 3, '#0a0614');
    ctx.globalAlpha = 1;
    const grip = UNI.lost ? null : { x: bx, y: by };
    ctx.save();
    ctx.translate(PSX, FY);
    ctx.rotate(UNI.lever * 0.1 - hop * 0.04 - sag * 0.3);
    ctx.translate(-PSX, -FY);
    PD.rig.draw(ctx, r, {
      x: PSX, y: y, flip: true, spr: sk.alienCore,
      frame: PD.rig.faceOf(r, t, Math.sin(t * 1.3) > 0.93),
      drilling: false, twoHand: false, grip: grip,
      aim: grip ? Math.atan2(by - shy, bx - shx) : Math.PI,
      ground: true, vx: 0, vy: 0,
      squash: 1 + (hop > 0 ? hop * 0.16 : Math.sin(t * 3.2) * 0.02) - sag * 0.12,
      ragdoll: false
    }, sk.P, PD.art.BIZ);
    ctx.restore();
    if (hop > 0.5 && U.chance(0.4)) bits(PSX, FY, 1, ['#ffd34d', '#ffffff'], 60, 0);
  }

  /* -------------------------------------------------------- one of the room */
  function drawFan(ctx, c, t) {
    const K = AH.KIN[c.k % AH.KIN.length];
    if (c.row === 0 && UNI.lost && c.drift > 0.5) return;      // the balcony empties
    const jump = (c.jt > 0 && c.jt < c.jd) ? Math.sin(Math.PI * c.jt / c.jd) * c.jh : 0;
    const hot = UNI.hype;
    const bob = Math.sin(t * (2.2 + hot * 6) + c.ph) * (0.8 + hot * 2.2);
    const x = c.x + (UNI.lost ? 0 : Math.sin(t * 0.6 + c.ph) * 1.6);
    const y = c.y - jump + bob * 0.4;
    ctx.globalAlpha = 0.42 - Math.min(0.3, jump / 46);
    X.blob(ctx, x, c.y + 1, K.w * 0.42 * c.s, 3 * c.s, '#0a0614');
    ctx.globalAlpha = 1;
    const walking = UNI.lost && c.drift > 0.02 && c.drift < 0.98;
    const face = UNI.lost
      ? (walking ? (Math.floor(t * 7 + c.ph) % 2 ? 1 : 2) : 0)
      : (jump > 0.4 || hot > 0.45 ? 6 : (c.shout > 0 ? 3 : (Math.floor(t * 2 + c.ph) % 11 === 0 ? 5 : 0)));
    ctx.save();
    ctx.translate(x, y); ctx.scale(c.s, c.s);
    const flip = UNI.lost ? c.x0 < 350 : c.face < 0;
    AH.blit(ctx, AH.S[K.key], face, 0, 0, flip);
    // a drink held up, spilling when they jump
    if (c.drink >= 0 && face !== 6) {
      const dc = ['#8affa0', '#ff8ad8', '#ffb03d', '#7ec8ff'][c.drink];
      const hx = (flip ? -1 : 1) * (K.w * 0.52 + 2), hy = -K.h * 0.42 + Math.sin(t * 3 + c.ph) * 1.5;
      X.rect(ctx, hx - 2, hy, 5, 7, 'rgba(220,235,255,0.35)');
      X.rect(ctx, hx - 2, hy + 2, 5, 5, dc);
      X.rect(ctx, hx - 2, hy, 5, 1, '#d8fbff');
    }
    ctx.restore();
    if (jump > 3 && c.drink >= 0 && U.chance(0.16)) {
      bits(x + (c.face < 0 ? -6 : 6) * c.s, y - K.h * 0.42 * c.s, 1,
        [['#8affa0', '#ff8ad8', '#ffb03d', '#7ec8ff'][c.drink]], 40, 0);
    }
    c.sx = x; c.sy = y - K.h * c.s;
  }

  /* every shout in the room, drawn last so nothing sits on top of one */
  function drawShouts(ctx, t) {
    void t;
    for (const c of CROWD) {
      if (c.shout <= 0 || c.row < 2 || c.sx === undefined) continue;
      const w = WORDS[c.word % WORDS.length];
      const bw = F.width(w, 1) + 8, bh = 11;
      const x = c.sx, by = c.sy - 11 - Math.min(7, c.shout * 7) - (c.row === 3 ? 4 : 0);
      ctx.globalAlpha = Math.min(1, c.shout * 1.6) * 0.94;
      X.plate(ctx, x - bw / 2, by, bw, bh, '#f4f0ff', '#ffffff', '#9a90c0', 2);
      X.poly(ctx, [[x - 3, by + bh - 1], [x + 3, by + bh - 1], [x - 1, by + bh + 4]], '#f4f0ff');
      F.draw(ctx, w, x, by + 3, '#2a1a44', { center: true, shadow: false });
      ctx.globalAlpha = 1;
    }
  }

  /* ------------------------------------------------------------ the scene */
  function drawHall(ctx, g, t, opts) {
    opts = opts || {};
    hallRoom(ctx, t);
    for (const c of CROWD) if (c.row === 0) drawFan(ctx, c, t);     // the balcony
    balconyRail(ctx);
    for (const b of BANKS) if (b.s < 1) slotBox(ctx, b.x, b.y, b.s, b.i, t);
    for (const c of CROWD) if (c.row === 1) drawFan(ctx, c, t);
    for (const b of BANKS) if (b.s >= 1) slotBox(ctx, b.x, b.y, b.s, b.i, t);
    exitSign(ctx, t);
    drawCabinet(ctx, g, t);
    // the house has one light on you, because you are the entertainment
    ctx.globalAlpha = 0.09 + UNI.hype * 0.05;
    X.poly(ctx, [[PSX - 4, -50], [PSX + 6, -50], [PSX + 20, FY + 2], [PSX - 18, FY + 2]], '#ffe9a8');
    ctx.globalAlpha = 1;
    drawBits(ctx);
    drawLever(ctx);
    if (!opts.noPlayer) drawGambler(ctx, g, t);
    for (const c of CROWD) if (c.row === 2) drawFan(ctx, c, t);
    if (opts.player) opts.player(ctx);
    for (const c of CROWD) if (c.row === 3) drawFan(ctx, c, t);
    // haze, so the far end of the room sits back
    ctx.globalAlpha = 0.09;
    X.rect(ctx, -200, 60, 1200, 150, '#6a3ab0');
    ctx.globalAlpha = 1;
    drawShouts(ctx, t);
  }

  /* Six of them standing between you and the camera, drawn in screen space so
     they stay enormous however far the shot pulls back. Nothing but silhouette
     and a rim of whatever colour the room is throwing about -- they are the
     bottom edge of the frame, not characters. */
  const SIL = [];
  for (let i = 0; i < 7; i++) {
    SIL.push({ x: -26 + i * 78 + U.hash2(i, 3) * 34, w: 25 + U.hash2(i, 7) * 17,
      h: 36 + U.hash2(i, 11) * 22, ph: U.hash2(i, 13) * U.TAU,
      crest: Math.floor(U.hash2(i, 17) * 3), col: HUES[i % HUES.length] });
  }
  function drawSilhouettes(ctx, t) {
    const k = U.clamp((1.05 - CAM.z) / 0.35, 0, 1);
    if (k <= 0.01) return;
    const hot = UNI.lost ? 0 : UNI.hype;
    const INK = '#150b22', RIM = '#2a1840';
    ctx.globalAlpha = k;
    for (const s2 of SIL) {
      const jump = Math.max(0, Math.sin(t * (2 + hot * 7) + s2.ph)) * (2 + hot * 14);
      const y = VH - 20 - jump;                    // the line of their shoulders
      const w = s2.w, h = s2.h;
      const hy = y - h * 0.46;                     // the middle of the head
      const hr = w * 0.40;
      // arms, up and waving, drawn behind the body so they read as behind them
      if (hot > 0.35) {
        for (const sd of [-1, 1]) {
          const wag = Math.sin(t * (6 + s2.ph) + (sd > 0 ? 0 : 1.4)) * 5;
          X.limb(ctx, s2.x + sd * w * 0.62, y + 4,
            s2.x + sd * (w * 0.98) + wag, hy - h * 0.78 - hot * 12, 9, 6, INK, RIM, INK);
        }
      }
      // shoulders and chest: a wedge, wider at the bottom, cut off by the frame
      X.poly(ctx, [[s2.x - w, VH + 6], [s2.x - w * 0.72, y + 2],
        [s2.x - hr * 0.8, y - h * 0.14], [s2.x + hr * 0.8, y - h * 0.14],
        [s2.x + w * 0.72, y + 2], [s2.x + w, VH + 6]], INK);
      X.rect(ctx, s2.x - hr * 0.5, y - h * 0.3, hr, h * 0.2, INK);     // the neck
      X.blob(ctx, s2.x, hy, hr, h * 0.34, INK);                        // the head
      // whatever is on top of it
      if (s2.crest === 0) {
        for (const sd of [-1, 1]) {
          X.limb(ctx, s2.x + sd * hr * 0.4, hy - h * 0.2,
            s2.x + sd * hr * 0.85, hy - h * 0.62 + Math.sin(t * 3 + s2.ph) * 2, 3, 2, INK, RIM, INK);
        }
      } else if (s2.crest === 1) {
        for (let f = -2; f <= 2; f++) {
          const hgt = h * (0.3 - Math.abs(f) * 0.05);
          X.rect(ctx, s2.x + f * (hr * 0.34) - 1, hy - h * 0.26 - hgt, 3, hgt + 3, INK);
        }
      } else {
        X.blob(ctx, s2.x, hy - h * 0.26, hr * 1.25, h * 0.1, INK);      // a wide flat skull
        X.blob(ctx, s2.x - hr * 0.9, hy - h * 0.1, hr * 0.35, h * 0.16, INK);
        X.blob(ctx, s2.x + hr * 0.9, hy - h * 0.1, hr * 0.35, h * 0.16, INK);
      }
      // one thin line of the room along the top of the skull
      ctx.globalAlpha = k * 0.45;
      X.blob(ctx, s2.x - hr * 0.25, hy - h * 0.31, hr * 0.42, 1, s2.col);
      ctx.globalAlpha = k;
    }
    ctx.globalAlpha = 1;
  }

  function drawUniversal(ctx, g, t) {
    const sh = UNI.shake > 0 ? Math.sin(t * 58) * UNI.shake * 5 : 0;
    ctx.save();
    ctx.translate(VW / 2 + sh, VH / 2 + sh * 0.4);
    ctx.scale(CAM.z, CAM.z);
    ctx.translate(-CAM.x, -CAM.y);
    drawHall(ctx, g, t, {});
    ctx.restore();
    drawSilhouettes(ctx, t);

    if (UNI.flash > 0) {
      ctx.fillStyle = 'rgba(255,90,77,' + (UNI.flash * 0.5).toFixed(2) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }
    if (UNI.glare > 0) {
      ctx.fillStyle = 'rgba(255,211,77,' + (UNI.glare * 0.16).toFixed(2) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }
    // a soft vignette and a warm bloom over the whole frame
    ctx.globalAlpha = 0.16 + UNI.hype * 0.1;
    const vg = ctx.createRadialGradient(240, 128, 60, 240, 128, 260);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, '#0a0412');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 1;

    // ---------------------------------------------------------- what it wants
    // no buttons: one line at the bottom of the frame and the room does the rest
    let line = null, sub = null;
    if (UNI.arrive < 4.4) { line = 'EVERY NIGHT SOMEBODY GETS NINE.'; sub = 'NOBODY HAS EVER GOT TEN.'; }
    else if (UNI.lost) { line = IN_S.quit ? 'YOU WALKED AWAY. IT SPUN ANYWAY.' : 'NINE. AND THEN THIS.'; sub = UNI.t > 3 ? 'TAP' : null; }
    else if (UNI.choice) { line = 'NINE. ONE MORE TAKES EVERYTHING.'; sub = 'PULL AGAIN, OR GO AND STAND AT THE EXIT'; }
    else if (UNI.spin > 0) { line = null; }
    else { line = UNI.n === 0 ? 'PULL THE LEVER.' : 'AGAIN. ' + (10 - UNI.n) + ' TO GO.'; sub = null; }
    if (line) {
      const a = UNI.arrive < 4.4 ? U.clamp(UNI.arrive * 1.4, 0, 1) * U.clamp((4.4 - UNI.arrive) * 2, 0, 1) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(8,4,18,0.55)'; ctx.fillRect(0, VH - 34, VW, 34);
      X.rect(ctx, 0, VH - 35, VW, 1, 'rgba(255,95,168,0.35)');
      F.draw(ctx, line, 240, VH - 28, '#ffe9a8', { center: true, scale: 2, shadow: '#1a0614' });
      if (sub) {
        const bl = sub === 'TAP' ? (Math.abs(Math.sin(t * 4)) > 0.4 ? 1 : 0.25) : 1;
        ctx.globalAlpha = a * bl;
        F.draw(ctx, sub, 240, VH - 12, '#c9a8ff', { center: true, shadow: '#1a0614' });
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---- the same floor, from down on it ----
     Same room, same machine, same people: the only thing that has changed is
     that you are on the carpet and they are leaving. */
  function drawFloor(ctx, g, t) {
    const bt = IN_S.t;
    const k = U.clamp(bt / 5, 0, 1);
    const z = U.lerp(1.02, 1.24, k);
    const cx = U.lerp(414, 388, k), cy = U.lerp(176, 190, k);
    ctx.save();
    ctx.translate(VW / 2, VH / 2);
    ctx.scale(z, z);
    ctx.translate(-cx, -cy);
    hallRoom(ctx, t);
    for (const c of CROWD) if (c.row === 0) drawFan(ctx, c, t);
    balconyRail(ctx);
    for (const b of BANKS) if (b.s < 1) slotBox(ctx, b.x, b.y, b.s, b.i, t);
    for (const c of CROWD) if (c.row === 1) drawFan(ctx, c, t);
    for (const b of BANKS) if (b.s >= 1) slotBox(ctx, b.x, b.y, b.s, b.i, t);
    drawCabinet(ctx, g, t);
    drawLever(ctx);
    drawBits(ctx);

    // -------------------------------------------------------------- you
    // he goes down in two stages: on to his knees, then all the way over
    const sk = PD.art.skinFor(g.save.cos);
    if (!UNI.rig) UNI.rig = PD.rig.make();
    PD.rig.step(UNI.rig, { dt: g.dt, vx: 0, vy: 0, ground: false, drilling: false });
    const fall = U.smoothstep(0, 1, U.clamp((bt - 0.5) / 1.7, 0, 1));
    const rot = -0.3 - fall * 1.16;
    const px = PSX - 8 - fall * 58, py = FY - 14 + fall * 12;
    ctx.save();
    ctx.translate(px, py + Math.sin(t * 1.2) * 0.5);
    ctx.rotate(rot + Math.sin(t * 0.9) * 0.015);
    PD.rig.draw(ctx, UNI.rig, {
      x: 0, y: 0, flip: true, spr: sk.alienCore, frame: 3,
      drilling: false, twoHand: false, grip: null, aim: Math.PI,
      ground: false, vx: 0, vy: 30, squash: 0.94, ragdoll: true
    }, sk.P, PD.art.BIZ);
    ctx.restore();
    // his shadow, spreading as he goes down
    ctx.globalAlpha = 0.38;
    X.blob(ctx, px - fall * 14, FY + 3, 12 + fall * 22, 3.5, '#0a0614');
    ctx.globalAlpha = 1;
    // the last of his money, all over the carpet
    for (let i = 0; i < 9; i++) {
      const cx2 = px - 34 + U.hash2(i, 3) * 78, cy2 = FY + 3 + U.hash2(i, 7) * 16;
      ctx.globalAlpha = 0.9;
      X.blob(ctx, cx2, cy2, 3, 1.6, i % 3 ? '#8a6a2a' : '#3a2a52');
      X.blob(ctx, cx2 - 0.8, cy2 - 0.5, 1.2, 0.7, i % 3 ? '#ffd34d' : '#6a5a9c');
      ctx.globalAlpha = 1;
    }
    // and the tears, which are the only thing moving fast
    for (let i = 0; i < 6; i++) {
      const f = ((t * 1.5 + i * 0.17) % 1);
      ctx.globalAlpha = (1 - f) * fall;
      X.rect(ctx, px - 24 + i * 2 - f * 7, FY - 14 + f * 13, 2, 3, '#9fe8ff');
      ctx.globalAlpha = 1;
    }
    for (const c of CROWD) if (c.row === 2) drawFan(ctx, c, t);
    // somebody walks across the front of the shot to get to the bar
    const wx = -60 + ((bt * 62) % 620);
    const WK = AH.KIN[3];
    ctx.save();
    ctx.translate(wx, 300); ctx.scale(1.5, 1.5);
    AH.blit(ctx, AH.S[WK.key], Math.floor(bt * 7) % 2 ? 1 : 2, 0, 0, false);
    ctx.restore();
    for (const c of CROWD) if (c.row === 3) drawFan(ctx, c, t);
    ctx.restore();

    ctx.globalAlpha = 0.32;
    const vg = ctx.createRadialGradient(240, 150, 40, 240, 150, 230);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, '#0a0412');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 1;
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

  /* Drax: grey, covered in red, bare to the waist, and not remotely joking.
     Built out of the same parts as everything else -- pecs, arms with hands on
     them, trousers with boots -- rather than a stack of rectangles. */
  function limbPx(ctx, x0, y0, x1, y1, w0, w1, c, l, d) {
    const dx = x1 - x0, dy = y1 - y0;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
    for (let i = 0; i <= n; i++) {
      const q = i / n;
      const w = Math.max(1, Math.round(w0 + (w1 - w0) * q));
      const cx = Math.round(x0 + dx * q), cy = Math.round(y0 + dy * q);
      X.rect(ctx, cx - (w >> 1) - 1, cy - (w >> 1) - 1, w + 2, w + 2, d);
      X.rect(ctx, cx - (w >> 1), cy - (w >> 1), w, w, c);
      if (w > 3) X.rect(ctx, cx - (w >> 1), cy - (w >> 1), w - 2, 1, l);
    }
  }
  function drawDrax(ctx, x, y, t) {
    const S1 = '#8d99a6', SL = '#b3bec9', SD = '#5d6874', RD = '#b04a52', RL = '#d4707a';
    const TR = '#252a36', TL = '#39404f', INK = '#10131a';
    const br = Math.sin(t * 3) * 1;
    X.blob(ctx, x, y + 1, 16, 3, '#0a0614');
    // legs, planted wide
    for (const sgn of [-1, 1]) {
      limbPx(ctx, x + sgn * 6, y - 26, x + sgn * 8, y - 13, 10, 9, TR, TL, INK);
      limbPx(ctx, x + sgn * 8, y - 13, x + sgn * 9, y - 4, 9, 8, TR, TL, INK);
      X.round ? 0 : 0;
      X.rect(ctx, x + sgn * 9 - 6, y - 5, 12, 5, '#15181f');
      X.rect(ctx, x + sgn * 9 - 6, y - 5, 12, 2, '#2a303c');
    }
    // the torso: a slab with a chest on it
    X.blob(ctx, x, y - 36, 14, 12 + br, S1);
    X.rect(ctx, x - 14, y - 30, 28, 6, SD);
    X.blob(ctx, x - 6, y - 42, 7, 5, SL);              // pecs
    X.blob(ctx, x + 6, y - 42, 7, 5, SL);
    X.rect(ctx, x - 1, y - 45, 2, 12, SD);
    for (let i = 0; i < 3; i++) X.rect(ctx, x - 7, y - 34 + i * 4, 14, 1, SD);   // abs
    X.rect(ctx, x - 13, y - 28, 26, 4, TR);            // waistband
    X.rect(ctx, x - 3, y - 28, 6, 4, '#7a6a3a');
    // the red, everywhere
    for (let i = 0; i < 9; i++) {
      const a = i * 1.9;
      X.rect(ctx, x + Math.cos(a) * 9, y - 40 + Math.sin(a) * 7, 4 + (i % 3), 2, i % 2 ? RD : RL);
      X.rect(ctx, x + Math.cos(a * 1.4) * 6, y - 44 + (i % 5) * 3, 2, 4, RD);
    }
    // arms: one of them is holding your ankle
    limbPx(ctx, x - 14, y - 44, x - 20, y - 33, 9, 8, S1, SL, INK);
    limbPx(ctx, x - 20, y - 33, x - 24, y - 24, 8, 7, S1, SL, INK);
    X.blob(ctx, x - 25, y - 21, 5, 5, SL);
    limbPx(ctx, x + 14, y - 44, x + 20, y - 34, 9, 8, S1, SL, INK);
    limbPx(ctx, x + 20, y - 34, x + 27, y - 29, 8, 7, S1, SL, INK);
    X.blob(ctx, x + 29, y - 28, 5, 5, SL);
    X.rect(ctx, x - 19, y - 42, 6, 2, RD);
    X.rect(ctx, x + 16, y - 42, 6, 2, RD);
    // head: a hard one
    X.blob(ctx, x, y - 54, 9, 8, S1);
    X.blob(ctx, x, y - 58, 7, 3, SL);
    X.round && 0;
    X.rect(ctx, x - 7, y - 60, 14, 2, RD);
    X.rect(ctx, x - 8, y - 56, 5, 1, RD); X.rect(ctx, x + 3, y - 56, 5, 1, RD);
    X.rect(ctx, x - 6, y - 55, 4, 3, '#ffffff'); X.rect(ctx, x + 2, y - 55, 4, 3, '#ffffff');
    X.rect(ctx, x - 5, y - 54, 2, 2, INK); X.rect(ctx, x + 3, y - 54, 2, 2, INK);
    X.rect(ctx, x - 4, y - 49, 8, 1, '#3a2028');
    X.rect(ctx, x - 3, y - 48, 6, 1, SD);
  }

  /* The big one. Horns, a ring in his nose, and nothing at all to say. */
  function drawBull(ctx, x, y, t) {
    const S1 = '#8a6650', SL = '#ab8468', SD = '#5c4234', H = '#e8dfc4', HD2 = '#b0a888';
    const TR = '#2a2438', TL = '#3f3750', INK = '#140f26';
    const br = Math.sin(t * 2.4 + 1) * 1;
    X.blob(ctx, x, y + 1, 20, 4, '#0a0614');
    for (const sgn of [-1, 1]) {
      limbPx(ctx, x + sgn * 8, y - 28, x + sgn * 10, y - 14, 13, 11, TR, TL, INK);
      limbPx(ctx, x + sgn * 10, y - 14, x + sgn * 11, y - 5, 11, 9, TR, TL, INK);
      X.rect(ctx, x + sgn * 11 - 8, y - 6, 16, 6, '#15121c');
      X.rect(ctx, x + sgn * 11 - 8, y - 6, 16, 2, '#2e2840');
    }
    // a chest you could park on
    X.blob(ctx, x, y - 42, 19, 15 + br, S1);
    X.rect(ctx, x - 19, y - 34, 38, 7, SD);
    X.blob(ctx, x - 8, y - 50, 9, 6, SL);
    X.blob(ctx, x + 8, y - 50, 9, 6, SL);
    X.rect(ctx, x - 1, y - 54, 2, 16, SD);
    for (let i = 0; i < 3; i++) X.rect(ctx, x - 9, y - 38 + i * 4, 18, 1, SD);
    // fur, along the edges
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2;
      X.rect(ctx, x + Math.cos(a) * 19, y - 42 + Math.sin(a) * 15, 2, 2, i % 2 ? SD : SL);
    }
    X.rect(ctx, x - 18, y - 30, 36, 4, '#3a2a1a');
    X.rect(ctx, x - 4, y - 30, 8, 4, '#c9a02a');
    // arms
    limbPx(ctx, x - 19, y - 52, x - 26, y - 38, 12, 10, S1, SL, INK);
    limbPx(ctx, x - 26, y - 38, x - 31, y - 30, 10, 8, S1, SL, INK);
    X.blob(ctx, x - 33, y - 27, 6, 6, SL);
    limbPx(ctx, x + 19, y - 52, x + 26, y - 40, 12, 10, S1, SL, INK);
    limbPx(ctx, x + 26, y - 40, x + 32, y - 33, 10, 8, S1, SL, INK);
    X.blob(ctx, x + 34, y - 31, 6, 6, SL);
    // head, snout, ring, horns
    X.blob(ctx, x + 1, y - 64, 11, 9, S1);
    X.blob(ctx, x - 3, y - 60, 7, 5, SL);
    X.rect(ctx, x - 5, y - 60, 2, 2, '#2a1810'); X.rect(ctx, x - 1, y - 60, 2, 2, '#2a1810');
    X.rect(ctx, x - 5, y - 67, 4, 2, INK); X.rect(ctx, x + 3, y - 67, 4, 2, INK);
    X.rect(ctx, x - 4, y - 56, 6, 2, '#c9c4b4');
    for (const s of [-1, 1]) {
      X.rect(ctx, x + 1 + s * 9, y - 70, 5, 4, H);
      X.rect(ctx, x + 1 + s * 13, y - 75, 5, 6, H);
      X.rect(ctx, x + 1 + s * 16, y - 79, 4, 5, HD2);
      X.rect(ctx, x + 1 + s * 17, y - 82, 3, 4, H);
    }
    // and the ears, out sideways
    for (const s of [-1, 1]) X.blob(ctx, x + 1 + s * 13, y - 62, 5, 3, S1);
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

  /* There is no opening cutscene any more. The night starts with you already on
     your feet in the club -- the machine is at the back of the room and you go
     and find it yourself. Everything after that is beats. */
  function enterIntro(g) {
    ensureArt();
    IN_S.beat = 0; IN_S.t = 0; IN_S.line = 0; IN_S.chars = 0; IN_S.pop = 0; IN_S.quit = 0;
    IN_S.reel = [0, 0, 0]; IN_S.spin = 3.2; IN_S.chips.length = 0; IN_S.flash = 0;
    IN_S.done = 0; IN_S.inClub = 1;
    g.save.story = 1;
    g.saveGame();
    g.state = 'home';
    PD.home.enter(g);
    PD.home.goClub(g, true);
    A.sfx.tone(180, { type: 'square', to: 90, dur: 0.5, vol: 0.1 });
  }

  function nextBeat(g) {
    IN_S.beat++; IN_S.t = 0; IN_S.line = 0; IN_S.chars = 0; IN_S.pop = 0;
    if (IN_S.beat >= BEATS.length) { finishIntro(g); return; }
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
    // the crowd carries on leaving while you are still on the carpet
    if (BEATS[IN_S.beat] && BEATS[IN_S.beat].id === 'floor') {
      UNI.lever = 0; UNI.pull = 0;
      updateCrowd(dt, IN_S.t); updateBits(dt);
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
    if (id === 'universal') { drawUniversal(ctx, g, t); return; }
    else if (id === 'floor') drawFloor(ctx, g, t);
    else if (id === 'drag') drawDrag(ctx, g, t);
    else if (id === 'fist') drawFist(ctx, g, t);
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
