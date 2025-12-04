// Debug waitlist endpoint with detailed error logging
const BASE_URL = 'https://pairly-60qj.onrender.com';

async function debugTest() {
  console.log('🔍 Debugging Waitlist Endpoint\n');
  
  // Test 1: Simple request
  console.log('Test 1: Basic waitlist request');
  try {
    const response = await fetch(`${BASE_URL}/invites/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `debug${Date.now()}@example.com`,
        source: 'website'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Raw Response:', text);
    
    if (response.status === 500) {
      console.log('❌ 500 Error - Backend code issue');
    }
    
  } catch (error) {
    console.error('Network Error:', error);
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Test 2: Check if other endpoints work
  console.log('\nTest 2: Check other endpoints');
  
  try {
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('Health Check:', healthData.status);
    
    // Try auth endpoint
    const authResponse = await fetch(`${BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    
    console.log('Auth Endpoint Status:', authResponse.status);
    const authText = await authResponse.text();
    console.log('Auth Response:', authText);
    
  } catch (error) {
    console.error('Other endpoints error:', error);
  }
}

debugTest();