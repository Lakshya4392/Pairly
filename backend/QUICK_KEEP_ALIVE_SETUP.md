# ⚡ Quick Keep-Alive Setup (5 Minutes)

## 🎯 Goal
Keep Render backend awake 24/7 - No more cold starts!

---

## Step 1: Add Endpoint to Backend (1 min)

Add this to your `server.js` or `app.js`:

```javascript
// Keep-alive endpoint
app.get('/keep-alive', (req, res) => {
  console.log('🏓 Keep-alive ping received');
  res.json({ 
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});
```

Deploy to Render.

---

## Step 2: Setup Cron Job (3 minutes)

### Option A: Cron-job.org (Recommended)

1. Go to: https://cron-job.org/en/
2. Click "Sign Up" → Verify email
3. Click "Create Cronjob"
4. Fill in:
   ```
   Title: Pairly Keep-Alive
   URL: https://pairly-60qj.onrender.com/keep-alive
   Schedule: */10 * * * *
   ```
5. Click "Create" → Enable job
6. Done! ✅

### Option B: UptimeRobot (Alternative)

1. Go to: https://uptimerobot.com/
2. Sign up → Click "Add New Monitor"
3. Fill in:
   ```
   Monitor Type: HTTP(s)
   URL: https://pairly-60qj.onrender.com/keep-alive
   Interval: 5 minutes
   ```
4. Click "Create Monitor"
5. Done! ✅

---

## Step 3: Test (1 minute)

```bash
# Test endpoint
curl https://pairly-60qj.onrender.com/keep-alive

# Should return:
{
  "status": "alive",
  "timestamp": "2025-11-26T10:30:00.000Z"
}
```

Wait 10 minutes, check cron-job.org dashboard for successful ping.

---

## ✅ Result

- Backend stays awake 24/7
- No more 10-15 second cold starts
- Instant socket connections (1-2 seconds)
- Free solution!

**Total Time: 5 minutes**
**Cost: $0**
**Benefit: 10x faster connections!**
