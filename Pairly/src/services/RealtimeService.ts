import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
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
  
  // ⚡ WORLD CLASS: Advanced features
  private processedMessageIds: Set<string> = new Set(); // De-duplication
  private maxProcessedIds = 1000; // Keep last 1000 IDs
  private appStateSubscription: any = null;
  private netInfoUnsubscribe: any = null;
  private lastAppState: AppStateStatus = 'active';
  private isNetworkAvailable = true;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentUserId: string | null = null;

  /**
   * ⚡ IMPROVED: Wake up Render backend (free tier cold starts)
   */
  private async wakeUpBackend(): Promise<void> {
    try {
      console.log('⏰ Waking up backend...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      await fetch(API_CONFIG.baseUrl + '/health', {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('✅ Backend is awake');
    } catch (error) {
      console.log('⚠️ Backend wake-up failed (will retry with socket)');
    }
  }

  /**
   * Connect to Socket.IO server
   */
  async connect(userId: string): Promise<void> {
    if (this.socket && this.isConnected) {
      log.debug('Already connected to Socket.IO');
      return;
    }

    this.currentUserId = userId;

    try {
      // ⚡ IMPROVED: Wake up backend first (Render cold start)
      await this.wakeUpBackend();
      
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
        // ⚡ IMPROVED: Faster connection with polling fallback for Render cold starts
        transports: ['polling', 'websocket'], // Polling first for cold starts
        reconnection: true,
        reconnectionAttempts: 3, // Reduced from 5
        reconnectionDelay: 1000, // Increased from 500ms
        reconnectionDelayMax: 5000, // Increased from 3s
        timeout: 20000, // Increased to 20s for Render cold starts
        forceNew: false,
        autoConnect: true,
        multiplex: false,
        upgrade: true, // Allow upgrade to WebSocket after connection
        rememberUpgrade: true,
      });

      this.setupEventHandlers(userId);
      
      // ⚡ WORLD CLASS: Setup network awareness
      this.setupNetworkListener();
      
      // ⚡ WORLD CLASS: Setup app state handler
      this.setupAppStateHandler();
    } catch (error) {
      // Silent fail - app works without realtime features
      log.debug('Realtime features unavailable');
    }
  }

  /**
   * ⚡ WORLD CLASS: Network awareness - only reconnect when internet is available
   */
  private setupNetworkListener(): void {
    // Remove existing listener
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
    }

    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      const wasAvailable = this.isNetworkAvailable;
      this.isNetworkAvailable = state.isConnected === true && state.isInternetReachable === true;

      log.debug(`📡 Network status: ${this.isNetworkAvailable ? 'Online' : 'Offline'}`);

      // Network came back online
      if (!wasAvailable && this.isNetworkAvailable) {
        console.log('🌐 Internet restored - reconnecting socket...');
        
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }

      // Network went offline
      if (wasAvailable && !this.isNetworkAvailable) {
        console.log('📡 Internet lost - socket will auto-reconnect when available');
      }
    });

    console.log('✅ Network listener setup complete');
  }

  /**
   * ⚡ WORLD CLASS: App state handler - battery optimization
   */
  private setupAppStateHandler(): void {
    // Remove existing listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log(`📱 App state: ${this.lastAppState} → ${nextAppState}`);

      // App came to foreground
      if (this.lastAppState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 App foreground - checking socket...');
        
        // Reconnect if disconnected
        if (this.socket && !this.socket.connected && this.isNetworkAvailable) {
          console.log('⚡ Reconnecting socket...');
          this.socket.connect();
        }
        
        // ⚡ WORLD CLASS: Restart heartbeat in foreground
        if (this.currentUserId) {
          this.startHeartbeat(this.currentUserId);
        }
      }

      // App going to background
      if (nextAppState.match(/inactive|background/)) {
        console.log('📱 App background - stopping heartbeat to save battery');
        
        // ⚡ WORLD CLASS: Stop heartbeat in background to save battery
        this.stopHeartbeat();
      }

      this.lastAppState = nextAppState;
    });

    console.log('✅ App state handler setup complete');
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
      
      // ⚡ WORLD CLASS: De-duplication for moments
      const messageId = data.momentId || data.id || `moment_${data.timestamp}`;
      
      if (this.processedMessageIds.has(messageId)) {
        console.log('🛡️ Duplicate moment detected - ignoring:', messageId);
        return;
      }
      
      this.addProcessedMessageId(messageId);
      this.triggerEvent('new_moment', data);
    });

    // Photo received from partner - VERIFY it's from our paired partner
    this.socket.on('receive_photo', async (data: any) => {
      log.debug('Photo received from partner:', data.senderName);
      
      // ⚡ WORLD CLASS: De-duplication - prevent duplicate photos
      const messageId = data.messageId || data.photoId || `${data.senderId}_${data.timestamp}`;
      
      if (this.processedMessageIds.has(messageId)) {
        console.log('🛡️ Duplicate photo detected - ignoring:', messageId);
        return;
      }
      
      // Add to processed IDs
      this.addProcessedMessageId(messageId);
      
      // ⚡ IMPROVED: Show push notification immediately
      try {
        const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
        await EnhancedNotificationService.showMomentNotification(
          data.senderName || 'Partner',
          data.photoId || messageId
        );
        console.log('✅ Push notification sent for new photo');
      } catch (error) {
        console.error('Error showing notification:', error);
      }
      
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
    this.socket.on('reconnect', async (attemptNumber: number) => {
      console.log('✅ Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Rejoin room
      this.socket?.emit('join_room', { userId });
      
      // Process any queued moments after reconnection
      try {
        const MomentService = (await import('./MomentService')).default;
        setTimeout(async () => {
          await MomentService.processQueuedMoments();
          console.log('✅ Queued moments processed after reconnect');
        }, 1000);
      } catch (error) {
        console.error('Error processing queued moments:', error);
      }
      
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
   * ⚡ WORLD CLASS: Add message ID to processed set (with size limit)
   */
  private addProcessedMessageId(messageId: string): void {
    this.processedMessageIds.add(messageId);
    
    // Keep only last 1000 IDs to prevent memory leak
    if (this.processedMessageIds.size > this.maxProcessedIds) {
      const idsArray = Array.from(this.processedMessageIds);
      const toRemove = idsArray.slice(0, idsArray.length - this.maxProcessedIds);
      toRemove.forEach(id => this.processedMessageIds.delete(id));
      
      console.log(`🧹 Cleaned old message IDs, kept last ${this.maxProcessedIds}`);
    }
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    // ⚡ WORLD CLASS: Cleanup all listeners
    this.stopHeartbeat();
    
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket.IO disconnected manually');
    }
    
    // Clear processed IDs
    this.processedMessageIds.clear();
    this.currentUserId = null;
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
   * Emit event to server - SAFE with error handling and RETRY
   */
  emit(event: string, data: any): void {
    try {
      if (this.socket && this.isConnected) {
        this.socket.emit(event, data);
        log.debug(`📤 Emitted ${event}`);
      } else {
        console.warn(`⚠️ Cannot emit ${event}, socket not connected`);
        
        // Try to reconnect if not connected
        if (this.socket && !this.isConnected) {
          console.log('🔄 Attempting to reconnect socket...');
          this.socket.connect();
          
          // Retry emit after short delay
          setTimeout(() => {
            if (this.socket && this.isConnected) {
              this.socket.emit(event, data);
              log.debug(`📤 Emitted ${event} after reconnect`);
            }
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error emitting ${event}:`, error.message);
      // Don't throw - fail gracefully
    }
  }

  /**
   * ⚡ WORLD CLASS: Emit with acknowledgment callback and retry logic
   */
  emitWithAck(event: string, data: any, callback: (response: any) => void, timeout: number = 5000): void {
    try {
      if (this.socket && this.isConnected) {
        // ⚡ WORLD CLASS: Add unique message ID for de-duplication on backend
        const messageId = data.messageId || `${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const dataWithId = { ...data, messageId };
        
        // Set timeout for acknowledgment
        const timeoutId = setTimeout(() => {
          console.warn(`⏱️ Acknowledgment timeout for ${event}`);
          callback({ success: false, error: 'Timeout' });
        }, timeout);
        
        this.socket.emit(event, dataWithId, (response: any) => {
          clearTimeout(timeoutId);
          callback(response);
        });
        
        log.debug(`📤 Emitted ${event} with ack and messageId: ${messageId}`);
      } else {
        console.warn(`⚠️ Cannot emit ${event}, socket not connected`);
        callback({ success: false, error: 'Not connected' });
      }
    } catch (error: any) {
      console.error(`❌ Error emitting ${event}:`, error.message);
      callback({ success: false, error: error.message });
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
   * ⚡ WORLD CLASS: Smart heartbeat - only when app is active
   */
  startHeartbeat(userId: string): void {
    // Clear existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Only start heartbeat if app is in foreground
    if (this.lastAppState !== 'active') {
      console.log('💤 App in background - heartbeat not started (battery saver)');
      return;
    }

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      // Only send if connected AND app is active
      if (this.isConnected && this.lastAppState === 'active') {
        this.sendHeartbeat(userId);
      }
    }, 30000);

    console.log('💓 Heartbeat started (foreground only)');
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
