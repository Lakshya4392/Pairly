# 🚀 30-Day Exclusive Waitlist System

## 🎯 **Goal**
- **First 30 days**: Only waitlist users can use app
- **After 30 days**: Public launch - anyone can use
- **Waitlist users**: Get permanent premium benefits

---

## 📅 **Timeline Strategy**

```
Day 0-30: EXCLUSIVE WAITLIST ONLY
├─ Only verified emails can access
├─ Waitlist users get premium
└─ Others see "Join Waitlist" screen

Day 31+: PUBLIC LAUNCH
├─ Anyone can use app
├─ Waitlist users keep premium
└─ New users get free trial
```

---

## 🔧 **Backend Implementation**

### **Step 1: Add Launch Date to Schema**

```prisma
// backend/prisma/schema.prisma

// Add this model
model AppConfig {
  id              String   @id @default(cuid())
  launchDate      DateTime // Public launch date (30 days from now)
  isWaitlistOnly  Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### **Step 2: Create Config Endpoint**

```javascript
// backend/src/routes/configRoutes.ts
import express from 'express';
import { prisma } from '../index';

const router = express.Router();

// Get app configuration
router.get('/config', async (req, res) => {
  try {
    // Get or create config
    let config = await prisma.appConfig.findFirst();
    
    if (!config) {
      // Create initial config with 30-day waitlist period
      const launchDate = new Date();
      launchDate.setDate(launchDate.getDate() + 30); // 30 days from now
      
      config = await prisma.appConfig.create({
        data: {
          launchDate: launchDate,
          isWaitlistOnly: true
        }
      });
    }
    
    const now = new Date();
    const isWaitlistPeriod = now < new Date(config.launchDate);
    const daysUntilLaunch = isWaitlistPeriod 
      ? Math.ceil((new Date(config.launchDate) - now) / (1000 * 60 * 60 * 24))
      : 0;
    
    return res.json({
      isWaitlistOnly: isWaitlistPeriod,
      launchDate: config.launchDate,
      daysUntilLaunch: daysUntilLaunch,
      message: isWaitlistPeriod 
        ? `Exclusive waitlist period - ${daysUntilLaunch} days until public launch`
        : 'App is now publicly available'
    });
    
  } catch (error) {
    console.error('Config error:', error);
    return res.status(500).json({ error: 'Failed to get config' });
  }
});

// Admin: Update launch date
router.post('/config/launch-date', async (req, res) => {
  try {
    const { launchDate } = req.body;
    
    let config = await prisma.appConfig.findFirst();
    
    if (config) {
      config = await prisma.appConfig.update({
        where: { id: config.id },
        data: { launchDate: new Date(launchDate) }
      });
    } else {
      config = await prisma.appConfig.create({
        data: { launchDate: new Date(launchDate) }
      });
    }
    
    return res.json({
      success: true,
      launchDate: config.launchDate
    });
    
  } catch (error) {
    console.error('Update launch date error:', error);
    return res.status(500).json({ error: 'Failed to update' });
  }
});

// Admin: Force public launch
router.post('/config/launch-now', async (req, res) => {
  try {
    let config = await prisma.appConfig.findFirst();
    
    if (config) {
      config = await prisma.appConfig.update({
        where: { id: config.id },
        data: { 
          isWaitlistOnly: false,
          launchDate: new Date() // Set to now
        }
      });
    }
    
    return res.json({
      success: true,
      message: 'App is now publicly available'
    });
    
  } catch (error) {
    console.error('Launch now error:', error);
    return res.status(500).json({ error: 'Failed to launch' });
  }
});

export default router;
```

### **Step 3: Add Config Routes to Main Server**

```javascript
// backend/src/index.ts

import configRoutes from './routes/configRoutes';

// Add this line with other routes
app.use('/config', configRoutes);
```

### **Step 4: Enhanced Verify Email Endpoint**

```javascript
// backend/src/routes/inviteRoutes.ts

