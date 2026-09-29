# Việt An Express — Backend (.NET 10)

ASP.NET Core Web API, kiến trúc **modular monolith**: mỗi module là 1 project, dùng chung 1 database SQL Server nhưng mỗi module có schema, DbContext và migration riêng.

| Thành phần | Công nghệ |
|---|---|
| Nền tảng | .NET 10 (LTS), ASP.NET Core Web API |
| Dữ liệu | EF Core 10 + SQL Server |
| Ứng dụng | MediatR 12.5 (command/query), FluentValidation 12, Mapster 10 |
| Bảo mật | JWT + refresh token (xoay vòng), phân quyền theo permission |
| Vận hành | Serilog, Swagger, Asp.Versioning (`/api/v1/...`), health check `/health` |
| Test | xUnit v3 + Moq |

> MediatR ghim ở 12.5.0 — bản cuối cùng giấy phép Apache-2.0. Từ 13.x MediatR cần license thương mại.

## 1. Chạy lần đầu

Yêu cầu: .NET SDK 10, SQL Server (máy dev: `LAPTOP-K91T0OHE\SQLEXPRESS01`, database `vietan_app`), `dotnet tool install -g dotnet-ef`.

```powershell
cd backend/src/VietAnExpress.API

# Bí mật KHÔNG để trong appsettings — dùng user-secrets khi dev
dotnet user-secrets set "ConnectionStrings:Default" "Server=LAPTOP-K91T0OHE\SQLEXPRESS01;Database=vietan_app;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=True"
dotnet user-secrets set "Jwt:Secret" "<chuỗi ngẫu nhiên ≥ 32 ký tự>"
dotnet user-secrets set "Identity:Seed:AdminPassword" "<mật khẩu admin đầu tiên, ≥ 8 ký tự, có chữ và số>"

dotnet run --launch-profile http     # http://localhost:3000/swagger
```

Khi chạy ở môi trường Development, API tự áp migration (`Database:MigrateOnStartup`). Sau đó nó seed quyền, 3 vai trò (`admin`, `staff`, `customer`) và tài khoản `admin`. Xem lại mật khẩu admin đã đặt: `dotnet user-secrets list`.

Frontend (`web/`, `npm run dev`) proxy `/api` sang `http://localhost:3000`, nên chạy cả hai là dùng được ngay.

**Deploy:** đặt biến môi trường `ConnectionStrings__Default`, `Jwt__Secret`, `Identity__Seed__AdminPassword` (chỉ lần đầu), `Cors__AllowedOrigins__0`… Không commit bí mật vào repo.

## 2. Cấu trúc

```
backend/
├── src/
│   ├── VietAnExpress.API/                         Host: Program.cs, pipeline, Swagger, xử lý lỗi toàn cục
│   ├── BuildingBlocks/VietAnExpress.SharedKernel/
│   │   ├── Domain/        BaseEntity (audit, xoá mềm, BranchId), AggregateRoot, IDomainEvent, IIntegrationEvent
│   │   ├── Results/       Result<T>, Error, PagedResult<T>
│   │   ├── Exceptions/    DomainException (422), ValidationException (400), NotFound, Conflict…
│   │   ├── Application/   ICurrentUser, ValidationBehavior, LoggingBehavior, VietnamTime
│   │   ├── Authorization/ HasPermission, PermissionPolicyProvider, IPermissionProvider, claim / role
│   │   ├── Persistence/   AuditableEntityInterceptor, DomainEventsInterceptor, AddModuleDbContext, sequence
│   │   └── Web/           ApiControllerBase, ApiResponse, ProblemDetailsMapper
│   └── Modules/
│       ├── Identity/   VietAnExpress.Identity (+ .Contracts)    schema identity
│       ├── Customers/  VietAnExpress.Customers (+ .Contracts)   schema customers
│       └── Shipments/  VietAnExpress.Shipments (+ .Contracts)   schema shipments
├── tests/  Shipments.Tests, Identity.Tests, Architecture.Tests
└── scripts/ add-migration.ps1, update-database.ps1
```

