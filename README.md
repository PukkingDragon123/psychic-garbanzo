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

## Wordless

The game has almost no text. A procedural **glyph language** (coin, ore, drill,
hole, hand, arrows, lock, check…) carries the HUD, the terminals, the crew's
speech and the tutorial: a bar plus a glyph plus a number is a sentence. The
one shape the UI allows besides the rectangle is the **hexagon** — the skill
lattice, the touch pad, the time hole, the tutorial pips.

## You start on a scooter

The run opens in an **asteroid field**. Ride the scooter (hold anywhere to fly
toward the pointer; `Space`/`FIRE` shoots), hoover up drifting ore, shoot
rocks to crack them open, then press `E` / the **hole** key to open a **time
hole** and fly into it — that is how you get home. From Deck A the **nav
computer** drops you on to a planet for a dive; the airlock returns you to the
field. The dive's anchor is the time hole hanging over the dig site.

## Appraisal

Ore that lands in the bin is **unappraised**. The house values one unit at a
time, priciest first (crust ~1s, a diamond ~5s), in real time wherever you
are, and takes a cut. Only appraised lots sell. The **Appraiser** and **Broker**
staff nodes speed it up, shrink the fee and lift prices.

## Skill lattice

The fabricator is a **hex skill tree**: the drill at the centre, six branches
out — guns, ship, oxygen, cargo, staff, machines (belt motors, overclock). A
node opens once any neighbour has a level; every level burns credits and ore.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrows | Thrusters (free-floating; gravity rises as you near the rock) |
| Mouse | Aim the drill and the pistol |
| Left mouse | **Drill** — bites the first rock along the bit, bores wider than you are |
| Right mouse / `Space` | **Fire** the current weapon |
| `Q` / wheel | Swap weapon (pistol → scattergun → lance, as fabricated) |
| `Shift` / double-tap a direction | **Burst dash** with invulnerability frames |
| `Tab` | **Scanner ping** — paints ore on the minimap |
| `E` | Dock at the ship / use a machine / talk / launch |
| Hold `R` | Emergency tractor beam home — costs 10% of your cargo |
| `Esc` | Pause, or disconnect from a terminal |

**On a phone or tablet** the controls switch to touch automatically: a
hexagonal pad on the left for the jets, drag anywhere on the right to aim *and*
drill, hex action keys in the corner. In the field a held touch flies you; on
the deck you **tap where to walk** and tap a machine to use it.

## Worlds are layered

Every body is generated in **strata** — depth bands with their own rock, ores,
cave density and light. Terra Prime runs topsoil → glowcap hollows → crystal
vaults → magma sea → core shell; an ice shard runs permafrost → crystal
caverns → glacial core. Pocket biomes swap in alternate tables where the biome
noise runs hot, so two dives never read the same. Deeper bands are tougher rock.

Hidden in them: **geodes** lined with gems, **fossil beds**, and **precursor
ruins** — plated rooms with a relic on a plinth, supply caches, and a guard.
**Magma** burns and quenches to basalt under the drill; **uranium** cooks you
slowly while it rides in your hold. Crossing into a new band puts its name on
screen. `Tab` fires a **scanner ping** that paints deposits on the fog-of-war
**minimap**.

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
   - **Cargo Exchange** — sell raw ore or refined goods, by the lot or all at once
   - **Refinery Deck** — a Factorio-style grid. Hoppers pull one ore type out of
     the bin, conveyors carry it, a **smelter** turns metal into ingots (×2.6),
     a **gem cutter** cuts stones (×3.2), a **crusher** turns junk rock into
     concentrate (×4), an **alloy forge** fuses two ingots (×2.4 on the pair),
     and depots bank the result. It runs in real time while you are down a hole
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

## Combat

Three weapons, swapped with `Q` or the wheel: the **pistol**, a five-pellet
**scattergun** with real kick, and the **plasma lance** — an instant piercing
beam that carves rock too. `Shift` (or a double-tap on a direction) is a
**burst dash** with invulnerability frames. Every dangerous enemy **telegraphs**:
gnashers and magma wyrms wind up with a flashing `!` before they charge,
spitters and the Core Warden glow before they fire. Shellbacks shrug off
bullets — use the drill or the lance. Cave mites come in clouds. Chain kills
for a bounty multiplier.

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
| `src/data.js` | 30 materials, 9 enemy species, ten worlds, nine strata templates, weapons and upgrades with ore recipes, factory machines and refined goods, cosmetics, the evil-title ladder |
| `src/world.js` | Tile grid; strata + pocket-biome generation, tunnels and caverns, veins on a rarity curve, magma lakes, geodes, fossil beds, ruins; fog of war; cave backdrops, glowing tiles, terrain rendering |
| `src/entities.js` | Mobs with four AI kinds, bullets, ore pickups, falling boulders |
| `src/player.js` | Movement, the drill, the pistol, air, cargo, damage |
| `src/fx.js` | Particles, floating numbers, shockwave rings, terrain chunks, screen shake, hit-stop |
| `src/ui.js` | In-flight HUD, pause, victory and title screens |
| `src/dialog.js` | The comms panel: portrait window, name plate, text that types itself |
| `src/terminal.js` | RUSTMAW OS — the diegetic CRT console every menu lives inside, with per-app phosphor themes, boot sequences and scanlines |
| `src/factory.js` | The refinery deck: grid editor, belt/machine simulation at 10Hz, refined-goods output |
| `src/interior.js` | Deck A: walking, stations, crew and their barks |
| `src/cutscene.js` | The cold open |
| `src/glyph.js` | The wordless icon language and hex primitives |
| `src/galaxy.js` | Spiral-arm star band, nebulae, sun, ringed planets, shooting stars |
| `src/space.js` | The scooter field: drifting ore, rocks, mites, the time hole |
| `src/skilltree.js` | Hex skill lattice with adjacency unlocks |
| `src/tutorial.js` | Pictographic tutorial that advances as you do the thing |
| `src/touch.js` | Hex pad, drag-to-drill, tap-to-fly, tap-to-walk, hex action keys, haptics |
| `src/game.js` | Loop, camera, ship, lighting, the vault economy, save/load, and the world-destruction sequence |
| `tools/build.js` | Inlines everything into one distributable HTML file |

Progress saves to `localStorage` automatically. Rendering is a 480×270 internal
canvas scaled up with nearest-neighbour, so every pixel stays square at any
window size.
