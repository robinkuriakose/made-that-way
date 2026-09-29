// Every table the app uses, created on first use, plus seeding.
//
// Content: the `questions` table is the source of truth once the site is
// live. On the very first run it's filled from src/data/questions.json. New
// questions in src/data/pending-questions.json arrive as "pending" (for the
// builder's review queue) and src/data/daily-questions.json feeds the daily
// queue. Existing rows are never overwritten by any file: after launch,
// content is edited in the builder. Changes Claude proposes to existing
// questions (src/data/question-edits.json) wait in question_edits until the
// owner uses or declines each one in the builder.
//
// Speed: a cold server checks one row (schema_version) and skips setup when
// nothing changed, and re-reads the seed files only when their contents
// change. Bump SCHEMA_VERSION whenever a table or column is added below;
// every statement is safe to run again.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { sql } from './db.js';
import { mergeTidbits } from '../src/lib/bank.js';

const require = createRequire(import.meta.url);
const bundled = require('../src/data/questions.json');
const pending = require('../src/data/pending-questions.json');
const themes = require('../src/data/themes.json');
let daily = { questions: [] };
try {
  daily = require('../src/data/daily-questions.json');
} catch {
  // No daily questions written yet.
}
const siteImages = require('../src/data/site-images.json');
const questionEdits = require('../src/data/question-edits.json');

const SCHEMA_VERSION = '12';
const SEED_HASH = createHash('sha256')
  .update(JSON.stringify([bundled, pending, daily, themes, siteImages, questionEdits]))
  .digest('hex')
  .slice(0, 16);

// An edit's id is its question plus a hash of what it changes, so a revised
// proposal for the same question arrives as a new one.
export const editKey = (e) => `${e.id}.${createHash('sha256').update(JSON.stringify(e.changes)).digest('hex').slice(0, 10)}`;

let ready = null;

