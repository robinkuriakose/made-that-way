# Code map

Where everything lives, so a change can start from the right file without reading the whole codebase. References are `file:line` plus the function name; if a line number has drifted, search for the name.

Keep this file in step with the code: when you add, move or rename something listed here, update the line.

```mermaid
mindmap
  root((Made That Way))
    App.jsx
      Run state, levels and lives
      Question bank and topics
      Shuffled options
      Leave, restart, back
      Redeem wins a life
      Rewards and badges
      Signing and names
    Screens
      HomeScreen
      QuestionScreen
      LevelBreak
      EndScreen
      WhysScreen
    Home parts
      DailyCard
      WallOfWhys
      PlayerName
      Leaderboard
      TopicPicker
    lib
      scoring and replay
      levels
      rewards and week
      shuffle
      themes and seen
      daily and dailyClient
      names and ranking
      questionBank
      questionRules
      outbox and events
      testMode
    Builder at /builder
      Review queue
      Questions
      Daily
      Flags
      Players
      Analytics
    server
      routes public
      routes builder
      schema and db
      auth and limits
    Content
      questions.json
      pending-questions.json
      daily-questions.json
      themes.json
      images
    Tooling
      local API
      tests
```

## App shell

| What | Where |
|---|---|
| Entry point; `/builder` loads the builder lazily. Test mode is switched on here | `src/main.jsx:11` (`initTestMode`), `:14` (`isBuilderRoute`) |
| Run shape, bumped when state changes shape | `src/App.jsx:46` (`RUN_VERSION`, now 5), `:84` (`createRun`) |
| A run keeps its own copy of its questions, the topics it was built from, and the order each question's options are shown in. It starts with level 1 only; each level is added at the break before it | `src/App.jsx:84` (`createRun`), `:469` (`openBreak`) |
| Levels play from picture questions only (text-only ones tired people out) | `src/App.jsx:68` (`levelPool`) |
| Resume a saved run. Coming back to an unanswered question swaps it for a fresh one, so leaving can't be used to look the answer up | `src/App.jsx:339` (`resumeRun`), pick at `src/lib/levels.js:143` (`replacementFor`) |
| Home, Back and Restart. Play, the end screen and the collection each get a history entry, so the phone's Back button goes home | `src/App.jsx:225` (`showHome`), `:243` (`enter`), `:252` (`goHome`), `:320` (`restartRun`, with an Undo toast) |
| Start a run (waits for the live bank, at most 3 s from page load) | `src/App.jsx:298` (`startRun`) |
| Answering: display order in, original order stored; points worked out from the answers so far | `src/App.jsx:380` (`answer`), `:441` (`answerRedeem`, a right one wins the life back) |
| Hint, redeem, next, the level break, finishing | `src/App.jsx:374` (`takeHint`), `:397` (`openRedeem`), `:514` (`next`), `:469` (`openBreak`), `:548` (`continueLevel`), `:552` (`finishAtBreak`), `:456` (`finishRun`) |
| Rewards during play: whys uncovered, badges, the streak badge from the daily card | `src/App.jsx:280` (`uncovered`), `:267` (`grant`), `:289` (`onStreak`) |
| Sign the leaderboard, change the name | `src/App.jsx:556` (`signScore`), `:572` (`rename`) |
| Flag a question (runs, redeem questions and the daily question) | `src/App.jsx:590` (`openFlag`), `:596` (`submitFlag`) |
| Choose topics (they come first in levels) | `src/App.jsx:612` (`saveTopics`), window at `src/components/TopicPicker.jsx` |
| Which screen renders, and the test mode banner | `src/App.jsx:629` onwards |

## Screens and components

