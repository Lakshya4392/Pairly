@echo off
echo ========================================
echo Building Debug APK for Testing
echo ========================================
echo.

cd android

echo Cleaning previous builds...
call gradlew clean

echo.
echo Building Debug APK...
call gradlew assembleDebug

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo APK Location:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Transfer this APK to your phone and install!
echo.
pause
