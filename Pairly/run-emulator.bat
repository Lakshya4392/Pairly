@echo off
echo ========================================
echo PAIRLY EMULATOR BUILD & TEST
echo ========================================
echo.

echo [1/7] Checking emulator status...
adb devices
echo.

echo [2/7] Killing existing processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM java.exe 2>nul
timeout /t 2 >nul

echo [3/7] Cleaning build cache...
if exist android\.gradle rmdir /s /q android\.gradle
if exist android\build rmdir /s /q android\build
if exist android\app\build rmdir /s /q android\app\build

echo [4/7] Cleaning CMake cache...
for /d /r node_modules %%d in (.cxx) do @if exist "%%d" rmdir /s /q "%%d" 2>nul

echo [5/7] Starting Metro bundler...
start "Metro Bundler" cmd /c "npx expo start --clear --android"
timeout /t 8 >nul

echo [6/7] Building APK for emulator...
echo Building with x86_64 architecture only...
npx expo run:android --variant debug

echo [7/7] Build complete!
echo.
echo ========================================
echo EMULATOR BUILD FINISHED!
echo ========================================
echo.
echo Your app should now be running on emulator!
echo.
echo WIDGET TESTING:
echo 1. Long press on home screen
echo 2. Add "Pairly" widget
echo 3. Widget should poll backend every 10 seconds
echo.
echo CHECK LOGS:
echo adb logcat | grep "PairlyWidget"
echo adb logcat | grep "UPLOAD"
echo.
pause