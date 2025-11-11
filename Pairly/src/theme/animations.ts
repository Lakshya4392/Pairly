// Animation Durations (in milliseconds)
export const durations = {
  instant: 0,
  fast: 200,
  normal: 300,
  medium: 400,
  slow: 500,
  fade: 800,
  verySlow: 1000,
};

// Easing Functions
export const easings = {
  // Standard easings
  linear: [0, 0, 1, 1] as const,
  easeIn: [0.42, 0, 1, 1] as const,
  easeOut: [0, 0, 0.58, 1] as const,
  easeInOut: [0.42, 0, 0.58, 1] as const,

  // Custom easings for romantic feel
  gentle: [0.25, 0.1, 0.25, 1] as const,
  soft: [0.33, 0.1, 0.22, 1] as const,
};

// Spring Configurations (for Reanimated)
export const springs = {
  gentle: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 1,
  },
  soft: {
    damping: 20,
    stiffness: 120,
    mass: 1,
  },
};

// Animation Presets
export const animations = {
  // Heart Pulse Animation
  heartPulse: {
    scale: [1, 1.1, 1],
    duration: durations.medium,
    easing: easings.easeInOut,
  },

  // Fade In
  fadeIn: {
    opacity: [0, 1],
    duration: durations.fade,
    easing: easings.easeOut,
  },

  // Fade Out
  fadeOut: {
    opacity: [1, 0],
    duration: durations.fade,
    easing: easings.easeIn,
  },

  // Slide Up
  slideUp: {
    translateY: [20, 0],
    opacity: [0, 1],
    duration: durations.medium,
    easing: easings.easeOut,
  },

  // Slide Down
  slideDown: {
    translateY: [-20, 0],
    opacity: [0, 1],
    duration: durations.medium,
    easing: easings.easeOut,
  },

  // Scale In
  scaleIn: {
    scale: [0.8, 1],
    opacity: [0, 1],
    duration: durations.normal,
    easing: easings.easeOut,
  },

  // Gentle Bounce
  gentleBounce: {
    scale: [1, 0.95, 1],
    duration: durations.fast,
    easing: easings.easeInOut,
  },

  // Success Animation
  success: {
    scale: [1, 1.2, 1],
    opacity: [1, 1, 0],
    duration: durations.verySlow,
    easing: easings.gentle,
  },

  // Widget Update Animation
  widgetUpdate: {
    opacity: [0, 1],
    scale: [0.95, 1],
    duration: durations.fade,
    easing: easings.soft,
  },
};

export default animations;
