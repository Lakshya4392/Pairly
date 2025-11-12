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
  const { isSignedIn, isLoaded } = useAuth();
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
  }, []);

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
      
      // If user logged out or deleted account, redirect to auth
      if (!isSignedIn && currentScreen !== 'splash' && currentScreen !== 'onboarding') {
        console.log('🚪 User logged out, redirecting to auth');
        setCurrentScreen('auth');
      }
    }
  }, [isLoaded, isSignedIn]);

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
      const premium = await AsyncStorage.getItem('isPremium');
      setIsPremium(premium === 'true');
    } catch (error) {
      console.error('Error checking premium status:', error);
      // Default to false if error
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
      // In a real app, handle the actual purchase here
      await AsyncStorage.setItem('isPremium', 'true');
      setIsPremium(true);
      
      // Queue sync with backend (non-blocking)
      if (user) {
        const BackgroundSyncService = (await import('../services/BackgroundSyncService')).default;
        await BackgroundSyncService.queuePremiumSync(user.id, true, plan);
        console.log('✅ Premium status sync queued');
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