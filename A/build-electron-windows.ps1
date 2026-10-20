# build-electron-windows.ps1
# PowerShell build script for Kak Jule Electron Windows Executable

Set-Location $PSScriptRoot

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   BUILD KAK JULE WINDOWS DESKTOP (.EXE) DENGAN ELECTRON (POWERSHELL)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Cek Node.js
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js belum terpasang di sistem!" -ForegroundColor Red
    Write-Host "Silakan unduh dan pasang Node.js LTS dari https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "`nTekan tombol apa saja untuk keluar..."
    [Console]::ReadKey($true) | Out-Null
    exit 1
}

# 2. Jalankan Build Runner berbasis Node.js
node scripts/build-electron.js $args

Write-Host "`nTekan tombol apa saja untuk menutup jendela ini..." -ForegroundColor Yellow
[Console]::ReadKey($true) | Out-Null
