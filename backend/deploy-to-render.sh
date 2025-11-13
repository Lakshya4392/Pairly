#!/bin/bash

# Pairly Backend - Render Deployment Script
# This script prepares and deploys the backend to Render

echo "🚀 Preparing Pairly Backend for Render Deployment..."
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    echo "✅ Git initialized"
fi

# Build the project locally to verify
echo "🔨 Building project locally..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Check if Prisma schema exists
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: Prisma schema not found at prisma/schema.prisma"
    exit 1
fi

echo "✅ Prisma schema found"
echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Prisma generate failed!"
    exit 1
fi

echo "✅ Prisma client generated"
echo ""

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ Error: render.yaml not found"
    exit 1
fi

echo "✅ render.yaml found"
echo ""

# Add all files to git
echo "📝 Adding files to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Prepare backend for Render deployment - $(date +%Y-%m-%d_%H:%M:%S)"

echo ""
echo "✅ Backend is ready for Render deployment!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Push to GitHub:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "2. Go to Render Dashboard:"
echo "   https://dashboard.render.com"
echo ""
echo "3. Create PostgreSQL Database:"
echo "   - Click 'New +' → 'PostgreSQL'"
echo "   - Name: pairly-db"
echo "   - Region: Oregon"
echo "   - Plan: Free"
echo ""
echo "4. Create Web Service:"
echo "   - Click 'New +' → 'Web Service'"
echo "   - Connect your GitHub repo"
echo "   - Root Directory: backend"
echo "   - Build Command: npm install && npx prisma generate && npm run build"
echo "   - Start Command: npm start"
echo ""
echo "5. Add Environment Variables:"
echo "   NODE_ENV=production"
echo "   DATABASE_URL=[from database]"
echo "   CLERK_SECRET_KEY=[from Clerk dashboard]"
echo "   JWT_SECRET=[generate random string]"
echo "   JWT_EXPIRES_IN=7d"
echo "   PORT=10000"
echo "   CORS_ORIGIN=*"
echo ""
echo "6. Deploy and wait for build to complete!"
echo ""
echo "📚 Full guide: See RENDER_DEPLOYMENT_GUIDE.md"
echo ""
