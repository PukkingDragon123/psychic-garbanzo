# 🪐 Planet Destroyer

A 2D pixel-art mining sandbox / incremental game. You are a small, greedy,
extremely evil alien. You have a drill. The galaxy has planets. You do the math.

Fly out of the airlock, sink into an asteroid, chew through the rock for ore and
gems, shoot the things that live down there, haul it all home before your air
runs out — then drill all the way to the **core** and blow the whole world apart.

**No build step, no dependencies, no asset files.** Every sprite, sound effect
and note of music is generated in code at load time.

```
git clone <this repo>
cd psychic-garbanzo
# either double-click index.html, or:
python3 -m http.server 8000   # then visit http://localhost:8000

# one self-contained HTML file you can host or email:
node tools/build.js           # -> dist/planet-destroyer.html
```

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrows | Thrusters (free-floating; gravity rises as you near the rock) |
| Mouse | Aim the drill and the pistol |
| Left mouse | **Drill** — bites the first rock along the bit, bores wider than you are |
| Right mouse / `Space` | **Plasma pistol** |
| `E` | Dock at the ship / use a machine / talk / launch |
| Hold `R` | Emergency tractor beam home — costs 10% of your cargo |
| `Esc` | Pause, or disconnect from a terminal |

**On a phone or tablet** the controls switch to touch automatically: a thumbstick
on the left for the jets, drag anywhere on the right to aim *and* drill, and
`FIRE` / `E` / `R` keys in the corner.

## The loop

1. **Launch** from the Rustmaw, your mining barge. Space has no gravity; drift
   down until the rock starts pulling.
2. **Dig.** Every tile is a real material with its own hardness, weight and
   price. Regolith is worthless ballast; sapphire, voidstone and starmetal are
   not. Loose ore pops out and gets sucked in by your tractor magnet.
3. **Survive.** Three meters: **O2** (drains faster while drilling and deeper
   down), **hull** (grubs, gnashers, spitters, falling boulders), and **cargo
   weight** (a full hold makes you slow and thirsty). Lose your hull and the
   ship yanks you home minus a third of the loot.
4. **Come home.** Docking drops your haul into the ship's **feedstock bin** — it
   does *not* auto-sell. What you do with the ore is the decision the game is
   built around.
5. **Walk the deck.** Dock and you are standing on Deck A, not staring at a
   menu. Walk to whichever machine you need:
   - **Cargo Exchange** — sell ore, by the lot or the whole bin, on a black-market relay
   - **Fabricator** — build upgrades. Every level costs credits *and* raw ore, so
     selling a vein of voidstone means not building with it
   - **Drone Bay** — the idle swarm that earns credits while you fly
   - **Identity Pod** — repaint your suit, gene-splice your skin, tint your visor,
     refinish the drill bit, re-livery the hull; also your galactic dossier
   - **Nav Computer** — star map with a survey readout and ore signature per world
   - **Airlock** — back out into the dark
6. **Break the world.** At the centre of every body is a molten core in a hollow
   chamber, usually with a Core Warden floating in front of it. Drill the core to
   zero and the whole planet fissures, detonates and comes apart in flying chunks
   of real terrain. Bounty, permanent value bonus, galaxy-control percentage, and
   the next world unlocks.

Ten worlds, from a 15-tile pebble to the Galactic Heart. Destroyed worlds regrow
if you fly back, so the sandbox never closes. Your reputation grows with the
wreckage — from *Unlicensed Prospector* to *Sovereign of Ash* — and so does the
bounty on your head.

## The crew

Deck A is not empty. **NIX**, the ship intelligence, keeps the books and files
the complaints in the reactor. **BOLT**, a welding unit with opinions, runs the
fabricator. **GLOOP**, a rescued rock grub in a tank, eats your inventory. All
three talk to you, and all three are enabling you.

## How it is put together

| File | What it does |
| --- | --- |
| `src/util.js` | Math, `Math.imul` hash noise, fbm, and an inverse-normal quantile helper used to hit exact ore/cave densities |
| `src/pix.js` | Tiny pixel-drawing surface; `outline()` traces the dark cartoon border that gives everything its look |
| `src/art.js` | Player, drill, pistol, ship, drones, six enemies, gems, UI icons — all procedural, and all repaintable from a cosmetic palette |
| `src/artint.js` | The ship interior: deck backdrop, machines, crew, and the cratered-moon generator used for skies and nav thumbnails |
| `src/font.js` | Hand-drawn 5×7 bitmap font, cached per colour |
| `src/audio.js` | WebAudio synthesis — a drill loop that tracks rock hardness, jetpack noise, explosions, and a villainous little groove |
| `src/data.js` | Materials, enemies, ten worlds, the upgrade tree with ore recipes, cosmetics, and the evil-title ladder |
| `src/world.js` | Tile grid, procedural bodies (lumpy silhouette, craters, caves, ore veins, core chamber), drilling damage, sky and terrain rendering |
| `src/entities.js` | Mobs with four AI kinds, bullets, ore pickups, falling boulders |
| `src/player.js` | Movement, the drill, the pistol, air, cargo, damage |
| `src/fx.js` | Particles, floating numbers, shockwave rings, terrain chunks, screen shake, hit-stop |
| `src/ui.js` | In-flight HUD, pause, victory and title screens |
| `src/dialog.js` | The comms panel: portrait window, name plate, text that types itself |
| `src/terminal.js` | RUSTMAW OS — the diegetic CRT console every menu lives inside, with per-app phosphor themes, boot sequences and scanlines |
| `src/interior.js` | Deck A: walking, stations, crew and their barks |
| `src/cutscene.js` | The cold open |
| `src/touch.js` | Thumbstick, drag-to-drill, and action keys for phones |
| `src/game.js` | Loop, camera, ship, lighting, the vault economy, save/load, and the world-destruction sequence |
| `tools/build.js` | Inlines everything into one distributable HTML file |

Progress saves to `localStorage` automatically. Rendering is a 480×270 internal
canvas scaled up with nearest-neighbour, so every pixel stays square at any
window size.
