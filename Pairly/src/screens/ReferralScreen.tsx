import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ScrollView,
  ActivityIndicator,
  Clipboard,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors, gradients } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import PremiumCheckService from '../services/PremiumCheckService';

interface ReferralScreenProps {
  onBack?: () => void;
}

export const ReferralScreen: React.FC<ReferralScreenProps> = ({ onBack }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [premiumDays, setPremiumDays] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);

      // Get fresh data from backend
      const status = await PremiumCheckService.checkPremiumStatus();
      const code = await PremiumCheckService.getReferralCode();

      setReferralCode(code);
      setReferralCount(status.referralCount);
      setPremiumDays(status.daysRemaining);
      setIsPremium(status.isPremium);

      console.log('✅ Referral data loaded:', { code, count: status.referralCount, days: status.daysRemaining });
    } catch (error) {
      console.error('❌ Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareReferralCode = async () => {
    try {
      const referralUrl = `https://pairly-iota.vercel.app?ref=${referralCode}`;

      await Share.share({
        message: `Join Pairly with my referral code and get 30 days of premium free! 🎁\n\nReferral Code: ${referralCode}\n\nSign up here: ${referralUrl}`,
        title: 'Join Pairly',
      });

      console.log('✅ Referral code shared');
    } catch (error) {
      console.error('❌ Share error:', error);
    }
  };

  const copyReferralCode = async () => {
    try {
      await Clipboard.setString(referralCode);
      setCopied(true);
      console.log('✅ Referral code copied');

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('❌ Copy error:', error);
    }
  };

  const getRewardText = () => {
    if (referralCount >= 5) return '🎉 6 months premium unlocked!';
    if (referralCount >= 3) return '🎉 3 months premium unlocked!';
    if (referralCount >= 1) return `✨ ${referralCount * 7} days bonus earned!`;
    return '🎁 Refer friends to unlock premium!';
  };

  const getNextRewardText = () => {
    if (referralCount >= 5) return 'Maximum rewards unlocked! 🎉';
    if (referralCount >= 3) return 'Refer 2 more for 6 months premium!';
    if (referralCount >= 1) return `Refer ${3 - referralCount} more for 3 months premium!`;
    return 'Refer 3 friends to get 3 months premium!';
  };

  const redeemFriendCode = async () => {
    if (!friendCode.trim()) {
      Alert.alert('Error', 'Please enter a referral code');
      return;
    }

    if (friendCode.toUpperCase() === referralCode.toUpperCase()) {
      Alert.alert('Oops!', 'You cannot use your own referral code 😅');
      return;
    }

    try {
      setRedeemLoading(true);

      const ApiClient = (await import('../utils/apiClient')).default;
      const response: { success?: boolean; error?: string } = await ApiClient.post('/invites/apply-referral', {
        referralCode: friendCode.trim().toUpperCase(),
      });

      if (response.success) {
        Alert.alert(
          '🎉 Success!',
          'You now have 30 days of Premium FREE!',
          [{ text: 'Awesome!' }]
        );
        setFriendCode('');
        loadReferralData();

        // Force refresh premium
        try {
          await PremiumCheckService.forceRefresh();
        } catch (e) {
          console.warn('Could not refresh premium:', e);
        }
      } else {
        Alert.alert('Error', response.error || 'Invalid referral code');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to apply referral code');
    } finally {
      setRedeemLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading referral data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Ionicons name="gift" size={48} color="#FFF" />
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <Text style={styles.headerSubtitle}>Get premium by sharing Pairly</Text>
        </LinearGradient>

        {/* Referral Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.code}>{referralCode || 'Loading...'}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={copyReferralCode}
              activeOpacity={0.7}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy'}
                size={24}
                color={copied ? '#4CAF50' : colors.primary}
              />
            </TouchableOpacity>
          </View>
          {copied && <Text style={styles.copiedText}>✓ Copied!</Text>}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={32} color={colors.primary} />
            <Text style={styles.statNumber}>{referralCount}</Text>
            <Text style={styles.statLabel}>Referrals</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="star" size={32} color={isPremium ? '#FFD700' : '#CCC'} />
            <Text style={styles.statNumber}>{premiumDays}</Text>
            <Text style={styles.statLabel}>Days Premium</Text>
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={shareReferralCode}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButtonGradient}
          >
            <Ionicons name="share-social" size={20} color="#FFF" />
            <Text style={styles.shareButtonText}>Share Referral Code</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Enter Friend's Code Section */}
        <View style={styles.enterCodeCard}>
          <View style={styles.enterCodeHeader}>
            <Ionicons name="ticket" size={24} color={colors.secondary} />
            <Text style={styles.enterCodeTitle}>Have a Friend's Code?</Text>
          </View>
          <Text style={styles.enterCodeSubtitle}>
            Enter their referral code to get 30 days premium FREE!
          </Text>

          <View style={styles.enterCodeInputContainer}>
            <TextInput
              style={styles.enterCodeInput}
              placeholder="Enter referral code"
              placeholderTextColor={colors.textTertiary}
              value={friendCode}
              onChangeText={(text) => setFriendCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={24}
            />
            {friendCode.length > 0 && (
              <TouchableOpacity onPress={() => setFriendCode('')}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.redeemButton, redeemLoading && styles.redeemButtonDisabled]}
            onPress={redeemFriendCode}
            disabled={redeemLoading || !friendCode.trim()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={friendCode.trim() ? [colors.secondary, colors.primary] : [colors.border, colors.border]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.redeemButtonGradient}
            >
              {redeemLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="gift" size={18} color="#FFF" />
                  <Text style={styles.redeemButtonText}>Redeem Code</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Simple Rewards Hint */}
        <View style={styles.rewardsHint}>
          <Ionicons name="sparkles" size={16} color={colors.warning} />
          <Text style={styles.rewardsHintText}>
            1 referral = 7 days • 3 referrals = 3 months
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};


const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    position: 'absolute',
    top: spacing.xl + 10,
    left: spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    padding: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    ...shadows.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: spacing.md,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: spacing.xs,
  },
  codeCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  codeLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  code: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  copyButton: {
    padding: spacing.sm,
  },
  copiedText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs,
    ...shadows.sm,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rewardCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  rewardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  shareButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  rewardsInfo: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  rewardsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rewardItemText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  howItWorks: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  howItWorksText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // Divider Styles
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: spacing.md,
  },
  // Enter Code Section
  enterCodeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.secondary + '30',
    ...shadows.sm,
  },
  enterCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  enterCodeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  enterCodeSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  enterCodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  enterCodeInput: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: colors.text,
    letterSpacing: 2,
    fontWeight: '600',
  },
  redeemButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  redeemButtonDisabled: {
    opacity: 0.6,
  },
  redeemButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  redeemButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Rewards Hint (minimal)
  rewardsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
  },
  rewardsHintText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
