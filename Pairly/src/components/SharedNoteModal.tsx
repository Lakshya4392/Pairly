import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface SharedNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (content: string, expiresIn24h: boolean) => Promise<void>;
  partnerName: string;
}

export const SharedNoteModal: React.FC<SharedNoteModalProps> = ({
  visible,
  onClose,
  onSend,
  partnerName,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  
  const [content, setContent] = useState('');
  const [expiresIn24h, setExpiresIn24h] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;
    
    setSending(true);
    try {
      await onSend(content.trim(), expiresIn24h);
      setContent('');
      setExpiresIn24h(true);
      onClose();
    } catch (error) {
      console.error('Error sending note:', error);
    } finally {
      setSending(false);
    }
  };

  const characterCount = content.length;
  const maxCharacters = 500;
  const isOverLimit = characterCount > maxCharacters;

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
                <Ionicons name="chatbubble-ellipses" size={24} color={colors.secondary} />
              </View>
              <View>
                <Text style={styles.title}>Send Love Note</Text>
                <Text style={styles.subtitle}>to {partnerName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Write something sweet... 💕"
              placeholderTextColor={colors.textTertiary}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={maxCharacters + 50} // Allow typing a bit over to show error
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

          {/* Options */}
          <View style={styles.optionsContainer}>
            <View style={styles.option}>
              <View style={styles.optionLeft}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.optionText}>Auto-delete after 24 hours</Text>
              </View>
              <Switch
                value={expiresIn24h}
                onValueChange={setExpiresIn24h}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={expiresIn24h ? colors.primary : colors.textTertiary}
              />
            </View>
          </View>

          {/* Examples */}
          <View style={styles.examplesContainer}>
            <Text style={styles.examplesTitle}>💡 Quick ideas:</Text>
            <View style={styles.exampleChips}>
              <TouchableOpacity
                style={styles.exampleChip}
                onPress={() => setContent('Good morning, love! ☀️')}
              >
                <Text style={styles.exampleChipText}>Good morning ☀️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exampleChip}
                onPress={() => setContent('Thinking of you 💭')}
              >
                <Text style={styles.exampleChipText}>Thinking of you 💭</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exampleChip}
                onPress={() => setContent('I love you 💕')}
              >
                <Text style={styles.exampleChipText}>I love you 💕</Text>
              </TouchableOpacity>
            </View>
          </View>

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
                name={sending ? "hourglass-outline" : "send"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.sendButtonText}>
                {sending ? 'Sending...' : 'Send Note'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
  optionsContainer: {
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionText: {
    fontSize: 15,
    color: colors.text,
  },
  examplesContainer: {
    marginBottom: spacing.xl,
  },
  examplesTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exampleChip: {
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
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
