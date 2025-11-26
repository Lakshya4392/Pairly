@echo off
echo ========================================
echo Building DEBUG APK (Simpler & Faster)
echo ========================================
echo.

echo This will build a debug APK which is:
echo - Faster to build (2-3 minutes)
echo - More stable (fewer build errors)
echo - Larger file size (~80 MB)
echo - Good for testing
echo.

cd android

echo [1/2] Cleaning...
call gradlew.bat clean --warning-mode=none

echo.
echo [2/2] Building Debug APK...
call gradlew.bat assembleDebug --warning-mode=none

echo.
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo APK Location:
    echo %cd%\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo To install:
    echo adb install app\build\outputs\apk\debug\app-debug.apk
    echo.
) else (
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo Check errors above
    echo.
)

cd ..
pause
