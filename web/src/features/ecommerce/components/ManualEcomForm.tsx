import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { BRANCHES, CARRIER_HUBS, CARRIERS, COUNTRIES } from '@/shared/config/domain';
import { Button, Card, FormGrid, Icon, SelectField, TextField } from '@/shared/ui';
import { useCreateManualEcomOrder } from '../api';
import { ECOM_SOURCES, GOODS_TYPES, MAX_PRODUCTS } from '../constants';
import type { EcomSource } from '../types';
import styles from './ecommerce.module.css';

const num = (msg: string) => z.string().refine(v => v.trim() !== '' && Number(v) >= 0, msg);
const product = z.object({
  name: z.string().trim().min(1, 'Nhập tên hàng'),
  sku: z.string(),
  qty: z.string().refine(v => Number(v) >= 1, 'SL ≥ 1'),
  fobPrice: num('Nhập giá FOB'),
  sellingPrice: num('Nhập giá bán'),
  hsCode: z.string()
});

const schema = z.object({
  ref: z.string().trim().min(1, 'Nhập mã đơn của shop'),
  source: z.string(),
  branch: z.string().min(1),
  cnee: z.string().trim().min(1, 'Nhập tên người nhận'),
  ct: z.string().trim().min(1, 'Nhập nước đến'),
  address: z.string().trim().min(1, 'Nhập địa chỉ'),
  service: z.string().min(1, 'Chọn dịch vụ'),
  hub: z.string().min(1, 'Chọn hub'),
  kg: z.string(),
  products: z.array(product).min(1).max(MAX_PRODUCTS),
  customs: z.object({
    declaredValue: z.string(),
    goodsType: z.string(),
    receiverId: z.string(),
    ioss: z.string(),
    eori: z.string(),
    vat: z.string(),
    salesLink: z.string(),
    paymentRef: z.string(),
    manufacturer: z.string()
  })
});
type FormValues = z.infer<typeof schema>;

const emptyProduct = (): FormValues['products'][number] => ({ name: '', sku: '', qty: '1', fobPrice: '', sellingPrice: '', hsCode: '' });
const defaults = (): FormValues => ({
  ref: '',
  source: 'tiktok',
  branch: 'TP.HCM',
  cnee: '',
  ct: '',
  address: '',
  service: 'Chuyên tuyến',
  hub: CARRIER_HUBS['Chuyên tuyến']?.[0] ?? '',
  kg: '',
  products: [emptyProduct()],
  customs: { declaredValue: '', goodsType: GOODS_TYPES[0], receiverId: '', ioss: '', eori: '', vat: '', salesLink: '', paymentRef: '', manufacturer: '' }
});

const SOURCE_OPTIONS = (Object.keys(ECOM_SOURCES) as EcomSource[]).map(k => ({ value: k, label: ECOM_SOURCES[k].label }));

