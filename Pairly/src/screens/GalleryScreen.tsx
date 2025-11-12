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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenLock } from '../components/ScreenLock';
import { colors, gradients } from '../theme/colorsIOS';
import { spacing, borderRadius, layout } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

const { width } = Dimensions.get('window');
const imageSize = (width - spacing.xl * 3) / 2;

interface Photo {
  id: string;
  uri: string;
  timestamp: Date;
  sender: 'me' | 'partner';
}

interface GalleryScreenProps {
  onBack: () => void;
  isPremium?: boolean;
}

// Mock data - replace with real data from your service
const mockPhotos: Photo[] = [
  { id: '1', uri: 'https://picsum.photos/400/400?random=1', timestamp: new Date(), sender: 'me' },
  { id: '2', uri: 'https://picsum.photos/400/400?random=2', timestamp: new Date(Date.now() - 86400000), sender: 'partner' },
  { id: '3', uri: 'https://picsum.photos/400/400?random=3', timestamp: new Date(Date.now() - 172800000), sender: 'me' },
  { id: '4', uri: 'https://picsum.photos/400/400?random=4', timestamp: new Date(Date.now() - 259200000), sender: 'partner' },
  { id: '5', uri: 'https://picsum.photos/400/400?random=5', timestamp: new Date(Date.now() - 345600000), sender: 'me' },
  { id: '6', uri: 'https://picsum.photos/400/400?random=6', timestamp: new Date(Date.now() - 432000000), sender: 'partner' },
];

export const GalleryScreen: React.FC<GalleryScreenProps> = ({ onBack, isPremium = false }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [isLocked, setIsLocked] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  useEffect(() => {
    checkLockStatus();
  }, []);

  useEffect(() => {
    if (!needsUnlock) {
      loadPhotos();
    }
  }, [needsUnlock]);

  const checkLockStatus = async () => {
    try {
      const AppLockService = (await import('../services/AppLockService')).default;
      const locked = await AppLockService.isLocked();
      setNeedsUnlock(locked);
    } catch (error) {
      console.error('Error checking lock status:', error);
      loadPhotos();
    }
  };

  const handleUnlock = () => {
    setNeedsUnlock(false);
    loadPhotos();
  };

  const loadPhotos = async () => {
    try {
      // Load real photos from LocalPhotoStorage
      const LocalPhotoStorage = (await import('../services/LocalPhotoStorage')).default;
      const allPhotos = await LocalPhotoStorage.getAllPhotos();
      
      // Convert to Photo format
      const loadedPhotos: Photo[] = await Promise.all(
        allPhotos.map(async (photo) => {
          const uri = await LocalPhotoStorage.getPhotoUri(photo.id);
          return {
            id: photo.id,
            uri: uri || '',
            timestamp: new Date(photo.timestamp),
            sender: photo.sender,
          };
        })
      );

      // Filter out photos without URI
      const validPhotos = loadedPhotos.filter(p => p.uri);

      // Limit for free users (show only last 10 photos)
      const availablePhotos = isPremium ? validPhotos : validPhotos.slice(0, 10);
      
      setPhotos(availablePhotos);
      console.log(`✅ Loaded ${availablePhotos.length} photos from storage`);
    } catch (error) {
      console.error('❌ Error loading photos:', error);
      // Fallback to empty array
      setPhotos([]);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const PhotoItem = ({ photo, index }: { photo: Photo; index: number }) => (
    <TouchableOpacity
      style={[
        styles.photoItem,
        { width: imageSize, height: imageSize },
      ]}
      onPress={() => setSelectedPhoto(photo)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: photo.uri }} style={styles.photoImage} />
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
  );

  const TimelineItem = ({ photo }: { photo: Photo }) => (
    <TouchableOpacity
      style={styles.timelineItem}
      onPress={() => setSelectedPhoto(photo)}
      activeOpacity={0.8}
    >
      <View style={styles.timelineLeft}>
        <Image source={{ uri: photo.uri }} style={styles.timelineImage} />
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
  if (needsUnlock) {
    return (
      <ScreenLock
        onUnlock={handleUnlock}
        onCancel={onBack}
        title="Unlock Memories"
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No memories yet</Text>
            <Text style={styles.emptyDescription}>
              Start sharing moments to build your gallery
            </Text>
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
                  <Image source={{ uri: selectedPhoto.uri }} style={styles.modalImage} />
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

const styles = StyleSheet.create({
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
    paddingVertical: spacing.massive,
  },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 20,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
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