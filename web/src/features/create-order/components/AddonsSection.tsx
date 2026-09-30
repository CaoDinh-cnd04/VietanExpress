import { Controller, useFormContext } from 'react-hook-form';
import { Card } from '@/shared/ui';
import { ADDONS } from '../constants';
import type { CreateOrderValues } from '../schema';
import styles from './form.module.css';

/** Tùy chọn dịch vụ (Service options) — chọn nhiều, hiển thị song ngữ Việt / Anh. */
export function AddonsSection() {
  const { control } = useFormContext<CreateOrderValues>();
  return (
    <Card title="Tùy chọn dịch vụ" subtitle="(Service options)">
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
                    <strong className={styles.checkEn} lang="en">{a.nameEn}</strong>
                    <small lang="en">{a.descriptionEn}</small>
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
