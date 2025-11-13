/**
 * Temporary fallback to get colors
 * This ensures colors are always available even if ThemeContext is not ready
 */
import { colors as lightColors } from './colorsIOS';

// Export a function that always returns valid colors
export const getColors = () => {
  return lightColors;
};

// Export colors directly for backward compatibility
export const colors = lightColors;

export default colors;
