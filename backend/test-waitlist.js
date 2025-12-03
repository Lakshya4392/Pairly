// Quick test script for waitlist endpoint
// Run: node test-waitlist.js

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testWaitlist() {
  console.log('🧪 Testing Waitlist Endpoint\n');
  console.log(`API URL: ${API_URL}\n`);

  // Test 1: Add to waitlist
  console.log('Test 1: Adding email to waitlist...');
  try {
    const response = await fetch(`${API_URL}/invites/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        source: 'test-script',
      }),
    });

    const data = await response.json();
    console.log('✅ Response:', data);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
  }

  // Test 2: Try adding same email again
  console.log('Test 2: Adding same email again (should say already exists)...');
  try {
    const response = await fetch(`${API_URL}/invites/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        source: 'test-script',
      }),
    });

    const data = await response.json();
    console.log('✅ Response:', data);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
  }

  // Test 3: Get stats
  console.log('Test 3: Getting waitlist stats...');
  try {
    const response = await fetch(`${API_URL}/invites/waitlist/stats`);
    const data = await response.json();
    console.log('✅ Stats:', data);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
  }

  // Test 4: Check access
  console.log('Test 4: Checking if email has access...');
  try {
    const response = await fetch(`${API_URL}/invites/check-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    const data = await response.json();
    console.log('✅ Access Check:', data);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
  }

  // Test 5: Referral Signup
  console.log('Test 5: Signup with referral code...');
  try {
    const response = await fetch(`${API_URL}/invites/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'referred_friend@example.com',
        source: 'test-script',
        referralCode: 'TEST_REF_CODE' // This likely won't exist, but tests the flow
      }),
    });

    const data = await response.json();
    console.log('✅ Referral Response:', data);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
  }

  console.log('🎉 All tests completed!\n');
  console.log('Next steps:');
  console.log('1. Check database: npx prisma studio');
  console.log('2. Look for test@example.com in InvitedUser table');
  console.log('3. Update your Vercel website to use this endpoint\n');
}

testWaitlist();
