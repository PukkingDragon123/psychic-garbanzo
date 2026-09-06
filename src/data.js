/* Static game data: materials, celestial bodies, upgrades, enemy stats. */
(function (PD) {
  'use strict';

  /* ---------------------------------------------------------------- materials
     `hp`     drill work needed to break one tile
     `kg`     cargo weight of one tile
     `cr`     credits per tile when sold
     `shine`  draw a twinkling sparkle overlay (gems / exotics)            */
  const MAT = [
    { id: 0,  key: 'empty',  name: 'Vacuum',      hp: 0,    kg: 0,    cr: 0,     c: ['#000000', '#000000', '#000000'] },
    { id: 1,  key: 'crust',  name: 'Regolith',    hp: 20,   kg: 0.7,  cr: 3,     c: ['#8a6a4f', '#6d5240', '#4e3a2d'] },
    { id: 2,  key: 'stone',  name: 'Slagstone',   hp: 34,   kg: 1.0,  cr: 6,     c: ['#767b8c', '#5b6070', '#414654'] },
    { id: 3,  key: 'ice',    name: 'Blue Ice',    hp: 28,   kg: 0.8,  cr: 11,     c: ['#a9e6f5', '#79c4de', '#4f96b5'] },
    { id: 4,  key: 'iron',   name: 'Iron',        hp: 56,   kg: 2.4,  cr: 26,    c: ['#c58f74', '#9c6a54', '#6f4a3c'] },
    { id: 5,  key: 'copper', name: 'Copper',      hp: 78,   kg: 2.2,  cr: 38,    c: ['#f0a35e', '#c67a3d', '#8e5227'] },
    { id: 6,  key: 'silver', name: 'Silver',      hp: 96,   kg: 2.8,  cr: 78,    c: ['#e6f0fa', '#b3c4d8', '#7f90a6'], shine: 1 },
    { id: 7,  key: 'gold',   name: 'Gold',        hp: 112,  kg: 3.6,  cr: 165,   c: ['#ffe066', '#e0a92b', '#a97612'], shine: 1 },
    { id: 8,  key: 'emerald',name: 'Emerald',     hp: 130,  kg: 1.6,  cr: 340,   c: ['#7bf5a8', '#33c470', '#178c47'], shine: 1 },
    { id: 9,  key: 'sapphire',name:'Sapphire',    hp: 148,  kg: 1.7,  cr: 620,   c: ['#8fb6ff', '#4d7ae8', '#2749a8'], shine: 1 },
    { id: 10, key: 'ruby',   name: 'Ruby',        hp: 172,  kg: 1.8,  cr: 1150,  c: ['#ff8fa6', '#e8425f', '#a41834'], shine: 1 },
    { id: 11, key: 'void',   name: 'Voidstone',   hp: 215,  kg: 4.5,  cr: 2600,  c: ['#b98cff', '#7d4fd6', '#4a2591'], shine: 1 },
    { id: 12, key: 'star',   name: 'Starmetal',   hp: 255,  kg: 5.5,  cr: 7200,  c: ['#fff3b0', '#ffc44d', '#e06a1f'], shine: 1 },
    { id: 13, key: 'core',   name: 'Planet Core', hp: 255,  kg: 0,    cr: 0,     c: ['#ffd9a0', '#ff8a3d', '#c93b1c'], shine: 1 },
    { id: 14, key: 'shell',  name: 'Shellrock',   hp: 190,  kg: 3.0,  cr: 45,    c: ['#5d6b7a', '#46525e', '#333c46'] },
    { id: 15, key: 'basalt', name: 'Basalt',      hp: 62,   kg: 1.3,  cr: 8,     c: ['#5a4a4a', '#3f3336', '#2a2226'] },
    { id: 16, key: 'obsid',  name: 'Obsidian',    hp: 205,  kg: 1.6,  cr: 58,    c: ['#7a6a9a', '#3a2f52', '#1d1730'], shine: 1 },
    { id: 17, key: 'lava',   name: 'Magma',       hp: 140,  kg: 0,    cr: 0,     c: ['#ffd27a', '#ff7a2a', '#c93b1c'], hazard: 14, glow: '#ff8a3d', drop: 15 },
    { id: 18, key: 'ameth',  name: 'Amethyst',    hp: 165,  kg: 1.5,  cr: 480,   c: ['#c9a0ea', '#8455c4', '#4f2a80'], shine: 1 },
    { id: 19, key: 'diamond',name: 'Diamond',     hp: 245,  kg: 1.2,  cr: 4200,  c: ['#ffffff', '#b8f0ff', '#68b7d8'], shine: 1 },
    { id: 20, key: 'titan',  name: 'Titanium',    hp: 155,  kg: 3.0,  cr: 240,   c: ['#d8dde8', '#8a94aa', '#5a6378'] },
    { id: 21, key: 'uran',   name: 'Uranium',     hp: 175,  kg: 4.0,  cr: 1600,  c: ['#d8ff5a', '#7fbf1a', '#3f6a0a'], shine: 1, glow: '#a6ff3d', toxic: 1 },
    { id: 22, key: 'crystal',name: 'Cave Crystal',hp: 92,   kg: 1.1,  cr: 95,    c: ['#c4dbe6', '#7f9fb4', '#4f6a80'], shine: 1, glow: '#9fc8e0', glowR: 10 },
    { id: 23, key: 'fossil', name: 'Xeno Fossil', hp: 115,  kg: 1.4,  cr: 2200,  c: ['#f1e6c8', '#c4b48a', '#8a7a52'], shine: 1 },
    { id: 24, key: 'relic',  name: 'Precursor Relic', hp: 235, kg: 2.0, cr: 26000, c: ['#ffe9a0', '#e0a92b', '#7a4c10'], shine: 1, glow: '#ffd34d' },
    { id: 25, key: 'frost',  name: 'Permafrost',  hp: 24,   kg: 0.6,  cr: 5,     c: ['#d4eef7', '#a2ccdd', '#6f9db0'] },
    { id: 26, key: 'aether', name: 'Aetherium',   hp: 255,  kg: 0.9,  cr: 48000, c: ['#ffffff', '#c9a8ff', '#7a4fd6'], shine: 1, glow: '#d8bcff' },
    { id: 27, key: 'hull',   name: 'Precursor Plate', hp: 215, kg: 2.6, cr: 60,  c: ['#8fa0b8', '#5c6a82', '#3a4456'] },
    { id: 28, key: 'fungus', name: 'Glowcap',     hp: 18,   kg: 0.4,  cr: 7,     c: ['#6fd9a8', '#2f7f62', '#1a4a3a'], glow: '#5fffb0', glowR: 9 },
    { id: 29, key: 'bio',    name: 'Bio Sample',  hp: 0,    kg: 0.5,  cr: 340,   c: ['#ff9ecb', '#d64f8a', '#8a2a56'], shine: 1 }
  ];
  const M = {};
  for (const m of MAT) M[m.key] = m.id;

  /* ------------------------------------------------------------------ enemies */
  const ENEMY = {
    crawler:  { name: 'Rock Grub',    hp: 16,  dmg: 7,   speed: 22, w: 12, h: 9,  cr: 14,  kind: 'crawl' },
    floater:  { name: 'Void Jelly',   hp: 12,  dmg: 9,   speed: 16, w: 11, h: 13, cr: 20,  kind: 'float' },
    spitter:  { name: 'Spitworm',     hp: 26,  dmg: 7,   speed: 12, w: 13, h: 11, cr: 38,  kind: 'spit',   tele: 0.55 },
    gnasher:  { name: 'Gnasher',      hp: 54,  dmg: 17,  speed: 44, w: 15, h: 12, cr: 90,  kind: 'charge', tele: 0.45 },
    mite:     { name: 'Cave Mite',    hp: 6,   dmg: 4,   speed: 60, w: 7,  h: 6,  cr: 9,   kind: 'swarm' },
    shellback:{ name: 'Shellback',    hp: 140, dmg: 20,  speed: 14, w: 20, h: 14, cr: 260, kind: 'crawl',  armor: 0.6 },
    wyrm:     { name: 'Magma Wyrm',   hp: 120, dmg: 26,  speed: 30, w: 22, h: 14, cr: 420, kind: 'charge', tele: 0.6, fire: 1 },
    lurker:   { name: 'Deep Lurker',  hp: 110, dmg: 22,  speed: 26, w: 19, h: 16, cr: 240, kind: 'spit',   tele: 0.7 },
    guardian: { name: 'Core Warden',  hp: 380, dmg: 28,  speed: 22, w: 26, h: 24, cr: 1100, kind: 'boss', tele: 0.8 }
  };

  /* ---------------------------------------------------------------- strata
     Worlds are layered like a cake: each stratum is a depth band with its own
     base rock, ore table, cave density and light. `alt` is a pocket biome
     that replaces the band wherever the biome noise runs hot, so two dives on
     the same world never read the same. Depth fractions: 0 surface, 1 core. */
  function L(name, a, b, fills, ores, caves, tint, extra) {
    return Object.assign({ name, a, b, fills, ores, caves, tint }, extra || {});
  }
  const STRATA = {
    rock: [
      L('REGOLITH CRUST', 0, 0.28, [['crust', 5], ['stone', 3]], [['iron', 10], ['copper', 3]], 0.30, '#3a2a20',
        { alt: { fills: [['stone', 1]], ores: [['iron', 14], ['silver', 2]] } }),
      L('IRON SEAMS', 0.28, 0.72, [['stone', 4], ['basalt', 2]], [['iron', 12], ['copper', 7], ['silver', 3]], 0.34, '#2a2230',
        { alt: { fills: [['basalt', 1]], ores: [['copper', 10], ['gold', 2], ['ameth', 1]] } }),
      L('DENSE MANTLE', 0.72, 1.01, [['basalt', 3], ['shell', 1]], [['silver', 4], ['gold', 2], ['ameth', 1]], 0.26, '#1e1a2a')
    ],
    ice: [
      L('PERMAFROST', 0, 0.3, [['frost', 5], ['ice', 3]], [['iron', 5], ['silver', 3]], 0.32, '#1a2a3a',
        { alt: { fills: [['ice', 1]], ores: [['crystal', 8], ['sapphire', 2]] }, snow: 1 }),
      L('CRYSTAL CAVERNS', 0.3, 0.7, [['ice', 3], ['stone', 2], ['crystal', 2]], [['crystal', 9], ['sapphire', 5], ['silver', 4], ['gold', 1]], 0.46, '#15304a',
        { alt: { fills: [['crystal', 1]], ores: [['sapphire', 6], ['diamond', 1]] }, sparkle: 1 }),
      L('GLACIAL CORE', 0.7, 1.01, [['ice', 2], ['shell', 2]], [['sapphire', 5], ['diamond', 2], ['titan', 2]], 0.28, '#0e1e34', { snow: 1 })
    ],
    metal: [
      L('SLAG CRUST', 0, 0.26, [['stone', 4], ['basalt', 2]], [['iron', 12], ['copper', 8]], 0.28, '#2a201c'),
      L('TITANIUM SEAMS', 0.26, 0.68, [['basalt', 3], ['stone', 2]], [['iron', 8], ['titan', 6], ['silver', 5], ['gold', 3]], 0.34, '#241a1c',
        { alt: { fills: [['shell', 1]], ores: [['titan', 10], ['emerald', 2]] } }),
      L('OBSIDIAN HEART', 0.68, 1.01, [['obsid', 2], ['basalt', 2], ['shell', 1]], [['gold', 4], ['uran', 2], ['emerald', 2]], 0.3, '#1a1220', { embers: 1 })
    ],
    gem: [
      L('QUARTZ SHELL', 0, 0.24, [['stone', 4], ['crystal', 2]], [['crystal', 8], ['iron', 4], ['gold', 3]], 0.34, '#1e2a30', { sparkle: 1 }),
      L('JEWEL GALLERIES', 0.24, 0.68, [['stone', 3], ['crystal', 3]], [['emerald', 6], ['sapphire', 6], ['ameth', 5], ['gold', 4], ['ruby', 2]], 0.5, '#182a2e',
        { alt: { fills: [['crystal', 1]], ores: [['ruby', 5], ['diamond', 2]] }, sparkle: 1 }),
      L('DIAMOND ROOT', 0.68, 1.01, [['shell', 2], ['obsid', 2]], [['ruby', 5], ['diamond', 3], ['void', 2]], 0.3, '#14182a')
    ],
    moon: [
      L('DEAD REGOLITH', 0, 0.3, [['crust', 4], ['basalt', 3]], [['iron', 6], ['titan', 3], ['silver', 3]], 0.28, '#24242e'),
      L('FOSSIL BEDS', 0.3, 0.7, [['basalt', 3], ['stone', 3]], [['fossil', 2], ['gold', 4], ['sapphire', 4], ['ruby', 3]], 0.38, '#20202c',
        { alt: { fills: [['shell', 1]], ores: [['fossil', 4], ['void', 3]] } }),
      L('HOLLOW MANTLE', 0.7, 1.01, [['shell', 3], ['obsid', 1]], [['ruby', 4], ['void', 4], ['uran', 2], ['star', 1]], 0.44, '#181828')
    ],
    terra: [
      L('TOPSOIL', 0, 0.2, [['crust', 5], ['stone', 3]], [['iron', 6], ['copper', 5], ['gold', 2]], 0.3, '#2a2a1a'),
      L('GLOWCAP HOLLOWS', 0.2, 0.46, [['stone', 3], ['fungus', 3]], [['emerald', 6], ['copper', 4], ['crystal', 3]], 0.52, '#12301f',
        { alt: { fills: [['fungus', 1]], ores: [['emerald', 8]] }, spores: 1 }),
      L('CRYSTAL VAULTS', 0.46, 0.7, [['stone', 2], ['crystal', 3]], [['sapphire', 5], ['ameth', 5], ['gold', 4]], 0.44, '#152a34', { sparkle: 1 }),
      L('MAGMA SEA', 0.7, 0.9, [['basalt', 4], ['obsid', 1]], [['ruby', 7], ['gold', 3], ['void', 3]], 0.36, '#301410', { lava: 0.12, embers: 1 }),
      L('CORE SHELL', 0.9, 1.01, [['shell', 3], ['obsid', 1]], [['void', 5], ['star', 2], ['diamond', 1]], 0.26, '#1a1220')
    ],
    volcanic: [
      L('ASH CRUST', 0, 0.22, [['basalt', 5], ['crust', 2]], [['iron', 5], ['copper', 4], ['obsid', 3]], 0.3, '#2a1a16', { embers: 1 }),
      L('LAVA TUBES', 0.22, 0.62, [['basalt', 4], ['obsid', 2]], [['ruby', 7], ['gold', 4], ['titan', 3], ['void', 2]], 0.5, '#33150e',
        { lava: 0.16, embers: 1, alt: { fills: [['obsid', 1]], ores: [['ruby', 8], ['diamond', 1]] } }),
      L('OBSIDIAN MANTLE', 0.62, 1.01, [['obsid', 3], ['shell', 2]], [['void', 6], ['star', 3], ['uran', 2]], 0.3, '#1e1020', { lava: 0.05, embers: 1 })
    ],
    titan: [
      L('CRYSTAL RIND', 0, 0.3, [['crystal', 4], ['shell', 1]], [['sapphire', 6], ['ameth', 5], ['titan', 3]], 0.4, '#1c2440', { sparkle: 1 }),
      L('PRISM GALLERIES', 0.3, 0.72, [['crystal', 3], ['obsid', 2]], [['ruby', 5], ['diamond', 4], ['void', 5], ['star', 2]], 0.52, '#1e1a44',
        { sparkle: 1, alt: { fills: [['shell', 1]], ores: [['diamond', 5], ['aether', 1]] } }),
      L('AETHER WELL', 0.72, 1.01, [['obsid', 2], ['shell', 2]], [['void', 6], ['star', 4], ['aether', 1]], 0.34, '#160f30')
    ],
    core: [
      L('IRRADIATED SHELL', 0, 0.3, [['shell', 4], ['obsid', 2]], [['uran', 5], ['titan', 4], ['void', 3]], 0.3, '#221a10', { embers: 1 }),
      L('STARMETAL VEINS', 0.3, 0.72, [['shell', 3], ['obsid', 3]], [['star', 8], ['void', 6], ['ruby', 3], ['diamond', 2]], 0.4, '#2a1a14',
        { lava: 0.06, embers: 1, alt: { fills: [['obsid', 1]], ores: [['aether', 2], ['star', 6]] } }),
      L('THE HEART', 0.72, 1.01, [['shell', 3], ['obsid', 1]], [['star', 6], ['aether', 2], ['void', 3]], 0.3, '#1a0c18')
    ]
  };

  /* Foliage: what grows on exposed rock in each band. The renderer draws these
     as real curved shapes -- stems, caps, fronds -- not tiles. */
  const FLORA = {
    rock:     [['pebble', 'boulder', 'moss'], ['pebble', 'root'], ['crystal', 'pebble']],
    ice:      [['icespike', 'frond'], ['crystal', 'icespike'], ['icespike', 'crystal']],
    metal:    [['boulder', 'pebble'], ['pebble', 'ember'], ['ember', 'crystal']],
    gem:      [['crystal', 'coral'], ['crystal', 'coral'], ['crystal']],
    moon:     [['pebble', 'bone', 'boulder'], ['bone', 'pebble'], ['tendril', 'bone']],
    terra:    [['grass', 'fern', 'frond'], ['shroom', 'moss', 'tendril'], ['crystal', 'coral'], ['ember', 'root'], ['tendril']],
    volcanic: [['ember', 'root'], ['ember', 'tendril'], ['ember', 'crystal']],
    titan:    [['crystal', 'coral'], ['crystal', 'tendril'], ['crystal']],
    core:     [['ember', 'bone'], ['ember', 'tendril'], ['tendril', 'crystal']]
  };
  for (const k in STRATA) {
    const f = FLORA[k] || FLORA.rock;
    STRATA[k].forEach((band, i) => { band.flora = f[Math.min(i, f.length - 1)]; });
  }

  /* ----------------------------------------------------------------- lore
     Who is out here, what they want, and what they will say about it. */
  const FACTIONS = {
    reavers:  { name: 'THE REAVERS', col: '#ff5a4d', blurb: 'Pirates with whistling arrows and a code they mostly ignore.' },
    nova:     { name: 'NOVA WATCH',  col: '#8fb6ff', blurb: 'The law. Neat helmets, long memories, longer paperwork.' },
    krael:    { name: 'THE KRAEL ASCENDANCY', col: '#8affa0', blurb: 'An empire of very serious people who signed a peace treaty and are furious about it.' },
    gilded:   { name: 'THE GILDED',  col: '#ffd34d', blurb: 'Gold-skinned perfectionists. Easily offended. Excellent drones.' },
    curator:  { name: 'THE COLLECTION', col: '#c9a0ff', blurb: 'One pale man, one museum, one very large budget.' },
    celestial:{ name: 'THE CELESTIALS', col: '#ff8ad8', blurb: 'Dead giants. You are standing in one of their skulls.' }
  };

  /* Every world carries a line of history you can read on the chart. */
  const LORE = [
    'Chipped off a bigger rock during a Reaver bar fight. Still has the dents.',
    'A Nova Watch impound lot until the paperwork expired. Nobody renewed it.',
    'Frozen mid-scream. The Krael insist it was always like that.',
    'A Gilded foundry moon. They fired everyone for using the wrong gold.',
    'The Collection bid on this whole world. The Curator was outbid by a mining guild. He is still cross.',
    'Somebody’s dead moon. The Reavers use it to settle arguments.',
    'Alive, allegedly. It hums when you drill it and the Krael call that a coincidence.',
    'A furnace world the Ascendancy uses to test how loud a person can scream.',
    'One enormous cut stone. The Gilded consider looking at it a crime.',
    'The vault at the middle of everything. The Celestials built it and then died of it.'
  ];

  /* The Orb: a purple stone in a silver casing. Everyone wants it. Nobody who
     has held one is available for comment. */
  const ORB = {
    name: 'THE ORB', worth: 250000,
    lines: [
      'THE CURATOR: Name your price. Then double it. Then bring it here.',
      'NOVA WATCH: Surrender the artefact. There is a form. There is always a form.',
      'REAVERS: Bluefin says hand it over and he will only whistle at you a little.',
      'THE KRAEL: That belongs to the Ascendancy. Everything belongs to the Ascendancy.'
    ]
  };

  /* The pod's tape deck. */
  const MIX = [
    'HOOKED ON A CEILING', 'AIN’T NO MOUNTAIN LOW ENOUGH', 'COME AND GET YOUR ORE',
    'MOONAGE DRILLDREAM', 'O-O-H CHILD, THAT’S URANIUM', 'FOOLED AROUND AND BROKE A PLANET',
    'ESCAPE (THE ORE-COLADA SONG)', 'CHERRY BOMB CRATER'
  ];

  /* ---------------------------------------------------------------- your moon
     The hub is a dead little moon you own. Five buildings stand on it, each
     one raised from a hologram blueprint by the multi-purpose tool and each
     one levelled with credits. No staff, no menus that are not a building. */
  const BUILDINGS = [
    {
      id: 'docks', name: 'THE DOCKS', glyph: 'home', x: 150, max: 5, base: 900, start: 1,
      blurb: 'Your pod lives here, and so does the tape deck. Fit the parts you fabricate.'
    },
    {
      id: 'terminal', name: 'TERMINAL', glyph: 'sell', x: 330, max: 6, base: 500, start: 1,
      blurb: 'Sell ore. Argue with a raccoon. Each level lifts prices.'
    },
    {
      id: 'fab', name: 'FABRICATOR', glyph: 'build', x: 500, max: 4, base: 700, start: 0,
      blurb: 'Turns ore into pod parts. Each level opens a tier of recipes.'
    },
    {
      id: 'mind', name: 'THE MIND', glyph: 'eye', x: 690, max: 4, base: 1600, start: 0,
      blurb: 'A Celestial brain in a tank of acid. It knows everything and resents being asked.'
    },
    {
      id: 'obs', name: 'OBSERVATORY', glyph: 'planet', x: 880, max: 4, base: 3000, start: 1,
      blurb: 'Finds worlds worth ruining. Each level opens another sector.'
    }
  ];
  const BUILD = {};
  for (const b of BUILDINGS) BUILD[b.id] = b;
  function buildCost(b, level) {
    return Math.round(b.base * Math.pow(1.85, Math.max(0, level - (b.start || 0))) / 10) * 10;
  }

  /* ------------------------------------------------------------ the fabricator
     Ore in, pod parts out. A part is fitted at the docks and adds levels to
     the stat it names. Tiers open with the fabricator's own level. */
  const RECIPES = [
    { id: 'plate',   name: 'HULL PLATE',    glyph: 'hull',   tier: 1, mats: { iron: 6, stone: 6 },     gives: { hull: 2 },              blurb: 'Bolted armour. +52 hull.' },
    { id: 'scrub',   name: 'AIR SCRUBBER',  glyph: 'o2',     tier: 1, mats: { ice: 4, copper: 3 },     gives: { oxygen: 2 },            blurb: 'Breathes for you. +52 air.' },
    { id: 'bit',     name: 'TUNGSTEN BIT',  glyph: 'drill',  tier: 1, mats: { iron: 8, copper: 4 },    gives: { drill: 2, reach: 1 },   blurb: 'Chews harder rock, wider.' },
    { id: 'coil',    name: 'THRUST COIL',   glyph: 'speed',  tier: 2, mats: { copper: 6, silver: 2 },  gives: { thruster: 2, dash: 1 }, blurb: 'Punchier jets and a quicker dash.' },
    { id: 'spool',   name: 'WIRE SPOOL',    glyph: 'belt',   tier: 2, mats: { iron: 10, silver: 3 },   gives: { tether: 2 },            blurb: 'Twelve more metres of wire.' },
    { id: 'magnet',  name: 'ORE MAGNET',    glyph: 'weight', tier: 2, mats: { iron: 4, gold: 2 },      gives: { magnet: 2, cargo: 1 },  blurb: 'Pulls loot from further away.' },
    { id: 'lens',    name: 'SCAN LENS',     glyph: 'scan',   tier: 3, mats: { crystal: 4, sapphire: 2 }, gives: { scanner: 2, lamp: 2 }, blurb: 'Sees ore through rock.' },
    { id: 'cell',    name: 'VOID CELL',     glyph: 'lance',  tier: 3, mats: { void: 2, gold: 4 },      gives: { lance: 1, trigger: 2 }, blurb: 'Powers the plasma lance.' },
    { id: 'heart',   name: 'STAR HEART',    glyph: 'star',   tier: 4, mats: { star: 2, diamond: 1 },   gives: { drill: 3, oxygen: 3, cargo: 3 }, blurb: 'A piece of a sun, in a box.' }
  ];
  const RECIPE = {};
  for (const r of RECIPES) RECIPE[r.id] = r;

  /* ------------------------------------------------------------------ the mind
     The skill tree is a brain. Neurons sit in rings around the stem; a neuron
     fires (can be bought) once one it is wired to has a level, and the mind's
     own level decides how deep the rings go. Angles are degrees, 0 = up. */
  const NEURONS = [
    { id: 'drill',    ring: 0, a: 0,   links: [] },
    { id: 'oxygen',   ring: 1, a: 300, links: ['drill'] },
    { id: 'cargo',    ring: 1, a: 60,  links: ['drill'] },
    { id: 'pistol',   ring: 1, a: 120, links: ['drill'] },
    { id: 'thruster', ring: 1, a: 180, links: ['drill'] },
    { id: 'hull',     ring: 1, a: 240, links: ['drill'] },
    { id: 'reach',    ring: 1, a: 0,   links: ['drill'] },
    { id: 'lamp',     ring: 2, a: 285, links: ['oxygen'] },
    { id: 'lung',     ring: 2, a: 320, links: ['oxygen'] },
    { id: 'magnet',   ring: 2, a: 45,  links: ['cargo'] },
    { id: 'belly',    ring: 2, a: 80,  links: ['cargo'] },
    { id: 'trigger',  ring: 2, a: 110, links: ['pistol'] },
    { id: 'scatter',  ring: 2, a: 140, links: ['pistol'] },
    { id: 'dash',     ring: 2, a: 175, links: ['thruster'] },
    { id: 'tether',   ring: 2, a: 210, links: ['thruster', 'hull'] },
    { id: 'ironskin', ring: 2, a: 245, links: ['hull'] },
    { id: 'scanner',  ring: 2, a: 10,  links: ['reach'] },
    { id: 'greed',    ring: 3, a: 30,  links: ['magnet', 'scanner'] },
    { id: 'lance',    ring: 3, a: 125, links: ['trigger', 'scatter'] },
    { id: 'refine',   ring: 3, a: 70,  links: ['belly'] },
    { id: 'drones',   ring: 3, a: 200, links: ['dash', 'tether'] },
    { id: 'crew',     ring: 3, a: 265, links: ['ironskin', 'lamp'] },
    { id: 'kiln',     ring: 3, a: 335, links: ['lung'] }
  ];
  const NEURON = {};
  for (const n of NEURONS) NEURON[n.id] = n;

  /* -------------------------------------------------------------------- zones
     The galaxy is four sectors. Each one past the first is locked behind a
     drive you buy outright -- that is the only travel gate in the game. */
  const ZONES = [
    {
      id: 'home', name: 'THE SKULL REACH', sub: 'You live in a dead giant\u2019s head. Rent is cheap.',
      star: '#ffd34d', tint: '#8a6a4f', x: 96, y: 178, bodies: [0, 1, 2], drive: null
    },
    {
      id: 'ember', name: 'THE FORGE BELT', sub: 'Gilded foundries, Reaver chop shops, things with teeth.',
      star: '#ff8a3d', tint: '#c67a3d', x: 196, y: 106, bodies: [3, 4],
      drive: { name: 'ION SLED', cost: 26000, blurb: 'Burns hot enough to cross the belt.' }
    },
    {
      id: 'rot', name: 'THE ROT', sub: 'Dead moons. Rude fossils. Nova Watch patrols that never look up.',
      star: '#7ef9ff', tint: '#b3c4d8', x: 300, y: 182, bodies: [5, 6],
      drive: { name: 'FOLD COIL', cost: 420000, blurb: 'Folds the gap to the dead worlds.' }
    },
    {
      id: 'core', name: 'THE CORE DEEP', sub: 'Where the Celestials kept the good stuff, then died on top of it.',
      star: '#ff5fa8', tint: '#ffc44d', x: 402, y: 96, bodies: [7, 8, 9],
      drive: { name: 'VOID ANCHOR', cost: 5200000, blurb: 'Grips the throat of the galaxy and pulls.' }
    }
  ];
  function zoneOf(bodyIndex) {
    for (let i = 0; i < ZONES.length; i++) if (ZONES[i].bodies.indexOf(bodyIndex) >= 0) return i;
    return 0;
  }

  /* ------------------------------------------------------------------- bodies
     Each entry is one drillable world. Destroy its core to unlock the next. */
  const BODIES = [
    {
      name: 'Pebble-7', kind: 'Asteroid', type: 'rock', radius: 30, poi: { geode: 1, fossil: 0, ruin: 0 }, gravity: 34, coreHp: 260,
      reward: 1200, dominion: 0.4, caves: 0.30, enemyRate: 0.22, drillTier: 0,
      sky: '#0b0720', tint: '#8a6a4f',
      blurb: 'A crumb of rock. Warm up the drill.',
      ores: [[M.crust, 60], [M.stone, 26], [M.iron, 11], [M.copper, 3]],
      mobs: [['crawler', 6], ['floater', 3]]
    },
    {
      name: 'Rustclod', kind: 'Asteroid', type: 'rock', radius: 40, poi: { geode: 1, fossil: 1, ruin: 0 }, gravity: 40, coreHp: 700,
      reward: 4200, dominion: 0.8, caves: 0.34, enemyRate: 0.3, drillTier: 1,
      sky: '#160a1c', tint: '#9c6a54',
      blurb: 'Iron-fat and full of grubs.',
      ores: [[M.crust, 40], [M.stone, 30], [M.iron, 20], [M.copper, 8], [M.silver, 2]],
      mobs: [['crawler', 6], ['floater', 4], ['spitter', 2]]
    },
    {
      name: 'Glacius Minor', kind: 'Ice Shard', type: 'ice', radius: 52, poi: { geode: 2, fossil: 1, ruin: 1 }, gravity: 44, coreHp: 1600,
      reward: 12000, dominion: 1.4, caves: 0.42, enemyRate: 0.34, drillTier: 2,
      sky: '#061423', tint: '#79c4de',
      blurb: 'Slick, hollow and humming with cold.',
      ores: [[M.ice, 44], [M.stone, 22], [M.iron, 14], [M.silver, 12], [M.sapphire, 6], [M.gold, 2]],
      mobs: [['floater', 6], ['crawler', 3], ['spitter', 3]]
    },
    {
      name: 'Forge Husk', kind: 'Metal Rock', type: 'metal', radius: 64, poi: { geode: 1, fossil: 1, ruin: 1 }, gravity: 52, coreHp: 3600,
      reward: 34000, dominion: 2.2, caves: 0.36, enemyRate: 0.4, drillTier: 3,
      sky: '#1c0d0a', tint: '#c67a3d',
      blurb: 'Somebody smelted this thing. Badly.',
      ores: [[M.stone, 28], [M.iron, 28], [M.copper, 18], [M.silver, 12], [M.gold, 10], [M.emerald, 4]],
      mobs: [['crawler', 4], ['spitter', 5], ['gnasher', 3]]
    },
    {
      name: 'Gemworld Shard', kind: 'Fragment', type: 'gem', radius: 76, poi: { geode: 4, fossil: 1, ruin: 1 }, gravity: 58, coreHp: 8000,
      reward: 96000, dominion: 3.4, caves: 0.46, enemyRate: 0.44, drillTier: 4,
      sky: '#101a2e', tint: '#33c470',
      blurb: 'Every wall is a jewellery shop.',
      ores: [[M.stone, 22], [M.iron, 16], [M.gold, 18], [M.emerald, 18], [M.sapphire, 15], [M.ruby, 9], [M.void, 2]],
      mobs: [['spitter', 5], ['gnasher', 4], ['floater', 4], ['lurker', 1]]
    },
    {
      name: 'Mourn, the Dead Moon', kind: 'Moon', type: 'moon', radius: 90, poi: { geode: 2, fossil: 4, ruin: 2 }, gravity: 70, coreHp: 20000,
      reward: 290000, dominion: 6.0, caves: 0.4, enemyRate: 0.5, drillTier: 5,
      sky: '#0a0e1d', tint: '#b3c4d8',
      blurb: 'Something used to live here. Rude of it.',
      ores: [[M.stone, 24], [M.shell, 14], [M.iron, 12], [M.gold, 14], [M.sapphire, 14], [M.ruby, 13], [M.void, 8], [M.star, 1]],
      mobs: [['gnasher', 6], ['lurker', 3], ['spitter', 4], ['floater', 3]]
    },
    {
      name: 'Terra Prime', kind: 'Planet', type: 'terra', radius: 104, poi: { geode: 3, fossil: 2, ruin: 3 }, gravity: 86, coreHp: 60000,
      reward: 950000, dominion: 12.0, caves: 0.44, enemyRate: 0.56, drillTier: 6,
      sky: '#04121a', tint: '#3fa84f',
      blurb: 'Inhabited! Well. Formerly inhabited.',
      ores: [[M.stone, 20], [M.shell, 16], [M.gold, 12], [M.emerald, 14], [M.ruby, 16], [M.void, 16], [M.star, 6]],
      mobs: [['gnasher', 6], ['lurker', 6], ['spitter', 3], ['floater', 2]]
    },
    {
      name: 'Cinder Majoris', kind: 'Volcanic', type: 'volcanic', radius: 118, poi: { geode: 2, fossil: 1, ruin: 2 }, gravity: 104, coreHp: 165000,
      reward: 3200000, dominion: 20.0, caves: 0.5, enemyRate: 0.62, drillTier: 7,
      sky: '#1e0708', tint: '#e8425f',
      blurb: 'Molten, screaming, extremely profitable.',
      ores: [[M.shell, 22], [M.stone, 14], [M.ruby, 20], [M.gold, 10], [M.void, 22], [M.star, 12]],
      mobs: [['lurker', 8], ['gnasher', 6], ['spitter', 3]]
    },
    {
      name: 'The Crystal Titan', kind: 'Superplanet', type: 'titan', radius: 132, poi: { geode: 6, fossil: 1, ruin: 3 }, gravity: 122, coreHp: 480000,
      reward: 12500000, dominion: 27.0, caves: 0.46, enemyRate: 0.68, drillTier: 8,
      sky: '#150a2b', tint: '#7d4fd6',
      blurb: 'A world-sized gem. Break it. Break it now.',
      ores: [[M.shell, 20], [M.sapphire, 16], [M.ruby, 16], [M.void, 28], [M.star, 20]],
      mobs: [['lurker', 9], ['gnasher', 5], ['floater', 3]]
    },
    {
      name: 'Galactic Heart', kind: 'Core World', type: 'core', radius: 150, poi: { geode: 3, fossil: 2, ruin: 4 }, gravity: 140, coreHp: 1600000,
      reward: 60000000, dominion: 26.8, caves: 0.4, enemyRate: 0.75, drillTier: 9,
      sky: '#2a0a16', tint: '#ffc44d',
      blurb: 'The galaxy keeps its savings here.',
      ores: [[M.shell, 18], [M.void, 30], [M.star, 40], [M.ruby, 12]],
      mobs: [['lurker', 10], ['gnasher', 4], ['floater', 2]]
    }
  ];

  /* ----------------------------------------------------------------- upgrades
     value(level) returns the derived stat; cost grows geometrically.        */
  const UPGRADES = [
    {
      id: 'drill', mats: [['iron', 4], ['stone', 8]], late: ['void', 1], name: 'Drill Bit', icon: 'drill', max: 12, base: 220, growth: 1.62,
      blurb: 'Chews tiles faster and cracks harder rock.',
      value: l => 110 + l * 32,
      show: l => (110 + l * 32) + ' dmg/s'
    },
    {
      id: 'reach', mats: [['iron', 5], ['copper', 3]], late: ['void', 1], name: 'Drill Arm', icon: 'arm', max: 8, base: 340, growth: 1.7,
      blurb: 'Longer arm, wider bore -- eats 2 tiles at once at high tiers.',
      value: l => 14 + l * 2.6,
      show: l => (14 + l * 2.6).toFixed(1) + ' PX BORE'
    },
    {
      id: 'oxygen', mats: [['ice', 6], ['silver', 2]], late: ['sapphire', 2], name: 'O2 Tank', icon: 'tank', max: 14, base: 190, growth: 1.55,
      blurb: 'More air means deeper runs before the panic sets in.',
      value: l => 66 + l * 26,
      show: l => Math.round(66 + l * 26) + ' O2'
    },
    {
      id: 'cargo', mats: [['crust', 10], ['iron', 4]], late: ['shell', 4], name: 'Cargo Pod', icon: 'pod', max: 14, base: 240, growth: 1.6,
      blurb: 'Haul more loot per trip. Heavy pockets, heavy heart.',
      value: l => 16 + l * 13,
      show: l => Math.round(16 + l * 13) + ' kg'
    },
    {
      id: 'hull', mats: [['iron', 6], ['shell', 3]], late: ['star', 1], name: 'Hull Plate', icon: 'hull', max: 12, base: 260, growth: 1.6,
      blurb: 'Survive more bites, blasts and falling boulders.',
      value: l => 50 + l * 26,
      show: l => Math.round(50 + l * 26) + ' HP'
    },
    {
      id: 'thruster', mats: [['copper', 5], ['gold', 2]], late: ['void', 2], name: 'Thrusters', icon: 'thrust', max: 10, base: 300, growth: 1.62,
      blurb: 'Punch harder against gravity, even loaded down.',
      value: l => 300 + l * 52,
      show: l => '+' + (l * 17) + '% thrust'
    },
    {
      id: 'pistol', mats: [['copper', 4], ['emerald', 2]], late: ['ruby', 2], name: 'Plasma Pistol', icon: 'gun', max: 12, base: 280, growth: 1.62,
      blurb: 'Bigger pew. Fewer aliens.',
      value: l => 9 + l * 7,
      show: l => (9 + l * 7) + ' dmg'
    },
    {
      id: 'trigger', mats: [['silver', 4], ['sapphire', 2]], late: ['star', 1], name: 'Trigger Coil', icon: 'coil', max: 8, base: 360, growth: 1.7,
      blurb: 'Faster shots and a snappier recharge.',
      value: l => 0.34 - l * 0.028,
      show: l => (1 / (0.34 - l * 0.028)).toFixed(1) + ' shots/s'
    },
    {
      id: 'scatter', name: 'Scattergun', icon: 'scatter', max: 10, base: 900, growth: 1.7, mats: [['iron', 8], ['copper', 6]], late: ['titan', 2],
      blurb: 'Five-pellet spread. Level 1 unlocks the weapon; swap with Q.',
      value: l => l === 0 ? 0 : 5 + l * 3.2,
      show: l => l === 0 ? 'LOCKED' : (5 + l * 3.2).toFixed(0) + ' dmg x5'
    },
    {
      id: 'lance', name: 'Plasma Lance', icon: 'lance', max: 10, base: 4800, growth: 1.72, mats: [['silver', 6], ['crystal', 6]], late: ['diamond', 1],
      blurb: 'Charged piercing beam that also carves rock. Level 1 unlocks it.',
      value: l => l === 0 ? 0 : 40 + l * 26,
      show: l => l === 0 ? 'LOCKED' : (40 + l * 26) + ' dmg beam'
    },
    {
      id: 'dash', name: 'Burst Jets', icon: 'dash', max: 8, base: 520, growth: 1.6, mats: [['copper', 5], ['iron', 4]], late: ['titan', 2],
      blurb: 'Shift / double-tap for an invulnerable burst. Shorter cooldown per level.',
      value: l => 1.6 - l * 0.13,
      show: l => (1.6 - l * 0.13).toFixed(2) + 's cooldown'
    },
    {
      id: 'scanner', name: 'Ore Scanner', icon: 'scan', max: 8, base: 380, growth: 1.6, mats: [['copper', 4], ['silver', 2]], late: ['crystal', 4],
      blurb: 'Tab pulses a sonar ping that paints ore on the minimap.',
      value: l => 70 + l * 22,
      show: l => (70 + l * 22) + ' px ping'
    },
    {
      id: 'lamp', mats: [['crust', 8], ['copper', 2]], late: ['emerald', 2], name: 'Headlamp', icon: 'lamp', max: 8, base: 160, growth: 1.55,
      blurb: 'See the thing that is about to eat you.',
      value: l => 78 + l * 16,
      show: l => (78 + l * 16) + ' PX LAMP'
    },
    {
      id: 'magnet', mats: [['iron', 5], ['silver', 3]], late: ['void', 1], name: 'Tractor Magnet', icon: 'magnet', max: 8, base: 300, growth: 1.6,
      blurb: 'Sucks loose ore straight into the hold.',
      value: l => 26 + l * 11,
      show: l => (26 + l * 11) + ' PX PULL'
    },
    {
      id: 'appraise', name: 'Appraiser', icon: 'clock', max: 8, base: 260, growth: 1.6, mats: [['crust', 6], ['copper', 2]], late: ['silver', 3],
      blurb: 'Staff: ore is appraised faster and the house takes a smaller cut.',
      value: l => l,
      show: l => Math.round(100 / (1 + l * 0.55)) + '% TIME  ' + Math.max(2, 12 - l * 1.25).toFixed(0) + '% FEE'
    },
    {
      id: 'crew', name: 'Broker', icon: 'crew', max: 8, base: 700, growth: 1.7, mats: [['silver', 3], ['gold', 1]], late: ['emerald', 2],
      blurb: 'Staff: a broker who squeezes buyers. +6% sale value per level.',
      value: l => 1 + l * 0.06,
      show: l => '+' + (l * 6) + '% SALES'
    },
    {
      id: 'refine', name: 'Ore Purifier', icon: 'machine', max: 8, base: 1400, growth: 1.72, mats: [['copper', 6], ['silver', 3]], late: ['titan', 2],
      blurb: 'Lab machine: scrubs raw ore clean so it sells for far more.',
      value: l => 1 + l * 0.09,
      show: l => '+' + (l * 9) + '% ORE PRICE'
    },
    {
      id: 'kiln', name: 'Auto-Kiln', icon: 'belt', max: 6, base: 2200, growth: 1.75, mats: [['iron', 8], ['gold', 2]], late: ['void', 1],
      blurb: 'Lab machine: bakes lots while Zaz works, cutting appraisal time.',
      value: l => 1 + l * 0.5,
      show: l => 'x' + (1 + l * 0.5).toFixed(2) + ' APPRAISAL'
    },
    {
      id: 'tether', name: 'Tether Reel', icon: 'belt', max: 12, base: 240, growth: 1.58, mats: [['crust', 6], ['iron', 3]], late: ['titan', 2],
      blurb: 'Ship: a longer wire to the pod. Every level lets you dig deeper.',
      value: l => 230 + l * 60,
      show: l => Math.round((230 + l * 60 - 70) / 10) + 'M REACH'
    },
    {
      id: 'scooter', name: 'Pod Engine', icon: 'speed', max: 8, base: 200, growth: 1.6, mats: [['crust', 4], ['iron', 2]], late: ['copper', 6],
      blurb: 'Ship: the pod accelerates harder out in the field.',
      value: l => 1 + l * 0.22,
      show: l => 'x' + (1 + l * 0.22).toFixed(2) + ' THRUST'
    },
    {
      id: 'greed', name: 'Greed Glands', icon: 'coin', max: 4, base: 2400, growth: 1.9, mats: [],
      blurb: 'Perk: every sale pays more. Pure appetite.',
      value: l => 1 + l * 0.12,
      show: l => '+' + (l * 12) + '% SALES'
    },
    {
      id: 'lung', name: 'Third Lung', icon: 'tank', max: 4, base: 1200, growth: 1.8, mats: [],
      blurb: 'Perk: a spare lung. Flat extra air on top of the tank.',
      value: l => l * 30,
      show: l => '+' + (l * 30) + ' AIR'
    },
    {
      id: 'belly', name: 'Lead Belly', icon: 'cargo', max: 4, base: 1400, growth: 1.8, mats: [],
      blurb: 'Perk: you can simply carry more. Do not ask how.',
      value: l => l * 14,
      show: l => '+' + (l * 14) + ' KG'
    },
    {
      id: 'ironskin', name: 'Iron Skin', icon: 'hull', max: 4, base: 1300, growth: 1.8, mats: [],
      blurb: 'Perk: thicker hide under the suit.',
      value: l => l * 40,
      show: l => '+' + (l * 40) + ' HULL'
    },
    {
      id: 'drones', mats: [['copper', 6], ['gold', 3]], late: ['void', 2], name: 'Harvest Drones', icon: 'drone', max: 40, base: 500, growth: 1.28,
      blurb: 'Idle swarm that strips rubble for credits while you fly.',
      value: l => l,
      show: l => l + ' drone' + (l === 1 ? '' : 's')
    },
    {
      id: 'droneyield', mats: [['gold', 4], ['ruby', 2]], late: ['star', 1], name: 'Drone Claws', icon: 'claw', max: 25, base: 900, growth: 1.34,
      blurb: 'Each drone brings back a whole lot more.',
      value: l => 1 + l * 0.55,
      show: l => 'X' + (1 + l * 0.55).toFixed(2) + ' EACH'
    }
  ];

  const UPG = {};
  for (const u of UPGRADES) UPG[u.id] = u;

  function upgradeCost(u, level) {
    return Math.round(u.base * Math.pow(u.growth, level) / 10) * 10;
  }

  /* Upgrades are fabricated, not bought: every level burns raw ore out of the
     vault as well as credits, and high tiers demand exotic matter. */
  function recipe(u, level) {
    const out = [];
    for (const [key, base] of u.mats) {
      out.push({ mat: M[key], qty: Math.ceil(base * Math.pow(1.34, level)) });
    }
    if (u.late && level >= 5) {
      out.push({ mat: M[u.late[0]], qty: Math.ceil(u.late[1] * Math.pow(1.4, level - 5)) });
    }
    return out;
  }

  /* ------------------------------------------------------------ skill tree
     Axial hex coordinates. Six branches from the drill at the centre:
     guns (E), ship (NE), oxygen (NW), cargo (W), staff (SW), machines (SE). */
  const NODES = [
    { id: 'drill', q: 0, r: 0, glyph: 'drill', root: 1 },
    { id: 'reach', q: 0, r: -1, glyph: 'drill' },
    // guns, east
    { id: 'pistol', q: 1, r: 0, glyph: 'gun' },
    { id: 'trigger', q: 2, r: 0, glyph: 'gun' },
    { id: 'scatter', q: 2, r: -1, glyph: 'scatter' },
    { id: 'lance', q: 3, r: -1, glyph: 'lance' },
    // ship, north-east
    { id: 'thruster', q: 1, r: -1, glyph: 'speed' },
    { id: 'dash', q: 1, r: -2, glyph: 'dash' },
    { id: 'scooter', q: 2, r: -2, glyph: 'speed' },
    { id: 'hull', q: 0, r: -2, glyph: 'hull' },
    { id: 'tether', q: -1, r: -2, glyph: 'belt' },
    // oxygen and sight, north-west
    { id: 'oxygen', q: -1, r: 0, glyph: 'o2' },
    { id: 'lamp', q: -1, r: -1, glyph: 'eye' },
    { id: 'scanner', q: -2, r: 0, glyph: 'scan' },
    // cargo, west / south-west
    { id: 'cargo', q: -1, r: 1, glyph: 'cargo' },
    { id: 'magnet', q: -2, r: 1, glyph: 'weight' },
    // staff, south-west
    { id: 'appraise', q: -1, r: 2, glyph: 'clock' },
    { id: 'crew', q: -2, r: 2, glyph: 'crew' },
    // machines, south-east
    { id: 'drones', q: 0, r: 1, glyph: 'drone' },
    { id: 'droneyield', q: 1, r: 1, glyph: 'drone' },
    { id: 'refine', q: 0, r: 2, glyph: 'machine' },
    { id: 'kiln', q: 1, r: 2, glyph: 'belt' }
  ];

  /* Appraisal: raw ore waits to be valued before it can sell. */
  function appraiseSeconds(mat, level, kiln) {
    const base = 0.6 + Math.log2(1 + MAT[mat].cr / 10) * 0.5; // pricier lots take longer: crust ~1s, diamond ~5s
    return base / (1 + level * 0.55) / (1 + (kiln || 0) * 0.5);
  }
  function appraiseFee(level) { return Math.max(0.02, 0.12 - level * 0.0125); }

  /* ---------------------------------------------------------------- factory
     The refinery deck: machines sit on a grid, belts carry ore between them,
     and everything that reaches a depot becomes refined goods worth multiples
     of the raw price. Runs in real time whether you are aboard or not. */
  const MACHINES = {
    belt:    { name: 'Conveyor',    cost: 40,     blurb: 'Moves items one way. Click again to rotate.', col: '#7c88a8' },
    hopper:  { name: 'Hopper',      cost: 300,    blurb: 'Pulls one ore type from the bin on to the belt ahead. Click to change ore.', col: '#ffb03d' },
    smelter: { name: 'Smelter',     cost: 1200,   blurb: 'Metal ore in, ingot out. x2.6 value.', col: '#ff7a2a', time: 2.2, kind: 'smelt' },
    crusher: { name: 'Crusher',     cost: 800,    blurb: 'Rock in, concentrate out. Makes junk worth something. x4.', col: '#9aa3c4', time: 1.4, kind: 'crush' },
    cutter:  { name: 'Gem Cutter',  cost: 4500,   blurb: 'Rough gem in, cut stone out. x3.2 value.', col: '#8fb6ff', time: 3.0, kind: 'cut' },
    forge:   { name: 'Alloy Forge', cost: 16000,  blurb: 'Two different ingots in, alloy out. x2.4 on the pair.', col: '#ff5fa8', time: 3.4, kind: 'alloy' },
    depot:   { name: 'Depot',       cost: 200,    blurb: 'Items arriving here go to the goods vault for sale.', col: '#39ffa6' }
  };
  const METALS = ['iron', 'copper', 'silver', 'gold', 'titan', 'star'];
  const GEMS = ['emerald', 'sapphire', 'ruby', 'ameth', 'diamond', 'void', 'crystal', 'obsid', 'fossil'];
  const JUNK = ['crust', 'stone', 'basalt', 'shell', 'ice', 'frost', 'fungus'];

  /* Refined goods are keyed strings so they can live beside raw ore in a save. */
  function goodOf(kind, matA, matB) {
    if (kind === 'ingot') return { key: 'ingot:' + matA, name: MAT[matA].name + ' Ingot', cr: Math.round(MAT[matA].cr * 2.6), c: MAT[matA].c };
    if (kind === 'conc') return { key: 'conc:' + matA, name: MAT[matA].name + ' Concentrate', cr: Math.round(MAT[matA].cr * 4 + 6), c: MAT[matA].c };
    if (kind === 'cut') return { key: 'cut:' + matA, name: 'Cut ' + MAT[matA].name, cr: Math.round(MAT[matA].cr * 3.2), c: MAT[matA].c };
    if (kind === 'alloy') {
      const a = Math.min(matA, matB), b = Math.max(matA, matB);
      return { key: 'alloy:' + a + ':' + b, name: MAT[a].name + '-' + MAT[b].name + ' Alloy',
        cr: Math.round((MAT[a].cr + MAT[b].cr) * 2.6 * 2.4), c: MAT[b].c };
    }
    return null;
  }
  function goodFromKey(key) {
    const parts = key.split(':');
    if (parts[0] === 'alloy') return goodOf('alloy', +parts[1], +parts[2]);
    return goodOf({ ingot: 'ingot', conc: 'conc', cut: 'cut' }[parts[0]], +parts[1]);
  }

  /* --------------------------------------------------------------- cosmetics
     Pure vanity, bought with credits -- the "look at me" half of an
     incremental game. Each option repaints the generated sprites. */
  const COSMETICS = [
    {
      id: 'suit', name: 'Suit Weave', blurb: 'What the galaxy sees you in.',
      options: [
        { id: 'rose',   name: 'Rose Terror',   cost: 0,       c: ['#ff5fa8', '#c02f74', '#ffb0d6'] },
        { id: 'toxic',  name: 'Toxic Slime',   cost: 4000,    c: ['#a6ff4d', '#5f9e1a', '#dcffa8'] },
        { id: 'void',   name: 'Void Baron',    cost: 25000,   c: ['#a06bff', '#5b2fa8', '#d8bcff'] },
        { id: 'rust',   name: 'Rust Marauder', cost: 120000,  c: ['#ff8a3d', '#a8481a', '#ffd0a8'] },
        { id: 'bone',   name: 'Bone Sovereign',cost: 900000,  c: ['#e8e2d0', '#9a927c', '#fffdf4'] },
        { id: 'gold',   name: 'Solid Bullion', cost: 6000000, c: ['#ffd34d', '#b8860b', '#fff3b0'] }
      ]
    },
    {
      id: 'skin', name: 'Gene Splice', blurb: 'Ancestry is a choice.',
      options: [
        { id: 'green', name: 'Classic Grue', cost: 0,       c: ['#7ff08a', '#43ba5f', '#c4ffce'] },
        { id: 'blue',  name: 'Cryo Morph',   cost: 6000,    c: ['#7fd8f0', '#3f92ba', '#c4f2ff'] },
        { id: 'pink',  name: 'Blood Morph',  cost: 45000,   c: ['#ff9a9a', '#c04f4f', '#ffd4d4'] },
        { id: 'grey',  name: 'Ashen Morph',  cost: 300000,  c: ['#b8b4c8', '#75708c', '#e4e0f0'] },
        { id: 'star',  name: 'Starlit Morph',cost: 2500000, c: ['#ffe89a', '#c9a23c', '#fff8d8'] }
      ]
    },
    {
      id: 'glass', name: 'Visor Tint', blurb: 'Menace, refracted.',
      options: [
        { id: 'sky',    name: 'Clear Sky',  cost: 0,       c: ['#9fe0ff', '#66b0dc', '#eafcff'] },
        { id: 'amber',  name: 'Amber Burn', cost: 9000,    c: ['#ffcf8a', '#d6913c', '#fff2d8'] },
        { id: 'violet', name: 'Violet Hex', cost: 80000,   c: ['#d5a8ff', '#8a5ad0', '#f4e6ff'] },
        { id: 'crimson',name: 'Crimson Law',cost: 700000,  c: ['#ff9aa8', '#c94f61', '#ffe0e6'] }
      ]
    },
    {
      id: 'drill', name: 'Bit Finish', blurb: 'The last thing a planet sees.',
      options: [
        { id: 'steel',  name: 'Plain Steel',   cost: 0,       c: ['#d3dcf0', '#4e5a7e', '#ff9b3d'] },
        { id: 'copper', name: 'Hot Copper',    cost: 12000,   c: ['#ffb066', '#8e4a1c', '#ffd34d'] },
        { id: 'obsid',  name: 'Obsidian Fang', cost: 150000,  c: ['#8a86a8', '#2a2740', '#b98cff'] },
        { id: 'plasma', name: 'Plasma Edge',   cost: 1200000, c: ['#9ef7ff', '#2b6f8a', '#58e8ff'] }
      ]
    },
    {
      id: 'trim', name: 'Hull Livery', blurb: 'Repaint the Rustmaw.',
      options: [
        { id: 'stock',  name: 'Factory Grey', cost: 0,       c: ['#d3dcf0', '#8290b0', '#4e5a7e'] },
        { id: 'blood',  name: 'Blood Corsair',cost: 30000,   c: ['#ff8a94', '#b03a48', '#5e1e28'] },
        { id: 'jade',   name: 'Jade Reaper',  cost: 400000,  c: ['#8fe8c0', '#3f9a76', '#1e4c3a'] },
        { id: 'royal',  name: 'Tyrant Purple',cost: 3000000, c: ['#c9a8ff', '#6b3fb5', '#33195e'] }
      ]
    }
  ];
  const COS = {};
  for (const c of COSMETICS) COS[c.id] = c;

  /* What the galaxy calls you, by how much of it you have wrecked. */
  const TITLES = [
    [0,    'UNLICENSED PROSPECTOR'],
    [1,    'RAVAGER, PROVISIONAL'],
    [4,    'CLAIM JUMPER'],
    [9,    'NOVA WATCH: WANTED'],
    [18,   'LEGENDARY OUTLAW (SELF-DECLARED)'],
    [30,   'STAR-THIEF'],
    [46,   'WARLORD OF THE DEEP DARK'],
    [64,   'TERROR OF THE OUTER ARM'],
    [82,   'DESTROYER OF WORLDS, PART TIME'],
    [99.5, 'SOVEREIGN OF ASH']
  ];
  function titleFor(dominion) {
    let out = TITLES[0][1];
    for (const [d, name] of TITLES) if (dominion >= d) out = name;
    return out;
  }
  /* Bounty on your head: scales with everything you have ruined. */
  function bountyFor(save) {
    return Math.round((save.dominion * 40000 + save.totalEarned * 0.12 +
      save.destroyed.filter(Boolean).length * 250000));
  }

  PD.data = { MAT, M, ENEMY, BODIES, UPGRADES, UPG, upgradeCost, recipe, COSMETICS, COS, TITLES, titleFor, bountyFor,
    STRATA, ZONES, zoneOf, FLORA, BUILDINGS, BUILD, buildCost, RECIPES, RECIPE, NEURONS, NEURON, FACTIONS, LORE, ORB, MIX, MACHINES, METALS, GEMS, JUNK, goodOf, goodFromKey, NODES, appraiseSeconds, appraiseFee };
})(window.PD);
