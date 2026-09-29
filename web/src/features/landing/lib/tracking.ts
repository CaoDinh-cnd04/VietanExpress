/** Số vận đơn tối đa mỗi lần tra cứu trên trang ngoài. */
export const MAX_TRACK_BILLS = 10;

/** Mã vận đơn: chữ và số, 6–30 ký tự (VA Bill hoặc mã hãng). */
const BILL_PATTERN = /^[A-Z0-9]{6,30}$/;

export interface ParsedBills {
  /** Mã hợp lệ, đã bỏ trùng, giữ thứ tự nhập, tối đa MAX_TRACK_BILLS. */
  bills: string[];
  /** Mã sai định dạng. */
  invalid: string[];
  /** Số mã hợp lệ bị bỏ vì vượt giới hạn. */
  dropped: number;
}

/** Tách mã vận đơn từ ô nhập: mỗi dòng / dấu phẩy / chấm phẩy / khoảng trắng là 1 mã. */
export function parseBills(text: string): ParsedBills {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const bill = raw.replace(/[-.]/g, '').toUpperCase();
    if (!bill || seen.has(bill)) continue;
    seen.add(bill);
    if (BILL_PATTERN.test(bill)) valid.push(bill);
    else invalid.push(raw);
  }
  return { bills: valid.slice(0, MAX_TRACK_BILLS), invalid, dropped: Math.max(0, valid.length - MAX_TRACK_BILLS) };
}

/** Đọc `?track=` (ngăn bằng dấu phẩy) để mở sẵn kết quả khi chia sẻ link. */
export function billsFromQuery(value: string | null): string[] {
  return value ? parseBills(value).bills : [];
}

/** Giá trị `?track=` cho danh sách mã. */
export function billsToQuery(bills: readonly string[]): string {
  return bills.join(',');
}
