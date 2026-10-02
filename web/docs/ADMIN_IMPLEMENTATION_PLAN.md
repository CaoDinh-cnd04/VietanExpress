# Kế hoạch admin quản trị dữ liệu và giao diện khách hàng

Ngày: 02/10/2026. Trạng thái: đề xuất, chưa triển khai các chức năng trong tài liệu này.

## 1. Phạm vi và hiện trạng đã đọc

Admin riêng tại `/admin`, quản trị dữ liệu nghiệp vụ, danh mục, nội dung và cấu hình hiển thị của portal khách hàng. Tổng quan là một mục phụ; trọng tâm là chỉnh sửa và vận hành.

- `features/admin/AdminPage.tsx`: hiện có tổng quan, đơn hàng, khách hàng; dữ liệu demo giữ trong React state, tải lại mất thay đổi. Đơn chỉ sửa trạng thái; khách sửa tên, email, điện thoại, địa chỉ và trạng thái.
- `features/orders/components/OrdersTable.tsx`: cột Ref No., VA Bill, người nhận, ngày gửi, trạng thái/POD, tracking, ngày tạo, in chứng từ và nhãn; cấu hình cột nằm trong code.
- `features/create-order/schema.ts`: đầy đủ người gửi, người nhận, hãng/hub, kiện, hàng hóa và invoice. Đây là cơ sở cho màn hình sửa đơn của admin.
- `shared/config/domain.ts`: chi nhánh, hãng/hub, dịch vụ mặc định và liên kết tracking khai tĩnh.
- `features/create-order/lib/carrier-limits.ts`: ngưỡng quá khổ, quá tải và giới hạn nhận khai tĩnh.
- `features/pricing`: portal đã có tab quản lý/nhập giá, ServiceManager và ServiceEditor. Cần xác định bảng giá cá nhân với bảng giá chung để cấp đúng quyền và tái sử dụng bộ biên tập.
- `features/landing/constants.ts`, `features/support/constants.ts`, `shared/i18n`: thông tin công ty, liên hệ, dịch vụ, tuyến, ảnh, FAQ và bản dịch nằm trong code.
- `features/mytracking`: có cấu hình ảnh, tiêu đề, mô tả và thương hiệu; lưu nháp theo khách trên localStorage, chưa xuất bản bằng API.
- `docs/API_CONTRACT.md`: hợp đồng portal, một số endpoint ghi được mô tả; không đồng nghĩa mọi endpoint đã triển khai trong backend hiện tại. Phải kiểm tra controller/service trước khi kết nối admin.

## 2. Bốn loại chỉnh sửa

| Loại | Ví dụ | Cách lưu và ảnh hưởng |
|---|---|---|
| Giá trị của bản ghi | Ref No., người nhận, cân nặng, POD | API nghiệp vụ; thay đổi đúng đơn/khách được chọn |
| Danh mục và quy tắc | Hãng, hub, phí, giới hạn kiện | Cấu hình nghiệp vụ có phiên bản và thời gian hiệu lực |
| Nội dung chữ/ảnh | FAQ, tiêu đề, banner, thông báo | Nội dung có bản nháp và bản xuất bản |
| Cấu hình bảng/giao diện | Tên cột, thứ tự, ẩn/hiện, độ rộng | Cấu hình theo trang và phạm vi áp dụng |

Đổi nhãn cột không đổi tên trường trong database. Tổng cân, cân quy đổi, số lượng tổng và tiền tổng được tính lại từ dữ liệu nguồn; không cho nhập tùy ý vào ô tổng. ID, mã bill và mã trạng thái ổn định, có quy trình riêng khi cần sửa nghiệp vụ.

## 3. Menu và chức năng chi tiết

### Đơn hàng và đơn nháp

