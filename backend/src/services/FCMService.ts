import admin from 'firebase-admin';
import { log } from '../utils/logger';

class FCMService {
  private initialized = false;

  /**
   * Initialize Firebase Admin SDK
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Check if service account key exists
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

      if (!serviceAccount) {
        log.warn('Firebase service account not configured');
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
      });

      this.initialized = true;
      log.info('Firebase Admin initialized');
    } catch (error) {
      log.error('Firebase Admin initialization error', error);
    }
  }

  /**
   * Send FCM notification to user with visible notification
   */
  async sendNotification(
    fcmToken: string,
    data: {
      type: string;
      [key: string]: any;
    },
    notification?: {
      title: string;
      body: string;
    }
  ): Promise<boolean> {
    if (!this.initialized) {
      log.warn('FCM not initialized, skipping notification');
      return false;
    }

    try {
      // Convert all data values to strings (FCM requirement)
      const stringData = Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
      }, {} as Record<string, string>);

      // For new_moment type, send DATA-ONLY message for background delivery
      // Native service will receive this even when app is killed
      const isBackgroundType = data.type === 'new_moment' || data.type === 'new_note';

      const message: any = {
        token: fcmToken,
        data: {
          ...stringData,
          // Include notification info in data for native service to build notification
          notificationTitle: notification?.title || '',
          notificationBody: notification?.body || '',
        },
        android: {
          priority: 'high' as const,
          // Only add notification for non-background types (user is online)
          ...(notification && !isBackgroundType ? {
            notification: {
              title: notification.title,
              body: notification.body,
              sound: 'default',
              channelId: 'moments',
              icon: 'ic_notification',
              color: '#FF6B9D',
            },
          } : {}),
        },
      };

      // For non-background types, also add top-level notification
      if (notification && !isBackgroundType) {
        message.notification = {
          title: notification.title,
          body: notification.body,
        };
      }

      const response = await admin.messaging().send(message);
      // ⚡ SECURE: Log success without exposing FCM token
      log.info('FCM notification sent', {
        type: data.type,
        isBackgroundType,
        responseId: response.substring(0, 20) + '...'
      });
      return true;
    } catch (error) {
      // ⚡ SECURE: Log error without exposing FCM token
      log.error('FCM send error', error, { type: data.type });
      return false;
    }
  }

  /**
   * ⚡ IMPROVED: Send new photo notification with URL for background download
   */
  async sendNewPhotoNotification(
    fcmToken: string,
    photoUrl: string,
    partnerName: string,
    momentId: string
  ): Promise<boolean> {
    return this.sendNotification(
      fcmToken,
      {
        type: 'new_moment',
        photoUrl,
        partnerName,
        momentId,
        timestamp: Date.now().toString(),
      },
      {
        title: `💕 New Moment from ${partnerName}`,
        body: 'Tap to view your special moment together',
      }
    );
  }

  /**
   * ⚡ NEW: Send note notification
   */
  async sendNoteNotification(
    fcmToken: string,
    noteContent: string,
    senderName: string,
    noteId: string
  ): Promise<boolean> {
    // Truncate note content for notification
    const preview = noteContent.length > 50
      ? noteContent.substring(0, 50) + '...'
      : noteContent;

    return this.sendNotification(
      fcmToken,
      {
        type: 'new_note',
        noteContent,
        senderName,
        noteId,
        timestamp: Date.now().toString(),
      },
      {
        title: `💌 New Note from ${senderName}`,
        body: preview,
      }
    );
  }

  /**
   * Send partner connected notification
   */
  async sendPartnerConnectedNotification(
    fcmToken: string,
    partnerName: string,
    pairId: string
  ): Promise<boolean> {
    return this.sendNotification(fcmToken, {
      type: 'partner_connected',
      partnerName,
      pairId,
    });
  }

  /**
   * Send shared note notification
   */
  async sendSharedNoteNotification(
    fcmToken: string,
    content: string,
    senderName: string
  ): Promise<boolean> {
    return this.sendNotification(fcmToken, {
      type: 'shared_note',
      content,
      senderName,
    });
  }
}

export default new FCMService();
