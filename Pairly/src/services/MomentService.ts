
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocalPhotoStorage from './LocalPhotoStorage';
import RealtimeService from './RealtimeService';
import PairingService from './PairingService';
import PhotoService from './PhotoService';
import SafeOperations from '../utils/SafeOperations';

export interface Photo {
  uri: string;
  type?: string;
  name?: string;
  caption?: string;
}

export interface UploadResult {
  success: boolean;
  error?: string;
  momentId?: string;
}

class MomentService {
  private uploadingPhotos: Set<string> = new Set(); // Track uploading photos

  /**
   * ⚡ PERFECT SYSTEM: Upload photo - Save locally and send to partner
   * Single source of truth: LocalPhotoStorage
   */
  async uploadPhoto(photo: Photo, note?: string): Promise<UploadResult> {
    // ⚡ GUARD: Prevent duplicate uploads of same photo
    const photoKey = `${photo.uri}_${Date.now()}`;
    if (this.uploadingPhotos.has(photo.uri)) {
      console.log('🚫 [SENDER] Photo already uploading, skipping duplicate');
      return {
        success: false,
        error: 'Photo already uploading',
      };
    }
    
    this.uploadingPhotos.add(photo.uri);
    
    try {
      return await SafeOperations.executeWithTimeout(
        async () => {
          console.log('📸 [SENDER] Uploading photo...');

        // 1. Save photo locally FIRST (instant) - SINGLE STORAGE
        const photoId = await LocalPhotoStorage.savePhoto(photo.uri, 'me');
        
        if (!photoId) {
          throw new Error('Failed to save photo locally');
        }

        console.log('✅ [SENDER] Photo saved locally:', photoId.substring(0, 8));
        
        // Trigger event for UI refresh
        RealtimeService.emit('photo_saved', { photoId, sender: 'me', timestamp: Date.now() });

        // 2. Get partner info - VERIFY paired partner exists
        const partner = await PairingService.getPartner();
        
        if (!partner || !partner.id) {
          console.log('⚠️ [SENDER] No partner paired - photo saved locally only');
          await this.queueMomentForSending(photoId, photo.uri, note);
          
          return {
            success: true,
            momentId: photoId,
            error: 'No partner connected - will send when paired',
          };
        }

        // 3. Verify we have a valid pair
        const isPaired = await PairingService.isPaired();
        if (!isPaired) {
          console.log('⚠️ [SENDER] Not in a valid pair - photo saved locally only');
          await this.queueMomentForSending(photoId, photo.uri, note);
          return {
            success: true,
            momentId: photoId,
            error: 'Not paired - will send when paired',
          };
        }

        console.log(`✅ [SENDER] Verified paired with: ${partner.displayName}`);

        // 4. Check if realtime connected
        if (!RealtimeService.getConnectionStatus()) {
          console.log('⚠️ [SENDER] Not connected - queueing for later');
          await this.queueMomentForSending(photoId, photo.uri, note, partner.id);
          
          return {
            success: true,
            momentId: photoId,
            error: 'Offline - queued for sending',
          };
        }

        // 5. Compress photo and get base64
        const highQuality = await AsyncStorage.getItem('@pairly_high_quality') === 'true';
        const quality = highQuality ? 'premium' : 'default';
        const compressedPhoto = await PhotoService.compressPhoto(
          { uri: photo.uri, width: 0, height: 0, type: 'image/jpeg', fileName: '', fileSize: 0 }, 
          quality
        );

        // 6. Send to partner via Socket.IO with acknowledgment
        const partnerSocketId = partner.clerkId || partner.id;
        const messageId = `${photoId}_${Date.now()}`;
        
        console.log('📤 [SENDER] Sending to partner:', partner.displayName);
        
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Send timeout'));
            }, 5000);

            RealtimeService.emitWithAck(
              'send_photo',
              {
                photoId: photoId,
                photoData: compressedPhoto.base64,
                timestamp: Date.now(),
                caption: note || photo.caption,
                partnerId: partnerSocketId,
                messageId,
              },
              (response: any) => {
                clearTimeout(timeout);
                if (response && response.success !== false) {
                  console.log('✅ [SENDER] Photo sent successfully!');
                  resolve();
                } else {
                  reject(new Error(response?.error || 'Send failed'));
                }
              }
            );
          });

          // Show success notification
          try {
            const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
            await EnhancedNotificationService.showMomentSentNotification(partner.displayName);
          } catch (error) {
            console.error('Error showing notification:', error);
          }

