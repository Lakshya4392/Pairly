import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/apiClient';

interface PremiumStatus {
  isPremium: boolean;
  plan: 'free' | 'monthly' | 'yearly';
  expiresAt: string | null;
  trialEndsAt: string | null;
  dailyMomentsCount: number;
  dailyMomentsLimit: number;
}

class PremiumService {
  private DAILY_LIMIT_FREE = 3;
  private DAILY_LIMIT_PREMIUM = 999999; // Unlimited

  /**
   * Check if user has premium access
   * 🔥 SOURCE OF TRUTH: RevenueCat
   */
  async isPremium(): Promise<boolean> {
    try {
      const RevenueCatService = (await import('./RevenueCatService')).default;
      const isPremium = await RevenueCatService.getCustomerStatus();

      // Sync to local storage for offline fallback? 
      // RevenueCat SDK handles caching, so we rely on it.
      return isPremium;
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false; // Default to free on error
    }
  }

  /**
   * Get full premium status
   */
  async getPremiumStatus(): Promise<PremiumStatus> {
    const isPremium = await this.isPremium();

    // For now, we simplify the status since RevenueCat handles the complexity
    return {
      isPremium,
      plan: isPremium ? 'yearly' : 'free', // We might want to fetch actual plan from RC if needed
      expiresAt: null, // RevenueCat handles expiry
      trialEndsAt: null,
      dailyMomentsCount: 0, // We calculate this separately
      dailyMomentsLimit: isPremium ? this.DAILY_LIMIT_PREMIUM : this.DAILY_LIMIT_FREE,
    };
  }

  /**
   * Check if user can send a moment today
   */
  async canSendMoment(): Promise<{
    canSend: boolean;
    remaining: number;
    limit: number;
    upgradeRequired: boolean;
  }> {
    try {
      const isPremiumUser = await this.isPremium();

      // Premium users have unlimited
      if (isPremiumUser) {
        return {
          canSend: true,
          remaining: 999999,
          limit: 999999,
          upgradeRequired: false,
        };
      }

      // Check if we need to reset daily counter
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const today = new Date().toDateString();
      const lastDate = await AsyncStorage.getItem('@pairly_last_moment_date');

      let dailyMomentsCount = 0;
      if (lastDate !== today) {
        // New day, reset counter
        await AsyncStorage.setItem('@pairly_last_moment_date', today);
        await AsyncStorage.setItem('@pairly_daily_count', '0');
        dailyMomentsCount = 0;
      } else {
        // Load current count
        const countStr = await AsyncStorage.getItem('@pairly_daily_count');
        dailyMomentsCount = countStr ? parseInt(countStr, 10) : 0;
      }

      const canSend = dailyMomentsCount < this.DAILY_LIMIT_FREE;
      const remaining = Math.max(0, this.DAILY_LIMIT_FREE - dailyMomentsCount);

      return {
        canSend,
        remaining,
        limit: this.DAILY_LIMIT_FREE,
        upgradeRequired: !canSend,
      };
    } catch (error) {
      console.error('Error checking moment limit:', error);
      return {
        canSend: true,
        remaining: 3,
        limit: 3,
        upgradeRequired: false,
      };
    }
  }

  /**
   * Increment daily moment count
   */
  async incrementMomentCount(): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const countStr = await AsyncStorage.getItem('@pairly_daily_count');
      const count = countStr ? parseInt(countStr, 10) : 0;
      await AsyncStorage.setItem('@pairly_daily_count', (count + 1).toString());
      console.log('📊 Daily moment count:', count + 1);
    } catch (error) {
      console.error('Error incrementing moment count:', error);
    }
  }

  /**
   * Sync premium status with backend (Legacy/Fallback)
   * With RevenueCat, the app is the source of truth, but we might want to tell backend about it.
   */
  async syncWithBackend(): Promise<void> {
    // Optional: Send RevenueCat ID to backend if needed
  }

  /**
   * Check if feature is available
   */
  async hasFeature(feature: PremiumFeature): Promise<boolean> {
    const isPremium = await this.isPremium();
    return isPremium;
  }

  /**
   * Get feature lock message
   */
  getFeatureLockMessage(feature: PremiumFeature): string {
    const messages: Record<PremiumFeature, string> = {
      'dual-camera': 'Capture the same moment from two worlds 💞',
      'shared-notes': 'Send love notes that appear like magic 📝',
      'secret-vault': 'Keep your intimate moments safe 🔐',
      'time-lock': 'Send messages to your future selves 🎬',
      'live-presence': 'Feel close, even miles apart 🕊️',
      'ai-story': 'Your love story, beautifully told 📽️',
      'dark-mode': 'Beautiful dark theme for night time 🌙',
      'app-lock': 'Protect your privacy with PIN/Biometric 🔒',
      'smart-reminders': 'Never miss a moment to connect ⏰',
    };

    return messages[feature] || 'This is a premium feature';
  }

  /**
   * Clear premium status (on logout)
   */
  async clearPremiumStatus(): Promise<void> {
    // RevenueCat handles logout separately via RevenueCatService.logout()
  }
}

export type PremiumFeature =
  | 'dual-camera'
  | 'shared-notes'
  | 'secret-vault'
  | 'time-lock'
  | 'live-presence'
  | 'ai-story'
  | 'dark-mode'
  | 'app-lock'
  | 'smart-reminders';

export default new PremiumService();
