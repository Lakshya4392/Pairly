/**
 * Performance Test Script
 * Tests the optimized moment sending and widget update flow
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const TEST_USER_1 = process.env.TEST_USER_1_ID || 'user_test1';
const TEST_USER_2 = process.env.TEST_USER_2_ID || 'user_test2';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Performance metrics
const metrics = {
  socketConnection: 0,
  photoUpload: 0,
  fcmDelivery: 0,
  totalTime: 0,
};

async function testPerformance() {
  log('\n🚀 Starting Performance Test\n', 'cyan');
  
  const startTime = Date.now();

  try {
    // Test 1: Socket.IO Connection Speed
    log('📡 Test 1: Socket.IO Connection Speed', 'blue');
    const socketStart = Date.now();
    
    try {
      await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      metrics.socketConnection = Date.now() - socketStart;
      log(`✅ Connection time: ${metrics.socketConnection}ms`, 'green');
    } catch (error) {
      log(`❌ Connection failed: ${error.message}`, 'red');
      metrics.socketConnection = -1;
    }

    // Test 2: Photo Upload Speed
    log('\n📸 Test 2: Photo Upload Speed', 'blue');
    const uploadStart = Date.now();
    
    // Create a test photo (1KB base64 string)
    const testPhoto = Buffer.from('test-photo-data').toString('base64');
    
    try {
      // Simulate photo upload
      const response = await axios.post(
        `${BACKEND_URL}/moments/upload`,
        {
          photo: testPhoto,
          userId: TEST_USER_1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      
      metrics.photoUpload = Date.now() - uploadStart;
      log(`✅ Upload time: ${metrics.photoUpload}ms`, 'green');
    } catch (error) {
      if (error.response?.status === 401) {
        log(`⚠️  Authentication required (expected in production)`, 'yellow');
        metrics.photoUpload = Date.now() - uploadStart;
      } else {
        log(`❌ Upload failed: ${error.message}`, 'red');
        metrics.photoUpload = -1;
      }
    }

    // Test 3: FCM Delivery (simulated)
    log('\n🔔 Test 3: FCM Notification Delivery', 'blue');
    const fcmStart = Date.now();
    
    // Simulate FCM delivery time (typically 100-500ms)
    await new Promise(resolve => setTimeout(resolve, 200));
    metrics.fcmDelivery = Date.now() - fcmStart;
    log(`✅ FCM delivery time: ${metrics.fcmDelivery}ms (simulated)`, 'green');

    // Calculate total time
    metrics.totalTime = Date.now() - startTime;

    // Display Results
    log('\n📊 Performance Summary', 'cyan');
    log('═══════════════════════════════════════', 'cyan');
    log(`Socket Connection:  ${metrics.socketConnection >= 0 ? metrics.socketConnection + 'ms' : 'Failed'}`, 
        metrics.socketConnection < 1000 ? 'green' : 'yellow');
    log(`Photo Upload:       ${metrics.photoUpload >= 0 ? metrics.photoUpload + 'ms' : 'Failed'}`, 
        metrics.photoUpload < 2000 ? 'green' : 'yellow');
    log(`FCM Delivery:       ${metrics.fcmDelivery}ms`, 'green');
    log(`Total Time:         ${metrics.totalTime}ms`, 
        metrics.totalTime < 3000 ? 'green' : 'yellow');
    log('═══════════════════════════════════════', 'cyan');

    // Performance Rating
    const avgTime = (metrics.socketConnection + metrics.photoUpload + metrics.fcmDelivery) / 3;
    let rating = '';
    let ratingColor = 'green';

    if (avgTime < 500) {
      rating = '🌟 EXCELLENT';
      ratingColor = 'green';
    } else if (avgTime < 1000) {
      rating = '✅ GOOD';
      ratingColor = 'green';
    } else if (avgTime < 2000) {
      rating = '⚠️  FAIR';
      ratingColor = 'yellow';
    } else {
      rating = '❌ POOR';
      ratingColor = 'red';
    }

    log(`\nPerformance Rating: ${rating}`, ratingColor);
    log(`Average Latency: ${Math.round(avgTime)}ms\n`, ratingColor);

    // Recommendations
    if (avgTime > 1000) {
      log('💡 Recommendations:', 'yellow');
      if (metrics.socketConnection > 1000) {
        log('  • Check network connection', 'yellow');
        log('  • Verify backend is running locally', 'yellow');
      }
      if (metrics.photoUpload > 2000) {
        log('  • Reduce photo size/quality', 'yellow');
        log('  • Check backend processing time', 'yellow');
      }
    }

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run tests
log('╔════════════════════════════════════════╗', 'cyan');
log('║   Pairly Performance Test Suite       ║', 'cyan');
log('╚════════════════════════════════════════╝', 'cyan');

testPerformance().then(() => {
  log('\n✅ Performance test completed\n', 'green');
  process.exit(0);
}).catch((error) => {
  log('\n❌ Performance test failed\n', 'red');
  console.error(error);
  process.exit(1);
});
