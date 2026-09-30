import { Controller, useFormContext } from 'react-hook-form';
import { useI18n } from '@/shared/i18n';
import { Card } from '@/shared/ui';
import { ADDONS } from '../constants';
import type { CreateOrderValues } from '../schema';
import styles from './form.module.css';

/** Tùy chọn dịch vụ — chọn nhiều. Giá trị lưu là tên tiếng Việt; hiển thị theo ngôn ngữ đang chọn. */
export function AddonsSection() {
  const { t } = useI18n();
  const { control } = useFormContext<CreateOrderValues>();
  return (
    <Card title="Tùy chọn dịch vụ">
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
                    <strong>{t(a.name)}</strong>
                    <small>{t(a.description)}</small>
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
