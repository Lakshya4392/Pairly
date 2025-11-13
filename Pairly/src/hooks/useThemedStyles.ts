import { useMemo } from 'react';
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type NamedStyles<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle;
};

/**
 * Custom hook to create themed styles
 * Automatically uses colors from ThemeContext
 * 
 * @example
 * const styles = useThemedStyles((colors) => ({
 *   container: {
 *     backgroundColor: colors.background,
 *   },
 * }));
 */
export function useThemedStyles<T extends NamedStyles<T>>(
  stylesFn: (colors: any, theme: { isDarkMode: boolean; colorTheme: string }) => T
): T {
  const { colors, isDarkMode, colorTheme } = useTheme();
  
  return useMemo(() => {
    return StyleSheet.create(stylesFn(colors, { isDarkMode, colorTheme })) as T;
  }, [colors, isDarkMode, colorTheme]);
}

export default useThemedStyles;
