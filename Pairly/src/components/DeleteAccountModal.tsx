/**
 * Delete Account Modal
 * Custom modal with text input confirmation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = confirmText.toUpperCase() === 'DELETE';

  const handleConfirm = async () => {
    if (!isValid) return;

    try {
      setLoading(true);
      await onConfirm();
      setConfirmText('');
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={48} color={colors.error} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Delete Account?</Text>
          
          {/* Description */}
          <Text style={styles.description}>
            This will permanently delete your account and all your data. This action cannot be undone.
          </Text>

          {/* Warning Box */}
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.warningText}>
              All your photos, messages, and partner connection will be lost forever.
            </Text>
          </View>

          {/* Confirmation Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              Type <Text style={styles.deleteText}>DELETE</Text> to confirm
            </Text>
            <TextInput
              style={[
                styles.input,
                isValid && styles.inputValid,
              ]}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="Type DELETE here"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                !isValid && styles.deleteButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!isValid || loading}
              activeOpacity={0.8}
            >
              <View style={styles.deleteButtonContent}>
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.deleteButtonText}>Delete Forever</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxxl,
    width: '100%',
    maxWidth: 400,
    ...shadows.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: colors.errorLight,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: 'Inter-SemiBold', fontSize: 24, lineHeight: 32,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
    fontFamily: 'Inter-Medium',
  },
  inputSection: {
    marginBottom: spacing.xxl,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  deleteText: {
    fontFamily: 'Inter-Bold',
    color: colors.error,
    fontFamily: 'monospace',
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  inputValid: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: colors.text,
  },
  deleteButton: {
    flex: 1,
    height: 56,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.md,
  },
  deleteButtonDisabled: {
    backgroundColor: colors.disabled,
    ...shadows.none,
  },
  deleteButtonContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButtonText: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: 'white',
  },
});
