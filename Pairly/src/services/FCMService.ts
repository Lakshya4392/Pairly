import messaging from '@react-native-firebase/messaging';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import Logger from '../utils/Logger';

const { SharedPrefsModule } = NativeModules;

class FCMService {
  private fcmToken: string | null = null;

  /**
   * Initialize FCM and request permissions
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
      Logger.debug('⚠️ FCM only available on Android');
      return;
    }

    try {
      // Request permission (Android 13+)
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        Logger.warn('❌ FCM permission denied');
        return;
      }

      // 🔥 FIX: Create Notification Channel (Required for Android 8+)
      // Backend sends channelId: 'moments'
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('moments', {
          name: 'Moments',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        Logger.debug('✅ Notification Channel created');
      }

      // Get FCM token
      const token = await messaging().getToken();
      this.fcmToken = token;
      Logger.debug('✅ FCM Token found');

      // Save token locally
      await AsyncStorage.setItem('fcmToken', token);

      // Register token with backend
      await this.registerTokenWithBackend(token);

      // Setup message handlers
      this.setupMessageHandlers();
    } catch (error) {
      Logger.error('❌ FCM initialization error:', error);
    }
  }
  /**
   * Register FCM token with backend
   * Uses clerkId for consistency with socket system
   * 🔧 IMPROVED: Added retry logic with exponential backoff
   */
  private async registerTokenWithBackend(token: string, retryCount = 0): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 3000, 5000]; // 1s, 3s, 5s

    try {
      // Get clerkId from stored user object
      const userJson = await AsyncStorage.getItem('pairly_user');
      let clerkId: string | null = null;
      let userId: string | null = null;

      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          clerkId = user.clerkId; // ⚡ Use clerkId for consistency
          userId = user.id;       // Fallback: database ID
        } catch (e) {
          Logger.warn('⚠️ Failed to parse user JSON');
        }
      }

      // Must have at least one identifier
      if (!clerkId && !userId) {
        Logger.debug('⚠️ No user identifier found, skipping FCM registration');
        return;
      }

      // Get auth token for authenticated request
      const authToken = await AsyncStorage.getItem('auth_token');

      const response = await fetch(`${API_CONFIG.baseUrl}/users/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          clerkId,      // ⚡ Send clerkId (preferred)
          userId,       // Also send userId as fallback
          fcmToken: token,
        }),
      });

      if (response.ok) {
        Logger.info('✅ FCM token registered for:', clerkId || userId);
      } else {
        const errorText = await response.text();
        Logger.warn('⚠️ Failed to register FCM token:', response.status, errorText);

        // 🔧 RETRY: If server error (5xx) or network issue, retry
        if ((response.status >= 500 || response.status === 0) && retryCount < MAX_RETRIES) {
          Logger.info(`🔄 Retrying FCM registration (${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise(r => setTimeout(r, RETRY_DELAYS[retryCount]));
          return this.registerTokenWithBackend(token, retryCount + 1);
        }
      }
    } catch (error) {
      Logger.warn('⚠️ Backend offline, FCM token not registered');

      // 🔧 RETRY: On network error, retry
      if (retryCount < MAX_RETRIES) {
        Logger.info(`🔄 Retrying FCM registration (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(r => setTimeout(r, RETRY_DELAYS[retryCount]));
        return this.registerTokenWithBackend(token, retryCount + 1);
      }
    }
  }

  /**
   * Public method to register user with backend
   * Should be called after successful login
   */
  public async registerUser(): Promise<void> {
    Logger.debug('🔄 Manually registering user for FCM...');

    // Ensure we have a token
    if (!this.fcmToken) {
      try {
        const token = await messaging().getToken();
        if (token) {
          this.fcmToken = token;
          await AsyncStorage.setItem('fcmToken', token);
        }
      } catch (e) {
        Logger.warn('⚠️ Failed to get FCM token for manual registration');
        return;
      }
    }

    if (this.fcmToken) {
      await this.registerTokenWithBackend(this.fcmToken);
    } else {
      Logger.warn('⚠️ No FCM token available for registration');
    }
  }

  /**
   * Setup foreground and background message handlers
   */
  private setupMessageHandlers(): void {
    // Foreground messages
    messaging().onMessage(async (remoteMessage: any) => {
      Logger.debug('📥 FCM Foreground Message:', remoteMessage);
      await this.handleMessage(remoteMessage);
    });

    // Background messages (app in background/quit)
    messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
      Logger.debug('📥 FCM Background Message:', remoteMessage);
      await this.handleMessage(remoteMessage);
    });

    // Token refresh
    messaging().onTokenRefresh(async (token: string) => {
      Logger.info('🔄 FCM Token refreshed');
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
      Logger.warn('⚠️ No data in FCM message');
      return;
    }

    Logger.debug('📦 FCM Data:', data);

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
      case 'partner_disconnected':
        await this.handlePartnerDisconnected(data);
        break;
      case 'shared_note':
        await this.handleSharedNote(data);
        break;
      case 'meeting_countdown':
        await this.handleMeetingCountdown(data);
        break;
      default:
        Logger.warn('⚠️ Unknown FCM message type:', data.type);
    }
  }

  /**
   * Handle new moment notification (with URL for background download)
   */
  private async handleNewMoment(data: any): Promise<void> {
    try {
      Logger.info('📸 [FCM] New moment notification received');

      const { photoUrl, momentId, partnerName } = data;

      // 1. Download photo if URL is provided
      if (photoUrl) {
        Logger.debug(`⬇️ [FCM] Downloading photo from: ${photoUrl}`);

        // Define local path (using Cache directory for temporary storage, or Document for persistence)
        // For widget, we need a stable path.
        const fileName = `widget_moment_latest.jpg`; // Always overwrite the same file for widget
        // Cast to any to avoid TS errors with some Expo versions
        const fs = FileSystem as any;
        const docDir = fs.documentDirectory || fs.cacheDirectory;
        const localUri = `${docDir}${fileName}`;

        // Download
        const downloadResult = await FileSystem.downloadAsync(photoUrl, localUri);

        if (downloadResult.status === 200) {
          Logger.debug(`✅ [FCM] Photo downloaded to: ${downloadResult.uri}`);

          // 2. Save path to SharedPrefs for Widget (Native Module)
          if (Platform.OS === 'android' && SharedPrefsModule) {
            // Remove 'file://' prefix for Android File API
            const cleanPath = downloadResult.uri.replace('file://', '');

            await SharedPrefsModule.setString('last_moment_path', cleanPath);
            await SharedPrefsModule.setString('last_moment_timestamp', Date.now().toString());
            await SharedPrefsModule.setString('last_moment_sender', partnerName || 'Partner');

            // 3. Trigger Widget Update
            await SharedPrefsModule.notifyWidgetUpdate();
            Logger.debug('✅ [FCM] Widget refresh triggered');
          }
        } else {
          Logger.error('❌ [FCM] Download failed:', downloadResult.status);
        }
      }

      // Show enhanced notification
      const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
      await EnhancedNotificationService.showMomentNotification(
        partnerName || 'Partner',
        momentId || 'unknown'
      );

    } catch (error) {
      Logger.error('❌ Error handling new moment:', error);
    }
  }

  /**
   * Handle new photo notification (legacy - for URL-based photos)
   */
  private async handleNewPhoto(data: any): Promise<void> {
    try {
      Logger.info('📸 [FCM] New photo notification received (URL)');

      // ⚡ SIMPLE: Just show notification - widget will poll backend for photo
      const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;

      await EnhancedNotificationService.showMomentNotification(
        data.partnerName || 'Partner',
        data.momentId || 'new'
      );

      Logger.debug('✅ [FCM] Notification shown - widget will fetch photo from backend');
    } catch (error) {
      Logger.error('❌ Error handling new photo:', error);
    }
  }

  /**
   * Handle partner connected notification
   */
  private async handlePartnerConnected(data: any): Promise<void> {
    Logger.info('🎉 Partner connected via FCM:', data.partnerName);
    // Show notification or update UI
  }

  /**
   * Handle shared note notification
   */
  private async handleSharedNote(data: any): Promise<void> {
    Logger.debug('📝 Shared note via FCM:', data.content);
    // Show notification
  }

  /**
   * 🔥 Handle partner disconnected notification
   * Clear all pairing data when partner disconnects
   */
  private async handlePartnerDisconnected(data: any): Promise<void> {
    Logger.warn('💔 [FCM] Partner disconnected notification received');

    try {
      // Clear all pairing data
      const PairingService = (await import('./PairingService')).default;
      await PairingService.removePair();
      Logger.info('✅ [FCM] All pairing data cleared');

      // Show notification
      const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
      await EnhancedNotificationService.showLocalNotification(
        '💔 Partner Disconnected',
        'Your partner has ended the connection'
      );
    } catch (error) {
      Logger.error('❌ [FCM] Error handling partner disconnect:', error);
    }
  }

  /**
   * 🔥 Handle meeting countdown notification from partner
   * Save meeting date locally and update widget
   */
  private async handleMeetingCountdown(data: any): Promise<void> {
    Logger.info('⏰ [FCM] Meeting countdown notification received');

    try {
      const { meetingDate, setBy } = data;

      if (meetingDate) {
        // Save to local storage
        await AsyncStorage.setItem('@pairly_meeting_date', meetingDate);

        // Update widget
        try {
          const { NativeModules } = require('react-native');
          const SharedPrefsModule = NativeModules.SharedPrefsModule;
          if (SharedPrefsModule) {
            await SharedPrefsModule.setString('meeting_date', meetingDate);
            await SharedPrefsModule.setString('partner_name_for_meet', setBy);
            await SharedPrefsModule.notifyWidgetUpdate();
          }
        } catch (widgetError) {
          Logger.warn('⚠️ Widget update failed:', widgetError);
        }

        // Show notification
        const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
        const date = new Date(meetingDate);
        const formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });

        await EnhancedNotificationService.showLocalNotification(
          `💕 ${setBy} set a meeting date!`,
          `You're meeting on ${formattedDate}! Countdown started ⏰`
        );
      }
    } catch (error) {
      Logger.error('❌ [FCM] Error handling meeting countdown:', error);
    }
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
