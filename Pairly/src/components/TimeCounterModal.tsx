import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TimeCounterModalProps {
  visible: boolean;
  onClose: () => void;
  partnerName: string;
  onSave: (meetingDate: Date) => void;
}

const MEETING_DATE_KEY = '@pairly_meeting_date';

export const TimeCounterModal: React.FC<TimeCounterModalProps> = ({
  visible,
  onClose,
  partnerName,
  onSave,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [existingMeetingDate, setExistingMeetingDate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

  // Load existing meeting date on mount
  useEffect(() => {
    const loadMeetingDate = async () => {
      try {
        // First try to get from backend (shared with partner)
        try {
          const apiClient = (await import('../utils/apiClient')).default;
          const response = await apiClient.get<{ success: boolean; data: { meetingDate: string | null } }>('/meeting/countdown');

          if (response.success && response.data?.meetingDate) {
            const date = new Date(response.data.meetingDate);
            if (date > new Date()) {
              setExistingMeetingDate(date);
              setSelectedDate(date);
              await AsyncStorage.setItem(MEETING_DATE_KEY, date.toISOString());
              console.log('✅ Meeting date loaded from backend:', date);
              return;
            }
          }
        } catch (apiError) {
          console.log('⚠️ Backend unavailable, using local storage');
        }

        // Fallback to local storage
        const stored = await AsyncStorage.getItem(MEETING_DATE_KEY);
        if (stored) {
          const date = new Date(stored);
          if (date > new Date()) {
            setExistingMeetingDate(date);
            setSelectedDate(date);
          }
        }
      } catch (error) {
        console.error('Error loading meeting date:', error);
      }
    };
    loadMeetingDate();
  }, [visible]);

  // Update countdown every second
  useEffect(() => {
    if (!existingMeetingDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = existingMeetingDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setCountdown({ days, hours, minutes });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [existingMeetingDate]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event: any, date?: Date) => {
    setShowTimePicker(false);
    if (date) {
      const newDate = new Date(selectedDate);
      newDate.setHours(date.getHours(), date.getMinutes());
      setSelectedDate(newDate);
    }
  };

  const handleSave = async () => {
    try {
      // Validate date is in future
      if (selectedDate <= new Date()) {
        return; // Show error
      }

      // 🔥 Sync with backend (notifies partner)
      let backendSuccess = false;
      try {
        const apiClient = (await import('../utils/apiClient')).default;
        const response = await apiClient.post<{ success: boolean; data: { message: string } }>('/meeting/countdown', {
          meetingDate: selectedDate.toISOString(),
        });

        if (response.success) {
          console.log('✅ Meeting countdown synced with backend');
          backendSuccess = true;
        }
      } catch (apiError) {
        console.warn('⚠️ Backend sync failed, saving locally:', apiError);
      }

      // Save locally
      await AsyncStorage.setItem(MEETING_DATE_KEY, selectedDate.toISOString());
      setExistingMeetingDate(selectedDate);

      // Update widget with countdown
      try {
        const { NativeModules } = require('react-native');
        const SharedPrefsModule = NativeModules.SharedPrefsModule;
        if (SharedPrefsModule) {
          await SharedPrefsModule.setString('meeting_date', selectedDate.toISOString());
          await SharedPrefsModule.setString('partner_name_for_meet', partnerName);
          await SharedPrefsModule.notifyWidgetUpdate();
        }
      } catch (widgetError) {
        console.warn('Widget update failed:', widgetError);
      }

      onSave(selectedDate);
      onClose();
    } catch (error) {
      console.error('Error saving meeting date:', error);
    }
  };

  const handleClear = async () => {
    try {
      await AsyncStorage.removeItem(MEETING_DATE_KEY);
      setExistingMeetingDate(null);
      setSelectedDate(new Date());

      // Clear from widget
      try {
        const { NativeModules } = require('react-native');
        const SharedPrefsModule = NativeModules.SharedPrefsModule;
        if (SharedPrefsModule) {
          await SharedPrefsModule.remove('meeting_date');
          await SharedPrefsModule.remove('partner_name_for_meet');
          await SharedPrefsModule.notifyWidgetUpdate();
        }
      } catch (widgetError) {
        console.warn('Widget clear failed:', widgetError);
      }
    } catch (error) {
      console.error('Error clearing meeting date:', error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
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
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>💕 Meeting Countdown</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Existing Countdown Display */}
          {existingMeetingDate && (
            <View style={styles.countdownSection}>
              <Text style={styles.countdownLabel}>Time until you meet {partnerName}</Text>
              <View style={styles.countdownContainer}>
                <View style={styles.countdownItem}>
                  <Text style={styles.countdownNumber}>{countdown.days}</Text>
                  <Text style={styles.countdownUnit}>days</Text>
                </View>
                <Text style={styles.countdownSeparator}>:</Text>
                <View style={styles.countdownItem}>
                  <Text style={styles.countdownNumber}>{countdown.hours}</Text>
                  <Text style={styles.countdownUnit}>hrs</Text>
                </View>
                <Text style={styles.countdownSeparator}>:</Text>
                <View style={styles.countdownItem}>
                  <Text style={styles.countdownNumber}>{countdown.minutes}</Text>
                  <Text style={styles.countdownUnit}>min</Text>
                </View>
              </View>
              <Text style={styles.meetingDateText}>
                Meeting on {formatDate(existingMeetingDate)} at {formatTime(existingMeetingDate)}
              </Text>
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Set New Date Section */}
          <View style={styles.setDateSection}>
            <Text style={styles.sectionTitle}>
              {existingMeetingDate ? 'Update Meeting Date' : 'When are you meeting?'}
            </Text>

            {/* Date Picker */}
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#EC4899" />
              <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            {/* Time Picker */}
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#EC4899" />
              <Text style={styles.dateButtonText}>{formatTime(selectedDate)}</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                selectedDate <= new Date() && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={selectedDate <= new Date()}
            >
              <Ionicons name="heart" size={20} color="white" />
              <Text style={styles.saveButtonText}>
                {existingMeetingDate ? 'Update Countdown' : 'Start Countdown'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date/Time Pickers */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  countdownSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFF5F7',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  countdownLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#EC4899',
  },
  countdownUnit: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  countdownSeparator: {
    fontSize: 36,
    fontWeight: '700',
    color: '#EC4899',
    marginHorizontal: 8,
  },
  meetingDateText: {
    fontSize: 13,
    color: '#888',
    marginTop: 16,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 6,
  },
  setDateSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EC4899',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
});

export default TimeCounterModal;
