/* Touch controls, drawn into the low-res canvas so they look like part of the
   suit's HUD: a thumbstick for the jets, drag-to-aim that also drills, and a
   cluster of action keys. Haptics where the browser allows. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;

  const VW = 480, VH = 270;

  const cfg = {
    stick: { x: 62, y: VH - 60, r: 36, knob: 16 },
    keys: {
      fire: { x: VW - 38, y: VH - 46, r: 22, label: 'FIRE', col: '#7ef9ff', key: null },
      dash: { x: VW - 86, y: VH - 30, r: 16, label: 'DASH', col: '#ffd34d', key: 'shift' },
      swap: { x: VW - 90, y: VH - 72, r: 13, label: 'SWAP', col: '#ff8ad8', key: 'KeyQ' },
      scan: { x: VW - 40, y: VH - 96, r: 13, label: 'SCAN', col: '#8affa0', key: 'Tab' },
      use:  { x: VW - 130, y: VH - 54, r: 13, label: 'E',    col: '#ffb03d', key: 'KeyE' },
      beam: { x: VW - 130, y: VH - 22, r: 11, label: 'R',    col: '#ff5a4d', key: 'KeyR', hold: true }
    }
  };

  const state = {
    enabled: false, forced: null,
    stickId: null, sx: 0, sy: 0, dx: 0, dy: 0,
    aimId: null, ax: 0, ay: 0, aiming: false,
    down: {}, edge: {},                 // per key: held, pressed-this-frame
    mode: 'play', tapX: 0, tapY: 0, tapPress: false, tapHold: false,
    pressAnim: {}
  };

  function autoDetect() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return coarse || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  }

  function buzz(ms) {
    if (!state.enabled) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not allowed */ }
  }

  let toScreen = null;

  function attach(canvas, mapper) {
    toScreen = mapper;
    state.enabled = state.forced === null ? autoDetect() : state.forced;
    const hit = (p, c) => U.dist(p.x, p.y, c.x, c.y) <= c.r + 7;
    const pos = tch => { const r = canvas.getBoundingClientRect(); return toScreen(tch.clientX - r.left, tch.clientY - r.top); };
    const keyOwner = {};   // touch id -> key name

    canvas.addEventListener('touchstart', e => {
      state.enabled = state.forced === null ? true : state.forced;
      for (const tch of e.changedTouches) {
        const p = pos(tch);
        state.tapX = p.x; state.tapY = p.y;
        if (state.mode !== 'play') { state.tapPress = true; state.tapHold = true; continue; }
        let took = false;
        for (const k in cfg.keys) {
          if (hit(p, cfg.keys[k])) {
            state.down[k] = true; state.edge[k] = true; state.pressAnim[k] = 1;
            keyOwner[tch.identifier] = k; took = true; buzz(8); break;
          }
        }
        if (took) continue;
        if (p.x < VW * 0.42) {
          state.stickId = tch.identifier; state.sx = p.x; state.sy = p.y; state.dx = 0; state.dy = 0;
        } else {
          state.aimId = tch.identifier; state.ax = p.x; state.ay = p.y; state.aiming = true;
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
        } else if (tch.identifier === state.aimId) { state.ax = p.x; state.ay = p.y; }
      }
      e.preventDefault();
    }, { passive: false });

    function end(e) {
      for (const tch of e.changedTouches) {
        if (tch.identifier === state.stickId) { state.stickId = null; state.dx = state.dy = 0; }
        if (tch.identifier === state.aimId) { state.aimId = null; state.aiming = false; }
        const k = keyOwner[tch.identifier];
        if (k) { state.down[k] = false; delete keyOwner[tch.identifier]; }
      }
      if (!e.touches.length) { for (const k in state.down) state.down[k] = false; state.tapHold = false; }
      e.preventDefault();
    }
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
  }

  /* Push touch state into the shared input object before the game reads it. */
  function apply(mode) {
    state.mode = mode;
    if (!state.enabled) return;
    const IN = PD.input;
    if (mode === 'play') {
      const dz = 0.26;
      IN.keys.left = state.dx < -dz; IN.keys.right = state.dx > dz;
      IN.keys.up = state.dy < -dz;   IN.keys.down = state.dy > dz;
      if (state.aiming) { IN.mouse.x = state.ax; IN.mouse.y = state.ay; IN.mouse.inside = true; IN.mouse.left = true; }
      else IN.mouse.left = false;
      IN.mouse.right = !!state.down.fire;
      IN.keys.KeyR = !!state.down.beam;
      for (const k in cfg.keys) {
        const key = cfg.keys[k].key;
        if (!key || cfg.keys[k].hold) continue;
        if (state.edge[k]) { IN.keys[key] = true; IN.pressedSet(key); state.edge[k] = false; }
      }
    } else {
      IN.mouse.x = state.tapX; IN.mouse.y = state.tapY; IN.mouse.inside = true;
      IN.mouse.left = state.tapHold;
      if (state.tapPress) { IN.mouse.leftPressed = true; state.tapPress = false; }
      // E still works as a tap-through in menus and on deck
      if (state.edge.use) { IN.pressedSet('KeyE'); state.edge.use = false; }
    }
  }

  function clearEdges() {
    if (!state.enabled) return;
    const IN = PD.input;
    for (const k in cfg.keys) {
      const key = cfg.keys[k].key;
      if (key && !cfg.keys[k].hold) IN.keys[key] = false;
    }
  }

  /* --------------------------------------------------------------- drawing */
  function hexPath(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  function padKey(ctx, k, c, t) {
    const pressed = !!state.down[k];
    state.pressAnim[k] = U.damp(state.pressAnim[k] || 0, pressed ? 1 : 0, 0.3, 1 / 60);
    const a = state.pressAnim[k];
    const r = c.r * (1 + a * 0.1);
    ctx.fillStyle = 'rgba(8,4,18,0.72)';
    hexPath(ctx, c.x, c.y, r + 2); ctx.fill();
    ctx.fillStyle = c.col; ctx.globalAlpha = 0.18 + a * 0.5;
    hexPath(ctx, c.x, c.y, r); ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = c.col; ctx.lineWidth = pressed ? 2 : 1;
    hexPath(ctx, c.x, c.y, r); ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.55, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    ctx.globalAlpha = 1;
    F.draw(ctx, c.label, c.x, c.y - 3, '#ffffff', { center: true, shadow: false, scale: c.r > 18 ? 1 : 1 });
  }

  function draw(ctx, mode, g) {
    if (!state.enabled || mode !== 'play') return;
    const t = g ? g.time : 0;
    const s = cfg.stick;
    // stick well
    ctx.fillStyle = 'rgba(8,4,18,0.55)';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 4, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = '#7ef9ff'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, U.TAU); ctx.stroke();
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      F.draw(ctx, ['>', 'V', '<', '^'][i], s.x + Math.cos(a) * (s.r - 8), s.y + Math.sin(a) * (s.r - 8) - 3, '#7ef9ff', { center: true, shadow: false });
    }
    ctx.globalAlpha = 1;
    const kx = s.x + state.dx * (s.r - s.knob), ky = s.y + state.dy * (s.r - s.knob);
    ctx.fillStyle = '#7ef9ff'; ctx.globalAlpha = state.stickId !== null ? 0.6 : 0.35;
    ctx.beginPath(); ctx.arc(kx, ky, s.knob, 0, U.TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#eafcff'; ctx.beginPath(); ctx.arc(kx, ky, s.knob, 0, U.TAU); ctx.stroke();

    for (const k in cfg.keys) padKey(ctx, k, cfg.keys[k], t);

    // cooldown arcs on dash / scan
    if (g && g.player) {
      const p = g.player;
      const arc = (c, frac, col) => {
        if (frac <= 0) return;
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 4, -Math.PI / 2, -Math.PI / 2 + U.TAU * frac); ctx.stroke();
        ctx.globalAlpha = 1;
      };
      arc(cfg.keys.dash, p.dashCool / Math.max(0.1, p.stat('dash')), '#ffd34d');
      arc(cfg.keys.scan, p.scanCool / 4, '#8affa0');
    }

    if (state.aiming) {
      ctx.strokeStyle = '#ffd34d'; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(state.ax, state.ay, 9, 0, U.TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(state.ax, state.ay, 3, 0, U.TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (g && g.time < 30) {
      F.draw(ctx, 'DRAG THE RIGHT SIDE TO AIM AND DRILL', VW / 2, VH - 130, 'rgba(255,255,255,0.4)', { center: true, shadow: false });
    }
  }

  function setEnabled(on) { state.forced = on; state.enabled = on; }

  PD.touch = { attach, apply, clearEdges, draw, setEnabled, buzz, cfg, state, get enabled() { return state.enabled; } };
})(window.PD);
