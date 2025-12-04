# 📱 App Authentication Setup - Complete Guide

## ✅ Backend Ready!

Backend mein ye endpoints add ho gaye hain:

### 1. `/auth/verify-email` - Email Verification (After Clerk Login)
```javascript
POST https://pairly-60qj.onrender.com/auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com"
}

// Response (Success):
{
  "verified": true,
  "userId": "clxxx...",
  "referralCode": "clyyy...",
  "isPremium": false,
  "referralCount": 0
}

// Response (Not in waitlist):
{
  "verified": false,
  "message": "Email not in waitlist. Please join at pairly-iota.vercel.app"
}
```

### 2. `/auth/count` - Get Referral Count
```javascript
GET https://pairly-60qj.onrender.com/auth/count?code=YOUR_REFERRAL_CODE

// Response:
{
  "count": 2,
  "isPremium": false
}
```

### 3. `/invites/waitlist` - Website Signup
```javascript
POST https://pairly-60qj.onrender.com/invites/waitlist
Content-Type: application/json

{
  "email": "newuser@example.com",
  "name": "New User",
  "source": "website",
  "referralCode": "clyyy..." // Optional
}

// Response:
{
  "success": true,
  "message": "Successfully added to waitlist!",
  "inviteCode": "clzzz..."
}
```

---

## 🧪 Testing

### Option 1: Using Node.js Script
```bash
# Complete flow test
node test-app-auth.js

# Test specific endpoint
node test-app-auth.js verify test@example.com
node test-app-auth.js count YOUR_REFERRAL_CODE
node test-app-auth.js signup newuser@example.com "New User"
```

### Option 2: Using HTTP File (VS Code REST Client)
Open `test-app-auth.http` in VS Code and click "Send Request"

---

## 📱 App Integration

### Step 1: Install Dependencies
```bash
npm install @react-native-async-storage/async-storage
```

### Step 2: Add Verification Logic (After Clerk Login)
```javascript
import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

function App() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      checkWaitlistStatus(user.primaryEmailAddress.emailAddress);
    }
  }, [isSignedIn, user]);

  const checkWaitlistStatus = async (email) => {
    try {
      const response = await fetch('https://pairly-60qj.onrender.com/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.verified) {
        // ✅ User in waitlist - Save data
        await AsyncStorage.setItem('userEmail', email);
        await AsyncStorage.setItem('referralCode', data.referralCode);
        await AsyncStorage.setItem('isPremium', data.isPremium.toString());
        
        console.log('✅ User verified, referral code:', data.referralCode);
        // Navigate to main app
      } else {
        // ❌ Not in waitlist
        Alert.alert(
          'Join Waitlist First',
          'Visit pairly-iota.vercel.app to join waitlist',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  return (/* Your app UI */);
}
```

### Step 3: Create Referral Screen
```javascript
// screens/ReferralScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ReferralScreen() {
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    const code = await AsyncStorage.getItem('referralCode');
    const premium = await AsyncStorage.getItem('isPremium');
    setReferralCode(code);
    setIsPremium(premium === 'true');
    
    // Fetch latest count
    fetchReferralCount(code);
  };

  const fetchReferralCount = async (code) => {
    try {
      const response = await fetch(
        `https://pairly-60qj.onrender.com/auth/count?code=${code}`
      );
      const data = await response.json();
      setReferralCount(data.count || 0);
      setIsPremium(data.isPremium);
    } catch (error) {
      console.error('Failed to fetch count:', error);
    }
  };

  const shareReferralLink = async () => {
    const link = `https://pairly-iota.vercel.app?ref=${referralCode}`;
    try {
      await Share.share({
        message: `🎉 Join me on Pairly! ${link}`,
        title: 'Join Pairly'
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <View style={{ padding: 20, backgroundColor: '#000', flex: 1 }}>
      <Text style={{ fontSize: 28, color: '#fff', fontWeight: 'bold' }}>
        Invite Friends 🎁
      </Text>
      
      <View style={{ backgroundColor: '#1a1a1a', padding: 20, borderRadius: 10, marginTop: 20 }}>
        <Text style={{ color: '#888' }}>Your Referral Code:</Text>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#667eea' }}>
          {referralCode}
        </Text>
      </View>

      <View style={{ backgroundColor: '#1a1a1a', padding: 20, borderRadius: 10, marginTop: 20 }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>
          📊 Referrals: {referralCount}/3
        </Text>
        <Text style={{ color: '#fff', fontSize: 18, marginTop: 10 }}>
          Status: {isPremium ? '⭐ Premium' : '🆓 Free'}
        </Text>
      </View>

      <TouchableOpacity 
        onPress={shareReferralLink}
        style={{ 
          backgroundColor: '#667eea', 
          padding: 15, 
          borderRadius: 10, 
          alignItems: 'center',
          marginTop: 20
        }}
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
          📱 Share Referral Link
        </Text>
      </TouchableOpacity>

      <Text style={{ color: '#666', marginTop: 20, textAlign: 'center' }}>
        {isPremium 
          ? 'You have Premium! 🎉' 
          : `Invite ${3 - referralCount} more friends to unlock Premium!`
        }
      </Text>
    </View>
  );
}
```

---

## 🔄 Complete Flow

1. **Website**: User enters email → Added to waitlist → Gets referral code
2. **App**: User logs in with Clerk → Email verified → Referral code saved
3. **Referral**: User shares link → Friend joins → Count increases
4. **Premium**: After 3 referrals → Premium unlocked! 🎉

---

## 🚀 Deployment

Backend is already deployed at: `https://pairly-60qj.onrender.com`

To redeploy after changes:
```bash
npm run build
git add .
git commit -m "Add app auth endpoints"
git push
```

Render will auto-deploy.

---

## 📊 Database Schema

```prisma
model InvitedUser {
  id            String    @id @default(cuid())
  email         String    @unique
  inviteCode    String    @unique @default(cuid())
  referralCount Int       @default(0)
  isPremium     Boolean   @default(false)
  clerkId       String?   @unique
  status        String    @default("pending")
  invitedAt     DateTime  @default(now())
}
```

---

## ✅ Checklist

- [x] Backend endpoints created
- [x] `/auth/verify-email` working
- [x] `/auth/count` working
- [x] `/invites/waitlist` working
- [x] Test scripts created
- [ ] App integration (your side)
- [ ] Referral screen (your side)
- [ ] Testing with real users

---

## 🆘 Troubleshooting

### Email not verified?
- Check if email exists in database
- Run: `node test-app-auth.js verify user@example.com`

### Referral count not increasing?
- Check if referral code is correct
- Run: `node test-app-auth.js count YOUR_CODE`

### Backend not responding?
- Check if backend is awake: `https://pairly-60qj.onrender.com/health`
- Render free tier sleeps after 15 mins of inactivity

---

## 📞 Need Help?

Test karo aur batao agar koi issue hai! 🚀
