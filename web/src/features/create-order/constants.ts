/** Hằng số nghiệp vụ tạo đơn. Thêm hãng / hub / đơn vị mới: sửa ở đây, UI tự cập nhật. */

export { CARRIER_HUBS, CARRIERS } from '@/shared/config/domain';

export { COUNTRIES } from '@/shared/config/domain';

/** Giá trị "nhóm hàng" đặc biệt: kiện gồm nhiều nhóm → khai bảng phân loại. */
export const MULTI_CATEGORY = 'Nhiều loại hàng';

export const PACKAGING_TYPES = ['Thùng carton', 'Bao / túi', 'Pallet', 'Kiện gỗ'] as const;
export const UNITS = ['PCS', 'BOX', 'SET', 'PR', 'KG'] as const;
export const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'VND', label: 'VND (₫)' }
] as const;
export const EXPORT_TYPES = ['Kinh doanh', 'Phi mậu dịch (biếu tặng)', 'Hàng mẫu'] as const;

export const ADDONS = [
  { name: 'Phát có chữ ký người nhận', description: 'Người nhận ký xác nhận khi giao (Signature Required)' },
  { name: 'Đóng gói hộ', description: 'Việt An đóng gói / gia cố kiện hàng' },
  { name: 'Gửi email thông báo', description: 'Tự động email trạng thái cho người nhận' },
  { name: 'Đóng thuế hộ (DDP)', description: 'Việt An ứng & đóng thuế nhập khẩu đầu nhận' },
  { name: 'Khai giá / Bảo hiểm hàng', description: 'Khai giá trị để bảo hiểm rủi ro' },
  { name: 'Dán nhãn Fragile (dễ vỡ)', description: 'Xử lý nhẹ tay, dán cảnh báo dễ vỡ' }
] as const;

/** Quy tắc nghiệp vụ (xem CLAUDE.md §4). */
export const RULES = {
  /** Chứng từ nặng hơn mức này tự chuyển sang hàng hóa (DocToPackRule). */
  docMaxWeightKg: 2,
  /** Hệ số quy đổi thể tích: D×R×C / divisor. */
  volumetricDivisor: 5000,
  shipperAddressMax: 60,
  receiverAddressMax: 30
} as const;

export const WIZARD_STEPS = [
  { title: 'Thông tin bill', description: 'Người gửi, người nhận, dịch vụ' },
  { title: 'Kiện & nội dung hàng', description: 'Kích thước, nhóm hàng, dịch vụ thêm' },
  { title: 'Invoice & phí', description: 'Khai hàng, shipping fee' }
] as const;

/** Chứng từ (DOC): không khai kiện / Invoice → chỉ 2 bước. */
export const WIZARD_STEPS_DOC = [
  WIZARD_STEPS[0],
  { title: 'Nội dung chứng từ', description: 'Nội dung, dịch vụ thêm' }
] as const;

export type WizardStep = { readonly title: string; readonly description: string };

/** Liên kết tra cứu (khung "Hỗ trợ" của Bill Online cũ). `url` để trống = chưa có trang. */
export const HELP_LINKS: ReadonlyArray<{ group: string; links: ReadonlyArray<{ label: string; url?: string }> }> = [
  { group: 'Hướng dẫn', links: [{ label: 'Video hướng dẫn tạo bill' }, { label: 'Tra cứu mã HS' }] },
  { group: 'Phụ phí xăng dầu', links: [{ label: 'DHL' }, { label: 'Fedex' }, { label: 'UPS' }] },
  { group: 'Phụ phí cộng thêm của hãng bay', links: [{ label: 'UPS' }, { label: 'DHL' }, { label: 'Fedex' }, { label: 'Điều kiện vận chuyển Fedex' }] },
  { group: 'Kiểm tra vùng sâu vùng xa (VSVX)', links: [{ label: 'DHL' }, { label: 'Fedex' }, { label: 'UPS' }] }
];
