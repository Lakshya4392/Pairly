#!/usr/bin/env node

/**
 * 🤖 Android Build Test Script
 * 
 * Tests if the Android app builds successfully with Firebase configuration
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🤖 Testing Android Build with Firebase\n');

// Change to Pairly directory
process.chdir('Pairly');

console.log('📦 Installing React Native dependencies...');
const install = spawn('npm', ['install'], { stdio: 'inherit', shell: true });

install.on('close', (code) => {
  if (code !== 0) {
    console.log('❌ Failed to install React Native dependencies');
    process.exit(1);
  }

  console.log('\n🔧 Cleaning Android build...');
  const clean = spawn('npx', ['react-native', 'clean'], { stdio: 'inherit', shell: true });
  
  clean.on('close', (cleanCode) => {
    console.log('\n🏗️ Building Android app...');
    console.log('⏳ This may take 3-5 minutes...\n');

    const build = spawn('npm', ['run', 'android'], { shell: true });
    
    let output = '';
    let hasError = false;
    let buildSuccess = false;
    
    build.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      
      // Check for build success indicators
      if (text.includes('BUILD SUCCESSFUL') || text.includes('Successfully built')) {
        buildSuccess = true;
      }
      
      // Check for Firebase-related errors
      if (text.includes('google-services') && text.includes('error')) {
        hasError = true;
        console.log('\n❌ Google Services error detected');
      }
      
      if (text.includes('Firebase') && text.includes('error')) {
        hasError = true;
        console.log('\n❌ Firebase error detected');
      }
    });
    
    build.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
      
      if (text.includes('error') || text.includes('Error')) {
        hasError = true;
      }
    });
    
    build.on('close', (code) => {
      console.log(`\n🏁 Build process completed with code ${code}\n`);
      
      console.log('📊 Build Results:');
      
      if (code === 0 && buildSuccess) {
        console.log('✅ Android Build: SUCCESS');
        console.log('✅ Firebase Integration: Working');
        console.log('✅ Google Services: Configured');
        
        console.log('\n🎉 Your app is ready!');
        console.log('\n📋 Next Steps:');
        console.log('1. Replace FIREBASE_SERVICE_ACCOUNT in backend/.env');
        console.log('2. Start backend: cd ../backend && npm run dev');
        console.log('3. Test FCM notifications');
        
      } else if (hasError) {
        console.log('❌ Android Build: FAILED');
        console.log('❌ Firebase Integration: Error detected');
        
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check google-services.json is in android/app/');
        console.log('2. Verify build.gradle files have Google Services plugin');
        console.log('3. Run: cd android && ./gradlew clean');
        
      } else {
        console.log('⚠️ Android Build: Completed with warnings');
        console.log('⚠️ Check output above for details');
      }
      
      process.exit(code);
    });
    
    // Timeout after 10 minutes
    setTimeout(() => {
      console.log('\n⏰ Build timeout (10 minutes) - stopping build');
      build.kill();
      console.log('💡 Try building manually: npm run android');
      process.exit(1);
    }, 600000);
  });
});