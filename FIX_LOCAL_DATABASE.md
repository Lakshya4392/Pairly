# 🔧 Fix Local Database - Complete Setup

## 🚨 **Error Analysis**
```
relation "waitlist" does not exist
at D:/projects/pairly (2)/local-api-server.js
```

**Problem**: Local database mein `waitlist` table missing hai ya wrong schema use kar rahe ho.

---

## ✅ **Solution 1: Use Correct Database Schema**

### Step 1: Check Current Directory
```bash
cd "D:/projects/pairly (2)"
ls -la
```

### Step 2: Copy Correct Prisma Schema
Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Main User Model
model User {
  id            String    @id @default(cuid())
  clerkId       String    @unique
  email         String    @unique
  displayName   String
  firstName     String?
  lastName      String?
  photoUrl      String?
  phoneNumber   String?
  referralCode  String?   @unique @default(cuid())
  
  isPremium          Boolean   @default(false)
  premiumPlan        String?
  premiumSince       DateTime?
  premiumExpiry      DateTime?
  revenueCatId       String?
  trialEndsAt        DateTime?
  
  dailyMomentsCount  Int       @default(0)
  lastMomentDate     DateTime?
  
  notificationsEnabled Boolean @default(true)
  soundEnabled         Boolean @default(true)
  vibrationEnabled     Boolean @default(true)
  
  fcmToken      String?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastActiveAt  DateTime  @default(now())
  
  pairAsUser1      Pair?            @relation("User1")
  pairAsUser2      Pair?            @relation("User2")
  uploadedMoments  Moment[]         @relation("Uploader")
  sharedNotes      SharedNote[]     @relation("NoteSender")
  timeLockMessages TimeLockMessage[] @relation("MessageSender")
  secretVault      SecretVaultItem[] @relation("VaultOwner")
  dualMomentsAsUser    DualMoment[] @relation("DualMomentUser")
  dualMomentsAsPartner DualMoment[] @relation("DualMomentPartner")
  
  @@index([clerkId])
  @@index([email])
}

model Pair {
  id            String    @id @default(cuid())
  user1Id       String    @unique
  user2Id       String    @unique
  inviteCode    String?   @unique
  codeExpiresAt DateTime?
  pairedAt      DateTime  @default(now())
  
  user1            User              @relation("User1", fields: [user1Id], references: [id])
  user2            User              @relation("User2", fields: [user2Id], references: [id])
  moments          Moment[]
  sharedNotes      SharedNote[]
  timeLockMessages TimeLockMessage[]
  secretVault      SecretVaultItem[]
  
  @@index([inviteCode])
}

model Moment {
  id            String    @id @default(cuid())
  pairId        String
  uploaderId    String
  photoData     Bytes
  note          String?
  uploadedAt    DateTime  @default(now())
  
  isScheduled   Boolean   @default(false)
  scheduledFor  DateTime?
  deliveredAt   DateTime?
  expiresAt     DateTime?
  
  pair          Pair      @relation(fields: [pairId], references: [id], onDelete: Cascade)
  uploader      User      @relation("Uploader", fields: [uploaderId], references: [id])
  
  @@index([pairId, uploadedAt])
  @@index([isScheduled, scheduledFor])
}

model SharedNote {
  id          String    @id @default(cuid())
  senderId    String
  pairId      String
  content     String
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())
  
  sender      User      @relation("NoteSender", fields: [senderId], references: [id])
  pair        Pair      @relation(fields: [pairId], references: [id], onDelete: Cascade)
  
  @@index([pairId, createdAt])
  @@index([expiresAt])
}

model TimeLockMessage {
  id            String    @id @default(cuid())
  senderId      String
  pairId        String
  content       String
  photoData     Bytes?
  unlockDate    DateTime
  isDelivered   Boolean   @default(false)
  deliveredAt   DateTime?
  createdAt     DateTime  @default(now())
  
  sender        User      @relation("MessageSender", fields: [senderId], references: [id])
  pair          Pair      @relation(fields: [pairId], references: [id], onDelete: Cascade)
  
  @@index([unlockDate, isDelivered])
  @@index([pairId])
}

model SecretVaultItem {
  id            String    @id @default(cuid())
  userId        String
  pairId        String
  type          String
  encryptedData Bytes
  thumbnail     Bytes?
  title         String?
  createdAt     DateTime  @default(now())
  
  owner         User      @relation("VaultOwner", fields: [userId], references: [id])
  pair          Pair      @relation(fields: [pairId], references: [id], onDelete: Cascade)
  
  @@index([userId, pairId])
  @@index([createdAt])
}

