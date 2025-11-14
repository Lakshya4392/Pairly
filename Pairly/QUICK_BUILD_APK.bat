@echo off
echo ========================================
echo    PAIRLY - QUICK BUILD APK
echo ========================================
echo.
echo Building APK without cleaning...
echo.

cd android
call gradlew assembleRelease

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo    BUILD FAILED!
    echo ========================================
    echo.
    echo Try running CLEAN_BUILD_APK.bat instead
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    BUILD SUCCESSFUL!
echo ========================================
echo.
echo APK Location:
echo %cd%\app\build\outputs\apk\release\app-release.apk
echo.

pause
