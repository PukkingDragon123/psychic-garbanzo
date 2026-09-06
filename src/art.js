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
  /* The alien, at 2x density: a small, very fat businessman in a navy suit,
     pink tie and fishbowl helmet. Poses squash and stretch, and the drill
     pose plants his feet and leans his whole weight into the tool. */
  const BIZ = {
    jacket: '#2b3a66', jacketL: '#40568f', jacketD: '#1b2547',
    shirt: '#f6f3ff', trousers: '#1b2547', shoe: '#141a2e', shoeL: '#4a5c8f',
    brass: '#b08a3a', brassL: '#e6c26a'
  };

  function buildAlien(pose, f, P, blink) {
    P = P || C;
    const p = pix(60, 80);
    const walk = pose === 'walk', fly = pose === 'fly', drill = pose === 'drill', roll = pose === 'roll';
    const tie = P.suit, tieD = P.suitD;

    if (roll) {
      // tucked into a ball: suit, helmet, two shoes poking out
      p.disc(30, 50, 22, BIZ.jacket);
      p.shade(BIZ.jacket, BIZ.jacketD, 0, 1);
      p.ellipse(30, 40, 12, 6, BIZ.jacketL);
      p.round(20, 66, 10, 6, 3, BIZ.shoe); p.round(32, 68, 10, 6, 3, BIZ.shoe);
      p.disc(30, 44, 14, P.glass);
      p.disc(30, 46, 10, P.skin);
      p.shade(P.skin, P.skinD, 1, 1);
      p.ellipse(26, 47, 3, 3.6, C.eye); p.ellipse(35, 47, 3, 3.6, C.eye);
      p.disc(27, 45.5, 1.4, C.white); p.disc(36, 45.5, 1.4, C.white);
      p.rect(28, 53, 6, 2, P.skinD);
      p.rect(28, 58, 4, 8, tie);
      p.disc(46, 58, 4, P.skin); p.disc(14, 58, 4, P.skin);
      p.outline(C.ink);
      return p;
    }

    // squash and stretch
    const bob = fly ? -2 : (walk ? [0, -2, 0, 2][f % 4] : (f === 1 ? 2 : 0));
    const sq = walk ? [0, 1, 0, -1][f % 4] : (f === 1 ? 1 : 0);
    const lean = drill ? 3 : 0;                       // whole body pushes into the drill
    const jit = drill ? (f % 2 ? 1 : -1) : 0;          // the drill shakes him
    const hy = 28 + bob, by = 56 + bob;               // helmet centre, belly centre

    // --- legs and shoes
    if (fly) {
      p.round(17, by + 10, 10, 8, 3, BIZ.trousers); p.round(33, by + 12, 10, 7, 3, BIZ.trousers);
      p.round(13, by + 16, 14, 6, 3, BIZ.shoe); p.round(33, by + 17, 14, 6, 3, BIZ.shoe);
    } else if (drill) {
      // braced wide, back foot dug in
      p.round(10, by + 8, 10, 10, 3, BIZ.trousers); p.round(36 + lean, by + 8, 10, 10, 3, BIZ.trousers);
      p.round(6, 74, 15, 6, 3, BIZ.shoe); p.round(34 + lean, 74, 15, 6, 3, BIZ.shoe);
      p.rect(8, 75, 5, 1, BIZ.shoeL); p.rect(36 + lean, 75, 5, 1, BIZ.shoeL);
    } else {
      const sw = walk ? [[-4, 4], [0, 0], [4, -4], [0, 0]][f % 4] : [0, 0];
      const lift = walk ? [[2, 0], [0, 0], [0, 2], [0, 0]][f % 4] : [0, 0];
      p.round(18 + sw[0], by + 8, 10, 10 - lift[0], 3, BIZ.trousers);
      p.round(32 + sw[1], by + 8, 10, 10 - lift[1], 3, BIZ.trousers);
      p.round(14 + sw[0], 74 - lift[0], 15, 6, 3, BIZ.shoe);
      p.round(31 + sw[1], 74 - lift[1], 15, 6, 3, BIZ.shoe);
      p.rect(16 + sw[0], 75 - lift[0], 5, 1, BIZ.shoeL);
      p.rect(33 + sw[1], 75 - lift[1], 5, 1, BIZ.shoeL);
    }

    // --- brass jetpack
    p.round(3, by - 12, 12, 22, 5, BIZ.brass);
    p.rect(5, by - 10, 4, 16, BIZ.brassL);
    p.disc(9, by - 8, 2, C.cyan);
    p.round(4, by + 10, 10, 4, 2, C.metDD);
    if (fly) { p.spike(4, by + 14, 10, 12, 1, C.orange); p.spike(6, by + 14, 6, 8, 1, C.gold); }

    // --- the belly, in a suit
    const bx = 30 + lean;
    p.ellipse(bx, by, 17 + sq, 13 - sq * 0.5, BIZ.jacket);
    p.shade(BIZ.jacket, BIZ.jacketD, 0, 1);
    // shirt and tie
    p.rect(bx - 3, by - 12, 7, 5, BIZ.shirt);
    p.rect(bx - 2, by - 7, 5, 6, BIZ.shirt);
    p.rect(bx - 1, by - 1, 3, 5, BIZ.shirt);
    p.rect(bx - 1, by - 10, 3, 3, tieD);
    p.rect(bx - 1, by - 7, 3, 9, tie);
    p.rect(bx - 2, by - 3, 5, 5, tie);
    p.spike(bx - 2, by + 2, 5, 4, 1, tieD);
    // lapels
    p.line(bx - 4, by - 12, bx - 9, by, BIZ.jacketL); p.line(bx - 3, by - 12, bx - 8, by, BIZ.jacketL);
    p.line(bx + 4, by - 12, bx + 9, by, BIZ.jacketL); p.line(bx + 3, by - 12, bx + 8, by, BIZ.jacketL);
    // buttons and pocket square
    p.disc(bx + 6, by + 3, 1.6, C.gold); p.disc(bx + 6, by + 7, 1.6, C.gold);
    p.rect(bx - 12, by - 4, 5, 2, '#ff8ad8');
    p.rect(bx - 12, by - 5, 3, 1, '#ffd6f0');

    // --- arms
    if (drill) {
      // both sleeves forward, hands stacked on the grip
      p.round(bx + 6 + jit, by - 8, 18, 8, 4, BIZ.jacket);
      p.round(bx + 4 + jit, by - 2, 20, 8, 4, BIZ.jacket);
      p.rect(bx + 20 + jit, by - 7, 3, 6, BIZ.shirt); p.rect(bx + 20 + jit, by - 1, 3, 6, BIZ.shirt);
      p.disc(bx + 25 + jit, by - 4, 4.4, P.skin); p.disc(bx + 25 + jit, by + 3, 4.4, P.skin);
      // back arm bracing behind
      p.round(6, by - 6, 8, 12, 4, BIZ.jacket);
    } else {
      const asw = walk ? [3, 0, -3, 0][f % 4] : 0;
      const fwd = fly ? -6 : 0;
      p.round(9, by - 6 + asw + fwd, 8, 16, 4, BIZ.jacket);
      p.rect(10, by + 7 + asw + fwd, 6, 2, BIZ.shirt);
      p.disc(13, by + 11 + asw + fwd, 4.2, P.skin);
      p.round(43, by - 6 - asw + fwd, 8, 16, 4, BIZ.jacket);
      p.rect(44, by + 7 - asw + fwd, 6, 2, BIZ.shirt);
      p.disc(47, by + 11 - asw + fwd, 4.2, P.skin);
      p.disc(13, by + 6 + asw + fwd, 1.2, C.gold); p.disc(47, by + 6 - asw + fwd, 1.2, C.gold);   // cufflinks
    }

    // --- collar ring
    p.round(bx - 14, hy + 14, 28, 6, 3, C.metD);
    for (let i = 0; i < 4; i++) p.set(bx - 10 + i * 7, hy + 16, C.met);

    // --- helmet and head
    const hx = 30 + lean;
    p.disc(hx, hy, 18, P.glass);
    p.disc(hx, hy + 2, 13, P.skin);
    p.shade(P.skin, P.skinD, 1, 1);
    p.ellipse(hx, hy - 5, 8, 3.4, P.skinL);
    if (blink) {
      p.rect(hx - 9, hy + 2, 7, 2, C.ink); p.rect(hx + 2, hy + 2, 7, 2, C.ink);
    } else {
      const squint = drill ? 1 : 0;
      p.ellipse(hx - 6, hy + 3, 4.4, 5.6 - squint * 1.5, C.eye);
      p.ellipse(hx + 6, hy + 3, 4.4, 5.6 - squint * 1.5, C.eye);
      p.disc(hx - 4.5, hy + 1, 2, C.white); p.disc(hx + 7.5, hy + 1, 2, C.white);
      p.set(hx - 7, hy + 5, C.white); p.set(hx + 5, hy + 5, C.white);
    }
    // one raised brow: a man with a plan
    p.line(hx - 11, hy - 4, hx - 3, hy - 6, C.ink);
    p.line(hx + 3, hy - 8, hx + 11, hy - 5, C.ink);
    // smirk / gritted teeth when drilling
    if (drill) { p.rect(hx - 4, hy + 9, 9, 3, C.ink); p.rect(hx - 3, hy + 10, 7, 1, C.white); }
    else { p.rect(hx - 3, hy + 10, 7, 2, P.skinD); p.set(hx + 4, hy + 9, P.skinD); p.set(hx + 5, hy + 8, P.skinD); }
    p.ellipse(hx - 13, hy + 7, 3, 2, '#ff8ab0'); p.ellipse(hx + 13, hy + 7, 3, 2, '#ff8ab0');
    // glass shine
    p.set(hx - 14, hy - 8, P.glassL); p.set(hx - 13, hy - 10, P.glassL); p.set(hx - 11, hy - 12, P.glassL);
    p.set(hx - 12, hy - 9, P.glassL); p.set(hx - 12, hy - 11, P.glassL); p.set(hx - 9, hy - 13, P.glassL);
    // antenna
    const aw = walk ? [2, 0, -2, 0][f % 4] : (f === 1 ? 2 : 0);
    p.line(hx, hy - 18, hx + aw, hy - 24, C.metD);
    p.disc(hx + aw, hy - 26, 3, C.gold);
    p.set(hx + aw - 1, hy - 27, C.white);

    p.outline(C.ink);
    return p;
  }

  function alienSet(P) {
    return {
      idle: [buildAlien('idle', 0, P), buildAlien('idle', 1, P), buildAlien('idle', 0, P, true)],
      walk: [0, 1, 2, 3].map(i => buildAlien('walk', i, P)),
      fly: [buildAlien('fly', 0, P), buildAlien('fly', 1, P)],
      drill: [buildAlien('drill', 0, P), buildAlien('drill', 1, P), buildAlien('drill', 2, P)],
      roll: [buildAlien('roll', 0, P)]
    };
  }

  const base = alienSet(C);
  const AOX = 15, AOY = 27;                         // logical anchor: the belly
  reg('alien', base.idle, AOX, AOY, 2);
  reg('alienWalk', base.walk, AOX, AOY, 2);
  reg('alienFly', base.fly, AOX, AOY, 2);
  reg('alienDrill', base.drill, AOX, AOY, 2);
  reg('alienRoll', base.roll, AOX, 25, 2);

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
  function buildPod(phase, P) {
    P = P || { met: C.met, metD: C.metD, metDD: C.metDD };
    const p = pix(92, 64);
    const f = phase ? 1 : 0;
    // engine block and nacelles
    p.round(0, 26, 24, 24, 8, P.metDD);
    p.round(4, 30, 12, 16, 6, C.ink2);
    p.round(5, 33 + f * 2, 8, 9, 3, f ? C.orange : C.orangeD);
    p.round(6, 35 + f * 2, 5, 5, 2, f ? C.gold : C.orange);
    p.round(12, 12, 16, 12, 6, P.metD); p.round(12, 48, 16, 12, 6, P.metD);
    p.rect(13, 16, 4, 4, f ? C.cyan : P.metDD); p.rect(13, 52, 4, 4, f ? C.cyan : P.metDD);
    // fat hull
    p.round(16, 18, 68, 36, 18, P.met);
    p.shade(P.met, P.metD, 0, 1);
    p.round(22, 22, 54, 7, 3, C.white);
    p.round(20, 42, 60, 10, 4, P.metD);
    p.round(30, 44, 40, 5, 2, C.gold);
    for (let i = 0; i < 7; i++) { p.disc(26 + i * 8, 40, 1.4, P.metDD); }
    // dome and pilot seat
    p.disc(46, 20, 16, C.glass);
    p.disc(46, 22, 12, C.ink2);
    p.ellipse(40, 14, 6, 3, C.glassL);
    p.round(38, 24, 16, 10, 4, P.metDD);
    p.round(40, 26, 12, 6, 3, '#ff5fa8');
    // nose cowl and headlight
    p.round(76, 28, 16, 16, 6, C.suit);
    p.rect(88, 32, 4, 8, C.cyan);
    p.disc(82, 36, 4, f ? '#fff6c8' : C.gold);
    p.disc(83, 35, 1.5, C.white);
    // skids
    p.rect(26, 56, 6, 6, P.metDD); p.rect(62, 56, 6, 6, P.metDD);
    p.round(20, 60, 20, 4, 2, P.metD); p.round(56, 60, 20, 4, 2, P.metD);
    // running lights
    p.disc(66, 26, 3, C.red); p.disc(28, 26, 3, C.lime);
    p.outline(C.ink);
    return p;
  }


  reg('pod', [buildPod(0), buildPod(1)], 23, 18, 2);

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
  function buildGem(cols) {
    const p = pix(11, 11);
    p.spike(5, 1, 9, 5, 1, cols[1]);
    p.spike(5, 5, 9, 5, -1, cols[1]);
    p.spike(5, 2, 5, 4, 1, cols[0]);
    p.set(4, 4, C.white); p.set(5, 3, C.white);
    p.outline(C.ink);
    return p;
  }
  function buildNugget(cols) {
    const p = pix(10, 9);
    p.ellipse(5, 5, 4, 3.4, cols[1]);
    p.ellipse(4, 4, 2.2, 1.6, cols[0]);
    p.set(3, 3, C.white);
    p.outline(C.ink);
    return p;
  }

  const gemSprites = {};
  function gemFor(matId) {
    if (gemSprites[matId]) return gemSprites[matId];
    const m = PD.data.MAT[matId];
    const build = m.shine ? buildGem : buildNugget;
    const cv = build(m.c).toCanvas();
    gemSprites[matId] = { frames: [cv], w: cv.width, h: cv.height, ox: cv.width / 2, oy: cv.height / 2 };
    return gemSprites[matId];
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
      alienRoll: mk(frames.roll, AOX, 25, 2),
      drill: mk([0, 1, 2, 3].map(i => buildDrill(i, DP)), 5, 6, 2),
      ship: mk([buildShip(false, SP), buildShip(true, SP)], 42, 26),
      pod: mk([buildPod(0, SP), buildPod(1, SP)], 23, 18, 2),
      P: P
    };
    skinCache[key] = set;
    return set;
  }

  PD.art = { C, sprites, gemFor, ICON, skinFor, optOf, reg, blit, pixOf: pix };
})(window.PD);
