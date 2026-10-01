import { useRef, useState } from 'react';
import { DIFFICULTIES } from '../lib/questionRules.js';
import { uploadPicture } from './uploadPicture.js';

const TIER_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

// The picture's description and credit, saved when you leave each box.
function PictureText({ q, act }) {
  const [alt, setAlt] = useState(q.image.alt ?? '');
  const [credit, setCredit] = useState(q.image.credit ?? '');
  const save = (patch, message) => act(q.id, 'setImage', { image: { ...q.image, ...patch } }, message);
  return (
    <div className="qtools-fields">
      <label className="qtools-field">
        <span className="field-label">Describe the picture</span>
        <input
          type="text"
          value={alt}
          placeholder="What it shows, for people using screen readers"
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => alt.trim() && alt.trim() !== (q.image.alt ?? '') && save({ alt: alt.trim() }, 'Description saved.')}
        />
      </label>
      <label className="qtools-field">
        <span className="field-label">Credit</span>
        <input
          type="text"
          value={credit}
          placeholder="e.g. Photo: Jane Doe, CC BY 4.0"
          onChange={(e) => setCredit(e.target.value)}
          onBlur={() => credit.trim() !== (q.image.credit ?? '') && save({ credit: credit.trim() }, 'Credit saved.')}
        />
      </label>
    </div>
  );
}

// On a question waiting for review, or in the daily queue: its difficulty,
// which you can change, and its picture, which you can add or replace right
// here, by choosing a file or dropping one on. The note says what the
// picture should show.
export default function QuestionTools({ q, api, act }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [over, setOver] = useState(false);
  const has = Boolean(q.image?.src);

  async function upload(file) {
    if (!file || busy) return;
    if (!file.type.startsWith('image/')) {
      setError("That file isn't a picture.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const stored = await uploadPicture(api, q.id, file);
      // Until you describe it, the note on what it should show describes it.
      const alt = q.image?.alt || q.pictureBrief || '';
      await act(q.id, 'setImage', { image: { ...stored, alt, credit: q.image?.credit ?? '' } }, has ? 'Picture replaced.' : 'Picture added.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="qtools">
      <div className="qtools-tier">
        <span className="field-label">Difficulty</span>
        <div className="segmented segmented-small" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              className={q.difficulty === d ? 'is-active' : ''}
              aria-pressed={q.difficulty === d}
              onClick={() => q.difficulty !== d && act(q.id, 'setDifficulty', { difficulty: d }, `Now ${TIER_LABEL[d].toLowerCase()}.`)}
            >
              {TIER_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`qtools-picture${over ? ' is-over' : ''}${has ? '' : ' is-missing'}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files?.[0]);
        }}
      >
        {has ? (
          <img className="qtools-thumb" src={q.image.thumb ?? q.image.src} alt="" />
        ) : (
          <span className="qtools-thumb qtools-thumb-empty" aria-hidden="true">
            +
          </span>
        )}
        <div className="qtools-picture-body">
          <p className="qtools-brief">
            {q.pictureBrief ? (
              <>
                <strong>The picture should show:</strong> {q.pictureBrief}
              </>
            ) : has ? (
              'Picture attached.'
            ) : (
              'No picture yet. Levels only use questions with one.'
            )}
            {!has && q.kind === 'daily' && <span className="qtools-wait"> It won't go out as a daily question until it has one.</span>}
          </p>
          <div className="qtools-picture-actions">
            <label className={`button button-small${busy ? ' is-busy' : ''}`}>
              {busy ? 'Uploading…' : has ? 'Replace picture' : 'Add picture'}
              <input ref={input} type="file" accept="image/*" className="visually-hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            <span className="muted">or drop one here</span>
          </div>
        </div>
      </div>
      {has && <PictureText key={q.image.src} q={q} act={act} />}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
