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
   * Update premium carousel widget with new partner photo
   */
  async updateWidget(photoUri: string, partnerName: string = 'Your Partner'): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('⚠️ Widget not supported - Platform is not Android');
      return false;
    }

    if (!PairlyWidget) {
      console.log('⚠️ Widget module not available - Native module not loaded');
      return false;
    }

    try {
      console.log('🎨 Updating premium carousel widget with photo:', photoUri);
      console.log('👤 Partner name:', partnerName);

      // Check if widget is actually added to home screen
      const hasWidgets = await PairlyWidget.hasWidgets();
      if (!hasWidgets) {
        console.log('⚠️ No widgets added to home screen - skipping update');
        return false;
      }
      console.log('✅ Widget found on home screen');

      // Save photo to permanent location
      console.log('💾 Saving photo to widget directory...');
      const savedPhotoPath = await this.savePhotoForWidget(photoUri);
      if (!savedPhotoPath) {
        throw new Error('Failed to save photo for widget');
      }
      console.log('✅ Photo saved to:', savedPhotoPath);

      // Update widget (premium carousel will auto-detect new photos)
      const timestamp = Date.now();
      console.log('📤 Calling native widget update (background)...');

      // ⚡ OPTIMIZED: Don't await native call, just fire it
      PairlyWidget.updateWidget(savedPhotoPath, partnerName, timestamp)
        .then(() => console.log('✅ Native widget update completed'))
        .catch((e: any) => console.error('❌ Native widget update failed:', e));

      // Store latest widget data
      await this.storeWidgetData({
        uri: savedPhotoPath,
        timestamp,
        partnerName,
      });

      console.log('✅ Premium carousel widget update triggered');
      return true;

    } catch (error) {
      console.error('❌ Error updating premium widget:', error);
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
    console.log('📱 [WIDGET] New photo received, updating widget...');
    console.log('📸 [WIDGET] Photo URI:', photoUri);
    console.log('❤️ [WIDGET] Partner name:', partnerName);
    console.log('🤖 [WIDGET] Platform:', Platform.OS);
    console.log('🔧 [WIDGET] isEnabled:', this.isEnabled);
    console.log('📦 [WIDGET] PairlyWidget module:', PairlyWidget ? 'Available' : 'Not available');

    // Verify photo exists before updating widget
    try {
      const fileInfo = await FileSystem.getInfoAsync(photoUri);
      if (!fileInfo.exists) {
        console.error('❌ [WIDGET] Photo file does not exist:', photoUri);
        return;
      }
      console.log('✅ [WIDGET] Photo file verified, size:', fileInfo.size);
    } catch (error) {
      console.error('❌ [WIDGET] Error verifying photo file:', error);
      return;
    }

    const success = await this.updateWidget(photoUri, partnerName || 'Partner');
    if (success) {
      console.log('✅ [WIDGET] Widget updated with new photo');
    } else {
      console.log('❌ [WIDGET] Failed to update widget with new photo');
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