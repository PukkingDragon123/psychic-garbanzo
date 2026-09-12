/* THE STOLEN COMPUTER.

   You are not clever with machines. You took this one off a human world along
   with the desk it was bolted to, and you have never really worked out how it
   goes. So: first person, hands on the keys, a beige box humming in your face,
   and a mouse pointer that arrives a moment after you meant it to. Everything
   you will ever own is bought on ABAY, and every rock you dig is listed there.
   The scene is drawn entirely in screen space -- no cameras, no world. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const A = PD.audio;
  const D = PD.data;
  const X = PD.pxd;
  const pix = PD.pix;
  const Gy = () => PD.glyph;

  const VW = 480, VH = 270;

  /* ----------------------------------------------------------- geometry */
  const CX = 20, CY = 2, CW = 440, CH = 202;          // the beige case
  const SX = 40, SY = 14, SW = 400, SH = 168;         // the glass
  const BARY = SY + SH - 12;                          // task bar
  const WX = SX + 4, WY = SY + 10, WW = SW - 8, WH = SH - 22;

  /* ----------------------------------------------------------- palette
     A 1990s human office, seen by something that has never worked in one. */
  const C = {
    caseF: '#cfc4a0', caseL: '#e8dfbe', caseD: '#a19574', caseDD: '#6d6450',
    wall: '#2a2233', wallD: '#1c1626', wallL: '#3a3145',
    glass: '#0a1108', phos: '#9dffb0',
    page: '#e9e5d6', pageD: '#d2ccb6', pageDD: '#b6af98',
    ink: '#241f16', dim: '#6f6752',
    chrome: '#bab4a0', chromeL: '#e2dcc8', chromeD: '#87816e',
    link: '#2f4fb0', red: '#d8382c', ylw: '#f0b028', blu: '#2f6fd0', grn: '#3a9c48',
    win: '#2f4a9c', winD: '#1d2f66',
    wood: '#5a3f2c', woodD: '#3e2a1c', woodL: '#75543a'
  };

  /* ------------------------------------------------------------- assets
     A fat three-fingered mitt, seen from behind, resting on the keys. Built
     at double density so it survives the zoom. */
  const handCache = {};
  function buildHands(P) {
    const key = P.skin;
    if (handCache[key]) return handCache[key];
    const s = P.skin, d = P.skinD, l = P.skinL;
    const NAIL = '#efe6bd', NAILD = '#c9bb8a';
    const frames = [];
    for (let f = 0; f < 3; f++) {
      const p = pix(136, 158);
      /* forearm, running down and out of frame towards you */
      p.round(34, 100, 78, 58, 22, d);
      p.round(28, 112, 90, 46, 20, s);
      p.round(36, 122, 74, 36, 16, d);
      /* the jacket cuff, three sizes too short for the arm inside it */
      p.round(22, 122, 100, 24, 8, '#4a5a3a');
      p.rect(22, 122, 100, 4, '#63744c');
      p.rect(22, 142, 100, 4, '#36432a');
      for (let i = 0; i < 5; i++) p.rect(28 + i * 20, 126, 7, 16, '#3f4c32');
      p.round(30, 118, 12, 10, 4, '#63744c');            // a button, hanging on
      /* wrist, then the back of the hand -- wide, meaty, faceted */
      p.round(30, 78, 72, 38, 15, s);
      p.round(20, 40, 92, 52, 18, s);
      p.round(26, 34, 80, 26, 11, l);
      p.shade(s, d, 1, 1);
      /* three knuckle ridges, each with its own little shadow under it */
      for (let k = 0; k < 3; k++) {
        const kx = 26 + k * 28;
        p.round(kx, 34, 24, 18, 8, l);
        p.round(kx + 3, 36, 18, 8, 4, '#d8f2df');
        p.rect(kx + 2, 52, 20, 3, d);
      }
      /* tendons across the back of the hand */
      for (let k = 0; k < 3; k++) p.rect(32 + k * 28, 58, 3, 26, d);
      /* three fat fingers. The middle one lifts to type; the others drum. */
      const lift = [[0, 0, 0], [0, -12, 0], [-8, 0, -5]][f];
      for (let k = 0; k < 3; k++) {
        const fx = 24 + k * 28, fy = 4 + lift[k];
        p.round(fx, fy + 6, 24, 42, 11, s);              // the finger
        p.round(fx + 3, fy + 10, 17, 20, 8, l);          // lit along the top
        p.rect(fx + 4, fy + 30, 16, 3, d);               // the joint crease
        p.rect(fx + 6, fy + 38, 12, 3, d);
        p.round(fx + 4, fy, 16, 12, 5, NAIL);            // a flat, filthy claw
        p.rect(fx + 5, fy + 2, 14, 6, '#f8f0d0');
        p.rect(fx + 4, fy + 9, 16, 3, NAILD);
        p.set(fx + 7, fy + 4, '#ffffff');
      }
      /* the warts, the veins and one very old scar */
      p.round(40, 66, 10, 8, 4, l); p.round(72, 74, 8, 7, 3, l);
      p.round(58, 90, 7, 6, 3, l);
      p.rect(36, 94, 24, 3, d); p.rect(68, 100, 20, 3, d);
      p.line(32, 56, 56, 46, d); p.line(32, 57, 56, 47, d);
      p.line(33, 58, 57, 48, l);
      p.outline('#140f1e');
      frames.push(p.toCanvas());
    }
    handCache[key] = { frames, w: 68, h: 79 };
    return handCache[key];
  }

  /* ---------------------------------------------------------------- state */
  const S = {
    app: 'home',            // home | abay | mail | setup
    tab: 0,                 // abay: 0 buy, 1 auctions, 2 sell, 3 feedback
    cat: 0,                 // which shelf of BUY IT NOW you are looking at
    auc: [], aucT: 0,
    scroll: 0, scrollTo: 0,
    cx: VW / 2, cy: VH / 2, vx: 0, vy: 0,
    want: null, wantT: 0, fire: false, fireX: 0, fireY: 0,
    press: 0, typeT: 0, hand: 0,
    boot: 0, hum: 0, lock: 0,
    status: 'READY. PROBABLY.',
    coins: [], flash: 0,
    ad: 0, adT: 0, adOn: true,
    icon: -1
  };

  const APPS = [
    { id: 'abay', name: 'ABAY', glyph: 'sell' },
    { id: 'map', name: 'STAR MAP', glyph: 'galaxy' },
    { id: 'mail', name: 'MESSAGES', glyph: 'quest' },
    { id: 'setup', name: 'SETUP', glyph: 'machine' }
  ];

  const GLYPH_OF = {
    drill: 'drill', reach: 'drill', oxygen: 'o2', lung: 'o2', cargo: 'cargo', belly: 'cargo',
    hull: 'hull', ironskin: 'hull', tether: 'belt', thruster: 'speed', dash: 'dash',
    pistol: 'gun', trigger: 'gun', scatter: 'scatter', lance: 'lance', lamp: 'eye',
    magnet: 'weight', scanner: 'scan', crew: 'crew', refine: 'machine', greed: 'coin', warp: 'galaxy'
  };

  /* Adverts. They are for other people. They are always for other people. */
  const ADS = [
    'ZORB SINGLES: WET WORMS IN YOUR SECTOR >>',
    'HOOKED ON A FEELING? BUY THE TAPE. 2 CREDITS.',
    'RAVAGER INSURANCE. WE TAKE 40 PERCENT. OF YOU.',
    'ONE WEIRD TRICK TO CRACK A PLANET. NOVA HATE IT.',
    'KNOWHERE TIMESHARE. IT IS A HEAD. LIVE IN A HEAD.',
    'ARE YOU A TREE? CLICK HERE. WE ARE ALSO A TREE.',
    'LOSE 40KG OF ROCK FAST. ASK ME ABOUT MY SACK.'
  ];

  /* Feedback left on you, by people who have met you. */
  const FEEDBACK = [
    ['gamora_no_relation', 5, 'FAST DELIVERY. SELLER SMELLED OF BURNING. WOULD BUY AGAIN.'],
    ['i_am_groot', 5, 'I AM GROOT.'],
    ['yondu_prime_deals', 1, 'HE STOLE THE ORB OFF ME. I TAUGHT HIM THAT. PROUD. ANGRY.'],
    ['collector_tivan', 4, 'ITEM WAS A ROCK, AS DESCRIBED. I COLLECT ROCKS. NO NOTES.'],
    ['drax_literal', 2, 'HE SAID THE PRICE WAS A STEAL. NOTHING WAS STOLEN. LIAR.'],
    ['rocket_88', 3, 'BOUGHT HIS LEG. SENT ME A DRILL. LEG STILL PENDING.'],
    ['nova_corps_admin', 1, 'YOU ARE ON A LIST. THE LIST IS NOT A GOOD LIST.'],
    ['star_lad_69', 4, 'ASKED IF HE HAD A WALKMAN. HE ATE IT. FOUR STARS FOR EFFORT.'],
    ['ronan_customer_care', 1, 'YOUR PLANET-CRACKING IS DERIVATIVE. I DID IT FIRST.'],
    ['wet_ted', 5, 'GOOD CUSTOMER. BUYS ORGANS. NEVER ASKS WHOSE.']
  ];

  /* Messages. Nobody nice has this address. */
  function mailbox(g) {
    const box = [
      ['MUM', 'ARE YOU EATING. ARE YOU DESTROYING ENOUGH WORLDS. ANSWER ONE.'],
      ['ABAY BILLING', 'YOUR SUBSCRIPTION TO ABAY PRIME RENEWED. YOU NEVER SUBSCRIBED.'],
      ['NOVA CORPS', 'BOUNTY UPDATED: $' + U.fmt(D.bountyFor ? D.bountyFor(g.save) : 0) + '. CONGRATULATIONS?'],
      ['krunk_tools_99', 'DRILL BIT IS NOT UNDER WARRANTY IF USED ON A PLANET.'],
      ['UNKNOWN', D.ORB.lines[0]],
      ['THE SYNDICATE', 'A PLANET IS MISSING. WE ASSUME IT WAS YOU. WELL DONE.']
    ];
    return box;
  }

  /* ---------------------------------------------------------------- enter */
  function enter(g) {
    S.lock = 0.25;
    S.boot = 0;
    S.app = 'home';
    S.scroll = S.scrollTo = 0;
    S.cx = VW / 2; S.cy = 120; S.vx = S.vy = 0;
    S.want = null; S.fire = false;
    S.coins.length = 0;
    S.status = 'READY. PROBABLY.';
    S.cat = 0;
    seedAuctions(g);
    PD.chum.call(g, 'desk');
    A.sfx.tone(90, { type: 'square', to: 190, dur: 0.18, vol: 0.07 });
    A.sfx.tone(1200, { type: 'square', dur: 0.04, vol: 0.03, delay: 0.2 });
  }

  function close(g) {
    if (PD.fx.wipeActive()) return;
    g.wipeTo(SX + SW / 2, SY + SH / 2, '#1b2430', () => { PD.home.leaveDesk(g); });
  }

  function say(s) { S.status = s; }

  /* --------------------------------------------------------------- update */
  function update(dt, g) {
    const IN = PD.input;
    const m = IN.mouse;
    S.lock = Math.max(0, S.lock - dt);
    S.boot = Math.min(2, S.boot + dt);
    S.hum += dt;
    S.press = Math.max(0, S.press - dt * 3);
    S.typeT = Math.max(0, S.typeT - dt);
    S.flash = Math.max(0, S.flash - dt * 2);
    S.adT += dt;
    if (S.adT > 7) { S.adT = 0; S.ad = (S.ad + 1) % ADS.length; S.adOn = true; }
    // the auction clocks run whether or not you are looking at them
    if (S.auc.length) stepAuctions(dt, g);

    // the pointer. He has it by the wrong end, so it swings past and settles.
    const tx = U.clamp(m.x, SX + 2, SX + SW - 2), ty = U.clamp(m.y, SY + 2, SY + SH - 2);
    if (PD.touch && PD.touch.enabled) { S.cx = tx; S.cy = ty; S.vx = S.vy = 0; }
    else {
      const k = 900, drag = 11;
      S.vx += (tx - S.cx) * k * dt; S.vy += (ty - S.cy) * k * dt;
      S.vx -= S.vx * drag * dt; S.vy -= S.vy * drag * dt;
      S.cx += S.vx * dt; S.cy += S.vy * dt;
      // a permanent tremor: he is holding a mouse with a hand built for rocks
      S.cx += Math.sin(S.hum * 7.3) * 0.35;
      S.cy += Math.cos(S.hum * 5.1) * 0.35;
      S.cx = U.clamp(S.cx, SX, SX + SW); S.cy = U.clamp(S.cy, SY, SY + SH);
    }

    // a click is a request, not an event: it lands once the pointer catches up
    S.fire = false;
    if (S.lock <= 0 && m.leftPressed) {
      S.want = { x: tx, y: ty }; S.wantT = 0;
      S.press = 1; S.typeT = 0.12; S.hand = (S.hand + 1) % 2;
      A.sfx.tone(2200, { type: 'square', dur: 0.02, vol: 0.05 });
    }
    if (S.want) {
      S.wantT += dt;
      if (U.dist(S.cx, S.cy, S.want.x, S.want.y) < 4 || S.wantT > 0.4) {
        S.fire = true; S.fireX = S.cx; S.fireY = S.cy; S.want = null;
        A.sfx.tone(1500, { type: 'square', dur: 0.03, vol: 0.05 });
      }
    }

    // scrolling: the wheel, the arrow keys, or nothing at all
    if (m.wheel) S.scrollTo += m.wheel * 28;
    if (IN.hit('down')) S.scrollTo += 28;
    if (IN.hit('up')) S.scrollTo -= 28;
    S.scrollTo = Math.max(0, S.scrollTo);
    S.scroll = U.damp(S.scroll, S.scrollTo, 0.4, dt);

    if (S.lock <= 0 && IN.hit('esc')) {
      if (S.app === 'home') close(g); else { S.app = 'home'; S.scroll = S.scrollTo = 0; A.sfx.click(); }
    }
    if (S.lock <= 0 && (IN.hit('KeyQ'))) close(g);

    for (let i = S.coins.length - 1; i >= 0; i--) {
      const c = S.coins[i];
      c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 220 * dt;
      if (c.t > c.life) S.coins.splice(i, 1);
    }
  }

  /* ------------------------------------------------------- click widgets */
  function hot(x, y, w, h) { return S.cx >= x && S.cx < x + w && S.cy >= y && S.cy < y + h; }
  function press(x, y, w, h) { return S.fire && S.fireX >= x && S.fireX < x + w && S.fireY >= y && S.fireY < y + h; }

  /* A human button: light on top-left, shadow on bottom-right, sunk when hot. */
  function btn(ctx, x, y, w, h, label, opts) {
    opts = opts || {};
    const on = opts.enabled !== false;
    const over = on && hot(x, y, w, h);
    const face = !on ? '#a9a492' : (opts.face || C.chrome);
    X.rect(ctx, x, y, w, h, face);
    X.rect(ctx, x, y, w, 1, over ? C.chromeD : (opts.light || C.chromeL));
    X.rect(ctx, x, y, 1, h, over ? C.chromeD : (opts.light || C.chromeL));
    X.rect(ctx, x, y + h - 1, w, 1, over ? C.chromeL : C.chromeD);
    X.rect(ctx, x + w - 1, y, 1, h, over ? C.chromeL : C.chromeD);
    ctx.fillStyle = '#1b170f';
    ctx.fillRect(x, y - 1, w, 1); ctx.fillRect(x, y + h, w, 1);
    ctx.fillRect(x - 1, y, 1, h); ctx.fillRect(x + w, y, 1, h);
    const o = over ? 1 : 0;
    F.draw(ctx, label, x + w / 2 + o, y + ((h - 7) / 2 | 0) + o, on ? (opts.ink || C.ink) : '#7d7866', { center: true, shadow: false });
    return on && press(x, y, w, h);
  }

  function sunk(ctx, x, y, w, h, fill) {
    X.rect(ctx, x, y, w, h, fill || '#f6f3e6');
    X.rect(ctx, x, y, w, 1, C.pageDD);
    X.rect(ctx, x, y, 1, h, C.pageDD);
    X.rect(ctx, x, y + h - 1, w, 1, '#ffffff');
    X.rect(ctx, x + w - 1, y, 1, h, '#ffffff');
  }

  /* The font is fixed width, so a truncation is just arithmetic. */
  function clip(str, maxW) {
    const per = F.GW + F.GAP;
    const n = Math.floor(maxW / per);
    str = String(str);
    return str.length <= n ? str : str.slice(0, Math.max(0, n - 2)) + '..';
  }

  function stars(ctx, x, y, n) {
    for (let i = 0; i < 5; i++) {
      const c = i < n ? C.ylw : '#c3bda8';
      X.rect(ctx, x + i * 6 + 2, y, 1, 5, c);
      X.rect(ctx, x + i * 6, y + 2, 5, 1, c);
      X.rect(ctx, x + i * 6 + 1, y + 1, 3, 3, c);
    }
  }

  /* ----------------------------------------------------------------- draw */
  function draw(ctx, g, t) {
    drawRoomBack(ctx, t);
    drawCase(ctx, g, t);

    // the glass, and whatever the machine is currently insisting upon
    ctx.save();
    ctx.beginPath(); ctx.rect(SX, SY, SW, SH); ctx.clip();
    X.rect(ctx, SX, SY, SW, SH, C.glass);
    if (S.boot < 0.55) drawBoot(ctx, t);
    else {
      drawOsStrip(ctx, g, t);
      if (S.app === 'home') drawDesktop(ctx, g, t);
      else if (S.app === 'abay') drawAbay(ctx, g, t);
      else if (S.app === 'mail') drawMail(ctx, g, t);
      else if (S.app === 'setup') drawSetup(ctx, g, t);
      drawTaskbar(ctx, g, t);
      for (const c of S.coins) {
        X.rect(ctx, c.x - 1, c.y - 1, 3, 3, C.ylw);
        X.rect(ctx, c.x, c.y - 1, 1, 3, '#fff3c0');
      }
      drawCursor(ctx, t);
    }
    drawCrt(ctx, t);
    ctx.restore();

    drawDesk(ctx, g, t);
    drawHands(ctx, g, t);
    exitButton(ctx, g, t);

    if (S.fire) S.fire = false;
  }

  /* A real way out. Escape has always worked, but nothing on screen ever said
     so and on a phone there is no Escape at all -- so there is a button on the
     desk, outside the monitor, that gets him up and walks him away. */
  function exitButton(ctx, g, t) {
    const w = 88, h = 20, x = VW - w - 10, y = VH - h - 8;
    const m = PD.input.mouse;
    const over = m.inside && m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
    X.plate(ctx, x + 2, y + 3, w, h, 'rgba(4,2,12,0.45)', null, null, 3);
    X.plate(ctx, x, y, w, h, over ? '#8a3f3f' : '#66302f', over ? '#ffb0a8' : '#a05a55', '#2a1010', 3);
    Gy().draw(ctx, 'arrowR', x + 7, y + 3, '#ffd9d0', '#a05a55');
    F.draw(ctx, 'GET UP', x + 52, y + 3, '#ffe9e4', { center: true, shadow: '#2a1010' });
    F.draw(ctx, 'ESC', x + 52, y + 12, over ? '#ffb0a8' : '#c08a86', { center: true, shadow: false });
    if (over && m.leftPressed && S.lock <= 0) { A.sfx.click(); close(g); }
  }

  /* ------------------------------------------------------------- the room */
  function drawRoomBack(ctx, t) {
    X.rect(ctx, 0, 0, VW, VH, C.wallD);
    // rough rock courses behind the desk
    for (let y = 0; y < 216; y += 12) {
      for (let x = -8; x < VW; x += 26) {
        const o = ((y / 12) | 0) % 2 ? 13 : 0;
        const h = 10 + ((U.hash2(x + o, y) * 3) | 0);
        X.rect(ctx, x + o, y, 24, h, U.hash2(x + o, y + 3) > 0.5 ? C.wall : C.wallL);
        X.rect(ctx, x + o, y, 24, 1, '#453b52');
        X.rect(ctx, x + o, y + h - 1, 24, 1, C.wallD);
        if (U.hash2(x + o, y + 9) > 0.82) X.rect(ctx, x + o + 4, y + 3, 5, 3, '#4f4460');
      }
    }
    // cable spaghetti, taped on with far too much tape
    ctx.strokeStyle = '#191320'; ctx.lineWidth = 2;
    X.curve(ctx, 4, 120, 40, 176, 96, 150, '#191320', 3, 10);
    X.curve(ctx, 476, 100, 440, 168, 388, 152, '#191320', 3, 10);
    X.rect(ctx, 30, 158, 12, 5, '#d9c85a'); X.rect(ctx, 434, 150, 12, 5, '#d9c85a');
    // a poster of a planet he has already eaten
    X.rect(ctx, 6, 26, 2, 60, '#191320');
    X.rect(ctx, 470, 40, 2, 50, '#191320');
  }

  /* --------------------------------------------------------- the beige box */
  function drawCase(ctx, g, t) {
    const jolt = S.press > 0.6 ? 1 : 0;
    ctx.save();
    ctx.translate(0, jolt);
    // shadow, then the body
    X.rect(ctx, CX + 4, CY + 6, CW, CH, '#120e1a');
    X.plate(ctx, CX, CY, CW, CH, C.caseF, C.caseL, C.caseD, 6);
    // the deep bezel around the tube
    X.rect(ctx, SX - 6, SY - 6, SW + 12, SH + 12, C.caseD);
    X.rect(ctx, SX - 4, SY - 4, SW + 8, SH + 8, C.caseDD);
    X.rect(ctx, SX - 2, SY - 2, SW + 4, SH + 4, '#141a12');
    // yellowed age stains: this thing has sat in a human window for decades
    for (let i = 0; i < 26; i++) {
      const x = CX + 6 + U.hash2(i, 5) * (CW - 12), y = CY + 4 + U.hash2(i, 9) * (CH - 8);
      if (x > SX - 10 && x < SX + SW + 10 && y > SY - 10 && y < SY + SH + 10) continue;
      X.rect(ctx, x, y, 2 + ((U.hash2(i, 13) * 3) | 0), 2, '#c1b389');
    }
    // brand, badly transliterated
    F.draw(ctx, 'DELLL', CX + 30, CY + CH - 18, C.caseDD, { shadow: false });
    F.draw(ctx, 'PROPERTY OF EARTH', CX + 80, CY + CH - 16, '#a89b78', { shadow: false });
    // a scratched-out serial, replaced by his own mark
    X.rect(ctx, CX + 190, CY + CH - 17, 42, 7, '#b6a97f');
    for (let i = 0; i < 5; i++) X.rect(ctx, CX + 192 + i * 8, CY + CH - 16, 6, 5, '#a89b78');
    F.draw(ctx, 'MINE', CX + 238, CY + CH - 16, '#8a2f2f', { shadow: false });
    // power lamp, knobs and a vent
    const lit = 0.5 + 0.5 * Math.sin(t * 3);
    X.rect(ctx, CX + CW - 26, CY + CH - 20, 8, 8, '#241f18');
    X.rect(ctx, CX + CW - 25, CY + CH - 19, 6, 6, S.boot > 0.2 ? (lit > 0.5 ? '#6cff8a' : '#3fbf58') : '#2d5a35');
    for (let i = 0; i < 3; i++) {
      X.rect(ctx, CX + CW - 66 + i * 12, CY + CH - 20, 9, 9, C.caseD);
      X.rect(ctx, CX + CW - 66 + i * 12, CY + CH - 20, 9, 1, C.caseL);
      X.rect(ctx, CX + CW - 62 + i * 12, CY + CH - 19, 2, 5, C.caseDD);
    }
    for (let i = 0; i < 12; i++) X.rect(ctx, CX + 292 + i * 5, CY + CH - 16, 3, 7, C.caseD);
    // sticky notes on the bezel, in his handwriting
    X.rect(ctx, SX + SW - 52, SY - 15, 54, 15, '#e8e05a');
    X.rect(ctx, SX + SW - 52, SY - 15, 54, 1, '#f6f09a');
    F.draw(ctx, 'DO NOT EAT', SX + SW - 50, SY - 12, '#4a4420', { shadow: false });
    X.rect(ctx, SX - 4, SY - 16, 46, 16, '#e895c8');
    F.draw(ctx, 'THE PC', SX - 2, SY - 13, '#4a2040', { shadow: false });
    ctx.restore();
  }

  /* ------------------------------------------------------------- the boot */
  function drawBoot(ctx, t) {
    const k = S.boot / 0.55;
    X.rect(ctx, SX, SY, SW, SH * k, '#111a10');
    const lines = ['ZORB OS 3.1  (STOLEN)', 'MEMORY OK: 4 ROCKS', 'MOUSE FOUND. HELD WRONG.', 'LOADING ABAY...'];
    for (let i = 0; i < lines.length; i++) {
      if (k < 0.3 + i * 0.16) break;
      F.draw(ctx, lines[i], SX + 10, SY + 12 + i * 11, C.phos, { shadow: false });
    }
    X.rect(ctx, SX, SY + SH * k, SW, 2, '#dfffe4');
  }

  /* --------------------------------------------------------- the OS strip */
  function drawOsStrip(ctx, g, t) {
    X.rect(ctx, SX, SY, SW, SH, '#1c2b4a');
    // wallpaper: a planet, drawn by a machine that only has eight colours
    const wx = SX + SW / 2, wy = SY + 76;
    const BANDS = ['#12203a', '#1d3560', '#2b4a7a', '#3d67a0', '#5b8cc8'];
    for (let i = 0; i < BANDS.length; i++) {
      const r = 46 - i * 4;
      pxDisc(ctx, wx - i * 3.5, wy - i * 3, r, BANDS[i]);
    }
    pxDisc(ctx, wx + 12, wy + 14, 9, '#24406e');
    pxDisc(ctx, wx - 20, wy + 4, 6, '#24406e');
    X.orbit(ctx, wx, wy + 6, 62, 15, '#4a6f9e', 2, 0.9);   // a faceted ring, on its side
    X.orbit(ctx, wx, wy + 4, 58, 13, '#7fa8dc', 3, 0.9);
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 40; i++) {
      const sx = SX + U.hash2(i, 3) * SW, sy = SY + U.hash2(i, 7) * SH;
      X.rect(ctx, sx, sy, 1, 1, '#cfe2ff');
    }
    ctx.globalAlpha = 1;
    F.draw(ctx, 'ZORB OS 3.1', SX + SW / 2, SY + 128, '#7f97c4', { center: true, shadow: false });
    F.draw(ctx, 'THIS COMPUTER IS MINE NOW', SX + SW / 2, SY + 138, '#5d729a', { center: true, shadow: false });
  }

  /* An OCTAGON made of integer scanlines. Nothing on this machine is round. */
  function pxDisc(ctx, cx, cy, r, col) {
    ctx.fillStyle = col;
    for (let y = Math.ceil(cy - r); y <= Math.floor(cy + r); y++) {
      const dy = Math.abs(y - cy + 0.5) / r;
      if (dy > 1) continue;
      const w = r * Math.sqrt(Math.max(0, 1 - dy * dy));
      const x0 = Math.round(cx - w), x1 = Math.round(cx + w);
      if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1);
    }
  }

  /* ---------------------------------------------------------- the desktop */
  function drawDesktop(ctx, g, t) {
    for (let i = 0; i < APPS.length; i++) {
      const a = APPS[i];
      const x = SX + 12, y = SY + 12 + i * 30;
      const over = hot(x - 2, y - 2, 92, 26);
      if (over) { X.rect(ctx, x - 2, y - 2, 92, 26, 'rgba(255,255,255,0.16)'); }
      X.rect(ctx, x, y, 22, 22, C.chrome);
      X.rect(ctx, x, y, 22, 1, C.chromeL); X.rect(ctx, x, y, 1, 22, C.chromeL);
      X.rect(ctx, x, y + 21, 22, 1, C.chromeD); X.rect(ctx, x + 21, y, 1, 22, C.chromeD);
      Gy().draw(ctx, a.glyph, x + 4, y + 4, C.ink, C.dim);
      F.draw(ctx, a.name, x + 28, y + 8, '#eef3ff', { shadow: '#0d1428' });
      if (press(x - 2, y - 2, 92, 26)) openApp(a.id, g);
    }
    // his own attempt at a folder, mis-spelled and empty
    const fx = SX + SW - 84, fy = SY + 14;
    X.rect(ctx, fx, fy, 22, 18, '#d8b44a');
    X.rect(ctx, fx, fy - 3, 10, 4, '#e8c86a');
    X.rect(ctx, fx, fy, 22, 1, '#f0d888');
    F.draw(ctx, 'MY ROKS', fx - 4, fy + 22, '#eef3ff', { shadow: '#0d1428' });
    if (press(fx - 6, fy - 4, 44, 34)) { S.app = 'abay'; S.tab = 1; S.scrollTo = S.scroll = 0; A.sfx.click(); say('YOUR ROCKS ARE IN THE SELLING PLACE.'); }
  }

  function openApp(id, g) {
    A.sfx.click();
    S.scroll = S.scrollTo = 0;
    // the chart has to open on the far side of the iris, not before it: doing
    // both at once let the deferred close land afterwards and drop you home
    if (id === 'map') {
      say('GOING TO THE SKY.');
      if (PD.fx.wipeActive()) return;
      g.wipeTo(SX + SW / 2, SY + SH / 2, '#1b2430', () => { PD.home.leaveDesk(g); g.openChart(); });
      return;
    }
    S.app = id;
    if (id === 'abay') { S.tab = 0; say('ABAY: BUY IT NOW OR DO NOT, I AM NOT YOUR DAD.'); }
    if (id === 'mail') say('6 MESSAGES. 6 ARE BAD.');
    if (id === 'setup') say('DO NOT TOUCH ANYTHING IN HERE.');
  }

  /* ---------------------------------------------------------- the taskbar */
  function drawTaskbar(ctx, g, t) {
    X.rect(ctx, SX, BARY, SW, 12, C.chrome);
    X.rect(ctx, SX, BARY, SW, 1, C.chromeL);
    if (btn(ctx, SX + 2, BARY + 1, 34, 10, 'START')) { say(U.pick(['NOTHING STARTED.', 'IT IS ALREADY STARTED.', 'I PRESSED IT. NOTHING.'])); A.sfx.deny(); }
    if (S.app !== 'home') {
      const nm = S.app === 'abay' ? 'ABAY' : (S.app === 'mail' ? 'MESSAGES' : 'SETUP');
      if (btn(ctx, SX + 40, BARY + 1, 62, 10, nm, { face: C.chromeD, ink: '#ffffff' })) { S.app = 'home'; A.sfx.click(); }
    }
    sunk(ctx, SX + SW - 44, BARY + 1, 42, 10, C.chrome);
    F.draw(ctx, '88:88 PM', SX + SW - 42, BARY + 3, C.ink, { shadow: false });
  }

  /* ------------------------------------------------------------ the window */
  function windowFrame(ctx, title, g) {
    X.rect(ctx, WX + 3, WY + 3, WW, WH, 'rgba(0,0,0,0.4)');
    X.rect(ctx, WX, WY, WW, WH, C.chrome);
    X.rect(ctx, WX, WY, WW, 1, C.chromeL); X.rect(ctx, WX, WY, 1, WH, C.chromeL);
    X.rect(ctx, WX, WY + WH - 1, WW, 1, '#5f5a4c'); X.rect(ctx, WX + WW - 1, WY, 1, WH, '#5f5a4c');
    X.rect(ctx, WX + 2, WY + 2, WW - 4, 11, C.win);
    X.rect(ctx, WX + 2, WY + 2, WW - 4, 1, '#4d6fd0');
    F.draw(ctx, title, WX + 6, WY + 4, '#ffffff', { shadow: false });
    if (btn(ctx, WX + WW - 14, WY + 3, 10, 9, 'X', { face: C.chrome })) { S.app = 'home'; A.sfx.click(); }
    X.rect(ctx, WX + 2, WY + 14, WW - 4, WH - 16, C.page);
  }

  /* ------------------------------------------------------------- AUCTIONS
     ABAY is not only a shop. Half of it is people selling one thing each with
     a clock on it, and a rival who wants it too. Bid and you are winning;
     wait and grunk_92 takes it off you. Win and you pay well under the
     buy-it-now, which is the whole reason to bother.

     The rival has a hidden ceiling of about five-sixths of the shop price, so
     an auction is always worth a go and never a sure thing. */
  const RIVALS = ['grunk_92', 'notarobot4', 'MOTHER', 'bidbot_prime', 'zorb_jr',
    'THE_CURATOR', 'a_very_normal_guy', 'kevin'];

  function makeAuction(g) {
    const pool = D.ABAY.filter(it => (g.save.upg[it.id] || 0) < g.abayMax(it.id));
    if (!pool.length) return null;
    const it = U.pick(pool);
    const shop = g.abayPrice(it.id);
    return {
      it, shop,
      bid: Math.max(10, Math.round(shop * U.rand(0.28, 0.46) / 10) * 10),
      inc: Math.max(10, Math.round(shop * 0.06 / 10) * 10),
      ceil: Math.round(shop * U.rand(0.72, 0.92)),
      ends: U.rand(26, 70), mine: false,
      rival: U.pick(RIVALS), think: U.rand(1.6, 4), done: 0
    };
  }

  function seedAuctions(g) {
    S.auc.length = 0;
    for (let i = 0; i < 4; i++) { const a = makeAuction(g); if (a) S.auc.push(a); }
  }

  function stepAuctions(dt, g) {
    for (let i = S.auc.length - 1; i >= 0; i--) {
      const a = S.auc[i];
      a.ends -= dt;
      if (a.ends <= 0) {
        // the hammer. If you are still the high bidder it is yours.
        if (a.mine) {
          if (g.save.credits >= a.bid) {
            g.save.credits -= a.bid;
            g.save.upg[a.it.id] = (g.save.upg[a.it.id] || 0) + 1;
            g.recompute(); g.saveGame();
            say('WON: ' + a.it.name + ' FOR $' + U.fmt(a.bid) + '. THAT IS A STEAL.');
            A.sfx.fanfare ? A.sfx.fanfare() : A.sfx.coin();
            S.flash = 1;
            for (let k = 0; k < 18; k++) {
              S.coins.push({ x: SX + SW / 2 + U.rand(-20, 20), y: SY + 60, vx: U.rand(-90, 90), vy: U.rand(-110, -30), t: 0, life: 1.2 });
            }
          } else { say('YOU WON AND CANNOT PAY. ABAY IS TELLING EVERYONE.'); A.sfx.deny(); }
        } else if (a.seen) {
          say(a.rival.toUpperCase() + ' GOT THE ' + a.it.name + '. OF COURSE THEY DID.');
        }
        S.auc.splice(i, 1);
        const nu = makeAuction(g); if (nu) S.auc.push(nu);
        continue;
      }
      // the rival only wakes up when you are ahead, and only up to its ceiling
      if (!a.mine) continue;
      a.think -= dt;
      if (a.think > 0) continue;
      a.think = U.rand(1.8, 5);
      if (a.bid + a.inc > a.ceil) return;         // it has had enough
      a.bid += a.inc; a.mine = false;
      a.ends = Math.max(a.ends, 6);               // a late bid extends the clock
      say(a.rival.toUpperCase() + ' BID $' + U.fmt(a.bid) + '. ON YOUR OWN ITEM.');
      A.sfx.tone(300, { type: 'square', to: 180, dur: 0.12, vol: 0.08 });
    }
  }

  function placeBid(g, a) {
    const next = a.mine ? a.bid : a.bid + a.inc;
    if (a.mine) { say('YOU ARE ALREADY WINNING. CALM DOWN.'); A.sfx.deny(); return; }
    if (g.save.credits < next) { say('NOT ENOUGH MONEY. GO AND HIT A PLANET.'); A.sfx.deny(); return; }
    a.bid = next; a.mine = true; a.seen = 1;
    a.ends = Math.max(a.ends, 8);
    a.think = U.rand(1.4, 4);
    say('BID $' + U.fmt(a.bid) + '. YOU ARE WINNING. FOR NOW.');
    A.sfx.click();
  }

  /* ------------------------------------------------------------------ ABAY */
  const TABS = ['BUY NOW', 'AUCTIONS', 'MY ROCKS', 'FEEDBACK'];
  const CATS = ['ALL', 'DIG', 'BODY', 'SHIP', 'BANG', 'BIZ', 'JUNK'];
  function drawAbay(ctx, g, t) {
    windowFrame(ctx, 'ABAY - THE PLACE WHERE THINGS ARE', g);
    const x0 = WX + 2, y0 = WY + 14, w = WW - 4;

    /* banner: the logo, a search box he cannot type in, and his money */
    X.rect(ctx, x0, y0, w, 18, '#ffffff');
    X.rect(ctx, x0, y0 + 17, w, 1, C.pageDD);
    abayLogo(ctx, x0 + 6, y0 + 4, t);
    sunk(ctx, x0 + 96, y0 + 4, 128, 11);
    F.draw(ctx, 'ROCK BUYER NEAR ME', x0 + 99, y0 + 6, '#8e8874', { shadow: false });
    if (btn(ctx, x0 + 226, y0 + 4, 30, 11, 'FIND')) { A.sfx.deny(); say('NO. YOU FIND.'); }
    Gy().draw(ctx, 'coin', x0 + w - 96, y0 + 3, C.ylw, '#a8781a');
    F.draw(ctx, '$' + U.fmt(g.save.credits), x0 + w - 6, y0 + 2, '#1e6b2e', { right: true, shadow: false });
    if (g.save.debt > 0) {
      F.draw(ctx, 'OWED $' + U.fmt(g.save.debt), x0 + w - 6, y0 + 11, C.red, { right: true, shadow: false });
    }

    /* tabs */
    const ty = y0 + 18;
    for (let i = 0; i < TABS.length; i++) {
      const tw = 63, tx = x0 + 4 + i * (tw + 3);
      const on = S.tab === i;
      X.rect(ctx, tx, ty + (on ? 0 : 2), tw, on ? 12 : 10, on ? C.page : C.pageD);
      X.rect(ctx, tx, ty + (on ? 0 : 2), tw, 1, on ? '#ffffff' : C.pageDD);
      F.draw(ctx, TABS[i], tx + tw / 2, ty + (on ? 3 : 4), on ? C.ink : C.dim, { center: true, shadow: false });
      if (press(tx, ty, tw, 12)) {
        S.tab = i; S.scroll = S.scrollTo = 0; A.sfx.click();
        if (i === 0) PD.chum.call(g, 'abay');
        if (i === 1) PD.chum.call(g, 'auction');
      }
      if (i === 1 && S.auc.some(a => a.mine)) {   // you are winning something
        X.rect(ctx, tx + tw - 5, ty - 2, 5, 5, Math.sin(t * 7) > 0 ? C.grn : '#1e6b2e');
      }
    }
    X.rect(ctx, x0, ty + 12, w, 1, C.pageDD);

    /* the shelf of categories, only where it means anything */
    let shelf = 0;
    if (S.tab === 0) {
      shelf = 13;
      X.rect(ctx, x0, ty + 13, w, 12, C.pageD);
      for (let i = 0; i < CATS.length; i++) {
        const cw = 38, cx2 = x0 + 5 + i * (cw + 2);
        const on = S.cat === i;
        X.rect(ctx, cx2, ty + 14, cw, 10, on ? C.blu : C.page);
        X.rect(ctx, cx2, ty + 14, cw, 1, on ? '#8ab0ff' : '#ffffff');
        F.draw(ctx, CATS[i], cx2 + cw / 2, ty + 16, on ? '#ffffff' : C.dim, { center: true, shadow: false });
        if (press(cx2, ty + 14, cw, 10)) { S.cat = i; S.scroll = S.scrollTo = 0; A.sfx.click(); }
      }
      X.rect(ctx, x0, ty + 25, w, 1, C.pageDD);
    }

    const bx = x0 + 4, by = ty + 15 + shelf, bw = w - 8, bh = WY + WH - 4 - by - 12;
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    if (S.tab === 0) abayBuy(ctx, g, t, bx, by, bw, bh);
    else if (S.tab === 1) abayAuctions(ctx, g, t, bx, by, bw, bh);
    else if (S.tab === 2) abaySell(ctx, g, t, bx, by, bw, bh);
    else abayFeedback(ctx, g, t, bx, by, bw, bh);
    ctx.restore();

    /* the advert strip, and the status line */
    const fy = WY + WH - 14;
    if (S.adOn) {
      X.rect(ctx, x0 + 2, fy, w - 4, 11, '#3a1c4e');
      for (let i = 0; i < w - 4; i += 6) X.rect(ctx, x0 + 2 + i, fy, 3, 1, ((i / 6 + (t * 6 | 0)) % 2) ? '#ff8ad8' : '#58e8ff');
      F.draw(ctx, ADS[S.ad], x0 + 8, fy + 2, Math.sin(t * 6) > 0 ? '#ffe86a' : '#ff9ad8', { shadow: false });
      if (btn(ctx, x0 + w - 14, fy + 1, 10, 9, 'X', { face: C.chrome })) { S.adOn = false; A.sfx.click(); say('THE ADVERT IS BACK IN 7 SECONDS. THAT IS THE DEAL.'); }
    } else {
      X.rect(ctx, x0 + 2, fy, w - 4, 11, C.pageD);
      F.draw(ctx, S.status, x0 + 6, fy + 2, C.dim, { shadow: false });
    }
  }

  function abayLogo(ctx, x, y, t) {
    const L = [['A', C.red], ['B', C.blu], ['A', C.ylw], ['Y', C.grn]];
    for (let i = 0; i < 4; i++) {
      const bob = Math.round(Math.sin(t * 3 + i) * 1);
      F.draw(ctx, L[i][0], x + i * 14, y + bob, L[i][1], { scale: 2, shadow: false });
    }
    F.draw(ctx, 'TM', x + 56, y, C.dim, { shadow: false });
  }

  function scrollbar(ctx, x, y, h, total, view) {
    if (total <= view) { S.scrollTo = 0; return; }
    S.scrollTo = Math.min(S.scrollTo, total - view);
    X.rect(ctx, x, y, 7, h, C.pageD);
    const kh = Math.max(10, Math.round(h * view / total));
    const ky = y + Math.round((h - kh) * S.scroll / (total - view));
    X.rect(ctx, x, ky, 7, kh, C.chrome);
    X.rect(ctx, x, ky, 7, 1, C.chromeL);
    X.rect(ctx, x, ky + kh - 1, 7, 1, C.chromeD);
    if (press(x, y, 7, h)) { S.scrollTo = U.clamp((S.fireY - y - kh / 2) / (h - kh) * (total - view), 0, total - view); A.sfx.click(); }
  }

  /* -------------------------------------------------------------- BUY tab */
  function abayBuy(ctx, g, t, bx, by, bw, bh) {
    const ROW = 30;
    const want = CATS[S.cat];
    const list = S.cat === 0 ? D.ABAY : D.ABAY.filter(it => (it.cat || 'JUNK') === want);
    if (!list.length) {
      F.draw(ctx, 'NOTHING ON THIS SHELF.', bx + bw / 2, by + 24, C.ink, { center: true, shadow: false, scale: 2 });
      return;
    }
    const total = list.length * ROW;
    const lw = bw - 9;
    const RCOL = 92;                       // price + button live here, nothing else
    const TW = lw - 28 - RCOL;             // room the words are allowed
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const y = by + i * ROW - Math.round(S.scroll);
      if (y > by + bh || y + ROW < by) continue;
      const lvl = g.save.upg[it.id] || 0;
      const cap = g.abayMax(it.id);
      const maxed = lvl >= cap;
      const cost = g.abayPrice(it.id);
      const afford = g.save.credits >= cost;
      const over = hot(bx, y, lw, ROW - 2);

      X.rect(ctx, bx, y, lw, ROW - 2, over ? '#fdfaef' : (i % 2 ? '#e2ded0' : C.page));
      X.rect(ctx, bx, y + ROW - 2, lw, 1, C.pageDD);
      if (over) { X.rect(ctx, bx, y, 2, ROW - 2, C.ylw); }
      // thumbnail in a sunk box
      sunk(ctx, bx + 3, y + 5, 22, 22, '#ffffff');
      Gy().draw(ctx, GLYPH_OF[it.id] || 'quest', bx + 7, y + 9, C.ink, C.dim);
      if (lvl > 0) {
        X.rect(ctx, bx + 3, y + 20, 22, 7, '#3a9c48');
        F.draw(ctx, 'X' + lvl, bx + 14, y + 21, '#ffffff', { center: true, shadow: false });
      }
      // title as a blue underlined link, because that is what a link is
      const nm = clip(it.name, TW);
      F.draw(ctx, nm, bx + 29, y + 3, maxed ? C.dim : C.link, { shadow: false });
      if (!maxed) X.rect(ctx, bx + 29, y + 11, F.width(nm, 1), 1, C.link);
      F.draw(ctx, clip(it.blurb, TW), bx + 29, y + 13, C.dim, { shadow: false });
      stars(ctx, bx + 29, y + 22, it.stars);
      F.draw(ctx, clip(it.seller + ' (' + (100 + i * 37) + ')', TW - 34), bx + 63, y + 21, '#7a7460', { shadow: false });

      // the right column
      const px = bx + lw - RCOL;
      X.rect(ctx, px - 3, y + 2, 1, ROW - 6, C.pageDD);
      if (maxed) {
        F.draw(ctx, 'YOU OWN THE', px + RCOL / 2, y + 6, C.dim, { center: true, shadow: false });
        F.draw(ctx, 'WHOLE LOT', px + RCOL / 2, y + 15, C.dim, { center: true, shadow: false });
      } else {
        F.draw(ctx, '$' + U.fmt(cost), px + RCOL - 4, y + 3, afford ? '#1e6b2e' : C.red, { right: true, shadow: false });
        F.draw(ctx, 'LVL ' + lvl + ' / ' + cap, px + 2, y + 3, C.dim, { shadow: false });
        if (btn(ctx, px + 2, y + 14, RCOL - 6, 11, 'BUY IT NOW',
          { face: afford ? '#f2c23a' : '#c9c3ae', enabled: afford, light: '#ffe08a' })) buy(g, it, cost);
      }
      if (!afford && !maxed && press(bx, y, lw - RCOL, ROW - 2)) { A.sfx.deny(); say('NOT ENOUGH MONEY. GO AND HIT A PLANET.'); }
    }
    scrollbar(ctx, bx + bw - 7, by, bh, total, bh);
  }

  function buy(g, it, cost) {
    if (!g.abayBuy(it.id)) { say('THE BUTTON DID NOT WORK. THE BUTTON IS FINE.'); return; }
    say('BOUGHT: ' + it.name + '. IT IS ALREADY HERE. DO NOT ASK.');
    S.flash = 1;
    for (let i = 0; i < 14; i++) {
      S.coins.push({ x: SX + SW - 60 + U.rand(-10, 10), y: SY + 40, vx: U.rand(-70, 70), vy: U.rand(-90, -20), t: 0, life: 1 });
    }
  }

  /* --------------------------------------------------------- AUCTIONS tab */
  function abayAuctions(ctx, g, t, bx, by, bw, bh) {
    const ROW = 44, lw = bw - 9;
    if (!S.auc.length) {
      F.draw(ctx, 'NO AUCTIONS. EVERYONE IS ASLEEP.', bx + lw / 2, by + 24, C.ink, { center: true, shadow: false, scale: 2 });
      return;
    }
    for (let i = 0; i < S.auc.length; i++) {
      const a = S.auc[i];
      const y = by + i * ROW - Math.round(S.scroll);
      if (y > by + bh || y + ROW < by) continue;
      const over = hot(bx, y, lw, ROW - 2);
      const soon = a.ends < 10;
      X.rect(ctx, bx, y, lw, ROW - 2, over ? '#fdfaef' : (i % 2 ? '#e2ded0' : C.page));
      X.rect(ctx, bx, y + ROW - 2, lw, 1, C.pageDD);
      X.rect(ctx, bx, y, 2, ROW - 2, a.mine ? C.grn : (soon ? C.red : C.pageDD));

      sunk(ctx, bx + 4, y + 7, 26, 26, '#ffffff');
      Gy().draw(ctx, GLYPH_OF[a.it.id] || 'quest', bx + 10, y + 13, C.ink, C.dim);

      /* the left half is the listing, the right half is the money -- they do
         not share a column, because a big green number under a big yellow
         button is how you end up unable to read either */
      const TW = lw - 34 - 88;
      F.draw(ctx, clip(a.it.name, TW), bx + 34, y + 4, C.link, { shadow: false });
      X.rect(ctx, bx + 34, y + 12, Math.min(TW, F.width(a.it.name, 1)), 1, C.link);
      F.draw(ctx, clip('SELLER ' + a.it.seller, TW), bx + 34, y + 15, '#7a7460', { shadow: false });
      F.draw(ctx, a.mine ? 'YOU ARE THE HIGH BIDDER' : clip('HIGH BIDDER: ' + a.rival, TW),
        bx + 34, y + 25, a.mine ? '#1e6b2e' : C.dim, { shadow: false });
      F.draw(ctx, 'BUY IT NOW WAS $' + U.fmt(a.shop), bx + 34, y + 34, '#7a7460', { shadow: false });

      const rx = bx + lw - 6;
      const mm = Math.floor(a.ends / 60), ss = Math.floor(a.ends % 60);
      const clockCol = soon ? (Math.sin(t * 9) > 0 ? C.red : '#8a2f2f') : C.dim;
      F.draw(ctx, mm + ':' + (ss < 10 ? '0' : '') + ss, rx, y + 4, clockCol, { right: true, shadow: false });
      F.draw(ctx, '$' + U.fmt(a.bid), rx, y + 13, '#1e6b2e', { right: true, shadow: false, scale: 2 });
      if (btn(ctx, rx - 82, y + 29, 82, 12, a.mine ? 'WINNING' : 'BID $' + U.fmt(a.bid + a.inc),
        { face: a.mine ? '#9fd9a8' : '#f2c23a', enabled: !a.mine, light: '#ffe08a' })) placeBid(g, a);
    }
    scrollbar(ctx, bx + bw - 7, by, bh, S.auc.length * ROW, bh);
  }

  /* ------------------------------------------------------------- SELL tab */
  function abaySell(ctx, g, t, bx, by, bw, bh) {
    const keys = Object.keys(g.save.vault).sort((a, b) => D.MAT[b].cr - D.MAT[a].cr);
    const ROW = 17;
    const listH = bh - 16;
    const lw = bw - 9;

    if (!keys.length) {
      F.draw(ctx, 'YOU HAVE NO ROCKS.', bx + lw / 2, by + 22, C.ink, { center: true, shadow: false, scale: 2 });
      F.draw(ctx, 'GO TO A PLANET. HIT IT. COME BACK.', bx + lw / 2, by + 40, C.dim, { center: true, shadow: false });
      F.draw(ctx, 'THE UFO IS THE ROUND THING BY THE DOOR.', bx + lw / 2, by + 50, C.dim, { center: true, shadow: false });
      return;
    }

    F.draw(ctx, 'LOT', bx + 20, by, C.dim, { shadow: false });
    F.draw(ctx, 'QTY', bx + lw - 176, by, C.dim, { right: true, shadow: false });
    F.draw(ctx, 'ASKING', bx + lw - 108, by, C.dim, { right: true, shadow: false });
    F.draw(ctx, 'TOTAL', bx + lw - 4, by, C.dim, { right: true, shadow: false });
    X.rect(ctx, bx, by + 9, lw, 1, C.pageDD);

    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by + 10, bw, listH - 10); ctx.clip();
    for (let i = 0; i < keys.length; i++) {
      const mat = +keys[i], n = g.save.vault[mat];
      const y = by + 11 + i * ROW - Math.round(S.scroll);
      if (y > by + listH || y + ROW < by) continue;
      const price = g.priceOf(mat), tot = price * n;
      X.rect(ctx, bx, y, lw, ROW - 1, i % 2 ? '#e4e0d0' : C.page);
      PD.art.oreChip(ctx, mat, bx + 2, y + 1, 14);
      F.draw(ctx, clip(D.MAT[mat].name, 156), bx + 20, y + 4, C.ink, { shadow: false });
      F.draw(ctx, 'X' + n, bx + lw - 176, y + 4, C.ink, { right: true, shadow: false });
      const d = g.demandFor(mat);
      F.draw(ctx, '$' + U.fmt(price), bx + lw - 108, y + 4, C.ink, { right: true, shadow: false });
      if (d > 1.06 || d < 0.94) {
        const up = d > 1.06;
        X.rect(ctx, bx + lw - 100, y + 3, 26, 9, up ? '#3a9c48' : '#c4453a');
        F.draw(ctx, up ? 'HOT' : 'COLD', bx + lw - 87, y + 5, '#ffffff', { center: true, shadow: false });
      }
      F.draw(ctx, '$' + U.fmt(tot), bx + lw - 4, y + 4, C.ink, { right: true, shadow: false });
    }
    ctx.restore();
    scrollbar(ctx, bx + bw - 7, by + 10, listH - 10, keys.length * ROW, listH - 10);

    const val = g.vaultValue(), cnt = g.vaultTotal();
    const byy = by + bh - 14;
    X.rect(ctx, bx, byy - 3, lw, 1, C.pageDD);
    F.draw(ctx, cnt + ' ROCKS IN THE SACK', bx, byy + 3, C.dim, { shadow: false });
    if (btn(ctx, bx + lw - 168, byy, 168, 13, 'LIST THE LOT  ->  $' + U.fmt(val),
      { face: '#4cbf62', light: '#8fe89e', ink: '#0f2c15' })) sellAll(g);
  }

  function sellAll(g) {
    const val = g.vaultValue();
    if (!val) { A.sfx.deny(); say('THERE IS NOTHING TO SELL. THAT IS THE PROBLEM.'); return; }
    g.sellAll();
    say('SOLD. INSTANTLY. NOBODY EVEN LOOKED AT IT.');
    S.flash = 1;
    for (let i = 0; i < 40; i++) {
      S.coins.push({ x: SX + SW / 2 + U.rand(-60, 60), y: SY + SH / 2, vx: U.rand(-120, 120), vy: U.rand(-140, -40), t: 0, life: 1.4 });
    }
  }

  /* --------------------------------------------------------- FEEDBACK tab */
  function abayFeedback(ctx, g, t, bx, by, bw, bh) {
    const ROW = 21, lw = bw - 9;
    F.draw(ctx, 'FEEDBACK ABOUT YOU: 62% POSITIVE', bx, by, C.ink, { shadow: false });
    X.rect(ctx, bx, by + 9, lw, 1, C.pageDD);
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by + 10, bw, bh - 10); ctx.clip();
    for (let i = 0; i < FEEDBACK.length; i++) {
      const f = FEEDBACK[i];
      const y = by + 12 + i * ROW - Math.round(S.scroll);
      if (y > by + bh || y + ROW < by) continue;
      X.rect(ctx, bx, y, lw, ROW - 2, i % 2 ? '#e4e0d0' : C.page);
      stars(ctx, bx + 2, y + 2, f[1]);
      F.draw(ctx, f[0], bx + 36, y + 1, C.link, { shadow: false });
      F.draw(ctx, f[2], bx + 2, y + 11, C.ink, { shadow: false });
    }
    ctx.restore();
    scrollbar(ctx, bx + bw - 7, by + 10, bh - 10, FEEDBACK.length * ROW, bh - 10);
  }

  /* -------------------------------------------------------------- MESSAGES */
  function drawMail(ctx, g, t) {
    windowFrame(ctx, 'MESSAGES - 6 UNREAD, 6 BAD', g);
    const box = mailbox(g);
    const bx = WX + 6, by = WY + 18, lw = WW - 20, ROW = 19;
    ctx.save();
    ctx.beginPath(); ctx.rect(WX + 2, by, WW - 4, WH - 22); ctx.clip();
    for (let i = 0; i < box.length; i++) {
      const y = by + i * ROW - Math.round(S.scroll);
      X.rect(ctx, bx, y, lw, ROW - 2, i % 2 ? '#e4e0d0' : C.page);
      X.rect(ctx, bx + 2, y + 4, 9, 7, '#ffffff');
      X.rect(ctx, bx + 2, y + 4, 9, 1, C.pageDD);
      X.rect(ctx, bx + 4, y + 6, 5, 1, C.dim);
      F.draw(ctx, box[i][0], bx + 15, y + 1, C.link, { shadow: false });
      F.draw(ctx, box[i][1], bx + 15, y + 10, C.ink, { shadow: false });
    }
    ctx.restore();
    scrollbar(ctx, WX + WW - 12, by, WH - 24, box.length * ROW, WH - 24);
  }

  /* ---------------------------------------------------------------- SETUP */
  function drawSetup(ctx, g, t) {
    windowFrame(ctx, 'SETUP - HE SHOULD NOT BE IN HERE', g);
    const bx = WX + 10, by = WY + 20;
    F.draw(ctx, 'MACHINE: DELLL (STOLEN, EARTH)', bx, by, C.ink, { shadow: false });
    F.draw(ctx, 'OWNER: ME NOW', bx, by + 11, C.ink, { shadow: false });
    F.draw(ctx, 'WORLDS EATEN: ' + g.save.destroyed.filter(Boolean).length + ' OF ' + D.BODIES.length, bx, by + 22, C.ink, { shadow: false });
    F.draw(ctx, 'TOTAL EARNED: $' + U.fmt(g.save.totalEarned), bx, by + 33, C.ink, { shadow: false });
    F.draw(ctx, 'TITLE: ' + D.titleFor(g.save.dominion), bx, by + 44, C.ink, { shadow: false });

    if (btn(ctx, bx, by + 60, 96, 13, A.state.sfx ? 'SOUND: ON' : 'SOUND: OFF')) { A.toggleSfx(!A.state.sfx); A.toggleMusic(A.state.sfx); A.sfx.click(); }
    if (btn(ctx, bx + 104, by + 60, 110, 13, 'FULL SCREEN')) { toggleFull(); }
    if (btn(ctx, bx, by + 78, 214, 13, 'THROW EVERYTHING AWAY (WIPE SAVE)', { face: '#d8746a', light: '#ecaba2', ink: '#2c0f0c' })) {
      if (S.confirm) { S.confirm = false; g.wipeSave(); say('IT IS ALL GONE. WELL DONE.'); }
      else { S.confirm = true; say('PRESS IT AGAIN IF YOU REALLY MEAN IT.'); }
    }
    F.draw(ctx, S.status, bx, by + 96, C.dim, { shadow: false });
  }

  function toggleFull() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (e) { /* the human machine says no */ }
  }

  /* --------------------------------------------------------------- cursor */
  function drawCursor(ctx, t) {
    const x = Math.round(S.cx), y = Math.round(S.cy);
    // the pointer, and a faint ghost of where you actually aimed
    if (S.want) {
      X.rect(ctx, Math.round(S.want.x) - 2, Math.round(S.want.y), 5, 1, 'rgba(255,255,255,0.3)');
      X.rect(ctx, Math.round(S.want.x), Math.round(S.want.y) - 2, 1, 5, 'rgba(255,255,255,0.3)');
    }
    const ARROW = [
      '#.........', '##........', '#@#.......', '#@@#......', '#@@@#.....',
      '#@@@@#....', '#@@@@@#...', '#@@@@@@#..', '#@@@#####.', '#@#@#.....',
      '##.#@#....', '#..#@#....', '....##....'
    ];
    for (let j = 0; j < ARROW.length; j++) {
      for (let i = 0; i < ARROW[j].length; i++) {
        const c = ARROW[j][i];
        if (c === '.') continue;
        ctx.fillStyle = c === '#' ? '#120d08' : '#ffffff';
        ctx.fillRect(x + i, y + j, 1, 1);
      }
    }
  }

  /* ------------------------------------------------------------ CRT glass */
  function drawCrt(ctx, t) {
    if (S.flash > 0) { ctx.globalAlpha = S.flash * 0.25; X.rect(ctx, SX, SY, SW, SH, '#ffffff'); ctx.globalAlpha = 1; }
    ctx.globalAlpha = 0.14;
    for (let y = SY; y < SY + SH; y += 2) X.rect(ctx, SX, y, SW, 1, '#000000');
    ctx.globalAlpha = 1;
    // phosphor bloom in the corners and a rolling bright band
    ctx.globalAlpha = 0.09;
    const rb = SY + ((t * 40) % (SH + 40)) - 20;
    X.rect(ctx, SX, rb, SW, 14, '#bfffd0');
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 5; i++) {
      X.rect(ctx, SX, SY + i, SW, 1, '#000000');
      X.rect(ctx, SX, SY + SH - 1 - i, SW, 1, '#000000');
      X.rect(ctx, SX + i, SY, 1, SH, '#000000');
      X.rect(ctx, SX + SW - 1 - i, SY, 1, SH, '#000000');
    }
    ctx.globalAlpha = 1;
    // his own reflection, because the glass is filthy
    ctx.globalAlpha = 0.06;
    X.rect(ctx, SX + 20, SY + 6, 120, 3, '#ffffff');
    X.rect(ctx, SX + 34, SY + 12, 88, 2, '#ffffff');
    ctx.globalAlpha = 1;
  }

  /* ----------------------------------------------------------- desk + keys */
  function drawDesk(ctx, g, t) {
    const DY = 204;
    X.rect(ctx, 0, DY, VW, VH - DY, C.wood);
    X.rect(ctx, 0, DY, VW, 3, C.woodL);
    for (let x = 0; x < VW; x += 3) {
      const n = U.hash2(x, 2);
      if (n > 0.72) X.rect(ctx, x, DY + 4 + ((n * 40) | 0), 3, 1, C.woodD);
      if (n < 0.12) X.rect(ctx, x, DY + 10 + ((n * 200) | 0) % 40, 2, 1, C.woodL);
    }
    // ring stains from a mug he does not use for drinking
    for (const rx of [70, 402]) {
      for (let a = 0; a < 40; a++) {
        const ang = a / 40 * Math.PI * 2;
        X.rect(ctx, rx + Math.cos(ang) * 13, DY + 16 + Math.sin(ang) * 5, 1, 1, C.woodD);
      }
    }
    // the mug, with a bone in it
    X.rect(ctx, 30, DY + 2, 22, 22, '#3f7fb0');
    X.rect(ctx, 30, DY + 2, 22, 3, '#5fa0d0');
    X.rect(ctx, 52, DY + 8, 5, 10, '#3f7fb0');
    X.rect(ctx, 54, DY + 10, 2, 6, C.wood);
    X.rect(ctx, 38, DY - 8, 4, 14, '#e8e2cc');
    X.rect(ctx, 36, DY - 10, 8, 4, '#e8e2cc');
    // keyboard: a slab of human keys, most of which he has never pressed
    const KX = 92, KY = DY + 10, KW = 296, KH = 46;
    X.rect(ctx, KX - 3, KY - 3, KW + 6, KH + 8, '#1b1620');
    X.plate(ctx, KX, KY, KW, KH, '#c4bda4', '#e2dbc2', '#847d6a', 3);
    X.rect(ctx, KX + 4, KY + 3, KW - 8, KH - 8, '#a9a28c');       // the sunk key well
    X.rect(ctx, KX + 4, KY + 3, KW - 8, 1, '#8d8672');
    const bang = S.press > 0.5 ? 1 : 0;
    for (let r = 0; r < 4; r++) {
      const cols = [16, 15, 14, 5][r];
      const off = [0, 5, 9, 22][r];
      if (KY + 6 + r * 9 > VH - 6) break;
      for (let c = 0; c < cols; c++) {
        const kw = r === 3 && c === 2 ? 92 : 16;
        let kx = KX + 6 + off + c * 18;
        if (r === 3 && c > 2) kx += 76;
        const ky = KY + 6 + r * 9;
        const hitk = bang && ((c * 5 + r * 3) % 11 === (S.hand ? 2 : 7));
        const face = hitk ? '#9d9682' : '#ded7bf';
        X.rect(ctx, kx, ky + (hitk ? 1 : 0), kw, hitk ? 7 : 8, face);
        X.rect(ctx, kx, ky + (hitk ? 1 : 0), kw, 1, hitk ? '#8d8672' : '#f4efdc');
        X.rect(ctx, kx, ky + 7, kw, 1, '#8d8672');
        X.rect(ctx, kx + kw - 1, ky, 1, 8, '#8d8672');
        // the letters have worn off, except the ones he uses
        if (!hitk && (c + r) % 4 === 0) X.rect(ctx, kx + 6, ky + 3, 3, 2, '#9a9380');
      }
    }
    F.draw(ctx, 'HUMAN KEYS', KX + KW - 6, KY + KH - 8, '#9a9380', { right: true, shadow: false });
    // a chewed pencil laid across the top of it
    X.rect(ctx, KX + 40, KY - 6, 70, 3, '#e0b13a');
    X.rect(ctx, KX + 40, KY - 6, 70, 1, '#f2ca62');
    X.rect(ctx, KX + 110, KY - 6, 6, 3, '#d8d2c0');
    X.rect(ctx, KX + 34, KY - 6, 6, 3, '#3a3026');
    // the mat, and a mouse he is holding like a small animal
    const mx = KX + KW + 16, my = KY + 14;
    X.rect(ctx, mx - 8, my - 6, 52, 36, '#2b3f6a');
    X.rect(ctx, mx - 8, my - 6, 52, 1, '#3d5590');
    X.rect(ctx, mx - 6, my - 4, 48, 32, '#213155');
    F.draw(ctx, 'ZORB', mx + 18, my + 20, '#3d5590', { center: true, shadow: false });
    const jig = Math.round(Math.sin(t * 2) * 2);
    X.rect(ctx, mx + 6 + jig, my, 24, 26, '#ddd6be');
    X.rect(ctx, mx + 6 + jig, my, 24, 2, '#f2ecd8');
    X.rect(ctx, mx + 6 + jig, my + 24, 24, 2, '#a49d88');
    X.rect(ctx, mx + 6 + jig, my + 2, 11, 9, '#c9c2ab');
    X.rect(ctx, mx + 19 + jig, my + 2, 11, 9, '#c9c2ab');
    X.rect(ctx, mx + 17 + jig, my + 2, 2, 9, '#a49d88');
    X.rect(ctx, mx + 17 + jig, my - 8, 2, 8, '#a49d88');         // the cord, going away
  }

  function drawHands(ctx, g, t) {
    const P = PD.art.skinFor(g.save.cos).P;
    const H = buildHands(P);
    const drum = Math.sin(t * 3) > 0.6 ? 1 : (Math.sin(t * 2.1) > 0.8 ? 2 : 0);
    const f = S.typeT > 0 ? (S.hand ? 1 : 2) : drum;
    const bang = S.press > 0.4 ? 3 : 0;
    // left hand, splayed over the keys
    ctx.save();
    ctx.translate(140, 214 + bang);
    ctx.rotate(0.1);
    ctx.scale(-1, 1);
    ctx.drawImage(H.frames[f], -H.w / 2, 0, H.w, H.h);
    ctx.restore();
    // right hand, riding the mouse it is far too big for
    ctx.save();
    ctx.translate(378 + Math.round(Math.sin(t * 2) * 2), 210 + bang);
    ctx.rotate(-0.08);
    ctx.drawImage(H.frames[S.typeT > 0 ? 1 : 0], -H.w / 2, 0, H.w, H.h);
    ctx.restore();
    // shadow of him leaning in
    ctx.globalAlpha = 0.22;
    X.rect(ctx, 0, VH - 8, VW, 8, '#000000');
    ctx.globalAlpha = 1;
  }

  function touchMode() { return 'ui'; }

  PD.desk = { enter, update, draw, close, touchMode, S, SX, SY, SW, SH };
})(window.PD);
