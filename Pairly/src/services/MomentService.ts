/**
 * 🎯 SIMPLE MVP MomentService
 * No file system, no base64 storage, no complex logic
 * Just: Upload → Backend → Done
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/apiClient';
import RealtimeService from './RealtimeService';

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

export interface MomentMetadata {
  momentId: string;
  timestamp: string;
  sender: 'me' | 'partner';
}

class SimpleMomentService {
  /**
   * ⚡ SIMPLE UPLOAD: Compress → Upload → Done
   */
  async uploadPhoto(photo: Photo, note?: string): Promise<UploadResult> {
    try {
      console.log('📸 [UPLOAD] Starting simple upload...');

      // 1. Compress photo (expo-image-manipulator)
      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      console.log('✅ [UPLOAD] Photo compressed');

      // 2. Create FormData
      const formData = new FormData();
      formData.append('photo', {
        uri: compressed.uri,
        type: 'image/jpeg',
        name: 'moment.jpg',
      } as any);

      if (note) {
        formData.append('caption', note);
      }

      console.log('📤 [UPLOAD] Uploading to backend...');

      // 3. Upload to backend
      const response: any = await apiClient.post('/moments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Upload failed');
      }

      console.log('✅ [UPLOAD] Upload successful:', response.data.data.moment.id);

      // 4. Save metadata locally (NOT the photo)
      const metadata: MomentMetadata = {
        momentId: response.data.data.moment.id,
        timestamp: response.data.data.uploadedAt,
        sender: 'me',
      };

      await this.saveMetadata(metadata);

      // 5. Emit socket event (tiny payload - just notification)
      RealtimeService.emit('moment_available', {
        momentId: metadata.momentId,
        timestamp: metadata.timestamp,
      });

      console.log('✅ [UPLOAD] Complete!');

      return {
        success: true,
        momentId: metadata.momentId,
      };

    } catch (error: any) {
      console.error('❌ [UPLOAD] Failed:', error.message);
      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }

  async schedulePhoto(params: { photo: any, scheduledTime: number, caption?: string }): Promise<any> {
    console.log('⏰ [SCHEDULE] Scheduling photo (stub)', params.scheduledTime);
    // For now, just treat as immediate upload or implement real scheduling later
    return this.uploadPhoto(params.photo as Photo, params.caption);
  }

  /**
   * 📥 SIMPLE RECEIVE: Just save metadata, widget will poll backend
   */
  async onMomentAvailable(data: { momentId: string; timestamp: string; partnerName?: string }): Promise<void> {
    try {
      console.log('📥 [RECEIVE] Moment available:', data.momentId);

      // Save metadata only
      const metadata: MomentMetadata = {
        momentId: data.momentId,
        timestamp: data.timestamp,
        sender: 'partner',
      };

      await this.saveMetadata(metadata);

      // Show notification
      try {
        const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
        await EnhancedNotificationService.showMomentNotification(data.partnerName || 'Partner', data.momentId);
      } catch (error) {
        console.error('Notification error:', error);
      }

      // Trigger gallery refresh
      RealtimeService.emit('gallery_refresh', { timestamp: Date.now() });

      console.log('✅ [RECEIVE] Metadata saved, notification sent');

    } catch (error) {
      console.error('❌ [RECEIVE] Error:', error);
    }
  }

  /**
   * 📊 Get latest moment from backend
   */
  async getLatestMoment(): Promise<{ photo: string; partnerName: string; sentAt: string } | null> {
    try {
      console.log('📡 [FETCH] Getting latest moment from backend...');

      const response: any = await apiClient.get('/moments/latest');

      if (!response.data?.success) {
        console.log('⚠️ [FETCH] No moment found');
        return null;
      }

      console.log('✅ [FETCH] Moment received');

      // 🔥 WIDGET FIX: Notify widget of new moment
      try {
        const WidgetUtils = (await import('../utils/WidgetUtils')).default;
        await WidgetUtils.notifyNewMoment();
      } catch (widgetError) {
        console.warn('⚠️ Widget notification failed:', widgetError);
      }

      return {
        photo: response.data.data.photo, // base64
        partnerName: response.data.data.partnerName,
        sentAt: response.data.data.sentAt,
      };

    } catch (error: any) {
      console.error('❌ [FETCH] Error:', error.message);
      return null;
    }
  }

  /**
   * 💾 Save metadata locally (NOT photo)
   */
  private async saveMetadata(metadata: MomentMetadata): Promise<void> {
    try {
      // Get existing metadata
      const existing = await this.getAllMetadata();

      // Add new metadata
      existing.unshift(metadata);

      // Keep only last 50
      const limited = existing.slice(0, 50);

      // Save
      await AsyncStorage.setItem('moments_metadata', JSON.stringify(limited));

      console.log('💾 Metadata saved:', metadata.momentId);

    } catch (error) {
      console.error('Error saving metadata:', error);
    }
  }

  /**
   * 📋 Get all metadata
   */
  async getAllMetadata(): Promise<MomentMetadata[]> {
    try {
      const data = await AsyncStorage.getItem('moments_metadata');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting metadata:', error);
      return [];
    }
  }

  /**
   * 🗑️ Clear all data
   */
  async clearAllData(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem('moments_metadata');
      console.log('✅ All metadata cleared');
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  /**
   * 📊 Get storage stats
   */
  async getStorageStats() {
    try {
      const metadata = await this.getAllMetadata();

      return {
        totalMoments: metadata.length,
        myMoments: metadata.filter(m => m.sender === 'me').length,
        partnerMoments: metadata.filter(m => m.sender === 'partner').length,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalMoments: 0,
        myMoments: 0,
        partnerMoments: 0,
      };
    }
  }

  /**
   * 🔄 Initialize service
   */
  async initialize(): Promise<void> {
    console.log('🚀 SimpleMomentService initialized');

    // Setup socket listener for moment_available
    RealtimeService.on('moment_available', (data: any) => {
      this.onMomentAvailable(data);
    });
  }
}

export default new SimpleMomentService();
