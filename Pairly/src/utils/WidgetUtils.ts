/**
 * 🔥 Widget Utility Functions
 * Handle widget refresh and updates
 */

import { NativeModules, Platform } from 'react-native';

class WidgetUtils {
  /**
   * Refresh widget manually (force update)
   */
  static async refreshWidget(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.log('⚠️ Widget refresh only available on Android');
        return false;
      }

      // Send broadcast intent to refresh widget
      const { SharedPrefsModule } = NativeModules;
      
      if (SharedPrefsModule) {
        // Clear last update time to force refresh
        await SharedPrefsModule.remove('last_widget_update');
        console.log('✅ Widget refresh triggered');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Widget refresh failed:', error);
      return false;
    }
  }

  /**
   * Store auth data for widget access
   */
  static async storeAuthForWidget(authToken: string, userId: string): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }

      const { SharedPrefsModule } = NativeModules;
      
      if (SharedPrefsModule) {
        await SharedPrefsModule.setString('auth_token', authToken);
        await SharedPrefsModule.setString('user_id', userId);
        console.log('✅ Auth data stored for widget');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Widget auth storage failed:', error);
      return false;
    }
  }

  /**
   * Notify widget that new moment is available
   */
  static async notifyNewMoment(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }

      // Clear cache and trigger refresh
      const refreshed = await this.refreshWidget();
      
      if (refreshed) {
        console.log('📱 Widget notified of new moment');
      }
      
      return refreshed;
    } catch (error) {
      console.error('❌ Widget moment notification failed:', error);
      return false;
    }
  }
}

export default WidgetUtils;