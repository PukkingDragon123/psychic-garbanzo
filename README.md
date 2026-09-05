# 🪐 Planet Destroyer

A 2D pixel-art mining sandbox / incremental game. You are a small, greedy,
extremely evil alien. You have a drill. The galaxy has planets. You do the math.

Open the chart, pick a world, drop on it. Sink into the rock on a wire from your
pod, chew through it for ore and gems, shoot the things that live down there,
board the pod before your air runs out — then drill all the way to the **core**
and blow the whole world apart.

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

## Readable

Three readouts and no clutter: a **glass air tank** that empties and bubbles, a
row of **hex hull chips** that shatter one at a time, and a segmented **hold
tube**. Under them, the manifest; along the bottom, one strip with the weapon,
dash, scanner and wire. A one-line **objective** always says what to do next,
and a procedural **glyph language** rides alongside the words as icons. The
**hexagon** is the UI's one shape besides the rectangle.

## The pod and the wire

You fly a **little fat pod** with a bubble dome, side nacelles and landing
skids. On a dive it hovers over the dig site and you drop out on a **tether**.
The wire is the leash: run out of reach and it snaps taut, flashes red and
yanks you back. The `WIRE` bar shows the slack left, and the **Tether Reel**
node buys more reach. Press `E` under the pod to board and go home. The alien
has arms, legs and a jetpack, with idle / walk / fly cycles and a drawn arm
that follows the aim.

## The chart

The airlock opens on the **galaxy chart**: four sectors, each one past Home
Reach locked behind a **drive** you buy outright — the Ion Sled, the Fold
Coil, the Void Anchor. Enter a sector and you are looking at its **solar
system**: worlds on their orbits, with a dossier for the one you have picked
(depth, gravity, core, bounty, what it is made of). Press `DROP` and you are
falling on it. That is the whole travel loop: chart, sector, world, drop.

## Selling

Ore that lands in the bin is **unappraised**. Zaz values one lot at a time,
priciest first, in real time wherever you are, and the house takes a cut. Only
appraised lots sell. The Exchange shows the belt with the lot riding through
the scanner, the queue, and a **live ore market**: every material carries a
demand multiplier that drifts on its own, so the same rock is worth more some
days than others. Three numbers decide your take — the house fee, the Broker,
and the Purifier.

## Skill lattice

The Lab is a **hex skill tree**: the drill at the centre, six branches out —
guns, ship, oxygen, cargo, staff, machines (Ore Purifier, Auto-Kiln). Each node
carries its name, level, what it does and what it costs. A node opens once any
neighbour has a level; every level burns credits and raw ore.

## Two machines, one deck

The Rustmaw has been stripped to the two things that matter: **THE LAB** on the
port side and **THE EXCHANGE** on the starboard, both of them enormous. Tap or
click anywhere to walk, tap a machine to use it, take the airlock for the
chart. Everything else was sold for scrap.

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
| `E` | Board the pod / use a machine / talk / drop on a world |
| Hold `R` | Emergency tractor beam home — costs 10% of your cargo |
| `Esc` | Pause, or disconnect from a terminal |

**On a phone or tablet** the controls switch to touch automatically: a
hexagonal pad on the left for the jets, drag anywhere on the right to aim *and*
drill, hex action keys in the corner. On the deck and the chart you **tap what
you want** — where to walk, which machine, which world.

## Worlds are layered

Every body is generated in **strata** — depth bands with their own rock, ores,
cave density, light and **flora**. Terra Prime runs topsoil → glowcap hollows →
crystal vaults → magma sea → core shell; an ice shard runs permafrost →
crystal caverns → glacial core. Pocket biomes swap in alternate tables where
the biome noise runs hot, so two dives never read the same. Deeper bands are
tougher rock, and the planets themselves are large — a hundred metres of rock
on the starter asteroid, fifteen hundred on the Galactic Heart.

Hidden in them: **geodes** lined with gems, **fossil beds**, and **precursor
ruins** — plated rooms with a relic on a plinth, supply caches, and a guard.
**Magma** burns and quenches to basalt under the drill; **uranium** cooks you
slowly while it rides in your hold. Crossing into a new band puts its name on
screen. `Tab` fires a **scanner ping** that paints deposits on the fog-of-war
**minimap**.

## Rock that is not made of squares

The tile grid is still what you drill, but nothing about it is drawn square.
Every tile is cut to a rounded path whose convex corners are real arcs and
whose open faces bow slightly, and each one is painted in three cached layers:
the depth band's own rock, then the **material as a blob** shaped against its
own kind — so an iron seam is a vein, not a run of squares — then light and a
dark rim, only where the tile faces open space. Open ground gets a rolling soil
lip so the surface line waves.

Growing out of it: **foliage drawn as real curves**. Grass tufts, ferns,
drooping fronds, moss cushions, glowing mushrooms, hanging tendrils and vines,
roots, ribs, coral fans, crystal shards and licking flames — each one bent,
bulged and swaying, picked from the band's own flora table and derived from the
cell hash, so mining a tile takes its garden with it. Each plant is baked into
a small sprite with four sway frames, which is what keeps a whole hillside of
it at 60fps.

## The loop

1. **Pick a world.** Take the airlock to the galaxy chart, choose a sector (buy
   its drive if you have not), choose a world from its solar system, and drop.
2. **Dig.** Every tile is a real material with its own hardness, weight and
   price. Regolith is worthless ballast; sapphire, voidstone and starmetal are
   not. Loose ore pops out and gets sucked in by your tractor magnet.
