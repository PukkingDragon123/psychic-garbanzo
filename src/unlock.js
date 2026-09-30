/* UNLOCK: the skill tree that decides what ABAY will sell you.

   Everything cheap is on the shelves from the start. Everything else sits
   behind a node in the brain's UNLOCK tree, one branch per department and
   four tiers down each: INDUSTRY, FUN, NATURE, DECOR, HOME, STYLE and SHIP.

   Nodes cost BRAIN POINTS. You get one for every $100 you hand over: paying
   Mr Chum counts, and so does feeding money straight into the brain.

   Save: g.save.sp (points), g.save.spFrac (dollars towards the next one),
         g.save.unl = { nodeId: 1 } */
(function (PD) {
  'use strict';
  const D = PD.data;
  const BA = PD.buildart;
  const PER = 100;                                   // dollars for one point
  const COST = [0, 10, 40, 150, 600];                // points for each tier
  const ROMAN = ['', 'I', 'II', 'III', 'IV'];

  const BRANCHES = [
    { id: 'INDUSTRY', name: 'INDUSTRY', col: '#ffb03a' },
    { id: 'FUN', name: 'FUN', col: '#ff7ad8' },
    { id: 'NATURE', name: 'NATURE', col: '#8affa0' },
    { id: 'DECOR', name: 'DECOR', col: '#c8a8ff' },
    { id: 'HOME', name: 'HOME', col: '#ffd34d' },
    { id: 'STYLE', name: 'STYLE', col: '#7ef9ff' },
    { id: 'SHIP', name: 'SAUCER', col: '#ff5a6a' },
    { id: 'PC', name: 'COMPUTER', col: '#8affd0', fn: 1 },
    { id: 'FLY', name: 'FLIGHT', col: '#ffe070', fn: 1 }
  ];
  /* The functions: things the computer and the saucer can do, not things
     you buy. */
  const FUNCS = [
    { id: 'PC1', branch: 'PC', tier: 1, name: 'HOT DEALS', cost: 15, fn: 'OPENS THE HOT TAB ON ABAY: PICKS FOR YOU, ONE OF THEM 25% OFF' },
    { id: 'PC2', branch: 'PC', tier: 2, name: 'REMOTE LOGIN', cost: 60, fn: 'PRESS C ANYWHERE ON THE MOON TO USE THE COMPUTER' },
    { id: 'PC3', branch: 'PC', tier: 3, name: 'AUTO SELL', cost: 200, fn: 'YOUR HOLD SELLS ITSELF THE MOMENT YOU LAND, 5% OVER THE ODDS' },
    { id: 'FLY1', branch: 'FLY', tier: 1, name: 'COIN RUSH', cost: 20, fn: 'SPACE COINS IN THE LANES ARE WORTH DOUBLE' },
    { id: 'FLY2', branch: 'FLY', tier: 2, name: 'AUTOPILOT', cost: 80, fn: 'EVERY TRIP IS 30% SHORTER' },
    { id: 'FLY3', branch: 'FLY', tier: 3, name: 'STARTER SHIELD', cost: 250, fn: 'EVERY TRIP STARTS WITH A FREE BUBBLE SHIELD' }
  ];
  const SHIP_TIER = { armour: 0, magnet: 0, radar: 0, laser: 1, bubble: 1, ice: 2, turbo: 2, heat: 3 };

  function tierByPrice(p, style) {
    const T = style ? [2000, 15000, 60000, 300000] : [3000, 20000, 100000, 500000];
    for (let i = 0; i < T.length; i++) if (p <= T[i]) return i;
    return 4;
  }
  /* Where any shop item sits: [branch, tier]. */
  function place(kind, id) {
    if (kind === 'build') {
      const b = BA.BY[id];
      if (!b) return null;
      const br = b.cat === 'FURNITURE' ? 'HOME' : b.cat;
      return [br, b.where === 'up' ? Math.min(4, b.tier) : tierByPrice(b.price)];
    }
    if (kind === 'cosm') {
      const c = PD.cosm && PD.cosm.BY[id];
      return c ? ['STYLE', tierByPrice(c.price, true)] : null;
    }
    if (kind === 'ship') return ['SHIP', SHIP_TIER[id] || 0];
    return null;
  }

  // the nodes, built from whatever tiers actually have something in them
  const NODES = [], BY = {}, ITEMS = {};
  function addItem(kind, id) {
    const p = place(kind, id);
    if (!p || p[1] === 0) return;
    const key = p[0] + p[1];
    (ITEMS[key] = ITEMS[key] || []).push([kind, id]);
  }
  for (const b of BA.LIST) addItem('build', b.id);
  if (PD.cosm) { for (const c of PD.cosm.LIST) addItem('cosm', c.id); for (const c of PD.cosm.COLOURS) addItem('cosm', c.id); }
  for (const it of D.SHIP) addItem('ship', it.id);
  for (const br of BRANCHES) {
    let prev = null;
    if (br.fn) {
      for (const f of FUNCS.filter(f => f.branch === br.id)) { const n = Object.assign({ needs: prev, items: [], col: br.col }, f); NODES.push(n); BY[n.id] = n; prev = n.id; }
      continue;
    }
    for (let t = 1; t <= 4; t++) {
      const key = br.id + t;
      if (!ITEMS[key]) continue;
      const n = { id: key, branch: br.id, tier: t, name: br.name + ' ' + ROMAN[t], cost: COST[t], needs: prev, items: ITEMS[key], col: br.col };
      NODES.push(n); BY[key] = n; prev = key;
    }
  }

  function st(g) {
    const s = g.save;
    if (!s.unl) s.unl = {};
    if (s.sp === undefined) s.sp = 0;
    if (s.spFrac === undefined) s.spFrac = 0;
    return s;
  }
  function has(g, nodeId) { return !!st(g).unl[nodeId]; }
  function isLocked(g, kind, id) {
    const p = place(kind, id);
    if (!p || p[1] === 0) return false;
    return !has(g, p[0] + p[1]);
  }
  function nodeFor(kind, id) { const p = place(kind, id); return p && p[1] > 0 ? BY[p[0] + p[1]] : null; }
  function canUnlock(g, n) {
    if (has(g, n.id)) return 'done';
    if (n.needs && !has(g, n.needs)) return 'needs';
    return st(g).sp >= n.cost ? 'ready' : 'poor';
  }
  function unlock(g, nodeId) {
    const n = BY[nodeId];
    if (!n || canUnlock(g, n) !== 'ready') return false;
    const s = st(g);
    s.sp -= n.cost;
    s.unl[n.id] = 1;
    g.saveGame && g.saveGame();
    return true;
  }
  /* Money handed over turns into points: every $100 is one. */
  function give(g, dollars) {
    const s = st(g);
    s.spFrac += Math.max(0, dollars);
    const n = Math.floor(s.spFrac / PER);
    s.spFrac -= n * PER;
    s.sp += n;
    return n;
  }
  // feed the brain directly: spend money, get points
  function feed(g, dollars) {
    dollars = Math.min(dollars, g.save.credits);
    dollars = Math.floor(dollars / PER) * PER;
    if (dollars <= 0) return 0;
    g.save.credits -= dollars;
    const n = give(g, dollars);
    g.saveGame && g.saveGame();
    return n;
  }

  PD.unlock = { BRANCHES, NODES, BY, PER, COST, ROMAN, place, has, isLocked, nodeFor, canUnlock, unlock, give, feed, st };
})(window.PD);
