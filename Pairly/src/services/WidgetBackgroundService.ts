/**
 * Widget Background Service
 * Manages foreground service for widget updates
 */

import { NativeModules, Platform } from 'react-native';

const { BackgroundServiceModule } = NativeModules;

class WidgetBackgroundService {
  private static instance: WidgetBackgroundService | null = null;
  private isRunning = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): WidgetBackgroundService {
    if (!WidgetBackgroundService.instance) {
      WidgetBackgroundService.instance = new WidgetBackgroundService();
    }
    return WidgetBackgroundService.instance;
  }

  /**
   * Start background service for widget updates
   */
  async startService(): Promise<boolean> {
    if (Platform.OS !== 'android' || !BackgroundServiceModule) {
      console.log('⚠️ Background service not available on this platform');
      return false;
    }

    if (this.isRunning) {
      console.log('✅ Background service already running');
      return true;
    }

    try {
      console.log('🚀 Starting widget background service...');
      
      await BackgroundServiceModule.startService();
      this.isRunning = true;
      
      console.log('✅ Widget background service started');
      return true;
      
    } catch (error) {
      console.error('❌ Error starting background service:', error);
      return false;
    }
  }

  /**
   * Stop background service
   */
  async stopService(): Promise<boolean> {
    if (Platform.OS !== 'android' || !BackgroundServiceModule) {
      return false;
    }

    if (!this.isRunning) {
      console.log('⚠️ Background service not running');
      return true;
    }

    try {
      console.log('🛑 Stopping widget background service...');
      
      await BackgroundServiceModule.stopService();
      this.isRunning = false;
      
      console.log('✅ Widget background service stopped');
      return true;
      
    } catch (error) {
      console.error('❌ Error stopping background service:', error);
      return false;
    }
  }

  /**
   * Check if service is running
   */
  async isServiceRunning(): Promise<boolean> {
    if (Platform.OS !== 'android' || !BackgroundServiceModule) {
      return false;
    }

    try {
      const running = await BackgroundServiceModule.isServiceRunning();
      this.isRunning = running;
      return running;
    } catch (error) {
      console.error('Error checking service status:', error);
      return false;
    }
  }

  /**
   * Initialize service (start if needed)
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      console.log('📱 Initializing widget background service...');
      
      // Check if already running
      const running = await this.isServiceRunning();
      
      if (!running) {
        // Start service
        await this.startService();
      } else {
        console.log('✅ Background service already initialized');
      }
      
    } catch (error) {
      console.error('Error initializing background service:', error);
    }
  }
}

// Export singleton instance
const widgetBackgroundServiceInstance = WidgetBackgroundService.getInstance();
export default widgetBackgroundServiceInstance;
