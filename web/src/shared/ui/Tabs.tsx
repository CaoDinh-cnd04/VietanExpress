import { cx } from '@/shared/lib/cx';
import styles from './Tabs.module.css';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  count?: number;
}

interface TabsProps<K extends string> {
  items: ReadonlyArray<TabItem<K>>;
  value: K;
  onChange: (key: K) => void;
  ariaLabel: string;
}

/** Tab gạch chân, có số đếm tùy chọn. */
export function Tabs<K extends string>({ items, value, onChange, ariaLabel }: TabsProps<K>) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={ariaLabel}>
      {items.map(t => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={t.key === value}
          className={cx(styles.tab, t.key === value && styles.active)}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {t.count !== undefined && <span className={styles.count}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
