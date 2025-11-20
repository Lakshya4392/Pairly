/**
 * API Configuration
 * Automatically detects environment and uses appropriate API URL
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Get API base URL based on environment
 */
export const getApiUrl = (): string => {
  // Use Render backend (works from any network)
  const renderUrl = 'https://pairly-60qj.onrender.com';
  console.log('✅ Using Render backend URL:', renderUrl);
  return renderUrl;
};

/**
 * Get Socket.IO URL
 */
export const getSocketUrl = (): string => {
  // Use Render backend (works from any network)
  const renderUrl = 'https://pairly-60qj.onrender.com';
  console.log('✅ Using Render Socket URL:', renderUrl);
  return renderUrl;
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  baseUrl: getApiUrl(),
  socketUrl: getSocketUrl(),
  timeout: 60000, // 60 seconds (for Render cold start on free tier)
  retryAttempts: 1, // Single retry only
  retryDelay: 1000, // 1 second delay
};

/**
 * Check if running in development mode
 */
export const isDevelopment = __DEV__;

/**
 * Check if running in production mode
 */
export const isProduction = !__DEV__;

/**
 * Log current configuration (development only)
 */
if (__DEV__) {
  console.log('📡 API Configuration:');
  console.log('  Base URL:', API_CONFIG.baseUrl);
  console.log('  Socket URL:', API_CONFIG.socketUrl);
  console.log('  Environment:', isDevelopment ? 'Development' : 'Production');
  console.log('  __DEV__:', __DEV__);
  console.log('  process.env.EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
}
