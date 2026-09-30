/* BRENDA. The rat who lives in your cave, repainted small and very round.

   Once you have given up your cheese she is yours, and she does not stay
   still: she waddles after you, curls into a ball and ROLLS to catch up,
   hops when you jump, does tricks when she is bored, begs, spins, and falls
   asleep if you stand about for too long. Press E by her to PICK HER UP and
   carry her over your head; press it again and she is thrown, squealing, and
   rolls off when she lands.

   She speaks Chinese. The bubble has the words and, under it, what they mean.

   Works on the moon's own rat object; moon.js hands it over each frame. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const PT = PD.paint;
  const HD = 2;
  const INK = 0x1a1024;
  const FUR = [0xbcb2cc, 0xebe4f6, 0x867b9c];
  const PINK = 0xff9ab8, PINKD = 0xd8668a, CREAM = 0xfff4ea;
  const W = 30, H = 26, OX = 15, OY = 24;           // logical sprite, feet at OX, OY

  const LINES = {
    hello: [['\u4f60\u597d!', 'HELLO!'], ['\u5431\u5431!', 'SQUEAK!'], ['\u55e8!', 'HI!']],
    idle: [['\u5976\u916a!', 'CHEESE!'], ['\u6211\u997f\u4e86', 'I AM HUNGRY'], ['\u6211\u662f\u6700\u80d6\u7684', 'I AM THE FATTEST'], ['\u4f60\u6b20\u94b1\u4e86', 'YOU OWE MONEY'], ['\u52a0\u6cb9!', 'YOU CAN DO IT!'], ['\u966a\u6211\u73a9!', 'PLAY WITH ME!'], ['\u597d\u65e0\u804a', 'SO BORED']],
    held: [['\u597d\u9ad8!', 'SO HIGH!'], ['\u62b1\u62b1!', 'HUG!'], ['\u653e\u6211\u4e0b\u6765!', 'PUT ME DOWN!'], ['\u6211\u4f1a\u98de!', 'I CAN FLY!']],
    thrown: [['\u54c7!', 'WAAH!'], ['\u518d\u6765!', 'AGAIN!'], ['\u597d\u73a9!', 'FUN!']],
    roll: [['\u6eda\u6eda\u6eda~', 'ROLL ROLL ROLL'], ['\u7b49\u7b49\u6211!', 'WAIT FOR ME!']],
    sleep: [['\u665a\u5b89', 'GOOD NIGHT']],
    beg: [['\u7ed9\u6211\u5976\u916a', 'GIVE ME CHEESE'], ['\u6211\u5f88\u53ef\u7231', 'I AM VERY CUTE']]
  };

  /* ------------------------------------------------------------ painting */
  const ART = {};
  function eye(B, x, y, closed, happy) {
    if (happy) { B.line(x - 2.5, y + 1, x, y - 1.5, INK, 1.5); B.line(x, y - 1.5, x + 2.5, y + 1, INK, 1.5); return; }
    if (closed) { B.line(x - 2.5, y, x + 2.5, y, INK, 1.5); return; }
    B.ellipse(x, y, 3, 3.4, INK);
    B.disc(x - 1, y - 1.3, 1.2, 0xffffff); B.disc(x + 1.2, y + 1.2, 0.6, 0xffffff);
  }
  function paint(f) {
    const B = PT.buf(W * HD, H * HD);
    const cx = OX * HD, gy = OY * HD;
    const sleep = f === 6, held = f === 5, happy = f === 7, blink = f === 4;
    const sq = f === 1 ? 2 : sleep ? 4 : 0;
    // the tail, a pink curl out of the back
    for (let i = 0; i <= 24; i++) {
      const q = i / 24, a = q * 4.2;
      B.disc(cx - 18 - Math.sin(a) * 7 - q * 4, gy - 10 - q * 12 + Math.cos(a) * 4, 1.8 - q * 0.8, PINK);
    }
    // feet
    const fa = f === 2 ? 3 : f === 3 ? -3 : 0;
    const fy = held ? gy + 3 : gy - 1;
    if (!sleep) for (const [x, d] of [[cx - 8, fa], [cx + 6, -fa]]) B.ellipse(x + d, fy, 4, 2.5, PINK);
    // the body: nearly a ball
    B.ball(cx - 2, gy - 15 + sq, 17, 14 - sq, FUR);
    B.ellipse(cx + 1, gy - 10 + sq, 10, 7 - sq * 0.5, CREAM);
    // the head, big, and a bit forward
    const hx = cx + 7, hy = gy - 24 + sq * 1.5;
    for (const [x, y] of [[hx - 8, hy - 9], [hx + 7, hy - 10]]) { B.disc(x, y, 7, FUR[2]); B.disc(x, y, 6, FUR[0]); B.disc(x + 0.5, y + 0.5, 3.8, PINK); }
    B.ball(hx, hy, 13, 11, FUR);
    B.ellipse(hx + 3, hy + 4, 7, 5, CREAM);
    // face
    eye(B, hx - 3, hy - 1, blink || sleep, happy);
    eye(B, hx + 7, hy - 1, blink || sleep, happy);
    B.ellipse(hx + 3, hy + 3, 2.2, 1.6, PINKD);
    B.disc(hx + 2.4, hy + 2.5, 0.8, 0xffffff);
    if (happy) { B.ellipse(hx + 3, hy + 6.5, 2, 2, 0x8a2a4a); B.ellipse(hx + 3, hy + 7.4, 1.2, 1, PINK); }
    else B.line(hx + 1.5, hy + 5.5, hx + 4.5, hy + 5.5, PINKD, 1);
    for (const x of [hx - 6, hx + 11]) B.ellipse(x, hy + 3.5, 2.6, 1.6, PINK, 0.6);
    for (let k = 0; k < 3; k++) { B.line(hx + 12, hy + 2 + k * 1.5, hx + 18, hy + 1 + k * 2.5, 0x7a7090, 1, 0.8); B.line(hx - 6, hy + 2 + k * 1.5, hx - 12, hy + 1 + k * 2.5, 0x7a7090, 1, 0.8); }
    // little paws: tucked in front, or up in the air when you hold her
    if (held) { B.ellipse(cx - 6, gy - 32, 3, 2.5, PINK); B.ellipse(cx + 18, gy - 33, 3, 2.5, PINK); }
    else if (!sleep) { B.ellipse(cx + 2, gy - 9, 2.6, 2, PINK); B.ellipse(cx + 8, gy - 9, 2.6, 2, PINK); }
    B.rim(0xffffff, -1, -1, 0.35);
    B.outline(INK);
    return B.toCanvas();
  }
  function paintBall() {
    const N = 26 * HD, B = PT.buf(N, N), c = N / 2;
    B.disc(c - 4, c - 18, 6, PINK); B.disc(c + 8, c - 18, 6, PINK);
    B.ball(c, c, 20, 20, FUR);
    B.ellipse(c + 6, c + 8, 9, 6, CREAM);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 3; B.disc(c + Math.cos(a + 2) * 17, c + Math.sin(a + 2) * 17, 1.6, PINK); }
    eye(B, c + 4, c - 4, true); eye(B, c + 12, c - 4, true);
    B.ellipse(c + 9, c + 1, 2, 1.5, PINKD);
    B.rim(0xffffff, -1, -1, 0.35);
    B.outline(INK);
    return B.toCanvas();
  }
  function art(f) { return ART[f] || (ART[f] = f === 'ball' ? paintBall() : paint(f)); }

  /* ------------------------------------------------------------- talking */
  function say(R, kind) {
    const l = U.pick(LINES[kind] || LINES.idle);
    R.zh = l[0]; R.en = l[1]; R.lineT = 2.4;
    A.sfx.tone(1500 + Math.random() * 500, { type: 'square', to: 2400, dur: 0.05, vol: 0.03 });
    A.sfx.tone(1900, { type: 'square', to: 1300, dur: 0.05, vol: 0.03, delay: 0.07 });
  }
  function squeak() { A.sfx.tone(1800 + Math.random() * 600, { type: 'square', to: 2600, dur: 0.04, vol: 0.025 }); }

  /* --------------------------------------------------------------- update
     E: { P, dist(a, b), scene, IN_W } */
  function update(dt, g, R, E) {
    R.t = (R.t || 0) + dt;
    R.mode = R.mode || 'walk';
    R.h = R.h || 0; R.vh = R.vh || 0; R.mt = (R.mt || 0) + dt;
    R.lineT = Math.max(0, (R.lineT || 0) - dt);
    R.squash = U.damp(R.squash || 0, 0, 0.2, dt);
    R.idleT = (R.idleT || 0) + dt;
    const P = E.P;
    if (!R.hi) { R.hi = 1; say(R, 'hello'); }
    if (Math.abs(P.vx) > 10) R.stillT = 0; else R.stillT = (R.stillT || 0) + dt;

    if (R.mode === 'held') {
      R.x = P.x + P.face * 1; R.face = P.face; R.h = 46 + Math.sin(R.t * 8) * 1.5; R.vx = 0;
      if (R.lineT <= 0 && U.chance(dt * 0.5)) say(R, 'held');
      if (U.chance(dt * 2)) squeak();
      return;
    }
    if (R.mode === 'air') {
      R.vh -= 560 * dt; R.h += R.vh * dt; R.x += R.vx * dt; R.spin = (R.spin || 0) + dt * 12;
      if (R.h <= 0) {
        R.h = 0; R.squash = 1; A.sfx.tone(300, { type: 'sine', to: 120, dur: 0.1, vol: 0.06 });
        if (Math.abs(R.vx) > 50) { R.mode = 'roll'; R.mt = 0; say(R, 'roll'); } else { R.mode = 'walk'; R.mt = 0; }
      }
      clampX(R, E);
      return;
    }
    const want = P.x - P.face * 24;
    const d = E.dist(want, R.x);
    // she sleeps if you stand about
    if (R.mode === 'sleep') { if (R.stillT < 0.5 || Math.abs(d) > 40) { R.mode = 'walk'; squeak(); } return; }
    if (R.stillT > 12 && Math.abs(d) < 30 && R.mode === 'walk') { R.mode = 'sleep'; say(R, 'sleep'); return; }
    // too far behind: roll to catch up
    if (Math.abs(d) > 70 && R.mode === 'walk') { R.mode = 'roll'; R.mt = 0; if (U.chance(0.4)) say(R, 'roll'); }
    // you jumped: so does she
    if (P.vy < -120 && R.h <= 0 && Math.abs(d) < 60) { R.vh = 170; R.h = 0.1; R.mode = 'hop'; R.mt = 0; }
    if (R.mode === 'roll') {
      const tv = U.clamp(d * 3.2, -210, 210);
      R.vx = U.damp(R.vx || 0, Math.abs(d) < 20 ? 0 : tv, 0.1, dt);
      R.rollA = (R.rollA || 0) + R.vx * dt / 12;
      if ((Math.abs(d) < 22 && Math.abs(R.vx) < 20) || R.mt > 5) { R.mode = 'walk'; R.mt = 0; R.squash = 0.6; }
    } else if (R.mode === 'hop') {
      R.vh -= 560 * dt; R.h += R.vh * dt;
      R.vx = U.damp(R.vx || 0, U.clamp(d * 2, -80, 80), 0.1, dt);
      if (R.h <= 0) { R.h = 0; R.vh = 0; R.squash = 0.8; R.hops = (R.hops || 0) - 1; if (R.hops > 0) R.vh = 150, R.h = 0.1; else { R.mode = 'walk'; R.mt = 0; } }
    } else if (R.mode === 'spin') {
      R.vx = 0; if (Math.floor(R.mt * 8) !== R.lastSpin) { R.lastSpin = Math.floor(R.mt * 8); R.face = -R.face; }
      if (R.mt > 1.1) { R.mode = 'walk'; R.mt = 0; }
    } else if (R.mode === 'beg') {
      R.vx = 0; R.face = P.x > R.x ? 1 : -1;
      if (R.mt > 1.8) { R.mode = 'walk'; R.mt = 0; }
    } else if (R.mode === 'dash') {
      R.rollA = (R.rollA || 0) + R.vx * dt / 12;
      if (R.mt > 0.9) { R.vx = -R.vx; R.mt = 0; R.dashes = (R.dashes || 0) - 1; if (R.dashes <= 0) R.mode = 'walk'; }
    } else {
      // walking after you
      if (Math.abs(d) > 12) { R.vx = U.damp(R.vx || 0, U.clamp(d * 3, -75, 75), 0.14, dt); R.idleT = 0; }
      else R.vx = U.damp(R.vx || 0, 0, 0.3, dt);
      R.hop = Math.abs(R.vx) > 10 ? (R.hop || 0) + dt * 12 : 0;
      // bored: a trick
      if (R.idleT > 3 + (R.tr || 2)) {
        R.idleT = 0; R.tr = U.rand(1, 4); R.mt = 0;
        const k = U.pick(['hop', 'spin', 'beg', 'dash', 'talk', 'hop']);
        if (k === 'hop') { R.mode = 'hop'; R.hops = 2; R.vh = 160; R.h = 0.1; }
        else if (k === 'spin') { R.mode = 'spin'; say(R, 'idle'); }
        else if (k === 'beg') { R.mode = 'beg'; say(R, 'beg'); }
        else if (k === 'dash') { R.mode = 'dash'; R.dashes = 2; R.vx = (U.chance(0.5) ? 1 : -1) * 90; say(R, 'roll'); }
        else say(R, 'idle');
      }
    }
    if (Math.abs(R.vx) > 4 && R.mode !== 'spin') R.face = R.vx > 0 ? 1 : -1;
    R.x += (R.vx || 0) * dt;
    clampX(R, E);
  }
  function clampX(R, E) { if (E.scene === 'in') R.x = U.clamp(R.x, 10, E.IN_W - 10); }

  function toggleHold(g, R, E) {
    if (R.mode === 'held') {
      R.mode = 'air'; R.vh = 190; R.vx = E.P.face * 130; R.h = 46; R.mt = 0;
      say(R, 'thrown');
      A.sfx.tone(500, { type: 'triangle', to: 1400, dur: 0.25, vol: 0.07 });
    } else {
      R.mode = 'held'; R.mt = 0;
      say(R, 'held');
      A.sfx.tone(900, { type: 'triangle', to: 1600, dur: 0.12, vol: 0.06 });
    }
  }
  function held(R) { return R.mode === 'held'; }

  /* ----------------------------------------------------------------- draw
     At the rat's feet on the ground. */
  function draw(ctx, g, R, t, pet) {
    const mode = pet ? (R.mode || 'walk') : 'cheese';
    ctx.save();
    ctx.translate(0, -Math.round(R.h || 0));
    const sq = 1 + (R.squash || 0) * 0.25;
    if (mode === 'roll' || mode === 'dash' || (mode === 'air' && Math.abs(R.vx || 0) > 50)) {
      const cv = art('ball');
      ctx.translate(0, -12);
      ctx.rotate(mode === 'air' ? (R.spin || 0) : (R.rollA || 0));
      ctx.drawImage(cv, -13, -13, 26, 26);
    } else {
      let f = 0;
      if (mode === 'held') f = 5;
      else if (mode === 'sleep') f = 6;
      else if (mode === 'beg' || mode === 'hop' || R.lineT > 1.6) f = 7;
      else if (Math.abs(R.vx || 0) > 10) f = 2 + (Math.floor((R.hop || 0) * 0.8) % 2);
      else if (mode === 'cheese') f = Math.sin(t * 9) > 0.3 ? 1 : 0;
      else f = Math.sin(t * 0.7 + 1) > 0.97 ? 4 : (Math.sin(t * 3) > 0 ? 0 : 1);
      const bob = f >= 2 && f <= 3 ? -Math.abs(Math.sin((R.hop || 0) * 1.6)) * 2 : 0;
      ctx.translate(0, bob);
      ctx.scale(((R.face || 1) < 0 ? -1 : 1) * sq, 1 / sq);
      if (mode === 'held') ctx.rotate(Math.sin(t * 9) * 0.12);
      ctx.drawImage(art(f), -OX, -OY, W, H);
    }
    ctx.restore();
    // Zzz
    if (mode === 'sleep') for (let k = 0; k < 3; k++) { const q = (t * 0.5 + k / 3) % 1; ctx.globalAlpha = 1 - q; F.draw(ctx, 'Z', 8 + q * 8, -22 - q * 14, '#c8d0ff', { shadow: '#1a1024' }); ctx.globalAlpha = 1; }
    // what she is saying
    if (pet && R.lineT > 0 && R.zh) bubble(ctx, R.zh, R.en, 0, -Math.round(R.h || 0) - 30, Math.min(1, R.lineT * 3));
  }
  const ZH = '8px "WenQuanYi Zen Hei","Noto Sans CJK SC","Noto Sans SC","PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif';
  function bubble(ctx, zh, en, x, y, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = ZH;
    const zw = Math.ceil(ctx.measureText(zh).width), ew = F.width(en, 1);
    const w = Math.max(zw, ew) + 10, h = 23;
    const bx = Math.round(x - w / 2), by = Math.round(y - h);
    X.rect(ctx, bx - 1, by - 1, w + 2, h + 2, '#1a1024');
    X.rect(ctx, bx, by, w, h, '#ffffff');
    X.poly(ctx, [[x - 3, by + h], [x + 3, by + h], [x - 1, by + h + 5]], '#ffffff');
    X.rect(ctx, x - 4, by + h, 1, 2, '#1a1024');
    ctx.fillStyle = '#d8366a';
    ctx.textBaseline = 'top';
    ctx.fillText(zh, bx + (w - zw) / 2, by + 2);
    F.draw(ctx, en, bx + (w - ew) / 2, by + 13, '#6a6280', { shadow: false });
    ctx.restore();
  }

  PD.rat = { update, draw, toggleHold, held, art, LINES };
})(window.PD);
