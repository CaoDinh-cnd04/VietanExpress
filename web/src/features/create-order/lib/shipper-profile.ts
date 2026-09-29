import { RULES } from '../constants';
import type { CreateOrderValues } from '../schema';

type Shipper = CreateOrderValues['shipper'];

/** Hồ sơ khách đang đăng nhập (GET /me — lấy từ dbo.TCustomer). */
export interface CustomerProfile {
  companyName: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxCode?: string | null;
}

/**
 * Giá trị người gửi điền sẵn từ hồ sơ khách: chỉ các ô đang trống (đơn nhân bản / mở lại nháp giữ nguyên dữ liệu đã có).
 * Địa chỉ cắt theo độ dài tối đa của ô.
 */
export function shipperFromProfile(current: Shipper, profile: CustomerProfile): Partial<Shipper> {
  const source: Partial<Shipper> = {
    company: profile.companyName,
    contact: profile.contactName ?? '',
    tel: profile.phone ?? '',
    email: profile.email ?? '',
    address: (profile.address ?? '').slice(0, RULES.shipperAddressMax),
    taxId: profile.taxCode ?? ''
  };
  const fill: Partial<Shipper> = {};
  for (const [key, value] of Object.entries(source) as Array<[keyof Shipper, string]>) {
    const v = value.trim();
    if (v && !(current[key] ?? '').trim()) fill[key] = v;
  }
  return fill;
}
