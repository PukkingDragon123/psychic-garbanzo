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
    }
  };

  /* --------------------------------------------------------------- the music
     Sleazy little villain groove: walking bass, minor arpeggio, hat pulse. */
  const SCALE = [0, 3, 5, 7, 10];          // minor pentatonic
  const BASS = [0, 0, 3, 0, -2, -2, 5, 3];
  let step = 0, nextTime = 0, musicOn = false, intensity = 0;
  const BPM = 96, SPB = 60 / BPM / 4;      // 16th notes

  function mnote(freq, t0, dur, type, vol) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(musBus);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  function hz(semi) { return 55 * Math.pow(2, semi / 12); }

  function schedule() {
    if (!ready || !musicOn || !state.music) return;
    const lookahead = now() + 0.2;
    while (nextTime < lookahead) {
      const bar = Math.floor(step / 16) % 4;
      const s16 = step % 16;
      const root = BASS[(Math.floor(step / 8)) % BASS.length];

      if (s16 % 4 === 0) mnote(hz(root + 24), nextTime, 0.22, 'square', 0.11);            // bass
      if (s16 % 8 === 4) mnote(hz(root + 31), nextTime, 0.14, 'triangle', 0.07);
      if (s16 % 2 === 1) {                                                                // hat
        const src = ctx.createBufferSource(); src.buffer = noiseBuf;
        const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.05 + intensity * 0.04, nextTime);
        g.gain.exponentialRampToValueAtTime(0.0001, nextTime + 0.05);
        src.connect(f); f.connect(g); g.connect(musBus);
        src.start(nextTime); src.stop(nextTime + 0.07);
      }
      if (intensity > 0.2 && (s16 === 0 || s16 === 6 || s16 === 10)) {                     // kick
        mnote(58, nextTime, 0.16, 'sine', 0.2);
      }
      if (bar !== 3 || intensity > 0.4) {                                                  // arp
        const n = SCALE[(step * 3) % SCALE.length];
        if (s16 % 2 === 0) mnote(hz(root + 48 + n), nextTime, 0.1, 'square', 0.045 + intensity * 0.03);
      }
      step++;
      nextTime += SPB;
    }
  }

  function music(on) {
    init();
    musicOn = on;
    if (on && ready) { nextTime = Math.max(nextTime, now() + 0.05); }
  }

  function setIntensity(v) { intensity = U.clamp(v, 0, 1); }

  function toggleSfx(on) {
    state.sfx = on;
    if (!on) { drill(false); thrust(0); }
  }
  function toggleMusic(on) {
    state.music = on;
    if (musBus) musBus.gain.value = on ? 0.34 : 0;
  }

  // expose the raw synth voices on the sfx table too, so callers can reach
  // for a one-off beep without caring which namespace it lives in
  S.tone = tone;
  S.noise = noise;

  PD.audio = {
    init, resume, tone, noise, drill, thrust, music, schedule, setIntensity,
    toggleSfx, toggleMusic, state, sfx: S,
    get ok() { return ready; }
  };
})(window.PD);
