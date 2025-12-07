# 📱 App Waitlist Flow - Complete Implementation

## 🎯 **Waitlist Flow Logic**

```
App Launch → Clerk Auth → Email Check → Waitlist Status
    ↓
┌─ Not in Waitlist → Show Waitlist Screen → Join → Premium
└─ In Waitlist → Auto Premium → Main App
```

---

## 📱 **Implementation Files**

### **1. Main App Component (App.js)**

```javascript
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import WaitlistScreen from './screens/WaitlistScreen';
import MainAppContent from './screens/MainAppContent';
import LoadingScreen from './screens/LoadingScreen';

const API_URL = 'https://pairly-60qj.onrender.com';

export default function App() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [appState, setAppState] = useState('loading'); // 'loading', 'waitlist', 'main'
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn && user) {
        checkUserStatus(user.primaryEmailAddress.emailAddress);
      } else {
        // Not signed in - show auth
        setAppState('auth');
      }
    }
  }, [isLoaded, isSignedIn, user]);

  const checkUserStatus = async (email) => {
    try {
      console.log('🔍 Checking user status for:', email);
      
      // Check if already verified locally
      const localVerification = await AsyncStorage.getItem('userVerified');
      const localEmail = await AsyncStorage.getItem('userEmail');
      
      if (localVerification === 'true' && localEmail === email) {
        // Already verified, load local data
        const userData = await loadLocalUserData();
        if (userData) {
          setUserInfo(userData);
          setAppState('main');
          return;
        }
      }

      // Check with backend
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.verified) {
        // User in waitlist - setup premium access
        await setupPremiumUser(email, data);
        setAppState('main');
      } else {
        // Not in waitlist - show waitlist screen
        setAppState('waitlist');
      }

    } catch (error) {
      console.error('❌ Status check failed:', error);
      // On error, show waitlist screen
      setAppState('waitlist');
    }
  };

  const setupPremiumUser = async (email, data) => {
    const premiumExpiry = new Date();
    premiumExpiry.setMonth(premiumExpiry.getMonth() + 1); // 1 month free

    const userData = {
      email,
      referralCode: data.referralCode,
      isPremium: true,
      premiumExpiry: premiumExpiry.toISOString(),
      referralCount: data.referralCount || 0,
      welcomeBonusGranted: true
    };

    // Save to AsyncStorage
    await AsyncStorage.setItem('userVerified', 'true');
    await AsyncStorage.setItem('userEmail', email);
    await AsyncStorage.setItem('referralCode', data.referralCode);
    await AsyncStorage.setItem('isPremium', 'true');
    await AsyncStorage.setItem('premiumExpiry', userData.premiumExpiry);
    await AsyncStorage.setItem('referralCount', userData.referralCount.toString());
    await AsyncStorage.setItem('welcomeBonusGranted', 'true');

    setUserInfo(userData);
    console.log('✅ Premium user setup complete');
  };

  const loadLocalUserData = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      const referralCode = await AsyncStorage.getItem('referralCode');
      const isPremium = await AsyncStorage.getItem('isPremium');
      const premiumExpiry = await AsyncStorage.getItem('premiumExpiry');
      const referralCount = await AsyncStorage.getItem('referralCount');

      if (email && referralCode) {
        return {
          email,
          referralCode,
          isPremium: isPremium === 'true',
          premiumExpiry,
          referralCount: parseInt(referralCount) || 0
        };
      }
    } catch (error) {
      console.error('Error loading local data:', error);
    }
    return null;
  };

  const handleWaitlistJoined = async (userData) => {
    await setupPremiumUser(userData.email, userData);
    setAppState('main');
  };

  // Render based on app state
  if (!isLoaded || appState === 'loading') {
    return <LoadingScreen />;
  }

  if (appState === 'waitlist') {
    return (
      <WaitlistScreen 
        userEmail={user?.primaryEmailAddress?.emailAddress}
        onJoined={handleWaitlistJoined}
      />
    );
  }

  if (appState === 'main') {
    return <MainAppContent userInfo={userInfo} />;
  }

  // Default loading
  return <LoadingScreen />;
}
```

---

### **2. Waitlist Screen (screens/WaitlistScreen.js)**

