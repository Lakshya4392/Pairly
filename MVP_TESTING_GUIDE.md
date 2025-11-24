# 🎯 MVP Testing Guide - Gallery & Widget

## ✅ What Should Work (MVP Features)

### 1. **Gallery/Memories Screen**
- ✅ Show all photos (user + partner)
- ✅ Sort by newest first
- ✅ Grid view (2 columns)
- ✅ Timeline view
- ✅ Photo preview on tap
- ✅ Free users: 10 photos limit
- ✅ Premium users: Unlimited

### 2. **Widget (Android)**
- ✅ Show latest partner photo
- ✅ Update instantly when moment received
- ✅ Work even when app closed (via FCM)
- ✅ Persist across app restarts

---

## 🧪 Test Cases

### Test 1: Gallery Shows Photos
```
STEPS:
1. Open app
2. Send a moment
3. Navigate to Gallery
4. Check if photo appears

EXPECTED:
✅ Photo shows in grid
✅ Sorted by newest first
✅ Shows "me" indicator
✅ Can tap to view full size
```

### Test 2: Partner Photos in Gallery
```
STEPS:
1. Partner sends moment
2. Receive notification
3. Navigate to Gallery
4. Check if partner's photo appears

EXPECTED:
✅ Photo shows in grid
✅ Shows "heart" indicator (partner)
✅ Sorted correctly
✅ Can tap to view
```

### Test 3: Widget Updates (App Open)
```
STEPS:
1. Partner sends moment
2. Check home screen widget

EXPECTED:
✅ Widget updates within 2 seconds
✅ Shows partner's photo
✅ Shows partner name
✅ No errors in logs
```

### Test 4: Widget Updates (App Closed)
```
STEPS:
1. Close app completely
2. Partner sends moment
3. Check home screen widget

EXPECTED:
✅ Widget updates via FCM
✅ Shows partner's photo
✅ Push notification appears
✅ Widget persists after phone restart
```

### Test 5: Gallery Empty State
```
STEPS:
1. Fresh install (no photos)
2. Navigate to Gallery

EXPECTED:
✅ Shows empty state message
✅ "Capture First Moment" button
✅ Beautiful gradient background
✅ No errors
```

---

## 🔍 Current Implementation Check

### Gallery Screen (`GalleryScreen.tsx`):
```typescript
✅ Loads photos from LocalPhotoStorage
✅ Converts metadata to Photo format
✅ Filters out invalid URIs
✅ Sorts by timestamp (newest first)
✅ Limits to 10 for free users
✅ Shows both user and partner photos
✅ Grid and timeline views
✅ Photo preview modal
```

### Widget Service (`WidgetService.ts`):
```typescript
✅ Singleton pattern
✅ Android-only (Platform check)
✅ Saves photo to permanent location
✅ Updates widget via native module
✅ Stores widget data in AsyncStorage
✅ Cleans up old photos (keeps 3)
✅ Restores on app restart
```

### Local Photo Storage (`LocalPhotoStorage.ts`):
```typescript
✅ Saves photos with metadata
✅ Generates unique IDs
✅ Stores in device directory
✅ Tracks sender (me/partner)
✅ Returns all photos with metadata
✅ Handles encryption option
```

---

## 🐛 Potential Issues & Fixes

### Issue 1: Photos Not Showing in Gallery
**Symptoms**: Gallery empty even after sending moments
**Possible Causes**:
- Photo not saved to LocalPhotoStorage
- Metadata not created
- URI path incorrect

**Fix**:
```typescript
// Check if photo is being saved
console.log('Saving photo:', photoUri);
const photoId = await LocalPhotoStorage.savePhoto(photoUri, 'me', false);
console.log('Photo saved with ID:', photoId);

// Check if photo can be retrieved
const uri = await LocalPhotoStorage.getPhotoUri(photoId);
console.log('Retrieved URI:', uri);
```

### Issue 2: Widget Not Updating
**Symptoms**: Widget shows old photo or doesn't update
**Possible Causes**:
- Native module not linked
- Photo path incorrect
- Widget service not initialized

