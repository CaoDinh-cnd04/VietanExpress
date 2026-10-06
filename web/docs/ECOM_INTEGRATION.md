# Kết nối sàn E-commerce: Shopify & TikTok Shop

> Tìm hiểu tháng 10/2026, dùng làm cơ sở cho backend `/ecom/stores/*` (hợp đồng API: `API_CONTRACT.md` §5.1).
> Các mốc phiên bản / chính sách của sàn thay đổi theo quý, kiểm lại tài liệu gốc trước khi code.

## 1. Luồng chung

```
Khách bấm "Kết nối"  →  POST /ecom/stores/connect  →  backend tạo state, trả authorizeUrl
        →  trình duyệt sang trang ủy quyền của sàn  →  chủ shop đồng ý
        →  sàn redirect về  GET /ecom/oauth/{platform}/callback?code&state…
        →  backend kiểm state, đổi code lấy token, lưu token (mã hóa), đăng ký webhook
        →  302 về /ecommerce?tab=connect&connected={platform}

Đơn mới   : sàn → POST /ecom/webhook/{platform} → hàng đợi → gọi API sàn lấy đơn đầy đủ → đơn E-commerce (src = platform)
Dự phòng  : job định kỳ (VD 15 phút) kéo đơn từ lastSyncAt, bù webhook bị lỡ
Cấp bill  : khi in & cấp bill (hoặc trạng thái "departed") → luôn đẩy tracking lên sàn
Thu hồi   : app/uninstalled (Shopify) hoặc sự kiện hủy ủy quyền (TikTok) → status = "revoked"
```

Nguyên tắc: phản hồi webhook nhanh (200 ngay, xử lý nền), chống trùng theo id sự kiện, mọi lần gọi sàn đều idempotent theo mã đơn sàn (`ref`), token chỉ ở backend.

## 2. Shopify

| Mục | Ghi chú |
|---|---|
| Đăng ký | Tạo app trong **Shopify Dev Dashboard** (Partners). Phân phối: *public* (App Store, cần duyệt) hoặc *custom distribution* cho từng shop/Plus org — khởi đầu nên dùng custom distribution |
| Ủy quyền | Authorization code grant: chuyển tới `https://{shop}.myshopify.com/admin/oauth/authorize?client_id&scope&redirect_uri&state`. Callback trả `code, hmac, shop, state, timestamp` — kiểm `hmac` (HMAC-SHA256 bằng client secret), `state`, và `shop` đúng dạng `*.myshopify.com` |
| Token | `POST https://{shop}/admin/oauth/access_token` với `client_id, client_secret, code`, thêm **`expiring=1`** để nhận token có hạn + `refresh_token` (90 ngày). Từ 01/04/2026 app public mới bắt buộc token hết hạn; từ 01/01/2027 mọi app public đều bắt buộc. Mỗi lần refresh nhận cặp token mới — lưu cả hai, bỏ cặp cũ |
| API | **GraphQL Admin API** (REST là legacy, app public mới phải dùng GraphQL). Ghim phiên bản quý, VD `2026-07`; nâng cấp ít nhất mỗi năm |
| Scope tối thiểu | `read_orders`, `read_merchant_managed_fulfillment_orders`, `write_merchant_managed_fulfillment_orders` (thêm `read_products` nếu cần cân nặng / HS từ sản phẩm). Đơn > 60 ngày cần `read_all_orders` (phải xin) |
| Dữ liệu khách | Tên, địa chỉ, SĐT người nhận là **protected customer data** — app phải khai báo và được duyệt quyền truy cập (level 2) |
| Lấy đơn | Query `orders` lọc `fulfillment_status:unfulfilled`, lấy `shippingAddress`, `lineItems` (sku, qty, giá, `variant.inventoryItem.harmonizedSystemCode`, `countryCodeOfOrigin`, cân nặng) |
| Đẩy tracking | Lấy `fulfillmentOrders` của đơn → mutation **`fulfillmentCreate`** với `trackingInfo { company, number, url }` (`url` = trang tracking Việt An / MyTracking), `notifyCustomer: true`. Sửa sau bằng `fulfillmentTrackingInfoUpdate` |
| Webhook | Đăng ký bằng `webhookSubscriptionCreate` hoặc khai trong cấu hình app: `orders/create`, `orders/updated`, `orders/cancelled`, `app/uninstalled`. **Bắt buộc** cho app public: `customers/data_request`, `customers/redact`, `shop/redact` |
| Xác thực webhook | Header `X-Shopify-Hmac-Sha256` = base64(HMAC-SHA256(body thô, client secret)); dùng thêm `X-Shopify-Topic`, `X-Shopify-Shop-Domain`, `X-Shopify-Webhook-Id` (chống trùng). Trả 200 trong 5 giây |
| Giới hạn | GraphQL tính theo **điểm chi phí** (leaky bucket) — đọc `extensions.cost.throttleStatus`, lùi lại khi gần hết |

