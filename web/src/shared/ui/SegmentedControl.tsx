import { useId } from 'react';
import { cx } from '@/shared/lib/cx';
import styles from './SegmentedControl.module.css';

interface SegmentedControlProps<V extends string> {
  options: ReadonlyArray<{ value: V; label: string }>;
  value: V;
  onChange: (value: V) => void;
  ariaLabel: string;
}

/** Nhóm radio dạng nút liền — cho lựa chọn loại trừ nhau (DOC/PACK, chế độ nhập…). */
export function SegmentedControl<V extends string>({ options, value, onChange, ariaLabel }: SegmentedControlProps<V>) {
  const name = useId();
  return (
    <div className={styles.group} role="radiogroup" aria-label={ariaLabel}>
      {options.map(o => (
        <label key={o.value} className={cx(styles.option, o.value === value && styles.checked)}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
            className="visually-hidden"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
