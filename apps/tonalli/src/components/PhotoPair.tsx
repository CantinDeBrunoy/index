import { useState } from 'react';
import type { ReactNode } from 'react';

import { PhotoImage } from '@/components/PhotoImage';
import type { Entry } from '@/lib/types';
import { useI18n } from '@/state/I18nProvider';

/**
 * Les deux photos d'un même appui : la scène en grand, le visage en vignette.
 * Un clic sur la vignette les échange — c'est souvent le visage qu'on veut
 * regarder en grand, et l'inverse dépend du jour.
 *
 * Une journée d'avant la double photo, ou prise sur un appareil à une seule
 * caméra, n'a pas de vignette : on affiche alors la photo seule, sans cadre
 * vide qui ferait croire à une image manquante.
 */
export function PhotoPair({ main, inset }: { main: ReactNode; inset: ReactNode | null }) {
  const { t } = useI18n();
  const [swapped, setSwapped] = useState(false);

  if (!inset) return <>{main}</>;

  const large = swapped ? inset : main;
  const small = swapped ? main : inset;

  return (
    <div className="photo-pair">
      {large}
      <button
        type="button"
        className="photo-pair__inset"
        onClick={() => setSwapped((current) => !current)}
        aria-label={t('today.swapPhotos')}
      >
        {small}
      </button>
    </div>
  );
}

/** Les deux photos d'une entrée enregistrée — une seule si elle n'en a qu'une. */
export function EntryPhotos({ entry, alt }: { entry: Entry | null; alt?: string }) {
  const { t } = useI18n();
  const label = alt ?? t('today.photoStep');
  return (
    <PhotoPair
      main={<PhotoImage path={entry?.photo_path ?? null} alt={label} />}
      inset={entry?.selfie_path ? <PhotoImage path={entry.selfie_path} alt={t('today.selfieStep')} /> : null}
    />
  );
}
