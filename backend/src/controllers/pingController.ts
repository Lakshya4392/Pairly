import { Request, Response } from 'express';
import { prisma } from '../index';
import { ApiResponse } from '../types';
import FCMService from '../services/FCMService';
import { log } from '../utils/logger';

const FREE_PING_LIMIT = 20;

/**
 * Send a "Thinking of You" ping to partner
 */
export const sendPing = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;

        // Get user and their pair
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                pairAsUser1: { include: { user2: true } },
                pairAsUser2: { include: { user1: true } },
            },
        });

        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        // Get partner - if pairAsUser1, partner is user2, else user1
        let partner: any = null;
        if (user.pairAsUser1) {
            partner = user.pairAsUser1.user2;
        } else if (user.pairAsUser2) {
            partner = user.pairAsUser2.user1;
        }

        if (!partner) {
            res.status(400).json({ success: false, error: 'Not paired with anyone' });
            return;
        }

        // Check rate limit (reset if new day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let currentCount = user.dailyPingCount || 0;
        const lastPingDate = user.lastPingDate ? new Date(user.lastPingDate) : null;

        if (!lastPingDate || lastPingDate < today) {
            // New day, reset counter
            currentCount = 0;
        }

        // Check limit for free users
        if (!user.isPremium && currentCount >= FREE_PING_LIMIT) {
            res.status(429).json({
                success: false,
                error: 'Daily ping limit reached',
                remaining: 0,
                isPremium: false,
            });
            return;
        }

        // Update ping count
        await prisma.user.update({
            where: { id: userId },
            data: {
                dailyPingCount: currentCount + 1,
                lastPingDate: new Date(),
            },
        });

        // Send FCM to partner
        if (partner.fcmToken) {
            await FCMService.sendNotification(
                partner.fcmToken,
                {
                    type: 'thinking_ping',
                    senderName: user.displayName,
                    senderId: user.id,
                },
                {
                    title: '💭 Thinking of You',
                    body: `${user.displayName} is thinking of you right now 💕`,
                }
            );
            log.info('Ping sent', { from: user.id.substring(0, 8), to: partner.id.substring(0, 8) });
        }

        const remaining = user.isPremium ? 'unlimited' : FREE_PING_LIMIT - currentCount - 1;

        res.json({
            success: true,
            message: 'Ping sent!',
            remaining,
            isPremium: user.isPremium,
        } as ApiResponse);
    } catch (error) {
        log.error('Error sending ping', error);
        res.status(500).json({ success: false, error: 'Failed to send ping' });
    }
};

/**
 * Get ping status (remaining count)
 */
export const getPingStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                dailyPingCount: true,
                lastPingDate: true,
                isPremium: true,
            },
        });

        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        // Check if new day
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let currentCount = user.dailyPingCount || 0;
        const lastPingDate = user.lastPingDate ? new Date(user.lastPingDate) : null;

        if (!lastPingDate || lastPingDate < today) {
            currentCount = 0;
        }

        const remaining = user.isPremium ? 'unlimited' : FREE_PING_LIMIT - currentCount;

        res.json({
            success: true,
            data: {
                sent: currentCount,
                remaining,
                limit: user.isPremium ? 'unlimited' : FREE_PING_LIMIT,
                isPremium: user.isPremium,
            },
        } as ApiResponse);
    } catch (error) {
        log.error('Error getting ping status', error);
        res.status(500).json({ success: false, error: 'Failed to get status' });
    }
};
