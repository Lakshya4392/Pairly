import { Request, Response } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../index';
import { ApiResponse, UserResponse } from '../types';
import { log } from '../utils/logger';

// JWT Secret - MUST match the secret in auth.ts middleware
const JWT_SECRET: string = process.env.JWT_SECRET || 'dev-only-insecure-key';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '30d'; // 30 days for mobile apps

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
      // Verify the JWT token from Clerk with clock skew tolerance
      const decoded = await clerkClient.verifyToken(idToken, {
        clockSkewInMs: 60000, // 60 second tolerance for clock differences
        issuer: null,
      });

      if (!decoded || !decoded.sub) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
        } as ApiResponse);
        return;
      }

      // Get user from Clerk using the subject (user ID) from token
      clerkUser = await clerkClient.users.getUser(decoded.sub);
    } catch (clerkError: any) {
      log.error('Clerk verification error', clerkError);

      // If token is expired, provide more helpful error
      if (clerkError.reason === 'token-expired') {
        res.status(401).json({
          success: false,
          error: 'Session expired. Please sign in again.',
          code: 'TOKEN_EXPIRED',
        } as ApiResponse);
        return;
      }

      res.status(401).json({
        success: false,
        error: clerkError.message || 'Token verification failed',
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

    // ⚡ FIX: Use robust sync logic from UserService
    const UserService = (await import('../services/userService')).default;

    // Create or update user (handles email collisions automatically)
    const user = await UserService.syncUserFromClerk({
      clerkId: clerkUser.id,
      email: primaryEmail.emailAddress,
      displayName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
      firstName: clerkUser.firstName || undefined,
      lastName: clerkUser.lastName || undefined,
      photoUrl: clerkUser.imageUrl,
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        clerkId: user.clerkId,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN as any,
        algorithm: 'HS256' // ⚡ Explicitly use HS256
      }
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
    log.error('Authentication error', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    } as ApiResponse);
  }
};
