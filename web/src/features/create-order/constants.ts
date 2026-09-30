/** Hằng số nghiệp vụ tạo đơn. Thêm hãng / hub / đơn vị mới: sửa ở đây, UI tự cập nhật. */

export { CARRIER_HUBS, CARRIERS, DEFAULT_SERVICE, defaultHub, hubOptions } from '@/shared/config/domain';

export { COUNTRIES } from '@/shared/config/domain';

/** Giá trị "nhóm hàng" đặc biệt: kiện gồm nhiều nhóm → khai bảng phân loại. */
export const MULTI_CATEGORY = 'Nhiều loại hàng';

export const PACKAGING_TYPES = ['Thùng carton', 'Bao / túi', 'Pallet', 'Kiện gỗ'] as const;
/** Quy cách (đơn vị) mặt hàng — theo hệ thống cũ. */
export const UNITS = ['Bag', 'PCS', 'SET', 'BOX', 'Khác'] as const;
/** Đơn vị tiền tệ của invoice — lưu mã vào MaVanDon.Loai_Tien. */
export const CURRENCIES = ['USD', 'SGD', 'EUR', 'GBP', 'AUD'] as const;
/** Hình thức xuất khẩu — lưu mã vào MaVanDon.Ly_Do_Xuat_Hang (dữ liệu cũ: GIFT, SAMPLE). */
export const EXPORT_TYPES = [
  { value: 'GIFT', label: 'gift (no commercial value)' },
  { value: 'SAMPLE', label: 'sample' },
  { value: 'OTHER', label: 'khác' }
] as const;

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
  { group: 'Hướng dẫn', links: [{ label: 'Video hướng dẫn tạo bill' }, { label: 'Tra cứu mã HS', url: 'https://caselaw.vn/trang/tra-cuu-ma-hs' }] },
  // Trang chính thức của hãng tại Việt Nam (kiểm tra 30/09/2026).
  {
    group: 'Phụ phí xăng dầu',
    links: [
      { label: 'DHL', url: 'https://mydhl.express.dhl/vn/vi/important-information/weekly-fuel-surcharge.html' },
      { label: 'Fedex', url: 'https://www.fedex.com/vi-vn/shipping/surcharges.html' },
      { label: 'UPS', url: 'https://www.ups.com/vn/vi/support/shipping-support/shipping-costs-rates/fuel-surcharges' }
    ]
  },
  {
    group: 'Phụ phí cộng thêm của hãng bay',
    links: [
      { label: 'UPS', url: 'https://www.ups.com/vn/vi/support/shipping-support/shipping-costs-rates' },
      { label: 'DHL', url: 'https://mydhl.express.dhl/vn/vi/ship/surcharges.html' },
      { label: 'Fedex', url: 'https://www.fedex.com/vi-vn/shipping/surcharges/other-surcharges.html' },
      { label: 'Điều kiện vận chuyển Fedex', url: 'https://www.fedex.com/vi-vn/conditions-of-carriage.html' }
    ]
  },
  {
    group: 'Kiểm tra vùng sâu vùng xa (VSVX)',
    links: [
      // DHL, UPS: file Excel danh sách vùng sâu vùng xa do hãng công bố.
      { label: 'DHL', url: 'https://mydhl.express.dhl/content/dam/downloads/global/en/remote-areas/dhl_express_remote_areas_en.xlsx.coredownload.xlsx' },
      { label: 'Fedex', url: 'https://www.fedex.com/vi-vn/customer-support/faq/invoices-and-payments/fuel-and-other-surcharges/out-of-delivery-pick-up-area-surcharge.html' },
      { label: 'UPS', url: 'https://assets.ups.com/adobe/assets/urn:aaid:aem:76be2504-c73d-4d94-b4db-550997a8f095/original/as/ea-surcharge-vn-vi.xlsx' }
    ]
  }
];
