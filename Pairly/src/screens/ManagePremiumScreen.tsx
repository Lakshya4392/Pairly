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
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, layout, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import PremiumService from '../services/PremiumService';

interface ManagePremiumScreenProps {
  onBack: () => void;
  onCancelSubscription?: () => void;
}

export const ManagePremiumScreen: React.FC<ManagePremiumScreenProps> = ({
  onBack,
  onCancelSubscription,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [premiumPlan, setPremiumPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  useEffect(() => {
    console.log('🎯 ManagePremiumScreen mounted!');
    loadPremiumDetails();
  }, []);

  const loadPremiumDetails = async () => {
    try {
      const status = await PremiumService.getPremiumStatus();
      setPremiumPlan(status.plan as 'monthly' | 'yearly');
      if (status.expiresAt) {
        setExpiryDate(new Date(status.expiresAt));
      }
    } catch (error) {
      console.error('Error loading premium details:', error);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      console.log('🚫 Canceling premium subscription...');

      // Cancel premium locally
      await PremiumService.setPremiumStatus(false);

      // Sync with backend
      try {
        const { useUser } = await import('@clerk/clerk-expo');
        const user = useUser().user;

        if (user) {
          const UserSyncService = (await import('../services/UserSyncService')).default;
          await UserSyncService.updatePremiumStatus(false);
          console.log('✅ Premium canceled in backend');
        }
      } catch (syncError) {
        console.log('⚠️ Backend sync skipped (offline)');
      }

      setShowCancelAlert(false);
      setShowSuccessAlert(true);

      console.log('✅ Premium subscription canceled');

      // Navigate back after showing success
      setTimeout(() => {
        onCancelSubscription?.();
        onBack();
      }, 2000);
    } catch (error) {
      console.error('Error canceling subscription:', error);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlanPrice = () => {
    return premiumPlan === 'yearly' ? '$39.99/year' : '$4.99/month';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Ionicons name="diamond" size={32} color="white" />
          <Text style={styles.headerTitle}>Manage Premium</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Active Plan Card */}
        <View style={styles.planCard}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.planGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.planHeader}>
              <Ionicons name="checkmark-circle" size={48} color="white" />
              <Text style={styles.planStatus}>Premium Active</Text>
            </View>

            <View style={styles.planDetails}>
              <View style={styles.planRow}>
                <Text style={styles.planLabel}>Plan</Text>
                <Text style={styles.planValue}>
                  {premiumPlan === 'yearly' ? 'Yearly' : 'Monthly'}
                </Text>
              </View>

              <View style={styles.planRow}>
                <Text style={styles.planLabel}>Price</Text>
                <Text style={styles.planValue}>{getPlanPrice()}</Text>
              </View>

              <View style={styles.planRow}>
                <Text style={styles.planLabel}>Renews On</Text>
                <Text style={styles.planValue}>{formatDate(expiryDate)}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Your Premium Benefits</Text>

          <View style={styles.benefitsList}>
            {[
              { icon: 'infinite', text: 'Unlimited Moments' },
              { icon: 'chatbubble-ellipses', text: 'Shared Love Notes' },
              { icon: 'time', text: 'Time-Lock Messages' },
              { icon: 'hourglass', text: 'Relationship Timer' },
              { icon: 'notifications', text: 'Smart Reminders' },
              { icon: 'people', text: 'Live Presence' },
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={benefit.icon as any} size={20} color={colors.primary} />
                </View>
                <Text style={styles.benefitText}>{benefit.text}</Text>
                <Ionicons name="checkmark" size={20} color={colors.success} />
              </View>
            ))}
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setShowCancelAlert(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
        </TouchableOpacity>

        <Text style={styles.cancelNote}>
          You'll continue to have access to premium features until {formatDate(expiryDate)}
        </Text>
      </ScrollView>

      {/* Cancel Confirmation Alert */}
      <CustomAlert
        visible={showCancelAlert}
        title="Cancel Premium?"
        message="Are you sure you want to cancel your premium subscription? You'll lose access to all premium features."
        icon="warning"
        iconColor={colors.error}
        buttons={[
          {
            text: 'Keep Premium',
            style: 'cancel',
            onPress: () => setShowCancelAlert(false),
          },
          {
            text: 'Cancel Subscription',
            style: 'destructive',
            onPress: handleCancelSubscription,
          },
        ]}
        onClose={() => setShowCancelAlert(false)}
      />

      {/* Success Alert */}
      <CustomAlert
        visible={showSuccessAlert}
        title="Subscription Cancelled"
        message="Your premium subscription has been cancelled. You'll have access until the end of your billing period."
        icon="checkmark-circle"
        iconColor={colors.success}
        buttons={[
          {
            text: 'OK',
            style: 'default',
            onPress: () => setShowSuccessAlert(false),
          },
        ]}
        onClose={() => setShowSuccessAlert(false)}
      />
    </View>
  );
};

const createStyles = (colors: typeof defaultColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    header: {
      paddingTop: spacing.huge,
      paddingBottom: spacing.xl,
      paddingHorizontal: layout.screenPaddingHorizontal,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
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
      paddingHorizontal: layout.screenPaddingHorizontal,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxxl,
    },

    // Plan Card
    planCard: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      marginBottom: spacing.xxl,
      ...shadows.lg,
    },
    planGradient: {
      padding: spacing.xl,
    },
    planHeader: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    planStatus: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      color: 'white',
      marginTop: spacing.md,
    },
    planDetails: {
      gap: spacing.lg,
    },
    planRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    planLabel: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    planValue: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      color: 'white',
    },

    // Benefits
    benefitsSection: {
      marginBottom: spacing.xxl,
    },
    sectionTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    benefitsList: {
      gap: spacing.md,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      gap: spacing.md,
    },
    benefitIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryLight + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    benefitText: {
      flex: 1,
      fontFamily: 'Inter-Medium',
      fontSize: 15,
      color: colors.text,
    },

    // Cancel Button
    cancelButton: {
      backgroundColor: colors.error + '15',
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.error,
      marginBottom: spacing.md,
    },
    cancelButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.error,
    },
    cancelNote: {
      fontFamily: 'Inter-Regular',
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
