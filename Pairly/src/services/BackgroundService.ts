import { Platform, AppState, AppStateStatus } from 'react-native';
import RealtimeService from './RealtimeService';
import AuthService from './AuthService';

const sleep = (time: number) => new Promise<void>(resolve => setTimeout(() => resolve(), time));

class PairlyBackgroundService {
  private isRunning = false;
  private userId: string | null = null;
  private appStateSubscription: any = null;

  /**
   * Start background service (simplified for Expo Go)
   */
  async startService(userId: string): Promise<void> {
    if (this.isRunning) {
      console.log('Background service already running');
      return;
    }

    this.userId = userId;
    this.isRunning = true;

    // Connect Socket.IO
    if (this.userId) {
      await RealtimeService.connect(this.userId);
    }

    // Monitor app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    console.log('Background service started (Expo Go mode)');
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    console.log('App state changed to:', nextAppState);

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App going to background, ensure connection is maintained
      if (this.userId && !RealtimeService.getConnectionStatus()) {
        console.log('Reconnecting Socket.IO as app goes to background...');
        await RealtimeService.connect(this.userId);
      }
    } else if (nextAppState === 'active') {
      // App coming to foreground, check connection
      if (this.userId && !RealtimeService.getConnectionStatus()) {
        console.log('Reconnecting Socket.IO as app comes to foreground...');
        await RealtimeService.connect(this.userId);
      }
    }
  };

  /**
   * Stop background service
   */
  async stopService(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Disconnect Socket.IO
    RealtimeService.disconnect();

    this.isRunning = false;
    this.userId = null;

    console.log('Background service stopped');
  }

  /**
   * Check if service is running
   */
  async isServiceRunning(): Promise<boolean> {
    return this.isRunning;
  }

  /**
   * Update service with new user ID
   */
  async updateUserId(userId: string): Promise<void> {
    this.userId = userId;
    
    if (this.isRunning) {
      // Reconnect with new user ID
      await RealtimeService.disconnect();
      await RealtimeService.connect(userId);
    }
  }

  /**
   * Maintain connection (called periodically when app is active)
   */
  async maintainConnection(): Promise<void> {
    if (!this.isRunning || !this.userId) {
      return;
    }

    try {
      // Check if connection is alive
      if (!RealtimeService.getConnectionStatus()) {
        console.log('Reconnecting Socket.IO...');
        await RealtimeService.connect(this.userId);
      } else {
        // Send heartbeat
        RealtimeService.emit('heartbeat', { timestamp: Date.now() });
      }
    } catch (error) {
      console.error('Error maintaining connection:', error);
    }
  }
}

export default new PairlyBackgroundService();