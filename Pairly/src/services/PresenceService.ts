import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PresenceStatus {
  isOnline: boolean;
  lastSeen: Date | null;
  userId: string;
}

class PresenceService {
  private static STORAGE_KEY = '@pairly_partner_presence';
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Get partner's presence status
   */
  static async getPartnerPresence(): Promise<PresenceStatus | null> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const presence = JSON.parse(data);
        return {
          ...presence,
          lastSeen: presence.lastSeen ? new Date(presence.lastSeen) : null,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting partner presence:', error);
      return null;
    }
  }

  /**
   * Update partner's presence status
   */
  static async updatePartnerPresence(
    userId: string,
    isOnline: boolean,
    lastSeen?: Date
  ): Promise<void> {
    try {
      const presence: PresenceStatus = {
        userId,
        isOnline,
        lastSeen: lastSeen || new Date(),
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(presence));
      console.log('✅ Partner presence updated:', isOnline ? 'Online' : 'Offline');
    } catch (error) {
      console.error('Error updating partner presence:', error);
    }
  }

  /**
   * Clear partner presence (on logout)
   */
  static async clearPresence(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      console.log('✅ Presence cleared');
    } catch (error) {
      console.error('Error clearing presence:', error);
    }
  }

  /**
   * Get human-readable last seen text
   */
  static getLastSeenText(lastSeen: Date | null): string {
    if (!lastSeen) return 'Last seen recently';

    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return 'Last seen recently';
  }

  /**
   * Check if user was recently online (within 5 minutes)
   */
  static isRecentlyOnline(lastSeen: Date | null): boolean {
    if (!lastSeen) return false;
    
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    return diffMins < 5;
  }
}

export default PresenceService;
