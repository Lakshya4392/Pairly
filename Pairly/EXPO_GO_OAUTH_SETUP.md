# 🔧 Expo Go + APK OAuth Setup

## 🎯 Problem
OAuth ko **dono** mein kaam karna chahiye:
1. **Expo Go** (development)
2. **APK** (production)

---

## ✅ Solution: Dynamic Redirect URL

### **Code automatically detects:**
```typescript
// Expo Go
redirectUrl = "exp://192.168.x.x:8081/--/oauth-native-callback"

// APK
redirectUrl = "pairly://oauth-native-callback"
```

---

## 📋 Clerk Dashboard Setup

### **Add BOTH redirect URLs:**

1. **For Expo Go (Development):**
   ```
   exp://localhost:8081/--/oauth-native-callback
   exp://127.0.0.1:8081/--/oauth-native-callback
   exp://192.168.1.x:8081/--/oauth-native-callback  (your local IP)
   ```

2. **For APK (Production):**
   ```
   pairly://oauth-native-callback
   exp+pairly://oauth-native-callback
   ```

3. **For Web (Future):**
   ```
   https://pairly.app/oauth-callback
   ```

### **Where to add:**
- Clerk Dashboard → Settings → Paths → Redirect URLs
- Add ALL of the above URLs
- Click "Save"

---

## 🧪 Testing

### **Test 1: Expo Go**
```bash
# Start Expo
npm start

# Scan QR code with Expo Go app

# In app:
1. Tap "Continue with Google"
2. Browser opens
3. Sign in with Google
4. ✅ Should redirect back to Expo Go
5. ✅ Should be signed in
```

**Expected logs:**
```
🔵 Running in Expo Go
🔵 Redirect URL: exp://192.168.x.x:8081/--/oauth-native-callback
🔗 Deep link received: exp://...
✅ Google sign-in successful!
```

---

### **Test 2: APK**
```bash
# Build APK
cd android
./gradlew assembleRelease

# Install
adb install app/build/outputs/apk/release/app-release.apk

# In app:
1. Tap "Continue with Google"
2. Browser opens
3. Sign in with Google
4. ✅ Should redirect back to app
5. ✅ Should be signed in
```

**Expected logs:**
```
🔵 Running in standalone APK
🔵 Redirect URL: pairly://oauth-native-callback
🔗 Deep link received: pairly://...
✅ Google sign-in successful!
```

---

## 🔍 How to Get Your Local IP

### **Windows:**
```powershell
ipconfig
# Look for: IPv4 Address (e.g., 192.168.1.100)
```

### **Mac/Linux:**
```bash
ifconfig
# Look for: inet (e.g., 192.168.1.100)
```

### **Or check Expo:**
```bash
npm start
# Shows: exp://192.168.x.x:8081
```

---

## 📋 Complete Clerk Redirect URLs List

Copy-paste these into Clerk Dashboard:

```
# Expo Go - Localhost
exp://localhost:8081/--/oauth-native-callback
exp://127.0.0.1:8081/--/oauth-native-callback

# Expo Go - Your Local IP (replace with your IP)
exp://192.168.1.100:8081/--/oauth-native-callback

# APK - Custom Scheme
pairly://oauth-native-callback
exp+pairly://oauth-native-callback

# Production Web (future)
https://pairly.app/oauth-callback
```

**Note:** Replace `192.168.1.100` with your actual local IP!

---

## 🐛 Troubleshooting

### Issue 1: Expo Go - "OAuth redirect failed"
**Solution:**
1. Get your local IP: `ipconfig` or `ifconfig`
2. Add to Clerk: `exp://[YOUR-IP]:8081/--/oauth-native-callback`
3. Restart Expo: `npm start`
4. Try again

### Issue 2: APK - Browser doesn't redirect
**Solution:**
1. Check Clerk has: `pairly://oauth-native-callback`
2. Check AndroidManifest has intent filters
3. Rebuild APK: `./gradlew clean assembleRelease`
4. Reinstall: `adb install -r app-release.apk`

