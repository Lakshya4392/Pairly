// Pairly Typography System - Modern & Clean
export const fonts = {
  // Primary Font Family (Inter - Modern, Clean, Professional)
  primary: 'Inter-Regular',
  primaryMedium: 'Inter-Medium',
  primarySemiBold: 'Inter-SemiBold',
  primaryBold: 'Inter-Bold',

  // System fallbacks
  systemRegular: 'System',
  systemMedium: 'System',
  systemSemiBold: 'System',
  systemBold: 'System',
};

// Font Sizes
export const fontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

// Line Heights
export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.8,
  loose: 2.0,
};

// Font Weights
export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

// Typography Presets
export const typography = {
  // Headings
  h1: {
    fontFamily: fonts.primaryBold,
    fontSize: fontSizes.xxxl,
    lineHeight: fontSizes.xxxl * lineHeights.tight,
    fontWeight: fontWeights.bold,
  },
  h2: {
    fontFamily: fonts.primaryBold,
    fontSize: fontSizes.xxl,
    lineHeight: fontSizes.xxl * lineHeights.tight,
    fontWeight: fontWeights.bold,
  },
  h3: {
    fontFamily: fonts.primarySemiBold,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * lineHeights.normal,
    fontWeight: fontWeights.semiBold,
  },

  // Body Text
  body: {
    fontFamily: fonts.primary,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.normal,
    fontWeight: fontWeights.regular,
  },
  bodyMedium: {
    fontFamily: fonts.primaryMedium,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.normal,
    fontWeight: fontWeights.medium,
  },
  bodyLarge: {
    fontFamily: fonts.primary,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.normal,
    fontWeight: fontWeights.regular,
  },

  // Small Text
  caption: {
    fontFamily: fonts.primary,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
    fontWeight: fontWeights.regular,
  },
  small: {
    fontFamily: fonts.primary,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
    fontWeight: fontWeights.regular,
  },

  // Accent Text (Romantic)
  accent: {
    fontFamily: fonts.primarySemiBold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.relaxed,
    fontWeight: fontWeights.regular,
  },
  accentLarge: {
    fontFamily: fonts.primarySemiBold,
    fontSize: fontSizes.xxl,
    lineHeight: fontSizes.xxl * lineHeights.relaxed,
    fontWeight: fontWeights.regular,
  },

  // Button Text
  button: {
    fontFamily: fonts.primarySemiBold,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.tight,
    fontWeight: fontWeights.semiBold,
  },
  buttonLarge: {
    fontFamily: fonts.primaryBold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.tight,
    fontWeight: fontWeights.bold,
  },
};

export default typography;
