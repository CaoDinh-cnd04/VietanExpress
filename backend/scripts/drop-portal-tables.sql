/*
  Xoá các bảng do portal tự sinh trước đây (schema identity, customers) — portal giờ chỉ dùng bảng có sẵn:
    - Đăng nhập, đổi mật khẩu:   dbo.TCustomer (Login_UserName / Login_Password)
    - Hồ sơ khách:               dbo.TCustomer
    - Vận đơn:                   dbo.MaVanDon, dbo.MaVanDon_PCS_DIM, dbo.MaVanDon_ChiTietHang
    - Đơn nháp (tạm giữ):        shipments.OrderDrafts
  Chạy SAU khi đã migrate schema shipments lên DropShipmentsKeepDrafts (bước đó cần customers.Customers
  để đổi mã khách của đơn nháp). Nên BACKUP DATABASE trước khi chạy.
*/
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @sql nvarchar(max) = N'';

-- 1. Khoá ngoại trong 2 schema
SELECT @sql += N'ALTER TABLE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';' + CHAR(10)
FROM sys.foreign_keys fk
JOIN sys.tables t ON t.object_id = fk.parent_object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name IN (N'identity', N'customers');

-- 2. Bảng
SELECT @sql += N'DROP TABLE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N';' + CHAR(10)
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name IN (N'identity', N'customers');

-- 3. Sequence
SELECT @sql += N'DROP SEQUENCE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(o.name) + N';' + CHAR(10)
FROM sys.sequences o JOIN sys.schemas s ON s.schema_id = o.schema_id
WHERE s.name IN (N'identity', N'customers');

EXEC sys.sp_executesql @sql;

-- 4. Schema
IF SCHEMA_ID(N'identity') IS NOT NULL EXEC(N'DROP SCHEMA [identity]');
IF SCHEMA_ID(N'customers') IS NOT NULL EXEC(N'DROP SCHEMA [customers]');

COMMIT;
