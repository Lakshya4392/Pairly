import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

interface PremiumStatus {
  isPremium: boolean;
  daysRemaining: number;
  referralCount: number;
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
      console.log('⚡ [Premium] Using cached status');
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
    return { isPremium: false, daysRemaining: 0, referralCount: 0 };
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
        console.log('⏰ [Premium] Expired locally detected');
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
   * Check premium status - uses cache if available
   */
  async checkPremiumStatus(): Promise<PremiumStatus> {
    // ⚡ CHECK CACHE: Return cached if valid (less than 30 min old)
    const now = Date.now();
    if (this._cachedStatus && (now - this._lastCheckTime < this.CACHE_TTL)) {
      // ⚡ LOCAL EXPIRY CHECK: Don't call backend, just check locally
      return this.checkExpiryLocally(this._cachedStatus);
    }

    try {
      const email = await AsyncStorage.getItem('userEmail');
      const clerkId = await AsyncStorage.getItem('clerkId');

      if (!email || !clerkId) {
        console.log('⚠️ No user email/clerkId found');
        return this.getDefaultStatus();
      }

      console.log('🔍 [Premium] Checking from backend (once per session)...');

      const response = await fetch(
        `${API_CONFIG.baseUrl}/invites/premium-status?email=${encodeURIComponent(email)}&clerkId=${encodeURIComponent(clerkId)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [Premium] Status:', data.isPremium ? 'PREMIUM' : 'FREE', `(${data.daysRemaining} days left)`);

      // Save to local storage
      await AsyncStorage.setItem('isPremium', data.isPremium ? 'true' : 'false');
      await AsyncStorage.setItem('premiumDaysRemaining', data.daysRemaining?.toString() || '0');
      await AsyncStorage.setItem('premiumExpiresAt', data.premiumExpiresAt || '');
      await AsyncStorage.setItem('referralCount', data.referralCount?.toString() || '0');

      const status: PremiumStatus = {
        isPremium: data.isPremium,
        daysRemaining: data.daysRemaining || 0,
        referralCount: data.referralCount || 0,
        premiumExpiresAt: data.premiumExpiresAt,
      };

      // ⚡ UPDATE CACHE
      this._cachedStatus = status;
      this._lastCheckTime = now;

      // 🔥 SYNC: Update PremiumService to keep all sources in sync
      try {
        const PremiumService = (await import('./PremiumService')).default;
        if (status.isPremium) {
          const expiryDate = status.premiumExpiresAt ? new Date(status.premiumExpiresAt) : undefined;
          await PremiumService.setPremiumStatus(true, 'monthly', expiryDate);
        } else {
          await PremiumService.setPremiumStatus(false);
        }
        console.log('✅ [Premium] PremiumService synced');
      } catch (syncError) {
        console.warn('⚠️ Failed to sync PremiumService:', syncError);
      }

      return status;
    } catch (error) {
      console.log('⚠️ [Premium] Backend unavailable, using local cache');
      return this.getLocalPremiumStatus();
    }
  }

  /**
   * Get local premium status (fast, no network call)
   */
  async getLocalPremiumStatus(): Promise<PremiumStatus> {
    try {
      const isPremiumStr = await AsyncStorage.getItem('isPremium');
      const daysRemaining = await AsyncStorage.getItem('premiumDaysRemaining');
      const referralCount = await AsyncStorage.getItem('referralCount');
      const premiumExpiresAt = await AsyncStorage.getItem('premiumExpiresAt');

      const status: PremiumStatus = {
        isPremium: isPremiumStr === 'true',
        daysRemaining: parseInt(daysRemaining || '0'),
        referralCount: parseInt(referralCount || '0'),
        premiumExpiresAt: premiumExpiresAt || undefined,
      };

      // Check expiry locally
      return this.checkExpiryLocally(status);
    } catch (error) {
      console.error('❌ Error getting local premium status:', error);
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
      if (!status.isPremium && status.referralCount < 3) {
        const needed = 3 - status.referralCount;
        return {
          show: true,
          type: 'expired',
          title: '⏰ Premium Expired',
          message: `Your 30-day premium has expired.\n\n🎁 Refer ${needed} more friend${needed > 1 ? 's' : ''} to unlock 3 months of premium!`,
        };
      }

      // Premium expiring soon (less than 7 days)
      if (status.isPremium && status.daysRemaining < 7 && status.daysRemaining > 0) {
        return {
          show: true,
          type: 'expiring',
          title: '⏰ Premium Expiring Soon',
          message: `You have ${status.daysRemaining} day${status.daysRemaining > 1 ? 's' : ''} of premium left.\n\nRefer friends to extend your premium!`,
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
      console.error('❌ Error getting premium alert:', error);
      return { show: false };
    }
  }

  /**
   * Get referral code
   */
  async getReferralCode(): Promise<string> {
    try {
      const code = await AsyncStorage.getItem('referralCode');
      return code || '';
    } catch (error) {
      console.error('❌ Error getting referral code:', error);
      return '';
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
