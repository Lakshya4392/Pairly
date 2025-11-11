# EAS Cloud Build Commands 🚀

## Prerequisites
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login
```

## Build Commands

### 1. **APK Build (Preview - For Testing)**
```bash
cd Pairly
eas build --platform android --profile preview
```
**Output:** APK file (easy to install and share)
**Use for:** Testing, sharing with testers

### 2. **Production Build (AAB for Play Store)**
```bash
cd Pairly
eas build --platform android --profile production
```
**Output:** AAB (Android App Bundle)
**Use for:** Google Play Store upload

### 3. **Development Build**
```bash
cd Pairly
eas build --platform android --profile development
```
**Output:** Development APK with Expo Dev Client

## Build Status & Download

### Check Build Status
```bash
eas build:list
```

### View Specific Build
```bash
eas build:view [BUILD_ID]
```

### Download Build
After build completes, EAS will provide:
- Download link in terminal
- QR code to scan
- Link in Expo dashboard: https://expo.dev/accounts/[your-account]/projects/pairly/builds

## Configuration

### Current EAS Profiles:

**Preview (APK):**
- Distribution: Internal
- Build Type: APK
- Best for testing

**Production (AAB):**
- Build Type: App Bundle
- For Play Store submission

## First Time Setup

### 1. Configure Project
```bash
cd Pairly
eas build:configure
```

### 2. Create Build
```bash
# For testing APK
eas build --platform android --profile preview

# Follow prompts:
# - Generate new keystore? Yes
# - EAS will handle everything
```

## Build Process

1. **Upload Code** - EAS uploads your code to cloud
2. **Install Dependencies** - npm install runs on cloud
3. **Prebuild** - Generates native Android project
4. **Gradle Build** - Compiles APK/AAB
5. **Sign** - Signs with keystore
6. **Upload** - Makes available for download

**Time:** Usually 10-15 minutes

## After Build

### Download APK
```bash
# Get download URL
eas build:list

# Or visit Expo dashboard
# https://expo.dev
```

### Install on Device
1. Download APK from link
2. Enable "Install from Unknown Sources"
3. Install APK
4. Done!

## Environment Variables

EAS automatically uses:
- `.env.development` for development builds
- `.env.production` for production builds (if exists)

### Add Secrets to EAS
```bash
eas secret:create --scope project --name CLERK_KEY --value "your-key"
```

## Common Issues & Fixes

### Issue: Build fails with Gradle error
**Fix:**
```bash
cd Pairly
npx expo prebuild --clean
git add android ios
git commit -m "Update native projects"
eas build --platform android --profile preview --clear-cache
```

### Issue: Google Auth not working
**Fix:**
1. Build APK first
2. Get SHA-1: `eas credentials`
3. Add to Firebase Console
4. Rebuild

### Issue: Widget not showing
**Fix:**
- Widget works in APK, not in Expo Go
- Make sure AndroidManifest has widget receiver
- Already configured ✅

## Recommended Build Command

### For Testing (Recommended):
```bash
cd Pairly
eas build --platform android --profile preview
```

**Why?**
- Generates APK (easy to install)
- Internal distribution
- Fast to build
- Easy to share with testers

### For Play Store:
```bash
cd Pairly
eas build --platform android --profile production
```

**Why?**
- Generates AAB (required by Play Store)
- Optimized size
- Ready for submission

## Quick Start

```bash
# 1. Login
eas login

# 2. Build APK for testing
cd Pairly
eas build --platform android --profile preview

# 3. Wait 10-15 minutes

# 4. Download from link provided

# 5. Install on device

# 6. Test everything!
```

## Build Monitoring

### Real-time Logs
```bash
eas build --platform android --profile preview --wait
```

### Check All Builds
```bash
eas build:list --platform android
```

## Cost

- **Free Tier:** Limited builds per month
- **Paid Plans:** Unlimited builds
- Check: https://expo.dev/pricing

## Next Steps After Build

1. ✅ Download APK
2. ✅ Install on device
3. ✅ Test Google Auth (add SHA-1 if needed)
4. ✅ Test Widget
5. ✅ Test all features
6. ✅ Share with testers
7. ✅ Collect feedback
8. ✅ Build production AAB for Play Store

---

## 🚀 START HERE:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build APK
cd Pairly
eas build --platform android --profile preview
```

**That's it!** EAS handles everything else automatically! 🎉
