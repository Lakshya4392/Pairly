import { Response } from 'express';
import sharp from 'sharp';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse, MomentResponse } from '../types';
import CloudinaryService from '../services/CloudinaryService';

/**
 * Upload photo moment
 */
export const uploadMoment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { momentId, messageId } = req.body;

    // ✅ DUPLICATE DETECTION: Check if moment already exists
    if (momentId) {
      const existingMoment = await prisma.moment.findUnique({
        where: { id: momentId },
      });

      if (existingMoment) {
        console.log('⚠️ Duplicate moment detected, sending ACK:', momentId);
        res.json({
          success: true,
          duplicate: true,
          message: 'Moment already received',
          momentId,
          receivedAt: existingMoment.uploadedAt.toISOString(),
        } as ApiResponse);
        return;
      }
    }

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
    const deletedMoments = await prisma.moment.findMany({
      where: { pairId: pair.id },
      select: { cloudinaryId: true },
    });

    // Delete from Cloudinary if configured
    if (deletedMoments.length > 0 && CloudinaryService.isConfigured()) {
      for (const m of deletedMoments) {
        if (m.cloudinaryId) {
          try {
            await CloudinaryService.deleteImage(m.cloudinaryId);
          } catch (cloudError) {
            console.log('⚠️ Cloudinary cleanup failed (non-critical):', cloudError);
          }
        }
      }
    }

    const deletedCount = await prisma.moment.deleteMany({
      where: { pairId: pair.id },
    });

    if (deletedCount.count > 0) {
      console.log(`🗑️ [UPLOAD] Deleted ${deletedCount.count} old moment(s) for pair`);
    }

    // ☁️ Upload to Cloudinary for fast widget access
    let cloudinaryUrl: string | null = null;
    let cloudinaryId: string | null = null;

    if (CloudinaryService.isConfigured()) {
      try {
        const uploadResult = await CloudinaryService.uploadImage(photoBuffer, {
          folder: 'pairly/moments',
          publicId: `moment_${pair.id}_${Date.now()}`,
        });

        if (uploadResult) {
          cloudinaryUrl = uploadResult.url;
          cloudinaryId = uploadResult.publicId;
          console.log(`☁️ [UPLOAD] Cloudinary upload successful: ${cloudinaryUrl}`);
        }
      } catch (cloudError) {
        console.log('⚠️ Cloudinary upload failed, using local fallback:', cloudError);
      }
    }

    // Create new moment
    const moment = await prisma.moment.create({
      data: {
        pairId: pair.id,
        uploaderId: userId,
        photoData: Buffer.from(photoBuffer),
        photoUrl: cloudinaryUrl,
        cloudinaryId: cloudinaryId,
      },
    });

    const photoSizeKB = (photoBuffer.length / 1024).toFixed(2);
    console.log(`✅ [UPLOAD] Moment created:`);
    console.log(`   📸 Moment ID: ${moment.id.substring(0, 8)}...`);
    console.log(`   👤 Uploader: ${user.displayName}`);
    console.log(`   📏 Photo size: ${photoSizeKB} KB`);
    console.log(`   ⏰ Uploaded at: ${moment.uploadedAt.toISOString()}`);

    // Save photo to disk for static serving (URL-based access for Widget/FCM)
    const fs = await import('fs');
    const path = await import('path');
    const uploadDir = path.join(__dirname, '../../public/uploads');

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    const fileName = `${moment.id}.jpg`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, photoBuffer);

    // Construct URL - FORCE HTTPS for Render (detects by hostname)
    const host = req.get('host') || '';
    const isRender = host.includes('onrender.com') || host.includes('render.com');
    const protocol = isRender ? 'https' : req.protocol;
    const baseUrl = process.env.API_URL || `${protocol}://${host}`;
    const photoUrl = `${baseUrl}/uploads/${fileName}`;

    console.log(`💾 [UPLOAD] Saved locally: ${fileName}`);
    console.log(`🔗 [UPLOAD] Generated URL: ${photoUrl}`);

    // Get partner ID - ONLY send to paired partner
    const partnerId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;
    const partnerInfo = pair.user1Id === userId ? pair.user2 : pair.user1;

    // Verify partner exists and is actually paired
    if (!partnerId || partnerId === userId) {
      console.error('❌ [UPLOAD] Invalid partner ID - cannot send moment');
      res.status(400).json({
        success: false,
        error: 'Invalid partner configuration',
      } as ApiResponse);
      return;
    }

    console.log(`📤 [UPLOAD] Sending notification to partner: ${partnerInfo.displayName} (${partnerId.substring(0, 8)}...)`);

    // Get partner info for notifications
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { fcmToken: true, clerkId: true },
    });

    // ⚡ SIMPLE MVP: Emit lightweight notification (NO photo data)
    // Prefer Cloudinary URL (CDN) over local URL for faster widget loading
    const finalPhotoUrl = cloudinaryUrl || photoUrl;

    const notificationPayload = {
      momentId: moment.id,
      timestamp: moment.uploadedAt.toISOString(),
      partnerName: user.displayName,
      photoUrl: finalPhotoUrl, // Cloudinary URL if available, else local
    };

    io.to(partnerId).emit('moment_available', notificationPayload);
    console.log(`🔔 [SOCKET] Emitted 'moment_available' to partner (payload: ${JSON.stringify(notificationPayload).length} bytes)`);

    // Send delivery confirmation to sender
    io.to(userId).emit('moment_sent_confirmation', {
      momentId: moment.id,
      sentAt: moment.uploadedAt.toISOString(),
      partnerName: pair.user1Id === userId ? pair.user2.displayName : pair.user1.displayName,
      deliveryMethod: 'socket',
    });
    console.log(`✅ [SOCKET] Sent confirmation to sender`);

    // Send FCM notification for instant widget update (even if app is closed)
    try {
      if (partner?.fcmToken) {
        console.log(`📲 [FCM] Sending push notification to partner...`);
        const FCMService = (await import('../services/FCMService')).default;
        // ⚡ MODIFIED: Send URL instead of Base64
        const fcmSent = await FCMService.sendNewPhotoNotification(
          partner.fcmToken,
          photoUrl,
          user.displayName || 'Your Partner',
          moment.id
        );

        if (fcmSent) {
          console.log('✅ [FCM] Push notification sent successfully');

          // Send FCM delivery confirmation to sender
          io.to(userId).emit('moment_delivered', {
            momentId: moment.id,
            deliveredAt: new Date().toISOString(),
            deliveryMethod: 'fcm',
          });
          console.log('✅ [FCM] Delivery confirmation sent to sender');
        } else {
          console.log('⚠️ [FCM] Push notification failed to send');
        }
      } else {
        console.log('⚠️ [FCM] Partner has no FCM token registered - skipping push notification');
      }
    } catch (fcmError) {
      console.log('⚠️ [FCM] Push notification error (non-critical):', fcmError);
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
 * Get all moments for memories screen
 * ⚡ SIMPLE: Returns all moments with metadata for gallery
 */
export const getAllMoments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const isApp = !userAgent.includes('okhttp') && !userAgent.includes('Dalvik');

    console.log(`📡 [GET ALL] Request from userId: ${userId.substring(0, 8)}... ${isApp ? '(APP)' : '(WIDGET)'}`);

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
      console.log(`⚠️ [GET ALL] No pairing found for user: ${userId.substring(0, 8)}...`);
      res.status(404).json({
        success: false,
        error: 'No active pairing found',
      } as ApiResponse);
      return;
    }

    // Get all moments for this pair (ordered by newest first)
    const moments = await prisma.moment.findMany({
      where: { pairId: pair.id },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploader: true,
      },
      take: 50, // Limit to last 50 moments for performance
    });

    if (moments.length === 0) {
      console.log(`📭 [GET ALL] No moments found for pair: ${pair.id.substring(0, 8)}...`);
      res.json({
        success: true,
        data: {
          moments: [],
          total: 0,
        },
      } as ApiResponse);
      return;
    }

    // Convert moments to response format
    const momentsData = moments.map(moment => {
      const photoBase64 = Buffer.from(moment.photoData).toString('base64');
      const partner = moment.uploaderId === pair.user1Id ? pair.user1 : pair.user2;
      const isFromMe = moment.uploaderId === userId;

      return {
        id: moment.id,
        photo: photoBase64,
        sender: isFromMe ? 'me' : 'partner',
        senderName: moment.uploader.displayName,
        partnerName: partner.displayName,
        timestamp: moment.uploadedAt.toISOString(),
        uploadedAt: moment.uploadedAt.toISOString(),
      };
    });

    const totalSizeKB = momentsData.reduce((total, moment) => total + (moment.photo.length / 1024), 0);

    console.log(`✅ [GET ALL] Found ${moments.length} moments:`);
    console.log(`   📏 Total size: ${totalSizeKB.toFixed(2)} KB`);
    console.log(`   📱 Requested by: ${isApp ? 'APP' : 'WIDGET'}`);

    res.json({
      success: true,
      data: {
        moments: momentsData,
        total: moments.length,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('❌ [GET ALL] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moments',
    } as ApiResponse);
  }
};

