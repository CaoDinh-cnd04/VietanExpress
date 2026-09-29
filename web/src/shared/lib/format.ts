/** Định dạng số / tiền / ngày dùng chung — mọi nơi hiển thị số phải qua đây để đồng nhất. */

const numberFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const vndFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export const formatNumber = (n: number): string => numberFmt.format(n);

export const formatVnd = (n: number): string => `${vndFmt.format(Math.round(n))} đ`;

export const formatPercent = (ratio: number): string => `${numberFmt.format(ratio * 100)}%`;

/** 'yyyy-mm-dd' → 'dd/mm/yyyy'; chuỗi khác giữ nguyên. */
export function formatIsoDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

/** Ngày hôm nay dạng 'yyyy-mm-dd' (giá trị của input[type=date]). */
export function todayIso(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
