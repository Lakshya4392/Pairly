import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { registerRootComponent } from 'expo';
import { NativeModules, Platform, DeviceEventEmitter } from 'react-native';

import App from './App';

const { SharedPrefsModule } = NativeModules;

// 🔥 Background handler for FCM messages when app is KILLED/BACKGROUND
messaging().setBackgroundMessageHandler(async remoteMessage => {
    // console.log('💀 [Background] FCM received:', remoteMessage.data?.type);

    // [NEW] Handle lock screen animation requests
    if (remoteMessage.data && remoteMessage.data.type === 'lock_screen_animation') {
        try {
            // 1. Create a quiet channel for the full-screen intent
            const channelId = await notifee.createChannel({
                id: 'full_screen_notes',
                name: 'Full Screen Notes',
                importance: AndroidImportance.HIGH,
            });

            // 2. Trigger the local notification with fullScreenAction
            await notifee.displayNotification({
                title: 'Thinking of you! 💖',
                body: remoteMessage.data.message || 'Someone sent you a sweet note.',
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    fullScreenAction: {
                        id: 'default', // Using 'default' hooks into standard app launching
                    },
                },
            });
            return;
        } catch (error) {
            console.error('Failed to show full screen intent:', error);
        }
    }
    if (remoteMessage.data && remoteMessage.data.type === 'new_moment') {
        // console.log('💀 [Background] Triggering widget update...');

        // Just trigger native widget update - widget has its own FetchPhotoTask
        if (Platform.OS === 'android' && SharedPrefsModule) {
            try {
                await SharedPrefsModule.notifyWidgetUpdate();
                // console.log('✅ [Background] Widget update triggered');
            } catch (error) {
                // console.log('⚠️ [Background] Widget update failed:', error);
            }
        }
    }
});

// 🔥 Handle Notifee Background Events resulting from the Full-Screen Action
notifee.onBackgroundEvent(async ({ type, detail }) => {
    switch (type) {
        case EventType.APP_BLOCKED: {
            console.log('User blocked notifications');
            break;
        }
        case EventType.CHANNEL_BLOCKED: {
            console.log('User blocked a channel');
            break;
        }
        case EventType.CHANNEL_GROUP_BLOCKED: {
            console.log('User blocked a channel group');
            break;
        }
    }
});

// 🔥 Allow Notifee Foreground Events to trigger if phone happens to be awake
notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.DELIVERED) {
        // We received the notification while the app was running/awake. Let's force the animation anyway.
        DeviceEventEmitter.emit('EXPO_NOTIFEE_SHOW_EFFECT');
    }
});

registerRootComponent(App);

