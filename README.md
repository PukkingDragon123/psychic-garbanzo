# 🪐 Planet Destroyer

A 2D pixel-art mining sandbox / incremental game. You are a small, greedy,
extremely evil alien. You have a drill. The galaxy has planets. You do the math.

You have a moon, a pod and a drill. Fly out, pick a world, drop on it. Sink into
the rock on a wire from your pod, chew through it for ore and gems, shoot the
things that live down there, board the pod before your air runs out. Sell the
haul at home, put up another building, do it again — then drill all the way to
the **core** and blow the whole world apart.

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

## No menus

There is no shop screen, no terminal, no skill grid, no dialogue box, no toast
popping up in the corner. Everything you can do, you do by standing next to it
and pressing `E`. Everything the game wants to tell you is said in the world: a
sign over a building, a number floating up out of the ground, a light that
changes colour. The only readouts left are the three that keep you alive — a
glass air tank that empties and bubbles, a row of hex hull chips that shatter
one at a time, and a segmented hold tube — plus one strip along the bottom for
the weapon, dash, scanner and wire.

## Your moon

Home is a dead little moon that belongs to you. It has ruins on it, some
hopping critters, a launch pad and whatever you have managed to build. Walk
along it (or tap where you want to go) and press `E` at:

| Building | What it does |
| --- | --- |
| **LAUNCH PAD** | Fly out to the chart and pick a world |
| **TRADE MAST** | Sell every rock you brought home, in one go, for a shower of coins |
| **DRILL WORKS** | A bigger bit and a wider bore |
| **AIR STILL** | More air in the tank, and a brighter lamp |
| **CARGO SILO** | A heavier hold and a stronger magnet |
| **GUN SHACK** | Louder guns; level 3 adds the scattergun, level 6 the lance |
| **WINCH TOWER** | A longer wire, punchier thrusters, tougher hull |
| **RUIN ALTAR** | The old ones left something down there. Ore is worth more |

Every level costs credits and nothing else, and every level makes the building
visibly bigger — more tanks on the still, more dishes on the mast, another
storey on the derrick. Your upgrade tree is a skyline.

## The pod and the wire

You fly a **little fat pod** with a bubble dome, side nacelles and landing
skids. On a dive it hovers over the dig site and you drop out on a **tether**.
The wire is the leash: run out of reach and it snaps taut, flashes red and
yanks you back. The `WIRE` bar shows the slack left, and the winch tower buys
more reach. Press `E` under the pod to board and go home. The alien himself is
small, round and extremely fat, with a fishbowl helmet, stubby limbs, a
bobbing antenna and a walk that squashes and stretches.

## The chart

The launch pad opens the **galaxy chart**: four sectors, each one past Home
Reach locked behind a **drive** you buy outright — the Ion Sled, the Fold
Coil, the Void Anchor. Enter a sector and you are looking at its **solar
system**: worlds on their orbits, with a dossier for the one you have picked
(depth, gravity, core, bounty, what it is made of). Press `DROP` and you are
falling on it. That is the whole travel loop: chart, sector, world, drop.

## Selling

Ore rides home in the pod and lands on the pad. The **live ore market** moves
on its own: every material carries a demand multiplier that drifts, so a load
you sat on can be worth a fifth more, or less. The top of the screen always
shows how many rocks you are carrying and what they are worth right now. Press
`E` at the mast and the whole lot goes at once.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrows | Thrusters (free-floating; gravity rises as you near the rock) |
| Mouse | Aim the drill and the pistol |
| Left mouse | **Drill** — bites the first rock along the bit, bores wider than you are |
| Right mouse / `Space` | **Fire** the current weapon |
| `Q` / wheel | Swap weapon (pistol → scattergun → lance, as the gun shack grows) |
| `Shift` / double-tap a direction | **Burst dash** with invulnerability frames |
| `Tab` | **Scanner ping** — paints ore on the minimap |
| `E` | Board the pod / use whatever you are standing at / drop on a world |
| Hold `R` | Emergency tractor beam home — costs 10% of your cargo |
| `Esc` | Pause |

