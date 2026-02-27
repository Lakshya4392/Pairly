import { Router } from 'express';
import { handleRevenueCatWebhook } from '../controllers/webhookController';

const router = Router();

// POST /webhooks/revenuecat
// 🔒 SECURE: This endpoint should be protected by a shared secret set in RevenueCat dashboard
router.post('/revenuecat', handleRevenueCatWebhook);

export default router;
