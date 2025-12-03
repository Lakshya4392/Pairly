import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Clipboard, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { API_CONFIG } from '../config/api.config';
import { spacing, borderRadius } from '../theme/spacingIOS';
import { typography } from '../theme/typography';

interface ReferralScreenProps {
    onBack: () => void;
}

export default function ReferralScreen({ onBack }: ReferralScreenProps) {
    const { colors } = useTheme();
    const { user } = useUser();
    const { getToken } = useAuth();
    const styles = createStyles(colors);

    const [referralCode, setReferralCode] = useState<string>('');
    const [referralCount, setReferralCount] = useState<number>(0);
    const [isPremium, setIsPremium] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        fetchReferralData();
    }, []);

    const fetchReferralData = async () => {
        try {
            const token = await getToken();
            if (!user || !token) return;

            // Call backend to get referral stats
            // We can reuse check-access or create a specific endpoint
            // For now, let's assume we store it in local storage or fetch from check-access
            // But since we are in the app, let's hit the endpoint

            const response = await fetch(`${API_CONFIG.baseUrl}/invites/check-access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: user.primaryEmailAddress?.emailAddress,
                    clerkId: user.id
                })
            });

            const data = await response.json();

            if (data.allowed) {
                setReferralCode(data.inviteCode || 'Loading...');
                setReferralCount(data.referralCount || 0);
                setIsPremium(data.isPremium || false);
            }

        } catch (error) {
            console.error('Error fetching referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!referralCode) return;

        const link = `https://pairly-iota.vercel.app?ref=${referralCode}`;
        const message = `Join me on Pairly! Use my invite code to skip the waitlist: ${link}`;

        try {
            await Share.share({
                message,
                url: link,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const handleCopy = () => {
        if (!referralCode) return;
        Clipboard.setString(referralCode);
        Alert.alert('Copied!', 'Referral code copied to clipboard');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite Friends</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Hero Section */}
                <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={styles.heroCard}
                >
                    <Ionicons name="gift-outline" size={48} color="white" />
                    <Text style={styles.heroTitle}>Get Premium Free</Text>
                    <Text style={styles.heroSubtitle}>
                        Invite 3 friends to unlock 1 month of Pairly Premium for free!
                    </Text>
                </LinearGradient>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{referralCount}</Text>
                        <Text style={styles.statLabel}>Friends Invited</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{isPremium ? 'Active' : 'Free'}</Text>
                        <Text style={styles.statLabel}>Status</Text>
                    </View>
                </View>

                {/* Code Section */}
                <View style={styles.codeContainer}>
                    <Text style={styles.codeLabel}>Your Invite Code</Text>
                    <TouchableOpacity style={styles.codeBox} onPress={handleCopy}>
                        <Text style={styles.codeText}>{referralCode || '...'}</Text>
                        <Ionicons name="copy-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Actions */}
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <LinearGradient
                        colors={[colors.primary, colors.primaryLight]}
                        style={styles.buttonGradient}
                    >
                        <Text style={styles.shareButtonText}>Share Invite Link</Text>
                        <Ionicons name="share-outline" size={20} color="white" style={{ marginLeft: 8 }} />
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.footerText}>
                    Your friends get to skip the waitlist when they use your code.
                </Text>
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: 60,
        paddingBottom: spacing.md,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    content: {
        padding: spacing.lg,
    },
    heroCard: {
        padding: spacing.xl,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        lineHeight: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        backgroundColor: colors.border,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    codeContainer: {
        marginBottom: spacing.xl,
    },
    codeLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    codeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    codeText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        letterSpacing: 2,
    },
    shareButton: {
        marginBottom: spacing.lg,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.full,
    },
    shareButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    footerText: {
        textAlign: 'center',
        color: colors.textTertiary,
        fontSize: 12,
    },
});
