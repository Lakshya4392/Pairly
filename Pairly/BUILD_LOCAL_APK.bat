@echo off
echo ========================================
echo Building Local APK for Pairly
echo ========================================
echo.

cd android

echo Step 1: Cleaning previous builds...
call gradlew.bat clean

echo.
echo Step 2: Building Debug APK...
call gradlew.bat assembleDebug --no-daemon --max-workers=2

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo APK Location:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo To install on device:
echo adb install app\build\outputs\apk\debug\app-debug.apk
echo.
pause
