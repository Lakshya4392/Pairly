@echo off
echo ========================================
echo PAIRLY EMULATOR BUILD SCRIPT
echo ========================================
echo.

echo [1/5] Checking emulator status...
adb devices
echo.

echo [2/5] Setting up emulator-optimized build...
copy android\gradle.properties.emulator android\gradle.properties
echo Emulator build configuration applied!

echo [3/5] Starting Metro bundler...
start "Metro" cmd /c "npx expo start --clear"
timeout /t 5 >nul

echo [4/5] Building for emulator (x86_64 only)...
npx expo run:android --variant debug

echo [5/5] Build complete!
echo.
echo ========================================
echo EMULATOR BUILD FINISHED!
echo ========================================
echo.
echo Your app should now be running on emulator!
echo.
pause