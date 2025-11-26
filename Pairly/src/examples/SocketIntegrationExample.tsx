/**
 * Socket Integration Example
 * Copy-paste this code into your components
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import RealtimeService from '../services/RealtimeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SocketHealthCheck from '../utils/SocketHealthCheck';

/**
 * Example 1: Initialize Socket in App Root
 */
export function AppWithSocket() {
  const { userId, getToken } = useAuth();
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    const initSocket = async () => {
      if (!userId) return;

      try {
        // Get and store auth token
        const token = await getToken();
        if (token) {
          await AsyncStorage.setItem('auth_token', token);
        }

        // Connect socket
        await RealtimeService.connect(userId);
        
        // Start heartbeat
        RealtimeService.startHeartbeat(userId);

        // Run health check (development only)
        if (__DEV__) {
          await SocketHealthCheck.printHealthCheck();
        }

        setSocketReady(true);
        console.log('✅ Socket initialized successfully');
      } catch (error) {
        console.error('❌ Socket initialization failed:', error);
      }
    };

    initSocket();

    // Cleanup
    return () => {
      RealtimeService.stopHeartbeat();
      RealtimeService.disconnect();
    };
  }, [userId]);

  return (
    <View style={styles.container}>
      <Text>Socket Status: {socketReady ? '✅ Ready' : '⏳ Initializing...'}</Text>
      {/* Your app content */}
    </View>
  );
}

/**
 * Example 2: Listen for Photos
 */
export function PhotoGalleryScreen() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check connection status
    setIsConnected(RealtimeService.getConnectionStatus());

    // Listen for new photos
    const handleNewPhoto = (data: any) => {
      console.log('📸 New photo received:', data);
      
      // Add to gallery
      setPhotos((prev) => [data, ...prev]);
      
      // Show notification
      Alert.alert('New Photo!', `${data.senderName} sent you a photo`);
    };

    // Listen for connection changes
    const handleConnect = () => {
      setIsConnected(true);
      console.log('✅ Socket connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('⚠️ Socket disconnected');
    };

    // Register listeners
    RealtimeService.on('receive_photo', handleNewPhoto);
    RealtimeService.on('connect', handleConnect);
    RealtimeService.on('disconnect', handleDisconnect);

    // Cleanup
    return () => {
      RealtimeService.off('receive_photo', handleNewPhoto);
      RealtimeService.off('connect', handleConnect);
      RealtimeService.off('disconnect', handleDisconnect);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
        <Text>{isConnected ? 'Connected' : 'Offline'}</Text>
      </View>

      <Text style={styles.title}>Photo Gallery ({photos.length})</Text>

      {photos.map((photo, index) => (
        <View key={index} style={styles.photoItem}>
          <Text>{photo.senderName}</Text>
          <Text>{new Date(photo.timestamp).toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Example 3: Send Photo with Acknowledgment
 */
export function SendPhotoScreen() {
  const [loading, setLoading] = useState(false);
  const [partnerId, setPartnerId] = useState('partner-user-id');

  const sendPhoto = async () => {
    setLoading(true);

    // Simulate getting photo (replace with actual image picker)
    const photoBase64 = 'base64-encoded-photo-data';

    RealtimeService.emitWithAck(
      'send_photo',
      {
        recipientId: partnerId,
        photoBase64,
        senderName: 'Your Name',
        timestamp: Date.now(),
      },
      (response) => {
        setLoading(false);

        if (response.success) {
          console.log('✅ Photo sent successfully!');
          Alert.alert('Success', 'Photo sent to your partner!');
        } else {
          console.error('❌ Failed to send photo:', response.error);
          Alert.alert('Error', `Failed to send photo: ${response.error}`);
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Photo</Text>
      
      <Button
        title={loading ? 'Sending...' : 'Send Photo'}
        onPress={sendPhoto}
        disabled={loading}
      />
    </View>
  );
}

/**
 * Example 4: Partner Presence Indicator
 */
export function PartnerPresenceIndicator() {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  useEffect(() => {
    const handlePresence = (data: any) => {
      setIsOnline(data.isOnline);
      if (!data.isOnline && data.lastSeen) {
        setLastSeen(new Date(data.lastSeen));
      }
    };

    const handleHeartbeat = () => {
      setIsOnline(true);
      setLastSeen(null);
    };

    RealtimeService.on('partner_presence', handlePresence);
    RealtimeService.on('partner_heartbeat', handleHeartbeat);

    return () => {
      RealtimeService.off('partner_presence', handlePresence);
      RealtimeService.off('partner_heartbeat', handleHeartbeat);
    };
  }, []);

  return (
    <View style={styles.presenceContainer}>
      <View style={[styles.presenceDot, { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' }]} />
      <Text style={styles.presenceText}>
        {isOnline ? 'Online' : lastSeen ? `Last seen ${lastSeen.toLocaleTimeString()}` : 'Offline'}
      </Text>
    </View>
  );
}

/**
 * Example 5: Debug Panel (Development Only)
 */
export function SocketDebugPanel() {
  const [monitoring, setMonitoring] = useState(false);
  const [stopMonitor, setStopMonitor] = useState<(() => void) | null>(null);

  const runHealthCheck = async () => {
    await SocketHealthCheck.printHealthCheck();
  };

  const toggleMonitoring = () => {
    if (monitoring) {
      stopMonitor?.();
      setStopMonitor(null);
      setMonitoring(false);
    } else {
      const stop = SocketHealthCheck.startEventMonitor();
      setStopMonitor(() => stop);
      setMonitoring(true);
    }
  };

  if (!__DEV__) return null; // Only show in development

  return (
    <View style={styles.debugPanel}>
      <Text style={styles.debugTitle}>Socket Debug Panel</Text>
      
      <Button title="Run Health Check" onPress={runHealthCheck} />
      
      <Button
        title={monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        onPress={toggleMonitoring}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  photoItem: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  presenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  presenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  presenceText: {
    fontSize: 14,
    color: '#666',
  },
  debugPanel: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
