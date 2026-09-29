import type { PackageValues } from '../schema';
import { summarizePackages, toNumber } from './shipment';

export interface CarrierLimit {
  /** Cạnh dài tối đa trước khi bị phụ phí quá khổ (cm) */
  maxSide: number;
  /** Tổng 3 cạnh tối đa (cm) */
  maxSum: number;
  /** Cân tối đa mỗi kiện trước khi bị phụ phí hàng nặng (kg) */
  maxWeight: number;
  /** Vượt mức này hãng không nhận (cm / kg) */
  nonSide: number;
  nonWeight: number;
}

/**
 * Giới hạn kích thước / cân nặng theo hãng — lấy theo quy định của Việt An
 * (đề xuất endpoint GET /services/limits — docs/API_CONTRACT.md §3). Khi backend có API, thay bằng dữ liệu API.
 */
export const CARRIER_LIMITS: Record<string, CarrierLimit> = {
  _default: { maxSide: 120, maxSum: 300, maxWeight: 30, nonSide: 200, nonWeight: 100 },
  DHL: { maxSide: 120, maxSum: 300, maxWeight: 31.5, nonSide: 120, nonWeight: 70 },
  Fedex: { maxSide: 121, maxSum: 330, maxWeight: 31.5, nonSide: 121, nonWeight: 68 },
  UPS: { maxSide: 122, maxSum: 330, maxWeight: 31.5, nonSide: 122, nonWeight: 70 },
  Aramex: { maxSide: 120, maxSum: 300, maxWeight: 30, nonSide: 150, nonWeight: 70 },
  'Chuyên tuyến': { maxSide: 150, maxSum: 330, maxWeight: 45, nonSide: 220, nonWeight: 120 },
  Ecommerce: { maxSide: 100, maxSum: 250, maxWeight: 20, nonSide: 150, nonWeight: 50 },
  SEA: { maxSide: 300, maxSum: 600, maxWeight: 1000, nonSide: 600, nonWeight: 2000 }
};

export type WarningLevel = 'critical' | 'warning' | 'info';

export interface PackageWarning {
  level: WarningLevel;
  title: string;
  detail: string;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/** Cảnh báo quá khổ / quá tải cho từng dòng kiện + gợi ý khi cước tính theo quy đổi. */
export function evaluatePackages(carrier: string, packages: ReadonlyArray<PackageValues>): PackageWarning[] {
  const limit = CARRIER_LIMITS[carrier] ?? CARRIER_LIMITS._default!;
  const name = carrier || 'dịch vụ';
  const out: PackageWarning[] = [];

  packages.forEach((p, i) => {
    const [d, w, h, g] = [toNumber(p.length), toNumber(p.width), toNumber(p.height), toNumber(p.weight)];
    if (!d && !w && !h && !g) return;
    const longest = Math.max(d, w, h);
    const sum = d + w + h;
    const label = `Kiện ${i + 1}`;

    if (longest > limit.nonSide || g > limit.nonWeight) {
      out.push({
        level: 'critical',
        title: `${label}: vượt giới hạn nhận của ${name}`,
        detail: `Cạnh dài ${fmt(longest)}cm / cân ${fmt(g)}kg vượt mức tối đa. Cần chia nhỏ kiện hoặc chuyển sang Chuyên tuyến / SEA.`
      });
      return;
    }
    if (longest > limit.maxSide) out.push({ level: 'warning', title: `${label}: hàng quá khổ`, detail: `Cạnh dài ${fmt(longest)}cm > ${limit.maxSide}cm — có thể bị phụ phí hàng cồng kềnh.` });
    if (sum > limit.maxSum) out.push({ level: 'warning', title: `${label}: tổng kích thước lớn`, detail: `D+R+C = ${fmt(sum)}cm > ${limit.maxSum}cm — có thể bị phụ phí quá khổ.` });
    if (g > limit.maxWeight) out.push({ level: 'warning', title: `${label}: quá nặng`, detail: `Cân ${fmt(g)}kg > ${limit.maxWeight}kg/kiện — phụ phí xử lý hàng nặng.` });
  });

  const s = summarizePackages(packages);
  if (s.grossWeight > 0 && s.volumetricWeight > s.grossWeight + 0.01) {
    out.push({
      level: 'info',
      title: 'Cước tính theo trọng lượng quy đổi',
      detail: `Quy đổi ${fmt(s.volumetricWeight)}kg > cân thực ${fmt(s.grossWeight)}kg. Đóng gói gọn hơn để giảm cước.`
    });
  }
  return out;
}

export const hasCritical = (warnings: ReadonlyArray<PackageWarning>) => warnings.some(w => w.level === 'critical');