| What | Where |
|---|---|
| Home: the promise, Start or Continue and today's question above the fold; a progress line for returning players; how it works, the board, the wall, name and topics below | `src/components/HomeScreen.jsx:52`; progress at `:22` |
| Question screen. The image sits under the stem, in the same frame every time, before the answer on purpose. After answering: the result, the redeem offer, and the short reason, scrolled into view on a phone | `src/components/QuestionScreen.jsx:83`; reason at `:31`, result at `:47` |
| Top bar: Home and Restart during a run, then the level, hearts, combo and score, and a segment per question in the level | `src/components/TopBar.jsx:13` |
| Hearts that drop and refill; a number that counts up; the level-up burst | `src/components/Hearts.jsx:15`, `CountUp.jsx`, `Burst.jsx` |
| Level break: score so far, what the level earned, a clue for the next level, carry on or stop | `src/components/LevelBreak.jsx:13` |
| End screen: score, levels, whys and badges earned, Play again, signing (one tap when the name is known), this week's board, review by level | `src/components/EndScreen.jsx:70`; sign form at `:11` |
| Collection: badges and every why uncovered, each opening its reasoning | `src/components/WhysScreen.jsx:8` |
| Question of the day: answer in place, then the reason, how everyone did, streak and average | `src/components/DailyCard.jsx:27` |
| The wall of whys: a drifting strip of pictures that turn over to show their question | `src/components/WallOfWhys.jsx:12` |
| Name on the board, and changing it (3 changes) | `src/components/PlayerName.jsx:7` |
| This week's board, with when it resets | `src/components/Leaderboard.jsx` (`Leaderboard`, `BoardList`) |
| Topic picker: pills, at least 3 | `src/components/TopicPicker.jsx:7` |
| Dialog shell, explanation window, redeem window, flag window | `src/components/Modal.jsx:7`, `ExplainModal.jsx:5`, `RedeemModal.jsx:18`, `FlagModal.jsx:8` |
| Reasoning block and the fixed-height image frame | `src/components/Explanation.jsx:6`, `ImageFrame.jsx:11`; `showsImage` at `:9` hides placeholders on the live site |
| Undo and other short messages | `src/components/Toast.jsx:5` |

## Logic (`src/lib`)

| What | Where |
|---|---|
| Level size, lives, points: the level multiplier, the combo, a hint halving them | `src/lib/scoring.js:10` to `:15`, `:32` (`pointsFor`) |
| Everything that follows from a run's answers (points, lives, combo, levels cleared), shared by the quiz and the server | `src/lib/scoring.js:43` (`replay`) |
| Build the next level: unseen first, then chosen topics, then easiest; no near duplicates; neighbours differ; a clue for one of its questions | `src/lib/levels.js:88` (`buildLevel`), `:52` (`openQuestions`) |
| How easy a question has proved, and the share who get it right | `src/lib/levels.js:26` (`easeOf`), `:33` (`percentRight`) |
| A replacement question when a player leaves and comes back | `src/lib/levels.js:143` (`replacementFor`) |
| Redeem choices: most related first, keeping picture questions for the levels | `src/lib/redeem.js:24` (`pickRedeemQuestions`) |
| Rewards on this device: whys uncovered, badges, best run | `src/lib/rewards.js:16` (`BADGES`), `:60` (`uncover`), `:74` (`award`), `:91` (`recordBest`) |
| The weekly board's week (Monday, India time) | `src/lib/week.js:9` (`weekStart`), `:19` (`resetWords`) |
| The short reason after an answer | `src/lib/text.js` (`firstSentence`) |
| Option shuffling: the view a player sees, and mapping back to the stored order | `src/lib/shuffle.js:39` (`viewOf`), `:49` (`toOriginal`), `:50` (`toDisplay`), `:10` (`seededRandom`, for the daily question) |
| Topics: the list, the player's choice, the label above a question | `src/lib/themes.js:17` (`readChosenThemes`), `:28` (`saveChosenThemes`), `:40` (`questionLabel`), `:13` (`MIN_THEMES`) |
| Which questions this device has seen | `src/lib/seen.js:9` (`seenIds`), `:18` (`markSeen`) |
| Names: cleaning, links and swear words, test names, the 3 change limit | `src/lib/names.js:8` (`cleanName`), `:19` (`isTestName`), `:32` (`nameProblem`), `:5` (`NAME_CHANGE_LIMIT`) |
| Daily question maths: the player's day, plausible days, streaks | `src/lib/daily.js:11` (`localDay`), `:20` (`isPlausibleDay`), `:33` (`computeStreak`) |
| Daily question over the network, cached per day | `src/lib/dailyClient.js` (`fetchDaily`, `answerDaily`, `cachedDaily`) |
| Anything that must not be lost offline (run starts, finished runs, events), sent in order | `src/lib/outbox.js` (`send`, `flush`, `drain`); tested in `outbox.test.js` |
| Activity events | `src/lib/events.js` (`track`, `screenKind`) |
| Test mode: separate id and storage on this device | `src/lib/testMode.js` (`initTestMode`, `isTestMode`, `storageKey`) |
| Question bank: live, cached, or bundled | `src/lib/questionBank.js:27` (`initialBank`), `:40` (`fetchLiveBank`) |
| Question rules, shared by the builder form, the API and the content script | `src/lib/questionRules.js:97` (`checkQuestion`), `:61` (`normalizeQuestion`), `:40` (`slugify`) |
| Leaderboard client: boards, signing, renaming | `src/lib/leaderboard.js` (`readBoards`, `signRun`, `renamePlayer`) |
| Ranking and personal bests (pure, shared with the server) | `src/lib/ranking.js` (`rankEntries`, `isBetterRun`) |
| Score verification, version aware, redeems included | `src/lib/verifySession.js:27` (`verifySession`), `:76` (`sessionQuestionIds`) |
| Saving a finished run | `src/lib/storage.js` (`recordSession`) |
| Device id, run storage, tidbit split, CSV export | `src/lib/device.js`, `runStore.js`, `bank.js`, `analytics.js` |