// Runs once per warm server instance. A failure is retried on the next call.
export function ensureSchema() {
  ready ??= setUp().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

async function setUp() {
  await sql`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
  const { rows } = await sql`SELECT key, value FROM meta WHERE key IN ('schema_version', 'seed_hash')`;
  const meta = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  if (meta.schema_version !== SCHEMA_VERSION) {
    await createTables();
    await sql`INSERT INTO meta (key, value) VALUES ('schema_version', ${SCHEMA_VERSION}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  }
  if (meta.seed_hash !== SEED_HASH || meta.schema_version !== SCHEMA_VERSION) {
    await seed();
    await sql`INSERT INTO meta (key, value) VALUES ('seed_hash', ${SEED_HASH}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  }
}

async function createTables() {
  // Topics players pick from. Data, so new ones need no code change.
  await sql`
    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true
    )
  `;
  // kind: run (appears in runs) or daily (question of the day only).
  // status for run questions: live, hidden, pending, rejected.
  // status for daily questions: queued, used, hidden. position orders the queue.
  await sql`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'run',
      status TEXT NOT NULL DEFAULT 'live',
      origin TEXT NOT NULL DEFAULT 'seed',
      position INTEGER,
      data JSONB NOT NULL,
      feedback JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS questions_kind_status_idx ON questions (kind, status)`;
  // Every earlier version of an edited question: an audit trail, and what
  // lets a run be checked against the version its player actually saw.
  await sql`
    CREATE TABLE IF NOT EXISTS question_history (
      id BIGSERIAL PRIMARY KEY,
      question_id TEXT NOT NULL,
      status TEXT,
      data JSONB NOT NULL,
      valid_from TIMESTAMPTZ,
      replaced_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS question_history_question_idx ON question_history (question_id, replaced_at DESC)`;
  // Proposed changes to a question (new wording, a better option), waiting
  // for the owner: open, then accepted, declined, or replaced by a newer
  // proposal for the same question. Applying one keeps the old version in
  // question_history like any other edit.
  await sql`
    CREATE TABLE IF NOT EXISTS question_edits (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      changes JSONB NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      decided_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS question_edits_open_idx ON question_edits (status, question_id)`;
  // A run is registered with the server the moment it starts. Saving,
  // flagging and signing all need a registered run, and the server's own
  // start time is what a finished run's timing is checked against.
  await sql`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      is_test BOOLEAN NOT NULL DEFAULT false,
      themes JSONB,
      status TEXT NOT NULL DEFAULT 'started',
      last_position INTEGER NOT NULL DEFAULT 1,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ended_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS runs_started_idx ON runs (started_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      is_test BOOLEAN NOT NULL DEFAULT false,
      verified BOOLEAN NOT NULL DEFAULT false,
      score INTEGER,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON sessions (created_at DESC)`;
  // Light activity events: page opened, run left, restarted and so on.
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      device_id TEXT,
      run_id TEXT,
      is_test BOOLEAN NOT NULL DEFAULT false,
      data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS events_type_created_idx ON events (type, created_at DESC)`;
  // One row per device that has signed a run: its name (with how many times
  // it was changed), whether the builder hid it, and its best run. The
  // public_id is what the board shows; the device id itself stays private.
  await sql`
    CREATE TABLE IF NOT EXISTS players (
      device_id TEXT PRIMARY KEY,
      public_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      name_changes INTEGER NOT NULL DEFAULT 0,
      hidden BOOLEAN NOT NULL DEFAULT false,
      best_run_id TEXT,
      best_score INTEGER,
      best_correct INTEGER,
      best_total INTEGER,
      best_duration_ms BIGINT,
      best_finished_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS players_best_idx ON players (best_score DESC, best_correct DESC, best_duration_ms ASC)`;
  // Every signed run, for the weekly board. Test runs (test mode, or a name
  // with "test" in it) carry the name they were signed with and only show
  // for two minutes.
  await sql`
    CREATE TABLE IF NOT EXISTS signed_runs (
      run_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      total INTEGER NOT NULL,
      duration_ms BIGINT NOT NULL,
      finished_at TIMESTAMPTZ NOT NULL,
      is_test BOOLEAN NOT NULL DEFAULT false,
      test_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS signed_runs_created_idx ON signed_runs (created_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS flags (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      chosen_index INTEGER,
      was_correct BOOLEAN,
      run_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      question_version TEXT,
      is_test BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'open',
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ,
      UNIQUE (device_id, question_id, run_id)
    )
  `;
  // Which daily question went out on which day. A day gets its question the
  // first time anyone opens it, so an unvisited day never uses one up.
  await sql`
    CREATE TABLE IF NOT EXISTS daily_schedule (
      day DATE PRIMARY KEY,
      question_id TEXT NOT NULL UNIQUE,
      is_void BOOLEAN NOT NULL DEFAULT false,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS daily_answers (
      device_id TEXT NOT NULL,
      day DATE NOT NULL,
      is_test BOOLEAN NOT NULL DEFAULT false,
      question_id TEXT NOT NULL,
      chosen_index INTEGER NOT NULL,
      correct BOOLEAN NOT NULL,
      time_ms INTEGER,
      answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (device_id, day, is_test)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS daily_answers_day_idx ON daily_answers (day)`;
  // How often each question is answered right, kept as running totals so
  // /api/questions never has to scan old runs. Levels use it to put easier
  // questions first; only verified runs count, and test runs keep their own
  // rows. Filled once from the runs saved before the table existed.
  await sql`
    CREATE TABLE IF NOT EXISTS question_stats (
      question_id TEXT NOT NULL,
      is_test BOOLEAN NOT NULL DEFAULT false,
      asked INTEGER NOT NULL DEFAULT 0,
      right_count INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (question_id, is_test)
    )
  `;
  await sql`
    INSERT INTO question_stats (question_id, is_test, asked, right_count)
    SELECT id, false, count(*)::int, count(*) FILTER (WHERE ok)::int
    FROM (
      SELECT a->>'id' AS id, coalesce((a->>'correct')::boolean, false) AS ok
      FROM sessions s CROSS JOIN LATERAL jsonb_array_elements(s.data->'questions') AS a
      WHERE s.verified AND NOT s.is_test
      UNION ALL
      SELECT a->>'redeemQuestionId', coalesce((a->>'redeemPassed')::boolean, false)
      FROM sessions s CROSS JOIN LATERAL jsonb_array_elements(s.data->'questions') AS a
      WHERE s.verified AND NOT s.is_test AND coalesce((a->>'redeemUsed')::boolean, false) AND a->>'redeemQuestionId' IS NOT NULL
    ) answers
    WHERE id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM question_stats)
    GROUP BY id
    ON CONFLICT (question_id, is_test) DO NOTHING
  `;
  // Daily answers count towards question_stats from now on (routes/daily.js).
  // The ones given before that are folded in once; the meta row makes sure
  // it happens only once, in the same statement.
  await sql`
    WITH once AS (
      INSERT INTO meta (key, value) VALUES ('daily_stats_folded', '1')
      ON CONFLICT (key) DO NOTHING
      RETURNING key
    )
    INSERT INTO question_stats (question_id, is_test, asked, right_count)
    SELECT question_id, false, count(*)::int, count(*) FILTER (WHERE correct)::int
    FROM daily_answers
    WHERE NOT is_test AND EXISTS (SELECT 1 FROM once)
    GROUP BY question_id
    ON CONFLICT (question_id, is_test) DO UPDATE SET
      asked = question_stats.asked + EXCLUDED.asked,
      right_count = question_stats.right_count + EXCLUDED.right_count,
      updated_at = now()
  `;
  // Players who finished every level, with the signature they drew. Shown on
  // the Legends wall on the home screen; the builder can hide one.
  await sql`
    CREATE TABLE IF NOT EXISTS legends (
      run_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      level INTEGER NOT NULL,
      duration_ms BIGINT NOT NULL,
      signature TEXT,
      is_test BOOLEAN NOT NULL DEFAULT false,
      hidden BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS legends_created_idx ON legends (created_at DESC)`;
  // Answers to the feedback form (ratings, what to add more of, a note).
  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      run_id TEXT,
      answers JSONB NOT NULL,
      note TEXT,
      is_test BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Questions players suggest: a one-line fact, or a full question. Reviewed
  // in the builder; a full one can become a pending question.
  await sql`
    CREATE TABLE IF NOT EXISTS suggestions (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      data JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      question_id TEXT,
      is_test BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      reviewed_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS suggestions_device_idx ON suggestions (device_id, created_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      window_start TIMESTAMPTZ NOT NULL,
      count INTEGER NOT NULL
    )
  `;
}

async function seed() {
  await sql`
    INSERT INTO themes (id, label, position)
    SELECT t->>'id', t->>'label', (ord - 1)::int
    FROM jsonb_array_elements(${JSON.stringify(themes.themes)}::jsonb) WITH ORDINALITY AS x(t, ord)
    ON CONFLICT (id) DO NOTHING
  `;
  const { rows } = await sql`SELECT count(*)::int AS n FROM questions WHERE kind = 'run'`;
  if (rows[0].n === 0) {
    const seedQuestions = mergeTidbits(bundled.questions, bundled.tidbits);
    await sql`
      INSERT INTO questions (id, kind, status, origin, data)
      SELECT q->>'id', 'run', 'live', 'seed', q FROM jsonb_array_elements(${JSON.stringify(seedQuestions)}::jsonb) AS q
      ON CONFLICT (id) DO NOTHING
    `;
  }
  await sql`
    INSERT INTO questions (id, kind, status, origin, data)
    SELECT q->>'id', 'run', 'pending', 'batch', q FROM jsonb_array_elements(${JSON.stringify(pending.questions)}::jsonb) AS q
    ON CONFLICT (id) DO NOTHING
  `;
  // New daily questions join the end of the queue, in file order.
  await sql`
    INSERT INTO questions (id, kind, status, origin, position, data)
    SELECT q->>'id', 'daily', 'queued', 'batch',
           (SELECT coalesce(max(position), 0) FROM questions WHERE kind = 'daily') + ord::int, q
    FROM jsonb_array_elements(${JSON.stringify(daily.questions ?? [])}::jsonb) WITH ORDINALITY AS x(q, ord)
    ON CONFLICT (id) DO NOTHING
  `;
  // Difficulty (easy, medium, hard) for questions that don't have one yet,
  // from the content files. One set in the builder is never replaced.
  const tagged = [...bundled.questions, ...pending.questions, ...(daily.questions ?? [])]
    .filter((q) => q.difficulty)
    .map((q) => ({ id: q.id, difficulty: q.difficulty }));
  if (tagged.length) {
    await sql`
      UPDATE questions q SET data = q.data || jsonb_build_object('difficulty', t->>'difficulty'), updated_at = now()
      FROM jsonb_array_elements(${JSON.stringify(tagged)}::jsonb) AS t
      WHERE q.id = t->>'id' AND coalesce(q.data->>'difficulty', '') = ''
    `;
  }

  // Proposed edits, for questions that exist. A newer proposal for the same
  // question replaces an older one that's still open.
  const edits = (questionEdits.edits ?? []).map((e) => ({ key: editKey(e), id: e.id, changes: e.changes, note: e.note ?? null }));
  if (edits.length) {
    await sql`
      INSERT INTO question_edits (id, question_id, changes, note)
      SELECT e->>'key', e->>'id', e->'changes', e->>'note'
      FROM jsonb_array_elements(${JSON.stringify(edits)}::jsonb) AS e
      WHERE EXISTS (SELECT 1 FROM questions q WHERE q.id = e->>'id')
      ON CONFLICT (id) DO NOTHING
    `;
    await sql`
      UPDATE question_edits SET status = 'replaced', decided_at = now()
      WHERE status = 'open'
        AND question_id IN (SELECT e->>'id' FROM jsonb_array_elements(${JSON.stringify(edits)}::jsonb) AS e)
        AND id NOT IN (SELECT e->>'key' FROM jsonb_array_elements(${JSON.stringify(edits)}::jsonb) AS e)
    `;
  }

  // Pictures shipped with the site for questions already in the database
  // (src/data/site-images.json). A question with no picture gets one, and a
  // picture this step attached before (same site path) takes the file's
  // latest description and credit. A picture uploaded in the builder has a
  // different address, so it's never touched.
  const attach = (siteImages.images ?? []).map((i) => ({
    id: i.id,
    image: { src: `/images/${i.id}.webp`, thumb: `/images/thumbs/${i.id}.webp`, alt: i.alt ?? '', ...(i.credit ? { credit: i.credit } : {}) },
  }));
  if (attach.length) {
    await sql`
      UPDATE questions q SET data = q.data || jsonb_build_object('image', a->'image'), updated_at = now()
      FROM jsonb_array_elements(${JSON.stringify(attach)}::jsonb) AS a
      WHERE q.id = a->>'id'
        AND (coalesce(jsonb_typeof(q.data->'image'), 'null') = 'null' OR q.data->'image'->>'src' = a->'image'->>'src')
        AND q.data->'image' IS DISTINCT FROM a->'image'
    `;
  }
}

// jsonb and timestamps come back already parsed from both drivers used here,
// but normalise defensively: this layer is untestable without a real database.
export function asObject(value) {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

export function isoTime(value) {
  return value == null ? null : new Date(value).toISOString();
}

export function isoDay(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const d = new Date(value);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// A question row as the builder sees it: the question fields plus its kind,
// status, where it came from, its review notes and when it last changed.
export function toQuestion(row) {
  return {
    ...asObject(row.data),
    id: row.id,
    kind: row.kind ?? 'run',
    status: row.status,
    origin: row.origin,
    position: row.position ?? null,
    feedback: asObject(row.feedback) ?? [],
    createdAt: isoTime(row.created_at),
    updatedAt: isoTime(row.updated_at),
  };
}

// The same question as players get it: no review notes or bookkeeping.
export function toPublicQuestion(row) {
  const { status, origin, feedback, createdAt, position, kind, ...q } = toQuestion(row);
  return q;
}

export async function loadThemes() {
  const { rows } = await sql`SELECT id, label FROM themes WHERE active ORDER BY position, id`;
  return rows;
}
