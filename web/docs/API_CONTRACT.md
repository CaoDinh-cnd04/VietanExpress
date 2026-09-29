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
| GET | `/orders/:bill` | Có sẵn | Chi tiết 1 đơn (dùng cho "Nhân bản đơn"): `Order` + `shipper { company, contact, tel, address, taxId, email }` + `receiver { company, contact, tel, country, city, postal, state, addr1, addr2, addr3, taxId, email }` |
| POST | `/orders/batch` | Có sẵn | Tạo nhiều đơn (≤ 100) — trang "Tạo đơn từ Excel" |
| DELETE | `/orders/:bill` | Có sẵn | Hủy đơn (chỉ đơn "Chưa đi") |
| GET | `/orders/:bill/photos` | **Mới** | Ảnh kiện chụp tại kho |
| GET | `/orders/:bill/events` | **Mới** | Hành trình đơn |
| GET | `/orders/print?bills=A,B&doc=` | Có sẵn | Trang **HTML** in chứng từ cho 1 hoặc nhiều đơn (≤ 100), tự mở hộp thoại in. `doc`: `bill-a4` \| `invoice` \| `cvck` \| `label-a6` (1 nhãn mỗi kiện, khổ 100×150 mm) |
| GET | `/orders/export` | Có sẵn | Bảng kê gửi hàng **.xlsx** (cùng tham số lọc như `GET /orders`, tối đa 10.000 dòng); tên file ở header `Content-Disposition` |

### GET `/orders` — query

`q, searchField (all|cnee|bill|ref|ct), status (all|wait|fly|nd|ok|late), branch, type (DOC|PACK), fromDate, toDate (yyyy-mm-dd), weightFrom, weightTo, page, pageSize (20|50|100), sortBy (seq|ref|bill|cnee|ct|sent|pod|created), sortDir (asc|desc)`

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

### POST `/orders/batch` — body

```json
{ "orders": [{
  "ref": "PO-1001", "route": "Chuyên tuyến - Singapore", "service": "Chuyên tuyến", "hub": "Chuyên tuyến - Singapore",
  "branch": "TP.HCM", "cnee": "LINEX CO. LTD", "ct": "Singapore",
  "receiver": { "company": "", "contact": "", "tel": "", "country": "", "city": "", "postal": "", "addr1": "", "addr2": "" },
  "pcs": "1 kiện · 2.5 kg", "content": "Women dress", "declaredValue": 40
}]}
```

Phản hồi: `{ "success": true, "message": "Đã tạo 12 đơn", "data": Order[] }`.

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
`POST /drafts/:id/print` trả `{ "message": "...", "billCode": "6156980" }`.

---

## 3. Danh mục, sổ địa chỉ — dùng trong Tạo đơn

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| GET | `/catalog/categories` | Có sẵn | 44 nhóm hàng + gợi ý mô tả / HS: `{ name, isFavorite, suggestions: [{ en, vi, hs }] }` |
| POST | `/catalog/categories/:name/favorite` | Có sẵn | Ghim / bỏ ghim nhóm thường dùng |
| GET | `/catalog/products` | **Mới** | Thư viện mặt hàng của khách: `SavedProduct[]` |
| POST | `/catalog/products` | **Mới** | Lưu mặt hàng vào thư viện |
| GET | `/invoices/recent?limit=20` | **Mới** | Invoice đơn gần đây để chép lại: `{ bill, cnee, date, currency, items: SavedProduct[] }[]` |
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

## 5. Kênh bán hàng — `features/ecommerce`

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| GET | `/ecom/orders?src=&q=` | Có sẵn | Đơn e-com, lọc theo nguồn & từ khóa |
| POST | `/ecom/manual` | Có sẵn | Đánh bill lẻ (body `NewManualEcomOrder` dưới) |
| POST | `/ecom/import-csv` | Có sẵn | `{ "csv": "<nội dung file mẫu 70 cột>" }` → `{ message, importedCount, errors: [{ row, message }] }` |
| POST | `/ecom/webhook/:platform` | Có sẵn | Sàn đẩy đơn vào (không do frontend gọi) |
| POST | `/ecom/labels` | **Mới** | In nhãn hàng loạt `{ ids: string[], format: "A6"\|"A4"\|"ZPL" }` → `{ message, url? }` (url = file PDF/ZPL) |
| GET | `/ecom/settings` | **Mới** | `EcomSettings` |
| PUT | `/ecom/settings` | **Mới** | Cập nhật một phần `EcomSettings` → trả bản đầy đủ |
| POST | `/ecom/settings/api-keys/regenerate` | **Mới** | `{ env: "production"\|"sandbox" }` → `EcomSettings` |
| POST | `/ecom/settings/webhook/test` | **Mới** | Gửi sự kiện thử tới URL webhook |

`NewManualEcomOrder`: `{ ref, source, branch, cnee, ct, address, service, hub, kg, products: [{ name, sku, qty, fobPrice, sellingPrice, hsCode }], customs: { declaredValue, goodsType, receiverId, ioss, eori, vat, salesLink, paymentRef, manufacturer } }`.
`EcomSettings`: `{ apiKeys: [{ env, key }], webhookUrl, webhookEvents: ("created"|"picked_up"|"departed"|"delivered"|"exception")[], connectedSources: ("tiktok"|"shopify"|"shopee"|"lazada")[] }`.

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

| Method | Path | Trạng thái | Mô tả |
|---|---|---|---|
| POST | `/auth/change-password` | **Mới** | `{ currentPassword, newPassword }` — sai mật khẩu hiện tại trả 400 + `message`. Quy tắc: ≥ 8 ký tự, có chữ và số |
| POST | `/support/feedback` | **Mới** | `multipart/form-data`: `category, subject, message, contact, attachment?` (≤ 10MB) |
| POST | `/auth/login` | **Mới** | `{ username, password, remember }` — `username` là mã khách hàng hoặc email. Đúng: đặt cookie phiên (httpOnly; `remember: false` → cookie hết khi đóng trình duyệt) và trả `{ data: SessionUser }`. Sai: 401 + `message` |
| POST | `/auth/logout` | **Mới** | Xóa cookie phiên |
| GET | `/me` | **Mới** | `{ data: SessionUser }` — chưa đăng nhập / hết phiên trả **401**. Trang ngoài (`/`, `/login`) và lớp chặn portal dựa vào endpoint này |

`SessionUser`: `{ customerCode, companyName, contactName?, email?, avatarUrl?, defaultBranch? }`.

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
