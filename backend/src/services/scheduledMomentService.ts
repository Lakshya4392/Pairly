import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ScheduledMomentService {
  /**
   * Create a scheduled moment
   */
  static async createScheduledMoment(data: {
    pairId: string;
    uploaderId: string;
    photoData: Buffer;
    note?: string;
    scheduledFor: Date;
    expiresAt?: Date;
  }) {
    try {
      const moment = await prisma.moment.create({
        data: {
          pairId: data.pairId,
          uploaderId: data.uploaderId,
          photoData: Buffer.from(data.photoData),
          note: data.note,
          isScheduled: true,
          scheduledFor: data.scheduledFor,
          expiresAt: data.expiresAt,
        },
      });

      console.log('✅ Scheduled moment created:', moment.id);
      return moment;
    } catch (error) {
      console.error('❌ Error creating scheduled moment:', error);
      throw error;
    }
  }

  /**
   * Get moments ready to be delivered
   */
  static async getMomentsReadyForDelivery() {
    try {
      const now = new Date();

      const moments = await prisma.moment.findMany({
        where: {
          isScheduled: true,
          scheduledFor: {
            lte: now, // Scheduled time has passed
          },
          deliveredAt: null, // Not yet delivered
        },
        include: {
          uploader: true,
          pair: true,
        },
      });

      return moments;
    } catch (error) {
      console.error('❌ Error getting moments ready for delivery:', error);
      throw error;
    }
  }

  /**
   * Mark moment as delivered
   */
  static async markAsDelivered(momentId: string) {
    try {
      const moment = await prisma.moment.update({
        where: { id: momentId },
        data: {
          deliveredAt: new Date(),
        },
      });

      console.log('✅ Moment marked as delivered:', momentId);
      return moment;
    } catch (error) {
      console.error('❌ Error marking moment as delivered:', error);
      throw error;
    }
  }

  /**
   * Get expired moments
   */
  static async getExpiredMoments() {
    try {
      const now = new Date();

      const moments = await prisma.moment.findMany({
        where: {
          expiresAt: {
            lte: now, // Expiry time has passed
          },
          deliveredAt: {
            not: null, // Was delivered
          },
        },
      });

      return moments;
    } catch (error) {
      console.error('❌ Error getting expired moments:', error);
      throw error;
    }
  }

  /**
   * Delete expired moments
   */
  static async deleteExpiredMoments() {
    try {
      const expiredMoments = await this.getExpiredMoments();

      if (expiredMoments.length === 0) {
        return { deleted: 0 };
      }

      const result = await prisma.moment.deleteMany({
        where: {
          id: {
            in: expiredMoments.map(m => m.id),
          },
        },
      });

      console.log(`✅ Deleted ${result.count} expired moments`);
      return result;
    } catch (error) {
      console.error('❌ Error deleting expired moments:', error);
      throw error;
    }
  }

  /**
   * Process scheduled moments (run periodically)
   */
  static async processScheduledMoments() {
    try {
      console.log('🔄 Processing scheduled moments...');

      // Get moments ready for delivery
      const readyMoments = await this.getMomentsReadyForDelivery();

      console.log(`📬 Found ${readyMoments.length} moments ready for delivery`);

      // Deliver each moment
      for (const moment of readyMoments) {
        await this.deliverMoment(moment);
      }

      // Process time-lock messages
      await this.processTimeLockMessages();

      // Clean up expired moments
      await this.deleteExpiredMoments();

      console.log('✅ Scheduled moments processed');

      return {
        delivered: readyMoments.length,
      };
    } catch (error) {
      console.error('❌ Error processing scheduled moments:', error);
      throw error;
    }
  }

  /**
   * Process time-lock messages ready for delivery
   */
  static async processTimeLockMessages() {
    try {
      const now = new Date();

      const messages = await prisma.timeLockMessage.findMany({
        where: {
          unlockDate: {
            lte: now,
          },
          isDelivered: false,
        },
        include: {
          sender: true,
          pair: true,
        },
      });

      console.log(`🔓 Found ${messages.length} time-lock messages ready to unlock`);

      for (const message of messages) {
        await this.deliverTimeLockMessage(message);
      }
    } catch (error) {
      console.error('❌ Error processing time-lock messages:', error);
    }
  }

  /**
   * Deliver a time-lock message
   */
  private static async deliverTimeLockMessage(message: any) {
    try {
      console.log(`🔓 Unlocking message ${message.id}`);

      // Mark as delivered
      await prisma.timeLockMessage.update({
        where: { id: message.id },
        data: {
          isDelivered: true,
          deliveredAt: new Date(),
        },
      });

      // Get partner ID
      const partnerId = message.pair.user1Id === message.senderId
        ? message.pair.user2Id
        : message.pair.user1Id;

      // Send via Socket.IO
      const { io } = await import('../index');
      io.to(partnerId).emit('timelock_unlocked', {
        messageId: message.id,
        content: message.content,
        senderName: message.sender.displayName,
        createdAt: message.createdAt.toISOString(),
      });

      console.log(`✅ Time-lock message ${message.id} delivered to ${partnerId}`);
    } catch (error) {
      console.error(`❌ Error delivering time-lock message:`, error);
    }
  }

  /**
   * Deliver a moment (send notification, update widget, etc.)
   */
  private static async deliverMoment(moment: any) {
    try {
      console.log(`📤 Delivering scheduled moment ${moment.id}`);

      // Mark as delivered first
      await this.markAsDelivered(moment.id);

      // Convert photo to base64 for API
      const photoBase64 = moment.photoData.toString('base64');

      // Get partner info
      const partnerId = moment.pair.user1Id === moment.uploaderId
        ? moment.pair.user2Id
        : moment.pair.user1Id;

      const partner = await prisma.user.findUnique({
        where: { id: partnerId },
        select: { fcmToken: true, clerkId: true, displayName: true },
      });

      if (!partner) {
        console.error(`❌ Partner not found for scheduled moment ${moment.id}`);
        return;
      }

      // Construct photo URL (prefer Cloudinary if available)
      const photoUrl = moment.photoUrl || `https://pairly-60qj.onrender.com/uploads/${moment.id}.jpg`;

      // Send Socket.IO notification
      const { io } = await import('../index');
      io.to(partner.clerkId).emit('moment_available', {
        momentId: moment.id,
        timestamp: new Date().toISOString(),
        partnerName: moment.uploader.displayName,
        photoUrl: photoUrl,
        isScheduled: true,
      });
      console.log(`📡 [SOCKET] Scheduled moment sent to ${partner.displayName}`);

      // Send FCM push notification
      if (partner.fcmToken) {
        const FCMService = (await import('./FCMService')).default;
        await FCMService.sendNewPhotoNotification(
          partner.fcmToken,
          photoUrl,
          moment.uploader.displayName,
          moment.id
        );
        console.log(`📲 [FCM] Scheduled moment notification sent to ${partner.displayName}`);
      }

      console.log(`✅ Scheduled moment ${moment.id} delivered successfully`);
    } catch (error) {
      console.error(`❌ Error delivering scheduled moment ${moment.id}:`, error);
    }
  }

  /**
   * Get user's scheduled moments
   */
  static async getUserScheduledMoments(userId: string) {
    try {
      const moments = await prisma.moment.findMany({
        where: {
          uploaderId: userId,
          isScheduled: true,
          deliveredAt: null, // Not yet delivered
        },
        orderBy: {
          scheduledFor: 'asc',
        },
      });

      return moments;
    } catch (error) {
      console.error('❌ Error getting user scheduled moments:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled moment
   */
  static async cancelScheduledMoment(momentId: string, userId: string) {
    try {
      // Verify ownership
      const moment = await prisma.moment.findFirst({
        where: {
          id: momentId,
          uploaderId: userId,
          isScheduled: true,
          deliveredAt: null,
        },
      });

      if (!moment) {
        throw new Error('Scheduled moment not found or already delivered');
      }

      // Delete the moment
      await prisma.moment.delete({
        where: { id: momentId },
      });

      console.log('✅ Scheduled moment cancelled:', momentId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error cancelling scheduled moment:', error);
      throw error;
    }
  }
}

export default ScheduledMomentService;
