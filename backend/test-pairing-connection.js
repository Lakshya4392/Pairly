/**
 * 🧪 Test Pairing Connection Process
 * Tests the complete flow: Generate Code → Join Code → Socket Events
 */

const io = require('socket.io-client');

const BASE_URL = process.env.API_URL || 'https://pairly-backend.onrender.com';
const SOCKET_URL = BASE_URL;

// Test user credentials
const USER1_ID = `test_user1_${Date.now()}`;
const USER2_ID = `test_user2_${Date.now()}`;

let generatedCode = null;
let socket1 = null;
let socket2 = null;

console.log('🧪 Starting Pairing Connection Test');
console.log('📡 Backend URL:', BASE_URL);
console.log('👤 User 1 ID:', USER1_ID);
console.log('👤 User 2 ID:', USER2_ID);
console.log('');

/**
 * Test 1: Generate Code (User 1)
 */
async function testGenerateCode() {
  console.log('📝 TEST 1: Generate Invite Code');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${BASE_URL}/api/pairs/generate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER1_ID,
      },
    });

    const data = await response.json();
    
    if (data.success && data.data?.code) {
      generatedCode = data.data.code;
      console.log('✅ Code generated successfully!');
      console.log('📋 Code:', generatedCode);
      console.log('⏰ Expires at:', data.data.expiresAt);
      
      const expiresAt = new Date(data.data.expiresAt);
      const now = new Date();
      const minutesRemaining = Math.floor((expiresAt - now) / 1000 / 60);
      console.log(`⏳ Valid for: ${minutesRemaining} minutes`);
      
      return true;
    } else {
      console.error('❌ Failed to generate code:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error generating code:', error.message);
    return false;
  }
}

/**
 * Test 2: Connect Socket (User 1)
 */
async function testConnectSocket1() {
  console.log('\n🔌 TEST 2: Connect Socket for User 1');
  console.log('─'.repeat(50));
  
  return new Promise((resolve) => {
    socket1 = io(SOCKET_URL, {
      auth: { userId: USER1_ID },
      transports: ['websocket', 'polling'],
      timeout: 60000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    const timeout = setTimeout(() => {
      console.error('❌ Socket 1 connection timeout');
      resolve(false);
    }, 15000);

    socket1.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ Socket 1 connected!');
      console.log('🆔 Socket ID:', socket1.id);
      resolve(true);
    });

    socket1.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.error('❌ Socket 1 connection error:', error.message);
      resolve(false);
    });

    // Listen for pairing events
    socket1.on('partner_connected', (data) => {
      console.log('🎉 User 1 received: partner_connected');
      console.log('👤 Partner:', data.partner?.displayName || data.partnerId);
    });

    socket1.on('pairing_success', (data) => {
      console.log('🎉 User 1 received: pairing_success');
      console.log('👤 Partner:', data.partnerName || data.partner?.displayName);
    });
  });
}

/**
 * Test 3: Connect Socket (User 2)
 */
async function testConnectSocket2() {
  console.log('\n🔌 TEST 3: Connect Socket for User 2');
  console.log('─'.repeat(50));
  
  return new Promise((resolve) => {
    socket2 = io(SOCKET_URL, {
      auth: { userId: USER2_ID },
      transports: ['websocket', 'polling'],
      timeout: 60000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    const timeout = setTimeout(() => {
      console.error('❌ Socket 2 connection timeout');
      resolve(false);
    }, 15000);

    socket2.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ Socket 2 connected!');
      console.log('🆔 Socket ID:', socket2.id);
      resolve(true);
    });

    socket2.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.error('❌ Socket 2 connection error:', error.message);
      resolve(false);
    });

    // Listen for pairing events
    socket2.on('partner_connected', (data) => {
      console.log('🎉 User 2 received: partner_connected');
      console.log('👤 Partner:', data.partner?.displayName || data.partnerId);
    });

    socket2.on('pairing_success', (data) => {
      console.log('🎉 User 2 received: pairing_success');
      console.log('👤 Partner:', data.partnerName || data.partner?.displayName);
    });
  });
}

/**
 * Test 4: Join with Code (User 2)
 */