### Cấu hình Shopify của Việt An (đã làm)

| Khóa cấu hình | Ở đâu |
|---|---|
| `Shopify:ClientId`, `Shopify:ClientSecret` | User Secrets của `VietAnExpress.API` (dev); Render: `Shopify__ClientId`, `Shopify__ClientSecret` |
| `Ecommerce:TokenEncryptionKey` | Khóa AES-256 base64 mã hóa token trong `dbo.KetNoiTMDT`; Render: `Ecommerce__TokenEncryptionKey` (dùng **cùng khóa** ở mọi môi trường đọc chung database) |
| `Shopify:ApiVersion` (`2026-07`), `Shopify:Scopes`, `Shopify:CallbackPath` | `appsettings.json` |

Trong Shopify Dev Dashboard → app → **Allowed redirection URL(s)** khai `{Company:PortalUrl}{CallbackPath}`, hiện là
`https://viet-an-express.vercel.app/api/v1/ecom/oauth/shopify/callback` (Vercel proxy `/api` sang Render).

### Webhook Shopify (đã làm)

1 URL nhận mọi chủ đề: **`POST {Company:PortalUrl}/api/v1/ecom/webhooks/shopify`**
(hiện `https://viet-an-express.vercel.app/api/v1/ecom/webhooks/shopify`). Khai trong cấu hình app — mẫu: `shopify.app.toml.example`
(Shopify CLI `shopify app deploy`, hoặc Dev Dashboard → Versions → Webhooks / Compliance webhooks).

| Chủ đề | Backend làm gì |
|---|---|
| `orders/create`, `orders/updated` | Xếp hàng, đồng bộ nền đơn mở của shop sau ~3 giây (gom webhook dồn dập). Webhook lỡ thì nút "Đồng bộ" vẫn kéo đủ |
| `app/uninstalled` | Kết nối → `revoked`, xóa token; vẫn hiện trong danh sách để khách ủy quyền lại |
| `customers/data_request` | Ghi log cảnh báo (shop, id người mua, mã đơn, số đơn đang lưu) — **Việt An gửi dữ liệu cho chủ shop trong 30 ngày** |
| `customers/redact` | Xóa người nhận, ghi chú, khai báo hải quan của các đơn trong `orders_to_redact` (cả đơn nhập từ file export của shop); giữ sản phẩm / số tiền / bill |
| `shop/redact` | (48 giờ sau khi gỡ app) xóa dữ liệu người mua của mọi đơn nhận qua kết nối shop đó, xóa token còn sót |

- Chữ ký: `X-Shopify-Hmac-Sha256` = base64(HMAC-SHA256(body thô, `Shopify:ClientSecret`)). Sai / thiếu → **401** (Shopify kiểm khi duyệt app); đúng → **200** ngay.
- Chống trùng theo `X-Shopify-Webhook-Id` (bộ nhớ 24 giờ); mọi thao tác idempotent nên nhận lại cũng không sai dữ liệu.
- Vận đơn đã cấp (`dbo.MaVanDon`) là chứng từ vận chuyển / hải quan của Việt An, không xóa theo webhook redact.
- Kiểm nhanh khi đã deploy: `shopify app webhook trigger --topic customers/redact --address <URL>` (Shopify CLI) hoặc nút "Send test" trong Dev Dashboard.

## 3. TikTok Shop

