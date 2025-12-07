console.log('⏳ Waiting 60 seconds for Render deployment...');

let countdown = 60;
const timer = setInterval(() => {
  process.stdout.write(`\r⏳ ${countdown} seconds remaining...`);
  countdown--;
  
  if (countdown < 0) {
    clearInterval(timer);
    console.log('\n\n🧪 Testing backend...');
    
    // Test health endpoint
    fetch('https://pairly-60qj.onrender.com/health')
      .then(r => r.json())
      .then(data => {
        console.log('Health:', data.message);
        
        // Test waitlist endpoint
        return fetch('https://pairly-60qj.onrender.com/invites/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `test${Date.now()}@example.com`,
            source: 'website'
          })
        });
      })
      .then(r => {
        console.log('Waitlist Status:', r.status);
        return r.json();
      })
      .then(data => {
        console.log('Waitlist Response:', data);
        if (data.success) {
          console.log('✅ Backend is working!');
        } else {
          console.log('❌ Still having issues');
        }
      })
      .catch(console.error);
  }
}, 1000);