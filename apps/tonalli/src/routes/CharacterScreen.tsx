import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Character } from '@/components/Character';
import { ErrorBanner } from '@/components/States';
import { OUTFIT_CATEGORIES } from '@/lib/character';
import { shadeOf } from '@/lib/emotions';
import type { Profile } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useI18n } from '@/state/I18nProvider';
import { useMyLook } from '@/state/look';
import { useDarkScheme } from '@/state/scheme';

export function CharacterScreen() {
  const { t } = useI18n();
  const { profile, updateProfile } = useAuth();
  const look = useMyLook();
  const dark = useDarkScheme();
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const choose = async (column: (typeof OUTFIT_CATEGORIES)[number]['column'], value: string | null) => {
    setError(null);
    try {
      // Enregistré au toucher, comme le symbole de la série : pas de bouton
      // « Valider » pour un choix qui se voit déjà à l'écran.
      await updateProfile({ [column]: value } as Partial<Profile>);
    } catch {
      setError(t('common.networkError'));
    }
  };

  // La nuit, le trait du personnage est clair : sur le gris pâle de Neutre,
  // les petites pièces (lunettes, taches, cils) s'effaceraient. Les vignettes
  // prennent alors le cran dense du même gris.
  const thumbColor = dark ? shadeOf('neutral', 'deep') : null;

  const hint =
    look.emotion && look.state === 'scene'
      ? t('character.hintColor', { emotion: t(`emotions.${look.emotion}`).toLowerCase() })
      : t('character.hintWaiting');

  return (
    <div className="stack character-screen">
      <div className="step-header">
        <Link to="/settings" className="btn btn--icon back-button" aria-label={t('character.back')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </Link>
        <h1 className="step-header__title">{t('character.title')}</h1>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <div className="character-preview">
        <Character emotion={look.emotion} color={look.color} state={look.state} outfit={look.outfit} size={150} />
        <p className="character-preview__hint">{hint}</p>
      </div>

      {OUTFIT_CATEGORIES.map((category) => {
        const labelId = `outfit-${category.key}`;
        const current = look.outfit[category.key] ?? null;
        return (
          <section key={category.key} className="outfit-section">
            <h2 className="outfit-section__title" id={labelId}>
              {t(`character.categories.${category.key}`)}
            </h2>
            <div className="outfit-row" role="radiogroup" aria-labelledby={labelId}>
              {[null, ...category.items].map((item) => (
                <button
                  key={item ?? 'none'}
                  type="button"
                  role="radio"
                  className="outfit-tile"
                  aria-checked={current === item}
                  onClick={() => void choose(category.column, item)}
                >
                  {/* La vignette montre l'accessoire seul, sur le personnage
                      neutre : c'est la pièce qu'on choisit, et à cette taille
                      elle doit se lire du premier coup d'œil. La tenue entière
                      se voit en grand, juste au-dessus. */}
                  <Character emotion="neutral" color={thumbColor} outfit={{ [category.key]: item }} size={52} still />
                  <span>
                    {item
                      ? t(`character.items.${item}`)
                      : category.key === 'motif'
                        ? t('character.plain')
                        : t('character.none')}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
