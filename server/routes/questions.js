// Public: the live question bank the quiz plays from, and the topics players
// can pick. GET -> { questions, themes }
// Hidden, pending and rejected questions, and daily questions, never reach
// players this way.
import { sql } from '../db.js';
import { ensureSchema, toPublicQuestion, loadThemes } from '../schema.js';
import { methodNotAllowed, serverError } from '../http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM questions WHERE kind = 'run' AND status = 'live' ORDER BY id`;
    const themes = await loadThemes();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ questions: rows.map(toPublicQuestion), themes });
  } catch (err) {
    return serverError(res, err);
  }
}
