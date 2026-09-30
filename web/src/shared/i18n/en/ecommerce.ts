/** Tiếng Anh — kênh bán hàng (e-commerce): tổng quan, đẩy đơn, đơn e-com, kết nối & API. */
export const ecommerce: Record<string, string> = {
  // Trang & tab
  'Kênh bán hàng (E-commerce)': 'Sales channels (E-commerce)',
  'Đẩy đơn hàng loạt từ shop / sàn (TikTok Shop, Shopify, Shopee…) qua API, Excel hoặc đánh bill lẻ.':
    'Push orders in bulk from your shop / marketplace (TikTok Shop, Shopify, Shopee…) via API, Excel or single bills.',
  'Chức năng e-commerce': 'E-commerce functions',
  'Tổng quan': 'Overview',
  'Đẩy đơn': 'Push orders',
  'Đơn e-com': 'E-com orders',
  'Kết nối & API': 'Connections & API',

  // Nguồn & trạng thái
  'Nhập tay': 'Manual',
  'Đã tạo': 'Created',
  'Đã lấy': 'Picked up',
  'Lỗi': 'Error',
  'Chờ cân đo': 'Awaiting weighing',
  'Gắn nhãn nguồn cho đơn từ TikTok Shop': 'Tag orders from TikTok Shop with their source',
  'Gắn nhãn nguồn cho đơn từ Shopify': 'Tag orders from Shopify with their source',
  'Gắn nhãn nguồn cho đơn từ Shopee': 'Tag orders from Shopee with their source',
  'Gắn nhãn nguồn cho đơn từ Lazada': 'Tag orders from Lazada with their source',
  'liquid (lỏng)': 'liquid',

  // Tổng quan
  'Tổng đơn e-com': 'Total e-com orders',
  'Tạo thành công': 'Created successfully',
  'Lỗi cần xử lý': 'Errors to fix',
  'Theo nguồn': 'By source',
  'Chưa có đơn.': 'No orders yet.',
  'Đơn tạo qua API / Excel được cấp mã bill Việt An ngay và trả nhãn (A6 / A4 / ZPL). Đơn thiếu cân hoặc kích thước ở trạng thái':
    'Orders created via API / Excel get a Viet An bill number immediately and return a label (A6 / A4 / ZPL). Orders missing weight or dimensions stay in',
  '— kho Việt An cân xong sẽ cập nhật cước.': '— the rate is updated once the Viet An warehouse weighs them.',

  // Đẩy đơn
  'Cách đẩy đơn': 'Push method',
  'Qua API': 'Via API',
  'Upload Excel / CSV': 'Upload Excel / CSV',
  'Đánh bill lẻ': 'Single bill',
  'Đẩy đơn qua API': 'Push orders via API',
  'Lấy API key': 'Get API key',
  'Dành cho shop có lập trình viên. Gọi API để tạo 1 đơn hoặc nhiều đơn (batch ≤ 100); API trả về mã bill và link nhãn.':
    'For shops with developers. Call the API to create one or many orders (batch ≤ 100); it returns the bill number and label link.',
  'Đã sao chép ví dụ cURL': 'cURL example copied',
  'Không cần lập trình: tải file mẫu 70 cột → điền nhiều đơn (mỗi đơn ≤ 5 sản phẩm) → lưu dạng CSV (UTF-8) → kéo thả lên đây. Hệ thống báo kết quả từng dòng.':
    'No coding needed: download the 70-column template → fill in many orders (≤ 5 products each) → save as CSV (UTF-8) → drop it here. The system reports the result for each row.',
  'Đang xử lý {name}…': 'Processing {name}…',
  'Kéo & thả file CSV hoặc bấm để chọn': 'Drag & drop a CSV file or click to choose',
  'Chỉ nhận file .csv. Với file Excel, hãy lưu lại dạng CSV UTF-8.': 'Only .csv files are accepted. For Excel files, save them as CSV UTF-8.',
  'Dòng {row}: {message}': 'Row {row}: {message}',
  '{message} — mã bill {bill}': '{message} — bill number {bill}',
  'Chưa in được nhãn — chức năng đang được kết nối máy chủ': 'Could not print labels — this feature is being connected to the server',

  // Đánh bill lẻ
  'Đánh bill lẻ (nhập tay)': 'Single bill (manual entry)',
  '· 1 đơn, tối đa 5 sản phẩm': '· 1 order, up to 5 products',
  'Mã đơn của shop (REF)': 'Shop order number (REF)',
  'Nhập mã đơn của shop': 'Enter the shop order number',
  'Nguồn': 'Source',
  'Nhập tên người nhận': 'Enter the receiver name',
  'Để trống nếu Việt An cân': 'Leave blank if Viet An will weigh it',
  'Địa chỉ người nhận': 'Receiver address',
  'Nhập địa chỉ': 'Enter the address',
  'Sản phẩm ({n}/{max})': 'Products ({n}/{max})',
  'Tên hàng (EN)': 'Item name (EN)',
  'Nhập tên hàng': 'Enter the item name',
  'Giá FOB': 'FOB price',
  'Nhập giá FOB': 'Enter the FOB price',
  'Giá bán': 'Selling price',
  'Nhập giá bán': 'Enter the selling price',
  'Xóa sản phẩm {n}': 'Remove product {n}',
  'Thêm sản phẩm': 'Add product',
  'Khai báo hải quan nâng cao (tùy chọn — cho hàng đi US / EU)': 'Advanced customs declaration (optional — for US / EU shipments)',
  'Tổng giá trị khai (declared value)': 'Declared value',
  'CMND / ID người nhận': 'Receiver ID number',
  'Link sản phẩm / gian hàng': 'Product / store link',
  'Mã giao dịch thanh toán': 'Payment transaction ID',
  'Nhà sản xuất: tên · nước · địa chỉ': 'Manufacturer: name · country · address',
  'Làm mới': 'Reset',
  'Đang tạo…': 'Creating…',
  'Tạo đơn & cấp bill': 'Create order & issue bill',

  // Đơn e-com
  'Lọc theo nguồn': 'Filter by source',
  'Tìm đơn e-com': 'Search e-com orders',
  'Tìm theo mã đơn shop, VA Bill, người nhận…': 'Search by shop order number, VA Bill, receiver…',
  'Khổ nhãn': 'Label size',
  'In nhãn ({n})': 'Print labels ({n})',
  'Xuất Excel': 'Export Excel',
  'Đơn e-commerce': 'E-commerce orders',
  'Không có đơn phù hợp': 'No matching orders',
  'Chọn tất cả': 'Select all',
  'Mã đơn shop': 'Shop order number',
  'Số SP': 'Products',
  'Cân': 'Weight',
  'chờ cân': 'awaiting weighing',

  // Kết nối & API
  'Chưa kết nối được cấu hình tích hợp': 'Could not load the integration settings',
  'Máy chủ chưa có chức năng cấu hình tích hợp (GET /ecom/settings). Phần này sẽ hoạt động khi backend hoàn tất.':
    'The server does not support integration settings yet (GET /ecom/settings). This section will work once the backend is ready.',
  'Không tải được cấu hình, vui lòng thử lại sau.': 'Could not load the settings, please try again later.',
  'Sao chép key {env}': 'Copy {env} key',
  'Đã sao chép API key': 'API key copied',
  'Tạo lại': 'Regenerate',
  'Chưa có API key.': 'No API key yet.',
  'Tạo lại key sẽ vô hiệu key cũ ngay lập tức. Dùng key Sandbox để thử nghiệm, không tạo đơn thật.':
    'Regenerating a key disables the old one immediately. Use the Sandbox key for testing; it does not create real orders.',
  'Webhook trạng thái đơn': 'Order status webhook',
  'URL nhận webhook': 'Webhook URL',
  'Sự kiện gửi': 'Events',
  'Gửi thử': 'Send test',
  'Lưu webhook': 'Save webhook',
  'Gắn nguồn sàn': 'Marketplace sources',
  '· đơn được gắn nhãn nguồn để lọc & đối soát': '· orders are tagged with their source for filtering & reconciliation',
  'Kết nối': 'Connect',
  'Ngắt kết nối': 'Disconnect'
};
