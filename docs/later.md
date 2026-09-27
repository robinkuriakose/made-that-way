# Later

Agreed, parked, or waiting on a decision. Nothing here is being built right now.

Last updated 27 September 2026.

## Next up

- **The UX research PDF.** Done: `docs/made-that-way-ux-research.pdf`, made with `npm run pdf`.
- **The three persona prompts** (non-designer, beginner, ten-year veteran). Written, in the same file. Still to settle: which agent runs them, and how it reaches the quiz.
  - If that agent can open a web page, it can play the live site at https://madethatway.vercel.app. Its runs would count as real players, so they should run in test mode; I can set that up when you pick the agent.
  - If not, I'll produce a "player pack" (every question and its options, no answers) and a separate answer key, so it can play blind and be scored afterwards.

## Proposed with V2 (not agreed yet)

- **A principle on every question**, the strongest way to carry the promise ("learn to see the thinking") into the game. After each answer: "Principle: find it by feel". The collection would group whys by principle, so a player builds a vocabulary they can use on their own work. A first list of ten, in plain words:
  1. Find it by feel (F and J bumps, braille on drive-through keypads, coin edges)
  2. Show how to use it (the mushroom stop button, jerrycan handles, slide to unlock)
  3. Expect mistakes (the pen cap hole, stay-on tabs, "Delete" instead of "OK", Ctrl Alt Delete)
  4. Let physics do the work (golf dimples, round window corners, the bullet train's nose, winglets, round manholes)
  5. Keep what people already know (QWERTY, the menu icon, keypads, the tilted pointer, the power symbol)
  6. Make targets easy to hit (the Mac menu bar, right-click menus, the first iPhone keyboard, Safari's bottom bar)
  7. Tell people what's happening (rubber band scrolling, the dots after Save As…)
  8. Leave out what doesn't matter (the Tube map, Thonet's No. 14)
  9. Let the material shape it (Eames plywood, Breuer's steel tubes, Aeron mesh)
  10. Be seen and recognised (school bus yellow, Golden Gate orange, the stop sign, the Coke bottle)
  It needs your say on the list; then it's a `principle` field, a builder dropdown, and one pass over the live questions.
- **"Spot the flaw" questions.** A picture of something badly designed (a push door with a pull handle, a hob whose knobs don't match its burners), then: what's wrong, and which fix works best. This trains the "see the flaw, know the fix" half of the promise directly. New content, and a small new question kind.

## Decisions waiting on you

- **Hard mode (agreed).** Ten questions drawn at random from the hardest third, so it stays fresh and can't be memorised. It stays hidden until 20 people have finished a run on the live site, since before that "hardest" means nothing. Still open: whether hard runs share the leaderboard with normal ones. V2's levels already get harder as a run goes on (from the same answer data), so it may be worth asking whether hard mode is still wanted.
- **Leaderboard names.** Links, handles and a short list of swear words are refused, and the Players tab can hide anyone. Nothing else is moderated.
- **How long runs last.** A redeem after every wrong answer, 3 lives, +1 a level. One redeem per level would make runs about half as long.

## Not built, on purpose

- **CAPTCHA.** The cheaper defences went in instead (registered runs, limits per network, strict checks). Cloudflare Turnstile is the fallback if real abuse shows up; it needs an account.
- **Accounts.** Streaks, best scores and names live on the device. A new browser starts fresh. Accounts would fix that and are a much bigger change.
- **Editing topics in the builder.** Topics are data in the database, so adding one is a data change; there's no screen for it yet.
- **Reading the question aloud, sharing a result card, a weekly digest email.** Ideas from the research, not agreed.
