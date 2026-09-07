/* All sprites are generated at load time from code -- no image files, so the
   game is a pure "open index.html and play" package. */
(function (PD) {
  'use strict';
  const pix = PD.pix;
  const U = PD.util;

  const C = {
    ink: '#1a1030', ink2: '#2e1d52',
    skin: '#7ff08a', skinD: '#43ba5f', skinL: '#c4ffce',
    eye: '#151233', white: '#ffffff',
    glass: '#9fe0ff', glassD: '#66b0dc', glassL: '#eafcff',
    suit: '#ff5fa8', suitD: '#c02f74', suitL: '#ffb0d6',
    met: '#d3dcf0', metD: '#8290b0', metDD: '#4e5a7e',
    gold: '#ffd34d', goldD: '#d99a1e',
    red: '#ff5a4d', redD: '#b32b2f',
    cyan: '#58e8ff', cyanD: '#2b9fc4',
    purple: '#bb8cff', purpleD: '#6b3fb5',
    lime: '#c8ff5a', limeD: '#7cbb26',
    orange: '#ff9b3d', orangeD: '#c25c14',
    slime: '#8affd0', slimeD: '#33b58a'
  };

  const sprites = {};

  function reg(name, builders, ox, oy, hd) {
    const frames = builders.map(b => b.toCanvas());
    const k = hd || 1;
    sprites[name] = {
      frames, w: frames[0].width / k, h: frames[0].height / k, hd: k,
      ox: ox === undefined ? frames[0].width / k / 2 : ox,
      oy: oy === undefined ? frames[0].height / k / 2 : oy
    };
    return sprites[name];
  }

  /* Draw any registered sprite at its logical size, HD or not. */
  function blit(ctx, spr, frame, x, y, flip) {
    const cv = spr.frames[frame % spr.frames.length];
    const k = spr.hd || 1;
    ctx.save();
    ctx.translate(x | 0, y | 0);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(cv, -spr.ox | 0, -spr.oy | 0, cv.width / k, cv.height / k);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ player
     A round little alien in a bubble helmet. Drawn facing right; the renderer
     flips it for leftward travel. */
  /* pose: 'idle' | 'walk' | 'fly'; f: frame index. Head sits on a chubby
     torso with proper little arms and legs, so it can walk the deck and
     dangle from the tether. */
  /* The alien, at 2x density. Not cute: a long-necked, pot-bellied, knock-kneed
     thing with a huge hooked nose, one big eye and one small one, three
     fingers, a drooping antenna and a permanently unimpressed expression. He
     wears a stolen human suit jacket that does not fit. */
  const BIZ = {
    jacket: '#4a5a3a', jacketL: '#647a4e', jacketD: '#2f3a24',
    shirt: '#e8e4d0', trousers: '#3a3348', shoe: '#241f2e', shoeL: '#4a4260',
    brass: '#b08a3a', brassL: '#e6c26a'
  };

  /* Draw into a bigger sheet without touching a single hand-placed coordinate:
     every call is forwarded with a constant offset. The alien grew hair and a
     moustache that need headroom, and this buys it for free. */
  function offsetPix(raw, ox, oy) {
    return {
      set: (x, y, c) => raw.set(x + ox, y + oy, c),
      rect: (x, y, w, h, c) => raw.rect(x + ox, y + oy, w, h, c),
      round: (x, y, w, h, r, c) => raw.round(x + ox, y + oy, w, h, r, c),
      line: (a, b, c2, d, e) => raw.line(a + ox, b + oy, c2 + ox, d + oy, e),
      spike: (x, y, w, h, d, c) => raw.spike(x + ox, y + oy, w, h, d, c),
      disc: (x, y, r, c) => raw.disc(x + ox, y + oy, r, c),
      ellipse: (x, y, rx, ry, c) => raw.ellipse(x + ox, y + oy, rx, ry, c),
      shade: (a, b, dx, dy) => raw.shade(a, b, dx, dy),
      outline: (c) => raw.outline(c)
    };
  }

  function buildAlien(pose, f, P, blink) {
    P = P || C;
    const sheet = pix(72, 104);
    const p = offsetPix(sheet, 4, 16);
    const walk = pose === 'walk', fly = pose === 'fly', drill = pose === 'drill', roll = pose === 'roll';
    const skin = P.skin, skinD = P.skinD, skinL = P.skinL;

    if (roll) {
      // tucked: all nose and jacket, spinning
      p.ellipse(32, 50, 23, 21, BIZ.jacket);
      p.shade(BIZ.jacket, BIZ.jacketD, 0, 1);
      p.ellipse(32, 40, 14, 6, BIZ.jacketL);
      p.round(16, 62, 14, 8, 3, BIZ.shoe); p.round(34, 64, 14, 8, 3, BIZ.shoe);
      p.ellipse(30, 44, 14, 13, skin);
      p.shade(skin, skinD, 1, 1);
      p.round(20, 38, 10, 11, 4, C.white); p.round(33, 41, 6, 6, 2, C.white);
      p.disc(25, 43, 3, C.eye); p.disc(36, 43, 1.8, C.eye);
      p.round(28, 42, 8, 13, 3, skinL);                 // the nose, still enormous
      p.spike(31, 51, 9, 7, 1, skinD);
      p.rect(27, 43, 1, 12, skinD);
      p.rect(22, 58, 12, 2, C.ink);
      p.disc(50, 52, 5, skin); p.disc(14, 52, 5, skin);
      p.outline(C.ink);
      return sheet;
    }

    // THE NOSE JIGGLES. It is the heaviest thing on him and it never quite
    // settles: every frame of every pose shifts it, so it wobbles on its own
    // even when he is standing perfectly still.
    const nj = [0, 2, 3, 1][f % 4];              // how far it has drooped
    const nx = [0, 1, 0, -1][f % 4];             // and which way it swung
    const bob = fly ? -2 : (walk ? [0, -1, 0, 1][f % 4] : [0, 1, 1, 0][f % 4]);
    const lean = drill ? 4 : 0;
    const jit = drill ? (f % 2 ? 1 : -1) : 0;
    const hy = 15 + bob;                  // head centre
    const ny = 30 + bob;                  // neck top
    const cy = 42 + bob;                  // chest top
    const by = 61 + bob;                  // gut centre
    const bx = 30 + lean;
    const hx = bx - (drill ? 1 : 0);

    /* ---- legs: long, knock-kneed, ending in enormous flat shoes ---- */
    if (fly) {
      p.round(21, 70, 8, 12, 3, BIZ.trousers); p.round(35, 72, 8, 10, 3, BIZ.trousers);
      p.round(13, 78, 20, 6, 3, BIZ.shoe); p.round(33, 79, 20, 6, 3, BIZ.shoe);
      p.rect(16, 79, 7, 2, BIZ.shoeL); p.rect(36, 80, 7, 2, BIZ.shoeL);
    } else {
      const sw = walk ? [[-4, 4], [0, 0], [4, -4], [0, 0]][f % 4] : [0, 0];
      const lift = walk ? [[3, 0], [0, 0], [0, 3], [0, 0]][f % 4] : [0, 0];
      for (let s = 0; s < 2; s++) {
        const dx = sw[s], up = lift[s];
        const kx = (s ? 33 : 23) + dx * 0.5;            // knee, pulled inward
        const ax = (s ? 35 : 21) + dx;                  // ankle, splayed outward
        p.round(kx, 68, 8, 8, 3, BIZ.trousers);
        p.round(ax, 74 - up, 8, 6 + up, 3, BIZ.trousers);
        p.round(ax - 7, 78 - up, 21, 6, 3, BIZ.shoe);
        p.rect(ax - 4, 79 - up, 8, 2, BIZ.shoeL);
        p.rect(ax - 7, 82 - up, 21, 2, '#12101a');
      }
    }

    /* ---- the air tank he never services, taped to his back ---- */
    p.round(3, cy + 2, 13, 26, 5, BIZ.brass);
    p.rect(5, cy + 4, 4, 20, BIZ.brassL);
    p.rect(4, cy + 12, 11, 3, BIZ.jacketD);              // gaffer tape
    p.round(4, cy + 26, 11, 5, 2, C.metDD);
    p.line(15, cy + 6, 22, cy + 3, C.metDD);
    if (fly) { p.spike(4, cy + 30, 11, 13, 1, C.orange); p.spike(6, cy + 30, 7, 9, 1, C.gold); }

    /* ---- narrow shoulders, then a gut that has its own weather ---- */
    p.round(bx - 10, cy, 20, 16, 5, BIZ.jacket);
    p.ellipse(bx, by, 16 + (walk ? [0, 1, 0, -1][f % 4] : 0), 11, BIZ.jacket);
    p.shade(BIZ.jacket, BIZ.jacketD, 0, 1);
    p.rect(bx - 4, cy - 1, 8, 13, BIZ.shirt);            // shirt showing through
    p.rect(bx - 2, cy + 1, 4, 3, P.suit);                // a tie, done up wrong
    p.rect(bx - 1, cy + 4, 3, 10, P.suit);
    p.line(bx - 5, cy, bx - 11, cy + 15, BIZ.jacketL);   // lapels
    p.line(bx + 5, cy, bx + 11, cy + 15, BIZ.jacketL);
    p.rect(bx - 14, cy + 12, 6, 2, '#c46a8a');           // pocket rag
    p.disc(bx + 8, by - 1, 1.6, C.gold);                 // one done-up button
    p.rect(bx - 15, by + 7, 30, 4, BIZ.jacketD);         // a belt, defeated
    p.rect(bx - 3, by + 7, 6, 4, BIZ.brass);

    /* ---- spindly arms, three long fingers, no thumb worth the name ---- */
    const hand = (hx2, hy2) => {
      p.round(hx2 - 4, hy2 - 3, 8, 7, 2, skin);
      p.rect(hx2 - 4, hy2 + 3, 2, 6, skin); p.rect(hx2 - 1, hy2 + 3, 2, 7, skin); p.rect(hx2 + 2, hy2 + 3, 2, 6, skin);
      p.set(hx2 - 4, hy2 + 8, skinD); p.set(hx2 - 1, hy2 + 9, skinD); p.set(hx2 + 2, hy2 + 8, skinD);
    };
    if (drill) {
      p.round(bx + 6 + jit, cy + 4, 21, 6, 3, BIZ.jacketD);
      p.round(bx + 4 + jit, cy + 12, 23, 6, 3, BIZ.jacketD);
      hand(bx + 28 + jit, cy + 6); hand(bx + 28 + jit, cy + 14);
      p.round(bx - 22, cy + 4, 7, 15, 3, BIZ.jacketD);
    } else {
      const asw = walk ? [4, 0, -4, 0][f % 4] : 0;
      const fwd = fly ? -8 : 0;
      p.round(bx - 20, cy + 2 + asw + fwd, 8, 20, 3, BIZ.jacketD);
      p.rect(bx - 19, cy + 4 + asw + fwd, 2, 16, BIZ.jacket);
      hand(bx - 16, cy + 23 + asw + fwd);
      p.round(bx + 13, cy + 2 - asw + fwd, 8, 20, 3, BIZ.jacketD);
      p.rect(bx + 18, cy + 4 - asw + fwd, 2, 16, BIZ.jacket);
      hand(bx + 17, cy + 23 - asw + fwd);
    }

    /* ---- a long thin neck holding up too much head ---- */
    p.round(bx - 4, ny, 9, 14, 3, skin);
    p.shade(skin, skinD, 0, 1);
    p.rect(bx - 3, ny + 3, 1, 8, skinD);
    p.rect(bx - 6, ny + 11, 13, 4, BIZ.shirt);           // collar, too tight
    p.rect(bx - 6, ny + 11, 13, 1, '#b8b49c');

    /* ---- the head: tall, lumpy, hook-nosed, permanently unimpressed ---- */
    p.round(hx - 12, hy - 14, 24, 32, 8, skin);
    p.shade(skin, skinD, 0, 1);
    p.round(hx - 9, hy - 13, 14, 6, 3, skinL);           // a shiny bald dome
    p.round(hx - 15, hy - 2, 5, 10, 2, skin);            // ears, different heights
    p.round(hx + 10, hy - 5, 5, 10, 2, skin);
    p.set(hx - 14, hy + 2, skinD); p.set(hx + 13, hy - 1, skinD);
    p.rect(hx - 11, hy - 10, 11, 3, skinD);             // heavy brow, one side only
    p.rect(hx + 3, hy - 7, 8, 2, skinD);
    if (blink) {
      p.rect(hx - 10, hy - 2, 9, 2, C.ink); p.rect(hx + 4, hy, 6, 2, C.ink);
    } else {
      p.round(hx - 11, hy - 8, 11, 13, 5, C.white);      // one enormous eye
      p.round(hx + 4, hy - 5, 7, 7, 3, C.white);         // one that gave up
      p.disc(hx - 6, hy - 1, 3.2, C.eye); p.disc(hx + 7, hy - 1, 1.8, C.eye);
      p.set(hx - 8, hy - 3, C.white); p.set(hx + 6, hy - 2, C.white);
      p.rect(hx - 11, hy - 8, 11, 1, skinD);
      p.rect(hx - 11, hy + 4, 11, 1, skinD);
    }
    // THE NOSE: a hooked wedge that arrives in the room before he does, and it
    // never holds still. nj/nx swing it a few pixels every frame, so it jiggles
    // whatever he is doing. It gets its own cast shadow so it stands off the
    // face instead of sinking into it.
    const ny2 = hy + nj, nxx = hx + nx;
    p.round(nxx - 5, ny2 - 7, 13, 20, 4, skinD);        // the shadow it throws
    p.round(nxx - 4, ny2 - 8, 11, 19, 4, skin);
    p.round(nxx - 3, ny2 - 7, 7, 16, 3, skinL);
    p.round(nxx - 4, ny2 + 2, 18, 9, 3, skin);          // the hook, jutting past the cheek
    p.round(nxx - 3, ny2 + 2, 13, 6, 3, skinL);
    p.rect(nxx - 4, ny2 + 10, 19, 1, skinD);
    p.rect(nxx + 14, ny2 + 2, 1, 9, skinD);
    p.set(nxx - 1, ny2 + 9, C.ink); p.set(nxx + 4, ny2 + 9, C.ink);
    // a MOUSTACHE, hung off the underside of it, swinging with the nose
    const MO = '#2f3a22', MOL = '#4a5a35';
    const my2 = ny2 + 10;
    p.rect(nxx - 12, my2, 25, 4, MO);
    p.rect(nxx - 14, my2 + 2, 4, 4, MO);
    p.rect(nxx + 12, my2 + 2, 4, 4, MO);
    p.rect(nxx - 11, my2 + 4, 7, 2, MO);
    p.rect(nxx + 5, my2 + 4, 7, 2, MO);
    p.rect(nxx - 11, my2, 23, 1, MOL);
    p.set(nxx - 13, my2 + 5, MO); p.set(nxx + 15, my2 + 5, MO);
    // mouth: a flat line of disappointment under it, or gritted teeth
    if (drill) { p.rect(hx - 8, hy + 14, 11, 4, C.ink); for (let i = 0; i < 4; i++) p.rect(hx - 7 + i * 3, hy + 15, 2, 2, C.white); }
    else { p.rect(hx - 8, hy + 15, 10, 2, C.ink); p.set(hx - 9, hy + 14, C.ink); p.set(hx + 2, hy + 16, C.ink); }
    p.rect(hx - 8, hy + 17, 13, 2, skinD);              // chin, the first of several
    // one drooping antenna with a bulb that stopped working long ago
    const aw = walk ? [2, 0, -2, 0][f % 4] : [0, 1, 1, 0][f % 4];
    p.line(hx + 3, hy - 14, hx + 7 + aw, hy - 21, skinD);
    p.line(hx + 7 + aw, hy - 21, hx + 11 + aw, hy - 19, skinD);
    p.disc(hx + 12 + aw, hy - 18, 2.4, f === 2 ? C.gold : '#6b6450');
    // EXACTLY THREE STRANDS OF HAIR, and he is very proud of all of them
    const hw = [0, 1, 2, 1][f % 4];                      // they sway too
    for (let i = 0; i < 3; i++) {
      const sx2 = hx - 7 + i * 5, sh = 9 + i * 2, curl = (i % 2 ? 1 : -1);
      p.line(sx2, hy - 14, sx2 + curl + hw * curl, hy - 14 - sh, skinD);
      p.line(sx2 + 1, hy - 14, sx2 + 1 + curl + hw * curl, hy - 14 - sh, skinD);
      p.set(sx2 + curl * 2 + hw * curl, hy - 15 - sh, skinL);
    }

    p.outline(C.ink);
    return sheet;
  }

  function alienSet(P) {
    return {
      idle: [0, 1, 2, 3].map(i => buildAlien('idle', i, P)).concat([buildAlien('idle', 0, P, true)]),
      walk: [0, 1, 2, 3].map(i => buildAlien('walk', i, P)),
      fly: [buildAlien('fly', 0, P), buildAlien('fly', 1, P)],
      drill: [buildAlien('drill', 0, P), buildAlien('drill', 1, P), buildAlien('drill', 2, P)],
      roll: [buildAlien('roll', 0, P)]
    };
  }

  const base = alienSet(C);
  const AOX = 18, AOY = 37;                         // logical anchor: the belt
  reg('alien', base.idle, AOX, AOY, 2);
  reg('alienWalk', base.walk, AOX, AOY, 2);
  reg('alienFly', base.fly, AOX, AOY, 2);
  reg('alienDrill', base.drill, AOX, AOY, 2);
  reg('alienRoll', base.roll, AOX, 35, 2);

  /* ------------------------------------------------------------------- drill
     Horizontal, pointing right, anchored at the shoulder end. */
  /* The drill at 2x: a chunky housing with a grip, a hot collar and a long
     striped bit that spins across four frames. */
  function buildDrill(phase, P) {
    P = P || { met: C.met, metDD: C.metDD, accent: C.orange };
    const p = pix(56, 24);
    p.round(0, 5, 20, 14, 4, P.metDD);            // housing
    p.round(2, 7, 14, 4, 2, P.met);
    p.rect(4, 12, 10, 3, C.ink2);                 // vent
    p.round(6, 17, 10, 6, 2, P.metDD);            // grip underneath
    p.rect(16, 3, 8, 18, P.accent);               // hot collar
    p.rect(17, 5, 2, 14, '#ffe2a8');
    p.disc(21, 12, 2, '#fff7d0');
    for (let x = 24; x < 55; x++) {               // tapering bit
      const t = (x - 24) / 31;
      const half = Math.max(1, 8 * (1 - t * 0.92));
      for (let y = -half; y <= half; y++) {
        const yy = Math.round(12 + y);
        const stripe = ((x + yy * 2 + phase * 3) % 8) < 4;
        p.set(x, yy, stripe ? P.met : P.metDD);
      }
    }
    p.set(55, 12, '#ffffff');
    p.outline(C.ink);
    return p;
  }

  reg('drill', [0, 1, 2, 3].map(buildDrill), 5, 6, 2);

  /* ------------------------------------------------------------------ pistol */
  function buildGun(charge) {
    const p = pix(18, 11);
    p.round(0, 3, 11, 6, 2, C.metDD);
    p.rect(2, 4, 5, 2, C.met);
    p.rect(3, 8, 3, 3, C.suitD);              // grip
    p.rect(11, 4, 4, 4, C.metD);
    p.rect(15, 4, 2, 4, charge ? C.cyan : C.cyanD);
    p.rect(6, 2, 4, 2, C.cyanD);              // energy cell
    p.outline(C.ink);
    return p;
  }
  reg('gun', [buildGun(false), buildGun(true)], 3, 6);

  /* -------------------------------------------------------------------- ship
     The Rustmaw: a fat little mining barge with landing legs and a bay door. */
  function buildShip(blink, P) {
    P = P || { met: C.met, metD: C.metD, metDD: C.metDD };
    const p = pix(84, 52);
    // landing legs first so the hull covers their tops
    p.line(16, 32, 10, 47, P.metDD); p.line(17, 32, 11, 47, P.metDD);
    p.line(67, 32, 73, 47, P.metDD); p.line(66, 32, 72, 47, P.metDD);
    p.round(5, 46, 12, 4, 2, P.metD);
    p.round(66, 46, 12, 4, 2, P.metD);

    // hull
    p.round(6, 12, 72, 24, 10, P.met);
    p.shade(P.met, P.metD, 0, 1);
    p.round(9, 14, 66, 5, 2, C.white);
    p.round(6, 30, 72, 7, 6, P.metD);

    // engine pods
    p.round(0, 17, 10, 12, 4, P.metDD);
    p.round(74, 17, 10, 12, 4, P.metDD);
    p.rect(2, 21, 3, 4, C.cyan);
    p.rect(79, 21, 3, 4, C.cyan);

    // cockpit dome
    p.disc(28, 12, 11, C.glass);
    p.disc(28, 13, 8, C.ink2);
    p.ellipse(25, 8, 3.2, 1.6, C.glassL);
    p.round(18, 12, 21, 3, 1, P.metD);

    // bay door + tractor emitter
    p.round(36, 33, 16, 5, 2, P.metDD);
    p.rect(40, 35, 8, 3, blink ? C.cyan : C.cyanD);

    // hull lights and decal
    p.disc(58, 24, 2.4, blink ? C.gold : C.goldD);
    p.disc(50, 24, 2.4, C.red);
    p.disc(66, 24, 2.4, C.lime);
    // tiny skull decal, because we are the villain
    p.round(13, 20, 8, 7, 2, C.gold);
    p.rect(15, 22, 2, 2, C.ink); p.rect(18, 22, 2, 2, C.ink);
    p.rect(16, 25, 3, 1, C.ink);

    // antenna
    p.line(45, 12, 45, 3, P.metD);
    p.disc(45, 2, 2, C.red);

    p.outline(C.ink);
    return p;
  }
  reg('ship', [buildShip(false), buildShip(true)], 42, 26);

  /* ------------------------------------------------------------------- drone */
  function buildDrone(phase) {
    const p = pix(14, 12);
    p.round(3, 4, 8, 6, 2, C.met);
    p.shade(C.met, C.metD, 0, 1);
    p.disc(7, 6.5, 2, C.cyan);
    const lift = phase ? 0 : 1;
    p.rect(0, 3 + lift, 4, 1, C.metD);
    p.rect(10, 3 + lift, 4, 1, C.metD);
    p.rect(5, 10, 4, 2, C.metDD);
    p.outline(C.ink);
    return p;
  }
  reg('drone', [buildDrone(0), buildDrone(1)], 7, 6);

  /* ----------------------------------------------------------------- enemies */
  function buildGrub(phase) {
    const p = pix(20, 14);
    const hump = phase === 1 ? 1 : 0;
    p.ellipse(10, 8 - hump, 8, 4.4, C.limeD);
    p.ellipse(10, 7 - hump, 7.4, 3.6, C.lime);
    for (let i = 0; i < 4; i++) p.rect(4 + i * 4, 4 - hump, 2, 3, C.limeD); // back ridges
    // legs
    for (let i = 0; i < 3; i++) {
      const lx = 5 + i * 5, d = ((i + phase) % 2) ? 1 : 0;
      p.line(lx, 11 - hump, lx - 1, 13 - d, C.ink2);
    }
    // face at the right end
    p.ellipse(15, 7 - hump, 1.5, 2, C.eye);
    p.set(16, 6 - hump, C.white);
    p.ellipse(12, 7 - hump, 1.5, 2, C.eye);
    p.set(13, 6 - hump, C.white);
    p.rect(17, 9 - hump, 2, 1, C.redD);
    p.outline(C.ink);
    return p;
  }
  reg('grub', [buildGrub(0), buildGrub(1)], 10, 8);

  function buildJelly(phase) {
    const p = pix(18, 22);
    const squash = phase === 1 ? 1 : 0;
    p.ellipse(9, 7 + squash, 7.5 - squash, 6 + squash, C.purple);
    p.shade(C.purple, C.purpleD, 0, 1);
    p.ellipse(6.5, 4 + squash, 2.4, 1.4, C.white);
    // tentacles
    for (let i = 0; i < 4; i++) {
      const tx = 3 + i * 4;
      const wob = ((i + phase) % 2) ? 1 : -1;
      p.line(tx, 12 + squash, tx + wob, 16 + squash, C.purpleD);
      p.line(tx + wob, 16 + squash, tx, 20, C.purpleD);
    }
    // one big cyclops eye
    p.disc(9, 8 + squash, 2.6, C.white);
    p.disc(9.5, 8 + squash, 1.5, C.eye);
    p.outline(C.ink);
    return p;
  }
  reg('jelly', [buildJelly(0), buildJelly(1)], 9, 8);

  function buildSpit(phase) {
    const p = pix(22, 16);
    p.ellipse(9, 9, 8, 6, C.slimeD);
    p.ellipse(9, 8, 7, 5, C.slime);
    p.ellipse(6, 5, 2.6, 1.4, C.white);
    // snout
    const open = phase === 1 ? 1 : 0;
    p.round(16, 6 - open, 5, 5 + open * 2, 1, C.slimeD);
    p.rect(20, 8 - open, 2, 2 + open, C.ink2);
    // eyes
    p.ellipse(9, 7, 1.6, 2.1, C.eye); p.set(10, 6, C.white);
    p.ellipse(13, 7, 1.6, 2.1, C.eye); p.set(14, 6, C.white);
    // spikes
    p.spike(5, 1, 4, 3, -1, C.slimeD);
    p.spike(10, 1, 4, 3, -1, C.slimeD);
    p.outline(C.ink);
    return p;
  }
  reg('spit', [buildSpit(0), buildSpit(1)], 9, 9);

  function buildGnasher(phase) {
    const p = pix(24, 17);
    p.ellipse(11, 9, 9.5, 6.5, C.orangeD);
    p.ellipse(11, 8, 8.6, 5.6, C.orange);
    p.ellipse(7, 4, 3, 1.6, C.white);
    // huge mouth on the right
    const gape = phase === 1 ? 2 : 0;
    p.round(15, 6 - gape, 8, 7 + gape * 2, 2, C.redD);
    for (let i = 0; i < 3; i++) {
      p.spike(17 + i * 2, 6 - gape, 3, 3, 1, C.white);
      p.spike(17 + i * 2, 10 + gape, 3, 3, -1, C.white);
    }
    // angry eyes
    p.ellipse(10, 7, 1.8, 2.2, C.eye); p.set(11, 6, C.white);
    p.ellipse(14, 7, 1.8, 2.2, C.eye); p.set(15, 6, C.white);
    p.line(8, 3, 12, 4, C.ink); p.line(13, 4, 16, 3, C.ink);
    // back spines
    p.spike(5, 0, 5, 4, -1, C.orangeD);
    p.spike(10, 0, 5, 4, -1, C.orangeD);
    p.outline(C.ink);
    return p;
  }
  reg('gnasher', [buildGnasher(0), buildGnasher(1)], 11, 9);

  function buildLurker(phase) {
    const p = pix(30, 26);
    const bob = phase === 1 ? 1 : 0;
    // tentacle skirt
    for (let i = 0; i < 5; i++) {
      const tx = 5 + i * 5;
      const wob = ((i + phase) % 2) ? 1 : -1;
      p.line(tx, 17, tx + wob, 21, C.purpleD);
      p.line(tx + wob, 21, tx, 25 - bob, C.purpleD);
      p.set(tx, 25 - bob, C.red);
    }
    p.ellipse(14, 11 + bob, 12, 9, C.purpleD);
    p.ellipse(14, 10 + bob, 11, 8, C.purple);
    p.ellipse(9, 5 + bob, 4, 2, C.glassL);
    // single glowing eye
    p.disc(15, 11 + bob, 4.4, C.white);
    p.disc(16, 11 + bob, 2.8, C.red);
    p.disc(16.5, 11 + bob, 1.2, C.ink);
    // horns
    p.spike(6, 1 + bob, 6, 5, -1, C.purpleD);
    p.spike(20, 1 + bob, 6, 5, -1, C.purpleD);
    p.outline(C.ink);
    return p;
  }
  reg('lurker', [buildLurker(0), buildLurker(1)], 14, 12);

  function buildWarden(phase) {
    const p = pix(40, 36);
    const bob = phase === 1 ? 1 : 0;
    // armoured legs
    for (let i = 0; i < 4; i++) {
      const lx = 6 + i * 9, d = ((i + phase) % 2) ? 1 : 0;
      p.line(lx, 26, lx - 2, 32 - d, C.metDD);
      p.line(lx - 2, 32 - d, lx - 3, 35, C.metDD);
      p.rect(lx - 5, 34, 5, 2, C.metD);
    }
    p.ellipse(20, 17 + bob, 16, 12, C.metDD);
    p.ellipse(20, 16 + bob, 15, 11, C.metD);
    p.ellipse(20, 14 + bob, 12, 7, C.met);
    p.shade(C.met, C.metD, 0, 1);
    // armour plates
    for (let i = 0; i < 4; i++) p.rect(8 + i * 8, 8 + bob, 5, 3, C.orangeD);
    // giant core eye
    p.disc(20, 18 + bob, 6.5, C.ink2);
    p.disc(20, 18 + bob, 5, C.orange);
    p.disc(20, 18 + bob, 2.6, C.gold);
    p.disc(19, 17 + bob, 1.2, C.white);
    // shoulder spikes
    p.spike(6, 2 + bob, 8, 7, -1, C.metDD);
    p.spike(34, 2 + bob, 8, 7, -1, C.metDD);
    p.outline(C.ink);
    return p;
  }
  reg('warden', [buildWarden(0), buildWarden(1)], 20, 18);

  /* CAVE MITE: tiny, fast, comes in clouds. */
  function buildMite(phase) {
    const p = pix(10, 9);
    p.ellipse(5, 4, 3.6, 2.6, C.limeD);
    p.ellipse(5, 3.6, 3, 2, C.lime);
    p.set(6, 3, C.eye); p.set(4, 3, C.eye);
    const f = phase ? 1 : -1;
    p.line(1, 4, 0, 2 + f, C.ink2); p.line(9, 4, 10, 2 - f, C.ink2);
    p.line(2, 6, 1, 8, C.ink2); p.line(8, 6, 9, 8, C.ink2);
    p.outline(C.ink);
    return p;
  }
  reg('mite', [buildMite(0), buildMite(1)], 5, 4);

  /* SHELLBACK: armoured slab of a beast; shots glance off the carapace. */
  function buildShellback(phase) {
    const p = pix(28, 20);
    const lift = phase ? 1 : 0;
    for (let i = 0; i < 4; i++) {
      const lx = 5 + i * 6, d = ((i + phase) % 2) ? 1 : 0;
      p.line(lx, 15, lx - 1, 19 - d, C.ink2);
    }
    p.ellipse(13, 10, 12, 7, C.metDD);
    p.ellipse(13, 9 - lift, 11, 6, C.metD);
    for (let i = 0; i < 3; i++) p.round(4 + i * 7, 4 - lift, 5, 5, 2, C.met);   // plates
    p.rect(3, 9 - lift, 20, 1, C.metDD);
    // head at the right
    p.ellipse(24, 12, 3.4, 2.8, C.orangeD);
    p.ellipse(24.5, 11.5, 2.6, 2, C.orange);
    p.set(25, 11, C.eye); p.set(26, 11, C.eye);
    p.rect(26, 13, 2, 1, C.redD);
    p.outline(C.ink);
    return p;
  }
  reg('shellback', [buildShellback(0), buildShellback(1)], 14, 12);

  /* MAGMA WYRM: lives in the lava, bursts out to bite. */
  function buildWyrm(phase) {
    const p = pix(30, 20);
    const und = phase ? 1 : 0;
    // segmented body trailing left
    for (let i = 0; i < 4; i++) {
      const bx = 4 + i * 5, by = 12 + Math.sin(i * 1.4 + und) * 2;
      p.disc(bx, by, 3.4 - i * 0.3, C.redD);
      p.disc(bx, by - 1, 2.4 - i * 0.25, C.orange);
    }
    // head
    p.ellipse(22, 9 - und, 6.5, 5, C.redD);
    p.ellipse(22, 8 - und, 5.5, 4, C.orange);
    p.ellipse(21, 5 - und, 2.6, 1.2, C.gold);
    p.round(24, 8 - und, 6, 4 + und, 1, C.ink2);           // maw
    for (let i = 0; i < 3; i++) p.set(25 + i * 2, 8 - und, C.white);
    p.ellipse(21, 7 - und, 1.5, 1.7, C.eye); p.set(22, 6 - und, C.gold);
    p.spike(18, 1 - und, 4, 4, -1, C.redD);
    p.outline(C.ink);
    return p;
  }
  reg('wyrm', [buildWyrm(0), buildWyrm(1)], 15, 11);

  /* SCATTERGUN and LANCE: the other two things you point at problems. */
  function buildScatter(charge) {
    const p = pix(20, 11);
    p.round(0, 3, 12, 6, 2, C.metDD);
    p.rect(2, 4, 6, 2, C.met);
    p.rect(3, 8, 3, 3, C.suitD);
    p.rect(12, 3, 6, 3, C.metD); p.rect(12, 6, 6, 3, C.metD);
    p.rect(17, 4, 2, 1, charge ? C.orange : C.orangeD); p.rect(17, 7, 2, 1, charge ? C.orange : C.orangeD);
    p.rect(6, 2, 4, 2, C.orangeD);
    p.outline(C.ink);
    return p;
  }
  reg('scatter', [buildScatter(false), buildScatter(true)], 3, 6);

  function buildLance(charge) {
    const p = pix(24, 11);
    p.round(0, 3, 10, 6, 2, C.metDD);
    p.rect(2, 4, 5, 2, C.met);
    p.rect(3, 8, 3, 3, C.suitD);
    p.rect(10, 4, 10, 4, C.metD);
    for (let i = 0; i < 3; i++) p.rect(11 + i * 3, 5, 2, 2, charge ? C.purple : C.purpleD);
    p.rect(20, 3, 3, 6, charge ? C.cyan : C.cyanD);
    p.outline(C.ink);
    return p;
  }
  reg('lance', [buildLance(false), buildLance(true)], 3, 6);

  /* SPACE SCOOTER: a hover-bike, drawn heading right; the rider sits on top. */
  function buildScooter(phase) {
    const p = pix(30, 16);
    const f = phase ? 1 : 0;
    p.round(4, 6, 22, 7, 3, C.metD);                  // body
    p.round(6, 4, 14, 4, 2, C.met);                    // saddle
    p.round(20, 3, 8, 5, 2, C.suit);                   // nose cowl
    p.rect(26, 5, 3, 2, C.cyan);                       // headlamp
    p.round(0, 8, 7, 5, 2, C.metDD);                   // engine
    p.rect(1, 9, 2, 3, f ? C.orange : C.orangeD);
    p.rect(8, 13, 5, 2, C.metDD); p.rect(18, 13, 5, 2, C.metDD);   // skids
    p.rect(12, 2, 2, 3, C.metDD); p.rect(11, 1, 4, 1, C.metD);       // handlebar
    p.rect(9, 8, 10, 1, C.gold);
    p.outline(C.ink);
    return p;
  }
  reg('scooter', [buildScooter(0), buildScooter(1)], 15, 8);

  /* THE POD: your own little fat ship. Round, stubby-winged, a dome up top
     and one big thruster. Heads right. */
  /* The pod at 2x: little, fat, riveted, with a bubble dome you can see into,
     twin nacelles, landing skids and a working exhaust. */
  /* THE DUMB UFO. One saucer, built once, used everywhere: it is the thing
     parked on bricks outside your house AND the thing hanging over the dig
     site. Wonky, dented, a satellite dish gaffer-taped to the roof, one leg
     that gave up years ago. Faceted throughout -- no ovals in it anywhere. */
  function buildSaucer(phase, P, landed) {
    P = P || { met: '#b6b0c8', metD: '#8e86a8', metDD: '#7d7396' };
    const p = pix(132, 76);
    const f = phase ? 1 : 0;
    const HULL = P.met, HULD = P.metD, HULDD = P.metDD;

    // the skirt: a wide bevelled slab, widest at the rim
    p.round(4, 30, 124, 14, 7, HULD);
    p.round(10, 26, 112, 14, 7, HULL);
    p.shade(HULL, HULDD, 0, 1);
    p.round(22, 22, 88, 10, 5, '#d6d0e8');
    p.rect(14, 36, 104, 2, HULDD);

    // the dome, a cut-glass box with a pilot-shaped hole in it
    p.round(44, 2, 44, 24, 10, C.glass);
    p.round(50, 7, 32, 15, 6, '#2a2440');
    p.rect(54, 10, 8, 3, '#eafcff');
    p.rect(50, 5, 32, 2, C.glassL);

    // dents: this thing has been reversed into a moon
    p.round(2, 34, 22, 10, 4, '#8e86a8');
    p.round(108, 34, 22, 10, 4, '#8e86a8');
    p.rect(38, 28, 22, 3, '#c46a3a');                    // rust
    p.rect(76, 30, 14, 2, '#c46a3a');
    p.rect(28, 24, 10, 2, '#c46a3a');

    // rim lights, chasing
    for (let i = 0; i < 8; i++) {
      const on = (i + f) % 2 === 0;
      p.round(14 + i * 14, 38, 8, 6, 2, on ? '#ffd34d' : '#5a5474');
      if (on) p.rect(15 + i * 14, 39, 6, 2, '#fff3c0');
    }

    // a satellite dish taped to the roof, aimed at nothing
    p.rect(92, 2, 3, 22, P.metDD || '#39405e');
    p.round(84, 0, 22, 8, 4, '#8e86a8');
    p.round(88, 1, 14, 5, 2, '#c9c4b4');
    p.rect(88, 10, 12, 3, '#ffe98a');                    // the tape
    p.rect(90, 13, 8, 2, '#e0c96a');

    if (landed) {
      // up on two bricks, with one leg that has given up
      p.round(20, 44, 24, 14, 3, '#8a5a3a');
      p.round(88, 44, 24, 14, 3, '#8a5a3a');
      p.rect(22, 48, 20, 2, '#6b4530');
      p.rect(90, 48, 20, 2, '#6b4530');
      p.rect(24, 54, 20, 2, '#6b4530');
      p.round(60, 42, 8, 18, 3, '#39405e');
      p.round(52, 58, 24, 6, 2, '#5e6688');
      p.round(74, 50, 16, 5, 2, '#39405e');              // the collapsed one
      p.rect(86, 54, 10, 3, '#5e6688');
    } else {
      // in flight: skids tucked, and a wash of light under the belly
      p.round(26, 44, 14, 8, 3, '#39405e');
      p.round(92, 44, 14, 8, 3, '#39405e');
      const glow = f ? '#ffe08a' : '#ffb03d';
      p.round(40, 44, 52, 8, 4, glow);
      p.round(50, 48, 32, 8, 4, f ? '#ffd34d' : '#ff9b3d');
      p.round(58, 54, 16, 8, 4, f ? '#fff6c8' : '#ffd34d');
      p.rect(6, 40, 8, 3, f ? '#7ef9ff' : '#2f8fae');
      p.rect(118, 40, 8, 3, f ? '#7ef9ff' : '#2f8fae');
    }
    p.outline(C.ink);
    return p;
  }
  PD.buildSaucer = buildSaucer;

  reg('pod', [buildSaucer(0), buildSaucer(1)], 33, 22, 2);

  /* LOOT CRATE: precursor supply case. */
  function buildCrate(open) {
    const p = pix(16, 13);
    p.round(1, 3, 14, 10, 2, C.metDD);
    p.rect(3, 5, 10, 2, open ? C.gold : C.metD);
    p.rect(1, 2, 14, 2, open ? C.gold : C.metD);
    p.rect(7, 2, 2, 11, C.metDD);
    p.set(7, 6, open ? C.gold : C.orange); p.set(8, 6, open ? C.gold : C.orange);
    p.outline(C.ink);
    return p;
  }
  reg('crate', [buildCrate(false), buildCrate(true)], 8, 7);

  /* ------------------------------------------------------------------ pickups
     One small gem sprite per material tint, plus a generic rubble nugget. */
  /* ------------------------------------------------------------------- ore
     Every material gets its own chunk, drawn at 2x with real facets: cut gems
     with a table and a crown, metal nuggets with a bevel and a glint, rubble
     with chipped corners, ice shards, fossils, relics. All from the three
     colours in the material table, so all thirty exist. */
  const ORE_CLASS = {
    crust: 'rock', stone: 'rock', basalt: 'rock', shell: 'rock', hull: 'plate',
    iron: 'metal', copper: 'metal', silver: 'metal', gold: 'metal', titan: 'metal', star: 'metal',
    ice: 'ice', frost: 'ice',
    emerald: 'gem', sapphire: 'gem', ruby: 'gem', ameth: 'gem', diamond: 'gem', void: 'gem',
    crystal: 'shard', obsid: 'shard', aether: 'shard', uran: 'shard',
    fungus: 'cap', bio: 'bio', fossil: 'fossil', relic: 'relic'
  };

  function speck(p, w, h, seed, col, n) {
    for (let i = 0; i < n; i++) {
      const x = 2 + Math.floor(U.hash2(seed + i * 3, 11) * (w - 4));
      const y = 2 + Math.floor(U.hash2(seed + i * 7, 23) * (h - 4));
      p.set(x, y, col);
    }
  }

  function buildOre(m) {
    const c = m.c, kind = ORE_CLASS[m.key] || 'rock';
    const seed = m.id * 13 + 5;
    const p = pix(24, 22);
    const L = c[0], M = c[1], D2 = c[2];

    if (kind === 'gem') {
      // table on top, crown facets, pointed pavilion
      p.rect(6, 5, 12, 2, L);                       // table
      p.rect(5, 7, 14, 3, M);
      for (let i = 0; i < 4; i++) { p.rect(5 + i, 4 + i, 14 - i * 2, 1, i ? M : L); }
      p.spike(4, 10, 16, 10, 1, M);                 // pavilion
      p.spike(7, 10, 10, 8, 1, L);
      p.spike(10, 10, 4, 9, 1, D2);
      p.line(5, 10, 12, 19, D2); p.line(18, 10, 12, 19, D2);
      p.rect(7, 4, 4, 1, '#ffffff');                // sparkle on the table
      p.set(8, 6, '#ffffff'); p.set(9, 6, '#ffffff');
      p.set(15, 9, D2); p.set(16, 10, D2);
    } else if (kind === 'shard') {
      // a raw cluster: three uneven prisms
      p.spike(3, 8, 7, 12, -1, D2);
      p.spike(14, 6, 7, 14, -1, M);
      p.spike(8, 2, 9, 18, -1, M);
      p.rect(11, 5, 2, 12, L);
      p.rect(5, 12, 2, 6, L); p.rect(16, 11, 2, 8, L);
      p.rect(4, 18, 16, 2, D2);
      p.set(11, 4, '#ffffff'); p.set(12, 6, '#ffffff');
    } else if (kind === 'metal') {
      // rounded nugget with a hard bevel and a glint
      p.round(3, 6, 18, 12, 4, M);
      p.round(4, 7, 15, 4, 3, L);
      p.rect(5, 15, 14, 3, D2);
      p.round(6, 8, 6, 3, 1, '#ffffff');
      p.set(7, 12, L); p.set(13, 11, L); p.set(16, 13, D2); p.set(9, 15, D2);
      speck(p, 24, 22, seed, D2, 3);
      p.rect(8, 4, 3, 2, L); p.rect(15, 5, 2, 2, M);   // little lumps on top
    } else if (kind === 'ice') {
      p.spike(4, 4, 16, 16, 1, M);
      p.spike(7, 4, 10, 12, 1, L);
      p.rect(9, 6, 2, 9, '#ffffff');
      p.rect(5, 16, 14, 3, D2);
      p.set(14, 8, '#ffffff'); p.set(15, 10, L);
    } else if (kind === 'plate') {
      p.round(3, 7, 18, 10, 2, M);
      p.rect(4, 8, 16, 2, L);
      p.rect(4, 14, 16, 2, D2);
      for (let i = 0; i < 4; i++) p.set(6 + i * 4, 11, D2);
      p.rect(2, 10, 2, 4, D2); p.rect(20, 10, 2, 4, D2);
    } else if (kind === 'cap') {
      p.rect(10, 12, 4, 7, D2);                    // stalk
      p.round(4, 5, 16, 8, 4, M);
      p.round(5, 6, 13, 3, 3, L);
      p.set(8, 9, L); p.set(14, 8, L); p.set(11, 10, L);
      p.rect(8, 18, 8, 2, D2);
    } else if (kind === 'bio') {
      p.round(4, 6, 16, 13, 6, M);
      p.round(6, 7, 11, 4, 3, L);
      p.rect(8, 12, 3, 4, C.eye); p.rect(14, 12, 3, 4, C.eye);
      p.set(8, 12, '#ffffff'); p.set(14, 12, '#ffffff');
      p.rect(10, 17, 5, 1, D2);
      speck(p, 24, 22, seed, L, 4);
    } else if (kind === 'fossil') {
      // a coiled ammonite in a chip of stone
      p.round(3, 5, 18, 15, 4, D2);
      p.round(4, 6, 16, 4, 3, M);
      const spiral = [[12, 12], [12, 10], [14, 10], [15, 12], [14, 14], [11, 15], [8, 13], [8, 10], [10, 7], [14, 6], [17, 9]];
      for (let i = 0; i < spiral.length; i++) p.set(spiral[i][0], spiral[i][1], i % 2 ? L : '#ffffff');
      for (let i = 0; i < spiral.length - 1; i++) p.line(spiral[i][0], spiral[i][1], spiral[i + 1][0], spiral[i + 1][1], L);
      p.set(12, 12, '#ffffff');
    } else if (kind === 'relic') {
      // an ornate little idol on a base
      p.rect(6, 17, 12, 3, D2);
      p.rect(8, 14, 8, 3, M);
      p.round(7, 6, 10, 9, 3, M);
      p.rect(9, 8, 6, 2, D2);
      p.rect(11, 10, 2, 4, L);
      p.spike(8, 2, 8, 5, -1, L);
      p.set(12, 3, '#ffffff');
      p.rect(4, 8, 2, 6, L); p.rect(18, 8, 2, 6, L);
      p.set(5, 7, '#ffffff'); p.set(19, 7, '#ffffff');
    } else {
      // rubble: a chipped chunk with a flat lit top
      p.round(3, 7, 18, 12, 3, M);
      p.rect(4, 8, 15, 3, L);
      p.rect(5, 16, 14, 3, D2);
      p.set(6, 12, D2); p.set(15, 13, D2); p.set(10, 14, L);
      p.rect(2, 11, 2, 3, M); p.rect(20, 12, 2, 3, M);
      speck(p, 24, 22, seed, D2, 5);
      p.set(8, 6, M); p.set(14, 5, M);
    }
    if (m.glow) { p.set(12, 8, '#ffffff'); p.set(11, 9, '#ffffff'); }
    p.outline(C.ink);
    return p;
  }

  const gemSprites = {};
  function gemFor(matId) {
    if (gemSprites[matId]) return gemSprites[matId];
    const m = PD.data.MAT[matId];
    const cv = buildOre(m).toCanvas();
    gemSprites[matId] = { frames: [cv], w: cv.width / 2, h: cv.height / 2, hd: 2, ox: cv.width / 4, oy: cv.height / 4 };
    return gemSprites[matId];
  }
  /* Small ore chip for lists: the same sprite, drawn to fit a row. */
  function oreChip(ctx, matId, x, y, size) {
    const s = gemFor(matId);
    const cv = s.frames[0];
    const k = (size || 11) / (cv.width / 2);
    ctx.drawImage(cv, Math.round(x), Math.round(y), Math.round(cv.width / 2 * k), Math.round(cv.height / 2 * k));
  }

  /* ---------------------------------------------------------------- ui icons */
  const ICON = {};
  function icon(name, fn) {
    const p = pix(16, 16);
    fn(p);
    p.outline(C.ink);
    ICON[name] = p.toCanvas();
  }
  icon('drill', p => { p.rect(1, 6, 6, 4, C.metDD); for (let x = 7; x < 15; x++) { const h = Math.max(1, 3 - (x - 7) * 0.35); for (let y = -h; y <= h; y++) p.set(x, 8 + y, ((x + y) % 3) ? C.met : C.metD); } });
  icon('arm', p => { p.rect(1, 7, 10, 3, C.metD); p.round(10, 4, 5, 9, 2, C.orange); p.rect(2, 8, 6, 1, C.met); });
  icon('tank', p => { p.round(4, 2, 8, 12, 3, C.cyan); p.rect(6, 0, 4, 3, C.metD); p.rect(6, 5, 2, 6, C.white); });
  icon('pod', p => { p.round(1, 4, 14, 10, 2, C.orangeD); p.rect(1, 6, 14, 2, C.orange); p.rect(7, 4, 2, 10, C.metD); });
  icon('hull', p => { p.round(2, 1, 12, 10, 3, C.met); p.spike(8, 8, 12, 6, 1, C.met); p.rect(6, 4, 4, 4, C.cyan); });
  icon('thrust', p => { p.round(5, 1, 6, 8, 2, C.metD); p.spike(8, 9, 8, 6, 1, C.orange); p.spike(8, 9, 4, 4, 1, C.gold); });
  icon('gun', p => { p.round(1, 5, 10, 5, 2, C.metDD); p.rect(3, 9, 3, 4, C.suitD); p.rect(11, 6, 4, 3, C.cyan); });
  icon('coil', p => { p.disc(8, 8, 6, C.metD); p.disc(8, 8, 3, C.cyan); for (let i = 0; i < 4; i++) p.rect(7, 0 + i * 4, 2, 2, C.gold); });
  icon('lamp', p => { p.round(2, 4, 6, 8, 2, C.metD); p.spike(11, 8, 12, 8, 1, C.gold); p.rect(4, 6, 2, 4, C.white); });
  icon('magnet', p => { p.round(2, 2, 12, 10, 4, C.red); p.rect(5, 7, 6, 7, null); p.rect(2, 10, 4, 4, C.met); p.rect(10, 10, 4, 4, C.met); });
  icon('drone', p => { p.round(4, 5, 8, 6, 2, C.met); p.disc(8, 8, 2, C.cyan); p.rect(0, 3, 5, 1, C.metD); p.rect(11, 3, 5, 1, C.metD); });
  icon('scatter', p => { p.round(1, 5, 9, 6, 2, C.metDD); p.rect(9, 5, 6, 2, C.metD); p.rect(9, 8, 6, 2, C.metD); p.rect(3, 10, 3, 4, C.suitD); });
  icon('lance', p => { p.round(1, 6, 8, 5, 2, C.metDD); p.rect(8, 7, 7, 3, C.purpleD); p.rect(14, 5, 2, 7, C.cyan); p.rect(3, 10, 3, 4, C.suitD); });
  icon('dash', p => { p.round(6, 4, 8, 8, 3, C.met); p.spike(4, 8, 6, 5, 1, C.orange); p.rect(0, 6, 4, 1, C.gold); p.rect(0, 9, 4, 1, C.gold); p.rect(1, 12, 3, 1, C.gold); });
  icon('scan', p => { p.disc(8, 8, 7, C.metDD); p.disc(8, 8, 5, C.ink2); p.disc(8, 8, 2, C.cyan); for (let a = 0; a < 6.3; a += 0.8) p.set(8 + Math.cos(a) * 5, 8 + Math.sin(a) * 5, C.cyanD); p.line(8, 8, 12, 4, C.cyan); });
  icon('claw', p => { p.rect(7, 1, 2, 6, C.metD); p.line(7, 7, 3, 13, C.met); p.line(9, 7, 13, 13, C.met); p.rect(2, 12, 3, 3, C.orange); p.rect(11, 12, 3, 3, C.orange); });

  /* ------------------------------------------------------------ cosmetics
     Sprites are code, so a repaint is just a rebuild with a new palette.
     Cached by option ids -- a wardrobe change rebuilds three little sheets. */
  const skinCache = {};

  function optOf(catId, id) {
    const cat = PD.data.COS[catId];
    return cat.options.find(o => o.id === id) || cat.options[0];
  }

  function skinFor(cos) {
    cos = cos || {};
    const key = [cos.suit, cos.skin, cos.glass, cos.drill, cos.trim].join('|');
    if (skinCache[key]) return skinCache[key];

    const suit = optOf('suit', cos.suit), skin = optOf('skin', cos.skin);
    const glass = optOf('glass', cos.glass), bit = optOf('drill', cos.drill);
    const trim = optOf('trim', cos.trim);

    const P = {
      suit: suit.c[0], suitD: suit.c[1], suitL: suit.c[2],
      skin: skin.c[0], skinD: skin.c[1], skinL: skin.c[2],
      glass: glass.c[0], glassD: glass.c[1], glassL: glass.c[2]
    };
    const DP = { met: bit.c[0], metDD: bit.c[1], accent: bit.c[2] };
    const SP = { met: trim.c[0], metD: trim.c[1], metDD: trim.c[2] };

    const mk = (builders, ox, oy, hd) => {
      const frames = builders.map(b => b.toCanvas());
      const k = hd || 1;
      return { frames, w: frames[0].width / k, h: frames[0].height / k, ox, oy, hd: k };
    };
    const frames = alienSet(P);
    const set = {
      alien: mk(frames.idle, AOX, AOY, 2),
      alienWalk: mk(frames.walk, AOX, AOY, 2),
      alienFly: mk(frames.fly, AOX, AOY, 2),
      alienDrill: mk(frames.drill, AOX, AOY, 2),
      alienRoll: mk(frames.roll, AOX, 35, 2),
      drill: mk([0, 1, 2, 3].map(i => buildDrill(i, DP)), 5, 6, 2),
      ship: mk([buildShip(false, SP), buildShip(true, SP)], 42, 26),
      pod: mk([buildSaucer(0, SP), buildSaucer(1, SP)], 33, 22, 2),
      P: P
    };
    skinCache[key] = set;
    return set;
  }

  PD.art = { C, sprites, gemFor, oreChip, buildOre, ICON, skinFor, optOf, reg, blit, buildSaucer, pixOf: pix };
})(window.PD);
