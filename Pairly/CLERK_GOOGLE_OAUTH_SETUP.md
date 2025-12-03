# 🔐 Clerk + Google OAuth Complete Setup Guide

## 🎯 Problem
Google OAuth browser open hota hai, user sign-in karta hai, but wapas app par redirect nahi hota.

## ✅ Solution
Proper redirect URL configuration in Clerk Dashboard aur Google Cloud Console.

---

## 📋 Step-by-Step Setup

### Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create/Select Project**
   - Create new project: "Pairly"
   - Or select existing project

3. **Enable Google+ API**
   - Go to: APIs & Services → Library
   - Search: "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to: APIs & Services → Credentials
   - Click: "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Android"
   - Name: "Pairly Android"

5. **Configure Android OAuth Client**
   ```
   Package name: com.pairly.app
   SHA-1 certificate fingerprint: [Your debug/release SHA-1]
   ```

6. **Get SHA-1 Fingerprint**
   ```bash
   # Debug SHA-1
   cd android
   ./gradlew signingReport
   
   # Or use keytool
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

7. **Copy Client ID**
   - Copy the "Client ID" (looks like: xxxxx.apps.googleusercontent.com)
   - You'll need this for Clerk

---

### Step 2: Clerk Dashboard Setup

1. **Go to Clerk Dashboard**
   - Visit: https://dashboard.clerk.com/
   - Select your application

2. **Enable Google OAuth**
   - Go to: User & Authentication → Social Connections
   - Enable "Google"
   - Click "Configure"

3. **Use Custom Credentials**
   - Toggle: "Use custom credentials" → ON
   - Paste your Google Client ID
   - Paste your Google Client Secret (from Google Cloud Console)
   - Save

4. **Configure Redirect URLs** ⚠️ CRITICAL
   Add these EXACT URLs in Clerk Dashboard:
   ```
   pairly://oauth-native-callback
   exp+pairly://oauth-native-callback
   https://pairly.app/oauth-callback
   ```

   **Where to add:**
   - Clerk Dashboard → Settings → Paths
   - Or in OAuth provider settings
   - Make sure to click "Save"

5. **Verify Settings**
   - Google OAuth: ✅ Enabled
   - Custom credentials: ✅ Configured
   - Redirect URLs: ✅ Added
   - Save all changes

---

### Step 3: Google Cloud Console - Add Redirect URIs

1. **Go back to Google Cloud Console**
   - APIs & Services → Credentials
   - Click on your OAuth 2.0 Client ID

2. **Add Authorized Redirect URIs**
   Add these URIs:
   ```
   https://accounts.clerk.dev/v1/oauth_callback
   https://[your-clerk-frontend-api]/v1/oauth_callback
   pairly://oauth-native-callback
   ```

3. **Get Clerk Frontend API**
   - Clerk Dashboard → API Keys
   - Copy "Frontend API" (looks like: clerk.xxxxx.lcl.dev)
   - Use in redirect URI above

4. **Save Changes**

---

### Step 4: App Configuration (Already Done ✅)

#### app.json
```json
{
  "expo": {
    "scheme": "pairly",
    "android": {
      "package": "com.pairly.app"
    }
  }
}
```

#### AndroidManifest.xml
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW"/>
  <category android:name="android.intent.category.DEFAULT"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <data android:scheme="pairly"/>
  <data android:scheme="exp+pairly"/>
</intent-filter>
```

#### AuthScreen.tsx
```typescript
const redirectUrl = 'pairly://oauth-native-callback';
const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow({
  redirectUrl: redirectUrl,
});
```

---

## 🔍 Verification Checklist

### Google Cloud Console
- [ ] Project created
- [ ] Google+ API enabled
- [ ] OAuth 2.0 Client ID created (Android)
- [ ] Package name: `com.pairly.app`
- [ ] SHA-1 fingerprint added
- [ ] Authorized redirect URIs added
- [ ] Client ID copied

