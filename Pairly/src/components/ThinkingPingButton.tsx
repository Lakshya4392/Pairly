import React, { useState } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    Vibration,
    Animated,
} from 'react-native';
import PingService from '../services/PingService';

interface ThinkingPingButtonProps {
    onSuccess?: () => void;
    onLimitReached?: () => void;
}

/**
 * "Thinking of You" one-tap button
 * Sends ping to partner with haptic feedback
 */
const ThinkingPingButton: React.FC<ThinkingPingButtonProps> = ({
    onSuccess,
    onLimitReached,
}) => {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const scale = new Animated.Value(1);

    const handlePress = async () => {
        if (loading || sent) return;

        // Haptic feedback
        Vibration.vibrate([0, 50, 50, 50]);

        // Animate button
        Animated.sequence([
            Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        ]).start();

        setLoading(true);

        try {
            const result = await PingService.sendPing();

            if (result.success) {
                setSent(true);
                onSuccess?.();

                // Reset after 3 seconds
                setTimeout(() => setSent(false), 3000);
            } else if (result.remaining === 0) {
                onLimitReached?.();
            }
        } catch (error) {
            console.error('Ping error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                style={[styles.button, sent && styles.buttonSent]}
                onPress={handlePress}
                disabled={loading}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.text}>
                        {sent ? '💕 Sent!' : '💭 Thinking of You'}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#FF6B9D',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF6B9D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonSent: {
        backgroundColor: '#4CAF50',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});

export default ThinkingPingButton;
