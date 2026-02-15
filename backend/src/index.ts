import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import ScheduledMomentService from './services/scheduledMomentService';
import FCMService from './services/FCMService';
import CloudinaryService from './services/CloudinaryService';

// Load environment variables
dotenv.config();

// Initialize Services
FCMService.initialize();
CloudinaryService.initialize();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with optimized settings for APK
// CORS origin configuration - allow app schemes and production domains
const getAllowedOrigins = () => {
  const origins = [
    'pairly://', // Mobile app deep link scheme
    'exp://',    // Expo development
  ];

  // Add production domains from environment
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(','));
  }

  // In development, allow all origins
  if (process.env.NODE_ENV !== 'production') {
    return '*';
  }

  return origins;
};

const io = new Server(httpServer, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // ⚡ APK OPTIMIZED: Polling first for reliability, then upgrade to WebSocket
  transports: ['polling', 'websocket'], // Polling first for APK reliability
  allowUpgrades: true, // Allow upgrade to WebSocket after connection
  upgradeTimeout: 30000, // 30s - More time for slow connections
  pingTimeout: 60000, // 60s - Keep alive during pairing (15min code validity)
  pingInterval: 25000, // 25s - Regular heartbeat
  maxHttpBufferSize: 5e6, // 5MB max message size (for photos)
  allowEIO3: true, // Support older clients
  perMessageDeflate: false, // Disable compression for speed
  connectTimeout: 60000, // 60s - Allow time for pairing process
  // Mobile app request validation
  allowRequest: (req, callback) => {
    // In development, allow all
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    // In production, validate origin
    const origin = req.headers.origin;
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins === '*' || (Array.isArray(allowedOrigins) && allowedOrigins.some(o => origin?.startsWith(o)))) {
      callback(null, true);
    } else {
      // Still allow for mobile apps without origin header
      callback(null, !origin || origin === 'null');
    }
  },
});

// Initialize Prisma Client with connection pooling
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection pool optimization
prisma.$connect().then(() => {
  console.log('✅ Database connected with connection pooling');
}).catch((error: any) => {
  console.error('❌ Database connection failed:', error);
});

// Middleware
// 🔒 TRUST PROXY: Required for Rate Limiting on Render/Heroku
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
import { securityHeaders, sanitizeRequest } from './middleware/security';
app.use(securityHeaders);
app.use(sanitizeRequest);

// 🔒 SECURE REQUEST LOGGING - Logs all API requests with sanitized data
import { requestLogger, errorLogger } from './middleware/requestLogger';
app.use(requestLogger);

// 🔥 DYNAMIC PHOTO SERVING - Serves photos from database when static file doesn't exist
import path from 'path';
import fs from 'fs';

app.get('/uploads/:filename', async (req, res) => {
  const { filename } = req.params;
  const staticPath = path.join(__dirname, '../public/uploads', filename);

  // 1. Try static file first (fast)
  if (fs.existsSync(staticPath)) {
    return res.sendFile(staticPath);
  }

  // 2. Fall back to database (for old photos without Cloudinary)
  try {
    const momentId = filename.replace('.jpg', '').replace('.png', '');
    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      select: { photoData: true },
    });

    if (moment?.photoData) {
      // Convert Buffer to image response
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      return res.send(Buffer.from(moment.photoData));
    }

    console.log(`⚠️ [UPLOADS] Photo not found: ${filename}`);
    return res.status(404).json({ error: 'Photo not found' });
  } catch (error) {
    console.error(`❌ [UPLOADS] Error serving photo ${filename}:`, error);
    return res.status(500).json({ error: 'Failed to serve photo' });
  }
});

// Serve static files from uploads directory (Exempt from Rate Limiting)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Rate limiting
import { generalLimiter, authLimiter, pairingLimiter, uploadLimiter, widgetLimiter } from './middleware/rateLimiter';
app.use(generalLimiter); // Apply general rate limit to all routes

