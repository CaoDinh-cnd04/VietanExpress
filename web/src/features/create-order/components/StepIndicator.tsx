import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Icon } from '@/shared/ui';
import type { WizardStep } from '../constants';
import styles from './StepIndicator.module.css';

/** 1 khung con trong 1 bước (vd "Người gửi") — `id` là id phần tử trên trang để cuộn tới. */
export interface StepSection {
  id: string;
  label: string;
}

interface StepIndicatorProps {
  steps: ReadonlyArray<WizardStep>;
  /** Các khung con của từng bước (cùng thứ tự với `steps`). */
  sections: ReadonlyArray<ReadonlyArray<StepSection>>;
  /** Bước đang làm / đang xem. */
  current: number;
  /** Khung đang xem (theo vị trí cuộn). */
  activeSection?: string;
  onSelectStep: (step: number) => void;
  onSelectSection: (step: number, sectionId: string) => void;
  /** Hiện dấu tích ở bước đã qua (từng bước). Tạo đơn 1 trang tắt đi — chỉ đánh dấu phần đang xem. */
  showDone?: boolean;
}

/**
 * Dòng thời gian dọc các bước tạo đơn: vòng số nối nhau bằng 1 đường dọc (phần đã qua tô màu),
 * dưới mỗi bước là các khung con để nhảy tới. Trang tạo đơn ghim nó theo khi cuộn, trải hết chiều cao màn hình.
 */
export function StepIndicator({ steps, sections, current, activeSection, onSelectStep, onSelectSection, showDone = true }: StepIndicatorProps) {
  const { t } = useI18n();
  return (
    <nav className={styles.panel} aria-label={t('Các bước tạo đơn')}>
      <ol className={styles.timeline}>
        {steps.map((s, i) => {
          const state = i === current ? 'active' : i < current ? 'passed' : 'todo';
          const done = showDone && i < current;
          return (
            <li key={s.title} className={cx(styles.step, styles[state])}>
              <button type="button" className={styles.head} onClick={() => onSelectStep(i)} aria-current={state === 'active' ? 'step' : undefined}>
                <span className={cx(styles.num, done && styles.numDone)}>{done ? <Icon name="check" size={14} /> : i + 1}</span>
                <span className={styles.text}>
                  <strong>{t(s.title)}</strong>
                  <small>{t(s.description)}</small>
                </span>
              </button>
              {(sections[i]?.length ?? 0) > 0 && (
                <ul className={styles.subs}>
                  {sections[i]!.map(sec => (
                    <li key={sec.id}>
                      <button
                        type="button"
                        className={cx(styles.sub, sec.id === activeSection && styles.subActive)}
                        aria-current={sec.id === activeSection ? 'location' : undefined}
                        onClick={() => onSelectSection(i, sec.id)}
                      >
                        {t(sec.label)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
