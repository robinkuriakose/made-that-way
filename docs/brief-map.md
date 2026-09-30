# Brief map

Every instruction given for this project, what became of it, and where it lives in the code. Use it to point at a requirement ("change the redeem share") and go straight to the file. Line numbers follow `file:line`; if one has drifted, search for the function name, and see [code-map.md](code-map.md) for the full layout.

Status: **Done**, **Changed** (done differently from the original ask, with the reason), **Waiting** (needs something from you), **Open** (a decision for you).

```mermaid
mindmap
  root((Brief))
    Run
      10 questions
      45 second timer
      Scoring bands
      One hint, 10 seconds
      Myth buster at most one
      Topics balanced and mixed
    Wrong answers
      Redeem with related questions
      Tidbits after three misses
    End of run
      Review every answer
      Sign your score
      Leaderboard
    Content
      Question fields
      Two sources each
      Even option lengths
      Keypad fixes
      More interface questions
      Images in a fixed frame
      Indian and everyday objects
      Flag a question
    Builder at /builder
      Password protected
      Add, edit, hide questions
      Image upload
      Review queue with feedback
      Flags from players
      Analytics
    Look and feel
      Minimal and restrained
      Poppins throughout
      No card grids
    Working rules
      Push back and ask
      Structured answers
      Suggest features
      Mind maps
      Owner checklist
    Round 8
      Shuffled options
      Question changes on return
      Topics and daily question
      Test mode
      Bot protection
      Home screen
    Later
      UX research PDF
      Hardest quiz
      Persona prompts
    V2
      Levels of five, three lives
      No clock
      Combos and rising levels
      Reason right after each answer
      Picture questions only
      Whys collection and badges
      Weekly board
      Design thinking promise
    Cloud hosting
      Vercel deployment
      Shared database
      Leaderboard and analytics online
      Personal best per device
      Score verification
```

## Round 14 (1 October 2026): pictures, the deck, review tools, 20 more questions

| You asked for | Status | Where |
|---|---|---|
| Publish the images I added | Done: 47 photos published and attached, 17 of them replacing my drawings. Kept my drawings for rumble strips (the photo shows painted bars across the road, not edge grooves) and runway numbers (its label gives the answer away); trolley coin lock had no photo. Two local-only placeholders (cursor tilt, stop sign) are replaced with your photos. Credit lines are still owed | `src/data/site-images.json`, `public/images/`, `server/schema.js` (attach), `images/IMAGES-NEEDED.md` |
| After a swipe, the card lingers at the far end | Fixed: the way back starts before the way out has slowed, and the rise and shrink run as one move, so it turns around within about 50 ms instead of hanging there | `src/components/HeroDeck.jsx` (`throwTop`) |
| "Another one" on the open card should flip it to the next question | Done: the window turns edge on, swaps to the next card's question out of sight, and turns back; the pile moves on underneath, so closing lands on that card. Focus stays on the button | `src/components/HeroDeck.jsx` (`FlipDialog`, `nextWhileOpen`) |
| More questions like Heinz and the eraser, tagged easy, medium or hard, and attach the picture from the review screen | Done: 20 more (12 easy, 6 medium, 2 hard), two sources each. Five join the daily queue after 7 October, fifteen wait in New questions. Each card there (and in the Daily tab) now shows its difficulty, which you can switch, and its picture, which you can add by choosing a file or dropping one on, with its description and credit, plus a note on what the picture should show. A daily question without a picture now waits instead of going out bare | `src/data/daily-questions.json`, `src/data/pending-questions.json`, `SOURCES.md` (O1 to O20), `src/builder/QuestionTools.jsx`, `server/routes/daily.js` |
| How to make it something people love and share | Suggestions given in chat; waiting for your call on what to build first | |

## Round 13 (30 September 2026): the hero deck

| You asked for | Status | Where |
|---|---|---|
| The hero pictures as a card stack: swipe either way and the card behind comes forward while a new one arrives; tap for a 3D flip that opens into the window; Awwwards-level motion; remove the scrolling row; no more side drawer | Done with GSAP (free for commercial use since 2025; core only, about 31 KB gzipped). Revised the same day: a swiped card now goes to the back of the pile instead of flying off, and the counter and arrow buttons are gone (only the hint line stays). A pile of 24 cards dealt in from below; the top one follows your finger or mouse with a lag and a turn, the cards behind lean in as it goes, and a throw carries its speed. Tap flips it in 3D, lifting towards you as it turns, growing into a centred window over a blurred page: the picture, the question, "Play this one" and "Another one" (which flips it back and sends it away). The picture row and the side sheet are gone. Keyboard (arrow keys, Enter, Escape) and less-motion settings are covered | `src/components/HeroDeck.jsx`, `src/components/HomeScreen.jsx`, `src/styles.css` (hero deck) |

## Round 12 (30 September 2026): difficulty, the finale, copy, home, profile, builder, 20 more questions

