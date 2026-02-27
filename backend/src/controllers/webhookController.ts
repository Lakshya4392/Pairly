import { Request, Response } from 'express';
import { prisma } from '../index';
import userService from '../services/userService';
import { log } from '../utils/logger';

/**
 * Handle RevenueCat Webhook events
 * 📄 Reference: https://www.revenuecat.com/docs/webhooks
 */
export const handleRevenueCatWebhook = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

        // 🔒 Verify authorization if secret is set
        if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
            log.warn('⚠️ Unauthorized RevenueCat webhook attempt');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const body = req.body;
        const event = body.event;

        if (!event) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        const { type, app_user_id, expiration_at_ms, product_id } = event;

        log.info(`📩 RevenueCat Webhook received: ${type} for user: ${app_user_id}`);

        // We only care about events that affect premium status
        const premiumEvents = [
            'INITIAL_PURCHASE',
            'RENEWAL',
            'CANCELLATION',
            'UNCANCELLATION',
            'EXPIRATION',
            'BILLING_ISSUE',
            'TRANSFER'
        ];

        if (premiumEvents.includes(type)) {
            const isPremium = ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION'].includes(type);
            const expiryDate = expiration_at_ms ? new Date(expiration_at_ms).toISOString() : null;

            // Map RevenueCat products to our plan types
            const plan = (product_id?.toLowerCase().includes('year') || product_id?.toLowerCase().includes('annual'))
                ? 'yearly'
                : 'monthly';

            // Identify user: in our app, app_user_id IS the clerkId
            await userService.updatePremiumStatus(app_user_id, isPremium, plan as any, expiryDate);

            log.info(`✅ Premium status synced via Webhook for user ${app_user_id} (Status: ${isPremium})`);
        }

        // Always return 200 to RevenueCat
        res.status(200).json({ success: true });
    } catch (error) {
        log.error('❌ Error processing RevenueCat webhook:', error);
        // Still return 200 to avoid RevenueCat retrying indefinitely if it's a permanent logic error
        res.status(200).json({ success: false, error: 'Internal error' });
    }
};
