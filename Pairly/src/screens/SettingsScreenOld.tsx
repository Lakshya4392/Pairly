import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@theme/colors';
import { spacing, borderRadius, layout } from '@theme/spacing';
import { shadows } from '@theme/shadows';

interface SettingsScreenProps {
  onBack: () => void;
  isPremium?: boolean;
  onUpgradeToPremium?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
  onBack, 
  isPremium = false,
  onUpgradeToPremium 
}) => {
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [highQuality, setHighQuality] = useState(isPremium);
  const [privateMode, setPrivateMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const premiumFeatures = [
    { icon: 'cloud-upload', title: 'Unlimited Photo Storage', enabled: isPremium },
    { icon: 'videocam', title: 'Video Messages', enabled: isPremium },
    { icon: 'color-palette', title: 'Custom Themes', enabled: isPremium },
    { icon: 'time', title: 'Message History', enabled: isPremium },
    { icon: 'shield-checkmark', title: 'Advanced Privacy', enabled: isPremium },
    { icon: 'heart', title: 'Special Animations', enabled: isPremium },
  ];

  const handlePremiumFeature = (feature: string) => {
    if (!isPremium && onUpgradeToPremium) {
      Alert.alert(
        'Premium Feature',
        `${feature} is available with Pairly Premium. Upgrade now?`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: onUpgradeToPremium },
        ]
      );
    }
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement, 
    isPremiumFeature = false 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    isPremiumFeature?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.settingItem, isPremiumFeature && !isPremium && styles.premiumItem]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, isPremiumFeature && !isPremium && styles.premiumIcon]}>
          <Ionicons 
            name={icon as any} 
            size={20} 
            color={isPremiumFeature && !isPremium ? colors.secondary : colors.primary} 
          />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
          {isPremiumFeature && !isPremium && (
            <Text style={styles.premiumBadge}>Premium</Text>
          )}
        </View>
      </View>
      {rightElement || (
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Premium Banner */}
        {!isPremium && (
          <TouchableOpacity 
            style={styles.premiumBanner}
            onPress={onUpgradeToPremium}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.secondary, colors.secondaryLight]}
              style={styles.premiumGradient}
            >
              <View style={styles.premiumContent}>
                <Ionicons name="star" size={24} color="white" />
                <View style={styles.premiumText}>
                  <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                  <Text style={styles.premiumSubtitle}>Unlock all features & unlimited storage</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="person-circle"
              title="Profile"
              subtitle="Manage your profile information"
              onPress={() => Alert.alert('Profile', 'Profile settings coming soon!')}
            />
            <SettingItem
              icon="people"
              title="Partner Connection"
              subtitle="Manage your pairing"
              onPress={() => Alert.alert('Partner', 'Partner settings coming soon!')}
            />
          </View>
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="notifications"
              title="Notifications"
              subtitle="Push notifications for new moments"
              rightElement={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={notifications ? colors.primary : colors.textTertiary}
                />
              }
            />
            <SettingItem
              icon="eye-off"
              title="Private Mode"
              subtitle="Hide app content in recent apps"
              rightElement={
                <Switch
                  value={privateMode}
                  onValueChange={setPrivateMode}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={privateMode ? colors.primary : colors.textTertiary}
                />
              }
              isPremiumFeature={true}
              onPress={() => !isPremium && handlePremiumFeature('Private Mode')}
            />
          </View>
        </View>

        {/* Media & Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Media & Storage</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="save"
              title="Auto-save Photos"
              subtitle="Automatically save received photos"
              rightElement={
                <Switch
                  value={autoSave}
                  onValueChange={setAutoSave}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={autoSave ? colors.primary : colors.textTertiary}
                />
              }
            />
            <SettingItem
              icon="image"
              title="High Quality Photos"
              subtitle="Upload photos in original quality"
              rightElement={
                <Switch
                  value={highQuality}
                  onValueChange={isPremium ? setHighQuality : undefined}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={highQuality ? colors.primary : colors.textTertiary}
                />
              }
              isPremiumFeature={true}
              onPress={() => !isPremium && handlePremiumFeature('High Quality Photos')}
            />
          </View>
        </View>

        {/* Premium Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          <View style={styles.sectionContent}>
            {premiumFeatures.map((feature, index) => (
              <SettingItem
                key={index}
                icon={feature.icon}
                title={feature.title}
                isPremiumFeature={!feature.enabled}
                onPress={() => !feature.enabled && handlePremiumFeature(feature.title)}
                rightElement={
                  feature.enabled ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  ) : (
                    <Ionicons name="lock-closed" size={20} color={colors.textTertiary} />
                  )
                }
              />
            ))}
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="moon"
              title="Dark Mode"
              subtitle="Switch to dark theme"
              rightElement={
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={darkMode ? colors.primary : colors.textTertiary}
                />
              }
              isPremiumFeature={true}
              onPress={() => !isPremium && handlePremiumFeature('Dark Mode')}
            />
            <SettingItem
              icon="language"
              title="Language"
              subtitle="English"
              onPress={() => Alert.alert('Language', 'Language settings coming soon!')}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="help-circle"
              title="Help & FAQ"
              onPress={() => Alert.alert('Help', 'Help center coming soon!')}
            />
            <SettingItem
              icon="mail"
              title="Contact Support"
              onPress={() => Alert.alert('Support', 'Contact support coming soon!')}
            />
            <SettingItem
              icon="document-text"
              title="Privacy Policy"
              onPress={() => Alert.alert('Privacy', 'Privacy policy coming soon!')}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="log-out"
              title="Sign Out"
              onPress={() => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive' },
              ])}
            />
            <TouchableOpacity style={styles.dangerItem}>
              <Text style={styles.dangerText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xl,
  },
  backButton: {
    padding: spacing.md,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 20,
    color: colors.text,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  
  // Premium Banner
  premiumBanner: {
    marginHorizontal: layout.screenPaddingHorizontal,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  premiumGradient: {
    padding: spacing.xl,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: 'white',
    marginBottom: spacing.xs,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  lastSection: {
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 14,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    marginHorizontal: layout.screenPaddingHorizontal,
  },
  sectionContent: {
    backgroundColor: colors.surface,
    marginHorizontal: layout.screenPaddingHorizontal,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },

  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  premiumItem: {
    backgroundColor: colors.backgroundSecondary,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  premiumIcon: {
    backgroundColor: colors.secondaryLight + '20',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontFamily: 'Inter-Medium', fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  premiumBadge: {
    fontFamily: 'Inter-SemiBold', fontSize: 12,
    color: colors.secondary,
    marginTop: spacing.xs,
  },

  // Danger Zone
  dangerItem: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  dangerText: {
    fontFamily: 'Inter-Medium', fontSize: 16,
    color: colors.errorText,
  },
});