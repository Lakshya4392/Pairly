# 🚀 Pairly - Production Deployment Guide

> **Couples Photo Sharing App** - Share moments with your partner in real-time

---

## 📋 Table of Contents
1. [Prerequisites](#-prerequisites)
2. [Environment Setup](#-environment-setup)
3. [Backend Deployment](#-backend-deployment)
4. [Mobile App Build](#-mobile-app-build)
5. [Pre-Launch Checklist](#-pre-launch-checklist)
6. [Monitoring & Maintenance](#-monitoring--maintenance)

---

## ✅ Prerequisites

### Required Services
| Service | Purpose | Sign Up |
|---------|---------|---------|
| **Clerk** | Authentication | [clerk.com](https://clerk.com) |
| **Render** | Backend hosting | [render.com](https://render.com) |
| **Neon/Supabase** | PostgreSQL database | [neon.tech](https://neon.tech) |
| **Firebase** | Push notifications (FCM) | [firebase.google.com](https://firebase.google.com) |

### Local Development
```bash
Node.js >= 20
npm >= 10
Android Studio (for emulator)
Expo CLI: npm install -g expo-cli
```

---

## 🔐 Environment Setup

### Backend `.env` (REQUIRED)

Create `backend/.env`:

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://user:password@host:5432/pairly?sslmode=require"

# Authentication (REQUIRED)
JWT_SECRET="generate-a-64-char-random-string-here"
CLERK_SECRET_KEY="sk_live_xxxxx"

# Firebase FCM (REQUIRED for notifications)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"

# Production Settings
NODE_ENV="production"
ALLOWED_ORIGINS="pairly://,https://yourdomain.com"

# Optional: Email (Resend)
RESEND_API_KEY="re_xxxxx"
```

### Frontend `.env` (REQUIRED)

Create `Pairly/.env`:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxxxx"
EXPO_PUBLIC_API_URL="https://your-backend.onrender.com"
```

### Generate Secure JWT Secret

```bash
# Run this to generate a secure secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🌐 Backend Deployment

### Option 1: Render (Recommended)

1. **Push to GitHub**
   ```bash
   cd backend
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/you/pairly-backend
   git push -u origin main
   ```

2. **Create Render Web Service**
   - Go to [render.com](https://render.com)
   - New → Web Service → Connect GitHub
   - Select your repo
   - Settings:
     - **Build Command**: `npm install && npx prisma generate && npm run build`
     - **Start Command**: `npm start`
     - **Environment**: Node

3. **Add Environment Variables**
   - Add all variables from `.env` above
   - Make sure `NODE_ENV=production`

4. **Run Database Migration**
   ```bash
   # In Render Shell or locally with DATABASE_URL
   npx prisma migrate deploy
   ```

### Verify Deployment

```bash
curl https://your-backend.onrender.com/health
# Should return: {"status":"ok","message":"Pairly API is running - v2.1 (Production Ready)"...}
```

---

## 📱 Mobile App Build

### Development Build (Emulator)

```bash
cd Pairly
npm install
npx expo run:android
```

### Production APK

1. **Configure `eas.json`**
   ```json
   {
     "build": {
       "production": {
         "android": {
           "buildType": "apk"
         }
       }
     }
   }
   ```

2. **Build**
   ```bash
   eas build --platform android --profile production
   ```

3. **For Play Store (AAB)**
   ```bash
   eas build --platform android --profile production
   # Change buildType to "app-bundle" in eas.json
   ```

### Update Deep Links

In `app.json`, update for production:
```json
{
  "expo": {
    "scheme": "pairly",
    "extra": {
      "apiUrl": "https://your-production-backend.onrender.com"
    }
  }
}
```

---

## ✔️ Pre-Launch Checklist

### Security
- [ ] JWT_SECRET is set (64+ chars, random)
- [ ] CLERK_SECRET_KEY is production key (pk_live_)
- [ ] DATABASE_URL uses SSL (`?sslmode=require`)
- [ ] No test keys in production code
- [ ] CORS origins are restricted

### Database
- [ ] Prisma migrations deployed
- [ ] Database backups configured
- [ ] Connection pooling enabled

### Firebase
- [ ] FCM configured with production credentials
- [ ] `google-services.json` is production file
- [ ] Push notifications tested

### App Store
- [ ] App icons (all sizes)
- [ ] Splash screen
- [ ] Privacy Policy URL
- [ ] Terms of Service URL
- [ ] App Store screenshots

### Testing
- [ ] Auth flow (Google, Apple)
- [ ] Pairing with code
- [ ] Photo upload and delivery
- [ ] Push notifications
- [ ] Widget functionality
- [ ] Offline mode

---

## 📊 Monitoring & Maintenance

### Health Check Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | API status |
| `GET /keep-alive` | Prevent cold starts |

### Render Keep-Alive

Backend has built-in cron (every 10 min). For external:

```bash
# Add to cron-job.org or similar
curl https://your-backend.onrender.com/keep-alive
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Backend offline" | Check Render logs, may be cold start |
| "Token expired" | User needs to re-login |
| "Widget not loading" | Check SharedPreferences has auth token |
| "Push not received" | Verify FCM token in database |

### Database Maintenance

```bash
# Check database size
npx prisma studio

# Clean old moments (if needed)
# Add to cron: DELETE FROM "Moment" WHERE "uploadedAt" < NOW() - INTERVAL '30 days'
```

---

## 🔄 Updates & Hotfixes

### Quick Backend Update

```bash
git add .
git commit -m "Fix: description"
git push origin main
# Render auto-deploys
```

### Quick App Update (OTA)

```bash
eas update --branch production --message "Hotfix"
```

### Full App Update

```bash
eas build --platform android --profile production
# Upload to Play Store
```

---

## 📞 Support

- **Backend Logs**: Render Dashboard → Logs
- **App Crashes**: Expo Dashboard → Crashes
- **Database**: Prisma Studio (`npx prisma studio`)

---

**Version**: 2.1 (Production Ready)  
**Last Updated**: December 2024
