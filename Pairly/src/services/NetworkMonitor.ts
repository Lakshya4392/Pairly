/**
 * Network Monitor Service
 * Tracks internet connectivity and handles reconnection
 * Battery-efficient: Only connects when internet is available
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkListener = (isOnline: boolean) => void;

class NetworkMonitor {
  private isOnline = true;
  private listeners: NetworkListener[] = [];
  private unsubscribe: (() => void) | null = null;

  /**
   * Initialize network monitoring
   */
  async initialize() {
    console.log('🌐 Initializing Network Monitor...');

    // Check initial state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    
    console.log(`🌐 Initial network state: ${this.isOnline ? 'Online ✅' : 'Offline ❌'}`);
    
    // Listen for network changes
    this.unsubscribe = NetInfo.addEventListener(this.handleNetworkChange);
    
    return this.isOnline;
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange = async (state: NetInfoState) => {
    const wasOnline = this.isOnline;
    const isNowOnline = state.isConnected ?? false;
    
    // Only process if state actually changed
    if (wasOnline === isNowOnline) {
      return;
    }
    
    this.isOnline = isNowOnline;
    
    if (isNowOnline) {
      console.log('🌐 ✅ Internet CONNECTED');
      await this.handleReconnect();
    } else {
      console.log('🌐 ❌ Internet DISCONNECTED');
      await this.handleDisconnect();
    }
    
    // Notify all listeners
    this.notifyListeners();
  };

  /**
   * Handle reconnection when internet comes back
   */
  private async handleReconnect() {
    try {
      console.log('🔄 Internet back - reconnecting services...');
      
      // 1. Reconnect socket
      try {
        const SocketConnectionService = (await import('./SocketConnectionService')).default;
        if (!SocketConnectionService.isConnected()) {
          await SocketConnectionService.reconnect();
          console.log('✅ Socket reconnected');
        }
      } catch (error) {
        console.error('⚠️ Socket reconnect failed:', error);
      }
      
      // 2. Process queued moments
      try {
        const MomentService = (await import('./MomentService')).default;
        await MomentService.processQueuedMoments();
        console.log('✅ Queued moments processed');
      } catch (error) {
        console.error('⚠️ Queue processing failed:', error);
      }
      
      // 3. Sync with backend
      try {
        const BackgroundSyncService = (await import('./BackgroundSyncService')).default;
        await BackgroundSyncService.syncNow();
        console.log('✅ Background sync completed');
      } catch (error) {
        console.error('⚠️ Background sync failed:', error);
      }
      
      console.log('✅ All services reconnected');
      
    } catch (error) {
      console.error('❌ Reconnection error:', error);
    }
  }

  /**
   * Handle disconnection gracefully
   */
  private async handleDisconnect() {
    try {
      console.log('🔌 Disconnecting services gracefully...');
      
      // Socket will auto-disconnect, no need to force
      // Just log the state
      const SocketConnectionService = (await import('./SocketConnectionService')).default;
      if (SocketConnectionService.isConnected()) {
        console.log('⚠️ Socket will disconnect due to no internet');
      }
      
    } catch (error) {
      console.error('❌ Disconnect handling error:', error);
    }
  }

  /**
   * Check if currently online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Get current network state details
   */
  async getNetworkState() {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      type: state.type, // wifi, cellular, none, etc.
      isInternetReachable: state.isInternetReachable ?? false,
    };
  }

  /**
   * Register a listener for network changes
   */
  onChange(callback: NetworkListener) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of network change
   */
  private notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.isOnline);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Manually trigger reconnection
   */
  async forceReconnect() {
    console.log('🔄 Force reconnect requested...');
    const state = await NetInfo.fetch();
    
    if (state.isConnected) {
      await this.handleReconnect();
    } else {
      console.log('⚠️ Cannot reconnect - no internet');
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
    console.log('🌐 Network Monitor destroyed');
  }
}

export default new NetworkMonitor();
