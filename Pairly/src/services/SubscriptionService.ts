import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionPlan {
  id: 'free' | 'monthly' | 'yearly';
  name: string;
  price: number;
  interval: 'month' | 'year' | null;
  features: string[];
}

export interface SubscriptionStatus {
  plan: 'free' | 'monthly' | 'yearly';
  isPremium: boolean;
  expiresAt: string | null;
  autoRenew: boolean;
}

const PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: null,
    features: [
      'Share photos with partner',
      'Basic notifications',
      'Standard quality uploads',
      '100 photos storage',
    ],
  },
  monthly: {
    id: 'monthly',
    name: 'Premium Monthly',
    price: 4.99,
    interval: 'month',
    features: [
      'Unlimited photo storage',
      'High quality uploads',
      'Dark mode',
      'Private mode',
      'Priority support',
      'No ads',
      'Custom themes',
      'Advanced filters',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'Premium Yearly',
    price: 39.99,
    interval: 'year',
    features: [
      'All monthly features',
      'Save 33% ($20/year)',
      'Exclusive themes',
      'Early access to features',
      'Premium badge',
    ],
  },
};

class SubscriptionService {
  private static STORAGE_KEY = '@pairly_subscription';

  // Get current subscription status
  static async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error getting subscription status:', error);
    }

    // Default free plan
    return {
      plan: 'free',
      isPremium: false,
      expiresAt: null,
      autoRenew: false,
    };
  }

  // Check if user has premium
  static async isPremium(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    
    // Check if subscription is still valid
    if (status.isPremium && status.expiresAt) {
      const expiryDate = new Date(status.expiresAt);
      const now = new Date();
      
      if (now > expiryDate) {
        // Subscription expired
        await this.cancelSubscription();
        return false;
      }
    }
    
    return status.isPremium;
  }

  // Subscribe to a plan
  static async subscribe(planId: 'monthly' | 'yearly'): Promise<boolean> {
    try {
      const plan = PLANS[planId];
      if (!plan) {
        throw new Error('Invalid plan');
      }

      // Calculate expiry date
      const now = new Date();
      const expiresAt = new Date(now);
      if (planId === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      const status: SubscriptionStatus = {
        plan: planId,
        isPremium: true,
        expiresAt: expiresAt.toISOString(),
        autoRenew: true,
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(status));
      
      console.log('✅ Subscribed to:', planId);
      return true;
    } catch (error) {
      console.error('Error subscribing:', error);
      return false;
    }
  }

  // Cancel subscription
  static async cancelSubscription(): Promise<void> {
    try {
      const status: SubscriptionStatus = {
        plan: 'free',
        isPremium: false,
        expiresAt: null,
        autoRenew: false,
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(status));
      console.log('✅ Subscription cancelled');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  }

  // Get plan details
  static getPlan(planId: string): SubscriptionPlan | null {
    return PLANS[planId] || null;
  }

  // Get all plans
  static getAllPlans(): SubscriptionPlan[] {
    return Object.values(PLANS);
  }

  // Restore purchases (for app store)
  static async restorePurchases(): Promise<boolean> {
    try {
      // In real app, check with App Store/Play Store
      const status = await this.getSubscriptionStatus();
      return status.isPremium;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return false;
    }
  }
}

export default SubscriptionService;
