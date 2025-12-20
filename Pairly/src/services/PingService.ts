import { API_CONFIG } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * PingService - Handles "Thinking of You" ping functionality
 */
class PingService {
    /**
     * Get auth token from storage
     */
    private static async getToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem('auth_token');
        } catch {
            return null;
        }
    }

    /**
     * Send a "Thinking of You" ping to partner
     */
    static async sendPing(): Promise<{
        success: boolean;
        remaining: number | 'unlimited';
        error?: string;
    }> {
        try {
            const token = await this.getToken();
            if (!token) {
                return { success: false, remaining: 0, error: 'Not authenticated' };
            }

            const response = await fetch(`${API_CONFIG.baseUrl}/ping/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    remaining: data.remaining || 0,
                    error: data.error || 'Failed to send ping',
                };
            }

            return {
                success: true,
                remaining: data.remaining,
            };
        } catch (error) {
            console.error('Error sending ping:', error);
            return { success: false, remaining: 0, error: 'Network error' };
        }
    }

    /**
     * Get ping status (remaining count)
     */
    static async getStatus(): Promise<{
        sent: number;
        remaining: number | 'unlimited';
        limit: number | 'unlimited';
        isPremium: boolean;
    }> {
        try {
            const token = await this.getToken();
            if (!token) {
                return { sent: 0, remaining: 20, limit: 20, isPremium: false };
            }

            const response = await fetch(`${API_CONFIG.baseUrl}/ping/status`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                return { sent: 0, remaining: 20, limit: 20, isPremium: false };
            }

            return data.data;
        } catch (error) {
            console.error('Error getting ping status:', error);
            return { sent: 0, remaining: 20, limit: 20, isPremium: false };
        }
    }
}

export default PingService;
