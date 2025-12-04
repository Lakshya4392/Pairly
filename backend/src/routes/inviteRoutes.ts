import express from 'express';
import { prisma } from '../index';
import { Prisma } from '@prisma/client';
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

    // User is whitelisted!
    return res.json({
      allowed: true,
      message: 'Welcome to Pairly! 🎉',
      inviteCode: invitedUser.inviteCode,
      referralCount: invitedUser.referralCount,
      isPremium: invitedUser.isPremium,
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
        await prisma.invitedUser.update({
          where: { id: referrer.id },
          data: {
            referralCount: { increment: 1 }
          }
        });

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
    const createData: Prisma.InvitedUserCreateInput = {
      email: email.toLowerCase(),
      status: 'pending',
      invitedBy: referrerId, // Link to referrer
      source: source || 'website',
      name: name || null,
    };

    const invite = await prisma.invitedUser.create({
      data: createData,
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

// ✅ Verify email for app login (after Clerk authentication)
router.post('/verify-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        verified: false,
        message: 'Email is required',
      });
    }

    // Find user in waitlist
    const invitedUser = await prisma.invitedUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!invitedUser) {
      return res.status(404).json({
        verified: false,
        message: 'Email not in waitlist. Please join at pairly-iota.vercel.app',
      });
    }

    // Return user data
    return res.json({
      verified: true,
      userId: invitedUser.id,
      referralCode: invitedUser.inviteCode,
      isPremium: invitedUser.isPremium,
      referralCount: invitedUser.referralCount,
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      verified: false,
      error: 'Internal server error',
    });
  }
});

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

    return res.json({
      count: user.referralCount,
      isPremium: user.isPremium,
    });

  } catch (error) {
    console.error('Error fetching referral count:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
