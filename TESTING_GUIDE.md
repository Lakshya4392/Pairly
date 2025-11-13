# Testing Guide - Premium Sync Fix

## Quick Test Steps

### 1. Start Backend
```bash
cd backend
npm start
```

**Expected Output:**
```
🚀 Server running on port 3000
✅ Database connected
```

### 2. Start App
```bash
cd Pairly
npm start
# Press 'a' for Android or 'i' for iOS
```

### 3. Test Login Flow

#### Option A: Google Login
1. Tap "Continue with Google"
2. Complete Google OAuth
3. **Watch for these logs:**
   ```
   🔄 Starting user sync with backend...
   ✅ User synced immediately
   💎 Premium status from backend: true
   📊 Premium status: { isPremium: true, plan: 'monthly', expiresAt: '...' }
   ```

#### Option B: Manual Login
1. Tap "Sign in with Email"
2. Enter email and password (or create account)
3. **Watch for same logs as above**

### 4. Verify Premium Status

#### In Settings Screen:
1. Navigate to Settings
2. Look for "Premium" section
3. **Should show:**
   - ✅ "Premium Active" badge
   - 💎 Plan details (Monthly/Yearly)
   - 📅 Expiry date

#### Test ManagePremiumScreen:
1. Tap "Premium Plan" or "Manage Premium"
2. **Expected logs:**
   ```
   💎 Premium Plan tapped
   💎 onUpgradeToPremium exists: true
   🔵 Premium button tapped, isPremium: true
   🔵 Navigating to managePremium screen
   🎯 ManagePremiumScreen mounted!
   ```
3. **Screen should show:**
   - ✅ "Premium Active" header
   - 💎 Plan details
   - 📋 List of premium benefits

### 5. Test Backend Endpoints

Run the test script:
```bash
cd Pairly
node test-premium-sync.js
```

**Expected Output:**
```
🧪 Testing Premium Sync...

📝 Test 1: Sync User
✅ User synced successfully
💎 Premium Status: { isPremium: true, plan: 'monthly', ... }

📝 Test 2: Get User
✅ User retrieved successfully
💎 Premium Status: { isPremium: true, plan: 'monthly', ... }

📝 Test 3: Update Premium Status
✅ Premium status updated
💎 New Premium Status: { isPremium: true, plan: 'yearly', ... }

✅ All tests completed!
```

## What to Check

### ✅ Backend Logs
```
✅ User synced: <user_id>
📊 Premium status: {
  isPremium: true,
  plan: 'monthly',
  expiresAt: <date>,
  trialEndsAt: <date>
}
```

### ✅ App Logs
```
🔄 Starting user sync with backend...
✅ User synced immediately
💎 Premium status from backend: true
📥 User data from backend: { isPremium: true, ... }
✅ Premium status synced from backend: true
💎 Premium status loaded from local: true
```

### ✅ UI Elements
- [ ] Settings shows "Premium Active"
- [ ] Premium badge visible
- [ ] Plan details displayed
- [ ] Expiry date shown
- [ ] "Manage Premium" button works
- [ ] ManagePremiumScreen opens correctly

## Common Issues & Solutions

### Issue: Premium status not showing
**Solution:**
1. Check backend is running: `curl http://localhost:3000/health`
2. Check database connection in backend logs
3. Clear app data and re-login
4. Check API_BASE_URL in `.env` file

### Issue: ManagePremiumScreen not opening
**Solution:**
1. Check `onUpgradeToPremium` prop is passed
2. Check navigation logs for errors
3. Verify `isPremium` state is true
4. Check console for any React errors

### Issue: Backend sync failing
**Solution:**
1. Verify backend URL in `Pairly/src/config/api.config.ts`
2. Check network connectivity
3. Look for CORS errors in backend logs
4. Background sync will retry automatically

### Issue: "User not found" error
**Solution:**
1. User might not be synced yet
2. Check `/auth/sync` endpoint is working
3. Try manual sync: `node test-premium-sync.js`
4. Check database for user record

## Database Verification

### Check User in Database:
```sql
SELECT 
  id, 
  email, 
  "displayName",
  "isPremium",
  "premiumPlan",
  "premiumExpiry",
  "trialEndsAt"
FROM "User"
WHERE email = 'your-email@example.com';
```

**Expected Result:**
```
id: <uuid>
email: your-email@example.com
displayName: Your Name
isPremium: true
premiumPlan: monthly
premiumExpiry: <7 days from now>
trialEndsAt: <7 days from now>
```

## Success Criteria

### ✅ All these should work:
1. User login (Google/Manual) → Database sync
2. Premium status loads from database
3. 7-day trial automatically assigned to new users
4. Premium badge shows in Settings
5. ManagePremiumScreen opens and displays correctly
6. Premium features are unlocked
7. Offline mode works with local storage
8. Background sync retries on failure

## Next Steps After Testing

1. **If all tests pass:**
   - ✅ App is ready for production
   - ✅ Premium sync working perfectly
   - ✅ Database integration complete

2. **If tests fail:**
   - Check logs for specific errors
   - Follow troubleshooting guide above
   - Check PREMIUM_SYNC_FIX.md for implementation details

## Support

If you encounter any issues:
1. Check backend logs
2. Check app logs
3. Run test script: `node test-premium-sync.js`
4. Verify database records
5. Clear app data and retry

---

**Happy Testing! 🎉**
