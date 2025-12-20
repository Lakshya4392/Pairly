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
import { DualCameraModal } from '../components/DualCameraModal';
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
  const { colors } = useTheme();
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
  const [showDualCameraModal, setShowDualCameraModal] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleOpenDualCameraModal = async () => {
    try {
      console.log('🎬 Dual Camera button clicked!');
      console.log('Partner connected:', isPartnerConnected);
      console.log('Premium status:', isPremium);

      // Check if partner is connected
      if (!isPartnerConnected) {
        console.log('⚠️ No partner connected - showing alert');
        setAlertMessage('Please connect with your partner first 💕');
        setShowErrorAlert(true);
        return;
      }

      // Check premium
      const hasPremium = await PremiumService.isPremium();
      console.log('Premium check result:', hasPremium);

      if (!hasPremium) {
        console.log('⚠️ No premium - showing upgrade prompt');
        setShowUpgradePrompt(true);
        return;
      }

      console.log('✅ Opening dual camera modal...');

      // Use setTimeout to ensure state update happens after current render cycle
      setTimeout(() => {
        console.log('🔄 Setting showDualCameraModal to true');
        setShowDualCameraModal(true);
      }, 0);
    } catch (error) {
      console.error('❌ Error opening dual camera modal:', error);
    }
  };

  const handleCaptureDualMoment = async (title: string) => {
    try {
      console.log('📸 Starting dual camera capture with title:', title);

      // Close modal first
      setShowDualCameraModal(false);

      // Small delay to let modal close smoothly
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture photo
      const PhotoService = (await import('../services/PhotoService')).default;
      console.log('📷 Opening camera...');
      const photo = await PhotoService.capturePhoto();

      if (!photo) {
        console.log('⚠️ User cancelled photo capture');
        return; // User cancelled
      }

      console.log('✅ Photo captured:', photo.uri);

      // Get token
      const token = await getToken();
      if (!token) {
        setAlertMessage('Authentication error. Please try again.');
        setShowErrorAlert(true);
        return;
      }

      // Show uploading state
      setUploading(true);

      // Create dual moment
      const DualCameraService = (await import('../services/DualCameraService')).default;
      console.log('📤 Creating dual moment...');
      const result = await DualCameraService.createDualMoment(title, photo.uri, token);

      setUploading(false);

      if (result.success) {
        console.log('✅ Dual moment created successfully');
        setAlertMessage(`✨ Your photo is saved!\n\nWaiting for ${partnerName} to add theirs 💞`);
        setShowSuccessAlert(true);

        // Reload recent photos
        await loadRecentPhotos();
      } else {
        console.error('❌ Failed to create dual moment:', result.error);
        setAlertMessage(result.error || 'Failed to create dual moment');
        setShowErrorAlert(true);
      }
    } catch (error: any) {
      console.error('❌ Error capturing dual moment:', error);
      setUploading(false);
      setAlertMessage(error.message || 'Failed to capture photo. Please try again.');
      setShowErrorAlert(true);
    }
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

      // Fetch fresh partner info
      const partner = await PairingService.getPartner();
      if (partner) {
        setPartnerName(partner.displayName);
        setIsPartnerConnected(true);
        // Cache for next time
        await AsyncStorage.setItem('partner_info', JSON.stringify(partner));
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
        console.log('💔 Partner disconnected, updating UI...');
        setPartnerName('Your Person');
        setIsPartnerConnected(false);

        // Clear local storage
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.removeItem('partner_info');
        await AsyncStorage.removeItem('partner_id');

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

      console.log('✅ Photo receive listeners registered (3 events)');

      // ⚡ NEW: Also poll for updates every 5 seconds when app is active
      const pollInterval = setInterval(async () => {
        try {
          await loadRecentPhotos();
        } catch (error) {
          // Silent
        }
      }, 5000);

      // Cleanup
      return () => {
        RealtimeService.off('moment_available', handleMomentAvailable);
        RealtimeService.off('new_moment', handleNewMoment);
        clearInterval(pollInterval);
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
          // Schedule the moment
          const result = await MomentService.schedulePhoto({
            photo: { uri: selectedPhotoUri },
            scheduledTime: scheduledTime, // Pass Date object directly
            caption: note
          });

          if (result.success) {
            setAlertMessage(`Your moment will be sent to ${partnerName} at ${scheduledTime.toLocaleString()}`);
            setShowSuccessAlert(true);
          } else {
            setAlertMessage(result.error || 'Failed to schedule moment');
            setShowErrorAlert(true);
          }
        } else {
          // Send immediately
          setUploading(true);
          const result = await MomentService.uploadPhoto({
            uri: selectedPhotoUri,
          }, note);
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
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header - Compact & Modern */}
      <View style={styles.header}>
        {isPartnerConnected ? (
          /* Couple Mode - Compact Cards */
          <View style={styles.coupleContainer}>
            <LinearGradient
              colors={[colors.primary + '15', colors.primaryLight + '15']}
              style={styles.coupleCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {/* User */}
              <View style={styles.personCompact}>
                <View style={[styles.avatarCompact, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarTextCompact}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.nameCompact} numberOfLines={1}>{userName}</Text>
              </View>

              {/* Heart */}
              <Animated.View style={[styles.heartCompact, animatedHeartStyle]}>
                <Ionicons name="heart" size={18} color="#FF6B9D" />
              </Animated.View>

              {/* Partner */}
              <View style={styles.personCompact}>
                <View style={[styles.avatarCompact, { backgroundColor: colors.secondary }]}>
                  <Text style={styles.avatarTextCompact}>{partnerName.charAt(0).toUpperCase()}</Text>
                  {isPremium && isPartnerOnline && (
                    <View style={styles.onlineDotCompact} />
                  )}
                </View>
                <Text style={styles.nameCompact} numberOfLines={1}>{partnerName}</Text>
              </View>
            </LinearGradient>
          </View>
        ) : (
          /* Solo Mode - Compact Card */
          <View style={styles.soloContainer}>
            <LinearGradient
              colors={[colors.primary + '15', colors.primaryLight + '15']}
              style={styles.soloCardCompact}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={[styles.avatarCompact, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarTextCompact}>{userName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.soloInfoCompact}>
                <Text style={styles.soloGreeting}>Hey there!</Text>
                <Text style={styles.soloNameCompact} numberOfLines={1}>{userName}</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        <Animated.View style={animatedSettingsStyle}>
          <TouchableOpacity
            style={styles.settingsButtonCompact}
            onPress={() => {
              // Scale + Rotate animation
              Animated.parallel([
                Animated.sequence([
                  Animated.timing(settingsScale, {
                    toValue: 0.85,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                  Animated.spring(settingsScale, {
                    toValue: 1,
                    useNativeDriver: true,
                  }),
                ]),
                Animated.sequence([
                  Animated.timing(settingsRotate, {
                    toValue: 90,
                    duration: 200,
                    useNativeDriver: true,
                  }),
                  Animated.timing(settingsRotate, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                  }),
                ]),
              ]).start();
              setTimeout(() => onNavigateToSettings(), 150);
            }}
            activeOpacity={0.7}
          >
            <Animated.View style={animatedSettingsIconStyle}>
              <View style={styles.settingsIconContainer}>
                <Ionicons name="settings-sharp" size={22} color={colors.primary} />
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
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
        {/* Hero Card with Capture Button */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            {!isPartnerConnected ? 'Capture Your Moment' : `Share with ${partnerName}`}
          </Text>
          <Text style={styles.heroSubtitle}>
            {!isPartnerConnected
              ? 'Save your memories and moments'
              : 'Create and share beautiful moments together 💕'
            }
          </Text>

          <Animated.View style={[animatedButtonStyle, styles.captureContainer]}>
            <TouchableOpacity
              style={[styles.captureButton, uploading && styles.captureButtonDisabled]}
              onPress={handleCapturePress}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={uploading ? [colors.disabled, colors.disabled] as const : dynamicGradients.primary as any}
                style={styles.captureButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {uploading ? (
                  <Ionicons name="cloud-upload" size={48} color="white" />
                ) : (
                  <Ionicons name="camera" size={48} color="white" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Premium Quick Actions */}
          {isPremium && isPartnerConnected && (
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleOpenDualCameraModal}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="camera-reverse" size={18} color="#4CAF50" />
                </View>
                <Text style={styles.quickActionText}>Dual View</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleOpenNoteModal}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#FFE5EC' }]}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#FF6B9D" />
                </View>
                <Text style={styles.quickActionText}>Send Note</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleOpenTimeLockModal}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="time" size={18} color="#9B59B6" />
                </View>
                <Text style={styles.quickActionText}>Time-Lock</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Moments Card - Always show for testing */}
        <View style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <View style={styles.recentTitleContainer}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.recentTitle}>Recent Moments</Text>
            </View>
            {recentPhotos.length > 0 && (
              <View style={styles.recentBadge}>
                <Text style={styles.recentBadgeText}>{recentPhotos.length}</Text>
              </View>
            )}
          </View>
          <View style={styles.recentPhotosGrid}>
            {recentPhotos.length > 0 ? (
              recentPhotos.slice(0, 4).map((photoUri, index) => (
                <View key={index} style={styles.recentPhotoThumb}>
                  {photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.recentPhotoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="image" size={24} color={colors.textTertiary} />
                  )}
                </View>
              ))
            ) : (
              // Placeholder when no photos
              [0, 1, 2, 3].map((index) => (
                <View key={index} style={styles.recentPhotoThumb}>
                  <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
                </View>
              ))
            )}
          </View>
          <Animated.View style={animatedViewAllStyle}>
            <TouchableOpacity
              style={styles.viewAllContainer}
              onPress={() => {
                Animated.sequence([
                  Animated.timing(viewAllScale, {
                    toValue: 0.95,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                  Animated.spring(viewAllScale, {
                    toValue: 1,
                    useNativeDriver: true,
                  }),
                ]).start();
                setTimeout(() => onNavigateToGallery?.(), 100);
              }}
              activeOpacity={1}
            >
              <Text style={styles.viewAllText}>View All Memories</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar - Only show if not connected */}
      {!isPartnerConnected && onNavigateToPairing && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={onNavigateToPairing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={dynamicGradients.secondary as any}
              style={styles.bottomButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="people" size={20} color="white" />
              <Text style={styles.bottomButtonText}>Connect with Partner</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Dual Camera Modal */}
      <DualCameraModal
        visible={showDualCameraModal}
        onClose={() => setShowDualCameraModal(false)}
        onCapture={handleCaptureDualMoment}
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
    </View>
  );
};

// Create styles function that accepts colors
const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header - Compact & Modern
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.huge,
    paddingBottom: spacing.md,
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
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: 'white',
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
  soloGreeting: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.textSecondary,
  },
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

  // Hero Card
  heroCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxxl,
    alignItems: 'center',
    marginBottom: spacing.xxl,
    ...shadows.lg,
  },
  heroTitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 20, lineHeight: 28,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
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
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    width: '100%',
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  quickActionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Recent Moments Card
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
    color: 'white',
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
