import { useEffect, useState } from 'react';

import { signedUrlFor } from '@/lib/photo';
import { useI18n } from '@/state/I18nProvider';

/**
 * Le bucket est privé : chaque photo passe par une URL signée, obtenue
 * seulement si la RLS autorise la ligne correspondante.
 */
export function PhotoImage({ path, alt }: { path: string | null; alt: string }) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    if (!path) {
      setFailed(true);
      return;
    }
    void signedUrlFor(path).then((signed) => {
      if (!active) return;
      if (signed) setUrl(signed);
      else setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [path]);

  if (failed) {
    return (
      <div className="photo" style={{ display: 'grid', placeItems: 'center' }}>
        <span className="faint small">{t('calendar.photoMissing')}</span>
      </div>
    );
  }
  if (!url) return <div className="photo skeleton" />;
  return <img className="photo" src={url} alt={alt} />;
}
