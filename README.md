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

## The multi-tool

Everything on the moon is a building, and every building came out of the
handheld **multi-tool** in your pocket (`Tab`, or tap the device in the
corner). Pick one, pay for the blueprint, and a cyan **hologram** of it
flickers into place on the ground; then the printer builds it upward, layer by
layer, under a bright scanning bar, until it is real. Five buildings:

| Building | Press `E` for |
| --- | --- |
| **THE DOCKS** | Your pod parks here. Fit the parts you fabricate; each level adds two slots |
| **TERMINAL** | Sell ore at live prices, and read what the buyers are texting you |
| **FABRICATOR** | Turn ore into pod parts: hull plates, air scrubbers, tungsten bits, thrust coils, wire spools, scan lenses, void cells |
| **THE MIND** | A brain in a tank of acid. The skill tree is its wiring |
| **OBSERVATORY** | The galaxy chart. Each level brings another sector into range |

The docks, terminal and observatory are standing when you arrive. The
fabricator and the Mind you print yourself.

## The Mind

The skill tree is a **brain floating in a tank**, bubbling, breathing, wired
to a bank of blinking computers. Every upgrade is a **neuron** on a ring
around the stem, joined to its neighbours by dendrites; a neuron fires once
one it is wired to has a level, and the Mind's own level decides how deep the
rings go. Buy one and a pulse of light runs down the wire into it, lit wires
carry signal beads forever after, and the outer ring holds perks that plug
straight into your body: **Greed Glands**, a **Third Lung**, a **Lead Belly**,
**Iron Skin**.

## The alien

He is a businessman now: navy suit with lapels and gold buttons, white shirt,
pink tie, pocket square, cufflinks, brass jetpack, fishbowl helmet, one raised
eyebrow and a smirk. He is drawn at **twice the game's pixel density**, as is
the pod, the terrain texture, the foliage and every building on the moon, so
the little things — a tie knot, a rivet, a bubble in the tank — actually
exist. When he drills he plants his feet wide, leans his whole weight into
the tool, grips it two-handed, grits his teeth, and the drill shakes him and
the camera and throws sparks. On the moon he runs, jumps absurdly high in the
low gravity, and tucks into a **roll** (`Shift`).

## The pod and the wire

You fly a **little fat pod** with a bubble dome you can see into, twin
nacelles, riveted hull and landing skids. On a dive it hovers over the dig site and you drop out on a **tether**.
The wire is the leash: run out of reach and it snaps taut, flashes red and
yanks you back. The `WIRE` bar shows the slack left, and the winch tower buys
more reach. Press `E` under the pod to board and go home. The alien himself is
small, round and extremely fat, with a fishbowl helmet, stubby limbs, a
bobbing antenna and a walk that squashes and stretches.

## The chart

The observatory opens the **galaxy chart**: four sectors, each one past Home
Reach in range only once the observatory has been levelled up to see it. Enter a sector and you are looking at its **solar
system**: worlds on their orbits, with a dossier for the one you have picked
(depth, gravity, core, bounty, what it is made of). Press `DROP` and you are
falling on it. That is the whole travel loop: chart, sector, world, drop.

## Selling

Ore rides home in the pod and lands on the docks. The **live ore market**
moves on its own: every material carries a demand multiplier that drifts, so
a load you sat on can be worth a fifth more, or less. The terminal shows the
book, the trend on each rock, and the comms feed from the people who buy it;
`E` sells the lot. Relics, fossils and aetherium count as **artifacts** and
are tallied on the moon's status line.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrows | Thrusters (free-floating; gravity rises as you near the rock) |
| Mouse | Aim the drill and the pistol |
| Left mouse | **Drill** — bites the first rock along the bit, bores wider than you are |
| Right mouse / `Space` | **Fire** the current weapon |
| `Q` / wheel | Swap weapon (pistol → scattergun → lance, as the gun shack grows) |
| `Shift` / double-tap a direction | **Burst dash** with invulnerability frames (on the moon: roll) |
| `Tab` | **Scanner ping** — paints ore on the minimap |
| `E` | Board the pod / use the building you are standing at / drop on a world |
| `Tab` | The multi-tool: print or upgrade buildings |
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
whose open faces bow slightly, painted in three cached layers at twice the
game's pixel density: the depth band's own rock, then the **material as a
blob** shaped against its own kind — so an iron seam is a vein, not a run of
squares — then light and a dark rim, only where the tile faces open space.
Open ground gets a rolling soil lip so the surface line waves.

