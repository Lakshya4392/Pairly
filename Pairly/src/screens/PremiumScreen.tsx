import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform, ActivityIndicator, TouchableOpacity, ScrollView, Text, StatusBar } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CustomAlert } from '../components/CustomAlert';
import { useTheme } from '../contexts/ThemeContext';
import RevenueCatService from '../services/RevenueCatService';
import { PurchasesPackage } from 'react-native-purchases';
import { colors as defaultColors, spacing, borderRadius, shadows, layout } from '../theme';

interface PremiumScreenProps {
  onBack: () => void;
  onPurchase?: (plan: 'monthly' | 'yearly') => void;
}

export const PremiumScreen: React.FC<PremiumScreenProps> = ({ onBack, onPurchase }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { user } = useUser();

  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Load RevenueCat Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // 1. Check Status
      const rcInfo = await RevenueCatService.getFullCustomerInfo();
      setIsPremium(rcInfo.isPremium);
      setExpiryDate(rcInfo.expirationDate);

      // 2. Load Offerings
      const currentOffering = await RevenueCatService.getOfferings();
      if (currentOffering && currentOffering.availablePackages.length > 0) {
        setOfferings(currentOffering.availablePackages);

        // Default to Yearly if available (usually better value)
        const yearly = currentOffering.availablePackages.find(p => p.packageType === 'ANNUAL');
        const monthly = currentOffering.availablePackages.find(p => p.packageType === 'MONTHLY');

        // Select logic: Monthly -> Yearly -> First Available
        setSelectedPackage(monthly || yearly || currentOffering.availablePackages[0]);
      }
    } catch (error) {
      console.error('Error loading RevenueCat data:', error);
      const err = error as any;
      Alert.alert(
        'RevenueCat Error (' + (err.code || 'Unknown') + ')',
        err.message + '\n\n' + (err.userInfo?.readableErrorCode || '') + '\n' + (err.userInfo?.underlyingErrorMessage || '')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      setIsPurchasing(true);

      // 🔥 ENSURE SYNC: Backend must know about user before payment
      const UserSyncService = (await import('../services/UserSyncService')).default;
      const currentUser = await UserSyncService.getUserFromBackend();

      if (!currentUser) {
        console.log('🔄 User not found in DB, attempting to sync from Clerk before purchase...');
        if (!user) {
          Alert.alert('Auth Error', 'You must be logged in to purchase.');
          setIsPurchasing(false);
          return;
        }

        const syncResult = await UserSyncService.syncUserWithBackend({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          displayName: user.fullName || user.firstName || 'Pairly User',
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          photoUrl: user.imageUrl || undefined,
        });

        if (!syncResult.success) {
          Alert.alert('Sync Error', 'Could not sync your account with our servers. Please try again.');
          setIsPurchasing(false);
          return;
        }
        console.log('✅ User successfully synced before purchase');
      }

      const purchaseResult = await RevenueCatService.purchasePackage(selectedPackage);

      if (purchaseResult.isPremium) {
        // Fetch full info to get expiry date immediately
        const rcInfo = await RevenueCatService.getFullCustomerInfo();
        setIsPremium(true);
        setExpiryDate(rcInfo.expirationDate);
        setShowSuccessAlert(true);

        // ⚡ SYNC: Fire off background update to strictly align backend DB
        await RevenueCatService.syncSubscriptionWithBackend();

        // Check local features 
        const PremiumCheckService = (await import('../services/PremiumCheckService')).default;
        await PremiumCheckService.forceRefresh();

        console.log('✅ Premium status synced to backend and local cache refreshed');

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
        // Fetch full info to get expiry date
        const rcInfo = await RevenueCatService.getFullCustomerInfo();
        setIsPremium(true);
        setExpiryDate(rcInfo.expirationDate);

        // SYNC to backend strictly
        await RevenueCatService.syncSubscriptionWithBackend();

        const PremiumCheckService = (await import('../services/PremiumCheckService')).default;
        await PremiumCheckService.forceRefresh();

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
                {isYearly ? 'Yearly Plan' : 'Monthly Plan'}
              </Text>
              {isYearly && (
                <Text style={styles.planSavings}>Save up to 40%</Text>
              )}
            </View>
          </View>

          <View style={styles.planRight}>
            <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
              {pack.product.priceString}
            </Text>
            <Text style={styles.planPeriod}>/{isYearly ? 'yr' : 'mo'}</Text>
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
      <StatusBar barStyle="dark-content" />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Syncing your status...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Premium Access</Text>
            </View>
            {!isPremium && (
              <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
                <Text style={styles.restoreText}>Restore</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Premium Status Banner */}
          {isPremium && (
            <View style={styles.premiumBanner}>
              <LinearGradient
                colors={[colors.secondary, colors.secondaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumBannerGradient}
              >
                <Ionicons name="checkmark-circle" size={28} color="white" />
                <View style={styles.premiumBannerText}>
                  <Text style={styles.premiumBannerTitle}>Premium Active</Text>
                  <Text style={styles.premiumBannerSubtitle}>
                    {expiryDate ? `Unlimited access until ${new Date(expiryDate).toLocaleDateString()}` : 'Lifetime Access Active'}
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
              <Text style={styles.pricingTitle}>Select Your Journey</Text>
              {offerings.map(pack => (
                <PlanCard key={pack.identifier} pack={pack} />
              ))}

              <Text style={styles.trialText}>
                No hidden fees. Secure checkout via Google Play.
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
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.purchaseButtonGradient}
            >
              {isPurchasing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="white" />
                  <Text style={styles.purchaseButtonText}>
                    {selectedPackage?.packageType === 'ANNUAL' ? 'Get Yearly Premium' : 'Get Monthly Premium'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Secure payment via Google Play. Cancel anytime.
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

  // Header
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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  restoreButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  restoreText: {
    color: colors.secondary,
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: colors.text,
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
    paddingTop: spacing.xl,
  },
  pricingTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
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
  },
  planNameSelected: {
    fontFamily: 'Inter-Bold',
    color: colors.secondary,
  },
  planDescription: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  planSavings: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: colors.success,
    marginTop: 2,
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
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: 'white',
  },
  footerNote: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
