/**
 * App Configuration
 * Central place for app-wide settings
 */

export const APP_CONFIG = {
  // Logging
  enableDebugLogs: __DEV__, // Only in development
  enablePerformanceLogs: false, // Set to true to debug performance
  enableNetworkLogs: false, // Set to true to debug API calls
  
  // Performance
  enableConnectionPooling: true,
  socketReconnectDelay: 300, // ms
  socketTimeout: 5000, // ms
  maxReconnectAttempts: 5,
  
  // Caching
  partnerCacheDuration: 60000, // 1 minute
  photoCacheDuration: 300000, // 5 minutes
  premiumCacheDuration: 30000, // 30 seconds
  
  // Features
  enableWidgets: true,
  enableFCM: true,
  enablePresence: true,
  enablePerformanceMonitoring: true,
  
  // Limits
  maxPhotosInGallery: 100,
  maxRecentPhotos: 8,
  dailyMomentLimit: 3,
  
  // UI
  animationDuration: 300, // ms
  toastDuration: 3000, // ms
  refreshThreshold: 10000, // 10 seconds minimum between refreshes
};

// Helper to check if logging is enabled
export const shouldLog = (type: 'debug' | 'performance' | 'network' = 'debug'): boolean => {
  switch (type) {
    case 'debug':
      return APP_CONFIG.enableDebugLogs;
    case 'performance':
      return APP_CONFIG.enablePerformanceLogs;
    case 'network':
      return APP_CONFIG.enableNetworkLogs;
    default:
      return false;
  }
};

// Conditional logger
export const log = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.log(...args);
    }
  },
  performance: (...args: any[]) => {
    if (shouldLog('performance')) {
      console.log('⚡', ...args);
    }
  },
  network: (...args: any[]) => {
    if (shouldLog('network')) {
      console.log('🌐', ...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args);
  },
  warn: (...args: any[]) => {
    // Always log warnings
    console.warn(...args);
  },
};
