import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse, ApiResponse } from '@types';
import apiClient from '../utils/apiClient';
import { API_CONFIG } from '../config/api.config';
import Logger from '../utils/Logger';

const USER_KEY = 'pairly_user';

class AuthService {
  private user: User | null = null;
  private clerkGetTokenFn: (() => Promise<string | null>) | null = null;

  /**
   * Register the live Clerk getToken function.
   * Called once by AppNavigator when it mounts.
   */
  setClerkTokenGetter(fn: () => Promise<string | null>): void {
    this.clerkGetTokenFn = fn;
    console.log('✅ Live Clerk token getter registered');
  }

  /**
   * Get authentication token - ALWAYS fresh from Clerk
   * Falls back to AsyncStorage cache only if live getter unavailable
   */
  async getToken(): Promise<string | null> {
    try {
      // Priority 1: Always get a FRESH token from the live Clerk session
      if (this.clerkGetTokenFn) {
        const freshToken = await this.clerkGetTokenFn();
        if (freshToken) {
          // Also update AsyncStorage cache for widgets/background tasks
          await AsyncStorage.setItem('auth_token', freshToken);
          return freshToken;
        }
      }

      // Priority 2: Fall back to cached token (may be expired but better than nothing)
      const authToken = await AsyncStorage.getItem('auth_token');
      if (authToken) {
        console.warn('⚠️ Using cached auth token (live getter unavailable)');
        return authToken;
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      // Last resort fallback to cache
      try {
        return await AsyncStorage.getItem('auth_token');
      } catch {
        return null;
      }
    }
  }

  /**
   * Sync active Clerk token for background/widget tasks
   * Called by AppNavigator whenever a new session starts
   */
  async syncActiveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_token', token);

      // Sync to SharedPreferences for widget access
      try {
        const WidgetAuthService = (await import('./WidgetAuthService')).default;
        await WidgetAuthService.syncAuthToken();
      } catch (widgetError) {
        console.log('⚠️ Widget auth sync failed (non-critical):', widgetError);
      }

      // Save token for Android widget
      try {
        const { Platform, NativeModules } = await import('react-native');
        if (Platform.OS === 'android' && NativeModules.PairlyWidget) {
          await NativeModules.PairlyWidget.saveAuthToken(token);
          await NativeModules.PairlyWidget.saveBackendUrl(API_CONFIG.baseUrl);
          console.log('✅ Clerk Token saved for native widget');
        }
      } catch (widgetError) {
        console.log('⚠️ Widget token save failed (non-critical):', widgetError);
      }
    } catch (error) {
      console.error('Error syncing active token:', error);
    }
  }

  /**
   * Remove authentication token from all storages
   */
  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
      console.log('✅ Active token reference removed');
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
   * DEPRECATED: We no longer fetch custom JWTs from the backend. 
   * This function now simply updates local user data.
   */
  async authenticateWithBackend(clerkToken: string, retryCount: number = 0): Promise<{ success: boolean }> {
    try {
      Logger.debug('✅ Backend authentication is now native. Skipping /auth/google.');
      // The token is pushed locally so api requests and widgets can use it
      await this.syncActiveToken(clerkToken);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Authentication mock error:', error.message);
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
