import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../types';

/**
 * Send a shared note to partner
 */
export const sendSharedNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { content, expiresIn24h } = req.body;

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

    // Calculate expiry if needed
    const expiresAt = expiresIn24h
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : null;

    // Create note
    const note = await prisma.sharedNote.create({
      data: {
        senderId: userId,
        pairId: pair.id,
        content: content.trim(),
        expiresAt,
      },
    });

    // Get partner ID
    const partnerId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;
    const partner = pair.user1Id === userId ? pair.user2 : pair.user1;

    // Send via Socket.IO to partner
    io.to(partnerId).emit('shared_note', {
      noteId: note.id,
      content: note.content,
      senderName: user.displayName,
      expiresAt: note.expiresAt?.toISOString(),
      createdAt: note.createdAt.toISOString(),
    });

    console.log(`📝 Note sent from ${user.displayName} to ${partner.displayName}`);

    res.json({
      success: true,
      data: {
        note: {
          id: note.id,
          content: note.content,
          senderName: user.displayName,
          createdAt: note.createdAt.toISOString(),
          expiresAt: note.expiresAt?.toISOString(),
        },
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
 * Get recent notes for the pair
 */
export const getRecentNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 10;

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

    // Get recent notes
    const notes = await prisma.sharedNote.findMany({
      where: {
        pairId: pair.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        sender: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    const formattedNotes = notes.map(note => ({
      id: note.id,
      content: note.content,
      senderName: note.sender.displayName,
      createdAt: note.createdAt.toISOString(),
      expiresAt: note.expiresAt?.toISOString(),
    }));

    res.json({
      success: true,
      data: {
        notes: formattedNotes,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notes',
    } as ApiResponse);
  }
};

/**
 * Delete a note
 */
export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { noteId } = req.params;

    // Check if note exists and user is the sender
    const note = await prisma.sharedNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      res.status(404).json({
        success: false,
        error: 'Note not found',
      } as ApiResponse);
      return;
    }

    if (note.senderId !== userId) {
      res.status(403).json({
        success: false,
        error: 'You can only delete your own notes',
      } as ApiResponse);
      return;
    }

    // Delete note
    await prisma.sharedNote.delete({
      where: { id: noteId },
    });

    res.json({
      success: true,
      data: {
        message: 'Note deleted',
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete note',
    } as ApiResponse);
  }
};
