import express from 'express';
import { prisma } from '../index';
import { sendWaitlistEmail, sendReferralSuccessEmail } from '../services/emailService';

const router = express.Router();

// ✅ Check if email/phone is whitelisted (APK leak protection)
router.post('/check-access', async (req, res) => {
  try {
    const { email, phoneNumber, clerkId } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        allowed: false,
        message: 'Email or phone number required',
      });
    }

    // Check if user is in whitelist
    const invitedUser = await prisma.invitedUser.findFirst({
      where: {
        OR: [
          email ? { email: email.toLowerCase() } : {},
          phoneNumber ? { phoneNumber } : {},
        ],
      },
    });

    if (!invitedUser) {
      return res.json({
        allowed: false,
        message: 'Sorry! Pairly is currently invite-only. Ask a friend for an invite or join the waitlist.',
        waitlistUrl: 'https://pairly-iota.vercel.app',
      });
    }

    // Check if invite expired
    if (invitedUser.expiresAt && invitedUser.expiresAt < new Date()) {
      return res.json({
        allowed: false,
        message: 'Your invite has expired. Please request a new one.',
      });
    }

    // Link Clerk ID if provided and not already linked
    if (clerkId && !invitedUser.clerkId) {
      await prisma.invitedUser.update({
        where: { id: invitedUser.id },
        data: { clerkId },
      });
      console.log(`🔗 Linked Clerk ID ${clerkId} to InvitedUser ${invitedUser.email}`);
    }

    // Calculate premium status
    const premiumStatus = calculatePremiumStatus(invitedUser as any);

    // User is whitelisted!
    return res.json({
      allowed: true,
      message: 'Welcome to Pairly! 🎉',
      inviteCode: invitedUser.inviteCode,
      referralCount: invitedUser.referralCount,
      isPremium: premiumStatus.isPremium,
      premiumDaysRemaining: premiumStatus.daysRemaining,
    });

  } catch (error) {
    console.error('Error checking access:', error);
    return res.status(500).json({
      allowed: false,
      message: 'Error checking access',
    });
  }
});

// ... (invite-friend and mark-joined endpoints remain same) ...

// 📝 Add to waitlist (from website)
router.post('/waitlist', async (req, res) => {
  try {
    const { email, name, source, referralCode } = req.body as {
      email: string;
      name?: string;
      source?: string;
      referralCode?: string;
    };

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if already in waitlist
    const existing = await prisma.invitedUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'You are already on the waitlist!',
        alreadyExists: true,
      });
    }

    // Find referrer if code provided
    let referrerId = null;
    if (referralCode) {
      // Check in InvitedUser first (since they generate codes too)
      const referrer = await prisma.invitedUser.findUnique({
        where: { inviteCode: referralCode },
      });

      if (referrer) {
        referrerId = referrer.id; // Store ID, but schema expects String? for invitedBy
        console.log(`🔗 Referral: ${email} referred by ${referrer.email} (${referralCode})`);

        // Increment referrer count
        const updatedReferrer = await prisma.invitedUser.update({
          where: { id: referrer.id },
          data: {
            referralCount: { increment: 1 },
          },
        });

        // Calculate premium bonus based on referral count (STRICT)
        await updatePremiumForReferrals(updatedReferrer);

        // Send success email to referrer (non-blocking)
        try {
          await sendReferralSuccessEmail(referrer.email, name || 'A new friend');
          console.log('✅ Referral email sent');
        } catch (emailError) {
          console.warn('⚠️ Referral email failed (non-critical):', emailError);
        }
      }
    }

    // Add to waitlist
    const invite = await prisma.invitedUser.create({
      data: {
        email: email.toLowerCase(),
        status: 'pending',
        invitedBy: referrerId, // Link to referrer
        source: source || 'website',
        name: name || null,
      },
    });

    console.log(`📝 Waitlist signup: ${email} (source: ${source || 'website'})`);

    // Send welcome email (non-blocking, don't fail if email fails)
    try {
      const apkUrl = process.env.APK_DOWNLOAD_URL || '#';
      await sendWaitlistEmail(email, apkUrl);
      console.log('✅ Welcome email sent');
    } catch (emailError) {
      console.warn('⚠️ Email send failed (non-critical):', emailError);
      // Continue anyway - email is optional
    }

    return res.json({
      success: true,
      message: 'Successfully added to waitlist!',
      inviteCode: invite.inviteCode,
    });

  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return res.status(500).json({
      error: 'Failed to add to waitlist',
      success: false,
    });
  }
});

