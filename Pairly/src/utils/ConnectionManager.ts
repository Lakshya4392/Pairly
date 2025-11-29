/**
 * ConnectionManager - Bulletproof connection handling for APK
 * Ensures socket and API connections work reliably
 */

import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

class ConnectionManager {
  private isOnline: boolean = true;
  private appState: AppStateStatus = 'active';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(online: boolean) => void> = [];

  /**
   * Initialize connection manager
   */
  initialize(): void {
    console.log('🔌 ConnectionManager initialized');
    
    // Monitor network state
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected === true && state.isInternetReachable === true;
      
      console.log(`📡 Network: ${this.isOnline ? 'Online' : 'Offline'}`);
      
      if (!wasOnline && this.isOnline) {
        console.log('✅ Internet restored - triggering reconnect');
        this.notifyListeners(true);
      } else if (wasOnline && !this.isOnline) {
        console.log('❌ Internet lost');
        this.notifyListeners(false);
      }
    });

    // Monitor app state
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasBackground = this.appState.match(/inactive|background/);
      const isActive = nextAppState === 'active';
      
      console.log(`📱 App state: ${this.appState} → ${nextAppState}`);
      
      if (wasBackground && isActive) {
        console.log('🔄 App came to foreground - checking connection');
        this.checkAndReconnect();
      }
      
      this.appState = nextAppState;
    });
  }

  /**
   * Check connection and trigger reconnect if needed
   */
  private checkAndReconnect(): void {
    if (this.isOnline) {
      // Delay to ensure network is stable
      setTimeout(() => {
        this.notifyListeners(true);
      }, 1000);
    }
  }

  /**
   * Add connection listener
   */
  onConnectionChange(listener: (online: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(online: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(online);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  /**
   * Check if online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Wait for connection
   */
  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    if (this.isOnline) {
      return true;
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.onConnectionChange((online) => {
        if (online) {
          clearTimeout(timer);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }
}

export default new ConnectionManager();
