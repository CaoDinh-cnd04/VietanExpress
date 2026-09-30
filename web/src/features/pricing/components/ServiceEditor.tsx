import { useState } from 'react';
import { COUNTRIES } from '@/shared/config/domain';
import { useI18n } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { Button, Card, FormGrid, Icon, Notice, SelectField, TextField, useToast } from '@/shared/ui';
import { useSaveService } from '../api';
import { WEIGHT_STEPS, quickFillZone, resizeZones, slugify } from '../lib/pricing';
import type { ShippingService, SurchargeRule } from '../types';
import styles from './pricing.module.css';

interface ServiceEditorProps {
  initial: ShippingService;
  isNew: boolean;
  onDone: () => void;
}

type CountryRow = { country: string; zone: number };
type RangeKey = Exclude<keyof SurchargeRule, 'fee'>;

const SUR_FIELDS: ReadonlyArray<{ key: RangeKey; label: string }> = [
  { key: 'wFrom', label: 'Cân từ (kg)' },
  { key: 'wTo', label: 'Cân đến' },
  { key: 'dFrom', label: 'Cạnh dài từ (cm)' },
  { key: 'dTo', label: 'Cạnh dài đến' },
  { key: 'gFrom', label: 'Chu vi từ (cm)' },
  { key: 'gTo', label: 'Chu vi đến' }
];

const toNum = (v: string) => (v.trim() === '' ? 0 : Number(v) || 0);
const toRange = (v: string): number | '' => (v.trim() === '' ? '' : Number(v) || 0);

/**
 * Soạn bảng giá 1 dịch vụ: thông tin chung → zone & nước → điền nhanh → lưới 140 mốc cân → phụ thu.
 * Dữ liệu lớn (lưới giá) nên dùng state thường thay vì react-hook-form.
 */
