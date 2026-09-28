# Made That Way

A quiz that teaches why well designed things are shaped the way they are. One run is 10 multiple choice questions on everyday objects, industrial design, furniture and interfaces, each followed by the reasoning behind the answer.

A run is played in levels of five questions, with three lives, and there's also a question of the day that never repeats. React and Vite, plain CSS, with a handful of serverless functions for shared state. Questions, runs, the leaderboard, flags and the daily queue live in a shared Postgres database; `src/data/questions.json` is the starting set and the fallback if the database is slow. The run you're currently playing stays in your browser (there are no accounts). A password-protected builder at `/builder` is where questions are added, edited, reviewed and measured. Live at https://madethatway.vercel.app.

What's still needed from the owner (images, credits, account steps) is in [docs/owner-checklist.md](docs/owner-checklist.md).

If you're changing code, start with the maps: [docs/code-map.md](docs/code-map.md) shows where everything lives, and [docs/brief-map.md](docs/brief-map.md) links each instruction to the code that carries it out.

## Running it

You need Node 18 or newer.

```bash
npm install
npm run dev
```

`npm run dev` runs the whole thing, API included, on http://localhost:5173. The `api/` routes run inside the dev server (`tools/local-api.js`) against a local Postgres (PGlite) stored in `.localdb/`, so nothing needs to be connected. Delete `.localdb` to start from a clean database. Images uploaded in the builder land in `.localdb/uploads/`.

