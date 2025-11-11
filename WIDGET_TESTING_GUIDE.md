# 📱 Android Widget Testing Guide

## Widget Features Implemented:

### ✅ Core Features:
1. **Home Screen Widget** - Shows partner's latest photo
2. **Auto Updates** - Updates when new photo received
3. **Background Service** - Keeps widget updated even when app closed
4. **Foreground Service** - Persistent notification for widget updates
5. **Empty State** - Beautiful "No moments yet" placeholder
6. **Click Actions** - Tap photo to open app, tap camera to share

---

## Testing Steps:

### 1. Build APK First

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build APK
cd Pairly
eas build --platform android --profile preview
```

Wait 10-20 minutes → Download APK → Install on phone

---

### 2. Add Widget to Home Screen

**Steps:**
1. Long press on home screen
2. Tap "Widgets"
3. Find "Pairly" widget
4. Drag to home screen
5. Widget should show "No moments yet" with heart icon

**Expected:**
```
┌─────────────────────────────┐
│                             │
│         💗                  │
│   No moments yet            │
│   Share your first moment!  │
│                             │
└─────────────────────────────┘
```

---

### 3. Test Widget Update (With App Open)

**Steps:**
1. Open Pairly app
2. Login/Signup
3. Pair with partner
4. Take a photo
5. Upload photo
6. Go to home screen
7. Check widget

**Expected:**
- Widget shows uploaded photo
- Partner name displayed
- "Just now" timestamp
- Camera button visible

---

### 4. Test Widget Update (App Closed)

**Steps:**
1. Close Pairly app completely (swipe away from recents)
2. Ask partner to send photo
3. Wait 10-30 seconds
4. Check widget on home screen

**Expected:**
- Widget updates with new photo
- No need to open app
- Background service working
- Notification shows "Keeping your widget updated"

---

### 5. Test Background Service

**Steps:**
1. Open Pairly app
2. Check notification shade
3. Should see persistent notification:
   ```
   Pairly
   Keeping your widget updated
   ```

**Expected:**
- Notification is low priority (not intrusive)
- Can't be swiped away
- Indicates service is running
- Widget updates automatically

---

### 6. Test Widget Actions

**Test Camera Button:**
1. Tap camera icon on widget
2. App should open
3. Camera screen should open
4. Ready to take photo

**Test Photo Tap:**
1. Tap on partner's photo in widget
2. App should open
3. Should show main screen

---

### 7. Test Empty State

**Steps:**
1. Fresh install (or clear app data)
2. Add widget to home screen
3. Don't upload any photos

**Expected:**
```
┌─────────────────────────────┐
│                             │
│         💗                  │
│   No moments yet            │
│   Share your first moment!  │
│                             │
└─────────────────────────────┘
```

- Heart icon (64dp, pink)
- "No moments yet" text (14sp, gray)
- "Share your first moment!" subtitle (11sp, light gray)
- Gradient background (light pink)

---

### 8. Test Widget Sizes

**Small Widget (2x2):**
- Shows photo only
- No info section
- Minimal design

**Medium Widget (4x2):**
- Shows photo
- Partner name
- Timestamp
- Camera button

**Large Widget (4x4):**
- Shows photo
- Partner info
- Timestamp
- Camera button
- Heart reaction overlay

---

### 9. Test Real-time Updates

**Setup:**
1. Install app on 2 phones
2. Pair both accounts
3. Add widget on both phones

**Test:**
1. Phone A: Upload photo
2. Phone B: Check widget (should update automatically)
3. Phone B: Upload photo
4. Phone A: Check widget (should update automatically)

**Expected:**
- Widget updates within 10-30 seconds
- No need to open app
- Background service handles updates
- Socket.IO real-time sync working

---

### 10. Test Battery Optimization

**Steps:**
1. Go to Settings → Apps → Pairly
2. Battery → Battery optimization
3. Select "Don't optimize"

**Why:**
- Android may kill background service
- Widget won't update if service killed
- Disabling optimization ensures updates

---

## Troubleshooting:

### Widget Not Showing:

**Check:**
1. APK installed correctly?
2. Widget added to home screen?
3. App has storage permissions?

**Fix:**
```bash
# Reinstall APK
adb install -r app.apk

