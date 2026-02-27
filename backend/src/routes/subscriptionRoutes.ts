import { Router } from 'express';
import { syncSubscription } from '../controllers/subscriptionController';
import { authenticate as auth } from '../middleware/auth';

const router = Router();

// Sync RevenueCat subscription status securely
router.post('/sync', auth, syncSubscription);

export default router;