// Update verify-email endpoint
router.post('/verify-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        verified: false,
        message: 'Email is required',
      });
    }

    // Check app config
    const config = await prisma.appConfig.findFirst();
    const now = new Date();
    const isWaitlistPeriod = config && now < new Date(config.launchDate);

    // Find user in waitlist
    const invitedUser = await prisma.invitedUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!invitedUser) {
      if (isWaitlistPeriod) {
        // Waitlist period - must be in waitlist
        const daysUntilLaunch = Math.ceil((new Date(config.launchDate) - now) / (1000 * 60 * 60 * 24));
        
        return res.status(403).json({
          verified: false,
          isWaitlistPeriod: true,
          daysUntilLaunch: daysUntilLaunch,
          message: `Pairly is currently in exclusive waitlist mode. Join our waitlist to get early access + 1 month free premium!`,
          launchDate: config.launchDate
        });
      } else {
        // Public launch - allow anyone
        return res.json({
          verified: true,
          isWaitlistPeriod: false,
          isPremium: false, // New users don't get premium
          referralCode: null,
          referralCount: 0,
          message: 'Welcome to Pairly!'
        });
      }
    }

    // User in waitlist - always verified
    return res.json({
      verified: true,
      userId: invitedUser.id,
      referralCode: invitedUser.inviteCode,
      isPremium: true, // Waitlist users get permanent premium
      referralCount: invitedUser.referralCount,
      isWaitlistUser: true, // Mark as early adopter
      message: 'Welcome back, early adopter! 🎉'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      verified: false,
      error: 'Internal server error',
    });
  }
});
```

---

## 📱 **App Implementation**

### **Complete App.js with 30-Day Logic**

```javascript
import React, { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import WaitlistScreen from './screens/WaitlistScreen';
import MainAppContent from './screens/MainAppContent';
import LoadingScreen from './screens/LoadingScreen';
import CountdownScreen from './screens/CountdownScreen';

const API_URL = 'https://pairly-60qj.onrender.com';

export default function App() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [appState, setAppState] = useState('loading');
  const [userInfo, setUserInfo] = useState(null);
  const [appConfig, setAppConfig] = useState(null);

  useEffect(() => {
    if (isLoaded) {
      checkAppAccess();
    }
  }, [isLoaded, isSignedIn, user]);

  const checkAppAccess = async () => {
    try {
      // Step 1: Get app configuration
      const configResponse = await fetch(`${API_URL}/config/config`);
      const config = await configResponse.json();
      setAppConfig(config);

      console.log('📅 App Config:', config);

      if (!isSignedIn || !user) {
        // Not signed in
        if (config.isWaitlistOnly) {
          setAppState('waitlist-countdown');
        } else {
          setAppState('auth');
        }
        return;
      }

      // Step 2: Check user email
      const email = user.primaryEmailAddress.emailAddress;
      await checkUserStatus(email, config);

    } catch (error) {
      console.error('❌ App access check failed:', error);
      setAppState('error');
    }
  };

  const checkUserStatus = async (email, config) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.verified) {
        // User verified - setup and continue
        await setupUser(email, data);
        setAppState('main');
        
        // Show welcome message for waitlist users
        if (data.isWaitlistUser) {
          showWaitlistUserWelcome(config);
        }
        
      } else {
        // Not verified
        if (data.isWaitlistPeriod) {
          // Waitlist period - show countdown
          setAppState('waitlist-countdown');
        } else {
          // Public launch - allow access
          await setupPublicUser(email);
          setAppState('main');
        }
      }

    } catch (error) {
      console.error('❌ User status check failed:', error);
      setAppState('waitlist');
    }
  };

  const setupUser = async (email, data) => {
    const userData = {
      email,
      referralCode: data.referralCode,
      isPremium: data.isPremium || false,
      isWaitlistUser: data.isWaitlistUser || false,
      referralCount: data.referralCount || 0,
    };

    // Save to AsyncStorage
    await AsyncStorage.setItem('userVerified', 'true');
    await AsyncStorage.setItem('userEmail', email);
    await AsyncStorage.setItem('referralCode', data.referralCode || '');
    await AsyncStorage.setItem('isPremium', data.isPremium ? 'true' : 'false');
    await AsyncStorage.setItem('isWaitlistUser', data.isWaitlistUser ? 'true' : 'false');

    setUserInfo(userData);
    console.log('✅ User setup complete:', userData);
  };

  const setupPublicUser = async (email) => {
    const userData = {
      email,
      referralCode: null,
      isPremium: false,
      isWaitlistUser: false,
      referralCount: 0,
    };

    await AsyncStorage.setItem('userVerified', 'true');
    await AsyncStorage.setItem('userEmail', email);
    await AsyncStorage.setItem('isPremium', 'false');
    await AsyncStorage.setItem('isWaitlistUser', 'false');

    setUserInfo(userData);
  };

  const showWaitlistUserWelcome = (config) => {
    if (config.isWaitlistOnly) {
      Alert.alert(
        '🎉 Welcome, Early Adopter!',
        `You're part of our exclusive ${config.daysUntilLaunch}-day early access period!\n\n✨ As a thank you, you get PERMANENT PREMIUM ACCESS!\n\n🎁 Premium Features:\n• Unlimited moments\n• Time-lock messages\n• Secret vault\n• Dual camera\n• Priority support`,
        [{ text: 'Amazing!' }]
      );
    }
  };

  const handleWaitlistJoined = async (userData) => {
    await setupUser(userData.email, {
      referralCode: userData.referralCode,
      isPremium: true,
      isWaitlistUser: true,
      referralCount: 0
    });
    setAppState('main');
  };

  // Render based on state
  if (!isLoaded || appState === 'loading') {
    return <LoadingScreen />;
  }

  if (appState === 'waitlist-countdown') {
    return (
      <CountdownScreen 
        appConfig={appConfig}
        onJoinWaitlist={() => setAppState('waitlist')}
      />
    );
  }

  if (appState === 'waitlist') {
    return (
      <WaitlistScreen 
        userEmail={user?.primaryEmailAddress?.emailAddress}
        appConfig={appConfig}
        onJoined={handleWaitlistJoined}
      />
    );
  }

  if (appState === 'main') {
    return <MainAppContent userInfo={userInfo} appConfig={appConfig} />;
  }

  return <LoadingScreen />;
}
```

---

### **Countdown Screen (screens/CountdownScreen.js)**

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking
} from 'react-native';

export default function CountdownScreen({ appConfig, onJoinWaitlist }) {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const openWebsite = () => {
    Linking.openURL('https://pairly-iota.vercel.app');
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <Text style={styles.logo}>💕 Pairly</Text>
        <Text style={styles.tagline}>The most intimate space for couples</Text>

        <View style={styles.countdownCard}>
          <Text style={styles.countdownTitle}>🚀 Launching Soon</Text>
          <View style={styles.daysContainer}>
            <Text style={styles.daysNumber}>{appConfig?.daysUntilLaunch || 30}</Text>
            <Text style={styles.daysLabel}>Days Until Public Launch</Text>
          </View>
        </View>

        <View style={styles.exclusiveCard}>
          <Text style={styles.exclusiveTitle}>🎁 Exclusive Early Access</Text>
          <Text style={styles.exclusiveText}>
            We're currently in our exclusive waitlist period.{'\n\n'}
            Join our waitlist now to get:
          </Text>
          <View style={styles.benefitsList}>
            <Text style={styles.benefit}>✨ Immediate app access</Text>
            <Text style={styles.benefit}>⭐ PERMANENT premium features</Text>
            <Text style={styles.benefit}>🎯 Early adopter badge</Text>
            <Text style={styles.benefit}>💝 Priority support</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={onJoinWaitlist}
        >
          <Text style={styles.joinButtonText}>
            🚀 Join Waitlist & Get Early Access
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.websiteButton}
          onPress={openWebsite}
        >
          <Text style={styles.websiteButtonText}>
            🌐 Visit Website
          </Text>
        </TouchableOpacity>

        <Text style={styles.launchDate}>
          Public launch: {new Date(appConfig?.launchDate).toLocaleDateString()}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 40,
  },
  countdownCard: {
    backgroundColor: '#667eea',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  countdownTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  daysContainer: {
    alignItems: 'center',
  },
  daysNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
  },
  daysLabel: {
    fontSize: 16,
    color: '#fff',
    marginTop: 8,
  },
  exclusiveCard: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    borderRadius: 16,
    marginBottom: 30,
  },
  exclusiveTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  exclusiveText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  benefitsList: {
    gap: 12,
  },
  benefit: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  joinButton: {
    backgroundColor: '#667eea',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  websiteButton: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  websiteButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  launchDate: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
```

