# 🎨 Font Verification Guide

## Current Setup:

### Fonts Installed:
- ✅ Inter-Regular (400)
- ✅ Inter-Medium (500)
- ✅ Inter-SemiBold (600)
- ✅ Inter-Bold (700)

### Applied To:
- ✅ All Text components (via render override)
- ✅ All TextInput components (via render override)
- ✅ React Native Paper theme
- ✅ Typography system

---

## How to Verify Fonts Are Working:

### 1. Restart Metro (IMPORTANT):
```bash
# Stop Metro (Ctrl+C)
cd Pairly
npx expo start --clear
```

### 2. Check Console Logs:
Should see:
```
✅ Inter fonts loaded and applied globally
```

### 3. Visual Check:
Open any screen and look for these differences:

**Before (System Font):**
- Roboto (Android) or SF Pro (iOS)
- Wider letter spacing
- Thicker appearance
- Less modern

**After (Inter Font):**
- Tighter letter spacing
- Cleaner appearance
- More modern look
- Better readability

---

## Test Screens:

### Settings Screen:
- Header: "Settings"
- Section titles: "PROFILE", "PARTNER"
- Button text: "Upgrade to Premium"
- All should look different

### Auth Screen:
- Title: "Welcome to Pairly"
- Button: "Sign In"
- Input placeholders
- All should use Inter

### Upload Screen:
- Partner name
- Stats numbers
- Button text
- All should be cleaner

---

## If Fonts Still Not Showing:

### Option 1: Hard Reset
```bash
cd Pairly

# Clear all caches
rm -rf node_modules/.cache
rm -rf .expo
rm -rf node_modules/@expo-google-fonts

# Reinstall
npm install @expo-google-fonts/inter expo-font

# Restart
npx expo start --clear
```

### Option 2: Verify Installation
```bash
cd Pairly
npm list @expo-google-fonts/inter

# Should show:
# @expo-google-fonts/inter@0.2.3
```

### Option 3: Check Expo Go Version
- Update Expo Go app on phone
- Should be latest version
- Older versions may not support custom fonts

---

## Alternative: Use Different Font

If Inter still not working, try SF Pro or Roboto:

### SF Pro (iOS Style):
```bash
npm install @expo-google-fonts/sf-pro
```

### Roboto (Android Style):
```bash
npm install @expo-google-fonts/roboto
```

### Poppins (Rounded):
```bash
npm install @expo-google-fonts/poppins
```

---

## Debug Steps:

### 1. Check Font Loading:
Add this to App.tsx:
```typescript
useEffect(() => {
  if (fontsLoaded) {
    console.log('✅ Fonts loaded:', {
      'Inter-Regular': Inter_400Regular,
      'Inter-Medium': Inter_500Medium,
      'Inter-SemiBold': Inter_600SemiBold,
      'Inter-Bold': Inter_700Bold,
    });
  }
}, [fontsLoaded]);
```

### 2. Test Single Component:
Create test component:
```typescript
<Text style={{ fontFamily: 'Inter-Bold', fontSize: 24 }}>
  Test Inter Font
</Text>
```

### 3. Check Platform:
```typescript
console.log('Platform:', Platform.OS);
console.log('Fonts loaded:', fontsLoaded);
```

---

## Common Issues:

### Issue 1: Fonts Not Loading
**Cause:** Metro cache
**Fix:** `npx expo start --clear`

### Issue 2: Still System Font
**Cause:** Expo Go not updated
**Fix:** Update Expo Go app

### Issue 3: Some Text Different
**Cause:** Inline styles overriding
**Fix:** Check component styles

---

## Expected Appearance:

### Inter Font Characteristics:
- **Tight spacing** - Letters closer together
- **Clean lines** - Very readable
- **Modern look** - Professional appearance
- **Consistent** - Same across all screens

### Visual Differences:
- Numbers look different (especially 0, 1, 8)
- Letters 'a', 'g', 'l' have distinct shapes
- Overall tighter, cleaner appearance
- More "tech" feel vs system fonts

---

## Verification Checklist:

- [ ] Metro restarted with --clear
- [ ] Console shows "✅ Inter fonts loaded"
- [ ] Text looks different from before
- [ ] All screens use new font
- [ ] Buttons have new font
- [ ] Inputs have new font
- [ ] No font loading errors

---

## Final Test:

Take screenshot before and after:

**Before:**
1. Take screenshot of Settings screen
2. Note the font appearance

**After:**
1. Restart Metro with --clear
2. Take screenshot of same screen
3. Compare - should look different!

---

**If fonts still not working after all this, let me know and I'll try a different approach!**

Key command:
```bash
cd Pairly
npx expo start --clear
```

This MUST be done for fonts to apply! 🎨
