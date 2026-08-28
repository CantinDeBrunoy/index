import { useI18n } from '@/state/I18nProvider';

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="row" style={{ justifyContent: 'center', padding: '32px 0' }}>
      <span className="spinner" aria-hidden />
      <span className="muted small">{label ?? t('common.loading')}</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="banner banner--error row-between" role="alert">
      <span className="grow">{message}</span>
      {onRetry ? (
        <button type="button" className="btn" onClick={onRetry}>
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  );
}

export function OfflineBanner() {
  const { t } = useI18n();
  return (
    <div className="banner" role="status">
      <strong>{t('common.offline')}</strong> — {t('common.offlineHint')}
    </div>
  );
}
