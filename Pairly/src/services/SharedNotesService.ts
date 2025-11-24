import apiClient from '../utils/apiClient';
import PremiumService from './PremiumService';
import SafeOperations from '../utils/SafeOperations';

export interface SharedNote {
  id: string;
  content: string;
  senderName: string;
  createdAt: string;
  expiresAt?: string;
}

class SharedNotesService {
  /**
   * Send a shared note to partner
   * BULLETPROOF: No dismiss errors, fast, reliable
   */
  async sendNote(
    content: string,
    expiresIn24h: boolean = false
  ): Promise<{ success: boolean; error?: string; note?: SharedNote }> {
    return SafeOperations.executeWithTimeout(
      async () => {
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
            error: 'Note cannot be empty',
          };
        }

        if (content.length > 500) {
          return {
            success: false,
            error: 'Note is too long (max 500 characters)',
          };
        }

        const data = await apiClient.post<{ note: SharedNote }>('/notes/send', {
          content: content.trim(),
          expiresIn24h,
        });

        console.log('✅ Note sent successfully');
        return {
          success: true,
          note: data.note,
        };
      },
      10000, // 10 second timeout
      'Note sending timed out'
    ).then(result => {
      if (result.success && result.data) {
        return result.data;
      }
      return {
        success: false,
        error: result.error || 'Failed to send note',
      };
    });
  }

  /**
   * Get recent notes
   */
  async getRecentNotes(
    limit: number = 10
  ): Promise<{ success: boolean; notes?: SharedNote[]; error?: string }> {
    try {
      const data = await apiClient.get<{ notes: SharedNote[] }>(
        `/notes/recent?limit=${limit}`
      );

      return {
        success: true,
        notes: data.notes || [],
      };
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  /**
   * Delete a note
   */
  async deleteNote(
    noteId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.delete(`/notes/${noteId}`);
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting note:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }
}

export default new SharedNotesService();
