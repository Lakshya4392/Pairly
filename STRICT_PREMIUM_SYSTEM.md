# 🔒 Strict Premium System - Complete Workflow

## 🎯 **Premium Rules (Strict)**

### **Waitlist Users:**
- ✅ Get **30 days premium** (not permanent)
- ✅ Must use **same email** as waitlist signup
- ✅ After 30 days → Premium expires
- ✅ To extend → Refer 3 friends = +3 months

### **Referral System:**
- 1 referral = +1 week premium
- 3 referrals = +1 months premium
- 5 referrals = +3 months premium

### **Email Verification (Strict):**
- Clerk email **MUST MATCH** waitlist email
- Different email = No premium
- Case-insensitive check

---

## 🗄️ **Database Schema Updates**

```prisma
// backend/prisma/schema.prisma

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
  source        String?
  name          String?
  
  // Reward tracking
  rewardGranted Boolean   @default(false)
  rewardType    String?
  
  // App integration (STRICT)
  clerkId       String?   @unique
  referralCount Int       @default(0)
  
  // Premium tracking (NEW - STRICT)
  premiumGrantedAt  DateTime? // When premium was first granted
  premiumExpiresAt  DateTime? // When premium expires
  premiumDays       Int       @default(30) // Total premium days earned
  
  @@index([email])
  @@index([phoneNumber])
  @@index([invitedBy])
  @@index([status])
  @@index([clerkId])
}

model AppConfig {
  id              String   @id @default(cuid())
  launchDate      DateTime // Public launch date
  isWaitlistOnly  Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 🔧 **Backend Implementation**

### **1. Strict Email Verification Endpoint**

```javascript
// backend/src/routes/inviteRoutes.ts

