# 🔌 APK CONNECTION TEST GUIDE

## ✅ PRE-BUILD CHECKLIST (ALL DONE!)

### 1. **Network Permissions** ✅
```xml
✅ INTERNET permission
✅ ACCESS_NETWORK_STATE permission
✅ usesCleartextTraffic="true"
✅ networkSecurityConfig configured
```

### 2. **Network Security Config** ✅
```xml
✅ Cleartext traffic allowed
✅ System certificates trusted
✅ User certificates trusted
✅ Render domain whitelisted
```

### 3. **Socket Configuration** ✅
```typescript
✅ HTTPS URL: https://pairly-60qj.onrender.com
✅ Timeout: 30 seconds (APK optimized)
✅ Reconnection: 5 attempts
✅ Transports: polling → websocket
✅ Path: /socket.io/
✅ Secure: true
```

### 4. **API Configuration** ✅
```typescript
✅ Base URL: https://pairly-60qj.onrender.com
✅ Socket URL: https://pairly-60qj.onrender.com
✅ Timeout: 15 seconds
✅ Retry: 3 attempts
```

---

## 📱 APK TESTING STEPS

### **Step 1: Install APK**
```bash
# Location
D:\projects\Pairly\Pairly\android\app\build\outputs\apk\release\app-release.apk

# Install via ADB
adb install app-release.apk

# Or transfer to phone and install manually
```

### **Step 2: Check Logs (via ADB)**
```bash
# Clear logs
adb logcat -c

# Watch logs
adb logcat | grep -E "Socket|API|Connection|Pairly"

# Look for:
✅ "Using Render backend URL"
✅ "Socket connected"
✅ "Joined room successfully"
✅ "Heartbeat"
```

### **Step 3: Test Connection Flow**

#### **A. App Launch**
```
Expected Logs:
✅ "Using Render backend URL: https://pairly-60qj.onrender.com"
✅ "Initializing socket connection"
✅ "Socket connected: [socket-id]"
✅ "Joined room successfully"
```

#### **B. Login/Signup**
```
Expected:
✅ Clerk authentication works
✅ Token stored in SecureStore
✅ Socket connects with auth token
```

#### **C. Pairing**
```
Expected:
✅ Generate code works
✅ Join with code works
✅ Socket events received
✅ Partner info loaded
```

#### **D. Send Photo**
```
Expected:
✅ Photo compresses
✅ Saves locally
✅ Sends via socket
✅ Partner receives
✅ Notification shows
```

---

## 🐛 TROUBLESHOOTING

### **Issue 1: Socket Not Connecting**
```
Symptoms:
❌ "Socket connection error"
❌ "Connection timeout"

Solutions:
1. Check internet connection
2. Check backend is running: https://pairly-60qj.onrender.com/health
3. Wait 30 seconds (Render cold start)
4. Restart app
```

### **Issue 2: API Calls Failing**
```
Symptoms:
❌ "Network request failed"
❌ "Timeout"

Solutions:
1. Check cleartext traffic is allowed
2. Verify network_security_config.xml exists
3. Check AndroidManifest has usesCleartextTraffic="true"
4. Restart app
```

### **Issue 3: Photos Not Sending**
```
Symptoms:
❌ "Failed to send photo"
❌ "Socket not connected"

Solutions:
1. Check socket is connected (look for green indicator)
2. Check partner is paired
3. Check internet connection
4. Photo will queue and send when connected
```

---

## 🔍 DEBUG COMMANDS

### **Check Backend Health**
```bash
curl https://pairly-60qj.onrender.com/health
# Expected: {"status":"ok","message":"Pairly API is running"}
```

### **Check Socket Connection**
```bash
# In browser console
const socket = io('https://pairly-60qj.onrender.com');
socket.on('connect', () => console.log('Connected!'));
```

### **View APK Logs**
```bash
# Real-time logs
adb logcat -s ReactNativeJS:V

# Filter for errors
adb logcat | grep -E "ERROR|FATAL"

# Filter for socket
adb logcat | grep -i socket
```

---

## ✅ SUCCESS INDICATORS

### **App Launch**
```
✅ Splash screen shows
✅ No crash
✅ Login screen appears
✅ Console shows "Socket connected"
```

### **After Login**
```
✅ Home screen loads
✅ Socket indicator green
✅ Can navigate all screens
✅ No network errors
```

### **Pairing**
```
✅ Code generates (6 characters)
✅ Code can be copied
✅ Partner can join with code
✅ Both users see "Connected"
```

### **Photo Send/Receive**
```
✅ Photo uploads
✅ Shows in gallery immediately
✅ Partner receives notification
✅ Partner sees photo
✅ No duplicates
```

---

## 🚀 FINAL BUILD COMMAND

```bash
cd Pairly/android
./gradlew assembleRelease

# APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 📊 EXPECTED PERFORMANCE

- **Socket Connection:** 2-5 seconds (first time), <1 second (reconnect)
- **API Calls:** 1-3 seconds
- **Photo Upload:** 2-5 seconds (depends on size)
- **Photo Receive:** Instant (via socket)
- **Notification:** Instant

---

## ⚠️ KNOWN ISSUES & FIXES

### **Issue: Render Cold Start**
```
Problem: First API call takes 20-30 seconds
Fix: Backend wakes up automatically, subsequent calls are fast
Status: ✅ Handled with 30s timeout
```

### **Issue: Network Security**
```
Problem: Cleartext traffic blocked
Fix: network_security_config.xml added
Status: ✅ Fixed
```

### **Issue: Socket Reconnection**
```
Problem: Socket disconnects in background
Fix: App state handler reconnects on foreground
Status: ✅ Fixed
```

---

## 🎯 PRODUCTION READY CHECKLIST

- ✅ Network permissions configured
- ✅ Cleartext traffic allowed
- ✅ Socket connection robust
- ✅ API calls with retry
- ✅ Offline queue system
- ✅ Background/foreground handling
- ✅ Error handling
- ✅ Notifications working
- ✅ De-duplication
- ✅ Auto-reconnect

**STATUS: READY FOR TESTING** 🚀
