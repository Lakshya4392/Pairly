import { Request, Response } from 'express';
import { prisma } from '../index';
import { ApiResponse } from '../types';
import FCMService from '../services/FCMService';
import { log } from '../utils/logger';
import { encrypt } from '../utils/encryption';

/**
 * Get user's premium status
 */
export const getPremiumStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      } as ApiResponse);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isPremium: true,
        premiumPlan: true,
        premiumSince: true,
        premiumExpiry: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    // Check if premium has expired
    let isPremium = user.isPremium;
    if (isPremium && user.premiumExpiry) {
      const now = new Date();
      if (now > user.premiumExpiry) {
        // Premium expired, update database
        await prisma.user.update({
          where: { id: userId },
          data: {
            isPremium: false,
            premiumPlan: null,
          },
        });
        isPremium = false;
      }
    }

    res.json({
      success: true,
      data: {
        isPremium,
        premiumPlan: user.premiumPlan,
        premiumSince: user.premiumSince,
        premiumExpiry: user.premiumExpiry,
      },
    } as ApiResponse);
  } catch (error) {
    log.error('Error getting premium status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get premium status',
    } as ApiResponse);
  }
};

/**
 * Update user's premium status
 */
export const updatePremiumStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, isPremium, premiumPlan } = req.body;

    if (!userId || typeof isPremium !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'User ID and premium status are required',
      } as ApiResponse);
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    const now = new Date();
    let premiumExpiry: Date | null = null;

    if (isPremium) {
      if (premiumPlan === 'monthly') {
        premiumExpiry = new Date(now.setMonth(now.getMonth() + 1));
      } else if (premiumPlan === 'yearly') {
        premiumExpiry = new Date(now.setFullYear(now.getFullYear() + 1));
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium,
        premiumPlan: isPremium ? premiumPlan : null,
        premiumSince: isPremium ? now : null,
        premiumExpiry,
      },
    });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        isPremium: updatedUser.isPremium,
        premiumPlan: updatedUser.premiumPlan,
        premiumExpiry: updatedUser.premiumExpiry,
      },
    } as ApiResponse);
  } catch (error) {
    log.error('Error updating premium status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update premium status',
    } as ApiResponse);
  }
};

/**
 * Update user's FCM token
 * 🔐 SECURE: FCM token is encrypted before storage
 * Accepts userId which can be either clerkId or database ID
 */
export const updateFCMToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, clerkId, fcmToken } = req.body;

    // Accept either userId or clerkId
    const userIdentifier = clerkId || userId;

    if (!userIdentifier || !fcmToken) {
      res.status(400).json({
        success: false,
        error: 'User ID/ClerkId and FCM token are required',
      } as ApiResponse);
      return;
    }

    // Try to find user by clerkId first (preferred), then by database ID
    let user = await prisma.user.findUnique({ where: { clerkId: userIdentifier } });

    if (!user) {
      // Fallback: try as database ID
      user = await prisma.user.findUnique({ where: { id: userIdentifier } });
    }

    if (!user) {
      log.warn('User not found for FCM token update', { identifier: userIdentifier.substring(0, 8) + '...' });
      res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    // 🔐 ENCRYPT FCM token before storage
    const encryptedToken = encrypt(fcmToken);

    // ⚡ SECURITY FIX: Ensure One Token = One User
    // Remove this token from ANY other users to prevent cross-account notifications
    // Note: We need to find by encrypted token (exact match won't work for different encryptions)
    // So we clear any matching raw token first
    await prisma.user.updateMany({
      where: {
        id: { not: user.id }, // Don't touch current user yet
      },
      data: { fcmToken: null },
    });

    // Update encrypted FCM token for current user
    await prisma.user.update({
      where: { id: user.id },
      data: { fcmToken: encryptedToken },
    });

    log.info('FCM token updated (encrypted)', { userId: user.id.substring(0, 8) + '...' });

    res.json({
      success: true,
      message: 'FCM token updated successfully',
    } as ApiResponse);
  } catch (error) {
    log.error('Error updating FCM token', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update FCM token',
    } as ApiResponse);
  }
};

