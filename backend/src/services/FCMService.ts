import admin from 'firebase-admin';

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
        console.log('⚠️ Firebase service account not configured');
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
      });

      this.initialized = true;
      console.log('✅ Firebase Admin initialized');
    } catch (error) {
      console.error('❌ Firebase Admin initialization error:', error);
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
      console.log('⚠️ FCM not initialized, skipping notification');
      return false;
    }

    try {
      const message: any = {
        token: fcmToken,
        data: {
          ...data,
          // Convert all values to strings (FCM requirement)
          ...Object.keys(data).reduce((acc, key) => {
            acc[key] = String(data[key]);
            return acc;
          }, {} as Record<string, string>),
        },
        android: {
          priority: 'high' as const,
          notification: notification ? {
            title: notification.title,
            body: notification.body,
            sound: 'default',
            channelId: 'moments',
            icon: 'ic_notification',
            color: '#FF6B9D',
            tag: 'moment',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          } : undefined,
        },
      };

      // Add notification for display
      if (notification) {
        message.notification = {
          title: notification.title,
          body: notification.body,
        };
      }

      const response = await admin.messaging().send(message);
      console.log('✅ FCM notification sent:', response);
      return true;
    } catch (error) {
      console.error('❌ FCM send error:', error);
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
