/**
 * Notification Service
 * Handles push notifications and local notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if physical device
      if (!Device.isDevice) {
        console.log('⚠️ Notifications only work on physical devices');
        return false;
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.log('❌ Notification permission denied');
        return false;
      }

      // Get push token
      this.pushToken = await this.getPushToken();
      
      if (this.pushToken) {
        console.log('✅ Push token:', this.pushToken);
        await this.savePushToken(this.pushToken);
      }

      // Configure Android channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }

      // Setup listeners
      this.setupListeners();

      console.log('✅ Notifications initialized');
      return true;

    } catch (error) {
      console.error('❌ Notification init error:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  /**
   * Get Expo push token
   */
  private async getPushToken(): Promise<string | null> {
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return token;
    } catch (error) {
      console.error('Get push token error:', error);
      return null;
    }
  }

  /**
   * Save push token to storage
   */
  private async savePushToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('push_token', token);
      // TODO: Send token to backend server
    } catch (error) {
      console.error('Save push token error:', error);
    }
  }

  /**
   * Setup Android notification channel
   */
  private async setupAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pairly Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B9D',
      sound: 'default',
    });
  }

  /**
   * Setup notification listeners
   */
  private setupListeners(): void {
    // Notification received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('📬 Notification received:', notification);
    });

    // User tapped on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('👆 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      
      // Handle notification tap
      if (data.type === 'new_photo') {
        // Navigate to gallery
        // TODO: Implement navigation
      }
    });
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          badge: 1,
        },
        trigger: null, // Immediate
      });
    } catch (error) {
      console.error('Send notification error:', error);
    }
  }

  /**
   * Notify when partner sends photo
   */
  async notifyPhotoReceived(partnerName: string, photoId: string): Promise<void> {
    await this.sendLocalNotification(
      `❤️ New moment from ${partnerName}`,
      'Your partner just shared a special moment!',
      {
        type: 'new_photo',
        photoId,
      }
    );
  }

  /**
   * Notify when partner reacts to photo
   */
  async notifyReaction(partnerName: string, reaction: string, photoId: string): Promise<void> {
    await this.sendLocalNotification(
      `${reaction} ${partnerName} reacted`,
      'Your partner loved your moment!',
      {
        type: 'reaction',
        photoId,
        reaction,
      }
    );
  }

  /**
   * Notify when partner comes online
   */
  async notifyPartnerOnline(partnerName: string): Promise<void> {
    await this.sendLocalNotification(
      `💚 ${partnerName} is online`,
      'Your partner just came online',
      {
        type: 'partner_online',
      }
    );
  }

  /**
   * Schedule reminder notification
   */
  async scheduleReminder(
    title: string,
    body: string,
    seconds: number
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: {
          seconds,
        },
      });
    } catch (error) {
      console.error('Schedule notification error:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Clear notifications error:', error);
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Set badge count error:', error);
    }
  }

  /**
   * Get notification settings
   */
  async getSettings(): Promise<any> {
    try {
      return await Notifications.getPermissionsAsync();
    } catch (error) {
      console.error('Get settings error:', error);
      return null;
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default new NotificationService();
