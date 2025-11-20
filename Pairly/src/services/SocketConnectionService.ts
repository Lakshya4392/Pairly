import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private pairingListeners: Array<(data: any) => void> = [];

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
      
      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // Create new socket connection
      this.socket = io(API_CONFIG.baseUrl, {
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        timeout: 10000, // 10 second timeout
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: this.maxReconnectDelay,
        maxHttpBufferSize: 1e6, // 1MB buffer
        forceNew: true,
      });

      this.setupEventHandlers();
      this.isConnecting = false;

      console.log('✅ Socket connection initialized');
    } catch (error) {
      console.error('❌ Socket initialization failed:', error);
      this.isConnecting = false;
      throw error;
    }
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
      this.reconnectDelay = 1000; // Reset delay
      
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

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
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

    // Pairing events
    this.socket.on('partner_connected', (data) => {
      console.log('🤝 Partner connected:', data);
      this.notifyPairingListeners(data);
    });

    this.socket.on('pairing_success', (data) => {
      console.log('🎉 Pairing successful:', data);
      this.notifyPairingListeners({ type: 'pairing_success', ...data });
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
   * Join user room with retry mechanism
   */
  private async joinUserRoom(retries = 3): Promise<void> {
    if (!this.socket || !this.userId) return;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🏠 Joining room for user ${this.userId} (attempt ${attempt})`);
        
        this.socket.emit('join_room', { userId: this.userId });
        
        // Wait for confirmation
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Room join timeout'));
          }, 5000);

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
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
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
    }, 30000); // Every 30 seconds
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
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
      console.log(`🔄 Retrying connection in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnect();
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
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
   * Emit event with retry mechanism
   */
  async emit(event: string, data: any, retries = 3): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (this.socket.connected) {
          this.socket.emit(event, data);
          console.log(`📤 Emitted ${event} successfully`);
          return;
        } else {
          throw new Error('Socket not connected');
        }
      } catch (error) {
        console.error(`❌ Emit attempt ${attempt} failed:`, error);
        
        if (attempt === retries) {
          throw new Error(`Failed to emit ${event} after ${retries} attempts`);
        }
        
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    console.log('🔌 Disconnecting socket...');
    
    this.stopHeartbeat();
    
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