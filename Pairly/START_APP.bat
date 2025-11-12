@echo off
echo Killing old Metro...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting Expo...
npx expo start --clear

pause
