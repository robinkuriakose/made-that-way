import ImageFrame from '../components/ImageFrame.jsx';
import { TOPIC_LABELS, CONFIDENCE_LABELS } from '../lib/labels.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// Everything about one question, laid out for reading: each option with the
// explanation a player would see for it, then the hint, tidbit, tags and
// source. Used by the review queue.
export default function QuestionPreview({ q }) {
  return (
    <article className="qp">
      <p className="eyebrow">
        {TOPIC_LABELS[q.topic] ?? q.topic} · {CONFIDENCE_LABELS[q.confidence]?.label ?? q.confidence}
      </p>
      <h3 className="qp-stem">{q.stem}</h3>
      {q.image && <ImageFrame image={q.image} compact />}

      <ol className="qp-options">
        {q.options.map((text, i) => {
          const right = i === q.correctIndex;
          return (
            <li key={i} className={right ? 'is-correct' : undefined}>
              <span className="qp-letter">{LETTERS[i]}</span>
              <div>
                <p className="qp-option">
                  {text}
                  {right && <span className="qp-tag">Right answer</span>}
                </p>
                <p className="qp-why">{right ? q.explanationRight : q.explanationWrong[i]}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <dl className="qp-meta">
        <div>
          <dt>Hint</dt>
          <dd>{q.hint}</dd>
        </div>
        {q.tidbit && (
          <div>
            <dt>Tidbit</dt>
            <dd>{q.tidbit.text}</dd>
          </div>
        )}
        <div>
          <dt>Tags</dt>
          <dd>
            {q.tags?.join(', ')}
            {q.group ? ` · group: ${q.group}` : ''}
          </dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            <a href={q.sourceUrl} target="_blank" rel="noopener noreferrer">
              {q.sourceName}
            </a>
          </dd>
        </div>
        <div>
          <dt>Id</dt>
          <dd className="qp-id">{q.id}</dd>
        </div>
      </dl>
    </article>
  );
}
