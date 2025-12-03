# OAuth Redirect Test Script (PowerShell)
# Tests if deep linking is working properly

Write-Host "🧪 ========== OAUTH REDIRECT TEST ==========" -ForegroundColor Cyan
Write-Host ""

# Check if device is connected
Write-Host "📱 Checking for connected device..." -ForegroundColor Yellow
adb devices
Write-Host ""

# Test 1: Check if app is installed
Write-Host "✅ Test 1: Check if app is installed" -ForegroundColor Green
$appInstalled = adb shell pm list packages | Select-String "com.pairly.app"
if ($appInstalled) {
    Write-Host "✅ App is installed" -ForegroundColor Green
} else {
    Write-Host "❌ App is NOT installed" -ForegroundColor Red
    Write-Host "   Install with: adb install app\build\outputs\apk\release\app-release.apk" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: Check intent filters
Write-Host "✅ Test 2: Check intent filters for MainActivity" -ForegroundColor Green
adb shell dumpsys package com.pairly.app | Select-String -Pattern "Activity" -Context 0,20
Write-Host ""

# Test 3: Test deep link manually
Write-Host "✅ Test 3: Testing deep link redirect" -ForegroundColor Green
Write-Host "   Sending: pairly://oauth-native-callback" -ForegroundColor Yellow
adb shell am start -W -a android.intent.action.VIEW -d "pairly://oauth-native-callback" com.pairly.app
Write-Host ""

# Wait a bit for logs
Start-Sleep -Seconds 2

# Test 4: Check if deep link was received
Write-Host "✅ Test 4: Checking logs for deep link" -ForegroundColor Green
Write-Host "   Looking for 'Deep link received' in logs..." -ForegroundColor Yellow
adb logcat -d | Select-String -Pattern "deep link|oauth|MainActivity" | Select-Object -Last 20
Write-Host ""

# Test 5: Alternative deep link format
Write-Host "✅ Test 5: Testing alternative format" -ForegroundColor Green
Write-Host "   Sending: pairly://oauth-native-callback?code=test123" -ForegroundColor Yellow
adb shell am start -W -a android.intent.action.VIEW -d "pairly://oauth-native-callback?code=test123" com.pairly.app
Write-Host ""

# Wait for logs
Start-Sleep -Seconds 2

# Check logs again
Write-Host "📋 Recent logs:" -ForegroundColor Cyan
adb logcat -d | Select-String -Pattern "MainActivity|Deep link|OAuth" | Select-Object -Last 30
Write-Host ""

# Instructions
Write-Host "📋 ========== NEXT STEPS ==========" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. If deep link test worked, you should see:" -ForegroundColor White
Write-Host "   ✅ 'Deep link received' in logs" -ForegroundColor Green
Write-Host "   ✅ App opened/focused" -ForegroundColor Green
Write-Host ""
Write-Host "2. Now test real OAuth flow:" -ForegroundColor White
Write-Host "   - Open app" -ForegroundColor Yellow
Write-Host "   - Tap 'Continue with Google'" -ForegroundColor Yellow
Write-Host "   - Sign in with Google" -ForegroundColor Yellow
Write-Host "   - Watch logs: adb logcat | Select-String 'OAuth|redirect|Deep link'" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Expected OAuth logs:" -ForegroundColor White
Write-Host "   🔵 Starting Google OAuth..." -ForegroundColor Blue
Write-Host "   🔵 Redirect URL: pairly://oauth-native-callback" -ForegroundColor Blue
Write-Host "   🔗 Deep link received: pairly://oauth-native-callback?..." -ForegroundColor Blue
Write-Host "   ✅ Session created, activating..." -ForegroundColor Green
Write-Host "   ✅ Google sign-in successful!" -ForegroundColor Green
Write-Host ""
Write-Host "4. If redirect doesn't work, check:" -ForegroundColor White
Write-Host "   - Clerk Dashboard: Redirect URLs configured" -ForegroundColor Yellow
Write-Host "   - Google Cloud Console: Redirect URIs added" -ForegroundColor Yellow
Write-Host "   - AndroidManifest: Intent filters present" -ForegroundColor Yellow
Write-Host ""
Write-Host "🧪 ========== TEST COMPLETE ==========" -ForegroundColor Cyan