### Clerk Dashboard
- [ ] Google OAuth enabled
- [ ] Custom credentials configured
- [ ] Client ID pasted
- [ ] Client Secret pasted
- [ ] Redirect URLs added:
  - [ ] `pairly://oauth-native-callback`
  - [ ] `exp+pairly://oauth-native-callback`
  - [ ] `https://pairly.app/oauth-callback`
- [ ] All changes saved

### App Configuration
- [ ] app.json scheme: `pairly`
- [ ] AndroidManifest intent filters added
- [ ] AuthScreen redirect URL: `pairly://oauth-native-callback`
- [ ] Package name matches: `com.pairly.app`

---

## 🧪 Testing

### Test Flow
```
1. Open app
   ↓
2. Tap "Continue with Google"
   ↓
3. Browser opens with Google sign-in
   ↓
4. Select Google account
   ↓
5. Grant permissions
   ↓
6. ✅ Browser redirects to: pairly://oauth-native-callback
   ↓
7. ✅ App receives redirect
   ↓
8. ✅ Session created
   ↓
9. ✅ User signed in
   ↓
10. ✅ Navigate to main screen
```

### Debug Logs
```bash
# Monitor OAuth flow
adb logcat | grep -E "OAuth|Clerk|Google|redirect"

# Expected logs:
🔵 Starting Google OAuth...
🔵 Redirect URL: pairly://oauth-native-callback
🔵 OAuth flow returned
✅ Session created, activating...
✅ Google sign-in successful!
```

---

## 🐛 Troubleshooting

### Issue 1: Browser doesn't redirect back to app
**Cause:** Redirect URL not configured in Clerk  
**Solution:**
1. Check Clerk Dashboard → Redirect URLs
2. Add: `pairly://oauth-native-callback`
3. Save and try again

### Issue 2: "OAuth redirect failed"
**Cause:** Mismatch between app scheme and redirect URL  
**Solution:**
1. Verify app.json scheme: `pairly`
2. Verify AndroidManifest intent filter
3. Verify redirect URL in code: `pairly://oauth-native-callback`
4. All must match exactly

### Issue 3: "Invalid OAuth client"
**Cause:** Google Cloud Console not configured  
**Solution:**
1. Check Google Cloud Console credentials
2. Verify package name: `com.pairly.app`
3. Add SHA-1 fingerprint
4. Add authorized redirect URIs

### Issue 4: Works in dev but not in APK
**Cause:** Different SHA-1 for release build  
**Solution:**
1. Get release SHA-1:
   ```bash
   keytool -list -v -keystore your-release-key.keystore
   ```
2. Add release SHA-1 to Google Cloud Console
3. Rebuild APK

### Issue 5: "Sign-in was cancelled"
**Cause:** User closed browser before completing  
**Solution:**
- User should complete sign-in in browser
- Don't close browser manually
- Wait for automatic redirect

---

## 📱 Build & Test

### Clean Build
```bash
# Clear cache
npm start -- --clear

# Clean Android build
cd android
./gradlew clean

# Build fresh APK
./gradlew assembleRelease

# Install
adb install app/build/outputs/apk/release/app-release.apk
```

### Test OAuth
```bash
# Monitor logs
adb logcat -c  # Clear logs
adb logcat | grep -i oauth

# Test sign-in
# Tap "Continue with Google" in app
# Watch logs for redirect
```

---

## 🎯 Expected Redirect Flow

### Successful Flow
```
User taps "Continue with Google"
   ↓
App calls: startOAuthFlow({ redirectUrl: 'pairly://oauth-native-callback' })
   ↓
Browser opens: https://accounts.google.com/...
   ↓
User signs in with Google
   ↓
Google redirects to: https://accounts.clerk.dev/v1/oauth_callback?...
   ↓
Clerk processes OAuth
   ↓
Clerk redirects to: pairly://oauth-native-callback?...
   ↓
Android receives intent with scheme "pairly"
   ↓
MainActivity handles intent
   ↓
Clerk SDK processes callback
   ↓
Session created
   ↓
User signed in ✅
```

