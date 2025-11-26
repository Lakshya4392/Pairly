@echo off
echo ========================================
echo Building RELEASE APK for Pairly
echo Production-Ready Build
echo ========================================
echo.

REM Step 1: Clean everything
echo [1/6] Cleaning previous builds...
cd android
call gradlew.bat clean
cd ..

REM Step 2: Clear Metro cache
echo.
echo [2/6] Clearing Metro cache...
rmdir /s /q node_modules\.cache 2>nul
rmdir /s /q .expo 2>nul

REM Step 3: Generate Android assets
echo.
echo [3/6] Generating Android assets...
cd android\app\src\main
if not exist assets mkdir assets
cd ..\..\..\..

REM Step 4: Bundle JavaScript
echo.
echo [4/6] Bundling JavaScript...
call npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/

REM Step 5: Build Release APK
echo.
echo [5/6] Building Release APK (this may take 5-10 minutes)...
cd android
call gradlew.bat assembleRelease --no-daemon --max-workers=2 --warning-mode=none

REM Step 6: Check if build succeeded
echo.
echo [6/6] Checking build status...
if exist app\build\outputs\apk\release\app-release.apk (
    echo.
    echo ========================================
    echo BUILD SUCCESSFUL! 
    echo ========================================
    echo.
    echo APK Location:
    echo %cd%\app\build\outputs\apk\release\app-release.apk
    echo.
    echo APK Size:
    for %%A in (app\build\outputs\apk\release\app-release.apk) do echo %%~zA bytes
    echo.
    echo To install on device:
    echo adb install app\build\outputs\apk\release\app-release.apk
    echo.
) else (
    echo.
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo.
    echo Check the error messages above.
    echo.
)

cd ..
pause
