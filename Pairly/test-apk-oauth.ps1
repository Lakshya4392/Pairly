# Test APK OAuth Deep Linking
# Run this to verify deep linking works in APK

Write-Host "🧪 ========== APK OAUTH TEST ==========" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check device
Write-Host "📱 Step 1: Checking device..." -ForegroundColor Yellow
$devices = adb devices | Select-String "device$"
if ($devices) {
    Write-Host "✅ Device connected" -ForegroundColor Green
} else {
    Write-Host "❌ No device connected!" -ForegroundColor Red
    Write-Host "   Connect device and try again" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 2: Check if app installed
Write-Host "📱 Step 2: Checking if app installed..." -ForegroundColor Yellow
$appInstalled = adb shell pm list packages | Select-String "com.pairly.app"
if ($appInstalled) {
    Write-Host "✅ App is installed" -ForegroundColor Green
} else {
    Write-Host "❌ App NOT installed!" -ForegroundColor Red
    Write-Host "   Build and install first:" -ForegroundColor Yellow
    Write-Host "   cd android" -ForegroundColor Yellow
    Write-Host "   .\gradlew assembleRelease" -ForegroundColor Yellow
    Write-Host "   adb install app\build\outputs\apk\release\app-release.apk" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 3: Test deep link
Write-Host "📱 Step 3: Testing deep link..." -ForegroundColor Yellow
Write-Host "   Sending: pairly://oauth-native-callback" -ForegroundColor Cyan
adb shell am start -W -a android.intent.action.VIEW -d "pairly://oauth-native-callback" com.pairly.app
Start-Sleep -Seconds 2
Write-Host ""

# Step 4: Check logs
Write-Host "📱 Step 4: Checking logs for deep link..." -ForegroundColor Yellow
$logs = adb logcat -d -s MainActivity:D | Select-String "Deep link" | Select-Object -Last 5
if ($logs) {
    Write-Host "✅ Deep link logs found:" -ForegroundColor Green
    $logs | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
} else {
    Write-Host "⚠️ No deep link logs found" -ForegroundColor Yellow
    Write-Host "   This might be normal if app just started" -ForegroundColor Gray
}
Write-Host ""

# Step 5: Instructions
Write-Host "📋 ========== NEXT STEPS ==========" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open app on device" -ForegroundColor White
Write-Host "2. Tap 'Continue with Google'" -ForegroundColor White
Write-Host "3. Sign in with Google in browser" -ForegroundColor White
Write-Host "4. Watch what happens:" -ForegroundColor White
Write-Host ""
Write-Host "Expected:" -ForegroundColor Green
Write-Host "   ✅ Browser opens" -ForegroundColor Green
Write-Host "   ✅ Sign in with Google" -ForegroundColor Green
Write-Host "   ✅ Browser redirects to: pairly://oauth-native-callback" -ForegroundColor Green
Write-Host "   ✅ App receives deep link" -ForegroundColor Green
Write-Host "   ✅ User is signed in" -ForegroundColor Green
Write-Host ""
Write-Host "If NOT working:" -ForegroundColor Red
Write-Host "   ❌ Browser doesn't redirect" -ForegroundColor Red
Write-Host "   ❌ Stuck in browser" -ForegroundColor Red
Write-Host "   ❌ needs_identifier error" -ForegroundColor Red
Write-Host ""

# Step 6: Monitor logs
Write-Host "📋 To monitor OAuth flow in real-time:" -ForegroundColor Cyan
Write-Host "   Run this in another terminal:" -ForegroundColor Yellow
Write-Host '   adb logcat -s "MainActivity:D" "ReactNativeJS:I" | Select-String "OAuth|Deep link|redirect"' -ForegroundColor Cyan
Write-Host ""

# Step 7: Clerk check
Write-Host "📋 Verify Clerk Dashboard:" -ForegroundColor Cyan
Write-Host "   1. Go to: https://dashboard.clerk.com/" -ForegroundColor White
Write-Host "   2. Settings → Paths → Redirect URLs" -ForegroundColor White
Write-Host "   3. Must have: pairly://oauth-native-callback" -ForegroundColor White
Write-Host "   4. Click 'Save'" -ForegroundColor White
Write-Host ""

Write-Host "🧪 ========== TEST READY ==========" -ForegroundColor Cyan
Write-Host "Now test OAuth in the app!" -ForegroundColor Green
