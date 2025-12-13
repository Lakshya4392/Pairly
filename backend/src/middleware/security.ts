import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware
 * Adds essential security headers to all responses
 * Alternative to helmet.js - zero dependencies
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy (for API, mainly restricts to self)
    res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");

    // Permissions Policy (disable unnecessary browser features)
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Strict Transport Security (HTTPS only) - only in production
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Remove X-Powered-By header (don't expose Express)
    res.removeHeader('X-Powered-By');

    next();
};

/**
 * Request sanitizer middleware
 * Basic input sanitization for common attack vectors
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
    // Sanitize query parameters
    if (req.query) {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                // Remove potential script tags and SQL injection patterns
                req.query[key] = sanitizeString(req.query[key] as string);
            }
        }
    }

    // Sanitize body (basic)
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }

    next();
};

/**
 * Basic string sanitization
 */
function sanitizeString(str: string): string {
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj: any): void {
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
}

/**
 * Request size limiter
 * Prevents large payload attacks
 */
export const requestSizeLimiter = (maxSizeBytes: number = 10 * 1024 * 1024) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);

        if (contentLength > maxSizeBytes) {
            res.status(413).json({
                error: 'Payload Too Large',
                message: `Request body exceeds ${Math.round(maxSizeBytes / 1024 / 1024)}MB limit`,
            });
            return;
        }

        next();
    };
};
