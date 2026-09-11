# 🪐 Planet Destroyer

A 2D pixel-art mining sandbox / incremental game. You are a small, greedy,
extremely evil alien. You have a drill. The galaxy has planets. You do the math.

You have a rock house on a dead moon, a drill, and a flying saucer up on two
bricks. Fly out, pick a world, drop on it. Sink into the rock on a wire from
your pod, chew through it for ore and gems, shoot the things that live down
there, board the pod before your air runs out. Come home, sit down at the
stolen human computer, list the rocks on **ABAY**, buy something stupid with
the proceeds, do it again — then drill all the way to the **core** and blow the
whole world apart.

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

## Home is a small rock, seen up close

**Home is zoomed in.** The scene is painted at the game's usual size and then a
240x135 window of it is blown up to fill the frame at exactly **twice** the
size — twice, not one and a half times, so a pixel stays a hard square block.
The window follows him about outside and sits still over the room indoors,
which is smaller than the window anyway. Signs, speech and the touch pad go on
afterwards at screen size, so the lettering never turns into billboards.

**And there is no bar across the top.** Nothing frames the scene at home any
more: the money and the ore count live on the computer, the tally of dead
worlds is scratched into the rock wall, and the wooden signs tell you what
everything does. What is left is the place.

**Outside** is the top of a moon, and you are standing close enough to it that
it is not a ball any more: the curve is almost flat, the limb runs off the
bottom corners of the screen, and the surface is **lumpy** rather than a clean
arc —
ridges, a dip and a shoulder rolled into it, with craters sunk into the curve
and boulders half-buried all the way out to both horizons. It is a chipped rock,
not a globe. The star is off to one side, so the crust is pale on that side and
nearly black on the other, with the terminator between them ordered-dithered
instead of drawn as a line, and a rim of dust sitting on the skyline, thickest
where the ground is falling away from you.

Standing on it: **your rock house**, a squat heap of quarried slabs with a hole
knocked in the front for a door, one lit window, a crooked chimney with a
satellite dish taped to it and smoke going up; **your dumb UFO**, up on two
bricks with one leg that gave up years ago; a flag nobody saluted; a survey
pole; and ruins at both ends. The eye sockets of a dead Celestial drift past in
the background, and the world you are about to take apart hangs over the
horizon.

**Inside** is one very small room, and it is clipped out of solid rock: you can
see the walls end. It holds exactly two things — the stolen computer on a
plank, and **a brain in a jar of acid** — plus every bit of mess he owns: a
beam across the roof with coils of cable and a lamp that does not work hanging
off it, a bare bulb he wired himself, a fridge covered in notes, empty cans, a
stack of plates with something living on top, a bucket under a drip, one boot, a
rug worn through, a shelf of rocks he is proud of, hooks with tools on them, and
a tally of every world he has eaten scratched into the rock.

**There is no bed.** He does not sleep. Stand at the computer, the jar or the
door and press `E`.

The high jump reaches the junk hanging off the roof beam, and head-butting it
sets the whole lot swinging.

## Going in through the iris

Pressing `E` at the computer or the brain does not cut. A grid of chunky
squares swells shut, converging on the thing you pressed `E` on, the screen
changes behind them at the halfway point, and then they shrink away again in
the opposite order — near the focus closes last and opens first, so it reads as
being pulled **into** the thing rather than a curtain dropping. Coming back out
irises the other way.

## Ragdoll

He goes limp and tumbles. Out on a dig there is nothing to catch him, so he
bounces off the walls of his own tunnel — each surface with its own restitution,
the spin bleeding off every time he hits the floor — until he runs out, then
gets up with **X for eyes** for a second or so. During it there is no steering,
no drill and no jets: only gravity, drag and the spin, and the limbs hang off
the shoulders and hips and flap about with the tumble.

Three things set it off: a hit that really connects (11 damage or more, with the
knock scaled to how hard), slamming into rock above 300 units a second while
dashing, and pressing `R`, because it is funny. He is capped at three seconds so
that being wedged somewhere he cannot land never strands him.

## Seven faces

The face is no longer one expression plus a blink. The big eye carries nearly
all of it, because the moustache has the mouth:

**normal** (pupils down in the corner), **blink**, **happy** (both eyes
upturned arcs), **cross** (brows driven down into the middle), **shock** (both
eyes blown wide, pupils tiny, brows up), **woozy** (X for eyes) and **smug**
(one eye half-lidded).

