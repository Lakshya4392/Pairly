import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colorsIOS';
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
  const [uploading, setUploading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const handleUpload = async () => {
    try {
      setUploading(true);
      await onUpload(undefined);
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
        <Text style={styles.headerTitle}>Preview</Text>
        <View style={styles.headerButton} />
      </LinearGradient>

      {/* Photo Preview */}
      <View style={styles.photoContainer}>
        <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />
      </View>

      {/* Action Buttons */}
      <View style={styles.bottomContainer}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.95)']}
          style={styles.bottomGradient}
        >
          <View style={styles.actionButtons}>
            {/* Schedule Button */}
            <TouchableOpacity
              style={[styles.scheduleButton, uploading && styles.buttonDisabled]}
              onPress={() => setShowScheduleModal(true)}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <View style={styles.scheduleButtonContent}>
                <Ionicons name="time-outline" size={20} color="white" />
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

const styles = StyleSheet.create({
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
    fontFamily: 'Inter-SemiBold', fontSize: 18,
    color: 'white',
  },

  // Photo
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
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
    paddingBottom: 40,
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
    height: 56,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  scheduleButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: 'white',
    letterSpacing: 0.2,
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
    fontSize: 15,
    lineHeight: 20,
    color: 'white',
    letterSpacing: 0.2,
  },
});
