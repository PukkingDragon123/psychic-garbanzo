/* TALKING, WITH ANSWERS.
   A conversation is a little graph of nodes. Each node is somebody saying
   something -- a portrait, a name, a line that types itself out -- and it
   either runs on to the next node or stops and offers you replies. What you
   pick can change what they say next, and it can DO things: pay the debt,
   take a discount, make Mr Chum laugh, make Mr Chum bite.

     PD.talk.start(g, {
       start: 'a',
       nodes: {
         a: { who: 'chum', face: 'smug', text: 'YOU OWE ME.', choices: [
           { t: 'I KNOW.', next: 'b' },
           { t: 'PAY $10K', if: g => g.save.credits >= 1e4, fx: g => ..., next: 'c' } ] },
         b: { who: 'you', text: '...', next: null }
       },
       onEnd: g => {}
     });

   The box sits along the bottom of the screen and everything else waits
   while it is up: the game underneath keeps drawing but does not update. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const X = PD.pxd;
  const F = PD.font;
  const A = PD.audio;
  const VW = 480, VH = 270;

  const T = { on: 0, conv: null, node: null, id: null, chars: 0, t: 0, pop: 0, sel: 0, hist: [], lock: 0, faceT: 0 };

  /* ------------------------------------------------------------ portraits
     Who can talk, what they are called, what colour their name plate is,
     and how to draw their face in a box. */
  const WHO = {
    chum: { name: 'MR CHUM', col: '#c83a3a', text: '#ffe9d8',
      draw(ctx, x, y, w, h, t, face, talking) {
        PD.chum.drawChumAt(ctx, x + w / 2, y + h + 34 - (talking ? Math.abs(Math.sin(t * 12)) * 1.5 : 0), 1.2, talking, t);
      } },
    you: { name: 'YOU', col: '#2a8a5a', text: '#e8fff0',
      draw(ctx, x, y, w, h, t, face, talking, g) {
        const sk = PD.art.skinFor(g.save.cos), spr = sk.alienCore;
        const FACEI = { idle: 0, happy: 5, cross: 6, shock: 7, woozy: 8, smug: 9, blink: 4 };
        let fi = FACEI[face] || 0;
        if (talking && Math.sin(t * 12) > 0 && fi === 0) fi = 5;
        const cv = spr.frames[fi % spr.frames.length], k = spr.hd || 1;
        ctx.save();
        ctx.translate(x + w / 2, y + h + 36 - (talking ? Math.abs(Math.sin(t * 12)) : 0));
        ctx.scale(3, 3);
        ctx.drawImage(cv, -spr.ox, -spr.oy, cv.width / k, cv.height / k);
        ctx.restore();
      } },
    drax: { name: 'DRAX', col: '#5a6a7a', text: '#e8ecf2',
      draw(ctx, x, y, w, h, t) {
        ctx.save(); ctx.translate(x + w / 2, y + h + 84); ctx.scale(1.8, 1.8);
        PD.chum.drawDrax(ctx, 0, 0, t); ctx.restore();
      } },
    brenda: { name: 'BRENDA', col: '#d86aa0', text: '#ffe8f4',
      draw(ctx, x, y, w, h, t, face, talking) {
        const s = PD.arthome.S.ratFed;
        const cv = s.frames[talking && Math.sin(t * 10) > 0 ? 1 : 0];
        ctx.save(); ctx.translate(x + w / 2, y + h - 8); ctx.scale(2.6, 2.6);
        ctx.drawImage(cv, -s.ox, -s.oy, s.w, s.h); ctx.restore();
      } },
    zorb: { name: 'ZORB OS', col: '#2f6fd0', text: '#dff0ff',
      draw(ctx, x, y, w, h, t) {
        X.plate(ctx, x + 12, y + 14, w - 24, h - 28, '#0a1a30', '#38a8ff', '#04101c', 6);
        const blink = Math.sin(t * 2.2) > 0.94;
        for (const s of [-1, 1]) X.rect(ctx, x + w / 2 + s * 10 - 3, y + h / 2 - 6, 6, blink ? 1 : 8, '#7ef9ff');
        X.rect(ctx, x + w / 2 - 8, y + h / 2 + 8, 16, 2, '#7ef9ff');
      } }
  };
  // anybody from the cast can talk too: who: 'kin:MOCHI'
  function whoOf(id) {
    if (WHO[id]) return WHO[id];
    if (id && id.indexOf('kin:') === 0) {
      const nm = id.slice(4);
      const K = PD.arthome.KIN.find(k => k.who === nm || k.celeb === nm) || PD.arthome.KIN[0];
      return { name: nm, col: '#6a4aa8', text: '#f0e8ff',
        draw(ctx, x, y, w, h, t, face, talking) {
          const FR = { idle: 0, happy: 6, sad: 7, cross: 8, shock: 9, laugh: 10, smug: 4 };
          let f = FR[face] || 0;
          if (talking && Math.sin(t * 12) > 0 && f === 0) f = 3;
          const sc = Math.min(2.4, (h - 8) / Math.max(20, K.h));
          PD.crowd.bouncy(ctx, K, f, x + w / 2, y + h - 4, false, sc, sc * (1 + Math.sin(t * 2.4) * 0.02), 0);
        } };
    }
    return { name: id || '', col: '#4a4470', text: '#ffffff', draw() {} };
  }

  /* ------------------------------------------------------------ control */
  function start(g, conv) {
    T.on = 1; T.conv = conv; T.hist = []; T.lock = 0.2;
    go(g, conv.start || Object.keys(conv.nodes)[0]);
  }
  function go(g, id) {
    if (!id) { end(g); return; }
    const n = T.conv.nodes[id];
    if (!n) { end(g); return; }
    T.id = id; T.node = n; T.chars = 0; T.t = 0; T.pop = 0; T.sel = 0;
    // a node's text can be worked out when it is reached
    T.text = typeof n.text === 'function' ? n.text(g) : n.text;
    T.opts = (n.choices || []).filter(c => !c.if || c.if(g));
    if (n.fx) n.fx(g);
    A.sfx.tone(n.who === 'chum' ? 180 : 520, { type: 'square', to: n.who === 'chum' ? 120 : 680, dur: 0.05, vol: 0.04 });
  }
  function end(g) {
    const c = T.conv;
    T.on = 0; T.conv = null; T.node = null;
    if (c && c.onEnd) c.onEnd(g);
  }
  function active() { return !!T.on; }

  function pick(g, i) {
    const c = T.opts[i];
    if (!c) return;
    A.sfx.click();
    T.hist.push(c.t);
    if (c.fx) c.fx(g);
    if (!T.on) return;             // the effect may have ended it
    go(g, typeof c.next === 'function' ? c.next(g) : c.next);
  }

  function choiceBox(i) {
    const n = T.opts.length;
    const w = 190, h = 16, x = VW - w - 10, y = 184 - (n - i) * (h + 3);
    return { x, y, w, h };
  }

  function update(dt, g) {
    if (!T.on) return;
    const IN = PD.input, m = IN.mouse;
    T.t += dt; T.pop = Math.min(1, T.pop + dt * 5);
    T.lock = Math.max(0, T.lock - dt);
    const full = T.text || '';
    if (T.chars < full.length) {
      const before = Math.floor(T.chars);
      T.chars = Math.min(full.length, T.chars + dt * 52);
      if (Math.floor(T.chars) !== before && Math.floor(T.chars) % 3 === 0) {
        const ch = full.charCodeAt(Math.floor(T.chars) - 1) || 65;
        const base = T.node.who === 'chum' ? 110 : (T.node.who === 'you' ? 420 : 300);
        A.sfx.tone(base + (ch % 7) * 18, { type: 'square', dur: 0.025, vol: 0.025 });
      }
    }
    const done = T.chars >= full.length;
    const ok = T.lock <= 0 && (IN.hit('KeyE') || IN.hit('space') || IN.hit('enter'));
    const click = T.lock <= 0 && m.inside && m.leftPressed;
    if (!done) { if (ok || click) T.chars = full.length; return; }
    if (T.opts.length) {
      if (IN.hit('up')) { T.sel = (T.sel + T.opts.length - 1) % T.opts.length; A.sfx.tone(700, { type: 'square', dur: 0.03, vol: 0.03 }); }
      if (IN.hit('down')) { T.sel = (T.sel + 1) % T.opts.length; A.sfx.tone(700, { type: 'square', dur: 0.03, vol: 0.03 }); }
      for (let i = 0; i < T.opts.length; i++) {
        const b = choiceBox(i);
        if (m.inside && m.x > b.x && m.x < b.x + b.w && m.y > b.y && m.y < b.y + b.h) {
          T.sel = i;
          if (click) { pick(g, i); return; }
        }
      }
      if (ok) pick(g, T.sel);
      return;
    }
    if (ok || click) {
      const nx = T.node.next;
      go(g, typeof nx === 'function' ? nx(g) : nx);
    }
  }

  /* ------------------------------------------------------------ drawing */
  function wrap(str, w) {
    const out = []; let row = '';
    for (const wd of str.split(' ')) {
      const test = row ? row + ' ' + wd : wd;
      if (F.width(test, 1) > w && row) { out.push(row); row = wd; } else row = test;
    }
    if (row) out.push(row);
    return out;
  }

  function draw(ctx, g, t) {
    if (!T.on || !T.node) return;
    const n = T.node, W = whoOf(n.who);
    const e = T.pop >= 1 ? 1 : 1 + 2.7 * Math.pow(T.pop - 1, 3) + 1.7 * Math.pow(T.pop - 1, 2);
    const bh = 70, by = VH - bh - 6 + Math.round((1 - e) * 30);
    // a dim over the world so the words are the thing
    ctx.globalAlpha = 0.35 * Math.min(1, T.pop * 2);
    X.rect(ctx, 0, 0, VW, VH, '#1c0e06');
    ctx.globalAlpha = 1;
    // the box: a parchment card, the face in a slot, the name on a ribbon
    const KT = PD.kit, K = KT.K;
    KT.panel(ctx, 8, by, VW - 16, bh, { seed: 21 });
    const px = 15, py = by + 7, pw = 60, ph = bh - 14;
    KT.slot(ctx, px - 1, py - 1, pw + 2, ph + 2, {});
    ctx.save(); ctx.beginPath(); ctx.rect(px + 1, py + 1, pw - 2, ph - 2); ctx.clip();
    const grd = ctx.createRadialGradient(px + pw / 2, py + ph / 2, 2, px + pw / 2, py + ph / 2, 44);
    grd.addColorStop(0, W.col); grd.addColorStop(1, '#3a2213');
    ctx.fillStyle = grd; ctx.fillRect(px, py, pw, ph);
    const talking = T.chars < (T.text || '').length;
    W.draw(ctx, px, py, pw, ph, t, n.face || 'idle', talking, g);
    ctx.restore();
    const nm = n.name || W.name;
    KT.ribbon(ctx, 84 + (F.width(nm, 1) + 20) / 2, by - 8, nm, {});
    // the words
    const shown = (T.text || '').slice(0, Math.floor(T.chars));
    const rows = wrap(shown, VW - 110);
    let sc = rows.length <= 2 && F.width(shown, 2) < (VW - 110) * 2 ? 2 : 1;
    const rr = sc === 2 ? wrap(shown, (VW - 110) / 2) : rows;
    if (rr.length > 2 && sc === 2) sc = 1;
    const out = sc === 2 ? rr : rows;
    out.slice(0, 5).forEach((r, i) => F.draw(ctx, r, 84, by + 11 + i * (sc === 2 ? 17 : 11), K.text, { scale: sc, shadow: false }));
    const done = T.chars >= (T.text || '').length;
    // the replies
    if (done && T.opts.length) {
      T.opts.forEach((c, i) => {
        const b = choiceBox(i), on = i === T.sel;
        const k = Math.min(1, Math.max(0, (T.t - 0.05 * i) * 8));
        const bx = b.x + Math.round((1 - k) * 40);
        ctx.globalAlpha = k;
        KT.btn(ctx, bx, b.y, b.w, b.h, '', { col: on ? 'green' : 'tan', hot: on });
        const lab = typeof c.t === 'function' ? c.t(g) : c.t;
        F.draw(ctx, lab, bx + 16, b.y + 4 - (on ? 1 : 0), '#ffffff', { shadow: on ? K.greenDk : K.ink });
        if (on) {
          const bob = Math.round(Math.sin(t * 9) * 1.5);
          X.poly(ctx, [[bx + 5 + bob, b.y + 3], [bx + 10 + bob, b.y + 7], [bx + 5 + bob, b.y + 11]], '#ffffff');
        }
        ctx.globalAlpha = 1;
      });
    } else if (done) {
      const bob = Math.round(Math.abs(Math.sin(t * 5)) * 2);
      X.poly(ctx, [[VW - 27, by + bh - 15 + bob], [VW - 15, by + bh - 15 + bob], [VW - 21, by + bh - 8 + bob]], K.ink);
      X.poly(ctx, [[VW - 25, by + bh - 14 + bob], [VW - 17, by + bh - 14 + bob], [VW - 21, by + bh - 10 + bob]], K.green);
    }
  }

  PD.talk = { start, active, update, draw, go, end, WHO, T };
})(window.PD);
