import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@env';
import AuthService from './AuthService';

type EventCallback = (data: any) => void;

class RealtimeService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners: Map<string, EventCallback[]> = new Map();

  /**
   * Connect to Socket.IO server
   */
  async connect(userId: string): Promise<void> {
    if (this.socket && this.isConnected) {
      console.log('Already connected to Socket.IO');
      return;
    }

    try {
      const token = await AuthService.getToken();

      this.socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.setupEventHandlers(userId);
    } catch (error) {
      console.error('Socket connection error:', error);
      throw error;
    }
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers(userId: string): void {
    if (!this.socket) return;

    // Connection successful
    this.socket.on('connect', () => {
      console.log('Socket.IO connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Join user's personal room
      this.socket?.emit('join_room', { userId });
    });

    // Room joined confirmation
    this.socket.on('room_joined', (data: { userId: string }) => {
      console.log('Joined room:', data.userId);
    });

    // New moment received
    this.socket.on('new_moment', (data: any) => {
      console.log('New moment received:', data);
      this.triggerEvent('new_moment', data);
    });

    // Photo received from partner
    this.socket.on('receive_photo', async (data: any) => {
      console.log('📥 Photo received from partner');
      this.triggerEvent('receive_photo', data);
      
      // Update widget with new photo (Android only)
      try {
        const { Platform } = await import('react-native');
        if (Platform.OS === 'android' && data.photoUri && data.partnerName) {
          const { default: WidgetService } = await import('./WidgetService');
          await WidgetService.onPhotoReceived(data.photoUri, data.partnerName);
        }
      } catch (error) {
        console.error('Error updating widget:', error);
      }
    });

    // Photo delivered confirmation
    this.socket.on('photo_delivered', (data: any) => {
      console.log('✅ Photo delivered to partner');
      this.triggerEvent('photo_delivered', data);
    });

    // Photo reaction received
    this.socket.on('photo_reaction', (data: any) => {
      console.log('❤️ Reaction received:', data.reaction);
      this.triggerEvent('photo_reaction', data);
    });

    // Partner connected
    this.socket.on('partner_connected', (data: any) => {
      console.log('Partner connected:', data);
      this.triggerEvent('partner_connected', data);
    });

    // Partner disconnected
    this.socket.on('partner_disconnected', (data: any) => {
      console.log('Partner disconnected:', data);
      this.triggerEvent('partner_disconnected', data);
    });

    // Partner updated profile
    this.socket.on('partner_updated', (data: any) => {
      console.log('Partner updated:', data);
      this.triggerEvent('partner_updated', data);
    });

    // Disconnection
    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket.IO disconnected:', reason);
      this.isConnected = false;
      this.triggerEvent('disconnect', { reason });
    });

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('Reconnection attempt:', attemptNumber);
      this.reconnectAttempts = attemptNumber;
    });

    // Reconnection successful
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Rejoin room
      this.socket?.emit('join_room', { userId });
      
      this.triggerEvent('reconnect', { attemptNumber });
    });

    // Reconnection failed
    this.socket.on('reconnect_failed', () => {
      console.error('Reconnection failed after max attempts');
      this.triggerEvent('reconnect_failed', {});
    });

    // Connection error
    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
      this.triggerEvent('connect_error', { error: error.message });
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket.IO disconnected manually');
    }
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Register event listener
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  /**
   * Unregister event listener
   */
  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Trigger event callbacks
   */
  private triggerEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Emit event to server
   */
  emit(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot emit event, socket not connected');
    }
  }

  /**
   * Acknowledge moment received
   */
  acknowledgeMoment(momentId: string): void {
    this.emit('moment_received', { momentId });
  }
}

export default new RealtimeService();
