const https = require('https');

const API_KEY = 'test_kyGmwcYeZPzFRROlNuatxqBPIdN'; // The key from .env
const USER_ID = 'test-user-' + Math.floor(Math.random() * 10000);

const options = {
    hostname: 'api.revenuecat.com',
    path: `/v1/subscribers/${USER_ID}`,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-Platform': 'android',
        'Content-Type': 'application/json',
    },
};

console.log(`Testing RevenueCat API Key: ${API_KEY}`);
console.log(`Endpoint: https://api.revenuecat.com/v1/subscribers/${USER_ID}`);

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('✅ SUCCESS: The API Key is VALID.');
            console.log('Response:', JSON.parse(data));
        } else {
            console.log('❌ FAILURE: The API Key is INVALID or Rejected.');
            console.log('Response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`❌ NETWORK ERROR: ${e.message}`);
});

req.end();
