import { useState } from 'react';

import { REACTIONS } from '@/lib/reactions';
import type { Entry } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useEntries } from '@/state/EntriesProvider';
import { useI18n } from '@/state/I18nProvider';

/**
 * L'action rapide : six emoji sous la journée de l'autre, un appui suffit.
 *
 * Pas de champ de texte, pas de clavier — la palette est fermée comme celle
 * des émotions. Une seule réaction à la fois : appuyer sur un autre emoji
 * remplace, appuyer sur le même retire. C'est la seule chose qu'on puisse
 * faire sur la journée de quelqu'un d'autre, et c'est voulu : ce n'est pas un
 * fil de commentaires.
 */
export function DayReactions({ entry }: { entry: Entry | null }) {
  const { profile } = useAuth();
  if (!entry || !profile) return null;
  return entry.user_id === profile.id ? <ReceivedReaction entry={entry} /> : <QuickReactions entry={entry} />;
}

function QuickReactions({ entry }: { entry: Entry }) {
  const { t } = useI18n();
  const { myReactions, react, online } = useEntries();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const current = myReactions[entry.id]?.key ?? null;

  const pick = async (key: string) => {
    // Le même emoji deux fois de suite retire la réaction : c'est le seul
    // moyen de revenir en arrière sans deuxième commande à l'écran.
    const next = current === key ? null : key;
    setBusy(key);
    setFailed(false);
    try {
      await react(entry.id, next);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack-sm">
      <div className="reactions" role="group" aria-label={t('reactions.label')}>
        {REACTIONS.map((reaction) => (
          <button
            key={reaction.key}
            type="button"
            className="reaction"
            aria-pressed={current === reaction.key}
            aria-label={t(`reactions.names.${reaction.key}`)}
            title={t(`reactions.names.${reaction.key}`)}
            disabled={!online || busy !== null}
            onClick={() => void pick(reaction.key)}
          >
            <span aria-hidden>{reaction.emoji}</span>
          </button>
        ))}
      </div>
      <p className="faint small">
        {!online
          ? t('reactions.offline')
          : failed
            ? t('reactions.failed')
            : current
              ? t('reactions.remove')
              : t('reactions.hint')}
      </p>
    </div>
  );
}

/** Ce que le binôme a posé sur MA journée. Rien à faire ici, juste à voir. */
function ReceivedReaction({ entry }: { entry: Entry }) {
  const { t } = useI18n();
  const { partner } = useAuth();
  const { theirReactions } = useEntries();

  const reaction = theirReactions[entry.id];
  if (!reaction) return null;

  const name = partner?.display_name || t('calendar.partner');
  return (
    <p className="reaction-badge">
      <span className="reaction-badge__emoji" aria-hidden>
        {reaction.emoji}
      </span>
      <span className="small">
        {t('reactions.received', { name, reaction: t(`reactions.names.${reaction.key}`) })}
      </span>
    </p>
  );
}
