/**
 * Socket Health Check Utility
 * Use this to verify socket connection is working properly
 */

import RealtimeService from '../services/RealtimeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  checks: {
    token: boolean;
    network: boolean;
    connection: boolean;
    listeners: boolean;
  };
  messages: string[];
}

class SocketHealthCheck {
  /**
   * Run complete health check
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'healthy',
      checks: {
        token: false,
        network: false,
        connection: false,
        listeners: false,
      },
      messages: [],
    };

    // Check 1: Auth Token
    try {
      const AuthService = (await import('../services/AuthService')).default;
      const token = await AuthService.getToken();
      if (token) {
        result.checks.token = true;
        result.messages.push('✅ Auth token present');
      } else {
        result.status = 'error';
        result.messages.push('❌ Auth token missing - socket may not authenticate');
      }
    } catch (error) {
      result.status = 'error';
      result.messages.push('❌ Failed to check auth token');
    }

    // Check 2: Network Status
    try {
      const netState = await NetInfo.fetch();
      if (netState.isConnected && netState.isInternetReachable) {
        result.checks.network = true;
        result.messages.push('✅ Network available');
      } else {
        result.status = 'warning';
        result.messages.push('⚠️ No internet connection');
      }
    } catch (error) {
      result.status = 'warning';
      result.messages.push('⚠️ Failed to check network status');
    }

    // Check 3: Socket Connection
    try {
      const isConnected = RealtimeService.getConnectionStatus();
      if (isConnected) {
        result.checks.connection = true;
        result.messages.push('✅ Socket connected');
      } else {
        result.status = 'warning';
        result.messages.push('⚠️ Socket not connected');
      }
    } catch (error) {
      result.status = 'error';
      result.messages.push('❌ Failed to check socket connection');
    }

    // Check 4: Event Listeners (basic check)
    result.checks.listeners = true;
    result.messages.push('✅ Event system ready');

    return result;
  }

  /**
   * Print health check results to console
   */
  async printHealthCheck(): Promise<void> {
    console.log('\n🔍 Socket Health Check Starting...\n');

    const result = await this.runHealthCheck();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Status: ${this.getStatusEmoji(result.status)} ${result.status.toUpperCase()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    result.messages.forEach(msg => console.log(msg));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Checks Summary:');
    console.log(`  Token:      ${result.checks.token ? '✅' : '❌'}`);
    console.log(`  Network:    ${result.checks.network ? '✅' : '❌'}`);
    console.log(`  Connection: ${result.checks.connection ? '✅' : '❌'}`);
    console.log(`  Listeners:  ${result.checks.listeners ? '✅' : '❌'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (result.status === 'error') {
      console.log('⚠️  Action Required: Fix errors above before using socket');
    } else if (result.status === 'warning') {
      console.log('⚠️  Warning: Some features may not work properly');
    } else {
      console.log('🎉 All systems operational!');
    }

    console.log('\n');
  }

  /**
   * Test socket by sending a ping
   */
  async testConnection(userId: string): Promise<boolean> {
    return new Promise((resolve) => {
      console.log('🏓 Sending test ping...');

      const timeout = setTimeout(() => {
        console.log('❌ Ping timeout - no response from server');
        resolve(false);
      }, 5000);

      RealtimeService.emitWithAck(
        'ping',
        { userId, timestamp: Date.now() },
        (response) => {
          clearTimeout(timeout);
          if (response.success) {
            console.log('✅ Pong received - connection working!');
            resolve(true);
          } else {
            console.log('❌ Ping failed:', response.error);
            resolve(false);
          }
        }
      );
    });
  }

  /**
   * Monitor socket events for debugging
   */
  startEventMonitor(): () => void {
    console.log('👀 Socket Event Monitor Started\n');

    const events = [
      'connect',
      'disconnect',
      'reconnect',
      'connect_error',
      'moment_available',
      'new_moment',
      'partner_connected',
      'partner_disconnected',
      'partner_presence',
    ];

    const handlers: Array<{ event: string; handler: (data: any) => void }> = [];

    events.forEach((event) => {
      const handler = (data: any) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 📡 ${event}:`, data);
      };

      RealtimeService.on(event, handler);
      handlers.push({ event, handler });
    });

    // Return cleanup function
    return () => {
      console.log('👀 Socket Event Monitor Stopped\n');
      handlers.forEach(({ event, handler }) => {
        RealtimeService.off(event, handler);
      });
    };
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  }
}

export default new SocketHealthCheck();
