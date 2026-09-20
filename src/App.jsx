import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildRun, planTidbit, replacementFor, WRONG_STREAK_FOR_TIDBIT } from './lib/run.js';
import { pointBand, redeemPoints, HINT_PENALTY_SECONDS } from './lib/scoring.js';
import { pickRedeemQuestions, REDEEM_CHOICES } from './lib/redeem.js';
import { loadRun, saveRun } from './lib/runStore.js';
import { recordSession } from './lib/storage.js';
import { readBoards, signRun, renamePlayer, readLocalName, writeLocalName } from './lib/leaderboard.js';
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
import HomeScreen from './components/HomeScreen.jsx';
import QuestionScreen from './components/QuestionScreen.jsx';
import TidbitScreen from './components/TidbitScreen.jsx';
import EndScreen from './components/EndScreen.jsx';
import ExplainModal from './components/ExplainModal.jsx';
import RedeemModal from './components/RedeemModal.jsx';
import FlagModal from './components/FlagModal.jsx';
import TopicPicker from './components/TopicPicker.jsx';
import Toast from './components/Toast.jsx';

// Bumped when the saved run's shape changes, so an old saved run is dropped
// instead of crashing. v4: shuffled options, chosen topics, swapped questions.
const RUN_VERSION = 4;
const DONE_PHASES = ['correct', 'wrong', 'redeemed'];
const EMPTY_BOARDS = { allTime: { entries: [], me: null }, week: { entries: [], me: null }, player: null };

function freshQuestionState(startClock) {
  return {
    startedAt: startClock ? Date.now() : null,
    hintUsed: false,
    phase: 'answering',
    chosenIndex: null,
    timeToAnswerMs: null,
    elapsedSeconds: null,
    band: null,
    redeem: null,
    points: 0,
  };
}

const byIdOf = (list) => Object.fromEntries(list.map((q) => [q.id, q]));
const ordersFor = (ids) => Object.fromEntries(ids.map((id) => [id, optionOrder()]));

// A run keeps its own copy of every question it shows (so it stays playable
// and reviewable even if the bank changes underneath it), and the order each
// question's options are shown in. Answers are always recorded in the
// question's original option order; see lib/shuffle.js.
function createRun(bank, themeIds) {
  const order = buildRun(bank.questions, bank.tidbits, Math.random, { themeIds, seen: new Set(seenIds()) });
  const byId = byIdOf(bank.questions);
  return {
    version: RUN_VERSION,
    id: makeId(),
    startedAt: Date.now(),
    themeIds: themeIds ?? null,
    order,
    questions: Object.fromEntries(order.map((id) => [id, byId[id]])),
    optionOrders: ordersFor(order),
    index: 0,
    results: [],
    current: freshQuestionState(true),
    wrongStreak: 0,
    pending: null,
    tidbitOnScreen: null,
    tidbitsShown: [],
    redeemOffered: [],
    swapped: [],
    flags: {},
    finishedAt: null,
    signed: null,
  };
}

function runTidbits(run) {
  return splitTidbits(Object.values(run.questions)).tidbits;
}

// A saved run is only usable if it's the current shape and has every
// question it points at.
function isUsableRun(run) {
  if (!run || run.version !== RUN_VERSION || !Array.isArray(run.order) || !run.questions || !run.optionOrders) return false;
  const has = (id) => Boolean(run.questions[id]);
  return (
    run.order.every(has) &&
    (!run.tidbitOnScreen || runTidbits(run).some((t) => t.id === run.tidbitOnScreen)) &&
    (!run.current?.redeem || run.current.redeem.offered.every(has))
  );
}

function sumPoints(results) {
  return results.reduce((total, r) => total + r.points, 0);
}

function toSession(run) {
  return {
    id: run.id,
    deviceId: getDeviceId(),
    timestamp: new Date(run.startedAt).toISOString(),
    finishedAt: new Date(run.finishedAt).toISOString(),
    totalScore: sumPoints(run.results),
    durationMs: run.finishedAt - run.startedAt,
    themes: run.themeIds,
    tidbitsShown: run.tidbitsShown,
    swapped: run.swapped,
    questions: run.results,
  };
}

