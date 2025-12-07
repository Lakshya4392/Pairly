import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors, gradients } from '../theme/colorsIOS';
import { spacing, layout, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface PairingConnectionScreenProps {
  mode: 'waiting' | 'connected';
  userCode?: string;
  userName: string;
  partnerName?: string;
  onGoHome: () => void;
  onCancel?: () => void;
}

export const PairingConnectionScreen: React.FC<PairingConnectionScreenProps> = ({
  mode: initialMode,
  userCode,
  userName,
  partnerName: initialPartnerName,
  onGoHome,
  onCancel,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<'waiting' | 'connected'>(initialMode);
  const [partnerName, setPartnerName] = useState(initialPartnerName);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>('15:00');
  
  // Animations
  const pulseAnim = new Animated.Value(1);
  const rotateAnim = new Animated.Value(0);
  const connectLineAnim = new Animated.Value(0);
  const successScaleAnim = new Animated.Value(0);

  // Setup INSTANT realtime listener - NO TIMEOUT until code expires (15 minutes)
  useEffect(() => {
    let mounted = true;
    let pollingInterval: NodeJS.Timeout;
    let countdownInterval: NodeJS.Timeout;
    let socketListenerCleanup: (() => void) | null = null;

    const setupListener = async () => {
      try {
        const SocketConnectionService = (await import('../services/SocketConnectionService')).default;
        const PairingService = (await import('../services/PairingService')).default;
        
        console.log('🔌 Setting up INSTANT connection listeners...');
        
        // Listen for partner connection via socket
        const handlePairingEvent = async (data: any) => {
          console.log('🎉 Pairing event received:', data);
          
          if (!mounted) return;
          
          // Clear polling since we got the event
          if (pollingInterval) clearInterval(pollingInterval);
          if (countdownInterval) clearInterval(countdownInterval);
          
          // Store partner info from socket event
          if (data.partner) {
            const partnerInfo: any = {
              id: data.partner.id,
              clerkId: data.partner.clerkId || data.partner.id,
              displayName: data.partner.displayName || 'Partner',
              email: data.partner.email || '',
              photoUrl: data.partner.photoUrl,
              createdAt: new Date().toISOString(),
            };
            
            // Create pair object and store it
            const pair: any = {
              id: data.pairId || 'temp-id',
              user1Id: data.partnerId || data.partner.id,
              user2Id: data.userId || '',
              pairedAt: new Date().toISOString(),
              partner: partnerInfo,
            };
            
            await PairingService.storePair(pair);
            console.log('✅ Pair data stored from socket event');
            
            if (mounted) {
              setPartnerName(partnerInfo.displayName);
              setMode('connected');
              
              // Auto-redirect to home after 2 seconds
              setTimeout(() => {
                if (mounted) {
                  console.log('🏠 Auto-redirecting to home...');
                  onGoHome();
                }
              }, 2000);
            }
          } else {
            // Fallback: try to get partner info from service
            try {
              const partner = await PairingService.getPartner();
              if (partner && mounted) {
                setPartnerName(partner.displayName || 'Partner');
                setMode('connected');
                
                // Auto-redirect to home after 2 seconds
                setTimeout(() => {
                  if (mounted) {
                    console.log('🏠 Auto-redirecting to home...');
                    onGoHome();
                  }
                }, 2000);
              }
            } catch (error) {
              console.error('Error getting partner info:', error);
              // Still show connected even if we can't get partner name
              if (mounted) {
                setPartnerName('Partner');
                setMode('connected');
                
                // Auto-redirect to home after 2 seconds
                setTimeout(() => {
                  if (mounted) {
                    console.log('🏠 Auto-redirecting to home...');
                    onGoHome();
                  }
                }, 2000);
              }
            }
          }
        };

        // Subscribe to socket pairing events
        const unsubscribe = SocketConnectionService.onPairingEvent(handlePairingEvent);
        socketListenerCleanup = unsubscribe;

        // Start countdown timer for code expiry (15 minutes)
        const startTime = Date.now();
        const expiryDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
        
        countdownInterval = setInterval(() => {
          if (!mounted || mode !== 'waiting') {
            clearInterval(countdownInterval);
            return;
          }
          
          const elapsed = Date.now() - startTime;
          const remaining = expiryDuration - elapsed;
          
          if (remaining <= 0) {
            // Code expired
            clearInterval(countdownInterval);
            clearInterval(pollingInterval);
            if (mounted) {
              setTimeoutReached(true);
              setRemainingTime('0:00');
            }
          } else {
            // Update countdown
            const minutes = Math.floor(remaining / (60 * 1000));
            const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
            if (mounted) {
              setRemainingTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
          }
        }, 1000); // Update every second

        // Polling fallback - check every 5 seconds (reduced from 1 second)
        // Will continue until code expires (15 minutes)
        console.log('⏰ Starting polling for pairing status (check every 5s)...');
        let pollCount = 0;
        pollingInterval = setInterval(async () => {
          if (!mounted || mode !== 'waiting') {
            clearInterval(pollingInterval);
            return;
          }
          
          // Check if code expired
          const elapsed = Date.now() - startTime;
          if (elapsed >= expiryDuration) {
            console.log('⏱️ Code expired after 15 minutes');
            clearInterval(pollingInterval);
            if (mounted) {
              setTimeoutReached(true);
            }
            return;
          }
          
          pollCount++;
          if (pollCount % 10 === 0) {
            // Log every 10 seconds to avoid spam
            console.log(`🔄 Still waiting for partner... (${pollCount}s elapsed)`);
          }
          
          try {
            const partner = await PairingService.getPartner();
            if (partner && mounted) {
              console.log('✅ Pairing found via polling!');
              clearInterval(pollingInterval);
              clearInterval(countdownInterval);
              setPartnerName(partner.displayName || 'Partner');
              setMode('connected');
              
              // Auto-redirect to home after 2 seconds
              setTimeout(() => {
                if (mounted) {
                  console.log('🏠 Auto-redirecting to home...');
                  onGoHome();
                }
              }, 2000);
            }
          } catch (error: any) {
            // Stop polling on auth errors
            if (error?.message?.includes('401') || error?.message?.includes('expired')) {
              console.log('🛑 Stopping polling due to auth error');
              clearInterval(pollingInterval);
            }
            // Otherwise silent - polling will continue
          }
        }, 5000); // Poll every 5 seconds (reduced from 1s to save battery/network)

        return () => {
          if (socketListenerCleanup) socketListenerCleanup();
          if (countdownInterval) clearInterval(countdownInterval);
          if (pollingInterval) clearInterval(pollingInterval);
        };
      } catch (error) {
        console.error('Error setting up realtime listener:', error);
      }
    };

    setupListener();

    return () => {
      mounted = false;
      if (socketListenerCleanup) socketListenerCleanup();
      if (countdownInterval) clearInterval(countdownInterval);
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, []);

  useEffect(() => {
    if (mode === 'waiting') {
      startWaitingAnimation();
    } else if (mode === 'connected') {
      startConnectedAnimation();
    }
  }, [mode]);

  const startWaitingAnimation = () => {
    // Pulse animation for searching
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation for searching icon
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const startConnectedAnimation = () => {
    // Stop waiting animations
    pulseAnim.stopAnimation();
    rotateAnim.stopAnimation();

    // Connection line animation
    Animated.timing(connectLineAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Success scale animation
    setTimeout(() => {
      Animated.spring(successScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 400);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const lineWidth = connectLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={styles.header}>
        {onCancel && mode === 'waiting' && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>
          {mode === 'waiting' ? 'Waiting for Connection' : 'Connected! 🎉'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'waiting' 
            ? 'Share your code with your partner' 
            : `You're now connected with ${partnerName}`
          }
        </Text>

        {/* Code Display (only in waiting mode) */}
        {mode === 'waiting' && userCode && (
          <View style={styles.codeContainer}>
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Your Code</Text>
              <Text style={styles.codeText}>{userCode}</Text>
            </View>
          </View>
        )}

        {/* Connection Animation */}
        <View style={styles.animationContainer}>
          {/* Left User Icon */}
          <View style={styles.userContainer}>
            <View style={[styles.userIcon, styles.userIconLeft]}>
              <Ionicons name="person" size={32} color="white" />
            </View>
            <Text style={styles.userLabel}>{userName}</Text>
          </View>

          {/* Connection Line */}
          <View style={styles.connectionLineContainer}>
            {mode === 'waiting' ? (
              // Searching Animation
              <Animated.View 
                style={[
                  styles.searchingDots,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <Animated.View 
                  style={[
                    styles.searchIcon,
                    { transform: [{ rotate: rotateInterpolate }] }
                  ]}
                >
                  <Ionicons name="sync" size={24} color={colors.primary} />
                </Animated.View>
              </Animated.View>
            ) : (
              // Connected Line
              <>
                <Animated.View 
                  style={[
                    styles.connectionLine,
                    { width: lineWidth }
                  ]}
                />
                <Animated.View 
                  style={[
                    styles.heartIcon,
                    { transform: [{ scale: successScaleAnim }] }
                  ]}
                >
                  <Ionicons name="heart" size={24} color={colors.error} />
                </Animated.View>
              </>
            )}
          </View>

          {/* Right Partner Icon */}
          <View style={styles.userContainer}>
            <View style={[
              styles.userIcon, 
              styles.userIconRight,
              mode === 'waiting' && styles.userIconWaiting
            ]}>
              {mode === 'waiting' ? (
                <Ionicons name="help" size={32} color={colors.textTertiary} />
              ) : (
                <Ionicons name="person" size={32} color="white" />
              )}
            </View>
            <Text style={[
              styles.userLabel,
              mode === 'waiting' && styles.userLabelWaiting
            ]}>
              {mode === 'waiting' ? 'Searching...' : partnerName}
            </Text>
          </View>
        </View>

        {/* Status Message with Countdown */}
        <View style={styles.statusContainer}>
          {mode === 'waiting' ? (
            <>
              <Ionicons 
                name={timeoutReached ? "alert-circle-outline" : "time-outline"} 
                size={20} 
                color={timeoutReached ? colors.error : colors.textTertiary} 
              />
              <Text style={[styles.statusText, timeoutReached && styles.statusTextError]}>
                {timeoutReached 
                  ? 'Code expired - Please generate a new code'
                  : `Waiting for partner • Code expires in ${remainingTime}`
                }
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.statusText, styles.statusTextSuccess]}>
                Connection established successfully
              </Text>
            </>
          )}
        </View>



        {/* Action Button */}
        {mode === 'connected' && (
          <TouchableOpacity
            style={styles.homeButton}
            onPress={onGoHome}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.homeButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.homeButtonText}>Let's Go to Home</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.massive,
    paddingBottom: spacing.xl,
  },
  cancelButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Title
  title: {
    fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 36,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    lineHeight: 24,
  },

  // Code Display
  codeContainer: {
    marginBottom: spacing.xxxl,
  },
  codeBox: {
    backgroundColor: colors.primaryPastel,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxxl,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  codeLabel: {
    fontFamily: 'Inter-SemiBold', fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  codeText: {
    fontSize: 28, 
    lineHeight: 36,
    color: colors.primary,
    letterSpacing: 8,
    fontFamily: 'monospace',
  },

  // Animation Container
  animationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },

  // User Icons
  userContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  userIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  userIconLeft: {
    backgroundColor: colors.primary,
  },
  userIconRight: {
    backgroundColor: colors.secondary,
  },
  userIconWaiting: {
    backgroundColor: colors.backgroundSecondary,
  },
  userLabel: {
    fontFamily: 'Inter-SemiBold', fontSize: 14,
    color: colors.text,
  },
  userLabelWaiting: {
    color: colors.textTertiary,
  },

  // Connection Line
  connectionLineContainer: {
    flex: 1,
    height: 4,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  connectionLine: {
    position: 'absolute',
    left: 0,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  searchingDots: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.primaryPastel,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },

  // Status
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xxxl,
  },
  statusText: {
    fontSize: 14,
    color: colors.textTertiary,
    fontFamily: 'Inter-Medium',
  },
  statusTextSuccess: {
    color: colors.success,
  },
  statusTextError: {
    color: colors.error,
  },

  // Home Button
  homeButton: {
    width: '100%',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.lg,
  },
  homeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  homeButtonText: {
    fontFamily: 'Inter-SemiBold', fontSize: 18,
    color: 'white',
  },


});
