import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SharedPrefsModule } = NativeModules;

/**
 * Widget Auth Service
 * Syncs auth tokens from AsyncStorage to SharedPreferences for widget access
 */
class WidgetAuthService {
  
  /**
   * Sync auth token to SharedPreferences for widget access
   */
  static async syncAuthToken(): Promise<void> {
    try {
      const authToken = await AsyncStorage.getItem('auth_token');
      const userId = await AsyncStorage.getItem('user_id');
      
      if (authToken && SharedPrefsModule) {
        await SharedPrefsModule.setString('auth_token', authToken);
        console.log('✅ Auth token synced to SharedPreferences for widget');
        
        if (userId) {
          await SharedPrefsModule.setString('user_id', userId);
          console.log('✅ User ID synced to SharedPreferences for widget');
        }
      } else {
        console.warn('⚠️ No auth token found or SharedPrefsModule not available');
      }
    } catch (error) {
      console.error('❌ Failed to sync auth token to SharedPreferences:', error);
    }
  }

  /**
   * Clear auth data from SharedPreferences
   */
  static async clearAuthData(): Promise<void> {
    try {
      if (SharedPrefsModule) {
        await SharedPrefsModule.remove('auth_token');
        await SharedPrefsModule.remove('user_id');
        console.log('✅ Auth data cleared from SharedPreferences');
      }
    } catch (error) {
      console.error('❌ Failed to clear auth data from SharedPreferences:', error);
    }
  }

  /**
   * Get auth token from SharedPreferences (for testing)
   */
  static async getAuthToken(): Promise<string | null> {
    try {
      if (SharedPrefsModule) {
        return await SharedPrefsModule.getString('auth_token');
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get auth token from SharedPreferences:', error);
      return null;
    }
  }
}

export default WidgetAuthService;