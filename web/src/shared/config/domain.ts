/** Hằng số nghiệp vụ dùng chung giữa nhiều feature. */

export const BRANCHES = ['TP.HCM', 'Hà Nội', 'Huế', 'Bảo Lộc', 'Cần Thơ'] as const;
export type Branch = (typeof BRANCHES)[number];

export type CargoType = 'DOC' | 'PACK';

export const TRACKING_URL = 'https://vietanexpress.com.vn/track';
export const trackingLink = (bill: string, agentBrand = false) =>
  `${TRACKING_URL}?id=${encodeURIComponent(bill)}${agentBrand ? '&brand=1' : ''}`;

/** Danh sách nước đến gợi ý (datalist). Backend sẽ trả danh mục đầy đủ qua GET /addresses/countries. */
export const COUNTRIES = [
  'Singapore', 'Malaysia', 'Thailand', 'Taiwan', 'China', 'Hong Kong', 'Japan', 'South Korea', 'Australia', 'New Zealand',
  'United States', 'Canada', 'Mexico', 'United Kingdom', 'Germany', 'France', 'Belgium', 'Netherlands', 'Italy', 'Spain',
  'United Arab Emirates', 'Saudi Arabia', 'India', 'Philippines', 'Indonesia', 'Cambodia', 'Laos', 'Bolivia'
] as const;

/** Hãng / dịch vụ → danh sách hub. Backend sẽ trả qua GET /services/hubs; tạm khai ở đây. */
export const CARRIER_HUBS: Record<string, readonly string[]> = {
  Aramex: ['Aramex - Dubai', 'Aramex - GCC'],
  DHL: ['DHL - Singapore', 'DHL - Hong Kong', 'DHL - VN'],
  Fedex: ['Fedex - US', 'Fedex - EU'],
  UPS: ['UPS - US', 'UPS - EU'],
  'Chuyên tuyến': ['Chuyên tuyến - Singapore', 'Chuyên tuyến - EU', 'Chuyên tuyến - AU_Toll Vip', 'Chuyên tuyến - China'],
  'Ủy quyền Việt An': ['UQ - Standard'],
  Ecommerce: ['Ecom - Asia'],
  SEA: ['SEA - Full']
};
export const CARRIERS = Object.keys(CARRIER_HUBS);
