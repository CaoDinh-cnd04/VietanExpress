/**
 * Chữ tiếng Việt cố ý KHÔNG dịch: tên riêng, địa danh, mã dữ liệu gửi backend / hệ thống cũ,
 * nội dung chỉ dùng cho tiếng Việt (vd từ khoá nhận diện chứng từ).
 */
export const NO_TRANSLATE: ReadonlySet<string> = new Set([
  'Việt An Express',
  'Việt An',
  'Việt Nam',
  'Hà Nội',
  'Huế',
  'Bảo Lộc',
  'Cần Thơ',
  'Đà Nẵng',
  'Hải Phòng',
  'Bình Dương',
  'Đồng Nai',
  // Dữ liệu mẫu trong file CSV mẫu (giữ nguyên tiếng Việt)
  'Váy hoa nữ',
  // Ký hiệu tiền đồng
  'đ',
  // Lỗi dành cho lập trình viên, không hiện cho khách
  'useToast phải nằm trong <ToastProvider>'
]);
