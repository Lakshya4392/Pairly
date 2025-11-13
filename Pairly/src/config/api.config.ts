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
  // ALWAYS use environment variable if set (highest priority)
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  if (envApiUrl && envApiUrl.trim() !== '') {
    console.log('✅ Using API URL from .env:', envApiUrl);
    return envApiUrl;
  }

  // Fallback to production URL
  console.log('⚠️ No .env API URL found, using production URL');
  return 'https://pairly-60qj.onrender.com';
};

/**
 * Get Socket.IO URL
 */
export const getSocketUrl = (): string => {
  const envSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  
  if (envSocketUrl && envSocketUrl.trim() !== '') {
    console.log('✅ Using Socket URL from .env:', envSocketUrl);
    return envSocketUrl;
  }

  // Use same as API URL
  const apiUrl = getApiUrl();
  console.log('✅ Using Socket URL same as API:', apiUrl);
  return apiUrl;
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  baseUrl: getApiUrl(),
  socketUrl: getSocketUrl(),
  timeout: 10000, // 10 seconds (reduced for faster failure)
  retryAttempts: 2, // Reduced retries
  retryDelay: 500, // 0.5 second (faster retry)
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
}
