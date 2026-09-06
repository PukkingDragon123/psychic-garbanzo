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

## Close-ups

Using a building zooms you into it, first person, with your green mittens on
the counter and the console filling the screen. There are no floating panels
anywhere in the game.

The **multi-tool** is the best of them: you hold the device up in the corner
of the screen in both mitts, its emitter throws a cone of light across the
frame, and the building you have selected **turns slowly in the air** inside
that cone -- a cyan, scanlined hologram of the real sprite, standing on a
projector pad, with motes rising through it and a dotted base ring. Pick a
different building and the hologram swaps. Print it and the beam collapses.

| Building | What you see |
| --- | --- |
| **THE DOCKS** | Your pod on the lift, big, with component slots hung off the hull, its numbers on the left, parts in store below |
| **TERMINAL** | A video desk: whoever is buying today as a big pixel bust that blinks and talks, the book beside it, one SELL ALL |
| **FABRICATOR** | The bench: recipe cards with real ore chips for ingredients, and a printer bed that builds the part in front of you |
| **THE MIND** | The brain tank. The skill tree is its wiring |
| **OBSERVATORY** | The galaxy chart. Each level brings another sector into range |

## Not one circle

Everything drawn at runtime is pixel art, built from primitives that never
produce a smooth curve: discs are **octagons**, shockwaves are **stepped
rings**, wires and dendrites are **chains of integer segments**, orbits are
**dotted stepped ellipses**, and soft radial light is **concentric octagon
bands**. The planets and suns in every sky are rasterised per pixel at a low
resolution and blown up with nearest-neighbour, so a world is a chunky
five-band sphere with a hard terminator rather than a vector ball. Nebulae
and dust lanes are quantised colour steps. Plates and frames have cut pixel
corners and a dithered edge.

## Ore has sprites

All thirty materials have their own chunk, drawn at 2x and dispatched by
class: cut **gems** with a table, a crown and a pointed pavilion; **metal**
nuggets with a hard bevel and a glint; **rubble** with chipped corners and
speckle; **ice** shards; raw **crystal** clusters; glowcap **mushrooms**;
**bio** blobs with eyes; a coiled ammonite **fossil**; an ornate precursor
**relic**. The same sprite is what pops out of the rock, what sits in your
manifest, what fills the terminal's book, what the fabricator asks for, and
what shows in a world's ore signature.

## One button

You hold one thing: the drill. Aim it, hold it, and rock comes apart. The gun
is automatic now: anything that comes within range gets shot, and anything
that wanders into the spinning bit gets chewed. Consecutive tiles build a
**chain** that pitches the break sound up and gets louder every ten; valuable
ore lands with a hit-stop and a ring. On a phone, a held touch on the right
half of the screen is that one button.

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
low gravity, and tucks into a **roll** (`Shift`). On a phone the moon has
its own hex keys for jump, roll and use, and a held touch on the left half
walks you.

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

The comms feed at the terminal is whoever wants something from you today, as
a big pixel bust that blinks and talks:

- **RIKKIT**, a small furious engineer with round ears, goggles pushed up on
  his head and a plan that is about twelve percent of a plan
- **TWIG**, a walking tree with moss on his shoulders and glowing sap for
  eyes, who has exactly one line and delivers it with feeling
- **BLUEFIN**, a red-finned Reaver who kills with a whistle and thinks you
  are a small angry investment
- **THE CURATOR**, pale, delighted, absurdly rich, holding an orb, who would
  like something older than the Krael
- **NOVA WATCH**, gold-visored, patient, and very clear that destroying a
  planet requires a permit

Around them: **the Reavers**, pirates with a code they mostly ignore; **the
Krael Ascendancy**, furious about a peace treaty they signed; **the Gilded**,
gold-skinned perfectionists who buy your ore and insult your manners; **the
Collection**; and the **Celestials**, dead giants whose skull you have built
your base inside — you can see its eye sockets on the horizon with lights
burning in them.

One relic in six turns out to be **THE ORB**, a purple stone in a silver
casing worth a quarter of a million, and every faction calls at once when you
pull one out of the rock. The pod carries the **Awesome Mix** on a tape deck
you can see spinning at the docks. Your reputation ladder runs from
*Unlicensed Prospector* through *Ravager, Provisional* and *Legendary Outlaw
(self-declared)* to *Sovereign of Ash*, and every world on the chart carries
a line of history under its blurb.

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
| `src/home.js` | The moon: running, jumping, rolling, blueprints and the printer |
| `src/scenes.js` | The close-ups: the multi-tool in your hands, the terminal's video desk, the fabricator bench, the docks with the pod on the lift |
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