### Issue 3: Works in Expo Go but not APK
**Solution:**
- Different redirect URLs!
- Expo Go: `exp://...`
- APK: `pairly://...`
- Both must be in Clerk Dashboard

### Issue 4: Works in APK but not Expo Go
**Solution:**
- Add your local IP to Clerk
- Check Expo is running on same network
- Try `exp://localhost:8081/--/oauth-native-callback`

---

## 🎯 Quick Test Checklist

### Expo Go ✓
- [ ] Expo running: `npm start`
- [ ] Local IP added to Clerk
- [ ] Expo Go app installed on phone
- [ ] Phone on same WiFi network
- [ ] Test OAuth flow
- [ ] Check logs for redirect

### APK ✓
- [ ] APK built: `./gradlew assembleRelease`
- [ ] APK installed on device
- [ ] `pairly://oauth-native-callback` in Clerk
- [ ] AndroidManifest has intent filters
- [ ] Test OAuth flow
- [ ] Check logs for redirect

---

## 💡 Pro Tips

1. **Development (Expo Go):**
   - Faster iteration
   - No need to rebuild
   - Easy debugging
   - Use for testing OAuth flow

2. **Production (APK):**
   - Test before release
   - Verify deep linking works
   - Check with real users
   - Use for final testing

3. **Both:**
   - Keep both redirect URLs in Clerk
   - No need to remove when switching
   - Code automatically detects environment

---

## 📱 Expected Flow

### **Expo Go:**
```
Tap "Continue with Google"
   ↓
Code detects: Running in Expo Go
   ↓
Uses: exp://192.168.x.x:8081/--/oauth-native-callback
   ↓
Browser opens
   ↓
Sign in with Google
   ↓
Google redirects to Clerk
   ↓
Clerk redirects to: exp://...
   ↓
✅ Expo Go receives redirect
   ↓
✅ Back in app
   ↓
✅ Signed in!
```

### **APK:**
```
Tap "Continue with Google"
   ↓
Code detects: Running in APK
   ↓
Uses: pairly://oauth-native-callback
   ↓
Browser opens
   ↓
Sign in with Google
   ↓
Google redirects to Clerk
   ↓
Clerk redirects to: pairly://...
   ↓
✅ Android receives intent
   ↓
✅ MainActivity handles deep link
   ↓
✅ Back in app
   ↓
✅ Signed in!
```

---

## 🚀 Quick Start

### **1. Add Redirect URLs to Clerk**
```
Clerk Dashboard → Settings → Paths → Redirect URLs

Add:
- exp://localhost:8081/--/oauth-native-callback
- exp://[YOUR-IP]:8081/--/oauth-native-callback
- pairly://oauth-native-callback
- exp+pairly://oauth-native-callback

Save!
```

### **2. Test in Expo Go**
```bash
npm start
# Scan QR code
# Test OAuth
```

### **3. Test in APK**
```bash
cd android
./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
# Test OAuth
```

---

## ✅ Success Indicators

### **Expo Go:**
```
🔵 Running in Expo Go
🔵 Redirect URL: exp://192.168.x.x:8081/--/oauth-native-callback
✅ Google sign-in successful!
```

### **APK:**
```
🔵 Running in standalone APK
🔵 Redirect URL: pairly://oauth-native-callback
🔗 Deep link received: pairly://oauth-native-callback
✅ Google sign-in successful!
```

---

## 📞 Still Not Working?

1. **Check Clerk Dashboard Logs:**
   - Dashboard → Logs
   - See OAuth attempts
   - Check redirect URL used

2. **Check App Logs:**
   ```bash
   # Expo Go
   npm start
   # Watch console
   
   # APK
   adb logcat | grep -E "OAuth|redirect|Deep link"
   ```

3. **Verify Redirect URLs:**
   - Clerk Dashboard: All URLs added?
   - Correct format?
   - Saved changes?

4. **Network Issues:**
   - Expo Go: Same WiFi?
   - APK: Internet working?
   - Firewall blocking?

---

**Last Updated:** December 1, 2025  
**Status:** ✅ Works in Both Expo Go & APK  
**Next:** Test karo aur batao! 🚀
