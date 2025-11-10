# 🔧 Render Root Directory Fix

## Error:
```
Service Root Directory "/opt/render/project/src/backend" is missing.
builder.sh: line 51: cd fix this
```

## Problem:
Render can't find your `backend` folder because the Root Directory path is incorrect.

---

## ✅ SOLUTION:

### In Render Dashboard:

1. Go to your service settings
2. Find **"Root Directory"** field
3. **Delete everything** in that field
4. Type exactly: `backend`
5. Click **"Save Changes"**

### Correct Configuration:

```
Root Directory: backend
```

**NOT:**
- ❌ `/backend`
- ❌ `./backend`
- ❌ `/opt/render/project/src/backend`
- ❌ `src/backend`

**JUST:**
- ✅ `backend`

---

## Why This Happens:

Render clones your repo to `/opt/render/project/src/`

Your folder structure:
```
/opt/render/project/src/
├── backend/          ← Your backend code
├── Pairly/           ← Your frontend code
└── other files
```

When you set Root Directory to `backend`, Render looks at:
```
/opt/render/project/src/backend/  ✅ Correct
```

When you set it to `/backend`, Render looks at:
```
/backend/  ❌ Wrong - doesn't exist
```

---

## Step-by-Step Fix:

### 1. Edit Service Settings
- Go to: https://dashboard.render.com
- Click on your service
- Click **"Settings"** tab (left sidebar)

### 2. Update Root Directory
- Scroll to **"Build & Deploy"** section
- Find **"Root Directory"** field
- Clear it completely
- Type: `backend`
- Click **"Save Changes"**

### 3. Trigger Manual Deploy
- Go to **"Manual Deploy"** section
- Click **"Deploy latest commit"**
- Wait for build to complete

### 4. Verify
Check logs - should see:
```
==> Cloning from https://github.com/your-repo...
==> Checking out commit abc123 in /opt/render/project/src
==> Using Node version 20.x.x
==> Docs on specifying a Node version: https://render.com/docs/node-version
==> Running build command 'npm install && npm run build...'
```

---

## Alternative: Use render.yaml

If you want to automate this, create `render.yaml` in your **root directory**:

```yaml
services:
  - type: web
    name: pairly-backend
    runtime: node
    rootDir: backend
    buildCommand: npm install && npm run build && npx prisma generate && npx prisma migrate deploy
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
```

Then in Render:
- Select **"Blueprint"** instead of manual setup
- It will auto-detect `render.yaml`
- Just add your secret environment variables

---

## Still Not Working?

### Check These:

1. **Verify folder exists in GitHub:**
   - Go to your GitHub repo
   - Make sure `backend/` folder is there
   - Check `backend/package.json` exists

2. **Check branch:**
   - Make sure you're deploying from correct branch
   - Default is usually `main` or `master`

3. **Case sensitivity:**
   - Folder name is `backend` (lowercase)
   - Not `Backend` or `BACKEND`

4. **Clear and redeploy:**
   - Settings → Clear build cache
   - Manual Deploy → Deploy latest commit

---

## Quick Test Locally:

```bash
# From your project root
cd backend
npm install
npm run build
npm start
```

If this works locally, it will work on Render with correct Root Directory.

---

## Summary:

**Root Directory should be:** `backend`

That's it! Simple as that. 🚀
