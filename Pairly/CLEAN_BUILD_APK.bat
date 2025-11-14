@echo off
echo ========================================
echo    PAIRLY - CLEAN BUILD APK
echo ========================================
echo.

echo [1/5] Cleaning Gradle cache...
cd android
call gradlew clean
if %errorlevel% neq 0 (
    echo ERROR: Gradle clean failed!
    pause
    exit /b 1
)
echo ✓ Gradle cleaned
echo.

echo [2/5] Cleaning build folders...
rmdir /s /q app\build 2>nul
rmdir /s /q build 2>nul
rmdir /s /q .gradle 2>nul
echo ✓ Build folders cleaned
echo.

echo [3/5] Cleaning node modules cache...
cd ..
rmdir /s /q node_modules\.cache 2>nul
echo ✓ Cache cleaned
echo.

echo [4/5] Building Release APK...
cd android
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo ✓ APK built successfully!
echo.

echo [5/5] Locating APK...
set APK_PATH=app\build\outputs\apk\release\app-release.apk
if exist "%APK_PATH%" (
    echo ========================================
    echo    BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo APK Location:
    echo %cd%\%APK_PATH%
    echo.
    echo File size:
    for %%A in ("%APK_PATH%") do echo %%~zA bytes
    echo.
    echo You can now install this APK on your device!
    echo.
) else (
    echo ERROR: APK not found at expected location!
    echo Please check the build output above for errors.
)

pause
