import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Character } from '@/components/Character';
import { ErrorBanner } from '@/components/States';
import { OUTFIT_CATEGORIES } from '@/lib/character';
import type { Profile } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useI18n } from '@/state/I18nProvider';
import { useMyLook } from '@/state/look';

export function CharacterScreen() {
  const { t } = useI18n();
  const { profile, partner, updateProfile } = useAuth();
  const look = useMyLook();
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

  return (
    <div className="stack">
      <div className="row">
        <Link to="/settings" className="btn btn--icon" aria-label={t('character.back')}>
          ‹
        </Link>
        <h1>{t('character.title')}</h1>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <div className="character-preview">
        <Character emotion={look.emotion} color={look.color} state={look.state} outfit={look.outfit} size={150} />
      </div>
      <p className="muted small center">{t('character.hint', { name: partner?.display_name ?? '' })}</p>

      {OUTFIT_CATEGORIES.map((category) => {
        const labelId = `outfit-${category.key}`;
        const current = look.outfit[category.key] ?? null;
        return (
          <section key={category.key} className="stack-sm">
            <span className="section-title" id={labelId} style={{ marginBottom: 0 }}>
              {t(`character.categories.${category.key}`)}
            </span>
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
                  {/* La vignette montre la tenue entière avec cet accessoire à
                      l'essai : on choisit un ensemble, pas une pièce isolée. */}
                  <Character
                    emotion={look.emotion}
                    color={look.color}
                    state={look.state}
                    outfit={{ ...look.outfit, [category.key]: item }}
                    size={52}
                    still
                  />
                  <span>{item ? t(`character.items.${item}`) : t('character.none')}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
