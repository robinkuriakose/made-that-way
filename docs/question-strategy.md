# Question strategy: the aha question

Written 28 September 2026, from the owner's five examples (the ruler's 0, the Heinz border, progress bars that start part full, the 28-corner eraser, mirrors by lifts). This replaces the "principle on every question" idea: the questions themselves are where people learn to see design.

## What the five have in common

The experience to aim for: you look at something ordinary, get curious, weigh the options, and the right one clicks. You feel clever for working it out, and a little delighted. It should land for someone who has never studied design.

Every question should pass all six:

1. **Familiar.** Something nearly everyone has touched or seen: a ruler, a ketchup bottle, a lift. Not a designer's chair.
2. **A detail you never questioned.** The gap before the 0, the red border, the 28 corners. Small, visible, and in the picture.
3. **Worked out, not remembered.** The answer can be reached by looking and thinking. No names, dates or company history needed to get it right.
4. **A hidden problem.** The reason is a problem the designer saw coming: ends get chipped, restaurants cheat, people give up, corners wear round, waiting is boring. Seeing the problem is the aha.
5. **It clicks.** Once you read the right option, it's obviously right, and better than the others.
6. **Human.** Often about people (how they wait, cheat, give up or get bored), not only physics.

**Wrong options** are the shallow, tempting guesses: grip, looks, cost, habit, a made-up rule. Each is plausible, and each loses once you think. None may be a real reason too: a ruler's blank end also helps the maker when cutting, so that can't be offered as a wrong answer.

**The picture** shows the detail itself, not the object in general.

**The explanation** opens with the hidden problem and follows with how the design solves it. The first sentence or two is what players see straight after answering (`src/lib/text.js`).

## How the 64 live questions measure up

My reading, question by question, against the six tests.

**Aha: keep, and put first (48).** keyboard-bumps, estop-mushroom, bic-cap-hole, coin-edges, manhole-round, atm-braille, jerrycan-handles, aircraft-window-corners, golf-dimples, winglets, shinkansen-nose, tube-map, mac-menu-bar, context-menu, slide-to-unlock, rubber-band-scroll, keyboard-hidden-targets, menu-ellipsis, fuel-door-arrow, qr-finder, safari-bottom-bar, button-verbs, ctrl-alt-del, power-symbol, phone-zero, area-codes, escalator-brushes, crosswalk-buttons, plane-ashtray, school-bus-yellow, stop-sign-octagon, golden-gate-orange, stay-on-tab, jeans-rivets, hexagonal-pencil, padlock-hole, convex-side-mirror, chips-packet-air, lpg-smell, indian-plug-earth-pin, middle-berth, matka-cooling, fan-regulator-heat, jaali-screens, auto-rickshaw-three-wheels, coke-bottle, aeron-mesh, anglepoise-springs.

**Could become aha with a new stem (4).** The reason can be worked out, but the question asks for history or a name:
- thonet-14: ask why the chair came in six pieces (it shipped flat, dozens to a crate).
- tulip-pedestal: ask what the single stem gets rid of.
- hamburger-icon: ask why three plain lines (it had to work tiny).
- google-blue: ask how a company picks between two blues (it tests them on real people).

**Story: needs knowledge you can't work out (12).** barcelona-chair, chandigarh-name, eames-plywood, wassily-steel, paimio-back, cursor-tilt, qwerty, command-key-symbol, swiss-clock-pause, apple-logo-bite, phone-keypad, calculator-keypad. Good reading, poor guessing: most people can only guess, so there's no aha.

## What changes

1. **New questions follow the six tests.** Every batch in `src/data/pending-questions.json` and every daily question is checked against them before it's written up.
2. **Daily questions are the test bed.** One a day, answered by everyone, then they join the run pool automatically once their day has passed (built). Their answer rates come with them, so levels know how hard they are from day one.
3. **Story questions leave the early levels.** Proposed, not built: hide the 12 from runs, or keep them for level 4 and beyond. Your call.
4. **Four rewrites.** Proposed: turn the four above into aha questions.
5. **Pictures are required.** A question without a picture can't join the levels, and the picture has to show the detail.

