# 🪐 Planet Destroyer

A 2D pixel-art mining sandbox / incremental game. You are a small, greedy,
extremely evil alien. You have a drill. The galaxy has planets. You do the math.

You also owe a shark a million dollars.

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

## The menu is a loop, not a picture

It runs a little film, over and over, and never quite the same way twice.

He drills a world. The fissures widen and brighten and beat faster the closer
it gets, until the whole thing goes in **one hard white frame** — a fireball of
stacked octagons, a starburst of eight hard spikes, a stepped shockwave, fifty
irregular chunks of crust and ninety embers, and a third of a second of screen
shake. Nothing in it lasts longer than half a second, which is what makes it
hit rather than drift.

Then **he takes the whole of it in the chest**. He goes limp — the ragdoll rig,
so his arms and all six tentacles trail — and tumbles off across the galaxy on
real physics: no gravity out here, so he keeps whatever the blast gave him and
only the edges of the screen ever change his mind. He bounces off them, losing
a little spin each time. After seven seconds it dips to black, a new world of a
new colour has drifted in, and he starts again.

### The wordmark

Alien, and loud about it: acid green and gold split against magenta and cyan
ghosts that drift apart and back together, a glow behind it that breathes, and
a line of nonsense runes top and bottom that shimmer one after another like
something is reading them out.

### The sky behind it

A whole **spiral galaxy**, built once and sat in front of. Two logarithmic arms
are walked outwards and stars scattered along them with a falloff, so each arm
is dense where it leaves the bulge and frays at the rim. Dark **dust lanes** are
walked down the inside edge of each arm first, because the dust is what makes a
spiral read as a spiral rather than a smear. Colour runs out with radius — gold
in the bulge, coral and violet through the arms, cold blue at the rim.

**The panels float.** Each one hangs on its own bob at its own rate over a hard
shadow cast well below it. There is no legend and no control list along the
bottom any more; the bottom of the screen is sky, and the debris drifts through
it.

**And it is full of somebody else's rubbish.** Thirteen bits of space trash
tumble across: a dead satellite, a traffic cone, a fridge with the door hanging
open, one boot, an office chair, a bent antenna, a tyre, a stove-in crate and,
inevitably, a rubber duck. The near ones are bigger, faster and dimmer, which
is the whole of the depth effect.

### Seen from a bit further back

The home scene is zoomed, but it used to be zoomed too far: a 240x180 window
blown up 2x, which meant you could not see the house and the saucer at the same
time. The window is 320x180 now. That is a 1.5x blow-up of the logical frame,
which would normally smear pixels — except the frame is already drawn at HD=2,
so a home pixel lands on exactly **three** device pixels. Crisp, and a third
more of the moon in shot.

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

## Getting out of a scene

Every screen that used to only say `ESC` now has **a button** in the top left
as well — the chart, the solar system, the brain — because there is no escape
key on a phone and no amount of printing the word makes there be one. The
computer already had `GET UP`, and the club has a door.

## ABAY

The stolen human computer runs one website and you buy everything off it.

**Every listing has a photograph of the actual item**, taken by the seller, on
the floor, at night, with the flash on. They are generated per item: a carpet
or a duvet or a worktop, the thing dumped slightly off-centre with a hard
shadow under it, the flash coming straight back off it, a thumb over the corner
of about half of them, and the date burned into the bottom right in orange, in
the wrong year.

Click a row and you get **the listing itself**: the photo at double size,
the title, the seller's feedback percentage, the blurb, the price, what level
you are on, and the postage (free — he throws it). From there you can BUY IT
NOW, or **ADD TO BASKET**.

The basket lives in the banner with a count on it. Open it, look at what you
have done, remove things, and press **CHECKOUT**.

## Checking out

Buying a thing off a human website is not one button. It is four steps and Mr
Chum talks you through all of them.

1. **SIGN IN.** Your email is already in the box and so is your codeword. What
   you have to do is prove you are not a robot: **TICK THE ROCKS** — nine
   squares, four of them rocks, and the other five are a coin, a star, a skull,
   a hand and an air can.
