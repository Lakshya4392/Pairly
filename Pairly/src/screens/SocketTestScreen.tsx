/**
 * Socket Connection Test Screen
 * Use this to test if socket connection is working
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import RealtimeService from '../services/RealtimeService';
import SocketConnectionService from '../services/SocketConnectionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SocketTestScreen = () => {
  const { userId, getToken } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionTime, setConnectionTime] = useState<number | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev]);
    console.log(message);
  };

  useEffect(() => {
    // Check initial connection status
    const checkStatus = () => {
      const status = RealtimeService.getConnectionStatus();
      setIsConnected(status);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const testConnection = async () => {
    setIsTesting(true);
    setLogs([]);
    addLog('🧪 Starting connection test...');

    try {
      // Step 1: Check auth token
      addLog('1️⃣ Checking auth token...');
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        addLog('✅ Auth token found');
      } else {
        addLog('⚠️ No auth token, fetching from Clerk...');
        const clerkToken = await getToken();
        if (clerkToken) {
          await AsyncStorage.setItem('auth_token', clerkToken);
          addLog('✅ Auth token stored');
        } else {
          addLog('❌ Failed to get auth token');
          setIsTesting(false);
          return;
        }
      }

      // Step 2: Check user ID
      addLog('2️⃣ Checking user ID...');
      if (userId) {
        addLog(`✅ User ID: ${userId}`);
      } else {
        addLog('❌ No user ID found');
        setIsTesting(false);
        return;
      }

      // Step 3: Test connection
      addLog('3️⃣ Connecting to socket...');
      const startTime = Date.now();

      await RealtimeService.connect(userId);

      const duration = Date.now() - startTime;
      setConnectionTime(duration);
      addLog(`✅ Connected in ${duration}ms`);

      // Step 4: Start heartbeat
      addLog('4️⃣ Starting heartbeat...');
      RealtimeService.startHeartbeat(userId);
      addLog('✅ Heartbeat started');

      // Step 5: Check connection status
      addLog('5️⃣ Verifying connection...');
      const status = RealtimeService.getConnectionStatus();
      if (status) {
        addLog('✅ Connection verified');
        setIsConnected(true);
      } else {
        addLog('⚠️ Connection not verified');
      }

      addLog('🎉 Test completed successfully!');
    } catch (error: any) {
      addLog(`❌ Test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const testDisconnect = async () => {
    addLog('🔌 Disconnecting...');
    RealtimeService.stopHeartbeat();
    RealtimeService.disconnect();
    setIsConnected(false);
    addLog('✅ Disconnected');
  };

  const testReconnect = async () => {
    addLog('🔄 Reconnecting...');
    setIsTesting(true);

    try {
      const startTime = Date.now();
      await RealtimeService.connect(userId!);
      const duration = Date.now() - startTime;

      setConnectionTime(duration);
      addLog(`✅ Reconnected in ${duration}ms`);
      
      RealtimeService.startHeartbeat(userId!);
      setIsConnected(true);
    } catch (error: any) {
      addLog(`❌ Reconnect failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const testSendEvent = () => {
    addLog('📤 Sending test event...');
    
    RealtimeService.emitWithAck(
      'ping',
      { userId, timestamp: Date.now() },
      (response) => {
        if (response.success) {
          addLog('✅ Test event acknowledged by server');
        } else {
          addLog(`⚠️ Server response: ${response.error || 'No acknowledgment'}`);
        }
      }
    );
  };

  const clearLogs = () => {
    setLogs([]);
    setConnectionTime(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Socket Connection Test</Text>
        <View style={[styles.statusBadge, isConnected ? styles.connected : styles.disconnected]}>
          <View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Connection Time */}
      {connectionTime !== null && (
        <View style={styles.timeContainer}>
          <Text style={styles.timeLabel}>Last Connection Time:</Text>
          <Text style={styles.timeValue}>{connectionTime}ms</Text>
          <Text style={styles.timeHint}>
            {connectionTime < 3000 ? '⚡ Fast!' : connectionTime < 10000 ? '✅ Good' : '⚠️ Slow (cold start)'}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testConnection}
          disabled={isTesting || isConnected}
        >
          {isTesting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isConnected ? '✅ Connected' : '🧪 Test Connection'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testDisconnect}
          disabled={!isConnected || isTesting}
        >
          <Text style={styles.buttonText}>🔌 Disconnect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testReconnect}
          disabled={isConnected || isTesting}
        >
          <Text style={styles.buttonText}>🔄 Reconnect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testSendEvent}
          disabled={!isConnected || isTesting}
        >
          <Text style={styles.buttonText}>📤 Send Test Event</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearLogs}
        >
          <Text style={styles.buttonText}>🗑️ Clear Logs</Text>
        </TouchableOpacity>
      </View>

      {/* Logs */}
      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Logs:</Text>
        <ScrollView style={styles.logsScroll}>
          {logs.length === 0 ? (
            <Text style={styles.noLogs}>No logs yet. Press "Test Connection" to start.</Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))
          )}
        </ScrollView>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📝 Instructions:</Text>
        <Text style={styles.instructionsText}>
          1. Press "Test Connection" to connect{'\n'}
          2. Check logs for connection status{'\n'}
          3. Connection time should be {'<'}15s{'\n'}
          4. Try "Send Test Event" to verify{'\n'}
          5. Test "Disconnect" and "Reconnect"
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  connected: {
    backgroundColor: '#e8f5e9',
  },
  disconnected: {
    backgroundColor: '#ffebee',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  dotConnected: {
    backgroundColor: '#4caf50',
  },
  dotDisconnected: {
    backgroundColor: '#f44336',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  timeHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#2196f3',
  },
  secondaryButton: {
    backgroundColor: '#757575',
  },
  clearButton: {
    backgroundColor: '#ff9800',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logsScroll: {
    flex: 1,
  },
  noLogs: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 5,
    color: '#333',
  },
  instructions: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
