// Quick deployment readiness check
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking deployment readiness...\n');

const checks = {
  'package.json exists': fs.existsSync('package.json'),
  'tsconfig.json exists': fs.existsSync('tsconfig.json'),
  'prisma/schema.prisma exists': fs.existsSync('prisma/schema.prisma'),
  'src/index.ts exists': fs.existsSync('src/index.ts'),
  '.gitignore exists': fs.existsSync('.gitignore'),
  'render.yaml exists': fs.existsSync('render.yaml'),
};

let allPassed = true;

for (const [check, passed] of Object.entries(checks)) {
  console.log(`${passed ? '✅' : '❌'} ${check}`);
  if (!passed) allPassed = false;
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ All checks passed! Ready to deploy to Render.');
  console.log('\nNext steps:');
  console.log('1. Push to GitHub: git push origin main');
  console.log('2. Go to https://render.com/dashboard');
  console.log('3. Create new Blueprint and connect your repo');
  console.log('4. Add CLERK_SECRET_KEY environment variable');
  console.log('5. Deploy! 🚀');
} else {
  console.log('❌ Some checks failed. Fix the issues above.');
}

console.log('='.repeat(50) + '\n');
