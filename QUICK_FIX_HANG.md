# 🚨 Quick Fix for App Hang/Freeze

## Immediate Solutions

### 1. Clear Metro Cache
```bash
# Stop the app (Ctrl+C)

# Clear cache
npx expo start -c

# Or
npm start -- --reset-cache
```

### 2. Clear React Native Cache
```bash
# Windows
rd /s /q %TEMP%\metro-*
rd /s /q %TEMP%\haste-*

# Then restart
npm start
```

### 3. Restart Everything
```bash
# Kill all node processes
taskkill /F /IM node.exe

# Clear node_modules cache
cd Pairly
rm -rf node_modules/.cache

# Restart
npm start
```

### 4. Check for Infinite Loops

**Common causes:**
- useEffect without dependencies
- setState in render
- Circular imports

**Quick check:**
```bash
# Check console for errors
# Look for:
# - "Maximum update depth exceeded"
# - "Too many re-renders"
# - Memory warnings
```

### 5. Disable Performance Optimizations Temporarily

If the new performance code is causing issues, temporarily disable:

**In GalleryScreen.tsx:**
```typescript
// Comment out the performance optimizer
const loadPhotos = async () => {
  try {
    const LocalPhotoStorage = (await import('../services/LocalPhotoStorage')).default;
    // const { runAfterInteractions, batchOperations } = await import('../utils/performanceOptimizer');
    
    // Direct load without optimization
    const allPhotos = await LocalPhotoStorage.getAllPhotos();
    
    const loadedPhotos: Photo[] = await Promise.all(
      allPhotos.map(async (photo) => {
        const uri = await LocalPhotoStorage.getPhotoUri(photo.id);
        return {
          id: photo.id,
          uri: uri || '',
          timestamp: new Date(photo.timestamp),
          sender: photo.sender,
        };
      })
    );

    const validPhotos = loadedPhotos.filter(p => p.uri);
    const sortedPhotos = validPhotos.sort((a, b) => {
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    const availablePhotos = isPremium ? sortedPhotos : sortedPhotos.slice(0, 10);
    setPhotos(availablePhotos);
  } catch (error) {
    console.error('Error loading photos:', error);
    setPhotos([]);
  }
};
```

### 6. Check Specific Screens

**If Settings screen hangs:**
```typescript
// In SettingsScreen.tsx
// Comment out the performance optimizer in useEffect
useEffect(() => {
  let mounted = true;
  
  const loadAll = async () => {
    if (!mounted) return;
    
    // Load everything directly
    await loadUserInfo();
    await loadSettings();
    await loadPartnerInfo();
    await loadAppLockSettings();
    await loadAllPremiumSettings();
    setupDisconnectListener();
  };
  
  loadAll();
  
  return () => {
    mounted = false;
  };
}, []);
```

### 7. Emergency Rollback

If nothing works, rollback the performance changes:

```bash
# Revert GalleryScreen
git checkout HEAD -- Pairly/src/screens/GalleryScreen.tsx

# Revert SettingsScreen  
git checkout HEAD -- Pairly/src/screens/SettingsScreen.tsx

# Revert UploadScreen
git checkout HEAD -- Pairly/src/screens/UploadScreen.tsx

# Restart
npm start
```

### 8. Check Console Logs

Look for these patterns:
```
❌ Maximum update depth exceeded
❌ Too many re-renders
❌ Memory warning
❌ Circular dependency detected
❌ Cannot read property of undefined
```

### 9. Simplify ReminderSettingsModal

If modal is causing hang:

```typescript
// In ReminderSettingsModal.tsx
// Simplify useEffect
useEffect(() => {
  if (visible) {
    loadSettings();
  }
}, [visible]); // Only reload when modal opens
```

### 10. Nuclear Option - Fresh Start

```bash
# Stop everything
taskkill /F /IM node.exe

# Delete caches
cd Pairly
rm -rf node_modules
rm -rf .expo
rm -rf android/build
rm -rf android/app/build

# Reinstall
npm install

# Start fresh
npm start
```

---

## Most Likely Causes

### 1. Performance Optimizer Import Issue
The new `performanceOptimizer.ts` might have circular dependency.

**Quick fix:**
```typescript
// Instead of dynamic import
const { runAfterInteractions } = await import('../utils/performanceOptimizer');

// Use direct implementation
import { InteractionManager } from 'react-native';

const runAfterInteractions = (callback) => {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(async () => {
      const result = await callback();
      resolve(result);
    });
  });
};
```

### 2. Infinite Re-render in Settings
Check if any state update is causing re-render loop.

**Quick fix:**
```typescript
// Add dependency array to all useEffects
useEffect(() => {
  // code
}, []); // Empty array = run once
```

### 3. Memory Leak in Modal
Modal might not be cleaning up properly.

**Quick fix:**
```typescript
// In ReminderSettingsModal
useEffect(() => {
  let mounted = true;
  
  if (visible && mounted) {
    loadSettings();
  }
  
  return () => {
    mounted = false;
  };
}, [visible]);
```

---

## Immediate Action Plan

1. **Stop app** (Ctrl+C)
2. **Clear cache**: `npx expo start -c`
3. **Check console** for errors
4. **If still hangs**: Comment out performance optimizer
5. **If still hangs**: Rollback changes
6. **Restart**: `npm start`

---

## Prevention

After fixing:
1. Test each screen individually
2. Check console for warnings
3. Monitor memory usage
4. Test with 100+ photos
5. Test modal open/close multiple times

---

**Priority: Clear cache and restart first! 🚨**
