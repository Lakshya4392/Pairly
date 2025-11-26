# 🔥 Backend Keep-Alive Setup - No More Cold Starts!

## 🎯 Problem

Render free tier backend sleeps after 15 minutes of inactivity:
- ❌ First request takes 10-15 seconds (cold start)
- ❌ Socket connection fails/timeouts
- ❌ Poor user experience

## ✅ Solution: Cron Job Keep-Alive

Use **cron-job.org** (free) to ping your backend every 10 minutes and keep it awake!

---

## 📋 Step-by-Step Setup

### Step 1: Create Health Endpoint (Backend)

Add this to your backend if not already present:

```javascript
// backend/src/routes/health.ts or server.js
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Backend is alive!'
  });
});

// Also add a keep-alive specific endpoint
app.get('/keep-alive', (req, res) => {
  console.log('🏓 Keep-alive ping received');
  res.json({ 
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});
```

### Step 2: Test Health Endpoint

```bash
# Test in browser or terminal
curl https://pairly-60qj.onrender.com/health

# Should return:
{
  "status": "ok",
  "timestamp": "2025-11-26T10:30:00.000Z",
  "uptime": 123.45,
  "message": "Backend is alive!"
}
```

---

## 🌐 Option 1: Cron-job.org (Recommended - Free)

### Setup:
1. Go to https://cron-job.org/en/
2. Click "Sign Up" (free account)
3. Verify email
4. Click "Create Cronjob"

### Configuration:
```
Title: Pairly Backend Keep-Alive
URL: https://pairly-60qj.onrender.com/keep-alive
Schedule: */10 * * * * (Every 10 minutes)
Request Method: GET
Timeout: 30 seconds
```

### Schedule Options:
- **Every 10 minutes:** `*/10 * * * *` (Recommended)
- **Every 5 minutes:** `*/5 * * * *` (More aggressive)
- **Every 14 minutes:** `*/14 * * * *` (Just before sleep)

### Advanced Settings:
```
✅ Enable job
✅ Save responses
✅ Notify on failure (optional)
Request timeout: 30 seconds
```

---

## 🔧 Option 2: UptimeRobot (Free)

### Setup:
1. Go to https://uptimerobot.com/
2. Sign up (free account)
3. Click "Add New Monitor"

### Configuration:
```
Monitor Type: HTTP(s)
Friendly Name: Pairly Backend
URL: https://pairly-60qj.onrender.com/keep-alive
Monitoring Interval: 5 minutes (free tier)
Monitor Timeout: 30 seconds
```

### Alerts (Optional):
```
✅ Email alerts on down
✅ Status page (public/private)
```

---

## ⚡ Option 3: Koyeb Cron (Free)

### Setup:
1. Go to https://www.koyeb.com/
2. Sign up (free account)
3. Create a new service
4. Use "Cron Job" template

### Configuration:
```yaml
# koyeb.yaml
services:
  - name: pairly-keep-alive
    type: cron
    schedule: "*/10 * * * *"
    command: curl https://pairly-60qj.onrender.com/keep-alive
```

---

## 🚀 Option 4: GitHub Actions (Free)

Create this file in your repo:

```yaml
# .github/workflows/keep-alive.yml
name: Keep Backend Alive

on:
  schedule:
    # Runs every 10 minutes
    - cron: '*/10 * * * *'
  workflow_dispatch: # Manual trigger

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Backend
        run: |
          echo "Pinging backend..."
          curl -f https://pairly-60qj.onrender.com/keep-alive || exit 1
          echo "Backend is alive!"
```

**Note:** GitHub Actions has usage limits on free tier.

---

## 📱 Option 5: Mobile App Keep-Alive (Built-in)

Already implemented in your app! When app is in foreground:

```typescript
// RealtimeService.ts - Heartbeat every 30 seconds
RealtimeService.startHeartbeat(userId);

// This keeps backend alive while user is active
```

**Limitation:** Only works when app is open.

---

## 🎯 Recommended Setup

### Best Combination:
1. **Cron-job.org** - Every 10 minutes (primary)
2. **UptimeRobot** - Every 5 minutes (backup + monitoring)
3. **App Heartbeat** - When user is active

