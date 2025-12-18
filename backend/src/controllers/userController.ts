import { Request, Response } from 'express';
import { prisma } from '../index';
import { ApiResponse } from '../types';
import FCMService from '../services/FCMService';

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
    console.error('Error getting premium status:', error);
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
    console.error('Error updating premium status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update premium status',
    } as ApiResponse);
  }
};

/**
 * Update user's FCM token
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
      console.log(`⚠️ User not found for identifier: ${userIdentifier}`);
      res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    // ⚡ SECURITY FIX: Ensure One Token = One User
    // Remove this token from ANY other users to prevent cross-account notifications
    await prisma.user.updateMany({
      where: {
        fcmToken: fcmToken,
        id: { not: user.id }, // Don't touch current user yet
      },
      data: { fcmToken: null },
    });

    // Update FCM token for current user
    await prisma.user.update({
      where: { id: user.id },
      data: { fcmToken },
    });

    console.log(`✅ FCM token updated for user ${user.displayName} (${user.id})`);

    res.json({
      success: true,
      message: 'FCM token updated successfully',
    } as ApiResponse);
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update FCM token',
    } as ApiResponse);
  }
};