Nobody wires them up. The rig picks one off its own state: woozy while
ragdolling and for a moment after, shock on a heavy landing, happy when he
waves or points, smug when he shrugs or scratches, cross while he flexes or
takes a hit mid-drill, and otherwise the nose-jiggle frames.

## He cannot stand still

Left alone for a few seconds he starts doing things. He **waves** at nobody, has
an enormous **stretch** up on his toes, **shrugs** at the horizon with his palms
out, **scratches** his head, **flexes** arms that have nothing on them, **points**
at something that is not there, or sniffs his own moustache — and says something
short and stupid while he does it (`HI`, `?`, `HUP`, `HMM`, `AAA`).

None of it is drawn. Every one is played through the live limb rig: the arms go
somewhere silly on an ease-in, the legs shift with them, the whole body squashes
or pulls tall to match, and it all springs back. Then he picks another one.

Everything else got louder with it. He **tips** into whatever direction he is
travelling and takes a moment to come back upright, his arms swing nearly twice
as wide as they did and lift as they come forward, his body bobs twice a stride,
and when he lands both arms **fly out sideways** while he squashes into the
floor. Out on a dig his hands are full, so the flourishes stop — but the tipping,
the swing, the bob and the landing fling all stay.

## Worlds look like what they are

Every world in the game is rasterised at half size and blown up, so each feature
is a hard block of pixels — and each one is painted according to what kind of
place it is:

- **Asteroids and moons** are cratered: a sunlit rim on one side of every
  crater, a dark floor, and specks of ejecta thrown out around the big ones.
- **Ice worlds** get latitude bands, hard white **polar caps** with bites taken
  out of them, and fracture lines running across the surface.
- **Living worlds** get continents, caps and **weather** — streaks of cloud
  lying along the latitudes.
- **Furnace worlds** are charcoal-dark and **cracked open**, with glowing
  fissures wandering out from the middle and bright calderas punched into them.
- **Gemstones** are cut: flat panels with a bright top edge and a dark bottom,
  facet against facet.
- **Machine moons** are plated, panel by panel, with a rivet in every corner.
- **The Galactic Heart** is banded, with a molten stripe through the middle.

All of it seeded, so a world looks the same every time you come back to it, and
the same picture is used for the chart, the dossier, and the thing hanging over
your own horizon at home.

## The brain in the jar

The other thing in the room is a **brain in a bucket of acid**, wired to a
keyboard he cannot use, standing on a welded plinth with metal straps across
the glass and a bolted lid. It knows everything. Most of it is boring.

It is the skill tree, and it does not want money — money is for ABAY. It wants
**THOTS**, which come out of work: a fraction of one for every tile you break
and a fat chunk for anything valuable. Press `E` at the jar and the screen fills
with the thing itself: a big faceted pink brain suspended in green acid,
bubbles going up in whole-pixel steps, one eye grown on the side of it that
follows you round, and **twelve neurons** wired across it in rings around the
stem.

A neuron only lights up once something it is wired to is already on, so the
lattice has to grow outward from `HIT IT HARDER` in the middle. Buying one runs
a pulse of light down the dendrite it grew along. There are two panels and no
more — a chip with your THOTS on it, and one slim bar naming what is selected,
what it does and what it costs. The brain only speaks when it has been prodded. They are all a little
horrible: `BIGGER LUNGS`, `THICKER MEAT`, `STICKY HANDS`, `SPRINGY FEET`,
`GREEDY LUCK` (sometimes one rock is secretly two), `ARGUE BETTER` (everything
sells for more) and `KNOW A GUY` (ABAY prices drop; he owes the brain).

## Brenda

The first time you go inside there is a **very fat moon rat** standing on your
cheese, mid-bite, looking at you. Press `E` and you give him the cheese. He is
about knee height on you — a pet, not a co-star.

He is yours after that. He bounces after you everywhere — inside, outside, all
the way to the door — because he is far too fat to walk, and he will not stop
squeaking about it. He is called Brenda.

## The computer

Press `E` at the desk and the camera drops into **first person**: your own fat
three-fingered mitts on a human keyboard, a beige CRT filling the frame, a mug
with a bone in it, a chewed pencil, `PROPERTY OF EARTH` printed on the case
with the serial scratched out and `MINE` written next to it in red.

