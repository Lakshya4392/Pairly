import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse, PairResponse, UserResponse, CodeResponse } from '../types';
import { generateInviteCode, isCodeExpired, getCodeExpiration } from '../utils/codeGenerator';

/**
 * Generate or retrieve an invite code for pairing.
 */
export const generateCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Use upsert to create or update a pair for the user
    const expiresAt = getCodeExpiration();
    const code = generateInviteCode();

    const pair = await prisma.pair.upsert({
      where: { user1Id: userId },
      update: {
        inviteCode: code,
        codeExpiresAt: expiresAt,
        user2Id: null, // Disconnect previous partner if any
      },
      create: {
        user1Id: userId,
        inviteCode: code,
        codeExpiresAt: expiresAt,
      },
    });

    res.json({
      success: true,
      data: {
        code,
        expiresAt: expiresAt.toISOString(),
      } as CodeResponse,
    } as ApiResponse);
  } catch (error) {
    console.error('Generate code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate code',
    } as ApiResponse);
  }
};

/**
 * Join a pair using an invite code.
 */
export const joinWithCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ success: false, error: 'Invalid code format' });
    }

    // Find the pair with the invite code
    const pair = await prisma.pair.findFirst({
      where: {
        inviteCode: code,
        codeExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user1: true,
      },
    });

    if (!pair) {
      return res.status(404).json({ success: false, error: 'Invalid or expired code' });
    }

    if (pair.user1Id === userId) {
      return res.status(400).json({ success: false, error: 'Cannot pair with yourself' });
    }

    // Notify the user who entered the code that a partner was found
    io.to(userId).emit('partner_found', {
      partnerId: pair.user1.id,
      partnerName: pair.user1.displayName,
      partnerPhotoUrl: pair.user1.photoUrl,
    });

    // Update the pair with the second user
    const updatedPair = await prisma.pair.update({
      where: { id: pair.id },
      data: {
        user2Id: userId,
        inviteCode: null,
        codeExpiresAt: null,
      },
      include: {
        user1: true,
        user2: true,
      },
    });

    // Emit connection events to both users
    if (updatedPair.user2) {
      const user1Data = {
        id: updatedPair.user1.id,
        displayName: updatedPair.user1.displayName,
        email: updatedPair.user1.email,
        photoUrl: updatedPair.user1.photoUrl,
      };

      const user2Data = {
        id: updatedPair.user2.id,
        displayName: updatedPair.user2.displayName,
        email: updatedPair.user2.email,
        photoUrl: updatedPair.user2.photoUrl,
      };

      io.to(pair.user1Id).emit('partner_connected', {
        partnerId: userId,
        partner: user2Data,
        pairId: updatedPair.id,
      });

      io.to(userId).emit('partner_connected', {
        partnerId: pair.user1Id,
        partner: user1Data,
        pairId: updatedPair.id,
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Successfully paired!',
        pair: updatedPair,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Join with code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join with code',
    } as ApiResponse);
  }
};

/**
 * Disconnect from partner
 */
export const disconnect = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Find user's pair
    const pair = await prisma.pair.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    });

    if (!pair) {
      res.status(404).json({
        success: false,
        error: 'No active pairing found',
      } as ApiResponse);
      return;
    }

    // Get partner ID
    const partnerId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;

    // Delete pair (this will cascade delete moments)
    await prisma.pair.delete({
      where: { id: pair.id },
    });

    // Emit socket event to partner
    io.to(partnerId).emit('partner_disconnected', {
      reason: 'Partner disconnected',
    });

    res.json({
      success: true,
      data: { message: 'Successfully disconnected' },
    } as ApiResponse);
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect',
    } as ApiResponse);
  }
};