// 📊 Get waitlist stats (admin only)
router.get('/waitlist/stats', async (req, res) => {
  try {
    const total = await prisma.invitedUser.count();
    const pending = await prisma.invitedUser.count({
      where: { status: 'pending' }
    });
    const joined = await prisma.invitedUser.count({
      where: { status: 'joined' }
    });

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSignups = await prisma.invitedUser.count({
      where: {
        invitedAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    return res.json({
      total,
      pending,
      joined,
      recentSignups,
      conversionRate: total > 0 ? ((joined / total) * 100).toFixed(2) : 0,
    });

  } catch (error) {
    console.error('Error fetching waitlist stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 📊 Get user's invite stats (how many invited, how many joined)
router.get('/my-invites/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const invites = await prisma.invitedUser.findMany({
      where: { invitedBy: user.id },
      orderBy: { invitedAt: 'desc' },
    });

    const stats = {
      totalInvited: invites.length,
      joined: invites.filter(i => i.status === 'joined').length,
      pending: invites.filter(i => i.status === 'pending').length,
      rewardsEarned: invites.filter(i => i.rewardGranted).length,
      invites: invites.map(i => ({
        email: i.email,
        status: i.status,
        invitedAt: i.invitedAt,
        joinedAt: i.joinedAt,
      })),
    };

    return res.json(stats);

  } catch (error) {
    console.error('Error fetching invite stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ✅ STRICT: Verify email for app login (after Clerk authentication)
router.post('/verify-email', async (req, res) => {
  try {
    const { email, clerkId } = req.body;

    if (!email) {
      return res.status(400).json({
        verified: false,
        message: 'Email is required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check app config for launch date (with fallback if table doesn't exist yet)
    let config: any = null;
    let isWaitlistPeriod = false;
    
    try {
      // Use type assertion to bypass TS check for appConfig
      const prismaAny = prisma as any;
      if (prismaAny.appConfig) {
        config = await prismaAny.appConfig.findFirst();
        const now = new Date();
        isWaitlistPeriod = config ? now < new Date(config.launchDate) : false;
      }
    } catch (configError) {
      console.warn('⚠️ AppConfig table not found, assuming no waitlist period');
      isWaitlistPeriod = false;
    }

    // Find user in waitlist (STRICT EMAIL MATCH)
    const invitedUser = await prisma.invitedUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!invitedUser) {
      // Not in waitlist
      if (isWaitlistPeriod && config) {
        // Waitlist period - MUST be in waitlist
        const now = new Date();
        const daysUntilLaunch = Math.ceil(
          (new Date(config.launchDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return res.status(403).json({
          verified: false,
          isWaitlistPeriod: true,
          daysUntilLaunch: daysUntilLaunch,
          message: `Pairly is in exclusive waitlist mode. Join waitlist to get 30 days free premium!`,
          launchDate: config.launchDate,
          waitlistUrl: 'https://pairly-iota.vercel.app',
        });
      } else {
        // Public launch - allow but NO premium
        return res.json({
          verified: true,
          isWaitlistPeriod: false,
          isPremium: false,
          premiumDaysRemaining: 0,
          referralCode: null,
          referralCount: 0,
          message: 'Welcome to Pairly! Refer friends to unlock premium.',
        });
      }
    }

    // User found in waitlist - Link Clerk ID if provided
    if (clerkId && !invitedUser.clerkId) {
      await prisma.invitedUser.update({
        where: { id: invitedUser.id },
        data: { 
          clerkId,
          joinedAt: new Date(),
          status: 'joined',
        },
      });
    }

    // Check if Clerk ID matches (STRICT)
    if (invitedUser.clerkId && clerkId && invitedUser.clerkId !== clerkId) {
      return res.status(403).json({
        verified: false,
        message: 'This email is already linked to another account.',
      });
    }

    // Calculate premium status (STRICT) - using any type to avoid TS errors
    const premiumStatus = calculatePremiumStatus(invitedUser as any);

    // Update premium expiry if first time (with type assertion)
    const userWithPremium = invitedUser as any;
    if (!userWithPremium.premiumGrantedAt) {
      const premiumExpiry = new Date();
      premiumExpiry.setDate(premiumExpiry.getDate() + 30); // 30 days

      try {
        await prisma.invitedUser.update({
          where: { id: invitedUser.id },
          data: {
            premiumGrantedAt: new Date(),
            premiumExpiresAt: premiumExpiry,
            premiumDays: 30,
          } as any, // Type assertion to bypass TS check
        });

        premiumStatus.isPremium = true;
        premiumStatus.premiumExpiresAt = premiumExpiry;
        premiumStatus.daysRemaining = 30;
      } catch (updateError) {
        console.warn('⚠️ Could not update premium fields (schema not migrated yet)');
        // Fallback: use old isPremium field
        premiumStatus.isPremium = true;
        premiumStatus.daysRemaining = 30;
      }
    }

    return res.json({
      verified: true,
      userId: invitedUser.id,
      referralCode: invitedUser.inviteCode,
      isPremium: premiumStatus.isPremium,
      premiumExpiresAt: premiumStatus.premiumExpiresAt,
      premiumDaysRemaining: premiumStatus.daysRemaining,
      referralCount: invitedUser.referralCount,
      isWaitlistUser: true,
      message: premiumStatus.isPremium 
        ? `Welcome! You have ${premiumStatus.daysRemaining} days of premium.`
        : 'Your premium has expired. Refer 3 friends to get 3 months free!',
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      verified: false,
      error: 'Internal server error',
    });
  }
});

// Helper function to calculate premium status (STRICT)
function calculatePremiumStatus(invitedUser: any) {
  const now = new Date();
  
  // Check if new premium fields exist
  if (!invitedUser.premiumExpiresAt) {
    // Fallback to old isPremium field if new fields don't exist
    if (invitedUser.isPremium) {
      return {
        isPremium: true,
        premiumExpiresAt: null,
        daysRemaining: 30, // Default for old users
      };
    }
    
    return {
      isPremium: false,
      premiumExpiresAt: null,
      daysRemaining: 0,
    };
  }

  const expiryDate = new Date(invitedUser.premiumExpiresAt);
  
  if (now < expiryDate) {
    // Premium active
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isPremium: true,
      premiumExpiresAt: expiryDate,
      daysRemaining: daysRemaining,
    };
  } else {
    // Premium expired
    return {
      isPremium: false,
      premiumExpiresAt: expiryDate,
      daysRemaining: 0,
    };
  }
}

// 📊 Get referral count for user (by referral code)
router.get('/count', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    // Find user by referral code
    const user = await prisma.invitedUser.findUnique({
      where: { inviteCode: code },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const premiumStatus = calculatePremiumStatus(user);

    return res.json({
      count: user.referralCount,
      isPremium: premiumStatus.isPremium,
      premiumDaysRemaining: premiumStatus.daysRemaining,
    });

  } catch (error) {
    console.error('Error fetching referral count:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 📊 STRICT: Get premium status endpoint
router.get('/premium-status', async (req, res) => {
  try {
    const { email, clerkId } = req.query;

    if (!email && !clerkId) {
      return res.status(400).json({ error: 'Email or Clerk ID required' });
    }

    let user;
    if (clerkId) {
      user = await prisma.invitedUser.findUnique({
        where: { clerkId: clerkId as string },
      });
    } else {
      user = await prisma.invitedUser.findUnique({
        where: { email: (email as string).toLowerCase().trim() },
      });
    }

    if (!user) {
      return res.json({
        isPremium: false,
        daysRemaining: 0,
        message: 'User not found in waitlist',
      });
    }

    const premiumStatus = calculatePremiumStatus(user as any);
    const userWithPremium = user as any;

    return res.json({
      isPremium: premiumStatus.isPremium,
      premiumExpiresAt: premiumStatus.premiumExpiresAt,
      daysRemaining: premiumStatus.daysRemaining,
      referralCount: user.referralCount,
      totalPremiumDays: userWithPremium.premiumDays || 30,
    });

  } catch (error) {
    console.error('Premium status error:', error);
    return res.status(500).json({ error: 'Failed to get premium status' });
  }
});

// Helper function to update premium based on referrals (STRICT)
async function updatePremiumForReferrals(user: any) {
  const referralCount = user.referralCount;
  let bonusDays = 0;

  // Calculate bonus days based on referral milestones
  if (referralCount >= 5) {
    bonusDays = 180; // 6 months for 5+ referrals
  } else if (referralCount >= 3) {
    bonusDays = 90; // 3 months for 3+ referrals
  } else if (referralCount >= 1) {
    bonusDays = 7 * referralCount; // 1 week per referral
  }

  if (bonusDays > 0) {
    const now = new Date();
    let newExpiry;

    if (user.premiumExpiresAt && new Date(user.premiumExpiresAt) > now) {
      // Extend existing premium
      newExpiry = new Date(user.premiumExpiresAt);
      newExpiry.setDate(newExpiry.getDate() + bonusDays);
    } else {
      // Grant new premium
      newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + bonusDays);
    }

    try {
      await prisma.invitedUser.update({
        where: { id: user.id },
        data: {
          premiumExpiresAt: newExpiry,
          premiumDays: { increment: bonusDays },
        } as any, // Type assertion to bypass TS check
      });

      console.log(`✨ Premium extended for ${user.email}: +${bonusDays} days (Total referrals: ${referralCount})`);
    } catch (updateError) {
      console.warn(`⚠️ Could not update premium for ${user.email} (schema not migrated yet)`);
      // Fallback: just log the bonus
      console.log(`📝 Would grant ${bonusDays} days premium to ${user.email} (${referralCount} referrals)`);
    }
  }
}

export default router;
