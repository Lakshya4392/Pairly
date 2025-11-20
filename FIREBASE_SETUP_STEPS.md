# 🔥 Firebase Setup - Quick Guide

## Step-by-Step Firebase Configuration

### 1️⃣ Create Firebase Project (5 minutes)

1. **Go to Firebase Console**
   ```
   https://console.firebase.google.com/
   ```

2. **Create New Project**
   - Click "Add Project"
   - Project Name: `Pairly` (or any name)
   - Enable Google Analytics: Optional
   - Click "Create Project"

---

### 2️⃣ Add Android App (3 minutes)

1. **In Firebase Console**
   - Click "Add App" → Select Android icon
   
2. **Register App**
   - Android package name: `com.pairly.app`
   - App nickname: `Pairly Android`
   - Debug signing certificate: Leave blank (optional)
   - Click "Register App"

3. **Download google-services.json**
   - Click "Download google-services.json"
   - Save file

4. **Replace File**
   ```bash
   # Copy downloaded file to:
   D:\Pairly\Pairly\google-services.json
   
   # Replace the placeholder file
   ```

---

### 3️⃣ Enable Cloud Messaging (2 minutes)

1. **In Firebase Console**
   - Go to Project Settings (gear icon)
   - Click "Cloud Messaging" tab

2. **Enable API**
   - If you see "Cloud Messaging API (Legacy)" - Enable it
   - Copy "Server Key" (you'll need this later)

---

### 4️⃣ Generate Service Account Key (3 minutes)

1. **In Firebase Console**
   - Go to Project Settings → Service Accounts tab

2. **Generate Key**
   - Click "Generate New Private Key"
   - Confirm by clicking "Generate Key"
   - A JSON file will download

3. **Copy JSON Content**
   - Open downloaded JSON file
   - Copy ENTIRE content (it's one big JSON object)

---

### 5️⃣ Update Backend Environment (2 minutes)

1. **Open Backend .env File**
   ```bash
   # File location:
   D:\Pairly\backend\.env
   ```

2. **Add Firebase Service Account**
   ```env
   # Add this line at the end:
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"pairly-xxx","private_key_id":"xxx",...}
   ```
   
   **IMPORTANT:** 
   - Paste the ENTIRE JSON from Step 4 as ONE LINE
   - No line breaks, no spaces
   - Keep it inside quotes

3. **Example:**
   ```env
   DATABASE_URL="postgresql://..."
   CLERK_SECRET_KEY="sk_test_..."
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"pairly-12345","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...","client_email":"firebase-adminsdk@pairly.iam.gserviceaccount.com","client_id":"123456","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40pairly.iam.gserviceaccount.com"}
   ```

---

### 6️⃣ Update Android Build Files (5 minutes)

#### File 1: `Pairly/android/build.gradle`

Find the `buildscript` section and add Google Services:

```gradle
buildscript {
    ext {
        buildToolsVersion = "35.0.0"
        minSdkVersion = 23
        compileSdkVersion = 35
        targetSdkVersion = 35
        ndkVersion = "27.0.12077973"
        kotlinVersion = "2.1.0"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
        classpath("com.google.gms:google-services:4.4.0")  // ← ADD THIS LINE
    }
}
```

#### File 2: `Pairly/android/app/build.gradle`

Add at the TOP (after other apply plugin lines):

```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"
apply plugin: "com.google.gms.google-services"  // ← ADD THIS LINE
```

---

### 7️⃣ Test Setup (5 minutes)

#### Test 1: Build App
```bash
cd Pairly
npm run android
```

Check for errors. If build succeeds, Firebase is configured! ✅

#### Test 2: Check FCM Token
```bash
# Start backend
cd backend
npm run dev

# In app, login and check backend logs for:
✅ FCM token updated for user xxx
```

#### Test 3: Send Test Notification
```bash
# In Firebase Console:
1. Go to "Cloud Messaging"
2. Click "Send your first message"
3. Enter notification text
4. Click "Send test message"
5. Enter FCM token from backend logs
6. Click "Test"
```

If notification arrives, setup is complete! 🎉

---

## 🚨 Troubleshooting

### Error: "google-services.json not found"
**Solution:** Make sure file is at `Pairly/android/app/google-services.json`

### Error: "Failed to apply plugin 'com.google.gms.google-services'"
**Solution:** 
1. Check `android/build.gradle` has the classpath
2. Run `cd android && ./gradlew clean`
3. Rebuild: `cd .. && npm run android`

### Error: "Firebase Admin initialization error"
**Solution:**
1. Check `.env` file has `FIREBASE_SERVICE_ACCOUNT`
2. Make sure JSON is valid (no line breaks)
3. Restart backend: `npm run dev`

### FCM Token Not Registering
**Solution:**
1. Check `google-services.json` package name matches `com.pairly.app`
2. Uninstall app and reinstall
3. Check backend logs for errors

---

## ✅ Verification Checklist

Before moving forward:

- [ ] Firebase project created
- [ ] Android app added to Firebase
- [ ] `google-services.json` downloaded and placed correctly
- [ ] Cloud Messaging enabled
- [ ] Service account key generated
- [ ] Backend `.env` updated with `FIREBASE_SERVICE_ACCOUNT`
- [ ] `android/build.gradle` updated
- [ ] `android/app/build.gradle` updated
- [ ] App builds successfully
- [ ] FCM token appears in backend logs
- [ ] Test notification received

---

## 🎯 Next Steps

Once Firebase is setup:

1. **Test Battery Optimization**
   - Complete onboarding
   - Allow battery optimization
   - Verify widget updates in background

2. **Test Offline Delivery**
   - Login on 2 devices
   - Close app on Device B
   - Send photo from Device A
   - Check if Device B gets notification

3. **Deploy to Production**
   - Update Render backend with new `.env`
   - Build release APK
   - Test on real devices

---

## 📞 Need Help?

Common issues:
- Package name mismatch → Check `google-services.json`
- Build errors → Clean and rebuild
- FCM not working → Check backend logs

Firebase setup complete hone ke baad, tumhara app 100% reliable ho jayega! 🚀
