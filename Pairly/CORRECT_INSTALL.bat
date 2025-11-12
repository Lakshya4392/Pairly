@echo off
cls
echo ================================================
echo INSTALLING CORRECT EXPO SDK 54 VERSIONS
echo ================================================
echo.
echo React: 19.1.0
echo React Native: 0.81.5
echo Reanimated: 4.1.1 (New Architecture Compatible)
echo.

echo [1/5] Killing processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/5] Removing old files...
rmdir /s /q node_modules 2>nul
rmdir /s /q .expo 2>nul
rmdir /s /q android 2>nul
rmdir /s /q ios 2>nul
del package-lock.json 2>nul

echo [3/5] Cleaning caches...
rmdir /s /q "%TEMP%\metro-*" 2>nul
rmdir /s /q "%TEMP%\haste-map-*" 2>nul
call npm cache clean --force

echo [4/5] Installing dependencies...
call npm install --legacy-peer-deps

echo [5/5] Prebuild for native modules...
call npx expo prebuild --clean

echo.
echo ================================================
echo DONE! Now run: npx expo start --clear
echo ================================================
pause
