/* PERIL: the bad moments, given the time they deserve.

   OUT OF AIR. The tank hitting zero no longer quietly eats your hull. You
   hold your breath. Bubbles leak out of the helmet, the heart starts to
   pound, the edges of the world go grey and close in, your eyes start to
   shut on their own, and you get GRACE seconds to reach the saucer. If you
   don't, you go limp and the screen goes black.

   THE BLACKOUT. Running out of air and being beaten unconscious end the same
   way: the eyes close, the heart slows, black. A card tells you what
   happened and what it cost. Then the eyes open, at home, on the moon.

   NEW CREATURE. The first time any species comes into view the world slows
   for a moment and its field-guide card drops in: what it is, how bad it
   is, one line about it. You only get told once; the save remembers. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const F = PD.font;
  const X = PD.pxd;
  const A = PD.audio;
  const VW = 480, VH = 270;
  const GRACE = 5;                     // seconds you can hold your breath

  /* ----------------------------------------------------------- the heart */
  let beatT = 0, gaspT = 0, bubT = 0;
  function thump(vol) {
    if (!A.sfx || !A.sfx.tone) return;
    A.sfx.tone(62, { type: 'sine', to: 38, dur: 0.11, vol: vol });
    setTimeout(() => A.sfx.tone(54, { type: 'sine', to: 34, dur: 0.13, vol: vol * 0.8 }), 150);
  }
  function gasp() { if (A.sfx && A.sfx.tone) A.sfx.tone(420, { type: 'triangle', to: 180, dur: 0.22, vol: 0.05 }); }

  /* ------------------------------------------------------------ per frame
     Called from the dive's update. Returns a time scale for the world. */
  function tick(g, dt) {
    const p = g.player;
    let scale = 1;
    // holding your breath
    if (p && !p.docked && p.o2 <= 0 && !g.blackout) {
      const k = U.clamp(p.suffocating / GRACE, 0, 1);
      beatT -= dt;
      if (beatT <= 0) { thump(0.12 + k * 0.16); beatT = U.lerp(0.75, 0.42, k); }
      gaspT -= dt;
      if (gaspT <= 0) {
        gasp(); gaspT = U.rand(1.1, 1.8) - k * 0.5;
        if (PD.fx && PD.fx.text) PD.fx.text(p.x, p.y - 22, U.pick(['*GASP*', '*HKK*', '*KHH*', 'AIR...']), '#c8e8ff', 0);
      }
      bubT -= dt;
      if (bubT <= 0) {
        bubT = 0.12;
        PD.fx.spawn({ x: p.x + (p.facing || 1) * 3 + U.rand(-2, 2), y: p.y - 14, vx: U.rand(-8, 8), vy: U.rand(-40, -20), life: U.rand(0.5, 1), size: U.chance(0.3) ? 2 : 1, color: U.chance(0.5) ? '#c8f4ff' : '#7ec8e8', grav: -30, drag: 1.5 });
      }
      if (p.suffocating >= GRACE) passOut(g, 'air');
    } else beatT = 0;

    // a new species, coming into view
    if (!g.mobCard && g.state === 'play' && p && !g.destruction && !g.blackout) {
      const seen = g.save.bestiary || (g.save.bestiary = {});
      for (const m of g.mobs) {
        if (m.dead) continue;
        const key = keyOf(m);
        if (!key || seen[key] || !PD.mobart.INFO[key]) continue;
        if (Math.abs(m.x - p.x) < 190 && Math.abs(m.y - p.y) < 110) {
          seen[key] = 1;
          if (m.type === 'guardian') continue;      // the boss has its own entrance
          g.mobCard = { t: 0, key, mob: m };
          if (A.sfx.tone) { A.sfx.tone(180, { type: 'sawtooth', to: 120, dur: 0.5, vol: 0.06 }); A.sfx.tone(720, { type: 'square', to: 900, dur: 0.08, vol: 0.03 }); }
          break;
        }
      }
    }
    if (g.mobCard) {
      const t = (g.mobCard.t += dt / Math.max(0.2, scale));
      // the world slows to a crawl while you take it in, then comes back
      scale *= t < 0.3 ? U.lerp(1, 0.3, t / 0.3) : t < 1.6 ? 0.3 : t < 2.3 ? U.lerp(0.3, 1, (t - 1.6) / 0.7) : 1;
      if (t > 4.4) g.mobCard = null;
    }
    return scale;
  }
  let REV = null;
  function keyOf(m) {
    if (!REV) { REV = new Map(); for (const k in PD.mobart.INFO) if (PD.art.sprites[k]) REV.set(PD.art.sprites[k], k); }
    return REV.get(m.spr);
  }

  /* ------------------------------------------------------------ blacking out */
  function passOut(g, cause) {
    if (g.blackout) return;
    const p = g.player;
    // a third of the sack, gone in the dark
    let lostKg = 0;
    if (p) {
      const D = PD.data;
      let lose = p.cargoKg * 0.34;
      for (const k of U.shuffle(Object.keys(p.cargo))) {
        while (lose > 0 && p.cargo[k] > 0) {
          p.cargo[k]--; p.cargoKg -= D.MAT[k].kg; lose -= D.MAT[k].kg; lostKg += D.MAT[k].kg;
          if (p.cargo[k] <= 0) { delete p.cargo[k]; break; }
        }
      }
      p.cargoKg = Math.max(0, p.cargoKg);
      if (p.ragdoll) p.ragdoll(g, 2, (p.facing || 1) * 4);
      p.dead = true;
    }
    g.blackout = { t: 0, cause, lost: Math.round(lostKg), rescued: false, beat: 0 };
    A.drill && A.drill(false); A.thrust && A.thrust(0);
    if (cause !== 'air') { PD.fx.flash(0.5, '#ff5a4d'); PD.fx.shake(10); A.sfx.boom && A.sfx.boom(0.6); }
    thump(0.3);
  }
  const T_SHUT = 1.4, T_RESCUE = 2.1, T_WAKE = 5.2, T_END = 6.6;
  // runs every frame in any state; true while the world should hold still
  function tickBlackout(g, dt) {
    const b = g.blackout;
    if (!b) return false;
    b.t += dt;
    // the heart slowing down in the dark
    b.beat -= dt;
    if (b.beat <= 0 && b.t < T_WAKE) { thump(b.t < T_SHUT ? 0.26 : 0.18); b.beat = b.t < T_SHUT ? 0.6 : 1.3; }
    if (!b.rescued && b.t >= T_RESCUE) {
      b.rescued = true;
      if (g.rescue) g.rescue(b.cause);
    }
    if (b.t >= T_END) { g.blackout = null; return false; }
    return b.t > T_SHUT && b.t < T_WAKE - 0.3;
  }

  /* --------------------------------------------------------------- drawing */
  // tunnel vision: the world greys, the edges close in on you, the eyes go
  function lids(ctx, close, wob) {
    // two eyelids with a curved edge, closing to the middle
    const h = Math.round(close * (VH / 2 + 8));
    if (h <= 0) return;
    ctx.fillStyle = '#000000';
    for (let x = 0; x < VW; x += 4) {
      const c = Math.sin((x / VW) * Math.PI);
      const dy = Math.round((1 - c) * 26 * (1 - close * 0.6) + wob);
      ctx.fillRect(x, 0, 4, Math.max(0, h + dy));
      ctx.fillRect(x, VH - Math.max(0, h + dy), 4, Math.max(0, h + dy));
    }
  }
  function tunnel(ctx, cx, cy, r, darkA) {
    const gr = ctx.createRadialGradient(cx, cy, Math.max(1, r * 0.35), cx, cy, Math.max(2, r));
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.7, 'rgba(20,0,8,' + (darkA * 0.6).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(0,0,0,' + darkA.toFixed(3) + ')');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, VW, VH);
    if (r < 420) { ctx.fillStyle = 'rgba(0,0,0,' + darkA.toFixed(3) + ')'; }
  }
  function greyOut(ctx, k) {
    if (k <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = U.clamp(k, 0, 1);
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
  }

  // in the dive, under the HUD
  function drawSuffocate(ctx, g, cam) {
    const p = g.player;
    if (!p || p.docked) return;
    const airF = p.o2 / p.stat('oxygen');
    const sx = p.x - cam.x, sy = p.y - cam.y;
    if (p.o2 > 0) {
      // running low: a red pulse round the edges, getting faster
      if (airF < 0.3) {
        const k = 1 - airF / 0.3;
        const pul = 0.5 + 0.5 * Math.sin(g.time * (4 + k * 5));
        tunnel(ctx, sx, sy, U.lerp(520, 300, k), k * (0.25 + pul * 0.15));
      }
      return;
    }
    if (g.blackout) return;
    const k = U.clamp(p.suffocating / GRACE, 0, 1);
    const beat = Math.pow(Math.max(0, Math.sin(g.time * (7 + k * 6))), 8);
    greyOut(ctx, k * 0.9);
    tunnel(ctx, sx, sy, U.lerp(330, 70, k) - beat * 10, 0.55 + k * 0.45);
    // the eyes trying to close, and snapping back open
    const droop = Math.max(0, Math.sin(g.time * 1.7 + 1)) * k * 0.55 + k * k * 0.3;
    lids(ctx, droop, Math.sin(g.time * 3) * 2);
    // the only words that matter
    const KT = PD.kit;
    const left = Math.max(0, GRACE - p.suffocating);
    if (Math.sin(g.time * 8) > -0.4) KT.tag(ctx, VW / 2, 66, 'NO AIR!  GET TO THE SAUCER  ' + left.toFixed(1), 'red', { center: true });
  }

  // over everything, every state
  function drawBlackout(ctx, g) {
    const b = g.blackout;
    if (!b) return;
    const t = b.t;
    if (t < T_SHUT) {
      const q = t / T_SHUT;
      greyOut(ctx, 1);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.5 + q * 0.5).toFixed(3) + ')';
      ctx.fillRect(0, 0, VW, VH);
      lids(ctx, Math.min(1, 0.55 + q * 0.6), 0);
      return;
    }
    if (t < T_WAKE) {
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, VW, VH);
      // the card, in the dark
      if (t > T_SHUT + 0.6) {
        const a = U.clamp((t - T_SHUT - 0.6) * 2, 0, 1) * U.clamp((T_WAKE - 0.2 - t) * 3, 0, 1);
        ctx.globalAlpha = a;
        const air = b.cause === 'air';
        F.draw(ctx, 'YOU BLACKED OUT', VW / 2, 92, '#e8e0f0', { center: true, scale: 3, shadow: '#3a0a14' });
        F.draw(ctx, air ? 'YOUR TANK RAN DRY AND SO DID YOU.' : 'SOMETHING DOWN THERE HIT YOU HARDER THAN YOU HIT IT.', VW / 2, 130, '#a898b8', { center: true, shadow: false });
        if (t > T_SHUT + 1.4) F.draw(ctx, 'MR CHUM\'S TOW DRONE DRAGGED YOU HOME. HE WILL BILL YOU.', VW / 2, 146, '#a898b8', { center: true, shadow: false });
        if (t > T_SHUT + 2.0 && b.lost > 0) PD.kit.tag(ctx, VW / 2, 166, 'LOST IN THE DARK: ' + b.lost + ' KG OF ROCK', 'red', { center: true });
        // a slow heartbeat line along the bottom
        ctx.globalAlpha = a * 0.7;
        const w = 160, x0 = VW / 2 - w / 2, y0 = 206;
        for (let i = 0; i < w; i++) {
          const ph = ((i / w) * 2 + t * 0.6) % 1;
          const y = ph > 0.45 && ph < 0.52 ? Math.sin((ph - 0.45) / 0.07 * Math.PI) * -12 : 0;
          X.rect(ctx, x0 + i, y0 + y, 1, 1, '#ff5a6a');
        }
        ctx.globalAlpha = 1;
      }
      return;
    }
    // waking up: the eyes open, slowly, twice
    const q = (t - T_WAKE) / (T_END - T_WAKE);
    const open = q < 0.4 ? q / 0.4 * 0.5 : q < 0.55 ? 0.5 - (q - 0.4) / 0.15 * 0.35 : 0.15 + (q - 0.55) / 0.45 * 0.85;
    greyOut(ctx, 1 - q);
    ctx.fillStyle = 'rgba(0,0,0,' + ((1 - q) * 0.6).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH);
    lids(ctx, 1 - open, 0);
  }

  // the field-guide card
  function drawCard(ctx, g) {
    const c = g.mobCard;
    if (!c) return;
    const KT = PD.kit, K = KT.K, info = PD.mobart.INFO[c.key], spr = PD.art.sprites[c.key];
    if (!info || !spr) return;
    const t = c.t;
    const inK = U.smoothstep(0, 0.35, t) * (1 - U.smoothstep(3.9, 4.4, t));
    const w = 266, h = 90, x = Math.round(VW / 2 - w / 2), y = Math.round(U.lerp(-h - 20, 50, inK));
    // letterbox bars while the world is slow
    const bar = Math.round(inK * (t < 2.3 ? 18 : U.lerp(18, 0, U.clamp((t - 2.3) / 0.6, 0, 1))));
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, VW, bar); ctx.fillRect(0, VH - bar, VW, bar);
    KT.panel(ctx, x, y, w, h, { seed: 77 });
    KT.ribbon(ctx, x + w / 2, y - 7, 'NEW CREATURE', { col: 'red' });
    // its portrait, alive, in a slot
    const sw = 70, sh = 70;
    KT.slot(ctx, x + 8, y + 12, sw, sh, {});
    ctx.save(); ctx.beginPath(); ctx.rect(x + 9, y + 13, sw - 2, sh - 2); ctx.clip();
    ctx.fillStyle = '#2a2034'; ctx.fillRect(x + 9, y + 13, sw - 2, sh - 2);
    const fr = spr.frames[Math.floor(g.time * 6) % spr.frames.length];
    const k = Math.min(1.6, (sw - 8) / spr.w, (sh - 8) / spr.h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fr, x + 8 + sw / 2 - spr.w * k / 2, y + 12 + sh / 2 - spr.h * k / 2, spr.w * k, spr.h * k);
    ctx.restore();
    // what it is
    const tx = x + sw + 16;
    F.draw(ctx, info.name, tx, y + 14, K.text, { shadow: false, scale: info.name.length > 13 ? 1 : 2 });
    F.draw(ctx, info.cls, tx, y + (info.name.length > 13 ? 25 : 31), K.dim, { shadow: false });
    F.draw(ctx, 'THREAT', tx, y + 42, K.brown, { shadow: false });
    for (let i = 0; i < 5; i++) KT.rr(ctx, tx + 40 + i * 9, y + 42, 7, 7, 2, i < info.threat ? (info.threat >= 4 ? K.red : K.gold) : K.parchDk);
    // the line about it, wrapped
    const words = info.lore.split(' '), rows = [''];
    for (const wd of words) { const r = rows[rows.length - 1]; if (F.width(r + ' ' + wd, 1) > w - sw - 26 && r) rows.push(wd); else rows[rows.length - 1] = r ? r + ' ' + wd : wd; }
    rows.slice(0, 3).forEach((r, i) => F.draw(ctx, r, tx, y + 54 + i * 10, K.greenLo, { shadow: false }));
  }

  PD.peril = { GRACE, tick, tickBlackout, passOut, drawSuffocate, drawBlackout, drawCard };
})(window.PD);
