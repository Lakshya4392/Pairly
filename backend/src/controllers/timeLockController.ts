import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../types';

/**
 * Create a time-lock message
 */
export const createTimeLock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { content, unlockDate, photoUri } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Message content is required',
      } as ApiResponse);
      return;
    }

    if (content.length > 1000) {
      res.status(400).json({
        success: false,
        error: 'Message is too long (max 1000 characters)',
      } as ApiResponse);
      return;
    }

    // Validate unlock date
    if (!unlockDate) {
      res.status(400).json({
        success: false,
        error: 'Unlock date is required',
      } as ApiResponse);
      return;
    }

    const unlockDateTime = new Date(unlockDate);
    const now = new Date();

    if (unlockDateTime <= now) {
      res.status(400).json({
        success: false,
        error: 'Unlock date must be in the future',
      } as ApiResponse);
      return;
    }

    // Check if user has premium
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.isPremium) {
      res.status(403).json({
        success: false,
        error: 'Premium feature',
        message: 'Time-Lock Messages are available with Pairly Premium',
        upgradeRequired: true,
      } as ApiResponse);
      return;
    }

    // Get user's pair
    const pair = await prisma.pair.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: true,
        user2: true,
      },
    });

    if (!pair) {
      res.status(404).json({
        success: false,
        error: 'No partner found',
      } as ApiResponse);
      return;
    }

    // Create time-lock message
    const message = await prisma.timeLockMessage.create({
      data: {
        senderId: userId,
        pairId: pair.id,
        content: content.trim(),
        unlockDate: unlockDateTime,
        photoData: photoUri ? Buffer.from(photoUri) : null,
      },
    });

    console.log(`🔒 Time-lock message created by ${user.displayName}, unlocks on ${unlockDateTime.toISOString()}`);

    res.json({
      success: true,
      data: {
        message: {
          id: message.id,
          content: message.content,
          unlockDate: message.unlockDate.toISOString(),
          createdAt: message.createdAt.toISOString(),
        },
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Create time-lock error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create time-lock message',
    } as ApiResponse);
  }
};

/**
 * Get pending time-lock messages
 */
export const getPendingMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Get user's pair
    const pair = await prisma.pair.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    });

    if (!pair) {
      res.status(404).json({
        success: false,
        error: 'No partner found',
      } as ApiResponse);
      return;
    }

    // Get pending messages (not yet delivered)
    const messages = await prisma.timeLockMessage.findMany({
      where: {
        pairId: pair.id,
        senderId: userId,
        isDelivered: false,
      },
      orderBy: {
        unlockDate: 'asc',
      },
    });

    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      unlockDate: msg.unlockDate.toISOString(),
      isDelivered: msg.isDelivered,
      createdAt: msg.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Get pending messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
    } as ApiResponse);
  }
};

/**
 * Delete a time-lock message
 */
export const deleteTimeLock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { messageId } = req.params;

    // Check if message exists and user is the sender
    const message = await prisma.timeLockMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      res.status(404).json({
        success: false,
        error: 'Message not found',
      } as ApiResponse);
      return;
    }

    if (message.senderId !== userId) {
      res.status(403).json({
        success: false,
        error: 'You can only delete your own messages',
      } as ApiResponse);
      return;
    }

    if (message.isDelivered) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete delivered messages',
      } as ApiResponse);
      return;
    }

    // Delete message
    await prisma.timeLockMessage.delete({
      where: { id: messageId },
    });

    res.json({
      success: true,
      data: {
        message: 'Time-lock message deleted',
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Delete time-lock error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
    } as ApiResponse);
  }
};
