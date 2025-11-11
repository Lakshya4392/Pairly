/**
 * Startup Validation System
 * Validates all app dependencies and configurations before loading
 */

import { CLERK_PUBLISHABLE_KEY, API_BASE_URL } from '@env';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StartupChecks {
  environment: ValidationResult;
  storage: ValidationResult;
  network: ValidationResult;
  dependencies: ValidationResult;
}

class StartupValidator {
  /**
   * Run all startup validations
   */
  static async validateAll(): Promise<StartupChecks> {
    const results: StartupChecks = {
      environment: await this.validateEnvironment(),
      storage: await this.validateStorage(),
      network: await this.validateNetwork(),
      dependencies: await this.validateDependencies(),
    };

    return results;
  }

  /**
   * Validate environment variables
   */
  private static async validateEnvironment(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    if (!CLERK_PUBLISHABLE_KEY) {
      errors.push('CLERK_PUBLISHABLE_KEY is not configured');
    } else if (!CLERK_PUBLISHABLE_KEY.startsWith('pk_')) {
      warnings.push('CLERK_PUBLISHABLE_KEY format may be incorrect');
    }

    if (!API_BASE_URL) {
      warnings.push('API_BASE_URL is not configured - app will run in offline mode');
    } else {
      // Validate URL format
      try {
        new URL(API_BASE_URL);
      } catch {
        warnings.push('API_BASE_URL format is invalid');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate storage systems
   */
  private static async validateStorage(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Test SecureStore
      const testKey = 'pairly_startup_test';
      const testValue = 'test_value';
      
      await SecureStore.setItemAsync(testKey, testValue);
      const retrieved = await SecureStore.getItemAsync(testKey);
      
      if (retrieved !== testValue) {
        errors.push('SecureStore read/write test failed');
      }
      
      await SecureStore.deleteItemAsync(testKey);
    } catch (error) {
      errors.push(`SecureStore error: ${error}`);
    }

    try {
      // Test AsyncStorage
      const testKey = 'pairly_async_test';
      const testValue = 'test_value';
      
      await AsyncStorage.setItem(testKey, testValue);
      const retrieved = await AsyncStorage.getItem(testKey);
      
      if (retrieved !== testValue) {
        errors.push('AsyncStorage read/write test failed');
      }
      
      await AsyncStorage.removeItem(testKey);
    } catch (error) {
      errors.push(`AsyncStorage error: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate network connectivity
   */
  private static async validateNetwork(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Test basic fetch capability
      if (typeof fetch === 'undefined') {
        errors.push('Fetch API is not available');
        return { isValid: false, errors, warnings };
      }

      // Test AbortController
      if (typeof AbortController === 'undefined') {
        warnings.push('AbortController is not available - using polyfill');
      }

      // Test network connectivity (if API_BASE_URL is available)
      if (API_BASE_URL) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            warnings.push(`Backend health check failed: ${response.status}`);
          }
        } catch (networkError: any) {
          if (networkError.name === 'AbortError') {
            warnings.push('Backend connection timeout - will use offline mode');
          } else {
            warnings.push(`Backend not reachable: ${networkError.message}`);
          }
        }
      }
    } catch (error) {
      warnings.push(`Network validation error: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate critical dependencies
   */
  private static async validateDependencies(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check React Native modules
    const requiredModules = [
      'react-native-safe-area-context',
      'react-native-paper',
      '@clerk/clerk-expo',
      'expo-secure-store',
    ];

    for (const moduleName of requiredModules) {
      try {
        require(moduleName);
      } catch (error) {
        errors.push(`Required module not found: ${moduleName}`);
      }
    }

    // Check global objects
    if (typeof globalThis === 'undefined') {
      warnings.push('globalThis is not available - may cause compatibility issues');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get validation summary
   */
  static getValidationSummary(checks: StartupChecks): {
    isAppReady: boolean;
    criticalErrors: string[];
    allWarnings: string[];
  } {
    const criticalErrors: string[] = [];
    const allWarnings: string[] = [];

    Object.values(checks).forEach(result => {
      criticalErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    });

    return {
      isAppReady: criticalErrors.length === 0,
      criticalErrors,
      allWarnings,
    };
  }
}

export default StartupValidator;