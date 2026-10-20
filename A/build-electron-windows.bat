@echo off
setlocal
title Kak Jule Studio - Windows Electron Builder
color 0E

REM Pastikan working directory selalu di folder file .bat ini berada
cd /d "%~dp0"

echo ======================================================================
echo     KAK JULE STUDIO - BUILD WINDOWS DESKTOP (.EXE)
echo ======================================================================
echo.

REM 1. Cek Ketersediaan Node.js di Sistem
where node >nul 2>nul
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js belum terdeteksi di komputer Anda!
    echo.
    echo Aplikasi ini membutuhkan Node.js untuk proses compile dan packaging.
    echo Silakan unduh dan instal Node.js LTS dari:
    echo    https://nodejs.org/
    echo.
    echo Catatan: Setelah instalasi Node.js selesai, tutup jendela ini lalu
    echo buka kembali file 'build-electron-windows.bat'.
    echo ======================================================================
    echo.
    pause
    exit /b 1
)

REM 2. Cek apakah node_modules sudah ada, jika belum jalankan npm install
if not exist "node_modules\" (
    echo [INFO] Folder node_modules belum ditemukan.
    echo [INFO] Memasang dependensi proyek (npm install), mohon tunggu...
    echo.
    call npm install
    if errorlevel 1 (
        color 0C
        echo [ERROR] Gagal menjalankan npm install. Periksa koneksi internet Anda.
        echo.
        pause
        exit /b 1
    )
)

REM 3. Jalankan Build Runner berbasis Node.js yang aman dan bebas crash
node scripts/build-electron.js %*
set BUILD_EXIT_CODE=%errorlevel%

echo.
if %BUILD_EXIT_CODE% equ 0 (
    echo ======================================================================
    echo [OK] Proses build telah selesai. Jendela ini dapat ditutup.
    echo ======================================================================
) else (
    echo ======================================================================
    echo [SELESAI] Proses build berakhir dengan status error (%BUILD_EXIT_CODE%).
    echo Tinjau informasi dan saran solusi di atas sebelum menutup jendela.
    echo ======================================================================
)

echo.
echo Tekan tombol apa saja untuk keluar...
pause >nul
exit /b %BUILD_EXIT_CODE%