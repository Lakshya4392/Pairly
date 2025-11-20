/**
 * Clear all pairs from database via API
 */

const API_URL = 'https://pairly-60qj.onrender.com';

// Get your auth token from app logs (look for "Bearer ..." in console)
const AUTH_TOKEN = 'YOUR_TOKEN_HERE'; // Replace with actual token from logs

async function clearAllPairs() {
  try {
    console.log('🔄 Clearing all pairs...');
    
    // This will disconnect current user
    const response = await fetch(`${API_URL}/pairs/disconnect`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Response:', data);
    
    if (data.success) {
      console.log('✅ Pairs cleared successfully!');
    } else {
      console.log('⚠️ Response:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

clearAllPairs();
