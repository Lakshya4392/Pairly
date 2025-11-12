@echo off
echo Killing all Node processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM watchman.exe 2>nul
taskkill /F /IM adb.exe 2>nul

echo Waiting for processes to close...
timeout /t 3 /nobreak >nul

echo Removing node_modules...
rmdir /s /q node_modules 2>nul

echo Waiting...
timeout /t 2 /nobreak >nul

echo Removing other folders...
rmdir /s /q .expo 2>nul
rmdir /s /q android 2>nul
rmdir /s /q ios 2>nul
del package-lock.json 2>nul

echo Installing dependencies...
npm install --legacy-peer-deps

echo.
echo Done! Now run: npx expo start --clear
pause
