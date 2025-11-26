# 📱 Expo Go - Moment Test Guide

## 🎯 Exact Flow: Moment Send Karne Par Kya Hoga

### Scenario: Tum (Lakshay) → Partner (Harsh) ko moment send karo

---

## 📸 Step-by-Step Flow

### Phone 1 (Tumhara - Lakshay):

```
1. Camera screen kholo
2. Photo lo
3. "Send" button press karo
   ↓
✅ Photo tumhare phone mein save hoga
✅ Tumhare Memories/Gallery mein dikhega
✅ "Moment Sent" notification (tumhe)
   ↓
Logs:
  📸 Uploading photo...
  ✅ Photo saved locally: abc123
  ✅ Verified paired with partner: Harsh
  📤 Sending photo via socket
  ✅ Photo sent successfully
```

### Phone 2 (Partner ka - Harsh):

```
App open hai (foreground):
   ↓
Socket event receive hoga
   ↓
✅ Photo partner ke phone mein save hoga
✅ Partner ke Memories/Gallery mein dikhega
✅ Notification banner dikhega (partner ko)
   ↓
Logs:
  📥 Photo received from partner: Lakshay
  ✅ Photo saved locally
  ✅ Gallery updated
  💕 New Moment from Lakshay (notification)
```

---

## 🎯 Kya Kya Hoga

### ✅ Tumhare Phone Par (Sender):

1. **Photo Save:**
   - ✅ Local storage mein save
   - ✅ Type: "me" (tumhara photo)

2. **Memories/Gallery:**
   - ✅ Gallery screen mein dikhega
   - ✅ "Sent to Harsh" label
   - ✅ Timestamp

3. **Notification:**
   - ✅ "Moment Sent" confirmation
   - ✅ Local notification (banner)

### ✅ Partner Ke Phone Par (Receiver):

1. **Photo Save:**
   - ✅ Local storage mein save
   - ✅ Type: "partner" (partner ka photo)

2. **Memories/Gallery:**
   - ✅ Gallery screen mein dikhega
   - ✅ "From Lakshay" label
   - ✅ Timestamp

3. **Notification:**
   - ✅ "💕 New Moment from Lakshay"
   - ✅ Local notification (banner)
   - ⚠️ App open hona chahiye

---

## 📊 Memories/Gallery Mein Kya Dikhega

### Tumhare Phone (Lakshay):

```
Gallery Screen:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 Your Moments (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Photo 1] - Sent to Harsh
Today, 10:30 AM

[Photo 2] - Sent to Harsh  
Yesterday, 5:45 PM

[Photo 3] - Sent to Harsh
2 days ago
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Partner Ke Phone (Harsh):

```
Gallery Screen:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 Moments from Lakshay (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Photo 1] - From Lakshay
Today, 10:30 AM  ← NEW!

[Photo 2] - From Lakshay
Yesterday, 5:45 PM

[Photo 3] - From Lakshay
2 days ago
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔔 Notification Kaise Dikhega

### Partner Online Hai (App Open):

**Phone 2 (Harsh) Par:**
```
┌─────────────────────────────────────┐
│ 💕 New Moment from Lakshay          │
│ Tap to view your special moment     │
│                                     │
│ [Photo thumbnail]                   │
│                                     │
│ Just now                            │
└─────────────────────────────────────┘
```

**Notification Type:**
- ✅ Banner notification (top)
- ✅ In-app notification
- ⚠️ No sound (Expo Go limitation)
- ⚠️ No vibration (Expo Go limitation)

---

## 🧪 Live Test Steps

### Setup:
```
Phone 1: Lakshay (Tumhara)
Phone 2: Harsh (Partner)
Both: Expo Go mein app open
```

### Test Karo:

**Step 1: Check Connection**
```
Phone 1: Check partner status
  → Should show: 🟢 Harsh is Online

Phone 2: Check partner status
  → Should show: 🟢 Lakshay is Online
```

