import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import styles from './Stars.module.css';

const LEVELS = [1, 2, 3, 4, 5] as const;
/** Ý nghĩa từng mức — hiện cạnh hàng sao khi khách chọn / rê chuột. */
export const RATING_LABELS: Record<number, string> = {
  1: 'Rất không hài lòng',
  2: 'Không hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng'
};

/** Chọn 1–5 sao (bấm lại sao đang chọn để bỏ). Nhóm radio — dùng phím ← → được. */
export function StarRating({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const { t } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div className={styles.picker}>
      <div className={styles.row} role="radiogroup" aria-label={t('Đánh giá')} onMouseLeave={() => setHover(null)}>
        {LEVELS.map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={t('{n} sao — {label}', { n, label: t(RATING_LABELS[n]!) })}
            className={cx(styles.star, n <= shown && styles.on)}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(value === n ? null : n)}
          >
            ★
          </button>
        ))}
      </div>
      <span className={styles.hint}>{shown ? t(RATING_LABELS[shown]!) : t('Chưa chọn')}</span>
    </div>
  );
}

/** Hiện số sao đã chấm (chỉ đọc). */
export function Stars({ value, size = 'sm' }: { value: number | null | undefined; size?: 'sm' | 'md' }) {
  const { t } = useI18n();
  if (!value) return null;
  return (
    <span className={cx(styles.display, size === 'md' && styles.md)} title={t(RATING_LABELS[value] ?? '')} aria-label={t('{n}/5 sao', { n: value })}>
      {LEVELS.map(n => (
        <span key={n} className={cx(styles.dot, n <= value && styles.on)} aria-hidden="true">★</span>
      ))}
    </span>
  );
}
