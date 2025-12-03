# 📱 Frontend Integration - Complete Example

## 1. Update App.tsx (Main Entry Point)

```typescript
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import AccessCheckScreen from './src/screens/AccessCheckScreen';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function App() {
  const { user, isLoaded } = useUser();
  const [accessGranted, setAccessGranted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      checkUserAccess();
    }
  }, [isLoaded, user]);

  const checkUserAccess = async () => {
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) {
        setCheckingAccess(false);
        return;
      }

      const response = await axios.post(`${API_URL}/invites/check-access`, {
        email: email.toLowerCase(),
      });

      if (response.data.allowed) {
        setAccessGranted(true);
        // Mark as joined if not already
        await markAsJoined(email);
      }
    } catch (error) {
      console.error('Access check error:', error);
    } finally {
      setCheckingAccess(false);
    }
  };

  const markAsJoined = async (email: string) => {
    try {
      await axios.post(`${API_URL}/invites/mark-joined`, {
        email: email.toLowerCase(),
        clerkId: user?.id,
      });
    } catch (error) {
      console.error('Mark joined error:', error);
    }
  };

  // Show loading while checking
  if (!isLoaded || checkingAccess) {
    return <LoadingScreen />;
  }

  // Not signed in - show Clerk auth
  if (!user) {
    return <ClerkAuthScreen />;
  }

  // Signed in but not whitelisted - show access denied
  if (!accessGranted) {
    return (
      <AccessCheckScreen
        email={user.primaryEmailAddress?.emailAddress || ''}
        onAccessGranted={(inviteCode) => {
          setAccessGranted(true);
          markAsJoined(user.primaryEmailAddress?.emailAddress || '');
        }}
      />
    );
  }

  // All good - show main app
  return <MainApp />;
}
```

## 2. Add Invite Screen to Navigation

```typescript
// In your navigation stack (e.g., HomeStack.tsx):

import InviteFriendScreen from '../screens/InviteFriendScreen';

<Stack.Navigator>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Profile" component={ProfileScreen} />
  
  {/* Add this */}
  <Stack.Screen 
    name="InviteFriend" 
    component={InviteFriendScreen}
    options={{
      title: 'Invite Friends',
      headerStyle: { backgroundColor: '#FF6B9D' },
      headerTintColor: '#fff',
    }}
  />
</Stack.Navigator>
```

## 3. Add Invite Button to Profile/Settings

```typescript
// In ProfileScreen.tsx or SettingsScreen.tsx:

import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const navigation = useNavigation();

  return (
    <View>
      {/* Other profile stuff */}
      
      {/* Invite Button */}
      <TouchableOpacity
        style={styles.inviteButton}
        onPress={() => navigation.navigate('InviteFriend')}
      >
        <Text style={styles.inviteButtonText}>
          🎁 Invite Friends (Get Premium Free!)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inviteButton: {
    backgroundColor: '#FF6B9D',
    padding: 15,
    borderRadius: 15,
    margin: 20,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

## 4. Add Premium Badge (Show Referral Rewards)

```typescript
// In ProfileScreen.tsx:

import { useUser } from '@clerk/clerk-expo';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ProfileScreen() {
  const { user } = useUser();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/users/${user?.id}`
      );
      setUserData(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  return (
    <View>
      {/* Premium Badge */}
      {userData?.isPremium && (
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumText}>
            ⭐ Premium Member
          </Text>
          {userData.premiumExpiry && (
            <Text style={styles.expiryText}>
              Valid until: {new Date(userData.premiumExpiry).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}

      {/* Invite Stats */}
      <TouchableOpacity
        style={styles.inviteStatsCard}
        onPress={() => navigation.navigate('InviteFriend')}
      >
        <Text style={styles.inviteStatsTitle}>
          Invite Friends & Get Premium Free! 🎁
        </Text>
        <Text style={styles.inviteStatsSubtitle}>
          Each friend = 1 month Premium
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## 5. Add Notification When Reward Granted

```typescript
// In your Socket.IO listener or push notification handler:

socket.on('reward_granted', (data) => {
  // Show notification
  Alert.alert(
    '🎉 Reward Granted!',
    `Your friend joined Pairly! You got ${data.rewardType} free!`,
    [
      { text: 'Awesome!', onPress: () => {} },
    ]
  );
  
  // Refresh user data to show new premium status
  fetchUserData();
});
```

## 6. Environment Variables

Add to `.env`:
```
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com
```

## 7. Testing Flow

### Test 1: Access Denied
1. Sign in with email NOT in whitelist
2. Should see "Invite-only" screen
3. Cannot access main app

### Test 2: Access Granted
1. Add email to whitelist: `npm run add-whitelist`
2. Sign in with that email
3. Should see "Welcome to Pairly!" 
4. Access main app

### Test 3: Send Invite
1. Go to Profile → Invite Friends
2. Enter friend's email
3. Should see success message
4. Check backend: `npx prisma studio` → InvitedUser table

### Test 4: Referral Reward
1. Add friend's email to whitelist (simulating they joined)
2. Mark as joined: 
```bash
curl -X POST http://localhost:3000/invites/mark-joined \
  -H "Content-Type: application/json" \
  -d '{"email":"friend@example.com"}'
```
3. Check inviter's profile → Should show Premium badge
4. Check expiry date → Should be +30 days

## 8. Optional: Deep Linking

Handle invite links like `pairly://join/INVITE_CODE`:

```typescript
// In App.tsx:

import * as Linking from 'expo-linking';

useEffect(() => {
  const handleDeepLink = async (event: { url: string }) => {
    const { path, queryParams } = Linking.parse(event.url);
    
    if (path === 'join') {
      const inviteCode = queryParams?.code;
      // Auto-fill invite code or show special welcome screen
    }
  };

  Linking.addEventListener('url', handleDeepLink);
  
  return () => {
    Linking.removeAllListeners('url');
  };
}, []);
```

## 9. Optional: Share Invite Link

```typescript
// In InviteFriendScreen.tsx:

import * as Sharing from 'expo-sharing';

const shareInvite = async () => {
  const inviteLink = `https://pairly.app/join/${inviteCode}`;
  const message = `Hey! I'm using Pairly to stay connected with my partner. Join me! ${inviteLink}`;
  
  try {
    await Share.share({
      message,
      title: 'Join me on Pairly',
    });
  } catch (error) {
    console.error('Error sharing:', error);
  }
};
```

## 10. UI/UX Tips

### Make Invite Feature Prominent:
- Add badge on Profile tab: "Invite & Get Premium"
- Show popup after pairing: "Invite friends to unlock Premium"
- Add banner in home screen: "Get Premium free - Invite friends!"

### Show Social Proof:
- "1000+ couples using Pairly"
- "Join the exclusive community"
- "Limited beta access"

### Gamification:
- Leaderboard of top inviters
- Badges: "Invited 5 friends", "Invited 10 friends"
- Special rewards for top inviters

---

Bhai, ab tera frontend bhi ready! Complete integration with whitelist + referral system! 🚀
