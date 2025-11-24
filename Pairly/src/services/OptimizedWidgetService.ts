/**
 * Optimized Widget Service
 * Fast and reliable widget updates with caching and retry logic
 */

import { NativeModules, Platform, AppState, AppStateStatus } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PairlyWidget } = NativeModules;

interface WidgetUpdateQueue {
  photoUri: string;
  partnerName: string;
  timestamp: number;
  retries: number;
}

class OptimizedWidgetService {
  private static instance: OptimizedWidgetService | null = null;
  private isEnabled = Platform.OS === 'android';
  private updateQueue: WidgetUpdateQueue[] = [];
  private isProcessingQueue = false;
  private lastUpdateTime = 0;
  private readonly MIN_UPDATE_INTERVAL = 1000; // 1 second minimum between updates
  private readonly MAX_RETRIES = 3;
  private appState: AppStateStatus = 'active';

  private constructor() {
    // Monitor app state for better widget updates
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  static getInstance(): OptimizedWidgetService {
    if (!OptimizedWidgetService.instance) {
      OptimizedWidgetService.instance = new OptimizedWidgetService();
    }
    return OptimizedWidgetService.instance;
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log('App state changed:', this.appState, '->', nextAppState);
    
    if (this.appState === 'background' && nextAppState === 'active') {
      // App came to foreground - process any pending updates
      console.log('App foregrounded - processing widget queue');
      this.processQueue();
    }
    
    this.appState = nextAppState;
  };

  /**
   * Update widget with new photo (optimized with queue)
   */
  async updateWidget(photoUri: string, partnerName: string = 'Your Partner'): Promise<boolean> {
    if (!this.isEnabled || !PairlyWidget) {
      console.log('Widget not supported on this platform');
      return false;
    }

    try {
      // Check if we need to throttle updates
      const now = Date.now();
      const timeSinceLastUpdate = now - this.lastUpdateTime;

      if (timeSinceLastUpdate < this.MIN_UPDATE_INTERVAL) {
        console.log('⏱️ Throttling widget update - adding to queue');
        this.addToQueue(photoUri, partnerName);
        return true;
      }

      // Update immediately
      const success = await this.performWidgetUpdate(photoUri, partnerName);
      
      if (success) {
        this.lastUpdateTime = now;
      } else {
        // Add to queue for retry
        this.addToQueue(photoUri, partnerName);
      }

      return success;

    } catch (error) {
      console.error('Error updating widget:', error);
      this.addToQueue(photoUri, partnerName);
      return false;
    }
  }

  /**
   * Perform actual widget update
   */
  private async performWidgetUpdate(photoUri: string, partnerName: string): Promise<boolean> {
    try {
      console.log('🔄 Updating widget with photo:', photoUri);

      // Verify photo exists
      const photoInfo = await FileSystem.getInfoAsync(photoUri);
      if (!photoInfo.exists) {
        console.error('❌ Photo does not exist:', photoUri);
        return false;
      }

      // Get file path (remove file:// prefix if present)
      const filePath = photoUri.replace('file://', '');

      // Update widget
      const timestamp = Date.now();
      await PairlyWidget.updateWidget(filePath, partnerName, timestamp);

      // Store latest widget data
      await this.storeWidgetData({
        uri: filePath,
        timestamp,
        partnerName,
      });

      console.log('✅ Widget updated successfully');
      return true;

    } catch (error) {
      console.error('❌ Widget update failed:', error);
      return false;
    }
  }

  /**
   * Add update to queue
   */
  private addToQueue(photoUri: string, partnerName: string): void {
    // Remove any existing updates for the same photo
    this.updateQueue = this.updateQueue.filter(item => item.photoUri !== photoUri);

    // Add new update
    this.updateQueue.push({
      photoUri,
      partnerName,
      timestamp: Date.now(),
      retries: 0,
    });

    console.log(`📋 Added to widget queue (${this.updateQueue.length} pending)`);

    // Process queue after a short delay
    setTimeout(() => this.processQueue(), 1500);
  }

  /**
   * Process update queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.updateQueue.length > 0) {
      const update = this.updateQueue[0];

      // Check if too many retries
      if (update.retries >= this.MAX_RETRIES) {
        console.warn('⚠️ Max retries reached for widget update - skipping');
        this.updateQueue.shift();
        continue;
      }

      // Try to update
      const success = await this.performWidgetUpdate(update.photoUri, update.partnerName);

      if (success) {
        // Remove from queue
        this.updateQueue.shift();
        this.lastUpdateTime = Date.now();
      } else {
        // Increment retry count
        update.retries++;
        console.log(`⚠️ Widget update failed - retry ${update.retries}/${this.MAX_RETRIES}`);
        
        // Move to end of queue
        this.updateQueue.shift();
        if (update.retries < this.MAX_RETRIES) {
          this.updateQueue.push(update);
        }
      }

      // Wait between updates
      await new Promise(resolve => setTimeout(resolve, this.MIN_UPDATE_INTERVAL));
    }

    this.isProcessingQueue = false;
    console.log('✅ Widget queue processed');
  }

  /**
   * Update widget when photo is received (optimized)
   */
  async onPhotoReceived(photoUri: string, partnerName?: string): Promise<void> {
    console.log('📱 New photo received, updating widget...');
    
    const success = await this.updateWidget(photoUri, partnerName || 'Partner');
    if (success) {
      console.log('✅ Widget updated with new photo');
    } else {
      console.log('⚠️ Widget update queued for retry');
    }
  }

  /**
   * Clear widget
   */
  async clearWidget(): Promise<boolean> {
    if (!this.isEnabled || !PairlyWidget) {
      return false;
    }

    try {
      console.log('Clearing widget');
      
      await PairlyWidget.clearWidget();
      await this.clearWidgetData();
      
      console.log('Widget cleared successfully');
      return true;

    } catch (error) {
      console.error('Error clearing widget:', error);
      return false;
    }
  }

  /**
   * Get current widget data
   */
  async getWidgetData(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem('pairly_widget_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting widget data:', error);
      return null;
    }
  }

