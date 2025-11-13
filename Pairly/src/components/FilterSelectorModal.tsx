import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface FilterSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

const filters = [
  { id: 'none', name: 'Original', icon: 'image-outline', isPremium: false },
  { id: 'grayscale', name: 'B&W', icon: 'contrast-outline', isPremium: false },
  { id: 'sepia', name: 'Sepia', icon: 'sunny-outline', isPremium: true },
  { id: 'vintage', name: 'Vintage', icon: 'time-outline', isPremium: true },
  { id: 'warm', name: 'Warm', icon: 'flame-outline', isPremium: true },
  { id: 'cool', name: 'Cool', icon: 'snow-outline', isPremium: true },
  { id: 'bright', name: 'Bright', icon: 'bulb-outline', isPremium: true },
  { id: 'contrast', name: 'Contrast', icon: 'contrast', isPremium: true },
  { id: 'saturate', name: 'Vibrant', icon: 'color-palette-outline', isPremium: true },
  { id: 'fade', name: 'Fade', icon: 'cloud-outline', isPremium: true },
];

export const FilterSelectorModal: React.FC<FilterSelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Photo Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Apply filters when uploading photos. Premium filters are marked with 💎
            </Text>

            <View style={styles.filtersGrid}>
              {filters.map((filter) => (
                <View key={filter.id} style={styles.filterCard}>
                  <View style={[
                    styles.filterIcon,
                    filter.isPremium && styles.premiumFilterIcon
                  ]}>
                    <Ionicons 
                      name={filter.icon as any} 
                      size={32} 
                      color={filter.isPremium ? colors.secondary : colors.primary} 
                    />
                  </View>
                  <Text style={styles.filterName}>{filter.name}</Text>
                  {filter.isPremium && (
                    <View style={styles.premiumBadge}>
                      <Ionicons name="diamond" size={10} color="white" />
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                Filters will be available when uploading photos. Select a filter in the photo preview screen.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '80%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.xl,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  filterCard: {
    width: '30%',
    alignItems: 'center',
    position: 'relative',
  },
  filterIcon: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryPastel,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  premiumFilterIcon: {
    backgroundColor: colors.secondaryPastel,
  },
  filterName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.text,
    textAlign: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryPastel,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
  },
});
