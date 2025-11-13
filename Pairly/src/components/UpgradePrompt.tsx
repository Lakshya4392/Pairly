import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors } from '../theme/colorsIOS';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  type: 'daily-limit' | 'feature-locked';
  featureName?: string;
  featureDescription?: string;
  currentCount?: number;
  limit?: number;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  visible,
  onClose,
  onUpgrade,
  type,
  featureName,
  featureDescription,
  currentCount,
  limit,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const renderDailyLimitContent = () => (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name="heart" size={48} color={colors.secondary} />
      </View>
      
      <Text style={styles.title}>You've Shared {currentCount} Moments Today</Text>
      
      <Text style={styles.description}>
        Your love doesn't have limits — why should your moments?
      </Text>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Upgrade to Premium for:</Text>
        
        <View style={styles.featureItem}>
          <Ionicons name="infinite" size={20} color={colors.secondary} />
          <Text style={styles.featureText}>Unlimited daily moments</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="camera" size={20} color={colors.secondary} />
          <Text style={styles.featureText}>Dual camera capture</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="chatbubble-ellipses" size={20} color={colors.secondary} />
          <Text style={styles.featureText}>Shared love notes</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="time" size={20} color={colors.secondary} />
          <Text style={styles.featureText}>Time-lock messages</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="add-circle" size={20} color={colors.secondary} />
          <Text style={styles.featureText}>+ 5 more magical features</Text>
        </View>
      </View>
    </>
  );

  const renderFeatureLockedContent = () => (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name="diamond" size={48} color={colors.secondary} />
      </View>
      
      <Text style={styles.title}>{featureName} is Premium Only</Text>
      
      <Text style={styles.description}>
        {featureDescription || 'This feature is available with Pairly Premium'}
      </Text>

      <View style={styles.socialProof}>
        <Text style={styles.socialProofText}>
          ⭐ Join 10,000+ couples who upgraded to make their moments magical
        </Text>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {type === 'daily-limit' ? renderDailyLimitContent() : renderFeatureLockedContent()}

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={onUpgrade}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.secondary, colors.secondaryLight]}
              style={styles.upgradeButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="diamond" size={20} color="white" />
              <Text style={styles.upgradeButtonText}>
                {type === 'daily-limit' ? 'Upgrade to Premium' : 'Unlock This Feature'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.priceText}>
            $3.99/month • 7-day free trial
          </Text>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondaryPastel,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    lineHeight: 30,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  featuresTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  featureText: {
    fontSize: 15,
    color: colors.textSecondary,
    flex: 1,
  },
  socialProof: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  socialProofText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  upgradeButton: {
    width: '100%',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  upgradeButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: 'white',
  },
  priceText: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  closeButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
});