router.post('/verify-email', async (req, res) => {
  try {
    const { email, clerkId } = req.body;

    if (!email) {
      return res.status(400).json({
        verified: false,
        message: 'Email is required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check app config for launch date
    const config = await prisma.appConfig.findFirst();
    const now = new Date();
    const isWaitlistPeriod = config && now < new Date(config.launchDate);

    // Find user in waitlist (STRICT EMAIL MATCH)
    const invitedUser = await prisma.invitedUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!invitedUser) {
      // Not in waitlist
      if (isWaitlistPeriod) {
        // Waitlist period - MUST be in waitlist
        const daysUntilLaunch = Math.ceil(
          (new Date(config.launchDate) - now) / (1000 * 60 * 60 * 24)
        );
        
        return res.status(403).json({
          verified: false,
          isWaitlistPeriod: true,
          daysUntilLaunch: daysUntilLaunch,
          message: `Pairly is in exclusive waitlist mode. Join waitlist to get 30 days free premium!`,
          launchDate: config.launchDate
        });
      } else {
        // Public launch - allow but NO premium
        return res.json({
          verified: true,
          isWaitlistPeriod: false,
          isPremium: false,
          premiumDaysRemaining: 0,
          referralCode: null,
          referralCount: 0,
          message: 'Welcome to Pairly! Refer friends to unlock premium.'
        });
      }
    }

    // User found in waitlist - Link Clerk ID if provided
    if (clerkId && !invitedUser.clerkId) {
      await prisma.invitedUser.update({
        where: { id: invitedUser.id },
        data: { 
          clerkId,
          joinedAt: new Date(),
          status: 'joined'
        }
      });
    }

    // Check if Clerk ID matches (STRICT)
    if (invitedUser.clerkId && clerkId && invitedUser.clerkId !== clerkId) {
      return res.status(403).json({
        verified: false,
        message: 'This email is already linked to another account.',
      });
    }

    // Calculate premium status (STRICT)
    const premiumStatus = calculatePremiumStatus(invitedUser);

    // Update premium expiry if first time
    if (!invitedUser.premiumGrantedAt) {
      const premiumExpiry = new Date();
      premiumExpiry.setDate(premiumExpiry.getDate() + 30); // 30 days

      await prisma.invitedUser.update({
        where: { id: invitedUser.id },
        data: {
          premiumGrantedAt: new Date(),
          premiumExpiresAt: premiumExpiry,
          premiumDays: 30
        }
      });

      premiumStatus.isPremium = true;
      premiumStatus.premiumExpiresAt = premiumExpiry;
      premiumStatus.daysRemaining = 30;
    }

    return res.json({
      verified: true,
      userId: invitedUser.id,
      referralCode: invitedUser.inviteCode,
      isPremium: premiumStatus.isPremium,
      premiumExpiresAt: premiumStatus.premiumExpiresAt,
      premiumDaysRemaining: premiumStatus.daysRemaining,
      referralCount: invitedUser.referralCount,
      isWaitlistUser: true,
      message: premiumStatus.isPremium 
        ? `Welcome! You have ${premiumStatus.daysRemaining} days of premium.`
        : 'Your premium has expired. Refer 3 friends to get 3 months free!'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      verified: false,
      error: 'Internal server error',
    });
  }
});

// Helper function to calculate premium status
function calculatePremiumStatus(invitedUser) {
  const now = new Date();
  
  if (!invitedUser.premiumExpiresAt) {
    return {
      isPremium: false,
      premiumExpiresAt: null,
      daysRemaining: 0
    };
  }

  const expiryDate = new Date(invitedUser.premiumExpiresAt);
  
  if (now < expiryDate) {
    // Premium active
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    return {
      isPremium: true,
      premiumExpiresAt: expiryDate,
      daysRemaining: daysRemaining
    };
  } else {
    // Premium expired
    return {
      isPremium: false,
      premiumExpiresAt: expiryDate,
      daysRemaining: 0
    };
  }
}
```

---

### **2. Referral Reward System (Strict)**

```javascript
// backend/src/routes/inviteRoutes.ts

// Update waitlist endpoint to handle referrals
router.post('/waitlist', async (req, res) => {
  try {
    const { email, name, source, referralCode } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if already in waitlist
    const existing = await prisma.invitedUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'You are already on the waitlist!',
        alreadyExists: true,
        inviteCode: existing.inviteCode
      });
    }

    // Find referrer if code provided
    let referrerId = null;
    if (referralCode) {
      const referrer = await prisma.invitedUser.findUnique({
        where: { inviteCode: referralCode },
      });

      if (referrer) {
        referrerId = referrer.id;
        console.log(`🔗 Referral: ${normalizedEmail} referred by ${referrer.email}`);

        // Increment referrer count
        const updatedReferrer = await prisma.invitedUser.update({
          where: { id: referrer.id },
          data: {
            referralCount: { increment: 1 }
          }
        });

        // Calculate premium bonus based on referral count
        await updatePremiumForReferrals(updatedReferrer);

        // Send success email (non-blocking)
        try {
          await sendReferralSuccessEmail(referrer.email, name || 'A new friend');
        } catch (emailError) {
          console.warn('⚠️ Referral email failed:', emailError);
        }
      }
    }

    // Add to waitlist
    const invite = await prisma.invitedUser.create({
      data: {
        email: normalizedEmail,
        status: 'pending',
        invitedBy: referrerId,
        source: source || 'website',
        name: name || null,
      },
    });

    console.log(`📝 Waitlist signup: ${normalizedEmail}`);

    // Send welcome email (non-blocking)
    try {
      const apkUrl = process.env.APK_DOWNLOAD_URL || '#';
      await sendWaitlistEmail(normalizedEmail, apkUrl);
    } catch (emailError) {
      console.warn('⚠️ Welcome email failed:', emailError);
    }

    return res.json({
      success: true,
      message: 'Successfully added to waitlist!',
      inviteCode: invite.inviteCode,
    });

  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return res.status(500).json({
      error: 'Failed to add to waitlist',
      success: false,
    });
  }
});

// Helper function to update premium based on referrals
async function updatePremiumForReferrals(user) {
  const referralCount = user.referralCount;
  let bonusDays = 0;

  // Calculate bonus days
  if (referralCount >= 5) {
    bonusDays = 180; // 6 months for 5+ referrals
  } else if (referralCount >= 3) {
    bonusDays = 90; // 3 months for 3+ referrals
  } else if (referralCount >= 1) {
    bonusDays = 7 * referralCount; // 1 week per referral
  }

  if (bonusDays > 0) {
    const now = new Date();
    let newExpiry;

    if (user.premiumExpiresAt && new Date(user.premiumExpiresAt) > now) {
      // Extend existing premium
      newExpiry = new Date(user.premiumExpiresAt);
      newExpiry.setDate(newExpiry.getDate() + bonusDays);
    } else {
      // Grant new premium
      newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + bonusDays);
    }

    await prisma.invitedUser.update({
      where: { id: user.id },
      data: {
        premiumExpiresAt: newExpiry,
        premiumDays: { increment: bonusDays }
      }
    });

    console.log(`✨ Premium extended for ${user.email}: +${bonusDays} days`);
  }
}
```

---

### **3. Get Premium Status Endpoint**

```javascript
// backend/src/routes/inviteRoutes.ts

