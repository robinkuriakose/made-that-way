// Public: a player suggests a question. POST { deviceId, name, kind, data, test }
// kind is quick (one line) or full (question, answers, hint, source,
// picture). Checked by the same rules as the form (src/lib/suggestions.js),
// then waits in the builder's Suggestions tab.
import { randomUUID } from 'node:crypto';
import { sql } from '../../db.js';
import { ensureSchema } from '../../schema.js';
import { body, isId, methodNotAllowed, serverError, sizeOf } from '../../http.js';
import { hit, tooMany } from '../../limits.js';
import { cleanSuggestion } from '../../../src/lib/suggestions.js';
import { cleanName, isTestName, nameProblem } from '../../../src/lib/names.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const b = body(req);
    if (sizeOf(b) > 8000 || !isId(b.deviceId)) return res.status(400).json({ error: 'invalid request' });
    const name = cleanName(b.name);
    if (!name) return res.status(400).json({ error: 'Add a name, or be mysterious.' });
    const problem = nameProblem(name);
    if (problem) return res.status(422).json({ error: problem });
    const clean = cleanSuggestion(b.kind, b.data);
    if (clean.error) return res.status(422).json({ error: clean.error });
    await ensureSchema();
    if (!(await hit(req, 'suggest'))) return tooMany(res);
    const id = randomUUID();
    await sql`
      INSERT INTO suggestions (id, device_id, name, kind, data, is_test)
      VALUES (${id}, ${b.deviceId}, ${name}, ${b.kind}, ${JSON.stringify(clean.data)}::jsonb, ${b.test === true || isTestName(name)})
    `;
    return res.status(200).json({ ok: true, id });
  } catch (err) {
    return serverError(res, err);
  }
}
