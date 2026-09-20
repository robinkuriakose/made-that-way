import { CONFIDENCE_LABELS } from '../lib/labels.js';
import ImageFrame from './ImageFrame.jsx';

// The reasoning for one question: the explanation that fits the answer given,
// then the optional image, confidence and source.
export default function Explanation({ question, wasCorrect, chosenIndex }) {
  const body = wasCorrect ? question.explanationRight : question.explanationWrong[chosenIndex];
  const confidence = CONFIDENCE_LABELS[question.confidence];

  return (
    <>
      {question.image && <ImageFrame image={question.image} />}

      <p className="modal-body">{body}</p>

      <dl className="modal-meta">
        <div>
          <dt>Confidence</dt>
          <dd>
            <span className="confidence">{confidence.label}</span>
            <span className="confidence-note">{confidence.note}</span>
          </dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            <a href={question.sourceUrl} target="_blank" rel="noopener noreferrer">
              {question.sourceName}
            </a>
          </dd>
        </div>
      </dl>
    </>
  );
}