router.get('/premium-status', async (req, res) => {
  try {
    const { email, clerkId } = req.query;

    if (!email && !clerkId) {
      return res.status(400).json({ error: 'Email or Clerk ID required' });
    }

    let user;
    if (clerkId) {
      user = await prisma.invitedUser.findUnique({
        where: { clerkId: clerkId as string }
      });
    } else {
      user = await prisma.invitedUser.findUnique({
        where: { email: (email as string).toLowerCase().trim() }
      });
    }

    if (!user) {
      return res.json({
        isPremium: false,
        daysRemaining: 0,
        message: 'User not found in waitlist'
      });
    }

    const premiumStatus = calculatePremiumStatus(user);

    return res.json({
      isPremium: premiumStatus.isPremium,
      premiumExpiresAt: premiumStatus.premiumExpiresAt,
      daysRemaining: premiumStatus.daysRemaining,
      referralCount: user.referralCount,
      totalPremiumDays: user.premiumDays || 30
    });

  } catch (error) {
    console.error('Premium status error:', error);
    return res.status(500).json({ error: 'Failed to get premium status' });
  }
});
```

---

## 📱 **App Implementation (Strict)**

### **Complete App.js with Strict Checks**

```javascript
import React, { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://pairly-60qj.onrender.com';

export default function App() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [appState, setAppState] = useState('loading');
  const [userInfo, setUserInfo] = useState(null);
  const [appConfig, setAppConfig] = useState(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      checkUserAccess();
    }
  }, [isLoaded, isSignedIn, user]);

  const checkUserAccess = async () => {
    try {
      // Get app config
      const configResponse = await fetch(`${API_URL}/config/config`);
      const config = await configResponse.json();
      setAppConfig(config);

      // STRICT: Get Clerk email
      const clerkEmail = user.primaryEmailAddress.emailAddress;
      const clerkId = user.id;

      console.log('🔍 Checking access for:', clerkEmail);

      // Verify with backend (STRICT)
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: clerkEmail,
          clerkId: clerkId 
        })
      });

      const data = await response.json();

      if (response.status === 403) {
        // Not allowed
        if (data.isWaitlistPeriod) {
          // Show waitlist countdown
          setAppState('waitlist-countdown');
        } else {
          // Email mismatch or other issue
          Alert.alert('Access Denied', data.message);
          setAppState('error');
        }
        return;
      }

      if (data.verified) {
        // Setup user with STRICT premium check
        await setupUser(clerkEmail, clerkId, data);
        setAppState('main');

        // Show premium status
        if (data.isPremium) {
          showPremiumStatus(data.premiumDaysRemaining);
        } else {
          showPremiumExpired(data.referralCount);
        }
      } else {
        setAppState('waitlist');
      }

    } catch (error) {
      console.error('❌ Access check failed:', error);
      setAppState('error');
    }
  };

  const setupUser = async (email, clerkId, data) => {
    const userData = {
      email,
      clerkId,
      referralCode: data.referralCode,
      isPremium: data.isPremium,
      premiumExpiresAt: data.premiumExpiresAt,
      premiumDaysRemaining: data.premiumDaysRemaining || 0,
      referralCount: data.referralCount || 0,
      isWaitlistUser: data.isWaitlistUser || false,
    };

    // Save to AsyncStorage
    await AsyncStorage.setItem('userEmail', email);
    await AsyncStorage.setItem('clerkId', clerkId);
    await AsyncStorage.setItem('referralCode', data.referralCode || '');
    await AsyncStorage.setItem('isPremium', data.isPremium ? 'true' : 'false');
    await AsyncStorage.setItem('premiumExpiresAt', data.premiumExpiresAt || '');
    await AsyncStorage.setItem('premiumDaysRemaining', data.premiumDaysRemaining?.toString() || '0');
    await AsyncStorage.setItem('referralCount', data.referralCount?.toString() || '0');

    setUserInfo(userData);
    console.log('✅ User setup:', userData);
  };

  const showPremiumStatus = (daysRemaining) => {
    Alert.alert(
      '⭐ Premium Active',
      `You have ${daysRemaining} days of premium remaining!\n\n🎁 Refer 3 friends to get 3 more months!`,
      [{ text: 'Got it!' }]
    );
  };

  const showPremiumExpired = (referralCount) => {
    const needed = 3 - referralCount;
    Alert.alert(
      '⏰ Premium Expired',
      `Your 30-day premium has expired.\n\n🎁 Refer ${needed} more friend${needed > 1 ? 's' : ''} to unlock 3 months of premium!`,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Invite Friends', onPress: () => navigateToReferral() }
      ]
    );
  };

  // ... rest of component
}
```

---

### **Premium Check Utility (STRICT)**

```javascript
// utils/premiumUtils.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_URL = 'https://pairly-60qj.onrender.com';

