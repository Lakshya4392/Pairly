/**
 * APK-specific configuration
 * Optimized settings for production APK builds
 */

import { Platform } from 'react-native';

/**
 * Check if running in APK (production build)
 */
export const isAPK = !__DEV__ && Platform.OS === 'android';

/**
 * APK-specific settings
 */
export const APK_CONFIG = {
  // Socket settings optimized for APK
  socket: {
    timeout: isAPK ? 60000 : 20000, // 60s for APK, 20s for dev
    reconnectionAttempts: isAPK ? 10 : 5,
    reconnectionDelay: isAPK ? 3000 : 1000,
    reconnectionDelayMax: isAPK ? 30000 : 10000,
    pingTimeout: isAPK ? 60000 : 30000,
    pingInterval: isAPK ? 25000 : 15000,
  },
  
  // API settings
  api: {
    timeout: isAPK ? 30000 : 15000, // 30s for APK
    retryAttempts: isAPK ? 5 : 3,
    retryDelay: isAPK ? 2000 : 500,
  },
  
  // Storage settings
  storage: {
    useSecureStore: true,
    useAsyncStorageBackup: isAPK, // Always backup in APK
    persistTokens: true,
  },
  
  // Performance settings
  performance: {
    enableCache: true,
    cacheTimeout: 30000, // 30s cache
    preloadData: isAPK, // Preload data in APK
  },
};

/**
 * Log configuration on startup
 */
if (isAPK) {
  console.log('📱 Running in APK mode with optimized settings');
  console.log('⚙️ APK Config:', APK_CONFIG);
} else {
  console.log('🔧 Running in development mode');
}
