import { useState } from 'react';

import { Character } from '@/components/Character';
import { Tip } from '@/components/Tip';
import { outfitOf } from '@/lib/character';
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
 *
 * Il montre ce qui manque plutôt que de l'expliquer : mon personnage, et à
 * côté la place vide du sien, qui attend. Puis mon code, à envoyer — par le
 * partage du téléphone quand il existe, c'est le geste naturel sur un
 * téléphone —, et le champ pour saisir le sien.
 */
export function LinkPartnerScreen() {
  const { t } = useI18n();
  const { profile, linkPartner, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const invite = profile?.invite_code ?? '';
  // Le partage natif n'existe pas partout (la plupart des ordinateurs) : sans
  // lui, copier suffit.
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé : le code reste lisible à l'écran.
    }
  };

  const share = async () => {
    if (!invite) return;
    try {
      await navigator.share({ title: 'Tonalli', text: t('link.shareText', { code: invite }), url: window.location.origin });
    } catch {
      // Partage annulé ou refusé : rien à dire, le code est toujours là.
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
    <div className="app app--plain stack link-screen">
      {/* Mon personnage, et la place du sien : c'est lui qui manque. */}
      <div className="link-pair" aria-hidden>
        <figure className="link-pair__side">
          <Character emotion={null} state="waiting" outfit={outfitOf(profile)} size={104} />
          <figcaption>{t('link.me')}</figcaption>
        </figure>
        <span className="link-pair__thread" />
        <figure className="link-pair__side link-pair__side--empty">
          <Character emotion={null} state="waiting" size={104} still />
          <figcaption>{t('link.partnerPlaceholder')}</figcaption>
        </figure>
      </div>

      <div className="stack-sm center">
        <h1 className="link-screen__title">{t('link.title')}</h1>
        <p className="muted small">{t('link.subtitle')}</p>
      </div>

      <section className="card link-card">
        <h2 className="link-card__title">{t('link.yourCode')}</h2>
        {/* Une case par caractère : un code se dicte et se recopie lettre par
            lettre. Le lecteur d'écran l'épelle aussi. */}
        <p className="invite-code" aria-label={t('link.codeAria', { letters: invite.split('').join(' ') })}>
          {(invite || '······').split('').map((letter, index) => (
            <span key={index} className="invite-code__letter" aria-hidden>
              {letter}
            </span>
          ))}
        </p>
        <div className="link-card__actions">
          <button type="button" className="btn" onClick={() => void copy()}>
            {copied ? t('link.copied') : t('link.copy')}
          </button>
          {canShare ? (
            <button type="button" className="btn btn--primary" onClick={() => void share()}>
              {t('link.share')}
            </button>
          ) : null}
        </div>
      </section>

      <form className="card link-card" onSubmit={submit}>
        <h2 className="link-card__title">
          <label htmlFor="partner-code">{t('link.enterCode')}</label>
        </h2>
        <input
          id="partner-code"
          className="input input--code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 6))}
          placeholder={t('link.codePlaceholder')}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
        />
        {error ? <p className="banner banner--error">{error}</p> : null}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy || code.length !== 6}>
          {busy ? t('link.linking') : t('link.linkAction')}
        </button>
      </form>

      <Tip speaker={<Character emotion={null} state="waiting" outfit={outfitOf(profile)} size={50} still />}>
        {t('link.tip')}
      </Tip>

      <button type="button" className="btn btn--ghost center" onClick={() => void signOut()}>
        {t('auth.signOut')}
      </button>
    </div>
  );
}
