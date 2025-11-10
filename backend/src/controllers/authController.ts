import { Request, Response } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../index';
import { ApiResponse, UserResponse } from '../types';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '1h';

/**
 * Authenticate user with Google via Clerk
 */
export const authenticateWithGoogle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({
        success: false,
        error: 'ID token is required',
      } as ApiResponse);
      return;
    }

    // Verify token with Clerk
    let clerkUser;
    try {
      // Get session from token
      const sessions = await clerkClient.sessions.getSessionList();
      const session = sessions.find((s: any) => s.id === idToken);

      if (!session || !session.userId) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
        } as ApiResponse);
        return;
      }

      // Get user from Clerk
      clerkUser = await clerkClient.users.getUser(session.userId);
    } catch (clerkError) {
      console.error('Clerk verification error:', clerkError);
      res.status(401).json({
        success: false,
        error: 'Token verification failed',
      } as ApiResponse);
      return;
    }

    if (!clerkUser) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    // Get primary email
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    );

    if (!primaryEmail) {
      res.status(400).json({
        success: false,
        error: 'No email found',
      } as ApiResponse);
      return;
    }

    // Create or update user in database
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: primaryEmail.emailAddress,
          displayName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
          photoUrl: clerkUser.imageUrl,
        },
      });
    } else {
      // Update user info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          displayName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || user.displayName,
          photoUrl: clerkUser.imageUrl,
        },
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        clerkId: user.clerkId,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    // Return user and token
    const userResponse: UserResponse = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl || undefined,
      createdAt: user.createdAt.toISOString(),
    };

    res.json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    } as ApiResponse);
  }
};
