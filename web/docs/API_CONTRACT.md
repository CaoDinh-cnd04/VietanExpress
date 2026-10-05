# Hợp đồng API — Việt An Express Portal (frontend `web/`)

Tài liệu này liệt kê **mọi endpoint mà frontend React đang gọi**, kèm dữ liệu gửi / nhận.
Backend mới (SQL Server) chỉ cần làm đúng các hợp đồng này là frontend chạy được, không phải sửa giao diện.

- Base URL: `/api/v1` (cấu hình bằng biến `VITE_API_BASE_URL`).
- Kiểu dữ liệu TypeScript tương ứng nằm trong `web/src/features/<feature>/types.ts` hoặc `api.ts` — đó là nguồn chuẩn.
- Trạng thái: **Có sẵn** = đã có ở backend Express cũ (đã gỡ khỏi repo) và frontend đã chạy thử với nó · **Mới** = backend cần làm thêm.

## Quy ước chung

| Mục | Quy ước |
|---|---|
| Định dạng | JSON (`Content-Type: application/json`). Riêng `POST /support/feedback` là `multipart/form-data`. |
| Danh sách | `{ "success": true, "count": number, "data": T[] }` |
| Một bản ghi | `{ "success": true, "data": T }` |
| Thao tác ghi | `{ "success": true, "message": "Câu thông báo tiếng Việt" , "data"?: T }` — frontend hiện `message` lên toast. |
| Lỗi | HTTP 4xx/5xx + `{ "error": "MA_LOI", "message": "Câu báo lỗi tiếng Việt" }` — frontend hiện `message`. |
| Chưa làm | Trả **404 hoặc 501** — frontend hiện "chức năng đang được kết nối máy chủ" thay vì báo lỗi. |
| Xác thực | Cookie phiên (`credentials: include`). Khi có đăng nhập, trả **401** nếu hết phiên. |
| Ngày giờ | Hiện hiển thị nguyên chuỗi backend trả (`dd/mm/yyyy hh:mm`). Ô chọn ngày gửi lên dạng `yyyy-mm-dd`. |
| Tiền | VND là số nguyên; tiền tệ invoice theo trường `currency`. |

---

## 1. Đơn hàng — `features/orders`, `features/order-import`

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| GET | `/orders` | Có sẵn | Danh sách có lọc, sắp xếp, phân trang |
| GET | `/orders/:bill` | Có sẵn | Chi tiết 1 đơn (khung "Chi tiết đơn hàng" + "Nhân bản đơn"): `Order` + `shipper { company, contact, tel, address, taxId, email }` + `receiver { company, contact, tel, country, city, postal, state, addr1, addr2, addr3, taxId, email }` + `packages [{ qty, packType, length, width, height, weightKg }]` (cân **1 kiện**, từ MaVanDon_PCS_DIM) + `invoice { currency, exportType, shippingFee, goodsValue, items [{ descEn, descVi, qty, unit, price, amount, hs, origin }] }` (từ MaVanDon_ChiTietHang) |
| POST | `/orders/import/preview` | Có sẵn | Kiểm tra file Excel tạo đơn (multipart), chưa tạo đơn — trang "Tạo đơn từ Excel" |
| POST | `/orders/import` | Có sẵn | Kiểm tra lại file và tạo đơn cho các dòng hợp lệ (≤ 100), cấp số vận đơn ngay |
| DELETE | `/orders/:bill` | Có sẵn | Hủy đơn (chỉ đơn "Chưa đi") |
| GET | `/orders/:bill/photos` | **Mới** | Ảnh kiện chụp tại kho |
| GET | `/orders/:bill/events` | **Mới** | Hành trình đơn |
| GET | `/orders/print?bills=A,B&doc=` | Có sẵn | Trang **HTML** in chứng từ cho 1 hoặc nhiều đơn (≤ 100), tự mở hộp thoại in. `doc`: `bill-a4` \| `invoice` \| `cvck` \| `label-a6` (1 nhãn mỗi kiện, khổ 100×150 mm) |
| GET | `/orders/export` | Có sẵn | Bảng kê gửi hàng **.xlsx** (cùng tham số lọc như `GET /orders`, tối đa 10.000 dòng); tên file ở header `Content-Disposition` |

### GET `/orders` — query

`q, searchField (all|cnee|bill|ref|ct), status (all | danh sách wait,fly,nd,ok,late), type (DOC|PACK), fromDate, toDate (yyyy-mm-dd), weightFrom, weightTo, page, pageSize (20|50|100), sortBy (seq|ref|bill|cnee|ct|sent|pod|created), sortDir (asc|desc)`

