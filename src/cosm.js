/* COSM: things to wear, bought off ABAY.

   Four slots, one thing in each: a HAT on top of your head, something on
   your FACE, something on your BACK, and a PET that follows you about. Each
   is painted once at double detail with the paint kit and drawn over (or
   behind) the alien wherever the alien is drawn. A few of them move: the
   propeller spins, the cape flaps, the fish in the fishbowl swims about.

   The colour options from the old wardrobe (skin, suit, visor) are sold on
   ABAY as well and still go through PD.art.skinFor; they live here too so
   the shop has one list to read.

   Save: g.save.cosm = { own: {id: 1}, on: {hat, face, back, pet} } */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const PT = PD.paint;
  const D = PD.data;
  const HD = 2;
  const INK = 0x160f24;
  const R = PT.ramp;
  const GOLD = [0xffc83a, 0xfff0a0, 0xb8801a];
  const W = 80, H = 72;                 // the buffer every item is painted in
  // where each slot's anchor sits in that buffer
  const ANCHOR = { hat: [40, 60], face: [40, 36], back: [40, 36], pet: [40, 68] };

  const L = [];
  function add(o) { L.push(o); }

  /* ---------------------------------------------------------------- HATS
     painted with the brim on y = by, centred on cx, growing upward */
  add({ id: 'partyhat', slot: 'hat', name: 'PARTY HAT', price: 500, desc: 'IT IS NOBODY\'S BIRTHDAY. WEAR IT ANYWAY.',
    paint(B, cx, by) {
      B.poly([[cx - 12, by], [cx + 12, by], [cx + 1, by - 34]], 0xff5a8a);
      for (let i = 0; i < 4; i++) B.poly([[cx - 10 + i * 2.6, by - 4 - i * 8], [cx + 10 - i * 2.6, by - 4 - i * 8], [cx + 9 - i * 2.6, by - 8 - i * 8], [cx - 9 + i * 2.6, by - 8 - i * 8]], [0xffd34d, 0x7ef9ff, 0x8affa0, 0xffffff][i]);
      B.ball(cx + 1, by - 36, 5, 5, R(0xffd34d), true);
      B.rect(cx - 12, by - 2, 24, 3, 0xc83a6a);
    } });
  add({ id: 'tophat', slot: 'hat', name: 'TOP HAT', price: 4000, desc: 'FOR SIGNING CONTRACTS YOU HAVE NOT READ.',
    paint(B, cx, by) {
      B.ellipse(cx, by - 2, 22, 5, 0x1a1624); B.ellipse(cx, by - 3, 20, 3.5, 0x2e2838);
      B.block(cx - 14, by - 40, 28, 38, [0x2a2434, 0x4a4258, 0x14101c], 5, 5);
      B.rect(cx - 14, by - 12, 28, 6, 0xc83a4a); B.rect(cx - 14, by - 12, 28, 1, 0xff7a8a);
      B.rect(cx - 10, by - 36, 3, 22, 0x5a5268);
    } });
  add({ id: 'crown', slot: 'hat', name: 'GOLD CROWN', price: 250000, desc: 'KING OF A MOON. A SMALL ONE. STILL COUNTS.',
    paint(B, cx, by) {
      B.poly([[cx - 18, by], [cx + 18, by], [cx + 20, by - 22], [cx + 11, by - 12], [cx + 5, by - 28], [cx, by - 14], [cx - 5, by - 28], [cx - 11, by - 12], [cx - 20, by - 22]], GOLD[0]);
      B.rect(cx - 18, by - 7, 36, 7, GOLD[2]); B.rect(cx - 18, by - 7, 36, 2, GOLD[1]);
      for (const [x, c] of [[-10, 0xd83a4a], [0, 0x3a8ad8], [10, 0x3ad86a]]) B.ball(cx + x, by - 4, 3, 2.5, R(c), true);
      for (const x of [-20, -5, 5, 20]) B.disc(cx + x, by - (Math.abs(x) > 10 ? 23 : 29), 2.4, 0xfff0a0);
    },
    live(ctx, t) { if (Math.sin(t * 2.3) > 0.6) { const k = Math.sin(t * 2.3) - 0.6; X.rect(ctx, 2, -14 - k * 4, 1, 3, '#ffffff'); X.rect(ctx, 1, -13 - k * 4, 3, 1, '#ffffff'); } } });
  add({ id: 'cowboy', slot: 'hat', name: 'COWBOY HAT', price: 3000, desc: 'THIS MOON AIN\'T BIG ENOUGH FOR THE BOTH OF US. IT IS QUITE BIG.',
    paint(B, cx, by) {
      B.ellipse(cx, by - 3, 30, 6, 0x7a4a24); B.ellipse(cx, by - 5, 28, 4, 0xa8703a);
      B.poly([[cx - 30, by - 5], [cx - 34, by - 12], [cx - 24, by - 6]], 0xa8703a); B.poly([[cx + 30, by - 5], [cx + 34, by - 12], [cx + 24, by - 6]], 0xa8703a);
      B.round(cx - 15, by - 26, 30, 22, 8, 0x9a6230); B.rect(cx - 2, by - 26, 4, 8, 0x6a3a18);
      B.rect(cx - 15, by - 10, 30, 4, 0x3a2410); B.disc(cx + 8, by - 8, 2, 0xffd34d);
      B.rect(cx - 12, by - 24, 4, 12, 0xc08850);
    } });
  add({ id: 'propeller', slot: 'hat', name: 'PROPELLER CAP', price: 1500, desc: 'DOES NOT MAKE YOU FLY. HAS BEEN TESTED. TWICE.',
    paint(B, cx, by) {
      B.round(cx - 16, by - 16, 32, 18, 10, 0x3a6ad8);
      for (let i = 0; i < 4; i++) B.poly([[cx, by - 16], [cx - 16 + i * 8, by], [cx - 8 + i * 8, by]], [0xd83a4a, 0xffd34d, 0x3ad86a, 0x3a6ad8][i], 0.9);
      B.ellipse(cx + 16, by - 2, 10, 3, 0xd83a4a);
      B.rect(cx - 1, by - 24, 2, 8, 0x8a8a9a);
    },
    live(ctx, t) {
      const s = Math.cos(t * 30), w = Math.abs(s) * 11 + 1;
      X.rect(ctx, -Math.round(w), -12, Math.round(w * 2), 2, s > 0 ? '#ffd34d' : '#d83a4a');
      X.rect(ctx, -1, -13, 2, 2, '#ffffff');
    } });
  add({ id: 'chef', slot: 'hat', name: 'CHEF HAT', price: 2000, desc: 'YOU CANNOT COOK. YOU CAN LOOK LIKE YOU CAN.',
    paint(B, cx, by) {
      B.rect(cx - 14, by - 12, 28, 12, 0xe8e8f4); B.rect(cx - 14, by - 12, 28, 2, 0xffffff);
      for (const [x, y, r] of [[-10, -22, 10], [10, -22, 10], [0, -30, 12], [-4, -20, 9]]) B.ball(cx + x, by + y, r, r * 0.9, [0xf0f0fa, 0xffffff, 0xc8c8d8]);
    } });
  add({ id: 'viking', slot: 'hat', name: 'VIKING HELMET', price: 12000, desc: 'THE HORNS ARE REAL. THE VIKING WAS NOT.',
    paint(B, cx, by) {
      for (const s of [-1, 1]) { B.poly([[cx + s * 12, by - 12], [cx + s * 22, by - 18], [cx + s * 26, by - 36], [cx + s * 18, by - 22], [cx + s * 10, by - 18]], 0xf0e8d0); B.line(cx + s * 20, by - 22, cx + s * 25, by - 34, 0xffffff, 1); }
      B.ball(cx, by - 12, 16, 14, R(0x9aa0b8), true);
      B.rect(cx - 16, by - 5, 32, 5, 0x6a7088); for (let i = 0; i < 6; i++) B.disc(cx - 13 + i * 5.2, by - 3, 1, 0xd8dce8);
      B.rect(cx - 1, by - 26, 2, 22, 0x6a7088);
    } });
  add({ id: 'halo', slot: 'hat', name: 'HALO', price: 50000, desc: 'YOU HAVE DESTROYED NINE PLANETS. THE HALO DOES NOT CARE.',
    paint(B, cx, by) { B.ellipse(cx, by - 14, 18, 5, 0xffe070); B.ellipse(cx, by - 14, 13, 2.5, null); B.ellipse(cx, by - 15, 16, 1, 0xfffbe0); },
    live(ctx, t) { PT.glow(ctx, 0, -7 + Math.sin(t * 2) * 1, 14, '#ffe070', 0.35); },
    bob: 1.2 });
  add({ id: 'cone', slot: 'hat', name: 'TRAFFIC CONE', price: 300, desc: 'FOUND IT. IT IS YOURS NOW. THAT IS HOW FINDING WORKS.',
    paint(B, cx, by) {
      B.rect(cx - 16, by - 4, 32, 4, 0xd8581a);
      B.poly([[cx - 12, by - 4], [cx + 12, by - 4], [cx + 3, by - 38], [cx - 3, by - 38]], 0xff7a2a);
      B.poly([[cx - 9, by - 14], [cx + 9, by - 14], [cx + 7, by - 21], [cx - 7, by - 21]], 0xffffff);
      B.poly([[cx - 6, by - 26], [cx + 6, by - 26], [cx + 5, by - 31], [cx - 5, by - 31]], 0xffffff);
      B.line(cx - 8, by - 6, cx - 2, by - 36, 0xffb070, 2);
    } });
  add({ id: 'sharkhat', slot: 'hat', name: 'SHARK FIN HAT', price: 20000, desc: 'MR CHUM SAW IT AND SMILED. NOBODY LIKED THAT.',
    paint(B, cx, by) {
      B.round(cx - 16, by - 12, 32, 13, 6, 0x5a7ab0); B.rect(cx - 16, by - 4, 32, 4, 0x3a5a88);
      B.poly([[cx - 8, by - 10], [cx + 10, by - 10], [cx + 6, by - 20], [cx - 4, by - 40]], 0x6a8ac8);
      B.line(cx - 4, by - 36, cx - 5, by - 12, 0x9ab8e8, 2);
      for (let i = 0; i < 5; i++) B.poly([[cx - 12 + i * 5, by - 4], [cx - 8 + i * 5, by - 4], [cx - 10 + i * 5, by]], 0xffffff);
    } });
  add({ id: 'catears', slot: 'hat', name: 'CAT EARS', price: 2500, desc: 'MEOW IS NOT A LANGUAGE. YOU HAVE STARTED SPEAKING IT.',
    paint(B, cx, by) {
      B.rect(cx - 16, by - 4, 32, 3, 0x2a2434);
      for (const s of [-1, 1]) { B.poly([[cx + s * 16, by - 2], [cx + s * 4, by - 4], [cx + s * 13, by - 22]], 0x3a3444); B.poly([[cx + s * 13, by - 5], [cx + s * 7, by - 6], [cx + s * 12, by - 16]], 0xff8ab0); }
    } });
  add({ id: 'beanie', slot: 'hat', name: 'COSY BEANIE', price: 800, desc: 'SPACE IS COLD. THIS IS WARM. THAT IS THE WHOLE PITCH.',
    paint(B, cx, by) {
      B.round(cx - 17, by - 22, 34, 22, 12, 0x3ab88a);
      for (let i = 0; i < 7; i++) B.rect(cx - 15 + i * 5, by - 20, 1, 14, 0x2a8a6a);
      B.rect(cx - 17, by - 7, 34, 7, 0xf0e8d0); for (let i = 0; i < 8; i++) B.rect(cx - 16 + i * 4.4, by - 7, 2, 7, 0xd8d0b8);
      B.ball(cx, by - 26, 7, 6, [0xffd34d, 0xfff0a0, 0xc89a1e]);
    } });
  add({ id: 'pirate', slot: 'hat', name: 'PIRATE HAT', price: 8000, desc: 'ARR. THAT IS ALL IT SAYS. EVERYONE UNDERSTANDS.',
    paint(B, cx, by) {
      B.poly([[cx - 28, by - 4], [cx + 28, by - 4], [cx + 20, by - 14], [cx + 8, by - 22], [cx, by - 30], [cx - 8, by - 22], [cx - 20, by - 14]], 0x1e1a28);
      B.poly([[cx - 26, by - 5], [cx + 26, by - 5], [cx + 22, by - 9], [cx - 22, by - 9]], 0xd8a83a);
      B.disc(cx, by - 17, 5, 0xf0f0f4); B.rect(cx - 3, by - 15, 2, 2, INK); B.rect(cx + 1, by - 15, 2, 2, INK);
      B.line(cx - 7, by - 10, cx + 7, by - 12, 0xf0f0f4, 1); B.line(cx - 7, by - 12, cx + 7, by - 10, 0xf0f0f4, 1);
    } });
  add({ id: 'wizard', slot: 'hat', name: 'WIZARD HAT', price: 30000, desc: 'CASTS ONE SPELL. THE SPELL IS LOOKING COOL.',
    paint(B, cx, by) {
      B.ellipse(cx, by - 3, 26, 5, 0x3a2a8a);
      B.poly([[cx - 16, by - 4], [cx + 16, by - 4], [cx + 10, by - 26], [cx + 22, by - 44], [cx + 2, by - 32]], 0x5a3ac8);
      B.line(cx - 10, by - 6, cx + 4, by - 30, 0x7a5ae8, 2);
      for (const [x, y] of [[-6, -12], [6, -18], [0, -26]]) { B.rect(cx + x - 1, by + y - 3, 2, 6, 0xffd34d); B.rect(cx + x - 3, by + y - 1, 6, 2, 0xffd34d); }
    },
    live(ctx, t) { for (let k = 0; k < 3; k++) { const q = (t * 0.5 + k / 3) % 1; ctx.globalAlpha = 1 - q; X.rect(ctx, 11 + Math.sin(q * 6 + k) * 3, -22 + q * 10, 1, 1, '#ffd34d'); } ctx.globalAlpha = 1; } });
  add({ id: 'fishbowl', slot: 'hat', name: 'FISHBOWL HELMET', price: 15000, desc: 'THERE IS A FISH IN IT. HIS NAME IS GARY. GARY IS FINE.', over: 1,
    paint(B, cx, by) {
      B.ellipse(cx, by - 12, 24, 26, 0x9ae0ff, 0.28);
      B.ellipse(cx, by + 2, 20, 8, 0x3a8ad8, 0.4);
      B.ellipse(cx - 10, by - 26, 5, 8, 0xffffff, 0.7);
      B.rect(cx - 16, by + 10, 32, 4, 0x8a92a8);
    },
    live(ctx, t) {
      const fx = Math.sin(t * 1.3) * 7, dir = Math.cos(t * 1.3) > 0 ? 1 : -1;
      X.blob(ctx, fx, -4, 3, 2, '#ff8a2a'); X.poly(ctx, [[fx - dir * 3, -4], [fx - dir * 6, -6], [fx - dir * 6, -2]], '#ff8a2a');
      X.rect(ctx, fx + dir * 1, -5, 1, 1, '#1a1024');
      if (Math.sin(t * 3) > 0.9) X.rect(ctx, fx + dir * 4, -8 - ((t * 10) % 6), 1, 1, '#ffffff');
    } });
  add({ id: 'frog', slot: 'hat', name: 'FROG HAT', price: 5000, desc: 'THE FROG IS KNITTED. THE FROG IS WATCHING.',
    paint(B, cx, by) {
      B.round(cx - 18, by - 18, 36, 20, 10, 0x5ab84a);
      for (const s of [-1, 1]) { B.ball(cx + s * 9, by - 22, 7, 7, R(0x6ac85a)); B.disc(cx + s * 9, by - 22, 4, 0xffffff); B.disc(cx + s * 9 + 1, by - 22, 2, INK); }
      B.line(cx - 8, by - 9, cx + 8, by - 9, 0x2a6a24, 2);
      B.disc(cx - 12, by - 8, 2, 0xff8ab0, 0.7); B.disc(cx + 12, by - 8, 2, 0xff8ab0, 0.7);
    } });
  add({ id: 'antlers', slot: 'hat', name: 'MOON ANTLERS', price: 9000, desc: 'GROWN ON THE DARK SIDE. BY WHOM. DO NOT ASK.',
    paint(B, cx, by) {
      for (const s of [-1, 1]) {
        B.line(cx + s * 6, by, cx + s * 16, by - 26, 0x8a6a4a, 3);
        B.line(cx + s * 11, by - 13, cx + s * 22, by - 16, 0x8a6a4a, 3);
        B.line(cx + s * 14, by - 22, cx + s * 8, by - 34, 0x8a6a4a, 3);
        B.line(cx + s * 16, by - 26, cx + s * 24, by - 34, 0x8a6a4a, 3);
      }
      B.rect(cx - 12, by - 2, 24, 3, 0x3a2a1a);
    } });
  add({ id: 'chumfin', slot: 'hat', name: 'GOLDEN FIN', price: 1000000, desc: 'MR CHUM HAS ONE. NOW YOU HAVE ONE. HE IS FURIOUS.',
    paint(B, cx, by) {
      B.round(cx - 14, by - 6, 28, 7, 3, GOLD[2]);
      B.poly([[cx - 10, by - 5], [cx + 12, by - 5], [cx + 8, by - 18], [cx - 6, by - 44]], GOLD[0]);
      B.line(cx - 5, by - 40, cx - 6, by - 8, GOLD[1], 2);
    },
    live(ctx, t) { PT.glow(ctx, 0, -12, 16, '#ffd34d', 0.25 + Math.sin(t * 3) * 0.08); } });

  /* ---------------------------------------------------------------- FACE
     centred on the eyes at (cx, cy) */
  function lens(B, x, y, rx, ry, c, a) { B.ellipse(x, y, rx, ry, c, a); B.ellipse(x - rx * 0.35, y - ry * 0.35, rx * 0.3, ry * 0.25, 0xffffff, 0.8); }
  add({ id: 'shades', slot: 'face', name: 'SUNGLASSES', price: 1200, desc: 'COOLER BY ONE PERCENT. THE SUN IS FAR AWAY.',
    paint(B, cx, cy) { B.rect(cx - 16, cy - 3, 32, 2, 0x1a1624); for (const s of [-1, 1]) { B.round(cx + s * 8 - 7, cy - 4, 14, 9, 3, 0x1a1624); lens(B, cx + s * 8, cy, 5.5, 3.5, 0x2a2a4a); } } });
  add({ id: 'monocle', slot: 'face', name: 'MONOCLE', price: 6000, desc: 'FOR LOOKING AT THINGS AND DISAPPROVING OF THEM.',
    paint(B, cx, cy) { B.disc(cx + 7, cy, 7, 0xffc83a); B.disc(cx + 7, cy, 5.5, 0xc8f0ff, 0.5); B.ellipse(cx + 5, cy - 2, 2, 1.5, 0xffffff); B.line(cx + 12, cy + 5, cx + 14, cy + 18, 0xffc83a, 1); } });
  add({ id: 'glasses3d', slot: 'face', name: '3D GLASSES', price: 900, desc: 'EVERYTHING IS THREE D NOW. IT WAS BEFORE. IT IS MORE NOW.',
    paint(B, cx, cy) { B.rect(cx - 17, cy - 5, 34, 10, 0xf0f0f4); B.rect(cx - 14, cy - 3, 11, 6, 0xff3a4a, 0.85); B.rect(cx + 3, cy - 3, 11, 6, 0x3ad8ff, 0.85); } });
  add({ id: 'hearts', slot: 'face', name: 'HEART GLASSES', price: 2000, desc: 'EVERYTHING LOOKS LOVELY. EVEN MR CHUM. CAREFUL.',
    paint(B, cx, cy) {
      B.rect(cx - 4, cy - 2, 8, 2, 0xff5a8a);
      for (const s of [-1, 1]) { const x = cx + s * 9; B.disc(x - 3, cy - 2, 4, 0xff5a8a); B.disc(x + 3, cy - 2, 4, 0xff5a8a); B.poly([[x - 7, cy - 1], [x + 7, cy - 1], [x, cy + 7]], 0xff5a8a); B.disc(x - 3, cy - 3, 1.5, 0xffc0d8); }
    } });
  add({ id: 'visor', slot: 'face', name: 'CYBER VISOR', price: 40000, desc: 'SHOWS YOUR NET WORTH TO ANYONE WHO LOOKS AT YOU.',
    paint(B, cx, cy) { B.round(cx - 18, cy - 5, 36, 10, 4, 0x1a2a3a); B.round(cx - 16, cy - 4, 32, 7, 3, 0x2a8ab8, 0.9); B.rect(cx - 15, cy - 3, 30, 1, 0x9ae0ff); },
    live(ctx, t) { const x = Math.round(Math.sin(t * 3) * 7); X.rect(ctx, x - 1, -1, 3, 2, '#aef8ff'); PT.glow(ctx, x, 0, 6, '#38e8ff', 0.5); } });
  add({ id: 'clown', slot: 'face', name: 'CLOWN NOSE', price: 400, desc: 'HONK. IT DOES NOT HONK. YOU HAVE TO SAY HONK.',
    paint(B, cx, cy) { B.ball(cx + 2, cy + 8, 5, 5, R(0xff3a4a), true); } });
  add({ id: 'eyepatch', slot: 'face', name: 'EYEPATCH', price: 1500, desc: 'BOTH EYES ARE FINE. THIS IS A LIFESTYLE.',
    paint(B, cx, cy) { B.line(cx - 16, cy - 6, cx + 16, cy + 2, 0x1a1624, 1); B.round(cx + 2, cy - 4, 11, 9, 4, 0x1a1624); } });
  add({ id: 'bubblegum', slot: 'face', name: 'BUBBLEGUM', price: 700, desc: 'CHEWED BY SOMEONE ELSE FIRST. STILL GOT FLAVOUR.',
    paint(B, cx, cy) { B.disc(cx + 3, cy + 10, 2, 0xff8ab0); },
    live(ctx, t) { const q = (t * 0.4) % 1, r = q < 0.8 ? q * 7 : 0; if (r > 0.5) { X.blob(ctx, 3, 6 + r * 0.3, r, r, '#ff9ac8'); X.rect(ctx, 1, 4, 1, 1, '#ffffff'); } } });

  /* ---------------------------------------------------------------- BACK
     painted for an alien facing right, so they hang off to the left */
  add({ id: 'cape', slot: 'back', name: 'HERO CAPE', price: 5000, desc: 'NO HERO HAS EVER OWED THIS MUCH MONEY. FIRST TIME.',
    paint() {},
    live(ctx, t, o) {
      const fl = Math.sin(t * 6) * 3 + (o.vx ? Math.min(8, Math.abs(o.vx) / 12) : 0);
      X.poly(ctx, [[-4, -4], [4, -4], [2 - fl * 0.4, 22], [-12 - fl, 20], [-8 - fl * 0.6, 8]], '#c83a4a');
      X.poly(ctx, [[-4, -4], [0, -4], [-4 - fl * 0.4, 20], [-10 - fl, 19]], '#e85a6a');
      X.rect(ctx, -4, -5, 8, 2, '#ffd34d');
    } });
  function wing(B, cx, cy, feather, C) {
    // five long feathers fanning up and back, then the coverts over the root
    for (let i = 0; i < 6; i++) {
      const a = -0.2 - i * 0.26, len = 40 - i * 3;
      for (let k = 0; k < len; k++) {
        const q = k / len, x = cx - Math.cos(a) * k, y = cy + Math.sin(a) * k * 0.9 + q * q * 4;
        B.disc(x, y, 6 - q * 3, i % 2 ? C[0] : C[1]);
      }
    }
    B.ball(cx - 4, cy + 1, 9, 7, C);
    for (let i = 0; i < 5; i++) B.line(cx - 6, cy - 2, cx - 26 + i * 2, cy - 12 - i * 3, C[2], 1, 0.5);
  }
  add({ id: 'wings', slot: 'back', name: 'ANGEL WINGS', price: 60000, desc: 'HEAVEN SAID NO. ABAY SAID FIVE STARS.', flap: 1,
    paint(B, cx, cy) { wing(B, cx - 2, cy - 2, true, [0xf0f0fa, 0xffffff, 0xc8c8d8]); } });
  add({ id: 'batwings', slot: 'back', name: 'BAT WINGS', price: 25000, desc: 'VERY SPOOKY. VERY LEATHERY. VERY HARD TO SIT DOWN.', flap: 1,
    paint(B, cx, cy) {
      B.poly([[cx - 2, cy - 4], [cx - 30, cy - 14], [cx - 26, cy - 4], [cx - 32, cy + 2], [cx - 22, cy + 2], [cx - 24, cy + 10], [cx - 12, cy + 6], [cx - 2, cy + 8]], 0x3a2a4a);
      for (let i = 0; i < 3; i++) B.line(cx - 2, cy - 2, cx - 30 + i * 4, cy - 12 + i * 8, 0x5a4a6a, 1);
    } });
  add({ id: 'boosters', slot: 'back', name: 'ROCKET BOOSTERS', price: 35000, desc: 'TWIN ROCKETS. THEY DO NOT WORK. THE FLAMES DO.',
    paint(B, cx, cy) {
      for (const dx of [-14, -4]) { B.round(cx + dx - 5, cy - 10, 10, 26, 5, 0xc8ccd8); B.rect(cx + dx - 3, cy - 8, 2, 20, 0xffffff); B.poly([[cx + dx - 5, cy - 8], [cx + dx + 5, cy - 8], [cx + dx, cy - 18]], 0xd83a4a); B.rect(cx + dx - 4, cy + 14, 8, 4, 0x5a5a6a); }
    },
    live(ctx, t) {
      for (const dx of [-7, -2]) { const f = 4 + Math.random() * 4; X.poly(ctx, [[dx - 2, 9], [dx + 2, 9], [dx, 9 + f]], '#ffd34d'); X.poly(ctx, [[dx - 1, 9], [dx + 1, 9], [dx, 9 + f * 0.6]], '#ffffff'); }
    } });
  add({ id: 'backpack', slot: 'back', name: 'SCHOOL BACKPACK', price: 700, desc: 'FULL OF HOMEWORK FROM A PLANET YOU BLEW UP.',
    paint(B, cx, cy) { B.round(cx - 16, cy - 10, 14, 22, 5, 0xe85a3a); B.round(cx - 18, cy + 2, 16, 9, 3, 0xc83a2a); B.rect(cx - 12, cy - 8, 2, 16, 0xff9a7a); B.rect(cx - 4, cy - 10, 3, 20, 0x3a2a2a); } });
  add({ id: 'balloon', slot: 'back', name: 'BALLOON', price: 300, desc: 'IT IS A BALLOON. IT IS RED. IT IS YOUR BEST FRIEND.',
    paint() {},
    live(ctx, t) {
      const bx = -10 + Math.sin(t * 1.4) * 3, byy = -34 + Math.sin(t * 2.1) * 2;
      X.line(ctx, -2, 0, bx, byy + 7, '#e8e8f0');
      X.blob(ctx, bx, byy, 7, 8, '#b82a3a'); X.blob(ctx, bx - 0.5, byy - 0.5, 6, 7, '#e83a4a'); X.blob(ctx, bx - 2, byy - 3, 2, 3, '#ff9aa8');
      X.poly(ctx, [[bx - 1, byy + 8], [bx + 1, byy + 8], [bx, byy + 6]], '#b82a3a');
    } });
  add({ id: 'guitar', slot: 'back', name: 'SPACE GUITAR', price: 10000, desc: 'YOU KNOW ONE CHORD. IT IS THE LOUD ONE.',
    paint(B, cx, cy) {
      B.line(cx - 4, cy - 16, cx - 26, cy + 18, 0x6a4a2a, 3);
      B.ball(cx - 24, cy + 16, 10, 8, R(0xd83aa8)); B.ball(cx - 16, cy + 8, 7, 6, R(0xd83aa8)); B.disc(cx - 20, cy + 12, 2.5, INK);
      B.round(cx - 6, cy - 20, 6, 6, 2, 0x3a2a1a);
    } });

  /* ---------------------------------------------------------------- PETS
     standing on (cx, by); they follow you about on their own */
  function eyes(B, x, y, gap, r) { for (const s of [-1, 1]) { B.disc(x + s * gap, y, r, 0xffffff); B.disc(x + s * gap + r * 0.3, y, r * 0.55, INK); B.disc(x + s * gap - r * 0.2, y - r * 0.4, r * 0.25, 0xffffff); } }
  add({ id: 'petrock', slot: 'pet', name: 'PET ROCK', price: 50, desc: 'LOYAL. QUIET. HOPS. THE BEST FRIEND MONEY CAN BUY.', hop: 1,
    paint(B, cx, by) { B.ball(cx, by - 8, 12, 9, [0x8a82a0, 0xb8b0cc, 0x5a5270]); B.texture(cx - 12, by - 17, 24, 18, [0x7a7290, 0x8a82a0], 3, 5, (x, y) => B.alpha(x, y) > 0 && (x + y) % 5 === 0); eyes(B, cx + 2, by - 10, 4, 3); } });
  add({ id: 'petduck', slot: 'pet', name: 'DUCK DRONE', price: 8000, desc: 'A RUBBER DUCK WITH A PROPELLER. IT QUACKS IN BINARY.', fly: 1,
    paint(B, cx, by) {
      B.ball(cx - 2, by - 12, 12, 9, [0xffd34d, 0xfff0a0, 0xc89a1e]); B.ball(cx + 7, by - 24, 7, 7, [0xffd34d, 0xfff0a0, 0xc89a1e]);
      B.poly([[cx + 12, by - 24], [cx + 20, by - 22], [cx + 12, by - 20]], 0xff8a2a); B.disc(cx + 9, by - 26, 1.6, INK);
      B.rect(cx + 6, by - 34, 2, 4, 0x8a8a9a);
    },
    live(ctx, t) { const w = Math.abs(Math.cos(t * 28)) * 7 + 1; X.rect(ctx, 3.5 - w, -17, Math.round(w * 2), 1, '#c8ccd8'); } });
  add({ id: 'petshark', slot: 'pet', name: 'BABY SHARK', price: 30000, desc: 'DO DO DO DO DO DO. HE BITES. GENTLY.', fly: 1,
    paint(B, cx, by) {
      B.ellipse(cx, by - 14, 16, 8, 0x5a7ab0); B.ellipse(cx, by - 16, 14, 6, 0x8ab0e8); B.ellipse(cx + 2, by - 11, 10, 3, 0xe0f0ff);
      B.poly([[cx - 2, by - 20], [cx + 6, by - 20], [cx - 2, by - 32]], 0x6a8ac8);
      B.poly([[cx - 14, by - 14], [cx - 24, by - 22], [cx - 22, by - 8]], 0x6a8ac8);
      eyes(B, cx + 8, by - 17, 0, 2.6);
      for (let i = 0; i < 3; i++) B.poly([[cx + 8 + i * 2.5, by - 11], [cx + 10 + i * 2.5, by - 11], [cx + 9 + i * 2.5, by - 9]], 0xffffff);
    } });
  add({ id: 'petcat', slot: 'pet', name: 'SPACE CAT', price: 15000, desc: 'SHE WAS HERE BEFORE YOU. SHE WILL BE HERE AFTER.', hop: 0.4,
    paint(B, cx, by) {
      B.ball(cx - 2, by - 9, 12, 8, R(0x3a3444)); B.ball(cx + 8, by - 18, 8, 7, R(0x4a4454));
      for (const s of [-1, 1]) B.poly([[cx + 8 + s * 7, by - 20], [cx + 8 + s * 2, by - 23], [cx + 8 + s * 7, by - 30]], 0x4a4454);
      B.disc(cx + 5, by - 18, 2, 0x8affa0); B.disc(cx + 11, by - 18, 2, 0x8affa0); B.rect(cx + 5, by - 19, 1, 2, INK); B.rect(cx + 11, by - 19, 1, 2, INK);
      B.rect(cx + 7, by - 15, 2, 1, 0xff8ab0);
      B.ellipse(cx - 6, by - 8, 6, 4, 0x7ab8ff, 0.5);
    },
    live(ctx, t) { const k = Math.sin(t * 3) * 3; X.line(ctx, -7, -4, -12, -10 + k, '#3a3444'); X.line(ctx, -12, -10 + k, -11, -14 + k, '#3a3444'); } });
  add({ id: 'petrobot', slot: 'pet', name: 'TINY ROBOT', price: 20000, desc: 'BEEP. IT MEANS HELLO. IT ALSO MEANS OWNER IS POOR.', hop: 0.6,
    paint(B, cx, by) {
      B.block(cx - 9, by - 16, 18, 14, [0xa8b0c8, 0xd8e0f0, 0x6a7088], 3, 3);
      B.round(cx - 10, by - 30, 20, 14, 4, 0xc8d0e0); B.round(cx - 8, by - 28, 16, 10, 3, 0x1a2a3a);
      B.rect(cx - 5, by - 25, 3, 3, 0x7dff9a); B.rect(cx + 2, by - 25, 3, 3, 0x7dff9a);
      B.rect(cx - 1, by - 36, 2, 6, 0x8a8a9a);
      for (const s of [-1, 1]) B.rect(cx + s * 5 - 2, by - 3, 4, 3, 0x4a5064);
    },
    live(ctx, t) { X.rect(ctx, -1, -19, 2, 2, Math.sin(t * 6) > 0 ? '#ff5a4d' : '#6a2020'); } });
  add({ id: 'petufo', slot: 'pet', name: 'MINI UFO', price: 45000, desc: 'A SAUCER FOR ANTS. THE ANTS WANT IT BACK.', fly: 1,
    paint(B, cx, by) { B.ellipse(cx, by - 12, 18, 5, 0x8a92a8); B.ellipse(cx, by - 14, 16, 3, 0xc0c8d8); B.ellipse(cx, by - 18, 8, 6, 0x7ec8ff, 0.8); B.disc(cx - 2, by - 20, 1.6, 0xffffff); },
    live(ctx, t) { for (let k = 0; k < 4; k++) X.rect(ctx, -7 + k * 4.5, -6, 1, 1, Math.floor(t * 6 + k) % 2 ? '#ffd34d' : '#ff5a8a'); ctx.globalAlpha = 0.25; X.poly(ctx, [[-4, -5], [4, -5], [7, 6], [-7, 6]], '#8affa0'); ctx.globalAlpha = 1; } });
  add({ id: 'petchum', slot: 'pet', name: 'BABY CHUM', price: 500000, desc: 'A VERY SMALL MR CHUM. HE CHARGES INTEREST ON CUDDLES.', hop: 0.5,
    paint(B, cx, by) {
      B.block(cx - 8, by - 14, 16, 14, [0x2a2e44, 0x4a4e68, 0x14162a], 3, 2);
      B.poly([[cx - 2, by - 14], [cx + 2, by - 14], [cx, by - 6]], 0xd83a4a);
      B.ball(cx, by - 22, 11, 9, [0x7a8ab8, 0xaab8e0, 0x4a5a88]);
      B.poly([[cx - 2, by - 28], [cx + 6, by - 28], [cx - 2, by - 40]], 0x6a7aa8);
      B.ellipse(cx + 3, by - 18, 7, 3, 0xe8f0ff); for (let i = 0; i < 4; i++) B.poly([[cx - 2 + i * 3, by - 19], [cx + i * 3, by - 19], [cx - 1 + i * 3, by - 16]], 0xffffff);
      eyes(B, cx + 3, by - 24, 4, 2.2);
    } });

  const BY = {};
  for (const c of L) BY[c.id] = c;
  const SLOTS = ['hat', 'face', 'back', 'pet'];
  const SLOT_NAME = { hat: 'HATS', face: 'FACE', back: 'BACK', pet: 'PETS', colour: 'COLOURS' };

  /* The colour options from the old wardrobe, as shop items. */
  const COLOURS = [];
  for (const grp of ['skin', 'suit', 'glass']) {
    const c = D.COS[grp];
    if (!c) continue;
    for (const o of c.options) {
      if (!o.cost) continue;
      COLOURS.push({ id: grp + ':' + o.id, slot: 'colour', grp, opt: o.id, name: o.name.toUpperCase(), price: o.cost, col: o.c,
        desc: (grp === 'skin' ? 'NEW SKIN COLOUR. ' : grp === 'suit' ? 'NEW SUIT COLOUR. ' : 'NEW EYE TINT. ') + c.blurb.toUpperCase() });
    }
  }
  for (const c of COLOURS) BY[c.id] = c;

  /* --------------------------------------------------------------- save */
  function st(g) {
    const s = g.save;
    if (!s.cosm) s.cosm = { own: {}, on: {} };
    if (!s.cosm.own) s.cosm.own = {};
    if (!s.cosm.on) s.cosm.on = {};
    return s.cosm;
  }
  function owns(g, id) {
    const it = BY[id];
    if (it && it.slot === 'colour') return !!st(g).own[id] || (g.save.cos && g.save.cos[it.grp] === it.opt);
    return !!st(g).own[id];
  }
  function wearing(g, id) {
    const it = BY[id];
    if (!it) return false;
    if (it.slot === 'colour') return !!(g.save.cos && g.save.cos[it.grp] === it.opt);
    return st(g).on[it.slot] === id;
  }
  function buy(g, id) {
    const it = BY[id];
    if (!it || owns(g, id)) return false;
    if (g.save.credits < it.price) return false;
    g.save.credits -= it.price;
    st(g).own[id] = 1;
    wear(g, id);
    g.saveGame && g.saveGame();
    return true;
  }
  function wear(g, id) {
    const it = BY[id];
    if (!it || !owns(g, id)) return;
    if (it.slot === 'colour') {
      if (!g.save.cos) g.save.cos = {};
      g.save.cos[it.grp] = wearing(g, id) ? D.COS[it.grp].options[0].id : it.opt;
    } else {
      const on = st(g).on;
      on[it.slot] = on[it.slot] === id ? null : id;
    }
    g.saveGame && g.saveGame();
  }

  /* ---------------------------------------------------------------- art */
  const ART = {};
  function art(id) {
    if (ART[id]) return ART[id];
    const it = BY[id];
    if (!it || !it.paint) return null;
    const B = PT.buf(W, H), a = ANCHOR[it.slot];
    it.paint(B, a[0], a[1]);
    B.rim(0xffffff, 0, -1, 0.3);
    if (!it.over) B.outline(INK);
    const cv = B.toCanvas();
    cv.ox = a[0] / HD; cv.oy = a[1] / HD;
    return (ART[id] = cv);
  }
  function blit(ctx, id, x, y, face, t, o, sy) {
    const it = BY[id];
    const cv = art(id);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (face < 0) ctx.scale(-1, 1);
    if (sy && sy !== 1) ctx.scale(1, sy);
    if (it.flap) { ctx.translate(0, 0); ctx.scale(1, 0.85 + Math.sin(t * 7) * 0.15); ctx.rotate(Math.sin(t * 7) * 0.12); }
    if (cv) ctx.drawImage(cv, -cv.ox, -cv.oy, W / HD, H / HD);
    if (it.live) it.live(ctx, t, o || {});
    ctx.restore();
  }

  /* Where the parts of the alien are, relative to the point the moon hands
     over (the top of the head). Found by eye. */
  const OFF = { hat: [0, 3], face: [2, 7], back: [-5, 21] };

  function drawBehind(ctx, g, x, y, face, t, sq, o) {
    const id = st(g).on.back;
    if (!id || !BY[id]) return;
    blit(ctx, id, x + OFF.back[0] * face, y + OFF.back[1] * (sq || 1), face, t, o);
  }
  function drawOnPlayer(ctx, g, x, y, face, t, sq, o) {
    const on = st(g).on;
    if (on.face && BY[on.face]) blit(ctx, on.face, x + OFF.face[0] * face, y + OFF.face[1] * (sq || 1), face, t, o);
    if (on.hat && BY[on.hat]) {
      const it = BY[on.hat];
      const bob = it.bob ? Math.sin(t * 2) * it.bob - 3 : 0;
      blit(ctx, on.hat, x + OFF.hat[0] * face, y + OFF.hat[1] + bob, face, t, o);
    }
  }

  /* The pet: it trots (or floats) after you, a little behind and a little
     late, and hops when it catches up. */
  const PET = { x: 0, y: 0, vx: 0, face: 1, t: 0, init: 0, key: '' };
  function petStep(g, dt, px, py, key) {
    const id = st(g).on.pet;
    if (!id || !BY[id]) return null;
    if (!PET.init || PET.key !== key) { PET.x = px - 20; PET.y = py; PET.init = 1; PET.key = key; }
    const it = BY[id];
    const want = px - 22 * (g._petFace || 1);
    const dx = want - PET.x;
    PET.vx = U.lerp(PET.vx, U.clamp(dx * 4, -160, 160), Math.min(1, dt * 6));
    PET.x += PET.vx * dt;
    if (Math.abs(dx) > 200) PET.x = want;
    if (Math.abs(PET.vx) > 6) PET.face = PET.vx > 0 ? 1 : -1;
    PET.y = py;
    PET.t += dt;
    return PET;
  }
  function drawPet(ctx, g, t, screenX, groundY, walking) {
    const id = st(g).on.pet;
    if (!id || !BY[id]) return;
    const it = BY[id];
    let y = groundY;
    if (it.fly) y -= 14 + Math.sin(t * 2.4) * 3;
    else if (it.hop) y -= Math.abs(Math.sin(t * 7 * it.hop)) * (Math.abs(PET.vx) > 10 ? 6 : 1.5);
    // a shadow under it
    ctx.globalAlpha = 0.3; X.blob(ctx, screenX, groundY + 1, 7, 2, '#0a0614'); ctx.globalAlpha = 1;
    const sq = it.hop && !it.fly ? 1 + Math.sin(t * 14 * it.hop) * 0.04 : 1;
    blit(ctx, id, screenX, y, PET.face, t, { vx: PET.vx }, sq);
  }

  /* A little portrait of any item, for the shop: the painted part of it
     scaled to fill the box, and still moving. */
  const BOX = {};
  function boxOf(id) {
    if (BOX[id]) return BOX[id];
    const cv = art(id);
    if (!cv) return (BOX[id] = { cx: W / HD / 2, cy: H / HD / 2, w: 20, h: 20 });
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < x0) { x0 = 0; y0 = 0; x1 = cv.width - 1; y1 = cv.height - 1; }
    // things drawn live (a cape, a balloon) have no paint: give them a box
    const it = BY[id];
    if (it.live && (x1 - x0) < 8) { x0 = W / 2 - 40; x1 = W / 2 + 20; y0 = ANCHOR[it.slot][1] - 60; y1 = ANCHOR[it.slot][1] + 40; }
    return (BOX[id] = { cx: (x0 + x1) / 2 / HD, cy: (y0 + y1) / 2 / HD, w: Math.max(6, (x1 - x0) / HD), h: Math.max(6, (y1 - y0) / HD) });
  }
  function icon(ctx, id, x, y, size, t) {
    const it = BY[id];
    if (!it) return;
    if (it.slot === 'colour') {
      // a swatch: three blobs of the colours it gives you
      const c = it.col;
      X.blob(ctx, x, y, size * 0.34, size * 0.34, c[1]);
      X.blob(ctx, x - 1, y - 1, size * 0.3, size * 0.3, c[0]);
      X.blob(ctx, x - size * 0.12, y - size * 0.14, size * 0.1, size * 0.1, c[2]);
      return;
    }
    const cv = art(id), b = boxOf(id);
    const k = Math.min(3, size / b.w, size / b.h);
    const a = ANCHOR[it.slot];
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(k, k);
    ctx.translate(-b.cx, -b.cy);
    if (cv) ctx.drawImage(cv, 0, 0, W / HD, H / HD);
    if (it.live) { ctx.translate(a[0] / HD, a[1] / HD); it.live(ctx, t, {}); }
    ctx.restore();
  }

  PD.cosm = { LIST: L, COLOURS, BY, SLOTS, SLOT_NAME, st, owns, wearing, buy, wear, art, icon, drawOnPlayer, drawBehind, petStep, drawPet, OFF, PET };
})(window.PD);
