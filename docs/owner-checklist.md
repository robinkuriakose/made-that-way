# What I need from you

Everything here is something only you can supply or do. I keep it current; tick things off by telling me, and I'll move them to "Done".

Last updated 1 October 2026.

## Live

The site is live at https://madethatway.vercel.app (21 September 2026): database connected, builder password set, every route checked end to end.

- [ ] **Pictures for the 20 newest questions,** the five daily ones first (they go out from 8 October, and won't go out without one). Add them right from each card in the builder, or drop them in `images/`. What each should show: `images/IMAGES-NEEDED.md`.
- [ ] **Photos for 2 questions still showing my drawings:** rumble strips (grooves along the lane edge) and runway numbers (a plain runway end, no labels).
- [ ] **Try an image upload in the builder,** on any question, or several at once with "Add pictures" in the Questions tab. It's the one thing I couldn't check on the live site without signing in as you.
- [ ] **Optional: a custom domain,** under Settings, Domains in Vercel.

## Content

- [ ] **Pick the final logo.** A placeholder (the keycap) is live everywhere; the three sketches are in `docs/logo/sketches.html`. Swapping it means changing `src/components/Logo.jsx` and running `node scripts/brand-assets.js`.
- [ ] **Review the shorter wording** in the builder's Rewrites tab (77 questions): use it, edit it first, or keep the old one.
- [ ] **Review the 15 new questions** in New questions (1 October batch), and the 5 new daily ones in the Daily tab.
- [ ] **Where the lift mirror photo came from,** for its credit line.
- [ ] **Keep the daily queue topped up.** The tab warns you when fewer than three are left. Tell me when you want another batch written.
- [ ] **CEED papers and answer keys** (PDFs). I'll write the reasoning for each answer and put them through the review queue.
- [ ] **Credit lines for about 80 images:** photographer or source, and licence, for each. Several are brand, museum or stock photos, which usually aren't free to reuse, and two look AI-generated. There's now a Credit box on each card in the builder.
- [ ] **A better picture for shinkansen-nose:** it shows an E4 series train, not the 500 series the question is about.
- [ ] **Sharper versions of 3 images:** qwerty, calculator-keypad, rubber-band-scroll.
- [ ] **Raise the last level from 6 to 10?** The bank now has enough pictured questions for it.

## Decisions waiting on you

- [ ] The open items in [docs/later.md](later.md): the hard mode design, which agent runs the persona prompts, name moderation, redeem points.

## Done

- [x] 51 photos sent (1 October): 47 published, including replacements for menu-ellipsis, manhole-round, jerrycan-handles and the two watermarked stand-ins.
- [x] The round 12 questions reviewed: 18 accepted.

- [x] Blob store connected (30 September).
- [x] Round 12 answers: difficulty plan, the finale at level 6 for now, the copy, the home page (30 September).

- [x] Deployed to Vercel, with Neon Postgres, Blob storage and the builder password (21 September).

- [x] GitHub repository created, and the code pushed to it (21 September).
- [x] Vercel account, signed in with GitHub.

- [x] Builder password chosen. Kept only in the gitignored `.env.local` locally, and in Vercel's settings once deployed; never in the repository.
- [x] 39 images sent (38 used, 2 of them local only).
- [x] Indian and everyday question candidates approved, except dabbawala.
- [x] 11 of the 16 new questions accepted; the other 5 are waiting for you above.
