import { get, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
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
        <p className={styles.hint}>Đơn chứng từ (DOC) không cần khai invoice. Chỉ khai shipping fee bên dưới nếu có.</p>
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
            <SelectField label="Hình thức xuất khẩu" options={EXPORT_TYPES} {...bind('invoice.exportType')} />
            <SelectField label="Tiền tệ" options={CURRENCIES} {...bind('invoice.currency')} />
          </FormGrid>

          <div className={cx(styles.tableScroll, styles.spaced)}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colNo}>#</th>
                  <th>Mô tả hàng hóa <span className={styles.required}>*</span> — tên EN / VN / nhà sản xuất</th>
                  <th className={styles.colNum}>Xuất xứ</th>
                  <th className={styles.colHs}>Mã HS</th>
                  <th className={styles.colQtyUnit}>SL <span className={styles.required}>*</span> / ĐVT</th>
                  <th className={styles.colNum}>Đơn giá <span className={styles.required}>*</span></th>
                  <th className={styles.colNum}>Thành tiền</th>
                  <th className={styles.colDel}><span className="visually-hidden">Xóa</span></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={f.id}>
                    <td className={styles.rowNo}>{i + 1}</td>
                    <td>
                      <div className={styles.stack}>
                        {cell(i, 'descEn', { placeholder: 'Tên tiếng Anh (bắt buộc)', 'aria-label': `Tên EN mặt hàng ${i + 1}` })}
                        {cell(i, 'descVi', { placeholder: 'Tên tiếng Việt', 'aria-label': `Tên VN mặt hàng ${i + 1}` })}
                        {cell(i, 'manufacturer', { placeholder: 'Nhà sản xuất, địa chỉ', 'aria-label': `Nhà sản xuất mặt hàng ${i + 1}` })}
                      </div>
                    </td>
                    <td>{cell(i, 'origin', { 'aria-label': `Xuất xứ mặt hàng ${i + 1}` })}</td>
                    <td>{cell(i, 'hs', { placeholder: '6204.43', 'aria-label': `Mã HS mặt hàng ${i + 1}` })}</td>
                    <td>
                      <div className={styles.qtyUnit}>
                        {cell(i, 'qty', { type: 'number', min: 0, step: 'any', 'aria-label': `Số lượng mặt hàng ${i + 1}` })}
                        <select className={styles.cell} aria-label={`Đơn vị mặt hàng ${i + 1}`} {...register(`invoice.items.${i}.unit`)}>
                          {UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </td>
                    <td>{cell(i, 'price', { type: 'number', min: 0, step: 'any', 'aria-label': `Đơn giá mặt hàng ${i + 1}` })}</td>
                    <td className={styles.computed}>{items[i] ? fmt.format(lineTotal(items[i])) : 0}</td>
                    <td>
                      <Button size="sm" iconOnly variant="ghost" aria-label={`Xóa mặt hàng ${i + 1}`} disabled={fields.length <= 1} onClick={() => remove(i)}>
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
              <Icon name="plus" size={15} /> Thêm mặt hàng
            </Button>
            <div className={styles.invoiceTotal}>
              <span>Tổng giá trị invoice · {items.length} mặt hàng</span>
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
