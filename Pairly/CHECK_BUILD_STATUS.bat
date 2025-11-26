@echo off
echo ========================================
echo Checking APK Build Status
echo ========================================
echo.

if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo ✅ BUILD SUCCESSFUL!
    echo.
    echo APK Location:
    echo %cd%\android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo APK Size:
    for %%A in (android\app\build\outputs\apk\release\app-release.apk) do echo %%~zA bytes (%%~zAKB)
    echo.
    echo To install:
    echo adb install android\app\build\outputs\apk\release\app-release.apk
) else (
    echo ⏳ Build is still in progress or failed...
    echo.
    echo Check the Gradle process in Task Manager
    echo Look for "java.exe" process
    echo.
    echo Or check build logs in:
    echo android\app\build\
)

echo.
pause
