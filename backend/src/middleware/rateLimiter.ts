import { Request, Response, NextFunction } from 'express';

/**
 * Simple in-memory rate limiter
 * For production with multiple servers, use Redis-based solution
 */

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

// In-memory store (replace with Redis in multi-server setup)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

interface RateLimitOptions {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests per window
    message?: string;      // Custom error message
    keyGenerator?: (req: Request) => string; // Custom key generator
}

/**
 * Create a rate limiter middleware
 */
export const createRateLimiter = (options: RateLimitOptions) => {
    const {
        windowMs,
        maxRequests,
        message = 'Too many requests, please try again later.',
        keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
        const key = keyGenerator(req);
        const now = Date.now();

        let record = rateLimitStore.get(key);

        if (!record || now > record.resetTime) {
            // Create new record
            record = {
                count: 1,
                resetTime: now + windowMs,
            };
            rateLimitStore.set(key, record);
            next();
            return;
        }

        record.count++;

        if (record.count > maxRequests) {
            const retryAfter = Math.ceil((record.resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfter.toString());
            res.setHeader('X-RateLimit-Limit', maxRequests.toString());
            res.setHeader('X-RateLimit-Remaining', '0');
            res.setHeader('X-RateLimit-Reset', record.resetTime.toString());

            res.status(429).json({
                error: 'Too Many Requests',
                message,
                retryAfter,
            });
            return;
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', (maxRequests - record.count).toString());
        res.setHeader('X-RateLimit-Reset', record.resetTime.toString());

        next();
    };
};

// Pre-configured rate limiters for different endpoints

/**
 * General API rate limit - 100 requests per minute
 */
export const generalLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests, please slow down.',
});

/**
 * Auth rate limit - 10 requests per minute (strict for login/register)
 */
export const authLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many authentication attempts, please try again in a minute.',
});

/**
 * Pairing rate limit - 20 requests per minute
 */
export const pairingLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: 'Too many pairing attempts, please wait.',
});

/**
 * Upload rate limit - 30 uploads per minute
 */
export const uploadLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many uploads, please wait before uploading more.',
});

/**
 * Strict rate limit for sensitive operations - 5 per minute
 */
export const strictLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    message: 'Rate limit exceeded for this operation.',
});
