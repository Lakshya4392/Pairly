import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import MemoriesLockService from '../services/MemoriesLockService';

interface MemoriesLockModalProps {
  visible: boolean;
  onUnlock: () => void;
  onCancel?: () => void;
}

export const MemoriesLockModal: React.FC<MemoriesLockModalProps> = ({
  visible,
  onUnlock,
  onCancel,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [useBiometric, setUseBiometric] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      checkBiometric();
      setPin('');
      setError('');
      setIsVerifying(false);
    }
  }, [visible]);

  const checkBiometric = async () => {
    const available = await MemoriesLockService.isBiometricAvailable();
    setBiometricAvailable(available);

    if (available) {
      const type = await MemoriesLockService.getBiometricType();
      setBiometricType(type);

      const settings = await MemoriesLockService.getSettings();
      setUseBiometric(settings.useBiometric);

      // Auto-trigger biometric if enabled
      if (settings.useBiometric) {
        setTimeout(() => {
          handleBiometricAuth();
        }, 300);
      }
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const success = await MemoriesLockService.authenticateWithBiometric();
      if (success) {
        onUnlock();
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    }
  };

  const handleVerifyPIN = async (currentPin: string) => {
    if (currentPin.length < 4 || isVerifying) return;

    setIsVerifying(true);
    const isValid = await MemoriesLockService.verifyPIN(currentPin);

    if (isValid) {
      setPin('');
      setError('');
      onUnlock();
    } else {
      setError('Incorrect PIN');
      setPin('');
      Vibration.vibrate(400);

      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
    setIsVerifying(false);
  };

  const handleKeyPress = (key: string) => {
    if (isVerifying) return;

    setError('');
    if (key === 'delete') {
      setPin(prev => prev.slice(0, -1));
    } else if (pin.length < 4) {
      const newPin = pin + key;
      setPin(newPin);

      // Auto-verify when PIN is 4 digits
      if (newPin.length === 4) {
        setTimeout(() => handleVerifyPIN(newPin), 100);
      }
    }
  };

  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      const filled = i < pin.length;
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            filled && styles.pinDotFilled,
            error && styles.pinDotError,
          ]}
        />
      );
    }
    return dots;
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'delete'],
    ];

    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => (
              <TouchableOpacity
                key={keyIndex}
                style={[
                  styles.keypadKey,
                  key === '' && styles.keypadKeyEmpty,
                ]}
                onPress={() => key && handleKeyPress(key)}
                activeOpacity={0.6}
                disabled={key === '' || isVerifying}
              >
                {key === 'delete' ? (
                  <Ionicons name="backspace-outline" size={28} color={colors.text} />
                ) : (
                  <Text style={styles.keypadKeyText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.content,
              { transform: [{ translateX: shakeAnimation }] },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.iconGradient}
                >
                  <Ionicons name="lock-closed" size={32} color="white" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Unlock Memories</Text>
              <Text style={styles.subtitle}>
                Enter your PIN to view your private moments
              </Text>
            </View>

            {/* PIN Dots */}
            <View style={styles.pinContainer}>
              <View style={styles.pinDots}>{renderPinDots()}</View>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : (
                <Text style={styles.helperText}>Enter 4 digit PIN</Text>
              )}
            </View>

            {/* Number Keypad */}
            {renderKeypad()}

            {/* Biometric Button */}
            {biometricAvailable && useBiometric && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricAuth}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={biometricType === 'Face ID' ? 'scan' : 'finger-print'}
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.biometricText}>Use {biometricType}</Text>
              </TouchableOpacity>
            )}

            {/* Cancel Button */}
            {onCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: typeof defaultColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    container: {
      width: '90%',
      maxWidth: 360,
    },
    content: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      ...shadows.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },

    // Header
    header: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    iconContainer: {
      marginBottom: spacing.lg,
    },
    iconGradient: {
      width: 72,
      height: 72,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.lg,
    },
    title: {
      fontFamily: 'Inter-Bold',
      fontSize: 22,
      color: colors.text,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },

    // PIN
    pinContainer: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    pinDots: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    pinDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 2,
      borderColor: colors.border,
    },
    pinDotFilled: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pinDotError: {
      backgroundColor: colors.error,
      borderColor: colors.error,
    },
    helperText: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 13,
      color: colors.error,
      textAlign: 'center',
      fontFamily: 'Inter-Medium',
    },

    // Keypad
    keypad: {
      marginBottom: spacing.lg,
    },
    keypadRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    keypadKey: {
      width: 70,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.lg,
      marginHorizontal: spacing.xs,
    },
    keypadKeyEmpty: {
      backgroundColor: 'transparent',
    },
    keypadKeyText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 26,
      color: colors.text,
    },

    // Biometric Button
    biometricButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
    },
    biometricText: {
      fontSize: 15,
      color: colors.primary,
      fontFamily: 'Inter-SemiBold',
    },

    // Cancel Button
    cancelButton: {
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 15,
      color: colors.textTertiary,
      fontFamily: 'Inter-Medium',
    },
  });
