import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getErrorMessage } from '@/shared/api/http';
import { COUNTRIES } from '@/shared/config/domain';
import { useI18n } from '@/shared/i18n';
import { formatNumber, formatVnd } from '@/shared/lib/format';
import { Button, Card, DataTable, FormGrid, Notice, SelectField, StatusPill, TextField, type Column } from '@/shared/ui';
import { useQuote } from '../api';
import type { ServiceQuote } from '../types';
import styles from './pricing.module.css';

const PRICE_NOTE =
  'Giá trên là ước tính, chưa gồm các phí phát sinh theo mặt hàng và quy định riêng của hãng bay. Vui lòng liên hệ nhân viên Việt An để được tư vấn.';

const dim = z.string().refine(v => v === '' || Number(v) >= 0, 'Không hợp lệ');
const schema = z.object({
  country: z.string().trim().min(1, 'Nhập nước đến'),
  weight: z.string().refine(v => Number(v) > 0, 'Nhập cân nặng (kg)'),
  type: z.enum(['PACK', 'DOC']),
  length: dim,
  width: dim,
  height: dim
});
type FormValues = z.infer<typeof schema>;

type SortKey = 'totalFare' | 'baseFare' | 'name' | 'eta';

/** Tab "Tra cứu & gợi ý": nhập lô hàng → so sánh giá mọi dịch vụ, chọn dịch vụ để tạo đơn. */
export function QuoteLookup() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const quote = useQuote();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'totalFare', dir: 1 });
  const { register, handleSubmit, formState, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { country: '', weight: '', type: 'PACK', length: '', width: '', height: '' }
  });
  const err = (k: keyof FormValues) => formState.errors[k]?.message;

  const submit = handleSubmit(v =>
    quote.mutate({
      country: v.country,
      weight: Number(v.weight),
      type: v.type,
      length: Number(v.length) || 0,
      width: Number(v.width) || 0,
      height: Number(v.height) || 0
    })
  );

  const rates = [...(quote.data ?? [])].sort((a, b) => {
    const va = a[sort.key], vb = b[sort.key];
    return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * sort.dir;
  });
  const cheapest = Math.min(...rates.map(r => r.totalFare));
  const sortHeader = (key: SortKey, label: string) => (
    <button type="button" className={styles.sortBtn} onClick={() => setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
      {t(label)} {sort.key === key && <span aria-hidden="true">{sort.dir === 1 ? '▲' : '▼'}</span>}
    </button>
  );

  const columns: ReadonlyArray<Column<ServiceQuote>> = [
    {
      key: 'name',
      header: sortHeader('name', 'Dịch vụ'),
      render: r => (
        <span className={styles.svcName}>
          {r.name} {r.totalFare === cheapest && <StatusPill tone="brand">{'Rẻ nhất'}</StatusPill>}
        </span>
      )
    },
    { key: 'zone', header: 'Zone', width: 70, render: r => r.zone },
    { key: 'base', header: sortHeader('baseFare', 'Cước'), align: 'right', render: r => formatVnd(r.baseFare) },
    { key: 'fsc', header: 'FSC', align: 'right', render: r => formatVnd(r.fscFee) },
    { key: 'sur', header: 'Phụ thu KT/TL', align: 'right', render: r => (r.hasSurcharge ? <span className={styles.warn}>{formatVnd(r.surcharges)}</span> : '—') },
    { key: 'vat', header: 'VAT', align: 'right', render: r => formatVnd(r.vatFee) },
    { key: 'total', header: sortHeader('totalFare', 'Tổng'), align: 'right', render: r => <strong className={styles.total}>{formatVnd(r.totalFare)}</strong> },
    { key: 'eta', header: sortHeader('eta', 'Dự kiến'), render: r => r.eta || '—' },
    {
      key: 'act',
      header: '',
      width: 90,
      render: r => (
        <Button size="sm" onClick={() => navigate(`/orders/new?carrier=${encodeURIComponent(r.name)}&country=${encodeURIComponent(getValues('country'))}`)}>
          {t('Chọn')}
        </Button>
      )
    }
  ];

  return (
    <div className={styles.stack}>
      <Card title="Thông tin lô hàng">
        <form onSubmit={e => void submit(e)} noValidate>
          <FormGrid columns={3}>
            <TextField label="Nước đến" required list="va-price-countries" error={err('country')} {...register('country')} />
            <TextField label="Cân nặng thực" required type="number" min={0} step="any" suffix="kg" error={err('weight')} {...register('weight')} />
            <SelectField label="Loại hàng" options={[{ value: 'PACK', label: 'Hàng hóa (PACK)' }, { value: 'DOC', label: 'Chứng từ (DOC)' }]} {...register('type')} />
            <TextField label="Dài" type="number" min={0} suffix="cm" hint="Để tính quy đổi & phụ thu" error={err('length')} {...register('length')} />
            <TextField label="Rộng" type="number" min={0} suffix="cm" error={err('width')} {...register('width')} />
            <TextField label="Cao" type="number" min={0} suffix="cm" error={err('height')} {...register('height')} />
          </FormGrid>
          <datalist id="va-price-countries">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
          <div className={styles.formActions}>
            <Button variant="primary" type="submit" disabled={quote.isPending}>{t(quote.isPending ? 'Đang tra cứu…' : 'Tra cứu & so sánh giá')}</Button>
          </div>
        </form>
      </Card>

      {quote.isError && <Notice tone="danger">{getErrorMessage(quote.error)}</Notice>}

      {quote.data && (
        <Card
          flush
          title={t('Kết quả cho {country}', { country: getValues('country') })}
          subtitle={rates[0] ? t('· cân tính cước {kg} kg (quy đổi {vol} kg)', { kg: formatNumber(rates[0].chargeableWeight), vol: formatNumber(rates[0].volumetricWeight) }) : undefined}
        >
          <DataTable
            caption="So sánh giá dịch vụ"
            columns={columns}
            rows={rates}
            rowKey={r => r.name}
            highlight={r => r.totalFare === cheapest}
            minWidth={860}
            empty={{ title: 'Không có dịch vụ phù hợp cho lô hàng này' }}
          />
          <div className={styles.note}>
            <Notice tone="warning">{t(PRICE_NOTE)}</Notice>
          </div>
        </Card>
      )}
    </div>
  );
}
