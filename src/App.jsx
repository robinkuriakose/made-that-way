import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildLevel, replacementFor, mixFor } from './lib/levels.js';
import plan from './data/level-plan.json';
import { pointsFor, replay, levelOf, comboMultiplier, isPerfectLevel, LEVEL_SIZE } from './lib/scoring.js';
import { pickRedeemQuestions, REDEEM_CHOICES } from './lib/redeem.js';
import { loadRun, saveRun } from './lib/runStore.js';
import { recordSession } from './lib/storage.js';
import { readBoards, signRun, renamePlayer, readLocalName, writeLocalName, placeholderName, isPlaceholderName } from './lib/leaderboard.js';
import { share, questionLink, dailyLink, dailyText } from './lib/share.js';
import { fetchLegends, signLegend } from './lib/playerClient.js';
import { nameProblem, cleanName } from './lib/names.js';
import { initialBank, fetchLiveBank } from './lib/questionBank.js';
import { splitTidbits } from './lib/bank.js';
import { sendFlag } from './lib/flagClient.js';
import { makeId } from './lib/id.js';
import { getDeviceId } from './lib/device.js';
import { optionOrder, viewOf, toOriginal, toDisplay } from './lib/shuffle.js';
import { readChosenThemes, saveChosenThemes, questionLabel } from './lib/themes.js';
import { seenIds, markSeen } from './lib/seen.js';
import { track, screenKind } from './lib/events.js';
import { flush } from './lib/outbox.js';
import { isTestMode, exitTestMode } from './lib/testMode.js';
import {
  BADGES,
  availableBadges,
  award,
  earnedBadges,
  levelBadges,
  readBest,
  recordBest,
  streakBadges,
  uncover,
  uncoveredIds,
  whysBadges,
} from './lib/rewards.js';
import HomeScreen from './components/HomeScreen.jsx';
import QuestionScreen from './components/QuestionScreen.jsx';
import LevelBreak from './components/LevelBreak.jsx';
import EndScreen from './components/EndScreen.jsx';
import WhysScreen from './components/WhysScreen.jsx';
import LegendFinale from './components/LegendFinale.jsx';
import ProfileScreen from './components/ProfileScreen.jsx';
import SuggestScreen from './components/SuggestScreen.jsx';
import SharedQuestion from './components/SharedQuestion.jsx';
import FeedbackForm from './components/FeedbackForm.jsx';
import { RenameModal } from './components/NameTag.jsx';
import ExplainModal from './components/ExplainModal.jsx';
import RedeemModal from './components/RedeemModal.jsx';
import FlagModal from './components/FlagModal.jsx';
import TopicPicker from './components/TopicPicker.jsx';
import Toast from './components/Toast.jsx';
import { showsImage } from './components/ImageFrame.jsx';

// Bumped when the saved run's shape changes, so an old saved run is dropped
// instead of crashing. v5: levels and lives, no clock.
const RUN_VERSION = 5;
const DONE_PHASES = ['correct', 'wrong', 'redeemed'];
const EMPTY_BOARDS = { week: { entries: [], me: null, startsAt: null }, player: null };
const BADGE_LIST = availableBadges(plan.lastLevel);

function freshQuestionState() {
  return {
    startedAt: Date.now(),
    hintUsed: false,
    phase: 'answering',
    chosenIndex: null,
    timeToAnswerMs: null,
    redeem: null,
    points: 0,
  };
}

const byIdOf = (list) => Object.fromEntries(list.map((q) => [q.id, q]));
const ordersFor = (ids) => Object.fromEntries(ids.map((id) => [id, optionOrder()]));
const pick = (byId, ids) => Object.fromEntries(ids.map((id) => [id, byId[id]]));

// Levels play from questions with a picture: text-only ones tired people out.
// A bank without enough pictures plays from everything.
function levelPool(questions) {
  const withPictures = questions.filter((q) => showsImage(q.image));
  return withPictures.length >= LEVEL_SIZE * 2 ? withPictures : questions;
}

// Everything a run has asked, queued or answered as a redeem. None of it
// comes back in the same run.
const usedIdsOf = (run) => [...run.order, ...(run.redeemUsed ?? [])];

const levelSizeOf = (run, level) => Math.min(LEVEL_SIZE, run.order.length - (level - 1) * LEVEL_SIZE);

// A run keeps its own copy of every question it shows (so it stays playable
// and reviewable even if the bank changes underneath it), and the order each
// question's options are shown in. Answers are always recorded in the
// question's original option order; see lib/shuffle.js. Levels are added one
// at a time, at each level break (see lib/levels.js). firstId is a question
// the player picked from the pictures on the home screen, to start with.
function createRun(bank, themeIds, firstId = null) {
  const { ids } = buildLevel({ questions: levelPool(bank.questions), themeIds, firstId, mix: mixFor(plan, 1), seen: new Set(seenIds()) });
  return {
    version: RUN_VERSION,
    id: makeId(),
    startedAt: Date.now(),
    themeIds: themeIds ?? null,
    order: ids,
    questions: pick(byIdOf(bank.questions), ids),
    optionOrders: ordersFor(ids),
    index: 0,
    results: [],
    current: freshQuestionState(),
    onBreak: null,
    tidbitsShown: [],
    redeemOffered: [],
    redeemUsed: [],
    swapped: [],
    flags: {},
    badges: [],
    newWhys: 0,
    finishedAt: null,
    endReason: null,
    isNewBest: false,
    signed: null,
  };
}

