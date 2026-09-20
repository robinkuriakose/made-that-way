import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { login } from './api.js';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      onLogin(await login(password));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <TopBar meta={<span className="topbar-meta">Builder</span>} />
      <main className="stage builder-login">
        <h1 className="stem">Builder</h1>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="builder-password" className="field-label">
            Password
          </label>
          <div className="sign-row">
            <input
              id="builder-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit" className="button button-primary" disabled={!password || busy}>
              {busy ? 'Checking…' : 'Sign in'}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      </main>
    </div>
  );
}
