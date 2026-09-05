/* Interior art: the inside of the Rustmaw, its machinery and its crew.
   Same procedural pixel pipeline as everything else. */
(function (PD) {
  'use strict';
  const pix = PD.pix;
  const U = PD.util;
  const C = PD.art.C;

  const P = {
    wall: '#33294d', wallD: '#241b3a', wallL: '#463a66',
    floor: '#3f3458', floorD: '#28203d', grate: '#5a4d80',
    pipe: '#5a5478', pipeD: '#3a3556',
    steel: '#9aa3c4', steelD: '#5e6688', steelDD: '#3a4060',
    screen: '#0f2a2e', screenL: '#39ffa6', screenD: '#0a1a1e',
    amber: '#ffb03d', red: '#ff5a4d', cyan: '#58e8ff',
    holo: '#7ef9ff', holoD: '#2f8fae',
    rust: '#8a5a3a', gold: '#ffd34d', ink: '#120e22'
  };

  const S = {};
  function reg(name, builders, ox, oy) {
    const frames = builders.map(b => b.toCanvas());
    S[name] = { frames, w: frames[0].width, h: frames[0].height, ox: ox || 0, oy: oy || frames[0].height };
  }

  /* --------------------------------------------------------- room backdrop
     Deck A of the Rustmaw. Layered top to bottom: ceiling ducting, viewports,
     a service catwalk, wall lockers, hazard band, then plated floor. */
  function room(w, h) {
    const p = pix(w, h);
    const floorY = h - 22;
    const rnd = U.mulberry32(31337);

    p.rect(0, 0, w, floorY, P.wall);

    // structural ribs, floor to ceiling
    for (let x = 0; x < w; x += 60) {
      p.rect(x, 0, 7, floorY, P.wallD);
      p.rect(x + 1, 0, 1, floorY, P.wallL);
      p.rect(x + 6, 0, 1, floorY, '#171426');
      for (let y = 22; y < floorY; y += 18) { p.set(x + 2, y, P.wallL); p.set(x + 4, y, P.wallL); }
    }
    // panel seams between ribs
    for (let x = 10; x < w; x += 60) {
      for (let y = 96; y < floorY - 30; y += 26) {
        p.rect(x, y, 46, 1, P.wallD);
        p.rect(x, y + 1, 46, 1, P.wallL);
      }
    }

    // --- ceiling: duct run, strip lights, valve wheels
    p.rect(0, 0, w, 16, P.wallD);
    p.rect(0, 16, w, 3, P.pipeD);
    p.rect(0, 19, w, 1, P.wallL);
    for (let x = 0; x < w; x += 30) { p.rect(x, 2, 2, 12, P.steelDD); p.rect(x + 12, 5, 8, 2, P.pipe); }
    for (let x = 24; x < w; x += 72) {
      p.round(x, 20, 26, 6, 2, P.steelD);
      p.rect(x + 3, 22, 20, 3, '#fff0c0');
      p.rect(x + 3, 25, 20, 1, '#ffd88a');
    }
    for (let i = 0; i < 2; i++) {
      const y = 30 + i * 9;
      p.rect(0, y, w, 5, i ? P.pipeD : P.pipe);
      p.rect(0, y, w, 1, P.steel);
      for (let x = 26; x < w; x += 88) {
        p.round(x, y - 2, 7, 9, 2, P.steelD);
        p.disc(x + 3, y + 2, 3, P.steelDD);
      }
    }

    // --- viewports on to the void
    for (let x = 34; x < w - 40; x += 118) {
      p.round(x, 50, 46, 30, 9, P.steelDD);
      p.round(x + 3, 53, 40, 24, 7, '#070518');
      const r2 = U.mulberry32(x * 13 + 5);
      for (let i = 0; i < 22; i++) {
        p.set(x + 5 + Math.floor(r2() * 36), 55 + Math.floor(r2() * 20), r2() > 0.72 ? '#a9d8ff' : '#ffffff');
      }
      p.rect(x + 3, 64, 40, 1, 'rgba(0,0,0,0)');
      for (let i = 0; i < 4; i++) p.disc(x + 4 + i * 12, 51, 1.4, P.steel);
    }

    // --- service catwalk with railing and drooping cable
    const cw = 104;
    p.rect(0, cw, w, 4, P.steelDD);
    p.rect(0, cw, w, 1, P.steel);
    for (let x = 0; x < w; x += 5) p.rect(x, cw + 4, 2, 3, P.steelDD);
    for (let x = 0; x < w; x += 26) { p.rect(x, cw - 11, 2, 11, P.steelD); }
    p.rect(0, cw - 12, w, 2, P.steelD);
    for (let x = 0; x < w; x += 3) {
      const sag = Math.sin(x * 0.09) * 3 + 4;
      p.set(x, cw + 8 + sag, '#241f38');
      p.set(x, cw + 9 + sag, P.pipeD);
    }

    // --- wall furniture between the ribs: lockers, screens, notices
    for (let x = 12; x < w - 50; x += 60) {
      const kind = Math.floor(rnd() * 3);
      const y = 128;
      if (kind === 0) {                                  // locker bank
        p.round(x, y, 44, 56, 2, P.steelDD);
        for (let i = 0; i < 2; i++) {
          p.round(x + 2 + i * 21, y + 2, 19, 52, 1, P.steelD);
          p.rect(x + 4 + i * 21, y + 6, 15, 1, P.steelDD);
          p.rect(x + 16 + i * 21, y + 26, 3, 5, P.steel);
        }
      } else if (kind === 1) {                           // wall monitor + notices
        p.round(x + 2, y, 40, 26, 2, P.steelDD);
        p.rect(x + 5, y + 3, 34, 20, P.screenD);
        for (let i = 0; i < 5; i++) p.rect(x + 7, y + 5 + i * 4, 6 + ((i * 11) % 24), 2, i ? P.screenL : P.amber);
        p.round(x + 6, y + 32, 14, 18, 1, '#c8c2b0');
        for (let i = 0; i < 5; i++) p.rect(x + 8, y + 35 + i * 3, 10, 1, '#8a8478');
        p.round(x + 24, y + 34, 14, 16, 1, '#c8c2b0');
        p.rect(x + 26, y + 37, 10, 8, P.red);
      } else {                                           // pipe stack + valve
        for (let i = 0; i < 3; i++) {
          p.rect(x + 4 + i * 10, y, 6, 56, i % 2 ? P.pipeD : P.pipe);
          p.rect(x + 4 + i * 10, y + 18 + i * 6, 6, 3, P.steelD);
        }
        p.disc(x + 34, y + 24, 7, P.steelDD);
        p.disc(x + 34, y + 24, 4, P.rust);
        p.rect(x + 27, y + 23, 14, 2, P.steel);
      }
    }

    // --- painted decal: the Rustmaw's own jolly roger
    const dx = Math.floor(w * 0.62), dy = 118;
    p.round(dx, dy, 30, 26, 8, '#3a3358');
    p.round(dx + 4, dy + 4, 22, 16, 6, P.gold);
    p.rect(dx + 8, dy + 9, 5, 5, P.ink);
    p.rect(dx + 17, dy + 9, 5, 5, P.ink);
    p.rect(dx + 11, dy + 17, 8, 2, P.gold);
    for (let i = 0; i < 4; i++) p.rect(dx + 10 + i * 3, dy + 19, 2, 4, P.gold);
    p.rect(dx + 9, dy + 19, 12, 1, P.ink);

    // --- hazard band just above the deck
    for (let x = 0; x < w; x += 8) {
      p.rect(x, floorY - 12, 4, 6, P.amber);
      p.rect(x + 4, floorY - 12, 4, 6, P.ink);
    }
    p.rect(0, floorY - 13, w, 1, P.steelD);
    p.rect(0, floorY - 6, w, 2, P.wallD);

    // --- floor
    p.rect(0, floorY, w, h - floorY, P.floor);
    p.rect(0, floorY, w, 2, P.grate);
    p.rect(0, floorY + 2, w, 1, P.floorD);
    for (let x = 0; x < w; x += 6) p.rect(x, floorY + 5, 3, h - floorY - 8, P.floorD);
    for (let x = 0; x < w; x += 42) p.rect(x, floorY, 1, h - floorY, P.wallD);

    // --- grime, because nobody cleans a pirate barge
    for (let i = 0; i < w / 5; i++) {
      const rx = Math.floor(rnd() * w), ry = 40 + Math.floor(rnd() * (floorY - 60));
      p.rect(rx, ry, 1 + Math.floor(rnd() * 4), 1, rnd() > 0.5 ? P.wallD : '#211d34');
    }
    return p;
  }

  /* -------------------------------------------------------------- stations */
  function airlock() {
    const p = pix(46, 62);
    p.round(2, 2, 42, 58, 6, P.steelDD);
    p.round(5, 5, 36, 52, 5, P.steelD);
    p.disc(23, 30, 15, '#0a0a18');
    p.disc(23, 30, 13, '#0e1830');
    // hazard chevrons
    for (let i = 0; i < 5; i++) {
      p.rect(6 + i * 7, 5, 4, 3, i % 2 ? P.ink : P.amber);
      p.rect(6 + i * 7, 54, 4, 3, i % 2 ? P.ink : P.amber);
    }
    // bolts around the hatch
    for (let a = 0; a < 8; a++) {
      p.disc(23 + Math.cos(a / 8 * U.TAU) * 17, 30 + Math.sin(a / 8 * U.TAU) * 17, 1.6, P.steel);
    }
    p.rect(20, 12, 6, 3, P.red);
    p.outline(P.ink);
    return p;
  }

  function console_(lit) {
    const p = pix(58, 50);
    p.round(4, 34, 50, 16, 3, P.steelDD);      // desk
    p.round(8, 2, 42, 34, 4, P.steelD);        // monitor shell
    p.round(11, 5, 36, 26, 2, P.screenD);
    p.rect(12, 6, 34, 24, P.screen);
    // fake readout: bars and text lines
    for (let i = 0; i < 6; i++) {
      const wdt = 6 + ((i * 7 + (lit ? 3 : 0)) % 22);
      p.rect(14, 8 + i * 4, wdt, 2, i % 3 === 0 ? P.screenL : P.holoD);
    }
    p.rect(12, 6, 34, 1, 'rgba(255,255,255,0.3)');
    // keyboard slab
    for (let i = 0; i < 9; i++) p.rect(9 + i * 5, 37, 3, 2, P.steel);
    p.rect(6, 42, 46, 2, P.steelDD);
    p.disc(50, 8, 2, lit ? P.screenL : P.holoD);
    p.outline(P.ink);
    return p;
  }

  function fabricator(spark) {
    const p = pix(70, 56);
    p.round(2, 30, 66, 26, 3, P.steelDD);       // bench
    p.rect(6, 33, 58, 4, P.rust);
    p.round(8, 6, 26, 26, 3, P.steelD);         // press arm housing
    p.rect(14, 12, 14, 12, P.screenD);
    p.rect(15, 13, 12, 10, spark ? '#ffdca0' : P.screen);
    p.round(38, 2, 10, 28, 3, P.steelD);        // piston
    p.rect(41, 26, 4, spark ? 6 : 10, P.steel);
    p.round(36, spark ? 30 : 34, 14, 6, 2, P.steelDD);
    // anvil block and workpiece
    p.round(52, 22, 14, 10, 2, P.steelDD);
    p.round(54, 18, 10, 5, 1, spark ? P.amber : P.rust);
    if (spark) {
      for (let i = 0; i < 7; i++) {
        p.set(50 + Math.floor(U.hash2(i, 3) * 18), 12 + Math.floor(U.hash2(i, 9) * 10), i % 2 ? '#fff3c0' : P.amber);
      }
    }
    // tool rack
    for (let i = 0; i < 4; i++) p.rect(4 + i * 4, 8 + (i % 2) * 2, 2, 12, P.steel);
    p.outline(P.ink);
    return p;
  }

  function droneBay(lit) {
    const p = pix(62, 54);
    p.round(2, 2, 58, 52, 4, P.steelDD);
    p.round(5, 5, 52, 46, 3, '#1a1730');
    for (let r = 0; r < 2; r++) {
      p.rect(6, 26 + r * 14, 50, 2, P.steelD);
      for (let i = 0; i < 3; i++) {
        const x = 9 + i * 16, y = 14 + r * 14;
        p.round(x, y, 12, 8, 3, P.steel);
        p.disc(x + 6, y + 4, 2, lit ? P.cyan : P.holoD);
        p.rect(x - 2, y - 2, 5, 1, P.steelD);
        p.rect(x + 9, y - 2, 5, 1, P.steelD);
      }
    }
    p.rect(6, 6, 50, 5, P.screenD);
    p.rect(8, 7, lit ? 40 : 24, 3, P.screenL);
    p.outline(P.ink);
    return p;
  }

  function wardrobe(open) {
    const p = pix(44, 60);
    p.round(2, 2, 40, 56, 4, P.steelDD);
    p.round(5, 6, 34, 48, 3, open ? '#241d3e' : P.steelD);
    if (open) {
      // mirror-lit changing pod
      p.rect(8, 9, 28, 42, '#3a2f5e');
      for (let i = 0; i < 5; i++) p.rect(9, 12 + i * 9, 26, 1, '#4d3f7a');
      p.rect(10, 10, 3, 40, P.holo);
      p.rect(31, 10, 3, 40, P.holo);
    }
    p.round(18, 26, 8, 6, 2, P.gold);
    p.rect(6, 2, 32, 3, P.holoD);
    p.outline(P.ink);
    return p;
  }

  function navChart(lit) {
    const p = pix(76, 50);
    p.round(2, 36, 72, 14, 3, P.steelDD);
    p.round(4, 2, 68, 34, 4, P.steelD);
    p.round(7, 5, 62, 28, 2, '#07131f');
    // orbital rings and a star map
    for (let i = 0; i < 3; i++) {
      const rx = 12 + i * 8, ry = 6 + i * 4;
      for (let a = 0; a < 40; a++) {
        const t = a / 40 * U.TAU;
        p.set(38 + Math.cos(t) * rx, 19 + Math.sin(t) * ry, i === (lit ? 1 : 2) ? P.holo : P.holoD);
      }
    }
    p.disc(38, 19, 3, P.gold);
    for (let i = 0; i < 9; i++) {
      p.set(10 + Math.floor(U.hash2(i, 5) * 56), 7 + Math.floor(U.hash2(i, 13) * 24), '#ffffff');
    }
    p.rect(8, 39, 60, 2, P.screenD);
    p.rect(9, 39, lit ? 40 : 18, 2, P.screenL);
    p.outline(P.ink);
    return p;
  }

  function refinery(lit) {
    const p = pix(72, 58);
    p.round(2, 40, 68, 18, 3, P.steelDD);                  // base
    p.rect(6, 43, 60, 3, P.rust);
    // conveyor with a moving lump of ore
    p.rect(8, 36, 52, 5, P.steelD);
    for (let x = 10; x < 58; x += 6) p.rect(x + (lit ? 3 : 0), 37, 3, 3, P.steelDD);
    p.round(lit ? 30 : 22, 32, 6, 5, 1, P.amber);
    // smelter tower with a glowing mouth
    p.round(8, 6, 22, 30, 3, P.steelD);
    p.round(12, 10, 14, 10, 2, P.screenD);
    p.rect(13, 11, 12, 8, lit ? '#ff9b3d' : '#c25c14');
    p.rect(14, 26, 10, 6, P.steelDD);
    p.rect(11, 2, 4, 6, P.pipeD); p.rect(23, 2, 4, 6, P.pipeD);
    // press on the right
    p.round(40, 10, 26, 22, 3, P.steelD);
    p.rect(50, 4, 6, 8, P.steel);
    p.round(44, lit ? 20 : 16, 18, 6, 2, P.steelDD);
    p.rect(42, 14, 22, 1, P.rust);
    // smoke puffs
    if (lit) { p.disc(13, 0, 1.5, P.steelD); p.disc(25, 1, 1.2, P.steelD); }
    p.outline(P.ink);
    return p;
  }

  function crate(kind) {
    const p = pix(22, 18);
    p.round(1, 2, 20, 16, 2, kind ? P.rust : P.steelD);
    p.rect(3, 5, 16, 2, kind ? '#a8724a' : P.steel);
    p.rect(3, 12, 16, 2, P.steelDD);
    p.rect(9, 2, 4, 16, P.steelDD);
    p.outline(P.ink);
    return p;
  }

  function plant() {
    const p = pix(20, 26);
    p.round(5, 17, 10, 9, 2, P.rust);
    p.rect(6, 19, 8, 1, '#a8724a');
    for (let i = 0; i < 5; i++) {
      const a = -1.9 + i * 0.5;
      p.line(10, 18, 10 + Math.cos(a) * 7, 18 + Math.sin(a) * 12, '#4dbb66');
      p.disc(10 + Math.cos(a) * 7, 18 + Math.sin(a) * 12, 2, '#7ff08a');
      p.set(10 + Math.cos(a) * 7, 18 + Math.sin(a) * 12, '#ff8ab0');
    }
    p.outline(P.ink);
    return p;
  }

  /* ------------------------------------------------------------------- crew
     Everyone aboard is an alien, and everyone aboard is cute. */
  const A = PD.art.C;

  /* NIX: the ship mind, projected as a round blue alien with three big eyes. */
  function nix(phase) {
    const p = pix(26, 34);
    const bob = phase ? 1 : 0;
    p.round(7, 29, 12, 5, 2, P.steelD);
    p.round(9, 27, 8, 3, 1, P.steelDD);
    for (let y = 26; y > 21; y--) p.rect(13 - (26 - y) - 2, y, (26 - y) * 2 + 4, 1, P.holoD);
    p.disc(13, 12 + bob, 9, P.holoD);
    p.disc(13, 11 + bob, 7.5, P.holo);
    p.ellipse(13, 7 + bob, 3.5, 1.4, '#d8ffff');
    // three eyes, one big in the middle
    p.disc(13, 12 + bob, 3, '#062a34'); p.disc(13.5, 11.5 + bob, 1.2, '#d8ffff');
    p.disc(8, 11 + bob, 1.8, '#062a34'); p.set(8, 10 + bob, '#d8ffff');
    p.disc(18, 11 + bob, 1.8, '#062a34'); p.set(18, 10 + bob, '#d8ffff');
    p.rect(11, 17 + bob, 4, 1, '#062a34');
    // two little antennae with bulbs
    p.line(9, 4 + bob, 7, 1 + bob, P.holoD); p.disc(7, 0 + bob, 1.3, '#d8ffff');
    p.line(17, 4 + bob, 19, 1 + bob, P.holoD); p.disc(19, 0 + bob, 1.3, '#d8ffff');
    p.rect(4, 8 + bob + (phase ? 6 : 2), 18, 1, '#d8ffff');   // scanline
    p.outline(P.ink);
    return p;
  }

  /* BOLT: chunky orange alien mechanic in goggles and overalls, spanner in hand. */
  function bolt(phase) {
    const p = pix(26, 32);
    const lift = phase ? 1 : 0;
    // legs + boots
    p.round(7, 24 - lift, 4, 6, 1, '#4a3a6a'); p.round(15, 24, 4, 6, 1, '#4a3a6a');
    p.rect(6, 29 - lift, 6, 3, P.steelDD); p.rect(14, 29, 6, 3, P.steelDD);
    // overalls torso
    p.round(6, 14 - lift, 14, 12, 3, '#4a6ab0');
    p.rect(8, 14 - lift, 3, 5, '#6a8ad0'); p.rect(15, 14 - lift, 3, 5, '#6a8ad0');
    p.rect(11, 19 - lift, 4, 3, P.gold);
    // arms: one holding a spanner up
    p.round(2, 15 - lift, 4, 7, 1, A.orange); p.round(3, 21 - lift, 3, 3, 1, A.orange);
    p.round(20, 9 - lift, 4, 8, 1, A.orange);
    p.rect(21, 4 - lift, 2, 6, P.steel); p.rect(20, 3 - lift, 4, 2, P.steel); p.rect(20, 3 - lift, 1, 1, P.ink);
    // big round head
    p.disc(13, 8 - lift, 7, A.orange);
    p.shade(A.orange, A.orangeD, 1, 1);
    // goggles
    p.rect(6, 5 - lift, 14, 5, P.steelDD);
    p.disc(9.5, 7.5 - lift, 2.2, A.cyan); p.disc(16.5, 7.5 - lift, 2.2, A.cyan);
    p.set(9, 7 - lift, '#ffffff'); p.set(16, 7 - lift, '#ffffff');
    p.rect(11, 12 - lift, 4, 1, A.orangeD);                // little grin
    p.rect(12, 11 - lift, 2, 1, '#ffffff');
    p.spike(13, -1 - lift, 3, 3, -1, A.orangeD);            // tuft
    p.outline(P.ink);
    return p;
  }

  /* ZAZ: the appraiser. Tall, thin, lavender, one monocle, very unimpressed. */
  function zaz(phase) {
    const p = pix(22, 36);
    const bob = phase ? 1 : 0;
    p.round(7, 28, 3, 6, 1, '#2a2040'); p.round(12, 28, 3, 6, 1, '#2a2040');
    p.rect(6, 33, 5, 3, P.steelDD); p.rect(11, 33, 5, 3, P.steelDD);
    p.round(6, 16 + bob, 10, 13, 3, '#3a2a5e');            // long coat
    p.rect(10, 16 + bob, 2, 13, P.gold);
    p.round(3, 17 + bob, 3, 9, 1, A.purple); p.round(16, 17 + bob, 3, 9, 1, A.purple);
    p.round(15, 25 + bob, 4, 3, 1, '#c9a8ff');
    p.rect(17, 22 + bob, 4, 4, P.steelD); p.rect(18, 23 + bob, 2, 2, A.cyan);   // clipboard/scanner
    // narrow head
    p.ellipse(11, 9 + bob, 5.5, 7.5, A.purple);
    p.shade(A.purple, A.purpleD, 1, 1);
    p.ellipse(8.5, 9 + bob, 1.4, 2, P.ink); p.set(9, 8 + bob, '#ffffff');
    p.disc(14, 9 + bob, 2.8, P.gold); p.disc(14, 9 + bob, 1.9, '#d8ffff'); p.set(14, 9 + bob, P.ink);   // monocle
    p.line(16, 11 + bob, 18, 15 + bob, P.gold);
    p.rect(10, 14 + bob, 3, 1, A.purpleD);
    p.line(11, 1 + bob, 11, -1 + bob, A.purpleD); p.disc(11, -1 + bob, 1.2, A.gold);
    p.outline(P.ink);
    return p;
  }

  /* GLOOP: a rescued rock grub in a tank. Emotional support livestock. */
  function gloop(phase) {
    const p = pix(28, 34);
    p.round(2, 4, 24, 26, 4, '#1b2a3a');
    p.round(4, 6, 20, 22, 3, '#2a5a6e');
    p.round(1, 28, 26, 6, 2, P.steelDD);
    p.round(4, 1, 20, 5, 2, P.steelD);
    const y = 14 + (phase ? -1 : 1);
    p.ellipse(14, y, 7, 4, '#7cbb26');
    p.ellipse(14, y - 1, 6.4, 3.2, '#c8ff5a');
    p.ellipse(16.5, y - 1, 1.4, 1.8, P.ink);
    p.ellipse(12.5, y - 1, 1.4, 1.8, P.ink);
    p.set(17, y - 2, '#ffffff'); p.set(13, y - 2, '#ffffff');
    for (let i = 0; i < 3; i++) p.set(8 + i * 5, y + 5 + (i % 2), '#4d7a1a');
    p.set(7, 10 + (phase ? 0 : 3), '#a9e6ff');
    p.set(20, 8 + (phase ? 3 : 0), '#a9e6ff');
    p.outline(P.ink);
    return p;
  }

  /* SPROUT: the deck's pet, a tiny purple space-cat with antennae. */
  function sprout(phase) {
    const p = pix(16, 12);
    const f = phase ? 1 : 0;
    p.ellipse(8, 8, 6, 3.5, A.purple);
    p.disc(13, 5 - f, 3.2, A.purple);
    p.spike(11, 1 - f, 3, 3, -1, A.purple); p.spike(15, 1 - f, 3, 3, -1, A.purple);
    p.set(12, 5 - f, P.ink); p.set(14, 5 - f, P.ink);
    p.line(2, 7, 0, 3 + f, A.purpleD);                       // tail
    p.rect(4, 10, 2, 2, A.purpleD); p.rect(9, 10, 2, 2, A.purpleD);
    p.outline(P.ink);
    return p;
  }

  /* ---------------------------------------------------------------- decor */
  function poster(kind) {
    const p = pix(18, 22);
    p.round(0, 0, 18, 22, 1, kind ? '#ffd34d' : '#ff5fa8');
    p.round(2, 2, 14, 18, 1, kind ? '#2a1c4a' : '#1a2a4a');
    if (kind) { p.disc(9, 9, 5, '#ff8a3d'); p.disc(9, 9, 2.5, '#fff3c0'); for (let i = 0; i < 4; i++) p.rect(4 + i * 3, 17, 2, 1, '#ffd34d'); }
    else { p.disc(9, 8, 4, '#7ff08a'); p.set(8, 7, P.ink); p.set(10, 7, P.ink); p.rect(4, 16, 10, 2, '#ff5fa8'); }
    p.outline(P.ink);
    return p;
  }
  function lights(phase) {
    const p = pix(60, 8);
    for (let x = 0; x < 60; x++) p.set(x, 1 + Math.round(Math.sin(x * 0.2) * 1.2), P.pipeD);
    const cols = ['#ff5fa8', '#ffd34d', '#58e8ff', '#c8ff5a'];
    for (let i = 0; i < 6; i++) { const x = 4 + i * 10; const on = (i + (phase ? 1 : 0)) % 2; p.disc(x, 5, 2, on ? cols[i % 4] : '#4a4460'); }
    return p;
  }

  reg('airlock', [airlock()], 23, 62);
  reg('console', [console_(false), console_(true)], 29, 50);
  reg('fabricator', [fabricator(false), fabricator(true)], 35, 56);
  reg('dronebay', [droneBay(false), droneBay(true)], 31, 54);
  reg('wardrobe', [wardrobe(false), wardrobe(true)], 22, 60);
  reg('navchart', [navChart(false), navChart(true)], 38, 50);
  reg('refinery', [refinery(false), refinery(true)], 36, 58);
  reg('crate', [crate(0), crate(1)], 11, 18);
  reg('plant', [plant()], 10, 26);
  reg('nix', [nix(0), nix(1)], 13, 34);
  reg('bolt', [bolt(0), bolt(1)], 13, 32);
  reg('zaz', [zaz(0), zaz(1)], 11, 36);
  reg('gloop', [gloop(0), gloop(1)], 14, 34);
  reg('sprout', [sprout(0), sprout(1)], 8, 12);
  reg('poster', [poster(0), poster(1)], 9, 22);
  reg('lights', [lights(0), lights(1)], 30, 8);

  /* ------------------------------------------------------- moon / planet art
     A big detailed body for the sky: maria, craters with rim light, a soft
     terminator and a thin lit limb. */
  function buildMoon(size, tint, seed) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const r = size / 2 - 1;
    const cx = size / 2, cy = size / 2;
    const rnd = U.mulberry32(seed || 7);

    function shade(col, f) {
      const n = parseInt(col.slice(1), 16);
      const R = U.clamp(((n >> 16) & 255) * f, 0, 255) | 0;
      const G = U.clamp(((n >> 8) & 255) * f, 0, 255) | 0;
      const B = U.clamp((n & 255) * f, 0, 255) | 0;
      return 'rgb(' + R + ',' + G + ',' + B + ')';
    }

    c.fillStyle = shade(tint, 0.75);
    c.beginPath(); c.arc(cx, cy, r, 0, U.TAU); c.fill();

    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, U.TAU); c.clip();

    // maria: broad dark seas
    for (let i = 0; i < 6; i++) {
      const a = rnd() * U.TAU, d = rnd() * r * 0.7;
      c.fillStyle = shade(tint, 0.5 + rnd() * 0.12);
      c.beginPath();
      c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (0.16 + rnd() * 0.24), 0, U.TAU);
      c.fill();
    }
    // craters, biggest first
    const craters = [];
    for (let i = 0; i < 46; i++) {
      const a = rnd() * U.TAU, d = Math.sqrt(rnd()) * r * 0.94;
      craters.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: (0.5 + rnd() * rnd() * 5.5) * (size / 90) });
    }
    craters.sort((p1, p2) => p2.r - p1.r);
    for (const k of craters) {
      c.fillStyle = shade(tint, 0.98);          // sunlit upper rim
      c.beginPath(); c.arc(k.x, k.y - k.r * 0.16, k.r, 0, U.TAU); c.fill();
      c.fillStyle = shade(tint, 0.42);          // shadowed floor
      c.beginPath(); c.arc(k.x, k.y + k.r * 0.2, k.r * 0.78, 0, U.TAU); c.fill();
      c.fillStyle = shade(tint, 0.62);
      c.beginPath(); c.arc(k.x, k.y + k.r * 0.05, k.r * 0.5, 0, U.TAU); c.fill();
    }
    // dust speckle
    for (let i = 0; i < size * 3; i++) {
      c.fillStyle = shade(tint, rnd() > 0.5 ? 1.12 : 0.7);
      c.globalAlpha = 0.3;
      c.fillRect((rnd() * size) | 0, (rnd() * size) | 0, 1, 1);
    }
    c.globalAlpha = 1;

    // terminator: night creeping in from the lower left
    const term = c.createLinearGradient(0, size, size * 0.85, 0);
    term.addColorStop(0, 'rgba(4,2,12,0.94)');
    term.addColorStop(0.45, 'rgba(4,2,12,0.55)');
    term.addColorStop(0.8, 'rgba(4,2,12,0)');
    c.fillStyle = term;
    c.fillRect(0, 0, size, size);

    // lit limb
    c.strokeStyle = shade(tint, 1.5);
    c.lineWidth = Math.max(1, size / 90);
    c.beginPath(); c.arc(cx, cy, r - 0.5, -1.5, 0.7); c.stroke();
    c.restore();
    return cv;
  }

  PD.artint = { P, S, room, buildMoon };
})(window.PD);