---

## 🎯 **Complete Flow**

### **During 30-Day Waitlist Period:**
```
User Opens App
    ↓
Check Launch Date
    ↓
Is Waitlist Period? YES
    ↓
Check Email in Waitlist
    ├─ YES → Grant Access + Permanent Premium
    └─ NO → Show Countdown Screen → Join Waitlist
```

### **After 30 Days (Public Launch):**
```
User Opens App
    ↓
Check Launch Date
    ↓
Is Waitlist Period? NO
    ↓
Allow Everyone
    ├─ Waitlist Users → Keep Permanent Premium
    └─ New Users → Free Trial (7 days)
```

---

## 🔧 **Backend Setup Commands**

```bash
# 1. Update schema
cd backend
npx prisma db push

# 2. Initialize config (run once)
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function init() {
  const launchDate = new Date();
  launchDate.setDate(launchDate.getDate() + 30);
  
  await prisma.appConfig.create({
    data: {
      launchDate: launchDate,
      isWaitlistOnly: true
    }
  });
  
  console.log('✅ Launch date set to:', launchDate);
}

init();
"

# 3. Build and deploy
npm run build
git add .
git commit -m "Add 30-day exclusive waitlist system"
git push
```

---

## 📊 **Admin Controls**

### **Check Current Status:**
```bash
curl https://pairly-60qj.onrender.com/config/config
```

### **Force Public Launch Early:**
```bash
curl -X POST https://pairly-60qj.onrender.com/config/launch-now
```

### **Extend Waitlist Period:**
```bash
curl -X POST https://pairly-60qj.onrender.com/config/launch-date \
  -H "Content-Type: application/json" \
  -d '{"launchDate":"2025-02-01T00:00:00Z"}'
```

---

## ✅ **Benefits Summary**

### **Waitlist Users (First 30 Days):**
- ✨ Exclusive early access
- ⭐ **PERMANENT premium** (forever free)
- 🎯 Early adopter badge
- 💝 Priority support

### **Public Users (After 30 Days):**
- 🆓 Free access to basic features
- 📅 7-day premium trial
- 💰 Can upgrade to premium

---

## 🎉 **Marketing Message**

**"Join our exclusive 30-day early access and get PERMANENT PREMIUM for FREE!"**

This creates urgency and rewards early adopters! 🚀

Ye system implement kar do - perfect waitlist flow ban jayega! 💪