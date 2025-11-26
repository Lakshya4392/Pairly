# 🛡️ Backend De-duplication Implementation

## Why This Matters

Client ab har message ke saath unique `messageId` bhejta hai. Backend ko bhi de-duplication implement karni chahiye to prevent:
- ❌ Duplicate photos in database
- ❌ Double notifications
- ❌ Wasted storage
- ❌ Confused users

---

## 🔧 Implementation

### Simple In-Memory Solution (Small Apps)

```javascript
// server.js or socket-handler.js
const processedMessageIds = new Set();
const MAX_PROCESSED_IDS = 10000;

// Clean old IDs periodically (every hour)
setInterval(() => {
  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    const idsArray = Array.from(processedMessageIds);
    const toKeep = idsArray.slice(-MAX_PROCESSED_IDS);
    processedMessageIds.clear();
    toKeep.forEach(id => processedMessageIds.add(id));
    console.log('🧹 Cleaned old message IDs');
  }
}, 3600000);

io.on('connection', (socket) => {
  // Send photo with de-duplication
  socket.on('send_photo', async (data, callback) => {
    const { messageId, recipientId, photoBase64, senderName } = data;
    
    // Check if already processed
    if (processedMessageIds.has(messageId)) {
      console.log('🛡️ Duplicate request detected:', messageId);
      callback({ 
        success: true, 
        cached: true,
        message: 'Already processed' 
      });
      return;
    }
    
    try {
      // Process photo
      const photoUrl = await savePhotoToStorage(photoBase64);
      await savePhotoToDatabase({
        senderId: socket.userId,
        recipientId,
        photoUrl,
        messageId // Save messageId in DB
      });
      
      // Send to recipient
      io.to(recipientId).emit('receive_photo', {
        photoBase64,
        senderName,
        senderId: socket.userId,
        messageId, // Include messageId
        timestamp: Date.now()
      });
      
      // Mark as processed
      processedMessageIds.add(messageId);
      
      callback({ success: true, photoUrl });
    } catch (error) {
      console.error('Error sending photo:', error);
      callback({ success: false, error: error.message });
    }
  });
  
  // Send moment with de-duplication
  socket.on('send_moment', async (data, callback) => {
    const { messageId, recipientId, momentData } = data;
    
    if (processedMessageIds.has(messageId)) {
      console.log('🛡️ Duplicate moment detected:', messageId);
      callback({ success: true, cached: true });
      return;
    }
    
    try {
      const savedMoment = await saveMomentToDatabase({
        ...momentData,
        messageId
      });
      
      io.to(recipientId).emit('new_moment', {
        ...savedMoment,
        messageId
      });
      
      processedMessageIds.add(messageId);
      callback({ success: true, momentId: savedMoment.id });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });
});
```

---

### Redis Solution (Production/Large Scale)

```javascript
// redis-deduplication.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

class DeduplicationService {
  constructor() {
    this.prefix = 'msg:';
    this.ttl = 86400; // 24 hours
  }
  
  async isProcessed(messageId) {
    const exists = await redis.exists(this.prefix + messageId);
    return exists === 1;
  }
  
  async markProcessed(messageId, data = {}) {
    await redis.setex(
      this.prefix + messageId,
      this.ttl,
      JSON.stringify(data)
    );
  }
  
  async getProcessedData(messageId) {
    const data = await redis.get(this.prefix + messageId);
    return data ? JSON.parse(data) : null;
  }
}

module.exports = new DeduplicationService();
```

```javascript
// server.js
const DeduplicationService = require('./redis-deduplication');

io.on('connection', (socket) => {
  socket.on('send_photo', async (data, callback) => {
    const { messageId, recipientId, photoBase64, senderName } = data;
    
    // Check Redis
    if (await DeduplicationService.isProcessed(messageId)) {
      console.log('🛡️ Duplicate request (Redis):', messageId);
      const cachedData = await DeduplicationService.getProcessedData(messageId);
      callback({ success: true, cached: true, ...cachedData });
      return;
    }
    
    try {
      // Process photo
      const photoUrl = await savePhotoToStorage(photoBase64);
      await savePhotoToDatabase({
        senderId: socket.userId,
        recipientId,
        photoUrl,
        messageId
      });
      
      // Send to recipient
      io.to(recipientId).emit('receive_photo', {
        photoBase64,
        senderName,
        senderId: socket.userId,
        messageId,
        timestamp: Date.now()
      });
      
      // Mark as processed in Redis
      await DeduplicationService.markProcessed(messageId, { photoUrl });
      
      callback({ success: true, photoUrl });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });
});
```

