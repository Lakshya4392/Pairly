import { Router, Request, Response } from 'express';
import { prisma } from '../index';

const router = Router();

// GET /config/config - Get app configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await prisma.appConfig.findFirst();

    if (!config) {
      // Return default config if none exists
      return res.json({
        isWaitlistOnly: true,
        launchDate: new Date('2025-12-31'), // Default launch date
        daysUntilLaunch: Math.ceil(
          (new Date('2025-12-31').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      });
    }

    const now = new Date();
    const daysUntilLaunch = Math.ceil(
      (new Date(config.launchDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return res.json({
      isWaitlistOnly: config.isWaitlistOnly,
      launchDate: config.launchDate,
      daysUntilLaunch: Math.max(0, daysUntilLaunch),
    });
  } catch (error) {
    console.error('Error fetching app config:', error);
    return res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// POST /config/config - Set app configuration (admin only)
router.post('/config', async (req: Request, res: Response) => {
  try {
    const { launchDate, isWaitlistOnly } = req.body;

    if (!launchDate) {
      return res.status(400).json({ error: 'Launch date is required' });
    }

    // Delete existing config and create new one
    await prisma.appConfig.deleteMany({});

    const config = await prisma.appConfig.create({
      data: {
        launchDate: new Date(launchDate),
        isWaitlistOnly: isWaitlistOnly !== undefined ? isWaitlistOnly : true,
      },
    });

    console.log('✅ App config updated:', config);

    return res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Error updating app config:', error);
    return res.status(500).json({ error: 'Failed to update config' });
  }
});

export default router;
