import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import crypto from 'crypto';

// 🔒 SENSITIVE DATA PATTERNS - These will be sanitized from logs
const SENSITIVE_PATTERNS = [
    // FCM tokens (very long base64 strings)
    { pattern: /[A-Za-z0-9_-]{100,}/g, replacement: '[FCM_TOKEN_REDACTED]' },
    // JWT tokens (Bearer tokens)
    { pattern: /Bearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/gi, replacement: 'Bearer [JWT_REDACTED]' },
    // Email addresses (partial redaction)
    { pattern: /([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, replacement: '[EMAIL_REDACTED]@$2' },
    // Passwords in objects
    { pattern: /"password"\s*:\s*"[^"]*"/gi, replacement: '"password": "[REDACTED]"' },
    // Clerk tokens
    { pattern: /sk_live_[A-Za-z0-9_-]+/g, replacement: '[CLERK_KEY_REDACTED]' },
    { pattern: /pk_live_[A-Za-z0-9_-]+/g, replacement: '[CLERK_KEY_REDACTED]' },
    // Cloudinary URLs with credentials
    { pattern: /cloudinary:\/\/[^@]+@/g, replacement: 'cloudinary://[REDACTED]@' },
];

/**
 * Sanitize sensitive data from log messages
 */
const sanitize = (data: any): any => {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
        let sanitized = data;
        for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
            sanitized = sanitized.replace(pattern, replacement);
        }
        return sanitized;
    }

    if (Array.isArray(data)) {
        return data.map(item => sanitize(item));
    }

    if (typeof data === 'object') {
        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            // Always redact these fields completely
            if (['password', 'token', 'fcmToken', 'authToken', 'accessToken', 'refreshToken', 'secret'].includes(key)) {
                sanitized[key] = '[REDACTED]';
            } else if (key === 'userId' || key === 'senderId' || key === 'receiverId') {
                // Hash user IDs for privacy
                sanitized[key] = hashId(value as string);
            } else {
                sanitized[key] = sanitize(value);
            }
        }
        return sanitized;
    }

    return data;
};

/**
 * Hash ID for privacy (shows first 8 chars only)
 */
const hashId = (id: string): string => {
    if (!id) return '[NO_ID]';
    return id.substring(0, 8) + '...';
};

// Custom format that sanitizes data
const sanitizedFormat = winston.format((info) => {
    // Sanitize message
    if (info.message) {
        info.message = sanitize(info.message);
    }

    // Sanitize metadata
    if (info.meta) {
        info.meta = sanitize(info.meta);
    }

    return info;
});

// Console format (colorized for development)
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

// File format (JSON for parsing)
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Create logs directory
const logsDir = path.join(__dirname, '../../logs');

// Create transports
const transports: winston.transport[] = [
    // Console (always)
    new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    // Error logs (kept longer)
    transports.push(
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '14d', // Keep error logs for 14 days
            format: fileFormat,
        })
    );

    // Combined logs
    transports.push(
        new DailyRotateFile({
            filename: path.join(logsDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '7d', // Keep combined logs for 7 days
            format: fileFormat,
        })
    );
}

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        sanitizedFormat(),
        winston.format.errors({ stack: true })
    ),
    defaultMeta: { service: 'pairly-api' },
    transports,
});

// ===============================
// STRUCTURED LOGGING HELPERS
// ===============================

export const log = {
    /**
     * Log a photo upload event
     */
    photoUploaded: (userId: string, photoId: string, size: number) => {
        logger.info('Photo uploaded', {
            action: 'photo_uploaded',
            userId: hashId(userId),
            photoId: hashId(photoId),
            sizeKB: Math.round(size / 1024),
        });
    },

    /**
     * Log a photo sent to partner
     */
    photoSent: (senderId: string, receiverId: string, momentId: string) => {
        logger.info('Photo sent to partner', {
            action: 'photo_sent',
            senderId: hashId(senderId),
            receiverId: hashId(receiverId),
            momentId: hashId(momentId),
        });
    },

    /**
     * Log FCM notification sent
     */
    fcmSent: (userId: string, type: string, success: boolean) => {
        logger.info('FCM notification', {
            action: 'fcm_notification',
            userId: hashId(userId),
            type,
            success,
        });
    },

    /**
     * Log widget update
     */
    widgetUpdated: (userId: string) => {
        logger.info('Widget updated', {
            action: 'widget_updated',
            userId: hashId(userId),
        });
    },

    /**
     * Log user registration
     */
    userRegistered: (userId: string) => {
        logger.info('User registered', {
            action: 'user_registered',
            userId: hashId(userId),
        });
    },

    /**
     * Log premium purchase
     */
    premiumPurchased: (userId: string, plan: string) => {
        logger.info('Premium purchased', {
            action: 'premium_purchased',
            userId: hashId(userId),
            plan,
        });
    },

    /**
     * Log pairing event
     */
    pairingEvent: (userId: string, partnerId: string, action: 'created' | 'dissolved') => {
        logger.info(`Pairing ${action}`, {
            action: `pairing_${action}`,
            userId: hashId(userId),
            partnerId: hashId(partnerId),
        });
    },

    /**
     * Log scheduled moment
     */
    scheduledMoment: (userId: string, momentId: string, scheduledFor: Date) => {
        logger.info('Moment scheduled', {
            action: 'moment_scheduled',
            userId: hashId(userId),
            momentId: hashId(momentId),
            scheduledFor: scheduledFor.toISOString(),
        });
    },

    /**
     * Log time-lock message
     */
    timeLockCreated: (userId: string, messageId: string, unlockDate: Date) => {
        logger.info('Time-lock created', {
            action: 'timelock_created',
            userId: hashId(userId),
            messageId: hashId(messageId),
            unlockDate: unlockDate.toISOString(),
        });
    },

    /**
     * Log API response time (if slow)
     */
    slowRequest: (method: string, path: string, durationMs: number) => {
        if (durationMs > 1000) {
            logger.warn('Slow API request', {
                action: 'slow_request',
                method,
                path,
                durationMs,
            });
        }
    },

    /**
     * Log error
     */
    error: (message: string, error: Error | unknown, context?: Record<string, any>) => {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.error(message, {
            action: 'error',
            errorMessage: errorObj.message,
            stack: errorObj.stack,
            ...sanitize(context || {}),
        });
    },

    /**
     * Generic info log
     */
    info: (message: string, meta?: Record<string, any>) => {
        logger.info(message, sanitize(meta || {}));
    },

    /**
     * Generic warn log
     */
    warn: (message: string, meta?: Record<string, any>) => {
        logger.warn(message, sanitize(meta || {}));
    },

    /**
     * Generic debug log
     */
    debug: (message: string, meta?: Record<string, any>) => {
        logger.debug(message, sanitize(meta || {}));
    },
};

export default logger;
