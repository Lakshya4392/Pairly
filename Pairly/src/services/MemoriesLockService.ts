import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

interface MemoriesLockSettings {
  enabled: boolean;
  useBiometric: boolean;
}

/**
 * MemoriesLockService - Lock your memories/gallery with PIN or biometric
 * Protects your private moments from prying eyes
 */
class MemoriesLockService {
  private static SETTINGS_KEY = 'pairly_memories_lock_settings';
  private static PIN_KEY = 'pairly_memories_pin_secure';
  private static isUnlocked = false;
  private static unlockTimestamp: number = 0;
  private static AUTO_LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get memories lock settings
   */
  static async getSettings(): Promise<MemoriesLockSettings> {
    try {
      const data = await AsyncStorage.getItem(`@${this.SETTINGS_KEY}`);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error getting memories lock settings:', error);
    }

    return {
      enabled: false,
      useBiometric: false,
    };
  }

  /**
   * Enable memories lock with PIN
   */
  static async enableMemoriesLock(pin: string): Promise<boolean> {
    try {
      // Validate PIN (must be 4-6 digits)
      if (!/^\d{4,6}$/.test(pin)) {
        console.error('Invalid PIN format');
        return false;
      }

      // Save PIN securely
      await SecureStore.setItemAsync(this.PIN_KEY, pin);

      // Update settings
      const settings: MemoriesLockSettings = {
        enabled: true,
        useBiometric: false,
      };
      await AsyncStorage.setItem(`@${this.SETTINGS_KEY}`, JSON.stringify(settings));

      console.log('✅ Memories lock enabled');
      return true;
    } catch (error) {
      console.error('Error enabling memories lock:', error);
      return false;
    }
  }

  /**
   * Disable memories lock
   */
  static async disableMemoriesLock(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(this.PIN_KEY);
      
      const settings: MemoriesLockSettings = {
        enabled: false,
        useBiometric: false,
      };
      await AsyncStorage.setItem(`@${this.SETTINGS_KEY}`, JSON.stringify(settings));

      this.isUnlocked = false;
      this.unlockTimestamp = 0;
      console.log('✅ Memories lock disabled');
      return true;
    } catch (error) {
      console.error('Error disabling memories lock:', error);
      return false;
    }
  }

  /**
   * Verify PIN
   */
  static async verifyPIN(pin: string): Promise<boolean> {
    try {
      const savedPIN = await SecureStore.getItemAsync(this.PIN_KEY);
      const isValid = savedPIN === pin;
      
      if (isValid) {
        this.isUnlocked = true;
        this.unlockTimestamp = Date.now();
        console.log('✅ Memories unlocked with PIN');
      }
      
      return isValid;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }

  /**
   * Check if biometric is available
   */
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

  /**
   * Get biometric type (Face ID, Touch ID, Fingerprint)
   */
  static async getBiometricType(): Promise<string> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Iris';
      }
      
      return 'Biometric';
    } catch (error) {
      console.error('Error getting biometric type:', error);
      return 'Biometric';
    }
  }

  /**
   * Authenticate with biometric
   */
  static async authenticateWithBiometric(): Promise<boolean> {
    try {
      const biometricType = await this.getBiometricType();
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Unlock Memories with ${biometricType}`,
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        this.isUnlocked = true;
        this.unlockTimestamp = Date.now();
        console.log('✅ Memories unlocked with biometric');
      }

      return result.success;
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication
   */
  static async enableBiometric(): Promise<boolean> {
    try {
      const available = await this.isBiometricAvailable();
      if (!available) {
        console.warn('Biometric not available');
        return false;
      }

      const settings = await this.getSettings();
      settings.useBiometric = true;
      await AsyncStorage.setItem(`@${this.SETTINGS_KEY}`, JSON.stringify(settings));

      console.log('✅ Biometric enabled for memories');
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  static async disableBiometric(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      settings.useBiometric = false;
      await AsyncStorage.setItem(`@${this.SETTINGS_KEY}`, JSON.stringify(settings));

      console.log('✅ Biometric disabled for memories');
      return true;
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return false;
    }
  }

  /**
   * Check if memories are locked
   */
  static async isLocked(): Promise<boolean> {
    const settings = await this.getSettings();
    
    if (!settings.enabled) {
      return false;
    }

    // Check if auto-lock duration has passed
    if (this.isUnlocked && this.unlockTimestamp > 0) {
      const timeSinceUnlock = Date.now() - this.unlockTimestamp;
      if (timeSinceUnlock > this.AUTO_LOCK_DURATION) {
        console.log('🔒 Auto-locking memories (5 minutes passed)');
        this.lock();
        return true;
      }
    }

    return !this.isUnlocked;
  }

  /**
   * Lock memories
   */
  static lock(): void {
    this.isUnlocked = false;
    this.unlockTimestamp = 0;
    console.log('🔒 Memories locked');
  }

  /**
   * Unlock memories
   */
  static unlock(): void {
    this.isUnlocked = true;
    this.unlockTimestamp = Date.now();
    console.log('🔓 Memories unlocked');
  }

  /**
   * Check if memories are unlocked
   */
  static isMemoriesUnlocked(): boolean {
    // Check auto-lock
    if (this.isUnlocked && this.unlockTimestamp > 0) {
      const timeSinceUnlock = Date.now() - this.unlockTimestamp;
      if (timeSinceUnlock > this.AUTO_LOCK_DURATION) {
        this.lock();
        return false;
      }
    }
    
    return this.isUnlocked;
  }

  /**
   * Change PIN
   */
  static async changePIN(oldPIN: string, newPIN: string): Promise<boolean> {
    try {
      // Verify old PIN
      const isValid = await this.verifyPIN(oldPIN);
      if (!isValid) {
        console.error('Invalid old PIN');
        return false;
      }

      // Validate new PIN
      if (!/^\d{4,6}$/.test(newPIN)) {
        console.error('Invalid new PIN format');
        return false;
      }

      // Save new PIN
      await SecureStore.setItemAsync(this.PIN_KEY, newPIN);
      console.log('✅ PIN changed successfully');
      return true;
    } catch (error) {
      console.error('Error changing PIN:', error);
      return false;
    }
  }

  /**
   * Reset unlock state (call when app goes to background)
   */
  static resetUnlockState(): void {
    // Don't lock immediately, just reset timestamp
    // Will auto-lock after 5 minutes
    console.log('📱 App backgrounded - memories will auto-lock after 5 minutes');
  }
}

export default MemoriesLockService;
