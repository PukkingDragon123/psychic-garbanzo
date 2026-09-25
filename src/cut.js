/* CUTSCENES, IN THE ROOM YOU WALK ABOUT IN.
   The night used to end in a slideshow: a painted street going past behind
   a fixed picture of you being dragged, then a painted room seen from the
   carpet. Both of them are ROOMS now, built exactly the way the moon and the
   casino and the market are built -- a floor, a camera that follows you, the
   same zoom, the same characters walking about on the same feet -- except
   that for the length of a cutscene the controls are not yours.

     STREET   a long wet road in the city under the casino. Drax has you by
              the ankle, the big one walks behind, and everybody on the
              pavement turns to watch you go past.
     OFFICE   the room at the top of the building. A window over the city, a
              tank of small fish, a dais, a throne, and a shark in a suit.

   The script for each is a list of lines. A line is narration unless it
   starts with a name, in which case it comes out of that person as a
   bubble. E or a tap moves it on; lines also move on by themselves once
   they have been up long enough to read; escape skips the lot. */
(function (PD) {
  'use strict';

  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const AH = PD.arthome;
  const VW = 480, VH = 270;

  const C = {
    on: 0, id: null, t: 0, line: 0, chars: 0, pop: 0, lineT: 0,
    lines: [], onEnd: null, onSkip: null, ending: 0, flash: 0,
    gx: 0, pose: 'up', fist: 0, walkTo: null, drax: null, bull: null, watch: 0, lid: 1
  };

  function owns(scene) { return scene === 'street' || scene === 'office'; }
  function active() { return !!C.on; }

  /* ------------------------------------------------------------ setup */
  const STREET_W = 1460, OFFICE_W = 480;
  const ROAD = 214;                    // where the street's feet go
  const WALK_Y = 199;                  // the pavement, behind the road
  const FLOOR = 216;                   // the office carpet

  function roomW() { return C.id === 'street' ? STREET_W : OFFICE_W; }
  function bounds() { return C.id === 'street' ? [40, STREET_W - 40] : [24, OFFICE_W - 24]; }
  function floor() { return C.id === 'street' ? ROAD : FLOOR; }
  /* The window sits higher than it does on the moon so there is a city over
     your head and not just a road under your feet. */
  function viewY() { return C.id === 'street' ? 80 : 64; }
  /* What the camera looks at. On the street, a little ahead of the three of
     you; in the office, halfway between you and him, so both are in it. */
  function focusX() {
    const P = PD.home.P;
    return C.id === 'street' ? P.x - 30 : (P.x + 408) / 2;
  }

  /* The pavement: who is on it, where, and with what over their head. */
  const WALKERS = [];
  function buildWalkers() {
    WALKERS.length = 0;
    const L = AH.KIN.length;
    for (let i = 0; i < 16; i++) {
      WALKERS.push({
        x: 150 + i * 76 + Math.round(U.hash2(i, 7) * 26),
        k: (i * 7 + 3) % L,
        um: U.hash2(i, 11) > 0.45 ? ['#ff5a8a', '#38e8ff', '#ffd34d', '#7dff9a', '#b08aff'][i % 5] : null,
        face: U.hash2(i, 13) > 0.5 ? 1 : -1, look: 0, said: 0, ph: U.hash2(i, 17) * 6
      });
    }
  }
  const GAWK = ['OOF', 'NOT AGAIN', 'IS THAT THE TEN-IN-A-ROW MAN', 'DO NOT LOOK',
    'HE OWES CHUM', 'MIND THE PUDDLE', 'POOR GUY', 'THAT WAS MY BIN', 'WOW', 'SHAME'];
  const BUBS = [];                     // what the pavement says, in the world

  /* Shops along the street, the same ones as upstairs in the market --
     Chum owns this block too, and it shows. */
  const STREET_SHOPS = [];
  function buildShops() {
    STREET_SHOPS.length = 0;
    const src = PD.mall.SHOPS.filter(s => s.deck === 1);
    for (let i = 0; i < 9; i++) {
      const s0 = src[i % src.length];
      STREET_SHOPS.push(Object.assign({}, s0, { x: 120 + i * 150, id: null, key: s0.key }));
    }
  }

  function play(g, id, lines, onEnd, onSkip) {
    C.on = 1; C.id = id; C.t = 0; C.line = 0; C.chars = 0; C.pop = 0; C.lineT = 0;
    C.lines = lines.slice(); C.onEnd = onEnd; C.onSkip = onSkip; C.ending = 0;
    C.fist = 0; C.walkTo = null; C.watch = 0; C.flash = 1; C.lid = 1;
    BUBS.length = 0;
    if (id === 'street') {
      buildWalkers(); buildShops();
      C.gx = STREET_W - 170; C.pose = 'dragged';
      C.drax = { x: C.gx - 90, vx: 0, face: -1 };
      C.bull = { x: C.gx + 34, vx: 0, face: -1 };
    } else {
      C.gx = 190; C.pose = 'down';
      C.drax = { x: 318, vx: 0, face: -1, home: 318 };
      C.bull = { x: 156, vx: 0, face: 1 };
    }
    g.state = 'home';
    PD.home.enterCut(g, id, C.gx);
  }

  function finish(g, skipped) {
    if (!C.on) return;
    C.on = 0;
    A.rain(0);
    const fn = skipped ? (C.onSkip || C.onEnd) : C.onEnd;
    C.onEnd = C.onSkip = null;
    if (fn) fn(g);
  }

  /* Who says a line, and what, with the name taken off the front. */
  function parse(line) {
    const m = /^([A-Z ]+): (.*)$/.exec(line || '');
    if (!m) return { who: null, text: line || '' };
    const nm = m[1];
    const who = nm === 'YOU' ? 'you' : (nm === 'DRAX' ? 'drax' : (nm === 'MR CHUM' ? 'chum' : null));
    return who ? { who, name: nm, text: m[2] } : { who: null, text: line };
  }

  /* ------------------------------------------------------------ update */
  function update(dt, g) {
    const IN = PD.input, P = PD.home.P;
    C.t += dt;
    C.pop = Math.min(1, C.pop + dt * 4.5);
    C.flash = Math.max(0, C.flash - dt * 1.4);
    if (IN.hit('esc')) { finish(g, true); return; }

    const cur = C.lines[C.line];
    const full = parse(cur).text;
    if (C.chars < full.length) C.chars = Math.min(full.length, C.chars + dt * 46);
    else C.lineT += dt;
    const m = IN.mouse;
    const poke = IN.hit('KeyE') || IN.hit('space') || IN.hit('enter') || (m.inside && m.leftPressed);
    if (!C.ending && cur !== undefined) {
      const read = Math.max(2.4, full.length * 0.075);
      if (poke && C.chars < full.length) C.chars = full.length;
      else if (poke || C.lineT > read) nextLine(g);
    }

    if (C.id === 'street') updateStreet(dt, g, P);
    else updateOffice(dt, g, P);
    for (let i = BUBS.length - 1; i >= 0; i--) { BUBS[i].t -= dt; if (BUBS[i].t <= 0) BUBS.splice(i, 1); }
  }

  function nextLine(g) {
    C.line++; C.chars = 0; C.pop = 0; C.lineT = 0;
    A.sfx.click();
  }

  /* ---- the street ---- */
  const DRAG_LINES = 6;                // the first six are the walk; the rest is the fist
  function updateStreet(dt, g, P) {
    PD.chum.rainStep(dt);
    const dragging = C.line < DRAG_LINES;
    if (dragging) {
      PD.chum.dragStep(dt, g);
      C.gx = Math.max(260, C.gx - 50 * dt);
      C.drax.x = C.gx - 92; C.bull.x = C.gx + 32;
      C.pose = 'dragged';
    } else {
      /* He stops, hauls you up by the collar, and you ask the question. */
      if (C.pose === 'dragged') {
        C.pose = 'up'; P.face = -1; P.vy = -120; P.y = ROAD - 2;
        A.sfx.thud();
        C.drax.x = C.gx - 34; C.bull.x = C.gx + 46;
      }
      if (C.line >= C.lines.length - 1 && C.chars >= 6) {
        C.fist = Math.min(1, C.fist + dt * 1.8);
        if (C.fist >= 1 && !C.ending) {
          C.ending = 1; C.endT = 0;
          A.sfx.punch(); A.sfx.thud();
        }
      }
      if (C.line >= C.lines.length && !C.ending) { C.ending = 1; C.endT = 0; C.fist = 1; A.sfx.punch(); }
      if (C.ending) {
        C.endT += dt;
        if (C.endT > 0.7) { finish(g, false); return; }
      }
    }
    P.x = C.gx; P.vx = 0;
    if (C.pose === 'up') {
      P.vy += 300 * dt; P.y = Math.min(ROAD, P.y + P.vy * dt);
      if (P.y >= ROAD) { P.y = ROAD; P.vy = 0; }
    } else P.y = ROAD;
    // the pavement watching you go
    for (const w of WALKERS) {
      const d = C.gx - w.x;
      if (Math.abs(d) < 70) {
        w.look = Math.min(1, w.look + dt * 3);
        w.face = d > 0 ? 1 : -1;
        if (!w.said && Math.abs(d) < 40 && U.chance(0.5 * dt * 10)) {
          w.said = 1;
          if (U.chance(0.7)) BUBS.push({ x: w.x, y: WALK_Y - AH.KIN[w.k].h - 4, text: GAWK[(w.k + w.x) % GAWK.length], t: 1.8, max: 1.8 });
        }
      } else w.look = Math.max(0, w.look - dt);
    }
  }

  /* ---- the office ---- */
  function updateOffice(dt, g, P) {
    C.lid = Math.max(0, C.lid - dt / 1.8);
    C.bolt = Math.max(0, (C.bolt || 0) - dt * 2.5);
    if (U.chance(dt * 0.16)) { C.bolt = 1; A.sfx.thunder(true); }
    P.y = FLOOR; P.vy = 0;
    if (C.line >= 1 && C.pose === 'down') {
      C.pose = 'up'; P.face = 1; A.sfx.tone(300, { type: 'triangle', to: 520, dur: 0.2, vol: 0.06 });
      C.walkTo = 250;
    }
    // you walk yourself up the carpet to the foot of the dais
    let vx = 0;
    if (C.walkTo !== null && C.pose === 'up') {
      const d = C.walkTo - P.x;
      if (Math.abs(d) > 2) { vx = Math.sign(d) * 46; P.face = Math.sign(d); }
      else { C.walkTo = null; P.face = 1; }
    }
    P.vx = vx;
    P.x += vx * dt;
    /* PUT THE WATCH ON HIM. Drax comes down off the step, clamps it on, and
       goes back to where he was standing. */
    const dr = C.drax;
    let want = dr.home;
    if (C.line === 6) want = P.x + 20;
    const dd = want - dr.x;
    dr.vx = Math.abs(dd) > 2 ? Math.sign(dd) * 60 : 0;
    dr.x += dr.vx * dt;
    if (dr.vx) dr.face = Math.sign(dr.vx);
    else dr.face = -1;
    if (C.line === 6 && Math.abs(dd) <= 2 && !C.watch) {
      C.watch = 1; C.watchT = 0;
      A.sfx.tone(1400, { type: 'square', to: 300, dur: 0.18, vol: 0.08 }); A.sfx.thud();
    }
    if (C.watch) C.watchT += dt;
    if (C.line >= C.lines.length && !C.ending) { C.ending = 1; C.endT = 0; }
    if (C.ending) {
      C.endT += dt;
      if (C.endT > 1.1) { finish(g, false); return; }
    }
  }

  /* ------------------------------------------------------------ drawing
     Back: everything behind the player. Front: everything in front of him,
     and the weather. Both in scene pixels, inside the zoom buffer. */
  function hidePlayer() { return C.pose !== 'up'; }

  function shakeIn(ctx) {
    const W = PD.chum.WET;
    const sh = C.id === 'street' && W.shake > 0 ? W.shake * W.shake * 5 : 0;
    ctx.save();
    if (sh) ctx.translate(Math.round(U.rand(-sh, sh)), Math.round(U.rand(-sh, sh)));
  }

  function drawBack(ctx, g, t, cam) {
    shakeIn(ctx);
    if (C.id === 'street') streetBack(ctx, g, t, cam);
    else officeBack(ctx, g, t, cam);
    ctx.restore();
  }
  function drawFront(ctx, g, t, cam) {
    shakeIn(ctx);
    if (C.id === 'street') streetFront(ctx, g, t, cam);
    else officeFront(ctx, g, t, cam);
    ctx.restore();
  }

  /* ---- the street, back to front ---- */
  function streetBack(ctx, g, t, cam) {
    // the whole city from the old picture, sliding with the camera
    PD.chum.dragSky(ctx, cam * 0.9, t);

    // the pavement and the kerb
    X.rect(ctx, 0, WALK_Y - 2, VW, 8, '#2a2440');
    X.rect(ctx, 0, WALK_Y - 2, VW, 1, '#4a4260');
    for (let x = ((-cam) % 24 + 24) % 24 - 24; x < VW; x += 24) X.rect(ctx, x, WALK_Y - 1, 1, 6, '#1d1830');
    X.rect(ctx, 0, WALK_Y + 5, VW, 2, '#5a5270');

    // the shops, lit, every one of them open at this hour
    for (const s of STREET_SHOPS) {
      const x = s.x - cam;
      if (x < -60 || x > VW + 60) continue;
      PD.mall.draw(ctx, s, x, WALK_Y, t, cam, C.gx - cam, false, false);
    }
    // between them: a lamp post, a bin, a vending machine
    for (let i = 0; i < 9; i++) {
      const x = 195 + i * 150 - cam;
      if (x < -30 || x > VW + 30) continue;
      if (i % 3 === 0) PD.mall.dress(ctx, 'bin', x, WALK_Y + 1, false);
      else if (i % 3 === 1) vending(ctx, x, WALK_Y, t, i);
      lamp(ctx, x + (i % 3 === 0 ? 14 : -14), WALK_Y + 4, t, i);
    }

    // the people on it
    for (const w of WALKERS) {
      const x = w.x - cam;
      if (x < -30 || x > VW + 30) continue;
      const K = AH.KIN[w.k];
      const mv = PD.home.kinMove ? PD.home.kinMove(K, t + w.ph, false, w.x) : [0, 0];
      ctx.globalAlpha = 0.35; X.blob(ctx, x, WALK_Y + 1, K.w * 0.4, 2, '#05030c'); ctx.globalAlpha = 1;
      const fr = w.look > 0.5 ? (Math.floor(t * 6 + w.ph) % 3 === 0 ? 3 : 0) : (Math.floor(t * 1.2 + w.ph) % 9 === 0 ? 5 : 0);
      AH.blit(ctx, AH.S[K.key], fr, x + mv[0], WALK_Y + mv[1], w.face > 0);
      if (w.um) umbrella(ctx, x + w.face * 3, WALK_Y - K.h - 4, w.um, t + w.ph);
    }

    // the road, wet, holding every sign above it upside down
    X.rect(ctx, 0, WALK_Y + 7, VW, VH - WALK_Y - 7, '#0c0718');
    ctx.globalAlpha = 0.16;
    for (const s of STREET_SHOPS) {
      const x = s.x - cam;
      if (x < -60 || x > VW + 60) continue;
      X.rect(ctx, x - s.w / 2 + 8, WALK_Y + 9, s.w - 16, 2, s.brand);
      for (let k = 0; k < 5; k++) X.rect(ctx, x - 20 + k * 10, WALK_Y + 12, 3, 20 + (k % 3) * 8, s.glow);
    }
    ctx.globalAlpha = 1;
    for (let x = ((-cam) % 44 + 44) % 44 - 44; x < VW; x += 44) X.rect(ctx, x, 232, 24, 3, '#1d1430');
    for (let i = 0; i < 10; i++) {
      const qx = 80 + i * 140 - cam;
      if (qx < -40 || qx > VW + 40) continue;
      ctx.globalAlpha = 0.24;
      X.blob(ctx, qx, 222 + (i % 2) * 10, 24, 3.5, '#3a2a66');
      ctx.globalAlpha = 0.3;
      X.rect(ctx, qx - 6, 221 + (i % 2) * 10, 3, 7, '#ff2f7a');
      X.rect(ctx, qx + 8, 222 + (i % 2) * 10, 2, 5, '#7ef9ff');
      ctx.globalAlpha = 1;
    }

    // the three of you
    if (C.pose === 'dragged') {
      PD.chum.drawTheDragging(ctx, g, t, (C.gx - cam) - 268, ROAD - 206);
    } else {
      PD.chum.drawBull(ctx, C.bull.x - cam, ROAD, t);
      PD.chum.drawDrax(ctx, C.drax.x - cam, ROAD, t);
    }
  }

  function streetFront(ctx, g, t, cam) {
    PD.chum.rainFront(ctx, t);
  }

  function lamp(ctx, x, y, t, i) {
    X.rect(ctx, x - 1, y - 58, 3, 58, '#1a1830');
    X.rect(ctx, x - 1, y - 58, 1, 58, '#3a3450');
    X.rect(ctx, x - 1, y - 60, 12, 3, '#1a1830');
    X.rect(ctx, x + 7, y - 58, 6, 2, '#ffe0a0');
    ctx.globalAlpha = 0.12;
    X.poly(ctx, [[x + 6, y - 56], [x + 14, y - 56], [x + 30, y], [x - 10, y]], '#ffd88a');
    ctx.globalAlpha = 0.25;
    X.blob(ctx, x + 10, y - 56, 7, 4, '#ffd88a');
    ctx.globalAlpha = 1;
    // the rain, lit where it goes through the light
    for (let k = 0; k < 6; k++) {
      const q = ((t * 2.4 + k * 0.17 + i * 0.3) % 1);
      ctx.globalAlpha = 0.5 * (1 - q);
      X.rect(ctx, x + 2 + k * 4 + q * 6, y - 54 + q * 50, 1, 4, '#fff0c0');
    }
    ctx.globalAlpha = 1;
  }

  function vending(ctx, x, y, t, i) {
    const hue = ['#ff5a8a', '#38e8ff', '#ffd34d'][i % 3];
    X.plate(ctx, x - 9, y - 34, 18, 34, '#1a1830', '#3a3450', '#08060e', 2);
    X.rect(ctx, x - 7, y - 32, 14, 18, '#0a0816');
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) X.rect(ctx, x - 6 + c * 5, y - 31 + r * 6, 3, 4, [hue, '#7dff9a', '#ffffff'][(r + c) % 3]);
    X.rect(ctx, x - 7, y - 12, 14, 4, '#08060e');
    X.rect(ctx, x + 4, y - 26, 2, 5, '#ff5a3c');
    ctx.globalAlpha = 0.14 + 0.06 * Math.sin(t * 3 + i);
    X.blob(ctx, x, y - 22, 14, 18, hue);
    ctx.globalAlpha = 1;
  }

  function umbrella(ctx, x, y, col, t) {
    const tilt = Math.sin(t * 0.8) * 1.5;
    X.rect(ctx, x, y, 1, 12, '#2a2a3a');
    X.poly(ctx, [[x - 13 + tilt, y + 2], [x + 14 + tilt, y + 2], [x + 1 + tilt, y - 7]], col);
    X.poly(ctx, [[x - 13 + tilt, y + 2], [x - 4 + tilt, y + 2], [x + 1 + tilt, y - 7]], '#ffffff');
    ctx.globalAlpha = 0.25;
    X.poly(ctx, [[x - 13 + tilt, y + 2], [x - 4 + tilt, y + 2], [x + 1 + tilt, y - 7]], col);
    ctx.globalAlpha = 1;
    for (let k = -2; k <= 2; k++) X.rect(ctx, x + k * 6 + tilt, y + 2, 1, 1, '#1a1a2a');
    // the drops running off the edge of it
    const q = (t * 2) % 1;
    ctx.globalAlpha = 0.6 * (1 - q);
    X.rect(ctx, x - 13 + tilt, y + 3 + q * 8, 1, 2, '#bcd8ff');
    X.rect(ctx, x + 13 + tilt, y + 3 + ((q + 0.5) % 1) * 8, 1, 2, '#bcd8ff');
    ctx.globalAlpha = 1;
  }

  /* ---- THE OFFICE ----
     A room you could walk across in six seconds that cost more than the
     moon you are about to be given. */
  function officeBack(ctx, g, t, cam) {
    const x0 = -cam;
    // the wall: dark wine panels with gold between them
    X.rect(ctx, 0, 0, VW, VH, '#1a070d');
    for (let i = 0; i < 12; i++) {
      const px = x0 + i * 42;
      X.rect(ctx, px, 40, 40, 150, '#2a0f16');
      X.rect(ctx, px + 4, 48, 32, 60, '#34131c');
      X.rect(ctx, px + 4, 116, 32, 64, '#34131c');
      X.rect(ctx, px + 4, 48, 32, 1, '#4a1e2a');
      X.rect(ctx, px + 4, 116, 32, 1, '#4a1e2a');
      X.rect(ctx, px + 40, 40, 2, 150, '#8a6a2a');
    }
    X.rect(ctx, 0, 36, VW, 5, '#8a6a2a'); X.rect(ctx, 0, 36, VW, 1, '#ffd34d');
    X.rect(ctx, 0, 188, VW, 4, '#8a6a2a'); X.rect(ctx, 0, 188, VW, 1, '#ffd34d');
    // the ceiling, coffered
    X.rect(ctx, 0, 0, VW, 36, '#150409');
    for (let i = 0; i < 16; i++) { X.rect(ctx, x0 + i * 32 + 3, 10, 26, 20, '#221016'); X.rect(ctx, x0 + i * 32 + 3, 10, 26, 1, '#6a5220'); }

    /* THE WINDOW. The city he owns, in the rain, and the lightning in it. */
    const wx = x0 + 44, wy = 58, ww = 150, wh = 112;
    X.rect(ctx, wx - 4, wy - 4, ww + 8, wh + 8, '#8a6a2a');
    X.rect(ctx, wx, wy, ww, wh, '#120826');
    const grd = ctx.createLinearGradient(0, wy, 0, wy + wh);
    grd.addColorStop(0, '#1a0a34'); grd.addColorStop(1, '#4a1a44');
    ctx.fillStyle = grd; ctx.fillRect(wx, wy, ww, wh);
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    for (let L = 0; L < 3; L++) {
      for (let i = 0; i < 12; i++) {
        const bx = wx + ((i * 37 + L * 19) % (ww + 20)) - 10;
        const bw = 10 + ((i * 13 + L * 7) % 16);
        const bh = 30 + ((i * 29 + L * 11) % 60) - L * 8;
        X.rect(ctx, bx, wy + wh - bh, bw, bh, ['#140922', '#1d1030', '#2a1943'][L]);
        for (let yy = wy + wh - bh + 4; yy < wy + wh - 3; yy += 6) {
          for (let xx = bx + 2; xx < bx + bw - 2; xx += 4) {
            if (U.hash2(xx | 0, yy | 0) > 0.55) X.rect(ctx, xx, yy, 2, 3, ['#6a5aa0', '#9a86d8', '#ffd34d'][(xx + yy) % 3]);
          }
        }
      }
    }
    if (C.bolt > 0.02) { ctx.globalAlpha = C.bolt * 0.5; X.rect(ctx, wx, wy, ww, wh, '#c8dcff'); ctx.globalAlpha = 1; }
    for (let i = 0; i < 40; i++) {
      const q = ((t * 1.3 + U.hash2(i, 3)) % 1);
      ctx.globalAlpha = 0.35;
      X.rect(ctx, wx + U.hash2(i, 5) * ww, wy + q * wh, 1, 5, '#bcd8ff');
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // the mullions and the gold frame
    X.rect(ctx, wx + ww / 2 - 1, wy, 3, wh, '#8a6a2a');
    X.rect(ctx, wx, wy + wh / 2 - 1, ww, 3, '#8a6a2a');
    ctx.globalAlpha = 0.08; X.poly(ctx, [[wx + 10, wy + wh], [wx + 30, wy + wh], [wx + 70, wy], [wx + 50, wy]], '#ffffff'); ctx.globalAlpha = 1;
    // heavy curtains either side, tied back
    for (const s of [-1, 1]) {
      const cx = s < 0 ? wx - 10 : wx + ww + 10;
      X.poly(ctx, [[cx - 9, 46], [cx + 9, 46], [cx + 5 + s * 4, 130], [cx + 9, 188], [cx - 9, 188], [cx - 5 + s * 4, 130]], '#6a1030');
      X.rect(ctx, cx - 2, 46, 2, 142, '#8a1a40');
      X.rect(ctx, cx - 8, 128, 16, 3, '#ffd34d');
    }
    X.rect(ctx, wx - 22, 44, ww + 44, 4, '#c99a1e');

    /* THE TANK. His lunch, swimming about in it, not knowing. */
    const tx = x0 + 214, ty = 70, tw = 64, th = 96;
    X.rect(ctx, tx - 3, ty - 3, tw + 6, th + 6, '#2a2a3a');
    X.rect(ctx, tx, ty, tw, th, '#0e3a5a');
    X.rect(ctx, tx, ty, tw, 10, '#1a5a7a');
    X.rect(ctx, tx, ty + th - 10, tw, 10, '#c8a060');
    for (let i = 0; i < 4; i++) X.rect(ctx, tx + 6 + i * 16, ty + th - 18, 3, 8 + (i % 2) * 5, '#2a8a4a');
    for (let i = 0; i < 6; i++) {
      const fx = tx + 8 + ((t * (8 + i * 3) + i * 23) % (tw - 16));
      const fy = ty + 18 + i * 11 + Math.sin(t * 2 + i) * 3;
      const dir = Math.floor((t * (8 + i * 3) + i * 23) / (tw - 16)) % 2 ? -1 : 1;
      X.blob(ctx, fx, fy, 3, 2, ['#ffb03d', '#ff5a8a', '#ffd34d'][i % 3]);
      X.poly(ctx, [[fx - dir * 3, fy], [fx - dir * 6, fy - 2], [fx - dir * 6, fy + 2]], ['#ff8a1e', '#c83a6a', '#c8a01e'][i % 3]);
      X.rect(ctx, fx + dir * 1, fy - 1, 1, 1, '#101018');
    }
    for (let i = 0; i < 8; i++) {
      const q = ((t * 0.5 + i * 0.13) % 1);
      X.rect(ctx, tx + 10 + (i * 7) % (tw - 20), ty + th - 12 - q * (th - 20), 1 + (i % 2), 1 + (i % 2), '#9adfff');
    }
    ctx.globalAlpha = 0.12; X.rect(ctx, tx, ty, tw, th, '#7ef9ff'); ctx.globalAlpha = 1;
    X.rect(ctx, tx + 4, ty + 2, 2, th - 4, 'rgba(255,255,255,0.25)');
    X.plate(ctx, tx + 14, ty + th + 6, 36, 9, '#1a0a10', '#8a6a2a', '#0a0408', 2);
    F.draw(ctx, 'LUNCH', tx + 32, ty + th + 7, '#ffd34d', { center: true, shadow: false });

    /* THE DAIS, THE THRONE, AND HIS OWN FACE OVER IT. */
    const dx = x0 + 330;
    for (let i = 0; i < 3; i++) {
      X.rect(ctx, dx - 6 + i * 8, FLOOR - 6 - i * 6, 160 - i * 8, 6, i % 2 ? '#3d1a24' : '#4a212c');
      X.rect(ctx, dx - 6 + i * 8, FLOOR - 6 - i * 6, 160 - i * 8, 1, '#8a6a2a');
    }
    // the portrait: him, larger than life, in gold
    X.rect(ctx, dx + 50, 50, 56, 66, '#c99a1e');
    X.rect(ctx, dx + 53, 53, 50, 60, '#2a1a3a');
    ctx.save(); ctx.beginPath(); ctx.rect(dx + 53, 53, 50, 60); ctx.clip();
    PD.chum.drawChumAt(ctx, dx + 78, 130, 0.72, false, 0);
    ctx.restore();
    X.plate(ctx, dx + 58, 118, 40, 8, '#1a0a10', '#8a6a2a', '#0a0408', 2);
    // the throne behind where he stands
    X.plate(ctx, dx + 54, 128, 48, 70, '#5e2c3c', '#8a4458', '#2a1018', 4);
    for (let i = 0; i < 5; i++) {
      const sx = dx + 56 + i * 9;
      X.poly(ctx, [[sx, 128], [sx + 8, 128], [sx + 4, 118 - (i % 2) * 6]], '#c99a1e');
    }
    // tickers, both saying the same thing
    const tick = Math.sin(t * 4) > -0.3;
    X.plate(ctx, x0 + 404 - 30, 150, 60, 15, '#1a0a10', '#5e2c3c', '#0a0408', 3);
    F.draw(ctx, '$1,000,000', x0 + 404, 154, tick ? '#ff5a4d' : '#6a2020', { center: true, shadow: false });
    // the desk, in front of the throne
    X.plate(ctx, dx + 20, FLOOR - 42, 76, 26, '#4a2a1a', '#6a4028', '#1a0a06', 3);
    X.rect(ctx, dx + 16, FLOOR - 44, 84, 4, '#8a5a3a'); X.rect(ctx, dx + 16, FLOOR - 44, 84, 1, '#c8905a');
    // on it: a lamp, a stack of other people's markers, a bell
    X.rect(ctx, dx + 26, FLOOR - 56, 2, 12, '#8a6a2a'); X.poly(ctx, [[dx + 20, FLOOR - 56], [dx + 34, FLOOR - 56], [dx + 30, FLOOR - 62], [dx + 24, FLOOR - 62]], '#2a8a4a');
    ctx.globalAlpha = 0.2; X.blob(ctx, dx + 27, FLOOR - 50, 14, 8, '#ffe0a0'); ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) X.rect(ctx, dx + 70 + (i % 2), FLOOR - 46 - i * 2, 14, 2, i % 2 ? '#e8e0c8' : '#ffffff');
    X.blob(ctx, dx + 50, FLOOR - 46, 4, 3, '#ffd34d'); X.rect(ctx, dx + 49, FLOOR - 50, 2, 2, '#c99a1e');

    // the vault, set into the far wall, shut
    X.blob(ctx, x0 + 12, 120, 30, 40, '#241018');
    X.ring(ctx, x0 + 12, 120, 28, '#8a6a2a', 2);
    X.blob(ctx, x0 + 16, 120, 6, 6, '#c99a1e');

    // chandeliers
    for (const lx of [118, 300]) {
      const sw = Math.sin(t * 0.7 + lx) * 1.5;
      X.rect(ctx, x0 + lx + sw, 30, 1, 12, '#6a5220');
      X.rect(ctx, x0 + lx - 12 + sw, 42, 25, 3, '#c99a1e');
      for (let k = -2; k <= 2; k++) X.blob(ctx, x0 + lx + k * 5 + sw, 47, 2, 3, '#fff0c0');
      ctx.globalAlpha = 0.12; X.blob(ctx, x0 + lx + sw, 52, 40, 22, '#ffd34d'); ctx.globalAlpha = 1;
    }

    // the floor: marble, and a runner up the middle of it to the dais
    X.rect(ctx, 0, FLOOR, VW, VH - FLOOR, '#2a1a22');
    for (let i = 0; i < 24; i++) X.rect(ctx, x0 + i * 22, FLOOR, 1, VH - FLOOR, '#3a2430');
    X.rect(ctx, 0, FLOOR, VW, 1, '#5a3a48');
    X.rect(ctx, x0 + 60, FLOOR + 1, 272, 10, '#6a1030');
    X.rect(ctx, x0 + 60, FLOOR + 1, 272, 1, '#ffd34d'); X.rect(ctx, x0 + 60, FLOOR + 10, 272, 1, '#c99a1e');
    for (let i = 0; i < 17; i++) X.blob(ctx, x0 + 68 + i * 16, FLOOR + 6, 3, 2, '#8a1a40');

    // a palm in a gold pot and a globe that is really a bar
    PD.mall.dress(ctx, 'palm', x0 + 206, FLOOR, false);
    X.blob(ctx, x0 + 300, FLOOR - 22, 10, 10, '#3a6a8a'); X.blob(ctx, x0 + 297, FLOOR - 25, 5, 4, '#6aa84a');
    X.rect(ctx, x0 + 290, FLOOR - 22, 20, 1, '#c99a1e'); X.rect(ctx, x0 + 299, FLOOR - 12, 2, 12, '#8a6a2a');

    // HIM
    const cur = parse(C.lines[C.line]);
    const talking = cur.who === 'chum' && C.chars < cur.text.length;
    ctx.globalAlpha = 0.4; X.blob(ctx, dx + 78, FLOOR - 18, 30, 4, '#1a0810'); ctx.globalAlpha = 1;
    PD.chum.drawChumAt(ctx, dx + 78, FLOOR - 18, 1, talking, t);
    // and the two who carried you, and the fish-feeder
    const V = AH.KIN.find(k => k.who === 'VESPER');
    if (V) AH.blit(ctx, AH.S[V.key], Math.floor(t * 1.1) % 8 === 0 ? 5 : 0, x0 + 262, FLOOR, true);
  }

  function officeFront(ctx, g, t, cam) {
    const x0 = -cam;
    const sc = 0.82;
    // the big one, blocking the door you came in by
    ctx.save(); ctx.translate(x0 + C.bull.x, FLOOR); ctx.scale(sc, sc);
    PD.chum.drawBull(ctx, 0, 0, t); ctx.restore();
    ctx.save(); ctx.translate(x0 + C.drax.x + (C.drax.vx ? Math.sin(t * 12) * 0.5 : 0), FLOOR - (C.drax.vx ? Math.abs(Math.sin(t * 10)) * 2 : 0)); ctx.scale(sc, sc);
    PD.chum.drawDrax(ctx, 0, 0, t); ctx.restore();
    // the watch going on: a ring of light off your wrist
    if (C.watch && C.watchT < 0.8) {
      const P = PD.home.P;
      ctx.globalAlpha = 1 - C.watchT / 0.8;
      X.ring(ctx, P.x - cam + 6, P.y - 12, 4 + C.watchT * 30, '#7ef9ff', 2);
      ctx.globalAlpha = 1;
    }
    // you, on your back on the carpet, before you get up
    if (C.pose === 'down') downPose(ctx, g, PD.home.P.x - cam, FLOOR, t);
    // a warm vignette
    ctx.globalAlpha = 0.18;
    const vg = ctx.createRadialGradient(VW / 2, 150, 60, VW / 2, 150, 300);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, '#0a0206');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 1;
  }

  /* Lying flat, feet towards the dais, breathing. */
  function downPose(ctx, g, x, y, t) {
    const sk = PD.art.skinFor(g.save.cos), spr = sk.alienCore;
    const cv = spr.frames[0], k = spr.hd || 1;
    ctx.globalAlpha = 0.4; X.blob(ctx, x, y + 1, 16, 3, '#05030c'); ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y - 5 - Math.sin(t * 2) * 0.5));
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(cv, -spr.ox, -spr.oy, cv.width / k, cv.height / k);
    ctx.restore();
  }

  /* ------------------------------------------------------------ overlay
     Screen-sized: bubbles off whoever is talking, narration on a card, the
     pavement's remarks, the fist, and the eyelids. */
  function headOf(who) {
    const P = PD.home.P, cam = PD.home.cam();
    if (who === 'you') return { x: P.x - cam, y: P.y - 34 };
    if (who === 'drax') {
      const k = C.id === 'office' ? 0.82 : 1;
      const dx = C.pose === 'dragged' ? C.gx - 92 : C.drax.x;
      return { x: dx - cam, y: (C.id === 'office' ? FLOOR : ROAD) - 64 * k };
    }
    if (who === 'chum') return { x: 408 - cam, y: FLOOR - 18 - 80 };
    return null;
  }

  function drawOverlay(ctx, g, t) {
    const H = PD.home;
    // the pavement's remarks, small and quick
    for (const b of BUBS) {
      const s = H.toScreen(b.x - H.cam(), b.y);
      const k = Math.min(1, (b.max - b.t) * 6);
      ctx.globalAlpha = Math.min(1, b.t * 3);
      const w = F.width(b.text, 1) + 10;
      X.plate(ctx, s.x - w / 2 - 1, s.y - 15 - 1, w + 2, 13, '#1a1020', null, null, 4);
      X.plate(ctx, s.x - w / 2, s.y - 15, w * k, 11, '#f2ece0', '#ffffff', '#ad9f88', 4);
      if (k >= 1) F.draw(ctx, b.text, s.x, s.y - 13, '#1a1020', { center: true, shadow: false });
      ctx.globalAlpha = 1;
    }

    const cur = C.lines[C.line];
    if (cur !== undefined && !C.ending) {
      const p = parse(cur);
      const shown = p.text.slice(0, Math.floor(C.chars));
      const done = Math.floor(C.chars) >= p.text.length;
      const blink = Math.abs(Math.sin(t * 4)) > 0.4;
      const head = p.who ? headOf(p.who) : null;
      if (head) {
        const s = H.toScreen(head.x, head.y);
        let sc = 2, rows = PD.chum.wrap(shown, 300, 2);
        if (rows.length > 2) { sc = 1; rows = PD.chum.wrap(shown, 300, 1); }
        const box = PD.chum.speech(ctx, {
          cx: U.clamp(s.x, 120, VW - 120), tipX: s.x, ty: Math.max(88, s.y), rows, scale: sc, pop: C.pop, t,
          fill: p.who === 'chum' ? '#f2ece0' : (p.who === 'you' ? '#e8fff0' : '#e8ecf2'),
          light: '#ffffff', dark: '#ad9f88', ink: '#1a1020',
          foot: done ? 'E / TAP' : null, foot2: blink ? '#1a1020' : '#ad9f88'
        });
        if (C.pop >= 1 && box) {
          const nw = F.width(p.name, 1) + 8;
          X.plate(ctx, box.bx + 6, box.by - 7, nw, 11, p.who === 'chum' ? '#c83a3a' : (p.who === 'you' ? '#2a8a5a' : '#5a6a7a'), null, null, 3);
          F.draw(ctx, p.name, box.bx + 10, box.by - 5, '#ffffff', { shadow: '#000000' });
        }
      } else {
        let sc = 2, rows = PD.chum.wrap(shown, VW - 76, 2);
        if (rows.length > 2) { sc = 1; rows = PD.chum.wrap(shown, VW - 76, 1); }
        /* The card goes at the TOP here: the bottom of the frame is where
           the feet are, and the feet are the point of a cutscene in a room. */
        const lh = sc === 2 ? 17 : 10, dh = 16 + (rows.length - 1) * lh + 7 * sc;
        ctx.save(); ctx.translate(0, -(VH - 12 - dh) + 14);
        PD.chum.captionCard(ctx, rows, sc, C.pop, t, done && blink ? 'E / TAP' : null);
        ctx.restore();
      }
    }

    // THE FIST. It arrives very fast and it fills the screen.
    if (C.fist > 0) {
      const k = C.fist;
      const r = 20 + k * k * 280;
      X.blob(ctx, 240, 130, r, r * 0.85, '#8d99a6');
      X.blob(ctx, 240 - r * 0.3, 130 - r * 0.3, r * 0.5, r * 0.4, '#a7b2be');
      for (let i = 0; i < 4; i++) X.rect(ctx, 240 - r * 0.8 + i * r * 0.42, 130 - r * 0.3, r * 0.3, r * 0.5, '#6d7885');
      if (k >= 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, VW, VH); }
    }
    // coming round: white, then the lids
    if (C.id === 'office') {
      if (C.flash > 0) { ctx.globalAlpha = C.flash; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
      const lid = C.lid * (VH / 2);
      if (lid > 0.5) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, VW, lid); ctx.fillRect(0, VH - lid, VW, lid);
      }
      if (C.ending) { ctx.globalAlpha = Math.min(1, C.endT / 1); ctx.fillStyle = '#0a0614'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
    }
    // cinema bars, so it reads as not-your-turn
    X.rect(ctx, 0, 0, VW, 10, '#000000');
    X.rect(ctx, 0, VH - 6, VW, 6, '#000000');
    X.plate(ctx, VW - 62, VH - 20, 56, 13, 'rgba(6,3,14,0.7)', null, null, 3);
    F.draw(ctx, 'ESC  SKIP', VW - 10, VH - 17, 'rgba(178,162,216,0.9)', { right: true, shadow: '#000000' });
  }

  function track() { return C.id === 'street' ? 'city' : 'chum'; }
  function rainy() { return C.on && C.id === 'street'; }

  PD.cut = { owns, active, play, finish, roomW, bounds, floor, viewY, update, drawBack, drawFront,
    drawOverlay, hidePlayer, track, rainy, focusX, C, WALKERS, STREET_W };
})(window.PD);
