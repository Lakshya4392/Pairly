import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface PINSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSetPIN: (pin: string) => void;
  title?: string;
  subtitle?: string;
}

export const PINSetupModal: React.FC<PINSetupModalProps> = ({
  visible,
  onClose,
  onSetPIN,
  title = 'Set App PIN',
  subtitle = 'Create a 4-6 digit PIN to secure your app',
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (step === 'enter') {
      if (pin.length !== 4) {
        setError('PIN must be 4 digits');
        return;
      }
      setError('');
      setStep('confirm');
    } else {
      if (pin !== confirmPin) {
        setError('PINs do not match');
        return;
      }
      onSetPIN(pin);
      handleClose();
    }
  };

  const handleClose = () => {
    setPin('');
    setConfirmPin('');
    setStep('enter');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={48} color={colors.primary} />
          </View>

          <Text style={styles.title}>
            {step === 'enter' ? title : 'Confirm Your PIN'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'enter' 
              ? subtitle
              : 'Re-enter your PIN to confirm'
            }
          </Text>

          <TextInput
            style={styles.input}
            value={step === 'enter' ? pin : confirmPin}
            onChangeText={step === 'enter' ? setPin : setConfirmPin}
            placeholder="Enter 4-digit PIN"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            autoFocus
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>
                {step === 'enter' ? 'Continue' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: 'Inter-SemiBold', fontSize: 20, lineHeight: 28,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    fontFamily: 'Inter-SemiBold', fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: colors.text,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  error: {
    fontSize: 14,
    color: colors.error,
    marginBottom: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  continueButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: colors.text,
  },
  continueButtonText: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: 'white',
  },
});
