# Later

Agreed, parked, or waiting on a decision. Nothing here is being built right now.

Last updated 20 September 2026.

## Next up

- **The UX research PDF.** The writing is done in [ux-research.md](ux-research.md): quiz and trivia apps studied, wild ideas, the frameworks, the insights, a ranked feature list, and three persona prompts. Turning it into a PDF is the next round's job. **Remind the owner about this.**
- **The three persona prompts** (non-designer, beginner, ten-year veteran). Written, in the same file. Still to settle: which agent runs them, and how it reaches the quiz.
  - If that agent can open a web page on this machine, it can play at `http://localhost:5173`.
  - If not, I'll produce a "player pack" (every question and its options, no answers) and a separate answer key, so it can play blind and be scored afterwards.

## Decisions waiting on you

- **A "hardest quiz" made of the questions fewest people get right.** Worth doing, with two changes. As proposed, the same ten questions would face everyone, so they'd be memorised and shared, and a second attempt would mean nothing. Instead: **Hard mode** draws ten at random from the hardest third, so it stays different every time. It needs a minimum number of answers per question before difficulty means anything (say 30), so it should stay hidden until the numbers arrive. Two open questions: should hard runs sit on the same leaderboard as normal ones, and should the home screen show the invitation ("only 14% get these right") or keep it quieter?
- **Leaderboard names.** Links, handles and a short list of swear words are refused, and the Players tab can hide anyone. Nothing else is moderated.
- **Redeem points.** Still a quarter of the band.

## Not built, on purpose

- **CAPTCHA.** The cheaper defences went in instead (registered runs, limits per network, strict checks). Cloudflare Turnstile is the fallback if real abuse shows up; it needs an account.
- **Accounts.** Streaks, best scores and names live on the device. A new browser starts fresh. Accounts would fix that and are a much bigger change.
- **Editing topics in the builder.** Topics are data in the database, so adding one is a data change; there's no screen for it yet.
- **Reading the question aloud, sharing a result card, a weekly digest email.** Ideas from the research, not agreed.