- `type`: dbo.MaVanDon không có cột loại hàng — DOC là đơn có tên hàng chứa "document", "chứng từ", "hồ sơ" hoặc từ "doc"/"docs"; còn lại là PACK (cùng quy tắc với cột `type` trả về).
- `fromDate`, `toDate`: theo ngày tạo đơn (`CreateDate`), tính cả 2 ngày đầu cuối.
- Tìm `bill` khớp một phần số VA hoặc mã hãng.
- **Thẻ tìm (nhiều giá trị):** `q` gồm nhiều thẻ, **mỗi thẻ 1 dòng** (ngăn bằng ký tự xuống dòng, URL-encode `%0A`), dạng `field:giá trị` với `field` ∈ `all|cnee|bill|ref|ct`. Dòng không có tiền tố hợp lệ dùng `searchField`. Tối đa 200 thẻ.
  - Thẻ **cùng trường** → khớp **bất kỳ** (OR); thẻ **khác trường** → phải khớp **tất cả** (AND).
  - VD người nhận "Uyen" ở Singapore hoặc Mỹ: `q=cnee:Uyen%0Act:Singapore%0Act:United States`.
  - VD dán cả cột bill: `q=bill:6010839%0Abill:6010532`.
- **Nhiều trạng thái:** `status` là `all` hoặc danh sách ngăn dấu phẩy, VD `status=wait,fly` → đơn có trạng thái thuộc danh sách. Áp dụng cho cả `GET /orders/export`.
- Không lọc chi nhánh: dbo.MaVanDon không có cột chi nhánh.
- `summary.statusCounts` đếm trên kết quả đã lọc (trừ lọc trạng thái) — số trên các tab luôn khớp bộ lọc.

Phản hồi (`OrderListResponse`):

```json
{
  "items": [{
    "id": "ord-1", "seq": 8, "bill": "6156979", "ref": "PO-A100", "connect": "1Z9A8X0312",
    "cnee": "LINEX CO. LTD", "ct": "Singapore", "route": "Chuyên tuyến - Singapore", "branch": "TP.HCM",
    "created": "09/09/2026 09:12", "sent": "09/09/2026", "type": "PACK",
    "st": "wait", "pcs": "1 kiện · 8.0 kg", "content": "CONSOL",
    "pod": { "date": "10/09/2026", "time": "14:20", "signer": "LIM" },
    "photos": 2
  }],
  "total": 8, "page": 1, "pageSize": 20, "totalPages": 1,
  "summary": {
    "statusCounts": { "all": 8, "wait": 2, "fly": 2, "nd": 1, "ok": 2, "late": 1 },
    "totalPieces": 16, "totalWeight": 237
  }
}
```

`summary` tính trên **toàn bộ kết quả lọc (trừ lọc trạng thái)** để số trên tab trạng thái đúng. Nên trả thêm `podEstimate` (dd/mm/yyyy); khi chưa có, frontend tự ước tính theo `TRANSIT_DAYS`.

### GET `/orders/:bill/photos`

```json
{ "data": [{ "url": "https://.../6156979-1.jpg", "caption": "Kiện 1/2 · 8kg", "takenAt": "08/09/2026 10:05" }] }
```

### GET `/orders/:bill/events` (mới nhất trước)

```json
{ "data": [{ "time": "09/09/2026 06:40", "title": "Đến kho nước đến", "location": "Singapore" }] }
```

### POST `/orders/import/preview` và `/orders/import` — multipart/form-data

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `file` | có | File **.xlsx** theo mẫu `web/public/templates/Mau_Excel_Tao_Don.xlsx` (sheet `DATA`, dòng 1 tiêu đề, dòng 2 chú thích, dữ liệu từ dòng 3; ≤ 5 MB, ≤ 100 dòng) |
| `service` | không | Dịch vụ áp cho cả file (vd `DHL`). Không gửi → lấy cột `Service` / `HUB` trong file nếu có |
| `hub` | khi có `service` | Vd `DHL - Singapore` |
| `branch` | không | Chi nhánh gửi |

Cột file (không phân biệt hoa thường): `Ref_No, Shipper_att, Shipper_Tel, Shipper_Tax, Shipper_Email, Cnee_country_Code, Cnee_company, Cnee_contact_name, Cnee_Tel, Cnee_Email, Cnee_TaxID, Cnee_Postalcode, Cnee_City, Cnee_State, Add1, Add2, Add3, Type (D|P), Description, Currency, Export_Type, Invoice_Value, Shipping_fee`; nhóm kiện `Qty_Pack_n, Pack_Type_n, L_n, W_n, H_n, GW_n` (GW là tổng cân của dòng kiện); nhóm hàng `Product_en_n, Product_vn_n, Manufacturer_n, Org_Country_n, HS_Code_n, Qty_n, Unit_n, Unit_Price_n` (n ≤ 50).

