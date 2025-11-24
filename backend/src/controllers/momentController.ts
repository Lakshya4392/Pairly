import { Response } from 'express';
import sharp from 'sharp';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse, MomentResponse } from '../types';

/**
 * Upload photo moment
 */
export const uploadMoment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Get user to check premium status and daily limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    // Check daily limit for free users
    if (!user.isPremium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Reset counter if new day
      if (!user.lastMomentDate || user.lastMomentDate < today) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            dailyMomentsCount: 0,
            lastMomentDate: new Date(),
          },
        });
        user.dailyMomentsCount = 0;
      }

      // Check limit (3 moments per day for free users)
      if (user.dailyMomentsCount >= 3) {
        res.status(403).json({
          success: false,
          error: 'Daily limit reached',
          message: 'Upgrade to Premium for unlimited moments 💕',
          upgradeRequired: true,
          currentCount: user.dailyMomentsCount,
          limit: 3,
        } as ApiResponse);
        return;
      }

      // Increment counter
      await prisma.user.update({
        where: { id: userId },
        data: {
          dailyMomentsCount: user.dailyMomentsCount + 1,
        },
      });

      console.log(`📊 User ${userId} daily moments: ${user.dailyMomentsCount + 1}/3`);
    }

    // Check if user is paired
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
      res.status(400).json({
        success: false,
        error: 'User is not paired',
      } as ApiResponse);
      return;
    }

    // Get photo from request
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        error: 'No photo provided',
      } as ApiResponse);
      return;
    }

    // Compress image using Sharp
    let photoBuffer: Buffer;
    try {
      photoBuffer = await sharp(file.buffer)
        .resize(1080, 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Check size
      if (photoBuffer.length > 500 * 1024) {
        // Compress more if still too large
        photoBuffer = await sharp(file.buffer)
          .resize(1080, 1920, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 70 })
          .toBuffer();
      }
    } catch (sharpError) {
      console.error('Image compression error:', sharpError);
      res.status(400).json({
        success: false,
        error: 'Failed to process image',
      } as ApiResponse);
      return;
    }

    // Delete previous moment for this pair (ephemeral nature)
    await prisma.moment.deleteMany({
      where: { pairId: pair.id },
    });

    // Create new moment
    const moment = await prisma.moment.create({
      data: {
        pairId: pair.id,
        uploaderId: userId,
        photoData: Buffer.from(photoBuffer),
      },
    });

    // Get partner ID - ONLY send to paired partner
    const partnerId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;
    
    // Verify partner exists and is actually paired
    if (!partnerId || partnerId === userId) {
      console.error('❌ Invalid partner ID - cannot send moment');
      res.status(400).json({
        success: false,
        error: 'Invalid partner configuration',
      } as ApiResponse);
      return;
    }

    console.log(`📤 Sending moment from ${userId} to paired partner ${partnerId}`);

    // Get partner info for notifications
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { fcmToken: true, clerkId: true },
    });

    // Emit Socket.IO event ONLY to the paired partner
    io.to(partnerId).emit('new_moment', {
      momentId: moment.id,
      uploadedBy: userId,
      uploadedAt: moment.uploadedAt.toISOString(),
      photoBase64: photoBuffer.toString('base64'),
      partnerName: user.displayName,
    });

    // Send delivery confirmation to sender
    io.to(userId).emit('moment_sent_confirmation', {
      momentId: moment.id,
      sentAt: moment.uploadedAt.toISOString(),
      partnerName: pair.user1Id === userId ? pair.user2.displayName : pair.user1.displayName,
      deliveryMethod: 'socket',
    });

    // Send FCM notification for instant widget update (even if app is closed)
    try {
      if (partner?.fcmToken) {
        const FCMService = (await import('../services/FCMService')).default;
        const fcmSent = await FCMService.sendNewPhotoNotification(
          partner.fcmToken,
          photoBuffer.toString('base64'),
          user.displayName || 'Your Partner',
          moment.id
        );
        
        if (fcmSent) {
          console.log('✅ FCM notification sent to partner');
          
          // Send FCM delivery confirmation to sender
          io.to(userId).emit('moment_delivered', {
            momentId: moment.id,
            deliveredAt: new Date().toISOString(),
            deliveryMethod: 'fcm',
          });
        }
      } else {
        console.log('⚠️ Partner has no FCM token registered');
      }
    } catch (fcmError) {
      console.log('⚠️ FCM notification failed (non-critical):', fcmError);
    }

    // Return response
    const momentResponse: MomentResponse = {
      id: moment.id,
      pairId: moment.pairId,
      uploaderId: moment.uploaderId,
      uploadedAt: moment.uploadedAt.toISOString(),
    };

    res.json({
      success: true,
      data: {
        moment: momentResponse,
        uploadedAt: moment.uploadedAt.toISOString(),
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Upload moment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload moment',
    } as ApiResponse);
  }
};

/**
 * Get latest moment from partner
 */
export const getLatestMoment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Find user's pair
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
        error: 'No active pairing found',
      } as ApiResponse);
      return;
    }

    // Get latest moment for this pair
    const moment = await prisma.moment.findFirst({
      where: { pairId: pair.id },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploader: true,
      },
    });

    if (!moment) {
      res.status(404).json({
        success: false,
        error: 'No moment found',
      } as ApiResponse);
      return;
    }

    // Convert photo to base64
    const photoBase64 = Buffer.from(moment.photoData).toString('base64');

    // Get partner info
    const partner = moment.uploaderId === pair.user1Id ? pair.user1 : pair.user2;

    res.json({
      success: true,
      data: {
        photo: photoBase64,
        partnerName: partner.displayName,
        sentAt: moment.uploadedAt.toISOString(),
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Get latest moment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moment',
    } as ApiResponse);
  }
};
