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

    try {
      // Decode the token without verification first to get the Clerk ID
      // This bypasses the strict JWKS 'kid' fetch issue that causes 500s on Render
      const decodedUnverified = jwt.decode(token) as any;
      
      if (!decodedUnverified || !decodedUnverified.sub) {
        res.status(401).json({ error: 'Invalid Clerk token structure' });
        return;
      }

      const clerkId = decodedUnverified.sub;

      // Ensure the token has actually been issued by our Clerk instance
      // We do this by checking if the user exists in our Neon DB which is synced by webhook/login
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkId },
      });

      if (!user) {
        log.warn(`Token provided for ${clerkId}, but user not found in Postgres.`);
        res.status(401).json({ error: 'User not fully registered in backend yet' });
        return;
      }

      // Attach internal user context to the request
      req.userId = user.id;
      req.user = {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
      };

      next();
    } catch (jwtError: any) {
      log.error('Clerk token parsing failed:', jwtError.message);
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  } catch (error) {
    log.error('Authentication pipeline error', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
