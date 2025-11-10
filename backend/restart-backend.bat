@echo off
echo Stopping any existing backend processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq backend*" 2>nul

echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo Starting backend server...
echo.
npm run dev
