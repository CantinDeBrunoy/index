import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Character } from '@/components/Character';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Segmented } from '@/components/Segmented';
import { ErrorBanner } from '@/components/States';
import { StreakBadge } from '@/components/Streak';
import { Switch } from '@/components/Switch';
import { clockInTimeZone, formatGap, formatInstant, formatTime, offsetBetween } from '@/lib/dates';
import { DEFAULT_STREAK_SYMBOL, STREAK_SYMBOLS } from '@/lib/streak';
import {
  isIosWithoutStandalone,
  permissionState,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push';
import type { Locale } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useEntries } from '@/state/EntriesProvider';
import { useI18n } from '@/state/I18nProvider';
import { useMyLook } from '@/state/look';

const STEP_MINUTES = 30;

export function SettingsScreen() {
  const { t, locale, setLocale } = useI18n();
  // L'heure du build se lit chez qui regarde : c'est un instant réel, pas une
  // journée d'entrée — le seul endroit de l'app où une conversion est juste.
  const buildDate = formatInstant(__BUILD_AT__, locale);
  const { user, profile, partner, updateProfile, unlinkPartner, signOut } = useAuth();
  const { refresh } = useEntries();
  const look = useMyLook();

  const [confirm, setConfirm] = useState<'unlink' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushState, setPushState] = useState(() => permissionState());
  // Les deux horloges avancent en direct : c'est tout l'intérêt quand le
  // binôme est à l'autre bout du monde.
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setTick((tick) => tick + 1), 10_000);
    return () => window.clearInterval(interval);
  }, []);

  if (!profile) return null;

  const changeLocale = async (next: Locale) => {
    setLocale(next);
    try {
      await updateProfile({ locale: next });
    } catch {
      setError(t('common.networkError'));
    }
  };

  const shiftReminder = async (deltaMinutes: number) => {
    const total =
      (profile.reminder_hour * 60 + profile.reminder_minute + deltaMinutes + 24 * 60) % (24 * 60);
    try {
      await updateProfile({
        reminder_hour: Math.floor(total / 60),
        reminder_minute: total % 60,
      });
    } catch {
      setError(t('common.networkError'));
    }
  };

  const toggleReminders = async (enabled: boolean) => {
    setError(null);
    try {
      if (enabled) {
        const subscription = await subscribeToPush();
        setPushState(permissionState());
        await updateProfile({ reminders_enabled: true, push_token: subscription });
      } else {
        await unsubscribeFromPush();
        await updateProfile({ reminders_enabled: false, push_token: null });
      }
    } catch {
      setError(t('common.networkError'));
    }
  };

  const runUnlink = async () => {
    setBusy(true);
    try {
      await unlinkPartner();
      await refresh();
      setConfirm(null);
    } catch {
      setError(t('common.networkError'));
    } finally {
      setBusy(false);
    }
  };

  const offset = partner ? offsetBetween(partner.timezone, profile.timezone) : 0;
  const partnerName = partner?.display_name || '—';
  const gap =
    offset === 0
      ? t('settings.sameTime')
      : t(offset > 0 ? 'settings.partnerAhead' : 'settings.partnerBehind', { gap: formatGap(offset) });
  const remindersOn = profile.reminders_enabled && Boolean(profile.push_token);

  return (
    <div className="stack settings">
      <h1>{t('settings.title')}</h1>
      {error ? <ErrorBanner message={error} /> : null}

      {/* ---------------- personnage ---------------- */}
      <Link to="/character" className="card card-link settings__character">
        <Character emotion={look.emotion} color={look.color} state={look.state} outfit={look.outfit} size={46} still />
        <span className="grow settings__row-text">
          <strong>{t('character.title')}</strong>
          <span className="settings__hint">{t('settings.characterHint')}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="settings__chevron" aria-hidden>
          <path d="M9,5 L16,12 L9,19" />
        </svg>
      </Link>

      {/* ---------------- binôme ---------------- */}
      <h2 className="section-title">{t('settings.partnerSection')}</h2>
      {partner ? (
        <div className="card card--flush">
          <div className="card-row">
            <span className="muted">{t('link.linkedWith', { name: partnerName })}</span>
          </div>
          <div className="card-row">
            <span className="grow settings__row-text">
              <span>{t('settings.partnerLocalTime', { name: partnerName })}</span>
              <span className="settings__hint">
                {partner.timezone} · {gap}
              </span>
            </span>
            <strong className="settings__clock settings__clock--large">{clockInTimeZone(partner.timezone)}</strong>
          </div>
          <div className="card-row">
            <button type="button" className="settings__action settings__action--danger" onClick={() => setConfirm('unlink')}>
              {t('link.unlink')}
            </button>
          </div>
        </div>
      ) : (
        <p className="muted small">{t('today.partnerNoLink')}</p>
      )}

      {/* ---------------- rappel ---------------- */}
      <h2 className="section-title">{t('settings.reminderSection')}</h2>
      <div className="card card--flush">
        <div className="card-row">
          <span className="grow settings__row-text">
            <span>{t('settings.reminderEnabled')}</span>
            <span className="settings__hint">{t('settings.reminderHint')}</span>
          </span>
          <Switch
            checked={remindersOn}
            onChange={(value) => void toggleReminders(value)}
            label={t('settings.reminderEnabled')}
            disabled={!pushSupported()}
          />
        </div>
        {/* L'heure reste réglable rappel coupé : elle attend, pâlie, qu'on le rallume. */}
        <div className="card-row" data-off={!remindersOn}>
          <span className="grow">{t('settings.reminderTime')}</span>
          <span className="settings__stepper">
            <button type="button" className="settings__step" aria-label="-30" onClick={() => void shiftReminder(-STEP_MINUTES)}>
              −
            </button>
            <strong className="settings__clock">{formatTime(profile.reminder_hour, profile.reminder_minute)}</strong>
            <button type="button" className="settings__step" aria-label="+30" onClick={() => void shiftReminder(STEP_MINUTES)}>
              +
            </button>
          </span>
        </div>
      </div>
      {pushState === 'unsupported' ? (
        <p className="settings__note">{t('settings.pushUnsupported')}</p>
      ) : pushState === 'denied' ? (
        <p className="settings__note">{t('settings.pushDenied')}</p>
      ) : isIosWithoutStandalone() ? (
        <p className="settings__note">{t('settings.pushIosHint')}</p>
      ) : null}

      {/* ---------------- série ----------------
          Le badge à droite du titre, tel qu'il se montre en haut de la page
          Aujourd'hui : on voit le symbole changer en le touchant. */}
      <div className="settings__title-row">
        <h2 className="section-title">{t('streak.section')}</h2>
        <StreakBadge />
      </div>
      <div className="reactions reactions--quick" role="radiogroup" aria-label={t('streak.section')}>
        {STREAK_SYMBOLS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="radio"
            className="reaction"
            aria-checked={(profile.streak_symbol || DEFAULT_STREAK_SYMBOL) === item.key}
            aria-label={t(`streak.names.${item.key}`)}
            title={t(`streak.names.${item.key}`)}
            onClick={() => void updateProfile({ streak_symbol: item.key })}
          >
            <span aria-hidden>{item.symbol}</span>
          </button>
        ))}
      </div>
      <p className="settings__note">{t('streak.hint')}</p>

      {/* ---------------- langue ---------------- */}
      <h2 className="section-title">{t('settings.languageSection')}</h2>
      <Segmented<Locale>
        label={t('settings.languageSection')}
        value={locale}
        onChange={(next) => void changeLocale(next)}
        options={[
          { value: 'fr', label: t('settings.french') },
          { value: 'es', label: t('settings.spanish') },
        ]}
      />

      {/* ---------------- compte ---------------- */}
      <h2 className="section-title">{t('settings.account')}</h2>
      <div className="card card--flush">
        <div className="card-row">
          <span className="grow settings__row-text">
            <span className="muted">{user?.email}</span>
            <span className="settings__hint">
              {t('settings.timezone')} · {profile.timezone}
            </span>
          </span>
          <span className="settings__clock">{clockInTimeZone(profile.timezone)}</span>
        </div>
        <div className="card-row">
          <button type="button" className="settings__action" onClick={() => void signOut()}>
            {t('auth.signOut')}
          </button>
        </div>
      </div>

      {/* ----------- repère de build -----------
          Tout en bas, en petit : ce n'est pas une information dont on se sert,
          c'est celle qu'on va chercher quand on doute que l'écran soit à jour. */}
      <p className="faint small center build-stamp">
        {t('settings.build', { id: __BUILD_ID__, date: buildDate ?? '—' })}
      </p>

      {confirm === 'unlink' ? (
        <ConfirmSheet
          title={t('link.unlinkTitle', { name: partnerName })}
          body={t('link.unlinkBody')}
          confirmLabel={t('link.unlinkConfirm')}
          busy={busy}
          onConfirm={() => void runUnlink()}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
