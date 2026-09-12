/* MR CHUM, and why any of this is happening.

   You did not decide to eat a galaxy. You lost a bet. The game opens on the
   night you lost it -- one slot machine, one lever, everything you had -- and
   on the gentleman who was standing behind you when the reels stopped.

   MR CHUM is a shark. Not metaphorically: a shark, in a suit, with a cigar and
   a payment plan. He fits a watch to your wrist on the way out of the casino
   and from then on he is in it, as a small blue hologram, explaining every
   part of his business to you in the tone of a man explaining it for the last
   time.

   That gives the game the tutorial it never had. There is no manual and no
   pop-up with a tip in it: there is a shark on your wrist who calls when you
   reach something new, says three sentences about it, and hangs up. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const pix = PD.pix;

  const VW = 480, VH = 270;
  const DEBT0 = 1000000;
  const CUT = 0.2;                      // his slice of every sale, until clear

  /* ------------------------------------------------------------------- art
     He is built twice: once in his own colours for the cutscene, where he is
     standing in front of you, and once in hologram blue for the watch. Same
     shapes, two palettes, so the little blue one is recognisably him. */
  const REAL = {
    skin: '#7a8fa8', skinD: '#4a5c74', skinL: '#a8bcd0', belly: '#dfe6ea',
    teeth: '#ffffff', gum: '#8a3f5a', eye: '#0d0a16',
    suit: '#2a2438', suitL: '#453c5c', shirt: '#e8e4d0', tie: '#b02a3a',
    gold: '#ffd34d', cig: '#c9a06a', ember: '#ff7a2a'
  };
  const HOLO = {
    skin: '#3fb8d8', skinD: '#1d6f8c', skinL: '#9fe8ff', belly: '#d8fbff',
    teeth: '#f2ffff', gum: '#2a8aa8', eye: '#04202c',
    suit: '#1b6f8c', suitL: '#2e9ab8', shirt: '#bff2ff', tie: '#7ef9ff',
    gold: '#bff2ff', cig: '#59c8e0', ember: '#eafcff'
  };

  /* A shark bust: long snout, a grin full of triangles, one flat eye, gills,
     a dorsal fin he cannot get a jacket over, and a cigar he never lights
     twice. `mouth` opens it for talking. */
  function buildChum(P, mouth) {
    const p = pix(64, 72);
    // the fin first, so the head overlaps it
    p.spike(40, 0, 18, 14, -1, P.skinD);
    p.spike(40, 2, 13, 11, -1, P.skin);
    // cranium and snout
    p.round(20, 10, 34, 30, 10, P.skin);
    p.round(4, 24, 34, 18, 6, P.skin);
    p.round(6, 26, 26, 11, 5, P.skinL);
    // the underside is pale, the way a shark is
    p.round(6, 36, 40, 10, 4, P.belly);
    // the grin: a dark line with teeth hanging off it
    const my = 36 + (mouth ? 3 : 0);
    p.rect(4, my, 44, mouth ? 7 : 3, P.gum);
    for (let i = 0; i < 11; i++) {
      const tx = 5 + i * 4;
      p.spike(tx, my, 4, 4, 1, P.teeth);
      if (mouth) p.spike(tx + 2, my + 6, 4, 4, -1, P.teeth);
    }
    // the eye: flat, black, entirely without opinion
    p.round(30, 18, 10, 8, 3, P.teeth);
    p.round(32, 19, 6, 6, 2, P.eye);
    p.rect(33, 20, 2, 2, '#ffffff');
    p.rect(28, 15, 14, 2, P.skinD);                  // brow
    // gills
    for (let i = 0; i < 3; i++) p.rect(46 + i * 3, 24, 2, 9, P.skinD);
    // the cigar, wedged in the corner of the grin
    p.rect(0, my - 2, 10, 4, P.cig);
    p.rect(0, my - 2, 3, 4, P.ember);
    // a thick neck to hang the head on, then shoulders, lapels, shirt, tie,
    // and a chain he is very pleased with
    p.rect(24, 42, 22, 12, P.skinD);
    p.round(2, 52, 60, 20, 7, P.suit);
    p.round(24, 50, 16, 12, 4, P.shirt);
    p.line(24, 50, 16, 68, P.suitL);
    p.line(40, 50, 50, 68, P.suitL);
    p.rect(29, 54, 6, 4, P.tie);
    p.rect(30, 58, 4, 12, P.tie);
    for (let i = 0; i < 7; i++) p.set(18 + i * 3, 58 + Math.abs(3 - i), P.gold);
    p.outline('#0a0614');
    return p.toCanvas();
  }

  let art = null;
  function ensureArt() {
    if (art) return art;
    art = {
      real: [buildChum(REAL, 0), buildChum(REAL, 1)],
      holo: [buildChum(HOLO, 0), buildChum(HOLO, 1)]
    };
    return art;
  }

  /* ------------------------------------------------------------- the lessons
     One entry per thing he has to explain. `once` ids are written into
     save.seen, so he never says the same thing twice. */
  const LESSONS = {
    welcome: ['THIS ROCK IS YOURS NOW. I PAID FOR IT.',
      'THE HOUSE HAS A COMPUTER. THE SAUCER GOES TO PLANETS.',
      'WALK WITH A AND D. PRESS E AT THINGS.'],
    chart: ['EVERY DOT IS A WORLD AND EVERY WORLD IS MONEY.',
      'START AT THE TOP AND WORK DOWN. OR DO NOT. I GET PAID EITHER WAY.'],
    travel: ['NOW YOU FLY IT. ROCKS DO NOT MOVE OUT OF YOUR WAY.',
      'HOLD THE POINTER OR USE THE STICK. EVERY DENT COMES OFF YOUR HULL.'],
    dig: ['HOLD TO DRILL. THE BIT EATS WHATEVER IT TOUCHES.',
      'AIR IS THE BLUE ONE. WHEN IT RUNS OUT, SO DO YOU.',
      'FILL THE SACK. PRESS E AT THE POD TO GO HOME.'],
    sack: ['THE SACK IS HALF FULL AND YOU ARE HALF AS FAST.',
      'HEAVY IS SLOW. SLOW IS DEAD. GO HOME.'],
    air: ['YOUR AIR IS LOW.', 'I AM NOT SENTIMENTAL BUT YOU OWE ME MONEY.'],
    back: ['THE ROCKS ARE IN THE VAULT. THEY ARE NOT MONEY YET.',
      'SIT AT THE COMPUTER. SELL THEM ON ABAY. THAT IS THE WHOLE BUSINESS.'],
    desk: ['THIS IS A HUMAN COMPUTER. YOU STOLE IT. GOOD.',
      'ABAY BUYS YOUR ROCKS AND SELLS YOU BETTER TOOLS.',
      'THE AUCTIONS ARE CHEAPER IF YOU CAN STAND THE WAITING.'],
    sell: ['THERE. THAT IS WHAT A ROCK IS WORTH.',
      'I TAKE A FIFTH UNTIL WE ARE SQUARE. READ THE PAPERWORK.'],
    abay: ['BUY A BIGGER DRILL BEFORE YOU BUY ANYTHING ELSE.',
      'EVERY SHELF IS A DIFFERENT KIND OF DEBT.'],
    auction: ['AN AUCTION IS CHEAPER THAN THE SHOP IF NOBODY ELSE WANTS IT.',
      'SOMEBODY ELSE ALWAYS WANTS IT.'],
    brain: ['THE BRAIN IS THE ONLY THING ON THIS MOON CLEVERER THAN THE RAT.',
      'FEED IT THOTS. IT GROWS YOU NEW HABITS.'],
    core: ['THAT IS THE CORE. BREAK IT AND THE WHOLE WORLD GOES.',
      'THE BOUNTY IS ENORMOUS. DO IT AGAIN.'],
    debt75: ['A QUARTER DOWN. I HAVE STOPPED CIRCLING YOUR HOUSE.'],
    debt50: ['HALF. I TOLD MY MOTHER ABOUT YOU. SHE WAS NOT INTERESTED.'],
    debt25: ['ONE QUARTER LEFT. DO NOT GET CLEVER NOW.'],
    debt0: ['PAID. IN FULL. WE ARE SQUARE.',
      'KEEP THE WATCH. KEEP THE MOON. KEEP EATING PLANETS.',
      'I FIND I HAVE BECOME FOND OF YOU. DO NOT TELL ANYONE.']
  };

  const S = {
    call: null, t: 0, lines: null, line: 0, chars: 0, buzz: 0, queue: []
  };

  /* Ring him through. Lessons only ever play once; `force` is for the debt
     milestones, which want to interrupt. */
  function call(g, id, force) {
    if (!LESSONS[id]) return;
    if (!force && g.save.seen && g.save.seen['chum_' + id]) return;
    if (g.save.seen) g.save.seen['chum_' + id] = 1;
    if (S.call === id) return;
    if (S.call) { S.queue.push(id); return; }
    S.call = id; S.t = 0; S.lines = LESSONS[id]; S.line = 0; S.chars = 0; S.buzz = 1.2;
    A.sfx.tone(760, { type: 'square', to: 1180, dur: 0.07, vol: 0.07 });
    A.sfx.tone(760, { type: 'square', to: 1180, dur: 0.07, vol: 0.07, delay: 0.14 });
    PD.touch.buzz(18);
  }

  function hangUp() {
    S.call = null; S.lines = null; S.t = 0;
    if (S.queue.length) {
      const id = S.queue.shift();
      S.call = id; S.lines = LESSONS[id]; S.line = 0; S.chars = 0; S.t = 0; S.buzz = 0.6;
    }
  }

  function active() { return !!S.call; }

  function update(dt, g) {
    if (!S.call) return;
    S.t += dt;
    S.buzz = Math.max(0, S.buzz - dt);
    const line = S.lines[S.line] || '';
    if (S.chars < line.length) S.chars = Math.min(line.length, S.chars + dt * 52);
    const IN = PD.input;
    const m = IN.mouse;
    const poke = IN.hit('KeyE') || IN.hit('Space') || IN.hit('Enter') || (m.inside && m.leftPressed);
    if (!poke) return;
    if (S.chars < line.length) { S.chars = line.length; return; }   // finish the line first
    S.line++; S.chars = 0;
    A.sfx.click();
    if (S.line >= S.lines.length) hangUp();
  }

  /* The hologram itself: a pane of blue light thrown up out of the watch, with
     scanlines across it, a flicker, and him in the middle of it. */
  function drawHolo(ctx, t, x, y, w, h, mouthOpen) {
    const flick = 0.82 + Math.abs(Math.sin(t * 31)) * 0.1 + (U.chance(0.02) ? -0.3 : 0);
    ctx.globalAlpha = flick;
    // the cone of light out of the watch at the bottom-left corner
    X.poly(ctx, [[x + 8, y + h + 16], [x + 22, y + h + 16], [x + w, y], [x, y]],
      'rgba(63,184,216,0.13)');
    X.plate(ctx, x, y, w, h, 'rgba(10,32,44,0.82)', '#3fb8d8', '#04202c', 4);
    ctx.globalAlpha = 1;

    const a = ensureArt();
    const cv = a.holo[mouthOpen ? 1 : 0];
    ctx.globalAlpha = flick;
    ctx.drawImage(cv, Math.round(x + 5), Math.round(y + h - 66 + Math.sin(t * 2) * 1.5));
    ctx.globalAlpha = 1;

    X.scanlines(ctx, x + 1, y + 1, w - 2, h - 2, 'rgba(126,249,255,0.10)', t * 14, 3);
    // the frame's corner ticks, so it reads as a projection and not a window
    for (const [cx, cy] of [[x, y], [x + w - 6, y], [x, y + h - 6], [x + w - 6, y + h - 6]]) {
      X.rect(ctx, cx, cy, 6, 1, '#7ef9ff'); X.rect(ctx, cx, cy, 1, 6, '#7ef9ff');
    }
  }

  function draw(ctx, g, t) {
    if (!S.call) return;
    /* The chart and the ABAY screen both keep a panel along the bottom edge,
       so on those he projects a little higher and the watch rides up with him. */
    const lift = (g.state === 'starmap' || g.state === 'desk') ? 50 : 0;
    const w = 306, h = 76, x = VW - w - 10, y = VH - h - 12 - lift;
    const line = S.lines[S.line] || '';
    const shown = line.slice(0, Math.floor(S.chars));
    const talking = S.chars < line.length && Math.floor(t * 11) % 2 === 0;
    drawHolo(ctx, t, x, y, w, h, talking);

    F.draw(ctx, 'MR CHUM', x + 74, y + 7, '#7ef9ff', { shadow: '#04202c' });
    X.rect(ctx, x + 74, y + 16, w - 84, 1, '#1d6f8c');
    F.draw(ctx, 'YOUR FRIEND IN FINANCE', x + 74, y + 19, '#2e9ab8', { shadow: false });

    // the line, wrapped by hand at the pane's width
    const words = shown.split(' ');
    let row = '', ry = y + 32;
    for (const wd of words) {
      const test = row ? row + ' ' + wd : wd;
      if (F.width(test, 1) > w - 84 && row) { F.draw(ctx, row, x + 74, ry, '#d8fbff', { shadow: '#04202c' }); row = wd; ry += 10; }
      else row = test;
    }
    if (row) F.draw(ctx, row, x + 74, ry, '#d8fbff', { shadow: '#04202c' });

    // the prompt, once he has finished saying it
    if (S.chars >= line.length) {
      const k = Math.abs(Math.sin(t * 4));
      const more = S.line < S.lines.length - 1;
      F.draw(ctx, more ? 'E / TAP  MORE' : 'E / TAP  HANG UP', x + w - 8, y + h - 12,
        k > 0.4 ? '#7ef9ff' : '#2e9ab8', { right: true, shadow: '#04202c' });
    }
    // and the watch on his wrist, buzzing
    const bz = S.buzz > 0 ? Math.round(U.rand(-2, 2)) : 0;
    X.plate(ctx, x + 2 + bz, y + h + 14, 22, 14, '#2a2438', '#453c5c', '#0a0614', 3);
    X.rect(ctx, x + 6 + bz, y + h + 17, 14, 8, '#0d5a78');
    X.rect(ctx, x + 8 + bz, y + h + 19, 10, 4, '#7ef9ff');
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

  /* =====================================================================
     THE NIGHT YOU LOST IT
     Four beats, each with its own picture and its own lines. Any key moves
     it on; escape walks out of the whole thing. */
  const IN_S = {
    beat: 0, t: 0, line: 0, chars: 0, reel: [0, 0, 0], spin: 3, chips: [], flash: 0, done: 0
  };
  const SYMS = ['coin', 'ore', 'planet', 'skull', 'star'];

  const BEATS = [
    { dur: 7.5, lines: ['ONE MACHINE. ONE LEVER. EVERYTHING YOU HAD.'] },
    { dur: 5.5, lines: ['THE MACHINE DID NOT WANT IT.', 'SOMEBODY BEHIND YOU DID.'] },
    { dur: 26, lines: [
      'MR CHUM: YOU OWE ME ONE MILLION.',
      'MR CHUM: YOU HAVE NO MONEY. NO SHIP. NO IDEAS.',
      'MR CHUM: SO I BOUGHT YOU A SHIP. AND A DRILL. AND A MOON.',
      'MR CHUM: GO AND EAT A PLANET. BRING ME MY MONEY.',
      'MR CHUM: THIS IS A WATCH. I AM IN IT NOW.',
      'MR CHUM: THAT IS THE ARRANGEMENT. NOD.'
    ] },
    { dur: 6, lines: ['AND THAT IS HOW YOU CAME TO OWN A MOON.'] }
  ];

  function enterIntro(g) {
    ensureArt();
    IN_S.beat = 0; IN_S.t = 0; IN_S.line = 0; IN_S.chars = 0;
    IN_S.reel = [0, 0, 0]; IN_S.spin = 3.2; IN_S.chips.length = 0; IN_S.flash = 0;
    IN_S.done = 0;
    g.state = 'intro';
    A.sfx.tone(180, { type: 'square', to: 90, dur: 0.5, vol: 0.1 });
  }

  function nextBeat(g) {
    IN_S.beat++; IN_S.t = 0; IN_S.line = 0; IN_S.chars = 0;
    if (IN_S.beat === 1) {
      IN_S.flash = 1;
      A.sfx.deny();
      for (let i = 0; i < 40; i++) {
        IN_S.chips.push({ x: 240 + U.rand(-40, 40), y: 190, vx: U.rand(-180, 180), vy: U.rand(-220, -60),
          a: U.rand(0, U.TAU), va: U.rand(-8, 8), life: U.rand(1.2, 2.6) });
      }
    }
    if (IN_S.beat >= BEATS.length) finishIntro(g);
  }

  function finishIntro(g) {
    /* Once is enough. updateIntro keeps running while the iris closes, and
       without this it re-started the wipe every frame -- so it never reached
       its own midpoint and the cutscene never ended. */
    if (IN_S.done) return;
    IN_S.done = 1;
    g.save.seenIntro = 1;
    g.save.debt = DEBT0;
    g.saveGame();
    g.wipeTo(240, 135, '#0a0614', () => {
      g.state = 'home';
      PD.home.enter(g);
      call(g, 'welcome');
    });
  }

  function updateIntro(dt, g) {
    if (IN_S.done) return;
    const IN = PD.input;
    if (IN.hit('Escape')) { finishIntro(g); return; }
    IN_S.t += dt;
    IN_S.flash = Math.max(0, IN_S.flash - dt * 2.2);
    if (IN_S.spin > 0) {
      IN_S.spin -= dt;
      for (let i = 0; i < 3; i++) {
        if (IN_S.spin < i * 0.5) continue;
        IN_S.reel[i] = (IN_S.reel[i] + dt * (34 - i * 6)) % SYMS.length;
      }
      if (IN_S.spin <= 0) IN_S.reel = [3, 3, 3];           // three skulls
    }
    for (let i = IN_S.chips.length - 1; i >= 0; i--) {
      const c = IN_S.chips[i];
      c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 320 * dt; c.a += c.va * dt; c.life -= dt;
      if (c.life <= 0) IN_S.chips.splice(i, 1);
    }

    const b = BEATS[IN_S.beat];
    if (!b) { finishIntro(g); return; }
    const line = b.lines[IN_S.line] || '';
    if (IN_S.chars < line.length) IN_S.chars = Math.min(line.length, IN_S.chars + dt * 46);

    const m = IN.mouse;
    const poke = IN.hit('KeyE') || IN.hit('Space') || IN.hit('Enter') || (m.inside && m.leftPressed);
    if (poke) {
      if (IN_S.chars < line.length) { IN_S.chars = line.length; return; }
      IN_S.line++; IN_S.chars = 0; A.sfx.click();
      if (IN_S.line >= b.lines.length) nextBeat(g);
      return;
    }
    if (IN_S.t > b.dur) nextBeat(g);
  }

  /* ---- the casino: neon, a carpet nobody has ever cleaned, one machine ---- */
  function drawCasino(ctx, g, t) {
    ctx.fillStyle = '#180c22'; ctx.fillRect(0, 0, VW, VH);
    // a wall of dead neon and one live sign
    for (let i = 0; i < 9; i++) {
      const bx = 12 + i * 54, on = Math.sin(t * 3 + i) > -0.3;
      X.rect(ctx, bx, 16, 36, 3, on ? '#ff5fa8' : '#4a1c3a');
      X.rect(ctx, bx, 24, 36, 3, on ? '#7ef9ff' : '#12384a');
    }
    F.draw(ctx, 'THE LUCKY VOID', VW / 2, 36, Math.sin(t * 7) > -0.2 ? '#ffd34d' : '#6a5a1a',
      { center: true, scale: 3, shadow: '#3a0c30' });
    // carpet
    X.rect(ctx, 0, 206, VW, VH - 206, '#4a1230');
    for (let x = 0; x < VW; x += 16) {
      X.rect(ctx, x, 206, 8, VH - 206, '#5c1a3c');
      X.rect(ctx, x + 4, 214, 6, 6, '#7a2450');
    }
    X.rect(ctx, 0, 204, VW, 3, '#2a0a1c');

    /* the machine */
    const mx = 238, my = 84;
    X.plate(ctx, mx - 62, my - 16, 124, 122, '#2a1a3a', '#4a3660', '#120a1c', 6);
    X.plate(ctx, mx - 52, my - 6, 104, 46, '#0d0718', '#3a2a52', '#000000', 4);
    for (let i = 0; i < 3; i++) {
      const rx = mx - 46 + i * 32;
      X.rect(ctx, rx, my, 28, 34, '#e8e4d0');
      X.rect(ctx, rx, my, 28, 2, '#8e8874');
      const idx = Math.floor(IN_S.reel[i]) % SYMS.length;
      const blur = IN_S.spin > i * 0.5;
      if (blur) {
        for (let k = -1; k <= 1; k++) {
          ctx.globalAlpha = k ? 0.3 : 0.8;
          PD.glyph.draw(ctx, SYMS[(idx + k + SYMS.length) % SYMS.length], rx + 7, my + 10 + k * 12, '#3a2a52', '#8a7ab0');
        }
        ctx.globalAlpha = 1;
      } else {
        PD.glyph.draw(ctx, SYMS[idx], rx + 7, my + 10, idx === 3 ? '#c22a4a' : '#3a2a52', '#8a7ab0');
      }
    }
    // the payline, and the lever he should never have pulled
    X.rect(ctx, mx - 52, my + 16, 104, 1, IN_S.spin <= 0 ? '#ff5a4d' : '#8a2f4a');
    const lever = IN_S.spin > 2.6 ? 16 : 0;
    X.line(ctx, mx + 66, my + 40 + lever, mx + 66, my + 10 + lever, '#8a7ab0', 3);
    X.blob(ctx, mx + 66, my + 8 + lever, 6, 6, '#c22a4a');
    F.draw(ctx, 'INSERT EVERYTHING', mx, my + 46, '#8a7ab0', { center: true, shadow: false });
    // the payout tray, empty
    X.plate(ctx, mx - 40, my + 62, 80, 22, '#120a1c', '#3a2a52', '#000000', 3);
    if (IN_S.beat >= 1) F.draw(ctx, 'NO', mx, my + 68, '#ff5a4d', { center: true, scale: 2, shadow: '#3a0c30' });

    // our man, at the lever, in trouble
    const al = PD.art.sprites.alien;
    const K = 1.2, bob = Math.sin(t * 2.4) * 2;
    const ax = mx + 104, ay = 206 - (al.h - al.oy) * K + bob;
    ctx.drawImage(al.frames[Math.floor(t * 6) % 4], 0, 0, al.frames[0].width, al.frames[0].height,
      Math.round(ax - al.ox * K), Math.round(ay - al.oy * K), Math.round(al.w * K), Math.round(al.h * K));

    for (const c of IN_S.chips) {
      ctx.save();
      ctx.translate(c.x | 0, c.y | 0); ctx.rotate(c.a);
      X.blob(ctx, 0, 0, 5, 5, '#0a0614');
      X.blob(ctx, 0, 0, 4, 4, '#ffd34d');
      X.blob(ctx, 0, 0, 2, 2, '#e8a02a');
      ctx.restore();
    }
  }

  /* ---- the number, and the shadow that falls across it ---- */
  function drawDebtCard(ctx, g, t) {
    drawCasino(ctx, g, t);
    ctx.fillStyle = 'rgba(6,3,14,0.88)'; ctx.fillRect(0, 0, VW, VH);
    const f = U.clamp(IN_S.t / 1.6, 0, 1);
    const n = Math.round(DEBT0 * f * f);
    /* A receipt to put the number on, so the slot machine behind it does not
       read through the zeroes. */
    X.plate(ctx, 40, 60, VW - 80, 82, 'rgba(4,2,10,0.96)', '#b02a3a', '#000000', 5);
    F.draw(ctx, 'YOU OWE', VW / 2, 74, '#8a7ab0', { center: true, scale: 2, shadow: '#0a0614' });
    F.draw(ctx, '$' + n.toLocaleString(), VW / 2, 98, f >= 1 && Math.sin(t * 8) > 0 ? '#ff5a4d' : '#ffd34d',
      { center: true, scale: 5, shadow: '#3a0c30' });
    if (f >= 1) {
      // his shadow, arriving
      const s = U.clamp((IN_S.t - 1.8) / 1.4, 0, 1);
      ctx.globalAlpha = s * 0.85;
      X.poly(ctx, [[VW / 2 - 150 * s, VH], [VW / 2 + 150 * s, VH],
        [VW / 2 + 90 * s, VH - 150 * s], [VW / 2 - 90 * s, VH - 150 * s]], '#05020c');
      if (s > 0.5) {
        const a = ensureArt();
        ctx.globalAlpha = (s - 0.5) * 2;
        ctx.save(); ctx.translate(VW / 2 - 32, VH - 60 - (s - 0.5) * 40);
        ctx.filter = 'none';
        ctx.drawImage(a.real[0], 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---- the deal: he is in the room and he is very close ---- */
  function drawDeal(ctx, g, t) {
    ctx.fillStyle = '#0d0718'; ctx.fillRect(0, 0, VW, VH);
    // an alley behind him, one bulb
    for (let i = 0; i < 5; i++) X.rect(ctx, 20 + i * 100, 0, 60, VH, '#120a1c');
    X.blob(ctx, 86, 22, 40, 34, 'rgba(255,211,77,0.08)');
    X.rect(ctx, 82, 6, 8, 12, '#3a2a52');
    X.blob(ctx, 86, 20, 5, 5, '#ffe9a8');
    X.rect(ctx, 0, 214, VW, VH - 214, '#1a1024');
    X.rect(ctx, 0, 212, VW, 2, '#2a1c33');

    // our man, small, on the right, being talked at
    const al = PD.art.sprites.alien;
    const K = 1.1, bob = Math.sin(t * 2) * 1.5;
    const ax = 392, ay = 214 - (al.h - al.oy) * K + bob;
    ctx.drawImage(al.frames[Math.floor(t * 5) % 4], 0, 0, al.frames[0].width, al.frames[0].height,
      Math.round(ax - al.ox * K), Math.round(ay - al.oy * K), Math.round(al.w * K), Math.round(al.h * K));
    // the watch goes on at the fifth line
    if (IN_S.line >= 4) {
      X.plate(ctx, ax - 22, ay - 26, 14, 10, '#2a2438', '#453c5c', '#0a0614', 2);
      X.rect(ctx, ax - 19, ay - 24, 8, 6, Math.sin(t * 6) > 0 ? '#7ef9ff' : '#0d5a78');
    }

    // MR CHUM, in the flesh, at three times the size of you
    const a = ensureArt();
    const talk = IN_S.chars < (BEATS[2].lines[IN_S.line] || '').length && Math.floor(t * 10) % 2 === 0;
    const lean = Math.sin(t * 1.3) * 3;
    ctx.save();
    ctx.translate(Math.round(58 + lean), Math.round(VH - 198 + Math.sin(t * 1.7) * 2));
    ctx.scale(2, 2);
    ctx.drawImage(a.real[talk ? 1 : 0], 0, 0);
    ctx.restore();
    // the cigar smoke, because of course
    for (let i = 0; i < 3; i++) {
      const f = ((t * 0.5 + i * 0.33) % 1);
      ctx.globalAlpha = (1 - f) * 0.4;
      X.blob(ctx, 56 + lean + Math.sin(f * 6 + i) * 8, VH - 126 - f * 70, 4 + f * 10, 4 + f * 10, '#c9bce8');
      ctx.globalAlpha = 1;
    }
  }

  /* ---- and out, over the moon he now owns ---- */
  function drawDrop(ctx, g, t) {
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, '#0b0720'); grd.addColorStop(1, '#04030d');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 90; i++) {
      const x = (U.hash2(i, 5) * VW) | 0, y = (U.hash2(i, 9) * VH) | 0;
      ctx.globalAlpha = 0.3 + U.hash2(i, 11) * 0.6;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
    if (!drawDrop.moon) drawDrop.moon = PD.arthome.buildPlanet(300, '#8e86a8', 4, 'moon');
    ctx.drawImage(drawDrop.moon, 90, 120);
    // the pod, dropping something off and leaving
    const f = U.clamp(IN_S.t / 4, 0, 1);
    const spr = PD.art.skinFor(g.save.cos).pod;
    const px = U.lerp(VW + 40, 150, Math.min(1, f * 2.2));
    const py = U.lerp(60, 128, Math.min(1, f * 2.2));
    ctx.save(); ctx.translate(px | 0, py | 0); ctx.scale(0.7, 0.7);
    ctx.drawImage(spr.frames[Math.floor(t * 8) % 2], -spr.ox, -spr.oy);
    ctx.restore();
    if (f > 0.5) {
      X.line(ctx, px, py + 12, px, py + 12 + (f - 0.5) * 60, '#c9c9dc', 1);
      const al = PD.art.sprites.alien;
      ctx.drawImage(al.frames[1], 0, 0, al.frames[0].width, al.frames[0].height,
        Math.round(px - al.ox), Math.round(py + 12 + (f - 0.5) * 60 - al.oy * 0.5), al.w, al.h);
    }
  }

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

  function drawIntro(ctx, g, t) {
    if (IN_S.beat === 0) drawCasino(ctx, g, t);
    else if (IN_S.beat === 1) drawDebtCard(ctx, g, t);
    else if (IN_S.beat === 2) drawDeal(ctx, g, t);
    else drawDrop(ctx, g, t);

    if (IN_S.flash > 0) {
      ctx.fillStyle = 'rgba(255,90,77,' + (IN_S.flash * 0.5).toFixed(2) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }

    // the caption plate. Wrapped, and dropped to one scale if the line is
    // long enough that two rows at double size would not fit either.
    const b = BEATS[IN_S.beat];
    if (b) {
      const full = b.lines[IN_S.line] || '';
      const chum = full.indexOf('MR CHUM:') === 0;
      const shown = (chum ? full.slice(9) : full).slice(0, Math.max(0, Math.floor(IN_S.chars) - (chum ? 9 : 0)));
      const CW2 = VW - 76;
      let sc = 2, rows = wrap(shown, CW2, 2);
      if (rows.length > 2) { sc = 1; rows = wrap(shown, CW2, 1); }
      /* A glyph is 7 tall, so a double-size row needs more than 14 to itself
         or the second line climbs into the first. */
      const LH = sc === 2 ? 17 : 9;
      const ph = 14 + rows.length * LH;
      const py = VH - ph - 10;
      X.plate(ctx, 20, py, VW - 40, ph, 'rgba(6,3,14,0.88)', chum ? '#3fb8d8' : '#453c5c', '#000000', 4);
      if (chum) F.draw(ctx, 'MR CHUM', 28, py - 10, '#3fb8d8', { shadow: '#000000' });
      rows.forEach((r, i) => F.draw(ctx, r, VW / 2, py + 7 + i * LH,
        chum ? '#d8fbff' : '#c9bce8', { center: true, scale: sc, shadow: '#000000' }));
      if (Math.floor(IN_S.chars) >= full.length && Math.abs(Math.sin(t * 4)) > 0.4) {
        F.draw(ctx, 'E / TAP', VW - 28, py + ph - 9, '#8a7ab0', { right: true, shadow: '#000000' });
      }
    }
    X.plate(ctx, VW - 62, 4, 56, 13, 'rgba(6,3,14,0.7)', null, null, 3);
    F.draw(ctx, 'ESC  SKIP', VW - 10, 7, 'rgba(178,162,216,0.9)', { right: true, shadow: '#000000' });
  }

  PD.chum = {
    enterIntro, updateIntro, drawIntro,
    call, update, draw, active, takeCut, drawDebt, DEBT0, S, IN_S, LESSONS
  };
})(window.PD);
