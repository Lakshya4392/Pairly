import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { API_CONFIG } from '../config/api.config';
import Logger from '../utils/Logger';

// APK detection
const isAPK = !__DEV__ && Platform.OS === 'android';

/**
 * Bulletproof Socket Connection Service
 * Handles reconnection, error recovery, and persistent connections
 */
class SocketConnectionService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private maxReconnectDelay = 30000; // Max 30 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private pairingListeners: Array<(data: any) => void> = [];
  // ⚡ IMPROVED: Background state handler
  private appStateSubscription: any = null;
  private lastAppState: AppStateStatus = 'active';

  /**
   * Initialize socket connection with bulletproof error handling
   */
  async initialize(userId: string): Promise<void> {
    if (this.isConnecting) {
      Logger.debug('🔄 Socket connection already in progress');
      return;
    }

    this.userId = userId;
    this.isConnecting = true;

    try {
      Logger.info(`🔌 Initializing socket connection for user: ${userId}`);

      // ⚡ BULLETPROOF: Wait for internet connection
      try {
        const ConnectionManager = (await import('../utils/ConnectionManager')).default;
        const isOnline = ConnectionManager.isConnected();

        if (!isOnline) {
          Logger.info('⏳ Waiting for internet connection...');
          const connected = await ConnectionManager.waitForConnection(10000);
          if (!connected) {
            Logger.warn('⚠️ No internet connection, will retry later');
            this.isConnecting = false;
            return;
          }
        }
      } catch (error) {
        Logger.warn('⚠️ ConnectionManager not available, proceeding anyway');
      }

      // ⚡ IMPROVED: Get auth token for secure connection
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Logger.warn('⚠️ No auth token found, socket may not authenticate properly');
      } else {
        Logger.debug('✅ Auth token found for socket connection');
      }

      // ⚡ BULLETPROOF: Check backend health first
      try {
        Logger.debug('🏥 Checking backend health...');
        const healthResponse = await fetch(`${API_CONFIG.baseUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: (new AbortController()).signal, // Placeholder, actual timeout handled by fetch implementation or manual controller if needed
        });

        if (healthResponse.ok) {
          Logger.debug('✅ Backend is healthy and ready');
        } else {
          Logger.warn('⚠️ Backend health check failed, but proceeding anyway');
        }
      } catch (healthError) {
        Logger.warn('⚠️ Backend health check failed (cold start?), proceeding anyway');
        // Wait a bit for backend to wake up
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // Create new socket connection with BULLETPROOF settings for APK
      Logger.debug('🔌 Creating socket with URL:', API_CONFIG.baseUrl);
      Logger.debug('🔑 Auth token present:', !!token);

      this.socket = io(API_CONFIG.baseUrl, {
        // ⚡ BULLETPROOF: Auth with token
        auth: {
          token: token || undefined,
          userId: userId,
        },
        // ⚡ BULLETPROOF: Transport settings optimized for APK
        transports: isAPK ? ['websocket', 'polling'] : ['polling', 'websocket'],
        timeout: 60000, // 60 seconds for initial connection
        reconnection: true,
        reconnectionAttempts: isAPK ? 15 : 10, // More attempts for pairing
        reconnectionDelay: isAPK ? 3000 : 1000,
        reconnectionDelayMax: isAPK ? 60000 : 30000, // Max 60s delay
        forceNew: false,
        // Additional optimizations
        upgrade: true,
        rememberUpgrade: true,
        autoConnect: true,
        // APK specific settings
        path: '/socket.io/',
        secure: true,
        rejectUnauthorized: false,
        // Query params
        query: {
          userId: userId,
          platform: Platform.OS,
          isAPK: isAPK.toString(),
          version: '1.0.0',
        },
      });

      this.setupEventHandlers();

      // ⚡ IMPROVED: Setup background state handler for mobile
      this.setupAppStateHandler();

      this.isConnecting = false;

      Logger.info('✅ Socket connection initialized');
    } catch (error) {
      Logger.error('❌ Socket initialization failed:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  private setupAppStateHandler(): void {
    // Remove existing listener if any
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      Logger.debug(`📱 App state changed: ${this.lastAppState} → ${nextAppState}`);

      // App came to foreground from background
      if (this.lastAppState.match(/inactive|background/) && nextAppState === 'active') {
        Logger.debug('🔄 App came to foreground - checking socket connection...');

        // Check if socket is disconnected and reconnect
        if (this.socket && !this.socket.connected && this.userId) {
          Logger.info('⚡ Socket disconnected in background - reconnecting...');
          this.reconnect();

          // Also restart heartbeat
          setTimeout(() => {
            if (this.socket?.connected) {
              this.startHeartbeat();
              Logger.info('✅ Socket reconnected after app foreground');
            }
          }, 1000);
        } else if (this.socket?.connected) {
          Logger.debug('✅ Socket already connected');
          // Send a heartbeat to confirm connection
          if (this.userId) {
            this.socket.emit('heartbeat', { userId: this.userId });
          }
        }
      }

      // App going to background
      if (nextAppState.match(/inactive|background/)) {
        Logger.debug('📱 App going to background - socket will stay connected');
        // Don't disconnect - let it stay connected for background notifications
        // Socket.io will handle reconnection automatically when needed
      }

      this.lastAppState = nextAppState;
    });

    Logger.debug('✅ App state handler setup complete');
  }

  /**
   * Setup comprehensive event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      Logger.info('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;

      // Join user room immediately
      this.joinUserRoom();

      // Start heartbeat
      this.startHeartbeat();

      // Notify listeners
      this.notifyConnectionListeners(true);
    });

    this.socket.on('disconnect', (reason) => {
      Logger.info('🔌 Socket disconnected:', reason);
      this.stopHeartbeat();
      this.notifyConnectionListeners(false);

      // Auto-reconnect for certain reasons
      if (reason === 'io server disconnect') {
        Logger.info('🔄 Server disconnected, attempting to reconnect...');
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      Logger.error('❌ Socket connection error:', error.message);
      this.handleConnectionError();
    });

    this.socket.on('reconnect', async (attemptNumber) => {
      Logger.info(`✅ Socket reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;

      // Process any queued moments after reconnection
      try {
        // ⚡ SIMPLE: No queue processing needed (direct upload to backend)
        Logger.info('✅ Socket reconnected - simple upload flow active');
      } catch (error) {
        // Silent - don't break reconnection flow
      }
    });

    this.socket.on('reconnect_error', (error) => {
      Logger.error('❌ Socket reconnection error:', error.message);
      this.handleReconnectionError();
    });

    this.socket.on('reconnect_failed', () => {
      Logger.error('❌ Socket reconnection failed after all attempts');
      this.notifyConnectionListeners(false);
    });

    // Room events
    this.socket.on('room_joined', (data) => {
      Logger.debug('🏠 Joined room successfully:', data.userId);
    });

    // Pairing events - INSTANT NOTIFICATIONS
    this.socket.on('partner_connected', (data) => {
      Logger.info('🤝 Partner connected:', data);
      this.notifyPairingListeners({ type: 'partner_connected', ...data });
    });

    this.socket.on('pairing_success', (data) => {
      Logger.info('🎉 Pairing successful:', data);
      this.notifyPairingListeners({ type: 'pairing_success', ...data });
    });

    this.socket.on('code_used', (data) => {
      Logger.info('✅ Your code was used by partner:', data);
      this.notifyPairingListeners({ type: 'code_used', ...data });
    });

    this.socket.on('partner_disconnected', (data) => {
      Logger.warn('💔 Partner disconnected:', data);
      this.notifyPairingListeners({ type: 'partner_disconnected', ...data });
    });

    // Presence events
    this.socket.on('partner_presence', (data) => {
      Logger.debug('👁️ Partner presence update:', data);
    });

    // Photo events
    this.socket.on('new_photo', (data) => {
      Logger.info('📸 New photo received via socket:', data);
    });
  }

  /**
   * Join user room with fast retry mechanism
   */
  private async joinUserRoom(retries = 3): Promise<void> {
    if (!this.socket || !this.userId) return;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        Logger.debug(`🏠 Joining room for user ${this.userId} (attempt ${attempt})`);

        this.socket.emit('join_room', { userId: this.userId });

        // Wait for confirmation with shorter timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Room join timeout'));
          }, 3000); // Reduced from 5s to 3s

          this.socket?.once('room_joined', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        Logger.debug('✅ Successfully joined user room');
        return;
      } catch (error) {
        Logger.warn(`❌ Room join attempt ${attempt} failed:`, error);

        if (attempt === retries) {
          Logger.error('❌ Failed to join room after all attempts');
        } else {
          // Faster retry - 500ms instead of 1s per attempt
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    }
  }


  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected && this.userId) {
        this.socket.emit('heartbeat', { userId: this.userId });
      }
    }, 15000); // Every 15 seconds - faster heartbeat for better connection
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle connection errors with exponential backoff
   */
  private handleConnectionError(): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      // Exponential backoff: 1s, 2s, 4s
      const baseDelay = 1000;
      const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
      Logger.debug(`🔄 Retrying connection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.reconnect();
      }, delay);
    } else {
      Logger.warn('⚠️ Max reconnection attempts reached - will retry when network changes');
      this.notifyConnectionListeners(false);
    }
  }

  /**
   * Handle reconnection errors
   */
  private handleReconnectionError(): void {
    Logger.warn('⚠️ Reconnection error, will keep trying...');
  }

  /**
   * Manual reconnection (public for NetworkMonitor)
   */
  reconnect(): void {
    if (this.socket && !this.socket.connected && this.userId) {
      Logger.info('🔄 Attempting manual reconnection...');
      this.socket.connect();
    } else if (!this.socket && this.userId) {
      Logger.info('🔄 Socket not initialized, reinitializing...');
      this.initialize(this.userId);
    }
  }

  /**
   * Add connection status listener
   */
  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.connectionListeners.indexOf(listener);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Add pairing event listener
   */
  onPairingEvent(listener: (data: any) => void): () => void {
    this.pairingListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.pairingListeners.indexOf(listener);
      if (index > -1) {
        this.pairingListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify connection listeners
   */
  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        Logger.error('Error in connection listener:', error);
      }
    });
  }

  /**
   * Notify pairing listeners
   */
  private notifyPairingListeners(data: any): void {
    this.pairingListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        Logger.error('Error in pairing listener:', error);
      }
    });
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    if (!this.socket) return 'Not initialized';
    if (this.socket.connected) return 'Connected';
    if (this.isConnecting) return 'Connecting';
    return 'Disconnected';
  }

  /**
   * ⚡ IMPROVED: Emit event with acknowledgment callback for reliability
   */
  async emit(event: string, data: any, retries = 3): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (this.socket.connected) {
          // ⚡ IMPROVED: Reliability - Use acknowledgment callback
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Acknowledgment timeout for ${event}`));
            }, 5000); // 5 second timeout

            this.socket!.emit(event, data, (response: any) => {
              clearTimeout(timeout);
              if (response?.success !== false) {
                Logger.debug(`📤 Emitted ${event} successfully with ack`);
                resolve();
              } else {
                reject(new Error(response?.error || 'Server rejected event'));
              }
            });
          });
          return;
        } else {
          // If not connected, try to reconnect quickly
          if (attempt < retries && this.userId) {
            Logger.info(`⚡ Socket not connected, attempting quick reconnect...`);
            this.reconnect();
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms for reconnection
          } else {
            throw new Error('Socket not connected');
          }
        }
      } catch (error) {
        Logger.error(`❌ Emit attempt ${attempt} failed:`, error);

        if (attempt === retries) {
          throw new Error(`Failed to emit ${event} after ${retries} attempts`);
        }

        // Faster retry - 500ms instead of 1s
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  /**
   * ⚡ NEW: Emit without acknowledgment (fire and forget) - for non-critical events
   */
  emitFireAndForget(event: string, data: any): void {
    if (!this.socket) {
      Logger.warn('Socket not initialized');
      return;
    }

    if (this.socket.connected) {
      this.socket.emit(event, data);
      Logger.debug(`📤 Emitted ${event} (fire and forget)`);
    } else {
      Logger.warn(`⚠️ Cannot emit ${event}, socket not connected`);
    }
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    Logger.info('🔌 Disconnecting socket...');

    this.stopHeartbeat();

    // ⚡ IMPROVED: Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.userId = null;
    this.reconnectAttempts = 0;
    this.connectionListeners = [];
    this.pairingListeners = [];

    Logger.info('✅ Socket disconnected');
  }

  /**
   * Force reconnection
   */
  async forceReconnect(): Promise<void> {
    if (this.userId) {
      Logger.info('🔄 Force reconnecting socket...');
      this.disconnect();
      await this.initialize(this.userId);
    }
  }
}

export default new SocketConnectionService();