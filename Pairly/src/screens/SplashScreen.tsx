import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors, gradients } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animated sequence
    Animated.timing(backgroundOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);
    
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(heartPulse, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 800);
    
    setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 1200);
    
    // Complete after animation
    setTimeout(() => {
      onComplete();
    }, 2500);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backgroundOpacity }]}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, { 
          transform: [{ scale: logoScale }],
          opacity: logoOpacity 
        }]}>
          <View style={styles.logoBackground}>
            <Animated.View style={{ transform: [{ scale: heartPulse }] }}>
              <Ionicons name="heart" size={48} color="white" />
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
          <Text style={styles.appName}>Pairly</Text>
          <Text style={styles.tagline}>Share moments, stay connected</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
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