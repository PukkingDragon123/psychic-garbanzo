/* The drillable world: one celestial body floating in space, stored as a tile
   grid. Space is simply empty tiles above/around the body, so flying out of
   the ship and boring to the core happen in one continuous scene. */
(function (PD) {
  'use strict';
  const U = PD.util;
  const D = PD.data;
  const M = D.M;

  const TILE = 10;
  const SKY = 32;            // tiles of open space above the body's north pole
  const MARGIN = 14;         // tiles of space either side

  /* ------------------------------------------------------------ tile atlases */
  const atlas = {};          // matId -> [canvas x4]
  const edgeCache = {};      // matId -> highlight strip canvas
  let crackCv = null;

  function buildAtlas() {
    for (const m of D.MAT) {
      if (m.id === 0) continue;
      const variants = [];
      for (let v = 0; v < 4; v++) {
        const cv = document.createElement('canvas');
        cv.width = TILE; cv.height = TILE;
        const c = cv.getContext('2d');
        c.fillStyle = m.c[1];
        c.fillRect(0, 0, TILE, TILE);
        // speckle the tile so large rock faces do not look flat
        for (let i = 0; i < 7; i++) {
          const h = U.hash2(v * 31 + i, m.id * 17 + i * 3);
          const x = Math.floor(h * TILE);
          const y = Math.floor(U.hash2(m.id + i * 7, v * 13 + 5) * TILE);
          const s = h > 0.72 ? 2 : 1;
          c.fillStyle = h > 0.5 ? m.c[0] : m.c[2];
          c.globalAlpha = 0.55;
          c.fillRect(x, y, s, s);
        }
        c.globalAlpha = 1;
        variants.push(cv);
      }
      atlas[m.id] = variants;

      const e = document.createElement('canvas');
      e.width = TILE; e.height = 3;
      const ec = e.getContext('2d');
      ec.fillStyle = m.c[0];
      ec.fillRect(0, 0, TILE, 2);
      ec.globalAlpha = 0.5;
      ec.fillRect(0, 2, TILE, 1);
      edgeCache[m.id] = e;
    }

    crackCv = [];
    for (let stage = 0; stage < 3; stage++) {
      const cv = document.createElement('canvas');
      cv.width = TILE; cv.height = TILE;
      const c = cv.getContext('2d');
      c.fillStyle = 'rgba(10,6,20,0.75)';
      const n = 4 + stage * 5;
      for (let i = 0; i < n; i++) {
        const x = Math.floor(U.hash2(i * 3 + stage * 41, 7) * TILE);
        const y = Math.floor(U.hash2(i * 11 + 3, stage * 17) * TILE);
        c.fillRect(x, y, 1 + (stage > 1 ? 1 : 0), 1);
      }
      crackCv.push(cv);
    }
  }

  /* ------------------------------------------------------------------- world */
  function World(body, index) {
    this.body = body;
    this.index = index;
    this.radius = body.radius;
    this.w = body.radius * 2 + MARGIN * 2;
    this.h = SKY + body.radius * 2 + 10;
    this.cx = this.w / 2;
    this.cy = SKY + body.radius;
    this.pxW = this.w * TILE;
    this.pxH = this.h * TILE;
    this.bodyTopPx = (this.cy - this.radius) * TILE;
    this.centerPx = { x: this.cx * TILE, y: this.cy * TILE };

    this.cells = new Uint8Array(this.w * this.h);
    this.dmg = new Float32Array(this.w * this.h);
    this.heat = new Float32Array(this.w * this.h);

    this.coreCells = [];
    this.coreMax = body.coreHp;
    this.coreHp = body.coreHp;
    this.mined = 0;
    this.totalSolid = 0;

    this.hardness = 1 + index * 0.16;
    this.seed = 1000 + index * 977;
    this.generate();
    this.buildStars();
  }

  World.prototype.idx = function (cx, cy) { return cy * this.w + cx; };
  World.prototype.inBounds = function (cx, cy) { return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h; };
  World.prototype.at = function (cx, cy) {
    if (!this.inBounds(cx, cy)) return 0;
    return this.cells[cy * this.w + cx];
  };

  World.prototype.generate = function () {
    const b = this.body, s = this.seed;
    const r = this.radius;
    // Core and chamber scale with the body: a pebble must not be two thirds
    // hollow, and a superplanet needs room to fight the Warden in.
    const coreR = Math.max(2.6, r * 0.1 + 1.2);
    const chamberR = coreR + U.clamp(r * 0.14, 3.5, 11);

    // ores sorted valuable-first so the rarest vein wins a contested tile
    const ores = b.ores.slice().sort((a, x) => D.MAT[x[0]].cr - D.MAT[a[0]].cr);
    const totalW = b.ores.reduce((t, o) => t + o[1], 0);

    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const dx = cx + 0.5 - this.cx, dy = cy + 0.5 - this.cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx);
        // lumpy silhouette so asteroids read as hand-drawn rocks
        const wobble = (U.fbm(Math.cos(ang) * 2 + s, Math.sin(ang) * 2 + s, 3) - 0.5) * r * 0.22
                     + (U.noise2(Math.cos(ang) * 6 + s, Math.sin(ang) * 6 + s) - 0.5) * r * 0.09;
        const rEff = r + wobble;
        if (d > rEff) continue;

        const depth = 1 - d / Math.max(1, rEff);   // 0 at surface, 1 at core
        let mat;

        if (d < coreR) { mat = M.core; }
        else if (d < chamberR) { mat = 0; }        // hollow core chamber
        else {
          // caves. Frequency matters as much as the threshold here: too low
          // and a small asteroid only samples a handful of noise features,
          // so whole materials can vanish by luck.
          const cave = U.fbm(cx * 0.12 + s, cy * 0.12 - s, 3);
          const caveWant = b.caves * (0.16 + depth * 0.72);
          if (cave > U.fbmThreshold(caveWant, 0.52, 0.145) && depth > 0.13) {
            this.cells[this.idx(cx, cy)] = 0; continue;
          }

          if (depth < 0.09) mat = b.ores[0][0] === M.ice ? M.ice : M.crust;
          else {
            mat = depth > 0.72 && U.chance(0.3) ? M.shell : M.stone;
            for (const [oid, wt] of ores) {
              const om = D.MAT[oid];
              const share = wt / totalW;
              const rarity = U.clamp(om.cr / 900, 0, 1);
              // the good stuff only shows up once you have committed to the dig
              if (depth < rarity * 0.34) continue;
              const want = U.clamp(share * (0.4 + depth * 1.4) * (1 - rarity * 0.35), 0, 0.8);
              const vein = U.fbm(cx * 0.24 + oid * 21 + s, cy * 0.24 - oid * 13 - s, 2);
              if (vein > U.fbmThreshold(want, 0.52, 0.155)) { mat = oid; break; }
            }
          }
        }
        this.cells[this.idx(cx, cy)] = mat;
        if (mat === M.core) this.coreCells.push(this.idx(cx, cy));
        if (mat) this.totalSolid++;
      }
    }

    // a crust skin makes the silhouette crisp and gives a surface to land on
    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const i = this.idx(cx, cy);
        const m = this.cells[i];
        if (!m || m === M.core) continue;
        if (!this.at(cx, cy - 1) && U.hash2(cx, cy) > 0.25) {
          if (D.MAT[m].cr < 40) this.cells[i] = this.body.ores[0][0] === M.ice ? M.ice : M.crust;
        }
      }
    }

    this.coreCenter = { x: this.cx * TILE, y: this.cy * TILE };
    this.coreR = coreR * TILE;
    this.chamberR = chamberR * TILE;
  };

  World.prototype.buildStars = function () {
    const rnd = U.mulberry32(this.seed);
    this.stars = [];
    for (let layer = 0; layer < 3; layer++) {
      const n = 90 - layer * 20;
      const arr = [];
      for (let i = 0; i < n; i++) {
        arr.push({
          x: rnd() * 1.4, y: rnd(),
          s: layer === 0 ? 1 : (rnd() > 0.75 ? 2 : 1),
          tw: rnd() * 6.28,
          c: rnd() > 0.86 ? '#ffd9a0' : (rnd() > 0.7 ? '#a9d8ff' : '#ffffff')
        });
      }
      this.stars.push(arr);
    }
    // a couple of distant sibling planets for depth
    this.decor = [];
    for (let i = 0; i < 3; i++) {
      this.decor.push({
        x: rnd(), y: rnd() * 0.55, r: 6 + rnd() * 16,
        c: U.pick(['#3b2a5c', '#2a3a5c', '#5c3a3a', '#2f4a42']),
        p: 0.06 + i * 0.05
      });
    }
  };

  /* ------------------------------------------------------------- queries */
  World.prototype.solidAt = function (x, y) {
    const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE);
    if (!this.inBounds(cx, cy)) return false;
    return this.cells[cy * this.w + cx] !== 0;
  };

  World.prototype.matAt = function (x, y) {
    const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE);
    if (!this.inBounds(cx, cy)) return 0;
    return this.cells[cy * this.w + cx];
  };

  World.prototype.rectSolid = function (x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.001) / TILE);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (!this.inBounds(cx, cy)) continue;
        if (this.cells[cy * this.w + cx]) return true;
      }
    }
    return false;
  };

  /* Gravity fades in as you approach the rock -- pure float in open space. */
  World.prototype.gravityAt = function (y) {
    const top = this.bodyTopPx;
    return this.body.gravity * U.smoothstep(top - 90, top + 40, y);
  };

  World.prototype.depthMeters = function (y) {
    return Math.max(0, Math.round((y - this.bodyTopPx) / TILE));
  };

  World.prototype.maxDepthMeters = function () {
    return Math.round((this.radius * 2) * 1);
  };

  /* --------------------------------------------------------------- drilling */
  World.prototype.tileHp = function (mat) {
    return D.MAT[mat].hp * this.hardness;
  };

  /* Returns the material id if the tile broke this call, else 0. */
  World.prototype.damage = function (cx, cy, amount) {
    if (!this.inBounds(cx, cy)) return 0;
    const i = cy * this.w + cx;
    const mat = this.cells[i];
    if (!mat) return 0;
    if (mat === M.core) {
      this.coreHp = Math.max(0, this.coreHp - amount);
      this.dmg[i] += amount;
      return this.coreHp <= 0 ? M.core : 0;
    }
    this.dmg[i] += amount;
    if (this.dmg[i] >= this.tileHp(mat)) {
      this.cells[i] = 0;
      this.dmg[i] = 0;
      this.mined++;
      return mat;
    }
    return 0;
  };

  World.prototype.crackFrac = function (cx, cy) {
    const i = this.idx(cx, cy);
    const mat = this.cells[i];
    if (!mat) return 0;
    if (mat === M.core) return 1 - this.coreHp / this.coreMax;
    return U.clamp(this.dmg[i] / this.tileHp(mat), 0, 1);
  };

  World.prototype.clear = function (cx, cy) {
    if (!this.inBounds(cx, cy)) return 0;
    const i = cy * this.w + cx;
    const m = this.cells[i];
    this.cells[i] = 0; this.dmg[i] = 0;
    return m;
  };

  /* True when a tile has nothing beneath or beside it -- a cave-in candidate. */
  World.prototype.unsupported = function (cx, cy) {
    if (!this.at(cx, cy)) return false;
    if (this.at(cx, cy + 1)) return false;
    let side = 0;
    if (this.at(cx - 1, cy)) side++;
    if (this.at(cx + 1, cy)) side++;
    return side < 2;
  };

  /* Rip a hole and hand back what came out (used by explosions). */
  World.prototype.removeDisc = function (px, py, r) {
    const out = [];
    const c0 = Math.floor((px - r) / TILE), c1 = Math.floor((px + r) / TILE);
    const r0 = Math.floor((py - r) / TILE), r1 = Math.floor((py + r) / TILE);
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        if (!this.inBounds(cx, cy)) continue;
        const tx = cx * TILE + TILE / 2, ty = cy * TILE + TILE / 2;
        if (U.dist2(px, py, tx, ty) > r * r) continue;
        const m = this.cells[cy * this.w + cx];
        if (!m || m === M.core) continue;
        this.cells[cy * this.w + cx] = 0;
        this.dmg[cy * this.w + cx] = 0;
        out.push({ cx, cy, mat: m, x: tx, y: ty });
      }
    }
    return out;
  };

  /* Snapshot a patch of tiles as a little canvas -- flying debris art. */
  World.prototype.grabChunk = function (cx, cy, size) {
    const cv = document.createElement('canvas');
    cv.width = size * TILE; cv.height = size * TILE;
    const c = cv.getContext('2d');
    let any = false;
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const m = this.at(cx + i, cy + j);
        if (!m) continue;
        any = true;
        const v = (U.hash2(cx + i, cy + j) * 4) | 0;
        c.drawImage(atlas[m][v], i * TILE, j * TILE);
      }
    }
    if (!any) return null;
    // round the corners a touch so chunks read as broken rock, not squares
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000';
    const k = Math.max(1, (size * TILE) / 5);
    c.fillRect(0, 0, k, k); c.fillRect(cv.width - k, 0, k, k);
    c.fillRect(0, cv.height - k, k, k); c.fillRect(cv.width - k, cv.height - k, k, k);
    return cv;
  };

  /* ---------------------------------------------------------------- drawing */
  World.prototype.drawSky = function (ctx, cam, vw, vh, time) {
    const b = this.body;
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, b.sky);
    g.addColorStop(1, '#05030f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);

    for (let l = 0; l < this.stars.length; l++) {
      const par = 0.04 + l * 0.05;
      const arr = this.stars[l];
      for (const st of arr) {
        const x = ((st.x * vw * 1.4 - cam.x * par) % (vw * 1.4) + vw * 1.4) % (vw * 1.4);
        const y = ((st.y * vh * 1.6 - cam.y * par * 0.7) % (vh * 1.6) + vh * 1.6) % (vh * 1.6);
        if (x > vw || y > vh) continue;
        const tw = 0.55 + 0.45 * Math.sin(time * 2 + st.tw);
        ctx.globalAlpha = tw * (0.35 + l * 0.22);
        ctx.fillStyle = st.c;
        ctx.fillRect(x | 0, y | 0, st.s, st.s);
      }
    }
    ctx.globalAlpha = 1;

    for (const d of this.decor) {
      const x = d.x * vw * 1.2 - cam.x * d.p;
      const y = d.y * vh - cam.y * d.p * 0.6;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = d.c;
      ctx.beginPath(); ctx.arc(x | 0, y | 0, d.r, 0, U.TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  World.prototype.drawCoreGlow = function (ctx, cam, time) {
    if (this.coreHp <= 0) return;
    const x = this.coreCenter.x - cam.x, y = this.coreCenter.y - cam.y;
    const frac = this.coreHp / this.coreMax;
    const r = this.coreR * (2.6 + 0.5 * Math.sin(time * 3)) * (1 + (1 - frac) * 0.5);
    const grd = ctx.createRadialGradient(x, y, this.coreR * 0.4, x, y, r);
    grd.addColorStop(0, 'rgba(255,220,150,0.55)');
    grd.addColorStop(0.5, 'rgba(255,130,60,0.22)');
    grd.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  World.prototype.draw = function (ctx, cam, vw, vh, time) {
    this.drawCoreGlow(ctx, cam, time);
    const c0 = Math.max(0, Math.floor(cam.x / TILE));
    const c1 = Math.min(this.w - 1, Math.ceil((cam.x + vw) / TILE));
    const r0 = Math.max(0, Math.floor(cam.y / TILE));
    const r1 = Math.min(this.h - 1, Math.ceil((cam.y + vh) / TILE));

    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const i = cy * this.w + cx;
        const m = this.cells[i];
        if (!m) continue;
        const sx = cx * TILE - cam.x | 0;
        const sy = cy * TILE - cam.y | 0;

        if (m === PD.data.M.core) { this.drawCoreTile(ctx, sx, sy, cx, cy, time); continue; }

        const v = (U.hash2(cx, cy) * 4) | 0;
        ctx.drawImage(atlas[m][v], sx, sy);

        // lit top face
        if (!this.cells[i - this.w] && cy > 0) ctx.drawImage(edgeCache[m], sx, sy);
        // shadowed underside
        if (cy < this.h - 1 && !this.cells[i + this.w]) {
          ctx.fillStyle = 'rgba(8,4,18,0.4)';
          ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
        }

        const mm = D.MAT[m];
        if (mm.shine) {
          const exposed = !this.cells[i - 1] || !this.cells[i + 1] || !this.cells[i - this.w] || !this.cells[i + this.w];
          if (exposed) {
            const tw = Math.sin(time * 3 + cx * 1.7 + cy * 2.3);
            if (tw > 0.55) {
              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = (tw - 0.55) / 0.45;
              ctx.fillRect(sx + 4, sy + 3, 2, 1);
              ctx.fillRect(sx + 4, sy + 5, 2, 1);
              ctx.fillRect(sx + 3, sy + 4, 4, 1);
              ctx.globalAlpha = 1;
            }
          }
        }

        const dmg = this.dmg[i];
        if (dmg > 0) {
          const f = dmg / this.tileHp(m);
          const stage = f > 0.72 ? 2 : (f > 0.38 ? 1 : 0);
          ctx.drawImage(crackCv[stage], sx, sy);
        }

        const heat = this.heat[i];
        if (heat > 0) {
          ctx.globalAlpha = U.clamp(heat, 0, 1) * (0.55 + 0.45 * Math.sin(time * 18 + cx + cy));
          ctx.fillStyle = heat > 0.6 ? '#fff2b0' : '#ff7a2a';
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.globalAlpha = 1;
        }
      }
    }
  };

  /* The core reads as one molten orb rather than a stack of flat tiles:
     each tile is shaded by its distance from the core centre. */
  World.prototype.drawCoreTile = function (ctx, sx, sy, cx, cy, time) {
    const dx = (cx + 0.5) - this.cx, dy = (cy + 0.5) - this.cy;
    const t = U.clamp(Math.sqrt(dx * dx + dy * dy) / Math.max(1, this.coreR / TILE), 0, 1);
    const frac = this.coreHp / this.coreMax;
    const pulse = 0.5 + 0.5 * Math.sin(time * 5 - t * 4);
    const hot = frac < 0.35 || pulse > 0.75;

    // rim -> molten -> white-hot centre
    ctx.fillStyle = t > 0.82 ? '#c93b1c' : (t > 0.55 ? '#ff5a2a' : (t > 0.3 ? '#ff8a3d' : '#ffd9a0'));
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.globalAlpha = (1 - t) * (0.45 + pulse * 0.55);
    ctx.fillStyle = hot ? '#fffbe0' : '#fff3c0';
    ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
    ctx.globalAlpha = 1;
    // veins of light crawling over the surface
    if (U.hash2(cx * 3 + Math.floor(time * 3), cy * 5) > 0.86) {
      ctx.fillStyle = 'rgba(255,250,220,0.85)';
      ctx.fillRect(sx + 3, sy + 3, 3, 3);
    }
  };

  PD.world = { World, TILE, SKY, buildAtlas, atlas };
})(window.PD);
