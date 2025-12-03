# ⚡ Google OAuth Quick Fix - 5 Minutes

## 🎯 Problem
Browser open hota hai → User sign-in karta hai → App par wapas nahi aata

## ✅ Solution (3 Steps)

---

## Step 1: Clerk Dashboard (2 min)

### Go to: https://dashboard.clerk.com/

1. **Enable Google OAuth**
   ```
   User & Authentication → Social Connections → Google → Enable
   ```

2. **Add Redirect URLs** ⚠️ MOST IMPORTANT
   ```
   Settings → Paths → Redirect URLs → Add these:
   
   pairly://oauth-native-callback
   exp+pairly://oauth-native-callback
   https://pairly.app/oauth-callback
   ```

3. **Save Changes**
   - Click "Save" button
   - Wait for confirmation

---

## Step 2: Google Cloud Console (2 min)

### Go to: https://console.cloud.google.com/

1. **Create OAuth Client**
   ```
   APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   
   Type: Android
   Package: com.pairly.app
   SHA-1: [Get from command below]
   ```

2. **Get SHA-1**
   ```bash
   cd android
   ./gradlew signingReport
   
   # Copy SHA-1 from output
   ```

3. **Add Redirect URIs**
   ```
   Click on OAuth Client → Authorized redirect URIs → Add:
   
   https://accounts.clerk.dev/v1/oauth_callback
   pairly://oauth-native-callback
   ```

4. **Copy Client ID & Secret**
   - Copy Client ID
   - Copy Client Secret
   - Paste in Clerk Dashboard (Step 1)

---

## Step 3: Test (1 min)

### Build & Test
```bash
# Build fresh APK
cd android
./gradlew assembleRelease

# Install
adb install app/build/outputs/apk/release/app-release.apk

# Test
# 1. Open app
# 2. Tap "Continue with Google"
# 3. Sign in
# 4. ✅ Should redirect back to app
```

---

## 🔍 Verify It's Working

### Expected Flow:
```
Tap "Continue with Google"
   ↓
Browser opens
   ↓
Sign in with Google
   ↓
✅ Browser closes automatically
   ↓
✅ Back in app
   ↓
✅ Signed in!
```

### Check Logs:
```bash
adb logcat | grep OAuth

# Should see:
🔵 Starting Google OAuth...
🔵 Redirect URL: pairly://oauth-native-callback
✅ Session created, activating...
✅ Google sign-in successful!
```

---

## 🐛 Still Not Working?

### Check These:

1. **Clerk Redirect URLs**
   - Must have: `pairly://oauth-native-callback`
   - Exact spelling, no typos
   - Click "Save"

2. **Google Cloud Console**
   - Package name: `com.pairly.app`
   - SHA-1 added
   - Redirect URIs added

3. **App Configuration**
   - app.json scheme: `pairly`
   - AndroidManifest has intent filters
   - Fresh build (not cached)

---

## 📋 Quick Checklist

- [ ] Clerk: Google OAuth enabled
- [ ] Clerk: Redirect URLs added (`pairly://oauth-native-callback`)
- [ ] Clerk: Saved changes
- [ ] Google: OAuth Client created
- [ ] Google: Package name correct (`com.pairly.app`)
- [ ] Google: SHA-1 added
- [ ] Google: Redirect URIs added
- [ ] App: Fresh build
- [ ] App: Installed on device
- [ ] Test: OAuth flow works

---

## 🎯 Most Common Mistake

### ❌ Wrong Redirect URL
```
pairly://oauth-callback  ← WRONG
pairly://callback        ← WRONG
```

### ✅ Correct Redirect URL
```
pairly://oauth-native-callback  ← CORRECT
```

**Make sure it's EXACTLY this in Clerk Dashboard!**

---

## 💡 Pro Tip

If still not working, try this:

1. **Clear Clerk cache:**
   ```bash
   # Uninstall app
   adb uninstall com.pairly.app
   
   # Clear data
   rm -rf android/app/build
   
   # Fresh install
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   adb install app/build/outputs/apk/release/app-release.apk
   ```

2. **Test with different Google account**
   - Some accounts have restrictions
   - Try personal Gmail account

3. **Check Clerk Dashboard Logs**
   - Dashboard → Logs
   - See OAuth errors in real-time

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Browser opens for Google sign-in
2. ✅ You sign in with Google
3. ✅ Browser closes automatically
4. ✅ You're back in the app
5. ✅ You're signed in (see main screen)
6. ✅ Logs show: "Google sign-in successful!"

---

## 🚀 That's It!

Follow these 3 steps and OAuth will work.

**Total time: ~5 minutes**

**Questions? Check:** `CLERK_GOOGLE_OAUTH_SETUP.md` for detailed guide.

---

**Last Updated:** December 1, 2025  
**Status:** ✅ Quick Fix Guide
