function emptyStats() {
  return { asked: 0, correct: 0, timeMs: 0, hints: 0, wrong: 0, redeems: 0, redeemPasses: 0, points: 0 };
}

function add(stats, answer) {
  stats.asked += 1;
  if (answer.correct) stats.correct += 1;
  else stats.wrong += 1;
  stats.timeMs += answer.timeToAnswerMs ?? 0;
  if (answer.hintUsed) stats.hints += 1;
  if (answer.redeemUsed) stats.redeems += 1;
  if (answer.redeemPassed) stats.redeemPasses += 1;
  stats.points += answer.points ?? 0;
}

const ratio = (a, b) => (b > 0 ? a / b : null);

function finish(stats) {
  return {
    asked: stats.asked,
    percentCorrect: ratio(stats.correct, stats.asked),
    avgTimeSeconds: ratio(stats.timeMs / 1000, stats.asked),
    hintRate: ratio(stats.hints, stats.asked),
    // Redeem is only offered on wrong answers, so the rate is out of wrong answers.
    redeemRate: ratio(stats.redeems, stats.wrong),
    redeemPassRate: ratio(stats.redeemPasses, stats.redeems),
    avgPoints: ratio(stats.points, stats.asked),
  };
}

export function summarize(sessions) {
  const byQuestion = new Map();
  const byTopic = new Map();
  const topicSessionPoints = new Map();
  // How often each question was offered, and picked, as a redeem question.
  const redeemUse = new Map();
  const useOf = (id) => {
    if (!redeemUse.has(id)) redeemUse.set(id, { offered: 0, picked: 0, pickedRight: 0 });
    return redeemUse.get(id);
  };

  for (const session of sessions) {
    const pointsThisSession = new Map();
    for (const answer of session.questions ?? []) {
      if (!byQuestion.has(answer.id)) byQuestion.set(answer.id, { id: answer.id, topic: answer.topic, stats: emptyStats() });
      if (!byTopic.has(answer.topic)) byTopic.set(answer.topic, emptyStats());
      add(byQuestion.get(answer.id).stats, answer);
      add(byTopic.get(answer.topic), answer);
      pointsThisSession.set(answer.topic, (pointsThisSession.get(answer.topic) ?? 0) + (answer.points ?? 0));
      for (const id of answer.redeemOffered ?? []) useOf(id).offered += 1;
      if (answer.redeemQuestionId) {
        useOf(answer.redeemQuestionId).picked += 1;
        if (answer.redeemPassed) useOf(answer.redeemQuestionId).pickedRight += 1;
      }
    }
    for (const [topic, points] of pointsThisSession) {
      if (!topicSessionPoints.has(topic)) topicSessionPoints.set(topic, []);
      topicSessionPoints.get(topic).push(points);
    }
  }

  const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

  return {
    sessionCount: sessions.length,
    avgSessionScore: avg(sessions.map((s) => s.totalScore ?? 0)),
    avgDurationSeconds: avg(sessions.map((s) => (s.durationMs ?? 0) / 1000)),
    questions: [...byQuestion.values()]
      .map((q) => ({ id: q.id, topic: q.topic, ...finish(q.stats) }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    topics: [...byTopic.entries()]
      .map(([topic, stats]) => ({
        topic,
        ...finish(stats),
        avgSessionScore: avg(topicSessionPoints.get(topic) ?? []),
      }))
      .sort((a, b) => a.topic.localeCompare(b.topic)),
    redeemUse: Object.fromEntries(redeemUse),
  };
}

const CSV_COLUMNS = [
  'session_id',
  'session_timestamp',
  'session_total_score',
  'session_duration_ms',
  'position',
  'question_id',
  'topic',
  'chosen_index',
  'correct',
  'time_to_answer_ms',
  'elapsed_with_hint_s',
  'hint_used',
  'redeem_used',
  'redeem_passed',
  'redeem_offered_ids',
  'redeem_question_id',
  'redeem_chosen_index',
  'points',
];

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function sessionsToCsv(sessions) {
  const rows = [CSV_COLUMNS.join(',')];
  for (const s of sessions) {
    for (const a of s.questions ?? []) {
      rows.push(
        [
          s.id,
          s.timestamp,
          s.totalScore,
          s.durationMs,
          a.position,
          a.id,
          a.topic,
          a.chosenIndex,
          a.correct,
          a.timeToAnswerMs,
          a.elapsedSeconds,
          a.hintUsed,
          a.redeemUsed,
          a.redeemPassed,
          (a.redeemOffered ?? []).join(' '),
          a.redeemQuestionId,
          a.redeemChosenIndex,
          a.points,
        ]
          .map(csvCell)
          .join(','),
      );
    }
  }
  return rows.join('\n');
}
