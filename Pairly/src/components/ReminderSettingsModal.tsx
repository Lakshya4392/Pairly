import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import NotificationService from '../services/NotificationService';

interface ReminderSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  partnerName: string;
  isPremium: boolean;
  onUpgrade: () => void;
}

interface ReminderSettings {
  dailyMoment: { enabled: boolean; time: string };
  goodMorning: { enabled: boolean; time: string };
  goodNight: { enabled: boolean; time: string };
  anniversary: { enabled: boolean; date: string | null };
  dailyLimit: { enabled: boolean };
  partnerActivity: { enabled: boolean };
  dualComplete: { enabled: boolean };
  timeLockUnlock: { enabled: boolean };
}

export const ReminderSettingsModal: React.FC<ReminderSettingsModalProps> = ({
  visible,
  onClose,
  partnerName,
  isPremium,
  onUpgrade,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  
  const [settings, setSettings] = useState<ReminderSettings>({
    dailyMoment: { enabled: false, time: '09:00' },
    goodMorning: { enabled: false, time: '08:00' },
    goodNight: { enabled: false, time: '22:00' },
    anniversary: { enabled: false, date: null },
    dailyLimit: { enabled: true },
    partnerActivity: { enabled: true },
    dualComplete: { enabled: true },
    timeLockUnlock: { enabled: true },
  });
  
  const [showTimePicker, setShowTimePicker] = useState<{
    type: 'dailyMoment' | 'goodMorning' | 'goodNight' | null;
    time: Date;
  }>({ type: null, time: new Date() });

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const loaded = await NotificationService.getReminderSettings();
      setSettings(loaded);
    } catch (error) {
      console.error('Error loading reminder settings:', error);
    }
  };

  const handleToggle = async (
    type: 'dailyMoment' | 'goodMorning' | 'goodNight' | 'partnerActivity',
    enabled: boolean
  ) => {
    if (!isPremium && type !== 'partnerActivity') {
      onUpgrade();
      return;
    }

    const newSettings = {
      ...settings,
      [type]: { ...settings[type], enabled },
    };
    setSettings(newSettings);

    try {
      await NotificationService.saveReminderSettings(newSettings);

      // Schedule or cancel notification
      if (type === 'dailyMoment') {
        if (enabled) {
          await NotificationService.scheduleDailyMomentReminder(
            settings.dailyMoment.time,
            partnerName
          );
        } else {
          await NotificationService.cancelReminder('dailyMoment');
        }
      } else if (type === 'goodMorning') {
        if (enabled) {
          await NotificationService.scheduleGoodMorningReminder(
            settings.goodMorning.time,
            partnerName
          );
        } else {
          await NotificationService.cancelReminder('goodMorning');
        }
      } else if (type === 'goodNight') {
        if (enabled) {
          await NotificationService.scheduleGoodNightReminder(
            settings.goodNight.time,
            partnerName
          );
        } else {
          await NotificationService.cancelReminder('goodNight');
        }
      }

      console.log(`✅ ${type} reminder ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(`Error toggling ${type}:`, error);
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker({ type: null, time: new Date() });
    }

    if (selectedDate && showTimePicker.type) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;

      const newSettings = {
        ...settings,
        [showTimePicker.type]: {
          ...settings[showTimePicker.type],
          time: timeString,
        },
      };
      setSettings(newSettings);

      // Save and reschedule
      saveAndReschedule(showTimePicker.type, timeString);
    }
  };

  const saveAndReschedule = async (
    type: 'dailyMoment' | 'goodMorning' | 'goodNight',
    time: string
  ) => {
    try {
      const newSettings = {
        ...settings,
        [type]: { ...settings[type], time },
      };
      
      await NotificationService.saveReminderSettings(newSettings);

      // Reschedule if enabled
      if (settings[type].enabled) {
        if (type === 'dailyMoment') {
          await NotificationService.scheduleDailyMomentReminder(time, partnerName);
        } else if (type === 'goodMorning') {
          await NotificationService.scheduleGoodMorningReminder(time, partnerName);
        } else if (type === 'goodNight') {
          await NotificationService.scheduleGoodNightReminder(time, partnerName);
        }
        console.log(`✅ ${type} rescheduled for ${time}`);
      }
    } catch (error) {
      console.error(`Error rescheduling ${type}:`, error);
    }
  };

  const openTimePicker = (type: 'dailyMoment' | 'goodMorning' | 'goodNight') => {
    if (!isPremium) {
      onUpgrade();
      return;
    }

    const [hours, minutes] = settings[type].time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    setShowTimePicker({ type, time: date });
  };

  const testNotification = async (type: 'dailyMoment' | 'goodMorning' | 'goodNight') => {
    try {
      await NotificationService.sendTestNotification(
        type === 'dailyMoment' ? 'daily_moment' : 
        type === 'goodMorning' ? 'good_morning' : 'good_night'
      );
      console.log(`✅ Test notification sent: ${type}`);
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Reminder Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Daily Moment Reminder */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="camera" size={20} color={colors.primary} />
                </View>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionTitle}>Daily Moment Reminder</Text>
                  <Text style={styles.sectionDescription}>
                    Get reminded to share a moment
                  </Text>
                </View>
                {!isPremium && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>PRO</Text>
                  </View>
                )}
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Enable Reminder</Text>
                <Switch
                  value={settings.dailyMoment.enabled}
                  onValueChange={(val) => handleToggle('dailyMoment', val)}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={settings.dailyMoment.enabled ? colors.primary : colors.textTertiary}
                />
              </View>

              {settings.dailyMoment.enabled && (
                <>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => openTimePicker('dailyMoment')}
                  >
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                    <Text style={styles.timeText}>{settings.dailyMoment.time}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => testNotification('dailyMoment')}
                  >
                    <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                    <Text style={styles.testButtonText}>Test Notification</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Good Morning Reminder */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="sunny" size={20} color="#FF9800" />
                </View>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionTitle}>Good Morning</Text>
                  <Text style={styles.sectionDescription}>
                    Start the day with a sweet reminder
                  </Text>
                </View>
                {!isPremium && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>PRO</Text>
                  </View>
                )}
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Enable Reminder</Text>
                <Switch
                  value={settings.goodMorning.enabled}
                  onValueChange={(val) => handleToggle('goodMorning', val)}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={settings.goodMorning.enabled ? colors.primary : colors.textTertiary}
                />
              </View>

              {settings.goodMorning.enabled && (
                <>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => openTimePicker('goodMorning')}
                  >
                    <Ionicons name="time-outline" size={20} color="#FF9800" />
                    <Text style={styles.timeText}>{settings.goodMorning.time}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => testNotification('goodMorning')}
                  >
                    <Ionicons name="notifications-outline" size={16} color="#FF9800" />
                    <Text style={styles.testButtonText}>Test Notification</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Good Night Reminder */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#E8EAF6' }]}>
                  <Ionicons name="moon" size={20} color="#3F51B5" />
                </View>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionTitle}>Good Night</Text>
                  <Text style={styles.sectionDescription}>
                    End the day with a loving reminder
                  </Text>
                </View>
                {!isPremium && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>PRO</Text>
                  </View>
                )}
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Enable Reminder</Text>
                <Switch
                  value={settings.goodNight.enabled}
                  onValueChange={(val) => handleToggle('goodNight', val)}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={settings.goodNight.enabled ? colors.primary : colors.textTertiary}
                />
              </View>

              {settings.goodNight.enabled && (
                <>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => openTimePicker('goodNight')}
                  >
                    <Ionicons name="time-outline" size={20} color="#3F51B5" />
                    <Text style={styles.timeText}>{settings.goodNight.time}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => testNotification('goodNight')}
                  >
                    <Ionicons name="notifications-outline" size={16} color="#3F51B5" />
                    <Text style={styles.testButtonText}>Test Notification</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Partner Activity */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#FCE4EC' }]}>
                  <Ionicons name="heart" size={20} color="#E91E63" />
                </View>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionTitle}>Partner Activity</Text>
                  <Text style={styles.sectionDescription}>
                    Get notified when partner sends moments
                  </Text>
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Enable Notifications</Text>
                <Switch
                  value={settings.partnerActivity.enabled}
                  onValueChange={(val) => handleToggle('partnerActivity', val)}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={settings.partnerActivity.enabled ? colors.primary : colors.textTertiary}
                />
              </View>
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                Reminders will be sent at the exact time you set. Make sure notifications are enabled in your phone settings.
              </Text>
            </View>
          </ScrollView>

          {/* Time Picker */}
          {showTimePicker.type && (
            <DateTimePicker
              value={showTimePicker.time}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '90%',
    ...shadows.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  scrollView: {
    padding: spacing.xl,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryPastel,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  premiumBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  premiumText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: 'white',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  settingLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.text,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  timeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  testButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.primary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryPastel,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  infoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },
});