Kiểm tra: bắt buộc theo sheet HƯỚNG DẪN; mã nước 2 ký tự; bang bắt buộc với US/CA/AU; Add1, Add2 ≤ 30 ký tự; Description ≤ 50; HS code 6/8/10 chữ số; hàng hoá cần ≥ 1 sản phẩm và đủ D×R×C; chứng từ > 2 kg tự chuyển hàng hoá (cảnh báo). Ref_No trùng trong file hoặc đã có đơn → cảnh báo.

Phản hồi:

```json
{ "success": true, "message": "Đã tạo 2 đơn", "data": {
  "total": 3, "valid": 2, "invalid": 1, "created": 2,
  "rows": [{ "line": 3, "ref": "ABC12345", "type": "PACK", "consignee": "ABC LOGISTICS US", "countryCode": "US", "country": "United States",
    "city": "SAN ANGELO", "pieces": 1, "weightKg": 5, "chargeableKg": 7.2, "value": 100, "currency": "USD", "products": 1,
    "errors": [], "warnings": [], "bill": "90000012" }]
} }
```

`bill` chỉ có ở `/orders/import`. Mỗi đơn tạo ra được ghi kèm chi tiết kiện (`dbo.MaVanDon_PCS_DIM`) và dòng hàng (`dbo.MaVanDon_ChiTietHang`). Lỗi cả file (sai định dạng, thiếu cột, quá 100 dòng, chọn dịch vụ mà thiếu hub) → 400 kèm `message`.

---

## 2. Đơn nháp — `features/drafts`, `features/create-order`

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| GET | `/drafts` | Có sẵn | Danh sách đơn nháp & chưa in |
| POST | `/drafts` | Có sẵn | Lưu đơn mới (nút "Tạo đơn hàng" / "Lưu nháp") |
| PUT | `/drafts/:id` | **Mới** | Cập nhật đơn nháp đang sửa (mở từ nút "Sửa") |
| POST | `/drafts/:id/print` | Có sẵn | In & cấp mã bill → đơn khóa, chuyển sang Đơn hàng |
| DELETE | `/drafts/:id` | Có sẵn | Xóa đơn nháp |

Body POST / PUT (`NewDraft`):

```json
{
  "stt": "ready",
  "cnee": "LINEX CO. LTD", "ct": "Singapore", "service": "Chuyên tuyến - Singapore",
  "branch": "TP.HCM", "ref": "PO-A100", "pcs": "1 kiện · 8 kg", "content": "Váy nữ",
  "payload": { "...": "toàn bộ form CreateOrderValues — xem web/src/features/create-order/schema.ts" }
}
```

`stt`: `draft` = đang làm dở · `ready` = đã khai đủ, chờ in. **Backend phải lưu nguyên `payload`** (cột JSON / NVARCHAR(MAX)) để mở lại đơn sửa tiếp.

`payload.receiver` có thêm `countryCode` (ISO-2), `iossNo`, `eoriNo` (chuỗi, không bắt buộc).
Hai mã chỉ hiển thị / kiểm tra khi nước đến thuộc EU; nguồn danh sách 27 nước dùng chung FE/BE:
`web/src/shared/config/eu-countries.json` (không gồm GB, NO, CH).
IOSS: `^IM\d{10}$`; EORI: `^[A-Z]{2}[A-Z0-9]{1,15}$`. Giá trị trống hợp lệ; sai định dạng ở EU trả 400.
Đổi sang nước ngoài EU: frontend xóa giá trị và lỗi; backend cũng xóa hai mã khỏi payload nháp khi lưu.
Khi cấp bill, hai mã được lưu vào `dbo.MaVanDon.ConsigneeIossNo` / `ConsigneeEoriNo`
(migration `AddReceiverEuTaxNumbers`, hai cột nullable). `GET /orders/:bill` trả hai mã trong `receiver`, cùng `countryCode` cho nước EU.
`POST /drafts/:id/print` trả `{ "message": "...", "billCode": "6156980" }`. Ngay sau đó frontend mở `GET /orders/print?bills=<billCode>&doc=bill-a4` để in vận đơn khổ A4 — vì vậy `billCode` là **bắt buộc**, và bill vừa cấp phải in được ngay.

---

