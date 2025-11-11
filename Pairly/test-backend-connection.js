/**
 * Test Backend Connection from Mobile
 * This tests if mobile app can reach backend
 */

const API_URL = 'http://10.30.2.121:3000';

async function testConnection() {
  console.log('🧪 Testing Backend Connection...\n');
  console.log(`API URL: ${API_URL}\n`);

  // Test 1: Health Check
  console.log('1️⃣ Testing health endpoint...');
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check passed!');
    console.log('   Response:', data);
    console.log('');
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.error('   Make sure backend is running on port 3000');
    console.error('   Make sure you are on the same network\n');
    return;
  }

  // Test 2: Ping Test
  console.log('2️⃣ Testing ping endpoint...');
  try {
    const response = await fetch(`${API_URL}/test/ping`);
    const data = await response.json();
    console.log('✅ Ping test passed!');
    console.log('   Response:', data);
    console.log('');
  } catch (error) {
    console.error('❌ Ping test failed:', error.message);
    console.error('');
  }

  // Test 3: User Sync Test
  console.log('3️⃣ Testing user sync endpoint...');
  try {
    const testUser = {
      clerkId: 'mobile_test_user',
      email: 'mobile@test.com',
      displayName: 'Mobile Test User',
      firstName: 'Mobile',
      lastName: 'Test',
    };

    const response = await fetch(`${API_URL}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ User sync test passed!');
      console.log('   User created:', data.user.displayName);
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('');
    } else {
      console.error('❌ User sync failed:', data.error);
      console.error('');
    }
  } catch (error) {
    console.error('❌ User sync test failed:', error.message);
    console.error('');
  }

  // Summary
  console.log('═══════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════');
  console.log('Backend URL:', API_URL);
  console.log('Connection: Check results above');
  console.log('═══════════════════════════════════════\n');

  console.log('📝 Next Steps:');
  console.log('1. If all tests passed → Mobile app should work');
  console.log('2. If tests failed → Check network/backend');
  console.log('3. Open Prisma Studio to verify: npx prisma studio');
  console.log('4. Restart Expo: npx expo start --clear\n');
}

// Run test
testConnection()
  .then(() => {
    console.log('✅ Test completed');
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
  });
