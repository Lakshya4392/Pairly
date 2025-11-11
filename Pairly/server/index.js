/**
 * Pairly Backend Server
 * Minimal Socket.IO server for real-time photo transfer
 * Photos are NOT stored on server - only transferred between devices
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);

// CORS configuration
app.use(cors());
app.use(express.json());

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, specify your app's domain
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 10e6, // 10MB for photo transfer
});

// Database setup (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize database tables
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        display_name VARCHAR(255),
        push_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pairings (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        partner_id VARCHAR(255) REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, partner_id)
      );

      CREATE TABLE IF NOT EXISTS pairing_codes (
        code VARCHAR(10) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id),
        notifications_enabled BOOLEAN DEFAULT true,
        sound_enabled BOOLEAN DEFAULT true,
        vibration_enabled BOOLEAN DEFAULT true,
        partner_online_notifications BOOLEAN DEFAULT true,
        theme VARCHAR(50) DEFAULT 'light',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pairings_user_id ON pairings(user_id);
      CREATE INDEX IF NOT EXISTS idx_pairings_partner_id ON pairings(partner_id);
      CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires_at ON pairing_codes(expires_at);
    `);
    
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// Initialize database on startup
initializeDatabase();

// In-memory storage for active connections
const activeUsers = new Map(); // userId -> socketId

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    res.json({
      status: 'ok',
      activeUsers: activeUsers.size,
      totalUsers: parseInt(result.rows[0].count),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({
      status: 'ok',
      activeUsers: activeUsers.size,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get partner info
app.get('/api/partner/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT u.id, u.display_name, u.push_token
       FROM pairings p
       JOIN users u ON p.partner_id = u.id
       WHERE p.user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No partner found' });
    }

    const partner = result.rows[0];
    const isOnline = activeUsers.has(partner.id);

    res.json({
      id: partner.id,
      displayName: partner.display_name,
      isOnline,
    });
  } catch (error) {
    console.error('Get partner error:', error);
    res.status(500).json({ error: 'Failed to get partner info' });
  }
});

// Update user settings
app.post('/api/settings/:userId', async (req, res) => {
  const { userId } = req.params;
  const settings = req.body;

  try {
    await pool.query(
      `INSERT INTO user_settings (
        user_id, 
        notifications_enabled, 
        sound_enabled, 
        vibration_enabled, 
        partner_online_notifications,
        theme
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET
        notifications_enabled = $2,
        sound_enabled = $3,
        vibration_enabled = $4,
        partner_online_notifications = $5,
        theme = $6,
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        settings.notificationsEnabled ?? true,
        settings.soundEnabled ?? true,
        settings.vibrationEnabled ?? true,
        settings.partnerOnlineNotifications ?? true,
        settings.theme ?? 'light',
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get user settings
app.get('/api/settings/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default settings
      return res.json({
        notificationsEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        partnerOnlineNotifications: true,
        theme: 'light',
      });
    }

    const settings = result.rows[0];
    res.json({
      notificationsEnabled: settings.notifications_enabled,
      soundEnabled: settings.sound_enabled,
      vibrationEnabled: settings.vibration_enabled,
      partnerOnlineNotifications: settings.partner_online_notifications,
      theme: settings.theme,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update push token
app.post('/api/push-token/:userId', async (req, res) => {
  const { userId } = req.params;
  const { pushToken } = req.body;

  try {
    await pool.query(
      `UPDATE users SET push_token = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [pushToken, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update push token error:', error);
    res.status(500).json({ error: 'Failed to update push token' });
  }
});

// Generate pairing code
app.post('/api/pairing/generate', async (req, res) => {
  const { userId, displayName } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    // Ensure user exists
    await pool.query(
      `INSERT INTO users (id, display_name) 
       VALUES ($1, $2) 
       ON CONFLICT (id) DO UPDATE SET display_name = $2, updated_at = CURRENT_TIMESTAMP`,
      [userId, displayName || 'User']
    );

    // Generate 6-character code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Store code in database
    await pool.query(
      `INSERT INTO pairing_codes (code, user_id, expires_at) 
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET user_id = $2, expires_at = $3`,
      [code, userId, expiresAt]
    );

    console.log(`📝 Code generated: ${code} for user: ${userId}`);

    res.json({ code, expiresAt: expiresAt.getTime() });
  } catch (error) {
    console.error('Generate code error:', error);
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

// Join with code
app.post('/api/pairing/join', async (req, res) => {
  const { code, userId, displayName } = req.body;

  if (!code || !userId) {
    return res.status(400).json({ error: 'code and userId required' });
  }

  try {
    // Ensure user exists
    await pool.query(
      `INSERT INTO users (id, display_name) 
       VALUES ($1, $2) 
       ON CONFLICT (id) DO UPDATE SET display_name = $2, updated_at = CURRENT_TIMESTAMP`,
      [userId, displayName || 'User']
    );

    // Get code from database
    const codeResult = await pool.query(
      'SELECT user_id, expires_at FROM pairing_codes WHERE code = $1',
      [code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired code' });
    }

    const { user_id: partnerId, expires_at } = codeResult.rows[0];

    if (new Date(expires_at) < new Date()) {
      await pool.query('DELETE FROM pairing_codes WHERE code = $1', [code]);
      return res.status(410).json({ error: 'Code expired' });
    }

    // Create pairing (both directions)
    await pool.query(
      `INSERT INTO pairings (user_id, partner_id) 
       VALUES ($1, $2), ($2, $1)
       ON CONFLICT (user_id, partner_id) DO NOTHING`,
      [userId, partnerId]
    );

    // Delete used code
    await pool.query('DELETE FROM pairing_codes WHERE code = $1', [code]);

    // Get partner info
    const partnerResult = await pool.query(
      'SELECT display_name FROM users WHERE id = $1',
      [partnerId]
    );

    console.log(`💑 Pairing created: ${userId} <-> ${partnerId}`);

    // Notify both users if they're online
    const userSocket = activeUsers.get(userId);
    const partnerSocket = activeUsers.get(partnerId);

    if (userSocket) {
      io.to(userSocket).emit('pairing_complete', { 
        partnerId,
        partnerName: partnerResult.rows[0]?.display_name 
      });
    }

    if (partnerSocket) {
      const userResult = await pool.query(
        'SELECT display_name FROM users WHERE id = $1',
        [userId]
      );
      io.to(partnerSocket).emit('partner_connected', { 
        partnerId: userId,
        partnerName: userResult.rows[0]?.display_name 
      });
    }

    res.json({ 
      success: true, 
      partnerId,
      partnerName: partnerResult.rows[0]?.display_name 
    });
  } catch (error) {
    console.error('Join with code error:', error);
    res.status(500).json({ error: 'Failed to join with code' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // User joins with their ID
  socket.on('join', async ({ userId }) => {
    if (!userId) {
      console.warn('⚠️ Join attempt without userId');
      return;
    }

    // Store user connection
    activeUsers.set(userId, socket.id);
    socket.userId = userId;

    console.log(`👤 User joined: ${userId} (${socket.id})`);

    try {
      // Check if user has a partner in database
      const result = await pool.query(
        `SELECT u.id, u.display_name 
         FROM pairings p
         JOIN users u ON p.partner_id = u.id
         WHERE p.user_id = $1
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length > 0) {
        const partner = result.rows[0];
        const partnerSocketId = activeUsers.get(partner.id);
        
        // Notify partner that user is online
        if (partnerSocketId) {
          io.to(partnerSocketId).emit('partner_online', { 
            userId,
            userName: 'Your Partner' 
          });
        }

        socket.emit('partner_status', {
          partnerId: partner.id,
          partnerName: partner.display_name,
          isOnline: !!partnerSocketId,
        });
      }
    } catch (error) {
      console.error('Error checking partner:', error);
    }
  });

  // Send photo to partner
  socket.on('send_photo', (data) => {
    const { partnerId, photoId, photoData, timestamp, caption } = data;

    if (!partnerId || !photoData) {
      console.warn('⚠️ Invalid photo data');
      return;
    }

    console.log(`📤 Forwarding photo ${photoId} to partner ${partnerId}`);

    const partnerSocketId = activeUsers.get(partnerId);

    if (partnerSocketId) {
      // Partner is online - send immediately
      io.to(partnerSocketId).emit('receive_photo', {
        photoId,
        photoData,
        timestamp,
        caption,
        senderId: socket.userId,
      });

      console.log(`✅ Photo delivered to ${partnerId}`);

      // Confirm delivery to sender
      socket.emit('photo_delivered', {
        photoId,
        deliveredAt: Date.now(),
      });
    } else {
      // Partner is offline - notify sender
      console.log(`⚠️ Partner ${partnerId} is offline`);
      socket.emit('partner_offline', {
        photoId,
        message: 'Partner is offline. Photo will be delivered when they come online.',
      });

      // TODO: Store in offline queue (optional)
    }
  });

  // Photo received acknowledgment
  socket.on('photo_received', (data) => {
    const { photoId, receivedAt } = data;
    const partnerId = pairings.get(socket.userId);

    if (partnerId) {
      const partnerSocketId = activeUsers.get(partnerId);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('photo_acknowledged', {
          photoId,
          receivedAt,
        });
      }
    }
  });

  // Photo reaction
  socket.on('photo_reaction', (data) => {
    const { photoId, reaction, timestamp } = data;
    const partnerId = pairings.get(socket.userId);

    if (partnerId) {
      const partnerSocketId = activeUsers.get(partnerId);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('photo_reaction', {
          photoId,
          reaction,
          timestamp,
          senderId: socket.userId,
        });

        console.log(`❤️ Reaction sent: ${reaction} on photo ${photoId}`);
      }
    }
  });

  // Typing indicator (for future chat feature)
  socket.on('typing', () => {
    const partnerId = pairings.get(socket.userId);
    if (partnerId) {
      const partnerSocketId = activeUsers.get(partnerId);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('partner_typing');
      }
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log('🔌 Client disconnected:', socket.id);

    if (socket.userId) {
      // Remove from active users
      activeUsers.delete(socket.userId);

      try {
        // Notify partner
        const result = await pool.query(
          'SELECT partner_id FROM pairings WHERE user_id = $1 LIMIT 1',
          [socket.userId]
        );

        if (result.rows.length > 0) {
          const partnerId = result.rows[0].partner_id;
          const partnerSocketId = activeUsers.get(partnerId);
          
          if (partnerSocketId) {
            io.to(partnerSocketId).emit('partner_offline', {
              userId: socket.userId,
            });
          }
        }
      } catch (error) {
        console.error('Error on disconnect:', error);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`
  🚀 Pairly Server Running!
  
  📡 Socket.IO: http://localhost:${PORT}
  🏥 Health Check: http://localhost:${PORT}/health
  
  Ready to transfer photos! 📸❤️
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
