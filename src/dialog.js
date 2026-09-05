/* Comms panel: the game's speech system. Portrait window, name plate, text
   that types itself in, and a prompt to advance. Used by the crew and the
   opening cutscene. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const A = PD.audio;

  const VW = 480, VH = 270;

  /* Who can talk, and what their comms channel looks like. */
  const CAST = {
    nix:   { name: 'NIX',      sub: 'SHIP INTELLIGENCE', spr: 'nix',   col: '#7ef9ff', bg: '#0a2430', voice: 900, glyph: 'eye' },
    bolt:  { name: 'BOLT',     sub: 'FABRICATION UNIT',  spr: 'bolt',  col: '#ffb03d', bg: '#2a1c08', voice: 340, glyph: 'build' },
    gloop: { name: 'GLOOP',    sub: 'SHIP PET',          spr: 'gloop', col: '#c8ff5a', bg: '#16280a', voice: 1400, glyph: 'star' },
    you:   { name: 'YOU',      sub: 'FUTURE TYRANT',     spr: 'you',   col: '#ff5fa8', bg: '#2a0a1e', voice: 700, glyph: 'skull' },
    sys:   { name: 'RUSTMAW',  sub: 'AUTOMATED',         spr: null,    col: '#39ffa6', bg: '#062018', voice: 1100, glyph: 'home' }
  };

  const q = [];          // pending lines
  let cur = null, chars = 0, blipT = 0, done = false;

  function push(who, text) { q.push({ who, text }); if (!cur) next(); }
  function next() {
    cur = q.shift() || null;
    chars = 0; done = false;
  }
  function clear() { q.length = 0; cur = null; }
  const active = () => !!cur;

  /* Advance: first press finishes the typing, second moves on. */
  function advance() {
    if (!cur) return false;
    if (!done) { chars = cur.text.length; done = true; return true; }
    next();
    return true;
  }

  function update(dt) {
    if (!cur) return;
    if (!done) {
      chars += dt * (Array.isArray(cur.text) ? 6 : 46);
      blipT -= dt;
      if (blipT <= 0) {
        blipT = 0.045;
        const c = CAST[cur.who] || CAST.sys;
        A.tone(c.voice + U.rand(-90, 90), { type: 'square', dur: 0.02, vol: 0.035 });
      }
      if (chars >= cur.text.length) { chars = cur.text.length; done = true; }
    }
  }

  function wrap(text, maxChars) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > maxChars) { lines.push(line.trim()); line = w; }
      else line += ' ' + w;
    }
    if (line.trim()) lines.push(line.trim());
    return lines;
  }

  function draw(ctx, g, t, skinAlien) {
    if (!cur) return;
    const c = CAST[cur.who] || CAST.sys;
    const H = 62, Y = VH - H - 6, X = 10, W = VW - 20;

    // angled comms frame
    ctx.fillStyle = 'rgba(4,2,10,0.85)';
    ctx.fillRect(X, Y, W, H);
    ctx.strokeStyle = c.col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X + 6.5, Y + 0.5); ctx.lineTo(X + W - 0.5, Y + 0.5);
    ctx.lineTo(X + W - 0.5, Y + H - 6.5); ctx.lineTo(X + W - 6.5, Y + H - 0.5);
    ctx.lineTo(X + 0.5, Y + H - 0.5); ctx.lineTo(X + 0.5, Y + 6.5);
    ctx.closePath(); ctx.stroke();
    // corner ticks
    ctx.fillStyle = c.col;
    ctx.fillRect(X + W - 26, Y + 2, 22, 2);
    ctx.fillRect(X + 2, Y + H - 4, 22, 2);

    // portrait window
    const PX = X + 5, PY = Y + 5, PW = 46, PH = H - 10;
    ctx.fillStyle = c.bg; ctx.fillRect(PX, PY, PW, PH);
    ctx.strokeStyle = c.col; ctx.strokeRect(PX + 0.5, PY + 0.5, PW - 1, PH - 1);
    ctx.save();
    ctx.beginPath(); ctx.rect(PX, PY, PW, PH); ctx.clip();
    const bob = Math.sin(t * 2.4) * 1.5;
    if (c.spr === 'you') {
      const al = skinAlien || PD.art.sprites.alien;
      ctx.drawImage(al.frames[Math.sin(t * 1.3) > 0.93 ? 2 : 0], 0, 0, al.w, al.h,
        PX + PW / 2 - al.w | 0, PY + PH - al.h * 1.9 + bob | 0, al.w * 2, al.h * 2);
    } else if (c.spr) {
      const sp = PD.artint.S[c.spr];
      const sc = Math.min(2, (PH - 4) / sp.h);
      ctx.drawImage(sp.frames[Math.floor(t * 3) % sp.frames.length], 0, 0, sp.w, sp.h,
        PX + PW / 2 - sp.w * sc / 2 | 0, PY + PH - sp.h * sc + bob | 0, sp.w * sc, sp.h * sc);
    } else {
      F.draw(ctx, '///', PX + PW / 2, PY + PH / 2 - 4, c.col, { center: true, shadow: false });
    }
    // portrait scanlines
    ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
    for (let yy = PY; yy < PY + PH; yy += 2) ctx.fillRect(PX, yy, PW, 1);
    ctx.globalAlpha = 1;
    ctx.restore();

    // name plate: a coloured tab with the speaker's glyph
    ctx.fillStyle = c.col;
    ctx.fillRect(PX, Y - 6, PW, 10);
    PD.glyph.draw(ctx, c.glyph || 'crew', PX + PW / 2 - 7, Y - 9, '#0a0614', c.col);

    if (Array.isArray(cur.text)) {
      // pictograph strip, one glyph per "character"
      const n = Math.min(cur.text.length, Math.floor(chars));
      for (let i = 0; i < n; i++) {
        PD.glyph.draw(ctx, cur.text[i], PX + PW + 10 + i * 22, Y + 18, '#f2e9ff', c.col, 1);
      }
      // hex frames behind the strip
      for (let i = 0; i < cur.text.length; i++) PD.glyph.hex(ctx, PX + PW + 17 + i * 22, Y + 25, 11, null, i < n ? c.col : 'rgba(255,255,255,0.15)', 1);
    } else {
      const shown = cur.text.slice(0, Math.floor(chars));
      const lines = wrap(shown, 62);
      for (let i = 0; i < Math.min(lines.length, 4); i++) {
        F.draw(ctx, lines[i], PX + PW + 8, Y + 10 + i * 11, '#f2e9ff', { shadow: false });
      }
    }
    if (done && Math.sin(t * 6) > 0) {
      F.draw(ctx, q.length ? '>>' : '>', X + W - 14, Y + H - 12, c.col, { shadow: false });
    }
  }

  PD.dialog = { CAST, push, next, clear, advance, update, draw, active, get queued() { return q.length; } };
})(window.PD);