export function ServiceEditor({ initial, isNew, onDone }: ServiceEditorProps) {
  const { t } = useI18n();
  const toast = useToast();
  const save = useSaveService();
  const [svc, setSvc] = useState<ShippingService>(initial);
  const [countries, setCountries] = useState<CountryRow[]>(() => Object.entries(initial.zmap).map(([country, zone]) => ({ country, zone })));
  const [fill, setFill] = useState<Record<string, { base: string; step: string }>>({});
  const zoneKeys = svc.zones.map((_, i) => String(i + 1));
  const zoneOptions = svc.zones.map((z, i) => ({ value: String(i + 1), label: z }));

  const patch = (p: Partial<ShippingService>) => setSvc(s => ({ ...s, ...p }));
  const setPrice = (zone: string, idx: number, value: string) =>
    setSvc(s => ({ ...s, price: { ...s.price, [zone]: (s.price[zone] ?? []).map((v, i) => (i === idx ? toNum(value) : v)) } }));
  const setSur = (idx: number, p: Partial<SurchargeRule>) => setSvc(s => ({ ...s, sur: s.sur.map((r, i) => (i === idx ? { ...r, ...p } : r)) }));

  const applyFill = (zone: string) => {
    const f = fill[zone];
    if (!f || !f.base) return toast.show('Nhập giá mốc 0.5kg trước khi điền nhanh');
    setSvc(s => ({ ...s, price: { ...s.price, [zone]: quickFillZone(toNum(f.base), toNum(f.step)) } }));
    toast.show(t('Đã tạo thang giá cho {zone} — chỉnh tay ô lẻ nếu cần', { zone: svc.zones[Number(zone) - 1] ?? zone }), 'success');
  };

  const submit = () => {
    if (!svc.name.trim()) return toast.show('Nhập tên dịch vụ', 'error');
    const zmap = Object.fromEntries(countries.filter(c => c.country.trim()).map(c => [c.country.trim(), c.zone]));
    save.mutate({ ...svc, id: svc.id || slugify(svc.name), name: svc.name.trim(), zmap }, { onSuccess: onDone });
  };

  return (
    <Card flush>
      <div className={styles.note}>
        <div className={styles.editorHead}>
          <h2>{isNew ? t('Thêm dịch vụ') : t('Sửa bảng giá: {name}', { name: initial.name })}</h2>
          <Button onClick={onDone}>{t('Hủy')}</Button>
          <Button variant="primary" onClick={submit} disabled={save.isPending}>{t(save.isPending ? 'Đang lưu…' : 'Lưu bảng giá')}</Button>
        </div>

        <h3 className={styles.sectionTitle}>{t('1. Thông tin dịch vụ')}</h3>
        <FormGrid columns={4}>
          <TextField label="Tên dịch vụ" required value={svc.name} onChange={e => patch({ name: e.target.value })} />
          <TextField label="Tài khoản hãng" value={svc.account} onChange={e => patch({ account: e.target.value })} />
          <TextField label="Phụ phí xăng dầu (FSC)" type="number" step="any" suffix="%" value={svc.fsc * 100} onChange={e => patch({ fsc: toNum(e.target.value) / 100 })} />
          <TextField label="VAT" type="number" step="any" suffix="%" value={svc.vat * 100} onChange={e => patch({ vat: toNum(e.target.value) / 100 })} />
          <TextField label="Thời gian dự kiến" placeholder="VD 2–4 ngày" value={svc.eta} onChange={e => patch({ eta: e.target.value })} />
          <TextField label="Hiệu lực từ" type="date" value={svc.effFrom} onChange={e => patch({ effFrom: e.target.value })} />
          <TextField label="Hiệu lực đến" type="date" value={svc.effTo} onChange={e => patch({ effTo: e.target.value })} />
        </FormGrid>

        <h3 className={styles.sectionTitle}>{t('2. Zone & nước áp dụng')}</h3>
        <FormGrid columns={4}>
          <TextField label="Số zone" type="number" min={1} max={12} value={svc.zones.length} onChange={e => setSvc(s => resizeZones(s, Number(e.target.value)))} />
          <SelectField label="Zone mặc định (nước chưa khai)" options={zoneOptions} value={String(svc.dz)} onChange={e => patch({ dz: Number(e.target.value) })} />
        </FormGrid>
        <div className={`${styles.row} ${styles.spacedTop}`}>
          {svc.zones.map((z, i) => (
            <TextField key={i} label={t('Tên zone {n}', { n: i + 1 })} value={z} onChange={e => patch({ zones: svc.zones.map((x, j) => (j === i ? e.target.value : x)) })} />
          ))}
        </div>
        <datalist id="va-editor-countries">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
        <div className={styles.rowList}>
          {countries.map((c, i) => (
            <div key={i} className={styles.row}>
              <TextField label={i === 0 ? 'Nước' : ''} aria-label={t('Nước {n}', { n: i + 1 })} list="va-editor-countries" value={c.country} onChange={e => setCountries(list => list.map((x, j) => (j === i ? { ...x, country: e.target.value } : x)))} />
              <SelectField label={i === 0 ? 'Zone' : ''} aria-label={t('Zone của nước {n}', { n: i + 1 })} options={zoneOptions} value={String(c.zone)} onChange={e => setCountries(list => list.map((x, j) => (j === i ? { ...x, zone: Number(e.target.value) } : x)))} />
              <Button iconOnly variant="ghost" aria-label={t('Xóa nước {name}', { name: c.country || i + 1 })} onClick={() => setCountries(list => list.filter((_, j) => j !== i))}><Icon name="close" size={15} /></Button>
            </div>
          ))}
          <div><Button size="sm" onClick={() => setCountries(list => [...list, { country: '', zone: svc.dz }])}><Icon name="plus" size={15} /> {t('Thêm nước')}</Button></div>
        </div>

        <h3 className={styles.sectionTitle}>{t('3. Điền nhanh thang giá (tùy chọn)')}</h3>
        <Notice>{t('Nhập giá mốc 0.5kg và mức cộng thêm mỗi 0.5kg cho từng zone để tạo cả thang 140 mốc, sau đó chỉnh tay các ô lẻ.')}</Notice>
        <div className={`${styles.row} ${styles.spacedTop}`}>
          {zoneKeys.map((k, i) => (
            <div key={k} className={styles.row}>
              <TextField label={t('{zone} · giá 0.5kg', { zone: svc.zones[i] ?? k })} type="number" value={fill[k]?.base ?? ''} onChange={e => setFill(f => ({ ...f, [k]: { base: e.target.value, step: f[k]?.step ?? '' } }))} />
              <TextField label="+ mỗi 0.5kg" type="number" value={fill[k]?.step ?? ''} onChange={e => setFill(f => ({ ...f, [k]: { base: f[k]?.base ?? '', step: e.target.value } }))} />
              <Button onClick={() => applyFill(k)}>{t('Điền')}</Button>
            </div>
          ))}
        </div>

        <h3 className={styles.sectionTitle}>{t('4. Bảng giá theo mốc cân (VND)')}</h3>
      </div>
      <div className={styles.gridScroll}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th>{t('Cân (kg)')}</th>
              {svc.zones.map((z, i) => <th key={i}>{z}</th>)}
            </tr>
          </thead>
          <tbody>
            {WEIGHT_STEPS.map((w, idx) => (
              <tr key={w}>
                <td>{formatNumber(w)}</td>
                {zoneKeys.map(k => (
                  <td key={k}>
                    <input className={styles.gridInput} type="number" min={0} aria-label={`${svc.zones[Number(k) - 1]} ${w}kg`} value={svc.price[k]?.[idx] ?? 0} onChange={e => setPrice(k, idx, e.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td>{t('> 70 (đ/kg)')}</td>
              {zoneKeys.map(k => (
                <td key={k}>
                  <input className={styles.gridInput} type="number" min={0} aria-label={t('Giá mỗi kg trên 70kg {zone}', { zone: svc.zones[Number(k) - 1] ?? k })} value={svc.over70[k] ?? 0} onChange={e => patch({ over70: { ...svc.over70, [k]: toNum(e.target.value) } })} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.note}>
        <h3 className={styles.sectionTitle}>{t('5. Phụ thu quá khổ / quá tải')}</h3>
        <p className={styles.meta}>{t('Để trống ô "đến" = không giới hạn. Kiện thỏa cả 3 điều kiện sẽ bị tính phụ thu (lấy mức cao nhất).')}</p>
        <div className={styles.rowList}>
          {svc.sur.map((r, i) => (
            <div key={i} className={styles.row}>
              {SUR_FIELDS.map(f => (
                <TextField key={f.key} label={i === 0 ? f.label : ''} aria-label={t('{field} dòng {n}', { field: t(f.label), n: i + 1 })} type="number" min={0} value={r[f.key] ?? ''} onChange={e => setSur(i, { [f.key]: toRange(e.target.value) })} />
              ))}
              <TextField label={i === 0 ? 'Phụ thu (đ)' : ''} aria-label={t('Phụ thu dòng {n}', { n: i + 1 })} type="number" min={0} value={r.fee} onChange={e => setSur(i, { fee: toNum(e.target.value) })} />
              <Button iconOnly variant="ghost" aria-label={t('Xóa phụ thu dòng {n}', { n: i + 1 })} onClick={() => patch({ sur: svc.sur.filter((_, j) => j !== i) })}><Icon name="close" size={15} /></Button>
            </div>
          ))}
          <div>
            <Button size="sm" onClick={() => patch({ sur: [...svc.sur, { wFrom: '', wTo: '', dFrom: '', dTo: '', gFrom: '', gTo: '', fee: 0 }] })}>
              <Icon name="plus" size={15} /> {t('Thêm dòng phụ thu')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