## Builder (`src/builder`, at `/builder`)

| What | Where |
|---|---|
| Shell: sign-in gate, tabs, toast, "Play in test mode", Lock | `src/builder/BuilderApp.jsx:22`; tabs at `:13` |
| Review queue for new questions, oldest first | `src/builder/ReviewQueue.jsx:97`; card at `:34` |
| Questions: search, Live/Hidden, topic filter, hide, export | `src/builder/QuestionList.jsx:32` |
| Add or edit a question: topics, live checks, drafts kept on the device, no overwriting someone else's edit | `src/builder/QuestionForm.jsx:76` |
| Image upload: WebP plus a thumbnail, alt text, credit, "only show after answering" | `src/builder/ImageField.jsx:52` |
| Daily: the queue in order, move and take out, and how each day went | `src/builder/DailyPanel.jsx:13` |
| Flags from players | `src/builder/FlagsPanel.jsx:84` |
| Players: names on the board, hide or show | `src/builder/PlayersPanel.jsx:6` |
| Analytics dashboard: period and Players/Test switch, headline numbers with change, charts, question lists, export | `src/builder/Analytics.jsx:113`; bars at `:57` (`HBars`), `:76` (`VBars`), cards at `:37` (`Kpi`) |
| Token, calls, sign-out on 401 | `src/builder/api.js` |

## Backend (`api/` and `server/`)

`api/` holds one thin file per Vercel function; every route lives in `server/routes`. `/api/builder/<route>` is rewritten to one function (`vercel.json`), so the builder can grow without new functions. Seven functions in total; Vercel's free plan allows twelve.

| What | Where |
|---|---|
| Database client (Neon in the cloud, PGlite locally), connected on first use; a missing database is a 503 with a plain reason, not a crash | `server/db.js` (`connectionString`, `NotConfigured`) |
| Tables, seeding, row shapes. A cold server checks one row and skips setup when nothing changed | `server/schema.js:36` (`ensureSchema`), `:58` (`createTables`), `:260` (`seed`); `question_stats` at `:226` |
| Builder password and tokens | `server/auth.js` |
| Request helpers, id and day checks, the hashed network key | `server/http.js` |
| Rate limits per network, kept in the database | `server/limits.js` (`hit`, `isBlocked`, `LIMITS`) |
| `GET /api/questions`: live questions with how often each is answered right, and topics | `server/routes/questions.js` |
| `POST /api/events`: page opened, run started (which registers the run), left, restarted, resumed, level cleared | `server/routes/events.js` (`record`) |
| `POST /api/sessions`: save a finished run, checked against its registered run and the real questions; adds its answers to `question_stats` | `server/routes/sessions.js` |
| `GET/POST/PATCH /api/leaderboard`: this week's board and the player's private best, signing, renaming | `server/routes/leaderboard.js:64` (`board`), `:116` (`sign`), `:187` (`rename`) |
| `GET/POST /api/daily`: the question of the day, answered and marked here | `server/routes/daily.js:31` (`questionFor`), `:88` (`statsFor`) |
| `POST /api/flags`: a player flags a question | `server/routes/flags.js` |
| Builder routes | `server/routes/builder/`: `login.js`, `questions.js`, `upload.js`, `flags.js`, `daily.js`, `players.js`, `sessions.js`, `analytics.js` |
| Function entry points and the builder dispatcher | `api/*.js`, `api/builder.js` |

