/**
 * Enhanced Notification Service
 * Shows beautiful notifications when partner sends moments
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import NotificationService from './notificationService';

// Configure notification behavior with sound and vibration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldSetBadge: true,
    shouldPlaySound: true, // Enable sound for moments
  }),
});

class EnhancedNotificationService {
  /**
   * Show notification when partner sends moment
   */
  static async showMomentNotification(partnerName: string, momentId: string): Promise<void> {
    try {
      // Check if notifications are enabled
      const settings = await NotificationService.getReminderSettings();
      if (!settings.partnerActivity.enabled) {
        console.log('Partner activity notifications disabled');
        return;
      }

      // Schedule notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💕 New Moment from ${partnerName}`,
          body: 'Tap to view your special moment together',
          data: { 
            type: 'new_moment',
            momentId,
            partnerName,
          },
          sound: 'default',
          badge: 1,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Show immediately
      });

      console.log('✅ Moment notification shown');
    } catch (error) {
      console.error('Error showing moment notification:', error);
    }
  }

  /**
   * Show notification when moment is delivered
   */
  static async showDeliveryNotification(partnerName: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Moment Delivered',
          body: `${partnerName} received your moment`,
          data: { 
            type: 'moment_delivered',
            partnerName,
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null,
      });

      console.log('✅ Delivery notification shown');
    } catch (error) {
      console.error('Error showing delivery notification:', error);
    }
  }

  /**
   * Show notification when partner views moment
   */
  static async showViewedNotification(partnerName: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '👀 Moment Viewed',
          body: `${partnerName} viewed your moment`,
          data: { 
            type: 'moment_viewed',
            partnerName,
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.LOW,
        },
        trigger: null,
      });

      console.log('✅ Viewed notification shown');
    } catch (error) {
      console.error('Error showing viewed notification:', error);
    }
  }

  /**
   * Clear all moment notifications
   */
  static async clearMomentNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
      console.log('✅ Notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Handle notification tap
   */
  static setupNotificationHandlers(
    onMomentTap: (momentId: string) => void,
    onDeliveryTap: () => void
  ): void {
    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      switch (data.type) {
        case 'new_moment':
          onMomentTap(data.momentId as string);
          break;
        case 'moment_delivered':
        case 'moment_viewed':
          onDeliveryTap();
          break;
      }
    });

    console.log('✅ Notification handlers setup');
  }
}

export default EnhancedNotificationService;
