# 🎯 Exact Working Flow - Gallery & Widget

## 📤 User A Sends Moment (Complete Flow)

### Step 1: Capture Photo
```
User A clicks camera button
  ↓
PhotoService.capturePhoto()
  ↓
Returns: { uri: "file:///path/to/photo.jpg" }
```

### Step 2: Upload to Backend
```
MomentService.uploadPhoto(photo, note)
  ↓
1. Reads photo file
2. Converts to base64
3. Sends to backend API
  ↓
Backend receives:
{
  photo: "base64string...",
  userId: "user_A_id",
  note: "optional note"
}
```

### Step 3: Backend Processing
```
momentController.uploadMoment()
  ↓
1. Compress image (Sharp)
   - Resize to 1080x1920
   - Quality: 85%
   - Max size: 500KB
  ↓
2. Save to database
   - Prisma.moment.create()
   - Stores: photoData (Buffer), uploaderId, pairId
  ↓
3. Get partner info
   - Find paired user (User B)
   - Get FCM token
  ↓
4. Send via Socket.IO (if online)
   io.to(partnerId).emit('new_moment', {
     momentId: "moment_123",
     photoBase64: "compressed_base64...",
     partnerName: "User A",
     uploadedAt: "2024-01-01T12:00:00Z"
   })
  ↓
5. Send via FCM (always)
   FCMService.sendNewPhotoNotification(
     fcmToken,
     photoBase64,
     "User A",
     "moment_123"
   )
  ↓
6. Send confirmation to User A
   io.to(userId).emit('moment_sent_confirmation', {
     momentId: "moment_123",
     partnerName: "User B",
     sentAt: "2024-01-01T12:00:00Z"
   })
```

### Step 4: User A Sees Confirmation
```
✅ "Moment sent to User B!"
  ↓
Photo appears in User A's gallery
  ↓
(Optional) Delivery notification when User B receives
```

---

## 📥 User B Receives Moment (Complete Flow)

### Case 1: App Open (Socket.IO)

```
1. Socket.IO receives 'new_moment' event
   ↓
2. RealtimeService triggers callback
   ↓
3. AppNavigator listener processes:
   
   RealtimeService.on('new_moment', async (data) => {
     // data = {
     //   momentId: "moment_123",
     //   photoBase64: "compressed_base64...",
     //   partnerName: "User A",
     //   uploadedAt: "2024-01-01T12:00:00Z"
     // }
     
     // Step 3a: Save photo locally
     const photoUri = await LocalPhotoStorage.savePhoto(
       `data:image/jpeg;base64,${data.photoBase64}`,
       'partner',  // ← Important: marks as partner photo
       false       // ← Not encrypted
     );
     // Returns: "photo_abc123xyz"
     
     // Step 3b: Get actual file URI
     const actualUri = await LocalPhotoStorage.getPhotoUri(photoUri);
     // Returns: "file:///data/.../pairly_photos/photo_abc123xyz.jpg"
     
     // Step 3c: Update widget
     await WidgetService.onPhotoReceived(actualUri, data.partnerName);
     // Widget shows partner's photo on home screen
     
     // Step 3d: Show notification
     await EnhancedNotificationService.showMomentNotification(
       data.partnerName,
       data.momentId
     );
     // Push notification: "💕 New Moment from User A"
     
     // Step 3e: Send acknowledgment back
     RealtimeService.emit('moment_received_ack', {
       momentId: data.momentId,
       receivedAt: new Date().toISOString()
     });
   });
   ↓
4. User B sees:
   - Push notification
   - Widget updated
   - Photo in gallery (if open)
```

### Case 2: App Closed (FCM)

```
1. FCM notification arrives
   ↓
2. fcmService.handleNewMoment(data)
   ↓
3. Background processing:
   
   // Same as Socket.IO but in background
   const photoUri = await LocalPhotoStorage.savePhoto(
     `data:image/jpeg;base64,${data.photoBase64}`,
     'partner',
     false
   );
   
   const actualUri = await LocalPhotoStorage.getPhotoUri(photoUri);
   
   await OptimizedWidgetService.onPhotoReceived(
     actualUri,
     data.partnerName
   );
   
   await EnhancedNotificationService.showMomentNotification(
     data.partnerName,
     data.momentId
   );
   ↓
4. User B sees:
   - Push notification (with sound)
   - Widget updated on home screen
   - Photo ready in gallery when app opens
```

---

## 📱 Gallery Screen Flow

### When User Opens Gallery:

