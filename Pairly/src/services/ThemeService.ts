import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as lightColors } from '../theme/colorsIOS';

export type ThemeMode = 'light' | 'dark';
export type ColorTheme = 'default' | 'pink' | 'purple' | 'blue' | 'green' | 'orange';

interface ThemeSettings {
  mode: ThemeMode;
  colorTheme: ColorTheme;
}

// Dark mode colors
export const darkColors = {
  // Base colors
  primary: '#FF6B9D',
  primaryLight: '#FF8FB3',
  primaryDark: '#E5527D',
  primaryPastel: '#FFE5EE',
  
  secondary: '#C77DFF',
  secondaryLight: '#E0AAFF',
  secondaryDark: '#9D4EDD',
  
  // Backgrounds
  background: '#121212',
  backgroundSecondary: '#1E1E1E',
  surface: '#2C2C2C',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textTertiary: '#808080',
  
  // UI Elements
  border: '#3A3A3A',
  disabled: '#4A4A4A',
  
  // Status
  success: '#4CAF50',
  error: '#F44336',
  errorText: '#FF6B6B',
  warning: '#FF9800',
  info: '#2196F3',
};

// Color theme variations
export const colorThemes = {
  default: {
    primary: '#FF6B9D',
    primaryLight: '#FF8FB3',
    secondary: '#C77DFF',
    secondaryLight: '#E0AAFF',
  },
  pink: {
    primary: '#FF1493',
    primaryLight: '#FF69B4',
    secondary: '#FF69B4',
    secondaryLight: '#FFB6C1',
  },
  purple: {
    primary: '#9B59B6',
    primaryLight: '#BB8FCE',
    secondary: '#8E44AD',
    secondaryLight: '#D7BDE2',
  },
  blue: {
    primary: '#3498DB',
    primaryLight: '#5DADE2',
    secondary: '#2980B9',
    secondaryLight: '#AED6F1',
  },
  green: {
    primary: '#27AE60',
    primaryLight: '#52BE80',
    secondary: '#229954',
    secondaryLight: '#A9DFBF',
  },
  orange: {
    primary: '#E67E22',
    primaryLight: '#EB984E',
    secondary: '#D35400',
    secondaryLight: '#F8C471',
  },
};

class ThemeService {
  private static STORAGE_KEY = '@pairly_theme';
  private static listeners: Array<(theme: ThemeSettings) => void> = [];

  // Get current theme settings
  static async getTheme(): Promise<ThemeSettings> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error getting theme:', error);
    }

    // Default theme
    return {
      mode: 'light',
      colorTheme: 'default',
    };
  }

  // Set theme mode (light/dark)
  static async setThemeMode(mode: ThemeMode): Promise<void> {
    try {
      const currentTheme = await this.getTheme();
      const newTheme = { ...currentTheme, mode };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(newTheme));
      this.notifyListeners(newTheme);
      console.log('✅ Theme mode set to:', mode);
    } catch (error) {
      console.error('Error setting theme mode:', error);
    }
  }

  // Set color theme
  static async setColorTheme(colorTheme: ColorTheme): Promise<void> {
    try {
      const currentTheme = await this.getTheme();
      const newTheme = { ...currentTheme, colorTheme };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(newTheme));
      this.notifyListeners(newTheme);
      console.log('✅ Color theme set to:', colorTheme);
    } catch (error) {
      console.error('Error setting color theme:', error);
    }
  }

  // Get colors based on current theme
  static async getColors() {
    const theme = await this.getTheme();
    const baseColors = theme.mode === 'dark' ? darkColors : lightColors;
    const themeColors = colorThemes[theme.colorTheme];

    return {
      ...baseColors,
      ...themeColors,
    };
  }

  // Subscribe to theme changes
  static subscribe(listener: (theme: ThemeSettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private static notifyListeners(theme: ThemeSettings): void {
    this.listeners.forEach(listener => listener(theme));
  }
}

export default ThemeService;
