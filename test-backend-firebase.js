#!/usr/bin/env node

/**
 * 🔥 Backend Firebase Test Script
 * 
 * Tests if Firebase Admin SDK is properly initialized in the backend
 */

const path = require('path');
const { spawn } = require('child_process');

console.log('🔥 Testing Backend Firebase Integration\n');

// Change to backend directory and test
process.chdir('backend');

console.log('📦 Installing dependencies...');
const install = spawn('npm', ['install'], { stdio: 'inherit', shell: true });

install.on('close', (code) => {
  if (code !== 0) {
    console.log('❌ Failed to install dependencies');
    process.exit(1);
  }

  console.log('\n🚀 Starting backend server...');
  console.log('⏳ Checking Firebase initialization...\n');

  const server = spawn('npm', ['run', 'dev'], { shell: true });
  
  let output = '';
  let hasFirebaseLog = false;
  
  server.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(text);
    
    // Check for Firebase initialization
    if (text.includes('Firebase Admin initialized') || text.includes('✅ Firebase')) {
      hasFirebaseLog = true;
      console.log('\n✅ Firebase Admin SDK initialized successfully!');
    }
    
    if (text.includes('Firebase service account not configured')) {
      console.log('\n⚠️ Firebase service account not configured - this is expected with placeholder values');
    }
    
    if (text.includes('Firebase Admin initialization error')) {
      console.log('\n❌ Firebase initialization error detected');
    }
    
    // Stop after server starts
    if (text.includes('Server running on port') || text.includes('🚀')) {
      setTimeout(() => {
        console.log('\n🛑 Stopping test server...');
        server.kill();
        
        console.log('\n📊 Test Results:');
        if (hasFirebaseLog) {
          console.log('✅ Firebase Admin SDK: Working');
        } else if (output.includes('Firebase service account not configured')) {
          console.log('⚠️ Firebase Admin SDK: Not configured (expected with placeholder)');
        } else {
          console.log('❌ Firebase Admin SDK: Error or not found');
        }
        
        console.log('\n📋 Next Steps:');
        console.log('1. Get real Firebase service account JSON from Firebase Console');
        console.log('2. Replace FIREBASE_SERVICE_ACCOUNT in .env file');
        console.log('3. Restart backend to test with real credentials');
        
        process.exit(0);
      }, 3000);
    }
  });
  
  server.stderr.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stderr.write(text);
  });
  
  server.on('close', (code) => {
    console.log(`\n🏁 Backend process exited with code ${code}`);
  });
  
  // Timeout after 30 seconds
  setTimeout(() => {
    console.log('\n⏰ Test timeout - stopping server');
    server.kill();
    process.exit(0);
  }, 30000);
});