import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius, layout } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import { ScheduledMomentModal } from '../components/ScheduledMomentModal';

interface PhotoPreviewScreenProps {
  photoUri: string;
  onCancel: () => void;
  onUpload: (note?: string, scheduledTime?: Date, duration?: number) => Promise<void>;
  partnerName?: string;
}

export const PhotoPreviewScreen: React.FC<PhotoPreviewScreenProps> = ({
  photoUri,
  onCancel,
  onUpload,
  partnerName = 'Your Partner',
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [uploading, setUploading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [selectedDuration, setSelectedDuration] = useState<number>(1); // Default 1 hour

  // Duration options for widget visibility
  const durations = [
    { label: '10m', value: 0.167 },
    { label: '30m', value: 0.5 },
    { label: '1h', value: 1 },
    { label: '3h', value: 3 },
    { label: '6h', value: 6 },
    { label: '12h', value: 12 },
    { label: '24h', value: 24 },
  ];

  const handleUpload = async () => {
    try {
      setUploading(true);
      // Pass duration for widget expiry (0 = no expiry)
      await onUpload(undefined, undefined, selectedDuration > 0 ? selectedDuration : undefined);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSchedule = async (scheduledTime: Date, scheduleNote: string, duration: number) => {
    try {
      setShowScheduleModal(false);
      setUploading(true);
      await onUpload(scheduleNote.trim() || undefined, scheduledTime, duration);
    } catch (error) {
      console.error('Schedule error:', error);
    } finally {
      setUploading(false);
    }
  };

  const getDurationLabel = (value: number) => {
    if (value === 0) return 'Forever';
    if (value < 1) return `${Math.round(value * 60)} min`;
    return `${value} hr${value > 1 ? 's' : ''}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* Header */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onCancel}
          disabled={uploading}
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send to {partnerName}</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      {/* Photo Preview */}
      <View style={styles.photoContainer}>
        <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />

        {/* Filter Selector */}
        {showFilters && (
          <View style={styles.filterSelector}>
            <Text style={styles.filterTitle}>Choose Filter</Text>
            <View style={styles.filtersList}>
              {['none', 'grayscale', 'sepia', 'vintage', 'warm', 'cool'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterOption,
                    selectedFilter === filter && styles.filterOptionActive
                  ]}
                  onPress={() => {
                    setSelectedFilter(filter);
                    setShowFilters(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilter === filter && styles.filterOptionTextActive
                  ]}>
                    {filter === 'none' ? 'Original' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                  {selectedFilter === filter && (
                    <Ionicons name="checkmark-circle" size={18} color="#EC4899" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomContainer}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)', 'black']}
          style={styles.bottomGradient}
        >
          {/* Duration Picker */}
          <View style={styles.durationSection}>
            <View style={styles.durationHeader}>
              <Ionicons name="timer-outline" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.durationTitle}>Disappear after...</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.durationScroll}
            >
              {durations.map((duration) => (
                <TouchableOpacity
                  key={duration.value}
                  style={[
                    styles.durationChip,
                    selectedDuration === duration.value && styles.durationChipActive,
                  ]}
                  onPress={() => setSelectedDuration(duration.value)}
                  disabled={uploading}
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
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Schedule Button */}
            <TouchableOpacity
              style={[styles.scheduleButton, uploading && styles.buttonDisabled]}
              onPress={() => setShowScheduleModal(true)}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <View style={styles.scheduleButtonContent}>
                <Ionicons name="calendar" size={22} color="white" />
                <Text style={styles.scheduleButtonText}>Schedule</Text>
              </View>
            </TouchableOpacity>

            {/* Send Now Button */}
            <TouchableOpacity
              style={[styles.sendButton, uploading && styles.buttonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <View
                style={styles.sendButtonGradient}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={styles.sendButtonText}>Sending...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.sendButtonText}>Send Now</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Schedule Modal */}
      <ScheduledMomentModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleSchedule}
        partnerName={partnerName}
      />
    </View>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.huge + 10,
    paddingBottom: spacing.lg,
    paddingHorizontal: layout.screenPaddingHorizontal,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Photo
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#000',
  },
  photo: {
    width: '100%',
    height: '100%',
  },

  // Filter Selector
  filterSelector: {
    position: 'absolute',
    bottom: 220,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  filterTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#000',
    marginBottom: spacing.md,
  },
  filtersList: {
    gap: spacing.sm,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#F3F4F6',
  },
  filterOptionActive: {
    backgroundColor: '#FCE7F3', // Light pink
  },
  filterOptionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#374151',
  },
  filterOptionTextActive: {
    color: '#EC4899', // Pink
    fontFamily: 'Inter-SemiBold',
  },

  // Bottom
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 50,
  },

  // Duration Section
  durationSection: {
    marginBottom: 24,
  },
  durationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginLeft: 4,
  },
  durationTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  durationScroll: {
    gap: 10,
    paddingRight: 20,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  durationChipActive: {
    backgroundColor: '#EC4899', // Hot Pink
    transform: [{ scale: 1.05 }],
  },
  durationChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  durationChipTextActive: {
    fontFamily: 'Inter-Bold',
    color: 'white',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    height: 56,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Schedule Button
  scheduleButton: {
    width: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  scheduleButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },

  // Send Button
  sendButton: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#EC4899', // Solid Hot Pink
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: 'white',
  },
});
