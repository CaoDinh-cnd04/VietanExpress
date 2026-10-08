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

/**
 * Khách đổi nước đến → có xoá mã bưu chính / thành phố / tỉnh bang không.
 * Chỉ khi đã nhận ra 1 nước trước đó VÀ nước mới khác nước đó; đang gõ dở (chưa ra nước nào) thì chưa xoá.
 */
export function shouldResetAddress(previousCode: string | undefined, nextCode: string | undefined): boolean {
  return !!previousCode && !!nextCode && previousCode !== nextCode;
}

/** 1 dòng gợi ý của GET /geo/addresses. `address1` rỗng khi gợi ý chỉ tới cấp thành phố / mã bưu chính. */
export interface AddressSuggestion {
  label: string;
  address1: string;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  postalCode?: string | null;
  countryCode: string;
}

/** Chữ khách gõ ở ô Địa chỉ 1 đủ để gợi ý: gộp khoảng trắng, 3–120 ký tự (khớp kiểm tra của backend). */
export function addressQuery(input: string | undefined): string | null {
  const text = (input ?? '').trim().replace(/\s+/g, ' ');
  return text.length >= 3 && text.length <= 120 ? text : null;
}

/** Ô cần điền khi khách chọn 1 gợi ý — bỏ phần gợi ý không có (không xoá chữ khách đã nhập ở ô đó). */
export function suggestionFields(s: AddressSuggestion): Array<['addr1' | 'city' | 'state' | 'postal', string]> {
  const entries: Array<['addr1' | 'city' | 'state' | 'postal', string | null | undefined]> = [
    ['addr1', s.address1],
    ['city', s.city],
    ['state', s.state],
    ['postal', s.postalCode]
  ];
  return entries.filter((e): e is ['addr1' | 'city' | 'state' | 'postal', string] => !!e[1]?.trim());
}
