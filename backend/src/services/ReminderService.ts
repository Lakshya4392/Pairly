import { prisma } from '../index';
import FCMService from './FCMService';
import { log } from '../utils/logger';

/**
 * ReminderService - Handles FCM-based scheduled reminders
 * Runs via cron job every minute, checks who needs reminders
 * 🔥 FIXED: Now properly handles user timezone
 */
class ReminderService {
    /**
     * Convert current server time to user's local time
     */
    static getUserLocalTime(timezone: string): string {
        try {
            const now = new Date();
            const userTime = now.toLocaleString('en-US', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            // Format: "HH:MM"
            return userTime.replace(/\s/g, '');
        } catch (error) {
            // Fallback to server time if timezone invalid
            const now = new Date();
            return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        }
    }

    /**
     * Process all reminder types
     * Called by cron job every minute
     */
    static async processReminders() {
        // Get all users with reminders enabled
        await this.processGoodMorningReminders();
        await this.processGoodNightReminders();
    }

    /**
     * Send Good Morning reminders to users who have it enabled at their LOCAL time
     * 🔥 FIXED: Uses user's timezone to check correct time
     */
    static async processGoodMorningReminders() {
        try {
            // Find users with Good Morning enabled and FCM token
            const users = await prisma.user.findMany({
                where: {
                    goodMorningEnabled: true,
                    fcmToken: { not: null },
                },
                include: {
                    pairAsUser1: {
                        include: { user2: true },
                    },
                    pairAsUser2: {
                        include: { user1: true },
                    },
                },
            });

            if (users.length === 0) return;

            let sentCount = 0;

            for (const user of users) {
                try {
                    // 🔥 FIX: Get user's LOCAL time based on their timezone
                    const userTimezone = user.timezone || 'Asia/Kolkata';
                    const userLocalTime = this.getUserLocalTime(userTimezone);

                    // Check if it's the right time for THIS user
                    if (user.goodMorningTime !== userLocalTime) {
                        continue; // Not time yet for this user
                    }

                    // Get partner name
                    let partnerName = 'your partner';
                    if (user.pairAsUser1) {
                        partnerName = user.pairAsUser1.user2?.displayName || 'your partner';
                    } else if (user.pairAsUser2) {
                        partnerName = user.pairAsUser2.user1?.displayName || 'your partner';
                    } else {
                        continue; // No pair, skip
                    }

                    // Romantic Good Morning messages
                    const morningMessages = [
                        { title: '☀️ Rise and Shine!', body: `Send ${partnerName} a sweet good morning 💕` },
                        { title: `🌅 ${partnerName} is waiting!`, body: 'Start their day with your love ✨' },
                        { title: '💕 Good Morning, Sunshine!', body: `Make ${partnerName} smile today 🌻` },
                        { title: '🌸 Time to spread love!', body: `Say good morning to ${partnerName} 💗` },
                        { title: `☕ Hey! ${partnerName} needs you`, body: 'A morning moment would mean the world 💝' },
                    ];
                    const message = morningMessages[Math.floor(Math.random() * morningMessages.length)];

                    // Send FCM
                    await FCMService.sendNotification(
                        user.fcmToken!,
                        {
                            type: 'good_morning',
                            partnerName,
                        },
                        message
                    );

                    sentCount++;
                    log.info('Good morning reminder sent', {
                        userId: user.id.substring(0, 8) + '...',
                        timezone: userTimezone,
                        localTime: userLocalTime
                    });
                } catch (err) {
                    log.error('Error sending good morning reminder', err);
                }
            }

            if (sentCount > 0) {
                console.log(`☀️ Sent ${sentCount} Good Morning reminders`);
            }
        } catch (error) {
            log.error('Error processing good morning reminders', error);
        }
    }

    /**
     * Send Good Night reminders to users who have it enabled at their LOCAL time
     * 🔥 FIXED: Uses user's timezone to check correct time
     */
    static async processGoodNightReminders() {
        try {
            // Find users with Good Night enabled and FCM token
            const users = await prisma.user.findMany({
                where: {
                    goodNightEnabled: true,
                    fcmToken: { not: null },
                },
                include: {
                    pairAsUser1: {
                        include: { user2: true },
                    },
                    pairAsUser2: {
                        include: { user1: true },
                    },
                },
            });

            if (users.length === 0) return;

            let sentCount = 0;

            for (const user of users) {
                try {
                    // 🔥 FIX: Get user's LOCAL time based on their timezone
                    const userTimezone = user.timezone || 'Asia/Kolkata';
                    const userLocalTime = this.getUserLocalTime(userTimezone);

                    // Check if it's the right time for THIS user
                    if (user.goodNightTime !== userLocalTime) {
                        continue; // Not time yet for this user
                    }

                    // Get partner name
                    let partnerName = 'your partner';
                    if (user.pairAsUser1) {
                        partnerName = user.pairAsUser1.user2?.displayName || 'your partner';
                    } else if (user.pairAsUser2) {
                        partnerName = user.pairAsUser2.user1?.displayName || 'your partner';
                    } else {
                        continue; // No pair, skip
                    }

                    // Romantic Good Night messages
                    const nightMessages = [
                        { title: '🌙 Sweet Dreams Await!', body: `Send ${partnerName} a goodnight kiss 💋` },
                        { title: `🌟 ${partnerName} is thinking of you`, body: 'End their day with love 💕' },
                        { title: '💤 Time for sweet dreams!', body: `Wish ${partnerName} goodnight ✨` },
                        { title: '🌙 Before you sleep...', body: `Make ${partnerName} feel loved tonight 💗` },
                        { title: `😴 ${partnerName} needs a goodnight hug`, body: 'Send a special moment 💝' },
                    ];
                    const message = nightMessages[Math.floor(Math.random() * nightMessages.length)];

                    // Send FCM
                    await FCMService.sendNotification(
                        user.fcmToken!,
                        {
                            type: 'good_night',
                            partnerName,
                        },
                        message
                    );

                    sentCount++;
                    log.info('Good night reminder sent', {
                        userId: user.id.substring(0, 8) + '...',
                        timezone: userTimezone,
                        localTime: userLocalTime
                    });
                } catch (err) {
                    log.error('Error sending good night reminder', err);
                }
            }

            if (sentCount > 0) {
                console.log(`🌙 Sent ${sentCount} Good Night reminders`);
            }
        } catch (error) {
            log.error('Error processing good night reminders', error);
        }
    }
}

export default ReminderService;
