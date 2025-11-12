@echo off
cls
echo ================================================
echo FIXING TURBOMODULE REGISTRY ERROR
echo ================================================
echo.
echo This error happens due to React Native version mismatch
echo Fixing to exact Expo SDK 54 compatible version...
echo.

echo [1/5] Killing Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/5] Removing node_modules and caches...
rmdir /s /q node_modules 2>nul
rmdir /s /q .expo 2>nul
del package-lock.json 2>nul

echo [3/5] Cleaning all caches...
rmdir /s /q "%TEMP%\metro-*" 2>nul
rmdir /s /q "%TEMP%\haste-map-*" 2>nul
call npm cache clean --force

echo [4/5] Installing exact compatible versions...
call npm install --legacy-peer-deps

echo [5/5] Starting with clean cache...
echo.
echo ================================================
echo Starting Expo...
echo ================================================
timeout /t 2 /nobreak >nul

call npx expo start --clear

pause
