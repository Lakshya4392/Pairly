import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './NotificationService';

class ReminderService {
  static async scheduleReminders() {
    try {
      const morningReminder = await AsyncStorage.getItem('@pairly_morning_reminder') === 'true';
      const nightReminder = await AsyncStorage.getItem('@pairly_night_reminder') === 'true';

      if (morningReminder) {
        this.scheduleReminder('Good Morning!', 'Don\'t forget to share a moment with your partner today.', 9, 0);
      }

      if (nightReminder) {
        this.scheduleReminder('Good Night!', 'Share a sweet dream with your partner.', 22, 0);
      }
    } catch (error) {
      console.error('Error scheduling reminders:', error);
    }
  }

  private static async scheduleReminder(title: string, body: string, hour: number, minute: number) {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    if (now > scheduledTime) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const seconds = Math.round((scheduledTime.getTime() - now.getTime()) / 1000);

    if (seconds > 0) {
      await NotificationService.scheduleReminder(title, body, seconds);
      console.log(`Scheduled reminder "${title}" for ${scheduledTime}`);
    }
  }
}

export default ReminderService;
