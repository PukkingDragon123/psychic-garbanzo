/* THE MOON, ALL THE WAY ROUND.
   It used to be the top of a very big circle: a strip of regolith you could
   walk a few hundred pixels of before the ground ran out. It is a small round
   world now, like a planet in a picture book, and you can walk all the way
   round it and come back to your own front door.

   The camera does the work. Everything on the moon has a place along its
   circumference (`x`, in pixels of arc) and a height above the ground (`y`,
   negative is up). The picture is drawn rotated so that wherever you are
   standing is the top of the world: you never walk upside down, the moon
   turns under your feet. The sun goes round too, slowly, so half of it is
   always in night -- and the buildings you put there light up.

   Inside, the house is a cave: rock, a cardboard bed, a laptop on a box.

   This file also owns the zoomed view every walkable room is drawn through
   (the cutscene rooms in cut.js ride on it), and exports itself as PD.home,
   because everything else in the game still calls it that. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const A = PD.audio;
  const X = PD.pxd;
  const AH = PD.arthome;
  const PT = PD.paint;
  const FX = PD.fx;

  const VW = 480, VH = 270, HD = 2;
  const R = 270;                          // the moon's radius, in pixels
  const C = U.TAU * R;                    // how far it is all the way round
  const IN_W = 320;                       // the cave, wall to wall
  const FLOOR = 216, CEIL = 104;          // the cave floor and roof
  const GRAV = 300;
  const AX = 240;                         // where your feet go in the frame

  const S = { scene: 'out', t: 0, sleep: 0, swing: 0, sun: -1.1, msgT: 0, deck: 0 };
  let g0 = null;

  function wrap(x) { return ((x % C) + C) % C; }
  function wdist(a, b) { return ((a - b) % C + C * 1.5) % C - C / 2; }
  // the lumps: periodic, so the moon joins up with itself
  function bump(x) {
    const a = x / R;
    return 3.2 * Math.sin(3 * a + 0.4) + 2.1 * Math.sin(7 * a + 1.7) + 1.3 * Math.sin(12 * a + 2.9);
  }

  const CUT = () => PD.cut && PD.cut.owns(S.scene);

  function roomW() {
    if (CUT()) return PD.cut.roomW();
    if (S.scene === 'out') return C;
    return IN_W;
  }
  function bounds() {
    if (CUT()) return PD.cut.bounds();
    if (S.scene === 'out') return [-1e9, 1e9];
    return [18, IN_W - 18];
  }
  function groundY(x) {
    if (CUT()) return PD.cut.floor();
    if (S.scene === 'out') return -Math.round(bump(x)) + (PD.build ? PD.build.waterDepth(x) : 0);
    return FLOOR;
  }

  const P = {
    x: 0, y: 0, vx: 0, vy: 0, face: 1, walk: 0, near: null, target: null, autoUse: null, lock: 0,
    roll: 0, rollA: 0, land: 0, air: 0, hop: 0, sweep: 0, swim: 0
  };
  const UI = { mode: null, msg: '', msgT: 0 };

  /* ------------------------------------------------------------ the map */
  const HOUSE_X = 0, PAD_X = 150, FLAG_X = 214, BOARD_X = C - 140, SURVEY_X = C - 64;
  const OUT_SPOTS = [
    { id: 'door', x: HOUSE_X, r: 34, name: 'MY CAVE', sub: 'GO INSIDE' },
    { id: 'ufo', x: PAD_X, r: 40, name: 'YOUR DUMB UFO', sub: 'GO AND HIT A PLANET' }
  ];
  const SPOTS = OUT_SPOTS;
  // places nothing can be built on top of
  const RESERVED = [[HOUSE_X - 64, HOUSE_X + 64], [PAD_X - 46, PAD_X + 50], [BOARD_X - 30, BOARD_X + 30], [FLAG_X - 10, FLAG_X + 10]];

  /* Twelve heaps of somebody else's rubbish, round the far side. */
  const TRASH = [];
  for (let i = 0; i < 12; i++) TRASH.push({ x: 440 + i * 72 + Math.round(U.hash2(i, 3) * 20), k: i % 4 });
  const ALL_CLEAN = (1 << TRASH.length) - 1;
  const TRASH_NAMES = ['A BAG OF SOMEBODY ELSE\'S PROBLEM', 'A DEAD SATELLITE', 'A DRUM OF SOMETHING GREEN', 'A CRATE AND SOME BONES'];
  function cleaned(g, i) { return ((g.save.trash || 0) >> i) & 1; }
  function trashLeft(g) { let n = 0; for (let i = 0; i < TRASH.length; i++) if (!cleaned(g, i)) n++; return n; }
  function moonClean(g) { return (g.save.trash || 0) === ALL_CLEAN; }

  const ROCKS = [];
  for (let i = 0; i < 30; i++) {
    const x = U.hash2(i, 91) * C;
    if (RESERVED.some(r => wdist(x, (r[0] + r[1]) / 2) * 2 < r[1] - r[0] + 20)) continue;
    ROCKS.push({ x, k: i % 5, s: 0.7 + U.hash2(i, 7) * 0.7 });
  }

  /* Inside. */
  const IN_SPOTS = [
    { id: 'pc', x: 70, r: 28, name: 'THE LAPTOP', sub: 'ABAY IS ON IT' },
    { id: 'brain', x: 150, r: 26, name: 'THE BRAIN IN THE JAR', sub: 'IT KNOWS THINGS. BUY SOME' },
    { id: 'bed', x: 224, r: 28, name: 'THE BED', sub: 'IT IS A BOX. SLEEP ON IT' },
    { id: 'exit', x: 300, r: 20, name: 'THE WAY OUT', sub: 'BACK OUTSIDE' }
  ];
  const RAT_SPOT = { id: 'rat', x: 112, r: 22, name: 'A VERY FAT RAT', sub: 'GIVE HIM THE CHEESE' };
  const rat = { x: RAT_SPOT.x, y: FLOOR, vx: 0, t: 0, face: -1, hop: 0, chew: 0 };

  /* ------------------------------------------------------------ the camera
     Out on the moon: the arc position and height it is looking at, how far
     it is zoomed in, and a world scale for the build view, which pulls right
     back so you can see a good third of the planet at once. */
  const CAM = { x: 0, y: 0, ws: 1, ay: 196 };
  let ZW = 320, ZH = 180, ZK = 1.5;
  function setZoom(k) { ZK = k; ZW = Math.round(VW / k); ZH = Math.round(VH / k); }
  function zoomFor(scene) { return scene === 'out' ? 1.5 : 1.5; }
  const VIEW = { x: 80, y: 90 };

  function outXform(ctx) {
    ctx.translate(AX, CAM.ay);
    ctx.scale(CAM.ws, CAM.ws);
    ctx.translate(0, R - CAM.y);
    ctx.rotate(-CAM.x / R);
  }
  // from the centre of the moon to (x, y) on it, facing up
  function surf(ctx, x, y) { ctx.rotate(x / R); ctx.translate(0, -(R - (y || 0))); }
  function toBuf(x, y) {
    const a = (x - CAM.x) / R, r = R - (y || 0);
    return { x: AX + Math.sin(a) * r * CAM.ws, y: CAM.ay + (-Math.cos(a) * r + R - CAM.y) * CAM.ws };
  }
  function visible(x, pad) {
    const half = (ZW / 2) / CAM.ws + (pad || 60);
    return Math.abs(wdist(x, CAM.x)) < Math.min(C / 2, half * 1.25);
  }
  // how much night there is at a place on the moon: 0 day, 1 deepest night
  function nightAt(x) { return U.clamp((-Math.cos(x / R - S.sun) + 0.15) * 1.25, 0, 1); }

  function camWant() {
    const w = roomW();
    if (S.scene === 'out') return 0;
    if (w <= VW) return (w - VW) / 2;
    const fx = CUT() ? PD.cut.focusX() : P.x;
    return U.clamp(fx - VW / 2, 0, w - VW);
  }

  function view(dt) {
    if (S.scene === 'out') {
      const tx = AX - ZW / 2;
      const ty = U.clamp(CAM.ay - ZH * 0.66, 0, VH - ZH);
      if (dt === undefined) return VIEW;
      VIEW.x = U.damp(VIEW.x, tx, 0.3, dt);
      VIEW.y = U.damp(VIEW.y, ty, 0.3, dt);
      return VIEW;
    }
    const cam = g0 ? g0.intCam : 0;
    const px = (CUT() ? PD.cut.focusX() : P.x) - cam, gy = groundY(P.x);
    let tx, ty;
    if (S.scene === 'in' && !CUT()) {
      tx = (IN_W - VW) / -2 + (IN_W - ZW) / 2;
      ty = CEIL - 34;
    } else {
      tx = U.clamp(px - ZW / 2, 0, VW - ZW);
      const head = P.air > 0.1 ? P.y - 34 : P.y;
      ty = U.clamp(Math.min(gy, head) - 112, 0, VH - ZH);
      if (CUT()) {
        if (dt !== undefined) setZoom(U.damp(ZK, PD.cut.zoom(), PD.cut.snap(), dt));
        tx = U.clamp(px - ZW / 2, 0, VW - ZW);
        ty = U.clamp(PD.cut.focusY() - ZH * 0.58, 0, VH - ZH);
      }
    }
    if (dt === undefined) return VIEW;
    VIEW.x = U.damp(VIEW.x, tx, 0.22, dt);
    VIEW.y = U.damp(VIEW.y, ty, 0.18, dt);
    return VIEW;
  }
  function toScreen(x, y) {
    if (S.scene === 'out') { const b = toBuf(x, y); return { x: (b.x - Math.round(VIEW.x)) * ZK, y: (b.y - Math.round(VIEW.y)) * ZK }; }
    return { x: (x - Math.round(VIEW.x)) * ZK, y: (y - Math.round(VIEW.y)) * ZK };
  }
  function fromScreenX(sx) {
    if (S.scene === 'out') return P.x + ((Math.round(VIEW.x) + sx / ZK) - AX) / CAM.ws;
    return Math.round(VIEW.x) + sx / ZK;
  }
  // world coordinates to the screen, in any scene
  function worldToScreen(x, y) {
    if (S.scene === 'out') return toScreen(x, y);
    return toScreen(x - Math.round(g0 ? g0.intCam : 0), y);
  }

  /* ============================================================ THE ART
     All of it painted once, at double resolution, when first needed. */
  const ART = {};

  /* THE MOON. A disc of layered rock: a pale dusty crust, a regolith band
     full of pebbles, then darker and darker strata towards the middle with a
     few glints of ore in them, and craters pocking the face you can see. */
  function paintMoon() {
    const PAD = 26, SZ = (R + PAD) * 2 * HD, c0 = SZ / 2;
    const B = PT.buf(SZ, SZ), d = B.d;
    const BANDS = [
      [0, 0xc9c2de], [2.5, 0xa9a1c4], [7, 0x938ab2], [16, 0x7c739c],
      [32, 0x675f86], [58, 0x544d72], [100, 0x433d5e], [160, 0x37314e], [230, 0x2c2742]
    ];
    const craters = [];
    for (let i = 0; i < 70; i++) {
      const a = U.hash2(i, 5) * U.TAU, rr = Math.sqrt(U.hash2(i, 9)) * (R - 18);
      craters.push({ x: Math.sin(a) * rr, y: -Math.cos(a) * rr, r: 3 + Math.pow(U.hash2(i, 13), 2.2) * 26 });
    }
    for (let py = 0; py < SZ; py++) {
      for (let px = 0; px < SZ; px++) {
        const lx = (px - c0 + 0.5) / HD, ly = (py - c0 + 0.5) / HD;
        const r = Math.hypot(lx, ly);
        if (r > R + 8) continue;
        const a = Math.atan2(lx, -ly);
        const rs = R + bump(a * R);
        if (r > rs) continue;
        const depth = rs - r;
        let k = 0;
        for (let i = 0; i < BANDS.length; i++) if (depth >= BANDS[i][0]) k = i;
        // wobble the band edges with noise, dithered, so the strata are ragged
        const nv = U.fbm(px * 0.035, py * 0.035, 3);
        const next = BANDS[Math.min(BANDS.length - 1, k + 1)];
        const into = next[0] > BANDS[k][0] ? (depth - BANDS[k][0]) / (next[0] - BANDS[k][0]) : 0;
        if (into + (nv - 0.5) * 0.7 > 0.55 + PT.bayer(px, py) * 0.4) k = Math.min(BANDS.length - 1, k + 1);
        let col = BANDS[k][1];
        // mottling
        const m = U.fbm(px * 0.012 + 40, py * 0.012, 3);
        if (m > 0.6) col = PT.mul(col, 1.07);
        else if (m < 0.38) col = PT.mul(col, 0.9);
        // pebbles in the regolith band
        if (depth > 3 && depth < 26 && U.hash2(px >> 2, py >> 2) > 0.93) col = PT.mul(col, (U.hash2(px >> 2, (py >> 2) + 1) > 0.5 ? 1.18 : 0.78));
        // ore glints, deep down
        if (depth > 60 && U.hash2(px >> 1, py >> 1) > 0.997) col = [0xffd34d, 0x7ef9ff, 0xff7ac4][U.hash2(px, py) * 3 | 0];
        const i4 = (py * SZ + px) * 4;
        d[i4] = (col >> 16) & 255; d[i4 + 1] = (col >> 8) & 255; d[i4 + 2] = col & 255; d[i4 + 3] = 255;
      }
    }
    // craters: a dark bowl, a light rim on the far side, a shadow on the near
    for (const cr of craters) {
      const cx = c0 + cr.x * HD, cy = c0 + cr.y * HD, rr = cr.r * HD;
      for (let y = Math.floor(cy - rr - 3); y <= cy + rr + 3; y++) for (let x = Math.floor(cx - rr - 3); x <= cx + rr + 3; x++) {
        if (B.alpha(x, y) < 128) continue;
        const dx = (x - cx) / rr, dy = (y - cy) / rr, q = dx * dx + dy * dy;
        const col = B.get(x, y);
        if (q < 0.78) B.set(x, y, PT.mul(col, 0.8 + 0.12 * (dx + dy)));
        else if (q < 1.0) B.set(x, y, PT.mul(col, dx + dy > 0 ? 1.22 : 0.7));
        else if (q < 1.25 && dx + dy > 0.3) B.set(x, y, PT.mul(col, 1.08));
      }
    }
    // a bright dusty lip right on the skyline
    B.rim(0xe4def4, 0, -1);
    return B.toCanvas();
  }

  /* A little set of rocks for the surface: round-shouldered boulders with a
     lit top and a dark foot, in five shapes. */
  function paintRock(k) {
    const W = 40, H = 30, B = PT.buf(W, H);
    const cols = [0x9a92b8, 0xb8b0d4, 0x6a6288];
    if (k === 0) { B.ball(20, 20, 16, 10, cols); B.ball(28, 22, 8, 6, cols); }
    else if (k === 1) { B.ball(20, 18, 12, 12, cols); }
    else if (k === 2) { B.ball(14, 22, 10, 7, cols); B.ball(26, 20, 11, 9, cols); B.ball(20, 14, 6, 5, cols); }
    else if (k === 3) { B.poly([[6, 30], [12, 10], [22, 4], [30, 12], [34, 30]], 0x847ca2); B.poly([[12, 10], [22, 4], [24, 14]], 0xb8b0d4); }
    else { B.ball(20, 24, 17, 6, cols); B.ball(12, 20, 6, 5, cols); }
    B.rim(0xe0daf2, 0, -1);
    B.outline(0x1a1428);
    return B.toCanvas();
  }

  /* THE CAVE MOUTH, with your front door in it. Five tiers: a hole with a
     cardboard flap, then a porch, a tin extension, a pod, and a tower. */
  function paintHouse(tier) {
    const W = 200, H = 180, B = PT.buf(W, H), cx = 100, gy = H - 4;
    const ROCK = [0x8a82a8, 0x5a5278, 0x6e6690, 0x9e96bc, 0xb4acd0];
    // the mound
    B.ellipse(cx, gy + 10, 92, 70, ROCK[1]);
    B.texture(0, 60, W, H - 60, ROCK, 22, 3, (x, y) => {
      const dx = (x - cx) / 92, dy = (y - gy - 10) / 70; return dx * dx + dy * dy < 1;
    });
    // boulders stuck in it
    for (let i = 0; i < 9; i++) {
      const a = -2.6 + i * 0.66, bx = cx + Math.cos(a) * 70, by = gy + 10 + Math.sin(a) * 52;
      B.ball(bx, by, 14 + (i % 3) * 5, 10 + (i % 2) * 5, [0x928ab0, 0xbcb4d8, 0x5a5278]);
    }
    // the cave mouth: a dark arch, deeper in the middle
    B.ellipse(cx, gy - 18, 30, 40, 0x120d1c);
    B.rect(cx - 30, gy - 18, 60, 22, 0x120d1c);
    B.ellipse(cx, gy - 14, 22, 32, 0x0a0712);
    // warm light from inside
    for (let r = 26; r > 4; r -= 4) B.ellipse(cx, gy - 4, r, r * 0.9, 0xffb05a, 0.05);
    // a cardboard flap for a door, taped at the top
    const CB = [0xc8a068, 0xe0bc84, 0x9a7444];
    B.rect(cx - 18, gy - 44, 36, 44, CB[0]);
    for (let i = 0; i < 9; i++) B.rect(cx - 16 + i * 4, gy - 42, 1, 40, CB[2]);
    B.rect(cx - 18, gy - 44, 36, 3, CB[1]);
    B.rect(cx - 22, gy - 48, 44, 6, 0xe8dcb0, 0.8);
    B.rect(cx + 8, gy - 22, 4, 4, 0x3a2a1a);          // a bottle-cap handle
    // THIS WAY UP, in marker, upside down
    B.rect(cx - 8, gy - 30, 2, 8, 0x3a2410); B.poly([[cx - 11, gy - 23], [cx - 3, gy - 23], [cx - 7, gy - 19]], 0x3a2410);
    // the sign
    B.line(cx - 34, gy - 70, cx - 22, gy - 58, 0x6a5a40, 1);
    B.line(cx + 34, gy - 70, cx + 22, gy - 58, 0x6a5a40, 1);
    B.rect(cx - 26, gy - 66, 52, 16, CB[0]); B.rect(cx - 26, gy - 66, 52, 2, CB[1]); B.rect(cx - 26, gy - 52, 52, 2, CB[2]);
    // a doormat
    B.rect(cx - 22, gy - 2, 44, 4, 0x6a8a3a); B.rect(cx - 22, gy - 2, 44, 1, 0x8aaa5a);
    // a mailbox made of a can
    B.rect(cx + 44, gy - 26, 3, 26, 0x6a5a4a); B.round(cx + 38, gy - 36, 16, 11, 3, 0xb8c0cc); B.rect(cx + 38, gy - 32, 16, 1, 0x7a8290); B.rect(cx + 52, gy - 40, 2, 6, 0xd8343a);
    if (tier >= 1) {
      // a porch: planks and two posts and a lantern
      B.rect(cx - 50, gy - 6, 100, 6, 0x8a5a34); for (let i = 0; i < 10; i++) B.rect(cx - 50 + i * 10, gy - 6, 1, 6, 0x5a3a20);
      B.rect(cx - 48, gy - 58, 4, 52, 0x8a5a34); B.rect(cx + 44, gy - 58, 4, 52, 0x8a5a34);
      B.rect(cx - 52, gy - 62, 104, 6, 0xa86a3a); B.rect(cx - 52, gy - 62, 104, 2, 0xc88a5a);
      B.round(cx + 36, gy - 54, 8, 10, 2, 0x3a3a4a); B.rect(cx + 38, gy - 52, 4, 6, 0xffd070);
    }
    if (tier >= 2) {
      // a tin extension bolted on the side, with a chimney
      B.block(cx + 54, gy - 50, 40, 50, [0x9aa6b4, 0xc8d4e0, 0x5a6674], 6, 6);
      for (let i = 0; i < 5; i++) B.rect(cx + 56 + i * 8, gy - 44, 1, 40, 0x7a8694);
      B.rect(cx + 62, gy - 36, 12, 10, 0xffd070); B.rect(cx + 62, gy - 36, 12, 1, 0xffffff);
      B.rect(cx + 80, gy - 70, 8, 22, 0x6a6a7a); B.rect(cx + 78, gy - 72, 12, 4, 0x8a8a9a);
    }
    if (tier >= 3) {
      // a glass pod on the roof of the rock
      B.ellipse(cx - 20, gy - 86, 26, 20, 0x3a5a8a);
      B.ellipse(cx - 20, gy - 88, 23, 17, 0x7ec8ff, 0.7);
      B.ellipse(cx - 28, gy - 94, 8, 5, 0xffffff, 0.6);
      B.rect(cx - 46, gy - 72, 52, 5, 0xc8ccd8);
      for (let i = 0; i < 4; i++) B.rect(cx - 36 + i * 10, gy - 80, 5, 5, 0xffd070);
    }
    if (tier >= 4) {
      // a tower with a neon crown, because you are rich now
      B.block(cx + 18, gy - 150, 34, 96, [0xe8e0f8, 0xffffff, 0xa8a0c8], 8, 6);
      for (let j = 0; j < 5; j++) for (let i = 0; i < 2; i++) B.rect(cx + 24 + i * 14, gy - 136 + j * 16, 8, 9, 0xffd070);
      B.poly([[cx + 14, gy - 150], [cx + 56, gy - 150], [cx + 35, gy - 176]], 0xffd34d);
      B.rect(cx + 34, gy - 178, 2, 8, 0xff5a8a);
    }
    B.rim(0xe4def4, 0, -1);
    B.outline(0x140f22);
    return B.toCanvas();
  }

  /* The launch pad the UFO sits on: a steel ring with hazard stripes and
     landing lights. */
  function paintPad() {
    const W = 120, H = 24, B = PT.buf(W, H);
    B.round(4, 8, W - 8, 14, 5, 0x4a5064);
    B.rect(8, 8, W - 16, 4, 0x8a92a8);
    for (let i = 0; i < 12; i++) B.poly([[10 + i * 9, 13], [15 + i * 9, 13], [12 + i * 9, 19], [7 + i * 9, 19]], i % 2 ? 0xffc44d : 0x1a1a24);
    B.rect(8, 20, W - 16, 2, 0x2a2e3c);
    B.outline(0x12141c);
    return B.toCanvas();
  }

  /* Mr Chum's billboard: a steel frame with a hologram in it. The picture
     is live; this is the frame. */
  function paintBoard() {
    const W = 120, H = 120, B = PT.buf(W, H);
    B.rect(26, 60, 6, 60, 0x4a5064); B.rect(88, 60, 6, 60, 0x4a5064);
    B.rect(26, 60, 2, 60, 0x7a849a); B.rect(88, 60, 2, 60, 0x7a849a);
    B.round(6, 4, 108, 64, 4, 0x2a2e3c); B.round(10, 8, 100, 56, 3, 0x0a0e18);
    B.rect(6, 64, 108, 4, 0x3a4050);
    for (let i = 0; i < 5; i++) B.disc(14 + i * 23, 70, 2, 0xffd34d);
    B.outline(0x0a0c14);
    return B.toCanvas();
  }

  /* THE CAVE, INSIDE. One painting of the rock: an arched back wall of
     slabs and shelves, stalactites off the roof, a pebbled floor, glowing
     crystals in the cracks, moss on the ledges -- and a hole on the right
     where the way out is, which is left empty so the stars show through. */
  function paintCave() {
    const W = IN_W * HD, H = VH * HD, B = PT.buf(W, H);
    const RK = [0x241c32, 0x2e2540, 0x3a3050, 0x4a3f62, 0x5a4e74, 0x6c608a];
    const top = (x) => (CEIL - 14 + Math.sin(x / W * Math.PI) * -16 + Math.sin(x * 0.05) * 3) * HD;
    const mouth = (x, y) => { const dx = (x - (IN_W - 14) * HD) / (26 * HD), dy = (y - (FLOOR - 30) * HD) / (40 * HD); return dx * dx + dy * dy < 1 || (dx > -1 && dx < 1 && y > (FLOOR - 30) * HD && y < FLOOR * HD); };
    // the whole rock, textured
    B.texture(0, 0, W, H, [RK[0], RK[1], RK[2], RK[3]], 38, 11, (x, y) => !mouth(x, y));
    // the hollow: lighter rock where the room is, darker round the edges
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (mouth(x, y)) continue;
      const inRoom = y > top(x) && y < FLOOR * HD;
      if (!inRoom) continue;
      const col = B.get(x, y);
      const edge = Math.min(x, W - x, y - top(x)) / (40 * HD);
      B.set(x, y, PT.mul(col, 1.18 + Math.min(0.25, edge * 0.25)));
    }
    // slabs of rock in the back wall, each with a lit top edge
    for (let i = 0; i < 26; i++) {
      const sx = U.hash2(i, 41) * W, sy = (CEIL + 6 + U.hash2(i, 43) * 80) * HD;
      if (mouth(sx, sy)) continue;
      const sw = (14 + U.hash2(i, 47) * 34) * HD, sh = (8 + U.hash2(i, 53) * 16) * HD;
      const col = RK[3 + (i % 3)];
      B.poly([[sx, sy + sh], [sx + sw * 0.1, sy + sh * 0.2], [sx + sw * 0.6, sy], [sx + sw, sy + sh * 0.3], [sx + sw * 0.95, sy + sh]], col);
      B.line(sx + sw * 0.1, sy + sh * 0.2, sx + sw * 0.6, sy, PT.mul(col, 1.3), 2);
      B.line(sx, sy + sh, sx + sw * 0.95, sy + sh, PT.mul(col, 0.6), 2);
    }
    // stalactites
    for (let i = 0; i < 18; i++) {
      const sx = (8 + i * 17 + U.hash2(i, 61) * 8) * HD, len = (6 + U.hash2(i, 67) * 20) * HD, w = (3 + U.hash2(i, 71) * 4) * HD;
      if (sx > (IN_W - 44) * HD) continue;
      const ty = top(sx);
      B.poly([[sx - w, ty - 4], [sx + w, ty - 4], [sx, ty + len]], RK[3]);
      B.line(sx - w + 2, ty, sx, ty + len - 2, RK[5], 2);
    }
    // the floor: flat rock and pebbles, and a lip where it meets the wall
    B.texture(0, FLOOR * HD, W, H - FLOOR * HD, [0x3a3050, 0x4a3f62, 0x584c72], 16, 5, (x, y) => !mouth(x, y - 4));
    B.rect(0, FLOOR * HD, W, 3, 0x7a6e9a);
    for (let i = 0; i < 60; i++) {
      const px = U.hash2(i, 81) * W, py = (FLOOR + 3 + U.hash2(i, 83) * 40) * HD;
      B.ball(px, py, 3 + (i % 3) * 2, 2 + (i % 2) * 2, [0x6a5e88, 0x8a7eaa, 0x3a3050]);
    }
    // crystals in the cracks
    const crystal = (x, y, s, col) => {
      for (let k = -1; k <= 1; k++) {
        const cx = x + k * 5 * s, h = (12 - Math.abs(k) * 4) * s;
        B.poly([[cx - 3 * s, y], [cx + 3 * s, y], [cx + 1 * s, y - h], [cx - 1 * s, y - h]], col);
        B.line(cx - 1 * s, y - 2, cx - 0.5 * s, y - h + 2, PT.mix(col, 0xffffff, 0.6), 1);
      }
    };
    crystal(18 * HD, 150 * HD, 2, 0x7ef9ff); crystal(270 * HD, 138 * HD, 1.6, 0xff7ac4); crystal(118 * HD, 128 * HD, 1.4, 0xa87cff);
    // moss on the ledges
    for (let i = 0; i < 40; i++) {
      const px = U.hash2(i, 91) * W, py = (CEIL + 12 + U.hash2(i, 93) * 80) * HD;
      if (mouth(px, py)) continue;
      B.ellipse(px, py, 6 + (i % 4) * 2, 2, i % 2 ? 0x4a8a4a : 0x3a6a3a);
    }
    return B.toCanvas();
  }

  /* The furniture, all of it cardboard. */
  const CARD = [0xc8a068, 0xe2c08a, 0x96703f];
  function corrugate(B, x, y, w, h) { for (let i = 2; i < w; i += 4) B.rect(x + i, y + 2, 1, h - 4, CARD[2], 0.5); }
  function tape(B, x, y, w, h) { B.rect(x, y, w, h, 0xeee4c0, 0.75); }

  function paintDesk() {
    // a big box turned on its side, with the laptop on it
    const W = 110, H = 90, B = PT.buf(W, H), gy = H - 2;
    B.block(8, gy - 46, 94, 46, CARD, 8, 8); corrugate(B, 8, gy - 38, 86, 38);
    tape(B, 50, gy - 46, 8, 46);
    // FRAGILE in marker, in red, and a glass pictogram
    B.rect(16, gy - 30, 22, 7, 0xc83a2a, 0.9); B.rect(18, gy - 28, 18, 3, CARD[0]);
    B.poly([[70, gy - 32], [80, gy - 32], [76, gy - 24]], 0x3a2410);
    // the laptop: a base, a lid, stickers, a crack in the corner
    B.block(22, gy - 56, 62, 10, [0x5a6070, 0x8a92a4, 0x363a46], 3);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) B.rect(26 + i * 6, gy - 53 + r * 3, 5, 2, 0x2a2e38);
    B.poly([[26, gy - 56], [80, gy - 56], [84, gy - 92], [22, gy - 92]], 0x4a5060);
    B.poly([[29, gy - 59], [77, gy - 59], [80, gy - 89], [26, gy - 89]], 0x0e1a2a);
    B.disc(30, gy - 88, 3, 0xff7ac4); B.round(72, gy - 90, 8, 5, 2, 0xffd34d);
    B.line(78, gy - 62, 70, gy - 70, 0xa8b8d8, 1);
    // a mug of pens and a sticky note
    B.round(88, gy - 60, 10, 12, 2, 0xd8343a); B.rect(90, gy - 66, 1, 8, 0x3a6aff); B.rect(93, gy - 67, 1, 8, 0x7ae84a);
    B.rect(6, gy - 60, 12, 12, 0xfff08a); B.rect(8, gy - 57, 8, 1, 0x8a7a2a); B.rect(8, gy - 54, 6, 1, 0x8a7a2a);
    B.outline(0x1a1020);
    return B.toCanvas();
  }

  /* The bed, in five tiers. The first one is some boxes. */
  function paintBed(tier) {
    const W = 120, H = 60, B = PT.buf(W, H), gy = H - 2;
    if (tier === 0) {
      B.block(6, gy - 20, 108, 20, CARD, 5, 5); corrugate(B, 6, gy - 15, 103, 15);
      B.block(10, gy - 28, 34, 9, [0xd8b27a, 0xeed0a0, 0xa07c4a], 3);        // a folded-box pillow
      B.rect(40, gy - 26, 70, 7, 0xd8e8f0, 0.85);                            // bubble wrap blanket
      for (let i = 0; i < 16; i++) B.disc(43 + i * 4.2, gy - 23, 1.2, 0xffffff, 0.8);
      tape(B, 60, gy - 20, 6, 20);
    } else if (tier === 1) {
      B.block(6, gy - 16, 108, 16, [0xe8e8f0, 0xffffff, 0xa8a8b8], 4);
      for (let i = 0; i < 6; i++) B.rect(12 + i * 18, gy - 12, 1, 10, 0xc8c8d8);
      B.block(10, gy - 24, 30, 9, [0xf0f0f8, 0xffffff, 0xb8b8c8], 3);
      B.rect(36, gy - 22, 74, 7, 0x6a8ad8);
    } else if (tier === 2) {
      B.block(4, gy - 14, 112, 14, [0x8a5a34, 0xb07a4a, 0x5a3a20], 3);
      B.rect(4, gy - 40, 8, 40, 0x8a5a34); B.rect(108, gy - 30, 8, 30, 0x8a5a34);
      B.block(12, gy - 22, 96, 9, [0xf0f0f8, 0xffffff, 0xb8b8c8], 3);
      B.block(14, gy - 30, 26, 9, [0xfff0f8, 0xffffff, 0xd8b8c8], 3);
      B.rect(38, gy - 24, 70, 8, 0xd84a6a); B.rect(38, gy - 24, 70, 2, 0xff7a9a);
    } else if (tier === 3) {
      B.block(4, gy - 14, 112, 14, [0x3a3a5a, 0x5a5a7a, 0x22223a], 3);
      B.round(8, gy - 28, 104, 16, 7, 0x38a8e8); B.round(12, gy - 27, 96, 6, 3, 0x9ae0ff);
      for (let i = 0; i < 5; i++) B.disc(20 + i * 20, gy - 20, 2, 0xffffff, 0.6);
      B.block(12, gy - 34, 24, 8, [0xf0f0f8, 0xffffff, 0xb8b8c8], 3);
    } else {
      B.block(2, gy - 16, 116, 16, [0xffd34d, 0xfff0a0, 0xb88a2a], 3);
      B.rect(2, gy - 50, 10, 50, 0xffd34d); B.rect(108, gy - 50, 10, 50, 0xffd34d);
      B.disc(7, gy - 52, 5, 0xfff0a0); B.disc(113, gy - 52, 5, 0xfff0a0);
      B.block(12, gy - 26, 96, 11, [0x8a2a5a, 0xc84a8a, 0x5a1a3a], 3);
      B.block(14, gy - 34, 22, 9, [0xfff0f8, 0xffffff, 0xd8b8c8], 3); B.block(38, gy - 34, 22, 9, [0xfff0f8, 0xffffff, 0xd8b8c8], 3);
    }
    B.outline(0x1a1020);
    return B.toCanvas();
  }

  function paintCooler() {
    const W = 40, H = 50, B = PT.buf(W, H), gy = H - 2;
    B.block(4, gy - 40, 32, 40, [0x3a8ad8, 0x7ac0ff, 0x1a5a9a], 6, 4);
    B.rect(4, gy - 34, 32, 3, 0xffffff);
    B.rect(14, gy - 44, 12, 4, 0xd8e0e8);
    B.rect(8, gy - 24, 10, 6, 0xffffff); B.rect(9, gy - 23, 8, 1, 0xd8343a);   // a sticker: FOOD
    B.outline(0x1a1020);
    return B.toCanvas();
  }

  function paintShelf() {
    const W = 50, H = 60, B = PT.buf(W, H), gy = H - 2;
    for (let j = 0; j < 2; j++) {
      const y = gy - 22 - j * 22;
      B.rect(4, y, 42, 22, 0x2a5aa8); B.rect(6, y + 2, 38, 18, 0x3a6ac8);
      for (let i = 0; i < 6; i++) B.rect(8 + i * 6, y + 4, 3, 14, 0x1a3a78);
      B.ball(14 + j * 10, y - 4, 5, 4, [0x9a92b8, 0xc8c0e0, 0x5a5278]);
      B.ball(32 - j * 6, y - 3, 4, 3, [0xffd34d, 0xfff0a0, 0xb8901e], true);
    }
    B.outline(0x1a1020);
    return B.toCanvas();
  }

  function paintPoster() {
    const W = 36, H = 44, B = PT.buf(W, H);
    B.rect(2, 2, 32, 40, 0xf0e6c8); B.rect(2, 2, 32, 2, 0xffffff);
    B.rect(4, 4, 28, 26, 0x3a7ad8);
    B.ball(18, 20, 8, 7, [0x7fd88a, 0xc4ffce, 0x3a8a4a]);                    // an alien, hanging in there
    B.disc(15, 18, 1.6, 0x1a1024); B.disc(21, 18, 1.6, 0x1a1024);
    B.line(18, 4, 18, 13, 0x6a4a2a, 1);
    for (let i = 0; i < 3; i++) B.rect(6, 33 + i * 3, 24 - i * 5, 1, 0x3a2a1a);
    tape(B, 12, 0, 12, 4);
    B.outline(0x1a1020);
    return B.toCanvas();
  }

  function art(key, fn) { return ART[key] || (ART[key] = fn()); }

  /* ============================================================ ENTER / LEAVE */
  function enter(g, atX) {
    g0 = g;
    S.scene = 'out';
    place(g, atX === undefined ? PAD_X - 60 : atX);
  }
  function place(g, atX) {
    setZoom(zoomFor(S.scene));
    FX.clearParts();
    const bd = bounds();
    P.x = U.clamp(atX, bd[0], bd[1]);
    P.y = groundY(P.x); P.vx = 0; P.vy = 0;
    P.target = null; P.autoUse = null; P.roll = 0; P.hop = 0; P.lock = 0.28; P.swim = 0;
    UI.mode = null;
    if (S.scene === 'out') { CAM.x = P.x; CAM.y = P.y; CAM.ws = 1; CAM.ay = 196; g.intCam = 0; }
    else g.intCam = camWant();
    view(30);
    rat.x = g.save.pet ? P.x - 30 : RAT_SPOT.x;
    rat.y = groundY(rat.x);
  }
  function goIn(g) {
    S.scene = 'in';
    place(g, IN_SPOTS[3].x - 22);
    A.sfx.tone(150, { type: 'square', to: 90, dur: 0.2, vol: 0.08 });
    if (!g.save.pet && !S.ratSeen) {
      S.ratSeen = 1;
      say('THERE IS A VERY FAT RAT EATING YOUR CHEESE.');
      A.sfx.tone(1600, { type: 'square', to: 700, dur: 0.18, vol: 0.07 });
    }
  }
  function goOut(g) {
    S.scene = 'out';
    place(g, HOUSE_X + 30);
    A.sfx.tone(220, { type: 'square', to: 420, dur: 0.2, vol: 0.08 });
  }
  /* Home from a dive: the saucer comes down on the pad and the haul spills. */
  function arrive(g, n) {
    enter(g, PAD_X - 56);
    if (n > 0) {
      const b = toBuf(PAD_X, -30);
      for (let i = 0; i < Math.min(40, n * 2); i++) {
        FX.spawn({ x: b.x + U.rand(-12, 12), y: b.y, vx: U.rand(-40, 40), vy: U.rand(-90, -20),
          life: 0.9, size: 2, color: i % 2 ? '#ffb03d' : '#c9bce8', grav: 160, drag: 1 });
      }
      FX.text(b.x, b.y - 12, '+' + n + ' ORE', '#ffb03d', 2);
    }
  }

  function say(m) { UI.msg = m; UI.msgT = 3.2; }

  /* ============================================================ SPOTS */
  function spots(g) {
    if (CUT()) return [];
    if (S.scene === 'in') {
      const out = g.save.pet ? IN_SPOTS.slice() : IN_SPOTS.concat([RAT_SPOT]);
      if (PD.build) for (const s of PD.build.spots(g, 'in')) out.push(s);
      return out;
    }
    const out = OUT_SPOTS.slice();
    for (let i = 0; i < TRASH.length; i++) {
      if (cleaned(g, i)) continue;
      out.push({ id: 'trash', i, x: TRASH[i].x, r: 16, name: TRASH_NAMES[TRASH[i].k], sub: 'CLEAN IT UP' });
    }
    out.push({ id: 'board', x: BOARD_X, r: 24, name: 'MR CHUM\'S BILLBOARD', sub: (g.save.debt || 0) > 0 ? 'HAVE A WORD WITH HIM' : 'HE IS SMILING. IT IS WORSE.' });
    if (PD.build) for (const s of PD.build.spots(g, 'out')) out.push(s);
    return out;
  }
  function nearest(g) {
    let best = null, bd = 1e9;
    for (const s of spots(g)) {
      const d = S.scene === 'out' ? Math.abs(wdist(s.x, P.x)) : Math.abs(s.x - P.x);
      if (d < (s.r || 20) && d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function use(g, s) {
    if (!s || FX.wipeActive()) return;
    if (g.tutAllows && !g.tutAllows('home', s.id)) { g.tutNope('home'); return; }
    const at = worldToScreen(s.x, groundY(s.x) - 20);
    const fx2 = U.clamp(at.x, 0, VW), fy2 = U.clamp(at.y, 0, VH);
    if (s.id === 'door') { P.lock = 1; g.wipeTo(240, 135, '#2a2438', () => goIn(g), 'bars', 0.56); return; }
    if (s.id === 'exit') { P.lock = 1; g.wipeTo(240, 135, '#2a2438', () => goOut(g), 'bars', 0.56); return; }
    if (s.id === 'ufo') { A.sfx.dock(); g.openChart(); return; }
    if (s.id === 'pc') { P.lock = 1; g.wipeTo(fx2, fy2, '#1b2430', () => { g.state = 'desk'; PD.desk.enter(g); }, 'bars'); return; }
    if (s.id === 'brain') { P.lock = 1; g.wipeTo(fx2, fy2, '#12503a', () => { PD.mind.open(g); }, 'static', 0.7); return; }
    if (s.id === 'bed') { sleep(g); return; }
    if (s.id === 'rat') { feedRat(g); return; }
    if (s.id === 'trash') { sweep(g, s.i); return; }
    if (s.id === 'board') { if (PD.story) PD.story.talkChum(g, 'board'); return; }
    if (PD.build && PD.build.use(g, s)) return;
  }

  function sleep(g) {
    S.sleep = 2.4;
    P.lock = 2.4;
    A.sfx.tone(300, { type: 'triangle', to: 150, dur: 0.6, vol: 0.06 });
  }

  function sweep(g, i) {
    if (cleaned(g, i)) return;
    g.save.trash = (g.save.trash || 0) | (1 << i);
    const th = TRASH[i];
    const b = toBuf(th.x, groundY(th.x));
    P.lock = 0.45; P.sweep = 0.5;
    const pay = 30 + Math.round(U.rand(0, 40));
    g.save.credits += pay;
    FX.text(b.x, b.y - 40, '+$' + pay, '#8affa0', 0);
    if (U.chance(0.6)) {
      const mid = U.pick([1, 2, 2, 4, 4, 5]);
      const n = U.randInt(1, 3);
      g.save.vault[mid] = (g.save.vault[mid] || 0) + n;
      const mat = PD.data.MAT[mid];
      FX.text(b.x, b.y - 54, '+' + n + ' ' + mat.name.toUpperCase(), mat.c[0], 1);
    }
    A.sfx.tone(320, { type: 'square', to: 900, dur: 0.16, vol: 0.07 });
    FX.puff(b.x, b.y - 10, 16, '#8e86a8', 1.3);
    FX.ring(b.x, b.y - 8, 3, 30, 0.5, '#c9bce8', 2);
    for (let k = 0; k < 14; k++) {
      FX.spawn({ x: b.x + U.rand(-14, 14), y: b.y - 12, vx: U.rand(-70, 70), vy: U.rand(-150, -40),
        life: 1.0, size: 2, color: k % 3 ? '#6b6480' : '#8a5a3a', grav: 220, drag: 1 });
    }
    const left = trashLeft(g);
    say(left === 0 ? 'THE MOON IS CLEAN. ROOM TO BUILD ALL THE WAY ROUND.'
      : (left === 1 ? 'ONE HEAP LEFT.' : left + ' HEAPS LEFT ON YOUR OWN MOON.'));
    if (left === 0) { A.sfx.fanfare && A.sfx.fanfare(); FX.text(b.x, b.y - 70, 'CLEAN!', '#ffd34d', 2); }
    PD.chum.call(g, 'tip');
    g.saveGame();
  }

  function feedRat(g) {
    g.save.pet = 1;
    g.saveGame();
    rat.hop = 1;
    say('HE IS YOURS NOW. HE IS CALLED BRENDA.');
    A.sfx.fanfare && A.sfx.fanfare();
    const b = S.scene === 'out' ? toBuf(rat.x, rat.y) : { x: rat.x - Math.round(g.intCam), y: rat.y };
    FX.text(b.x + Math.round(g.intCam), b.y - 40, 'BRENDA', '#ff9ecb', 2);
  }

  function leaveDesk(g) {
    g.state = 'home';
    S.scene = 'in';
    setZoom(zoomFor('in'));
    P.lock = 0.32;
    P.x = IN_SPOTS[0].x + 22; P.y = groundY(P.x); P.vx = 0; P.vy = 0; P.face = -1;
    g.intCam = camWant();
    view(30);
  }

  /* ============================================================ UPDATE */
  const PC = { jumped: 0 };
  function update(dt, g) {
    const IN = PD.input;
    g0 = g;
    S.t += dt;
    S.sun += dt * 0.022;                         // a day is about five minutes
    if (CUT()) {
      if (PD.cut.active()) PD.cut.update(dt, g);
      if (CUT()) { g.intCam = U.damp(g.intCam, camWant(), 0.12, dt); view(dt); }
      return;
    }
    if (PD.build && PD.build.riding()) { PD.build.rideUpdate(dt, g); camOut(dt, g); view(dt); return; }
    if (PD.build && PD.build.active()) {
      PD.build.update(dt, g);
      if (S.scene === 'out') camOut(dt, g); else g.intCam = U.damp(g.intCam, camWant(), 0.16, dt);
      view(dt);
      return;
    }
    if (FX.wipeActive()) { view(dt); return; }
    P.lock = Math.max(0, P.lock - dt);
    UI.msgT = Math.max(0, UI.msgT - dt);

    if (S.sleep > 0) {
      S.sleep -= dt;
      for (let k = 0; k < 6; k++) g.demandFor(k);
      if (S.sleep <= 0) { say('YOU SLEPT. THE PRICES MOVED. THEY ALWAYS DO.'); A.sfx.tone(700, { type: 'triangle', to: 1100, dur: 0.2, vol: 0.07 }); }
      view(dt);
      return;
    }
    updateRat(dt, g);
    P.sweep = Math.max(0, P.sweep - dt);

    const use_ = P.lock <= 0 && (IN.hit('KeyE') || IN.hit('space'));
    const m = IN.mouse;
    let ix = 0;
    if (IN.down('left')) ix -= 1;
    if (IN.down('right')) ix += 1;

    // P, or the pink button on the goal: talk to Mr Chum about money
    if (P.lock <= 0 && PD.story && PD.story.checkPay(g)) return;
    // B: the build menu, anywhere you can stand
    if (P.lock <= 0 && PD.build && (IN.hit('KeyB') || (m.inside && m.leftPressed && PD.build.hitButton(m.x, m.y)))) {
      if (!g.tutAllows || g.tutAllows('home', 'build')) { PD.build.open(g, S.scene); return; }
      g.tutNope('home'); return;
    }

    if (P.lock <= 0 && m.leftPressed && m.inside) {
      const wx = fromScreenX(m.x) + (S.scene === 'out' ? 0 : g.intCam);
      let hit = null;
      for (const s of spots(g)) {
        const d = S.scene === 'out' ? Math.abs(wdist(s.x, wx)) : Math.abs(s.x - wx);
        if (d < (s.r || 20)) hit = s;
      }
      P.target = hit ? (S.scene === 'out' ? P.x + wdist(hit.x, P.x) : hit.x) : wx;
      P.autoUse = hit;
      A.sfx.click();
    }
    if (ix) { P.target = null; P.autoUse = null; }
    if (P.target !== null) {
      const d = P.target - P.x;
      if (Math.abs(d) > 5) ix = Math.sign(d);
      else { P.target = null; if (P.autoUse) { const s = P.autoUse; P.autoUse = null; use(g, s); return; } }
    }

    const gy = groundY(P.x);
    const grounded = P.y >= gy - 0.5;
    if (P.roll <= 0 && grounded && (IN.hit('shift') || (IN.hit('down') && Math.abs(P.vx) > 20))) {
      P.roll = 0.55; P.rollA = 0;
      if (ix) P.face = ix;
      P.vx = P.face * 210;
      A.sfx.tone(300, { type: 'triangle', to: 120, dur: 0.25, vol: 0.09 });
      dustAt(P.x, P.y, 5, 16);
    }
    if (P.roll > 0) {
      P.roll -= dt; P.rollA += P.face * dt * 15;
      P.vx = U.damp(P.vx, P.face * 170, 0.5, dt);
    } else {
      if (ix) P.face = ix;
      P.vx = U.damp(P.vx, ix * 108, 0.3, dt);
    }
    const bd = bounds();
    P.x = U.clamp(P.x + P.vx * dt, bd[0], bd[1]);
    P.walk += Math.abs(P.vx) * dt * 0.1;

    if (IN.hit('up') && grounded && P.roll <= 0) {
      P.vy = -212; PC.jumped = 1;
      A.sfx.tone(520, { type: 'triangle', to: 980, dur: 0.14, vol: 0.07 });
      dustAt(P.x, P.y, 4, 12);
    }
    const floaty = IN.down('up') && P.vy < 0 ? 0.55 : 1;
    P.vy += GRAV * floaty * dt;
    P.y += P.vy * dt;
    if (S.scene === 'in' && P.y < CEIL + 14) { P.y = CEIL + 14; if (P.vy < 0) { P.vy = 70; dustAt(P.x, P.y - 30, 4, 12); A.sfx.tone(180, { type: 'square', to: 90, dur: 0.12, vol: 0.07 }); } }
    if (P.y >= gy) {
      if (P.vy > 60) {
        P.land = 0.26;
        if (P.rig) PD.rig.land(P.rig, U.clamp(P.vy / 260, 0.4, 1));
        if (P.vy > 150 && P.hop < 2) { P.vy = -P.vy * 0.34; P.hop++; } else { P.vy = 0; P.hop = 0; }
        dustAt(P.x, gy, 6, 18);
        A.sfx.tone(150, { type: 'triangle', to: 90, dur: 0.1, vol: 0.06 });
      } else { P.vy = 0; P.hop = 0; }
      P.y = gy; P.air = 0;
    } else P.air += dt;
    P.land = Math.max(0, P.land - dt * 3.4);

    const was = P.near;
    A.room(0);
    P.near = nearest(g);
    if (P.near && P.near !== was) A.sfx.tone(900, { type: 'square', dur: 0.03, vol: 0.03 });
    if (use_) use(g, P.near);

    if (PD.build) PD.build.world(dt, g, { scene: S.scene, px: P.x, jumped: PC.jumped });
    PC.jumped = 0;
    if (S.scene === 'out') camOut(dt, g);
    else g.intCam = U.damp(g.intCam, camWant(), 0.16, dt);
    view(dt);
  }

  /* The camera outside: follow whatever is the point of interest, and pull
     back when building. */
  function camOut(dt, g) {
    const bm = PD.build && PD.build.active() && S.scene === 'out';
    const rd = PD.build && PD.build.riding();
    let fx = P.x, fy = Math.min(0, P.y + 6) * 0.55;
    if (bm) { fx = PD.build.focusX(); fy = 0; }
    if (rd) { const f = PD.build.rideFocus(); fx = f.x; fy = f.y * 0.8; }
    CAM.x += wdist(fx, CAM.x) * (1 - Math.pow(1 - (rd ? 0.3 : 0.14), dt * 60));
    CAM.y = U.damp(CAM.y, fy, 0.12, dt);
    CAM.ws = U.damp(CAM.ws, bm ? 0.58 : (rd ? 0.82 : 1), 0.08, dt);
    CAM.ay = U.damp(CAM.ay, bm ? 132 : 196, 0.08, dt);
    setZoom(U.damp(ZK, bm ? 1 : 1.5, 0.1, dt));
    g.intCam = 0;
  }

  function dustAt(x, y, n, sp) {
    if (S.scene === 'out') { const b = toBuf(x, y); FX.dust(b.x, b.y, n, '#8e86a8', sp); }
    else FX.dust(x, y, n, '#6a5e88', sp);
  }

  function updateRat(dt, g) {
    rat.t += dt;
    rat.chew = Math.max(0, rat.chew - dt);
    if (!g.save.pet) {
      if (S.scene !== 'in') return;
      rat.x = RAT_SPOT.x; rat.y = groundY(rat.x);
      rat.face = P.x > rat.x ? 1 : -1;
      if (U.chance(dt * 1.4)) { rat.chew = 0.3; A.sfx.tone(240, { type: 'square', dur: 0.03, vol: 0.02 }); }
      return;
    }
    const want = P.x - P.face * 26;
    const d = want - rat.x;
    if (Math.abs(d) > 14) { rat.vx = U.damp(rat.vx, U.clamp(d * 2.6, -130, 130), 0.14, dt); rat.face = Math.sign(rat.vx) || rat.face; }
    else rat.vx = U.damp(rat.vx, 0, 0.3, dt);
    rat.x += rat.vx * dt;
    if (S.scene === 'in') rat.x = U.clamp(rat.x, 10, IN_W - 10);
    rat.hop = Math.abs(rat.vx) > 12 ? (rat.hop + dt * 9) : U.damp(rat.hop, 0, 0.2, dt);
    rat.y = groundY(rat.x);
  }

  /* ============================================================ DRAWING */
  const STARS = [];
  for (let i = 0; i < 260; i++) STARS.push({ a: U.hash2(i, 11) * U.TAU, r: 60 + U.hash2(i, 17) * 440, b: U.hash2(i, 23) });

  function drawSky(ctx, g, t) {
    const n = nightAt(CAM.x);
    const top = PT.mix(0x241a4a, 0x05030e, n), bot = PT.mix(0x5a3a78, 0x140a26, n);
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, PT.css(top)); sky.addColorStop(1, PT.css(bot));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
    // a nebula, drifting
    ctx.globalAlpha = 0.18 + n * 0.12;
    PT.glow(ctx, 330 - CAM.x * 0.02 % 60, 70, 150, '#ff6ac8', 0.35);
    PT.glow(ctx, 120, 40, 120, '#6a8aff', 0.3);
    ctx.globalAlpha = 1;
    // the stars wheel round as you walk: they are fixed to the sky, you are not
    const rot = -CAM.x / R;
    for (const s of STARS) {
      const a = s.a + rot;
      const x = 240 + Math.cos(a) * s.r, y = 330 + Math.sin(a) * s.r * 0.9;
      if (x < 0 || x > VW || y < 0 || y > VH) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.b * 30);
      ctx.globalAlpha = (0.15 + s.b * 0.7 * tw) * (0.35 + n * 0.65);
      ctx.fillStyle = s.b > 0.86 ? '#ffe9a8' : '#ffffff';
      ctx.fillRect(x | 0, y | 0, s.b > 0.95 ? 2 : 1, s.b > 0.95 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    // the sun, low on the horizon when you are near the terminator
    const sa = S.sun - CAM.x / R;
    const sx = 240 + Math.sin(sa) * 330, sy = 330 - Math.cos(sa) * 300;
    if (sy < VH + 60) {
      PT.glow(ctx, sx, sy, 90, '#ffd88a', 0.55 * (1 - n));
      X.blob(ctx, sx, sy, 12, 12, '#fff4d0');
    }
    // the world you are going to ruin next, hanging over everything
    const icon = g.navIcon(g.save.bodyIndex || 0);
    const px = 400 - (CAM.x * 0.03) % 20, py = 50 + Math.sin(t * 0.5) * 3;
    ctx.drawImage(icon, Math.round(px - icon.width * 0.8), Math.round(py - icon.height * 0.8), Math.round(icon.width * 1.6), Math.round(icon.height * 1.6));
  }

  /* Anything standing on the moon: drawn in its own frame, feet at 0,0, and
     darkened by however much night it is standing in. */
  function onMoon(ctx, x, y, fn) {
    if (!visible(x)) return;
    ctx.save();
    surf(ctx, x, y);
    fn(ctx);
    ctx.restore();
  }
  const NIGHT = new WeakMap();
  function nightOf(cv) {
    let n = NIGHT.get(cv);
    if (n) return n;
    n = document.createElement('canvas');
    n.width = cv.width; n.height = cv.height;
    const q = n.getContext('2d');
    q.drawImage(cv, 0, 0);
    q.globalCompositeOperation = 'source-atop';
    q.fillStyle = 'rgba(8,6,30,0.72)';
    q.fillRect(0, 0, n.width, n.height);
    NIGHT.set(cv, n);
    return n;
  }
  // a painted sprite, standing where it is, dimmed by the night it is in
  function stand(ctx, cv, x, oy, flip, sx, sy) {
    const nt = nightAt(x);
    PT.sprite(ctx, cv, 0, oy || 0, undefined, undefined, flip, sx, sy);
    if (nt > 0.02) { ctx.globalAlpha = nt; PT.sprite(ctx, nightOf(cv), 0, oy || 0, undefined, undefined, flip, sx, sy); ctx.globalAlpha = 1; }
  }

  function drawOutside(ctx, g, t) {
    drawSky(ctx, g, t);
    ctx.save();
    outXform(ctx);
    // the glow of the thin atmosphere it does not quite have
    const atm = ctx.createRadialGradient(0, 0, R - 10, 0, 0, R + 34);
    atm.addColorStop(0, 'rgba(170,150,255,0.35)'); atm.addColorStop(1, 'rgba(170,150,255,0)');
    ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(0, 0, R + 34, 0, U.TAU); ctx.fill();
    // the rock
    const moon = art('moon', paintMoon);
    const half = moon.width / HD / 2;
    ctx.drawImage(moon, -half, -half, half * 2, half * 2);
    // night: the side away from the sun
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, R + 9, 0, U.TAU); ctx.clip();
    const sx = Math.sin(S.sun) * R, sy = -Math.cos(S.sun) * R;
    const sh = ctx.createLinearGradient(sx, sy, -sx, -sy);
    sh.addColorStop(0, 'rgba(255,220,160,0.10)'); sh.addColorStop(0.42, 'rgba(0,0,0,0)');
    sh.addColorStop(0.58, 'rgba(8,6,30,0.55)'); sh.addColorStop(1, 'rgba(4,2,16,0.82)');
    ctx.fillStyle = sh; ctx.fillRect(-R - 10, -R - 10, R * 2 + 20, R * 2 + 20);
    ctx.restore();

    // the scenery
    for (const r of ROCKS) onMoon(ctx, r.x, groundY(r.x) + 2, (c) => stand(c, art('rock' + r.k, () => paintRock(r.k)), r.x, 0, false, r.s, r.s));
    // the billboard, with him in it
    onMoon(ctx, BOARD_X, groundY(BOARD_X) + 1, (c) => { stand(c, art('board', paintBoard), BOARD_X); drawBoardFace(c, g, t); });
    // the flag and the survey bot
    onMoon(ctx, FLAG_X, groundY(FLAG_X) + 1, (c) => AH.blit(c, AH.S.flag, Math.floor(t * 4) % 2, 0, 0));
    onMoon(ctx, SURVEY_X, groundY(SURVEY_X) + 2, (c) => AH.blit(c, AH.S.survey, 0, 0, 0));
    // the heaps
    for (let i = 0; i < TRASH.length; i++) {
      if (cleaned(g, i)) continue;
      const h = TRASH[i];
      onMoon(ctx, h.x, groundY(h.x) + 2, (c) => {
        X.blob(c, 0, 0, 20, 3, '#241f36');
        AH.blit(c, AH.S['moonjunk' + h.k], 0, 0, 1);
        for (let k = 0; k < 2; k++) X.rect(c, Math.sin(t * 3 + i + k * 2) * 9, -18 + Math.cos(t * 4 + i * 2 + k) * 6, 1, 1, '#3a3348');
      });
    }
    // the house and the pad
    const tier = PD.build ? PD.build.houseTier(g) : 0;
    onMoon(ctx, HOUSE_X, groundY(HOUSE_X) + 4, (c) => {
      stand(c, art('house' + tier, () => paintHouse(tier)), HOUSE_X, 0);
      // smoke from wherever the smoke comes out
      for (let i = 0; i < 5; i++) {
        const f = ((t * 0.3 + i / 5) % 1);
        c.globalAlpha = (1 - f) * 0.35;
        X.blob(c, -30 + Math.sin(f * 5 + i) * 5, -62 - f * 40, 3 + f * 8, 2 + f * 6, '#8e86a8');
      }
      c.globalAlpha = 1;
      // the lit doorway, brighter at night
      c.globalAlpha = 0.25 + nightAt(HOUSE_X) * 0.5;
      PT.glow(c, 0, -14, 34, '#ffb05a', 0.6);
      c.globalAlpha = 1;
      F.draw(c, 'HOME', 0, -32, '#3a2410', { center: true, shadow: false });
    });
    onMoon(ctx, PAD_X, groundY(PAD_X) + 3, (c) => {
      stand(c, art('pad', paintPad), PAD_X, 0);
      for (let i = 0; i < 4; i++) { const on = (Math.floor(t * 3) + i) % 4 === 0; X.blob(c, -40 + i * 26, -12, 1.8, 1.8, on ? '#ff5a4d' : '#5a2020'); }
      if (!(PD.build && PD.build.riding() && PD.build.rideHidesUfo())) {
        X.blob(c, 0, -10, 40, 4, '#241f36');
        AH.blit(c, AH.S.saucer, Math.floor(t * 3) % 2, 0, -8 + Math.sin(t * 1.6) * 1.5);
      }
    });
    // everything you have built
    if (PD.build) PD.build.drawOut(ctx, g, t, API);
    // Brenda, if she is out with you
    if (g.save.pet) onMoon(ctx, rat.x, rat.y + 2, (c) => drawRatHere(c, g, t));
    // you
    if (!(PD.build && PD.build.riding())) {
      ctx.save();
      surf(ctx, P.x, P.y);
      drawPlayerAt(ctx, g, 0, 0, t);
      ctx.restore();
    }
    if (PD.build) PD.build.drawOutFront(ctx, g, t, API);
    ctx.restore();
  }

  function drawBoardFace(ctx, g, t) {
    const debt = g.save.debt || 0;
    const fl = Math.sin(t * 17) > 0.96 ? 0.4 : 1;
    ctx.save();
    ctx.beginPath(); ctx.rect(-25, -56, 50, 28); ctx.clip();
    ctx.fillStyle = PT.rgba(0x0a2a4a, 0.9); ctx.fillRect(-25, -56, 50, 28);
    ctx.globalAlpha = 0.9 * fl;
    PD.chum.drawChumAt(ctx, -12, -26 + Math.sin(t * 2) * 0.5, 0.34, Math.sin(t * 3) > 0.3, t);
    ctx.globalAlpha = fl;
    F.draw(ctx, debt > 0 ? 'OWE ME' : 'THANKS', 10, -54, '#7ef9ff', { center: true, shadow: false });
    F.draw(ctx, debt > 0 ? '$' + U.fmt(debt) : 'PAL', 10, -44, debt > 0 ? '#ff8a9a' : '#8affa0', { center: true, shadow: false });
    for (let y = -56; y < -28; y += 2) { ctx.globalAlpha = 0.18; ctx.fillStyle = '#7ef9ff'; ctx.fillRect(-25, y + ((t * 20) % 2), 50, 1); }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawInside(ctx, g, t, cam) {
    // space through the way out, then the rock over it
    ctx.fillStyle = '#05030e'; ctx.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 40; i++) {
      const x = IN_W - 40 + U.hash2(i, 3) * 40 - cam, y = FLOOR - 70 + U.hash2(i, 5) * 70;
      ctx.globalAlpha = 0.4 + 0.5 * Math.sin(t * 2 + i);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x | 0, y | 0, 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(art('cave', paintCave), -cam, 0, IN_W, VH);
    // the crystals glow
    for (const [x, y, c] of [[18, 144, '#7ef9ff'], [270, 133, '#ff7ac4'], [118, 124, '#a87cff']]) {
      ctx.globalAlpha = 0.28 + Math.sin(t * 1.6 + x) * 0.08;
      PT.glow(ctx, x - cam, y, 26, c, 0.5);
    }
    ctx.globalAlpha = 1;
    // fairy lights along the roof, on a string, twinkling
    for (let i = 0; i < 24; i++) {
      const x = 10 + i * 12, y = CEIL - 2 + Math.sin(i * 0.9) * 3 + Math.sin(x / IN_W * Math.PI) * -10 + 14;
      const col = ['#ffd34d', '#ff7ac4', '#7ef9ff', '#8aff9a'][i % 4];
      const on = Math.sin(t * 2 + i * 1.7) > -0.4;
      if (i > 0) X.line(ctx, x - 12 - cam, CEIL - 2 + Math.sin((i - 1) * 0.9) * 3 + Math.sin((x - 12) / IN_W * Math.PI) * -10 + 14 - 2, x - cam, y - 2, '#2a2438', 1);
      X.blob(ctx, x - cam, y, 1.6, 1.8, on ? col : '#3a3048');
      if (on) { ctx.globalAlpha = 0.25; PT.glow(ctx, x - cam, y, 7, col, 0.6); ctx.globalAlpha = 1; }
    }
    // the poster, the shelf, the cooler
    PT.sprite(ctx, art('poster', paintPoster), 40 - cam, 162, undefined, undefined);
    PT.sprite(ctx, art('shelf', paintShelf), 188 - cam, FLOOR + 1);
    PT.sprite(ctx, art('cooler', paintCooler), 16 - cam, FLOOR + 1);
    // the bed, whatever it is by now
    const bt = PD.build ? PD.build.bedTier(g) : 0;
    PT.sprite(ctx, art('bed' + bt, () => paintBed(bt)), IN_SPOTS[2].x - cam, FLOOR + 1);
    // the desk and the laptop, its screen lit
    PT.sprite(ctx, art('desk', paintDesk), IN_SPOTS[0].x - cam, FLOOR + 1);
    const lx = IN_SPOTS[0].x - cam;
    ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.05;
    PT.glow(ctx, lx - 2, FLOOR - 36, 40, '#4ab0ff', 0.4);
    ctx.globalAlpha = 1;
    // what the screen says: the ABAY logo, and a line of text scrolling
    X.rect(ctx, lx - 22, FLOOR - 43, 24, 13, '#1a3a6a');
    F.draw(ctx, 'ABAY', lx - 10, FLOOR - 42, ['#ff5a4d', '#2f6fd0', '#f0b028', '#3a9c48'][Math.floor(t * 2) % 4], { center: true, shadow: false });
    X.rect(ctx, lx - 20 + (t * 10) % 18, FLOOR - 33, 3, 1, '#9dffb0');
    // the jar, bubbling
    const jx = IN_SPOTS[1].x - cam;
    ctx.globalAlpha = 0.3; PT.glow(ctx, jx, FLOOR - 30, 40, '#4cff9a', 0.4); ctx.globalAlpha = 1;
    X.blob(ctx, jx, FLOOR + 2, 26, 4, '#1a2a20');
    AH.blit(ctx, AH.S.brainjar, Math.floor(t * 2.4) % 3, jx, FLOOR + 2);
    // a candle in a jar, and a drip off the roof
    X.rect(ctx, 256 - cam, FLOOR - 10, 6, 10, 'rgba(200,230,255,0.4)'); X.rect(ctx, 258 - cam, FLOOR - 8, 2, 6, '#f0e8d0');
    X.blob(ctx, 259 - cam, FLOOR - 11 - Math.abs(Math.sin(t * 9)) * 0.8, 1.2, 2, '#ffb040');
    PT.glow(ctx, 259 - cam, FLOOR - 12, 16, '#ffb040', 0.35);
    const dq = (t * 0.5) % 1;
    X.rect(ctx, 136 - cam, CEIL + 8 + dq * 90, 1, 2, '#9adfff');
    // whatever furniture you have bought
    if (PD.build) PD.build.drawIn(ctx, g, t, cam);
    // the cheese, until he takes it
    if (!g.save.pet) AH.blit(ctx, AH.S.cheese, 0, RAT_SPOT.x + 16 - cam, FLOOR + 1);
    // the cave closes in at the edges
    const vg = ctx.createRadialGradient(IN_W / 2 - cam, 170, 80, IN_W / 2 - cam, 170, 260);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,3,14,0.65)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  }

  function drawRatHere(ctx, g, t) {
    const spr = g.save.pet ? AH.S.ratFed : AH.S.rat;
    const bounce = g.save.pet ? Math.abs(Math.sin(rat.hop)) * 9 : 0;
    const sq = 1 + Math.cos(rat.hop * 2) * 0.14 * (bounce > 0.5 ? 1 : 0);
    const f = rat.chew > 0 ? 1 : (Math.sin(t * 3) > 0 ? 0 : 1);
    ctx.save();
    ctx.translate(0, Math.round(-bounce));
    ctx.scale((rat.face < 0 ? -1 : 1) / sq, sq);
    ctx.drawImage(spr.frames[f], -spr.ox, -spr.oy, spr.w, spr.h);
    ctx.restore();
  }

  /* YOU. The rig, the squash, the hat. */
  function drawPlayerAt(ctx, g, x, gy, t) {
    const skin = PD.art.skinFor(g.save.cos);
    const air = P.y < groundY(P.x) - 1;
    const walking = Math.abs(P.vx) > 8;
    const y = (gy - 13) | 0;
    x = x | 0;
    if (P.roll > 0) {
      ctx.save();
      ctx.translate(x, (gy + 2 | 0) - 14);
      ctx.rotate(P.rollA);
      const s = skin.alienRoll;
      ctx.drawImage(s.frames[0], -s.ox, -s.oy + 14, s.w, s.h);
      ctx.restore();
      return;
    }
    if (!P.rig) P.rig = PD.rig.make();
    const r = P.rig;
    PD.rig.step(r, { dt: g.dt, vx: P.vx, vy: P.vy, ground: !air, drilling: false });
    if (r.fresh) {
      const SAYS = { wave: 'HI', shrug: '?', flex: 'HUP', point: '!', scratch: 'HMM', sniff: 'SNF', stretch: 'AAA' };
      const b = S.scene === 'out' ? toBuf(P.x, P.y - 48) : { x: P.x, y: P.y - 48 };
      FX.text(b.x, b.y, SAYS[r.fresh] || '?', '#ffe9a8', 0);
      A.sfx.tone(r.fresh === 'shrug' ? 300 : 620, { type: 'square', to: r.fresh === 'shrug' ? 220 : 820, dur: 0.09, vol: 0.035 });
      r.fresh = null;
    }
    const frame = PD.rig.faceOf(r, t, Math.sin(t * 1.3) > 0.94);
    const wob = walking ? Math.sin(P.walk * 2.2) * 0.05 : Math.sin(t * 3.4) * 0.022;
    const sq = P.land > 0 ? 1 + P.land * 1.5 : (air ? (P.vy < -60 ? 0.84 : (P.vy > 90 ? 1.1 : 1)) : 1 + wob);
    // a soft shadow at your feet, smaller in the air
    const hgt = Math.max(0, groundY(P.x) - P.y);
    ctx.globalAlpha = 0.35 * Math.max(0.2, 1 - hgt / 60);
    X.blob(ctx, x, gy + hgt + 1, 10 * Math.max(0.4, 1 - hgt / 80), 2.4, '#0a0614');
    ctx.globalAlpha = 1;
    // the pet, trotting after you, and whatever is strapped to your back
    if (PD.cosm) {
      g._petFace = P.face;
      const pet = PD.cosm.petStep(g, g.dt || 0.016, P.x, P.y, S.scene);
      if (pet) {
        const out = S.scene === 'out';
        const dx = out ? wdist(pet.x, P.x) : pet.x - P.x;
        PD.cosm.drawPet(ctx, g, t, x + dx, gy + (groundY(pet.x) - P.y) + (out ? dx * dx / (2 * R) : 0), walking);
      }
      PD.cosm.drawBehind(ctx, g, x, y - 31 * sq, P.face, t, sq, P);
    }
    PD.rig.draw(ctx, r, {
      x, y, flip: P.face < 0, spr: skin.alienCore, frame,
      drilling: false, twoHand: false, grip: null, aim: P.face < 0 ? Math.PI : 0,
      ground: !air, vx: P.vx, vy: P.vy, squash: sq
    }, skin.P, PD.art.BIZ);
    if (PD.cosm) PD.cosm.drawOnPlayer(ctx, g, x + P.face, y - 31 * sq + (P.land > 0 ? P.land * 6 : 0), P.face, t, sq, P);
    if (walking && !air && U.chance(0.2)) dustAt(P.x - P.face * 5, P.y, 1, 10);
    if (P.sweep > 0) {
      const k = P.sweep / 0.5;
      ctx.globalAlpha = k * 0.8;
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * U.TAU + t * 4;
        X.blob(ctx, x + Math.cos(a) * (10 + (1 - k) * 18), gy - 14 + Math.sin(a) * (7 + (1 - k) * 10), 5 + (1 - k) * 5, 4 + (1 - k) * 4, '#8e86a8');
      }
      ctx.globalAlpha = 1;
    }
  }
  function drawPlayer(ctx, g, cam, t) { drawPlayerAt(ctx, g, P.x - cam, P.y, t); }

  function drawScene(ctx, g, t) {
    const cam = Math.round(g.intCam);
    if (CUT()) {
      PD.cut.drawBack(ctx, g, t, cam);
      if (!PD.cut.hidePlayer()) drawPlayer(ctx, g, cam, t);
      PD.cut.drawFront(ctx, g, t, cam);
      return;
    }
    if (S.scene === 'out') { drawOutside(ctx, g, t); return; }
    drawInside(ctx, g, t, cam);
    if (g.save.pet || S.scene === 'in') { ctx.save(); ctx.translate(Math.round(rat.x - cam), Math.round(rat.y + 2)); drawRatHere(ctx, g, t); ctx.restore(); }
    drawPlayer(ctx, g, cam, t);
    if (PD.build) PD.build.drawInFront(ctx, g, t, cam);
  }

  /* ============================================================ OVERLAY */
  function prompt(ctx, g, t) {
    const s = P.near;
    if (!s || (PD.build && (PD.build.active() || PD.build.riding()))) return;
    const lift = s.lift || ({ door: 118, ufo: 84, pc: 84, brain: 90, exit: 76, bed: 64, rat: 44, trash: 66, board: 150 }[s.id] || 100);
    const sp = worldToScreen(s.x, groundY(s.x));
    const x = U.clamp(Math.round(sp.x), 60, VW - 60);
    const y = U.clamp(Math.round(sp.y - lift + Math.sin(t * 5) * 2), 24, VH - 70);
    const w = Math.max(F.width(s.name, 1), F.width(s.sub, 1)) + 18;
    X.plate(ctx, x - w / 2 + 2, y + 2, w, 26, 'rgba(6,3,14,0.5)', null, null, 4);
    X.plate(ctx, x - w / 2, y, w, 26, '#3a2a5a', '#6a5aa0', '#1a1030', 4);
    F.draw(ctx, s.name, x, y + 4, '#ffe9a8', { center: true, shadow: '#1a1030' });
    F.draw(ctx, s.sub, x, y + 14, '#b8a8e0', { center: true, shadow: false });
    const kb = Math.round(Math.abs(Math.sin(t * 5)) * 2);
    X.plate(ctx, x - 7, y - 14 - kb, 14, 13, '#e8dfc4', '#ffffff', '#a89b78', 3);
    F.draw(ctx, 'E', x, y - 11 - kb, '#241f16', { center: true, shadow: false });
  }

  function drawOverlay(ctx, g, t) {
    if (CUT()) { PD.cut.drawOverlay(ctx, g, t); return; }
    if (PD.build && PD.build.riding()) { PD.build.rideOverlay(ctx, g, t); return; }
    if (PD.build && PD.build.active()) { PD.build.drawUI(ctx, g, t); return; }
    if (S.sleep <= 0) prompt(ctx, g, t);
    if (S.sleep > 0) {
      ctx.globalAlpha = Math.min(0.88, (2.4 - Math.abs(S.sleep - 1.2) * 2) * 0.9);
      X.rect(ctx, 0, 0, VW, VH, '#0b0818');
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const f = ((S.t * 0.7 + i / 3) % 1);
        F.draw(ctx, 'Z', VW / 2 + 18 + f * 26, VH / 2 - 10 - f * 34, '#c9bce8', { center: true, scale: 1 + (i === 0 ? 1 : 0) });
      }
    }
    if (UI.msgT > 0) {
      const w = F.width(UI.msg, 1) + 16;
      ctx.globalAlpha = Math.min(1, UI.msgT);
      X.plate(ctx, VW / 2 - w / 2, VH - 44, w, 15, '#3a2a5a', '#6a5aa0', '#1a1030', 4);
      F.draw(ctx, UI.msg, VW / 2, VH - 40, '#ffe9a8', { center: true, shadow: '#1a1030' });
      ctx.globalAlpha = 1;
    }
    if (PD.build && S.scene === 'out') PD.build.overlay(ctx, g, t);
    if (PD.story) PD.story.drawGoal(ctx, g, t);
    else PD.chum.drawDebt(ctx, g, 8, VH - 30);
    if (PD.build) PD.build.drawButton(ctx, g, t, S.scene);
    const goals = g.save.seenIntro ? leadGoals(g) : null;
    if (goals && goals.length && !PD.chum.active() && !UI.mode && S.sleep <= 0) {
      PD.chum.leadStep(g.dt, g, { px: P.x, goals: goals, key: S.scene + ':' + (g.save.trash || 0) });
      PD.chum.drawMini(ctx, 28, VH - 34, t, 4, VW - 4);
    }
  }

  function leadGoals(g) {
    if (S.scene !== 'out' || (g.save.seen && g.save.seen.chum_tip)) return [];
    for (let i = 0; i < TRASH.length; i++) if (!cleaned(g, i)) return [{ x: P.x + wdist(TRASH[i].x, P.x), line: 'THAT ONE. I HAVE WAITED BEFORE.' }];
    return [];
  }

  function draw(ctx, g, t) { drawScene(ctx, g, t); drawOverlay(ctx, g, t); }

  function track() {
    if (CUT()) return PD.cut.track();
    if (PD.build && PD.build.riding()) return 'dig';
    return 'moon';
  }
  function closeScene() { UI.mode = null; P.lock = 0.2; A.sfx.click(); }
  function touchMode() { return CUT() || (PD.build && (PD.build.active() || PD.build.riding())) ? 'ui' : 'home'; }
  function enterCut(g, scene, atX) {
    g0 = g;
    S.scene = scene; S.deck = 0;
    UI.mode = null;
    place(g, atX);
    g.intCam = camWant();
    view(30);
  }

  const API = { artHouse: (k) => art('house' + k, () => paintHouse(k)), artBed: (k) => art('bed' + k, () => paintBed(k)), R, C, surf, onMoon, stand, toBuf, visible, nightAt, wdist, wrap, groundY, bump, CAM, S, P, RESERVED, TRASH, cleaned, dustAt, say };

  PD.home = {
    enter, update, draw, drawScene, drawOverlay, view, toScreen, fromScreenX, closeScene, touchMode, leaveDesk, say, P, UI, S,
    groundY, spots, nearest, use, arrive, worldToScreen, enterCut, drawPlayer, drawPlayerAt, cam: () => Math.round(g0 ? g0.intCam : 0),
    get ZW() { return ZW; }, get ZH() { return ZH; }, get ZK() { return ZK; }, drunk: () => 0,
    SPOTS, ROOM_W: C, R, C, TRASH, moonClean, trashLeft, sweep, goIn, goOut, API, IN_SPOTS, IN_W, FLOOR, CEIL, PAD_X, HOUSE_X,
    track, setZoom, kinMove: () => [0, 0], DECK_Y: [238, 158, 78], rat
  };
})(window.PD);