/** Đánh bill lẻ cho shop ít đơn: 1 đơn, 1–5 sản phẩm, khai hải quan nâng cao tùy chọn. */
export function ManualEcomForm() {
  const create = useCreateManualEcomOrder();
  const { control, register, handleSubmit, reset, setValue, formState } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults() });
  const { fields, append, remove } = useFieldArray({ control, name: 'products' });
  const service = useWatch({ control, name: 'service' });
  const e = formState.errors;

  const submit = handleSubmit(v =>
    create.mutate(
      {
        ...v,
        source: v.source as EcomSource,
        kg: Number(v.kg) || 0,
        products: v.products.map(p => ({ ...p, qty: Number(p.qty), fobPrice: Number(p.fobPrice), sellingPrice: Number(p.sellingPrice) }))
      },
      { onSuccess: () => reset(defaults()) }
    )
  );

  return (
    <Card title="Đánh bill lẻ (nhập tay)" subtitle="· 1 đơn, tối đa 5 sản phẩm">
      <form onSubmit={ev => void submit(ev)} noValidate className="page-stack">
        <FormGrid columns={3}>
          <TextField label="Mã đơn của shop (REF)" required error={e.ref?.message} {...register('ref')} />
          <SelectField label="Nguồn" options={SOURCE_OPTIONS} {...register('source')} />
          <SelectField label="Chi nhánh gửi" options={BRANCHES} {...register('branch')} />
          <TextField label="Người nhận" required error={e.cnee?.message} {...register('cnee')} />
          <TextField label="Nước đến" required list="va-ecom-countries" error={e.ct?.message} {...register('ct')} />
          <TextField label="Cân nặng" type="number" min={0} step="any" suffix="kg" hint="Để trống nếu Việt An cân" {...register('kg')} />
          <TextField label="Địa chỉ người nhận" required wide error={e.address?.message} {...register('address')} />
          <SelectField
            label="Dịch vụ"
            required
            options={CARRIERS}
            error={e.service?.message}
            {...register('service', { onChange: ev => setValue('hub', CARRIER_HUBS[ev.target.value as string]?.[0] ?? '') })}
          />
          <SelectField label="Hub" required options={CARRIER_HUBS[service] ?? []} error={e.hub?.message} {...register('hub')} />
        </FormGrid>
        <datalist id="va-ecom-countries">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>

        <section>
          <h3 className={styles.subTitle}>Sản phẩm ({fields.length}/{MAX_PRODUCTS})</h3>
          <div className={styles.productList}>
            {fields.map((f, i) => {
              const pe = e.products?.[i];
              return (
                <div key={f.id} className={styles.productRow}>
                  <TextField label="Tên hàng (EN)" required error={pe?.name?.message} {...register(`products.${i}.name`)} />
                  <TextField label="SKU" {...register(`products.${i}.sku`)} />
                  <TextField label="SL" type="number" min={1} error={pe?.qty?.message} {...register(`products.${i}.qty`)} />
                  <TextField label="Giá FOB" type="number" min={0} step="any" error={pe?.fobPrice?.message} {...register(`products.${i}.fobPrice`)} />
                  <TextField label="Giá bán" type="number" min={0} step="any" error={pe?.sellingPrice?.message} {...register(`products.${i}.sellingPrice`)} />
                  <TextField label="Mã HS" {...register(`products.${i}.hsCode`)} />
                  <Button iconOnly variant="ghost" aria-label={`Xóa sản phẩm ${i + 1}`} disabled={fields.length <= 1} onClick={() => remove(i)}>
                    <Icon name="close" size={15} />
                  </Button>
                </div>
              );
            })}
          </div>
          <Button size="sm" disabled={fields.length >= MAX_PRODUCTS} onClick={() => append(emptyProduct())}>
            <Icon name="plus" size={15} /> Thêm sản phẩm
          </Button>
        </section>

        <details className={styles.details}>
          <summary>Khai báo hải quan nâng cao (tùy chọn — cho hàng đi US / EU)</summary>
          <FormGrid columns={3}>
            <TextField label="Tổng giá trị khai (declared value)" {...register('customs.declaredValue')} />
            <SelectField label="Loại hàng" options={GOODS_TYPES} {...register('customs.goodsType')} />
            <TextField label="CMND / ID người nhận" {...register('customs.receiverId')} />
            <TextField label="IOSS (EU)" {...register('customs.ioss')} />
            <TextField label="EORI (EU)" {...register('customs.eori')} />
            <TextField label="VAT number" {...register('customs.vat')} />
            <TextField label="Link sản phẩm / gian hàng" {...register('customs.salesLink')} />
            <TextField label="Mã giao dịch thanh toán" {...register('customs.paymentRef')} />
            <TextField label="Nhà sản xuất: tên · nước · địa chỉ" {...register('customs.manufacturer')} />
          </FormGrid>
        </details>

        <div className={styles.formActions}>
          <Button onClick={() => reset(defaults())}>Làm mới</Button>
          <Button variant="primary" type="submit" disabled={create.isPending}>{create.isPending ? 'Đang tạo…' : 'Tạo đơn & cấp bill'}</Button>
        </div>
      </form>
    </Card>
  );
}
