import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as lightColors } from '../theme/colorsIOS';

export type ThemeMode = 'light' | 'dark';
export type ColorTheme = 'default' | 'pink' | 'purple' | 'blue' | 'green' | 'orange';

interface ThemeSettings {
  mode: ThemeMode;
  colorTheme: ColorTheme;
}

// Dark mode colors - Vibrant Charcoal Black Theme (Bright Accents)
export const darkColors = {
  // Primary Colors - Bright Pink (Not Blue)
  primary: '#EC4899', // Pink 500
  primaryLight: '#F472B6', // Pink 400
  primaryDark: '#DB2777', // Pink 600
  primaryPastel: '#831843', // Dark Pink bg

  // Secondary Colors - Vibrant Pink
  secondary: '#EC4899', // Pink 500
  secondaryLight: '#F472B6', // Pink 400
  secondaryPastel: '#831843', // Dark Pink bg

  // Accent Colors - Bright & Clear
  mint: '#10B981', // Emerald 500
  mintLight: '#34D399', // Emerald 400
  mintPastel: '#064E3B', // Emerald 900

  lavender: '#8B5CF6', // Violet 500
  lavenderLight: '#A78BFA', // Violet 400

  peach: '#F59E0B', // Amber 500
  peachLight: '#FBBF24', // Amber 400

  sky: '#06B6D4', // Cyan 500
  skyLight: '#22D3EE', // Cyan 400

  // Backgrounds - Charcoal Black (Confirmed)
  background: '#121212', // Charcoal Black
  backgroundSecondary: '#1E1E1E', // Dark Grey Surface
  backgroundTertiary: '#2D2D2D', // Light Grey Surface
  surface: '#1E1E1E',    // Card Background
  surfaceElevated: '#2D2D2D', // Elevated

  // Dark Mode specific
  darkBg: '#121212',
  darkCard: '#1E1E1E',
  darkCardElevated: '#2D2D2D',
  darkBorder: '#2D2D2D',
  darkText: '#FFFFFF',
  darkTextSecondary: '#A0A0A0',

  // Text - Pure White & Grey
  text: '#FFFFFF',          // Pure White
  textSecondary: '#CCCCCC', // Light Grey
  textTertiary: '#999999',  // Medium Grey
  textLight: '#666666',     // Dark Grey
  textMuted: '#444444',     // Very Dark Grey

  // Border Colors
  border: '#2D2D2D',        // Dark Grey
  borderLight: '#1E1E1E',
  borderFocus: '#3B82F6',   // Bright Blue

  // Status Colors - Bright
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  successText: '#34D399',

  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.15)',
  errorText: '#FCA5A5',

  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  warningText: '#FCD34D',

  info: '#3B82F6',
  infoLight: 'rgba(59, 130, 246, 0.15)',
  infoText: '#93C5FD',

  // Shadow
  shadow: 'rgba(0, 0, 0, 0.6)',
  shadowMedium: 'rgba(0, 0, 0, 0.8)',
  shadowStrong: 'rgba(0, 0, 0, 1)',
  shadowPrimary: 'rgba(59, 130, 246, 0.3)',
  shadowSecondary: 'rgba(236, 72, 153, 0.3)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.85)',
  overlayLight: 'rgba(0, 0, 0, 0.7)',

  // Transparent
  transparent: 'transparent',

  // Interactive States
  hover: 'rgba(255, 255, 255, 0.1)',
  pressed: 'rgba(255, 255, 255, 0.15)',
  disabled: '#2D2D2D',
  disabledText: '#666666',
};

// Color theme variations
export const colorThemes = {
  default: {
    primary: '#EC4899',   // Bright Pink
    primaryLight: '#F472B6',
    secondary: '#8B5CF6', // Violet
    secondaryLight: '#A78BFA',
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
