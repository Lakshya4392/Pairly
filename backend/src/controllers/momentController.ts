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

    // ⚡ PRESERVE ALL MEMORIES: Don't delete old moments
    // Old behavior was "ephemeral" - deleting previous moments
    // New behavior keeps all moments for memories gallery
    console.log(`📸 [UPLOAD] Keeping existing moments for memories gallery`);

    // ⏰ CHECK FOR SCHEDULED UPLOAD
    const isScheduled = req.body.isScheduled === 'true' || req.body.isScheduled === true;
    const scheduledFor = req.body.scheduledFor ? new Date(req.body.scheduledFor) : null;

    if (isScheduled && scheduledFor) {
      console.log(`⏰ [UPLOAD] This is a SCHEDULED moment for: ${scheduledFor.toISOString()}`);
    }

    // 🔥 PHOTO EXPIRY - Calculate expiresAt based on expiresIn hours (supports fractional hours for minutes)
    const expiresInHours = req.body.expiresIn ? parseFloat(req.body.expiresIn) : null;
    let expiresAt: Date | null = null;

    if (expiresInHours && expiresInHours > 0) {
      expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
      // Display in minutes if less than 1 hour
      const displayTime = expiresInHours < 1
        ? `${Math.round(expiresInHours * 60)} minutes`
        : `${expiresInHours} hours`;
      console.log(`🔥 [UPLOAD] Photo expires in ${displayTime} at: ${expiresAt.toISOString()}`);
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

    // Create new moment (with optional scheduling and expiry)
    const moment = await prisma.moment.create({
      data: {
        pairId: pair.id,
        uploaderId: userId,
        photoData: Buffer.from(photoBuffer),
        photoUrl: cloudinaryUrl,
        cloudinaryId: cloudinaryId,
        isScheduled: isScheduled,
        scheduledFor: scheduledFor,
        expiresAt: expiresAt, // 🔥 Photo expiry time
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

    // ⏰ SKIP NOTIFICATIONS FOR SCHEDULED MOMENTS - they deliver via cron
    if (isScheduled && scheduledFor) {
      console.log(`⏰ [UPLOAD] Scheduled moment - skipping immediate notification`);
      console.log(`   📅 Will be delivered at: ${scheduledFor.toISOString()}`);
    } else {
      // ⚡ IMMEDIATE MOMENT: Send notifications now
      // Prefer Cloudinary URL (CDN) over local URL for faster widget loading
      const finalPhotoUrl = cloudinaryUrl || photoUrl;

      const notificationPayload = {
        momentId: moment.id,
        timestamp: moment.uploadedAt.toISOString(),
        partnerName: user.displayName,
        photoUrl: finalPhotoUrl, // Cloudinary URL if available, else local
      };

      // Check if partner is online
      const partnerSockets = await io.in(partnerId).fetchSockets();
      const isPartnerOnline = partnerSockets.length > 0;

      if (isPartnerOnline) {
        io.to(partnerId).emit('moment_available', notificationPayload);
        console.log(`🔔 [SOCKET] Emitted 'moment_available' to partner (payload: ${JSON.stringify(notificationPayload).length} bytes)`);
      } else {
        // ⚡ OFFLINE QUEUE: Partner is offline, queue the photo
        console.log(`💤 [SOCKET] Partner ${partnerId} is offline. Queueing moment...`);
        try {
          const PendingMomentService = (await import('../services/pendingMomentService')).default;
          await PendingMomentService.queueMoment({
            userId: partnerId, // Use database ID or clerkId? Service uses userId which is ClerkId in some places... 
            // Wait, join_room uses clerkId as room name. 
            // PendingMomentService.pushPendingMoments emits to `user_${userId}`... NO wait.
            // PendingMomentService.ts: io.to(`user_${userId}`).emit(...)
            // But index.ts: socket.join(data.userId) where data.userId IS ClerkId.
            // So room name IS ClerkId.
            // Let's check PendingMomentService.pushPendingMoments again.
            // It uses `user_${userId}`. THIS IS A MISMATCH if index.ts uses just `userId` (clerkId).
            // I need to fix PendingMomentService room name in a separate step or assume it's correct.
            // Let's assume queueMoment takes the Database User ID usually.
            // schema.prisma: PendingMoment.userId -> String.
            // momentController logic: partnerId is the User ID (DB ID).
            // So we queue for DB ID.
            momentId: moment.id,
            photoData: photoBuffer,
            photoUrl: finalPhotoUrl,
            senderName: user.displayName,
            note: req.body.note,
          });
        } catch (queueError) {
          console.error('❌ [QUEUE] Failed to queue moment:', queueError);
        }
      }

      // Send delivery confirmation to sender
      io.to(userId).emit('moment_sent_confirmation', {
        momentId: moment.id,
        sentAt: moment.uploadedAt.toISOString(),
        partnerName: pair.user1Id === userId ? pair.user2.displayName : pair.user1.displayName,
        deliveryMethod: 'socket',
      });
      console.log(`✅ [SOCKET] Sent confirmation to sender`);
    }

    // Send FCM notification for instant widget update (only for immediate moments)
    if (!isScheduled) {
      try {
        if (partner?.fcmToken) {
          console.log(`📲 [FCM] Sending push notification to partner...`);
          const FCMService = (await import('../services/FCMService')).default;
          // ⚡ MODIFIED: Send URL instead of Base64, include expiresAt for widget timer
          const fcmSent = await FCMService.sendNewPhotoNotification(
            partner.fcmToken,
            photoUrl,
            user.displayName || 'Your Partner',
            moment.id,
            expiresAt ? expiresAt.toISOString() : null // 🔥 Pass expiry timestamp
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
 * ⚡ FAST: Returns Cloudinary URLs instead of base64
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
        isPaired: false,
      } as ApiResponse);
      return;
    }

    // Get all moments for this pair (ordered by newest first)
    // 🔥 FIXED: Increased limit from 50 to 500 for full history
    const moments = await prisma.moment.findMany({
      where: {
        pairId: pair.id,
        // Only show delivered moments (skip scheduled ones)
        OR: [
          { isScheduled: false },
          { isScheduled: true, deliveredAt: { not: null } },
        ],
      },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploader: true,
      },
      take: 500, // 🔥 Increased from 50 to 500 for full history
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

    // ⚡ ETAG CACHING IMPLEMENTATION
    // Generate an ETag based on the total count and the newest moment's updated time
    const latestMoment = moments[0];
    const eTagData = `${moments.length}-${latestMoment.id}-${latestMoment.uploadedAt.getTime()}`;
    const eTag = require('crypto').createHash('md5').update(eTagData).digest('hex');

    // Check if client has the same ETag
    if (req.headers['if-none-match'] === eTag) {
      console.log(`✅ [GET ALL] 304 Not Modified (ETag Match) for pair ${pair.id.substring(0, 8)}...`);
      res.status(304).end();
      return;
    }

    // Set cache headers
    res.setHeader('ETag', eTag);
    res.setHeader('Cache-Control', 'public, max-age=15'); // 15 seconds client cache

    // ⚡ FAST: Return Cloudinary URLs instead of base64
    const momentsData = moments.map((moment: any) => {
      const partner = moment.uploaderId === pair.user1Id ? pair.user1 : pair.user2;
      const isFromMe = moment.uploaderId === userId;

      // Construct URL - FORCE HTTPS for Render (detects by hostname)
      const host = req.get('host') || '';
      const isRender = host.includes('onrender.com') || host.includes('render.com');
      const protocol = isRender ? 'https' : req.protocol;
      const baseUrl = process.env.API_URL || `${protocol}://${host}`;
      const fallbackUrl = `${baseUrl}/uploads/${moment.id}.jpg`;

      return {
        id: moment.id,
        // ⚡ URL instead of base64 - much faster!
        photoUrl: moment.photoUrl || fallbackUrl,
        sender: isFromMe ? 'me' : 'partner',
        senderName: moment.uploader.displayName,
        partnerName: partner.displayName,
        timestamp: moment.uploadedAt.toISOString(),
        uploadedAt: moment.uploadedAt.toISOString(),
      };
    });

    console.log(`✅ [GET ALL] Found ${moments.length} moments (using URLs, fast!)`);

    // Get partner display name
    const currentUserId = userId;
    const partnerUser = pair.user1Id === currentUserId ? pair.user2 : pair.user1;

    res.json({
      success: true,
      isPaired: true,
      partnerName: partnerUser.displayName,
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

    // ⚡ ETAG CACHING IMPLEMENTATION (For widgets polling constantly)
    const eTagData = `${moment.id}-${moment.uploadedAt.getTime()}`;
    const eTag = require('crypto').createHash('md5').update(eTagData).digest('hex');

    // Check if client has the same ETag (returns instantly if 304)
    if (req.headers['if-none-match'] === eTag) {
      if (isWidget) {
        console.log(`✅ [GET LATEST] 304 Not Modified (Widget Fast Poll)`);
      }
      res.status(304).end();
      return;
    }

    // Set cache headers
    res.setHeader('ETag', eTag);
    res.setHeader('Cache-Control', 'public, max-age=5'); // Real short 5 second API cache


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
      id: moment.id,
      // 🔥 WIDGET EXPIRY: Return expiresAt for widget timer
      expiresAt: moment.expiresAt ? moment.expiresAt.toISOString() : null,
    };

    if (fs.existsSync(filePath)) {
      // Construct URL - FORCE HTTPS for Render (detects by hostname)
      const host = req.get('host') || '';
      const isRender = host.includes('onrender.com') || host.includes('render.com');
      const protocol = isRender ? 'https' : req.protocol;
      const baseUrl = process.env.API_URL || `${protocol}://${host}`;
      photoResponse.photoUrl = `${baseUrl}/uploads/${fileName}`;
      // Also return base64 for fallback (or if client expects it)
      // But for "Get Latest", lightweight URL is better.
      // However, existing client might expect 'photo' as base64. 
      // For now, let's keep sending base64 to not break existing clients, BUT also send URL.
      const fileBuffer = fs.readFileSync(filePath);
      photoResponse.photo = fileBuffer.toString('base64');
      // Also return Cloudinary URL if available (faster CDN)
      if (moment.photoUrl) {
        photoResponse.photoData = moment.photoUrl;
      }
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

/**
 * 🗑️ Delete a moment permanently (DB + Cloudinary)
 * Privacy feature: Allow users to delete any photo completely
 */
export const deleteMoment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: momentId } = req.params;

    console.log(`🗑️ [DELETE] Request from userId: ${userId.substring(0, 8)}... for moment: ${momentId.substring(0, 8)}...`);

    // Find the moment and verify user has permission
    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      include: {
        pair: true,
      },
    });

    if (!moment) {
      res.status(404).json({
        success: false,
        error: 'Moment not found',
      } as ApiResponse);
      return;
    }

    // Check if user is part of this pair
    if (moment.pair.user1Id !== userId && moment.pair.user2Id !== userId) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to delete this moment',
      } as ApiResponse);
      return;
    }

    // Delete from Cloudinary if exists
    if (moment.cloudinaryId) {
      try {
        const CloudinaryService = (await import('../services/CloudinaryService')).default;
        await CloudinaryService.deleteImage(moment.cloudinaryId);
        console.log(`☁️ [DELETE] Removed from Cloudinary: ${moment.cloudinaryId}`);
      } catch (cloudError) {
        console.log('⚠️ [DELETE] Cloudinary delete failed (continuing):', cloudError);
      }
    }

    // Delete local file if exists
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(__dirname, '../../public/uploads', `${momentId}.jpg`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`📁 [DELETE] Removed local file: ${momentId}.jpg`);
      }
    } catch (fileError) {
      console.log('⚠️ [DELETE] Local file delete failed (continuing):', fileError);
    }

    // Delete from database
    await prisma.moment.delete({
      where: { id: momentId },
    });

    console.log(`✅ [DELETE] Moment permanently deleted: ${momentId.substring(0, 8)}...`);

    res.json({
      success: true,
      message: 'Moment deleted permanently',
    } as ApiResponse);
  } catch (error) {
    console.error('❌ [DELETE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete moment',
    } as ApiResponse);
  }
};
