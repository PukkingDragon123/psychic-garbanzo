/* HOME.

   Two places. OUTSIDE is a small round moon -- a ball a couple of hundred
   pixels across, floating whole in the middle of the screen with stars either
   side of it, your rock house on top and your dumb UFO parked alongside. You
   walk over the curve of it and the horizon falls away at both ends.

   INSIDE is one very small room: the stolen computer, and a brain in a jar of
   acid that knows everything and will sell you some of it. Nothing else except
   the mess. No bed. Walk to the door and press E to go through, either way.

   The first time you go in there is a very fat rat eating your cheese. Give it
   the cheese and it is yours forever. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const A = PD.audio;
  const FX = PD.fx;
  const D = PD.data;
  const AH = PD.arthome;
  const X = PD.pxd;

  const VW = 480, VH = 270;
  /* THE MOON. Its centre is a long way below the bottom of the screen, so what
     you get is the top of it -- but you are standing much closer to it than a
     toy globe: the curve is gentle, the limb runs off the bottom corners of
     the screen, and the surface is LUMPY rather than a clean arc. It is a
     chipped rock, not a ball. Outside is exactly one screen wide and never
     scrolls -- the moon is an object you look at, not a corridor. */
  const MOON = { cx: 240, cy: 960, r: 820 };
  const OUT_W = 780, IN_W = 232;
  const WALK = 172;                  // how far round the curve he can get
  const FLOOR = 216;                 // the room floor, inside
  const CEIL = 124;                  // the underside of the rock roof, inside
  const GRAV = 300;                  // low: everything here is bouncy

  const S = { scene: 'out', deck: 0, t: 0, ratSeen: 0, sleep: 0, swing: 0, beat: 0, dance: 0, kissT: 2,
    tip: 0, pole: 0, chatT: 1.5, drunk: 0 };
  let g0 = null;                     // the running game, for view() between frames

  function roomW() {
    if (S.scene === 'out') return OUT_W;
    if (S.scene === 'club') return CLUB_W;
    if (S.scene === 'hub') return HUB_W;
    return IN_W;
  }
  /* A room narrower than the screen sits in the middle of it. */
  function camWant() {
    const w = roomW();
    if (w <= VW) return (w - VW) / 2;
    return U.clamp(P.x - VW / 2, 0, w - VW);
  }
  function bounds() {
    if (S.scene === 'out') return [MOON.cx - WALK, MOON.cx + 400];
    if (S.scene === 'club') return [16, CLUB_W - 16];
    if (S.scene === 'hub') return [30, HUB_W - 30];
    return [20, IN_W - 20];
  }

  /* Flat indoors. Outside it is the top of a big circle plus a stack of
     wobbles, rasterised to whole pixels so the ground he stands on is exactly
     the ground you can see. The wobbles are what stop it being a ball: ridges,
     a dip and a shoulder, all deterministic. */
  function lumpAt(x) {
    return Math.sin(x * 0.0131 + 0.4) * 6
      + Math.sin(x * 0.0327 + 1.7) * 3.5
      + Math.sin(x * 0.0713 + 2.9) * 2;
  }
  function groundY(x) {
    if (S.scene === 'hub') return DECK_Y[S.deck];
    if (S.scene !== 'out') return FLOOR;
    const dx = x - MOON.cx;
    if (Math.abs(dx) >= MOON.r) return 1e4;
    return Math.round(MOON.cy - Math.sqrt(MOON.r * MOON.r - dx * dx) - lumpAt(x));
  }
  /* The slope under his feet, for dust and for standing on a hill. */
  function slopeAt(x) {
    return (groundY(x + 3) - groundY(x - 3)) / 6;
  }

  const P = {
    x: 240, y: FLOOR, vx: 0, vy: 0, face: 1, walk: 0,
    near: null, target: null, autoUse: null, lock: 0,
    roll: 0, rollA: 0, land: 0, air: 0, hop: 0, sweep: 0
  };
  const UI = { mode: null, msg: '', msgT: 0 };

  /* ------------------------------------------------------------------ spots */
  const OUT_SPOTS = [
    { id: 'door', x: 172, r: 38, name: 'THE ROCK HOUSE', sub: 'GO INSIDE' },
    { id: 'ufo', x: 320, r: 42, name: 'YOUR DUMB UFO', sub: 'GO AND HIT A PLANET' }
  ];
  const IN_SPOTS = [
    { id: 'pc', x: 40, r: 32, name: 'THE COMPUTER', sub: 'ABAY IS ON IT' },
    { id: 'brain', x: 146, r: 34, name: 'THE BRAIN IN THE JAR', sub: 'IT KNOWS THINGS. BUY SOME' },
    { id: 'exit', x: 212, r: 22, name: 'THE DOOR', sub: 'GO OUTSIDE' }
  ];
  const RAT_SPOT = { id: 'rat', x: 76, r: 26, name: 'A VERY FAT RAT', sub: 'GIVE HIM THE CHEESE' };
  const SPOTS = OUT_SPOTS;                    // game.js docks you next to the UFO

  /* ------------------------------------------------------------------ the tip
     Mr Chum bought you a moon. He did not mention that it had been used as a
     tip for a hundred years. Twelve heaps, a bitmask in the save of which ones
     you have shifted, and under the last of them the thing that makes the
     whole job worth doing. */
  const TRASH = [
    { x: 100, k: 1 }, { x: 124, k: 3 }, { x: 148, k: 0 }, { x: 200, k: 2 },
    { x: 224, k: 1 }, { x: 248, k: 3 }, { x: 272, k: 0 }, { x: 292, k: 2 },
    { x: 350, k: 1 }, { x: 368, k: 3 }, { x: 388, k: 2 }, { x: 404, k: 0 }
  ];
  const ALL_CLEAN = (1 << TRASH.length) - 1;
  const CLUB_X = 396;                          // what the last heap was sitting on

  function cleaned(g, i) { return ((g.save.trash || 0) >> i) & 1; }
  function trashLeft(g) {
    let n = 0;
    for (let i = 0; i < TRASH.length; i++) if (!cleaned(g, i)) n++;
    return n;
  }
  function moonClean(g) { return (g.save.trash || 0) === ALL_CLEAN; }
  const TRASH_NAMES = ['A BAG OF SOMEBODY ELSE\'S PROBLEM', 'A DEAD SATELLITE',
    'A DRUM OF SOMETHING GREEN', 'A CRATE AND SOME BONES'];

  /* --------------------------------------------------------------- scenery */
  const OUT_ROCKS = [];
  for (let i = 0; i < 22; i++) OUT_ROCKS.push({ x: MOON.cx + (U.hash2(i, 3) * 2 - 1) * 244, k: (U.hash2(i, 9) * 3) | 0 });
  const CRATERS = [];
  for (let i = 0; i < 14; i++) CRATERS.push({ x: MOON.cx + (U.hash2(i, 21) * 2 - 1) * 240, r: 5 + U.hash2(i, 33) * 15 });
  const RUINS = [{ x: 56, k: 2 }, { x: 428, k: 1 }];
  const MOTES = [];
  for (let i = 0; i < 26; i++) MOTES.push({ x: U.hash2(i, 61), y: 60 + U.hash2(i, 67) * 150, r: U.hash2(i, 71), sp: 2 + U.hash2(i, 73) * 7 });

  /* Inside: the mess, and where each piece of it lies. */
  const IN_PROPS = [
    { s: 'fridge', x: 100 },
    { s: 'junk0', x: 8 },
    { s: 'junk1', x: 72 },
    { s: 'junk2', x: 226 },
    { s: 'litter0', x: 26 },
    { s: 'litter1', x: 60 },
    { s: 'litter2', x: 134 },
    { s: 'litter3', x: 104 },
    { s: 'litter0', x: 190 },
    { s: 'litter2', x: 84 },
    { s: 'tape', x: 76, lift: 13 }
  ];
  const POSTERS = [{ k: 0, x: 22, y: 148 }, { k: 1, x: 64, y: 144 }, { k: 2, x: 196, y: 152 }];
  const DRIPS = [{ x: 130, t: 0 }, { x: 34, t: 1.7 }];

  /* ----------------------------------------------------------------- the club
     Whatever this moon was before it was a tip, somebody ran a club on it, and
     it is still down there with the lights on. It is another `scene`, like the
     inside of the house, so it inherits the walking, the camera, the prompt
     and the touch controls for nothing. */
  const CLUB_W = 1440, CLUB_CEIL = 84;
  const CLUB_SPOTS = [
    { id: 'clubout', x: 26, r: 24, name: 'THE WAY OUT', sub: 'BACK UP TO THE MOON' },
    /* Every spot stands a little to the LEFT of the thing it names. Put it on
       top and you walk into the middle of the prop and your own head hides it. */
    { id: 'dj', x: 288, r: 24, name: 'DJ GORB', sub: 'ASK HIM FOR SOMETHING' },
    { id: 'dance', x: 470, r: 64, name: 'THE DANCEFLOOR', sub: 'HAVE A GO' },
    { id: 'stage', x: 596, r: 30, name: 'THE DANCER', sub: 'TIP THEM. IT IS A TUESDAY' },
    { id: 'bar', x: 750, r: 34, name: 'THE BAR', sub: 'BUY SOMETHING SILLY' },
    { id: 'slot0', x: 1104, r: 24, name: 'LUX', sub: 'ONE MORE GO. $200' },
    { id: 'slot1', x: 1164, r: 24, name: 'NOVA', sub: 'THIS ONE IS DUE. $200' },
    { id: 'slot2', x: 1224, r: 24, name: 'HOT', sub: 'LAST ONE. $200' }
  ];
  /* Booths down the back wall, in the parts of the room nobody dances in. */
  const BOOTHS = [
    { x: 186 }, { x: 250 }, { x: 880 }, { x: 950 }, { x: 1014 }
  ];
  /* Four of them never made it to the floor. */
  const SEATS = [
    { x: 770, k: 10 }, { x: 796, k: 11 }, { x: 214, k: 14 }, { x: 962, k: 16 }
  ];
  /* Eight regulars. They wander, they stop, they dance, and now and then two
     of them find each other and the tentacles get involved. */
  const CLUBBERS = [];
  for (let i = 0; i < 16; i++) {
    CLUBBERS.push({ x: 330 + i * 38, vx: 0, k: i, t: U.rand(0, 6), face: i % 2 ? 1 : -1,
      dance: U.rand(0, 3), kiss: 0, mate: -1, wait: U.rand(0, 2),
      blink: U.rand(0, 4), say: null, sayT: 0, drink: i % 3 === 0 ? i % 4 : -1 });
  }

  /* -------------------------------------------------------------- the patter
     Nobody in here has anything useful to say and all of them say it. Lines
     surface over whoever happens to be standing still. */
  const CHATTER = [
    'I ONLY CAME OUT FOR ONE', 'IS THIS SONG THE LAST SONG',
    'MY PLANET GOT DRILLED LAST WEEK', 'HE IS A SHARK. LITERALLY.',
    'THEY CALL THIS MUSIC', 'I CAME HERE IN A BIN',
    'NINE HEARTS. ALL OF THEM HURT.', 'WHOSE TENTACLE IS THIS',
    'THE BARMAN KNOWS MY ORDER', 'NOT DRUNK. GASEOUS.',
    'THEY PLAYED THIS ONE ALREADY', 'YOU CLEANED UP OUT THERE? FINALLY.',
    'I LOST A MOON IN A CARD GAME', 'NICE SUIT. I MEAN IT. NICE SUIT.',
    'THE SHARK OWNS THIS PLACE NOW', 'I WORK MONDAYS. DO NOT ASK.',
    'SOMEBODY HAS EATEN ALL THE ICE', 'MY EX IS HERE. ALL FOUR OF HER.'
  ];
  const DJ_LINES = [
    'DJ GORB HAS TWO RECORDS. THIS IS THE OTHER ONE.',
    'HE NODS. THE SONG DOES NOT CHANGE.',
    'HE SAYS IT IS ALL ONE SONG IF YOU NEVER STOP IT.',
    'HE TAKES THE REQUEST. HE PUTS IT UNDER THE DECK.',
    'HE HAS NOT BLINKED SINCE TUESDAY.'
  ];
  const DANCER_LINES = [
    'THEY TAKE THE MONEY WITHOUT BREAKING EYE CONTACT.',
    'THEY SPIN ONCE. IT IS THE BARE MINIMUM AND THEY KNOW IT.',
    'THEY SAY THEY HAVE A DEGREE IN ORBITAL MECHANICS.',
    'THEY ASK IF YOU ARE THE ONE WHO OWES THE SHARK MONEY.',
    'THEY DO THE UPSIDE DOWN ONE. SOMEBODY DROPS A DRINK.',
    'THEY POINT AT THE POLE AND SAY THE POLE DOES THE WORK.'
  ];
  const BOTTLES = [];
  for (let i = 0; i < 9; i++) BOTTLES.push({ x: 274 + (i % 5) * 7, y: (i / 5) | 0, k: i % 4 });

  function beatOf(t) { return ((t * 2.2) % 1); }

  function goClub(g, story) {
    S.scene = 'club';
    place(g, story ? 120 : CLUB_SPOTS[0].x + 30);
    if (story) { UI.mode = null; S.drunk = 0.45; say('YOU ARE UP. YOU ARE NOT WELL. THE BACK OF THE ROOM IS THAT WAY.'); }
    A.sfx.tone(90, { type: 'square', to: 60, dur: 0.3, vol: 0.1 });
  }
  function leaveClub(g) {
    S.scene = 'out';
    place(g, CLUB_X - 24);
    A.sfx.tone(220, { type: 'square', to: 420, dur: 0.2, vol: 0.08 });
  }

  function haveADance(g) {
    S.dance = 4.2;
    P.lock = 0.2;
    say('YOU ARE DANCING. NOBODY IS STOPPING YOU.');
    A.sfx.tone(440, { type: 'square', to: 880, dur: 0.12, vol: 0.07 });
    for (const c of CLUBBERS) { c.dance = U.rand(3, 5); c.wait = 0; }
    if (!g.save.seen.danced) {
      g.save.seen.danced = 1;
      g.save.thots = (g.save.thots || 0) + 40;
      FX.text(P.x, P.y - 50, '+40 THOTS', '#4cff9a', 1);
      g.saveGame();
    }
  }

  const DRINKS = [
    ['A GLASS OF MOON', 'IT IS JUST DUST AND WATER. YOU FEEL WORSE.'],
    ['SOMETHING PURPLE', 'IT WINKS AT YOU ON THE WAY DOWN.'],
    ['THE HOUSE SPECIAL', 'IT IS CALLED THE LOAN SHARK. THAT IS NOT FUNNY.'],
    ['A PINT OF BATTERY', 'YOUR TEETH ARE HUMMING. WORTH IT.'],
    ['WATER', 'THE BARMAN IS VISIBLY DISAPPOINTED IN YOU.']
  ];
  function buyADrink(g) {
    if (g.save.credits < 500) { say('FIVE HUNDRED. YOU HAVE NOT GOT IT.'); A.sfx.deny(); return; }
    g.save.credits -= 500;
    const d = U.pick(DRINKS);
    say(d[0] + '. ' + d[1]);
    FX.text(P.x, P.y - 46, d[0], '#ffd34d', 1);
    FX.stars(P.x, P.y - 30, 10, '#ffd34d');
    A.sfx.tone(660, { type: 'triangle', to: 1200, dur: 0.18, vol: 0.07 });
    g.saveGame();
  }

  /* They mill about, and every so often two of them stop milling. */
  /* Two hundred credits, straight into a sequinned waistband, and whatever
     they feel like telling you about it. */
  function tipTheDancer(g) {
    if (g.save.credits < 200) { say('TWO HUNDRED. YOU HAVE NOT GOT IT. THEY CAN TELL.'); A.sfx.deny(); return; }
    g.save.credits -= 200;
    S.tip = 1.8;
    say(U.pick(DANCER_LINES));
    FX.text(456, FLOOR - 96, '-$200', '#ffd34d', 1);
    for (let i = 0; i < 16; i++) {
      FX.spawn({ x: 456 + U.rand(-16, 16), y: FLOOR - 80, vx: U.rand(-70, 70), vy: U.rand(-120, -30),
        life: 1.3, size: 2, glow: 1, color: i % 2 ? '#ffd34d' : '#ff5fa8', grav: 180, drag: 1 });
    }
    A.sfx.tone(880, { type: 'square', to: 1320, dur: 0.14, vol: 0.06 });
    g.saveGame();
  }

  function updateClub(dt, g) {
    S.beat += dt;
    S.tip = Math.max(0, S.tip - dt);
    updateSlots(dt, g);
    S.pole += dt * (S.tip > 0 ? 6.5 : 3.2);
    // somebody says something, roughly every couple of seconds
    S.chatT -= dt;
    if (S.chatT <= 0) {
      S.chatT = U.rand(1.6, 3.4);
      const pool = CLUBBERS.filter(c => c.kiss <= 0 && c.sayT <= 0);
      if (pool.length) { const c = U.pick(pool); c.say = U.pick(CHATTER); c.sayT = U.rand(2.2, 3.4); }
    }
    for (let i = 0; i < CLUBBERS.length; i++) {
      const c = CLUBBERS[i];
      c.t += dt;
      c.sayT = Math.max(0, c.sayT - dt);
      if (c.sayT <= 0) c.say = null;
      c.blink -= dt;
      if (c.blink < -0.12) c.blink = U.rand(2.5, 6);
      if (c.kiss > 0) {
        c.kiss -= dt; c.vx = 0;
        // shuffle right up to whoever it is. Standing a foot apart pulling a
        // face at each other did not read as a kiss at all.
        const m = CLUBBERS[c.mate];
        if (m) {
          const mid = (c.x + m.x) / 2;
          c.x = U.damp(c.x, mid - c.face * 7, 0.2, dt);
          if (U.chance(dt * 3.5) && c.mate > i) {
            FX.spawn({ x: mid + U.rand(-5, 5), y: FLOOR - 36, vx: U.rand(-12, 12), vy: U.rand(-34, -14),
              life: 1.4, size: 2, glow: 1, color: '#ff5fa8', grav: -14, drag: 1 });
          }
        }
        if (c.kiss <= 0) c.mate = -1;
        continue;
      }
      if (c.dance > 0) { c.dance -= dt; c.vx = 0; continue; }
      c.wait -= dt;
      if (c.wait <= 0) {
        c.wait = U.rand(1.4, 4);
        const r = U.rand();
        if (r < 0.34) { c.dance = U.rand(2, 5); c.vx = 0; }
        else { c.vx = U.rand(0.5) < 0.5 ? -18 : 18; c.face = Math.sign(c.vx); }
      }
      c.x += c.vx * dt;
      if (c.x < 246) { c.x = 246; c.vx = Math.abs(c.vx); c.face = 1; }
      if (c.x > 400) { c.x = 400; c.vx = -Math.abs(c.vx); c.face = -1; }
    }
    // pair off whoever happens to be standing next to somebody
    S.kissT -= dt;
    if (S.kissT <= 0) {
      S.kissT = U.rand(2.2, 5);
      const free = CLUBBERS.filter(c => c.kiss <= 0);
      for (const a of free) {
        const b = free.find(o => o !== a && o.kiss <= 0 && Math.abs(o.x - a.x) < 46);
        if (!b || a.kiss > 0) continue;
        const d = Math.sign(b.x - a.x) || 1;
        a.face = d; b.face = -d;
        a.kiss = b.kiss = U.rand(1.8, 3.2);
        a.mate = CLUBBERS.indexOf(b); b.mate = CLUBBERS.indexOf(a);
        const mx = (a.x + b.x) / 2;
        for (let h = 0; h < 5; h++) {
          FX.spawn({ x: mx + U.rand(-6, 6), y: FLOOR - 34, vx: U.rand(-16, 16), vy: U.rand(-42, -18),
            life: 1.3, size: 2, glow: 1, color: '#ff5fa8', grav: -20, drag: 1 });
        }
        A.sfx.tone(900, { type: 'sine', to: 1300, dur: 0.09, vol: 0.03 });
        break;
      }
    }
    if (S.dance > 0) {
      S.dance -= dt;
      if (U.chance(0.3)) FX.stars(P.x + U.rand(-14, 14), P.y - U.rand(10, 40), 1, U.pick(['#ff5fa8', '#7ef9ff', '#ffd34d']));
    }
  }

  /* ---------------------------------------------------------------- the rat */
  const rat = { x: RAT_SPOT.x, y: FLOOR, vx: 0, t: 0, face: -1, hop: 0, chew: 0 };

  let star = null;

  function enter(g, atX) {
    g0 = g;
    S.scene = 'out';
    place(g, atX === undefined ? OUT_SPOTS[1].x : atX);
    if (!star) {
      star = [];
      for (let i = 0; i < 220; i++) star.push({ x: U.hash2(i, 11), y: U.hash2(i, 17), b: U.hash2(i, 23) });
    }
  }

  function place(g, atX) {
    const bd = bounds();
    P.x = U.clamp(atX, bd[0], bd[1]);
    P.y = groundY(P.x); P.vx = 0; P.vy = 0;
    P.target = null; P.autoUse = null; P.roll = 0; P.hop = 0;
    P.lock = 0.28;
    UI.mode = null;
    g.intCam = camWant();
    rat.x = g.save.pet ? P.x - 30 : RAT_SPOT.x;
    rat.y = groundY(rat.x);
  }

  function goIn(g) {
    S.scene = 'in';
    place(g, IN_SPOTS[2].x - 26);
    A.sfx.tone(150, { type: 'square', to: 90, dur: 0.2, vol: 0.08 });
    if (!g.save.pet && !S.ratSeen) {
      S.ratSeen = 1;
      say('THERE IS A VERY FAT RAT EATING YOUR CHEESE.');
      A.sfx.tone(1600, { type: 'square', to: 700, dur: 0.18, vol: 0.07 });
    }
  }
  function goOut(g) {
    S.scene = 'out';
    place(g, OUT_SPOTS[0].x + 34);
    A.sfx.tone(220, { type: 'square', to: 420, dur: 0.2, vol: 0.08 });
  }

  function say(m) { UI.msg = m; UI.msgT = 3.2; }

  function spots(g) {
    if (S.scene === 'hub') return hubSpots(g);
    if (S.scene === 'club') {
      // the night the game opens there is one machine and one reason to be here
      if (g.save.story === 1) return [{ id: 'universal', x: 1344, r: 66,
        name: 'THE UNIVERSAL', sub: 'TEN IN A ROW TAKES THE LOT' }];
      return CLUB_SPOTS;
    }
    if (S.scene === 'in') return g.save.pet ? IN_SPOTS : IN_SPOTS.concat([RAT_SPOT]);
    const out = OUT_SPOTS.slice().concat(buildPads(g));
    // the shuttle pad is poured the moment the tip is gone, same as the others
    if (moonClean(g)) out.push({ id: 'port', x: 366, r: 28,
      name: 'THE PORT SHUTTLE', sub: 'SOMEBODY ELSE\'S PLANET' });
    for (let i = 0; i < TRASH.length; i++) {
      if (cleaned(g, i)) continue;
      out.push({ id: 'trash', i, x: TRASH[i].x, r: 17,
        name: TRASH_NAMES[TRASH[i].k], sub: 'CLEAN IT UP' });
    }
    if (moonClean(g)) out.push({ id: 'club', x: CLUB_X, r: 26,
      name: 'THE CLUB', sub: 'IT WAS UNDER THE BINS' });
    return out;
  }

  function nearest(g) {
    let best = null, bd = 1e9;
    for (const s of spots(g)) {
      const d = Math.abs(s.x - P.x);
      if (d < s.r && d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function use(g, s) {
    if (!s) return;
    if (FX.wipeActive()) return;
    // where on the screen the iris should close on: the thing he pressed E at
    const at = toScreen(s.x - Math.round(g.intCam), groundY(s.x) - 20);
    const fx2 = U.clamp(at.x, 0, VW), fy2 = U.clamp(at.y, 0, VH);
    // a door is a door: the same shutter both ways, so the house has its own
    // punctuation and the moon has the slime
    if (s.id === 'door') { P.lock = 1; g.wipeTo(240, 135, '#2a2438', () => goIn(g), 'bars', 0.56); return; }
    if (s.id === 'exit') { P.lock = 1; g.wipeTo(240, 135, '#2a2438', () => goOut(g), 'bars', 0.56); return; }
    if (s.id === 'ufo') { A.sfx.dock(); g.openChart(); return; }
    if (s.id === 'pc') {
      P.lock = 1;
      g.wipeTo(fx2, fy2, '#1b2430', () => { g.state = 'desk'; PD.desk.enter(g); }, 'bars');
      return;
    }
    if (s.id === 'brain') {
      P.lock = 1;
      g.wipeTo(fx2, fy2, '#12503a', () => { PD.mind.open(g); }, 'static', 0.7);
      return;
    }
    if (s.id === 'rat') { feedRat(g); return; }
    if (s.id === 'trash') { sweep(g, s.i); return; }
    if (s.id === 'club') { P.lock = 1; g.wipeTo(240, 135, '#2a0c30', () => goClub(g), 'bars', 0.62); return; }
    if (s.id === 'clubout') { P.lock = 1; g.wipeTo(240, 135, '#2a0c30', () => leaveClub(g), 'bars', 0.62); return; }
    if (s.id === 'dance') { haveADance(g); return; }
    if (s.id === 'bar') { buyADrink(g); return; }
    if (s.id === 'dj') {
      say(U.pick(DJ_LINES));
      A.sfx.tone(180, { type: 'square', to: 120, dur: 0.2, vol: 0.08 });
      for (const c of CLUBBERS) if (U.chance(0.5)) c.dance = U.rand(2, 4);
      return;
    }
    if (s.id === 'stage') { tipTheDancer(g); return; }
    if (s.id.indexOf('slot') === 0) { playSlot(g, +s.id.slice(4)); return; }
    if (s.id === 'universal') { P.lock = 1; PD.chum.enterGamble(g); return; }
    if (s.bid) { openBuild(g, s.bid); return; }
    if (s.id === 'tele') { openTele(g); return; }
    if (s.sid) { openStall(g, s.sid); return; }
    if (s.zip) { startZip(g, s.zip); return; }
    if (s.id === 'hubout') { P.lock = 1; g.wipeTo(240, 135, '#0a1a2a', () => leaveHub(g), 'sweep', 0.66); return; }
    if (s.id === 'port') { P.lock = 1; g.wipeTo(240, 135, '#0a1a2a', () => goHub(g), 'sweep', 0.66); return; }

  }

  /* One heap, gone. He does not bend down; he sets about it with the drill,
     which is the only tool he owns and much too big for the job. */
  function sweep(g, i) {
    if (cleaned(g, i)) return;
    g.save.trash = (g.save.trash || 0) | (1 << i);
    const th = TRASH[i];
    const gy = groundY(th.x);
    P.lock = 0.45; P.sweep = 0.5;
    /* Clearing a tip is not a living. It pays pocket change and, now and then,
       whatever was underneath -- which you still have to sell. The money in
       this game comes out of the ground, not out of the bins. */
    const pay = 18 + Math.round(U.rand(0, 26));
    g.save.credits += pay;
    FX.text(th.x, gy - 40, '+$' + pay, '#8affa0', 0);
    if (U.chance(0.55)) {
      const mid = U.pick([1, 2, 2, 4, 4, 5]);
      const n = U.randInt(1, 3);
      g.save.vault[mid] = (g.save.vault[mid] || 0) + n;
      const mat = PD.data.MAT[mid];
      FX.text(th.x, gy - 54, '+' + n + ' ' + mat.name.toUpperCase(), mat.c[0], 1);
    }
    A.sfx.tone(320, { type: 'square', to: 900, dur: 0.16, vol: 0.07 });
    FX.puff(th.x, gy - 10, 16, '#8e86a8', 1.3);
    FX.dust(th.x, gy, 10, '#6b6480', 24);
    FX.ring(th.x, gy - 8, 3, 30, 0.5, '#c9bce8', 2);
    for (let k = 0; k < 14; k++) {
      FX.spawn({ x: th.x + U.rand(-14, 14), y: gy - 12, vx: U.rand(-70, 70), vy: U.rand(-150, -40),
        life: 1.0, size: 2, color: k % 3 ? '#6b6480' : '#8a5a3a', grav: 220, drag: 1 });
    }
    const left = trashLeft(g);
    if (left > 0) {
      say(left === 1 ? 'ONE HEAP LEFT. THE MOON IS ALMOST YOURS.'
        : left + ' HEAPS LEFT ON YOUR OWN MOON.');
      PD.chum.call(g, 'tip');
    } else {
      say('THE MOON IS CLEAN. THERE WAS A CLUB UNDER THE BINS.');
      A.sfx.fanfare && A.sfx.fanfare();
      FX.text(CLUB_X, groundY(CLUB_X) - 56, 'A CLUB?', '#ff5fa8', 2);
      FX.ring(CLUB_X, groundY(CLUB_X) - 20, 4, 70, 1.1, '#ff5fa8', 3);
      for (let k = 0; k < 40; k++) {
        FX.spawn({ x: CLUB_X + U.rand(-20, 20), y: groundY(CLUB_X) - 16, vx: U.rand(-120, 120),
          vy: U.rand(-220, -60), life: 1.5, size: 2, glow: 1,
          color: k % 3 === 0 ? '#ff5fa8' : (k % 3 === 1 ? '#7ef9ff' : '#ffd34d'), grav: 180, drag: 1 });
      }
      PD.chum.call(g, 'club');
    }
    g.saveGame();
  }

  /* Hand the cheese over. He is yours now; there is no undoing this. */
  function feedRat(g) {
    g.save.pet = 1;
    g.saveGame();
    rat.hop = 1;
    say('HE IS YOURS NOW. HE IS CALLED BRENDA.');
    A.sfx.fanfare && A.sfx.fanfare();
    FX.text(rat.x, rat.y - 40, 'BRENDA', '#ff9ecb', 2);
    for (let i = 0; i < 26; i++) {
      FX.spawn({ x: rat.x + U.rand(-16, 16), y: rat.y - 16, vx: U.rand(-50, 50), vy: U.rand(-110, -30),
        life: 1.1, size: 2, color: i % 2 ? '#ff9ecb' : '#ffd34d', grav: 130, drag: 1, glow: 1 });
    }
    FX.ring(rat.x, rat.y - 14, 4, 38, 0.7, '#ff9ecb', 2);
  }

  function leaveDesk(g) {
    g.state = 'home';
    S.scene = 'in';
    P.lock = 0.32;
    P.x = IN_SPOTS[0].x + 26; P.y = groundY(P.x); P.vx = 0; P.vy = 0; P.face = -1;
    g.intCam = camWant();
  }

  /* What he has decided you ought to be doing, in the order he has decided it.
     The list is rebuilt whenever the scene or the state of the tip changes,
     which starts the tour over from the top. */
  /* He only leads you anywhere on the night it matters. After that he is a
     shark with an opinion, not a signpost -- the moon is small and you have
     eyes. */
  function leadGoals(g) {
    if (S.scene === 'club' && g.save.story === 1) return [
      { x: 1344, line: 'THE BIG ONE. AT THE BACK. YOU KNOW THE ONE.' }
    ];
    if (S.scene !== 'out' || g.save.seen && g.save.seen.chum_tip) return [];
    const out = [];
    for (let i = 0; i < TRASH.length && out.length < 1; i++) {
      if (!cleaned(g, i)) out.push({ x: TRASH[i].x, line: 'THAT ONE. I HAVE WAITED BEFORE.' });
    }
    return out;
  }

  /* ====================================================================== THE PORT
     Somebody else's planet, and the only place in reach where the money goes
     the other way. Three decks stacked in the same frame so you can always see
     the one above and the one below you: the DOCKS at the bottom with the
     freighters on them, the MARKET in the middle, and the TERRACE on top where
     the people who own the freighters stand and look at them.

     You do not jump between decks. There is a teleporter at the west end that
     goes up, and two ziplines that go down, and that asymmetry is the whole
     shape of the place: getting up costs you a walk, getting down is free and
     quick and slightly frightening. */
  const HUB_W = 1240;
  const DECK_Y = [238, 158, 78];
  const DECK_NAME = ['THE DOCKS', 'THE MARKET', 'THE TERRACE'];
  const TELE_X = 96;
  const ZIPS = [
    { from: 2, x0: 940, to: 1, x1: 660 },
    { from: 1, x0: 1040, to: 0, x1: 740 }
  ];

  /* What you can buy up there. Three of them are a one-off that never comes
     off again; the fourth takes the whole vault off your hands on the spot and
     pays over the odds for the privilege of not having to list it. */
  const STALLS = [
    { id: 'lungs', deck: 1, x: 300, name: 'THE BREATH MERCHANT', glyph: 'o2',
      tag: 'A BIGGER PAIR. THEY ARE NOT YOURS. NOBODY ASKS.',
      cost: 62000, once: 1, effect: 'PERMANENT +40 AIR' },
    { id: 'grip', deck: 1, x: 430, name: 'THE GRAB HOUSE', glyph: 'hand',
      tag: 'MAGNETS. VERY ILLEGAL MAGNETS.',
      cost: 88000, once: 1, effect: 'PERMANENT +22 PICKUP REACH' },
    { id: 'papers', deck: 2, x: 430, name: 'THE PERMIT OFFICE', glyph: 'build',
      tag: 'A STAMP. IT MAKES THE BUILDING CHEAPER. DO NOT ASK WHY.',
      cost: 120000, once: 1, effect: 'BASE COSTS DROP BY A FIFTH' },
    { id: 'fence', deck: 1, x: 560, name: 'THE FENCE', glyph: 'sell',
      tag: 'NO LISTING. NO WAITING. NO QUESTIONS.',
      cost: 0, once: 0, effect: 'SELLS YOUR WHOLE VAULT, +10%' }
  ];
  const STALL_OF = {};
  for (const q of STALLS) STALL_OF[q.id] = q;

  /* The rest of it is people doing business you are not part of. */
  const HUB_PROPS = [
    { deck: 0, x: 240, kind: 'cantina', name: 'THE WET DECK' },
    { deck: 0, x: 520, kind: 'crate' }, { deck: 0, x: 566, kind: 'crate' },
    { deck: 0, x: 860, kind: 'freighter' },
    { deck: 1, x: 690, kind: 'stallX' }, { deck: 1, x: 780, kind: 'stallX' },
    { deck: 1, x: 900, kind: 'stallX' },
    { deck: 2, x: 620, kind: 'bank', name: 'THE FIRST BANK OF NOWHERE' },
    { deck: 2, x: 860, kind: 'scope' }
  ];

  const HUBC = [];                                  // everybody else
  (function buildHubCrowd() {
    for (let d = 0; d < 3; d++) {
      const n = [13, 17, 9][d];
      for (let i = 0; i < n; i++) {
        HUBC.push({
          deck: d, x: 60 + (HUB_W - 140) * ((i + 0.5) / n) + (U.hash2(d * 31 + i, 5) - 0.5) * 50,
          k: (d * 7 + i * 3) % 20, ph: U.hash2(i * 5 + d, 19) * U.TAU,
          dir: U.hash2(i, 7) > 0.5 ? 1 : -1, sp: 7 + U.hash2(i, 11) * 13,
          wait: U.hash2(i, 13) * 5, t: 0
        });
      }
    }
  })();
  function updateHubCrowd(dt) {
    for (const c of HUBC) {
      c.t += dt;
      if (c.wait > 0) { c.wait -= dt; continue; }
      c.x += c.dir * c.sp * dt;
      if (c.x < 50) { c.x = 50; c.dir = 1; c.wait = U.rand(0.6, 3); }
      if (c.x > HUB_W - 50) { c.x = HUB_W - 50; c.dir = -1; c.wait = U.rand(0.6, 3); }
      if (U.chance(dt * 0.14)) { c.wait = U.rand(0.8, 3.4); c.dir = -c.dir; }
    }
  }

  const HUB = { ride: null, t: 0, arrive: 0, panel: null, sel: 0 };

  function goHub(g) {
    S.scene = 'hub'; S.deck = 0; S.t = 0;
    HUB.ride = null; HUB.panel = null; HUB.arrive = 0;
    UI.mode = null;
    place(g, 150);
    g.intCam = camWant();
    PD.chum.call(g, 'hub');
    A.sfx.tone(240, { type: 'triangle', to: 520, dur: 0.4, vol: 0.08 });
  }
  function leaveHub(g) {
    S.scene = 'out'; S.deck = 0;
    place(g, OUT_SPOTS[1].x + 30);
    g.intCam = camWant();
    A.sfx.tone(420, { type: 'triangle', to: 180, dur: 0.35, vol: 0.08 });
  }

  function hubSpots(g) {
    const out = [];
    out.push({ id: 'tele', x: TELE_X, r: 26, deck: S.deck,
      name: 'THE LIFT', sub: DECK_NAME[S.deck] + '  -  GO UP OR DOWN' });
    if (S.deck === 0) out.push({ id: 'hubout', x: 172, r: 24, deck: 0,
      name: 'YOUR SHUTTLE', sub: 'BACK TO THE MOON' });
    for (const q of STALLS) {
      if (q.deck !== S.deck) continue;
      const bought = q.once && g.save.bought && g.save.bought[q.id];
      out.push({ id: 'stall_' + q.id, sid: q.id, x: q.x, r: 24, deck: q.deck,
        name: q.name, sub: bought ? 'ALREADY YOURS' : (q.cost ? '$' + U.fmt(q.cost) : 'SELL THE LOT') });
    }
    for (const z of ZIPS) {
      if (z.from !== S.deck) continue;
      out.push({ id: 'zip_' + z.from, zip: z, x: z.x0, r: 22, deck: z.from,
        name: 'THE ZIPLINE', sub: 'DOWN TO ' + DECK_NAME[z.to] });
    }
    return out;
  }

  /* ------------------------------------------------------------ the lift
     It does not move. You stand on the plate, it takes the floor out from
     under you, and you are somewhere else. */
  function openTele(g) { HUB.panel = { kind: 'tele', sel: S.deck }; UI.mode = 'hub'; A.sfx.click(); }
  function openStall(g, sid) { HUB.panel = { kind: 'stall', sid: sid }; UI.mode = 'hub'; A.sfx.click(); }
  function closeHubPanel() { HUB.panel = null; UI.mode = null; P.lock = 0.2; A.sfx.click(); }

  function teleportTo(g, d) {
    if (d === S.deck) { closeHubPanel(); return; }
    closeHubPanel();
    P.lock = 1;
    A.sfx.tone(180, { type: 'sine', to: 900, dur: 0.3, vol: 0.09 });
    // it takes the floor out from under you, so the cut is the floor going
    g.wipeTo(240, 135, '#0d3a4a', () => {
      S.deck = d;
      P.y = groundY(P.x); P.vy = 0; P.air = 0;
      HUB.arrive = 0.5;
      FX.ring(TELE_X, DECK_Y[d] - 18, 4, 46, 0.7, '#7ef9ff', 3);
      FX.stars(TELE_X, DECK_Y[d] - 20, 12, '#7ef9ff');
    }, 'pixel', 0.62);
  }

  function buyStall(g, sid) {
    const q = STALL_OF[sid];
    if (!q) return;
    if (q.id === 'fence') {
      const total = Math.round(g.vaultValue() * 1.1 * (1 + g.baseBonus('refinery')));
      if (!total) { A.sfx.deny(); say('NOTHING IN THE SACK. COME BACK HEAVY.'); return; }
      g.save.vault = {};
      const cut = PD.chum.takeCut(g, total);
      g.save.credits += total - cut;
      g.save.totalEarned += total - cut;
      FX.text(q.x, DECK_Y[q.deck] - 54, '+$' + U.fmt(total - cut), '#8affa0', 1);
      if (cut > 0) FX.text(q.x, DECK_Y[q.deck] - 40, '-$' + U.fmt(cut) + ' MR CHUM', '#ff5fa8', 0);
      A.sfx.sell();
      g.saveGame();
      return;
    }
    if (!g.save.bought) g.save.bought = {};
    if (g.save.bought[q.id]) { A.sfx.deny(); return; }
    if (g.save.credits < q.cost) { A.sfx.deny(); say('NOT ENOUGH. HE CAN TELL.'); return; }
    g.save.credits -= q.cost;
    g.save.bought[q.id] = 1;
    FX.text(q.x, DECK_Y[q.deck] - 54, 'BOUGHT', '#ffd34d', 1);
    A.sfx.sell();
    g.saveGame();
  }

  function updateHubPanel(dt, g) {
    const IN = PD.input, m = IN.mouse;
    if (IN.hit('esc') || IN.hit('KeyE')) { closeHubPanel(); return; }
    const pn = HUB.panel;
    if (pn.kind === 'tele') {
      if (IN.hit('up')) pn.sel = Math.min(2, pn.sel + 1);
      if (IN.hit('down')) pn.sel = Math.max(0, pn.sel - 1);
      for (let d = 0; d < 3; d++) {
        const y = 156 - d * 30;
        if (m.inside && m.x > 150 && m.x < 330 && m.y > y && m.y < y + 24) {
          pn.sel = d;
          if (m.leftPressed) { teleportTo(g, d); return; }
        }
      }
      if (IN.hit('enter')) { teleportTo(g, pn.sel); return; }
      return;
    }
    const q = STALL_OF[pn.sid];
    const hitGo = m.inside && m.x > 148 && m.x < 268 && m.y > 176 && m.y < 196;
    const hitNo = m.inside && m.x > 280 && m.x < 348 && m.y > 176 && m.y < 196;
    if (m.leftPressed && hitNo) { closeHubPanel(); return; }
    if ((m.leftPressed && hitGo) || IN.hit('enter')) buyStall(g, q.id);
  }

  function drawHubPanel(ctx, g, t) {
    const pn = HUB.panel;
    ctx.fillStyle = 'rgba(6,4,14,0.82)'; ctx.fillRect(0, 0, VW, VH);
    if (pn.kind === 'tele') {
      X.plate(ctx, 130, 56, 220, 152, '#132436', '#2e5a74', '#06121c', 6);
      X.rect(ctx, 130, 56, 220, 2, '#7ef9ff');
      F.draw(ctx, 'THE LIFT', 240, 66, '#d8fbff', { center: true, shadow: '#06121c' });
      for (let d = 2; d >= 0; d--) {
        const y = 156 - d * 30, here = d === S.deck, on = d === pn.sel;
        X.plate(ctx, 150, y, 180, 24, here ? '#1d3a2a' : (on ? '#1d4a5c' : '#0f1e2a'),
          here ? '#4fd0b0' : (on ? '#7ef9ff' : '#2e4456'), '#06121c', 4);
        F.draw(ctx, DECK_NAME[d], 240, y + 6, here ? '#8affd0' : (on ? '#ffffff' : '#6a8498'),
          { center: true, shadow: false });
        F.draw(ctx, here ? 'YOU ARE HERE' : 'DECK ' + (d + 1), 240, y + 15,
          here ? '#4fd0b0' : '#4a6a80', { center: true, shadow: false });
      }
      F.draw(ctx, 'PICK ONE  -  ESC TO STAY', 240, 190, '#4a6a80', { center: true, shadow: false });
      return;
    }
    const q = STALL_OF[pn.sid];
    const bought = q.once && g.save.bought && g.save.bought[q.id];
    const vault = q.id === 'fence' ? Math.round(g.vaultValue() * 1.1 * (1 + g.baseBonus('refinery'))) : 0;
    const can = q.id === 'fence' ? vault > 0 : (!bought && g.save.credits >= q.cost);
    X.plate(ctx, 120, 62, 240, 146, '#1d1836', '#453c5c', '#0a0614', 6);
    X.rect(ctx, 120, 62, 240, 2, '#ff8ad8');
    PD.glyph.draw(ctx, q.glyph, 130, 70, '#ff8ad8', '#8a3a6a');
    F.draw(ctx, q.name, 240, 74, '#ffd6f0', { center: true, shadow: '#0a0614' });
    F.draw(ctx, q.tag, 240, 92, '#8a86a8', { center: true, shadow: false });
    F.draw(ctx, q.effect, 240, 116, '#ffd34d', { center: true, shadow: false });
    if (q.id === 'fence') {
      F.draw(ctx, vault ? 'THE SACK IS WORTH $' + U.fmt(vault) : 'THE SACK IS EMPTY',
        240, 136, vault ? '#8affa0' : '#8a5a68', { center: true, shadow: false });
    } else {
      F.draw(ctx, bought ? 'YOU ALREADY HAVE THIS' : 'YOU HAVE $' + U.fmt(g.save.credits),
        240, 136, bought ? '#8affd0' : (can ? '#8a86a8' : '#ff8a9a'), { center: true, shadow: false });
    }
    const m = PD.input.mouse;
    const hotGo = m.inside && m.x > 148 && m.x < 268 && m.y > 176 && m.y < 196;
    const hotNo = m.inside && m.x > 280 && m.x < 348 && m.y > 176 && m.y < 196;
    const label = bought ? 'YOURS' : (q.id === 'fence' ? 'SELL THE LOT' : 'BUY  $' + U.fmt(q.cost));
    X.plate(ctx, 148, 176, 120, 20, can ? (hotGo ? '#2f8f6a' : '#1d4a44') : '#2a1a24',
      can ? '#4fd0b0' : '#6a3040', '#04100e', 4);
    F.draw(ctx, label, 208, 182, can ? '#ffffff' : '#8a5a68', { center: true, shadow: false });
    X.plate(ctx, 280, 176, 68, 20, hotNo ? '#3a3060' : '#241f3e', '#6b5a9c', '#0a0614', 4);
    F.draw(ctx, 'LEAVE', 314, 182, '#c9bce8', { center: true, shadow: false });
  }

  /* ---------------------------------------------------------- the zipline
     You hold the handle and gravity does the rest. It is the fastest thing in
     the game and the only one with no button on it. */
  function startZip(g, z) {
    HUB.ride = { z: z, f: 0 };
    P.lock = 9;
    A.sfx.tone(900, { type: 'sawtooth', to: 260, dur: 0.9, vol: 0.07 });
  }
  function updateZip(dt, g) {
    const r = HUB.ride;
    r.f += dt * 0.85;
    const z = r.z;
    const k = U.smoothstep(0, 1, Math.min(1, r.f));
    P.x = U.lerp(z.x0, z.x1, k);
    P.y = U.lerp(DECK_Y[z.from], DECK_Y[z.to], k) - 14 + Math.sin(k * Math.PI) * 6;
    P.face = z.x1 > z.x0 ? 1 : -1;
    if (U.chance(dt * 30)) FX.stars(P.x, P.y - 10, 1, '#7ef9ff');
    if (r.f >= 1) {
      S.deck = z.to;
      P.y = groundY(P.x); P.vy = 0; P.air = 0; P.lock = 0.25;
      HUB.ride = null;
      FX.dust(P.x, P.y, 6, '#8e86a8', 18);
      A.sfx.tone(160, { type: 'triangle', to: 90, dur: 0.12, vol: 0.07 });
    }
  }

  /* ------------------------------------------------------------- drawing it
     The decks are drawn back to front: the city behind, then the deck above
     you with its underside showing, then yours, then the one below with its
     crowd small and dim. You can always see where you are going next. */
  function hubCity(ctx, t, cam) {
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, '#0e0824'); grd.addColorStop(0.5, '#2a1246'); grd.addColorStop(1, '#4a1a44');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    // a gas giant with a ring, low and enormous
    const px = 360 - cam * 0.04;
    X.blob(ctx, px, 40, 96, 72, '#6a3a86');
    X.blob(ctx, px - 22, 20, 52, 30, '#8a52a6');
    X.blob(ctx, px + 30, 58, 34, 20, '#52286a');
    ctx.globalAlpha = 0.5;
    X.blob(ctx, px, 52, 150, 8, '#c9a0ff');
    X.blob(ctx, px, 52, 110, 4, '#2a1246');
    ctx.globalAlpha = 1;
    // towers, two ranks, running off both ends
    for (let L = 0; L < 2; L++) {
      const sp = [0.1, 0.24][L], col = ['#1a0e30', '#261444'][L], lit = ['#2e1a4e', '#3e2266'][L];
      for (let i = 0; i < 26; i++) {
        const x = ((i * 97 + L * 41 - cam * sp) % 900 + 900) % 900 - 130;
        if (x < -70 || x > VW + 40) continue;
        const w = 22 + U.hash2(i * 3 + L, 7) * 34;
        const h = 80 + U.hash2(i * 5 + L, 11) * 130;
        X.rect(ctx, x, VH - h, w, h, col);
        X.rect(ctx, x, VH - h, w, 2, lit);
        for (let wy = VH - h + 8; wy < VH - 10; wy += 9) {
          for (let wx = x + 3; wx < x + w - 4; wx += 7) {
            if (U.hash2((wx * 3) | 0, (wy * 5) | 0) < 0.45 + L * 0.1) continue;
            X.rect(ctx, wx, wy, 3, 4, U.hash2(wx | 0, wy | 0) > 0.7 ? '#ffd34d' : '#9a86d8');
          }
        }
      }
    }
    // ships, coming in and going out on their own lanes
    for (let i = 0; i < 7; i++) {
      const dir = i % 2 ? -1 : 1, span = VW + 160;
      const raw = ((i * 151 + t * (24 + i * 9)) % span + span) % span;
      const x = dir > 0 ? raw - 80 : span - raw - 80;
      const y = 18 + (i % 4) * 14;
      X.rect(ctx, x - 7, y, 15, 4, '#241a3a');
      X.rect(ctx, x - 4, y - 2, 9, 2, '#3a3060');
      X.rect(ctx, x + dir * 8, y + 1, 3, 2, '#ff5a4d');
      ctx.globalAlpha = 0.24;
      X.blob(ctx, x - dir * 12, y + 2, 12, 1.5, '#7ef9ff');
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.1;
    X.rect(ctx, 0, 60, VW, VH - 60, '#6a3ab0');
    ctx.globalAlpha = 1;
  }

  /* One deck: the plate, its underside, the rail along the front, and the
     lamps hanging off it. */
  function hubDeck(ctx, g, t, cam, d, dim) {
    const y = DECK_Y[d];
    ctx.globalAlpha = dim ? 0.55 : 1;
    // the underside, with girders
    X.rect(ctx, -cam, y, HUB_W, 14, '#1d1030');
    X.rect(ctx, -cam, y, HUB_W, 3, '#3c2058');
    X.rect(ctx, -cam, y + 12, HUB_W, 2, '#120a22');
    for (let i = 0; i < 40; i++) {
      const gx = i * 34 - cam;
      if (gx < -40 || gx > VW + 40) continue;
      X.poly(ctx, [[gx, y + 14], [gx + 18, y + 14], [gx + 9, y + 26]], '#170c28');
      X.rect(ctx, gx + 7, y + 14, 4, 20, '#241440');
    }
    // the plate you walk on
    X.rect(ctx, -cam, y - 4, HUB_W, 5, '#3a3450');
    X.rect(ctx, -cam, y - 4, HUB_W, 1, '#6b6480');
    for (let i = 0; i < 62; i++) {
      const gx = i * 21 - cam;
      if (gx < -24 || gx > VW + 24) continue;
      X.rect(ctx, gx, y - 3, 1, 3, '#2a2438');
      if (i % 3 === 0) X.rect(ctx, gx + 4, y - 2, 9, 1, '#4a4460');
    }
    // the rail along the front, and lamps on posts
    for (let i = 0; i < 42; i++) {
      const gx = i * 32 - cam;
      if (gx < -30 || gx > VW + 30) continue;
      X.rect(ctx, gx, y - 20, 2, 17, '#2e2640');
      const on = (Math.floor(t * 2.4) + i) % 5 !== 0;
      X.blob(ctx, gx + 1, y - 23, 3, 3, on ? '#ffd34d' : '#4a3a10');
      if (on && !dim) {
        ctx.globalAlpha = 0.14; X.blob(ctx, gx + 1, y - 21, 12, 10, '#ffd34d');
        ctx.globalAlpha = dim ? 0.55 : 1;
      }
    }
    X.rect(ctx, -cam, y - 14, HUB_W, 2, '#453c5c');
    X.rect(ctx, -cam, y - 14, HUB_W, 1, '#6b6480');
    // the name of the deck, painted on the plate at the west end
    F.draw(ctx, DECK_NAME[d], 40 - cam, y - 30, dim ? '#4a4460' : '#8a86a8', { shadow: '#0a0614' });
    ctx.globalAlpha = 1;
  }

  function hubTele(ctx, t, cam, d, dim) {
    const x = TELE_X - cam, y = DECK_Y[d];
    ctx.globalAlpha = dim ? 0.55 : 1;
    X.plate(ctx, x - 20, y - 6, 40, 7, '#2a3444', '#5a7a94', '#12181f', 3);
    for (const sd of [-1, 1]) {
      X.rect(ctx, x + sd * 17 - 2, y - 44, 4, 38, '#2e3a4a');
      X.rect(ctx, x + sd * 17 - 2, y - 44, 1, 38, '#5a7a94');
    }
    X.rect(ctx, x - 20, y - 48, 40, 5, '#2e3a4a');
    X.rect(ctx, x - 20, y - 48, 40, 1, '#7ef9ff');
    const pulse = 0.22 + Math.abs(Math.sin(t * 2.2)) * 0.3;
    ctx.globalAlpha = (dim ? 0.55 : 1) * pulse;
    X.rect(ctx, x - 16, y - 42, 32, 38, '#7ef9ff');
    ctx.globalAlpha = dim ? 0.55 : 1;
    for (let i = 0; i < 4; i++) {
      const f = ((t * 0.7 + i / 4) % 1);
      ctx.globalAlpha = (dim ? 0.55 : 1) * (1 - f) * 0.7;
      X.rect(ctx, x - 14, y - 6 - f * 36, 28, 1, '#d8fbff');
    }
    ctx.globalAlpha = dim ? 0.55 : 1;
    F.draw(ctx, 'LIFT', x, y - 58, dim ? '#3a5a6a' : '#7ef9ff', { center: true, shadow: '#06121c' });
    ctx.globalAlpha = 1;
  }

  function hubZips(ctx, t, cam, dim) {
    for (const z of ZIPS) {
      const x0 = z.x0 - cam, y0 = DECK_Y[z.from] - 26;
      const x1 = z.x1 - cam, y1 = DECK_Y[z.to] - 14;
      if (Math.max(x0, x1) < -40 || Math.min(x0, x1) > VW + 40) continue;
      ctx.globalAlpha = dim ? 0.5 : 1;
      X.line(ctx, x0, y0 + 1, x1, y1 + 1, '#120a22', 2);
      X.line(ctx, x0, y0, x1, y1, '#8e86a8', 1);
      // the gantry it is bolted to
      X.rect(ctx, x0 - 3, y0, 7, 26, '#2e2640');
      X.rect(ctx, x0 - 3, y0, 7, 2, '#5a5474');
      X.rect(ctx, x1 - 3, y1, 7, 14, '#2e2640');
      // and the handle, parked at the top unless somebody is on it
      const onIt = HUB.ride && HUB.ride.z === z;
      const k = onIt ? U.smoothstep(0, 1, Math.min(1, HUB.ride.f)) : 0;
      const hx = U.lerp(x0, x1, k), hy = U.lerp(y0, y1, k);
      X.rect(ctx, hx - 4, hy - 2, 9, 4, '#6b6480');
      X.rect(ctx, hx - 2, hy + 2, 4, 5, '#453c5c');
      ctx.globalAlpha = 1;
    }
  }

  function hubProps(ctx, g, t, cam, d, dim) {
    const y = DECK_Y[d];
    ctx.globalAlpha = dim ? 0.55 : 1;
    for (const q of HUB_PROPS) {
      if (q.deck !== d) continue;
      const x = q.x - cam;
      if (x < -80 || x > VW + 80) continue;
      if (q.kind === 'cantina') {
        X.plate(ctx, x - 44, y - 52, 88, 52, '#2a1a3a', '#4a3660', '#120a1c', 5);
        X.rect(ctx, x - 38, y - 44, 76, 22, '#0d0718');
        for (let i = 0; i < 6; i++) {
          X.rect(ctx, x - 34 + i * 12, y - 40, 5, 14, ['#8affa0', '#ff8ad8', '#ffb03d'][i % 3]);
        }
        const on = Math.sin(t * 4) > -0.4;
        X.plate(ctx, x - 30, y - 68, 60, 14, '#170a28', on ? '#ff5fa8' : '#4a1c3a', '#080312', 3);
        F.draw(ctx, q.name, x, y - 64, on ? '#ffd6f0' : '#7a4a68', { center: true, shadow: '#180510' });
        X.rect(ctx, x - 26, y - 16, 52, 4, '#4a3020');
      } else if (q.kind === 'crate') {
        X.plate(ctx, x - 14, y - 26, 28, 26, '#4a3c2e', '#6b5a44', '#241c14', 3);
        X.rect(ctx, x - 14, y - 18, 28, 2, '#8a6a3a');
        X.rect(ctx, x - 6, y - 24, 12, 6, '#2a2018');
        X.plate(ctx, x - 10, y - 44, 20, 18, '#4a3c2e', '#6b5a44', '#241c14', 3);
      } else if (q.kind === 'freighter') {
        X.blob(ctx, x, y - 40, 62, 22, '#2a2438');
        X.blob(ctx, x, y - 44, 56, 16, '#453c5c');
        X.blob(ctx, x - 20, y - 48, 22, 8, '#6b6480');
        for (let i = 0; i < 5; i++) X.rect(ctx, x - 34 + i * 16, y - 46, 8, 5, '#0d0718');
        X.rect(ctx, x + 40, y - 42, 16, 8, '#2e2640');
        const fl = Math.sin(t * 8) > 0;
        X.blob(ctx, x + 56, y - 38, 4, 3, fl ? '#ff9b3d' : '#7a4a20');
        for (const lx of [-30, 0, 30]) X.rect(ctx, x + lx - 2, y - 22, 5, 22, '#2e2640');
        F.draw(ctx, 'LOADING', x, y - 60, '#6a6484', { center: true, shadow: '#0a0614' });
      } else if (q.kind === 'stallX') {
        const hue = ['#ff5fa8', '#7ef9ff', '#ffd34d'][(q.x / 30 | 0) % 3];
        X.rect(ctx, x - 22, y - 28, 44, 28, '#241a3a');
        for (let i = 0; i * 9 < 44; i++) {
          X.rect(ctx, x - 22 + i * 9, y - 36, 9, 8, i % 2 ? hue : '#2a1a3a');
        }
        X.rect(ctx, x - 22, y - 28, 44, 2, '#4a3660');
        for (let i = 0; i < 4; i++) X.blob(ctx, x - 15 + i * 10, y - 20, 4, 3, ['#8affa0', '#ffb03d', '#ff8ad8', '#7ec8ff'][i]);
      } else if (q.kind === 'bank') {
        X.plate(ctx, x - 46, y - 62, 92, 62, '#2a2438', '#6b5a9c', '#0a0614', 5);
        for (let i = 0; i < 4; i++) {
          X.rect(ctx, x - 36 + i * 22, y - 56, 7, 50, '#453c5c');
          X.rect(ctx, x - 36 + i * 22, y - 56, 7, 2, '#8e86a8');
        }
        X.poly(ctx, [[x - 50, y - 62], [x + 50, y - 62], [x, y - 84]], '#453c5c');
        X.poly(ctx, [[x - 42, y - 64], [x + 42, y - 64], [x, y - 79]], '#2a2438');
        X.blob(ctx, x, y - 72, 7, 6, '#ffd34d');
        F.draw(ctx, q.name, x, y - 94, '#ffd34d', { center: true, shadow: '#0a0614' });
      } else {
        X.rect(ctx, x - 3, y - 30, 7, 30, '#2e3a4a');
        X.blob(ctx, x, y - 38, 14, 10, '#2a3444');
        X.rect(ctx, x + 8, y - 44, 18, 6, '#5a7a94');
        X.blob(ctx, x + 26, y - 41, 4, 4, '#7ef9ff');
        ctx.globalAlpha = (dim ? 0.55 : 1) * 0.18;
        X.poly(ctx, [[x + 28, y - 45], [x + 28, y - 37], [x + 90, y - 62], [x + 90, y - 20]], '#7ef9ff');
        ctx.globalAlpha = dim ? 0.55 : 1;
      }
    }
    // the four that actually sell you something
    for (const q of STALLS) {
      if (q.deck !== d) continue;
      const x = q.x - cam;
      if (x < -70 || x > VW + 70) continue;
      const bought = q.once && g.save.bought && g.save.bought[q.id];
      X.plate(ctx, x - 26, y - 34, 52, 34, '#2a1a3a', '#6a3a80', '#120a1c', 4);
      X.rect(ctx, x - 20, y - 28, 40, 18, '#0d0718');
      PD.glyph.draw(ctx, q.glyph, x - 7, y - 26, bought ? '#4fd0b0' : '#ff8ad8', '#8a3a6a');
      // the canopy
      for (let i = 0; i * 9 < 60; i++) {
        X.rect(ctx, x - 30 + i * 9, y - 44, 9, 10, i % 2 ? '#7a2450' : '#3a0e26');
      }
      X.rect(ctx, x - 30, y - 35, 60, 2, '#a8265a');
      const on = bought || Math.sin(t * 3 + q.x) > -0.4;
      X.plate(ctx, x - 30, y - 58, 60, 13, '#170a28', on ? '#ffd34d' : '#5a4418', '#080312', 3);
      F.draw(ctx, q.name.replace('THE ', ''), x, y - 55, on ? '#ffd34d' : '#6a5a1a',
        { center: true, shadow: '#180510' });
      // and the one behind the counter
      const K = AH.KIN[(q.x / 7 | 0) % AH.KIN.length];
      AH.blit(ctx, AH.S[K.key], Math.floor(t * 1.2 + q.x) % 9 === 0 ? 5 : 0, x + 16, y + Math.sin(t * 1.6) * 1);
    }
    ctx.globalAlpha = 1;
  }

  function hubCrowd(ctx, g, t, cam, d, dim) {
    const y = DECK_Y[d];
    ctx.globalAlpha = dim ? 0.5 : 1;
    for (const c of HUBC) {
      if (c.deck !== d) continue;
      const x = c.x - cam;
      if (x < -30 || x > VW + 30) continue;
      const K = AH.KIN[c.k % AH.KIN.length];
      const moving = c.wait <= 0;
      const bob = Math.sin(t * 2.4 + c.ph) * 0.8;
      ctx.globalAlpha = (dim ? 0.5 : 1) * 0.4;
      X.blob(ctx, x, y + 1, K.w * 0.42, 3, '#0a0614');
      ctx.globalAlpha = dim ? 0.5 : 1;
      AH.blit(ctx, AH.S[K.key], moving ? (Math.floor(t * 6 + c.ph) % 2 ? 1 : 2)
        : (Math.floor(t * 1.3 + c.ph) % 11 === 0 ? 5 : 0), x, y + bob, c.dir < 0);
    }
    ctx.globalAlpha = 1;
  }

  function drawHub(ctx, g, t, cam) {
    hubCity(ctx, t, cam);
    // everything above you first, dimmed, then your deck, then what is below
    const order = [2, 1, 0].filter(d => d !== S.deck);
    for (const d of order) {
      if (d < S.deck) continue;                      // the ones below go after
      hubDeck(ctx, g, t, cam, d, true);
      hubProps(ctx, g, t, cam, d, true);
      hubCrowd(ctx, g, t, cam, d, true);
      hubTele(ctx, t, cam, d, true);
    }
    hubZips(ctx, t, cam, true);
    hubDeck(ctx, g, t, cam, S.deck, false);
    hubProps(ctx, g, t, cam, S.deck, false);
    hubTele(ctx, t, cam, S.deck, false);
    hubCrowd(ctx, g, t, cam, S.deck, false);
    for (const d of order) {
      if (d > S.deck) continue;
      hubDeck(ctx, g, t, cam, d, true);
      hubProps(ctx, g, t, cam, d, true);
      hubCrowd(ctx, g, t, cam, d, true);
      hubTele(ctx, t, cam, d, true);
    }
    // your shuttle, parked on the docks
    if (S.deck === 0) {
      const sx = 172 - cam, sy = DECK_Y[0];
      X.blob(ctx, sx, sy + 1, 24, 3, '#0a0614');
      AH.blit(ctx, AH.S.saucer, Math.floor(t * 3) % 2, sx, sy + Math.sin(t * 1.6) * 1);
    }
    if (HUB.arrive > 0) {
      ctx.globalAlpha = HUB.arrive;
      X.rect(ctx, 0, 0, VW, VH, '#7ef9ff');
      ctx.globalAlpha = 1;
    }
  }

  /* ------------------------------------------------------------ the base
     Once the tip is gone there is bare regolith along the eastern curve, and
     five pads somebody poured before you owned the place. What you put on
     them is the only part of this game that improves while you are not
     looking at it: every level is a flat number you can feel in the hole. */
  const BUILD = { open: null, sel: 0, t: 0 };

  function buildPads(g) {
    if (!moonClean(g)) return [];
    return D.BUILDINGS.map(b => ({
      id: 'pad_' + b.id, x: b.x, r: 26, bid: b.id,
      name: g.baseLvl(b.id) ? b.name : 'AN EMPTY PAD',
      sub: g.baseLvl(b.id) >= b.max ? 'FINISHED' :
        (g.baseLvl(b.id) ? 'UPGRADE  $' + U.fmt(g.baseCost(b.id)) : 'BUILD  $' + U.fmt(g.baseCost(b.id)))
    }));
  }

  function openBuild(g, bid) {
    BUILD.open = bid; BUILD.t = 0;
    UI.mode = 'build';
    A.sfx.click();
  }
  function closeBuild() { BUILD.open = null; UI.mode = null; P.lock = 0.2; A.sfx.click(); }

  function updateBuild(dt, g) {
    BUILD.t += dt;
    const IN = PD.input, m = IN.mouse;
    if (IN.hit('esc') || IN.hit('KeyE')) { closeBuild(); return; }
    const b = D.BUILD_OF[BUILD.open];
    const lvl = g.baseLvl(b.id);
    const can = lvl < b.max && g.save.credits >= g.baseCost(b.id);
    const hitGo = m.inside && m.x > 148 && m.x < 260 && m.y > 176 && m.y < 196;
    const hitNo = m.inside && m.x > 272 && m.x < 340 && m.y > 176 && m.y < 196;
    if (m.leftPressed && hitNo) { closeBuild(); return; }
    if ((m.leftPressed && hitGo && can) || (IN.hit('enter') && can)) {
      if (g.build(b.id)) {
        FX.text(b.x, groundY(b.x) - 60, 'BUILT', '#ffd34d', 1);
        FX.ring(b.x, groundY(b.x) - 16, 4, 60, 0.9, '#ffd34d', 3);
      }
    }
  }

  function drawBuildPanel(ctx, g, t) {
    const b = D.BUILD_OF[BUILD.open];
    if (!b) return;
    const lvl = g.baseLvl(b.id), done = lvl >= b.max;
    const cost = g.baseCost(b.id);
    const can = !done && g.save.credits >= cost;
    ctx.fillStyle = 'rgba(6,4,14,0.82)'; ctx.fillRect(0, 0, VW, VH);
    X.plate(ctx, 120, 62, 240, 146, '#1d1836', '#453c5c', '#0a0614', 6);
    X.rect(ctx, 120, 62, 240, 2, '#7ef9ff');
    PD.glyph.draw(ctx, b.glyph, 130, 70, '#7ef9ff', '#2f8fae');
    F.draw(ctx, b.name, 240, 74, '#d8fbff', { center: true, shadow: '#0a0614' });
    F.draw(ctx, b.blurb, 240, 90, '#8a86a8', { center: true, shadow: false });

    // three lamps: what it is now and what it would be
    for (let i = 1; i <= b.max; i++) {
      const on = i <= lvl, next = i === lvl + 1;
      const bx = 240 - (b.max * 30) / 2 + (i - 1) * 30;
      X.plate(ctx, bx, 104, 26, 20, on ? '#1d4a44' : (next ? '#2a2452' : '#150f28'),
        on ? '#4fd0b0' : (next ? '#6b5a9c' : '#2e2640'), '#04100e', 3);
      F.draw(ctx, String(i), bx + 13, 110, on ? '#8affd0' : (next ? '#c9bce8' : '#4a4460'),
        { center: true, shadow: false });
    }
    const cur = b.bonus[Math.min(b.max, lvl)];
    F.draw(ctx, lvl ? 'NOW  ' + b.fmt(cur) : 'NOTHING ON THIS PAD', 240, 132,
      lvl ? '#8affd0' : '#6a6484', { center: true, shadow: false });
    if (!done) {
      F.draw(ctx, 'NEXT  ' + b.fmt(b.bonus[lvl + 1]), 240, 144, '#ffd34d',
        { center: true, shadow: false });
    }

    F.draw(ctx, 'YOU HAVE $' + U.fmt(g.save.credits), 240, 162,
      can || done ? '#8a86a8' : '#ff8a9a', { center: true, shadow: false });

    const m = PD.input.mouse;
    const hotGo = m.inside && m.x > 148 && m.x < 260 && m.y > 176 && m.y < 196;
    const hotNo = m.inside && m.x > 272 && m.x < 340 && m.y > 176 && m.y < 196;
    if (done) {
      X.plate(ctx, 148, 176, 112, 20, '#1d4a44', '#4fd0b0', '#04100e', 4);
      F.draw(ctx, 'FINISHED', 204, 182, '#8affd0', { center: true, shadow: false });
    } else {
      X.plate(ctx, 148, 176, 112, 20, can ? (hotGo ? '#2f8f6a' : '#1d4a44') : '#2a1a24',
        can ? '#4fd0b0' : '#6a3040', '#04100e', 4);
      F.draw(ctx, (lvl ? 'UPGRADE  $' : 'BUILD  $') + U.fmt(cost), 204, 182,
        can ? '#ffffff' : '#8a5a68', { center: true, shadow: false });
    }
    X.plate(ctx, 272, 176, 68, 20, hotNo ? '#3a3060' : '#241f3e', '#6b5a9c', '#0a0614', 4);
    F.draw(ctx, 'LEAVE', 306, 182, '#c9bce8', { center: true, shadow: false });
  }

  /* What is actually standing out there. Each one is built out of the same
     plates as the house, so the moon looks like one person made all of it
     out of the same skip. */
  function drawBuildings(ctx, g, t, cam) {
    for (const b of D.BUILDINGS) {
      const x = b.x - cam, gy = groundY(b.x);
      if (x < -60 || x > VW + 60) continue;
      const lvl = g.baseLvl(b.id);
      // the pad itself, always there
      X.blob(ctx, x, gy + 2, 22, 4, '#241f36');
      X.plate(ctx, x - 20, gy - 4, 40, 7, '#3a3450', '#5a5474', '#1a1626', 3);
      for (let i = 0; i < 4; i++) X.rect(ctx, x - 16 + i * 10, gy - 2, 5, 2, '#2a2438');
      if (!lvl) {
        ctx.globalAlpha = 0.35 + Math.abs(Math.sin(t * 2 + b.x)) * 0.25;
        for (let i = 0; i < 4; i++) {
          X.rect(ctx, x - 18 + i * 12, gy - 8, 3, 3, '#7ef9ff');
        }
        ctx.globalAlpha = 1;
        F.draw(ctx, 'PAD', x, gy - 18, '#4a6a80', { center: true, shadow: '#0a0614' });
        continue;
      }
      const h = 26 + lvl * 12;
      if (b.id === 'refinery') {
        X.plate(ctx, x - 17, gy - h, 34, h - 2, '#4a3c2e', '#6b5a44', '#241c14', 4);
        X.plate(ctx, x - 12, gy - h + 5, 24, 12, '#2a2018', '#8a6a3a', '#120c08', 3);
        for (let i = 0; i < lvl; i++) {
          X.rect(ctx, x - 12 + i * 11, gy - h - 14, 7, 15, '#5a4a38');
          X.rect(ctx, x - 12 + i * 11, gy - h - 14, 7, 3, '#8a6a3a');
          const f = ((t * 0.4 + i / 3) % 1);
          ctx.globalAlpha = (1 - f) * 0.4;
          X.blob(ctx, x - 9 + i * 11, gy - h - 18 - f * 26, 3 + f * 7, 2 + f * 6, '#8a86a8');
          ctx.globalAlpha = 1;
        }
        X.rect(ctx, x - 10, gy - h + 8, 20, 5, Math.sin(t * 3) > 0 ? '#ffb03d' : '#8a5a20');
      } else if (b.id === 'airfarm') {
        X.plate(ctx, x - 18, gy - 12, 36, 11, '#2a3444', '#44566e', '#121a24', 3);
        for (let i = 0; i < lvl + 1; i++) {
          const tx = x - 13 + i * 10;
          X.rect(ctx, tx - 4, gy - h, 9, h - 12, 'rgba(150,220,255,0.22)');
          X.rect(ctx, tx - 4, gy - h, 9, 2, '#9fe0ff');
          for (let k = 0; k < 3; k++) {
            X.blob(ctx, tx, gy - h + 8 + k * 9 + Math.sin(t * 1.4 + k + i) * 1.5,
              3, 4, k % 2 ? '#4cff9a' : '#2f8f6a');
          }
        }
      } else if (b.id === 'dronebay') {
        X.plate(ctx, x - 18, gy - 20, 36, 19, '#2e3a4a', '#4a5c74', '#12181f', 4);
        X.rect(ctx, x - 13, gy - 16, 26, 9, '#0d1620');
        for (let i = 0; i < lvl; i++) {
          const dy = gy - 30 - i * 11 + Math.sin(t * 2.2 + i * 2) * 3;
          const dx2 = x - 10 + i * 10 + Math.cos(t * 1.1 + i) * 5;
          X.plate(ctx, dx2 - 4, dy - 3, 9, 6, '#6b7e94', '#a8b4c8', '#2a3440', 2);
          X.rect(ctx, dx2 - 7, dy - 4, 4, 1, '#8e86a8');
          X.rect(ctx, dx2 + 4, dy - 4, 4, 1, '#8e86a8');
          X.blob(ctx, dx2, dy + 2, 2, 2, Math.sin(t * 6 + i) > 0 ? '#7ef9ff' : '#2a5f6a');
        }
      } else if (b.id === 'mast') {
        X.plate(ctx, x - 12, gy - 10, 24, 9, '#2a2438', '#453c5c', '#0a0614', 3);
        X.rect(ctx, x - 2, gy - h, 4, h - 10, '#5a5474');
        X.rect(ctx, x - 2, gy - h, 1, h - 10, '#8e86a8');
        for (let i = 0; i < 3; i++) X.rect(ctx, x - 7, gy - h + 12 + i * 10, 14, 2, '#3a3348');
        const a = t * (0.6 + lvl * 0.3);
        X.blob(ctx, x, gy - h - 2, 9, 4, '#453c5c');
        X.blob(ctx, x + Math.cos(a) * 7, gy - h - 3, 5, 3, '#7ef9ff');
        ctx.globalAlpha = 0.16;
        X.blob(ctx, x, gy - h - 4, 20 + lvl * 8, 10 + lvl * 4, '#7ef9ff');
        ctx.globalAlpha = 1;
      } else {
        X.plate(ctx, x - 16, gy - h, 32, h - 1, '#2a2438', '#5a4a78', '#0a0614', 5);
        const hot = 0.4 + Math.abs(Math.sin(t * (1 + lvl))) * 0.4;
        X.blob(ctx, x, gy - h / 2 - 4, 9, 11, '#150f28');
        ctx.globalAlpha = hot;
        X.blob(ctx, x, gy - h / 2 - 4, 7, 9, '#4cff9a');
        X.blob(ctx, x, gy - h / 2 - 4, 4, 5, '#d8ffe8');
        ctx.globalAlpha = 1;
        for (let i = 0; i < lvl; i++) X.rect(ctx, x - 13 + i * 9, gy - h - 5, 6, 6, '#4cff9a');
        ctx.globalAlpha = 0.05 * lvl;
        X.blob(ctx, x, gy - h / 2 - 4, 18, 16, '#4cff9a');
        ctx.globalAlpha = 1;
      }
      // a plate on the front with the name and how far up it is
      F.draw(ctx, b.name.replace('THE ', ''), x, gy - h - (b.id === 'refinery' ? 26 : 16),
        '#8a86a8', { center: true, shadow: '#0a0614' });
      for (let i = 0; i < b.max; i++) {
        X.rect(ctx, x - (b.max * 5) / 2 + i * 5, gy - h - (b.id === 'refinery' ? 18 : 8),
          3, 3, i < lvl ? '#ffd34d' : '#3a3348');
      }
    }
  }

  /* ---------------------------------------------------------------- update */
  function update(dt, g) {
    const IN = PD.input;
    if (UI.mode === 'build') { S.t += dt; updateBuild(dt, g); return; }
    if (UI.mode === 'hub') { S.t += dt; updateHubPanel(dt, g); return; }
    if (S.scene === 'hub') {
      HUB.arrive = Math.max(0, HUB.arrive - dt * 2.2);
      updateHubCrowd(dt);
      if (HUB.ride) { S.t += dt; updateZip(dt, g); g.intCam = U.damp(g.intCam, camWant(), 0.2, dt); return; }
    }
    g0 = g;
    S.t += dt;
    if (FX.wipeActive()) { view(dt); return; }
    P.lock = Math.max(0, P.lock - dt);
    UI.msgT = Math.max(0, UI.msgT - dt);

    if (S.sleep > 0) {
      S.sleep -= dt;
      for (let k = 0; k < 6; k++) g.demandFor(k);        // the market keeps moving
      if (S.sleep <= 0) { say('YOU SLEPT. THE PRICES MOVED. THEY ALWAYS DO.'); A.sfx.tone(700, { type: 'triangle', to: 1100, dur: 0.2, vol: 0.07 }); }
      return;
    }

    for (const d of DRIPS) { d.t += dt; if (d.t > 3.4) { d.t = 0; A.sfx.tone(1400, { type: 'sine', to: 800, dur: 0.1, vol: 0.02 }); } }
    updateRat(dt, g);
    if (S.scene === 'club') updateClub(dt, g);
    P.sweep = Math.max(0, P.sweep - dt);
    S.drunk = Math.max(g.save.story === 1 ? 0.32 : 0, S.drunk - dt * 0.06);

    const use_ = P.lock <= 0 && (IN.hit('KeyE') || IN.hit('space'));
    const m = IN.mouse;

    let ix = 0;
    if (IN.down('left')) ix -= 1;
    if (IN.down('right')) ix += 1;

    if (P.lock <= 0 && m.leftPressed) {
      const wx = fromScreenX(m.x) + g.intCam;
      let hit = null;
      for (const s of spots(g)) if (Math.abs(s.x - wx) < s.r) hit = s;
      const bd0 = bounds();
      P.target = hit ? hit.x : U.clamp(wx, bd0[0], bd0[1]);
      P.autoUse = hit;
      A.sfx.click();
    }
    if (ix) { P.target = null; P.autoUse = null; }
    if (P.target !== null) {
      const d = P.target - P.x;
      if (Math.abs(d) > 6) ix = Math.sign(d);
      else { P.target = null; if (P.autoUse) { const s = P.autoUse; P.autoUse = null; use(g, s); return; } }
    }

    const gy = groundY(P.x);
    const grounded = P.y >= gy - 0.5;

    if (P.roll <= 0 && grounded && (IN.hit('shift') || (IN.hit('down') && Math.abs(P.vx) > 20))) {
      P.roll = 0.55; P.rollA = 0;
      if (ix) P.face = ix;
      P.vx = P.face * 210;
      A.sfx.tone(300, { type: 'triangle', to: 120, dur: 0.25, vol: 0.09 });
      FX.dust(P.x, P.y, 5, '#8e86a8', 16);
    }
    if (P.roll > 0) {
      P.roll -= dt;
      P.rollA += P.face * dt * 15;
      P.vx = U.damp(P.vx, P.face * 170, 0.5, dt);
    } else {
      if (ix) P.face = ix;
      P.vx = U.damp(P.vx, ix * 104, 0.3, dt);
    }
    const bd = bounds();
    P.x = U.clamp(P.x + P.vx * dt, bd[0], bd[1]);
    P.walk += Math.abs(P.vx) * dt * 0.1;

    if (IN.hit('up') && grounded && P.roll <= 0) {
      P.vy = -212;
      A.sfx.tone(520, { type: 'triangle', to: 980, dur: 0.14, vol: 0.07 });
      FX.dust(P.x, P.y, 4, '#c9bce8', 12);
    }
    const floaty = IN.down('up') && P.vy < 0 ? 0.55 : 1;
    P.vy += GRAV * floaty * dt;
    P.y += P.vy * dt;

    // the ceiling is out of reach, but the junk hanging off the beam is not
    const roof = S.scene === 'in' ? CEIL + 14
      : (S.scene === 'club' ? CLUB_CEIL + 18
        : (S.scene === 'hub' ? DECK_Y[S.deck] - 72 : -600));
    if (P.y < roof) {
      P.y = roof;
      if (P.vy < 0) {
        P.vy = 70; S.swing = 1;
        FX.dust(P.x, roof - 6, 4, '#6b6480', 12);
        A.sfx.tone(180, { type: 'square', to: 90, dur: 0.12, vol: 0.07 });
      }
    }
    S.swing = Math.max(0, S.swing - dt * 1.4);

    if (P.y >= gy) {
      if (P.vy > 60) {
        // EVERYTHING BOUNCES. He lands, squashes flat, and pops back up.
        P.land = 0.26;
        if (P.rig) PD.rig.land(P.rig, U.clamp(P.vy / 260, 0.4, 1));
        FX.puff(P.x, P.y, 4, '#b8aed0', U.clamp(P.vy / 240, 0.6, 1.3));
        if (P.vy > 150 && P.hop < 2) { P.vy = -P.vy * 0.34; P.hop++; }
        else { P.vy = 0; P.hop = 0; }
        FX.dust(P.x, gy, 6, '#8e86a8', 18);
        A.sfx.tone(150, { type: 'triangle', to: 90, dur: 0.1, vol: 0.06 });
      } else { P.vy = 0; P.hop = 0; }
      P.y = gy; P.air = 0;
    } else P.air += dt;
    P.land = Math.max(0, P.land - dt * 3.4);

    const was = P.near;
    P.near = nearest(g);
    if (P.near && P.near !== was) A.sfx.tone(900, { type: 'square', dur: 0.03, vol: 0.03 });
    if (use_) use(g, P.near);

    g.intCam = U.damp(g.intCam, camWant(), 0.16, dt);
    view(dt);                        // the zoom window follows him
  }

  /* Before he is yours he stands over the cheese. After, he never shuts up
     about following you and he bounces the whole way. */
  function updateRat(dt, g) {
    rat.t += dt;
    rat.chew = Math.max(0, rat.chew - dt);
    if (!g.save.pet) {
      rat.x = RAT_SPOT.x;
      rat.y = groundY(rat.x);
      rat.face = P.x > rat.x ? 1 : -1;
      if (U.chance(dt * 1.4)) { rat.chew = 0.3; A.sfx.tone(240, { type: 'square', dur: 0.03, vol: 0.02 }); }
      return;
    }
    const want = P.x - P.face * 26;
    const d = want - rat.x;
    if (Math.abs(d) > 14) {
      rat.vx = U.damp(rat.vx, U.clamp(d * 2.6, -120, 120), 0.14, dt);
      rat.face = Math.sign(rat.vx) || rat.face;
    } else rat.vx = U.damp(rat.vx, 0, 0.3, dt);
    const rbd = bounds();
    rat.x = U.clamp(rat.x + rat.vx * dt, rbd[0] - 16, rbd[1] + 16);
    // he is far too fat to walk, so he bounces
    rat.hop = Math.abs(rat.vx) > 12 ? (rat.hop + dt * 9) : U.damp(rat.hop, 0, 0.2, dt);
    rat.y = groundY(rat.x);
  }

  function closeScene() { UI.mode = null; P.lock = 0.2; A.sfx.click(); }
  function touchMode() { return 'home'; }

  /* ------------------------------------------------------------------ draw */
  function drawSpace(ctx, g, t, cam) {
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#090620'); sky.addColorStop(0.6, '#150d31'); sky.addColorStop(1, '#2a1541');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
    const nx = 620 - cam * 0.2;
    ctx.save();
    for (let i = 4; i >= 1; i--) {
      ctx.globalAlpha = 0.05 + (4 - i) * 0.012;
      ctx.beginPath(); X.octPath(ctx, nx + (i % 2 ? 8 : -8), 66 + i * 3, i * 24); ctx.clip();
      X.dither(ctx, nx - 120, 0, 240, 160, '#ff8ad8', i % 2);
      ctx.restore(); ctx.save();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    for (const s of star) {
      const sx = s.x * VW;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.b * 30);
      ctx.fillStyle = s.b > 0.86 ? '#ffe9a8' : '#ffffff';
      ctx.globalAlpha = 0.22 + s.b * 0.6 * tw;
      ctx.fillRect(sx | 0, (s.y * VH) | 0, 1, 1);
    }
    ctx.globalAlpha = 1;
    // the dead Celestial your moon was chipped off, adrift out to one side
    const sk = AH.S.skull;
    ctx.globalAlpha = 0.6;
    ctx.drawImage(sk.frames[0], 6, 12 + Math.round(Math.sin(t * 0.4) * 2), Math.round(sk.w * 0.85), Math.round(sk.h * 0.85));
    ctx.globalAlpha = 1;
    // the world you are about to ruin
    const icon = g.navIcon(g.save.bodyIndex || 0);
    const px = 404, py = 52 + Math.sin(t * 0.5) * 3;
    ctx.drawImage(icon, Math.round(px - icon.width * 0.8), Math.round(py - icon.height * 0.8), Math.round(icon.width * 1.6), Math.round(icon.height * 1.6));
    void cam;
  }

  /* THE BALL. Drawn as a stack of two-pixel columns hung off the curve, so
     the silhouette IS the circle and the crust bands follow it round. Nothing
     smooth anywhere: every column is a whole number of pixels tall. */
  function drawBall(ctx, t, cam) {
    const BAND = ['#9a92b4', '#8e86a8', '#7a7290', '#6b6480', '#5a5470', '#4a4460', '#3a3450', '#2e2842', '#241f36', '#1b172a'];
    const DEPTH = [0, 3, 9, 17, 27, 40, 56, 76, 100, 130];
    // an ordered 2x2 dither, not noise: the terminator wants a clean checker
    const DITH = [[0.25, 0.75], [0.75, 0.25]];
    const x0 = Math.ceil(MOON.cx - MOON.r), x1 = Math.floor(MOON.cx + MOON.r);
    for (let sx = x0 - (x0 % 2); sx <= x1; sx += 2) {
      const wx = sx + cam + 1;
      const y = groundY(wx);
      if (y > VH) continue;
      /* The star is off to the left, so the crust is pale on that limb and
         nearly black on the other. The step between shades is DITHERED by a
         stable per-column hash, which is how you get a curved, shaded ball
         out of nothing but flat runs of colour. */
      const nx = (wx - MOON.cx) / MOON.r;
      const lv = U.clamp(1.55 - nx * 1.15 - Math.abs(nx) * 0.5, 0, 2.2);
      const frac = lv % 1;
      const base = 1 - Math.floor(lv);
      // the dither is per band as well as per column, so the terminator breaks
      // up into a checker instead of banding the ball into vertical stripes
      const dcol = DITH[(sx >> 1) & 1];
      const offAt = (k) => U.clamp(base - (frac > dcol[k & 1] ? 1 : 0), -1, BAND.length - 1);
      // the strata thicken with depth, so the whole visible body of the ball
      // is layered rather than one flat mass under a thin crust
      for (let i = 0; i < BAND.length; i++) {
        const y0 = y + DEPTH[i];
        const h = i === BAND.length - 1 ? VH - y0 : DEPTH[i + 1] - DEPTH[i];
        if (h <= 0) continue;
        X.rect(ctx, sx, y0, 2, h, BAND[U.clamp(i + offAt(i), 0, BAND.length - 1)]);
      }
      const off = offAt(0);
      X.rect(ctx, sx, y, 2, 2, BAND[U.clamp(off, 0, 3)]);
      // grit and boulders half-buried in the crust, stable frame to frame
      if (U.hash2(sx, 7) > 0.8) X.rect(ctx, sx, y + 5 + ((U.hash2(sx, 9) * 26) | 0), 2, 2, BAND[U.clamp(1 + off, 0, 9)]);
      if (U.hash2(sx, 29) > 0.94) {
        const by = y + 12 + ((U.hash2(sx, 31) * 40) | 0);
        X.rect(ctx, sx - 2, by, 6, 4, BAND[U.clamp(2 + off, 0, 9)]);
        X.rect(ctx, sx - 2, by, 6, 1, BAND[U.clamp(off, 0, 9)]);
      }
    }
    // craters, sunk into the curve
    for (const c of CRATERS) {
      const x = c.x - cam;
      const gy = groundY(c.x);
      if (gy > VH) continue;
      X.blob(ctx, x, gy + c.r * 0.3, c.r, c.r * 0.32, '#453e5e');
      X.blob(ctx, x, gy + c.r * 0.08, c.r * 0.9, c.r * 0.16, '#8e86a8');
    }
    for (const r of RUINS) { const gy = groundY(r.x); if (gy < VH) AH.blit(ctx, AH.S['ruin' + r.k], 0, r.x - cam, gy + 2); }
    for (const r of OUT_ROCKS) { const gy = groundY(r.x); if (gy < VH) AH.blit(ctx, AH.S['rock' + r.k], 0, r.x - cam, gy + 2); }
    // a rim of dust sitting on the skyline, thickest out at the ends where the
    // ground is falling away from you
    ctx.globalAlpha = 0.3;
    for (let sx = x0; sx <= x1; sx += 4) {
      const gy = groundY(sx + cam);
      if (gy > VH) continue;
      const edge = Math.abs(sx - MOON.cx) / 240;
      if (U.hash2(sx, 3) > 0.55 - edge * 0.4) X.rect(ctx, sx, gy - 2 - ((U.hash2(sx, 5) * 3) | 0), 2, 2, '#6b6480');
    }
    ctx.globalAlpha = 1;
    void t;
  }

  function drawOutside(ctx, g, t, cam) {
    drawSpace(ctx, g, t, cam);
    drawBall(ctx, t, cam);

    // the house, standing on the curve with light in the window
    const hx = OUT_SPOTS[0].x - cam;
    const gy = groundY(OUT_SPOTS[0].x);
    X.blob(ctx, hx, gy + 2, 46, 4, '#241f36');
    AH.blit(ctx, AH.S.house, 1, hx, gy + 3);
    F.draw(ctx, 'MY HOUSE', hx - 1, gy - 82, '#ffe9a8', { center: true });
    // smoke out of the chimney, in fat stepped puffs
    for (let i = 0; i < 6; i++) {
      const f = ((t * 0.3 + i / 6) % 1);
      ctx.globalAlpha = (1 - f) * 0.45;
      X.blob(ctx, hx + 27 + Math.sin(f * 5 + i) * 7, gy - 70 - f * 44, 3 + f * 9, 2 + f * 8, '#6b6480');
    }
    ctx.globalAlpha = 1;

    // the UFO, up on its bricks, bobbing because nothing here sits still
    const ux = OUT_SPOTS[1].x - cam;
    const uy = groundY(OUT_SPOTS[1].x);
    X.blob(ctx, ux, uy + 1, 40, 4, '#241f36');
    AH.blit(ctx, AH.S.saucer, Math.floor(t * 3) % 2, ux, uy + 2 + Math.sin(t * 1.6) * 1);
    const fx = OUT_SPOTS[1].x + 54;
    AH.blit(ctx, AH.S.flag, Math.floor(t * 4) % 2, fx - cam, groundY(fx) + 2);
    const svx = OUT_SPOTS[0].x - 66;
    AH.blit(ctx, AH.S.survey, 0, svx - cam, groundY(svx) + 2);
    if (moonClean(g)) drawBuildings(ctx, g, t, cam);

    /* Whatever is left of the tip, plus a wash of grime over the regolith
       that lifts as the heaps go. A clean moon is a visibly different moon. */
    const dirt = trashLeft(g) / TRASH.length;
    if (dirt > 0) {
      ctx.globalAlpha = dirt * 0.5;
      for (let x = -cam; x < VW; x += 6) {
        const wx = x + cam;
        X.dither(ctx, x, groundY(wx), 6, 7, '#5a4a2a', ((wx / 6) | 0) % 2 === 0);
      }
      ctx.globalAlpha = 1;
      // flies, or whatever passes for them out here
      for (let i = 0; i < 14; i++) {
        if (i / 14 > dirt) break;
        const h = TRASH[i % TRASH.length];
        if (cleaned(g, i % TRASH.length)) continue;
        const fx2 = h.x - cam + Math.sin(t * 3 + i) * 9;
        const fy2 = groundY(h.x) - 20 + Math.cos(t * 4.3 + i * 2) * 7;
        X.rect(ctx, fx2, fy2, 1, 1, '#3a3348');
      }
    }
    for (let i = 0; i < TRASH.length; i++) {
      if (cleaned(g, i)) continue;
      const h = TRASH[i];
      const hy = groundY(h.x);
      X.blob(ctx, h.x - cam, hy + 1, 22, 3, '#241f36');
      AH.blit(ctx, AH.S['moonjunk' + h.k], 0, h.x - cam, hy + 2);
    }
    // the hatch. Buried until the last heap goes, then lit and humming.
    if (moonClean(g)) {
      const cy2 = groundY(CLUB_X);
      const lit = Math.sin(t * 3) > -0.5;
      AH.blit(ctx, AH.S.clubsign, lit ? 1 : 0, CLUB_X - cam, cy2 + 2);
      if (lit) {
        ctx.globalAlpha = 0.16 + Math.sin(t * 3) * 0.06;
        X.blob(ctx, CLUB_X - cam, cy2 - 22, 26, 16, '#ff5fa8');
        ctx.globalAlpha = 1;
      }
      F.draw(ctx, 'CLUB', CLUB_X - cam, cy2 - 40, lit ? '#7ef9ff' : '#2a4a56', { center: true, scale: 2, shadow: '#0a0614' });
      // and the thump of it coming up through the rock
      const bt = beatOf(t);
      if (bt < 0.16) {
        ctx.globalAlpha = (0.16 - bt) * 2;
        X.ring(ctx, CLUB_X - cam, cy2 - 4, 10 + bt * 90, '#ff5fa8', 2);
        ctx.globalAlpha = 1;
      }
    }
  }

  /* ------------------------------------------------------------ the club room
     A hole in the moon with a floor that changes colour under you, a man on
     the decks who has two records, somebody on a pole who would rather be in
     bed, and nine regulars with nothing useful to say. */
  /* ------------------------------------------------------------- the walls
     A big room with nothing on the walls is a corridor. Everything here is
     placed deterministically off its own x, so the same junk is in the same
     place every night: posters nobody has taken down, flyers stapled over
     flyers, vents, pipework, graffiti, gold discs for records that did not
     sell, a payphone, and a fire door that has been chained since before you
     were born. The furniture keeps its own gaps. */
  const WALL_GAPS = [[0, 140], [166, 226], [296, 392], [376, 436], [548, 700],
    [634, 694], [740, 862], [890, 1044]];
  function wallFree(x) {
    for (const g of WALL_GAPS) if (x > g[0] && x < g[1]) return false;
    return true;
  }
  function clubWall(ctx, t, cam) {
    const TOP = CLUB_CEIL + 30;
    for (let x = 150; x < CLUB_W - 30; x += 46) {
      if (!wallFree(x)) continue;
      const k = Math.floor(U.hash2(x, 3) * 9);
      const px = x - cam, y = TOP + Math.round(U.hash2(x, 7) * 26);
      if (px < -70 || px > VW + 70) continue;
      if (k === 0) {                                   // a poster in a frame
        const h = 30 + Math.round(U.hash2(x, 11) * 14);
        X.plate(ctx, px - 13, y, 26, h, '#241c3a', '#3a3055', '#100a1c', 2);
        const c = ['#ff5fa8', '#7ef9ff', '#ffd34d', '#8affa0'][k + Math.floor(U.hash2(x, 13) * 4) % 4];
        X.rect(ctx, px - 10, y + 3, 20, h - 12, '#140f26');
        X.blob(ctx, px, y + 12, 6, 7, c);
        X.rect(ctx, px - 8, y + h - 8, 16, 2, c);
        X.rect(ctx, px - 6, y + h - 5, 12, 1, '#6b6480');
      } else if (k === 1) {                            // flyers, over flyers
        for (let i = 0; i < 5; i++) {
          const fx = px - 12 + (i % 3) * 9, fy = y + ((i / 3) | 0) * 13 + (i % 2) * 2;
          X.rect(ctx, fx, fy, 8, 11, ['#c9bce8', '#8a8ab0', '#b0a8d0'][i % 3]);
          X.rect(ctx, fx + 1, fy + 2, 6, 1, '#3a3348');
          X.rect(ctx, fx + 1, fy + 5, 6, 1, '#3a3348');
          X.rect(ctx, fx + 1, fy + 8, 4, 1, '#3a3348');
        }
      } else if (k === 2) {                            // a vent, turning
        X.plate(ctx, px - 11, y, 22, 22, '#1a1424', '#2e2640', '#0a0614', 3);
        for (let i = 0; i < 3; i++) {
          const a = t * 3.5 + i * 2.1;
          X.line(ctx, px, y + 11, px + Math.cos(a) * 8, y + 11 + Math.sin(a) * 8, '#3a3348', 2);
        }
        X.blob(ctx, px, y + 11, 2, 2, '#5a5474');
      } else if (k === 3) {                            // somebody's tag
        const c = ['#ff5fa8', '#8affa0', '#7ef9ff'][Math.floor(U.hash2(x, 17) * 3)];
        ctx.globalAlpha = 0.75;
        for (let i = 0; i < 7; i++) {
          const a = U.hash2(x + i, 19);
          X.line(ctx, px - 16 + i * 5, y + 6 + a * 12, px - 12 + i * 5, y + 16 - a * 12, c, 2);
        }
        ctx.globalAlpha = 1;
      } else if (k === 4) {                            // a gold disc, framed
        X.plate(ctx, px - 14, y, 28, 28, '#3a2a1a', '#6a5220', '#1c1208', 3);
        X.blob(ctx, px, y + 14, 10, 10, '#12101c');
        X.blob(ctx, px, y + 14, 9, 9, '#c99a1e');
        X.blob(ctx, px, y + 14, 5, 5, '#ffd34d');
        X.blob(ctx, px, y + 14, 2, 2, '#12101c');
        X.rect(ctx, px - 9, y + 24, 18, 2, '#8a6a2a');
      } else if (k === 5) {                            // pipework, down the wall
        for (const o of [-6, 6]) {
          X.rect(ctx, px + o - 2, CLUB_CEIL + 10, 4, FLOOR - CLUB_CEIL - 10, '#2e2640');
          X.rect(ctx, px + o - 2, CLUB_CEIL + 10, 1, FLOOR - CLUB_CEIL - 10, '#48405e');
          for (let j = 0; j < 4; j++) X.rect(ctx, px + o - 3, CLUB_CEIL + 26 + j * 30, 6, 3, '#3a3348');
        }
      } else if (k === 6) {                            // the fire door, chained
        X.plate(ctx, px - 16, FLOOR - 52, 32, 52, '#1d2a20', '#2e4436', '#0a1410', 3);
        X.rect(ctx, px - 1, FLOOR - 50, 2, 48, '#0f1a14');
        X.rect(ctx, px - 12, FLOOR - 30, 24, 3, '#6b7e70');
        for (let i = 0; i < 6; i++) X.blob(ctx, px - 10 + i * 4, FLOOR - 28, 2, 2, '#8e86a8');
        X.plate(ctx, px - 12, FLOOR - 64, 24, 10, '#0f2a18', '#2f7a52', '#04100a', 2);
        F.draw(ctx, 'EXIT', px, FLOOR - 61, '#8affa0', { center: true, shadow: false });
      } else if (k === 7) {                            // a payphone nobody uses
        X.plate(ctx, px - 9, y + 6, 18, 26, '#1a2430', '#2e4256', '#0a1018', 3);
        X.rect(ctx, px - 6, y + 9, 12, 8, '#0d1620');
        for (let i = 0; i < 9; i++) X.rect(ctx, px - 5 + (i % 3) * 4, y + 19 + ((i / 3) | 0) * 3, 3, 2, '#4f6a80');
        X.curve(ctx, px - 9, y + 14, px - 15, y + 24, px - 8, y + 32, '#12181f', 2, 7);
        X.rect(ctx, px - 11, y + 30, 7, 5, '#2e4256');
      } else {                                          // a mirror, with the room in it
        X.plate(ctx, px - 15, y, 30, 40, '#2a2438', '#453c5c', '#0a0614', 3);
        X.rect(ctx, px - 12, y + 3, 24, 34, '#1d2436');
        ctx.globalAlpha = 0.35;
        X.rect(ctx, px - 12, y + 3, 24, 10, '#3a4a66');
        X.blob(ctx, px + 4, y + 26, 5, 7, '#2e3a52');
        ctx.globalAlpha = 1;
        X.rect(ctx, px - 10, y + 5, 3, 30, 'rgba(255,255,255,0.12)');
      }
    }
  }

  /* The floor: tape, cable runs, and everything that has been dropped on it. */
  function clubFloor(ctx, t, cam) {
    for (let x = 20; x < CLUB_W; x += 37) {
      const px = x - cam;
      if (px < -40 || px > VW + 40) continue;
      const k = Math.floor(U.hash2(x, 23) * 6);
      if (k === 0) {                                    // gaffer tape over a cable
        X.rect(ctx, px - 14, FLOOR + 7, 28, 2, '#2a2438');
        X.rect(ctx, px - 6, FLOOR + 6, 12, 4, '#3a3348');
      } else if (k === 1) {                             // a dropped glass
        X.rect(ctx, px, FLOOR + 4, 4, 5, 'rgba(200,220,255,0.3)');
        X.rect(ctx, px, FLOOR + 4, 4, 1, '#d8f0ff');
        X.blob(ctx, px + 2, FLOOR + 9, 5, 1.5, '#2f7a52');
      } else if (k === 2) {                             // flyers, trodden flat
        for (let i = 0; i < 3; i++) X.rect(ctx, px + i * 6 - 6, FLOOR + 6 + (i % 2) * 3, 5, 2, '#6b6480');
      } else if (k === 3) {                             // a bottle on its side
        X.rect(ctx, px - 5, FLOOR + 6, 11, 3, '#2f5a3a');
        X.rect(ctx, px + 6, FLOOR + 6, 3, 3, '#8affa0');
      } else if (k === 4) {                             // a cable, snaking off
        X.curve(ctx, px - 18, FLOOR + 9, px, FLOOR + 5, px + 18, FLOOR + 9, '#1a1424', 2, 8);
      }
    }
  }

  function drawClub(ctx, g, t, cam) {
    const bt = beatOf(t);
    const punch = Math.max(0, 1 - bt * 5);
    X.rect(ctx, 0, 0, VW, VH, '#1a1230');
    X.rect(ctx, 0, CLUB_CEIL - 44, VW, 44, '#241f36');
    rockEdge(ctx, 0, VW, CLUB_CEIL, 1, '#3a3348', '#241f36', 7);
    X.rect(ctx, 0, FLOOR, VW, VH - FLOOR, '#140e28');
    // back wall: panels, then pipes and an extractor bolted across them
    for (let x = 0; x < CLUB_W; x += 22) {
      X.rect(ctx, x - cam, CLUB_CEIL + 8, 20, FLOOR - CLUB_CEIL - 8, ((x / 22) | 0) % 2 ? '#221842' : '#1d1438');
    }
    X.rect(ctx, -cam, CLUB_CEIL + 8, CLUB_W, 2, '#2e2450');
    for (let x = 10; x < CLUB_W; x += 96) X.rect(ctx, x - cam, CLUB_CEIL + 12, 76, 3, '#2a2140');
    const fx3 = 344 - cam;
    X.rect(ctx, fx3 - 11, CLUB_CEIL + 16, 22, 22, '#1a1424');
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + i * 2.1;
      X.line(ctx, fx3, CLUB_CEIL + 27, fx3 + Math.cos(a) * 9, CLUB_CEIL + 27 + Math.sin(a) * 9, '#3a3348', 2);
    }
    // neon, and a poster or two
    for (let i = 0; i < 33; i++) {
      const on = (Math.floor(t * 4) + i) % 3 !== 0;
      X.rect(ctx, 12 + i * 44 - cam, CLUB_CEIL + 20, 32, 2, on ? '#ff5fa8' : '#4a1c3a');
      X.rect(ctx, 12 + i * 44 - cam, CLUB_CEIL + 26, 32, 2, on ? '#7ef9ff' : '#12384a');
    }
    for (const [px, lab, col] of [[196, 'TONITE', '#ffd34d'], [406, 'NO DRILLS', '#ff5a4d'],
      [664, 'LIVE', '#8affa0'], [846, 'CASH ONLY', '#7ef9ff'], [986, 'NO REFUNDS', '#ff5fa8']]) {
      X.plate(ctx, px - cam, CLUB_CEIL + 34, 46, 18, '#120a1c', '#3a3348', '#000000', 3);
      F.draw(ctx, lab, px + 23 - cam, CLUB_CEIL + 40, col, { center: true, shadow: false });
    }

    // the lit tiles, underfoot
    X.rect(ctx, -cam, FLOOR - 1, CLUB_W, 1, '#2e2450');
    const TILE = 18, T0 = 390;
    for (let i = 0; i < 11; i++) {
      const k = (Math.floor(t * 4.4) + i) % 4;
      const col = ['#ff5fa8', '#7ef9ff', '#ffd34d', '#8affa0'][k];
      X.rect(ctx, T0 + i * TILE - cam, FLOOR, TILE - 2, 13, col);
      ctx.globalAlpha = 0.4;
      X.rect(ctx, T0 + i * TILE - cam, FLOOR, TILE - 2, 3, '#ffffff');
      ctx.globalAlpha = 0.10 + punch * 0.16;
      X.blob(ctx, T0 + i * TILE + TILE / 2 - cam, FLOOR - 24, 11, 24, col);
      ctx.globalAlpha = 1;
    }
    // spilled drinks and dropped glasses, because people have been in here
    for (const [lx, lk] of [[200, 0], [352, 1], [466, 0], [598, 1], [712, 0], [858, 1], [1000, 0]]) {
      if (lk) { X.blob(ctx, lx - cam, FLOOR + 6, 7, 2, '#2f7a52'); X.blob(ctx, lx - cam, FLOOR + 6, 4, 1, '#8affa0'); }
      else { X.rect(ctx, lx - cam, FLOOR + 4, 4, 5, '#7ec8ff'); X.rect(ctx, lx - cam, FLOOR + 4, 4, 1, '#d8f0ff'); }
    }

    clubWall(ctx, t, cam);
    clubFloor(ctx, t, cam);
    drawBooths(ctx, g, t, cam);
    drawRoomba(ctx, t, cam);
    drawStack(ctx, 372, cam, punch);
    drawStack(ctx, 570, cam, punch);
    drawStack(ctx, 690, cam, punch);
    drawStack(ctx, 906, cam, punch);
    drawDJ(ctx, g, t, cam, punch);
    drawStage(ctx, g, t, cam, punch);
    drawBar(ctx, g, t, cam);
    drawSlots(ctx, g, t, cam);

    // a mirror ball, throwing spots about
    const mbx = 480 - cam, mby = CLUB_CEIL + 24;
    X.rect(ctx, mbx, CLUB_CEIL + 6, 1, 18, '#5a5474');
    X.blob(ctx, mbx, mby, 9, 9, '#8e86a8');
    for (let i = 0; i < 9; i++) {
      const a = t * 1.6 + i * 0.7;
      X.rect(ctx, mbx + Math.cos(a) * 6, mby + Math.sin(a * 1.3) * 6, 2, 2, i % 2 ? '#ffffff' : '#c9bce8');
    }
    for (let i = 0; i < 12; i++) {
      const a = t * 0.9 + i * (U.TAU / 12);
      ctx.globalAlpha = 0.10 + 0.06 * Math.sin(t * 3 + i);
      X.blob(ctx, mbx + Math.cos(a) * 150, CLUB_CEIL + 46 + Math.sin(a * 2) * 48, 7, 7, '#d8fbff');
      ctx.globalAlpha = 1;
    }
    // two spotlights sweeping the room, and a fan of lasers on the beat
    for (let i = 0; i < 5; i++) {
      const rx = 230 + i * 200 - cam;
      const sw = Math.sin(t * (0.7 + i * 0.35) + i * 2) * 90;
      ctx.globalAlpha = 0.09;
      X.poly(ctx, [[rx - 5, CLUB_CEIL + 8], [rx + 5, CLUB_CEIL + 8],
        [rx + sw + 26, FLOOR], [rx + sw - 26, FLOOR]], i ? '#7ef9ff' : '#ff5fa8');
      ctx.globalAlpha = 1;
      X.rect(ctx, rx - 5, CLUB_CEIL + 4, 10, 5, '#2a2140');
    }
    if (punch > 0.4) {
      ctx.globalAlpha = (punch - 0.4) * 0.45;
      for (let i = -4; i <= 4; i++) X.line(ctx, 480 - cam, CLUB_CEIL + 10, 480 - cam + i * 42, FLOOR, '#8affa0', 1);
      ctx.globalAlpha = 1;
    }

    for (const c of CLUBBERS) drawClubber(ctx, c, t, cam);
    for (const c of CLUBBERS) if (c.say) {
      const K = AH.KIN[c.k % AH.KIN.length];
      sayBubble(ctx, c.x - cam, FLOOR - K.h - 4, c.say, c.sayT);
    }

    // haze, drifting
    for (let i = 0; i < 10; i++) {
      const hx = ((U.hash2(i, 3) * CLUB_W + t * (6 + U.hash2(i, 7) * 8)) % CLUB_W) - cam;
      ctx.globalAlpha = 0.05 + 0.03 * Math.sin(t + i);
      X.blob(ctx, hx, FLOOR - 26 - U.hash2(i, 11) * 44, 26, 9, '#c9bce8');
      ctx.globalAlpha = 1;
    }
    if (bt < 0.06 && Math.floor(t * 2.2) % 4 === 0) {
      ctx.globalAlpha = (0.06 - bt) * 5;
      X.rect(ctx, 0, 0, VW, VH, '#ffffff');
      ctx.globalAlpha = 1;
    }

    // the way out, with the door staff still standing in it
    X.plate(ctx, 12 - cam, FLOOR - 48, 30, 48, '#120a1c', '#3a3348', '#000000', 4);
    X.rect(ctx, 16 - cam, FLOOR - 44, 22, 40, '#241f36');
    F.draw(ctx, 'OUT', 27 - cam, FLOOR - 58, '#8affa0', { center: true, shadow: '#0a0614' });
    X.rect(ctx, 64 - cam, FLOOR - 20, 2, 20, '#8e86a8');
    X.rect(ctx, 80 - cam, FLOOR - 20, 2, 20, '#8e86a8');
    X.curve(ctx, 65 - cam, FLOOR - 18, 72 - cam, FLOOR - 11, 81 - cam, FLOOR - 18, '#8a2f4a', 2, 7);
    AH.blit(ctx, AH.S.bouncer, 0, 52 - cam, FLOOR + 1);

    // the coat check
    X.rect(ctx, 92 - cam, FLOOR - 74, 2, 74, '#5a5474');
    X.rect(ctx, 120 - cam, FLOOR - 74, 2, 74, '#5a5474');
    X.rect(ctx, 92 - cam, FLOOR - 74, 30, 2, '#8e86a8');
    for (let i = 0; i < 4; i++) X.rect(ctx, 95 - cam + i * 7, FLOOR - 72, 3, 7, '#3a3348');
    F.draw(ctx, 'COATS', 107 - cam, FLOOR - 84, '#8e86a8', { center: true, shadow: '#0a0614' });

    // and the doors nobody wants to draw
    for (const [dx, lab] of [[930, 'LOO'], [956, 'LOO'], [154, 'STAFF']]) {
      X.plate(ctx, dx - cam, FLOOR - 40, 18, 40, '#241f36', '#3a3348', '#120a1c', 3);
      F.draw(ctx, lab, dx + 9 - cam, FLOOR - 50, '#6b6480', { center: true, shadow: false });
    }
  }

  /* ------------------------------------------------------------ THE GALAXY ROOM
     Through the arch at the back of the club is the same room the whole night
     ends in -- the same purple and gold, the same red carpet, the same velvet
     rope, and THE UNIVERSAL standing at the end of it. Three ordinary machines
     stand in front of it and you can lose money at any of them. The odds are
     the odds: about three quarters of what goes in comes back out, which is
     exactly how you ended up owing a shark a million dollars. */
  const SLOT_X = [1104, 1164, 1224];
  const STAKE = 200;
  const SLOT = { at: -1, t: 0, reel: [0, 0, 0], land: [0, 0, 0], lever: 0, win: 0, msg: 0 };

  const SLOT_LOSE = [
    'NOTHING. THE MACHINE IS VERY SORRY.',
    'SO CLOSE. IT WAS NOT CLOSE.',
    'THE MACHINE DID NOT WANT IT. AGAIN.',
    'THREE SKULLS WOULD HAVE BEEN SOMETHING.',
    'IT MAKES THE WINNING NOISE ANYWAY. THAT IS THE TRICK.'
  ];

  function playSlot(g, i) {
    if (SLOT.at >= 0) return;                       // one at a time
    if (g.save.credits < STAKE) { say('TWO HUNDRED A GO. YOU HAVE NOT GOT IT.'); A.sfx.deny(); return; }
    g.save.credits -= STAKE;
    SLOT.at = i; SLOT.t = 0; SLOT.lever = 1; SLOT.win = 0; SLOT.msg = 0;
    // decide first, then make the reels land on the decision
    const r = U.rand();
    if (r < 0.03) { const k = U.randInt(0, 4); SLOT.land = [k, k, k]; SLOT.win = STAKE * 12; }
    else if (r < 0.23) {
      const k = U.randInt(0, 4);
      let o = U.randInt(0, 4); if (o === k) o = (k + 1) % 5;
      SLOT.land = U.shuffle([k, k, o]); SLOT.win = STAKE * 2;
    } else {
      const a = U.randInt(0, 4);
      let b = (a + 1 + U.randInt(0, 3)) % 5, c = (b + 1 + U.randInt(0, 2)) % 5;
      if (c === a) c = (c + 1) % 5;
      SLOT.land = [a, b, c]; SLOT.win = 0;
    }
    A.sfx.tone(200, { type: 'square', to: 520, dur: 0.2, vol: 0.08 });
    PD.chum.call(g, 'gamble');
    g.save.spun = (g.save.spun || 0) + 1;
    g.saveGame();
  }

  function updateSlots(dt, g) {
    SLOT.lever = Math.max(0, SLOT.lever - dt * 2.4);
    SLOT.msg = Math.max(0, SLOT.msg - dt);
    if (SLOT.at < 0) return;
    SLOT.t += dt;
    const STOP = [0.85, 1.25, 1.7];
    for (let i = 0; i < 3; i++) {
      if (SLOT.t < STOP[i]) SLOT.reel[i] = (SLOT.reel[i] + dt * (26 - i * 4)) % 5;
      else if (Math.floor(SLOT.reel[i]) !== SLOT.land[i]) {
        SLOT.reel[i] = SLOT.land[i];
        A.sfx.tone(340 + i * 90, { type: 'square', dur: 0.05, vol: 0.06 });
      }
    }
    if (SLOT.t < 2.0) return;
    // and the result
    const mx = SLOT_X[SLOT.at];
    if (SLOT.win > 0) {
      g.save.credits += SLOT.win;
      const three = SLOT.win >= STAKE * 12;
      say(three ? 'THREE THE SAME. THE ROOM STOPS. YOU WIN ' + U.fmt(SLOT.win) + '.'
        : 'TWO THE SAME. YOU GET ' + U.fmt(SLOT.win) + ' BACK. WELL DONE.');
      FX.text(mx, FLOOR - 108, '+$' + U.fmt(SLOT.win), '#ffd34d', three ? 2 : 1);
      A.sfx.fanfare && A.sfx.fanfare();
      for (let k = 0; k < (three ? 50 : 16); k++) {
        FX.spawn({ x: mx + U.rand(-16, 16), y: FLOOR - 34, vx: U.rand(-140, 140), vy: U.rand(-230, -60),
          life: 1.5, size: 2, glow: 1, color: k % 3 ? '#ffd34d' : '#ff5fa8', grav: 220, drag: 1 });
      }
      if (three) { FX.ring(mx, FLOOR - 44, 4, 80, 1, '#ffd34d', 3); PD.chum.call(g, 'jackpot', true); }
    } else {
      say(U.pick(SLOT_LOSE));
      A.sfx.deny();
      FX.text(mx, FLOOR - 108, '-$' + STAKE, '#ff5a4d', 0);
    }
    SLOT.msg = 2.4;
    SLOT.at = -1;
    g.saveGame();
  }

  /* The alcove: an arch, a carpet nobody has ever cleaned, three machines and
     whoever has been standing at one of them since before you arrived. */
  function drawSlots(ctx, g, t, cam) {
    const a0 = 1050 - cam;
    const W = 380, CH2 = CLUB_CEIL;
    const HUES = PD.chum.HUES;

    /* ------------------------------------------------ the room through there
       The same room you end up in later, at a tenth of the size: purple walls,
       an arcade of lit rooms along the back, gold lamps, red carpet with the
       house diamond stamped into it, and a velvet rope holding nobody back. */
    X.rect(ctx, a0 + 10, CH2, W, FLOOR - CH2, '#25103c');
    const grd = ctx.createLinearGradient(0, CH2, 0, FLOOR);
    grd.addColorStop(0, '#1a0a2e'); grd.addColorStop(1, '#3a1550');
    ctx.fillStyle = grd; ctx.fillRect(a0 + 10, CH2, W, FLOOR - CH2);
    // the arcade: six lit openings with a rank of little machines in each
    for (let i = 0; i < 11; i++) {
      const x = a0 + 26 + i * 34, hue = HUES[i % HUES.length];
      X.rect(ctx, x - 14, CH2 + 8, 28, 40, '#1c0c30');
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI + k * (Math.PI / 8);
        X.blob(ctx, x + Math.cos(a) * 14, CH2 + 8 + Math.sin(a) * 9, 2, 2, '#4a2270');
      }
      ctx.globalAlpha = 0.2; X.rect(ctx, x - 13, CH2 + 10, 26, 38, hue); ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.45; X.rect(ctx, x - 13, CH2 + 10, 26, 2, hue); ctx.globalAlpha = 1;
      for (let m = -1; m <= 1; m++) {
        X.rect(ctx, x + m * 8 - 3, CH2 + 34, 7, 14, '#150920');
        X.rect(ctx, x + m * 8 - 3, CH2 + 32, 7, 2, '#22102f');
        const on = (Math.floor(t * 3.5) + i + m) % 4 !== 0;
        X.rect(ctx, x + m * 8 - 2, CH2 + 37, 5, 3, on ? hue : '#1d0c2c');
      }
      X.rect(ctx, x - 18, CH2 + 6, 8, 44, '#2e1446');                  // the pier
      X.rect(ctx, x - 18, CH2 + 6, 2, 44, '#4a2270');
    }
    // a rail along the front of it, and two chandeliers
    X.rect(ctx, a0 + 10, CH2 + 50, W, 3, '#4a2270');
    X.rect(ctx, a0 + 10, CH2 + 50, W, 1, '#8a5ac0');
    for (let i = 0; i < 42; i++) X.rect(ctx, a0 + 14 + i * 9, CH2 + 53, 2, 6, '#3c1a58');
    for (const gx of [a0 + 62, a0 + 190, a0 + 318]) {
      const cy = CH2 + 14 + Math.sin(t * 0.6 + gx) * 1;
      X.rect(ctx, gx, CH2, 1, 14, '#5a4a78');
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * U.TAU + t * 0.22;
        X.blob(ctx, gx + Math.cos(a) * 7, cy + Math.sin(a) * 3, 2, 2, '#ffe9a8');
      }
      X.blob(ctx, gx, cy + 1, 4, 3, '#fff3b0');
      ctx.globalAlpha = 0.14; X.blob(ctx, gx, cy + 5, 20, 12, '#ffd34d'); ctx.globalAlpha = 1;
    }

    // the carpet, with the house diamond stamped into it
    X.rect(ctx, a0 + 10, FLOOR, W, VH - FLOOR, '#3a0e26');
    for (let y = 0; y < VH - FLOOR; y += 6) {
      X.rect(ctx, a0 + 10, FLOOR + y, W, 6, y > 12 ? '#4a1230' : '#3d0f28');
      for (let x = (y * 7) % 22; x < W; x += 22) {
        X.rect(ctx, a0 + 10 + x, FLOOR + y + 2, 8, 2, y > 12 ? '#5c1a3c' : '#47122e');
      }
    }
    for (let x = 6; x < W; x += 34) {
      ctx.globalAlpha = 0.5;
      X.poly(ctx, [[a0 + 10 + x, FLOOR + 10], [a0 + 16 + x, FLOOR + 15],
        [a0 + 10 + x, FLOOR + 20], [a0 + 4 + x, FLOOR + 15]], '#5c1a3c');
      ctx.globalAlpha = 1;
    }
    X.rect(ctx, a0 + 10, FLOOR - 1, W, 2, '#2a0a1c');
    X.rect(ctx, a0 + 10, FLOOR + 1, W, 1, '#57163a');
    // the velvet rope, the same as the one in the big room
    for (let i = 0; i < 9; i++) {
      const px = a0 + 24 + i * 44;
      if (i < 8) {
        X.curve(ctx, px, FLOOR + 12, px + 22, FLOOR + 19, px + 44, FLOOR + 12, '#5e0f2c', 3, 8);
        X.curve(ctx, px, FLOOR + 11, px + 22, FLOOR + 18, px + 44, FLOOR + 11, '#a8265a', 1, 8);
      }
      X.rect(ctx, px - 1, FLOOR + 11, 3, 10, '#8a6a2a');
      X.rect(ctx, px - 1, FLOOR + 11, 1, 10, '#ffd34d');
      X.blob(ctx, px, FLOOR + 10, 2.5, 2.5, '#ffd34d');
    }

    // the way through: a gold jamb, so it reads as a threshold and not a seam
    X.plate(ctx, a0 - 5, CLUB_CEIL + 2, 20, FLOOR - CLUB_CEIL - 2, '#2e1446', '#5e2a86', '#120722', 3);
    X.rect(ctx, a0 + 3, CLUB_CEIL + 10, 5, FLOOR - CLUB_CEIL - 16, '#7a3aae');
    X.plate(ctx, a0 - 8, CLUB_CEIL, 26, 9, '#351550', '#7a3aae', '#170a2a', 3);
    X.plate(ctx, a0 - 8, FLOOR - 10, 26, 10, '#351550', '#7a3aae', '#170a2a', 3);
    for (let i = 0; i < 9; i++) {
      const on = (Math.floor(t * 5) + i) % 4 !== 0;
      X.blob(ctx, a0 + 5, CLUB_CEIL + 18 + i * 12, 2.5, 2.5, on ? '#ffd34d' : '#4a3a10');
    }
    X.rect(ctx, a0 + 10, CLUB_CEIL, W, 6, '#2e1446');
    for (let i = 0; i <= 28; i++) {
      const on = (Math.floor(t * 6) + i) % 4 !== 0;
      X.blob(ctx, a0 + 18 + i * 13, CLUB_CEIL + 3, 2.5, 2.5, on ? '#ffd34d' : '#4a3a10');
    }
    const lit = Math.sin(t * 5) > -0.3;
    X.plate(ctx, a0 + 110, CLUB_CEIL - 22, 168, 22, '#3a0e26', '#ff5fa8', '#180510', 4);
    F.draw(ctx, 'THE GALAXY ROOM', a0 + 194, CLUB_CEIL - 18, lit ? '#ffd6f0' : '#7a4a68',
      { center: true, shadow: '#180510' });
    F.draw(ctx, 'NO CREDIT  NO REFUNDS  NO PITY', a0 + 194, CLUB_CEIL - 9, '#ff8ad8',
      { center: true, shadow: '#180510' });

    for (let i = 0; i < 3; i++) drawMachine(ctx, g, t, cam, i);
    drawUniversalCab(ctx, g, t, cam);
    // the two who have been here since before you arrived
    for (const q of [{ x: 1076, k: 12 }, { x: 1284, k: 13 }, { x: 1400, k: 17 }]) {
      const K = AH.KIN[q.k % AH.KIN.length];
      const bob = Math.sin(t * 1.4 + q.x) * 1;
      kinShadow(ctx, q.x - cam, FLOOR, K);
      AH.blit(ctx, AH.S[K.key], (Math.floor(t * 1.1 + q.x) % 8) === 0 ? 5 : 0, q.x - cam, FLOOR + bob, true);
    }
  }

  /* THE UNIVERSAL, the same machine you end up in front of at the end of the
     night, standing here where you first saw it: takings meter, glass dome
     with a world turning in it, marquee, and a pillar of gold up each cheek. */
  function drawUniversalCab(ctx, g, t, cam) {
    const mx = 1344 - cam, B = FLOOR - 4;
    const RW = PD.chum.reelWorld;
    const hot = Math.sin(t * 5) > -0.3;
    // shadow and dais
    ctx.globalAlpha = 0.4; X.blob(ctx, mx, B + 2, 44, 4, '#0a0614'); ctx.globalAlpha = 1;
    X.plate(ctx, mx - 40, B - 10, 80, 12, '#2a1040', '#5e2a86', '#120722', 3);
    // the towers, chasing
    for (const sd of [-1, 1]) {
      const tx2 = mx + sd * 34;
      X.plate(ctx, tx2 - 7, B - 92, 14, 82, '#2a1442', '#5e2a86', '#120722', 3);
      for (let i = 0; i < 8; i++) {
        const on = (Math.floor(t * (hot ? 12 : 6)) + i * (sd > 0 ? 1 : -1)) % 4 !== 0;
        X.blob(ctx, tx2, B - 86 + i * 10, 3.5, 3.5, on ? '#ffd34d' : '#4a3a10');
      }
      const bo = Math.sin(t * 4 + (sd > 0 ? 0 : 1.6)) > -0.2;
      X.plate(ctx, tx2 - 6, B - 102, 12, 10, '#351550', '#7a3aae', '#170a2a', 3);
      X.blob(ctx, tx2, B - 105, 4, 4, bo ? '#ff5fa8' : '#4a1c3a');
    }
    // the body
    X.plate(ctx, mx - 30, B - 96, 60, 88, '#2a1442', '#5e2a86', '#120722', 5);
    X.plate(ctx, mx - 25, B - 90, 50, 76, '#1c0c2e', '#4a2270', '#0a0414', 4);
    // the dome on top, with a world going round in it
    X.blob(ctx, mx, B - 122, 20, 18, '#0a0418');
    ctx.save();
    ctx.beginPath(); ctx.rect(mx - 20, B - 140, 40, 36); ctx.clip();
    RW(ctx, mx, B - 121, 9, Math.floor(t * 0.22) % 5, t, 0);
    ctx.restore();
    X.ring(ctx, mx, B - 122, 20, '#12081e', 3);
    X.ring(ctx, mx, B - 122, 19, '#7a3aae', 1);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.1 + i * (Math.PI * 0.8 / 8);
      const on = (Math.floor(t * (hot ? 12 : 5)) + i) % 3 !== 0;
      X.blob(ctx, mx - Math.cos(a) * 20, B - 122 - Math.sin(a) * 18, 2, 2, on ? '#ffd34d' : '#4a3a10');
    }
    // the takings meter over the lot
    const take = 41200000 + Math.floor(t * 137) * 100;
    X.plate(ctx, mx - 34, B - 156, 68, 14, '#170a28', '#ff5fa8', '#080312', 3);
    F.draw(ctx, '$' + take.toLocaleString('en-US'), mx, B - 152, '#ffd34d', { center: true, shadow: '#3a0c30' });
    // the marquee
    X.plate(ctx, mx - 29, B - 102, 58, 16, '#170a28', hot ? '#ffd34d' : '#5a4418', '#080312', 3);
    F.draw(ctx, 'THE UNIVERSAL', mx, B - 99, hot ? '#ffd34d' : '#6a5a1a', { center: true, shadow: '#3a0c30' });
    F.draw(ctx, 'TEN TAKES THE LOT', mx, B - 91, hot ? '#ff5fa8' : '#4a1c3a', { center: true, shadow: '#1a0614' });
    // the window on to open space, and three worlds in it
    const WX = mx - 24, WY = B - 82, WW = 48, WH2 = 26;
    X.plate(ctx, WX - 2, WY - 2, WW + 4, WH2 + 4, '#3a1a58', '#6e3a9e', '#150828', 3);
    ctx.save();
    ctx.beginPath(); ctx.rect(WX, WY, WW, WH2); ctx.clip();
    X.rect(ctx, WX, WY, WW, WH2, '#0a0418');
    for (let i = 0; i < 14; i++) {
      const a = i * 1.31 + t * 0.06;
      X.rect(ctx, WX + WW / 2 + Math.cos(a) * 20, WY + WH2 / 2 + Math.sin(a * 1.7) * 10, 1, 1, '#7a6ab0');
    }
    for (let r = 0; r < 3; r++) RW(ctx, WX + 8 + r * 16, WY + WH2 / 2, 6, (r + 2) % 5, t, 0);
    ctx.restore();
    X.rect(ctx, WX, WY + WH2 / 2, WW, 1, 'rgba(255,95,168,0.5)');
    // the ten lamps, all dark: nobody has ever got ten
    for (let i = 0; i < 10; i++) {
      X.plate(ctx, mx - 25 + i * 5, B - 50, 4, 8, '#221238', '#54357a', '#0a0414', 1);
    }
    F.draw(ctx, '0/10', mx, B - 38, '#8a7ab0', { center: true, shadow: '#1a0614' });
    // the ledge, the tray and the lever
    X.plate(ctx, mx - 30, B - 26, 60, 6, '#351550', '#7a3aae', '#170a2a', 2);
    X.rect(ctx, mx - 12, B - 20, 24, 4, '#0a0614');
    X.plate(ctx, mx + 30, B - 34, 6, 8, '#2a1442', '#6e3a9e', '#120722', 2);
    X.limb(ctx, mx + 33, B - 30, mx + 41, B - 42, 3, 2, '#4a3f70', '#a89ad0', '#1c1430');
    X.blob(ctx, mx + 41, B - 43, 4, 4, '#5e0c22');
    X.blob(ctx, mx + 41, B - 43, 3, 3, '#c22a4a');
    ctx.globalAlpha = 0.12 + Math.abs(Math.sin(t * 3)) * 0.06;
    X.blob(ctx, mx, B - 70, 40, 56, '#ff5fa8');
    ctx.globalAlpha = 1;
  }

  function drawMachine(ctx, g, t, cam, i) {
    const mx = SLOT_X[i] - cam;
    const RW = PD.chum.reelWorld, hue = PD.chum.HUES[(i * 2 + 1) % PD.chum.HUES.length];
    /* The same cabinet as the rank in the big room, one size up so you can
       read what it has just done to you. It stands on a plinth: at floor level
       the reels sat at exactly your own head height. */
    const B = FLOOR - 6;
    const live = SLOT.at === i;
    const lv = live ? SLOT.lever * 12 : 0;
    ctx.globalAlpha = 0.35; X.blob(ctx, mx, B + 1, 18, 3, '#0a0614'); ctx.globalAlpha = 1;
    X.plate(ctx, mx - 22, B - 12, 44, 12, '#1b0f2c', '#3a2352', '#0a0614', 3);      // the base
    X.plate(ctx, mx - 19, B - 82, 38, 70, '#33184f', hue, '#120722', 4);
    X.plate(ctx, mx - 15, B - 64, 30, 22, '#0d0620', '#4a2a70', '#060310', 3);
    // the topper, out of step with its neighbours
    const on = Math.sin(t * 3 + i * 1.3) > -0.2;
    X.plate(ctx, mx - 17, B - 92, 34, 10, on ? '#3a2208' : '#170c22', on ? hue : '#33224a', '#0a0614', 2);
    F.draw(ctx, ['LUX', 'NOVA', 'HOT'][i % 3], mx, B - 89, '#fff3b0', { center: true, shadow: false });
    if (on) { ctx.globalAlpha = 0.2; X.blob(ctx, mx, B - 87, 20, 10, hue); ctx.globalAlpha = 1; }
    // the window on to open space, and the three worlds turning in it
    const WX = mx - 15, WY = B - 64, WW = 30, WH2 = 22;
    X.plate(ctx, WX - 3, WY - 3, WW + 6, WH2 + 6, '#3a1a58', '#6e3a9e', '#150828', 3);
    ctx.save();
    ctx.beginPath(); ctx.rect(WX, WY, WW, WH2); ctx.clip();
    X.rect(ctx, WX, WY, WW, WH2, '#0a0418');
    for (let k = 0; k < 10; k++) {
      const a = k * 1.31 + t * 0.08;
      X.rect(ctx, WX + WW / 2 + Math.cos(a) * 12, WY + WH2 / 2 + Math.sin(a * 1.7) * 8, 1, 1, '#7a6ab0');
    }
    for (let r = 0; r < 3; r++) {
      const rx = WX + 5 + r * 10;
      const spinning = live && SLOT.t < [0.85, 1.25, 1.7][r];
      const idx = Math.floor(live ? SLOT.reel[r] : (i * 2 + r) % 5) % 5;
      if (spinning) {
        // smeared, the way the big one does it
        const roll = SLOT.reel[r] * 2.4 + r;
        for (let k = -1; k <= 1; k++) {
          ctx.globalAlpha = 0.34 - Math.abs(k) * 0.1;
          RW(ctx, rx, WY + WH2 / 2 + k * 9 + (roll % 1) * 9, 4, Math.floor(roll) + k, t, 1);
          ctx.globalAlpha = 1;
        }
        ctx.globalAlpha = 0.16; X.rect(ctx, rx - 4, WY, 9, WH2, '#c9a8ff'); ctx.globalAlpha = 1;
      } else {
        RW(ctx, rx, WY + WH2 / 2, 4, idx, t, 0);
      }
      X.rect(ctx, rx + 5, WY, 1, WH2, '#3a1a58');
    }
    ctx.restore();
    X.rect(ctx, WX, WY + WH2 / 2, WW, 1, live && SLOT.t > 1.7 ? '#ff5a4d' : 'rgba(255,95,168,0.5)');
    X.rect(ctx, WX - 1, WY - 1, 1, WH2 + 2, '#8a5ac0');
    X.rect(ctx, WX + WW, WY - 1, 1, WH2 + 2, '#8a5ac0');
    // the stake, the tray, and the lever he should never pull
    X.plate(ctx, mx - 14, B - 38, 28, 10, '#0d0620', '#4a2a70', '#060310', 2);
    F.draw(ctx, '$' + STAKE, mx, B - 35, '#ffd34d', { center: true, shadow: '#1a0614' });
    X.plate(ctx, mx - 19, B - 26, 38, 5, '#351550', '#7a3aae', '#170a2a', 2);
    X.rect(ctx, mx - 8, B - 21, 16, 4, '#0a0614');
    X.plate(ctx, mx + 19, B - 48, 5, 7, '#2a1442', '#6e3a9e', '#120722', 2);
    X.limb(ctx, mx + 21, B - 45, mx + 27, B - 56 + lv, 3, 2, '#4a3f70', '#a89ad0', '#1c1430');
    X.blob(ctx, mx + 27, B - 57 + lv, 4, 4, '#5e0c22');
    X.blob(ctx, mx + 27, B - 57 + lv, 3, 3, '#c22a4a');
    X.blob(ctx, mx + 26, B - 58 + lv, 1.2, 1.2, '#ff8a9a');
  }

  /* A cleaning robot that has been going round this room since before any of
     them were born, and is not close to finished. */
  const ROOMBA = { x: 300, dir: 1, t: 0 };
  function drawRoomba(ctx, t, cam) {
    ROOMBA.t = t;
    const x = ((t * 26) % 620) + 60 - cam;
    const y = FLOOR + 6;
    X.blob(ctx, x, y + 3, 13, 2, '#0a0614');
    X.plate(ctx, x - 12, y - 7, 24, 10, '#2e3a4a', '#4a5c74', '#12181f', 3);
    X.rect(ctx, x - 12, y - 7, 24, 2, '#6a7e94');
    const eye = Math.sin(t * 5) > 0 ? '#7ef9ff' : '#2a5f6a';
    X.rect(ctx, x - 4, y - 5, 8, 3, eye);
    for (let i = 0; i < 3; i++) X.rect(ctx, x - 9 + i * 7, y + 3, 4, 2, '#1a2028');
    // the mess it is picking up, and the mess it is leaving
    ctx.globalAlpha = 0.4;
    X.rect(ctx, x - 20, y + 2, 8, 2, '#3a4a3a');
    ctx.globalAlpha = 1;
    if (U.chance(0.02)) FX.puff(x + cam, FLOOR + 4, 2, '#6a7e94', 0.5);
  }

  /* Booths along the back, with the ones who came to sit down in them. */
  function drawBooths(ctx, g, t, cam) {
    for (const b of BOOTHS) {
      X.plate(ctx, b.x - 28 - cam, FLOOR - 42, 56, 42, '#3a1c30', '#5a2a48', '#1c0e18', 4);
      X.rect(ctx, b.x - 28 - cam, FLOOR - 42, 56, 3, '#7a3a60');
      X.plate(ctx, b.x - 13 - cam, FLOOR - 18, 26, 4, '#4a3020', '#6b4530', '#241408', 2);
      X.rect(ctx, b.x - 2 - cam, FLOOR - 14, 4, 14, '#4a3020');
      for (let i = 0; i < 2; i++) {
        X.rect(ctx, b.x - 9 + i * 13 - cam, FLOOR - 24, 3, 6, i ? '#ff8ad8' : '#8affa0');
        X.rect(ctx, b.x - 9 + i * 13 - cam, FLOOR - 25, 3, 1, '#d8fbff');
      }
    }
    for (const st of SEATS) {
      const bob = Math.sin(t * 2.2 + st.x) * 1;
      const K = AH.KIN[st.k % AH.KIN.length];
      AH.blit(ctx, AH.S[K.key], (Math.floor(t * 1.7 + st.x) % 7) === 0 ? 5 : 0,
        st.x - cam, FLOOR - 6 + bob, st.x > 400);
    }
  }

  /* DJ GORB. Two records, and a riser, because otherwise you stand in front
     of him and the whole booth disappears behind your own head. */
  function drawDJ(ctx, g, t, cam, punch) {
    const dx = 340 - cam, TOP = FLOOR - 46;
    AH.blit(ctx, AH.S.dj, Math.floor(t * 6) % 2, dx, TOP - Math.abs(Math.sin(t * 4.4)) * 3);
    X.plate(ctx, dx - 34, TOP, 68, 46, '#463a68', '#6b5a9c', '#1d1438', 4);
    X.rect(ctx, dx - 34, TOP, 68, 3, '#8a76c4');
    X.rect(ctx, dx - 30, TOP + 22, 60, 20, '#231a40');
    // two platters, each with a bright label so they read on a dark stage
    for (let i = 0; i < 2; i++) {
      const rx = dx - 17 + i * 34, a = t * (i ? -7 : 9);
      X.blob(ctx, rx, TOP + 10, 11, 5, '#1a1424');
      X.blob(ctx, rx, TOP + 10, 9, 4, '#5a5474');
      X.blob(ctx, rx, TOP + 10, 4, 2, i ? '#ffd34d' : '#ff5fa8');
      X.rect(ctx, rx + Math.cos(a) * 7, TOP + 10 + Math.sin(a) * 3, 2, 2, '#ffffff');
    }
    X.rect(ctx, dx - 14, TOP + 17, 28, 2, '#8e86a8');
    for (let i = 0; i < 9; i++) {
      const h = 2 + Math.round(Math.abs(Math.sin(t * 6 + i)) * 7);
      X.rect(ctx, dx - 14 + i * 3, TOP + 40 - h, 2, h, i % 2 ? '#8affa0' : '#ff5fa8');
    }
    F.draw(ctx, 'DJ GORB', dx, TOP - 32, '#5fe8d8', { center: true, shadow: '#0a0614' });
  }

  /* A stack of speaker. */
  function drawStack(ctx, x, cam, punch) {
    const sx = x - cam, hgt = 62 + Math.round(punch * 2);
    X.plate(ctx, sx - 15, FLOOR - hgt, 30, hgt, '#1a1424', '#2e2640', '#0a0614', 4);
    for (const [cy2, r2] of [[FLOOR - hgt + 14, 9], [FLOOR - 34, 7], [FLOOR - 14, 5]]) {
      X.blob(ctx, sx, cy2, r2 + punch * 2, r2 + punch * 2, '#0d0918');
      X.blob(ctx, sx, cy2, (r2 - 3) + punch * 2, (r2 - 3) + punch * 2, '#3a3348');
      X.blob(ctx, sx, cy2, 2, 2, '#6b6480');
    }
  }

  /* The stage. A pole, a light, and somebody working a Tuesday. It stands
     proud of the floor for the same reason the DJ does. */
  function drawStage(ctx, g, t, cam, punch) {
    const sx = 640 - cam, TOP = FLOOR - 26;
    X.rect(ctx, sx - 1, CLUB_CEIL + 10, 3, TOP - CLUB_CEIL - 10, '#c9c4b4');
    X.rect(ctx, sx - 1, CLUB_CEIL + 10, 1, TOP - CLUB_CEIL - 10, '#ffffff');
    ctx.globalAlpha = 0.13 + punch * 0.05;
    X.poly(ctx, [[sx - 7, CLUB_CEIL + 8], [sx + 7, CLUB_CEIL + 8],
      [sx + 36, TOP], [sx - 36, TOP]], '#ffd34d');
    ctx.globalAlpha = 1;
    X.rect(ctx, sx - 7, CLUB_CEIL + 4, 14, 5, '#2a2140');
    const f = Math.floor(S.pole) % 4;
    const swing = Math.sin(S.pole * 1.6) * 3;
    AH.blit(ctx, AH.S.dancer, f, sx + swing, TOP + (f === 3 ? -8 : 0));
    // the boards, and the money on them
    X.plate(ctx, sx - 44, TOP, 88, 26, '#3a2a1a', '#5e4430', '#1c1208', 3);
    X.rect(ctx, sx - 44, TOP, 88, 2, '#8a6a3a');
    for (let i = 0; i < 9; i++) {
      const on = (Math.floor(t * 5) + i) % 4 !== 0;
      X.rect(ctx, sx - 40 + i * 10, TOP + 18, 4, 3, on ? '#ffd34d' : '#5a4320');
    }
    for (let i = 0; i < 5; i++) X.rect(ctx, sx - 32 + i * 15, TOP - 2, 7, 2, '#8affa0');
    if (S.tip > 0) {
      F.draw(ctx, 'TA', sx + 20, TOP - 58, '#ffd34d', { center: true, shadow: '#0a0614' });
      if (U.chance(0.4)) FX.stars(640 + U.rand(-14, 14), FLOOR - 56, 1, '#ffd34d');
    }
  }

  /* The bar. Taps, optics, a tip jar nobody has troubled, and a man who has
     heard it. */
  function drawBar(ctx, g, t, cam) {
    const bx = 800 - cam;
    X.rect(ctx, bx - 40, FLOOR - 62, 80, 26, '#1a1424');
    for (let i = 0; i < 10; i++) {
      const col = ['#8affa0', '#ff8ad8', '#ffb03d', '#7ec8ff'][i % 4];
      X.rect(ctx, bx - 36 + i * 8, FLOOR - 58, 4, 14, col);
      X.rect(ctx, bx - 36 + i * 8, FLOOR - 60, 2, 3, '#c9bce8');
      // there is an eye in every one of them and it is looking at you
      X.rect(ctx, bx - 36 + i * 8, FLOOR - 50, 3, 3, '#ffffff');
      X.rect(ctx, bx - 35 + i * 8 + (Math.sin(t * 2 + i) > 0 ? 1 : 0), FLOOR - 49, 1, 1, '#140f26');
      ctx.globalAlpha = 0.25;
      X.blob(ctx, bx - 34 + i * 8, FLOOR - 50, 5, 8, col);
      ctx.globalAlpha = 1;
    }
    const bmb = Math.sin(t * 2.2) * 1.5;
    const BK = AH.KIN[7 % AH.KIN.length];
    AH.blit(ctx, AH.S[BK.key], Math.floor(t * 1.3) % 6 === 0 ? 5 : 0, bx + 10, FLOOR - 30 + bmb, true);
    X.plate(ctx, bx - 44, FLOOR - 32, 88, 32, '#4a2e1e', '#6b4530', '#241408', 3);
    X.rect(ctx, bx - 44, FLOOR - 32, 88, 3, '#8a5a3a');
    X.rect(ctx, bx - 44, FLOOR - 22, 88, 1, '#3a2414');
    for (let i = 0; i < 3; i++) {
      X.rect(ctx, bx - 22 + i * 14, FLOOR - 44, 3, 12, '#8e86a8');
      X.blob(ctx, bx - 21 + i * 14, FLOOR - 45, 3, 3, ['#ff5fa8', '#8affa0', '#ffd34d'][i]);
    }
    X.rect(ctx, bx + 24, FLOOR - 42, 10, 10, 'rgba(200,220,255,0.28)');
    X.rect(ctx, bx + 24, FLOOR - 42, 10, 1, '#d8fbff');
    X.blob(ctx, bx + 29, FLOOR - 34, 3, 2, '#ffd34d');
    for (const stx of [bx - 34, bx - 12]) {
      X.rect(ctx, stx - 1, FLOOR - 16, 2, 16, '#5a5474');
      X.blob(ctx, stx, FLOOR - 17, 6, 2, '#8a2f4a');
    }
    F.draw(ctx, 'BAR', bx, FLOOR - 82, '#ffd34d', { center: true, scale: 2, shadow: '#0a0614' });
  }

  /* A small thing somebody has said, with the tail pointing down at them. */
  function sayBubble(ctx, x, y, text, life) {
    const w = F.width(text, 1) + 10;
    /* Home is zoomed: only a ZW-wide window of this frame is ever on screen,
       so clamping to the frame let bubbles slide off the side of the view. */
    const lo = Math.round(VIEW.x) + 3, hi = Math.round(VIEW.x) + ZW - w - 3;
    const bx = Math.round(U.clamp(x - w / 2, Math.min(lo, hi), Math.max(lo, hi)));
    const by = Math.round(y - 13);
    ctx.globalAlpha = U.clamp(life * 2, 0, 1);
    X.plate(ctx, bx - 1, by - 1, w + 2, 15, '#0d0918', null, null, 4);
    X.plate(ctx, bx, by, w, 13, '#e8e2f4', '#ffffff', '#9a92b4', 3);
    X.poly(ctx, [[x - 3, by + 11], [x + 3, by + 11], [x, by + 17]], '#e8e2f4');
    F.draw(ctx, text, bx + w / 2, by + 3, '#1a1024', { center: true });
    ctx.globalAlpha = 1;
  }

  /* One regular. The body is a sprite; the tentacles are live, so they can
     wave about and, when two of them get together, wrap round each other. */
  /* One regular. The body is generated art; the tentacles are drawn live, in
     whatever number and colour that particular alien turned out to have, so
     they wave about and can wrap round each other. */
  /* They have legs now, so the walk is in the sprite rather than drawn under
     it. This is the shadow and nothing else. */
  function kinShadow(ctx, x, y, K) { X.blob(ctx, x, y + 1, Math.round(K.w * 0.42), 3, '#0a0614'); }

  function drawClubber(ctx, c, t, cam) {
    const K = AH.KIN[c.k % AH.KIN.length];
    const x = c.x - cam, y = FLOOR;
    const fast = c.dance > 0 ? 11 : (Math.abs(c.vx) > 1 ? 7 : 3);
    const bob = Math.sin(c.t * fast) * (c.dance > 0 ? 4 : 1.4);
    const lean = c.kiss > 0 ? c.face * 5 : 0;
    const top = y + bob;
    kinShadow(ctx, x, y, K);
    const moving = Math.abs(c.vx) > 1 || c.dance > 0;
    const face = c.kiss > 0 ? 4 : (c.blink < 0 ? 5 : (c.say ? 3 : (moving ? (Math.floor(c.t * fast * 0.6) % 2 ? 1 : 2) : 0)));
    AH.blit(ctx, AH.S[K.key], face, x + lean, top, c.face < 0);
    // whatever they came in with, still in a tentacle
    if (c.drink >= 0 && c.kiss <= 0) {
      const dcol = ['#8affa0', '#ff8ad8', '#ffb03d', '#7ec8ff'][c.drink];
      const hx = x + c.face * (K.w * 0.52 + 3), hy = top - K.h * 0.42 + Math.sin(c.t * fast + 1) * 2;
      X.rect(ctx, hx - 2, hy, 5, 7, 'rgba(220,235,255,0.35)');
      X.rect(ctx, hx - 2, hy + 2, 5, 5, dcol);
      X.rect(ctx, hx - 2, hy, 5, 1, '#d8fbff');
    }
    if (c.dance > 0 && U.chance(0.06)) FX.stars(c.x, y - 30, 1, K.acc);
    // one big throbbing heart over whoever is getting on with it
    if (c.kiss > 0 && c.mate > CLUBBERS.indexOf(c)) {
      const m = CLUBBERS[c.mate];
      const hx = (c.x + m.x) / 2 - cam, hy = y - K.h - 10 - Math.sin(t * 3) * 2;
      const r = 4 + Math.abs(Math.sin(t * 6)) * 1.6;
      X.blob(ctx, hx - r * 0.6, hy, r, r, '#ff5fa8');
      X.blob(ctx, hx + r * 0.6, hy, r, r, '#ff5fa8');
      X.poly(ctx, [[hx - r * 1.5, hy + 1], [hx + r * 1.5, hy + 1], [hx, hy + r * 2.2]], '#ff5fa8');
      X.blob(ctx, hx - r * 0.8, hy - 1, 1, 1, '#ffd6f0');
    }
  }

  function rockEdge(ctx, x0, x1, y, dir, col, colD, amp) {
    for (let x = x0; x < x1; x += 4) {
      const h = 3 + Math.round(U.hash2(x, dir) * amp);
      X.rect(ctx, x, dir > 0 ? y : y - h, 4, h, col);
      X.rect(ctx, x, dir > 0 ? y + h - 1 : y - h, 4, 1, colD);
    }
  }

  function drawInside(ctx, g, t, cam) {
    /* The room is a hole knocked in a moon. Solid rock fills the screen and
       the room is clipped out of the middle of it, which is what makes it read
       as SMALL: you can see the walls end. */
    X.rect(ctx, 0, 0, VW, VH, '#0c0916');
    const wall = AH.S.wall;
    ctx.globalAlpha = 0.32;
    for (let y = -wall.h; y < VH + wall.h; y += wall.h) {
      for (let x = -20; x < VW + wall.w; x += wall.w) AH.blit(ctx, wall, 0, x, y);
    }
    ctx.globalAlpha = 1;
    for (let x = 0; x < VW; x += 3) {
      if (U.hash2(x, 3) > 0.7) X.rect(ctx, x, 0, 3, VH, 'rgba(4,2,10,0.35)');
    }

    /* The room is only 92 pixels tall and 232 across. Clipping to exactly that
       is what sells it: rock above, rock either side, and a little lit box in
       the middle of a dead moon. */
    const rx0 = -cam, rw = IN_W, ry0 = CEIL - 26;
    ctx.save();
    ctx.beginPath(); ctx.rect(rx0, ry0, rw, VH - ry0); ctx.clip();

    X.rect(ctx, rx0, ry0, rw, VH - ry0, '#15111f');
    for (let y = CEIL; y < FLOOR + 4; y += wall.h) {
      for (let x = -cam - 40; x < VW + wall.w; x += wall.w) AH.blit(ctx, wall, 0, x, y);
    }
    // a crack he has been meaning to look at
    let kx = 40 - cam, ky = CEIL + 6;
    for (let i = 0; i < 20; i++) {
      const w = 3 - (i % 3);
      X.rect(ctx, kx, ky, w, 4, '#241f36');
      X.rect(ctx, kx + w, ky, 1, 4, '#5f5680');
      kx += Math.round(U.hash2(i, 5) * 5) - 2; ky += 4;
    }
    // the warm pool the monitor throws over that end of the room
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.055;
      X.dither(ctx, IN_SPOTS[0].x - cam - 54 + i * 7, CEIL + 4 + i * 5, 108 - i * 14, FLOOR - CEIL - i * 10, '#ffd39a', i % 2);
    }
    ctx.globalAlpha = 1;

    // the roof: the same rock in shadow, a heavy lintel course, and all the
    // things he has hung off it and forgotten about
    X.rect(ctx, 0, 0, VW, CEIL + 4, '#1b1628');
    ctx.globalAlpha = 0.55;
    for (let y = CEIL + 4 - wall.h; y > -wall.h; y -= wall.h) {
      for (let x = -cam - 40; x < VW + wall.w; x += wall.w) AH.blit(ctx, wall, 0, x, y);
    }
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.4; X.rect(ctx, 0, 0, VW, CEIL, '#0e0b16'); ctx.globalAlpha = 1;
    // a beam bolted across, with junk hanging off it
    X.rect(ctx, 0, CEIL - 16, VW, 7, '#5e6688');
    X.rect(ctx, 0, CEIL - 16, VW, 1, '#9aa3c4');
    X.rect(ctx, 0, CEIL - 10, VW, 1, '#39405e');
    for (let i = 0; i < 10; i++) {
      const x = 14 + i * 30 - cam; if (x < -20 || x > VW + 20) continue;
      X.rect(ctx, x, CEIL - 19, 6, 10, '#39405e');
      X.rect(ctx, x, CEIL - 19, 6, 1, '#9aa3c4');
    }
    const hang = [
      { x: 22, k: 0, L: 26 }, { x: 74, k: 1, L: 34 }, { x: 116, k: 2, L: 28 },
      { x: 160, k: 0, L: 38 }, { x: 214, k: 1, L: 24 }
    ];
    for (const h of hang) {
      const x = h.x - cam; if (x < -26 || x > VW + 26) continue;
      // they swing on their own, and much harder when you jump into them
      const kick = S.swing * (1 - Math.min(1, Math.abs(h.x - P.x) / 50)) * 7;
      const sw = Math.sin(t * 1.1 + h.x) * 2 + Math.sin(t * 11 + h.x) * kick;
      const yb = CEIL - 9 + h.L;
      for (let j = 0; j < h.L; j += 3) X.rect(ctx, x + sw * (j / h.L), CEIL - 9 + j, 2, 3, j % 6 ? '#241f36' : '#3a3450');
      if (h.k === 0) {                               // a coil of cable
        for (let j = 0; j < 4; j++) X.rect(ctx, x - 8 + sw, yb + j * 4, 17, 3, j % 2 ? '#3a3450' : '#4a4260');
      } else if (h.k === 1) {                        // a bundle of dried something
        for (let j = 0; j < 6; j++) X.rect(ctx, x - 6 + j * 2 + sw, yb, 2, 16 - Math.abs(j - 3) * 3, '#5a7a3a');
        X.rect(ctx, x - 7 + sw, yb - 1, 15, 3, '#8a5a3a');
      } else {                                       // a lamp that does not work
        X.rect(ctx, x - 6 + sw, yb, 13, 5, '#8e86a8');
        X.rect(ctx, x - 5 + sw, yb + 5, 11, 9, '#4a4260');
        X.rect(ctx, x - 3 + sw, yb + 7, 7, 3, '#2a2440');
      }
    }
    for (let x = 0; x < VW; x += 3) {
      const h = 4 + Math.round(U.hash2(x + cam, 11) * 9);
      X.rect(ctx, x, CEIL - 2, 3, h + 2, '#15111f');
      X.rect(ctx, x, CEIL + h - 1, 3, 1, '#332e4a');
    }
    for (let i = 0; i < 14; i++) {
      const wx = 4 + i * 17 + U.hash2(i, 41) * 9, x = wx - cam;
      if (x < -14 || x > VW + 14) continue;
      if (U.hash2(i, 55) > 0.72) continue;              // gaps, so it is not a comb
      const h = 6 + U.hash2(i, 5) * 30, w0 = 4 + U.hash2(i, 17) * 6;
      for (let j = 0; j < h; j++) {
        const w = Math.max(1, Math.round(w0 * (1 - j / h)));
        X.rect(ctx, x - w / 2, CEIL + 8 + j, w, 1, j > h - 4 ? '#0e0b16' : (j < 3 ? '#332e4a' : '#1e1930'));
      }
    }
    // one bare bulb, flickering because he wired it
    const bx = 88 - cam, flick = U.hash2((t * 8) | 0, 3) > 0.06;
    X.rect(ctx, bx, CEIL - 9, 1, 30, '#191320');
    X.rect(ctx, bx - 4, CEIL + 20, 9, 4, '#8e86a8');
    X.rect(ctx, bx - 3, CEIL + 24, 7, 8, flick ? '#ffe9a8' : '#6b6450');
    if (flick) {
      X.rect(ctx, bx - 2, CEIL + 25, 3, 3, '#ffffff');
      for (let i = 3; i >= 0; i--) {
        ctx.globalAlpha = 0.05;
        const w = 26 + i * 22;
        X.dither(ctx, bx - w / 2, CEIL + 30, w, FLOOR - CEIL - 30 - i * 3, '#ffe9a8', i % 2);
      }
      ctx.globalAlpha = 1;
    }

    // floor, then a plinth of cut stone under it
    const fl = AH.S.floor;
    for (let x = -cam - 40; x < VW + fl.w; x += fl.w) AH.blit(ctx, fl, 0, x, FLOOR);
    X.rect(ctx, 0, FLOOR + 13, VW, VH - FLOOR, '#241f36');
    for (let x = -(cam % 24) - 24; x < VW + 24; x += 24) {
      X.rect(ctx, x, FLOOR + 14, 22, 14, '#2a2440');
      X.rect(ctx, x, FLOOR + 14, 22, 1, '#3a3450');
      X.rect(ctx, x + 12, FLOOR + 30, 22, 14, '#262034');
      X.rect(ctx, x + 12, FLOOR + 30, 22, 1, '#332e4a');
    }
    // a rug, worn through
    const rx = 96 - cam;
    X.rect(ctx, rx - 42, FLOOR + 1, 84, 8, '#7a3f4a');
    X.rect(ctx, rx - 42, FLOOR + 1, 84, 2, '#9c5460');
    for (let i = 0; i < 8; i++) X.rect(ctx, rx - 38 + i * 10, FLOOR + 4, 6, 3, i % 2 ? '#5e2f38' : '#8a4854');

    // posters, taped crooked
    for (const p of POSTERS) {
      const x = p.x - cam; if (x < -30 || x > VW + 30) continue;
      AH.blit(ctx, AH.S['poster' + p.k], 0, x, p.y);
      X.rect(ctx, x - 8, p.y - 2, 16, 4, '#e8e05a');
    }
    // a tally of every world he has taken apart, scratched into the rock
    const tx = 96 - cam, kills = g.save.destroyed.filter(Boolean).length;
    {
      F.draw(ctx, 'WORLDS I ATE', tx, 138, '#8e86a8', { shadow: false });
      for (let i = 0; i < kills; i++) {
        const gx = tx + (i % 10) * 7, gy = 150 + ((i / 10) | 0) * 11;
        X.rect(ctx, gx, gy, 2, 8, '#c9bce8');
        if (i % 5 === 4) X.rect(ctx, gx - 26, gy + 3, 30, 2, '#c9bce8');
      }
      if (!kills) F.draw(ctx, 'NONE YET', tx, 150, '#5f5680', { shadow: false });
    }
    // hooks with tools on them, and a shelf of rocks he is proud of
    const hx = 22 - cam;
    {
      X.rect(ctx, hx - 12, 146, 54, 2, '#4a4260');
      for (let i = 0; i < 3; i++) {
        X.rect(ctx, hx - 6 + i * 19, 148, 2, 5, '#8e86a8');
        X.rect(ctx, hx - 10 + i * 19, 153, 10, 13, ['#8e86a8', '#c46a3a', '#5ad0e8'][i]);
        X.rect(ctx, hx - 10 + i * 19, 153, 10, 2, '#c9bce8');
      }
    }
    const shx = 174 - cam;
    {
      X.rect(ctx, shx - 26, 176, 52, 3, '#7a5a3a');
      X.rect(ctx, shx - 26, 176, 52, 1, '#9c7a52');
      X.rect(ctx, shx - 24, 179, 3, 4, '#5a4028'); X.rect(ctx, shx + 21, 179, 3, 4, '#5a4028');
      const shiny = [D.M.gold, D.M.emerald, D.M.iron];
      for (let i = 0; i < 3; i++) PD.art.oreChip(ctx, shiny[i], shx - 22 + i * 16, 165, 11);
    }

    // the door out, a rough arch with rubber strips
    const dx = IN_SPOTS[2].x - cam;
    X.rect(ctx, dx - 20, CEIL + 12, 40, FLOOR - CEIL - 12, '#120e1c');
    for (let i = 0; i < 7; i++) {
      const cx2 = dx - 18 + i * 5, sw = Math.sin(t * 1.2 + i * 0.6) * 1.5;
      const len = 40 + (i % 3) * 8;
      for (let j = 0; j < len; j += 2) X.rect(ctx, cx2 + sw * (j / len), CEIL + 16 + j, 4, 2, j % 4 ? '#3f3856' : '#4a4260');
      X.rect(ctx, cx2, CEIL + 16, 4, 2, '#8e86a8');
    }
    rockEdge(ctx, (dx - 24) | 0, (dx + 24) | 0, CEIL + 12, 1, '#4a4260', '#241f36', 8);
    X.rect(ctx, dx - 13, CEIL - 2, 26, 12, '#7a5a3a');
    X.rect(ctx, dx - 13, CEIL - 2, 26, 2, '#9c7a52');
    F.draw(ctx, 'OWT', dx, CEIL + 1, '#ffe9a8', { center: true });

    // the mess
    for (const p of IN_PROPS) {
      const x = p.x - cam; if (x < -50 || x > VW + 50) continue;
      const s = AH.S[p.s];
      if (!s) continue;
      if (p.s === 'tape') {
        X.rect(ctx, x - 16, FLOOR - 14, 32, 14, '#5a4a3a');
        X.rect(ctx, x - 16, FLOOR - 14, 32, 2, '#7a6a52');
        AH.blit(ctx, s, Math.floor(t * 4) % 2, x, FLOOR - 14);
        // a scrolling marquee: the window is 16 characters, the song is not,
        // so the title crawls through it instead of being chopped in half
        const song = D.MIX[Math.floor(t * 0.09) % D.MIX.length] + '   *   ';
        const off = Math.floor(t * 5) % song.length;
        const note = (song + song).substr(off, 16);
        F.draw(ctx, note, x, FLOOR - 44 + Math.sin(t * 2) * 2, '#ff8ad8', { center: true });
        continue;
      }
      AH.blit(ctx, s, 0, x, FLOOR + 1 - (p.lift || 0));
    }
    // the desk, its screen lit, and a crate for a chair
    const px2 = IN_SPOTS[0].x - cam;
    AH.blit(ctx, AH.S.desk, 1, px2, FLOOR + 1);
    X.rect(ctx, px2 + 34, FLOOR - 18, 20, 18, '#6b4530');
    X.rect(ctx, px2 + 34, FLOOR - 18, 20, 2, '#8a5a3a');
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.07;
      X.dither(ctx, px2 - 30 + i * 6, FLOOR - 8 + i * 2, 60 - i * 12, 8, '#8affa0', i % 2);
    }
    ctx.globalAlpha = 1;

    // THE BRAIN IN THE JAR. The only clean thing in the house, and the only
    // thing in it that knows anything. It stands in front of the mess.
    const jx = IN_SPOTS[1].x - cam;
    const jf = Math.floor(t * 2.4) % 3;
    for (let i = 3; i >= 0; i--) {
      ctx.globalAlpha = 0.05 + i * 0.01;
      const w = 40 + i * 24;
      X.dither(ctx, jx - w / 2, CEIL + 6, w, FLOOR - CEIL - 6, '#4cff9a', i % 2);
    }
    ctx.globalAlpha = 1;
    X.blob(ctx, jx, FLOOR + 2, 30, 4, '#1a2a20');
    AH.blit(ctx, AH.S.brainjar, jf, jx, FLOOR + 2);
    if (U.chance(0.04)) FX.spawn({ x: jx + cam + U.rand(-14, 14), y: FLOOR - 88, vx: U.rand(-6, 6), vy: U.rand(-16, -5), life: 1.1, size: 2, color: '#8affd0', grav: -0.06, drag: 0.96, glow: 1 });

    // the cheese, until he takes it
    if (!g.save.pet) {
      const cx3 = RAT_SPOT.x + 16 - cam;
      AH.blit(ctx, AH.S.cheese, 0, cx3, FLOOR + 1);
    }
    // drips off the roof
    for (const d of DRIPS) {
      const x = d.x - cam; if (x < -4 || x > VW + 4) continue;
      const f = d.t / 3.4;
      if (f < 0.7) X.rect(ctx, x, CEIL + 20 + f / 0.7 * (FLOOR - CEIL - 26), 1, 3, '#8affa0');
      else if (f < 0.78) X.rect(ctx, x - 3, FLOOR - 3, 7, 1, '#8affa0');
    }
    ctx.restore();

    // the rock the room was knocked out of, closing in on all four sides
    const rx1 = rx0 + rw;
    rockEdge(ctx, (rx0 - 8) | 0, (rx1 + 8) | 0, ry0, 1, '#3a3450', '#241f36', 9);
    for (let y = ry0; y < VH; y += 4) {
      const w = 3 + Math.round(U.hash2(y, 13) * 5);
      X.rect(ctx, rx0 - 1, y, w, 4, '#241f36');
      X.rect(ctx, rx0 + w - 2, y, 1, 4, '#4a4260');
      const w2 = 3 + Math.round(U.hash2(y, 27) * 5);
      X.rect(ctx, rx1 - w2 + 1, y, w2, 4, '#241f36');
      X.rect(ctx, rx1 - w2 + 1, y, 1, 4, '#4a4260');
    }
    ctx.globalAlpha = 0.5;
    X.rect(ctx, rx0 - 6, ry0, 6, VH - ry0, '#0c0916');
    X.rect(ctx, rx1, ry0, 6, VH - ry0, '#0c0916');
    ctx.globalAlpha = 1;
  }

  /* He is enormous, he bounces, and he squashes when he lands. */
  function drawRat(ctx, g, cam, t) {
    if (!g.save.pet && S.scene !== 'in') return;
    const x = Math.round(rat.x - cam);
    if (x < -40 || x > VW + 40) return;
    const spr = g.save.pet ? AH.S.ratFed : AH.S.rat;
    const bounce = g.save.pet ? Math.abs(Math.sin(rat.hop)) * 9 : 0;
    const sq = 1 + Math.cos(rat.hop * 2) * 0.14 * (bounce > 0.5 ? 1 : 0);
    const f = rat.chew > 0 ? 1 : (Math.sin(t * 3) > 0 ? 0 : 1);
    ctx.save();
    ctx.translate(x, Math.round(rat.y + 2 - bounce));
    ctx.scale((rat.face < 0 ? -1 : 1) / sq, sq);
    ctx.drawImage(spr.frames[f], -spr.ox, -spr.oy, spr.w, spr.h);
    ctx.restore();
    if (g.save.pet && U.chance(0.02)) FX.text(rat.x, rat.y - 34, U.pick(['SQUEAK', 'BRENDA', 'MORE CHEESE']), '#ff9ecb', 0);
  }

  /* A wooden sign that pops up when you are close enough to press E. */
  function prompt(ctx, g, t, cam) {
    const s = P.near;
    if (!s) return;
    // How high the sign floats, in SCREEN pixels -- the thing it names is
    // twice its old size now, so the clearance is measured after the zoom
    // rather than scaled up with it.
    const LIFTS = { ufo: 78, door: 114, brain: 93, pc: 78, exit: 69, rat: 44,
      trash: 66, club: 118, clubout: 84, coat: 104, dance: 102, bar: 112, dj: 104, stage: 112,
      slot0: 132, slot1: 132, slot2: 132, universal: 150 };
    const lift = LIFTS[s.id] || 100;
    const sp = toScreen(s.x - cam, groundY(s.x));
    const x = U.clamp(Math.round(sp.x), 60, VW - 60);
    const y = U.clamp(Math.round(sp.y - lift + Math.sin(t * 5) * 2), 24, VH - 70);
    const w = Math.max(F.width(s.name, 1), F.width(s.sub, 1)) + 18;
    X.rect(ctx, x - w / 2 + 2, y + 2, w, 26, 'rgba(6,3,14,0.5)');
    X.rect(ctx, x - w / 2, y, w, 26, '#7a5a3a');
    X.rect(ctx, x - w / 2, y, w, 2, '#9c7a52');
    X.rect(ctx, x - w / 2, y + 24, w, 2, '#4a3020');
    F.draw(ctx, s.name, x, y + 4, '#ffe9a8', { center: true });
    F.draw(ctx, s.sub, x, y + 14, '#c9a06a', { center: true });
    const kb = Math.round(Math.abs(Math.sin(t * 5)) * 2);
    X.rect(ctx, x - 6, y - 13 - kb, 12, 12, '#e8dfc4');
    X.rect(ctx, x - 6, y - 13 - kb, 12, 1, '#ffffff');
    X.rect(ctx, x - 6, y - 2 - kb, 12, 1, '#a89b78');
    F.draw(ctx, 'E', x, y - 10 - kb, '#241f16', { center: true, shadow: false });
  }

  /* ---------------------------------------------------------------- the view
     Home is ZOOMED: the scene is painted at its usual size and then a window
     of it, ZW by ZH, is blown up to fill the screen.

     The window used to be 240x135 at exactly 2x, which was too close -- you
     could not see the house and the saucer at the same time. It is 320x180
     now, which is a 1.5x blow-up of the logical frame; that would normally
     smear pixels, except the frame itself is already drawn at HD=2, so a home
     pixel lands on exactly THREE device pixels. Crisp, and a third more of
     the moon in shot. */
  const ZW = 320, ZH = 180, ZK = VW / ZW;
  const VIEW = { x: 120, y: 100 };

  function view(dt) {
    const cam = g0 ? g0.intCam : 0;
    const px = P.x - cam, gy = groundY(P.x);
    let tx, ty;
    if (S.scene === 'in') {
      // the room is narrower than the window: park it, centred, and hold still
      tx = (IN_W - VW) / -2 + (IN_W - ZW) / 2;
      ty = CEIL - 24;
    } else {
      tx = U.clamp(px - ZW / 2, 0, VW - ZW);
      // the ground sits low in the window so there is sky above him, and the
      // window rises with him when he leaves the floor
      const head = P.air > 0.1 ? P.y - 34 : P.y;
      ty = U.clamp(Math.min(gy, head) - 112, 0, VH - ZH);
    }
    if (dt === undefined) return VIEW;
    VIEW.x = U.damp(VIEW.x, tx, 0.22, dt);
    VIEW.y = U.damp(VIEW.y, ty, 0.18, dt);
    return VIEW;
  }
  /* Screen pixels back into scene pixels, for taps and for the prompt sign. */
  function toScreen(x, y) { return { x: (x - Math.round(VIEW.x)) * ZK, y: (y - Math.round(VIEW.y)) * ZK }; }
  function fromScreenX(sx) { return Math.round(VIEW.x) + sx / ZK; }

  /* Everything in the world. Painted into the zoom buffer, never straight to
     the screen. */
  function drawScene(ctx, g, t) {
    const cam = Math.round(g.intCam);
    if (S.scene === 'out') drawOutside(ctx, g, t, cam);
    else if (S.scene === 'club') drawClub(ctx, g, t, cam);
    else if (S.scene === 'hub') drawHub(ctx, g, t, cam);
    else drawInside(ctx, g, t, cam);

    for (const m of MOTES) {
      const x = ((m.x * roomW() + t * m.sp) % roomW()) - cam; if (x < -4 || x > VW + 4) continue;
      ctx.fillStyle = '#c9bce8'; ctx.globalAlpha = 0.12 + 0.22 * Math.sin(t * 2 + m.x * 40);
      ctx.fillRect(x | 0, (m.y + Math.sin(t * 0.7 + m.x * 8) * 4) | 0, m.r > 0.7 ? 2 : 1, m.r > 0.7 ? 2 : 1);
    }
    ctx.globalAlpha = 1;

    if (S.scene !== 'club') drawRat(ctx, g, cam, t);
    drawPlayer(ctx, g, cam, t);

  }

  /* Signs, speech and the sleep fade, drawn on the screen at screen size so
     the zoom does not turn the lettering into billboards. */
  function drawOverlay(ctx, g, t) {
    if (UI.mode === 'build') { drawBuildPanel(ctx, g, t); return; }
    if (UI.mode === 'hub') { drawHubPanel(ctx, g, t); return; }
    if (S.sleep <= 0) prompt(ctx, g, t, Math.round(g.intCam));

    if (S.sleep > 0) {
      ctx.globalAlpha = Math.min(0.86, (2.2 - Math.abs(S.sleep - 1.1) * 2) * 0.9);
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
      X.rect(ctx, VW / 2 - w / 2, VH - 42, w, 15, '#7a5a3a');
      X.rect(ctx, VW / 2 - w / 2, VH - 42, w, 2, '#9c7a52');
      F.draw(ctx, UI.msg, VW / 2, VH - 38, '#ffe9a8', { center: true });
      ctx.globalAlpha = 1;
    }
    // what you still owe the shark, where the top bar used to be
    PD.chum.drawDebt(ctx, g, 8, VH - 30);
    /* And the small one, standing on it -- but ONLY while he has somewhere to
       point. He used to live in that corner permanently, watching you walk
       about your own moon, which is a lot of shark for a man who has already
       been paid. Once there is nothing left to lead you to he goes away and
       the corner is yours. */
    const goals = g.save.seenIntro ? leadGoals(g) : null;
    if (goals && goals.length && !PD.chum.active() && !UI.mode && S.sleep <= 0) {
      PD.chum.leadStep(g.dt, g, { px: P.x, goals: goals, key: S.scene + ':' + (g.save.trash || 0) });
      PD.chum.drawMini(ctx, 28, VH - 34, t, 4, VW - 4);
    }
  }

  /* Kept for anything that still wants the whole thing in one call. */
  function draw(ctx, g, t) { drawScene(ctx, g, t); drawOverlay(ctx, g, t); }

  function drawPlayer(ctx, g, cam, t) {
    const skin = PD.art.skinFor(g.save.cos);
    const gy = groundY(P.x);
    const air = P.y < gy - 1;
    const walking = Math.abs(P.vx) > 8;
    const x = (P.x - cam) | 0;
    /* The rig's soles sit thirteen logical pixels below the anchor it is
       handed, and P.y is the ground. Anchoring at P.y + 2 therefore buried him
       fifteen pixels into the regolith -- which the old compact shoes mostly
       hid and the tentacles did not. */
    const y = (P.y - 13) | 0;
    if (P.roll > 0) {
      ctx.save();
      ctx.translate(x, (P.y + 2 | 0) - 14);
      ctx.rotate(P.rollA);
      const s = skin.alienRoll;
      ctx.drawImage(s.frames[0], -s.ox, -s.oy + 14, s.w, s.h);
      ctx.restore();
      if (U.chance(0.5)) FX.dust(P.x - P.face * 6, P.y, 1, '#8e86a8', 8);
      return;
    }
    // the live rig: his legs plant and swing off his own speed, so walking
    // across the moon is a real cycle rather than four pictures
    if (!P.rig) P.rig = PD.rig.make();
    const r = P.rig;
    PD.rig.step(r, { dt: g.dt, vx: P.vx, vy: P.vy, ground: !air, drilling: false });
    // he says something short and stupid whenever he starts doing a thing
    if (r.fresh) {
      const SAYS = { wave: 'HI', shrug: '?', flex: 'HUP', point: '!', scratch: 'HMM', sniff: 'SNF', stretch: 'AAA' };
      FX.text(P.x, P.y - 48, SAYS[r.fresh] || '?', '#ffe9a8', 0);
      A.sfx.tone(r.fresh === 'shrug' ? 300 : 620, { type: 'square', to: r.fresh === 'shrug' ? 220 : 820, dur: 0.09, vol: 0.035 });
      r.fresh = null;
    }
    const frame = PD.rig.faceOf(r, t, Math.sin(t * 1.3) > 0.94);
    // BOUNCY: a deep squash on landing, a stretch on the way up, and a little
    // extra wobble the whole time so nothing in this game is ever rigid.
    const wob = walking ? Math.sin(P.walk * 2.2) * 0.05 : Math.sin(t * 3.4) * 0.022;
    const sq = P.land > 0 ? 1 + P.land * 1.5 : (air ? (P.vy < -60 ? 0.84 : (P.vy > 90 ? 1.1 : 1)) : 1 + wob);
    PD.rig.draw(ctx, r, {
      x, y, flip: P.face < 0, spr: skin.alienCore, frame,
      drilling: false, twoHand: false, grip: null, aim: P.face < 0 ? Math.PI : 0,
      ground: !air, vx: P.vx, vy: P.vy, squash: sq
    }, skin.P, PD.art.BIZ);
    if (walking && !air && U.chance(0.2)) FX.dust(P.x - P.face * 5, P.y, 1, '#8e86a8', 10);
    // shifting a heap: a cloud of it, and him disappearing into the cloud
    if (P.sweep > 0) {
      const k = P.sweep / 0.5;
      ctx.globalAlpha = k * 0.8;
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * U.TAU + t * 4;
        X.blob(ctx, x + Math.cos(a) * (10 + (1 - k) * 18), P.y - 14 + Math.sin(a) * (7 + (1 - k) * 10),
          5 + (1 - k) * 5, 4 + (1 - k) * 4, '#8e86a8');
      }
      ctx.globalAlpha = 1;
    }
  }


  PD.home = { enter, update, draw, drawScene, playSlot, SLOT,
    drunk: () => (S.scene === 'club' ? S.drunk : 0), drawOverlay, view, toScreen, fromScreenX, closeScene, touchMode, leaveDesk, say, P, UI, S, groundY, ZW, ZH, ZK, ROOM_W: OUT_W, SPOTS,
    TRASH, CLUB_X, CLUB_SPOTS, CLUBBERS, moonClean, trashLeft, sweep, goClub, leaveClub, spots,
    goHub, leaveHub, HUB, HUB_W, DECK_Y, STALLS };
})(window.PD);
