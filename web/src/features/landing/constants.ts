import type { OrderStatus } from '@/features/orders/types';
import type { IconName, Tone } from '@/shared/ui';

/**
 * Nội dung trang ngoài — lấy từ website hiện tại vietanexpress.com.vn và bảng hiệu trụ sở.
 * Đổi thông tin liên hệ / chi nhánh: chỉ sửa ở đây.
 */
export const COMPANY = {
  name: 'Việt An Express',
  legalName: 'Viet An Express International Co., Ltd',
  foundedYear: 2010,
  copyrightFrom: 2013,
  address: 'Số 14 Sam Sơn, phường Tân Sơn Nhất, TP. Hồ Chí Minh',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=14+Sam+S%C6%A1n+T%C3%A2n+S%C6%A1n+Nh%E1%BA%A5t+H%E1%BB%93+Ch%C3%AD+Minh'
} as const;

export interface ContactLink {
  label: string;
  href: string;
}

/** Kênh liên hệ — `href` dùng trực tiếp cho thẻ <a>. */
export const CONTACTS = {
  phone: { label: '028 3948 3949', href: 'tel:+842839483949' },
  hotline: { label: '0909 805 845', href: 'tel:+84909805845' },
  email: { label: 'phuc.vo@vietanexpress.com', href: 'mailto:phuc.vo@vietanexpress.com' },
  zalo: { label: 'Zalo 0909 805 845', href: 'https://zalo.me/0909805845' }
} as const satisfies Record<string, ContactLink>;

export const BRANCHES: ReadonlyArray<{ city: string; note?: string }> = [
  { city: 'TP. Hồ Chí Minh', note: 'Trụ sở chính' },
  { city: 'Hà Nội' },
  { city: 'Cần Thơ' },
  { city: 'Bảo Lộc, Lâm Đồng' }
];

/** Hãng mà Việt An làm đại lý gom hàng. */
export const CARRIERS = ['DHL', 'FedEx', 'UPS', 'TNT'] as const;

export const SERVICES: ReadonlyArray<{ icon: IconName; title: string; desc: string }> = [
  { icon: 'plane', title: 'Chuyển phát nhanh quốc tế', desc: 'Chứng từ và hàng hóa đi hầu hết các nước, Việt An lo thủ tục thông quan để hàng đi nhanh nhất.' },
  { icon: 'tag', title: 'Dịch vụ tiết kiệm', desc: 'Cước rẻ nhất cho lô hàng từ 10 kg, không gấp về thời gian, áp dụng các tuyến chuyên.' },
  { icon: 'clock', title: 'Giao hàng hẹn giờ', desc: 'Phát đúng thời điểm yêu cầu — trễ hẹn hoàn lại phụ phí hẹn giờ.' },
  { icon: 'box', title: 'Đóng gói & hút chân không', desc: 'Miễn phí tối ưu kích thước kiện, gia cố đúng chuẩn hãng để giảm cước thể tích.' },
  { icon: 'shield', title: 'Khai báo hải quan', desc: 'Chứng từ xuất nhập khẩu, invoice và công văn cam kết theo từng mặt hàng.' },
  { icon: 'warehouse', title: 'Kho bãi & vận chuyển từ cảng', desc: 'Lưu kho, gom hàng; nhận hàng từ cảng, sân bay về kho và ngược lại.' }
];

/** Tuyến chuyên — `code` là mã ISO, cờ ở public/flags/<code>.svg (bộ flag-icons, MIT). */
export const LANES: ReadonlyArray<{ code: string; country: string; landmark: string }> = [
  { code: 'US', country: 'Mỹ', landmark: 'Tượng Nữ thần Tự do' },
  { code: 'AU', country: 'Úc', landmark: 'Nhà hát Opera Sydney' },
  { code: 'CA', country: 'Canada', landmark: 'Tháp CN, Toronto' },
  { code: 'SG', country: 'Singapore', landmark: 'Marina Bay Sands' },
  { code: 'MY', country: 'Malaysia', landmark: 'Tháp đôi Petronas' },
  { code: 'TW', country: 'Đài Loan', landmark: 'Tòa tháp Taipei 101' },
  { code: 'AE', country: 'Dubai', landmark: 'Tháp Burj Khalifa' }
];