model DualMoment {
  id              String    @id @default(cuid())
  userId          String
  partnerId       String
  frontPhotoUrl   String?
  backPhotoUrl    String?
  note            String?
  status          String    @default("pending")
  createdAt       DateTime  @default(now())
  completedAt     DateTime?
  
  user            User      @relation("DualMomentUser", fields: [userId], references: [id])
  partner         User      @relation("DualMomentPartner", fields: [partnerId], references: [id])
  
  @@index([userId, status])
  @@index([partnerId, status])
  @@index([createdAt])
}

// ✅ MAIN TABLE FOR WEBSITE EMAILS
model InvitedUser {
  id            String    @id @default(cuid())
  email         String    @unique
  phoneNumber   String?   @unique
  invitedBy     String?
  status        String    @default("pending")
  inviteCode    String    @unique @default(cuid())
  invitedAt     DateTime  @default(now())
  joinedAt      DateTime?
  expiresAt     DateTime?
  
  // Metadata
  source        String?   // 'website', 'app', 'referral'
  name          String?   // Optional name
  
  // Reward tracking
  rewardGranted Boolean   @default(false)
  rewardType    String?
  
  // App integration
  clerkId       String?   @unique
  referralCount Int       @default(0)
  isPremium     Boolean   @default(false)
  
  @@index([email])
  @@index([phoneNumber])
  @@index([invitedBy])
  @@index([status])
  @@index([clerkId])
}
```

### Step 3: Create .env File
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pairly?schema=public"

# Or use Neon (same as production)
DATABASE_URL="postgresql://neondb_owner:your-password@ep-dark-glitter-ah4oloa6-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Clerk
CLERK_SECRET_KEY=your_clerk_secret_key

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h
```

### Step 4: Install Dependencies
```bash
npm install @prisma/client prisma
npm install express cors dotenv
```

### Step 5: Generate & Deploy Database
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Or create migration
npx prisma migrate dev --name init
```

---

## ✅ **Solution 2: Fix Current Code**

Agar current code mein `waitlist` table use kar rahe ho, toh ye change karo:

### Current Code (Wrong):
```javascript
// ❌ Wrong table name
const result = await db.query('SELECT * FROM waitlist WHERE email = ?', [email]);
```

### Fixed Code:
```javascript
// ✅ Correct table name
const result = await db.query('SELECT * FROM "InvitedUser" WHERE email = ?', [email]);

// Or with Prisma:
const user = await prisma.invitedUser.findUnique({
  where: { email: email }
});
```

---

## ✅ **Solution 3: Quick Database Setup Script**

Create `setup-database.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupDatabase() {
  console.log('🔧 Setting up database...');
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Test InvitedUser table
    const count = await prisma.invitedUser.count();
    console.log('✅ InvitedUser table exists, count:', count);
    
    // Create test record
    const testUser = await prisma.invitedUser.create({
      data: {
        email: `test${Date.now()}@example.com`,
        source: 'setup-test',
        status: 'pending'
      }
    });
    
    console.log('✅ Test record created:', testUser.email);
    
    // Delete test record
    await prisma.invitedUser.delete({
      where: { id: testUser.id }
    });
    
    console.log('✅ Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    
    if (error.code === 'P2021') {
      console.log('💡 Run: npx prisma db push');
    }
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();
```

Run: `node setup-database.js`

---

## 🎯 **Quick Fix Commands**

```bash
# Go to your project
cd "D:/projects/pairly (2)"

# Install Prisma
npm install @prisma/client prisma

# Copy schema from working project
cp "../Pairly/backend/prisma/schema.prisma" "./prisma/schema.prisma"

# Generate client
npx prisma generate

# Push to database
npx prisma db push

# Test
node setup-database.js
```

---

## 📊 **Verify Database**

```bash
# Open Prisma Studio
npx prisma studio

# Check tables exist:
# - InvitedUser ✅
# - User ✅
# - Pair ✅
# - Moment ✅
```

---

## 🚨 **If Still Issues**

1. **Check DATABASE_URL** in `.env`
2. **Use same database** as production
3. **Copy complete backend** from working project
4. **Use production API** instead of local

**Production API working hai**: `https://pairly-60qj.onrender.com/invites/waitlist`

Kya local setup karna hai ya production API use karna hai? 🤔