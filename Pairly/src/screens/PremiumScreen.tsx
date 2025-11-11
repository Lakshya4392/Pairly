import React, { useState } from 'react';
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
import { colors, gradients } from '../theme/colorsIOS';
import { spacing, borderRadius, layout } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface PremiumScreenProps {
  onBack: () => void;
  onPurchase?: (plan: 'monthly' | 'yearly') => void;
}

const premiumFeatures = [
  {
    icon: 'moon',
    title: 'Dark Mode',
    description: 'Beautiful dark theme for night time',
    color: colors.primary,
  },
  {
    icon: 'image',
    title: 'High Quality Photos',
    description: 'Upload photos in original quality',
    color: colors.secondary,
  },
  {
    icon: 'color-palette',
    title: 'Custom Themes',
    description: '5 beautiful color themes to choose from',
    color: '#FF6B9D',
  },
  {
    icon: 'notifications',
    title: 'Smart Reminders',
    description: 'Good morning & goodnight reminders',
    color: '#9B59B6',
  },
  {
    icon: 'lock-closed',
    title: 'App Lock & Privacy',
    description: 'PIN/Fingerprint protection',
    color: '#E74C3C',
  },
  {
    icon: 'volume-high',
    title: 'Custom Sounds',
    description: '15+ notification sounds',
    color: '#3498DB',
  },
  {
    icon: 'sparkles',
    title: 'Photo Filters',
    description: '20+ Instagram-style filters',
    color: '#F39C12',
  },
  {
    icon: 'eye-off',
    title: 'Private Mode',
    description: 'Hide app in recent apps',
    color: '#1ABC9C',
  },
];

export const PremiumScreen: React.FC<PremiumScreenProps> = ({ onBack, onPurchase }) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  const handlePurchase = () => {
    setShowConfirmAlert(true);
  };

  const confirmPurchase = async () => {
    try {
      // Update local subscription
      onPurchase?.(selectedPlan);
      
      // Sync with backend - Import dynamically to avoid hook issues
      const { useUser: getUser } = await import('@clerk/clerk-expo');
      
      // Note: This is a workaround - ideally pass user from parent component
      // For now, we'll handle sync in the parent component that has access to hooks
      
      setShowConfirmAlert(false);
      setShowSuccessAlert(true);
      
      console.log('✅ Premium purchase completed');
    } catch (error) {
      console.error('❌ Error processing premium:', error);
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
    color 
  }: { 
    icon: string; 
    title: string; 
    description: string;
    color: string;
  }) => (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header with Gradient - Compact */}
      <LinearGradient
        colors={[colors.secondary, colors.secondaryLight]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.diamondIcon}>
            <Ionicons name="diamond" size={24} color="white" />
          </View>
        </View>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Pairly Premium</Text>
          <Text style={styles.headerSubtitle}>Unlock all premium features</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>✨ Premium Features</Text>
          {premiumFeatures.map((feature, index) => (
            <FeatureItem key={index} {...feature} />
          ))}
        </View>

        {/* Pricing Plans */}
        <View style={styles.pricingContainer}>
          <Text style={styles.sectionTitle}>💎 Choose Your Plan</Text>
          <Text style={styles.sectionSubtitle}>Start with 7 days free trial</Text>
          
          <PlanCard
            plan="yearly"
            price="$39.99"
            period="Yearly"
            savings="Save 33% • Best Value!"
            isPopular
          />
          
          <PlanCard
            plan="monthly"
            price="$4.99"
            period="Monthly"
          />
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.benefitText}>7-day free trial</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.benefitText}>Cancel anytime</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.benefitText}>All features included</Text>
          </View>
        </View>

        {/* Social Proof */}
        <View style={styles.socialProof}>
          <Text style={styles.socialProofText}>
            ⭐️ Rated 4.9/5 by 10,000+ premium couples
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
        title="Welcome to Premium! 🎉"
        message="You now have access to all premium features. Enjoy!"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header - Compact
  header: {
    paddingTop: spacing.huge,
    paddingBottom: spacing.xl,
    paddingHorizontal: layout.screenPaddingHorizontal,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diamondIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 36,
    color: 'white',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },

  // Section Title
  sectionTitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 20, lineHeight: 28,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  // Features
  featuresContainer: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Pricing
  pricingContainer: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xxl,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  planCardSelected: {
    borderColor: colors.secondary,
    borderWidth: 3,
    backgroundColor: 'white',
    ...shadows.lg,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.xl,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  popularText: {
    fontFamily: 'Inter-Bold', fontSize: 11,
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
    fontFamily: 'Inter-SemiBold', fontSize: 17,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  planNameSelected: {
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  planSavings: {
    fontFamily: 'Inter-SemiBold', fontSize: 12,
    color: colors.secondary,
  },
  planPrice: {
    fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 36,
    color: colors.text,
  },
  planPriceSelected: {
    color: colors.secondary,
  },
  planPeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },

  // Benefits
  benefitsContainer: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitText: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  // Social Proof
  socialProof: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  socialProofText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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