Bên trong mỗi module: `Domain/`, `Application/` (`Commands/`, `Queries/`, `Dtos/`, `Validators/`, `EventHandlers/`), `Infrastructure/` (`<Module>DbContext`, `Configurations/`, `Migrations/`), `Api/` (controller), `<Module>Module.cs` (đăng ký DI).

## 3. Quy tắc bắt buộc (có test tự kiểm tra)

1. Module chỉ tham chiếu **SharedKernel** và **Contracts** của module khác. `Architecture.Tests` sẽ fail nếu vi phạm.
2. Mọi class trong module là `internal`; chỉ `<Module>Module` là `public`. Contracts là `public`.
3. Mỗi module có DbContext, schema và migration riêng. **Không tạo khoá ngoại xuyên module:** Shipments chỉ lưu `CustomerId`, cần thông tin khách thì gọi `ICustomersApi`.
4. Giao tiếp giữa các module:
   - Đồng bộ: qua interface trong Contracts.
   - Bất đồng bộ: qua integration event (MediatR, chạy trong cùng process). Ví dụ: `ShipmentBookedIntegrationEvent` → Customers tăng số đơn của khách.
5. Mọi bảng nghiệp vụ kế thừa `BaseEntity`. Interceptor tự điền `CreatedAt/By`, `UpdatedAt/By`, `BranchId`; lệnh xoá được đổi thành xoá mềm, và global query filter tự ẩn bản ghi đã xoá.
6. Shipments theo DDD: trạng thái chỉ đổi qua method của aggregate (`IssueBill`, `Dispatch`, `MarkAsDelivered`, `Cancel`…). Vi phạm quy tắc nghiệp vụ trả **422**.
7. Controller không kiểm tra theo tên vai trò. Luôn dùng `[HasPermission(ShipmentsPermissions.Create)]`. Quyền được khai báo trong `IPermissionProvider` của từng module; lúc khởi động, Identity seed quyền và gán cho vai trò mặc định.
8. Mọi lỗi trả về dạng **ProblemDetails**, kèm `error` (mã lỗi) và `message` (câu tiếng Việt) — đúng hai trường frontend đang đọc.

## 4. Việc thường làm

```powershell
# Tạo migration (class sinh ra tự chuyển sang internal)
./scripts/add-migration.ps1 -Module Shipments -Name AddShipmentEta

# Áp migration thủ công (production, hoặc khi tắt MigrateOnStartup)
./scripts/update-database.ps1

# Test — bật thêm các test cần SQL Server (tạo DB tạm vietan_tests_xxx rồi xoá)
$env:VIETAN_TEST_SQLSERVER = "LAPTOP-K91T0OHE\SQLEXPRESS01"
dotnet test --solution VietAnExpress.slnx
```

**Thêm use case:** tạo file `Commands/XxxCommand.cs` (gồm record command và handler), thêm validator trong `Validators/`, rồi thêm 1 action trong controller.

**Thêm module mới:** tạo 2 project `VietAnExpress.X` và `VietAnExpress.X.Contracts` (copy csproj từ module có sẵn). Viết `XModule.AddXModule()`, thêm vào `Program.cs` (1 dòng `AddXModule` và thêm assembly vào mảng `moduleAssemblies`), rồi bổ sung tên module vào `Architecture.Tests` và 2 script.

## 5. API v1

