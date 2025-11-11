// Font helper to get correct Inter font based on weight
export const getInterFont = (weight?: string | number) => {
  const weightNum = typeof weight === 'string' ? parseInt(weight) : weight;
  
  if (!weightNum || weightNum <= 400) {
    return 'Inter-Regular';
  } else if (weightNum <= 500) {
    return 'Inter-Medium';
  } else if (weightNum <= 600) {
    return 'Inter-SemiBold';
  } else {
    return 'Inter-Bold';
  }
};

// Typography styles with proper Inter fonts
export const typography = {
  // Headers
  h1: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    lineHeight: 40,
  },
  h2: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    lineHeight: 36,
  },
  h3: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  h4: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  
  // Body
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  bodySemiBold: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
  
  // Small
  small: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  smallMedium: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Caption
  caption: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  captionMedium: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  
  // Button
  button: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
};
