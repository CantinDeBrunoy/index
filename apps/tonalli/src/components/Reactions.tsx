import { useEffect, useMemo, useState } from 'react';

import { BUBBLE_COUNT, REACTIONS, bubbles } from '@/lib/reactions';
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
 *
 * Ne s'affiche que sur la journée du binôme — on ne réagit pas à la sienne,
 * et la base le refuserait de toute façon.
 */
export function QuickReactions({ entry }: { entry: Entry | null }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { myReactions, react, online } = useEntries();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (!entry || !profile || entry.user_id === profile.id) return null;

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

/**
 * Ce que le binôme a posé sur MA journée : une pastille ronde posée à cheval
 * sur le bas de la photo, rien de plus. Une phrase entière à cet endroit
 * pèserait plus lourd que la réaction elle-même.
 *
 * L'appui ouvre l'emoji en grand, avec son nom et une pluie de bulles : c'est
 * là que la réaction prend sa place, quand on a décidé de la regarder.
 */
export function ReceivedReaction({ entry }: { entry: Entry | null }) {
  const { t } = useI18n();
  const { profile, partner } = useAuth();
  const { theirReactions } = useEntries();
  const [open, setOpen] = useState(false);

  const mine = entry && profile ? entry.user_id === profile.id : false;
  const reaction = mine && entry ? theirReactions[entry.id] : undefined;
  if (!reaction) return null;

  const name = partner?.display_name || t('calendar.partner');
  const detail = t('reactions.receivedDetail', {
    name,
    reaction: t(`reactions.names.${reaction.key}`),
  });

  return (
    <>
      <button type="button" className="reaction-pill" onClick={() => setOpen(true)} aria-label={detail}>
        <span aria-hidden>{reaction.emoji}</span>
      </button>
      {open ? (
        <ReactionBurst
          emoji={reaction.emoji}
          title={t('reactions.received', { name })}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

/**
 * La réaction en grand : le nom de la personne, et l'emoji qui monte du bas
 * de l'écran en s'effaçant.
 *
 * Le champ de bulles est tiré **une seule fois** : un nouveau tirage à chaque
 * rendu ferait sauter les emoji d'un endroit à l'autre au premier changement
 * d'état venu.
 */
function ReactionBurst({
  emoji,
  title,
  onClose,
}: {
  emoji: string;
  title: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const field = useMemo(() => bubbles(BUBBLE_COUNT, Math.random), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="reaction-burst" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="reaction-burst__sky" aria-hidden>
        {field.map((bubble, index) => (
          <span
            key={index}
            className="reaction-bubble"
            style={
              {
                '--left': `${bubble.left}%`,
                '--delay': `${bubble.delay}s`,
                '--duration': `${bubble.duration}s`,
                '--size': `${bubble.size}px`,
                '--drift': `${bubble.drift}px`,
              } as React.CSSProperties
            }
          >
            {emoji}
          </span>
        ))}
      </div>
      <div className="reaction-burst__card stack">
        <span className="reaction-burst__emoji" aria-hidden>
          {emoji}
        </span>
        <strong className="reaction-burst__title">{title}</strong>
        <button type="button" className="btn" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
