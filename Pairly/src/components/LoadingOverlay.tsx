/**
 * Loading Overlay Component
 * Shows loading state with progress
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  progress?: number; // 0-100
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  progress,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={[colors.surface, colors.backgroundSecondary]}
            style={styles.gradient}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            
            <Text style={styles.message}>{message}</Text>

            {progress !== undefined && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${progress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    ...shadows.xl,
  },
  gradient: {
    padding: spacing.xxxl,
    alignItems: 'center',
    minWidth: 200,
  },
  message: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: spacing.xl,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
