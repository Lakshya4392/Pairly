import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

interface PremiumStatus {
  isPremium: boolean;
  daysRemaining: number;
  referralCount: number;
  premiumExpiresAt?: string;
}

class PremiumCheckService {
  /**
   * Check premium status from backend
   */
  async checkPremiumStatus(): Promise<PremiumStatus> {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      const clerkId = await AsyncStorage.getItem('clerkId');

      if (!email || !clerkId) {
        console.log('⚠️ No user email/clerkId found for premium check');
        return { isPremium: false, daysRemaining: 0, referralCount: 0 };
      }

      console.log('🔍 Checking premium status from backend...');
      
      const response = await fetch(
        `${API_CONFIG.baseUrl}/invites/premium-status?email=${encodeURIComponent(email)}&clerkId=${encodeURIComponent(clerkId)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Premium status:', data);

      // Update local storage
      await AsyncStorage.setItem('isPremium', data.isPremium ? 'true' : 'false');
      await AsyncStorage.setItem('premiumDaysRemaining', data.daysRemaining?.toString() || '0');
      await AsyncStorage.setItem('premiumExpiresAt', data.premiumExpiresAt || '');
      await AsyncStorage.setItem('referralCount', data.referralCount?.toString() || '0');

      return {
        isPremium: data.isPremium,
        daysRemaining: data.daysRemaining || 0,
        referralCount: data.referralCount || 0,
        premiumExpiresAt: data.premiumExpiresAt,
      };
    } catch (error) {
      console.error('❌ Premium check error:', error);
      
      // Fallback to local storage
      try {
        const isPremium = await AsyncStorage.getItem('isPremium');
        const daysRemaining = await AsyncStorage.getItem('premiumDaysRemaining');
        const referralCount = await AsyncStorage.getItem('referralCount');
        const premiumExpiresAt = await AsyncStorage.getItem('premiumExpiresAt');
        
        return {
          isPremium: isPremium === 'true',
          daysRemaining: parseInt(daysRemaining || '0'),
          referralCount: parseInt(referralCount || '0'),
          premiumExpiresAt: premiumExpiresAt || undefined,
        };
      } catch (fallbackError) {
        console.error('❌ Fallback error:', fallbackError);
        return { isPremium: false, daysRemaining: 0, referralCount: 0 };
      }
    }
  }

  /**
   * Get premium status alert if needed
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
   * Get local premium status (fast, no network call)
   */
  async getLocalPremiumStatus(): Promise<PremiumStatus> {
    try {
      const isPremium = await AsyncStorage.getItem('isPremium');
      const daysRemaining = await AsyncStorage.getItem('premiumDaysRemaining');
      const referralCount = await AsyncStorage.getItem('referralCount');
      const premiumExpiresAt = await AsyncStorage.getItem('premiumExpiresAt');
      
      return {
        isPremium: isPremium === 'true',
        daysRemaining: parseInt(daysRemaining || '0'),
        referralCount: parseInt(referralCount || '0'),
        premiumExpiresAt: premiumExpiresAt || undefined,
      };
    } catch (error) {
      console.error('❌ Error getting local premium status:', error);
      return { isPremium: false, daysRemaining: 0, referralCount: 0 };
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
   * Check if user has premium (fast check)
   */
  async hasPremium(): Promise<boolean> {
    try {
      const isPremium = await AsyncStorage.getItem('isPremium');
      return isPremium === 'true';
    } catch (error) {
      return false;
    }
  }
}

export default new PremiumCheckService();