## 3. Danh mục, sổ địa chỉ — dùng trong Tạo đơn

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| GET | `/catalog/categories` | Có sẵn | Nhóm hàng (bảng `dbo.NhomHangHoa`): nhóm yêu thích (của khách hoặc nhóm chung khách đã đánh dấu) trước, rồi nhóm của khách, rồi nhóm chung Việt An — `Category[]` |
| POST | `/catalog/categories` | Có sẵn | Khách thêm nhóm: body `{ name, isFavorite }` → `{ data: Category, message }`. Tên trống **400**, trùng (không phân biệt hoa thường, kể cả nhóm chung) **409** |
| PUT | `/catalog/categories/:id` | Có sẵn | Đổi tên / yêu thích nhóm của khách, body như POST. Nhóm chung hoặc của khách khác **404** |
| DELETE | `/catalog/categories/:id` | Có sẵn | Xóa nhóm của khách (đơn đã khai nhóm này giữ nguyên) |
| PUT | `/catalog/categories/:id/favorite` | **Mới** | Đánh dấu / bỏ yêu thích, body `{ isFavorite }` → `{ message }`. Được cả nhóm chung (lưu riêng cho khách trong `dbo.MatHangKhachHang`, Loai = `NHOM`); nhóm của khách cập nhật `NhomHangHoa.Yeu_Thich`. Không thấy nhóm **404** |
`Category`: `{ id, name, isFavorite, isOwn, suggestions: [{ en, vi, hs }] }` — `isOwn = false` là nhóm chung Việt An (`CustomerID` NULL), chỉ đọc.

| GET | `/catalog/addon-fees` | **Mới** | Biểu phí tùy chọn dịch vụ: `AddonFee[]` = `{ name, fee: number \| null, currency, unit, note? }`. `name` khớp tên tùy chọn trên form (vd "Đóng gói hộ"); `currency` = `"%"` khi tính theo % (`unit` vd "giá trị hàng"); `fee` null = chưa có giá. Chưa có endpoint (404/501) → form hiện "Đang cập nhật" |
| GET | `/catalog/products` | Có sẵn | Thư viện mặt hàng của khách: `SavedProduct[]` — lấy từ các dòng hàng đã khai trong `dbo.MaVanDon_ChiTietHang` (đơn của khách), mỗi mặt hàng 1 dòng, đơn giá lần gần nhất. Mặt hàng yêu thích đứng đầu, mặt hàng khách đã xóa không trả về. `SavedProduct.id` = khóa mặt hàng (SHA-256 hex 64 ký tự của tên EN/VN, HS, xuất xứ, đơn vị, nhà sản xuất — không phân biệt hoa thường); `isFavorite` |
| PUT | `/catalog/products/:id/favorite` | **Mới** | Đánh dấu / bỏ yêu thích mặt hàng, body `{ isFavorite }` → `{ message }` (bảng `dbo.MatHangKhachHang`, Loai = `SP`). Khóa sai định dạng **400** |
| DELETE | `/catalog/products/:id` | **Mới** | Xóa mặt hàng khỏi thư viện — chỉ ẩn (`Da_Xoa = 1`), dòng hàng trong đơn cũ giữ nguyên. |
| POST | `/catalog/products` | Không làm | Mặt hàng tự vào thư viện khi đơn được cấp bill (ghi `MaVanDon_ChiTietHang`) — bảng không có cột khách nên không lưu riêng được |
| GET | `/invoices/recent?limit=20` | Có sẵn | Invoice đơn gần đây (≤ 50, từ `MaVanDon_ChiTietHang`) để chép lại: `{ bill, cnee, date, currency, items: SavedProduct[] }[]` |
| GET | `/geo/countries` | Có sẵn | Quốc gia + mã điện thoại: `[{ code: "US", name: "United States", dialCode: "+1" }]` (backend lấy từ world-countries, cache 1 ngày) |
| GET | `/geo/postal/:countryCode/:postalCode` | Có sẵn | Mã bưu chính → `{ countryCode, postalCode, city, state, stateCode }` (backend tra GeoNames postalCodeLookupJSON, ~100 nước, nhận cả mã đầy đủ như `SW1A 1AA`; tài khoản GeoNames chỉ ở cấu hình backend `GeoNames:Username`); không tìm thấy / chưa hỗ trợ / nguồn tạm lỗi → 404 |
| GET | `/addresses/senders` | Có sẵn | Hồ sơ người gửi: `{ id, n (tên), c (liên hệ), t (điện thoại), d (địa chỉ) }` |
| GET | `/addresses/receivers` | Có sẵn | Sổ địa chỉ người nhận: `{ id, n, ct, city, postal, contact, tel, a1, a2, a3 }` |
| POST | `/addresses/receivers` | Có sẵn | Lưu người nhận vào sổ |
| DELETE | `/addresses/receivers/:id` | Có sẵn | Xóa người nhận |

`SavedProduct`: `{ id?, descEn, descVi, manufacturer, origin, hs, unit, price }` (tất cả chuỗi).

Nên làm thêm (hiện khai tĩnh ở `shared/config/domain.ts`): `GET /services/hubs` (hãng → danh sách hub), `GET /addresses/countries`, `GET /branches`, `GET /services/limits` (giới hạn kích thước theo hãng — hiện ở `create-order/lib/carrier-limits.ts`).

