@echo off
echo ========================================
echo PAIRLY LOCAL BUILD FIX FOR EMULATOR
echo ========================================
echo.

echo [1/8] Killing all Node processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM java.exe 2>nul
timeout /t 3 >nul

echo [2/8] Cleaning Metro cache...
if exist node_modules\.metro rmdir /s /q node_modules\.metro
if exist .expo rmdir /s /q .expo
npx expo r -c

echo [3/8] Cleaning Android build directories...
cd android
if exist .gradle (
    echo Removing .gradle...
    rmdir /s /q .gradle
)
if exist build (
    echo Removing build...
    rmdir /s /q build
)
if exist app\build (
    echo Removing app\build...
    rmdir /s /q app\build
)
cd ..

echo [4/8] Cleaning CMake cache from all modules...
for /d /r node_modules %%d in (.cxx) do @if exist "%%d" (
    echo Removing CMake cache: %%d
    rmdir /s /q "%%d" 2>nul
)

echo [5/8] Cleaning Gradle wrapper cache...
if exist %USERPROFILE%\.gradle\wrapper rmdir /s /q %USERPROFILE%\.gradle\wrapper

echo [6/8] Running Gradle clean...
cd android
call gradlew clean --no-daemon
cd ..

echo [7/8] Clearing npm cache...
npm cache clean --force

echo [8/8] Installing fresh dependencies...
npm install

echo.
echo ========================================
echo CLEAN BUILD COMPLETE!
echo ========================================
echo.
echo Ready to build for emulator!
echo Run: npx expo run:android
echo.
pause