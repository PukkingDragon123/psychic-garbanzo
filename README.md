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

### Four ways in

A stack of plates down the left, each with a glyph, a name and a line of its
own: **CONTINUE** (or START, if there is nothing to continue), **NEW GAME**,
**SETTINGS** and **CREDITS**. The selected one slides out to the right, lights
up from the inside and grows a gold chevron pointing at it, so you can see
where you are from the other side of a room.

It drives off the **keyboard** as well as the mouse — up and down to move,
enter or space to pick, escape to come back — because a menu you cannot get
through without a mouse is not a menu. Under the stack, small, in grey: what is
actually in the save.

### Settings, on the front door

The same four switches the lab has, put where people look for them, because the
first thing anybody wants to turn off is the noise and the last place they want
to go hunting for it is inside the game.

**NOISES** (clicks, bangs, the drill), **THE GROOVE** (the music, such as it
is), **SCREEN WOBBLE** (the whole picture jumps) and **MR CHUM** (he rings; you
can stop him). Each is a fat physical switch that throws left or right with the
word on it, so you can tell the state at a glance and not by a tick.

### The flypast

The dragon does not sit in a corner. It **flies the front door**: in off the
left, across the top, and out the right, towing the only credit this game has
on a banner behind it — `THIS GAME MADE BY PUKKING DRAGON`.

Three things sell it. It **banks**, rotating to the angle it is actually
travelling at, sampled off its own path rather than guessed. The banner
**ripples**, in vertical slats, and every letter rides the slat it is standing
on, so the cloth and the writing move as one piece instead of the writing
sliding about on top of it. And it beats its wings at its own rate, which has
nothing to do with the path.

The route matters more than the drawing. The whole left of that screen is
wordmark and menu from twenty pixels down, so the only clear run long enough to
tow two hundred pixels of cloth is the strip across the very top — and the
flypast goes in **front** of everything, because a banner behind the title is a
banner nobody reads.

### Credits

One name, over and over, because one person did all of it. It scrolls up
through a window that fades out top and bottom, and holding down runs it on.
There is a dragon on the footer, breathing fire, and the line under it says
**THIS GAME MADE BY PUKKING DRAGON** — which is also sat in the bottom-right
corner of the menu itself, glowing gently, at all times.

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

## One smudge on the lens, removed

There was a **dead Celestial head** in the moon's sky: a three-hundred-pixel
skull sprite, drawn at a **fixed screen position with a bob on it**, at
six-tenths alpha and eighty-five per cent size.

Which meant that as you walked the whole length of the moon it stayed nailed to
the top-left corner, going quietly up and down, parallaxing with nothing. It
did not read as a colossal dead thing out on the horizon. It read as a weird
particle following you around.

Parallaxing it and scaling it up to a proper landmark only made it a different
problem — at that size it is a pale slab across half the sky with the stars
behind it. It is gone. The sky out here is a nebula, four hundred stars and the
world you are on your way to ruin, and that is enough. (The nebula, while we
were in there, was being drawn a hundred and forty pixels off the right-hand
edge of the screen, every frame, for nobody. It is in shot now.)

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

## Six ways out of a room

A cut is the punctuation of a game and one mark is not enough. There were only
ever the slime curtains; there are six now, and which one you get tells you
where you are going before you get there.

- **THE SLIME** — a ceiling of gloop comes down in uneven columns, hangs,
  throws strings and drips, and peels back up. The moon's own punctuation.
- **THE IRIS** — a hard-edged octagon closes on a point with a lit rim, so it
  reads as an aperture rather than a hole. The tanks use it, closing on the jar
  you picked.
- **THE SHUTTERS** — eleven slats slam shut, alternate ones from opposite
  sides. Doors: the house, the club, the computer.
- **THE DISSOLVE** — a blocky teleport, every cell on its own threshold with a
  bright edge as it flips. The lift at the port, because it takes the floor out
  from under you.
- **THE SWEEP** — one diagonal blade across the screen with a bright leading
  edge. Anything that goes somewhere: the star chart, the shuttle.
- **THE TEAR** — the picture rolls and tears in twenty-six bands with scanlines
  flickering through it. Anything that goes through the brain.

All six run on the same clock — close, fire the callback at the midpoint, open
back up — so a caller only has to name the one it wants.

## Getting out of a scene

Every screen that used to only say `ESC` now has **a button** in the top left
as well — the chart, the solar system, the brain — because there is no escape
key on a phone and no amount of printing the word makes there be one. The
computer already had `GET UP`, and the casino has a door.

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

Each jar is a different night. The one in **A** has had enough: he hammers on
the inside of the glass on a slow, steady beat, the jar rings with it, the edge
lights up white where the fist lands and bubbles come off his knuckles. **B**
has given up — head down, a hand up at his face, shoulders going every couple of
seconds, and a thin stream of tears that has nowhere to go. **C** is asleep,
turning slowly on his back with his eyes shut and a line of `Z`s drifting up out
of him, and knows none of this is happening. They are the same body — the full
rig, tentacles and all — and what makes them read as three different people is
entirely what they are doing with it. Stand in front of A and you can hear him.

**SETTINGS** is up in the corner: noises, the groove, screen wobble, and
whether Mr Chum is allowed to stand in the corner of your screen at all.