**On a phone or tablet** the controls switch to touch automatically: a
hexagonal pad on the left for the jets, drag anywhere on the right to aim *and*
drill, hex action keys in the corner. On the moon and the chart you **tap what
you want** — where to walk, which building, which world.

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

1. **Pick a world.** Press `E` at the launch pad, choose a sector (buy its
   drive if you have not), choose a world, drop.
2. **Dig.** Every tile is a real material with its own hardness, weight and
   price. Regolith is worthless ballast; sapphire, voidstone and starmetal are
   not. Loose ore pops out and gets sucked in by your tractor magnet.
3. **Survive.** Air starts at 66 seconds and the hold at 16kg, and both of them
   are meant to hurt until you build them up. The wire keeps you inside the
   pod's reach the whole time.
4. **Board the pod.** `E` under the pod. The haul rains down on your landing
   pad.
5. **Sell and build.** `E` at the mast to cash out, then `E` at whichever
   building you want another level of.
6. **Break the world.** At the centre of every body is a molten core in a
   hollow chamber, usually with a Core Warden in front of it. Drill it to zero
   and the whole planet fissures, detonates and comes apart in flying chunks of
   real terrain. Bounty, permanent value bonus, galaxy-control percentage, and
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

## Who else is out here

Nobody. That is the point. The moon has three hopping critters, a few
precursor ruins nobody has explained, and a string of fairy lights you put up
yourself. Down a hole there are crawlers, floaters, spitters, gnashers,
shellbacks, lurkers, cave mites and a Core Warden, and none of them want to
talk.

## How it is put together

| File | What it does |
| --- | --- |
| `src/util.js` | Math, `Math.imul` hash noise, fbm, and an inverse-normal quantile helper used to hit exact ore/cave densities |
| `src/pix.js` | Tiny pixel-drawing surface; `outline()` traces the dark cartoon border that gives everything its look |
| `src/art.js` | The fat little alien and his poses, drill, guns, pod, six enemies, gems, UI icons — all procedural |
| `src/arthome.js` | Your moon: every building at three tiers, the ruins, the critters, and the cratered-moon generator used for skies and chart thumbnails |
| `src/font.js` | Hand-drawn 5×7 bitmap font, cached per colour |
| `src/audio.js` | WebAudio synthesis — a drill loop that tracks rock hardness, jetpack noise, explosions, and a villainous little groove |
| `src/data.js` | 30 materials, 9 enemy species, ten worlds in four sectors, nine strata templates with their flora, the eight buildings, drives, the evil-title ladder |
| `src/world.js` | Tile grid; strata + pocket-biome generation, tunnels and caverns, veins on a rarity curve, magma lakes, geodes, fossil beds, ruins; fog of war; the three-layer rounded terrain renderer and the foliage pass |
| `src/entities.js` | Mobs with four AI kinds, bullets, ore pickups, falling boulders |
| `src/player.js` | Movement, the drill, weapons, dash, air, cargo, damage, and the tether to the pod |
| `src/flora.js` | Every plant in the game, drawn as curves and baked into cached sway frames |
| `src/fx.js` | Particles, floating numbers, shockwave rings, terrain chunks, screen shake, hit-stop |
| `src/ui.js` | The vitals pod (air tank, hull chips, hold tube), the action strip, the moon's status line, pause, victory and title screens |
| `src/home.js` | The moon: rolling ground, buildings and their signs, tap-to-walk, critters, dust and fairy lights |
| `src/glyph.js` | The icon language that rides alongside the text, and the hex primitives |
| `src/galaxy.js` | Spiral-arm star band, nebulae, sun, ringed planets, shooting stars |
| `src/starmap.js` | The galaxy chart and the solar-system view: sectors, drives, world dossiers |
| `src/touch.js` | Hex pad, drag-to-drill, tap-to-walk, tap-to-pick, hex action keys, haptics |
| `src/game.js` | Loop, camera, pod, lighting, the ore market, the buildings that feed every stat, save/load, and the world-destruction sequence |
| `tools/build.js` | Inlines everything into one distributable HTML file |

Progress saves to `localStorage` automatically. Rendering is a 480×270 internal
canvas scaled up with nearest-neighbour, so every pixel stays square at any
window size.
