/** Bảng giá & báo giá — hợp đồng API: docs/API_CONTRACT.md §4. */

/** Khoảng để trống ('') = không giới hạn. */
export interface SurchargeRule {
  /** Cân nặng (kg) */
  wFrom?: number | '';
  wTo?: number | '';
  /** Cạnh dài nhất (cm) */
  dFrom?: number | '';
  dTo?: number | '';
  /** Chu vi = cạnh dài + 2×(2 cạnh còn lại) (cm) */
  gFrom?: number | '';
  gTo?: number | '';
  /** Phụ thu (VND) */
  fee: number;
}

export interface ShippingService {
  id: string;
  name: string;
  account: string;
  /** Phụ phí xăng dầu, VD 0.28 = 28% */
  fsc: number;
  /** VAT, VD 0.08 = 8% */
  vat: number;
  /** Thời gian dự kiến, VD '2–4 ngày' */
  eta: string;
  effFrom: string;
  effTo: string;
  zones: string[];
  /** Tên nước → số zone (bắt đầu từ 1) */
  zmap: Record<string, number>;
  /** Zone mặc định cho nước chưa khai */
  dz: number;
  /** Số zone → 140 mốc giá (0.5kg → 70kg), VND */
  price: Record<string, number[]>;
  /** Số zone → giá mỗi kg khi trên 70kg */
  over70: Record<string, number>;
  sur: SurchargeRule[];
}

export interface QuoteRequest {
  country: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  type: 'DOC' | 'PACK';
}

export interface ServiceQuote {
  name: string;
  zone: number;
  chargeableWeight: number;
  volumetricWeight: number;
  baseFare: number;
  fscFee: number;
  surcharges: number;
  hasSurcharge: boolean;
  vatFee: number;
  totalFare: number;
  eta: string;
  isCheapest?: boolean;
}
