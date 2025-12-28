import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface ScheduledMomentModalProps {
  visible: boolean;
  onClose: () => void;
  onSchedule: (scheduledTime: Date, note: string, duration: number) => void;
  partnerName: string;
}

export const ScheduledMomentModal: React.FC<ScheduledMomentModalProps> = ({
  visible,
  onClose,
  onSchedule,
  partnerName,
}) => {
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(1); // hours (default 1 hour)

  // Duration options: minutes converted to hours for backend
  const durations = [
    { label: '10 min', value: 0.167, minutes: 10 },  // 10/60 = 0.167 hours
    { label: '20 min', value: 0.333, minutes: 20 },  // 20/60 = 0.333 hours
    { label: '30 min', value: 0.5, minutes: 30 },    // 30/60 = 0.5 hours
    { label: '1 hour', value: 1, minutes: 60 },
    { label: '3 hours', value: 3, minutes: 180 },
    { label: '6 hours', value: 6, minutes: 360 },
    { label: '12 hours', value: 12, minutes: 720 },
    { label: '24 hours', value: 24, minutes: 1440 },
  ];

  // Get display text for selected duration
  const getDurationText = (value: number) => {
    const duration = durations.find(d => d.value === value);
    return duration?.label || `${value} hours`;
  };

  const handleSchedule = () => {
    // Combine date and time
    const scheduledDateTime = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selectedTime.getHours(),
      selectedTime.getMinutes()
    );

    onSchedule(scheduledDateTime, note, selectedDuration);

    // Reset
    setNote('');
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setSelectedDuration(24);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={[colors.secondary, colors.secondaryLight]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>Schedule Moment</Text>
                <Text style={styles.headerSubtitle}>
                  Send to {partnerName} later
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Note Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add a Note (Optional)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Write a sweet message..."
                placeholderTextColor={colors.textTertiary}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={200}
              />
              <Text style={styles.charCount}>{note.length}/200</Text>
            </View>

            {/* Date Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>When to Send</Text>

              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={styles.dateTimeText}>{formatDate(selectedDate)}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={styles.dateTimeText}>{formatTime(selectedTime)}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Duration Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Show For</Text>
              <Text style={styles.sectionDescription}>
                How long should this moment stay visible?
              </Text>

              <View style={styles.durationGrid}>
                {durations.map((duration) => (
                  <TouchableOpacity
                    key={duration.value}
                    style={[
                      styles.durationChip,
                      selectedDuration === duration.value && styles.durationChipActive,
                    ]}
                    onPress={() => setSelectedDuration(duration.value)}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        selectedDuration === duration.value && styles.durationChipTextActive,
                      ]}
                    >
                      {duration.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={colors.secondary} />
              <Text style={styles.infoText}>
                Your moment will be delivered at the scheduled time and stay visible for {getDurationText(selectedDuration)}. After that, it will auto-remove for privacy 🔒
              </Text>
            </View>
          </ScrollView>

          {/* Schedule Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={handleSchedule}
            >
              <LinearGradient
                colors={[colors.secondary, colors.secondaryLight]}
                style={styles.scheduleButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="time" size={20} color="white" />
                <Text style={styles.scheduleButtonText}>Schedule Moment</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setSelectedDate(date);
              }}
            />
          )}

          {/* Time Picker */}
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="default"
              onChange={(event, date) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (date) setSelectedTime(date);
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '92%',
  },
  header: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    lineHeight: 32,
    color: 'white',
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: 0.2,
  },
  sectionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  charCount: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateTimeText: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    marginLeft: spacing.md,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  durationChip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  durationChipActive: {
    backgroundColor: colors.secondaryPastel,
    borderColor: colors.secondary,
  },
  durationChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  durationChipTextActive: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: colors.secondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.secondaryPastel,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondary,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  scheduleButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.lg,
  },
  scheduleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  scheduleButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    lineHeight: 24,
    color: 'white',
    letterSpacing: 0.3,
  },
});
