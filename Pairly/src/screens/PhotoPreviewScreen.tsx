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
    { label: '10m', value: 0.167, icon: '⏱️' },
    { label: '30m', value: 0.5, icon: '⏰' },
    { label: '1h', value: 1, icon: '🕐' },
    { label: '3h', value: 3, icon: '🕒' },
    { label: '6h', value: 6, icon: '🕕' },
    { label: '12h', value: 12, icon: '🕛' },
    { label: '24h', value: 24, icon: '📅' },
    { label: '∞', value: 0, icon: '♾️' }, // 0 means no expiry
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
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowFilters(!showFilters)}
          disabled={uploading}
        >
          <Ionicons
            name={selectedFilter === 'none' ? "color-filter-outline" : "color-filter"}
            size={24}
            color={selectedFilter === 'none' ? "white" : colors.secondary}
          />
        </TouchableOpacity>
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
                    <Ionicons name="checkmark-circle" size={18} color={colors.secondary} />
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
          colors={['transparent', 'rgba(0,0,0,0.95)']}
          style={styles.bottomGradient}
        >
          {/* Duration Picker */}
          <View style={styles.durationSection}>
            <View style={styles.durationHeader}>
              <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.durationTitle}>Show on widget for</Text>
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
                  <Text style={styles.durationIcon}>{duration.icon}</Text>
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
            {selectedDuration > 0 && (
              <Text style={styles.durationInfo}>
                🔒 Photo will auto-hide from widget after {getDurationLabel(selectedDuration)}
              </Text>
            )}
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
                <Ionicons name="calendar-outline" size={20} color="white" />
                <Text style={styles.scheduleButtonText}>Later</Text>
              </View>
            </TouchableOpacity>

            {/* Send Now Button */}
            <TouchableOpacity
              style={[styles.sendButton, uploading && styles.buttonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={uploading ? ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'] : [colors.secondary, colors.secondaryLight]}
                style={styles.sendButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={styles.sendButtonText}>Sending...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="white" />
                    <Text style={styles.sendButtonText}>Send Now</Text>
                  </>
                )}
              </LinearGradient>
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
    paddingTop: spacing.huge,
    paddingBottom: spacing.lg,
    paddingHorizontal: layout.screenPaddingHorizontal,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
  },

  // Photo
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },

  // Filter Selector
  filterSelector: {
    position: 'absolute',
    bottom: 200,
    left: 20,
    right: 20,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  filterTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
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
    backgroundColor: colors.backgroundSecondary,
  },
  filterOptionActive: {
    backgroundColor: colors.secondaryPastel,
  },
  filterOptionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.text,
  },
  filterOptionTextActive: {
    color: colors.secondary,
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
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },

  // Duration Section
  durationSection: {
    marginBottom: 16,
  },
  durationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  durationTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  durationScroll: {
    gap: 8,
    paddingRight: 20,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  durationChipActive: {
    backgroundColor: colors.secondaryPastel,
    borderColor: colors.secondary,
  },
  durationIcon: {
    fontSize: 14,
  },
  durationChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  durationChipTextActive: {
    fontFamily: 'Inter-SemiBold',
    color: colors.secondary,
  },
  durationInfo: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 10,
    textAlign: 'center',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.4,
  },

  // Schedule Button
  scheduleButton: {
    width: 80,
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    fontSize: 12,
    color: 'white',
  },

  // Send Button
  sendButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  sendButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: 'white',
    letterSpacing: 0.2,
  },
});
