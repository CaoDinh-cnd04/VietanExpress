import { useMemo, useState } from 'react';
import { Modal } from '@/shared/ui';
import styles from './form.module.css';

export interface PickerItem {
  key: string;
  title: string;
  subtitle: string;
  onPick: () => void;
}

interface AddressPickerDialogProps {
  open: boolean;
  title: string;
  items: PickerItem[];
  loading?: boolean;
  onClose: () => void;
}

/** Hộp thoại chọn nhanh từ danh sách (hồ sơ người gửi / sổ địa chỉ), có ô tìm kiếm. */
export function AddressPickerDialog({ open, title, items, loading, onClose }: AddressPickerDialogProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter(i => `${i.title} ${i.subtitle}`.toLowerCase().includes(q)) : items;
  }, [items, query]);

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <input className={styles.pickerSearch} placeholder="Tìm nhanh…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Tìm trong danh sách" autoFocus />
      {loading ? (
        <p className={styles.pickerEmpty}>Đang tải…</p>
      ) : filtered.length ? (
        <ul className={styles.pickerList}>
          {filtered.map(item => (
            <li key={item.key}>
              <button
                type="button"
                className={styles.pickerItem}
                onClick={() => {
                  item.onPick();
                  onClose();
                }}
              >
                <span className={styles.pickerAvatar} aria-hidden="true">{item.title.slice(0, 2).toUpperCase()}</span>
                <span className={styles.pickerText}>
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </span>
                <span className={styles.pickerGo}>Chọn</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.pickerEmpty}>Không tìm thấy.</p>
      )}
    </Modal>
  );
}
