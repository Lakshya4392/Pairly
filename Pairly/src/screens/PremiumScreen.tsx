import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomAlert } from '../components/CustomAlert';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors, gradients } from '../theme/colorsIOS';
import { spacing, borderRadius, layout } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import PremiumService from '../services/PremiumService';

interface PremiumScreenProps {
  onBack: () => void;
  onPurchase?: (plan: 'monthly' | 'yearly') => void;
}

export const PremiumScreen: React.FC<PremiumScreenProps> = ({ onBack, onPurchase }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<'free' | 'monthly' | 'yearly'>('free');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // Load premium status
  useEffect(() => {
    loadPremiumStatus();
  }, []);

  const loadPremiumStatus = async () => {
    try {
      const status = await PremiumService.getPremiumStatus();
      setIsPremium(status.isPremium);
      setPremiumPlan(status.plan);
      setExpiresAt(status.expiresAt);
      console.log('💎 Premium status loaded:', status);
    } catch (error) {
      console.error('Error loading premium status:', error);
    }
  };
  
  // Premium features with emotional copy
  const premiumFeatures = [
    {
      icon: 'infinite',
      title: 'Unlimited Moments',
      description: 'Share as many moments as your heart desires',
      color: colors.secondary,
      isNew: false,
    },
    {
      icon: 'chatbubble-ellipses',
      title: 'Shared Love Notes',
      description: 'Send notes that appear like magic on their screen',
      color: '#FF6B9D',
      isNew: true,
    },
    {
      icon: 'time',
      title: 'Time-Lock Messages',
      description: 'Send love to your future selves',
      color: '#9B59B6',
      isNew: true,
    },
    {
      icon: 'people',
      title: 'Live Presence',
      description: 'Feel close, even when miles apart',
      color: '#3498DB',
      isNew: true,
    },
    {
      icon: 'camera',
      title: 'Dual Camera Moments',
      description: 'Capture from two worlds, one moment',
      color: '#E74C3C',
      isNew: true,
    },
    {
      icon: 'lock-closed',
      title: 'Secret Vault',
      description: 'Some memories are just for you two',
      color: '#1ABC9C',
      isNew: true,
    },
    {
      icon: 'film',
      title: 'AI Love Story',
      description: 'Your year, told beautifully',
      color: '#F39C12',
      isNew: true,
    },
    {
      icon: 'moon',
      title: 'Dark Mode & Themes',
      description: 'Beautiful themes for every mood',
      color: colors.primary,
      isNew: false,
    },
    {
      icon: 'shield-checkmark',
      title: 'App Lock & Privacy',
      description: 'PIN/Fingerprint protection',
      color: '#34495E',
      isNew: false,
    },
  ];
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  const handlePurchase = () => {
    setShowConfirmAlert(true);
  };

  const confirmPurchase = async () => {
    try {
      // Start trial or activate premium
      if (selectedPlan === 'yearly') {
        // 1 year premium
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        await PremiumService.setPremiumStatus(true, 'yearly', expiryDate);
      } else {
        // 1 month premium
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        await PremiumService.setPremiumStatus(true, 'monthly', expiryDate);
      }
      
      // Reload premium status
      await loadPremiumStatus();
      
      // Update local subscription
      onPurchase?.(selectedPlan);
      
      setShowConfirmAlert(false);
      setShowSuccessAlert(true);
      
      console.log('✅ Premium activated:', selectedPlan);
    } catch (error) {
      console.error('❌ Error activating premium:', error);
      setShowConfirmAlert(false);
      setShowSuccessAlert(true);
    }
  };

  const PlanCard = ({ 
    plan, 
    price, 
    period, 
    savings, 
    isPopular 
  }: { 
    plan: 'monthly' | 'yearly'; 
    price: string; 
    period: string; 
    savings?: string;
    isPopular?: boolean;
  }) => {
    const isSelected = selectedPlan === plan;
    
    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
        ]}
        onPress={() => setSelectedPlan(plan)}
        activeOpacity={0.7}
      >
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}
        
        <View style={styles.planContent}>
          <View style={styles.planLeft}>
            <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
              {isSelected && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.planInfo}>
              <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                {period}
              </Text>
              {savings && (
                <Text style={styles.planSavings}>{savings}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.planRight}>
            <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
              {price}
            </Text>
            <Text style={styles.planPeriod}>
              /{plan === 'monthly' ? 'mo' : 'yr'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FeatureItem = ({ 
    icon, 
    title, 
    description,
    color,
    isNew 
  }: { 
    icon: string; 
    title: string; 
    description: string;
    color: string;
    isNew?: boolean;
  }) => (
    <View style={styles.featureCard}>
      <View style={[styles.featureIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
        {isNew && (
          <View style={styles.newDot} />
        )}
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.featureDescription} numberOfLines={2}>{description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.secondary} />
      
      {/* Compact Header */}
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
      </LinearGradient>

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
                  {premiumPlan === 'yearly' ? 'Yearly Plan' : 'Monthly Plan'}
                  {expiresAt && ` • Expires ${new Date(expiresAt).toLocaleDateString()}`}
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

        {/* Pricing Plans */}
        <View style={styles.pricingContainer}>
          <PlanCard
            plan="yearly"
            price="$39.99"
            period="Yearly"
            savings="Save 17%"
            isPopular
          />
          
          <PlanCard
            plan="monthly"
            price="$3.99"
            period="Monthly"
          />
          
          <Text style={styles.trialText}>
            7-day free trial • Cancel anytime
          </Text>
        </View>
      </ScrollView>

      {/* Purchase Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={handlePurchase}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.secondary, colors.secondaryLight]}
            style={styles.purchaseButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="diamond" size={24} color="white" />
            <Text style={styles.purchaseButtonText}>
              Start Free Trial
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.footerNote}>
          {selectedPlan === 'yearly' ? '$39.99/year' : '$4.99/month'} after trial ends
        </Text>
      </View>

      {/* Confirm Purchase Alert */}
      <CustomAlert
        visible={showConfirmAlert}
        title="Start Free Trial?"
        message={`You'll get 7 days free, then ${selectedPlan === 'monthly' ? '$4.99/month' : '$39.99/year'}. Cancel anytime.`}
        icon="diamond"
        iconColor={colors.secondary}
        buttons={[
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setShowConfirmAlert(false),
          },
          {
            text: 'Start Trial',
            style: 'default',
            onPress: confirmPurchase,
          },
        ]}
        onClose={() => setShowConfirmAlert(false)}
      />

      {/* Success Alert */}
      <CustomAlert
        visible={showSuccessAlert}
        title="Trial Started! 🎉"
        message="You now have 7 days of premium access. Enjoy unlimited moments, shared notes, time-lock messages, and more!"
        icon="checkmark-circle"
        iconColor={colors.success}
        buttons={[
          {
            text: 'Let\'s Go!',
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
    fontSize: 14,
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
  newDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.surface,
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
    color: colors.secondary,
  },
  planPrice: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
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
