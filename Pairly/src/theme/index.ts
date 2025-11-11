// Main Theme Export
import { colors, gradients, withOpacity } from './colors';
import { fonts, fontSizes, lineHeights, fontWeights, typography } from './typography';
import { spacing, borderRadius, layout } from './spacing';
import { shadows } from './shadows';
import { durations, easings, springs, animations } from './animations';
import { MD3LightTheme } from 'react-native-paper';

// React Native Paper Theme Configuration
export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.errorText,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: colors.text,
    onSurface: colors.text,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    regular: {
      fontFamily: 'Inter-Regular',
      fontFamily: 'Inter-Regular' as any,
    },
    medium: {
      fontFamily: 'Inter-Medium',
      fontFamily: 'Inter-Medium' as any,
    },
    bold: {
      fontFamily: 'Inter-Bold',
      fontFamily: 'Inter-Bold' as any,
    },
    labelLarge: {
      fontFamily: 'Inter-Medium',
      fontFamily: 'Inter-Medium', fontSize: 14 as any,
      letterSpacing: 0.1,
      lineHeight: 20,
    },
    bodyLarge: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      fontFamily: 'Inter-Regular' as any,
      letterSpacing: 0.5,
      lineHeight: 24,
    },
    bodyMedium: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      fontFamily: 'Inter-Regular' as any,
      letterSpacing: 0.25,
      lineHeight: 20,
    },
    titleLarge: {
      fontFamily: 'Inter-SemiBold',
      fontFamily: 'Inter-SemiBold', fontSize: 22 as any,
      letterSpacing: 0,
      lineHeight: 28,
    },
  },
  roundness: borderRadius.md,
};

// Complete Theme Object
export const theme = {
  colors,
  gradients,
  fonts,
  fontSizes,
  lineHeights,
  fontWeights,
  typography,
  spacing,
  borderRadius,
  layout,
  shadows,
  durations,
  easings,
  springs,
  animations,
  withOpacity,
};

export type Theme = typeof theme;

// Export individual modules
export { colors, gradients, withOpacity } from './colors';
export { fonts, fontSizes, lineHeights, fontWeights, typography } from './typography';
export { spacing, borderRadius, layout } from './spacing';
export { shadows } from './shadows';
export { durations, easings, springs, animations } from './animations';

export default theme;
