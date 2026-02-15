import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/apiClient';
import PremiumService from './PremiumService';

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
  async syncUserWithBackend(userData: UserData): Promise<{
    success: boolean;
    user?: any;
  }> {
    try {
      console.log('🌐 Syncing user with backend...');

      const data = await apiClient.post<{ success: boolean; user: any }>(
        '/auth/sync',
        userData
      );

      console.log('✅ User synced with backend:', data.user.id);

      // Store user ID locally
      await AsyncStorage.setItem('@pairly_user_id', data.user.id);
      await AsyncStorage.setItem('user_id', data.user.id); // For widget access

      // Sync premium status with local storage
      if (data.user.isPremium) {
        const expiryDate = data.user.premiumExpiry
          ? new Date(data.user.premiumExpiry)
          : undefined;

        // Premium status is now handled by RevenueCatService and verified on app start.
        // We do not need to manually set it here anymore.
        console.log('✅ Premium status checked in sync');
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      // Silent fail - backend offline is normal for free tier
      console.warn('Could not sync user with backend:', error.message);
      return { success: false };
    }
  }

  /**
   * Get user from backend
   */
  async getUserFromBackend() {
    try {
      const data = await apiClient.get<{ user: any }>('/auth/me');
      return data.user;
    } catch (error: any) {
      // Completely silent - backend offline is normal for free tier
      return null;
    }
  }

  /**
   * Update premium status in backend
   */
  async updatePremiumStatus(
    isPremium: boolean,
    plan?: 'monthly' | 'yearly'
  ): Promise<boolean> {
    try {
      await apiClient.put('/auth/premium', { isPremium, plan });
      console.log('✅ Premium status updated in backend');
      return true;
    } catch (error: any) {
      console.error('❌ Error updating premium status:', error);
      return false;
    }
  }

  /**
   * Update settings in backend
   */
  async updateSettings(
    settings: {
      notificationsEnabled?: boolean;
      soundEnabled?: boolean;
      vibrationEnabled?: boolean;
    }
  ): Promise<boolean> {
    try {
      await apiClient.put('/auth/settings', settings);
      console.log('✅ Settings updated in backend');
      return true;
    } catch (error: any) {
      console.error('❌ Error updating settings:', error);
      return false;
    }
  }

  /**
   * Check if user is premium from backend
   */
  async checkPremiumStatus(): Promise<boolean> {
    try {
      const user = await this.getUserFromBackend();

      if (!user) return false;

      // Check if premium is still valid
      if (user.isPremium && user.premiumExpiry) {
        const expiry = new Date(user.premiumExpiry);
        const now = new Date();

        if (now > expiry) {
          // Premium expired
          await this.updatePremiumStatus(false);
          return false;
        }

        return true;
      }

      return user.isPremium || false;
    } catch (error: any) {
      console.error('❌ Error checking premium status:', error);
      return false;
    }
  }
}

export default new UserSyncService();
