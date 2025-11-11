import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

interface AppLockSettings {
  enabled: boolean;
  useBiometric: boolean;
  requireOnStartup: boolean;
  requireOnBackground: boolean;
}

class AppLockService {
  private static SETTINGS_KEY = '@pairly_app_lock';
  private static PIN_KEY = '@pairly_pin';
  private static isUnlocked = false;

  // Get app lock settings
  static async getSettings(): Promise<AppLockSettings> {
    try {
      const data = await AsyncStorage.getItem(this.SETTINGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error getting app lock settings:', error);
    }

    return {
      enabled: false,
      useBiometric: false,
      requireOnStartup: true,
      requireOnBackground: true,
    };
  }

  // Enable app lock with PIN
  static async enableAppLock(pin: string): Promise<boolean> {
    try {
      // Save PIN securely
      await SecureStore.setItemAsync(this.PIN_KEY, pin);

      // Update settings
      const settings: AppLockSettings = {
        enabled: true,
        useBiometric: false,
        requireOnStartup: true,
        requireOnBackground: true,
      };
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));

      console.log('✅ App lock enabled');
      return true;
    } catch (error) {
      console.error('Error enabling app lock:', error);
      return false;
    }
  }

  // Disable app lock
  static async disableAppLock(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(this.PIN_KEY);
      
      const settings: AppLockSettings = {
        enabled: false,
        useBiometric: false,
        requireOnStartup: true,
        requireOnBackground: true,
      };
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));

      this.isUnlocked = false;
      console.log('✅ App lock disabled');
      return true;
    } catch (error) {
      console.error('Error disabling app lock:', error);
      return false;
    }
  }

  // Verify PIN
  static async verifyPIN(pin: string): Promise<boolean> {
    try {
      const savedPIN = await SecureStore.getItemAsync(this.PIN_KEY);
      const isValid = savedPIN === pin;
      
      if (isValid) {
        this.isUnlocked = true;
      }
      
      return isValid;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }

  // Check if biometric is available
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric:', error);
      return false;
    }
  }

  // Authenticate with biometric
  static async authenticateWithBiometric(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Pairly',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        this.isUnlocked = true;
      }

      return result.success;
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      return false;
    }
  }

  // Enable biometric
  static async enableBiometric(): Promise<boolean> {
    try {
      const available = await this.isBiometricAvailable();
      if (!available) {
        return false;
      }

      const settings = await this.getSettings();
      settings.useBiometric = true;
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));

      console.log('✅ Biometric enabled');
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  }

  // Check if app is locked
  static async isLocked(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.enabled && !this.isUnlocked;
  }

  // Lock app
  static lock(): void {
    this.isUnlocked = false;
  }

  // Unlock app
  static unlock(): void {
    this.isUnlocked = true;
  }

  // Check if unlocked
  static isAppUnlocked(): boolean {
    return this.isUnlocked;
  }
}

export default AppLockService;
