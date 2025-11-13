import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';

type NamedStyles<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle;
};

/**
 * Helper function to create themed styles
 * Use this instead of StyleSheet.create when you need dynamic colors
 * 
 * @example
 * const styles = createThemedStyles((colors) => ({
 *   container: {
 *     backgroundColor: colors.background,
 *   },
 * }));
 */
export function createThemedStyles<T extends NamedStyles<T>>(
  stylesFn: (colors: any) => T
): (colors: any) => T {
  return (colors: any) => {
    return StyleSheet.create(stylesFn(colors)) as T;
  };
}

export default createThemedStyles;
