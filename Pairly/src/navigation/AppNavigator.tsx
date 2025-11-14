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
import { ManagePremiumScreen } from '../screens/ManagePremiumScreen';
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
  | 'managePremium'
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

  // Refresh premium status only when on settings/premium screen
  useEffect(() => {
    if (currentScreen !== 'settings' && currentScreen !== 'premium' && currentScreen !== 'managePremium') {
      return; // Don't check if not on premium-related screens
    }

    // Check once when screen opens
    checkPremiumStatus();

    // Then check every 30 seconds (not 5 seconds - too frequent)
    const interval = setInterval(() => {
      checkPremiumStatus();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [currentScreen]);

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
      const PairingService = (await import('../services/PairingService')).default;

      // Listen for partner connection (for pairing flow)
      RealtimeService.on('partner_connected', async (data: any) => {
        console.log('🎉 Partner connected:', data);
        
        // Store partner info from socket event
        if (data.partner) {
          const partnerInfo: any = {
            id: data.partner.id,
            clerkId: data.partner.clerkId || data.partner.id,
            displayName: data.partner.displayName || 'Partner',
            email: data.partner.email || '',
            photoUrl: data.partner.photoUrl,
            createdAt: new Date().toISOString(),
          };
          
          // Create pair object and store it
          const pair: any = {
            id: data.pairId || 'temp-id',
            user1Id: data.partnerId,
            user2Id: data.userId || '',
            pairedAt: new Date().toISOString(),
            partner: partnerInfo,
          };
          
          await PairingService.storePair(pair);
          console.log('✅ Pair data stored from socket event');
        }
        
        // Update connection screen if we're on it
        if (currentScreen === 'pairingConnection' && connectionData) {
          try {
            const partner = await PairingService.getPartner();
            setConnectionData({
              ...connectionData,
              mode: 'connected',
              partnerName: partner?.displayName || data.partner?.displayName || 'Partner',
            });
          } catch (error) {
            console.error('Error getting partner info:', error);
            // Still update to connected state
            setConnectionData({
              ...connectionData,
              mode: 'connected',
              partnerName: data.partner?.displayName || 'Partner',
            });
          }
        }
      });

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
            if (photoUri) {
              await WidgetService.onPhotoReceived(photoUri, data.partnerName || 'Partner');
            }
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
        return;
      }

      // Always check local PremiumService first
      const PremiumService = (await import('../services/PremiumService')).default;
      const isPremiumUser = await PremiumService.isPremium();
      setIsPremium(isPremiumUser);
      
      // Only log once on initial load
      if (currentScreen === 'splash' || currentScreen === 'auth') {
        console.log('💎 Premium status:', isPremiumUser);
      }

      // Try to sync with backend (non-blocking, silent fail)
      // Only sync if on premium-related screens
      if (currentScreen === 'settings' || currentScreen === 'premium' || currentScreen === 'managePremium') {
        try {
          const UserSyncService = (await import('../services/UserSyncService')).default;
          const backendUser = await UserSyncService.getUserFromBackend(user.id);
          
          if (backendUser) {
            // Only log if status changed
            if (backendUser.isPremium !== isPremiumUser) {
              console.log('✅ Premium status updated from backend:', backendUser.isPremium);
            }
            
            // Sync premium status from backend
            if (backendUser.isPremium) {
              const expiryDate = backendUser.premiumExpiry 
                ? new Date(backendUser.premiumExpiry) 
                : undefined;
              
              await PremiumService.setPremiumStatus(
                true,
                backendUser.premiumPlan || 'monthly',
                expiryDate
              );
              
              setIsPremium(true);
            } else if (isPremiumUser && !backendUser.isPremium) {
              // Backend says not premium, update local
              await PremiumService.setPremiumStatus(false);
              setIsPremium(false);
            }
          }
        } catch (syncError) {
          // Silent - backend offline is normal
        }
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
      console.log('💎 Activating premium:', plan);
      
      // Update local premium status immediately
      setIsPremium(true);
      await AsyncStorage.setItem('isPremium', 'true');
      console.log('✅ Premium activated locally');
      
      // Try to sync with backend (non-blocking)
      if (user) {
        try {
          const token = await getToken();
          console.log('🌐 Syncing with backend...');
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

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend sync successful:', data);
          } else {
            console.log('⚠️ Backend sync failed:', response.status);
          }
        } catch (syncError: any) {
          console.log('⚠️ Backend sync error:', syncError.message);
        }
      }
      
      // Refresh premium status
      await checkPremiumStatus();
      
      setCurrentScreen('upload');
    } catch (error) {
      console.error('❌ Error handling premium purchase:', error);
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
            onUpgradeToPremium={() => {
              console.log('🔵 Premium button tapped, isPremium:', isPremium);
              if (isPremium) {
                console.log('🔵 Navigating to managePremium screen');
                setCurrentScreen('managePremium');
              } else {
                console.log('🔵 Navigating to premium screen');
                setCurrentScreen('premium');
              }
            }}
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
      
      case 'managePremium':
        return (
          <ManagePremiumScreen
            onBack={() => setCurrentScreen('settings')}
            onCancelSubscription={async () => {
              await checkPremiumStatus();
            }}
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