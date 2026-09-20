# Images

Images now appear with the question itself, under the stem, as well as with the explanation, in the end-of-run review and on the result step of a redeem. Every image sits in the same fixed-height frame and is scaled to fit, so shape and size don't matter for layout.

An image that would give its answer away can be held back until the player has answered: tick "Only show this after the question is answered" in the builder.

Status as of 20 September 2026: 40 of 64 live questions have an image, and each one also has a small thumbnail (made by `npm run images`, or in the browser when you upload) for the strip of pictures on the home screen. None of the 5 questions still waiting for review have one yet.

## How to send them

- **File name:** the question id, any format (JPG, PNG, WebP, AVIF, GIF), dropped in `images/`. Then run `npm run images`, which converts everything to WebP in `public/images/`. Or upload straight from the builder's question form.
- **What to show:** the one detail the explanation is about, filling the frame. A close crop beats a pretty wide shot.
- **Rights:** only images you took, have a licence for, or that are public domain. For each, a credit line: photographer or source, and the licence. No watermarked stock.

## Received and attached: credit line still needed (38)

These are live now, with alt text. Each one needs a credit and licence before the site is public. Many look like product or museum photos (Knoll, Herman Miller, Vitra and similar), which are usually not free to reuse, so those are worth checking first.

keyboard-bumps, golf-dimples, estop-mushroom, bic-cap-hole, coin-edges, aircraft-window-corners, manhole-round, atm-braille, paimio-back, eames-plywood, chandigarh-name, hamburger-icon, qwerty, barcelona-chair, wassily-steel, swiss-clock-pause, jerrycan-handles, anglepoise-springs, thonet-14, tulip-pedestal, aeron-mesh, tube-map, phone-keypad, calculator-keypad, phone-zero, mac-menu-bar, context-menu, command-key-symbol, slide-to-unlock, rubber-band-scroll, keyboard-hidden-targets, fuel-door-arrow, qr-finder, escalator-brushes, menu-ellipsis, shinkansen-nose, cursor-tilt, stop-sign-octagon.

**Low resolution, worth replacing when you can:** qwerty, calculator-keypad, manhole-round, rubber-band-scroll. They work, but look soft in the frame.

## Attached, but worth replacing (4)

All four are live now, at your request, with alt text that says what they really show.

The two watermarked ones are marked as placeholders in the question data, so `npm run images` writes them to `dev-images/` instead of `public/images/`: they show when the site runs on your machine and never reach the published site.

| Question | Problem | What it should show |
|---|---|---|
| menu-ellipsis | An icon chart ("know your menu"), not a menu | A File menu with Save and Save As… |
| shinkansen-nose | An E4 series MAX train, not the 500 series the question is about | A 500 series nose in profile, ideally beside a kingfisher's beak |
| cursor-tilt (placeholder, local only) | Creative Market watermark | The pointer drawn on a pixel grid (16 by 16), squares visible |
| stop-sign-octagon (placeholder, local only) | Getty Images watermark | A stop sign seen from behind, still recognisable by shape |

## Still missing: live questions (13)

| File | Question | What it should show |
|---|---|---|
| `area-codes` | Area codes by dial pulls | A rotary phone, ideally with the 1947 US area code map (the one you sent showed world calling codes, and has been removed) |
| `jeans-rivets` | Pocket rivets | Close-up of a copper rivet at a jeans pocket corner (the 1873 patent drawing is public domain) |
| `plane-ashtray` | Aeroplane ashtray | The ashtray on an aircraft toilet door, under a no-smoking sign |
| `school-bus-yellow` | School bus yellow | A school bus at dawn or dusk |
| `golden-gate-orange` | Golden Gate orange | The bridge against the hills, sea and sky |
| `apple-logo-bite` | Apple logo bite | The logo at tiny size beside a cherry |
| `stay-on-tab` | Stay-on tab | An old pull-off ring beside a modern stay-on tab |
| `power-symbol` | Power symbol | An old rocker switch marked 1 and 0 beside the power symbol |
| `safari-bottom-bar` | Safari's bottom bar | A thumb reaching the bottom address bar on a big iPhone |
| `button-verbs` | Button labels | Two pop-ups side by side, one with OK and Cancel, one with Delete and Cancel |
| `ctrl-alt-del` | Ctrl, Alt, Delete | The original IBM PC keyboard with the three keys marked |
| `google-blue` | Google's blue | A strip of blue swatches running from greener to purpler |
| `crosswalk-buttons` | Crossing buttons | A worn "push button for walk signal" box on a New York street |

## Still missing: the 11 questions accepted on 20 September, and the 5 still waiting

All 16 are listed here. Eleven are live now and would benefit most; the five marked (waiting) are still in the review queue.

| File | What it should show |
|---|---|
| `rupee-tactile-marks` (waiting) | The small raised shape near the edge of a ₹100 or ₹500 note, close up, ideally with a fingertip on it |
| `jaali-screens` | A jaali screen from inside, with light coming through the pattern |
| `fan-regulator-heat` | An old step (resistor) fan regulator beside a modern electronic one |
| `auto-rickshaw-three-wheels` | An auto-rickshaw from the front, handlebars visible |
| `matka-cooling` | A clay matka with beads of water on its outside |
| `middle-berth` | A sleeper compartment by day: middle berth folded flat, three people sitting on the lower berth |
| `indian-plug-earth-pin` | A three-pin Indian plug side on, showing the longer, thicker earth pin |
| `pressure-cooker-whistle` (waiting) | A pressure cooker lid with the whistle weight lifted |
| `safety-match` (waiting) | A matchbox's striking strip beside a match head |
| `lpg-smell` | An LPG cylinder with its regulator |
| `chips-packet-air` | A sealed chips packet, puffed up |
| `hexagonal-pencil` | A hexagonal pencil beside a round one on a sloped desk |
| `plane-window-hole` (waiting) | The tiny hole in an aircraft window, close up |
| `padlock-hole` | The small hole in the bottom of a padlock |
| `toothpaste-marks` (waiting) | The coloured square on the crimped end of a toothpaste tube |
| `convex-side-mirror` | A car's side mirror with "objects in mirror are closer than they appear" |

## Credited already

| Question | Image |
|---|---|
| coke-bottle | 1915 patent drawing (public domain), from Wikimedia Commons |
| winglets | NASA KC-135 winglet test, 1979 (public domain), from Wikimedia Commons |
