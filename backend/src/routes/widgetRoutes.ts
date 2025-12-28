import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

/**
 * Get widget data (optimized for fast loading)
 * GET /widget/data
 */
router.get('/data', async (req, res) => {
  try {
    const { userId } = req.query;

    console.log('📱 [Widget] Fetching data for:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    // 🔒 Security: Verify user exists before returning data
    const user = await prisma.user.findUnique({
      where: { id: userId as string },
      select: { id: true },
    });

    if (!user) {
      console.warn('⚠️ [Widget] Invalid userId attempted:', userId);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Fetch data in parallel for speed
    const [recentMoments, recentNotes, partner] = await Promise.all([
      // Recent moments (last 3) - exclude hidden from widget
      prisma.moment.findMany({
        where: {
          pair: {
            OR: [
              { user1Id: userId as string },
              { user2Id: userId as string },
            ],
          },
          isHiddenFromWidget: false, // 🔒 Exclude expired/hidden moments
        },
        orderBy: { uploadedAt: 'desc' },
        take: 3,
        select: {
          id: true,
          photoData: true,
          uploadedAt: true,
        },
      }),

      // Recent notes (last 2)
      prisma.sharedNote.findMany({
        where: {
          pair: {
            OR: [
              { user1Id: userId as string },
              { user2Id: userId as string },
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: {
          id: true,
          content: true,
          createdAt: true,
        },
      }),

      // Partner info
      prisma.pair.findFirst({
        where: {
          OR: [
            { user1Id: userId as string },
            { user2Id: userId as string },
          ],
        },
        include: {
          user1: {
            select: {
              id: true,
              displayName: true,
            },
          },
          user2: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      }),
    ]);

    const partnerData = partner
      ? partner.user1Id === userId
        ? partner.user2
        : partner.user1
      : null;

    console.log(`✅ [Widget] Data fetched: ${recentMoments.length} moments, ${recentNotes.length} notes`);

    res.json({
      success: true,
      data: {
        moments: recentMoments,
        notes: recentNotes,
        partner: partnerData,
      },
    });
  } catch (error: any) {
    console.error('❌ [Widget] Error fetching data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch widget data',
    });
  }
});

export default router;
