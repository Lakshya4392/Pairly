import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface ThemeSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTheme: (theme: string) => void;
}

const themes = [
  { id: 'default', name: 'Default', colors: ['#FF6B9D', '#C77DFF'], icon: 'heart' },
  { id: 'pink', name: 'Romantic Pink', colors: ['#FF1493', '#FF69B4'], icon: 'rose' },
  { id: 'purple', name: 'Royal Purple', colors: ['#9B59B6', '#8E44AD'], icon: 'diamond' },
  { id: 'blue', name: 'Ocean Blue', colors: ['#3498DB', '#2980B9'], icon: 'water' },
  { id: 'green', name: 'Forest Green', colors: ['#27AE60', '#229954'], icon: 'leaf' },
  { id: 'orange', name: 'Sunset Orange', colors: ['#E67E22', '#D35400'], icon: 'sunny' },
];

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  visible,
  onClose,
  onSelectTheme,
}) => {
  const { colors, colorTheme, setColorTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(colorTheme);

  useEffect(() => {
    setSelectedTheme(colorTheme);
  }, [colorTheme]);

  const handleSelectTheme = async (themeId: string) => {
    setSelectedTheme(themeId);
    await setColorTheme(themeId as any);
    onSelectTheme(themeId);
    setTimeout(() => onClose(), 300);
  };

  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose Theme</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {themes.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeCard,
                  selectedTheme === theme.id && styles.themeCardSelected,
                ]}
                onPress={() => handleSelectTheme(theme.id)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={theme.colors}
                  style={styles.themePreview}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={theme.icon as any} size={32} color="white" />
                </LinearGradient>
                <View style={styles.themeInfo}>
                  <Text style={styles.themeName}>{theme.name}</Text>
                </View>
                {selectedTheme === theme.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                )}
              </TouchableOpacity>
            ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: 'Inter-SemiBold', fontSize: 20, lineHeight: 28,
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
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  themeCardSelected: {
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  themePreview: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: colors.text,
  },
});
