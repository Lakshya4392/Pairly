@echo off
echo ========================================
echo Building Standalone Release APK
echo ========================================
echo.

cd android

echo Step 1: Cleaning...
call gradlew clean

echo.
echo Step 2: Building Release APK...
call gradlew assembleRelease

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo APK Location:
echo android\app\build\outputs\apk\release\app-release.apk
echo.
echo This APK works WITHOUT Metro bundler!
echo Install on phone and it will work independently.
echo.
pause