| Module | Endpoint | Quyền |
|---|---|---|
| Tài khoản | `POST /auth/login` (`?useCookies=false` để nhận token trong body), `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/change-password`, `GET /me` | đăng nhập |
| Quản trị | `GET/POST /users`, `PUT /users/{id}/active` | `users.view`, `users.manage` |
| Khách hàng | `GET/POST /customers`, `GET/PUT/DELETE /customers/{id}` | `customers.view`, `customers.manage` |
| Vận đơn | `GET/POST /shipments`, `GET/PUT /shipments/{id}`, `GET /shipments/by-code/{code}` | `shipments.view/create/update` |
| | `POST /shipments/{id}/issue-bill`, `/cancel` | `shipments.issue-bill`, `shipments.cancel` |
| | `POST /shipments/{id}/dispatch`, `/tracking-events`, `/deliver`, `/delivery-failed` | `shipments.operate` |
| Đơn hàng (dbo.MaVanDon) | `GET /orders`, `GET /orders/{bill}`, `/events`, `POST /orders/batch`, `GET/POST/PUT/DELETE /drafts`, `POST /drafts/{id}/print` | `shipments.view/create/update/issue-bill` |
| In & bảng kê | `GET /orders/print?bills=A,B&doc=` với `bill-a4` / `invoice` / `cvck` / `label-a6` (trang HTML in, mã vạch Code128), `GET /orders/export` (.xlsx, cùng bộ lọc danh sách) | `shipments.view` |
| Công khai | `POST /public/tracking` `{ bills: string[] }` (≤ 10 mã, giới hạn 30 lần/phút/IP) | không cần |

**Xác thực:**
- Web portal dùng cookie `HttpOnly` + `SameSite=Strict`: `va_access` (JWT 15 phút) và `va_refresh` (14 ngày nếu "ghi nhớ", còn không thì 12 giờ).
- Client khác (mobile, tích hợp) gửi header `Authorization: Bearer`.
- Refresh token chỉ lưu dạng hash và được xoay vòng mỗi lần dùng. Nếu một token đã bị thu hồi mà vẫn được gửi lại, mọi phiên của user đó bị thu hồi.
- Đăng nhập sai 5 lần thì tài khoản bị khoá 15 phút.

## Deploy: Vercel (frontend) + máy chủ nội bộ (backend, qua ngrok)

```
Trình duyệt ──► Vercel (web + hàm web/api/proxy.ts) ──► https://<tên-miền>.ngrok-free.app ──► ngrok (service) ──► http://localhost:5080 (VietAnExpressApi) ──► SQL Server
```

Trình duyệt chỉ làm việc với tên miền Vercel, nên cookie đăng nhập (`SameSite=Strict`) hoạt động bình thường. Hàm proxy trên Vercel làm 2 việc: thêm header `ngrok-skip-browser-warning` để ngrok gói miễn phí không chèn trang cảnh báo, và trả 503 kèm câu tiếng Việt khi máy chủ tắt.

**Cài trên máy chủ (1 lần; mở "Windows PowerShell" bằng Run as administrator):**
```powershell
cd D:\Viet-An-Express\backend
.\scripts\install-service.ps1                            # build → C:\VietAnExpress\api, tạo service VietAnExpressApi (cổng 5080)
.\scripts\setup-ngrok.ps1 -Domain <tên-miền>.ngrok-free.app   # ngrok chạy dạng service
```
- `install-service.ps1` lấy connection string và `Jwt:Secret` từ User Secrets của máy, ghi vào `C:\VietAnExpress\api\appsettings.Production.json` (chỉ admin và service đọc được, **không** nằm trong repo). Service chạy bằng tài khoản `NT SERVICE\VietAnExpressApi`, được cấp `db_owner` trên database; tự chạy khi bật máy và tự khởi động lại khi lỗi. Log nằm ở `C:\VietAnExpress\api\logs\`.
- **Cập nhật bản mới:** `git pull` rồi chạy lại `install-service.ps1`.
- **Gỡ:** `uninstall-service.ps1` (thêm `-RemoveFiles` để xoá thư mục cài đặt).

**Trên Vercel:**
- Root Directory = `web`.
- Environment Variable `BACKEND_URL = https://<tên-miền>.ngrok-free.app`, rồi Redeploy.
- **Không** đặt `VITE_API_BASE_URL` (để mặc định `/api/v1`).

Máy chủ phải luôn bật và có mạng. Khi máy tắt, portal báo "Máy chủ Việt An đang tạm dừng".

## 6. Cầu nối dữ liệu hệ thống cũ (tạm thời)

