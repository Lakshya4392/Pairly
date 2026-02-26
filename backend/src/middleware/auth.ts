import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { log } from '../utils/logger';

// JWT Secret - MUST be set in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not set in production!');
}
const SECRET_KEY = JWT_SECRET || 'dev-only-insecure-key';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    clerkId: string;
    email: string;
  };
}

interface JWTPayload {
  userId: string;
  clerkId: string;
  email: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    try {
      const decoded = jwt.verify(token, SECRET_KEY, {
        ignoreExpiration: false, // Strict expiry check
        // ⚡ MODIFIED: Removed strict HS256 check to allow broader compatibility 
        // while still requiring signature match with SECRET_KEY
      }) as JWTPayload;

      // Verify user exists in database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      req.userId = user.id;
      req.user = {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
      };

      next();
    } catch (jwtError: any) {
      // Better error logging
      const details = {
        name: jwtError.name,
        message: jwtError.message,
        // Safely try to peek at the header to see what algorithm was used
        header: jwt.decode(token, { complete: true })?.header
      };

      if (jwtError.name === 'TokenExpiredError') {
        log.warn('JWT token expired, user needs to re-authenticate');
        res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
          message: 'Please login again'
        });
      } else if (jwtError.message === 'invalid algorithm') {
        log.error('JWT algorithm mismatch - potential Clerk token sent to internal API', details);
        res.status(401).json({
          error: 'Invalid token algorithm',
          message: 'Please ensure you are using the app-specific auth token'
        });
      } else {
        log.error('JWT verification error', details);
        res.status(401).json({ error: 'Invalid token' });
      }
      return;
    }
  } catch (error) {
    log.error('Authentication error', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
