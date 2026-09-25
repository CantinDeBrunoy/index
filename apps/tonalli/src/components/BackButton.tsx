import { Link } from 'react-router-dom';

/** Le rond « ‹ » en haut à gauche des écrans qu'on ouvre depuis un autre. */
export function BackButton({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="btn btn--icon back-button" aria-label={label}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5 L8 12 L15 19" />
      </svg>
    </Link>
  );
}
