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
  const TH = 14, SHIN = 14;               // leg bones
  const STRIDE = 20, LIFT = 10;           // walk: how far and how high
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

  /* An enormous flat shoe. Axis-aligned always: a tilted shoe at this size is
     just a grey smudge. */
  function shoe(ctx, x, y, face, B) {
    const w = 21, h = 6;
    const x0 = Math.round(x - (face > 0 ? 7 : w - 7));
    const y0 = Math.round(y - h + 1);
    X.rect(ctx, x0, y0, w, h, B.shoe);
    X.rect(ctx, x0 + 3, y0, w - 6, 2, B.shoeL);
    X.rect(ctx, x0, y0 + h - 1, w, 2, '#12101a');
  }

  /* ------------------------------------------------------------------ state
     One rig per body. Feet remember where they were planted so they stay put
     while the hips move over them. */
  function make() {
    return {
      phase: 0, bob: 0, jolt: 0, grab: null, grabT: 0,
      lean: 0, brace: 0, recoil: 0, breathe: U.rand(0, TAU),
      hand: [null, null], armS: [1, 1], legS: [1, 1]
    };
  }

  /* Advance the rig. `o` describes the body this frame:
       vx, vy      how fast it is moving, in logical px/s
       ground      standing on something?
       drilling    leaning on the drill?
       dt          seconds
  */
  function step(r, o) {
    const dt = Math.min(0.05, o.dt || 0.016);
    const speed = Math.abs(o.vx || 0);
    // the walk cycle is driven by ground covered, not by the clock, so his
    // feet never skate
    if (o.ground) r.phase += (o.vx || 0) * dt / (STRIDE * 0.5) * 0.5;
    else r.phase += dt * 1.2;
    r.breathe += dt * (o.drilling ? 7 : 2.2);
    r.jolt = Math.max(0, r.jolt - dt * 6);
    r.recoil = Math.max(0, r.recoil - dt * 9);
    r.grabT = Math.max(0, r.grabT - dt * 5);
    r.lean = U.damp(r.lean, o.drilling ? 1 : 0, 0.35, dt);
    r.brace = U.damp(r.brace, o.drilling && o.ground ? 1 : 0, 0.3, dt);
    r.walkAmt = U.damp(r.walkAmt === undefined ? 0 : r.walkAmt, o.ground ? U.clamp(speed / 70, 0, 1) : 0, 0.4, dt);
    return r;
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
  function limbs(ctx, r, o, half, P, B) {
    const flip = o.flip ? -1 : 1;
    const face = flip;
    const drilling = o.drilling;
    const t = r.phase;
    // limbs are drawn a shade LIGHTER than the jacket, not darker: against a
    // dark green body a dark green arm is invisible
    const dark = B.jacketD, mid = B.jacket, lit = B.jacketL;
    const legc = '#4d4560', legl = '#6f6489';

    /* ------------------------------------------------------------ the legs */
    const i = half;
    const hip = HIP[i];
    const hx = hip[0] * flip, hy = hip[1] + r.bobY;
    let fx, fy, planted = true;
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
      // a real cycle: the foot swings forward through the air, then holds
      // still on the ground while the hips travel over it
      const ph = ((t + i * 0.5) % 1 + 1) % 1;
      const swing = Math.cos(ph * TAU);
      fx = hx + swing * STRIDE * 0.5 * face * r.walkAmt;
      const up = ph > 0.5 ? Math.sin((ph - 0.5) * 2 * Math.PI) : 0;
      fy = FOOT_Y - up * LIFT * r.walkAmt;
      planted = up < 0.05;
    } else {
      // standing: knock-kneed, weight on one side, breathing
      fx = hx + face * (i ? -3 : 2);
      fy = FOOT_Y + Math.sin(r.breathe) * 0.6;
    }
    const knee = ik(hx, hy, fx, fy, TH, SHIN, i ? -1 : 1, 1.3);
    // knees pull inward: he has never once stood straight
    const kin = face * (i ? 2 : -2);
    X.limb(ctx, hx, hy, knee.x + kin, knee.y, 10, 9, legc, legl, '#221d2c');
    X.limb(ctx, knee.x + kin, knee.y, fx, fy - 3, 9, 8, legc, legl, '#221d2c');
    X.knob(ctx, knee.x + kin, knee.y, 4, legc, legl);
    shoe(ctx, fx, fy, face, B);

    /* ------------------------------------------------------------ the arms */
    const sh = SH[i];
    const sx = sh[0] * flip + r.lean * face * 3, sy = sh[1] + r.bobY;
    let tx, ty, hang;
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
      const sw = -Math.cos(ph * TAU) * 7 * r.walkAmt * face;
      tx = sx + sw + (i ? -1 : 1);
      ty = sy + 21 + Math.sin(r.breathe + i) * 0.8;
      hang = Math.PI / 2 + sw * 0.04;
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
    const sq = o.squash || 1;
    // the whole body breathes and takes the recoil; bobY is in sprite units
    r.bobY = (o.ground ? -Math.abs(Math.cos(r.phase * TAU)) * 2 * (r.walkAmt || 0) : 0)
      + Math.sin(r.breathe) * (o.drilling ? 1.2 : 0.5) + r.jolt * 1.5;
    const ox = Math.round((o.x | 0) - (o.drilling ? Math.cos(o.aim) * r.recoil * 2 : 0));
    const oy = Math.round((o.y | 0) - LIFT_Y - (o.drilling ? Math.sin(o.aim) * r.recoil : 0));

    ctx.save();
    ctx.translate(ox, oy);
    if (sq !== 1) ctx.scale(sq, 1 / sq);
    ctx.save();
    ctx.scale(0.5, 0.5);
    const grip = o.grip ? { x: (o.grip.x - ox) * 2 * (o.flip ? -1 : 1), y: (o.grip.y - oy) * 2 } : null;
    void LIFT_Y;
    const oo = {
      flip: o.flip, drilling: o.drilling, twoHand: o.twoHand, aim: o.flip ? Math.PI - o.aim : o.aim,
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

  PD.rig = { make, step, hit, grab, draw, ik, SH, HIP, FOOT_Y, LIFT_Y };
})(window.PD);
