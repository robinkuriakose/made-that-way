# What I need from you

Everything here is something only you can supply or do. I keep it current; tick things off by telling me, and I'll move them to "Done".

Last updated 20 September 2026.

## Live

The site is live at https://madethatway.vercel.app (21 September 2026): database connected, builder password set, every route checked end to end.

- [ ] **Try an image upload in the builder,** on any question. It's the one thing I couldn't check without signing in as you, and it proves the Blob store is connected.
- [ ] **Optional: a custom domain,** under Settings, Domains in Vercel.

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

- [x] Deployed to Vercel, with Neon Postgres, Blob storage and the builder password (21 September).

- [x] GitHub repository created, and the code pushed to it (21 September).
- [x] Vercel account, signed in with GitHub.

- [x] Builder password chosen. Kept only in the gitignored `.env.local` locally, and in Vercel's settings once deployed; never in the repository.
- [x] 39 images sent (38 used, 2 of them local only).
- [x] Indian and everyday question candidates approved, except dabbawala.
- [x] 11 of the 16 new questions accepted; the other 5 are waiting for you above.
