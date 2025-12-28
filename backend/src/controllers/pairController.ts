import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse, PairResponse, UserResponse, CodeResponse } from '../types';
import { generateInviteCode, isCodeExpired, getCodeExpiration } from '../utils/codeGenerator';

/**
 * Generate invite code for pairing - IMPROVED WITH BETTER ERROR HANDLING
 */
export const generateCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    console.log(`🔄 Generating code for user: ${userId}`);

    // Clean up any expired codes first
    await prisma.pair.deleteMany({
      where: {
        codeExpiresAt: {
          lt: new Date(),
        },
      },
    });

    // Check if user already has an active code
    const existingCodePair = await prisma.pair.findFirst({
      where: {
        user1Id: userId,
        inviteCode: { not: null },
        codeExpiresAt: { gt: new Date() },
      },
    });

    if (existingCodePair) {
      console.log(`✅ Returning existing valid code for user: ${userId}`);
      res.json({
        success: true,
        data: {
          code: existingCodePair.inviteCode,
          expiresAt: existingCodePair.codeExpiresAt!.toISOString(),
        } as CodeResponse,
      } as ApiResponse);
      return;
    }

    // Check if user is already paired
    const existingPair = await prisma.pair.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        inviteCode: null, // Only check completed pairs
      },
    });

    if (existingPair) {
      console.log(`❌ User ${userId} is already paired`);
      res.status(400).json({
        success: false,
        error: 'User is already paired',
      } as ApiResponse);
      return;
    }

    // Generate unique code with retry mechanism
    let code = generateInviteCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const codeExists = await prisma.pair.findUnique({
        where: { inviteCode: code },
      });

      if (!codeExists) {
        break;
      }

      code = generateInviteCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error('❌ Failed to generate unique code after 10 attempts');
      res.status(500).json({
        success: false,
        error: 'Failed to generate unique code',
      } as ApiResponse);
      return;
    }

    const expiresAt = getCodeExpiration();

    // Create pair with invite code (user1 only, waiting for user2)
    // IMPORTANT: We temporarily set user2Id same as user1Id because Prisma requires it
    // This will be updated when someone joins with the code
    // We use inviteCode presence to identify incomplete pairs
    const newPair = await prisma.pair.create({
      data: {
        user1Id: userId,
        user2Id: userId, // Temporary - indicates incomplete pairing
        inviteCode: code,
        codeExpiresAt: expiresAt,
      },
    });

    console.log(`✅ Generated code ${code} for user ${userId}, expires at ${expiresAt.toISOString()}`);

    res.json({
      success: true,
      data: {
        code,
        expiresAt: expiresAt.toISOString(),
      } as CodeResponse,
    } as ApiResponse);
  } catch (error) {
    console.error('❌ Generate code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate code. Please try again.',
    } as ApiResponse);
  }
};

/**
 * Join with invite code - IMPROVED WITH BULLETPROOF ERROR HANDLING
 */
