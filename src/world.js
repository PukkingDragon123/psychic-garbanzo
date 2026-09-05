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
  let crackCv = null;

  /* Rounded tile shapes. Every convex corner (both of its neighbours empty)
     is cut with a real arc, so stair-stepped rock reads as a rolling blob
     instead of graph paper. 16 neighbour masks x 2 speckle variants, built
     on demand and cached. */
  const shapeCache = new Map();
  const R = 5;                 // corner radius on a 10px tile: a lone tile is a ball

  function tilePath(c, mask, v) {
    const up = mask & 1, rt = mask & 2, dn = mask & 4, lf = mask & 8;
    // open faces bow in or out a touch, and neighbouring tiles pick different
    // bows, so a long rock face stops being a ruler-straight line
    const bow = ((v === undefined ? 0 : v) - 1.5) * 0.9;
    const B = (open, x0, y0, x1, y1, nx, ny) => {
      if (open) c.quadraticCurveTo((x0 + x1) / 2 + nx * bow, (y0 + y1) / 2 + ny * bow, x1, y1);
      else c.lineTo(x1, y1);
    };
    const tl = (!up && !lf) ? R : 0;
    const tr = (!up && !rt) ? R : 0;
    const br = (!dn && !rt) ? R : 0;
    const bl = (!dn && !lf) ? R : 0;
    const T = TILE;
    c.beginPath();
    c.moveTo(tl, 0);
    B(!up, tl, 0, T - tr, 0, 0, -1);
    if (tr) c.arcTo(T, 0, T, tr, tr); else c.lineTo(T, 0);
    B(!rt, T, tr, T, T - br, 1, 0);
    if (br) c.arcTo(T, T, T - br, T, br); else c.lineTo(T, T);
    B(!dn, T - br, T, bl, T, 0, 1);
    if (bl) c.arcTo(0, T, 0, T - bl, bl); else c.lineTo(0, T);
    B(!lf, 0, T - bl, 0, tl, -1, 0);
    if (tl) c.arcTo(0, 0, tl, 0, tl); else c.lineTo(0, 0);
    c.closePath();
  }

  /* Three cached layers make rock read as rock instead of a tile grid:
       1. a base shell in the depth band's own colour, cut to the solid mask
       2. the material's blob, cut to a mask of *same-material* neighbours, so
          an iron seam is a rounded vein rather than a run of squares
       3. lighting and the dark rim, drawn only on tiles that face open space */
  function cut(key, mask, v, paint) {
    let cv = shapeCache.get(key);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = TILE; cv.height = TILE;
    const c = cv.getContext('2d');
    tilePath(c, mask, v);
    c.save();
    c.clip();
    paint(c);
    c.restore();
    shapeCache.set(key, cv);
    return cv;
  }

  function baseShape(tint, mask, v) {
    return cut('b' + tint + mask + v, mask, v, c => {
      c.fillStyle = tint;
      c.fillRect(0, 0, TILE, TILE);
      c.fillStyle = 'rgba(255,255,255,0.05)';
      c.fillRect(0, 0, TILE, 3);
    });
  }

  function matShape(matId, mask, v) {
    const m = D.MAT[matId];
    return cut('m' + matId + '_' + mask + '_' + v, mask, v, c => {
      c.fillStyle = m.c[1];
      c.fillRect(0, 0, TILE, TILE);
      for (let i = 0; i < 7; i++) {
        const h = U.hash2(v * 31 + i, matId * 17 + i * 3);
        const x = Math.floor(h * TILE);
        const y = Math.floor(U.hash2(matId + i * 7, v * 13 + 5) * TILE);
        c.fillStyle = h > 0.5 ? m.c[0] : m.c[2];
        c.globalAlpha = 0.5;
        c.fillRect(x, y, h > 0.72 ? 2 : 1, 1);
      }
      c.globalAlpha = 1;
    });
  }

  /* Colour-free: works over any material underneath. */
  function lightShape(mask, v) {
    const key = 'l' + mask + '_' + v;
    let cv = shapeCache.get(key);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = TILE; cv.height = TILE;
    const c = cv.getContext('2d');
    c.save();
    tilePath(c, mask, v);
    c.clip();
    if (!(mask & 1)) { c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(0, 0, TILE, 2); c.fillStyle = 'rgba(255,255,255,0.13)'; c.fillRect(0, 2, TILE, 1); }
    if (!(mask & 4)) { c.fillStyle = 'rgba(8,4,18,0.42)'; c.fillRect(0, TILE - 3, TILE, 3); }
    if (!(mask & 8)) { c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(0, 0, 1, TILE); }
    if (!(mask & 2)) { c.fillStyle = 'rgba(8,4,18,0.3)'; c.fillRect(TILE - 1, 0, 1, TILE); }
    c.restore();
    // dark cartoon rim, only along the sides that face open space
    const sides = [
      [!(mask & 1), 0, 0, TILE, 3],
      [!(mask & 2), TILE - 3, 0, 3, TILE],
      [!(mask & 4), 0, TILE - 3, TILE, 3],
      [!(mask & 8), 0, 0, 3, TILE]
    ];
    for (const sd of sides) {
      if (!sd[0]) continue;
      c.save();
      c.beginPath();
      c.rect(sd[1], sd[2], sd[3], sd[4]);
      c.clip();
      c.strokeStyle = 'rgba(10,5,20,0.5)';
      c.lineWidth = 2;
      tilePath(c, mask, v);
      c.stroke();
      c.restore();
    }
    shapeCache.set(key, cv);
    return cv;
  }

  function buildAtlas() {
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
    this.inside = new Uint8Array(this.w * this.h);    // silhouette mask: cave backdrop goes here
    this.stratum = new Uint8Array(this.w * this.h);   // which depth band a cell belongs to
    this.seen = new Uint8Array(this.w * this.h);      // fog of war for the minimap
    this.pois = [];                                    // ruins etc. the game spawns things at
    this.strata = D.STRATA[body.type] || D.STRATA.rock;

    this.coreCells = [];
    this.coreMax = body.coreHp;
    this.coreHp = body.coreHp;
    this.mined = 0;
    this.totalSolid = 0;

    this.hardness = 1 + index * 0.14;
    this.seed = 1000 + index * 977;
    this.generate();
    this.buildBackdrop();
    this.buildStars();
  }

  World.prototype.idx = function (cx, cy) { return cy * this.w + cx; };
  World.prototype.inBounds = function (cx, cy) { return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h; };
  World.prototype.at = function (cx, cy) {
    if (!this.inBounds(cx, cy)) return 0;
    return this.cells[cy * this.w + cx];
  };

  /* Pick from a [[key, weight]...] table using a 0..1 value, so neighbouring
     cells sharing a noise value share a rock and the base fill clumps. */
  function pickTable(table, t) {
    let total = 0;
    for (const e of table) total += e[1];
    let acc = 0;
    for (const e of table) {
      acc += e[1] / total;
      if (t <= acc) return M[e[0]];
    }
    return M[table[table.length - 1][0]];
  }

  World.prototype.stratumFor = function (depth) {
    const st = this.strata;
    for (let i = 0; i < st.length; i++) if (depth >= st[i].a && depth < st[i].b) return i;
    return st.length - 1;
  };

  World.prototype.generate = function () {
    const b = this.body, s = this.seed;
    const r = this.radius;
    // Core and chamber scale with the body: a pebble must not be two thirds
    // hollow, and a superplanet needs room to fight the Warden in.
    const coreR = Math.max(2.6, r * 0.1 + 1.2);
    const chamberR = coreR + U.clamp(r * 0.14, 3.5, 11);
    const strata = this.strata;

    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const dx = cx + 0.5 - this.cx, dy = cy + 0.5 - this.cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx);
        // lumpy silhouette so bodies read as hand-drawn rocks
        const wobble = (U.fbm(Math.cos(ang) * 2 + s, Math.sin(ang) * 2 + s, 3) - 0.5) * r * 0.22
                     + (U.noise2(Math.cos(ang) * 6 + s, Math.sin(ang) * 6 + s) - 0.5) * r * 0.09;
        const rEff = r + wobble;
        if (d > rEff) continue;

        const i = this.idx(cx, cy);
        this.inside[i] = 1;
        const depth = 1 - d / Math.max(1, rEff);   // 0 at surface, 1 at core
        const si = this.stratumFor(depth);
        const L0 = strata[si];
        this.stratum[i] = si;
        let mat;

        if (d < coreR) { mat = M.core; }
        else if (d < chamberR) { mat = 0; }        // hollow core chamber
        else {
          // pocket biome: swap in the stratum's alternate table where the
          // slow biome noise runs hot
          const biome = U.fbm(cx * 0.05 + s * 2, cy * 0.05 - s * 2, 2);
          const pocket = L0.alt && biome > U.fbmThreshold(0.3, 0.52, 0.14);
          const fills = pocket ? L0.alt.fills : L0.fills;
          const ores = pocket ? L0.alt.ores : L0.ores;

          // caves: tight worm tunnels plus a few grand caverns
          const tunnel = U.fbm(cx * 0.12 + s, cy * 0.12 - s, 3);
          const cavern = U.fbm(cx * 0.045 - s, cy * 0.05 + s, 2);
          const caveWant = L0.caves * (0.22 + depth * 0.6);
          if (depth > 0.1 && (tunnel > U.fbmThreshold(caveWant, 0.52, 0.145) ||
              cavern > U.fbmThreshold(caveWant * 0.28, 0.52, 0.15))) {
            this.cells[i] = 0; continue;
          }

          if (depth < 0.07) {
            mat = pickTable(strata[0].fills, U.hash2(cx, cy));
          } else {
            const fillT = U.clamp((U.fbm(cx * 0.055 + s * 5, cy * 0.055 + s * 7, 2) - 0.22) / 0.6, 0, 0.999);
            mat = pickTable(fills, fillT);

            // veins, valuable first so the rarest ore wins a contested tile
            const totalW = ores.reduce((t, o) => t + o[1], 0);
            const sorted = ores.slice().sort((a, x) => D.MAT[M[x[0]]].cr - D.MAT[M[a[0]]].cr);
            for (const [okey, wt] of sorted) {
              const oid = M[okey];
              const om = D.MAT[oid];
              const share = wt / Math.max(1, totalW);
              const rarity = U.clamp(om.cr / 5000, 0, 1);
              // the good stuff only shows up once you have committed to the dig
              if (depth < rarity * 0.3) continue;
              // steep curve: a 2000-credit ore is a find, a 40000-credit one a legend
              const scarce = Math.max(0.03, Math.pow(1 - rarity, 1.7)) * (om.shine ? 0.6 : 1);
              const want = U.clamp(share * (0.3 + depth * 1.0) * scarce, 0, 0.6);
              if (want <= 0) continue;
              const vein = U.fbm(cx * 0.24 + oid * 21 + s, cy * 0.24 - oid * 13 - s, 2);
              if (vein > U.fbmThreshold(want, 0.52, 0.155)) { mat = oid; break; }
            }

            // magma pockets in the hot bands
            if (L0.lava) {
              const hot = U.fbm(cx * 0.16 + s * 3, cy * 0.16 + s * 9, 2);
              if (hot > U.fbmThreshold(L0.lava, 0.52, 0.15)) mat = M.lava;
            }
          }
        }
        this.cells[i] = mat;
        if (mat === M.core) this.coreCells.push(i);
        if (mat) this.totalSolid++;
      }
    }

    this.coreCenter = { x: this.cx * TILE, y: this.cy * TILE };
    this.coreR = coreR * TILE;
    this.chamberR = chamberR * TILE;

    this.carveCraters(r);
    this.lavaLakes();
    this.placePois();

    // a crust skin makes the silhouette crisp and gives a surface to land on
    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const i = this.idx(cx, cy);
        const m = this.cells[i];
        if (!m || m === M.core || m === M.lava) continue;
        if (!this.at(cx, cy - 1) && this.stratum[i] === 0 && U.hash2(cx, cy) > 0.25) {
          if (D.MAT[m].cr < 40) this.cells[i] = pickTable(this.strata[0].fills, U.hash2(cy, cx));
        }
      }
    }
  };

  /* Molten pools settle on cavern floors in the hot strata. */
  World.prototype.lavaLakes = function () {
    const rnd = U.mulberry32(this.seed + 99);
    for (let cy = 1; cy < this.h - 1; cy++) {
      for (let cx = 1; cx < this.w - 1; cx++) {
        const i = this.idx(cx, cy);
        if (!this.inside[i] || this.cells[i]) continue;
        const L0 = this.strata[this.stratum[i]];
        if (!L0.lava) continue;
        if (!this.at(cx, cy + 1) || this.at(cx, cy + 1) === M.lava) continue;
        if (rnd() > L0.lava * 0.9) continue;
        // spread sideways along the floor
        for (let k = -4; k <= 4; k++) {
          const x2 = cx + k;
          if (!this.inBounds(x2, cy)) continue;
          const j = this.idx(x2, cy);
          if (this.cells[j] || !this.inside[j]) continue;
          if (!this.at(x2, cy + 1)) continue;
          this.cells[j] = M.lava;
          if (rnd() > 0.55 && !this.cells[j - this.w]) this.cells[j - this.w] = M.lava;
        }
      }
    }
  };

  /* Points of interest: geodes, fossil beds and precursor ruins. */
  World.prototype.placePois = function () {
    const rnd = U.mulberry32(this.seed + 4242);
    const r = this.radius;
    const poi = this.body.poi || {};
    const spot = (dmin, dmax) => {
      for (let t = 0; t < 60; t++) {
        const ang = rnd() * U.TAU, dd = r * (1 - (dmin + rnd() * (dmax - dmin)));
        const cx = Math.round(this.cx + Math.cos(ang) * dd), cy = Math.round(this.cy + Math.sin(ang) * dd);
        if (!this.inBounds(cx, cy) || !this.inside[this.idx(cx, cy)]) continue;
        if (U.dist(cx, cy, this.cx, this.cy) < this.chamberR / TILE + 6) continue;
        return { cx, cy };
      }
      return null;
    };
    const gemsFor = (cx, cy) => {
      const L0 = this.strata[this.stratum[this.idx(cx, cy)]];
      const shiny = L0.ores.filter(o => D.MAT[M[o[0]]].shine);
      return shiny.length ? shiny : [['crystal', 1]];
    };

    for (let n = 0; n < (poi.geode || 0); n++) {
      const at = spot(0.25, 0.85); if (!at) continue;
      const R = 2.5 + rnd() * 3.5;
      const gems = gemsFor(at.cx, at.cy);
      for (let cy = Math.floor(at.cy - R - 2); cy <= at.cy + R + 2; cy++) {
        for (let cx = Math.floor(at.cx - R - 2); cx <= at.cx + R + 2; cx++) {
          if (!this.inBounds(cx, cy)) continue;
          const i = this.idx(cx, cy);
          if (!this.inside[i] || this.cells[i] === M.core) continue;
          const d = U.dist(cx + 0.5, cy + 0.5, at.cx + 0.5, at.cy + 0.5);
          if (d < R) this.cells[i] = 0;
          else if (d < R + 1.6) this.cells[i] = rnd() > 0.45 ? M.crystal : M[pickTableKey(gems, rnd())];
        }
      }
      this.pois.push({ kind: 'geode', cx: at.cx, cy: at.cy });
    }

    for (let n = 0; n < (poi.fossil || 0); n++) {
      const at = spot(0.3, 0.8); if (!at) continue;
      for (let k = 0; k < 9; k++) {
        const cx = at.cx + Math.round((rnd() - 0.5) * 7), cy = at.cy + Math.round((rnd() - 0.5) * 3);
        if (!this.inBounds(cx, cy)) continue;
        const i = this.idx(cx, cy);
        if (this.inside[i] && this.cells[i] && this.cells[i] !== M.core) this.cells[i] = M.fossil;
      }
    }

    for (let n = 0; n < (poi.ruin || 0); n++) {
      const at = spot(0.35, 0.8); if (!at) continue;
      const W = 8 + Math.floor(rnd() * 6), H = 5 + Math.floor(rnd() * 2);
      const x0 = at.cx - (W >> 1), y0 = at.cy - (H >> 1);
      let ok = true;
      for (let cy = y0 - 1; cy <= y0 + H; cy++) for (let cx = x0 - 1; cx <= x0 + W; cx++) {
        if (!this.inBounds(cx, cy) || !this.inside[this.idx(cx, cy)]) ok = false;
      }
      if (!ok) continue;
      for (let cy = y0 - 1; cy <= y0 + H; cy++) {
        for (let cx = x0 - 1; cx <= x0 + W; cx++) {
          const i = this.idx(cx, cy);
          const wall = cy === y0 - 1 || cy === y0 + H || cx === x0 - 1 || cx === x0 + W;
          this.cells[i] = wall ? M.hull : 0;
        }
      }
      // a plinth with the relic on it, and room for the loot
      const px = x0 + (W >> 1);
      this.cells[this.idx(px, y0 + H - 1)] = M.hull;
      this.cells[this.idx(px, y0 + H - 2)] = M.relic;
      // one doorway so it can be found by tunnelling in
      this.cells[this.idx(x0 - 1, y0 + H - 1)] = 0;
      this.cells[this.idx(x0 + W, y0 + H - 1)] = 0;
      this.pois.push({ kind: 'ruin', cx: at.cx, cy: at.cy, x0, y0, w: W, h: H });
    }
    this.totalSolid = 0;
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i]) this.totalSolid++;
  };

  function pickTableKey(table, t) {
    let total = 0;
    for (const e of table) total += e[1];
    let acc = 0;
    for (const e of table) { acc += e[1] / total; if (t <= acc) return e[0]; }
    return table[table.length - 1][0];
  }

  World.prototype.carveCraters = function (r) {
    const rnd = U.mulberry32(this.seed + 17);
    const n = Math.round(4 + r * 0.32);
    for (let i = 0; i < n; i++) {
      const ang = rnd() * U.TAU;
      const rad = 1.6 + rnd() * rnd() * (2.2 + r * 0.11);
      const depth = rad * (0.45 + rnd() * 0.5);
      const ox = this.cx + Math.cos(ang) * (r + rad - depth);
      const oy = this.cy + Math.sin(ang) * (r + rad - depth);
      const c0 = Math.floor(ox - rad - 1), c1 = Math.ceil(ox + rad + 1);
      const r0 = Math.floor(oy - rad - 1), r1 = Math.ceil(oy + rad + 1);
      for (let cy = r0; cy <= r1; cy++) {
        for (let cx = c0; cx <= c1; cx++) {
          if (!this.inBounds(cx, cy)) continue;
          const dx = cx + 0.5 - ox, dy = cy + 0.5 - oy;
          if (dx * dx + dy * dy > rad * rad) continue;
          const i2 = this.idx(cx, cy);
          if (this.cells[i2] === M.core) continue;
          if (this.cells[i2]) this.totalSolid--;
          this.cells[i2] = 0;
          this.inside[i2] = 0;
        }
      }
    }
  };

  /* Dark rock face drawn behind caves so tunnels no longer show stars. */
  World.prototype.buildBackdrop = function () {
    this.bgAtlas = this.strata.map((L0, si) => {
      const variants = [];
      for (let v = 0; v < 4; v++) {
        const cv = document.createElement('canvas');
        cv.width = TILE; cv.height = TILE;
        const c = cv.getContext('2d');
        c.fillStyle = L0.tint;
        c.fillRect(0, 0, TILE, TILE);
        c.globalAlpha = 0.35;
        for (let k = 0; k < 6; k++) {
          const h = U.hash2(v * 17 + k, si * 31 + k * 5);
          c.fillStyle = h > 0.5 ? '#000000' : '#ffffff';
          c.globalAlpha = h > 0.5 ? 0.35 : 0.08;
          c.fillRect(Math.floor(h * TILE), Math.floor(U.hash2(k, v + si) * TILE), 1 + (k % 2), 1);
        }
        c.globalAlpha = 1;
        variants.push(cv);
      }
      return variants;
    });
  };

  /* Stratum under a world point -- for banners, ambience and light colour. */
  World.prototype.stratumAt = function (x, y) {
    const d = U.dist(x, y, this.coreCenter.x, this.coreCenter.y) / (this.radius * TILE);
    if (d > 1.02) return -1;
    return this.stratumFor(U.clamp(1 - d, 0, 1));
  };

  /* Mark everything the lamp can reach as seen, for the minimap. */
  World.prototype.reveal = function (x, y, radius) {
    const c0 = Math.max(0, Math.floor((x - radius) / TILE)), c1 = Math.min(this.w - 1, Math.ceil((x + radius) / TILE));
    const r0 = Math.max(0, Math.floor((y - radius) / TILE)), r1 = Math.min(this.h - 1, Math.ceil((y + radius) / TILE));
    const rr = radius * radius;
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const dx = cx * TILE + 5 - x, dy = cy * TILE + 5 - y;
        if (dx * dx + dy * dy <= rr) this.seen[cy * this.w + cx] = 1;
      }
    }
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

    // a big cratered companion moon hanging over the dig site
    const size = 96 + Math.round(rnd() * 80);
    this.moon = {
      cv: PD.artint.buildMoon(size, this.body.tint, this.seed * 3 + 11),
      x: 0.12 + rnd() * 0.5, y: 0.05 + rnd() * 0.2, p: 0.035
    };
    // and a soft nebula wash behind everything
    this.nebula = buildNebula(this.body.sky, this.body.tint, this.seed);
  };

  /* Low-res coloured clouds, blown up with smoothing off for a chunky wash. */
  function buildNebula(sky, tint, seed) {
    const w = 60, h = 34;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    const img = c.createImageData(w, h);
    const tr = parseInt(tint.slice(1, 3), 16), tg = parseInt(tint.slice(3, 5), 16), tb = parseInt(tint.slice(5, 7), 16);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = U.fbm(x * 0.09 + seed, y * 0.13 - seed, 3);
        const a = U.clamp((n - 0.5) * 2.6, 0, 1);
        const i = (y * w + x) * 4;
        img.data[i] = tr * 0.55 + 40;
        img.data[i + 1] = tg * 0.5 + 26;
        img.data[i + 2] = tb * 0.7 + 70;
        img.data[i + 3] = a * 70;
      }
    }
    c.putImageData(img, 0, 0);
    return cv;
  }

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
  World.prototype.tileHp = function (mat, cx, cy) {
    let h = D.MAT[mat].hp * this.hardness;
    if (cx !== undefined) {
      const si = this.stratum[this.idx(cx, cy)];
      h *= 1 + si * 0.22;           // every band down is tougher rock
    }
    return h;
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
    if (this.dmg[i] >= this.tileHp(mat, cx, cy)) {
      const mm = D.MAT[mat];
      this.dmg[i] = 0;
      if (mm.drop) {                 // magma quenches into basalt; nothing to collect
        this.cells[i] = mm.drop;
        return -mat;
      }
      this.cells[i] = 0;
      this.mined++;
      return mat;
    }
    return 0;
  };

  /* Hazard damage per second for a world rect (magma, mostly). */
  World.prototype.hazardIn = function (x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h) / TILE);
    let worst = 0;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const m = this.at(cx, cy);
      if (m && D.MAT[m].hazard) worst = Math.max(worst, D.MAT[m].hazard);
    }
    return worst;
  };

  World.prototype.crackFrac = function (cx, cy) {
    const i = this.idx(cx, cy);
    const mat = this.cells[i];
    if (!mat) return 0;
    if (mat === M.core) return 1 - this.coreHp / this.coreMax;
    return U.clamp(this.dmg[i] / this.tileHp(mat, cx, cy), 0, 1);
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
        c.drawImage(matShape(m, 15, v), i * TILE, j * TILE);
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
  World.prototype.drawSky = function (ctx, cam, vw, vh, time, hideMoon, skipBase) {
    const b = this.body;
    if (skipBase) { this.drawMoon(ctx, cam, vw, vh); return; }
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, b.sky);
    g.addColorStop(1, '#05030f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);

    if (this.nebula) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(this.nebula, -((cam.x * 0.02) % vw) - 4, -((cam.y * 0.015) % vh) - 4, vw + 8, vh + 8);
      ctx.globalAlpha = 1;
    }

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

    if (!hideMoon) this.drawMoon(ctx, cam, vw, vh);
  };

  World.prototype.drawMoon = function (ctx, cam, vw, vh) {
    if (this.moon) {
      const m = this.moon;
      const x = m.x * vw - cam.x * m.p;
      const y = m.y * vh - cam.y * m.p * 0.8;
      ctx.globalAlpha = 0.34;                       // halo
      const hg = ctx.createRadialGradient(x + m.cv.width / 2, y + m.cv.height / 2, m.cv.width * 0.4,
        x + m.cv.width / 2, y + m.cv.height / 2, m.cv.width * 0.85);
      hg.addColorStop(0, this.body.tint);
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(x - m.cv.width * 0.4, y - m.cv.height * 0.4, m.cv.width * 1.8, m.cv.height * 1.8);
      ctx.globalAlpha = 0.95;
      ctx.drawImage(m.cv, x | 0, y | 0);
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

    this.glows = this.glows || [];
    this.glows.length = 0;

    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const i = cy * this.w + cx;
        const m = this.cells[i];
        const sx = cx * TILE - cam.x | 0;
        const sy = cy * TILE - cam.y | 0;
        if (!m) {
          // a cave shows the rock face behind it, not the stars
          if (this.inside[i]) {
            const v = (U.hash2(cx * 3, cy * 7) * 4) | 0;
            ctx.drawImage(this.bgAtlas[this.stratum[i]][v], sx, sy);
          }
          continue;
        }

        if (m === PD.data.M.core) { this.drawCoreTile(ctx, sx, sy, cx, cy, time); continue; }
        if (m === PD.data.M.lava) { this.drawLavaTile(ctx, sx, sy, cx, cy, time); this.glows.push(sx + 5, sy + 5, 26, 0); continue; }
        if (D.MAT[m].glow && this.glows.length < 200) this.glows.push(sx + 5, sy + 5, D.MAT[m].glowR || 16, m);

        const up = cy > 0 ? this.cells[i - this.w] : 1;
        const dn = cy < this.h - 1 ? this.cells[i + this.w] : 1;
        const lf = cx > 0 ? this.cells[i - 1] : 1;
        const rt = cx < this.w - 1 ? this.cells[i + 1] : 1;
        const mask = (up ? 1 : 0) | (rt ? 2 : 0) | (dn ? 4 : 0) | (lf ? 8 : 0);
        const v = (U.hash2(cx, cy) * 4) | 0;
        const mm2 = D.MAT[m];

        // 1. the band's own rock, so cut corners never show through to space
        ctx.drawImage(baseShape(this.strata[this.stratum[i]].tint, mask, v), sx, sy);
        // 2. this material as a blob against its own kind
        const mmask = (up === m ? 1 : 0) | (rt === m ? 2 : 0) | (dn === m ? 4 : 0) | (lf === m ? 8 : 0);
        ctx.drawImage(matShape(m, mmask, v), sx, sy);
        // 3. light and rim, only where the tile faces open space
        if (mask !== 15) ctx.drawImage(lightShape(mask, v), sx, sy);

        // rolling soil lip along any open surface: the ground line waves
        if (!up) {
          const hL = (U.hash2(cx, cy * 3) - 0.5) * 3.4;
          const hR = (U.hash2(cx + 1, cy * 3) - 0.5) * 3.4;
          const hM = (U.hash2(cx * 2 + 7, cy) - 0.5) * 5;
          ctx.fillStyle = mm2.c[0];
          ctx.beginPath();
          ctx.moveTo(sx, sy + hL);
          ctx.quadraticCurveTo(sx + TILE / 2, sy + hM - 1, sx + TILE, sy + hR);
          ctx.lineTo(sx + TILE, sy + 3.5);
          ctx.lineTo(sx, sy + 3.5);
          ctx.closePath();
          ctx.fill();
        }

        const mm = mm2;
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
          const f = dmg / this.tileHp(m, cx, cy);
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
  /* Magma: a slow churn of bright cells on a dark crust, with a hot skin. */
  /* Foliage pass. Plants are derived from the cell hash at draw time, so
     mining a tile takes its garden with it and nothing has to be tracked. */
  World.prototype.drawFlora = function (ctx, cam, vw, vh, time) {
    const c0 = Math.max(1, Math.floor(cam.x / TILE));
    const c1 = Math.min(this.w - 2, Math.ceil((cam.x + vw) / TILE));
    const r0 = Math.max(1, Math.floor(cam.y / TILE));
    const r1 = Math.min(this.h - 2, Math.ceil((cam.y + vh) / TILE));
    const FL = PD.flora;
    if (!FL) return;
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const i = cy * this.w + cx;
        if (this.cells[i]) continue;                 // plants live in open cells
        const below = this.cells[i + this.w];
        const above = this.cells[i - this.w];
        if (!below && !above) continue;
        const h = U.hash2(cx * 7 + 3, cy * 13 + 11);
        if (h > 0.14) continue;                       // sparse: a garden, not a lawn
        // keep neighbours apart so plants never merge into a carpet
        if (U.hash2(cx * 5 + 1, cy) < 0.5 && this.cells[i + 1] === 0 && U.hash2((cx + 1) * 7 + 3, cy * 13 + 11) < 0.14) continue;
        if (below && this.cells[i - this.w]) continue;  // needs headroom to grow into
        const band = this.strata[this.stratum[i]];
        const list = band && band.flora;
        if (!list || !list.length) continue;
        const sx = cx * TILE - cam.x;
        const sy = cy * TILE - cam.y;
        const seed = cx * 31 + cy * 17;
        const kind = list[(U.hash2(cx + 5, cy + 9) * list.length) | 0];
        const size = 6 + U.hash2(cx * 3, cy * 5) * 7;
        const jitter = (U.hash2(cx * 11, cy * 2) - 0.5) * 4;
        if (below) FL.draw(ctx, kind, sx + TILE / 2 + jitter, sy + TILE + 1, size, seed, time, 1);
        else if (h < 0.07) FL.draw(ctx, hangKind(kind), sx + TILE / 2 + jitter, sy - 1, size * 0.9, seed + 5, time, -1);
      }
    }
  };
  function hangKind(k) {
    if (k === 'grass' || k === 'fern' || k === 'frond') return 'vine';
    if (k === 'shroom' || k === 'moss') return 'tendril';
    if (k === 'ember' || k === 'coral') return k;
    if (k === 'bone') return 'root';
    return k === 'icespike' ? 'icespike' : (k === 'crystal' ? 'crystal' : 'root');
  }

  World.prototype.drawLavaTile = function (ctx, sx, sy, cx, cy, time) {
    const swirl = Math.sin(time * 1.6 + cx * 0.9 + cy * 1.3) * 0.5 + 0.5;
    ctx.fillStyle = swirl > 0.55 ? '#ff7a2a' : '#e0521c';
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#ffd27a';
    ctx.globalAlpha = 0.5 + swirl * 0.5;
    const ox = Math.floor(U.hash2(cx, cy + Math.floor(time * 2)) * 6);
    ctx.fillRect(sx + ox, sy + 3, 3, 2);
    ctx.fillRect(sx + (ox + 4) % 8, sy + 6, 2, 2);
    ctx.globalAlpha = 1;
    if (!this.at(cx, cy - 1)) {                  // glowing surface skin
      ctx.fillStyle = '#fff0b0';
      ctx.fillRect(sx, sy, TILE, 1);
    }
    ctx.fillStyle = 'rgba(60,10,10,0.35)';
    ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
  };

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

  PD.world = { World, TILE, SKY, buildAtlas, matShape };
})(window.PD);
