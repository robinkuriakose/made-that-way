import { useEffect, useMemo, useState } from 'react';
import { sessionsToCsv } from '../lib/analytics.js';

const RANGES = [
  { id: '7d', label: '7 days', words: 'the previous 7 days' },
  { id: '30d', label: '30 days', words: 'the previous 30 days' },
  { id: '90d', label: '90 days', words: 'the previous 90 days' },
  { id: 'all', label: 'All time', words: null },
];
const MIN_SAMPLE = 5;

const pct = (v) => (v == null || Number.isNaN(v) ? 'n/a' : `${Math.round(v * 100)}%`);
const num = (v) => (v == null ? 'n/a' : Number(v).toLocaleString());
const fixed = (v, digits = 1) => (v == null ? 'n/a' : Number(v).toFixed(digits));
const ratio = (a, b) => (b > 0 ? a / b : null);
const shortDay = (day) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// A headline number with its change from the previous period of the same length.
function Kpi({ label, value, note, now, before, format = num, rangeWords }) {
  let delta = null;
  if (rangeWords && now != null && before != null) {
    if (before === 0) delta = now > 0 ? 'New this period' : null;
    else {
      const change = (now - before) / before;
      delta = `${change >= 0 ? '+' : ''}${Math.round(change * 100)}% on ${rangeWords}`;
    }
  }
  return (
    <div className="kpi">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{format(value)}</p>
      {delta && <p className={`kpi-delta${now < before ? ' is-down' : ''}`}>{delta}</p>}
      {note && <p className="kpi-note">{note}</p>}
    </div>
  );
}

