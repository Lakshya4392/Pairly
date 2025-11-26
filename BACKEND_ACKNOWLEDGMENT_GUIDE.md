# 🔧 Backend Acknowledgment Implementation Guide

## ⚠️ CRITICAL: Backend Update Required

Client-side par humne acknowledgment callbacks add kar diye hain. Ab **Backend (Node.js) ko bhi update karna MANDATORY hai**, warna client 5 seconds wait karke timeout error throw karega.

---

## 📋 Backend Changes Required

### ❌ OLD CODE (Without Acknowledgment):
```javascript
// Backend - OLD (Will cause timeout on client)
socket.on('join_room', (data) => {
  const { userId } = data;
  socket.join(userId);
  console.log(`User ${userId} joined room`);
  
  // ❌ NO CALLBACK - Client will timeout!
  socket.emit('room_joined', { userId });
});
```

### ✅ NEW CODE (With Acknowledgment):
```javascript
// Backend - NEW (Proper acknowledgment)
socket.on('join_room', (data, callback) => {
  try {
    const { userId } = data;
    socket.join(userId);
    console.log(`User ${userId} joined room`);
    
    // ✅ Send acknowledgment to client
    if (callback && typeof callback === 'function') {
      callback({ success: true, userId });
    }
    
    // Also emit room_joined event for other listeners
    socket.emit('room_joined', { userId });
  } catch (error) {
    console.error('Error joining room:', error);
    
    // ✅ Send error acknowledgment
    if (callback && typeof callback === 'function') {
      callback({ success: false, error: error.message });
    }
  }
});
```

---

## 🎯 All Events That Need Acknowledgment

Update these events in your backend:

### 1. join_room
```javascript
socket.on('join_room', (data, callback) => {
  try {
    socket.join(data.userId);
    callback({ success: true });
  } catch (error) {
    callback({ success: false, error: error.message });
  }
});
```

### 2. send_photo
```javascript
socket.on('send_photo', async (data, callback) => {
  try {
    const { recipientId, photoBase64, senderName } = data;
    
    // Save photo to database
    await savePhotoToDatabase(data);
    
    // Send to recipient
    io.to(recipientId).emit('receive_photo', {
      photoBase64,
      senderName,
      senderId: socket.userId,
      timestamp: Date.now()
    });
    
    // ✅ Acknowledge success
    callback({ success: true, delivered: true });
  } catch (error) {
    console.error('Error sending photo:', error);
    callback({ success: false, error: error.message });
  }
});
```

### 3. send_moment
```javascript
socket.on('send_moment', async (data, callback) => {
  try {
    const { recipientId, momentData } = data;
    
    // Save moment
    const savedMoment = await saveMomentToDatabase(momentData);
    
    // Send to recipient
    io.to(recipientId).emit('new_moment', savedMoment);
    
    // ✅ Acknowledge
    callback({ success: true, momentId: savedMoment.id });
  } catch (error) {
    callback({ success: false, error: error.message });
  }
});
```

### 4. pairing_request
```javascript
socket.on('pairing_request', async (data, callback) => {
  try {
    const { code, userId } = data;
    
    // Process pairing
    const pairing = await processPairingCode(code, userId);
    
    if (pairing.success) {
      // Notify both users
      io.to(pairing.partnerId).emit('partner_connected', {
        partnerId: userId,
        partnerName: pairing.userName
      });
      
      callback({ success: true, partner: pairing.partner });
    } else {
      callback({ success: false, error: 'Invalid code' });
    }
  } catch (error) {
    callback({ success: false, error: error.message });
  }
});
```

### 5. heartbeat (Optional - can be fire-and-forget)
```javascript
socket.on('heartbeat', (data, callback) => {
  // Update last seen
  updateUserPresence(data.userId);
  
  // Optional acknowledgment
  if (callback) {
    callback({ success: true, timestamp: Date.now() });
  }
});
```

---

## 🔥 Non-Critical Events (Fire and Forget)

These events DON'T need acknowledgment (client uses `emitFireAndForget`):

```javascript
// No callback needed for these
socket.on('typing', (data) => {
  socket.to(data.recipientId).emit('partner_typing', data);
});

socket.on('presence_update', (data) => {
  socket.to(data.recipientId).emit('partner_presence', data);
});
```

---

## 📊 Response Format

### Success Response:
```javascript
callback({
  success: true,
  // Optional: additional data
  data: { ... },
  timestamp: Date.now()
});
```

### Error Response:
```javascript
callback({
  success: false,
  error: 'Error message here',
  code: 'ERROR_CODE' // Optional error code
});
```

---

## 🧪 Testing Backend Acknowledgments

### Test with Socket.IO Client:
```javascript
// Test script
const io = require('socket.io-client');
const socket = io('http://localhost:3000', {
  auth: { token: 'your-test-token' }
});

socket.emit('join_room', { userId: 'test123' }, (response) => {
  console.log('Acknowledgment received:', response);
  // Should log: { success: true, userId: 'test123' }
});
```

---

## ⏱️ Timeout Handling

Client waits **5 seconds** for acknowledgment. Backend should respond within **3 seconds** to be safe.

```javascript
socket.on('some_event', async (data, callback) => {
  // Set timeout to ensure response within 3 seconds
  const timeout = setTimeout(() => {
    callback({ success: false, error: 'Processing timeout' });
  }, 3000);
  
  try {
    const result = await processData(data);
    clearTimeout(timeout);
    callback({ success: true, result });
  } catch (error) {
    clearTimeout(timeout);
    callback({ success: false, error: error.message });
  }
});
```

---

## 🚀 Migration Checklist

- [ ] Update `join_room` event with callback
- [ ] Update `send_photo` event with callback
- [ ] Update `send_moment` event with callback
- [ ] Update `pairing_request` event with callback
- [ ] Test all acknowledgments with client
- [ ] Monitor timeout errors in logs
- [ ] Deploy backend changes BEFORE mobile app update

---

## 📝 Example: Complete Backend Socket Handler

```javascript
// server.js or socket-handler.js
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Authenticate
  const token = socket.handshake.auth.token;
  if (!token) {
    socket.disconnect();
    return;
  }
  
  const userId = verifyToken(token);
  socket.userId = userId;
  
  // Join room with acknowledgment
  socket.on('join_room', (data, callback) => {
    try {
      socket.join(data.userId);
      console.log(`User ${data.userId} joined room`);
      callback({ success: true });
      socket.emit('room_joined', { userId: data.userId });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });
  
  // Send photo with acknowledgment
  socket.on('send_photo', async (data, callback) => {
    try {
      const { recipientId, photoBase64, senderName } = data;
      
      // Send to recipient
      io.to(recipientId).emit('receive_photo', {
        photoBase64,
        senderName,
        senderId: socket.userId,
        timestamp: Date.now()
      });
      
      callback({ success: true, delivered: true });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });
  
  // Heartbeat (optional acknowledgment)
  socket.on('heartbeat', (data, callback) => {
    updateUserPresence(data.userId);
    if (callback) callback({ success: true });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

---

**Status:** 🔴 Backend Update Required
**Priority:** HIGH - Deploy before mobile app update
**Estimated Time:** 30-60 minutes
