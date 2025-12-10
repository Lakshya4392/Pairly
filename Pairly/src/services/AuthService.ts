import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse, ApiResponse } from '@types';
import apiClient from '../utils/apiClient';

const TOKEN_KEY = 'pairly_auth_token';
const USER_KEY = 'pairly_user';

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  /**
   * Store authentication token securely with AsyncStorage backup
   */
  async storeToken(token: string): Promise<void> {
    try {
      // Store in SecureStore
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      console.log('✅ Token stored in SecureStore');
      
      // Also store in AsyncStorage as backup for APK
      await AsyncStorage.setItem(`${TOKEN_KEY}_backup`, token);
      await AsyncStorage.setItem('auth_token', token); // For socket auth
      console.log('✅ Token backup stored in AsyncStorage');
      
      this.token = token;

      // ⚡ SIMPLE: Save token for widget (Android only)
      try {
        const { Platform, NativeModules } = await import('react-native');
        if (Platform.OS === 'android' && NativeModules.PairlyWidget) {
          await NativeModules.PairlyWidget.saveAuthToken(token);
          await NativeModules.PairlyWidget.saveBackendUrl('https://pairly-backend.onrender.com');
          console.log('✅ Token saved for widget');
        }
      } catch (widgetError) {
        console.log('⚠️ Widget token save failed (non-critical):', widgetError);
      }
    } catch (error) {
      console.error('Error storing token:', error);
      // Try AsyncStorage as fallback
      try {
        await AsyncStorage.setItem(`${TOKEN_KEY}_backup`, token);
        await AsyncStorage.setItem('auth_token', token);
        this.token = token;
        console.log('✅ Token stored in AsyncStorage fallback');
      } catch (fallbackError) {
        console.error('AsyncStorage fallback failed:', fallbackError);
        throw error;
      }
    }
  }

  /**
   * Get stored authentication token with AsyncStorage fallback
   */
  async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }

    try {
      // Try SecureStore first
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        this.token = token;
        console.log('✅ Token retrieved from SecureStore');
        return token;
      }
      
      // Fallback to AsyncStorage
      const backupToken = await AsyncStorage.getItem(`${TOKEN_KEY}_backup`);
      if (backupToken) {
        this.token = backupToken;
        console.log('✅ Token retrieved from AsyncStorage backup');
        return backupToken;
      }
      
      // Try auth_token key
      const authToken = await AsyncStorage.getItem('auth_token');
      if (authToken) {
        this.token = authToken;
        console.log('✅ Token retrieved from auth_token');
        return authToken;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting token:', error);
      // Try AsyncStorage as last resort
      try {
        const backupToken = await AsyncStorage.getItem(`${TOKEN_KEY}_backup`);
        if (backupToken) {
          this.token = backupToken;
          return backupToken;
        }
      } catch (fallbackError) {
        console.error('AsyncStorage fallback failed:', fallbackError);
      }
      return null;
    }
  }

  /**
   * Remove authentication token from all storages
   */
  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await AsyncStorage.removeItem(`${TOKEN_KEY}_backup`);
      await AsyncStorage.removeItem('auth_token');
      this.token = null;
      console.log('✅ Token removed from all storages');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  /**
   * Store user data
   */
  async storeUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      this.user = user;
    } catch (error) {
      console.error('Error storing user:', error);
      throw error;
    }
  }

  /**
   * Get stored user data
   */
  async getUser(): Promise<User | null> {
    if (this.user) {
      return this.user;
    }

    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      if (userJson) {
        this.user = JSON.parse(userJson);
        return this.user;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Remove user data
   */
  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
      this.user = null;
    } catch (error) {
      console.error('Error removing user:', error);
    }
  }

  /**
   * Authenticate with backend using Clerk token
   */
  async authenticateWithBackend(clerkToken: string, retryCount: number = 0): Promise<AuthResponse> {
    try {
      console.log('🔐 Sending Clerk token to backend...');
      
      const data = await apiClient.post<ApiResponse<AuthResponse>>(
        '/auth/google', 
        { idToken: clerkToken },
        { skipAuth: true } // Skip automatic auth header for this endpoint
      );

      if (!data.success || !data.data) {
        throw new Error('Invalid response from backend');
      }

      console.log('✅ Received backend JWT token');

      // Store token and user
      await this.storeToken(data.data.token);
      await this.storeUser(data.data.user);

      return data.data;
    } catch (error: any) {
      console.error('❌ Backend authentication error:', error.message);
      
      // Handle token expiration - get fresh Clerk token and retry once
      if (error.message && error.message.includes('expired') && retryCount === 0) {
        console.log('⚠️ Token expired, getting fresh Clerk token...');
        try {
          // Import Clerk auth dynamically to avoid circular dependency
          const { useAuth } = await import('@clerk/clerk-expo');
          // Note: This won't work in service context, needs to be called from component
          // For now, just throw the error and let the component handle refresh
          throw new Error('TOKEN_EXPIRED');
        } catch (refreshError) {
          throw new Error('TOKEN_EXPIRED');
        }
      }
      
      // Handle specific protocol errors
      if (error.message && error.message.includes('protocol')) {
        console.log('⚠️ Protocol error detected, switching to offline mode');
        throw new Error('Network configuration error - using offline mode');
      }
      
      // Create a fallback user from Clerk token if backend is not available
      if (error.name === 'TimeoutError' || (error instanceof TypeError && error.message.includes('Network request failed'))) {
        console.log('⚠️ Backend not available, creating offline user');
        // You can decode the Clerk token to get user info if needed
        // For now, we'll just throw the error and let the app continue without backend auth
      }
      
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  /**
   * Sign out user - Clear all data
   */
  async signOut(): Promise<void> {
    console.log('🔄 Signing out and clearing all data...');
    
    try {
      // 1. Disconnect socket first
      try {
        const RealtimeService = (await import('./RealtimeService')).default;
        RealtimeService.disconnect();
        console.log('✅ Socket disconnected');
      } catch (error) {
        console.error('Error disconnecting socket:', error);
      }
      
      // 2. Clear auth data
      await this.removeToken();
      await this.removeUser();
      console.log('✅ Auth data cleared');
      
      // 3. Clear pairing data
      try {
        await AsyncStorage.multiRemove([
          'pairly_pair',
          'partner_info',
          'partner_id',
          'current_invite_code',
          'code_expires_at',
          'offline_invite_code',
          'offline_code_timestamp',
        ]);
        console.log('✅ Pairing data cleared');
      } catch (error) {
        console.error('Error clearing pairing data:', error);
      }
      
      // 4. Clear widget data
      try {
        await AsyncStorage.multiRemove([
          'pairly_widget_data',
          '@pairly_widget_enabled',
        ]);
        console.log('✅ Widget data cleared');
      } catch (error) {
        console.error('Error clearing widget data:', error);
      }
      
      // 5. Clear all other app data
      try {
        const keys = await AsyncStorage.getAllKeys();
        const pairlyKeys = keys.filter(key => 
          key.startsWith('@pairly_') || 
          key.startsWith('pairly_') ||
          key.includes('moment') ||
          key.includes('photo')
        );
        if (pairlyKeys.length > 0) {
          await AsyncStorage.multiRemove(pairlyKeys);
          console.log(`✅ Cleared ${pairlyKeys.length} app data keys`);
        }
      } catch (error) {
        console.error('Error clearing app data:', error);
      }
      
      console.log('✅ Sign out complete - All data cleared');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get authorization header
   */
  async getAuthHeader(): Promise<{ Authorization: string } | {}> {
    const token = await this.getToken();
    
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    
    return {};
  }

  /**
   * Refresh token (if needed)
   */
  async refreshToken(): Promise<void> {
    // Implement token refresh logic if needed
    // For now, Clerk handles token refresh automatically
  }
}

export default new AuthService();