He is not clever with machines. He took this one off a human world and has
never really worked out how it goes, so **the mouse pointer arrives a moment
after you meant it to** — the cursor is on a loose spring, it swings past where
you aimed and settles, and a click is a *request* that lands once the pointer
catches up. It always lands. It just takes him a second.

Inside is ZORB OS 3.1 (STOLEN): a desktop with four icons, a taskbar with a
START button that does nothing, a clock stuck at 88:88, and a folder called
`MY ROKS`.

| Icon | What it does |
| --- | --- |
| **ABAY** | Where every rock is sold and every upgrade is bought |
| **STAR MAP** | Opens the galaxy chart and drops you on a world |
| **MESSAGES** | Six unread. Six bad. His mum is one of them |
| **SETUP** | Sound, full screen, and a button that throws everything away |

## ABAY

An auction site for people who are not on speaking terms with the law. Buying
and selling are two tabs of the same window.

**BUY IT NOW** is a scrolling list of everything you will ever own, each one a
blue underlined link with a thumbnail, a seller, a star rating and a review
that should have been a warning: `BIG DRILL BIT (USED) — CHEWS ROCK GOOD. ONLY
DROPPED ONCE. SMELLS FINE.` from `krunk_tools_99`. A `LEAF BLOWER (SPACE)`. A
`VERY LONG STRING`. A `GREED GLAND (JAR)` from `wet_ted`, who also has a spare
lung and is not saying whose. There are no crafting chains and no parts: you
press the yellow button, the money goes, the thing is already on your moon, and
nobody asks how.

**SELL MY ROCKS** is your sack, lot by lot, with the live market's asking price
against each one and a `HOT` or `COLD` badge where demand has drifted. One
green button lists the lot; coins spray across the monitor.

**FEEDBACK** is what other people have said about you. It is 62% positive.

Under all of it, a banner advert you can close, which comes back in seven
seconds, because that is the deal.

## Not one circle, and not one oval

Nothing in this game is round. It is not that the curves are pixelated — there
are no curves. Every rounded primitive was replaced at the source, so the whole
game turned faceted at once:

- `pix.ellipse` draws an **octagon** inscribed in its box, and `pix.disc` calls
  it, so every sprite in the game — the alien, the rat, the saucer, the ore —
  is cut stone rather than a balloon.
- `pix.round` cuts its corners with a straight **45-degree chamfer** instead of
  a quarter-circle, so every rounded rectangle is a bevelled one.
- A terrain tile is a **knapped flint**: exposed corners come off on the
  diagonal and each open face takes one shallow kink. No `arcTo`, no
  `quadraticCurveTo`, nothing.
- Planets, moons and suns are rasterised as **octagons** with an octagonal
  light falloff, and their lit limb is traced along their own facets.
- `pxd.blob` is an octagon, `pxd.ring` is a stepped octagon, and `pxd.orbit`
  walks eight straight runs of dots.

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
manifest, what ABAY lists in your sack, and what shows in a world's ore
signature.

## One button

You hold one thing: the drill. Aim it, hold it, and rock comes apart. The gun
is automatic now: anything that comes within range gets shot, and anything
that wanders into the spinning bit gets chewed. Consecutive tiles build a
**chain** that pitches the break sound up and gets louder every ten; valuable
ore lands with a hit-stop and a ring. On a phone, a held touch on the right
half of the screen is that one button.

## Everything bounces

Nothing in this game is rigid. He lands, squashes almost flat and pops back up,
and off a real drop he bounces twice before he settles. He wobbles while he is
stood still and rolls his weight side to side as he walks. Loose ore is rubber:
it skips off the floor three times, squashing every time it hits. Everything
alive squashes and stretches as it breathes, and harder while it winds up to
bite you. Floating numbers punch in past their own size before they settle.
Touch keys sink when pressed and spring back bigger than they were. Brenda is
too fat to walk, so he bounces.

## Rock comes apart

A tile does not blink out of existence. It **cracks** through five stages of
fracture — each crack a dark pixel with a pale one beside it, so damage reads as
broken rather than dirty — and by the last stages whole chips are missing out of
its corners and the thing **shudders in place**, which is the last thing it does.

