# What I need from you

Everything here is something only you can supply or do. I keep it current; tick things off by telling me, and I'll move them to "Done".

Last updated 20 September 2026.

## To go live

These are account steps, so they're yours. The README's "Deploying to Vercel" section walks through each one.

- [ ] **Git name and email.** Git needs them before the first commit. Tell me the name and email you want on commits, or set them yourself with `git config --global user.name "…"` and `git config --global user.email "…"`.
- [ ] **GitHub.** Make a new, empty repository and sign in on this machine (the GitHub Desktop app is the easiest way), so the code can be pushed. You said "Git later", so this waits for you.
- [ ] **Vercel.** Import the GitHub repository as a new project.
- [ ] **Postgres.** In the Vercel project, open Storage, add a Neon Postgres database and connect it. This holds questions, runs, the leaderboard, flags and the daily question. Tables are created and filled on the first visit.
- [ ] **Blob storage.** In the same Storage tab, add a Blob store and connect it. This is where images you upload in the builder are kept. Without it everything else works, but the builder's image upload says it isn't set up.
- [ ] **Builder password.** In Settings, Environment Variables, add `BUILDER_PASSWORD` with the password you chose. Once the site is public, a longer one is safer, since anyone can find `/builder`; sign-in now locks a network out after five wrong tries.
- [ ] **Redeploy** after the steps above, so the new settings take effect.

## Content

- [ ] **Review the 5 questions still waiting** at `/builder`, under New questions: plane window hole, pressure cooker whistle, rupee tactile marks, safety match, toothpaste marks.
- [ ] **Check the 5 daily questions** in the Daily tab before they go out, one a day, in the order shown. The Rapido one carries a new "Deduction" label, because Rapido has never published its own reasoning.
- [ ] **Keep the daily queue topped up.** The tab warns you when fewer than three are left. Tell me when you want another batch written.
- [ ] **CEED papers and answer keys** (PDFs). I'll write the reasoning for each answer and put them through the review queue.
- [ ] **Credit lines for 38 images:** photographer or source, and licence, for each. Several look like brand or museum photos, which usually aren't free to reuse. List in `docs/images-needed.md`.
- [ ] **Replacements for 2 watermarked images** (cursor-tilt, stop-sign-octagon). They show only when running locally and never on the live site.
- [ ] **Better versions of 2 images** whose subject is wrong: menu-ellipsis (an icon chart rather than a menu) and shinkansen-nose (an E4 series train, not the 500 series the question is about). They are live, with alt text that says what they really show.
- [ ] **Sharper versions of 4 images:** qwerty, calculator-keypad, manhole-round, rubber-band-scroll.
- [ ] **12 images still missing** for live questions, and 16 for the questions waiting for review. Details in `docs/images-needed.md`.

## Decisions waiting on you

- [ ] The open items in [docs/later.md](later.md): the hard mode design, which agent runs the persona prompts, name moderation, redeem points.

## Done

- [x] Builder password chosen. Kept only in the gitignored `.env.local` locally, and in Vercel's settings once deployed; never in the repository.
- [x] 39 images sent (38 used, 2 of them local only).
- [x] Indian and everyday question candidates approved, except dabbawala.
- [x] 11 of the 16 new questions accepted; the other 5 are waiting for you above.
