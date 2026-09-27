# V2 plan

From the test group (27 September 2026): developers and some product designers, average score 50%.

Status: **built** (27 September 2026). Where each piece lives: the V2 section of `docs/brief-map.md`.

## What they said, and what V2 does about it

| They said | V2 |
|---|---|
| What is this for? The home screen says too much | The promise, Start and today's question above the fold. Everything else below |
| Tired by questions 5 to 7 | Levels of 5 questions. After each level, a short break: the running score, what you earned, a clue for the next level, "Level 2". The run carries on as long as your lives do |
| No reason to play again | A running score across levels, combos, level-ups, badges, a collection of the whys you've uncovered, and a weekly board that starts again every Monday |
| Text-only questions are tiring | Runs use only questions with a picture |
| Didn't understand the timer | No timer at all (your call). Points come from right answers, combos and levels |
| Some read the reasons, few reacted | The reason appears right after each answer, short, with "Read more", and how many players get it right |
| 50% average | Easier questions come first, measured from real answers, so people build momentum |

## Your answers

1. **When does the endless run end?** 3 lives. A redeem wins a life back, and each level cleared adds one (5 at most).
2. **What makes a level different?** Each is worth more (x1, x1.2, x1.5, x2, x2.5, x3) and draws on harder questions.
3. **Rewards:** combo, level-up moment, whys collection, 4 badges (first level, perfect level, 3 day streak, 50 whys). No coins or shop.
4. **Timer:** no. None at all.
5. **Leaderboard:** weekly only, resetting Monday; your best shown only to you.
6. **Tidbits:** at the level break, as a clue for a question in the next level.
7. **The promise:** people who question design themselves, see the flaw, know the fix, and build better in the age of AI. On the home screen as "Everything is designed. Learn to see the thinking."

## Calls I made while building (easy to change)

- **A redeem after every wrong answer.** Simulated with difficulty rising each level: a player at 50% lasts about 17 questions (level 4), at 60% about 29. Allowing one redeem per level would halve that.
- **Returning players get questions they haven't seen first**, then their topics, then the easiest. Repeats come last, so a regular player isn't scored on memory.
- **Topics come first rather than filter.** With 38 picture questions, a filter would leave some runs with two levels.
- **The short reason is one sentence, or two** when the first only sets up the problem (most explanations open with the problem and follow with the fix).
- **The week resets at midnight Monday, India time**, the same moment for everyone.

## What V2 shows us next

- **The bank is small for an endless run.** 38 picture questions: most players at 70% or better will see all of them. More picture questions are the biggest lever now.
- **Principles on every question** (see `docs/later.md`) would carry the promise into the game itself.
