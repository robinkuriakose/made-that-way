# Context: start here

The one file a new session needs to pick up the work. Keep it short and current; the detail lives in the files it points to.

Last updated 30 September 2026.

## The product

**Made That Way**: a quiz that teaches why everyday things are designed the way they are. The home headline: "You've seen it a thousand times. Let's ask why." Every question should be an aha question (`docs/question-strategy.md`). The owner wants players to question design themselves, see the flaw, know the fix, and build better in the age of AI.
- **Live:** https://madethatway.vercel.app
- **Builder:** `/builder`, behind a password
- **Code:** https://github.com/robinkuriakose/made-that-way (`main`). Every push redeploys.
- **Stack:** React and Vite; Vercel functions (`api/` thin, logic in `server/`); Neon Postgres; Vercel Blob for images.

**Today (V2 plus round 12):**
- **Runs:** levels of 5 picture questions, no clock, 3 lives. A wrong answer costs a life; a right redeem wins it back; each level cleared adds one (5 at most). Points: 10 a right answer, times the level (x1 to x3) and the combo (x1.5 from 3 in a row, x2 from 5); a hint halves them.
- **Difficulty:** every question is tagged easy, medium or hard (never shown). Each level's mix comes from `src/data/level-plan.json`; the last level is 6 for now (15 once the bank allows). Clearing it is the Legend finale: a trophy, then signing the Legends wall by drawing, then a feedback form.
- **Players:** a random starting name ("Call me fuzzyheron42 ✎"), a profile with their stats, and a way to suggest questions.
- **Between levels:** a break with the running score, what was earned, and a clue for a question in the next level. The player can stop there and save.
- **After each answer:** the short reason, "Read more", and how many players get it right.
- **Rewards:** whys collection, 4 badges, a private best.
- **Daily question:** one a day, with a streak.
- **Topics:** 8, pick at least 3; they come first rather than filter.
- **Leaderboard:** weekly only, resetting Monday midnight India time.
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
| V2: the feedback, your answers, the calls I made | `docs/v2-plan.md` |
| Agreed but not built | `docs/later.md` |
| Waiting on the owner | `docs/owner-checklist.md` |
| Research, personas, feature ideas | `docs/ux-research.md` (and the PDF) |
| Sources for every question | `SOURCES.md` |
| Working rules for this repo | `CLAUDE.md` |

## Current state (1 October)

- **Round 15:** sharing is built. A right answer can be sent to a friend (`/q/<id>`, with a preview card that never shows the answer), the daily result shares spoiler free (`/daily/<day>`), a friend lands on that exact question and then plays. "Only N% get this right" on hard right answers; "Suggested by" credits; rating and suggesting on every end screen and on home; a named player goes on the board automatically, and the end screen animates their move up or down; a placeholder logo (keycap) everywhere. Private groups were left out on purpose. **Still waiting on the owner:** whether to raise the last level from 6 to 10.
- **Round 14:** the owner's photos are published (47); the hero deck's swipe no longer hangs at the far end, and "Another one" turns the open card over to the next question on the spot; review cards and the Daily tab show each question's difficulty and picture, both changeable right there; 20 more questions (five daily for 8 to 12 October, fifteen in review), none with a picture yet, each with a note on what it should show. A daily question now waits until it has a picture. **Waiting on the owner:** pictures for those 20, the rewrites, credit lines, the logo pick, and a call on the sharing ideas.
- **Round 12 built:** difficulty tiers and the level plan, the Legend finale at level 6, the feedback form, suggested questions, the new home page and copy, names and profiles, and the builder's tier tabs, bulk pictures, Suggestions and Feedback tabs. **Also done:** shorter wording for 77 questions, waiting for the owner in the builder's Rewrites tab; 20 new questions with drawn pictures (five in the daily queue for 3 to 7 October, fifteen in New questions); three logo sketches in `docs/logo/sketches.html`. **Waiting on the owner:** the logo pick, the rewrites, the fifteen new questions. Status by item: `docs/brief-map.md`.
- **Easy pictures decide how far players get:** reaching level 6 needs 18 easy questions with pictures; with the owner's photos and the round 12 questions accepted, the live bank now has enough. The builder's Questions tab shows this per tier. Pictures wanted: `images/IMAGES-NEEDED.md`.

- **Round 11:** the home picture strip is rebuilt: swipe by hand, tap a picture to open it big with its question, "Play this one" starts a run with it first. It sits under today's question.

- **Round 10:** the owner's five "aha" questions are the daily questions from 28 September; finished daily questions now join the run pool; new home copy ("You've seen it a thousand times. Ever wondered why?"); a clearer answered-question screen on phones. The kind of question wanted is written up in `docs/question-strategy.md`: read it before writing any question.
- **Waiting on the owner:** pictures for three daily questions (Heinz, Kadokeshi, lift mirrors) before their days; whether to take the 12 story questions out of runs; go-ahead for the next batch.

## Earlier (27 September)

- **V2 is live** (pushed and checked on the live site in test mode, 27 September: a run with a redeem, a level break, stop and sign as "test", play again, all in one visit (the daily question then a run was checked locally); the test entry left the board after two minutes). Built from the test group's feedback and the owner's answers. See `docs/v2-plan.md` and the V2 section of `docs/brief-map.md`.
- **The bank is the limit now:** 38 picture questions on the live site; strong players will see them all in one run.
- **Still with the owner:** `docs/owner-checklist.md`.

## Habits that have mattered

- Test real sequences in one page visit (daily question, then a run, then play again, then sign), not just fresh page loads.
- Test the live site in test mode, so real numbers stay clean: send requests with `test: true`, or set the browser tab's `sessionStorage` key `madeThatWay.testMode` to `1`.
- Delete `.localdb` after local testing.
- Never write the builder password anywhere; grep for it before committing.
- Content must pass `npm run check:content`, and every fact needs two sources in `SOURCES.md`.