Then it goes: one white flash where it stood, a hard little shockwave, a puff of
grit that drifts upward, and **debris everywhere**. Every tile throws a dozen
chips of itself, painted in its own colours with a lit top edge and a dark sole,
and they are real: they tumble, they bounce off the walls and the floor of your
own tunnel with their own restitution, and the ones that stop moving **lie
there** for a second before they crumble away. Dig a long shaft and the floor
behind you is covered in the rubble you made.

The ore itself pops rather than fades: a white ring, a coloured ring, sparks
thrown back along the path it came in on, and a plated `+$` number that
overshoots before it settles. Anything shiny throws a second ring. On the way in
it **smears along its own flight path**, stretched down the line it is
travelling, trailing light — so the moment of collection has a run-up to it.

## The alien

He is not cute. He is a tall lumpy head on a long thin neck on a pear-shaped
body: **one enormous eye and one that gave up**, a heavy brow over only one of
them, a hooked nose, three chins, one drooping antenna with a bulb that stopped
working years ago, **exactly three strands of hair** he is very proud of, and
three long fingers per spindly arm.

**The moustache is the biggest thing on him**: a full bush hung off the
underside of the nose, badly combed, parted in the middle, with waxed tips
curling up past both cheeks. It covers his mouth entirely — you only see his
teeth when he is gritting them at a rock.

**The nose jiggles.** It never settles: every frame of every pose swings it a
few pixels, so it wobbles on its own while he is standing perfectly still, and
the moustache swings with it. He wears a stolen human suit jacket that does not fit, a shirt, a tie
done up wrong, and shoes far too big for him, with a battered brass air tank
gaffer-taped to his back.

He is drawn at **twice the game's pixel density**, as are his hands on the
keyboard, the pod, the terrain and every prop in the house.

## His arms and legs are not pictures

His four limbs are not drawn into his sprite sheet. Only his body, head and
nose are; the limbs are built out of live segments every frame by a small rig,
so they swing, plant, brace, bend and **stretch** instead of stepping through
four baked poses.

Each limb is a two-bone solve. When the hand or foot is further away than the
bones reach, **the bones themselves pull long** — up to about a third again —
which is the whole point: an arm reaching for the drill or a leg braced against
the recoil visibly stretches, then springs back.

- **Walking** is a real cycle in two halves. In STANCE the foot is on the
  floor, so it slides backwards relative to the hip **in a straight line at
  exactly the speed the hip moves forwards** — it does not move at all in the
  world. In SWING it lifts and arcs back out in front. The cycle advances on
  ground covered, and on *speed* rather than signed velocity, so it never runs
  backwards when he walks left. (Both of those were wrong, and together they
  are why the walk used to look so odd: a cosine stance skates, and a signed
  phase moonwalks.)
- **Drilling** braces him. Aiming along the ground he plants one foot forward
  and drives the other straight out behind, stretched; aiming up or down there
  is nothing to brace against, so his legs go wide and he squats over the hole.
  Both hands come on to the tool, the far arm crossing to the front of the
  housing, and his fingers close over the grip because the drill is drawn
  *between* his two arms.
- **Every bite kicks him.** When a tile gives, the whole rig recoils off it:
  his shoulders go back, his braced leg stretches harder, his body jolts, and
  the drill and the camera shake.
- **Falling** stretches him and landing squashes him. In the air his legs trail
  whichever way he is moving.
- **Picking something up** makes him snatch at it: the near arm shoots out
  towards the ore, stretching if it has to, and springs back.

The limbs are drawn in *sprite units* — two to the logical pixel, the density
his body is drawn at — with every block landing on a whole unit, so an arm at
any angle is still pixels rather than a smear.

### The legs, rebuilt

The legs used to be two stamped-square tubes in a grey one shade off the grey
of the shoe under them, which fused thigh, shin, foot and the leg *behind* into
a single lump. They are built out of four things now, each fixing one part of
that:

- **Hard-edged tapered quads** instead of stamped squares, so a leg has real
  edges and can carry a one-pixel outline — and an outline is what separates
  the near leg from the far one.
- **A taper that narrows**, nine units at the hip down to six at the ankle,
  then **flares back out into a cuff**, because a widening hem is what says
  *trouser* at this size.