2. **THE CARD.** A ZORB EXPRESS card is lying on the desk. Type **the last
   four** off it. They are ringed in gold, because without the ring he types
   the first four every single time and then blames the card.
3. **THE CODE.** Eight digits are sent to your satellite, and you watch them
   **arrive from orbit one at a time** over about four seconds before you can
   type any of them in.
4. **DONE.** A progress bar, and then the whole basket lands on the moon. It
   was always on the moon.

There is a keypad for all of it, because this is a game you can play on a
phone, and the number keys work too for anyone who has them.

## Round where it should be round

For a long time this game had a rule that nothing in it could be a circle.
Discs were octagons, blobs were octagons, shockwaves walked an octagon outline.
It gave everything a cut-stone look — and it cost every planet its roundness.
A world that is visibly eight-sided is not a world.

So the rule is gone, and a real one took its place: **round, but never
smooth.** Every disc in the game is rasterised a whole pixel at a time — a
scanline of solid pixels per row, no anti-aliasing, no half-lit rim. A circle
made of squares, which is what a circle in a pixel game is supposed to be.

- `pix.ellipse` is a true ellipse now, so every sprite built on it — the
  alien's head, his gut, ore lumps — is properly round.
- `pxd.blob` and `pxd.disc` scanline-fill a real disc; `pxd.ring` is the
  difference between two of them, which is what finally made the menu's
  shockwave read as a blast rather than a wireframe box.
- Planets are masked to a hard-edged disc in **one** composite pass at the end
  of the build. Bands, clouds and lava are allowed to spill to the corners of
  the square while they are painted, and everything outside the circle is then
  punched out in a single `destination-in` — a disc drawn row by row under that
  mode would have each row erase the row before it.
- Glow is still concentric discs stepped in hard bands, never a gradient.

What has *not* changed: nothing is anti-aliased, nothing is stroked, and the
UI still speaks in hexagons and plates. Hard edges everywhere; round shapes
where a round shape is the honest one.

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

### He does not have legs

He has **six tentacles**, three a side, because he is an octopus in a suit.
Not a two-bone chain in a pair of slacks pretending to have a knee — that was
always going to look wrong on something with one big eye and one small one.

A tentacle is not a chain of bones, so there is no IK in here at all. Each one
is a **curve** swept from the hip to wherever the foot wants to be, sampled
into hard-edged quads that taper to a point:

- **Only the middle one of each trio walks properly.** The other two are
  shorter, rooted a little in front of and behind it along the belt, splayed
  further out, and run a third of a cycle out of step — so the six of them
  ripple round him instead of marching in pairs.
- **The bow grows as the tip comes closer to the hip**, because a tentacle with
  slack in it coils rather than bending. Reach further and the curve simply
  straightens out, which is exactly what a real one does — no bone to run out
  of, no stretch to fake.
- **The tip hooks.** Planted, the last two points run forward along the rock
  and flick up at the end, so it splays out flat instead of stopping in mid-air
  the way a foot does. In the air they curl back up under him.
- **Suckers** march down the leading side of the front three in pale coral,
  every other sample. At four pixels across they are the only thing that says
  *tentacle* rather than *tube*, so they matter more than the silhouette does.
- **A slow wave** runs down all six the whole time, each on its own beat, so
  they are never quite still even when he is.
- The back three are a darker green again, so the two ranks sit at different
  depths.

The curve is aimed two units **above** the foot mark, not at it. A tentacle is
drawn from its centreline outwards, so aiming the centreline at the ground
buried half its width plus its outline in the rock. That, plus a home scene
that anchored him fifteen pixels below his own feet, is why he used to stand
knee-deep in the moon.

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

## Getting there is the game now

Picking a world on the chart used to teleport you on to it between two frames.
Now you **fly there**, and when the hold is full you fly home again.

**LAUNCH.** He lifts off on a column of fire, the regolith drops away
underneath him, and the stars start to streak.