| Mục | Ghi chú |
|---|---|
| Đăng ký | Tài khoản developer trên **TikTok Shop Partner Center**, tạo app (loại ERP / logistics) → `app_key`, `app_secret`, `service_id`. Cần duyệt app và xin từng nhóm quyền (Order, Fulfillment, Logistics) |
| Ủy quyền | Chuyển chủ shop tới trang ủy quyền dịch vụ (`services.tiktokshop.com/open/authorize?service_id=…&state=…`; US dùng cổng riêng `services.us.tiktokshop.com`). Redirect về với **`code`** — sống **30 phút, dùng 1 lần** |
| Token | `GET https://auth.tiktok-shops.com/api/v2/token/get?app_key&app_secret&auth_code&grant_type=authorized_code` → `access_token`, `access_token_expire_in`, `refresh_token`, `refresh_token_expire_in`. Làm mới: cùng endpoint `/api/v2/token/refresh`, `grant_type=refresh_token`. Lên lịch refresh trước hạn |
| Shop | Sau khi có token gọi `GET /authorization/202309/shops` lấy `shop_cipher` + region của từng shop — mọi API theo shop đều cần `shop_cipher` |
| Gọi API | Host `open-api.tiktokglobalshop.com`, phiên bản `202309` (hoặc mới hơn). Query bắt buộc `app_key, timestamp, sign, shop_cipher`; header `x-tts-access-token` |
| Chữ ký | `sign` = hex(HMAC-SHA256(app_secret, app_secret + path + các tham số query đã sắp xếp theo tên nối "keyvalue" (bỏ `sign`, `access_token`) + body JSON + app_secret)) |
| Lấy đơn | `POST /order/202309/orders/search` (lọc `order_status = AWAITING_SHIPMENT`, theo `update_time`), chi tiết `GET /order/202309/orders?ids=` |
| Đẩy tracking | Chỉ áp dụng đơn **người bán tự vận chuyển** (seller shipping). API **Mark Package As Shipped** (Fulfillment) gửi `tracking_number` + `shipping_provider_id` (lấy từ *Get Shipping Providers*). Hiện chỉ mở cho **US, UK, ES, IE**; tracking không được chứa `/`, `-`, khoảng trắng |
| Webhook | Khai URL trong Partner Center, chọn sự kiện (đổi trạng thái đơn, hủy đơn, thu hồi ủy quyền…). Kiểm header `Authorization` = hex(HMAC-SHA256(app_secret, app_key + body thô)) |

### Rủi ro cần chốt với kinh doanh

1. **Hãng vận chuyển phải nằm trong danh sách TikTok cho phép.** Việt An không có trong danh sách thì phải đẩy **mã hãng chặng cuối** (DHL / FedEx / UPS / USPS…) thay vì mã bill Việt An → tracking chỉ đẩy được sau khi có mã hãng.
2. Shop dùng **TikTok Shipping** (sàn chỉ định vận chuyển) thì không đẩy tracking được, chỉ nên nhận đơn.
3. Shop TikTok Việt Nam nội địa gần như luôn dùng vận chuyển của sàn — đối tượng chính là người bán xuyên biên giới bán sang US / UK / EU.
4. Duyệt app TikTok và quyền protected customer data của Shopify mất vài tuần, cần làm sớm.

## 4. Backend

**Đã có** (module `Ecommerce`, migration `AddEcommerceChannels`):

| Bảng | Nội dung |
|---|---|
| `dbo.KenhTMDT` | Danh mục kênh bán: `Ma_Kenh` (shopify, tiktok, amazon, ebay, etsy, woocommerce, shopee, lazada), tên, kiểu kết nối (`oauth2` / `api_key`), website, `Dang_Hoat_Dong` (hiện chỉ Shopify), `Day_Tracking`, thứ tự |
| `dbo.KetNoiTMDT` | Shop của khách: `CustomerID`, `Ma_Kenh` (FK), `Ma_Shop`, tên / tên miền shop, `Shop_Cipher`, khu vực, tiền tệ, quyền, access/refresh token **mã hóa** + hạn, id webhook, `Trang_Thai`, ngày kết nối / đồng bộ / lỗi / ngắt kết nối |

**Còn cần** (chưa làm — cần duyệt bảng mới):

| Bảng đề xuất | Nội dung |
|---|---|
| `EcomOAuthState` | `state` ngẫu nhiên, khách, sàn, hạn 10 phút (có thể thay bằng cache phân tán nếu có) |
| `EcomWebhookEvent` | Id sự kiện + thời điểm — chống xử lý trùng, giữ ~7 ngày |
| `EcomOrderLink` | Mã đơn sàn ↔ đơn nháp / `MaVanDon`, trạng thái đẩy tracking (để thử lại khi lỗi) |

Module `Ecommerce` đã tạo (hiện mới có bảng); tiếp theo thêm Api / Application, client Shopify / TikTok là adapter trong Infrastructure; job nền (hosted service) cho refresh token, đồng bộ dự phòng và hàng đợi đẩy tracking có retry. Secret (`client_secret`, `app_secret`, khóa mã hóa token) đặt trong user-secrets / biến môi trường.

## Nguồn

- Shopify — [Authorization code grant](https://shopify.dev/docs/apps/auth/get-access-tokens/authorization-code-grant), [Expiring offline access tokens](https://shopify.dev/docs/apps/build/authentication-authorization/migrate-to-expiring-offline-access-tokens.md), [fulfillmentCreate](https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/fulfillmentCreate)
- TikTok Shop — [Partner Center](https://partner.tiktokshop.com/docv2), [Mark Package As Shipped (tóm tắt)](https://mindcloud.co/docs/universal/rest/tiktok-shop/latest/actions/mark-package-as-shipped), [Hãng vận chuyển chính thức US](https://help.m2epro.com/en/support/solutions/articles/9000239519)
