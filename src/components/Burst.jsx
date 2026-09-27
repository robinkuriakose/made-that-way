// A small burst of dots for a moment worth marking (a level cleared). Pure
// decoration: hidden from screen readers, and switched off for people who
// ask for less motion (see .burst in styles.css).
const DOTS = 14;

export default function Burst() {
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: DOTS }, (_, i) => (
        <span key={i} className="burst-dot" style={{ '--angle': `${(360 / DOTS) * i}deg`, '--delay': `${(i % 3) * 60}ms` }} />
      ))}
    </span>
  );
}
