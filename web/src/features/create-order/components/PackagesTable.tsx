import { get, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Button, Card, Icon, Notice } from '@/shared/ui';
import { cx } from '@/shared/lib/cx';
import { PACKAGING_TYPES, RULES } from '../constants';
import { evaluatePackages } from '../lib/carrier-limits';
import { summarizePackages, volumetricWeight } from '../lib/shipment';
import { emptyPackage, type CreateOrderValues } from '../schema';
import styles from './form.module.css';

const NUM_COLS = [
  { key: 'length', label: 'Dài (cm)' },
  { key: 'width', label: 'Rộng (cm)' },
  { key: 'height', label: 'Cao (cm)' },
  { key: 'weight', label: 'Cân/kiện (kg)' }
] as const;

/** Bảng chi tiết kiện: SL, bao bì, kích thước, cân; tự tính quy đổi & cân tính cước. */
export function PackagesTable({ onPackagesInput }: { onPackagesInput: () => void }) {
  const { control, register, formState } = useFormContext<CreateOrderValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'packages' });
  const packages = useWatch({ control, name: 'packages' }) ?? [];
  const carrier = useWatch({ control, name: 'service.carrier' });
  const summary = summarizePackages(packages);
  const warnings = evaluatePackages(carrier, packages);
  const err = (path: string) => get(formState.errors, path)?.message as string | undefined;
  const reg = (path: `packages.${number}.${'qty' | 'packaging' | 'length' | 'width' | 'height' | 'weight'}`) =>
    register(path, { onChange: onPackagesInput });

  return (
    <Card title="Chi tiết kiện hàng" actions={<span className={styles.hint}>Quy đổi = D×R×C ÷ {RULES.volumetricDivisor}</span>}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colQty}>SL <span className={styles.required}>*</span></th>
              <th>Loại bao bì <span className={styles.required}>*</span></th>
              {NUM_COLS.map(c => <th key={c.key} className={styles.colNum}>{c.label}</th>)}
              <th className={styles.colNum}>Quy đổi (kg)</th>
              <th className={styles.colDel}><span className="visually-hidden">Xóa</span></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => (
              <tr key={f.id}>
                <td>
                  <input type="number" min={1} aria-label={`Số lượng dòng ${i + 1}`} className={cx(styles.cell, err(`packages.${i}.qty`) && styles.cellInvalid)} {...reg(`packages.${i}.qty`)} />
                </td>
                <td>
                  <select aria-label={`Bao bì dòng ${i + 1}`} className={cx(styles.cell, err(`packages.${i}.packaging`) && styles.cellInvalid)} {...reg(`packages.${i}.packaging`)}>
                    <option value="">Chọn</option>
                    {PACKAGING_TYPES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </td>
                {NUM_COLS.map(c => (
                  <td key={c.key}>
                    <input type="number" min={0} step="any" aria-label={`${c.label} dòng ${i + 1}`} className={styles.cell} {...reg(`packages.${i}.${c.key}`)} />
                  </td>
                ))}
                <td className={styles.computed}>{packages[i] ? volumetricWeight(packages[i]) : 0}</td>
                <td>
                  <Button
                    size="sm"
                    iconOnly
                    variant="ghost"
                    aria-label={`Xóa dòng kiện ${i + 1}`}
                    disabled={fields.length <= 1}
                    onClick={() => {
                      remove(i);
                      queueMicrotask(onPackagesInput);
                    }}
                  >
                    <Icon name="close" size={15} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.tableFooter}>
        <Button
          size="sm"
          onClick={() => {
            append(emptyPackage());
            queueMicrotask(onPackagesInput);
          }}
        >
          <Icon name="plus" size={15} /> Thêm kiện
        </Button>
        <dl className={styles.totals}>
          <div><dt>Tổng kiện</dt><dd>{summary.pieces}</dd></div>
          <div><dt>Cân thực</dt><dd>{summary.grossWeight} kg</dd></div>
          <div><dt>Quy đổi</dt><dd>{summary.volumetricWeight} kg</dd></div>
          <div><dt>Tính cước</dt><dd className={styles.emphasis}>{summary.chargeableWeight} kg</dd></div>
        </dl>
      </div>
      {warnings.length > 0 && (
        <div className={styles.warnings}>
          {warnings.map(w => (
            <Notice key={w.title} tone={w.level === 'critical' ? 'danger' : w.level === 'warning' ? 'warning' : 'info'} title={w.title}>
              {w.detail}
            </Notice>
          ))}
        </div>
      )}
    </Card>
  );
}
