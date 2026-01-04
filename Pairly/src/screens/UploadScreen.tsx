import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Modal,
  RefreshControl,
  Animated,
} from 'react-native';
import { CustomAlert } from '../components/CustomAlert';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { SharedNoteModal } from '../components/SharedNoteModal';
import { TimeLockModal } from '../components/TimeLockModal';
import { TimeCounterModal } from '../components/TimeCounterModal';
import { PhotoPreviewScreen } from './PhotoPreviewScreen';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@clerk/clerk-expo';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors, gradients } from '../theme/colorsIOS';
import { spacing, layout, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import PairingService from '../services/PairingService';
import PremiumService from '../services/PremiumService';
import SharedNotesService from '../services/SharedNotesService';
import TimeLockService from '../services/TimeLockService';
import PingService from '../services/PingService';
import { useAuth } from '@clerk/clerk-expo';

interface UploadScreenProps {
  onNavigateToSettings: () => void;
  onNavigateToPairing?: () => void;
  onNavigateToGallery?: () => void;
  onNavigateToPremium?: () => void;
  isPremium?: boolean;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onNavigateToSettings,
  onNavigateToPairing,
  onNavigateToGallery,
  onNavigateToPremium,
  isPremium = false // Production: Check actual premium status
}) => {
  const { colors, isDarkMode } = useTheme();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Create styles with current theme colors
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // Dynamic gradients based on theme
  const dynamicGradients = React.useMemo(() => ({
    primary: [colors.primary, colors.primaryLight],
    secondary: [colors.secondary, colors.secondaryLight],
  }), [colors]);

  const [partnerName, setPartnerName] = useState('Your Person');
  const [uploading, setUploading] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [dailyMomentsRemaining, setDailyMomentsRemaining] = useState(3);
  const scale = useRef(new Animated.Value(1)).current;
  const viewAllScale = useRef(new Animated.Value(1)).current;
  const settingsScale = useRef(new Animated.Value(1)).current;
  const settingsRotate = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isPartnerConnected, setIsPartnerConnected] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTimeLockModal, setShowTimeLockModal] = useState(false);
  const [showTimeCounterModal, setShowTimeCounterModal] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Streak state - Calculated from connection date
  const [streakDays, setStreakDays] = useState(1);

  // Get user name from Clerk
  const userName = user?.firstName || user?.username || 'User';

  // Track if already initialized to prevent multiple loads
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return; // Already initialized

    let mounted = true;
    let cleanupFunctions: (() => void)[] = [];

    const initialize = async () => {
      if (!mounted) return;

      await loadPartnerInfo();
      await loadRecentPhotos();
      await checkDailyLimit();
      setupPresence();

      // Setup photo refresh listener
      const RealtimeService = (await import('../services/RealtimeService')).default;
      const handlePhotoUpdate = () => {
        console.log('🔔 [UPLOAD] Photo update - refreshing recent photos');
        loadRecentPhotos();
      };

      RealtimeService.on('moment_available', handlePhotoUpdate);

      cleanupFunctions.push(() => {
        RealtimeService.off('moment_available', handlePhotoUpdate);
      });

      // Setup listeners
      const cleanupPairing = await setupPairingListener();
      if (cleanupPairing) cleanupFunctions.push(cleanupPairing);

      setIsInitialized(true);
    };

    initialize();

    // Heart pulse animation - smooth and romantic
    const pulseHeart = () => {
      Animated.sequence([
        Animated.spring(heartScale, {
          toValue: 1.3,
          useNativeDriver: true,
        }),
        Animated.spring(heartScale, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    };

    // Initial pulse after delay
    setTimeout(pulseHeart, 500);

    // Repeat pulse every 1.5 seconds (faster)
    const interval = setInterval(pulseHeart, 1500);

    return () => {
      // Cleanup
      mounted = false;
      cleanupFunctions.forEach(fn => fn());
      cleanupPresence();
      clearInterval(interval);
    };
  }, [isInitialized]);

  // Remove this - unnecessary logging on every render

  const checkDailyLimit = async () => {
    try {
      const { remaining } = await PremiumService.canSendMoment();
      setDailyMomentsRemaining(remaining);
    } catch (error) {
      console.error('Error checking daily limit:', error);
    }
  };

  const handleSendNote = async (content: string, expiresIn24h: boolean) => {
    try {
      // Check if partner is connected
      if (!isPartnerConnected) {
        setAlertMessage('Please connect with your partner first 💕');
        setShowErrorAlert(true);
        return;
      }

      // Check premium
      const hasPremium = await PremiumService.isPremium();
      if (!hasPremium) {
        setShowNoteModal(false);
        setShowUpgradePrompt(true);
        return;
      }

      // Get token
      const token = await getToken();
      if (!token) {
        setAlertMessage('Authentication error. Please try again.');
        setShowErrorAlert(true);
        return;
      }

      // Send note
      const result = await SharedNotesService.sendNote(content, expiresIn24h);

      if (result.success) {
        setAlertMessage(`Your note has been sent to ${partnerName} 💕`);
        setShowSuccessAlert(true);
      } else {
        setAlertMessage(result.error || 'Failed to send note');
        setShowErrorAlert(true);
      }
    } catch (error) {
      console.error('Error sending note:', error);
      setAlertMessage('Failed to send note. Please try again.');
      setShowErrorAlert(true);
    }
  };

  const handleOpenNoteModal = async () => {
    // Check if partner is connected
    if (!isPartnerConnected) {
      setAlertMessage('Please connect with your partner first to send notes 💕');
      setShowErrorAlert(true);
      return;
    }

    // Check premium
    const hasPremium = await PremiumService.isPremium();
    if (!hasPremium) {
      setShowUpgradePrompt(true);
      return;
    }

    setShowNoteModal(true);
  };

  const setupPresence = async () => {
    try {
      if (!user || !isPremium) return;

      const RealtimeService = (await import('../services/RealtimeService')).default;
      const PresenceService = (await import('../services/PresenceService')).default;

      // Load saved presence
      const presence = await PresenceService.getPartnerPresence();
      if (presence) {
        setIsPartnerOnline(presence.isOnline);
        setPartnerLastSeen(presence.lastSeen);
      }

      // Listen for presence updates
      RealtimeService.on('partner_presence', (data: any) => {
        PresenceService.updatePartnerPresence(
          data.userId,
          data.isOnline,
          new Date(data.timestamp)
        );
        setIsPartnerOnline(data.isOnline);
        setPartnerLastSeen(new Date(data.timestamp));
      });

      // Listen for heartbeats
      RealtimeService.on('partner_heartbeat', (data: any) => {
        setPartnerLastSeen(new Date(data.timestamp));
      });

      // Start sending heartbeats
      RealtimeService.startHeartbeat(user.id);

      console.log('✅ Presence setup complete');
    } catch (error) {
      console.error('Error setting up presence:', error);
    }
  };

  const cleanupPresence = async () => {
    try {
      const RealtimeService = (await import('../services/RealtimeService')).default;
      RealtimeService.stopHeartbeat();
    } catch (error) {
      console.error('Error cleaning up presence:', error);
    }
  };

  const getLastSeenText = () => {
    if (!partnerLastSeen) return '';

    const now = new Date();
    const diffMs = now.getTime() - partnerLastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return 'Recently';
  };

  const handleOpenTimeLockModal = async () => {
    // Check if partner is connected
    if (!isPartnerConnected) {
      setAlertMessage('Please connect with your partner first 💕');
      setShowErrorAlert(true);
      return;
    }

    // Check premium
    const hasPremium = await PremiumService.isPremium();
    if (!hasPremium) {
      setShowUpgradePrompt(true);
      return;
    }

    setShowTimeLockModal(true);
  };

  const handleSendTimeLock = async (content: string, unlockDate: Date) => {
    try {
      // Check if partner is connected
      if (!isPartnerConnected) {
        setAlertMessage('Please connect with your partner first 💕');
        setShowErrorAlert(true);
        return;
      }

      // Check premium
      const hasPremium = await PremiumService.isPremium();
      if (!hasPremium) {
        setShowTimeLockModal(false);
        setShowUpgradePrompt(true);
        return;
      }

      // Get token
      const token = await getToken();
      if (!token) {
        setAlertMessage('Authentication error. Please try again.');
        setShowErrorAlert(true);
        return;
      }

      // Send time-lock message
      const result = await TimeLockService.createTimeLock(content, unlockDate, token);

      if (result.success) {
        const dateStr = unlockDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        setAlertMessage(`Your message will unlock on ${dateStr} 🔒💕`);
        setShowSuccessAlert(true);
      } else {
        setAlertMessage(result.error || 'Failed to create time-lock message');
        setShowErrorAlert(true);
      }
    } catch (error) {
      console.error('Error sending time-lock:', error);
      setAlertMessage('Failed to create time-lock message. Please try again.');
      setShowErrorAlert(true);
    }
  };

  // Handle Thinking Ping
  const handleSendPing = async () => {
    try {
      if (!isPartnerConnected) {
        setAlertMessage('Please connect with your partner first 💕');
        setShowErrorAlert(true);
        return;
      }

      // Haptic feedback
      const { Vibration } = await import('react-native');
      Vibration.vibrate([0, 250, 100, 250]); // Stronger Heartbeat

      const result = await PingService.sendPing();

      if (result.success) {
        setAlertMessage(`Sent! ${partnerName} will feel your love 💕`);
        setShowSuccessAlert(true);
      } else if (result.remaining === 0) {
        setAlertMessage('Daily limit reached! Upgrade to Premium for unlimited 💎');
        setShowErrorAlert(true);
      } else {
        setAlertMessage(result.error || 'Failed to send ping');
        setShowErrorAlert(true);
      }
    } catch (error) {
      console.error('Error sending ping:', error);
      setAlertMessage('Failed to send ping. Please try again.');
      setShowErrorAlert(true);
    }
  };


  const loadPartnerInfo = async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

      // ⚡ FAST: Load cached partner info first (instant display)
      try {
        const cachedPartner = await AsyncStorage.getItem('partner_info');
        if (cachedPartner) {
          const partner = JSON.parse(cachedPartner);
          setPartnerName(partner.displayName);
          setIsPartnerConnected(true);
          console.log('⚡ [PARTNER] Loaded from cache:', partner.displayName);
        }
      } catch (cacheError) {
        console.log('⚠️ [PARTNER] No cache, fetching fresh');
      }

      // Fetch fresh pair info
      const pair = await PairingService.getPair();
      const partner = pair?.partner;

      if (partner) {
        setPartnerName(partner.displayName);
        setIsPartnerConnected(true);
        // Cache for next time
        await AsyncStorage.setItem('partner_info', JSON.stringify(partner));

        // 💕 Sync partner name to widget for display
        try {
          const WidgetService = (await import('../services/WidgetService')).default;
          await WidgetService.savePartnerName(partner.displayName);
        } catch (widgetError) {
          console.log('⚠️ Widget sync skipped:', widgetError);
        }

        // Calculate Streak (Days Connected)
        if (pair?.pairedAt) {
          const startDate = new Date(pair.pairedAt);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setStreakDays(diffDays > 0 ? diffDays : 1);
        } else {
          setStreakDays(1);
        }

        console.log('✅ [PARTNER] Loaded and cached:', partner.displayName);
      } else {
        // If no partner, show solo mode
        setPartnerName('Solo Mode');
        setIsPartnerConnected(false);
        // Clear cache
        await AsyncStorage.removeItem('partner_info');
      }
    } catch (error) {
      console.error('Error loading partner:', error);
      // Fallback to solo mode if pairing service fails
      setPartnerName('Solo Mode');
      setIsPartnerConnected(false);
    }
  };

  const setupPairingListener = async () => {
    try {
      const RealtimeService = (await import('../services/RealtimeService')).default;

      // Listen for partner connected events
      const handlePartnerConnected = async (data: any) => {
        console.log('🎉 Partner connected on home screen, reloading partner info...');
        await loadPartnerInfo();
      };

      // Listen for partner disconnected events
      const handlePartnerDisconnected = async (data: any) => {
        console.log('💔 Partner disconnected, clearing ALL pairing data...');
        setPartnerName('Your Person');
        setIsPartnerConnected(false);

        // 🔥 FIX: Clear ALL pairing data using PairingService
        try {
          const PairingService = (await import('../services/PairingService')).default;
          await PairingService.removePair();
          console.log('✅ All pairing data cleared');
        } catch (clearError) {
          console.error('Error clearing pairing data:', clearError);
        }

        // Show alert
        setAlertMessage('Your partner has disconnected');
        setShowErrorAlert(true);
      };

      RealtimeService.on('partner_connected', handlePartnerConnected);
      RealtimeService.on('pairing_success', handlePartnerConnected);
      RealtimeService.on('partner_disconnected', handlePartnerDisconnected);

      // Cleanup
      return () => {
        RealtimeService.off('partner_connected', handlePartnerConnected);
        RealtimeService.off('pairing_success', handlePartnerConnected);
        RealtimeService.off('partner_disconnected', handlePartnerDisconnected);
      };
    } catch (error) {
      console.error('Error setting up pairing listener:', error);
    }
  };

  const setupPhotoReceiveListener = async () => {
    try {
      const RealtimeService = (await import('../services/RealtimeService')).default;

      // ⚡ IMPROVED: Listen for multiple events to ensure Recent Moments updates
      const handlePhotoUpdate = async (eventName: string) => {
        console.log(`📥 ${eventName} - updating Recent Moments!`);

        try {
          // Small delay to ensure photo is saved
          await new Promise(resolve => setTimeout(resolve, 300));

          // Reload recent photos to show the new one
          await loadRecentPhotos();
          console.log('✅ Recent Moments updated with new photo');
        } catch (error) {
          console.error('Error reloading recent photos:', error);
        }
      };

      // Listen to multiple events for maximum reliability
      const handleMomentAvailable = () => handlePhotoUpdate('moment_available');
      const handleNewMoment = () => handlePhotoUpdate('new_moment');

      RealtimeService.on('moment_available', handleMomentAvailable);
      RealtimeService.on('new_moment', handleNewMoment);

      console.log('✅ Photo receive listeners registered');

      // Cleanup
      return () => {
        RealtimeService.off('moment_available', handleMomentAvailable);
        RealtimeService.off('new_moment', handleNewMoment);
      };
    } catch (error) {
      console.error('Error setting up photo receive listener:', error);
    }
  };



  /**
   * ⚡ Load latest 4 photos for recent moments (Cloudinary URLs - fast!)
   */
  const loadRecentPhotos = async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const CACHE_KEY = '@pairly_recent_photos';

      // ⚡ FAST: Load cached photos first (prevents flicker)
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const cachedPhotos = JSON.parse(cached);
          if (cachedPhotos.length > 0) {
            setRecentPhotos(cachedPhotos);
            console.log('⚡ [RECENT] Loaded from cache');
          }
        }
      } catch (cacheError) {
        // Ignore cache errors
      }

      // Fetch fresh data from backend
      const ApiClient = (await import('../utils/apiClient')).default;
      const response = await ApiClient.get('/moments/all') as any;

      if (response.success && response.data?.moments) {
        // Get last 4 photo URLs directly (Cloudinary URLs - fast!)
        const recentUrls = response.data.moments
          .slice(0, 4)
          .map((m: any) => m.photoUrl)
          .filter((url: string) => url); // Filter out null/undefined

        // Only update if we have new photos (prevents flicker)
        if (recentUrls.length > 0) {
          setRecentPhotos(recentUrls);
          // Cache for next time
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(recentUrls));
          console.log(`✅ [RECENT] Loaded ${recentUrls.length} photos`);
        }
      }
      // Don't set empty if API fails - keep cached data
    } catch (error) {
      console.error('Error loading recent photos:', error);
      // Keep existing photos on error (no flicker)
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);

    // Reload all data
    await Promise.all([
      loadPartnerInfo(),
      loadRecentPhotos(),
      checkDailyLimit(),
    ]);

    setRefreshing(false);
  };

  const handleCapturePress = async () => {
    // Check if partner is connected first
    if (!isPartnerConnected) {
      setAlertMessage('Please connect with your partner first to share moments 💕');
      setShowErrorAlert(true);
      return;
    }

    // Check daily limit
    const { canSend, remaining, limit } = await PremiumService.canSendMoment();

    if (!canSend) {
      // Show upgrade prompt
      setShowUpgradePrompt(true);
      return;
    }

    // Animate button press
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    // Show photo options
    setShowPhotoOptions(true);
  };

  const handleTakePhoto = async () => {
    try {
      setShowPhotoOptions(false);
      setUploading(true);

      const PhotoService = (await import('../services/PhotoService')).default;
      const photo = await PhotoService.capturePhoto();

      if (!photo) {
        setUploading(false);
        return; // User cancelled
      }

      // Show preview screen
      setSelectedPhotoUri(photo.uri);
      setShowPreview(true);
      setUploading(false);
    } catch (error: any) {
      setAlertMessage(error.message || 'Failed to capture photo');
      setShowErrorAlert(true);
      setUploading(false);
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      setShowPhotoOptions(false);
      setUploading(true);

      const PhotoService = (await import('../services/PhotoService')).default;
      const photo = await PhotoService.selectFromGallery();

      if (!photo) {
        setUploading(false);
        return; // User cancelled
      }

      // Show preview screen
      setSelectedPhotoUri(photo.uri);
      setShowPreview(true);
      setUploading(false);
    } catch (error: any) {
      setAlertMessage(error.message || 'Failed to select photo');
      setShowErrorAlert(true);
      setUploading(false);
    }
  };

  const handleUploadPhoto = async (note?: string, scheduledTime?: Date, duration?: number) => {
    try {
      if (!selectedPhotoUri) return;

      // ⚡ REMOVED: Don't save here - MomentService.uploadPhoto already saves it
      // This was causing duplicate saves!

      if (!isPartnerConnected) {
        // Solo mode - just save locally
        setAlertMessage(scheduledTime ? 'Your moment has been scheduled' : 'Your moment has been saved');
        setShowSuccessAlert(true);
      } else {
        // Paired mode - upload to server with note and optional schedule
        const MomentService = (await import('../services/MomentService')).default;

        if (scheduledTime && duration) {
          // Schedule the moment with expiry
          const result = await MomentService.schedulePhoto({
            photo: { uri: selectedPhotoUri },
            scheduledTime: scheduledTime, // Pass Date object directly
            caption: note,
            expiresIn: duration, // 🔥 Photo expires after this many hours
          });

          if (result.success) {
            setAlertMessage(`Your moment will be sent to ${partnerName} at ${scheduledTime.toLocaleString()}`);
            setShowSuccessAlert(true);
          } else {
            setAlertMessage(result.error || 'Failed to schedule moment');
            setShowErrorAlert(true);
          }
        } else {
          // Send immediately with optional widget expiry
          setUploading(true);
          const result = await MomentService.uploadPhoto({
            uri: selectedPhotoUri,
          }, note, duration); // Pass duration for widget expiry
          setUploading(false);

          if (result.success) {
            // Increment daily counter
            await PremiumService.incrementMomentCount();

            // Update remaining count
            await checkDailyLimit();

            // Show success with partner name
            setAlertMessage(`✅ Moment sent to ${partnerName}!\n\nThey'll receive it instantly 💕`);
            setShowSuccessAlert(true);

            // Send notification to partner via Socket.IO
            try {
              const RealtimeService = (await import('../services/RealtimeService')).default;
              RealtimeService.emit('moment_sent_notification', {
                senderName: userName,
                timestamp: Date.now(),
              });
            } catch (error) {
              console.log('Could not send notification:', error);
            }
          } else {
            // Check if it's a daily limit error
            if (result.error?.includes('Daily limit reached') || result.error?.includes('upgradeRequired')) {
              setShowUpgradePrompt(true);
            } else {
              setAlertMessage(result.error || 'Failed to upload photo');
              setShowErrorAlert(true);
            }
          }
        }
      }

      // Close preview
      setShowPreview(false);
      setSelectedPhotoUri(null);

      // Reload recent photos with animation
      await loadRecentPhotos();

      // ⚡ REMOVED: Don't update widget when SENDING photo
      // Widget should only update when RECEIVING photo from partner
      // This is handled in MomentService.receivePhoto()
    } catch (error: any) {
      setAlertMessage(error.message || 'Failed to upload photo');
      setShowErrorAlert(true);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setSelectedPhotoUri(null);
  };

  // Define all animated styles at component top level
  const animatedButtonStyle = {
    transform: [{ scale: scale }],
  };

  const animatedViewAllStyle = {
    transform: [{ scale: viewAllScale }],
  };

  const animatedSettingsStyle = {
    opacity: 1, // Simple static opacity
  };

  const animatedSettingsIconStyle = {
    transform: [
      { scale: settingsScale },
      {
        rotate: settingsRotate.interpolate({
          inputRange: [0, 90],
          outputRange: ['0deg', '90deg'],
        })
      }
    ],
  };

  const animatedHeartStyle = {
    transform: [{ scale: heartScale }],
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        {isPartnerConnected ? (
          <>
            {/* Connected Mode - Overlapping Avatars (Clickable for Settings) */}
            <TouchableOpacity
              style={styles.avatarStack}
              onPress={onNavigateToSettings}
              activeOpacity={0.7}
            >
              <View style={[styles.stackedAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.stackedAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={[styles.stackedAvatar, styles.stackedAvatarSecond, { backgroundColor: colors.secondary }]}>
                <Text style={styles.stackedAvatarText}>{partnerName.charAt(0).toUpperCase()}</Text>
              </View>
            </TouchableOpacity>

            {/* Streak Badge */}
            <View style={styles.streakBadge}>
              <Ionicons name="heart" size={16} color="#FF6B6B" />
              <Text style={styles.streakText}>{streakDays} days</Text>
            </View>
          </>
        ) : (
          <>
            {/* Solo Mode - User Profile + Greeting (Clickable for Settings) */}
            <TouchableOpacity
              style={styles.soloHeader}
              onPress={onNavigateToSettings}
              activeOpacity={0.7}
            >
              <View style={[styles.stackedAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.stackedAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.soloGreeting}>
                <Text style={styles.soloHey}>Hey there! 👋</Text>
                <Text style={styles.soloName}>{userName.split(' ')[0]}</Text>
              </View>
            </TouchableOpacity>

            {/* Connect Button for Solo */}
            {onNavigateToPairing && (
              <TouchableOpacity
                style={styles.connectButton}
                onPress={onNavigateToPairing}
                activeOpacity={0.7}
              >
                <Ionicons name="heart-outline" size={16} color="white" />
                <Text style={styles.connectButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Main Content - Centered with Pull to Refresh */}
      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, colors.secondary]}
            title="Pull to refresh"
            titleColor={colors.textSecondary}
          />
        }
      >
        {/* Hero Card - Theme Aware */}
        {/* Hero Card - Theme Aware - Solid Background (No Gradient) */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          {/* Top Row - Status Only */}
          <View style={styles.heroTopRow}>
            {/* Connected Status Badge */}
            <View style={[
              styles.connectedBadge,
              !isPartnerConnected && { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }
            ]}>
              <View style={[
                styles.connectedDot,
                !isPartnerConnected && { backgroundColor: colors.textTertiary }
              ]} />
              <Text style={[
                styles.connectedText,
                !isPartnerConnected && { color: colors.textTertiary }
              ]}>
                {isPartnerConnected ? 'CONNECTED' : 'WAITING'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Capture{'\n'}
            <Text style={[styles.heroTitleGradient, { color: colors.primary }]}>The Moment</Text>
          </Text>

          {/* Bottom Row - Button Only */}
          <View style={styles.heroBottomRow}>
            {/* Snap & Send Button */}
            <Animated.View style={animatedButtonStyle}>
              <TouchableOpacity
                style={[styles.snapSendButton, { backgroundColor: colors.text }, uploading && styles.snapSendButtonDisabled]}
                onPress={handleCapturePress}
                disabled={uploading}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color={colors.background} />
                <Text style={[styles.snapSendText, { color: colors.background }]}>{uploading ? 'Sending...' : 'Snap & Send'}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Quick Actions - 2x2 Grid */}
        {isPremium && isPartnerConnected && (
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {/* Time Counter - Light Blue */}
              {/* Time Counter - Light Blue */}
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: '#BBDEFB' }]}
                onPress={() => setShowTimeCounterModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionTopRow}>
                  <Ionicons name="timer-outline" size={24} color="#2196F3" />
                  <Ionicons name="arrow-forward" size={16} color="#B0BEC5" />
                </View>
                <Text style={[styles.quickActionText, { color: '#1F2937' }]}>Time Counter</Text>
              </TouchableOpacity>

              {/* Love Note - Light Pink */}
              {/* Love Note - Light Pink */}
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: '#F8BBD9' }]}
                onPress={handleOpenNoteModal}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionTopRow}>
                  <Ionicons name="heart" size={24} color="#E91E63" />
                  <Ionicons name="arrow-forward" size={16} color="#B0BEC5" />
                </View>
                <Text style={[styles.quickActionText, { color: '#1F2937' }]}>Love Note</Text>
              </TouchableOpacity>

              {/* Capsule - Light Purple */}
              {/* Capsule - Light Purple */}
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: '#E1BEE7' }]}
                onPress={handleOpenTimeLockModal}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionTopRow}>
                  <Ionicons name="time-outline" size={24} color="#9C27B0" />
                  <Ionicons name="arrow-forward" size={16} color="#B0BEC5" />
                </View>
                <Text style={[styles.quickActionText, { color: '#1F2937' }]}>Capsule</Text>
              </TouchableOpacity>

              {/* Thinking - Light Yellow */}
              {/* Thinking - Light Yellow */}
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: '#FFE082' }]}
                onPress={handleSendPing}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionTopRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FF9800" />
                  <Ionicons name="arrow-forward" size={16} color="#B0BEC5" />
                </View>
                <Text style={[styles.quickActionText, { color: '#1F2937' }]}>Thinking</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Shared Memories Section */}
        <View style={styles.sharedMemoriesSection}>
          <View style={styles.sharedMemoriesHeader}>
            <Text style={styles.sectionTitle}>Shared Memories</Text>
            <TouchableOpacity
              onPress={() => onNavigateToGallery?.()}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllLink}>See all &gt;</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.memoriesScroll}
          >
            {recentPhotos.length > 0 ? (
              recentPhotos.slice(0, 6).map((photoUri, index) => (
                <View key={index} style={styles.memoryThumb}>
                  {photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.memoryImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.memoryPlaceholder}>
                      <Ionicons name="image" size={24} color={colors.textTertiary} />
                    </View>
                  )}
                </View>
              ))
            ) : (
              // Placeholder when no photos
              [0, 1, 2].map((index) => (
                <View key={index} style={[styles.memoryThumb, styles.memoryPlaceholder]}>
                  <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Shared Note Modal */}
      <SharedNoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSend={handleSendNote}
        partnerName={partnerName}
      />

      {/* Time-Lock Modal */}
      <TimeLockModal
        visible={showTimeLockModal}
        onClose={() => setShowTimeLockModal(false)}
        onSend={handleSendTimeLock}
        partnerName={partnerName}
      />

      {/* Upgrade Prompt */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => {
          setShowUpgradePrompt(false);
          onNavigateToPremium?.();
        }}
        type="daily-limit"
        currentCount={3}
        limit={3}
      />

      {/* Photo Options Alert */}
      <CustomAlert
        visible={showPhotoOptions}
        title="Share a Moment"
        message="Choose how you want to capture this moment"
        icon="camera"
        iconColor={colors.primary}
        buttons={[
          {
            text: 'Take Photo',
            style: 'default',
            onPress: () => {
              setShowPhotoOptions(false);
              handleTakePhoto();
            },
          },
          {
            text: 'Choose from Gallery',
            style: 'default',
            onPress: () => {
              setShowPhotoOptions(false);
              handleChooseFromGallery();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setShowPhotoOptions(false),
          },
        ]}
        onClose={() => setShowPhotoOptions(false)}
      />

      {/* Success Alert */}
      <CustomAlert
        visible={showSuccessAlert}
        title="Success!"
        message={alertMessage}
        icon="checkmark-circle"
        iconColor={colors.success}
        buttons={[
          {
            text: 'OK',
            style: 'default',
            onPress: () => setShowSuccessAlert(false),
          },
        ]}
        onClose={() => setShowSuccessAlert(false)}
      />

      {/* Error Alert */}
      <CustomAlert
        visible={showErrorAlert}
        title="Error"
        message={alertMessage}
        icon="alert-circle"
        iconColor={colors.error}
        buttons={[
          {
            text: 'OK',
            style: 'default',
            onPress: () => setShowErrorAlert(false),
          },
        ]}
        onClose={() => setShowErrorAlert(false)}
      />

      {/* Photo Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {selectedPhotoUri && (
          <PhotoPreviewScreen
            photoUri={selectedPhotoUri}
            onCancel={handleCancelPreview}
            onUpload={handleUploadPhoto}
            partnerName={partnerName}
          />
        )}
      </Modal>

      {/* Time Counter Modal */}
      <TimeCounterModal
        visible={showTimeCounterModal}
        onClose={() => setShowTimeCounterModal(false)}
        partnerName={partnerName}
        onSave={(date) => {
          setAlertMessage(`Countdown started! Meeting ${partnerName} on ${date.toLocaleDateString()} 💕`);
          setShowSuccessAlert(true);
        }}
      />
    </View >
  );
};

// Create styles function that accepts colors
const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.huge,
    paddingBottom: spacing.lg,
  },

  // Overlapping Avatar Stack
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  stackedAvatarSecond: {
    marginLeft: -16,
  },
  stackedAvatarText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: 'white',
  },

  // Streak Badge
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  streakText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
  },

  // Solo Mode Header
  soloHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  soloGreeting: {
    gap: 2,
  },
  soloHey: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  soloName: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  connectButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: 'white',
  },

  // Couple Mode - Compact
  coupleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  coupleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  personCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatarCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarTextCompact: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: 'white',
  },
  nameCompact: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  heartCompact: {
    marginLeft: spacing.xs,
    marginRight: spacing.md,
  },
  onlineDotCompact: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },

  // Solo Mode - Compact
  soloContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  soloCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  soloInfoCompact: {
    flex: 1,
  },
  // Old soloGreeting removed - using new View-compatible version above
  soloNameCompact: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.text,
  },
  userName: {
    fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 36,
    color: colors.text,
    letterSpacing: 0.5,
  },
  settingsButtonCompact: {
    width: 44,
    height: 44,
  },
  settingsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Partner Badge - Compact
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.secondaryPastel,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  partnerText: {
    fontFamily: 'Inter-SemiBold', fontSize: 14,
    color: colors.secondary,
  },
  presenceText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Main Content - Centered with Pull to Refresh
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  // Hero Card - Soft Pink Gradient
  heroCard: {
    width: '100%',
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.xl,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.mintLight ? `${colors.mintLight}20` : 'rgba(52, 211, 153, 0.1)', // Dynamic with fallback
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.mintLight ? `${colors.mintLight}40` : 'transparent',
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mint || '#34D399',
  },
  connectedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.mint || '#34D399',
    letterSpacing: 0.5,
  },
  galleryIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    lineHeight: 38,
    color: colors.text,
    textAlign: 'left',
    marginBottom: spacing.md,
  },
  heroTitleGradient: {
    color: '#A855F7',
  },
  heroSubtitle: {
    fontFamily: 'Inter-Medium', // Slightly bolder
    fontSize: 17, // Larger text
    color: colors.textSecondary,
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: spacing.xl, // Space before button
    marginTop: spacing.xs,
  },
  heroBottomRow: {
    flexDirection: 'column', // Vertical layout
    alignItems: 'stretch',    // Full width
    width: '100%',
    marginTop: spacing.sm,
  },
  snapSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.text,
    paddingVertical: 18, // Taller button
    borderRadius: 20,
    width: '100%',
    ...shadows.md,
  },
  snapSendButtonDisabled: {
    opacity: 0.6,
  },
  snapSendText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.background,
  },

  // Keep old styles for backward compatibility
  statusLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  statusLabelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.secondary,
    letterSpacing: 1,
  },
  cameraIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroTitleHighlight: {
    color: colors.secondary,
  },
  takePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.full,
    minWidth: 200,
  },
  takePhotoButtonDisabled: {
    opacity: 0.6,
  },
  takePhotoText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
  },

  // Capture Button - Large & Prominent
  captureContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    ...shadows.xl,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 70,
  },
  // Quick Actions - 2x2 Grid
  quickActionsSection: {
    width: '100%',
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickActionCard: {
    width: '47%',
    borderRadius: 20,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  quickActionIconTop: {
    marginBottom: spacing.lg,
  },
  quickActionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: spacing.lg,
  },
  quickActionCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
  },

  // Shared Memories Section
  sharedMemoriesSection: {
    width: '100%',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  sharedMemoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  seeAllLink: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.primary,
  },
  memoriesScroll: {
    gap: spacing.md,
  },
  memoryThumb: {
    width: 110,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
  },
  memoryImage: {
    width: '100%',
    height: '100%',
  },
  memoryPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Keep old Recent Moments Card for backward compatibility
  recentCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  recentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recentTitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 17,
    color: colors.text,
  },
  recentBadge: {
    backgroundColor: colors.primaryPastel,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  recentBadgeText: {
    fontFamily: 'Inter-Bold', fontSize: 13,
    color: colors.primary,
  },
  recentPhotosGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  recentPhotoThumb: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  recentPhotoImage: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  viewAllText: {
    fontFamily: 'Inter-SemiBold', fontSize: 15,
    color: colors.primary,
  },

  // Bottom Action Bar
  bottomBar: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.md,
  },
  bottomButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  bottomButtonText: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: colors.darkText,
  },
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  bottomInfoText: {
    fontFamily: 'Inter-Medium', fontSize: 14,
    color: colors.textSecondary,
  },

});
