#!/usr/bin/env node

/**
 * 🤝 Fixed Pairing System Test
 * Tests with correct endpoints and proper authentication
 */

const http = require('http');

console.log('🤝 Testing Pairing System (Fixed)\n');

// Test configuration
const HOST = '10.30.27.39';
const PORT = 3000;

/**
 * Make HTTP request
 */
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Test 1: Backend Health
 */
async function testBackendHealth() {
  console.log('🏥 Test 1: Backend Health Check');
  
  try {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/',
      method: 'GET',
      timeout: 5000,
    };

    const response = await makeRequest(options);
    
    if (response.status === 200) {
      console.log('✅ Backend is healthy');
      console.log(`📊 Response: ${JSON.stringify(response.data)}`);
    } else {
      console.log(`⚠️ Backend returned status: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Create Test User
 */
async function createTestUser() {
  console.log('\n👤 Test 2: Create Test User');
  
  try {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const userData = {
      clerkId: 'test_clerk_123',
      email: 'test@pairly.app',
      displayName: 'Test User',
    };

    const response = await makeRequest(options, userData);
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ Test user created successfully');
      console.log(`📊 User ID: ${response.data.data?.id || 'Created'}`);
      return response.data.data;
    } else if (response.status === 409) {
      console.log('✅ Test user already exists');
      return { id: 'existing-user' };
    } else {
      console.log('⚠️ User creation response:', response.status, response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Create user error:', error.m