3. **Survive.** Three readouts: the **air tank** (drains faster while drilling
   and deeper down), the **hull chips** (grubs, gnashers, spitters, falling
   boulders), and the **hold tube** (a full hold makes you slow and thirsty).
   Air starts at 66 seconds and the hold at 16kg — both of them are meant to
   hurt until you upgrade them. Lose your hull and the pod yanks you home minus
   a third of the loot. The **wire** keeps you inside the pod's reach the whole
   time.
4. **Board the pod.** `E` under the pod drops your haul into the ship's bin — it
   does *not* auto-sell. What you do with the ore is the decision the game is
   built around.
5. **Walk the deck.** Two machines, both huge:
   - **THE LAB** — the hex lattice. Every level costs credits *and* raw ore, so
     selling a vein of voidstone means not building with it. The machines branch
     holds the **Ore Purifier** (every rock sells for more) and the
     **Auto-Kiln** (Zaz values lots faster)
   - **THE EXCHANGE** — the appraisal belt and the live ore market. Sell by the
     lot or hit SELL EVERYTHING
   - **Airlock** — back out to the chart
6. **Break the world.** At the centre of every body is a molten core in a hollow
   chamber, usually with a Core Warden floating in front of it. Drill the core to
   zero and the whole planet fissures, detonates and comes apart in flying chunks
   of real terrain. Bounty, permanent value bonus, galaxy-control percentage, and
   the next world unlocks.

Ten worlds across four sectors, from a 300-metre pebble to the Galactic Heart.
Destroyed worlds regrow if you fly back, so the sandbox never closes. Your
reputation grows with the wreckage — from *Unlicensed Prospector* to *Sovereign
of Ash* — and so does the bounty on your head.

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

Deck A is a cute, lit, postered little home for very bad people. **NIX**, the
round three-eyed holo-alien, keeps the books and files complaints in the
reactor. **BOLT**, an orange goggled mechanic with a spanner, runs the
Lab. **ZAZ**, the tall lavender appraiser with a monocle, values your
ore one lot at a time and takes a cut. **GLOOP**, a rescued rock grub in a
tank, eats your inventory. **SPROUT** the space-cat wanders the aft deck. Tap
or click anywhere on the deck to walk there; tap a station to walk over and
use it.

## How it is put together

| File | What it does |
| --- | --- |
| `src/util.js` | Math, `Math.imul` hash noise, fbm, and an inverse-normal quantile helper used to hit exact ore/cave densities |
| `src/pix.js` | Tiny pixel-drawing surface; `outline()` traces the dark cartoon border that gives everything its look |
| `src/art.js` | Player, drill, pistol, ship, drones, six enemies, gems, UI icons — all procedural, and all repaintable from a cosmetic palette |
| `src/artint.js` | The ship interior: deck backdrop, machines, the alien crew (Nix, Bolt, Zaz, Gloop, Sprout), posters and lights, and the cratered-moon generator used for skies and nav thumbnails |
| `src/font.js` | Hand-drawn 5×7 bitmap font, cached per colour |
| `src/audio.js` | WebAudio synthesis — a drill loop that tracks rock hardness, jetpack noise, explosions, and a villainous little groove |
| `src/data.js` | 30 materials, 9 enemy species, ten worlds in four sectors, nine strata templates with their flora, weapons and upgrades with ore recipes, drives, cosmetics, the evil-title ladder |
| `src/world.js` | Tile grid; strata + pocket-biome generation, tunnels and caverns, veins on a rarity curve, magma lakes, geodes, fossil beds, ruins; fog of war; the three-layer rounded terrain renderer and the foliage pass |
| `src/entities.js` | Mobs with four AI kinds, bullets, ore pickups, falling boulders |
| `src/player.js` | Movement, the drill, weapons, dash, air, cargo, damage, and the tether to the pod |
| `src/flora.js` | Every plant in the game, drawn as curves and baked into cached sway frames |
| `src/fx.js` | Particles, floating numbers, shockwave rings, terrain chunks, screen shake, hit-stop |
| `src/ui.js` | The vitals pod (air tank, hull chips, hold tube), the action strip, pause, victory and title screens |
| `src/dialog.js` | The comms panel: portrait window, name plate, text that types itself |
| `src/terminal.js` | RUSTMAW OS — the diegetic CRT console every menu lives inside, with per-app phosphor themes, boot sequences and scanlines |
| `src/interior.js` | Deck A: tap-to-walk, the Lab and the Exchange, crew and their barks |
| `src/cutscene.js` | The cold open |
| `src/glyph.js` | The icon language that rides alongside the text, and the hex primitives |
| `src/galaxy.js` | Spiral-arm star band, nebulae, sun, ringed planets, shooting stars |
| `src/starmap.js` | The galaxy chart and the solar-system view: sectors, drives, world dossiers |
| `src/skilltree.js` | Hex skill lattice with adjacency unlocks |
| `src/tutorial.js` | Seven-step tutorial that advances as you do the thing |
| `src/touch.js` | Hex pad, drag-to-drill, tap-to-walk, tap-to-pick, hex action keys, haptics |
| `src/game.js` | Loop, camera, ship, lighting, the vault economy, save/load, and the world-destruction sequence |
| `tools/build.js` | Inlines everything into one distributable HTML file |

Progress saves to `localStorage` automatically. Rendering is a 480×270 internal
canvas scaled up with nearest-neighbour, so every pixel stays square at any
window size.
