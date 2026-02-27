import { Alert } from 'react-native';
import PremiumCheckService from '../services/PremiumCheckService';

/**
 * Check if user has premium access for a feature
 * Shows alert if premium is required
 */
export const requiresPremium = async (
  featureName: string,
  navigation?: any
): Promise<boolean> => {
  try {
    const status = await PremiumCheckService.checkPremiumStatus();

    if (status.isPremium) {
      // User has premium
      return true;
    }

    // User doesn't have premium - show alert
    const needed = 3;

    Alert.alert(
      '⭐ Premium Feature',
      `${featureName} requires premium access.\n\n🎁 Refer ${needed} friends to unlock 3 months of premium!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Invite Friends',
          onPress: () => {
            if (navigation) {
              navigation.navigate('Referral');
            }
          },
        },
      ]
    );

    return false;
  } catch (error) {
    console.error('❌ Error checking premium:', error);
    return false;
  }
};

/**
 * Show premium expiry warning if needed
 */
export const showPremiumExpiryWarning = async (navigation?: any): Promise<void> => {
  try {
    const alert = await PremiumCheckService.getPremiumStatusAlert();

    if (alert.show && alert.type === 'expiring') {
      Alert.alert(
        alert.title || 'Premium Expiring',
        alert.message || 'Your premium is expiring soon',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Extend Premium',
            onPress: () => {
              if (navigation) {
                navigation.navigate('Referral');
              }
            },
          },
        ]
      );
    }
  } catch (error) {
    console.error('❌ Error showing premium warning:', error);
  }
};

/**
 * Show premium expired alert
 */
export const showPremiumExpiredAlert = async (navigation?: any): Promise<void> => {
  try {
    const alert = await PremiumCheckService.getPremiumStatusAlert();

    if (alert.show && alert.type === 'expired') {
      Alert.alert(
        alert.title || 'Premium Expired',
        alert.message || 'Your premium has expired',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Get Premium',
            onPress: () => {
              if (navigation) {
                navigation.navigate('Referral');
              }
            },
          },
        ]
      );
    }
  } catch (error) {
    console.error('❌ Error showing expired alert:', error);
  }
};

/**
 * Get premium badge text
 */
export const getPremiumBadgeText = async (): Promise<string> => {
  try {
    const status = await PremiumCheckService.getLocalPremiumStatus();

    if (status.isPremium) {
      if (status.daysRemaining > 30) {
        return '⭐ Premium';
      } else if (status.daysRemaining > 7) {
        return `⭐ ${status.daysRemaining} days`;
      } else {
        return `⏰ ${status.daysRemaining} days`;
      }
    }

    return '';
  } catch (error) {
    return '';
  }
};

/**
 * Check if feature is premium-only
 */
export const isPremiumFeature = (featureName: string): boolean => {
  const premiumFeatures = [
    'Shared Notes',
    'Time-Lock Messages',
    'Secret Vault',
    'Dual Camera',
    'Unlimited Moments',
    'Custom Themes',
  ];

  return premiumFeatures.includes(featureName);
};
