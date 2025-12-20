import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

/**
 * Request logging middleware
 * Logs all incoming requests with timing and sanitized data
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Log request start (only for non-health-check routes)
    if (req.path !== '/health' && req.path !== '/') {
        log.info(`→ ${req.method} ${req.path}`, {
            method: req.method,
            path: req.path,
            query: Object.keys(req.query).length > 0 ? Object.keys(req.query) : undefined,
        });
    }

    // Override res.json to log response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
        const duration = Date.now() - startTime;

        // Log slow requests
        if (duration > 1000) {
            log.slowRequest(req.method, req.path, duration);
        }

        // Log errors
        if (res.statusCode >= 400) {
            log.warn(`← ${req.method} ${req.path} [${res.statusCode}] ${duration}ms`, {
                statusCode: res.statusCode,
                error: body?.error,
            });
        }

        return originalJson(body);
    };

    next();
};

/**
 * Error handling middleware
 * Catches all unhandled errors and logs them securely
 */
export const errorLogger = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    log.error(`Unhandled error in ${req.method} ${req.path}`, error, {
        method: req.method,
        path: req.path,
    });

    res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
};
