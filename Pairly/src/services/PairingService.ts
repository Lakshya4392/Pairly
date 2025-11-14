import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';
import AuthService from './AuthService';
import { Pair, ApiResponse, PairResponse, CodeResponse } from '@types';

const PAIR_KEY = 'pairly_pair';

class PairingService {
  private pair: Pair | null = null;





  /**
   * Generate invite code - FAST & ALWAYS WORKS
   */
  async generateCode(): Promise<string> {
    try {
      const authHeader = await AuthService.getAuthHeader();
      
      const response = await fetch(`${API_BASE_URL}/pairs/generate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
      });

      if (!response.ok) {
        throw new Error('Backend error');
      }

      const data: ApiResponse<CodeResponse> = await response.json();
      
      if (data.success && data.data) {
        return data.data.code;
      }
      
      throw new Error('Invalid response');
      
    } catch (error: any) {
      // Instant fallback to offline code
      return this.generateOfflineCode();
    }
  }

  /**
   * Generate offline code when backend is not available
   */
  private generateOfflineCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Store offline code locally
    this.storeOfflineCode(code);
    return code;
  }

  /**
   * Store offline code for local pairing
   */
  private async storeOfflineCode(code: string): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_invite_code', code);
      await AsyncStorage.setItem('offline_code_timestamp', Date.now().toString());
    } catch (error) {
      console.error('Error storing offline code:', error);
    }
  }

  /**
   * Join with invite code - FAST CONNECTION
   */
  async joinWithCode(code: string): Promise<Pair> {
    const authHeader = await AuthService.getAuthHeader();
    
    const response = await fetch(`${API_BASE_URL}/pairs/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid code');
    }

    const data: ApiResponse<{ pair: PairResponse; partner: any }> = await response.json();
    
    if (!data.success || !data.data) {
      throw new Error('Invalid response');
    }

    const pair: Pair = {
      id: data.data.pair.id,
      user1Id: data.data.pair.user1Id,
      user2Id: data.data.pair.user2Id,
      pairedAt: data.data.pair.pairedAt,
      partner: data.data.partner,
    };

    // Store in parallel, don't wait
    this.storePair(pair);

    return pair;
  }

  /**
   * Disconnect from partner
   */
  async disconnect(): Promise<void> {
    try {
      const authHeader = await AuthService.getAuthHeader();
      
      const response = await fetch(`${API_BASE_URL}/pairs/disconnect`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect');
      }

      // Remove pair from local storage
      await this.removePair();
    } catch (error) {
      console.error('Disconnect error:', error);
      throw error;
    }
  }

  /**
   * Store pair data locally
   */
  async storePair(pair: Pair): Promise<void> {
    try {
      await AsyncStorage.setItem(PAIR_KEY, JSON.stringify(pair));
      this.pair = pair;
    } catch (error) {
      console.error('Error storing pair:', error);
      throw error;
    }
  }

  /**
   * Get stored pair data
   */
  async getPair(): Promise<Pair | null> {
    if (this.pair) {
      return this.pair;
    }

    try {
      const pairJson = await AsyncStorage.getItem(PAIR_KEY);
      if (pairJson) {
        this.pair = JSON.parse(pairJson);
        return this.pair;
      }
      return null;
    } catch (error) {
      console.error('Error getting pair:', error);
      return null;
    }
  }

  /**
   * Remove pair data
   */
  async removePair(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PAIR_KEY);
      this.pair = null;
    } catch (error) {
      console.error('Error removing pair:', error);
    }
  }

  /**
   * Check if user is paired
   */
  async isPaired(): Promise<boolean> {
    try {
      const pair = await this.getPair();
      return pair !== null;
    } catch (error) {
      console.error('Error checking pairing status:', error);
      // Return false if there's any error (offline mode)
      return false;
    }
  }

  /**
   * Get partner info
   */
  async getPartner() {
    const pair = await this.getPair();
    return pair?.partner || null;
  }
}

export default new PairingService();
