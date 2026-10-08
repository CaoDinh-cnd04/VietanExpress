/** Người nhận đã gửi trước đây — GET /orders/receivers (lấy từ đơn cũ của khách trong dbo.MaVanDon). */
export interface RecentReceiver {
  company: string;
  contact?: string | null;
  phone?: string | null;
  phoneCode?: string | null;
  email?: string | null;
  taxId?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  address1?: string | null;
  address2?: string | null;
  address3?: string | null;
  iossNo?: string | null;
  eoriNo?: string | null;
  /** yyyy-mm-dd — ngày gửi gần nhất. */
  lastUsed?: string | null;
}

type ReceiverField =
  | 'company' | 'contact' | 'tel' | 'email' | 'taxId' | 'country' | 'city' | 'state' | 'postal'
  | 'addr1' | 'addr2' | 'addr3' | 'iossNo' | 'eoriNo';

/** Chữ khách gõ ở ô tên công ty đủ để tìm: bỏ khoảng trắng 2 đầu, 1–100 ký tự (gõ 1 chữ như hệ thống cũ). */
export function recentReceiverQuery(input: string | undefined): string | null {
  const text = (input ?? '').trim();
  return text.length >= 1 && text.length <= 100 ? text : null;
}

/** Dòng phụ trong danh sách: "Nước · điện thoại (dd-mm-yyyy)" như hệ thống cũ. */
export function recentReceiverSubtitle(r: RecentReceiver): string {
  const date = /^(\d{4})-(\d{2})-(\d{2})/.exec(r.lastUsed ?? '');
  const phone = [r.phone, date ? `(${date[3]}-${date[2]}-${date[1]})` : ''].filter(Boolean).join(' ');
  return [r.country, phone].filter(Boolean).join(' · ');
}

/**
 * Giá trị điền vào form khi chọn 1 người nhận cũ — điền ĐỦ mọi ô (ô đơn cũ để trống thì xoá),
 * để không lẫn dữ liệu của người nhận đang nhập dở.
 */
export function receiverFields(r: RecentReceiver): Array<[ReceiverField, string]> {
  const v = (value: string | null | undefined) => value?.trim() ?? '';
  return [
    ['company', v(r.company)],
    ['contact', v(r.contact)],
    ['tel', v(r.phone)],
    ['email', v(r.email)],
    ['taxId', v(r.taxId)],
    ['country', v(r.country)],
    ['city', v(r.city)],
    ['state', v(r.state)],
    ['postal', v(r.postalCode)],
    ['addr1', v(r.address1)],
    ['addr2', v(r.address2)],
    ['addr3', v(r.address3)],
    ['iossNo', v(r.iossNo)],
    ['eoriNo', v(r.eoriNo)]
  ];
}
