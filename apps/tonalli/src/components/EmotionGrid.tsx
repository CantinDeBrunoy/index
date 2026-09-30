import { EMOTIONS, veilOpacity } from '@/lib/emotions';
import { useI18n } from '@/state/I18nProvider';

type Props = {
  value: string | null;
  onChange: (emotion: string) => void;
};

/**
 * Les 12 émotions. On choisit un nom, la couleur suit — l'association est
 * fixe, c'est elle qui donne son sens au calendrier.
 *
 * Chaque pastille porte un cerne brun, un voile chaud dosé selon la froideur
 * de la couleur (la sérénité ou le neutre en ont besoin, la joie très peu) et
 * un liseré de lumière constant — c'est ce qui pose les 12 couleurs sur un
 * fond crème sans qu'aucune ne jure.
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
          <span className="emotion-dot" style={{ background: emotion.color }} aria-hidden>
            <span
              className="emotion-dot__veil"
              style={{ '--veil': veilOpacity(emotion.key) } as React.CSSProperties}
            />
            <span className="emotion-dot__sheen" />
          </span>
          <span className="emotion-name">{t(`emotions.${emotion.key}`)}</span>
        </button>
      ))}
    </div>
  );
}
