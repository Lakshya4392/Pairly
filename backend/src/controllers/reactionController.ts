import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../types';
import FCMService from '../services/FCMService';

/**
 * Add reaction to a moment (from widget or app)
 * POST /moments/:id/react
 */
export const addReaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const { id: momentId } = req.params;
        const { emoji } = req.body;

        // Validate emoji
        const validEmojis = ['❤️', '😍', '😂', '😮', '👏'];
        if (!emoji || !validEmojis.includes(emoji)) {
            res.status(400).json({
                success: false,
                error: 'Invalid emoji. Allowed: ❤️, 😍, 😂, 😮, 👏',
            } as ApiResponse);
            return;
        }

        console.log(`💝 [REACTION] User ${userId} reacting ${emoji} to moment ${momentId}`);

        // Find the moment
        const moment = await prisma.moment.findUnique({
            where: { id: momentId },
            include: {
                pair: {
                    include: {
                        user1: true,
                        user2: true,
                    },
                },
                uploader: true,
            },
        });

        if (!moment) {
            res.status(404).json({
                success: false,
                error: 'Moment not found',
            } as ApiResponse);
            return;
        }

        // Verify user is part of this pair
        const isUser1 = moment.pair.user1Id === userId;
        const isUser2 = moment.pair.user2Id === userId;

        if (!isUser1 && !isUser2) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to react to this moment',
            } as ApiResponse);
            return;
        }

        // Upsert reaction (one per user per moment)
        const reaction = await prisma.momentReaction.upsert({
            where: {
                momentId_userId: {
                    momentId,
                    userId,
                },
            },
            update: {
                emoji,
            },
            create: {
                momentId,
                userId,
                emoji,
            },
        });

        console.log(`✅ [REACTION] Saved: ${emoji} from ${userId}`);

        // Get reactor's name
        const reactor = isUser1 ? moment.pair.user1 : moment.pair.user2;
        const partner = isUser1 ? moment.pair.user2 : moment.pair.user1;

        // Notify partner via Socket
        io.to(partner.clerkId).emit('moment_reaction', {
            momentId,
            emoji,
            reactorName: reactor.displayName,
            timestamp: reaction.createdAt.toISOString(),
        });
        console.log(`📡 [SOCKET] Reaction event sent to ${partner.displayName}`);

        // Notify partner via FCM (for when app is closed)
        if (partner.fcmToken) {
            try {
                await FCMService.sendNotification(
                    partner.fcmToken,
                    {
                        type: 'moment_reaction',
                        momentId,
                        emoji,
                        reactorName: reactor.displayName,
                    },
                    {
                        title: `${reactor.displayName} loved your moment! ${emoji}`,
                        body: 'Tap to see your memories together 💕',
                    }
                );
                console.log(`📲 [FCM] Reaction notification sent to ${partner.displayName}`);
            } catch (fcmError) {
                console.log('⚠️ FCM reaction notification failed (non-critical):', fcmError);
            }
        }

        res.json({
            success: true,
            data: {
                reaction: {
                    id: reaction.id,
                    emoji: reaction.emoji,
                    createdAt: reaction.createdAt.toISOString(),
                },
            },
        } as ApiResponse);
    } catch (error: any) {
        console.error('❌ [REACTION] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to add reaction',
        } as ApiResponse);
    }
};

/**
 * Get reactions for a moment
 * GET /moments/:id/reactions
 */
export const getReactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id: momentId } = req.params;

        const reactions = await prisma.momentReaction.findMany({
            where: { momentId },
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            success: true,
            data: {
                reactions: reactions.map((r: { id: string; emoji: string; userId: string; createdAt: Date }) => ({
                    id: r.id,
                    emoji: r.emoji,
                    userId: r.userId,
                    createdAt: r.createdAt.toISOString(),
                })),
            },
        } as ApiResponse);
    } catch (error: any) {
        console.error('❌ [GET REACTIONS] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reactions',
        } as ApiResponse);
    }
};
