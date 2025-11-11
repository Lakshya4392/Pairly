/**
 * Global Text Styles
 * Apply Inter font to all text components
 */

import { StyleSheet } from 'react-native';
import { fonts } from './typography';

export const globalTextStyles = StyleSheet.create({
  defaultText: {
    fontFamily: fonts.primary,
  },
  mediumText: {
    fontFamily: fonts.primaryMedium,
  },
  semiBoldText: {
    fontFamily: fonts.primarySemiBold,
  },
  boldText: {
    fontFamily: fonts.primaryBold,
  },
});

// Default text props to apply Inter font globally
export const defaultTextProps = {
  style: { fontFamily: fonts.primary },
};

export default globalTextStyles;
