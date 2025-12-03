# 🚀 Whitelist System - Quick Setup (5 Minutes)

## Step 1: Database Migration (1 min)
```bash
cd backend
npx prisma migrate dev --name add_whitelist_system
npx prisma generate
```

## Step 2: Add Yourself to Whitelist (1 min)
```bash
npm run add-whitelist
# Enter your email when prompted
```

## Step 3: Test API (1 min)
```bash
# Start backend
npm run dev

# In another terminal, test:
curl -X POST http://localhost:3000/invites/check-access \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'

# Should return: { "allowed": true, "message": "Welcome to Pairly! 🎉" }
```

## Step 4: Deploy Backend (2 min)
```bash
git add .
git commit -m "Add whitelist system with referral rewards"
git push

# Render will auto-deploy
# Wait 2-3 minutes for deployment
```

## Step 5: Test Production (Optional)
```bash
curl -X POST https://your-backend.onrender.com/invites/check-access \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

## ✅ Done!

Ab tu ready hai! 

### Next Steps:
1. Frontend mein `AccessCheckScreen` integrate kar
2. Navigation mein `InviteFriendScreen` add kar
3. Test kar pura flow
4. Beta users ko whitelist mein add kar
5. Launch! 🚀

### Quick Commands:

**Add user to whitelist:**
```bash
cd backend
npm run add-whitelist
```

**View whitelist:**
```bash
cd backend
npx prisma studio
# Open InvitedUser table
```

**Check invite stats:**
```bash
curl http://localhost:3000/invites/my-invites/YOUR_CLERK_ID
```

---

Bhai, bas 5 minutes mein tera whitelist system ready! 💪
