import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Icon } from '@/shared/ui';
import type { WizardStep } from '../constants';
import styles from './form.module.css';

interface StepIndicatorProps {
  steps: ReadonlyArray<WizardStep>;
  current: number;
  onSelect: (step: number) => void;
}

export function StepIndicator({ steps, current, onSelect }: StepIndicatorProps) {
  const { t } = useI18n();
  return (
    <ol className={styles.steps} aria-label={t('Các bước tạo đơn')}>
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <li key={s.title}>
            <button type="button" className={cx(styles.step, styles[state])} onClick={() => onSelect(i)} aria-current={state === 'active' ? 'step' : undefined}>
              <span className={styles.stepNum}>{state === 'done' ? <Icon name="check" size={15} /> : i + 1}</span>
              <span className={styles.stepText}>
                <strong>{t(s.title)}</strong>
                <small>{t(s.description)}</small>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
