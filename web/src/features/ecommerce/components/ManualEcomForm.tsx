import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { BRANCHES, CARRIERS, COUNTRIES, DEFAULT_SERVICE, defaultHub, hubOptions } from '@/shared/config/domain';
import { findCountry, normalizePostal, shouldResetAddress, useCountries, usePostalLookup } from '@/features/create-order';
import { useI18n } from '@/shared/i18n';
import { useDebouncedCallback } from '@/shared/lib/useDebouncedCallback';
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
  postal: z.string(),
  city: z.string(),
  state: z.string(),
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
  postal: '',
  city: '',
  state: '',
  address: '',
  service: DEFAULT_SERVICE.carrier,
  hub: DEFAULT_SERVICE.hub,
  kg: '',
  products: [emptyProduct()],
  customs: { declaredValue: '', goodsType: GOODS_TYPES[0], receiverId: '', ioss: '', eori: '', vat: '', salesLink: '', paymentRef: '', manufacturer: '' }
});

const SOURCE_OPTIONS = (Object.keys(ECOM_SOURCES) as EcomSource[]).map(k => ({ value: k, label: ECOM_SOURCES[k].label }));

/** Đánh bill lẻ cho shop ít đơn: 1 đơn, 1–5 sản phẩm, khai hải quan nâng cao tùy chọn. */
export function ManualEcomForm() {
  const { t } = useI18n();
  const create = useCreateManualEcomOrder();
  const { control, register, handleSubmit, reset, setValue, setError, clearErrors, formState } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults() });
  const { fields, append, remove } = useFieldArray({ control, name: 'products' });
  const service = useWatch({ control, name: 'service' });
  const e = formState.errors;

  // ---------- Nước đến: danh sách từ GET /geo/countries; mã bưu chính → thành phố, bang qua GeoNames ----------
  const countries = useCountries();
  // API lỗi → danh sách tĩnh (mã = tên) để form vẫn dùng được.
  const countryList = useMemo(() => (countries.data?.length ? countries.data : COUNTRIES.map(name => ({ code: name, name }))), [countries.data]);
  const [countryText = '', postalText = ''] = useWatch({ control, name: ['ct', 'postal'] });
  const country = findCountry(countryList, countryText);
  const isoCode = country?.code.length === 2 ? country.code : undefined;

  const [postalQuery, setPostalQuery] = useState<string | null>(null);
  const schedulePostal = useDebouncedCallback((value: string | null) => setPostalQuery(value), 500);
  useEffect(() => schedulePostal(normalizePostal(postalText)), [postalText, schedulePostal]);
  const postal = usePostalLookup(isoCode, postalQuery);
  useEffect(() => {
    const info = postal.data;
    if (!info || info.countryCode !== isoCode || info.postalCode !== normalizePostal(postalText)) return;
    setValue('city', info.city, { shouldDirty: true });
    setValue('state', info.state ?? '', { shouldDirty: true });
  }, [postal.data, isoCode, postalText, setValue]);

  // Đổi sang nước khác → xoá mã bưu chính, thành phố, bang của nước cũ.
  const lastCountry = useRef<string | undefined>(undefined);
  const onCountryInput = (ev: { target: { value: string } }) => {
    const next = findCountry(countryList, ev.target.value)?.code;
    if (shouldResetAddress(lastCountry.current, next)) {
      for (const f of ['postal', 'city', 'state'] as const) setValue(f, '', { shouldDirty: true });
      setPostalQuery(null);
    }
    if (next) {
      lastCountry.current = next;
      clearErrors('ct');
    }
  };

  const postalHint = !isoCode || !postalQuery
    ? undefined
    : postal.isFetching
      ? 'Đang tra mã bưu chính…'
      : postal.data
        ? `→ ${[postal.data.city, postal.data.state].filter(Boolean).join(', ')}`
        : postal.data === null
          ? 'Không tìm thấy mã này — vui lòng tự nhập thành phố, tỉnh / bang'
          : undefined;

  const submit = handleSubmit(v => {
    const picked = findCountry(countryList, v.ct);
    if (!picked) {
      setError('ct', { message: 'Chọn nước trong danh sách' });
      return;
    }
    create.mutate(
      {
        ...v,
        ct: picked.name,
        countryCode: picked.code.length === 2 ? picked.code : undefined,
        source: v.source as EcomSource,
        kg: Number(v.kg) || 0,
        products: v.products.map(p => ({ ...p, qty: Number(p.qty), fobPrice: Number(p.fobPrice), sellingPrice: Number(p.sellingPrice) }))
      },
      {
        onSuccess: () => {
          reset(defaults());
          lastCountry.current = undefined;
          setPostalQuery(null);
        }
      }
    );
  });

  return (
    <Card title="Tạo 1 đơn" subtitle="· tối đa 5 sản phẩm">
      <form onSubmit={ev => void submit(ev)} noValidate className={styles.formSections}>
        <section>
          <h3 className={styles.subTitle}>{t('Đơn hàng')}</h3>
          <FormGrid columns={3}>
            <TextField label="Mã đơn của shop (REF)" required error={e.ref?.message} {...register('ref')} />
            <SelectField label="Nguồn" options={SOURCE_OPTIONS} {...register('source')} />
            <SelectField label="Chi nhánh gửi" options={BRANCHES} {...register('branch')} />
          </FormGrid>
        </section>

        <section>
          <h3 className={styles.subTitle}>{t('Người nhận')}</h3>
          <FormGrid columns={3}>
            <TextField label="Tên người nhận" required error={e.cnee?.message} {...register('cnee')} />
            <TextField
              label="Nước đến"
              required
              list="va-ecom-countries"
              autoComplete="country-name"
              placeholder={countries.isLoading ? t('Đang tải danh sách nước…') : t('Gõ để tìm nước')}
              error={e.ct?.message}
              {...register('ct', { onChange: onCountryInput })}
            />
            <TextField label="Mã bưu chính" autoComplete="postal-code" hint={postalHint} {...register('postal')} />
            <TextField label="Thành phố" {...register('city')} />
            <TextField label="Tỉnh / bang" {...register('state')} />
            <TextField label="Địa chỉ người nhận" required className={styles.fullRow} error={e.address?.message} {...register('address')} />
          </FormGrid>
          <datalist id="va-ecom-countries">{countryList.map(c => <option key={c.code} value={c.name} />)}</datalist>
        </section>

        <section>
          <h3 className={styles.subTitle}>{t('Vận chuyển')}</h3>
          <FormGrid columns={3}>
            <SelectField
              label="Dịch vụ"
              required
              options={CARRIERS}
              error={e.service?.message}
              {...register('service', { onChange: ev => setValue('hub', defaultHub(ev.target.value as string)) })}
            />
            <SelectField label="Hub" required options={hubOptions(service)} error={e.hub?.message} {...register('hub')} />
            <TextField label="Cân nặng" type="number" min={0} step="any" suffix="kg" hint="Để trống nếu Việt An cân" {...register('kg')} />
          </FormGrid>
        </section>

        <section>
          <h3 className={styles.subTitle}>{t('Sản phẩm ({n}/{max})', { n: fields.length, max: MAX_PRODUCTS })}</h3>
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
                  <Button iconOnly variant="ghost" aria-label={t('Xóa sản phẩm {n}', { n: i + 1 })} disabled={fields.length <= 1} onClick={() => remove(i)}>
                    <Icon name="close" size={15} />
                  </Button>
                </div>
              );
            })}
          </div>
          <Button size="sm" disabled={fields.length >= MAX_PRODUCTS} onClick={() => append(emptyProduct())}>
            <Icon name="plus" size={15} /> {t('Thêm sản phẩm')}
          </Button>
        </section>

        <details className={styles.details}>
          <summary>{t('Khai báo hải quan nâng cao (tùy chọn — cho hàng đi US / EU)')}</summary>
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
          <Button onClick={() => reset(defaults())}>{t('Làm mới')}</Button>
          <Button variant="primary" type="submit" disabled={create.isPending}>{t(create.isPending ? 'Đang tạo…' : 'Tạo đơn & cấp bill')}</Button>
        </div>
      </form>
    </Card>
  );
}
