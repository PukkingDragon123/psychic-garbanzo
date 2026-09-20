/* Everything you hear is synthesised on the fly with WebAudio -- no asset
   files, and the drill can track its pitch to how hard the rock is. */
(function (PD) {
  'use strict';
  const U = PD.util;

  let ctx = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  let ready = false;
  const state = { sfx: true, music: true };

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = 0.34; musBus.connect(master);

    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    ready = true;
  }

  function resume() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  const now = () => ctx.currentTime;

  function env(node, t0, peak, attack, decay, hold) {
    const g = node.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    if (hold) g.setValueAtTime(Math.max(0.0002, peak), t0 + attack + hold);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + (hold || 0) + decay);
  }

  function tone(freq, opts) {
    if (!ready || !state.sfx) return;
    opts = opts || {};
    const t0 = now() + (opts.delay || 0);
    const o = ctx.createOscillator();
    o.type = opts.type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + (opts.dur || 0.12));
    const g = ctx.createGain();
    env(g, t0, opts.vol === undefined ? 0.2 : opts.vol, opts.attack || 0.005, opts.dur || 0.12, opts.hold || 0);
    let out = g;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = opts.filter;
      g.connect(f); out = f;
    }
    o.connect(g); out.connect(sfxBus);
    o.start(t0); o.stop(t0 + (opts.dur || 0.12) + (opts.hold || 0) + 0.06);
  }

  function noise(opts) {
    if (!ready || !state.sfx) return;
    opts = opts || {};
    const t0 = now() + (opts.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = opts.rate || 1;
    const f = ctx.createBiquadFilter();
    f.type = opts.type || 'lowpass';
    f.frequency.setValueAtTime(opts.from || 1800, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, opts.to || 300), t0 + (opts.dur || 0.2));
    f.Q.value = opts.q || 1;
    const g = ctx.createGain();
    env(g, t0, opts.vol === undefined ? 0.25 : opts.vol, opts.attack || 0.004, opts.dur || 0.2, opts.hold || 0);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t0); src.stop(t0 + (opts.dur || 0.2) + (opts.hold || 0) + 0.05);
  }

  /* ------------------------------------------------------- looping drill rig */
  let drillNodes = null;
  function drill(on, pitch) {
    if (!ready) return;
    if (on && state.sfx) {
      if (!drillNodes) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf; src.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 2.2;
        const lo = ctx.createOscillator(); lo.type = 'sawtooth'; lo.frequency.value = 62;
        const loG = ctx.createGain(); loG.gain.value = 0.05;
        const g = ctx.createGain(); g.gain.value = 0.0001;
        src.connect(bp); bp.connect(g); lo.connect(loG); loG.connect(g); g.connect(sfxBus);
        src.start(); lo.start();
        drillNodes = { src, bp, g, lo, loG };
      }
      const p = pitch || 0;
      drillNodes.bp.frequency.setTargetAtTime(560 + p * 900, now(), 0.05);
      drillNodes.lo.frequency.setTargetAtTime(52 + p * 40, now(), 0.05);
      drillNodes.g.gain.setTargetAtTime(0.16, now(), 0.02);
    } else if (drillNodes) {
      drillNodes.g.gain.setTargetAtTime(0.0001, now(), 0.05);
    }
  }

  let thrustNodes = null;
  function thrust(amount) {
    if (!ready) return;
    if (amount > 0.01 && state.sfx) {
      if (!thrustNodes) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf; src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.8;
        const g = ctx.createGain(); g.gain.value = 0.0001;
        src.connect(f); f.connect(g); g.connect(sfxBus);
        src.start();
        thrustNodes = { src, f, g };
      }
      thrustNodes.g.gain.setTargetAtTime(0.05 * amount, now(), 0.04);
      thrustNodes.f.frequency.setTargetAtTime(300 + amount * 500, now(), 0.06);
    } else if (thrustNodes) {
      thrustNodes.g.gain.setTargetAtTime(0.0001, now(), 0.06);
    }
  }

  /* ---------------------------------------------------------------- one-shots */
  const S = {
    break_(hard) {
      noise({ from: 2400 - hard * 900, to: 220, dur: 0.16, vol: 0.2, rate: 1.4 });
      tone(150 - hard * 30, { type: 'triangle', to: 60, dur: 0.1, vol: 0.14 });
    },
    ore(value) {
      const step = U.clamp(Math.log2(1 + value / 14) * 90, 0, 900);
      tone(620 + step, { type: 'triangle', dur: 0.1, vol: 0.16 });
      tone(930 + step, { type: 'sine', dur: 0.13, vol: 0.1, delay: 0.045 });
    },
    coin(i) {
      tone(880 + (i % 6) * 110, { type: 'square', dur: 0.07, vol: 0.09 });
      tone(1320 + (i % 6) * 110, { type: 'sine', dur: 0.1, vol: 0.06, delay: 0.03 });
    },
    sell() {
      [0, 4, 7, 12].forEach((s, i) => tone(523 * Math.pow(2, s / 12), { type: 'triangle', dur: 0.22, vol: 0.14, delay: i * 0.06 }));
    },
    shoot() {
      tone(1500, { type: 'square', to: 260, dur: 0.1, vol: 0.13, filter: 3000 });
      noise({ from: 3200, to: 800, dur: 0.06, vol: 0.08 });
    },
    hitMob() { noise({ from: 1700, to: 400, dur: 0.09, vol: 0.16 }); tone(300, { type: 'sawtooth', to: 160, dur: 0.07, vol: 0.08 }); },
    killMob() {
      noise({ from: 900, to: 120, dur: 0.3, vol: 0.2 });
      tone(420, { type: 'sawtooth', to: 70, dur: 0.28, vol: 0.12 });
    },
    hurt() {
      tone(180, { type: 'sawtooth', to: 70, dur: 0.26, vol: 0.2 });
      noise({ from: 700, to: 90, dur: 0.22, vol: 0.16 });
    },
    boom(size) {
      const s = size || 1;
      noise({ from: 1500 * s, to: 60, dur: 0.5 * s, vol: 0.34, rate: 0.7 });
      tone(120, { type: 'sine', to: 32, dur: 0.6 * s, vol: 0.3 });
      tone(220, { type: 'triangle', to: 55, dur: 0.35 * s, vol: 0.16, delay: 0.02 });
    },
    crack(i) {
      noise({ from: 900 + i * 320, to: 300, dur: 0.14, vol: 0.16, type: 'bandpass', q: 4 });
      tone(200 + i * 80, { type: 'square', to: 90, dur: 0.1, vol: 0.07 });
    },
    rumble() {
      noise({ from: 220, to: 40, dur: 1.6, vol: 0.3, rate: 0.4, attack: 0.6 });
    },
    dock() {
      [0, 5, 9].forEach((s, i) => tone(392 * Math.pow(2, s / 12), { type: 'triangle', dur: 0.34, vol: 0.12, delay: i * 0.05 }));
    },
    buy() {
      tone(660, { type: 'square', dur: 0.08, vol: 0.14 });
      tone(990, { type: 'square', dur: 0.14, vol: 0.12, delay: 0.07 });
    },
    deny() { tone(200, { type: 'square', to: 140, dur: 0.16, vol: 0.13 }); },
    click() { tone(1100, { type: 'square', dur: 0.04, vol: 0.07 }); },
    alarm() {
      tone(880, { type: 'square', dur: 0.11, vol: 0.11 });
      tone(880, { type: 'square', dur: 0.11, vol: 0.11, delay: 0.16 });
    },
    warp() {
      tone(180, { type: 'sawtooth', to: 2400, dur: 1.1, vol: 0.16, filter: 4000 });
      noise({ from: 200, to: 4000, dur: 1.1, vol: 0.12, attack: 0.5 });
    },
    fanfare() {
      [0, 4, 7, 12, 16, 19].forEach((s, i) =>
        tone(392 * Math.pow(2, s / 12), { type: 'triangle', dur: 0.4, vol: 0.15, delay: i * 0.11 }));
    },

    /* ------------------------------------------------------- the house noises
       A casino is a sound before it is a picture: card on felt, chip on chip,
       dice on wood, and a ball going round and round a wheel. */
    card(i) {
      noise({ from: 5200, to: 1800, dur: 0.06, vol: 0.09, type: 'bandpass', q: 1.4, rate: 1.6 });
      tone(2200 + (i || 0) * 90, { type: 'triangle', dur: 0.03, vol: 0.03 });
    },
    flip() {
      noise({ from: 6000, to: 2200, dur: 0.05, vol: 0.11, type: 'bandpass', q: 2, rate: 1.8 });
      noise({ from: 3400, to: 1200, dur: 0.07, vol: 0.07, type: 'bandpass', q: 2, delay: 0.05 });
    },
    chips(n) {
      for (let i = 0; i < (n || 3); i++) {
        tone(1500 + U.rand(-160, 160), { type: 'triangle', to: 900, dur: 0.05, vol: 0.055, delay: i * 0.045 });
        noise({ from: 4200, to: 1400, dur: 0.04, vol: 0.05, type: 'bandpass', q: 3, delay: i * 0.045 });
      }
    },
    dice() {
      for (let i = 0; i < 7; i++) {
        const d = i * 0.055 + i * i * 0.006;
        noise({ from: 2400, to: 700, dur: 0.05, vol: 0.09 - i * 0.008, type: 'bandpass', q: 2.4, delay: d });
        tone(420 + U.rand(-70, 70), { type: 'square', to: 220, dur: 0.035, vol: 0.05 - i * 0.005, delay: d });
      }
    },
    /* The ball, going round, slowing down, dropping in. One call covers the
       whole spin: the rattle at the end is the ball finding its pocket. */
    ballSpin(dur) {
      const D = dur || 3.1;
      for (let t2 = 0; t2 < D - 0.5; t2 += 0.09) {
        const q = t2 / D;
        tone(900 - q * 340, { type: 'triangle', dur: 0.05, vol: 0.035 * (1 - q * 0.5), delay: t2 });
      }
      for (let i = 0; i < 6; i++) {
        noise({ from: 3000, to: 900, dur: 0.05, vol: 0.09, type: 'bandpass', q: 3,
          delay: D - 0.5 + i * 0.07 + i * i * 0.012 });
      }
      tone(300, { type: 'square', to: 150, dur: 0.1, vol: 0.08, delay: D });
    },
    reel(i) {
      noise({ from: 1800, to: 600, dur: 0.05, vol: 0.08, type: 'bandpass', q: 2.4 });
      tone(340 + (i || 0) * 80, { type: 'square', to: 180, dur: 0.05, vol: 0.06 });
    },
    jackpot() {
      for (let i = 0; i < 14; i++) {
        tone(880 * Math.pow(2, (i % 7) / 12) * (i > 6 ? 2 : 1),
          { type: 'square', dur: 0.1, vol: 0.09, delay: i * 0.055 });
      }
      for (let i = 0; i < 24; i++) {
        tone(1400 + U.rand(-400, 900), { type: 'triangle', to: 700, dur: 0.06, vol: 0.05, delay: 0.8 + i * 0.045 });
      }
    },
    applause() {
      for (let i = 0; i < 26; i++) {
        noise({ from: 4200, to: 1600, dur: 0.05, vol: U.rand(0.02, 0.055), type: 'bandpass',
          q: 1.6, delay: U.rand(0, 1.5) });
      }
    },

    /* ------------------------------------------------------- weather and pain
       The rain is a loop, because it does not stop for two whole minutes. */
    thunder(far) {
      const f = far ? 0.45 : 1;
      noise({ from: 400 * f, to: 40, dur: 1.9, vol: 0.2 * f, rate: 0.35, attack: far ? 0.5 : 0.04 });
      tone(70, { type: 'sine', to: 28, dur: 2.2, vol: 0.16 * f, delay: 0.05 });
      if (!far) noise({ from: 2400, to: 300, dur: 0.3, vol: 0.14, rate: 1.2 });
    },
    punch() {
      noise({ from: 900, to: 90, dur: 0.16, vol: 0.3, rate: 0.8 });
      tone(160, { type: 'sawtooth', to: 48, dur: 0.2, vol: 0.22 });
      tone(90, { type: 'sine', to: 36, dur: 0.3, vol: 0.18, delay: 0.01 });
    },
    scrape() {
      noise({ from: 1400, to: 500, dur: 0.3, vol: 0.07, type: 'bandpass', q: 1.6, rate: 0.5 });
    },
    /* Somebody landing on a carpet, face first. */
    thud() {
      noise({ from: 500, to: 60, dur: 0.3, vol: 0.26, rate: 0.6 });
      tone(110, { type: 'sine', to: 34, dur: 0.34, vol: 0.2 });
    }
  };

  /* ------------------------------------------------------------- the weather
     Rain has to keep going, so it is a loop with a filter on it rather than
     ten thousand one-shots. */
  let rainNodes = null;
  function rain(amount) {
    if (!ready) return;
    if (amount > 0.01 && state.sfx) {
      if (!rainNodes) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf; src.loop = true;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 900;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 5200;
        const g = ctx.createGain(); g.gain.value = 0.0001;
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(sfxBus);
        src.start();
        rainNodes = { src, hp, lp, g };
      }
      rainNodes.g.gain.setTargetAtTime(0.085 * amount, now(), 0.4);
      rainNodes.lp.frequency.setTargetAtTime(3200 + amount * 3000, now(), 0.5);
    } else if (rainNodes) {
      rainNodes.g.gain.setTargetAtTime(0.0001, now(), 0.4);
    }
  }

  /* The murmur of a room with a hundred people losing money in it. */
  let roomNodes = null;
  function room(amount) {
    if (!ready) return;
    if (amount > 0.01 && state.sfx) {
      if (!roomNodes) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf; src.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7;
        const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.27;
        const lg = ctx.createGain(); lg.gain.value = 130;
        const g = ctx.createGain(); g.gain.value = 0.0001;
        lfo.connect(lg); lg.connect(bp.frequency);
        src.connect(bp); bp.connect(g); g.connect(sfxBus);
        src.start(); lfo.start();
        roomNodes = { src, bp, g, lfo, lg };
      }
      roomNodes.g.gain.setTargetAtTime(0.05 * amount, now(), 0.6);
    } else if (roomNodes) {
      roomNodes.g.gain.setTargetAtTime(0.0001, now(), 0.6);
    }
  }

  /* =====================================================================
     THE SONGS

     There used to be ONE loop: a bassline, a hat and an arpeggio, going
     round for the entire game whatever was happening on screen. It is a
     small band now, and it knows several numbers.

     A track is a chord progression plus a bar of patterns to run over it.
     Sixteen characters to a bar, one per semiquaver:

        1-9   a degree -- of the chord for bass and comp, of the scale for
              the lead, so the tune moves with the harmony
        -     hold: the note before it keeps ringing
        .     rest
        x     a hit, on the drum rows

     Everything is still synthesised from scratch. There is not a sample in
     the game and there never will be. */

  const CHORDS = {
    m:    [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11],
    d7:   [0, 4, 7, 10], m6: [0, 3, 7, 9], dim: [0, 3, 6, 9], sus: [0, 5, 7, 10],
    m9:   [0, 3, 7, 10, 14], M9: [0, 4, 7, 11, 14], aug: [0, 4, 8],
    d9:   [0, 4, 7, 10, 14], m11: [0, 3, 7, 10, 17]
  };
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  const DORIAN = [0, 2, 3, 5, 7, 9, 10];
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const PENTA = [0, 3, 5, 7, 10];
  const BLUES = [0, 3, 5, 6, 7, 10];

  /* deg: a 1-based degree into a set of intervals, wrapping up the octaves */
  function deg(set, d) {
    const i = d - 1;
    return set[((i % set.length) + set.length) % set.length] + 12 * Math.floor(i / set.length);
  }

  const TRACKS = {
    /* The front door. Swaggering, brassy, far too pleased with itself. */
    title: {
      bpm: 112, key: 0, scale: MINOR, swing: 0,
      prog: [[0, 'm9'], [0, 'm9'], [8, 'M7'], [10, 'M7'], [0, 'm9'], [0, 'm9'], [5, 'm7'], [7, 'd7']],
      bass: '1...1...5...1..8', comp: '..C...C...C.C...',
      lead: '1.-.3.5.8.-.7.5.', lead2: '................',
      kick: 'x.....x.x.......', snare: '....x.......x...', hat: '..x...x...x...x.',
      lvl: { bass: 0.13, comp: 0.055, lead: 0.085 }, leadV: 'saw'
    },
    /* The moon. Nobody is out there and the music knows it. */
    moon: {
      bpm: 72, key: -2, scale: MINOR, swing: 0,
      prog: [[0, 'm9'], [0, 'm9'], [-4, 'M7'], [-4, 'M7']],
      bass: '1.......5.......', comp: 'C.......C.......',
      lead: '.....5.-.4.-.1.-', lead2: '................',
      kick: 'x...............', snare: '................', hat: '................',
      lvl: { bass: 0.09, comp: 0.05, lead: 0.05 }, leadV: 'tri', pad: 1
    },
    /* Digging. The old groove, but with somewhere to go. */
    dig: {
      bpm: 100, key: 0, scale: PENTA, swing: 0,
      prog: [[0, 'm7'], [0, 'm7'], [3, 'M7'], [-2, 'd7']],
      bass: '1..1..5..1.3..5.', comp: '....C.......C...',
      lead: '..3.5.-.8.7.5.3.', lead2: '................',
      kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.xxx.',
      lvl: { bass: 0.12, comp: 0.05, lead: 0.06 }, leadV: 'sq'
    },
    /* Deep. Half the speed, twice the weight, and something is down here. */
    deep: {
      bpm: 76, key: -5, scale: MINOR, swing: 0,
      prog: [[0, 'm'], [0, 'm'], [1, 'M'], [0, 'dim']],
      bass: '1.......1...8...', comp: 'C.......C.......',
      lead: '........5.-.4.-.', lead2: '1...............',
      kick: 'x.......x.......', snare: '........x.......', hat: '....x.......x...',
      lvl: { bass: 0.15, comp: 0.05, lead: 0.05 }, leadV: 'tri', pad: 1
    },
    /* Something enormous has noticed you. */
    boss: {
      bpm: 146, key: -5, scale: MINOR, swing: 0,
      prog: [[0, 'm'], [1, 'M'], [0, 'm'], [-1, 'M']],
      bass: '1.1.1.1.1.1.1.1.', comp: 'C...C...C...C...',
      lead: '1.2.1.5.4.-.1...', lead2: '................',
      kick: 'x...x...x...x...', snare: '....x.......x.x.', hat: 'xxxxxxxxxxxxxxxx',
      lvl: { bass: 0.15, comp: 0.07, lead: 0.09 }, leadV: 'saw'
    },
    /* The casino. Lounge swing: a walking bass, chords on the off-beat and
       a brush on the ride. Nothing in here is in a hurry to be anywhere. */
    casino: {
      bpm: 104, key: -3, scale: DORIAN, swing: 0.34,
      prog: [[0, 'm7'], [5, 'd7'], [0, 'm7'], [-2, 'd9'], [0, 'm7'], [5, 'm7'], [8, 'M7'], [7, 'd7']],
      bass: '1.2.3.5.8.5.3.2.', comp: '..C...C...C...C.',
      lead: '................', lead2: '................',
      kick: 'x.......x.......', snare: '................', hat: '..x...x...x...x.',
      ride: 'x..x..x.x..x..x.',
      lvl: { bass: 0.12, comp: 0.05, lead: 0.07 }, leadV: 'tri'
    },
    /* Three numbers for whoever is on the lounge stage tonight. */
    lounge1: {
      bpm: 88, key: -3, scale: MAJOR, swing: 0.4,
      prog: [[0, 'M7'], [9, 'm7'], [2, 'm7'], [7, 'd7']],
      bass: '1...5...1...5...', comp: '..C...C...C.C...',
      lead: '3.-.5.-.8.-.7.5.', lead2: '................',
      kick: 'x.......x.......', snare: '....x.......x...', hat: '................',
      ride: 'x..x..x.x..x..x.',
      lvl: { bass: 0.11, comp: 0.055, lead: 0.095 }, leadV: 'tri'
    },
    lounge2: {
      bpm: 128, key: 2, scale: BLUES, swing: 0.3,
      prog: [[0, 'd7'], [0, 'd7'], [5, 'd7'], [0, 'd7'], [7, 'd7'], [5, 'd7'], [0, 'd7'], [7, 'd7']],
      bass: '1.1.5.5.8.8.5.5.', comp: '..C.C...C.C.C...',
      lead: '1.3.4.5.-.4.3.1.', lead2: '................',
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
      lvl: { bass: 0.12, comp: 0.06, lead: 0.09 }, leadV: 'sq'
    },
    lounge3: {
      bpm: 66, key: -7, scale: MINOR, swing: 0.44,
      prog: [[0, 'm9'], [0, 'm9'], [-4, 'M9'], [7, 'd9']],
      bass: '1.......5.......', comp: '....C.......C...',
      lead: '5.-.-.4.3.-.1.-.', lead2: '................',
      kick: 'x.......x.......', snare: '................', hat: '................',
      ride: '..x...x...x...x.',
      lvl: { bass: 0.1, comp: 0.05, lead: 0.1 }, leadV: 'tri', pad: 1
    },
    /* The city, in the rain, upside down, bleeding. */
    city: {
      bpm: 68, key: -5, scale: MINOR, swing: 0.2,
      prog: [[0, 'm9'], [0, 'm9'], [-2, 'm7'], [-4, 'M7']],
      bass: '1.......8.......', comp: 'C.......C...C...',
      lead: '.....1.-.7.-.5.-', lead2: '................',
      kick: 'x.......x.......', snare: '................', hat: '................',
      lvl: { bass: 0.12, comp: 0.06, lead: 0.075 }, leadV: 'saw', pad: 1
    },
    /* THE PORT. A market with four thousand people in it and every one of
       them shouting a price. */
    port: {
      bpm: 126, key: 2, scale: MAJOR, swing: 0.16,
      prog: [[0, 'M7'], [5, 'M7'], [7, 'd7'], [0, 'M7'], [9, 'm7'], [2, 'm7'], [7, 'd7'], [0, 'M7']],
      bass: '1...5...1...5.3.', comp: '..C...C...C...C.',
      lead: '5.8.-.7.5.3.2.1.', lead2: '................',
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx',
      lvl: { bass: 0.12, comp: 0.055, lead: 0.075 }, leadV: 'sq'
    },
    /* Mr Chum's own theme. Oily, and it will not leave. */
    chum: {
      bpm: 92, key: -7, scale: MINOR, swing: 0.28,
      prog: [[0, 'm7'], [0, 'm7'], [6, 'd7'], [7, 'd7']],
      bass: '1..5..1..3..5...', comp: '..C...C.....C...',
      lead: '1.-.2.1.........', lead2: '................',
      kick: 'x.......x.......', snare: '............x...', hat: '..x...x...x...x.',
      lvl: { bass: 0.13, comp: 0.055, lead: 0.07 }, leadV: 'saw'
    }
  };

  /* ------------------------------------------------------------- the voices */
  function hz(semi) { return 440 * Math.pow(2, (semi - 9) / 12); }

  function mvoice(freq, t0, dur, type, vol, opts) {
    opts = opts || {};
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(freq * opts.slide, t0 + dur);
    const g = ctx.createGain();
    const at = opts.attack || 0.008;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0005, vol), t0 + at);
    g.gain.setValueAtTime(Math.max(0.0005, vol), t0 + Math.max(at, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let out = g;
    if (opts.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = opts.lp; f.Q.value = opts.q || 1;
      g.connect(f); out = f;
    }
    o.connect(g); out.connect(musBus);
    o.start(t0); o.stop(t0 + dur + 0.05);
    // a second oscillator a few cents off makes one thin square into a section
    if (opts.wide) {
      const o2 = ctx.createOscillator();
      o2.type = type; o2.frequency.setValueAtTime(freq * 1.005, t0);
      o2.connect(g); o2.start(t0); o2.stop(t0 + dur + 0.05);
    }
  }

  function mnoise(t0, dur, vol, hi, lo, q) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = 1;
    const f = ctx.createBiquadFilter();
    f.type = lo ? 'bandpass' : 'highpass';
    f.frequency.setValueAtTime(hi, t0);
    if (lo) f.frequency.exponentialRampToValueAtTime(lo, t0 + dur);
    f.Q.value = q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(musBus);
    src.start(t0); src.stop(t0 + dur + 0.03);
  }

  function mkick(t0, vol) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(128, t0);
    o.frequency.exponentialRampToValueAtTime(38, t0 + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
    o.connect(g); g.connect(musBus);
    o.start(t0); o.stop(t0 + 0.25);
  }
  function msnare(t0, vol) {
    mnoise(t0, 0.13, vol, 1700, 700, 1.2);
    const o = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.setValueAtTime(210, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    o.connect(g); g.connect(musBus);
    o.start(t0); o.stop(t0 + 0.12);
  }

  /* ---------------------------------------------------------- the sequencer */
  let cur = 'dig', nextTrack = null, fade = 1;
  let step = 0, nextTime = 0, musicOn = false, intensity = 0;
  let lastLeadNote = 0;

  function trackOf() { return TRACKS[cur] || TRACKS.dig; }

  function schedule() {
    if (!ready || !musicOn || !state.music) return;
    const T = trackOf();
    const spb = 60 / T.bpm / 4;
    const lookahead = now() + 0.25;
    let guard = 0;
    while (nextTime < lookahead && guard++ < 64) {
      const s16 = step % 16;
      const bars = T.prog.length;
      const bar = Math.floor(step / 16) % bars;
      const chordDef = T.prog[bar];
      const croot = T.key + chordDef[0];
      const tones = CHORDS[chordDef[1]] || CHORDS.m;
      // swing: every other semiquaver arrives a little late, which is the
      // whole difference between a lounge and a lift
      const sw = (s16 % 2 === 1) ? spb * (T.swing || 0) : 0;
      const t0 = nextTime + sw;
      const L = T.lvl, amp = fade * (0.7 + intensity * 0.45);

      const c = T.bass[s16];
      if (c >= '1' && c <= '9') {
        mvoice(hz(croot + deg(tones, +c) - 24), t0, spb * 2.6, 'square',
          L.bass * amp, { lp: 420, wide: 1 });
      }
      if (T.comp[s16] === 'C') {
        for (let i = 0; i < tones.length; i++) {
          mvoice(hz(croot + tones[i] - 5 + (i === 0 ? 0 : 0)), t0, spb * 2.2, 'triangle',
            L.comp * amp * (i ? 0.85 : 1), { lp: 2400, attack: 0.02 });
        }
      }
      const lc = T.lead[s16];
      if (lc >= '1' && lc <= '9') {
        lastLeadNote = T.key + deg(T.scale, +lc) + 7;
        const v = T.leadV === 'saw' ? 'sawtooth' : (T.leadV === 'tri' ? 'triangle' : 'square');
        let hold = spb * 2;
        for (let k = s16 + 1; k < 16 && T.lead[k] === '-'; k++) hold += spb;
        mvoice(hz(lastLeadNote), t0, hold, v, L.lead * amp, { lp: 3200, wide: 1, attack: 0.012 });
      }
      if (T.pad && s16 === 0) {
        for (const iv of tones) mvoice(hz(croot + iv - 12), t0, spb * 15, 'triangle',
          0.028 * amp, { lp: 900, attack: 0.5 });
      }
      if (T.kick[s16] === 'x') mkick(t0, 0.2 * amp);
      if (T.snare[s16] === 'x') msnare(t0, 0.11 * amp);
      if (T.hat[s16] === 'x') mnoise(t0, 0.045, 0.045 * amp, 7200);
      if (T.ride && T.ride[s16] === 'x') mnoise(t0, 0.2, 0.026 * amp, 5200, 3600, 0.8);

      step++;
      nextTime += spb;
      // the changeover waits for the top of a bar, so nothing ever lurches
      if (step % 16 === 0 && nextTrack) {
        cur = nextTrack; nextTrack = null; step = 0;
      }
    }
  }

  /* `music(true|false)` turns the band on and off, and is the ONLY thing that
     does -- the settings switch owns it.

     `track('casino')` asks them for a particular number. It must never turn
     the music back on: the frame loop calls it every single frame, and if it
     touched the switch then turning the music off would last exactly one
     frame. They finish the bar they are on before they change. */
  function music(on) {
    init();
    musicOn = !!on;
    state.music = !!on;
    if (musBus) musBus.gain.value = on ? 0.34 : 0;
    if (on && ready) nextTime = Math.max(nextTime, now() + 0.05);
  }
  function track(name) {
    if (!TRACKS[name]) return;
    if (name === cur) { nextTrack = null; return; }
    nextTrack = name;
  }
  function playing() { return nextTrack || cur; }

  function setIntensity(v) { intensity = U.clamp(v, 0, 1); }

  function toggleSfx(on) {
    state.sfx = on;
    if (!on) { drill(false); thrust(0); rain(0); room(0); }
  }
  function toggleMusic(on) { music(!!on); }

  // expose the raw synth voices on the sfx table too, so callers can reach
  // for a one-off beep without caring which namespace it lives in
  S.tone = tone;
  S.noise = noise;

  PD.audio = {
    init, resume, tone, noise, drill, thrust, rain, room, music, track, playing, schedule, setIntensity,
    toggleSfx, toggleMusic, state, sfx: S, TRACKS,
    get ok() { return ready; }
  };
})(window.PD);
