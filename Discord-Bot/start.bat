@echo off
title Albe Bot - Discord Bot
color 0A
cd /d %~dp0

echo ============================================
echo        ALBE BOT BASLATILIYOR
echo ============================================
echo.

echo [1/3] Paketler kontrol ediliyor...
call npm install
if errorlevel 1 (
    echo [!] Paket kurulumu basarisiz oldu!
    pause
    exit /b 1
)

echo [2/3] .env kontrol ediliyor...
if not exist ".env" (
    echo [!] .env dosyasi bulunamadi! .env.example dosyasini kopyalayin.
    pause
    exit /b 1
)

echo [3/3] Bot baslatiliyor...
node index.js
pause
