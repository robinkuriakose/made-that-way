# Later

Agreed, parked, or waiting on a decision. Nothing here is being built right now.

Last updated 21 September 2026.

## Next up

- **The UX research PDF.** Done: `docs/made-that-way-ux-research.pdf`, made with `npm run pdf`.
- **The three persona prompts** (non-designer, beginner, ten-year veteran). Written, in the same file. Still to settle: which agent runs them, and how it reaches the quiz.
  - If that agent can open a web page, it can play the live site at https://madethatway.vercel.app. Its runs would count as real players, so they should run in test mode; I can set that up when you pick the agent.
  - If not, I'll produce a "player pack" (every question and its options, no answers) and a separate answer key, so it can play blind and be scored afterwards.

## Decisions waiting on you

- **Hard mode (agreed).** Ten questions drawn at random from the hardest third, so it stays fresh and can't be memorised. It stays hidden until 20 people have finished a run on the live site, since before that "hardest" means nothing. Still open: whether hard runs share the leaderboard with normal ones.
- **Leaderboard names.** Links, handles and a short list of swear words are refused, and the Players tab can hide anyone. Nothing else is moderated.
- **Redeem points.** Still a quarter of the band.

## Not built, on purpose

- **CAPTCHA.** The cheaper defences went in instead (registered runs, limits per network, strict checks). Cloudflare Turnstile is the fallback if real abuse shows up; it needs an account.
- **Accounts.** Streaks, best scores and names live on the device. A new browser starts fresh. Accounts would fix that and are a much bigger change.
- **Editing topics in the builder.** Topics are data in the database, so adding one is a data change; there's no screen for it yet.
- **Reading the question aloud, sharing a result card, a weekly digest email.** Ideas from the research, not agreed.
