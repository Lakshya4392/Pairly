import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/clerk-sdk-node';
import { prisma } from '../index';
import { log } from '../utils/logger';

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

    try {
      // 1. Verify the Clerk token cryptographically using their public keys
      const decoded = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        issuer: null,
      });

      if (!decoded || !decoded.sub) {
        res.status(401).json({ error: 'Invalid Clerk token structure' });
        return;
      }

      const clerkId = decoded.sub;

      // 2. Look up our internal user ID using the verified Clerk ID
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkId },
      });

      if (!user) {
        log.warn(`Verified Clerk token for ${clerkId}, but user not found in Postgres. Sync might be pending.`);
        res.status(401).json({ error: 'User not fully registered in backend yet' });
        return;
      }

      // 3. Attach internal user context to the request
      req.userId = user.id;
      req.user = {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
      };

      next();
    } catch (jwtError: any) {
      if (jwtError.message?.includes('expired')) {
        log.warn('Clerk token expired');
        res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
          message: 'Please login again'
        });
      } else {
        log.error('Clerk token verification failed:', jwtError.message);
        res.status(401).json({ error: 'Invalid token' });
      }
      return;
    }
  } catch (error) {
    log.error('Authentication pipeline error', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
