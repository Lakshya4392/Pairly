import ApiClient from '../utils/apiClient';
import Logger from '../utils/Logger';

class EffectService {
    /**
     * Send a Lock Screen Effect to partner
     */
    async sendEffect(): Promise<{ success: boolean; error?: string; remaining?: number }> {
        try {
            const response = await ApiClient.post('/notes/effect') as any;

            if (response.success) {
                return { success: true };
            } else {
                // Handle premium/limit errors naturally based on ApiResponse structure
                if (response.upgradeRequired) {
                    return { success: false, error: response.error || 'Premium required', remaining: 0 };
                }
                return { success: false, error: response.error || 'Failed to trigger effect' };
            }
        } catch (error: any) {
            Logger.error('Effect Service Error:', error);
            return { success: false, error: error.message || 'Network error' };
        }
    }
}

export default new EffectService();
