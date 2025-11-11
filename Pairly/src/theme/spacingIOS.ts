// iOS-Style Spacing System - Generous & Breathable

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,      // More generous
  xxl: 32,     // More generous
  xxxl: 40,    // More generous
  huge: 48,    // More generous
  massive: 64, // More generous
};

// iOS-Style Border Radius - Soft & Smooth
export const borderRadius = {
  xs: 8,      // Small elements
  sm: 12,     // Buttons, inputs
  md: 16,     // Cards, containers
  lg: 20,     // Large cards
  xl: 24,     // Hero cards
  xxl: 28,    // Extra large
  full: 999,  // Pills, fully rounded
};

// Layout Constants - iOS-Style
export const layout = {
  screenPaddingHorizontal: 24,  // Increased from 20
  screenPaddingVertical: 24,
  maxContentWidth: 600,
  
  // Button heights - iOS-Style
  buttonHeightSmall: 44,   // iOS minimum
  buttonHeight: 56,        // Standard
  buttonHeightLarge: 64,   // Large
  
  // Input heights
  inputHeightSmall: 44,
  inputHeight: 56,
  inputHeightLarge: 64,
  
  // Icon sizes
  iconSmall: 20,
  iconMedium: 24,
  iconLarge: 32,
  iconHuge: 48,
  
  // Avatar sizes
  avatarSmall: 40,
  avatarMedium: 56,
  avatarLarge: 80,
  avatarHuge: 120,
  
  // Card sizes
  cardPadding: 24,
  cardPaddingLarge: 32,
  
  // Bottom tab bar
  tabBarHeight: 80,
  tabBarPaddingBottom: 20,
  tabBarPaddingTop: 12,
  
  // Touch targets - iOS minimum
  minTouchTarget: 44,
  recommendedTouchTarget: 56,
};

export default { spacing, borderRadius, layout };