### Why This Works:
- ✅ Backend never sleeps (pinged every 5-10 min)
- ✅ Instant connections (no cold starts)
- ✅ Free monitoring and alerts
- ✅ 99.9% uptime

---

## 📊 Expected Results

### Before Keep-Alive:
```
User opens app after 20 minutes:
  ⏰ Backend sleeping...
  ⏳ Cold start: 10-15 seconds
  ❌ Socket timeout errors
  😞 Poor user experience
```

### After Keep-Alive:
```
User opens app anytime:
  ✅ Backend already awake
  ⚡ Connection: 1-2 seconds
  ✅ Socket connects instantly
  😊 Great user experience
```

---

## 🧪 Testing

### Test 1: Verify Cron Job
```
1. Setup cron job
2. Wait 10 minutes
3. Check cron-job.org dashboard
4. Should see successful pings ✅
```

### Test 2: Test Cold Start Prevention
```
1. Don't use app for 20 minutes
2. Open app
3. Check connection time
4. Should be <3 seconds ✅ (not 10-15s)
```

### Test 3: Monitor Uptime
```
1. Check UptimeRobot dashboard
2. Should show 99%+ uptime ✅
3. No downtime alerts ✅
```

---

## 🔍 Monitoring Dashboard

### Cron-job.org Dashboard:
```
✅ Last execution: 2 minutes ago
✅ Status: Success (200 OK)
✅ Response time: 234ms
✅ Next execution: in 8 minutes
```

### UptimeRobot Dashboard:
```
✅ Status: Up
✅ Uptime: 99.98%
✅ Average response: 250ms
✅ Last check: 1 minute ago
```

---

## ⚠️ Important Notes

### Render Free Tier Limits:
- 750 hours/month (enough for 24/7)
- Bandwidth: 100 GB/month
- Keep-alive uses minimal bandwidth (~1 KB per ping)

### Calculation:
```
Pings per day: 144 (every 10 min)
Bandwidth per day: 144 KB
Bandwidth per month: ~4.3 MB
✅ Well within 100 GB limit!
```

### Best Practices:
- ✅ Use 10-minute interval (not too aggressive)
- ✅ Monitor with UptimeRobot
- ✅ Set up email alerts
- ✅ Check logs weekly

---

## 🎉 Quick Start (5 Minutes)

### Fastest Setup:
1. Go to https://cron-job.org/en/
2. Sign up (1 minute)
3. Create job:
   - URL: `https://pairly-60qj.onrender.com/keep-alive`
   - Schedule: `*/10 * * * *`
4. Enable job
5. Done! ✅

**Your backend will now stay awake 24/7!**

---

## 📝 Backend Code (Complete)

Add this to your backend:

```javascript
// backend/src/server.js or app.js

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    message: 'Backend is healthy!'
  });
});

// Keep-alive endpoint (for cron jobs)
app.get('/keep-alive', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`🏓 Keep-alive ping received at ${timestamp}`);
  
  res.json({ 
    status: 'alive',
    timestamp,
    uptime: process.uptime(),
    message: 'Backend is awake and ready!'
  });
});

// Optional: Track keep-alive pings
let keepAlivePings = 0;
app.get('/keep-alive', (req, res) => {
  keepAlivePings++;
  console.log(`🏓 Keep-alive ping #${keepAlivePings}`);
  
  res.json({ 
    status: 'alive',
    timestamp: new Date().toISOString(),
    totalPings: keepAlivePings
  });
});
```

---

## 🚀 Result

After setup:
- ✅ **No more cold starts**
- ✅ **Instant connections** (1-2 seconds)
- ✅ **No socket timeouts**
- ✅ **Better user experience**
- ✅ **Free solution**

**Status:** 🎉 Backend Always Ready!

---

## 🔗 Useful Links

- Cron-job.org: https://cron-job.org/en/
- UptimeRobot: https://uptimerobot.com/
- Cron Expression Generator: https://crontab.guru/
- Render Status: https://status.render.com/
