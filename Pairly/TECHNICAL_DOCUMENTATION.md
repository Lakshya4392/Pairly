# 🔧 Pairly - Technical Documentation

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Service Layer](#service-layer)
3. [Real-time Communication](#real-time-communication)
4. [Photo Flow](#photo-flow)
5. [Widget System](#widget-system)
6. [Authentication](#authentication)
7. [Storage System](#storage-system)
8. [Premium System](#premium-system)
9. [Error Handling](#error-handling)
10. [Performance Optimization](#performance-optimization)

---

## 🏗️ Architecture Overview

### **Application Structure**
```
Pairly/
├── src/
│   ├── components/        # Reusable UI components
│   ├── screens/          # Screen components
│   ├── services/         # Business logic layer
│   ├── navigation/       # Navigation configuration
│   ├── contexts/         # React contexts
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── theme/           # Design system
│   ├── types/           # TypeScript types
│   └── config/          # App configuration
├── android/             # Android native code
│   └── app/src/main/
│       ├── java/        # Kotlin/Java code
│       └── res/         # Android resources
└── ios/                 # iOS native code (future)
```

### **Design Pattern**
- **Architecture:** Service-oriented architecture
- **State Management:** Context API + Hooks
- **Data Flow:** Unidirectional data flow
- **Component Pattern:** Functional components with hooks
- **Error Handling:** Try-catch with graceful fallbacks

---

## 🔌 Service Layer

### **Core Services**

#### **1. AuthService**
```typescript
// Handles authentication and token management
- login(email, password)
- logout()
- getToken()
- refreshToken()
- isAuthenticated()
```

#### **2. PairingService**
```typescript
// Manages partner pairing
- generatePairingCode()
- pairWithCode(code)
- getPartner()
- unpair()
- isPaired()
```

#### **3. MomentService**
```typescript
// Photo upload and receive logic
- uploadPhoto(photo, note)
- receivePhoto(data)
- getMoments()
- deleteMoment(id)
- schedulePhoto(photo, time)
```

#### **4. RealtimeService**
```typescript
// Socket.IO connection management
- connect(userId)
- disconnect()
- emit(event, data)
- on(event, callback)
- getConnectionStatus()
```

#### **5. WidgetService**
```typescript
// Android widget management
- updateWidget(photoUri, partnerName)
- clearWidget()
- isWidgetSupported()
- onPhotoReceived(photoUri)
```

#### **6. NotificationService**
```typescript
// Push notification handling
- requestPermissions()
- scheduleNotification(title, body)
- showMomentNotification(senderName)
- cancelAllNotifications()
```

#### **7. PremiumService**
```typescript
// Subscription management
- isPremium()
- purchaseSubscription(plan)
- restorePurchases()
- getSubscriptionStatus()
```

---

## 🔴 Real-time Communication

### **Socket.IO Implementation**

#### **Connection Flow**
```
1. User logs in
   ↓
2. AuthService gets token
   ↓
3. RealtimeService.connect(userId)
   ↓
4. Socket connects with auth token
   ↓
5. Join user's personal room
   ↓
6. Setup event listeners
   ↓
7. Start heartbeat
```

#### **Event Handlers**
```typescript
// Incoming Events
socket.on('receive_photo', handlePhotoReceived)
socket.on('partner_connected', handlePartnerConnected)
socket.on('partner_presence', handlePresence)
socket.on('photo_reaction', handleReaction)
socket.on('receive_note', handleNoteReceived)
socket.on('timelock_unlocked', handleTimeLockUnlocked)

// Outgoing Events
socket.emit('send_photo', photoData)
socket.emit('heartbeat', { userId })
socket.emit('photo_reaction', { photoId, reaction })
socket.emit('send_note', noteData)
```

#### **Connection Optimization**
- **Transport Order:** Polling → WebSocket (APK reliability)
- **Reconnection:** Exponential backoff (2s to 20s)
- **Timeout:** 45s for APK, 20s for dev
- **Heartbeat:** 30s interval (foreground only)
- **Network Awareness:** Auto-reconnect on network restore
- **App State:** Pause in background, resume in foreground

#### **Error Recovery**
```typescript
// Automatic retry logic
if (socket.disconnected) {
  // Queue message for retry
  await queueForRetry(data)
  
  // Attempt reconnection
  socket.connect()
  
  // Process queue on reconnect
  socket.on('reconnect', processQueue)
}
```

---

## 📸 Photo Flow

### **Upload Flow (Sender)**
```
1. User selects/captures photo
   ↓
2. PhotoPreviewScreen shows preview
   ↓
3. User adds optional caption
   ↓
4. MomentService.uploadPhoto()
   ↓
5. Save to LocalPhotoStorage (instant)
   ↓
6. Compress photo (PhotoService)
   ↓
7. Convert to base64
   ↓
8. Send via Socket.IO with ack
   ↓
9. Wait for delivery confirmation
   ↓
10. Show success notification
```

### **Receive Flow (Receiver)**
```
1. Socket receives 'receive_photo' event
   ↓
2. Verify sender is paired partner
   ↓
3. Check for duplicate (de-duplication)
   ↓
4. Show push notification
   ↓
5. MomentService.receivePhoto()
   ↓
6. Convert base64 to file
   ↓
7. Save to LocalPhotoStorage
   ↓
8. Save to widget_photos directory
   ↓
9. Update Android widget
   ↓
10. Trigger gallery refresh
   ↓
11. Send acknowledgment
```

### **Photo Compression**
```typescript
// PhotoService compression logic
const compress = async (photo, quality) => {
  const options = {
    compress: quality === 'premium' ? 0.9 : 0.7,
    format: 'jpeg',
    base64: true,
  }
  
  return await manipulateAsync(
    photo.uri,
    [{ resize: { width: 1920 } }],
    options
  )
}
```

### **Offline Queue**
```typescript
// Queue system for offline photos
const queuePhoto = async (photo) => {
  const queue = await getQueue()
  queue.push({
    photo,
    timestamp: Date.now(),
    retries: 0,
  })
  await saveQueue(queue)
}

// Process queue on reconnect
const processQueue = async () => {
  const queue = await getQueue()
  for (const item of queue) {
    await uploadPhoto(item.photo)
  }
  await clearQueue()
}
```

---

## 🎨 Widget System

### **Android Widget Architecture**

#### **Components**
```
PremiumCarouselWidgetProvider.kt
├── updateWidget()           # Main update logic
├── loadPhotoList()         # Load photos from storage
├── loadBitmap()            # Load and scale images
├── updateDotIndicators()   # Update carousel dots
└── setupClickListeners()   # Handle widget taps
```

#### **Widget Update Flow**
```
1. Photo received in app
   ↓
2. WidgetService.onPhotoReceived()
   ↓
3. Verify photo file exists
   ↓
4. Save to widget_photos directory
   ↓
5. Call native PairlyWidgetModule
   ↓
6. Broadcast to WidgetProvider
   ↓
7. WidgetProvider.updateWidget()
   ↓
8. Load latest 3 photos
   ↓
9. Update RemoteViews
   ↓
10. AppWidgetManager.updateAppWidget()
```

#### **Widget States**
```kotlin
// Empty State
if (photoList.isEmpty()) {
  views.setViewVisibility(R.id.photo_carousel, GONE)
  views.setViewVisibility(R.id.widget_placeholder, VISIBLE)
}

// Photo State
else {
  views.setViewVisibility(R.id.photo_carousel, VISIBLE)
  views.setViewVisibility(R.id.widget_placeholder, GONE)
  // Load and display photos
}

// Error State (fallback to empty)
catch (e: Exception) {
  showEmptyState()
}
```

#### **Widget Storage**
```
/data/data/com.pairly.app/files/widget_photos/
├── widget_photo_1733097600000.jpg  (latest)
├── widget_photo_1733011200000.jpg
└── widget_photo_1732924800000.jpg  (oldest)

// Keep only latest 3 photos
// Auto-cleanup on new photo save
```

---

## 🔐 Authentication

### **Clerk Integration**

#### **Auth Flow**
```
1. User opens app
   ↓
2. Check if authenticated (Clerk)
   ↓
3. If yes → Load user data
   ↓
4. If no → Show AuthScreen
   ↓
5. User signs in (email/Google/Apple)
   ↓
6. Clerk validates credentials
   ↓
7. Get auth token
   ↓
8. Store token securely
   ↓
9. Connect to Socket.IO
   ↓
10. Navigate to main app
```

#### **Token Management**
```typescript
// Get fresh token
const getToken = async () => {
  const session = await getSession()
  return await session.getToken()
}

// Auto-refresh on expiry
const refreshToken = async () => {
  const newToken = await getToken()
  await updateSocketAuth(newToken)
}
```

#### **Session Handling**
```typescript
// Check session validity
const isAuthenticated = async () => {
  const session = await getSession()
  return session?.status === 'active'
}

// Handle session expiry
const handleExpiry = async () => {
  await signOut()
  await disconnectSocket()
  navigateToAuth()
}
```

---

## 💾 Storage System

### **Local Photo Storage**

#### **Storage Structure**
```typescript
// Photo metadata
interface PhotoMetadata {
  id: string              // Unique photo ID
  uri: string            // File system path
  timestamp: Date        // Upload/receive time
  sender: 'me' | 'partner'
  caption?: string       // Optional caption
  reactions?: string[]   // Reactions array
}

// Storage location
const PHOTOS_DIR = FileSystem.documentDirectory + 'photos/'
const METADATA_KEY = '@pairly_photos_metadata'
```

#### **Save Photo**
```typescript
const savePhoto = async (uri: string, sender: string) => {
  // 1. Generate unique ID
  const photoId = generateId()
  
  // 2. Copy to permanent location
  const destination = PHOTOS_DIR + photoId + '.jpg'
  await FileSystem.copyAsync({ from: uri, to: destination })
  
  // 3. Save metadata
  const metadata = {
    id: photoId,
    uri: destination,
    timestamp: new Date(),
    sender,
  }
  await saveMetadata(metadata)
  
  return photoId
}
```

#### **Load Photos**
```typescript
const getAllPhotos = async () => {
  // 1. Load metadata from AsyncStorage
  const metadataJson = await AsyncStorage.getItem(METADATA_KEY)
  const metadata = JSON.parse(metadataJson || '[]')
  
  // 2. Verify files exist
  const validPhotos = []
  for (const photo of metadata) {
    const exists = await FileSystem.getInfoAsync(photo.uri)
    if (exists.exists) {
      validPhotos.push(photo)
    }
  }
  
  // 3. Sort by timestamp (newest first)
  return validPhotos.sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  )
}
```

#### **Storage Cleanup**
```typescript
const cleanupOldPhotos = async () => {
  const photos = await getAllPhotos()
  
  // Keep only last 100 photos
  if (photos.length > 100) {
    const toDelete = photos.slice(100)
    
    for (const photo of toDelete) {
      await FileSystem.deleteAsync(photo.uri)
      await removeMetadata(photo.id)
    }
  }
}
```

---

## 💎 Premium System

### **Subscription Management**

#### **Premium Check**
```typescript
const isPremium = async () => {
  // 1. Check local cache first
  const cached = await AsyncStorage.getItem('@premium_status')
  if (cached) return JSON.parse(cached)
  
  // 2. Verify with backend
  const status = await api.get('/subscription/status')
  
  // 3. Update cache
  await AsyncStorage.setItem('@premium_status', 
    JSON.stringify(status.isPremium)
  )
  
  return status.isPremium
}
```

#### **Feature Gating**
```typescript
const checkFeatureAccess = async (feature: string) => {
  const premium = await isPremium()
  
  const premiumFeatures = [
    'dual_camera',
    'shared_notes',
    'time_lock',
    'memories_lock',
    'custom_themes',
    'high_quality',
    'unlimited_moments',
    'widget',
  ]
  
  if (premiumFeatures.includes(feature) && !premium) {
    showUpgradePrompt(feature)
    return false
  }
  
  return true
}
```

#### **Daily Limits**
```typescript
const checkDailyLimit = async () => {
  const premium = await isPremium()
  
  if (premium) {
    return { allowed: true, remaining: Infinity }
  }
  
  // Free users: 3 moments per day
  const today = new Date().toDateString()
  const count = await getDailyCount(today)
  
  if (count >= 3) {
    return { allowed: false, remaining: 0 }
  }
  
  return { allowed: true, remaining: 3 - count }
}
```

---

## 🛡️ Error Handling

### **Error Boundary**
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log error
    console.error('Error caught:', error, errorInfo)
    
    // Report to monitoring service
    reportError(error, errorInfo)
    
    // Show user-friendly message
    this.setState({ hasError: true })
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorScreen onRetry={this.reset} />
    }
    return this.props.children
  }
}
```

### **Network Error Handling**
```typescript
const safeFetch = async (url, options) => {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    if (error.message === 'Network request failed') {
      // Offline - queue for retry
      await queueRequest(url, options)
      throw new Error('You are offline. Request queued.')
    }
    
    throw error
  }
}
```

### **Graceful Degradation**
```typescript
const uploadPhoto = async (photo) => {
  try {
    // Try high quality first
    return await uploadHighQuality(photo)
  } catch (error) {
    console.warn('High quality failed, trying standard')
    
    try {
      // Fallback to standard quality
      return await uploadStandardQuality(photo)
    } catch (error) {
      console.error('Upload failed, queueing')
      
      // Queue for later
      await queuePhoto(photo)
      throw new Error('Upload queued for retry')
    }
  }
}
```

---

## ⚡ Performance Optimization

### **Image Optimization**
```typescript
// Lazy loading
const LazyImage = ({ uri }) => {
  const [loaded, setLoaded] = useState(false)
  
  return (
    <>
      {!loaded && <Skeleton />}
      <Image
        source={{ uri }}
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </>
  )
}

// Caching
const cachedImage = {
  uri: photo.uri,
  cache: 'force-cache',
}
```

### **Memory Management**
```typescript
// Cleanup on unmount
useEffect(() => {
  return () => {
    // Cancel pending requests
    abortController.abort()
    
    // Clear timers
    clearInterval(intervalId)
    
    // Remove listeners
    removeEventListeners()
  }
}, [])
```

### **Render Optimization**
```typescript
// Memoization
const MemoizedComponent = React.memo(Component, (prev, next) => {
  return prev.id === next.id
})

// useMemo for expensive calculations
const sortedPhotos = useMemo(() => {
  return photos.sort((a, b) => b.timestamp - a.timestamp)
}, [photos])

// useCallback for functions
const handlePress = useCallback(() => {
  onPress(id)
}, [id, onPress])
```

### **Bundle Size Optimization**
```typescript
// Code splitting
const PremiumScreen = lazy(() => import('./PremiumScreen'))

// Conditional imports
if (Platform.OS === 'android') {
  const WidgetService = require('./WidgetService').default
}
```

---

## 🔍 Debugging & Monitoring

### **Performance Monitoring**
```typescript
class PerformanceMonitor {
  static startTimer(label: string) {
    this.timers.set(label, Date.now())
  }
  
  static endTimer(label: string) {
    const start = this.timers.get(label)
    const duration = Date.now() - start
    console.log(`⏱️ ${label}: ${duration}ms`)
  }
  
  static recordConnectionDrop() {
    this.connectionDrops++
  }
}
```

### **Debug Logs**
```typescript
// Conditional logging
const log = {
  debug: __DEV__ ? console.log : () => {},
  network: __DEV__ ? console.log : () => {},
  error: console.error, // Always log errors
}
```

### **Health Checks**
```typescript
const healthCheck = async () => {
  return {
    socket: RealtimeService.getConnectionStatus(),
    auth: await AuthService.isAuthenticated(),
    storage: await checkStorageHealth(),
    network: await NetInfo.fetch(),
  }
}
```

---

## 📱 Platform-Specific Code

### **Android Native Module**
```kotlin
// PairlyWidgetModule.kt
class PairlyWidgetModule(reactContext: ReactApplicationContext) 
  : ReactContextBaseJavaModule(reactContext) {
  
  @ReactMethod
  fun updateWidget(photoPath: String, partnerName: String, 
                   timestamp: Double, promise: Promise) {
    try {
      // Update widget logic
      val intent = Intent(context, PremiumCarouselWidgetProvider::class.java)
      intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
      context.sendBroadcast(intent)
      
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ERROR", e.message)
    }
  }
}
```

### **iOS Native Module** (Future)
```swift
// PairlyWidget.swift
@objc(PairlyWidget)
class PairlyWidget: NSObject {
  @objc
  func updateWidget(_ photoPath: String, 
                    partnerName: String,
                    timestamp: Double,
                    resolver: @escaping RCTPromiseResolveBlock,
                    rejecter: @escaping RCTPromiseRejectBlock) {
    // iOS widget update logic
  }
}
```

---

## 🚀 Build & Deployment

### **Development Build**
```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### **Production Build**
```bash
# Android APK
cd android
./gradlew assembleRelease

# Android AAB (Play Store)
./gradlew bundleRelease

# iOS (future)
cd ios
xcodebuild -workspace Pairly.xcworkspace -scheme Pairly archive
```

### **Environment Configuration**
```typescript
// config/api.config.ts
export const API_CONFIG = {
  baseUrl: __DEV__ 
    ? 'http://localhost:3000'
    : 'https://api.pairly.app',
  socketUrl: __DEV__
    ? 'http://localhost:3000'
    : 'https://api.pairly.app',
}
```

---

## 📚 Best Practices

### **Code Style**
- Use TypeScript for type safety
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful comments
- Keep functions small and focused

### **Component Structure**
```typescript
// 1. Imports
import React from 'react'

// 2. Types
interface Props {
  title: string
}

// 3. Component
export const Component: React.FC<Props> = ({ title }) => {
  // 4. Hooks
  const [state, setState] = useState()
  
  // 5. Effects
  useEffect(() => {}, [])
  
  // 6. Handlers
  const handlePress = () => {}
  
  // 7. Render
  return <View />
}

// 8. Styles
const styles = StyleSheet.create({})
```

### **Service Pattern**
```typescript
class Service {
  private static instance: Service
  
  private constructor() {}
  
  static getInstance(): Service {
    if (!Service.instance) {
      Service.instance = new Service()
    }
    return Service.instance
  }
  
  async method() {
    // Implementation
  }
}

export default Service.getInstance()
```

---

**Last Updated:** December 1, 2025  
**Maintained by:** Pairly Development Team