**Step 2: Send Moment**
```
Phone 1 (Lakshay):
1. Camera icon tap karo
2. Photo lo
3. Send button press karo
4. Wait 2-3 seconds
5. Check Gallery:
   ✅ Photo dikhna chahiye
   ✅ "Sent to Harsh" label
```

**Step 3: Check Partner Phone**
```
Phone 2 (Harsh):
1. Notification banner dikhega (top)
   💕 New Moment from Lakshay
   
2. Gallery screen kholo
   ✅ New photo dikhna chahiye
   ✅ "From Lakshay" label
   
3. Photo tap karo
   ✅ Full screen mein khulega
   ✅ Can add reaction ❤️
```

---

## 📝 Logs Check Karo

### Phone 1 (Sender) Logs:
```
LOG  📸 Uploading photo...
LOG  ✅ Photo saved locally: moment_123
LOG  ✅ Verified paired with partner: Harsh (user_xyz)
LOG  📤 Sending photo with data: {
  photoId: "moment_123",
  partnerId: "user_xyz",
  hasPhotoData: true
}
LOG  ✅ Photo sent successfully
LOG  ✅ Moment sent notification shown
```

### Phone 2 (Receiver) Logs:
```
LOG  📥 Photo received from partner: Lakshay
LOG  🛡️ Duplicate check passed
LOG  ✅ Verified photo is from paired partner
LOG  ✅ Photo saved locally
LOG  ✅ Push notification sent for new photo
LOG  ✅ Gallery updated
```

---

## ⚠️ Important Notes

### ✅ Kya Kaam Karega:

1. **Moment Send/Receive:**
   - ✅ Instant delivery (socket)
   - ✅ Both phones mein save
   - ✅ Gallery mein dikhega

2. **Notification:**
   - ✅ Banner notification (app open ho toh)
   - ✅ In-app alert
   - ⚠️ No sound/vibration (Expo Go)

3. **Gallery:**
   - ✅ Tumhare moments
   - ✅ Partner ke moments
   - ✅ Dono alag-alag dikhengi

### ❌ Kya Kaam Nahi Karega:

1. **Push Notification:**
   - ❌ App band ho toh notification nahi
   - ❌ Sound nahi
   - ❌ Vibration nahi

2. **Widget:**
   - ❌ Home screen widget nahi

3. **Background:**
   - ❌ App band ho toh receive nahi hoga

---

## 🎯 Quick Test

### 1 Minute Test:

```
Phone 1:
  1. Open app
  2. Send moment
  3. Check gallery ✅

Phone 2:
  1. Keep app open
  2. Wait for notification ✅
  3. Check gallery ✅
  4. See new moment ✅
```

---

## 📊 Expected Results

### After Sending Moment:

**Phone 1 (Lakshay):**
- ✅ Photo in gallery (as "me")
- ✅ "Sent" confirmation
- ✅ Can see in Memories

**Phone 2 (Harsh):**
- ✅ Notification banner
- ✅ Photo in gallery (as "partner")
- ✅ Can see in Memories
- ✅ Can view full screen
- ✅ Can add reaction

**Both Phones:**
- ✅ Moment saved locally
- ✅ Visible in gallery
- ✅ Can access anytime

---

## 🎉 Summary

**Tumhara Question:** Moment send karne par kya hoga?

**Answer:**

1. **Tumhare Phone:**
   - ✅ Photo save hoga
   - ✅ Memories mein dikhega
   - ✅ "Sent" confirmation

2. **Partner Ke Phone:**
   - ✅ Notification aayega (app open ho toh)
   - ✅ Photo save hoga
   - ✅ Memories mein dikhega

3. **Dono Phones:**
   - ✅ Gallery mein moments dikhengi
   - ✅ Alag-alag (tumhare aur partner ke)
   - ✅ Sab save rahenge

**Partner Online Hai:**
- ✅ Instant notification (banner)
- ✅ Real-time update
- ✅ No delay

**Test Karo Abhi!** 🚀
