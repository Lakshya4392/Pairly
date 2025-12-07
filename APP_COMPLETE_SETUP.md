# 📱 App Complete Setup - Marketing Ready

## 🎯 **Goal**
- Website se emails verify ho sakein
- 1 month free premium mile
- Referral system working
- Premium features unlock

---

## 📱 **App Implementation**

### **Step 1: Install Dependencies**
```bash
npm install @react-native-async-storage/async-storage
npm install react-native-share
```

### **Step 2: Main App Component (App.js/tsx)**

```javascript
import React, { useEffect, useState } from 'react';
import { Alert, View, Text } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://pairly-60qj.onrender.com';

function App() {
  const { user, isSignedIn } = useUser();
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (isSignedIn && user) {
      checkWaitlistStatus(user.primaryEmailAddress.emailAddress);
    }
  }, [isSignedIn, user]);

  const checkWaitlistStatus = async (email) => {
    try {
      setLoading(true);
      console.log('🔍 Checking email:', email);

      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      console.log('📊 Verification response:', data);

      if (data.verified) {
        // ✅ User in waitlist - Save data & Grant Premium
        await AsyncStorage.setItem('userEmail', email);
        await AsyncStorage.setItem('referralCode', data.referralCode);
        await AsyncStorage.setItem('isPremium', 'true'); // 🎁 FREE PREMIUM
        await AsyncStorage.setItem('premiumExpiry', getPremiumExpiry());
        await AsyncStorage.setItem('referralCount', data.referralCount.toString());
        
        setUserInfo({
          email,
          referralCode: data.referralCode,
          isPremium: true, // 🎁 Marketing offer
          referralCount: data.referralCount,
          premiumExpiry: getPremiumExpiry()
        });
        
        setIsVerified(true);
        
        // Show welcome message
        Alert.alert(
          '🎉 Welcome to Pairly!',
          '✨ You get 1 MONTH FREE PREMIUM for joining our waitlist!\n\n🎁 Premium Features Unlocked:\n• Unlimited moments\n• Time-lock messages\n• Secret vault\n• Dual camera moments',
          [{ text: 'Amazing!' }]
        );
        
        console.log('✅ User verified & Premium granted!');
        
      } else {
        // ❌ Not in waitlist
        setIsVerified(false);
        Alert.alert(
          'Join Waitlist First',
          'Please visit pairly-iota.vercel.app to join our waitlist and get FREE premium access!',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Join Now', onPress: () => openWebsite() }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Verification failed:', error);
      Alert.alert('Error', 'Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPremiumExpiry = () => {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1); // 1 month from now
    return expiry.toISOString();
  };

  const openWebsite = () => {
    // Open website in browser
    const url = 'https://pairly-iota.vercel.app';
    // Use Linking.openURL(url) or WebBrowser.openBrowserAsync(url)
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Verifying your access...</Text>
      </View>
    );
  }

  if (!isVerified) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          🎁 Join Waitlist for FREE Premium!
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>
          Visit pairly-iota.vercel.app to join our waitlist and unlock 1 month of premium features for free!
        </Text>
      </View>
    );
  }

  // Main app content (when verified)
  return (
    <MainAppContent userInfo={userInfo} />
  );
}

export default App;
```

---

### **Step 3: Referral Screen Component**

