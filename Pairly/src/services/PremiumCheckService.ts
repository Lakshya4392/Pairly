import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import Logger from '../utils/Logger';

interface PremiumStatus {
  isPremium: boolean;
  daysRemaining: number;

  premiumExpiresAt?: string;
}

class PremiumCheckService {
  // ⚡ CACHE: Check once, cache for entire session
  private _cachedStatus: PremiumStatus | null = null;
  private _lastCheckTime: number = 0;
  private CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private _isInitialized = false;

  /**
   * ⚡ Initialize once at app startup - call this from AppNavigator
   */
  async initialize(): Promise<PremiumStatus> {
    if (this._isInitialized && this._cachedStatus) {
      Logger.debug('⚡ [Premium] Using cached status');
      return this._cachedStatus;
    }

    const status = await this.checkPremiumStatus();
    this._isInitialized = true;
    return status;
  }

  /**
   * Get default (free) status
   */
  private getDefaultStatus(): PremiumStatus {
    return { isPremium: false, daysRemaining: 0 };
  }

  /**
   * ⚡ Check expiry locally without network call
   * After 30 days, waitlist premium expires → user becomes free
   */
  private async checkExpiryLocally(cached: PremiumStatus): Promise<PremiumStatus> {
    if (!cached.isPremium) {
      return cached;
    }

    // Check if premium expired by expiry date
    if (cached.premiumExpiresAt) {
      const expiryDate = new Date(cached.premiumExpiresAt);
      const now = new Date();

      if (now > expiryDate) {
        // Premium expired - update local storage
        Logger.debug('⏰ [Premium] Expired locally detected');
        await AsyncStorage.setItem('isPremium', 'false');
        await AsyncStorage.setItem('premiumDaysRemaining', '0');

        return {
          ...cached,
          isPremium: false,
          daysRemaining: 0,
        };
      }

      // Recalculate days remaining
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...cached,
        daysRemaining: Math.max(0, daysRemaining),
      };
    }

    return cached;
  }

  /**
   * ⚡ Start 30-day trial locally
   */
  async start30DayTrial(startDate: Date): Promise<void> {
    try {
      const expiresAt = new Date(startDate);
      expiresAt.setDate(expiresAt.getDate() + 30);

      const status: PremiumStatus = {
        isPremium: true,
        daysRemaining: 30,

        premiumExpiresAt: expiresAt.toISOString()
      };

      Logger.info('🎁 [Premium] Starting 30-day trial locally until:', expiresAt.toISOString());

      await AsyncStorage.setItem('isPremium', 'true');
      await AsyncStorage.setItem('premiumDaysRemaining', '30');
      await AsyncStorage.setItem('premiumExpiresAt', expiresAt.toISOString());

      this._cachedStatus = status;
      this._lastCheckTime = Date.now();

      // Trial started locally. RevenueCat will pick up actual purchases.
      Logger.info('✅ Local trial started');
    } catch (error) {
      Logger.error('Error starting trial:', error);
    }
  }

  /**
   * Check premium status - uses cache if available
   */
  /**
   * Check premium status - REVENUECAT AUTHORITATIVE
   */
  async checkPremiumStatus(): Promise<PremiumStatus> {
    try {
      Logger.debug('🔍 [Premium] Checking status via RevenueCat...');

      // ⚡ REVENUECAT IS THE ONLY AUTHORITY
      const RevenueCatService = (await import('./RevenueCatService')).default;
      const isRcPremium = await RevenueCatService.getCustomerStatus();

      if (isRcPremium) {
        Logger.info('✅ [Premium] RevenueCat says PREMIUM');
        await AsyncStorage.setItem('isPremium', 'true');

        this._cachedStatus = { isPremium: true, daysRemaining: 30 };
        this._lastCheckTime = Date.now();
        return this._cachedStatus;
      }

      // If RevenueCat says FREE, we force FREE.
      // We explicitly ignore any "local" or "backend" flags that might be stuck.
      Logger.info('📉 [Premium] RevenueCat says FREE. Enforcing FREE status.');
      await AsyncStorage.setItem('isPremium', 'false');
      await AsyncStorage.setItem('premiumDaysRemaining', '0');

      this._cachedStatus = { isPremium: false, daysRemaining: 0 };
      this._lastCheckTime = Date.now();
      return this._cachedStatus;

    } catch (error) {
      Logger.warn('⚠️ [Premium] Check failed, defaulting to FREE for safety', error);
      return this.getDefaultStatus();
    }
  }

  /**
   * Get local premium status (fast, no network call)
   */
  async getLocalPremiumStatus(): Promise<PremiumStatus> {
    try {
      const isPremiumStr = await AsyncStorage.getItem('isPremium');
      const daysRemaining = await AsyncStorage.getItem('premiumDaysRemaining');

      const premiumExpiresAt = await AsyncStorage.getItem('premiumExpiresAt');

      const status: PremiumStatus = {
        isPremium: isPremiumStr === 'true',
        daysRemaining: parseInt(daysRemaining || '0'),

        premiumExpiresAt: premiumExpiresAt || undefined,
      };

      // Check expiry locally
      return this.checkExpiryLocally(status);
    } catch (error) {
      Logger.error('❌ Error getting local premium status:', error);
      return this.getDefaultStatus();
    }
  }

  /**
   * Get premium status alert if needed (only show once per session)
   */
  async getPremiumStatusAlert(): Promise<{
    show: boolean;
    title?: string;
    message?: string;
    type?: 'expired' | 'expiring' | 'active';
  }> {
    try {
      const status = await this.checkPremiumStatus();

      // Premium expired
      if (!status.isPremium) {
        return {
          show: true,
          type: 'expired',
          title: '⏰ Premium Expired',
          message: `Your 30-day premium has expired.\n\nSubscribe to continue enjoying premium features!`,
        };
      }

      // Premium expiring soon (less than 7 days)
      if (status.isPremium && status.daysRemaining < 7 && status.daysRemaining > 0) {
        return {
          show: true,
          type: 'expiring',
          title: '⏰ Premium Expiring Soon',
          message: `You have ${status.daysRemaining} day${status.daysRemaining > 1 ? 's' : ''} of premium left.`,
        };
      }

      // Premium active
      if (status.isPremium && status.daysRemaining >= 7) {
        return {
          show: false,
          type: 'active',
        };
      }

      return { show: false };
    } catch (error) {
      Logger.error('❌ Error getting premium alert:', error);
      return { show: false };
    }
  }



  /**
   * Check if user has premium (fast check with local expiry detection)
   */
  async hasPremium(): Promise<boolean> {
    try {
      const status = await this.getLocalPremiumStatus();
      return status.isPremium;
    } catch (error) {
      return false;
    }
  }

  /**
   * Force refresh (ignore cache) - use sparingly
   */
  async forceRefresh(): Promise<PremiumStatus> {
    this._cachedStatus = null;
    this._lastCheckTime = 0;
    return this.checkPremiumStatus();
  }
}

export default new PremiumCheckService();
