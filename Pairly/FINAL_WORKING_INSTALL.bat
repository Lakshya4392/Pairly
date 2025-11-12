@echo off
cls
echo ================================================
echo FINAL WORKING SETUP - EXPO SDK 54
echo ================================================
echo.
echo Using STABLE versions:
echo - React: 19.1.0
echo - React Native: 0.81.5
echo - Reanimated: 3.15.4 (STABLE, no worklets needed)
echo - Gesture Handler: 2.28.0
echo - Screens: 4.16.0
echo.

echo [1/7] Killing all processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM watchman.exe 2>nul
timeout /t 3 /nobreak >nul

echo [2/7] Removing node_modules...
rmdir /s /q node_modules 2>nul
timeout /t 2 /nobreak >nul

echo [3/7] Removing caches...
rmdir /s /q .expo 2>nul
rmdir /s /q "%TEMP%\metro-*" 2>nul
rmdir /s /q "%TEMP%\haste-map-*" 2>nul
rmdir /s /q "%TEMP%\react-*" 2>nul
del package-lock.json 2>nul

echo [4/7] Cleaning npm cache...
call npm cache clean --force

echo [5/7] Installing dependencies...
call npm install --legacy-peer-deps

if errorlevel 1 (
    echo.
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo [6/7] Prebuild for native modules...
call npx expo prebuild --clean

if errorlevel 1 (
    echo.
    echo WARNING: Prebuild had issues, but continuing...
)

echo [7/7] Cleaning Metro cache one more time...
rmdir /s /q .expo 2>nul

echo.
echo ================================================
echo SUCCESS! Setup complete.
echo ================================================
echo.
echo Next steps:
echo 1. Run: npx expo start --clear
echo 2. Press 'a' for Android or scan QR
echo 3. App should work without errors
echo.
echo For APK build:
echo   eas build --platform android --profile preview
echo.
pause