**Fix**:
```typescript
// Check widget support
const isSupported = await WidgetService.isWidgetSupported();
console.log('Widget supported:', isSupported);

// Check if photo is being passed correctly
console.log('Updating widget with:', photoUri, partnerName);
const success = await WidgetService.updateWidget(photoUri, partnerName);
console.log('Widget update success:', success);
```

### Issue 3: Partner Photos Not Appearing
**Symptoms**: Only user's photos show, not partner's
**Possible Causes**:
- Photo not saved with correct sender
- Socket.IO not receiving events
- FCM not processing correctly

**Fix**:
```typescript
// In moment receive handler
console.log('Received moment from:', data.partnerName);
const photoId = await LocalPhotoStorage.savePhoto(
  `data:image/jpeg;base64,${data.photoBase64}`,
  'partner', // ← Make sure this is 'partner'
  false
);
console.log('Partner photo saved:', photoId);
```

---

## 📝 Debug Checklist

### Before Testing:
- [ ] Backend is running
- [ ] Socket.IO connected
- [ ] FCM initialized (check logs)
- [ ] Widget service initialized
- [ ] LocalPhotoStorage initialized

### During Testing:
- [ ] Check console logs for errors
- [ ] Verify photo saves locally
- [ ] Check metadata.json file
- [ ] Verify widget data in AsyncStorage
- [ ] Check FCM token registered

### After Testing:
- [ ] Gallery shows all photos
- [ ] Widget displays latest photo
- [ ] Notifications appear
- [ ] No memory leaks
- [ ] Performance is good

---

## 🔧 Quick Fixes

### Fix 1: Force Reload Gallery
```typescript
// In GalleryScreen
const onRefresh = async () => {
  setRefreshing(true);
  await loadPhotos();
  setRefreshing(false);
};

// Add pull-to-refresh
<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
```

### Fix 2: Force Update Widget
```typescript
// In UploadScreen or anywhere
const forceUpdateWidget = async () => {
  const photos = await LocalPhotoStorage.getAllPhotos();
  const latestPartnerPhoto = photos
    .filter(p => p.sender === 'partner')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  
  if (latestPartnerPhoto) {
    const uri = await LocalPhotoStorage.getPhotoUri(latestPartnerPhoto.id);
    if (uri) {
      await WidgetService.updateWidget(uri, 'Partner');
    }
  }
};
```

### Fix 3: Clear and Reset
```typescript
// Clear all data and start fresh
const resetApp = async () => {
  await LocalPhotoStorage.deleteAllPhotos();
  await WidgetService.clearWidget();
  await AsyncStorage.clear();
  console.log('App reset complete');
};
```

---

## 📊 Expected Logs (Success)

### When Sending Moment:
```
✅ Photo saved locally: photo_abc123.jpg
✅ Moment sent to Partner!
✅ Widget updated with latest photo
✅ Loaded 1 photos from storage
```

### When Receiving Moment:
```
📥 New moment received
✅ Photo saved locally: photo_xyz789.jpg
📱 New photo received, updating widget...
✅ Widget updated with new photo
💕 New Moment from Partner
✅ Loaded 2 photos from storage
```

### In Gallery:
```
✅ Loaded 2 photos from storage (2 total, user + partner)
```

---

## 🎯 Success Criteria

### Gallery:
- [ ] Shows all photos (user + partner)
- [ ] Newest first
- [ ] Grid view works
- [ ] Timeline view works
- [ ] Photo preview works
- [ ] Empty state shows correctly
- [ ] Free user limit works (10 photos)

### Widget:
- [ ] Updates within 2 seconds (app open)
- [ ] Updates via FCM (app closed)
- [ ] Shows partner name
- [ ] Persists across restarts
- [ ] No crashes
- [ ] No memory leaks

---

## 🚀 Next Steps After MVP Works

1. Add photo reactions
2. Add photo captions
3. Add photo filters
4. Add photo sharing
5. Add photo albums
6. Add photo search
7. Add photo favorites

---

**Priority**: Get Gallery + Widget working 100% first! 🎯
