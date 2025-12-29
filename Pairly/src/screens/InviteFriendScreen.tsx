import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  ScrollView,
  StatusBar,
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface InviteFriendScreenProps {
  onBack: () => void;
}

export default function InviteFriendScreen({ onBack }: InviteFriendScreenProps) {
  const { user } = useUser();
  const { colors, isDarkMode } = useTheme();

  // Create styles with current theme colors
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [referralCode, setReferralCode] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralInfo();
  }, []);

  const fetchReferralInfo = async () => {
    try {
      setLoadingStats(true);

      // Get user's referral code and stats
      const response = await axios.post(`${API_URL}/invites/check-access`, {
        email: user?.emailAddresses[0]?.emailAddress,
        clerkId: user?.id,
      });

      if (response.data.allowed) {
        setReferralCode(response.data.inviteCode || '');
        setStats({
          referralCount: response.data.referralCount || 0,
          isPremium: response.data.isPremium || false,
          premiumDays: response.data.premiumDaysRemaining || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching referral info:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const shareReferralCode = async () => {
    try {
      await Share.share({
        message: `Hey! Use my referral code "${referralCode}" to join Pairly and we both get 30 days of Premium FREE! 💕\n\nDownload: https://pairly-iota.vercel.app`,
        title: 'Join me on Pairly!',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const redeemFriendCode = async () => {
    if (!friendCode.trim()) {
      Alert.alert('Error', 'Please enter your friend\'s referral code');
      return;
    }

    if (friendCode.trim().length < 6) {
      Alert.alert('Error', 'Referral codes are at least 6 characters');
      return;
    }

    if (friendCode.toUpperCase() === referralCode.toUpperCase()) {
      Alert.alert('Oops!', 'You cannot use your own referral code 😅');
      return;
    }

    try {
      setRedeemLoading(true);

      // Call backend to apply referral code
      const response = await axios.post(`${API_URL}/invites/apply-referral`, {
        userEmail: user?.emailAddresses[0]?.emailAddress,
        userClerkId: user?.id,
        referralCode: friendCode.trim().toUpperCase(),
      });

      if (response.data.success) {
        Alert.alert(
          '🎉 Success!',
          response.data.message || 'You now have 30 days of Premium FREE!',
          [{ text: 'Awesome!' }]
        );
        setFriendCode('');
        fetchReferralInfo(); // Refresh stats

        // 🔥 Force refresh premium status across the app
        try {
          const PremiumCheckService = (await import('../services/PremiumCheckService')).default;
          await PremiumCheckService.forceRefresh();
          console.log('✅ Premium status refreshed after code redemption');
        } catch (refreshError) {
          console.warn('⚠️ Could not refresh premium status:', refreshError);
        }
      } else {
        Alert.alert('Error', response.data.error || 'Invalid referral code');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to apply referral code';
      Alert.alert('Error', errorMsg);
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite & Earn</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero Section */}
        <LinearGradient
          colors={isDarkMode
            ? ['#4C1D95', '#7C3AED', '#4C1D95']
            : ['#FDF4FF', '#FAE8FF', '#F5D0FE']
          }
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroIconContainer}>
            <Ionicons name="gift" size={40} color={isDarkMode ? '#A855F7' : '#9333EA'} />
          </View>
          <Text style={styles.heroTitle}>Get 30 Days Premium FREE 🎁</Text>
          <Text style={styles.heroSubtitle}>
            Share your code with friends. When they join, you BOTH get 30 days of Premium!
          </Text>
        </LinearGradient>

        {/* Your Referral Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.cardTitle}>Your Referral Code</Text>

          {loadingStats ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <View style={styles.codeContainer}>
                <Text style={styles.codeText}>{referralCode || 'Loading...'}</Text>
              </View>

              <View style={styles.codeActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.copyButton]}
                  onPress={copyToClipboard}
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy-outline"}
                    size={18}
                    color={copied ? colors.success : colors.primary}
                  />
                  <Text style={[styles.actionButtonText, copied && { color: colors.success }]}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.shareButton]}
                  onPress={shareReferralCode}
                >
                  <Ionicons name="share-outline" size={18} color="#fff" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Stats Card */}
        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: isDarkMode ? '#312E81' : '#EEF2FF' }]}>
                  <Ionicons name="people-outline" size={20} color={isDarkMode ? '#A5B4FC' : '#6366F1'} />
                </View>
                <Text style={styles.statNumber}>{stats.referralCount}</Text>
                <Text style={styles.statLabel}>Friends Joined</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: isDarkMode ? '#064E3B' : '#ECFDF5' }]}>
                  <Ionicons name="star-outline" size={20} color={colors.success} />
                </View>
                <Text style={styles.statNumber}>{stats.referralCount * 30}</Text>
                <Text style={styles.statLabel}>Days Earned</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: isDarkMode ? '#7C2D12' : '#FEF3C7' }]}>
                  <Ionicons name="diamond-outline" size={20} color={colors.warning} />
                </View>
                <Text style={styles.statNumber}>{stats.isPremium ? '✓' : '-'}</Text>
                <Text style={styles.statLabel}>Premium</Text>
              </View>
            </View>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Enter Friend's Code Card */}
        <View style={styles.redeemCard}>
          <Text style={styles.cardTitle}>Have a Friend's Code?</Text>
          <Text style={styles.redeemSubtitle}>
            Enter their referral code to get 30 days Premium FREE!
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="ticket-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter referral code"
              placeholderTextColor={colors.textTertiary}
              value={friendCode}
              onChangeText={(text) => setFriendCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={12}
              editable={!redeemLoading}
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
            disabled={redeemLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={redeemLoading ? [colors.border, colors.border] : [colors.primary, colors.secondary]}
              style={styles.redeemButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {redeemLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="gift-outline" size={18} color="#fff" />
                  <Text style={styles.redeemButtonText}>Redeem Code</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* How it Works */}
        <View style={styles.stepsCard}>
          <Text style={styles.cardTitle}>How It Works</Text>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share Your Code</Text>
              <Text style={styles.stepDesc}>Send your code to friends via WhatsApp, Instagram, etc.</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>They Enter Your Code</Text>
              <Text style={styles.stepDesc}>Your friend enters your code when they join Pairly</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepNumber, { backgroundColor: colors.success }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>You Both Win! 🎉</Text>
              <Text style={styles.stepDesc}>Both of you get 30 days Premium access FREE</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Create styles function that accepts colors
const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.huge,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  heroCard: {
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  codeCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  codeContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 4,
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  copyButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  shareButton: {
    backgroundColor: colors.primary,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statsCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
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
  redeemCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  redeemSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.text,
    letterSpacing: 2,
    fontWeight: '600',
  },
  redeemButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  redeemButtonDisabled: {
    opacity: 0.7,
  },
  redeemButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepsCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
