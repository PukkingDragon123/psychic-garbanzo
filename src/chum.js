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
  const FX = PD.fx;
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
    rows.forEach((r, i) => F.draw(ctx, r, bx + w / 2, by + 2 + i * 10, '#0a3446', { center: true, shadow: false }));
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
  /* He used to explain the controls. He does not any more: you can see a
     drill, you can see a door, and a shark reading you a manual is the least
     interesting thing he could be doing. What is left is the half-dozen
     moments where he has something to SAY -- and the debt, which he will
     always find time for. */
  /* He is a loan shark, not a tutorial. He turns up for the debt, for the
     moment a world comes apart, and to tell you your air is going -- and for
     nothing else. Everything he used to say about doors, shops, machines and
     bins is gone: those were things you could already see. */
  const LESSONS = {
    air: ['YOUR AIR IS LOW. I AM NOT SENTIMENTAL BUT YOU OWE ME MONEY.'],
    core: ['THAT IS A WHOLE WORLD GONE. THE BOUNTY IS ENORMOUS. DO IT AGAIN.'],
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
  let lastCall = -1e9;
  function call(g, id, force) {
    if (!LESSONS[id]) return;
    /* One teacher at a time. While the tutorial card is up it is the only
       voice on the screen; his lessons were the old tutorial and they would
       be explaining the same thing over the top of it. */
    if (!force && g.tutActive && g.tutActive()) return;
    if (!force && g.save.seen && g.save.seen['chum_' + id]) return;
    /* Two of him inside a minute is nagging whatever he is saying. The debt
       milestones and the end of the book are the only things allowed to jump
       the queue. */
    const big = id === 'debt0' || id === 'core';
    if (!big && g.time - lastCall < 75) return;
    if (g.save.seen) g.save.seen['chum_' + id] = 1;
    lastCall = g.time;
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

  /* ============================================================== THE BITE
     Mr Chum is a shark. For eleven hours of this game he is a small round
     shark in a suit who makes jokes about your air supply, and the whole time
     the joke is that he is a shark. This is the moment the joke stops.

     He stops pacing, the room goes out, and he comes at the camera: the head
     grows until it is bigger than the screen, the jaws open past anything a
     face that size should open, and they shut. It is one piece of drawing
     scaled up rather than a separate sprite, so he is recognisably HIM the
     whole way in -- same skin, same teeth, same little collar -- right up to
     the point where the collar is eight feet across.

     Nothing about it is a particle, and nothing about it survives the frame it
     ends on. */
  const BITE = { t: 0, max: 0, why: '', onEnd: null, said: 0 };
  const BITE_WORD = {
    loan: 'YOU SIGNED IT',
    late: 'YOU ARE LATE',
    broke: 'THERE IS NOTHING LEFT',
    warn: 'DO NOT MAKE ME COME OUT THERE',
    core: 'GOOD. AGAIN.'
  };

  function bite(g, why, onEnd) {
    if (BITE.t > 0) return;
    BITE.why = why || 'warn';
    BITE.t = BITE.max = 2.5;
    BITE.onEnd = onEnd || null;
    BITE.said = 0;
    A.sfx.rumble && A.sfx.rumble();
    A.sfx.tone(180, { type: 'sawtooth', to: 60, dur: 0.5, vol: 0.1 });
    FX.shake(0.5);
  }

  function updateBite(dt, g) {
    if (BITE.t <= 0) return;
    const was = BITE.t;
    BITE.t = Math.max(0, BITE.t - dt);
    const q = 1 - BITE.t / BITE.max;
    // the snap, once, at the moment the jaws meet
    if (!BITE.said && q > 0.52) {
      BITE.said = 1;
      A.sfx.punch && A.sfx.punch();
      A.sfx.tone(90, { type: 'square', to: 40, dur: 0.22, vol: 0.14 });
      A.sfx.crack && A.sfx.crack(0);
      FX.shake(1.1);
      FX.hitStop(0.1);
      FX.flash(0.6, '#ffffff');
    }
    if (was > 0 && BITE.t <= 0 && BITE.onEnd) { const f = BITE.onEnd; BITE.onEnd = null; f(g); }
  }

  /* ONE HEAD, ANY SIZE. `r` is the half-width of the snout in pixels, `open`
     is how far the jaws are apart (0 shut, 1 as wide as it goes), and every
     other number in here is a fraction of `r`, so the same code draws him at
     nine pixels across and at nine hundred. */
  function sharkHead(ctx, cx, cy, r, open, t, skin, skinD, teeth) {
    const gape = open * r * 1.15;
    const snout = r * 1.35;
    const gum = '#8a2a44', throat = '#2a0a16';

    /* THE THROAT, first, because everything else closes over it. */
    X.poly(ctx, [[cx - r * 0.86, cy - gape * 0.2], [cx + r * 0.86, cy - gape * 0.2],
      [cx + r * 0.6, cy + gape + r * 0.1], [cx - r * 0.6, cy + gape + r * 0.1]], throat);
    ctx.globalAlpha = 0.5;
    X.blob(ctx, cx, cy + gape * 0.6, r * 0.42, gape * 0.5 + 2, '#12040a');
    ctx.globalAlpha = 1;
    // the tongue, down in it
    X.blob(ctx, cx, cy + gape * 0.85, r * 0.4, gape * 0.3 + 2, '#6a1830');

    /* THE LOWER JAW. */
    const ly = cy + gape;
    X.poly(ctx, [[cx - r * 1.02, ly - r * 0.1], [cx + r * 1.02, ly - r * 0.1],
      [cx + r * 0.78, ly + r * 0.9], [cx - r * 0.78, ly + r * 0.9]], skinD);
    X.poly(ctx, [[cx - r * 0.95, ly - r * 0.06], [cx + r * 0.95, ly - r * 0.06],
      [cx + r * 0.74, ly + r * 0.5], [cx - r * 0.74, ly + r * 0.5]], skin);
    X.rect(ctx, cx - r * 0.98, ly - r * 0.1, r * 1.96, Math.max(1, r * 0.08), gum);
    X.rect(ctx, cx - r * 0.98, ly - r * 0.1, r * 1.96, Math.max(1, r * 0.03), '#b04060');
    // the bottom row
    const nb = Math.max(4, Math.round(r / 9));
    for (let i = 0; i < nb; i++) {
      const f = (i + 0.5) / nb;
      const tx = cx - r * 0.9 + f * r * 1.8;
      const tw = Math.max(2, r * 0.13 * (1.25 - Math.abs(f - 0.5)));
      const th = Math.min(Math.max(3, r * 0.3 * (1.3 - Math.abs(f - 0.5) * 1.2)), gape + r * 0.06);
      X.poly(ctx, [[tx - tw, ly + r * 0.02], [tx + tw, ly + r * 0.02], [tx, ly - th]], teeth);
      X.poly(ctx, [[tx - tw * 0.4, ly + r * 0.02], [tx + tw * 0.2, ly + r * 0.02], [tx, ly - th * 0.7]], '#ffffff');
    }

    /* THE UPPER JAW AND THE WHOLE HEAD BEHIND IT. */
    const uy = cy - gape * 0.35;
    X.poly(ctx, [[cx - r * 1.12, uy - r * 1.5], [cx + r * 1.12, uy - r * 1.5],
      [cx + r * 1.04, uy + r * 0.06], [cx - r * 1.04, uy + r * 0.06]], skinD);
    // the snout, a wedge coming at you
    X.poly(ctx, [[cx - r * 1.04, uy - r * 0.9], [cx + r * 1.04, uy - r * 0.9],
      [cx + snout * 0.58, uy + r * 0.04], [cx - snout * 0.58, uy + r * 0.04]], skin);
    ctx.globalAlpha = 0.25;
    X.poly(ctx, [[cx - r * 0.9, uy - r * 1.4], [cx + r * 0.2, uy - r * 1.4],
      [cx - r * 0.2, uy - r * 0.2], [cx - r * 0.8, uy - r * 0.2]], '#ffffff');
    ctx.globalAlpha = 1;
    X.rect(ctx, cx - r * 1.02, uy - r * 0.08, r * 2.04, Math.max(1, r * 0.09), gum);
    X.rect(ctx, cx - r * 1.02, uy - r * 0.08 + Math.max(1, r * 0.07), r * 2.04, Math.max(1, r * 0.02), '#5e1428');
    // the top row, longer than the bottom
    const nt = Math.max(5, Math.round(r / 7.5));
    for (let i = 0; i < nt; i++) {
      const f = (i + 0.5) / nt;
      const tx = cx - r * 0.96 + f * r * 1.92;
      const tw = Math.max(2, r * 0.14 * (1.3 - Math.abs(f - 0.5)));
      const th = Math.min(Math.max(4, r * 0.4 * (1.35 - Math.abs(f - 0.5) * 1.1)), gape + r * 0.09);
      X.poly(ctx, [[tx - tw, uy - r * 0.02], [tx + tw, uy - r * 0.02], [tx, uy + th]], teeth);
      X.poly(ctx, [[tx - tw * 0.4, uy - r * 0.02], [tx + tw * 0.2, uy - r * 0.02], [tx, uy + th * 0.7]], '#ffffff');
    }
    // where the two jaws meet, when they have
    if (open < 0.2) {
      ctx.globalAlpha = 0.5 * (1 - open * 5);
      X.rect(ctx, cx - r * 0.98, cy + r * 0.02, r * 1.96, Math.max(1, r * 0.02), '#2a0a16');
      ctx.globalAlpha = 1;
    }
    // the nostrils and the seam down the snout
    X.blob(ctx, cx - r * 0.34, uy - r * 0.62, Math.max(1, r * 0.06), Math.max(1, r * 0.04), skinD);
    X.blob(ctx, cx + r * 0.34, uy - r * 0.62, Math.max(1, r * 0.06), Math.max(1, r * 0.04), skinD);

    /* THE EYES. Black, and they roll back at the moment of the bite, which is
       the one detail everybody knows about a shark. */
    const roll = U.clamp((open - 0.55) * 3, 0, 1);
    for (const sd of [-1, 1]) {
      const ex = cx + sd * r * 0.82, ey = uy - r * 1.0;
      X.blob(ctx, ex, ey, r * 0.2, r * 0.19, '#f2ecff');
      X.blob(ctx, ex, ey + r * 0.06 * (1 - roll), r * 0.13, r * 0.13, '#0d0714');
      if (roll < 0.9) X.blob(ctx, ex - r * 0.05, ey - r * 0.04, r * 0.05, r * 0.04, '#ffffff');
      // the membrane coming across
      if (roll > 0) {
        X.poly(ctx, [[ex - r * 0.22, ey - r * 0.22], [ex + r * 0.22, ey - r * 0.22],
          [ex + r * 0.22, ey - r * 0.22 + r * 0.44 * roll], [ex - r * 0.22, ey - r * 0.22 + r * 0.44 * roll]], '#cfc2e0');
      }
    }
    // gill slits down the side of him
    for (let i = 0; i < 4; i++) {
      for (const sd of [-1, 1]) {
        X.rect(ctx, cx + sd * (r * 1.02 + i * r * 0.1) - 1, uy - r * 1.3, Math.max(1, r * 0.04), r * 0.5, skinD);
      }
    }
    /* AND THE COLLAR. He is wearing a suit through all of this. */
    const cyy = ly + r * 0.82;
    X.poly(ctx, [[cx - r * 1.3, cyy], [cx + r * 1.3, cyy],
      [cx + r * 1.5, cyy + r * 0.7], [cx - r * 1.5, cyy + r * 0.7]], '#2a2438');
    X.poly(ctx, [[cx - r * 0.5, cyy], [cx + r * 0.5, cyy], [cx, cyy + r * 0.55]], '#e8e2f4');
    X.poly(ctx, [[cx - r * 0.2, cyy + r * 0.06], [cx + r * 0.2, cyy + r * 0.06],
      [cx + r * 0.1, cyy + r * 0.6], [cx - r * 0.1, cyy + r * 0.6]], '#9e1730');
  }

  function drawBite(ctx, g, t) {
    if (BITE.t <= 0) return;
    const q = 1 - BITE.t / BITE.max;
    const skin = REAL.skin, skinD = REAL.skinD, teeth = REAL.teeth;

    /* Four movements: he rears back, he comes at you, the jaws shut, and then
       there is a shark's face where the room used to be. */
    /* The sizes are chosen so the HELD pose is a readable shark face -- eyes
       near the top of the frame, jaws across the middle, collar off the bottom
       -- rather than a screenful of tooth. The first pass went to three
       hundred and the whole screen ended up inside his mouth, which reads as
       a white rectangle and nothing else. */
    let r, open, cy;
    if (q < 0.16) {                                    // WIND UP
      const k = q / 0.16;
      r = 26 + k * 22;
      open = k * 0.45;
      cy = VH * 0.62 - k * 14;
    } else if (q < 0.5) {                              // LUNGE
      const k = (q - 0.16) / 0.34, e = k * k;
      r = 48 + e * 168;
      open = 0.45 + k * 0.6;
      cy = VH * 0.52 + e * 34;
    } else if (q < 0.58) {                             // SNAP
      const k = (q - 0.5) / 0.08;
      r = 216 - k * 42;
      open = Math.max(0, 1.05 * (1 - k * 1.3));
      cy = VH * 0.7 + k * 4;
    } else if (q < 0.86) {                             // HOLD, jaws shut, looking at you
      const k = (q - 0.58) / 0.28;
      r = 174 - k * 16;
      open = 0.015 + Math.abs(Math.sin(k * 11)) * 0.025;
      cy = VH * 0.73 + k * 2;
    } else {                                           // and back down the hole
      const k = (q - 0.86) / 0.14;
      r = 158 - k * 104;
      open = 0.02 + k * 0.3;
      cy = VH * 0.75 - k * 26;
    }

    // the room goes out behind him
    const dark = U.clamp(q * 6, 0, 1) * (q > 0.88 ? (1 - q) / 0.12 : 1);
    ctx.globalAlpha = dark;
    X.rect(ctx, 0, 0, VW, VH, '#0a0410');
    ctx.globalAlpha = dark * 0.85;
    X.rect(ctx, 0, 0, VW, VH, '#0a0410');
    ctx.globalAlpha = 1;
    // and a red wash, because this has stopped being funny
    ctx.globalAlpha = 0.1 + 0.12 * Math.sin(q * 9);
    X.rect(ctx, 0, 0, VW, VH, '#5e0c1e');
    ctx.globalAlpha = 1;

    const sway = Math.sin(t * 9) * (q < 0.52 ? 5 : 1.5);
    sharkHead(ctx, VW / 2 + sway, cy, r, open, t, skin, skinD, teeth);

    /* WHAT HE SAYS THROUGH IT. One line, in his own colour, held over the
       teeth once they have met. */
    if (q > 0.58) {
      const word = BITE_WORD[BITE.why] || BITE_WORD.warn;
      const fade = U.clamp((q - 0.58) / 0.08, 0, 1) * U.clamp((1 - q) / 0.12, 0, 1);
      ctx.globalAlpha = fade;
      let sc = 4;
      while (sc > 1 && F.width(word, sc) > VW - 40) sc--;
      F.draw(ctx, word, VW / 2, 12, '#ffd34d', { center: true, scale: sc, shadow: '#0a0410' });
      ctx.globalAlpha = 1;
    }
  }

  function active() { return !!S.call || BITE.t > 0; }

  function track() { return PD.story ? PD.story.track() : 'city'; }

  function update(dt, g) {
    updateBite(dt, g);
    if (BITE.t > 0) return;                    // nothing else moves during it
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
    if (S.line >= S.lines.length) {
      /* Some of these he does not sign off politely. */
      const angry = S.call === 'debt0' || S.call === 'late' || S.call === 'owe';
      hangUp();
      if (angry) bite(g, 'warn');
    }
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
      { center: true, scale: sc, shadow: false }));
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
    PD.kit.panel(ctx, bx, by - 2, dw, dh + 4, { flat: pop < 1, seed: 9 });
    if (pop >= 1) {
      rows.forEach((r, i) => F.draw(ctx, r, VW / 2, by + 8 + i * lh, PD.kit.K.text,
        { center: true, scale: sc, shadow: false }));
      if (foot) F.draw(ctx, foot, bx + dw - 8, by + dh - 11, PD.kit.K.dim, { right: true, shadow: false });
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
    if (BITE.t > 0) { drawBite(ctx, g, t); return; }
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

  /* ---- the city, going past upside down ----
     The skyline behind the street in cut.js. The three tower layers never
     change, so each is baked once into its own 1600-wide canvas and blitted
     twice at an offset -- which buys enough frame budget to put setbacks,
     water tanks, spires, aerials and hanging sign columns on them instead of
     flat rectangles. */
  const CW_TILE = 1600;
  const cityCv = [null, null, null];

  function cityTowers(L) {
    const c = document.createElement('canvas');
    c.width = CW_TILE; c.height = 280;
    const q = c.getContext('2d');
    q.imageSmoothingEnabled = false;
    const base = [196, 184, 172][L];
    const col = ['#140922', '#1d1030', '#2a1943'][L];
    const lit = ['#2a1740', '#3c2058', '#54357a'][L];
    const dk = ['#0d0518', '#140a24', '#1d1030'][L];
    const winC = ['#6a5aa0', '#9a86d8', '#ffd34d'];
    let x = -40;
    let i = 0;
    while (x < CW_TILE + 60) {
      const h = (44 + U.hash2(i * 7 + L * 31, 3) * 128) * (0.7 + L * 0.2);
      const w = 20 + U.hash2(i * 5 + L, 7) * (30 + L * 22);
      const top = base - h;
      // the slab, with a setback near the top on the taller ones
      X.rect(q, x, top, w, h + 90, col);
      X.rect(q, x, top, w, 2, lit);
      X.rect(q, x + w - 2, top, 2, h + 90, dk);
      if (h > 110) {
        const sw = w * 0.6, sx = x + (w - sw) / 2;
        X.rect(q, sx, top - 26, sw, 28, col);
        X.rect(q, sx, top - 26, sw, 2, lit);
        // and something on the roof of it
        const k = Math.floor(U.hash2(i, 11) * 3);
        if (k === 0) {                                   // a spire
          X.rect(q, sx + sw / 2 - 1, top - 60, 3, 36, lit);
          X.blob(q, sx + sw / 2, top - 62, 2, 2, '#ff5a4d');
        } else if (k === 1) {                            // a water tank on legs
          X.rect(q, sx + 3, top - 40, sw - 6, 14, dk);
          X.rect(q, sx + 3, top - 40, sw - 6, 2, lit);
          for (let j = 0; j < 3; j++) X.rect(q, sx + 5 + j * (sw - 12) / 2, top - 26, 2, 8, dk);
        } else {                                         // an aerial array
          for (let j = 0; j < 3; j++) {
            X.rect(q, sx + 4 + j * 6, top - 34 - j * 4, 1, 32 + j * 4, lit);
            X.blob(q, sx + 4 + j * 6, top - 35 - j * 4, 1.5, 1.5, '#7ef9ff');
          }
        }
      }
      // windows, in bands with dark floors between them
      for (let wy = top + 7; wy < base - 6; wy += 9) {
        if (U.hash2((wy * 3) | 0, i) < 0.18) continue;   // a whole dark floor
        for (let wx = x + 3; wx < x + w - 4; wx += 7) {
          const on = U.hash2((wx * 3) | 0, (wy * 5) | 0) > (0.3 + L * 0.14);
          if (!on) continue;
          X.rect(q, wx, wy, 3, 5, winC[Math.floor(U.hash2(wx | 0, wy | 0) * 3)]);
          if (L === 2) X.rect(q, wx, wy, 3, 1, '#ffffff');
        }
      }
      // a column of sign hanging off the front of one in four
      if (L === 2 && U.hash2(i, 13) > 0.62) {
        const sx2 = x + w - 6, n = 3 + Math.floor(U.hash2(i, 17) * 3);
        const hue = ['#ff2f7a', '#7ef9ff', '#ffd34d', '#8affa0'][Math.floor(U.hash2(i, 19) * 4)];
        X.rect(q, sx2 - 1, top + 16, 12, n * 13 + 4, '#0d0518');
        for (let j = 0; j < n; j++) {
          X.rect(q, sx2, top + 19 + j * 13, 10, 10, hue);
          X.rect(q, sx2 + 2, top + 21 + j * 13, 6, 6, '#0d0518');
          X.rect(q, sx2 + 2, top + 23 + j * 13, 6, 2, hue);
        }
      }
      x += w + 3 + U.hash2(i, 23) * 12;
      i++;
    }
    return c;
  }

  /* ===================================================================== THE RAIN
     It is not a shower. It has been coming down on this city since before the
     city was here and it does not let up for the whole beat.

     Five things make it read as weather rather than as white lines: the drops
     come down at an ANGLE and all of them at the same angle; there are three
     depths of them at three speeds; sheets of it sweep through on the wind;
     it bounces when it lands; and every so often the whole street goes white
     and then the sky falls over. */
  const WET = { t: 0, flash: 0, nextBolt: 3, gust: 0, shake: 0 };

  function rainStep(dt) {
    WET.t += dt;
    WET.flash = Math.max(0, WET.flash - dt * 3.4);
    WET.shake = Math.max(0, WET.shake - dt * 3.2);
    WET.gust = 0.5 + 0.5 * Math.sin(WET.t * 0.37) + 0.2 * Math.sin(WET.t * 1.13);
    WET.nextBolt -= dt;
    if (WET.nextBolt <= 0) {
      WET.nextBolt = U.rand(4.5, 11);
      const far = U.chance(0.55);
      WET.flash = far ? 0.45 : 1;
      A.sfx.thunder(far);
      if (!far) WET.shake = 0.6;
    }
    A.rain(0.7 + WET.gust * 0.3);
  }

  /* Behind everything: the sky lighting up, and the sheets on the wind. */
  function rainBack(ctx, t) {
    if (WET.flash > 0.02) {
      ctx.globalAlpha = WET.flash * 0.34;
      X.rect(ctx, 0, 0, VW, VH, '#b8cfff');
      ctx.globalAlpha = WET.flash * 0.5;
      X.rect(ctx, 0, 0, VW, 90, '#dfe9ff');
      ctx.globalAlpha = 1;
    }
    // sheets of it, drifting across the middle distance
    for (let i = 0; i < 4; i++) {
      const sx = ((i * 190 - t * (120 + i * 40)) % 760 + 760) % 760 - 180;
      ctx.globalAlpha = 0.05 + 0.03 * Math.sin(t * 0.7 + i);
      X.poly(ctx, [[sx, 0], [sx + 70, 0], [sx + 20, VH], [sx - 50, VH]], '#8fb4e8');
      ctx.globalAlpha = 1;
    }
  }

  /* In front of everything: the drops, where they land, and the ones that have
     hit the lens of whatever we are watching this through. */
  const RAIN_SLANT = 0.34;
  function rainFront(ctx, t) {
    const slant = RAIN_SLANT * (0.7 + WET.gust * 0.6);
    for (let L = 0; L < 3; L++) {
      const n = [70, 80, 60][L];
      const sp = [340, 620, 1000][L];
      const len = [4, 8, 15][L];
      const al = [0.11, 0.2, 0.3][L];
      const w = L === 2 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const seed = i + L * 131;
        const drift = t * sp;
        const y = ((U.hash2(seed, 9) * (VH + 60) + drift + seed * 7) % (VH + 60)) - 30;
        const x = ((U.hash2(seed, 5) * (VW + 120) - y * slant - drift * slant * 0.3) % (VW + 120) + VW + 120)
          % (VW + 120) - 60;
        ctx.globalAlpha = al + U.hash2(seed, 17) * 0.14;
        X.line(ctx, x, y, x + len * slant, y + len, '#bcd8ff', w);
        ctx.globalAlpha = 1;
      }
    }
    // where it lands: a splash and a ring, all along the road
    for (let i = 0; i < 26; i++) {
      const sx = (U.hash2(i, 29) * VW + Math.floor(t * 4 + i * 0.7) * 137) % VW;
      const f = ((t * 4 + i * 0.7) % 1);
      const y = 206 + (i % 4) * 8;
      ctx.globalAlpha = (1 - f) * 0.42;
      X.ring(ctx, sx, y, 1 + f * 6, '#bcd8ff', 1);
      X.rect(ctx, sx - 1, y - 2 - f * 4, 1, 3, '#dfe9ff');
      X.rect(ctx, sx + 2, y - 1 - f * 3, 1, 2, '#dfe9ff');
      ctx.globalAlpha = 1;
    }
    // and the drops that landed on the camera and stayed there
    for (let i = 0; i < 9; i++) {
      const q = ((t * 0.22 + U.hash2(i, 41)) % 1);
      const x = U.hash2(i, 43) * VW;
      const y = U.hash2(i, 47) * VH + q * 22;
      ctx.globalAlpha = 0.16 * (1 - q);
      X.blob(ctx, x, y, 3 + (i % 3), 4 + (i % 3), '#cfe2ff');
      ctx.globalAlpha = 0.28 * (1 - q);
      X.rect(ctx, x - 1, y - 2, 1, 2, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }

  /* Everything behind the street: sky, planet, towers, the rail, the traffic,
     the cables and the hologram. Split out so the walkable street in cut.js
     can hang the same city behind its own pavement. */
  function dragSky(ctx, scroll, t) {
    // ------------------------------------------------------------- the sky
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, '#0d0424'); grd.addColorStop(0.42, '#2a0c3e');
    grd.addColorStop(0.78, '#4a1240'); grd.addColorStop(1, '#12061c');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    rainBack(ctx, t);
    // a planet hanging over the whole thing, and cloud lit from underneath
    const px0 = ((-scroll * 0.05) % 900 + 900) % 900 - 120;
    X.blob(ctx, px0, 52, 46, 44, '#3a1a52');
    X.blob(ctx, px0 - 12, 40, 26, 22, '#4e2668');
    X.blob(ctx, px0 + 16, 62, 18, 14, '#2e1442');
    for (let i = 0; i < 7; i++) {
      const cx = ((i * 210 - scroll * 0.09) % 1000 + 1000) % 1000 - 160;
      ctx.globalAlpha = 0.2;
      X.blob(ctx, cx, 34 + (i % 3) * 16, 70, 12, '#5e2a6e');
      ctx.globalAlpha = 0.13;
      X.blob(ctx, cx + 16, 38 + (i % 3) * 16, 44, 7, '#ff5fa8');
      ctx.globalAlpha = 1;
    }

    // --------------------------------------------------------- the towers
    if (!cityCv[0]) { cityCv[0] = cityTowers(0); cityCv[1] = cityTowers(1); cityCv[2] = cityTowers(2); }
    const SP = [0.16, 0.36, 0.72];
    for (let L = 0; L < 3; L++) {
      const off = ((-scroll * SP[L]) % CW_TILE + CW_TILE) % CW_TILE;
      ctx.globalAlpha = [0.7, 0.86, 1][L];
      ctx.drawImage(cityCv[L], off - CW_TILE, -12 + L * 6);
      ctx.drawImage(cityCv[L], off, -12 + L * 6);
      ctx.globalAlpha = 1;
      // a handful of windows that will not settle
      for (let i = 0; i < 5; i++) {
        const fx = ((i * 173 - scroll * SP[L] * 1.0) % 520 + 520) % 520 - 20;
        if (Math.sin(t * 7 + i * 3 + L) < 0.3) continue;
        X.rect(ctx, fx, 70 + ((i * 37 + L * 19) % 90), 3, 5, '#ffd34d');
      }
      // a haze between this layer and the next
      ctx.globalAlpha = 0.1 - L * 0.02;
      X.rect(ctx, 0, 40 + L * 20, VW, 170, '#6a3ab0');
      ctx.globalAlpha = 1;
    }

    /* ------------------------------------------------------- THE SKYLINE RAIL
       A mag rail slung between the towers with something very long and very
       fast on it. It runs about every twelve seconds and it is the single
       thing that makes this read as a city rather than a backdrop: nothing
       else on screen moves at that speed. */
    const railY = 74;
    const roff = ((-scroll * 0.72) % 320 + 320) % 320;
    for (let i = -1; i < VW / 320 + 2; i++) {
      const rx = i * 320 + roff;
      X.rect(ctx, rx, railY + 7, 320, 2, '#1d1030');
      X.rect(ctx, rx, railY + 7, 320, 1, '#3c2058');
      // the pylons it hangs off
      X.rect(ctx, rx + 40, railY - 14, 3, 21, '#241440');
      X.rect(ctx, rx + 40, railY - 14, 1, 21, '#4a2a6a');
      X.blob(ctx, rx + 41, railY - 16, 2, 2, '#ff5a4d');
    }
    const trainT = (t * 0.085) % 1;
    if (trainT < 0.34) {
      const tx0 = VW + 200 - (trainT / 0.34) * (VW + 460);
      for (let c = 0; c < 5; c++) {
        const cx2 = tx0 + c * 46;
        if (cx2 < -60 || cx2 > VW + 60) continue;
        X.rect(ctx, cx2, railY - 9, 42, 15, '#2a2440');
        X.rect(ctx, cx2, railY - 9, 42, 2, '#6a5aa0');
        X.rect(ctx, cx2 + 2, railY - 6, 38, 6, '#0d0718');
        for (let w = 0; w < 6; w++) X.rect(ctx, cx2 + 4 + w * 6, railY - 5, 4, 4, w % 3 ? '#9fd8ff' : '#ffd34d');
        X.rect(ctx, cx2, railY + 5, 42, 2, '#140a24');
      }
      // the streak it drags behind it
      ctx.globalAlpha = 0.3;
      X.rect(ctx, tx0 + 230, railY - 4, 120, 3, '#7ef9ff');
      ctx.globalAlpha = 0.5;
      X.rect(ctx, tx0 - 8, railY - 6, 10, 9, '#dffaff');
      ctx.globalAlpha = 1;
    }

    // ---------------------------------------------------------- the traffic
    for (let i = 0; i < 18; i++) {
      const lane = i % 3;
      const sp = 70 + lane * 46 + (i % 2) * 30;
      const dir = lane === 1 ? -1 : 1;
      const span = VW + 160;
      const x = dir > 0
        ? ((i * 149 - t * sp) % span + span) % span - 80
        : span - (((i * 149 + t * sp) % span + span) % span) - 80;
      const y = 30 + lane * 20 + ((i * 7) % 11) + Math.sin(t * 0.8 + i) * 2;
      const sc = 0.62 + lane * 0.24;
      // the trail: three lengths, each fainter, so it reads as speed
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = 0.2 - k * 0.06;
        X.rect(ctx, x - dir * (14 + k * 15) * sc, y + 1 * sc, 16 * sc, 1, k ? '#3a86c4' : '#7ef9ff');
      }
      ctx.globalAlpha = 1;
      X.rect(ctx, x - 9 * sc, y, 18 * sc, 5 * sc, '#241a3a');
      X.rect(ctx, x - 6 * sc, y - 2 * sc, 12 * sc, 3 * sc, '#3a3060');
      X.rect(ctx, x - 5 * sc, y - 1 * sc, 8 * sc, 2 * sc, '#7ec8ff');
      X.rect(ctx, x + dir * 9 * sc, y + 1 * sc, 3 * sc, 2 * sc, '#ff5a4d');
      if (Math.sin(t * 9 + i) > 0) X.rect(ctx, x, y - 4 * sc, 2, 2, '#ffd34d');
    }
    // cables strung across the street, with lanterns on them
    for (let c = 0; c < 3; c++) {
      const off = ((c * 210 - scroll * 0.72) % 640 + 640) % 640 - 120;
      X.curve(ctx, off, 96, off + 100, 112, off + 200, 96, '#1a1030', 1, 12);
      for (let j = 1; j < 5; j++) {
        const f = j / 5, gk = 1 - f;
        const lx = gk * gk * off + 2 * gk * f * (off + 100) + f * f * (off + 200);
        const ly = gk * gk * 96 + 2 * gk * f * 112 + f * f * 96;
        X.blob(ctx, lx, ly + 4, 3, 4, ['#ffb03d', '#ff5fa8', '#8affa0'][j % 3]);
        ctx.globalAlpha = 0.2;
        X.blob(ctx, lx, ly + 5, 9, 8, ['#ffb03d', '#ff5fa8', '#8affa0'][j % 3]);
        ctx.globalAlpha = 1;
      }
    }
    // one enormous hologram, side on, selling something
    const hx = ((-scroll * 0.72) % 900 + 900) % 900 - 150;
    if (hx > -140 && hx < VW + 40) {
      ctx.globalAlpha = 0.3 + Math.abs(Math.sin(t * 2)) * 0.12;
      X.blob(ctx, hx, 96, 30, 46, '#2f7aff');
      X.blob(ctx, hx, 60, 15, 16, '#5f9aff');
      X.blob(ctx, hx - 16, 100, 8, 26, '#2f7aff');
      X.blob(ctx, hx + 16, 100, 8, 26, '#2f7aff');
      ctx.globalAlpha = 0.55;
      for (let sy = 50; sy < 150; sy += 4) X.rect(ctx, hx - 32, sy + ((t * 24) % 4), 64, 1, '#9fd8ff');
      ctx.globalAlpha = 1;
      F.draw(ctx, 'DRINK IT', hx, 156, 'rgba(159,216,255,0.7)', { center: true, shadow: false });
    }

  }

  /* ================================================================ THE DRAGGING
     It used to be three sprites standing in a row with a rotated copy of you
     lying between them, which is a diagram of a kidnapping rather than one.

     He has you by the ankle. His arm goes down to it and yours goes up, so
     there is a line through the two of them; you are face down and trailing,
     your head is the lowest thing in the picture and it is taking the kerb;
     you throw up a wake of water the whole way; and every couple of seconds
     the street hits you back. */
  const DRAG = { t: 0, hit: 0, next: 1.6, kind: 0, ow: 0, owT: 0, boot: 0 };
  const DRAG_OW = ['OW', 'OOF', 'AGH', 'NNGH', 'HELP', 'NOT THE FACE', 'MY TEETH'];
  const DRAG_HITS = [
    'THE KERB. THE WHOLE KERB.',
    'A BIN GOES OVER. MOST OF IT GOES OVER YOU.',
    'STRAIGHT THROUGH THE PUDDLE. ALL OF THE PUDDLE.',
    'A GRATING. YOU COUNT EVERY BAR OF IT.',
    'THE BIG ONE KICKS YOU ONCE, WITHOUT BREAKING STRIDE.'
  ];

  function dragStep(dt, g) {
    DRAG.t += dt;
    DRAG.hit = Math.max(0, DRAG.hit - dt * 3.4);
    DRAG.owT = Math.max(0, DRAG.owT - dt);
    DRAG.boot = Math.max(0, DRAG.boot - dt * 2.6);
    gritStep(dt);
    DRAG.next -= dt;
    if (DRAG.next > 0) return;
    /* Something happens to you every couple of seconds, because two minutes of
       being pulled along smoothly is a screensaver. */
    DRAG.next = U.rand(1.9, 3.2);
    DRAG.kind = U.randInt(0, DRAG_HITS.length - 1);
    DRAG.hit = 1;
    WET.shake = Math.max(WET.shake, 0.55);
    DRAG.ow = U.pick(DRAG_OW);
    DRAG.owT = 1.1;
    if (DRAG.kind === 4) { DRAG.boot = 1; A.sfx.punch(); }
    else { A.sfx.thud(); A.sfx.scrape(); }
    // whatever it was, it comes apart and goes everywhere. Its own little
    // system: the intro runs its own loop and does not step the game's FX.
    const COL = ['#8e86a8', '#6a7e94', '#bcd8ff', '#3a4a3a', '#c9bce8'];
    for (let i = 0; i < 24; i++) {
      GRIT.push({ x: 264 + U.rand(-20, 20), y: 204 + U.rand(-6, 4),
        vx: U.rand(-40, 200), vy: U.rand(-190, -20), life: U.rand(0.5, 1.3),
        c: U.pick(COL), s: U.chance(0.3) ? 2 : 1 });
    }
  }

  const GRIT = [];
  function gritStep(dt) {
    for (let i = GRIT.length - 1; i >= 0; i--) {
      const p = GRIT[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 430 * dt; p.vx *= 1 - dt * 1.4;
      if (p.y > 212) { p.y = 212; p.vy = -p.vy * 0.34; p.vx *= 0.6; }
      p.life -= dt;
      if (p.life <= 0) GRIT.splice(i, 1);
    }
  }
  function gritDraw(ctx) {
    for (const p of GRIT) {
      ctx.globalAlpha = U.clamp(p.life * 2.4, 0, 1);
      X.rect(ctx, p.x, p.y, p.s, p.s, p.c);
    }
    ctx.globalAlpha = 1;
  }

  /* One of them, drawn from the shoulder down to the fist on your ankle. */
  function dragArm(ctx, sx, sy, gx, gy, t) {
    const mx = (sx + gx) / 2 + Math.sin(t * 5) * 1.5;
    const my = (sy + gy) / 2 + 4;
    limbPx(ctx, sx, sy, mx, my, 9, 7, '#8a8a92', '#b4b4bc', '#4a4a52');
    limbPx(ctx, mx, my, gx, gy, 7, 6, '#8a8a92', '#b4b4bc', '#4a4a52');
    X.blob(ctx, mx, my, 5, 5, '#9a9aa2');
    X.blob(ctx, gx, gy, 6, 5, '#a4a4ac');                  // the fist
    X.rect(ctx, gx - 4, gy - 3, 9, 2, '#6a6a72');
  }

  function drawTheDragging(ctx, g, t, ox, oy) {
    ctx.save();
    ctx.translate(Math.round(ox || 0), Math.round(oy || 0));
    dragBody(ctx, g, t);
    ctx.restore();
  }
  function dragBody(ctx, g, t) {
    const bob = Math.sin(t * 5) * 2;
    const jolt = DRAG.hit * DRAG.hit;
    // the wake: a rooster tail of road water off whatever is ploughing it
    for (let i = 0; i < 26; i++) {
      const q = ((t * 3.4 + i * 0.09) % 1);
      ctx.globalAlpha = (1 - q) * 0.45;
      X.blob(ctx, 276 + q * 74, 209 - q * (9 + (i % 5) * 5) + (i % 3),
        3.5 - q * 2.4, 2.4 - q * 1.4, '#bcd8ff');
      ctx.globalAlpha = 1;
    }
    // the smear he is leaving down the road behind you
    ctx.globalAlpha = 0.3;
    X.rect(ctx, 268, 210, 106, 3, '#4a5a78');
    ctx.globalAlpha = 0.15;
    X.rect(ctx, 268, 206, 130, 7, '#4a5a78');
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.4;
    X.blob(ctx, 300, 210 + bob, 22, 4, '#050310');
    X.blob(ctx, 176, 210 - bob, 20, 4, '#050310');
    X.blob(ctx, 268, 212, 28, 4, '#050310');
    ctx.globalAlpha = 1;

    // the big one, behind, with a boot out when he feels like it
    drawBull(ctx, 300, 206 + bob, t);
    if (DRAG.boot > 0.02) {
      const k = DRAG.boot;
      limbPx(ctx, 292, 196 + bob, 292 - k * 34, 208 + bob, 8, 6, '#6a4a3a', '#8a6a52', '#3a2418');
      X.blob(ctx, 292 - k * 36, 209 + bob, 7, 4, '#2a1a12');
    }

    /* You. Face down, at an angle, head low and taking everything, with your
       own arms trailing back behind you because nothing about this is under
       your control. */
    const sk = PD.art.skinFor(g.save.cos), spr = sk.alienCore;
    const cv = spr.frames[0], k = spr.hd || 1;
    /* Far enough from him that the arm between you is a SPAN and not a seam:
       at forty pixels the two of them read as one lump. */
    const ax = 268, ay = 203 + bob * 0.4 - jolt * 5;
    const ang = 1.48 + Math.sin(t * 5) * 0.07 - jolt * 0.28;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.drawImage(cv, -spr.ox, -spr.oy, cv.width / k, cv.height / k);
    ctx.restore();
    // your arms, dragging behind, bouncing off the road
    for (let i = 0; i < 2; i++) {
      const sy2 = ay + 2 + i * 5;
      const ex = ax + 30 + Math.sin(t * 6 + i * 2) * 5;
      const ey = 208 + Math.abs(Math.sin(t * 6 + i * 2)) * 2;
      const SKN = (sk.P && sk.P.skin) || '#7fd8a0';
      limbPx(ctx, ax + 12, sy2, ex, ey, 5, 4, SKN, (sk.P && sk.P.skinL) || '#b4f0c8',
        (sk.P && sk.P.skinD) || '#2f6a48');
      X.blob(ctx, ex, ey, 3, 3, SKN);
    }

    /* His arm, and your ankle at the end of it. This is the whole picture:
       one straight line from his shoulder to the thing he is pulling. */
    /* His hand comes off the end of the arm he already has -- (x+29, y-28)
       on his own drawing -- and the forearm goes on AFTER you, so it reads as
       a grip on your ankle rather than a line passing behind you. */
    drawDrax(ctx, 176, 206 - bob, t);
    dragArm(ctx, 205, 178 - bob, ax - 22, ay - 6, t);

    // the impact: a white flash of contact and a ring off the road
    if (DRAG.hit > 0.05) {
      ctx.globalAlpha = DRAG.hit * 0.5;
      X.blob(ctx, ax + 16, ay + 8, 12 + (1 - DRAG.hit) * 22, 6 + (1 - DRAG.hit) * 10, '#ffffff');
      ctx.globalAlpha = DRAG.hit * 0.8;
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * U.TAU;
        X.line(ctx, ax + 16, ay + 6, ax + 16 + Math.cos(a) * (8 + (1 - DRAG.hit) * 20),
          ay + 6 + Math.sin(a) * (5 + (1 - DRAG.hit) * 12), '#ffe9a8', 2);
      }
      ctx.globalAlpha = 1;
    }
    gritDraw(ctx);
    if (DRAG.owT > 0) {
      ctx.globalAlpha = U.clamp(DRAG.owT * 1.6, 0, 1);
      F.draw(ctx, DRAG.ow, ax + 10, ay - 26 - (1.1 - DRAG.owT) * 12, '#ff5a4d',
        { center: true, scale: 2, shadow: '#2a0a12' });
      ctx.globalAlpha = 1;
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

  /* Him, standing, anywhere: for the office in cut.js. */
  function drawChumAt(ctx, x, footY, k, talking, t) {
    const a = ensureArt();
    const mouth = talking && Math.floor(t * 9) % 2 === 0 ? 1 : 0;
    const step = talking ? (Math.floor(t * 5) % 4) : 0;
    ctx.save();
    ctx.translate(Math.round(x - CCX * k), Math.round(footY - CBASE * k));
    ctx.scale(k, k);
    ctx.drawImage(a.real[mouth][step], 0, 0);
    ctx.restore();
  }

  /* The opening night is story.js's now: the crash, the street, the office.
     These stay as the names game.js calls. */
  function enterIntro(g) { ensureArt(); PD.story.startIntro(g); }
  function updateIntro(dt, g) { PD.story.updateIntro(dt, g); }
  function drawIntro(ctx, g, t) { PD.story.drawIntro(ctx, g, t); }

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

  PD.chum = {
    enterIntro, updateIntro, drawIntro, track,
    call, update, draw, active, takeCut, drawDebt, DEBT0,
    /* the street and the office in cut.js, and the talk in story.js / talk.js */
    WET, dragSky, rainStep, rainFront, dragStep, drawTheDragging, drawDrax, drawBull, drawChumAt,
    wrap, speech, captionCard,
    /* the little one in the corner of the moon */
    leadStep, drawMini
  };
})(window.PD);
