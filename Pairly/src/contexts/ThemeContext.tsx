import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ThemeService, { ThemeMode, ColorTheme } from '../services/ThemeService';
import { colors as lightColors } from '../theme/colorsIOS';
import { darkColors, colorThemes } from '../services/ThemeService';

interface ThemeContextType {
  isDarkMode: boolean;
  colorTheme: ColorTheme;
  colors: typeof lightColors;
  toggleDarkMode: () => Promise<void>;
  setColorTheme: (theme: ColorTheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('default');
  const [colors, setColors] = useState(lightColors);

  // Load theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const theme = await ThemeService.getTheme();
      setIsDarkMode(theme.mode === 'dark');
      setColorThemeState(theme.colorTheme);
      updateColors(theme.mode === 'dark', theme.colorTheme);
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const updateColors = (dark: boolean, theme: ColorTheme) => {
    const baseColors = dark ? darkColors : lightColors;
    const themeColors = colorThemes[theme];
    
    setColors({
      ...baseColors,
      ...themeColors,
    });
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

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        colorTheme,
        colors,
        toggleDarkMode,
        setColorTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
