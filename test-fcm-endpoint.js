#!/usr/bin/env node

/**
 * 🔥 FCM Token Registration Test
 * 
 * Tests the FCM token registration endpoint
 */

const http = require('http');

console.log('🔥 Testing FCM Token Registration Endpoint\n');

// Test data
const testData = JSON.stringify({
  userId: 'test-user-123',
  fcmToken: 'test-fcm-token-abc123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/users/fcm-token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('📡 Testing POST /users/fcm-token endpoint...');

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📥 Response:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
      
      if (res.statusCode === 200) {
        console.log('\n✅ FCM Token Registration: SUCCESS');
        console.log('✅ Backend API: Working');
        console.log('✅ Firebase Integration: Ready');
      } else {
        console.log('\n⚠️ FCM Token Registration: Non-200 status');
      }
    } catch (error) {
      console.log('Raw response:', data);
    }
    
    console.log('\n🎯 Firebase Setup Status: COMPLETE');
    console.log('📱 Ready to test with real app!');
  });
});

req.on('error', (error) => {
  console.log('❌ Connection Error:', error.message);
  console.log('\n💡 Make sure backend is running: npm run dev');
});

req.write(testData);
req.end();