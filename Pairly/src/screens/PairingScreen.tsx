import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// Removed unused imports
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors, gradients } from '../theme/colorsIOS';
import { spacing, layout, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface PairingScreenProps {
  onPairingComplete: () => void;
  onSkipPairing?: () => void;
  onShowConnectionScreen?: (code: string, userName: string) => void;
}

export const PairingScreen: React.FC<PairingScreenProps> = ({ onPairingComplete, onSkipPairing, onShowConnectionScreen }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<'choose' | 'generate' | 'join'>('choose');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('You');
  
  // Animation values for cards
  const generateCardScale = useSharedValue(1);
  const joinCardScale = useSharedValue(1);

  // Define animated styles at top level
  const animatedGenerateCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: generateCardScale.value }],
  }));

  const animatedJoinCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: joinCardScale.value }],
  }));

  const handleGenerateCode = async () => {
    // Animate card press
    generateCardScale.value = withTiming(0.97, { duration: 100 }, () => {
      generateCardScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    });

    setLoading(true);
    
    // Start loading user info and code generation in parallel for speed
    const [userResult, codeResult] = await Promise.allSettled([
      (async () => {
        const AuthService = (await import('../services/AuthService')).default;
        const user = await AuthService.getUser();
        return user?.displayName?.split(' ')[0] || 'You';
      })(),
      (async () => {
        const PairingService = (await import('../services/PairingService')).default;
        return await PairingService.generateCode();
      })()
    ]);

    setLoading(false);

    // Handle results
    const displayName = userResult.status === 'fulfilled' ? userResult.value : 'You';
    const code = codeResult.status === 'fulfilled' ? codeResult.value : null;

    if (!code) {
      Alert.alert('Error', 'Failed to generate invite code');
      return;
    }

    setUserName(displayName);
    setGeneratedCode(code);
    
    // Show connection screen if callback provided
    if (onShowConnectionScreen) {
      onShowConnectionScreen(code, displayName);
    } else {
      setMode('generate');
    }
  };

  const handleCopyCode = () => {
    Clipboard.setStringAsync(generatedCode);
    Alert.alert('Copied!', 'Invite code copied to clipboard');
  };

  const handleJoinWithCode = async () => {
    if (inviteCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-character code');
      return;
    }

    setLoading(true);
    
    // Get user name first
    const AuthService = (await import('../services/AuthService')).default;
    const user = await AuthService.getUser();
    const displayName = user?.displayName?.split(' ')[0] || 'You';
    setUserName(displayName);

    // Show connection screen immediately with waiting state
    if (onShowConnectionScreen) {
      onShowConnectionScreen(inviteCode, displayName);
    }

    try {
      const PairingService = (await import('../services/PairingService')).default;
      await PairingService.joinWithCode(inviteCode);
      // Connection successful - will be handled by connection screen
      onPairingComplete();
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Invalid or expired code');
    }
  };

  const renderChooseMode = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.iconGradient}
          >
            <Ionicons name="people" size={32} color="white" />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Connect with Your Person</Text>
        <Text style={styles.subtitle}>
          Choose how you'd like to pair with your partner
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        <Animated.View style={animatedGenerateCardStyle}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleGenerateCode}
            activeOpacity={1}
            disabled={loading}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Generate Code</Text>
              <Text style={styles.optionDescription}>
                Create an invite code to share with your partner
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={animatedJoinCardStyle}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => {
              joinCardScale.value = withTiming(0.97, { duration: 100 }, () => {
                joinCardScale.value = withSpring(1, { damping: 10, stiffness: 200 });
              });
              setTimeout(() => setMode('join'), 100);
            }}
            activeOpacity={1}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="enter" size={24} color={colors.secondary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Enter Code</Text>
              <Text style={styles.optionDescription}>
                Join using your partner's invite code
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {onSkipPairing && (
        <View style={styles.skipContainer}>
          <Text style={styles.skipText}>Want to explore the app first?</Text>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkipPairing}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderGenerateMode = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          </View>
        </View>
        <Text style={styles.title}>Your Invite Code</Text>
        <Text style={styles.subtitle}>Share this code with your partner</Text>
      </View>

      <View style={styles.codeContainer}>
        <View style={styles.codeDisplay}>
          <Text style={styles.codeText}>{generatedCode}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.copyButton} 
          onPress={handleCopyCode}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.copyButtonGradient}
          >
            <Ionicons name="copy" size={20} color="white" />
            <Text style={styles.copyButtonText}>Copy Code</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="time" size={16} color={colors.textTertiary} />
        <Text style={styles.expiryText}>Code expires in 24 hours</Text>
      </View>

      <TouchableOpacity
        style={styles.backButtonContainer}
        onPress={() => setMode('choose')}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textTertiary} />
        <Text style={styles.backButtonText}>Back to options</Text>
      </TouchableOpacity>
    </View>
  );

  const renderJoinMode = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <View style={styles.joinIconContainer}>
            <Ionicons name="link" size={32} color={colors.secondary} />
          </View>
        </View>
        <Text style={styles.title}>Enter Invite Code</Text>
        <Text style={styles.subtitle}>Enter the 6-character code from your partner</Text>
      </View>

      <View style={styles.joinInputContainer}>
        <View style={styles.codeInputWrapper}>
          <TextInput
            style={styles.codeInput}
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={colors.textTertiary}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
          />
        </View>
        
        <Text style={styles.inputHelper}>
          Ask your partner to share their invite code
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.connectButton,
          inviteCode.length !== 6 && styles.connectButtonDisabled
        ]}
        onPress={handleJoinWithCode}
        disabled={loading || inviteCode.length !== 6}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={inviteCode.length === 6 ? [colors.secondary, colors.secondaryLight] : [colors.disabled, colors.disabled]}
          style={styles.connectButtonGradient}
        >
          {loading ? (
            <Text style={styles.connectButtonText}>Connecting...</Text>
          ) : (
            <>
              <Ionicons name="link" size={20} color="white" />
              <Text style={styles.connectButtonText}>Connect</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButtonContainer}
        onPress={() => {
          setMode('choose');
          setInviteCode('');
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textTertiary} />
        <Text style={styles.backButtonText}>Back to options</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'choose' && renderChooseMode()}
        {mode === 'generate' && renderGenerateMode()}
        {mode === 'join' && renderJoinMode()}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
  },

  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.huge,
  },
  iconContainer: {
    marginBottom: spacing.xxl,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xl,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: colors.successLight,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-SemiBold', fontSize: 24,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Options Container
  optionsContainer: {
    gap: spacing.lg,
    marginBottom: spacing.huge,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    borderWidth: 0,
    ...shadows.md,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 18,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Code Display
  codeContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  codeDisplay: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxxl,
    marginBottom: spacing.xxl,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  codeText: {
    fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 36,
    color: colors.primary,
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  copyButton: {
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  copyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  copyButtonText: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: 'white',
  },

  // Info Container
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  expiryText: {
    fontSize: 14,
    color: colors.textTertiary,
  },

  // Join Input
  joinInputContainer: {
    marginBottom: spacing.xxxl,
  },
  codeInputWrapper: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  codeInput: {
    fontFamily: 'Inter-SemiBold', fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  inputHelper: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // Connect Button
  connectButton: {
    borderRadius: borderRadius.md,
    marginBottom: spacing.xxxl,
    ...shadows.md,
  },
  connectButtonDisabled: {
    ...shadows.none,
  },
  connectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  connectButtonText: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: 'white',
  },

  // Back Button
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.textTertiary,
  },

  // Skip Section
  skipContainer: {
    alignItems: 'center',
    marginTop: spacing.huge,
    paddingTop: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  skipText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  skipButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
});