---

## 4. Giá & gợi ý dịch vụ — `features/pricing`

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| POST | `/rates` | Có sẵn | So sánh giá. Cũng được gọi khi bấm "Tạo đơn" để kiểm tra phụ phí |
| GET | `/services` | Có sẵn | Danh sách dịch vụ & bảng giá |
| POST | `/services` | Có sẵn | Tạo mới / cập nhật (theo `id`) bảng giá |
| DELETE | `/services/:id` | Có sẵn | Xóa dịch vụ |

`POST /rates` body: `{ country, weight, length?, width?, height?, type: "DOC"|"PACK" }` → `{ "rates": ServiceQuote[] }`
`ServiceQuote`: `{ name, zone, chargeableWeight, volumetricWeight, baseFare, fscFee, surcharges, hasSurcharge, vatFee, totalFare, eta }`.

`ShippingService`: `{ id, name, account, fsc (0.28 = 28%), vat, eta, effFrom, effTo (yyyy-mm-dd), zones: string[], zmap: { [country]: zoneNo }, dz, price: { [zoneNo]: number[140] }, over70: { [zoneNo]: number }, sur: SurchargeRule[] }`.
`price[zone]` là 140 mốc 0.5kg → 70kg. `SurchargeRule`: `{ wFrom, wTo, dFrom, dTo, gFrom, gTo, fee }` — ô rỗng `""` = không giới hạn.
Gợi ý bảng SQL: `Services`, `ServiceZones`, `ServiceCountryZones`, `ServicePrices (serviceId, zoneNo, stepIndex, price)`, `ServiceSurcharges`.

---

## 5. E-commerce — `features/ecommerce`

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| GET | `/ecom/orders?src=&q=` | Có sẵn | Đơn E-commerce (`dbo.DonTMDT`), lọc theo nguồn & từ khóa (mã đơn, người nhận, bill); mới nhất trước, tối đa 500 |
| POST | `/ecom/manual` | Có sẵn | Lưu 1 đơn nhập tay vào `dbo.DonTMDT` (body `NewManualEcomOrder` dưới; `source` ∈ manual, shopify, tiktok, shopee, lazada, amazon, ebay, etsy, woocommerce) → `{ data: EcomOrder, message }`. Chưa cấp bill — bill tạo ở bước sau. Trùng mã đơn cùng nguồn → 409 |
| POST | `/ecom/import-csv` | Có sẵn (file Shopify) | `{ "csv": "<nội dung file>" }` → `{ message, importedCount, errors: [{ row, message }] }`. Hiện nhận file **Export orders** của Shopify (79 cột, gộp dòng theo `Name`, bỏ đơn đã giao / hủy, chống trùng theo `Id` = mã đơn API, chuẩn hóa mã bưu chính / SĐT / tên nước). Mẫu 70 cột của Việt An → 400 "đang hoàn thiện" |
| PUT | `/ecom/orders/:id` | Có sẵn | Sửa đơn chưa có bill: `{ receiver: { name, company, phone, email, address1, address2, city, state, postal, countryCode }, kg, products: [{ name, sku, qty, fobPrice, sellingPrice, hsCode }], service, hub, branch, note }` → `{ data: EcomOrder, message }`. Đã sửa thì đồng bộ / nhập lại từ sàn không ghi đè. Đã có bill → 422 |
| POST | `/ecom/webhook/:platform` | Có sẵn | Sàn đẩy đơn vào (không do frontend gọi) |
| POST | `/ecom/labels` | **Mới** | In nhãn hàng loạt `{ ids: string[], format: "A6"\|"A4"\|"ZPL" }` → `{ message, url? }` (url = file PDF/ZPL) |
| GET | `/ecom/settings` | **Mới** | `EcomSettings` |
| PUT | `/ecom/settings` | **Mới** | Cập nhật một phần `EcomSettings` → trả bản đầy đủ |
| POST | `/ecom/settings/api-keys/regenerate` | **Mới** | `{ env: "production"\|"sandbox" }` → `EcomSettings` |
| POST | `/ecom/settings/webhook/test` | **Mới** | Gửi sự kiện thử tới URL webhook |

