# Triển khai backend trên Render, frontend trên Vercel

```text
Trình duyệt → Vercel (web + /api/proxy) → Render (.NET API) → SQL Server vietan_app
```

Giữ `VITE_API_BASE_URL=/api/v1`. Proxy `web/api/proxy.ts` chuyển tiếp API đến `BACKEND_URL`; cookie HttpOnly được trả trên domain Vercel, phù hợp với phiên đăng nhập hiện tại. Không cần sửa SameSite sang None hoặc đưa token vào JavaScript.

## 1. Chuẩn bị SQL Server

Nếu giữ SQL Server trên máy Windows và không có quyền cấu hình router, làm theo [hướng dẫn Tailscale → Render](backend/docs/TAILSCALE_RENDER.md). Dockerfile đã có TCP relay riêng; cách này không cần mở cổng SQL ra Internet. Máy Windows phải bật và có Internet.

Backend hiện dùng SQL Server và các bảng của hệ thống cũ (`dbo.TCustomer`, `dbo.MaVanDon`…). Render không tự cung cấp database này qua blueprint.

- Dùng SQL Server / Azure SQL có thể truy cập từ Render, với tài khoản SQL được cấp quyền phù hợp. SQL Express tại máy cá nhân chỉ truy cập trong LAN và `Trusted_Connection=True` sẽ không dùng được trên container Linux Render.
- Ví dụ cấu trúc connection string (thay giá trị; không commit bí mật):

  ```text
  Server=tcp:<sql-host>,1433;Database=vietan_app;User ID=<sql-user>;Password=<sql-password>;Encrypt=True;TrustServerCertificate=False
  ```

- Database phải có sẵn dữ liệu/bảng cũ và migration portal cần thiết. Giữ `Database__MigrateOnStartup=false` khi deploy. Nếu cần migration, chạy `backend/scripts/update-database.ps1` từ máy quản trị sau khi kiểm tra và sao lưu database; script áp migration của repository.
- Cho phép kết nối từ địa chỉ outbound của dịch vụ Render trong firewall database. Không dùng PostgreSQL thay cho SQL Server nếu chưa sửa lớp dữ liệu.

## 2. Backend trên Render

1. Đăng nhập Render, chọn **New → Blueprint**, kết nối repository `CaoDinh-cnd04/VietanExpress`, nhánh `main`.
2. Render đọc `render.yaml`: Docker, Root Directory `backend`, Dockerfile `./Dockerfile`, context `.`, health check `/health`. Chọn gói phù hợp trong giao diện Render.
3. Điền các biến được hỏi:

   | Biến | Giá trị |
   |---|---|
   | `ConnectionStrings__Default` | Connection string SQL Server có thể truy cập từ Render |
   | `Jwt__Secret` | Bí mật ngẫu nhiên ít nhất 32 byte, giữ riêng trong Render |
   | `Company__PortalUrl` | URL frontend HTTPS trên Vercel |
   | `Cors__AllowedOrigins__0` | Origin frontend HTTPS, không có `/` cuối |

4. Blueprint đã đặt `ASPNETCORE_ENVIRONMENT=Production`, `Jwt__SecureCookies=true`, `Database__MigrateOnStartup=false`. Backend đọc `PORT` của nền tảng và lắng nghe `0.0.0.0`; không cần Start Command riêng.
5. Nếu cần tra mã bưu chính, thêm `GeoNames__Username` trong Environment; không có biến này vẫn nhập địa chỉ thủ công.
6. Deploy, kiểm tra Logs và mở `https://<service>.onrender.com/health`. Endpoint phải trả HTTP 200. Health check này không thay thế kiểm tra truy vấn database; kiểm tra đăng nhập/tra cứu ở bước cuối.

Có thể tạo **Web Service** thủ công thay vì Blueprint, dùng cùng nhánh/root/Dockerfile/context/health check và biến ở trên.

## 3. Frontend trên Vercel

1. Chọn **Add New → Project**, import cùng repository, nhánh `main`.
2. Cấu hình:

   | Mục | Giá trị |
   |---|---|
   | Framework Preset | Vite |
   | Root Directory | `web` |
   | Install Command | `npm ci` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Node.js Version | 22.x |

3. Thêm `BACKEND_URL=https://<service>.onrender.com` trong Environment Variables, không thêm `/api/v1` vào biến này. Đây là cấu hình server của proxy; không dùng tiền tố `VITE_`.
4. Để `VITE_API_BASE_URL` trống (mặc định `/api/v1`) hoặc đặt đúng `/api/v1`. Không đặt thành URL Render: client hiện dùng proxy cùng domain cho cookie đăng nhập.
5. Deploy. `web/vercel.json` đã cấu hình proxy `/api/*` và fallback `/index.html` cho React Router.
6. Sau khi có domain Vercel, cập nhật `Company__PortalUrl` và `Cors__AllowedOrigins__0` trên Render rồi redeploy backend. Nếu đổi `BACKEND_URL`, redeploy frontend.

## 4. Kiểm tra sau deploy

- Tải trang chủ, mở trực tiếp trang `/orders/new`, refresh trang để kiểm tra SPA routing.
- Đăng nhập bằng tài khoản hợp lệ trong `dbo.TCustomer`; kiểm tra request đi qua `/api/v1/...` trên domain Vercel và cookie `va_access` / `va_refresh` có HttpOnly + Secure.
- Kiểm tra hồ sơ khách, danh sách đơn và tra cứu một vận đơn có thật.
- Nhập form, **Lưu nháp** và mở lại nháp. “Tạo đơn hàng” đưa vào **Đơn nháp & chưa in**; “In & cấp bill” mới ghi vận đơn vào database thật, chỉ kiểm tra thao tác này khi chủ động muốn tạo vận đơn.
- Endpoint chưa có backend vẫn hiện trạng thái chờ cập nhật. Deploy không tự bổ sung API còn thiếu.

Nếu thấy `BACKEND_NOT_CONFIGURED`, kiểm tra `BACKEND_URL` trên Vercel. Nếu thấy `BACKEND_UNREACHABLE`, kiểm tra dịch vụ Render và logs. Nếu Render lỗi khởi động, kiểm tra JWT secret, kết nối SQL Server, firewall và migration cần thiết. Giữ các giá trị bí mật ngoài GitHub.

Nguồn cấu hình nền tảng: [Render monorepo](https://render.com/docs/monorepo-support), [Render Blueprint](https://render.com/docs/blueprint-spec), [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json).
