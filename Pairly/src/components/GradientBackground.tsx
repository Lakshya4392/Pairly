import React from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, colors } from '@theme/colors';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  variant?: 'default' | 'subtle' | 'hero' | 'none';
  customColors?: string[];
  style?: ViewStyle;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = 'none',
  customColors,
  style,
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
}) => {
  // For modern white theme, we mostly use solid backgrounds
  if (variant === 'none' || !variant) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, style]}>
        {children}
      </View>
    );
  }

  let gradientColors: string[];
  
  switch (variant) {
    case 'subtle':
      gradientColors = gradients.backgroundSubtle;
      break;
    case 'hero':
      gradientColors = gradients.hero;
      break;
    default:
      gradientColors = gradients.background;
  }

  if (customColors) {
    gradientColors = customColors;
  }

  return (
    <LinearGradient
      colors={gradientColors as any}
      start={start}
      end={end}
      style={[styles.container, style]}>
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});