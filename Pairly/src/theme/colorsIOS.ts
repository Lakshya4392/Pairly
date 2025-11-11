// iOS-Style Color Palette - Soft & Minimal
export const colors = {
  // Primary Colors - Soft Purple/Indigo
  primary: '#6366F1',
  primaryLight: '#A5B4FC',
  primaryPastel: '#E0E7FF',
  primaryDark: '#4F46E5',
  
  // Secondary Colors - Soft Pink
  secondary: '#EC4899',
  secondaryLight: '#F9A8D4',
  secondaryPastel: '#FCE7F3',
  
  // Accent Colors - Soft Pastels
  mint: '#6EE7B7',
  mintLight: '#A7F3D0',
  mintPastel: '#D1FAE5',
  
  lavender: '#C4B5FD',
  lavenderLight: '#DDD6FE',
  
  peach: '#FDBA74',
  peachLight: '#FED7AA',
  
  sky: '#7DD3FC',
  skyLight: '#BAE6FD',
  
  // Background Colors - Clean & Soft
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  backgroundTertiary: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Dark Mode Colors
  darkBg: '#0F172A',
  darkCard: '#1E293B',
  darkCardElevated: '#334155',
  darkBorder: '#475569',
  darkText: '#F1F5F9',
  darkTextSecondary: '#CBD5E1',

  // Text Colors - iOS Hierarchy
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textLight: '#CBD5E1',
  textMuted: '#E2E8F0',

  // Border Colors - Soft
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocus: '#6366F1',

  // Status Colors - Soft & Friendly
  error: '#EF4444',
  errorLight: '#FEF2F2',
  errorText: '#DC2626',
  
  success: '#10B981',
  successLight: '#F0FDF4',
  successText: '#059669',
  
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningText: '#D97706',

  info: '#3B82F6',
  infoLight: '#EFF6FF',
  infoText: '#2563EB',

  // Shadow Colors - Soft
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowMedium: 'rgba(15, 23, 42, 0.12)',
  shadowStrong: 'rgba(15, 23, 42, 0.16)',
  shadowPrimary: 'rgba(99, 102, 241, 0.3)',
  shadowSecondary: 'rgba(236, 72, 153, 0.3)',

  // Overlay
  overlay: 'rgba(15, 23, 42, 0.6)',
  overlayLight: 'rgba(15, 23, 42, 0.4)',

  // Transparent
  transparent: 'transparent',

  // Interactive States
  hover: 'rgba(99, 102, 241, 0.08)',
  pressed: 'rgba(99, 102, 241, 0.12)',
  disabled: '#F1F5F9',
  disabledText: '#CBD5E1',
};

// iOS-Style Gradients
export const gradients = {
  // Primary gradients - Soft
  primary: ['#6366F1', '#8B5CF6'],
  primarySoft: ['#A5B4FC', '#C4B5FD'],
  
  // Secondary gradients - Soft
  secondary: ['#EC4899', '#F472B6'],
  secondarySoft: ['#F9A8D4', '#FBCFE8'],
  
  // Accent gradients
  mint: ['#6EE7B7', '#34D399'],
  mintSoft: ['#A7F3D0', '#6EE7B7'],
  
  lavender: ['#C4B5FD', '#A78BFA'],
  peach: ['#FDBA74', '#FB923C'],
  sky: ['#7DD3FC', '#38BDF8'],
  
  // Background gradients - Subtle
  background: ['#FFFFFF', '#F8FAFC'],
  backgroundSubtle: ['#F8FAFC', '#F1F5F9'],
  
  // Dark mode gradients
  darkBg: ['#0F172A', '#1E293B'],
  darkCard: ['#1E293B', '#334155'],
  
  // Button gradients
  button: ['#6366F1', '#8B5CF6'],
  buttonSecondary: ['#EC4899', '#F472B6'],
  buttonSuccess: ['#10B981', '#34D399'],
  
  // Card gradients - Soft
  card: ['#FFFFFF', '#FFFFFF'],
  cardElevated: ['#FFFFFF', '#F8FAFC'],
  
  // Special gradients - Playful
  rainbow: ['#6366F1', '#EC4899', '#F59E0B'],
  sunset: ['#EC4899', '#F59E0B', '#EF4444'],
  ocean: ['#3B82F6', '#06B6D4', '#10B981'],
  
  // Overlay gradients
  overlay: ['rgba(15, 23, 42, 0)', 'rgba(15, 23, 42, 0.6)'],
  overlayTop: ['rgba(15, 23, 42, 0.6)', 'rgba(15, 23, 42, 0)'],
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