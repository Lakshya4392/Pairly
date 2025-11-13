import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ThemeService, { ThemeMode, ColorTheme } from '../services/ThemeService';
import { colors as lightColors } from '../theme/colorsIOS';
import { darkColors, colorThemes } from '../services/ThemeService';

// Define color type based on lightColors structure
type ColorScheme = typeof lightColors;

interface ThemeContextType {
  isDarkMode: boolean;
  colorTheme: ColorTheme;
  colors: ColorScheme;
  toggleDarkMode: () => Promise<void>;
  setColorTheme: (theme: ColorTheme) => Promise<void>;
}

// Create default context value to prevent undefined errors
const defaultContextValue: ThemeContextType = {
  isDarkMode: false,
  colorTheme: 'default',
  colors: lightColors,
  toggleDarkMode: async () => {
    console.warn('toggleDarkMode called before ThemeProvider initialized');
  },
  setColorTheme: async () => {
    console.warn('setColorTheme called before ThemeProvider initialized');
  },
};

const ThemeContext = createContext<ThemeContextType>(defaultContextValue);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('default');
  const [colors, setColors] = useState<ColorScheme>(lightColors);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const theme = await ThemeService.getTheme();
      const isDark = theme.mode === 'dark';
      setIsDarkMode(isDark);
      setColorThemeState(theme.colorTheme);
      updateColors(isDark, theme.colorTheme);
      console.log('🎨 Theme loaded from storage:', { mode: theme.mode, colorTheme: theme.colorTheme });
    } catch (error) {
      console.error('❌ Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateColors = (dark: boolean, theme: ColorTheme) => {
    try {
      // Use correct base colors based on mode
      const baseColors = dark ? darkColors : lightColors;
      const themeColors = colorThemes[theme] || {};
      
      // Merge colors properly
      const mergedColors: ColorScheme = {
        ...baseColors,  // Use dark or light as base
        ...themeColors, // Override with theme-specific colors
      };
      
      setColors(mergedColors);
      console.log('🎨 Colors updated:', { 
        mode: dark ? 'dark' : 'light',
        theme, 
        primaryColor: mergedColors.primary,
        backgroundColor: mergedColors.background
      });
    } catch (error) {
      console.error('❌ Error updating colors:', error);
      // Fallback to light colors on error
      setColors(lightColors);
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newMode: ThemeMode = isDarkMode ? 'light' : 'dark';
      await ThemeService.setThemeMode(newMode);
      setIsDarkMode(!isDarkMode);
      updateColors(!isDarkMode, colorTheme);
      console.log('✅ Dark mode toggled:', newMode);
    } catch (error) {
      console.error('Error toggling dark mode:', error);
    }
  };

  const setColorTheme = async (theme: ColorTheme) => {
    try {
      await ThemeService.setColorTheme(theme);
      setColorThemeState(theme);
      updateColors(isDarkMode, theme);
      console.log('✅ Color theme changed:', theme);
    } catch (error) {
      console.error('Error setting color theme:', error);
    }
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: ThemeContextType = React.useMemo(() => ({
    isDarkMode,
    colorTheme,
    colors,
    toggleDarkMode,
    setColorTheme,
  }), [isDarkMode, colorTheme, colors]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  // Context should always exist due to default value
  if (!context || !context.colors) {
    console.warn('⚠️ ThemeContext not properly initialized, using defaults');
    return defaultContextValue;
  }
  
  // Extra safety: ensure colors object has all required properties
  if (!context.colors.background || !context.colors.text) {
    console.warn('⚠️ Colors object incomplete, using defaults');
    return {
      ...context,
      colors: lightColors,
    };
  }
  
  return context;
};
