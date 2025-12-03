import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function addToWhitelist() {
  console.log('\n🔐 Pairly Whitelist Manager\n');

  const email = await question('Enter email to whitelist: ');
  
  if (!email || !email.includes('@')) {
    console.log('❌ Invalid email');
    rl.close();
    return;
  }

  try {
    // Check if already exists
    const existing = await prisma.invitedUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      console.log(`⚠️  Email already in whitelist (Status: ${existing.status})`);
      const update = await question('Update status to pending? (y/n): ');
      
      if (update.toLowerCase() === 'y') {
        await prisma.invitedUser.update({
          where: { email: email.toLowerCase() },
          data: { status: 'pending' },
        });
        console.log('✅ Status updated to pending');
      }
    } else {
      // Add new
      const invite = await prisma.invitedUser.create({
        data: {
          email: email.toLowerCase(),
          status: 'pending',
        },
      });
      
      console.log('✅ Email added to whitelist!');
      console.log(`📋 Invite Code: ${invite.inviteCode}`);
    }

    // Show stats
    const total = await prisma.invitedUser.count();
    const joined = await prisma.invitedUser.count({ where: { status: 'joined' } });
    const pending = await prisma.invitedUser.count({ where: { status: 'pending' } });

    console.log('\n📊 Whitelist Stats:');
    console.log(`   Total: ${total}`);
    console.log(`   Joined: ${joined}`);
    console.log(`   Pending: ${pending}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

addToWhitelist();
