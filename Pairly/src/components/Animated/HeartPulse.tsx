import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { animations } from '@theme/animations';

interface HeartPulseProps {
  children: React.ReactNode;
  style?: ViewStyle;
  repeat?: boolean;
  delay?: number;
}

export const HeartPulse: React.FC<HeartPulseProps> = ({
  children,
  style,
  repeat = false,
  delay = 0,
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    const startAnimation = () => {
      scale.value = withSequence(
        withTiming(1.1, {
          duration: animations.heartPulse.duration / 2,
          easing: Easing.bezier(...animations.heartPulse.easing),
        }),
        withTiming(1, {
          duration: animations.heartPulse.duration / 2,
          easing: Easing.bezier(...animations.heartPulse.easing),
        }),
      );
    };

    const timer = setTimeout(() => {
      if (repeat) {
        scale.value = withRepeat(
          withSequence(
            withTiming(1.1, {
              duration: animations.heartPulse.duration / 2,
              easing: Easing.bezier(...animations.heartPulse.easing),
            }),
            withTiming(1, {
              duration: animations.heartPulse.duration / 2,
              easing: Easing.bezier(...animations.heartPulse.easing),
            }),
          ),
          -1,
          false,
        );
      } else {
        startAnimation();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [repeat, delay, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};
