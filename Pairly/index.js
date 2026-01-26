import messaging from '@react-native-firebase/messaging';
import { registerRootComponent } from 'expo';
import { NativeModules, Platform } from 'react-native';

import App from './App';

const { SharedPrefsModule } = NativeModules;

// 🔥 Background handler for FCM messages when app is KILLED/BACKGROUND
// Simplified: Just trigger native widget update, widget fetches from backend itself
messaging().setBackgroundMessageHandler(async remoteMessage => {
    // console.log('💀 [Background] FCM received:', remoteMessage.data?.type);

    // Only process new_moment type
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

registerRootComponent(App);