## Ideas for the next batch

Each still needs two sources and a picture before it's written. All pass the six tests as far as I can tell today.

| Object | The detail | The hidden problem |
|---|---|---|
| Pizza box | The little plastic table in the middle | The lid sags onto the cheese |
| Crackers | The rows of small holes | Steam puffs them up and cracks them in the oven |
| Tin cans | The ridges round the side | Thin metal buckles without them |
| Bus and train seats | The busy patterned fabric | Stains and wear disappear into the pattern |
| Toothbrush | Bristles that fade in colour | You can't tell when a brush is worn out |
| Lift "close door" button | Pressing it seems to do nothing | Many are disabled; they're there to give you something to do |
| Station platforms | The strip of raised bumps near the edge | Blind people need to feel where the edge is |
| Fire hydrants | The five-sided nut on top | Only the fire service's spanner fits, so no one else can open it |
| Microwave door | The mesh of tiny holes in the glass | Microwaves are too big to get through the holes, light isn't |
| Coffee cup lids | The small hole beside the drinking hole | Air has to get in or the drink glugs and splashes |
| Running shoes | The extra eyelet at the top | Laced through it, the heel stops slipping |
| Supermarkets | Milk and bread at the back | You walk past everything else to get them |

## Difficulty tags (proposed 30 September 2026, waiting for the owner's OK)

The owner's definitions:
- **Easy:** logic only, straightforward options, no general knowledge.
- **Medium:** logic with a little everyday knowledge, a bit tougher.
- **Hard:** needs real design skill or knowledge only a keen designer would have.

**Easy (26):** keyboard-bumps, estop-mushroom, bic-cap-hole, manhole-round, jerrycan-handles, hexagonal-pencil, padlock-hole, convex-side-mirror, lpg-smell, middle-berth, stay-on-tab, jeans-rivets, school-bus-yellow, escalator-brushes, tube-map, slide-to-unlock, fuel-door-arrow, safari-bottom-bar, ctrl-alt-del, aeron-mesh, daily-ruler-zero, daily-heinz-red-border, daily-kadokeshi-corners, pressure-cooker-whistle, rupee-tactile-marks, safety-match.

**Medium (36):** atm-braille, chips-packet-air, indian-plug-earth-pin, matka-cooling, fan-regulator-heat, jaali-screens, auto-rickshaw-three-wheels, plane-ashtray, stop-sign-octagon, golden-gate-orange, crosswalk-buttons, coin-edges, aircraft-window-corners, golf-dimples, winglets, shinkansen-nose, mac-menu-bar, context-menu, rubber-band-scroll, menu-ellipsis, qr-finder, button-verbs, power-symbol, phone-zero, apple-logo-bite, coke-bottle, anglepoise-springs, thonet-14, daily-liquid-glass, daily-swiss-passport-uv, daily-duolingo-energy, daily-google-icon-colours, daily-progress-head-start, daily-lift-mirrors, plane-window-hole, toothpaste-marks.

**Hard (17):** keyboard-hidden-targets, area-codes, google-blue, hamburger-icon, cursor-tilt, qwerty, command-key-symbol, calculator-keypad, phone-keypad, swiss-clock-pause, tulip-pedestal, paimio-back, eames-plywood, chandigarh-name, barcelona-chair, wassily-steel, daily-rapido-captains.

### The bank against the proposed level plan

A full 15-level run asks 75 questions, before any redeems.

| | Easy | Medium | Hard |
|---|---|---|---|
| Needed by the owner's plan | about 27 | about 15 | about 33 |
| In the bank now | 26 | 36 | 17 |
| With a picture now | 11 | 16 | 13 |

Only 40 questions can appear in levels today (levels use picture questions only). And hard is 16 short even before pictures.