**How a leaderboard entry is trusted:** a run registers itself with the server when it starts. Saving it later needs that registration, every question in it must be real, and the timing has to fit the server's own clock (and allow at least 2 seconds an answer). Only then is the run "verified". Signing replays the saved answers with the quiz's own scoring (`replay`): points, combos, lives, and every redeem checked against its real question, against the version of each question the player actually saw (`question_history`). The board shows a random public id per player; device ids never leave the server.

**Test data** (test mode in the builder, or a name with a word starting "test") is marked `is_test` everywhere and kept out of the players' numbers. Test entries show on the board for two minutes.

## Content

| What | Where |
|---|---|
| Live questions and tidbits (the seed, and the fallback if the database is slow) | `src/data/questions.json` |
| New questions waiting for review | `src/data/pending-questions.json` |
| The daily question queue | `src/data/daily-questions.json` |
| Topics players choose from | `src/data/themes.json` |
| Content check for all of them, plus on-screen copy | `scripts/content-rules.js` (`checkContent`, `checkCopy`), run by `scripts/check-content.js` |
| Images: originals in `images/`, published copies and thumbnails in `public/images/`, local-only placeholders in `dev-images/` | `scripts/optimize-images.js` (`npm run images`) |
| Sources for every question | `SOURCES.md` |
| Images still wanted | `docs/images-needed.md` |
| What only the owner can supply | `docs/owner-checklist.md` |
| Agreed but not built yet | `docs/later.md` |

## Styles (`src/styles.css`)

| Section | Line |
|---|---|
| Tokens, layout, top bar | `:1`, `:72` |
| Options, feedback, buttons, inputs | `:152`, `:243` |
| Start and home | `:495` |
| End, signing, board | `:528`, `:626`, `:647` |
| Explanation window and image frame | `:702`, `:740` |
| Redeem and flag windows | `:835`, `:922` |
| Builder shell, review queue, question list, form, flags, analytics tables | `:979`, `:1088`, `:1286`, `:1367`, `:1498`, `:1576` |
| Phone layout | `:1697` |
| Round 8: navigation, home, daily, wall, topics, dashboard | `:1846` onwards |
| V2: top bar during play, hearts, answering, the reason, level break, burst, end, home, collection, less motion | `:2636` onwards |

## Tooling

| What | Where |
|---|---|
| Unit tests (`npm test`) | `src/lib/v2.test.js` (scoring, levels, verification, rewards, the week), `lib.test.js`, `bank.test.js`, `round8.test.js`, `outbox.test.js`, `server/auth.test.js`, `server/db.test.js` |
| Runs the `api/` routes inside `npm run dev` against a local Postgres in `.localdb/`, through Vite, so any change to `api/` or `server/` applies on the next request | `tools/local-api.js`, plugged in by `vite.config.js` |
| Local secrets (builder password) | `.env.local`, not committed |
| Preview launch config | `.claude/launch.json` |

## Where state lives

| Key | Holds |
|---|---|
| `madeThatWay.run.v1` | The run in progress, with its questions and option orders |
| `madeThatWay.bank.v2` | The last live bank and topics this device saw |
| `madeThatWay.themes.v1` | The topics this player chose |
| `madeThatWay.seen.v1` | Questions this device has been shown |
| `madeThatWay.whys.v1`, `madeThatWay.badges.v1`, `madeThatWay.best.v1` | Whys uncovered, badges earned and the best run, on this device |
| `madeThatWay.daily.v1` | Today's daily question and result |
| `madeThatWay.outbox.v1` | Anything not yet sent to the server |
| `madeThatWay.playerName.v1`, `madeThatWay.deviceId.v1` | This player's name and random device id |
| `madeThatWay.builderToken.v1`, `madeThatWay.builder.draft.*` | Builder sign-in and unsaved question drafts |
| `madeThatWay.testMode` (sessionStorage) | Test mode for this tab; every key above gets a `.test` twin |
| Postgres | `questions`, `question_history`, `question_stats`, `themes`, `runs`, `sessions`, `events`, `players`, `signed_runs`, `flags`, `daily_schedule`, `daily_answers`, `rate_limits`, `meta` |
| Vercel Blob (or `.localdb/uploads`) | Images uploaded in the builder |