**THE CROSSING.** A real run through a rock field. The pod holds the left of
the screen, the field comes at you from the right, and the only thing you do is
not be where a rock is. Steering is a *thrust*, not a teleport — the pod has
weight, so it drifts and has to be caught. Hold the pointer and it flies at it;
WASD or the arrows work; on a phone there is a stick and nothing else, and it
is **analogue** — a gentle lean is a gentle thrust.

It is not a shooting gallery. Rocks **drift** rather than sprint, and the big
ones drift slowest, so the scariest-looking thing out there is always the one
you have the most time to get round. The gaps narrow as you go but never close
right up.

**THE TRAFFIC.** There is as much worth steering *towards* as away from:
**scrap** to scoop for cash, **repair kits** that patch a hole or put your
shield back, **Reaver skiffs** that whistle past at four times your speed,
**Nova Watch cutters** that scan you and lose interest, a drifting **hulk** that
used to be somebody's ship, a bright slow **comet** you could not miss if you
tried, and one enormous **animal** that has no opinion about any of it. Most of
them have something to say as they pass.

**DAMAGE STAYS ON THE SHIP.** Every hit tears a panel off the pod — it tumbles
away behind you and the hull is drawn with that hole for the rest of the trip,
scorched at the edges and spitting the odd spark. Three panels down and he is
visibly on fire and trailing smoke.

**THE BURN-IN.** Nothing new arrives, and the world swells out of a dot in the
corner until it fills the frame.

**THE LANDING.** The round world gives way to a jagged horizon in its own
colour, a pad is cleared and lit where you are coming down, the retro-burn flips
to fire downwards, three legs telescope out of the rim, dust comes up off the
rock to meet you, and you set it down. *Then* the dive begins.

### And the way home

Boarding the pod at the dig site starts the **return** crossing, and that one is
the chill leg: shorter, barely half the rocks, mostly things to look at. Nothing
out there can take the hold off you — a hit only shakes a rock or two loose, and
it shakes out the cheapest ones first, because he is not going to throw the ruby
away when there is regolith on top of it.

Every other way home — a reset, a death, the end of a world — is still a
teleport. Nobody wants to fly a rock field after being eaten.

### Three things that make it survivable

Bought on ABAY like everything else, so the twentieth crossing is nothing like
the first:

| | |
|---|---|
| **WARP COIL** | Six per cent off the trip and nine per cent more turn per level. A maxed coil turns a forty-second haul into a twenty-two and a barge into something that answers the stick. |
| **DEFLECTOR** | Eats rocks before they reach the paint, one per level, and recharges *in flight* — so a long crossing gives it back to you. |
| **NAV COMPUTER** | Calls rocks out early. The warning is real lead time, not a cosmetic arrow: it spawns them further out and paints a chevron on the edge of the screen. It thins the field a little as well. |

Escape aborts the trip and puts you back on the chart. It does not skip it.

## Three of you in jars

`START` does not start the game. It opens **DECANTING BAY 7**, a room with
three tanks in it and one of you asleep in each. Each tank is a save file:
pick one and it gets decanted. A tank with nothing in it says `NEW`; a tank
with a body in it shows what that body is worth, how much of the galaxy it has
eaten and what it still owes. There is a **FLUSH IT** button under the ones
that are occupied, which asks once whether you are sure.

He is not in there alone, and he is not in there whole. Turning slowly in the
fluid with him are **his own arms** — in his own colours, so there is no doubt
whose they are. Each one hangs off a torn stump: bone standing out of the middle
of it, a ring of meat round that, and three tendons trailing out of the back
that wave as it drifts. The elbows still bend and the fingers still close on
nothing, very slowly. There is a loose hand, there are pieces too small to name,
there is a shoulder on the body they came off, and what has come off him over
the years has settled in the bottom of the jar. A feed hose comes down out of
the cap and screws into his chest, and something thin and red is going back up
it. Every so often the whole thing **kicks**, all at once, and stops. And every
so often it opens an eye and finds you.

**SETTINGS** is up in the corner: noises, the groove, screen wobble, and
whether Mr Chum is allowed to stand in the corner of your screen at all.

