// The logo, for now: a keycap with the small ridge from the F and J keys,
// the detail your finger finds every day and nobody notices. A placeholder
// until the final mark is chosen (docs/logo/sketches.html); the same mark is
// the favicon (public/favicon.svg) and sits on every share picture.
export function LogoMark({ size = 22, className = '' }) {
  return (
    <svg className={`logo-mark ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#16150f" />
      <rect x="7" y="4" width="50" height="46" rx="10" fill="#cfe957" />
      <rect x="23" y="38" width="18" height="4.5" rx="2.25" fill="#16150f" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo-word">Made That Way</span>
    </span>
  );
}
