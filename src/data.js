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
    { id: 14, key: 'shell',  name: 'Dense Shell', hp: 190,  kg: 3.0,  cr: 45,    c: ['#5d6b7a', '#46525e', '#333c46'] }
  ];
  const M = {};
  for (const m of MAT) M[m.key] = m.id;

  /* ------------------------------------------------------------------ enemies */
  const ENEMY = {
    crawler: { name: 'Rock Grub',   hp: 14,  dmg: 7,   speed: 20, w: 12, h: 9,  cr: 12,  kind: 'crawl' },
    floater: { name: 'Void Jelly',  hp: 10,  dmg: 9,   speed: 15, w: 11, h: 13, cr: 18,  kind: 'float' },
    spitter: { name: 'Spitworm',    hp: 22,  dmg: 6,   speed: 12, w: 13, h: 11, cr: 34,  kind: 'spit' },
    gnasher: { name: 'Gnasher',     hp: 46,  dmg: 16,  speed: 44, w: 15, h: 12, cr: 80,  kind: 'charge' },
    lurker:  { name: 'Deep Lurker', hp: 90,  dmg: 22,  speed: 26, w: 19, h: 16, cr: 220, kind: 'spit' },
    guardian:{ name: 'Core Warden', hp: 320, dmg: 28,  speed: 22, w: 26, h: 24, cr: 900, kind: 'boss' }
  };

  /* ------------------------------------------------------------------- bodies
     Each entry is one drillable world. Destroy its core to unlock the next. */
  const BODIES = [
    {
      name: 'Pebble-7', kind: 'Asteroid', radius: 15, gravity: 34, coreHp: 260,
      reward: 1200, dominion: 0.4, caves: 0.30, enemyRate: 0.22, drillTier: 0,
      sky: '#0b0720', tint: '#8a6a4f',
      blurb: 'A crumb of rock. Warm up the drill.',
      ores: [[M.crust, 60], [M.stone, 26], [M.iron, 11], [M.copper, 3]],
      mobs: [['crawler', 6], ['floater', 3]]
    },
    {
      name: 'Rustclod', kind: 'Asteroid', radius: 20, gravity: 40, coreHp: 700,
      reward: 4200, dominion: 0.8, caves: 0.34, enemyRate: 0.3, drillTier: 1,
      sky: '#160a1c', tint: '#9c6a54',
      blurb: 'Iron-fat and full of grubs.',
      ores: [[M.crust, 40], [M.stone, 30], [M.iron, 20], [M.copper, 8], [M.silver, 2]],
      mobs: [['crawler', 6], ['floater', 4], ['spitter', 2]]
    },
    {
      name: 'Glacius Minor', kind: 'Ice Shard', radius: 25, gravity: 44, coreHp: 1600,
      reward: 12000, dominion: 1.4, caves: 0.42, enemyRate: 0.34, drillTier: 2,
      sky: '#061423', tint: '#79c4de',
      blurb: 'Slick, hollow and humming with cold.',
      ores: [[M.ice, 44], [M.stone, 22], [M.iron, 14], [M.silver, 12], [M.sapphire, 6], [M.gold, 2]],
      mobs: [['floater', 6], ['crawler', 3], ['spitter', 3]]
    },
    {
      name: 'Forge Husk', kind: 'Metal Asteroid', radius: 31, gravity: 52, coreHp: 3600,
      reward: 34000, dominion: 2.2, caves: 0.36, enemyRate: 0.4, drillTier: 3,
      sky: '#1c0d0a', tint: '#c67a3d',
      blurb: 'Somebody smelted this thing. Badly.',
      ores: [[M.stone, 28], [M.iron, 28], [M.copper, 18], [M.silver, 12], [M.gold, 10], [M.emerald, 4]],
      mobs: [['crawler', 4], ['spitter', 5], ['gnasher', 3]]
    },
    {
      name: 'Gemworld Shard', kind: 'Fragment', radius: 37, gravity: 58, coreHp: 8000,
      reward: 96000, dominion: 3.4, caves: 0.46, enemyRate: 0.44, drillTier: 4,
      sky: '#101a2e', tint: '#33c470',
      blurb: 'Every wall is a jewellery shop.',
      ores: [[M.stone, 22], [M.iron, 16], [M.gold, 18], [M.emerald, 18], [M.sapphire, 15], [M.ruby, 9], [M.void, 2]],
      mobs: [['spitter', 5], ['gnasher', 4], ['floater', 4], ['lurker', 1]]
    },
    {
      name: 'Mourn, the Dead Moon', kind: 'Moon', radius: 46, gravity: 70, coreHp: 20000,
      reward: 290000, dominion: 6.0, caves: 0.4, enemyRate: 0.5, drillTier: 5,
      sky: '#0a0e1d', tint: '#b3c4d8',
      blurb: 'Something used to live here. Rude of it.',
      ores: [[M.stone, 24], [M.shell, 14], [M.iron, 12], [M.gold, 14], [M.sapphire, 14], [M.ruby, 13], [M.void, 8], [M.star, 1]],
      mobs: [['gnasher', 6], ['lurker', 3], ['spitter', 4], ['floater', 3]]
    },
    {
      name: 'Terra Prime', kind: 'Planet', radius: 56, gravity: 86, coreHp: 60000,
      reward: 950000, dominion: 12.0, caves: 0.44, enemyRate: 0.56, drillTier: 6,
      sky: '#04121a', tint: '#3fa84f',
      blurb: 'Inhabited! Well. Formerly inhabited.',
      ores: [[M.stone, 20], [M.shell, 16], [M.gold, 12], [M.emerald, 14], [M.ruby, 16], [M.void, 16], [M.star, 6]],
      mobs: [['gnasher', 6], ['lurker', 6], ['spitter', 3], ['floater', 2]]
    },
    {
      name: 'Cinder Majoris', kind: 'Volcanic World', radius: 66, gravity: 104, coreHp: 165000,
      reward: 3200000, dominion: 20.0, caves: 0.5, enemyRate: 0.62, drillTier: 7,
      sky: '#1e0708', tint: '#e8425f',
      blurb: 'Molten, screaming, extremely profitable.',
      ores: [[M.shell, 22], [M.stone, 14], [M.ruby, 20], [M.gold, 10], [M.void, 22], [M.star, 12]],
      mobs: [['lurker', 8], ['gnasher', 6], ['spitter', 3]]
    },
    {
      name: 'The Crystal Titan', kind: 'Superplanet', radius: 78, gravity: 122, coreHp: 480000,
      reward: 12500000, dominion: 27.0, caves: 0.46, enemyRate: 0.68, drillTier: 8,
      sky: '#150a2b', tint: '#7d4fd6',
      blurb: 'A world-sized gem. Break it. Break it now.',
      ores: [[M.shell, 20], [M.sapphire, 16], [M.ruby, 16], [M.void, 28], [M.star, 20]],
      mobs: [['lurker', 9], ['gnasher', 5], ['floater', 3]]
    },
    {
      name: 'Galactic Heart', kind: 'Core World', radius: 90, gravity: 140, coreHp: 1600000,
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
      id: 'drill', name: 'Drill Bit', icon: 'drill', max: 12, base: 220, growth: 1.62,
      blurb: 'Chews tiles faster and cracks harder rock.',
      value: l => 110 + l * 32,
      show: l => (110 + l * 32) + ' dmg/s'
    },
    {
      id: 'reach', name: 'Drill Arm', icon: 'arm', max: 8, base: 340, growth: 1.7,
      blurb: 'Longer arm, wider bore -- eats 2 tiles at once at high tiers.',
      value: l => 14 + l * 2.6,
      show: l => (14 + l * 2.6).toFixed(1) + ' px reach'
    },
    {
      id: 'oxygen', name: 'O2 Tank', icon: 'tank', max: 14, base: 190, growth: 1.55,
      blurb: 'More air means deeper runs before the panic sets in.',
      value: l => 110 + l * 30,
      show: l => Math.round(110 + l * 30) + ' O2'
    },
    {
      id: 'cargo', name: 'Cargo Pod', icon: 'pod', max: 14, base: 240, growth: 1.6,
      blurb: 'Haul more loot per trip. Heavy pockets, heavy heart.',
      value: l => 30 + l * 18,
      show: l => Math.round(30 + l * 18) + ' kg'
    },
    {
      id: 'hull', name: 'Hull Plate', icon: 'hull', max: 12, base: 260, growth: 1.6,
      blurb: 'Survive more bites, blasts and falling boulders.',
      value: l => 50 + l * 26,
      show: l => Math.round(50 + l * 26) + ' HP'
    },
    {
      id: 'thruster', name: 'Thrusters', icon: 'thrust', max: 10, base: 300, growth: 1.62,
      blurb: 'Punch harder against gravity, even loaded down.',
      value: l => 300 + l * 52,
      show: l => '+' + (l * 17) + '% thrust'
    },
    {
      id: 'pistol', name: 'Plasma Pistol', icon: 'gun', max: 12, base: 280, growth: 1.62,
      blurb: 'Bigger pew. Fewer aliens.',
      value: l => 9 + l * 7,
      show: l => (9 + l * 7) + ' dmg'
    },
    {
      id: 'trigger', name: 'Trigger Coil', icon: 'coil', max: 8, base: 360, growth: 1.7,
      blurb: 'Faster shots and a snappier recharge.',
      value: l => 0.34 - l * 0.028,
      show: l => (1 / (0.34 - l * 0.028)).toFixed(1) + ' shots/s'
    },
    {
      id: 'lamp', name: 'Headlamp', icon: 'lamp', max: 8, base: 160, growth: 1.55,
      blurb: 'See the thing that is about to eat you.',
      value: l => 62 + l * 15,
      show: l => (62 + l * 15) + ' px light'
    },
    {
      id: 'magnet', name: 'Tractor Magnet', icon: 'magnet', max: 8, base: 300, growth: 1.6,
      blurb: 'Sucks loose ore straight into the hold.',
      value: l => 26 + l * 11,
      show: l => (26 + l * 11) + ' px pull'
    },
    {
      id: 'drones', name: 'Harvest Drones', icon: 'drone', max: 40, base: 500, growth: 1.28,
      blurb: 'Idle swarm that strips rubble for credits while you fly.',
      value: l => l,
      show: l => l + ' drone' + (l === 1 ? '' : 's')
    },
    {
      id: 'droneyield', name: 'Drone Claws', icon: 'claw', max: 25, base: 900, growth: 1.34,
      blurb: 'Each drone brings back a whole lot more.',
      value: l => 1 + l * 0.55,
      show: l => 'x' + (1 + l * 0.55).toFixed(2) + ' per drone'
    }
  ];

  const UPG = {};
  for (const u of UPGRADES) UPG[u.id] = u;

  function upgradeCost(u, level) {
    return Math.round(u.base * Math.pow(u.growth, level) / 10) * 10;
  }

  PD.data = { MAT, M, ENEMY, BODIES, UPGRADES, UPG, upgradeCost };
})(window.PD);
