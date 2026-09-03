# 🪐 Planet Destroyer

A 2D pixel-art mining sandbox / incremental game. You are a small, greedy,
extremely evil alien. You have a drill. The galaxy has planets. You do the math.

Fly out of your ship, sink into an asteroid, chew through the rock for ore and
gems, shoot the things that live down there, haul it all home before your air
runs out — then drill all the way to the **core** and blow the whole world apart.

**No build step, no dependencies.** Open `index.html` in a browser and play.

```
git clone <this repo>
cd psychic-garbanzo
# either double-click index.html, or:
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrows | Thrusters (free-floating, gravity rises as you near the rock) |
| Mouse | Aim the drill and the pistol |
| Left mouse | **Drill** — bites the first rock along the bit, bores wider than you are |
| Right mouse / `Space` | **Plasma pistol** |
| `E` | Dock at the ship (sells your hold) / launch again |
| Hold `R` | Emergency tractor beam home — costs 10% of your cargo |
| `Esc` | Pause |

## The loop

1. **Launch.** You start floating just under *The Rustmaw*, your mining barge.
   Space has no gravity; drift down until the rock starts pulling.
2. **Dig.** Every tile is a real material with its own hardness, weight and
   price. Regolith is worthless ballast; sapphire, voidstone and starmetal are
   not. Loose ore pops out and gets sucked in by your tractor magnet.
3. **Survive.** Watch three meters: **O2** (drains faster while drilling and
   deeper down), **hull** (grubs, gnashers, spitters and falling boulders), and
   **cargo weight** (a full hold makes you slow and thirsty). Lose your hull and
   the ship yanks you home minus a third of the loot.
4. **Cash out.** Fly back up, press `E`, and the hold auto-sells with a
   satisfying cascade of coins.
5. **Upgrade.** Twelve upgrade lines: drill power and bore width, O2, cargo,
   hull, thrusters, pistol damage and fire rate, headlamp, tractor magnet, and
   a passive **harvest drone** swarm that earns credits while you fly.
6. **Break the world.** At the centre of every body is a molten core in a
   hollow chamber, usually with a Core Warden floating in front of it. Drill the
   core to zero and the whole planet fissures, detonates and comes apart in
   flying chunks of real terrain. Bounty, permanent value bonus, galaxy control
   percentage, and the next world unlocks.

Ten worlds, from a 15-tile pebble to the Galactic Heart. Destroyed worlds
regrow if you fly back, so the sandbox never closes.

## How it is put together

Everything — every sprite, sound and note of music — is generated in code at
load time. There are no asset files at all.

| File | What it does |
| --- | --- |
| `src/util.js` | Math, `Math.imul` hash noise, fbm, and an inverse-normal quantile helper used to hit exact ore/cave densities |
| `src/pix.js` | Tiny pixel-drawing surface; `outline()` traces the dark cartoon border that gives everything its look |
| `src/art.js` | Every sprite, built procedurally: alien, drill, pistol, ship, drones, six enemies, gems, UI icons |
| `src/font.js` | Hand-drawn 5×7 bitmap font, cached per colour |
| `src/audio.js` | WebAudio synthesis — drill loop that tracks rock hardness, jetpack noise, explosions, and a villainous little groove |
| `src/data.js` | Materials, enemies, the ten worlds, the upgrade tree |
| `src/world.js` | Tile grid, procedural body generation (lumpy silhouette, caves, ore veins, core chamber), drilling damage, rendering |
| `src/entities.js` | Mobs with four AI kinds, bullets, ore pickups, falling boulders |
| `src/player.js` | Movement, the drill, the pistol, air, cargo, damage |
| `src/fx.js` | Particles, floating numbers, shockwave rings, terrain chunks, screen shake, hit-stop |
| `src/ui.js` | HUD, shop, star map, options, title and victory screens |
| `src/game.js` | Loop, camera, ship, lighting, save/load, and the world-destruction sequence |

Progress saves to `localStorage` automatically.

Rendering is a 480×270 internal canvas scaled up with nearest-neighbour, so
every pixel stays square at any window size.
