import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Modal,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenLock } from '../components/ScreenLock';
import { MemoriesLockModal } from '../components/MemoriesLockModal';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors, gradients } from '../theme/colorsIOS';
import { spacing, borderRadius, layout } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import ApiClient from '../utils/apiClient';

const GALLERY_CACHE_KEY = '@pairly_gallery_cache';

const { width } = Dimensions.get('window');
const imageSize = (width - spacing.xl * 3) / 2;

interface Photo {
  id: string;
  photoUrl: string; // Cloudinary URL for fast loading
  sender: 'me' | 'partner';
  senderName: string;
  partnerName: string;
  timestamp: string;
  uploadedAt: string;
}

interface GalleryScreenProps {
  onBack: () => void;
  isPremium?: boolean;
}

export const GalleryScreen: React.FC<GalleryScreenProps> = ({ onBack, isPremium = false }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [isLocked, setIsLocked] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [showMemoriesLock, setShowMemoriesLock] = useState(false);

  useEffect(() => {
    checkMemoriesLock();
  }, []);

  useEffect(() => {
    if (!needsUnlock) {
      loadPhotos();
    }
  }, [needsUnlock]);

  // ⚡ PERFECT SYSTEM: Auto-refresh gallery on events
  useEffect(() => {
    // Set up interval to refresh photos every 5 seconds when screen is active
    const refreshInterval = setInterval(() => {
      if (!needsUnlock) {
        loadPhotos();
      }
    }, 5000);

    // Listen for photo events from RealtimeService
    const setupEventListeners = async () => {
      const RealtimeService = (await import('../services/RealtimeService')).default;

      const handlePhotoSaved = () => {
        console.log('🔔 [GALLERY] Photo saved event - refreshing...');
        loadPhotos();
      };

      const handlePhotoReceived = () => {
        console.log('🔔 [GALLERY] Photo received event - refreshing...');
        loadPhotos();
      };

      RealtimeService.on('moment_available', handlePhotoSaved);

      return () => {
        RealtimeService.off('moment_available', handlePhotoSaved);
      };
    };

    const cleanupPromise = setupEventListeners();

    return () => {
      clearInterval(refreshInterval);
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [needsUnlock]);

  const checkMemoriesLock = async () => {
    try {
      const MemoriesLockService = (await import('../services/MemoriesLockService')).default;
      const locked = await MemoriesLockService.isLocked();

      if (locked) {
        console.log('🔒 Memories are locked - showing unlock screen');
        setShowMemoriesLock(true);
        setNeedsUnlock(true);
      } else {
        console.log('🔓 Memories are unlocked');
        setShowMemoriesLock(false);
        setNeedsUnlock(false);
        loadPhotos();
      }
    } catch (error) {
      console.error('Error checking memories lock:', error);
      loadPhotos();
    }
  };

  const handleMemoriesUnlock = () => {
    console.log('✅ Memories unlocked successfully');
    setShowMemoriesLock(false);
    setNeedsUnlock(false);
    loadPhotos();
  };

  const loadPhotos = async () => {
    try {
      setLoading(true);
      console.log('🔄 [GALLERY] Loading moments...');

      // ⚡ FAST: Load cached data first (instant display)
      try {
        const cached = await AsyncStorage.getItem(GALLERY_CACHE_KEY);
        if (cached) {
          const cachedPhotos = JSON.parse(cached);
          setPhotos(isPremium ? cachedPhotos : cachedPhotos.slice(0, 10));
          console.log(`⚡ [GALLERY] Loaded ${cachedPhotos.length} from cache`);
          setLoading(false);
        }
      } catch (cacheError) {
        console.log('⚠️ [GALLERY] Cache read failed, loading fresh');
      }

      // Fetch fresh data from backend
      const response = await ApiClient.get('/moments/all') as any;

      if (response.success && response.data?.moments) {
        const moments = response.data.moments;
        console.log(`📱 [GALLERY] Found ${moments.length} moments (URLs, fast!)`);

        // Convert API response to Photo format
        const loadedPhotos: Photo[] = moments.map((moment: any) => ({
          id: moment.id,
          photoUrl: moment.photoUrl, // ⚡ URL instead of base64!
          sender: moment.sender,
          senderName: moment.senderName,
          partnerName: moment.partnerName,
          timestamp: moment.timestamp,
          uploadedAt: moment.uploadedAt,
        }));

        // Count by sender
        const myPhotos = loadedPhotos.filter(p => p.sender === 'me').length;
        const partnerPhotos = loadedPhotos.filter(p => p.sender === 'partner').length;
        console.log(`✅ [GALLERY] Loaded: ${myPhotos} from me, ${partnerPhotos} from partner`);

        // Limit for free users
        const availablePhotos = isPremium ? loadedPhotos : loadedPhotos.slice(0, 10);
        setPhotos(availablePhotos);

        // ⚡ CACHE: Save for next instant load
        await AsyncStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify(loadedPhotos));
        console.log(`💾 [GALLERY] Cached ${loadedPhotos.length} photos`);
      } else {
        console.log('📭 [GALLERY] No moments found');
        setPhotos([]);
      }

    } catch (error) {
      console.error('❌ [GALLERY] Error loading photos:', error);
      // Keep cached data if available
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPhotos();
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const PhotoItem = React.memo(({ photo, index }: { photo: Photo; index: number }) => (
    <TouchableOpacity
      style={[
        styles.photoItem,
        { width: imageSize, height: imageSize },
      ]}
      onPress={() => setSelectedPhoto(photo)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: photo.photoUrl }}
        style={styles.photoImage}
        resizeMode="cover"
      />
      <View style={styles.photoOverlay}>
        <View style={[
          styles.senderIndicator,
          photo.sender === 'me' ? styles.myPhoto : styles.partnerPhoto
        ]}>
          <Ionicons
            name={photo.sender === 'me' ? 'person' : 'heart'}
            size={12}
            color="white"
          />
        </View>
      </View>
    </TouchableOpacity>
  ));

  const TimelineItem = ({ photo }: { photo: Photo }) => (
    <TouchableOpacity
      style={styles.timelineItem}
      onPress={() => setSelectedPhoto(photo)}
      activeOpacity={0.8}
    >
      <View style={styles.timelineLeft}>
        <Image source={{ uri: photo.photoUrl }} style={styles.timelineImage} />
      </View>
      <View style={styles.timelineRight}>
        <Text style={styles.timelineDate}>{formatDate(photo.timestamp)}</Text>
        <Text style={styles.timelineSender}>
          {photo.sender === 'me' ? 'You shared a moment' : 'Your partner shared a moment'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  // Show lock screen if needed
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Memories Lock Modal */}
      <MemoriesLockModal
        visible={showMemoriesLock}
        onUnlock={handleMemoriesUnlock}
        onCancel={onBack}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Memories ({photos.length}{!isPremium && photos.length >= 10 ? '/10' : ''})
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setViewMode(viewMode === 'grid' ? 'timeline' : 'grid')}
          >
            <Ionicons
              name={viewMode === 'grid' ? 'list' : 'grid'}
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Free User Limit Banner */}
      {!isPremium && (
        <View style={styles.limitBanner}>
          <LinearGradient
            colors={[colors.secondary, colors.secondaryLight]}
            style={styles.limitGradient}
          >
            <Ionicons name="lock-closed" size={20} color="white" />
            <Text style={styles.limitText}>
              Upgrade to Premium for unlimited photo storage
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Blur overlay when locked */}
      {needsUnlock && (
        <View style={styles.lockedOverlay}>
          <View style={styles.lockedContent}>
            <Ionicons name="lock-closed" size={60} color={colors.primary} />
            <Text style={styles.lockedTitle}>Memories Locked</Text>
            <Text style={styles.lockedSubtitle}>Enter your PIN to view</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={[styles.scrollView, needsUnlock && styles.blurredContent]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!needsUnlock}
        pointerEvents={needsUnlock ? 'none' : 'auto'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#FFE5EC', '#FFF0F5']}
              style={styles.emptyGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="heart-outline" size={80} color="#FF6B9D" />
              <Text style={styles.emptyTitle}>Your Memory Box is Empty</Text>
              <Text style={styles.emptyDescription}>
                Every great love story starts with a single moment.{'\n'}
                Capture your first memory together 💕
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={onBack} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#FF6B9D', '#FF8FAB']}
                  style={styles.emptyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="camera" size={20} color="white" />
                  <Text style={styles.emptyButtonText}>Capture First Moment</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.content}>
            {viewMode === 'grid' ? (
              <View style={styles.gridContainer}>
                {photos.map((photo, index) => (
                  <PhotoItem key={photo.id} photo={photo} index={index} />
                ))}

                {/* Premium Placeholder */}
                {!isPremium && (
                  <View style={[styles.premiumPlaceholder, { width: imageSize, height: imageSize }]}>
                    <Ionicons name="lock-closed" size={32} color={colors.textTertiary} />
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.timelineContainer}>
                {photos.map((photo) => (
                  <TimelineItem key={photo.id} photo={photo} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Photo Modal */}
      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setSelectedPhoto(null)}
            activeOpacity={1}
          >
            <View style={styles.modalContent}>
              {selectedPhoto && (
                <>
                  <Image source={{ uri: selectedPhoto.photoUrl }} style={styles.modalImage} />
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalDate}>
                      {formatDate(selectedPhoto.timestamp)}
                    </Text>
                    <Text style={styles.modalSender}>
                      {selectedPhoto.sender === 'me' ? 'Sent by you' : 'Sent by your partner'}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPhoto(null)}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xl,
  },
  backButton: {
    padding: spacing.md,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 20,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  viewToggle: {
    padding: spacing.md,
  },

  // Limit Banner
  limitBanner: {
    marginHorizontal: layout.screenPaddingHorizontal,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  limitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  limitText: {
    fontSize: 14,
    color: 'white',
    fontFamily: 'Inter-Medium',
  },

  // Locked Overlay
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  lockedContent: {
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  lockedTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  lockedSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  blurredContent: {
    opacity: 0.3,
  },

  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPaddingHorizontal,
  },

  // Grid View
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  photoItem: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundSecondary,
  },
  photoOverlay: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  senderIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myPhoto: {
    backgroundColor: colors.primary,
  },
  partnerPhoto: {
    backgroundColor: colors.secondary,
  },
  premiumPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  premiumText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    fontFamily: 'Inter-Medium',
  },

  // Timeline View
  timelineContainer: {
    paddingBottom: spacing.xxxl,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  timelineLeft: {
    marginRight: spacing.lg,
  },
  timelineImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  timelineRight: {
    flex: 1,
  },
  timelineDate: {
    fontFamily: 'Inter-Medium', fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  timelineSender: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: spacing.massive,
  },
  emptyGradient: {
    width: '100%',
    borderRadius: borderRadius.xxl,
    padding: spacing.xxxl,
    alignItems: 'center',
    ...shadows.lg,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  emptyButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.md,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  emptyButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
    letterSpacing: 0.3,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - spacing.xxxl,
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: width - spacing.xxxl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  modalInfo: {
    alignItems: 'center',
  },
  modalDate: {
    fontFamily: 'Inter-SemiBold', fontSize: 18,
    color: 'white',
    marginBottom: spacing.sm,
  },
  modalSender: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.huge,
    right: spacing.xl,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});