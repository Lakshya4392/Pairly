import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface AccessCheckScreenProps {
  email: string;
  onAccessGranted: (inviteCode: string) => void;
}

export default function AccessCheckScreen({ email, onAccessGranted }: AccessCheckScreenProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const checkAccess = async () => {
    try {
      setLoading(true);
      setMessage('');

      const response = await axios.post(`${API_URL}/invites/check-access`, {
        email: email.toLowerCase(),
      });

      if (response.data.allowed) {
        // ✅ Access granted!
        setMessage(response.data.message);
        setTimeout(() => {
          onAccessGranted(response.data.inviteCode);
        }, 1000);
      } else {
        // ❌ Access denied
        setMessage(response.data.message);
      }

    } catch (error) {
      console.error('Access check error:', error);
      setMessage('Error checking access. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openWaitlist = () => {
    Linking.openURL('https://pairly.app/waitlist'); // Replace with your actual URL
  };

  React.useEffect(() => {
    // Auto-check on mount
    checkAccess();
  }, []);

  return (
    <LinearGradient
      colors={['#FF6B9D', '#C06C84', '#6C5B7B']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>💕 Pairly</Text>
        <Text style={styles.subtitle}>Invite-Only Beta</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Checking access...</Text>
          </View>
        ) : (
          <>
            {message && (
              <View style={styles.messageContainer}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            )}

            {!message.includes('Welcome') && (
              <>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={checkAccess}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.waitlistButton}
                  onPress={openWaitlist}
                >
                  <Text style={styles.waitlistButtonText}>Join Waitlist</Text>
                </TouchableOpacity>

                <Text style={styles.helpText}>
                  Know someone using Pairly? Ask them for an invite!
                </Text>
              </>
            )}
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 15,
  },
  retryButtonText: {
    color: '#FF6B9D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitlistButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 20,
  },
  waitlistButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 20,
  },
});