  /**
   * Store widget data
   */
  private async storeWidgetData(data: any): Promise<void> {
    try {
      await AsyncStorage.setItem('pairly_widget_data', JSON.stringify(data));
    } catch (error) {
      console.error('Error storing widget data:', error);
    }
  }

  /**
   * Clear widget data
   */
  private async clearWidgetData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('pairly_widget_data');
    } catch (error) {
      console.error('Error clearing widget data:', error);
    }
  }

  /**
   * Refresh widget with latest photo
   */
  async refreshWidget(): Promise<boolean> {
    try {
      const widgetData = await this.getWidgetData();
      
      if (widgetData) {
        return await this.updateWidget(widgetData.uri, widgetData.partnerName);
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing widget:', error);
      return false;
    }
  }

  /**
   * Initialize widget service
   */
  async initialize(): Promise<void> {
    if (!this.isEnabled) {
      console.log('Widget service not available on this platform');
      return;
    }

    try {
      console.log('🚀 Initializing optimized widget service');

      // Check widget support
      const isSupported = await PairlyWidget.hasWidgets();
      console.log('Widget support:', isSupported);

      if (isSupported) {
        // Restore last widget photo if available
        const widgetData = await this.getWidgetData();
        if (widgetData) {
          console.log('Restoring widget with saved photo');
          await this.updateWidget(widgetData.uri, widgetData.partnerName);
        }
      }

      console.log('✅ Optimized widget service initialized');
    } catch (error) {
      console.error('Error initializing widget service:', error);
    }
  }

  /**
   * Get queue status (for debugging)
   */
  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.updateQueue.length,
      processing: this.isProcessingQueue,
    };
  }
}

// Export singleton instance
const optimizedWidgetService = OptimizedWidgetService.getInstance();
export default optimizedWidgetService;
