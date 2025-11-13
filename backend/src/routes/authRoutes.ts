import { Router, Request, Response } from 'express';
import { authenticateWithGoogle } from '../controllers/authController';
import userService from '../services/userService';

const router = Router();

// POST /auth/google - Authenticate with Google via Clerk
router.post('/google', authenticateWithGoogle);

// POST /auth/sync - Sync user from Clerk
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { clerkId, email, displayName, firstName, lastName, photoUrl, phoneNumber } = req.body;

    if (!clerkId || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    const user = await userService.syncUserFromClerk({
      clerkId,
      email,
      displayName: displayName || email.split('@')[0],
      firstName,
      lastName,
      photoUrl,
      phoneNumber,
    });

    // Return user with premium status
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
        trialEndsAt: user.trialEndsAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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

    const { isPremium, plan } = req.body;

    const user = await userService.updatePremiumStatus(clerkId, isPremium, plan);

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error updating premium status:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
