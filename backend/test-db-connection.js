// Test database connection directly
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn', 'info'],
});

async function testDB() {
  console.log('🔍 Testing Database Connection...\n');
  
  try {
    // Test 1: Basic connection
    console.log('Test 1: Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Test 2: Simple query
    console.log('\nTest 2: Testing simple query...');
    const count = await prisma.invitedUser.count();
    console.log('✅ Query successful. Total invited users:', count);
    
    // Test 3: Create test user
    console.log('\nTest 3: Creating test user...');
    const testEmail = `dbtest${Date.now()}@example.com`;
    
    const newUser = await prisma.invitedUser.create({
      data: {
        email: testEmail,
        status: 'pending',
        source: 'test',
        name: 'DB Test User',
      }
    });
    
    console.log('✅ User created successfully:', {
      id: newUser.id,
      email: newUser.email,
      inviteCode: newUser.inviteCode
    });
    
    // Test 4: Find the user
    console.log('\nTest 4: Finding created user...');
    const foundUser = await prisma.invitedUser.findUnique({
      where: { email: testEmail }
    });
    
    if (foundUser) {
      console.log('✅ User found:', foundUser.email);
    } else {
      console.log('❌ User not found');
    }
    
    // Test 5: Delete test user
    console.log('\nTest 5: Cleaning up test user...');
    await prisma.invitedUser.delete({
      where: { email: testEmail }
    });
    console.log('✅ Test user deleted');
    
    console.log('\n🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database error:', error);
    console.error('\nError details:');
    console.error('- Message:', error.message);
    console.error('- Code:', error.code);
    console.error('- Meta:', error.meta);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database disconnected');
  }
}

testDB();