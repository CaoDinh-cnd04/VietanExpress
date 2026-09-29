/** Dữ liệu e-commerce — hợp đồng API: docs/API_CONTRACT.md §5. */
export type EcomSource = 'tiktok' | 'shopify' | 'shopee' | 'lazada' | 'api' | 'excel' | 'manual';
export type EcomStatus = 'created' | 'picked_up' | 'departed' | 'delivered' | 'exception' | 'weighing';

export interface EcomProduct {
  name: string;
  sku: string;
  qty: number;
  fobPrice: number;
  sellingPrice: number;
  weightKg?: number;
  hsCode?: string;
  origin?: string;
}

export interface EcomOrder {
  id: string;
  src: EcomSource;
  /** Mã đơn của shop / sàn */
  ref: string;
  /** Mã bill Việt An — rỗng khi lỗi / chờ xử lý */
  bill: string;
  cnee: string;
  ct: string;
  items: number;
  kg: number;
  st: EcomStatus;
  note?: string;
  products?: EcomProduct[];
  createdAt: string;
}

/** Khai báo hải quan nâng cao (US/EU) cho đơn nhập tay. */
export interface EcomCustoms {
  declaredValue?: string;
  goodsType?: string;
  receiverId?: string;
  ioss?: string;
  eori?: string;
  vat?: string;
  salesLink?: string;
  paymentRef?: string;
  manufacturer?: string;
}

export interface NewManualEcomOrder {
  ref: string;
  source: EcomSource;
  branch: string;
  cnee: string;
  ct: string;
  address: string;
  service: string;
  hub: string;
  kg: number;
  products: EcomProduct[];
  customs?: EcomCustoms;
}

export interface CsvImportResult {
  message: string;
  importedCount: number;
  errors: Array<{ row: number; message: string } | string>;
}

/** Cấu hình kết nối — endpoint mới, backend SQL Server cần làm (xem API_CONTRACT.md). */
export interface EcomSettings {
  apiKeys: Array<{ env: 'production' | 'sandbox'; key: string }>;
  webhookUrl: string;
  webhookEvents: Array<'created' | 'picked_up' | 'departed' | 'delivered' | 'exception'>;
  connectedSources: EcomSource[];
}
