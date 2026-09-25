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
  /* NO PARTICLES IN THE HOUSE.
     The casino is a room with a floor and a ceiling and a lot of gold on it.
     Loose glowing dots floating about in it never read as anything -- not as
     smoke, not as confetti, not as sparkle -- they just read as a bug, and
     that is exactly what they were reported as. So every particle emitter in
     this file goes through a gate: outside the club they work as they always
     did; inside it they do nothing at all, and the room is dressed with drawn
     light instead. Floating text, screen shake, the flash and the wipe all go
     straight through, because none of them is a loose dot. */
  const RAW = PD.fx;
  const FX = Object.create(RAW);
  for (const k of ['spawn', 'sparks', 'dust', 'burst', 'smoke', 'trail', 'ring', 'chunk',
    'shards', 'crumble', 'pop', 'puff', 'stars']) {
    FX[k] = (function (fn) {
      return function () { if (S.scene !== 'club') return fn.apply(RAW, arguments); };
    })(RAW[k]);
  }
  ['reset', 'clearParts', 'text', 'beginWipe', 'wipeActive', 'wipeBusy', 'updateWipe', 'drawWipe',
    'shake', 'flash', 'hitStop', 'update', 'tickFreeze', 'shakeOffset',
    'drawWorld', 'drawFloaters', 'drawOverlay'].forEach(k => { FX[k] = RAW[k].bind(RAW); });
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
  const HEAD_X = 96;                 // where the dead Celestial is buried
  const OUT_W = 780, IN_W = 232;
  const WALK = 172;                  // how far round the curve he can get
  const FLOOR = 216;                 // the room floor, inside
  const CEIL = 124;                  // the underside of the rock roof, inside
  const GRAV = 300;                  // low: everything here is bouncy

  const S = { scene: 'out', deck: 0, t: 0, ratSeen: 0, sleep: 0, swing: 0, beat: 0, kissT: 2,
    chatT: 1.5, drunk: 0, song: null, songI: -1, clap: 0, cdeck: 0 };
  let g0 = null;                     // the running game, for view() between frames

  const CUT = () => PD.cut && PD.cut.owns(S.scene);
  function roomW() {
    if (CUT()) return PD.cut.roomW();
    if (S.scene === 'out') return OUT_W;
    if (S.scene === 'club') return clubW();
    if (S.scene === 'hub') return HUB_W;
    return IN_W;
  }
  /* A room narrower than the screen sits in the middle of it. */
  function camWant() {
    const w = roomW();
    if (w <= VW) return (w - VW) / 2;
    const fx = CUT() ? PD.cut.focusX() : (S.scene === 'hub' && PD.cut.touring() ? PD.cut.tourShot().x : P.x);
    return U.clamp(fx - VW / 2, 0, w - VW);
  }
  function bounds() {
    if (CUT()) return PD.cut.bounds();
    if (S.scene === 'out') return [MOON.cx - WALK, MOON.cx + 400];
    if (S.scene === 'club') return [16, clubW() - 16];
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
    if (CUT()) return PD.cut.floor();
    if (S.scene === 'hub') return DECK_Y[S.deck];
    /* The salon is up three steps, which is not decoration: on the flat you
       stood in front of every table back there and your own head covered the
       game you were playing. Up a step the tables ride higher than you do. */
    if (S.scene === 'club') return (S.cdeck === 0 && x > STEP_X) ? SALON_Y : FLOOR;
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
  /* The room got another eight hundred pixels of itself. Past THE GALAXY ROOM
     there is a velvet rope, and behind the rope is the part of the house that
     is not for you until you have killed a couple of worlds. */
  const CLUB_W = 2260, CLUB_CEIL = 84;
  /* Where everything stands. A spot sits a little to the LEFT of the thing it
     names, or you walk into the middle of the prop and your own head hides it. */
  const CAGE_X = 215, POKER_X = 380, ROU_X = 620, JACK_X = 840, BAR_X = 980;
  const ROPE_X = 1490, CRAPS_X = 1660, STAGE_X = 1880, BACC_X = 2090;
  /* Three steps up at the rope, and everything behind it is drawn off
     SALON_Y instead of FLOOR. */
  const STEP_X = ROPE_X + 4, SALON_Y = FLOOR - 16;
  const HI_STAKE = 1000, BACC_STAKE = 5000;
  /* The rope comes down when you have finished off two worlds. Until then the
     pit boss stands in front of it and looks at your shoes. */
  function salonOpen(g) {
    return (g.save.destroyed || []).filter(Boolean).length >= 2 || g.save.dominion >= 4
      || (g.save.wagered || 0) >= 10000;
  }
  const TSTAKE = 500;
  /* A spot's `x` is where its SIGN goes, and it sits to the left of the thing
     it names or your own head hides the prop. The reach is a separate pair,
     `lo` and `hi`, because a table is a hundred pixels of furniture you can
     stand anywhere along -- and at the wheel, which half you are standing on
     is the bet. */
  const CLUB_SPOTS = [
    { id: 'clubout', x: 26, r: 24, name: 'THE WAY OUT', sub: 'BACK UP TO THE MOON' },
    { id: 'cage', x: CAGE_X - 54, lo: 168, hi: 262, name: 'THE CASHIER', sub: 'SHE HAS SEEN WORSE THAN YOU' },
    { id: 'poker', x: POKER_X - 68, lo: 322, hi: 440, name: 'THE POKER TABLE', sub: 'ONE CARD EACH. $500' },
    { id: 'roulette', x: ROU_X - 66, lo: 554, hi: 686, name: 'THE WHEEL', sub: 'RED. $500 ON IT.' },
    { id: 'jack', x: JACK_X - 68, lo: 782, hi: 900, name: 'BLACKJACK', sub: 'ONE CARD EACH. $500' },
    { id: 'bar', x: BAR_X - 62, lo: 928, hi: 1032, name: 'THE BAR', sub: 'BUY SOMETHING SILLY' },
    { id: 'slot0', x: 1104, r: 24, name: 'LUX', sub: 'ONE MORE GO. $200' },
    { id: 'slot1', x: 1164, r: 24, name: 'NOVA', sub: 'THIS ONE IS DUE. $200' },
    { id: 'slot2', x: 1224, r: 24, name: 'HOT', sub: 'LAST ONE. $200' }
  ];
  /* Behind the rope. These only come back from `spots` once the rope is down. */
  const SALON_SPOTS = [
    { id: 'craps', x: CRAPS_X - 70, lo: CRAPS_X - 62, hi: CRAPS_X + 62,
      name: 'THE DICE', sub: 'SEVEN OR ELEVEN. $1000' },
    { id: 'stage', x: STAGE_X - 62, lo: STAGE_X - 58, hi: STAGE_X + 58,
      name: 'THE LOUNGE', sub: 'ASK HER FOR SOMETHING' },
    { id: 'bacc', x: BACC_X - 68, lo: BACC_X - 60, hi: BACC_X + 60,
      name: 'BACCARAT', sub: 'NEAREST NINE. $5000' }
  ];
  /* Two booths in the dead bits of wall, for the ones who have stopped. */
  const BOOTHS = [{ x: 530 }, { x: 730 }];
  const SEATS = [
    { x: 516, k: 10 }, { x: 544, k: 21 }, { x: 716, k: 14 }, { x: 744, k: 24 }
  ];
  /* Sixteen regulars, each with a stretch of carpet they wander up and down.
     Giving them bands is what stops all sixteen ending up in one corner and
     leaving three quarters of the room empty. */
  /* The aisles. Sixteen of them milling about in front of the tables turned
     the whole room into a wall of alien, so they keep to the gaps between the
     furniture now and they are drawn BEHIND it. */
  const BANDS = [[262, 318], [350, 412], [444, 552], [596, 656],
    [694, 778], [800, 884], [906, 1036]];
  /* Who is in tonight. Everybody in the building is somebody now -- the cast
     is authored, not generated -- so they are dealt round the room with a
     stride that keeps two of the same kind from standing next to each other. */
  function kinAt(i) { return (i * 5 + 2) % AH.KIN.length; }
  const CLUBBERS = [];
  for (let i = 0; i < 14; i++) {
    const b = BANDS[i % BANDS.length];
    CLUBBERS.push({ x: U.rand(b[0], b[1]), lo: b[0], hi: b[1], vx: 0, k: kinAt(i), t: U.rand(0, 6),
      face: i % 2 ? 1 : -1, dance: U.rand(0, 3), kiss: 0, mate: -1, wait: U.rand(0, 2),
      blink: U.rand(0, 4), say: null, emote: null, sayT: 0, sayMax: 1, drink: i % 3 === 0 ? i % 4 : -1 });
  }

  /* -------------------------------------------------------------- the patter
     Nobody in here has anything useful to say and all of them say it. Lines
     surface over whoever happens to be standing still. */
  /* ====================================================== WHAT THEY ALL SAY
     One alien saying one line at nothing in particular is a sign, not a
     conversation. These are two-handers: somebody says the first thing, and a
     second or so later whoever is standing nearest says the second thing back
     at them, and both of them turn to look at each other while they do it.
     Half of them are only funny because of the reply. */
  const CHAT_DUO = [
    ['I AM UP. I AM DEFINITELY UP.', 'YOU ARE HOLDING ONE CHIP.'],
    ['THE WHEEL IS COLD TONIGHT', 'THE WHEEL IS A WHEEL, GERALD.'],
    ['MY PLANET GOT DRILLED LAST WEEK', 'MINE TOO! SMALL GALAXY.'],
    ['HE IS A SHARK. LITERALLY.', 'I THOUGHT THAT WAS A METAPHOR.'],
    ['I CAME HERE IN A BIN', 'AND YOU WILL LEAVE IN ONE.'],
    ['NINE HEARTS. ALL OF THEM HURT.', 'HAVE YOU TRIED HAVING FEWER.'],
    ['WHOSE TENTACLE IS THIS', 'MINE. GIVE IT BACK.'],
    ['NOT DRUNK. GASEOUS.', 'THAT IS WORSE. THAT IS MUCH WORSE.'],
    ['RED. RED. RED.', 'IT WAS BLACK.'],
    ['I LOST A MOON IN A CARD GAME', 'WAS IT YOUR MOON', 'NO'],
    ['NICE SUIT.', 'IT IS MY SKIN.'],
    ['THERE IS NO CLOCK IN HERE. LOOK.', 'THERE IS NO DOOR EITHER.'],
    ['MY EX IS HERE.', 'WHICH ONE', 'ALL FOUR OF HER.'],
    ['THE DEALER HAS NOT BLINKED ONCE', 'THE DEALER HAS NO EYELIDS.'],
    ['CHIPS ARE NOT MONEY.', 'THAT IS THE WHOLE TRICK, YES.'],
    ['I AM ON A SYSTEM', 'IS THE SYSTEM LOSING', 'THE SYSTEM IS LOSING.'],
    ['I ONLY BET WHAT I CAN AFFORD', 'YOU BET YOUR HOUSE.', 'I COULD AFFORD IT.'],
    ['THEY COMPED ME A DRINK', 'THEY COMPED YOU YOUR OWN DRINK.'],
    ['DO YOU SMELL BURNING', 'THAT IS ME. I AM FINE.'],
    ['ONE MORE HAND AND I GO HOME', 'YOU SAID THAT ON TUESDAY.', 'IT IS TUESDAY.'],
    ['I HAVE A GOOD FEELING', 'YOU HAD A GOOD FEELING LAST TIME.', 'AND I WAS RIGHT', 'YOU WERE NOT.'],
    ['THE BARMAN KNOWS MY ORDER', 'THE BARMAN KNOWS YOUR MOTHER.'],
    ['WHAT DOES THIS BUTTON DO', 'DO NOT PRESS THE BUTTON', '...'],
    ['I AM NOT CRYING', 'THERE IS A PUDDLE.', 'IT IS A SMALL PUDDLE.'],
    ['THAT ONE OVER THERE IS RICH', 'THAT ONE OVER THERE IS A LAMP.'],
    ['I TOLD MY WIFE I WAS WORKING', 'YOU ARE. YOU WORK FOR THEM NOW.'],
    ['IS THIS THE TOP FLOOR', 'THERE IS ALWAYS ANOTHER FLOOR.'],
    ['I WOULD LIKE TO SPEAK TO SOMEBODY', 'EVERYBODY HERE WOULD.'],
    ['HOW MUCH HAVE YOU LOST', 'I DO NOT KEEP TRACK', 'THAT MUCH.'],
    ['THE DRINKS ARE FREE', 'NOTHING IN HERE IS FREE.', 'THE DRINKS ARE FREE.'],
    ['SOMEBODY DRILLED MY HOMEWORLD', 'IT WAS PROBABLY HIM.', 'IT WAS PROBABLY HIM.'],
    ['I HAVE BEEN HERE SINCE TUESDAY', 'IT IS TUESDAY.', 'I KNOW.']
  ];
  /* And a few that want no answer at all. */
  const CHAT_SOLO = [
    'I AM HAVING A LOVELY TIME',
    'DO NOT LOOK AT MY CARDS',
    'THE CARPET IS MOVING AGAIN',
    'I LIKE IT IN HERE',
    'MY LUCK IS DUE. MY LUCK IS OVERDUE.',
    'THAT MACHINE KNOWS MY NAME',
    'I AM NOT LOST. I LIVE HERE.',
    'SHH. THE WHEEL IS THINKING.'
  ];
  /* Little drawn noises for when words would be too many. */
  const EMOTES = ['heart', 'skull', 'coin', 'wat', 'yell', 'zzz', 'note', 'sweat', 'ok'];

  const CAGE_LINES = [
    'SHE COUNTS IT TWICE. SHE IS NOT COUNTING IT FOR YOU.',
    'SHE SLIDES THE TRAY OUT. THERE IS NOTHING IN IT.',
    'SHE SAYS THE HOUSE DOES NOT DO CREDIT. NOT TO YOU. NOT AGAIN.',
    'SHE ASKS IF YOU WANT IT IN CHIPS. YOU ALWAYS WANT IT IN CHIPS.',
    'SHE HAS A PHOTOGRAPH OF YOU UNDER THE GLASS. IT IS NOT A NICE ONE.',
    'SHE SAYS THE WHEEL PAID OUT TWICE ALL YEAR. SHE WATCHED BOTH.'
  ];
  const BOTTLES = [];
  for (let i = 0; i < 9; i++) BOTTLES.push({ x: 274 + (i % 5) * 7, y: (i / 5) | 0, k: i % 4 });


  function goClub(g, story) {
    S.scene = 'club';
    S.cdeck = story ? 0 : (S.cdeck | 0);
    place(g, story ? 120 : CLUB_SPOTS[0].x + 30);
    if (story) { UI.mode = null; S.drunk = 0.45; say('YOU ARE UP. YOU ARE NOT WELL. THE BACK OF THE ROOM IS THAT WAY.'); }
    else compYou(g);
    A.sfx.tone(90, { type: 'square', to: 60, dur: 0.3, vol: 0.1 });
  }
  function leaveClub(g) {
    if (S.clubFrom === 'hub') {
      S.clubFrom = null;
      S.scene = 'hub'; S.deck = PD.market.CASINO.deck;
      place(g, PD.market.CASINO.x + 24);
      A.sfx.tone(220, { type: 'square', to: 420, dur: 0.2, vol: 0.08 });
      return;
    }
    S.scene = 'out';
    place(g, CLUB_X - 24);
    A.sfx.tone(220, { type: 'square', to: 420, dur: 0.2, vol: 0.08 });
  }

  /* ------------------------------------------------------------- the tables
     Two games, and underneath they are the same game: you put money down and
     the house decides. The cards are a straight high card at either table --
     the dealer takes the ties, which is the whole of the house edge and is
     never once mentioned. The wheel is red or black with a green pocket on
     it, which is the same edge wearing a different coat. */
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const CARD = { at: null, t: 0, you: 0, dlr: 0, ys: 0, ds: 0, win: 0, done: 0 };
  const ROU = { t: 0, spin: 0, ball: 0, land: -1, bet: -1, win: 0, live: 0, done: 0, rest: 0 };

  const CARD_LOSE = [
    'THE DEALER DOES NOT LOOK UP. HE JUST TAKES IT.',
    'HE TURNS IT OVER, WAITS A BEAT, AND SWEEPS THE LOT.',
    'HE SAYS NOTHING. THE MOUSTACHE SAYS PLENTY.',
    'THE TABLE MAKES A SMALL POLITE NOISE AT YOU.',
    'HE OFFERS YOU ANOTHER HAND BEFORE THE CHIPS ARE OFF THE FELT.'
  ];
  const ROU_LOSE = [
    'THE RAKE COMES ACROSS. IT IS A VERY GOOD RAKE.',
    'THE CROUPIER SAYS THE COLOUR WITHOUT ANY FEELING IN IT AT ALL.',
    'IT SAT ON YOURS FOR HALF A SECOND. HALF A SECOND IS NOT A SECOND.',
    'GREEN. NOBODY WINS ON GREEN EXCEPT THE ROOM.',
    'SOMEBODY BEHIND YOU SAYS THEY KNEW IT. THEY DID NOT KNOW IT.'
  ];

  function tableBusy() { return CARD.at || ROU.live || DICE.live || BACC.live; }

  function playCards(g, which) {
    if (tableBusy()) return;
    if (g.save.credits < TSTAKE) { say('FIVE HUNDRED A HAND. YOU HAVE NOT GOT IT.'); A.sfx.deny(); return; }
    g.save.credits -= TSTAKE; wager(g, TSTAKE);
    CARD.at = which; CARD.t = 0; CARD.done = 0;
    CARD.you = U.randInt(0, 12); CARD.ys = U.randInt(0, 3);
    CARD.dlr = U.randInt(0, 12); CARD.ds = U.randInt(0, 3);
    CARD.win = CARD.you > CARD.dlr ? TSTAKE * 2 : 0;    // he takes the ties
    P.lock = 0.3;
    A.sfx.tone(320, { type: 'square', to: 190, dur: 0.12, vol: 0.06 });
    PD.chum.call(g, 'gamble');
    g.save.spun = (g.save.spun || 0) + 1;
    g.saveGame();
  }

  function tableX(id) { return id === 'poker' ? POKER_X : JACK_X; }

  function updateCards(dt, g) {
    if (!CARD.at) return;
    const was = CARD.t;
    CARD.t += dt;
    if (was < 0.30 && CARD.t >= 0.30) A.sfx.tone(560, { type: 'square', dur: 0.05, vol: 0.05 });
    if (was < 0.70 && CARD.t >= 0.70) A.sfx.tone(500, { type: 'square', dur: 0.05, vol: 0.05 });
    if (CARD.t > 3.6) { CARD.at = null; return; }
    if (CARD.t < 1.45 || CARD.done) return;
    CARD.done = 1;
    const tx = tableX(CARD.at);
    if (CARD.win) {
      g.save.credits += CARD.win;
      say(RANKS[CARD.you] + ' OVER ' + RANKS[CARD.dlr] + '. HE PUSHES ' + U.fmt(CARD.win) + ' ACROSS THE FELT.');
      FX.text(tx, FLOOR - 78, '+$' + U.fmt(CARD.win), '#ffd34d', 1);
      winLight(tx, FLOOR - 44, 1);
      for (let i = 0; i < 20; i++) {
        FX.spawn({ x: tx + U.rand(-18, 18), y: FLOOR - 38, vx: U.rand(-90, 90), vy: U.rand(-170, -50),
          life: 1.2, size: 2, glow: 1, color: i % 2 ? '#ffd34d' : '#c02038', grav: 220, drag: 1 });
      }
      A.sfx.tone(700, { type: 'square', to: 1100, dur: 0.16, vol: 0.07 });
    } else {
      say(RANKS[CARD.dlr] + ' OVER ' + RANKS[CARD.you] + '. ' + U.pick(CARD_LOSE));
      FX.text(tx, FLOOR - 78, '-$' + U.fmt(TSTAKE), '#ff5a4d', 0);
      A.sfx.deny();
      cryAboutIt(g, TSTAKE);
    }
    g.saveGame();
  }

  /* Red is the left half of the layout and black is the right half, painted
     on the felt, so the bet is wherever you happen to be standing. No menu,
     no buttons: you walk to the colour you fancy and you put it down. */
  function playRoulette(g, red) {
    if (tableBusy()) return;
    if (g.save.credits < TSTAKE) { say('FIVE HUNDRED ON THE TABLE. YOU HAVE NOT GOT IT.'); A.sfx.deny(); return; }
    g.save.credits -= TSTAKE; wager(g, TSTAKE);
    ROU.live = 1; ROU.t = 0; ROU.done = 0; ROU.bet = red ? 0 : 1;
    ROU.land = U.rand() < 0.027 ? 2 : (U.rand() < 0.5 ? 0 : 1);
    ROU.win = ROU.land === ROU.bet ? TSTAKE * 2 : 0;
    P.lock = 0.3;
    say('NO MORE BETS.');
    A.sfx.tone(180, { type: 'square', to: 460, dur: 0.3, vol: 0.07 });
    PD.chum.call(g, 'gamble');
    g.save.spun = (g.save.spun || 0) + 1;
    g.saveGame();
  }

  const ROU_NAME = ['RED', 'BLACK', 'GREEN'];
  function updateRoulette(dt, g) {
    ROU.rest = Math.max(0, ROU.rest - dt);
    if (!ROU.live) { ROU.spin += dt * 0.7; return; }
    ROU.t += dt;
    // the wheel keeps turning; it is the ball that gives up
    const q = U.clamp(1 - ROU.t / 3.1, 0, 1);
    ROU.spin += dt * (1.1 + q * 5);
    ROU.ball -= dt * (0.9 + q * 11);
    if (ROU.t > 3.1 && !ROU.done) {
      ROU.done = 1;
      if (ROU.win) {
        g.save.credits += ROU.win;
        say(ROU_NAME[ROU.land] + '. YOU HAD IT. ' + U.fmt(ROU.win) + ' BACK.');
        FX.text(ROU_X, FLOOR - 86, '+$' + U.fmt(ROU.win), '#ffd34d', 1);
        for (let i = 0; i < 26; i++) {
          FX.spawn({ x: ROU_X + U.rand(-20, 20), y: FLOOR - 40, vx: U.rand(-110, 110), vy: U.rand(-200, -60),
            life: 1.3, size: 2, glow: 1, color: i % 2 ? '#ffd34d' : '#f4f0ff', grav: 220, drag: 1 });
        }
        winLight(ROU_X, FLOOR - 46, 1.1);
        A.sfx.tone(660, { type: 'square', to: 1200, dur: 0.2, vol: 0.08 });
      } else {
        say(ROU_NAME[ROU.land] + '. ' + U.pick(ROU_LOSE));
        FX.text(ROU_X, FLOOR - 86, '-$' + U.fmt(TSTAKE), '#ff5a4d', 0);
        A.sfx.deny();
      cryAboutIt(g, TSTAKE);
      }
      g.saveGame();
    }
    if (ROU.t > 4.6) { ROU.live = 0; ROU.rest = 2.2; }
  }


  /* ===================================================================== THE SALON
     What is behind the rope. Bigger stakes, worse odds, better carpet.

     THE DICE. Two of them, thrown down the felt off the back wall. A seven
     pays three, an eleven pays five, any pair gives you your money back and
     everything else belongs to the house -- which comes out at about ninety
     four pence in the pound, and nobody at the table has ever worked that out.

     BACCARAT. Two cards each, count them, drop the tens, nearest nine wins.
     The house takes the ties. It is the simplest game in the building and it
     is the one that takes the most off you. */
  const DICE = { live: 0, t: 0, done: 0, a: 1, b: 1, win: 0, rest: 0, vx: 0 };
  const BACC = { live: 0, t: 0, done: 0, you: [0, 0], dlr: [0, 0], ys: [0, 0], ds: [0, 0], win: 0, rest: 0 };

  const DICE_LOSE = [
    'THE STICKMAN RAKES THEM BACK WITHOUT LOOKING AT YOU.',
    'FOUR. FOUR IS NOTHING. FOUR HAS NEVER BEEN ANYTHING.',
    'THE TABLE GROANS. THE TABLE IS NOT ON YOUR SIDE.',
    'HE SAYS NEW SHOOTER. HE MEANS GO AWAY.',
    'SOMEBODY BEHIND YOU BLOWS ON THEM. IT DOES NOT HELP.'
  ];
  const BACC_LOSE = [
    'THE HOUSE HAS IT BY ONE. IT IS ALWAYS BY ONE.',
    'SHE TURNS THEM OVER WITHOUT A FLICKER AND TAKES THE LOT.',
    'NATURAL. HERS, NOT YOURS.',
    'A TIE GOES TO THE HOUSE. YOU DID READ THE FELT.',
    'FIVE THOUSAND, GONE IN THE TIME IT TAKES TO TURN A CARD.'
  ];

  function playDice(g) {
    if (tableBusy()) return;
    if (g.save.credits < HI_STAKE) { say('A THOUSAND A ROLL BACK HERE. YOU HAVE NOT GOT IT.'); A.sfx.deny(); return; }
    g.save.credits -= HI_STAKE; wager(g, HI_STAKE);
    DICE.live = 1; DICE.t = 0; DICE.done = 0;
    DICE.a = U.randInt(1, 6); DICE.b = U.randInt(1, 6);
    const tot = DICE.a + DICE.b;
    DICE.win = tot === 7 ? HI_STAKE * 3 : (tot === 11 ? HI_STAKE * 5 : (DICE.a === DICE.b ? HI_STAKE : 0));
    P.lock = 0.3;
    A.sfx.dice();
    PD.chum.call(g, 'gamble');
    g.save.spun = (g.save.spun || 0) + 1;
    g.saveGame();
  }

  function updateDice(dt, g) {
    DICE.rest = Math.max(0, DICE.rest - dt);
    if (!DICE.live) return;
    DICE.t += dt;
    if (DICE.t > 1.25 && !DICE.done) {
      DICE.done = 1;
      const tot = DICE.a + DICE.b;
      if (DICE.win > HI_STAKE) {
        g.save.credits += DICE.win;
        say(tot + '. ' + (tot === 7 ? 'SEVEN. THE WHOLE TABLE SHOUTS.' : 'ELEVEN. NOBODY CAN BELIEVE IT.')
          + ' ' + U.fmt(DICE.win) + '.');
        FX.text(CRAPS_X, FLOOR - 82, '+$' + U.fmt(DICE.win), '#ffd34d', 2);
        for (let i = 0; i < 34; i++) {
          FX.spawn({ x: CRAPS_X + U.rand(-26, 26), y: FLOOR - 40, vx: U.rand(-140, 140), vy: U.rand(-230, -70),
            life: 1.4, size: 2, glow: 1, color: i % 2 ? '#ffd34d' : '#f4f0ff', grav: 220, drag: 1 });
        }
        winLight(CRAPS_X, FLOOR - 48, 1.3);
        A.sfx.jackpot();
        A.sfx.applause();
      } else if (DICE.win) {
        g.save.credits += DICE.win;
        say('A PAIR OF ' + DICE.a + 'S. YOU GET YOUR THOUSAND BACK AND NOTHING ELSE.');
        FX.text(CRAPS_X, FLOOR - 82, 'PUSH', '#e8e2f4', 0);
        A.sfx.chips(3);
      } else {
        say(tot + '. ' + U.pick(DICE_LOSE));
        FX.text(CRAPS_X, FLOOR - 82, '-$' + U.fmt(HI_STAKE), '#ff5a4d', 0);
        A.sfx.deny();
      }
      g.saveGame();
    }
    if (DICE.t > 3.4) { DICE.live = 0; DICE.rest = 2.4; }
  }

  function baccTotal(c) { return (c[0] + c[1]) % 10; }

  function playBacc(g) {
    if (tableBusy()) return;
    if (g.save.credits < BACC_STAKE) { say('FIVE THOUSAND A COUP. SHE CAN SEE YOU HAVE NOT GOT IT.'); A.sfx.deny(); return; }
    g.save.credits -= BACC_STAKE; wager(g, BACC_STAKE);
    BACC.live = 1; BACC.t = 0; BACC.done = 0;
    for (let i = 0; i < 2; i++) {
      BACC.you[i] = U.randInt(0, 12); BACC.ys[i] = U.randInt(0, 3);
      BACC.dlr[i] = U.randInt(0, 12); BACC.ds[i] = U.randInt(0, 3);
    }
    // face cards and tens count nothing, which is the whole joke of the game
    const val = k => (k >= 8 ? 0 : k + 2);
    const y = (val(BACC.you[0]) + val(BACC.you[1])) % 10;
    const d = (val(BACC.dlr[0]) + val(BACC.dlr[1])) % 10;
    BACC.yt = y; BACC.dt = d;
    BACC.win = y > d ? BACC_STAKE * 2 : 0;          // she takes the ties as well
    P.lock = 0.3;
    A.sfx.card(0); A.sfx.card(2);
    PD.chum.call(g, 'gamble');
    g.save.spun = (g.save.spun || 0) + 1;
    g.saveGame();
  }

  function updateBacc(dt, g) {
    BACC.rest = Math.max(0, BACC.rest - dt);
    if (!BACC.live) return;
    const was = BACC.t;
    BACC.t += dt;
    for (const [w, i] of [[0.25, 0], [0.5, 1], [0.75, 2], [1.0, 3]]) {
      if (was < w && BACC.t >= w) A.sfx.card(i);
    }
    if (BACC.t > 1.9 && !BACC.done) {
      BACC.done = 1;
      A.sfx.flip();
      if (BACC.win) {
        g.save.credits += BACC.win;
        say(BACC.yt + ' TO ' + BACC.dt + '. SHE PUSHES ' + U.fmt(BACC.win) + ' ACROSS AND SAYS NOTHING.');
        FX.text(BACC_X, FLOOR - 84, '+$' + U.fmt(BACC.win), '#ffd34d', 2);
        for (let i = 0; i < 40; i++) {
          FX.spawn({ x: BACC_X + U.rand(-28, 28), y: FLOOR - 40, vx: U.rand(-150, 150), vy: U.rand(-240, -70),
            life: 1.5, size: 2, glow: 1, color: i % 3 ? '#ffd34d' : '#d63550', grav: 220, drag: 1 });
        }
        winLight(BACC_X, FLOOR - 48, 1.5);
        A.sfx.jackpot();
      } else {
        say(BACC.dt + ' TO ' + BACC.yt + '. ' + U.pick(BACC_LOSE));
        FX.text(BACC_X, FLOOR - 84, '-$' + U.fmt(BACC_STAKE), '#ff5a4d', 0);
        A.sfx.deny();
      cryAboutIt(g, BACC_STAKE);
      }
      g.saveGame();
    }
    if (BACC.t > 4.2) { BACC.live = 0; BACC.rest = 2.6; }
  }

  /* --------------------------------------------------------------- the lounge
     Somebody has been on that stage every night since the place opened and she
     has three numbers. Ask and she does the next one, and the band changes
     with her, because the music in this room is coming off that stage. */
  const SONGS = [
    { id: 'lounge1', name: 'A MOON, A MAN, A MILLION',
      line: 'SHE COUNTS THE BAND IN WITHOUT LOOKING AT THEM.' },
    { id: 'lounge2', name: 'DRILL IT, BOY',
      line: 'THE HORN PLAYER SITS UP. THIS IS THE ONE HE LIKES.' },
    { id: 'lounge3', name: 'WHAT I OWE',
      line: 'THE ROOM GOES QUIET. EVEN THE DICE TABLE GOES QUIET.' }
  ];
  function askForASong(g) {
    S.songI = ((S.songI === undefined ? -1 : S.songI) + 1) % SONGS.length;
    const sg = SONGS[S.songI];
    S.song = sg.id;
    S.clap = 1.6;
    say(sg.name + '. ' + sg.line);
    FX.text(STAGE_X, FLOOR - 92, sg.name, '#ffd34d', 1);
    A.sfx.applause();
    if (!g.save.seen.song) {
      g.save.seen.song = 1;
      g.save.thots = (g.save.thots || 0) + 60;
      FX.text(P.x, P.y - 50, '+60 THOTS', '#4cff9a', 1);
      g.saveGame();
    }
  }

  /* The pit boss. He is not rude about it. He is just not going to move. */
  const PIT_LINES = [
    'HE LOOKS AT YOUR SHOES AND THEN AT YOUR FACE. THE SHOES LOSE.',
    'HE SAYS THE BACK ROOM IS FOR PEOPLE WHO HAVE DONE SOMETHING.',
    'HE ASKS HOW MANY WORLDS. YOU SAY NONE YET. HE NODS AND STAYS PUT.',
    'THE ROPE DOES NOT MOVE. HE DOES NOT MOVE. NOTHING MOVES.'
  ];
  function tryTheRope(g) {
    if (salonOpen(g)) {
      say('HE UNCLIPS THE ROPE WITHOUT A WORD AND STANDS ASIDE.');
      A.sfx.dock();
      return;
    }
    say(U.pick(PIT_LINES));
    A.sfx.deny();
  }


  /* ===================================================================== THE CARD
     What the house thinks of you, and it is the only opinion in the building
     that is worth anything.

     Every bet you put down anywhere in this room goes on your account,
     win or lose, because the house does not care whether you win -- it cares
     how much goes across the felt. Five tiers, and every one of them is worth
     something real rather than a badge:

        BRONZE   the rope comes down whatever you have or have not destroyed
        SILVER   the bar stops charging you
        GOLD     the machines pay fifteen for three instead of twelve
        BLACK    there is an envelope waiting every time you come in
        THE LIST somebody fetches THE UNIVERSAL back out for you

     It is a loyalty scheme, which is the politest thing in the galaxy and
     also the single most expensive. */
  const VIP = [
    { at: 0, name: 'NOBODY', note: 'THEY DO NOT KNOW YOUR FACE' },
    { at: 10000, name: 'BRONZE', note: 'THE ROPE COMES DOWN FOR YOU' },
    { at: 50000, name: 'SILVER', note: 'THE BAR IS ON THE HOUSE' },
    { at: 250000, name: 'GOLD', note: 'THE MACHINES PAY FIFTEEN' },
    { at: 1000000, name: 'BLACK', note: 'AN ENVELOPE EVERY TIME YOU COME IN' },
    { at: 5000000, name: 'THE LIST', note: 'THEY WILL FETCH THE UNIVERSAL BACK OUT' }
  ];
  function vipTier(g) {
    const w = g.save.wagered || 0;
    let k = 0;
    for (let i = 0; i < VIP.length; i++) if (w >= VIP[i].at) k = i;
    return k;
  }
  /* Everything that takes a bet comes through here, so the account can never
     drift out of step with the games. */
  function wager(g, amount) {
    const before = vipTier(g);
    g.save.wagered = (g.save.wagered || 0) + amount;
    const after = vipTier(g);
    if (after > before) {
      const v = VIP[after];
      say('THE PIT BOSS WALKS OVER AND SAYS ONE WORD: ' + v.name + '. ' + v.note + '.');
      FX.text(P.x, P.y - 58, v.name, '#ffd34d', 2);
      FX.ring(P.x, P.y - 20, 4, 90, 1.1, '#ffd34d', 3);
      for (let i = 0; i < 40; i++) {
        FX.spawn({ x: P.x + U.rand(-20, 20), y: P.y - 20, vx: U.rand(-150, 150), vy: U.rand(-250, -70),
          life: 1.6, size: 2, glow: 1, color: i % 2 ? '#ffd34d' : '#f4f0ff', grav: 210, drag: 1 });
      }
      A.sfx.jackpot();
      g.save.thots = (g.save.thots || 0) + 50 * after;
      FX.text(P.x, P.y - 74, '+' + (50 * after) + ' THOTS', '#4cff9a', 1);
    }
  }
  /* The envelope, once per visit, for anybody the house is frightened of. */
  function compYou(g) {
    if (vipTier(g) < 4) return;
    const n = 20000 * (vipTier(g) - 3);
    g.save.comped = (g.save.comped || 0) + n;
    g.save.credits += n;
    say('THERE IS AN ENVELOPE AT THE CAGE WITH YOUR NAME ON IT. ' + U.fmt(n) + '.');
    FX.text(P.x, P.y - 50, '+$' + U.fmt(n), '#ffd34d', 1);
    A.sfx.chips(4);
    g.saveGame();
  }

  /* The cage. She does not gamble and she does not stop anyone who does. */
  function cashier(g) {
    const k = vipTier(g), v = VIP[k], nx = VIP[k + 1];
    if (nx) {
      say(v.name + '. ' + v.note + '. ' + U.fmt(nx.at - (g.save.wagered || 0)) +
        ' MORE ACROSS THE FELT AND YOU ARE ' + nx.name + '.');
    } else {
      say(v.name + '. THERE IS NOTHING ABOVE IT. THEY WILL FETCH ANYTHING YOU ASK FOR.');
    }
    FX.text(CAGE_X, FLOOR - 70, '$' + U.fmt(g.save.credits), '#ffd34d', 0);
    A.sfx.tone(920, { type: 'triangle', to: 1240, dur: 0.1, vol: 0.05 });
    if (!g.save.seen.cage) {
      g.save.seen.cage = 1;
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
    ['WATER', 'THE BARMAN IS VISIBLY DISAPPOINTED IN YOU.'],
    ['ON THE HOUSE', 'NOTHING IN HERE IS ON THE HOUSE. YOU PAID FOR IT.']
  ];
  function buyADrink(g) {
    const free = vipTier(g) >= 2;
    if (!free && g.save.credits < 500) { say('FIVE HUNDRED. YOU HAVE NOT GOT IT.'); A.sfx.deny(); return; }
    if (!free) g.save.credits -= 500;
    const d = U.pick(DRINKS);
    say(d[0] + '. ' + (free ? 'THE BARMAN WAVES YOUR MONEY AWAY. ' : '') + d[1]);
    FX.text(P.x, P.y - 46, d[0], '#ffd34d', 1);
    FX.stars(P.x, P.y - 30, 10, '#ffd34d');
    A.sfx.tone(660, { type: 'triangle', to: 1200, dur: 0.18, vol: 0.07 });
    g.saveGame();
  }

  function updateClub(dt, g) {
    S.beat += dt;
    updateSlots(dt, g);
    updateCards(dt, g);
    updateRoulette(dt, g);
    updateDice(dt, g);
    updateBacc(dt, g);
    updateMega(dt, g);
    updateClaw(dt, g);
    updateNPCs(dt, g);
    updateCry(dt);
    LOAN.t = Math.max(0, LOAN.t - dt);
    S.clap = Math.max(0, S.clap - dt);
    if (cdeck() === 0) shoving(dt, g);
    /* SOMEBODY STARTS SOMETHING. One conversation at a time -- three bubbles
       up together papered over the whole room and you could not see which
       table you were standing at -- and it runs its whole length before
       anybody else gets a word in. */
    S.chatT -= dt;
    runChat(dt);
    if (S.chatT <= 0 && !CHAT.steps && !CLUBBERS.some(c => c.sayT > 0)) {
      S.chatT = U.rand(1.6, 3.2);
      startChat();
    }
    for (let i = 0; i < CLUBBERS.length; i++) {
      const c = CLUBBERS[i];
      if (cdeck() !== 0) { c.t += dt * 0.4; continue; }
      c.t += dt;
      c.sayT = Math.max(0, c.sayT - dt);
      if (c.sayT <= 0) { c.say = null; c.emote = null; }
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
        }
        if (c.kiss <= 0) c.mate = -1;
        continue;
      }
      /* `dance` is what it was called when this was a nightclub. In here it
         is standing at a table watching somebody else's money go. */
      c.cheer = Math.max(0, (c.cheer || 0) - dt);
      if (c.dance > 0) { c.dance -= dt; c.vx = 0; continue; }
      c.wait -= dt;
      if (c.wait <= 0) {
        c.wait = U.rand(1.4, 4);
        if (U.rand() < 0.42) { c.dance = U.rand(2, 6); c.vx = 0; }
        else { c.vx = U.rand() < 0.5 ? -15 : 15; c.face = Math.sign(c.vx); }
      }
      c.x += c.vx * dt;
      if (c.x < c.lo) { c.x = c.lo; c.vx = Math.abs(c.vx); c.face = 1; }
      if (c.x > c.hi) { c.x = c.hi; c.vx = -Math.abs(c.vx); c.face = -1; }
    }
    updateTray(dt);
    updateWin(dt);
    // pair off whoever happens to be standing next to somebody
    S.kissT -= dt;
    if (S.kissT <= 0 && cdeck() === 0) {
      S.kissT = U.rand(3.4, 7);
      const free = CLUBBERS.filter(c => c.kiss <= 0);
      for (const a of free) {
        const b = free.find(o => o !== a && o.kiss <= 0 && Math.abs(o.x - a.x) < 40);
        if (!b || a.kiss > 0) continue;
        const d = Math.sign(b.x - a.x) || 1;
        a.face = d; b.face = -d;
        a.kiss = b.kiss = U.rand(1.8, 3.2);
        a.mate = CLUBBERS.indexOf(b); b.mate = CLUBBERS.indexOf(a);
        A.sfx.tone(900, { type: 'sine', to: 1300, dur: 0.09, vol: 0.03 });
        break;
      }
    }
  }

  /* ====================================================== RUNNING A CHAT
     `speak` puts one line over one head. `startChat` finds two of them near
     enough to hear each other, turns them to face one another and queues the
     whole exchange up front, one line at a time, with the timing worked out
     from how long each line takes to read. */
  function speak(c, text, faceX) {
    if (typeof text === 'object') { c.emote = text.e; c.say = null; c.sayT = 1.5; }
    else { c.say = text; c.emote = null; c.sayT = 1.1 + text.length * 0.045; }
    c.sayMax = c.sayT;
    c.dance = 0;
    if (faceX !== undefined && faceX !== c.x) c.face = Math.sign(faceX - c.x) || c.face;
    c.vx = 0;
  }

  /* One conversation at a time, so the whole thing lives in one place rather
     than in a queue on every alien in the room. A first pass hung the queue
     off the speakers and a four-line exchange quietly overwrote its own third
     line, because the same one of the two was up for it twice. */
  const CHAT = { steps: null, i: 0, at: 0 };

  function startChat() {
    // nobody talks over the staff
    for (const n of NPCS) { const q = NPC_STATE[n.id]; if (q && q.sayT > 0) return; }
    const pool = CLUBBERS.filter(c => c.kiss <= 0 && c.sayT <= 0);
    if (!pool.length) return;
    const a = U.pick(pool);
    const K = AH.KIN[a.k % AH.KIN.length];
    // whoever is close enough to be talking to them
    const b = pool.find(o => o !== a && Math.abs(o.x - a.x) < 74);

    // a regular has his own thing to say and says it now and then
    if (K.say && U.chance(0.26)) { speak(a, K.say, b ? b.x : undefined); return; }

    if (!b || U.chance(0.16)) {
      // nobody to talk to, or just a noise to themselves
      speak(a, U.chance(0.34) ? { e: U.pick(EMOTES) } : U.pick(CHAT_SOLO));
      return;
    }

    const script = U.pick(CHAT_DUO).slice();
    // and now and then a last word that is not a word
    if (U.chance(0.3)) script.push({ e: U.pick(EMOTES) });
    CHAT.steps = script.map((text, i) => {
      const who = i % 2 ? b : a, other = who === a ? b : a;
      return { who, text, face: other.x };
    });
    CHAT.i = 0; CHAT.at = 0;
    b.face = Math.sign(a.x - b.x) || b.face;
    b.vx = 0;
  }

  /* Who is about to speak, and how long we have got. The room draws two small
     dots over their head just before they come in, which is the difference
     between a conversation and two signs taking turns. */
  function chatNext() {
    if (!CHAT.steps || CHAT.i >= CHAT.steps.length) return null;
    return { who: CHAT.steps[CHAT.i].who, at: CHAT.at };
  }

  function runChat(dt) {
    if (!CHAT.steps) return;
    CHAT.at -= dt;
    if (CHAT.at > 0) return;
    if (CHAT.i >= CHAT.steps.length) { CHAT.steps = null; return; }
    /* One bubble in the air at a time, whatever the clock says. Working the
       gap out from how long the last line takes to read got it right to within
       a frame or two and wrong the rest of the time, and two bubbles on top of
       each other is unreadable. Nobody comes in until the room is quiet. */
    if (CLUBBERS.some(c => c.say || c.emote)) return;
    const st = CHAT.steps[CHAT.i++];
    // if one of them has wandered out of earshot the exchange simply stops
    if (Math.abs(st.who.x - st.face) > 130) { CHAT.steps = null; return; }
    speak(st.who, st.text, st.face);
    CHAT.at = st.who.sayT + 0.28;
  }


  /* ================================================= THE WIN, WITHOUT DOTS
     Every table in here used to throw a handful of glowing specks at the
     ceiling when it paid. In a room this gold they never read as confetti --
     they read as the screen being broken. So a win is drawn light instead:
     hard concentric rings going out, a pool of it on the carpet, and spokes
     that turn. It is one shape, it is made of whole pixels, and when it is
     over there is nothing left behind to chase round the building. */
  const WIN = { x: 0, y: 0, t: 0, max: 0, col: '#ffd34d', big: 1 };
  function winLight(x, y, big, col) {
    WIN.x = x; WIN.y = y; WIN.big = big || 1;
    WIN.t = WIN.max = 0.55 + (big || 1) * 0.35;
    WIN.col = col || CAS.gold;
    /* AND THE ROOM TURNS ROUND. Everybody within earshot stops what they are
       doing, faces the noise and cheers, which is the single cheapest way to
       make a win feel like it happened in a room full of people rather than
       in a spreadsheet. */
    let heard = 0;
    for (const c of CLUBBERS) {
      if (Math.abs(c.x - x) > 150 + 90 * (big || 1)) continue;
      c.face = Math.sign(x - c.x) || c.face;
      c.dance = U.rand(1.4, 2.6);
      c.vx = 0;
      c.cheer = 1.1 + (big || 1) * 0.3;
      heard++;
    }
    if (heard > 2) A.sfx.applause && A.sfx.applause();
  }
  function updateWin(dt) { WIN.t = Math.max(0, WIN.t - dt); }
  function drawWin(ctx, t, cam) {
    if (WIN.t <= 0) return;
    const q = 1 - WIN.t / WIN.max;                       // 0 at the pay, 1 at the end
    const x = WIN.x - cam, y = WIN.y;
    if (x < -260 || x > VW + 260) return;
    const R = 26 + 92 * WIN.big;
    // the rings, three of them, chasing each other out and thinning as they go
    for (let i = 0; i < 3; i++) {
      const f = q * 1.25 - i * 0.16;
      if (f <= 0 || f >= 1) continue;
      ctx.globalAlpha = 0.5 * (1 - f);
      X.ring(ctx, x, y, Math.round(R * f), WIN.col, Math.max(1, Math.round(4 - f * 3)));
    }
    // spokes, turning, so it reads as a machine paying rather than a bubble
    ctx.globalAlpha = 0.28 * (1 - q);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * U.TAU + t * 1.6;
      const r0 = R * 0.18, r1 = R * (0.4 + 0.5 * q);
      X.line(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0,
        x + Math.cos(a) * r1, y + Math.sin(a) * r1, WIN.col, 2);
    }
    // and the light it puts on the carpet in front of whatever just paid
    ctx.globalAlpha = 0.2 * (1 - q);
    X.blob(ctx, x, FLOOR + 3, R * 0.9, 8, WIN.col);
    ctx.globalAlpha = 0.34 * (1 - q * q);
    X.blob(ctx, x, y, R * 0.3, R * 0.3, WIN.col);
    ctx.globalAlpha = 1;
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
    setZoom(zoomFor(S.scene));
    /* Particles live in world coordinates and every room in here uses the same
       ones. Carrying them across a door means a bar's cigarette smoke reappears
       forty feet up a lift shaft. Drop them at the threshold. */
    FX.clearParts();
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
      /* The wheel takes whichever colour you are standing over, so the prompt
         has to say which one that is before he commits five hundred to it. */
      for (const sp of CLUB_SPOTS) {
        if (sp.id !== 'roulette') continue;
        sp.sub = tableBusy() ? 'THE BALL IS STILL GOING'
          : (P.x < ROU_X ? 'RED. $500 ON IT.' : 'BLACK. $500 ON IT.');
      }
      /* Every floor has the lift in the same place, and everybody standing
         on this floor is somebody you can talk to. */
      /* The reach stops short of the front door on purpose: stand ON the door
         and you leave, stand a step inside it and you get the lift. */
      const out = [{ id: 'lift', x: LIFT_X - 54, lo: 52, hi: LIFT_X + 16,
        name: 'THE LIFT', sub: CDECKS[cdeck()].name + '  -  FOUR FLOORS' }];
      /* The spot follows them about, because they walk now: a prompt nailed
         to where somebody used to stand is worse than no prompt. */
      for (const n of NPCS) {
        if (n.deck !== cdeck()) continue;
        const nx = npcX(n);
        out.push({ id: 'npc', npc: n.id, x: nx - 26, r: 26, name: n.name, sub: 'HAVE A WORD' });
      }
      if (cdeck() === 1) {
        out.push({ id: 'claw', x: CLAW_X - 44, lo: CLAW_X - 40, hi: CLAW_X + 40,
          name: 'THE CLAW', sub: 'IT NEVER HOLDS ON. $300' });
        out.push({ id: 'prize', x: PRIZE_X - 62, lo: PRIZE_X - 54, hi: PRIZE_X + 54,
          name: 'THE PRIZE COUNTER', sub: 'LOOK AT WHAT YOU COULD HAVE WON' });
      }
      if (cdeck() === 2) {
        out.push({ id: 'loan', x: LOAN_X - 60, lo: LOAN_X - 52, hi: LOAN_X + 52,
          name: 'THE DESK', sub: 'AN ADVANCE. THEY NEVER SAY NO.' });
      }
      if (cdeck() === 3) {
        out.push({ id: 'mega', x: MEGA_X + 62, lo: MEGA_X - MEGA_HW - 40, hi: MEGA_X + MEGA_HW + 96,
          name: 'THE UNIVERSAL', sub: 'THE MEGA PLANET MACHINE. $' + U.fmt(MEGA_STAKE) });
      }
      if (cdeck() !== 0) return out;

      for (const sp of CLUB_SPOTS) out.push(sp);
      out.push({ id: 'rope', x: ROPE_X - 30, r: 26,
        name: salonOpen(g) ? 'THE SALON' : 'THE ROPE',
        sub: salonOpen(g) ? 'THEY KNOW YOU BACK THERE NOW' : 'TWO DEAD WORLDS AND HE MOVES' });
      if (salonOpen(g)) for (const sp of SALON_SPOTS) out.push(sp);
      return out;
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
      name: 'THE CASINO', sub: 'IT WAS UNDER THE BINS' });
    return out;
  }

  function nearest(g) {
    let best = null, bd = 1e9;
    for (const s of spots(g)) {
      const d = Math.abs(s.x - P.x);
      const near = s.lo === undefined ? d < s.r : (P.x > s.lo && P.x < s.hi);
      if (near && d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function use(g, s) {
    if (!s) return;
    if (FX.wipeActive()) return;
    /* THE LESSON COMES FIRST. While the tutorial is on, the only thing on
       this screen that does anything is the thing the current step is about. */
    if (g.tutAllows && !g.tutAllows('home', s.id)) { g.tutNope('home'); return; }
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
    if (s.id === 'club') { P.lock = 1; g.wipeTo(240, 135, '#4a0a18', () => goClub(g), 'bars', 0.62); return; }
    if (s.id === 'clubout') { P.lock = 1; g.wipeTo(240, 135, '#4a0a18', () => leaveClub(g), 'bars', 0.62); return; }
    if (s.id === 'bar') { buyADrink(g); return; }
    if (s.id === 'cage') { cashier(g); return; }
    if (s.id === 'poker' || s.id === 'jack') { playCards(g, s.id); return; }
    if (s.id === 'roulette') { playRoulette(g, P.x < ROU_X); return; }
    if (s.id === 'rope') { tryTheRope(g); return; }
    if (s.id === 'craps') { playDice(g); return; }
    if (s.id === 'bacc') { playBacc(g); return; }
    if (s.id === 'stage') { askForASong(g); return; }
    if (s.id === 'lift') { openLift(g); return; }
    if (s.id === 'npc') { talkTo(g, s.npc); return; }
    if (s.id === 'claw') { playClaw(g); return; }
    if (s.id === 'loan') { takeALoan(g); return; }
    if (s.id === 'mega') { playMega(g); return; }
    if (s.id === 'prize') {
      say(U.pick(['NONE OF IT IS WORTH WHAT IT COST YOU TO LOOK AT IT.',
        'THE BIG DUCK IS NINE THOUSAND TICKETS. YOU HAVE FOUR.',
        'SHE SAYS THE LAVA LAMP IS VERY POPULAR. SHE SAYS IT TO EVERYONE.',
        'THERE IS A BRAIN IN A JAR ON THE TOP SHELF AND IT IS WATCHING YOU.']));
      A.sfx.click();
      return;
    }
    if (s.id.indexOf('slot') === 0) { playSlot(g, +s.id.slice(4)); return; }
    if (s.id === 'universal') { P.lock = 1; PD.chum.enterGamble(g); return; }
    if (s.bid) { openBuild(g, s.bid); return; }
    if (s.id === 'tele') { openTele(g); return; }
    if (s.shop) { openShop(g, s.shop.key, s.shop.sign, s.shop.keeper, s.shop.brand, s.shop.dark); return; }
    if (s.stall) { openShop(g, s.stall.key, s.stall.name, s.stall.keeper, s.stall.col, '#2a1a24'); return; }
    if (s.id === 'casino') { P.lock = 1; S.clubFrom = 'hub'; g.wipeTo(240, 135, '#4a0a18', () => goClub(g), 'bars', 0.62); return; }
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
      FX.text(CLUB_X, groundY(CLUB_X) - 56, 'A CASINO?', '#ffd34d', 2);
      FX.ring(CLUB_X, groundY(CLUB_X) - 20, 4, 70, 1.1, '#c02038', 3);
      for (let k = 0; k < 40; k++) {
        FX.spawn({ x: CLUB_X + U.rand(-20, 20), y: groundY(CLUB_X) - 16, vx: U.rand(-120, 120),
          vy: U.rand(-220, -60), life: 1.5, size: 2, glow: 1,
          color: k % 3 === 0 ? '#c02038' : (k % 3 === 1 ? '#f4f0ff' : '#ffd34d'), grav: 180, drag: 1 });
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
    { deck: 0, x: 790, kind: 'crate' },
    { deck: 0, x: 860, kind: 'freighter' },
    { deck: 2, x: 620, kind: 'bank', name: 'THE FIRST BANK OF NOWHERE' },
    { deck: 2, x: 860, kind: 'scope' }
  ];

  /* Everybody else, run by crowd.js: they shop, sit, chat, dance, go into
     the casino and come out again, and notice you. */
  let HW = null;
  function hubPlaces(d) {
    const shops = PD.mall.SHOPS.filter(q => q.deck === d).map(q => ({ x: q.x, col: q.brand, food: q.key === 'noodle' || q.key === 'cafe' }));
    const stalls = PD.market.STALLS.filter(q => q.deck === d).map(q => ({ x: q.x, col: q.col, food: q.key !== 'flower' }));
    const seats = d === 1 ? [622, 638] : (d === 2 ? [760, 776] : [290, 770]);
    const casino = d === PD.market.CASINO.deck ? PD.market.CASINO.x : null;
    return { shops, stalls, seats, casino };
  }
  function hubWorld() {
    if (!HW) HW = PD.crowd.make({ decks: [16, 18, 10], w: HUB_W, places: hubPlaces });
    return HW;
  }
  const HUBPC = { px: 0, pdeck: 0, jumped: 0, bought: 0 };
  function updateHubCrowd(dt) {
    HUBPC.px = P.x; HUBPC.pdeck = S.deck;
    PD.crowd.update(hubWorld(), dt, HUBPC);
    HUBPC.jumped = 0; HUBPC.bought = 0;
  }

  const HUB = { ride: null, t: 0, arrive: 0, panel: null, sel: 0 };

  function goHub(g) {
    S.scene = 'hub'; S.deck = 0; S.t = 0;
    HUB.ride = null; HUB.panel = null; HUB.arrive = 0;
    UI.mode = null;
    place(g, 150);
    // the first time: the camera shows you round before you get the controls
    if (!g.save.seenPort && g.save.seenIntro) PD.cut.tour(g);
    g.intCam = camWant();
    if (!PD.cut.touring()) PD.chum.call(g, 'hub');
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
    for (const q of PD.mall.SHOPS) {
      if (q.deck !== S.deck) continue;
      out.push({ id: 'shop_' + q.key, shop: q, x: q.x, r: 26, deck: q.deck, name: q.sign, sub: q.line });
    }
    for (const q of PD.market.STALLS) {
      if (q.deck !== S.deck) continue;
      out.push({ id: 'shop_' + q.key, stall: q, x: q.x, r: 22, deck: q.deck, name: q.name + ' STALL', sub: 'FOOD FOR THE NEXT DIVE' });
    }
    if (S.deck === PD.market.CASINO.deck) out.push({ id: 'casino', x: PD.market.CASINO.x, r: 26, deck: S.deck,
      name: 'THE LUCKY MOON', sub: 'THE CASINO. GO IN.' });
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
  function openShop(g, key, name, keeper, col, col2) {
    HUB.panel = { kind: 'shop', key };
    UI.mode = 'hub';
    PD.market.open(g, key, name, keeper, col, col2);
  }
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
    if (HUB.panel.kind === 'shop') {
      const r = PD.market.update(dt, g);
      if (r === 'close') { PD.market.close(); closeHubPanel(); }
      else if (r === 'bought') HUBPC.bought = 1;
      updateHubCrowd(dt);
      return;
    }
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
    if (pn.kind === 'shop') { PD.market.draw(ctx, g, t); return; }
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

  /* ================================================== THE MARKET, DOTONBORI
     The middle deck was a row of stalls and a lot of empty air above them.
     What fixes that is not more stalls: it is SIGNAGE. Osaka stacks its shop
     signs vertically up the face of every building until the street is a
     canyon of lit boxes, and then hangs an enormous animal off the front --
     a pufferfish, a crab with moving claws, an octopus -- because a sign that
     is a shape beats a sign that is a word from three hundred feet away.

     All of it is drawn at the back of the deck so the crowd walks in front of
     it, and everything lit flickers on its own clock so no two boxes pulse
     together. */
  const OSAKA_WORDS = ['SOLD HERE', 'OPEN', 'CASH ONLY', 'FRESH', 'NO REFUND',
    'HOT', 'EAT', 'DEEP CUT', 'BEST PRICE', 'TWO FOR ONE', 'LICENSED', 'NIGHT'];
  const SIGN_COL = [
    ['#ff2f7a', '#ff9bc4', '#5e0a2c'], ['#38e8ff', '#c4f8ff', '#0c4655'],
    ['#ffc44d', '#fff0c0', '#6a4a10'], ['#7dff9a', '#d8ffe0', '#164a26'],
    ['#a97cff', '#e0d0ff', '#361f5e']
  ];

  /* One tower of stacked boxes going up the face of the deck above. */
  /* One tower of stacked boxes. It is built from `top` downwards to `bot`,
     because these hang off a building rather than stand on the ground. */
  function signTower(ctx, x, top, bot, seed, t) {
    let y = top;
    let i = 0;
    while (y < bot - 8) {
      const h = 11 + ((seed + i * 7) % 3) * 4;
      if (y + h > bot) break;
      const C = SIGN_COL[(seed + i * 3) % SIGN_COL.length];
      const w = 26 + ((seed + i * 5) % 3) * 8;
      const on = (Math.floor(t * 3 + i * 0.7 + seed) % 29) !== 0;
      X.plate(ctx, x - w / 2 - 2, y - 2, w + 4, h + 4, '#0a0e18', '#1e2636', '#05070c', 3);
      X.rect(ctx, x - w / 2, y, w, h, on ? C[2] : '#0d1018');
      X.rect(ctx, x - w / 2, y, w, 1, on ? C[0] : '#18202c');
      if (on) {
        // the letters are blocks: it is signage in a language you do not read
        const n = 2 + ((seed + i) % 3);
        for (let k = 0; k < n; k++) {
          const cw = Math.floor((w - 8) / n);
          const bx = x - w / 2 + 4 + k * cw;
          X.rect(ctx, bx, y + 3, cw - 2, h - 6, C[0]);
          X.rect(ctx, bx + 1, y + 4, cw - 4, 1, C[1]);
          X.rect(ctx, bx + 1, y + 4 + ((seed + k) % Math.max(1, h - 8)), cw - 4, 1, C[2]);
        }
        ctx.globalAlpha = 0.12;
        X.blob(ctx, x, y + h / 2, w * 0.8, h, C[0]);
        ctx.globalAlpha = 1;
      }
      // the spine it all bolts to
      X.rect(ctx, x - 1, y + h, 2, 5, '#141c28');
      y += h + 5;
      i++;
    }
  }

  /* THE BIG ANIMALS. Four of them, each one a shop sign the size of a room. */
  function osakaBeast(ctx, kind, x, y, t, dim) {
    const bob = Math.sin(t * 0.8 + x) * 2.5;
    const yy = y + bob;
    if (kind === 'puffer') {
      /* A PUFFERFISH. A fat ball of spines with a lit belly, and it inflates
         and deflates very slowly, which is the whole joke. */
      const puff = 1 + Math.sin(t * 0.5) * 0.08;
      const r = 21 * puff;
      for (let i = 0; i < 22; i++) {
        const a = i / 22 * U.TAU;
        const sl = 7 + (i % 3) * 3;
        X.poly(ctx, [[x + Math.cos(a - 0.12) * r, yy + Math.sin(a - 0.12) * r * 0.82],
          [x + Math.cos(a + 0.12) * r, yy + Math.sin(a + 0.12) * r * 0.82],
          [x + Math.cos(a) * (r + sl), yy + Math.sin(a) * (r + sl) * 0.82]], '#e8a23a');
      }
      X.blob(ctx, x, yy, r, r * 0.82, '#f0b84a');
      X.blob(ctx, x, yy + r * 0.3, r * 0.82, r * 0.5, '#fff0c0');
      for (let i = 0; i < 5; i++) X.rect(ctx, x - r * 0.7 + i * r * 0.34, yy + r * 0.34, 2, 8, '#e8a23a');
      // eyes, huge, and a small unhappy mouth
      for (const sd of [-1, 1]) {
        X.blob(ctx, x + sd * r * 0.44, yy - r * 0.3, 7, 7, '#ffffff');
        X.blob(ctx, x + sd * r * 0.44 + (Math.sin(t * 0.6) > 0 ? 1 : -1), yy - r * 0.3, 4, 4, '#101018');
        X.blob(ctx, x + sd * r * 0.44 - 1, yy - r * 0.3 - 2, 2, 2, '#ffffff');
      }
      X.blob(ctx, x, yy + r * 0.06, 5, 4, '#c47a20');
      X.rect(ctx, x - 3, yy + r * 0.06, 7, 2, '#7a3a10');
      ctx.globalAlpha = 0.1;
      X.blob(ctx, x, yy, r + 18, r + 12, '#ffc44d');
      ctx.globalAlpha = 1;
    } else if (kind === 'crab') {
      /* A CRAB, and the claws move. The one in Osaka has moving claws and it
         is the only thing anybody remembers about that street. */
      const cl = Math.sin(t * 1.4) * 0.5;
      X.blob(ctx, x, yy, 22, 13, '#c42a30');
      X.blob(ctx, x, yy - 3, 19, 8, '#e8484e');
      X.blob(ctx, x, yy - 5, 12, 4, '#ff8a8a');
      for (const sd of [-1, 1]) {
        // legs
        for (let i = 0; i < 3; i++) {
          const a = 0.5 + i * 0.4;
          X.limb(ctx, x + sd * 16, yy + 3, x + sd * (24 + i * 5), yy + 9 + i * 4, 3, 2, '#c42a30', '#e8484e', '#5e0e12');
        }
        // the claw on its own arm
        const ax2 = x + sd * (27 + Math.sin(t * 1.1 + sd) * 2), ay2 = yy - 9 + Math.cos(t * 0.9) * 2;
        X.limb(ctx, x + sd * 18, yy - 2, ax2, ay2, 5, 4, '#c42a30', '#e8484e', '#5e0e12');
        X.poly(ctx, [[ax2, ay2 + 2], [ax2 + sd * 12, ay2 - 2 - cl * 5], [ax2 + sd * 11, ay2 + 2]], '#e8484e');
        X.poly(ctx, [[ax2, ay2 + 2], [ax2 + sd * 12, ay2 + 7 + cl * 5], [ax2 + sd * 11, ay2 + 3]], '#c42a30');
        // eye on a stalk
        X.rect(ctx, x + sd * 6 - 1, yy - 12, 2, 6, '#c42a30');
        X.blob(ctx, x + sd * 6, yy - 14, 3, 3, '#ffffff');
        X.blob(ctx, x + sd * 6, yy - 14, 2, 2, '#101018');
      }
      ctx.globalAlpha = 0.1;
      X.blob(ctx, x, yy, 34, 19, '#ff5a5a');
      ctx.globalAlpha = 1;
    } else if (kind === 'octo') {
      // AN OCTOPUS, tentacles drifting as if the street were underwater
      X.blob(ctx, x, yy, 16, 15, '#8a3ac4');
      X.blob(ctx, x, yy - 4, 13, 10, '#b05ae8');
      X.blob(ctx, x - 4, yy - 7, 5, 4, '#e0a8ff');
      for (let i = 0; i < 6; i++) {
        let px = x - 12 + i * 4.8, py = yy + 10;
        const ph = t * 1.3 + i;
        for (let k = 0; k < 5; k++) {
          const nx = px + Math.sin(ph + k * 0.7) * 2.6, ny = py + 4;
          X.limb(ctx, px, py, nx, ny, 5 - k, 4 - k, '#8a3ac4', '#b05ae8', '#3a1058');
          px = nx; py = ny;
        }
      }
      for (const sd of [-1, 1]) {
        X.blob(ctx, x + sd * 6, yy - 3, 4, 4, '#ffffff');
        X.blob(ctx, x + sd * 6, yy - 3, 2, 2, '#101018');
      }
      ctx.globalAlpha = 0.1;
      X.blob(ctx, x, yy + 5, 25, 22, '#c07cff');
      ctx.globalAlpha = 1;
    } else {
      // A DUMPLING, three of them on a stick, because there is always food
      X.rect(ctx, x - 2, yy - 5, 4, 34, '#8a6a3a');
      for (let i = 0; i < 3; i++) {
        const dy = yy + 1 + i * 11;
        X.blob(ctx, x, dy, 11, 9, '#f0dcb0');
        X.blob(ctx, x - 2, dy - 3, 4, 3, '#fff6e0');
        X.blob(ctx, x, dy + 4, 9, 3, '#c49a5a');
      }
      ctx.globalAlpha = 0.1;
      X.blob(ctx, x, yy + 14, 18, 25, '#ffd8a0');
      ctx.globalAlpha = 1;
    }
  }

  /* They hang off the FRONT of the deck above, which is how these signs work:
     the whole point is that the fish is bigger than the shop. */
  const OSAKA = [
    { x: 240, kind: 'puffer', y: -84 },
    { x: 495, kind: 'crab', y: -86 },
    { x: 632, kind: 'octo', y: -82 },
    { x: 802, kind: 'dumpling', y: -96 },
    { x: 1064, kind: 'puffer', y: -84 }
  ];

  function hubOsaka(ctx, g, t, cam, d, dim) {
    if (d !== 1) return;
    const y = DECK_Y[d], top = DECK_Y[2] + 24;
    ctx.globalAlpha = dim ? 0.55 : 1;

    /* THE SHOPS are PD.mall's now -- see hubProps. What is left here is the
       signage that hangs off the outside of the building. */
    /* THE TOWERS. There is no room to stack them UPWARDS -- the deck above is
       eighty pixels over your head -- so they hang off the front edge of this
       one and run DOWN into the air over the docks, which is how half of that
       street works anyway: the signs are bolted to the outside of the building
       and the building is the thing you are standing in. */
    for (let x = 96; x < HUB_W - 60; x += 122) {
      const px = x - cam;
      if (px < -60 || px > VW + 60) continue;
      X.rect(ctx, px - 2, y + 2, 4, 8, '#1a2230');
      signTower(ctx, px, y + 10, DECK_Y[0] - 46, (x / 122) | 0, t);
    }

    /* AND THE ANIMALS. */
    for (const o of OSAKA) {
      const px = o.x - cam;
      if (px < -90 || px > VW + 90) continue;
      osakaBeast(ctx, o.kind, px, y + o.y, t, dim);
    }
    ctx.globalAlpha = 1;
  }

  function hubProps(ctx, g, t, cam, d, dim) {
    const y = DECK_Y[d];
    hubOsaka(ctx, g, t, cam, d, dim);
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
    /* THE SHOPS. Real ones, with a name and a logo and somebody behind the
       till. Four of them sell you something; the rest are just open. */
    const px = d === S.deck ? P.x : -9999;
    if (d === 1) {
      for (const [k, dx] of [['bin', 124], ['palm', 240], ['palm', 365], ['palm', 495],
        ['bench', 630], ['palm', 1062], ['palm', 1200], ['bin', 1214]]) {
        const x = dx - cam;
        if (x > -40 && x < VW + 40) PD.mall.dress(ctx, k, x, y, dim);
      }
    }
    // the open-air market on the docks
    for (const st of PD.market.STALLS) {
      if (st.deck !== d) continue;
      const x = st.x - cam;
      if (x > -60 && x < VW + 60) PD.market.drawStall(ctx, st, x, y, t, px - cam, dim);
    }
    for (const s of PD.mall.SHOPS) {
      if (s.deck !== d) continue;
      const x = s.x - cam;
      if (x < -s.w || x > VW + s.w) continue;
      const q = s.id && STALL_OF[s.id];
      const owned = !!(q && q.once && g.save.bought && g.save.bought[q.id]);
      PD.mall.draw(ctx, s, x, y, t, cam, px - cam, owned, dim);
    }
    // and in among the shops, the way into the casino
    if (d === PD.market.CASINO.deck) {
      const cx2 = PD.market.CASINO.x - cam;
      if (cx2 > -120 && cx2 < VW + 120) PD.market.drawCasino(ctx, cx2, y, t, px - cam, dim);
    }
    ctx.globalAlpha = 1;
  }

  function hubCrowd(ctx, g, t, cam, d, dim) {
    PD.crowd.draw(ctx, hubWorld(), t, cam, d, DECK_Y[d], dim, VW);
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
    if (UI.mode === 'lift') { S.t += dt; updateLiftPanel(dt, g); return; }
    /* A cutscene: the room is real but the controls are not yours. */
    if (CUT()) {
      g0 = g; S.t += dt;
      if (PD.cut.active()) PD.cut.update(dt, g);
      if (CUT()) { g.intCam = U.damp(g.intCam, camWant(), 0.12, dt); view(dt); }
      return;
    }
    if (S.scene === 'hub' && PD.cut.touring()) {
      g0 = g; S.t += dt;
      HUB.arrive = Math.max(0, HUB.arrive - dt * 2.2);
      PD.cut.updateTour(dt, g);
      updateHubCrowd(dt);
      if (!PD.cut.touring()) setZoom(zoomFor('hub'));
      g.intCam = U.damp(g.intCam, camWant(), 0.12, dt);
      view(dt);
      return;
    }
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
    if (S.scene === 'in' && U.chance(dt * 2.4)) {
      FX.spawn({ x: IN_SPOTS[1].x + U.rand(-14, 14), y: FLOOR - 88, vx: U.rand(-6, 6), vy: U.rand(-16, -5),
        life: 1.1, size: 2, color: '#8affd0', grav: -0.06, drag: 0.96, glow: 1 });
    }
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
      HUBPC.jumped = 1;
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
    /* The room itself: a hundred people losing money, heard rather than seen.
       It follows the scene, so it is on the moment you are through the door
       and gone the moment you are not. */
    A.room(S.scene === 'club' ? (salonOpen(g) ? 1 : 0.8) : 0);
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
  function touchMode() { return CUT() ? 'ui' : 'home'; }
  /* Into one of the cutscene rooms: same placing, same zoom, same camera. */
  function enterCut(g, scene, atX) {
    g0 = g;
    S.scene = scene; S.deck = 0;
    UI.mode = null;
    place(g, atX);
    g.intCam = camWant();
    view(30);
  }

  /* ------------------------------------------------------------------ draw */
  function drawSpace(ctx, g, t, cam) {
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#090620'); sky.addColorStop(0.6, '#150d31'); sky.addColorStop(1, '#2a1541');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
    const nx = 330 - cam * 0.2;
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
    /* There used to be a DEAD CELESTIAL HEAD here -- a three-hundred-pixel
       skull sprite, drawn at a FIXED SCREEN POSITION with a bob on it, at
       six-tenths alpha and eighty-five per cent size. Which meant that as you
       walked the whole length of the moon it stayed nailed to the top left
       corner going quietly up and down, and read as a smudge on the lens.

       Parallaxing it and scaling it up to a landmark only made it a different
       problem: at that size it is a pale slab across half the sky with the
       stars behind it. It is gone. The sky out here is a nebula, four hundred
       stars and the world you are on your way to ruin, and that is enough. */

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
        X.blob(ctx, CLUB_X - cam, cy2 - 22, 26, 16, '#c02038');
        ctx.globalAlpha = 1;
      }
      F.draw(ctx, 'CASINO', CLUB_X - cam, cy2 - 40, lit ? '#ffd34d' : '#5e4410', { center: true, scale: 2, shadow: '#0a0614' });
      // the bulbs round the sign, chasing, the way they always are
      for (let i = 0; i < 7; i++) {
        const on = (Math.floor(t * 4) + i) % 3 !== 0;
        X.blob(ctx, CLUB_X - cam - 18 + i * 6, cy2 - 46, 1.5, 1.5, on ? '#ffe9a8' : '#5a4418');
      }
    }
  }

  /* ===================================================================== THE CASINO
     It was a nightclub. It is not any more: the same hole in the same moon,
     gutted and refitted in black and red, because a man who lost a million
     in one is not going to be allowed anywhere near a dancefloor again.

     Black lacquer walls with red flock panels and a gold dado rail, a
     coffered ceiling with chandeliers hanging out of it, and a carpet in the
     only two colours the house owns. Everything standing on that carpet is a
     table, and behind every table is somebody whose whole job is to take
     your money slowly and politely and offer you another go. */
  /* THE HOUSE COLOURS, REBUILT.
     This room was flock wallpaper, mahogany and candlelight -- a Monte Carlo
     salon with aliens in it. It is a casino on a moon at the end of the
     galaxy, and it should look like one: cold blue-black glass, brushed
     steel, and every warm thing in the room being a light rather than a
     lamp. The names are the old ones on purpose, so four thousand lines of
     room code did not have to be retyped -- `gold` is now the amber of a lit
     strip, `red` is the house magenta, `wood` is dark steel. */
  const CAS = {
    black: '#131a26', blackL: '#1f2a3a', blackD: '#080c14',
    red: '#c0247a', redL: '#ff5fb0', redD: '#5e1040',
    felt: '#0d2e3a', feltL: '#14485a',
    gold: '#ffc44d', goldD: '#c08a2a', goldDD: '#6a4c18',
    wood: '#28323f', woodL: '#465468',
    // and the cold half of the palette, which is most of it
    neon: '#38e8ff', neonD: '#1a7f96', neonDD: '#0d3d4a',
    lime: '#7dff9a', violet: '#a97cff', steel: '#8ea0b8', steelD: '#57647a',
    glass: 'rgba(90,200,230,0.18)',
    chip: ['#ff5fb0', '#e8f4ff', '#1f2a3a', '#ffc44d', '#38e8ff']
  };

  /* The four suits, small enough to sit on a card and still read. */
  function suitPip(ctx, x, y, col, k) {
    if (k === 0) {                                    // spade
      X.poly(ctx, [[x, y - 4], [x + 4, y + 1], [x - 4, y + 1]], col);
      X.blob(ctx, x - 2, y + 1, 2, 2, col); X.blob(ctx, x + 2, y + 1, 2, 2, col);
      X.rect(ctx, x - 1, y + 1, 3, 4, col);
    } else if (k === 1) {                             // heart
      X.blob(ctx, x - 2, y - 2, 2, 2, col); X.blob(ctx, x + 2, y - 2, 2, 2, col);
      X.poly(ctx, [[x - 4, y - 1], [x + 4, y - 1], [x, y + 4]], col);
    } else if (k === 2) {                             // diamond
      X.poly(ctx, [[x, y - 4], [x + 3, y], [x, y + 4], [x - 3, y]], col);
    } else {                                          // club
      X.blob(ctx, x, y - 2, 2, 2, col);
      X.blob(ctx, x - 3, y + 1, 2, 2, col); X.blob(ctx, x + 3, y + 1, 2, 2, col);
      X.rect(ctx, x - 1, y, 3, 5, col);
    }
  }

  /* The motif stamped into the flock, over and over, at the size the house
     paid for it: small enough that it reads as pattern and not as picture. */
  /* The house mark. It used to be a damask fleur; it is a circuit node now --
     a dot with four traces off it -- and it is stencilled everywhere the
     wallpaper pattern used to be. Same footprint, so nothing else moved. */
  function damask(ctx, x, y, col) {
    X.rect(ctx, x - 1, y - 1, 3, 3, col);
    X.rect(ctx, x - 4, y, 3, 1, col);
    X.rect(ctx, x + 2, y, 3, 1, col);
    X.rect(ctx, x, y - 4, 1, 3, col);
    X.rect(ctx, x, y + 2, 1, 3, col);
    X.rect(ctx, x - 4, y - 1, 1, 1, col);
    X.rect(ctx, x + 4, y + 1, 1, 1, col);
  }

  /* A playing card, face up or face down, at whatever angle it was thrown. */
  function cardAt(ctx, x, y, rank, suit, faceUp, ang) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (ang) ctx.rotate(ang);
    X.plate(ctx, -6, -9, 13, 19, faceUp ? '#e8e2f4' : CAS.red,
      faceUp ? '#ffffff' : CAS.redL, faceUp ? '#9a92b4' : CAS.redD, 3);
    if (faceUp) {
      const red = suit === 1 || suit === 2;
      const col = red ? '#c02038' : '#1a1024';
      F.draw(ctx, rank, -4, -7, col, { shadow: false });
      suitPip(ctx, 2, 4, col, suit);
    } else {
      X.rect(ctx, -4, -7, 10, 15, CAS.redD);
      for (let i = 0; i < 3; i++) X.rect(ctx, -3, -6 + i * 5, 8, 2, CAS.redL);
      suitPip(ctx, 1, 1, CAS.goldDD, 2);
    }
    ctx.restore();
  }

  /* A stack of chips on the felt. */
  function chipStack(ctx, x, y, n, k) {
    for (let i = 0; i < n; i++) {
      const c = CAS.chip[(k + i) % CAS.chip.length];
      X.blob(ctx, x, y - i * 2, 5, 2, '#0a0408');
      X.blob(ctx, x, y - i * 2 - 1, 5, 2, c);
      X.rect(ctx, x - 2, y - i * 2 - 2, 4, 1, '#f4f0ff');
    }
  }

  /* ---------------------------------------------------------------- the room
     The first pass at this wall was a row of big flat red rectangles with a
     soft glow on each one, and it read as a padded cell rather than a room.
     What it was missing was architecture: it is arched alcoves between fluted
     pilasters now, over a wood wainscot, under a dentil cornice, and every
     alcove has something in it.

     All of it is baked once into a single bay and stamped across the room,
     because it never changes and there are thirty of them. The bay is baked
     at 2x, the same density as every sprite in the game, so it lands one
     canvas pixel to one device pixel under the HD transform. */
  const BAY = 80;
  const WALL_H = FLOOR - CLUB_CEIL;
  let bayCv = null;

  /* ONE BAY OF THE WALL, BAKED.
     The old one was flock wallpaper in an arched alcove with a gilt pilaster
     either side -- a Monte Carlo salon. This is the same footprint rebuilt as
     the inside of a machine: a brushed steel frame, a recessed panel lit from
     behind, a service seam with bolts, and one hot strip of light running the
     width of it. Three kinds, so the wall has a rhythm rather than a repeat.

     It is still baked once into a canvas and blitted, because a wall that is
     two thousand pixels long cannot be drawn shape by shape every frame. */
  function bayArt(kind) {
    const c = document.createElement('canvas');
    c.width = BAY * 2; c.height = WALL_H * 2;
    const q = c.getContext('2d');
    q.imageSmoothingEnabled = false;
    q.setTransform(2, 0, 0, 2, 0, 0);
    const H = WALL_H, TOP = 0;

    // the shell: cold dark glass, wall to wall
    X.rect(q, 0, TOP, BAY, H, CAS.blackD);
    X.rect(q, 0, TOP, BAY, H - 34, CAS.black);

    const ax = 11, aw = 58, base = H - 34;

    /* THE RECESS. A rectangle cut into the wall with a chamfered edge, lit
       from inside, and it steps IN rather than arching over. */
    X.plate(q, ax - 3, TOP + 10, aw + 6, base - 16, CAS.blackL, CAS.steelD, '#04070c', 5);
    X.rect(q, ax, TOP + 13, aw, base - 22, CAS.blackD);

    if (kind === 0) {
      /* A LIT PANEL. Bands of house colour behind smoked glass, brightest at
         the top, with a scanline crawl baked into it. */
      for (let y = 0; y < base - 26; y++) {
        const f = y / (base - 26);
        const col = f < 0.42 ? CAS.redD : (f < 0.72 ? '#2a1038' : CAS.neonDD);
        X.rect(q, ax + 2, TOP + 15 + y, aw - 4, 1, col);
        if (y % 4 === 0) { q.globalAlpha = 0.3; X.rect(q, ax + 2, TOP + 15 + y, aw - 4, 1, '#000000'); q.globalAlpha = 1; }
      }
      // the house mark, big, in the middle of it
      for (let i = 0; i < 3; i++) damask(q, ax + 14 + i * 15, TOP + 40, i === 1 ? CAS.neon : CAS.neonD);
      q.globalAlpha = 0.22;
      X.rect(q, ax + 2, TOP + 15, aw - 4, 14, CAS.redL);
      q.globalAlpha = 1;
    } else if (kind === 1) {
      /* A SERVICE PANEL. Bolted steel, a vent, and a strip that is not on. */
      X.rect(q, ax + 2, TOP + 15, aw - 4, base - 26, CAS.blackL);
      for (let i = 0; i < 5; i++) X.rect(q, ax + 6, TOP + 22 + i * 7, aw - 12, 3, '#0c1420');
      for (let i = 0; i < 5; i++) X.rect(q, ax + 6, TOP + 22 + i * 7, aw - 12, 1, CAS.steelD);
      for (const bx of [ax + 5, ax + aw - 6]) {
        for (let i = 0; i < 4; i++) { X.rect(q, bx - 1, TOP + 19 + i * 16, 3, 3, CAS.steelD); X.set && 0; }
      }
      X.rect(q, ax + 2, base - 16, aw - 4, 2, CAS.neonDD);
    } else {
      /* GLASS. You can see the room behind it, gone cold and soft. */
      X.rect(q, ax + 2, TOP + 15, aw - 4, base - 26, '#0a1a24');
      q.globalAlpha = 0.5;
      X.poly(q, [[ax + 4, base - 14], [ax + 22, TOP + 16], [ax + 30, TOP + 16], [ax + 12, base - 14]], '#1c3a4a');
      q.globalAlpha = 0.3;
      X.poly(q, [[ax + 26, base - 14], [ax + 40, TOP + 16], [ax + 44, TOP + 16], [ax + 30, base - 14]], '#245060');
      q.globalAlpha = 0.22;
      X.rect(q, ax + 3, base - 40, aw - 6, 24, CAS.neonD);
      q.globalAlpha = 1;
      for (let y = TOP + 16; y < base - 14; y += 3) { q.globalAlpha = 0.12; X.rect(q, ax + 2, y, aw - 4, 1, '#7fe8ff'); }
      q.globalAlpha = 1;
    }

    /* THE MULLION between the bays: a steel rib with a light channel in it. */
    X.rect(q, 0, TOP + 2, 9, H - 2, CAS.blackL);
    X.rect(q, 0, TOP + 2, 1, H - 2, CAS.steelD);
    X.rect(q, 8, TOP + 2, 1, H - 2, '#04070c');
    X.rect(q, 3, TOP + 8, 3, H - 46, CAS.neonDD);
    X.rect(q, 4, TOP + 8, 1, H - 46, CAS.neonD);
    X.rect(q, -1, TOP + 4, 11, 4, CAS.blackL);
    X.rect(q, -1, TOP + 4, 11, 1, CAS.steelD);

    /* THE DADO. A run of dark steel along the bottom with a lit line over it,
       which is what stops the wall floating. */
    X.rect(q, 0, base, BAY, 34, CAS.wood);
    X.rect(q, 0, base, BAY, 2, CAS.woodL);
    X.rect(q, 0, base + 2, BAY, 1, CAS.neonDD);
    for (let i = 0; i < 2; i++) {
      const px = 14 + i * 36;
      X.plate(q, px, base + 7, 30, 17, '#1a2330', '#2c3848', '#070b12', 2);
      X.rect(q, px + 3, base + 10, 24, 11, '#101825');
      X.rect(q, px + 3, base + 10, 24, 1, CAS.steelD);
    }
    X.rect(q, 0, H - 8, BAY, 8, CAS.blackD);
    X.rect(q, 0, H - 8, BAY, 1, CAS.steelD);
    return c;
  }

  function casinoWall(ctx, t, cam) {
    if (!bayCv) bayCv = [0, 1, 2].map(bayArt);
    X.rect(ctx, 0, CLUB_CEIL, VW, WALL_H, CAS.black);
    const first = Math.floor(cam / BAY) - 1;
    for (let b = first; b < first + Math.ceil(VW / BAY) + 2; b++) {
      const px = b * BAY - cam;
      if (px < -BAY || px > VW) continue;
      const k = ((b % 3) + 3) % 3;
      ctx.drawImage(bayCv[k], Math.round(px), CLUB_CEIL, BAY, WALL_H);
    }
    /* The strip over each rib, live, because the room breathes: a channel of
       light with a brighter pulse travelling along it. Candles guttered; this
       is a filament that is either on or dying. */
    for (let b = first; b < first + Math.ceil(VW / BAY) + 2; b++) {
      const px = Math.round(b * BAY - cam) + 5;
      if (px < -14 || px > VW + 14) continue;
      const on = (Math.floor(t * 2.6) + ((b % 7) + 7) % 7) % 23 !== 0;
      X.rect(ctx, px - 3, FLOOR - 70, 7, 20, CAS.blackL);
      X.rect(ctx, px - 3, FLOOR - 70, 7, 1, CAS.steelD);
      X.rect(ctx, px - 1, FLOOR - 68, 3, 16, on ? CAS.neonD : '#0d1a20');
      if (on) {
        X.rect(ctx, px - 1, FLOOR - 68, 3, 16, CAS.neonD);
        X.rect(ctx, px, FLOOR - 68, 1, 16, CAS.neon);
        // the pulse
        const ph = ((t * 26 + b * 13) % 34);
        if (ph < 16) X.rect(ctx, px - 1, FLOOR - 68 + ph, 3, 3, '#dffaff');
        ctx.globalAlpha = 0.1;
        X.blob(ctx, px, FLOOR - 60, 13, 18, CAS.neon);
        ctx.globalAlpha = 1;
      }
    }
    casinoWallArt(ctx, t, cam);
  }

  /* What the house hangs on its own walls: portraits of men who won once and
     were photographed for it, a clock with no hands on it, and a gold sign
     about credit that is a lie in both directions. */
  const WALL_ART = [{ x: 300, k: 0 }, { x: 560, k: 2 }, { x: 790, k: 1 }, { x: 868, k: 0 }];
  function casinoWallArt(ctx, t, cam) {
    for (const a of WALL_ART) {
      const px = a.x - cam, y = CLUB_CEIL + 30;
      if (px < -50 || px > VW + 50) continue;
      if (a.k === 0) {                                // a winner, framed in gold
        X.plate(ctx, px - 17, y, 34, 42, CAS.goldDD, CAS.goldD, '#2a1c06', 3);
        X.rect(ctx, px - 13, y + 4, 26, 34, '#1d0d16');
        const K = AH.KIN[(a.x / 7 | 0) % AH.KIN.length];
        X.blob(ctx, px, y + 22, 10, 13, K.skin || '#8fd6a0');
        X.blob(ctx, px, y + 13, 8, 8, K.skin || '#8fd6a0');
        X.rect(ctx, px - 5, y + 11, 3, 3, '#ffffff'); X.rect(ctx, px + 2, y + 11, 3, 3, '#ffffff');
        X.rect(ctx, px - 5, y + 16, 11, 2, '#2a1c14');
        X.rect(ctx, px - 7, y + 19, 15, 3, CAS.red);  // and the tie
        X.rect(ctx, px - 12, y + 34, 24, 2, CAS.goldD);
      } else if (a.k === 1) {                         // a gold disc of a jackpot
        X.plate(ctx, px - 15, y + 4, 30, 30, '#2a1c06', CAS.goldD, '#140e04', 3);
        X.blob(ctx, px, y + 19, 11, 11, CAS.blackD);
        X.blob(ctx, px, y + 19, 9, 9, CAS.goldD);
        X.blob(ctx, px, y + 19, 5, 5, CAS.gold);
        X.blob(ctx, px, y + 19, 2, 2, CAS.blackD);
      } else {                                        // the clock. No hands.
        X.plate(ctx, px - 16, y + 2, 32, 32, CAS.goldDD, CAS.goldD, '#2a1c06', 8);
        X.blob(ctx, px, y + 18, 12, 12, '#1d0d16');
        for (let i = 0; i < 12; i++) {
          const an = i / 12 * U.TAU;
          X.rect(ctx, px + Math.cos(an) * 9, y + 18 + Math.sin(an) * 9, 1, 1, CAS.goldD);
        }
        X.blob(ctx, px, y + 18, 1.5, 1.5, CAS.goldD);
      }
    }
  }

  /* The ceiling, and the only part of it anybody sees. The camera window in
     here sits low -- you are looking at the floor, not the coffers -- so the
     coffers are a suggestion and the chandeliers hang right down into the
     room where they can be looked at. */
  /* The ceiling used to be four pixels of black at the top of a cropped
     window. The casino is not cropped any more -- the whole frame is on
     screen in here -- so it is a proper coffered ceiling now: sunk panels
     with gold beading, a painted rose in the middle of every third one, and
     the beams between them catching the light off the chandeliers. */
  function casinoCeiling(ctx, t, cam) {
    X.rect(ctx, 0, 0, VW, CLUB_CEIL + 12, CAS.blackD);
    for (let x = 0; x < clubW(); x += 46) {
      const px = x - cam;
      if (px < -50 || px > VW + 50) continue;
      const k = ((x / 46) | 0);
      // a sunk steel tray with a light channel across it
      X.rect(ctx, px + 4, 10, 38, 54, '#0e1622');
      X.rect(ctx, px + 8, 14, 30, 46, '#151f2e');
      X.rect(ctx, px + 8, 14, 30, 1, CAS.steelD);
      X.rect(ctx, px + 8, 59, 30, 1, '#070b12');
      if (k % 3 === 0) {
        // a lit ring set into every third tray
        const on = (Math.floor(t * 2.2) + k) % 19 !== 0;
        X.ring(ctx, px + 23, 36, 10, on ? CAS.neonD : '#123', 2);
        X.ring(ctx, px + 23, 36, 5, on ? CAS.neon : '#12303a', 1);
        if (on) { ctx.globalAlpha = 0.09; X.blob(ctx, px + 23, 36, 18, 16, CAS.neon); ctx.globalAlpha = 1; }
      } else if (k % 3 === 1) {
        damask(ctx, px + 23, 32, '#22304a');
        damask(ctx, px + 15, 44, '#1b2740');
        damask(ctx, px + 31, 44, '#1b2740');
      } else {
        for (let i = 0; i < 4; i++) X.rect(ctx, px + 11, 20 + i * 10, 24, 3, '#0b1220');
      }
      // the rib between the trays
      X.rect(ctx, px, 6, 5, CLUB_CEIL - 2, '#1a2534');
      X.rect(ctx, px, 6, 2, CLUB_CEIL - 2, '#26344a');
      X.rect(ctx, px, 6, 1, CLUB_CEIL - 2, CAS.steelD);
    }
    X.rect(ctx, 0, 0, VW, 8, '#0a0f18');
    X.rect(ctx, 0, 6, VW, 2, '#1a2534');
    X.rect(ctx, 0, 7, VW, 1, CAS.steelD);
    X.rect(ctx, 0, 64, VW, 4, '#1a2534');
    X.rect(ctx, 0, 64, VW, 1, CAS.steelD);
    /* THE RAIL. Where the gilt cornice was: a channel of light running the
       whole length of the room with a pulse chasing along it. */
    X.rect(ctx, 0, CLUB_CEIL - 4, VW, 4, CAS.blackL);
    X.rect(ctx, 0, CLUB_CEIL, VW, 3, CAS.neonDD);
    X.rect(ctx, 0, CLUB_CEIL + 1, VW, 1, CAS.neonD);
    const run = ((t * 80) % (clubW() + 200)) - cam - 100;
    ctx.globalAlpha = 0.9;
    X.rect(ctx, run, CLUB_CEIL, 60, 3, CAS.neon);
    X.rect(ctx, run + 20, CLUB_CEIL, 20, 3, '#dffaff');
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.08;
    X.rect(ctx, 0, CLUB_CEIL + 3, VW, 10, CAS.neon);
    ctx.globalAlpha = 1;
  }

  /* Chandeliers, hung after the wall so they are in the room rather than on
     it. Gold rings, candles that gutter one at a time, and glass drops. */
  function casinoChandeliers(ctx, t, cam) {
    /* THE LAMPS. There is no chain and there are no candles: these hang on
       nothing, turn slowly, and throw a hard ring of light rather than a soft
       one. Three stacked rings and a core, which is a chandelier's silhouette
       built out of the only material this room has. */
    for (let x = 200; x < clubW(); x += 240) {
      const px = x - cam;
      if (px < -60 || px > VW + 60) continue;
      const cy = CLUB_CEIL + 30 + Math.sin(t * 0.5 + x) * 1.5;
      const spin = t * 0.5 + x;
      for (let r = 0; r < 3; r++) {
        const rr = 20 - r * 6, yy = cy + r * 7;
        const sq = Math.max(2, Math.round(rr * (0.24 + 0.1 * Math.abs(Math.sin(spin + r)))));
        X.blob(ctx, px, yy, rr, sq, r === 1 ? CAS.redD : CAS.neonDD);
        X.blob(ctx, px, yy - 1, rr - 2, Math.max(1, sq - 2), r === 1 ? CAS.red : CAS.neonD);
        X.blob(ctx, px, yy - 1, rr - 5, Math.max(1, sq - 3), r === 1 ? CAS.redL : CAS.neon);
      }
      X.blob(ctx, px, cy + 16, 5, 5, '#dffaff');
      X.blob(ctx, px, cy + 16, 3, 3, '#ffffff');
      // the beam it drops, dithered so it stays pixels
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = 0.05 - i * 0.008;
        const w = 22 + i * 16;
        X.dither(ctx, px - w / 2, cy + 18, w, FLOOR - cy - 18, CAS.neon, i % 2);
      }
      ctx.globalAlpha = 0.1;
      X.blob(ctx, px, cy + 22, 44, 30, CAS.neon);
      ctx.globalAlpha = 1;
    }
  }

  /* The light the room puts on its own floor. Every chandelier and every
     pendant throws a pool of it down the carpet, and each pool has a hard
     bright core and two dithered steps out -- pixels, not a gradient. It is
     the cheapest thing in the building and it is what stops the carpet
     reading as forty feet of wallpaper laid flat. */
  /* Where the carpet has been walked flat: in front of whatever that deck
     asks you to put money into. */
  function wearSpots() {
    const d = cdeck();
    if (d === 0) return [CAGE_X, POKER_X, ROU_X, JACK_X, BAR_X, 1180, 1280, CRAPS_X, BACC_X];
    if (d === 1) return [250, 330, CLAW_X, 880, 1300, 1380, PRIZE_X];
    if (d === 2) return [LOAN_X, 700, 980, 1290];
    return [MEGA_X, MEGA_X + MEGA_HW + 74, 300, 1390];
  }

  function casinoFloorLight(ctx, t, cam) {
    const W = clubW();
    for (let x = 200; x < W; x += 240) {
      const px = x - cam;
      if (px < -90 || px > VW + 90) continue;
      const flick = 1 + Math.sin(t * 1.3 + x) * 0.04;
      ctx.globalAlpha = 0.05 * flick;
      X.blob(ctx, px, FLOOR + 14, 74, 16, CAS.neon);
      ctx.globalAlpha = 0.06 * flick;
      X.blob(ctx, px, FLOOR + 10, 48, 10, CAS.neon);
      ctx.globalAlpha = 0.07 * flick;
      X.blob(ctx, px, FLOOR + 7, 26, 5, '#dffaff');
      ctx.globalAlpha = 1;
    }
    for (let x = 80; x < W; x += 80) {
      if (Math.abs(((x - 200) % 240)) < 40) continue;
      const px = x - cam;
      if (px < -40 || px > VW + 40) continue;
      ctx.globalAlpha = 0.045;
      X.blob(ctx, px, FLOOR + 9, 30, 8, CAS.neon);
      ctx.globalAlpha = 1;
    }
  }

  function casinoCarpet(ctx, t, cam) {
    /* THE FLOOR. It was a red diamond carpet, and it was the single most
       Victorian thing left in the building. It is a poured dark floor now with
       a lit inlay running through it -- the same diamonds, so the pattern
       still leads your eye down the room, but they are channels of light in
       a black deck rather than wool. */
    X.rect(ctx, 0, FLOOR, VW, VH - FLOOR, '#0c1119');
    X.rect(ctx, 0, FLOOR + 12, VW, VH - FLOOR - 12, '#101722');
    X.rect(ctx, 0, FLOOR + 30, VW, VH - FLOOR - 30, '#141d2a');
    for (let x = ((-cam % 36) + 36) % 36 - 36; x < VW + 36; x += 36) {
      for (let r = 0; r < 3; r++) {
        const cx = x + 18 + (r % 2) * 18, cy = FLOOR + 8 + r * 15;
        const rw = 7 + r * 3, rh = 3 + r * 1.2;
        X.poly(ctx, [[cx, cy - rh], [cx + rw, cy], [cx, cy + rh], [cx - rw, cy]], '#0a1018');
        // the inlay, brighter the nearer it is
        const lit = r === 2 ? CAS.neonD : CAS.neonDD;
        X.poly(ctx, [[cx, cy - rh * 0.55], [cx + rw * 0.55, cy], [cx, cy + rh * 0.55], [cx - rw * 0.55, cy]], lit);
        X.rect(ctx, cx - 1, cy, 2, 1, r === 2 ? CAS.neon : CAS.neonD);
      }
    }
    /* THE WEAR. Wherever there is something to lose money at, the floor in
       front of it has been stood on by everybody who ever came in. On a poured
       deck that is scuffing rather than flattened pile, so it kills the inlay
       instead of darkening the weave. */
    for (const wx of wearSpots()) {
      const px = wx - cam;
      if (px < -70 || px > VW + 70) continue;
      ctx.globalAlpha = 0.4;
      X.blob(ctx, px, FLOOR + 10, 52, 11, '#070c14');
      ctx.globalAlpha = 0.22;
      X.blob(ctx, px, FLOOR + 8, 34, 7, '#1a2634');
      ctx.globalAlpha = 1;
    }
    // the seam where the floor meets the wall, and the light bleeding off it
    X.rect(ctx, 0, FLOOR - 1, VW, 2, '#04070c');
    X.rect(ctx, 0, FLOOR + 1, VW, 1, CAS.neonDD);
    ctx.globalAlpha = 0.07;
    X.rect(ctx, 0, FLOOR + 2, VW, 7, CAS.neon);
    ctx.globalAlpha = 1;
    // and what has been dropped on it since the floor went down
    for (let x = 30; x < clubW(); x += 43) {
      const px = x - cam;
      if (px < -20 || px > VW + 20) continue;
      const k = Math.floor(U.hash2(x, 23) * 6);
      if (k === 0) chipStack(ctx, px, FLOOR + 9, 1, (x / 43) | 0);
      else if (k === 1) {
        X.blob(ctx, px, FLOOR + 8, 4, 3, '#b8c4d4');
        X.rect(ctx, px - 2, FLOOR + 7, 2, 1, CAS.steelD);
      } else if (k === 2) {
        X.rect(ctx, px, FLOOR + 4, 4, 5, 'rgba(190,230,255,0.3)');
        X.rect(ctx, px, FLOOR + 4, 4, 1, '#d8f4ff');
      } else if (k === 3) {
        X.rect(ctx, px - 4, FLOOR + 8, 8, 2, '#243040');
        X.rect(ctx, px + 3, FLOOR + 8, 2, 2, CAS.neonD);
      } else if (k === 4) {
        X.rect(ctx, px - 3, FLOOR + 7, 7, 3, CAS.redD);
        X.rect(ctx, px - 3, FLOOR + 7, 7, 1, CAS.redL);
      }
    }
  }

  /* ======================================================= DRESSING THE ROOM
     The shell was right and the set pieces were right and between them there
     was nothing: forty feet of good wallpaper with a chip stack on the floor.
     This is everything that fills that in -- trolleys, ashtray stands, palms,
     rope runs, notices, mirrors, pendant lamps and the girl with the tray --
     laid out by rule along whatever floor you happen to be on, and stepped
     around the furniture rather than through it. */

  /* What is already taken on each deck. Anything here gets a wide berth. */
  function busySpans() {
    const d = cdeck(), out = [[30, 190]];               // the lift, always
    out.push([atriumX() - 24, atriumX() + atriumW() + 24]);
    if (d === 0) {
      out.push([CAGE_X - 74, CAGE_X + 74], [POKER_X - 62, POKER_X + 62], [ROU_X - 74, ROU_X + 74],
        [JACK_X - 62, JACK_X + 62], [BAR_X - 120, BAR_X + 120], [ROPE_X - 70, ROPE_X + 70],
        [CRAPS_X - 70, CRAPS_X + 70], [STAGE_X - 96, STAGE_X + 96], [BACC_X - 74, BACC_X + 74],
        [1130, 1410]);
    } else if (d === 1) {
      out.push([196, 382], [CLAW_X - 36, CLAW_X + 36], [818, 992], [1258, 1422],
        [PRIZE_X - 46, PRIZE_X + 46]);
    } else if (d === 2) {
      out.push([LOAN_X - 56, LOAN_X + 56], [628, 772], [890, 1070], [1210, 1370]);
    } else {
      out.push([180, 400], [MEGA_X - MEGA_HW - 90, MEGA_X + MEGA_HW + 130], [1280, 1520]);
    }
    return out;
  }
  function clearAt(spans, x, w) {
    for (const s of spans) if (x + w > s[0] && x - w < s[1]) return false;
    return true;
  }

  /* ------------------------------------------------- what stands on the floor */
  function propTrolley(ctx, x, t) {
    X.blob(ctx, x, FLOOR + 3, 16, 3, '#2a0410');
    X.plate(ctx, x - 14, FLOOR - 26, 29, 22, CAS.wood, CAS.woodL, '#160c08', 3);
    X.rect(ctx, x - 14, FLOOR - 26, 29, 2, CAS.goldD);
    X.rect(ctx, x - 12, FLOOR - 15, 25, 2, CAS.goldDD);
    for (let i = 0; i < 5; i++) {
      const bx = x - 10 + i * 5;
      X.rect(ctx, bx, FLOOR - 36, 3, 10, ['#8affa0', '#ffb03d', '#ff8ad8', '#7ec8ff', '#c9a0ff'][i]);
      X.rect(ctx, bx, FLOOR - 38, 3, 2, CAS.goldDD);
    }
    X.blob(ctx, x - 9, FLOOR - 2, 3, 3, '#1a1008');
    X.blob(ctx, x + 10, FLOOR - 2, 3, 3, '#1a1008');
  }
  function propAshStand(ctx, x, t) {
    X.blob(ctx, x, FLOOR + 2, 7, 2, '#2a0410');
    X.rect(ctx, x - 5, FLOOR - 4, 11, 4, CAS.goldDD);
    X.rect(ctx, x - 2, FLOOR - 32, 4, 28, CAS.goldDD);
    X.rect(ctx, x - 1, FLOOR - 32, 1, 28, CAS.goldD);
    X.plate(ctx, x - 8, FLOOR - 38, 17, 7, '#3a2a10', CAS.goldD, '#1a1008', 2);
    X.rect(ctx, x - 6, FLOOR - 36, 13, 3, '#9a9282');
    for (let i = 0; i < 3; i++) X.rect(ctx, x - 5 + i * 4, FLOOR - 37, 3, 1, '#d8d0c0');
    if (U.chance(0.5)) {
      ctx.globalAlpha = 0.07;
      X.blob(ctx, x + Math.sin(t * 0.7) * 2, FLOOR - 50, 5, 12, '#c9bce8');
      ctx.globalAlpha = 1;
    }
  }
  function propPalm(ctx, x, t, k) {
    X.blob(ctx, x, FLOOR + 3, 14, 3, '#2a0410');
    X.plate(ctx, x - 11, FLOOR - 18, 23, 18, '#5a4418', CAS.goldD, '#2a1c06', 3);
    X.rect(ctx, x - 11, FLOOR - 18, 23, 2, CAS.gold);
    X.rect(ctx, x - 2, FLOOR - 44, 4, 27, '#3a5a2a');
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.44 + Math.sin(t * 0.6 + i + k) * 0.05;
      const L = 20 + (i % 2) * 7;
      X.limb(ctx, x, FLOOR - 42, x + Math.cos(a) * L, FLOOR - 42 + Math.sin(a) * L * 0.8,
        4, 1, '#2e6a2a', '#5aa83a', '#1a3a18');
    }
    X.blob(ctx, x, FLOOR - 44, 4, 3, '#4a8a32');
  }
  function propRopeRun(ctx, x, t) {
    for (let i = 0; i < 3; i++) {
      const px = x + i * 26;
      if (i < 2) { ctx.globalAlpha = 0.85; X.rect(ctx, px, FLOOR - 18, 26, 3, '#8a1228'); ctx.globalAlpha = 1; }
      X.rect(ctx, px - 2, FLOOR - 22, 4, 22, '#4a3a10');
      X.rect(ctx, px - 1, FLOOR - 22, 1, 22, CAS.goldD);
      X.blob(ctx, px, FLOOR - 24, 3, 3, CAS.gold);
    }
  }
  function propBanquette(ctx, x, t, k) {
    X.blob(ctx, x, FLOOR + 3, 26, 4, '#2a0410');
    X.plate(ctx, x - 24, FLOOR - 30, 49, 30, CAS.redD, '#8a1228', CAS.blackD, 5);
    X.rect(ctx, x - 24, FLOOR - 30, 49, 2, '#9e1730');
    X.rect(ctx, x - 24, FLOOR - 14, 49, 3, '#5e0c1e');
    for (let i = 0; i < 4; i++) X.blob(ctx, x - 17 + i * 11, FLOOR - 22, 2, 2, CAS.goldDD);
    // and whoever is sleeping it off on the end
    if (k % 3 === 0) {
      const K = AH.KIN[(x | 0) % AH.KIN.length];
      kinBreath(ctx, K, 5, x + 12, FLOOR - 12, true);
    }
  }
  function propTipBox(ctx, x, t) {
    X.blob(ctx, x, FLOOR + 2, 8, 2, '#2a0410');
    X.plate(ctx, x - 7, FLOOR - 26, 15, 26, CAS.wood, CAS.woodL, '#160c08', 3);
    X.plate(ctx, x - 9, FLOOR - 38, 19, 13, '#2a1c06', CAS.goldD, '#140e04', 3);
    X.rect(ctx, x - 5, FLOOR - 36, 11, 2, '#000000');
    F.draw(ctx, 'TIPS', x, FLOOR - 32, CAS.gold, { center: true, shadow: false });
  }
  function propUplight(ctx, x, t, k) {
    const on = (Math.floor(t * 2) + k) % 9 !== 0;
    X.plate(ctx, x - 6, FLOOR - 8, 13, 8, '#2a1c28', CAS.goldDD, CAS.blackD, 2);
    X.rect(ctx, x - 4, FLOOR - 9, 9, 2, on ? CAS.gold : '#4a3a10');
    if (on) {
      ctx.globalAlpha = 0.07;
      X.poly(ctx, [[x - 5, FLOOR - 9], [x + 5, FLOOR - 9], [x + 17, FLOOR - 74], [x - 17, FLOOR - 74]], CAS.gold);
      ctx.globalAlpha = 1;
    }
  }
  function propChairs(ctx, x, t, k) {
    for (let i = 0; i < 3; i++) {
      const y = FLOOR - 4 - i * 6;
      X.plate(ctx, x - 11 + i, y - 22, 22, 22, CAS.redD, '#8a1228', CAS.blackD, 3);
      X.rect(ctx, x - 11 + i, y - 22, 22, 2, CAS.goldDD);
    }
  }
  function propBucket(ctx, x, t) {
    X.rect(ctx, x - 9, FLOOR - 30, 19, 3, '#3a2a10');
    for (let i = 0; i < 2; i++) {
      const bx = x - 5 + i * 10;
      X.poly(ctx, [[bx - 5, FLOOR - 27], [bx + 5, FLOOR - 27], [bx + 3, FLOOR - 16], [bx - 3, FLOOR - 16]], '#9e1730');
      X.rect(ctx, bx - 5, FLOOR - 28, 11, 2, '#d63550');
    }
  }
  /* A different kit on each floor, so the menagerie does not end up with a
     palm between every palm it already had. */
  const FLOOR_KITS = [
    [propTrolley, propAshStand, propRopeRun, propBanquette, propTipBox, propUplight, propChairs, propBucket, propPalm],
    [propTrolley, propChairs, propAshStand, propBanquette, propUplight, propTipBox, propRopeRun, propBucket],
    [propTrolley, propBanquette, propUplight, propChairs, propBucket, propAshStand, propTipBox, propRopeRun],
    [propRopeRun, propAshStand, propBanquette, propUplight, propChairs, propTipBox, propPalm, propTrolley]
  ];

  /* ------------------------------------------------- what hangs on the wall */
  const NOTICES = [
    ['THE HOUSE', 'DOES NOT', 'LEND'], ['NO CREDIT', 'AFTER', 'MIDNIGHT'],
    ['MIND', 'YOUR OWN', 'CHIPS'], ['ALL WINS', 'PAID IN', 'FULL'],
    ['NO ARMS', 'ON THE', 'TABLE'], ['THE HOUSE', 'THANKS YOU', 'FOR LOSING']
  ];
  function wallNotice(ctx, x, y, k) {
    X.plate(ctx, x - 20, y, 41, 34, CAS.goldDD, CAS.goldD, '#2a1c06', 3);
    X.rect(ctx, x - 17, y + 3, 35, 28, '#160a12');
    const N = NOTICES[k % NOTICES.length];
    for (let i = 0; i < 3; i++) F.draw(ctx, N[i], x, y + 7 + i * 8, i ? '#8a6a3a' : CAS.gold, { center: true, shadow: false });
  }
  function wallMirror(ctx, x, y, t) {
    X.plate(ctx, x - 17, y, 35, 46, CAS.goldD, CAS.gold, '#2a1c06', 8);
    X.rect(ctx, x - 13, y + 4, 27, 38, '#1a1826');
    ctx.globalAlpha = 0.16;
    X.poly(ctx, [[x - 11, y + 40], [x - 2, y + 6], [x + 3, y + 6], [x - 6, y + 40]], '#8a84b0');
    ctx.globalAlpha = 0.2;
    X.rect(ctx, x - 12, y + 28, 25, 13, '#7a2038');
    ctx.globalAlpha = 1;
    X.blob(ctx, x, y + 2, 5, 4, CAS.gold);
  }
  function wallTapestry(ctx, x, y, k) {
    X.rect(ctx, x - 19, y, 39, 3, CAS.goldD);
    X.rect(ctx, x - 17, y + 3, 35, 50, '#5e0a1a');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) damask(ctx, x - 8 + c * 16, y + 11 + r * 12, '#7a1024');
    for (let i = 0; i < 7; i++) X.rect(ctx, x - 17 + i * 5, y + 53, 3, 4, CAS.goldDD);
  }
  function wallTrophy(ctx, x, y, k) {
    X.plate(ctx, x - 13, y + 22, 27, 9, CAS.wood, CAS.woodL, '#160c08', 2);
    const sk = ['#8fd6a0', '#c9a0ff', '#ffb03d', '#7ec8ff'][k % 4];
    X.blob(ctx, x, y + 14, 11, 10, sk);
    X.blob(ctx, x - 7, y + 6, 4, 6, sk); X.blob(ctx, x + 7, y + 6, 4, 6, sk);
    X.rect(ctx, x - 6, y + 11, 3, 3, '#1a1008'); X.rect(ctx, x + 3, y + 11, 3, 3, '#1a1008');
    X.rect(ctx, x - 5, y + 19, 11, 2, '#1a1008');
    F.draw(ctx, 'A WINNER', x, y + 32, '#6a5a3a', { center: true, shadow: false });
  }
  function wallShelf(ctx, x, y, k) {
    X.rect(ctx, x - 18, y + 22, 37, 3, CAS.wood);
    X.rect(ctx, x - 18, y + 22, 37, 1, CAS.woodL);
    for (let i = 0; i < 7; i++) {
      const h = 10 + (i % 3) * 5;
      X.rect(ctx, x - 16 + i * 5, y + 22 - h, 4, h, ['#3a6a2a', '#6a3a1a', '#2a3a6a', '#5a2a3a'][(i + k) % 4]);
      X.rect(ctx, x - 16 + i * 5, y + 22 - h, 4, 2, CAS.goldDD);
    }
  }
  function wallCrest(ctx, x, y, k) {
    X.poly(ctx, [[x - 15, y + 4], [x + 15, y + 4], [x + 15, y + 26], [x, y + 40], [x - 15, y + 26]], CAS.redD);
    X.poly(ctx, [[x - 12, y + 7], [x + 12, y + 7], [x + 12, y + 25], [x, y + 36], [x - 12, y + 25]], '#8a1228');
    damask(ctx, x, y + 18, CAS.goldD);
    X.rect(ctx, x - 15, y + 4, 31, 2, CAS.gold);
  }
  const WALL_PROPS = [wallNotice, wallMirror, wallTapestry, wallTrophy, wallShelf, wallCrest, wallNotice, wallMirror];

  /* ------------------------------------------------------ what hangs overhead */
  function casinoOverhead(ctx, t, cam) {
    const W = clubW();
    // small pendant lamps between the chandeliers
    for (let x = 80; x < W; x += 80) {
      const px = x - cam;
      if (px < -20 || px > VW + 20) continue;
      if (Math.abs(((x - 200) % 240)) < 40) continue;          // not on a chandelier
      const cy = CLUB_CEIL + 14 + Math.sin(t * 0.4 + x) * 0.6;
      // a puck on a thin stem, lit underneath
      X.rect(ctx, px, 8, 1, cy - 8, '#1a2534');
      X.plate(ctx, px - 7, cy, 15, 7, CAS.blackL, CAS.steelD, '#04070c', 2);
      const on = (Math.floor(t * 2.2) + ((x / 80) | 0)) % 13 !== 0;
      X.rect(ctx, px - 5, cy + 6, 11, 2, on ? CAS.neonD : '#0d1a20');
      X.rect(ctx, px - 3, cy + 6, 7, 1, on ? '#dffaff' : '#0d1a20');
      if (on) { ctx.globalAlpha = 0.07; X.blob(ctx, px, cy + 14, 14, 12, CAS.neon); ctx.globalAlpha = 1; }
    }
    /* Where the bunting was: a slack cable strung bay to bay with lamps hung
       off it, half of them out. It keeps the swag -- the sag is what made the
       ceiling read as a ceiling -- and loses the flags. */
    const SEG = 72;
    for (let x = Math.floor(cam / SEG) * SEG - SEG; x < cam + VW + SEG; x += SEG) {
      const px = x - cam;
      for (let i = 0; i < 12; i++) {
        const q = i / 12, sag = Math.sin(q * Math.PI) * 6;
        X.rect(ctx, px + i * 6, CLUB_CEIL + 3 + sag, 6, 1, '#1a2534');
        if (i % 3 === 1) {
          const on = (Math.floor(t * 2 + x * 0.1) + i) % 7 !== 0;
          X.rect(ctx, px + i * 6 + 2, CLUB_CEIL + 4 + sag, 2, 3, CAS.steelD);
          X.blob(ctx, px + i * 6 + 3, CLUB_CEIL + 8 + sag, 2, 2, on ? CAS.neon : '#10242c');
          if (on) { ctx.globalAlpha = 0.14; X.blob(ctx, px + i * 6 + 3, CLUB_CEIL + 9 + sag, 6, 5, CAS.neon); ctx.globalAlpha = 1; }
        }
      }
    }
    // and the house watching you: a camera dome every so often
    for (let x = 140; x < W; x += 300) {
      const px = x - cam;
      if (px < -14 || px > VW + 14) continue;
      X.rect(ctx, px - 2, CLUB_CEIL + 2, 5, 5, '#2a1c28');
      X.blob(ctx, px, CLUB_CEIL + 8, 6, 5, '#120810');
      X.blob(ctx, px - 2, CLUB_CEIL + 7, 2, 2, (Math.floor(t * 1.5) % 4) ? '#9e1730' : '#ff5a4d');
    }
  }

  /* The girl with the tray, going up and down whichever floor you are on and
     never getting to the end of it. */
  const TRAY = { x: 400, dir: 1, k: 10, t: 0 };     // BAO, with the drinks
  function updateTray(dt) {
    TRAY.t += dt;
    TRAY.x += TRAY.dir * 17 * dt;
    const lo = 200, hi = Math.max(400, clubW() - 200);
    if (TRAY.x < lo) { TRAY.x = lo; TRAY.dir = 1; }
    if (TRAY.x > hi) { TRAY.x = hi; TRAY.dir = -1; }
  }
  function drawTray(ctx, t, cam) {
    const x = TRAY.x - cam;
    if (x < -30 || x > VW + 30) return;
    const K = AH.KIN[TRAY.k % AH.KIN.length];
    const bob = Math.sin(TRAY.t * 7) * 1.2;
    kinShadow(ctx, x, FLOOR, K);
    kinBreath(ctx, K, (Math.floor(TRAY.t * 4.4) % 2) ? 1 : 2, x, FLOOR + bob, TRAY.dir < 0);
    // the tray, held out in front, with four of whatever it is on it
    const tx = x + TRAY.dir * 11, ty = FLOOR - K.h * 0.62 + bob;
    X.plate(ctx, tx - 9, ty, 19, 3, '#4a3a10', CAS.goldD, '#1a1008', 1);
    for (let i = 0; i < 4; i++) {
      X.rect(ctx, tx - 7 + i * 4, ty - 7, 3, 7, 'rgba(220,235,255,0.35)');
      X.rect(ctx, tx - 7 + i * 4, ty - 5, 3, 5, ['#8affa0', '#ffb03d', '#ff8ad8', '#7ec8ff'][i]);
    }
  }

  /* The two passes. Wall furniture goes on before the tables so the tables
     stand in front of it; the floor props go on after the shell and before
     the crowd, so somebody is always half in front of something. */
  function casinoDressWall(ctx, t, cam) {
    const spans = busySpans(), W = clubW();
    for (let x = 96; x < W; x += 62) {
      const px = x - cam;
      if (px < -50 || px > VW + 50) continue;
      if (!clearAt(spans, x, 21)) continue;
      const i = (x / 62) | 0;
      const k = (i * 3 + Math.floor(U.hash2(x, 17) * 2)) % WALL_PROPS.length;
      WALL_PROPS[k](ctx, px, CLUB_CEIL + 40, k + i);
    }
  }
  function casinoDressFloor(ctx, g, t, cam) {
    const spans = busySpans(), W = clubW();
    for (let x = 110; x < W; x += 46) {
      const px = x - cam;
      if (px < -60 || px > VW + 60) continue;
      if (!clearAt(spans, x, 19)) continue;
      /* Step through the kit rather than picking at random: a straight random
         pick kept putting three of the same thing in a row and the floor read
         as a garden centre. */
      const kit = FLOOR_KITS[cdeck()], i = (x / 46) | 0;
      kit[(i * 3 + Math.floor(U.hash2(x, 41) * 2)) % kit.length](ctx, px, t, i);
    }
  }

  /* -------------------------------------------------------------- the house
     One dealer behind each table. The sprite is the whole performance: the
     arms go out over the felt on the deal and come back when there is nothing
     to do, which is most of the time. */
  function drawDealer(ctx, x, t, k, busy, fy) {
    const f = busy ? (Math.floor(t * 5) % 2) : (Math.floor(t * 0.9 + k) % 6 === 0 ? 1 : 0);
    /* Feet well above the floor line: he is on the far side of the table, and
       drawn at floor level the felt ate him from the waist up. */
    AH.blit(ctx, AH.S['dealer' + k], f, x, (fy === undefined ? FLOOR : fy) - 40 + Math.sin(t * 1.4 + k) * 0.6);
  }

  /* A punter sat at a table with their back half to you. */
  function drawSeated(ctx, x, t, k, flip, fy) {
    const K = AH.KIN[k % AH.KIN.length];
    kinBreath(ctx, K, (Math.floor(t * 1.6 + x) % 9) === 0 ? 5 : 0,
      x, (fy === undefined ? FLOOR - 2 : fy) + Math.sin(t * 1.9 + x) * 0.8, flip);
  }

  /* ------------------------------------------------------------- the cashier
     A cage, because the money is behind it and you are in front of it. Black
     marble, gold bars, a brass tray under the glass, and a woman who has been
     counting other people's night since before the carpet went down. */
  function drawCage(ctx, g, t, cam) {
    const cx = CAGE_X - cam;
    X.plate(ctx, cx - 42, FLOOR - 92, 84, 92, CAS.blackL, '#2e2030', CAS.blackD, 4);
    X.rect(ctx, cx - 42, FLOOR - 92, 84, 3, CAS.goldDD);
    X.rect(ctx, cx - 40, FLOOR - 88, 80, 12, '#1d0d16');
    X.rect(ctx, cx - 40, FLOOR - 77, 80, 1, CAS.goldDD);
    X.plate(ctx, cx - 34, FLOOR - 70, 68, 48, '#1d0d16', '#2e1420', CAS.blackD, 3);
    /* Her, in the window. She has to sit HIGH -- at floor level her head was
       under the counter and all you could see of the cashier was chips. */
    drawSeated(ctx, cx + 14, t, 9, true, FLOOR - 26);
    // the racked chips, on her left so they are not across her face
    for (let i = 0; i < 3; i++) chipStack(ctx, cx - 26 + i * 11, FLOOR - 34, 3, i);
    // the bars
    for (let i = 0; i < 9; i++) X.rect(ctx, cx - 32 + i * 8, FLOOR - 70, 2, 40, CAS.goldD);
    X.rect(ctx, cx - 34, FLOOR - 70, 68, 2, CAS.goldD);
    X.rect(ctx, cx - 34, FLOOR - 32, 68, 3, CAS.goldD);
    // the brass tray under the glass
    X.plate(ctx, cx - 16, FLOOR - 30, 32, 5, CAS.goldDD, CAS.goldD, '#2a1c06', 2);
    X.plate(ctx, cx - 40, FLOOR - 26, 80, 26, '#241018', '#3a1c26', CAS.blackD, 3);
    X.rect(ctx, cx - 40, FLOOR - 26, 80, 2, CAS.goldDD);
    F.draw(ctx, 'CASHIER', cx, FLOOR - 86, CAS.gold, { center: true, shadow: '#0a0408' });
    F.draw(ctx, 'NO CREDIT', cx, FLOOR - 20, '#8a6a3a', { center: true, shadow: false });

    /* The board beside the cage: five tiers, a lamp against each, and the one
       you are on lit. It is the only thing in the building that tells you you
       are getting somewhere, which is of course the point of it. */
    const bx = cx + 54, k = vipTier(g);
    X.plate(ctx, bx, FLOOR - 92, 62, 92, CAS.blackL, CAS.goldD, CAS.blackD, 4);
    X.rect(ctx, bx + 3, FLOOR - 89, 56, 10, CAS.redD);
    F.draw(ctx, 'THE CARD', bx + 31, FLOOR - 87, CAS.gold, { center: true, shadow: false });
    for (let i = 1; i < VIP.length; i++) {
      const y = FLOOR - 76 + (i - 1) * 13, on = k >= i;
      const lit = on && (Math.floor(t * 3) + i) % 6 !== 0;
      X.blob(ctx, bx + 9, y + 4, 3, 3, lit ? CAS.gold : '#3a2a10');
      if (lit) {
        ctx.globalAlpha = 0.18;
        X.blob(ctx, bx + 9, y + 4, 8, 8, CAS.gold);
        ctx.globalAlpha = 1;
      }
      F.draw(ctx, VIP[i].name, bx + 17, y + 1, on ? CAS.gold : '#5a4430', { shadow: false });
    }
    X.rect(ctx, bx + 3, FLOOR - 14, 56, 1, CAS.goldDD);
    F.draw(ctx, U.fmt(g.save.wagered || 0), bx + 31, FLOOR - 11, '#8a6a3a', { center: true, shadow: false });
  }

  /* ---------------------------------------------------------- the card table
     An oval of felt in a padded red leather rail with gold studs round it.
     Three seats on your side, the dealer stood on the far side, and the shoe
     at his elbow with more of the night in it. */
  function cardTable(ctx, g, t, cam, X0, label, mine) {
    const tx = X0 - cam, TOP = FLOOR - 34;
    const busy = CARD.at === mine;
    drawDealer(ctx, tx, t, mine === 'poker' ? 0 : 2, busy && CARD.t < 1.1);
    // the pedestal it stands on, and its shadow on the carpet
    X.blob(ctx, tx, FLOOR + 3, 26, 4, '#0a1018');
    X.plate(ctx, tx - 10, TOP + 10, 20, 24, CAS.wood, CAS.woodL, '#160c08', 3);
    X.blob(ctx, tx, TOP + 32, 20, 4, CAS.wood);
    // the table: an apron of buttoned leather with a bed of felt on top
    X.blob(ctx, tx, TOP + 16, 54, 13, CAS.blackD);
    X.rect(ctx, tx - 54, TOP + 6, 108, 11, '#3d0812');
    X.blob(ctx, tx, TOP + 17, 54, 11, '#3d0812');
    X.blob(ctx, tx, TOP + 6, 54, 13, '#8a1228');
    X.blob(ctx, tx, TOP + 5, 54, 12, CAS.redL);
    X.blob(ctx, tx, TOP + 6, 47, 10, CAS.felt);
    X.blob(ctx, tx, TOP + 5, 47, 9, CAS.feltL);
    for (let i = 0; i < 15; i++) {                     // gold studs in the leather
      const a = i / 14 * Math.PI;
      X.rect(ctx, tx - Math.cos(a) * 50, TOP + 5 + Math.sin(a) * 11, 2, 2, CAS.goldD);
    }
    // and the house's terms, printed on the felt where you cannot miss them
    F.draw(ctx, label, tx, TOP + 1, '#a84a5a', { center: true, shadow: false });
    // the shoe, the rack and a drink somebody is not touching
    X.plate(ctx, tx + 30, TOP - 6, 14, 10, CAS.blackL, '#33222e', CAS.blackD, 2);
    X.rect(ctx, tx + 32, TOP - 8, 10, 3, CAS.redD);
    X.plate(ctx, tx - 46, TOP + 1, 22, 5, CAS.goldDD, CAS.goldD, '#2a1c06', 2);
    for (let i = 0; i < 4; i++) chipStack(ctx, tx - 43 + i * 6, TOP + 2, 2, i + 1);
    // the hand, if there is one on the go
    if (busy) {
      const q = CARD.t;
      // yours comes across the felt to you, then turns over
      if (q > 0.2) {
        const s1 = U.clamp((q - 0.2) / 0.3, 0, 1);
        cardAt(ctx, tx + 26 - s1 * 44, TOP + 10 - (1 - s1) * 5, RANKS[CARD.you], CARD.ys, q > 1.0, -0.14);
      }
      if (q > 0.6) {
        const s2 = U.clamp((q - 0.6) / 0.3, 0, 1);
        cardAt(ctx, tx + 26 - s2 * 8, TOP + 2 - s2 * 1, RANKS[CARD.dlr], CARD.ds, q > 1.2, 0.12);
      }
      chipStack(ctx, tx - 2, TOP + 11, 4, 0);
      if (q > 1.45 && CARD.win) {
        ctx.globalAlpha = 0.16 + Math.sin(t * 9) * 0.06;
        X.blob(ctx, tx - 14, TOP + 8, 30, 14, CAS.gold);
        ctx.globalAlpha = 1;
      }
    }
    // the ones who got here first, sat at the near edge with their backs to you
    drawSeated(ctx, tx - 44, t, mine === 'poker' ? 3 : 12, false);
    drawSeated(ctx, tx + 42, t, mine === 'poker' ? 6 : 11, true);
  }

  /* ------------------------------------------------------------- the wheel
     The whole business in one prop. The wheel turns on a plinth, the ball
     goes the other way round it and runs out of enthusiasm, and the layout in
     front of it is painted in two halves so that the bet is simply whichever
     half of the carpet you are standing on. */
  function drawRoulette(ctx, g, t, cam) {
    const rx = ROU_X - cam, TOP = FLOOR - 36;
    drawDealer(ctx, rx + 40, t, 1, ROU.live);
    // the layout: a long table with RED on the left of it and BLACK on the right
    X.blob(ctx, rx, FLOOR + 3, 40, 4, '#0a1018');
    X.plate(ctx, rx - 40, TOP + 12, 80, 26, CAS.wood, CAS.woodL, '#160c08', 3);
    X.rect(ctx, rx - 40, TOP + 12, 80, 2, CAS.goldDD);
    X.blob(ctx, rx, TOP + 16, 62, 15, CAS.blackD);
    X.plate(ctx, rx - 60, TOP - 2, 120, 22, CAS.redD, '#8a1228', CAS.blackD, 4);
    X.rect(ctx, rx - 57, TOP + 1, 114, 15, CAS.felt);
    const lit = ROU.rest > 0 && ROU.land >= 0;
    for (let i = 0; i < 2; i++) {
      const bx = rx - 54 + i * 57, on = lit && ROU.land === i;
      X.plate(ctx, bx, TOP + 3, 51, 11, i ? CAS.blackL : CAS.red,
        on ? CAS.gold : (i ? '#332230' : CAS.redL), CAS.blackD, 2);
      F.draw(ctx, i ? 'BLACK' : 'RED', bx + 25, TOP + 5, on ? CAS.gold : '#d8c8d0',
        { center: true, shadow: false });
      // your chip sits on the half you bet, while the ball is going
      if (ROU.live && ROU.bet === i) chipStack(ctx, bx + 25, TOP + 3, 3, 0);
    }
    // the plinth and the wheel on top of it
    X.plate(ctx, rx - 26, TOP - 16, 52, 18, CAS.wood, CAS.woodL, '#160c08', 3);
    X.rect(ctx, rx - 26, TOP - 16, 52, 2, CAS.goldDD);
    const wy = TOP - 20;
    X.blob(ctx, rx, wy, 30, 11, CAS.goldDD);
    X.blob(ctx, rx, wy - 1, 28, 10, CAS.wood);
    X.blob(ctx, rx, wy - 1, 25, 9, CAS.blackD);
    // the pockets, seen at an angle, so they squash as they come round
    for (let i = 0; i < 16; i++) {
      const a = ROU.spin + i / 16 * U.TAU;
      const px = rx + Math.cos(a) * 22, py = wy - 1 + Math.sin(a) * 8;
      const col = i === 0 ? '#2f7a52' : (i % 2 ? CAS.redL : CAS.blackL);
      X.rect(ctx, px - 1.5, py - 2, 3, 4, col);
      X.rect(ctx, px - 1.5, py - 2, 3, 1, Math.sin(a) > 0 ? '#ffffff22' : '#00000044');
    }
    X.blob(ctx, rx, wy - 1, 11, 4, CAS.goldDD);
    X.blob(ctx, rx, wy - 2, 10, 3, CAS.goldD);
    // the turret in the middle, and the ball going round the outside of it
    X.rect(ctx, rx - 1, wy - 12, 3, 11, CAS.goldD);
    X.blob(ctx, rx, wy - 13, 3, 3, CAS.gold);
    const ba = ROU.ball;
    const bx2 = rx + Math.cos(ba) * (ROU.live ? 26 : 22);
    const by2 = wy - 2 + Math.sin(ba) * (ROU.live ? 10 : 8);
    X.blob(ctx, bx2, by2, 2, 2, '#ffffff');
    X.blob(ctx, bx2, by2 + 1, 2, 1, '#9a92b4');
    // the result, called out over the wheel
    if (lit) {
      const col = [CAS.redL, '#e8e2f4', '#3fb87e'][ROU.land];
      F.draw(ctx, ROU_NAME[ROU.land], rx, wy - 30, col, { center: true, scale: 2, shadow: '#0a0408' });
    }
    ctx.globalAlpha = 0.09;
    X.blob(ctx, rx, wy - 4, 40, 22, CAS.gold);
    ctx.globalAlpha = 1;
  }

  /* Booths down the back for the ones who have stopped playing and have not
     yet worked out how to leave. Black buttoned leather, red table lamps. */
  function drawBooths(ctx, g, t, cam) {
    for (const b of BOOTHS) {
      const bx = b.x - cam;
      if (bx < -70 || bx > VW + 70) continue;
      X.plate(ctx, bx - 30, FLOOR - 46, 60, 46, CAS.blackL, '#33222e', CAS.blackD, 5);
      X.rect(ctx, bx - 30, FLOOR - 46, 60, 2, CAS.goldDD);
      for (let i = 0; i < 4; i++) {                    // buttoned back
        for (let j = 0; j < 2; j++) X.blob(ctx, bx - 21 + i * 14, FLOOR - 38 + j * 11, 1.5, 1.5, '#4a3340');
      }
      X.plate(ctx, bx - 14, FLOOR - 20, 28, 4, CAS.wood, CAS.woodL, '#160c08', 2);
      X.rect(ctx, bx - 2, FLOOR - 16, 4, 16, CAS.wood);
      // a little red lamp on the table and two glasses beside it
      X.rect(ctx, bx - 1, FLOOR - 27, 3, 7, CAS.goldDD);
      X.poly(ctx, [[bx - 6, FLOOR - 27], [bx + 7, FLOOR - 27], [bx + 4, FLOOR - 34], [bx - 3, FLOOR - 34]], CAS.red);
      ctx.globalAlpha = 0.16;
      X.blob(ctx, bx, FLOOR - 26, 16, 12, CAS.redL);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 2; i++) {
        X.rect(ctx, bx - 10 + i * 17, FLOOR - 25, 3, 5, 'rgba(220,235,255,0.35)');
        X.rect(ctx, bx - 10 + i * 17, FLOOR - 25, 3, 1, '#d8f0ff');
      }
    }
    for (const st of SEATS) {
      const bob = Math.sin(t * 2.2 + st.x) * 1;
      const K = AH.KIN[st.k % AH.KIN.length];
      kinBreath(ctx, K, (Math.floor(t * 1.7 + st.x) % 7) === 0 ? 5 : 0,
        st.x - cam, FLOOR - 8 + bob, st.x > 620);
    }
  }

  /* A cleaning robot that has been going round this room since before any of
     them were born, and is not close to finished. */
  function drawRoomba(ctx, t, cam) {
    const x = roombaX(t) - cam;
    const y = FLOOR + 6;
    if (x < -30 || x > VW + 30) return;
    X.blob(ctx, x, y + 3, 13, 2, '#0a0408');
    X.plate(ctx, x - 12, y - 7, 24, 10, '#2a1c26', '#453040', '#120a12', 3);
    X.rect(ctx, x - 12, y - 7, 24, 2, CAS.goldDD);
    const eye = Math.sin(t * 5) > 0 ? CAS.redL : '#4a1020';
    X.rect(ctx, x - 4, y - 5, 8, 3, eye);
    for (let i = 0; i < 3; i++) X.rect(ctx, x - 9 + i * 7, y + 3, 4, 2, '#12080e');
  }
  function roombaX(t) { return ((t * 26) % 620) + 300; }

  /* The bar. Black granite, a gold rail, optics along the back and a man who
     has heard every single one of these stories before, twice. */
  function drawBar(ctx, g, t, cam) {
    const bx = BAR_X - cam;
    if (bx < -110 || bx > VW + 110) return;
    X.plate(ctx, bx - 46, FLOOR - 76, 92, 42, CAS.blackL, '#33222e', CAS.blackD, 3);
    X.rect(ctx, bx - 46, FLOOR - 76, 92, 2, CAS.goldDD);
    X.rect(ctx, bx - 42, FLOOR - 70, 84, 30, '#1d0d16');
    for (let i = 0; i < 10; i++) {                     // the optics, upside down
      const col = ['#8affa0', '#ff8ad8', '#ffb03d', '#7ec8ff'][i % 4];
      X.rect(ctx, bx - 38 + i * 8, FLOOR - 66, 4, 13, col);
      X.rect(ctx, bx - 38 + i * 8, FLOOR - 68, 2, 3, '#c9bce8');
      // there is an eye in every one of them and it is looking at you
      X.rect(ctx, bx - 38 + i * 8, FLOOR - 59, 3, 3, '#ffffff');
      X.rect(ctx, bx - 37 + i * 8 + (Math.sin(t * 2 + i) > 0 ? 1 : 0), FLOOR - 58, 1, 1, '#140f26');
      ctx.globalAlpha = 0.22;
      X.blob(ctx, bx - 36 + i * 8, FLOOR - 59, 5, 8, col);
      ctx.globalAlpha = 1;
    }
    X.rect(ctx, bx - 42, FLOOR - 40, 84, 2, CAS.goldDD);
    // behind the bar, a jellyfish, because it has the reach
    const BK = AH.KIN[Math.max(0, AH.KIN.findIndex(k => k.who === 'WOBBLE'))];
    AH.blit(ctx, AH.S[BK.key], Math.floor(t * 1.3) % 6 === 0 ? 5 : 0,
      bx + 10, FLOOR - 30 + Math.sin(t * 2.2) * 1.5, true);
    // the counter: black stone with a gold foot rail under it
    X.plate(ctx, bx - 48, FLOOR - 32, 96, 32, '#1d1119', '#3a2430', CAS.blackD, 3);
    X.rect(ctx, bx - 48, FLOOR - 32, 96, 3, '#5a3a48');
    X.rect(ctx, bx - 48, FLOOR - 30, 96, 1, CAS.goldD);
    X.rect(ctx, bx - 48, FLOOR - 21, 96, 1, CAS.blackD);
    X.rect(ctx, bx - 46, FLOOR - 8, 92, 2, CAS.goldDD);
    for (let i = 0; i < 3; i++) {                      // taps
      X.rect(ctx, bx - 24 + i * 15, FLOOR - 44, 3, 12, CAS.goldD);
      X.blob(ctx, bx - 23 + i * 15, FLOOR - 45, 3, 3, [CAS.redL, CAS.gold, '#e8e2f4'][i]);
    }
    X.rect(ctx, bx + 26, FLOOR - 42, 10, 10, 'rgba(220,235,255,0.28)');
    X.rect(ctx, bx + 26, FLOOR - 42, 10, 1, '#d8fbff');
    X.blob(ctx, bx + 31, FLOOR - 34, 3, 2, CAS.gold);
    for (const stx of [bx - 36, bx - 14, bx + 8]) {    // stools
      X.rect(ctx, stx - 1, FLOOR - 16, 2, 16, CAS.goldDD);
      X.blob(ctx, stx, FLOOR - 17, 6, 2, CAS.red);
      X.blob(ctx, stx, FLOOR - 18, 6, 1, CAS.redL);
    }
    /* THE HOUSE CAT. Asleep on the end of the counter since the place opened,
       and the only thing in the building that has never lost anything. The
       ears twitch, the tail goes, and once in a while it opens one eye. */
    const kx = bx - 40, ky = FLOOR - 32;
    const wake = (Math.floor(t * 0.4) % 7) === 0;
    X.blob(ctx, kx, ky - 1, 11, 5, '#2e2438');
    X.blob(ctx, kx - 1, ky - 3, 9, 4, '#43364f');
    X.blob(ctx, kx + 8, ky - 4, 5, 5, '#2e2438');              // the head
    X.blob(ctx, kx + 8, ky - 5, 4, 3, '#43364f');
    for (const e of [-1, 1]) {                                  // ears
      const tw = Math.sin(t * 3 + e) > 0.85 ? 1 : 0;
      X.poly(ctx, [[kx + 6 + e * 2, ky - 7 - tw], [kx + 9 + e * 2, ky - 7 - tw],
        [kx + 7.5 + e * 2, ky - 11 - tw]], '#43364f');
    }
    if (wake) {
      X.rect(ctx, kx + 9, ky - 5, 2, 2, '#8affa0');
      X.rect(ctx, kx + 10, ky - 5, 1, 2, '#1a1024');
    } else {
      X.rect(ctx, kx + 7, ky - 5, 4, 1, '#1a1024');
    }
    // the tail, going, whatever the rest of it is doing
    const tl = Math.sin(t * 1.6) * 4;
    X.curve(ctx, kx - 9, ky - 1, kx - 15, ky - 4 + tl, kx - 12, ky - 9 + tl, '#43364f', 2, 6);
    F.draw(ctx, 'BAR', bx, FLOOR - 88, CAS.gold, { center: true, scale: 2, shadow: '#0a0408' });
  }


  /* The three steps, and the floor they lead up to. Drawn before the rope so
     the stanchions stand on them. */
  function drawStep(ctx, g, t, cam) {
    const sx = STEP_X - cam;
    if (sx > VW + 40) return;
    const w = clubW() - STEP_X;
    // the raised floor: the same carpet, a shade richer, with a brass nosing
    X.rect(ctx, sx, SALON_Y, w, VH - SALON_Y, '#101722');
    X.rect(ctx, sx, SALON_Y + 12, w, VH - SALON_Y - 12, '#141d2a');
    X.rect(ctx, sx, SALON_Y + 30, w, VH - SALON_Y - 30, '#18222f');
    for (let x = ((-cam % 36) + 36) % 36 - 36; x < VW + 36; x += 36) {
      if (x + 36 < sx) continue;
      for (let r = 0; r < 3; r++) {
        const cx2 = x + 18 + (r % 2) * 18, cy2 = SALON_Y + 8 + r * 15;
        if (cx2 < sx + 6) continue;
        const rw = 7 + r * 3, rh = 3 + r * 1.2;
        X.poly(ctx, [[cx2, cy2 - rh], [cx2 + rw, cy2], [cx2, cy2 + rh], [cx2 - rw, cy2]], '#0a1018');
        X.poly(ctx, [[cx2, cy2 - rh * 0.45], [cx2 + rw * 0.45, cy2], [cx2, cy2 + rh * 0.45],
          [cx2 - rw * 0.45, cy2]], '#8a4418');
      }
    }
    // three treads coming down to the main floor
    for (let i = 0; i < 3; i++) {
      const y = SALON_Y + i * 5, h = 5;
      X.rect(ctx, sx - 18 + i * 6, y, 20 - i * 6, h, i % 2 ? '#101722' : '#5e0c1e');
      X.rect(ctx, sx - 18 + i * 6, y, 20 - i * 6, 1, CAS.goldDD);
    }
    X.rect(ctx, sx, SALON_Y - 1, w, 2, CAS.blackD);
    X.rect(ctx, sx, SALON_Y + 1, w, 1, CAS.goldDD);
  }

  /* ---------------------------------------------------------------- the rope
     A gold stanchion each side, a length of red velvet between them, and a
     man in front of it whose whole job is the word no. */
  function drawRope(ctx, g, t, cam) {
    const rx = ROPE_X - cam;
    if (rx < -80 || rx > VW + 80) return;
    const open = salonOpen(g);
    // the arch through, with the name of the room over it
    X.plate(ctx, rx - 46, CLUB_CEIL + 2, 14, FLOOR - CLUB_CEIL - 2, CAS.blackL, CAS.goldD, CAS.blackD, 3);
    X.plate(ctx, rx + 32, CLUB_CEIL + 2, 14, FLOOR - CLUB_CEIL - 2, CAS.blackL, CAS.goldD, CAS.blackD, 3);
    X.plate(ctx, rx - 48, CLUB_CEIL - 4, 96, 14, CAS.redD, CAS.gold, CAS.blackD, 4);
    F.draw(ctx, 'SALON', rx, CLUB_CEIL - 1, open ? CAS.gold : '#7a5c16', { center: true, shadow: CAS.blackD });
    for (let i = 0; i < 9; i++) {
      const on = open && (Math.floor(t * 5) + i) % 4 !== 0;
      X.blob(ctx, rx - 40 + i * 10, CLUB_CEIL + 14, 2, 2, on ? CAS.gold : '#4a3a10');
    }
    // the stanchions and the velvet between them
    for (const sx of [rx - 26, rx + 26]) {
      X.rect(ctx, sx - 1, FLOOR - 32, 3, 32, CAS.goldDD);
      X.rect(ctx, sx - 1, FLOOR - 32, 1, 32, CAS.goldD);
      X.blob(ctx, sx, FLOOR - 34, 4, 4, CAS.gold);
      X.blob(ctx, sx, FLOOR, 7, 2, CAS.goldDD);
    }
    if (!open) {
      X.curve(ctx, rx - 26, FLOOR - 32, rx, FLOOR - 20, rx + 26, FLOOR - 32, '#5e0c1e', 4, 10);
      X.curve(ctx, rx - 26, FLOOR - 33, rx, FLOOR - 21, rx + 26, FLOOR - 33, '#9e1730', 2, 10);
      // and him, stood in the gap with his hands behind his back
      AH.blit(ctx, AH.S.bouncer, 0, rx - 6, FLOOR + 1);
      X.blob(ctx, rx - 6, FLOOR + 1, 10, 2, CAS.blackD);
    } else {
      // unclipped: the velvet hangs down one side and the way is open
      X.curve(ctx, rx - 26, FLOOR - 32, rx - 22, FLOOR - 16, rx - 24, FLOOR - 2, '#5e0c1e', 4, 8);
      ctx.globalAlpha = 0.1;
      X.blob(ctx, rx, FLOOR - 40, 34, 40, CAS.gold);
      ctx.globalAlpha = 1;
    }
  }

  /* ------------------------------------------------------------- the dice
     A long sunken table with a diamond wall down the far end for them to come
     off, a stickman with a rake and whatever the last roll was still lying
     where it stopped. */
  const PIP = [[], [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]],
    [[-1, -1], [1, -1], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]];
  function die(ctx, x, y, n, spin) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (spin) ctx.rotate(spin);
    X.plate(ctx, -6, -6, 13, 13, '#f4f0ff', '#ffffff', '#9a92b4', 3);
    for (const [px, py] of PIP[U.clamp(n, 1, 6)]) {
      X.rect(ctx, px * 4 - 1, py * 4 - 1, 3, 3, n === 1 || n === 5 ? '#d63550' : '#1a1024');
    }
    ctx.restore();
  }

  function drawCraps(ctx, g, t, cam) {
    const cx = CRAPS_X - cam, TOP = SALON_Y - 50;
    if (cx < -130 || cx > VW + 130) return;
    // the stickman, behind it with his rake out over the felt
    drawDealer(ctx, cx - 58, t, 2, DICE.live, SALON_Y);
    X.line(ctx, cx - 50, SALON_Y - 52, cx - 10, SALON_Y - 44, CAS.wood, 2);
    X.rect(ctx, cx - 14, SALON_Y - 46, 12, 3, CAS.woodL);
    /* A shallow bed of felt with a padded rail along the near edge and the
       apron under it. The first pass was a tall wooden box with the game
       hidden somewhere on top of it, and all you could see was the box. */
    X.blob(ctx, cx, SALON_Y + 3, 64, 5, '#0a1018');
    X.plate(ctx, cx - 56, TOP + 30, 112, 22, CAS.wood, CAS.woodL, '#160c08', 3);
    X.rect(ctx, cx - 56, TOP + 30, 112, 2, CAS.goldDD);
    X.plate(ctx, cx - 64, TOP, 128, 32, CAS.felt, CAS.feltL, CAS.blackD, 4);
    X.rect(ctx, cx - 60, TOP + 3, 120, 24, '#2e0a14');
    // the diamond wall they have to come off, down the far end
    for (let i = 0; i < 8; i++) X.poly(ctx, [[cx + 26 + i * 5, TOP + 4], [cx + 29 + i * 5, TOP + 8],
      [cx + 26 + i * 5, TOP + 12], [cx + 23 + i * 5, TOP + 8]], '#5e0c1e');
    // the layout painted on it
    X.rect(ctx, cx - 56, TOP + 6, 46, 14, '#3d0e1a');
    F.draw(ctx, 'PASS', cx - 33, TOP + 9, '#a84a5a', { center: true, shadow: false });
    F.draw(ctx, '7 PAYS 3    11 PAYS 5', cx + 4, TOP + 22, '#8a3a4a', { center: true, shadow: false });
    // the rail, and the chips racked along it
    X.plate(ctx, cx - 66, TOP + 26, 132, 7, '#5e0c1e', '#9e1730', CAS.blackD, 3);
    for (let i = 0; i < 7; i++) chipStack(ctx, cx - 52 + i * 17, TOP + 30, 2, i);
    // the dice themselves
    /* They come off the far wall and run back down the felt. Sixteen pixels
       apart and well right of centre, because at eight they read as one white
       blob and at centre the player stands on top of them. */
    if (DICE.live) {
      const q = U.clamp(DICE.t / 1.25, 0, 1);
      const e = 1 - Math.pow(1 - q, 3);
      const bounce = q < 1 ? Math.abs(Math.sin(q * 9)) * (1 - q) * 13 : 0;
      const sp = q < 1 ? (1 - q) * 22 : 0;
      die(ctx, cx + 52 - e * 30, TOP + 13 - bounce, DICE.done ? DICE.a : U.randInt(1, 6), sp);
      die(ctx, cx + 56 - e * 18, TOP + 19 - bounce * 0.7, DICE.done ? DICE.b : U.randInt(1, 6), -sp);
      chipStack(ctx, cx - 33, TOP + 12, 5, 0);
    } else if (DICE.rest > 0) {
      die(ctx, cx + 22, TOP + 13, DICE.a, 0);
      die(ctx, cx + 38, TOP + 19, DICE.b, 0);
      if (DICE.win) {
        ctx.globalAlpha = 0.16 + Math.sin(t * 9) * 0.06;
        X.blob(ctx, cx + 30, TOP + 16, 22, 11, CAS.gold);
        ctx.globalAlpha = 1;
      }
    }
    // and the ones who have been here all night, out at the ends of it
    drawSeated(ctx, cx - 74, t, 4, false, SALON_Y - 2);
    drawSeated(ctx, cx + 76, t, 8, true, SALON_Y - 2);
    F.draw(ctx, 'THE DICE', cx, TOP + 36, '#c2932a', { center: true, shadow: false });
  }

  /* ------------------------------------------------------------- the lounge
     A little stage with a curtain behind it, a spotlight on it, a woman who
     has been singing in this room since before the carpet, and a two-piece
     band who would rather be anywhere else. */
  function drawLounge(ctx, g, t, cam) {
    const sx = STAGE_X - cam, TOP = SALON_Y - 24;
    if (sx < -140 || sx > VW + 140) return;
    // the curtain, floor to ceiling, behind the lot
    for (let i = 0; i < 18; i++) {
      const fx2 = sx - 72 + i * 8;
      X.rect(ctx, fx2, CLUB_CEIL + 12, 8, TOP - CLUB_CEIL - 4, i % 2 ? '#5e0c1e' : '#141d2a');
      X.rect(ctx, fx2, CLUB_CEIL + 12, 2, TOP - CLUB_CEIL - 4, '#9e1730');
    }
    X.rect(ctx, sx - 72, CLUB_CEIL + 10, 144, 5, CAS.goldDD);
    X.rect(ctx, sx - 72, CLUB_CEIL + 10, 144, 1, CAS.gold);
    // the boards
    X.plate(ctx, sx - 66, TOP, 132, 26, CAS.wood, CAS.woodL, '#160c08', 3);
    X.rect(ctx, sx - 66, TOP, 132, 2, CAS.goldDD);
    for (let i = 0; i < 13; i++) {
      const on = (Math.floor(t * 5) + i) % 5 !== 0;
      X.blob(ctx, sx - 60 + i * 10, TOP + 21, 2, 2, on ? CAS.gold : '#4a3a10');
    }
    // the spot on her, from somewhere out of shot
    ctx.globalAlpha = 0.12 + (S.clap > 0 ? 0.05 : 0);
    X.poly(ctx, [[sx - 6, CLUB_CEIL + 14], [sx + 8, CLUB_CEIL + 14],
      [sx + 26, TOP + 2], [sx - 24, TOP + 2]], '#ffe9a8');
    ctx.globalAlpha = 1;
    // the band: a bass on one side, a horn on the other
    const sway = Math.sin(t * 2.1) * 1.4;
    drawSeated(ctx, sx - 50, t, 5, false, TOP + 2);
    // a double bass: a body with a waist in it, a neck, a scroll and four strings
    X.blob(ctx, sx - 36, TOP - 6, 9, 10, '#7a4a20');
    X.blob(ctx, sx - 36, TOP - 18, 7, 8, '#7a4a20');
    X.blob(ctx, sx - 36, TOP - 6, 6, 7, '#5e3416');
    X.rect(ctx, sx - 40, TOP - 12, 2, 5, '#3a1e0c');
    X.rect(ctx, sx - 33, TOP - 12, 2, 5, '#3a1e0c');
    X.rect(ctx, sx - 37, TOP - 40, 3, 22, '#3a1e0c');
    X.blob(ctx, sx - 36, TOP - 42, 3, 3, '#5e3416');
    for (let i = 0; i < 4; i++) X.rect(ctx, sx - 38 + i, TOP - 38, 1, 34, '#d8cfb4');
    drawSeated(ctx, sx + 46, t, 18, true, TOP + 2);
    X.line(ctx, sx + 38, TOP - 18, sx + 26, TOP - 24, CAS.goldD, 3);
    X.poly(ctx, [[sx + 26, TOP - 28], [sx + 26, TOP - 20], [sx + 16, TOP - 16], [sx + 16, TOP - 32]], CAS.gold);
    // and her, at the microphone: the bunny, who will get up for this and nothing else
    const K = AH.KIN[Math.max(0, AH.KIN.findIndex(k => k.who === 'MOCHI'))];
    kinBreath(ctx, K, S.clap > 0 ? 6 : ((Math.floor(t * 2.4) % 4) === 0 ? 3 : 0),
      sx + sway, TOP + 3, false);
    X.rect(ctx, sx + 12, TOP - 18, 2, 21, CAS.goldDD);
    X.blob(ctx, sx + 13, TOP - 20, 3, 4, '#3a3348');
    X.blob(ctx, sx + 13, TOP - 21, 2, 2, '#8e86a8');
    // the number on the board at the side of the stage
    X.plate(ctx, sx - 82, TOP - 38, 52, 22, CAS.blackL, CAS.goldD, CAS.blackD, 3);
    const sg = SONGS[U.clamp(S.songI, 0, SONGS.length - 1)];
    F.draw(ctx, 'TONIGHT', sx - 56, TOP - 34, '#8a6a3a', { center: true, shadow: false });
    F.draw(ctx, S.songI >= 0 ? sg.name.split(' ')[0] : 'ASK HER', sx - 56, TOP - 25, CAS.gold,
      { center: true, shadow: false });
    F.draw(ctx, 'THE LOUNGE', sx, CLUB_CEIL + 16, CAS.gold, { center: true, scale: 2, shadow: CAS.blackD });
  }

  /* ----------------------------------------------------------- the baccarat
     The quietest table in the building. A shoe, two cards a side, and a woman
     who has never once looked surprised. */
  function drawBacc(ctx, g, t, cam) {
    const bx = BACC_X - cam, TOP = SALON_Y - 48;
    if (bx < -130 || bx > VW + 130) return;
    drawDealer(ctx, bx, t, 1, BACC.live && BACC.t < 1.2, SALON_Y);
    X.blob(ctx, bx, SALON_Y + 3, 58, 5, '#0a1018');
    X.plate(ctx, bx - 20, TOP + 28, 40, 20, CAS.wood, CAS.woodL, '#160c08', 3);
    // a long shallow kidney of felt, in a padded rim with gold studs round it
    X.rect(ctx, bx - 58, TOP + 16, 116, 14, '#3d0812');
    X.blob(ctx, bx, TOP + 28, 58, 10, '#3d0812');
    X.blob(ctx, bx, TOP + 16, 58, 14, '#8a1228');
    X.blob(ctx, bx, TOP + 15, 58, 13, CAS.redL);
    X.blob(ctx, bx, TOP + 16, 51, 11, CAS.felt);
    X.blob(ctx, bx, TOP + 15, 51, 10, CAS.feltL);
    for (let i = 0; i < 17; i++) {
      const a = i / 16 * Math.PI;
      X.rect(ctx, bx - Math.cos(a) * 54, TOP + 15 + Math.sin(a) * 13, 2, 2, CAS.goldD);
    }
    // the two boxes painted on the felt
    for (let i = 0; i < 2; i++) {
      const px = bx - 26 + i * 30;
      X.rect(ctx, px - 13, TOP + 11, 26, 11, '#2e0a14');
      X.rect(ctx, px - 13, TOP + 11, 26, 1, '#6a1428');
      F.draw(ctx, i ? 'BANK' : 'YOU', px, TOP + 13, i ? '#a84a5a' : '#c2932a', { center: true, shadow: false });
    }
    // the shoe at her elbow
    X.plate(ctx, bx + 40, TOP + 2, 18, 12, CAS.blackL, '#44303e', CAS.blackD, 2);
    X.rect(ctx, bx + 43, TOP - 1, 12, 4, CAS.redD);
    if (BACC.live) {
      const q = BACC.t, up = q > 1.9;
      const at = [[-30, 0.25], [30, 0.5], [-38, 0.75], [38, 1.0]];
      for (let i = 0; i < 4; i++) {
        if (q < at[i][1]) continue;
        const mine = i % 2 === 0;
        const c = mine ? BACC.you[i >> 1] : BACC.dlr[i >> 1];
        const su = mine ? BACC.ys[i >> 1] : BACC.ds[i >> 1];
        const sl = U.clamp((q - at[i][1]) / 0.2, 0, 1);
        cardAt(ctx, bx + 44 - (44 - at[i][0]) * sl, TOP + 8 + sl * 6,
          RANKS[c], su, up, (i % 2 ? 0.1 : -0.1) + (i > 1 ? 0.2 : 0));
      }
      chipStack(ctx, bx - 44, TOP + 20, 5, 0);
      if (up) {
        F.draw(ctx, String(BACC.yt), bx - 26, TOP - 8, BACC.win ? CAS.gold : '#9a92b4',
          { center: true, scale: 2, shadow: CAS.blackD });
        F.draw(ctx, String(BACC.dt), bx + 30, TOP - 8, BACC.win ? '#9a92b4' : CAS.gold,
          { center: true, scale: 2, shadow: CAS.blackD });
        if (BACC.win) {
          ctx.globalAlpha = 0.16 + Math.sin(t * 9) * 0.06;
          X.blob(ctx, bx - 26, TOP + 14, 26, 12, CAS.gold);
          ctx.globalAlpha = 1;
        }
      }
    }
    drawSeated(ctx, bx - 78, t, 19, false, SALON_Y - 2);
    drawSeated(ctx, bx + 78, t, 7, true, SALON_Y - 2);
    F.draw(ctx, 'BACCARAT', bx, TOP + 33, '#c2932a', { center: true, shadow: false });
  }


  /* ================================================================ THE BUILDING
     The casino is four floors now.

     They do not stack on screen -- the home renderer paints into a fixed
     480x270 buffer with a horizontal camera and no vertical one, so four
     hundred-pixel storeys will not fit in it and bolting a Y camera on would
     have broken the prompt, the speech bubbles, the touch mapping and the
     floaters all at once. So each floor is drawn in the same band, and what
     sells the building is THE ATRIUM: a hole through the middle of it with
     the rails of the other three floors receding above and below, the lift
     car running up the shaft, and people leaning over to watch you lose.

     LIFT is at the same place on every floor, because in a real casino it is
     the one thing they want you to be able to find. */
  const CDECKS = [
    { key: 'floor', name: 'THE FLOOR', sub: 'TABLES, CAGE AND THE SALON', w: 2260 },
    { key: 'arcade', name: 'THE ARCADE', sub: 'MACHINES, DUCKS AND TELEVISION', w: 1520 },
    { key: 'menagerie', name: 'THE MENAGERIE', sub: 'PLANTS, JARS AND THE LOAN DESK', w: 1420 },
    { key: 'crown', name: 'THE CROWN', sub: 'THE MEGA PLANET MACHINE', w: 1560 }
  ];
  const LIFT_X = 150;                // the same on all four, deliberately
  const ATRIUM_X = 430, ATRIUM_W = 150;
  function atriumX() { return cdeck() === 0 ? 268 : ATRIUM_X; }
  function atriumW() { return cdeck() === 0 ? 60 : ATRIUM_W; }
  const LIFT = { panel: null, sel: 0, car: 0, carTo: 0 };

  function cdeck() { return S.cdeck | 0; }
  function clubW() { return CDECKS[cdeck()].w; }

  function openLift(g) { LIFT.panel = 1; LIFT.sel = cdeck(); UI.mode = 'lift'; A.sfx.click(); }
  function closeLift() { LIFT.panel = null; UI.mode = null; P.lock = 0.2; A.sfx.click(); }

  function rideLift(g, d) {
    if (d === cdeck()) { closeLift(); return; }
    closeLift();
    P.lock = 1;
    LIFT.carTo = d;
    A.sfx.tone(140, { type: 'sine', to: 640, dur: 0.5, vol: 0.09 });
    A.sfx.tone(880, { type: 'triangle', dur: 0.12, vol: 0.06, delay: 0.62 });
    g.wipeTo(240, 135, '#1d1018', () => {
      S.cdeck = d;
      LIFT.car = d;
      place(g, LIFT_X + 42);
      say(CDECKS[d].name + '. ' + CDECKS[d].sub + '.');
      if (!g.save.seen['deck' + d]) {
        g.save.seen['deck' + d] = 1;
        g.save.thots = (g.save.thots || 0) + 30;
        FX.text(P.x, P.y - 52, '+30 THOTS', '#4cff9a', 1);
        g.saveGame();
      }
    }, 'bars', 0.6);
  }

  function updateLiftPanel(dt, g) {
    const IN = PD.input, m = IN.mouse;
    if (IN.hit('esc') || IN.hit('KeyE')) { closeLift(); return; }
    if (IN.hit('up')) LIFT.sel = Math.min(3, LIFT.sel + 1);
    if (IN.hit('down')) LIFT.sel = Math.max(0, LIFT.sel - 1);
    for (let d = 0; d < 4; d++) {
      const y = 186 - d * 32;
      if (m.inside && m.x > 138 && m.x < 342 && m.y > y && m.y < y + 26) {
        LIFT.sel = d;
        if (m.leftPressed) { rideLift(g, d); return; }
      }
    }
    if (IN.hit('enter') || IN.hit('space')) rideLift(g, LIFT.sel);
  }

  function drawLiftPanel(ctx, g, t) {
    ctx.fillStyle = 'rgba(8,4,10,0.84)'; ctx.fillRect(0, 0, VW, VH);
    X.plate(ctx, 126, 40, 228, 190, CAS.blackL, CAS.goldD, CAS.blackD, 6);
    X.rect(ctx, 126, 40, 228, 3, CAS.gold);
    F.draw(ctx, 'THE LIFT', 240, 50, CAS.gold, { center: true, scale: 2, shadow: CAS.blackD });
    for (let d = 3; d >= 0; d--) {
      const y = 186 - d * 32, here = d === cdeck(), on = d === LIFT.sel;
      X.plate(ctx, 138, y, 204, 26, here ? '#2a1a12' : (on ? CAS.redD : '#1a0f16'),
        here ? CAS.goldD : (on ? CAS.gold : '#3a2630'), CAS.blackD, 4);
      // the floor number, in a little brass plate
      X.plate(ctx, 143, y + 4, 18, 18, CAS.goldDD, CAS.goldD, '#2a1c06', 3);
      F.draw(ctx, String(d), 152, y + 9, here ? CAS.gold : '#2a1c06', { center: true, shadow: false });
      F.draw(ctx, CDECKS[d].name, 170, y + 4, here ? CAS.gold : (on ? '#ffffff' : '#8a6a78'), { shadow: false });
      F.draw(ctx, here ? 'YOU ARE HERE' : CDECKS[d].sub, 170, y + 14,
        here ? '#c2932a' : (on ? '#c08090' : '#5a3e4a'), { shadow: false });
      if (on && Math.abs(Math.sin(t * 4)) > 0.4) X.rect(ctx, 138, y + 25, 204, 1, CAS.gold);
    }
    F.draw(ctx, 'PICK A FLOOR   -   ESC TO STAY', 240, 219, '#7a5a66', { center: true, shadow: false });
  }

  /* --------------------------------------------------------------- the shaft
     Drawn on every floor at the same x, with the car where it actually is and
     a row of brass lamps saying which floor that is. */
  function drawLift(ctx, g, t, cam) {
    const lx = LIFT_X - cam;
    if (lx < -70 || lx > VW + 70) return;
    const F0 = FLOOR;
    LIFT.car = U.damp(LIFT.car, cdeck(), 0.2, 1 / 60);
    // the shaft, going up out of shot and down out of shot
    X.rect(ctx, lx - 30, CLUB_CEIL, 60, F0 - CLUB_CEIL, '#0d060c');
    X.plate(ctx, lx - 32, CLUB_CEIL, 8, F0 - CLUB_CEIL, CAS.blackL, CAS.goldD, CAS.blackD, 3);
    X.plate(ctx, lx + 24, CLUB_CEIL, 8, F0 - CLUB_CEIL, CAS.blackL, CAS.goldD, CAS.blackD, 3);
    for (let y = CLUB_CEIL + 6; y < F0 - 6; y += 10) {
      X.rect(ctx, lx - 24, y, 48, 2, '#1d1018');
      X.rect(ctx, lx - 24, y, 48, 1, '#2e1c28');
    }
    // the car: open gates, a light inside, a bench
    const cy = F0 - 4;
    X.plate(ctx, lx - 26, cy - 62, 52, 62, '#2a1a24', CAS.goldD, CAS.blackD, 4);
    X.rect(ctx, lx - 22, cy - 58, 44, 54, '#3a2230');
    ctx.globalAlpha = 0.16;
    X.blob(ctx, lx, cy - 40, 22, 26, CAS.gold);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) X.rect(ctx, lx - 20 + i * 10, cy - 58, 2, 54, CAS.goldDD);
    X.rect(ctx, lx - 26, cy - 62, 52, 3, CAS.goldD);
    X.rect(ctx, lx - 26, cy - 8, 52, 3, CAS.goldDD);
    // the indicator over the doors, with the floor it is on lit
    X.plate(ctx, lx - 22, cy - 76, 44, 12, CAS.blackD, CAS.goldDD, '#000000', 3);
    for (let d = 0; d < 4; d++) {
      const on = d === cdeck();
      X.blob(ctx, lx - 15 + d * 10, cy - 70, 3, 3, on ? CAS.gold : '#3a2a10');
      if (on) {
        ctx.globalAlpha = 0.2;
        X.blob(ctx, lx - 15 + d * 10, cy - 70, 7, 7, CAS.gold);
        ctx.globalAlpha = 1;
      }
    }
    F.draw(ctx, 'LIFT', lx, cy - 90, CAS.gold, { center: true, shadow: CAS.blackD });
    F.draw(ctx, CDECKS[cdeck()].name, lx, cy - 80, '#8a6a3a', { center: true, shadow: false });
  }

  /* --------------------------------------------------------------- the atrium
     The hole through the middle of the building. This is the whole illusion:
     from any floor you can see the underside of the one above, the rails of
     the ones below, and the people leaning over them watching you. */
  function drawAtrium(ctx, g, t, cam) {
    const ax = atriumX() - cam, W = atriumW();
    if (ax + W < -20 || ax > VW + 20) return;
    const d = cdeck();
    // the void: dark, and darker the further down it goes
    X.rect(ctx, ax, CLUB_CEIL, W, FLOOR - CLUB_CEIL, '#0a0409');

    /* THE FAR SIDE OF THE WELL. Without it the atrium was a black rectangle
       cut out of a good room. Now it is the other side of the building: three
       tiers of balcony going away from you with the lights on, people at every
       rail, a banner hung down the whole height of it and the floor numbers
       picked out in neon. */
    if (W > 90) {
      X.rect(ctx, ax + 10, CLUB_CEIL + 6, W - 20, FLOOR - CLUB_CEIL - 18, '#1a0a12');
      for (let i = 0; i * 26 < W - 20; i++) X.rect(ctx, ax + 12 + i * 26, CLUB_CEIL + 6, 3, FLOOR - CLUB_CEIL - 18, '#2a1020');
      for (let tier = 0; tier < 3; tier++) {
        const y = CLUB_CEIL + 34 + tier * 26;
        if (y > FLOOR - 30) break;
        // the lit band of the floor behind the rail
        X.rect(ctx, ax + 12, y - 15, W - 24, 15, '#2e1020');
        ctx.globalAlpha = 0.5;
        X.rect(ctx, ax + 12, y - 15, W - 24, 6, '#6a1a2a');
        ctx.globalAlpha = 1;
        // whoever is at that rail, small and dim, because they are a long way off
        for (let i = 0; i < 3; i++) {
          const hx = ax + 26 + i * 38 + Math.sin(t * 0.3 + i * 2 + tier) * 2;
          if (hx > ax + W - 16) break;
          const K = AH.KIN[(tier * 7 + i * 5) % AH.KIN.length];
          ctx.globalAlpha = 0.46;
          kinBreath(ctx, K, (Math.floor(t * 0.8 + i) % 11) === 0 ? 5 : 0, hx, y + 1, i % 2 === 0);
          ctx.globalAlpha = 1;
        }
        X.rect(ctx, ax + 12, y, W - 24, 5, '#0a1018');
        X.rect(ctx, ax + 12, y, W - 24, 1, CAS.goldDD);
        for (let i = 0; i * 12 < W - 24; i++) X.rect(ctx, ax + 14 + i * 12, y - 5, 1, 5, '#4a3a10');
        // the floor number, in neon, on the far wall
        const nn = 3 - tier;
        const glow = (Math.floor(t * 5) + tier) % 17 !== 0;
        F.draw(ctx, String(nn), ax + W - 20, y - 12, glow ? '#ff5fa8' : '#5a2038', { center: true, shadow: false });
      }
      // the banner, hung down the full height of the well
      const bx0 = ax + 18;
      X.rect(ctx, bx0 - 7, CLUB_CEIL + 8, 15, FLOOR - CLUB_CEIL - 30, '#7a1024');
      X.rect(ctx, bx0 - 7, CLUB_CEIL + 8, 3, FLOOR - CLUB_CEIL - 30, '#9e1730');
      X.rect(ctx, bx0 - 7, CLUB_CEIL + 8, 15, 2, CAS.goldD);
      const word = 'CROWN';
      for (let i = 0; i < word.length; i++) F.draw(ctx, word[i], bx0, CLUB_CEIL + 16 + i * 11, CAS.gold, { center: true, shadow: false });
      for (let i = 0; i < 4; i++) X.poly(ctx, [[bx0 - 7 + i * 4, FLOOR - 22], [bx0 - 3 + i * 4, FLOOR - 22], [bx0 - 5 + i * 4, FLOOR - 16]], '#5e0c1e');
    }
    // the floors ABOVE, seen as undersides receding into the ceiling
    for (let u = 1; u <= 3 - d; u++) {
      const y = CLUB_CEIL + 20 - u * 9, inset = u * 9;
      X.rect(ctx, ax + inset, y, W - inset * 2, 7, '#1a0f16');
      X.rect(ctx, ax + inset, y, W - inset * 2, 2, CAS.goldDD);
      X.rect(ctx, ax + inset, y + 6, W - inset * 2, 1, '#0d060c');
      // a rail, and somebody leaning on it
      for (let i = 0; i * 14 + 6 < W - inset * 2; i++) X.rect(ctx, ax + inset + 6 + i * 14, y - 6, 1, 6, CAS.goldDD);
      X.rect(ctx, ax + inset + 4, y - 7, W - inset * 2 - 8, 2, CAS.goldD);
      const n = W > 100 ? 2 + (u % 2) : 1;
      for (let i = 0; i < n; i++) {
        const hx = ax + inset + 24 + i * 44 + Math.sin(t * 0.4 + i + u) * 3;
        const K = AH.KIN[(u * 5 + i * 3) % AH.KIN.length];
        ctx.globalAlpha = 0.55 - u * 0.1;
        kinBreath(ctx, K, (Math.floor(t + i) % 9) === 0 ? 5 : 0, hx, y - 5, i % 2 === 0);
        ctx.globalAlpha = 1;
      }
    }
    // the floors BELOW, seen over the rail you are standing at
    for (let u = 1; u <= d; u++) {
      const y = FLOOR - 4 + u * 10, inset = u * 8;
      ctx.globalAlpha = 0.85 - u * 0.2;
      X.rect(ctx, ax + inset, y, W - inset * 2, 8, '#0a1018');
      X.rect(ctx, ax + inset, y, W - inset * 2, 2, '#101722');
      for (let i = 0; i * 18 + 14 < W - inset * 2; i++) {
        X.blob(ctx, ax + inset + 14 + i * 18, y + 4, 3, 2, '#1a0f16');
      }
      ctx.globalAlpha = 1;
    }
    // the great chandelier, hanging the whole height of the building
    const gx = ax + W / 2;
    X.rect(ctx, gx - 1, CLUB_CEIL, 3, 30 - d * 4, CAS.goldDD);
    const gy = CLUB_CEIL + 32 - d * 4 + Math.sin(t * 0.5) * 1;
    for (let r = 0; r < 3; r++) {
      const rr = 26 - r * 8;
      X.ring(ctx, gx, gy + r * 9, rr, CAS.goldD, 2);
      for (let i = 0; i < 10 - r * 2; i++) {
        const a = i / (10 - r * 2) * U.TAU + t * 0.06;
        const on = (Math.floor(t * 3) + i + r) % 8 !== 0;
        X.rect(ctx, gx + Math.cos(a) * rr - 1, gy + r * 9 - 5, 3, 6, on ? '#ffe9a8' : '#5a4418');
        X.blob(ctx, gx + Math.cos(a) * rr, gy + r * 9 - 6, 2, 2, on ? '#fff3b0' : '#6a5a2a');
      }
    }
    for (let i = 0; i < 11 && gx - 22 + i * 4 < ax + W - 4; i++) X.rect(ctx, gx - 22 + i * 4, gy + 20, 1, 4 + (i % 4) * 4, '#d8cfb4');
    X.blob(ctx, gx, gy + 26, 5, 5, CAS.gold);
    ctx.globalAlpha = 0.09;
    X.blob(ctx, gx, gy + 30, 60, 48, CAS.gold);
    ctx.globalAlpha = 1;
    /* And somebody on YOUR side of it, leaning right over and looking at the
       drop, the way people do at a stairwell they have no business at. */
    if (W > 90) {
      const lx = ax + W - 34, K = AH.KIN[(11 + d * 3) % AH.KIN.length];
      kinShadow(ctx, lx, FLOOR, K);
      kinBreath(ctx, K, (Math.floor(t * 0.6) % 8) === 0 ? 5 : 0,
        lx, FLOOR + Math.sin(t * 1.1) * 0.8, true);
    }
    // the rail you are standing at, in front of the lot
    X.rect(ctx, ax, FLOOR - 26, W, 3, CAS.goldD);
    X.rect(ctx, ax, FLOOR - 23, W, 1, CAS.goldDD);
    for (let i = 0; i * 14 + 8 < W; i++) {
      X.rect(ctx, ax + 6 + i * 14, FLOOR - 23, 2, 23, CAS.goldDD);
      X.blob(ctx, ax + 7 + i * 14, FLOOR - 25, 2, 2, CAS.gold);
    }
    X.rect(ctx, ax, FLOOR - 4, W, 4, CAS.blackL);
    F.draw(ctx, 'FLOOR ' + d, ax + W / 2, FLOOR - 36, '#8a6a3a', { center: true, shadow: CAS.blackD });
    // a smaller chandelier wants a smaller ring of light under it
    if (W < 100) { X.rect(ctx, ax - 2, CLUB_CEIL, 2, FLOOR - CLUB_CEIL, CAS.blackL);
      X.rect(ctx, ax + W, CLUB_CEIL, 2, FLOOR - CLUB_CEIL, CAS.blackL); }
  }


  /* ============================================================== THE DECORATION
     The things that are screwed to the walls and standing in the corners of
     this building. Several of them are the SPECIES sprites at prop size,
     which is the whole reason it was worth building a lava lamp and a brain
     in a jar as proper characters: they work as furniture too. */

  /* A lava lamp on a shelf. The wax rises on its own clock, not the frame's. */
  function propLamp(ctx, x, y, t, k) {
    const q = (t * 0.22 + k * 0.37) % 1;
    X.plate(ctx, x - 7, y - 6, 15, 7, CAS.goldDD, CAS.goldD, '#2a1c06', 2);
    X.plate(ctx, x - 5, y - 40, 11, 5, CAS.goldDD, CAS.goldD, '#2a1c06', 2);
    for (let i = 0; i < 30; i++) {
      const w = 3 + (i / 30) * 4;
      X.rect(ctx, x - w, y - 36 + i, w * 2, 1, '#3a1a4a');
    }
    const HUE = ['#ff6a2a', '#ff2f8a', '#3fd8b0', '#ffd34d'][k % 4];
    for (let i = 0; i < 3; i++) {
      const by = y - 8 - ((q + i * 0.33) % 1) * 28;
      const r = 3 + Math.sin((q + i * 0.33) * 6) * 1.2;
      X.blob(ctx, x, by, r, r + 1, HUE);
    }
    ctx.globalAlpha = 0.14;
    X.blob(ctx, x, y - 20, 16, 22, HUE);
    ctx.globalAlpha = 1;
  }

  /* A brain in a jar on a shelf, bubbling. */
  function propJar(ctx, x, y, t, k) {
    const bob = Math.sin(t * 1.1 + k) * 1;
    X.plate(ctx, x - 11, y - 34 + bob, 23, 34, '#4a9ab0', '#9fd8e8', '#1a4a5c', 6);
    X.plate(ctx, x - 13, y - 40 + bob, 27, 7, CAS.goldDD, CAS.goldD, '#2a1c06', 3);
    X.blob(ctx, x, y - 18 + bob, 8, 7, '#ff9ecb');
    for (let i = 0; i < 4; i++) X.blob(ctx, x - 4 + (i % 3) * 4, y - 21 + bob + (i % 2) * 4, 2, 2, '#c4557f');
    X.rect(ctx, x - 3, y - 20 + bob, 2, 2, '#f6f8ff');
    X.rect(ctx, x + 2, y - 20 + bob, 2, 2, '#f6f8ff');
    for (let i = 0; i < 3; i++) {
      const q = ((t * 0.7 + i * 0.3 + k) % 1);
      X.blob(ctx, x - 5 + i * 5, y - 6 + bob - q * 24, 1 + (i % 2), 1 + (i % 2), '#dff4fa');
    }
    X.rect(ctx, x - 9, y - 32 + bob, 3, 26, 'rgba(255,255,255,0.18)');
  }

  /* A television, showing whatever this room's television shows. */
  function propTV(ctx, x, y, t, k) {
    X.plate(ctx, x - 16, y - 26, 33, 26, '#8a6a4a', '#b08a5e', '#4a3420', 4);
    X.rect(ctx, x - 13, y - 23, 22, 19, '#0f2a30');
    const CH = k % 5;
    if (CH === 0) {                       // the racing
      for (let i = 0; i < 4; i++) X.rect(ctx, x - 12 + ((t * 26 + i * 9) % 22), y - 18 + i * 4, 4, 2, ['#ffd34d', '#d63550', '#6fe8d8', '#f4f0ff'][i]);
    } else if (CH === 1) {                // a face, talking
      X.blob(ctx, x - 2, y - 13, 6, 6, '#6fe8d8');
      X.rect(ctx, x - 4, y - 15, 2, 2, '#0f2a30'); X.rect(ctx, x, y - 15, 2, 2, '#0f2a30');
      X.rect(ctx, x - 3, y - 10, 5, Math.floor(t * 7) % 2 ? 3 : 1, '#0f2a30');
    } else if (CH === 2) {                // static
      for (let i = 0; i < 26; i++) X.rect(ctx, x - 13 + U.rand(0, 22), y - 23 + U.rand(0, 19), 2, 1, U.chance(0.5) ? '#6a8a90' : '#183038');
    } else if (CH === 3) {                // the wheel, on a loop
      X.ring(ctx, x - 2, y - 13, 7, '#ffd34d', 2);
      const a = t * 3 + k;
      X.rect(ctx, x - 2 + Math.cos(a) * 7, y - 13 + Math.sin(a) * 7, 2, 2, '#f4f0ff');
    } else {                               // a number going up, which is a lie
      F.draw(ctx, U.fmt(1000 + Math.floor(t * 130 + k * 700) % 90000), x - 2, y - 16, '#ffd34d', { center: true, shadow: false });
    }
    for (let sy = y - 23; sy < y - 4; sy += 3) X.rect(ctx, x - 13, sy, 22, 1, 'rgba(10,30,36,0.5)');
    X.disc(ctx, x + 13, y - 19, 2, '#4a3420');
    X.disc(ctx, x + 13, y - 12, 2, '#4a3420');
  }

  /* A poster. Nothing on any of them is a real thing. */
  const CAS_POSTERS = [
    ['THE', 'PLUMBER', '#d63550', '#ffd34d'], ['SPARKS', 'LIVE', '#ffd34d', '#2f6ae0'],
    ['NINE', 'HEARTS', '#ff5fa8', '#f4f0ff'], ['DUCKY', 'RETURNS', '#ffd84a', '#ff8a1e'],
    ['MOON', 'DUST', '#6fe8d8', '#c9a0ff'], ['THE', 'BIG ONE', '#f4f0ff', '#d63550'],
    ['NO', 'REFUNDS', '#c2932a', '#9e1730'], ['UNIT', 'TWELVE', '#a8b0c0', '#e8402a']
  ];
  function propPoster(ctx, x, y, k) {
    const P2 = CAS_POSTERS[k % CAS_POSTERS.length];
    X.plate(ctx, x - 15, y - 42, 31, 42, CAS.goldDD, CAS.goldD, '#2a1c06', 3);
    X.rect(ctx, x - 12, y - 39, 25, 36, '#1a0f16');
    X.rect(ctx, x - 12, y - 39, 25, 14, P2[3]);
    X.blob(ctx, x, y - 30, 8, 7, P2[2]);
    X.rect(ctx, x - 4, y - 32, 2, 2, '#1a0f16'); X.rect(ctx, x + 1, y - 32, 2, 2, '#1a0f16');
    F.draw(ctx, P2[0], x, y - 22, P2[2], { center: true, shadow: false });
    F.draw(ctx, P2[1], x, y - 13, '#f4f0ff', { center: true, shadow: false });
    X.rect(ctx, x - 10, y - 7, 21, 1, P2[2]);
  }

  /* ================================================================ FLOOR ONE
     THE ARCADE. Where the money that is too small for the tables goes: a rank
     of machines, a claw full of ducks, a wall of televisions nobody watches,
     and a prize counter with things on it that cost more than they are. */
  const CAB = ['STAR', 'DIG', 'WORM', 'BLAST', 'TANK', 'FROG', 'PIPE', 'RALLY'];
  function drawArcadeCab(ctx, x, t, k) {
    const B = FLOOR;
    const HUE = ['#ff2f8a', '#6fe8d8', '#ffd34d', '#8dff5a', '#c9a0ff', '#ff8a1e'][k % 6];
    X.blob(ctx, x, B + 2, 15, 3, '#0a1018');
    X.plate(ctx, x - 14, B - 62, 29, 62, CAS.blackL, '#3e2a38', CAS.blackD, 4);
    X.rect(ctx, x - 14, B - 62, 29, 3, HUE);
    // the marquee
    X.plate(ctx, x - 15, B - 70, 31, 10, '#1a0f16', HUE, CAS.blackD, 3);
    F.draw(ctx, CAB[k % CAB.length], x, B - 67, HUE, { center: true, shadow: false });
    // the screen, with something happening on it
    X.rect(ctx, x - 11, B - 56, 23, 20, '#0d0a14');
    for (let i = 0; i < 5; i++) {
      const q = ((t * 0.7 + i * 0.2 + k) % 1);
      X.rect(ctx, x - 9 + ((i * 7 + k * 3) % 18), B - 54 + q * 16, 3, 3, HUE);
    }
    X.rect(ctx, x - 9, B - 40, 19, 2, HUE);
    for (let sy = B - 56; sy < B - 36; sy += 3) X.rect(ctx, x - 11, sy, 23, 1, 'rgba(0,0,0,0.35)');
    // the controls: a stick and three buttons
    X.plate(ctx, x - 13, B - 34, 27, 8, '#2e1c28', '#463040', CAS.blackD, 2);
    X.rect(ctx, x - 8, B - 38, 2, 5, '#8e86a8');
    X.blob(ctx, x - 7, B - 39, 3, 3, '#d63550');
    for (let i = 0; i < 3; i++) X.blob(ctx, x - 1 + i * 5, B - 32, 2, 2, ['#ffd34d', '#6fe8d8', '#8dff5a'][i]);
    X.rect(ctx, x - 12, B - 24, 25, 24, '#1a0f16');
    F.draw(ctx, '$', x, B - 20, HUE, { center: true, shadow: false });
    ctx.globalAlpha = 0.1;
    X.blob(ctx, x, B - 46, 18, 22, HUE);
    ctx.globalAlpha = 1;
  }

  function drawArcade(ctx, g, t, cam) {
    // the machines
    for (let i = 0; i < 6; i++) {
      const x = 202 + i * 34 - cam;
      if (x > -30 && x < VW + 30) drawArcadeCab(ctx, x, t, i);
    }
    for (let i = 0; i < 5; i++) {
      const x = 1270 + i * 34 - cam;
      if (x > -30 && x < VW + 30) drawArcadeCab(ctx, x, t, i + 3);
    }
    // THE CLAW: a glass box of rubber ducks with a grab hanging over them
    const cx = CLAW_X - cam;
    if (cx > -80 && cx < VW + 80) {
      X.blob(ctx, cx, FLOOR + 3, 30, 4, '#0a1018');
      X.plate(ctx, cx - 28, FLOOR - 34, 57, 34, CAS.blackL, '#3e2a38', CAS.blackD, 4);
      X.plate(ctx, cx - 30, FLOOR - 92, 61, 60, '#9fd8e8', '#dff4fa', '#4a7a90', 5);
      X.rect(ctx, cx - 26, FLOOR - 88, 53, 52, 'rgba(60,140,170,0.35)');
      // the ducks, heaped
      for (let i = 0; i < 16; i++) {
        const dx = cx - 22 + (i % 6) * 8 + ((i / 6) | 0) * 3;
        const dy = FLOOR - 42 - ((i / 6) | 0) * 7;
        X.blob(ctx, dx, dy, 5, 4, '#ffd84a');
        X.blob(ctx, dx - 2, dy - 3, 3, 3, '#ffd84a');
        X.rect(ctx, dx - 5, dy - 3, 3, 2, '#ff8a1e');
        X.rect(ctx, dx - 3, dy - 4, 1, 1, '#1a1008');
      }
      // the claw itself, tracking side to side and never going down
      const gx = cx + Math.sin(t * 0.7) * 18;
      X.rect(ctx, cx - 26, FLOOR - 86, 53, 3, '#5a6274');
      X.rect(ctx, gx - 1, FLOOR - 83, 3, 14, '#8e96a8');
      X.poly(ctx, [[gx - 6, FLOOR - 69], [gx + 1, FLOOR - 69], [gx - 2, FLOOR - 60]], '#c0c8d8');
      X.poly(ctx, [[gx, FLOOR - 69], [gx + 7, FLOOR - 69], [gx + 4, FLOOR - 60]], '#c0c8d8');
      X.plate(ctx, cx - 30, FLOOR - 104, 61, 13, CAS.redD, CAS.gold, CAS.blackD, 4);
      F.draw(ctx, 'THE CLAW', cx, FLOOR - 100, CAS.gold, { center: true, shadow: CAS.blackD });
      X.rect(ctx, cx - 24, FLOOR - 28, 48, 20, '#1a0f16');
      F.draw(ctx, '$300', cx, FLOOR - 24, '#c2932a', { center: true, shadow: false });
      if (CLAWS.prize > 0) {
        ctx.globalAlpha = 0.2 + Math.sin(t * 9) * 0.08;
        X.blob(ctx, cx, FLOOR - 62, 34, 32, CAS.gold);
        ctx.globalAlpha = 1;
      }
    }
    // the wall of televisions
    for (let i = 0; i < 9; i++) {
      const x = 830 + (i % 5) * 36 - cam, y = FLOOR - 34 - ((i / 5) | 0) * 30;
      if (x > -30 && x < VW + 30) propTV(ctx, x, y, t, i);
    }
    // the prize counter
    const px = PRIZE_X - cam;
    if (px > -90 && px < VW + 90) {
      X.plate(ctx, px - 46, FLOOR - 30, 93, 30, CAS.wood, CAS.woodL, '#160c08', 3);
      X.rect(ctx, px - 46, FLOOR - 30, 93, 2, CAS.goldDD);
      X.plate(ctx, px - 44, FLOOR - 76, 89, 46, '#1a0f16', CAS.goldDD, CAS.blackD, 3);
      for (let r = 0; r < 2; r++) {
        X.rect(ctx, px - 41, FLOOR - 56 + r * 20, 83, 2, CAS.goldDD);
        for (let i = 0; i < 5; i++) {
          const ix = px - 34 + i * 18, iy = FLOOR - 56 + r * 20;
          if ((i + r) % 3 === 0) { X.blob(ctx, ix, iy - 4, 5, 4, '#ffd84a'); X.rect(ctx, ix - 5, iy - 5, 3, 2, '#ff8a1e'); }
          else if ((i + r) % 3 === 1) propLampMini(ctx, ix, iy, t, i + r);
          else { X.blob(ctx, ix, iy - 5, 4, 5, '#c9a0ff'); X.rect(ctx, ix - 3, iy - 7, 7, 2, CAS.goldD); }
        }
      }
      F.draw(ctx, 'PRIZES', px, FLOOR - 86, CAS.gold, { center: true, shadow: CAS.blackD });
      drawSeated(ctx, px + 20, t, 26, true);
    }
    // lava lamps on brackets, and posters between them
    for (const [x, k] of [[610, 0], [1030, 1], [1470, 2], [92, 3]]) {
      const lx = x - cam;
      if (lx > -30 && lx < VW + 30) propLamp(ctx, lx, FLOOR - 56, t, k);
    }
    for (const [x, k] of [[790, 0], [1220, 3], [1010, 5]]) {
      const lx = x - cam;
      if (lx > -30 && lx < VW + 30) propPoster(ctx, lx, FLOOR - 56, k);
    }
  }
  function propLampMini(ctx, x, y, t, k) {
    const q = (t * 0.3 + k * 0.4) % 1;
    X.rect(ctx, x - 3, y - 12, 7, 11, '#3a1a4a');
    X.rect(ctx, x - 4, y - 2, 9, 3, CAS.goldD);
    X.rect(ctx, x - 3, y - 14, 7, 3, CAS.goldD);
    X.blob(ctx, x, y - 4 - q * 7, 2, 2, '#ff6a2a');
  }

  /* ================================================================ FLOOR TWO
     THE MENAGERIE. Plants, jars, sofas, a fountain, and the desk where you can
     make everything very much worse in about four seconds. */
  function drawMenagerie(ctx, g, t, cam) {
    // the loan office: a mahogany desk, a green lamp and a queue rail
    const lx = LOAN_X - cam;
    if (lx > -90 && lx < VW + 90) {
      X.plate(ctx, lx - 52, CLUB_CEIL + 14, 105, FLOOR - CLUB_CEIL - 14, '#2a1a24', '#402a38', CAS.blackD, 5);
      X.rect(ctx, lx - 52, CLUB_CEIL + 14, 105, 3, CAS.goldD);
      F.draw(ctx, 'ADVANCES', lx, CLUB_CEIL + 18, CAS.gold, { center: true, shadow: CAS.blackD });
      F.draw(ctx, 'ASK. WE NEVER SAY NO.', lx, CLUB_CEIL + 28, '#8a6a3a', { center: true, shadow: false });
      // the shelves of ledgers behind him
      for (let r = 0; r < 3; r++) {
        X.rect(ctx, lx - 46, CLUB_CEIL + 40 + r * 16, 92, 3, CAS.wood);
        for (let i = 0; i < 14; i++) {
          X.rect(ctx, lx - 44 + i * 6.6, CLUB_CEIL + 28 + r * 16, 5, 12,
            ['#5e0c1e', '#3a2418', '#2e1c28', '#4a3420'][(i + r) % 4]);
        }
      }
      drawDealer(ctx, lx, t, 1, LOAN.t > 0);
      X.plate(ctx, lx - 44, FLOOR - 34, 89, 34, CAS.wood, CAS.woodL, '#160c08', 4);
      X.rect(ctx, lx - 44, FLOOR - 34, 89, 2, CAS.goldDD);
      X.rect(ctx, lx - 40, FLOOR - 28, 81, 20, '#2a180f');
      // the banker's lamp
      X.rect(ctx, lx + 26, FLOOR - 44, 2, 10, CAS.goldDD);
      X.poly(ctx, [[lx + 19, FLOOR - 44], [lx + 35, FLOOR - 44], [lx + 33, FLOOR - 52], [lx + 21, FLOOR - 52]], '#1d6a4a');
      ctx.globalAlpha = 0.16;
      X.blob(ctx, lx + 27, FLOOR - 42, 16, 12, '#8dff5a');
      ctx.globalAlpha = 1;
      // a ledger and a pen
      X.plate(ctx, lx - 30, FLOOR - 40, 24, 7, '#5e0c1e', '#9e1730', CAS.blackD, 2);
      X.rect(ctx, lx - 27, FLOOR - 43, 3, 4, '#f4f0ff');
      F.draw(ctx, 'THE DESK', lx, FLOOR - 52, CAS.gold, { center: true, shadow: CAS.blackD });
    }
    // an aquarium wall of brains in jars
    for (let i = 0; i < 8; i++) {
      const x = 646 + (i % 4) * 30 - cam, y = FLOOR - 36 - ((i / 4) | 0) * 42;
      if (x > -30 && x < VW + 30) {
        X.rect(ctx, x - 15, y - 44, 31, 46, '#160a12');
        X.rect(ctx, x - 15, y - 2, 31, 3, CAS.goldDD);
        propJar(ctx, x, y, t, i);
      }
    }
    // the sofa lounge, with whoever has given up sitting on it
    const sx = 880 - cam;
    if (sx > -120 && sx < VW + 120) {
      X.plate(ctx, sx - 56, FLOOR - 40, 113, 40, CAS.redD, '#8a1228', CAS.blackD, 6);
      X.rect(ctx, sx - 56, FLOOR - 40, 113, 3, '#9e1730');
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) X.blob(ctx, sx - 44 + i * 22, FLOOR - 32 + j * 11, 1.5, 1.5, '#5e0c1e');
      X.plate(ctx, sx - 56, FLOOR - 18, 113, 8, '#141d2a', '#b02a44', CAS.blackD, 3);
      drawSeated(ctx, sx - 30, t, 29, false, FLOOR - 6);
      drawSeated(ctx, sx + 26, t, 31, true, FLOOR - 6);
      // a low table with a lava lamp and a drink on it
      X.plate(ctx, sx - 12, FLOOR - 14, 26, 4, CAS.wood, CAS.woodL, '#160c08', 2);
      X.rect(ctx, sx - 2, FLOOR - 10, 3, 10, CAS.wood);
      propLampMini(ctx, sx - 6, FLOOR - 14, t, 2);
      X.rect(ctx, sx + 6, FLOOR - 19, 4, 6, 'rgba(220,235,255,0.35)');
    }
    // the greenhouse: sunflowers and pots, growing out of the carpet
    for (let i = 0; i < 7; i++) {
      const x = 1010 + i * 40 - cam;
      if (x < -40 || x > VW + 40) continue;
      const K = AH.KIN.find(k2 => k2.celeb === (i % 2 ? 'SUNNY' : 'POTTED PETE'));
      if (!K) continue;
      const bob = Math.sin(t * 0.9 + i) * 1.2;
      kinShadow(ctx, x, FLOOR, K);
      kinBreath(ctx, K, (Math.floor(t * 1.2 + i) % 11) === 0 ? 5 : 0, x, FLOOR + bob, i % 2 === 0);
    }
    // the fountain, which is running with something that is not water
    const fx = 1330 - cam;
    if (fx > -80 && fx < VW + 80) {
      X.blob(ctx, fx, FLOOR + 2, 40, 5, '#0a1018');
      X.plate(ctx, fx - 34, FLOOR - 20, 69, 20, '#5a5474', '#8e86a8', '#2e2a3e', 5);
      X.blob(ctx, fx, FLOOR - 20, 30, 6, '#3fb87e');
      X.rect(ctx, fx - 2, FLOOR - 48, 5, 28, '#8e86a8');
      X.blob(ctx, fx, FLOOR - 52, 10, 5, '#c0c8d8');
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * U.TAU, q = ((t * 1.4 + i * 0.1) % 1);
        X.rect(ctx, fx + Math.cos(a) * (4 + q * 22), FLOOR - 50 + q * 28 + Math.sin(a) * 2, 1, 2, '#6fe8d8');
      }
      ctx.globalAlpha = 0.14;
      X.blob(ctx, fx, FLOOR - 30, 30, 26, '#3fb87e');
      ctx.globalAlpha = 1;
    }
    // lamps and posters down the rest of it
    for (const [x, k] of [[196, 1], [810, 2], [1400, 0]]) {
      const px = x - cam;
      if (px > -30 && px < VW + 30) propLamp(ctx, px, FLOOR - 52, t, k);
    }
    for (const [x, k] of [[380, 4], [960, 6], [1260, 1]]) {
      const px = x - cam;
      if (px > -30 && px < VW + 30) propPoster(ctx, px, FLOOR - 54, k);
    }
  }

  /* ============================================================== FLOOR THREE
     THE CROWN. One machine. It is four storeys of building tall at the
     bottom and you are looking at the top of it. */
  function drawCrown(ctx, g, t, cam) {
    const mx = MEGA_X - cam;

    /* THE GALLERY. Two banks of raked seating either side of the void, facing
       the machine, full of people who cannot afford a pull and have come to
       watch somebody else have one. The rows step back and up. */
    for (const bank of [{ x0: 200, n: 5, dir: 1 }, { x0: 1304, n: 5, dir: -1 }]) {
      for (let row = 0; row < 2; row++) {
        const ry = FLOOR - row * 13;
        for (let i = 0; i < bank.n; i++) {
          const wx = bank.x0 + i * 44 + row * 18 * bank.dir;
          const x = wx - cam;
          if (x < -44 || x > VW + 44) continue;
          if (row === 1) X.plate(ctx, x - 24, ry + 1, 48, 14, '#4a0a16', '#7a1024', CAS.blackD, 3);
          X.plate(ctx, x - 17, ry - 28, 35, 28, CAS.redD, '#8a1228', CAS.blackD, 4);
          X.rect(ctx, x - 17, ry - 28, 35, 2, '#9e1730');
          X.blob(ctx, x, ry - 30, 4, 3, CAS.goldDD);
          drawSeated(ctx, x, t, 22 + i + row * 9 + bank.dir * 4, (i + row) % 2 === 0, ry - 4);
          // a drink on the arm of most of them
          if ((i + row) % 3 !== 2) {
            X.rect(ctx, x + 14, ry - 16, 4, 6, 'rgba(220,235,255,0.3)');
            X.rect(ctx, x + 14, ry - 14, 4, 4, ['#8affa0', '#ffb03d', '#ff8ad8'][(i + row) % 3]);
          }
        }
      }
    }

    /* THE MACHINE. */
    if (mx > -(MEGA_HW + 140) && mx < VW + MEGA_HW + 140) drawMegaMachine(ctx, g, t, cam);

    /* THE HOUSE. Two of them stand either side of it all night and have never
       seen it pay, and a velvet rope box for whoever is next. */
    for (const [wx, fl] of [[MEGA_X - MEGA_HW - 96, false], [MEGA_X + MEGA_HW + 112, true]]) {
      const x = wx - cam;
      if (x < -30 || x > VW + 30) continue;
      const K = AH.KIN[(wx | 0) % AH.KIN.length];
      kinShadow(ctx, x, FLOOR, K);
      kinBreath(ctx, K, (Math.floor(t * 0.7 + wx) % 11) === 0 ? 5 : 0, x, FLOOR, fl);
      // a house sash, so they read as staff and not as punters
      X.rect(ctx, x - 5, FLOOR - 26, 10, 3, CAS.gold);
    }

    // the queue rail for the next pull, and nobody in it
    for (let i = 0; i < 5; i++) {
      const x = 1136 + i * 28 - cam;
      if (x < -20 || x > VW + 20) continue;
      if (i < 4) { ctx.globalAlpha = 0.8; X.rect(ctx, x, FLOOR - 18, 28, 3, '#8a1228'); ctx.globalAlpha = 1; }
      X.rect(ctx, x - 2, FLOOR - 22, 4, 22, '#4a3a10');
      X.rect(ctx, x - 1, FLOOR - 22, 1, 22, CAS.goldD);
      X.blob(ctx, x, FLOOR - 24, 3, 3, CAS.gold);
    }

    /* THE BOARD OF THE DEAD. Every name that has pulled it and what it took.
       It is the longest thing in the room. */
    for (let b = 0; b < 2; b++) {
      const bx = (b ? 1400 : 276) - cam;
      if (bx < -110 || bx > VW + 110) continue;
      X.plate(ctx, bx - 72, CLUB_CEIL + 38, 144, 62, CAS.blackD, CAS.goldDD, '#000000', 5);
      X.rect(ctx, bx - 72, CLUB_CEIL + 38, 144, 2, CAS.goldD);
      F.draw(ctx, b ? 'TONIGHT' : 'THE BOARD', bx, CLUB_CEIL + 42, CAS.gold, { center: true, shadow: false });
      for (let i = 0; i < 5; i++) {
        const seed = b * 31 + i;
        F.draw(ctx, CROWN_NAMES[(seed * 3) % CROWN_NAMES.length], bx - 66, CLUB_CEIL + 54 + i * 9,
          '#5a4a6a', { shadow: false });
        F.draw(ctx, '-$' + U.fmt(10000 * (1 + ((seed * 7) % 24))), bx + 66, CLUB_CEIL + 54 + i * 9,
          '#7a2432', { right: true, shadow: false });
      }
    }

    // lamps and the odd potted thing along the back wall
    for (const [x, k] of [[178, 3], [1118, 0], [1540, 2]]) {
      const px = x - cam;
      if (px > -30 && px < VW + 30) propLamp(ctx, px, FLOOR - 58, t, k);
    }

    // the ceiling drapes, gathered back off the machine
    for (let i = 0; i < 12; i++) {
      const dx = i * 140 - cam;
      if (dx < -70 || dx > VW + 70) continue;
      ctx.globalAlpha = 0.5;
      X.poly(ctx, [[dx, CLUB_CEIL], [dx + 70, CLUB_CEIL], [dx + 35, CLUB_CEIL + 22]], '#4a0a16');
      ctx.globalAlpha = 1;
      X.blob(ctx, dx + 35, CLUB_CEIL + 22, 3, 3, CAS.goldD);
    }

    const tx = 276 - cam;
    X.plate(ctx, tx - 108, CLUB_CEIL + 2, 216, 32, CAS.blackD, CAS.goldDD, '#000000', 5);
    F.draw(ctx, 'THE CROWN', tx, CLUB_CEIL + 6, CAS.gold, { center: true, scale: 2, shadow: CAS.blackD });
    F.draw(ctx, 'ONE MACHINE. ONE PULL. ONE LIFE.', tx, CLUB_CEIL + 24, '#8a6a3a',
      { center: true, shadow: false });
  }

  /* Names off the board of everybody who has pulled it and gone home lighter. */
  const CROWN_NAMES = ['VOSK', 'THE GRUB', 'M. PELL', 'HARRA', 'OLD TWIN', 'BRUNT',
    'SIX EYES', 'THE WIDOW', 'K. ASHE', 'DORMAK', 'PIP', 'THE ARCHITECT'];



  /* ========================================================= THE MEGA PLANET MACHINE
     The one at the top of the building. Three reels of WORLDS, a lever the
     size of a man, and a jackpot board that has never been reset because it
     has never been paid.

     It is the same machine from the night you lost everything, which is why
     the story's spin happens HERE, in this room, on this floor, instead of
     in a screen of its own. One machine, one set of art. */
  /* It stands clear of the lift, clear of the atrium void, and it is so wide
     that the floor had to be lengthened to hold it. MEGA_HW is the half-width
     of the cabinet; everything else in here is measured off it. */
  const MEGA_X = 880, MEGA_HW = 168, MEGA_STAKE = 10000;
  const WORLDS = ['#6fd955', '#3f8ae0', '#d63550', '#ffd34d', '#c9a0ff', '#6fe8d8'];
  const MEGA = { spin: 0, t: 0, reel: [0, 2, 4], land: [0, 2, 4], lever: 0, win: 0, rest: 0, done: 0 };

  const MEGA_LOSE = [
    'THREE DIFFERENT WORLDS. THE BOARD DOES NOT MOVE.',
    'TWO AND A HALF. HALF IS NOTHING.',
    'IT MAKES THE WINNING NOISE. IT ALWAYS MAKES THE WINNING NOISE.',
    'THE GALLERY GROANS AS ONE. THEY HAVE ALL DONE THIS.',
    'THE LEVER COMES BACK UP ON ITS OWN, READY FOR THE NEXT ONE.'
  ];

  function playMega(g) {
    if (tableBusy() || MEGA.spin > 0) return;
    if (g.save.credits < MEGA_STAKE) {
      say('TEN THOUSAND A PULL. THE WHOLE GALLERY CAN SEE YOU HAVE NOT GOT IT.');
      A.sfx.deny(); return;
    }
    g.save.credits -= MEGA_STAKE; wager(g, MEGA_STAKE);
    MEGA.spin = 1; MEGA.t = 0; MEGA.lever = 1; MEGA.done = 0;
    const r = U.rand();
    if (r < 0.012) { const k = U.randInt(0, 5); MEGA.land = [k, k, k]; MEGA.win = MEGA_STAKE * 60; }
    else if (r < 0.16) {
      const k = U.randInt(0, 5);
      let o = U.randInt(0, 5); if (o === k) o = (k + 1) % 6;
      MEGA.land = U.shuffle([k, k, o]); MEGA.win = MEGA_STAKE * 3;
    } else {
      const a = U.randInt(0, 5);
      let b = (a + 1 + U.randInt(0, 4)) % 6, c = (b + 1 + U.randInt(0, 3)) % 6;
      if (c === a) c = (c + 1) % 6;
      MEGA.land = [a, b, c]; MEGA.win = 0;
    }
    A.sfx.tone(120, { type: 'square', to: 480, dur: 0.5, vol: 0.1 });
    PD.chum.call(g, 'gamble');
    g.save.spun = (g.save.spun || 0) + 1;
    g.saveGame();
  }

  function updateMega(dt, g) {
    MEGA.lever = Math.max(0, MEGA.lever - dt * 1.9);
    MEGA.rest = Math.max(0, MEGA.rest - dt);
    if (!MEGA.spin) return;
    MEGA.t += dt;
    const STOP = [1.5, 2.4, 3.4];
    for (let i = 0; i < 3; i++) {
      if (MEGA.t < STOP[i]) MEGA.reel[i] = (MEGA.reel[i] + dt * (16 - i * 3)) % 6;
      else if (Math.floor(MEGA.reel[i]) !== MEGA.land[i]) {
        MEGA.reel[i] = MEGA.land[i];
        A.sfx.tone(180 + i * 60, { type: 'square', to: 90, dur: 0.16, vol: 0.1 });
        FX.shake && FX.shake(0.3);
      }
    }
    if (MEGA.t < 3.8 || MEGA.done) { if (MEGA.t > 6.4) { MEGA.spin = 0; MEGA.rest = 2.4; } return; }
    MEGA.done = 1;
    if (MEGA.win > 0) {
      g.save.credits += MEGA.win;
      const three = MEGA.win >= MEGA_STAKE * 60;
      say(three ? 'THREE WORLDS. THE BOARD BREAKS. ' + U.fmt(MEGA.win) + '.'
        : 'TWO WORLDS. ' + U.fmt(MEGA.win) + ' AND THE GALLERY STANDS UP.');
      FX.text(MEGA_X, 60, '+$' + U.fmt(MEGA.win), '#ffd34d', 2);
      for (let k = 0; k < (three ? 180 : 70); k++) {
        FX.spawn({ x: MEGA_X + U.rand(-MEGA_HW, MEGA_HW), y: U.rand(70, 135), vx: U.rand(-260, 260), vy: U.rand(-340, -60),
          life: 2.6, size: 2, glow: 1, color: k % 3 ? '#ffd34d' : U.pick(WORLDS), grav: 200, drag: 1 });
      }
      winLight(MEGA_X, 101, three ? 2.6 : 1.7);
      A.sfx.jackpot(); A.sfx.applause();
      if (three) PD.chum.call(g, 'jackpot', true);
    } else {
      say(U.pick(MEGA_LOSE));
      FX.text(MEGA_X, 60, '-$' + U.fmt(MEGA_STAKE), '#ff5a4d', 0);
      A.sfx.deny();
      cryAboutIt(g, MEGA_STAKE);
      // ten thousand gone and nothing left to put in: he comes and finds you
      if (g.save.credits < MEGA_STAKE) {
        P.lock = Math.max(P.lock, 2.6);
        PD.chum.bite(g, 'broke');
      }
    }
    g.saveGame();
  }

  /* One reel window of the big machine: a world, turning, with a ring on it. */
  /* One world in one window. A disc, a lit cap, three continents and a ring.
     The first pass put a terminator over four fifths of it and every reel
     came out looking like a bowl of soup. */
  const WORLD_DK = ['#2a6a1e', '#1a3a7a', '#6a1020', '#a87a10', '#5e3a8a', '#1a6a6a'];
  const WORLD_LT = ['#a8f27a', '#7ec8ff', '#ff7a90', '#ffe9a8', '#e0c2ff', '#b6fff2'];
  const WORLD_NAME = ['VERDANT', 'THE BLUE', 'CINDER', 'GOLDHOLD', 'AMETHYST', 'THE PALE'];

  /* ONE WORLD, ONE WINDOW. At forty pixels across a flat green ball reads as a
     pea, so each one gets a lit side, a terminator, polar caps, continents,
     a cloud band, a ring seen edge-on with its own shadow, and a moon. */
  function megaReel(ctx, x, y, r, k, t) {
    const i = ((k % 6) + 6) % 6;
    const col = WORLDS[i], dk = WORLD_DK[i], lt = WORLD_LT[i];

    // the ring, the half that goes behind, sitting above the equator
    ctx.globalAlpha = 0.55;
    X.blob(ctx, x, y - r * 0.26, r * 1.46, Math.max(1, r * 0.15), '#bfae86');
    X.blob(ctx, x, y - r * 0.26, r * 1.22, Math.max(1, r * 0.09), '#8e7f5e');
    ctx.globalAlpha = 1;

    X.blob(ctx, x, y, r + 1, r + 1, '#0d060c');
    X.blob(ctx, x, y, r, r, dk);
    X.blob(ctx, x - r * 0.08, y - r * 0.08, r * 0.94, r * 0.94, col);

    // continents, laid out off the reel index so each world keeps its own map
    for (let c = 0; c < 6; c++) {
      const a = c * 1.9 + i * 0.7, d = 0.24 + ((c * 7 + i * 3) % 5) * 0.13;
      const cx = x + Math.cos(a) * r * d * 1.7, cy = y + Math.sin(a) * r * d * 1.5;
      if ((cx - x) ** 2 + (cy - y) ** 2 > (r * 0.86) ** 2) continue;
      X.blob(ctx, cx, cy, r * (0.16 + (c % 3) * 0.08), r * (0.11 + (c % 2) * 0.06), dk);
    }
    // a cloud band across the middle, drifting
    ctx.globalAlpha = 0.22;
    X.blob(ctx, x + Math.sin(t * 0.6 + i) * r * 0.2, y - r * 0.3, r * 0.8, r * 0.1, '#ffffff');
    X.blob(ctx, x - Math.sin(t * 0.5 + i) * r * 0.25, y + r * 0.34, r * 0.7, r * 0.09, '#ffffff');
    ctx.globalAlpha = 1;
    // polar caps
    X.blob(ctx, x, y - r * 0.84, r * 0.34, r * 0.13, lt);
    X.blob(ctx, x, y + r * 0.86, r * 0.28, r * 0.1, lt);
    // the night side
    ctx.globalAlpha = 0.34;
    X.blob(ctx, x + r * 0.66, y + r * 0.26, r * 0.56, r * 0.82, '#0d060c');
    ctx.globalAlpha = 0.18;
    X.blob(ctx, x + r * 0.42, y + r * 0.14, r * 0.62, r * 0.9, '#0d060c');
    ctx.globalAlpha = 1;
    // and the sun on the other cheek
    X.blob(ctx, x - r * 0.44, y - r * 0.46, r * 0.2, r * 0.15, '#ffffff');
    ctx.globalAlpha = 0.3;
    X.blob(ctx, x - r * 0.34, y - r * 0.36, r * 0.4, r * 0.34, lt);
    ctx.globalAlpha = 1;

    /* The half that comes in front. It crosses the face of the world rather
       than stopping at its edge -- the first pass masked it out with a bar of
       planet colour, and every reel looked like a ball with a stripe on it. */
    X.blob(ctx, x, y + r * 0.2, r * 1.46, Math.max(1, r * 0.13), '#e8dfc4');
    X.blob(ctx, x, y + r * 0.2, r * 1.18, Math.max(1, r * 0.07), '#bfae86');
    ctx.globalAlpha = 0.45;
    X.blob(ctx, x + r * 0.92, y + r * 0.2, r * 0.48, Math.max(1, r * 0.14), '#0d060c');
    ctx.globalAlpha = 1;

    // a moon, in its own orbit, at whatever phase the reel index puts it
    const ma = t * 0.5 + i * 2.1;
    X.blob(ctx, x + Math.cos(ma) * r * 1.34, y - r * 0.7 + Math.sin(ma) * r * 0.3,
      Math.max(2, r * 0.15), Math.max(2, r * 0.15), '#8e86a8');

    // the name of it, stamped on the reel band
    if (r > 20) F.draw(ctx, WORLD_NAME[i], x, y + r * 1.34, 'rgba(232,223,196,0.5)', { center: true, shadow: false });
  }

  /* THE UNIVERSAL. It is not a slot machine with a big sticker on it. It is a
     building inside a building: a plinth you climb, a cabinet six times your
     height that goes up through a hole cut in the ceiling, three windows with
     whole worlds turning in them, and a lever you have to reach up for.

     Everything is measured off MEGA_HW so it can be made bigger again later
     without any of it coming apart. */
  const MEGA_TOP = -72;                  // the cabinet leaves the top of the screen

  function megaShaft(ctx, mx, t) {
    /* The hole they cut in the ceiling of the top floor to get it in, and
       never made good. Gold-edged, because everything in here is. */
    const w = MEGA_HW + 26;
    X.rect(ctx, mx - w, CLUB_CEIL - 4, w * 2, 10, '#0a0409');
    X.rect(ctx, mx - w, CLUB_CEIL - 4, w * 2, 2, CAS.goldDD);
    for (let i = -1; i <= 1; i += 2) {
      X.plate(ctx, mx + i * (w - 10) - 7, CLUB_CEIL - 6, 15, 16, CAS.blackL, CAS.goldD, CAS.blackD, 3);
      X.rect(ctx, mx + i * (w - 10) - 5, CLUB_CEIL + 2, 11, 3, (Math.floor(t * 3) + i) % 2 ? '#4a3a10' : CAS.gold);
    }
    // gantry cables running up out of shot
    for (let i = 0; i < 5; i++) {
      const cx = mx - w + 22 + i * ((w * 2 - 44) / 4);
      X.rect(ctx, cx, MEGA_TOP, 2, CLUB_CEIL - MEGA_TOP + 4, '#150c14');
    }
  }

  function megaWindow(ctx, mx, my, i, t) {
    /* One of the three, and each one is bigger than a door. */
    const wx = mx + (i - 1) * 106, hw = 48, hh = 52, PITCH = 104;
    X.plate(ctx, wx - hw - 7, my - hh - 7, (hw + 7) * 2, (hh + 7) * 2, CAS.black, CAS.goldD, CAS.blackD, 7);
    X.plate(ctx, wx - hw, my - hh, hw * 2, hh * 2, '#120810', '#2a1020', '#000000', 5);
    ctx.save();
    ctx.beginPath(); ctx.rect(wx - hw + 3, my - hh + 3, hw * 2 - 6, hh * 2 - 6); ctx.clip();
    // the machine's own light behind the reel
    ctx.globalAlpha = 0.1;
    X.blob(ctx, wx, my, hw, hh, WORLDS[Math.floor(MEGA.reel[i]) % 6]);
    ctx.globalAlpha = 1;
    const v = MEGA.reel[i];
    for (let o = -1; o <= 1; o++) megaReel(ctx, wx, my + (o - (v % 1)) * PITCH, 36, Math.floor(v) + o, t);
    // the blur bars that say it is turning, over the top of the worlds
    if (MEGA.spin > 0) {
      ctx.globalAlpha = 0.18;
      for (let b = 0; b < 7; b++) X.rect(ctx, wx - hw, my - hh + ((t * 700 + b * 34) % (hh * 2)), hw * 2, 3, '#ffffff');
      ctx.globalAlpha = 1;
    }
    // glass: a hard diagonal highlight down one corner
    ctx.globalAlpha = 0.07;
    X.poly(ctx, [[wx - hw, my - hh], [wx - hw + 36, my - hh], [wx - hw, my - hh + 52]], '#ffffff');
    ctx.globalAlpha = 1;
    ctx.restore();
    // the pay line, lit only when it has paid
    const paid = MEGA.rest > 0 && MEGA.win;
    X.rect(ctx, wx - hw - 7, my - 2, (hw + 7) * 2, 4, paid ? CAS.gold : '#7a1024');
    if (paid) { ctx.globalAlpha = 0.3; X.blob(ctx, wx, my, hw + 10, 12, CAS.gold); ctx.globalAlpha = 1; }
    // rivets down the frame
    for (let r = -1; r <= 1; r += 2) {
      for (let k = 0; k < 6; k++) X.blob(ctx, wx + r * (hw + 3), my - hh + 8 + k * 19, 2, 2, CAS.goldDD);
    }
  }

  function drawMegaMachine(ctx, g, t, cam) {
    const mx = MEGA_X - cam, B = FLOOR, HW = MEGA_HW;
    const P0 = B - 30;                        // the top of the plinth
    const lit = MEGA.spin > 0 ? 1 : 0;

    megaShaft(ctx, mx, t);

    // the haze the whole thing sits in
    ctx.globalAlpha = 0.05 + lit * 0.04;
    X.blob(ctx, mx, 100, HW + 90, 150, CAS.gold);
    ctx.globalAlpha = 1;

    /* THE PLINTH. Four steps, and it is wider than the cabinet so it reads as
       something that was poured before the building went up around it. */
    X.blob(ctx, mx, B + 7, HW + 62, 10, '#2a0410');
    for (let i = 0; i < 4; i++) {
      const w = HW + 54 - i * 14, y = B - i * 10;
      X.rect(ctx, mx - w, y, w * 2, 11, '#28040e');             // the riser, in shadow
      X.rect(ctx, mx - w, y, w * 2, 5, i % 2 ? '#7a1024' : '#8a1228');  // the tread, lit
      X.rect(ctx, mx - w, y, w * 2, 1, CAS.gold);               // and the brass nosing
      X.rect(ctx, mx - w, y + 5, w * 2, 1, '#0a1018');
    }
    /* A runner up the middle, laid over the steps rather than through them:
       a lit tread and a shadowed riser for each one, and a worn patch in the
       middle of every tread where everybody has put the same foot. */
    for (let i = 0; i < 4; i++) {
      const y = B - i * 10;
      X.rect(ctx, mx - 36, y, 72, 11, '#5e0c1e');
      X.rect(ctx, mx - 36, y, 72, 5, '#b01e38');
      X.rect(ctx, mx - 36, y, 72, 1, CAS.goldD);
      ctx.globalAlpha = 0.3;
      X.blob(ctx, mx, y + 2, 18, 2, '#101722');
      ctx.globalAlpha = 1;
      X.rect(ctx, mx - 36, y, 2, 11, CAS.goldDD);
      X.rect(ctx, mx + 34, y, 2, 11, CAS.goldDD);
    }

    /* THE CABINET. Black lacquer from the plinth up through the ceiling. */
    X.plate(ctx, mx - HW, MEGA_TOP, HW * 2, P0 - MEGA_TOP, CAS.black, '#3e2a38', CAS.blackD, 12);
    X.rect(ctx, mx - HW, P0 - 4, HW * 2, 4, CAS.goldD);
    // fluted gold columns down both flanks
    for (let r = -1; r <= 1; r += 2) {
      const cx = mx + r * (HW - 17);
      X.plate(ctx, cx - 10, MEGA_TOP, 20, P0 - MEGA_TOP, '#2a1c28', CAS.goldDD, CAS.blackD, 4);
      for (let k = 0; k < 3; k++) X.rect(ctx, cx - 5 + k * 4, MEGA_TOP + 6, 2, P0 - MEGA_TOP - 12, k === 1 ? CAS.goldD : '#4a3a10');
      // and a lamp every so often up the column
      for (let k = 0; k < 5; k++) {
        const ly = 18 + k * 36, on = (Math.floor(t * 4) + k) % 5 !== 0;
        X.blob(ctx, cx, ly, 5, 5, on ? CAS.gold : '#4a3a10');
        if (on) { ctx.globalAlpha = 0.24; X.blob(ctx, cx, ly, 11, 11, CAS.gold); ctx.globalAlpha = 1; }
      }
    }
    // the recessed black field the windows sit in
    X.plate(ctx, mx - HW + 28, 36, (HW - 28) * 2, 130, CAS.blackD, CAS.goldDD, '#000000', 8);

    /* THE THREE WINDOWS. */
    for (let i = 0; i < 3; i++) megaWindow(ctx, mx, 101, i, t);

    /* THE JACKPOT BOARD, over the top, going round. */
    X.plate(ctx, mx - HW + 14, -10, (HW - 14) * 2, 50, CAS.redD, CAS.gold, CAS.blackD, 8);
    const bulbs = Math.floor((HW - 30) * 2 / 12);
    for (let i = 0; i <= bulbs; i++) {
      const on = (Math.floor(t * 8) + i) % 4 !== 0;
      const bx = mx - HW + 24 + i * 12;
      X.blob(ctx, bx, -2, 3, 3, on ? CAS.gold : '#4a3a10');
      X.blob(ctx, bx, 33, 3, 3, on ? CAS.gold : '#4a3a10');
    }
    F.draw(ctx, 'THE UNIVERSAL', mx, 4, CAS.gold, { center: true, scale: 2, shadow: CAS.blackD });
    F.draw(ctx, '$' + U.fmt(MEGA_STAKE * 60), mx, 21, '#ffe9a8', { center: true, scale: 2, shadow: CAS.blackD });

    /* THE STAKE PLATE, the coin trough and the brass of it. */
    X.plate(ctx, mx - 112, 168, 224, 18, CAS.blackL, CAS.goldD, CAS.blackD, 5);
    F.draw(ctx, '$' + U.fmt(MEGA_STAKE) + ' A PULL', mx, 172, CAS.gold, { center: true, scale: 2, shadow: false });

    // coin slot and a worn brass plate under it, rubbed by every hand there has been
    X.rect(ctx, mx + 84, 170, 5, 14, '#000000');
    X.rect(ctx, mx + 82, 169, 9, 2, CAS.goldD);

    /* THE LEVER. You reach up for it. */
    const lv = MEGA.lever * 54;
    const px0 = mx + HW + 14, py0 = 122;
    X.plate(ctx, mx + HW - 6, py0 - 26, 24, 96, CAS.black, '#3e2a38', CAS.blackD, 4);
    X.plate(ctx, px0 - 13, py0 - 16, 27, 76, CAS.blackL, CAS.goldD, CAS.blackD, 5);
    X.rect(ctx, mx + HW - 6, py0 - 26, 24, 2, CAS.goldDD);
    X.blob(ctx, px0, py0, 11, 11, '#2a1c28');
    X.blob(ctx, px0, py0, 7, 7, CAS.goldDD);
    X.limb(ctx, px0, py0, px0 + 30, py0 - 66 + lv, 9, 7, '#4a3f70', '#a89ad0', CAS.blackD);
    X.blob(ctx, px0 + 30, py0 - 70 + lv, 15, 15, '#5e0c1e');
    X.blob(ctx, px0 + 30, py0 - 70 + lv, 11, 11, '#d63550');
    X.blob(ctx, px0 + 26, py0 - 74 + lv, 4, 4, '#ff9aa8');

    /* THE BARRIER, so the gallery cannot get at it, and a sign nobody reads. */
    for (let i = -1; i <= 1; i += 2) {
      const bx = mx + i * (HW + 58);
      X.plate(ctx, bx - 4, B - 34, 9, 34, CAS.goldD, CAS.gold, CAS.goldDD, 3);
      X.blob(ctx, bx, B - 36, 5, 5, CAS.gold);
    }
    ctx.globalAlpha = 0.85;
    X.rect(ctx, mx - HW - 54, B - 30, (HW + 54) * 2, 4, '#8a1228');
    ctx.globalAlpha = 1;

    // the last thing: the light it throws on the carpet in front of it
    ctx.globalAlpha = 0.08 + lit * 0.07;
    X.blob(ctx, mx, B + 6, HW + 40, 10, CAS.gold);
    ctx.globalAlpha = 1;
  }

  /* ================================================================ THE CRYING
     You lose a lot of money and you go down like a cartoon: two hard jets out
     of your eyes, a puddle that spreads under you, and it takes a few seconds
     to stop. The bigger the loss the longer it runs. */
  const CRY = { t: 0, max: 0, pool: 0, drops: [] };
  function cryAboutIt(g, amount) {
    const big = U.clamp(amount / 5000, 0.6, 3.4);
    CRY.t = CRY.max = 1.6 + big;
    CRY.pool = 0;
    P.lock = Math.max(P.lock, 0.5);
    A.sfx.tone(520, { type: 'sine', to: 170, dur: 0.7, vol: 0.09 });
    A.sfx.tone(390, { type: 'sine', to: 130, dur: 0.9, vol: 0.07, delay: 0.5 });
  }
  function updateCry(dt) {
    if (CRY.t <= 0) { CRY.pool = Math.max(0, CRY.pool - dt * 0.5); CRY.drops.length = 0; return; }
    CRY.t -= dt;
    CRY.pool = Math.min(1, CRY.pool + dt * 0.7);
    for (let s = -1; s <= 1; s += 2) {
      if (!U.chance(dt * 26)) continue;
      CRY.drops.push({ x: P.x + s * 5, y: P.y - 34, vx: s * U.rand(30, 90), vy: U.rand(-60, -10), life: 0.8 });
    }
    for (let i = CRY.drops.length - 1; i >= 0; i--) {
      const d = CRY.drops[i];
      d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 340 * dt; d.life -= dt;
      if (d.life <= 0) CRY.drops.splice(i, 1);
    }
  }
  function drawCry(ctx, cam) {
    if (CRY.pool <= 0.01) return;
    const px = P.x - cam, gy = groundY(P.x);
    // the puddle, spreading
    const w = 8 + CRY.pool * 34;
    ctx.globalAlpha = 0.5;
    X.blob(ctx, px, gy + 3, w, 3 + CRY.pool * 2, '#4a9ab0');
    ctx.globalAlpha = 0.8;
    X.blob(ctx, px, gy + 2, w - 3, 2 + CRY.pool, '#7fc8dc');
    X.rect(ctx, px - w + 4, gy + 1, 6, 1, '#dff4fa');
    ctx.globalAlpha = 1;
    // the two hard jets, and everything in the air
    if (CRY.t > 0) {
      for (let s = -1; s <= 1; s += 2) {
        for (let i = 0; i < 5; i++) {
          const q = i / 5;
          X.blob(ctx, px + s * (5 + q * 14), P.y - 34 + q * q * 22, 3 - q * 1.4, 3 - q * 1.4, '#9fd8e8');
        }
      }
    }
    for (const d of CRY.drops) {
      ctx.globalAlpha = U.clamp(d.life * 1.6, 0, 1);
      X.blob(ctx, d.x - cam, d.y, 2, 3, '#bcd8ff');
      ctx.globalAlpha = 1;
    }
  }


  /* ================================================================== THE STAFF
     People you can actually talk to, rather than walk past.

     Each one stands somewhere on a floor, has a few things to say, and says
     the next one every time you press E at them. They go round. Nobody in
     this building has anything new to tell you, which is the point of them. */
  const NPCS = [
    { id: 'door', deck: 0, x: 1400, kin: 'BRUNO', name: 'THE FLOOR MAN',
      says: ['THE ROPE IS THE ROPE.', 'I DO NOT MAKE THE ROPE.', 'YOU AGAIN.', 'FOUR FLOORS. ONE DIRECTION.', 'MIND THE STEP.'],
      lines: ['HE SAYS THE ROPE IS THE ROPE AND HE DOES NOT MAKE THE ROPE.',
        'HE ASKS IF YOU ARE HERE ABOUT THE MACHINE. EVERYBODY IS.',
        'HE SAYS FOUR FLOORS AND THE MONEY ONLY EVER GOES ONE WAY.',
        'HE HAS SEEN YOUR FACE BEFORE. HE DOES NOT SAY WHERE.'] },
    { id: 'pit', deck: 0, x: 1462, kin: 'KORVO', name: 'THE PIT BOSS',
      says: ['THE EDGE IS PUBLIC.', 'NOBODY EVER ASKS.', 'HOW ARE WE GETTING ON?', 'MOST PEOPLE NEVER PRESS FOUR.', 'I WATCHED BOTH OF THEM.'],
      lines: ['HE SAYS THE HOUSE EDGE IS PUBLIC INFORMATION AND NOBODY EVER ASKS.',
        'HE SAYS THE WHEEL HAS PAID OUT TWICE THIS YEAR AND HE WATCHED BOTH.',
        'HE ASKS HOW YOU ARE GETTING ON. HE ALREADY KNOWS.',
        'HE SAYS THE LIFT GOES TO FOUR. MOST PEOPLE NEVER PRESS FOUR.'] },
    { id: 'change', deck: 1, x: 780, kin: 'DUCKY', name: 'THE CHANGE GIRL',
      says: ['SMALLER COINS LAST LONGER.', 'TRAY IS OPEN.', 'THE CLAW IS HONEST.', 'NOT MY EVENING, IS IT.', 'NEXT.'],
      lines: ['SHE HAS A TRAY OF COINS AND NO INTEREST IN YOUR EVENING.',
        'SHE SAYS THE CLAW IS HONEST. SHE SAYS IT WITHOUT MOVING HER FACE.',
        'SHE SAYS THE TELEVISIONS HAVE BEEN SHOWING THE SAME RACE SINCE SHE STARTED.',
        'SHE ASKS IF YOU WANT IT IN SMALLER COINS. IT LASTS LONGER IN SMALLER COINS.'] },
    { id: 'mechanic', deck: 1, x: 990, kin: 'UNIT 12', name: 'THE MECHANIC',
      says: ['IT IS FINE.', 'READ THE BACK OF THE CABINET.', 'NOBODY READS THE BACK.', 'ONE MOMENT.', 'THIS IS NORMAL.'],
      lines: ['IT IS INSIDE A MACHINE UP TO THE SHOULDER AND DOES NOT LOOK UP.',
        'IT SAYS THE MACHINES ARE FINE. IT SAYS THIS WHILE REPAIRING ONE.',
        'IT SAYS THE ODDS ARE PRINTED ON THE BACK OF EVERY CABINET.',
        'IT SAYS NOBODY HAS EVER READ THE BACK OF A CABINET.'] },
    { id: 'gardener', deck: 2, x: 1190, kin: 'BIRCH', name: 'THE GARDENER',
      says: ['THEY WERE ALL CUSTOMERS.', 'THAT IS A JOKE.', 'IT IS NOT WATER.', 'STOP ASKING.', 'SUNNY NEVER LOSES.'],
      lines: ['HE SAYS THE PLANTS ON THIS FLOOR ARE ALL FORMER CUSTOMERS.',
        'HE SAYS THAT AS A JOKE. HE DOES NOT LAUGH.',
        'HE SAYS THE FOUNTAIN IS NOT WATER AND TO STOP ASKING.',
        'HE SAYS SUNNY HAS NOT LOST A BET IN SIX YEARS.'] },
    { id: 'concierge', deck: 2, x: 780, kin: 'THE JAR', name: 'THE CONCIERGE',
      says: ['BLUB.', 'BLUB BLUB.', 'BLUUUB.', 'BLUB?', '...BLUB.'],
      lines: ['IT BUBBLES ONCE. SOMEHOW THIS IS A GREETING.',
        'IT BUBBLES TWICE. SOMEHOW THIS IS THE ENTIRE HISTORY OF THE BUILDING.',
        'IT SAYS THE TOP FLOOR IS NOT FOR EVERYBODY. THE BUBBLES ARE VERY CLEAR.',
        'IT ASKS, IN BUBBLES, WHETHER YOU HAVE CONSIDERED STOPPING.'] },
    { id: 'usher', deck: 3, x: 960, kin: 'VESPER', name: 'THE USHER',
      says: ['PEOPLE COME UP JUST TO LOOK.', 'ONE IN EIGHTY.', 'I AM NOT MEANT TO SAY THAT.', 'I TELL EVERYBODY THAT.', 'GO ON THEN.'],
      lines: ['HE SAYS PEOPLE COME UP HERE JUST TO LOOK AT IT.',
        'HE SAYS THE BOARD HAS NEVER BEEN RESET BECAUSE IT HAS NEVER BEEN PAID.',
        'HE SAYS SIXTY TIMES YOUR MONEY AND A ONE IN EIGHTY CHANCE OF IT.',
        'HE SAYS HE IS NOT ALLOWED TO TELL YOU THAT. HE TELLS EVERYBODY THAT.'] }
  ];
  /* --------------------------------------------------------- more of them */
  const NPCS2 = [
    { id: 'tout', deck: 0, x: 700, kin: 'PIP', name: 'THE TOUT', range: 90,
      says: ['I HAVE A TIP.', 'THE WHEEL IS DUE.', 'WHAT DO YOU DO?', 'I WORK HERE.', 'NO I DO NOT.'],
      lines: ['HE HAS A TIP. HE HAS A TIP FOR EVERYBODY AND THEY ARE ALL DIFFERENT.',
        'HE SAYS THE WHEEL IS DUE. THE WHEEL IS NEVER DUE.',
        'HE ASKS WHAT YOU DO. HE IS NOT LISTENING TO THE ANSWER.',
        'HE SAYS HE WORKS HERE. HE DOES NOT WORK HERE.'] },
    { id: 'widow', deck: 2, x: 880, kin: 'SAL', name: 'THE WIDOW', range: 60,
      says: ['HE WENT UP IN NINETY ONE.', 'HAVE YOU SEEN A GREY COAT?', 'I COME BACK MOST NIGHTS.', 'THEY SENT FLOWERS.', 'TALL. VERY TALL.'],
      lines: ['SHE SAYS HER HUSBAND WENT UP TO THE FOURTH FLOOR IN NINETY ONE.',
        'SHE SAYS SHE COMES BACK ON THE ANNIVERSARY. SHE COMES BACK MOST NIGHTS.',
        'SHE ASKS IF YOU HAVE SEEN A TALL ONE IN A GREY COAT.',
        'SHE SAYS THE HOUSE SENT FLOWERS. THE HOUSE SENDS FLOWERS.'] },
    { id: 'kid', deck: 1, x: 1180, kin: 'BEANIE', name: 'THE KID', range: 120,
      says: ['I AM UP!', 'IS THAT THE PLANET ONE?', 'MY DAD IS UPSTAIRS.', 'HE HAS BEEN A WHILE.', 'CAN I HAVE A GO?'],
      lines: ['HE IS FAR TOO YOUNG TO BE IN HERE AND NOBODY HAS SAID ANYTHING.',
        'HE SAYS HE IS UP. HE IS PLAYING A MACHINE THAT DOES NOT PAY OUT.',
        'HE ASKS IF YOU HAVE SEEN THE ONE WITH THE PLANETS ON IT.',
        'HE SAYS HIS DAD IS UPSTAIRS. HIS DAD HAS BEEN UPSTAIRS A LONG TIME.'] },
    { id: 'sweep', deck: 3, x: 1250, kin: 'ORBIT', name: 'THE SWEEPER', range: 200,
      says: ['MIND OUT.', 'YOU ARE STANDING IN IT.', 'THIRTY ONE RINGS.', 'THE GALLERY IS THE WORST.', 'BEEP.'],
      lines: ['IT SWEEPS UP WHAT PEOPLE DROP AND IT DOES NOT LOOK AT ANY OF IT.',
        'IT SAYS THE GALLERY IS THE WORST OF THEM. THEY LEAVE EVERYTHING.',
        'IT HAS FOUND THIRTY ONE WEDDING RINGS UNDER THAT MACHINE.',
        'IT ASKS YOU NOT TO STAND THERE. YOU ARE STANDING IN IT.'] }
  ];
  for (const n of NPCS2) NPCS.push(n);

  /* What they say when they have already said everything: it depends on what
     kind of night you are having, which is the only thing any of them can see. */
  const NPC_MOOD = {
    rich: ['HE LOOKS AT YOUR CHIPS AND STANDS A LITTLE STRAIGHTER.',
      'HE SAYS NOBODY LEAVES WITH THAT. NOBODY EVER HAS.',
      'HE ASKS WHETHER YOU HAVE CONSIDERED GOING HOME. HE MEANS IT KINDLY.'],
    broke: ['HE HAS SEEN THIS BEFORE. HE DOES NOT SAY SO.',
      'HE ASKS IF YOU WANT HIM TO CALL YOU SOMETHING. A CAR. ANYTHING.',
      'HE SAYS THE CASHIER IS OPEN ALL NIGHT. HE SAYS IT VERY GENTLY.'],
    owing: ['HE GLANCES AT THE DOOR. SOMEBODY IS ALWAYS AT THE DOOR.',
      'HE SAYS THE SHARK ASKED AFTER YOU. HE SAYS IT LIKE THE WEATHER.',
      'HE ASKS HOW MUCH. HE DOES NOT WANT THE NUMBER.']
  };

  /* ========================================================= THE PEOPLE WHO WORK HERE
     They used to be a sprite with a brass plate under it. They are people now:
     they walk their own bit of floor, they stop, they turn and look at you when
     you come near, they blink, and when they talk it comes out of their head in
     a bubble like everybody else's rather than out of the bottom of the screen.
     Everything they do goes through the same seven frames the crowd uses, so a
     doorman and a drunk are animated by exactly the same code. */
  const NPC_STATE = {};
  function npcState(n) {
    return NPC_STATE[n.id] || (NPC_STATE[n.id] = {
      i: -1, t: 0, x: n.x, vx: 0, face: -1, wait: U.rand(0.5, 2.5),
      blink: U.rand(1, 5), say: null, sayT: 0, sayMax: 1, met: 0, anim: U.rand(0, 9)
    });
  }
  function npcKin(nm) {
    const i = AH.KIN.findIndex(k => k.who === nm || k.celeb === nm);
    return i < 0 ? 0 : i;
  }

  function npcMood(g) {
    if ((g.save.debt || 0) > 2000000) return 'owing';
    if (g.save.credits < 2000) return 'broke';
    if (g.save.credits > 400000) return 'rich';
    return null;
  }

  function talkTo(g, id) {
    const n = NPCS.find(q => q.id === id);
    if (!n) return;
    const st = npcState(n);
    st.i++;
    /* Once you have heard everything they have, they start saying what they
       think of the night you are having instead of repeating themselves. */
    let line;
    if (st.i < n.lines.length) line = n.lines[st.i];
    else {
      const m = npcMood(g);
      const pool = m ? NPC_MOOD[m] : n.lines;
      line = pool[(st.i - n.lines.length) % pool.length];
    }
    st.t = 3.4;
    /* TWO CHANNELS. `lines` is the narrator -- HE SAYS THE ROPE IS THE ROPE --
       and that belongs on the sign at the bottom where the rest of the
       narration lives. What comes out of his head in a bubble is what he
       actually says out loud, which is short, because people are. */
    say(line);
    const spoken = (n.says && n.says.length) ? n.says[st.i % n.says.length] : null;
    st.say = spoken;
    st.sayT = st.sayMax = spoken ? 1.3 + spoken.length * 0.05 : 0;
    st.face = Math.sign(P.x - st.x) || st.face;
    st.vx = 0; st.wait = st.sayT + 0.6;
    A.sfx.tone(700 + (st.i % 3) * 90, { type: 'triangle', to: 900, dur: 0.1, vol: 0.05 });
    if (!g.save.seen['met_' + id]) {
      g.save.seen['met_' + id] = 1;
      g.save.thots = (g.save.thots || 0) + 20;
      FX.text(P.x, P.y - 50, '+20 THOTS', '#4cff9a', 1);
      g.saveGame();
    }
    st.met++;
  }

  function updateNPCs(dt, g) {
    for (const n of NPCS) {
      const st = npcState(n);
      st.t = Math.max(0, st.t - dt);
      st.sayT = Math.max(0, st.sayT - dt);
      if (st.sayT <= 0) st.say = null;
      if (n.deck !== cdeck() || S.scene !== 'club') continue;
      st.anim += dt;
      st.blink -= dt;
      if (st.blink < -0.12) st.blink = U.rand(2.5, 6);

      /* If you are standing next to them they stop what they are doing and
         turn round, which is most of what makes somebody feel present. */
      const near = Math.abs(P.x - st.x) < 62;
      if (near || st.sayT > 0) {
        st.vx = 0;
        st.face = Math.sign(P.x - st.x) || st.face;
        st.wait = Math.max(st.wait, 0.4);
        continue;
      }
      st.wait -= dt;
      if (st.wait <= 0) {
        const r = n.range || 40;
        st.wait = U.rand(1.6, 5);
        if (U.rand() < 0.45) st.vx = 0;
        else {
          st.vx = (st.x > n.x ? -1 : 1) * (U.rand() < 0.6 ? 1 : -1) * U.rand(9, 17);
          st.face = Math.sign(st.vx);
        }
        if (Math.abs(st.x - n.x) > r * 0.9) { st.vx = Math.sign(n.x - st.x) * 13; st.face = Math.sign(st.vx); }
      }
      st.x += st.vx * dt;
      const r2 = n.range || 40;
      if (st.x < n.x - r2) { st.x = n.x - r2; st.vx = Math.abs(st.vx); st.face = 1; }
      if (st.x > n.x + r2) { st.x = n.x + r2; st.vx = -Math.abs(st.vx); st.face = -1; }
    }
  }

  /* Where they are right now, so the prompt and the spots follow them about. */
  function npcX(n) { const st = NPC_STATE[n.id]; return st ? st.x : n.x; }

  function drawNPCs(ctx, g, t, cam) {
    for (const n of NPCS) {
      if (n.deck !== cdeck()) continue;
      const st = npcState(n);
      const x = st.x - cam;
      if (x < -50 || x > VW + 50) continue;
      const K = AH.KIN[npcKin(n.kin)];
      const moving = Math.abs(st.vx) > 1;
      const mv = kinMove(K, st.anim, moving, n.x);
      const bob = mv[1];
      // the same seven frames as everybody else in the building
      const frame = st.sayT > 0 ? ((Math.floor(t * 5) % 2) ? 3 : (Math.floor(t * 1.3) % 3 === 0 ? 10 : 0))
        : (st.blink < 0 ? 5
          : (moving ? (Math.floor(st.anim * 4.4) % 2 ? 1 : 2) : 0));
      kinShadow(ctx, x, FLOOR, K);
      kinBounce(ctx, K, frame, x, FLOOR, st.face < 0, moving, st.anim, n.x, false);
      // a little brass name plate, on the floor where they started
      const px = n.x - cam;
      const race = K.race || K.species || '';
      const pw = Math.max(49, F.width(n.name, 1) + 10, F.width(race, 1) + 10);
      X.plate(ctx, px - pw / 2, FLOOR + 2, pw, race ? 17 : 9, CAS.goldD, '#ffe9a8', '#4a3410', 2);
      F.draw(ctx, n.name, px, FLOOR + 4, '#2a1c06', { center: true, shadow: false });
      if (race) F.draw(ctx, race, px, FLOOR + 11, '#6a5218', { center: true, shadow: false });
      if (st.t > 0) {
        ctx.globalAlpha = 0.16 + Math.sin(t * 7) * 0.06;
        X.blob(ctx, x, FLOOR - K.h * 0.5, 22, 26, CAS.gold);
        ctx.globalAlpha = 1;
      }
    }
  }

  /* Their speech goes on last, over the top of the room, like the crowd's. */
  function drawNPCSay(ctx, t, cam) {
    for (const n of NPCS) {
      if (n.deck !== cdeck()) continue;
      const st = NPC_STATE[n.id];
      if (!st || !st.say) continue;
      const K = AH.KIN[npcKin(n.kin)];
      sayBubble(ctx, st.x - cam, FLOOR - K.h - 2, st.say, st.sayT, st.sayMax, CAS.gold, null, t);
    }
  }

  /* ================================================================ THE ADVANCE
     The desk on the second floor. They lend against nothing at all, they add
     a quarter on top before you have left the counter, and it goes straight
     on what you already owe the shark. Nobody has ever been refused. */
  const LOAN = { t: 0, sel: 0 };
  const LOAN_X = 276;
  const LOAN_SIZES = [25000, 100000, 500000];
  const LOAN_LINES = [
    'HE DOES NOT ASK WHAT FOR. HE HAS NEVER ONCE ASKED WHAT FOR.',
    'HE COUNTS IT OUT TWICE AND SLIDES IT UNDER THE GLASS.',
    'HE WRITES A NUMBER IN THE LEDGER. IT IS A BIGGER NUMBER THAN THE ONE HE GAVE YOU.',
    'HE SAYS TWENTY FIVE PER CENT AND SAYS IT LIKE IT IS A KINDNESS.',
    'HE ASKS IF YOU WANT MORE. THERE IS ALWAYS MORE.'
  ];
  function takeALoan(g) {
    const n = LOAN_SIZES[LOAN.sel % LOAN_SIZES.length];
    LOAN.sel++;
    LOAN.t = 1.4;
    g.save.credits += n;
    g.save.debt = (g.save.debt || 0) + Math.round(n * 1.25);
    say(U.fmt(n) + ' ACROSS THE COUNTER. ' + U.pick(LOAN_LINES));
    FX.text(P.x, P.y - 52, '+$' + U.fmt(n), '#ffd34d', 1);
    FX.text(P.x, P.y - 40, 'OWED +' + U.fmt(Math.round(n * 1.25)), '#ff5a4d', 0);
    A.sfx.chips(5);
    A.sfx.tone(220, { type: 'square', to: 130, dur: 0.4, vol: 0.09, delay: 0.3 });
    if (!g.save.seen.loan) {
      g.save.seen.loan = 1;
      g.save.thots = (g.save.thots || 0) + 40;
      /* THE FIRST ONE. He does not send a letter. The whole point of the shark
         is that at some stage he stops being a voice on a watch. */
      P.lock = Math.max(P.lock, 2.6);
      PD.chum.bite(g, 'loan');
    } else if ((g.save.debt || 0) > 4000000 && U.chance(0.34)) {
      P.lock = Math.max(P.lock, 2.6);
      PD.chum.bite(g, 'late');
    }
    g.saveGame();
  }

  /* ================================================================== THE CLAW
     Three hundred a go. It closes, it lifts, and about one time in six it
     does not drop what it is holding. */
  const CLAW_X = 690, PRIZE_X = 1120;
  const CLAWS = { t: 0, prize: 0, win: 0 };
  const CLAW_PRIZES = ['A RUBBER DUCK', 'A SMALLER RUBBER DUCK', 'A LAVA LAMP',
    'A BRAIN IN A JAR. IT WAVES.', 'A TINY TELEVISION', 'A POSTER OF DUCKY'];
  function playClaw(g) {
    if (CLAWS.t > 0) return;
    if (g.save.credits < 300) { say('THREE HUNDRED. YOU HAVE NOT GOT THREE HUNDRED.'); A.sfx.deny(); return; }
    g.save.credits -= 300; wager(g, 300);
    CLAWS.t = 2.2;
    CLAWS.win = U.rand() < 0.17;
    A.sfx.tone(300, { type: 'square', to: 520, dur: 0.3, vol: 0.07 });
    g.saveGame();
  }
  function updateClaw(dt, g) {
    if (CLAWS.prize > 0) CLAWS.prize -= dt;
    if (CLAWS.t <= 0) return;
    const was = CLAWS.t;
    CLAWS.t -= dt;
    if (was > 1.2 && CLAWS.t <= 1.2) A.sfx.tone(180, { type: 'square', dur: 0.2, vol: 0.08 });
    if (CLAWS.t > 0) return;
    if (CLAWS.win) {
      const p = U.pick(CLAW_PRIZES);
      CLAWS.prize = 2.6;
      g.save.thots = (g.save.thots || 0) + 25;
      say('IT HOLDS ON. ' + p + '. +25 THOTS.');
      FX.text(CLAW_X, FLOOR - 110, p, '#ffd34d', 1);
      winLight(CLAW_X, FLOOR - 70, 1.2, '#ffd84a');
      A.sfx.jackpot();
    } else {
      say('IT LIFTS. IT OPENS. IT DROPS IT. IT WAS NEVER GOING TO HOLD ON.');
      FX.text(CLAW_X, FLOOR - 110, '-$300', '#ff5a4d', 0);
      A.sfx.deny();
    }
    g.saveGame();
  }

  /* =============================================================== THE SHOVING
     It is busy in here and nobody is looking where they are going. If one of
     the regulars walks into you, you get moved, because you are not important. */
  function shoving(dt, g) {
    for (const c of CLUBBERS) {
      if (c.dance > 0 || c.kiss > 0) continue;
      const d = P.x - c.x;
      if (Math.abs(d) > 11) continue;
      const push = Math.sign(d || 1);
      P.x += push * 34 * dt;
      P.vx += push * 12;
      if (U.chance(dt * 1.6)) {
        S.shoved = 0.4;
        A.sfx.tone(150, { type: 'square', to: 100, dur: 0.08, vol: 0.05 });
        if (U.chance(0.4)) {
          speak(c, U.pick(['MIND OUT', 'SORRY. NOT SORRY.', 'WALK MUCH?', 'EXCUSE YOU',
            'COMING THROUGH', 'THAT IS MY FLOOR', 'LOVELY. THANK YOU.', { e: 'yell' }]), P.x);
        }
      }
    }
    S.shoved = Math.max(0, (S.shoved || 0) - dt);
  }

  /* ================================================================ THE BALANCE
     The debt bar is hidden the whole time you are in this building, so what
     goes in the corner instead is what you have got ON you -- which is the
     only number the house wants you thinking about. */
  function drawBalance(ctx, g, t) {
    const w = 104, x = 8, y = VH - 30;
    X.plate(ctx, x, y, w, 24, 'rgba(20,8,14,0.82)', CAS.goldDD, CAS.blackD, 3);
    X.rect(ctx, x, y, w, 1, CAS.goldD);
    F.draw(ctx, 'CHIPS', x + 5, y + 3, '#8a6a3a', { shadow: false });
    F.draw(ctx, '$' + U.fmt(g.save.credits), x + w - 5, y + 11, CAS.gold, { right: true, shadow: CAS.blackD });
    const k = vipTier(g);
    for (let i = 1; i <= 5; i++) {
      X.blob(ctx, x + 6 + i * 7, y + 20, 2, 2, k >= i ? CAS.gold : '#3a2a10');
    }
    F.draw(ctx, VIP[k].name, x + w - 5, y + 17, k ? '#c2932a' : '#5a4430', { right: true, shadow: false });
  }

  /* ------------------------------------------------------------ the whole room */
  /* The shell every floor of this building shares: the ceiling, the walls,
     the carpet, the lift and the hole through the middle. What goes on top of
     it is whatever floor you are on. */
  function drawClub(ctx, g, t, cam) {
    X.rect(ctx, 0, 0, VW, VH, CAS.blackD);
    casinoCeiling(ctx, t, cam);
    casinoWall(ctx, t, cam);
    casinoChandeliers(ctx, t, cam);
    casinoDressWall(ctx, t, cam);
    casinoOverhead(ctx, t, cam);
    casinoCarpet(ctx, t, cam);
    casinoFloorLight(ctx, t, cam);
    casinoDressFloor(ctx, g, t, cam);
    drawAtrium(ctx, g, t, cam);
    drawLift(ctx, g, t, cam);

    if (cdeck() !== 0) {
      if (cdeck() === 1) drawArcade(ctx, g, t, cam);
      else if (cdeck() === 2) drawMenagerie(ctx, g, t, cam);
      else drawCrown(ctx, g, t, cam);
      // a thinner crowd upstairs than on the tables, but there is always one
      for (let i = 0; i < CLUBBERS.length; i += 3) {
        const c = CLUBBERS[i];
        let hx = 200 + ((c.x * 1.7 + i * 260) % Math.max(200, clubW() - 300));
        // nobody stands inside the machine, or on the plinth, or in the void
        if (cdeck() === 3 && hx > MEGA_X - MEGA_HW - 70 && hx < MEGA_X + MEGA_HW + 110) continue;
        if (hx > atriumX() - 16 && hx < atriumX() + atriumW() + 16) continue;
        const K = AH.KIN[c.k % AH.KIN.length];
        const mv = kinMove(K, c.t, false, i);
        kinShadow(ctx, hx - cam, FLOOR, K);
        kinBreath(ctx, K, (Math.floor(c.t + i) % 9) === 0 ? 5 : 0, hx - cam + mv[0], FLOOR + mv[1], i % 2 === 0);
      }
      drawTray(ctx, t, cam);
      drawWin(ctx, t, cam);
      drawNPCs(ctx, g, t, cam);
      drawCry(ctx, cam);
      for (let i = 0; i < 8; i++) {
        const hx = ((U.hash2(i, 3) * clubW() + t * (5 + U.hash2(i, 7) * 7)) % clubW()) - cam;
        ctx.globalAlpha = 0.04 + 0.02 * Math.sin(t + i);
        X.blob(ctx, hx, FLOOR - 26 - U.hash2(i, 11) * 44, 26, 9, '#c9bce8');
        ctx.globalAlpha = 1;
      }
      drawNPCSay(ctx, t, cam);
      return;
    }

    drawBooths(ctx, g, t, cam);
    drawCage(ctx, g, t, cam);
    drawBar(ctx, g, t, cam);
    /* The crowd goes in BEFORE the tables. Fourteen aliens drawn last stood in
       front of every game in the room and you could not see what you were
       putting five hundred on. */
    for (const c of CLUBBERS) drawClubber(ctx, c, t, cam);
    drawRoomba(ctx, t, cam);
    cardTable(ctx, g, t, cam, POKER_X, 'POKER', 'poker');
    drawRoulette(ctx, g, t, cam);
    cardTable(ctx, g, t, cam, JACK_X, 'BLACKJACK', 'jack');
    drawSlots(ctx, g, t, cam);
    drawStep(ctx, g, t, cam);
    drawRope(ctx, g, t, cam);
    if (salonOpen(g)) {
      drawCraps(ctx, g, t, cam);
      drawLounge(ctx, g, t, cam);
      drawBacc(ctx, g, t, cam);
    } else {
      // the back of the house, seen past him, with the lights off
      ctx.globalAlpha = 0.55;
      X.rect(ctx, ROPE_X + 46 - cam, CLUB_CEIL, clubW() - ROPE_X, FLOOR - CLUB_CEIL, CAS.blackD);
      X.rect(ctx, ROPE_X + 46 - cam, FLOOR, clubW() - ROPE_X, VH - FLOOR, CAS.blackD);
      ctx.globalAlpha = 1;
    }

    drawTray(ctx, t, cam);
    drawWin(ctx, t, cam);
    drawNPCs(ctx, g, t, cam);
    drawCry(ctx, cam);
    drawWhoTag(ctx, t, cam);
    drawNPCSay(ctx, t, cam);
    const nx = chatNext();
    if (nx && nx.at < 0.55 && !nx.who.say && !nx.who.emote) {
      const K = AH.KIN[nx.who.k % AH.KIN.length];
      const bx0 = nx.who.x - cam, by0 = FLOOR - K.h - 8;
      for (let i = 0; i < 2; i++) {
        const q = 1 - nx.at / 0.55;
        if (q * 2 < i * 0.7) continue;
        X.blob(ctx, bx0 - 2 + i * 6, by0 - i * 5, 2 + i, 2 + i, '#0d0918');
        X.blob(ctx, bx0 - 2 + i * 6, by0 - i * 5, 1 + i, 1 + i, '#efeaf8');
      }
    }
    for (const c of CLUBBERS) if (c.say || c.emote) {
      const K = AH.KIN[c.k % AH.KIN.length];
      sayBubble(ctx, c.x - cam, FLOOR - K.h - 2, c.say, c.sayT, c.sayMax, K.acc, c.emote, t);
    }

    // cigar smoke, drifting, which is most of the air in here
    for (let i = 0; i < 10; i++) {
      const hx = ((U.hash2(i, 3) * clubW() + t * (5 + U.hash2(i, 7) * 7)) % clubW()) - cam;
      ctx.globalAlpha = 0.045 + 0.025 * Math.sin(t + i);
      X.blob(ctx, hx, FLOOR - 26 - U.hash2(i, 11) * 44, 26, 9, '#c9bce8');
      ctx.globalAlpha = 1;
    }

    // the way out, with the door staff still standing in it
    X.plate(ctx, 12 - cam, FLOOR - 48, 30, 48, CAS.blackD, CAS.goldDD, '#000000', 4);
    X.rect(ctx, 16 - cam, FLOOR - 44, 22, 40, CAS.redD);
    F.draw(ctx, 'OUT', 27 - cam, FLOOR - 58, CAS.gold, { center: true, shadow: '#0a0408' });
    X.rect(ctx, 64 - cam, FLOOR - 20, 2, 20, CAS.goldD);
    X.rect(ctx, 80 - cam, FLOOR - 20, 2, 20, CAS.goldD);
    X.curve(ctx, 65 - cam, FLOOR - 18, 72 - cam, FLOOR - 11, 81 - cam, FLOOR - 18, '#8a1228', 2, 7);
    AH.blit(ctx, AH.S.bouncer, 0, 52 - cam, FLOOR + 1);

    // the cloakroom
    X.rect(ctx, 92 - cam, FLOOR - 74, 2, 74, CAS.goldDD);
    X.rect(ctx, 120 - cam, FLOOR - 74, 2, 74, CAS.goldDD);
    X.rect(ctx, 92 - cam, FLOOR - 74, 30, 2, CAS.goldD);
    for (let i = 0; i < 4; i++) X.rect(ctx, 95 - cam + i * 7, FLOOR - 72, 3, 7, '#2e2030');
    F.draw(ctx, 'COATS', 107 - cam, FLOOR - 84, '#8a6a3a', { center: true, shadow: '#0a0408' });

    // and the doors nobody wants to draw
    for (const [dx, lab] of [[470, 'LOO'], [496, 'LOO']]) {
      X.plate(ctx, dx - cam, FLOOR - 40, 18, 40, CAS.blackL, '#33222e', CAS.blackD, 3);
      X.rect(ctx, dx - cam + 2, FLOOR - 37, 14, 20, CAS.redD);
      F.draw(ctx, lab, dx + 9 - cam, FLOOR - 50, '#8a6a3a', { center: true, shadow: false });
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
    g.save.credits -= STAKE; wager(g, STAKE);
    SLOT.at = i; SLOT.t = 0; SLOT.lever = 1; SLOT.win = 0; SLOT.msg = 0;
    // decide first, then make the reels land on the decision
    const r = U.rand();
    const JACK = vipTier(g) >= 3 ? 15 : 12;       // GOLD gets a better machine
    if (r < 0.03) { const k = U.randInt(0, 4); SLOT.land = [k, k, k]; SLOT.win = STAKE * JACK; }
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
      winLight(mx, FLOOR - 52, three ? 1.6 : 1);
      if (three) PD.chum.call(g, 'jackpot', true);
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
    X.rect(ctx, a0 + 10, CH2, W, FLOOR - CH2, CAS.black);
    const grd = ctx.createLinearGradient(0, CH2, 0, FLOOR);
    grd.addColorStop(0, '#12080e'); grd.addColorStop(1, '#4a0f1e');
    ctx.fillStyle = grd; ctx.fillRect(a0 + 10, CH2, W, FLOOR - CH2);
    // the arcade: six lit openings with a rank of little machines in each
    for (let i = 0; i < 11; i++) {
      const x = a0 + 26 + i * 34, hue = HUES[i % HUES.length];
      X.rect(ctx, x - 14, CH2 + 8, 28, 40, '#160a12');
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI + k * (Math.PI / 8);
        X.blob(ctx, x + Math.cos(a) * 14, CH2 + 8 + Math.sin(a) * 9, 2, 2, CAS.goldDD);
      }
      ctx.globalAlpha = 0.2; X.rect(ctx, x - 13, CH2 + 10, 26, 38, hue); ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.45; X.rect(ctx, x - 13, CH2 + 10, 26, 2, hue); ctx.globalAlpha = 1;
      for (let m = -1; m <= 1; m++) {
        X.rect(ctx, x + m * 8 - 3, CH2 + 34, 7, 14, CAS.blackD);
        X.rect(ctx, x + m * 8 - 3, CH2 + 32, 7, 2, CAS.blackL);
        const on = (Math.floor(t * 3.5) + i + m) % 4 !== 0;
        X.rect(ctx, x + m * 8 - 2, CH2 + 37, 5, 3, on ? hue : '#1d0c14');
      }
      X.rect(ctx, x - 18, CH2 + 6, 8, 44, CAS.blackL);                  // the pier
      X.rect(ctx, x - 18, CH2 + 6, 2, 44, CAS.goldDD);
    }
    // a rail along the front of it, and two chandeliers
    X.rect(ctx, a0 + 10, CH2 + 50, W, 3, CAS.goldDD);
    X.rect(ctx, a0 + 10, CH2 + 50, W, 1, CAS.goldD);
    for (let i = 0; i < 42; i++) X.rect(ctx, a0 + 14 + i * 9, CH2 + 53, 2, 6, CAS.redD);
    for (const gx of [a0 + 62, a0 + 190, a0 + 318]) {
      const cy = CH2 + 14 + Math.sin(t * 0.6 + gx) * 1;
      X.rect(ctx, gx, CH2, 1, 14, CAS.goldDD);
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * U.TAU + t * 0.22;
        X.blob(ctx, gx + Math.cos(a) * 7, cy + Math.sin(a) * 3, 2, 2, '#ffe9a8');
      }
      X.blob(ctx, gx, cy + 1, 4, 3, '#fff3b0');
      ctx.globalAlpha = 0.14; X.blob(ctx, gx, cy + 5, 20, 12, '#ffd34d'); ctx.globalAlpha = 1;
    }

    // the carpet, with the house diamond stamped into it
    X.rect(ctx, a0 + 10, FLOOR, W, VH - FLOOR, '#0c1119');
    for (let y = 0; y < VH - FLOOR; y += 6) {
      X.rect(ctx, a0 + 10, FLOOR + y, W, 6, y > 12 ? '#141d2a' : '#101722');
      for (let x = (y * 7) % 22; x < W; x += 22) {
        X.rect(ctx, a0 + 10 + x, FLOOR + y + 2, 8, 2, y > 12 ? '#8a1228' : '#101722');
      }
    }
    for (let x = 6; x < W; x += 34) {
      ctx.globalAlpha = 0.5;
      X.poly(ctx, [[a0 + 10 + x, FLOOR + 10], [a0 + 16 + x, FLOOR + 15],
        [a0 + 10 + x, FLOOR + 20], [a0 + 4 + x, FLOOR + 15]], '#0a1018');
      ctx.globalAlpha = 1;
    }
    X.rect(ctx, a0 + 10, FLOOR - 1, W, 2, CAS.blackD);
    X.rect(ctx, a0 + 10, FLOOR + 1, W, 1, '#8a1228');
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
    X.plate(ctx, a0 - 5, CLUB_CEIL + 2, 20, FLOOR - CLUB_CEIL - 2, CAS.blackL, CAS.goldDD, CAS.blackD, 3);
    X.rect(ctx, a0 + 3, CLUB_CEIL + 10, 5, FLOOR - CLUB_CEIL - 16, CAS.goldD);
    X.plate(ctx, a0 - 8, CLUB_CEIL, 26, 9, CAS.blackL, CAS.goldD, CAS.blackD, 3);
    X.plate(ctx, a0 - 8, FLOOR - 10, 26, 10, CAS.blackL, CAS.goldD, CAS.blackD, 3);
    for (let i = 0; i < 9; i++) {
      const on = (Math.floor(t * 5) + i) % 4 !== 0;
      X.blob(ctx, a0 + 5, CLUB_CEIL + 18 + i * 12, 2.5, 2.5, on ? '#ffd34d' : '#4a3a10');
    }
    X.rect(ctx, a0 + 10, CLUB_CEIL, W, 6, CAS.blackL);
    for (let i = 0; i <= 28; i++) {
      const on = (Math.floor(t * 6) + i) % 4 !== 0;
      X.blob(ctx, a0 + 18 + i * 13, CLUB_CEIL + 3, 2.5, 2.5, on ? '#ffd34d' : '#4a3a10');
    }
    const lit = Math.sin(t * 5) > -0.3;
    X.plate(ctx, a0 + 110, CLUB_CEIL - 22, 168, 22, CAS.redD, CAS.gold, CAS.blackD, 4);
    F.draw(ctx, 'THE GALAXY ROOM', a0 + 194, CLUB_CEIL - 18, lit ? CAS.gold : '#7a5c16',
      { center: true, shadow: CAS.blackD });
    F.draw(ctx, 'NO CREDIT  NO REFUNDS  NO PITY', a0 + 194, CLUB_CEIL - 9, CAS.redL,
      { center: true, shadow: CAS.blackD });

    for (let i = 0; i < 3; i++) drawMachine(ctx, g, t, cam, i);
    drawUniversalCab(ctx, g, t, cam);
    // the two who have been here since before you arrived
    for (const q of [{ x: 1076, k: 12 }, { x: 1284, k: 13 }, { x: 1400, k: 17 }]) {
      const K = AH.KIN[q.k % AH.KIN.length];
      const bob = Math.sin(t * 1.4 + q.x) * 1;
      kinShadow(ctx, q.x - cam, FLOOR, K);
      kinBreath(ctx, K, (Math.floor(t * 1.1 + q.x) % 8) === 0 ? 5 : 0, q.x - cam, FLOOR + bob, true);
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

  /* A small thing somebody has said, with the tail pointing down at them. */
  /* ===================================================== WHO IS THAT, THEN
     Everybody in the room is generated, and until they had names that meant
     nobody in the room was anybody. Stand next to one and a small tag comes up
     over them: what they are called, what they are, and what they do. It is
     the cheapest way to turn a crowd into a cast, and it costs one line of
     lookup because the generator already knows all three.

     Only the nearest one, and only when you are close enough to have read a
     badge, or the room fills up with labels. */
  function drawWhoTag(ctx, t, cam) {
    let best = null, bd = 44;
    for (const c of CLUBBERS) {
      if (c.say || c.emote) continue;
      const d = Math.abs(c.x - P.x);
      if (d < bd) { bd = d; best = c; }
    }
    if (!best) return;
    const K = AH.KIN[best.k % AH.KIN.length];
    const who = K.who || K.celeb || K.species || '?';
    const under = ((K.race || '') + (K.calling ? '  -  ' + K.calling : '')) || '';
    const w = Math.max(F.width(who, 1), F.width(under, 1)) + 12;
    const x = Math.round(U.clamp(best.x - cam - w / 2,
      Math.round(VIEW.x) + 3, Math.round(VIEW.x) + ZW - w - 3));
    const y = Math.round(FLOOR - K.h - 16);
    const fade = U.clamp((44 - bd) / 14, 0, 1) * 0.92;
    ctx.globalAlpha = fade;
    X.plate(ctx, x - 1, y - 1, w + 2, 20, '#0a0812', null, null, 3);
    X.plate(ctx, x, y, w, 18, '#151228', '#262048', '#08060e', 3);
    X.rect(ctx, x + 3, y, w - 6, 1, K.acc || CAS.gold);
    F.draw(ctx, who, x + w / 2, y + 3, '#e8e2f4', { center: true, shadow: false });
    F.draw(ctx, under, x + w / 2, y + 11, '#7a7498', { center: true, shadow: false });
    ctx.globalAlpha = 1;
  }

  /* ========================================================== THE BUBBLE
     It used to be a white box with a spike on it. Now it pops open, it holds
     two lines when it needs to, it carries the speaker's own colour along the
     top so you can tell who is talking without following the tail, and it
     bobs, because a bubble that sits perfectly still looks painted on. */
  function wrapSay(text, cap) {
    if (F.width(text, 1) <= cap) return [text];
    const words = text.split(' ');
    let best = 1, bestD = 1e9;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const d = Math.abs(F.width(a, 1) - F.width(b, 1)) + Math.max(0, Math.max(F.width(a, 1), F.width(b, 1)) - cap) * 4;
      if (d < bestD) { bestD = d; best = i; }
    }
    return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }

  /* The little drawn noises. Each one is whole pixels and nothing else. */
  function emoteArt(ctx, k, x, y, t) {
    const pulse = 1 + Math.sin(t * 7) * 0.12;
    if (k === 'heart') {
      const r = 3 * pulse;
      X.blob(ctx, x - 2, y - 1, r, r, '#ff5fa8');
      X.blob(ctx, x + 2, y - 1, r, r, '#ff5fa8');
      X.poly(ctx, [[x - 5, y], [x + 5, y], [x, y + 6]], '#ff5fa8');
      X.rect(ctx, x - 3, y - 3, 2, 1, '#ffb0d8');
    } else if (k === 'skull') {
      X.blob(ctx, x, y, 5, 4, '#e8e2f4');
      X.rect(ctx, x - 3, y + 3, 7, 3, '#e8e2f4');
      X.rect(ctx, x - 3, y - 1, 2, 3, '#1a1024'); X.rect(ctx, x + 2, y - 1, 2, 3, '#1a1024');
      X.rect(ctx, x - 1, y + 4, 1, 2, '#1a1024'); X.rect(ctx, x + 1, y + 4, 1, 2, '#1a1024');
    } else if (k === 'coin') {
      X.blob(ctx, x, y + 1, 5, 5, CAS.goldD);
      X.blob(ctx, x, y + 1, 3, 3, CAS.gold);
      F.draw(ctx, '$', x, y - 2, '#7a5c16', { center: true, shadow: false });
    } else if (k === 'wat') {
      F.draw(ctx, '?', x, y - 4, '#7ec8ff', { center: true, scale: 2, shadow: '#1a1024' });
    } else if (k === 'yell') {
      F.draw(ctx, '!', x, y - 4, '#ff5a4d', { center: true, scale: 2, shadow: '#1a1024' });
    } else if (k === 'zzz') {
      for (let i = 0; i < 3; i++) {
        F.draw(ctx, 'Z', x - 4 + i * 4, y - 4 + Math.sin(t * 3 + i) * 1 + i * 1, '#9a92b4',
          { center: true, shadow: false });
      }
    } else if (k === 'note') {
      X.blob(ctx, x - 2, y + 3, 3, 2, '#c9a0ff');
      X.rect(ctx, x, y - 4, 2, 7, '#c9a0ff');
      X.rect(ctx, x + 2, y - 4, 4, 2, '#c9a0ff');
    } else if (k === 'sweat') {
      X.poly(ctx, [[x, y - 5], [x + 4, y + 3], [x - 4, y + 3]], '#7ec8ff');
      X.blob(ctx, x, y + 2, 4, 3, '#7ec8ff');
      X.rect(ctx, x - 2, y, 1, 2, '#dff4fa');
    } else {                                              // ok
      X.line(ctx, x - 4, y + 1, x - 1, y + 4, '#8affa0', 2);
      X.line(ctx, x - 1, y + 4, x + 5, y - 4, '#8affa0', 2);
    }
  }

  function sayBubble(ctx, x, y, text, life, max, accent, emote, t) {
    /* Pop. The box SQUASHES open rather than growing: it is full width from
       the first frame and only its height comes up, because a box that grows
       sideways spends a tenth of a second at the wrong width with nothing in
       it, and if you catch that frame it reads as a broken bubble. */
    const m = max || 2.4;
    const grow = U.clamp((m - life) / 0.1, 0, 1);
    const fade = U.clamp(life * 3, 0, 1);
    const bob = Math.sin(t * 3.4 + x) * 0.8;

    const lines = emote ? [] : wrapSay(text, 132);
    let tw = 0;
    for (const l of lines) tw = Math.max(tw, F.width(l, 1));
    const fullW = emote ? 22 : tw + 12;
    const fullH = emote ? 20 : (lines.length > 1 ? 23 : 14);
    const w = fullW;
    const h = Math.max(5, Math.round(fullH * (0.34 + 0.66 * grow)));

    /* Home is zoomed: only a ZW-wide window of this frame is ever on screen,
       so clamping to the frame let bubbles slide off the side of the view. */
    const lo = Math.round(VIEW.x) + 3, hi = Math.round(VIEW.x) + ZW - w - 3;
    const bx = Math.round(U.clamp(x - w / 2, Math.min(lo, hi), Math.max(lo, hi)));
    const by = Math.round(y - h - 4 + bob);

    ctx.globalAlpha = fade;
    // a hard shadow, offset, so it stands off the wall behind it
    X.plate(ctx, bx + 1, by + 2, w, h, 'rgba(10,4,12,0.5)', null, null, 4);
    X.plate(ctx, bx - 1, by - 1, w + 2, h + 2, '#0d0918', null, null, 5);
    X.plate(ctx, bx, by, w, h, '#efeaf8', '#ffffff', '#a89ec4', emote ? 7 : 4);
    // the speaker's own colour, top and bottom, so you can tell who is talking
    // without having to follow the tail down
    X.rect(ctx, bx + 4, by, w - 8, 3, accent || '#9a92b4');
    X.rect(ctx, bx + 4, by + 1, w - 8, 1, '#ffffff');
    ctx.globalAlpha = fade * 0.5;
    X.rect(ctx, bx + 5, by + h - 2, w - 10, 1, accent || '#9a92b4');
    ctx.globalAlpha = fade;
    // the tail, stepped down to whoever said it
    const tx = Math.round(U.clamp(x, bx + 6, bx + w - 7));
    const lean = Math.sign(x - (bx + w / 2)) || 0;
    for (let i = 0; i < 6; i++) {
      const wd = Math.max(1, 6 - i);
      const px = tx - 2 + lean * i;
      X.rect(ctx, px - 1, by + h - 1 + i, wd + 2, 1, '#0d0918');
      X.rect(ctx, px, by + h - 1 + i, wd, 1, '#efeaf8');
    }

    if (grow > 0.62) {
      ctx.globalAlpha = fade * U.clamp((grow - 0.62) / 0.3, 0, 1);
      if (emote) emoteArt(ctx, emote, bx + w / 2, by + h / 2 - 1, t);
      else for (let i = 0; i < lines.length; i++) {
        F.draw(ctx, lines[i], bx + w / 2, by + (lines.length > 1 ? 5 : 4) + i * 9, '#1a1024',
          { center: true, shadow: false });
      }
    }
    ctx.globalAlpha = 1;
  }

  /* One regular. The body is a sprite; the tentacles are live, so they can
     wave about and, when two of them get together, wrap round each other. */
  /* One regular. The body is generated art; the tentacles are drawn live, in
     whatever number and colour that particular alien turned out to have, so
     they wave about and can wrap round each other. */
  /* They have legs now, so the walk is in the sprite rather than drawn under
     it. This is the shadow and nothing else. */
  /* HOW THEY MOVE. Every character carries a motion, and this is the one
     place it is turned into an offset, so a doorman, a dancer and a man at
     the bar all move the way that particular person moves: the bean hops,
     the bunny waddles, the jellyfish never touches the floor, the brute
     lumbers, and the slug barely moves at all. Returns [dx, dy]. */
  function kinMove(K, t, moving, seed) {
    const s = seed || 0;
    switch (K.motion) {
      case 'hop':    return [0, -Math.abs(Math.sin(t * (moving ? 9 : 3) + s)) * (moving ? 5 : 1.6)];
      case 'waddle': return [Math.round(Math.sin(t * (moving ? 7 : 2) + s) * (moving ? 1.5 : 0.6)),
        Math.abs(Math.sin(t * (moving ? 7 : 2) + s)) * -1];
      case 'float':  return [0, -5 + Math.sin(t * 1.8 + s) * 3];
      case 'lumber': return [0, moving ? Math.abs(Math.sin(t * 4 + s)) * 2 : Math.sin(t * 1.1 + s) * 0.6];
      case 'ooze':   return [0, Math.sin(t * 1.4 + s) * 0.5];
      case 'sway':   return [Math.round(Math.sin(t * 1.6 + s) * 1), Math.sin(t * 2.2 + s) * 0.8];
      case 'roll':   return [0, moving ? Math.sin(t * 20 + s) * 0.5 : 0];
      case 'still':  return [0, Math.sin(t * 0.9 + s) * 0.4];
      default:       return [0, Math.sin(t * (moving ? 7 : 3) + s) * (moving ? 1.4 : 1)];
    }
  }

  function kinShadow(ctx, x, y, K) { X.blob(ctx, x, y + 1, Math.round(K.w * 0.42), 3, '#0a0614'); }

  /* Drawn smoke. The smokers used to have no smoke at all, because the only
     way the room had of making any was a particle, and there are no particles
     in here. This is a curl: five discs on a slow sine, each one wider and
     fainter than the last, and it is attached to the head it comes out of. */
  function cigarCurl(ctx, x, y, t, seed) {
    for (let i = 0; i < 5; i++) {
      const q = i / 5, ph = t * 0.55 + seed;
      const sy = y - 4 - i * 6 - (ph % 1) * 5;
      const sx = x + Math.sin(ph * 1.7 + i * 0.9) * (2 + i * 2.2);
      ctx.globalAlpha = 0.11 * (1 - q * 0.85);
      X.blob(ctx, sx, sy, 3 + i * 2.4, 2 + i * 1.6, '#c9bce8');
      ctx.globalAlpha = 1;
    }
  }

  /* Everybody in the building goes through the same bounce as the market
     crowd: breathing when they stand, squash and stretch when they move,
     a hop and a landing when they dance. */
  const BODY = { walking: false, stepT: 0, ph: 0, dir: 1, jy: 0, land: 0, sitting: false };
  function kinBounce(ctx, K, frame, x, y, flip, moving, t, seed, dance) {
    BODY.walking = moving && !dance; BODY.stepT = t * 5.5 + seed; BODY.ph = seed; BODY.dir = flip ? -1 : 1;
    const h = dance ? Math.abs(Math.sin(t * 5.5)) : 0;
    BODY.jy = dance ? -h * 4 : 0;
    BODY.land = dance && h < 0.25 ? (0.25 - h) * 2.4 : 0;
    const b = PD.crowd.body(BODY, K, t);
    PD.crowd.bouncy(ctx, K, frame, x + b.dx, y + b.dy, flip, b.sx, b.sy, b.tilt);
  }

  // the ones who stand still -- dealers, the band, the seated -- still breathe
  function kinBreath(ctx, K, frame, x, y, flip) {
    const b = Math.sin(S.t * 2.2 + x * 0.37) * 0.03;
    PD.crowd.bouncy(ctx, K, frame, x, y, flip, 1 - b, 1 + b, 0);
  }

  function drawClubber(ctx, c, t, cam) {
    const K = AH.KIN[c.k % AH.KIN.length];
    const x = c.x - cam, y = FLOOR;
    const fast = c.dance > 0 ? 11 : (Math.abs(c.vx) > 1 ? 7 : 3);
    const mv = kinMove(K, c.t, Math.abs(c.vx) > 1 || c.dance > 0, c.k);
    const bob = mv[1] + (c.dance > 0 ? -Math.abs(Math.sin(c.t * 11)) * 2 : 0);
    const lean = (c.kiss > 0 ? c.face * 5 : 0) + mv[0];
    const top = y + bob;
    kinShadow(ctx, x, y, K);
    const moving = Math.abs(c.vx) > 1 || c.dance > 0;
    let face = c.cheer > 0 ? 6
      : (c.kiss > 0 ? 4 : (c.blink < 0 ? 5 : (c.say ? (Math.floor(c.t * 5) % 4 === 0 ? 10 : 3) : (moving ? (Math.floor(c.t * fast * 0.6) % 2 ? 1 : 2) : 0))));
    // and every so often, standing about, a mood crosses their face
    const mood = (c.t * 0.07 + c.k * 0.37) % 1;
    if (!moving && !c.say && c.cheer <= 0 && c.kiss <= 0 && mood < 0.07) face = [10, 7, 8, 9, 10, 4, 11][c.k % 7];
    if (c.dance > 0) face = [6, 10, 4, 6][Math.floor(c.t * 3) % 4];
    kinBounce(ctx, K, face, x + (c.kiss > 0 ? c.face * 5 : 0), y, c.face < 0, moving, c.t, c.k, c.dance > 0);
    // whatever they came in with, still in a tentacle
    if (c.drink >= 0 && c.kiss <= 0) {
      const dcol = ['#8affa0', '#ff8ad8', '#ffb03d', '#7ec8ff'][c.drink];
      const hx = x + c.face * (K.w * 0.52 + 3), hy = top - K.h * 0.42 + Math.sin(c.t * fast + 1) * 2;
      X.rect(ctx, hx - 2, hy, 5, 7, 'rgba(220,235,255,0.35)');
      X.rect(ctx, hx - 2, hy + 2, 5, 5, dcol);
      X.rect(ctx, hx - 2, hy, 5, 1, '#d8fbff');
    }
    // one big throbbing heart over whoever is getting on with it
    if (K.smoke && c.kiss <= 0) cigarCurl(ctx, x + c.face * 5, y - K.h, t, c.k * 1.7);
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

    // the plants you bought at the market, in a row along the floor
    const PL = g.save.plants || [];
    for (let i = 0; i < PL.length; i++) {
      const px2 = [66, 96, 120, 176, 190, 16][i] - cam;
      PD.market.plantAt(ctx, PL[i], px2, FLOOR + 2, t);
    }
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
      trash: 66, club: 118, clubout: 84, coat: 104, bar: 128, cage: 132,
      poker: 118, jack: 118, roulette: 142,
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
  /* The zoom is PER SCENE now. The moon and the house are small places and
     want to be close; the casino is four floors of building and wants to be
     seen. At ZK 1 the whole logical frame is on screen, you read half the
     size you used to, and the room reads twice as big -- and it is still
     crisp, because one home pixel lands on exactly two device pixels. */
  let ZW = 320, ZH = 180, ZK = VW / ZW;
  function setZoom(k) { ZK = k; ZW = Math.round(VW / k); ZH = Math.round(VH / k); }
  function zoomFor(scene) { return scene === 'club' ? 1 : 1.5; }
  const VIEW = { x: 120, y: 100 };

  function view(dt) {
    const cam = g0 ? g0.intCam : 0;
    const TOUR = S.scene === 'hub' && PD.cut.touring();
    const px = (CUT() ? PD.cut.focusX() : (TOUR ? PD.cut.tourShot().x : P.x)) - cam, gy = groundY(P.x);
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
      if (TOUR) {
        const sh = PD.cut.tourShot();
        if (dt !== undefined) setZoom(U.damp(ZK, sh.z, 0.05, dt));
        tx = U.clamp(px - ZW / 2, 0, VW - ZW);
        ty = U.clamp(sh.y - ZH * 0.58, 0, VH - ZH);
      }
      if (CUT()) {
        // the cutscene's camera: its own zoom, eased, and its own subject
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
  /* Screen pixels back into scene pixels, for taps and for the prompt sign. */
  function toScreen(x, y) { return { x: (x - Math.round(VIEW.x)) * ZK, y: (y - Math.round(VIEW.y)) * ZK }; }
  function fromScreenX(sx) { return Math.round(VIEW.x) + sx / ZK; }

  /* Everything in the world. Painted into the zoom buffer, never straight to
     the screen. */
  function drawScene(ctx, g, t) {
    const cam = Math.round(g.intCam);
    if (CUT()) {
      PD.cut.drawBack(ctx, g, t, cam);
      if (!PD.cut.hidePlayer()) drawPlayer(ctx, g, cam, t);
      PD.cut.drawFront(ctx, g, t, cam);
      return;
    }
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
    if (!(S.scene === 'hub' && PD.cut.touring())) drawPlayer(ctx, g, cam, t);

  }

  /* Signs, speech and the sleep fade, drawn on the screen at screen size so
     the zoom does not turn the lettering into billboards. */
  function drawOverlay(ctx, g, t) {
    if (CUT()) { PD.cut.drawOverlay(ctx, g, t); return; }
    if (S.scene === 'hub' && PD.cut.touring()) {
      PD.crowd.overlay(ctx, hubWorld(), t, Math.round(g.intCam), S.deck, DECK_Y[S.deck], -9999, toScreen);
      PD.cut.drawTourOverlay(ctx, g, t);
      return;
    }
    if (UI.mode === 'build') { drawBuildPanel(ctx, g, t); return; }
    if (UI.mode === 'lift') { drawLiftPanel(ctx, g, t); return; }
    if (UI.mode === 'hub') { drawHubPanel(ctx, g, t); return; }
    if (S.scene === 'hub') {
      const cam = Math.round(g.intCam);
      PD.crowd.overlay(ctx, hubWorld(), t, cam, S.deck, DECK_Y[S.deck], P.x, toScreen);
      // the stallholders, shouting their prices at nobody in particular
      for (const st of PD.market.STALLS) {
        if (st.deck !== S.deck) continue;
        const ph = (t * 0.25 + st.x * 0.013) % 1;
        if (ph > 0.3) continue;
        const line = st.shout[Math.floor(t * 0.25 + st.x * 0.013) % st.shout.length];
        const sc = toScreen(st.x - cam, DECK_Y[S.deck] - 74);
        if (sc.x < -40 || sc.x > VW + 40) continue;
        const w = F.width(line, 1) + 10, k = Math.min(1, ph * 30);
        ctx.globalAlpha = Math.min(1, (0.3 - ph) * 12);
        X.plate(ctx, sc.x - w / 2 - 1, sc.y - 13, w + 2, 13, '#1a1020', null, null, 4);
        X.plate(ctx, sc.x - (w / 2) * k, sc.y - 12, w * k, 11, '#fff6d8', '#ffffff', '#c8b890', 4);
        if (k >= 1) F.draw(ctx, line, sc.x, sc.y - 10, '#3a1a10', { center: true, shadow: false });
        ctx.globalAlpha = 1;
      }
    }
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
    /* What you still owe the shark -- but NOT in the casino. A man does not
       want the number over his shoulder while he is deciding whether to have
       another go, and the house would never let you see it either. */
    if (S.scene !== 'club') PD.chum.drawDebt(ctx, g, 8, VH - 30);
    else drawBalance(ctx, g, t);
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
    // the hat, if you bought one and are wearing it
    if (g.save.hat >= 0 && g.save.hat !== undefined && g.save.hat !== null) {
      const hy = y - 31 * sq + (P.land > 0 ? P.land * 6 : 0);
      PD.market.hatAt(ctx, g.save.hat, x + P.face * 1, hy, PD.market.HAT_COL[g.save.hat]);
    }
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


  /* --------------------------------------------------------------- the band
     What is playing where. The casino has its own number, and if you have
     asked the act on the lounge stage for something then they are playing
     that instead until you ask for something else. */
  function track() {
    if (CUT()) return PD.cut.track();
    if (S.scene === 'club') return S.song || 'casino';
    if (S.scene === 'hub') return 'port';
    return 'moon';
  }

  PD.home = { enter, update, draw, drawScene, playSlot, SLOT, track,
    drunk: () => (S.scene === 'club' ? S.drunk : 0), drawOverlay, view, toScreen, fromScreenX, closeScene, touchMode, leaveDesk, say, P, UI, S, groundY,
    get ZW() { return ZW; }, get ZH() { return ZH; }, get ZK() { return ZK; }, ROOM_W: OUT_W, SPOTS,
    TRASH, CLUB_X, CLUB_SPOTS, CLUBBERS, moonClean, trashLeft, sweep, goClub, leaveClub, spots, nearest, use,
    playCards, playRoulette, CARD, ROU, POKER_X, ROU_X, JACK_X, BAR_X, CAGE_X,
    vipTier, VIP, salonOpen, ROPE_X, CRAPS_X, STAGE_X, BACC_X, SONGS,
    clubW, CDECKS, LIFT_X, rideLift, NPCS, NPC_STATE, talkTo, MEGA, MEGA_X, CLAW_X, LOAN_X, PRIZE_X, CRY,
    goHub, leaveHub, HUB, HUB_W, DECK_Y, STALLS,
    enterCut, drawPlayer, kinMove, cam: () => Math.round(g0 ? g0.intCam : 0) };
})(window.PD);