| You asked for | Status | Where |
|---|---|---|
| Easy, medium and hard tags (internal) that shape the levels; my opinion on the level mix | Done. Every question carries a tier (26 easy, 36 medium, 17 hard). Levels 1 to 3 take 4 easy and 1 medium, 4 to 7 take 2/2/1, 8 to 12 take 1/1/3, 13 to 15 take 1 medium and 4 hard; a tier that runs out borrows from the nearest one. The plan is a data file, so moving the last level is one edit. A tier that doesn't match how players do (after 10 answers) is flagged in the builder, never changed | `src/data/level-plan.json`, `src/lib/levels.js` (`mixFor`, `buildLevel`, `tierMismatch`) |
| Level 15 as the final level, with a big reward: a trophy, a legends board signed by drawing | Built with level 6 as the last level for now (the bank can't fill 15 yet): lights, a trophy made of the run's own pictures, then signing the Legends wall by drawing. The server checks the run cleared every level before it goes on the wall. Legends show on the home page with score and time. Then a feedback form and "more levels are on the way". Bronze medal at level 5. Life rules unchanged, per the owner | `src/components/LegendFinale.jsx`, `src/components/SignaturePad.jsx`, `src/components/LegendsWall.jsx`, `server/routes/player/legends.js` |
| A feedback form after the last level: question quality, pictures, what to add, more | Done: three star ratings (overall, questions, pictures), what to add more of (8 kinds), would you tell a friend, and a note. Also reachable from the profile and the end screen. Results in the builder's Feedback tab | `src/components/FeedbackForm.jsx`, `src/lib/feedbackForm.js`, `src/builder/FeedbackPanel.jsx` |
| Players suggest questions: a one-liner, or a whole question with options, hint, picture and source; their name at the end, or "Be mysterious" | Done. Reachable from the profile. In the builder's Suggestions tab, "Make it a question" opens the form filled in and credited to the player | `src/components/SuggestScreen.jsx`, `server/routes/player/suggest.js`, `src/builder/SuggestionsPanel.jsx` |
| Pictures for every easy and medium question, and every daily question: the list and file names | Done: 35 new and 7 replacements still wanted (spoilers are fine, per the owner). Pictures in `images/` ship with the site and attach to their question; Kadokeshi and the lift mirrors are live that way | `images/IMAGES-NEEDED.md`, `src/data/site-images.json` |
| Shorter questions and answers (under 15 words; options short; reasons can stay long) | Ready for your review: shorter wording for 77 of the 79 questions (Kadokeshi and the lift mirrors were already short) in the builder's new Rewrites tab, now and proposed side by side. Questions go from 13.5 words on average to 10.7 (none over 14); options from 12.3 to 8.1 (none over 10). Options keep their order and meaning, so every explanation still fits. One proposal also swaps a wrong option on winglets that was partly true. The content check now warns over 14 words in a question and over 10 in an option | `src/data/question-edits.json`, `src/builder/RewritesPanel.jsx`, `src/lib/questionRules.js` (`MAX_STEM_WORDS`, `MAX_OPTION_WORDS`) |
| A more visual home page, with more space | Done: a stack of three pictures beside the headline, one button, the wall of whys, how it works in three pictures, the Legends wall. Today's question folds to one line once answered | `src/components/HomeScreen.jsx`, `src/components/DailyCard.jsx` |
| New home copy | Done: "You've seen it a thousand times. Let's ask why.", a short conversational line, "Let's start", and the note under the button | `src/components/HomeScreen.jsx` |
| The name top right ("Call me ___ ✎"), random starting names, a profile with run stats but never the questions | Done. Everyone starts as a name like fuzzyheron42; the name opens the profile (best level and score, share right, per-level bars, last 10 runs, badges, suggestions sent), the pencil renames | `src/components/NameTag.jsx`, `src/components/ProfileScreen.jsx`, `server/routes/player/profile.js` |
| Logo | Sketched: three directions (the F key with its bump, a pen loop round "that", a woven "Made That Way" label), each full size, as the small mark on light and dark, at favicon size and in the top bar. My pick is the bump. Waiting for yours | `docs/logo/sketches.html` |
| Builder: difficulty toggle, image upload, remote bulk upload, rethink for the new changes | Done. Questions sit in Easy / Medium / Hard tabs, newest first, with a tier switch on each; how each tier stands against the level plan sits on top; "Add pictures" takes many files at once from any device (file name = question id). Upload works now that Blob is connected. New tabs: Suggestions and Feedback; the Legends wall with signatures sits under Players | `src/builder/QuestionList.jsx`, `src/builder/QuestionForm.jsx`, `src/builder/BuilderApp.jsx` |
| 20 more questions like the daily five | Done: 13 easy, 5 medium, 2 hard, each with a drawn picture of the detail and two sources. Five join the daily queue for 3 to 7 October (pizza box table, card before cash, the loose tape measure hook, cracker holes, the mirror's night tab); fifteen wait in New questions. Once the ten easy ones are accepted there are enough easy pictured questions to reach level 6 | `src/data/daily-questions.json`, `src/data/pending-questions.json`, `SOURCES.md` (R12-1 to R12-20) |

## Round 11 (28 September 2026): the picture strip

| You asked for | Status | Where |
|---|---|---|
| The pictures that reveal a question: text runs out, people try to swipe and can't, it's uninviting. Rethink it (go with B, flip cards, but open them as a modal or by resizing; think of more ways, question them, build the best) | Done. Weighed six ways of opening a picture: flip in place (text never fits), widen the card (thin text column, fights swiping), grow it downwards or a shared caption (jumps, or permanent text), text over the picture (hides the hook), and a sheet like a photo gallery. Built the sheet: the row swipes by hand and never moves on its own, bigger pictures with only a "Why?" tag, arrows on a computer. Tapping opens the picture big with its question and "Play this one", which starts a run with that question first (Undo if a run was going), and "Another one". The row now sits under today's question, and shows questions not seen yet first | `src/components/WallOfWhys.jsx`, `src/components/WhyPreview.jsx`, `src/lib/levels.js` (`firstId`), `src/App.jsx` (`restartRun`) |

## Round 10 (28 September 2026): aha questions, home copy, mobile hierarchy

| You asked for | Status | Where |
|---|---|---|
| Write the other options for your five questions (ruler, Heinz, progress bars, Kadokeshi, lift mirrors) | Done: three tempting wrong options each, explanations for every option, hints, two sources each. None of the wrong options is also a real reason. Two wordings changed for accuracy: the Heinz border was a 2023 campaign in Turkey, and the famous lift mirrors were where people waited | `src/data/daily-questions.json`, `SOURCES.md` (D6 to D10) |
| These five as the daily question for the next five days | Done: the live queue was empty, so they go out in order from today. The ruler and the progress bar have illustrations drawn for them; the other three need pictures uploaded in the builder before their day | `src/data/daily-questions.json`, `docs/images-needed.md` |
| Understand what kind of questions these are; rethink the strategy | Done as a recipe (six tests), an audit of the 64 live questions (48 aha, 4 to rewrite, 12 story questions you can't work out) and a list of ideas for the next batch. Principles on every question dropped | `docs/question-strategy.md` |
| Daily questions join the pool once they're done | Done: once its day has passed everywhere, a daily question is served with the run questions, with its answer rate from the daily card already counted. Without a picture it can only be a redeem choice, not a level question | `server/routes/questions.js`, `server/routes/daily.js`, `server/schema.js` (v10) |
| The home copy: welcoming, strong, curious | Rewritten: "You've seen it a thousand times. Ever wondered why?", three real examples from the game, "Start guessing", and "Quick picture questions. No clock, no sign-up." | `src/components/HomeScreen.jsx` |
| Redeem after every wrong answer | Kept | `src/App.jsx` (`canRedeem`) |
| Take care of the hierarchy, especially on mobile | Done for the answered question: the right answer and yours lead and the other two shrink to a line; the result and the reason follow; one action bar with one leading choice (Win it back, or Next) is pinned to the bottom of a phone screen; flagging moved into the reason card | `src/components/QuestionScreen.jsx`, `src/styles.css` |

## V2 (27 September 2026): the test group's feedback

The test group (mostly developers, some product designers, 50% average) didn't see the point, tired by questions 5 to 7, saw no reason to play again, and found text-only questions tiring. Plan and your answers: `docs/v2-plan.md`.

| You asked for | Status | Where |
|---|---|---|
| Runs of 5, then "Level 2", with the score carried on like an endless run | Done. Five questions make a level; a break between levels shows the running score, what the level earned and a clue for the next one. The run carries on until the lives run out, the player stops at a break, or the questions run out | `src/lib/scoring.js` (`LEVEL_SIZE`, `replay`), `src/App.jsx` (`next`, `openBreak`), `src/components/LevelBreak.jsx` |
| An ending for the endless run (my pushback, agreed) | Done: 3 lives. A wrong answer costs one, a right redeem wins it back, and each level cleared adds one (5 at most). Simulated: a player at 50% lasts about 17 questions (level 4); at 70%, most see every picture question | `src/lib/scoring.js` (`START_LIVES`, `MAX_LIVES`), `src/components/Hearts.jsx` |
| Levels worth more, and slightly harder | Done: x1, x1.2, x1.5, x2, x2.5, then x3. Easier questions come first, measured by how often real players get each one right, so later levels get harder by themselves | `src/lib/scoring.js` (`levelMultiplier`), `src/lib/levels.js` (`buildLevel`, `easeOf`), `server/schema.js` (`question_stats`) |
| Timer: "no" | Done: no clock at all. Points come from right answers, combos and levels. A hint halves the points | `src/lib/scoring.js` (`pointsFor`) |
| Rewards: combo, level-up moment, whys collection, 4 badges; no coins | Done. Combo x1.5 from 3 in a row, x2 from 5. Level-up burst, +1 life, perfect level. Every question answered adds its reason to your collection. Badges: first level, perfect level, 3 day streak, 50 whys | `src/lib/rewards.js`, `src/components/WhysScreen.jsx`, `src/components/LevelBreak.jsx` |
| Micro-interactions and delight | Done: points pop up, the score counts up, hearts drop and refill, a wrong answer shakes, the right one glows, a burst at each level. All still for people who ask their device for less motion | `src/styles.css` (V2 section), `src/components/CountUp.jsx`, `src/components/Burst.jsx` |
| Weekly leaderboard, resetting Monday; all-time best private | Done: the board starts again at midnight on Monday, India time, for everyone. Your best shows only to you, on the home screen | `src/lib/week.js`, `server/routes/leaderboard.js` (`board`), `src/components/Leaderboard.jsx` |
| Tidbits at the level break | Done: each break shows a clue for a question in the level about to start, so what you read, you use | `src/lib/levels.js` (`buildLevel`, `withTidbit`), `src/components/LevelBreak.jsx` |
| The reason right after each answer, one line and "read more" | Done: the short reason (the first sentence, or two when the first only sets up the problem) under every answer, with how many players get it right once ten have answered. On a phone it scrolls into view | `src/components/QuestionScreen.jsx` (`Reason`), `src/lib/text.js` (`firstSentence`) |
| Home: only the promise, Start and today's question above the fold | Done. Returning players also get one line: best, whys, streak, badges. How it works, the board, the wall, name and topics sit below | `src/components/HomeScreen.jsx` |
| The promise: people who question design themselves, spot the flaw, know the fix, build better with AI | Done as "Everything is designed. Learn to see the thinking." Replaced in round 10: the aha questions carry the thinking, and the home copy leads with curiosity | `src/components/HomeScreen.jsx`, `docs/question-strategy.md` |
| Picture questions only in runs | Done: levels play from questions with a picture (38 on the live site). Redeems prefer text questions, so the levels last longer | `src/App.jsx` (`levelPool`), `src/lib/redeem.js` (`keepIds`) |
| Topics | Changed: with 38 picture questions, filtering by topic would leave too few for an endless run, so your topics now come first instead of being the only ones | `src/lib/levels.js` (`buildLevel`) |
| (Bot protection, carried over) | Kept, and tightened for longer runs: a run needs at least 2 seconds an answer to be verified, and redeems are checked against the real question too | `server/routes/sessions.js`, `src/lib/verifySession.js` |

## Round 9 requests (20 and 21 September 2026)

| You asked for | Status | Where |
|---|---|---|
| No spoiler control on images: the goal is to make people guess and learn | Done: images always show with the question; the switch is gone | `src/components/QuestionScreen.jsx` |
| Mark the Rapido question as a deduction | Done: a new confidence level, Deduction ("nobody has published the reason; this is the best explanation the evidence supports") | `src/lib/labels.js`, `src/lib/questionRules.js` |
| Hard mode only once 20 people have finished a run | Agreed; to be built before the live site reaches 20 finished runs | `docs/later.md` |
| Present the research PDF | Done, and `npm run pdf` now makes a PDF from any document | `docs/made-that-way-ux-research.pdf`, `scripts/md-to-pdf.js` |
| Host the site | Done: https://madethatway.vercel.app. You made the accounts, repo and storage; I pushed the code and fixed what the live environment showed | `vercel.json`, `server/db.js` |
| (Found going live) | Every function crashed on load because this deployment predated the database connection. The connection is now made on first use, a missing database or password answers with a plain reason instead of crashing, and the database and Blob store are found even when Vercel prefixes their variable names | `server/db.js`, `server/http.js`, `server/auth.js` |

| "That run isn't known here" when signing; any name should show, and a "test" name should go after two minutes | Fixed. My bug: the queue that sends "run started" and "run finished" could jam for good after tidying an empty queue, which answering the daily question, signing and flagging all do. The next run on that page never reached the server. Now fixed and tested on the live site: daily question answered, then two runs in the same page, signed as "test" and as another name, both shown, both gone two minutes later. A run caught by the bug before the fix can't be signed (its timing can't be checked), but every new run works | `src/lib/outbox.js`, `src/lib/outbox.test.js` |

## Round 8 requests (20 September 2026)

| You asked for | Status | Where |
|---|---|---|
| Leaving and coming back should change the question, not restart its clock | Done. Leave at a question you haven't answered and you get a different one at that place when you return, so there's no point looking the answer up | `src/App.jsx` (`resumeRun`), `src/lib/levels.js` (`replacementFor`) |
| Shuffle the answers; they were always in the same place | Done. Every run shuffles each question's four options, and the daily question shuffles per device and day. Answers are still stored in the question's own order, so scoring, flags and analytics are unaffected | `src/lib/shuffle.js`, used in `src/App.jsx:310` |
| Go back or leave from a question, and Restart | Done: "‹ Home" and "Restart" sit quietly in the top bar, and the phone's Back button now goes home instead of leaving the site. No "are you sure?": Restart offers Undo for ten seconds instead | `src/components/TopBar.jsx`, `src/App.jsx:213` (`goHome`), `:248` (`restartRun`) |
| Fewer topics; several had under 5 questions | Done: 8 topics, each with 8 to 18 live questions. Every question carries its topics, so nothing in the code changes when you add more | `src/data/themes.json`, `src/lib/themes.js` |
| Don't make the player think: no question counts in the picker | Done. Pick at least 3 and nothing else is asked. In V2 your topics come first rather than being the only ones | `src/components/TopicPicker.jsx`, `src/lib/levels.js` (`buildLevel`) |
| Accept all but the last 5 in the queue | Done: 11 accepted (auto-rickshaw, chips packet, side mirror, fan regulator, pencil, plug, jaali, LPG, matka, middle berth, padlock). Still waiting: plane window hole, pressure cooker, rupee marks, safety match, toothpaste marks | `src/data/questions.json`, `src/data/pending-questions.json` |
| A daily question, with the points from round 7, plus the next five days written | Done. One a day for everyone, from a queue you manage; it never repeats and never appears in runs; no timer or points; a streak and an average; days with no question never break a streak; the server checks the answer | `server/routes/daily.js`, `src/components/DailyCard.jsx`, `src/data/daily-questions.json` |
| Recent design questions, using the companies' own reasons | Done: Apple's Liquid Glass, Rapido's "captains turned it down" count, the Swiss passport's UV layers, Duolingo swapping hearts for energy, Google's 2026 icon colours. Rapido never published its reasoning, so that one carries a new "Deduction" confidence label and says so in the answer | `src/data/daily-questions.json`, `SOURCES.md` |
| Test mode in the builder, kept separate, since showing the app to people on your phone is real data | Done: "Play in test mode" opens the quiz with its own device id, name, run and storage; everything it writes is marked as a test. The analytics dashboard has a Players / Test runs switch. The "test" name rule still applies for anyone else's device | `src/lib/testMode.js`, `server/schema.js`, `src/builder/Analytics.jsx` |
| Overview analytics with good UX for an admin | Done: period and Players/Test switches, headline numbers with the change from the period before, activity, funnel, where runs are abandoned, score spread, hardest and easiest questions, topics, when people play, the daily question, and export | `src/builder/Analytics.jsx`, `server/routes/builder/analytics.js` |
| Prefer the alternatives to a CAPTCHA | Done: every run registers with the server when it starts, and saving, flagging and signing all require it; limits per network; strict size and shape checks; names refuse links and swear words; a Players tab to hide a name | `server/routes/events.js`, `server/limits.js`, `src/lib/names.js`, `src/builder/PlayersPanel.jsx` |
| The name on the home screen, changeable, limited to 3 changes | Done. Changing it renames you on every board | `src/components/PlayerName.jsx`, `server/routes/leaderboard.js:186` |
| Images: remove area-codes, keep the rest | Done. The other four are attached; the two watermarked ones are marked as placeholders, so they show locally and never reach the live site | `docs/images-needed.md`, `scripts/optimize-images.js` |
| Show the images in the questions too | Done: the picture sits under the question, in the same frame every time. (A "show after answering" switch was added, then removed in round 9: seeing it is part of working it out) | `src/components/QuestionScreen.jsx:169`, `src/builder/ImageField.jsx` |
| Build as groundwork for a much bigger app | Ongoing rule. This round: routes split into `api/` entry points and `server/` logic, one function for the whole builder, analytics worked out in the database rather than by loading every run, topics and the daily queue as data, and a test flag on every table | `docs/code-map.md` |
| Suggest a "hardest quiz" made of the least-answered-right questions | Open: my answer and a safer shape for it are in `docs/later.md` | |
| The UX research PDF | Content this round, PDF next. Reminder carried in `docs/later.md` | |

## Round 7 requests (19 September 2026, evening)

| You asked for | Status | Where |
|---|---|---|
| Update the mind maps with code details and chat history, then compact | Done | This file, `code-map.md` |
| Sort out the API error | It wasn't the app. My previous turn was cut off by the chat service ("This request would exceed your account's rate limit"), halfway through testing the builder. That testing is picked up and finished this round | |
| There are no topics in the analytics section | Fixed: every topic is listed, even with no plays yet, so the section is never empty. Also shows each topic's live question count | `src/builder/Analytics.jsx` |
| (Found while finishing the testing) | Fixed: the 5 unusable images were still being copied into `public/`, which is published, including a Getty-watermarked one; they're now held back. Selected radio buttons showed a square ring that looked like a checkbox. The review queue said "feedback I haven't acted on" and now says "waiting for a revision" | `scripts/optimize-images.js` (`HELD_BACK`), `src/styles.css:405`, `src/builder/ReviewQueue.jsx` |
| Choose topics: a button on the start screen opens a window of topic pills, pick at least 3, the run uses only those | Done in round 8 | `src/components/TopicPicker.jsx` |
| Restart the quiz or go back from the question screen | Done in round 8 | `src/components/TopBar.jsx`, `src/App.jsx` |
| UX ideas without limits, distilled with frameworks; study trivia and quiz apps; play as a non designer, a beginner and a 10 year veteran and report scores; changes per persona | Content being written; the PDF comes next round (`docs/later.md`) | |
| Overview analytics, beyond per topic and per question, and the data points behind them | Done in round 8 | `src/builder/Analytics.jsx` |
| A daily question that never repeats and never appears in normal runs; a streak for answering daily; show the player's average correct score | Done in round 8 | `server/routes/daily.js`, `src/components/DailyCard.jsx` |

## Round 6 requests (19 September 2026, afternoon): your answers

| You asked for | Status | Where |
|---|---|---|
| 40 images uploaded, mixed formats (AVIF, WEBP, GIF) | Done for 34 of 39 files found. All converted to WebP, max 1600 px wide, GIFs kept animated. 5 not attached: 3 show the wrong subject, 2 are watermarked stock. Every image still needs a credit line | `images/` to `public/images/` via `scripts/optimize-images.js`; list in `docs/images-needed.md` |
| Images in a container of fixed height, so questions don't jump around | Done: every image sits in the same box and is scaled to fit | `src/components/ImageFrame.jsx`, `src/styles.css:759` |
| Pushback 1, password in an env var | Done: `BUILDER_PASSWORD`, never in the code | `api/_auth.js` |
| Pushback 2, use the bundled questions if the database doesn't answer in 3 s; "is there a better way?" | Done, with three additions: the fetch starts when the page opens, not on Start, so it's usually done before anyone taps; the last live bank this device saw is kept and used before the bundled copy; and each run keeps its own copy of its questions, so an edit mid-run can't break it | `src/lib/questionBank.js`, `src/App.jsx:126`, `:154` |
| Pushback 3, "don't understand this" | Explained: no decision needed. Uploaded images need a place to live, and Vercel Blob is one more thing to connect in the dashboard. It's on your checklist | `docs/owner-checklist.md` |
| Pushback 4, feedback read through the live API | Done | `api/builder/questions.js` |
| Pushback 5, content checks at write time | Done: the builder form, the API and the script share one set of rules | `src/lib/questionRules.js` |
| Indian candidates approved, except the dabbawala one ("how would a layman deduce?") | Done: dabbawala dropped, 16 new questions in the review queue | `src/data/pending-questions.json` |
| More everyday objects | Done in the same batch: safety match, chips packet, hexagonal pencil, plane window hole, padlock hole, toothpaste marks, convex side mirror, and more | `src/data/pending-questions.json` |
| Rejected questions are not deleted | Done: kept under "Rejected", can be put back | `src/builder/ReviewQueue.jsx` |
| A checklist of what you need to give me | Done | `docs/owner-checklist.md` |
| Flag a question, "what's wrong with this question?", with better copy and UX if possible | Done. Reasons: "My answer should have counted" (only shown if you got it wrong), "More than one option is right", "Something here is factually wrong", "The source link is broken or doesn't back this up", "The question or options are confusing", "Something else" (needs a note). One flag per question per run; it never changes the score; the builder groups flags by question and records the answer the player chose | `src/lib/flags.js`, `src/components/FlagModal.jsx`, `api/flags.js`, `src/builder/FlagsPanel.jsx` |

## Round 5 requests (19 September 2026, midday): the builder

| You asked for | Status | Where |
|---|---|---|
| Push to a new GitHub repo | Deferred by you ("Git later"). `git init` is done; no commits yet | |
| A builder at `/builder`, with the password you chose | Done. The password lives only in the `BUILDER_PASSWORD` env var, never in the repository | `src/main.jsx:10`, `src/builder/BuilderApp.jsx`, `api/_auth.js` |
| Add, edit and hide questions | Done | `src/builder/QuestionForm.jsx`, `src/builder/QuestionList.jsx`, `api/builder/questions.js` |
| On phones, each question as a card, not a table | Done, including analytics | `src/builder/QuestionList.jsx`, `src/builder/Analytics.jsx:32` |
| Image upload with everything else on a question | Done | `src/builder/ImageField.jsx`, `api/builder/upload.js` |
| The list of images needed, in chat | Done in chat; kept in `docs/images-needed.md` | |
| More everyday-object questions, Indian where possible | Done, see round 6 | `src/data/pending-questions.json` |
| CEED papers and answer keys, with reasons written for each | Waiting on the papers | `docs/owner-checklist.md` |
| Structured answers: what I did, what I propose, pushbacks | Standing rule | Working rules below |
| New questions in their own builder section, 10 to 20 per batch, with Accept, Reject or Feedback; feedback tied to that one question only, and I act on it | Done. Feedback is stored on the question's own row, so it can't apply anywhere else | `src/builder/ReviewQueue.jsx`, `api/_schema.js` |
| Pushbacks on the builder before building | Given; you answered them in round 6 | |

## Round 4 requests (19 September 2026, later still)

| You asked for | Status | Where |
|---|---|---|
| Install Git and Node | Done | Git 2.55, Node 24 LTS, via winget |
| Consider Airtable for storage, mapped to a device ID, with a previous-best-score feature; "tell me if there's a better way" | Discussed first, as asked. Recommendation given: keep Postgres (Airtable's free tier has real rate and row limits that Postgres doesn't; the "look at my data visually" appeal is better served by Neon's own dashboard, which needs no new service or secret). You picked "keep Postgres" | See the discussion in this conversation; database choice unchanged from round 3 |
| Does this solve the API route protection problem? | Answered directly: no, a device id or a different database are both orthogonal to that. What actually helps is the server recomputing the score rather than trusting it, which is the score verification item below | |
| Build the personal-best-per-device feature | Done: one leaderboard row per device, holding its best run | `src/lib/device.js` (`getDeviceId`), `src/lib/leaderboard.js` (`isBetterRun`), `api/leaderboard.js` |
| Build score verification, since you chose to do it now | Done: the leaderboard `POST` no longer carries a score at all. The server looks up the already-stored session for that run id and recomputes the score from its per-question answers, checked against the real question bank. A submission that doesn't check out is rejected | `src/lib/verifySession.js`, called from `api/leaderboard.js` |

**What this doesn't close:** `api/sessions.js` still has no access control, so in principle someone could script a fake session (not just a fake score) with a made-up but internally consistent set of answers, then sign that. Verification checks that the numbers are self-consistent and match the real questions; it can't check that a human actually played. Closing that fully means either an access-controlled write to `/api/sessions`, or having the client sign the session with something the server can check was generated during real play, both meaningfully bigger changes I haven't built and would want to talk through first, the same as this round.

## Round 3 request (19 September 2026, later the same day)

| You asked for | Status | Where |
|---|---|---|
| Host on Vercel's free tier, with all data in the cloud, "not a lot so shouldn't be an issue" | Code done; deployment is a set of account-level steps only you can do (creating GitHub/Vercel accounts, connecting a database), given step by step in the README's "Deploying to Vercel" section | `server/routes/`, `vercel.json`, README.md |

**What "all data in the cloud" became, and why:** the leaderboard and the `/dev` analytics now live in a Postgres database (Vercel's Storage tab, backed by Neon, free tier), reached through two serverless functions. Run-in-progress state (which question you're on, so a reload can resume) stays in the browser: there are no accounts, so a "cloud" copy of one person's half-finished run has nothing to sync against, and moving it would add a device-identity system for no benefit. Say if you want that to change.

**Flagged, then addressed in round 4:** neither API route had any access control, and anyone could post a leaderboard entry directly (not just by playing). Round 4 closed the easy version of this: the leaderboard `POST` no longer carries a score, the server derives it from the stored session instead (see round 4 below). `api/sessions.js` itself still has no access control, which is the remaining gap.

**Database choice:** Vercel Postgres (Neon). It's a couple of clicks in the Vercel dashboard, has a generous free tier for this scale of data, and its query ability suits the `/dev` analytics (grouping, averages) better than a plain key-value store would. Nothing in the app code is tied to Postgres specifically beyond the two `api/*.js` files, so switching database providers later only means rewriting those two files.

## Round 2 requests (19 September 2026)

| # | You asked for | Status | Where |
|---|---|---|---|
| 1 | A mind map of the code and a separate one of your instructions | Done | `docs/code-map.md`, this file |
| 2 | Replace typed redeem: 3 related questions, pick one, answer its 4 options, give back, in a modal | Done. "Give back" was read two ways and both are built: a **Back** link to choose a different question before answering, and **points back** for a right answer. In V2 a right redeem wins the lost life back instead | Picking: `src/lib/redeem.js`. Flow: `src/App.jsx` (`openRedeem`, `answerRedeem`). Window: `src/components/RedeemModal.jsx` |
| 3 | Options of similar length, wrong ones sometimes 2 to 5 words longer | Done. Right answer was longest in 30 of 40; now never more than 2 words longer, and longest about as often as chance | `src/data/questions.json`; rules at `scripts/content-rules.js:6` to `:11` |
| 4 | A list of the images needed | Waiting on your images | `docs/images-needed.md` |
| 5 | 10 questions per run | Replaced in V2 by levels of 5 with lives | `src/lib/scoring.js` (`LEVEL_SIZE`) |
| 6 | Ask for a name on the score screen | Done, as "Sign your score" | `src/components/EndScreen.jsx:6` (`SignForm`) |
| 7 | Leaderboard, local storage for now | Done, then moved to shared cloud storage in round 3: top 10 on the end screen, top 5 on the start screen | `src/lib/leaderboard.js`, `api/leaderboard.js`, `src/components/Leaderboard.jsx:9`, `src/App.jsx:290` |
| 8 | More questions like the Mac menu bar one | Done: 13 new, mostly interface questions; interface gets 3 or 4 of every 10 | New ids: `context-menu`, `rubber-band-scroll`, `keyboard-hidden-targets`, `button-verbs`, `safari-bottom-bar`, `ctrl-alt-del`, `fuel-door-arrow`, `qr-finder`, `google-blue`, `calculator-keypad`, `phone-zero`, `area-codes`, `crosswalk-buttons`. The topic weighting was replaced in V2 by difficulty (`src/lib/levels.js`) |
| 9 | Fix phone keypad vs calculator, using your two explanations | Changed: split into three questions. Your calculator reason is used (medium confidence). Your rotary reason explains why 0 sits after 9, but not why 1 2 3 is on top, so that stays with Bell Labs' testing | `calculator-keypad`, `phone-keypad`, `phone-zero` in `questions.json`; they share `group: "keypads"` or `"rotary"` so near duplicates never meet in one run (`src/lib/levels.js`, `openQuestions`). Notes in `SOURCES.md` |
| 10 | Suggest features and developments | Done in chat, 19 September | Not stored in code |
| 11 | Test as a user and report the UX | Done in chat, 19 September | Not stored in code |

## Original brief

| Requirement | Status | Where |
|---|---|---|
| Run of 20 questions | Changed to 10 in round 2, then to open-ended levels of 5 in V2 | `src/lib/scoring.js` (`LEVEL_SIZE`) |
| 45 second limit, shown quietly | Removed in V2, at your call: no clock | |
| Points: 10, 8, 7, 6, 5 by time, 0 after 45 s | Replaced in V2: 10 for a right answer, times the level and the combo | `src/lib/scoring.js` (`pointsFor`) |
| One hint per question, costs 10 seconds | Changed in V2: a hint halves the points | `src/lib/scoring.js` (`pointsFor`), `src/App.jsx` (`takeHint`) |
| Redeem by explaining the reason in your own words, keyword matched | Changed in round 2 to related questions (see above). Keyword matching and `redeemKeywords` were removed | Old code gone; new code `src/lib/redeem.js` |
| Redeem scores a quarter of the band, rounded up | Replaced in V2: a right redeem wins the lost life back | `src/App.jsx` (`answerRedeem`) |
| After 3 wrong in a row, a tidbit, with its question 3 later | Replaced in V2: a clue at each level break, for a question in the next level | `src/lib/levels.js` (`buildLevel`), `src/components/LevelBreak.jsx` |
| End screen listing every question, tap to read the reasoning | Done; grouped by level in V2 | `src/components/EndScreen.jsx` |
| Analytics per session and question, viewable at `/dev`, exportable | Done; moved into the builder's Analytics tab in round 5, behind the password (`/dev` is gone) | `src/lib/storage.js:19`, `src/lib/analytics.js:31`, `src/builder/Analytics.jsx:81` |
| All state in localStorage, one write function for analytics | Changed in round 3: analytics and the leaderboard moved to a shared Postgres database, since the point of a leaderboard is that everyone sees the same one. Run-in-progress state and the one write function for analytics both stayed exactly as designed, just now pointed at an API instead of localStorage | `src/lib/storage.js:9` (`recordSession`), `api/sessions.js` |
| Question fields: stem, 4 options, hint, explanations, confidence, source, optional image, tidbits | Done; `explanationWrong` is one per option, and `tags` and `group` were added in round 2 | `src/data/questions.json`, checked by `scripts/content-rules.js:26` |
| Never invent or soften a fact; two sources per question | Done | `SOURCES.md` |
| At most one myth buster per run, in about half of runs | Changed in V2: at most one per level | `src/lib/levels.js` (`takeLevel`) |
| Topics balanced, neighbours differ | Neighbours still differ; balance gave way to difficulty in V2 | `src/lib/levels.js` (`arrangeByTopic`) |
| Minimal, restrained look; Poppins everywhere; generous whitespace; no card grids | Done | `src/styles.css:1` tokens, `:21` Poppins |
| No em dashes, no "cognitive load", no "wayfinding" | Done, enforced | `scripts/content-rules.js:13` (`BANNED_TEXT`) |
| React and Vite, plain CSS, no backend | Changed in round 3: you asked to host on Vercel with cloud storage, which needs a backend. Two small serverless functions were added; everything else about the stack is unchanged | `package.json`, `vite.config.js`, `api/` |
| Out of scope: accounts, opinion questions, duplicate filtering, admin UI, LLM redeem | Respected. Leaderboards were out of scope but came in with round 2, local only | |

## Open decisions for you

| Question | Current default | Where to change it |
|---|---|---|
| How long should runs last? | 3 lives, +1 a level (5 at most), a redeem after every wrong answer | `src/lib/scoring.js` (`START_LIVES`, `MAX_LIVES`), `src/App.jsx` (`canRedeem`) |
| How steeply should points rise? | x1, x1.2, x1.5, x2, x2.5, x3 a level; combo x1.5 from 3, x2 from 5 | `src/lib/scoring.js` (`LEVEL_MULTIPLIERS`, `COMBOS`) |
| Should redeem questions be written specially for each question, or keep drawing related ones from the pool? | Drawn from the pool, ranked by group, tags and topic | `src/lib/redeem.js:5` |
| Unseen questions first, or easy ones first, for returning players? | Unseen first, then your topics, then easiest | `src/lib/levels.js` (`buildLevel`) |
| Should leaderboard names be moderated? | Not yet: names are only length-capped and stripped of control characters. (Reading analytics now needs the builder password; saving a session is still open, which is the remaining way a scripted fake run could reach the board) | `src/lib/leaderboard.js` (`cleanName`), `api/sessions.js` |
| Should flags from one device be rate limited? | One flag per question per run per device, no other limit | `api/flags.js` |

## Working rules

- Push back when something looks wrong, and ask when a decision is genuinely yours.
- Answer in a structure: what I did, what I propose, pushbacks, questions. Talk before building anything with more than one reasonable shape.
- Suggest features and developments alongside the work.
- Node and Git are installed. `npm run dev` runs the app and its API against a local database; `npm test` and `npm run check:content` run the checks.
- Keep this map and `code-map.md` updated when code moves.
- Keep `docs/owner-checklist.md` current with everything only you can supply.
