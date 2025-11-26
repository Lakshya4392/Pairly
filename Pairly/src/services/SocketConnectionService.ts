import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { API_CONFIG } from '../config/api.config';

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
      console.log('🔄 Socket connection already in progress');
      return;
    }

    this.userId = userId;
    this.isConnecting = true;

    try {
      console.log(`🔌 Initializing socket connection for user: ${userId}`);
      
      // ⚡ IMPROVED: Get auth token for secure connection
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        console.warn('⚠️ No auth token found, socket may not authenticate properly');
      }
      
      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // Create new socket connection with optimized settings for INSTANT connection
      this.socket = io(API_CONFIG.baseUrl, {
        // ⚡ IMPROVED: Security - Pass auth token
        auth: {
          token: token || undefined,
        },
        // ⚡ IMPROVED: Polling first for Render cold starts, then upgrade to WebSocket
        transports: ['polling', 'websocket'], // Polling first for reliability
        timeout: 20000, // 20 second timeout for Render cold starts
        reconnection: true,
        reconnectionAttempts: 3, // Reduced from 10
        reconnectionDelay: 1000, // Increased from 500ms
        reconnectionDelayMax: 10000, // Reduced from 30s
        forceNew: true,
        // Additional optimizations
        upgrade: true, // Allow upgrade to WebSocket
        rememberUpgrade: true, // Remember successful upgrade
        autoConnect: true, // Auto-connect immediately
      });

      this.setupEventHandlers();
      
      // ⚡ IMPROVED: Setup background state handler for mobile
      this.setupAppStateHandler();
      
      this.isConnecting = false;

      console.log('✅ Socket connection initialized');
    } catch (error) {
      console.error('❌ Socket initialization failed:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * ⚡ IMPROVED: Handle app background/foreground state changes
   * Critical for mobile - reconnect socket when app comes to foreground
   */
  private setupAppStateHandler(): void {
    // Remove existing listener if any
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log(`📱 App state changed: ${this.lastAppState} → ${nextAppState}`);

      // App came to foreground from background
      if (this.lastAppState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 App came to foreground - checking socket connection...');
        
        // Check if socket is disconnected and reconnect
        if (this.socket && !this.socket.connected && this.userId) {
          console.log('⚡ Socket disconnected in background - reconnecting...');
          this.reconnect();
          
          // Also restart heartbeat
          setTimeout(() => {
            if (this.socket?.connected) {
              this.startHeartbeat();
              console.log('✅ Socket reconnected after app foreground');
            }
          }, 1000);
        } else if (this.socket?.connected) {
          console.log('✅ Socket already connected');
          // Send a heartbeat to confirm connection
          if (this.userId) {
            this.socket.emit('heartbeat', { userId: this.userId });
          }
        }
      }

      // App going to background
      if (nextAppState.match(/inactive|background/)) {
        console.log('📱 App going to background - socket will stay connected');
        // Don't disconnect - let it stay connected for background notifications
        // Socket.io will handle reconnection automatically when needed
      }

      this.lastAppState = nextAppState;
    });

    console.log('✅ App state handler setup complete');
  }

  /**
   * Setup comprehensive event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      
      // Join user room immediately
      this.joinUserRoom();
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Notify listeners
      this.notifyConnectionListeners(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.stopHeartbeat();
      this.notifyConnectionListeners(false);
      
      // Auto-reconnect for certain reasons
      if (reason === 'io server disconnect') {
        console.log('🔄 Server disconnected, attempting to reconnect...');
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.handleConnectionError();
    });

    this.socket.on('reconnect', async (attemptNumber) => {
      console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      
      // Process any queued moments after reconnection
      try {
        const MomentService = (await import('./MomentService')).default;
        setTimeout(async () => {
          await MomentService.processQueuedMoments();
          console.log('✅ Queued moments processed after socket reconnect');
        }, 1000);
      } catch (error) {
        // Silent - don't break reconnection flow
      }
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error.message);
      this.handleReconnectionError();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed after all attempts');
      this.notifyConnectionListeners(false);
    });

    // Room events
    this.socket.on('room_joined', (data) => {
      console.log('🏠 Joined room successfully:', data.userId);
    });

    // Pairing events - INSTANT NOTIFICATIONS
    this.socket.on('partner_connected', (data) => {
      console.log('🤝 Partner connected:', data);
      this.notifyPairingListeners({ type: 'partner_connected', ...data });
    });

    this.socket.on('pairing_success', (data) => {
      console.log('🎉 Pairing successful:', data);
      this.notifyPairingListeners({ type: 'pairing_success', ...data });
    });

    this.socket.on('code_used', (data) => {
      console.log('✅ Your code was used by partner:', data);
      this.notifyPairingListeners({ type: 'code_used', ...data });
    });

    this.socket.on('partner_disconnected', (data) => {
      console.log('💔 Partner disconnected:', data);
      this.notifyPairingListeners({ type: 'partner_disconnected', ...data });
    });

    // Presence events
    this.socket.on('partner_presence', (data) => {
      console.log('👁️ Partner presence update:', data);
    });

    // Photo events
    this.socket.on('new_photo', (data) => {
      console.log('📸 New photo received via socket:', data);
    });
  }

  /**
   * Join user room with fast retry mechanism
   */
  private async joinUserRoom(retries = 3): Promise<void> {
    if (!this.socket || !this.userId) return;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🏠 Joining room for user ${this.userId} (attempt ${attempt})`);
        
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

        console.log('✅ Successfully joined user room');
        return;
      } catch (error) {
        console.error(`❌ Room join attempt ${attempt} failed:`, error);
        
        if (attempt === retries) {
          console.error('❌ Failed to join room after all attempts');
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
      console.log(`🔄 Retrying connection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnect();
      }, delay);
    } else {
      console.log('⚠️ Max reconnection attempts reached - will retry when network changes');
      this.notifyConnectionListeners(false);
    }
  }

  /**
   * Handle reconnection errors
   */
  private handleReconnectionError(): void {
    console.log('⚠️ Reconnection error, will keep trying...');
  }

  /**
   * Manual reconnection
   */
  private reconnect(): void {
    if (this.socket && !this.socket.connected && this.userId) {
      console.log('🔄 Attempting manual reconnection...');
      this.socket.connect();
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
        console.error('Error in connection listener:', error);
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
        console.error('Error in pairing listener:', error);
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
                console.log(`📤 Emitted ${event} successfully with ack`);
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
            console.log(`⚡ Socket not connected, attempting quick reconnect...`);
            this.reconnect();
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms for reconnection
          } else {
            throw new Error('Socket not connected');
          }
        }
      } catch (error) {
        console.error(`❌ Emit attempt ${attempt} failed:`, error);
        
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
      console.warn('Socket not initialized');
      return;
    }

    if (this.socket.connected) {
      this.socket.emit(event, data);
      console.log(`📤 Emitted ${event} (fire and forget)`);
    } else {
      console.warn(`⚠️ Cannot emit ${event}, socket not connected`);
    }
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    console.log('🔌 Disconnecting socket...');
    
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
    
    console.log('✅ Socket disconnected');
  }

  /**
   * Force reconnection
   */
  async forceReconnect(): Promise<void> {
    if (this.userId) {
      console.log('🔄 Force reconnecting socket...');
      this.disconnect();
      await this.initialize(this.userId);
    }
  }
}

export default new SocketConnectionService();