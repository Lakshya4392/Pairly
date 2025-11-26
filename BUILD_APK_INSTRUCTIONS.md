# 🚀 Build Local APK - Complete Instructions

## ✅ Current Status
- TypeScript: 0 errors ✅
- All features working ✅
- Android project ready ✅

---

## Method 1: Using Batch File (Easiest)

### Step 1: Run Build Script
```bash
cd Pairly
BUILD_LOCAL_APK.bat
```

**What it does**:
1. Cleans previous builds
2. Builds debug APK
3. Shows APK location

**Expected time**: 5-10 minutes

---

## Method 2: Manual Gradle Build

### Step 1: Open Terminal
```bash
cd Pairly/android
```

### Step 2: Clean Build
```bash
gradlew.bat clean
```

### Step 3: Build Debug APK
```bash
gradlew.bat assembleDebug --no-daemon --max-workers=2
```

**Flags explained**:
- `--no-daemon`: Don't use Gradle daemon (saves memory)
- `--max-workers=2`: Limit parallel tasks (prevents hanging)

---

## Method 3: Using Expo (Recommended for First Time)

### Step 1: Ensure Android Project Exists
```bash
cd Pairly
npx expo prebuild --platform android
```

### Step 2: Build and Run
```bash
npx expo run:android --variant debug
```

**This will**:
- Build APK
- Install on connected device
- Start app automatically

---

## APK Location

After successful build:
```
Pairly/android/app/build/outputs/apk/debug/app-debug.apk
```

**File size**: ~50-80 MB

---

## Install APK on Device

### Method 1: Using ADB
```bash
adb install Pairly/android/app/build/outputs/apk/debug/app-debug.apk
```

### Method 2: Copy to Phone
1. Copy APK to phone
2. Open file manager
3. Tap APK file
4. Allow "Install from unknown sources"
5. Install

---

## Troubleshooting

### Issue 1: Build Hangs at "processDebugResources"

**Solution A**: Limit workers
```bash
gradlew.bat assembleDebug --max-workers=2
```

**Solution B**: Increase memory
Edit `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
org.gradle.daemon=false
```

**Solution C**: Clean and rebuild
```bash
gradlew.bat clean
gradlew.bat assembleDebug --no-daemon
```

### Issue 2: Out of Memory

**Solution**: Edit `android/gradle.properties`
```properties
org.gradle.jvmargs=-Xmx6144m
org.gradle.parallel=false
```

### Issue 3: SDK Not Found

**Solution**: Create `android/local.properties`
```properties
sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

### Issue 4: Build Failed

**Solution**: Check logs
```bash
gradlew.bat assembleDebug --stacktrace
```

---

## Build Variants

### Debug APK (Current)
- **Size**: ~50-80 MB
- **Debuggable**: Yes
- **Use for**: Testing
- **Command**: `gradlew.bat assembleDebug`

### Release APK (Production)
- **Size**: ~30-50 MB
- **Debuggable**: No
- **Use for**: Distribution
- **Command**: `gradlew.bat assembleRelease`
- **Note**: Needs signing

---

## Performance Tips

### 1. Disable Gradle Daemon (If Hanging)
```bash
gradlew.bat assembleDebug --no-daemon
```

### 2. Limit Workers
```bash
gradlew.bat assembleDebug --max-workers=2
```

### 3. Offline Mode (If Internet Slow)
```bash
gradlew.bat assembleDebug --offline
```

### 4. Skip Tests
```bash
gradlew.bat assembleDebug -x test
```

---

## Quick Commands Reference

### Clean Build:
```bash
cd Pairly/android
gradlew.bat clean
gradlew.bat assembleDebug
```

### Fast Build (Skip Checks):
```bash
gradlew.bat assembleDebug --no-daemon --max-workers=2 -x lint
```

### Build with Logs:
```bash
gradlew.bat assembleDebug --info
```

### Check Build Status:
```bash
gradlew.bat tasks
```

---

## Expected Build Output

### Successful Build:
```
BUILD SUCCESSFUL in 5m 30s
142 actionable tasks: 142 executed

APK location:
android/app/build/outputs/apk/debug/app-debug.apk
```

### Failed Build:
```
BUILD FAILED in 2m 15s

FAILURE: Build failed with an exception.
* What went wrong:
[Error details]
```

---

## After Build

### 1. Verify APK
```bash
# Check file exists
dir android\app\build\outputs\apk\debug\app-debug.apk

# Check file size (should be 50-80 MB)
```

### 2. Install on Device
```bash
adb devices
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. Test App
- Open app
- Test authentication
- Test partner pairing
- Test photo upload
- Test notifications

---

## Alternative: EAS Build (Cloud)

If local build fails, use EAS:

```bash
cd Pairly
eas build --profile development --platform android
```

**Advantages**:
- No local setup needed
- Faster (cloud servers)
- Consistent builds
- Automatic signing

**Disadvantages**:
- Requires internet
- Takes 10-20 minutes
- Needs EAS account

---

## Build Configuration

### Current Settings:
```gradle
// android/app/build.gradle
android {
    compileSdkVersion 36
    defaultConfig {
        applicationId "com.pairly.app"
        minSdkVersion 24
        targetSdkVersion 36
        versionCode 1
        versionName "1.0.0"
    }
}
```

### To Change:
1. Edit `android/app/build.gradle`
2. Update version code/name
3. Rebuild APK

---

## 🎯 Recommended Approach

### For First Build:
```bash
cd Pairly
npx expo run:android --variant debug
```

### For Subsequent Builds:
```bash
cd Pairly
BUILD_LOCAL_APK.bat
```

### For Production:
```bash
eas build --profile production --platform android
```

---

## Checklist Before Build

- [ ] Node modules installed (`npm install`)
- [ ] Android SDK installed
- [ ] Java JDK 17+ installed
- [ ] Android project exists (`android/` folder)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Environment variables set (`.env`)

---

## 📝 Notes

1. **First build** takes 5-10 minutes
2. **Subsequent builds** take 2-5 minutes
3. **Debug APK** is larger than release
4. **Keep device connected** for `expo run:android`
5. **Enable USB debugging** on device

---

## 🎉 Success!

Once build completes:
1. ✅ APK file created
2. ✅ Located at `android/app/build/outputs/apk/debug/app-debug.apk`
3. ✅ Ready to install
4. ✅ Test all features

**Happy Building! 🚀**
