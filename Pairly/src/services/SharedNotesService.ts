import { API_CONFIG } from '../config/api.config';
import PremiumService from './PremiumService';

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
   */
  static async sendNote(
    content: string,
    token: string,
    expiresIn24h: boolean = false
  ): Promise<{ success: boolean; error?: string; note?: SharedNote }> {
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
          error: 'Note cannot be empty',
        };
      }

      if (content.length > 500) {
        return {
          success: false,
          error: 'Note is too long (max 500 characters)',
        };
      }

      const response = await fetch(`${API_CONFIG.baseUrl}/notes/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          expiresIn24h,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to send note',
        };
      }

      console.log('✅ Note sent successfully');
      return {
        success: true,
        note: data.note,
      };
    } catch (error) {
      console.error('Error sending note:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get recent notes
   */
  static async getRecentNotes(
    token: string,
    limit: number = 10
  ): Promise<{ success: boolean; notes?: SharedNote[]; error?: string }> {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/notes/recent?limit=${limit}`,
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
          error: data.error || 'Failed to fetch notes',
        };
      }

      return {
        success: true,
        notes: data.notes || [],
      };
    } catch (error) {
      console.error('Error fetching notes:', error);
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  /**
   * Delete a note
   */
  static async deleteNote(
    noteId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/notes/${noteId}`, {
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
          error: data.error || 'Failed to delete note',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting note:', error);
      return {
        success: false,
        error: 'Network error',
      };
    }
  }
}

export default SharedNotesService;
