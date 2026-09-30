import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { ORDER_STATUS } from '../constants';
import { ALL_STATUSES, parseStatuses, toggleStatus } from '../lib/multi-filter';
import type { OrderListResponse } from '../types';
import styles from './StatusFilter.module.css';

interface StatusFilterProps {
  /** "all" hoặc danh sách "wait,fly". */
  value: string;
  onChange: (value: string) => void;
  counts?: OrderListResponse['summary']['statusCounts'];
}

/** Lọc trạng thái — bấm để bật / tắt, chọn được nhiều trạng thái cùng lúc. "Tất cả" bỏ hết lựa chọn. */
export function StatusFilter({ value, onChange, counts }: StatusFilterProps) {
  const { t } = useI18n();
  const picked = new Set(parseStatuses(value));
  const all = picked.size === 0;

  return (
    <div className={styles.bar} role="group" aria-label={t('Lọc theo trạng thái (chọn được nhiều)')}>
      <button type="button" aria-pressed={all} className={cx(styles.chip, all && styles.on)} onClick={() => onChange('all')}>
        {t('Tất cả')}
        {counts && <span className={styles.count}>{counts.all}</span>}
      </button>
      <span className={styles.divider} aria-hidden="true" />
      {ALL_STATUSES.map(s => {
        const on = picked.has(s);
        return (
          <button key={s} type="button" aria-pressed={on} className={cx(styles.chip, on && styles.on)} onClick={() => onChange(toggleStatus(value, s))}>
            <span className={cx(styles.check, on && styles.checkOn)} aria-hidden="true" />
            {t(ORDER_STATUS[s].label)}
            {counts && <span className={styles.count}>{counts[s]}</span>}
          </button>
        );
      })}
      <span className={styles.hint}>{t('Bấm nhiều trạng thái để lọc cùng lúc')}</span>
    </div>
  );
}
