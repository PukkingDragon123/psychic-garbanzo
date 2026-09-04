/* Keyboard + mouse. Screen coordinates are converted to the low-res internal
   canvas space by game.js, which owns the scale factor. */
(function (PD) {
  'use strict';

  const keys = {};        // held
  const pressed = {};     // edge-triggered, cleared each frame
  const released = {};

  const mouse = {
    sx: 0, sy: 0,          // css pixels inside the canvas element
    x: 0, y: 0,            // internal canvas pixels (filled by game)
    wx: 0, wy: 0,          // world pixels (filled by game)
    left: false, right: false,
    leftPressed: false, rightPressed: false,
    wheel: 0, inside: false
  };

  const ALIAS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    Space: 'space', ShiftLeft: 'shift', ShiftRight: 'shift',
    Escape: 'esc', Enter: 'enter'
  };

  function code(e) { return ALIAS[e.code] || e.code; }

  let firstTouch = null;

  function attach(canvas) {
    window.addEventListener('keydown', e => {
      const c = code(e);
      if (!keys[c]) pressed[c] = true;
      keys[c] = true;
      if (['space', 'up', 'down', 'left', 'right', 'Tab', 'shift'].indexOf(c) >= 0) e.preventDefault();
      if (firstTouch) firstTouch();
    });
    window.addEventListener('keyup', e => {
      const c = code(e);
      keys[c] = false;
      released[c] = true;
    });
    window.addEventListener('blur', () => {
      for (const k in keys) keys[k] = false;
      mouse.left = mouse.right = false;
    });

    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      mouse.sx = e.clientX - r.left;
      mouse.sy = e.clientY - r.top;
      mouse.inside = true;
    });
    canvas.addEventListener('mouseleave', () => { mouse.inside = false; });
    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) { mouse.left = true; mouse.leftPressed = true; }
      if (e.button === 2) { mouse.right = true; mouse.rightPressed = true; }
      e.preventDefault();
      if (firstTouch) firstTouch();
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) mouse.left = false;
      if (e.button === 2) mouse.right = false;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  }

  function onFirstInteraction(fn) { firstTouch = () => { fn(); firstTouch = null; }; }

  function endFrame() {
    for (const k in pressed) pressed[k] = false;
    for (const k in released) released[k] = false;
    mouse.leftPressed = false;
    mouse.rightPressed = false;
    mouse.wheel = 0;
  }

  const down = k => !!keys[k];
  const hit = k => !!pressed[k];
  const pressedSet = k => { pressed[k] = true; };

  PD.input = { keys, mouse, attach, endFrame, down, hit, pressedSet, onFirstInteraction };
})(window.PD);
