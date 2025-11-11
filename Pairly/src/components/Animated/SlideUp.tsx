import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { animations } from '@theme/animations';

interface SlideUpProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  duration?: number;
}

export const SlideUp: React.FC<SlideUpProps> = ({
  children,
  style,
  delay = 0,
  duration = animations.slideUp.duration,
}) => {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      translateY.value = withTiming(0, {
        duration,
        easing: Easing.bezier(...animations.slideUp.easing),
      });
      opacity.value = withTiming(1, {
        duration,
        easing: Easing.bezier(...animations.slideUp.easing),
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, duration, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};