export const joinWithCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { code } = req.body;

    console.log(`🔄 User ${userId} attempting to join with code: ${code}`);

    // Validate code format
    if (!code || typeof code !== 'string' || code.length !== 6) {
      console.log(`❌ Invalid code format: ${code}`);
      res.status(400).json({
        success: false,
        error: 'Please enter a valid 6-character code',
      } as ApiResponse);
      return;
    }

    const upperCode = code.toUpperCase().trim();

    // Clean up expired codes first
    await prisma.pair.deleteMany({
      where: {
        codeExpiresAt: {
          lt: new Date(),
        },
      },
    });

    // Check if user is already paired (excluding their own pending codes)
    const existingPair = await prisma.pair.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        inviteCode: null, // Only check completed pairs
      },
    });

    if (existingPair) {
      console.log(`❌ User ${userId} is already paired`);
      res.status(400).json({
        success: false,
        error: 'You are already paired with someone',
      } as ApiResponse);
      return;
    }

    // Find pair with invite code
    const pair = await prisma.pair.findUnique({
      where: { inviteCode: upperCode },
      include: {
        user1: true,
      },
    });

    if (!pair) {
      console.log(`❌ Code not found: ${upperCode}`);
      res.status(404).json({
        success: false,
        error: 'Invalid code. Please check and try again.',
      } as ApiResponse);
      return;
    }

    // Check if code is expired
    if (pair.codeExpiresAt && isCodeExpired(pair.codeExpiresAt)) {
      console.log(`❌ Code expired: ${upperCode}`);

      // Delete expired pair
      await prisma.pair.delete({ where: { id: pair.id } });

      res.status(400).json({
        success: false,
        error: 'This code has expired. Please ask for a new code.',
      } as ApiResponse);
      return;
    }

    // Check if user is trying to pair with themselves
    if (pair.user1Id === userId) {
      console.log(`❌ User ${userId} trying to pair with themselves`);
      res.status(400).json({
        success: false,
        error: 'You cannot use your own invite code',
      } as ApiResponse);
      return;
    }

    // Get user2 info for the pairing
    const user2 = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user2) {
      console.log(`❌ User ${userId} not found`);
      res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    console.log(`✅ Pairing ${pair.user1.displayName} with ${user2.displayName}`);

    // ⚡ FIX: Delete any existing pairs where user2 is already a member
    // This prevents the unique constraint error on user2Id
    const existingPairs = await prisma.pair.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
    });

    if (existingPairs.length > 0) {
      console.log(`🧹 Cleaning up ${existingPairs.length} existing pair(s) for user ${userId}`);

      // Notify existing partners about disconnection
      for (const existingPair of existingPairs) {
        const existingPartnerId = existingPair.user1Id === userId
          ? existingPair.user2Id
          : existingPair.user1Id;

        if (existingPartnerId) {
          io.to(existingPartnerId).emit('partner_disconnected', {
            reason: 'partner_repaired',
            timestamp: new Date().toISOString(),
          });
          console.log(`📤 Notified ${existingPartnerId} about disconnection`);
        }
      }

      // Delete all existing pairs
      await prisma.pair.deleteMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
      });
      console.log(`✅ Existing pairs deleted`);
    }

    // Update pair with user2 - TRANSACTION for safety
    const updatedPair = await prisma.$transaction(async (tx: any) => {
      // Double-check the pair still exists and is valid
      const currentPair = await tx.pair.findUnique({
        where: { id: pair.id },
        include: { user1: true },
      });

      if (!currentPair || !currentPair.inviteCode || isCodeExpired(currentPair.codeExpiresAt!)) {
        throw new Error('Code is no longer valid');
      }

      // Update the pair
      return await tx.pair.update({
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
    });

    console.log(`✅ Pair created successfully: ${updatedPair.id}`);

    // Prepare user data for socket events
    const user1Data = {
      id: updatedPair.user1.id,
      displayName: updatedPair.user1.displayName,
      email: updatedPair.user1.email,
      photoUrl: updatedPair.user1.photoUrl,
    };

    const user2Data = {
      id: updatedPair.user2!.id,
      displayName: updatedPair.user2!.displayName,
      email: updatedPair.user2!.email,
      photoUrl: updatedPair.user2!.photoUrl,
    };

    // IMMEDIATELY emit socket events to both users with retry mechanism
    const emitWithRetry = async (targetClerkId: string, event: string, data: any, retries = 3) => {
      // ⚡ FIX: Users join room with clerkId, so we must emit to clerkId
      const userRoom = targetClerkId;

      for (let i = 0; i < retries; i++) {
        try {
          // Emit to user's room (primary method)
          io.to(userRoom).emit(event, data);
          console.log(`✅ Socket event '${event}' sent to room ${userRoom} (attempt ${i + 1})`);
          break;
        } catch (error) {
          console.error(`❌ Socket emit failed for ${targetClerkId} (attempt ${i + 1}):`, error);
          if (i === retries - 1) {
            console.error(`❌ Failed to emit to ${targetClerkId} after ${retries} attempts`);
          }
          // Wait 100ms before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    };

    // Emit to user1 (who generated code) - Use ClerkId!
    await emitWithRetry(updatedPair.user1.clerkId, 'partner_connected', {
      partnerId: user2.clerkId, // Send ClerkId as partnerId for consistency
      partner: user2Data,
      pairId: updatedPair.id,
      timestamp: new Date().toISOString(),
    });

    // Emit to user2 (who entered code) - Use ClerkId!  
    await emitWithRetry(user2.clerkId, 'partner_connected', {
      partnerId: updatedPair.user1.clerkId, // Send ClerkId as partnerId
      partner: user1Data,
      pairId: updatedPair.id,
      timestamp: new Date().toISOString(),
    });

    // Also emit pairing success event with full partner data
    await emitWithRetry(updatedPair.user1.clerkId, 'pairing_success', {
      partnerId: user2.clerkId,
      partner: user2Data,
      partnerName: user2Data.displayName,
      pairId: updatedPair.id,
    });

    await emitWithRetry(user2.clerkId, 'pairing_success', {
      partnerId: updatedPair.user1.clerkId,
      partner: user1Data,
      partnerName: user1Data.displayName,
      pairId: updatedPair.id,
    });

    console.log(`✅ All socket events emitted successfully for pair ${updatedPair.id}`);

    // Send FCM notifications as backup
    try {
      const FCMService = (await import('../services/FCMService')).default;

      // Get FCM tokens
      const user1Token = await prisma.user.findUnique({
        where: { id: pair.user1Id },
        select: { fcmToken: true },
      });

      const user2Token = await prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true },
      });

      // Send FCM notifications
      if (user1Token?.fcmToken) {
        await FCMService.sendPartnerConnectedNotification(
          user1Token.fcmToken,
          user2Data.displayName,
          updatedPair.id
        );
      }

      if (user2Token?.fcmToken) {
        await FCMService.sendPartnerConnectedNotification(
          user2Token.fcmToken,
          user1Data.displayName,
          updatedPair.id
        );
      }

      console.log(`✅ FCM notifications sent as backup`);
    } catch (fcmError) {
      console.error('⚠️ FCM notification failed (non-critical):', fcmError);
    }

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

    console.log(`✅ Pairing completed successfully for users ${pair.user1Id} and ${userId}`);

    res.json({
      success: true,
      data: {
        pair: pairResponse,
        partner: partnerResponse,
        message: `Successfully paired with ${partner.displayName}!`,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('❌ Join with code error:', error);

    // Provide specific error messages
    let errorMessage = 'Failed to join with code. Please try again.';

    if (error instanceof Error) {
      if (error.message.includes('Code is no longer valid')) {
        errorMessage = 'This code is no longer valid. Please ask for a new code.';
      } else if (error.message.includes('already paired')) {
        errorMessage = 'You are already paired with someone.';
      }
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
    } as ApiResponse);
  }
};

/**
 * Get current pair info
 */
export const getCurrentPair = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Find user's pair (exclude incomplete pairs with invite codes)
    const pair = await prisma.pair.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        inviteCode: null, // Only return completed pairs (no pending invite code)
      },
      include: {
        user1: true,
        user2: true,
      },
    });

    if (!pair) {
      res.json({
        success: true,
        data: null,
      } as ApiResponse);
      return;
    }

    // Check if it's a self-pairing (incomplete pair)
    if (pair.user1Id === pair.user2Id) {
      console.log(`⚠️ Incomplete pair detected for user ${userId}, returning null`);
      res.json({
        success: true,
        data: null,
      } as ApiResponse);
      return;
    }

    // Get partner info
    const partnerId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;
    const partner = pair.user1Id === userId ? pair.user2 : pair.user1;

    const partnerData = {
      id: partner.id,
      clerkId: partner.clerkId,
      displayName: partner.displayName,
      email: partner.email,
      photoUrl: partner.photoUrl,
      createdAt: partner.createdAt.toISOString(),
    };

    res.json({
      success: true,
      data: {
        pair: {
          id: pair.id,
          user1Id: pair.user1Id,
          user2Id: pair.user2Id,
          pairedAt: pair.pairedAt.toISOString(),
        },
        partner: partnerData,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Get current pair error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pair info',
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

    // Get partner info (need clerkId and FCM token for notifications)
    const partnerId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { clerkId: true, fcmToken: true, displayName: true },
    });

    // Delete pair (this will cascade delete moments)
    await prisma.pair.delete({
      where: { id: pair.id },
    });

    // ⚡ FIX: Emit socket event to partner using clerkId (that's what they join with)
    if (partner?.clerkId) {
      io.to(partner.clerkId).emit('partner_disconnected', {
        reason: 'Partner disconnected',
        userId: userId,
      });
      console.log(`✅ Disconnect event sent to partner via socket: ${partner.clerkId}`);
    }

    // 🔥 NEW: Send FCM notification as backup (socket may fail if partner is offline)
    if (partner?.fcmToken) {
      try {
        const FCMService = (await import('../services/FCMService')).default;
        await FCMService.sendNotification(
          partner.fcmToken,
          { type: 'partner_disconnected', reason: 'Partner disconnected' },
          { title: '💔 Partner Disconnected', body: 'Your partner has ended the connection' }
        );
        console.log(`✅ Disconnect notification sent via FCM`);
      } catch (fcmError) {
        console.log('⚠️ FCM disconnect notification failed (non-critical):', fcmError);
      }
    }

    console.log(`✅ Pair deleted: ${pair.id}`);

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
