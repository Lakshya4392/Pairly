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
   * Deliver a moment (send notification, update widget, etc.)
   */
  private static async deliverMoment(moment: any) {
    try {
      console.log(`📤 Delivering moment ${moment.id}`);

      // Mark as delivered
      await this.markAsDelivered(moment.id);

      // TODO: Send push notification to partner
      // TODO: Update widget
      // TODO: Emit Socket.IO event

      console.log(`✅ Moment ${moment.id} delivered`);
    } catch (error) {
      console.error(`❌ Error delivering moment ${moment.id}:`, error);
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