```javascript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Linking
} from 'react-native';

const API_URL = 'https://pairly-60qj.onrender.com';

export default function WaitlistScreen({ userEmail, onJoined }) {
  const [email, setEmail] = useState(userEmail || '');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const joinWaitlist = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/invites/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          source: 'app'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Successfully joined waitlist
        Alert.alert(
          '🎉 Welcome to Pairly!',
          '✨ You\'ve been added to our waitlist and get 1 MONTH FREE PREMIUM!\n\n🎁 Premium Features:\n• Unlimited moments\n• Time-lock messages\n• Secret vault\n• Dual camera moments',
          [
            {
              text: 'Amazing!',
              onPress: () => {
                onJoined({
                  email: email.trim().toLowerCase(),
                  referralCode: data.inviteCode,
                  referralCount: 0
                });
              }
            }
          ]
        );
      } else {
        if (data.alreadyExists) {
          // Already in waitlist - verify and continue
          verifyExistingUser();
        } else {
          Alert.alert('Error', data.message || 'Failed to join waitlist');
        }
      }

    } catch (error) {
      console.error('Waitlist join error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyExistingUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data = await response.json();

      if (data.verified) {
        Alert.alert(
          '🎉 Welcome Back!',
          'You\'re already on our waitlist! Enjoy your premium access.',
          [
            {
              text: 'Continue',
              onPress: () => {
                onJoined({
                  email: email.trim().toLowerCase(),
                  referralCode: data.referralCode,
                  referralCount: data.referralCount || 0
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Verification error:', error);
    }
  };

  const openWebsite = () => {
    Linking.openURL('https://pairly-iota.vercel.app');
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.logo}>💕 Pairly</Text>
        <Text style={styles.tagline}>The most intimate space for couples</Text>
      </View>

      <View style={styles.offerCard}>
        <Text style={styles.offerTitle}>🎁 Limited Time Offer</Text>
        <Text style={styles.offerText}>
          Join our waitlist and get{'\n'}
          <Text style={styles.highlight}>1 MONTH FREE PREMIUM!</Text>
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Join the Waitlist</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Your email address"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Your name (optional)"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={[styles.joinButton, loading && styles.joinButtonDisabled]}
          onPress={joinWaitlist}
          disabled={loading}
        >
          <Text style={styles.joinButtonText}>
            {loading ? 'Joining...' : '🚀 Join Waitlist & Get Premium'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>✨ Premium Features You'll Get:</Text>
        <View style={styles.featuresList}>
          <Text style={styles.featureItem}>📸 Unlimited photo moments</Text>
          <Text style={styles.featureItem}>⏰ Time-lock messages for future</Text>
          <Text style={styles.featureItem}>🔒 Secret vault for memories</Text>
          <Text style={styles.featureItem}>📱 Dual camera moments</Text>
          <Text style={styles.featureItem}>🎨 Custom themes & styles</Text>
          <Text style={styles.featureItem}>🔔 Priority support</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.websiteButton} onPress={openWebsite}>
        <Text style={styles.websiteButtonText}>
          🌐 Visit Our Website
        </Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        By joining, you agree to our Terms of Service and Privacy Policy.
        Premium access is granted for 1 month from signup date.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  offerCard: {
    backgroundColor: '#667eea',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 30,
  },
  offerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  offerText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  highlight: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  joinButton: {
    backgroundColor: '#667eea',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  joinButtonDisabled: {
    backgroundColor: '#555',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  featuresContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
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
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
```

---

### **3. Loading Screen (screens/LoadingScreen.js)**

```javascript
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>💕 Pairly</Text>
      <ActivityIndicator size="large" color="#667eea" style={styles.loader} />
      <Text style={styles.loadingText}>Checking your access...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
  },
});
```

---

### **4. Premium Check Utility (utils/premiumUtils.js)**

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const checkPremiumStatus = async () => {
  try {
    const isPremium = await AsyncStorage.getItem('isPremium');
    const premiumExpiry = await AsyncStorage.getItem('premiumExpiry');
    
    if (isPremium === 'true' && premiumExpiry) {
      const expiryDate = new Date(premiumExpiry);
      const now = new Date();
      
      if (now < expiryDate) {
        const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        return { isPremium: true, daysRemaining };
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

export const requiresPremium = async (featureName, navigation) => {
  const { isPremium } = await checkPremiumStatus();
  
  if (!isPremium) {
    Alert.alert(
      '⭐ Premium Feature',
      `${featureName} is a premium feature. Join our waitlist to get 1 month free premium!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Get Premium', 
          onPress: () => navigation?.navigate('Referral')
        }
      ]
    );
    return false;
  }
  
  return true;
};

export const showPremiumWelcome = () => {
  Alert.alert(
    '🎉 Premium Activated!',
    '✨ Welcome to Pairly Premium! You now have access to:\n\n• Unlimited moments\n• Time-lock messages\n• Secret vault\n• Dual camera moments\n• Custom themes\n\nEnjoy your premium experience!',
    [{ text: 'Awesome!' }]
  );
};
```

---

### **5. Update Navigation (navigation/AppNavigator.js)**

```javascript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import App from '../App';
import ReferralScreen from '../screens/ReferralScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen 
          name="Main" 
          component={App} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Referral" 
          component={ReferralScreen}
          options={{ title: 'Invite Friends' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 🎯 **Flow Summary**

1. **App Launch** → Check Clerk auth
2. **Email Check** → Verify with backend
3. **Not in Waitlist** → Show beautiful waitlist screen
4. **Join Waitlist** → Auto-grant 1 month premium
5. **Main App** → Full premium access
6. **Referral System** → Share & earn more premium

## 🎁 **Premium Benefits**

- **1 Month Free** for all waitlist users
- **3 Months Free** for 3 referrals
- **6 Months Free** for 5 referrals

## 🧪 **Testing**

1. **Fresh install** → Should show waitlist screen
2. **Join waitlist** → Should grant premium
3. **Restart app** → Should remember status
4. **Website email** → Should auto-verify

**Complete waitlist flow ready!** 🚀

Kya implement karna hai pehle? Waitlist screen ya premium system?