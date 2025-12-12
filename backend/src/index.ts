import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import ScheduledMomentService from './services/scheduledMomentService';
import FCMService from './services/FCMService';

// Load environment variables
dotenv.config();

// Initialize FCM
FCMService.initialize();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with optimized settings for APK
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Configure properly in production
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
  // CORS headers for APK
  allowRequest: (req, callback) => {
    // Allow all origins for now (configure properly in production)
    callback(null, true);
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
}).catch((error) => {
  console.error('❌ Database connection failed:', error);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

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
import inviteRoutes from './routes/inviteRoutes';
import configRoutes from './routes/configRoutes';

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Pairly API is running - v2.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Keep-alive endpoint for cron jobs (prevents Render cold starts)
app.get('/keep-alive', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`🏓 Keep-alive ping received at ${timestamp}`);

  res.json({
    status: 'alive',
    timestamp,
    uptime: process.uptime(),
    message: 'Backend is awake and ready!'
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/auth', inviteRoutes); // ✅ Add invite routes to /auth for app compatibility
app.use('/pairs', pairRoutes);
app.use('/moments', momentRoutes);
app.use('/test', testRoutes);
app.use('/users', userRoutes);
app.use('/notes', noteRoutes);
app.use('/timelock', timeLockRoutes);
app.use('/dual-moments', dualCameraRoutes);
app.use('/widget', widgetRoutes);
app.use('/invites', inviteRoutes);
app.use('/config', configRoutes);

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
        // TODO: Enable after database migration
        // try {
        //   const PendingMomentService = (await import('./services/pendingMomentService')).default;
        //   const pushedCount = await PendingMomentService.pushPendingMoments(user.id);

        //   if (pushedCount > 0) {
        //     console.log(`✅ Pushed ${pushedCount} pending moments to ${user.displayName}`);
        //   }
        // } catch (error) {
        //   console.error('⚠️ Error pushing pending moments:', error);
        //   // Non-critical - don't break connection
        // }

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
        console.error(`❌ User not found for clerkId: ${data.userId}`);
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

// ⏰ CRON JOB 1: Process scheduled moments (every 5 minutes)
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await ScheduledMomentService.processScheduledMoments();
    // Only log if something was processed
    if (result && result.delivered > 0) {
      console.log(`✅ Processed ${result.delivered} scheduled moments`);
    }
  } catch (error) {
    console.error('❌ Error in scheduled moments cron:', error);
  }
});

console.log('⏰ Cron: Scheduled moments (every 5 minutes)');

// ⏰ CRON JOB 2: Cleanup expired pending moments (every hour)
// Disabled until database migration - will enable in production
cron.schedule('0 * * * *', async () => {
  try {
    // TODO: Enable after database migration to production
    // const PendingMomentService = (await import('./services/pendingMomentService')).default;
    // const cleaned = await PendingMomentService.cleanupExpired();
    // if (cleaned > 0) {
    //   console.log(`🧹 Cleaned up ${cleaned} expired pending moments`);
    // }
  } catch (error) {
    console.error('❌ Error in pending moment cleanup cron:', error);
  }
});

console.log('⏰ Cron: Pending moment cleanup (every hour) - Currently disabled');

// ⏰ CRON JOB 3: Keep-Alive Ping (every 10 minutes)
// Prevents Render free tier from sleeping after 15 minutes of inactivity
cron.schedule('*/10 * * * *', async () => {
  try {
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    console.log(`💓 Keep-Alive: Backend running for ${hours}h ${minutes}m`);
  } catch (error) {
    console.error('❌ Error in keep-alive cron:', error);
  }
});

console.log('⏰ Cron: Keep-Alive ping (every 10 minutes)');

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
