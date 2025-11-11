import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

const API_URL = API_CONFIG.baseUrl;

interface UserData {
  clerkId: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  phoneNumber?: string;
}

class UserSyncService {
  /**
   * Sync user with backend after Clerk authentication
   */
  static async syncUserWithBackend(userData: UserData): Promise<boolean> {
    try {
      console.log('🌐 Syncing to:', `${API_URL}/auth/sync`);
      console.log('📦 User data:', userData);
      
      const apiClient = (await import('../utils/apiClient')).default;
      const data = await apiClient.post<{ success: boolean; user: any }>(
        '/auth/sync',
        userData
      );

      console.log('✅ User synced with backend:', data.user.id);
      console.log('👤 User details:', data.user);
      
      // Store user ID locally
      await AsyncStorage.setItem('@pairly_user_id', data.user.id);
      
      return true;
    } catch (error: any) {
      console.error('❌ Error syncing user:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ API URL:', API_URL);
      return false;
    }
  }

  /**
   * Get user from backend
   */
  static async getUserFromBackend(clerkId: string) {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': clerkId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get user');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('❌ Error getting user:', error);
      return null;
    }
  }

  /**
   * Update premium status in backend
   */
  static async updatePremiumStatus(
    clerkId: string,
    isPremium: boolean,
    plan?: 'monthly' | 'yearly'
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/auth/premium`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': clerkId,
        },
        body: JSON.stringify({ isPremium, plan }),
      });

      if (!response.ok) {
        throw new Error('Failed to update premium status');
      }

      console.log('✅ Premium status updated in backend');
      return true;
    } catch (error) {
      console.error('❌ Error updating premium status:', error);
      return false;
    }
  }

  /**
   * Update settings in backend
   */
  static async updateSettings(
    clerkId: string,
    settings: {
      notificationsEnabled?: boolean;
      soundEnabled?: boolean;
      vibrationEnabled?: boolean;
    }
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/auth/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': clerkId,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      console.log('✅ Settings updated in backend');
      return true;
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      return false;
    }
  }

  /**
   * Check if user is premium from backend
   */
  static async checkPremiumStatus(clerkId: string): Promise<boolean> {
    try {
      const user = await this.getUserFromBackend(clerkId);
      
      if (!user) return false;

      // Check if premium is still valid
      if (user.isPremium && user.premiumExpiry) {
        const expiry = new Date(user.premiumExpiry);
        const now = new Date();
        
        if (now > expiry) {
          // Premium expired
          await this.updatePremiumStatus(clerkId, false);
          return false;
        }
        
        return true;
      }

      return user.isPremium || false;
    } catch (error) {
      console.error('❌ Error checking premium status:', error);
      return false;
    }
  }
}

export default UserSyncService;
