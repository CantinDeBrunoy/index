import { useEffect, useState } from 'react';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Segmented } from '@/components/Segmented';
import { ErrorBanner } from '@/components/States';
import { Switch } from '@/components/Switch';
import { clockInTimeZone, formatInstant, formatOffset, formatTime, offsetBetween } from '@/lib/dates';
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

const STEP_MINUTES = 30;

export function SettingsScreen() {
  const { t, locale, setLocale } = useI18n();
  // L'heure du build se lit chez qui regarde : c'est un instant réel, pas une
  // journée d'entrée — le seul endroit de l'app où une conversion est juste.
  const buildDate = formatInstant(__BUILD_AT__, locale);
  const { user, profile, partner, updateProfile, unlinkPartner, signOut } = useAuth();
  const { refresh } = useEntries();

  const [confirm, setConfirm] = useState<'unlink' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushState, setPushState] = useState(() => permissionState());
  const [clock, setClock] = useState(() => (partner ? clockInTimeZone(partner.timezone) : ''));

  // L'heure du binôme avance en direct : c'est tout l'intérêt quand il est à
  // l'autre bout du monde.
  useEffect(() => {
    if (!partner) return;
    const update = () => setClock(clockInTimeZone(partner.timezone));
    update();
    const interval = window.setInterval(update, 10_000);
    return () => window.clearInterval(interval);
  }, [partner]);

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

  return (
    <div className="stack">
      <h1>{t('settings.title')}</h1>
      {error ? <ErrorBanner message={error} /> : null}

      {/* ---------------- binôme ---------------- */}
      <span className="section-title">{t('settings.partnerSection')}</span>
      {partner ? (
        <div className="card card--flush">
          <div className="card-row">
            <span className="muted">{t('link.linkedWith', { name: partnerName })}</span>
          </div>
          <div className="card-row">
            <span className="grow stack-sm">
              <span>{t('settings.partnerLocalTime', { name: partnerName })}</span>
              <span className="faint small">{partner.timezone}</span>
            </span>
            <strong style={{ fontVariantNumeric: 'tabular-nums', fontSize: 20 }}>{clock}</strong>
          </div>
          <div className="card-row">
            <span className="muted">{t('settings.offsetLabel')}</span>
            <span>{formatOffset(offset, t('settings.sameTime'))}</span>
          </div>
          <div className="card-row">
            <button
              type="button"
              className="btn btn--ghost btn--danger"
              onClick={() => setConfirm('unlink')}
            >
              {t('link.unlink')}
            </button>
          </div>
        </div>
      ) : (
        <p className="muted small">{t('today.partnerNoLink')}</p>
      )}

      {/* ---------------- rappel ---------------- */}
      <span className="section-title">{t('settings.reminderSection')}</span>
      <div className="card card--flush">
        <div className="card-row">
          <span className="grow stack-sm">
            <span>{t('settings.reminderEnabled')}</span>
            <span className="faint small">{t('settings.reminderHint')}</span>
          </span>
          <Switch
            checked={profile.reminders_enabled && Boolean(profile.push_token)}
            onChange={(value) => void toggleReminders(value)}
            label={t('settings.reminderEnabled')}
            disabled={!pushSupported()}
          />
        </div>
        <div className="card-row">
          <span className="grow">{t('settings.reminderTime')}</span>
          <span className="row">
            <button
              type="button"
              className="btn btn--icon"
              aria-label="-30"
              onClick={() => void shiftReminder(-STEP_MINUTES)}
            >
              −
            </button>
            <strong style={{ fontVariantNumeric: 'tabular-nums', minWidth: 52, textAlign: 'center' }}>
              {formatTime(profile.reminder_hour, profile.reminder_minute)}
            </strong>
            <button
              type="button"
              className="btn btn--icon"
              aria-label="+30"
              onClick={() => void shiftReminder(STEP_MINUTES)}
            >
              +
            </button>
          </span>
        </div>
      </div>
      {pushState === 'unsupported' ? (
        <p className="faint small">{t('settings.pushUnsupported')}</p>
      ) : pushState === 'denied' ? (
        <p className="faint small">{t('settings.pushDenied')}</p>
      ) : isIosWithoutStandalone() ? (
        <p className="faint small">{t('settings.pushIosHint')}</p>
      ) : null}

      {/* ---------------- langue ---------------- */}
      <span className="section-title">{t('settings.languageSection')}</span>
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
      <span className="section-title">{t('settings.account')}</span>
      <div className="card card--flush">
        <div className="card-row">
          <span className="muted">{user?.email}</span>
        </div>
        <div className="card-row">
          <span className="grow stack-sm">
            <span className="muted">{t('settings.timezone')}</span>
            <span className="faint small">{profile.timezone}</span>
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {clockInTimeZone(profile.timezone)}
          </span>
        </div>
        <div className="card-row">
          <button type="button" className="btn btn--ghost" onClick={() => void signOut()}>
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
