import { API_CONFIG } from '../config/api.config';
import PremiumService from './PremiumService';

export interface TimeLockMessage {
  id: string;
  content: string;
  photoUri?: string;
  unlockDate: Date;
  isDelivered: boolean;
  deliveredAt?: Date;
  createdAt: Date;
}

class TimeLockService {
  /**
   * Create a time-lock message
   */
  static async createTimeLock(
    content: string,
    unlockDate: Date,
    token: string,
    photoUri?: string
  ): Promise<{ success: boolean; error?: string; message?: TimeLockMessage }> {
    try {
      // Check if user has premium
      const hasPremium = await PremiumService.isPremium();
      if (!hasPremium) {
        return {
          success: false,
          error: 'Premium feature',
        };
      }

      // Validate content
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: 'Message cannot be empty',
        };
      }

      if (content.length > 1000) {
        return {
          success: false,
          error: 'Message is too long (max 1000 characters)',
        };
      }

      // Validate unlock date
      const now = new Date();
      if (unlockDate <= now) {
        return {
          success: false,
          error: 'Unlock date must be in the future',
        };
      }

      const response = await fetch(`${API_CONFIG.baseUrl}/timelock/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          unlockDate: unlockDate.toISOString(),
          photoUri,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to create time-lock message',
        };
      }

      console.log('✅ Time-lock message created');
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      console.error('Error creating time-lock:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get pending time-lock messages
   */
  static async getPendingMessages(
    token: string
  ): Promise<{ success: boolean; messages?: TimeLockMessage[]; error?: string }> {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/timelock/pending`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch messages',
        };
      }

      return {
        success: true,
        messages: data.messages || [],
      };
    } catch (error) {
      console.error('Error fetching time-lock messages:', error);
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  /**
   * Delete a time-lock message
   */
  static async deleteMessage(
    messageId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/timelock/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to delete message',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting time-lock message:', error);
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  /**
   * Get time remaining until unlock
   */
  static getTimeRemaining(unlockDate: Date): string {
    const now = new Date();
    const diffMs = unlockDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Unlocked';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

export default TimeLockService;