- Danh sách theo khách, chi nhánh, hãng/hub, trạng thái, ngày, quốc gia và cân nặng; tìm nhiều mã; chọn nhiều dòng; xuất dữ liệu theo bộ lọc.
- Sửa nhanh Ref No., ghi chú và trường đơn giản được phép; Enter lưu, Escape hủy, báo lỗi tại ô. Trường liên quan nhau sửa trong biểu mẫu chi tiết.
- Chi tiết chia tab: tổng quan; người gửi/người nhận; kiện hàng; hàng hóa/invoice; hành trình/POD; ảnh; lịch sử sửa.
- Người gửi: công ty, shipper gốc, liên hệ, điện thoại, email, thuế, địa chỉ, nước và chi nhánh.
- Người nhận: công ty, liên hệ, điện thoại/mã vùng, email, nước, mã bưu chính, thành phố, bang, địa chỉ 1–3, thuế, IOSS/EORI theo nước EU.
- Dịch vụ: hãng, hub, tham chiếu, DOC/PACK. Kiện: số lượng, đóng gói, dài/rộng/cao, cân mỗi kiện, nhóm và mô tả.
- Invoice: tên EN/VN, nhà sản xuất, xuất xứ, HS, số lượng, đơn vị, đơn giá, tiền tệ, loại xuất khẩu, điều kiện thuế và phí vận chuyển.
- Tracking: thêm/sửa sự kiện, thời gian, địa điểm; cập nhật ngày gửi, ngày/giờ giao, người ký nhận và mã hãng theo quyền.
- Ảnh kiện: tải lên, chú thích, thứ tự và xóa theo quyền. In lại bill, invoice, CVCK, nhãn từ dữ liệu đã lưu.
- Đơn đã cấp bill dùng quy trình điều chỉnh riêng, ghi lý do và lịch sử; không áp dụng cách sửa đơn nháp. Xem lại chứng từ sau điều chỉnh.

### Khách hàng

- Mã khách, công ty, liên hệ, email, điện thoại, địa chỉ, mã thuế, chi nhánh mặc định và trạng thái tài khoản.
- Các tab: hồ sơ, đơn hàng, sổ người gửi/người nhận, bảng giá áp dụng, MyTracking và lịch sử thay đổi.
- Khóa/mở tài khoản và đặt lại mật khẩu theo quyền; không hiển thị mật khẩu cũ.
- Cấu hình riêng theo khách kế thừa cấu hình chung; có nút trở về mặc định và hiển thị các mục đã ghi đè.

### Bảng giá và phụ phí

- Tên dịch vụ, tài khoản, FSC, VAT, ETA, ngày hiệu lực, zone và nước thuộc zone.
- Sửa ô giá theo zone/mốc 0,5 kg tới 70 kg; giá trên 70 kg; quy tắc phụ phí theo cân/kích thước.
- Sao chép bảng giá, nhập Excel có xem trước/lỗi từng dòng, điều chỉnh hàng loạt theo số tiền hoặc phần trăm.
- Tra thử một lô hàng trước khi áp dụng; xem chi tiết cước gốc, FSC, phụ phí, VAT và tổng.
- Bảng chung và bảng riêng của khách/nhóm khách là phạm vi đề xuất bổ sung; cần xác định mô hình lưu và thứ tự ưu tiên.

### Danh mục và cấu hình tạo đơn

- Chi nhánh, hãng, hub: tên, mã ổn định, quan hệ hãng–hub, thứ tự, trạng thái hoạt động và lựa chọn mặc định.
- Nhóm hàng chung, gợi ý tên EN/VN và HS; loại đóng gói, đơn vị tính, tiền tệ và tùy chọn dịch vụ.
- Phí tùy chọn: tên, tiền/% phí, đơn vị, ghi chú và thời gian áp dụng.
- Giới hạn hãng: cạnh dài, tổng cạnh, cân mỗi kiện, ngưỡng tính phụ phí và ngưỡng không nhận; ETA tham khảo và hệ số quy đổi.
- Quy tắc cấu hình phải có kiểu/range hợp lệ, dùng thống nhất frontend/backend. Quy tắc pháp lý và mã giao thức không trở thành ô text chỉnh tùy ý.
- Không xóa danh mục đang được tham chiếu; ngừng sử dụng cho đơn mới, giữ lịch sử đơn cũ.

### Cột bảng và nội dung portal

