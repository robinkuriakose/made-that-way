# Context: start here

The one file a new session needs to pick up the work. Keep it short and current; the detail lives in the files it points to.

Last updated 27 September 2026.

## The product

**Made That Way**: a quiz that teaches why everyday things are designed the way they are.
- **Live:** https://madethatway.vercel.app
- **Builder:** `/builder`, behind a password
- **Code:** https://github.com/robinkuriakose/made-that-way (`main`). Every push redeploys.
- **Stack:** React and Vite; Vercel functions (`api/` thin, logic in `server/`); Neon Postgres; Vercel Blob for images.

**Today (V1):**
- **Runs:** 10 questions, 45 seconds each, points for speed, a hint (costs 10 s), redeem (answer a related question for points back), and tidbits after 3 misses.
- **Daily question:** one a day, with a streak.
- **Topics:** 8, pick at least 3.
- **Leaderboard:** weekly and all time.
- **Flags, test mode and analytics:** players flag bad questions; test mode keeps your own play out of the numbers; the builder has an analytics dashboard.

## The owner

- Designer. Wants short, structured replies: what I did, what I propose, pushbacks, questions.
- Wants to be asked before anything with more than one reasonable shape is built, and told whenever a better alternative exists.
- Build as groundwork for a bigger app; keep it effortless for players.
- Copy: plain words, no em or en dashes, no "cognitive load" or "wayfinding".

## Where to look

| For | Read |
|---|---|
| Where code lives | `docs/code-map.md` |
| Every instruction and its status, by round | `docs/brief-map.md` |
| The plan being worked on now | `docs/v2-plan.md` |
| Agreed but not built | `docs/later.md` |
| Waiting on the owner | `docs/owner-checklist.md` |
| Research, personas, feature ideas | `docs/ux-research.md` (and the PDF) |
| Sources for every question | `SOURCES.md` |
| Working rules for this repo | `CLAUDE.md` |

## Current state (27 September)

- **V1 is live and working end to end.** The last fix was the outbox jam that caused "That run isn't known here".
- **A test group played it.** Mostly developers, some product designers. Their feedback drives V2:
  - They didn't understand the purpose, and the home screen says too much.
  - Fatigue hit at questions 5 to 7.
  - They saw no reason to play again.
  - Text-only questions felt tiring.
  - The timer wasn't understood because it shows no number.
  - Average score was 50%.
- **Next:** V2, see `docs/v2-plan.md`. Open questions there must be answered before building.

## Habits that have mattered

- Test real sequences in one page visit (daily question, then a run, then play again, then sign), not just fresh page loads.
- Test the live site in test mode, so real numbers stay clean: send requests with `test: true`, or set the browser tab's `sessionStorage` key `madeThatWay.testMode` to `1`.
- Delete `.localdb` after local testing.
- Never write the builder password anywhere; grep for it before committing.
- Content must pass `npm run check:content`, and every fact needs two sources in `SOURCES.md`.
