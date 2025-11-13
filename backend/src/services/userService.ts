import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateUserData {
  clerkId: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  phoneNumber?: string;
}

interface UpdateUserData {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  phoneNumber?: string;
  isPremium?: boolean;
  premiumPlan?: string;
  premiumSince?: Date;
  premiumExpiry?: Date;
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  lastActiveAt?: Date;
}

class UserService {
  /**
   * Create or update user from Clerk data
   */
  async syncUserFromClerk(clerkData: CreateUserData) {
    try {
      const user = await prisma.user.upsert({
        where: { clerkId: clerkData.clerkId },
        update: {
          email: clerkData.email,
          displayName: clerkData.displayName,
          firstName: clerkData.firstName,
          lastName: clerkData.lastName,
          photoUrl: clerkData.photoUrl,
          phoneNumber: clerkData.phoneNumber,
          lastActiveAt: new Date(),
        },
        create: {
          clerkId: clerkData.clerkId,
          email: clerkData.email,
          displayName: clerkData.displayName,
          firstName: clerkData.firstName,
          lastName: clerkData.lastName,
          photoUrl: clerkData.photoUrl,
          phoneNumber: clerkData.phoneNumber,
          // Set 7-day trial for new users
          isPremium: true,
          premiumPlan: 'monthly',
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          premiumExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      console.log('✅ User synced:', user.id);
      console.log('📊 Premium status:', {
        isPremium: user.isPremium,
        plan: user.premiumPlan,
        expiresAt: user.premiumExpiry,
        trialEndsAt: user.trialEndsAt,
      });
      
      return user;
    } catch (error) {
      console.error('❌ Error syncing user:', error);
      throw error;
    }
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId },
        include: {
          pairAsUser1: true,
          pairAsUser2: true,
        },
      });

      return user;
    } catch (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          pairAsUser1: true,
          pairAsUser2: true,
        },
      });

      return user;
    } catch (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(clerkId: string, data: UpdateUserData) {
    try {
      const user = await prisma.user.update({
        where: { clerkId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      console.log('✅ User updated:', user.id);
      return user;
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  /**
   * Update premium status
   */
  async updatePremiumStatus(
    clerkId: string,
    isPremium: boolean,
    plan?: 'monthly' | 'yearly'
  ) {
    try {
      const data: any = {
        isPremium,
        updatedAt: new Date(),
      };

      if (isPremium && plan) {
        data.premiumPlan = plan;
        data.premiumSince = new Date();
        
        // Calculate expiry
        const expiry = new Date();
        if (plan === 'monthly') {
          expiry.setMonth(expiry.getMonth() + 1);
        } else {
          expiry.setFullYear(expiry.getFullYear() + 1);
        }
        data.premiumExpiry = expiry;
      } else {
        data.premiumPlan = null;
        data.premiumSince = null;
        data.premiumExpiry = null;
      }

      const user = await prisma.user.update({
        where: { clerkId },
        data,
      });

      console.log('✅ Premium status updated:', user.id, isPremium);
      return user;
    } catch (error) {
      console.error('❌ Error updating premium status:', error);
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(
    clerkId: string,
    settings: {
      notificationsEnabled?: boolean;
      soundEnabled?: boolean;
      vibrationEnabled?: boolean;
    }
  ) {
    try {
      const user = await prisma.user.update({
        where: { clerkId },
        data: {
          ...settings,
          updatedAt: new Date(),
        },
      });

      console.log('✅ Settings updated:', user.id);
      return user;
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(clerkId: string) {
    try {
      await prisma.user.update({
        where: { clerkId },
        data: { lastActiveAt: new Date() },
      });
    } catch (error) {
      console.error('❌ Error updating last active:', error);
    }
  }

  /**
   * Delete user
   */
  async deleteUser(clerkId: string) {
    try {
      await prisma.user.delete({
        where: { clerkId },
      });

      console.log('✅ User deleted:', clerkId);
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get user's partner
   */
  async getUserPartner(clerkId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId },
        include: {
          pairAsUser1: {
            include: {
              user2: true,
            },
          },
          pairAsUser2: {
            include: {
              user1: true,
            },
          },
        },
      });

      if (!user) return null;

      // Return partner
      if (user.pairAsUser1) {
        return user.pairAsUser1.user2;
      } else if (user.pairAsUser2) {
        return user.pairAsUser2.user1;
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting partner:', error);
      throw error;
    }
  }
}

export default new UserService();