`NewManualEcomOrder`: `{ ref, source, branch, cnee, ct, countryCode?, postal, city, state, address, service, hub, kg, products: [{ name, sku, qty, fobPrice, sellingPrice, hsCode }], customs: { declaredValue, goodsType, receiverId, ioss, eori, vat, salesLink, paymentRef, manufacturer } }`.
`ct` là tên nước tiếng Anh lấy từ `GET /geo/countries`, `countryCode` là mã ISO 2 ký tự (trống khi danh sách nước tạm lỗi). Form tự điền `city`, `state` từ `GET /geo/postal` (GeoNames); khách vẫn sửa được.
`EcomOrder` (GET /ecom/orders, POST /ecom/manual): `{ id, src, ref, bill, cnee, ct, items, kg, st, note?, products?: [{ name, sku, qty, fobPrice, sellingPrice, hsCode? }], createdAt: "dd/MM/yyyy HH:mm", value?, currency?, receiver?: { name, company, phone, email, address1, address2, city, state, postal, countryCode, country }, service?, hub?, branch?, issues: string[] (việc cần bổ sung trước khi tạo bill: thiếu cân nặng, địa chỉ chưa Latin, thiếu mã HS…), editable }`.
`EcomSettings`: `{ apiKeys: [{ env, key }], webhookUrl, webhookEvents: ("created"|"picked_up"|"departed"|"delivered"|"exception")[] }`. Trên giao diện, phần API key / webhook nằm trong mục thu gọn "Dành cho lập trình viên" ở tab Kết nối.

### 5.1 Kết nối sàn qua OAuth (Shopify, TikTok Shop) — tab `?tab=connect`

Nghiên cứu chi tiết hai sàn và thiết kế backend: `docs/ECOM_INTEGRATION.md`.

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| GET | `/ecom/stores` | Có sẵn | `{ data: StoreConnection[] }` của khách đang đăng nhập |
| POST | `/ecom/stores/connect` | Có sẵn (Shopify; TikTok trả 422 "chưa hỗ trợ") | `{ platform: "shopify"\|"tiktok", shopDomain?, region?: "global"\|"us" }` → `{ authorizeUrl }`. Backend tạo `state` ngẫu nhiên gắn với khách (hết hạn 10 phút); frontend chuyển trình duyệt sang `authorizeUrl` |
| GET | `/ecom/oauth/shopify/callback` | Có sẵn | Shopify redirect về (không do frontend gọi): kiểm `state`, `hmac`, `shop`; đổi `code` lấy token; đăng ký webhook; rồi **302** về `/ecommerce?tab=connect&connected=shopify` hoặc `&error=<thông báo>` |
| GET | `/ecom/oauth/tiktok/callback` | **Mới** | TikTok Shop redirect về với `code`, `state`: đổi token, lấy `shop_cipher`, rồi 302 như trên |
| POST | `/ecom/stores/:id/sync` | Có sẵn (Shopify) | Kéo đơn đang mở, chưa giao (tối đa 250) vào `dbo.DonTMDT` → `{ message, importedCount }`; token hết hạn tự làm mới, không làm mới được → 422 + trạng thái `expired` |
| DELETE | `/ecom/stores/:id` | Có sẵn | Hủy webhook trên sàn, xóa token → `{ message }` |
| POST | `/ecom/webhook/shopify` | **Mới** | Shopify đẩy sự kiện (`orders/create`, `orders/cancelled`, `app/uninstalled` + 3 webhook GDPR bắt buộc). Kiểm `X-Shopify-Hmac-Sha256` trên body thô, trả 200 trong < 5 giây, xử lý nền, chống trùng theo `X-Shopify-Webhook-Id` |
| POST | `/ecom/webhook/tiktok` | **Mới** | TikTok Shop đẩy sự kiện (đổi trạng thái đơn, hủy, thu hồi ủy quyền). Kiểm chữ ký header `Authorization` |

`StoreConnection`: `{ id, platform: "shopify"|"tiktok", shopName, shopDomain?, region?, status: "active"|"expired"|"error"|"revoked", connectedAt, lastSyncAt?, lastError? }`.
Token sàn (access/refresh) **chỉ lưu ở backend** (mã hóa), không bao giờ trả về frontend.
`state` OAuth tự chứa và ký HMAC (mã khách, shop, domain portal, hạn 10 phút), kèm cookie nonce `vae_ecom_oauth` (SameSite=Lax, path `/api/v1/ecom/oauth`) — cookie đăng nhập là SameSite=Strict nên không đi kèm callback từ sàn. URL callback ghép từ domain portal khách đang dùng (X-Forwarded-Host của proxy Vercel, chỉ nhận domain trong `Company:PortalUrl` / `Cors:AllowedOrigins`); mỗi domain phải khai trong Allowed redirection URL(s) của app Shopify.
Đơn nhận từ sàn xuất hiện trong `GET /ecom/orders` với `src` = `shopify` / `tiktok`; kết nối luôn **tự nhận đơn mới** và **tự đẩy mã tracking** lên sàn khi đơn được in & cấp bill (không có tùy chọn bật/tắt — muốn dừng thì ngắt kết nối).

