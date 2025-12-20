import { Request, Response } from 'express';
import { prisma } from '../index';
import { ApiResponse } from '../types';
import { log } from '../utils/logger';

/**
 * Get user's reminder settings
 */
export const getReminderSettings = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = (req as any).userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                goodMorningEnabled: true,
                goodMorningTime: true,
                goodNightEnabled: true,
                goodNightTime: true,
                timezone: true,
            },
        });

        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        res.json({
            success: true,
            data: {
                goodMorning: {
                    enabled: user.goodMorningEnabled,
                    time: user.goodMorningTime,
                },
                goodNight: {
                    enabled: user.goodNightEnabled,
                    time: user.goodNightTime,
                },
                timezone: user.timezone,
            },
        } as ApiResponse);
    } catch (error) {
        log.error('Error getting reminder settings', error);
        res.status(500).json({ success: false, error: 'Failed to get settings' });
    }
};

/**
 * Update user's reminder settings
 */
export const updateReminderSettings = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { goodMorning, goodNight, timezone } = req.body;

        const updateData: any = {};

        if (goodMorning !== undefined) {
            if (typeof goodMorning.enabled === 'boolean') {
                updateData.goodMorningEnabled = goodMorning.enabled;
            }
            if (goodMorning.time) {
                updateData.goodMorningTime = goodMorning.time;
            }
        }

        if (goodNight !== undefined) {
            if (typeof goodNight.enabled === 'boolean') {
                updateData.goodNightEnabled = goodNight.enabled;
            }
            if (goodNight.time) {
                updateData.goodNightTime = goodNight.time;
            }
        }

        if (timezone) {
            updateData.timezone = timezone;
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                goodMorningEnabled: true,
                goodMorningTime: true,
                goodNightEnabled: true,
                goodNightTime: true,
                timezone: true,
            },
        });

        log.info('Reminder settings updated', { userId: userId.substring(0, 8) + '...' });

        res.json({
            success: true,
            data: {
                goodMorning: {
                    enabled: user.goodMorningEnabled,
                    time: user.goodMorningTime,
                },
                goodNight: {
                    enabled: user.goodNightEnabled,
                    time: user.goodNightTime,
                },
                timezone: user.timezone,
            },
        } as ApiResponse);
    } catch (error) {
        log.error('Error updating reminder settings', error);
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
};
