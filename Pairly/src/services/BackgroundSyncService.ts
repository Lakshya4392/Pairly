/**
 * Background Sync Service
 * Handles background syncing with retry logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import UserSyncService from './UserSyncService';

interface SyncTask {
  id: string;
  type: 'user' | 'settings' | 'premium';
  data: any;
  attempts: number;
  lastAttempt: number;
}

class BackgroundSyncService {
  private syncQueue: SyncTask[] = [];
  private isProcessing = false;
  private maxAttempts = 5;
  private retryDelay = 5000; // 5 seconds

  /**
   * Add user sync task to queue
   */
  async queueUserSync(userData: any): Promise<void> {
    const task: SyncTask = {
      id: `user_${userData.clerkId}`,
      type: 'user',
      data: userData,
      attempts: 0,
      lastAttempt: 0,
    };

    // Remove existing task with same ID
    this.syncQueue = this.syncQueue.filter(t => t.id !== task.id);
    
    // Add new task
    this.syncQueue.push(task);
    
    // Save queue
    await this.saveQueue();
    
    // Start processing
    this.processQueue();
  }

  /**
   * Add settings sync task to queue
   */
  async queueSettingsSync(clerkId: string, settings: any): Promise<void> {
    const task: SyncTask = {
      id: `settings_${clerkId}`,
      type: 'settings',
      data: { clerkId, settings },
      attempts: 0,
      lastAttempt: 0,
    };

    this.syncQueue = this.syncQueue.filter(t => t.id !== task.id);
    this.syncQueue.push(task);
    await this.saveQueue();
    this.processQueue();
  }

  /**
   * Add premium sync task to queue
   */
  async queuePremiumSync(clerkId: string, isPremium: boolean, plan?: string): Promise<void> {
    const task: SyncTask = {
      id: `premium_${clerkId}`,
      type: 'premium',
      data: { clerkId, isPremium, plan },
      attempts: 0,
      lastAttempt: 0,
    };

    this.syncQueue = this.syncQueue.filter(t => t.id !== task.id);
    this.syncQueue.push(task);
    await this.saveQueue();
    this.processQueue();
  }

  /**
   * Process sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.syncQueue.length > 0) {
      const task = this.syncQueue[0];

      // Check if we should retry
      const now = Date.now();
      if (task.attempts > 0 && now - task.lastAttempt < this.retryDelay) {
        // Wait before retrying
        break;
      }

      // Check max attempts
      if (task.attempts >= this.maxAttempts) {
        console.log(`💡 Background sync will retry later (backend offline)`);
        this.syncQueue.shift();
        await this.saveQueue();
        continue;
      }

      // Try to sync
      const success = await this.executeTask(task);

      if (success) {
        // Remove from queue
        this.syncQueue.shift();
        console.log(`✅ Background sync completed`);
      } else {
        // Update attempts
        task.attempts++;
        task.lastAttempt = now;
        // Only log on first failure
        if (task.attempts === 1) {
          console.log(`💡 Background sync queued (will retry when backend is available)`);
        }
      }

      await this.saveQueue();
    }

    this.isProcessing = false;

    // Schedule next check if queue not empty
    if (this.syncQueue.length > 0) {
      setTimeout(() => this.processQueue(), this.retryDelay);
    }
  }

  /**
   * Execute sync task
   */
  private async executeTask(task: SyncTask): Promise<boolean> {
    try {
      switch (task.type) {
        case 'user': {
          const result = await UserSyncService.syncUserWithBackend(task.data);
          return result.success;
        }

        case 'settings':
          return await UserSyncService.updateSettings(
            task.data.settings
          );

        case 'premium':
          return await UserSyncService.updatePremiumStatus(
            task.data.isPremium,
            task.data.plan
          );

        default:
          return false;
      }
    } catch (error) {
      console.error(`❌ Error executing task ${task.id}:`, error);
      return false;
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('@pairly_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  /**
   * Load queue from storage
   */
  async loadQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem('@pairly_sync_queue');
      if (queueJson) {
        this.syncQueue = JSON.parse(queueJson);
        console.log(`📥 Loaded ${this.syncQueue.length} pending sync tasks`);
        this.processQueue();
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    this.syncQueue = [];
    await AsyncStorage.removeItem('@pairly_sync_queue');
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.syncQueue.length,
      processing: this.isProcessing,
    };
  }
}

export default new BackgroundSyncService();
