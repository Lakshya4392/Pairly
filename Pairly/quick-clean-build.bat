@echo off
REM Pairly - Quick Clean Build (Gradle only)
REM Faster than full clean, fixes most APK issues

echo.
echo ========================================
echo    Pairly - Quick Clean Build
echo ========================================
echo.

if not exist "package.json" (
    echo ❌ Error: Run from Pairly directory
    pause
    exit /b 1
)

echo 🧹 Quick clean build starting...
echo.

REM Step 1: Clean Android build completely
echo 🔨 Step 1: Deep cleaning Android build...
cd android

REM Remove all build artifacts
if exist ".gradle" rmdir /s /q .gradle
if exist "app\build" rmdir /s /q app\build
if exist "build" rmdir /s /q build
if exist "app\.cxx" rmdir /s /q app\.cxx

echo ✅ Build artifacts removed
echo.

REM Step 2: Gradle clean
echo 🔨 Step 2: Gradle clean...
call gradlew clean --no-daemon
if errorlevel 1 (
    echo ❌ Gradle clean failed
    cd ..
    pause
    exit /b 1
)
echo ✅ Gradle clean done
echo.

REM Step 3: Export Expo assets fresh
cd ..
echo 📱 Step 3: Exporting Expo assets...
call npx expo export:embed
if errorlevel 1 (
    echo ❌ Expo export failed
    pause
    exit /b 1
)
echo ✅ Assets exported
echo.

REM Step 4: Build Release APK
cd android
echo 🔨 Step 4: Building Release APK...
echo.
echo Building... (this takes 3-5 minutes)
echo.

call gradlew assembleRelease --no-daemon --stacktrace --info
if errorlevel 1 (
    echo ❌ Build failed
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ✅ Build successful!
echo.

REM Step 5: Copy APK
echo 📋 Step 5: Copying APK...
set "apk_name=Pairly-clean.apk"

if exist "android\app\build\outputs\apk\release\app-release.apk" (
    copy "android\app\build\outputs\apk\release\app-release.apk" "%apk_name%"
    echo ✅ APK: %cd%\%apk_name%
    echo.
    
    REM Show APK size
    for %%A in ("%apk_name%") do (
        set size=%%~zA
        set /a sizeMB=!size! / 1048576
        echo 📦 Size: !sizeMB! MB
    )
) else (
    echo ❌ APK not found
    pause
    exit /b 1
)

echo.
echo ========================================
echo    ✅ DONE!
echo ========================================
echo.
echo 📱 APK: %apk_name%
echo.
echo 💡 Transfer Methods:
echo    1. USB Cable (Recommended)
echo    2. Google Drive
echo    3. Telegram
echo    4. Email
echo.
echo ⚠️  Avoid WhatsApp - it compresses files
echo.
pause
