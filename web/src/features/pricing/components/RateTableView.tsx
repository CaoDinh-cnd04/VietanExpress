import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatIsoDate, formatNumber, formatPercent } from '@/shared/lib/format';
import { Card, EmptyState } from '@/shared/ui';
import { useServices } from '../api';
import { WEIGHT_STEPS } from '../lib/pricing';
import type { ShippingService, SurchargeRule } from '../types';
import styles from './pricing.module.css';

const range = (from?: number | '', to?: number | '', unit = '') =>
  from === '' && to === '' ? '—' : `${from === '' || from === undefined ? '0' : from} – ${to === '' || to === undefined ? '∞' : to}${unit}`;

/** Tab "Bảng giá dịch vụ": xem bảng giá theo zone × mốc cân, danh sách nước theo zone, phụ thu. */
export function RateTableView() {
  const { t } = useI18n();
  const { data: services = [], isLoading } = useServices();
  const [selectedId, setSelectedId] = useState<string>('');
  const svc = services.find(s => s.id === selectedId) ?? services[0];

  if (!isLoading && !services.length) return <Card><EmptyState title="Chưa có bảng giá" description="Khai bảng giá ở tab Quản lý & nhập giá." /></Card>;

  return (
    <div className={styles.stack}>
      <div className={styles.chips} role="tablist" aria-label={t('Chọn dịch vụ')}>
        {services.map(s => (
          <button key={s.id} type="button" role="tab" aria-selected={s.id === svc?.id} className={cx(styles.chip, s.id === svc?.id && styles.chipOn)} onClick={() => setSelectedId(s.id)}>
            {s.name}
          </button>
        ))}
      </div>
      {svc && <ServiceRates svc={svc} />}
    </div>
  );
}

function ServiceRates({ svc }: { svc: ShippingService }) {
  const { t } = useI18n();
  const zoneKeys = svc.zones.map((_, i) => String(i + 1));
  const countriesByZone = zoneKeys.map(k => Object.entries(svc.zmap).filter(([, z]) => String(z) === k).map(([c]) => c));

  return (
    <>
      <Card title={svc.name} subtitle={svc.account ? `· ${svc.account}` : undefined}>
        <div className={styles.meta}>
          <span>FSC <strong>{formatPercent(svc.fsc)}</strong></span>
          <span>VAT <strong>{formatPercent(svc.vat)}</strong></span>
          <span>{t('Dự kiến')} <strong>{svc.eta || '—'}</strong></span>
          <span>{t('Hiệu lực')} <strong>{svc.effFrom ? formatIsoDate(svc.effFrom) : '—'} → {svc.effTo ? formatIsoDate(svc.effTo) : '—'}</strong></span>
          <span>{t('Zone mặc định')} <strong>{svc.dz}</strong></span>
        </div>
      </Card>

      <Card flush title="Bảng giá (VND, chưa gồm FSC & VAT)">
        <div className={styles.gridScroll}>
          <table className={styles.grid}>
            <thead>
              <tr>
                <th>{t('Cân (kg)')}</th>
                {svc.zones.map((z, i) => <th key={z} title={countriesByZone[i]?.join(', ')}>{z}</th>)}
              </tr>
            </thead>
            <tbody>
              {WEIGHT_STEPS.map((w, i) => (
                <tr key={w}>
                  <td>{formatNumber(w)}</td>
                  {zoneKeys.map(k => <td key={k}>{formatNumber(svc.price[k]?.[i] ?? 0)}</td>)}
                </tr>
              ))}
              <tr>
                <td>{t('> 70 (đ/kg)')}</td>
                {zoneKeys.map(k => <td key={k}>{formatNumber(svc.over70[k] ?? 0)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className={styles.cardGrid}>
        <Card title="Nước theo zone">
          <div className={styles.zoneList}>
            {svc.zones.map((z, i) => (
              <div key={z}><strong>{z}:</strong> {countriesByZone[i]?.join(', ') || '—'}</div>
            ))}
          </div>
        </Card>
        <Card title="Phụ thu quá khổ / quá tải">
          {svc.sur.length ? <SurchargeTable rules={svc.sur} /> : <p className={styles.meta}>{t('Không có phụ thu.')}</p>}
        </Card>
      </div>
    </>
  );
}

function SurchargeTable({ rules }: { rules: SurchargeRule[] }) {
  const { t } = useI18n();
  return (
    <table className={styles.grid}>
      <thead>
        <tr><th>{t('Cân (kg)')}</th><th>{t('Cạnh dài (cm)')}</th><th>{t('Chu vi (cm)')}</th><th>{t('Phụ thu (đ)')}</th></tr>
      </thead>
      <tbody>
        {rules.map((r, i) => (
          <tr key={i}>
            <td>{range(r.wFrom ?? '', r.wTo ?? '')}</td>
            <td>{range(r.dFrom ?? '', r.dTo ?? '')}</td>
            <td>{range(r.gFrom ?? '', r.gTo ?? '')}</td>
            <td>{formatNumber(r.fee)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
