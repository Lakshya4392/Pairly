#!/bin/bash

echo "🧹 Cleaning Metro bundler cache..."

# Stop any running Metro processes
echo "Stopping Metro..."
pkill -f "react-native" || true
pkill -f "metro" || true

# Clear watchman
echo "Clearing watchman..."
watchman watch-del-all || true

# Clear Metro cache
echo "Clearing Metro cache..."
rm -rf $TMPDIR/react-* || true
rm -rf $TMPDIR/metro-* || true
rm -rf $TMPDIR/haste-* || true

# Clear node modules cache
echo "Clearing node_modules cache..."
rm -rf node_modules/.cache || true

# Clear Expo cache
echo "Clearing Expo cache..."
npx expo start --clear || true

echo "✅ Cache cleared! Now run: npx expo start"
