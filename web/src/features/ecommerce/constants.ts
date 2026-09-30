import type { Tone } from '@/shared/ui';
import type { EcomSettings, EcomSource, EcomStatus } from './types';

export const ECOM_SOURCES: Record<EcomSource, { label: string }> = {
  tiktok: { label: 'TikTok Shop' },
  shopify: { label: 'Shopify' },
  shopee: { label: 'Shopee' },
  lazada: { label: 'Lazada' },
  api: { label: 'API' },
  excel: { label: 'Excel' },
  manual: { label: 'Nhập tay' }
};

export const ECOM_STATUS: Record<EcomStatus, { label: string; tone: Tone }> = {
  created: { label: 'Đã tạo', tone: 'success' },
  picked_up: { label: 'Đã lấy', tone: 'info' },
  departed: { label: 'Đã đi', tone: 'success' },
  delivered: { label: 'Đã phát', tone: 'brand' },
  exception: { label: 'Lỗi', tone: 'danger' },
  weighing: { label: 'Chờ cân đo', tone: 'warning' }
};

/** Sàn có thể gắn nguồn ở tab Kết nối. */
export const MARKETPLACES: ReadonlyArray<{ source: EcomSource; description: string }> = [
  { source: 'tiktok', description: 'Gắn nhãn nguồn cho đơn từ TikTok Shop' },
  { source: 'shopify', description: 'Gắn nhãn nguồn cho đơn từ Shopify' },
  { source: 'shopee', description: 'Gắn nhãn nguồn cho đơn từ Shopee' },
  { source: 'lazada', description: 'Gắn nhãn nguồn cho đơn từ Lazada' }
];

export const WEBHOOK_EVENTS: ReadonlyArray<EcomSettings['webhookEvents'][number]> = ['created', 'picked_up', 'departed', 'delivered', 'exception'];

export const LABEL_FORMATS = ['A6', 'A4', 'ZPL'] as const;
export const GOODS_TYPES = ['general', 'battery (pin)', 'liquid (lỏng)', 'sensitive'] as const;
export const MAX_PRODUCTS = 5;

/** Tên file mẫu import — cấu trúc 70 cột của Yun/EPK/Việt An. */
export const IMPORT_TEMPLATE_NAME = 'VietAn_Ecom_Import_Template.csv';
export const IMPORT_TEMPLATE_URL = '/templates/VietAn_Ecom_Import_Template.csv';

/** Ví dụ body tạo đơn — giá trị gửi API giữ nguyên tiếng Việt (tên dịch vụ, hub). */
const API_EXAMPLE_BODY = {
  shopOrderRef: 'TT-88213',
  source: 'tiktok',
  service: 'Chuyên tuyến',
  hub: 'Chuyên tuyến - Singapore',
  branch: 'TP.HCM',
  receiver: { name: 'Emma W.', country: 'Singapore', city: 'Singapore', postal: '238859', phone: '+65 8123 4567', address1: '1 Raffles Place' },
  parcel: { weightKg: 1.2, lengthCm: 25, widthCm: 18, heightCm: 10 },
  items: [{ sku: 'DR-001', nameEn: 'Dress', nameVi: 'Váy', hs: '6204.43', origin: 'VN', qty: 2, unitPrice: 8, currency: 'USD' }]
};

export const API_EXAMPLE = [
  'curl -X POST https://api.vietanexpress.com.vn/v1/orders \\',
  '  -H "Authorization: Bearer <API_KEY>" \\',
  '  -H "Content-Type: application/json" \\',
  `  -d '${JSON.stringify(API_EXAMPLE_BODY, null, 2)}'`
].join('\n');
