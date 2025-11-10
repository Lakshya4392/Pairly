import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse, PairResponse, UserResponse, CodeResponse } from '../types';
import { generateInviteCode, isCodeExpired, getCodeExpiration } from '../utils/codeGenerator';

/**
 * Generate invite code for pairing
 */
export const generateCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Check if user is already paired
    const existingPair = await prisma.pair.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    });

    if (existingPair) {
      res.status(400).json({
        success: false,
        error: 'User is already paired',
      } as ApiResponse);
      return;
    }

    // Generate unique code
    let code = generateInviteCode();
    let codeExists = await prisma.pair.findUnique({
      where: { inviteCode: code },
    });

    // Regenerate if code already exists
    while (codeExists) {
      code = generateInviteCode();
      codeExists = await prisma.pair.findUnique({
        where: { inviteCode: code },
      });
    }

    const expiresAt = getCodeExpiration();

    // Create pair with invite code (user1 only, waiting for user2)
    await prisma.pair.create({
      data: {
        user1Id: userId,
        user2Id: userId, // Temporary, will be updated when someone joins
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
 * Join with invite code
 */
export const joinWithCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { code } = req.body;

    if (!code || code.length !== 6) {
      res.status(400).json({
        success: false,
        error: 'Invalid code format',
      } as ApiResponse);
      return;
    }

    // Check if user is already paired
    const existingPair = await prisma.pair.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        NOT: { inviteCode: code }, // Allow if it's their own code
      },
    });

    if (existingPair) {
      res.status(400).json({
        success: false,
        error: 'User is already paired',
      } as ApiResponse);
      return;
    }

    // Find pair with invite code
    const pair = await prisma.pair.findUnique({
      where: { inviteCode: code },
      include: {
        user1: true,
      },
    });

    if (!pair) {
      res.status(404).json({
        success: false,
        error: 'Invalid code',
      } as ApiResponse);
      return;
    }

    // Check if code is expired
    if (pair.codeExpiresAt && isCodeExpired(pair.codeExpiresAt)) {
      // Delete expired pair
      await prisma.pair.delete({ where: { id: pair.id } });
      
      res.status(400).json({
        success: false,
        error: 'Code has expired',
      } as ApiResponse);
      return;
    }

    // Check if user is trying to pair with themselves
    if (pair.user1Id === userId) {
      res.status(400).json({
        success: false,
        error: 'Cannot pair with yourself',
      } as ApiResponse);
      return;
    }

    // Update pair with user2
    const updatedPair = await prisma.pair.update({
      where: { id: pair.id },
      data: {
        user2Id: userId,
        inviteCode: null, // Remove code after successful pairing
        codeExpiresAt: null,
      },
      include: {
        user1: true,
        user2: true,
      },
    });

    // Emit socket event to both users
    io.to(pair.user1Id).emit('partner_connected', {
      partnerId: userId,
    });
    io.to(userId).emit('partner_connected', {
      partnerId: pair.user1Id,
    });

    // Prepare response
    const partner = updatedPair.user1;
    const partnerResponse: UserResponse = {
      id: partner.id,
      clerkId: partner.clerkId,
      email: partner.email,
      displayName: partner.displayName,
      photoUrl: partner.photoUrl || undefined,
      createdAt: partner.createdAt.toISOString(),
    };

    const pairResponse: PairResponse = {
      id: updatedPair.id,
      user1Id: updatedPair.user1Id,
      user2Id: updatedPair.user2Id,
      pairedAt: updatedPair.pairedAt.toISOString(),
      partner: partnerResponse,
    };

    res.json({
      success: true,
      data: {
        pair: pairResponse,
        partner: partnerResponse,
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