- Chọn trang: đơn hàng, đơn nháp, pickup, bảng giá, e-commerce, sự cố hoặc thông báo.
- Mỗi cột: khóa trường, nhãn VI/EN, ẩn/hiện, thứ tự, độ rộng, căn lề, định dạng ngày/số/tiền, cố định cột và quyền thấy.
- Chọn cột được phép sửa nhanh; quyền do backend kiểm tra, không do cấu hình hiển thị tự cấp.
- Cột nghiệp vụ mở rộng chỉ được thêm khi đã có kiểu dữ liệu, API, lưu trữ và quy tắc lọc/xuất tương ứng. Không cho nhập tên cột database bất kỳ.
- Trình sửa text: tìm theo trang/nhóm/nội dung, sửa tiêu đề, mô tả, nhãn input, placeholder, hướng dẫn, tên nút, thông báo và nhãn trạng thái.
- Text có biến như `{n}`, `{name}` được kiểm tra giữ đúng biến; xem trước cả VI/EN. Đổi nhãn trạng thái giữ mã `wait/fly/nd/ok/late`.
- Menu: nhãn, thứ tự, ẩn/hiện các chức năng đã có. Không cho nhập route tùy ý; ẩn menu không thay thế phân quyền.

### Nội dung trang ngoài, hỗ trợ và MyTracking

- Trang ngoài: tên công ty, địa chỉ, liên hệ, logo, banner/hero, dịch vụ, tuyến chuyên, giới thiệu, ảnh hoạt động và chân trang.
- Hỗ trợ: FAQ, loại góp ý, hotline, email, giờ làm việc; xử lý lời nhắn và file đính kèm.
- Thông báo: tiêu đề, nội dung, mức quan trọng, đối tượng nhận, lịch hiển thị, trạng thái nháp/xuất bản và kết quả đã đọc.
- MyTracking theo khách: tiêu đề dịch vụ, mô tả, ảnh/link đích, nền, logo, địa chỉ, điện thoại và liên kết mạng xã hội.
- MyTracking có xem trước desktop/mobile, lưu server, phiên bản và xuất bản đường dẫn riêng; chuyển nháp localStorage phải có luồng nhập rõ ràng.

### Pickup, sự cố và e-commerce

- Pickup: ngày, khung giờ, chi nhánh, địa chỉ, liên hệ, điện thoại, số kiện, cân nặng, ghi chú, người phụ trách và kết quả. Bổ sung lưu cân/ghi chú nếu backend chưa hỗ trợ.
- Sự cố: bill, loại, mức ưu tiên, mô tả, yêu cầu, liên hệ, người phụ trách, trạng thái và hội thoại khách–CS.
- E-commerce: nguồn, tham chiếu, người nhận/nước, dịch vụ/hub, cân, SKU/số lượng/giá/HS/xuất xứ và khai báo hải quan; xem lỗi nhập và xử lý lại theo quyền.
- Kết nối: nguồn được bật, webhook, sự kiện gửi và kiểm tra kết nối; quyền riêng cho tạo lại khóa API, không đưa khóa vào nhật ký sửa.

## 4. Giao diện quản trị

- Dùng token thương hiệu hiện có: xanh `#2E8B3E`, xanh đậm `#1A6128`, nền `#EDF1EE`, bề mặt trắng; giữ hỗ trợ theme sáng/tối.
- Menu chia Vận hành, Giá & Danh mục, Nội dung & Giao diện, Hệ thống. Tìm menu/chức năng từ thanh trên.
- Danh sách có tìm kiếm, bộ lọc, chọn cột, lựa chọn hàng loạt, phân trang và thanh báo kết quả.
- Biểu mẫu dài mở trang chi tiết có tab; popup cho sửa ngắn. Cấu hình nội dung có vùng xem trước desktop/mobile.
- Các trường bị khóa hiển thị lý do; trạng thái lưu/đang lưu/lỗi rõ ràng, giữ nội dung chưa lưu khi API lỗi.

## 5. Luồng chỉnh sửa

### Chỉnh một ô dữ liệu

Chọn dòng → sửa ô → kiểm tra kiểu/ràng buộc → xem tác động nếu liên quan tiền hoặc chứng từ → lưu qua API → tính lại dữ liệu phụ thuộc → cập nhật portal → ghi người sửa, thời điểm, giá trị trước/sau.

### Chỉnh text hoặc bố cục

