import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser, useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileEditor } from '../components/ProfileEditor';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { CustomAlert } from '../components/CustomAlert';
import { ThemeSelectorModal } from '../components/ThemeSelectorModal';

import { PINSetupModal } from '../components/PINSetupModal';
import { RatingModal } from '../components/RatingModal';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors, gradients } from '../theme/colorsIOS';
import { spacing, borderRadius, layout } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface SettingsScreenProps {
  onBack: () => void;
  isPremium?: boolean;
  onUpgradeToPremium?: () => void;
  onNavigateToPairing?: () => void;
}

type TabType = 'account' | 'notifications' | 'appearance' | 'about';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
  onBack, 
  isPremium = false,
  onUpgradeToPremium,
  onNavigateToPairing 
}) => {
  const { colors, isDarkMode, toggleDarkMode: toggleTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { user } = useUser();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [notifications, setNotifications] = useState(true);
  const [partnerOnlineNotif, setPartnerOnlineNotif] = useState(true);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [showSignOutAlert, setShowSignOutAlert] = useState(false);
  const [showUnpairAlert, setShowUnpairAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [isPartnerConnected, setIsPartnerConnected] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);
  const [goodMorningReminder, setGoodMorningReminder] = useState(false);
  const [goodNightReminder, setGoodNightReminder] = useState(false);
  const [showPINSetup, setShowPINSetup] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [highQuality, setHighQuality] = useState(false);

  useEffect(() => {
    loadUserInfo();
    loadSettings();
    loadPartnerInfo();
    loadAppLockSettings();
    loadAllPremiumSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const SettingsService = (await import('../services/SettingsService')).default;
      const settings = await SettingsService.getSettings();
      
      setNotifications(settings.notificationsEnabled);
      setPartnerOnlineNotif(settings.partnerOnlineNotifications);
      
      console.log('✅ Settings loaded:', settings);
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  };

  const loadUserInfo = () => {
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      setUserName(fullName || 'User');
      setUserEmail(user.primaryEmailAddress?.emailAddress || '');
    }
  };

  const loadPartnerInfo = async () => {
    try {
      const PairingService = (await import('../services/PairingService')).default;
      const partner = await PairingService.getPartner();
      
      if (partner) {
        setPartnerName(partner.displayName);
        setIsPartnerConnected(true);
      } else {
        setPartnerName(null);
        setIsPartnerConnected(false);
      }
    } catch (error) {
      console.error('Error loading partner:', error);
      setPartnerName(null);
      setIsPartnerConnected(false);
    }
  };

  const loadAppLockSettings = async () => {
    try {
      const AppLockService = (await import('../services/AppLockService')).default;
      const settings = await AppLockService.getSettings();
      setAppLockEnabled(settings.enabled);
      setBiometricEnabled(settings.useBiometric);
    } catch (error) {
      console.error('Error loading app lock settings:', error);
    }
  };

  const loadAllPremiumSettings = async () => {
    try {
      // Theme is already loaded from ThemeContext (isDarkMode)
      // No need to load separately
      
      // Load high quality setting
      const highQualitySetting = await AsyncStorage.getItem('@pairly_high_quality');
      if (highQualitySetting) {
        setHighQuality(highQualitySetting === 'true');
      }
      
      // Load private mode
      const privateModeSetting = await AsyncStorage.getItem('@pairly_private_mode');
      if (privateModeSetting) {
        setPrivateMode(privateModeSetting === 'true');
      }
      
      // Load reminders
      const morningReminder = await AsyncStorage.getItem('@pairly_morning_reminder');
      if (morningReminder) {
        setGoodMorningReminder(morningReminder === 'true');
      }
      
      const nightReminder = await AsyncStorage.getItem('@pairly_night_reminder');
      if (nightReminder) {
        setGoodNightReminder(nightReminder === 'true');
      }
      
      console.log('✅ All premium settings loaded');
    } catch (error) {
      console.error('Error loading premium settings:', error);
    }
  };

  // Premium Feature Handlers
  const handleToggleDarkMode = async (enabled: boolean) => {
    if (!isPremium) {
      handlePremiumFeature('Dark Mode');
      return;
    }
    
    try {
      // Use ThemeContext's toggleDarkMode for instant updates
      await toggleTheme();
      setSuccessMessage(enabled ? 'Dark mode enabled' : 'Dark mode disabled');
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Error toggling dark mode:', error);
    }
  };

  const handleOpenThemeSelector = () => {
    if (!isPremium) {
      handlePremiumFeature('Custom Themes');
      return;
    }
    setShowThemeSelector(true);
  };

  const handleToggleHighQuality = async (enabled: boolean) => {
    if (!isPremium) {
      handlePremiumFeature('High Quality Upload');
      return;
    }
    
    setHighQuality(enabled);
    try {
      await AsyncStorage.setItem('@pairly_high_quality', enabled.toString());
      setSuccessMessage(enabled ? 'High quality enabled' : 'High quality disabled');
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Error toggling high quality:', error);
    }
  };



  const handleToggleAppLock = async (enabled: boolean) => {
    if (!isPremium) {
      handlePremiumFeature('App Lock');
      return;
    }
    
    if (enabled) {
      setShowPINSetup(true);
    } else {
      try {
        const AppLockService = (await import('../services/AppLockService')).default;
        await AppLockService.disableAppLock();
        setAppLockEnabled(false);
        setSuccessMessage('App lock disabled');
        setShowSuccessAlert(true);
      } catch (error) {
        console.error('Error disabling app lock:', error);
      }
    }
  };

  const handleTogglePrivateMode = async (enabled: boolean) => {
    if (!isPremium) {
      handlePremiumFeature('Private Mode');
      return;
    }
    
    setPrivateMode(enabled);
    try {
      await AsyncStorage.setItem('@pairly_private_mode', enabled.toString());
      setSuccessMessage(enabled ? 'Private mode enabled' : 'Private mode disabled');
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Error toggling private mode:', error);
    }
  };

  const handleToggleGoodMorning = async (enabled: boolean) => {
    if (!isPremium) {
      handlePremiumFeature('Smart Reminders');
      return;
    }
    
    setGoodMorningReminder(enabled);
    try {
      await AsyncStorage.setItem('@pairly_morning_reminder', enabled.toString());
      
      // Schedule/cancel notification
      const NotificationService = (await import('../services/NotificationService')).default;
      if (enabled && partnerName) {
        await NotificationService.scheduleGoodMorningReminder('08:00', partnerName);
      } else {
        await NotificationService.cancelReminder('goodMorning');
      }
      
      setSuccessMessage(enabled ? 'Good morning reminder enabled' : 'Good morning reminder disabled');
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Error toggling morning reminder:', error);
    }
  };

  const handleToggleGoodNight = async (enabled: boolean) => {
    if (!isPremium) {
      handlePremiumFeature('Smart Reminders');
      return;
    }
    
    setGoodNightReminder(enabled);
    try {
      await AsyncStorage.setItem('@pairly_night_reminder', enabled.toString());
      
      // Schedule/cancel notification
      const NotificationService = (await import('../services/NotificationService')).default;
      if (enabled && partnerName) {
        await NotificationService.scheduleGoodNightReminder('22:00', partnerName);
      } else {
        await NotificationService.cancelReminder('goodNight');
      }
      
      setSuccessMessage(enabled ? 'Good night reminder enabled' : 'Good night reminder disabled');
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Error toggling night reminder:', error);
    }
  };

  const handleSelectTheme = async (themeId: string) => {
    try {
      // Theme is already set by ThemeSelectorModal using setColorTheme from context
      // Just show success message
      setSuccessMessage('Theme changed successfully');
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Error selecting theme:', error);
    }
  };

  const handleSetPIN = async (pin: string) => {
    try {
      const AppLockService = (await import('../services/AppLockService')).default;
      const success = await AppLockService.enableAppLock(pin);
      if (success) {
        setAppLockEnabled(true);
        setSuccessMessage('App lock enabled successfully');
        setShowSuccessAlert(true);
      }
    } catch (error) {
      console.error('Error setting PIN:', error);
    }
  };

  const handleSignOut = () => {
    setShowSignOutAlert(true);
  };

  const confirmSignOut = async () => {
    try {
      // Clear premium status
      const PremiumService = (await import('../services/PremiumService')).default;
      await PremiumService.clearPremiumStatus();
      
      // Sign out
      await signOut();
      console.log('✅ Signed out successfully');
      // Navigator will automatically redirect to auth screen
    } catch (error) {
      console.error('❌ Sign out error:', error);
      setSuccessMessage('Failed to sign out. Please try again.');
      setShowSuccessAlert(true);
    }
  };

  const handleUnpairPartner = () => {
    setShowUnpairAlert(true);
  };

  const confirmUnpair = async () => {
    try {
      // Clear partner info from local storage
      await AsyncStorage.removeItem('partner_info');
      await AsyncStorage.removeItem('partner_id');
      
      // TODO: Call backend API to remove pairing
      // await fetch(`${API_BASE_URL}/api/pairing/unpair/${user.id}`, { method: 'DELETE' });
      
      setSuccessMessage('You have been unpaired from your partner');
      setShowSuccessAlert(true);
      console.log('✅ Unpaired successfully');
    } catch (error) {
      console.error('❌ Unpair error:', error);
      setSuccessMessage('Failed to unpair. Please try again.');
      setShowSuccessAlert(true);
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    setNotifications(enabled);
    try {
      const SettingsService = (await import('../services/SettingsService')).default;
      await SettingsService.toggleNotifications(enabled, user?.id);
      console.log('✅ Notifications:', enabled);
    } catch (error) {
      console.error('❌ Error toggling notifications:', error);
    }
  };



  const handleTogglePartnerOnline = async (enabled: boolean) => {
    setPartnerOnlineNotif(enabled);
    try {
      const SettingsService = (await import('../services/SettingsService')).default;
      await SettingsService.togglePartnerOnlineNotifications(enabled, user?.id);
      console.log('✅ Partner online notifications:', enabled);
    } catch (error) {
      console.error('❌ Error toggling partner notifications:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Delete from Clerk
      await user?.delete();
      
      // Clear all local data
      await AsyncStorage.clear();
      
      // TODO: Call backend to delete user data
      // await fetch(`${API_BASE_URL}/api/user/${user.id}`, { method: 'DELETE' });
      
      console.log('✅ Account deleted');
      // Navigator will automatically redirect to auth screen
    } catch (error) {
      console.error('❌ Delete account error:', error);
      setSuccessMessage('Failed to delete account. Please try again.');
      setShowSuccessAlert(true);
    }
  };

  const tabs = [
    { id: 'account' as TabType, label: 'Account', icon: 'person' },
    { id: 'notifications' as TabType, label: 'Notify', icon: 'notifications' },
    { id: 'appearance' as TabType, label: 'Theme', icon: 'color-palette' },
    { id: 'about' as TabType, label: 'About', icon: 'information-circle' },
  ];

  const [showPremiumAlert, setShowPremiumAlert] = useState(false);
  const [premiumFeatureName, setPremiumFeatureName] = useState('');

  const handlePremiumFeature = (feature: string) => {
    if (!isPremium && onUpgradeToPremium) {
      setPremiumFeatureName(feature);
      setShowPremiumAlert(true);
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement, 
    isPremiumFeature = false,
    isLast = false,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    isPremiumFeature?: boolean;
    isLast?: boolean;
  }) => (
    <TouchableOpacity 
      style={[
        styles.settingItem, 
        isPremiumFeature && !isPremium && styles.premiumItem,
        isLast && styles.lastItem
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress && !rightElement}
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
          <View style={styles.titleRow}>
            <Text style={styles.settingTitle}>{title}</Text>
            {isPremiumFeature && !isPremium && (
              <View style={styles.premiumBadgeContainer}>
                <Ionicons name="diamond" size={12} color={colors.secondary} />
                <Text style={styles.premiumBadge}>Premium</Text>
              </View>
            )}
          </View>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || (
        onPress && <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  const ProfileCard = () => {
    const initials = userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    if (isPremium) {
      // Premium Profile Card - Beautiful gradient design
      return (
        <View style={styles.profileCardPremium}>
          <LinearGradient
            colors={[colors.secondary, colors.secondaryLight]}
            style={styles.premiumProfileGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.premiumContent}>
              <View style={styles.premiumAvatarContainer}>
                <View style={styles.premiumAvatar}>
                  <Text style={styles.premiumAvatarText}>{initials || 'U'}</Text>
                </View>
                <View style={styles.premiumBadgeGlow}>
                  <Ionicons name="diamond" size={16} color="white" />
                </View>
              </View>
              <View style={styles.premiumInfo}>
                <View style={styles.premiumNameRow}>
                  <Text style={styles.premiumName} numberOfLines={1}>{userName}</Text>
                  <View style={styles.premiumChip}>
                    <Ionicons name="diamond" size={10} color="white" />
                    <Text style={styles.premiumChipText}>PRO</Text>
                  </View>
                </View>
                <Text style={styles.premiumEmail} numberOfLines={1} ellipsizeMode="tail">
                  {userEmail}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.premiumEditButton}
                onPress={() => setShowProfileEditor(true)}
              >
                <Ionicons name="create-outline" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      );
    }

    // Regular Profile Card - Clean and simple
    return (
      <View style={styles.profileCardRegular}>
        <View style={styles.regularContent}>
          <View style={styles.regularAvatar}>
            <Text style={styles.regularAvatarText}>{initials || 'U'}</Text>
          </View>
          <View style={styles.regularInfo}>
            <Text style={styles.regularName} numberOfLines={1}>{userName}</Text>
            <Text style={styles.regularEmail} numberOfLines={1} ellipsizeMode="tail">
              {userEmail}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.regularEditButton}
            onPress={() => setShowProfileEditor(true)}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const PartnerCard = () => {
    if (!isPartnerConnected || !partnerName) {
      return (
        <TouchableOpacity 
          style={styles.partnerCardSettings}
          onPress={onNavigateToPairing}
          activeOpacity={0.7}
        >
          <View style={styles.partnerIconSettings}>
            <Ionicons name="person-add" size={24} color={colors.primary} />
          </View>
          <View style={styles.partnerInfoSettings}>
            <Text style={styles.partnerNameSettings}>Connect Your Partner</Text>
            <Text style={styles.partnerSinceSettings}>Tap to pair with your partner</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.partnerCardSettings}>
        <View style={styles.partnerIconSettings}>
          <Ionicons name="heart" size={24} color={colors.secondary} />
        </View>
        <View style={styles.partnerInfoSettings}>
          <Text style={styles.partnerLabelSettings}>Connected with</Text>
          <Text style={styles.partnerNameSettings}>{partnerName}</Text>
          <Text style={styles.partnerSinceSettings}>Paired together</Text>
        </View>
        <View style={styles.onlineIndicatorSettings} />
      </View>
    );
  };

  const renderAccountTab = () => {
    console.log('🔍 Rendering Account Tab, isPremium:', isPremium);
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <SectionHeader title="PROFILE" />
        <View style={styles.section}>
          <ProfileCard />
        </View>

        {isPremium && (
        <>
          <SectionHeader title="PREMIUM" />
          <View style={styles.section}>
            <SettingItem
              icon="diamond"
              title="Premium Plan"
              subtitle="Manage your subscription"
              onPress={() => {
                console.log('💎 Premium Plan tapped');
                console.log('💎 onUpgradeToPremium exists:', !!onUpgradeToPremium);
                // Navigate to manage premium screen
                if (onUpgradeToPremium) {
                  onUpgradeToPremium();
                } else {
                  console.log('❌ onUpgradeToPremium callback missing!');
                }
              }}
              isLast
            />
          </View>
        </>
      )}

      <SectionHeader title="PARTNER" />
      <View style={styles.section}>
        <PartnerCard />
        {isPartnerConnected && (
          <SettingItem
            icon="link-outline"
            title="Unpair Partner"
            subtitle="Disconnect from your partner"
            onPress={handleUnpairPartner}
            isLast
          />
        )}
      </View>
    </ScrollView>
    );
  };

  const renderNotificationsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <SectionHeader title="PUSH NOTIFICATIONS" />
      <View style={styles.section}>
        <SettingItem
          icon="notifications"
          title="Push Notifications"
          subtitle="Get notified when partner sends photos"
          rightElement={
            <Switch
              value={notifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.disabled, true: colors.primaryLight }}
              thumbColor={notifications ? colors.primary : colors.textTertiary}
            />
          }
        />
        <SettingItem
          icon="person-add"
          title="Partner Online"
          subtitle="Notify when partner comes online"
          rightElement={
            <Switch
              value={partnerOnlineNotif}
              onValueChange={handleTogglePartnerOnline}
              trackColor={{ false: colors.disabled, true: colors.primaryLight }}
              thumbColor={partnerOnlineNotif ? colors.primary : colors.textTertiary}
            />
          }
          isLast
        />
      </View>

      <SectionHeader title="SMART REMINDERS (PREMIUM)" />
      <View style={styles.section}>
        <SettingItem
          icon="sunny"
          title="Good Morning Reminder"
          subtitle="Remind to say good morning"
          isPremiumFeature={!isPremium}
          onPress={() => !isPremium && handlePremiumFeature('Smart Reminders')}
          rightElement={
            <Switch
              value={goodMorningReminder}
              onValueChange={handleToggleGoodMorning}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={goodMorningReminder ? colors.primary : colors.textTertiary}
              disabled={!isPremium}
            />
          }
        />
        <SettingItem
          icon="moon"
          title="Good Night Reminder"
          subtitle="Remind to say good night"
          isPremiumFeature={!isPremium}
          onPress={() => !isPremium && handlePremiumFeature('Smart Reminders')}
          rightElement={
            <Switch
              value={goodNightReminder}
              onValueChange={handleToggleGoodNight}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={goodNightReminder ? colors.primary : colors.textTertiary}
              disabled={!isPremium}
            />
          }
        />
        <SettingItem
          icon="heart"
          title="Anniversary Reminder"
          subtitle="Never forget special dates"
          isPremiumFeature={!isPremium}
          onPress={() => !isPremium && handlePremiumFeature('Smart Reminders')}
          isLast
        />
      </View>


    </ScrollView>
  );

  const renderAppearanceTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <SectionHeader title="THEME" />
      <View style={styles.section}>
        <SettingItem
          icon="moon"
          title="Dark Mode"
          subtitle="Beautiful dark theme for night time"
          isPremiumFeature={!isPremium}
          onPress={() => !isPremium && handlePremiumFeature('Dark Mode')}
          rightElement={
            <Switch
              value={isDarkMode}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isDarkMode ? colors.primary : colors.textTertiary}
              disabled={!isPremium}
            />
          }
        />
        <SettingItem
          icon="color-palette"
          title="Custom Themes"
          subtitle="Choose from 5 beautiful color themes"
          isPremiumFeature={!isPremium}
          onPress={handleOpenThemeSelector}
          isLast
        />
      </View>

      <SectionHeader title="PRIVACY & SECURITY" />
      <View style={styles.section}>
        <SettingItem
          icon="lock-closed"
          title="App Lock"
          subtitle="Protect app with PIN or fingerprint"
          isPremiumFeature={!isPremium}
          onPress={() => !isPremium && handlePremiumFeature('App Lock')}
          rightElement={
            <Switch
              value={appLockEnabled}
              onValueChange={handleToggleAppLock}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={appLockEnabled ? colors.primary : colors.textTertiary}
              disabled={!isPremium}
            />
          }
          isLast
        />

      </View>
    </ScrollView>
  );

  const handleRatingSubmit = async (rating: number, feedback: string) => {
    try {
      // Save rating to database
      if (user) {
        const BackgroundSyncService = (await import('../services/BackgroundSyncService')).default;
        // You can create a new endpoint for ratings or add to user profile
        console.log('✅ Rating submitted:', { rating, feedback, userId: user.id });
        
        // Show success message
        setSuccessMessage(`Thank you for your ${rating}-star rating!`);
        setShowSuccessAlert(true);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  const renderAboutTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <SectionHeader title="RATE US" />
      <View style={styles.section}>
        <SettingItem
          icon="star"
          title="Rate Pairly"
          subtitle="Love Pairly? Rate us in the app"
          onPress={() => setShowRatingModal(true)}
          isLast
        />
      </View>

      <SectionHeader title="DANGER ZONE" />
      <View style={styles.section}>
        <SettingItem
          icon="log-out"
          title="Sign Out"
          onPress={handleSignOut}
        />
        <TouchableOpacity 
          style={styles.dangerItem}
          onPress={() => setShowDeleteModal(true)}
        >
          <Ionicons name="trash" size={20} color={colors.error} style={{ marginRight: spacing.sm }} />
          <Text style={styles.dangerText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return renderAccountTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'appearance':
        return renderAppearanceTab();
      case 'about':
        return renderAboutTab();
      default:
        return renderAccountTab();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Profile Editor Modal */}
      <ProfileEditor
        visible={showProfileEditor}
        onClose={() => setShowProfileEditor(false)}
        onSave={() => {
          loadUserInfo();
          setSuccessMessage('Profile updated successfully!');
          setShowSuccessAlert(true);
        }}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />

      {/* Theme Selector Modal */}
      <ThemeSelectorModal
        visible={showThemeSelector}
        onClose={() => setShowThemeSelector(false)}
        onSelectTheme={handleSelectTheme}
      />



      {/* PIN Setup Modal */}
      <PINSetupModal
        visible={showPINSetup}
        onClose={() => setShowPINSetup(false)}
        onSetPIN={handleSetPIN}
      />

      {/* Sign Out Alert */}
      <CustomAlert
        visible={showSignOutAlert}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        icon="log-out-outline"
        iconColor={colors.primary}
        buttons={[
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setShowSignOutAlert(false),
          },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: confirmSignOut,
          },
        ]}
        onClose={() => setShowSignOutAlert(false)}
      />

      {/* Unpair Alert */}
      <CustomAlert
        visible={showUnpairAlert}
        title="Unpair Partner"
        message="Are you sure you want to disconnect from your partner? You can pair again later."
        icon="link-outline"
        iconColor={colors.error}
        buttons={[
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setShowUnpairAlert(false),
          },
          {
            text: 'Unpair',
            style: 'destructive',
            onPress: confirmUnpair,
          },
        ]}
        onClose={() => setShowUnpairAlert(false)}
      />

      {/* Premium Feature Alert */}
      <CustomAlert
        visible={showPremiumAlert}
        title="Premium Feature"
        message={`${premiumFeatureName} is available with Pairly Premium. Upgrade now?`}
        icon="diamond"
        iconColor={colors.secondary}
        buttons={[
          {
            text: 'Maybe Later',
            style: 'cancel',
            onPress: () => setShowPremiumAlert(false),
          },
          {
            text: 'Upgrade',
            style: 'default',
            onPress: () => {
              setShowPremiumAlert(false);
              onUpgradeToPremium?.();
            },
          },
        ]}
        onClose={() => setShowPremiumAlert(false)}
      />

      {/* Success Alert */}
      <CustomAlert
        visible={showSuccessAlert}
        title="Success"
        message={successMessage}
        icon="checkmark-circle"
        iconColor={colors.success}
        buttons={[
          {
            text: 'OK',
            style: 'default',
            onPress: () => setShowSuccessAlert(false),
          },
        ]}
        onClose={() => setShowSuccessAlert(false)}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Premium Banner */}
      {!isPremium && onUpgradeToPremium && (
        <TouchableOpacity 
          style={styles.premiumBanner}
          onPress={onUpgradeToPremium}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#EC4899', '#DB2777']}
            style={styles.premiumGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="diamond" size={22} color="white" />
            <View style={styles.premiumTextContainer}>
              <Text style={styles.premiumBannerTitle}>Upgrade to Premium</Text>
              <Text style={styles.premiumBannerSubtitle}>Unlock all features</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.id ? colors.primary : colors.textTertiary} 
            />
            <Text style={[
              styles.tabLabel,
              activeTab === tab.id && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Rating Modal */}
      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRatingSubmit}
      />
    </View>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.huge,
    paddingBottom: spacing.lg,
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

  // Premium Banner
  premiumBanner: {
    marginHorizontal: layout.screenPaddingHorizontal,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    ...shadows.lg,
    elevation: 8,
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontFamily: 'Inter-Bold', fontSize: 17,
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  premiumBannerSubtitle: {
    fontFamily: 'Inter-Medium', fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: layout.screenPaddingHorizontal,
    marginBottom: spacing.xxl,
    gap: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  activeTab: {
    backgroundColor: colors.backgroundTertiary,
  },
  tabLabel: {
    fontFamily: 'Inter-Medium', fontSize: 11,
    color: colors.textTertiary,
  },
  activeTabLabel: {
    color: colors.primary,
    fontFamily: 'Inter-SemiBold',
  },

  // Tab Content
  tabContent: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: spacing.xxxl,
  },

  // Section
  sectionHeader: {
    fontFamily: 'Inter-SemiBold', fontSize: 13,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadows.md,
  },

  // Premium Profile Card
  profileCardPremium: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadows.lg,
  },
  premiumProfileGradient: {
    padding: spacing.xxxl,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  premiumAvatarContainer: {
    position: 'relative',
  },
  premiumAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  premiumAvatarText: {
    fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 36,
    color: 'white',
  },
  premiumBadgeGlow: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  premiumInfo: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0, // Important for text ellipsis
  },
  premiumNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  premiumName: {
    fontFamily: 'Inter-SemiBold', fontSize: 20, lineHeight: 28,
    color: 'white',
    flexShrink: 1,
  },
  premiumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },
  premiumChipText: {
    fontFamily: 'Inter-Bold', fontSize: 10,
    color: 'white',
    letterSpacing: 0.5,
  },
  premiumEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: 'Inter-Regular',
  },
  premiumEditButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Regular Profile Card
  profileCardRegular: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  regularContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  regularAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regularAvatarText: {
    fontFamily: 'Inter-SemiBold', fontSize: 20, lineHeight: 28,
    color: 'white',
  },
  regularInfo: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0, // Important for text ellipsis
  },
  regularName: {
    fontFamily: 'Inter-SemiBold', fontSize: 18,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  regularEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
  },
  regularEditButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Partner Card
  partnerCardSettings: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.xl,
    minHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  partnerIconSettings: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.secondaryPastel,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerInfoSettings: {
    flex: 1,
  },
  partnerLabelSettings: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  partnerNameSettings: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  partnerSinceSettings: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  onlineIndicatorSettings: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
  },

  // Premium Card
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.secondaryLight + '10',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  premiumCardInfo: {
    flex: 1,
  },
  premiumCardTitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  premiumCardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Setting Item
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastItem: {
    borderBottomWidth: 0,
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
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  premiumIcon: {
    backgroundColor: colors.backgroundTertiary,
  },
  settingText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingTitle: {
    fontFamily: 'Inter-Medium', fontSize: 16,
    color: colors.text,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  premiumBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondaryLight + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  premiumBadge: {
    fontFamily: 'Inter-SemiBold', fontSize: 11,
    color: colors.secondary,
  },

  // App Info Card - Simplified
  appInfoCardSimple: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  appNameSimple: {
    fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 36,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  appTagline: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  versionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
  },
  versionText: {
    fontFamily: 'Inter-SemiBold', fontSize: 12,
    color: colors.textSecondary,
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