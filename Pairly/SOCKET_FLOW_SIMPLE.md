# 🔥 Socket Connection & Moment Send - Simple Flow

## 📱 1. APP START - Connection Setup

```
User Opens App
    ↓
App.tsx useEffect runs
    ↓
Get Clerk Auth Token → await getToken()
    ↓
Store in AsyncStorage → 'auth_token'
    ↓
RealtimeService.connect(userId)
    ↓
Socket.IO connects with:
  - auth: { token }
  - transports: ['websocket']
  - Network listener (NetInfo)
  - App state listener (background/foreground)
    ↓
Socket emits: 'join_room' { userId }
    ↓
Server responds: 'room_joined'
    ↓
Start Heartbeat (every 30s, foreground only)
    ↓
✅ CONNECTED & READY
```

---

## 📸 2. SEND MOMENT - Complete Flow

```
User Takes Photo
    ↓
MomentService.uploadPhoto(photo, note)
    ↓
┌─────────────────────────────────────┐
│ STEP 1: Save Locally (INSTANT)     │
│ LocalStorageService.savePhoto()     │
│ ✅ Photo saved on device            │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ STEP 2: Check Partner               │
│ PairingService.getPartner()         │
│                                     │
│ NO PARTNER? → Queue & Return        │
│ ✅ Has Partner? → Continue          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ STEP 3: Check Connection            │
│ RealtimeService.getConnectionStatus()│
│                                     │
│ OFFLINE? → Queue & Return           │
│ ✅ Online? → Continue               │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ STEP 4: Compress Photo              │
│ PhotoService.compressPhoto()        │
│ Convert to base64                   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ STEP 5: Send via Socket (3 Retries)│
│                                     │
│ Attempt 1:                          │
│   RealtimeService.emit('send_photo',│
│     {                               │
│       photoId,                      │
│       photoData: base64,            │
│       partnerId,                    │
│       caption,                      │
│       timestamp                     │
│     }                               │
│   )                                 │
│   ↓                                 │
│   Wait 3s for confirmation          │
│   ↓                                 │
│   ✅ Confirmed? → SUCCESS           │
│   ❌ No response? → Retry           │
│                                     │
│ Attempt 2: (wait 1s, retry)        │
│ Attempt 3: (wait 2s, retry)        │
│                                     │
│ All Failed? → Queue for later       │
└─────────────────────────────────────┘
    ↓
✅ SUCCESS - Show notification
```

---

## 📥 3. RECEIVE MOMENT - Complete Flow

```
Partner Sends Photo
    ↓
Backend emits: 'receive_photo' to your socket
    ↓
RealtimeService receives event
    ↓
┌─────────────────────────────────────┐
│ De-duplication Check                │
│ messageId already processed?        │
│ YES → Ignore (duplicate)            │
│ NO → Continue                       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Verify Sender                       │
│ Is sender your paired partner?      │
│ NO → Ignore (security)              │
│ YES → Continue                      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Save Photo Locally                  │
│ LocalPhotoStorage.savePhoto()       │
│ Save as 'partner' photo             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Update Widget (Android)             │
│ OptimizedWidgetService.onPhotoReceived()│
│ Show on home screen                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Send Acknowledgment                 │
│ RealtimeService.emit('photo_received')│
│ Confirm to partner                  │
└─────────────────────────────────────┘
    ↓
✅ DONE - Show notification
```

---

## 🔄 4. BACKGROUND/FOREGROUND - Auto Reconnect

```
App Goes to Background
    ↓
AppState listener detects: 'background'
    ↓
Stop Heartbeat (save battery)
    ↓
Socket stays connected (for notifications)
    ↓
─────────────────────────────────────
    ↓
App Comes to Foreground
    ↓
AppState listener detects: 'active'
    ↓
Check socket connection
    ↓
Disconnected? → socket.connect()
    ↓
Restart Heartbeat
    ↓
Process Queued Moments
    ↓
✅ RECONNECTED
```

---

## 🌐 5. NETWORK LOST/RESTORED - Smart Reconnect

