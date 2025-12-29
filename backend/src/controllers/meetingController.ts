import { Request, Response } from 'express';
import { prisma, io } from '../index';
import FCMService from '../services/FCMService';

interface AuthRequest extends Request {
    userId?: string;
}

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Set meeting countdown for pair
 * Both partners will see the same countdown
 */
export const setMeetingCountdown = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const { meetingDate } = req.body;

        if (!meetingDate) {
            res.status(400).json({
                success: false,
                error: 'Meeting date is required',
            } as ApiResponse);
            return;
        }

        const date = new Date(meetingDate);
        if (date <= new Date()) {
            res.status(400).json({
                success: false,
                error: 'Meeting date must be in the future',
            } as ApiResponse);
            return;
        }

        // Find user's pair
        const pair = await prisma.pair.findFirst({
            where: {
                OR: [{ user1Id: userId }, { user2Id: userId }],
            },
            include: {
                user1: { select: { id: true, displayName: true, clerkId: true, fcmToken: true } },
                user2: { select: { id: true, displayName: true, clerkId: true, fcmToken: true } },
            },
        });

        if (!pair) {
            res.status(404).json({
                success: false,
                error: 'No active pairing found',
            } as ApiResponse);
            return;
        }

        // Update pair with meeting date
        await prisma.pair.update({
            where: { id: pair.id },
            data: { meetingDate: date } as any,
        });
        console.log('✅ Meeting date saved to database');

        // Determine current user and partner
        const currentUser = pair.user1Id === userId ? pair.user1 : pair.user2;
        const partner = pair.user1Id === userId ? pair.user2 : pair.user1;

        // Notify partner via Socket
        if (partner.clerkId) {
            io.to(partner.clerkId).emit('meeting_countdown_set', {
                meetingDate: date.toISOString(),
                setBy: currentUser.displayName,
            });
            console.log(`✅ Meeting countdown sent to partner via socket: ${partner.clerkId}`);
        }

        // Notify partner via FCM
        if (partner.fcmToken) {
            try {
                const formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                });

                await FCMService.sendNotification(
                    partner.fcmToken,
                    {
                        type: 'meeting_countdown',
                        meetingDate: date.toISOString(),
                        setBy: currentUser.displayName,
                    },
                    {
                        title: `💕 ${currentUser.displayName} set a meeting date!`,
                        body: `You're meeting on ${formattedDate}! Countdown started ⏰`,
                    }
                );
                console.log(`✅ Meeting countdown notification sent via FCM`);
            } catch (fcmError) {
                console.log('⚠️ FCM notification failed:', fcmError);
            }
        }

        res.json({
            success: true,
            data: {
                meetingDate: date.toISOString(),
                message: `Countdown started! ${partner.displayName} has been notified 💕`,
            },
        } as ApiResponse);
    } catch (error) {
        console.error('Set meeting countdown error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to set meeting countdown',
        } as ApiResponse);
    }
};

/**
 * Get current meeting countdown for pair
 */
export const getMeetingCountdown = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;

        // Find user's pair
        const pair = await prisma.pair.findFirst({
            where: {
                OR: [{ user1Id: userId }, { user2Id: userId }],
            },
        });

        if (!pair) {
            res.status(404).json({
                success: false,
                error: 'No active pairing found',
            } as ApiResponse);
            return;
        }

        // Get meeting date from pair
        const meetingDate = (pair as any).meetingDate;

        res.json({
            success: true,
            data: {
                meetingDate: meetingDate ? new Date(meetingDate).toISOString() : null,
            },
        } as ApiResponse);
    } catch (error) {
        console.error('Get meeting countdown error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get meeting countdown',
        } as ApiResponse);
    }
};

/**
 * Clear meeting countdown
 */
export const clearMeetingCountdown = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;

        // Find user's pair
        const pair = await prisma.pair.findFirst({
            where: {
                OR: [{ user1Id: userId }, { user2Id: userId }],
            },
            include: {
                user1: { select: { clerkId: true, fcmToken: true } },
                user2: { select: { clerkId: true, fcmToken: true } },
            },
        });

        if (!pair) {
            res.status(404).json({
                success: false,
                error: 'No active pairing found',
            } as ApiResponse);
            return;
        }

        // Clear meeting date
        await prisma.pair.update({
            where: { id: pair.id },
            data: { meetingDate: null } as any,
        });
        console.log('✅ Meeting date cleared');

        // Notify partner via Socket
        const partner = pair.user1Id === userId ? pair.user2 : pair.user1;
        if (partner.clerkId) {
            io.to(partner.clerkId).emit('meeting_countdown_cleared', {});
        }

        res.json({
            success: true,
            data: { message: 'Meeting countdown cleared' },
        } as ApiResponse);
    } catch (error) {
        console.error('Clear meeting countdown error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear meeting countdown',
        } as ApiResponse);
    }
};
