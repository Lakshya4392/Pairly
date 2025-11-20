/**
 * Script to unpair users directly from backend
 */

const API_URL = 'https://pairly-60qj.onrender.com';

// User tokens - Get these from app logs or Clerk dashboard
const LAKSHAY_TOKEN = 'YOUR_LAKSHAY_TOKEN_HERE';
const NISCHAY_TOKEN = 'YOUR_NISCHAY_TOKEN_HERE';

async function unpairUser(token, userName) {
  try {
    console.log(`\n🔄 Unpairing ${userName}...`);
    
    const response = await fetch(`${API_URL}/pairs/disconnect`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${userName} unpaired successfully!`);
    } else {
      console.log(`⚠️ ${userName} unpair response:`, data);
    }
  } catch (error) {
    console.error(`❌ Error unpairing ${userName}:`, error.message);
  }
}

async function main() {
  console.log('🔓 Starting unpair process...\n');
  
  // Unpair both users
  await unpairUser(LAKSHAY_TOKEN, 'Lakshay');
  await unpairUser(NISCHAY_TOKEN, 'Nischay');
  
  console.log('\n✅ Unpair process completed!');
  console.log('📱 Now you can pair again with fresh data');
}

main();
