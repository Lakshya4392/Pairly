# 🔧 Git Setup & Push to GitHub

## Problem:
Your `backend` folder is not in GitHub repository, that's why Render can't find it.

---

## ✅ SOLUTION - Push Backend to GitHub

### Step 1: Initialize Git (if not done)

```bash
# In your project root (where backend/ and Pairly/ folders are)
git init
```

### Step 2: Connect to GitHub

```bash
# Add your GitHub repo
git remote add origin https://github.com/Lakshya4392/Pairly.git

# Or if already added, update it
git remote set-url origin https://github.com/Lakshya4392/Pairly.git
```

### Step 3: Create .gitignore

Make sure you have `.gitignore` in root:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Expo
.expo/
.expo-shared/

# Backend specific
backend/node_modules/
backend/dist/
backend/.env

# Frontend specific
Pairly/node_modules/
Pairly/.expo/
Pairly/dist/
```

### Step 4: Add Files

```bash
# Add all files
git add .

# Or add specific folders
git add backend/
git add Pairly/
git add *.md
```

### Step 5: Commit

```bash
git commit -m "Add backend and frontend code"
```

### Step 6: Push to GitHub

```bash
# Push to main branch
git push -u origin main

# Or if your branch is master
git push -u origin master
```

---

## If You Get Errors:

### Error: "failed to push some refs"

**Solution 1: Pull first**
```bash
git pull origin main --rebase
git push origin main
```

**Solution 2: Force push (if you're sure)**
```bash
git push -f origin main
```

### Error: "remote origin already exists"

```bash
# Remove old remote
git remote remove origin

# Add new one
git remote add origin https://github.com/Lakshya4392/Pairly.git
```

### Error: "Authentication failed"

**Use Personal Access Token:**
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo` (all)
4. Copy token
5. Use token as password when pushing

---

## Verify Backend is on GitHub:

After pushing, check:
1. Go to: https://github.com/Lakshya4392/Pairly
2. You should see:
   ```
   ├── backend/
   │   ├── src/
   │   ├── prisma/
   │   ├── package.json
   │   └── tsconfig.json
   ├── Pairly/
   └── other files
   ```

---

## Quick Commands (Copy-Paste):

```bash
# 1. Initialize and connect
git init
git remote add origin https://github.com/Lakshya4392/Pairly.git

# 2. Add and commit
git add .
git commit -m "Add backend for Render deployment"

# 3. Push
git push -u origin main
```

---

## After Pushing to GitHub:

### Go Back to Render:

1. **Trigger Manual Deploy** in Render Dashboard
2. Or **Create New Service** and connect repo again
3. Set Root Directory: `backend`
4. Deploy!

---

## Alternative: Check if Backend Already Exists

Maybe backend is in a different branch?

```bash
# Check all branches
git branch -a

# Switch to main/master
git checkout main
# or
git checkout master

# Check if backend folder exists
ls -la
```

---

## Need Help?

If still having issues, check:
1. Is `backend/` folder in your local project? ✅ (Yes, we verified)
2. Is Git initialized? (Run: `git status`)
3. Is remote added? (Run: `git remote -v`)
4. Did you push? (Check GitHub repo)

---

## Summary:

**The issue is:** Backend folder is not in GitHub repo

**The fix is:** 
1. Initialize Git
2. Add remote
3. Commit files
4. Push to GitHub
5. Redeploy on Render

That's it! 🚀