The builder needs a password. Put it in a file called `.env.local` at the project root (it's gitignored):

```
BUILDER_PASSWORD=your-password
```

To run against a real cloud database instead, add `DATABASE_URL=<Neon connection string>` to `.env.local` as well.

### Previewing without Node

`tools/preview/serve.ps1` still serves the quiz without Node, compiling the JSX in the browser. It can't run the API, so the builder, leaderboard and flags don't work there, and questions come from the bundled `questions.json`. Open `/__test` on it to run the tests in the browser.

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit tests for scoring and lives, level building, clues, redeem, rewards, the weekly reset, leaderboard, analytics, score verification, question rules and builder sign-in (`node --test`) |
| `npm run check:content` | Checks every content file against the question rules in `src/lib/questionRules.js`: four options, one wrong explanation per wrong option, topics, tags, confidence labels, working source links, alt text on images, even option lengths, no em or en dashes, no banned terms. It also checks the words on screen in `src/`. The builder form and the API use the same rules. |
| `npm run images` | Converts every image in `images/` to WebP in `public/images/`, with a thumbnail each (max 1600 px wide; GIFs stay animated). An image a question marks as a placeholder goes to `dev-images/` instead, which is never deployed |

The builder is at `/builder`. Nothing in the app links to it.

## Deploying to Vercel

This gets you a free, public URL with a live leaderboard. Vercel builds the app for you in the cloud, so you don't need Node installed locally to deploy, though you'll want it eventually for local development. These steps assume you have neither Git nor Node yet; skip whichever parts you've already done.

**1. Install Git and Node**, if `git --version` and `node --version` don't already work in a terminal. On Windows, the fastest way is winget:

```bash
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
```

Open a new terminal afterwards so PATH picks them up.

**2. Put the project in a Git repository**, if `git status` in this folder says it isn't one yet:

```bash
git init
git add .
git commit -m "Made That Way"
```

**3. Create a GitHub account** at [github.com](https://github.com) if you don't have one, then create a new empty repository (no README, no .gitignore — this project already has one) at [github.com/new](https://github.com/new). GitHub will show you the two commands to run; they look like:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

**4. Create a Vercel account** at [vercel.com/signup](https://vercel.com/signup) — "Continue with GitHub" is the easiest option, since it also connects the two accounts.

**5. Import the project.** On the Vercel dashboard, click **Add New… → Project**, pick the GitHub repository you just pushed, and click **Deploy**. Vercel detects Vite automatically; `vercel.json` in this repo sets the build command and the SPA routing it needs. The quiz works straight away from the bundled questions, but the leaderboard and the builder won't until the next steps are done.

**6. Add a Postgres database.** In your new project on Vercel, open the **Storage** tab and add a **Neon** Postgres database (the free tier is more than enough). Follow the prompt to **connect** it to your project; this adds `DATABASE_URL` and related environment variables automatically. On first use the app creates its tables and fills the questions table from `questions.json`, with the new batch in `pending-questions.json` waiting for review.

**7. Add Blob storage.** In the same **Storage** tab, add a **Blob** store and connect it. This is where images uploaded in the builder are kept (it adds `BLOB_READ_WRITE_TOKEN`). Everything else works without it; only image upload doesn't.

**8. Set the builder password.** In **Settings → Environment Variables**, add `BUILDER_PASSWORD`. Changing it later signs every device out of the builder. Nobody but you should ever type this into Vercel.

**9. Redeploy.** Environment variables only take effect on the next build, so go to **Deployments** and redeploy the latest one (or push any commit).

**10. Try it.** Visit your `*.vercel.app` URL, play a run, and sign your score. Then open `<your-url>/builder`, sign in, and check Analytics: it should show 1 completed session and 1 leaderboard entry. If something stays empty, check the function logs under **Deployments → latest → Functions**; the usual cause is a database connected without a redeploy after it.

**11. Optional: a custom domain.** Under **Settings → Domains**.

Git and Node are installed on this machine, but there's no GitHub or Vercel login here, so steps 3 onwards are yours. I can run any individual command if you'd like; say which step.

### Going further

- **A score can't be posted by hand.** Signing sends no score. A run registers with the server when it starts; saving it needs that registration, real question ids, and timing that fits the server's own clock. Only then can it be signed, and the score is recomputed from the saved answers (`src/lib/verifySession.js`).
- **Scripted play is slowed, not impossible.** Each network gets a limited number of run starts, saves, flags, signings and wrong passwords per hour (`server/limits.js`). If real abuse ever appears, the next step is an invisible check such as Cloudflare Turnstile, which needs an account.
- **Names** refuse links, handles and a short list of swear words, and the builder's Players tab can hide any name from every board.
- **Nothing personal is stored.** A random id per browser, and a one-way hash of the network address for rate limiting.

## The builder

At `/builder`, behind `BUILDER_PASSWORD`. A sign-in lasts 7 days on that device, or until you tap Lock.

- **New questions.** Questions waiting for review. Accept puts one into runs straight away; Reject keeps it under "Rejected", where it can be put back; feedback is stored on that question only. Claude reads open feedback, revises the question, and marks the note as addressed with a reply you can see on the card.
- **Daily.** The queue for the question of the day, in the order it goes out, with Move up, Move down and Take out, and a record of how each day went. A day takes the next question the first time anyone opens it, so a day nobody visits doesn't use one up. The tab warns you when fewer than three are left.
- **Players.** Every name on the leaderboard, with Hide for anything unwanted.
- **Play in test mode.** Opens the quiz with its own device, name and saved run. Everything it records is marked as a test, kept off the real leaderboard (test entries show for two minutes), and shown under "Test runs" in Analytics. Runs signed with a name containing "test" are treated the same way.
- **Questions.** Every live and hidden question as a card, with search and a topic filter. Edit, hide or unhide. "Add a question" opens the same form, which checks the question rules as you type and uploads images (converted to WebP in the browser, GIFs kept as they are).
- **Flags.** What players reported through "Flag this question", grouped by question, with the answer they chose. Fix the question, then mark the flags resolved with a note.
- **Analytics.** A dashboard: pick a period and Players or Test runs, then headline numbers with the change from the period before, activity by day, the funnel from visit to leaderboard, where runs are abandoned, the spread of scores, hardest and easiest questions, topics chosen, when people play, how hints and redeems are used, and the daily question. Every number is worked out in the database, so it stays quick. JSON and CSV export at the bottom.

**Where questions live once deployed:** the database, not `questions.json`. Edits in the builder go live immediately. `questions.json` is only the starting set and the fallback when the database doesn't answer within 3 seconds; to refresh the fallback, use "Download live questions as questions.json" on the Questions tab and replace the file.

## Where things are

```
api/                      one thin file per Vercel function (7 in all)
  questions.js flags.js leaderboard.js sessions.js events.js daily.js
  builder.js              every /api/builder/* route, via a rewrite in vercel.json
server/
  db.js schema.js         database client; tables, seeding, row shapes
  auth.js http.js limits.js   builder tokens; request helpers; rate limits
  routes/                 the routes themselves
  routes/builder/         login, questions, upload, flags, daily, players,
                          sessions, analytics (all need a sign-in)
src/
  App.jsx                 run state and the flow between screens
  main.jsx                /builder or the quiz
  components/             Home, Question, LevelBreak, End, Whys (collection),
                          DailyCard, WallOfWhys, Leaderboard, PlayerName,
                          TopicPicker, top bar, Hearts, CountUp, Burst, Toast,
                          Modal, ExplainModal, RedeemModal, FlagModal, WhyPreview,
                          Explanation, ImageFrame
  builder/                the /builder app: review queue, questions, daily,
                          flags, players, analytics
  data/questions.json     starting questions and tidbits (and the fallback)
  data/pending-questions.json   new questions waiting for review
  data/daily-questions.json     the daily queue
  data/themes.json        topics players choose from
  lib/                    scoring and lives, levels, rewards, the week,
                          shuffling, topics, seen list,
                          daily, names, ranking, question bank, question rules,
                          flags, outbox, events, test mode, storage
  styles.css
scripts/                  content check, image optimiser
tools/local-api.js        runs api/ inside npm run dev, on a local Postgres
tools/preview/            no-Node preview server
images/                   originals; npm run images turns them into public/images
dev-images/               local-only placeholder images, never deployed
docs/                     code map, brief map, images, owner checklist, later, research
vercel.json               build and routing config
SOURCES.md                two sources per question and how each was checked
```

## Content format

Each question in `questions.json` has:

- `id`, `topic`, `stem`, `options` (4), `correctIndex`, `hint`, `explanationRight`, `confidence`, `sourceName`, `sourceUrl`.
- `explanationWrong`: four entries lined up with `options`. The entry at `correctIndex` is `null`. Each other entry speaks to what that wrong choice assumed, then ends with why the correct answer is correct.
- `tags`: one or more short words, such as `keyboards` or `aviation`. Redeem uses them to find related questions.
- `group` (optional): questions that share a group never appear in the same run, because one would give the other away. The keypad questions use this.
- `image` (optional): `{ "src", "alt", "credit" }`. See [docs/images-needed.md](docs/images-needed.md).
- `tidbit` (in the database and the builder): `{ "id", "text" }` on the question it seeds. In `questions.json` tidbits sit in their own array instead, as below; the app converts between the two.

Tidbits sit in a separate `tidbits` array: `{ "id", "tidbitFor", "text" }`, where `tidbitFor` is the id of the question the tidbit seeds.

Keep option lengths even. The correct option must not be more than two words longer than the longest wrong one, and across the whole set it should be the longest (or shortest) only about as often as chance. The content check enforces both.

## How a run is built

A run is played in levels of five questions (`src/lib/levels.js`). Only questions with a picture are used, since text-only ones tired people out; a bank without enough pictures falls back to every question.

1. **Each level is built when the one before it is cleared**, from the questions the run hasn't used. Questions this device hasn't seen come first, then the player's chosen topics, then the easiest. How easy a question is comes from real players: `question_stats` keeps how often each one is answered right, pulled towards a half until there are enough answers. So level 1 builds momentum, and later levels get harder by themselves as the easy questions are used up.
2. **Within a level** no two questions share a `group` (near duplicates never meet in a run), there's at most one myth buster, and neighbours differ in topic.
3. **At each level break**, a clue (the tidbit) is shown for one of the questions in the level about to start. If none of the five has a clue, the best-placed question that has one is swapped in.
4. **Leaving and coming back** to an unanswered question swaps it for a fresh one, so there's no point looking the answer up.
5. **The run ends** when the lives run out, when the player stops at a level break, or when there are no questions left.

## Answering and redeeming

- There's no clock. After an answer: the result, then the short reason (the first sentence of the explanation, or the first two when the first only sets up the problem), with "Read more" for the full reasoning and source, and how many players get it right once ten have answered.
- A wrong answer costs a life, and offers a redeem: three related questions from outside the run, ranked by shared group, then shared tags, then topic, preferring questions without a picture so the levels last longer. Answer one right and the life comes back. The three are fixed once offered, so closing and reopening the window can't reroll them.
- Every question answered, redeems included, joins the player's collection of whys.

## Scoring

All in `src/lib/scoring.js`, shared by the quiz and the server:

- 10 points for a right answer, times the level (x1, x1.2, x1.5, x2, x2.5, then x3) and the combo (x1.5 from three right in a row, x2 from five). A hint halves it. A wrong answer scores 0 and ends the combo.
- Three lives to start. A wrong answer costs one, a right redeem wins it back, and each level cleared adds one, up to five.
- `replay()` works all of this out from the answers alone, which is how the server checks a run.

## Rewards

On the device (`src/lib/rewards.js`): the whys uncovered, four badges (first level, perfect level, three day streak, 50 whys) and the best run. The collection screen shows them all. A level break marks the level with a burst, the extra life, a perfect level and any new badge.

## Leaderboard

One board, **this week's**. It starts again every Monday at midnight, India time, for everyone (`src/lib/week.js`), so a newcomer always has a real chance. A player's all-time best is shown only to them, on the home screen. The board shows on the home screen (top 5) and the end screen (top 10, plus your own row if you rank below the cut).

A player is a device. `src/lib/device.js` gives each browser a random id the first time it's needed (not an account: a new browser or cleared site starts fresh), and the server keeps a separate random public id for the board, so device ids never reach other players. A name is set the first time a run is signed, and can be changed from the home screen three times; changing it renames you everywhere.

The score itself is never taken from the client's word. Signing sends only `{ deviceId, runId, name }`; the server looks up the run it registered when play started and the session saved at the end, checks the timing against its own clock (at least 2 seconds an answer), and replays the answers with the quiz's own scoring, checking every answer and every redeem against the version of each question the player actually saw. A run that doesn't check out is refused, with a plain reason on screen.

Everything goes through `src/lib/leaderboard.js` on the client and `server/routes/leaderboard.js` on the server.

## Question of the day

One question a day, the same for everyone, answered on the home screen: no timer, no points, one go. It never repeats, and once its day has passed everywhere it joins the questions runs play from, bringing its answer rate with it. A day takes the next question from the queue the first time anyone opens it, so a day nobody visits doesn't use one up, and the queue is managed in the builder's Daily tab.

The day is the player's own date, so it turns over at their midnight; the server only accepts a date within a day of its own, so a changed phone clock can't fake a streak. The answer is checked on the server, and the question is sent without its answer until it's been answered. Answering adds to a streak; a day with no question, or one you voided in the builder, never breaks it. The card also shows the share of players who got today's question right, and this player's average.

## Topics

Players can choose the topics they like (at least three), and levels draw from those first before the rest, so an endless run never runs short. Topics live in the database, seeded from `src/data/themes.json`, and every question carries the ones it belongs to, so adding a topic is a content change rather than a code change.

## Analytics

Each completed run is saved through `recordSession()` in `src/lib/storage.js`, which posts to `api/sessions.js`, the only analytics write in the app. Each session stores the timestamp, total score, the level reached, how it ended, duration, clues shown, and for each question: id, topic, position, level, chosen option, correct or not, time to answer, hint used, redeem used, redeem passed, the three questions offered, the one picked, the option chosen on it, and points awarded. A verified run also adds its answers to `question_stats`, which levels use to put easier questions first.

In the builder's Analytics tab, redeem rate is out of wrong answers, since redeem is only offered on a wrong answer. Redeem pass rate is out of redeems. The question table also shows how often each question was offered as a redeem choice, how often it was picked, and how often players got it right when they picked it.
