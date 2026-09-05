import { EMOTIONS } from '@/lib/emotions';
import { useI18n } from '@/state/I18nProvider';

type Props = {
  value: string | null;
  onChange: (emotion: string) => void;
};

/**
 * Les 12 émotions. On choisit un nom, la couleur suit — l'association est
 * fixe, c'est elle qui donne son sens au calendrier.
 */
export function EmotionGrid({ value, onChange }: Props) {
  const { t } = useI18n();

  return (
    <div className="emotions" role="radiogroup" aria-label={t('today.chooseEmotion')}>
      {EMOTIONS.map((emotion) => (
        <button
          key={emotion.key}
          type="button"
          role="radio"
          className="emotion"
          aria-checked={value === emotion.key}
          onClick={() => onChange(emotion.key)}
        >
          <span className="emotion-dot" style={{ background: emotion.color }} aria-hidden />
          <span className="emotion-name">{t(`emotions.${emotion.key}`)}</span>
        </button>
      ))}
    </div>
  );
}
