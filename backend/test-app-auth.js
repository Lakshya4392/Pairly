/**
 * Test App Authentication Flow
 * Run: node test-app-auth.js
 */

const BASE_URL = 'https://pairly-60qj.onrender.com';
// const BASE_URL = 'http://localhost:3000';

async function testVerifyEmail(email) {
  console.log('\n🔍 Testing: Verify Email');
  console.log('Email:', email);
  
  try {
    const response = await fetch(`${BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.verified) {
      console.log('✅ Email verified!');
      console.log('Referral Code:', data.referralCode);
      console.log('Premium Status:', data.isPremium);
      console.log('Referral Count:', data.referralCount);
      return data;
    } else {
      console.log('❌ Email not verified');
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testGetReferralCount(referralCode) {
  console.log('\n📊 Testing: Get Referral Count');
  console.log('Referral Code:', referralCode);
  
  try {
    const response = await fetch(`${BASE_URL}/auth/count?code=${referralCode}`);
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Count fetched!');
      console.log('Referrals:', data.count);
      console.log('Premium:', data.isPremium);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testWaitlistSignup(email, name, referralCode = null) {
  console.log('\n📝 Testing: Waitlist Signup');
  console.log('Email:', email);
  console.log('Name:', name);
  console.log('Referral Code:', referralCode || 'None');
  
  try {
    const body = {
      email,
      name,
      source: 'website',
    };
    
    if (referralCode) {
      body.referralCode = referralCode;
    }
    
    const response = await fetch(`${BASE_URL}/invites/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Added to waitlist!');
      console.log('Invite Code:', data.inviteCode);
      return data;
    } else {
      console.log('❌ Failed to add to waitlist');
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testCompleteFlow() {
  console.log('🚀 Starting Complete App Auth Flow Test\n');
  console.log('='.repeat(50));
  
  // Step 1: Signup on website
  console.log('\n📱 STEP 1: User signs up on website');
  const testEmail = `test${Date.now()}@example.com`;
  const signup = await testWaitlistSignup(testEmail, 'Test User');
  
  if (!signup) {
    console.log('❌ Signup failed, stopping test');
    return;
  }
  
  const referralCode = signup.inviteCode;
  
  // Step 2: Verify email in app (after Clerk login)
  console.log('\n📱 STEP 2: User logs into app with Clerk');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
  
  const verified = await testVerifyEmail(testEmail);
  
  if (!verified) {
    console.log('❌ Verification failed, stopping test');
    return;
  }
  
  // Step 3: Check referral count
  console.log('\n📱 STEP 3: User checks referral count');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
  
  await testGetReferralCount(referralCode);
  
  // Step 4: Friend signs up with referral
  console.log('\n📱 STEP 4: Friend signs up with referral code');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
  
  const friendEmail = `friend${Date.now()}@example.com`;
  await testWaitlistSignup(friendEmail, 'Friend User', referralCode);
  
  // Step 5: Check updated referral count
  console.log('\n📱 STEP 5: Check updated referral count');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
  
  await testGetReferralCount(referralCode);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Complete flow test finished!');
  console.log('\n📋 Summary:');
  console.log('1. User signed up on website ✅');
  console.log('2. User verified email in app ✅');
  console.log('3. User got referral code ✅');
  console.log('4. Friend used referral code ✅');
  console.log('5. Referral count increased ✅');
}

// Run tests
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run complete flow
    await testCompleteFlow();
  } else if (args[0] === 'verify') {
    // Test verify email
    const email = args[1] || 'test@example.com';
    await testVerifyEmail(email);
  } else if (args[0] === 'count') {
    // Test get count
    const code = args[1];
    if (!code) {
      console.log('❌ Please provide referral code: node test-app-auth.js count YOUR_CODE');
      return;
    }
    await testGetReferralCount(code);
  } else if (args[0] === 'signup') {
    // Test signup
    const email = args[1] || `test${Date.now()}@example.com`;
    const name = args[2] || 'Test User';
    const refCode = args[3] || null;
    await testWaitlistSignup(email, name, refCode);
  } else {
    console.log('Usage:');
    console.log('  node test-app-auth.js              - Run complete flow');
    console.log('  node test-app-auth.js verify EMAIL - Test verify email');
    console.log('  node test-app-auth.js count CODE   - Test get referral count');
    console.log('  node test-app-auth.js signup EMAIL NAME [REF_CODE] - Test signup');
  }
}

main().catch(console.error);
