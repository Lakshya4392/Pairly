import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { API_CONFIG } from '../config/api.config';
import { APP_CONFIG, log } from '../config/app.config';
import AuthService from './AuthService';

// APK detection
const isAPK = !__DEV__ && Platform.OS === 'android';

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
      console.log('🔌 Creating realtime socket with URL:', API_CONFIG.socketUrl);
      console.log('🔑 Auth token present:', !!token);

      this.socket = io(API_CONFIG.socketUrl, {
        auth: {
          token,
          userId,
        },
        // ⚡ BULLETPROOF: Transport settings optimized for APK
        // APK: Start with polling (more reliable), then upgrade to websocket
        // Dev: Start with polling for Render cold starts
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: isAPK ? 10 : 5,
        reconnectionDelay: isAPK ? 2000 : 1000,
        reconnectionDelayMax: isAPK ? 20000 : 10000,
        timeout: isAPK ? 45000 : 20000,
        forceNew: false,
        autoConnect: true,
        multiplex: false,
        upgrade: true,
        rememberUpgrade: true,
        // APK specific settings
        path: '/socket.io/',
        secure: true,
        rejectUnauthorized: false,
        withCredentials: true,
        // Query params
        query: {
          userId: userId,
          platform: Platform.OS,
          isAPK: isAPK.toString(),
          version: '1.0.0',
        },
        // Heartbeat settings - more aggressive for APK

        // Extra options for APK reliability
        extraHeaders: {
          'User-Agent': `Pairly-${Platform.OS}-${isAPK ? 'APK' : 'Dev'}`,
        },
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

        // ⚡ WORLD CLASS: Resume fast heartbeat in foreground
        if (this.currentUserId) {
          this.startHeartbeat(this.currentUserId);
        }
      }

      // App going to background
      if (nextAppState.match(/inactive|background/)) {
        console.log('📱 App background - switching to slow heartbeat');

        // ⚡ WORLD CLASS: Don't stop completely! Switch to slow heartbeat
        // This keeps presence alive ("Idle") without draining battery
        if (this.currentUserId) {
          this.startBackgroundHeartbeat(this.currentUserId);
        }
      }

      this.lastAppState = nextAppState;
    });

    console.log('✅ App state handler setup complete');
  }

  // ... (rest of the file until startHeartbeat)

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers(userId: string): void {
    if (!this.socket) return;

    // ... (existing event handlers)

    // Connection successful
    this.socket.on('connect', async () => {
      log.network('Socket.IO connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // ... (existing code)

      // Join user's personal room
      this.socket?.emit('join_room', { userId });

      // ⚡ RESEND HEARTBEAT ON RECONNECT
      if (this.lastAppState === 'active') {
        this.startHeartbeat(userId);
      } else {
        this.startBackgroundHeartbeat(userId);
      }
    });

    // ... (rest of event handlers)

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

    // ⚡ SIMPLE MVP: Moment available notification (lightweight)
    this.socket.on('moment_available', async (data: any) => {
      log.debug('Photo received from partner:', data.senderName);

      // ⚡ CRITICAL FIX: Don't receive your own photos!
      if (data.senderId === this.currentUserId) {
        console.log('🚫 [RECEIVER] Ignoring own photo (sender = receiver)');
        return;
      }

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

      // ⚡ IMPROVED: Use MomentService to handle photo reception properly
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

          // ⚡ SIMPLE: Use MomentService.onMomentAvailable for simple flow
          const MomentService = (await import('./MomentService')).default;
          // ⚡ WIDGET UPDATES ITSELF BY POLLING BACKEND
          await MomentService.onMomentAvailable({
            momentId: data.photoId,
            timestamp: data.timestamp,
            partnerName: data.senderName,
          });

          console.log('✅ Moment notification processed via MomentService');

          // 🔥 WIDGET FIX: Notify widget of new moment
          try {
            const WidgetUtils = (await import('../utils/WidgetUtils')).default;
            await WidgetUtils.notifyNewMoment();
          } catch (widgetError) {
            console.warn('⚠️ Widget notification failed:', widgetError);
          }

          // ⚡ SIMPLE: Trigger event for UI update
          this.triggerEvent('moment_available', data);

          // ⚡ SIMPLE: Trigger moment_available event for Recent Moments update
          // (Already triggered above - no need to duplicate)
        } else {
          console.warn('⚠️ Received photo from non-paired user - ignoring');
          console.warn('Sender:', data.senderId, 'Partner:', partner?.clerkId, partner?.id);
        }
      } catch (error) {
        console.error('Error verifying photo sender:', error);
        // Still trigger event in case of error (fail open)
        this.triggerEvent('moment_available', data);
      }
    });

    // ... (rest of handlers)

    // Photo delivered confirmation
    this.socket.on('photo_delivered', (data: any) => {
      // console.log('✅ Photo delivered to partner'); // Reduced log
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

    // ⚡ FIXED: Note received from partner
    this.socket.on('receive_note', async (data: any) => {
      console.log('📝 [NOTE] Received from:', data.senderName);

      // Show push notification
      try {
        const EnhancedNotificationService = (await import('./EnhancedNotificationService')).default;
        await EnhancedNotificationService.showNoteNotification(
          data.senderName || 'Partner',
          data.noteContent
        );
        console.log('✅ [NOTE] Notification shown');
      } catch (error) {
        console.error('Error showing note notification:', error);
      }

      this.triggerEvent('receive_note', data);
      this.triggerEvent('shared_note', data); // Backward compatibility
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
        // ⚡ SIMPLE: No queue processing needed (direct upload to backend)
        console.log('✅ Realtime reconnected - simple upload flow active');
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
   * ⚡ WORLD CLASS: Smart heartbeat - foreground (fast)
   */
  startHeartbeat(userId: string): void {
    // Clear existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      // Only send if connected
      if (this.isConnected) {
        this.sendHeartbeat(userId);
      }
    }, 30000);

    console.log('💓 Heartbeat started (FAST - 30s)');

    // Send one immediately
    if (this.isConnected) this.sendHeartbeat(userId);
  }

  /**
   * ⚡ WORLD CLASS: Background heartbeat (slow)
   */
  startBackgroundHeartbeat(userId: string): void {
    // Clear existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 4 minutes (save battery, but keep presence < 5min timeout)
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat(userId);
        console.log('💤💓 Background heartbeat sent');
      }
    }, 240000); // 4 minutes

    console.log('💤💓 Heartbeat switched to BACKGROUND (SLOW - 4m)');
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
