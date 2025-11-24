import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface DualCameraModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (title: string) => void;
  partnerName: string;
}

export const DualCameraModal: React.FC<DualCameraModalProps> = ({
  visible,
  onClose,
  onCapture,
  partnerName,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug log
  React.useEffect(() => {
    console.log('🎬 DualCameraModal visible:', visible);
    
    // Reset title when modal opens
    if (visible) {
      console.log('✅ Modal opened - resetting title');
      setTitle('');
      setIsProcessing(false);
    }
  }, [visible]);

  const handleCapture = () => {
    console.log('📸 Capture button clicked with title:', title);
    
    if (isProcessing) {
      console.log('⚠️ Already processing, ignoring click');
      return;
    }
    
    if (title.trim()) {
      setIsProcessing(true);
      console.log('✅ Starting capture process...');
      onCapture(title.trim());
      setTitle('');
      // Don't call onClose here - let parent handle it
    } else {
      console.log('⚠️ Title is empty');
    }
  };
  
  const handleClose = () => {
    console.log('🚪 Modal close requested');
    if (!isProcessing) {
      setTitle('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <View style={styles.container}>
          <LinearGradient
            colors={['#E8F5E9', '#F1F8E9']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="camera-reverse" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.title}>Dual Camera Moment</Text>
              <Text style={styles.subtitle}>
                Capture the same moment from two perspectives 💞
              </Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* How it works */}
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>How it works:</Text>
                <View style={styles.stepContainer}>
                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={styles.stepText}>Give your moment a title</Text>
                  </View>
                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={styles.stepText}>You capture your view</Text>
                  </View>
                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text style={styles.stepText}>{partnerName} captures their view</Text>
                  </View>
                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>4</Text>
                    </View>
                    <Text style={styles.stepText}>Photos combine automatically! ✨</Text>
                  </View>
                </View>
              </View>

              {/* Title Input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Moment Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Our Coffee Date, Sunset Walk..."
                  placeholderTextColor={colors.textTertiary}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={50}
                  autoFocus
                />
                <Text style={styles.charCount}>{title.length}/50</Text>
              </View>

              {/* Example Preview */}
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Preview:</Text>
                <View style={styles.previewContainer}>
                  <View style={styles.previewHalf}>
                    <Ionicons name="person" size={32} color={colors.primary} />
                    <Text style={styles.previewLabel}>Your View</Text>
                  </View>
                  <View style={styles.previewDivider} />
                  <View style={styles.previewHalf}>
                    <Ionicons name="person" size={32} color={colors.secondary} />
                    <Text style={styles.previewLabel}>{partnerName}'s View</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.captureButton, (!title.trim() || isProcessing) && styles.captureButtonDisabled]}
                onPress={handleCapture}
                disabled={!title.trim() || isProcessing}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={title.trim() ? ['#4CAF50', '#66BB6A'] : [colors.disabled, colors.disabled]}
                  style={styles.captureButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="camera" size={20} color="white" />
                  <Text style={styles.captureText}>Start Capturing</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    ...shadows.xl,
  },
  gradient: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  infoTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepContainer: {
    gap: spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: 'white',
  },
  stepText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  charCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  previewCard: {
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  previewTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.md,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewHalf: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewDivider: {
    width: 2,
    height: 60,
    backgroundColor: colors.border,
  },
  previewLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.textSecondary,
  },
  captureButton: {
    flex: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.md,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  captureText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
  },
});