// A saved run is only usable if it's the current shape and has every
// question it points at.
function isUsableRun(run) {
  if (!run || run.version !== RUN_VERSION || !Array.isArray(run.order) || !run.questions || !run.optionOrders) return false;
  if (!Array.isArray(run.results) || !replay(run.results)) return false;
  const has = (id) => Boolean(run.questions[id]);
  return (
    run.order.every(has) &&
    (Boolean(run.finishedAt) || run.index < run.order.length) &&
    (!run.current?.redeem || run.current.redeem.offered.every(has))
  );
}

function toSession(run) {
  const summary = replay(run.results);
  return {
    id: run.id,
    deviceId: getDeviceId(),
    format: 2,
    timestamp: new Date(run.startedAt).toISOString(),
    finishedAt: new Date(run.finishedAt).toISOString(),
    totalScore: summary?.score ?? 0,
    level: summary?.level ?? 1,
    endReason: run.endReason,
    durationMs: run.finishedAt - run.startedAt,
    themes: run.themeIds,
    tidbitsShown: run.tidbitsShown,
    swapped: run.swapped,
    questions: run.results,
  };
}

const badgeWords = (ids) => ids.map((id) => BADGES.find((b) => b.id === id)?.label ?? id).join(' and ');

// This device's place on this week's board, if it has one.
const myRank = (boards) => (boards.week.entries.find((e) => e.isMe) ?? boards.week.me)?.rank ?? null;

