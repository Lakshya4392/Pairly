import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createTimeLock, getPendingMessages, deleteTimeLock } from '../controllers/timeLockController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create a time-lock message
router.post('/create', createTimeLock);

// Get pending time-lock messages
router.get('/pending', getPendingMessages);

// Delete a time-lock message
router.delete('/:messageId', deleteTimeLock);

export default router;
