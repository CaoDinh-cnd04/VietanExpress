/** Tiếng Anh — E-commerce: tổng quan, đẩy đơn, đơn E-commerce, kết nối & API. */
export const ecommerce: Record<string, string> = {
  // Trang & tab
  'Chức năng E-commerce': 'E-commerce functions',
  'Đơn E-commerce': 'E-commerce orders',
  'Kết nối sàn': 'Store connections',

  // Nguồn & trạng thái
  'Nhập tay': 'Manual',
  'Đã tạo': 'Created',
  'Đã lấy': 'Picked up',
  'Lỗi': 'Error',
  'Chờ cân đo': 'Awaiting weighing',
  'liquid (lỏng)': 'liquid',

  // Tổng quan
  'Lỗi cần xử lý': 'Errors to fix',

  // Đẩy đơn
  'Đã sao chép ví dụ cURL': 'cURL example copied',
  'Đang xử lý {name}…': 'Processing {name}…',
  'Kéo & thả file CSV hoặc bấm để chọn': 'Drag & drop a CSV file or click to choose',
  'Chỉ nhận file .csv. Với file Excel, hãy lưu lại dạng CSV UTF-8.': 'Only .csv files are accepted. For Excel files, save them as CSV UTF-8.',
  'Dòng {row}: {message}': 'Row {row}: {message}',
  '{message} — mã bill {bill}': '{message} — bill number {bill}',
  'Chưa in được nhãn — chức năng đang được kết nối máy chủ': 'Could not print labels — this feature is being connected to the server',

  // Đánh bill lẻ
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

  // Đơn E-commerce
  'Tìm đơn E-commerce': 'Search E-commerce orders',
  'Khổ nhãn': 'Label size',
  'Xuất Excel': 'Export Excel',
  'Không có đơn phù hợp': 'No matching orders',
  'Chọn tất cả': 'Select all',
  'Mã đơn shop': 'Shop order number',
  'Số SP': 'Products',
  'chờ cân': 'awaiting weighing',

  // Kết nối & API
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
  'Kết nối': 'Connect',
  'Ngắt kết nối': 'Disconnect',

  // Kết nối sàn (OAuth Shopify / TikTok Shop)
  'Chưa kết nối được sàn — chức năng đang được hoàn thiện ở máy chủ': 'Could not connect the store — this feature is still being completed on the server',
  'Đã kết nối {platform}': 'Connected {platform}',
  'Không tải được danh sách cửa hàng, vui lòng thử lại sau.': 'Could not load stores, please try again later.',
  'Ủy quyền lại': 'Re-authorize',
  'Ngắt kết nối cửa hàng': 'Disconnect store',
  'Việt An sẽ ngừng nhận đơn và ngừng đẩy tracking cho {shop}. Đơn đã nhận vẫn giữ nguyên.':
    'Viet An will stop receiving orders and pushing tracking for {shop}. Orders already received are kept.',
  'Hoa Kỳ (US)': 'United States (US)',
  'Đang hoạt động': 'Active',
  'Hết hạn ủy quyền': 'Authorization expired',
  'Lỗi đồng bộ': 'Sync error',
  'Shop đã gỡ ứng dụng': 'App uninstalled by shop',

  // Trang đã gộp: Đơn hàng · Thêm đơn · Kết nối
  'Kết nối Shopify, TikTok Shop để đơn tự về và tracking tự trả lên sàn, hoặc thêm đơn bằng file Excel.':
    'Connect Shopify or TikTok Shop so orders arrive and tracking is sent back automatically, or add orders from an Excel file.',
  'Đơn hàng': 'Orders',
  'Thêm đơn': 'Add orders',
  'Đã có bill': 'Bill issued',
  'Cách thêm đơn': 'How to add orders',
  'Từ file Excel / CSV': 'From Excel / CSV file',
  'Nhập tay từng đơn': 'Enter orders manually',
  'Nhập đơn từ file': 'Import orders from file',
  'Tải file mẫu, điền đơn (mỗi đơn tối đa 5 sản phẩm), lưu dạng CSV UTF-8 rồi kéo thả lên đây. Hệ thống báo kết quả từng dòng.':
    'Download the template, fill in orders (up to 5 products each), save as CSV UTF-8 and drop it here. Results are reported per row.',
  '· đơn mới tự về tab Đơn hàng, mã tracking tự trả lên sàn khi có bill': '· new orders appear in the Orders tab; tracking is sent back once a bill is issued',
  'Máy chủ chưa có chức năng kết nối sàn. Phần này sẽ hoạt động khi backend hoàn tất.': 'The server does not support store connections yet. This will work once the backend is done.',
  'Tên cửa hàng': 'Store name',
  'Nhập dạng ten-shop hoặc ten-shop.myshopify.com': 'Enter shop-name or shop-name.myshopify.com',
  'Thị trường': 'Market',
  'Toàn cầu': 'Global',
  'đồng bộ {date}': 'synced {date}',
  'chưa đồng bộ': 'not synced yet',
  'Đồng bộ': 'Sync',
  'Ngắt kết nối {shop}': 'Disconnect {shop}',
  'Dành cho lập trình viên: API key, webhook': 'For developers: API key, webhook',
  'Máy chủ chưa có chức năng cấu hình API. Phần này sẽ hoạt động khi backend hoàn tất.': 'The server does not support API settings yet. This will work once the backend is done.',
  'Tạo đơn qua API': 'Create orders via API',

  // Tab Đơn hàng
  'Lọc nhanh': 'Quick filters',
  'Tìm mã đơn, VA Bill, người nhận…': 'Search order, VA Bill, receiver…',
  'Nguồn đơn': 'Order source',
  'Mọi nguồn': 'All sources',
  'Đơn shop': 'Shop order',
  'Hàng': 'Goods',
  'Đã chọn {n} đơn': '{n} orders selected',
  'Khổ {f}': 'Size {f}',
  'In nhãn': 'Print labels',
  'Chưa có đơn nào': 'No orders yet',
  'Kết nối Shopify, TikTok Shop để đơn tự về, hoặc thêm đơn từ file Excel.': 'Connect Shopify or TikTok Shop to receive orders automatically, or add orders from an Excel file.',
  'Xóa bộ lọc': 'Clear filters',

  // Thêm đơn — nhập tay
  'Vận chuyển': 'Shipping',
  '· tối đa 5 sản phẩm': '· up to 5 products',
  'Chọn nước trong danh sách': 'Choose a country from the list',
  'Gõ để tìm nước': 'Type to search countries',
  'Đang tải danh sách nước…': 'Loading countries…',
};
