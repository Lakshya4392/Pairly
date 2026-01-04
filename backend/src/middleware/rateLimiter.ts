import { Request, Response, NextFunction } from 'express';

/**
 * Production-Ready Rate Limiter
 * Uses User ID (from auth header) when available, falls back to IP
 * Much higher limits to support real production traffic
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
 * Get User ID from request (JWT or query param)
 * This ensures rate limits are per-user, not per-IP
 */
const getUserIdFromRequest = (req: Request): string | null => {
    // 1. Try from authenticated user (set by auth middleware)
    if ((req as any).user?.id) {
        return `user:${(req as any).user.id}`;
    }
    
    // 2. Try from userId query param (widget requests)
    if (req.query.userId) {
        return `user:${req.query.userId}`;
    }
    
    // 3. Try from authorization header (extract from JWT if possible)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract user ID from JWT without verifying (just for rate limiting key)
        try {
            const token = authHeader.slice(7);
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            if (payload.sub || payload.userId || payload.id) {
                return `user:${payload.sub || payload.userId || payload.id}`;
            }
        } catch {
            // Invalid JWT, fall back to IP
        }
    }
    
    return null;
};

/**
 * Smart key generator: User ID if authenticated, IP otherwise
 */
const smartKeyGenerator = (req: Request): string => {
    const userId = getUserIdFromRequest(req);
    if (userId) {
        return userId;
    }
    // Fall back to IP
    return `ip:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
};

/**
 * Create a rate limiter middleware
 */
export const createRateLimiter = (options: RateLimitOptions) => {
    const {
        windowMs,
        maxRequests,
        message = 'Too many requests, please try again later.',
        keyGenerator = smartKeyGenerator, // Use smart key by default
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

// ============================================
// PRE-CONFIGURED RATE LIMITERS FOR PRODUCTION
// ============================================

/**
 * General API rate limit - 1000 requests per minute per user (very generous)
 */
export const generalLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
    message: 'Too many requests, please slow down.',
});

/**
 * Auth rate limit - 200 requests per minute per user
 */
export const authLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    message: 'Too many authentication attempts, please try again in a minute.',
});

/**
 * Pairing rate limit - 120 requests per minute per user
 */
export const pairingLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
    message: 'Too many pairing attempts, please wait.',
});

/**
 * Upload/Moments rate limit - 100 requests per minute per user
 * (Includes GET /all, GET /latest, POST /upload, DELETE, etc.)
 */
export const uploadLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many moment requests, please wait before trying again.',
});

/**
 * Widget rate limit - 200 requests per minute (extra generous for background widget)
 */
export const widgetLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    message: 'Widget rate limit exceeded.',
});

/**
 * Strict rate limit for sensitive operations - 30 per minute per user
 */
export const strictLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Rate limit exceeded for this operation.',
});

