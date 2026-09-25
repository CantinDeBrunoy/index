import { useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { BackButton } from '@/components/BackButton';
import { Character } from '@/components/Character';
import { Sun, WelcomeSun } from '@/components/WelcomeSun';
import { LOCALES } from '@/lib/i18n';
import type { Locale } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useI18n } from '@/state/I18nProvider';

/** Le mot de passe le plus court que Supabase accepte ici. */
const MIN_PASSWORD = 8;

type AuthProblem = { field: 'password' | 'credentials' | null; message: string };

/**
 * Traduit les messages de Supabase, qui arrivent toujours en anglais, et dit
 * quel champ les porte : l'erreur se lit sous le champ fautif, qui se cercle
 * de sa couleur.
 */
function authProblem(message: string, t: (key: string) => string): AuthProblem {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) return { field: 'credentials', message: t('auth.invalidCredentials') };
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return { field: null, message: t('auth.emailTaken') };
  }
  if (lower.includes('password')) return { field: 'password', message: t('auth.passwordTooShort') };
  if (lower.includes('fetch') || lower.includes('network')) return { field: null, message: t('common.networkError') };
  return { field: null, message };
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
          <button type="button" lang={option} aria-pressed={option === locale} onClick={() => setLocale(option)}>
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
  return <BackButton to="/welcome" label={t('auth.back')} />;
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
        <WelcomeSun named />
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

/** Le haut des formulaires : le même soleil que l'accueil, en petit, le titre et une ligne. */
function AuthHeader({ size, title, subtitle }: { size: number; title: string; subtitle: string }) {
  return (
    <div className="auth-header">
      {/* Petit, un rayon fin disparaîtrait : on l'épaissit à mesure que le soleil rétrécit. */}
      <WelcomeSun size={size} rayWidth={size < 140 ? 11 : 10} />
      <h1 className="auth-header__title">{title}</h1>
      <p className="muted auth-header__subtitle">{subtitle}</p>
    </div>
  );
}

type FieldProps = {
  label: string;
  /** Sous le champ : une aide, ou l'erreur qui la remplace. */
  note?: ReactNode;
  invalid?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

function Field({ label, note, invalid = false, id, ...input }: FieldProps) {
  const fallback = useId();
  const inputId = id ?? fallback;
  const noteId = `${inputId}-note`;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        className={invalid ? 'input input--invalid' : 'input'}
        aria-invalid={invalid || undefined}
        aria-describedby={note ? noteId : undefined}
        {...input}
      />
      {note ? (
        <p id={noteId} className={invalid ? 'field__note field__note--error' : 'field__note'}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Le mot de passe, avec « Afficher » : sur un téléphone, une faute de frappe
 * invisible coûte un aller-retour. Le bouton garde un nom fixe pour les
 * lecteurs d'écran, son état passe par `aria-pressed`.
 */
function PasswordField({
  label,
  note,
  invalid = false,
  ...input
}: Omit<FieldProps, 'type'>) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          className={invalid ? 'input input--invalid' : 'input'}
          aria-invalid={invalid || undefined}
          aria-describedby={note ? noteId : undefined}
          {...input}
        />
        <button
          type="button"
          className="password__toggle"
          aria-label={t('auth.showPassword')}
          aria-pressed={shown}
          aria-controls={id}
          onClick={() => setShown((current) => !current)}
        >
          {shown ? t('auth.hide') : t('auth.show')}
        </button>
      </div>
      {note ? (
        <p id={noteId} className={invalid ? 'field__note field__note--error' : 'field__note'} role={invalid ? 'alert' : undefined}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** « Pas encore de compte ? Créer un compte », en bas de l'écran. */
function SwitchLink({ prompt, to, label }: { prompt: string; to: string; label: string }) {
  return (
    <p className="auth-switch">
      {prompt}{' '}
      <Link to={to} className="auth-switch__link">
        {label}
      </Link>
    </p>
  );
}

export function SignInScreen() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (caught) {
      setProblem(authProblem((caught as Error).message, t));
    } finally {
      setBusy(false);
    }
  };

  // Identifiants refusés : on ne sait pas lequel des deux est faux, les deux champs se cerclent.
  const credentials = problem?.field === 'credentials' || problem?.field === 'password';

  return (
    <div className="app app--plain auth">
      <BackToWelcome />
      <AuthHeader size={148} title={t('auth.signInTitle')} subtitle={t('auth.signInSubtitle')} />

      <form className="auth-form" onSubmit={submit}>
        <Field
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t('auth.emailPlaceholder')}
          required
          invalid={credentials}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          label={t('auth.password')}
          autoComplete="current-password"
          required
          invalid={credentials}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {problem ? (
          <p className="auth-form__error" role="alert">
            {problem.message}
          </p>
        ) : null}
        <button type="submit" className="btn btn--primary btn--block btn--tall" disabled={busy}>
          {busy ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>

      <SwitchLink prompt={t('auth.noAccount')} to="/sign-up" label={t('auth.signUpTitle')} />
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
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setProblem({ field: 'password', message: t('auth.passwordTooShort') });
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const needsConfirmation = await signUp(email, password, displayName);
      if (needsConfirmation) setConfirmation(true);
      else navigate('/link', { replace: true });
    } catch (caught) {
      setProblem(authProblem((caught as Error).message, t));
    } finally {
      setBusy(false);
    }
  };

  if (confirmation) {
    // Rien ne défile ici : le personnage dort en attendant que le lien soit ouvert.
    return (
      <div className="app app--plain auth">
        <BackToWelcome />
        <div className="auth-sent">
          <Sun size={200} lit={null}>
            <Character emotion={null} state="sleeping" size={168} />
          </Sun>
          <h1 className="auth-header__title">{t('auth.confirmEmailTitle')}</h1>
          <p className="muted auth-sent__body">
            {t('auth.confirmEmailSentTo')} <strong className="auth-sent__email">{email}</strong>. {t('auth.confirmEmailBody')}
          </p>
          <Link to="/sign-in" className="btn btn--outline btn--block btn--tall">
            {t('auth.signIn')}
          </Link>
        </div>
      </div>
    );
  }

  const passwordProblem = problem?.field === 'password';

  return (
    <div className="app app--plain auth">
      <BackToWelcome />
      <AuthHeader size={124} title={t('auth.signUpTitle')} subtitle={t('auth.signUpSubtitle')} />

      <form className="auth-form auth-form--tight" onSubmit={submit}>
        <Field
          label={t('auth.displayName')}
          autoComplete="given-name"
          placeholder={t('auth.displayNamePlaceholder')}
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <Field
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t('auth.emailPlaceholder')}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {/* La règle est écrite d'avance sous le champ ; en cas d'erreur, c'est elle qui devient le message. */}
        <PasswordField
          label={t('auth.password')}
          autoComplete="new-password"
          required
          invalid={passwordProblem}
          note={passwordProblem ? problem.message : t('auth.passwordHint')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {problem && !passwordProblem ? (
          <p className="auth-form__error" role="alert">
            {problem.message}
          </p>
        ) : null}
        <button type="submit" className="btn btn--primary btn--block btn--tall" disabled={busy}>
          {busy ? t('auth.signingUp') : t('auth.signUp')}
        </button>
      </form>

      <SwitchLink prompt={t('auth.hasAccount')} to="/sign-in" label={t('auth.signIn')} />
    </div>
  );
}
