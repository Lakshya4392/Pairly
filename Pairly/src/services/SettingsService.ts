/**
 * Settings Service
 * Manages user settings and syncs with backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

export interface UserSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  partnerOnlineNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
}

const DEFAULT_SETTINGS: UserSettings = {
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  partnerOnlineNotifications: true,
  theme: 'light',
};

class SettingsService {
  private baseUrl = API_CONFIG.baseUrl;
  private settingsKey = 'pairly_user_settings';
  private cachedSettings: UserSettings | null = null;

  /**
   * Get user settings (from cache or storage)
   */
  async getSettings(): Promise<UserSettings> {
    try {
      // Return cached if available
      if (this.cachedSettings) {
        return this.cachedSettings;
      }

      // Try to get from local storage
      const settingsJson = await AsyncStorage.getItem(this.settingsKey);
      
      if (settingsJson) {
        this.cachedSettings = JSON.parse(settingsJson);
        return this.cachedSettings;
      }

      // Return defaults
      this.cachedSettings = { ...DEFAULT_SETTINGS };
      return this.cachedSettings;

    } catch (error) {
      console.error('Error getting settings:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Update settings (local and backend)
   * Pass clerkId from component that has access to useUser hook
   */
  async updateSettings(settings: Partial<UserSettings>, clerkId?: string | null): Promise<boolean> {
    try {
      // Get current settings
      const currentSettings = await this.getSettings();
      
      // Merge with new settings
      const updatedSettings = {
        ...currentSettings,
        ...settings,
      };

      // Save locally
      await AsyncStorage.setItem(this.settingsKey, JSON.stringify(updatedSettings));
      this.cachedSettings = updatedSettings;

      // Sync with backend if clerkId provided
      if (clerkId) {
        await this.syncWithBackend(clerkId, updatedSettings);
      }

      console.log('✅ Settings updated:', updatedSettings);
      return true;

    } catch (error) {
      console.error('❌ Error updating settings:', error);
      return false;
    }
  }

  /**
   * Sync settings with backend
   * Note: Pass clerkId from component that has access to useUser hook
   */
  async syncWithBackend(clerkId: string | null, settings: UserSettings): Promise<void> {
    try {
      if (!clerkId) {
        console.log('⚠️ No user ID, skipping backend sync');
        return;
      }

      // Queue sync with retry logic
      const BackgroundSyncService = (await import('./BackgroundSyncService')).default;
      await BackgroundSyncService.queueSettingsSync(clerkId, {
        notificationsEnabled: settings.notificationsEnabled,
        soundEnabled: settings.soundEnabled,
        vibrationEnabled: settings.vibrationEnabled,
      });

      console.log('✅ Settings sync queued');

    } catch (error) {
      console.error('⚠️ Backend sync failed:', error);
      // Don't throw - local settings are still saved
    }
  }

  /**
   * Load settings from backend
   */
  async loadFromBackend(): Promise<UserSettings> {
    try {
      const AuthService = (await import('./AuthService')).default;
      const user = await AuthService.getUser();

      if (!user) {
        return await this.getSettings();
      }

      const response = await fetch(`${this.baseUrl}/api/settings/${user.id}`);

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const settings = await response.json();

      // Save locally
      await AsyncStorage.setItem(this.settingsKey, JSON.stringify(settings));
      this.cachedSettings = settings;

      console.log('✅ Settings loaded from backend');
      return settings;

    } catch (error) {
      console.error('⚠️ Failed to load from backend, using local:', error);
      return await this.getSettings();
    }
  }

  /**
   * Toggle notification setting
   */
  async toggleNotifications(enabled: boolean, clerkId?: string | null): Promise<boolean> {
    return await this.updateSettings({ notificationsEnabled: enabled }, clerkId);
  }

  /**
   * Toggle sound setting
   */
  async toggleSound(enabled: boolean, clerkId?: string | null): Promise<boolean> {
    return await this.updateSettings({ soundEnabled: enabled }, clerkId);
  }

  /**
   * Toggle vibration setting
   */
  async toggleVibration(enabled: boolean, clerkId?: string | null): Promise<boolean> {
    return await this.updateSettings({ vibrationEnabled: enabled }, clerkId);
  }

  /**
   * Toggle partner online notifications
   */
  async togglePartnerOnlineNotifications(enabled: boolean, clerkId?: string | null): Promise<boolean> {
    return await this.updateSettings({ partnerOnlineNotifications: enabled }, clerkId);
  }

  /**
   * Set theme
   */
  async setTheme(theme: 'light' | 'dark' | 'auto', clerkId?: string | null): Promise<boolean> {
    return await this.updateSettings({ theme }, clerkId);
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults(clerkId?: string | null): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.settingsKey, JSON.stringify(DEFAULT_SETTINGS));
      this.cachedSettings = { ...DEFAULT_SETTINGS };
      
      if (clerkId) {
        await this.syncWithBackend(clerkId, DEFAULT_SETTINGS);
      }
      
      console.log('✅ Settings reset to defaults');
      return true;

    } catch (error) {
      console.error('❌ Error resetting settings:', error);
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedSettings = null;
  }
}

export default new SettingsService();
