import type { Placement } from './lib/tour';

export interface TourStep {
  /** Giá trị thuộc tính data-tour của vùng cần chỉ vào; không có = khung giữa màn hình. */
  target?: string;
  placement: Placement;
  title: string;
  body: string;
}

/** Hướng dẫn lần đầu cho khách mới. Thêm / bớt bước: sửa mảng này và gắn data-tour vào phần tử tương ứng. */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    placement: 'center',
    title: 'Chào mừng đến Portal Việt An Express',
    body: 'Mất khoảng 1 phút để xem nhanh các chức năng chính. Bạn có thể bỏ qua và xem lại bất cứ lúc nào trong menu tài khoản (góc trên bên phải).'
  },
  {
    target: 'nav-create',
    placement: 'right',
    title: 'Tạo đơn',
    body: 'Có 3 cách: "Tạo đơn từng bước" dẫn bạn qua từng phần, "Tạo đơn 1 trang" cho người đã quen, "Tạo đơn từ Excel" để tạo nhiều đơn một lần bằng file mẫu. Thông tin người gửi được điền sẵn theo tài khoản của bạn.'
  },
  {
    target: 'nav-orders',
    placement: 'right',
    title: 'Quản lý đơn hàng',
    body: 'Đơn vừa tạo nằm ở "Đơn nháp & chưa in" — bấm In để được cấp số vận đơn. Sau đó đơn chuyển sang "Đơn hàng của tôi": theo dõi hành trình, in bill / invoice / nhãn, xuất bảng kê Excel.'
  },
  {
    target: 'nav-sales',
    placement: 'right',
    title: 'Giá & dịch vụ',
    body: 'So sánh giá các hãng theo nước đến và cân nặng trước khi gửi, chọn dịch vụ phù hợp rồi tạo đơn ngay từ kết quả.'
  },
  {
    target: 'nav-support',
    placement: 'right',
    title: 'Hỗ trợ',
    body: 'Báo sự cố đơn hàng, xem thông báo từ Việt An và gửi góp ý. Khi tạo đơn, nút "Tra cứu & hỗ trợ" có link phụ phí, vùng sâu vùng xa và tra cứu mã HS.'
  },
  {
    target: 'notifications',
    placement: 'bottom',
    title: 'Thông báo',
    body: 'Số màu đỏ là thông báo chưa đọc: thay đổi phụ phí, lịch nghỉ lễ, cập nhật đơn hàng.'
  },
  {
    target: 'account',
    placement: 'bottom',
    title: 'Tài khoản',
    body: 'Đổi mật khẩu, đăng xuất và "Xem hướng dẫn sử dụng" để mở lại phần giới thiệu này.'
  },
  {
    placement: 'center',
    title: 'Sẵn sàng rồi!',
    body: 'Bắt đầu với đơn đầu tiên của bạn. Cần hỗ trợ, gọi hotline +84 909 805 845.'
  }
];
