#!/bin/bash

# OAuth Redirect Test Script
# Tests if deep linking is working properly

echo "🧪 ========== OAUTH REDIRECT TEST =========="
echo ""

# Check if device is connected
echo "📱 Checking for connected device..."
adb devices
echo ""

# Test 1: Check if app is installed
echo "✅ Test 1: Check if app is installed"
adb shell pm list packages | grep com.pairly.app
if [ $? -eq 0 ]; then
    echo "✅ App is installed"
else
    echo "❌ App is NOT installed"
    echo "   Install with: adb install app/build/outputs/apk/release/app-release.apk"
    exit 1
fi
echo ""

# Test 2: Check intent filters
echo "✅ Test 2: Check intent filters for MainActivity"
adb shell dumpsys package com.pairly.app | grep -A 20 "Activity"
echo ""

# Test 3: Test deep link manually
echo "✅ Test 3: Testing deep link redirect"
echo "   Sending: pairly://oauth-native-callback"
adb shell am start -W -a android.intent.action.VIEW -d "pairly://oauth-native-callback" com.pairly.app
echo ""

# Test 4: Check if deep link was received
echo "✅ Test 4: Checking logs for deep link"
echo "   Looking for 'Deep link received' in logs..."
adb logcat -d | grep -i "deep link\|oauth\|MainActivity" | tail -20
echo ""

# Test 5: Alternative deep link format
echo "✅ Test 5: Testing alternative format"
echo "   Sending: pairly://oauth-native-callback?code=test123"
adb shell am start -W -a android.intent.action.VIEW -d "pairly://oauth-native-callback?code=test123" com.pairly.app
echo ""

# Instructions
echo "📋 ========== NEXT STEPS =========="
echo ""
echo "1. If deep link test worked, you should see:"
echo "   ✅ 'Deep link received' in logs"
echo "   ✅ App opened/focused"
echo ""
echo "2. Now test real OAuth flow:"
echo "   - Open app"
echo "   - Tap 'Continue with Google'"
echo "   - Sign in with Google"
echo "   - Watch logs: adb logcat | grep -E 'OAuth|redirect|Deep link'"
echo ""
echo "3. Expected OAuth logs:"
echo "   🔵 Starting Google OAuth..."
echo "   🔵 Redirect URL: pairly://oauth-native-callback"
echo "   🔗 Deep link received: pairly://oauth-native-callback?..."
echo "   ✅ Session created, activating..."
echo "   ✅ Google sign-in successful!"
echo ""
echo "4. If redirect doesn't work, check:"
echo "   - Clerk Dashboard: Redirect URLs configured"
echo "   - Google Cloud Console: Redirect URIs added"
echo "   - AndroidManifest: Intent filters present"
echo ""
echo "🧪 ========== TEST COMPLETE =========="
