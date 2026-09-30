import { useI18n } from '@/shared/i18n';
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
  const { t } = useI18n();
  return (
    <div className={styles.tabs} role="tablist" aria-label={t(ariaLabel)}>
      {items.map(tab => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === value}
          className={cx(styles.tab, tab.key === value && styles.active)}
          onClick={() => onChange(tab.key)}
        >
          {t(tab.label)}
          {tab.count !== undefined && <span className={styles.count}>{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
