// Simple test with detailed error logging
const BASE_URL = 'https://pairly-60qj.onrender.com';

async function test() {
  console.log('Testing waitlist endpoint...\n');
  
  const email = `test${Date.now()}@example.com`;
  console.log('Email:', email);
  
  try {
    const response = await fetch(`${BASE_URL}/invites/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        name: 'Test User',
        source: 'website'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const text = await response.text();
    console.log('Raw Response:', text);
    
    try {
      const data = JSON.parse(text);
      console.log('Parsed Data:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