## The night you lost it

The first time a body is decanted it gets the whole night. There is no
carpet-level opening any more: you come round on your feet in the club, walk to
the back, and the game hands you the machine.

### THE UNIVERSAL

The gamble is a **third-person casino hall**, not a first-person cabinet. You
are in the shot the whole time, a fully-rigged body standing at the lever with
one hand on the ball.

The hall is **the Galaxy Room**, and it is a room rather than a backdrop. A
coffered vault with a gold rose window at either end of it; two full tiers of
gallery, each an arcade of lit rooms with its own rank of machines glowing
inside; a long bar down the left-hand end with three shelves of backlit bottles,
a brass rail and eight stools; a roulette pit at the other end with two tables,
a wheel and stacks of chips; ranks of machines across the back and down both
sides of the floor; two chandeliers the size of a car; sweeping house lights;
patterned carpet with a velvet rope holding the crowd back; and a lit `EXIT`
right across the room.

The way in is **keyframed, not eased**, because an eased camera never actually
arrives and the one shot that has to land is the shot that shows you the size of
the place. It opens hard on the marquee, cranes all the way out until the whole
hall is in frame, then drops in over the floor.

**THE UNIVERSAL** itself is four times your height. A takings meter across the
top counting real money out of the room; a glass dome with a world slowly
turning inside it and a rim of lamps round the glass; the marquee; three reel
windows on to open space with a nebula behind them and stars that streak when it
spins; ten lamps along the front that fill in as you go; and a pillar of chasing
gold lamps up each cheek with a beacon on top of it.

**About a hundred and forty people** watch you do it, in five ranks — the top
gallery, the mezzanine, the back of the floor, the rank at the rope, and a rank
of near-black silhouettes across the bottom of the frame that the camera looks
over. They are not wallpaper. Some of them hold **placards** up (`TEN!`,
`PULL IT`, `ONE MORE`) that swing harder the louder the room gets; some are
**up on a friend's shoulders**; some hold a **camera** over the heads in front
and the flash goes off when something happens; two **cocktail servers** work the
floor all night with a tray of drinks held flat and high; and six of the house's
own stand **on the rope with their backs to the best show in town**, in black
jackets with a wire behind the ear, and they do not jump and they do not leave.

The aliens themselves got another pass: twelve kinds of crown (antennae, horns,
fins, tufts, ears, hats, flat caps, mohawks, tendril crowns, swept-back bone
crests), nine mouths including a full set of **gold teeth**, eight skin
treatments including blotches and bioluminescence, sequinned shirts and open
collars, chains, rings, **visors and spectacles**, and a lit cigar jammed in the
corner of the mouth. Twenty generated kinds, seven poses each.

A cheer does not happen all at once: it **ripples outward** from the machine,
everyone getting a head start proportional to how far away they are. They shout
— `GO ON`, `TEN`, `ONE MORE` — in bubbles that refuse to sit on top of each
other, they throw whatever they were holding, and they spill their drinks
mid-jump.

There is **no button to press**. You pull the lever: tap anywhere, or `E`. The
lever goes down hard, holds, and springs back past the top; your arm rides it
down and back because the hand is genuinely pinned to the ball by the rig's
grip, and your whole body leans into the pull. The camera pushes in on the
window while it spins and back out when it stops.

There are **planets instead of symbols** — a rock, an ocean, two ringed gas
giants and a living one, each drawn round and lit from the left. The three reels
**stop one at a time**, each with its own thump, its own screen-shake and its
own settle bounce, so the third one always arrives on its own.

You get to **nine**. At nine the room comes apart — the camera whips out to the
widest shot in the scene, every lamp on the machine doubles its flash rate, the
silhouettes across the foreground put both fists in the air, and nobody sits
down again. It asks whether you want to go on or walk away, and it asks
diegetically: pull again, or go and stand at the `EXIT`, which is a real lit
door in the room that you can click. It does not matter which you pick. The
third window was always going to have a skull in it.

### And then the rest of it

