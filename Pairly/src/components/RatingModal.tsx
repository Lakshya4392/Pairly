import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => Promise<void>;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit(rating, feedback);
      setRating(0);
      setFeedback('');
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setFeedback('');
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
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="star" size={32} color={colors.secondary} />
            <Text style={styles.title}>Rate Pairly</Text>
            <Text style={styles.subtitle}>
              How would you rate your experience?
            </Text>
          </View>

          {/* Star Rating */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={48}
                  color={star <= rating ? colors.secondary : colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Rating Text */}
          {rating > 0 && (
            <Text style={styles.ratingText}>
              {rating === 5 && '🎉 Awesome!'}
              {rating === 4 && '😊 Great!'}
              {rating === 3 && '👍 Good'}
              {rating === 2 && '😐 Okay'}
              {rating === 1 && '😞 Not great'}
            </Text>
          )}

          {/* Feedback Input */}
          {rating > 0 && (
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackLabel}>
                Tell us more (optional)
              </Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="What can we improve?"
                placeholderTextColor={colors.textTertiary}
                value={feedback}
                onChangeText={setFeedback}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{feedback.length}/500</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                rating === 0 && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={rating === 0 || loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  rating === 0
                    ? [colors.border, colors.border]
                    : [colors.secondary, colors.secondaryLight]
                }
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </LinearGradient>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    ...shadows.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: 'Inter-SemiBold', fontSize: 24, lineHeight: 32,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  starButton: {
    padding: spacing.xs,
  },
  ratingText: {
    fontFamily: 'Inter-SemiBold', fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  feedbackContainer: {
    marginBottom: spacing.xl,
  },
  feedbackLabel: {
    fontFamily: 'Inter-SemiBold', fontSize: 15,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  feedbackInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: 15,
    color: colors.text,
    minHeight: 100,
    marginBottom: spacing.xs,
  },
  charCount: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'right',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: colors.text,
  },
  submitButton: {
    flex: 1,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  submitButtonText: {
    fontFamily: 'Inter-Bold', fontSize: 16,
    color: 'white',
  },
});
