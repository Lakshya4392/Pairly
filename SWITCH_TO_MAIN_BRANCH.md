# 🔄 Switch from Master to Main Branch

## Commands to Run:

### Step 1: Make sure you're on master
```bash
git checkout master
```

### Step 2: Create main branch from master
```bash
git checkout -b main
```

### Step 3: Push main branch to GitHub
```bash
git push -u origin main
```

### Step 4: Set main as default on GitHub
1. Go to: https://github.com/Lakshya4392/Pairly/settings
2. Click **"Branches"** (left sidebar)
3. In **"Default branch"** section
4. Click the switch icon next to `master`
5. Select `main`
6. Click **"Update"**
7. Confirm by clicking **"I understand, update the default branch"**

### Step 5: Delete master branch from GitHub
```bash
# Delete from GitHub
git push origin --delete master

# Delete local master branch
git branch -d master
```

---

## Or Quick One-Liner:

```bash
git checkout master && git checkout -b main && git push -u origin main
```

Then delete master from GitHub settings.

---

## After This:

### In Render:
- Branch will automatically be `main` ✅
- Or manually set it to `main` in Settings
- Deploy!

---

## Why Main is Better:

- ✅ Modern standard (GitHub default since 2020)
- ✅ More inclusive terminology
- ✅ Industry standard now
- ✅ Render expects `main` by default

---

## Summary:

1. Create `main` from `master` ✅
2. Push `main` to GitHub ✅
3. Set `main` as default on GitHub ✅
4. Delete `master` branch ✅
5. Deploy from `main` on Render ✅

**This is the recommended approach!** 🚀