          return {
            success: true,
            momentId: photoId,
          };
          
        } catch (emitError: any) {
          console.error('❌ [SENDER] Send failed:', emitError.message);
          await this.queueMomentForSending(photoId, photo.uri, note, partner.id);
          
          return {
            success: true,
            momentId: photoId,
            error: 'Queued for retry',
          };
        }
      },
        10000, // 10 second timeout (reduced from 15s)
        'Photo upload timed out'
      ).then(result => {
        if (result.success && result.data) {
          return result.data;
        }
        return {
          success: false,
          error: result.error || 'Failed to upload photo',
        };
      });
    } finally {
      // ⚡ CLEANUP: Remove from uploading set
      this.uploadingPhotos.delete(photo.uri);
    }
  }

  /**
   * Queue moment for sending later
   */
  private async queueMomentForSending(
    momentId: string, 
    photoUri: string, 
    note?: string,
    partnerId?: string
  ): Promise<void> {
    try {
      const queueKey = '@pairly_moment_queue';
      const queueJson = await AsyncStorage.getItem(queueKey);
      const queue = queueJson ? JSON.parse(queueJson) : [];
      
      queue.push({
        momentId,
        photoUri,
        note,
        partnerId,
        queuedAt: Date.now(),
      });
      
      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      console.log('📦 Moment queued for later sending:', momentId);
    } catch (error) {
      console.error('Error queueing moment:', error);
    }
  }

  /**
   * Process queued moments
   */
  async processQueuedMoments(): Promise<void> {
    try {
      const queueKey = '@pairly_moment_queue';
      const queueJson = await AsyncStorage.getItem(queueKey);
      
      if (!queueJson) return;
      
      const queue = JSON.parse(queueJson);
      
      if (queue.length === 0) return;
      
      console.log(`📦 Processing ${queue.length} queued moments...`);
      
      // Check if connected
      if (!RealtimeService.getConnectionStatus()) {
        console.log('⚠️ Not connected - skipping queue processing');
        return;
      }
      
      // Get partner
      const partner = await PairingService.getPartner();
      if (!partner) {
        console.log('⚠️ No partner - skipping queue processing');
        return;
      }
      
      const remainingQueue = [];
      
      for (const item of queue) {
        try {
          console.log(`📤 Sending queued moment: ${item.momentId}`);
          
          // Compress and send
          const highQuality = await AsyncStorage.getItem('@pairly_high_quality') === 'true';
          const quality = highQuality ? 'premium' : 'default';
          const compressedPhoto = await PhotoService.compressPhoto(
            { uri: item.photoUri, width: 0, height: 0, type: 'image/jpeg', fileName: '', fileSize: 0 }, 
            quality
          );
          
          RealtimeService.emit('send_photo', {
            photoId: item.momentId,
            photoData: compressedPhoto.base64,
            timestamp: Date.now(),
            caption: item.note,
            partnerId: partner.clerkId || partner.id,
          });
          
          console.log(`✅ Queued moment sent: ${item.momentId}`);
        } catch (error) {
          console.error(`❌ Failed to send queued moment: ${item.momentId}`, error);
          // Keep in queue for retry
          remainingQueue.push(item);
        }
      }
      
      // Update queue with remaining items
      await AsyncStorage.setItem(queueKey, JSON.stringify(remainingQueue));
      console.log(`📦 Queue processed. Remaining: ${remainingQueue.length}`);
      
      // Show notification if all sent successfully
      if (queue.length > 0 && remainingQueue.length === 0) {
        try {
          const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
          await EnhancedNotificationService.showMomentSentNotification(partner.displayName);
        } catch (error) {
          console.error('Error showing notification:', error);
        }
      }
    } catch (error) {
      console.error('Error processing queued moments:', error);
    }
  }

  /**
   * Wait for delivery confirmation
   */
  private waitForDeliveryConfirmation(momentId: string, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      let confirmed = false;
      
      const confirmHandler = (data: any) => {
        if (data.photoId === momentId || data.momentId === momentId) {
          confirmed = true;
          RealtimeService.off('photo_delivered', confirmHandler);
          RealtimeService.off('moment_received', confirmHandler);
          resolve(true);
        }
      };
      
      RealtimeService.on('photo_delivered', confirmHandler);
      RealtimeService.on('moment_received', confirmHandler);
      
      setTimeout(() => {
        if (!confirmed) {
          RealtimeService.off('photo_delivered', confirmHandler);
          RealtimeService.off('moment_received', confirmHandler);
          resolve(false);
        }
      }, timeout);
    });
  }

  /**
   * ⚡ PERFECT SYSTEM: Receive photo from partner
   * Single source of truth: LocalPhotoStorage
   */
  async receivePhoto(data: {
    photoId: string;
    photoData: string; // base64
    timestamp: number;
    caption?: string;
    senderName?: string;
  }): Promise<boolean> {
    try {
      console.log('📥 [RECEIVER] Receiving photo from:', data.senderName);

      // 1. Convert base64 to file
      const fileName = `partner_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
      const docDir = (FileSystem as any).documentDirectory || '';
      const fileUri = docDir + fileName;

      await FileSystem.writeAsStringAsync(fileUri, data.photoData, {
        encoding: 'base64' as any,
      });

      console.log('✅ [RECEIVER] Photo file created:', fileName);

      // 2. Save to SINGLE STORAGE (LocalPhotoStorage only)
      const savedPhotoId = await LocalPhotoStorage.savePhoto(fileUri, 'partner');
      
      if (!savedPhotoId) {
        throw new Error('Failed to save photo to LocalPhotoStorage');
      }

      console.log('✅ [RECEIVER] Photo saved to storage:', savedPhotoId.substring(0, 8));
      
      // Trigger event for UI refresh
      RealtimeService.emit('photo_saved', { photoId: savedPhotoId, sender: 'partner', timestamp: Date.now() });

      // 3. Update widget if on Android
      try {
        const { Platform } = await import('react-native');
        if (Platform.OS === 'android') {
          const { default: WidgetService } = await import('./WidgetService');
          await WidgetService.onPhotoReceived(fileUri, data.senderName);
          console.log('✅ [RECEIVER] Widget updated');
        }
      } catch (widgetError) {
        console.error('Error updating widget:', widgetError);
      }

      // 4. Send acknowledgment to backend
      RealtimeService.emit('photo_received', {
        photoId: data.photoId,
        receivedAt: Date.now(),
      });

      console.log('✅ [RECEIVER] Photo fully processed and saved!');
      return true;

    } catch (error) {
      console.error('❌ [RECEIVER] Error receiving photo:', error);
      return false;
    }
  }

  /**
   * Get all moments
   */
  async getMoments(): Promise<any[]> {
    try {
      const photos = await LocalPhotoStorage.getAllPhotos();
      
      // Convert to format with URIs
      const momentsWithUris = await Promise.all(
        photos.map(async (photo) => {
          const uri = await LocalPhotoStorage.getPhotoUri(photo.id);
          return { ...photo, uri: uri || '' };
        })
      );
      
      // Filter and sort
      return momentsWithUris
        .filter(m => m.uri)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('❌ Error fetching moments:', error);
      return [];
    }
  }

  /**
   * Get the latest moment from local storage
   */
  async getLatestMoment(): Promise<any | null> {
    try {
      const photos = await this.getMoments();
      return photos.length > 0 ? photos[0] : null;
    } catch (error) {
      console.error('Error fetching latest moment:', error);
      return null;
    }
  }

  /**
   * Delete moment
   */
  async deleteMoment(momentId: string): Promise<boolean> {
    try {
      return await LocalPhotoStorage.deletePhoto(momentId);
    } catch (error) {
      console.error('Error deleting moment:', error);
      return false;
    }
  }

  /**
   * Add reaction to moment (TODO: Implement in LocalPhotoStorage)
   */
  async addReaction(momentId: string, reaction: string): Promise<boolean> {
    try {
      // Send to partner via socket
      RealtimeService.emit('photo_reaction', {
        photoId: momentId,
        reaction,
        timestamp: Date.now(),
      });
      
      console.log('✅ Reaction sent:', reaction);
      return true;
    } catch (error) {
      console.error('Error adding reaction:', error);
      return false;
    }
  }

  /**
   * ⚡ PERFECT SYSTEM: Schedule photo to be sent later
   */
  async schedulePhoto(
    photo: Photo, 
    note?: string, 
    scheduledTime?: Date, 
    duration?: number
  ): Promise<UploadResult> {
    try {
      console.log('⏰ [SENDER] Scheduling photo for:', scheduledTime);

      // 1. Save photo locally FIRST - SINGLE STORAGE
      const photoId = await LocalPhotoStorage.savePhoto(photo.uri, 'me');
      
      if (!photoId) {
        throw new Error('Failed to save scheduled photo');
      }

      console.log('✅ [SENDER] Scheduled photo saved locally:', photoId.substring(0, 8));

      // 2. Get partner info
      const partner = await PairingService.getPartner();
      
      if (!partner) {
        console.log('⚠️ [SENDER] No partner paired - scheduled photo saved locally');
        return {
          success: true,
          momentId: photoId,
          error: 'No partner connected',
        };
      }

      // 3. Check if realtime connected
      if (!RealtimeService.getConnectionStatus()) {
        console.log('⚠️ [SENDER] Not connected - will schedule when online');
        return {
          success: true,
          momentId: photoId,
          error: 'Offline - will schedule when connected',
        };
      }

      // 4. Compress photo and get base64
      const highQuality = await AsyncStorage.getItem('@pairly_high_quality') === 'true';
      const quality = highQuality ? 'premium' : 'default';
      const compressedPhoto = await PhotoService.compressPhoto({ uri: photo.uri, width: 0, height: 0, type: 'image/jpeg', fileName: '', fileSize: 0 }, quality);

      // 5. Send schedule request to server via Socket.IO
      RealtimeService.emit('schedule_photo', {
        photoId: photoId,
        photoData: compressedPhoto.base64,
        scheduledTime: scheduledTime?.getTime(),
        duration: duration || 24,
        caption: note || photo.caption,
        partnerId: partner.id,
      });

      console.log('📤 [SENDER] Photo schedule sent to server');

      return {
        success: true,
        momentId: photoId,
      };

    } catch (error: any) {
      console.error('❌ Schedule error:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to schedule photo',
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const photos = await LocalPhotoStorage.getAllPhotos();
      const size = await LocalPhotoStorage.getStorageSize();
      
      return {
        totalPhotos: photos.length,
        totalSize: size,
        myPhotos: photos.filter(p => p.sender === 'me').length,
        partnerPhotos: photos.filter(p => p.sender === 'partner').length,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalPhotos: 0,
        totalSize: 0,
        myPhotos: 0,
        partnerPhotos: 0,
      };
    }
  }

  /**
   * ⚡ REMOVED: Migration no longer needed (using single storage system)
   */
  async migrateExistingPhotos(): Promise<void> {
    // Migration disabled - using single storage system now
    const migrationDone = await AsyncStorage.getItem('@pairly_migration_done');
    if (migrationDone !== 'true') {
      await AsyncStorage.setItem('@pairly_migration_done', 'true');
      console.log('✅ [MIGRATION] Skipped - using single storage system');
    }
  }

  /**
   * Initialize MomentService - run migration and cleanup
   */
  async initialize(): Promise<void> {
    try {
      // Clean up old metadata first
      await LocalPhotoStorage.cleanupOldMetadata();
      
      // Then migrate existing photos
      await this.migrateExistingPhotos();
      
      // Show debug status
      await this.debugStorageStatus();
    } catch (error) {
      console.error('❌ Error initializing MomentService:', error);
    }
  }

  /**
   * ⚡ DEBUG: Show storage status
   */
  async debugStorageStatus(): Promise<void> {
    try {
      console.log('\n📊 ========== MOMENT STORAGE STATUS ==========');
      
      // Check PRIMARY storage
      const primaryPhotos = await LocalPhotoStorage.getAllPhotos();
      const myPhotos = primaryPhotos.filter(p => p.sender === 'me').length;
      const partnerPhotos = primaryPhotos.filter(p => p.sender === 'partner').length;
      
      console.log(`✅ Total Moments: ${primaryPhotos.length}`);
      console.log(`   👤 My Photos: ${myPhotos}`);
      console.log(`   ❤️ Partner Photos: ${partnerPhotos}`);
      
      if (primaryPhotos.length > 0) {
        console.log('\n📸 Recent Moments:');
        primaryPhotos.slice(0, 5).forEach((photo, index) => {
          const date = new Date(photo.timestamp);
          const timeAgo = this.getTimeAgo(date);
          console.log(`   ${index + 1}. ${photo.sender === 'me' ? '👤 Me' : '❤️ Partner'} - ${timeAgo}`);
        });
      }
      
      // Storage size
      const size = await LocalPhotoStorage.getStorageSize();
      const sizeMB = (size / 1024 / 1024).toFixed(2);
      console.log(`\n💾 Storage Used: ${sizeMB} MB`);
      
      console.log('============================================\n');
    } catch (error) {
      console.error('❌ Error checking storage status:', error);
    }
  }

  /**
   * Helper: Get time ago string
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  /**
   * ⚡ UTILITY: Force refresh gallery by triggering event
   */
  refreshGallery(): void {
    RealtimeService.emit('gallery_refresh', { timestamp: Date.now() });
    console.log('🔄 Gallery refresh triggered');
  }

  /**
   * 🗑️ CLEAR ALL DATA: Delete all photos and start fresh
   */
  async clearAllData(): Promise<boolean> {
    try {
      console.log('🗑️ ========== CLEARING ALL DATA ==========');
      
      // Delete all photos from storage
      const deleted = await LocalPhotoStorage.deleteAllPhotos();
      console.log(`✅ Storage cleared: ${deleted}`);
      
      // Clear moment queue
      await AsyncStorage.removeItem('@pairly_moment_queue');
      console.log('✅ Moment queue cleared');
      
      // Reset migration flag
      await AsyncStorage.removeItem('@pairly_migration_done');
      console.log('✅ Migration flag reset');
      
      console.log('========================================');
      console.log('✅ ALL DATA CLEARED! Fresh start ready.');
      console.log('========================================\n');
      
      return true;
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      return false;
    }
  }
}

export default new MomentService();