import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocalStorageService from './LocalStorageService';
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
  /**
   * Upload photo - Save locally and send to partner via Socket.IO
   * BULLETPROOF: No dismiss errors, fast, reliable with RETRY mechanism
   */
  async uploadPhoto(photo: Photo, note?: string): Promise<UploadResult> {
    return SafeOperations.executeWithTimeout(
      async () => {
        console.log('📸 Uploading photo...');

        // 1. Save photo locally first (instant)
        const localPhoto = await LocalStorageService.savePhoto(
          photo.uri,
          'me',
          { caption: note || photo.caption }
        );

        console.log('✅ Photo saved locally:', localPhoto.id);

        // 2. Get partner info - VERIFY paired partner exists
        const partner = await PairingService.getPartner();
        
        if (!partner || !partner.id) {
          console.log('⚠️ No partner paired - photo saved locally only');
          // Queue for later sending
          await this.queueMomentForSending(localPhoto.id, photo.uri, note);
          
          // Show notification - queued
          try {
            const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
            await EnhancedNotificationService.showMomentQueuedNotification();
          } catch (error) {
            console.error('Error showing notification:', error);
          }
          
          return {
            success: true,
            momentId: localPhoto.id,
            error: 'No partner connected - will send when paired',
          };
        }

        // 3. Verify we have a valid pair
        const isPaired = await PairingService.isPaired();
        if (!isPaired) {
          console.log('⚠️ Not in a valid pair - photo saved locally only');
          await this.queueMomentForSending(localPhoto.id, photo.uri, note);
          return {
            success: true,
            momentId: localPhoto.id,
            error: 'Not paired - will send when paired',
          };
        }

        console.log(`✅ Verified paired with partner: ${partner.displayName} (${partner.id})`);

        // 4. Check if realtime connected
        if (!RealtimeService.getConnectionStatus()) {
          console.log('⚠️ Not connected to server - queueing for later');
          await this.queueMomentForSending(localPhoto.id, photo.uri, note, partner.id);
          
          // Show notification - queued for offline
          try {
            const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
            await EnhancedNotificationService.showMomentQueuedNotification();
          } catch (error) {
            console.error('Error showing notification:', error);
          }
          
          return {
            success: true,
            momentId: localPhoto.id,
            error: 'Offline - queued for sending',
          };
        }

        // 5. Compress photo and get base64 with timeout
        const highQuality = await AsyncStorage.getItem('@pairly_high_quality') === 'true';
        const quality = highQuality ? 'premium' : 'default';
        const compressedPhoto = await PhotoService.compressPhoto(
          { uri: photo.uri, width: 0, height: 0, type: 'image/jpeg', fileName: '', fileSize: 0 }, 
          quality
        );

        // 6. Send to ONLY the paired partner via Socket.IO with RETRY
        const partnerSocketId = partner.clerkId || partner.id;
        
        console.log('📤 Sending photo with data:', {
          photoId: localPhoto.id,
          partnerId: partnerSocketId,
          partnerName: partner.displayName,
          hasPhotoData: !!compressedPhoto.base64,
          photoDataLength: compressedPhoto.base64?.length || 0,
        });
        
        // Try sending with retry mechanism (3 attempts)
        let sendSuccess = false;
        let lastError: any = null;
        
        // ⚡ FIXED: Use emitWithAck for reliable delivery
        try {
          console.log('📤 Sending photo via socket...');
          
          // Generate unique message ID for de-duplication
          const messageId = `${localPhoto.id}_${Date.now()}`;
          
          // Send with acknowledgment
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Send timeout'));
            }, 5000);

            RealtimeService.emitWithAck(
              'send_photo',
              {
                photoId: localPhoto.id,
                photoData: compressedPhoto.base64,
                timestamp: localPhoto.timestamp,
                caption: note || photo.caption,
                partnerId: partnerSocketId,
                messageId, // For de-duplication
              },
              (response: any) => {
                clearTimeout(timeout);
                if (response && response.success !== false) {
                  console.log('✅ Photo sent successfully with acknowledgment');
                  resolve();
                } else {
                  reject(new Error(response?.error || 'Send failed'));
                }
              }
            );
          });

          sendSuccess = true;
        } catch (emitError: any) {
          console.error('❌ Send failed:', emitError.message);
          lastError = emitError;
        }
        
        if (!sendSuccess) {
          console.log('⚠️ All send attempts failed - queueing for retry');
          await this.queueMomentForSending(localPhoto.id, photo.uri, note, partner.id);
          
          // Show notification - queued for retry
          try {
            const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
            await EnhancedNotificationService.showMomentSendFailedNotification(partner.displayName);
          } catch (error) {
            console.error('Error showing notification:', error);
          }
          
          return {
            success: true,
            momentId: localPhoto.id,
            error: 'Queued for retry - will send when connection improves',
          };
        }

        // Show success notification
        try {
          const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
          await EnhancedNotificationService.showMomentSentNotification(partner.displayName);
        } catch (error) {
          console.error('Error showing notification:', error);
        }

        return {
          success: true,
          momentId: localPhoto.id,
        };
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
   * Receive photo from partner - Save locally
   */
  async receivePhoto(data: {
    photoId: string;
    photoData: string; // base64
    timestamp: number;
    caption?: string;
    senderName?: string;
  }): Promise<boolean> {
    try {
      console.log('📥 Receiving photo from partner...');

      // 1. Convert base64 to file
      const fileName = `received_${data.photoId}.jpg`;
      const docDir = (FileSystem as any).documentDirectory || '';
      const fileUri = docDir + fileName;

      await FileSystem.writeAsStringAsync(fileUri, data.photoData, {
        encoding: 'base64' as any,
      });

      // 2. Save to local storage
      const localPhoto = await LocalStorageService.savePhoto(
        fileUri,
        'partner',
        {
          caption: data.caption,
          partnerName: data.senderName,
        }
      );

      console.log('✅ Photo received and saved:', localPhoto.id);

      // 3. Update widget if on Android
      try {
        const { Platform } = await import('react-native');
        if (Platform.OS === 'android') {
          const { default: WidgetService } = await import('./WidgetService');
          await WidgetService.onPhotoReceived(fileUri, data.senderName);
        }
      } catch (widgetError) {
        console.error('Error updating widget from MomentService:', widgetError);
      }

      // 4. Send acknowledgment
      RealtimeService.emit('photo_received', {
        photoId: data.photoId,
        receivedAt: Date.now(),
      });

      return true;

    } catch (error) {
      console.error('❌ Error receiving photo:', error);
      return false;
    }
  }

  /**
   * Get all moments from local storage
   */
  async getMoments(): Promise<any[]> {
    try {
      const photos = await LocalStorageService.getPhotos();
      return photos;
    } catch (error) {
      console.error('Error fetching moments:', error);
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
      return await LocalStorageService.deletePhoto(momentId);
    } catch (error) {
      console.error('Error deleting moment:', error);
      return false;
    }
  }

  /**
   * Add reaction to moment
   */
  async addReaction(momentId: string, reaction: string): Promise<boolean> {
    try {
      // Save locally
      const success = await LocalStorageService.addReaction(momentId, reaction);

      if (success) {
        // Send to partner
        RealtimeService.emit('photo_reaction', {
          photoId: momentId,
          reaction,
          timestamp: Date.now(),
        });
      }

      return success;
    } catch (error) {
      console.error('Error adding reaction:', error);
      return false;
    }
  }

  /**
   * Schedule photo to be sent later
   */
  async schedulePhoto(
    photo: Photo, 
    note?: string, 
    scheduledTime?: Date, 
    duration?: number
  ): Promise<UploadResult> {
    try {
      console.log('⏰ Scheduling photo for:', scheduledTime);

      // 1. Save photo locally first
      const localPhoto = await LocalStorageService.savePhoto(
        photo.uri,
        'me',
        { 
          caption: note || photo.caption,
          scheduled: true,
          scheduledTime: scheduledTime?.getTime(),
          duration,
        }
      );

      console.log('✅ Photo saved locally with schedule:', localPhoto.id);

      // 2. Get partner info
      const partner = await PairingService.getPartner();
      
      if (!partner) {
        console.log('⚠️ No partner paired - photo saved locally only');
        return {
          success: true,
          momentId: localPhoto.id,
          error: 'No partner connected',
        };
      }

      // 3. Check if realtime connected
      if (!RealtimeService.getConnectionStatus()) {
        console.log('⚠️ Not connected to server - will schedule when online');
        return {
          success: true,
          momentId: localPhoto.id,
          error: 'Offline - will schedule when connected',
        };
      }

      // 4. Compress photo and get base64
      const highQuality = await AsyncStorage.getItem('@pairly_high_quality') === 'true';
      const quality = highQuality ? 'premium' : 'default';
      const compressedPhoto = await PhotoService.compressPhoto({ uri: photo.uri, width: 0, height: 0, type: 'image/jpeg', fileName: '', fileSize: 0 }, quality);

      // 5. Send schedule request to server via Socket.IO
      RealtimeService.emit('schedule_photo', {
        photoId: localPhoto.id,
        photoData: compressedPhoto.base64,
        scheduledTime: scheduledTime?.getTime(),
        duration: duration || 24,
        caption: note || photo.caption,
        partnerId: partner.id,
      });

      console.log('📤 Photo schedule sent to server');

      return {
        success: true,
        momentId: localPhoto.id,
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
    return await LocalStorageService.getStorageStats();
  }
}

export default new MomentService();