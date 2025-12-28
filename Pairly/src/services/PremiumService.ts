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
  private STORAGE_KEY = '@pairly_premium_status';
  private DAILY_LIMIT_FREE = 3;
  private DAILY_LIMIT_PREMIUM = 999999; // Unlimited

  // ⚡ CACHE: Reduce AsyncStorage hits for render loops
  private _cachedStatus: PremiumStatus | null = null;
  private _lastCacheTime: number = 0;
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if user has premium access
   * 🔥 SINGLE SOURCE: Uses PremiumCheckService as the source of truth
   */
  async isPremium(): Promise<boolean> {
    try {
      // 🔥 SINGLE SOURCE: Use PremiumCheckService (handles waitlist, backend, expiry)
      const PremiumCheckService = (await import('./PremiumCheckService')).default;
      const status = await PremiumCheckService.getLocalPremiumStatus();
      return status.isPremium;
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }

  /**
   * Get full premium status
   */
  async getPremiumStatus(): Promise<PremiumStatus> {
    // ⚡ CHECK CACHE: Return in-memory cache if valid
    const now = Date.now();
    if (this._cachedStatus && (now - this._lastCacheTime < this.CACHE_TTL)) {
      return this._cachedStatus;
    }

    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const status = JSON.parse(data);
        // Update cache
        this._cachedStatus = status;
        this._lastCacheTime = now;
        return status;
      }
    } catch (error) {
      console.error('Error getting premium status:', error);
    }

    // Default free status
    const defaultStatus: PremiumStatus = {
      isPremium: false,
      plan: 'free',
      expiresAt: null,
      trialEndsAt: null,
      dailyMomentsCount: 0,
      dailyMomentsLimit: this.DAILY_LIMIT_FREE,
    };

    // Cache default too
    this._cachedStatus = defaultStatus;
    this._lastCacheTime = now;

    return defaultStatus;
  }

  /**
   * Set premium status (after purchase or sync)
   */
  async setPremiumStatus(
    isPremium: boolean,
    plan: 'monthly' | 'yearly' = 'monthly',
    expiresAt?: Date
  ): Promise<void> {
    try {
      const status: PremiumStatus = {
        isPremium,
        plan: isPremium ? plan : 'free',
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        trialEndsAt: null,
        dailyMomentsCount: 0,
        dailyMomentsLimit: isPremium ? this.DAILY_LIMIT_PREMIUM : this.DAILY_LIMIT_FREE,
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(status));

      // ⚡ UPDATE CACHE
      this._cachedStatus = status;
      this._lastCacheTime = Date.now();

      console.log('✅ Premium status updated:', status);
    } catch (error) {
      console.error('Error setting premium status:', error);
    }
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
      // ⚡ Use isPremium() method which includes waitlist premium check
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
      const countStr = await AsyncStorage.getItem('@pairly_daily_count');
      const count = countStr ? parseInt(countStr, 10) : 0;
      await AsyncStorage.setItem('@pairly_daily_count', (count + 1).toString());
      console.log('📊 Daily moment count:', count + 1);
    } catch (error) {
      console.error('Error incrementing moment count:', error);
    }
  }

  /**
   * Start free trial (7 days)
   */
  async startTrial(): Promise<void> {
    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 days trial

      const status: PremiumStatus = {
        isPremium: true,
        plan: 'monthly',
        expiresAt: trialEndDate.toISOString(),
        trialEndsAt: trialEndDate.toISOString(),
        dailyMomentsCount: 0,
        dailyMomentsLimit: this.DAILY_LIMIT_PREMIUM,
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(status));
      console.log('✅ Trial started - expires:', trialEndDate);
    } catch (error) {
      console.error('Error starting trial:', error);
    }
  }

  /**
   * Sync premium status with backend
   */
  async syncWithBackend(): Promise<void> {
    try {
      const data = await apiClient.get<{
        success: boolean;
        data: { isPremium: boolean; premiumPlan: 'monthly' | 'yearly'; premiumExpiry: string };
      }>('/users/me/premium');

      if (data.success && data.data) {
        if (data.data.isPremium) {
          await this.setPremiumStatus(
            true,
            data.data.premiumPlan,
            data.data.premiumExpiry ? new Date(data.data.premiumExpiry) : undefined
          );
        } else {
          await this.setPremiumStatus(false);
        }
        console.log('✅ Premium status synced with backend');
      }
    } catch (error) {
      console.warn('Could not sync premium status:', error);
      // Don't throw - fail silently and use local cache
    }
  }

  /**
   * Check if feature is available
   */
  async hasFeature(feature: PremiumFeature): Promise<boolean> {
    const isPremium = await this.isPremium();

    // All premium features require premium
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
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem('@pairly_daily_count');
      await AsyncStorage.removeItem('@pairly_last_moment_date');
      console.log('✅ Premium status cleared');
    } catch (error) {
      console.error('Error clearing premium status:', error);
    }
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