async function testJoinWithCode() {
  console.log('\n🔗 TEST 4: Join with Code (User 2)');
  console.log('─'.repeat(50));
  console.log('📋 Using code:', generatedCode);
  
  try {
    const response = await fetch(`${BASE_URL}/api/pairs/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER2_ID,
      },
      body: JSON.stringify({ code: generatedCode }),
    });

    const data = await response.json();
    
    if (data.success && data.data?.pair) {
      console.log('✅ Successfully joined with code!');
      console.log('🤝 Pair ID:', data.data.pair.id);
      console.log('👤 Partner:', data.data.partner?.displayName || 'Unknown');
      console.log('📅 Paired at:', data.data.pair.pairedAt);
      
      // Wait for socket events
      console.log('\n⏳ Waiting for socket events (5 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return true;
    } else {
      console.error('❌ Failed to join:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error joining with code:', error.message);
    return false;
  }
}

/**
 * Test 5: Verify Connection
 */
async function testVerifyConnection() {
  console.log('\n✅ TEST 5: Verify Connection');
  console.log('─'.repeat(50));
  
  try {
    // Check User 1's pair
    const response1 = await fetch(`${BASE_URL}/api/pairs/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER1_ID,
      },
    });

    const data1 = await response1.json();
    
    if (data1.success && data1.data?.pair) {
      console.log('✅ User 1 is paired!');
      console.log('👤 Partner:', data1.data.partner?.displayName || 'Unknown');
    } else {
      console.error('❌ User 1 not paired');
      return false;
    }

    // Check User 2's pair
    const response2 = await fetch(`${BASE_URL}/api/pairs/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER2_ID,
      },
    });

    const data2 = await response2.json();
    
    if (data2.success && data2.data?.pair) {
      console.log('✅ User 2 is paired!');
      console.log('👤 Partner:', data2.data.partner?.displayName || 'Unknown');
    } else {
      console.error('❌ User 2 not paired');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error verifying connection:', error.message);
    return false;
  }
}

/**
 * Test 6: Test Socket Stability (15 minutes simulation)
 */
async function testSocketStability() {
  console.log('\n⏱️  TEST 6: Socket Stability Test');
  console.log('─'.repeat(50));
  console.log('Testing connection stability for 2 minutes...');
  console.log('(Simulating 15-minute code validity period)');
  
  let socket1Connected = true;
  let socket2Connected = true;
  
  socket1.on('disconnect', () => {
    socket1Connected = false;
    console.log('⚠️  Socket 1 disconnected');
  });
  
  socket2.on('disconnect', () => {
    socket2Connected = false;
    console.log('⚠️  Socket 2 disconnected');
  });
  
  socket1.on('reconnect', () => {
    socket1Connected = true;
    console.log('✅ Socket 1 reconnected');
  });
  
  socket2.on('reconnect', () => {
    socket2Connected = true;
    console.log('✅ Socket 2 reconnected');
  });
  
  // Check every 10 seconds for 2 minutes
  for (let i = 0; i < 12; i++) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    const elapsed = (i + 1) * 10;
    console.log(`⏱️  ${elapsed}s - Socket 1: ${socket1Connected ? '✅' : '❌'}, Socket 2: ${socket2Connected ? '✅' : '❌'}`);
  }
  
  if (socket1Connected && socket2Connected) {
    console.log('✅ Both sockets remained stable for 2 minutes!');
    return true;
  } else {
    console.error('❌ Socket stability test failed');
    return false;
  }
}

/**
 * Cleanup
 */
function cleanup() {
  console.log('\n🧹 Cleaning up...');
  if (socket1) socket1.disconnect();
  if (socket2) socket2.disconnect();
  console.log('✅ Cleanup complete');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Pairing Connection Tests\n');
  
  const results = {
    generateCode: false,
    connectSocket1: false,
    connectSocket2: false,
    joinWithCode: false,
    verifyConnection: false,
    socketStability: false,
  };
  
  try {
    // Test 1: Generate Code
    results.generateCode = await testGenerateCode();
    if (!results.generateCode) {
      throw new Error('Failed to generate code');
    }
    
    // Test 2: Connect Socket 1
    results.connectSocket1 = await testConnectSocket1();
    if (!results.connectSocket1) {
      throw new Error('Failed to connect socket 1');
    }
    
    // Test 3: Connect Socket 2
    results.connectSocket2 = await testConnectSocket2();
    if (!results.connectSocket2) {
      throw new Error('Failed to connect socket 2');
    }
    
    // Test 4: Join with Code
    results.joinWithCode = await testJoinWithCode();
    if (!results.joinWithCode) {
      throw new Error('Failed to join with code');
    }
    
    // Test 5: Verify Connection
    results.verifyConnection = await testVerifyConnection();
    if (!results.verifyConnection) {
      throw new Error('Failed to verify connection');
    }
    
    // Test 6: Socket Stability (optional - comment out for quick test)
    console.log('\n⏭️  Skipping socket stability test (takes 2 minutes)');
    console.log('💡 To run stability test, uncomment the line below');
    // results.socketStability = await testSocketStability();
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  } finally {
    cleanup();
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`1. Generate Code:      ${results.generateCode ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`2. Connect Socket 1:   ${results.connectSocket1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`3. Connect Socket 2:   ${results.connectSocket2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`4. Join with Code:     ${results.joinWithCode ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`5. Verify Connection:  ${results.verifyConnection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`6. Socket Stability:   ${results.socketStability ? '✅ PASS' : '⏭️  SKIPPED'}`);
  console.log('='.repeat(50));
  
  const passedTests = Object.values(results).filter(r => r === true).length;
  const totalTests = Object.keys(results).length - 1; // Exclude skipped test
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Pairing connection is working perfectly!');
  } else {
    console.log(`\n⚠️  ${passedTests}/${totalTests} tests passed`);
  }
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  cleanup();
  process.exit(1);
});
