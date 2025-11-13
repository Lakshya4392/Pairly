import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as lightColors } from '../theme/colorsIOS';

export type ThemeMode = 'light' | 'dark';
export type ColorTheme = 'default' | 'pink' | 'purple' | 'blue' | 'green' | 'orange';

interface ThemeSettings {
  mode: ThemeMode;
  colorTheme: ColorTheme;
}

// Dark mode colors - Premium Modern Design (matches all lightColors properties)
export const darkColors = {
  // Primary Colors - Vibrant but elegant
  primary: '#8B5CF6', // Purple
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  primaryPastel: '#DDD6FE',
  
  // Secondary Colors - Complementary Pink
  secondary: '#EC4899',
  secondaryLight: '#F472B6',
  secondaryPastel: '#FBCFE8',
  
  // Accent Colors - Complete set
  mint: '#34D399',
  mintLight: '#6EE7B7',
  mintPastel: '#A7F3D0',
  
  lavender: '#C4B5FD',
  lavenderLight: '#DDD6FE',
  
  peach: '#FB923C',
  peachLight: '#FED7AA',
  
  sky: '#38BDF8',
  skyLight: '#7DD3FC',
  
  // Backgrounds - Deep but not pure black
  background: '#0F172A', // Slate 900
  backgroundSecondary: '#1E293B', // Slate 800
  backgroundTertiary: '#334155', // Slate 700
  surface: '#1E293B',
  surfaceElevated: '#334155',
  
  // Dark Mode specific (for compatibility)
  darkBg: '#0F172A',
  darkCard: '#1E293B',
  darkCardElevated: '#334155',
  darkBorder: '#475569',
  darkText: '#F1F5F9',
  darkTextSecondary: '#CBD5E1',
  
  // Text - High contrast for readability
  text: '#F1F5F9', // Slate 100
  textSecondary: '#CBD5E1', // Slate 300
  textTertiary: '#94A3B8', // Slate 400
  textLight: '#64748B', // Slate 500
  textMuted: '#475569', // Slate 600
  
  // Border Colors
  border: '#334155', // Slate 700
  borderLight: '#475569', // Slate 600
  borderFocus: '#8B5CF6', // Primary
  
  // Status Colors - Vibrant
  success: '#10B981', // Emerald 500
  successLight: '#064E3B', // Emerald 900
  successText: '#34D399', // Emerald 400
  
  error: '#EF4444', // Red 500
  errorLight: '#7F1D1D', // Red 900
  errorText: '#F87171', // Red 400
  
  warning: '#F59E0B', // Amber 500
  warningLight: '#78350F', // Amber 900
  warningText: '#FBBF24', // Amber 400
  
  info: '#3B82F6', // Blue 500
  infoLight: '#1E3A8A', // Blue 900
  infoText: '#60A5FA', // Blue 400
  
  // Shadow - Darker for depth
  shadow: 'rgba(0, 0, 0, 0.4)',
  shadowMedium: 'rgba(0, 0, 0, 0.5)',
  shadowStrong: 'rgba(0, 0, 0, 0.6)',
  shadowPrimary: 'rgba(139, 92, 246, 0.4)',
  shadowSecondary: 'rgba(236, 72, 153, 0.4)',
  
  // Overlay
  overlay: 'rgba(15, 23, 42, 0.8)',
  overlayLight: 'rgba(15, 23, 42, 0.6)',
  
  // Transparent
  transparent: 'transparent',
  
  // Interactive States
  hover: 'rgba(139, 92, 246, 0.15)',
  pressed: 'rgba(139, 92, 246, 0.25)',
  disabled: '#334155',
  disabledText: '#64748B',
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
