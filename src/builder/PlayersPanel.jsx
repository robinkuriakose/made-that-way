import { useCallback, useEffect, useState } from 'react';

// Names on the leaderboard. Links, handles and common swear words are
// refused when a name is set; anything else unwanted can be hidden here,
// which removes that player from every board.
export default function PlayersPanel({ api, notify }) {
  const [players, setPlayers] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const load = useCallback(
    (q = '') => {
      api(`/api/builder/players?q=${encodeURIComponent(q)}`)
        .then((d) => setPlayers(d.players))
        .catch((err) => setError(err.message));
    },
    [api],
  );

  useEffect(() => {
    const t = setTimeout(() => load(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query, load]);

  async function toggle(p) {
    try {
      const { player } = await api('/api/builder/players', { method: 'PATCH', body: { id: p.id, action: p.hidden ? 'unhide' : 'hide' } });
      setPlayers((list) => list.map((x) => (x.id === p.id ? { ...player, runsSigned: p.runsSigned } : x)));
      notify(player.hidden ? `${player.name} is hidden from every board.` : `${player.name} is back on the boards.`);
    } catch (err) {
      notify(err.message);
    }
  }

  return (
    <section>
      <header className="builder-head">
        <h1 className="builder-title">Players</h1>
        <p className="muted">Everyone who has put a name on the leaderboard, most recently active first.</p>
      </header>
      <div className="list-tools">
        <input type="search" placeholder="Search names" aria-label="Search names" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {error && <p className="form-error">{error}</p>}
      {!players && !error && <p className="muted builder-empty">Loading…</p>}
      {players && players.length === 0 && <p className="muted builder-empty">No names yet.</p>}
      {players && players.length > 0 && (
        <ul className="qcards">
          {players.map((p) => (
            <li key={p.id} className={`qcard qcard-plain${p.hidden ? ' is-hidden' : ''}`}>
              <div className="qcard-body">
                <p className="qcard-stem">{p.name}</p>
                <p className="qcard-meta">
                  {p.bestScore != null && <span>Best {p.bestScore}</span>}
                  <span>
                    {p.runsSigned} run{p.runsSigned === 1 ? '' : 's'} signed
                  </span>
                  {p.nameChanges > 0 && <span>Renamed {p.nameChanges}×</span>}
                  {p.hidden && <span className="chip chip-muted">Hidden</span>}
                </p>
              </div>
              <div className="qcard-actions">
                <button type="button" className="text-button" onClick={() => toggle(p)}>
                  {p.hidden ? 'Show again' : 'Hide'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
