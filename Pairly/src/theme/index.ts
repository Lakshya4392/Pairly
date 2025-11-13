/**
 * Theme exports
 * Central place to export all theme-related items
 */

// Export colors - these are used by components that don't have access to ThemeContext
export { colors, gradients, withOpacity } from './colorsIOS';
export { default as colorsDefault } from './colorsIOS';

// Export spacing
export * from './spacingIOS';

// Export shadows
export * from './shadowsIOS';

// Create and export paper theme
import { MD3LightTheme } from 'react-native-paper';
import { colors } from './colorsIOS';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
  },
};
