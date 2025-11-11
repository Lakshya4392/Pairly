/**
 * Widget Service - Manages Android home screen widget
 */

import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PairlyWidget } = NativeModules;

export interface WidgetPhoto {
  uri: string;
  timestamp: number;
  partnerName?: string;
}

class WidgetService {
  private static instance: WidgetService | null = null;
  private isEnabled = Platform.OS === 'android';

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService();
    }
    return WidgetService.instance;
  }

  /**
   * Check if widgets are supported and available
   */
  async isWidgetSupported(): Promise<boolean> {
    if (!this.isEnabled || !PairlyWidget) {
      return false;
    }

    try {
      return await PairlyWidget.hasWidgets();
    } catch (error) {
      console.error('Error checking widget support:', error);
      return false;
    }
  }

  /**
   * Update widget with new partner photo
   */
  async updateWidget(photoUri: string, partnerName: string = 'Your Partner'): Promise<boolean> {
    if (!this.isEnabled || !PairlyWidget) {
      console.log('Widget not supported on this platform');
      return false;
    }

    try {
      console.log('Updating widget with photo:', photoUri);

      // Save photo to permanent location
      const savedPhotoPath = await this.savePhotoForWidget(photoUri);
      if (!savedPhotoPath) {
        throw new Error('Failed to save photo for widget');
      }

      // Update widget
      const timestamp = Date.now();
      await PairlyWidget.updateWidget(savedPhotoPath, partnerName, timestamp);

      // Store latest widget data
      await this.storeWidgetData({
        uri: savedPhotoPath,
        timestamp,
        partnerName,
      });

      console.log('Widget updated successfully');
      return true;

    } catch (error) {
      console.error('Error updating widget:', error);
      return false;
    }
  }

  /**
   * Clear widget photo
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
   * Get current widget photo data
   */
  async getWidgetData(): Promise<WidgetPhoto | null> {
    try {
      const data = await AsyncStorage.getItem('pairly_widget_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting widget data:', error);
      return null;
    }
  }

  /**
   * Save photo to permanent location for widget use
   */
  private async savePhotoForWidget(photoUri: string): Promise<string | null> {
    try {
      // Create widget photos directory
      const widgetDir = `${FileSystem.documentDirectory}widget_photos/`;
      const dirInfo = await FileSystem.getInfoAsync(widgetDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(widgetDir, { intermediates: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `widget_photo_${timestamp}.jpg`;
      const destinationPath = `${widgetDir}${filename}`;

      // Copy photo to permanent location
      await FileSystem.copyAsync({
        from: photoUri,
        to: destinationPath,
      });

      // Clean up old widget photos (keep only latest 3)
      await this.cleanupOldWidgetPhotos(widgetDir);

      // Return the file system path (not file:// URI)
      return destinationPath.replace('file://', '');

    } catch (error) {
      console.error('Error saving photo for widget:', error);
      return null;
    }
  }

  /**
   * Clean up old widget photos to save space
   */
  private async cleanupOldWidgetPhotos(widgetDir: string): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(widgetDir);
      const photoFiles = files
        .filter(file => file.startsWith('widget_photo_'))
        .sort()
        .reverse(); // Most recent first

      // Keep only the latest 3 photos
      if (photoFiles.length > 3) {
        const filesToDelete = photoFiles.slice(3);
        
        for (const file of filesToDelete) {
          await FileSystem.deleteAsync(`${widgetDir}${file}`, { idempotent: true });
        }
        
        console.log(`Cleaned up ${filesToDelete.length} old widget photos`);
      }
    } catch (error) {
      console.error('Error cleaning up old widget photos:', error);
    }
  }

  /**
   * Store widget data in AsyncStorage
   */
  private async storeWidgetData(data: WidgetPhoto): Promise<void> {
    try {
      await AsyncStorage.setItem('pairly_widget_data', JSON.stringify(data));
    } catch (error) {
      console.error('Error storing widget data:', error);
    }
  }

  /**
   * Clear stored widget data
   */
  private async clearWidgetData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('pairly_widget_data');
    } catch (error) {
      console.error('Error clearing widget data:', error);
    }
  }

  /**
   * Update widget when app receives new photo
   */
  async onPhotoReceived(photoUri: string, partnerName?: string): Promise<void> {
    console.log('📱 New photo received, updating widget...');
    
    const success = await this.updateWidget(photoUri, partnerName);
    if (success) {
      console.log('✅ Widget updated with new photo');
    } else {
      console.log('❌ Failed to update widget with new photo');
    }
  }

  /**
   * Setup background listener for widget updates
   */
  async setupBackgroundUpdates(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    console.log('📱 Setting up widget background updates');
    
    // Widget will be updated when:
    // 1. App receives new photo (via RealtimeService)
    // 2. App comes to foreground
    // 3. User manually refreshes
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
      const isSupported = await this.isWidgetSupported();
      console.log('Widget support:', isSupported);

      if (isSupported) {
        // Restore last widget photo if available
        const widgetData = await this.getWidgetData();
        if (widgetData) {
          console.log('Restoring widget with saved photo');
          await this.updateWidget(widgetData.uri, widgetData.partnerName);
        }
      }
    } catch (error) {
      console.error('Error initializing widget service:', error);
    }
  }
}

// Export singleton instance
const widgetServiceInstance = WidgetService.getInstance();
export default widgetServiceInstance;