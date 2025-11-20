import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors, gradients } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import { typography } from '../utils/fonts';
import BatteryOptimizationService from '../services/BatteryOptimizationService';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  
  const slides = [
    {
      id: 1,
      icon: 'heart',
      title: 'Share Moments',
      description: 'Capture and share special moments with your loved one in real-time',
      color: colors.primary,
    },
    {
      id: 2,
      icon: 'people',
      title: 'Stay Connected',
      description: 'Simple pairing system to connect with your partner instantly',
      color: colors.secondary,
    },
    {
      id: 3,
      icon: 'shield-checkmark',
      title: 'Private & Secure',
      description: 'Your moments are encrypted and shared only between you two',
      color: colors.mint || colors.primary,
    },
    {
      id: 4,
      icon: 'battery-charging',
      title: 'Always Updated',
      description: 'Allow battery optimization to keep your widget always up-to-date',
      color: colors.success || colors.primary,
      requiresAction: true,
    },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);

  const handleNext = async () => {
    const currentSlide = slides[currentIndex];
    
    // If this is the battery optimization slide, request permission
    if (currentSlide.requiresAction && Platform.OS === 'android') {
      try {
        const isAlreadyIgnoring = await BatteryOptimizationService.isIgnoringBatteryOptimizations();
        
        if (!isAlreadyIgnoring) {
          Alert.alert(
            'Battery Optimization',
            'To keep your widget always updated, please allow Pairly to run in the background without restrictions.',
            [
              {
                text: 'Not Now',
                style: 'cancel',
                onPress: () => {
                  // Continue to next slide or complete
                  if (currentIndex < slides.length - 1) {
                    const nextIndex = currentIndex + 1;
                    setCurrentIndex(nextIndex);
                    scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
                  } else {
                    onComplete();
                  }
                },
              },
              {
                text: 'Allow',
                onPress: async () => {
                  await BatteryOptimizationService.requestIgnoreBatteryOptimizations();
                  
                  // Continue after user returns from settings
                  setTimeout(() => {
                    if (currentIndex < slides.length - 1) {
                      const nextIndex = currentIndex + 1;
                      setCurrentIndex(nextIndex);
                      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
                    } else {
                      onComplete();
                    }
                  }, 500);
                },
              },
            ]
          );
          return;
        }
      } catch (error) {
        console.error('Error checking battery optimization:', error);
      }
    }
    
    // Normal navigation
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const onScroll = (event: any) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.slideContent}>
              <View style={[styles.iconContainer, { backgroundColor: slide.color }]}>
                <Ionicons name={slide.icon as any} size={48} color="white" />
              </View>
              
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const animatedStyle = useAnimatedStyle(() => {
              const inputRange = [
                (index - 1) * width,
                index * width,
                (index + 1) * width,
              ];
              
              const scale = interpolate(
                scrollX.value,
                inputRange,
                [0.8, 1.2, 0.8],
                'clamp'
              );
              
              const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0.4, 1, 0.4],
                'clamp'
              );

              return {
                transform: [{ scale }],
                opacity,
              };
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  animatedStyle,
                  index === currentIndex && styles.activeDot,
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.nextButtonGradient}
          >
            {currentIndex === slides.length - 1 ? (
              <Text style={styles.nextButtonText}>Get Started</Text>
            ) : (
              <>
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.lg,
  },
  skipButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  skipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textTertiary,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  slideContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.massive,
    ...shadows.xl,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    lineHeight: 36,
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: spacing.xxxl,
    gap: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  activeDot: {
    backgroundColor: colors.primary,
  },
  nextButton: {
    borderRadius: borderRadius.full,
    ...shadows.primary,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.massive,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.full,
    gap: spacing.md,
  },
  nextButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    lineHeight: 24,
    color: 'white',
  },
});