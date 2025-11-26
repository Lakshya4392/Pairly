# 🧪 Testing in Expo Go - What Works & What Doesn't

## 📱 Expo Go Limitations

### ❌ What DOESN'T Work in Expo Go:
1. **FCM (Firebase Cloud Messaging)** - Remote push notifications
2. **Background notifications** - When app is closed
3. **Widget updates** - Android home screen widget

### ✅ What WORKS in Expo Go:
1. **Local notifications** - In-app notifications
2. **Socket.IO** - Real-time communication
3. **Moment sending/receiving** - Via socket
4. **Gallery** - Photo storage and display
5. **All UI features** - Camera, gallery, settings

---

## 🎯 How to Test in Expo Go

### Test 1: Moment Send/Receive (Socket Only)

**Setup:**
- Device 1: User A (Lakshay)
- Device 2: User B (Harsh)
- Both in Expo Go

**Steps:**
```
1. Open app on both devices
2. Check logs:
   ✅ Socket connected
   ✅ Partner presence: 🟢 Online

3. User A sends moment:
   - Take photo
   - Send to partner
   
4. User B should see:
   ✅ Moment appears in gallery (instant)
   ✅ Local notification (in-app)
   ❌ Push notification (won't work - FCM disabled)
   ❌ Widget update (won't work - Expo Go)

5. Check logs on User B:
   ✅ Photo received from partner
   ✅ Photo saved locally
   ✅ Notification shown (local)
```

### Test 2: Check Memories/Gallery

**Steps:**
```
1. User A sends moment
2. User B opens Gallery screen
3. Should see:
   ✅ New moment from User A
   ✅ Photo visible
   ✅ Timestamp
   ✅ Partner name

4. Tap on moment:
   ✅ Opens full screen
   ✅ Can add reaction
   ✅ Can delete
```

### Test 3: Real-time Updates

**Steps:**
```
1. Keep both devices open
2. User A sends moment
3. User B should see:
   ✅ Instant update (no refresh needed)
   ✅ Moment appears in gallery
   ✅ Counter updates

4. Check logs:
   ✅ Socket event received
   ✅ Photo saved
   ✅ Gallery updated
```

---

## 🔔 Notification Testing

### In Expo Go (Limited):

**What You'll See:**
```javascript
// Local notification (works)
await Notifications.scheduleNotificationAsync({
  content: {
    title: '💕 New Moment from Harsh',
    body: 'Tap to view',
  },
  trigger: null, // Immediate
});
```

**Result:**
- ✅ Shows notification banner (if app is open)
- ✅ Shows in notification list
- ❌ No sound/vibration (Expo Go limitation)
- ❌ No notification when app is closed

### In Production Build (Full):

**What You'll Get:**
```javascript
// FCM notification (works)
FCMService.sendNewPhotoNotification(
  fcmToken,
  photoData,
  senderName,
  momentId
);
```

**Result:**
- ✅ Push notification (even when app closed)
- ✅ Sound + vibration
- ✅ Widget update
- ✅ Tap to open app
- ✅ Works in background

---

## 📊 Feature Comparison

| Feature | Expo Go | Production Build |
|---------|---------|------------------|
| Socket.IO | ✅ Works | ✅ Works |
| Moment Send | ✅ Works | ✅ Works |
| Moment Receive | ✅ Works | ✅ Works |
| Gallery | ✅ Works | ✅ Works |
| Local Notifications | ⚠️ Limited | ✅ Full |
| Push Notifications | ❌ No | ✅ Yes |
| Widget | ❌ No | ✅ Yes |
| Background Sync | ❌ No | ✅ Yes |

---

## 🧪 Complete Test Flow (Expo Go)

### Scenario: Send Moment Between 2 Devices

**Device 1 (Lakshay):**
```
1. Open app in Expo Go
2. Login
3. Check partner status: 🟢 Online
4. Take photo
5. Send to Harsh
6. Check logs:
   ✅ Photo saved locally
   ✅ Socket emit: send_photo
   ✅ Confirmation received
```

