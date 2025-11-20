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
   * Send FCM notification to user
   */
  async sendNotification(
    fcmToken: string,
    data: {
      type: string;
      [key: string]: any;
    }
  ): Promise<boolean> {
    if (!this.initialized) {
      console.log('⚠️ FCM not initialized, skipping notification');
      return false;
    }

    try {
      const message = {
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
          // Data-only message (no notification UI)
          // This allows background processing
        },
      };

      const response = await admin.messaging().send(message);
      console.log('✅ FCM notification sent:', response);
      return true;
    } catch (error) {
      console.error('❌ FCM send error:', error);
      return false;
    }
  }

  /**
   * Send new photo notification
   */
  async sendNewPhotoNotification(
    fcmToken: string,
    photoUrl: string,
    partnerName: string
  ): Promise<boolean> {
    return this.sendNotification(fcmToken, {
      type: 'new_photo',
      photoUrl,
      partnerName,
    });
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