```
Internet Lost (Flight Mode)
    ↓
NetInfo detects: isConnected = false
    ↓
Log: "📡 Network status: Offline"
    ↓
Socket disconnects automatically
    ↓
Stop trying to reconnect (save battery)
    ↓
─────────────────────────────────────
    ↓
Internet Restored
    ↓
NetInfo detects: isConnected = true
    ↓
Log: "🌐 Internet restored"
    ↓
socket.connect()
    ↓
Join room again
    ↓
Process Queued Moments
    ↓
✅ RECONNECTED
```

---

## 📦 6. QUEUED MOMENTS - Retry Logic

```
Moment Failed to Send
    ↓
Save to Queue:
  {
    momentId,
    photoUri,
    note,
    partnerId,
    queuedAt: timestamp
  }
    ↓
Store in AsyncStorage: '@pairly_moment_queue'
    ↓
─────────────────────────────────────
    ↓
Connection Restored
    ↓
RealtimeService.on('reconnect') fires
    ↓
MomentService.processQueuedMoments()
    ↓
For each queued moment:
  - Compress photo
  - Send via socket
  - Remove from queue if successful
    ↓
✅ ALL QUEUED MOMENTS SENT
```

---

## 🎯 KEY FILES & THEIR ROLES

### RealtimeService.ts
**Role:** Socket connection manager
- Connects to server
- Handles events (receive_photo, partner_connected, etc.)
- Network awareness (NetInfo)
- App state handling (background/foreground)
- De-duplication (prevents duplicate photos)
- Battery optimization (smart heartbeat)

### MomentService.ts
**Role:** Photo/moment business logic
- Upload photo (compress, send, retry)
- Receive photo (save, update widget)
- Queue management (offline support)
- Local storage integration

### SocketConnectionService.ts
**Role:** Low-level socket operations
- Auth token handling
- WebSocket-only transport
- Acknowledgment callbacks
- Reconnection logic

---

## 🔥 ACTUAL CODE FLOW (Copy-Paste Ready)

### In App.tsx (Initialize Socket):
```typescript
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import RealtimeService from './services/RealtimeService';
import AsyncStorage from '@react-native-async-storage/async-storage';

function App() {
  const { userId, getToken } = useAuth();

  useEffect(() => {
    if (userId) {
      (async () => {
        // Get token
        const token = await getToken();
        await AsyncStorage.setItem('auth_token', token);
        
        // Connect socket
        await RealtimeService.connect(userId);
        RealtimeService.startHeartbeat(userId);
        
        console.log('✅ Socket ready');
      })();
    }

    return () => {
      RealtimeService.stopHeartbeat();
      RealtimeService.disconnect();
    };
  }, [userId]);

  return <YourApp />;
}
```

### In Photo Screen (Send Moment):
```typescript
import MomentService from './services/MomentService';

async function sendPhoto(photoUri: string, note: string) {
  const result = await MomentService.uploadPhoto(
    { uri: photoUri },
    note
  );
  
  if (result.success) {
    console.log('✅ Photo sent!');
  } else {
    console.log('⚠️ Queued:', result.error);
  }
}
```

### In Gallery Screen (Receive Moment):
```typescript
import { useEffect } from 'react';
import RealtimeService from './services/RealtimeService';

function GalleryScreen() {
  useEffect(() => {
    const handlePhoto = (data) => {
      console.log('📸 New photo from partner!');
      // UI will auto-update from LocalStorage
    };

    RealtimeService.on('receive_photo', handlePhoto);
    
    return () => {
      RealtimeService.off('receive_photo', handlePhoto);
    };
  }, []);

  return <PhotoGallery />;
}
```

---

## ✅ WHAT'S ALREADY WORKING

1. ✅ **Auth Token** - Automatically passed in socket connection
2. ✅ **WebSocket-only** - Fast mobile connection
3. ✅ **Network Awareness** - Smart reconnect (NetInfo)
4. ✅ **De-duplication** - No duplicate photos
5. ✅ **Battery Optimization** - Heartbeat only in foreground
6. ✅ **Background Recovery** - Auto-reconnect on app open
7. ✅ **Retry Logic** - 3 attempts before queueing
8. ✅ **Queue System** - Offline support
9. ✅ **Acknowledgments** - Delivery confirmation

---

## 🚀 READY TO USE

**No changes needed!** Your code is production-ready.

Just make sure:
1. Backend accepts `messageId` in events
2. Backend sends acknowledgment callbacks
3. Backend emits `receive_photo` with `messageId`

**That's it!** Socket will handle everything else automatically.