// Import routes
import authRoutes from './routes/authRoutes';
import pairRoutes from './routes/pairRoutes';
import momentRoutes from './routes/momentRoutes';
import testRoutes from './routes/testRoutes';
import userRoutes from './routes/userRoutes';
import noteRoutes from './routes/noteRoutes';
import timeLockRoutes from './routes/timeLockRoutes';
import dualCameraRoutes from './routes/dualCameraRoutes';
import widgetRoutes from './routes/widgetRoutes';
// import inviteRoutes from './routes/inviteRoutes'; // DEPRECATED: RevenueCat is now source of truth
// import configRoutes from './routes/configRoutes'; // DEPRECATED
import reminderRoutes from './routes/reminderRoutes';
import pingRoutes from './routes/pingRoutes';
import meetingRoutes from './routes/meetingRoutes';

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Only log in development or for slow requests
    if (process.env.NODE_ENV !== 'production' || duration > 1000) {
      console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  // ⚡ LIGHTWEIGHT: No DB query here to allow Neon to sleep
  res.json({
    status: 'ok',
    message: 'Pairly API is running - v2.2 (Optimized)',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Keep-alive endpoint for external pinger (cron-job.org)
app.get('/keep-alive', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`🏓 External Keep-alive ping received at ${timestamp}`);

  res.json({
    status: 'alive',
    timestamp,
    uptime: process.uptime(),
    message: 'Backend is awake! (DB sleeping)'
  });
});

// API routes with specific rate limits
app.use('/auth', authLimiter, authRoutes); // Strict rate limit for auth
// app.use('/auth', authLimiter, inviteRoutes); // DEPRECATED
app.use('/pairs', pairingLimiter, pairRoutes); // Pairing rate limit
app.use('/moments', uploadLimiter, momentRoutes); // Moments rate limit (all operations)
app.use('/test', testRoutes);
app.use('/users', userRoutes);
app.use('/notes', noteRoutes);
app.use('/timelock', timeLockRoutes);
app.use('/dual-moments', uploadLimiter, dualCameraRoutes); // Upload rate limit
app.use('/widget', widgetLimiter, widgetRoutes); // 🔥 Widget-specific generous limit
// app.use('/invites', authLimiter, inviteRoutes); // DEPRECATED
// app.use('/config', configRoutes); // DEPRECATED
app.use('/reminders', reminderRoutes);
app.use('/ping', pingRoutes);
app.use('/meeting', meetingRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  let currentUserClerkId: string | null = null; // Clerk ID for socket rooms
  let currentUserDbId: string | null = null; // Database ID for queries

  // Join user's personal room
  socket.on('join_room', async (data: { userId: string }) => {
    try {
      currentUserClerkId = data.userId; // This is clerkId

      // Get database ID from clerkId
      const user = await prisma.user.findUnique({
        where: { clerkId: data.userId },
      });

      if (user) {
        currentUserDbId = user.id;
        socket.join(data.userId); // Join room with clerkId
        console.log(`✅ User ${user.displayName} (clerk: ${data.userId}, db: ${user.id}) joined room`);

        // Send acknowledgment
        socket.emit('room_joined', { userId: data.userId });

        // ✅ PUSH PENDING MOMENTS: Send queued moments to user
        try {
          const PendingMomentService = (await import('./services/pendingMomentService')).default;
          // Only push/delete from queue if we successfully query
          const pushedCount = await PendingMomentService.pushPendingMoments(user.id);

          if (pushedCount > 0) {
            console.log(`✅ Pushed ${pushedCount} pending moments to ${user.displayName}`);
          }
        } catch (error) {
          console.error('⚠️ Error pushing pending moments:', error);
          // Non-critical - don't break connection
        }

        // Notify partner that user is online
        const pair = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            pairAsUser1: {
              include: { user2: true },
            },
            pairAsUser2: {
              include: { user1: true },
            },
          },
        });

        if (pair?.pairAsUser1 || pair?.pairAsUser2) {
          const partner = pair.pairAsUser1 ? pair.pairAsUser1.user2 : pair.pairAsUser2?.user1;

          if (partner) {
            // Send presence update to partner
            io.to(partner.clerkId).emit('partner_presence', {
              userId: data.userId,
              isOnline: true,
              timestamp: new Date().toISOString(),
            });

            console.log(`🟢 User ${user.displayName} is now online (notified ${partner.displayName})`);
          }
        }
      } else {
        // This is expected if the user just signed up and hasn't synced yet
        console.warn(`⚠️ User not found for clerkId: ${data.userId} (Sync pending?)`);
      }
    } catch (error) {
      console.error('Error in join_room:', error);
    }
  });

  // Heartbeat to keep presence alive
  socket.on('heartbeat', async (data: { userId: string }) => {
    try {
      const pair = await prisma.pair.findFirst({
        where: {
          OR: [{ user1Id: data.userId }, { user2Id: data.userId }],
        },
      });

      if (pair) {
        const partnerId = pair.user1Id === data.userId ? pair.user2Id : pair.user1Id;

        // Send heartbeat to partner
        io.to(partnerId).emit('partner_heartbeat', {
          userId: data.userId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  });

  // ⚡ SIMPLE MVP: Photo upload now happens via REST API (/moments/upload)
  // Socket only used for lightweight notifications

  // Acknowledge moment received
  socket.on('moment_received', (data: { momentId: string }) => {
    console.log(`Moment ${data.momentId} received by client`);
  });

  // ⚡ NEW: Handle note send
  socket.on('send_note', async (data: {
    noteId: string;
    noteContent: string;
    partnerId: string;
    timestamp: number;
  }) => {
    try {
      console.log('💌 Received send_note event:', {
        from: currentUserClerkId,
        to: data.partnerId,
        noteId: data.noteId,
      });

      if (!currentUserDbId || !currentUserClerkId) {
        console.error('❌ No user ID - cannot send note');
        return;
      }

      // Get partner's database ID from clerkId
      const partnerUser = await prisma.user.findUnique({
        where: { clerkId: data.partnerId },
      });

      if (!partnerUser) {
        console.error(`❌ Partner not found for clerkId: ${data.partnerId}`);
        socket.emit('send_note_error', { error: 'Partner not found' });
        return;
      }

      // Verify pair
      const pair = await prisma.pair.findFirst({
        where: {
          OR: [
            { user1Id: currentUserDbId, user2Id: partnerUser.id },
            { user1Id: partnerUser.id, user2Id: currentUserDbId },
          ],
          inviteCode: null,
        },
        include: {
          user1: true,
          user2: true,
        },
      });

      if (!pair) {
        console.error(`❌ User ${currentUserClerkId} is NOT paired with ${data.partnerId}`);
        socket.emit('send_note_error', { error: 'Not paired with this user' });
        return;
      }

      const sender = pair.user1Id === currentUserDbId ? pair.user1 : pair.user2;
      const partner = pair.user1Id === currentUserDbId ? pair.user2 : pair.user1;

      console.log(`✅ Verified: ${sender.displayName} sending note to ${partner.displayName}`);

      // Check if partner is online
      const partnerSockets = await io.in(data.partnerId).fetchSockets();
      const isPartnerOnline = partnerSockets.length > 0;

      if (isPartnerOnline) {
        // Partner is online - send via Socket.IO
        console.log('🟢 Partner online - sending note via Socket.IO');
        io.to(data.partnerId).emit('receive_note', {
          noteId: data.noteId,
          noteContent: data.noteContent,
          timestamp: data.timestamp,
          senderName: sender.displayName,
          senderId: currentUserClerkId,
        });
      }

      // ⚡ IMPROVED: Always send FCM notification for notes
      if (partner.fcmToken) {
        await FCMService.sendNoteNotification(
          partner.fcmToken,
          data.noteContent,
          sender.displayName,
          data.noteId
        );
        console.log('✅ FCM note notification sent');
      }

      // Send confirmation to sender
      socket.emit('note_sent', {
        noteId: data.noteId,
        sentAt: new Date().toISOString(),
        deliveryMethod: isPartnerOnline ? 'socket' : 'fcm',
      });

    } catch (error) {
      console.error('Error handling send_note:', error);
      socket.emit('send_note_error', { error: 'Failed to send note' });
    }
  });

  // Handle moment received acknowledgment (send back to sender)
  socket.on('moment_received_ack', async (data: { momentId: string; receivedAt: string }) => {
    try {
      if (!currentUserDbId) return;

      // Find the moment to get sender info
      const moment = await prisma.moment.findUnique({
        where: { id: data.momentId },
        include: {
          pair: {
            include: {
              user1: true,
              user2: true,
            },
          },
        },
      });

      if (moment) {
        // Send acknowledgment to the sender
        const senderId = moment.uploaderId;
        const sender = moment.pair.user1Id === senderId ? moment.pair.user1 : moment.pair.user2;

        io.to(sender.clerkId).emit('moment_received_ack', {
          momentId: data.momentId,
          receivedAt: data.receivedAt,
        });

        console.log(`✅ Delivery receipt sent to ${sender.displayName}`);
      }
    } catch (error) {
      console.error('Error handling moment acknowledgment:', error);
    }
  });

  // Handle reconnection
  socket.on('reconnect', (attemptNumber: number) => {
    console.log(`Client reconnected after ${attemptNumber} attempts`);
  });

  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);

    // Notify partner that user is offline
    if (currentUserDbId && currentUserClerkId) {
      try {
        const pair = await prisma.pair.findFirst({
          where: {
            OR: [{ user1Id: currentUserDbId }, { user2Id: currentUserDbId }],
            inviteCode: null,
          },
          include: {
            user1: true,
            user2: true,
          },
        });

        if (pair) {
          const partner = pair.user1Id === currentUserDbId ? pair.user2 : pair.user1;

          // Send offline status to partner (using clerkId for socket room)
          io.to(partner.clerkId).emit('partner_presence', {
            userId: currentUserClerkId,
            isOnline: false,
            timestamp: new Date().toISOString(),
          });

          console.log(`⚫ User ${currentUserClerkId} is now offline (notified ${partner.clerkId})`);
        }
      } catch (error) {
        console.error('Error notifying partner offline:', error);
      }
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Export io for use in other modules
export { io };

// NOTE: Scheduled moments are processed in the 1-minute cron below
// Removed duplicate 5-minute cron to prevent multiple FCM sends

// ⏰ CRON JOB 2: Cleanup expired pending moments (every hour)
// Enabled for offline reliability
cron.schedule('0 * * * *', async () => {
  try {
    const PendingMomentService = (await import('./services/pendingMomentService')).default;
    const cleaned = await PendingMomentService.cleanupExpired();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired pending moments`);
    }
  } catch (error) {
    console.error('❌ Error in pending moment cleanup cron:', error);
  }
});

console.log('⏰ Cron: Pending moment cleanup (every hour) - Enabled');
// Note: Internal Keep-Alive cron removed to save Neon CPU. Use external pinger on /keep-alive instead.

// ⏰ CRON JOB 4: Process Scheduled Moments, Time-Locks & Reminders (every 15 minutes)
// ⚡ OPTIMIZED: Reduced from 1-minute to allow Neon DB to sleep
cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('⏰ [CRON] Processing scheduled moments (15-min check)...');
    const result = await ScheduledMomentService.processScheduledMoments();
    if (result.delivered > 0) {
      console.log(`✅ [CRON] Delivered ${result.delivered} scheduled items`);
    }

    // Process FCM reminders (Good Morning/Night)
    const ReminderService = (await import('./services/ReminderService')).default;
    await ReminderService.processReminders();
  } catch (error) {
    console.error('❌ Error in scheduled moments cron:', error);
  }
});

console.log('⏰ Cron: Scheduled Moments & Time-Locks (every 15 minutes)');

// Start server
const PORT = process.env.PORT || 3000;

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Pairly API server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌐 Accessible at: http://localhost:${PORT}`);
  console.log(`📱 Mobile access: http://[YOUR_IP]:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
