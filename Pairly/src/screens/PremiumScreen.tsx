import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomAlert } from '../components/CustomAlert';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius, layout } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import RevenueCatService from '../services/RevenueCatService';
import { PurchasesPackage } from 'react-native-purchases';

interface PremiumScreenProps {
  onBack: () => void;
  onPurchase?: (plan: 'monthly' | 'yearly') => void;
}

export const PremiumScreen: React.FC<PremiumScreenProps> = ({ onBack, onPurchase }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Load RevenueCat Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // 1. Check Status
      const premiumActive = await RevenueCatService.getCustomerStatus();
      setIsPremium(premiumActive);

      // 2. Load Offerings
      const currentOffering = await RevenueCatService.getOfferings();
      if (currentOffering && currentOffering.availablePackages.length > 0) {
        setOfferings(currentOffering.availablePackages);

        // Default to Yearly if available (usually better value)
        const yearly = currentOffering.availablePackages.find(p => p.packageType === 'ANNUAL');
        const monthly = currentOffering.availablePackages.find(p => p.packageType === 'MONTHLY');

        // Select logic: Yearly -> Monthly -> First Available
        setSelectedPackage(yearly || monthly || currentOffering.availablePackages[0]);
      }
    } catch (error) {
      console.error('Error loading RevenueCat data:', error);
      // Don't alert on load error to avoid spamming user if offline, just show fallback UI
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      setIsPurchasing(true);
      const { isPremium: newStatus } = await RevenueCatService.purchasePackage(selectedPackage);

      if (newStatus) {
        setIsPremium(true);
        setShowSuccessAlert(true);

        // ⚡ SYNC: Update backend immediately
        try {
          const plan = selectedPackage.packageType === 'ANNUAL' ? 'yearly' : 'monthly';
          const UserSyncService = (await import('../services/UserSyncService')).default;
          await UserSyncService.updatePremiumStatus(true, plan);
          console.log('✅ Premium status synced to backend');
        } catch (err) {
          console.error('⚠️ Failed to sync premium to backend:', err);
        }

        onPurchase?.(selectedPackage.packageType === 'ANNUAL' ? 'yearly' : 'monthly');
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.message || 'Something went wrong');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsPurchasing(true);
      const restored = await RevenueCatService.restorePurchases();
      if (restored) {
        setIsPremium(true);
        Alert.alert('Restored', 'Your premium purchases have been restored!');
      } else {
        Alert.alert('No Subscription Found', 'We definitively could not find a premium subscription for your account.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases.');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Premium features with emotional copy
  const premiumFeatures = [
    {
      icon: 'infinite',
      title: 'Unlimited Moments',
      description: 'Share as many moments as your heart desires',
      color: colors.secondary,
    },
    {
      icon: 'chatbubble-ellipses',
      title: 'Shared Love Notes',
      description: 'Send notes that appear like magic on their screen',
      color: '#FF6B9D',
    },
    {
      icon: 'time',
      title: 'Time-Lock Messages',
      description: 'Send love to your future selves',
      color: '#9B59B6',
    },
    {
      icon: 'people',
      title: 'Live Presence',
      description: 'Feel close, even when miles apart',
      color: '#3498DB',
    },
    {
      icon: 'lock-closed',
      title: 'Secret Vault',
      description: 'Some memories are just for you two',
      color: '#1ABC9C',
    },
  ];

  const PlanCard = ({ pack }: { pack: PurchasesPackage }) => {
    const isSelected = selectedPackage?.identifier === pack.identifier;
    const isYearly = pack.packageType === 'ANNUAL';

    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
        ]}
        onPress={() => setSelectedPackage(pack)}
        activeOpacity={0.7}
      >
        {isYearly && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>BEST VALUE</Text>
          </View>
        )}

        <View style={styles.planContent}>
          <View style={styles.planLeft}>
            <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
              {isSelected && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.planInfo}>
              <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                {isYearly ? 'Yearly' : 'Monthly'}
              </Text>
              {isYearly && (
                <Text style={styles.planSavings}>Maximum Savings</Text>
              )}
            </View>
          </View>

          <View style={styles.planRight}>
            <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
              {pack.product.priceString}
            </Text>
            <Text style={styles.planPeriod}>
              /{isYearly ? 'yr' : 'mo'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FeatureItem = ({ icon, title, description, color }: any) => (
    <View style={styles.featureCard}>
      <View style={[styles.featureIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.secondary} />

      {/* Header */}
      <LinearGradient
        colors={[colors.secondary, colors.secondaryLight]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Ionicons name="diamond" size={32} color="white" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Pairly Premium</Text>
        </View>

        {!isPremium && (
          <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
            <Text style={styles.restoreText}>Restore</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Loading premium options...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Premium Status Banner */}
          {isPremium && (
            <View style={styles.premiumBanner}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.premiumBannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <View style={styles.premiumBannerText}>
                  <Text style={styles.premiumBannerTitle}>Premium Active</Text>
                  <Text style={styles.premiumBannerSubtitle}>
                    You have access to all premium features!
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Features Grid */}
          <View style={styles.featuresContainer}>
            <View style={styles.featuresGrid}>
              {premiumFeatures.map((feature, index) => (
                <FeatureItem key={index} {...feature} />
              ))}
            </View>
          </View>

          {/* Pricing Plans - Only for free users */}
          {!isPremium && offerings.length > 0 && (
            <View style={styles.pricingContainer}>
              {offerings.map(pack => (
                <PlanCard key={pack.identifier} pack={pack} />
              ))}

              <Text style={styles.trialText}>
                Secure payment via Google Play
              </Text>
            </View>
          )}

          {!isPremium && offerings.length === 0 && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>No subscriptions available.</Text>
              <Text style={styles.errorSubText}>Check your internet or try again later.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Purchase Button - Only for free users */}
      {!isPremium && !isLoading && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.purchaseButton, isPurchasing && styles.disabledButton]}
            onPress={handlePurchase}
            activeOpacity={0.8}
            disabled={isPurchasing || offerings.length === 0}
          >
            <LinearGradient
              colors={isPurchasing ? [colors.border, colors.border] : [colors.secondary, colors.secondaryLight]}
              style={styles.purchaseButtonGradient}
            >
              {isPurchasing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="diamond" size={24} color="white" />
                  <Text style={styles.purchaseButtonText}>
                    {selectedPackage?.packageType === 'ANNUAL' ? 'Start Yearly Plan' : 'Start Monthly Plan'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            {selectedPackage
              ? `Recurring billing. Cancel anytime.`
              : 'Select a plan to continue'}
          </Text>
        </View>
      )}

      {/* Success Alert */}
      <CustomAlert
        visible={showSuccessAlert}
        title="Welcome to Premium! 🎉"
        message="You now have unlimited access to all features. Thank you for supporting Pairly!"
        icon="checkmark-circle"
        iconColor={colors.success}
        buttons={[
          {
            text: 'Awesome!',
            style: 'default',
            onPress: () => {
              setShowSuccessAlert(false);
              onBack();
            },
          },
        ]}
        onClose={() => {
          setShowSuccessAlert(false);
          onBack();
        }}
      />
    </View>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontFamily: 'Inter-Bold',
  },
  errorSubText: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Compact Header
  header: {
    paddingTop: spacing.huge,
    paddingBottom: spacing.lg,
    paddingHorizontal: layout.screenPaddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: borderRadius.md,
  },
  restoreText: {
    color: 'white',
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIcon: {
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: 'white',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },

  // Premium Status Banner
  premiumBanner: {
    marginHorizontal: layout.screenPaddingHorizontal,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  premiumBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  premiumBannerText: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: 'white',
    marginBottom: 2,
  },
  premiumBannerSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Trial Text
  trialText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },

  // Features Grid
  featuresContainer: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xl,
  },
  featuresGrid: {
    gap: spacing.md,
  },
  featureCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    ...shadows.sm,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  featureTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Pricing
  pricingContainer: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xxl,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  planCardSelected: {
    borderColor: colors.secondary,
    borderWidth: 2,
    ...shadows.md,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.lg,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  popularText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: 'white',
    letterSpacing: 0.5,
  },
  planContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  radioButtonSelected: {
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  radioButtonInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.secondary,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  planNameSelected: {
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  planSavings: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: colors.success,
  },
  planPrice: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
  },
  planPriceSelected: {
    color: colors.secondary,
  },
  planPeriod: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },

  // Footer
  footer: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  purchaseButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.lg,
  },
  disabledButton: {
    opacity: 0.7,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  purchaseButtonText: {
    fontFamily: 'Inter-Bold', fontSize: 18,
    color: 'white',
  },
  footerNote: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