/** Phương châm "Nhanh chóng – Chính xác – An toàn – Tiết kiệm". */
export const VALUES: ReadonlyArray<{ icon: IconName; title: string; desc: string }> = [
  { icon: 'clock', title: 'Nhanh chóng', desc: 'Lấy hàng tận nơi, xử lý và chuyển hãng nhanh chóng.' },
  { icon: 'target', title: 'Chính xác', desc: 'Cập nhật hành trình liên tục từ lúc nhận tới khi phát.' },
  { icon: 'shield', title: 'An toàn', desc: 'Đóng gói đúng chuẩn, chụp ảnh kiện tại kho.' },
  { icon: 'wallet', title: 'Tiết kiệm', desc: 'Nhiều hãng, nhiều mức giá để chọn đúng nhu cầu.' }
];

export const PORTAL_FEATURES: ReadonlyArray<{ icon: IconName; title: string; desc: string }> = [
  { icon: 'filePlus', title: 'Tạo đơn từng bước hoặc 1 trang', desc: 'Tự quy đổi cân thể tích, cảnh báo kiện quá khổ, quá tải theo từng hãng.' },
  { icon: 'upload', title: 'Tạo đơn từ Excel', desc: 'Nhập hàng loạt tới 100 đơn mỗi lần theo file mẫu có sẵn.' },
  { icon: 'printer', title: 'In bill & nhãn', desc: 'In khổ A4 hoặc A6, mã vận đơn được cấp ngay khi in.' },
  { icon: 'chart', title: 'Giá & gợi ý dịch vụ', desc: 'Tra cước theo cân và điểm đến, chọn dịch vụ phù hợp.' },
  { icon: 'truck', title: 'Đặt lịch pickup', desc: 'Hẹn khung giờ lấy hàng tận nơi theo chi nhánh.' },
  { icon: 'bag', title: 'Kênh bán hàng', desc: 'Đưa đơn e-commerce lên hệ thống bằng file CSV.' }
];

export const STEPS: ReadonlyArray<{ title: string; desc: string }> = [
  { title: 'Tạo đơn', desc: 'Nhập người nhận, kiện hàng và invoice.' },
  { title: 'Kiểm tra đơn nháp', desc: 'Chỉnh sửa trước khi chốt.' },
  { title: 'In & cấp bill', desc: 'Hệ thống cấp mã vận đơn.' },
  { title: 'Theo dõi', desc: 'Xem hành trình và ảnh kiện.' }
];

/** Ảnh hoạt động — file trong public/landing. */
export const GALLERY: ReadonlyArray<{ src: string; alt: string }> = [
  { src: '/landing/dua-hang-ra-kho.jpg', alt: 'Đưa hàng ra kho' },
  { src: '/landing/kiem-va-dong.jpg', alt: 'Kiểm và đóng gói hàng tại kho' },
  { src: '/landing/giao-hang.jpg', alt: 'Giao hàng cho hãng bay' },
  { src: '/landing/van-phong.jpg', alt: 'Văn phòng Việt An Express' },
  { src: '/landing/gia-dinh-2018.jpg', alt: 'Tập thể Việt An năm 2018' },
  { src: '/landing/thien-nguyen-1.jpg', alt: 'Hoạt động thiện nguyện' },
  { src: '/landing/thien-nguyen-2.jpg', alt: 'Hoạt động thiện nguyện' }
];

/** Mục trên thanh điều hướng — trỏ tới id của từng phần. */
export const NAV: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'dich-vu', label: 'Dịch vụ' },
  { id: 'tuyen', label: 'Tuyến gửi' },
  { id: 've-chung-toi', label: 'Về chúng tôi' },
  { id: 'portal', label: 'Portal' },
  { id: 'lien-he', label: 'Liên hệ' }
];

/** Trạng thái vận đơn trên trang tra cứu công khai — lời lẽ cho khách, khác nhãn nội bộ ORDER_STATUS. */
export const TRACK_STATUS: Record<OrderStatus, { label: string; tone: Tone; icon: IconName }> = {
  wait: { label: 'Đã tạo vận đơn, chờ gửi', tone: 'info', icon: 'file' },
  fly: { label: 'Đang vận chuyển', tone: 'brand', icon: 'plane' },
  nd: { label: 'Giao chưa thành công', tone: 'warning', icon: 'alert' },
  late: { label: 'Chậm so với dự kiến', tone: 'danger', icon: 'clock' },
  ok: { label: 'Đã giao hàng', tone: 'success', icon: 'check' }
};