// arrival: a shared link this visit started from (src/lib/share.js).
export default function App({ arrival = null }) {
  const testMode = useMemo(() => isTestMode(), []);
  const [bank, setBank] = useState(initialBank);
  const bankRef = useRef(bank);
  const liveBank = useRef(null);
  const [starting, setStarting] = useState(false);

  const [run, setRun] = useState(() => {
    const saved = loadRun();
    return isUsableRun(saved) ? saved : null;
  });
  const [screen, setScreen] = useState(arrival?.kind === 'question' ? 'shared' : 'home');
  // A question someone shared: { id, from, chosenIndex?, correct? }.
  const [shared, setShared] = useState(arrival?.kind === 'question' ? arrival : null);
  const runRef = useRef(run);
  runRef.current = run;
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const [explaining, setExplaining] = useState(null);
  const [flagging, setFlagging] = useState(null);
  // The redeem modal reopens after a reload if a redeem was in progress.
  const [redeemOpen, setRedeemOpen] = useState(() => run?.current?.phase === 'redeeming');
  const [boards, setBoards] = useState(EMPTY_BOARDS);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState(null);
  const [chosenThemes, setChosenThemes] = useState(() => readChosenThemes(bank.themes));
  const [pickingTopics, setPickingTopics] = useState(false);
  const [toast, setToast] = useState(null);
  const [localName, setLocalName] = useState(readLocalName);
  const [dailyFlagged, setDailyFlagged] = useState(false);
  const [collection, setCollection] = useState(() => ({ uncovered: uncoveredIds(), badges: earnedBadges() }));
  const [best, setBest] = useState(readBest);
  const [streak, setStreak] = useState(0);
  const [legends, setLegends] = useState({ legends: [], lastLevel: plan.lastLevel });
  const [renaming, setRenaming] = useState(false);
  // The feedback form, when open: { runId, rating }.
  const [feedbackFor, setFeedbackFor] = useState(null);

  useEffect(() => {
    saveRun(run);
  }, [run]);

  useEffect(() => {
    readBoards().then(setBoards);
    fetchLegends().then((r) => r.ok && setLegends(r));
    track('page_opened', { data: { device: screenKind() } });
    if (arrival) track('share_opened', { data: { kind: arrival.kind, questionId: arrival.id ?? null } });
    flush();
    // Fetch the live bank straight away, so it's usually here before Start.
    liveBank.current = fetchLiveBank().then((live) => {
      if (live) {
        bankRef.current = live;
        setBank(live);
        setChosenThemes(readChosenThemes(live.themes));
      }
      return live;
    });
  }, []);

  // Questions the run knows about win over the bank's copy: they're what
  // the player actually saw.
  const questionsById = useMemo(
    () => ({ ...byIdOf(bank.questions), ...(run?.questions ?? {}) }),
    [bank, run?.questions],
  );
  const currentId = run ? run.order[run.index] : null;
  const question = run ? run.questions[currentId] : null;
  const orderOf = (id) => run?.optionOrders?.[id];
  const labelFor = (q) => questionLabel(q, bank.themes);
  // Everything that follows from the answers so far: score, lives, combo.
  const progress = useMemo(() => (run ? replay(run.results) : null), [run?.results]);

  // Remember what's been shown, so later runs prefer questions not seen yet.
  const onQuestion = screen === 'play' && Boolean(currentId) && !run?.onBreak;
  useEffect(() => {
    if (onQuestion) markSeen([currentId]);
  }, [onQuestion, currentId]);

  // Each new question, break or screen starts at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, run?.index, Boolean(run?.onBreak)]);

  // Navigation. Play, the end screen and the collection each get a history
  // entry, so the phone's Back button (or the browser's) returns to the home
  // screen instead of leaving the site.
  const showHome = useCallback(() => {
    const r = runRef.current;
    if (screenRef.current === 'play' && r && !r.finishedAt) track('run_left', { runId: r.id, data: { position: r.index + 1 } });
    setExplaining(null);
    setFlagging(null);
    setRedeemOpen(false);
    setScreen('home');
    readBoards().then(setBoards);
    fetchLegends().then((r) => r.ok && setLegends(r));
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (screenRef.current !== 'home') showHome();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [showHome]);

  function enter(name) {
    const state = window.history.state;
    if (state?.mtw === name) {
      // Already there.
    } else if (state?.mtw) window.history.replaceState({ mtw: name }, '');
    else window.history.pushState({ mtw: name }, '');
    setScreen(name);
  }

  function goHome() {
    if (window.history.state?.mtw) window.history.back();
    else showHome();
  }

  function patchCurrent(patch) {
    setRun((r) => ({ ...r, current: { ...r.current, ...patch } }));
  }

  function patchRedeem(patch) {
    setRun((r) => ({ ...r, current: { ...r.current, redeem: { ...r.current.redeem, ...patch } } }));
  }

  // Rewards. Badges are kept on the device; the ones won during a run are
  // also listed on its end screen.
  function grant(ids) {
    const fresh = award(ids);
    if (fresh.length) setCollection({ uncovered: uncoveredIds(), badges: earnedBadges() });
    return fresh;
  }

  function announce(fresh) {
    if (!fresh.length) return;
    if (runRef.current && !runRef.current.finishedAt) setRun((r) => ({ ...r, badges: [...r.badges, ...fresh] }));
    setToast({ message: `New badge: ${badgeWords(fresh)}.`, duration: 5000 });
  }

  // A question's reason has been shown: it joins the collection.
  function uncovered(id) {
    const fresh = uncover([id]);
    if (!fresh) return 0;
    const all = uncoveredIds();
    setCollection({ uncovered: all, badges: earnedBadges() });
    announce(grant(whysBadges(all.length)));
    return fresh;
  }

  const onStreak = useCallback((n) => {
    setStreak(n);
    const fresh = award(streakBadges(n));
    if (fresh.length) {
      setCollection({ uncovered: uncoveredIds(), badges: earnedBadges() });
      setToast({ message: `New badge: ${badgeWords(fresh)}.`, duration: 5000 });
    }
  }, []);

  // The name a shared link carries: the player's own, never their starting one.
  const myName = boards.player?.name ?? (isPlaceholderName(localName) ? null : localName);
  const namedPlayer = Boolean(myName);

  function toastShareResult(result) {
    if (result === 'copied') setToast({ message: 'Copied. Paste it to a friend.', duration: 4000 });
    else if (result === 'failed') setToast({ message: "Couldn't share that. Try again.", duration: 4000 });
  }

  // A question's link. It carries the player's name only when they got it
  // right: the preview then reads "<name> worked this one out. Can you?"
  async function shareQuestion(q, correct = true) {
    const text = correct ? 'I worked this one out. Can you?' : 'This one got me. Can you work it out?';
    toastShareResult(await share({ text, url: questionLink(q.id, correct ? myName : null), kind: 'question', questionId: q.id }));
  }

  async function shareDaily({ day, correct, streak: days }) {
    toastShareResult(await share({ text: dailyText({ correct, streak: days }), url: dailyLink(day), kind: 'daily' }));
  }

  // A shared question this device can't find (taken out of the game since it
  // was shared): once the live questions are in, go home and say so.
  const sharedQuestion = shared ? (questionsById[shared.id] ?? null) : null;
  useEffect(() => {
    if (screen !== 'shared' || sharedQuestion || !shared) return undefined;
    let live = true;
    Promise.resolve(liveBank.current).then((fresh) => {
      if (!live || byIdOf((fresh ?? bankRef.current).questions)[shared.id]) return;
      setScreen('home');
      setToast({ message: "That question isn't in the game any more. Here are plenty of others.", duration: 6000 });
    });
    return () => {
      live = false;
    };
  }, [screen, Boolean(sharedQuestion)]);

  // A player with a name of their own goes on the board without asking.
  useEffect(() => {
    if (screen !== 'end' || !run?.finishedAt || run.signed || run.autoSigning || !namedPlayer || signing) return;
    setRun((r) => ({ ...r, autoSigning: true }));
    signScore(myName);
  }, [screen, run?.id, namedPlayer]);

  // firstId: a question to start with (a picture tapped on the home screen).
  // Buttons call this with a click event, which is ignored.
  async function startRun(firstId = null) {
    if (starting) return null;
    const previous = runRef.current;
    setStarting(true);
    setExplaining(null);
    setFlagging(null);
    setRedeemOpen(false);
    // Waits for the live bank only if it's still on its way, and never past
    // the 3 second limit (see lib/questionBank.js).
    const live = await liveBank.current;
    const next = createRun(live ?? bankRef.current, chosenThemes, typeof firstId === 'string' ? firstId : null);
    if (previous && !previous.finishedAt) track('run_restarted', { runId: previous.id, data: { position: previous.index + 1 } });
    track('run_started', { runId: next.id, data: next.themeIds ? { themes: next.themeIds } : {} });
    setRun(next);
    setSignError(null);
    enter('play');
    setStarting(false);
    return previous;
  }

  // Restart goes straight to a new run from question 1, with a few seconds
  // to undo it instead of an "are you sure?" in the way. Playing a picture
  // from the home screen mid-run works the same way.
  async function restartRun(firstId = null) {
    const previous = await startRun(firstId);
    if (!previous || previous.finishedAt) return;
    setToast({
      message: 'New run started.',
      actionLabel: 'Undo',
      onAction: () => {
        const abandoned = runRef.current;
        if (abandoned) track('run_left', { runId: abandoned.id, data: { position: abandoned.index + 1 } });
        track('run_resumed', { runId: previous.id });
        setRun(previous);
        setRedeemOpen(previous.current.phase === 'redeeming');
        setToast(null);
      },
    });
  }

  // Coming back to an unanswered question means the player had time to look
  // it up, so it's swapped for a fresh one at the same position.
  function resumeRun() {
    const r = runRef.current;
    if (!r) return;
    let next = r;
    if (r.current.phase === 'answering' && !r.onBreak) {
      const replacedId = r.order[r.index];
      const newId = replacementFor({
        replacedId,
        usedIds: usedIdsOf(r),
        questions: levelPool(bankRef.current.questions),
        themeIds: r.themeIds,
        seen: new Set(seenIds()),
      });
      if (newId) {
        const order = r.order.slice();
        order[r.index] = newId;
        next = {
          ...r,
          order,
          questions: { ...r.questions, [newId]: byIdOf(bankRef.current.questions)[newId] },
          optionOrders: { ...r.optionOrders, [newId]: optionOrder() },
          swapped: [...(r.swapped ?? []), { id: replacedId, position: r.index + 1 }],
          current: freshQuestionState(),
        };
      } else {
        // Nothing left to swap in: carry on with the same question.
        next = { ...r, current: { ...r.current, startedAt: Date.now() } };
      }
    }
    setRun(next);
    track('run_resumed', { runId: r.id });
    setRedeemOpen(next.current.phase === 'redeeming');
    enter('play');
  }

  function takeHint() {
    if (run.current.phase !== 'answering' || run.current.hintUsed) return;
    patchCurrent({ hintUsed: true });
  }

  // displayIndex is the position on screen; it's stored in original order.
  function answer(displayIndex) {
    const c = run.current;
    if (c.phase !== 'answering') return;
    const chosen = toOriginal(orderOf(currentId), displayIndex);
    const correct = chosen === question.correctIndex;
    const position = run.index + 1;
    const points = pointsFor({ correct, level: levelOf(position), streak: correct ? progress.streak + 1 : 0, hintUsed: c.hintUsed });
    const fresh = uncovered(question.id);
    setRun((r) => ({
      ...r,
      newWhys: (r.newWhys ?? 0) + fresh,
      current: { ...r.current, phase: correct ? 'correct' : 'wrong', chosenIndex: chosen, timeToAnswerMs: Date.now() - c.startedAt, points },
    }));
  }

  // The three offered questions are chosen once per question and kept, so
  // closing and reopening the modal can't be used to reroll them.
  function openRedeem() {
    const c = run.current;
    if (c.phase !== 'wrong' || !canRedeem) return;
    const offered =
      c.redeem?.offered ??
      pickRedeemQuestions({
        missed: question,
        questions: bank.questions,
        usedIds: usedIdsOf(run),
        alreadyOffered: run.redeemOffered,
        keepIds: levelPool(bank.questions).map((q) => q.id),
      });
    const bankById = byIdOf(bank.questions);
    const fresh = offered.filter((id) => !run.questions[id]);
    setRun((r) => ({
      ...r,
      questions: { ...r.questions, ...pick(bankById, fresh) },
      optionOrders: { ...ordersFor(fresh), ...r.optionOrders },
      redeemOffered: c.redeem ? r.redeemOffered : [...r.redeemOffered, ...offered],
      current: {
        ...r.current,
        phase: 'redeeming',
        redeem: c.redeem ?? { offered, pickedId: null, chosenIndex: null, correct: null },
      },
    }));
    setRedeemOpen(true);
  }

  function closeRedeem() {
    setRedeemOpen(false);
    // Leaving before answering puts the question back to plain wrong.
    if (run.current.phase === 'redeeming') patchCurrent({ phase: 'wrong', redeem: { ...run.current.redeem, pickedId: null } });
  }

  function pickRedeem(id) {
    if (run.current.phase === 'redeeming') patchRedeem({ pickedId: id });
  }

  function backToChoices() {
    if (run.current.phase === 'redeeming') patchRedeem({ pickedId: null });
  }

  // Right wins the lost life back. The question answered is used up for the
  // rest of the run either way.
  function answerRedeem(displayIndex) {
    const c = run.current;
    if (c.phase !== 'redeeming' || !c.redeem?.pickedId) return;
    const pickedId = c.redeem.pickedId;
    const chosen = toOriginal(orderOf(pickedId), displayIndex);
    const correct = chosen === run.questions[pickedId].correctIndex;
    const fresh = uncovered(pickedId);
    setRun((r) => ({
      ...r,
      newWhys: (r.newWhys ?? 0) + fresh,
      redeemUsed: [...(r.redeemUsed ?? []), pickedId],
      current: { ...r.current, phase: 'redeemed', redeem: { ...r.current.redeem, chosenIndex: chosen, correct } },
    }));
  }

  function finishRun(base, reason) {
    const finished = { ...base, onBreak: null, finishedAt: Date.now(), endReason: reason };
    const summary = replay(finished.results) ?? { score: 0, level: 1 };
    const isNewBest = recordBest({ score: summary.score, level: summary.level });
    if (isNewBest) setBest(readBest());
    setRun({ ...finished, isNewBest });
    recordSession(toSession(finished));
    enter(reason === 'legend' ? 'legend' : 'end');
  }

  // A level is cleared: build the next one now, so its clue can be shown on
  // the break, and mark the moment. With nothing left to ask, the run is
  // complete.
  function openBreak(base, state) {
    const level = levelOf(base.results.length);
    const slice = base.results.slice(-LEVEL_SIZE);
    // Milestone levels (bronze, silver) and the last level (Legend) earn
    // their own badge.
    const milestone = (plan.milestones ?? []).find((m) => m.level === level)?.badge ?? null;
    const last = level >= plan.lastLevel;
    const earned = grant([...levelBadges(slice), ...(milestone ? [milestone] : []), ...(last ? ['legend'] : [])]);
    track('level_cleared', { runId: base.id, data: { level, position: base.results.length } });
    if (last) {
      finishRun({ ...base, badges: [...base.badges, ...earned] }, 'legend');
      return;
    }

    const current = bankRef.current;
    const pool = levelPool(current.questions);
    const { tidbits } = splitTidbits(pool);
    const built = buildLevel({
      questions: pool,
      usedIds: usedIdsOf(base),
      tidbits,
      usedTidbitIds: base.tidbitsShown.map((t) => t.tidbitId),
      withTidbit: true,
      mix: mixFor(plan, level + 1),
      themeIds: base.themeIds,
      seen: new Set(seenIds()),
    });
    const withBadges = { ...base, badges: [...base.badges, ...earned] };
    if (!built.ids.length) {
      finishRun(withBadges, 'complete');
      return;
    }
    const tidbit = tidbits.find((t) => t.id === built.tidbitId) ?? null;
    setRun({
      ...withBadges,
      order: [...base.order, ...built.ids],
      questions: { ...base.questions, ...pick(byIdOf(current.questions), built.ids) },
      optionOrders: { ...base.optionOrders, ...ordersFor(built.ids) },
      index: base.index + 1,
      current: freshQuestionState(),
      onBreak: {
        level,
        perfect: isPerfectLevel(slice),
        lifeGained: state.steps.at(-1).lifeGained,
        levelPoints: slice.reduce((sum, r) => sum + r.points, 0),
        badges: earned,
        milestone,
        tidbit: tidbit && { id: tidbit.id, text: tidbit.text, questionId: tidbit.tidbitFor },
      },
      tidbitsShown: tidbit
        ? [...base.tidbitsShown, { tidbitId: tidbit.id, afterLevel: level, seededQuestionId: tidbit.tidbitFor }]
        : base.tidbitsShown,
    });
  }

  function next() {
    const c = run.current;
    if (!DONE_PHASES.includes(c.phase)) return;
    setRedeemOpen(false);

    const position = run.index + 1;
    const redeemed = c.phase === 'redeemed';
    const record = {
      id: question.id,
      topic: question.topic,
      position,
      level: levelOf(position),
      chosenIndex: c.chosenIndex,
      correct: c.phase === 'correct',
      timeToAnswerMs: Math.round(c.timeToAnswerMs),
      elapsedSeconds: Math.round(c.timeToAnswerMs / 100) / 10,
      hintUsed: c.hintUsed,
      redeemUsed: redeemed,
      redeemPassed: redeemed && c.redeem?.correct === true,
      redeemOffered: c.redeem?.offered ?? null,
      redeemQuestionId: redeemed ? c.redeem.pickedId : null,
      redeemChosenIndex: redeemed ? c.redeem.chosenIndex : null,
      points: c.points,
    };
    const base = { ...run, results: [...run.results, record] };
    const state = replay(base.results);

    if (!state || state.lives <= 0) finishRun(base, 'lives');
    else if (position % LEVEL_SIZE === 0) openBreak(base, state);
    else if (run.index < run.order.length - 1) setRun({ ...base, index: run.index + 1, current: freshQuestionState() });
    // A short last level: the bank has nothing more to ask.
    else finishRun(base, 'complete');
  }

  function continueLevel() {
    setRun((r) => ({ ...r, onBreak: null, current: { ...r.current, startedAt: Date.now() } }));
  }

  function finishAtBreak() {
    if (run?.onBreak) finishRun(run, 'finished');
  }

  async function signScore(name) {
    const runId = run.id;
    const rankBefore = run.rankBefore ?? myRank(boards);
    setSigning(true);
    setSignError(null);
    setRun((r) => (r.id === runId ? { ...r, rankBefore } : r));
    const result = await signRun({ runId, name });
    setSigning(false);
    if (!result.ok) {
      setSignError(result.error);
      return;
    }
    const fresh = await readBoards();
    setRun((r) => (r.id === runId ? { ...r, signed: { isNewBest: result.isNewBest, isTest: result.isTest } } : r));
    setLocalName(readLocalName());
    setBoards(fresh);
  }

  // The Legends wall: the run goes up with the name and signature, then the
  // wall reloads so the new card is on it.
  async function putOnLegends(name, signature) {
    const result = await signLegend({ runId: run.id, name, signature });
    if (result.ok) {
      setRun((r) => ({ ...r, legendSigned: true }));
      if (!boards.player) {
        writeLocalName(name);
        setLocalName(name);
      }
      const wall = await fetchLegends();
      if (wall.ok) setLegends(wall);
    }
    return result;
  }

  // A name on the board is changed on the server (3 times at most). A name
  // that isn't on the board yet is just kept on this device.
  async function rename(name) {
    if (boards.player) {
      const result = await renamePlayer(name);
      if (result.player) setBoards((b) => ({ ...b, player: result.player }));
      if (result.ok) {
        setLocalName(result.player.name);
        readBoards().then(setBoards);
      }
      return result;
    }
    const problem = nameProblem(name);
    if (problem) return { ok: false, error: problem };
    writeLocalName(cleanName(name));
    setLocalName(cleanName(name));
    return { ok: true };
  }

  // Opening a flag closes any other window, so only one is open at a time.
  function openFlag(target) {
    setExplaining(null);
    setRedeemOpen(false);
    setFlagging(target);
  }

  async function submitFlag(reason, details) {
    const target = flagging;
    const ok = await sendFlag({
      questionId: target.questionId,
      reason,
      details,
      chosenIndex: target.chosenIndex,
      wasCorrect: target.wasCorrect,
      runId: target.runId ?? run.id,
      questionVersion: target.question?.updatedAt ?? questionsById[target.questionId]?.updatedAt ?? null,
    });
    if (ok && target.runId?.startsWith('daily-')) setDailyFlagged(true);
    else if (ok) setRun((r) => ({ ...r, flags: { ...(r.flags ?? {}), [target.questionId]: reason } }));
    return ok;
  }

  function saveTopics(ids) {
    saveChosenThemes(ids, bank.themes);
    setChosenThemes(ids);
    setPickingTopics(false);
  }

  const closeExplain = () => setExplaining(null);
  const clearToast = useCallback(() => setToast(null), []);

  // Enough unused questions outside the run to offer a full set of three.
  const canRedeem = Boolean(
    run &&
      (run.current.redeem ||
        bank.questions.filter((q) => !usedIdsOf(run).includes(q.id)).length >= REDEEM_CHOICES),
  );
  const flagged = (id) => Boolean(run?.flags?.[id]);

  let body;
  if (screen === 'play' && run && !run.finishedAt && progress) {
    const c = run.current;
    const lostNow = c.phase === 'wrong' || c.phase === 'redeeming' || (c.phase === 'redeemed' && !c.redeem?.correct);
    const lives = progress.lives - (lostNow ? 1 : 0);
    const streakNow = c.phase === 'correct' ? progress.streak + 1 : DONE_PHASES.includes(c.phase) || c.phase === 'redeeming' ? 0 : progress.streak;
    const score = progress.score + c.points;
    const level = levelOf(run.index + 1);

    if (run.onBreak) {
      body = (
        <LevelBreak
          brk={run.onBreak}
          score={progress.score}
          lives={progress.lives}
          starting={starting}
          onContinue={continueLevel}
          onFinish={finishAtBreak}
          onHome={goHome}
          onRestart={restartRun}
        />
      );
    } else {
      const levelSize = levelSizeOf(run, level);
      const step = run.index - (level - 1) * LEVEL_SIZE + 1;
      const nextLabel =
        lives <= 0 || (step === levelSize && levelSize < LEVEL_SIZE)
          ? 'See your run'
          : step === LEVEL_SIZE
            ? `Finish level ${level}`
            : 'Next question';
      body = (
        <QuestionScreen
          key={`${run.id}-${run.index}-${currentId}`}
          question={viewOf(question, orderOf(currentId))}
          label={labelFor(question)}
          play={{ level, step, levelSize, lives, score, combo: comboMultiplier(streakNow) }}
          current={{ ...c, chosenIndex: toDisplay(orderOf(currentId), c.chosenIndex) }}
          streak={streakNow}
          lives={lives}
          nextLabel={nextLabel}
          canRedeem={canRedeem && c.phase !== 'redeemed'}
          flagged={flagged(question.id)}
          onHint={takeHint}
          onShare={() => shareQuestion(question, c.phase === 'correct')}
          onAnswer={answer}
          onOpenRedeem={openRedeem}
          onNext={next}
          onHome={goHome}
          onRestart={restartRun}
          onFlag={() =>
            openFlag({
              questionId: question.id,
              chosenIndex: c.chosenIndex,
              wasCorrect: c.phase === 'correct',
            })
          }
          onExplain={() =>
            setExplaining({
              questionId: question.id,
              wasCorrect: c.phase === 'correct',
              chosenIndex: c.chosenIndex,
            })
          }
        />
      );
    }
  } else if (screen === 'legend' && run?.finishedAt && run.endReason === 'legend') {
    const summary = progress ?? { score: 0 };
    const pictures = run.order
      .map((id) => run.questions[id]?.image)
      .filter((img) => img && showsImage(img))
      .map((img) => img.thumb ?? img.src);
    body = (
      <LegendFinale
        lastLevel={plan.lastLevel}
        score={summary.score}
        durationMs={run.finishedAt - run.startedAt}
        pictures={pictures}
        name={boards.player?.name ?? localName}
        legends={legends.legends}
        signed={Boolean(run.legendSigned)}
        onSign={putOnLegends}
        onFeedback={() => setFeedbackFor({ runId: run.id })}
        onContinue={() => enter('end')}
      />
    );
  } else if (screen === 'profile') {
    body = (
      <ProfileScreen
        name={boards.player?.name ?? localName}
        badges={collection.badges}
        badgeList={BADGE_LIST}
        whysCount={collection.uncovered.length}
        onRename={() => setRenaming(true)}
        onHome={goHome}
        onCollection={() => enter('whys')}
        onSuggest={() => enter('suggest')}
        onFeedback={() => setFeedbackFor({ runId: null })}
      />
    );
  } else if (screen === 'shared' && shared) {
    body = sharedQuestion ? (
      <SharedQuestion
        question={sharedQuestion}
        label={labelFor(sharedQuestion)}
        from={shared.from}
        starting={starting}
        onAnswered={(chosenIndex, correct) => {
          setShared((x) => ({ ...x, chosenIndex, correct }));
          markSeen([shared.id]);
          uncovered(shared.id);
          track('share_answered', { data: { questionId: shared.id, correct } });
        }}
        onExplain={(chosenIndex, correct) => setExplaining({ questionId: shared.id, wasCorrect: correct, chosenIndex })}
        onPlay={startRun}
        onShare={(correct) => shareQuestion(sharedQuestion, correct)}
        onHome={goHome}
      />
    ) : (
      <div className="page">
        <main className="stage">
          <p className="muted shared-loading">Getting the question…</p>
        </main>
      </div>
    );
  } else if (screen === 'suggest') {
    body = <SuggestScreen placeholder={placeholderName()} onHome={goHome} />;
  } else if (screen === 'end' && run?.finishedAt) {
    body = (
      <EndScreen
        run={run}
        questionsById={questionsById}
        boards={boards}
        knownName={boards.player?.name ?? localName}
        signing={signing}
        signResult={run.signed ? { ok: true, ...run.signed } : signError ? { ok: false, error: signError } : null}
        starting={starting}
        onSign={signScore}
        onHome={goHome}
        onCollection={() => enter('whys')}
        onRate={(rating) => setFeedbackFor({ runId: run.id, rating })}
        onSuggest={() => enter('suggest')}
        onExplain={(result) =>
          setExplaining({ questionId: result.id, wasCorrect: result.correct, chosenIndex: result.chosenIndex })
        }
        onPlayAgain={startRun}
      />
    );
  } else if (screen === 'whys') {
    body = (
      <WhysScreen
        uncovered={collection.uncovered}
        questionsById={questionsById}
        total={bank.questions.length}
        badges={collection.badges}
        badgeList={BADGE_LIST}
        labelFor={labelFor}
        starting={starting}
        onStart={startRun}
        onHome={goHome}
        onExplain={(id) => setExplaining({ questionId: id, wasCorrect: true, chosenIndex: null, fromCollection: true })}
      />
    );
  } else {
    const inRun = run && !run.finishedAt;
    const resume = inRun
      ? run.onBreak
        ? `Continue to level ${run.onBreak.level + 1}`
        : `Continue level ${levelOf(run.index + 1)}`
      : null;
    body = (
      <HomeScreen
        resume={resume}
        boards={boards}
        legends={legends}
        starting={starting}
        player={{ name: boards.player?.name ?? localName, changesLeft: boards.player ? boards.player.nameChangesLeft : null }}
        progress={{
          best,
          whys: collection.uncovered.length,
          streak,
          badges: Object.keys(collection.badges).filter((id) => BADGE_LIST.some((b) => b.id === id)).length,
          badgeTotal: BADGE_LIST.length,
        }}
        themes={bank.themes}
        chosenThemes={chosenThemes}
        questions={bank.questions}
        dailyFlagged={dailyFlagged}
        onStart={startRun}
        onResume={resumeRun}
        onOpenProfile={() => enter('profile')}
        onEditName={() => setRenaming(true)}
        onSignLegend={run?.endReason === 'legend' && !run.legendSigned ? () => enter('legend') : null}
        onChooseThemes={() => setPickingTopics(true)}
        onFlagDaily={openFlag}
        onStreak={onStreak}
        onCollection={() => enter('whys')}
        onPlayQuestion={(id) => restartRun(id)}
        onSuggest={() => enter('suggest')}
        onRate={() => setFeedbackFor({ runId: null })}
        onShareDaily={shareDaily}
        focusDaily={arrival?.kind === 'daily'}
      />
    );
  }

  const redeem = run?.current?.redeem;
  const pickedOrder = redeem?.pickedId ? orderOf(redeem.pickedId) : null;
  const explainQuestion = explaining ? questionsById[explaining.questionId] : null;

  return (
    <>
      {testMode && (
        <div className="test-banner" role="note">
          <span>Test mode. Everything here is kept apart from real players' numbers.</span>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              exitTestMode();
              window.location.assign('/');
            }}
          >
            Leave test mode
          </button>
        </div>
      )}
      {body}
      {explaining && explainQuestion && (
        <ExplainModal
          question={viewOf(explainQuestion, orderOf(explaining.questionId))}
          wasCorrect={explaining.wasCorrect}
          chosenIndex={toDisplay(orderOf(explaining.questionId), explaining.chosenIndex)}
          flagged={flagged(explaining.questionId)}
          onFlag={
            run && !explaining.fromCollection
              ? () =>
                  openFlag({
                    questionId: explaining.questionId,
                    chosenIndex: explaining.chosenIndex,
                    wasCorrect: explaining.wasCorrect,
                  })
              : null
          }
          onClose={closeExplain}
        />
      )}
      {flagging && (
        <FlagModal
          question={flagging.question ?? questionsById[flagging.questionId]}
          wasCorrect={flagging.wasCorrect}
          onSubmit={submitFlag}
          onClose={() => setFlagging(null)}
        />
      )}
      {screen === 'play' && redeemOpen && redeem && (
        <RedeemModal
          offered={redeem.offered.map((id) => viewOf(run.questions[id], orderOf(id)))}
          redeem={{ ...redeem, chosenIndex: toDisplay(pickedOrder, redeem.chosenIndex) }}
          lastLife={Boolean(progress) && progress.lives <= 1}
          labelFor={labelFor}
          flagged={flagged(redeem.pickedId)}
          onFlag={(picked) =>
            openFlag({ questionId: picked.id, chosenIndex: redeem.chosenIndex, wasCorrect: redeem.correct === true })
          }
          onPick={pickRedeem}
          onBack={backToChoices}
          onAnswer={answerRedeem}
          onClose={closeRedeem}
        />
      )}
      {renaming && (
        <RenameModal
          name={boards.player?.name ?? localName}
          changesLeft={boards.player ? boards.player.nameChangesLeft : null}
          onSave={rename}
          onClose={() => setRenaming(false)}
        />
      )}
      {feedbackFor && <FeedbackForm runId={feedbackFor.runId} initialRating={feedbackFor.rating ?? null} onClose={() => setFeedbackFor(null)} />}
      {pickingTopics && (
        <TopicPicker themes={bank.themes} chosen={chosenThemes} onSave={saveTopics} onClose={() => setPickingTopics(false)} />
      )}
      {toast && (
        <Toast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          duration={toast.duration}
          onDone={clearToast}
        />
      )}
    </>
  );
}
