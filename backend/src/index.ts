import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Configure properly in production
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Pairly API is running' });
});

// API routes
app.use('/auth', authRoutes);
app.use('/pairs', pairRoutes);
app.use('/moments', momentRoutes);
app.use('/test', testRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join user's personal room
  socket.on('join_room', (data: { userId: string }) => {
    socket.join(data.userId);
    console.log(`User ${data.userId} joined their room`);
    
    // Send acknowledgment
    socket.emit('room_joined', { userId: data.userId });
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
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Export io for use in other modules
export { io };

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
