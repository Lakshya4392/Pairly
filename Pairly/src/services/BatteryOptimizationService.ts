import { NativeModules, Platform } from 'react-native';

const { BatteryOptimization } = NativeModules;

class BatteryOptimizationService {
  /**
   * Check if app is whitelisted from battery optimization
   */
  async isIgnoringBatteryOptimizations(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need this
    }

    try {
      const isIgnoring = await BatteryOptimization.isIgnoringBatteryOptimizations();
      return isIgnoring;
    } catch (error) {
      console.error('Error checking battery optimization:', error);
      return false;
    }
  }

  /**
   * Request user to whitelist app from battery optimization
   * Opens system dialog
   */
  async requestIgnoreBatteryOptimizations(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      await BatteryOptimization.requestIgnoreBatteryOptimizations();
      return true;
    } catch (error) {
      console.error('Error requesting battery optimization:', error);
      return false;
    }
  }

  /**
   * Open battery settings page
   */
  async openBatterySettings(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      await BatteryOptimization.openBatterySettings();
      return true;
    } catch (error) {
      console.error('Error opening battery settings:', error);
      return false;
    }
  }
}

export default new BatteryOptimizationService();
