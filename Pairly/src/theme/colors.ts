// Pairly Color Palette - Modern White Theme
export const colors = {
  // Primary Colors - Modern Blue/Purple Gradient
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8', // Light Indigo
  primaryDark: '#4F46E5', // Dark Indigo
  secondary: '#EC4899', // Pink
  secondaryLight: '#F472B6', // Light Pink
  
  // Background Colors - Clean White Theme
  background: '#FFFFFF', // Pure White
  backgroundSecondary: '#F8FAFC', // Slate 50
  backgroundTertiary: '#F1F5F9', // Slate 100
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Text Colors - Modern Hierarchy
  text: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textTertiary: '#64748B', // Slate 500
  textLight: '#94A3B8', // Slate 400
  textMuted: '#CBD5E1', // Slate 300

  // Border Colors - Subtle
  border: '#E2E8F0', // Slate 200
  borderLight: '#F1F5F9', // Slate 100
  borderFocus: '#6366F1', // Primary for focus states

  // Accent Colors
  accent: '#10B981', // Emerald 500
  accentLight: '#34D399', // Emerald 400
  accentSecondary: '#F59E0B', // Amber 500

  // Status Colors - Modern
  error: '#EF4444', // Red 500
  errorLight: '#FEF2F2', // Red 50
  errorText: '#DC2626', // Red 600
  
  success: '#10B981', // Emerald 500
  successLight: '#F0FDF4', // Green 50
  successText: '#059669', // Emerald 600
  
  warning: '#F59E0B', // Amber 500
  warningLight: '#FFFBEB', // Amber 50
  warningText: '#D97706', // Amber 600

  info: '#3B82F6', // Blue 500
  infoLight: '#EFF6FF', // Blue 50
  infoText: '#2563EB', // Blue 600

  // Shadow - Modern Elevation
  shadow: 'rgba(15, 23, 42, 0.08)', // Slate 900 with opacity
  shadowMedium: 'rgba(15, 23, 42, 0.12)',
  shadowStrong: 'rgba(15, 23, 42, 0.16)',

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

// Modern Gradient Definitions
export const gradients = {
  // Primary gradients
  primary: ['#6366F1', '#8B5CF6'], // Indigo to Purple
  primaryLight: ['#818CF8', '#A78BFA'], // Light version
  
  // Secondary gradients
  secondary: ['#EC4899', '#F472B6'], // Pink gradient
  accent: ['#10B981', '#34D399'], // Emerald gradient
  
  // Background gradients - Subtle
  background: ['#FFFFFF', '#F8FAFC'], // White to Slate
  backgroundSubtle: ['#F8FAFC', '#F1F5F9'], // Slate gradient
  
  // Button gradients
  button: ['#6366F1', '#8B5CF6'], // Primary button
  buttonSecondary: ['#EC4899', '#F472B6'], // Secondary button
  buttonSuccess: ['#10B981', '#34D399'], // Success button
  
  // Card gradients
  card: ['#FFFFFF', '#FFFFFF'], // Pure white
  cardElevated: ['#FFFFFF', '#F8FAFC'], // Subtle elevation
  
  // Special gradients
  hero: ['#6366F1', '#EC4899'], // Hero sections
  overlay: ['rgba(15, 23, 42, 0)', 'rgba(15, 23, 42, 0.6)'], // Overlay gradient
};

// Color utility functions
export const withOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default colors;
