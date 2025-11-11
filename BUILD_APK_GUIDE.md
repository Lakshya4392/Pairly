# 📱 Build APK for Android - Complete Guide

## Prerequisites Checklist:

- ✅ Backend deployed on Render
- ✅ `.env` file updated with production URL
- ✅ All features tested locally
- ✅ Node.js installed (v20+)
- ✅ Java JDK installed (v17+)

---

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

---

## Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials (or create account at expo.dev)

---

## Step 3: Configure EAS Build

Create `eas.json` in `Pairly/` folder:

```bash
cd Pairly
eas build:configure
```

This will create `eas.json` file automatically.

---

## Step 4: Update app.json

Make sure your `app.json` has correct configuration:

```json
{
  "expo": {
    "name": "Pairly",
    "slug": "pairly",
    "version": "1.0.0",
    "android": {
      "package": "com.pairly.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/PairlyLogo.png",
        "backgroundColor": "#FFFFFF"
      },
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE"
      ]
    }
  }
}
```

---

## Step 5: Build APK

### Option A: Build APK (Recommended for Testing)

```bash
cd Pairly
eas build --platform android --profile preview
```

### Option B: Build AAB (For Play Store)

```bash
cd Pairly
eas build --platform android --profile production
```

---

## Step 6: Wait for Build

- Build will take 10-20 minutes
- You'll get a link to track progress
- Check status: https://expo.dev/accounts/[your-account]/projects/pairly/builds

---

## Step 7: Download APK

Once build completes:
1. You'll get download link in terminal
2. Or go to: https://expo.dev
3. Click on your project
4. Go to "Builds" tab
5. Download APK

---

## Step 8: Install on Android Phone

### Method 1: Direct Download
1. Open download link on your Android phone
2. Download APK
3. Install (allow "Install from unknown sources")

### Method 2: Transfer via USB
1. Download APK on computer
2. Connect phone via USB
3. Copy APK to phone
4. Open file manager and install

### Method 3: QR Code
1. Generate QR code from download link
2. Scan with phone
3. Download and install

---

## Troubleshooting:

### Build Fails - "No Expo account"
```bash
eas login
eas whoami  # Verify login
```

### Build Fails - "Invalid credentials"
```bash
# Clear credentials
eas credentials

# Select Android
# Select "Remove all credentials"
# Try build again
```

### Build Fails - "Java version"
Make sure Java 17 is installed:
```bash
java -version
```

### APK Won't Install
- Enable "Install from unknown sources" in phone settings
- Check if you have enough storage
- Try uninstalling old version first

---

## Alternative: Local Build (Advanced)

If EAS build doesn't work, build locally:

### 1. Install Android Studio
- Download from: https://developer.android.com/studio
- Install Android SDK
- Set ANDROID_HOME environment variable

### 2. Generate Android Project
```bash
cd Pairly
npx expo prebuild --platform android
```

### 3. Build APK
```bash
cd android
./gradlew assembleRelease
```

### 4. Find APK
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## EAS.json Configuration

Create `Pairly/eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## Build Profiles Explained:

### Development
- For development builds
- Includes dev tools
- Larger file size

### Preview (Recommended for Testing)
- Builds APK file
- Can install directly
- Good for testing
- Smaller than development

### Production
- Builds AAB file
- For Google Play Store
- Optimized and signed
- Smallest file size

---

## Environment Variables in Build

EAS automatically includes `.env` file in build.

To verify:
```bash
# Check .env is in Pairly folder
ls Pairly/.env

# Should show:
# EXPO_PUBLIC_API_URL=https://pairly-60qj.onrender.com
# EXPO_PUBLIC_SOCKET_URL=https://pairly-60qj.onrender.com
# EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## Testing APK:

### 1. Install on Your Phone
```bash
# After download, install APK
# Test all features:
```

### 2. Test Checklist:
- [ ] App opens without crash
- [ ] Login/Signup works
- [ ] Camera opens
- [ ] Photo upload works
- [ ] Pairing works
- [ ] Real-time sync works
- [ ] Widget shows photos
- [ ] Notifications work
- [ ] App doesn't crash

### 3. Performance Check:
- [ ] App loads fast
- [ ] No lag in UI
- [ ] Photos load quickly
- [ ] Backend responds fast

---

## Common Issues:

### Issue 1: "Expo account required"
**Solution**: Create free account at expo.dev

### Issue 2: Build takes too long
**Solution**: Normal for first build (10-20 min)

### Issue 3: APK too large
**Solution**: Use production profile for smaller size

### Issue 4: App crashes on open
**Solution**: 
- Check backend URL in .env
- Verify Clerk keys
- Check logs: `adb logcat`

---

## Quick Commands Reference:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
cd Pairly
eas build:configure

# Build APK
eas build --platform android --profile preview

# Check build status
eas build:list

# Download latest build
eas build:download --platform android
```

---

## Next Steps After APK:

1. ✅ Test thoroughly on multiple devices
2. ✅ Fix any bugs found
3. ✅ Get feedback from users
4. ✅ Prepare for Play Store (if needed)
5. ✅ Set up app signing
6. ✅ Create store listing

---

## Play Store Submission (Optional):

### 1. Build AAB
```bash
eas build --platform android --profile production
```

### 2. Create Play Console Account
- Go to: https://play.google.com/console
- Pay $25 one-time fee
- Create app listing

### 3. Upload AAB
- Upload AAB file
- Fill app details
- Add screenshots
- Submit for review

---

## Cost:

### EAS Build:
- **Free tier**: 30 builds/month
- **Paid**: $29/month for unlimited

### Play Store:
- **One-time fee**: $25
- **No monthly cost**

---

## Summary:

**Easiest Method:**
```bash
npm install -g eas-cli
eas login
cd Pairly
eas build:configure
eas build --platform android --profile preview
```

Wait 10-20 minutes → Download APK → Install on phone → Test!

**Your app is ready to test! 🚀**