---

## 6. Sự cố, Pickup, Thông báo

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| GET | `/troubles` | Có sẵn | `TroubleTicket[]` |
| POST | `/troubles` | Có sẵn | `{ bill, cnee?, ct?, type, lv: "low"\|"mid"\|"high", desc, req, contact }` |
| POST | `/troubles/:id/reply` | Có sẵn | `{ reply, status? }` — khách bổ sung thông tin / nhắc CS / đóng ticket (`status: "done"`) |
| GET | `/pickups` | Có sẵn | `PickupBooking[]` |
| POST | `/pickups` | Có sẵn | `{ date (yyyy-mm-dd), slot, branch, address, contact, phone, pcs, weightKg?, note? }` — backend hiện chưa lưu `weightKg`, `note` |
| GET | `/notifications` | Có sẵn | `{ data: Notification[], unreadCount }` — `imp: true` hiện popup khi mở portal |
| POST | `/notifications/:id/read` | Có sẵn | Đánh dấu đã đọc |
| POST | `/notifications/mark-all-read` | Có sẵn | Đánh dấu tất cả |

`TroubleTicket`: `{ id, bill, cnee, ct, type, lv, desc, req, contact, date, status: "new"|"doing"|"waitc"|"done", reply? }`. Nên chuyển `reply` thành danh sách tin nhắn `messages: [{ from: "customer"|"cs", text, at }]` — frontend sẽ đổi sang hiển thị hội thoại.

---

## 7. Tài khoản & hỗ trợ

MyTracking cá nhân (`/account/mytracking`) hiện là trang cấu hình / xem trước: tiêu đề, mô tả,
tối đa 5 ảnh quảng cáo có link đích, tiêu đề ảnh (120 ký tự) và chữ nút (40 ký tự) tùy chọn,
cùng 1 hình nền. Cấu hình lưu localStorage riêng theo
`customerCode` với key `mytracking-draft:{customerCode}`; chưa lưu trên server hay xuất bản link riêng.
Preview hiển thị vùng chờ kết quả tra cứu, không gọi API tracking. Có logo, thông tin thương hiệu và các
link mạng xã hội, chuyển Desktop / Mobile và cập nhật trực tiếp từ form. Ảnh JPG/JPEG/PNG/WebP
tối đa 200 KB được nén bằng canvas xuống tối đa 200 KB trước khi lưu base64. Khi localStorage
bị chặn hoặc đầy, cấu hình vẫn giữ trong bộ nhớ phiên và hiển thị cảnh báo.
Ảnh từ URL được kiểm tra tải/giải mã trước khi thêm (timeout 15 giây), giữ link gốc;
không tải về lưu hoặc nén. Giới hạn 200 KB sau nén áp dụng cho ảnh tải từ máy.
`ConfigRepository` tách lưu trữ khỏi component; hiện dùng `LocalStorageConfigRepository`.
`ApiConfigRepository` chỉ là adapter nhận transport từ bên ngoài, chưa được kết nối API.
Phân quyền khách admin / khách user sẽ được bổ sung sau.

Form chia khối theo mẫu HTML: thương hiệu, nội dung chính, quảng cáo, nền trang và liên hệ.
Ảnh có thể đổi thứ tự bằng kéo thả hoặc nút lên/xuống. Tiêu đề và chữ nút hiển thị bên dưới ảnh;
nút hiện khi có chữ trên nút, nhưng bị vô hiệu hóa nếu chưa có link website hợp lệ.
Ô “Link website của ảnh” lưu vào `images[].linkUrl`; ảnh và nút cùng mở link này trong tab mới.
Để trống chữ trên nút thì ẩn nút, ảnh vẫn mở link nếu có. Zalo/WhatsApp nhận URL http(s) hoặc số điện thoại,
chuyển thành link zalo.me/wa.me; số bắt đầu bằng 0 được hiểu là số Việt Nam (+84).
Liên hệ để trống thì không hiện nút trong preview. Cấu hình ảnh cũ không có tiêu đề/chữ nút vẫn đọc được.

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| POST | `/auth/change-password` | **Mới** | `{ currentPassword, newPassword }` — sai mật khẩu hiện tại trả 400 + `message`. Quy tắc: ≥ 8 ký tự, có chữ và số. Ghi vào `dbo.TCustomer.Login_Password` (dạng như hệ thống cũ); các thiết bị khác phải đăng nhập lại |
| POST | `/support/feedback` | **Mới** | `multipart/form-data`: `category, subject, message, contact, attachment?` (≤ 10MB) |
| POST | `/auth/login` | **Mới** | `{ username, password, remember }` — `username` là tên đăng nhập của khách (`dbo.TCustomer.Login_UserName`), mật khẩu so với `Login_Password`. Đúng: đặt cookie phiên (httpOnly; `remember: false` → cookie hết khi đóng trình duyệt) và trả `{ data: SessionUser }`. Sai: 401 + `message` |
| POST | `/auth/refresh` | Có sẵn | Đổi refresh token (cookie) lấy phiên mới — frontend tự gọi 1 lần khi gặp 401 |
| POST | `/auth/logout` | **Mới** | Xóa cookie phiên |
| GET | `/me` | **Mới** | `{ data: SessionUser }` (`customerCode, companyName, contactName, email, phone, address, taxCode` từ `dbo.TCustomer` — form Tạo đơn điền sẵn các ô người gửi còn trống, khách vẫn sửa được) — chưa đăng nhập / hết phiên trả **401**. Trang ngoài (`/`, `/login`) và lớp chặn portal dựa vào endpoint này |

