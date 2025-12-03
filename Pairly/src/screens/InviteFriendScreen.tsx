import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@clerk/clerk-expo';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface InviteFriendScreenProps {
  onBack: () => void;
}

export default function InviteFriendScreen({ onBack }: InviteFriendScreenProps) {
  const { user } = useUser();
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

    // Basic email validation
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
        fetchInviteStats(); // Refresh stats
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
    <LinearGradient
      colors={['#FF6B9D', '#C06C84', '#6C5B7B']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.header}>
          <Text style={styles.title}>Invite Friends</Text>
          <Text style={styles.subtitle}>
            Get 1 month Premium for each friend who joins! 🎁
          </Text>
        </View>

        {/* Stats Card */}
        {!loadingStats && stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Your Invites</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalInvited}</Text>
                <Text style={styles.statLabel}>Invited</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.joined}</Text>
                <Text style={styles.statLabel}>Joined</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.rewardsEarned}</Text>
                <Text style={styles.statLabel}>Rewards</Text>
              </View>
            </View>
          </View>
        )}

        {/* Invite Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Send Invite</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Friend's email"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={friendEmail}
            onChangeText={setFriendEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={sendInvite}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FF6B9D" />
            ) : (
              <Text style={styles.sendButtonText}>Send Invite</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* How it works */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Enter your friend's email{'\n'}
            2. They'll receive an invite link{'\n'}
            3. When they join, you both win!{'\n'}
            4. You get 1 month Premium free 🎉
          </Text>
        </View>

        {/* Recent Invites */}
        {stats && stats.invites && stats.invites.length > 0 && (
          <View style={styles.invitesCard}>
            <Text style={styles.invitesTitle}>Recent Invites</Text>
            {stats.invites.slice(0, 5).map((invite: any, index: number) => (
              <View key={index} style={styles.inviteItem}>
                <Text style={styles.inviteEmail}>{invite.email}</Text>
                <Text style={[
                  styles.inviteStatus,
                  invite.status === 'joined' && styles.inviteStatusJoined
                ]}>
                  {invite.status === 'joined' ? '✅ Joined' : '⏳ Pending'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 15,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  sendButton: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FF6B9D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 22,
    opacity: 0.9,
  },
  invitesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
  },
  invitesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  inviteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  inviteEmail: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  inviteStatus: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.7,
  },
  inviteStatusJoined: {
    opacity: 1,
    fontWeight: 'bold',
  },
});
