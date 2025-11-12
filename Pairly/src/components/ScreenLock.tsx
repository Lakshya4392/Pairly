import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface ScreenLockProps {
  onUnlock: () => void;
  onCancel?: () => void;
  title?: string;
}

export const ScreenLock: React.FC<ScreenLockProps> = ({
  onUnlock,
  onCancel,
  title = 'Enter PIN to Continue',
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const shakeAnimation = new Animated.Value(0);

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.error('Error checking biometric:', error);
    }
  };

  const handlePinChange = async (value: string) => {
    setPin(value);
    setError('');

    if (value.length === 4) {
      // Verify PIN
      try {
        const AppLockService = (await import('../services/AppLockService')).default;
        const isValid = await AppLockService.verifyPIN(value);
        
        if (isValid) {
          onUnlock();
        } else {
          setError('Incorrect PIN');
          setPin('');
          shake();
        }
      } catch (error) {
        console.error('Error verifying PIN:', error);
        setError('Error verifying PIN');
        setPin('');
      }
    }
  };

  const handleBiometric = async () => {
    try {
      const AppLockService = (await import('../services/AppLockService')).default;
      const success = await AppLockService.authenticateWithBiometric();
      
      if (success) {
        onUnlock();
      }
    } catch (error) {
      console.error('Error with biometric:', error);
    }
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDots}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={64} color="white" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Enter your 4-digit PIN</Text>

          <Animated.View
            style={[
              styles.pinContainer,
              { transform: [{ translateX: shakeAnimation }] },
            ]}
          >
            {renderPinDots()}
          </Animated.View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.hiddenInput}
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            autoFocus
          />

          {biometricAvailable && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometric}
            >
              <Ionicons name="finger-print" size={32} color="white" />
              <Text style={styles.biometricText}>Use Biometric</Text>
            </TouchableOpacity>
          )}

          {onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontFamily: 'Inter-SemiBold', fontSize: 24, lineHeight: 32,
    color: 'white',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.xxxl,
    textAlign: 'center',
  },
  pinContainer: {
    marginBottom: spacing.xl,
  },
  pinDots: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'white',
  },
  pinDotFilled: {
    backgroundColor: 'white',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  error: {
    fontSize: 14,
    color: 'white',
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  biometricButton: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    padding: spacing.lg,
  },
  biometricText: {
    fontSize: 14,
    color: 'white',
    marginTop: spacing.sm,
  },
  cancelButton: {
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  cancelText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Inter-SemiBold',
  },
});