```javascript
// screens/ReferralScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://pairly-60qj.onrender.com';

export default function ReferralScreen() {
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiry, setPremiumExpiry] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const code = await AsyncStorage.getItem('referralCode');
      const premium = await AsyncStorage.getItem('isPremium');
      const expiry = await AsyncStorage.getItem('premiumExpiry');
      
      setReferralCode(code || '');
      setIsPremium(premium === 'true');
      setPremiumExpiry(expiry || '');
      
      if (code) {
        await fetchReferralCount(code);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralCount = async (code) => {
    try {
      const response = await fetch(`${API_URL}/auth/count?code=${code}`);
      const data = await response.json();
      
      setReferralCount(data.count || 0);
      
      // Check if user earned more premium time
      if (data.count >= 3 && !isPremium) {
        // Grant premium for referrals
        await AsyncStorage.setItem('isPremium', 'true');
        const newExpiry = new Date();
        newExpiry.setMonth(newExpiry.getMonth() + 3); // 3 months for referrals
        await AsyncStorage.setItem('premiumExpiry', newExpiry.toISOString());
        
        setIsPremium(true);
        setPremiumExpiry(newExpiry.toISOString());
        
        Alert.alert(
          '🎉 Premium Unlocked!',
          'You\'ve referred 3 friends and earned 3 months of Premium! Thank you for spreading the love! ❤️',
          [{ text: 'Awesome!' }]
        );
      }
      
    } catch (error) {
      console.error('Failed to fetch referral count:', error);
    }
  };

  const shareReferralLink = async () => {
    if (!referralCode) {
      Alert.alert('Error', 'Referral code not found');
      return;
    }

    const link = `https://pairly-iota.vercel.app?ref=${referralCode}`;
    const message = `🎉 Join me on Pairly - the most intimate app for couples! 

💕 Use my invite link to get FREE premium access:
${link}

✨ Premium features include:
• Unlimited photo moments
• Time-lock messages for future
• Secret vault for memories
• Dual camera moments

Download the app and let's stay connected! ❤️`;

    try {
      await Share.share({
        message: message,
        title: 'Join me on Pairly! 💕'
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getDaysRemaining = () => {
    if (!premiumExpiry) return 0;
    const expiry = new Date(premiumExpiry);
    const now = new Date();
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite Friends 🎁</Text>
      
      {/* Premium Status */}
      <View style={styles.premiumCard}>
        <Text style={styles.cardTitle}>Premium Status</Text>
        <Text style={styles.premiumStatus}>
          {isPremium ? '⭐ Premium Active' : '🆓 Free Plan'}
        </Text>
        {isPremium && (
          <Text style={styles.expiryText}>
            {getDaysRemaining()} days remaining
          </Text>
        )}
      </View>

      {/* Referral Code */}
      <View style={styles.codeCard}>
        <Text style={styles.cardTitle}>Your Referral Code</Text>
        <Text style={styles.referralCode}>{referralCode}</Text>
      </View>

      {/* Referral Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>Referral Progress</Text>
        <Text style={styles.statsText}>
          📊 Friends Invited: {referralCount}
        </Text>
        <Text style={styles.progressText}>
          {referralCount >= 3 
            ? '🎉 Goal achieved! You\'ve unlocked premium!' 
            : `Invite ${3 - referralCount} more friends to unlock 3 months premium!`
          }
        </Text>
      </View>

      {/* Share Button */}
      <TouchableOpacity 
        onPress={shareReferralLink}
        style={styles.shareButton}
      >
        <Text style={styles.shareButtonText}>
          📱 Share Referral Link
        </Text>
      </TouchableOpacity>

      {/* Benefits */}
      <View style={styles.benefitsCard}>
        <Text style={styles.cardTitle}>Premium Benefits</Text>
        <Text style={styles.benefitText}>✨ Unlimited photo moments</Text>
        <Text style={styles.benefitText}>⏰ Time-lock messages</Text>
        <Text style={styles.benefitText}>🔒 Secret vault</Text>
        <Text style={styles.benefitText}>📸 Dual camera moments</Text>
        <Text style={styles.benefitText}>🎨 Custom themes</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  premiumCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  codeCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  statsCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  benefitsCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  cardTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  premiumStatus: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea',
  },
  expiryText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center',
  },
  statsText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
  },
  progressText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  shareButton: {
    backgroundColor: '#667eea',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  benefitText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
});
```

---

### **Step 4: Premium Features Check**

```javascript
// utils/premiumCheck.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const checkPremiumStatus = async () => {
  try {
    const isPremium = await AsyncStorage.getItem('isPremium');
    const premiumExpiry = await AsyncStorage.getItem('premiumExpiry');
    
    if (isPremium === 'true' && premiumExpiry) {
      const expiryDate = new Date(premiumExpiry);
      const now = new Date();
      
      if (now < expiryDate) {
        return { isPremium: true, daysRemaining: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) };
      } else {
        // Premium expired
        await AsyncStorage.setItem('isPremium', 'false');
        return { isPremium: false, daysRemaining: 0 };
      }
    }
    
    return { isPremium: false, daysRemaining: 0 };
  } catch (error) {
    console.error('Error checking premium status:', error);
    return { isPremium: false, daysRemaining: 0 };
  }
};

export const requiresPremium = async (featureName) => {
  const { isPremium } = await checkPremiumStatus();
  
  if (!isPremium) {
    Alert.alert(
      '⭐ Premium Feature',
      `${featureName} is a premium feature. Invite 3 friends to unlock premium for free!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Invite Friends', onPress: () => navigateToReferral() }
      ]
    );
    return false;
  }
  
  return true;
};
```

---

### **Step 5: Use Premium Checks in Features**

```javascript
// In your moment/photo upload component
import { requiresPremium } from '../utils/premiumCheck';

const uploadMoment = async () => {
  // Check if user has premium for unlimited uploads
  const canUpload = await requiresPremium('Unlimited Moments');
  if (!canUpload) return;
  
  // Proceed with upload
  // ... upload logic
};

// In time-lock messages
const createTimeLockMessage = async () => {
  const canCreate = await requiresPremium('Time-lock Messages');
  if (!canCreate) return;
  
  // Proceed with time-lock message
  // ... time-lock logic
};
```

---

## 🎁 **Marketing Features**

### **Welcome Bonus System**
```javascript
// Grant 1 month premium to all waitlist users
const grantWelcomeBonus = async (email) => {
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 1);
  
  await AsyncStorage.setItem('isPremium', 'true');
  await AsyncStorage.setItem('premiumExpiry', expiry.toISOString());
  await AsyncStorage.setItem('welcomeBonusGranted', 'true');
};
```

### **Referral Rewards**
- **1 referral**: +1 week premium
- **3 referrals**: +3 months premium  
- **5 referrals**: +6 months premium

---

## 📱 **Navigation Setup**

```javascript
// Add to your navigation
import ReferralScreen from './screens/ReferralScreen';

// In your navigator
<Stack.Screen 
  name="Referral" 
  component={ReferralScreen}
  options={{ title: 'Invite Friends' }}
/>
```

---

## 🧪 **Testing Checklist**

- [ ] Website email verification works
- [ ] 1 month premium granted automatically
- [ ] Referral code generation
- [ ] Share functionality
- [ ] Premium features locked/unlocked
- [ ] Referral count tracking
- [ ] Premium expiry handling

---

## 🚀 **Deployment**

1. **Update app** with above code
2. **Test with website emails**
3. **Verify premium features**
4. **Test referral sharing**
5. **Deploy to app stores**

**Complete marketing funnel ready!** 🎉

Website → Email → App → Premium → Referrals → Growth! 📈