/**
 * Pending Moment Service
 * Handles server-side queue for offline users
 */

import { prisma, io } from '../index';

// Type assertion for Prisma client with PendingMoment model
const prismaWithPending = prisma as any;

interface PendingMomentData {
  userId: string;
  momentId: string;
  photoData: Buffer;
  photoUrl?: string;
  senderName: string;
  note?: string;
}

class PendingMomentService {
  /**
   * Queue moment for offline user
   */
  async queueMoment(data: PendingMomentData): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire after 7 days

      await prismaWithPending.pendingMoment.create({
        data: {
          userId: data.userId,
          momentId: data.momentId,
          photoData: new Uint8Array(data.photoData),
          photoUrl: data.photoUrl,
          senderName: data.senderName,
          note: data.note,
          expiresAt,
        },
      });

      console.log(`📦 Moment queued for offline user: ${data.userId}`);
    } catch (error) {
      console.error('❌ Error queueing moment:', error);
      throw error;
    }
  }

  /**
   * Get all pending moments for a user
   */
  async getPendingMoments(userId: string) {
    try {
      const pending = await prismaWithPending.pendingMoment.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      console.log(`📥 Found ${pending.length} pending moments for user: ${userId}`);
      return pending;
    } catch (error) {
      console.error('❌ Error fetching pending moments:', error);
      return [];
    }
  }

  /**
   * Push all pending moments to user (when they reconnect)
   */
  async pushPendingMoments(userId: string): Promise<number> {
    try {
      const pending = await this.getPendingMoments(userId);

      if (pending.length === 0) {
        return 0;
      }

      console.log(`📤 Pushing ${pending.length} pending moments to user: ${userId}`);

      let successCount = 0;

      for (const moment of pending) {
        try {
          // Emit to user's socket room
          const userRoom = `user_${userId}`;
          
          io.to(userRoom).emit('moment_available', {
            photoId: moment.momentId,
            photoData: Buffer.from(moment.photoData).toString('base64'),
            photoUrl: moment.photoUrl,
            senderName: moment.senderName,
            timestamp: moment.createdAt.getTime(),
            caption: moment.note,
            isPending: true, // Flag to indicate this was queued
          });

          // Delete from queue after successful push
          await prismaWithPending.pendingMoment.delete({
            where: { id: moment.id },
          });

          successCount++;
          console.log(`✅ Pushed pending moment: ${moment.momentId}`);
        } catch (error) {
          console.error(`❌ Error pushing moment ${moment.momentId}:`, error);
          // Keep in queue for next attempt
        }
      }

      console.log(`✅ Successfully pushed ${successCount}/${pending.length} pending moments`);
      return successCount;
    } catch (error) {
      console.error('❌ Error pushing pending moments:', error);
      return 0;
    }
  }

  /**
   * Delete a pending moment
   */
  async deletePendingMoment(momentId: string): Promise<boolean> {
    try {
      await prismaWithPending.pendingMoment.delete({
        where: { id: momentId },
      });
      return true;
    } catch (error) {
      console.error('❌ Error deleting pending moment:', error);
      return false;
    }
  }

  /**
   * Clean up expired pending moments (run as cron job)
   */
  async cleanupExpired(): Promise<number> {
    try {
      const result = await prismaWithPending.pendingMoment.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} expired pending moments`);
      }

      return result.count;
    } catch (error) {
      console.error('❌ Error cleaning up expired moments:', error);
      return 0;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const total = await prismaWithPending.pendingMoment.count();
      const byUser = await prismaWithPending.pendingMoment.groupBy({
        by: ['userId'],
        _count: true,
      });

      return {
        total,
        byUser: byUser.map((u: any) => ({
          userId: u.userId,
          count: u._count,
        })),
      };
    } catch (error) {
      console.error('❌ Error getting queue stats:', error);
      return { total: 0, byUser: [] };
    }
  }
}

export default new PendingMomentService();
