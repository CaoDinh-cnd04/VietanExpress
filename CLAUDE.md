# CLAUDE.md — Việt An Express Portal (frontend React + TypeScript)

> Hướng dẫn kỹ thuật cho AI Agent và lập trình viên. Đọc kỹ trước khi chỉnh sửa.

## 1. Tổng quan

Portal khách hàng của Việt An Express: tạo đơn, quản lý vận đơn, giá cước, e-commerce, sự cố, pickup.
Repo gồm frontend trong `web/` (React 19 + TypeScript + Vite) và backend trong `backend/` (.NET 10, modular monolith, SQL Server database `vietan_app`). Backend phải tuân theo hợp đồng API trong `web/docs/API_CONTRACT.md`; kiến trúc, quy tắc module và cách chạy backend: `backend/README.md`.

Ngôn ngữ giao tiếp & giao diện: **Tiếng Việt**.

## 2. Cấu trúc

```
web/
├── docs/API_CONTRACT.md   # Hợp đồng API — nguồn chuẩn cho backend
├── public/templates/      # File mẫu import (CSV/XLSX 70 cột e-commerce)
└── src/
    ├── app/               # Router, provider, layout (sidebar, topbar, menu)
    ├── features/<x>/      # Mỗi chức năng: api.ts, types.ts, constants.ts, schema.ts, lib/, hooks/, components/, pages/, index.ts
    └── shared/            # api/http.ts, config/domain.ts, lib/, styles/ (tokens), ui/ (component dùng chung)
```

Chi tiết quy ước code và cách thêm trang: `web/README.md`.

```
backend/
├── src/VietAnExpress.API/                  # Host (cổng 3000 khi dev)
├── src/BuildingBlocks/VietAnExpress.SharedKernel/
├── src/Modules/{Identity,Customers,Shipments}/   # mỗi module + .Contracts, schema riêng
└── tests/                                  # xUnit v3 + Moq, Architecture.Tests kiểm tra ranh giới module
```

Backend: `cd backend && dotnet run --project src/VietAnExpress.API --launch-profile http` · test: `dotnet test --solution VietAnExpress.slnx`. Bí mật (connection string, `Jwt:Secret`, mật khẩu admin) chỉ để trong user-secrets / biến môi trường.

## 3. Lệnh thường dùng (chạy trong `web/`)

```bash
npm install
npm run dev        # http://localhost:5173, proxy /api → http://localhost:3000 (backend)
npm run typecheck
npm test           # vitest
npm run build      # xuất web/dist
```

## 4. Quy tắc nghiệp vụ đã triển khai ở frontend

- **DOC sang PACK:** chứng từ > 2kg tự chuyển sang hàng hóa (`create-order/lib/shipment.ts`, `RULES.docMaxWeightKg`).
- **Quy đổi thể tích:** cân tính cước = `max(cân thực, D×R×C / 5000)`.
- **Giới hạn kích thước theo hãng:** cảnh báo quá khổ / quá tải, chặn kiện hãng không nhận (`create-order/lib/carrier-limits.ts`).
- **Vòng đời đơn:** Tạo đơn → Đơn nháp & chưa in → In & cấp bill (backend cấp mã, khóa đơn) → Đơn hàng của tôi.
- **Import:** tạo đơn từ CSV (`order-import`), invoice từ CSV, CSV e-commerce 70 cột (gửi backend xử lý).

## 5. Quy ước bắt buộc

1. Chỉ gọi API trong `features/<x>/api.ts` qua `shared/api/http.ts`; thêm endpoint mới thì cập nhật `docs/API_CONTRACT.md`.
2. Không để dữ liệu giả trong frontend. Endpoint backend chưa có → xử lý bằng `isNotImplemented()`.
3. Màu, cỡ chữ, khoảng cách dùng biến trong `shared/styles/tokens.css`; màu chủ đạo xanh lá Việt An.
4. Không dùng emoji làm icon (`<Icon name>`); nhãn chữ thường, không viết HOA toàn bộ.
5. Logic tính toán viết thành hàm thuần trong `lib/` và có test.
