import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
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
  onShowConnectionScreen?: (code: string, userName: string, mode?: 'waiting' | 'connected', partnerName?: string) => void;
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
  const generateCardScale = useRef(new Animated.Value(1)).current;
  const joinCardScale = useRef(new Animated.Value(1)).current;

  const handleGenerateCode = async () => {
    // Animate card press
    Animated.sequence([
      Animated.timing(generateCardScale, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(generateCardScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    setLoading(true);

    try {
      // Get user info and code in parallel for INSTANT generation
      const AuthService = (await import('../services/AuthService')).default;
      const PairingService = (await import('../services/PairingService')).default;
      const SocketConnectionService = (await import('../services/SocketConnectionService')).default;

      const [user, code] = await Promise.all([
        AuthService.getUser(),
        PairingService.generateCode(),
      ]);

      const displayName = user?.displayName?.split(' ')[0] || 'You';

      // Ensure socket is connected for INSTANT pairing detection
      if (!SocketConnectionService.isConnected() && user) {
        console.log('🔌 Initializing socket for instant pairing...');
        await SocketConnectionService.initialize(user.clerkId);
      }

      setUserName(displayName);
      setGeneratedCode(code);
      setLoading(false);

      console.log('✅ Code generated instantly:', code);

      // Show connection screen immediately
      if (onShowConnectionScreen) {
        onShowConnectionScreen(code, displayName);
      } else {
        setMode('generate');
      }
    } catch (error: any) {
      setLoading(false);
      console.error('❌ Code generation error:', error);
      // This should never happen now, but just in case
      Alert.alert('Error', 'Something went wrong. Please try again.');
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

    try {
      console.log('🔄 Joining with code...');

      // Get user info and initialize socket in parallel for INSTANT connection
      const AuthService = (await import('../services/AuthService')).default;
      const PairingService = (await import('../services/PairingService')).default;
      const SocketConnectionService = (await import('../services/SocketConnectionService')).default;

      const user = await AuthService.getUser();
      const displayName = user?.displayName?.split(' ')[0] || 'You';
      setUserName(displayName);

      // Ensure socket is connected for INSTANT pairing detection
      if (!SocketConnectionService.isConnected() && user) {
        console.log('🔌 Initializing socket for instant pairing...');
        await SocketConnectionService.initialize(user.clerkId);
      }

      // Try to join with code FIRST before showing anything
      const pair = await PairingService.joinWithCode(inviteCode);

      // Connection successful - store pair data
      await PairingService.storePair(pair);
      console.log('✅ Successfully joined with code, pair stored');

      setLoading(false);

      // ⚡ FIX: Show connection animation with CONNECTED state, then navigate to home!
      const partnerDisplayName = pair.partner?.displayName || 'Partner';
      if (onShowConnectionScreen) {
        console.log('🎉 Showing connection success animation with partner:', partnerDisplayName);
        onShowConnectionScreen(inviteCode, displayName, 'connected', partnerDisplayName);
        // The connection screen will auto-navigate to home after 2 seconds
      } else {
        console.log('🏠 Navigating directly to home...');
        onPairingComplete();
      }

    } catch (error: any) {
      setLoading(false);
      console.error('Join error:', error.message);

      Alert.alert(
        'Connection Error',
        error.message || 'Invalid or expired code. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              setMode('choose');
              setInviteCode('');
            }
          }
        ]
      );
    }
  };

  const renderChooseMode = () => (
    <View style={styles.content}>
      {/* Premium Background Atmosphere */}
      <View style={styles.blobContainer}>
        <LinearGradient
          colors={['rgba(255, 107, 157, 0.12)', 'rgba(255, 107, 157, 0)']}
          style={styles.blobTopRight}
          start={{ x: 0.8, y: 0.2 }}
          end={{ x: 0, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(168, 85, 247, 0.12)', 'rgba(168, 85, 247, 0)']}
          style={styles.blobBottomLeft}
          start={{ x: 0.2, y: 0.8 }}
          end={{ x: 1, y: 0 }}
        />
        <LinearGradient
          colors={['rgba(14, 165, 233, 0.08)', 'rgba(14, 165, 233, 0)']}
          style={styles.blobCenter}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      {/* Premium Hero Header with Glowing Heart */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <View style={styles.iconOuterRing}>
            <LinearGradient
              colors={['#FF6B9D', '#EC4899', '#A855F7']}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="heart" size={42} color="white" />
            </LinearGradient>
          </View>
        </View>
        <Text style={styles.title}>Connect with{'\n'}Your Person</Text>
        <Text style={styles.subtitle}>
          Start your shared journey together
        </Text>
      </View>

      {/* Beautiful Premium Option Cards - Vertical Stack */}
      <View style={styles.optionsContainer}>
        {/* Generate Code Card - Blue Pastel */}
        <Animated.View style={{ transform: [{ scale: generateCardScale }], width: '100%' }}>
          <TouchableOpacity
            onPress={handleGenerateCode}
            activeOpacity={0.9}
            disabled={loading}
          >
            <LinearGradient
              colors={['#E0F2FE', '#BAE6FD', '#E0F2FE']}
              style={styles.optionCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.optionCardInner}>
                <View style={[styles.optionIconCircle, { backgroundColor: '#0EA5E9' }]}>
                  <Ionicons name="add" size={28} color="white" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Generate Code</Text>
                  <Text style={styles.optionDescription}>
                    Create your unique invite code
                  </Text>
                </View>
                <View style={styles.optionArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#0EA5E9" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Enter Code Card - Pink Pastel */}
        <Animated.View style={{ transform: [{ scale: joinCardScale }], width: '100%' }}>
          <TouchableOpacity
            onPress={() => {
              Animated.sequence([
                Animated.timing(joinCardScale, {
                  toValue: 0.97,
                  duration: 100,
                  useNativeDriver: true,
                }),
                Animated.spring(joinCardScale, {
                  toValue: 1,
                  useNativeDriver: true,
                }),
              ]).start();
              setTimeout(() => setMode('join'), 100);
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FCE7F3', '#FBCFE8', '#FCE7F3']}
              style={styles.optionCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.optionCardInner}>
                <View style={[styles.optionIconCircle, { backgroundColor: '#EC4899' }]}>
                  <Ionicons name="link" size={28} color="white" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Enter Code</Text>
                  <Text style={styles.optionDescription}>
                    Join with partner's invite code
                  </Text>
                </View>
                <View style={styles.optionArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#EC4899" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {onSkipPairing && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkipPairing}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
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
        <Text style={styles.expiryText}>Code expires in 15 minutes</Text>
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

      {mode === 'choose' && renderChooseMode()}
      {mode === 'generate' && renderGenerateMode()}
      {mode === 'join' && renderJoinMode()}
    </View>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Content - Vertically Centered with Decorations
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: spacing.xxxl,
    position: 'relative',
  },

  // Decorative Blobs
  blobContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    overflow: 'hidden',
  },
  blobTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 450,
    height: 450,
    borderRadius: 225,
    opacity: 0.6,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -50,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.6,
  },
  blobCenter: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.4,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOuterRing: {
    padding: 6,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconGradient: {
    width: 88, // Increased size
    height: 88,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '80%',
  },

  // Options Container - Vertical Stack
  optionsContainer: {
    flexDirection: 'column', // Vertical layout
    gap: spacing.lg,
    marginBottom: spacing.xxl,
    width: '100%',
  },
  // Premium Gradient Card
  optionCardGradient: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    minHeight: 100, // Reduced height for horizontal content flow
  },
  optionCardInner: {
    flexDirection: 'row', // Horizontal content flow inside vertical card
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.md,
    width: '100%',
  },
  optionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Text Container for Vertical Layout
  optionTextContainer: {
    flex: 1,
    alignItems: 'flex-start', // Left align text
  },
  optionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text,
    textAlign: 'left',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'left',
    lineHeight: 18,
  },
  optionArrow: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  // Keep old styles for backward compatibility
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 107, 157, 0.08)',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },

  // Code Display - Soft Pastel
  codeContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  codeDisplay: {
    backgroundColor: '#FFF5F7',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.2)',
  },
  codeText: {
    fontSize: 26,
    lineHeight: 32,
    color: colors.primary,
    letterSpacing: 6,
    fontFamily: 'Inter-Bold',
  },
  copyButton: {
    borderRadius: borderRadius.full,
  },
  copyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  copyButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: 'white',
  },

  // Info Container
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxl,
  },
  expiryText: {
    fontSize: 13,
    color: colors.textTertiary,
  },

  // Join Input - Clean Minimal
  joinInputContainer: {
    marginBottom: spacing.xxl,
  },
  codeInputWrapper: {
    backgroundColor: '#FFF5F7',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.2)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  codeInput: {
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 6,
    fontFamily: 'Inter-Bold',
  },
  inputHelper: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // Connect Button - Rounded Soft
  connectButton: {
    borderRadius: borderRadius.full,
    marginBottom: spacing.xxl,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  connectButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: 'white',
  },

  // Back Button - Subtle
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.textTertiary,
  },

  // Skip Section - Centered and Bottom
  skipContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
    width: '100%',
  },
  skipButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    alignSelf: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: colors.textTertiary,
    fontFamily: 'Inter-Medium',
  },
});
