import { Controller, useFormContext } from 'react-hook-form';
import { Card } from '@/shared/ui';
import { ADDONS } from '../constants';
import type { CreateOrderValues } from '../schema';
import styles from './form.module.css';

/** Dịch vụ cộng thêm — chọn nhiều. */
export function AddonsSection() {
  const { control } = useFormContext<CreateOrderValues>();
  return (
    <Card title="Dịch vụ cộng thêm" subtitle="(tùy chọn)">
      <Controller
        control={control}
        name="addons"
        render={({ field }) => (
          <div className={styles.checkGrid}>
            {ADDONS.map(a => {
              const checked = field.value.includes(a.name);
              return (
                <label key={a.name} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => field.onChange(checked ? field.value.filter(x => x !== a.name) : [...field.value, a.name])}
                  />
                  <span>
                    <strong>{a.name}</strong>
                    <small>{a.description}</small>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      />
    </Card>
  );
}
