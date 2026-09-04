/* Touch controls. A thumbstick for the jets, drag-to-aim that also drills,
   and chunky action keys -- all drawn into the low-res canvas so they look
   like part of the ship, not a browser overlay. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;

  const VW = 480, VH = 270;

  const cfg = {
    stick: { x: 62, y: VH - 58, r: 34, knob: 15 },
    fire:  { x: VW - 40, y: VH - 40, r: 21, label: 'FIRE', col: '#7ef9ff' },
    use:   { x: VW - 40, y: VH - 92, r: 15, label: 'E', col: '#ffd34d' },
    beam:  { x: VW - 88, y: VH - 34, r: 14, label: 'R', col: '#ff8ad8' }
  };

  const state = {
    enabled: false, forced: null,
    stickId: null, sx: 0, sy: 0, dx: 0, dy: 0,
    aimId: null, ax: 0, ay: 0, aiming: false,
    fire: false, use: false, useEdge: false, beam: false,
    mode: 'play', tapX: 0, tapY: 0, tapPress: false, tapHold: false
  };

  function autoDetect() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return coarse || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  }

  let toScreen = null;      // set by game.js: css px -> internal px

  function attach(canvas, mapper) {
    toScreen = mapper;
    state.enabled = state.forced === null ? autoDetect() : state.forced;

    const hit = (p, c) => U.dist(p.x, p.y, c.x, c.y) <= c.r + 8;

    function pos(touch) {
      const r = canvas.getBoundingClientRect();
      return toScreen(touch.clientX - r.left, touch.clientY - r.top);
    }

    canvas.addEventListener('touchstart', e => {
      state.enabled = state.forced === null ? true : state.forced;
      for (const tch of e.changedTouches) {
        const p = pos(tch);
        state.tapX = p.x; state.tapY = p.y;
        if (state.mode !== 'play') { state.tapPress = true; state.tapHold = true; continue; }
        if (hit(p, cfg.fire)) { state.fire = true; continue; }
        if (hit(p, cfg.use)) { state.use = true; state.useEdge = true; continue; }
        if (hit(p, cfg.beam)) { state.beam = true; continue; }
        if (p.x < VW * 0.45) {
          state.stickId = tch.identifier;
          state.sx = p.x; state.sy = p.y; state.dx = 0; state.dy = 0;
        } else {
          state.aimId = tch.identifier;
          state.ax = p.x; state.ay = p.y; state.aiming = true;
        }
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      for (const tch of e.changedTouches) {
        const p = pos(tch);
        state.tapX = p.x; state.tapY = p.y;
        if (tch.identifier === state.stickId) {
          const dx = p.x - state.sx, dy = p.y - state.sy;
          const d = Math.hypot(dx, dy) || 1;
          const k = Math.min(1, d / cfg.stick.r);
          state.dx = dx / d * k; state.dy = dy / d * k;
        } else if (tch.identifier === state.aimId) {
          state.ax = p.x; state.ay = p.y;
        }
      }
      e.preventDefault();
    }, { passive: false });

    function end(e) {
      for (const tch of e.changedTouches) {
        if (tch.identifier === state.stickId) { state.stickId = null; state.dx = state.dy = 0; }
        if (tch.identifier === state.aimId) { state.aimId = null; state.aiming = false; }
      }
      if (!e.touches.length) { state.fire = state.use = state.beam = false; state.tapHold = false; }
      e.preventDefault();
    }
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
  }

  /* Push the touch state into the shared input object before the game reads it. */
  function apply(mode) {
    state.mode = mode;
    if (!state.enabled) return;
    const IN = PD.input;

    if (mode === 'play') {
      const dz = 0.28;
      IN.keys.left = state.dx < -dz;
      IN.keys.right = state.dx > dz;
      IN.keys.up = state.dy < -dz;
      IN.keys.down = state.dy > dz;

      if (state.aiming) {
        IN.mouse.x = state.ax; IN.mouse.y = state.ay;
        IN.mouse.inside = true;
        IN.mouse.left = true;
      } else {
        IN.mouse.left = false;
      }
      IN.mouse.right = state.fire;
      if (state.useEdge) { IN.keys.KeyE = true; state.useEdge = false; }
      IN.keys.KeyR = state.beam;
    } else {
      // menus, interior and terminals: touches behave like a mouse
      IN.mouse.x = state.tapX; IN.mouse.y = state.tapY;
      IN.mouse.inside = true;
      IN.mouse.left = state.tapHold;
      if (state.tapPress) { IN.mouse.leftPressed = true; state.tapPress = false; }
    }
  }

  /* Called after apply() so a synthetic KeyE only lasts one frame. */
  function clearEdges() {
    if (!state.enabled) return;
    PD.input.keys.KeyE = false;
  }

  function ring(ctx, x, y, r, col, alpha, width) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = col;
    ctx.lineWidth = width || 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function padBtn(ctx, c, pressed) {
    ctx.globalAlpha = pressed ? 0.5 : 0.24;
    ctx.fillStyle = c.col;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, U.TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ring(ctx, c.x, c.y, c.r, c.col, pressed ? 1 : 0.6, 2);
    F.draw(ctx, c.label, c.x, c.y - 3, '#ffffff', { center: true, shadow: false, alpha: pressed ? 1 : 0.85 });
  }

  function draw(ctx, mode) {
    if (!state.enabled || mode !== 'play') return;
    const s = cfg.stick;
    ring(ctx, s.x, s.y, s.r, '#7ef9ff', 0.35, 2);
    ring(ctx, s.x, s.y, s.r - 10, '#7ef9ff', 0.15, 1);
    const kx = s.x + state.dx * (s.r - s.knob), ky = s.y + state.dy * (s.r - s.knob);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#7ef9ff';
    ctx.beginPath(); ctx.arc(kx, ky, s.knob, 0, U.TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ring(ctx, kx, ky, s.knob, '#eafcff', 0.8, 1);

    padBtn(ctx, cfg.fire, state.fire);
    padBtn(ctx, cfg.use, state.use);
    padBtn(ctx, cfg.beam, state.beam);

    // aim reticle while dragging
    if (state.aiming) {
      ring(ctx, state.ax, state.ay, 9, '#ffd34d', 0.9, 1);
      ring(ctx, state.ax, state.ay, 3, '#ffffff', 0.9, 1);
    } else {
      F.draw(ctx, 'DRAG RIGHT SIDE TO DRILL', VW - 6, VH - 128, 'rgba(255,255,255,0.35)', { right: true, shadow: false });
    }
  }

  function setEnabled(on) { state.forced = on; state.enabled = on; }

  PD.touch = { attach, apply, clearEdges, draw, setEnabled, cfg, state, get enabled() { return state.enabled; } };
})(window.PD);
