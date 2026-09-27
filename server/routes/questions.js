// Public: the live question bank the quiz plays from, and the topics players
// can pick. GET -> { questions, themes }
// Each question carries stats = { asked, right } from real players' verified
// runs, which levels use to put easier questions first.
// Hidden, pending and rejected questions, and daily questions, never reach
// players this way.
import { sql } from '../db.js';
import { ensureSchema, toPublicQuestion, loadThemes } from '../schema.js';
import { methodNotAllowed, serverError } from '../http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT q.*, coalesce(s.asked, 0) AS stats_asked, coalesce(s.right_count, 0) AS stats_right
      FROM questions q LEFT JOIN question_stats s ON s.question_id = q.id AND NOT s.is_test
      WHERE q.kind = 'run' AND q.status = 'live'
      ORDER BY q.id
    `;
    const themes = await loadThemes();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      questions: rows.map((r) => ({ ...toPublicQuestion(r), stats: { asked: Number(r.stats_asked), right: Number(r.stats_right) } })),
      themes,
    });
  } catch (err) {
    return serverError(res, err);
  }
}