// Horizontal bars: label, bar, value. Good for ranked lists on any screen.
function HBars({ rows, format = num, empty = 'Nothing yet.' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length || rows.every((r) => !r.value)) return <p className="muted chart-empty">{empty}</p>;
  return (
    <ul className="hbars">
      {rows.map((r) => (
        <li key={r.key ?? r.label} className="hbar">
          <span className="hbar-label">{r.label}</span>
          <span className="hbar-track">
            <span className="hbar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="hbar-value">{r.display ?? format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

// Vertical bars with a label under each, for days, hours, buckets.
function VBars({ bars, height = 120, empty = 'Nothing yet.' }) {
  const max = Math.max(1, ...bars.flatMap((b) => b.values.map((v) => v.value)));
  if (bars.every((b) => b.values.every((v) => !v.value))) return <p className="muted chart-empty">{empty}</p>;
  return (
    <div className="vbars" style={{ '--bars': bars.length }}>
      {bars.map((b) => (
        <div key={b.key} className="vbar" title={b.title}>
          <div className="vbar-stack" style={{ height }}>
            {b.values.map((v) => (
              <span key={v.series} className={`vbar-fill is-${v.series}`} style={{ height: `${(v.value / max) * 100}%` }} />
            ))}
          </div>
          <span className="vbar-label">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, note, children, id }) {
  return (
    <section className="dash-section" aria-labelledby={id}>
      <h2 id={id} className="dash-title">
        {title}
      </h2>
      {note && <p className="muted dash-note">{note}</p>}
      {children}
    </section>
  );
}

export default function Analytics({ api, questions, themes, onEdit }) {
  const [range, setRange] = useState('30d');
  const [test, setTest] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let live = true;
    setError(null);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    api(`/api/builder/analytics?range=${range}&test=${test ? '1' : '0'}&tz=${encodeURIComponent(tz)}`)
      .then((d) => live && setData(d))
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [api, range, test]);

  const byId = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);
  const rangeWords = RANGES.find((r) => r.id === range)?.words;

  const derived = useMemo(() => {
    if (!data) return null;
    const min = test ? 1 : MIN_SAMPLE;
    const stats = data.questions.map((s) => ({ ...s, rate: ratio(s.correct, s.asked), q: byId[s.id] }));
    const rated = stats.filter((s) => s.asked >= min && s.q);
    const hardest = [...rated].sort((a, b) => a.rate - b.rate || b.asked - a.asked).slice(0, 5);
    const easiest = [...rated].sort((a, b) => b.rate - a.rate || b.asked - a.asked).slice(0, 5);
    const slowest = [...rated].sort((a, b) => (b.avgSeconds ?? 0) - (a.avgSeconds ?? 0)).slice(0, 5);

    const totals = stats.reduce(
      (t, s) => ({
        asked: t.asked + s.asked,
        correct: t.correct + s.correct,
        hints: t.hints + s.hints,
        redeems: t.redeems + s.redeems,
        passes: t.passes + s.redeemPasses,
      }),
      { asked: 0, correct: 0, hints: 0, redeems: 0, passes: 0 },
    );

    const perTheme = themes.map((t) => {
      const inTheme = stats.filter((s) => (s.q?.themes ?? []).includes(t.id));
      const asked = inTheme.reduce((n, s) => n + s.asked, 0);
      const correct = inTheme.reduce((n, s) => n + s.correct, 0);
      return { id: t.id, label: t.label, asked, rate: ratio(correct, asked), chosen: data.themes.counts[t.id] ?? 0 };
    });
    return { hardest, easiest, slowest, totals, perTheme, stats };
  }, [data, byId, themes, test]);

  async function exportSessions(kind) {
    setExporting(true);
    try {
      const sessions = await api(`/api/builder/sessions?test=${test ? '1' : '0'}`);
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === 'json') download(`made-that-way-runs-${stamp}.json`, JSON.stringify(sessions, null, 2), 'application/json');
      else download(`made-that-way-runs-${stamp}.csv`, sessionsToCsv(sessions), 'text/csv');
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const k = data?.kpis.current;
  const p = data?.kpis.previous;
  const questionRow = (s, value) => ({
    key: s.id,
    label: (
      <button type="button" className="link-button" onClick={() => onEdit(s.q)}>
        {s.q.stem}
      </button>
    ),
    value: value(s),
  });

  return (
    <section className="dashboard">
      <header className="builder-head">
        <h1 className="builder-title">Analytics</h1>
        <div className="dash-controls">
          <div className="segmented" role="group" aria-label="Period">
            {RANGES.map((r) => (
              <button key={r.id} type="button" aria-pressed={range === r.id} className={range === r.id ? 'is-active' : ''} onClick={() => setRange(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="segmented" role="group" aria-label="Whose data">
            <button type="button" aria-pressed={!test} className={!test ? 'is-active' : ''} onClick={() => setTest(false)}>
              Players
            </button>
            <button type="button" aria-pressed={test} className={test ? 'is-active' : ''} onClick={() => setTest(true)}>
              Test runs
            </button>
          </div>
        </div>
        {test && <p className="muted">Test runs: test mode in the builder, and runs signed with "test" in the name. Never mixed into the players' numbers.</p>}
      </header>

      {error && <p className="form-error">Couldn't load analytics: {error}</p>}
      {!data && !error && <p className="muted builder-empty">Loading…</p>}

      {data && derived && (
        <>
          <div className="kpis">
            <Kpi label="Visitors" value={k.visitors} now={k.visitors} before={p?.visitors} rangeWords={rangeWords} note="Devices that opened the quiz" />
            <Kpi label="Runs finished" value={k.finished} now={k.finished} before={p?.finished} rangeWords={rangeWords} note={`${num(k.started)} started`} />
            <Kpi label="Completion" value={k.completion} format={pct} now={k.completion} before={p?.completion} rangeWords={rangeWords} note="Started runs that were finished" />
            <Kpi label="Returning players" value={k.returning} now={k.returning} before={p?.returning} rangeWords={rangeWords} note="Came back on another day" />
            <Kpi label="Average score" value={k.avgScore} format={(v) => fixed(v, 0)} now={k.avgScore} before={p?.avgScore} rangeWords={rangeWords} note="Out of 100" />
            <Kpi label="Daily answers" value={k.dailyAnswers} now={k.dailyAnswers} before={p?.dailyAnswers} rangeWords={rangeWords} note="Question of the day" />
          </div>

          <Section id="dash-activity" title="Activity" note="Visitors and finished runs each day.">
            <div className="chart-legend">
              <span className="legend is-visitors">Visitors</span>
              <span className="legend is-finished">Runs finished</span>
            </div>
            <VBars
              bars={data.activity.map((d) => ({
                key: d.day,
                label: data.activity.length <= 14 ? shortDay(d.day) : '',
                title: `${shortDay(d.day)}: ${d.visitors} visitors, ${d.started} runs started, ${d.finished} finished`,
                values: [
                  { series: 'visitors', value: d.visitors },
                  { series: 'finished', value: d.finished },
                ],
              }))}
              empty="No visits in this period yet."
            />
          </Section>

          <div className="dash-grid">
            <Section id="dash-funnel" title="From visit to leaderboard" note="People (devices) at each step, and the share of the step before.">
              <HBars
                rows={[
                  { key: 'opened', label: 'Opened the quiz', value: data.funnel.opened },
                  { key: 'started', label: 'Started a run', value: data.funnel.started, display: `${num(data.funnel.started)} · ${pct(ratio(data.funnel.started, data.funnel.opened))}` },
                  { key: 'finished', label: 'Finished a run', value: data.funnel.finished, display: `${num(data.funnel.finished)} · ${pct(ratio(data.funnel.finished, data.funnel.started))}` },
                  { key: 'signed', label: 'Signed the board', value: data.funnel.signed, display: `${num(data.funnel.signed)} · ${pct(ratio(data.funnel.signed, data.funnel.finished))}` },
                ]}
              />
            </Section>

            <Section id="dash-dropoff" title="Where runs are abandoned" note="The question a run was left or restarted on.">
              <VBars
                height={90}
                bars={Array.from({ length: 10 }, (_, i) => {
                  const n = data.dropOff.positions.find((d) => d.position === i + 1)?.n ?? 0;
                  return { key: i, label: String(i + 1), title: `Question ${i + 1}: ${n}`, values: [{ series: 'drop', value: n }] };
                })}
                empty="No abandoned runs."
              />
              {data.dropOff.quiet > 0 && <p className="muted dash-note">Plus {data.dropOff.quiet} started and never finished, with no sign of leaving (a closed tab, for example).</p>}
            </Section>
          </div>

          <div className="dash-grid">
            <Section
              id="dash-scores"
              title="Scores"
              note={data.scores.n ? `${data.scores.n} runs. Average ${fixed(data.scores.avg, 0)}, median ${fixed(data.scores.median, 0)}.` : null}
            >
              <VBars
                height={90}
                bars={data.scores.buckets.map((n, i) => ({
                  key: i,
                  label: `${i * 10}`,
                  title: `${i * 10} to ${i === 9 ? 100 : i * 10 + 9} points: ${n} runs`,
                  values: [{ series: 'score', value: n }],
                }))}
                empty="No finished runs yet."
              />
            </Section>

            <Section id="dash-help" title="How the game's helpers get used">
              <dl className="mini-stats">
                <div>
                  <dt>Hints</dt>
                  <dd>{pct(ratio(derived.totals.hints, derived.totals.asked))} of questions</dd>
                </div>
                <div>
                  <dt>Redeem tried</dt>
                  <dd>{pct(ratio(derived.totals.redeems, derived.totals.asked - derived.totals.correct))} of wrong answers</dd>
                </div>
                <div>
                  <dt>Redeem won</dt>
                  <dd>{pct(ratio(derived.totals.passes, derived.totals.redeems))} of tries</dd>
                </div>
                <div>
                  <dt>Tidbits shown</dt>
                  <dd>{fixed(ratio(data.tidbitsShown, k.finished) ?? 0, 2)} per run</dd>
                </div>
                <div>
                  <dt>Flags</dt>
                  <dd>
                    {fixed((ratio(k.flags, k.finished) ?? 0) * 100, 1)} per 100 runs · {data.openFlags} open
                  </dd>
                </div>
                <div>
                  <dt>Right overall</dt>
                  <dd>{pct(ratio(derived.totals.correct, derived.totals.asked))}</dd>
                </div>
              </dl>
            </Section>
          </div>

          <div className="dash-grid">
            <Section id="dash-hard" title="Hardest questions" note={`Lowest share right, with at least ${test ? 1 : MIN_SAMPLE} answers. Tap one to edit it.`}>
              <HBars rows={derived.hardest.map((s) => questionRow(s, (x) => 1 - x.rate))} format={(v) => `${Math.round((1 - v) * 100)}% right`} empty="Not enough answers yet." />
            </Section>
            <Section id="dash-easy" title="Easiest questions" note="Highest share right. Too easy teaches nothing.">
              <HBars rows={derived.easiest.map((s) => questionRow(s, (x) => x.rate))} format={pct} empty="Not enough answers yet." />
            </Section>
          </div>

          <div className="dash-grid">
            <Section id="dash-topics" title="Topics" note={`How often each was chosen (runs on every topic: ${data.themes.allTopics}), and the share of its questions answered right.`}>
              <HBars
                rows={derived.perTheme.map((t) => ({ key: t.id, label: t.label, value: t.chosen, display: `${num(t.chosen)} · ${pct(t.rate)} right` }))}
                empty="No runs have narrowed their topics yet."
              />
            </Section>
            <Section id="dash-when" title="When people play" note="Runs started by hour of the day, in your time zone.">
              <VBars
                height={70}
                bars={data.hours.map((n, h) => ({ key: h, label: h % 6 === 0 ? `${h}:00` : '', title: `${h}:00: ${n} runs`, values: [{ series: 'hour', value: n }] }))}
                empty="No runs yet."
              />
              <p className="muted dash-note">
                Devices: {['phone', 'tablet', 'desktop'].map((d) => `${num(data.devices[d] ?? 0)} ${d}`).join(', ')}.
              </p>
            </Section>
          </div>

          <Section id="dash-daily" title="Question of the day" note="How each day's question went. Manage the queue in the Daily tab.">
            {data.daily.length === 0 ? (
              <p className="muted chart-empty">No daily question has gone out in this period.</p>
            ) : (
              <ul className="daily-history">
                {data.daily.map((d) => (
                  <li key={d.day} className={`daily-history-item${d.isVoid ? ' is-void' : ''}`}>
                    <p className="daily-history-day">{shortDay(d.day)}</p>
                    <p className="qcard-stem">{d.stem}</p>
                    <p className="qcard-meta">
                      <span>{d.answered} answered</span>
                      {d.percentRight != null && <span>{d.percentRight}% right</span>}
                      {d.avgSeconds != null && <span>{fixed(d.avgSeconds)}s to answer</span>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <details className="dash-details">
            <summary>Every question in detail</summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th className="num">Asked</th>
                    <th className="num">Right</th>
                    <th className="num">Avg time (s)</th>
                    <th className="num">Hints</th>
                    <th className="num">Offered as redeem</th>
                    <th className="num">Picked</th>
                  </tr>
                </thead>
                <tbody>
                  {derived.stats
                    .filter((s) => s.q)
                    .sort((a, b) => b.asked - a.asked)
                    .map((s) => (
                      <tr key={s.id}>
                        <td className="wrap">{s.q.stem}</td>
                        <td className="num">{s.asked}</td>
                        <td className="num">{pct(s.rate)}</td>
                        <td className="num">{fixed(s.avgSeconds)}</td>
                        <td className="num">{pct(ratio(s.hints, s.asked))}</td>
                        <td className="num">{data.redeemUse.offered[s.id] ?? 0}</td>
                        <td className="num">{data.redeemUse.picked[s.id]?.n ?? 0}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>

          <div className="actions dash-export">
            <button type="button" className="button" disabled={exporting} onClick={() => exportSessions('csv')}>
              Export runs as CSV
            </button>
            <button type="button" className="button" disabled={exporting} onClick={() => exportSessions('json')}>
              Export runs as JSON
            </button>
            <p className="muted dash-note">Updated {new Date(data.generatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.</p>
          </div>
        </>
      )}
    </section>
  );
}
