import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

const JWT_SECRET = process.env.JWT_SECRET;

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
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

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
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
