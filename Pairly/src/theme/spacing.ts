// Modern Spacing System - 8px base
export const spacing = {
  xs: 4,    // 0.25rem
  sm: 8,    // 0.5rem
  md: 12,   // 0.75rem
  lg: 16,   // 1rem
  xl: 20,   // 1.25rem
  xxl: 24,  // 1.5rem
  xxxl: 32, // 2rem
  huge: 48, // 3rem
  massive: 64, // 4rem
};

// Modern Border Radius
export const borderRadius = {
  none: 0,
  xs: 4,    // Small elements
  sm: 6,    // Buttons, inputs
  md: 8,    // Cards, modals
  lg: 12,   // Large cards
  xl: 16,   // Hero sections
  xxl: 20,  // Special elements
  full: 9999, // Fully rounded (pills, avatars)
};

// Modern Layout Dimensions
export const layout = {
  // Screen padding - More generous for modern feel
  screenPadding: spacing.xxl,
  screenPaddingHorizontal: spacing.xxl,
  screenPaddingVertical: spacing.xxxl,

  // Component sizes - Modern proportions
  buttonHeight: 48,        // Slightly smaller, more modern
  buttonHeightLarge: 56,   // Large buttons
  buttonHeightSmall: 40,   // Small buttons
  inputHeight: 48,         // Consistent with buttons
  inputHeightLarge: 56,    // Large inputs
  
  // Special elements
  captureButtonSize: 80,   // Smaller, more elegant
  avatarSize: 48,
  avatarSizeLarge: 64,
  avatarSizeSmall: 32,

  // Icon sizes - Consistent scale
  iconXs: 12,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,
  iconXxl: 40,

  // Card and widget dimensions
  cardPadding: spacing.xxl,
  cardPaddingSmall: spacing.lg,
  cardBorderRadius: borderRadius.lg,
  
  // Header and navigation
  headerHeight: 60,
  tabBarHeight: 80,
  
  // Content areas
  maxContentWidth: 400,    // Max width for forms and content
  sectionSpacing: spacing.huge, // Space between sections
};

export default spacing;
