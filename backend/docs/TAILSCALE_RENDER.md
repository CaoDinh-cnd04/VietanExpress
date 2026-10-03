# Render kết nối SQL Server trên Windows qua Tailscale

```text
Vercel → Render API → 127.0.0.1:14330 → tailscale nc → IP Tailscale của Windows:1433 → vietan_app
```

Không cần cấu hình router hoặc IP public. Windows phải bật, không ngủ và có Internet. SQL Server vẫn lưu dữ liệu tại Windows. Tailscale chạy cùng container API trong userspace bằng user không phải root; không yêu cầu `/dev/net/tun`. Cổng chuyển tiếp 14330 chỉ nghe loopback trong container.

## 1. Windows

1. Cài Tailscale, đăng nhập. Trên Machines, máy SQL phải hiển thị Connected.
2. Lấy IP: `& "C:\Program Files\Tailscale\tailscale.exe" ip -4`. Ví dụ máy đã kiểm tra: `100.112.14.17`.
3. SQL Server đã bật TCP 1433 và SQL login `vietan_portal`. Kiểm tra SSMS bằng SQL authentication tới `tcp:100.112.14.17,1433`, database `vietan_app`.
4. Cho phép SQL trên đúng IP Tailscale. PowerShell **Run as administrator**, thay IP nếu máy khác:

   ```powershell
   $ruleName = 'VietAn-SQL-Tailscale'
   if (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue) {
       Get-NetFirewallRule -Name $ruleName | Remove-NetFirewallRule
   }
   New-NetFirewallRule -Name $ruleName -DisplayName 'VietAn SQL via Tailscale' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 1433 -LocalAddress 100.112.14.17 -RemoteAddress 100.64.0.0/10 -Profile Any
   ```

   Quy tắc chỉ áp dụng vào IP Tailscale; địa chỉ remote thuộc mạng Tailscale. Chỉ các thiết bị được phép trong tailnet của bạn kết nối được. Nếu cần thu hẹp hơn, thay RemoteAddress bằng IP Tailscale của node Render sau khi node xuất hiện trên Machines. Không mở TCP1433 cho toàn bộ Internet.

## 2. Khóa cho container Render

Trong cùng tài khoản Tailscale: **Settings → Keys → Generate auth key**:

- Description: `vietan-render`.
- Reusable: bật, vì Render có thể tạo container mới khi redeploy/khởi động lại.
- Ephemeral: bật, để node container cũ được dọn khi offline.
- Pre-approved: bật nếu tailnet có Device approval.
- Expiration: chọn thời hạn phù hợp, tối đa 90 ngày; tạo khóa mới và cập nhật Render trước khi hết hạn.

Sao chép khóa vào **Render Environment**. Không gửi khóa qua chat, không thêm vào code hoặc GitHub. Khóa này khác mật khẩu SQL và JWT secret.

Với tailnet đã cấu hình Access controls, cấp quyền TCP1433 từ node Render đến IP SQL. Có thể dùng auth key gắn tag và grant riêng để giới hạn truy cập. Không thay toàn bộ policy hiện có mà chưa kiểm tra các thiết bị đang dùng policy.

## 3. Render Environment

Dockerfile mặc định đã hỗ trợ Tailscale. Không đặt Docker Command ghi đè entrypoint.

| Key | Value |
|---|---|
| `TS_AUTHKEY` | Khóa vừa tạo; chỉ lưu tại Render |
| `TS_SQL_HOST` | IP Tailscale của máy Windows, ví dụ `100.112.14.17` |
| `TS_SQL_PORT` | `1433` (có thể bỏ vì mặc định 1433) |
| `ConnectionStrings__Default` | Chuỗi kết nối dưới đây |

```text
Server=tcp:127.0.0.1,14330;Database=vietan_app;User ID=vietan_portal;Password=<MAT_KHAU_SQL>;Encrypt=True;TrustServerCertificate=True;Connect Timeout=30
```

**Server là loopback của container, cổng 14330**, vì SQL client được đưa qua TCP relay; đích thực nằm trong `TS_SQL_HOST`. `TrustServerCertificate=True` dùng cho chứng chỉ SQL tự ký trong đường kết nối này: SQL vẫn mã hóa, nhưng không kiểm tra chứng chỉ SQL; kết nối giữa hai node được xác thực và mã hóa bởi Tailscale. Không dùng mẫu này để mở SQL ra Internet. Khi SQL có chứng chỉ tin cậy, dùng `TrustServerCertificate=False` cùng `HostNameInCertificate` khớp tên trên chứng chỉ.

Giữ cấu hình JWT và các biến deployment hiện có. Đặt:

```text
Company__PortalUrl=https://vietan-express.vercel.app
Cors__AllowedOrigins__0=https://vietan-express.vercel.app
Database__MigrateOnStartup=false
Jwt__SecureCookies=true
ASPNETCORE_ENVIRONMENT=Production
```

Nếu không đặt cả `TS_AUTHKEY` lẫn `TS_SQL_HOST`, entrypoint chạy API trực tiếp như cấu hình SQL cloud thông thường. Nếu chỉ đặt một biến, entrypoint báo lỗi cấu hình thay vì chạy một phần.

## 4. Deploy và kiểm tra

1. Render: Save, rebuild/redeploy commit có hỗ trợ Tailscale.
2. Logs phải có `Tailscale SQL relay ready: 127.0.0.1:14330 -> ...:1433`.
3. Machines xuất hiện node `vietan-render` (có thể có hậu tố), trạng thái Connected. Nếu Requires approval, phê duyệt node này.
4. `https://<backend>.onrender.com/health` phải trả HTTP200; health check có kiểm tra kết nối database.
5. Vercel giữ `BACKEND_URL=https://<backend>.onrender.com` và redeploy nếu vừa đổi biến. Kiểm tra đăng nhập và danh sách đơn trên website.

Relay ready chỉ chứng minh helper đã khởi động; `/health` và thao tác API mới xác nhận SQL kết nối được. Nếu timeout SQL, kiểm tra máy Windows còn online, SQL service đang chạy, firewall và Access controls; nếu lỗi Login failed, kiểm tra mật khẩu và user mapping. Khóa hết hạn cần tạo khóa mới trước lần khởi động container tiếp theo.

Kiểm tra entrypoint (Linux hoặc Git Bash): `sh backend/tests/deployment/start-api.test.sh`. Bộ kiểm tra dùng tiến trình giả, không truy cập database. Kiểm tra Docker/network thật cần build container Linux và auth key hợp lệ.

Nguồn: [Tailscale trên Render](https://render.com/blog/host-a-dev-environment-on-render-with-vs-code-and-tailscale), [userspace networking](https://tailscale.com/docs/concepts/userspace-networking), [tailscale nc](https://tailscale.com/docs/reference/tailscale-cli#nc), [auth keys](https://tailscale.com/docs/features/access-control/auth-keys).
