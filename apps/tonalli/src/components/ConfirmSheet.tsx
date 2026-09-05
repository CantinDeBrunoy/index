import { useI18n } from '@/state/I18nProvider';

type Props = {
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmation explicite pour les actions qui ne se rattrapent pas. */
export function ConfirmSheet({ title, body, confirmLabel, busy, onConfirm, onCancel }: Props) {
  const { t } = useI18n();

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="sheet stack" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p className="muted small">{body}</p>
        <button
          type="button"
          className="btn btn--block btn--danger"
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn btn--block btn--ghost" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