- **Tan brogues against navy slacks.** Only about five logical pixels of leg is
  ever visible — the jacket hangs over the rest — and at that size nothing but
  a change of *hue* will separate a foot from the leg above it. The shoe is
  built like a real one: stacked heel, an overhanging sole, an upper that is
  tall at the ankle and low over the toes, a polished toecap and two pixels of
  lace.
- **The far leg gets its own darker set of all three**, so the two legs sit at
  different depths instead of overlapping into one shape.

The bones also solve to the **ankle** rather than to the sole. Aiming the chain
at the ground while drawing the shin to the top of a ten-unit shoe left the
shin far shorter than the bone the knee had been placed for — which is what
turned standing still into a dark blob with no leg in it.

At home he runs, jumps absurdly high in the low gravity, tucks into a **roll**
(`Shift`), and bangs his head on his own ceiling. On a phone home has its own
hex keys for jump, roll and use, and a held touch on the left half walks you.

## The pod and the wire

The thing hovering over the dig site is **the same saucer that is parked
outside your house** — built once, used everywhere, dents and all: cut-glass
dome, chasing rim lights, a rust patch, a dish taped to the roof. Parked it sits
on bricks with one collapsed leg; flying, the skids tuck up and it throws a wash
of light down on to the rock. On a dive it hovers over the dig site and you drop
out on a **tether**.
The wire is the leash: run out of reach and it snaps taut, flashes red and
yanks you back. The `WIRE` bar shows the slack left, and the winch tower buys
more reach. Press `E` under the pod to board and go home.

## The chart

The saucer — or the STAR MAP app — opens the **galaxy chart**: four sectors,
each one past Home Reach in range only once you have bought another `WARP
THINGY` off `bort_electronics`. Enter a sector and you are looking at its **solar
system**: worlds on their orbits, with a dossier for the one you have picked
(depth, gravity, core, bounty, what it is made of). Press `DROP` and you are
falling on it. That is the whole travel loop: chart, sector, world, drop.

## Selling

Ore rides home in the pod and tumbles out on the regolith. The **live ore
market** moves on its own: every material carries a demand multiplier that
drifts, so a load you sat on can be worth a fifth more, or less. ABAY's SELL
tab shows the asking price per lot and flags the ones that have gone `HOT` or
`COLD`. One button lists everything. Relics, fossils and aetherium count as
**artifacts** and are tallied on the plank over the door.

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
| `R` | **Go limp** — tumble, bounce off the rock, get up dizzy |
| `E` | Board the pod / sit at the desk / talk to the brain / get in the saucer / drop on a world |
| `Esc` | Back out of the computer, the brain, or an app |
| Hold `R` | Emergency tractor beam home — costs 10% of your cargo |
| `Esc` | Pause |

**On a phone or tablet** the controls switch to touch automatically, and there
are only ever **three keys**, each one big enough to hit without looking and
labelled with a word rather than a symbol you have to decode:

- A hex pad bottom-left marked `FLY` for the jets.
- **The whole right half of the screen is the drill.** Hold it and drag: the
  same finger aims and digs, and the game says so until you have dug something.
- Three worded hex keys up the right edge — in the field `DASH` / `FIND` /
  `SHIP`, at home `JUMP` / `USE` / `ROLL`. The minimap slides over to make room
  for them.

At home, on the chart and at the computer you **tap what you want** — where to
walk, which app, which listing, which world. The pointer snaps straight to your
finger on touch; the loose spring is a mouse problem.

## Worlds are layered

Every body is generated in **strata** — depth bands with their own rock, ores,
cave density and light. Terra Prime runs topsoil → glowcap hollows →
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

Nothing grows on any of them. These are dead rocks and they look it: bare
strata, boulders, rubble and magma, with the only colour coming from the ore
in the walls and whatever is living in the caves.

## The loop

1. **Pick a world.** `E` at the saucer (or the STAR MAP app), choose a sector,
   choose a world, drop.
2. **Dig.** Every tile is a real material with its own hardness, weight and
   price. Regolith is worthless ballast; sapphire, voidstone and starmetal are
   not. Relics on ruin plinths are **artifacts**. Loose ore pops out and gets
   sucked in by your tractor magnet.
3. **Survive.** Air starts at 66 seconds and the hold at 16kg, and both of
   them hurt until you grow them. The wire keeps you inside the pod's reach.
