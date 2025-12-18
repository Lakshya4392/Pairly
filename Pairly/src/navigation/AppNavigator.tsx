import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform, AppState, NativeModules } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
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
import { SocketTestScreen } from '../screens/SocketTestScreen';
import { ReferralScreen } from '../screens/ReferralScreen';
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
  | 'gallery'
  | 'socketTest'
  | 'inviteFriend';

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

  // --- Helper Functions ---

  const initializeFCM = async () => {
    try {
      const FCMService = (await import('../services/FCMService')).default;
      await FCMService.initialize();
      console.log('✅ FCM initialized');
    } catch (error) {
      console.error('❌ FCM initialization failed:', error);
    }
  };

  const authenticateWithBackend = async () => {
    try {
      console.log('🔐 Authenticating with backend...');
      const clerkToken = await getToken();

      if (!clerkToken) {
        console.error('❌ No Clerk token available');
        return;
      }

      const AuthService = (await import('../services/AuthService')).default;
      const authResponse = await AuthService.authenticateWithBackend(clerkToken);

      console.log('✅ Backend authentication successful');
      console.log('👤 User:', authResponse.user.displayName);
      console.log('🔑 JWT token stored');

      // 🔥 FIX: Register FCM token now that we have a user
      const FCMService = (await import('../services/FCMService')).default;
      await FCMService.registerUser();

    } catch (error: any) {
      console.error('❌ Backend authentication failed:', error.message);
    }
  };

  const initializeWidgetService = async () => {
    if (Platform.OS !== 'android') {
      console.log('⚠️ Widget not available on this platform');
      return;
    }

    try {
      // ⚡ SIMPLE: Widget initializes itself via AlarmManager (no RN service needed)
      const WidgetServiceModule = await import('../services/WidgetService');
      const WidgetService = WidgetServiceModule.default;

      if (WidgetService && typeof WidgetService.initialize === 'function') {
        await WidgetService.initialize();
        console.log('✅ Simple widget service initialized');
      }
    } catch (error) {
      console.error('❌ Error initializing widget service:', error);
    }
  };

  const connectRealtime = async () => {
    try {
      if (!user) return;

      const clerkToken = await getToken();
      if (clerkToken) {
        await AsyncStorage.setItem('auth_token', clerkToken);
        console.log('✅ Auth token stored for socket connection');

        // 🔥 WIDGET FIX: Also store in SharedPreferences for widget access
        try {
          const { NativeModules } = require('react-native');
          const { SharedPrefsModule } = NativeModules;

          if (SharedPrefsModule) {
            await SharedPrefsModule.setString('auth_token', clerkToken);
            await SharedPrefsModule.setString('user_id', user.id);
            console.log('✅ Auth token also stored in SharedPreferences for widget');
          }
        } catch (widgetError) {
          console.warn('⚠️ Could not store auth token for widget:', widgetError);
        }
      }

      const SocketConnectionService = (await import('../services/SocketConnectionService')).default;
      const RealtimeService = (await import('../services/RealtimeService')).default;
      const MomentService = (await import('../services/MomentService')).default;

      if (SocketConnectionService.isConnected()) {
        console.log('✅ Already connected to socket');
      } else {
        await SocketConnectionService.initialize(user.id);
        console.log('✅ Socket connection initialized');
      }

      if (!RealtimeService.getConnectionStatus()) {
        await RealtimeService.connect(user.id);
        console.log('✅ Realtime connected');

        RealtimeService.startHeartbeat(user.id);
        console.log('✅ Heartbeat started');

        // ⚡ SIMPLE: No queue processing needed (direct upload to backend)
        console.log('✅ Simple upload flow active - no queue processing needed');
      }
    } catch (error) {
      console.log('⚠️ Realtime connection error (backend may be offline):', error);
    }
  };

  const setupRealtimeListeners = async () => {
    try {
      const RealtimeService = (await import('../services/RealtimeService')).default;
      const WidgetService = (await import('../services/WidgetService')).default;
      // ⚡ SIMPLE: No LocalPhotoStorage needed (photos fetched from backend)
      const PairingService = (await import('../services/PairingService')).default;

      // Partner Connected
      RealtimeService.on('partner_connected', async (data: any) => {
        console.log('🎉 Partner connected:', data);

        if (data.partner) {
          const partnerInfo: any = {
            id: data.partner.id,
            clerkId: data.partner.clerkId || data.partner.id,
            displayName: data.partner.displayName || 'Partner',
            email: data.partner.email || '',
            photoUrl: data.partner.photoUrl,
            createdAt: new Date().toISOString(),
          };

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
            setConnectionData({
              ...connectionData,
              mode: 'connected',
              partnerName: data.partner?.displayName || 'Partner',
            });
          }
        }
      });

      // ⚡ SIMPLE: Moment Available (lightweight notification only)
      RealtimeService.on('moment_available', async (data: any) => {
        console.log('📥 Moment available:', data.momentId);

        try {
          // Just show notification - widget will poll backend for photo
          const EnhancedNotificationService = (await import('../services/EnhancedNotificationService')).default;
          await EnhancedNotificationService.showMomentNotification(
            data.partnerName || 'Partner',
            data.momentId
          );

          // Trigger gallery refresh (will fetch from API)
          RealtimeService.emit('gallery_refresh', { timestamp: Date.now() });

          // 🔥 WIDGET FIX: Update widget using Service
          if (Platform.OS === 'android' && data.photoUrl) {
            try {
              const { WidgetUpdateService } = await import('../services/WidgetUpdateService');
              console.log('📥 [Socket] Updating widget via Service...');
              await WidgetUpdateService.updateWidgetWithPhoto(data.photoUrl, data.partnerName || 'Partner');
            } catch (widgetError) {
              console.log('⚠️ Widget update failed:', widgetError);
            }
          }

          console.log('✅ Notification sent, gallery and widget refreshing');
        } catch (error) {
          console.error('Error handling moment_available:', error);
        }
      });

      // Moment Sent Confirmation
      RealtimeService.on('moment_sent_confirmation', async (data: any) => {
        console.log('✅ Moment sent to', data.partnerName);
        try {
          const EnhancedNotificationService = (await import('../services/EnhancedNotificationService')).default;
          await EnhancedNotificationService.showMomentSentNotification(data.partnerName || 'Partner');
        } catch (error) {
          console.error('Error showing notification:', error);
        }
      });

      // Moment Delivered
      RealtimeService.on('moment_delivered', async (data: any) => {
        console.log('✅ Moment delivered via', data.deliveryMethod);
        try {
          const EnhancedNotificationService = (await import('../services/EnhancedNotificationService')).default;
          await EnhancedNotificationService.showDeliveryNotification(data.partnerName || 'Partner');
        } catch (error) {
          console.error('Error showing notification:', error);
        }
      });

      // Moment Received Ack
      RealtimeService.on('moment_received_ack', async (data: any) => {
        console.log('✅ Partner received moment at', data.receivedAt);
      });

      // Shared Note
      RealtimeService.on('shared_note', async (data: any) => {
        console.log('📝 Shared note received:', data.content);
      });

      // Timelock Unlocked
      RealtimeService.on('timelock_unlocked', async (data: any) => {
        console.log('🔓 Time-lock message unlocked:', data.content);
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

  const checkOnboardingStatus = async () => {
    try {
      const seen = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(seen === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasSeenOnboarding(false);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      if (!isSignedIn || !user) {
        setIsPremium(false);
        return;
      }

      // NEW: Check premium from waitlist system (PremiumCheckService)
      const PremiumCheckService = (await import('../services/PremiumCheckService')).default;
      const status = await PremiumCheckService.getLocalPremiumStatus();

      console.log('💎 Premium status (waitlist):', status.isPremium, 'Days:', status.daysRemaining);
      setIsPremium(status.isPremium);

      // Also update old PremiumService for backward compatibility
      if (status.isPremium) {
        const PremiumService = (await import('../services/PremiumService')).default;
        const expiryDate = status.premiumExpiresAt ? new Date(status.premiumExpiresAt) : undefined;
        // Use 'monthly' as default plan type for waitlist users
        await PremiumService.setPremiumStatus(true, 'monthly', expiryDate);
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    }
  };

  const handleSplashComplete = () => {
    if (!isAuthChecked) return;

    if (!hasSeenOnboarding) {
      setCurrentScreen('onboarding');
    } else if (!isSignedIn) {
      setCurrentScreen('auth');
    } else {
      setCurrentScreen('upload');
    }
  };

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

  const handleNavigateToSocketTest = () => {
    setCurrentScreen('socketTest');
  };

  const handleShowConnectionScreen = (code: string, userName: string, connectedMode?: 'waiting' | 'connected', partnerName?: string) => {
    setConnectionData({
      code,
      userName,
      mode: connectedMode || 'waiting',
      partnerName: partnerName,
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

      setIsPremium(true);
      await AsyncStorage.setItem('isPremium', 'true');
      console.log('✅ Premium activated locally');

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

      // Run premium check in background to prevent splash freeze
      checkPremiumStatus();
      setCurrentScreen('upload');
    } catch (error) {
      console.error('❌ Error handling premium purchase:', error);
    }
  };

  // --- UseEffects ---

  // Initial Load
  useEffect(() => {
    checkOnboardingStatus();
    checkPremiumStatus();
    loadBackgroundSyncQueue();
    initializeWidgetService();
    setupRealtimeListeners();
    initializeFCM();
    initializeNetworkMonitor();
  }, []);

  const initializeNetworkMonitor = async () => {
    try {
      const NetworkMonitor = (await import('../services/NetworkMonitor')).default;
      await NetworkMonitor.initialize();
      console.log('✅ Network Monitor initialized');

      // Listen for network changes
      NetworkMonitor.onChange((isOnline) => {
        console.log(`🌐 Network status changed: ${isOnline ? 'Online' : 'Offline'}`);
        // You can show a toast/banner here if needed
      });
    } catch (error) {
      console.error('❌ Error initializing Network Monitor:', error);
    }
  };

  // Premium Check Loop
  const [lastPremiumCheck, setLastPremiumCheck] = useState(0);
  useEffect(() => {
    const isPremiumScreen = currentScreen === 'settings' || currentScreen === 'premium' || currentScreen === 'managePremium';

    if (isPremiumScreen) {
      const now = Date.now();
      if (now - lastPremiumCheck > 10000) {
        checkPremiumStatus();
        setLastPremiumCheck(now);
      }
    }
  }, [currentScreen]);

  // Auth/Connect Loop
  const [hasConnected, setHasConnected] = useState(false);
  useEffect(() => {
    if (isSignedIn && user && !hasConnected) {
      authenticateWithBackend();
      connectRealtime();
      setHasConnected(true);
    }
  }, [isSignedIn, user, hasConnected]);

  // Auth Check Loop
  useEffect(() => {
    if (isLoaded) {
      setIsAuthChecked(true);

      // User logged out - redirect to auth
      if (!isSignedIn && currentScreen !== 'splash' && currentScreen !== 'onboarding') {
        console.log('🚪 User logged out, redirecting to auth');
        setCurrentScreen('auth');
        setIsPremium(false);
        setHasConnected(false); // Reset connection flag
        AsyncStorage.removeItem('isPremium');
      }

      // User signed in - redirect to upload
      if (isSignedIn && user && currentScreen === 'auth') {
        console.log('✅ User signed in, redirecting to upload');
        setCurrentScreen('upload');
        checkPremiumStatus();
      }

      // Check premium for signed in users
      if (isSignedIn && user && currentScreen !== 'auth') {
        checkPremiumStatus();
      }
    }
  }, [isLoaded, isSignedIn, user, currentScreen]);

  // Auto-navigate
  useEffect(() => {
    if (isAuthChecked && currentScreen === 'splash') {
      handleSplashComplete();
    }
  }, [isAuthChecked, hasSeenOnboarding]);

  // Refresh Auth on Foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isSignedIn && user) {
        console.log('🔄 App foregrounded - refreshing backend auth...');
        authenticateWithBackend();
        checkPremiumStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isSignedIn, user]);

  // --- Render ---

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

      case 'socketTest':
        return <SocketTestScreen />;

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
            onNavigateToInvite={() => setCurrentScreen('inviteFriend')}
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

      case 'inviteFriend':
        return (
          <ReferralScreen
            onBack={() => setCurrentScreen('settings')}
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