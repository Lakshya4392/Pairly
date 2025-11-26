# 🚀 Local APK Build Guide - Using Gradle

## Prerequisites

### Required Software:
1. ✅ Node.js (already installed)
2. ✅ Android Studio (with SDK)
3. ✅ Java JDK 17 or higher
4. ✅ Gradle (comes with Android Studio)

---

## Step 1: Generate Android Project

```bash
cd Pairly
npx expo prebuild --platform android --clean
```

**What this does**:
- Creates `android/` folder
- Generates native Android project
- Sets up Gradle build files
- Configures app.json settings

**Expected output**:
```
✔ Created native Android project
✔ Updated android/app/build.gradle
✔ Updated android/build.gradle
```

---

## Step 2: Check Android Folder

After prebuild, you should have:
```
Pairly/
├── android/
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/
│   ├── gradle/
│   ├── build.gradle
│   └── settings.gradle
```

---

## Step 3: Build Debug APK

### Option A: Using Gradle Wrapper (Recommended)
```bash
cd Pairly/android
./gradlew assembleDebug
```

**Windows**:
```bash
cd Pairly\android
gradlew.bat assembleDebug
```

### Option B: Using Expo
```bash
cd Pairly
npx expo run:android --variant debug
```

**Expected output**:
```
BUILD SUCCESSFUL in 2m 30s
APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Step 4: Build Release APK (Unsigned)

```bash
cd Pairly/android
./gradlew assembleRelease
```

**Windows**:
```bash
cd Pairly\android
gradlew.bat assembleRelease
```

**APK location**:
```
Pairly/android/app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## Step 5: Sign APK (For Production)

### Generate Keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore pairly-release.keystore -alias pairly-key -keyalg RSA -keysize 2048 -validity 10000
```

**Enter details**:
- Password: [your-password]
- Name: Pairly
- Organization: Your Company
- etc.

### Configure Signing:

Create `android/gradle.properties`:
```properties
PAIRLY_UPLOAD_STORE_FILE=pairly-release.keystore
PAIRLY_UPLOAD_KEY_ALIAS=pairly-key
PAIRLY_UPLOAD_STORE_PASSWORD=your-password
PAIRLY_UPLOAD_KEY_PASSWORD=your-password
```

Update `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('PAIRLY_UPLOAD_STORE_FILE')) {
                storeFile file(PAIRLY_UPLOAD_STORE_FILE)
                storePassword PAIRLY_UPLOAD_STORE_PASSWORD
                keyAlias PAIRLY_UPLOAD_KEY_ALIAS
                keyPassword PAIRLY_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

### Build Signed APK:
```bash
cd Pairly/android
./gradlew assembleRelease
```

**Signed APK location**:
```
Pairly/android/app/build/outputs/apk/release/app-release.apk
```

---

## Quick Commands Summary

### 1. Setup (First Time):
```bash
cd Pairly
npx expo prebuild --platform android --clean
```

### 2. Build Debug APK:
```bash
cd Pairly/android
gradlew.bat assembleDebug
```

### 3. Build Release APK:
```bash
cd Pairly/android
gradlew.bat assembleRelease
```

### 4. Install on Device:
```bash
cd Pairly/android
gradlew.bat installDebug
```

### 5. Run on Device:
```bash
cd Pairly
npx expo run:android
```

---

## APK Locations

### Debug APK:
```
Pairly/android/app/build/outputs/apk/debug/app-debug.apk
```
- Size: ~50-80 MB
- Debuggable: Yes
- Signed: Debug keystore
- Use for: Testing

### Release APK (Unsigned):
```
Pairly/android/app/build/outputs/apk/release/app-release-unsigned.apk
```
- Size: ~30-50 MB
- Debuggable: No
- Signed: No
- Use for: Cannot install (needs signing)

### Release APK (Signed):
```
Pairly/android/app/build/outputs/apk/release/app-release.apk
```
- Size: ~30-50 MB
- Debuggable: No
- Signed: Yes
- Use for: Production, distribution

---

## Troubleshooting

### Error: "SDK location not found"
**Solution**:
Create `android/local.properties`:
```properties
sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

### Error: "Gradle version mismatch"
**Solution**:
```bash
cd Pairly/android
./gradlew wrapper --gradle-version 8.3
```

### Error: "Java version incompatible"
**Solution**:
- Install JDK 17
- Set JAVA_HOME environment variable

### Error: "Build failed"
**Solution**:
```bash
cd Pairly/android
./gradlew clean
./gradlew assembleDebug
```

### Error: "Out of memory"
**Solution**:
Edit `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

---

## Build Variants

### Debug:
- Fast build
- Includes debugging tools
- Larger size
- Use for development

### Release:
- Optimized build
- Minified code
- Smaller size
- Use for production

---

## Testing APK

### Install on Device:
```bash
adb install Pairly/android/app/build/outputs/apk/debug/app-debug.apk
```

### Check Logs:
```bash
adb logcat | grep -i pairly
```

### Uninstall:
```bash
adb uninstall com.pairly.app
```

---

## Build Configuration

### app.json:
```json
{
  "expo": {
    "android": {
      "package": "com.pairly.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

### android/app/build.gradle:
```gradle
android {
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.pairly.app"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

---

## Performance Tips

### 1. Enable Gradle Daemon:
```properties
# android/gradle.properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true
```

### 2. Use Build Cache:
```properties
android.enableBuildCache=true
```

### 3. Increase Memory:
```properties
org.gradle.jvmargs=-Xmx4096m
```

---

## Next Steps After Build

### 1. Test APK:
- Install on device
- Test all features
- Check performance
- Verify notifications

### 2. Optimize:
- Enable ProGuard
- Optimize images
- Remove unused code
- Test on multiple devices

### 3. Prepare for Release:
- Sign APK
- Test signed APK
- Create release notes
- Prepare store listing

---

## 🎯 Quick Start (TL;DR)

```bash
# 1. Generate Android project
cd Pairly
npx expo prebuild --platform android --clean

# 2. Build debug APK
cd android
gradlew.bat assembleDebug

# 3. Find APK
# Location: android/app/build/outputs/apk/debug/app-debug.apk

# 4. Install on device
adb install app/build/outputs/apk/debug/app-debug.apk
```

**That's it! Your APK is ready! 🚀**

---

## Expected Build Time

- **First build**: 5-10 minutes
- **Subsequent builds**: 2-5 minutes
- **Clean build**: 3-7 minutes

---

## File Sizes

- **Debug APK**: ~50-80 MB
- **Release APK**: ~30-50 MB
- **AAB (Bundle)**: ~25-40 MB

---

## 📝 Notes

1. **Debug APK** is good for testing
2. **Release APK** needs signing for production
3. **AAB** is preferred for Play Store
4. Keep your keystore safe!
5. Test on multiple devices

**Happy Building! 🎉**
