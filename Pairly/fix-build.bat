@echo off
echo ========================================
echo PAIRLY BUILD FIX SCRIPT
echo ========================================
echo.

echo [1/5] Stopping Metro bundler...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo [2/5] Cleaning Android build cache...
cd android
if exist .gradle rmdir /s /q .gradle
if exist build rmdir /s /q build
if exist app\build rmdir /s /q app\build
cd ..

echo [3/5] Cleaning CMake cache...
for /d /r node_modules %%d in (.cxx) do @if exist "%%d" rmdir /s /q "%%d"

echo [4/5] Cleaning Gradle cache...
cd android
call gradlew clean
cd ..

echo [5/5] Rebuilding...
echo.
echo ========================================
echo BUILD FIX COMPLETE!
echo ========================================
echo.
echo Now run: npx expo run:android
echo.
pause
