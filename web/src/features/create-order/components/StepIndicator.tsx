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
  return (
    <ol className={styles.steps} aria-label="Các bước tạo đơn">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <li key={s.title}>
            <button type="button" className={cx(styles.step, styles[state])} onClick={() => onSelect(i)} aria-current={state === 'active' ? 'step' : undefined}>
              <span className={styles.stepNum}>{state === 'done' ? <Icon name="check" size={15} /> : i + 1}</span>
              <span className={styles.stepText}>
                <strong>{s.title}</strong>
                <small>{s.description}</small>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
