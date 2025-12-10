@echo off
echo ========================================
echo PAIRLY BUILD TROUBLESHOOTER
echo ========================================
echo.

echo [1] Checking Android SDK...
if exist "%ANDROID_HOME%" (
    echo ✅ ANDROID_HOME: %ANDROID_HOME%
) else (
    echo ❌ ANDROID_HOME not set!
    echo Please set ANDROID_HOME environment variable
)

echo.
echo [2] Checking Java version...
java -version

echo.
echo [3] Checking Node version...
node --version
npm --version

echo.
echo [4] Checking emulator...
adb devices

echo.
echo [5] Checking Gradle...
cd android
call gradlew --version
cd ..

echo.
echo [6] Checking React Native...
npx react-native --version

echo.
echo [7] Checking Expo...
npx expo --version

echo.
echo [8] Checking problematic modules...
if exist "node_modules\react-native-worklets" (
    echo ⚠️ react-native-worklets found (may cause CMake issues)
) else (
    echo ✅ react-native-worklets not found
)

if exist "node_modules\react-native-reanimated" (
    echo ⚠️ react-native-reanimated found (may cause CMake issues)
) else (
    echo ✅ react-native-reanimated not found
)

echo.
echo ========================================
echo TROUBLESHOOTING COMPLETE!
echo ========================================
echo.
echo If you see any ❌ or ⚠️, fix those issues first.
echo Then run: clean-build.bat
echo.
pause