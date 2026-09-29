// Vercel function entry point for every player route (/api/player/<route>,
// rewritten to /api/player?route=<route> by vercel.json): a player's own
// profile, the Legends wall, the feedback form, suggested questions and their
// pictures. One function for all of them, like the builder's.
import profile from '../server/routes/player/profile.js';
import legends from '../server/routes/player/legends.js';
import feedback from '../server/routes/player/feedback.js';
import suggest from '../server/routes/player/suggest.js';
import upload from '../server/routes/player/upload.js';

const ROUTES = { profile, legends, feedback, suggest, upload };

export default async function handler(req, res) {
  const route = String(req.query?.route ?? '').replace(/\/+$/, '');
  const run = Object.hasOwn(ROUTES, route) ? ROUTES[route] : null;
  if (!run) return res.status(404).json({ error: 'no such route' });
  return run(req, res);
}