1. **The floor.** Same hall, same machine, same people: the only thing that has
   changed is that you are on the carpet and they are leaving. He goes down in
   two stages, the last of his money is all over the carpet around him, and
   somebody walks across the front of the shot to get to the bar.
2. **The drag.** Two of them pick you up and carry you out through the city:
   three parallax layers of tower with lit windows, neon signs on every fifth
   one, rain, flying traffic with tail-lights, and wet neon smeared across the
   street. The big one has **horns** and does not say anything all night. The
   other one is grey and covered in red and will not shut up — that is
   **DRAX**, and he finds all of this extremely funny.
3. **You ask him why he is grey.** He knocks you out. The fist arrives at the
   speed the fist arrives at.
4. **And that is how you came to own a moon.**

## He arrives and he leaves

Neither happens instantly. A bar of light goes up out of the watch and he
**unrolls out of it from the soles up**, squeezed thin, jittering, with a hot
white line riding the growing edge and sparks coming off it. Hanging up runs
the same thing backwards — he folds down into the floor and the column blinks
out. You cannot dismiss him halfway through arriving, which he would consider
only fair.

## The watch buzzes

Mr Chum does not visit. He calls, on the watch, and then **walks about on your
screen** — a little blue hologram of the whole shark, pacing the bottom of
whatever you are looking at, turning round at the edges, four walk frames and
two mouths so he can talk while he does it. It is the same sprite as the one
who leaned over you in the casino with the palette swapped, so he is
recognisably him at a third the size. There is a cone of light out of the
watch that follows him wherever he has wandered, a pool of it under his feet,
and one bright band rolling up him, clipped to his own silhouette.

Sixteen lessons fire once each, the first time you reach the thing they are
about — the moon, the saucer, the chart, the drop, the drill, the sack, your
air, the pod, the core, the computer, ABAY, an auction, the jar, the rat, the
crossing, coming home. They are not a tutorial screen and they never block
you: keep walking and he keeps talking. `E` takes the next line, `E` on the
last one hangs up on him.

On the galaxy chart and at the computer he paces a stripe higher up the
screen, because both of those keep a panel along the bottom edge and he is
rude but not illegible.

## He lives in the bottom-left corner

The watch puts a very small copy of him on screen — about half your height,
entirely round, in a suit the size of a stamp — and he **stays in the
bottom-left corner**, standing on the book of what you owe him. He used to walk
about in the middle of the scene and get in front of whatever you were trying
to look at. He does not do that any more.

What he does instead is **point**. He picks the thing you ought to be doing,
turns to face it, sticks a fin out, and a little arrow beside him says which
way it is. The states are: **lead** (he bounces on the spot and tells you what
it is), **wait** (he stands there), **beckon** after nine seconds of you not
going, **scold** after another three, and **arrived** — which fires when *you*
reach the thing, not when he does, and is the only nice thing he says.

What is on his list depends on where you are and what state it is in: the
heaps that are still on the moon, then the saucer, then the house; the computer
and the brain when you are indoors; the dancefloor, the dancer, the bar, the DJ
and — pointedly — the slot machines when you are down the club. The list is
rebuilt whenever the scene or the state of the tip changes, which starts the
tour again from the top.

He has nine things to say when you keep him waiting and seven more he says
unprompted — and the unprompted ones are now every twenty-six to forty-six
seconds rather than every ten, because he is meant to be a guide and not a
smoke alarm:

> WALK. IT IS ONE OF THE TWO THINGS YOU DO.
> I AM STANDING RIGHT HERE. I AM VERY BLUE.
> YOU OWE ME A MILLION AND YOU ARE LOOKING AT A ROCK.
> IS IT THE LEGS? IS THAT WHAT IT IS?

The one who turns up on a **call** is the same small shark at exactly twice
size, in the same corner, with the bubble hung off his left edge rather than
stretched across the middle of the screen. He used to be eighty pixels tall and
pace about; this is a hologram of a shark, not a shark. On the chart and at the
computer he stands a stripe higher, because both of those keep a panel along
the bottom edge.

