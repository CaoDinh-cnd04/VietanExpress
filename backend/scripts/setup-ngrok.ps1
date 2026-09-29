#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Cài ngrok thành Windows Service: mở API trên máy (http://localhost:5080) ra Internet qua tên miền tĩnh ngrok.

.DESCRIPTION
  Chuẩn bị (1 lần): đăng ký ngrok → Dashboard → Domains → nhận 1 tên miền tĩnh miễn phí (vd abc-xyz.ngrok-free.app),
  và đã chạy "ngrok config add-authtoken <token>" (authtoken được đọc từ cấu hình ngrok của bạn, không in ra).
  Script ghi cấu hình riêng cho service vào C:\VietAnExpress\ngrok\ngrok.yml (chỉ admin đọc được).

.EXAMPLE
  .\scripts\setup-ngrok.ps1 -Domain abc-xyz.ngrok-free.app
#>
param(
    [Parameter(Mandatory)][string]$Domain,
    [int]$Port = 5080,
    [string]$NgrokExe = (Get-Command ngrok -ErrorAction SilentlyContinue).Source,
    [string]$ConfigDir = 'C:\VietAnExpress\ngrok'
)
$ErrorActionPreference = 'Stop'
if (-not $NgrokExe) { $NgrokExe = Join-Path $env:USERPROFILE 'ngrok\ngrok.exe' }
if (-not (Test-Path $NgrokExe)) { throw "Không tìm thấy ngrok.exe — truyền -NgrokExe <đường dẫn>" }
$Domain = $Domain -replace '^https?://', '' -replace '/.*$', ''

# Authtoken lấy từ cấu hình ngrok của người dùng hiện tại.
$userConfig = Join-Path $env:LOCALAPPDATA 'ngrok\ngrok.yml'
$token = (Get-Content $userConfig -ErrorAction Stop | Where-Object { $_ -match '^\s*authtoken:\s*(\S+)' } | ForEach-Object { $Matches[1] } | Select-Object -First 1)
if (-not $token) { throw "Chưa có authtoken — chạy: ngrok config add-authtoken <token>" }

New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
$config = Join-Path $ConfigDir 'ngrok.yml'
@"
version: "3"
agent:
  authtoken: $token
endpoints:
  - name: vietan-api
    url: https://$Domain
    upstream:
      url: http://localhost:$Port
"@ | Set-Content -Path $config -Encoding ASCII
icacls $config /inheritance:r /grant:r 'Administrators:F' 'SYSTEM:F' | Out-Null

& $NgrokExe config check --config $config
if ($LASTEXITCODE -ne 0) { throw 'Cấu hình ngrok không hợp lệ' }

# Cài lại service ngrok với cấu hình mới.
& $NgrokExe service uninstall 2>$null | Out-Null
& $NgrokExe service install --config $config
& $NgrokExe service start
Start-Sleep -Seconds 4

try {
    $health = (Invoke-WebRequest "https://$Domain/health" -UseBasicParsing -TimeoutSec 15 -Headers @{ 'ngrok-skip-browser-warning' = '1' }).Content
    Write-Host "`nXong: https://$Domain/health → $health" -ForegroundColor Green
} catch {
    Write-Warning "ngrok đã chạy nhưng chưa gọi được https://$Domain/health — kiểm tra service VietAnExpressApi đang chạy."
}
Write-Host "Trên Vercel: Settings → Environment Variables → BACKEND_URL = https://$Domain (rồi Redeploy)."