```
1. GalleryScreen mounts
   ↓
2. loadPhotos() called
   ↓
3. LocalPhotoStorage.getAllPhotos()
   ↓
4. Reads metadata.json:
   {
     "photo_abc123": {
       id: "photo_abc123",
       fileName: "photo_abc123.jpg",
       timestamp: "2024-01-01T12:00:00Z",
       sender: "partner",
       encrypted: false
     },
     "photo_xyz789": {
       id: "photo_xyz789",
       fileName: "photo_xyz789.jpg",
       timestamp: "2024-01-01T11:00:00Z",
       sender: "me",
       encrypted: false
     }
   }
   ↓
5. For each photo, get URI:
   LocalPhotoStorage.getPhotoUri("photo_abc123")
   → "file:///data/.../pairly_photos/photo_abc123.jpg"
   ↓
6. Convert to Photo format:
   {
     id: "photo_abc123",
     uri: "file:///data/.../pairly_photos/photo_abc123.jpg",
     timestamp: Date object,
     sender: "partner"
   }
   ↓
7. Filter out invalid URIs (uri === '')
   ↓
8. Sort by timestamp (newest first)
   ↓
9. Limit for free users (10 photos)
   ↓
10. setPhotos(sortedPhotos)
   ↓
11. Render grid:
    - 2 columns
    - Partner photos: heart icon
    - User photos: person icon
    - Tap to view full size
```

---

## 🔧 Widget Update Flow

### When Photo Received:

```
1. WidgetService.onPhotoReceived(photoUri, partnerName)
   ↓
2. WidgetService.updateWidget(photoUri, partnerName)
   ↓
3. savePhotoForWidget(photoUri)
   ↓
4. Create widget_photos directory
   ↓
5. Copy photo to permanent location:
   From: "file:///data/.../pairly_photos/photo_abc123.jpg"
   To: "file:///data/.../widget_photos/widget_photo_1234567890.jpg"
   ↓
6. Clean up old photos (keep 3)
   ↓
7. Call native module:
   PairlyWidget.updateWidget(
     "/data/.../widget_photos/widget_photo_1234567890.jpg",
     "User A",
     1234567890
   )
   ↓
8. Native Android code updates widget
   ↓
9. Store widget data in AsyncStorage:
   {
     uri: "/data/.../widget_photos/widget_photo_1234567890.jpg",
     timestamp: 1234567890,
     partnerName: "User A"
   }
   ↓
10. Widget shows on home screen ✅
```

---

## 🗂️ File Structure

### Photos Storage:
```
/data/user/0/com.yourapp.pairly/files/
├── pairly_photos/
│   ├── photo_abc123.jpg          ← Partner's photo
│   ├── photo_xyz789.jpg          ← User's photo
│   └── metadata.json             ← All photo metadata
├── widget_photos/
│   ├── widget_photo_1234567890.jpg  ← Latest for widget
│   ├── widget_photo_1234567891.jpg  ← Previous
│   └── widget_photo_1234567892.jpg  ← Oldest (will be deleted)
└── .pairly_secure/               ← Encrypted photos (if enabled)
```

### Metadata Structure:
```json
{
  "photo_abc123": {
    "id": "photo_abc123",
    "fileName": "photo_abc123.jpg",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "sender": "partner",
    "encrypted": false
  },
  "photo_xyz789": {
    "id": "photo_xyz789",
    "fileName": "photo_xyz789.jpg",
    "timestamp": "2024-01-01T11:00:00.000Z",
    "sender": "me",
    "encrypted": false
  }
}
```

---

## 🔍 Key Points

### Gallery:
1. ✅ Loads from LocalPhotoStorage (not database)
2. ✅ Shows both user and partner photos
3. ✅ Sorted by newest first
4. ✅ Filters invalid URIs
5. ✅ Free users: 10 photo limit
6. ✅ Premium users: Unlimited

### Widget:
1. ✅ Updates via Socket.IO (app open)
2. ✅ Updates via FCM (app closed)
3. ✅ Saves to permanent location
4. ✅ Cleans up old photos
5. ✅ Persists across restarts
6. ✅ Shows partner name

### Notifications:
1. ✅ Push notification with sound
2. ✅ Shows partner name
3. ✅ Tap to open app
4. ✅ Works when app closed

---

## ✅ Success Indicators

### Gallery Working:
```
Console logs:
✅ Loaded 2 photos from storage (2 total, user + partner)

UI shows:
✅ Grid with 2 photos
✅ Partner photo has heart icon
✅ User photo has person icon
✅ Can tap to view full size
```

### Widget Working:
```
Console logs:
📱 New photo received, updating widget...
✅ Widget updated with new photo

Home screen shows:
✅ Partner's latest photo
✅ Partner's name
✅ Updates within 2 seconds
```

### Notifications Working:
```
Console logs:
✅ Moment notification shown

Notification bar shows:
💕 New Moment from User A
Tap to view your special moment together
```

---

**Result**: Complete working flow from send to receive to display! 🎯