Chọn trang → chọn thành phần → sửa VI/EN hoặc cấu hình cột → xem trước → chọn phạm vi toàn hệ thống/nhóm khách/khách riêng → lưu nháp → so sánh bản cũ/mới → xuất bản → portal đọc phiên bản mới. Có khôi phục bằng một phiên bản mới.

### Sửa hàng loạt

Lọc → chọn rõ bản ghi → chọn trường và giá trị → xem trước số dòng/tác động → lưu → báo thành công/thất bại từng dòng. Không cập nhật các dòng ngoài phạm vi đã chọn.

## 6. Dữ liệu và API cần bổ sung

- Nhóm API admin riêng cho đơn/khách, catalog, giá, pickup, sự cố, nội dung, text, cấu hình trang, tài khoản và nhật ký; tái sử dụng service nghiệp vụ hiện có.
- Portal đọc cấu hình đã xuất bản từ API thay các hằng số thích hợp; các cấu hình cá nhân có ưu tiên được xác định rõ.
- Lưu text theo khóa ổn định + ngôn ngữ; cột theo khóa trang/trường; nội dung và theme theo schema cho phép. Không lưu mã JavaScript/CSS tùy ý.
- Cấu hình xuất bản có phiên bản, người sửa, thời gian, phạm vi; cập nhật cache theo phiên bản. Dữ liệu giao dịch có kiểm soát xung đột khi hai người cùng sửa.
- Media lưu bằng dịch vụ upload, trả URL; kiểm tra loại/kích thước và URL, không phụ thuộc localStorage cho bản xuất bản.
- Xác thực nhân viên và quyền độc lập với tài khoản khách. Quyền chia xem, sửa, xuất dữ liệu, sửa giá, quản lý cấu hình, xuất bản và quản lý người dùng.
- Không sửa trực tiếp toàn bộ database bằng một màn hình cột chung; mỗi trường đi qua API/validation nghiệp vụ tương ứng.

## 7. Thứ tự triển khai

1. Kiểm kê trường từng trang, phân loại dữ liệu/text/cấu hình, đối chiếu API backend thực tế; chốt quyền và phạm vi áp dụng.
2. Xây nền tảng admin, xác thực/quyền, nhật ký và dữ liệu thật; thay demo ở đơn/khách.
3. Sửa đơn đầy đủ, hồ sơ khách và sửa nhanh các ô đơn giản; tính lại và xem lịch sử.
4. Quản lý hãng/hub/chi nhánh, phí và giới hạn; kết nối các danh mục sang form khách hàng.
5. Biên tập cột bảng và text portal, xem trước/xuất bản; ưu tiên bảng đơn, form tạo đơn, FAQ và liên hệ.
6. Quản lý bảng giá chi tiết và phạm vi áp dụng, nhập/xem trước/tính thử.
7. Pickup, hội thoại sự cố, thông báo và e-commerce.
8. Nội dung trang ngoài, MyTracking lưu server/xuất bản; kiểm tra end-to-end và mobile.

## 8. Tiêu chí nghiệm thu

- Sửa Ref No./người nhận/cân một đơn từ admin; portal và chứng từ đọc đúng dữ liệu mới, tổng được tính lại, lịch sử đầy đủ.
- Đổi nhãn, ẩn hoặc chuyển vị trí một cột; portal áp dụng đúng phạm vi, dữ liệu không mất, xuất file theo cấu hình đã chọn.
- Sửa FAQ, hotline, tên nút VI/EN và tiêu đề dịch vụ; xem trước và xuất bản hoạt động sau tải lại và trên trình duyệt khác.
- Đổi hub hoặc phí/giới hạn theo phiên bản; form, cảnh báo và báo giá dùng cùng dữ liệu, đơn lịch sử giữ thông tin phù hợp.
- Tài khoản khách không gọi được API admin; người không có quyền sửa/xuất bản bị từ chối từ backend.
- Lỗi lưu hoặc xung đột không ghi đè âm thầm và không làm mất nội dung đang sửa.
- Kiểm tra phạm vi toàn hệ thống và riêng khách, nhập Excel có lỗi, cập nhật hàng loạt, hoàn tác phiên bản và các luồng mobile.
