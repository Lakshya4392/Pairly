import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import cron from 'node-cron';
import ScheduledMomentService from './services/scheduledMomentService';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
    methods: ['GET', 'POST'],
  },
});

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  res.json({ status: 'ok', message: 'Pairly API is running' });
});

// API routes
app.use('/auth', authRoutes);
app.use('/pairs', pairRoutes);
app.use('/moments', momentRoutes);
app.use('/test', testRoutes);
app.use('/users', userRoutes);
app.use('/notes', noteRoutes);
app.use('/timelock', timeLockRoutes);
app.use('/dual-moments', dualCameraRoutes);
app.use('/widget', widgetRoutes);

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    (socket as any).user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  const currentUserId = (socket as any).user.id;
  console.log('Client connected:', socket.id, 'User:', currentUserId);

  socket.join(currentUserId);

  // Notify partner that user is online
  try {
    const pair = await prisma.pair.findFirst({
      where: {
        OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
      },
    });

    if (pair) {
      const partnerId = pair.user1Id === currentUserId ? pair.user2Id : pair.user1Id;
      io.to(partnerId).emit('partner_presence', {
        userId: currentUserId,
        isOnline: true,
        timestamp: new Date().toISOString(),
      });
      console.log(`🟢 User ${currentUserId} is now online (notified ${partnerId})`);
    }
  } catch (error) {
    console.error('Error notifying partner presence:', error);
  }

  // Heartbeat to keep presence alive
  socket.on('heartbeat', async () => {
    try {
      const pair = await prisma.pair.findFirst({
        where: {
          OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
        },
      });

      if (pair) {
        const partnerId = pair.user1Id === currentUserId ? pair.user2Id : pair.user1Id;
        io.to(partnerId).emit('partner_heartbeat', {
          userId: currentUserId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  });

  // Handle photo send - VERIFY partner before sending
  socket.on('send_photo', async (data: { 
    photoId: string; 
    photoData: string; 
    timestamp: number; 
    caption?: string; 
    partnerId: string;
  }) => {
    try {
      const pair = await prisma.pair.findFirst({
        where: {
          OR: [
            { user1Id: currentUserId, user2Id: data.partnerId },
            { user1Id: data.partnerId, user2Id: currentUserId },
          ],
        },
        include: {
          user1: true,
          user2: true,
        },
      });

      if (!pair) {
        console.error(`❌ User ${currentUserId} is NOT paired with ${data.partnerId} - blocking photo send`);
        socket.emit('send_photo_error', {
          error: 'Not paired with this user',
        });
        return;
      }

      const sender = pair.user1Id === currentUserId ? pair.user1 : pair.user2;

      console.log(`✅ Verified: ${currentUserId} is paired with ${data.partnerId}`);
      console.log(`📤 Sending photo from ${sender.displayName} to partner`);

      io.to(data.partnerId).emit('receive_photo', {
        photoId: data.photoId,
        photoData: data.photoData,
        timestamp: data.timestamp,
        caption: data.caption,
        senderName: sender.displayName,
        senderId: currentUserId,
      });

      socket.emit('photo_sent', {
        photoId: data.photoId,
        sentAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error handling send_photo:', error);
      socket.emit('send_photo_error', {
        error: 'Failed to send photo',
      });
    }
  });

  // Acknowledge moment received
  socket.on('moment_received', (data: { momentId: string }) => {
    console.log(`Moment ${data.momentId} received by client`);
  });

  // Handle reconnection
  socket.on('reconnect', (attemptNumber: number) => {
    console.log(`Client reconnected after ${attemptNumber} attempts`);
  });

  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);

    try {
      const pair = await prisma.pair.findFirst({
        where: {
          OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
        },
      });

      if (pair) {
        const partnerId = pair.user1Id === currentUserId ? pair.user2Id : pair.user1Id;
        io.to(partnerId).emit('partner_presence', {
          userId: currentUserId,
          isOnline: false,
          timestamp: new Date().toISOString(),
        });
        console.log(`⚫ User ${currentUserId} is now offline (notified ${partnerId})`);
      }
    } catch (error) {
      console.error('Error notifying partner offline:', error);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Export io for use in other modules
export { io };

// Setup cron job for scheduled moments (runs every minute)
cron.schedule('* * * * *', async () => {
  try {
    await ScheduledMomentService.processScheduledMoments();
  } catch (error) {
    console.error('Error in scheduled moments cron:', error);
  }
});

console.log('⏰ Scheduled moments cron job started (runs every minute)');

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
