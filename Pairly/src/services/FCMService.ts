import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

class FCMService {
  private fcmToken: string | null = null;

  /**
   * Initialize FCM and request permissions
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
      console.log('⚠️ FCM only available on Android');
      return;
    }

    try {
      // Request permission (Android 13+)
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('❌ FCM permission denied');
        return;
      }

      // Get FCM token
      const token = await messaging().getToken();
      this.fcmToken = token;
      console.log('✅ FCM Token:', token);

      // Save token locally
      await AsyncStorage.setItem('fcmToken', token);

      // Register token with backend
      await this.registerTokenWithBackend(token);

      // Setup message handlers
      this.setupMessageHandlers();
    } catch (error) {
      console.error('❌ FCM initialization error:', error);
    }
  }

  /**
   * Register FCM token with backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        console.log('⚠️ No userId found, skipping FCM registration');
        return;
      }

      const response = await fetch(`${API_CONFIG.baseUrl}/users/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          fcmToken: token,
        }),
      });

      if (response.ok) {
        console.log('✅ FCM token registered with backend');
      } else {
        console.log('⚠️ Failed to register FCM token:', response.status);
      }
    } catch (error) {
      console.log('⚠️ Backend offline, FCM token not registered');
    }
  }

  /**
   * Setup foreground and background message handlers
   */
  private setupMessageHandlers(): void {
    // Foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('📥 FCM Foreground Message:', remoteMessage);
      await this.handleMessage(remoteMessage);
    });

    // Background messages (app in background/quit)
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📥 FCM Background Message:', remoteMessage);
      await this.handleMessage(remoteMessage);
    });

    // Token refresh
    messaging().onTokenRefresh(async (token) => {
      console.log('🔄 FCM Token refreshed:', token);
      this.fcmToken = token;
      await AsyncStorage.setItem('fcmToken', token);
      await this.registerTokenWithBackend(token);
    });
  }

  /**
   * Handle incoming FCM message
   */
  private async handleMessage(remoteMessage: any): Promise<void> {
    const { data } = remoteMessage;

    if (!data) {
      console.log('⚠️ No data in FCM message');
      return;
    }

    console.log('📦 FCM Data:', data);

    // Handle different message types
    switch (data.type) {
      case 'new_moment':
        await this.handleNewMoment(data);
        break;
      case 'new_photo':
        await this.handleNewPhoto(data);
        break;
      case 'partner_connected':
        await this.handlePartnerConnected(data);
        break;
      case 'shared_note':
        await this.handleSharedNote(data);
        break;
      default:
        console.log('⚠️ Unknown FCM message type:', data.type);
    }
  }

  /**
   * Handle new moment notification (with base64 photo data)
   */
  private async handleNewMoment(data: any): Promise<void> {
    try {
      console.log('📸 [FCM] New moment notification received');

      // ⚡ SIMPLE: Just show notification - widget will poll backend for photo
      const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
      
      await EnhancedNotificationService.showMomentNotification(
        data.partnerName || 'Partner',
        data.momentId
      );

      console.log('✅ [FCM] Notification shown - widget will fetch photo from backend');

      // Show enhanced notification with sound
      await EnhancedNotificationService.showMomentNotification(
        data.partnerName || 'Partner',
        data.momentId || 'unknown'
      );

    } catch (error) {
      console.error('❌ Error handling new moment:', error);
    }
  }

  /**
   * Handle new photo notification (legacy - for URL-based photos)
   */
  private async handleNewPhoto(data: any): Promise<void> {
    try {
      console.log('📸 [FCM] New photo notification received (URL)');

      // ⚡ SIMPLE: Just show notification - widget will poll backend for photo
      const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
      
      await EnhancedNotificationService.showMomentNotification(
        data.partnerName || 'Partner',
        data.momentId || 'new'
      );

      console.log('✅ [FCM] Notification shown - widget will fetch photo from backend');
    } catch (error) {
      console.error('❌ Error handling new photo:', error);
    }
  }

  /**
   * Handle partner connected notification
   */
  private async handlePartnerConnected(data: any): Promise<void> {
    console.log('🎉 Partner connected via FCM:', data.partnerName);
    // Show notification or update UI
  }

  /**
   * Handle shared note notification
   */
  private async handleSharedNote(data: any): Promise<void> {
    console.log('📝 Shared note via FCM:', data.content);
    // Show notification
  }

  /**
   * Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get current FCM token
   */
  async getToken(): Promise<string | null> {
    if (this.fcmToken) {
      return this.fcmToken;
    }

    try {
      const token = await AsyncStorage.getItem('fcmToken');
      this.fcmToken = token;
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }
}

export default new FCMService();