# Grant permissions
adb shell pm grant com.pairly.app android.permission.READ_EXTERNAL_STORAGE
```

---

### Widget Not Updating:

**Check:**
1. Background service running?
2. Notification visible?
3. Battery optimization disabled?
4. Internet connection active?

**Fix:**
1. Open app once
2. Check notification shade
3. Disable battery optimization
4. Restart phone

---

### Empty State Not Showing:

**Check:**
1. Widget layout XML correct?
2. Placeholder background drawable exists?
3. Heart icon drawable exists?

**Fix:**
- Rebuild APK
- Clear app data
- Re-add widget

---

### Background Service Stops:

**Check:**
1. Battery optimization enabled?
2. Phone manufacturer restrictions?
3. Low memory?

**Fix:**
1. Disable battery optimization
2. Add to "Protected apps" (Xiaomi/Huawei)
3. Increase priority in settings

---

## Performance Metrics:

### Expected Performance:

| Metric | Target | Acceptable |
|--------|--------|------------|
| Widget load time | < 1s | < 2s |
| Photo update time | < 30s | < 60s |
| Memory usage | < 50MB | < 100MB |
| Battery drain | < 2%/hour | < 5%/hour |
| Network usage | < 1MB/hour | < 5MB/hour |

---

## Console Logs to Check:

### Successful Widget Update:
```
✅ Widget services initialized
✅ Widget support: true
📱 New photo received, updating widget...
✅ Widget updated with new photo
🚀 Starting widget background service...
✅ Widget background service started
```

### Background Service Running:
```
📱 Initializing widget background service...
✅ Background service already initialized
Triggering widget update
Widget updated successfully
```

---

## Known Issues & Limitations:

### Android Version Compatibility:
- **Android 8.0+**: Full support
- **Android 7.0-7.1**: Limited background updates
- **Android 6.0 and below**: No background service

### Manufacturer Restrictions:
- **Xiaomi**: Requires "Autostart" permission
- **Huawei**: Requires "Protected apps" setting
- **Samsung**: Works out of box
- **OnePlus**: May need battery optimization disabled

### Free Tier Limitations:
- Render backend spins down after 15 min
- First update after spin-down takes 30-60s
- Upgrade to paid plan for instant updates

---

## Advanced Testing:

### Test with ADB:

```bash
# Check if service is running
adb shell dumpsys activity services | grep Pairly

# Check widget provider
adb shell dumpsys appwidget | grep Pairly

# Force widget update
adb shell am broadcast -a com.pairly.UPDATE_WIDGET

# Check logs
adb logcat | grep Pairly
```

### Test Memory Usage:

```bash
# Check memory
adb shell dumpsys meminfo com.pairly.app

# Check battery
adb shell dumpsys batterystats | grep Pairly
```

---

## Success Criteria:

### Widget is Working if:
- ✅ Shows on home screen
- ✅ Displays partner's photo
- ✅ Updates automatically when new photo received
- ✅ Works when app is closed
- ✅ Background service notification visible
- ✅ Empty state shows when no photos
- ✅ Click actions work (open app, camera)
- ✅ No crashes or errors
- ✅ Battery drain acceptable (< 5%/hour)
- ✅ Updates within 60 seconds

---

## Next Steps After Testing:

1. **If all tests pass:**
   - ✅ Widget is production ready
   - ✅ Can submit to Play Store
   - ✅ Share APK with users

2. **If issues found:**
   - 🔧 Check logs for errors
   - 🔧 Verify permissions
   - 🔧 Test on different devices
   - 🔧 Adjust update intervals

3. **Optimization:**
   - ⚡ Reduce update frequency if battery drain high
   - ⚡ Compress photos more for faster updates
   - ⚡ Cache photos locally for instant display

---

## Support:

### Common Questions:

**Q: Widget not updating?**
A: Check background service notification, disable battery optimization

**Q: Battery draining fast?**
A: Increase update interval from 30 min to 60 min

**Q: Photos not loading?**
A: Check internet connection, verify backend is running

**Q: Widget shows old photo?**
A: Force update by opening app, or wait for next scheduled update

---

**Widget Testing Complete! 🎉**

Test all scenarios and report any issues!
