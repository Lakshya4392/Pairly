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

    // Get user and pair information in a single query
    const userWithPair = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        pairAsUser1: true,
        pairAsUser2: true,
      },
    });

    if (!userWithPair) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const pair = userWithPair.pairAsUser1 || userWithPair.pairAsUser2;

    if (!pair) {
      return res.status(400).json({ success: false, error: 'User is not paired' });
    }

    // Check daily limit for free users
    if (!userWithPair.isPremium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!userWithPair.lastMomentDate || userWithPair.lastMomentDate < today) {
        userWithPair.dailyMomentsCount = 0;
        await prisma.user.update({
          where: { id: userId },
          data: { dailyMomentsCount: 0, lastMomentDate: new Date() },
        });
      }

      if (userWithPair.dailyMomentsCount >= 3) {
        return res.status(403).json({
          success: false,
          error: 'Daily limit reached',
          message: 'Upgrade to Premium for unlimited moments 💕',
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { dailyMomentsCount: userWithPair.dailyMomentsCount + 1 },
      });
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
    const photoBuffer = await sharp(file.buffer)
      .resize(1080, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    // Get partner ID
    const partnerId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;

    if (!partnerId) {
      return res.status(400).json({ success: false, error: 'Partner not found' });
    }

    // Emit Socket.IO event immediately
    io.to(partnerId).emit('new_moment', {
      uploadedBy: userId,
      photoBase64: photoBuffer.toString('base64'),
      partnerName: userWithPair.displayName,
    });

    // Perform database operations in the background
    (async () => {
      try {
        await prisma.moment.deleteMany({ where: { pairId: pair.id } });
        await prisma.moment.create({
          data: {
            pairId: pair.id,
            uploaderId: userId,
            photoData: photoBuffer,
          },
        });
      } catch (dbError) {
        console.error('Error saving moment to DB:', dbError);
      }
    })();

    res.status(202).json({
      success: true,
      data: {
        message: 'Moment sent successfully',
      },
    });
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
