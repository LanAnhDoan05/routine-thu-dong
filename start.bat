@echo off
title Routine Thu Dong - Full System Launcher
echo ========================================================
echo        ROUTINE THU DONG - HE THONG KHOI DONG TOAN DIEN
echo ========================================================
echo.
echo 1. Khoi dong Backend API (Port 5001)...
start "Routine Backend API" cmd /k "cd /d %~dp0backend && node ./bin/www"

echo 2. Khoi dong Frontend Storefront (Port 3000)...
start "Routine Frontend Storefront" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ========================================================
echo He thong dang duoc khoi dong:
echo - Frontend Storefront: http://localhost:3000
echo - Backend API:         http://localhost:5001
echo - API Health Check:    http://localhost:5001/api/v1/health
echo - Admin Panel:         http://localhost:3000/admin/dashboard
echo.
echo Tai khoan Admin:       admin_new@routine.vn / Admin@123456
echo Tai khoan Customer:    khachhang@routine.vn / Customer@123456
echo ========================================================
pause
