import type { ReactNode } from 'react';

/**
 * Un conseil, dit par le personnage dans une bulle. Le personnage est muet
 * pour les lecteurs d'écran (il est décoratif) : c'est le texte de la bulle
 * qui porte le conseil.
 */
export function Tip({ speaker, children }: { speaker?: ReactNode; children: ReactNode }) {
  return (
    <div className="tip">
      {speaker ? (
        <span className="tip__speaker" aria-hidden>
          {speaker}
        </span>
      ) : null}
      <div className="tip__bubble">{children}</div>
    </div>
  );
}
