@echo off
REM Pairly - Local APK Build Script
REM Builds APK using Gradle (no EAS needed)

echo.
echo ========================================
echo    Pairly - Local APK Builder
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found
    echo Please run this script from the Pairly directory
    pause
    exit /b 1
)

REM Step 1: Install dependencies
echo 📦 Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ npm install failed
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

REM Step 2: Export Expo assets
echo 📱 Step 2: Exporting Expo assets...
call npx expo export:embed
if errorlevel 1 (
    echo ❌ Expo export failed
    pause
    exit /b 1
)
echo ✅ Assets exported
echo.

REM Step 3: Clean previous builds
echo 🧹 Step 3: Cleaning previous builds...
cd android
call gradlew clean
if errorlevel 1 (
    echo ❌ Gradle clean failed
    cd ..
    pause
    exit /b 1
)
echo ✅ Clean completed
echo.

REM Step 4: Build APK
echo 🔨 Step 4: Building APK...
echo.
echo Choose build type:
echo 1. Debug APK (Fast, for testing)
echo 2. Release APK (Optimized, smaller size)
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Building Debug APK...
    call gradlew assembleDebug
    set "apk_path=app\build\outputs\apk\debug\app-debug.apk"
    set "apk_name=Pairly-debug.apk"
) else if "%choice%"=="2" (
    echo.
    echo Building Release APK...
    call gradlew assembleRelease
    set "apk_path=app\build\outputs\apk\release\app-release.apk"
    set "apk_name=Pairly-release.apk"
) else (
    echo ❌ Invalid choice
    cd ..
    pause
    exit /b 1
)

if errorlevel 1 (
    echo ❌ APK build failed
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ✅ APK built successfully!
echo.

REM Step 5: Copy APK to root directory
echo 📋 Step 5: Copying APK to root directory...
if exist "android\%apk_path%" (
    copy "android\%apk_path%" "%apk_name%"
    echo ✅ APK copied to: %cd%\%apk_name%
) else (
    echo ❌ APK not found at expected location
    pause
    exit /b 1
)

echo.
echo ========================================
echo    ✅ BUILD COMPLETE!
echo ========================================
echo.
echo 📱 APK Location: %cd%\%apk_name%
echo 📦 APK Size: 
for %%A in ("%apk_name%") do echo    %%~zA bytes
echo.
echo 📋 Next Steps:
echo 1. Transfer APK to your Android device
echo 2. Enable "Install from Unknown Sources"
echo 3. Install the APK
echo 4. Test the app!
echo.
echo 🎉 Happy Testing!
echo.
pause
