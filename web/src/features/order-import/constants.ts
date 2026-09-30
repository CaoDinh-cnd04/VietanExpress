/** File mẫu — nguồn: Mau_Excel_Tao_Don.xlsx (sheet DATA + HƯỚNG DẪN). */
export const IMPORT_TEMPLATE_URL = '/templates/Mau_Excel_Tao_Don.xlsx';

/** Khớp giới hạn backend (ImportOrdersCommand). */
export const IMPORT_LIMITS = { maxRows: 100, maxMb: 5, maxProducts: 50, addressMax: 30, descriptionMax: 50 } as const;

export interface GuideColumn {
  name: string;
  description: string;
  required?: boolean;
}

export interface GuideSection {
  title: string;
  columns: readonly GuideColumn[];
  note?: string;
}

/** Các bước tạo đơn từ Excel (phần hướng dẫn cuối trang). */
export const IMPORT_STEPS: readonly string[] = [
  'Tải file mẫu Excel.',
  'Điền đầy đủ thông tin vào các cột theo hướng dẫn trên.',
  'Chọn dịch vụ / hub nếu muốn áp cho cả file, rồi tải file lên.',
  'Xem kết quả kiểm tra, sửa dòng lỗi (nếu có).',
  'Bấm "Tạo đơn" — đơn được cấp số vận đơn và có trong "Đơn hàng của tôi".'
];

/** Bảng hướng dẫn cột — theo sheet "HƯỚNG DẪN" của file mẫu. */
export const IMPORT_GUIDE: readonly GuideSection[] = [
  {
    title: '1. Thông tin người gửi (Shipper)',
    columns: [
      { name: 'Shipper_att', description: 'Người liên hệ gửi hàng (trống thì lấy theo tài khoản)', required: true },
      { name: 'Shipper_Tel', description: 'Số điện thoại người gửi (trống thì lấy theo tài khoản)', required: true },
      { name: 'Shipper_Tax', description: 'Mã số thuế người gửi (nếu có)' },
      { name: 'Shipper_Email', description: 'Email người gửi' }
    ],
    note: 'Tên công ty người gửi lấy theo tài khoản đang đăng nhập.'
  },
  {
    title: '2. Thông tin người nhận (Consignee)',
    columns: [
      { name: 'Cnee_country_Code', description: 'Mã nước đến 2 ký tự, ví dụ: US, AU, SG', required: true },
      { name: 'Cnee_company', description: 'Tên công ty hoặc người nhận', required: true },
      { name: 'Cnee_contact_name', description: 'Tên người nhận hàng', required: true },
      { name: 'Cnee_Tel', description: 'Số điện thoại người nhận', required: true },
      { name: 'Cnee_Email', description: 'Email người nhận' },
      { name: 'Cnee_TaxID', description: 'Mã số thuế người nhận (bắt buộc với EU, nếu có)' },
      { name: 'Cnee_Postalcode', description: 'Mã bưu chính (ZIP / postal code)' },
      { name: 'Cnee_City', description: 'Tên thành phố', required: true },
      { name: 'Cnee_State', description: 'Bang / tỉnh — bắt buộc với Mỹ, Canada, Úc' },
      { name: 'Add1', description: 'Địa chỉ dòng 1 — tối đa 30 ký tự', required: true },
      { name: 'Add2', description: 'Địa chỉ dòng 2 — tối đa 30 ký tự', required: true },
      { name: 'Add3', description: 'Địa chỉ dòng 3 — tuỳ chọn' }
    ]
  },
  {
    title: '3. Thông tin vận chuyển',
    columns: [
      { name: 'Ref_No', description: 'Mã đơn hàng của shop để quản lý (nếu có)' },
      { name: 'Type', description: 'Loại hàng: D = chứng từ, P = hàng hoá. Chứng từ trên 2 kg tự chuyển thành hàng hoá', required: true },
      { name: 'Description', description: 'Mô tả hàng hoá ngắn gọn, dưới 50 ký tự', required: true },
      { name: 'Currency', description: 'Đơn vị tiền tệ: USD, VND, AUD…', required: true },
      { name: 'Export_Type', description: 'Loại hình xuất khẩu: Gift, Sample…', required: true },
      { name: 'Invoice_Value', description: 'Tổng giá trị hàng hoá — có sản phẩm thì hệ thống tự tính theo sản phẩm' },
      { name: 'Shipping_fee', description: 'Phí vận chuyển (nếu có — để hiển thị trên invoice)' }
    ],
    note: 'Dịch vụ và hub chọn ở đầu trang (áp cho cả file). Không chọn thì lấy theo cột Service / HUB trong file nếu có.'
  },
  {
    title: '4. Thông tin kiện hàng',
    columns: [
      { name: 'Qty_Pack_1', description: 'Số lượng kiện cùng kích thước', required: true },
      { name: 'Pack_Type_1', description: 'Loại bao bì (thùng carton, túi, pallet…)', required: true },
      { name: 'L_1', description: 'Chiều dài của kiện (cm) — bắt buộc với hàng hoá' },
      { name: 'W_1', description: 'Chiều rộng của kiện (cm) — bắt buộc với hàng hoá' },
      { name: 'H_1', description: 'Chiều cao của kiện (cm) — bắt buộc với hàng hoá' },
      { name: 'GW_1', description: 'Trọng lượng tổng của dòng kiện (kg)', required: true }
    ],
    note: 'Nhiều kích thước kiện: thêm cột với số thứ tự tăng dần Qty_Pack_2, Pack_Type_2, L_2, W_2, H_2, GW_2…'
  },
  {
    title: '5. Thông tin hàng hoá trong kiện (tối đa 50 mặt hàng)',
    columns: [
      { name: 'Product_en_1', description: 'Tên sản phẩm bằng tiếng Anh — hàng hoá cần ít nhất 1 sản phẩm' },
      { name: 'Product_vn_1', description: 'Tên sản phẩm bằng tiếng Việt' },
      { name: 'Manufacturer_1', description: 'Tên nhà sản xuất (nếu có)' },
      { name: 'Org_Country_1', description: 'Mã nước xuất xứ: VN, US, CN… (trống là VN)' },
      { name: 'HS_Code_1', description: 'Mã HS 6, 8 hoặc 10 chữ số (nếu biết)' },
      { name: 'Qty_1', description: 'Số lượng sản phẩm' },
      { name: 'Unit_1', description: 'Đơn vị: pcs, bộ, kg… (trống là PCS)' },
      { name: 'Unit_Price_1', description: 'Giá mỗi đơn vị sản phẩm' }
    ],
    note: 'Nhiều sản phẩm: thêm cột Product_en_2, Product_vn_2, … đến Unit_Price_50.'
  }
];