## Nobody reads a caption bar

So there are none left. Everything anyone says comes out of a **speech
bubble** with a fat ink line round it, and the bubble bangs in: an overshoot
on the way open, a ring of little impact strokes thrown off as it lands, and a
slow wobble while it sits there. The body of it stays put — a caption that
slides about with the speaker is unreadable — and only the **tail follows
him**, so you always know who is talking without a name plate. The prompt to
carry on lives inside the bubble rather than floating over the scene.

The narrator gets the same treatment without the tail: a card that pops in the
same way, because nothing on screen is saying it.

## The moon is a tip

Mr Chum bought you a moon. He bought it cheap. There is a reason it was cheap:
somebody used it as a **tip** for about a century and nobody ever came back for
any of it. You arrive to twelve heaps of other people's rubbish — dead
satellites, split sacks, a drum of something green, a crate and some bones —
strewn across the regolith under a wash of grime, with flies, or whatever
passes for them out here, circling.

Walk up to a heap and press `E`. He does not bend down and pick it up; he sets
about it with the drill, which is the only tool he owns and far too big for the
job. Each one throws up a cloud you disappear into and lifts a twelfth of the
grime off the ground. The moon visibly gets better.

**Clearing a tip is not a living.** A heap pays about thirty credits — the
whole moon is worth less than one drill bit — and about half of them turn up a
few lumps of iron or copper underneath, which go in the vault like anything
else and are worth something only once you have sold them. The money in this
game comes out of the ground, not out of the bins.

Under the last heap is a hatch, and the hatch has a **neon sign on it**, and the
sign still works.

## The club

Whatever this moon was before it was a tip, somebody ran a club on it, and it
is still down there with the lights on. Go down the hatch and you are in a room
the length of the moon: panelled walls with neon run along them and pipes and an
extractor bolted across them, a mirror ball throwing spots, two spotlights
sweeping, a fan of lasers on every fourth beat, drifting haze, spilled drinks
and dropped glasses on the floor, and **a dancefloor that changes colour under
your feet**, four ways, in time.

Every interactive thing stands a little to the right of the spot that names it,
because if you put the spot on the prop you walk into the middle of it and your
own head hides what you came to look at.

| | |
| --- | --- |
| **THE WAY OUT** | A rope, and a bouncer who has not moved in an hour and is not going to |
| **THE COAT CHECK** | Where the suit lives |
| **DJ GORB** | Up on a riser with two platters, a crossfader and a live equaliser. He has two records. Ask him for something and half the room starts dancing |
| **THE DANCEFLOOR** | Have a go. The whole room joins in, and the first time is worth 40 thots |
| **THE DANCER** | A pole, a spotlight, and somebody working a Tuesday. $200 a tip |
| **THE BAR** | Optics lit from behind, three pumps, stools, a tip jar with one coin in it. $500 for something silly — there are five and one of them is water |

## Who is in — every one of them generated

Nobody in the club is a drawing, and none of them are blobs any more. Each
regular is **generated from a seed** as an actual person: a head on a neck, a
torso with clothes on it, two arms with hands on the ends, two legs with boots.

| | |
| --- | --- |
| **Build** | lanky, stout, normal or hulk — which changes the shoulders, the torso and the leg length, not just the scale |
| **Colour** | a hue off the wheel turned into skin, shade, highlight and a clashing accent, plus its own clothes and its own trousers, because when the top and the bottom shared a colour the whole body read as one dark slab |
| **Eyes** | one to four, in a row, stacked, in a triangle or out on stalks, each set in a socket with a brow over it |
| **Mouth** | a grin, lips, tusks, a beak, a proboscis or mandibles |
| **Head** | antennae, horns, a dorsal crest, a tuft, ears, a small top hat, or bare |
| **Skin** | plain, speckled, scaled, striped or plated — drawn into the face and the torso both |
| **Wearing** | a vest, an open jacket with a shirt and a tie under it, a tank, a sash, a long coat, or nothing |

Six frames each: idle, two steps of a walk, talking, kissing and blinking. The
walk is in the sprite now rather than drawn under it, because they have legs.

