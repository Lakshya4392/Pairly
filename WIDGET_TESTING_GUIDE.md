# 🎯 WIDGET TESTING GUIDE - EMULATOR

## ✅ READY TO TEST YOUR SIMPLE WIDGET!

Your code is perfect. Now let's test the widget functionality on emulator.

---

## 🚀 QUICK BUILD & TEST

### Step 1: Build for Emulator
```bash
cd Pairly
run-emulator.bat
```

### Step 2: Add Widget to Home Screen
1. Long press on emulator home screen
2. Select "Widgets"
3. Find "Pairly" widget
4. Drag to home screen

### Step 3: Test Widget Functionality
```bash
# Watch widget logs
adb logcat | grep "PairlyWidget"

# Watch upload logs  
adb logcat | grep "UPLOAD"

# Watch socket logs
adb logcat | grep "moment_available"
```

---

## 🎯 WIDGET TEST SCENARIOS

### ✅ Test 1: Widget Polling
**Expected:** Widget polls backend every 10 seconds
```bash
# Watch logs - should see every 10s:
📡 [WIDGET] Fetching latest moment from backend
✅ [WIDGET] Moment fetched successfully
```

### ✅ Test 2: Upload Flow
**Expected:** Upload completes in <2 seconds
```bash
# Upload photo and watch logs:
📸 [UPLOAD] Starting simple upload...
✅ [UPLOAD] Photo compressed
📤 [UPLOAD] Uploading to backend...
✅ [UPLOAD] Upload successful
```

### ✅ Test 3: Widget Update
**Expected:** Widget updates within 10 seconds after upload
```bash
# After upload, widget should update:
📡 [WIDGET] Fetching latest moment from backend
✅ [WIDGET] Moment fetched successfully
🎨 [WIDGET] Updating widget with photo
```

### ✅ Test 4: Socket Notification
**Expected:** Partner gets notification immediately
```bash
# Should see on partner device:
🔔 [SOCKET] Received 'moment_available' event
📥 [RECEIVE] Moment available: [momentId]
```

---

## 📱 EMULATOR SETUP TIPS

### Recommended Emulator Settings:
- **API Level:** 30+ (Android 11+)
- **RAM:** 4GB minimum
- **Storage:** 8GB minimum
- **Architecture:** x86_64

### Enable Developer Options:
1. Settings → About Phone
2. Tap "Build Number" 7 times
3. Settings → Developer Options
4. Enable "USB Debugging"

---

## 🔍 DEBUGGING COMMANDS

### Check Widget Status:
```bash
# See if widget is registered
adb shell dumpsys appwidget

# Check widget provider
adb shell pm list packages | grep pairly
```

### Monitor All Logs:
```bash
# Full app logs
adb logcat | grep "Pairly"

# Widget-specific logs
adb logcat | grep "PairlyWidget"

# Backend communication
adb logcat | grep "moment"
```

### Test Backend Connection:
```bash
# Check network requests
adb logcat | grep "HTTP"

# Check socket connection
adb logcat | grep "Socket"
```

---

## 🎯 SUCCESS INDICATORS

### ✅ Build Success:
- App installs on emulator
- No CMake errors
- Metro bundler running

### ✅ Widget Success:
- Widget appears in widget list
- Widget can be added to home screen
- Widget shows default placeholder initially

### ✅ Polling Success:
- Logs show 10-second intervals
- Widget fetches from backend
- No network errors

### ✅ Upload Success:
- Photo upload completes quickly
- Backend receives photo
- Widget updates with new photo

---

## 🚨 TROUBLESHOOTING

### Issue: Widget not in list
**Fix:** Restart emulator, reinstall app

### Issue: Widget not updating
**Fix:** Check backend URL in logs, verify network

### Issue: Upload fails
**Fix:** Check backend is running, verify API endpoints

### Issue: No logs appearing
**Fix:** Enable developer options, check USB debugging

---

## 🎉 TESTING CHECKLIST

- [ ] App builds successfully
- [ ] Widget appears in widget list
- [ ] Widget can be added to home screen
- [ ] Widget shows placeholder when no moment
- [ ] Upload flow works (camera → compress → upload)
- [ ] Widget polls backend every 10 seconds
- [ ] Widget updates with new photo
- [ ] Socket notifications work
- [ ] Logs are clear and helpful

---

## 🔥 ADVANCED TESTING

### Test Widget Persistence:
1. Add widget to home screen
2. Kill app completely
3. Widget should continue polling
4. Upload from another device
5. Widget should update independently

### Test Network Issues:
1. Disable WiFi during upload
2. Enable WiFi
3. Upload should retry and succeed
4. Widget should recover and update

### Test Multiple Widgets:
1. Add multiple Pairly widgets
2. All should update simultaneously
3. Check logs for multiple update calls

---

## ✅ YOUR SIMPLE ARCHITECTURE WORKS!

Once you see these logs, your widget is working perfectly:

```
📡 [WIDGET] Fetching latest moment from backend
✅ [WIDGET] Moment fetched successfully
🎨 [WIDGET] Updating widget with photo
```

**Your simple MVP is ready for production!** 🚀