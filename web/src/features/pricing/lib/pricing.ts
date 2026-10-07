import type { ShippingService } from '../types';

/** 140 mốc cân chuẩn: 0.5kg, 1kg … 70kg. */
export const WEIGHT_STEPS: readonly number[] = Array.from({ length: 140 }, (_, i) => (i + 1) * 0.5);

/** Giá tại mốc cân tính cước (làm tròn lên 0.5kg); trên 70kg tính theo đơn giá/kg. */
export function priceAt(svc: ShippingService, zone: number, chargeable: number): number {
  const key = String(zone);
  if (chargeable > 70) return Math.round((svc.over70[key] ?? 0) * chargeable);
  const idx = Math.max(0, Math.ceil(chargeable / 0.5) - 1);
  return svc.price[key]?.[idx] ?? 0;
}
