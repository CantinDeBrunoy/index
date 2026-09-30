import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Loading } from '@/components/States';
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
  if (lower.includes('rate limit') || lower.includes('security purposes')) return t('auth.rateLimited');
  // Avant le test générique sur « password », qu'il contient aussi.
  if (lower.includes('different from the old')) return t('auth.samePassword');
  if (lower.includes('password')) return t('auth.passwordTooShort');
  if (lower.includes('fetch') || lower.includes('network')) return t('common.networkError');
  return message;
}

function LanguagePicker() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="row center" style={{ justifyContent: 'center', gap: 8 }}>
      {LOCALES.map((option: Locale) => (
        <button
          key={option}
          type="button"
          className="btn btn--ghost small"
          style={{ color: option === locale ? 'var(--text)' : 'var(--text-faint)' }}
          onClick={() => setLocale(option)}
        >
          {option === 'fr' ? t('settings.french') : t('settings.spanish')}
        </button>
      ))}
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
      <div className="stack-sm center" style={{ marginTop: 40, marginBottom: 12 }}>
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

      <Link to="/forgot-password" state={{ email }} className="btn btn--ghost center">
        {t('auth.forgotPassword')}
      </Link>
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
      <div className="stack-sm center" style={{ marginTop: 40, marginBottom: 12 }}>
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

export function ForgotPasswordScreen() {
  const { t } = useI18n();
  const { requestPasswordReset } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState(() => (location.state as { email?: string } | null)?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(authError((caught as Error).message, t));
    } finally {
      setBusy(false);
    }
  };

  // Même message qu'il existe un compte ou non : l'écran ne doit pas servir à
  // vérifier si une adresse est inscrite. Supabase répond d'ailleurs pareil.
  if (sent) {
    return (
      <div className="app app--plain stack center" style={{ marginTop: 60 }}>
        <h1>{t('auth.resetSentTitle')}</h1>
        <p className="muted">{t('auth.resetSentBody')}</p>
        <Link to="/sign-in" className="btn btn--block">
          {t('auth.backToSignIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="app app--plain stack">
      <div className="stack-sm center" style={{ marginTop: 40, marginBottom: 12 }}>
        <h1>{t('auth.forgotTitle')}</h1>
        <p className="muted small">{t('auth.forgotBody')}</p>
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
        {error ? <p className="banner banner--error">{error}</p> : null}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {t('auth.sendResetLink')}
        </button>
      </form>

      <Link to="/sign-in" className="btn btn--ghost center">
        {t('auth.backToSignIn')}
      </Link>
    </div>
  );
}

/**
 * Destination du lien reçu par e-mail. Supabase a déjà ouvert une session à
 * partir du jeton de l'URL : il ne reste qu'à écrire le nouveau mot de passe.
 * Sans session, le lien a expiré ou a déjà servi.
 */
export function ResetPasswordScreen() {
  const { t } = useI18n();
  const { status, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'loading') {
    return (
      <div className="app app--plain">
        <Loading />
      </div>
    );
  }

  if (status === 'signed-out') {
    return (
      <div className="app app--plain stack center" style={{ marginTop: 60 }}>
        <h1>{t('auth.resetLinkInvalidTitle')}</h1>
        <p className="muted">{t('auth.resetLinkInvalidBody')}</p>
        <Link to="/forgot-password" className="btn btn--primary btn--block">
          {t('auth.requestNewLink')}
        </Link>
        <Link to="/sign-in" className="btn btn--ghost center">
          {t('auth.backToSignIn')}
        </Link>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(authError((caught as Error).message, t));
      setBusy(false);
    }
  };

  return (
    <div className="app app--plain stack">
      <div className="stack-sm center" style={{ marginTop: 40, marginBottom: 12 }}>
        <h1>{t('auth.resetTitle')}</h1>
      </div>

      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="password">{t('auth.newPassword')}</label>
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
        <div className="field">
          <label htmlFor="confirm">{t('auth.confirmPassword')}</label>
          <input
            id="confirm"
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
        {error ? <p className="banner banner--error">{error}</p> : null}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {t('auth.savePassword')}
        </button>
      </form>
    </div>
  );
}
