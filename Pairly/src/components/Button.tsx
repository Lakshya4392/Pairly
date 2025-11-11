import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@theme/colors';
import { spacing, borderRadius, layout } from '@theme/spacing';
import { shadows } from '@theme/shadows';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  fullWidth = true,
}) => {
  const buttonHeight =
    size === 'small'
      ? layout.buttonHeightSmall
      : size === 'large'
        ? layout.buttonHeightLarge
        : layout.buttonHeight;

  const renderContent = () => (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator 
          size="small"
          color={
            variant === 'outline' || variant === 'text' || variant === 'ghost'
              ? colors.primary 
              : 'white'
          } 
        />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.text,
              variant === 'primary' && styles.textPrimary,
              variant === 'secondary' && styles.textSecondary,
              variant === 'outline' && styles.textOutline,
              variant === 'text' && styles.textOnly,
              variant === 'ghost' && styles.textGhost,
              size === 'small' && styles.textSmall,
              size === 'large' && styles.textLarge,
              disabled && styles.textDisabled,
              textStyle,
            ]}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  // Primary button with gradient
  if (variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[
          styles.container,
          { height: buttonHeight },
          fullWidth && styles.fullWidth,
          style
        ]}>
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, shadows.md]}>
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.container,
        { height: buttonHeight },
        fullWidth && styles.fullWidth,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        variant === 'text' && styles.textButton,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        variant === 'primary' && !disabled && shadows.md,
        style,
      ]}>
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    // Icon styling handled by parent
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  primary: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondary: {
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  textButton: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  ghost: {
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  disabled: {
    backgroundColor: colors.disabled,
    opacity: 0.6,
  },
  
  // Text Styles
  text: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
  },
  textPrimary: {
    color: 'white',
  },
  textSecondary: {
    color: 'white',
  },
  textOutline: {
    color: colors.text,
  },
  textOnly: {
    color: colors.primary,
  },
  textGhost: {
    color: colors.textSecondary,
  },
  textSmall: {
    fontFamily: 'Inter-Medium', fontSize: 14,
  },
  textLarge: {
    fontFamily: 'Inter-SemiBold', fontSize: 18,
  },
  textDisabled: {
    color: colors.disabledText,
  },
});