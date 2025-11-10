# Render Backend Deployment Guide

Complete guide to deploy your Pairly backend to Render.com

## Prerequisites

- GitHub account with your backend code pushed
- Render.com account (free tier available)
- PostgreSQL database (Render provides free tier)

---

## Step 1: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → Select **"PostgreSQL"**
3. Configure database:
   - **Name**: `pairly-db` (or your preferred name)
   - **Database**: `pairly`
   - **User**: `pairly_user` (auto-generated)
   - **Region**: Choose closest to your users
   - **Plan**: Free (or paid for production)
4. Click **"Create Database"**
5. Wait for database to provision (2-3 minutes)
6. **Copy the Internal Database URL** - you'll need this later
   - Format: `postgresql://user:password@host/database`

---

## Step 2: Create Web Service on Render

1. From Render Dashboard, click **"New +"** → Select **"Web Service"**
2. Connect your GitHub repository:
   - Click **"Connect account"** if not connected
   - Select your repository (e.g., `Pairly`)
   - Click **"Connect"**

---

## Step 3: Configure Web Service

### Basic Settings:
- **Name**: `pairly-backend`
- **Region**: Same as your database
- **Branch**: `main` (or your deployment branch)
- **Root Directory**: `backend` ⚠️ **IMPORTANT: Just type `backend` - no slashes!**
- **Runtime**: `Node`
- **Build Command**: 
  ```bash
  npm install && npm run build && npx prisma generate && npx prisma migrate deploy
  ```
- **Start Command**: 
  ```bash
  npm start
  ```

### ⚠️ Common Root Directory Mistakes:
- ❌ `/backend` (wrong - no leading slash)
- ❌ `./backend` (wrong - no dot slash)
- ❌ `/opt/render/project/src/backend` (wrong - no full path)
- ✅ `backend` (correct - just the folder name)

### Plan:
- **Free** (for testing) or **Starter** (for production)

---

## Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | `[Your Internal Database URL from Step 1]` | PostgreSQL connection string |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `production` | Environment mode |
| `CLERK_SECRET_KEY` | `[Your Clerk Secret Key]` | From Clerk Dashboard |
| `CLERK_PUBLISHABLE_KEY` | `[Your Clerk Publishable Key]` | From Clerk Dashboard |

### Where to find Clerk keys:
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Go to **API Keys** section
4. Copy both keys

---

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Run Prisma migrations
   - Build TypeScript
   - Start the server
3. Wait for deployment (5-10 minutes first time)
4. Check logs for any errors

---

## Step 6: Verify Deployment

Once deployed, you'll get a URL like: `https://pairly-backend.onrender.com`

### Test the API:

1. **Health Check**:
   ```bash
   curl https://pairly-backend.onrender.com/health
   ```
   Should return: `{"status":"ok","message":"Pairly API is running"}`

2. **Test in Browser**:
   - Open: `https://pairly-backend.onrender.com/health`
   - Should see JSON response

---

## Step 7: Update Frontend Configuration

Update your Expo app's environment variables:

**File**: `Pairly/.env`

```env
EXPO_PUBLIC_API_URL=https://pairly-backend.onrender.com
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key_here
```

---

## Important Notes

### Free Tier Limitations:
- ⚠️ **Spins down after 15 minutes of inactivity**
- First request after spin-down takes 30-60 seconds
- 750 hours/month free (enough for one service)
- Database: 1GB storage, 97 hours/month

### For Production:
- Upgrade to **Starter plan** ($7/month) for:
  - No spin-down
  - Better performance
  - More resources
- Upgrade database for more storage/uptime

### Database Backups:
- Free tier: No automatic backups
- Paid tier: Daily automatic backups
- Manual backup: Use `pg_dump` command

---

## Troubleshooting

### Build Fails:

**Error**: `Prisma generate failed`
- **Fix**: Ensure `DATABASE_URL` is set in environment variables
- Check database is running and accessible

**Error**: `TypeScript compilation errors`
- **Fix**: Run `npm run build` locally first to catch errors
- Fix any TypeScript errors before deploying

### Runtime Errors:

**Error**: `Cannot connect to database`
- **Fix**: Verify `DATABASE_URL` is correct
- Use **Internal Database URL** (not External)
- Check database is in same region

**Error**: `Port already in use`
- **Fix**: Render automatically assigns port
- Don't hardcode port, use `process.env.PORT`

### Slow First Request:
- **Cause**: Free tier spins down after inactivity
- **Fix**: Upgrade to paid plan or use a cron job to ping every 10 minutes

---

## Monitoring & Logs

### View Logs:
1. Go to your service in Render Dashboard
2. Click **"Logs"** tab
3. See real-time logs

### Metrics:
- Click **"Metrics"** tab
- View CPU, Memory, Request stats

### Alerts:
- Set up email alerts for:
  - Deploy failures
  - Service crashes
  - High resource usage

---

## Database Management

### Access Database:
1. Go to your PostgreSQL service in Render
2. Click **"Connect"** → Copy **External Database URL**
3. Use with tools like:
   - **Prisma Studio**: `npx prisma studio`
   - **pgAdmin**: GUI tool
   - **psql**: Command line

### Run Migrations:
Migrations run automatically on deploy via build command.

Manual migration:
```bash
npx prisma migrate deploy
```

### View Data:
```bash
# In backend directory
npx prisma studio
```

---

## Security Best Practices

1. **Never commit secrets** to Git
2. **Use environment variables** for all sensitive data
3. **Enable CORS** properly (don't use `*` in production)
4. **Use HTTPS** only (Render provides free SSL)
5. **Rotate keys** regularly
6. **Monitor logs** for suspicious activity

---

## Updating Your Backend

### Automatic Deploys:
Render auto-deploys when you push to your branch:
```bash
git add .
git commit -m "Update backend"
git push origin main
```

### Manual Deploy:
1. Go to your service in Render Dashboard
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

### Rollback:
1. Go to **"Events"** tab
2. Find previous successful deploy
3. Click **"Rollback to this version"**

---

## Cost Optimization

### Free Tier Strategy:
- Use for development/testing
- Accept 30-60s cold start
- Monitor usage (750 hours/month limit)

### Paid Tier ($7/month):
- Always-on service
- Better performance
- No cold starts
- Worth it for production

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Socket.IO Docs**: https://socket.io/docs/v4/

---

## Quick Reference

### Your URLs:
- **Backend API**: `https://pairly-backend.onrender.com`
- **Health Check**: `https://pairly-backend.onrender.com/health`
- **Database**: Internal URL from Render dashboard

### Common Commands:
```bash
# View logs
render logs -s pairly-backend

# Restart service
render restart -s pairly-backend

# Run migration
npx prisma migrate deploy
```

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Test all API endpoints
3. ✅ Update frontend with production URL
4. ✅ Test app with production backend
5. ✅ Monitor logs for errors
6. ✅ Set up alerts
7. ✅ Consider upgrading to paid tier for production

---

**Deployment Complete! 🚀**

Your Pairly backend is now live and ready to handle requests from your mobile app.
