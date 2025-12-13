import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';

const router = Router();

// All dual-camera routes require authentication
router.use(authenticate);

/**
 * Create dual camera moment
 * POST /dual-moments
 */
router.post('/', async (req, res) => {
  try {
    const { userId, partnerId, frontPhoto, backPhoto, note } = req.body;

    console.log('📸 [Dual Camera] Creating moment:', {
      userId,
      partnerId,
      hasFront: !!frontPhoto,
      hasBack: !!backPhoto,
      hasNote: !!note,
    });

    // Validate required fields
    if (!userId || !partnerId) {
      console.error('❌ [Dual Camera] Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'userId and partnerId are required',
      });
    }

    // Create dual moment
    const dualMoment = await prisma.dualMoment.create({
      data: {
        userId,
        partnerId,
        frontPhotoUrl: frontPhoto,
        backPhotoUrl: backPhoto,
        note: note || null,
        status: backPhoto ? 'completed' : 'pending',
      },
    });

    console.log('✅ [Dual Camera] Moment created:', dualMoment.id);

    res.json({
      success: true,
      data: dualMoment,
    });
  } catch (error: any) {
    console.error('❌ [Dual Camera] Error creating moment:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create dual camera moment',
    });
  }
});

/**
 * Get pending dual moments
 * GET /dual-moments/pending
 */
router.get('/pending', async (req, res) => {
  try {
    const { userId } = req.query;

    console.log('📋 [Dual Camera] Fetching pending moments for:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const pendingMoments = await prisma.dualMoment.findMany({
      where: {
        OR: [
          { userId: userId as string, status: 'pending' },
          { partnerId: userId as string, status: 'pending' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`✅ [Dual Camera] Found ${pendingMoments.length} pending moments`);

    res.json({
      success: true,
      data: pendingMoments,
    });
  } catch (error: any) {
    console.error('❌ [Dual Camera] Error fetching pending:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending moments',
    });
  }
});

/**
 * Complete dual moment (add second photo)
 * PUT /dual-moments/:id/complete
 */
router.put('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { backPhoto } = req.body;

    console.log('🔄 [Dual Camera] Completing moment:', id);

    const updated = await prisma.dualMoment.update({
      where: { id },
      data: {
        backPhotoUrl: backPhoto,
        status: 'completed',
      },
    });

    console.log('✅ [Dual Camera] Moment completed:', id);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('❌ [Dual Camera] Error completing moment:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to complete moment',
    });
  }
});

export default router;
