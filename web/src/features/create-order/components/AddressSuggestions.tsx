import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import type { AddressSuggestion } from '../lib/geo';
import styles from './form.module.css';

interface Props {
  id: string;
  items: readonly AddressSuggestion[];
  active: number;
  onPick: (item: AddressSuggestion) => void;
}

export const suggestionOptionId = (listId: string, index: number) => `${listId}-${index}`;

/**
 * Danh sách gợi ý địa chỉ sổ dưới ô Địa chỉ 1 (ô đó là combobox, giữ focus; phím ↑ ↓ Enter Esc xử lý ở ReceiverSection).
 * onMouseDown chặn mất focus của ô nhập để bấm chuột chọn được trước khi danh sách đóng.
 */
export function AddressSuggestions({ id, items, active, onPick }: Props) {
  const { t } = useI18n();
  return (
    <div className={styles.suggestPanel}>
      <ul id={id} role="listbox" aria-label={t('Gợi ý địa chỉ')} className={styles.suggestList}>
        {items.map((s, i) => (
          <li
            key={s.label}
            id={suggestionOptionId(id, i)}
            role="option"
            aria-selected={i === active}
            className={cx(styles.suggestItem, i === active && styles.suggestActive)}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onPick(s)}
          >
            {s.label}
          </li>
        ))}
      </ul>
      {/* Điều kiện dùng gói miễn phí Geoapify: ghi nguồn dữ liệu. */}
      <p className={styles.suggestCredit}>Powered by Geoapify · © OpenStreetMap contributors</p>
    </div>
  );
}
