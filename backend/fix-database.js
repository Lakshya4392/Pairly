// Fix database schema by running migrations
const { execSync } = require('child_process');

console.log('🔧 Fixing Database Schema...\n');

try {
  console.log('Step 1: Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated\n');
  
  console.log('Step 2: Deploying migrations to production...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Migrations deployed\n');
  
  console.log('Step 3: Testing database connection...');
  execSync('node test-db-connection.js', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  
  console.log('\n🔧 Manual Fix Required:');
  console.log('1. Run: npx prisma migrate deploy');
  console.log('2. Or reset database: npx prisma migrate reset');
  console.log('3. Then test: node test-db-connection.js');
}