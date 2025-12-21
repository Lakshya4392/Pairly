import { prisma } from '../index';
import FCMService from './FCMService';
import { log } from '../utils/logger';

/**
 * ReminderService - Handles FCM-based scheduled reminders
 * Runs via cron job every minute, checks who needs reminders
 */
class ReminderService {
    /**
     * Process all reminder types
     * Called by cron job every minute
     */
    static async processReminders() {
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;

        // Process Good Morning reminders
        await this.processGoodMorningReminders(currentTime);

        // Process Good Night reminders
        await this.processGoodNightReminders(currentTime);
    }

    /**
     * Send Good Morning reminders to users who have it enabled at this time
     */
    static async processGoodMorningReminders(currentTime: string) {
        try {
            // Find users with Good Morning enabled at this exact time
            const users = await prisma.user.findMany({
                where: {
                    goodMorningEnabled: true,
                    goodMorningTime: currentTime,
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

            console.log(`☀️ Sending ${users.length} Good Morning reminders at ${currentTime}`);

            for (const user of users) {
                try {
                    // Get partner name - if pairAsUser1, partner is user2, else user1
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

                    log.info('Good morning reminder sent', { userId: user.id.substring(0, 8) + '...' });
                } catch (err) {
                    log.error('Error sending good morning reminder', err);
                }
            }
        } catch (error) {
            log.error('Error processing good morning reminders', error);
        }
    }

    /**
     * Send Good Night reminders to users who have it enabled at this time
     */
    static async processGoodNightReminders(currentTime: string) {
        try {
            // Find users with Good Night enabled at this exact time
            const users = await prisma.user.findMany({
                where: {
                    goodNightEnabled: true,
                    goodNightTime: currentTime,
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

            console.log(`🌙 Sending ${users.length} Good Night reminders at ${currentTime}`);

            for (const user of users) {
                try {
                    // Get partner name - if pairAsUser1, partner is user2, else user1
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

                    log.info('Good night reminder sent', { userId: user.id.substring(0, 8) + '...' });
                } catch (err) {
                    log.error('Error sending good night reminder', err);
                }
            }
        } catch (error) {
            log.error('Error processing good night reminders', error);
        }
    }
}

export default ReminderService;