`SessionUser`: `{ customerCode, companyName, contactName?, email?, phone?, address?, taxCode?, avatarUrl?, defaultBranch? }`.

Người gửi trong payload đơn (`shipper`) có thêm `originalShipper` — tên shipper gốc khi khách là đơn vị forwarder gửi hộ, ghi vào `dbo.MaVanDon.Ten_Khach_Cua_FWD` khi in & cấp bill (tối đa 150 ký tự, không bắt buộc).

Khi `/me` trả 404/501 (backend chưa bật đăng nhập), frontend cho vào portal ở chế độ thử. Khi bật đăng nhập, mọi endpoint của portal nên trả 401 nếu không có phiên hợp lệ.

**Khớp với backend .NET (JWT):** backend phát JWT (`ICurrentUser` đọc claim `sub`, `customer_id`, `permission`…). Frontend **không** lưu token trong JavaScript — hãy đặt JWT vào cookie `httpOnly; Secure; SameSite=Lax; Path=/api` khi `POST /auth/login`, và cấu hình `JwtBearer` đọc token từ cookie trong `Events.OnMessageReceived` (vẫn nhận header `Authorization: Bearer` cho API Tracking / tích hợp ngoài). `remember: true` → cookie có `Expires` (VD 30 ngày); `false` → cookie phiên. `POST /auth/logout` xóa cookie. Nếu dùng refresh token thì cũng để trong cookie httpOnly riêng.

---

## 8. Trang ngoài (công khai, không cần đăng nhập) — `features/landing`

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| POST | `/public/tracking` | **Mới** | Tra cứu vận đơn trên trang chủ. Body `{ "bills": string[] }` (1–10 mã, đã viết hoa, bỏ trùng). Trả `{ data: TrackResult[] }` đúng thứ tự `bills` |
| POST | `/public/contact` | **Mới** | Form "Gửi lời nhắn". Body `{ name, phone, email, message }` (`email` có thể rỗng). Trả `{ success, message }` — frontend hiện `message` lên toast |

`TrackResult` (xem `features/landing/types.ts`):

```json
{ "bill": "6156979", "found": true, "status": "fly", "service": "Chuyển phát nhanh", "destination": "Úc",
  "events": [{ "time": "29/09/2026 14:20", "title": "Đã bay", "location": "SGN" }] }
{ "bill": "VA999999", "found": false }
```

- `status` dùng chung mã với đơn hàng: `wait | fly | nd | ok | late`. `events` mới nhất trước.
- Tìm theo **mã bill Việt An hoặc mã hãng** (tracking DHL/FedEx/UPS/TNT). Chỉ trả thông tin hành trình — **không** trả tên/địa chỉ/điện thoại người gửi, người nhận, giá cước.
- Hai endpoint này mở công khai nên cần **giới hạn tần suất** theo IP (VD 30 lần/phút cho tracking, 5 lần/giờ cho contact) → trả **429** + `message` tiếng Việt. Validate lại phía server (tên ≤ 100, nội dung 10–2000 ký tự, số điện thoại 9–15 ký tự số).
- `/public/contact` lưu lại để nhân viên kinh doanh xử lý (và/hoặc gửi email thông báo nội bộ).

---

## Checklist cho backend SQL Server

1. Làm đủ các endpoint **Có sẵn** với đúng dạng dữ liệu trên (backend cũ chạy bằng dữ liệu in-memory — bản dự phòng giữ ngoài repo).
2. Làm các endpoint **Mới** — frontend đã gọi sẵn, chỉ cần trả đúng dạng.
3. Lưu `payload` của đơn nháp nguyên vẹn (JSON).
4. Trả lỗi có `message` tiếng Việt; endpoint chưa xong trả 404/501.
5. Chạy `npm run dev` trong `web/` (proxy `/api` → `http://localhost:3000`) để thử toàn bộ giao diện.