4. **Board the pod.** `E` under the pod. The haul lands next to the saucer.
5. **Sell and shop.** `E` at the desk, ABAY, SELL MY ROCKS, list the lot. Then
   BUY IT NOW, and spend it all on a used drill bit that smells fine.
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

Nobody comes round. Everyone you deal with is a username, a star rating and a
line of feedback: `gamora_no_relation` (five stars, seller smelled of burning),
`i_am_groot` (five stars, one word), `yondu_prime_deals` (one star — you stole
the Orb off him, he taught you that, he is proud and furious),
`collector_tivan`, `drax_literal`, `rocket_88`, `nova_corps_admin` (you are on
a list, and it is not a good list). The adverts are for other people: Ravager
insurance, Knowhere timeshare, one weird trick to crack a planet.

Behind them: **the Reavers**, pirates with a code they mostly ignore; **the
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
| `src/pix.js` | Tiny pixel-drawing surface, where every round primitive is really an octagon or a chamfer; `outline()` traces the dark cartoon border that gives everything its look |
| `src/pxd.js` | Runtime pixel primitives: hard-edged scanline polygons (no anti-aliased diagonals anywhere), octagons, hexagons, stepped rings, tapering limb segments, and a cached dither pattern |
| `src/art.js` | The alien at 2x in idle, walk, fly, drill and roll poses, the drill, the pod, guns, six enemies, ore chunks, UI icons — all procedural |
| `src/arthome.js` | Home at 2x: the planet generator (cratered, iced, living, cracked, cut, plated), the small rock house seen from outside, wall and floor, the desk with the human computer, **the brain in the jar**, the moon rat, the cheese, the fridge, junk piles, litter, posters, ruins, and the cratered-moon generator |
| `src/rig.js` | The limb rig: two-bone solves that stretch, a walk cycle driven by ground covered, the drilling brace, the recoil, the snatch, the seven idle flourishes, and hard-pixel limb segments |
| `src/mind.js` | The brain in the jar: the acid tank, the faceted brain, the neuron lattice and what each neuron grows into you |
| `src/font.js` | Hand-drawn 5×7 bitmap font, cached per colour |
| `src/audio.js` | WebAudio synthesis — a drill loop that tracks rock hardness, jetpack noise, explosions, and a villainous little groove |
| `src/data.js` | 30 materials, 9 enemy species, ten worlds in four sectors, nine strata templates, the ABAY catalogue, **the twelve neurons**, the factions and lore, the evil-title ladder |
| `src/world.js` | Tile grid; strata + pocket-biome generation, tunnels and caverns, veins on a rarity curve, magma lakes, geodes, fossil beds, ruins; fog of war; the three-layer rounded terrain renderer |
| `src/entities.js` | Mobs with four AI kinds, bullets, ore pickups, falling boulders |
| `src/player.js` | Movement, the drill, weapons, dash, the ragdoll, air, cargo, damage, and the tether to the pod |
| `src/fx.js` | Particles, floating numbers, shockwave rings, terrain chunks, bouncing debris, screen shake, hit-stop, and the block iris |
| `src/ui.js` | The cardboard-and-masking-tape HUD (air tank, hull chips, sack tube), the action strip, the plank over the door, pause, victory and title screens |
| `src/home.js` | Both halves of home: the lumpy moon surface outside with the house and the saucer standing on the curve of it, the very small room inside with the computer and the jar, and Brenda |
| `src/desk.js` | First person at the computer: hands, keyboard, CRT, the loose-spring pointer, ZORB OS and ABAY |
| `src/glyph.js` | The icon language that rides alongside the text, and the hex primitives |
| `src/galaxy.js` | Spiral-arm star band, nebulae, sun, ringed planets, shooting stars |
| `src/starmap.js` | The galaxy chart and the solar-system view: sectors, drives, world dossiers |
| `src/touch.js` | Hex pad, hold-the-right-half-to-drill, tap-to-walk, three worded action keys, haptics |
| `src/game.js` | Loop, the 2x frame, camera, pod, lighting, the ore market, ABAY purchases, save/load, and the world-destruction sequence |
| `tools/build.js` | Inlines everything into one distributable HTML file |

Progress saves to `localStorage` automatically. Rendering is a 480×270 internal
canvas scaled up with nearest-neighbour, so every pixel stays square at any
window size.
