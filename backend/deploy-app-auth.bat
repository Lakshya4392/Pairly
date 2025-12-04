@echo off
echo ========================================
echo 🚀 Deploying App Auth Updates
echo ========================================
echo.

echo 📦 Step 1: Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)
echo ✅ Build successful!
echo.

echo 📝 Step 2: Committing changes...
git add .
git commit -m "Add app auth endpoints: /auth/verify-email and /auth/count"
if %errorlevel% neq 0 (
    echo ⚠️ Nothing to commit or commit failed
)
echo.

echo 🚀 Step 3: Pushing to GitHub...
git push
if %errorlevel% neq 0 (
    echo ❌ Push failed!
    pause
    exit /b 1
)
echo ✅ Pushed to GitHub!
echo.

echo ⏳ Step 4: Waiting for Render to deploy (30 seconds)...
timeout /t 30 /nobreak
echo.

echo 🧪 Step 5: Testing endpoints...
echo.
echo Testing health check...
curl https://pairly-60qj.onrender.com/health
echo.
echo.

echo ========================================
echo ✅ Deployment Complete!
echo ========================================
echo.
echo 📋 Next Steps:
echo 1. Test endpoints: node test-app-auth.js
echo 2. Integrate in app (see APP_AUTH_SETUP.md)
echo 3. Test with real users
echo.
pause
