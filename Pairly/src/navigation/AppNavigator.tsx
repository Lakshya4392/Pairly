import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { PairingScreen } from '../screens/PairingScreen';
import { PairingConnectionScreen } from '../screens/PairingConnectionScreen';
import { UploadScreen } from '../screens/UploadScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PremiumScreen } from '../screens/PremiumScreen';
import { GalleryScreen } from '../screens/GalleryScreen';
import { useAuth, useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

type Screen = 
  | 'splash'
  | 'onboarding'
  | 'auth'
  | 'pairing'
  | 'pairingConnection'
  | 'upload'
  | 'settings'
  | 'premium'
  | 'gallery';

interface AppNavigatorProps {
  // Add any props if needed
}

export const AppNavigator: React.FC<AppNavigatorProps> = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [isPremium, setIsPremium] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [connectionData, setConnectionData] = useState<{
    code: string;
    userName: string;
    mode: 'waiting' | 'connected';
    partnerName?: string;
  } | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
    checkPremiumStatus();
    loadBackgroundSyncQueue();
    initializeWidgetService();
    setupRealtimeListeners();
  }, []);

  useEffect(() => {
    if (isSignedIn && user) {
      connectRealtime();
    }
  }, [isSignedIn, user]);

  const initializeWidgetService = async () => {
    // Only initialize on Android
    if (Platform.OS !== 'android') {
      console.log('⚠️ Widget not available on this platform');
      return;
    }

    try {
      // Dynamic import to avoid loading on iOS
      const WidgetServiceModule = await import('../services/WidgetService');
      const WidgetBackgroundServiceModule = await import('../services/WidgetBackgroundService');
      
      const WidgetService = WidgetServiceModule.default;
      const WidgetBackgroundService = WidgetBackgroundServiceModule.default;
      
      // Check if services are available
      if (!WidgetService || !WidgetBackgroundService) {
        console.log('⚠️ Widget services not available');
        return;
      }

      // Initialize widget
      if (typeof WidgetService.initialize === 'function') {
        await WidgetService.initialize();
      }
      
      // Start background service for widget updates
      if (typeof WidgetBackgroundService.initialize === 'function') {
        await WidgetBackgroundService.initialize();
      }
      
      console.log('✅ Widget services initialized');
    } catch (error) {
      console.error('❌ Error initializing widget services:', error);
      // Don't crash app if widget initialization fails
    }
  };

  const connectRealtime = async () => {
    try {
      if (!user) return;

      const RealtimeService = (await import('../services/RealtimeService')).default;
      await RealtimeService.connect(user.id);
      
      console.log('✅ Realtime connected');
    } catch (error) {
      console.warn('⚠️ Could not connect to realtime (backend may be offline)');
      // Don't crash app if realtime fails
    }
  };

  const setupRealtimeListeners = async () => {
    try {
      const RealtimeService = (await import('../services/RealtimeService')).default;
      const WidgetService = (await import('../services/WidgetService')).default;
      const LocalPhotoStorage = (await import('../services/LocalPhotoStorage')).default;

      // Listen for new moments
      RealtimeService.on('new_moment', async (data: any) => {
        console.log('📥 New moment received:', data);
        
        // Save to local storage
        try {
          if (data.photoBase64) {
            const photoUri = await LocalPhotoStorage.savePhoto(
              `data:image/jpeg;base64,${data.photoBase64}`,
              'partner',
              false
            );
            
            // Update widget
            await WidgetService.onPhotoReceived(photoUri, data.partnerName);
          }
        } catch (error) {
          console.error('Error saving moment:', error);
        }
      });

      // Listen for shared notes
      RealtimeService.on('shared_note', async (data: any) => {
        console.log('📝 Shared note received:', data.content);
        // Show notification or update UI
      });

      // Listen for time-lock unlocked
      RealtimeService.on('timelock_unlocked', async (data: any) => {
        console.log('🔓 Time-lock message unlocked:', data.content);
        // Show notification
      });

      console.log('✅ Realtime listeners setup');
    } catch (error) {
      console.error('❌ Error setting up realtime listeners:', error);
    }
  };

  const loadBackgroundSyncQueue = async () => {
    try {
      const BackgroundSyncService = (await import('../services/BackgroundSyncService')).default;
      await BackgroundSyncService.loadQueue();
      console.log('✅ Background sync queue loaded');
    } catch (error) {
      console.error('❌ Error loading sync queue:', error);
    }
  };

  // Wait for Clerk to load before checking auth
  useEffect(() => {
    if (isLoaded) {
      setIsAuthChecked(true);
      console.log('🔐 Auth loaded. Signed in:', isSignedIn);
      
      // If user logged out or deleted account, redirect to auth and clear premium
      if (!isSignedIn && currentScreen !== 'splash' && currentScreen !== 'onboarding') {
        console.log('🚪 User logged out, redirecting to auth');
        setCurrentScreen('auth');
        setIsPremium(false);
        AsyncStorage.removeItem('isPremium');
      }
      
      // If user just signed in, sync premium status
      if (isSignedIn && user) {
        checkPremiumStatus();
      }
    }
  }, [isLoaded, isSignedIn, user]);

  const checkOnboardingStatus = async () => {
    try {
      const seen = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(seen === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Default to false if error
      setHasSeenOnboarding(false);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      // First check if user is signed in
      if (!isSignedIn || !user) {
        setIsPremium(false);
        await AsyncStorage.removeItem('isPremium');
        return;
      }

      // Sync with backend
      try {
        const token = await getToken();
        if (token) {
          const PremiumService = (await import('../services/PremiumService')).default;
          await PremiumService.syncWithBackend(token, user.id);
          
          // Get updated status
          const isPremiumUser = await PremiumService.isPremium();
          setIsPremium(isPremiumUser);
          
          console.log('✅ Premium status synced from backend:', isPremiumUser);
        }
      } catch (syncError) {
        console.error('❌ Error syncing premium status:', syncError);
        // Fallback to local storage
        const premium = await AsyncStorage.getItem('isPremium');
        setIsPremium(premium === 'true');
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    }
  };

  const handleSplashComplete = () => {
    // Wait for auth to be checked
    if (!isAuthChecked) {
      console.log('⏳ Waiting for auth to load...');
      return;
    }

    console.log('✅ Auth checked. Navigating...');
    console.log('- Has seen onboarding:', hasSeenOnboarding);
    console.log('- Is signed in:', isSignedIn);

    if (!hasSeenOnboarding) {
      console.log('→ Going to onboarding');
      setCurrentScreen('onboarding');
    } else if (!isSignedIn) {
      console.log('→ Going to auth');
      setCurrentScreen('auth');
    } else {
      console.log('→ Going to upload (home)');
      setCurrentScreen('upload');
    }
  };

  // Auto-navigate when auth is checked
  useEffect(() => {
    if (isAuthChecked && currentScreen === 'splash') {
      handleSplashComplete();
    }
  }, [isAuthChecked, hasSeenOnboarding]);

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setHasSeenOnboarding(true);
      console.log('✅ Onboarding completed');
      setCurrentScreen('auth');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      setCurrentScreen('auth');
    }
  };

  const handleAuthSuccess = async () => {
    console.log('✅ Auth successful, navigating to pairing...');
    setCurrentScreen('pairing');
  };

  const handlePairingComplete = () => {
    setCurrentScreen('upload');
  };

  const handleSkipPairing = () => {
    setCurrentScreen('upload');
  };

  const handleNavigateToSettings = () => {
    setCurrentScreen('settings');
  };

  const handleNavigateToPairing = () => {
    setCurrentScreen('pairing');
  };

  const handleNavigateToGallery = () => {
    setCurrentScreen('gallery');
  };

  const handleShowConnectionScreen = (code: string, userName: string) => {
    setConnectionData({
      code,
      userName,
      mode: 'waiting',
    });
    setCurrentScreen('pairingConnection');
  };

  const handleConnectionComplete = () => {
    setCurrentScreen('upload');
    setConnectionData(null);
  };

  const handleCancelConnection = () => {
    setCurrentScreen('pairing');
    setConnectionData(null);
  };

  const handleNavigateToPremium = () => {
    setCurrentScreen('premium');
  };

  const handleBackToUpload = () => {
    setCurrentScreen('upload');
  };

  const handlePremiumPurchase = async (plan: 'monthly' | 'yearly') => {
    try {
      // In a real app, handle the actual purchase here using RevenueCat or similar
      
      if (user) {
        const token = await getToken();
        const response = await fetch(`${API_CONFIG.baseUrl}/users/premium`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            isPremium: true,
            premiumPlan: plan,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update premium status');
        }

        await AsyncStorage.setItem('isPremium', 'true');
        setIsPremium(true);
        console.log('✅ Premium status updated on backend');
      }
      
      setCurrentScreen('upload');
    } catch (error) {
      console.error('Error handling premium purchase:', error);
    }
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onComplete={handleSplashComplete} />;
      
      case 'onboarding':
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
      
      case 'auth':
        return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
      
      case 'pairing':
        return (
          <PairingScreen 
            onPairingComplete={handlePairingComplete}
            onSkipPairing={handleSkipPairing}
            onShowConnectionScreen={handleShowConnectionScreen}
          />
        );
      
      case 'pairingConnection':
        return connectionData ? (
          <PairingConnectionScreen
            mode={connectionData.mode}
            userCode={connectionData.code}
            userName={connectionData.userName}
            partnerName={connectionData.partnerName}
            onGoHome={handleConnectionComplete}
            onCancel={handleCancelConnection}
          />
        ) : null;
      
      case 'upload':
        return (
          <UploadScreen 
            onNavigateToSettings={handleNavigateToSettings}
            onNavigateToPairing={handleNavigateToPairing}
            onNavigateToGallery={handleNavigateToGallery}
            onNavigateToPremium={handleNavigateToPremium}
            isPremium={isPremium}
          />
        );
      
      case 'settings':
        return (
          <SettingsScreen 
            onBack={handleBackToUpload}
            isPremium={isPremium}
            onUpgradeToPremium={handleNavigateToPremium}
            onNavigateToPairing={handleNavigateToPairing}
          />
        );
      
      case 'premium':
        return (
          <PremiumScreen 
            onBack={handleBackToUpload}
            onPurchase={handlePremiumPurchase}
          />
        );
      
      case 'gallery':
        return (
          <GalleryScreen 
            onBack={handleBackToUpload}
            isPremium={isPremium}
          />
        );
      
      default:
        return <SplashScreen onComplete={handleSplashComplete} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});