@echo off
echo Cleaning up old files...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

rmdir /s /q node_modules 2>nul
rmdir /s /q .expo 2>nul
rmdir /s /q android 2>nul
rmdir /s /q ios 2>nul
del package-lock.json 2>nul

echo Installing dependencies...
npm install --legacy-peer-deps

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Run: npx expo start --clear
echo 2. Press 'a' for Android or scan QR for device
echo.
pause
