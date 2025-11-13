import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface TimeLockModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (content: string, unlockDate: Date) => Promise<void>;
  partnerName: string;
}

export const TimeLockModal: React.FC<TimeLockModalProps> = ({
  visible,
  onClose,
  onSend,
  partnerName,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 1 week from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;
    
    setSending(true);
    try {
      await onSend(content.trim(), unlockDate);
      setContent('');
      setUnlockDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      onClose();
    } catch (error) {
      console.error('Error sending time-lock:', error);
    } finally {
      setSending(false);
    }
  };

  const characterCount = content.length;
  const maxCharacters = 1000;
  const isOverLimit = characterCount > maxCharacters;

  const quickDates = [
    { label: 'Tomorrow', days: 1 },
    { label: 'Next Week', days: 7 },
    { label: 'Next Month', days: 30 },
    { label: 'Birthday', days: 90 },
  ];

  const setQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setUnlockDate(date);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="time" size={24} color={colors.secondary} />
              </View>
              <View>
                <Text style={styles.title}>Time-Lock Message</Text>
                <Text style={styles.subtitle}>to {partnerName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Write a message for the future... 💌"
                placeholderTextColor={colors.textTertiary}
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={maxCharacters + 50}
                autoFocus
                textAlignVertical="top"
              />
              <Text style={[
                styles.characterCount,
                isOverLimit && styles.characterCountError
              ]}>
                {characterCount}/{maxCharacters}
              </Text>
            </View>

            {/* Unlock Date */}
            <View style={styles.dateSection}>
              <Text style={styles.sectionTitle}>Unlock On</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={styles.dateText}>{formatDate(unlockDate)}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Quick Date Buttons */}
              <View style={styles.quickDates}>
                {quickDates.map((quick, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickDateChip}
                    onPress={() => setQuickDate(quick.days)}
                  >
                    <Text style={styles.quickDateText}>{quick.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Examples */}
            <View style={styles.examplesContainer}>
              <Text style={styles.examplesTitle}>💡 Ideas:</Text>
              <TouchableOpacity
                style={styles.exampleChip}
                onPress={() => setContent('Happy Birthday my love! 🎂 Remember this moment...')}
              >
                <Text style={styles.exampleChipText}>Birthday wish 🎂</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exampleChip}
                onPress={() => setContent('Happy Anniversary! Can\'t believe it\'s been a year 💕')}
              >
                <Text style={styles.exampleChipText}>Anniversary 💕</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, (isOverLimit || !content.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isOverLimit || !content.trim() || sending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isOverLimit || !content.trim() || sending 
                ? [colors.border, colors.border] 
                : [colors.secondary, colors.secondaryLight]
              }
              style={styles.sendButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons 
                name={sending ? "hourglass-outline" : "lock-closed"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.sendButtonText}>
                {sending ? 'Creating...' : 'Lock & Send'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={unlockDate}
              mode="datetime"
              display="spinner"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setUnlockDate(selectedDate);
                }
              }}
              minimumDate={new Date()}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondaryPastel,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  closeButton: {
    padding: spacing.sm,
  },
  inputContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    minHeight: 120,
  },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.text,
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  characterCountError: {
    color: colors.error,
    fontFamily: 'Inter-SemiBold',
  },
  dateSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dateText: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: colors.text,
  },
  quickDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickDateChip: {
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  quickDateText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  examplesContainer: {
    marginBottom: spacing.xl,
  },
  examplesTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  exampleChip: {
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  exampleChipText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sendButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.lg,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  sendButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: 'white',
  },
});
