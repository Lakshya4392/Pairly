import { Router, Request, Response } from 'express';
import userService from '../services/userService';
import { authenticate as auth, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /auth/sync - Sync user from Clerk (Called heavily on app launch)
// 🔒 SECURE: Must pass Clerk token. Prevents identity spoofing.
router.post('/sync', auth, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Get verified identity from middleware
    const clerkId = req.user?.clerkId;

    // 2. Get profile from body (Clerk UI passes this)
    const { email, displayName, firstName, lastName, photoUrl, phoneNumber } = req.body;

    if (!clerkId || !email) {
      res.status(400).json({
        success: false,
        error: 'Missing required identity fields'
      });
      return;
    }

    // 3. Immediately sync user into Postgres (CREATE if not exists, UPDATE if exists)
    const user = await userService.syncUserFromClerk({
      clerkId,
      email,
      displayName: displayName || email.split('@')[0],
      firstName,
      lastName,
      photoUrl,
      phoneNumber,
    });

    // 4. Return user profile (immediately usable by UI)
    res.json({
      success: true,
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        phoneNumber: user.phoneNumber,
        isPremium: user.isPremium,
        premiumPlan: user.premiumPlan,
        premiumExpiry: user.premiumExpiry,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastSyncedAt: user.lastSyncedAt, // 🆕 Return new sync timestamp
      }
    });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /auth/me - Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const clerkId = req.headers['x-clerk-user-id'] as string;

    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await userService.getUserByClerkId(clerkId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error: any) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /auth/settings - Update user settings
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const clerkId = req.headers['x-clerk-user-id'] as string;

    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notificationsEnabled, soundEnabled, vibrationEnabled } = req.body;

    const user = await userService.updateSettings(clerkId, {
      notificationsEnabled,
      soundEnabled,
      vibrationEnabled,
    });

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /auth/premium - Update premium status
router.put('/premium', async (req: Request, res: Response) => {
  try {
    const clerkId = req.headers['x-clerk-user-id'] as string;

    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { isPremium, plan, expiryDate } = req.body;

    const user = await userService.updatePremiumStatus(clerkId, isPremium, plan, expiryDate);

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error updating premium status:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
