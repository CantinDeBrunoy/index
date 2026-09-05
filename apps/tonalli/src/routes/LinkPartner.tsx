import { useState } from 'react';

import { useAuth } from '@/state/AuthProvider';
import { useI18n } from '@/state/I18nProvider';

const KNOWN_ERRORS = new Set([
  'code_not_found',
  'cannot_link_self',
  'partner_already_linked',
  'already_linked',
  'invalid_code',
]);

/**
 * Écran d'attente : Tonalli n'a pas de sens seul, on ne va pas plus loin tant
 * que le binôme n'est pas lié.
 */
export function LinkPartnerScreen() {
  const { t } = useI18n();
  const { profile, linkPartner, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.invite_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé : le code reste lisible à l'écran.
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await linkPartner(code);
    } catch (caught) {
      const reason = (caught as Error).message;
      setError(KNOWN_ERRORS.has(reason) ? t(`link.errors.${reason}`) : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app app--plain stack">
      <div className="stack-sm" style={{ marginTop: 32 }}>
        <h1>{t('link.title')}</h1>
        <p className="muted small">{t('link.subtitle')}</p>
      </div>

      <div className="card stack">
        <span className="section-title" style={{ margin: 0 }}>
          {t('link.yourCode')}
        </span>
        <strong style={{ fontSize: 34, letterSpacing: 8, textAlign: 'center' }}>
          {profile?.invite_code ?? '······'}
        </strong>
        <button type="button" className="btn btn--block" onClick={() => void copy()}>
          {copied ? t('link.copied') : t('link.copy')}
        </button>
      </div>

      <form className="card stack" onSubmit={submit}>
        <span className="section-title" style={{ margin: 0 }}>
          {t('link.enterCode')}
        </span>
        <input
          className="input input--code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 6))}
          placeholder={t('link.codePlaceholder')}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label={t('link.enterCode')}
        />
        {error ? <p className="banner banner--error">{error}</p> : null}
        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={busy || code.length !== 6}
        >
          {busy ? t('link.linking') : t('link.linkAction')}
        </button>
      </form>

      <button type="button" className="btn btn--ghost center" onClick={() => void signOut()}>
        {t('auth.signOut')}
      </button>
    </div>
  );
}
