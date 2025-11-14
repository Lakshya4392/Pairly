import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocalStorageService from './LocalStorageService';
import RealtimeService from './RealtimeService';
import PairingService from './PairingService';
import PhotoService from './PhotoService';

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
   */
  async uploadPhoto(photo: Photo, note?: string): Promise<UploadResult> {
    try {
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
        return {
          success: true,
          momentId: localPhoto.id,
          error: 'No partner connected',
        };
      }

      // 3. Verify we have a valid pair
      const isPaired = await PairingService.isPaired();
      if (!isPaired) {
        console.log('⚠️ Not in a valid pair - photo saved locally only');
        return {
          success: true,
          momentId: localPhoto.id,
          error: 'Not paired with anyone',
        };
      }

      console.log(`✅ Verified paired with partner: ${partner.displayName} (${partner.id})`);

      // 4. Check if realtime connected
      if (!RealtimeService.getConnectionStatus()) {
        console.log('⚠️ Not connected to server - will send when online');
        // TODO: Add to offline queue
        return {
          success: true,
          momentId: localPhoto.id,
          error: 'Offline - will send when connected',
        };
      }

      // 5. Compress photo and get base64
      const highQuality = await AsyncStorage.getItem('@pairly_high_quality') === 'true';
      const quality = highQuality ? 'premium' : 'default';
      const compressedPhoto = await PhotoService.compressPhoto({ uri: photo.uri, width: 0, height: 0, type: 'image/jpeg', fileName: '', fileSize: 0 }, quality);

      // 6. Send to ONLY the paired partner via Socket.IO
      RealtimeService.emit('send_photo', {
        photoId: localPhoto.id,
        photoData: compressedPhoto.base64,
        timestamp: localPhoto.timestamp,
        caption: note || photo.caption,
        partnerId: partner.id, // ONLY send to this specific partner ID
      });

      console.log(`📤 Photo sent ONLY to paired partner ${partner.displayName} (${partner.id})`);

      return {
        success: true,
        momentId: localPhoto.id,
      };

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to upload photo',
      };
    }
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