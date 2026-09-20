import { useCallback, useEffect, useMemo, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import Login from './Login.jsx';
import ReviewQueue from './ReviewQueue.jsx';
import QuestionList from './QuestionList.jsx';
import QuestionForm from './QuestionForm.jsx';
import FlagsPanel from './FlagsPanel.jsx';
import DailyPanel from './DailyPanel.jsx';
import PlayersPanel from './PlayersPanel.jsx';
import Analytics from './Analytics.jsx';
import { bundledThemes } from '../lib/themes.js';
import { AuthError, call, clearToken, readToken } from './api.js';

const TABS = [
  { id: 'review', label: 'New questions' },
  { id: 'questions', label: 'Questions' },
  { id: 'daily', label: 'Daily' },
  { id: 'flags', label: 'Flags' },
  { id: 'players', label: 'Players' },
  { id: 'analytics', label: 'Analytics' },
];

export default function BuilderApp() {
  const [token, setToken] = useState(readToken);
  const [tab, setTab] = useState('review');
  const [questions, setQuestions] = useState(null);
  const [openFlags, setOpenFlags] = useState({});
  const [themes, setThemes] = useState(bundledThemes);
  const [flags, setFlags] = useState(null);
  const [editing, setEditing] = useState(null); // a question, or { isNew: true, kind }
  const [notice, setNotice] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const signOut = useCallback(() => {
    clearToken();
    setToken(null);
  }, []);

  const api = useCallback(
    async (path, options = {}) => {
      try {
        return await call(path, { ...options, token });
      } catch (err) {
        if (err instanceof AuthError) signOut();
        throw err;
      }
    },
    [token, signOut],
  );

  const reload = useCallback(async () => {
    try {
      const [q, f] = await Promise.all([api('/api/builder/questions'), api('/api/builder/flags')]);
      setQuestions(q.questions);
      setOpenFlags(q.openFlags);
      if (q.themes?.length) setThemes(q.themes);
      setFlags(f.flags);
      setLoadError(null);
    } catch (err) {
      if (!(err instanceof AuthError)) setLoadError(err.message);
    }
  }, [api]);

  useEffect(() => {
    if (token) reload();
  }, [token, reload]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const replaceQuestion = useCallback((q) => {
    setQuestions((list) => {
      const others = (list ?? []).filter((x) => x.id !== q.id);
      return [q, ...others];
    });
  }, []);

  // Moving a daily question changes its neighbour's place too, so reload.
  const afterAct = useCallback(
    (action) => {
      if (action === 'move') reload();
    },
    [reload],
  );

  // A status change or a review note on one question. Returns true if it worked.
  const act = useCallback(
    async (id, action, extra = {}, message = null) => {
      try {
        const { question } = await api('/api/builder/questions', { method: 'PATCH', body: { id, action, ...extra } });
        replaceQuestion(question);
        afterAct(action);
        if (message) setNotice(message);
        return true;
      } catch (err) {
        if (!(err instanceof AuthError)) setNotice(err.message);
        return false;
      }
    },
    [api, replaceQuestion, afterAct],
  );

  const counts = useMemo(() => {
    const list = questions ?? [];
    return {
      review: list.filter((q) => q.kind !== 'daily' && q.status === 'pending').length,
      questions: list.filter((q) => q.kind !== 'daily' && (q.status === 'live' || q.status === 'hidden')).length,
      daily: list.filter((q) => q.kind === 'daily' && q.status === 'queued').length,
      flags: (flags ?? []).filter((f) => f.status === 'open').length,
    };
  }, [questions, flags]);

  if (!token) return <Login onLogin={setToken} />;

  const meta = (
    <span className="topbar-meta">
      <a className="text-button" href="/?test=1" target="_blank" rel="noopener">
        Play in test mode
      </a>
      <button type="button" className="text-button" onClick={signOut}>
        Lock
      </button>
    </span>
  );

  let content;
  if (editing) {
    content = (
      <QuestionForm
        key={editing.isNew ? `new-${editing.kind}` : editing.id}
        initial={editing.isNew ? null : editing}
        kind={editing.kind ?? 'run'}
        themes={themes}
        existingIds={new Set((questions ?? []).map((q) => q.id))}
        api={api}
        onCancel={() => setEditing(null)}
        onSaved={(q, message) => {
          replaceQuestion(q);
          setEditing(null);
          setNotice(message);
        }}
      />
    );
  } else if (!questions) {
    content = <p className="muted builder-empty">{loadError ? `Couldn't load: ${loadError}` : 'Loading…'}</p>;
  } else if (tab === 'review') {
    content = <ReviewQueue questions={questions} act={act} onEdit={setEditing} />;
  } else if (tab === 'questions') {
    content = (
      <QuestionList
        questions={questions}
        themes={themes}
        openFlags={openFlags}
        act={act}
        onEdit={setEditing}
        onAdd={() => setEditing({ isNew: true, kind: 'run' })}
      />
    );
  } else if (tab === 'daily') {
    content = (
      <DailyPanel
        questions={questions}
        api={api}
        act={act}
        notify={setNotice}
        onEdit={setEditing}
        onAdd={() => setEditing({ isNew: true, kind: 'daily' })}
      />
    );
  } else if (tab === 'players') {
    content = <PlayersPanel api={api} notify={setNotice} />;
  } else if (tab === 'flags') {
    content = (
      <FlagsPanel
        flags={flags ?? []}
        questions={questions}
        api={api}
        onChanged={(flag) => {
          setFlags((list) => list.map((f) => (f.id === flag.id ? flag : f)));
          setOpenFlags((prev) => {
            const next = { ...prev };
            next[flag.questionId] = Math.max(0, (next[flag.questionId] ?? 0) + (flag.status === 'open' ? 1 : -1));
            return next;
          });
        }}
        onEdit={setEditing}
      />
    );
  } else {
    content = <Analytics api={api} questions={questions} themes={themes} onEdit={setEditing} />;
  }

  return (
    <div className="page builder">
      <TopBar meta={meta} />
      {!editing && (
        <nav className="builder-tabs" aria-label="Builder sections">
          <div className="builder-tabs-inner">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`builder-tab${tab === t.id ? ' is-active' : ''}`}
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {counts[t.id] > 0 && <span className="builder-count">{counts[t.id]}</span>}
              </button>
            ))}
          </div>
        </nav>
      )}
      <main className="builder-main">{content}</main>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