## The night you lost it

The first time a body is decanted it gets the whole night. There is no
carpet-level opening any more: you come round on your feet in the club, walk to
the back, and the game hands you the machine.

### THE UNIVERSAL

The gamble is a **third-person casino hall**, not a first-person cabinet. You
are in the shot the whole time, a fully-rigged body standing at the lever with
one hand on the ball. The old one-screen casino it replaced is gone, and so is
the low-rent slot annexe you used to walk through to reach it: the back of the
club is now the door to this same room, in the same purple and gold, with the
same red carpet and velvet rope and the same machine standing at the end of it.

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

**About a hundred and forty people** watch you do it, in four ranks — the top
gallery, the mezzanine, the back of the floor, and the rank at the rope. They
are not wallpaper. Some of them hold **placards** up (`TEN!`,
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
widest shot in the scene, every lamp on the machine doubles its flash rate, and
nobody sits down again. It asks whether you want to go on or walk away, and it asks
diegetically: pull again, or go and stand at the `EXIT`, which is a real lit
door in the room that you can click. It does not matter which you pick. The
third window was always going to have a skull in it.

### And then the rest of it

1. **The floor.** Same hall, same machine, same people: the only thing that has
   changed is that you are on the carpet and they are leaving. He goes down in
   two stages, the last of his money is all over the carpet around him, and
   somebody walks across the front of the shot to get to the bar.
2. **The drag.** Two of them pick you up and carry you out through the city,
   and the city is **five layers deep**. A sky with a planet in it and cloud lit
   from underneath; three ranks of tower, each slower than the one in front,
   with setbacks, roof spires, water tanks on legs, aerial arrays, whole dark
   floors where the windows are out, and columns of neon sign hanging off their
   fronts; nine lanes of air traffic crossing each other with trails and
   blinking lights; cables strung across the street with lanterns on them; one
   enormous scan-lined hologram selling something. At street level a strip of
   shopfronts with the light coming *out* of them — stock in silhouette against
   lit windows, awnings, market stalls, overflowing bins, gratings breathing
   steam, and somebody standing in a lit doorway. The road is wet and holds a
   smear of everything above it, there are puddles with the sky the wrong way up
   in them, rain at two speeds, rings where it lands, and lamp posts going past
   close enough to be out of focus. The three tower layers and the shopfront
   strip are each baked once into their own canvas, which is what pays for all
   of that. The big one has **horns** and does not say anything all night. The
   other one is grey and covered in red and will not shut up — that is
   **DRAX**, and he finds all of this extremely funny.
3. **You ask him why he is grey.** He knocks you out. The fist arrives at the
   speed the fist arrives at.
4. **And you meet Mr Chum.** You come round on your back on a very expensive
   carpet, looking straight up: a gold coffered ceiling going away from you, two
   lamps on long chains, red columns converging, and a vault door the size of
   the room with him sitting in front of it on a chair with spikes on the back.
   Drax and the big one stand a step below him. Two tickers on the side walls
   both say `OWED $1,000,000`. Your own arm is in the bottom of the frame,
   because this is your eyes — and when he says *put the watch on him*, the
   watch goes on that arm and does not come off. He bought your marker off the
   house. He is fond of a round number. There is a moon with your name on it
   now, and you are going to go and dig.
5. **And that is how you came to own a moon.**

## It is raining, and he is dragging you

The drag through the city used to be three sprites standing in a row with a
rotated copy of you lying between them, which is a diagram of a kidnapping
rather than one.

**He has you by the ankle.** His arm comes off the end of the arm he already
has and the forearm is drawn *after* you, so it reads as a grip rather than a
line passing behind you; you are face down and trailing at an angle with your
own arms dragging back behind you and bouncing off the road; you throw up a
rooster tail of road water the whole way and leave a wet smear down the street
behind you.

And **the street hits you back**. Every couple of seconds there is a kerb, or a
bin, or a grating, or the big one boots you once without breaking stride: the
camera jolts, the road throws twenty-odd bits of itself in the air, and a word
comes off your head in red. Two minutes of being pulled along smoothly is a
screensaver.

### The rain

Five things make it read as weather rather than as white lines: the drops come
down at an **angle** and all of them at the same angle; there are **three
depths** of them at three speeds and three lengths; **sheets** of it sweep
through on the wind; it **bounces** when it lands, as a ring and two drops going
back up; and every four to eleven seconds the whole street goes white and then
the sky falls over — near, and the camera shakes with it; far, and it just
rumbles.

There are drops on the lens, too, because there is a camera in this shot and it
is out in the same weather as everybody else.

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

He is also **not there most of the time**. He used to stand in that corner
permanently, watching you walk about your own moon, which is a lot of shark for
a man who has already been paid — now he only appears while he actually has
somewhere to point, and once there is nothing left to lead you to the corner is
yours.

What he does when he is there is **point**. He picks the thing you ought to be
doing, turns to face it, sticks a fin out, and a little arrow beside him says
which way it is. The states are: **lead** (he bounces on the spot and tells you what
it is), **wait** (he stands there), **beckon** after nine seconds of you not
going, **scold** after another three, and **arrived** — which fires when *you*
reach the thing, not when he does, and is the only nice thing he says.

What is on his list depends on where you are and what state it is in: the
heaps that are still on the moon, then the saucer, then the house; the computer
and the brain when you are indoors; the cage, the poker table, the wheel, the
blackjack table, the bar and — pointedly — the slot machines when you are down
the casino. The list is
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

## THE PORT

Once the tip is clear there is a shuttle pad on the moon, and the shuttle goes
to somebody else's planet. **Three decks stacked in the same frame**, so you can
always see the one above and the one below: the **DOCKS** at the bottom with a
freighter being loaded and a bar called THE WET DECK, the **MARKET** in the
middle, and the **TERRACE** on top where the people who own the freighters
stand and look at them, next to the bank and the permit office.

You do not jump between decks. There is a **lift** at the west end that goes up
and **two ziplines** that go down, and that asymmetry is the shape of the place:
getting up costs you a walk, getting down is free and quick and slightly
frightening. The zipline is the fastest thing in the game and the only one with
no button on it — you grab the handle and gravity does the rest.

Four of the stalls sell you something real. **THE BREATH MERCHANT** does a
permanent forty air, and does not say whose. **THE GRAB HOUSE** does very
illegal magnets. **THE PERMIT OFFICE**, up on the terrace, sells a stamp that
knocks a fifth off everything you build for the rest of the game. And **THE
FENCE** takes your entire sack on the spot at ten per cent over the desk, with
no listing and no waiting — Mr Chum still takes his cut, because Mr Chum can
see the watch.

Behind all of it: a gas giant with a ring, two ranks of tower with lit windows,
and ships coming in and going out on their own lanes. Thirty-nine people walk
the decks, stop, turn round and walk back.

## THE BASE

Five pads along the eastern curve of your moon, poured by somebody before you
owned the place. Each thing you put on one has **three levels**, and every level
is a flat number you can feel in the hole:

- **THE REFINERY** — ore goes in dirty and comes out worth more. Up to +45% on
  every sale.
- **THE AIR FARM** — green things in a tube, breathing so you do not have to.
- **THE DRONE BAY** — they pick up what you drop. They do not ask why. The
  drones are actually there, hovering over the pad, one per level.
- **THE RADAR MAST** — it sees through rock, and the dish turns faster the more
  you have paid for it.
- **THE REACTOR** — it hums. The rat will not go near it.

Twelve purchases in all. The permit office makes every one of them cheaper.

## The casino

It was a nightclub. It is not any more.

Same hole in the same moon, gutted and refitted in **black and red**, because a
man who lost a million in one is not going to be allowed anywhere near a
dancefloor again. The mirror ball, the lit tiles, the lasers, the speaker
stacks, DJ Gorb and the act on the pole are all gone. What is there instead is
a room whose entire purpose is to take money off you slowly and politely.

It is a **big** room — nearly four screens of it, and it takes twelve seconds to
walk end to end. Black lacquer walls with **red flock panels** and a damask
motif stamped into them, a **gold dado rail** all the way along with sconces on
it that gutter one at a time, a coffered ceiling with **chandeliers** hanging
down into the room on gold rings, and a **red carpet** with black diamonds
running away under your feet and a gold pip in every one of them.

On the wall: framed portraits of men who won once and were photographed for it,
a gold disc of a jackpot, and **a clock with no hands on it**, because casinos
do not have clocks. On the carpet: dropped chips, screwed-up betting slips, the
end of a cigar, a card lying face down, and a cleaning robot that has been going
round this room since before any of them were born and is not close to finished.

Cigar smoke drifts the whole length of it.

### Four ways to lose money

| | |
| --- | --- |
| **THE CASHIER** | A black marble cage with gold bars, a brass tray under the glass and trays of chips behind it. She does not gamble and she does not stop anyone who does. First visit is worth 40 thots |
| **THE POKER TABLE** | An oval of felt in a padded red leather apron with gold studs round it. **One card each, $500.** The dealer deals yours across the felt, turns his own, and the high card takes it — he takes the ties, which is the whole of the house edge and is never once mentioned |
| **THE WHEEL** | Sixteen pockets, one of them green. The wheel turns, the ball runs the other way round it and gives up. **Red or black, $500** — and you pick by standing on the half of the layout you fancy. The two boxes are painted on the felt, so the bet is simply where your feet are. No buttons, no menu |
| **BLACKJACK** | The same high-card draw at a second table with a second dealer, because in a casino there is always another table doing the same thing |
| **THE BAR** | Black granite with a gold foot rail, optics lit from behind with an eye in every bottle, three taps, stools. $500 for something silly — one of the six is water and one of them is "on the house", which it is not |

Past the bar: the toilets, two booths of buttoned black leather with little red
table lamps in them, and a gold-lamp jamb with `THE GALAXY ROOM` over it — the
slot machines are through there, in the same black and red as everything else
now rather than the purple they used to be in.

### The wall is architecture, not wallpaper

The first pass at this room was a row of big flat red rectangles with a soft
glow on each, and it read as a padded cell. What it was missing was building.

It is **arched alcoves between fluted pilasters** now, over a **wood wainscot**,
under a **dentil cornice**. Every alcove has something in it — a mirror with the
far side of the room gone soft in it, a swagged curtain, or a gold sunburst —
and the flock between them carries a small stamped motif rather than a great
pink heart. All of it is baked once into a single bay and stamped across the
room at **2x**, the same density as every sprite in the game, so it lands one
canvas pixel to one device pixel and costs seven `drawImage` calls a frame
instead of four hundred rectangles.

The sconces stay live, because they gutter.

### Four floors

The casino is a building now, not a corridor. There is a **lift** in the same
place on every floor, because in a real casino it is the one thing they want
you to be able to find, and it opens a panel with four brass plates on it.

| | |
| --- | --- |
| **0 — THE FLOOR** | The tables, the cage and the salon behind the rope |
| **1 — THE ARCADE** | Eleven cabinets, a wall of nine televisions, a claw machine full of rubber ducks, a prize counter, lava lamps and posters |
| **2 — THE MENAGERIE** | A wall of brains in jars, a sofa lounge, a fountain running with something that is not water, a row of potted aliens and sunflowers, and the loan desk |
| **3 — THE CROWN** | One machine, a gallery of seats pointed at it, and an usher |

**They do not stack on screen, and that is deliberate.** The home renderer
paints into a fixed 480×270 buffer with a horizontal camera and no vertical
one; four hundred-pixel storeys will not fit in that, and bolting a Y camera on
would have broken the prompt sign, the speech bubbles, the touch mapping and the
floating numbers all at once, for a view you would only ever see one floor of.

So each floor is drawn in the same band, and what sells the building is **the
atrium**: a hole through the middle of it with the undersides and rails of the
other three floors receding above and below you, people leaning over them to
watch, the lift car running in its shaft, and one great chandelier hanging the
whole height of it. From floor 2 you can see floor 3's rail above you and
floors 1 and 0 falling away below.

### You are smaller in here

The zoom is **per scene** now. The moon and the house are small places and want
to be close; the casino is four storeys of building and wants to be seen. Home
used to blow a 320-wide window up by 1.5×; in the casino it runs at 1:1, so the
whole logical frame is on screen, you read at two-thirds the size you did, and
the room reads half as big again. It is still crisp — one home pixel lands on
exactly two device pixels.

### THE MEGA PLANET MACHINE

At the top of the building. Three windows of **worlds** rather than fruit —
each one a disc with a lit cap, three continents, a terminator and a ring going
round it — a lever the size of a man that comes back up on its own, and a
jackpot board that has never been reset because it has never been paid.

Ten thousand a pull. Two worlds pays three times, three worlds pays **sixty**,
and the odds of three are about one in eighty.

### Behind the rope: THE SALON

The room is **two thousand two hundred pixels** wide. Past the Galaxy Room
there is a velvet rope with a man in front of it, and behind it, **up three
steps**, is the part of the house that is not for you yet.

The steps are not decoration. On the flat you stood in front of every table
back there and your own head covered the game you were playing; up a step the
tables ride higher than you do and you can see what you are losing.

| | |
| --- | --- |
| **THE DICE** | A sunken bed of felt with a diamond wall down the far end for them to come off. **$1000.** A seven pays three, an eleven pays five, any pair gives you your money back — about ninety-four pence in the pound, and nobody at that table has ever worked it out |
| **THE LOUNGE** | A stage, a curtain, a spotlight, a double bass, a horn and a woman who has been singing in this room since before the carpet. She has **three numbers** and she will do the next one if you ask. **The band is the music in the room**: ask for something and the game's soundtrack changes to it |
| **BACCARAT** | Two cards each, drop the tens, nearest nine. **$5000.** The house takes the ties. It is the simplest game in the building and it is the one that takes the most off you |

### THE CARD

Every bet you put down anywhere in the building goes on your account, win or
lose, because the house does not care whether you win — it cares how much goes
across the felt. Five tiers, and every one is worth something real:

| | | |
| --- | --- | --- |
| **BRONZE** | $10K wagered | the rope comes down whatever you have or have not destroyed |
| **SILVER** | $50K | the bar stops charging you |
| **GOLD** | $250K | the machines pay fifteen for three instead of twelve |
| **BLACK** | $1M | an envelope is waiting at the cage every time you come in |
| **THE LIST** | $5M | they will fetch THE UNIVERSAL back out for you |

There is a board beside the cashier's cage with a lamp against each tier and
the one you are on lit. It is the only thing in the building that tells you you
are getting somewhere, which is of course the entire point of it.

### The dealers

Three of them, one behind each table, built as proper characters at the same
scale as everybody else in the room. Black waistcoat with lapels and a pocket
square, white shirt with gold buttons, **a red bow tie**, a moustache you could
hang a coat on, and both hands out flat over the felt at all times so everybody
can see there is nothing in them. One of them wears a green eyeshade. They deal
when there is a hand on and stand perfectly still when there is not.

They stand on the far side of the table, which is a step up: drawn at floor
level the felt ate them from the waist up.

### What the room does not show you

**The debt bar is hidden the whole time you are in here.** Everywhere else in
the game the number you still owe Mr Chum sits in the bottom-left corner. In
the casino it is gone — a man does not want the figure over his shoulder while
he is deciding whether to have another go, and the house would never let you
see it either.

### Standing room

Fourteen regulars mill about, each up and down its own stretch of carpet
between the tables, and they are drawn **behind** the furniture. Drawn last they
stood in front of every game in the room and you could not see what you were
putting five hundred on. One of them talks at a time, for the same reason.

The spot that names a table is a **sign position and a reach, separately**: the
sign hangs to the left of the prop so your own head does not hide it, and the
reach is a `lo`/`hi` pair covering the whole hundred pixels of furniture, so you
can stand anywhere along a table and still play it — and at the wheel, which end
you are standing at is the bet.

## Who is in — every one of them generated

Nobody in the club is a drawing. Each regular is **generated from a seed** as an
actual character, and the thing that makes that work is the **proportions**. The
first version was a realistic seven-and-a-half heads tall, which at forty pixels
meant a head eleven pixels across and a face you could not draw an eye on — so
everybody was a smudge with legs. They are character proportions now: the head
is nearly forty per cent of him and everything else got out of its way.

Which buys the face room to be a face.

### An eye is six things

A dot is not an eye. Every eye here is a **socket** so it sits *in* the head, a
**white**, an **iris in a colour that is never his skin colour** (a green man
with green eyes has no eyes), a **pupil**, a **catchlight** that is always
up-and-left on every eye on every character so the light in the room is
consistent, and a **lid** in skin that cuts the top off the white. Take any one
of those away and it goes back to being a dot.

Over it goes a **brow**, which is where all the mood lives — flat, arched,
angry, sad or bushy, and angled per side so an angry brow actually slants. Under
it, a nose with two nostrils, and cheeks, because a face without them is a mask.

And then **facial hair**, which is the single cheapest way to turn a generated
body into somebody you would recognise again across a crowded room: a walrus, a
handlebar with waxed tips, a pencil, a plain tache, a goatee, a full beard that
takes over the jaw, or mutton chops.

| | |
| --- | --- |
| **Body** | lanky, stout, normal, hulk or pear — shoulders, hips, torso and leg length all move independently, so a pear is genuinely pear-shaped and a hulk is genuinely wide |
| **Plan** | biped, fungal (a cap with gills under it, on a stalk with a face on the front of it), beast (snout, brow, fur along the jaw, tail) or arthropod (plated collar, spiracles, wing cases) |
| **Eyes** | one to four, in a row, stacked, in a triangle or out on stalks — all six elements each |
| **Mouth** | a grin, a smirk, lips, tusks, a beak, a proboscis, mandibles, a full set of gold teeth or a sucker |
| **Head** | antennae, horns, a dorsal crest, a tuft, a quiff, ears, a top hat, a flat cap, a mohawk, a crown of tendrils, bald |
| **Skin** | plain, speckled, scaled, striped, plated, blotched or bioluminescent |
| **Wearing** | a vest, a jacket with lapels and a tie, a tank, a sash, a long coat, a sequinned shirt, an open collar, or nothing — every garment leaves a collar of skin at the neck and has a lit edge, so nobody is a black slab |
| **Boots** | their own colour, so two feet do not merge into one dark bar |

Seven frames each: idle, two steps of a walk, talking, kissing, blinking and a
cheer. Twenty of them are generated at boot and the body plans are **dealt out
rather than rolled**, so a room of twenty always has mushrooms in it.

## Talking to people

Seven of them, one or two per floor, standing on brass name plates: the floor
man, the pit boss, the change girl, the mechanic, the gardener, the concierge
and the usher. Press E and they say the next thing they have to say, and then
they go round. Nobody in this building has anything new to tell you, which is
the point of them.

### The desk

Second floor. They lend against nothing at all, they add **twenty-five per
cent** before you have left the counter, and it goes straight onto what you
already owe the shark. Twenty-five thousand, then a hundred, then five hundred.
Nobody has ever been refused.

### The card, in the corner

The debt bar is hidden the whole time you are in the casino, so what sits in the
corner instead is **what you have got on you** — which is the only number the
house wants you thinking about — with your loyalty tier under it.

### Being shoved

It is busy in here and nobody is looking where they are going. Walk into one of
the regulars and you get moved, because you are not important, and about a third
of the time they have something to say about it.

### Crying

Lose enough at once and you go down like a cartoon: two hard jets out of your
eyes, a puddle that spreads out under you and takes a few seconds to soak away,
and drops bouncing off the carpet. The bigger the loss, the longer it runs.

## The regulars

Not everybody in the casino is a stranger. Some of them you are fairly sure you
have seen somewhere before, you cannot think where, and it is going to bother
you all night.

None of them is anybody. Each is **the ordinary generated body with a handful
of traits held down** — so they walk, talk, blink, kiss and cheer out of the
same seven frames as the rest of the room, and they turn up in the crowd
wherever the crowd turns up, dealt alternately with the strangers so they are
spread down the room instead of standing in one corner of it. Each has a line
of his own and uses it about a third of the time.

| | |
| --- | --- |
| **SPARKS** | Small, yellow, two hot red discs on the cheeks and a zig-zag where a tail should be. He has not paid for a drink in his life |
| **THE PLUMBER** | Stout, a red cap with a letter on it, a moustache you could hang a coat on, blue dungarees, white gloves. He says he is in pipes. Nobody asks again |
| **THE HEDGEHOG** | Blue, spikes down the back and over the head, white gloves, red boots. In a hurry, and not going anywhere |
| **THE HERO** | A green tunic and a tall green hat that flops over at the end. Has not said a word all night |
| **CHOMPY** | Round, yellow, one eye and a wedge taken out of his face. Has eaten everything on that side of the room |
| **THE BARBARIAN** | Enormous, bare, a red headband and a beard. Asked the barman for a lake |
| **THE WIZARD** | A tall purple hat and a white beard. Keeps saying the wheel is a trick. It is |
| **UNIT 7** | Plated, a red visor and one antenna. Has been calculating the odds for nine hours |

### And seven who are not people at all

There is no set of traits that adds up to a brain floating in a jar, so these
seven are built by hand: **UNIT 12** (a box on treads with a needle gauge that
goes further over the more of your money it has watched disappear), **THE JAR**
(a brain in a preserving jar on three brass legs, which speaks in bubbles),
**POTTED PETE** (a terracotta pot with a face fired into it and a fern for
hair), **SUNNY** (eight foot of sunflower in a bucket, who faces whichever
machine is paying and is never wrong), **THE LAMP**, **DUCKY** and **THE SET**
(a television on legs, whose face is whatever is on it).

They produce the same seven frames as everybody else and go into the same table,
so the room code never has to know the difference. Several of them are also
**furniture** — the lava lamp, the jar, the duck and the television are screwed
to the walls and standing on the shelves of the casino as props, which is the
whole reason it was worth building them properly once.

Adding the first eight cost the generator five new optional flags — cheek discs, a bolt
tail, a ball cap, a pointed hat, a headband, back spikes, dungarees, gloves and
a chomping wedge of a mouth — and nothing else. The bodies underneath are the
bodies everybody else has.

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

## THE UNIVERSAL

On the top floor, THE CROWN, there is one machine and it is not furniture. It
stands on a four-step plinth with a worn runner up the middle of it, it is six
times your own height, and it goes up through a hole they cut in the ceiling to
get it in and never made good — you can see the gantry cables running away into
the dark above the shaft. Three windows, each one bigger than a door, with a
whole **ringed world** turning in each: a lit side, a terminator, polar caps,
continents, a cloud band that drifts, a moon in its own orbit, and a ring that
passes *in front of* the face of the planet rather than stopping politely at its
edge. Fluted gold columns down both flanks with lamps chasing up them, a jackpot
board over the top going round, a coin slot with the brass rubbed off it, and a
lever on the end of a bracket that you have to reach up for.

Either side of it: a raked gallery of people who cannot afford a pull, watching
you have one, most of them with a drink on the arm of the seat. On the wall,
**THE BOARD** — a list of everybody who has pulled this lever and, beside each
name, what it took off them. Ten thousand a pull. Three worlds pays sixty times.
The board has never been reset because it has never been paid.

## Nobody is the same size

A crowd of aliens who are all the same height is a school photograph. There is
now a **stature** roll on the whole animal, head included, drawn from a table
rather than a range so the very small and the very large actually turn up
instead of everybody landing on the average: the shortest come out at a bit
over half height and the tallest at two thirds again, and a knee-high one
standing next to something half your size again is worth more than any amount
of paint.

They are also **dressed**. The long garments are the ones that matter, because
silhouette is the only thing you can read on somebody forty feet away in a dark
room: a **long coat** past the knee, split up the middle so the two skirts flare
apart with the stride; a **cloak** off one shoulder with a clasp and folds down
the length of it; a **robe** to the floor with a hem band; a **harness** of
straps over bare skin; a **poncho**. Over the top of any of them: a bandolier of
shells, a shoulder strap, belt pouches and a canteen. Everything on that
reference sheet is carrying something, and the little hard shapes are what the
eye reads first.

Two more off the sheet: a **beak** head — a narrow skull and a long beak that
comes down off the front of it, the most readable silhouette in the set — and
**hover**, which is not legs at all: two feet that have never been put down and
a ring of light under them.

## Mr Chum bites

For most of this game he is a small round shark in a suit who makes jokes about
your air supply, and the whole time the joke is that he is a shark.

Take your first advance from the desk on the second floor and the joke stops. He
stops pacing, the room goes out, and he comes at the camera: the head grows
until it is bigger than the screen, the jaws open past anything a face that size
should open, the eyes roll back behind the membrane, and they shut. Then there
is a shark's face where the room used to be, looking at you, saying YOU SIGNED
IT.

It is **one piece of drawing scaled up** rather than a separate sprite — the
head takes a half-width in pixels and works everything else out as a fraction of
it, so he is recognisably him the whole way in: same skin, same teeth, same
little collar and red tie, right up to the point where the collar is eight feet
across. He also comes out on a pull you cannot cover, when the debt gets away
from you, and at the end of anything he says in that tone.

## The tutorial does not go away

The old one was hint cards on a timer that could be ignored from beginning to
end, which meant people arrived in the casino without having worked out that you
hold a direction to dig. The new one is five steps, one at a time, in a card at
the top of the screen that **stays up until you have done the thing** — and it
watches for the action rather than the keypress, so holding right against a wall
is not walking and does not tick the box.

It also gates. Until the sack has something in it the ship will not take you
home, because leaving your first dive with an empty sack is the one mistake that
teaches you nothing. And **pause now lists the controls**, because pause is
where people go when they do not know what to press.

## Four axes of alien

Skin colour and a hat were never going to be enough. A room of twenty still
read as one alien in twenty coats, because underneath the paint every one of
them had the same body. There are now **four separate rolls** that decide what
somebody actually *is*, and between them they are the difference between a
colour swap and a species:

- **What he stands on.** Ordinary legs; **digitigrade**, where the knee goes
  forward and the ankle back and he stands on his toes; **hooves**, one hard
  split block; **talons**, thin scaled shins with three toes forward and one
  back; **stumps**, barely a leg at all; **stilts**, two pins with a knob for a
  knee; a **skirt** of short tentacles and no legs whatsoever; and a **wheel**,
  which is a machine and knows it.
- **What he reaches with.** Hands; **tentacles** that curl away from the body
  with suckers down them; **pincers** that leave a gap you can see through;
  **mittens** with a thumb and no fingers; **thin** spindly arms with a knobbly
  elbow that reach past the hip; **wings**, a scalloped membrane from shoulder
  to hip with the bones showing through; **stubs** that are no use to anybody;
  and **four arms**, because why stop at two.
- **The shape of his head.** Round, **dome**, **pear**, **anvil** (a wide slab
  and a chin you could open a tin with), **tall**, **wide**, **split** into two
  lobes with a groove between them, and **egg** — a big cranium and hardly any
  face under it. All eight are built off the same radius, so the eyes and the
  mouth still land where the face code expects them; what changes is the skull
  around them.
- **How the body between them is put together.** Lanky, stout, normal, hulk,
  pear, **barrel**, **wedge** and **blob**, each with its own shoulder width,
  hip width, torso length and leg length.

The body plan overrules the rolls where it has to — a mushroom stands on a
stalk and reaches with tentacles, a bug gets pincers and bird legs, and a wheel
does not get tentacles for arms — so nothing ever comes out of the generator
that could not walk into a room.

The arms bow **out** from the body now. The first pass hung them straight down
against the ribs, and a pincer, a mitten and a hand were the same silhouette:
you could not tell what anybody had on the end of their arm.

## They talk to each other

One alien saying one line at nothing in particular is a sign, not a
conversation. The floor now runs **two-handers**: somebody says the first thing,
whoever is standing nearest says the second thing back, and both of them turn to
look at each other while they do it. Half of them are only funny because of the
reply, and a few run to three or four beats:

> — I HAVE A GOOD FEELING
> — YOU HAD A GOOD FEELING LAST TIME.
> — AND I WAS RIGHT
> — YOU WERE NOT.

The bubble pops open, holds two lines when it needs them, wraps at the point
that balances the two, carries the speaker's own colour along the top so you can
tell who is talking without following the tail, and bobs, because a bubble that
sits perfectly still looks painted on. It **squashes** open rather than growing
sideways — a box that grows sideways spends a tenth of a second at the wrong
width with nothing in it, and if you catch that frame it reads as broken. Two
dots appear over the head of whoever is about to come in, which is the
difference between a conversation and two signs taking turns. And sometimes the
last word is not a word at all but a small drawn noise: a heart, a skull, a
coin, a droplet, three Zs.

## No particles in the house

The casino is a room with a floor and a ceiling and a lot of gold on it. Loose
glowing dots floating about in it never read as anything — not as smoke, not as
confetti, not as sparkle — they read as a bug, and that is exactly what they
were reported as. Every particle emitter in the home file now goes through a
gate: outside the club they work as they always did, and inside it they do
nothing at all. Floating text, screen shake, the flash and the wipe go straight
through, because none of them is a loose dot.

What replaced them is **drawn light**. A win is three hard rings going out, a
set of spokes that turn, and a pool of it on the carpet under whatever just
paid. Every chandelier and pendant throws its own pool down the floor, with a
bright core and two dithered steps out. The smokers got their smoke back as a
curl of five discs on a slow sine, attached to the head it comes out of. All of
it is made of whole pixels, and when it is over there is nothing left behind to
chase round the building.

## Filling the room

A casino is not the tables. It is the forty feet between them, and for a while
that was forty feet of very good wallpaper with a chip stack on the floor. Every
floor now gets a **dressing pass**: the room works out what is already occupied
on that deck — the lift, the atrium void, every table, the machine — and then
lays trolleys, ashtray stands with three ends in the sand, palms in brass pots,
rope runs on their bollards, banquettes with somebody asleep on the end, tip
boxes, uplighters and stacks of spare chairs into whatever is left, stepping
round the furniture rather than through it. It steps *through* the kit rather
than picking at random, because a straight random pick kept putting three of
the same thing in a row and the floor read as a garden centre.

Above them: notices about credit that are a lie in both directions, gilt
mirrors, tapestries with tassels, mounted heads of previous winners, shelves of
bottles and the house crest. Overhead: pendant lamps between the chandeliers,
bunting swagged bay to bay, and a camera dome every so often with a red light
in it. And the girl with the tray, going up and down whichever floor you are on
and never getting to the end of it.

The **atrium** used to be a black rectangle cut out of a good room. Now it is
the other side of the building: three tiers of balcony receding with the lights
on, people small and dim at every rail, the floor numbers picked out in neon on
the far wall, and a banner hung down the whole height of the well.

## The band knows several numbers

There used to be **one loop**: a bassline, a hat and an arpeggio, going round
for the entire game whatever was happening on screen.

It is a small band now, and it knows **twelve numbers**. A track is a chord
progression plus a bar of patterns to run over it — sixteen characters to a
bar, one per semiquaver, where a digit is a degree (of the chord for the bass
and the comping, of the scale for the tune, so the melody moves with the
harmony), a dash holds the note before it and a dot is a rest:

```
prog:  [[0,'m7'], [5,'d7'], [0,'m7'], [-2,'d9']]
bass:  '1.2.3.5.8.5.3.2.'     a walking bass
comp:  '..C...C...C...C.'     chords on the off-beat
ride:  'x..x..x.x..x..x.'     a brush on the ride
```

Swing is a per-track number: every other semiquaver arrives a fraction late,
which is the whole difference between a lounge and a lift.

| | |
| --- | --- |
| `title` | The front door. Swaggering, brassy, far too pleased with itself |
| `moon` | Sparse, slow, lonely. Nobody is out there and the music knows it |
| `dig` | Driving, for working |
| `deep` | Half the speed, twice the weight, and something is down here |
| `boss` | Something enormous has noticed you |
| `casino` | Lounge swing. Walking bass, off-beat comping, a brush on the ride |
| `lounge1/2/3` | Whatever she is singing tonight |
| `city` | The rain, upside down, bleeding |
| `port` | A market with four thousand people in it, all shouting a price |
| `chum` | Oily, and it will not leave |

**Nobody chooses the track.** It is picked from what is on screen, every frame,
and the band finishes the bar it is on before it changes, so nothing ever
lurches. That frame-loop call goes to `track()` and never to `music()`:
`music()` is the settings switch, and if the picker touched it then turning the
music off would last exactly one frame.

And the noises: the room has card-on-felt, chip-on-chip, dice-on-wood, a ball
going round and round a wheel and slowing down, a reel stopping, a jackpot, a
round of applause. The street has **rain as a filtered loop** rather than ten
thousand one-shots, thunder near and far, a punch, a scrape and a body landing
on a road. The casino has a **murmur**: a hundred people losing money, heard
and not seen, which follows the scene so it is on the moment you are through
the door and gone the moment you are not.

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
| `src/arthome.js` | Home at 2x: **the alien generator** (body plan, build, **leg type, arm type and head shape**, size, hue ramp, eyes, mouth, markings, extras — one seed each), the planet generator (cratered, iced, living, cracked, cut, plated), the small rock house seen from outside, wall and floor, the desk with the human computer, **the brain in the jar**, the moon rat, the cheese, the fridge, junk piles, litter, posters, ruins, and the cratered-moon generator |
| `src/rig.js` | The limb rig: two-bone solves that stretch, a walk cycle driven by ground covered, the drilling brace, the recoil, the snatch, the seven idle flourishes, and hard-pixel limb segments |
| `src/mind.js` | The brain in the jar: the acid tank, the faceted brain, the neuron lattice and what each neuron grows into you |
| `src/font.js` | Hand-drawn 5×7 bitmap font, cached per colour |
| `dist/planet-destroyer-itch.zip` | The itch.io drop: `index.html` at the root plus an `.itch.toml`, built by `tools/pack.js`. The artifact build has no `<!doctype>` because the artifact host supplies one; itch does not, so pack wraps the same bundle in a whole document with a viewport tag |
| `dist/store/` | Cover (630×500), banner (1920×480), long and short descriptions, and a note on what to upload where. The art is rendered **by the game's own renderer** — that is the real wall, the real chandeliers and the real characters, not a mock-up |
| `src/audio.js` | WebAudio synthesis — a drill loop that tracks rock hardness, jetpack noise, explosions, and a villainous little groove |
| `src/data.js` | 30 materials, 9 enemy species, ten worlds in four sectors, nine strata templates, the ABAY catalogue, **the twelve neurons**, the factions and lore, the evil-title ladder |
| `src/world.js` | Tile grid; strata + pocket-biome generation, tunnels and caverns, veins on a rarity curve, magma lakes, geodes, fossil beds, ruins; fog of war; the three-layer rounded terrain renderer |
| `src/entities.js` | Mobs with four AI kinds, bullets, ore pickups, falling boulders |
| `src/player.js` | Movement, the drill, weapons, dash, the ragdoll, air, cargo, damage, and the tether to the pod |
| `src/fx.js` | Particles, floating numbers, shockwave rings, terrain chunks, bouncing debris, screen shake, hit-stop, and the block iris |
| `src/audio.js` | The whole band and every noise in the game: a twelve-track sequencer with chord progressions, swing and per-scene switching, plus the drill rig, the thrusters, the rain loop, the room murmur and about thirty one-shots. Not one sample |
| `src/ui.js` | The cardboard-and-masking-tape HUD (air tank, hull chips, sack tube), the action strip, the plank over the door, pause, victory and title screens |
| `src/lab.js` | Decanting Bay 7: three tanks with a body in each, three save files, and the settings panel |
| `src/home.js` | All the parts of home: the lumpy moon surface outside with the house and the saucer standing on the curve of it, the very small room inside with the computer and the jar, Brenda, the tip you have to clear off the regolith, the black-and-red casino under the hatch with its poker table, its wheel, its blackjack, its cashier's cage and its three moustachioed dealers, and THE PORT hub |
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
