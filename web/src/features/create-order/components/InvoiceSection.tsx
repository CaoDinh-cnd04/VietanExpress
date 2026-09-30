import { get, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Button, Card, FormGrid, Icon, SelectField, TextField } from '@/shared/ui';
import { CURRENCIES, EXPORT_TYPES, UNITS } from '../constants';
import { useFieldBinder } from '../hooks/useFieldBinder';
import { invoiceTotal, lineTotal } from '../lib/shipment';
import { emptyInvoiceItem, type CreateOrderValues } from '../schema';
import { InvoiceToolbar } from './InvoiceToolbar';
import styles from './form.module.css';

type ItemKey = keyof ReturnType<typeof emptyInvoiceItem>;

export function InvoiceSection() {
  const bind = useFieldBinder();
  const { t } = useI18n();
  const { control, register, formState } = useFormContext<CreateOrderValues>();
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'invoice.items' });
  const [type, items = [], currency] = useWatch({ control, name: ['shipment.type', 'invoice.items', 'invoice.currency'] });
  const fmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
  const err = (i: number, key: ItemKey) => get(formState.errors, `invoice.items.${i}.${key}`)?.message as string | undefined;
  const cell = (i: number, key: ItemKey, props: Record<string, unknown> = {}) => (
    <input className={cx(styles.cell, err(i, key) && styles.cellInvalid)} title={err(i, key)} {...props} {...register(`invoice.items.${i}.${key}`)} />
  );

  return (
    <Card title="Invoice" subtitle="(khai báo hải quan)">
      {type === 'DOC' ? (
        <p className={styles.hint}>{t('Đơn chứng từ (DOC) không cần khai invoice. Chỉ khai shipping fee bên dưới nếu có.')}</p>
      ) : (
        <>
          <InvoiceToolbar
            onItems={(list, mode) => {
              // Thay dòng trống mặc định thay vì để lại dòng rỗng phía trên
              const onlyBlank = items.length === 1 && !items[0]?.descEn && !items[0]?.price;
              if (mode === 'replace' || onlyBlank) replace(list);
              else append(list);
            }}
          />
          <FormGrid columns={3}>
            <SelectField label="Hình thức xuất khẩu" required placeholder="Chọn hình thức xuất khẩu" options={EXPORT_TYPES} {...bind('invoice.exportType')} />
            <SelectField label="Đơn vị tiền tệ" required placeholder="Đơn vị tiền tệ" options={CURRENCIES} {...bind('invoice.currency')} />
          </FormGrid>

          <div className={cx(styles.tableScroll, styles.spaced)}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colNo}>#</th>
                  <th>{t('Mô tả hàng hóa')} <span className={styles.required}>*</span> — {t('tên EN / VN / nhà sản xuất')}</th>
                  <th className={styles.colNum}>{t('Xuất xứ')}</th>
                  <th className={styles.colHs}>{t('Mã HS')}</th>
                  <th className={styles.colQtyUnit}>{t('SL')} <span className={styles.required}>*</span> / {t('ĐVT')}</th>
                  <th className={styles.colNum}>{t('Đơn giá')} <span className={styles.required}>*</span></th>
                  <th className={styles.colNum}>{t('Thành tiền')}</th>
                  <th className={styles.colDel}><span className="visually-hidden">{t('Xóa')}</span></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={f.id}>
                    <td className={styles.rowNo}>{i + 1}</td>
                    <td>
                      <div className={styles.stack}>
                        {cell(i, 'descEn', { placeholder: t('Tên tiếng Anh (bắt buộc)'), 'aria-label': t('Tên EN mặt hàng {n}', { n: i + 1 }) })}
                        {cell(i, 'descVi', { placeholder: t('Tên tiếng Việt'), 'aria-label': t('Tên VN mặt hàng {n}', { n: i + 1 }) })}
                        {cell(i, 'manufacturer', { placeholder: t('Nhà sản xuất, địa chỉ'), 'aria-label': t('Nhà sản xuất mặt hàng {n}', { n: i + 1 }) })}
                      </div>
                    </td>
                    <td>{cell(i, 'origin', { 'aria-label': t('Xuất xứ mặt hàng {n}', { n: i + 1 }) })}</td>
                    <td>{cell(i, 'hs', { placeholder: '6204.43', 'aria-label': t('Mã HS mặt hàng {n}', { n: i + 1 }) })}</td>
                    <td>
                      <div className={styles.qtyUnit}>
                        {cell(i, 'qty', { type: 'number', min: 0, step: 'any', 'aria-label': t('Số lượng mặt hàng {n}', { n: i + 1 }) })}
                        <select className={styles.cell} aria-label={t('Đơn vị mặt hàng {n}', { n: i + 1 })} {...register(`invoice.items.${i}.unit`)}>
                          {UNITS.map(u => <option key={u} value={u}>{t(u)}</option>)}
                        </select>
                      </div>
                    </td>
                    <td>{cell(i, 'price', { type: 'number', min: 0, step: 'any', 'aria-label': t('Đơn giá mặt hàng {n}', { n: i + 1 }) })}</td>
                    <td className={styles.computed}>{items[i] ? fmt.format(lineTotal(items[i])) : 0}</td>
                    <td>
                      <Button size="sm" iconOnly variant="ghost" aria-label={t('Xóa mặt hàng {n}', { n: i + 1 })} disabled={fields.length <= 1} onClick={() => remove(i)}>
                        <Icon name="close" size={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.tableFooter}>
            <Button size="sm" onClick={() => append(emptyInvoiceItem())}>
              <Icon name="plus" size={15} /> {t('Thêm mặt hàng')}
            </Button>
            <div className={styles.invoiceTotal}>
              <span>{t('Tổng giá trị invoice · {n} mặt hàng', { n: items.length })}</span>
              <strong>{fmt.format(invoiceTotal(items))} {currency}</strong>
            </div>
          </div>
        </>
      )}

      <div className={styles.spaced}>
        <FormGrid columns={3}>
          <TextField label="Shipping fee (nếu khai)" type="number" min={0} step="any" suffix={currency} {...bind('invoice.shippingFee')} />
        </FormGrid>
      </div>
    </Card>
  );
}
