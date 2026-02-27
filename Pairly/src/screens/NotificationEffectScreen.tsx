import React, { useEffect } from 'react';
import { View, StyleSheet, BackHandler, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

/**
 * Native Android Full-Screen Intent Screen
 * Bypasses the lock screen to play an animation (like edge lighting)
 * Automatically finishes the activity/app after 5 seconds to let the screen sleep.
 */
export default function NotificationEffectScreen() {
    useEffect(() => {
        // Safely exit the app/activity after 6.5 seconds so it doesn't stay awake forever
        const timer = setTimeout(() => {
            BackHandler.exitApp();
        }, 6500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            {/* Fallback to simple UI if Lottie file is missing, but assume user will place hearts.json */}
            <LottieView
                source={require('../../assets/animations/hearts.json')}
                autoPlay
                loop={false}
                style={styles.lottie}
                resizeMode="cover"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black', // Dark background for the lock screen effect
        alignItems: 'center',
        justifyContent: 'center',
    },
    lottie: {
        width: width,
        height: height,
        position: 'absolute',
        top: 0,
        left: 0,
    }
});
