import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { CustomAlert } from '../components/CustomAlert';
import { PhotoPreviewScreen } from './PhotoPreviewScreen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@clerk/clerk-expo';
import { colors, gradients } from '../theme/colorsIOS';
import { spacing, layout, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import PairingService from '../services/PairingService';

interface UploadScreenProps {
  onNavigateToSettings: () => void;
  onNavigateToPairing?: () => void;
  onNavigateToGallery?: () => void;
  isPremium?: boolean;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({ 
  onNavigateToSettings, 
  onNavigateToPairing,
  onNavigateToGallery,
  isPremium = false
}) => {
  const { user } = useUser();
  const [partnerName, setPartnerName] = useState('Your Person');
  const [uploading, setUploading] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [stats, setStats] = useState({ photosShared: 0, daysActive: 0 });
  const scale = useSharedValue(1);
  const viewAllScale = useSharedValue(1);
  const settingsScale = useSharedValue(1);
  const settingsRotate = useSharedValue(0);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isPartnerConnected, setIsPartnerConnected] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);

  // Get user name from Clerk
  const userName = user?.firstName || user?.username || 'User';

  useEffect(() => {
    loadPartnerInfo();
    loadRecentPhotos();
    loadStats();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('✅ Clerk user loaded:', user.firstName, user.username);
    }
  }, [user]);



  const loadPartnerInfo = async () => {
    try {
      const partner = await PairingService.getPartner();
      if (partner) {
        setPartnerName(partner.displayName);
        setIsPartnerConnected(true);
      } else {
        // If no partner, show solo mode
        setPartnerName('Solo Mode');
        setIsPartnerConnected(false);
      }
    } catch (error) {
      console.error('Error loading partner:', error);
      // Fallback to solo mode if pairing service fails
      setPartnerName('Solo Mode');
      setIsPartnerConnected(false);
    }
  };

  const loadRecentPhotos = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockPhotos = [
        'https://picsum.photos/200/200?random=1',
        'https://picsum.photos/200/200?random=2',
        'https://picsum.photos/200/200?random=3',
        'https://picsum.photos/200/200?random=4',
      ];
      setRecentPhotos(mockPhotos);
    } catch (error) {
      console.error('Error loading recent photos:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Mock data for now - replace with actual API call
      setStats({
        photosShared: 12,
        daysActive: 5,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCapturePress = () => {
    // Animate button press
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );

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

      // Save photo locally first
      const LocalPhotoStorage = (await import('../services/LocalPhotoStorage')).default;
      await LocalPhotoStorage.savePhoto(selectedPhotoUri, 'me', true);
      
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
            uri: selectedPhotoUri,
            width: 0,
            height: 0,
          }, note, scheduledTime, duration);
          
          if (result.success) {
            setAlertMessage(`Your moment will be sent to ${partnerName} at ${scheduledTime.toLocaleString()}`);
            setShowSuccessAlert(true);
          } else {
            setAlertMessage(result.error || 'Failed to schedule moment');
            setShowErrorAlert(true);
          }
        } else {
          // Send immediately
          const result = await MomentService.uploadPhoto({
            uri: selectedPhotoUri,
            width: 0,
            height: 0,
          }, note);
          
          if (result.success) {
            setAlertMessage('Your moment has been shared with your partner');
            setShowSuccessAlert(true);
          } else {
            setAlertMessage(result.error || 'Failed to upload photo');
            setShowErrorAlert(true);
          }
        }
      }
      
      // Close preview
      setShowPreview(false);
      setSelectedPhotoUri(null);
      
      // Reload recent photos
      await loadRecentPhotos();
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
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedViewAllStyle = useAnimatedStyle(() => ({
    transform: [{ scale: viewAllScale.value }],
  }));

  const animatedSettingsStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: settingsScale.value },
      { rotate: `${settingsRotate.value}deg` }
    ],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header - Fixed at top */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.greetingRow}>
            <Text style={styles.greetingText}>Hello,</Text>
            <View style={styles.waveIcon}>
              <Ionicons name="hand-right" size={20} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        
        <Animated.View style={animatedSettingsStyle}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {
              // Scale + Rotate animation
              settingsScale.value = withSequence(
                withTiming(0.85, { duration: 100 }),
                withSpring(1, { damping: 8, stiffness: 150 })
              );
              settingsRotate.value = withSequence(
                withTiming(90, { duration: 200 }),
                withTiming(0, { duration: 200 })
              );
              setTimeout(() => onNavigateToSettings(), 150);
            }}
            activeOpacity={1}
          >
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              style={styles.settingsGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="settings-sharp" size={22} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Main Content - Centered */}
      <View style={styles.mainContent}>
        {/* Partner Status - Compact */}
        {isPartnerConnected && (
          <View style={styles.partnerBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.partnerText}>Connected with {partnerName}</Text>
          </View>
        )}

        {/* Hero Card with Capture Button */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Share Your Moment</Text>
          <Text style={styles.heroSubtitle}>
            {!isPartnerConnected
              ? 'Capture and save your memories' 
              : `Share a special moment with ${partnerName}`
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
                colors={uploading ? [colors.disabled, colors.disabled] : gradients.primary}
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
        </View>

        {/* Recent Moments Card */}
        {recentPhotos.length > 0 && (
          <View style={styles.recentCard}>
            <View style={styles.recentHeader}>
              <View style={styles.recentTitleContainer}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={styles.recentTitle}>Recent Moments</Text>
              </View>
              <View style={styles.recentBadge}>
                <Text style={styles.recentBadgeText}>{recentPhotos.length}</Text>
              </View>
            </View>
            <View style={styles.recentPhotosGrid}>
              {recentPhotos.slice(0, 4).map((photo, index) => (
                <View key={index} style={styles.recentPhotoThumb}>
                  <Ionicons name="image" size={24} color={colors.textTertiary} />
                </View>
              ))}
            </View>
            <Animated.View style={animatedViewAllStyle}>
              <TouchableOpacity 
                style={styles.viewAllContainer}
                onPress={() => {
                  viewAllScale.value = withSequence(
                    withTiming(0.95, { duration: 100 }),
                    withSpring(1, { damping: 10, stiffness: 200 })
                  );
                  setTimeout(() => onNavigateToGallery?.(), 100);
                }}
                activeOpacity={1}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {!isPartnerConnected && onNavigateToPairing ? (
          <TouchableOpacity 
            style={styles.bottomButton}
            onPress={onNavigateToPairing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={gradients.secondary}
              style={styles.bottomButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="people" size={20} color="white" />
              <Text style={styles.bottomButtonText}>Connect with Partner</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.bottomInfo}>
            <Ionicons name="shield-checkmark" size={18} color={colors.success} />
            <Text style={styles.bottomInfoText}>
              {stats.photosShared} photos shared this month
            </Text>
          </View>
        )}
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header - Clean & Minimal
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.massive,
    paddingBottom: spacing.xxl,
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.xl,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  greetingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  waveIcon: {
    width: 28,
    height: 28,
    backgroundColor: colors.primaryPastel,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 36,
    color: colors.text,
    letterSpacing: 0.5,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  settingsGradient: {
    flex: 1,
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

  // Main Content - Centered
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xl,
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

  // Recent Moments Card
  recentCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.xxxl,
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
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: spacing.xl,
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
