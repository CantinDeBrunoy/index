import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Logo } from '@/components/Logo';
import { WelcomeSun } from '@/components/WelcomeSun';
import { LOCALES } from '@/lib/i18n';
import type { Locale } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useI18n } from '@/state/I18nProvider';

/** Traduit les messages de Supabase, qui arrivent toujours en anglais. */
function authError(message: string, t: (key: string) => string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) return t('auth.invalidCredentials');
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return t('auth.emailTaken');
  }
  if (lower.includes('password')) return t('auth.passwordTooShort');
  if (lower.includes('fetch') || lower.includes('network')) return t('common.networkError');
  return message;
}

/**
 * Chaque langue écrite dans la sienne : quelqu'un qui ne lit pas le
 * français doit pouvoir trouver « español » sur un écran en français.
 */
const LOCALE_NAMES: Record<Locale, string> = { fr: 'français', es: 'español' };

function LanguagePicker() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="language-picker">
      {LOCALES.map((option: Locale, index) => (
        <span key={option} className="language-picker__item">
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          <button
            type="button"
            lang={option}
            aria-pressed={option === locale}
            onClick={() => setLocale(option)}
          >
            {LOCALE_NAMES[option]}
          </button>
        </span>
      ))}
    </div>
  );
}

/** Retour à l'accueil, en haut à gauche des formulaires. */
function BackToWelcome() {
  const { t } = useI18n();
  return (
    <Link to="/welcome" className="btn btn--icon" aria-label={t('auth.back')}>
      ‹
    </Link>
  );
}

/**
 * L'accueil : le soleil de Tonalli, le personnage qui passe par les douze
 * émotions, et les deux portes — se connecter, créer un compte. C'est le
 * premier écran d'une personne qui n'est pas connectée.
 */
export function WelcomeScreen() {
  const { t } = useI18n();
  return (
    <div className="app app--plain welcome">
      <div className="welcome__hero">
        <WelcomeSun />
        <h1 className="welcome__title">{t('common.appName')}</h1>
        <p className="muted welcome__tagline">{t('common.tagline')}</p>
      </div>
      <div className="welcome__actions">
        <Link to="/sign-in" className="btn btn--primary btn--block btn--tall">
          {t('auth.signIn')}
        </Link>
        <Link to="/sign-up" className="btn btn--outline btn--block btn--tall">
          {t('auth.signUpTitle')}
        </Link>
        <LanguagePicker />
      </div>
    </div>
  );
}

export function SignInScreen() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(authError((caught as Error).message, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app app--plain stack">
      <BackToWelcome />
      <div className="stack-sm center" style={{ marginTop: 8, marginBottom: 12 }}>
        <Logo />
        <h1>{t('common.appName')}</h1>
        <p className="muted small">{t('common.tagline')}</p>
      </div>

      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">{t('auth.email')}</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error ? <p className="banner banner--error">{error}</p> : null}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {t('auth.signIn')}
        </button>
      </form>

      <Link to="/sign-up" className="btn btn--ghost center">
        {t('auth.noAccount')}
      </Link>
      <LanguagePicker />
    </div>
  );
}

export function SignUpScreen() {
  const { t } = useI18n();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const needsConfirmation = await signUp(email, password, displayName);
      if (needsConfirmation) setConfirmation(true);
      else navigate('/link', { replace: true });
    } catch (caught) {
      setError(authError((caught as Error).message, t));
    } finally {
      setBusy(false);
    }
  };

  if (confirmation) {
    return (
      <div className="app app--plain stack center" style={{ marginTop: 60 }}>
        <Logo />
        <h1>{t('auth.confirmEmailTitle')}</h1>
        <p className="muted">{t('auth.confirmEmailBody')}</p>
        <Link to="/sign-in" className="btn btn--block">
          {t('auth.signIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="app app--plain stack">
      <BackToWelcome />
      <div className="stack-sm center" style={{ marginTop: 8, marginBottom: 12 }}>
        <Logo />
        <h1>{t('auth.signUpTitle')}</h1>
        <p className="muted small">{t('common.tagline')}</p>
      </div>

      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="name">{t('auth.displayName')}</label>
          <input
            id="name"
            className="input"
            required
            placeholder={t('auth.displayNamePlaceholder')}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="email">{t('auth.email')}</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error ? <p className="banner banner--error">{error}</p> : null}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {t('auth.signUp')}
        </button>
      </form>

      <Link to="/sign-in" className="btn btn--ghost center">
        {t('auth.hasAccount')}
      </Link>
      <LanguagePicker />
    </div>
  );
}
