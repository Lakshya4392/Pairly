# 🚀 Render Deployment Guide - Pairly Backend

## Prerequisites
- GitHub account
- Render account (free tier works)
- Backend code pushed to GitHub

## Step-by-Step Deployment

### 1. Push Backend to GitHub

```bash
cd backend
git add .
git commit -m "Backend ready for Render deployment"
git push origin main
```

### 2. Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### 3. Create PostgreSQL Database

1. Click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name:** `pairly-db`
   - **Database:** `pairly`
   - **User:** (auto-generated)
   - **Region:** Oregon (or closest to you)
   - **Plan:** Free
3. Click **"Create Database"**
4. Wait for database to be ready (2-3 minutes)
5. **Copy the Internal Database URL** (starts with `postgresql://`)

### 4. Deploy Backend Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:

   **Basic Settings:**
   - **Name:** `pairly-backend`
   - **Region:** Oregon (same as database)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** 
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command:** 
     ```bash
     npm start
     ```

   **Advanced Settings:**
   - **Plan:** Free
   - **Health Check Path:** `/health`
   - **Auto-Deploy:** Yes

4. Click **"Advanced"** and add Environment Variables:

   ```
   NODE_ENV=production
   DATABASE_URL=[paste your database URL from step 3]
   CLERK_SECRET_KEY=[your Clerk secret key]
   JWT_SECRET=[generate a random string]
   JWT_EXPIRES_IN=7d
   PORT=10000
   CORS_ORIGIN=*
   ```

   **To get Clerk Secret Key:**
   - Go to https://dashboard.clerk.com
   - Select your app
   - Go to **API Keys**
   - Copy **Secret Key**

   **To generate JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. Click **"Create Web Service"**

### 5. Wait for Deployment

1. Render will:
   - Clone your repository
   - Install dependencies
   - Generate Prisma client
   - Build TypeScript
   - Run migrations
   - Start server

2. Watch the logs for:
   ```
   ✅ Prisma Client generated
   ✅ Build completed
   🚀 Pairly API server running on port 10000
   📡 Socket.IO server ready
   ```

3. Deployment takes 5-10 minutes on first deploy

### 6. Run Database Migrations

After first deployment:

1. Go to your web service dashboard
2. Click **"Shell"** tab
3. Run:
   ```bash
   npx prisma migrate deploy
   ```

4. Verify tables created:
   ```bash
   npx prisma studio
   ```

### 7. Test Your Deployment

Your backend URL will be:
```
https://pairly-backend.onrender.com
```

Test endpoints:

**Health Check:**
```bash
curl https://pairly-backend.onrender.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Pairly API is running"
}
```

**Test User Sync:**
```bash
curl -X POST https://pairly-backend.onrender.com/auth/sync \
  -H "Content-Type: application/json" \
  -d '{
    "clerkId": "test_user_123",
    "email": "test@example.com",
    "displayName": "Test User"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "clerkId": "test_user_123",
    "email": "test@example.com",
    "isPremium": true,
    "premiumPlan": "monthly",
    "trialEndsAt": "..."
  }
}
```

### 8. Update App Configuration

Update `Pairly/.env`:

```env
# Production Backend (Render)
EXPO_PUBLIC_API_URL=https://pairly-backend.onrender.com
EXPO_PUBLIC_SOCKET_URL=https://pairly-backend.onrender.com

# Clerk
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Environment
NODE_ENV=production
```

### 9. Test App with Render Backend

1. Restart your app:
   ```bash
   cd Pairly
   npm start
   ```

2. Login with Google/Email

3. Check logs:
   ```
   ✅ Using API URL from .env: https://pairly-backend.onrender.com
   🔄 Starting user sync with backend...
   ✅ User synced immediately
   💎 Premium status from backend: true
   ```

## 🔧 Troubleshooting

### Issue: Build Failed
**Solution:**
- Check build logs in Render dashboard
- Verify `package.json` has all dependencies
- Ensure `tsconfig.json` is correct
- Try manual build locally: `npm run build`

### Issue: Database Connection Failed
**Solution:**
- Verify `DATABASE_URL` is correct
- Check database is running in Render
- Ensure database and web service are in same region
- Check Prisma schema is correct

### Issue: Health Check Failing
**Solution:**
- Verify `/health` endpoint exists
- Check server is listening on `0.0.0.0`
- Verify PORT environment variable
- Check logs for startup errors

### Issue: CORS Errors
**Solution:**
- Add `CORS_ORIGIN=*` to environment variables
- Or set specific origin: `CORS_ORIGIN=https://yourdomain.com`
- Restart service after changing env vars

### Issue: Prisma Client Not Generated
**Solution:**
- Add `postinstall` script to package.json:
  ```json
  "postinstall": "prisma generate"
  ```
- Or add to build command:
  ```bash
  npm install && npx prisma generate && npm run build
  ```

## 📊 Monitoring

### View Logs:
1. Go to Render dashboard
2. Select your web service
3. Click **"Logs"** tab
4. Watch real-time logs

### Check Metrics:
1. Click **"Metrics"** tab
2. View:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

### Set Up Alerts:
1. Click **"Settings"**
2. Scroll to **"Notifications"**
3. Add email for deployment notifications

## 🔄 Auto-Deploy

Render automatically deploys when you push to GitHub:

```bash
cd backend
git add .
git commit -m "Update backend"
git push origin main
```

Render will:
1. Detect push
2. Start new build
3. Run tests (if configured)
4. Deploy new version
5. Send notification

## 💰 Free Tier Limits

Render Free Tier includes:
- ✅ 750 hours/month (enough for 1 service)
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Auto-deploy from Git
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ Cold start takes 30-60 seconds

**Note:** First request after inactivity will be slow (cold start)

## 🚀 Production Checklist

Before going live:

- [ ] Database migrations run successfully
- [ ] Health check endpoint working
- [ ] All environment variables set
- [ ] CORS configured properly
- [ ] Clerk authentication working
- [ ] Socket.IO connections working
- [ ] Test all API endpoints
- [ ] Monitor logs for errors
- [ ] Set up error notifications
- [ ] Document API endpoints
- [ ] Add rate limiting (optional)
- [ ] Set up monitoring (optional)

## 📝 Environment Variables Reference

```env
# Required
NODE_ENV=production
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
JWT_SECRET=random_32_byte_hex_string
PORT=10000

# Optional
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

## 🔗 Useful Links

- **Render Dashboard:** https://dashboard.render.com
- **Render Docs:** https://render.com/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Clerk Docs:** https://clerk.com/docs

## 🎉 Success!

Your backend is now live on Render! 

**Backend URL:** `https://pairly-backend.onrender.com`

Test it:
```bash
curl https://pairly-backend.onrender.com/health
```

**Next Steps:**
1. Update app to use Render URL
2. Test all features
3. Monitor logs
4. Deploy app to stores

---

**Need Help?**
- Check Render logs
- Review Prisma migrations
- Test endpoints with curl/Postman
- Check environment variables
