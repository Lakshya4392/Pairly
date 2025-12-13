import { Router } from 'express';
import { getPremiumStatus, updatePremiumStatus, updateFCMToken } from '../controllers/userController';
import { authenticate as auth } from '../middleware/auth';

const router = Router();

// Get user's premium status
router.get('/:userId/premium', auth, getPremiumStatus);

// Update user's premium status
router.put('/premium', auth, updatePremiumStatus);

// Update user's FCM token (requires auth to prevent hijacking)
router.post('/fcm-token', auth, updateFCMToken);

export default router;