---

### Database Solution (Persistent)

```javascript
// models/ProcessedMessage.js
const mongoose = require('mongoose');

const processedMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true },
  userId: { type: String, required: true },
  processedAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24h
});

module.exports = mongoose.model('ProcessedMessage', processedMessageSchema);
```

```javascript
// server.js
const ProcessedMessage = require('./models/ProcessedMessage');

io.on('connection', (socket) => {
  socket.on('send_photo', async (data, callback) => {
    const { messageId, recipientId, photoBase64, senderName } = data;
    
    // Check database
    const existing = await ProcessedMessage.findOne({ messageId });
    if (existing) {
      console.log('🛡️ Duplicate request (DB):', messageId);
      callback({ success: true, cached: true });
      return;
    }
    
    try {
      // Process photo
      const photoUrl = await savePhotoToStorage(photoBase64);
      await savePhotoToDatabase({
        senderId: socket.userId,
        recipientId,
        photoUrl,
        messageId
      });
      
      // Send to recipient
      io.to(recipientId).emit('receive_photo', {
        photoBase64,
        senderName,
        senderId: socket.userId,
        messageId,
        timestamp: Date.now()
      });
      
      // Mark as processed in DB
      await ProcessedMessage.create({
        messageId,
        eventType: 'send_photo',
        userId: socket.userId
      });
      
      callback({ success: true, photoUrl });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });
});
```

---

## 🎯 Which Solution to Use?

### In-Memory (Set):
- ✅ Simple & fast
- ✅ No external dependencies
- ❌ Lost on server restart
- ❌ Not shared across multiple servers
- **Use for:** Small apps, single server

### Redis:
- ✅ Fast (sub-millisecond)
- ✅ Shared across servers
- ✅ TTL support (auto-cleanup)
- ❌ Requires Redis server
- **Use for:** Production apps, multiple servers

### Database (MongoDB/PostgreSQL):
- ✅ Persistent
- ✅ Shared across servers
- ✅ Can query history
- ❌ Slower than Redis
- **Use for:** Apps needing audit trail

---

## 📊 Performance Comparison

| Solution | Speed | Scalability | Persistence | Complexity |
|----------|-------|-------------|-------------|------------|
| In-Memory | ⚡⚡⚡ | ⭐ | ❌ | Easy |
| Redis | ⚡⚡⚡ | ⭐⭐⭐ | ✅ | Medium |
| Database | ⚡⚡ | ⭐⭐⭐ | ✅ | Medium |

---

## 🧪 Testing

```javascript
// Test script
const io = require('socket.io-client');
const socket = io('http://localhost:3000', {
  auth: { token: 'test-token' }
});

const messageId = 'test_' + Date.now();

// Send first time
socket.emit('send_photo', {
  messageId,
  recipientId: 'user123',
  photoBase64: 'base64data...',
  senderName: 'Test User'
}, (response) => {
  console.log('First send:', response);
  // Should log: { success: true, photoUrl: '...' }
});

// Send again (duplicate)
setTimeout(() => {
  socket.emit('send_photo', {
    messageId, // Same ID
    recipientId: 'user123',
    photoBase64: 'base64data...',
    senderName: 'Test User'
  }, (response) => {
    console.log('Duplicate send:', response);
    // Should log: { success: true, cached: true }
  });
}, 1000);
```

---

## ✅ Implementation Checklist

- [ ] Choose de-duplication strategy (In-Memory/Redis/DB)
- [ ] Accept `messageId` in all events
- [ ] Check if messageId already processed
- [ ] Return cached response for duplicates
- [ ] Include messageId in emitted events
- [ ] Add cleanup logic (TTL or periodic)
- [ ] Test with duplicate requests
- [ ] Monitor duplicate rate in logs
- [ ] Deploy to production

---

**Recommendation:** Start with **In-Memory** for MVP, migrate to **Redis** for production scale.
