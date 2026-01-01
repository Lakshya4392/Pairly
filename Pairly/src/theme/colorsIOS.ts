// iOS-Style Color Palette - Bright & Vibrant
export const colors = {
  // Primary Colors - Bright Pink (User Request)
  primary: '#EC4899',      // Pink 500
  primaryLight: '#F472B6', // Pink 400
  primaryPastel: '#FCE7F3', // Pink 100
  primaryDark: '#DB2777',  // Pink 600

  // Secondary Colors - Violet/Purple (Complementary)
  secondary: '#8B5CF6',      // Violet 500
  secondaryLight: '#A78BFA', // Violet 400
  secondaryPastel: '#F5F3FF', // Violet 50

  // Accent Colors - Clear & Bright
  mint: '#10B981',       // Emerald 500
  mintLight: '#34D399',  // Emerald 400
  mintPastel: '#ECFDF5', // Emerald 50

  lavender: '#8B5CF6',      // Violet 500
  lavenderLight: '#A78BFA', // Violet 400

  peach: '#F59E0B',      // Amber 500
  peachLight: '#FBBF24', // Amber 400

  sky: '#06B6D4',        // Cyan 500
  skyLight: '#22D3EE',   // Cyan 400

  // Background Colors - Pure White (Bright)
  background: '#FFFFFF',        // Pure White
  backgroundSecondary: '#F9FAFB', // Gray 50 (Very subtle)
  backgroundTertiary: '#F3F4F6',  // Gray 100
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Dark Mode Colors - Charcoal Black (Legacy props)
  darkBg: '#121212',
  darkCard: '#1E1E1E',
  darkCardElevated: '#2D2D2D',
  darkBorder: '#2D2D2D',
  darkText: '#FFFFFF',
  darkTextSecondary: '#CCCCCC',

  // Text Colors - High Contrast
  text: '#111827',          // Gray 900
  textSecondary: '#4B5563', // Gray 600
  textTertiary: '#9CA3AF',  // Gray 400
  textLight: '#D1D5DB',     // Gray 300
  textMuted: '#E5E7EB',     // Gray 200

  // Border Colors - Clean
  border: '#E5E7EB',        // Gray 200
  borderLight: '#F3F4F6',   // Gray 100
  borderFocus: '#3B82F6',   // Primary

  // Status Colors - Bright
  error: '#EF4444',         // Red 500
  errorLight: '#FEF2F2',
  errorText: '#DC2626',

  success: '#10B981',       // Emerald 500
  successLight: '#ECFDF5',
  successText: '#059669',

  warning: '#F59E0B',       // Amber 500
  warningLight: '#FFFBEB',
  warningText: '#D97706',

  info: '#3B82F6',          // Blue 500
  infoLight: '#EFF6FF',
  infoText: '#2563EB',

  // Shadow Colors - Crisp
  shadow: 'rgba(0, 0, 0, 0.05)',
  shadowMedium: 'rgba(0, 0, 0, 0.1)',
  shadowStrong: 'rgba(0, 0, 0, 0.15)',
  shadowPrimary: 'rgba(59, 130, 246, 0.25)',
  shadowSecondary: 'rgba(236, 72, 153, 0.25)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',

  // Transparent
  transparent: 'transparent',

  // Interactive States
  hover: 'rgba(59, 130, 246, 0.08)',
  pressed: 'rgba(59, 130, 246, 0.12)',
  disabled: '#F3F4F6',
  disabledText: '#9CA3AF',
};

// iOS-Style Gradients - Simplified/Bright
export const gradients = {
  // Primary gradients
  primary: ['#3B82F6', '#60A5FA'], // Bright Blue
  primarySoft: ['#60A5FA', '#93C5FD'],

  // Secondary gradients
  secondary: ['#EC4899', '#F472B6'], // Pink
  secondarySoft: ['#F472B6', '#FBCFE8'],

  // Accent gradients
  mint: ['#10B981', '#34D399'],
  mintSoft: ['#34D399', '#6EE7B7'],

  lavender: ['#8B5CF6', '#A78BFA'],
  peach: ['#F59E0B', '#FBBF24'],
  sky: ['#06B6D4', '#22D3EE'],

  // Background gradients - Very Subtle
  background: ['#FFFFFF', '#F9FAFB'],
  backgroundSubtle: ['#F9FAFB', '#F3F4F6'],

  // Dark mode gradients
  darkBg: ['#121212', '#1E1E1E'],
  darkCard: ['#1E1E1E', '#2D2D2D'],

  // Button gradients
  button: ['#3B82F6', '#2563EB'],
  buttonSecondary: ['#EC4899', '#DB2777'],
  buttonSuccess: ['#10B981', '#059669'],

  // Card gradients
  card: ['#FFFFFF', '#FFFFFF'],
  cardElevated: ['#FFFFFF', '#F9FAFB'],

  // Special gradients
  rainbow: ['#3B82F6', '#EC4899', '#F59E0B'],
  sunset: ['#EC4899', '#F59E0B', '#EF4444'],
  ocean: ['#3B82F6', '#06B6D4', '#10B981'],

  // Overlay gradients
  overlay: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)'],
  overlayTop: ['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0)'],
};

// Color utility functions
export const withOpacity = (color: string, opacity: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default colors;