## The dancer

Four poses on a pole, drawn in one canvas with the pole always in the same
column so the act lines up with the pole the room draws: a hold, a lean, a leg
out, and the one where they are upside down with their legs wrapped round it and
are clearly thinking about something else. Sequins, a feather boa that cost more
than the outfit, and one eye on the pole and one on the clock. Tip them and they
take the money without breaking eye contact.

## The Lucky Void

Through an arch at the back of the club, past the bar, there is a red carpet
nobody has ever cleaned and **three slot machines**, and you can walk between
them and play any of them. It is the same machine that took everything you had
on the night the game opens; it has a franchise now.

`$200` a pull. Three reels stop one at a time. Two the same pays double, three
the same pays **twelve times**, and about three quarters of what goes in comes
back out over a long enough evening — which is precisely how you came to owe a
shark a million dollars in the first place. The cabinets stand on plinths so
the reels are above your own head and you can see what you have just lost.

Mr Chum notices. He notices the first time, and he has something to say if the
three ever land.

Two regulars have been standing at the end machines since before you arrived.

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
| Phone stick | Thrusters, **analogue** — a gentle lean is a gentle thrust |
| Mouse | Aim the drill and the pistol |
| Left mouse | **Drill** — bites the first rock along the bit, bores wider than you are |
| Right mouse / `Space` | **Fire** the current weapon |
| `Q` / wheel | Swap weapon (pistol → scattergun → lance, as the gun shack grows) |
| `Shift` / double-tap a direction | **Burst dash** with invulnerability frames (on the moon: roll) |
| `Tab` | **Scanner ping** — paints ore on the minimap |
| `W A S D` / arrows / hold the pointer / the stick | **Steer the pod** during a crossing |
| `Esc` (in flight) | Turn back — the trip is aborted, not skipped |
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
| `src/arthome.js` | Home at 2x: **the alien generator** (body plan, size, hue ramp, eyes, mouth, head, markings, extras — one seed each), the planet generator (cratered, iced, living, cracked, cut, plated), the small rock house seen from outside, wall and floor, the desk with the human computer, **the brain in the jar**, the moon rat, the cheese, the fridge, junk piles, litter, posters, ruins, and the cratered-moon generator |
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
| `src/lab.js` | Decanting Bay 7: three tanks with a body in each, three save files, and the settings panel |
| `src/home.js` | All three parts of home: the lumpy moon surface outside with the house and the saucer standing on the curve of it, the very small room inside with the computer and the jar, Brenda, the tip you have to clear off the regolith, and and the club under the hatch with its dancefloor, its mirror ball, DJ Gorb, the act on the pole and its nine chattering regulars |
| `src/desk.js` | First person at the computer: hands, keyboard, CRT, the loose-spring pointer, ZORB OS and ABAY |
| `src/glyph.js` | The icon language that rides alongside the text, and the hex primitives |
| `src/galaxy.js` | Spiral-arm star band, nebulae, sun, ringed planets, shooting stars |
| `src/starmap.js` | The galaxy chart and the solar-system view: sectors, drives, world dossiers |
| `src/travel.js` | The crossing, both ways: launch, cruise, approach and landing, the rock field, ten kinds of traffic, and the ship damage that sheds parts and stays shed |
| `src/chum.js` | Mr Chum: the whole round shark in two palettes and four walk steps, the speech bubbles, the four-beat opening cutscene, the hologram that paces your screen, the sixteen lessons, and the debt he takes his cut of |
| `src/touch.js` | Hex pad, hold-the-right-half-to-drill, tap-to-walk, three worded action keys, haptics |
| `src/game.js` | Loop, the 2x frame, camera, pod, lighting, the ore market, ABAY purchases, save/load, and the world-destruction sequence |
| `tools/build.js` | Inlines everything into one distributable HTML file |

Progress saves to `localStorage` automatically. Rendering is a 480×270 internal
canvas scaled up with nearest-neighbour, so every pixel stays square at any
window size.
