#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Cài (hoặc cập nhật) backend Việt An Express thành Windows Service trên máy này.

.DESCRIPTION
  Chạy lại bất cứ lúc nào để cập nhật bản mới (tự dừng service, build, chép đè, chạy lại).
  - Build Release vào $InstallDir.
  - Tạo appsettings.Production.json từ User Secrets của máy dev (connection string, Jwt:Secret…),
    chỉ Administrators / SYSTEM / tài khoản service đọc được. File này KHÔNG nằm trong repo.
  - Service chạy bằng tài khoản ảo "NT SERVICE\<ServiceName>" (ít quyền), tự chạy khi bật máy, tự khởi động lại khi lỗi.
  - Cấp quyền db_owner trên database cho tài khoản đó (để chạy migration).
  Mở PowerShell bằng "Run as administrator" (Windows PowerShell 5.1 — ứng dụng "Windows PowerShell").

.EXAMPLE
  cd D:\Viet-An-Express\backend
  .\scripts\install-service.ps1
#>
param(
    [string]$InstallDir = 'C:\VietAnExpress\api',
    [int]$Port = 5080,
    [string]$ServiceName = 'VietAnExpressApi',
    # Domain frontend (CORS) — chỉ cần khi gọi API trực tiếp, không qua proxy của Vercel.
    [string]$FrontendOrigin = ''
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$apiProject = Join-Path $root 'src\VietAnExpress.API\VietAnExpress.API.csproj'
$account = "NT SERVICE\$ServiceName"

function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }

# ---------- 1. Bí mật từ User Secrets ----------
Step 'Đọc cấu hình bí mật từ User Secrets'
$secrets = @{}
dotnet user-secrets list --project $apiProject | ForEach-Object {
    if ($_ -match '^\s*(.+?)\s*=\s*(.*)$') { $secrets[$Matches[1]] = $Matches[2] }
}
foreach ($key in 'ConnectionStrings:Default', 'Jwt:Secret') {
    if (-not $secrets[$key]) { throw "Thiếu '$key' trong User Secrets. Đặt bằng: dotnet user-secrets set `"$key`" `"...`" --project $apiProject" }
}
Write-Host "Đã đọc $($secrets.Count) giá trị (không in ra màn hình)."

# ---------- 2. Dừng service cũ + build ----------
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing -and $existing.Status -ne 'Stopped') {
    Step "Dừng service $ServiceName"
    Stop-Service -Name $ServiceName -Force
    (Get-Service $ServiceName).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(30))
}

Step "Build Release vào $InstallDir"
dotnet publish $apiProject -c Release -o $InstallDir --nologo
if ($LASTEXITCODE -ne 0) { throw 'Build thất bại' }

# ---------- 3. appsettings.Production.json (bí mật, chỉ trên máy này) ----------
Step 'Ghi appsettings.Production.json'
$settings = [ordered]@{
    Urls              = "http://localhost:$Port"   # chỉ nghe trên máy; Internet vào qua ngrok
    ConnectionStrings = @{ Default = $secrets['ConnectionStrings:Default'] }
    Jwt               = @{ Secret = $secrets['Jwt:Secret']; SecureCookies = $true }
    Database          = @{ MigrateOnStartup = $true }
    Swagger           = @{ Enabled = $false }
}
if ($FrontendOrigin) { $settings.Cors = @{ AllowedOrigins = @($FrontendOrigin) } }
$settingsFile = Join-Path $InstallDir 'appsettings.Production.json'
$settings | ConvertTo-Json -Depth 5 | Set-Content -Path $settingsFile -Encoding UTF8

$logs = Join-Path $InstallDir 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

# ---------- 4. Tạo / cập nhật service ----------
$exe = Join-Path $InstallDir 'VietAnExpress.API.exe'
if (-not $existing) {
    Step "Tạo service $ServiceName"
    New-Service -Name $ServiceName -BinaryPathName "`"$exe`"" -DisplayName 'Việt An Express API' `
        -Description 'Backend portal Việt An Express (ASP.NET Core).' -StartupType Automatic | Out-Null
}
sc.exe config $ServiceName obj= $account start= delayed-auto | Out-Null
# Lỗi thì tự chạy lại sau 5s, 5s, 30s; đếm lại sau 1 ngày.
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/5000/restart/30000 | Out-Null

# Tài khoản "NT SERVICE\..." chỉ tồn tại SAU khi tạo service → cấp quyền file ở bước này.
# File bí mật: chỉ Administrators, SYSTEM và tài khoản service đọc được.
icacls $settingsFile /inheritance:r /grant:r 'Administrators:F' 'SYSTEM:F' "${account}:R" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Không cấp được quyền đọc $settingsFile cho $account" }
icacls $logs /grant "${account}:(OI)(CI)M" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Không cấp được quyền ghi $logs cho $account" }

# ---------- 5. Quyền trên SQL Server cho tài khoản service ----------
Step "Cấp quyền database cho $account"
# Lưu ý: SqlConnectionStringBuilder là dictionary — trong PowerShell phải dùng tên khoá chuẩn ('Initial Catalog'),
# viết $builder.InitialCatalog sẽ bị hiểu thành khoá "InitialCatalog" không tồn tại.
$builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder $secrets['ConnectionStrings:Default']
$database = $builder['Initial Catalog']
if (-not $database) { throw 'Connection string không có tên database (Database=...)' }
$builder['Initial Catalog'] = 'master'
$builder['Integrated Security'] = $true
$conn = New-Object System.Data.SqlClient.SqlConnection $builder.ConnectionString
$conn.Open()
try {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
IF SUSER_ID(N'$account') IS NULL CREATE LOGIN [$account] FROM WINDOWS;
USE [$database];
IF USER_ID(N'$account') IS NULL CREATE USER [$account] FOR LOGIN [$account];
IF IS_ROLEMEMBER('db_owner', N'$account') = 0 ALTER ROLE db_owner ADD MEMBER [$account];
"@
    $cmd.ExecuteNonQuery() | Out-Null
} finally { $conn.Close() }
Write-Host "Đã cấp db_owner trên [$database]."

# ---------- 6. Chạy + kiểm tra ----------
Step "Khởi động service"
Start-Service -Name $ServiceName
$health = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try { $health = (Invoke-WebRequest "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 5).Content; break } catch { }
}
if ($health -eq 'Healthy') {
    Write-Host "`nXong: API chạy tại http://localhost:$Port (health: $health)" -ForegroundColor Green
} else {
    Write-Warning "Service đã chạy nhưng /health chưa báo Healthy. Xem log: $logs"
}
