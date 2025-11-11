/**
 * Offline Queue Service
 * Queues photos when offline and sends when connection is restored
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import MomentService from './MomentService';
import RealtimeService from './RealtimeService';

interface QueuedPhoto {
  id: string;
  photoUri: string;
  caption?: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class OfflineQueueService {
  private queueKey = 'pairly_offline_queue';
  private isProcessing = false;
  private maxRetries = 3;

  /**
   * Initialize offline queue - listen for network changes
   */
  async initialize(): Promise<void> {
    // Listen for network state changes
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isProcessing) {
        console.log('📡 Network restored - processing queue');
        this.processQueue();
      }
    });

    // Process any existing queue on startup
    const isConnected = await this.isOnline();
    if (isConnected) {
      this.processQueue();
    }
  }

  /**
   * Add photo to offline queue
   */
  async addToQueue(photoUri: string, caption?: string): Promise<void> {
    try {
      const queue = await this.getQueue();

      const queuedPhoto: QueuedPhoto = {
        id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        photoUri,
        caption,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: this.maxRetries,
      };

      queue.push(queuedPhoto);
      await this.saveQueue(queue);

      console.log('📥 Photo added to offline queue:', queuedPhoto.id);
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  }

  /**
   * Process offline queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏳ Queue already processing');
      return;
    }

    try {
      this.isProcessing = true;
      const queue = await this.getQueue();

      if (queue.length === 0) {
        console.log('✅ Queue is empty');
        this.isProcessing = false;
        return;
      }

      console.log(`📤 Processing ${queue.length} queued photos`);

      // Check if online and Socket.IO connected
      const isOnline = await this.isOnline();
      const isSocketConnected = RealtimeService.getConnectionStatus();

      if (!isOnline || !isSocketConnected) {
        console.log('⚠️ Not ready to process queue');
        this.isProcessing = false;
        return;
      }

      // Process each photo
      const remainingQueue: QueuedPhoto[] = [];

      for (const photo of queue) {
        try {
          console.log(`📤 Sending queued photo: ${photo.id}`);

          // Attempt to upload
          const result = await MomentService.uploadPhoto({
            uri: photo.photoUri,
            caption: photo.caption,
          });

          if (result.success) {
            console.log(`✅ Queued photo sent: ${photo.id}`);
            // Don't add to remaining queue (successfully sent)
          } else {
            // Failed - increment retry count
            photo.retryCount++;

            if (photo.retryCount < photo.maxRetries) {
              console.log(`⚠️ Retry ${photo.retryCount}/${photo.maxRetries} for ${photo.id}`);
              remainingQueue.push(photo);
            } else {
              console.log(`❌ Max retries reached for ${photo.id}`);
              // TODO: Notify user about failed photo
            }
          }
        } catch (error) {
          console.error(`Error processing queued photo ${photo.id}:`, error);
          
          // Increment retry count
          photo.retryCount++;

          if (photo.retryCount < photo.maxRetries) {
            remainingQueue.push(photo);
          }
        }

        // Small delay between uploads
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Save remaining queue
      await this.saveQueue(remainingQueue);

      console.log(`✅ Queue processed. ${remainingQueue.length} remaining`);

    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get queue from storage
   */
  private async getQueue(): Promise<QueuedPhoto[]> {
    try {
      const queueJson = await AsyncStorage.getItem(this.queueKey);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Error getting queue:', error);
      return [];
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(queue: QueuedPhoto[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.queueKey, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.queueKey);
      console.log('🗑️ Queue cleared');
    } catch (error) {
      console.error('Error clearing queue:', error);
    }
  }

  /**
   * Check if device is online
   */
  private async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected === true;
    } catch (error) {
      console.error('Error checking network:', error);
      return false;
    }
  }

  /**
   * Retry failed uploads manually
   */
  async retryQueue(): Promise<void> {
    console.log('🔄 Manual retry triggered');
    await this.processQueue();
  }
}

export default new OfflineQueueService();
