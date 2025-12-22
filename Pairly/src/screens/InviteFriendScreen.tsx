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

  const [friendEmail, setFriendEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchInviteStats();
  }, []);

  const fetchInviteStats = async () => {
    try {
      setLoadingStats(true);
      const response = await axios.get(`${API_URL}/invites/my-invites/${user?.id}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const sendInvite = async () => {
    if (!friendEmail.trim()) {
      Alert.alert('Error', 'Please enter your friend\'s email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(friendEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(`${API_URL}/invites/invite-friend`, {
        senderClerkId: user?.id,
        friendEmail: friendEmail.toLowerCase(),
      });

      if (response.data.success) {
        Alert.alert(
          '🎉 Invite Sent!',
          `Your friend will receive an invite link. When they join, you'll get 1 month of Premium free!`,
          [
            {
              text: 'Share Link',
              onPress: () => shareInviteLink(response.data.inviteLink),
            },
            { text: 'OK' },
          ]
        );
        setFriendEmail('');
        fetchInviteStats();
      }

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to send invite';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const shareInviteLink = async (link: string) => {
    try {
      await Share.share({
        message: `Hey! I'm using Pairly to stay connected with my partner. Join me! ${link}`,
        title: 'Join me on Pairly',
      });
    } catch (error) {
      console.error('Error sharing:', error);
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
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero Section */}
        <LinearGradient
          colors={isDarkMode
            ? [colors.backgroundSecondary, colors.background]
            : ['#FFF5F7', '#FFEEF3', '#FFF5F7']
          }
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroIconContainer}>
            <Ionicons name="gift" size={40} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Share the Love 💕</Text>
          <Text style={styles.heroSubtitle}>
            Invite friends & get 1 month Premium free for each one who joins!
          </Text>
        </LinearGradient>

        {/* Stats Card */}
        {!loadingStats && stats && (
          <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>Your Referral Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: isDarkMode ? '#312E81' : '#EEF2FF' }]}>
                  <Ionicons name="mail-outline" size={20} color={isDarkMode ? '#A5B4FC' : '#6366F1'} />
                </View>
                <Text style={styles.statNumber}>{stats.totalInvited}</Text>
                <Text style={styles.statLabel}>Invited</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: isDarkMode ? '#064E3B' : '#ECFDF5' }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                </View>
                <Text style={styles.statNumber}>{stats.joined}</Text>
                <Text style={styles.statLabel}>Joined</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: isDarkMode ? '#78350F' : '#FEF3C7' }]}>
                  <Ionicons name="star-outline" size={20} color={colors.warning} />
                </View>
                <Text style={styles.statNumber}>{stats.rewardsEarned}</Text>
                <Text style={styles.statLabel}>Rewards</Text>
              </View>
            </View>
          </View>
        )}

        {/* Invite Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Send an Invite</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter friend's email"
              placeholderTextColor={colors.textTertiary}
              value={friendEmail}
              onChangeText={setFriendEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={sendInvite}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={loading ? [colors.border, colors.border] : [colors.primary, colors.secondary]}
              style={styles.sendButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Invite</Text>
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
              <Text style={styles.stepTitle}>Enter Email</Text>
              <Text style={styles.stepDesc}>Type your friend's email address</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>They Get a Link</Text>
              <Text style={styles.stepDesc}>We'll send them a special invite</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>You Both Win!</Text>
              <Text style={styles.stepDesc}>Get 1 month Premium when they join 🎉</Text>
            </View>
          </View>
        </View>

        {/* Recent Invites */}
        {stats && stats.invites && stats.invites.length > 0 && (
          <View style={styles.invitesCard}>
            <Text style={styles.cardTitle}>Recent Invites</Text>
            {stats.invites.slice(0, 5).map((invite: any, index: number) => (
              <View key={index} style={styles.inviteItem}>
                <View style={styles.inviteInfo}>
                  <View style={styles.inviteAvatar}>
                    <Text style={styles.inviteAvatarText}>
                      {invite.email?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={styles.inviteEmail} numberOfLines={1}>
                    {invite.email}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  invite.status === 'joined' ? styles.statusBadgeSuccess : styles.statusBadgePending
                ]}>
                  <Text style={[
                    styles.statusText,
                    invite.status === 'joined' ? styles.statusTextSuccess : styles.statusTextPending
                  ]}>
                    {invite.status === 'joined' ? 'Joined' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

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
    backgroundColor: colors.primaryPastel,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
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
  },
  sendButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepsCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
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
  invitesCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  inviteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inviteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inviteAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryPastel,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  inviteAvatarText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  inviteEmail: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeSuccess: {
    backgroundColor: colors.successLight,
  },
  statusBadgePending: {
    backgroundColor: colors.warningLight,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: colors.success,
  },
  statusTextPending: {
    color: colors.warning,
  },
});
