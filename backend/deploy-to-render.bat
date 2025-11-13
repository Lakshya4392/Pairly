@echo off
REM Pairly Backend - Render Deployment Script (Windows)
REM This script prepares and deploys the backend to Render

echo.
echo 🚀 Preparing Pairly Backend for Render Deployment...
echo.

REM Check if we're in the backend directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the backend directory.
    exit /b 1
)

REM Check if git is initialized
if not exist ".git" (
    echo 📦 Initializing git repository...
    git init
    echo ✅ Git initialized
)

REM Build the project locally to verify
echo 🔨 Building project locally...
call npm run build

if errorlevel 1 (
    echo ❌ Build failed! Please fix errors before deploying.
    exit /b 1
)

echo ✅ Build successful!
echo.

REM Check if Prisma schema exists
if not exist "prisma\schema.prisma" (
    echo ❌ Error: Prisma schema not found at prisma\schema.prisma
    exit /b 1
)

echo ✅ Prisma schema found
echo.

REM Generate Prisma client
echo 🔧 Generating Prisma client...
call npx prisma generate

if errorlevel 1 (
    echo ❌ Prisma generate failed!
    exit /b 1
)

echo ✅ Prisma client generated
echo.

REM Check if render.yaml exists
if not exist "render.yaml" (
    echo ❌ Error: render.yaml not found
    exit /b 1
)

echo ✅ render.yaml found
echo.

REM Add all files to git
echo 📝 Adding files to git...
git add .

REM Commit changes
echo 💾 Committing changes...
git commit -m "Prepare backend for Render deployment - %date% %time%"

echo.
echo ✅ Backend is ready for Render deployment!
echo.
echo 📋 Next Steps:
echo.
echo 1. Push to GitHub:
echo    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 2. Go to Render Dashboard:
echo    https://dashboard.render.com
echo.
echo 3. Create PostgreSQL Database:
echo    - Click 'New +' → 'PostgreSQL'
echo    - Name: pairly-db
echo    - Region: Oregon
echo    - Plan: Free
echo.
echo 4. Create Web Service:
echo    - Click 'New +' → 'Web Service'
echo    - Connect your GitHub repo
echo    - Root Directory: backend
echo    - Build Command: npm install ^&^& npx prisma generate ^&^& npm run build
echo    - Start Command: npm start
echo.
echo 5. Add Environment Variables:
echo    NODE_ENV=production
echo    DATABASE_URL=[from database]
echo    CLERK_SECRET_KEY=[from Clerk dashboard]
echo    JWT_SECRET=[generate random string]
echo    JWT_EXPIRES_IN=7d
echo    PORT=10000
echo    CORS_ORIGIN=*
echo.
echo 6. Deploy and wait for build to complete!
echo.
echo 📚 Full guide: See RENDER_DEPLOYMENT_GUIDE.md
echo.
pause
