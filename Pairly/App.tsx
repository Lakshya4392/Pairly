// ⚡ CRASH FIX: Minimal imports to prevent React Native AssertionError
import './polyfills';
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// ⚡ SIMPLE: No widget background service needed (widget polls backend independently)

// Import dev tools (only in development)
import './src/utils/DevTools';

// Import theme
import { paperTheme } from './src/theme';
import { ThemeProvider as PairlyThemeProvider } from './src/contexts/ThemeContext';

// Import navigation
import { AppNavigator } from './src/navigation/AppNavigator';

// ⚡ BULLETPROOF: Token cache with AsyncStorage fallback for APK
const tokenCache = {
  async getToken(key: string) {
    try {
      // Try SecureStore first
      const token = await SecureStore.getItemAsync(key);
      if (token) {
        console.log('✅ Token retrieved from SecureStore:', key);
        return token;
      }

      // Fallback to AsyncStorage for APK
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const fallbackToken = await AsyncStorage.getItem(`clerk_${key}`);
      if (fallbackToken) {
        console.log('✅ Token retrieved from AsyncStorage fallback:', key);
        return fallbackToken;
      }

      return null;
    } catch (err) {
      console.error('❌ Error getting token:', err);
      // Try AsyncStorage as last resort
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const fallbackToken = await AsyncStorage.getItem(`clerk_${key}`);
        return fallbackToken;
      } catch (fallbackErr) {
        console.error('❌ AsyncStorage fallback failed:', fallbackErr);
        return null;
      }
    }
  },
  async saveToken(key: string, value: string) {
    try {
      // Save to both SecureStore AND AsyncStorage for reliability
      await SecureStore.setItemAsync(key, value);
      console.log('✅ Token saved to SecureStore:', key);

      // Also save to AsyncStorage as backup
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(`clerk_${key}`, value);
      console.log('✅ Token also saved to AsyncStorage backup:', key);
    } catch (err) {
      console.error('❌ Error saving token to SecureStore:', err);
      // Try AsyncStorage as fallback
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem(`clerk_${key}`, value);
        console.log('✅ Token saved to AsyncStorage fallback:', key);
      } catch (fallbackErr) {
        console.error('❌ AsyncStorage fallback save failed:', fallbackErr);
      }
    }
  },
};

// Clerk publishable key - use environment variable, fallback for development only
const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  (__DEV__ ? 'pk_test_bmF0aXZlLWRlZXItOTkuY2xlcmsuYWNjb3VudHMuZGV2JA' : '');

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Unknown error occurred'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  // ⚡ CRASH FIX: Safer font loading with error handling
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // ⚡ CRASH FIX: Safer font application with try-catch
  useEffect(() => {
    if (fontsLoaded && !fontError) {
      try {
        // Apply default font family globally with error handling
        const oldTextRender = (Text as any).render;
        if (oldTextRender) {
          (Text as any).render = function (...args: any) {
            try {
              const origin = oldTextRender.call(this, ...args);
              return React.cloneElement(origin, {
                style: [{ fontFamily: 'Inter-Regular' }, origin.props.style],
              });
            } catch (e) {
              console.warn('Font render error:', e);
              return oldTextRender.call(this, ...args);
            }
          };
        }

        const oldTextInputRender = (TextInput as any).render;
        if (oldTextInputRender) {
          (TextInput as any).render = function (...args: any) {
            try {
              const origin = oldTextInputRender.call(this, ...args);
              return React.cloneElement(origin, {
                style: [{ fontFamily: 'Inter-Regular' }, origin.props.style],
              });
            } catch (e) {
              console.warn('TextInput font render error:', e);
              return oldTextInputRender.call(this, ...args);
            }
          };
        }

        console.log('✅ Inter fonts loaded and applied globally');
      } catch (error) {
        console.warn('⚠️ Font application failed:', error);
      }
    }

    if (fontError) {
      console.warn('⚠️ Font loading error:', fontError);
    }
  }, [fontsLoaded, fontError]);

  // ⚡ CRASH FIX: Safer initialization with proper error handling
  useEffect(() => {
    const initializeApp = async () => {
      // ⚡ CRASH FIX: Delay initialization to prevent React Native AssertionError
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        // ⚡ CRASH FIX: Initialize connection manager with error boundary
        const ConnectionManager = (await import('./src/utils/ConnectionManager')).default;
        ConnectionManager.initialize();
        console.log('✅ ConnectionManager initialized');
      } catch (error) {
        console.error('❌ ConnectionManager init failed:', error);
      }

      // ⚡ CRASH FIX: Initialize services with longer delay
      setTimeout(async () => {
        try {
          const MomentService = (await import('./src/services/MomentService')).default;
          await MomentService.initialize();
          console.log('✅ SimpleMomentService initialized');
        } catch (error) {
          console.error('❌ Error initializing SimpleMomentService:', error);
        }
      }, 2000); // Longer delay to prevent crashes

      // Request notification permissions (fast)
      const NotificationService = (await import('./src/services/NotificationService')).default;
      const hasPermission = await NotificationService.requestPermissions();

      if (hasPermission) {
        console.log('✅ Notification permissions granted');

        // Setup notification listeners (non-blocking)
        NotificationService.setupListeners(
          (notification) => {
            // Notification received while app is open
            console.log('📬 Notification received:', notification.request.content.title);
          },
          (response) => {
            // Notification tapped
            console.log('👆 Notification tapped:', response.notification.request.content.data);
            // TODO: Navigate to relevant screen based on notification type
          }
        );
      } else {
        console.warn('⚠️ Notification permissions denied');
      }

      // ⚡ NEW: Check premium status on app launch
      setTimeout(async () => {
        try {
          const PremiumCheckService = (await import('./src/services/PremiumCheckService')).default;
          const status = await PremiumCheckService.checkPremiumStatus();

          if (status.isPremium) {
            console.log(`⭐ Premium active: ${status.daysRemaining} days remaining`);
          } else {
            console.log(`⏰ Premium expired. Referrals: ${status.referralCount}/3`);
          }

          // Check if we should show an alert
          const alert = await PremiumCheckService.getPremiumStatusAlert();
          if (alert.show) {
            console.log(`📢 Premium alert: ${alert.title} - ${alert.message}`);
            // TODO: Show alert to user (can be implemented in HomeScreen)
          }
        } catch (error) {
          console.error('❌ Error checking premium status:', error);
        }
      }, 2000); // Check after 2 seconds to not block app startup
    };

    initializeApp();
  }, []);

  // Handle deep links (OAuth redirect)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('📱 Deep link received:', url);
      // Clerk will automatically handle the OAuth callback
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('📱 App opened with URL:', url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ⚡ CRASH FIX: Better loading state handling
  if (!fontsLoaded || fontError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {fontError ? 'Loading with system fonts...' : 'Loading Pairly...'}
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
          <PairlyThemeProvider>
            <PaperProvider theme={paperTheme}>
              <AppNavigator />
            </PaperProvider>
          </PairlyThemeProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
