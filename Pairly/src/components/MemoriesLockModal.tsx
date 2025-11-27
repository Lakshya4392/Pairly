import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  Vibration,
  Keyboard,
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
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      checkBiometric();
      setPin('');
      setError('');
      
      // Focus input after a short delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
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

  const handleVerifyPIN = async () => {
    if (pin.length < 4) {
      setError('Enter your PIN');
      return;
    }

    const isValid = await MemoriesLockService.verifyPIN(pin);
    
    if (isValid) {
      setPin('');
      setError('');
      Keyboard.dismiss();
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
      
      // Re-focus input after error
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  };

  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < 6; i++) {
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      onShow={() => {
        // Force focus when modal shows
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => {
          // Re-focus input when overlay is tapped
          inputRef.current?.focus();
        }}
      >
        <TouchableOpacity 
          style={styles.container}
          activeOpacity={1}
          onPress={() => {
            // Prevent closing when content is tapped
            inputRef.current?.focus();
          }}
        >
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
                <Text style={styles.helperText}>Enter 4-6 digit PIN</Text>
              )}
            </View>

            {/* Hidden Input - Only for keyboard */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={pin}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '');
                setPin(cleaned);
                setError('');
                if (cleaned.length >= 4 && cleaned.length <= 6) {
                  // Auto-verify when PIN is complete
                  setTimeout(() => {
                    handleVerifyPIN();
                  }, 200);
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus={true}
              caretHidden={true}
              contextMenuHidden={true}
              selectTextOnFocus={false}
              showSoftInputOnFocus={true}
              editable={true}
            />

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
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (colors: typeof defaultColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
      width: '100%',
      paddingHorizontal: spacing.xxl,
    },
    content: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xxl,
      padding: spacing.xxxl,
      ...shadows.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },

    // Header
    header: {
      alignItems: 'center',
      marginBottom: spacing.xxxl,
    },
    iconContainer: {
      marginBottom: spacing.xl,
    },
    iconGradient: {
      width: 80,
      height: 80,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.lg,
    },
    title: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      color: colors.text,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },

    // PIN
    pinContainer: {
      alignItems: 'center',
      marginBottom: spacing.xxxl,
    },
    pinDots: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginBottom: spacing.lg,
    },
    pinDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
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
    hiddenInput: {
      position: 'absolute',
      width: 1,
      height: 1,
      opacity: 0,
    },

    // Biometric Button
    biometricButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxl,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
    },
    biometricText: {
      fontSize: 16,
      color: colors.primary,
      fontFamily: 'Inter-SemiBold',
    },

    // Cancel Button
    cancelButton: {
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 15,
      color: colors.textTertiary,
      fontFamily: 'Inter-Medium',
    },
  });