export default function App() {
  const testMode = useMemo(() => isTestMode(), []);
  const [bank, setBank] = useState(initialBank);
  const bankRef = useRef(bank);
  const liveBank = useRef(null);
  const [starting, setStarting] = useState(false);

  const [run, setRun] = useState(() => {
    const saved = loadRun();
    return isUsableRun(saved) ? saved : null;
  });
  const [screen, setScreen] = useState(() => (run?.finishedAt ? 'end' : 'home'));
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

  useEffect(() => {
    saveRun(run);
  }, [run]);

  useEffect(() => {
    readBoards().then(setBoards);
    track('page_opened', { data: { device: screenKind() } });
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

  // Remember what's been shown, so later runs prefer questions not seen yet.
  useEffect(() => {
    if (screen === 'play' && currentId && !run?.tidbitOnScreen) markSeen([currentId]);
  }, [screen, currentId, run?.tidbitOnScreen]);

  // Navigation. Play and the end screen each get a history entry, so the
  // phone's Back button (or the browser's) returns to the home screen
  // instead of leaving the site.
  const showHome = useCallback(() => {
    const r = runRef.current;
    if (screenRef.current === 'play' && r && !r.finishedAt) track('run_left', { runId: r.id, data: { position: r.index + 1 } });
    setExplaining(null);
    setFlagging(null);
    setRedeemOpen(false);
    setScreen('home');
    readBoards().then(setBoards);
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

  async function startRun() {
    if (starting) return null;
    const previous = runRef.current;
    setStarting(true);
    setExplaining(null);
    setFlagging(null);
    setRedeemOpen(false);
    // Waits for the live bank only if it's still on its way, and never past
    // the 3 second limit (see lib/questionBank.js).
    const live = await liveBank.current;
    const next = createRun(live ?? bankRef.current, chosenThemes);
    if (previous && !previous.finishedAt) track('run_restarted', { runId: previous.id, data: { position: previous.index + 1 } });
    track('run_started', { runId: next.id, data: next.themeIds ? { themes: next.themeIds } : {} });
    setRun(next);
    setSignError(null);
    enter('play');
    setStarting(false);
    return previous;
  }

  // Restart goes straight to a new run from question 1, with a few seconds
  // to undo it instead of an "are you sure?" in the way.
  async function restartRun() {
    const previous = await startRun();
    if (!previous || previous.finishedAt) return;
    setToast({
      message: 'New quiz started.',
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
    if (r.current.phase === 'answering' && !r.tidbitOnScreen) {
      const replacedId = r.order[r.index];
      const newId = replacementFor({
        replacedId,
        runIds: r.order,
        excludeIds: r.redeemOffered,
        questions: bankRef.current.questions,
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
          pending: r.pending?.seededIndex === r.index ? null : r.pending,
          current: freshQuestionState(true),
        };
      } else {
        // Nothing left to swap in (a tiny bank): carry on with a fresh clock.
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
    const timeToAnswerMs = Date.now() - c.startedAt;
    const elapsedSeconds = timeToAnswerMs / 1000 + (c.hintUsed ? HINT_PENALTY_SECONDS : 0);
    const band = pointBand(elapsedSeconds);
    const correct = chosen === question.correctIndex;
    patchCurrent({
      phase: correct ? 'correct' : 'wrong',
      chosenIndex: chosen,
      timeToAnswerMs,
      elapsedSeconds,
      band,
      points: correct ? band : 0,
    });
  }

  // The three offered questions are chosen once per question and kept, so
  // closing and reopening the modal can't be used to reroll them.
  function openRedeem() {
    const c = run.current;
    if (c.phase !== 'wrong' || !canRedeem) return;
    const offered =
      c.redeem?.offered ??
      pickRedeemQuestions({ missed: question, questions: bank.questions, runIds: run.order, alreadyOffered: run.redeemOffered });
    const bankById = byIdOf(bank.questions);
    const fresh = offered.filter((id) => !run.questions[id]);
    setRun((r) => ({
      ...r,
      questions: { ...r.questions, ...Object.fromEntries(fresh.map((id) => [id, bankById[id]])) },
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

  function answerRedeem(displayIndex) {
    const c = run.current;
    if (c.phase !== 'redeeming' || !c.redeem?.pickedId) return;
    const pickedId = c.redeem.pickedId;
    const chosen = toOriginal(orderOf(pickedId), displayIndex);
    const correct = chosen === run.questions[pickedId].correctIndex;
    setRun((r) => ({
      ...r,
      current: {
        ...r.current,
        phase: 'redeemed',
        points: correct ? redeemPoints(r.current.band) : 0,
        redeem: { ...r.current.redeem, chosenIndex: chosen, correct },
      },
    }));
  }

  function next() {
    const c = run.current;
    if (!DONE_PHASES.includes(c.phase)) return;
    setRedeemOpen(false);

    const record = {
      id: question.id,
      topic: question.topic,
      position: run.index + 1,
      chosenIndex: c.chosenIndex,
      correct: c.phase === 'correct',
      timeToAnswerMs: Math.round(c.timeToAnswerMs),
      elapsedSeconds: Math.round(c.elapsedSeconds * 10) / 10,
      hintUsed: c.hintUsed,
      redeemUsed: c.phase === 'redeemed',
      redeemPassed: c.phase === 'redeemed' && c.redeem?.correct === true,
      redeemOffered: c.redeem?.offered ?? null,
      redeemQuestionId: c.phase === 'redeemed' ? c.redeem.pickedId : null,
      redeemChosenIndex: c.phase === 'redeemed' ? c.redeem.chosenIndex : null,
      points: c.points,
    };
    const results = [...run.results, record];
    const wrongStreak = record.correct ? 0 : run.wrongStreak + 1;
    // A pending tidbit is resolved once its seeded question has been answered.
    const pending = run.pending && run.pending.seededIndex <= run.index ? null : run.pending;

    if (run.index >= run.order.length - 1) {
      const finished = { ...run, results, wrongStreak, pending, finishedAt: Date.now() };
      setRun(finished);
      recordSession(toSession(finished));
      enter('end');
      return;
    }

    let order = run.order;
    let nextPending = pending;
    let nextStreak = wrongStreak;
    let tidbitOnScreen = null;
    let tidbitsShown = run.tidbitsShown;

    if (!pending && wrongStreak >= WRONG_STREAK_FOR_TIDBIT) {
      const plan = planTidbit({
        order,
        afterIndex: run.index,
        missedIds: results.slice(-WRONG_STREAK_FOR_TIDBIT).map((r) => r.id),
        questionsById: run.questions,
        tidbits: runTidbits(run),
        usedTidbitIds: run.tidbitsShown.map((t) => t.tidbitId),
      });
      if (plan) {
        order = plan.order;
        nextPending = { tidbitId: plan.tidbit.id, seededIndex: plan.seededIndex };
        nextStreak = 0;
        tidbitOnScreen = plan.tidbit.id;
        tidbitsShown = [
          ...tidbitsShown,
          {
            tidbitId: plan.tidbit.id,
            shownAfterPosition: run.index + 1,
            seededQuestionId: plan.tidbit.tidbitFor,
            seededPosition: plan.seededIndex + 1,
          },
        ];
      }
    }

    setRun({
      ...run,
      order,
      results,
      wrongStreak: nextStreak,
      pending: nextPending,
      tidbitOnScreen,
      tidbitsShown,
      index: run.index + 1,
      current: freshQuestionState(!tidbitOnScreen),
    });
  }

  function continueFromTidbit() {
    setRun((r) => ({ ...r, tidbitOnScreen: null, current: { ...r.current, startedAt: Date.now() } }));
  }

  async function signScore(name) {
    setSigning(true);
    setSignError(null);
    const result = await signRun({ runId: run.id, name });
    setSigning(false);
    if (!result.ok) {
      setSignError(result.error);
      return;
    }
    setRun((r) => ({ ...r, signed: { isNewBest: result.isNewBest, isTest: result.isTest } }));
    setLocalName(readLocalName());
    setBoards(await readBoards());
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

  // Enough unasked questions outside the run to offer a full set of three.
  const canRedeem = Boolean(
    run && (run.current.redeem || bank.questions.length - run.order.length >= REDEEM_CHOICES),
  );
  const flagged = (id) => Boolean(run?.flags?.[id]);

  let body;
  if (screen === 'play' && run && !run.finishedAt) {
    const score = sumPoints(run.results) + run.current.points;
    if (run.tidbitOnScreen) {
      body = (
        <TidbitScreen
          tidbit={runTidbits(run).find((t) => t.id === run.tidbitOnScreen)}
          position={run.index + 1}
          total={run.order.length}
          score={score}
          onContinue={continueFromTidbit}
          onHome={goHome}
          onRestart={restartRun}
        />
      );
    } else {
      body = (
        <QuestionScreen
          key={`${run.id}-${run.index}-${currentId}`}
          question={viewOf(question, orderOf(currentId))}
          label={labelFor(question)}
          position={run.index + 1}
          total={run.order.length}
          score={score}
          current={{ ...run.current, chosenIndex: toDisplay(orderOf(currentId), run.current.chosenIndex) }}
          isLast={run.index === run.order.length - 1}
          canRedeem={canRedeem && run.current.phase !== 'redeemed'}
          flagged={flagged(question.id)}
          onHint={takeHint}
          onAnswer={answer}
          onOpenRedeem={openRedeem}
          onNext={next}
          onHome={goHome}
          onRestart={restartRun}
          onFlag={() =>
            openFlag({
              questionId: question.id,
              chosenIndex: run.current.chosenIndex,
              wasCorrect: run.current.phase === 'correct',
            })
          }
          onExplain={() =>
            setExplaining({
              questionId: question.id,
              wasCorrect: run.current.phase === 'correct',
              chosenIndex: run.current.chosenIndex,
            })
          }
        />
      );
    }
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
        onExplain={(result) =>
          setExplaining({ questionId: result.id, wasCorrect: result.correct, chosenIndex: result.chosenIndex })
        }
        onPlayAgain={startRun}
      />
    );
  } else {
    const canResume = Boolean(run && !run.finishedAt);
    body = (
      <HomeScreen
        canResume={canResume}
        resumePosition={canResume ? run.index + 1 : null}
        total={run?.order.length}
        boards={boards}
        starting={starting}
        player={{ name: boards.player?.name ?? localName, changesLeft: boards.player ? boards.player.nameChangesLeft : null }}
        themes={bank.themes}
        chosenThemes={chosenThemes}
        questions={bank.questions}
        dailyFlagged={dailyFlagged}
        onStart={startRun}
        onResume={resumeRun}
        onRename={rename}
        onChooseThemes={() => setPickingTopics(true)}
        onFlagDaily={openFlag}
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
            run
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
          pointsAvailable={redeemPoints(run.current.band ?? 0)}
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
      {pickingTopics && (
        <TopicPicker themes={bank.themes} chosen={chosenThemes} onSave={saveTopics} onClose={() => setPickingTopics(false)} />
      )}
      {toast && (
        <Toast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onDone={clearToast}
        />
      )}
    </>
  );
}
