# 🔧 Render Branch Fix

## Problem:
Your code is on `master` branch but Render is trying to deploy from `main` branch.

---

## ✅ SOLUTION: Change Branch in Render

### Step 1: Go to Render Settings
1. Open: https://dashboard.render.com
2. Click on your service (`pairly-backend`)
3. Click **"Settings"** tab (left sidebar)

### Step 2: Change Branch
1. Scroll to **"Build & Deploy"** section
2. Find **"Branch"** field
3. Change from `main` to `master`
4. Click **"Save Changes"**

### Step 3: Deploy
1. Go to **"Manual Deploy"** section
2. Click **"Deploy latest commit"**
3. Wait for deployment

---

## Verify Branch on GitHub:

Your repo: https://github.com/Lakshya4392/Pairly

Check which branch has your code:
- ✅ `master` - Has recent push (50 seconds ago)
- ❓ `main` - Check if it has backend folder

---

## Alternative: Push to Main Branch

If you want to use `main` branch instead:

```bash
# Switch to master
git checkout master

# Create and switch to main
git checkout -b main

# Push to main
git push -u origin main
```

Then in Render, keep branch as `main`.

---

## Which Branch to Use?

### Use `master` if:
- Your code is already there ✅
- Recent pushes are on master ✅
- Easier - just change Render settings

### Use `main` if:
- You want modern naming convention
- Need to push code again
- Want to follow GitHub's new default

---

## Summary:

**Easiest Fix:**
1. Render Settings → Branch → Change to `master`
2. Save & Deploy
3. Done! ✅

**Current Status:**
- GitHub: Code on `master` branch ✅
- Render: Looking for `main` branch ❌
- Fix: Change Render to use `master` ✅

---

That's it! Change branch in Render and deploy. 🚀
