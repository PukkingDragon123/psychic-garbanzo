/* Touch controls, no circles: a hexagonal pad for the jets, hex action keys,
   drag-to-aim that also drills, tap-to-fly in the field, tap-through in menus. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const G = PD.glyph;
  const X = PD.pxd;

  const VW = 480, VH = 270;

  /* Three keys, never more, each one big enough to hit without looking and
     labelled with a word rather than a symbol you have to decode. */
  const cfg = {
    stick: { x: 62, y: VH - 60, r: 36, knob: 15 },
    play: {
      dash: { x: VW - 40, y: VH - 44, r: 22, glyph: 'dash', col: '#ffd34d', key: 'shift', label: 'DASH' },
      scan: { x: VW - 40, y: VH - 100, r: 20, glyph: 'scan', col: '#8affa0', key: 'Tab', label: 'FIND' },
      use:  { x: VW - 40, y: VH - 152, r: 20, glyph: 'home', col: '#ffb03d', key: 'KeyE', label: 'SHIP' }
    },
    home: {
      jump: { x: VW - 40, y: VH - 44, r: 24, glyph: 'up', col: '#7ef9ff', key: 'up', label: 'JUMP' },
      use:  { x: VW - 40, y: VH - 104, r: 22, glyph: 'hand', col: '#ffb03d', key: 'KeyE', label: 'USE' },
      roll: { x: VW - 40, y: VH - 158, r: 18, glyph: 'dash', col: '#ffd34d', key: 'shift', label: 'ROLL' }
    }
  };

  const state = {
    enabled: false, forced: null,
    stickId: null, sx: 0, sy: 0, dx: 0, dy: 0,
    aimId: null, ax: 0, ay: 0, aiming: false,
    down: {}, edge: {}, pressAnim: {},
    mode: 'play', tapX: 0, tapY: 0, tapPress: false, tapHold: false
  };

  function autoDetect() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return coarse || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  }
  function buzz(ms) { if (!state.enabled) return; try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  let toScreen = null;
  function keysFor(mode) { return cfg[mode] || null; }

  function attach(canvas, mapper) {
    toScreen = mapper;
    state.enabled = state.forced === null ? autoDetect() : state.forced;
    const hit = (p, c) => U.dist(p.x, p.y, c.x, c.y) <= c.r + 7;
    const pos = tch => { const r = canvas.getBoundingClientRect(); return toScreen(tch.clientX - r.left, tch.clientY - r.top); };
    const owner = {};

    canvas.addEventListener('touchstart', e => {
      state.enabled = state.forced === null ? true : state.forced;
      for (const tch of e.changedTouches) {
        const p = pos(tch);
        state.tapX = p.x; state.tapY = p.y;
        const keys = keysFor(state.mode);
        let took = false;
        if (keys) for (const k in keys) {
          if (hit(p, keys[k])) { state.down[k] = true; state.edge[k] = true; state.pressAnim[k] = 1; owner[tch.identifier] = k; took = true; buzz(8); break; }
        }
        if (took) continue;
        if (state.mode === 'play') {
          if (p.x < VW * 0.44) { state.stickId = tch.identifier; state.sx = p.x; state.sy = p.y; state.dx = state.dy = 0; }
          else { state.aimId = tch.identifier; state.ax = p.x; state.ay = p.y; state.aiming = true; }
        } else if (state.mode === 'home' && p.x < VW * 0.5 && p.y > VH * 0.45) {
          // left half of the moon: a held touch walks you that way
          state.stickId = tch.identifier; state.sx = p.x; state.sy = p.y; state.dx = state.dy = 0;
          state.tapPress = true; state.tapX = p.x; state.tapY = p.y;
        } else {
          // field and menus: a held touch is a pointer, a tap is a click
          state.aimId = tch.identifier; state.ax = p.x; state.ay = p.y; state.aiming = true;
          state.tapPress = true; state.tapHold = true;
        }
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      for (const tch of e.changedTouches) {
        const p = pos(tch);
        state.tapX = p.x; state.tapY = p.y;
        if (tch.identifier === state.stickId) {
          const dx = p.x - state.sx, dy = p.y - state.sy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / cfg.stick.r);
          state.dx = dx / d * k; state.dy = dy / d * k;
        } else if (tch.identifier === state.aimId) { state.ax = p.x; state.ay = p.y; }
      }
      e.preventDefault();
    }, { passive: false });

    function end(e) {
      for (const tch of e.changedTouches) {
        if (tch.identifier === state.stickId) { state.stickId = null; state.dx = state.dy = 0; }
        if (tch.identifier === state.aimId) { state.aimId = null; state.aiming = false; }
        const k = owner[tch.identifier];
        if (k) { state.down[k] = false; delete owner[tch.identifier]; }
      }
      if (!e.touches.length) { for (const k in state.down) state.down[k] = false; state.tapHold = false; }
      e.preventDefault();
    }
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
  }

  function apply(mode) {
    state.mode = mode;
    if (!state.enabled) return;
    const IN = PD.input;
    const keys = keysFor(mode);
    if (keys) for (const k in keys) {
      const key = keys[k].key;
      if (!key) continue;
      if (keys[k].hold) IN.keys[key] = !!state.down[k];
      else if (state.edge[k]) { IN.keys[key] = true; IN.pressedSet(key); state.edge[k] = false; }
    }
    if (mode === 'play') {
      const dz = 0.26;
      IN.keys.left = state.dx < -dz; IN.keys.right = state.dx > dz;
      IN.keys.up = state.dy < -dz;   IN.keys.down = state.dy > dz;
      // one button: a held touch on the right aims and drills; the gun is automatic
      if (state.aiming) { IN.mouse.x = state.ax; IN.mouse.y = state.ay; IN.mouse.inside = true; IN.mouse.left = true; }
      else IN.mouse.left = false;
    } else {
      if (mode === 'home') {
        const dz = 0.3;
        IN.keys.left = state.dx < -dz; IN.keys.right = state.dx > dz;
        if (state.stickId !== null && Math.abs(state.dx) > dz) state.tapPress = false;
      }
      IN.mouse.x = state.tapX; IN.mouse.y = state.tapY; IN.mouse.inside = true;
      IN.mouse.left = state.tapHold;
      if (state.tapPress) { IN.mouse.leftPressed = true; state.tapPress = false; }
    }
  }

  function clearEdges() {
    if (!state.enabled) return;
    const IN = PD.input;
    for (const m of ['play', 'home']) for (const k in cfg[m]) { const key = cfg[m][k].key; if (key && !cfg[m][k].hold) IN.keys[key] = false; }
  }

  function padKey(ctx, k, c) {
    const pressed = !!state.down[k];
    state.pressAnim[k] = U.damp(state.pressAnim[k] || 0, pressed ? 1 : 0, 0.3, 1 / 60);
    const a = state.pressAnim[k];
    // BOUNCY: a key you press squashes and springs back past its own size
    const r = c.r * (1 + a * 0.18 - (pressed ? 0.1 : 0));
    G.hex(ctx, c.x, c.y + 2, r + 2, 'rgba(8,4,18,0.8)', null);
    ctx.globalAlpha = 0.26 + a * 0.5; G.hex(ctx, c.x, c.y, r, c.col, null); ctx.globalAlpha = 1;
    G.hex(ctx, c.x, c.y, r, null, pressed ? '#ffffff' : c.col, pressed ? 3 : 2);
    G.draw(ctx, c.glyph, c.x - 7, c.y - 11, '#ffffff', c.col);
    if (c.label) PD.font.draw(ctx, c.label, c.x, c.y + 4, '#ffffff', { center: true, shadow: '#0b0718' });
  }

  function draw(ctx, mode, g) {
    if (!state.enabled || mode === 'ui') return;
    if (mode === 'home') {
      const keys = keysFor(mode);
      for (const k in keys) padKey(ctx, k, keys[k]);
      PD.font.draw(ctx, 'TAP WHERE YOU WANT TO GO', 10, VH - 14, 'rgba(201,188,232,0.7)', { shadow: '#0b0718' });
      return;
    }
    const t = g ? g.time : 0;
    if (mode === 'play') {
      // the drill is the whole right half: hold anywhere and aim with the same
      // finger. It is the one thing you do most, so it gets the most screen.
      const held = state.aiming;
      ctx.globalAlpha = held ? 0.1 : 0.05;
      X.dither(ctx, VW * 0.44, 26, VW * 0.56 - 76, VH - 52, held ? '#ffd34d' : '#c9bce8', 0);
      ctx.globalAlpha = 1;
      // the hint stops nagging the moment you have actually drilled something
      if (!held && g && g.save && g.save.totalMined < 8) {
        PD.font.draw(ctx, 'HOLD HERE TO AIM + DRILL', VW * 0.5 + 88, VH - 22, 'rgba(255,211,77,0.8)', { center: true, shadow: '#0b0718' });
      }
      const s = cfg.stick;
      G.hex(ctx, s.x, s.y, s.r + 4, 'rgba(8,4,18,0.55)', null);
      G.hex(ctx, s.x, s.y, s.r, null, '#7ef9ff', 1);
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 2; G.hex(ctx, s.x + Math.cos(a) * (s.r - 7), s.y + Math.sin(a) * (s.r - 7), 2, '#7ef9ff', null); }
      ctx.globalAlpha = 1;
      const kx = s.x + state.dx * (s.r - s.knob), ky = s.y + state.dy * (s.r - s.knob);
      G.hex(ctx, kx, ky, s.knob * (state.stickId !== null ? 1.12 : 1), 'rgba(126,249,255,' + (state.stickId !== null ? 0.65 : 0.35) + ')', '#eafcff', 2);
      PD.font.draw(ctx, 'FLY', s.x, s.y + s.r + 6, 'rgba(126,249,255,0.8)', { center: true, shadow: '#0b0718' });
    }
    const keys = keysFor(mode);
    for (const k in keys) padKey(ctx, k, keys[k]);
    if (g && g.player && mode === 'play') {
      const p = g.player;
      G.hexProgress(ctx, cfg.play.dash.x, cfg.play.dash.y, cfg.play.dash.r + 4, 1 - p.dashCool / Math.max(0.1, p.stat('dash')), '#ffd34d');
      G.hexProgress(ctx, cfg.play.scan.x, cfg.play.scan.y, cfg.play.scan.r + 4, 1 - p.scanCool / 4, '#8affa0');
    }
    if (state.aiming && mode === 'play') {
      const pu = 1 + Math.sin(t * 14) * 0.16;
      G.hex(ctx, state.ax, state.ay, 11 * pu, null, '#ffd34d', 2);
      G.hex(ctx, state.ax, state.ay, 4, null, '#ffffff', 2);
    }
  }

  function setEnabled(on) { state.forced = on; state.enabled = on; }
  PD.touch = { attach, apply, clearEdges, draw, setEnabled, buzz, cfg, state, get enabled() { return state.enabled; } };
})(window.PD);