Khách hàng và vận đơn thật hiện vẫn nằm ở `dbo.TCustomer` và `dbo.MaVanDon`. Backend **chỉ đọc** 2 bảng này, không ghi hay sửa:

- **Tra cứu công khai:** mã không có trong `shipments` thì tìm tiếp trong `dbo.MaVanDon`, theo số VA (`OrderNumber`), mã hãng (`Bill_Connect`), `AWB` hoặc `CustomerBill`. Tên người ký nhận không hiện ra.
- **Đăng nhập:** tên đăng nhập chưa có trong `identity.Users` thì backend so với `Login_UserName` / `Login_Password` của `dbo.TCustomer`. Nếu đúng, backend chuyển hồ sơ khách sang `customers.Customers` (cột `LegacyId` = `CustomerID` cũ) và tạo tài khoản mới với mật khẩu đã băm. Từ lần sau khách đăng nhập hoàn toàn bằng hệ thống mới.

- **Đơn hàng (`/orders`, `/drafts`)**: đọc **và ghi** thẳng `dbo.MaVanDon`, vì hệ thống cũ (kho, vận hành) vẫn chạy song song trên bảng này:
  - `GET /orders`, `GET /orders/{bill}`, `/events`: đọc `MaVanDon`. Khách chỉ thấy dòng có `CustomerID` bằng mã khách cũ của mình; nhân viên thấy tất cả. Trạng thái suy ra từ `POD`, `POD_Est`, `Sent_Date` (xem `LegacyOrderStatus`).
  - Đơn nháp lưu ở `shipments.OrderDrafts` (dữ liệu tạm của portal). `POST /drafts/{id}/print` cấp số vận đơn và ghi 1 dòng vào `MaVanDon`, trong cùng transaction với việc xoá nháp.
  - `POST /orders/batch` (tạo từ Excel) ghi thẳng vào `MaVanDon`.
  - **Số vận đơn** của portal lấy từ dải riêng, bắt đầu từ **90.000.001** (sequence `shipments.LegacyOrderNumberSequence`), để không trùng số hệ thống cũ cấp (hiện khoảng 6 triệu).
  - Giá trị ghi theo dữ liệu cũ đang có: `Service = 1`, `Status = 1`, `Dich_Vu` dạng `DHL|Singapore`, `ConsigneeEmail = ''` (cột NOT NULL). Chưa ghi `SenderCountryID` / `ConsigneeCountryID`, vì database chưa có bảng danh mục quốc gia.
  - Chỉ tài khoản khách hàng đã liên kết mã khách cũ mới tạo đơn được. Nhân viên vẫn tạo đơn trên hệ thống nội bộ.

Code nằm trong thư mục `Infrastructure/Legacy/` của Identity, Customers và Shipments. Chuyển hết dữ liệu cũ xong thì xoá các thư mục này.

> Hệ thống cũ lưu mật khẩu dạng chữ thường (không băm). Nên yêu cầu khách đổi mật khẩu sau khi chuyển sang, và xoá cột `Login_Password` cũ khi không còn hệ thống nào dùng.

## 7. Còn thiếu so với frontend (`web/docs/API_CONTRACT.md`)

Frontend hiện gọi `/orders`, `/drafts`, `/pickups`, `/pricing`, `/ecommerce`, `/troubles`, `/notifications`… Backend này mới có nền tảng và 3 module lõi. Việc tiếp theo:
1. Làm lớp tương thích `/orders`, `/drafts` trên module Shipments, hoặc sửa frontend sang `/shipments`.
2. Frontend: khi gặp 401 thì gọi `POST /auth/refresh` một lần rồi thử lại (access token chỉ sống 15 phút).
3. Chuyển dữ liệu cũ từ `dbo.MaVanDon`, `dbo.TCustomer` sang schema mới. Dải mã vận đơn mới bắt đầu từ `VA10000001`, không trùng `OrderNumber` cũ (khoảng 6 triệu).
4. Thêm module Chi nhánh để lọc dữ liệu theo `BranchId`, và Outbox cho integration event khi cần đảm bảo tuyệt đối.