**Device 2 (Harsh):**
```
1. Open app in Expo Go
2. Login
3. Keep app open
4. Wait for moment...
5. Should see:
   ✅ Socket event: receive_photo
   ✅ Photo saved locally
   ✅ Gallery updated (new moment)
   ✅ Local notification (banner)
   
6. Check Gallery:
   ✅ New moment visible
   ✅ Can view full screen
   ✅ Can add reaction
```

---

## 🔍 Debug Logs to Check

### When Sending Moment:
```
LOG  📸 Uploading photo...
LOG  ✅ Photo saved locally: abc123
LOG  ✅ Verified paired with partner: Harsh
LOG  📤 Sending photo with data: {...}
LOG  ✅ Photo sent successfully
```

### When Receiving Moment:
```
LOG  📥 Photo received from partner: Lakshay
LOG  🛡️ Duplicate check passed
LOG  ✅ Push notification sent for new photo
LOG  ✅ Photo saved locally
LOG  ✅ Widget updated (will fail in Expo Go)
LOG  ✅ Gallery updated
```

---

## ⚠️ Expected Errors in Expo Go

### These are NORMAL:
```
ERROR  expo-notifications: Android Push notifications...
ERROR  ❌ FCM initialization failed
LOG  ⚠️ Background service not available
LOG  ⚠️ Widget not available on this platform
```

**Why:** Expo Go doesn't support:
- FCM (Firebase Cloud Messaging)
- Background services
- Native widgets

**Solution:** These will work in production build!

---

## 🎯 What to Test in Expo Go

### ✅ Test These:
1. **Socket Connection**
   - Both users connect
   - Partner presence shows online

2. **Moment Send/Receive**
   - Send photo
   - Receive photo
   - Gallery updates

3. **Real-time Updates**
   - Instant updates
   - No refresh needed

4. **Gallery**
   - Moments visible
   - Can view/delete
   - Reactions work

5. **Partner Detection**
   - Shows partner name
   - Shows online status

### ❌ Don't Test These (Won't Work):
1. Push notifications (when app closed)
2. Widget updates
3. Background sync
4. FCM notifications

---

## 🚀 To Test Full Features

### Build Production APK:

```bash
# Build production APK
eas build --platform android --profile production

# Or development build with FCM
eas build --platform android --profile development
```

**Then you'll get:**
- ✅ Full push notifications
- ✅ Widget updates
- ✅ Background sync
- ✅ FCM working
- ✅ All features

---

## 📱 Quick Test Checklist (Expo Go)

### Before Testing:
- [ ] Both devices in Expo Go
- [ ] Both users logged in
- [ ] Both users paired
- [ ] Both apps open

### Test Steps:
1. [ ] Check socket connection (both online)
2. [ ] Send moment from Device 1
3. [ ] Check Device 2 gallery (moment appears)
4. [ ] Check Device 2 logs (photo received)
5. [ ] Verify moment saved in gallery
6. [ ] Try sending from Device 2 to Device 1
7. [ ] Verify both directions work

### Expected Results:
- ✅ Moments send/receive instantly
- ✅ Gallery updates automatically
- ✅ Local notifications show (limited)
- ❌ Push notifications (won't work)
- ❌ Widget updates (won't work)

---

## 💡 Summary

**In Expo Go:**
- ✅ Core features work (socket, moments, gallery)
- ⚠️ Notifications limited (local only)
- ❌ Push notifications don't work
- ❌ Widget doesn't work

**To Test Full Features:**
- Build production APK
- Install on real device
- All features will work!

**For Now (Expo Go):**
- Test moment send/receive ✅
- Test gallery updates ✅
- Test real-time sync ✅
- Ignore FCM errors (expected) ✅

**Status:** 🎯 Ready to Test in Expo Go!