/**
 * Get latest moment from partner
 * ⚡ SIMPLE: Used by widget polling and app gallery
 */
export const getLatestMoment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const isWidget = userAgent.includes('okhttp') || userAgent.includes('Dalvik'); // Android widget uses OkHttp

    console.log(`📡 [GET LATEST] Request from userId: ${userId.substring(0, 8)}... ${isWidget ? '(WIDGET)' : '(APP)'}`);

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
      console.log(`⚠️ [GET LATEST] No pairing found for user: ${userId.substring(0, 8)}...`);
      res.status(404).json({
        success: false,
        error: 'No active pairing found',
      } as ApiResponse);
      return;
    }

    // 🎯 CRITICAL FIX: Only get moments FROM partner (not sent by current user)
    // Widget should only show photos received from partner, not sent by user
    const moment = await prisma.moment.findFirst({
      where: {
        pairId: pair.id,
        uploaderId: { not: userId } // Only moments NOT uploaded by current user
      },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploader: true,
      },
    });

    if (!moment) {
      console.log(`📭 [GET LATEST] No moment from partner found for pair: ${pair.id.substring(0, 8)}...`);
      res.status(404).json({
        success: false,
        error: 'No moment from partner found',
      } as ApiResponse);
      return;
    }

    // Convert photo to base64
    const photoBase64 = Buffer.from(moment.photoData).toString('base64');
    const photoSizeKB = (photoBase64.length / 1024).toFixed(2);

    // Get partner info (uploader is always the partner since we filtered by NOT userId)
    const partner = moment.uploader;
    const isReceiver = true; // Always true since we only get partner's moments

    console.log(`✅ [GET LATEST] Moment found:`);
    console.log(`   📸 Moment ID: ${moment.id.substring(0, 8)}...`);
    console.log(`   👤 Uploader: ${moment.uploader.displayName}`);
    console.log(`   ❤️ Partner: ${partner.displayName}`);
    console.log(`   📏 Photo size: ${photoSizeKB} KB`);
    console.log(`   ⏰ Uploaded: ${moment.uploadedAt.toISOString()}`);
    console.log(`   ${isReceiver ? '📥 User is RECEIVER' : '📤 User is SENDER'}`);
    console.log(`   ${isWidget ? '📱 Fetched by WIDGET' : '📲 Fetched by APP'}`);

    // Check if file exists on disk
    const fs = await import('fs');
    const path = await import('path');
    const fileName = `${moment.id}.jpg`;
    const filePath = path.join(__dirname, '../../public/uploads', fileName);

    let photoResponse: any = {
      partnerName: partner.displayName,
      sentAt: moment.uploadedAt.toISOString(),
    };

    if (fs.existsSync(filePath)) {
      // Return URL if file exists
      const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
      photoResponse.photoUrl = `${baseUrl}/uploads/${fileName}`;
      // Also return base64 for fallback (or if client expects it)
      // But for "Get Latest", lightweight URL is better.
      // However, existing client might expect 'photo' as base64. 
      // For now, let's keep sending base64 to not break existing clients, BUT also send URL.
      const fileBuffer = fs.readFileSync(filePath);
      photoResponse.photo = fileBuffer.toString('base64');
    } else {
      // Fallback to DB blob if file not found
      photoResponse.photo = Buffer.from(moment.photoData).toString('base64');
    }

    res.json({
      success: true,
      data: photoResponse,
    } as ApiResponse);
  } catch (error) {
    console.error('❌ [GET LATEST] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moment',
    } as ApiResponse);
  }
};
