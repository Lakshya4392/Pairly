@echo off
REM Pairly - Complete Clean & Fresh APK Build
REM Fixes corrupt APK issues

echo.
echo ========================================
echo    Pairly - Clean Build Script
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found
    echo Please run this script from the Pairly directory
    pause
    exit /b 1
)

echo 🧹 Starting complete clean build process...
echo.

REM Step 1: Clean Metro bundler cache
echo 📦 Step 1: Cleaning Metro bundler cache...
call npx react-native start --reset-cache --no-interactive & timeout /t 3 & taskkill /F /IM node.exe 2>nul
echo ✅ Metro cache cleared
echo.

REM Step 2: Clean Expo cache
echo 📱 Step 2: Cleaning Expo cache...
call npx expo start --clear
timeout /t 2
taskkill /F /IM node.exe 2>nul
echo ✅ Expo cache cleared
echo.

REM Step 3: Clean node_modules and reinstall
echo 📦 Step 3: Cleaning node_modules...
if exist "node_modules" (
    echo Removing node_modules...
    rmdir /s /q node_modules
)
if exist "package-lock.json" (
    del package-lock.json
)
echo ✅ node_modules cleaned
echo.

echo 📦 Installing fresh dependencies...
call npm install
if errorlevel 1 (
    echo ❌ npm install failed
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

REM Step 4: Clean Android build
echo 🧹 Step 4: Cleaning Android build...
cd android

REM Clean Gradle cache
if exist ".gradle" (
    echo Removing .gradle cache...
    rmdir /s /q .gradle
)

REM Clean build outputs
if exist "app\build" (
    echo Removing app\build...
    rmdir /s /q app\build
)

if exist "build" (
    echo Removing build...
    rmdir /s /q build
)

echo ✅ Android build cleaned
echo.

REM Step 5: Gradle clean
echo 🔨 Step 5: Running Gradle clean...
call gradlew clean
if errorlevel 1 (
    echo ❌ Gradle clean failed
    cd ..
    pause
    exit /b 1
)
echo ✅ Gradle clean completed
echo.

REM Step 6: Export fresh Expo assets
cd ..
echo 📱 Step 6: Exporting fresh Expo assets...
call npx expo export:embed
if errorlevel 1 (
    echo ❌ Expo export failed
    pause
    exit /b 1
)
echo ✅ Assets exported
echo.

REM Step 7: Build fresh APK
cd android
echo 🔨 Step 7: Building fresh Release APK...
echo.
echo This may take 5-10 minutes...
echo.

call gradlew assembleRelease --no-daemon --stacktrace
if errorlevel 1 (
    echo ❌ APK build failed
    echo Check the error messages above
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ✅ APK built successfully!
echo.

REM Step 8: Copy APK with timestamp
echo 📋 Step 8: Copying APK...
set timestamp=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%
set "apk_name=Pairly-v1.0-%timestamp%.apk"

if exist "android\app\build\outputs\apk\release\app-release.apk" (
    copy "android\app\build\outputs\apk\release\app-release.apk" "%apk_name%"
    echo ✅ APK copied to: %cd%\%apk_name%
) else (
    echo ❌ APK not found at expected location
    pause
    exit /b 1
)

echo.
echo ========================================
echo    ✅ CLEAN BUILD COMPLETE!
echo ========================================
echo.
echo 📱 APK Location: %cd%\%apk_name%
echo.
echo 📦 APK Size: 
for %%A in ("%apk_name%") do (
    set size=%%~zA
    set /a sizeMB=!size! / 1048576
    echo    !sizeMB! MB
)
echo.
echo 📋 APK Details:
echo    - Fresh build with no cache
echo    - Release optimized
echo    - Ready for WhatsApp/sharing
echo.
echo 🎯 Next Steps:
echo 1. Transfer APK to phone via USB or cloud
echo 2. Or use: adb install "%apk_name%"
echo 3. Enable "Install from Unknown Sources"
echo 4. Install and test!
echo.
echo 💡 Tip: If WhatsApp still shows corrupt:
echo    - Use Google Drive or Telegram instead
echo    - Or transfer via USB cable
echo    - WhatsApp compresses files which can cause issues
echo.
pause
