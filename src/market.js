/* THE MARKET, WHICH SELLS THINGS.
   The Port used to have four counters that did anything and a lot of lit
   windows that did not. Now everything with a door on it sells you
   something, and most of what it sells DOES something:

     SNACKS   eaten on the way to the next dive -- more air, a tougher hull,
              a faster drill, longer arms, better prices -- up to three at
              once, because after three you are too full to fit in the pod
     PERKS    the old one-offs: bigger lungs, illegal magnets, the permit
     HATS     worn; you buy one once and put it on or take it off after
     PLANTS   for your house, where they sit on the floor and are nice
     A GEODE  paid for, cracked open at the counter, usually rock

   Down on the docks there is an open-air market -- fruit, fish, a grill, a
   juice cart and a flower stall -- with a vendor at every one of them
   shouting prices. And on the market deck, between the shops, there is the
   way into the casino: a door with lights round it and a bear on it. The
   market is not a casino. It has one in it, which is how markets work. */
(function (PD) {
  'use strict';

  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const AH = PD.arthome;
  const VW = 480, VH = 270;

  /* ------------------------------------------------------------ catalogue */
  const ITEMS = {
    noodle: [
      { id: 'ramen', name: 'RAMEN', cost: 900, kind: 'snack', fx: { air: 30 }, line: '+30 AIR ON YOUR NEXT DIVE', icon: 'bowl' },
      { id: 'dumpl', name: 'DUMPLINGS', cost: 1400, kind: 'snack', fx: { hull: 20 }, line: '+20 HULL ON YOUR NEXT DIVE', icon: 'dumpling' }],
    cafe: [
      { id: 'coffee', name: 'COFFEE', cost: 700, kind: 'snack', fx: { drill: 0.15 }, line: 'DRILL 15% FASTER NEXT DIVE', icon: 'cup' },
      { id: 'cake', name: 'CAKE', cost: 1100, kind: 'snack', fx: { reach: 10 }, line: '+10 PICKUP REACH NEXT DIVE', icon: 'cake' }],
    air: [
      { id: 'lungs', name: 'BIGGER LUNGS', cost: 62000, kind: 'perm', line: 'PERMANENT +40 AIR. NOT YOURS. NOBODY ASKS.', icon: 'lung' },
      { id: 'aircan', name: 'CAN OF AIR', cost: 500, kind: 'snack', fx: { air: 15 }, line: '+15 AIR NEXT DIVE', icon: 'can' }],
    grab: [
      { id: 'grip', name: 'ILLEGAL MAGNETS', cost: 88000, kind: 'perm', line: 'PERMANENT +22 PICKUP REACH', icon: 'magnet' },
      { id: 'gloves', name: 'STICKY GLOVES', cost: 600, kind: 'snack', fx: { reach: 8 }, line: '+8 PICKUP REACH NEXT DIVE', icon: 'glove' }],
    fence: [
      { id: 'fence', name: 'SELL THE VAULT', cost: 0, kind: 'fence', line: 'NO LISTING. NO WAITING. PAYS 10% OVER.', icon: 'sack' }],
    hat: [
      { id: 'hat0', name: 'TOP HAT', cost: 5000, kind: 'hat', hat: 0, line: 'FOR WHEN YOU OWE A MILLION IN STYLE', icon: 'hat0' },
      { id: 'hat1', name: 'BOWLER', cost: 3000, kind: 'hat', hat: 1, line: 'A HAT FOR A MAN WITH A PLAN', icon: 'hat1' },
      { id: 'hat2', name: 'CAP', cost: 1500, kind: 'hat', hat: 2, line: 'KEEPS THE CORE OUT OF YOUR EYES', icon: 'hat2' },
      { id: 'hat3', name: 'WITCH HAT', cost: 9000, kind: 'hat', hat: 3, line: 'DOES NOTHING. LOOKS INCREDIBLE.', icon: 'hat3' },
      { id: 'hat4', name: 'BERET', cost: 2500, kind: 'hat', hat: 4, line: 'FOR THE ARTIST OF DESTRUCTION', icon: 'hat4' }],
    ore: [
      { id: 'lucky', name: 'LUCKY GEM', cost: 4000, kind: 'snack', fx: { value: 0.08 }, line: 'ORE SELLS 8% HIGHER NEXT DIVE', icon: 'gem' },
      { id: 'geode', name: 'CRACK A GEODE', cost: 2000, kind: 'geode', line: 'COULD BE ANYTHING. IS USUALLY ROCK.', icon: 'geode' }],
    plant: [
      { id: 'fern', name: 'A FERN', cost: 1500, kind: 'plant', plant: 0, line: 'FOR YOUR HOUSE. IT JUST SITS THERE. NICELY.', icon: 'plant0' },
      { id: 'cactus', name: 'A CACTUS', cost: 2500, kind: 'plant', plant: 1, line: 'NEEDS NOTHING. GIVES NOTHING. RESPECT.', icon: 'plant1' },
      { id: 'bonsai', name: 'A BONSAI', cost: 6000, kind: 'plant', plant: 2, line: 'SMALLER THAN A TREE. BETTER THAN A TREE.', icon: 'plant2' }],
    stamp: [
      { id: 'papers', name: 'BUILDING PERMIT', cost: 120000, kind: 'perm', line: 'EVERYTHING ON YOUR MOON COSTS A FIFTH LESS', icon: 'stamp' }],
    // the stalls on the docks
    fruit: [
      { id: 'melon', name: 'MOON MELON', cost: 300, kind: 'snack', fx: { air: 10 }, line: '+10 AIR NEXT DIVE', icon: 'melon' },
      { id: 'berry', name: 'CRATER BERRIES', cost: 260, kind: 'snack', fx: { hull: 6 }, line: '+6 HULL NEXT DIVE', icon: 'berry' }],
    fish: [
      { id: 'fish', name: 'GRILLED FISH', cost: 450, kind: 'snack', fx: { hull: 10 }, line: '+10 HULL NEXT DIVE', icon: 'fish' },
      { id: 'squid', name: 'SQUID ON A STICK', cost: 520, kind: 'snack', fx: { drill: 0.06 }, line: 'DRILL 6% FASTER NEXT DIVE', icon: 'squid' }],
    grill: [
      { id: 'kebab', name: 'SPACE KEBAB', cost: 500, kind: 'snack', fx: { drill: 0.08 }, line: 'DRILL 8% FASTER NEXT DIVE', icon: 'kebab' }],
    juice: [
      { id: 'juice', name: 'STAR JUICE', cost: 350, kind: 'snack', fx: { air: 8, reach: 3 }, line: '+8 AIR AND +3 REACH NEXT DIVE', icon: 'juice' }],
    flower: [
      { id: 'posy', name: 'A POSY', cost: 800, kind: 'plant', plant: 3, line: 'FOR YOUR HOUSE. SMELLS OF SOMEWHERE ELSE.', icon: 'plant3' }]
  };
  const FULL = 3;                     // snacks you can carry into one dive

  const GREET = ['WELCOME IN!', 'HELLO HELLO', 'TAKE A LOOK', 'EVERYTHING IS FRESH', 'NO REFUNDS. HI!', 'OH, A CUSTOMER'];
  const THANKS = ['THANK YOU!', 'ENJOY!', 'GOOD CHOICE', 'COME BACK SOON', 'PLEASURE DOING BUSINESS', 'YAY'];
  const BROKE = ['YOU CANNOT AFFORD THAT', 'NICE TRY', 'COME BACK RICHER', 'MR CHUM HAS YOUR MONEY'];

  /* ------------------------------------------------------------ the stalls */
  const STALLS = [
    { key: 'fruit', deck: 0, x: 330, name: 'FRUIT', keeper: 'BEANIE', col: '#ff6a4a', col2: '#ffd34d', shout: ['FRESH MELONS!', 'BERRIES! RIPE!', 'TWO FOR ONE-ISH'] },
    { key: 'fish', deck: 0, x: 422, name: 'FISH', keeper: 'GLOOP', col: '#38a8e8', col2: '#e8f8ff', shout: ['FISH! FISH!', 'CAUGHT THIS MORNING', 'SQUID ON A STICK!'] },
    { key: 'grill', deck: 0, x: 514, name: 'GRILL', keeper: 'PIP', col: '#e8402a', col2: '#ffb040', shout: ['HOT KEBABS!', 'I AM THE GRILL', 'SMELL THAT'] },
    { key: 'juice', deck: 0, x: 606, name: 'JUICE', keeper: 'WOBBLE', col: '#a86aff', col2: '#7dff9a', shout: ['STAR JUICE!', 'SQUEEZED BY HAND', 'COLD COLD COLD'] },
    { key: 'flower', deck: 0, x: 698, name: 'FLOWERS', keeper: 'VESPER', col: '#ff7ac4', col2: '#fff0f8', shout: ['FLOWERS FOR THE HOUSE', 'SMELL THESE', 'PRETTY THINGS'] }
  ];
  const CASINO = { deck: 1, x: 800 };

  function kin(nm) {
    for (const k of AH.KIN) if (k.who === nm || k.celeb === nm) return k;
    return AH.KIN[0];
  }

  /* ------------------------------------------------------------ icons
     Small pictures of the goods, drawn live, used on the stall counters and
     in the shop list. About ten pixels square. */
  function icon(ctx, kind, x, y, t) {
    const R = (a, b, w, h, c) => X.rect(ctx, x + a, y + b, w, h, c);
    const B = (a, b, rx, ry, c) => X.blob(ctx, x + a, y + b, rx, ry, c);
    switch (kind) {
      case 'bowl': B(0, 2, 5, 3.5, '#c83a2a'); R(-5, -1, 10, 3, '#f0dcb0'); R(-2, -5, 1, 4, '#fff'); R(1, -6, 1, 4, '#fff'); break;
      case 'dumpling': for (const d of [-3, 3]) { B(d, 1, 3, 2.6, '#fbf6ec'); R(d - 1, -1, 2, 1, '#d6c8b2'); } break;
      case 'cup': X.plate(ctx, x - 4, y - 3, 8, 8, '#ffffff', null, null, 2); R(-3, -2, 6, 2, '#6a3a1a'); R(4, -1, 2, 3, '#ffffff'); R(-1, -7, 1, 3, '#c8c8d8'); break;
      case 'cake': R(-4, -1, 9, 5, '#f8d8a8'); R(-4, -3, 9, 2, '#ff8ab8'); R(0, -6, 1, 3, '#fff'); R(0, -7, 1, 1, '#ffd34d'); break;
      case 'lung': B(-2, 0, 2.4, 3.6, '#ff8aa8'); B(2, 0, 2.4, 3.6, '#ff8aa8'); R(0, -5, 1, 4, '#e8c0c8'); break;
      case 'can': X.plate(ctx, x - 3, y - 5, 7, 10, '#38e8ff', null, null, 2); R(-3, -1, 7, 2, '#ffffff'); R(-1, -7, 3, 2, '#8a96a8'); break;
      case 'magnet': B(0, -1, 4, 4, '#d8343a'); B(0, -1, 2, 2, '#1a1024'); R(-4, -1, 3, 5, '#d8343a'); R(1, -1, 3, 5, '#d8343a'); R(-4, 3, 3, 2, '#dce4ec'); R(1, 3, 3, 2, '#dce4ec'); break;
      case 'glove': X.plate(ctx, x - 3, y - 1, 7, 6, '#ffc44d', null, null, 2); for (let i = 0; i < 3; i++) R(-2 + i * 2, -4, 1, 4, '#ffc44d'); break;
      case 'sack': B(0, 1, 5, 4, '#b08aff'); R(-2, -4, 4, 2, '#b08aff'); R(-1, -1, 2, 4, '#2e1a52'); break;
      case 'gem': X.poly(ctx, [[x - 4, y - 1], [x + 4, y - 1], [x, y + 5]], '#7dffda'); X.poly(ctx, [[x - 4, y - 1], [x - 2, y - 4], [x + 2, y - 4], [x + 4, y - 1]], '#c8fff0'); break;
      case 'geode': B(0, 0, 5, 4, '#6a5a4a'); B(1, 0, 2.5, 2, '#b87aff'); R(0, -1, 1, 1, '#ffffff'); break;
      case 'stamp': X.plate(ctx, x - 2, y - 6, 5, 5, '#c84a3a', null, null, 2); R(-4, -1, 9, 3, '#e8dcb0'); R(-4, 2, 9, 1, '#c84a3a'); break;
      case 'melon': B(0, 1, 5, 4, '#3aa84a'); B(0, 1, 4, 3, '#ff6a6a'); R(-2, 0, 1, 1, '#1a1024'); R(1, 1, 1, 1, '#1a1024'); R(-5, 1, 10, 1, '#8aff8a'); break;
      case 'berry': for (const [a, b] of [[-2, 1], [2, 1], [0, -1]]) { B(a, b, 2, 2, '#6a3aff'); R(a - 1, b - 1, 1, 1, '#c8b0ff'); } break;
      case 'fish': B(0, 0, 5, 2.6, '#8ac8e8'); X.poly(ctx, [[x + 4, y], [x + 7, y - 3], [x + 7, y + 3]], '#5a98c8'); R(-3, -1, 1, 1, '#1a1024'); break;
      case 'squid': R(0, -2, 1, 9, '#8a5a2a'); B(0, -2, 3, 3, '#ff9ab0'); for (let i = -2; i <= 2; i += 2) R(i, 1, 1, 3, '#ff9ab0'); break;
      case 'kebab': R(-5, 0, 11, 1, '#8a5a2a'); for (let i = 0; i < 4; i++) B(-3 + i * 2.2, 0, 1.4, 2, ['#c8602a', '#7ac848', '#c8602a', '#ffd34d'][i]); break;
      case 'juice': R(-3, -3, 6, 8, 'rgba(200,240,255,0.6)'); R(-2, -1, 4, 5, '#a86aff'); R(1, -7, 1, 5, '#ff5a8a'); break;
      default:
        if (kind && kind.indexOf('hat') === 0) hatAt(ctx, +kind.slice(3), x, y + 2, ['#2a2a3a', '#6a3a2a', '#ff5a8a', '#3a1a5a', '#c83a3a'][+kind.slice(3)]);
        else if (kind && kind.indexOf('plant') === 0) plantAt(ctx, +kind.slice(5), x, y + 5, t || 0);
    }
  }

  /* A hat, in the world, with its brim at (x, y). Used on the shelf, in the
     list, and on your own head. */
  function hatAt(ctx, k, x, y, c) {
    const R = (a, b, w, h, col) => X.rect(ctx, x + a, y + b, w, h, col);
    if (k === 0) { R(-5, -1, 11, 2, c); R(-3, -9, 7, 8, c); R(-3, -4, 7, 2, '#ff5a8a'); R(-2, -8, 1, 4, '#5a5a6a'); }
    else if (k === 1) { R(-6, -1, 13, 2, c); X.blob(ctx, x, y - 3, 4.5, 4, c); R(-4, -3, 9, 1, '#d8b060'); }
    else if (k === 2) { X.blob(ctx, x, y - 2, 5, 3.5, c); R(-5, -2, 10, 2, c); R(2, -1, 7, 2, '#8a2a3a'); R(-1, -5, 2, 1, '#ffffff'); }
    else if (k === 3) { R(-7, -1, 15, 2, c); X.poly(ctx, [[x - 4, y - 1], [x + 4, y - 1], [x + 3, y - 12]], c); R(-4, -3, 8, 2, '#ffd34d'); }
    else { X.blob(ctx, x, y - 2, 6, 2.6, c); R(0, -6, 1, 3, c); }
  }
  const HAT_COL = ['#2a2a3a', '#6a3a2a', '#ff5a8a', '#3a1a5a', '#c83a3a'];

  function plantAt(ctx, k, x, y, t) {
    const sw = Math.sin(t * 1.2 + x) * 0.6;
    if (k === 0) { for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42; X.blob(ctx, x + Math.cos(a) * 5 + sw, y - 6 + Math.sin(a) * 6, 2, 3, i % 2 ? '#3aa84a' : '#6ad85a'); } X.plate(ctx, x - 4, y - 4, 8, 5, '#c86a3a', null, null, 1); }
    else if (k === 1) { X.plate(ctx, x - 2, y - 13, 5, 11, '#4aa85a', null, null, 2); X.plate(ctx, x - 6, y - 10, 4, 5, '#4aa85a', null, null, 2); X.rect(ctx, x + 1, y - 14, 1, 1, '#ff7ac4'); X.plate(ctx, x - 4, y - 3, 9, 4, '#e8dcc0', null, null, 1); }
    else if (k === 2) { X.rect(ctx, x, y - 9, 2, 7, '#6a4428'); X.blob(ctx, x - 3 + sw, y - 10, 4, 2.5, '#3a8a4a'); X.blob(ctx, x + 4 + sw, y - 12, 3.5, 2.2, '#5aa85a'); X.plate(ctx, x - 5, y - 3, 11, 3, '#4a8aa8', null, null, 1); }
    else { for (let i = 0; i < 5; i++) { X.rect(ctx, x - 2 + i, y - 8 + (i % 2), 1, 5, '#3aa84a'); X.blob(ctx, x - 3 + i * 1.6 + sw, y - 9 - (i % 2) * 2, 1.8, 1.8, ['#ff5a8a', '#ffd34d', '#ffffff', '#a86aff', '#ff8a4a'][i]); } X.plate(ctx, x - 3, y - 3, 7, 3, '#8a6ac8', null, null, 1); }
  }

  /* ------------------------------------------------------------ drawing */

  /* A stall on the docks: a striped canopy on poles, a counter piled with
     what it sells, a price board, and somebody behind it shouting. */
  function drawStall(ctx, s, x, y, t, px, dim) {
    const K = kin(s.keeper);
    const near = Math.abs(px - x) < 40;
    ctx.globalAlpha = dim ? 0.55 : 1;
    // warm light off the bulbs, across the deck
    if (!dim) { ctx.globalAlpha = 0.14; X.blob(ctx, x, y, 40, 5, '#ffd88a'); ctx.globalAlpha = 1; }
    // the vendor, behind the counter, calling out
    const fr = near ? (Math.sin(t * 9) > 0 ? 3 : 6) : ((Math.floor(t * 0.6 + s.x) % 5 === 0) ? (Math.sin(t * 10) > 0 ? 3 : 0) : (Math.sin(t * 1.4 + s.x) > 0.95 ? 5 : 0));
    const b = Math.sin(t * 2.3 + s.x) * 0.03;
    PD.crowd.bouncy(ctx, K, fr, x - 6, y - 13, px > x, 1 - b, 1 + b, 0);
    // the poles and the canopy
    X.rect(ctx, x - 30, y - 50, 2, 50, '#4a3a2a'); X.rect(ctx, x + 28, y - 50, 2, 50, '#4a3a2a');
    for (let i = 0; i < 8; i++) X.rect(ctx, x - 34 + i * 8.5, y - 56, 9, 8, i % 2 ? s.col : s.col2);
    for (let i = 0; i < 8; i++) X.poly(ctx, [[x - 34 + i * 8.5, y - 48], [x - 25.5 + i * 8.5, y - 48], [x - 29.8 + i * 8.5, y - 44]], i % 2 ? s.col : s.col2);
    X.rect(ctx, x - 34, y - 57, 68, 2, '#ffffff');
    // a string of bulbs under it
    for (let i = 0; i < 7; i++) {
      const on = (Math.floor(t * 3) + i) % 7 !== 0;
      X.blob(ctx, x - 27 + i * 9, y - 42 + Math.sin(i) * 1, 1.5, 1.8, on ? '#fff0a0' : '#6a5a30');
    }
    // the sign on top
    const w = F.width(s.name, 1) + 10;
    X.plate(ctx, x - w / 2, y - 68, w, 11, '#1a1020', s.col, '#0a0612', 3);
    F.draw(ctx, s.name, x, y - 66, '#ffffff', { center: true, shadow: '#000000' });
    // the counter, and the goods piled on it
    X.plate(ctx, x - 30, y - 18, 60, 18, '#8a5a3a', '#b87a4a', '#4a2a1a', 3);
    for (let i = 0; i < 5; i++) X.rect(ctx, x - 28 + i * 12, y - 12, 1, 10, '#6a4028');
    const goods = ITEMS[s.key];
    for (let i = 0; i < 5; i++) icon(ctx, goods[i % goods.length].icon, x - 22 + i * 11, y - 22 + (i % 2), t);
    // the price board, chalk on slate
    const pr = '$' + goods[0].cost;
    const pw = F.width(pr, 1) + 6;
    X.plate(ctx, x + 30 - pw, y - 38, pw, 12, '#2a3a2a', '#6a4a2a', '#101810', 2);
    F.draw(ctx, pr, x + 30 - pw / 2, y - 35, '#e8e8d8', { center: true, shadow: false });
    if (s.key === 'grill') {
      // smoke off the grill, drawn light, since this is not the house
      for (let i = 0; i < 4; i++) {
        const q = (t * 0.6 + i * 0.25) % 1;
        ctx.globalAlpha = (dim ? 0.3 : 0.4) * (1 - q);
        X.blob(ctx, x - 10 + i * 6 + Math.sin(t + i) * 3, y - 24 - q * 30, 3 + q * 5, 2 + q * 4, '#c8c0d0');
      }
      ctx.globalAlpha = dim ? 0.55 : 1;
    }
    ctx.globalAlpha = 1;
  }

  /* The way into the casino. Arched, lit, a bear on the door. */
  function drawCasino(ctx, x, y, t, px, dim) {
    ctx.globalAlpha = dim ? 0.55 : 1;
    const W2 = 46;
    if (!dim) { ctx.globalAlpha = 0.18; X.blob(ctx, x, y + 1, 60, 6, '#ff5a8a'); ctx.globalAlpha = 1; }
    // the front: black glass and gold
    X.plate(ctx, x - W2, y - 64, W2 * 2, 64, '#150a1e', '#3a1a4a', '#07030c', 4);
    // the arch, chasing bulbs round it
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI + (i / 18) * Math.PI;
      const bx = x + Math.cos(a) * 30, by = y - 30 + Math.sin(a) * 20;
      const on = (Math.floor(t * 8) + i) % 3 === 0;
      X.blob(ctx, bx, by, 1.6, 1.6, on ? '#fff6c0' : '#8a6a20');
      if (on && !dim) { ctx.globalAlpha = 0.25; X.blob(ctx, bx, by, 4, 4, '#ffd34d'); ctx.globalAlpha = 1; }
    }
    X.rect(ctx, x - 30, y - 30, 2, 30, '#c99a1e'); X.rect(ctx, x + 28, y - 30, 2, 30, '#c99a1e');
    // the doors, revolving, with the room showing through them
    X.rect(ctx, x - 26, y - 42, 52, 42, '#2a0a18');
    const rot = (t * 0.8) % 1;
    for (let i = 0; i < 3; i++) {
      const f = (rot + i / 3) % 1, dx = Math.cos(f * Math.PI * 2) * 20;
      X.rect(ctx, x + dx - 1, y - 42, 2, 42, '#c99a1e');
      ctx.globalAlpha = (dim ? 0.55 : 1) * 0.3;
      X.rect(ctx, x + Math.min(dx, 0), y - 42, Math.abs(dx), 42, '#ff9ad8');
      ctx.globalAlpha = dim ? 0.55 : 1;
    }
    // what is inside, glimpsed: a slot row and a chandelier
    for (let i = 0; i < 4; i++) { X.rect(ctx, x - 20 + i * 11, y - 18, 7, 12, '#4a1030'); X.rect(ctx, x - 19 + i * 11, y - 16, 5, 4, (Math.floor(t * 4) + i) % 2 ? '#ffd34d' : '#7ef9ff'); }
    X.blob(ctx, x, y - 38, 8, 3, '#ffd34d');
    // the red carpet out onto the deck, and the rope
    X.rect(ctx, x - 16, y - 2, 32, 3, '#c81a3a');
    for (const s of [-1, 1]) { X.rect(ctx, x + s * 36 - 1, y - 12, 3, 12, '#c99a1e'); X.blob(ctx, x + s * 36, y - 13, 2, 2, '#ffd34d'); }
    X.curve(ctx, x - 36, y - 10, x - 30, y - 4, x - 24, y - 10, '#c81a3a', 1, 8);
    // the sign: a word in lights, and a moon made of bulbs
    const flick = (Math.floor(t * 6) % 29) !== 0;
    X.plate(ctx, x - 40, y - 78, 80, 15, '#1a0612', flick ? '#ff5a8a' : '#5a1a3a', '#07030c', 4);
    F.draw(ctx, 'LUCKY MOON', x, y - 74, flick ? '#ffe0f0' : '#6a3a5a', { center: true, shadow: '#3a0a1a' });
    if (!dim && flick) { ctx.globalAlpha = 0.2; X.blob(ctx, x, y - 70, 48, 10, '#ff5a8a'); ctx.globalAlpha = 1; }
    F.draw(ctx, 'CASINO', x, y - 61, (Math.floor(t * 2) % 2) ? '#ffd34d' : '#ffb040', { center: true, shadow: '#000000' });
    // the bear on the door
    const K = kin('BRUNO');
    const near = Math.abs(px - x) < 40;
    PD.crowd.bouncy(ctx, K, near ? (Math.sin(t * 7) > 0 ? 3 : 0) : (Math.sin(t * 1.1) > 0.96 ? 5 : 0), x + 50, y, px > x + 50, 1, 1 + Math.sin(t * 2) * 0.02, 0);
    ctx.globalAlpha = 1;
  }

  /* ---------------------------------------------------------- the shop panel
     Opened from any shop or stall. The keeper on the left, big, reacting;
     the goods on the right; what you can afford and what you are carrying at
     the bottom. */
  const PAN = { on: 0, key: null, name: '', keeper: null, sel: 0, react: 'talk', reactT: 0, say: '', sayT: 0, t: 0, geode: null, col: '#ffd34d', col2: '#2a1a3a' };

  function open(g, key, name, keeper, col, col2) {
    PAN.on = 1; PAN.key = key; PAN.name = name; PAN.keeper = keeper; PAN.sel = 0; PAN.t = 0;
    PAN.react = 'talk'; PAN.reactT = 1.2; PAN.say = GREET[Math.floor(Math.random() * GREET.length)]; PAN.sayT = 2.4;
    PAN.col = col || '#ffd34d'; PAN.col2 = col2 || '#2a1a3a'; PAN.geode = null;
    A.sfx.tone(880, { type: 'triangle', to: 1320, dur: 0.12, vol: 0.06 });
  }
  function close() { PAN.on = 0; }

  function snackCount(g) { return (g.save.snack && g.save.snack.n) || 0; }
  function status(g, it) {
    const sv = g.save;
    if (it.kind === 'perm') return sv.bought && sv.bought[it.id] ? 'OWNED' : null;
    if (it.kind === 'hat') return sv.hats && sv.hats[it.id] ? (sv.hat === it.hat ? 'WEARING' : 'OWNED') : null;
    if (it.kind === 'snack' && snackCount(g) >= FULL) return 'FULL';
    if (it.kind === 'plant' && (sv.plants || []).length >= 6) return 'NO ROOM';
    return null;
  }
  function priceOf(g, it) {
    if (it.kind === 'fence') return Math.round(g.vaultValue() * 1.1 * (1 + g.baseBonus('refinery')));
    return it.cost;
  }
  function react(kind, line) {
    PAN.react = kind; PAN.reactT = 1.4;
    if (line) { PAN.say = line; PAN.sayT = 2.2; }
  }

  /* Buy the selected thing. Returns true if money changed hands. */
  function buy(g, it) {
    const sv = g.save;
    const st = status(g, it);
    if (it.kind === 'hat' && st) {
      // owned already: this is putting it on, or taking it off
      sv.hat = sv.hat === it.hat ? -1 : it.hat;
      react('cheer', sv.hat === it.hat ? 'LOOKS GREAT ON YOU' : 'BARE HEADED. BOLD.');
      A.sfx.click(); g.saveGame(); return false;
    }
    if (st) { react('sad', st === 'FULL' ? 'YOU LOOK FULL. COME BACK AFTER A DIVE' : (st === 'NO ROOM' ? 'YOUR HOUSE IS FULL OF PLANTS' : 'YOU ALREADY HAVE THAT')); A.sfx.deny(); return false; }
    if (it.kind === 'fence') {
      const total = priceOf(g, it);
      if (!total) { react('sad', 'NOTHING IN THE VAULT. COME BACK HEAVY.'); A.sfx.deny(); return false; }
      sv.vault = {};
      const cut = PD.chum.takeCut(g, total);
      sv.credits += total - cut; sv.totalEarned += total - cut;
      react('laugh', 'PLEASURE. +$' + U.fmt(total - cut));
      A.sfx.sell(); g.saveGame(); return true;
    }
    if (sv.credits < it.cost) { react('sad', BROKE[Math.floor(Math.random() * BROKE.length)]); A.sfx.deny(); return false; }
    sv.credits -= it.cost;
    if (it.kind === 'perm') { if (!sv.bought) sv.bought = {}; sv.bought[it.id] = 1; }
    else if (it.kind === 'hat') { if (!sv.hats) sv.hats = {}; sv.hats[it.id] = 1; sv.hat = it.hat; }
    else if (it.kind === 'plant') { if (!sv.plants) sv.plants = []; sv.plants.push(it.plant); }
    else if (it.kind === 'snack') {
      const sn = sv.snack || (sv.snack = { n: 0, names: [] });
      sn.n++; sn.names.push(it.name);
      for (const k in it.fx) sn[k] = (sn[k] || 0) + it.fx[k];
    } else if (it.kind === 'geode') {
      const r = Math.random();
      const mult = r < 0.55 ? 0 : (r < 0.85 ? 1.5 : (r < 0.97 ? 4 : 15));
      const win = Math.round(it.cost * mult);
      sv.credits += win;
      PAN.geode = { t: 0, mult, win };
      react(mult >= 4 ? 'shock' : (mult > 0 ? 'cheer' : 'sad'), mult === 0 ? 'ROCK. IT IS ALWAYS ROCK.' : (mult >= 15 ? 'NO WAY. NO WAY!' : 'OOH! +$' + U.fmt(win)));
      if (mult > 0) A.sfx.sell(); else A.sfx.deny();
      g.saveGame(); return true;
    }
    react('cheer', THANKS[Math.floor(Math.random() * THANKS.length)]);
    A.sfx.sell();
    A.sfx.tone(1200, { type: 'square', to: 1800, dur: 0.08, vol: 0.05 });
    g.saveGame();
    return true;
  }

  /* Returns 'close' when the panel wants shutting, 'bought' on a purchase. */
  function update(dt, g) {
    const IN = PD.input, m = IN.mouse;
    PAN.t += dt;
    PAN.reactT = Math.max(0, PAN.reactT - dt); PAN.sayT = Math.max(0, PAN.sayT - dt);
    if (PAN.geode) PAN.geode.t += dt;
    const list = ITEMS[PAN.key] || [];
    if (IN.hit('esc')) return 'close';
    if (IN.hit('up')) { PAN.sel = (PAN.sel + list.length - 1) % list.length; A.sfx.click(); }
    if (IN.hit('down')) { PAN.sel = (PAN.sel + 1) % list.length; A.sfx.click(); }
    for (let i = 0; i < list.length; i++) {
      const y = 70 + i * 26;
      if (m.inside && m.x > 200 && m.x < 444 && m.y > y && m.y < y + 23) {
        if (PAN.sel !== i) { PAN.sel = i; }
        if (m.leftPressed) return buy(g, list[i]) ? 'bought' : null;
      }
    }
    if (m.inside && m.leftPressed && m.x > 380 && m.x < 444 && m.y > 222 && m.y < 240) return 'close';
    if (IN.hit('KeyE') || IN.hit('enter') || IN.hit('space')) return buy(g, list[PAN.sel]) ? 'bought' : null;
    return null;
  }

  function draw(ctx, g, t) {
    const list = ITEMS[PAN.key] || [];
    ctx.fillStyle = 'rgba(6,4,14,0.8)'; ctx.fillRect(0, 0, VW, VH);
    const e = Math.min(1, PAN.t * 5);
    const k = e >= 1 ? 1 : 1 + 2.7 * Math.pow(e - 1, 3) + 1.7 * Math.pow(e - 1, 2);
    ctx.save();
    ctx.translate(240, 150); ctx.scale(k, k); ctx.translate(-240, -150);
    X.plate(ctx, 30, 36, 420, 212, '#17122a', '#3a3060', '#07040e', 8);
    X.rect(ctx, 30, 36, 420, 3, PAN.col);
    // the name board
    X.plate(ctx, 44, 26, F.width(PAN.name, 2) + 24, 22, PAN.col2, PAN.col, '#07040e', 5);
    F.draw(ctx, PAN.name, 56, 31, '#ffffff', { scale: 2, shadow: '#000000' });

    // the keeper, big, with a face that goes with what just happened
    const K = kin(PAN.keeper);
    X.plate(ctx, 44, 60, 146, 150, '#0f0c1e', '#2a2448', '#05030a', 6);
    ctx.save(); ctx.beginPath(); ctx.rect(46, 62, 142, 146); ctx.clip();
    const glow = ctx.createRadialGradient(117, 150, 10, 117, 150, 90);
    glow.addColorStop(0, PAN.col + '55'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(46, 62, 142, 146);
    const FRM = { talk: 3, cheer: 6, sad: 7, shock: 9, laugh: 10, angry: 8 };
    let fr = PAN.reactT > 0 ? FRM[PAN.react] : (PAN.sayT > 0 ? (Math.sin(t * 12) > 0 ? 3 : 0) : (Math.sin(t * 1.3) > 0.95 ? 5 : 0));
    if (PAN.reactT > 0 && PAN.react === 'talk') fr = Math.sin(t * 12) > 0 ? 3 : 0;
    const hop = PAN.reactT > 0 && (PAN.react === 'cheer' || PAN.react === 'shock' || PAN.react === 'laugh') ? Math.abs(Math.sin(PAN.reactT * 9)) * 10 * PAN.reactT : 0;
    const br = Math.sin(t * 2.4) * 0.03;
    const sc = Math.min(3, 110 / Math.max(K.h, 30));
    PD.crowd.bouncy(ctx, K, fr, 117, 200 - hop, false, sc * (1 - br), sc * (1 + br), 0);
    ctx.restore();
    // what they are saying
    if (PAN.sayT > 0) {
      const rows = PD.chum.wrap(PAN.say, 130, 1);
      const bw = 140, bh = 10 + rows.length * 10;
      X.plate(ctx, 48, 66, bw, bh, '#fbf6ee', '#ffffff', '#c8bca8', 4);
      rows.forEach((r, i) => F.draw(ctx, r, 118, 71 + i * 10, '#1a1020', { center: true, shadow: false }));
    }

    // the goods
    list.forEach((it, i) => {
      const y = 70 + i * 26, on = i === PAN.sel;
      const st = status(g, it);
      const price = priceOf(g, it);
      const can = !st && (it.kind === 'fence' ? price > 0 : g.save.credits >= it.cost);
      X.plate(ctx, 200, y, 244, 23, on ? '#2a2450' : '#15112a', on ? PAN.col : '#2a2448', '#05030a', 4);
      X.plate(ctx, 204, y + 2, 19, 19, '#0a0816', '#2a2448', '#05030a', 3);
      icon(ctx, it.icon, 213, y + 11, t);
      F.draw(ctx, it.name, 228, y + 4, on ? '#ffffff' : '#c9bce8', { shadow: false });
      F.draw(ctx, it.line, 228, y + 13, on ? '#ffd34d' : '#6a6490', { shadow: false });
      const lab = st || (it.kind === 'fence' ? (price ? '+$' + U.fmt(price) : 'EMPTY') : '$' + U.fmt(it.cost));
      F.draw(ctx, lab, 440, y + 4, st ? '#8affd0' : (can ? '#8affa0' : '#ff8a9a'), { right: true, shadow: false });
    });
    // the geode, cracking
    if (PAN.geode && PAN.geode.t < 2.2) {
      const q = PAN.geode.t;
      const gx = 322, gy = 170;
      const split = Math.max(0, q - 0.6) * 18;
      X.blob(ctx, gx - split, gy, 16, 13, '#6a5a4a'); X.blob(ctx, gx + split, gy, 16, 13, '#5a4a3a');
      if (q > 0.6) {
        X.blob(ctx, gx, gy, 9, 8, PAN.geode.mult ? (PAN.geode.mult >= 4 ? '#ffd34d' : '#b87aff') : '#4a4038');
        if (PAN.geode.mult) for (let i = 0; i < 8; i++) { const a = i / 8 * U.TAU + q; X.rect(ctx, gx + Math.cos(a) * (12 + q * 10), gy + Math.sin(a) * (10 + q * 8), 2, 2, '#ffffff'); }
      } else if (Math.floor(q * 20) % 2) X.rect(ctx, gx - 1, gy - 12, 2, 24, '#1a1010');
    }
    // the bottom line: money, and what you are carrying into the next dive
    const sn = g.save.snack;
    F.draw(ctx, 'YOU HAVE $' + U.fmt(g.save.credits), 200, 206, '#ffd34d', { shadow: false });
    const snk = sn && sn.n ? 'BAG: ' + sn.names.join(', ') : 'BAG: NOTHING TO EAT';
    F.draw(ctx, snk.length > 38 ? snk.slice(0, 37) + '.' : snk, 200, 216, '#8a86a8', { shadow: false });
    F.draw(ctx, 'UP/DOWN  E BUY', 200, 228, '#4a4470', { shadow: false });
    const m = PD.input.mouse;
    const hot = m.inside && m.x > 380 && m.x < 444 && m.y > 222 && m.y < 240;
    X.plate(ctx, 380, 222, 64, 18, hot ? '#3a3060' : '#241f3e', '#6b5a9c', '#0a0614', 4);
    F.draw(ctx, 'LEAVE', 412, 227, '#c9bce8', { center: true, shadow: false });
    ctx.restore();
  }

  /* On the way down: whatever you ate is now in you, and not in the bag. */
  function eat(g) {
    const sn = g.save.snack;
    g.snackNow = sn && sn.n ? sn : null;
    g.save.snack = null;
    return g.snackNow;
  }

  PD.market = { ITEMS, STALLS, CASINO, FULL, open, close, update, draw, drawStall, drawCasino, icon, hatAt, plantAt,
    HAT_COL, eat, PAN, kin };
})(window.PD);
