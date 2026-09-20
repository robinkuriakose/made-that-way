import TopBar from './TopBar.jsx';

export default function TidbitScreen({ tidbit, position, total, score, onContinue, onHome, onRestart }) {
  return (
    <div className="page">
      <TopBar position={position} total={total} score={score} onHome={onHome} onRestart={onRestart} />
      <main className="stage tidbit">
        <p className="eyebrow">While you're here</p>
        <p className="tidbit-text">{tidbit.text}</p>
        <div className="next-row">
          <button type="button" className="button button-primary" onClick={onContinue} autoFocus>
            Carry on
          </button>
        </div>
      </main>
    </div>
  );
}
