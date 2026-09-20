// Vercel function entry point for every builder route (/api/builder/<route>,
// rewritten to /api/builder?route=<route> by vercel.json). One function for
// all of them keeps the project well inside Vercel's function limit as the
// builder grows. Each route checks the builder sign-in itself.
import login from '../server/routes/builder/login.js';
import questions from '../server/routes/builder/questions.js';
import upload from '../server/routes/builder/upload.js';
import flags from '../server/routes/builder/flags.js';
import daily from '../server/routes/builder/daily.js';
import analytics from '../server/routes/builder/analytics.js';
import players from '../server/routes/builder/players.js';
import sessions from '../server/routes/builder/sessions.js';

const ROUTES = { login, questions, upload, flags, daily, analytics, players, sessions };

export default async function handler(req, res) {
  const route = String(req.query?.route ?? '').replace(/\/+$/, '');
  const run = Object.hasOwn(ROUTES, route) ? ROUTES[route] : null;
  if (!run) return res.status(404).json({ error: 'no such route' });
  return run(req, res);
}
