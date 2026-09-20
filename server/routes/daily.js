// Public: the question of the day.
//
// GET  ?day=YYYY-MM-DD&deviceId&test -> { day, question, answer, me }
// POST { day, deviceId, chosenIndex, timeMs, test } -> same shape, answered
//
// The day is the player's own date. Each day takes the next question from
// the daily queue the first time anyone opens it, so it's the same question
// for everyone that day, it never repeats, and a day nobody visits doesn't
// use one up. Daily questions never appear in runs.
//
// The answer is checked here, not in the browser: the question is sent
// without its answer or explanations, which come back only after answering.
// One answer per device per day (test mode can answer again).
import { sql } from '../db.js';
import { ensureSchema, asObject, isoTime } from '../schema.js';
import { body, isDay, isId, methodNotAllowed, serverError } from '../http.js';
import { hit, tooMany } from '../limits.js';
import { computeStreak, isPlausibleDay } from '../../src/lib/daily.js';

async function scheduled(day) {
  const { rows } = await sql`
    SELECT s.question_id, s.is_void, q.data, q.updated_at
    FROM daily_schedule s JOIN questions q ON q.id = s.question_id
    WHERE s.day = ${day}::date
  `;
  return rows[0] ?? null;
}

// Gives the day its question if it doesn't have one yet. Two days asking at
// once can race for the same queued question; the loser simply tries again.
async function questionFor(day) {
  let row = await scheduled(day);
  for (let attempt = 0; !row && attempt < 3; attempt++) {
    const { rows } = await sql`
      INSERT INTO daily_schedule (day, question_id)
      SELECT ${day}::date, id FROM questions
      WHERE kind = 'daily' AND status = 'queued'
      ORDER BY position NULLS LAST, created_at, id
      LIMIT 1
      ON CONFLICT DO NOTHING
      RETURNING question_id
    `;
    if (rows[0]) await sql`UPDATE questions SET status = 'used' WHERE id = ${rows[0].question_id}`;
    row = await scheduled(day);
    if (!row && !rows[0]) {
      const { rows: left } = await sql`SELECT 1 FROM questions WHERE kind = 'daily' AND status = 'queued' LIMIT 1`;
      if (!left.length) break; // The queue is empty: no question today.
    }
  }
  return row;
}

// What a player sees before answering: no answer, no explanations.
function unanswered(row) {
  const q = asObject(row.data);
  return {
    id: row.question_id,
    stem: q.stem,
    options: q.options,
    image: q.image ?? null,
    themes: q.themes ?? [],
    updatedAt: isoTime(row.updated_at),
  };
}

async function reveal(row, day, answerRow) {
  const q = asObject(row.data);
  const { rows } = await sql`
    SELECT count(*)::int AS answered, count(*) FILTER (WHERE correct)::int AS right_count
    FROM daily_answers WHERE day = ${day}::date AND NOT is_test
  `;
  const { answered, right_count: right } = rows[0];
  return {
    chosenIndex: answerRow.chosen_index,
    correct: answerRow.correct,
    correctIndex: q.correctIndex,
    explanationRight: q.explanationRight,
    explanationWrong: q.explanationWrong,
    confidence: q.confidence,
    sourceName: q.sourceName,
    sourceUrl: q.sourceUrl,
    everyone: { answered, percentRight: answered ? Math.round((right / answered) * 100) : null },
  };
}

// Streak and average for this device. Days with no question, and voided
// days, never break a streak (see computeStreak).
async function statsFor(deviceId, isTest, today) {
  if (!deviceId) return null;
  const { rows: answers } = await sql`
    SELECT a.day::text AS day, a.correct, s.is_void AS "isVoid"
    FROM daily_answers a JOIN daily_schedule s ON s.day = a.day
    WHERE a.device_id = ${deviceId} AND a.is_test = ${isTest}
    ORDER BY a.day DESC LIMIT 400
  `;
  const { rows: days } = await sql`
    SELECT day::text AS day, is_void AS "isVoid" FROM daily_schedule WHERE day <= ${today}::date ORDER BY day DESC LIMIT 400
  `;
  const counted = answers.filter((a) => !a.isVoid);
  return {
    streak: computeStreak(days, new Set(answers.map((a) => a.day)), today),
    answered: answers.length,
    averageCorrect: counted.length ? Math.round((counted.filter((a) => a.correct).length / counted.length) * 100) : null,
  };
}

async function state(day, deviceId, isTest) {
  const row = await questionFor(day);
  const me = await statsFor(deviceId, isTest, day);
  if (!row) return { day, question: null, answer: null, me };
  let answer = null;
  if (deviceId) {
    const { rows } = await sql`
      SELECT chosen_index, correct FROM daily_answers WHERE device_id = ${deviceId} AND day = ${day}::date AND is_test = ${isTest}
    `;
    if (rows[0]) answer = await reveal(row, day, rows[0]);
  }
  return { day, question: unanswered(row), answer, me, isVoid: row.is_void };
}

export default async function handler(req, res) {
  try {
    const input = req.method === 'GET' ? req.query ?? {} : body(req);
    const day = input.day;
    if (!isDay(day) || !isPlausibleDay(day)) return res.status(400).json({ error: 'invalid day' });
    const deviceId = isId(input.deviceId) ? input.deviceId : null;
    const isTest = input.test === true || input.test === '1';

    await ensureSchema();
    if (!(await hit(req, 'daily'))) return tooMany(res);

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(await state(day, deviceId, isTest));
    }

    if (req.method === 'POST') {
      const chosen = input.chosenIndex;
      if (!deviceId || !Number.isInteger(chosen) || chosen < 0 || chosen > 3) return res.status(400).json({ error: 'invalid answer' });
      const row = await questionFor(day);
      if (!row) return res.status(404).json({ error: 'No question today.' });
      const correct = chosen === asObject(row.data).correctIndex;
      const timeMs = Number.isInteger(input.timeMs) && input.timeMs >= 0 ? Math.min(input.timeMs, 86400000) : null;
      if (isTest) {
        await sql`
          INSERT INTO daily_answers (device_id, day, is_test, question_id, chosen_index, correct, time_ms)
          VALUES (${deviceId}, ${day}::date, true, ${row.question_id}, ${chosen}, ${correct}, ${timeMs})
          ON CONFLICT (device_id, day, is_test) DO UPDATE SET
            chosen_index = EXCLUDED.chosen_index, correct = EXCLUDED.correct, time_ms = EXCLUDED.time_ms, answered_at = now()
        `;
      } else {
        await sql`
          INSERT INTO daily_answers (device_id, day, is_test, question_id, chosen_index, correct, time_ms)
          VALUES (${deviceId}, ${day}::date, false, ${row.question_id}, ${chosen}, ${correct}, ${timeMs})
          ON CONFLICT (device_id, day, is_test) DO NOTHING
        `;
      }
      return res.status(200).json(await state(day, deviceId, isTest));
    }

    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (err) {
    return serverError(res, err);
  }
}
