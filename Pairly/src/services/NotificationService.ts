import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior - WITH SOUND for important notifications
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Check notification type
    const type = notification.request.content.data?.type;
    
    // Partner activity notifications should have sound
    const shouldPlaySound = type?.toString().includes('partner') || 
                           type === 'good_morning' || 
                           type === 'good_night';
    
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldSetBadge: true,
      shouldPlaySound, // Dynamic based on notification type
    };
  },
});

interface ReminderSettings {
  dailyMoment: { enabled: boolean; time: string }; // Scheduled at specific time
  goodMorning: { enabled: boolean; time: string }; // Scheduled at specific time (e.g., 8:00 AM)
  goodNight: { enabled: boolean; time: string }; // Scheduled at specific time (e.g., 10:00 PM)
  anniversary: { enabled: boolean; date: string | null }; // Scheduled on specific date
  dailyLimit: { enabled: boolean }; // Real-time when limit reached
  partnerActivity: { enabled: boolean }; // Real-time when partner sends moment/note
  dualComplete: { enabled: boolean }; // Real-time when dual moment completes
  timeLockUnlock: { enabled: boolean }; // Real-time when time-lock unlocks
}

class NotificationService {
  private static STORAGE_KEY = '@pairly_reminders';
  private static notificationIds: Map<string, string> = new Map();

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permission denied');
      return false;
    }

    // Configure notification channels for Android
    if (Platform.OS === 'android') {
      // High priority channel for moments and partner activity
      await Notifications.setNotificationChannelAsync('moments', {
        name: 'Moments & Partner Activity',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B9D',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Medium priority channel for reminders
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#FF6B9D',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Low priority channel for info
      await Notifications.setNotificationChannelAsync('info', {
        name: 'Information',
        importance: Notifications.AndroidImportance.LOW,
        lightColor: '#FF6B9D',
        showBadge: false,
      });
    }

    console.log('✅ Notification permissions granted');
    return true;
  }

  /**
   * Get reminder settings
   */
  static async getReminderSettings(): Promise<ReminderSettings> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading reminder settings:', error);
    }

    // Default settings
    return {
      dailyMoment: { enabled: false, time: '09:00' }, // 9:00 AM
      goodMorning: { enabled: false, time: '08:00' }, // 8:00 AM - Fixed morning time
      goodNight: { enabled: false, time: '22:00' }, // 10:00 PM - Fixed night time
      anniversary: { enabled: false, date: null },
      dailyLimit: { enabled: true }, // Real-time notification
      partnerActivity: { enabled: true }, // Real-time notification
      dualComplete: { enabled: true }, // Real-time notification
      timeLockUnlock: { enabled: true }, // Real-time notification
    };
  }

  /**
   * Save reminder settings
   */
  static async saveReminderSettings(settings: ReminderSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      console.log('✅ Reminder settings saved');
    } catch (error) {
      console.error('Error saving reminder settings:', error);
    }
  }

  /**
   * Schedule daily moment reminder (SCHEDULED - EXACT TIME)
   * Sends notification at EXACT time every day (e.g., 9:00 AM)
   * User can set custom time in settings
   * NO DELAY, NO RANDOM TIME
   */
  static async scheduleDailyMomentReminder(time: string, partnerName: string): Promise<void> {
    try {
      // Cancel existing
      await this.cancelReminder('dailyMoment');

      // Parse time (HH:MM)
      const [hour, minute] = time.split(':').map(Number);

      // Validate time
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        console.error('Invalid time format:', time);
        return;
      }

      // Schedule notification
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💕 Time to Share',
          body: `Share a moment with ${partnerName} today!`,
          data: { type: 'daily_moment' },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          hour,
          minute,
          repeats: true,
          channelId: 'reminders', // Use reminders channel
        } as any,
      });

      this.notificationIds.set('dailyMoment', id);
      console.log(`✅ Daily moment reminder scheduled for ${hour}:${minute.toString().padStart(2, '0')} daily`);
      
      // Verify scheduling
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const thisNotif = scheduled.find(n => n.identifier === id);
      if (thisNotif) {
        console.log('✅ Verified: Daily moment notification is scheduled');
      }
    } catch (error) {
      console.error('Error scheduling daily moment reminder:', error);
    }
  }

  /**
   * Schedule good morning reminder (SCHEDULED - EXACT TIME)
   * Sends notification at EXACT time every day (default: 8:00 AM)
   * NO DELAY, NO RANDOM TIME
   */
  static async scheduleGoodMorningReminder(time: string, partnerName: string): Promise<void> {
    try {
      await this.cancelReminder('goodMorning');

      const [hour, minute] = time.split(':').map(Number);

      // Validate time
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        console.error('Invalid time format:', time);
        return;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '☀️ Good Morning!',
          body: `Say good morning to ${partnerName} 💕`,
          data: { type: 'good_morning' },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          hour,
          minute,
          repeats: true,
          channelId: 'reminders', // Use reminders channel
        } as any,
      });

      this.notificationIds.set('goodMorning', id);
      console.log(`✅ Good morning reminder scheduled for ${hour}:${minute.toString().padStart(2, '0')} daily`);
      
      // Verify scheduling
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const thisNotif = scheduled.find(n => n.identifier === id);
      if (thisNotif) {
        console.log('✅ Verified: Good morning notification is scheduled');
      }
    } catch (error) {
      console.error('Error scheduling good morning reminder:', error);
    }
  }

  /**
   * Schedule good night reminder (SCHEDULED - EXACT TIME)
   * Sends notification at EXACT time every day (default: 10:00 PM)
   * NO DELAY, NO RANDOM TIME
   */
  static async scheduleGoodNightReminder(time: string, partnerName: string): Promise<void> {
    try {
      await this.cancelReminder('goodNight');

      const [hour, minute] = time.split(':').map(Number);

      // Validate time
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        console.error('Invalid time format:', time);
        return;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 Good Night!',
          body: `Send a goodnight moment to ${partnerName} 💕`,
          data: { type: 'good_night' },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          hour,
          minute,
          repeats: true,
          channelId: 'reminders', // Use reminders channel
        } as any,
      });

      this.notificationIds.set('goodNight', id);
      console.log(`✅ Good night reminder scheduled for ${hour}:${minute.toString().padStart(2, '0')} daily`);
      
      // Verify scheduling
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const thisNotif = scheduled.find(n => n.identifier === id);
      if (thisNotif) {
        console.log('✅ Verified: Good night notification is scheduled');
      }
    } catch (error) {
      console.error('Error scheduling good night reminder:', error);
    }
  }

  /**
   * Schedule anniversary reminder
   */
  static async scheduleAnniversaryReminder(date: string, partnerName: string): Promise<void> {
    try {
      await this.cancelReminder('anniversary');

      const anniversaryDate = new Date(date);
      const now = new Date();

      // Schedule 1 week before
      const oneWeekBefore = new Date(anniversaryDate);
      oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
      
      if (oneWeekBefore > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💕 Anniversary Coming Up!',
            body: `Your anniversary with ${partnerName} is in 1 week!`,
            data: { type: 'anniversary_week' },
          },
          trigger: {
            date: oneWeekBefore,
          } as any,
        });
      }

      // Schedule 1 day before
      const oneDayBefore = new Date(anniversaryDate);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      
      if (oneDayBefore > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💕 Anniversary Tomorrow!',
            body: `Tomorrow is your special day with ${partnerName}!`,
            data: { type: 'anniversary_day' },
          },
          trigger: {
            date: oneDayBefore,
          } as any,
        });
      }

      // Schedule on the day
      if (anniversaryDate > now) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎉 Happy Anniversary!',
            body: `Celebrate your special day with ${partnerName}! 💕`,
            data: { type: 'anniversary' },
          },
          trigger: {
            date: anniversaryDate,
          } as any,
        });

        this.notificationIds.set('anniversary', id);
      }

      console.log('✅ Anniversary reminders scheduled');
    } catch (error) {
      console.error('Error scheduling anniversary reminder:', error);
    }
  }

  /**
   * Send daily limit warning (REAL-TIME)
   * Triggers immediately when user reaches 2/3 or 3/3 moments
   * Only for free users
   */
  static async sendDailyLimitWarning(remaining: number): Promise<void> {
    try {
      const settings = await this.getReminderSettings();
      if (!settings.dailyLimit.enabled) return;

      let title = '';
      let body = '';

      if (remaining === 1) {
        title = '⚠️ Last Moment Today';
        body = 'You have 1 moment left today. Upgrade for unlimited!';
      } else if (remaining === 0) {
        title = '🔒 Daily Limit Reached';
        body = 'You\'ve used all 3 moments today. Upgrade to Premium for unlimited moments!';
      }

      if (title) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: 'daily_limit', remaining },
          },
          trigger: null, // Send immediately
        });

        console.log('✅ Daily limit warning sent');
      }
    } catch (error) {
      console.error('Error sending daily limit warning:', error);
    }
  }

  /**
   * Send partner activity notification (REAL-TIME)
   * Triggers immediately when partner sends moment/note
   */
  static async sendPartnerActivity(type: 'moment' | 'note' | 'dual', partnerName: string, title?: string): Promise<void> {
    try {
      // Check if partner activity notifications are enabled
      const settings = await this.getReminderSettings();
      if (!settings.partnerActivity.enabled) {
        console.log('Partner activity notifications disabled');
        return;
      }

      let notifTitle = '';
      let notifBody = '';

      switch (type) {
        case 'moment':
          notifTitle = '📸 New Moment!';
          notifBody = `${partnerName} sent you a moment 💕`;
          break;
        case 'note':
          notifTitle = '💌 New Note!';
          notifBody = `${partnerName} sent you a love note`;
          break;
        case 'dual':
          notifTitle = '📸 Dual Moment Complete!';
          notifBody = `${partnerName} added their photo to "${title}"!`;
          break;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notifTitle,
          body: notifBody,
          data: { type: `partner_${type}` },
        },
        trigger: null, // Send immediately
      });

      console.log('✅ Partner activity notification sent (real-time)');
    } catch (error) {
      console.error('Error sending partner activity notification:', error);
    }
  }

  /**
   * Send time-lock unlocked notification (REAL-TIME)
   * Triggers when scheduled time is reached
   */
  static async sendTimeLockUnlocked(partnerName: string, preview: string): Promise<void> {
    try {
      // Check if time-lock notifications are enabled
      const settings = await this.getReminderSettings();
      if (!settings.timeLockUnlock.enabled) {
        console.log('Time-lock notifications disabled');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔓 Time-Lock Unlocked!',
          body: `Your message to ${partnerName} has been delivered!`,
          data: { type: 'timelock_unlocked' },
        },
        trigger: null, // Send immediately
      });

      console.log('✅ Time-lock unlocked notification sent (real-time)');
    } catch (error) {
      console.error('Error sending time-lock notification:', error);
    }
  }

  /**
   * Cancel specific reminder
   */
  static async cancelReminder(type: string): Promise<void> {
    try {
      const id = this.notificationIds.get(type);
      if (id) {
        await Notifications.cancelScheduledNotificationAsync(id);
        this.notificationIds.delete(type);
        console.log('✅ Reminder cancelled:', type);
      }
    } catch (error) {
      console.error('Error cancelling reminder:', error);
    }
  }

  /**
   * Cancel all reminders
   */
  static async cancelAllReminders(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.notificationIds.clear();
      console.log('✅ All reminders cancelled');
    } catch (error) {
      console.error('Error cancelling all reminders:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Setup notification listeners
   */
  static setupListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTapped: (response: Notifications.NotificationResponse) => void
  ): void {
    // Notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(onNotificationReceived);

    // Notification tapped
    Notifications.addNotificationResponseReceivedListener(onNotificationTapped);

    console.log('✅ Notification listeners setup');
  }

  /**
   * Get scheduled reminders summary (for debugging)
   */
  static async getScheduledRemindersSummary(): Promise<string> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      if (scheduled.length === 0) {
        return 'No scheduled notifications';
      }

      let summary = `📅 Scheduled Notifications (${scheduled.length}):\n`;
      
      for (const notif of scheduled) {
        const trigger = notif.trigger as any;
        const type = notif.content.data?.type || 'unknown';
        
        if (trigger.type === 'daily') {
          const hour = trigger.hour.toString().padStart(2, '0');
          const minute = trigger.minute.toString().padStart(2, '0');
          summary += `  • ${type}: Daily at ${hour}:${minute}\n`;
        } else if (trigger.type === 'date') {
          const date = new Date(trigger.value);
          summary += `  • ${type}: ${date.toLocaleString()}\n`;
        }
      }
      
      return summary;
    } catch (error) {
      return 'Error getting scheduled notifications';
    }
  }

  /**
   * Verify all reminders are scheduled correctly
   */
  static async verifyScheduledReminders(): Promise<{
    goodMorning: boolean;
    goodNight: boolean;
    dailyMoment: boolean;
    total: number;
  }> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      const hasGoodMorning = scheduled.some(n => n.content.data?.type === 'good_morning');
      const hasGoodNight = scheduled.some(n => n.content.data?.type === 'good_night');
      const hasDailyMoment = scheduled.some(n => n.content.data?.type === 'daily_moment');
      
      return {
        goodMorning: hasGoodMorning,
        goodNight: hasGoodNight,
        dailyMoment: hasDailyMoment,
        total: scheduled.length,
      };
    } catch (error) {
      console.error('Error verifying reminders:', error);
      return {
        goodMorning: false,
        goodNight: false,
        dailyMoment: false,
        total: 0,
      };
    }
  }

  /**
   * Test notification (for debugging)
   */
  static async sendTestNotification(type: 'good_morning' | 'good_night' | 'daily_moment'): Promise<void> {
    try {
      let title = '';
      let body = '';
      
      switch (type) {
        case 'good_morning':
          title = '☀️ Good Morning!';
          body = 'This is a test good morning notification';
          break;
        case 'good_night':
          title = '🌙 Good Night!';
          body = 'This is a test good night notification';
          break;
        case 'daily_moment':
          title = '💕 Time to Share';
          body = 'This is a test daily moment notification';
          break;
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: `test_${type}` },
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
      
      console.log(`✅ Test notification sent: ${type}`);
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}

export default NotificationService;
