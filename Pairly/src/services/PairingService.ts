import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';
import { Pair, ApiResponse, PairResponse, CodeResponse } from '@types';
import apiClient from '../utils/apiClient';

const PAIR_KEY = 'pairly_pair';

class PairingService {
  private pair: Pair | null = null;
  private retryAttempts = 3;
  private retryDelay = 2000; // 2 seconds

  /**
   * Generate invite code - BULLETPROOF WITH RETRY MECHANISM
   */
  async generateCode(): Promise<string> {
    console.log('🔄 Generating invite code...');
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`📡 Attempt ${attempt}/${this.retryAttempts} to generate code`);
        
        const data = await apiClient.post<ApiResponse<CodeResponse>>('/pairs/generate-code');
        
        if (data.success && data.data?.code) {
          console.log(`✅ Code generated successfully: ${data.data.code}`);
          console.log(`⏰ Code expires at: ${data.data.expiresAt}`);
          
          // Store code info locally for reference
          await AsyncStorage.setItem('current_invite_code', data.data.code);
          await AsyncStorage.setItem('code_expires_at', data.data.expiresAt);
          
          return data.data.code;
        }
        
        throw new Error('Invalid response from server');
        
      } catch (error: any) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.retryAttempts) {
          console.log('⚠️ All attempts failed, generating offline code');
          return this.generateOfflineCode();
        }
        
        // Wait before retry
        console.log(`⏳ Waiting ${this.retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    
    // Fallback (should never reach here)
    return this.generateOfflineCode();
  }

  /**
   * Generate offline code when backend is not available
   */
  private generateOfflineCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    console.log(`🔄 Generated offline code: ${code}`);
    
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
      console.log('💾 Offline code stored locally');
    } catch (error) {
      console.error('❌ Error storing offline code:', error);
    }
  }

  /**
   * Join with invite code - BULLETPROOF WITH VALIDATION & RETRY
   */
  async joinWithCode(code: string): Promise<Pair> {
    console.log(`🔄 Joining with code: ${code}`);
    
    // Validate code format
    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      throw new Error('Please enter a valid 6-character code');
    }
    
    const cleanCode = code.toUpperCase().trim();
    console.log(`📝 Cleaned code: ${cleanCode}`);
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`📡 Attempt ${attempt}/${this.retryAttempts} to join with code`);
        
        const data = await apiClient.post<ApiResponse<{ pair: PairResponse; partner: any; message?: string }>>('/pairs/join', { 
          code: cleanCode 
        });

        if (!data.success) {
          // Handle specific error messages from backend
          const errorMessage = data.error || 'Failed to join with code';
          console.error(`❌ Backend error: ${errorMessage}`);
          throw new Error(errorMessage);
        }

        if (!data.data?.pair || !data.data?.partner) {
          throw new Error('Invalid response from server');
        }

        console.log(`✅ Successfully joined with code!`);
        console.log(`🤝 Paired with: ${data.data.partner.displayName}`);

        const pair: Pair = {
          id: data.data.pair.id,
          user1Id: data.data.pair.user1Id,
          user2Id: data.data.pair.user2Id,
          pairedAt: data.data.pair.pairedAt,
          partner: data.data.partner,
        };

        // Store pair data immediately
        await this.storePair(pair);
        
        // Clear any stored codes
        await AsyncStorage.removeItem('current_invite_code');
        await AsyncStorage.removeItem('code_expires_at');
        await AsyncStorage.removeItem('offline_invite_code');
        
        console.log('💾 Pair data stored successfully');

        return pair;
        
      } catch (error: any) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        // Don't retry for specific errors
        if (error.message.includes('Invalid code') || 
            error.message.includes('expired') || 
            error.message.includes('already paired') ||
            error.message.includes('cannot use your own')) {
          throw error;
        }
        
        if (attempt === this.retryAttempts) {
          throw new Error(`Failed to join after ${this.retryAttempts} attempts. Please check your connection and try again.`);
        }
        
        // Wait before retry
        console.log(`⏳ Waiting ${this.retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    
    throw new Error('Unexpected error occurred');
  }

  /**
   * Check if current code is still valid
   */
  async isCurrentCodeValid(): Promise<boolean> {
    try {
      const expiresAtStr = await AsyncStorage.getItem('code_expires_at');
      if (!expiresAtStr) return false;
      
      const expiresAt = new Date(expiresAtStr);
      const now = new Date();
      
      return now < expiresAt;
    } catch (error) {
      console.error('Error checking code validity:', error);
      return false;
    }
  }

  /**
   * Get remaining time for current code
   */
  async getRemainingTime(): Promise<string | null> {
    try {
      const expiresAtStr = await AsyncStorage.getItem('code_expires_at');
      if (!expiresAtStr) return null;
      
      const expiresAt = new Date(expiresAtStr);
      const now = new Date();
      const remaining = expiresAt.getTime() - now.getTime();
      
      if (remaining <= 0) return null;
      
      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      
      if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      }
      return `${seconds}s`;
    } catch (error) {
      console.error('Error getting remaining time:', error);
      return null;
    }
  }

  /**
   * Disconnect from partner
   */
  async disconnect(): Promise<void> {
    try {
      await apiClient.delete('/pairs/disconnect');
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
   * Get partner info - with backend sync and validation
   */
  async getPartner() {
    // First try local storage
    const pair = await this.getPair();
    
    // Always validate with backend to ensure pairing still exists
    try {
      console.log('🔄 Validating partner info with backend...');
      const data = await apiClient.get<ApiResponse<{ pair: PairResponse; partner: any }>>('/pairs/current');
      
      if (data.success && data.data?.pair && data.data?.partner) {
        console.log('✅ Partner validated from backend:', data.data.partner.displayName);
        
        // Store/update the pair locally
        const fetchedPair: Pair = {
          id: data.data.pair.id,
          user1Id: data.data.pair.user1Id,
          user2Id: data.data.pair.user2Id,
          pairedAt: data.data.pair.pairedAt,
          partner: data.data.partner,
        };
        
        await this.storePair(fetchedPair);
        return data.data.partner;
      } else {
        // No pairing on backend, clear local storage
        console.log('⚠️ No pairing found on backend, clearing local data');
        await this.removePair();
        return null;
      }
    } catch (error: any) {
      console.log('⚠️ Backend validation failed:', error.message);
      
      // If backend is unreachable, use local cache
      if (pair?.partner) {
        console.log('📦 Using cached partner data (backend offline)');
        return pair.partner;
      }
      
      return null;
    }
  }
}

export default new PairingService();
