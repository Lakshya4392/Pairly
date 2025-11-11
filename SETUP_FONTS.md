# 🎨 Setup Custom Fonts - Inter

## Quick Setup (Recommended):

### Option 1: Download Fonts Manually

1. **Download Inter Font:**
   - Go to: https://fonts.google.com/specimen/Inter
   - Click "Download family" button
   - Extract the ZIP file

2. **Copy Font Files:**
   Copy these 4 files to `Pairly/assets/fonts/`:
   ```
   Inter-Regular.ttf
   Inter-Medium.ttf
   Inter-SemiBold.ttf
   Inter-Bold.ttf
   ```

3. **Restart Expo:**
   ```bash
   cd Pairly
   npx expo start --clear
   ```

---

### Option 2: Use System Fonts (Temporary)

If you want to test without downloading fonts:

1. **Update App.tsx:**
   Comment out font loading temporarily:
   ```typescript
   // await Font.loadAsync({...});
   setFontsLoaded(true); // Skip font loading
   ```

2. **Update typography.ts:**
   Use system fonts:
   ```typescript
   primary: 'System',
   primaryMedium: 'System',
   primarySemiBold: 'System',
   primaryBold: 'System',
   ```

---

## Why Inter Font?

### Benefits:
- ✅ **Modern & Clean** - Designed for UI/UX
- ✅ **Highly Readable** - Optimized for screens
- ✅ **Professional** - Used by top apps
- ✅ **Variable Weights** - Smooth weight transitions
- ✅ **Open Source** - Free to use
- ✅ **Great Metrics** - Perfect spacing & kerning

### Used By:
- GitHub
- Figma
- Mozilla
- Vercel
- Many modern apps

---

## Font Weights:

| Weight | File | Usage |
|--------|------|-------|
| 400 (Regular) | Inter-Regular.ttf | Body text, paragraphs |
| 500 (Medium) | Inter-Medium.ttf | Emphasized text, labels |
| 600 (SemiBold) | Inter-SemiBold.ttf | Headings, buttons |
| 700 (Bold) | Inter-Bold.ttf | Titles, important text |

---

## Alternative Fonts:

If you prefer different fonts:

### 1. SF Pro (iOS Style):
- Download: https://developer.apple.com/fonts/
- Modern, clean, Apple-like

### 2. Roboto (Android Style):
- Download: https://fonts.google.com/specimen/Roboto
- Material Design standard

### 3. Poppins (Rounded & Friendly):
- Download: https://fonts.google.com/specimen/Poppins
- Geometric, friendly, modern

### 4. Manrope (Geometric):
- Download: https://fonts.google.com/specimen/Manrope
- Modern, geometric, clean

---

## Testing Fonts:

### 1. Check Font Loading:
```bash
cd Pairly
npx expo start --clear
```

### 2. Look for Console Log:
```
✅ Fonts loaded successfully
```

### 3. Check App:
- Text should look cleaner
- Better spacing
- More professional appearance

---

## Troubleshooting:

### Fonts Not Loading:

**Error:** `Unable to resolve module`
**Fix:**
```bash
# Clear cache
cd Pairly
npx expo start --clear

# Or reset
npx expo start -c
```

### Fonts Look Same:

**Check:**
1. Font files in correct location?
2. File names match exactly?
3. Expo restarted with --clear?

**Fix:**
```bash
# Verify files
ls Pairly/assets/fonts/

# Should show:
# Inter-Regular.ttf
# Inter-Medium.ttf
# Inter-SemiBold.ttf
# Inter-Bold.ttf
```

### App Stuck on Loading:

**Fix:**
```typescript
// In App.tsx, add timeout
useEffect(() => {
  const timeout = setTimeout(() => {
    setFontsLoaded(true); // Force continue after 3s
  }, 3000);
  
  loadFonts().then(() => clearTimeout(timeout));
}, []);
```

---

## Font File Locations:

```
Pairly/
├── assets/
│   └── fonts/
│       ├── Inter-Regular.ttf     ← Add this
│       ├── Inter-Medium.ttf      ← Add this
│       ├── Inter-SemiBold.ttf    ← Add this
│       └── Inter-Bold.ttf        ← Add this
│
├── src/
│   └── theme/
│       └── typography.ts         ← Already updated
│
└── App.tsx                       ← Already updated
```

---

## Quick Commands:

```bash
# 1. Download fonts from Google Fonts
# https://fonts.google.com/specimen/Inter

# 2. Copy to assets/fonts/
# (Manual step)

# 3. Restart Expo
cd Pairly
npx expo start --clear

# 4. Test app
# Open in Expo Go
```

---

## Expected Result:

### Before (System Font):
- Generic appearance
- Inconsistent spacing
- Less professional

### After (Inter Font):
- ✅ Clean, modern look
- ✅ Perfect spacing
- ✅ Professional appearance
- ✅ Better readability
- ✅ Consistent across screens

---

## Summary:

1. **Download Inter fonts** from Google Fonts
2. **Copy 4 files** to `Pairly/assets/fonts/`
3. **Restart Expo** with `--clear` flag
4. **Test app** - fonts should look better!

---

**Font setup complete! Download fonts and restart Expo! 🎨**
