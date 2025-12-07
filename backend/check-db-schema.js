// Check actual database schema
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchema() {
  console.log('🔍 Checking Database Schema...\n');
  
  try {
    // Check if InvitedUser table exists and what columns it has
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'InvitedUser' 
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 InvitedUser table columns:');
    console.table(result);
    
    // Check if we can create a simple record without source
    console.log('\n🧪 Testing simple record creation...');
    const testEmail = `schematest${Date.now()}@example.com`;
    
    const newUser = await prisma.invitedUser.create({
      data: {
        email: testEmail,
        status: 'pending',
        // Don't include source field
      }
    });
    
    console.log('✅ Simple record created:', {
      id: newUser.id,
      email: newUser.email,
      inviteCode: newUser.inviteCode
    });
    
    // Clean up
    await prisma.invitedUser.delete({
      where: { email: testEmail }
    });
    console.log('✅ Test record cleaned up');
    
  } catch (error) {
    console.error('❌ Schema check error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();