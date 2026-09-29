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

## Current state (30 September)

- **Round 12 built:** difficulty tiers and the level plan, the Legend finale at level 6, the feedback form, suggested questions, the new home page and copy, names and profiles, and the builder's tier tabs, bulk pictures, Suggestions and Feedback tabs. **Still to do:** logo sketches, shorter wording for every question (for the owner to approve in the builder), and 20 new questions (five for the daily queue, which runs out after 2 October). Status by item: `docs/brief-map.md`.
- **The bank is short of easy pictures:** reaching level 6 needs 18 easy questions with pictures; about 10 have one. The builder's Questions tab shows this per tier. Pictures wanted: `images/IMAGES-NEEDED.md`.

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
