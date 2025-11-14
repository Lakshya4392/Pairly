@echo off
echo ========================================
echo    PAIRLY - DEEP CLEAN
echo ========================================
echo.
echo This will clean EVERYTHING and take 5-10 minutes
echo Press Ctrl+C to cancel, or
pause
echo.

echo [1/8] Stopping Metro bundler...
taskkill /F /IM node.exe 2>nul
echo ✓ Metro stopped
echo.

echo [2/8] Cleaning Gradle...
cd android
call gradlew clean
rmdir /s /q .gradle 2>nul
rmdir /s /q app\build 2>nul
rmdir /s /q build 2>nul
echo ✓ Gradle cleaned
cd ..
echo.

echo [3/8] Cleaning node_modules...
rmdir /s /q node_modules
echo ✓ node_modules removed
echo.

echo [4/8] Cleaning npm cache...
call npm cache clean --force
echo ✓ npm cache cleaned
echo.

echo [5/8] Cleaning Metro cache...
rmdir /s /q %TEMP%\metro-* 2>nul
rmdir /s /q %TEMP%\react-* 2>nul
rmdir /s /q %LOCALAPPDATA%\Temp\metro-* 2>nul
echo ✓ Metro cache cleaned
echo.

echo [6/8] Cleaning Expo cache...
rmdir /s /q .expo 2>nul
rmdir /s /q .expo-shared 2>nul
echo ✓ Expo cache cleaned
echo.

echo [7/8] Reinstalling dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo ✓ Dependencies installed
echo.

echo [8/8] Cleaning Android build cache...
cd android
call gradlew clean
cd ..
echo ✓ Android cleaned
echo.

echo ========================================
echo    DEEP CLEAN COMPLETE!
echo ========================================
echo.
echo Your project is now completely clean.
echo You can now run: CLEAN_BUILD_APK.bat
echo.
pause
