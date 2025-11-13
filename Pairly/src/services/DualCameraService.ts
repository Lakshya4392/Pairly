import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

interface DualMoment {
  id: string;
  title: string;
  myPhoto?: string;
  partnerPhoto?: string;
  createdAt: Date;
  completedAt?: Date;
  isComplete: boolean;
}

class DualCameraService {
  private static STORAGE_KEY = '@pairly_dual_moments';

  /**
   * Create a new dual camera moment
   */
  static async createDualMoment(title: string, photoUri: string, token: string): Promise<{
    success: boolean;
    momentId?: string;
    error?: string;
  }> {
    try {
      // Save to backend
      const response = await fetch(`${API_CONFIG.baseUrl}/dual-moments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          photoUri,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Failed to create dual moment' };
      }

      const data = await response.json();

      // Save locally
      await this.saveDualMomentLocally({
        id: data.data.id,
        title,
        myPhoto: photoUri,
        createdAt: new Date(),
        isComplete: false,
      });

      console.log('✅ Dual moment created:', data.data.id);
      return { success: true, momentId: data.data.id };
    } catch (error) {
      console.error('❌ Error creating dual moment:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Get all dual moments
   */
  static async getAllDualMoments(): Promise<DualMoment[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];

      const moments: DualMoment[] = JSON.parse(data);
      
      // Convert date strings back to Date objects
      return moments.map(m => ({
        ...m,
        createdAt: new Date(m.createdAt),
        completedAt: m.completedAt ? new Date(m.completedAt) : undefined,
      }));
    } catch (error) {
      console.error('Error loading dual moments:', error);
      return [];
    }
  }

  /**
   * Get pending dual moments (waiting for partner)
   */
  static async getPendingDualMoments(): Promise<DualMoment[]> {
    const all = await this.getAllDualMoments();
    return all.filter(m => !m.isComplete);
  }

  /**
   * Get completed dual moments
   */
  static async getCompletedDualMoments(): Promise<DualMoment[]> {
    const all = await this.getAllDualMoments();
    return all.filter(m => m.isComplete);
  }

  /**
   * Update dual moment when partner adds their photo
   */
  static async updateDualMoment(momentId: string, partnerPhoto: string): Promise<void> {
    try {
      const moments = await this.getAllDualMoments();
      const index = moments.findIndex(m => m.id === momentId);

      if (index !== -1) {
        moments[index].partnerPhoto = partnerPhoto;
        moments[index].isComplete = true;
        moments[index].completedAt = new Date();

        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(moments));
        console.log('✅ Dual moment completed:', momentId);
      }
    } catch (error) {
      console.error('Error updating dual moment:', error);
    }
  }

  /**
   * Save dual moment locally
   */
  private static async saveDualMomentLocally(moment: DualMoment): Promise<void> {
    try {
      const moments = await this.getAllDualMoments();
      moments.unshift(moment);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(moments));
    } catch (error) {
      console.error('Error saving dual moment locally:', error);
    }
  }

  /**
   * Delete dual moment
   */
  static async deleteDualMoment(momentId: string): Promise<void> {
    try {
      const moments = await this.getAllDualMoments();
      const filtered = moments.filter(m => m.id !== momentId);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      console.log('✅ Dual moment deleted:', momentId);
    } catch (error) {
      console.error('Error deleting dual moment:', error);
    }
  }

  /**
   * Sync with backend to check for partner's photos
   */
  static async syncWithBackend(token: string): Promise<void> {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/dual-moments/pending`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn('Could not sync dual moments');
        return;
      }

      const data = await response.json();
      
      // Update local storage with completed moments
      if (data.data && data.data.length > 0) {
        for (const moment of data.data) {
          if (moment.isComplete && moment.partnerPhoto) {
            await this.updateDualMoment(moment.id, moment.partnerPhoto);
          }
        }
      }

      console.log('✅ Dual moments synced');
    } catch (error) {
      console.warn('Could not sync dual moments:', error);
    }
  }

  /**
   * Clear all dual moments
   */
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('✅ All dual moments cleared');
    } catch (error) {
      console.error('Error clearing dual moments:', error);
    }
  }
}

export default DualCameraService;
