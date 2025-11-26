# ⚡ Quick Cron Job Setup (5 Minutes)

## 🎯 Goal
Keep backend awake 24/7 - No more cold starts!

---

## ✅ Step 1: Deploy Backend (1 min)

```bash
cd backend
git add .
git commit -m "Add keep-alive endpoint"
git push
```

Wait for Render to deploy.

---

## 🧪 Step 2: Test Endpoint (30 seconds)

Open in browser:
```
https://pairly-60qj.onrender.com/keep-alive
```

Should see JSON response ✅

---

## ⏰ Step 3: Setup Cron Job (3 minutes)

### Go to: https://cron-job.org/en/

1. **Sign Up** → Verify email
2. **Create Cronjob** → Fill in:

```
Title: Pairly Keep-Alive
URL: https://pairly-60qj.onrender.com/keep-alive
Schedule: */10 * * * * (Every 10 minutes)
```

3. **Create** → **Enable** job
4. Done! ✅

---

## 📊 Step 4: Verify (1 minute)

Wait 10 minutes, then check:
- Cron-job.org dashboard → Should show successful ping
- Render logs → Should show: `🏓 Keep-alive ping received`

---

## 🎉 Result

- ✅ Backend stays awake 24/7
- ✅ No more 10-15 second cold starts
- ✅ Instant connections (1-2 seconds)
- ✅ Free solution!

---

## 📝 Quick Reference

**Cron Expression:** `*/10 * * * *` = Every 10 minutes

**Endpoint:** `https://pairly-60qj.onrender.com/keep-alive`

**Dashboard:** https://cron-job.org/en/members/

**Cost:** $0/month

**Setup Time:** 5 minutes

**Benefit:** 10x faster connections!

---

## 🔗 Links

- Cron-job.org: https://cron-job.org/en/
- Cron Expression Helper: https://crontab.guru/
- Render Dashboard: https://dashboard.render.com/

---

**Status:** 🚀 Ready to Setup!