export const checkPremiumStatus = async () => {
  try {
    const email = await AsyncStorage.getItem('userEmail');
    const clerkId = await AsyncStorage.getItem('clerkId');

    if (!email || !clerkId) {
      return { isPremium: false, daysRemaining: 0 };
    }

    // Check with backend (STRICT - always verify)
    const response = await fetch(
      `${API_URL}/invites/premium-status?email=${email}&clerkId=${clerkId}`
    );

    const data = await response.json();

    // Update local storage
    await AsyncStorage.setItem('isPremium', data.isPremium ? 'true' : 'false');
    await AsyncStorage.setItem('premiumDaysRemaining', data.daysRemaining?.toString() || '0');

    return {
      isPremium: data.isPremium,
      daysRemaining: data.daysRemaining || 0,
      referralCount: data.referralCount || 0
    };

  } catch (error) {
    console.error('Premium check error:', error);
    
    // Fallback to local storage
    const isPremium = await AsyncStorage.getItem('isPremium');
    return { isPremium: isPremium === 'true', daysRemaining: 0 };
  }
};

export const requiresPremium = async (featureName, navigation) => {
  const { isPremium, daysRemaining, referralCount } = await checkPremiumStatus();
  
  if (!isPremium) {
    const needed = 3 - (referralCount || 0);
    
    Alert.alert(
      '⭐ Premium Feature',
      `${featureName} requires premium access.\n\n🎁 Refer ${needed} friend${needed > 1 ? 's' : ''} to unlock 3 months free!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Invite Friends', onPress: () => navigation?.navigate('Referral') }
      ]
    );
    return false;
  }
  
  // Show days remaining if less than 7
  if (daysRemaining < 7) {
    Alert.alert(
      '⏰ Premium Expiring Soon',
      `You have ${daysRemaining} days of premium left. Refer friends to extend!`,
      [{ text: 'OK' }]
    );
  }
  
  return true;
};
```

---

## 🎯 **Complete Flow (STRICT)**

### **Scenario 1: Waitlist User (Correct Email)**
```
1. User joins waitlist: user@example.com
2. User downloads app
3. User signs in with Clerk: user@example.com ✅
4. Backend checks: Email matches ✅
5. Grant 30 days premium ✅
6. After 30 days: Premium expires ⏰
7. User refers 3 friends → +3 months premium ✅
```

### **Scenario 2: Waitlist User (Wrong Email)**
```
1. User joins waitlist: user@example.com
2. User downloads app
3. User signs in with Clerk: different@example.com ❌
4. Backend checks: Email doesn't match ❌
5. Access denied - Must use waitlist email ❌
```

### **Scenario 3: Non-Waitlist User (During Waitlist Period)**
```
1. User downloads app
2. User signs in with Clerk
3. Backend checks: Not in waitlist ❌
4. Show countdown screen ⏰
5. Option to join waitlist ✅
```

### **Scenario 4: Non-Waitlist User (After Public Launch)**
```
1. User downloads app
2. User signs in with Clerk
3. Backend checks: Public launch ✅
4. Allow access but NO premium ❌
5. Can refer friends to get premium ✅
```

---

## 📊 **Premium Calculation (STRICT)**

```javascript
// Referral Rewards
1 referral  = +7 days premium
2 referrals = +14 days premium
3 referrals = +90 days premium (3 months)
5 referrals = +180 days premium (6 months)

// Initial Premium
Waitlist user = 30 days premium (one-time)

// Total Example
User joins waitlist: 30 days
Refers 1 friend: +7 days = 37 days total
Refers 2 more (3 total): +90 days = 127 days total
```

---

## 🔒 **Security Checks (STRICT)**

1. ✅ Email must match exactly (case-insensitive)
2. ✅ Clerk ID linked to email (one-to-one)
3. ✅ Premium expiry checked on every app launch
4. ✅ Backend verification required for premium features
5. ✅ No local-only premium checks

---

## 🧪 **Testing Commands**

```bash
# Test email verification (correct email)
curl -X POST https://pairly-60qj.onrender.com/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","clerkId":"user_123"}'

# Test premium status
curl "https://pairly-60qj.onrender.com/invites/premium-status?email=user@example.com"

# Test waitlist signup with referral
curl -X POST https://pairly-60qj.onrender.com/invites/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"friend@example.com","referralCode":"clxxx..."}'
```

---

## ✅ **Implementation Checklist**

### Backend:
- [ ] Update Prisma schema with premium fields
- [ ] Run `npx prisma db push`
- [ ] Update verify-email endpoint (strict checks)
- [ ] Add premium-status endpoint
- [ ] Update waitlist endpoint (referral rewards)
- [ ] Deploy to production

### App:
- [ ] Update App.js with strict email checks
- [ ] Add premium status checks
- [ ] Update premium utility functions
- [ ] Add premium expiry alerts
- [ ] Test complete flow

**Strict premium system ready!** 🔒

Ye system implement karo - perfect tight logic hai! 💪