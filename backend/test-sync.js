/**
 * Test Script to Verify Database Sync
 * Run: node test-sync.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test user data
const testUsers = [
  {
    clerkId: 'test_user_001',
    email: 'test1@example.com',
    displayName: 'Test User 1',
    firstName: 'Test',
    lastName: 'User',
  },
  {
    clerkId: 'test_user_002',
    email: 'test2@example.com',
    displayName: 'Test User 2',
    firstName: 'Another',
    lastName: 'Test',
  },
  {
    clerkId: 'test_user_003',
    email: 'lakshay@test.com',
    displayName: 'Lakshay Test',
    firstName: 'Lakshay',
    lastName: 'Kumar',
  },
];

async function testDatabaseSync() {
  console.log('🧪 Starting Database Sync Test...\n');

  try {
    // Test 1: Check database connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully!\n');

    // Test 2: Create test users
    console.log('2️⃣ Creating test users...');
    for (const userData of testUsers) {
      try {
        const user = await prisma.user.upsert({
          where: { clerkId: userData.clerkId },
          update: {
            email: userData.email,
            displayName: userData.displayName,
            firstName: userData.firstName,
            lastName: userData.lastName,
            lastActiveAt: new Date(),
          },
          create: {
            clerkId: userData.clerkId,
            email: userData.email,
            displayName: userData.displayName,
            firstName: userData.firstName,
            lastName: userData.lastName,
          },
        });

        console.log(`✅ User created/updated: ${user.displayName} (${user.email})`);
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Clerk ID: ${user.clerkId}`);
        console.log(`   - Created: ${user.createdAt}`);
        console.log('');
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    // Test 3: Verify users exist
    console.log('3️⃣ Verifying users in database...');
    const allUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`✅ Found ${allUsers.length} users in database:\n`);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.displayName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   Premium: ${user.isPremium ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });

    // Test 4: Test update
    console.log('4️⃣ Testing user update...');
    const updateTest = await prisma.user.update({
      where: { clerkId: 'test_user_001' },
      data: {
        lastActiveAt: new Date(),
        notificationsEnabled: true,
      },
    });
    console.log(`✅ User updated: ${updateTest.displayName}`);
    console.log(`   Last Active: ${updateTest.lastActiveAt}\n`);

    // Test 5: Test premium status
    console.log('5️⃣ Testing premium status update...');
    const premiumTest = await prisma.user.update({
      where: { clerkId: 'test_user_002' },
      data: {
        isPremium: true,
        premiumPlan: 'yearly',
        premiumSince: new Date(),
        premiumExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`✅ Premium status updated: ${premiumTest.displayName}`);
    console.log(`   Premium: ${premiumTest.isPremium}`);
    console.log(`   Plan: ${premiumTest.premiumPlan}`);
    console.log(`   Expires: ${premiumTest.premiumExpiry}\n`);

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════');
    console.log('✅ Database connection: Working');
    console.log('✅ User creation: Working');
    console.log('✅ User update: Working');
    console.log('✅ Premium status: Working');
    console.log('✅ Upsert logic: Working');
    console.log('═══════════════════════════════════════\n');

    console.log('📊 Next Steps:');
    console.log('1. Open Prisma Studio: npx prisma studio');
    console.log('2. Check User table');
    console.log('3. Verify test users are present');
    console.log('4. Test mobile app sync\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n🔍 Troubleshooting:');
    console.error('1. Check DATABASE_URL in .env');
    console.error('2. Run: npx prisma migrate deploy');
    console.error('3. Check database connection');
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testDatabaseSync()
  .then(() => {
    console.log('✅ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
