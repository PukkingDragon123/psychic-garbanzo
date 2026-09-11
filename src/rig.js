/* THE RIG. The alien's arms and legs are not drawn into his sprite sheet any
   more -- only his body, head and nose are. His four limbs are built here out
   of live segments every frame, so they swing, plant, brace, bend and STRETCH
   instead of stepping through four baked poses.

   Everything in here works in *sprite units*: two units to one logical pixel,
   the same density the body is drawn at. The caller scales the context by a
   half before handing over, so an arm at any angle still lands on whole device
   pixels and reads as pixel art rather than a smear. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const TAU = U.TAU;

  /* Where the limbs hang off the body, measured from the sprite's anchor (the
     belt). Read straight off the drawing coordinates in art.js. */
  const SH = [[8, -13], [-12, -13]];      // shoulders: [near side, far side]
  const HIP = [[5, 10], [-9, 10]];        // hips
  const FOOT_Y = 32;                      // where the shoes sit at rest
  const UP = 9, FORE = 10;                // arm bones: short and spindly
  /* Leg bones. These are barely longer than the hip-to-ankle distance on
     purpose: at 14 each there was six units of slack standing still, so the
     knee shot out sideways and the leg read as a dog-leg wedge rather than a
     leg. Just over half the drop each means he stands nearly straight and
     only bends when he actually needs to. */
  const TH = 9, SHIN = 9;                 // leg bones
  /* The bones solve to the ANKLE, not to the sole: the brogue is ten units
     tall, and aiming the chain at the ground instead left the shin drawn far
     shorter than the bone the knee had been placed for, which is what turned
     the standing pose into a dark lump with no leg in it. */
  const ANK = 7;
  /* THE WALK. AMP is how far the foot swings in front of and behind the hip,
     so one step covers 2*AMP and a whole cycle covers 4*AMP of ground. The
     phase rate below is derived from exactly that, which is what stops the
     planted foot skating. */
  const AMP = 13, LIFT = 9;
  /* The body is lifted by this much so the longer legs have somewhere to be;
     LIFT_Y + the extra leg length cancel out, so his shoes still meet the
     ground exactly where the old baked sprite put them. */
  const LIFT_Y = 3;

  /* Two-bone solve. When the target is further away than the bones reach the
     bones THEMSELVES stretch, up to `maxs` -- which is the whole point: an arm
     reaching for the drill or a leg braced against a rock pulls long. */
  function ik(ax, ay, bx, by, l1, l2, sign, maxs) {
    const dx = bx - ax, dy = by - ay;
    const d = Math.max(0.001, Math.hypot(dx, dy));
    const s = d > l1 + l2 ? Math.min(maxs || 1.34, d / (l1 + l2)) : 1;
    const a1 = l1 * s, a2 = l2 * s;
    const dc = Math.min(d, a1 + a2 - 0.001);
    const cos = (dc * dc + a1 * a1 - a2 * a2) / (2 * dc * a1);
    const ang = Math.atan2(dy, dx) + sign * Math.acos(U.clamp(cos, -1, 1));
    return { x: ax + Math.cos(ang) * a1, y: ay + Math.sin(ang) * a1, s: s, reach: d, slack: a1 + a2 - d };
  }

  /* Three long fingers and no thumb worth the name, pointing where the hand
     points. The direction is snapped to eight ways so the fingers stay
     rectangular however the arm is waving about. */
  function hand(ctx, x, y, ang, P) {
    const q = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
    const fx = Math.cos(q), fy = Math.sin(q);
    const px = -fy, py = fx;
    X.knob(ctx, x, y, 3, P.skin, P.skinL);
    for (let i = -1; i <= 1; i++) {
      const bx = x + px * i * 2.5, by = y + py * i * 2.5;
      X.limb(ctx, bx, by, bx + fx * (i ? 4 : 6), by + fy * (i ? 4 : 6), 3, 2, P.skin, null, P.skinD);
    }
  }

  /* --------------------------------------------------------------- the leg
     Legs used to be two calls to X.limb -- a line of stamped squares, ten
     units across, in a grey a shade off the grey of the shoe under it. At
     this size that fuses thigh, shin, foot and the leg BEHIND it into one
     blob. Rebuilt here out of three things that each fix one of those:

       * hard-edged tapered QUADS instead of stamped squares, so the leg has
         real edges and can carry a 1px outline;
       * a taper that actually narrows -- 11 units at the hip down to 6 at the
         ankle -- so it reads as a leg and not as a pipe;
       * a shoe in a completely different hue (tan brogues against navy
         slacks), because at four pixels across only hue separates them.

     The far leg gets its own darker set of all three, so the two legs sit at
     different depths instead of overlapping into one shape. */

  /* One tapered segment: fill, 1px outline, and a straight highlight strip
     down the lit side. Everything is a polygon, so no diagonal is smeared. */
  function seg(ctx, x0, y0, x1, y1, w0, w1, col, light, dark) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.max(0.001, Math.hypot(dx, dy));
    let px = -dy / len, py = dx / len;
    const ux = dx / len, uy = dy / len;
    // the light is up and to the left on every other part of him, so the
    // highlight goes on whichever side of the bone faces left, never on
    // whichever side the maths happened to hand us
    if (px > 0) { px = -px; py = -py; }
    const quad = (a, b, e) => [
      [x0 + px * a - ux * e, y0 + py * a - uy * e],
      [x1 + px * b + ux * e, y1 + py * b + uy * e],
      [x1 - px * b + ux * e, y1 - py * b + uy * e],
      [x0 - px * a - ux * e, y0 - py * a - uy * e]
    ];
    if (dark) X.poly(ctx, quad(w0 / 2 + 1, w1 / 2 + 1, 1), dark);
    X.poly(ctx, quad(w0 / 2, w1 / 2, 0), col);
    // one unit of edge light, not a band: any wider and the trouser turns
    // into a pale smudge with a dark rim
    if (light) X.poly(ctx, [
      [x0 + px * (w0 / 2 - 0.5), y0 + py * (w0 / 2 - 0.5)],
      [x1 + px * (w1 / 2 - 0.5), y1 + py * (w1 / 2 - 0.5)],
      [x1 + px * (w1 / 2 - 1.5), y1 + py * (w1 / 2 - 1.5)],
      [x0 + px * (w0 / 2 - 1.5), y0 + py * (w0 / 2 - 1.5)]
    ], light);
  }

  /* A brogue: stacked heel, a sole that overhangs, a wedge of an upper that
     is tall at the ankle and low over the toes, a bright toecap and two
     pixels of lace. Axis-aligned always -- a tilted shoe this small is a
     smudge -- but the toe points the way he is facing. */
  function shoe(ctx, x, y, face, far, B) {
    const f = face > 0 ? 1 : -1;
    x = Math.round(x); y = Math.round(y);
    const b = y + 1;                                 // the sole rests here
    const col = far ? B.shoeF : B.shoe;
    const lit = far ? B.shoeFL : B.shoeL;
    const toe = 11, heel = 5;
    const L = x - (f > 0 ? heel : toe), W = toe + heel;
    X.poly(ctx, [
      [x - heel * f, b - 9], [x + 2 * f, b - 9], [x + (toe - 4) * f, b - 6],
      [x + toe * f, b - 4], [x + toe * f, b - 2], [x - heel * f, b - 2]
    ], B.shoeD);
    X.poly(ctx, [
      [x - (heel - 1) * f, b - 8], [x + 2 * f, b - 8], [x + (toe - 4) * f, b - 5],
      [x + (toe - 1) * f, b - 4], [x + (toe - 1) * f, b - 3], [x - (heel - 1) * f, b - 3]
    ], col);
    X.poly(ctx, [                                    // the toecap, polished
      [x + 4 * f, b - 6], [x + (toe - 4) * f, b - 5], [x + (toe - 1) * f, b - 4],
      [x + (toe - 1) * f, b - 3], [x + 4 * f, b - 4]
    ], lit);
    if (!far) {                                      // laces
      X.rect(ctx, x - (f > 0 ? 1 : 2), b - 8, 3, 1, '#efe7d2');
      X.rect(ctx, x + (f > 0 ? 2 : -4), b - 7, 2, 1, '#efe7d2');
    }
    X.rect(ctx, L, b - 2, W, 2, B.sole);             // sole
    X.rect(ctx, f > 0 ? x - heel : x + toe - 3, b - 4, 3, 2, B.shoeD);
  }

  /* Hip to knee to ankle to brogue. Only about five logical pixels of leg is
     ever visible -- the jacket hangs over the rest -- so everything here is
     spent on making that strip read: dark slacks between an olive coat and a
     tan shoe, and a cuff that FLARES instead of tapering, because a widening
     hem is what says trouser at this size. */
  function leg(ctx, hx, hy, kx, ky, fx, fy, face, far, B) {
    const c = far ? B.trousersF : B.trousers;
    const l = far ? B.trousersFL : B.trousersL;
    const d = B.trousersD;
    X.oct(ctx, kx, ky, 4, d);                        // the knee, drawn under
    seg(ctx, hx, hy, kx, ky, 9, 7, c, l, d);         // thigh
    seg(ctx, kx, ky, fx, fy - ANK, 7, 9, c, l, d);   // shin, flaring to a cuff
    X.oct(ctx, kx, ky, 3, c);                        // and capped, flush
    const cy2 = Math.round(fy) - 9, cx2 = Math.round(fx);
    X.rect(ctx, cx2 - 5, cy2, 10, 2, d);             // the hem, breaking over
    X.rect(ctx, cx2 - 4, cy2 - 2, 3, 2, l);          // the shoe it never fits
    shoe(ctx, fx, fy, face, far, B);
  }

  /* ------------------------------------------------------------------ state
     One rig per body. Feet remember where they were planted so they stay put
     while the hips move over them. */
  function make() {
    return {
      phase: 0, bob: 0, jolt: 0, grab: null, grabT: 0,
      lean: 0, brace: 0, recoil: 0, breathe: U.rand(0, TAU),
      hand: [null, null], armS: [1, 1], legS: [1, 1],
      emote: null, emoteT: 0, emoteMax: 1, idleT: 0, nextEmote: U.rand(1.5, 4),
      landT: 0, sway: 0, fresh: null, ragdoll: 0, woozyT: 0, spin: 0, ang: 0
    };
  }

  /* THE GOOFY BIT. Left standing about he cannot help himself: he waves at
     nobody, has a big stretch, shrugs at the horizon, scratches his head,
     flexes arms that have nothing on them, or points at something that is not
     there. All of it is played through the live limbs, so there are no frames
     to draw -- the arms just go somewhere silly and spring back. */
  const EMOTES = ['wave', 'stretch', 'shrug', 'scratch', 'flex', 'point', 'sniff'];
  const EMOTE_LEN = { wave: 1.5, stretch: 1.5, shrug: 1.1, scratch: 1.4, flex: 1.2, point: 1.2, sniff: 1.0 };

  function emote(r, which) {
    if (!r) return;
    r.emote = which || U.pick(EMOTES);
    r.emoteMax = EMOTE_LEN[r.emote] || 1.3;
    r.emoteT = r.emoteMax;
    r.fresh = r.emote;                     // the caller may want to react once
  }
  /* 0 at each end, 1 in the middle: everything eases in and springs back. */
  function emoteK(r) {
    if (!r.emote || r.emoteT <= 0) return 0;
    const f = 1 - r.emoteT / r.emoteMax;
    return Math.sin(U.clamp(f, 0, 1) * Math.PI);
  }
  /* He hit the floor: fling the arms out. */
  function land(r, amt) { if (r) r.landT = Math.min(1, (amt === undefined ? 1 : amt)); }

  /* Advance the rig. `o` describes the body this frame:
       vx, vy      how fast it is moving, in logical px/s
       ground      standing on something?
       drilling    leaning on the drill?
       dt          seconds
  */
  function step(r, o) {
    const dt = Math.min(0.05, o.dt || 0.016);
    const speed = Math.abs(o.vx || 0);
    /* The cycle is driven by ground covered, not by the clock. It advances on
       SPEED, never on signed velocity -- feeding it a negative vx ran the
       whole cycle backwards whenever he walked left, which is what made the
       walk look wrong half the time. One cycle per 4*AMP of ground covered
       (in sprite units, hence the doubling) means the stance foot travels
       backwards at exactly the speed the hips travel forwards. */
    if (o.ground) r.phase += (speed * 2) * dt / (4 * AMP);
    else r.phase += dt * 1.2;
    r.phase = r.phase % 1;
    r.breathe += dt * (o.drilling ? 7 : 2.2);
    r.jolt = Math.max(0, r.jolt - dt * 6);
    r.recoil = Math.max(0, r.recoil - dt * 9);
    r.grabT = Math.max(0, r.grabT - dt * 5);
    r.lean = U.damp(r.lean, o.drilling ? 1 : 0, 0.35, dt);
    r.brace = U.damp(r.brace, o.drilling && o.ground ? 1 : 0, 0.3, dt);
    r.walkAmt = U.damp(r.walkAmt === undefined ? 0 : r.walkAmt, o.ground ? U.clamp(speed / 70, 0, 1) : 0, 0.4, dt);
    r.landT = Math.max(0, r.landT - dt * 3.4);
    r.woozyT = Math.max(0, r.woozyT - dt);
    // he leans into wherever he is going and it takes a moment to come back
    r.sway = U.damp(r.sway, U.clamp((o.vx || 0) / 130, -1, 1), 0.16, dt);

    // and if he is left standing there he starts doing something silly
    const idling = o.ground && !o.drilling && speed < 8 && !o.noEmote;
    if (r.emoteT > 0) {
      r.emoteT -= dt;
      if (r.emoteT <= 0) { r.emote = null; r.idleT = 0; r.nextEmote = U.rand(2.2, 6); }
    } else if (idling) {
      r.idleT += dt;
      if (r.idleT > r.nextEmote) { emote(r); r.idleT = 0; }
    } else r.idleT = 0;
    return r;
  }

  /* WHICH FACE. Frames 0-3 are the nose jiggle; 4 up are the expressions, in
     the order art.js builds them. The rig picks one off its own state, so the
     face follows what the body is already doing without anyone wiring it up. */
  const FACE = { blink: 4, happy: 5, cross: 6, shock: 7, woozy: 8, smug: 9 };
  const EMOTE_FACE = {
    wave: FACE.happy, point: FACE.happy, sniff: FACE.happy,
    shrug: FACE.smug, scratch: FACE.smug,
    flex: FACE.cross, stretch: FACE.blink
  };
  function faceOf(r, t, blinking) {
    if (r.ragdoll || r.woozyT > 0) return FACE.woozy;
    if (r.landT > 0.55) return FACE.shock;
    if (r.emote && r.emoteT > 0 && emoteK(r) > 0.25) {
      const f = EMOTE_FACE[r.emote];
      if (f !== undefined) return f;
    }
    if (blinking) return FACE.blink;
    return Math.floor(t * 7) % 4;                 // the nose, never still
  }

  /* A drill bite landed: yank the whole rig backwards for a couple of frames. */
  function hit(r, amt) { if (r) { r.jolt = 1; r.recoil = Math.max(r.recoil, amt === undefined ? 1 : amt); } }

  /* He snatches at something he just picked up. The delta arrives in logical
     world pixels; it is stored forward-relative so a mirrored body reaches the
     right way. */
  function grab(r, dx, dy, faceRight) {
    if (!r) return;
    r.grab = { x: dx * 2 * (faceRight ? 1 : -1), y: dy * 2 };
    r.grabT = 1;
  }

  /* ------------------------------------------------------------------- draw
     Called between the two halves of the body: back limbs, body, front limbs.
     `half` is 1 for the far side (drawn behind) and 0 for the near side. */
  /* One side of the body. Called twice: the far half behind the torso, the
     near half in front of it. Each half draws its leg and then its arm; the
     ragdoll branches bail out early with their own limp versions. */
  function limbs(ctx, r, o, half, P, B) {
    const flip = o.flip ? -1 : 1;
    const face = flip;
    const drilling = o.drilling;
    const t = r.phase;
    // limbs are drawn a shade LIGHTER than the jacket, not darker: against a
    // dark green body a dark green arm is invisible
    const dark = B.jacketD, mid = B.jacket, lit = B.jacketL;

    /* ------------------------------------------------------------ the legs */
    const i = half;
    const hip = HIP[i];
    const hx = hip[0] * flip, hy = hip[1] + r.bobY;
    let fx, fy, planted = true;
    if (o.ragdoll) {
      // legs out too, trailing the tumble
      const w3 = r.ang * 2.6 + i * 1.7 + 1;
      fx = hx + (i ? -11 : 11) + Math.sin(w3) * 9;
      fy = FOOT_Y - 6 + Math.cos(w3 * 0.9) * 9;
      const kn2 = ik(hx, hy, fx, fy - ANK, TH, SHIN, i ? -1 : 1, 1.2);
      leg(ctx, hx, hy, kn2.x, kn2.y, fx, fy, face, i === 1, B);
      return;
    }
    if (!o.ground) {
      // in the air the legs trail whichever way he is moving, knees tucked
      const tuck = U.clamp((o.vy || 0) / 260, -1, 1);
      fx = hx - face * (6 + i * 4) - U.clamp((o.vx || 0) / 26, -8, 8);
      fy = FOOT_Y - 6 + tuck * 5 + i * 2;
      planted = false;
    } else if (drilling) {
      // braced. Aiming along the ground he plants one foot forward and drives
      // the other straight out behind, stretched against the recoil; aiming
      // up or down there is nothing to brace against fore and aft, so the
      // legs go wide instead and he squats over the hole.
      const br = r.brace;
      const push = r.recoil * 4;
      const vert = Math.abs(Math.sin(o.aim));
      const wide = (i ? -13 : 13) * vert;
      fx = hx + (face * (i ? -15 - push : 12) * (1 - vert) + wide) * br;
      fy = FOOT_Y - vert * 3 * br + (i ? -1 : 0);
    } else if (r.walkAmt > 0.04) {
      /* A real cycle in two halves. STANCE: the foot is on the floor, so it
         slides backwards relative to the hip in a straight line at exactly
         the speed the hip is moving forwards -- it does not move at all in
         the world, which is the whole point. SWING: it lifts and arcs back
         out in front. A cosine for both (which is what this used to do) makes
         the planted foot skate, because a cosine is not a constant speed. */
      const ph = ((t + i * 0.5) % 1 + 1) % 1;
      const w = r.walkAmt;
      let up = 0;
      if (ph < 0.5) {
        fx = hx + AMP * (1 - 4 * ph) * face * w;         // planted, sliding back
      } else {
        const f = (ph - 0.5) * 2;                        // 0..1 through the swing
        fx = hx + AMP * (-1 + 2 * f) * face * w;
        up = Math.sin(f * Math.PI);
      }
      fy = FOOT_Y - up * LIFT * w;
      planted = up < 0.05;
    } else {
      // standing: knock-kneed, weight on one side, breathing
      fx = hx + face * (i ? -5 : 3);
      fy = FOOT_Y + Math.sin(r.breathe) * 0.6;
      const ek = emoteK(r);
      if (ek > 0.01) {
        // up on his toes for a stretch, feet apart for a shrug or a flex
        if (r.emote === 'stretch') fy -= 3 * ek;
        if (r.emote === 'shrug' || r.emote === 'flex') fx += (i ? -6 : 6) * ek;
        if (r.emote === 'wave') fx += face * (i ? -2 : 3) * ek;
      }
    }
    const knee = ik(hx, hy, fx, fy - ANK, TH, SHIN, i ? -1 : 1, 1.3);
    // knees pull inward: he has never once stood straight
    const kin = face * (i ? 1 : -1);
    leg(ctx, hx, hy, knee.x + kin, knee.y, fx, fy, face, i === 1, B);

    /* ------------------------------------------------------------ the arms */
    const sh = SH[i];
    const sx = sh[0] * flip + r.lean * face * 3, sy = sh[1] + r.bobY;
    let tx, ty, hang;
    if (o.ragdoll) {
      // limp: the arms trail off the shoulders and flap about with the spin
      const w2 = r.ang * 3 + i * 2.1;
      tx = sx + (i ? -13 : 13) + Math.sin(w2) * 7;
      ty = sy + 15 + Math.cos(w2 * 0.8) * 8;
      hang = Math.atan2(ty - sy, tx - sx);
      X.knob(ctx, sx, sy + 1, 5, mid, lit);
      const el2 = ik(sx, sy, tx, ty, UP, FORE, i ? 1 : -1, 1.2);
      X.limb(ctx, sx, sy, el2.x, el2.y, 7, 6, mid, lit, dark);
      X.limb(ctx, el2.x, el2.y, tx, ty, 6, 5, mid, lit, dark);
      X.knob(ctx, el2.x, el2.y, 3, mid, lit);
      hand(ctx, tx, ty, hang, P);
      r.hand[i] = { x: tx, y: ty };
      return;
    }
    const holds = o.grip && (i === 0 || o.twoHand);
    if (holds && !(r.grabT > 0.02 && i === 0 && !o.twoHand)) {
      // a hand on the tool. Drilling, the far hand comes across to the front
      // of the housing as well, so the arms cross and read as a real grip.
      const g = o.grip;
      const off = o.twoHand ? (i ? 8 : -4) : 0;
      tx = g.x + Math.cos(o.aim) * off - r.recoil * 5 * Math.cos(o.aim);
      ty = g.y + Math.sin(o.aim) * off - r.recoil * 5 * Math.sin(o.aim);
      hang = o.aim;
    } else if (r.grabT > 0.02 && i === 0) {
      // snatching at an ore he has just picked up: the near arm shoots out,
      // stretching if it has to, then springs back
      const k = Math.sin(r.grabT * Math.PI);
      tx = U.lerp(sx + 1, r.grab.x, k);
      ty = U.lerp(sy + 21, r.grab.y, k);
      hang = Math.atan2(ty - sy, tx - sx);
    } else if (!o.ground) {
      tx = sx - face * 4 + (i ? -3 : 3);
      ty = sy + 16 - U.clamp((o.vy || 0) / 30, -6, 6);
      hang = Math.PI / 2;
    } else {
      const ph = ((t + i * 0.5) % 1 + 1) % 1;
      // a big loose swing, and the arm lifts as it comes forward
      const sw = -Math.cos(ph * TAU) * 12 * r.walkAmt * face;
      const rise = -Math.abs(Math.sin(ph * TAU)) * 5 * r.walkAmt;
      tx = sx + sw + (i ? -1 : 1);
      ty = sy + 21 + rise + Math.sin(r.breathe + i) * 1.4;
      hang = Math.PI / 2 + sw * 0.05;
      // just landed: both arms fly out sideways for a moment
      if (r.landT > 0.02) {
        tx = U.lerp(tx, sx + (i ? -20 : 20), r.landT);
        ty = U.lerp(ty, sy + 4, r.landT);
        hang = U.lerp(hang, i ? Math.PI : 0, r.landT);
      }
      // and whatever daft thing he has decided to do with them
      const ek = emoteK(r);
      if (ek > 0.01) {
        const near = i === 0;
        let ex = tx, ey = ty, eh = hang;
        switch (r.emote) {
          case 'wave':                                   // at nobody
            if (near) { ex = sx + 15; ey = sy - 17 + Math.sin(r.emoteT * 24) * 6; eh = -1.2; }
            break;
          case 'stretch':                                // both arms straight up
            ex = sx + (near ? 6 : -7); ey = sy - 22; eh = -Math.PI / 2;
            break;
          case 'shrug':                                  // palms out, no idea
            ex = sx + (near ? 19 : -19); ey = sy + 9; eh = near ? 0.2 : Math.PI - 0.2;
            break;
          case 'scratch':                                // the head, thoughtfully
            if (near) { ex = sx + 3; ey = sy - 21 + Math.sin(r.emoteT * 18) * 2; eh = -Math.PI / 2; }
            else { ex = sx - 12; ey = sy + 18; eh = Math.PI / 2; }
            break;
          case 'flex':                                   // arms he does not have
            ex = sx + (near ? 13 : -14); ey = sy - 12; eh = near ? -0.5 : Math.PI + 0.5;
            break;
          case 'point':                                  // at nothing in particular
            if (near) { ex = sx + 24; ey = sy - 6; eh = -0.2; }
            break;
          case 'sniff':                                  // a hand to the moustache
            if (near) { ex = sx + 8; ey = sy - 14; eh = -Math.PI / 2; }
            break;
        }
        tx = U.lerp(tx, ex, ek); ty = U.lerp(ty, ey, ek); hang = U.lerp(hang, eh, ek);
      }
    }
    const elb = ik(sx, sy, tx, ty, UP, FORE, i ? 1 : -1, 1.38);
    X.knob(ctx, sx, sy + 1, 5, mid, lit);                 // shoulder pad
    X.limb(ctx, sx, sy, elb.x, elb.y, 7, 6, mid, lit, dark);
    X.limb(ctx, elb.x, elb.y, tx, ty, 6, 5, mid, lit, dark);
    X.knob(ctx, elb.x, elb.y, 3, mid, lit);
    // a cuff, because the jacket is not his size
    X.knob(ctx, tx - Math.cos(hang) * 3, ty - Math.sin(hang) * 3, 3, B.shirt, null);
    hand(ctx, tx, ty, hang, P);
    r.hand[i] = { x: tx, y: ty };
  }

  /* Draw a whole body: back limbs, the bare torso sprite, front limbs.
     `o` needs: x, y (logical, the anchor), flip, spr (the core sprite), frame,
     drilling, grip (logical, where the hands hold the tool), aim, ground,
     vx, vy, squash, tint. */
  function draw(ctx, r, o, P, B) {
    let sq = o.squash || 1;
    // the whole body breathes and takes the recoil; bobY is in sprite units
    r.bobY = (o.ground ? -Math.abs(Math.cos(r.phase * TAU)) * 3.4 * (r.walkAmt || 0) : 0)
      + Math.sin(r.breathe) * (o.drilling ? 1.6 : 1.1) + r.jolt * 1.5
      - r.landT * 3;
    // the emote pulls the whole body about as well: taller for a stretch,
    // squatter for a shrug, and a wobble for a flex
    const ek = emoteK(r);
    if (ek > 0.01) {
      if (r.emote === 'stretch') sq *= 1 - 0.12 * ek;
      if (r.emote === 'shrug') sq *= 1 + 0.12 * ek;
      if (r.emote === 'flex') sq *= 1 + Math.sin(r.emoteT * 20) * 0.05 * ek;
      if (r.emote === 'wave' || r.emote === 'sniff') r.bobY -= 1.5 * ek;
    }
    const ox = Math.round((o.x | 0) - (o.drilling ? Math.cos(o.aim) * r.recoil * 2 : 0));
    const oy = Math.round((o.y | 0) - LIFT_Y - (o.drilling ? Math.sin(o.aim) * r.recoil : 0));

    ctx.save();
    ctx.translate(ox, oy);
    r.ang = o.ang || 0;
    if (r.ang) ctx.rotate(r.ang);
    // he TIPS: a shear into whichever way he is travelling, or into the drill
    const shear = -(r.sway * 0.16 + (o.drilling ? Math.cos(o.aim) * r.lean * 0.1 : 0)) * (o.flip ? -1 : 1);
    if (shear) ctx.transform(1, 0, shear, 1, 0, 0);
    if (sq !== 1) ctx.scale(sq, 1 / sq);
    ctx.save();
    ctx.scale(0.5, 0.5);
    const grip = o.grip ? { x: (o.grip.x - ox) * 2 * (o.flip ? -1 : 1), y: (o.grip.y - oy) * 2 } : null;
    void LIFT_Y;
    const oo = {
      flip: o.flip, drilling: o.drilling, twoHand: o.twoHand, ragdoll: o.ragdoll, aim: o.flip ? Math.PI - o.aim : o.aim,
      grip: grip, ground: o.ground, vx: (o.flip ? -1 : 1) * (o.vx || 0), vy: o.vy || 0
    };
    // mirroring happens here, once, so the limb code only ever faces right
    if (o.flip) ctx.scale(-1, 1);
    oo.flip = false;
    limbs(ctx, r, oo, 1, P, B);
    ctx.restore();

    const spr = o.spr;
    const cv = spr.frames[(o.frame | 0) % spr.frames.length];
    const k = spr.hd || 1;
    ctx.save();
    if (o.flip) ctx.scale(-1, 1);
    const src = o.tint ? PD.ent.flashOf(cv) : cv;
    ctx.drawImage(src, -spr.ox | 0, -spr.oy | 0, cv.width / k, cv.height / k);
    ctx.restore();

    // the tool goes on before the near hand, so his fingers close over the grip
    if (o.tool) { ctx.save(); ctx.translate(-ox, -oy); o.tool(ctx); ctx.restore(); }

    ctx.save();
    ctx.scale(0.5, 0.5);
    if (o.flip) ctx.scale(-1, 1);
    limbs(ctx, r, oo, 0, P, B);
    ctx.restore();
    ctx.restore();
  }

  PD.rig = { make, step, hit, grab, emote, land, draw, ik, faceOf, EMOTES, FACE, SH, HIP, FOOT_Y, LIFT_Y };
})(window.PD);
