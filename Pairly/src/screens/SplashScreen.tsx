import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const backgroundOpacity = useSharedValue(0);
  const heartPulse = useSharedValue(1);

  useEffect(() => {
    // Animated sequence
    backgroundOpacity.value = withTiming(1, { duration: 500 });
    
    logoScale.value = withDelay(300, withTiming(1, { duration: 800 }));
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
    
    heartPulse.value = withDelay(800, 
      withSequence(
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 300 }),
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 300 })
      )
    );
    
    textOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    
    // Complete after animation
    setTimeout(() => {
      runOnJS(onComplete)();
    }, 2500);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartPulse.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, backgroundAnimatedStyle]}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoBackground}>
            <Animated.View style={heartAnimatedStyle}>
              <Ionicons name="heart" size={48} color="white" />
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text style={styles.appName}>Pairly</Text>
          <Text style={styles.tagline}>Share moments, stay connected</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.massive,
  },
  logoBackground: {
    width: 140,
    height: 140,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 36,
    color: 'white',
    marginBottom: spacing.lg,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
});