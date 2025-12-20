import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendPing, getPingStatus } from '../controllers/pingController';

const router = Router();

// Send a ping to partner
router.post('/send', authenticate, sendPing);

// Get ping status (remaining count)
router.get('/status', authenticate, getPingStatus);

export default router;
