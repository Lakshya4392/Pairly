import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../types';
import crypto from 'crypto';

/**
 * Send a shared note to partner
 * 🔐 SECURE: Notes are NOT stored in database
 * Just sent via Socket.IO + FCM notification (like a private message)
 */
export const sendSharedNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { content } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Note content is required',
      } as ApiResponse);
      return;
    }

    if (content.length > 500) {
      res.status(400).json({
        success: false,
        error: 'Note is too long (max 500 characters)',
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
        message: 'Shared Notes are available with Pairly Premium',
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

    // Get partner
    const partnerId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;
    const partner = pair.user1Id === userId ? pair.user2 : pair.user1;

    // Generate temporary note ID (for UI reference only, not stored)
    const tempNoteId = crypto.randomBytes(5).toString('hex');
    const timestamp = new Date().toISOString();

    // 🔐 NO DATABASE STORAGE - Just send to partner

    // 1. Send via Socket.IO (for live users)
    io.to(partnerId).emit('shared_note', {
      noteId: tempNoteId,
      content: content.trim(),
      senderName: user.displayName,
      createdAt: timestamp,
      // No expiresAt - it's instant/live only
    });

    // 2. Send FCM notification (for background/offline users)
    try {
      if (partner.fcmToken) {
        const FCMService = (await import('../services/FCMService')).default;
        await FCMService.sendSharedNoteNotification(
          partner.fcmToken,
          content.length > 50 ? content.substring(0, 50) + '...' : content.trim(),
          user.displayName
        );
        console.log(`📲 [FCM] Note notification sent to ${partner.displayName}`);
      }
    } catch (fcmError) {
      console.log('⚠️ Note FCM notification failed:', fcmError);
      // Don't fail the request, Socket.IO might have worked
    }

    console.log(`📝 Note sent from ${user.displayName} to ${partner.displayName} (not stored)`);

    res.json({
      success: true,
      data: {
        note: {
          id: tempNoteId,
          content: content.trim(),
          senderName: user.displayName,
          createdAt: timestamp,
          stored: false, // Indicate note is not stored
        },
        message: 'Note sent! (not stored for privacy)',
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Send note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send note',
    } as ApiResponse);
  }
};

/**
 * Get recent notes - DEPRECATED
 * Notes are no longer stored, so this returns empty
 */
export const getRecentNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  // Notes are no longer stored
  res.json({
    success: true,
    data: {
      notes: [],
      message: 'Notes are now instant-only (not stored for privacy)',
    },
  } as ApiResponse);
};

/**
 * Delete a note - DEPRECATED
 * Notes are no longer stored, nothing to delete
 */
export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: {
      message: 'Notes are instant-only (not stored), nothing to delete',
    },
  } as ApiResponse);
};
