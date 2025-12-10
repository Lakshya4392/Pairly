# Widget Testing Guide

## ✅ FIXED: Simple 3x3 Widget Implementation

### What was fixed:
1. **Layout Structure**: Changed from LinearLayout to FrameLayout with proper visibility management
2. **Default State**: Shows heart emoji + "Pairly" + "Tap to open" immediately
3. **Photo State**: Hides default container and shows photo when available
4. **Widget Registration**: Properly registered in AndroidManifest.xml
5. **Widget Info**: Added preview image and proper configuration

### Current Widget Features:
- **Size**: 3x3 (180dp x 180dp)
- **Default State**: Heart emoji ❤️ + "Pairly" + "Tap to open"
- **Photo State**: Full photo display when moment available
- **Polling**: Every 10 seconds from backend API
- **Click Action**: Opens Pairly app

### Testing Steps:
1. **Build & Install**: `npx expo run:android` ✅ COMPLETED
2. **Add Widget**: Long press home screen → Widgets → Find "Pairly" → Add 3x3 widget
3. **Verify Default**: Should show heart + "Pairly" + "Tap to open" immediately
4. **Test Click**: Tap widget should open Pairly app
5. **Test Photo**: Upload a moment and wait 10 seconds for widget to update

### Expected Behavior:
- ✅ Widget shows default state immediately (no "Can't load widget")
- ✅ Widget is clickable and opens app
- ✅ Widget polls backend every 10 seconds for new photos
- ✅ Widget updates with partner's photo when available

### Backend API Ready:
- ✅ `GET /moments/latest` - Returns base64 photo + partner info
- ✅ Authentication via Bearer token from SharedPreferences
- ✅ Proper logging for widget vs app requests

### Next Steps:
1. Test widget on device/emulator
2. Verify default state appears correctly
3. Test photo upload and widget update flow
4. Confirm 10-second polling works