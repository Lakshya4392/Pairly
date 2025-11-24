# ⚡ Quick Build Commands

## 🚀 Build APK (One Command)

```bash
cd Pairly
eas build --profile preview --platform android
```

**Wait 10-15 minutes → Download APK → Install → Test!**

---

## 📱 Install APK

```bash
# Download from EAS link, then:
adb install path/to/app.apk

# Or directly from EAS:
eas build:run --profile preview --platform android
```

---

## 🧪 Test Widget

### Add Widget:
1. Long press home screen
2. Widgets → Pairly
3. Drag to home screen
4. Choose size (1x1 to 4x4)

### Test Update:
1. Partner sends moment
2. Check widget updates (< 2 seconds)
3. Check notification appears

---

## 🔍 Debug Commands

### Check Widget:
```bash
adb logcat | grep PairlyWidget
```

### Check FCM:
```bash
adb logcat | grep FCM
```

### Check App Logs:
```bash
adb logcat | grep ReactNativeJS
```

---

## ✅ Quick Checklist

Before building:
- [ ] `google-services.json` in `Pairly/`
- [ ] Backend FCM configured
- [ ] Widget assets created

After building:
- [ ] Install APK
- [ ] Add widget to home screen
- [ ] Send test moment
- [ ] Check widget updates
- [ ] Check notification

---

## 🎯 Expected Result

```
Partner sends moment
  ↓ (< 2 seconds)
Your phone:
  ✅ Push notification appears
  ✅ Widget updates on home screen
  ✅ Photo in gallery
  
All working perfectly! 🎉
```

---

## 🐛 If Something Doesn't Work

### Widget not showing:
```bash
# Check if registered
adb shell dumpsys appwidget | grep pairly
```

### FCM not working:
```bash
# Check token
adb logcat | grep "FCM Token"
```

### Build fails:
```bash
# Clear and rebuild
cd Pairly/android
./gradlew clean
cd ..
eas build --profile preview --platform android --clear-cache
```

---

## 📞 Need Help?

Check these files:
1. `BUILD_APK_GUIDE.md` - Complete guide
2. `EXACT_WORKING_FLOW.md` - How it works
3. `FINAL_CHECKLIST.md` - Testing checklist

---

**TL;DR**: Run `eas build`, install APK, add widget, test! 🚀
