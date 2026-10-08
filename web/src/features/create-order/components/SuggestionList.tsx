import type { ReactNode } from 'react';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import styles from './form.module.css';

export interface SuggestionItem {
  key: string;
  title: string;
  subtitle?: string;
}

interface Props {
  id: string;
  label: string;
  items: readonly SuggestionItem[];
  active: number;
  onPick: (index: number) => void;
  footer?: ReactNode;
}

export const suggestionOptionId = (listId: string, index: number) => `${listId}-${index}`;

/**
 * Danh sách gợi ý sổ dưới 1 ô nhập (ô đó là combobox, giữ focus; phím ↑ ↓ Enter Esc xử lý ở hook useCombobox).
 * onMouseDown chặn mất focus của ô nhập để bấm chuột chọn được trước khi danh sách đóng.
 */
export function SuggestionList({ id, label, items, active, onPick, footer }: Props) {
  const { t } = useI18n();
  return (
    <div className={styles.suggestPanel}>
      <ul id={id} role="listbox" aria-label={t(label)} className={styles.suggestList}>
        {items.map((s, i) => (
          <li
            key={s.key}
            id={suggestionOptionId(id, i)}
            role="option"
            aria-selected={i === active}
            className={cx(styles.suggestItem, i === active && styles.suggestActive)}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onPick(i)}
          >
            <div>{s.title}</div>
            {s.subtitle && <div className={styles.suggestSub}>{s.subtitle}</div>}
          </li>
        ))}
      </ul>
      {footer && <p className={styles.suggestCredit}>{footer}</p>}
    </div>
  );
}
