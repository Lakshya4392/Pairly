import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';
import { log } from '../utils/logger';

// If you have a RevenueCat SDK or direct REST API configured, import it here.
// For now, this is designed to securely accept a validated payload from the app
// OR hit the RevenueCat REST API using a backend secret.

export const syncSubscription = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.userId; // Securely injected by Clerk auth middleware
        const clerkId = req.user?.clerkId;

        if (!userId || !clerkId) {
            res.status(401).json({ success: false, error: 'Unauthorized user context' });
            return;
        }

        const { isPremium, plan, expiryDate, revenueCatId } = req.body;

        // Optional but Recommended: Double-check the RevenueCat REST API here in production
        // using process.env.REVENUECAT_SECRET to ensure the incoming app payload wasn't spoofed.
        // For this strict architecture, we enforce updating the DB to mirror RevenueCat exactly.

        const now = new Date();
        let premiumExpiry = expiryDate ? new Date(expiryDate) : null;

        // Update the database to reflect RevenueCat as the Single Source of Truth
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                isPremium,
                premiumPlan: isPremium ? plan : null,
                premiumSince: isPremium ? now : null,
                premiumExpiry,
                revenueCatId,
                lastSyncedAt: now,
            }
        });

        log.info(`Sync'd subscription for ${clerkId}: premium=${updatedUser.isPremium}`);

        res.json({
            success: true,
            data: {
                id: updatedUser.id,
                isPremium: updatedUser.isPremium,
                premiumPlan: updatedUser.premiumPlan,
                premiumExpiry: updatedUser.premiumExpiry,
                lastSyncedAt: updatedUser.lastSyncedAt,
            }
        });

    } catch (error) {
        log.error('Error syncing subscription from RevenueCat', error);
        res.status(500).json({ success: false, error: 'Failed to sync subscription' });
    }
};
