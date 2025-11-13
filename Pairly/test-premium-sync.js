/**
 * Test Premium Sync
 * Run this to verify premium status syncs properly from database
 */

const API_URL = 'http://192.168.1.6:3000'; // Update with your backend URL

async function testPremiumSync() {
  console.log('🧪 Testing Premium Sync...\n');

  // Test 1: Sync user
  console.log('📝 Test 1: Sync User');
  try {
    const response = await fetch(`${API_URL}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clerkId: 'test_user_123',
        email: 'test@example.com',
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User',
      }),
    });

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.user) {
      console.log('✅ User synced successfully');
      console.log('💎 Premium Status:', {
        isPremium: data.user.isPremium,
        plan: data.user.premiumPlan,
        expiresAt: data.user.premiumExpiry,
        trialEndsAt: data.user.trialEndsAt,
      });
    } else {
      console.log('❌ Sync failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Get user
  console.log('📝 Test 2: Get User');
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-clerk-user-id': 'test_user_123',
      },
    });

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    
    if (data.user) {
      console.log('✅ User retrieved successfully');
      console.log('💎 Premium Status:', {
        isPremium: data.user.isPremium,
        plan: data.user.premiumPlan,
        expiresAt: data.user.premiumExpiry,
        trialEndsAt: data.user.trialEndsAt,
      });
    } else {
      console.log('❌ Get user failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Update premium status
  console.log('📝 Test 3: Update Premium Status');
  try {
    const response = await fetch(`${API_URL}/auth/premium`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-clerk-user-id': 'test_user_123',
      },
      body: JSON.stringify({
        isPremium: true,
        plan: 'yearly',
      }),
    });

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.user) {
      console.log('✅ Premium status updated');
      console.log('💎 New Premium Status:', {
        isPremium: data.user.isPremium,
        plan: data.user.premiumPlan,
        expiresAt: data.user.premiumExpiry,
      });
    } else {
      console.log('❌ Update failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n✅ All tests completed!\n');
}

// Run tests
testPremiumSync().catch(console.error);
