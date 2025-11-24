import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api.config';
import { APP_CONFIG, log } from '../config/app.config';
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
      log.debug('Already connected to Socket.IO');
      return;
    }

    try {
      const token = await AuthService.getToken();

      // Start performance timer
      if (APP_CONFIG.enablePerformanceMonitoring) {
        try {
          const PerformanceMonitor = (await import('./PerformanceMonitor')).default;
          PerformanceMonitor.startTimer('socket_connection');
        } catch (error) {
          // Ignore
        }
      }

      log.network('Connecting to Socket.IO:', API_CONFIG.socketUrl);
      this.socket = io(API_CONFIG.socketUrl, {
        auth: {
          token,
        },
        transports: ['websocket'], // WebSocket only (faster, no polling fallback)
        reconnection: true,
        reconnectionAttempts: 3, // Reduced from 5
        reconnectionDelay: 1000, // 1 second
        reconnectionDelayMax: 3000, // 3 seconds max
        timeout: 10000, // 10 seconds (backend cold start on Render)
        forceNew: false,
        autoConnect: true,
        multiplex: false,
      });

      this.setupEventHandlers(userId);
    } catch (error) {
      // Silent fail - app works without realtime features
      log.debug('Realtime features unavailable');
    }
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers(userId: string): void {
    if (!this.socket) return;

    // Connection successful
    this.socket.on('connect', async () => {
      log.network('Socket.IO connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Record connection performance
      if (APP_CONFIG.enablePerformanceMonitoring) {
        try {
          const PerformanceMonitor = (await import('./PerformanceMonitor')).default;
          PerformanceMonitor.endTimer('socket_connection');
        } catch (error) {
          // Ignore
        }
      }

      // Join user's personal room
      this.socket?.emit('join_room', { userId });
    });

    // Room joined confirmation
    this.socket.on('room_joined', (data: { userId: string }) => {
      log.debug('Joined room:', data.userId);
    });

    // New moment received
    this.socket.on('new_moment', (data: any) => {
      log.debug('New moment received');
      this.triggerEvent('new_moment', data);
    });

    // Photo received from partner - VERIFY it's from our paired partner
    this.socket.on('receive_photo', async (data: any) => {
      log.debug('Photo received from partner:', data.senderName);
      
      // Verify sender is our paired partner
      try {
        const PairingService = (await import('./PairingService')).default;
        const partner = await PairingService.getPartner();
        
        // Compare using clerkId (data.senderId is clerkId from backend)
        const isFromPartner = partner && (
          data.senderId === partner.clerkId || 
          data.senderId === partner.id
        );
        
        if (isFromPartner) {
          log.debug('Verified photo is from paired partner');
          
          // Import optimized services
          const LocalPhotoStorage = (await import('./LocalPhotoStorage')).default;
          const OptimizedWidgetService = (await import('./OptimizedWidgetService')).default;
          
          // Start performance timer
          let PerformanceMonitor: any = null;
          if (APP_CONFIG.enablePerformanceMonitoring) {
            PerformanceMonitor = (await import('./PerformanceMonitor')).default;
            PerformanceMonitor.startTimer('photo_receive');
          }
          
          // Save photo and update widget immediately
          if (data.photoBase64) {
            const photoUri = await LocalPhotoStorage.savePhoto(
              `data:image/jpeg;base64,${data.photoBase64}`,
              'partner',
              false
            );
            
            if (photoUri) {
              const actualUri = await LocalPhotoStorage.getPhotoUri(photoUri);
              if (actualUri) {
                if (PerformanceMonitor) PerformanceMonitor.startTimer('widget_update');
                await OptimizedWidgetService.onPhotoReceived(actualUri, data.senderName || 'Partner');
                if (PerformanceMonitor) PerformanceMonitor.endTimer('widget_update');
                log.debug('Widget updated from Socket.IO');
              }
            }
          }
          
          // End performance timer
          if (PerformanceMonitor) PerformanceMonitor.endTimer('photo_receive');
          
          this.triggerEvent('receive_photo', data);
        } else {
          console.warn('⚠️ Received photo from non-paired user - ignoring');
          console.warn('Sender:', data.senderId, 'Partner:', partner?.clerkId, partner?.id);
        }
      } catch (error) {
        console.error('Error verifying photo sender:', error);
        // Still trigger event in case of error (fail open)
        this.triggerEvent('receive_photo', data);
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
      console.log('🎉 Partner connected event received:', data);
      this.triggerEvent('partner_connected', data);
    });

    // Pairing success
    this.socket.on('pairing_success', (data: any) => {
      console.log('🎉 Pairing success event received:', data);
      this.triggerEvent('pairing_success', data);
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

    // Partner presence (online/offline)
    this.socket.on('partner_presence', (data: any) => {
      console.log('Partner presence:', data.isOnline ? '🟢 Online' : '⚫ Offline');
      this.triggerEvent('partner_presence', data);
    });

    // Partner heartbeat
    this.socket.on('partner_heartbeat', (data: any) => {
      this.triggerEvent('partner_heartbeat', data);
    });

    // Shared note received
    this.socket.on('shared_note', (data: any) => {
      console.log('📝 Shared note received:', data.content);
      this.triggerEvent('shared_note', data);
    });

    // Time-lock message unlocked
    this.socket.on('timelock_unlocked', (data: any) => {
      console.log('🔓 Time-lock message unlocked:', data.content);
      this.triggerEvent('timelock_unlocked', data);
    });

    // Disconnection
    this.socket.on('disconnect', async (reason: string) => {
      console.log('⚠️ Socket.IO disconnected:', reason);
      this.isConnected = false;
      
      // Record connection drop
      try {
        const PerformanceMonitor = (await import('./PerformanceMonitor')).default;
        PerformanceMonitor.recordConnectionDrop();
      } catch (error) {
        // Ignore
      }
      
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
      // Silent fail - don't spam console with errors
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
   * Emit event to server - SAFE with error handling
   */
  emit(event: string, data: any): void {
    try {
      if (this.socket && this.isConnected) {
        this.socket.emit(event, data);
        log.debug(`📤 Emitted ${event}`);
      } else {
        console.warn(`⚠️ Cannot emit ${event}, socket not connected`);
      }
    } catch (error: any) {
      console.error(`❌ Error emitting ${event}:`, error.message);
      // Don't throw - fail gracefully
    }
  }

  /**
   * Acknowledge moment received
   */
  acknowledgeMoment(momentId: string): void {
    this.emit('moment_received', { momentId });
  }

  /**
   * Send heartbeat to keep presence alive
   */
  sendHeartbeat(userId: string): void {
    this.emit('heartbeat', { userId });
  }

  /**
   * Start heartbeat interval (every 30 seconds)
   */
  private heartbeatInterval: NodeJS.Timeout | null = null;

  startHeartbeat(userId: string): void {
    // Clear existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat(userId);
      }
    }, 30000);

    console.log('💓 Heartbeat started');
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💔 Heartbeat stopped');
    }
  }
}

export default new RealtimeService();
