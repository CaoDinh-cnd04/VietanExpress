#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Gỡ Windows Service của backend (và ngrok nếu muốn). Không xoá dữ liệu trong database.

.EXAMPLE
  .\scripts\uninstall-service.ps1                 # gỡ service, giữ thư mục cài đặt
  .\scripts\uninstall-service.ps1 -RemoveFiles    # gỡ và xoá C:\VietAnExpress\api
#>
param(
    [string]$ServiceName = 'VietAnExpressApi',
    [string]$InstallDir = 'C:\VietAnExpress\api',
    [switch]$RemoveFiles
)
$ErrorActionPreference = 'Stop'

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
    Write-Host "Đã gỡ service $ServiceName."
} else {
    Write-Host "Không có service $ServiceName."
}

if ($RemoveFiles -and (Test-Path $InstallDir)) {
    Remove-Item -Recurse -Force $InstallDir
    Write-Host "Đã xoá $InstallDir."
}
