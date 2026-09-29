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
# Phải DỪNG trước khi gỡ: gỡ service đang chạy thì Windows chỉ đánh dấu "chờ xoá" (Disabled) → cài mới thất bại,
# và sau khi khởi động lại máy ngrok không tự chạy nữa.
if (Get-Service -Name ngrok -ErrorAction SilentlyContinue) {
    Write-Host 'Gỡ service ngrok cũ…'
    # Service đang "chờ xoá" thì không mở được để dừng → tắt thẳng tiến trình, Windows sẽ xoá service.
    try { Stop-Service -Name ngrok -Force -ErrorAction Stop } catch { Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force }
    & $NgrokExe service uninstall 2>$null | Out-Null
    for ($i = 0; $i -lt 30 -and (Get-Service -Name ngrok -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Seconds 1 }
    if (Get-Service -Name ngrok -ErrorAction SilentlyContinue) {
        throw 'Windows chưa xoá xong service ngrok cũ — đóng cửa sổ Services (services.msc) / Task Manager nếu đang mở, rồi chạy lại script.'
    }
}
& $NgrokExe service install --config $config
if ($LASTEXITCODE -ne 0) { throw 'Cài service ngrok thất bại' }
sc.exe config ngrok start= auto | Out-Null              # tự chạy khi bật máy
sc.exe failure ngrok reset= 86400 actions= restart/5000/restart/5000/restart/30000 | Out-Null
Start-Service -Name ngrok
Start-Sleep -Seconds 4

$svc = Get-CimInstance Win32_Service -Filter "Name='ngrok'"
if ($svc.State -ne 'Running' -or $svc.StartMode -ne 'Auto') {
    throw "Service ngrok không ở trạng thái mong muốn (State=$($svc.State), StartMode=$($svc.StartMode))"
}

try {
    $health = (Invoke-WebRequest "https://$Domain/health" -UseBasicParsing -TimeoutSec 15 -Headers @{ 'ngrok-skip-browser-warning' = '1' }).Content
    Write-Host "`nXong: service ngrok đang chạy, tự khởi động cùng Windows. https://$Domain/health → $health" -ForegroundColor Green
} catch {
    Write-Warning "ngrok đã chạy nhưng chưa gọi được https://$Domain/health — kiểm tra service VietAnExpressApi đang chạy."
}
Write-Host "Trên Vercel: Settings → Environment Variables → BACKEND_URL = https://$Domain (rồi Redeploy)."
