/* THE CROWD, WHO PLAY THE GAME TOO.
   The people in the market used to walk to a random point, stop, and walk
   to another random point. That is a screensaver of people. These have
   somewhere to be: they go to a shop and look in the window and buy
   something and walk off swinging the bag; they sit on the bench until they
   fall asleep on it; they meet somebody and stand and talk; they dance when
   the music is good; they jump up and down for no reason, which is the
   single most player-like thing a person in a game can do; and when you walk
   past they notice, and some of them wave, and if you jump they jump back.

   Every one of them has a username over their head and a level next to it,
   and what they say is what people say in games.

   And they BOUNCE. Every one of them is drawn through `bouncy()`: squashed on
   landing, stretched in the air, breathing when they stand still, rocking
   when they waddle -- scaled about the feet, so nobody ever leaves the
   floor they are standing on unless they meant to. */
(function (PD) {
  'use strict';

  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const AH = PD.arthome;

  // the frame numbers, in words (see THE CAST in arthome.js)
  const FR = { idle: 0, walkA: 1, walkB: 2, talk: 3, wink: 4, blink: 5, cheer: 6, sad: 7, angry: 8,
    shock: 9, laugh: 10, sleep: 11 };

  const NAMES = ['mochi_mochi', 'xXbeanXx', 'birch.exe', 'gloopy', 'k0rv0', 'bigbruno', 'sal_notary',
    'vesperino', 'orbit42', 'pipsqueak', 'baobao', 'wobblywob', 'unit_12', 'jarhead', 'petepot',
    'sunny_d', 'lampy', 'duckyduck', 'the_set', 'drillqueen', 'ore_n_more', 'moonboi', 'nova_bean',
    'slotgoblin', 'tenInARow', 'zorb_os', 'cheesethief', 'lil_crater', 'coreBreaker', 'afk_again'];
  const SOLO = ['anyone selling ore?', 'lol', 'gg', 'brb', 'wts hat 5k', 'wtb lungs', 'how do i get up there',
    'this place is so cute', 'who wants to duel', 'o/', 'lmao', 'rip my wallet', 'first time here!!',
    'casino is rigged', 'just lost 50k', 'hi!!', ':3', 'pog', 'where is the fence', 'need 2k pls',
    'nice', 'omg the noodles', 'afk 5 min', 'free hugs', 'does anyone know a good planet', 'uwu',
    'selling gems cheap', 'lf group for the core', 'who is chum', 'i love this song'];
  const PAIRS = [
    ['hey', 'hi!'], ['wts ore', 'how much'], ['nice hat', 'ty :3'], ['casino is rigged', 'lol true'],
    ['brb', 'kk'], ['wanna duel', 'no lol'], ['where is the fence', 'down the market'],
    ['noodles?', 'always'], ['what lvl r u', '40 u?'], ['did u see chum', 'dont say his name'],
    ['lend me 5k', 'no'], ['gg last run', 'gg'], ['that hat tho', 'i know right'], ['trade?', 'what u got']];
  const HELLO = ['hi!', 'o/', 'hey new guy', 'nice suit', 'is that the ten-in-a-row guy', 'hii', 'welcome!',
    'yo', ':D', 'u owe chum too?'];
  const BOUGHT = ['ty!', 'finally', 'bought it', 'worth it', 'yesss', 'my wallet...', 'so shiny', 'nom'];

  /* ---------------------------------------------------------- drawing */

  /* Draw a sprite squashed and stretched about its own feet. sx and sy are
     the scales; tilt is a rock, in radians, for waddling. */
  function bouncy(ctx, K, frame, x, y, flip, sx, sy, tilt) {
    const s = AH.S[K.key];
    if (!s) return;
    const cv = s.frames[frame % s.frames.length];
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (tilt) ctx.rotate(tilt);
    ctx.scale(flip ? -(sx || 1) : (sx || 1), sy || 1);
    ctx.drawImage(cv, -s.ox, -s.oy, cv.width / (s.hd || 1), cv.height / (s.hd || 1));
    ctx.restore();
  }

  /* The little pictures that pop over a head. Drawn at world size, in a few
     blocks each, with an overshoot on the way in. */
  function emote(ctx, kind, x, y, k, t) {
    const e = k >= 1 ? 1 : 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(e, e);
    const bob = Math.sin(t * 6) * 0.6;
    if (kind === 'heart') {
      X.blob(ctx, -2, -2 + bob, 2.4, 2.4, '#ff5a8a'); X.blob(ctx, 2, -2 + bob, 2.4, 2.4, '#ff5a8a');
      X.poly(ctx, [[-4.4, -1.5 + bob], [4.4, -1.5 + bob], [0, 3.5 + bob]], '#ff5a8a');
      X.rect(ctx, -3, -3 + bob, 1, 1, '#ffffff');
    } else if (kind === '!' || kind === '?') {
      X.plate(ctx, -5, -8 + bob, 10, 11, '#ffffff', null, null, 3);
      F.draw(ctx, kind, 0, -6 + bob, kind === '!' ? '#e8402a' : '#3a5aff', { center: true, shadow: false });
    } else if (kind === 'anger') {
      for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
        X.rect(ctx, dx - 1 + (dx > 0 ? 0 : -1), dy - 1, 3, 1, '#ff3a3a');
        X.rect(ctx, dx - 1, dy - 1 + (dy > 0 ? 0 : -1), 1, 3, '#ff3a3a');
      }
    } else if (kind === 'sweat') {
      X.blob(ctx, 0, 1 + bob, 2, 2.6, '#8ad4ff'); X.poly(ctx, [[-2, 0 + bob], [2, 0 + bob], [0, -4 + bob]], '#8ad4ff');
      X.rect(ctx, -1, 0 + bob, 1, 1, '#ffffff');
    } else if (kind === 'zzz') {
      const f = (t * 0.8) % 1;
      F.draw(ctx, 'Z', 2 + f * 3, -4 - f * 5, '#c9d8ff', { center: true, shadow: '#1a1030' });
      F.draw(ctx, 'z', -3 + f * 2, 1 - f * 3, '#9ab0e8', { center: true, shadow: '#1a1030' });
    } else if (kind === 'note') {
      const f = Math.sin(t * 5);
      X.rect(ctx, 1, -6 + f, 1, 7, '#ffd34d'); X.blob(ctx, -0.5, 1 + f, 2, 1.6, '#ffd34d');
      X.rect(ctx, 1, -6 + f, 3, 1, '#ffd34d'); X.rect(ctx, 3, -5 + f, 1, 2, '#ffd34d');
    } else if (kind === 'coin') {
      const w = Math.abs(Math.cos(t * 7)) * 3 + 0.6;
      X.blob(ctx, 0, bob, w, 3, '#ffd34d'); X.rect(ctx, -0.5, -1 + bob, 1, 2, '#c8901e');
    } else if (kind === 'wave') {
      const r = Math.sin(t * 12) * 0.5;
      ctx.rotate(r);
      X.blob(ctx, 0, 0, 3, 3.4, '#ffe0b0');
      for (let i = 0; i < 3; i++) X.rect(ctx, -2 + i * 2, -6, 1, 4, '#ffe0b0');
      X.rect(ctx, 3, -2, 2, 1, '#ffe0b0');
    } else if (kind === 'sparkle') {
      const f = (Math.sin(t * 8) + 1) / 2;
      X.rect(ctx, -0.5, -4 - f, 1, 8 + f * 2, '#ffffff'); X.rect(ctx, -4 - f, -0.5, 8 + f * 2, 1, '#ffffff');
      X.rect(ctx, -1, -1, 2, 2, '#ffd34d');
    } else if (kind === 'cry') {
      X.blob(ctx, -3, 1 + ((t * 3) % 2), 1.3, 1.8, '#8ad4ff'); X.blob(ctx, 3, 2 + ((t * 3 + 1) % 2), 1.3, 1.8, '#8ad4ff');
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------- the world */

  function make(cfg) {
    const W = { cfg, agents: [], t: 0, ev: [] };
    let n = 0;
    for (let d = 0; d < cfg.decks.length; d++) {
      for (let i = 0; i < cfg.decks[d]; i++, n++) {
        const k = (n * 7 + 3) % AH.KIN.length;
        W.agents.push({
          id: n, deck: d, k,
          x: 60 + (cfg.w - 140) * ((i + 0.5) / cfg.decks[d]) + (U.hash2(d * 31 + i, 5) - 0.5) * 40,
          name: NAMES[n % NAMES.length] + (n >= NAMES.length ? (n % 9 + 1) : ''),
          lvl: 3 + Math.floor(U.hash2(n, 3) * 60),
          dir: U.hash2(n, 7) > 0.5 ? 1 : -1, sp: 16 + U.hash2(n, 11) * 16,
          ph: U.hash2(n, 19) * U.TAU, plan: [], cur: null, st: 0,
          vy: 0, jy: 0, land: 0, bag: null, bagT: 0, food: 0,
          frame: 0, exp: null, expT: 0, em: null, emT: 0, emK: 0,
          say: null, sayT: 0, hiT: U.rand(2, 12), think: U.rand(0.2, 3)
        });
      }
    }
    return W;
  }

  function say(a, text, dur) { a.say = text; a.sayT = dur || 3.2; }
  function pop(a, kind, dur) { a.em = kind; a.emT = dur || 1.6; a.emK = 0; }
  function busy(a) { return !!a.cur; }

  /* What somebody decides to do next, as a list of little steps. */
  function plan(W, a) {
    const cfg = W.cfg, P = cfg.places ? cfg.places(a.deck) : {};
    const r = Math.random();
    const clampX = (x) => U.clamp(x, 50, cfg.w - 50);
    const shops = P.shops || [], seats = P.seats || [], stalls = P.stalls || [];
    if (r < 0.26 && (shops.length || stalls.length)) {
      // SHOPPING: to a window, have a look, think about it, buy it or don't
      const pool = shops.concat(stalls);
      const s = pool[Math.floor(Math.random() * pool.length)];
      a.plan = [{ do: 'go', x: clampX(s.x + U.rand(-10, 10)) }, { do: 'look', dur: U.rand(1.4, 2.8) }];
      if (Math.random() < 0.7) a.plan.push({ do: 'buy', shop: s });
      else a.plan.push({ do: 'expr', f: FR.sad, dur: 1.1, em: 'sweat', say: Math.random() < 0.5 ? 'too expensive' : null });
    } else if (r < 0.31 && P.casino) {
      // THE CASINO: in through the door, gone a while, out again better or worse off
      a.plan = [{ do: 'go', x: P.casino + U.rand(-4, 4) }, { do: 'vanish', dur: U.rand(8, 20) }];
    } else if (r < 0.37 && seats.length) {
      const s = seats[Math.floor(Math.random() * seats.length)];
      if (!W.agents.some(b => b !== a && b.cur && b.cur.do === 'sit' && Math.abs(b.x - s) < 10)) {
        a.plan = [{ do: 'go', x: s + U.rand(-6, 6) }, { do: 'sit', dur: U.rand(6, 16) }];
      } else a.plan = [{ do: 'go', x: clampX(a.x + U.rand(-120, 120)) }];
    } else if (r < 0.46) {
      // CHAT: find somebody near and free, walk up, have a conversation
      const b = W.agents.find(o => o !== a && o.deck === a.deck && !busy(o) && Math.abs(o.x - a.x) < 160);
      if (b) {
        const side = a.x < b.x ? -1 : 1;
        const pr = PAIRS[Math.floor(Math.random() * PAIRS.length)];
        a.plan = [{ do: 'go', x: clampX(b.x + side * 22) }, { do: 'chat', with: b, lines: pr, dur: 5 }];
        b.plan = [{ do: 'wait', dur: 14, hold: a }];
        b.cur = null;
      } else a.plan = [{ do: 'go', x: clampX(a.x + U.rand(-120, 120)) }];
    } else if (r < 0.53) {
      a.plan = [{ do: 'dance', dur: U.rand(3, 6) }];
    } else if (r < 0.59) {
      a.plan = [{ do: 'jumpy', dur: U.rand(1.5, 3.2) }];
    } else if (r < 0.66) {
      const moods = [[FR.laugh, 'note', 'lmao'], [FR.angry, 'anger', 'ugh'], [FR.sad, 'cry', 'rip'],
        [FR.cheer, 'sparkle', 'yay'], [FR.shock, '!', 'WHAT'], [FR.wink, 'heart', ':3']];
      const m = moods[Math.floor(Math.random() * moods.length)];
      a.plan = [{ do: 'expr', f: m[0], dur: 1.8, em: m[1], say: Math.random() < 0.6 ? m[2] : null }];
    } else if (r < 0.7) {
      a.plan = [{ do: 'afk', dur: U.rand(6, 12) }];
    } else if (r < 0.78) {
      a.plan = [{ do: 'wait', dur: U.rand(1.5, 4), say: Math.random() < 0.5 ? SOLO[Math.floor(Math.random() * SOLO.length)] : null }];
    } else {
      a.plan = [{ do: 'go', x: clampX(a.x + U.rand(-220, 220)) }];
    }
  }

  /* One step of whatever they are doing. Returns true when that step is done. */
  function step(W, a, dt, cx) {
    const c = a.cur;
    c.t = (c.t || 0) + dt;
    // somebody standing still to be talked to is animated by the talker
    if (!(c.do === 'wait' && c.hold && c.hold.cur && c.hold.cur.do === 'chat')) a.frame = FR.idle;
    if (c.do === 'go') {
      const d = c.x - a.x;
      if (Math.abs(d) < 2) return true;
      a.dir = Math.sign(d);
      a.x += a.dir * Math.min(Math.abs(d), a.sp * dt);
      a.walking = true;
      return false;
    }
    if (c.do === 'look') {
      if (c.t < 0.2) pop(a, '?', c.dur);
      return c.t > c.dur;
    }
    if (c.do === 'buy') {
      if (!c.done) {
        c.done = 1; pop(a, 'coin', 1.2);
        a.bag = c.shop.col || '#ffd34d'; a.bagT = U.rand(14, 30); a.food = c.shop.food ? 1 : 0;
        if (Math.random() < 0.6) say(a, BOUGHT[Math.floor(Math.random() * BOUGHT.length)], 2.2);
        a.vy = -70; a.land = 0;
        W.ev.push({ kind: 'buy', a });
      }
      a.frame = FR.cheer;
      return c.t > 1;
    }
    if (c.do === 'sit') {
      a.frame = c.t > c.dur * 0.55 ? FR.sleep : (Math.sin(c.t * 0.9 + a.ph) > 0.93 ? FR.blink : FR.idle);
      if (c.t > c.dur * 0.55 && a.em !== 'zzz') pop(a, 'zzz', c.dur);
      a.sitting = true;
      return c.t > c.dur;
    }
    if (c.do === 'chat') {
      const b = c.with;
      a.dir = b.x > a.x ? 1 : -1; b.dir = -a.dir;
      const who = Math.floor(c.t / 1.6) % 2;
      const talker = who === 0 ? a : b;
      if (!c.said || c.said !== Math.floor(c.t / 1.6) + 1) {
        c.said = Math.floor(c.t / 1.6) + 1;
        const line = c.lines[(c.said - 1) % c.lines.length];
        if (c.said <= c.lines.length) say(talker, line, 1.7);
        else if (Math.random() < 0.4) pop(talker, Math.random() < 0.5 ? 'heart' : 'note', 1.2);
      }
      a.frame = talker === a && Math.sin(c.t * 14) > 0 ? FR.talk : FR.idle;
      b.frame = talker === b && Math.sin(c.t * 14) > 0 ? FR.talk : (c.t % 1.6 > 1.2 ? FR.laugh : FR.idle);
      if (c.t > c.dur) { b.plan = []; b.cur = null; if (Math.random() < 0.5) pop(a, 'wave', 1); return true; }
      return false;
    }
    if (c.do === 'dance') {
      a.frame = [FR.cheer, FR.laugh, FR.wink, FR.cheer][Math.floor(c.t * 4) % 4];
      if (a.jy === 0 && Math.floor(c.t * 4) !== c.b) { c.b = Math.floor(c.t * 4); a.vy = -55; }
      a.dir = Math.floor(c.t * 2) % 2 ? 1 : -1;
      if (c.t < 0.1) pop(a, 'note', c.dur);
      return c.t > c.dur;
    }
    if (c.do === 'jumpy') {
      if (a.jy === 0 && a.land < 0.05) a.vy = -110 - Math.random() * 40;
      a.frame = a.jy < -2 ? FR.cheer : FR.idle;
      return c.t > c.dur;
    }
    if (c.do === 'expr') {
      if (c.t < dt * 1.5) { if (c.em) pop(a, c.em, c.dur); if (c.say) say(a, c.say, 1.8); if (c.f === FR.shock || c.f === FR.cheer) a.vy = -60; }
      a.frame = c.f;
      return c.t > c.dur;
    }
    if (c.do === 'vanish') {
      a.hidden = c.t > 0.3 && c.t < c.dur;
      if (c.t >= c.dur) {
        a.hidden = false;
        const won = Math.random() < 0.35;
        a.cur = null;
        a.plan = [{ do: 'expr', f: won ? FR.cheer : (Math.random() < 0.5 ? FR.sad : FR.angry), dur: 2,
          em: won ? 'coin' : (Math.random() < 0.5 ? 'cry' : 'anger'),
          say: won ? ['WON 2K!!', 'jackpot baby', 'up 500 lol'][Math.floor(Math.random() * 3)]
            : ['lost it all', 'never again', 'rigged', 'one more go...'][Math.floor(Math.random() * 4)] },
          { do: 'go', x: U.clamp(a.x + U.rand(-160, 160), 50, W.cfg.w - 50) }];
        return false;
      }
      return false;
    }
    if (c.do === 'afk') {
      a.frame = c.t > 2 ? FR.sleep : FR.blink;
      if (c.t > 2 && a.em !== 'zzz') { pop(a, 'zzz', c.dur); if (Math.random() < 0.5) say(a, 'afk', 2); }
      return c.t > c.dur;
    }
    if (c.do === 'wait') {
      if (c.t < dt * 1.5 && c.say) say(a, c.say, 2.8);
      if (c.hold) { if (!c.hold.cur || c.hold.cur.do !== 'chat') { /* still walking over */ } a.dir = c.hold.x > a.x ? 1 : -1; }
      a.frame = Math.sin(c.t * 1.3 + a.ph) > 0.95 ? FR.blink : FR.idle;
      return c.t > c.dur;
    }
    return true;
  }

  /* ctx: { px, pdeck, jumped, bought } -- what the player did this frame. */
  function update(W, dt, pc) {
    W.t += dt;
    W.ev.length = 0;
    for (const a of W.agents) {
      a.walking = false; a.sitting = false;
      a.sayT = Math.max(0, a.sayT - dt); if (a.sayT <= 0) a.say = null;
      a.emT = Math.max(0, a.emT - dt); a.emK = Math.min(1, a.emK + dt * 5); if (a.emT <= 0) a.em = null;
      a.bagT = Math.max(0, a.bagT - dt); if (a.bagT <= 0) { a.bag = null; a.food = 0; }
      a.hiT -= dt;
      // the player, walking past: a look, a wave, a hello
      if (pc && pc.pdeck === a.deck) {
        const d = pc.px - a.x;
        if (Math.abs(d) < 34 && a.hiT <= 0 && !a.hidden && (!a.cur || a.cur.do === 'wait' || a.cur.do === 'go')) {
          a.hiT = U.rand(18, 40);
          a.cur = { do: 'expr', f: Math.random() < 0.5 ? FR.cheer : FR.talk, dur: 1.4, em: Math.random() < 0.6 ? 'wave' : 'heart',
            say: Math.random() < 0.55 ? HELLO[Math.floor(Math.random() * HELLO.length)] : null };
          a.plan = [];
          a.dir = Math.sign(d) || 1;
        }
        // jump, and the ones close by jump back
        if (pc.jumped && !a.hidden && Math.abs(d) < 70 && Math.random() < 0.45 && a.jy === 0) {
          a.vy = -120; a.dir = Math.sign(d) || 1;
          if (Math.random() < 0.3) say(a, Math.random() < 0.5 ? 'lol' : 'hop hop', 1.4);
        }
        if (pc.bought && Math.abs(d) < 90 && Math.random() < 0.35) { pop(a, Math.random() < 0.5 ? 'sparkle' : '!', 1.3); if (Math.random() < 0.5) say(a, 'nice', 1.4); }
      }
      // the plan
      if (!a.cur) {
        if (a.plan.length) a.cur = a.plan.shift();
        else { a.think -= dt; if (a.think <= 0) { a.think = U.rand(0.4, 2.5); plan(W, a); } }
      }
      if (a.cur && step(W, a, dt)) a.cur = null;
      // the bounce: a little jump physics of their own
      if (a.vy !== 0 || a.jy < 0) {
        a.vy += 420 * dt; a.jy += a.vy * dt;
        if (a.jy >= 0) { a.land = Math.min(1, 0.4 + Math.abs(a.vy) / 300); a.jy = 0; a.vy = 0; }
      }
      a.land = Math.max(0, a.land - dt * 4);
      if (a.walking) {
        const K = AH.KIN[a.k];
        a.stepT = (a.stepT || 0) + dt * (K.motion === 'lumber' ? 3 : 5.5);
      }
    }
  }

  /* How somebody's body is moving this frame: offsets and scales. */
  function body(a, K, t) {
    const m = K.motion || 'walk';
    let dx = 0, dy = a.jy, sx = 1, sy = 1, tilt = 0;
    const st = a.stepT || 0;
    if (a.walking) {
      if (m === 'hop') { const h = Math.abs(Math.sin(st * 1.6)); dy -= h * 5; sy = 1 + (h - 0.5) * 0.14; sx = 2 - sy; }
      else if (m === 'waddle') { tilt = Math.sin(st * 1.8) * 0.12; dy -= Math.abs(Math.sin(st * 1.8)) * 1.5; }
      else if (m === 'float') { dy -= 3 + Math.sin(t * 2 + a.ph) * 2.5; tilt = a.dir * 0.08; }
      else if (m === 'lumber') { const h = Math.abs(Math.sin(st * 1.4)); dy -= h * 1.5; sy = 1 - (1 - h) * 0.07; sx = 1 + (1 - h) * 0.06; }
      else if (m === 'ooze') { const h = Math.sin(st * 2); sx = 1 + h * 0.1; sy = 1 - h * 0.1; }
      else if (m === 'sway') { tilt = Math.sin(st * 1.4) * 0.09; dy -= Math.abs(Math.sin(st * 1.4)) * 2; }
      else if (m === 'roll') { dy -= Math.abs(Math.sin(st * 3)) * 1; }
      else { const h = Math.abs(Math.sin(st * 1.6)); dy -= h * 2.5; sy = 1 + (h - 0.5) * 0.08; sx = 2 - sy; }
    } else {
      // breathing
      const b = Math.sin(t * 2.2 + a.ph) * 0.028;
      sy = 1 + b; sx = 1 - b;
      if (m === 'float') dy -= 3 + Math.sin(t * 1.6 + a.ph) * 2;
      if (m === 'sway') tilt = Math.sin(t * 0.9 + a.ph) * 0.05;
    }
    // in the air: stretched; landing: squashed flat and wide
    if (a.jy < -1) { sy *= 1.12; sx *= 0.9; }
    if (a.land > 0) { const k = a.land; sy *= 1 - k * 0.28; sx *= 1 + k * 0.24; }
    if (a.sitting) { dy += 2; sy *= 0.92; sx *= 1.05; }
    return { dx, dy, sx, sy, tilt };
  }

  function draw(ctx, W, t, cam, deck, ground, dim, vw) {
    ctx.globalAlpha = dim ? 0.5 : 1;
    for (const a of W.agents) {
      if (a.deck !== deck || a.hidden) continue;
      const x = a.x - cam;
      if (x < -40 || x > (vw || 480) + 40) continue;
      const K = AH.KIN[a.k];
      const b = body(a, K, t);
      let fr = a.frame;
      if (a.walking) fr = Math.floor((a.stepT || 0) * 1.6) % 2 ? FR.walkA : FR.walkB;
      else if (fr === FR.idle && Math.sin(t * 1.3 + a.ph * 3) > 0.96) fr = FR.blink;
      // the shadow, smaller the higher they are
      const sh = Math.max(0.35, 1 + (b.dy) / 30);
      ctx.globalAlpha = (dim ? 0.5 : 1) * 0.4;
      X.blob(ctx, x, ground + 1, K.w * 0.4 * sh, 2.5 * sh, '#0a0614');
      ctx.globalAlpha = dim ? 0.5 : 1;
      bouncy(ctx, K, fr, x + b.dx, ground + b.dy, a.dir < 0, b.sx, b.sy, b.tilt);
      // whatever they just bought, swinging off a hand
      if (a.bag) {
        const hx = x + a.dir * K.w * 0.36, hy = ground + b.dy - K.h * 0.3 + Math.sin(t * 6 + a.ph) * (a.walking ? 1.5 : 0.3);
        if (a.food) { X.blob(ctx, hx, hy, 3, 2.4, '#fff6e8'); X.rect(ctx, hx - 3, hy - 1, 6, 1, a.bag); X.rect(ctx, hx + 1, hy - 5, 1, 4, '#8a5a2a'); }
        else { X.rect(ctx, hx - 3, hy - 1, 7, 7, a.bag); X.rect(ctx, hx - 3, hy - 1, 7, 1, '#ffffff'); X.rect(ctx, hx - 1, hy - 4, 3, 1, '#2a2a3a'); X.rect(ctx, hx - 2, hy - 4, 1, 3, '#2a2a3a'); X.rect(ctx, hx + 2, hy - 4, 1, 3, '#2a2a3a'); }
      }
      if (a.em) emote(ctx, a.em, x + b.dx + a.dir * 4, ground + b.dy - K.h * b.sy - 6, a.emK, t + a.ph);
    }
    ctx.globalAlpha = 1;
  }

  /* Screen-sized: usernames with levels over the ones near you, and what
     anybody is saying, in a small chat bubble. `toScreen` maps scene pixels
     to screen pixels. */
  function overlay(ctx, W, t, cam, deck, ground, px, toScreen) {
    // name tags on the three nearest only, and never two on top of each other
    const tagged = W.agents.filter(a => a.deck === deck && !a.hidden && Math.abs(a.x - px) < 70)
      .sort((p, q) => Math.abs(p.x - px) - Math.abs(q.x - px)).slice(0, 3);
    const placed = [];
    for (const a of W.agents) {
      if (a.deck !== deck || a.hidden) continue;
      const K = AH.KIN[a.k];
      let near = tagged.indexOf(a) >= 0;
      if (near) {
        const s0 = toScreen(a.x - cam, 0);
        const w0 = F.width(a.name, 1) + 30;
        if (placed.some(r => Math.abs(r - s0.x) < w0)) near = false;
        else placed.push(s0.x);
      }
      if (!near && !a.say) continue;
      const s = toScreen(a.x - cam, ground + a.jy - K.h - 3);
      if (s.x < -60 || s.x > 540) continue;
      if (near) {
        const tag = a.name, lv = 'LV' + a.lvl;
        const w = F.width(tag, 1) + F.width(lv, 1) + 10;
        ctx.globalAlpha = 0.72;
        X.plate(ctx, s.x - w / 2, s.y - 11, w, 10, '#0a0612', null, null, 3);
        ctx.globalAlpha = 1;
        F.draw(ctx, lv, s.x - w / 2 + 3, s.y - 10, '#7dff9a', { shadow: false });
        F.draw(ctx, tag, s.x - w / 2 + 7 + F.width(lv, 1), s.y - 10, '#ffffff', { shadow: false });
      }
      if (a.say) {
        const k = Math.min(1, (3.2 - a.sayT) * 8);
        const e = k >= 1 ? 1 : 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
        const w = F.width(a.say, 1) + 10;
        const by = s.y - (near ? 26 : 15);
        ctx.save();
        ctx.translate(Math.round(s.x), Math.round(by + 6));
        ctx.scale(e, e);
        ctx.globalAlpha = Math.min(1, a.sayT * 3);
        X.plate(ctx, -w / 2 - 1, -7, w + 2, 13, '#1a1020', null, null, 4);
        X.plate(ctx, -w / 2, -6, w, 11, '#fbf6ee', '#ffffff', '#c8bca8', 4);
        X.poly(ctx, [[-3, 4], [3, 4], [0, 8]], '#fbf6ee');
        if (k >= 1) F.draw(ctx, a.say, 0, -4, '#1a1020', { center: true, shadow: false });
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  PD.crowd = { make, update, draw, overlay, bouncy, emote, body, FR, say, pop };
})(window.PD);
