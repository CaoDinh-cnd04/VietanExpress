import type { ShippingService } from '../types';

/** 140 mốc cân chuẩn: 0.5kg, 1kg … 70kg. */
export const WEIGHT_STEPS: readonly number[] = Array.from({ length: 140 }, (_, i) => (i + 1) * 0.5);

export const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const zoneKeys = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1));

/** Dịch vụ trống để khai bảng giá mới. */
export function emptyService(): ShippingService {
  return {
    id: '',
    name: '',
    account: '',
    fsc: 0,
    vat: 0.08,
    eta: '',
    effFrom: '',
    effTo: '',
    zones: ['Zone 1'],
    zmap: {},
    dz: 1,
    price: { '1': WEIGHT_STEPS.map(() => 0) },
    over70: { '1': 0 },
    sur: []
  };
}

/** Đổi số zone, giữ dữ liệu các zone cũ; zone mới khởi tạo giá 0. */
export function resizeZones(svc: ShippingService, count: number): ShippingService {
  const n = Math.max(1, Math.min(12, Math.trunc(count) || 1));
  const keys = zoneKeys(n);
  return {
    ...svc,
    zones: keys.map((k, i) => svc.zones[i] ?? `Zone ${k}`),
    price: Object.fromEntries(keys.map(k => [k, svc.price[k] ?? WEIGHT_STEPS.map(() => 0)])),
    over70: Object.fromEntries(keys.map(k => [k, svc.over70[k] ?? 0])),
    dz: Math.min(svc.dz, n),
    zmap: Object.fromEntries(Object.entries(svc.zmap).map(([c, z]) => [c, Math.min(z, n)]))
  };
}

/** Điền nhanh cả thang giá của một zone: giá mốc 0.5kg + mức cộng mỗi 0.5kg. */
export const quickFillZone = (base: number, step: number): number[] => WEIGHT_STEPS.map((_, i) => Math.round(base + step * i));

/** Giá tại mốc cân tính cước (làm tròn lên 0.5kg); trên 70kg tính theo đơn giá/kg. */
export function priceAt(svc: ShippingService, zone: number, chargeable: number): number {
  const key = String(zone);
  if (chargeable > 70) return Math.round((svc.over70[key] ?? 0) * chargeable);
  const idx = Math.max(0, Math.ceil(chargeable / 0.5) - 1);
  return svc.price[key]?.[idx] ?? 0;
}
