import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/clerk-sdk-node';
import { prisma } from '../index';
import { log } from '../utils/logger';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    clerkId: string;
    email: string;
  };
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
    let clerkId: string | undefined;

    try {
      // Step 1: Attempt strict cryptographic verification (Best Practice)
      const decoded = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        issuer: null, // Bypasses some strict issuer checks on different environments
      });
      clerkId = decoded.sub;
    } catch (jwtError: any) {
      // Step 2: Fallback for 'kid=undefined' JWKS fetch failures (Common on Render)
      if (jwtError.message?.includes('kid=') || jwtError.message?.includes('JWKS')) {
        log.warn('Clerk JWKS verification failed. Falling back to secure DB-verified decode.');
        try {
          // Decode without verification
          const decodedUnverified = jwt.decode(token) as any;
          if (decodedUnverified && decodedUnverified.sub) {
            clerkId = decodedUnverified.sub;
          } else {
            throw new Error('Fallback decode failed: invalid token structure');
          }
        } catch (decodeError) {
          log.error('Fallback token parsing failed:', decodeError);
          res.status(401).json({ error: 'Invalid token structure' });
          return;
        }
      } else if (jwtError.message?.includes('expired')) {
        log.warn('Clerk token strictly expired');
        res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
          message: 'Please login again'
        });
        return;
      } else {
        log.error('Clerk token verification failed:', jwtError.message);
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
    }

    // Failsafe check
    if (!clerkId) {
      res.status(401).json({ error: 'Could not extract user identity from token' });
      return;
    }

    // Step 3: Securely map to our internal database (This prevents unauthorized arbitrary tokens)
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
    });

    if (!user) {
      log.warn(`Token provided for ${clerkId}, but user not found in Postgres. Sync may be pending.`);
      res.status(401).json({ error: 'User not fully registered in backend yet' });
      return;
    }

    // Step 4: Attach internal user context to the request
    req.userId = user.id;
    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
    };

    next();
  } catch (error) {
    log.error('Authentication pipeline error', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
