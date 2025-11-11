# 🚀 Quick APK Build Commands

## One-Time Setup (5 minutes):

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo (create account if needed)
eas login

# Verify login
eas whoami
```

---

## Build APK (10-20 minutes):

```bash
# Go to Pairly folder
cd Pairly

# Build APK for testing
eas build --platform android --profile preview
```

---

## Check Build Status:

```bash
# List all builds
eas build:list

# View specific build
eas build:view [build-id]
```

---

## Download APK:

### Method 1: From Terminal
- Click the download link shown after build completes

### Method 2: From Website
1. Go to: https://expo.dev
2. Login
3. Select "Pairly" project
4. Click "Builds" tab
5. Download latest APK

### Method 3: Direct Download
```bash
# Download latest build
eas build:download --platform android
```

---

## Install on Phone:

### Android:
1. Transfer APK to phone
2. Open file manager
3. Click APK file
4. Allow "Install from unknown sources" if prompted
5. Install
6. Open app

---

## Test Checklist:

```
✅ App opens
✅ Login works
✅ Camera works
✅ Photo upload works
✅ Real-time sync works
✅ Widget works
✅ No crashes
```

---

## Troubleshooting:

### Build fails?
```bash
# Clear cache and retry
eas build --platform android --profile preview --clear-cache
```

### Need help?
```bash
# View build logs
eas build:view [build-id]

# Check EAS status
eas build:list
```

---

## Alternative Profiles:

### Development Build (with dev tools):
```bash
eas build --platform android --profile development
```

### Production Build (for Play Store):
```bash
eas build --platform android --profile production
```

---

## Quick Reference:

| Command | Purpose |
|---------|---------|
| `eas login` | Login to Expo |
| `eas build --platform android --profile preview` | Build APK |
| `eas build:list` | List all builds |
| `eas build:download` | Download latest build |
| `eas build:view [id]` | View build details |
| `eas build --clear-cache` | Clear cache and rebuild |

---

## That's It! 🎉

**Three simple commands:**
1. `npm install -g eas-cli`
2. `eas login`
3. `cd Pairly && eas build --platform android --profile preview`

**Wait 10-20 minutes → Download → Install → Enjoy!**
