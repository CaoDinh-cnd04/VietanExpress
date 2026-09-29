import type { CreateOrderValues } from '../schema';

type Shipper = CreateOrderValues['shipper'];

/** Hồ sơ khách đang đăng nhập (GET /me — lấy từ dbo.TCustomer). */
export interface CustomerProfile {
  companyName: string;
  contactName?: string | null;
}

/**
 * Người gửi điền sẵn từ hồ sơ khách: chỉ tên công ty và người liên hệ — các ô khác khách tự nhập.
 * Chỉ điền ô đang trống (đơn nhân bản / mở lại nháp giữ nguyên dữ liệu đã có).
 */
export function shipperFromProfile(current: Shipper, profile: CustomerProfile): Partial<Shipper> {
  const source: Partial<Shipper> = { company: profile.companyName, contact: profile.contactName ?? '' };
  const fill: Partial<Shipper> = {};
  for (const [key, value] of Object.entries(source) as Array<[keyof Shipper, string]>) {
    const v = value.trim();
    if (v && !(current[key] ?? '').trim()) fill[key] = v;
  }
  return fill;
}