---

## 📚 Important URLs

### Clerk Dashboard
- Main: https://dashboard.clerk.com/
- Social Connections: Dashboard → User & Authentication → Social Connections
- API Keys: Dashboard → API Keys
- Paths: Dashboard → Settings → Paths

### Google Cloud Console
- Main: https://console.cloud.google.com/
- Credentials: APIs & Services → Credentials
- OAuth Consent: APIs & Services → OAuth consent screen

### Documentation
- Clerk OAuth: https://clerk.com/docs/authentication/social-connections/oauth
- Clerk React Native: https://clerk.com/docs/quickstarts/react-native
- Google OAuth: https://developers.google.com/identity/protocols/oauth2

---

## ✅ Final Checklist

Before testing, verify ALL of these:

### Google Cloud Console ✓
- [ ] OAuth 2.0 Client ID created
- [ ] Package name: `com.pairly.app`
- [ ] SHA-1 fingerprint added (debug + release)
- [ ] Authorized redirect URIs:
  - [ ] `https://accounts.clerk.dev/v1/oauth_callback`
  - [ ] `https://[your-clerk-frontend-api]/v1/oauth_callback`
  - [ ] `pairly://oauth-native-callback`

### Clerk Dashboard ✓
- [ ] Google OAuth enabled
- [ ] Custom credentials configured
- [ ] Client ID from Google Cloud Console
- [ ] Client Secret from Google Cloud Console
- [ ] Redirect URLs configured:
  - [ ] `pairly://oauth-native-callback`
  - [ ] `exp+pairly://oauth-native-callback`
  - [ ] `https://pairly.app/oauth-callback`

### App Code ✓
- [ ] app.json scheme: `pairly`
- [ ] AndroidManifest intent filters
- [ ] AuthScreen redirect URL: `pairly://oauth-native-callback`
- [ ] WebBrowser.maybeCompleteAuthSession() called

### Testing ✓
- [ ] Fresh build
- [ ] Clear app data
- [ ] Test OAuth flow
- [ ] Verify redirect works
- [ ] Check logs for errors

---

## 🚀 Quick Test Command

```bash
# Complete test sequence
cd android
./gradlew clean
./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
adb logcat -c
adb logcat | grep -E "OAuth|Clerk|redirect"

# Now test in app:
# 1. Tap "Continue with Google"
# 2. Sign in with Google
# 3. Watch logs for redirect
# 4. Should see: ✅ Google sign-in successful!
```

---

## 💡 Pro Tips

1. **Always use exact redirect URL format:**
   - ✅ `pairly://oauth-native-callback`
   - ❌ `pairly://oauth-callback`
   - ❌ `pairly://callback`

2. **Add both debug and release SHA-1:**
   - Debug for development
   - Release for production APK

3. **Test in incognito/private browser:**
   - Avoids cached Google sessions
   - Tests fresh OAuth flow

4. **Check Clerk logs:**
   - Clerk Dashboard → Logs
   - See OAuth attempts and errors

5. **Use Clerk development instance:**
   - Easier to debug
   - Can switch to production later

---

## 📞 Support

If still not working:

1. **Check Clerk Dashboard Logs**
   - See exact error messages
   - Verify OAuth attempts

2. **Check Android Logcat**
   - Look for redirect errors
   - Verify intent handling

3. **Verify all URLs match exactly**
   - Case-sensitive
   - No typos
   - No extra slashes

4. **Try with different Google account**
   - Some accounts may have restrictions

5. **Contact Clerk Support**
   - They can check backend logs
   - Verify configuration

---

**Last Updated:** December 1, 2025  
**Status:** ✅ Complete Setup Guide  
**Next Step:** Follow checklist and test! 🚀
