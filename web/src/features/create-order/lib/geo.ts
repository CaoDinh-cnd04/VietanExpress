/** Quốc gia từ GET /geo/countries. `name` là tên tiếng Anh — lưu vào đơn như hệ thống cũ. */
export interface Country {
  code: string;
  name: string;
  dialCode?: string | null;
}

/** Kết quả GET /geo/postal/{country}/{postal}. */
export interface PostalInfo {
  countryCode: string;
  postalCode: string;
  city: string;
  state?: string | null;
  stateCode?: string | null;
}

/** Tìm nước theo chữ khách gõ: khớp tên (không phân biệt hoa thường, bỏ khoảng trắng thừa) hoặc mã ISO 2 ký tự. */
export function findCountry(countries: readonly Country[], input: string | undefined): Country | undefined {
  const text = (input ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return undefined;
  return countries.find(c => c.name.toLowerCase() === text) ?? (text.length === 2 ? countries.find(c => c.code.toLowerCase() === text) : undefined);
}

/** Mã bưu chính đủ điều kiện để tra: 3–12 ký tự chữ / số / khoảng trắng / gạch. Trả dạng chuẩn hoá (viết hoa). */
export function normalizePostal(input: string | undefined): string | null {
  const value = (input ?? '').trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9 -]{2,11}$/.test(value) ? value : null;
}

/**
 * Có được ghi kết quả tra mã bưu chính vào ô không: chỉ khi ô đang trống,
 * hoặc giá trị hiện tại chính là giá trị hệ thống đã tự điền trước đó (khách chưa tự sửa).
 */
export function canAutofill(current: string | undefined, lastAutofilled: string | undefined): boolean {
  const value = (current ?? '').trim();
  return value === '' || (lastAutofilled !== undefined && value === lastAutofilled);
}
