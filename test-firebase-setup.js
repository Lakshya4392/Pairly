#!/usr/bin/env node

/**
 * 🔥 Firebase Setup Verification Script
 * 
 * This script checks if Firebase is properly configured for the Pairly app
 */

const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Setup Verification\n');

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function logResult(test, status, message) {
  const icons = { pass: '✅', fail: '❌', warn: '⚠️' };
  console.log(`${icons[status]} ${test}: ${message}`);
  results[status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : 'warnings']++;
}

// 1. Check google-services.json exists and is valid
function checkGoogleServicesJson() {
  const filePath = 'Pairly/android/app/google-services.json';
  
  if (!fs.existsSync(filePath)) {
    logResult('Google Services JSON', 'fail', 'File not found at Pairly/android/app/google-services.json');
    return;
  }

  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!content.project_info?.project_id) {
      logResult('Google Services JSON', 'fail', 'Invalid format - missing project_id');
      return;
    }

    const packageName = content.client?.[0]?.client_info?.android_client_info?.package_name;
    if (packageName !== 'com.pairly.app') {
      logResult('Google Services JSON', 'warn', `Package name is "${packageName}", expected "com.pairly.app"`);
    } else {
      logResult('Google Services JSON', 'pass', `Valid file with project ID: ${content.project_info.project_id}`);
    }
  } catch (error) {
    logResult('Google Services JSON', 'fail', `Invalid JSON format: ${error.message}`);
  }
}

// 2. Check Android build.gradle has Google Services plugin
function checkAndroidBuildGradle() {
  const filePath = 'Pairly/android/build.gradle';
  
  if (!fs.existsSync(filePath)) {
    logResult('Android Build Gradle', 'fail', 'File not found');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('com.google.gms:google-services')) {
    logResult('Android Build Gradle', 'pass', 'Google Services classpath found');
  } else {
    logResult('Android Build Gradle', 'fail', 'Missing Google Services classpath');
  }
}

// 3. Check Android app build.gradle has plugin applied
function checkAndroidAppBuildGradle() {
  const filePath = 'Pairly/android/app/build.gradle';
  
  if (!fs.existsSync(filePath)) {
    logResult('Android App Build Gradle', 'fail', 'File not found');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('apply plugin: "com.google.gms.google-services"')) {
    logResult('Android App Build Gradle', 'pass', 'Google Services plugin applied');
  } else {
    logResult('Android App Build Gradle', 'fail', 'Missing Google Services plugin');
  }
}

// 4. Check React Native Firebase dependencies
function checkReactNativeDependencies() {
  const filePath = 'Pairly/package.json';
  
  if (!fs.existsSync(filePath)) {
    logResult('React Native Dependencies', 'fail', 'package.json not found');
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = [
      '@react-native-firebase/app',
      '@react-native-firebase/messaging'
    ];

    const missing = requiredDeps.filter(dep => !deps[dep]);
    
    if (missing.length === 0) {
      logResult('React Native Dependencies', 'pass', 'All Firebase dependencies found');
    } else {
      logResult('React Native Dependencies', 'fail', `Missing: ${missing.join(', ')}`);
    }
  } catch (error) {
    logResult('React Native Dependencies', 'fail', `Error reading package.json: ${error.message}`);
  }
}

// 5. Check Backend Firebase dependencies
function checkBackendDependencies() {
  const filePath = 'backend/package.json';
  
  if (!fs.existsSync(filePath)) {
    logResult('Backend Dependencies', 'fail', 'backend/package.json not found');
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps['firebase-admin']) {
      logResult('Backend Dependencies', 'pass', `firebase-admin v${deps['firebase-admin']}`);
    } else {
      logResult('Backend Dependencies', 'fail', 'Missing firebase-admin dependency');
    }
  } catch (error) {
    logResult('Backend Dependencies', 'fail', `Error reading package.json: ${error.message}`);
  }
}

// 6. Check Backend Environment Configuration
function checkBackendEnvironment() {
  const filePath = 'backend/.env';
  
  if (!fs.existsSync(filePath)) {
    logResult('Backend Environment', 'fail', '.env file not found');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('FIREBASE_SERVICE_ACCOUNT=')) {
    const match = content.match(/FIREBASE_SERVICE_ACCOUNT=(.+)/);
    if (match && match[1].trim() !== '') {
      try {
        const serviceAccount = JSON.parse(match[1]);
        if (serviceAccount.type === 'service_account' && serviceAccount.project_id) {
          logResult('Backend Environment', 'pass', `Service account configured for project: ${serviceAccount.project_id}`);
        } else {
          logResult('Backend Environment', 'fail', 'Invalid service account format');
        }
      } catch (error) {
        logResult('Backend Environment', 'fail', 'Invalid service account JSON');
      }
    } else {
      logResult('Backend Environment', 'warn', 'FIREBASE_SERVICE_ACCOUNT is empty - needs real service account');
    }
  } else {
    logResult('Backend Environment', 'fail', 'Missing FIREBASE_SERVICE_ACCOUNT in .env');
  }
}

// 7. Check FCM Service Implementation
function checkFCMServices() {
  const backendFCM = 'backend/src/services/FCMService.ts';
  const frontendFCM = 'Pairly/src/services/FCMService.ts';
  
  if (fs.existsSync(backendFCM)) {
    logResult('Backend FCM Service', 'pass', 'FCM service implementation found');
  } else {
    logResult('Backend FCM Service', 'fail', 'FCM service not found');
  }
  
  if (fs.existsSync(frontendFCM)) {
    logResult('Frontend FCM Service', 'pass', 'FCM service implementation found');
  } else {
    logResult('Frontend FCM Service', 'fail', 'FCM service not found');
  }
}

// Run all checks
console.log('Running Firebase setup verification...\n');

checkGoogleServicesJson();
checkAndroidBuildGradle();
checkAndroidAppBuildGradle();
checkReactNativeDependencies();
checkBackendDependencies();
checkBackendEnvironment();
checkFCMServices();

// Summary
console.log('\n📊 Summary:');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⚠️ Warnings: ${results.warnings}`);

if (results.failed === 0) {
  console.log('\n🎉 Firebase setup looks good! Ready for testing.');
  console.log('\n📋 Next Steps:');
  console.log('1. Replace FIREBASE_SERVICE_ACCOUNT in backend/.env with real service account JSON');
  console.log('2. Build the app: cd Pairly && npm run android');
  console.log('3. Test FCM token registration in backend logs');
  console.log('4. Send test notification from Firebase Console');
} else {
  console.log('\n🚨 Issues found! Please fix the failed checks above.');
  process.exit(1);
}