Growing out of it: **pixel-art foliage**. Grass tufts, ferns, drooping fronds,
moss cushions, glowing mushrooms, hanging tendrils and vines, roots, ribs,
coral fans, crystal shards and licking flames, each built from hard-edged
pixel primitives at 2x, baked into four sway frames, picked from the band's
own flora table. Barren worlds grow pebbles and boulders instead. Everything
derives from the cell hash, so mining a tile takes its garden with it.

## The loop

1. **Pick a world.** `E` at the observatory, choose a sector, choose a world,
   drop.
2. **Dig.** Every tile is a real material with its own hardness, weight and
   price. Regolith is worthless ballast; sapphire, voidstone and starmetal are
   not. Relics on ruin plinths are **artifacts**. Loose ore pops out and gets
   sucked in by your tractor magnet.
3. **Survive.** Air starts at 66 seconds and the hold at 16kg, and both of
   them hurt until you grow them. The wire keeps you inside the pod's reach.
4. **Board the pod.** `E` under the pod. The haul rains down on the docks.
5. **Sell, craft, fit, grow.** `E` at the terminal to cash out. Ore into the
   fabricator, parts on to the pod at the docks, credits into the Mind.
6. **Break the world.** At the centre of every body is a molten core in a
   hollow chamber, usually with a Core Warden in front of it. Drill it to zero
   and the whole planet fissures, detonates and comes apart in flying chunks
   of real terrain. Bounty, permanent value bonus, galaxy-control percentage,
   and the next world unlocks.

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
| `src/art.js` | The businessman alien at 2x in idle, walk, fly, drill and roll poses, the drill, the pod, guns, six enemies, gems, UI icons — all procedural |
| `src/arthome.js` | Your moon at 2x: the five buildings at three tiers, ruins, rocks, critters, the multi-tool, the brain, and the cratered-moon generator |
| `src/font.js` | Hand-drawn 5×7 bitmap font, cached per colour |
| `src/audio.js` | WebAudio synthesis — a drill loop that tracks rock hardness, jetpack noise, explosions, and a villainous little groove |
| `src/data.js` | 30 materials, 9 enemy species, ten worlds in four sectors, nine strata templates with their flora, five buildings, nine recipes, the neuron graph, the evil-title ladder |
| `src/world.js` | Tile grid; strata + pocket-biome generation, tunnels and caverns, veins on a rarity curve, magma lakes, geodes, fossil beds, ruins; fog of war; the three-layer rounded terrain renderer and the foliage pass |
| `src/entities.js` | Mobs with four AI kinds, bullets, ore pickups, falling boulders |
| `src/player.js` | Movement, the drill, weapons, dash, air, cargo, damage, and the tether to the pod |
| `src/flora.js` | Every plant and pebble in the game, hard-edged pixel art at 2x, baked into cached sway frames |
| `src/fx.js` | Particles, floating numbers, shockwave rings, terrain chunks, screen shake, hit-stop |
| `src/ui.js` | The vitals pod (air tank, hull chips, hold tube), the action strip, the moon's status line, pause, victory and title screens |
| `src/home.js` | The moon: running, jumping, rolling, the multi-tool, blueprints and the printer, the hologram panels for the docks, terminal and fabricator |
| `src/mind.js` | The Mind: the brain tank, the neuron graph, pulses and perks |
| `src/glyph.js` | The icon language that rides alongside the text, and the hex primitives |
| `src/galaxy.js` | Spiral-arm star band, nebulae, sun, ringed planets, shooting stars |
| `src/starmap.js` | The galaxy chart and the solar-system view: sectors, drives, world dossiers |
| `src/touch.js` | Hex pad, drag-to-drill, tap-to-walk, tap-to-pick, hex action keys, haptics |
| `src/game.js` | Loop, the 2x frame, camera, pod, lighting, the ore market, stats from neurons and fitted parts, printing, crafting, save/load, and the world-destruction sequence |
| `tools/build.js` | Inlines everything into one distributable HTML file |

Progress saves to `localStorage` automatically. Rendering is a 480×270 internal
canvas scaled up with nearest-neighbour, so every pixel stays square at any
window size.
