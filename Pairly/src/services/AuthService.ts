import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse } from '@types';
import apiClient from '../utils/apiClient';

const TOKEN_KEY = 'pairly_auth_token';
const USER_KEY = 'pairly_user';

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  /**
   * Store authentication token securely
   */
  async storeToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      this.token = token;
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  }

  /**
   * Get stored authentication token
   */
  async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      this.token = token;
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Remove authentication token
   */
  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      this.token = null;
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
  async authenticateWithBackend(clerkToken: string): Promise<AuthResponse> {
    try {
      console.log('🔐 Sending Clerk token to backend...');
      
      const data = await apiClient.post<AuthResponse>(
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
   * Sign out user
   */
  async signOut(): Promise<void> {
    await this.removeToken();
    await this.removeUser();
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
